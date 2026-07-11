import { describe, expect, it } from "vitest";
// @ts-expect-error Root catalog CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { calculateDeterministicChecksum, detectDuplicateIDsInManifest, formatReport, validatePackage, validateProductionDirectory, validateRecord } from "../../scripts/catalog-tools.mjs";

describe("catalog audit workflow validator", () => {
  it("accepts empty production with an explicit recommendation warning", () => {
    const report = validateProductionDirectory("../data/catalog/production");
    expect(report.ok).toBe(true);
    expect(report.warnings[0]).toMatch(/No recommendations can be produced/i);
  });

  it("accepts a complete synthetic package after checksum calculation", () => {
    const catalogPackage = withChecksums(validPackage());
    const report = validatePackage(catalogPackage);
    expect(report.ok).toBe(true);
    expect(report.checksum).toBe(catalogPackage.manifest.packageChecksum);
  });

  it("rejects missing stable IDs, duplicate IDs, unverified records, and fixture flags", () => {
    expect(errorCodes(validateRecord({ ...validItem(), stableInternalID: "" }))).toContain("missingStableID");
    expect(errorCodes(validateRecord({ ...validItem(), verificationState: "unverified" }))).toContain("unverifiedRecord");
    expect(errorCodes(validateRecord({ ...validItem(), isTestFixture: true }))).toContain("fixtureFlag");
    expect(errorCodes(detectDuplicateIDsInManifest({ items: [validItem("duplicate"), validItem("duplicate")] }))).toContain("duplicateStableID");
  });

  it("rejects placeholders, missing metadata, and invalid dates", () => {
    const item = {
      ...validItem(),
      platform: "",
      visibleGameLabelOrIndex: "REPLACE_WITH_VERIFIED_GAME_LABEL",
      capturedDate: "not-a-date"
    };
    const codes = errorCodes(validateRecord(item));
    expect(codes).toContain("placeholderToken");
    expect(codes).toContain("missing-platform");
    expect(codes).toContain("invalidDate");
  });

  it("rejects invalid confidence and negative variance", () => {
    const item = validItem();
    item.geometryMeasurements.faceWidthRatio.confidence = 1.5;
    item.geometryMeasurements.faceWidthRatio.variance = -0.2;
    const codes = errorCodes(validateRecord(item));
    expect(codes).toContain("invalidConfidence");
    expect(codes).toContain("negativeVariance");
  });

  it("rejects missing source images and missing required angles", () => {
    const noSources = { ...validItem(), sourceImageReferences: [] };
    expect(errorCodes(validateRecord(noSources))).toContain("missingSourceImage");

    const noAngle = validItem();
    noAngle.requiredAngles.leftProfile = "";
    expect(errorCodes(validateRecord(noAngle))).toContain("missingRequiredAngle");
  });

  it("rejects incorrect manifest item counts and checksum mismatches", () => {
    const catalogPackage = withChecksums(validPackage());
    catalogPackage.manifest.declaredItemCount = 2;
    catalogPackage.manifest.packageChecksum = "0".repeat(64);
    const codes = errorCodes(validatePackage(catalogPackage));
    expect(codes).toContain("incorrectManifestItemCount");
    expect(codes).toContain("checksumMismatch");
  });

  it("rejects invalid verification transitions and deprecated records without context", () => {
    const badTransition = withChecksums({
      ...validPackage(),
      publication: {
        ...validPackage().publication,
        stateTransition: {
          from: "draft",
          to: "rejected",
          approvedByReviewID: "review-test-only"
        }
      }
    });
    expect(errorCodes(validatePackage(badTransition))).toContain("invalidVerificationStateTransition");

    const deprecated = validItem();
    deprecated.deprecated = true;
    deprecated.deprecatedContext = "";
    expect(errorCodes(validateRecord(deprecated))).toContain("deprecatedContextMissing");
  });

  it("produces readable reports", () => {
    const report = validateRecord({ ...validItem(), verificationState: "unverified" });
    expect(formatReport(report)).toContain("FAIL record");
    expect(formatReport(report)).toContain("error unverifiedRecord");
  });
});

function errorCodes(report: { errors: Array<{ code: string }> }) {
  return report.errors.map((error) => error.code);
}

function withChecksums<T extends ReturnType<typeof validPackage>>(catalogPackage: T): T {
  const checksum = calculateDeterministicChecksum(catalogPackage);
  catalogPackage.manifest.packageChecksum = checksum;
  catalogPackage.publication.sourcePackageChecksum = checksum;
  return catalogPackage;
}

function validPackage() {
  const item = validItem();
  return {
    packageID: "test-only-package",
    packageVersion: "test-only-version",
    manifest: {
      catalogVersion: item.catalogVersion,
      generatedAt: "2026-07-10T00:00:00.000Z",
      isProduction: true,
      declaredItemCount: 1,
      packageChecksum: "",
      items: [item]
    },
    items: [item],
    assets: Object.entries(item.requiredAngles).map(([angle, assetID]) => ({
      assetID,
      angle,
      relativePath: `assets/${assetID}.png`,
      sha256: "a".repeat(64),
      capturedAt: "2026-07-10T00:00:00.000Z"
    })),
    reviews: [
      {
        reviewID: "review-test-only",
        stableInternalID: item.stableInternalID,
        reviewer: "test-only-reviewer",
        reviewedAt: "2026-07-10T00:00:00.000Z",
        decision: "approved",
        checks: {
          labelsMatched: true,
          navigationVerified: true
        },
        notes: "test-only"
      }
    ],
    publication: {
      publicationID: "publication-test-only",
      catalogVersionID: item.catalogVersion.identifier,
      publishedAt: "2026-07-10T00:00:00.000Z",
      publisher: "test-only-publisher",
      sourcePackageChecksum: "",
      stateTransition: {
        from: "reviewed",
        to: "verified",
        approvedByReviewID: "review-test-only"
      },
      notes: "test-only"
    }
  };
}

function validItem(id = "cfb27-test-only-record") {
  return {
    stableInternalID: id,
    game: "EA SPORTS College Football 27",
    gameVersion: "test-only-version",
    platform: "test-only-platform",
    gameMode: "test-only-mode",
    creationPath: "test-only-creation-path",
    category: "test-only-category",
    visibleGameLabelOrIndex: "test-only-label",
    verificationState: "verified",
    capturedDate: "2026-07-10T00:00:00.000Z",
    verifiedDate: "2026-07-10T00:00:00.000Z",
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
      verifiedAt: "2026-07-10T00:00:00.000Z"
    },
    isTestFixture: false,
    deprecated: false,
    deprecatedContext: null as string | null
  };
}
