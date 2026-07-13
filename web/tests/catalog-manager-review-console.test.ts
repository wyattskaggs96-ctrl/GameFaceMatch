import { describe, expect, it } from "vitest";
import {
  canApproveReleaseCandidate,
  createCatalogManagerReviewDraft,
  createCatalogManagerReviewDraftStore,
  createCatalogManagerReviewAction,
  createCatalogManagerReviewSession,
  createCatalogManagerValidationRerunSummary,
  createSignedCatalogManagerReviewReport,
  parseCatalogManagerCandidatePackage
} from "@/lib/phase-zero/catalog-manager-review-console";

const now = "2026-07-10T00:00:00.000Z";

describe("catalog-manager review console", () => {
  it("imports a candidate package and approves only when mandatory gates pass", async () => {
    const candidatePackage = validCandidatePackage();
    const session = createCatalogManagerReviewSession({ candidatePackage, importedAt: now });

    expect(session.records).toHaveLength(2);
    expect(session.evidence.length).toBeGreaterThan(0);
    expect(session.nativeOrderGroups[0].status).toBe("pass");
    expect(session.mandatoryGatesPass).toBe(true);
    expect(canApproveReleaseCandidate(session)).toBe(true);

    const report = await createSignedCatalogManagerReviewReport({
      session,
      reviewerID: "manager-test-only",
      decision: "approvedReleaseCandidate",
      notes: "test-only approval",
      generatedAt: now
    });

    expect(report.approvedForReleaseCandidate).toBe(true);
    expect(report.signature.algorithm).toBe("SHA-256");
    expect(report.signature.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("surfaces validation failures, missing evidence, placeholders, and native-order failures", () => {
    const candidatePackage = validCandidatePackage();
    candidatePackage.items[0].visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
    candidatePackage.items[0].requiredAngles.leftProfile = "";
    candidatePackage.items[1].nativeOrder = 4;

    const session = createCatalogManagerReviewSession({ candidatePackage, importedAt: now });

    expect(session.mandatoryGatesPass).toBe(false);
    expect(canApproveReleaseCandidate(session)).toBe(false);
    expect(codes(session.unresolvedFailures)).toEqual(expect.arrayContaining(["placeholderToken", "missingRequiredEvidence", "nativeOrderFailure"]));
    expect(session.records[0].hasPlaceholder).toBe(true);
    expect(session.records[0].missingRequiredAngles).toContain("leftProfile");
  });

  it("requires catalog-manager action for VERIFIED_WITH_NOTES records", async () => {
    const candidatePackage = validCandidatePackage();
    candidatePackage.items[0].verificationState = "VERIFIED_WITH_NOTES";
    const blocked = createCatalogManagerReviewSession({ candidatePackage, importedAt: now });

    expect(blocked.verifiedWithNotesRecordIDs).toEqual(["CF27_TESTONLY_RTG_HEAD_001"]);
    expect(codes(blocked.unresolvedFailures)).toContain("verifiedWithNotesDecisionRequired");
    expect(canApproveReleaseCandidate(blocked)).toBe(false);

    const accepted = createCatalogManagerReviewSession({
      candidatePackage,
      importedAt: now,
      reviewActions: [
        createCatalogManagerReviewAction({
          recordID: "CF27_TESTONLY_RTG_HEAD_001",
          decision: "acceptVerifiedWithNotes",
          reviewerID: "manager-test-only",
          note: "test-only note accepted",
          createdAt: now
        })
      ]
    });

    expect(canApproveReleaseCandidate(accepted)).toBe(true);
    const report = await createSignedCatalogManagerReviewReport({
      session: accepted,
      reviewerID: "manager-test-only",
      decision: "approvedReleaseCandidate",
      notes: "test-only accepted notes",
      generatedAt: now
    });
    expect(report.acceptedVerifiedWithNotesRecordIDs).toEqual(["CF27_TESTONLY_RTG_HEAD_001"]);
  });

  it("blocks approval when VERIFIED_WITH_NOTES is rejected or repairs are requested", () => {
    const candidatePackage = validCandidatePackage();
    candidatePackage.items[0].verificationState = "VERIFIED_WITH_NOTES";
    const rejected = createCatalogManagerReviewSession({
      candidatePackage,
      importedAt: now,
      reviewActions: [
        createCatalogManagerReviewAction({
          recordID: "CF27_TESTONLY_RTG_HEAD_001",
          decision: "rejectVerifiedWithNotes",
          reviewerID: "manager-test-only",
          note: "test-only notes rejected",
          createdAt: now
        })
      ]
    });

    expect(canApproveReleaseCandidate(rejected)).toBe(false);
    expect(codes(rejected.unresolvedFailures)).toContain("recordRejected");

    const repair = createCatalogManagerReviewSession({
      candidatePackage: validCandidatePackage(),
      importedAt: now,
      reviewActions: [
        createCatalogManagerReviewAction({
          recordID: "CF27_TESTONLY_RTG_HEAD_002",
          decision: "requestRepair",
          reviewerID: "manager-test-only",
          note: "test-only repair",
          createdAt: now
        })
      ]
    });

    expect(canApproveReleaseCandidate(repair)).toBe(false);
    expect(codes(repair.unresolvedFailures)).toContain("repairRequested");
  });

  it("keeps duplicate observations visible without treating them as game facts", () => {
    const candidatePackage = validCandidatePackage();
    candidatePackage.items[0].duplicateObservations = [{ comparisonStableID: candidatePackage.items[1].stableInternalID, evidenceAssetID: "asset-head-001-front" }];

    const session = createCatalogManagerReviewSession({ candidatePackage, importedAt: now });

    expect(session.duplicateRecordIDs).toEqual(["CF27_TESTONLY_RTG_HEAD_001"]);
    expect(session.validation.warnings?.map((warning) => warning.code)).toContain("duplicateObservationReviewRequired");
    expect(canApproveReleaseCandidate(session)).toBe(true);
  });

  it("uses pasted machine-readable validation reports as mandatory gates", async () => {
    const session = createCatalogManagerReviewSession({
      candidatePackage: validCandidatePackage(),
      importedAt: now,
      validationReport: {
        ok: false,
        checks: [{
          name: "importValidation",
          status: "fail",
          errors: [{ code: "checksumMismatch", message: "Checksum mismatch.", severity: "mandatory" }]
        }]
      }
    });

    expect(canApproveReleaseCandidate(session)).toBe(false);
    const report = await createSignedCatalogManagerReviewReport({
      session,
      reviewerID: "manager-test-only",
      decision: "approvedReleaseCandidate",
      notes: "test-only blocked approval",
      generatedAt: now
    });
    expect(report.approvedForReleaseCandidate).toBe(false);
    expect(report.decision).toBe("repairsRequested");
  });

  it("parses candidate package JSON", () => {
    expect(parseCatalogManagerCandidatePackage(JSON.stringify(validCandidatePackage())).packageID).toBe("test-only-manager-package");
    expect(() => parseCatalogManagerCandidatePackage("[]")).toThrow(/object/i);
  });

  it("stores local catalog-manager drafts and rerun summaries without production approval", () => {
    const storage = fakeStorage();
    const store = createCatalogManagerReviewDraftStore(storage);
    const action = createCatalogManagerReviewAction({
      recordID: "CF27_TESTONLY_RTG_HEAD_001",
      decision: "requestRepair",
      reviewerID: "manager-test-only",
      note: "test-only repair",
      createdAt: now
    });
    const draft = createCatalogManagerReviewDraft({
      packageText: JSON.stringify(validCandidatePackage()),
      validationText: "",
      reviewerID: "manager-test-only",
      selectedRecordID: "CF27_TESTONLY_RTG_HEAD_001",
      actionNote: "",
      reportNotes: "test-only local draft",
      actions: [action],
      savedAt: now
    });

    store.save(draft);
    const loaded = store.load();
    const session = createCatalogManagerReviewSession({
      candidatePackage: validCandidatePackage(),
      importedAt: now,
      reviewActions: loaded?.actions
    });
    const rerun = createCatalogManagerValidationRerunSummary(session, now);

    expect(loaded?.productionReady).toBe(false);
    expect(loaded?.recoveryNote).toMatch(/do not publish/);
    expect(rerun.productionReady).toBe(false);
    expect(rerun.unresolvedFailureCount).toBeGreaterThan(0);
    expect(rerun.message).toMatch(/draft review/);
  });
});

function validCandidatePackage() {
  const itemOne = item("CF27_TESTONLY_RTG_HEAD_001", 1);
  const itemTwo = item("CF27_TESTONLY_RTG_HEAD_002", 2);
  const items = [itemOne, itemTwo];
  const assets = items.flatMap((entry) => [
    asset(`${entry.stableInternalID}-straightOn`, "straightOn"),
    asset(`${entry.stableInternalID}-left45`, "left45"),
    asset(`${entry.stableInternalID}-right45`, "right45"),
    asset(`${entry.stableInternalID}-leftProfile`, "leftProfile"),
    asset(`${entry.stableInternalID}-rightProfile`, "rightProfile"),
    asset(`${entry.stableInternalID}-navigation`, "navigationEvidence")
  ]);
  for (const entry of items) {
    entry.sourceImageReferences = [
      `${entry.stableInternalID}-straightOn`,
      `${entry.stableInternalID}-left45`,
      `${entry.stableInternalID}-right45`,
      `${entry.stableInternalID}-leftProfile`,
      `${entry.stableInternalID}-rightProfile`
    ];
    entry.requiredAngles = {
      straightOn: `${entry.stableInternalID}-straightOn`,
      left45: `${entry.stableInternalID}-left45`,
      right45: `${entry.stableInternalID}-right45`,
      leftProfile: `${entry.stableInternalID}-leftProfile`,
      rightProfile: `${entry.stableInternalID}-rightProfile`
    };
    entry.navigationInstructions = [{ instruction: "test-only verified navigation", evidenceAssetID: `${entry.stableInternalID}-navigation` }];
  }
  return {
    packageID: "test-only-manager-package",
    packageVersion: "test-only-package-version",
    manifest: {
      catalogVersion: {
        identifier: "test-only-catalog-version",
        gameVersion: "test-only-version",
        platform: "test-only-platform",
        verifiedAt: now
      },
      items
    },
    items,
    assets
  };
}

function item(stableInternalID: string, nativeOrder: number) {
  return {
    stableInternalID,
    category: "head",
    nativeOrder,
    visibleGameLabelOrIndex: `test-only-label-${nativeOrder}`,
    verificationState: "verified",
    sourceImageReferences: [] as string[],
    requiredAngles: {} as Record<string, string>,
    navigationInstructions: [] as Array<{ instruction: string; evidenceAssetID: string }>,
    duplicateObservations: [] as Array<Record<string, unknown>>
  };
}

function asset(assetID: string, angle: string) {
  return {
    assetID,
    angle,
    relativePath: `assets/masters/${assetID}.png`,
    sha256: "a".repeat(64)
  };
}

function codes(issues: Array<{ code: string }>) {
  return issues.map((issue) => issue.code);
}

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    }
  };
}
