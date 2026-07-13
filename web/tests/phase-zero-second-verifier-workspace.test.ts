import { describe, expect, it } from "vitest";
import {
  addSecondVerifierRecordCheck,
  applySecondaryAngleSampleToWorkspace,
  createDeterministicSecondaryAngleSample,
  createEmptySecondVerifierWorkspace,
  createSecondVerifierCountCheck,
  createSecondVerifierRecordCheck,
  exportSecondPersonVerificationRecords,
  getAllowedSecondVerifierStatuses,
  signOffSecondVerifierWorkspace,
  validateSecondVerifierWorkspace,
  type Phase0SecondVerifierWorkspace
} from "@/lib/phase-zero/phase-zero-second-verifier-workspace";
import { approvedPhase0VerificationStatuses, validatePhase0SecondPersonVerification } from "@/lib/phase-zero/phase-zero-verification";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 second-verifier workspace", () => {
  it("requires a verifier environment before sign-off", () => {
    const workspace = createEmptySecondVerifierWorkspace({
      workspaceID: "second-verifier-test-only",
      verifierID: "second-verifier-test-only",
      nowISO: now
    });

    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(false);
    expect(report.signOffReady).toBe(false);
    expect(codes(report.errors)).toContain("missingVerifierEnvironmentField");
    expect(codes(report.errors)).toContain("missingVerifierEnvironmentEvidence");
  });

  it("accepts independent menu counts, catalog counts, and record checks", () => {
    const workspace = addSecondVerifierRecordCheck(validWorkspace(), validRecordCheck(), now);
    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(true);
    expect(report.signOffReady).toBe(true);
    expect(report.summary).toMatchObject({
      recordCount: 1,
      independentlyCheckedRecords: 1,
      countMismatches: 0,
      recordMismatches: 0,
      evidenceFailures: 0,
      frontViewFailures: 0,
      secondaryAngleFailures: 0
    });
  });

  it("does not allow the verifier to reuse the primary researcher identity", () => {
    const workspace = addSecondVerifierRecordCheck(
      validWorkspace(),
      validRecordCheck({
        primaryObserverID: "same-reviewer",
        verifierObserverID: "same-reviewer"
      }),
      now
    );

    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(false);
    expect(report.signOffReady).toBe(false);
    expect(codes(report.errors)).toContain("sameVerifierAsPrimary");
  });

  it("reports menu and catalog count mismatches as blockers", () => {
    const workspace = {
      ...validWorkspace(),
      menuCountChecks: [createSecondVerifierCountCheck({ checkID: "menu-count-test-only", label: "Head menu", primaryCount: 12, verifierCount: 11 })],
      catalogCountChecks: [createSecondVerifierCountCheck({ checkID: "catalog-count-test-only", label: "Head catalog", primaryCount: 12, verifierCount: 13 })],
      recordChecks: [validRecordCheck()]
    };
    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(false);
    expect(report.summary.countMismatches).toBe(2);
    expect(codes(report.errors)).toEqual(expect.arrayContaining(["menuCountMismatch", "catalogCountMismatch"]));
  });

  it("creates mismatch reports for native-order, record, evidence, angle, dependency, and exception failures", () => {
    const workspace = addSecondVerifierRecordCheck(
      validWorkspace(),
      validRecordCheck({
        statuses: {
          nativeOrderStatus: "mismatch",
          recordFieldsStatus: "mismatch",
          evidenceFilesStatus: "mismatch",
          frontViewStatus: "mismatch",
          secondaryAngleStatus: "mismatch",
          dependencyStatus: "mismatch",
          exceptionStatus: "mismatch"
        },
        finalDisposition: "NOT_VERIFIED"
      }),
      now
    );

    expect(workspace.mismatchReports.map((report) => report.kind)).toEqual(expect.arrayContaining([
      "nativeOrderMismatch",
      "recordMismatch",
      "evidenceMismatch",
      "frontViewMissing",
      "secondaryAngleMissing",
      "dependencyMismatch",
      "exceptionMismatch"
    ]));
    const report = validateSecondVerifierWorkspace(workspace);
    expect(report.signOffReady).toBe(false);
    expect(report.summary.blockingMismatchReports).toBeGreaterThan(0);
  });

  it("exports second-person verification records using only approved statuses", () => {
    const workspace = addSecondVerifierRecordCheck(validWorkspace(), validRecordCheck({ finalDisposition: "VERIFIED_WITH_NOTES" }), now);
    const exported = exportSecondPersonVerificationRecords(workspace);

    expect(getAllowedSecondVerifierStatuses()).toEqual([...approvedPhase0VerificationStatuses]);
    expect(exported).toHaveLength(1);
    expect(exported[0].finalDisposition).toBe("VERIFIED_WITH_NOTES");
    expect(validatePhase0SecondPersonVerification(exported[0]).publishable).toBe(true);
  });

  it("blocks sign-off when required checks are incomplete", () => {
    const workspace = addSecondVerifierRecordCheck(
      validWorkspace(),
      validRecordCheck({
        statuses: {
          nativeOrderStatus: "notChecked",
          recordFieldsStatus: "confirmed",
          evidenceFilesStatus: "confirmed",
          frontViewStatus: "confirmed",
          secondaryAngleStatus: "confirmed",
          dependencyStatus: "notApplicable",
          exceptionStatus: "notApplicable"
        }
      }),
      now
    );
    const signed = signOffSecondVerifierWorkspace({
      workspace,
      verifierID: "second-verifier-test-only",
      notes: "test-only sign-off attempt",
      signedOffAt: now
    });
    const report = validateSecondVerifierWorkspace(signed);

    expect(report.signOffReady).toBe(false);
    expect(codes(report.errors)).toContain("signOffBlocked");
  });

  it("selects a stable deterministic 25 percent secondary-angle sample by category", async () => {
    const sample = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const repeated = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });

    expect(sample.selectedRecords.map((record) => record.stableInternalID)).toEqual(repeated.selectedRecords.map((record) => record.stableInternalID));
    expect(sample.methodID).toBe("deterministic-sha256-category-quartile-v1");
    expect(sample.seedInput).toBe("environment-test-only+second-reviewer-test-only+catalog-version-test-only");
    expect(sample.categories.map((category) => ({
      category: category.category,
      eligibleCount: category.eligibleCount,
      requiredSampleSize: category.requiredSampleSize,
      selectedCount: category.selectedCount
    }))).toEqual([
      { category: "facialHair", eligibleCount: 1, requiredSampleSize: 1, selectedCount: 1 },
      { category: "hairstyle", eligibleCount: 4, requiredSampleSize: 1, selectedCount: 1 },
      { category: "head", eligibleCount: 5, requiredSampleSize: 2, selectedCount: 2 }
    ]);
    expect(sample.selectedCount).toBe(4);
    expect(sample.humanReadableReport).toContain("Seed input: environment-test-only+second-reviewer-test-only+catalog-version-test-only");
    expect(sample.humanReadableReport).toContain("Category coverage:");
  });

  it("does not allow cherry-picking by input order", async () => {
    const first = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const reordered = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: [...eligibleRecords()].reverse()
    });

    expect(reordered.selectedRecords.map((record) => record.stableInternalID)).toEqual(first.selectedRecords.map((record) => record.stableInternalID));
    expect(reordered.selectedRecords.map((record) => record.hash)).toEqual(first.selectedRecords.map((record) => record.hash));
  });

  it("changes the sample when the deterministic seed changes", async () => {
    const first = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const changed = await createDeterministicSecondaryAngleSample({
      seed: { ...sampleSeed(), verifierID: "different-second-reviewer-test-only" },
      eligibleRecords: eligibleRecords()
    });

    expect(changed.seedInput).not.toBe(first.seedInput);
    expect(changed.selectedRecords.map((record) => record.hash)).not.toEqual(first.selectedRecords.map((record) => record.hash));
  });

  it("stores the sample report on the verifier workspace", async () => {
    const sample = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const workspace = applySecondaryAngleSampleToWorkspace({
      workspace: validWorkspace(),
      sample,
      updatedAt: now
    });

    expect(workspace.secondaryAngleSample?.seed).toEqual(sampleSeed());
    expect(workspace.secondaryAngleSample?.selectedRecords.every((record) => record.hashInput.includes(record.stableInternalID))).toBe(true);
    expect(workspace.signedOffAt).toBeNull();
  });
});

