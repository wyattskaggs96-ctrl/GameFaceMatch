import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  approvedPhase0VerificationStatuses,
  canPublishFromSecondPersonVerification,
  PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION,
  PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION,
  validatePhase0DiscrepancyResolution,
  validatePhase0SecondPersonVerification,
  type Phase0ApprovedVerificationStatus,
  type Phase0DiscrepancyResolutionRecord,
  type Phase0SecondPersonVerificationRecord
} from "@/lib/phase-zero/phase-zero-verification";
// @ts-expect-error Root catalog CLI is plain ESM JavaScript and is exercised here as the publication source of truth.
import { calculateDeterministicChecksum, publishPackage } from "../../scripts/catalog-tools.mjs";

const approvedStatuses = [
  "VERIFIED",
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED",
  "NOT_VERIFIED"
];

describe("Phase 0 second-person verification schemas", () => {
  it("uses only the approved verification statuses in code and schema", () => {
    expect([...approvedPhase0VerificationStatuses]).toEqual(approvedStatuses);
    expect(schemaEnum("second-person-verification.schema.json", "approvedVerificationStatus")).toEqual(approvedStatuses);
    expect(schemaEnum("discrepancy-resolution.schema.json", "approvedVerificationStatus")).toEqual(approvedStatuses);
  });

  it("requires the second-person verification fields needed for publication review", () => {
    const required = schemaRequired("second-person-verification.schema.json");
    expect(required).toEqual([
      "schemaVersion",
      "verificationID",
      "targetStableID",
      "verificationScope",
      "primaryObservation",
      "verifierObservation",
      "evidenceExists",
      "frontViewExists",
      "secondaryAngleSampleIncluded",
      "randomizationMethod",
      "discrepancyType",
      "resolutionAction",
      "resolutionEvidenceIDs",
      "primaryAcknowledgedAt",
      "verifierAcknowledgedAt",
      "finalDisposition",
      "notes"
    ]);
  });

  it("requires disagreement and resolution fields for discrepancy records", () => {
    const required = schemaRequired("discrepancy-resolution.schema.json");
    expect(required).toContain("primaryObservation");
    expect(required).toContain("verifierObservation");
    expect(required).toContain("discrepancyType");
    expect(required).toContain("resolutionAction");
    expect(required).toContain("resolutionEvidenceIDs");
    expect(required).toContain("primaryAcknowledgedAt");
    expect(required).toContain("verifierAcknowledgedAt");
    expect(required).toContain("finalDisposition");
  });

  it("allows publishing only after clean verified second-person review", () => {
    const record = validSecondPersonVerification();
    const report = validatePhase0SecondPersonVerification(record);
    expect(report.ok).toBe(true);
    expect(report.publishable).toBe(true);
    expect(canPublishFromSecondPersonVerification(record)).toBe(true);
  });

  it("blocks every non-verified final disposition from publication", () => {
    const blocked: Phase0ApprovedVerificationStatus[] = [
      "RECAPTURE_REQUIRED",
      "VERSION_MISMATCH",
      "MISSING_EVIDENCE",
      "COUNT_MISMATCH",
      "ORDER_MISMATCH",
      "DEPENDENCY_UNRESOLVED",
      "NOT_VERIFIED"
    ];
    for (const finalDisposition of blocked) {
      const report = validatePhase0SecondPersonVerification(validSecondPersonVerification({ finalDisposition }));
      expect(report.ok, finalDisposition).toBe(true);
      expect(report.publishable, finalDisposition).toBe(false);
    }
  });

  it("requires evidence existence, angle samples, separate reviewers, and both-party acknowledgment", () => {
    const record = validSecondPersonVerification({
      evidenceExists: false,
      frontViewExists: false,
      secondaryAngleSampleIncluded: false,
      primaryAcknowledgedAt: null,
      verifierObservation: { ...observation("primary-reviewer"), summary: "Verifier repeated the same reviewer identity." }
    });
    const codes = validatePhase0SecondPersonVerification(record).errors.map((error) => error.code);
    expect(codes).toContain("missingEvidence");
    expect(codes).toContain("missingFrontView");
    expect(codes).toContain("missingSecondaryAngleSample");
    expect(codes).toContain("sameReviewer");
    expect(codes).toContain("missingBothPartyAcknowledgment");
  });

  it("requires resolution evidence before verified disposition when observations disagree", () => {
    const record = validSecondPersonVerification({
      discrepancyType: "labelMismatch",
      resolutionAction: "correctDraftRecord",
      resolutionEvidenceIDs: []
    });
    const report = validatePhase0SecondPersonVerification(record);
    expect(report.ok).toBe(false);
    expect(report.publishable).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingResolutionEvidence");
  });

  it("accepts verified-with-notes records after documented discrepancy resolution", () => {
    const record = validSecondPersonVerification({
      discrepancyType: "menuNavigationMismatch",
      resolutionAction: "acceptVerifierObservation",
      resolutionEvidenceIDs: ["evidence-resolution"],
      finalDisposition: "VERIFIED_WITH_NOTES"
    });
    const report = validatePhase0SecondPersonVerification(record);
    expect(report.ok).toBe(true);
    expect(report.publishable).toBe(true);
  });

  it("requires discrepancy resolution records to describe a real disagreement", () => {
    const report = validatePhase0DiscrepancyResolution(validDiscrepancyResolution({ discrepancyType: "none" }));
    expect(report.ok).toBe(false);
    expect(report.publishable).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingDiscrepancy");
  });

  it("prevents unverified catalog packages from being published", () => {
    const catalogPackage = withChecksums(validPackageWithVerificationState("unverified"));
    const publication = publishPackage(catalogPackage);
    expect(publication.ok).toBe(false);
    expect(publication.manifest).toBeNull();
    expect(publication.report.errors.map((error: { code: string }) => error.code)).toContain("unverifiedRecord");
  });
});