function validWorkspace(): Phase0SecondVerifierWorkspace {
  return {
    ...createEmptySecondVerifierWorkspace({
      workspaceID: "second-verifier-test-only",
      verifierID: "second-verifier-test-only",
      nowISO: now
    }),
    environment: {
      verifierEnvironmentID: "second-verifier-environment-test-only",
      verifierID: "second-verifier-test-only",
      observedAt: now,
      platform: "test-only-platform",
      gameVersion: "test-only-game-version",
      patchVersion: "test-only-patch",
      gameMode: "test-only-mode",
      creationPath: "test-only-creation-path",
      evidenceFileIDs: ["environment-evidence-test-only"],
      notes: "test-only environment"
    },
    menuCountChecks: [createSecondVerifierCountCheck({ checkID: "menu-count-test-only", label: "Head menu", primaryCount: 2, verifierCount: 2 })],
    catalogCountChecks: [createSecondVerifierCountCheck({ checkID: "catalog-count-test-only", label: "Head catalog", primaryCount: 2, verifierCount: 2 })]
  };
}

function validRecordCheck(overrides: Partial<Parameters<typeof createSecondVerifierRecordCheck>[0]> = {}) {
  return createSecondVerifierRecordCheck({
    recordID: "record-check-test-only",
    stableInternalID: "CF27_TESTONLY_SECOND_VERIFIER_HEAD_001",
    primaryObserverID: "primary-reviewer-test-only",
    primarySummary: "Primary test-only observation.",
    verifierObserverID: "second-reviewer-test-only",
    verifierSummary: "Independent second-verifier test-only observation.",
    evidenceIDs: ["evidence-front-test-only", "evidence-secondary-angle-test-only"],
    observedAt: now,
    statuses: {
      nativeOrderStatus: "confirmed",
      recordFieldsStatus: "confirmed",
      evidenceFilesStatus: "confirmed",
      frontViewStatus: "confirmed",
      secondaryAngleStatus: "confirmed",
      dependencyStatus: "notApplicable",
      exceptionStatus: "notApplicable"
    },
    randomizationMethod: "test-only deterministic secondary-angle sample list",
    finalDisposition: "VERIFIED",
    notes: "test-only second verification",
    primaryAcknowledgedAt: now,
    verifierAcknowledgedAt: now,
    ...overrides
  });
}

function codes(reportIssues: Array<{ code: string }>) {
  return reportIssues.map((issue) => issue.code);
}

function sampleSeed() {
  return {
    environmentID: "environment-test-only",
    verifierID: "second-reviewer-test-only",
    catalogVersion: "catalog-version-test-only"
  };
}

function eligibleRecords() {
  return [
    { stableInternalID: "CF27_TESTONLY_HEAD_001", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_002", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_003", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_004", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_005", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HAIR_001", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_HAIR_002", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_HAIR_003", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_HAIR_004", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_FACIAL_HAIR_001", category: "facialHair" }
  ];
}