function schemaRequired(fileName: string): string[] {
  return readSchema(fileName).required;
}

function schemaEnum(fileName: string, definitionName: string): string[] {
  return readSchema(fileName).$defs[definitionName].enum;
}

function readSchema(fileName: string): { required: string[]; $defs: Record<string, { enum: string[] }> } {
  const schemaPath = path.resolve(process.cwd(), "..", "data", "schemas", fileName);
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

function validSecondPersonVerification(
  overrides: Partial<Phase0SecondPersonVerificationRecord> = {}
): Phase0SecondPersonVerificationRecord {
  return {
    schemaVersion: PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION,
    verificationID: "verification-test-only",
    targetStableID: "cf27-test-only-target",
    verificationScope: "catalogItem",
    primaryObservation: observation("primary-reviewer"),
    verifierObservation: observation("second-reviewer"),
    evidenceExists: true,
    frontViewExists: true,
    secondaryAngleSampleIncluded: true,
    randomizationMethod: "test-only deterministic shuffled sample list",
    discrepancyType: "none",
    resolutionAction: "acceptPrimaryObservation",
    resolutionEvidenceIDs: [],
    primaryAcknowledgedAt: "2026-07-12T00:00:00.000Z",
    verifierAcknowledgedAt: "2026-07-12T00:05:00.000Z",
    finalDisposition: "VERIFIED",
    notes: "test-only synthetic review",
    ...overrides
  };
}

function validDiscrepancyResolution(
  overrides: Partial<Phase0DiscrepancyResolutionRecord> = {}
): Phase0DiscrepancyResolutionRecord {
  return {
    schemaVersion: PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION,
    discrepancyID: "discrepancy-test-only",
    verificationID: "verification-test-only",
    targetStableID: "cf27-test-only-target",
    verificationScope: "catalogItem",
    primaryObservation: observation("primary-reviewer"),
    verifierObservation: observation("second-reviewer"),
    discrepancyType: "labelMismatch",
    randomizationMethod: "test-only deterministic shuffled sample list",
    resolutionAction: "correctDraftRecord",
    resolutionEvidenceIDs: ["evidence-resolution"],
    primaryAcknowledgedAt: "2026-07-12T00:00:00.000Z",
    verifierAcknowledgedAt: "2026-07-12T00:05:00.000Z",
    finalDisposition: "VERIFIED_WITH_NOTES",
    notes: "test-only discrepancy resolution",
    ...overrides
  };
}

function observation(observerID: string) {
  return {
    observerID,
    observedAt: "2026-07-12T00:00:00.000Z",
    summary: "test-only observation from synthetic evidence",
    evidenceIDs: ["evidence-front"]
  };
}

function withChecksums<T extends ReturnType<typeof validPackageWithVerificationState>>(catalogPackage: T): T {
  const checksum = calculateDeterministicChecksum(catalogPackage);
  catalogPackage.manifest.packageChecksum = checksum;
  catalogPackage.publication.sourcePackageChecksum = checksum;
  return catalogPackage;
}

function validPackageWithVerificationState(verificationState: "verified" | "unverified") {
  const item = validItem(verificationState);
  return {
    packageID: "test-only-package",
    packageVersion: "test-only-version",
    manifest: {
      catalogVersion: item.catalogVersion,
      generatedAt: "2026-07-12T00:00:00.000Z",
      isProduction: true,
      declaredItemCount: 1,
      packageChecksum: "",
      items: [item]
    },
    items: [item],
    assets: Object.entries(item.requiredAngles).map(([angle, assetID]) => ({
      assetID,
      angle,
      relativePath: `assets/cfb27__test-only-platform__test-only-version__${item.stableInternalID}__${angle}__20260712.png`,
      sha256: "b".repeat(64),
      capturedAt: "2026-07-12T00:00:00.000Z"
    })),
    reviews: [
      review("review-test-only-first", item.stableInternalID, "first", "test-only-first-reviewer"),
      review("review-test-only-second", item.stableInternalID, "second", "test-only-second-reviewer")
    ],
    publication: {
      publicationID: "publication-test-only",
      catalogVersionID: item.catalogVersion.identifier,
      publishedAt: "2026-07-12T00:00:00.000Z",
      publisher: "test-only-publisher",
      sourcePackageChecksum: "",
      stateTransition: {
        from: "reviewed",
        to: "verified",
        approvedByReviewID: "review-test-only-second"
      },
      notes: "test-only publication attempt"
    }
  };
}

function validItem(verificationState: "verified" | "unverified") {
  return {
    stableInternalID: "cfb27-test-only-unverified-record",
    game: "EA SPORTS College Football 27",
    gameVersion: "test-only-version",
    platform: "test-only-platform",
    gameMode: "test-only-mode",
    creationPath: "test-only-creation-path",
    category: "test-only-category",
    visibleGameLabelOrIndex: "test-only-label",
    verificationState,
    capturedDate: "2026-07-12T00:00:00.000Z",
    verifiedDate: verificationState === "verified" ? "2026-07-12T00:00:00.000Z" : null,
    sourceImageReferences: ["asset-front", "asset-left45", "asset-right45", "asset-left-profile", "asset-right-profile"],
    requiredAngles: {
      straightOn: "asset-front",
      left45: "asset-left45",
      right45: "asset-right45",
      leftProfile: "asset-left-profile",
      rightProfile: "asset-right-profile"
    },
    geometryMeasurements: {
      faceWidthRatio: {
        value: 0.7,
        confidence: 0.9,
        supportingFrameCount: 5,
        variance: 0.01,
        depthSupported: false,
        occlusionStatus: "none",
        measurementSource: "test-only-human-annotation",
        availabilityState: "available"
      }
    },
    humanAnnotations: { note: "test-only" },
    navigationInstructions: [
      {
        sequenceNumber: 1,
        instruction: "test-only verified navigation instruction",
        evidenceAssetID: "asset-front"
      }
    ],
    catalogVersion: {
      identifier: "test-only-catalog-version",
      gameVersion: "test-only-version",
      platform: "test-only-platform",
      verifiedAt: verificationState === "verified" ? "2026-07-12T00:00:00.000Z" : null
    },
    isTestFixture: false,
    deprecated: false,
    deprecatedContext: null
  };
}

function review(reviewID: string, stableInternalID: string, stage: "first" | "second", reviewer: string) {
  return {
    reviewID,
    stableInternalID,
    reviewer,
    stage,
    reviewedAt: "2026-07-12T00:00:00.000Z",
    decision: "approved",
    checks: {
      labelsMatched: true,
      navigationVerified: true
    },
    notes: "test-only review"
  };
}
