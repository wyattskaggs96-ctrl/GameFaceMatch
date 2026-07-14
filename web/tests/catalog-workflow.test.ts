import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root catalog CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { calculateDeterministicChecksum, compareCatalogVersions, createAuditSession, createPatchReauditPlan, detectDuplicateIDsInManifest, detectFixtureLeakageInPath, exportCatalogItemsToCsv, formatReport, importCatalogItemsFromCsv, publishPackage, validateAuditRecord, validateEvidenceAssetPath, validatePackage, validateProductionDirectory, validateRecord } from "../../scripts/catalog-tools.mjs";

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

  it("rejects invalid labels, placeholders, missing metadata, and invalid dates", () => {
    const item = {
      ...validItem(),
      platform: "",
      visibleGameLabelOrIndex: "REPLACE_WITH_VERIFIED_GAME_LABEL",
      capturedDate: "not-a-date"
    };
    const codes = errorCodes(validateRecord(item));
    expect(codes).toContain("placeholderToken");
    expect(codes).toContain("invalidVisibleLabel");
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

  it("rejects missing evidence, invalid screenshot names, and missing second review", () => {
    const badPackage = withChecksums(validPackage());
    badPackage.assets[0].relativePath = "assets/front.png";
    badPackage.reviews = badPackage.reviews.filter((review) => review.stage !== "second");
    const codes = errorCodes(validatePackage(badPackage));
    expect(codes).toContain("invalidScreenshotName");
    expect(codes).toContain("missingSecondReview");
  });

  it("rejects patch mismatch between item and package manifest", () => {
    const catalogPackage = withChecksums(validPackage());
    catalogPackage.items[0].gameVersion = "different-test-only-version";
    const codes = errorCodes(validatePackage(catalogPackage));
    expect(codes).toContain("patchMismatch");
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

  it("creates draft audit sessions and never auto-verifies audit records", () => {
    const session = createAuditSession({ platform: "test-only-platform", gameVersion: "test-only-version", createdAt: "2026-07-10T00:00:00.000Z" });
    expect(session).toMatchObject({
      game: "EA SPORTS College Football 27",
      platform: "test-only-platform",
      notes: "NOT PRODUCTION DATA - NOT A VERIFIED GAME RECORD"
    });
    expect(errorCodes(validateAuditRecord({ ...validItem(), sourceType: "researchDraft" }))).toContain("autoVerificationBlocked");
  });

  it("imports and exports draft CSV records without creating verified production data", () => {
    const csv = [
      "stableInternalID,platform,gameVersion,patchVersion,gameMode,creationPath,category,visibleGameLabelOrIndex,straightOn,left45,right45,leftProfile,rightProfile,navigationInstruction,navigationEvidenceAssetID,captureConditions,humanAnnotation",
      "cfb27-test-csv,test-only-platform,test-only-version,test-only-patch,Road to Glory,test-only-path,test-only-category,test-only-label,asset-front,asset-left45,asset-right45,asset-left-profile,asset-right-profile,test-only navigation,asset-front,test-only conditions,test-only note"
    ].join("\n");
    const [item] = importCatalogItemsFromCsv(csv, { capturedDate: "2026-07-10T00:00:00.000Z" });
    expect(item.verificationState).toBe("unverified");
    expect(item.requiredAngles.leftProfile).toBe("asset-left-profile");
    const exported = exportCatalogItemsToCsv([item]);
    expect(exported).toContain("cfb27-test-csv");
    expect(exported).toContain("test-only navigation");
  });

  it("detects reordered options, retired options, and patch re-audit needs", () => {
    const previous = { catalogVersion: { identifier: "previous" }, items: [validItem("one"), validItem("two")] };
    const nextItem = validItem("one");
    nextItem.deprecated = true;
    nextItem.deprecatedContext = "test-only retired";
    const next = { catalogVersion: { identifier: "next" }, items: [validItem("two"), nextItem, validItem("three")] };
    const comparison = compareCatalogVersions(previous, next);
    expect(comparison.added).toContain("three");
    expect(comparison.reorderedOptions).toContain("one");
    expect(comparison.retiredOptions).toContain("one");
    const plan = createPatchReauditPlan(previous, "test-only-next-version");
    expect(plan.totalRecordsToCheck).toBe(2);
  });

  it("generates a patch diff report with affected records, re-verification, recapture, and version guidance", () => {
    const previousHeadA = patchComparableItem("test-only-head-a", {
      category: "test-only-head",
      visibleGameLabelOrIndex: "test-only-visible-label-a",
      patchVersion: "test-only-patch-1",
      sourceImageReferences: ["asset-a-front", "asset-a-left45"],
      requiredAngles: { straightOn: "asset-a-front", left45: "asset-a-left45" },
      humanAnnotations: { evidenceHash: "a".repeat(64), dependencies: "test-only-position-any" },
      captureConditions: { lighting: "test-only-even" }
    });
    const previous = {
      catalogVersion: { identifier: "1.2.3" },
      items: [
        previousHeadA,
        patchComparableItem("test-only-head-b", { category: "test-only-head", patchVersion: "test-only-patch-1" }),
        patchComparableItem("test-only-head-c", { category: "test-only-head", patchVersion: "test-only-patch-1" }),
        patchComparableItem("test-only-hair-a", { category: "test-only-hair", patchVersion: "test-only-patch-1" })
      ]
    };
    const next = {
      catalogVersion: { identifier: "1.2.4" },
      items: [
        patchComparableItem("test-only-head-b", { category: "test-only-head", patchVersion: "test-only-patch-1" }),
        patchComparableItem("test-only-head-c", { category: "test-only-head", patchVersion: "test-only-patch-1" }),
        patchComparableItem("test-only-head-a", {
          category: "test-only-head",
          visibleGameLabelOrIndex: "test-only-visible-label-a-updated",
          patchVersion: "test-only-patch-2",
          sourceImageReferences: ["asset-a-front-recaptured", "asset-a-left45"],
          requiredAngles: { straightOn: "asset-a-front-recaptured", left45: "asset-a-left45" },
          humanAnnotations: { evidenceHash: "b".repeat(64), dependencies: "test-only-position-qb" },
          captureConditions: { lighting: "test-only-updated" }
        }),
        patchComparableItem("test-only-head-d", { category: "test-only-head", patchVersion: "test-only-patch-2" })
      ]
    };

    const comparison = compareCatalogVersions(previous, next);

    expect(comparison.menuCountChanges.map((change: { category: unknown }) => change.category)).toEqual(expect.arrayContaining(["test-only-head", "test-only-hair"]));
    expect(comparison.firstMiddleFinalChanges.map((change: { reason: unknown }) => change.reason)).toEqual(expect.arrayContaining(["firstOptionChanged", "middleOptionChanged", "finalOptionChanged"]));
    expect(comparison.added).toContain("test-only-head-d");
    expect(comparison.removed).toContain("test-only-hair-a");
    expect(comparison.changedLabels.map((change: { stableInternalID: unknown }) => change.stableInternalID)).toContain("test-only-head-a");
    expect(comparison.changedEvidenceHashes.map((change: { stableInternalID: unknown }) => change.stableInternalID)).toContain("test-only-head-a");
    expect(comparison.changedVisualAssets.map((change: { stableInternalID: unknown }) => change.stableInternalID)).toContain("test-only-head-a");
    expect(comparison.dependencyChanges.map((change: { stableInternalID: unknown }) => change.stableInternalID)).toContain("test-only-head-a");
    expect(comparison.environmentChanges.map((change: { stableInternalID: unknown }) => change.stableInternalID)).toContain("test-only-head-a");
    expect(comparison.affectedRecords.map((record: { stableInternalID: unknown }) => record.stableInternalID)).toEqual(expect.arrayContaining(["test-only-head-a", "test-only-head-d", "test-only-hair-a"]));
    expect(comparison.requiredReverification.some((item: { requiredAction: string }) => item.requiredAction.includes("first and second review"))).toBe(true);
    expect(comparison.recommendedRecaptureQueue.map((item: { stableInternalID: unknown }) => item.stableInternalID)).toContain("test-only-head-a");
    expect(comparison.suggestedSemanticCatalogVersion).toBe("2.0.0");
    expect(comparison.humanReadableReport).toContain("Patch diff report");
  });

  it("publishes only validated packages and keeps fixture contamination detectable", () => {
    const catalogPackage = withChecksums(validPackage());
    const publication = publishPackage(catalogPackage);
    expect(publication.ok).toBe(true);
    expect(publication.manifest.isProduction).toBe(true);
    const fixtureReport = detectFixtureLeakageInPath("../data/fixtures/test-only");
    expect(errorCodes(fixtureReport)).toContain("fixtureLeakage");
  });

  it("rejects attempts to promote fixture data into production", () => {
    const catalogPackage = validPackage();
    catalogPackage.manifest.sourceType = "testFixture";
    catalogPackage.items = catalogPackage.items.map((item) => ({
      ...item,
      sourceType: "testFixture",
      isTestFixture: true
    }));
    catalogPackage.manifest.items = catalogPackage.items;
    const report = publishPackage(withChecksums(catalogPackage)).report;
    expect(errorCodes(report)).toEqual(expect.arrayContaining(["nonProductionSourceInProduction", "fixtureLeakage", "fixtureFlag"]));
  });

  it("validates portable production evidence paths and checksum references", () => {
    const { packageRoot, assetPath, sha256 } = createTemporaryPackageRoot("assets/masters/cfb27__test-only-platform__test-only-version__asset-front__straightOn__20260710.png");
    const asset = {
      assetID: "asset-front",
      angle: "straightOn",
      relativePath: assetPath,
      sha256,
      capturedAt: "2026-07-10T00:00:00.000Z",
      derivativeState: "master"
    };

    expect(validateEvidenceAssetPath(asset, { packageDirectory: packageRoot }).errors).toEqual([]);
  });

  it("rejects absolute paths, traversal, fixture paths, missing files, and case mismatches with repair suggestions", () => {
    const { packageRoot } = createTemporaryPackageRoot("assets/masters/CaseSensitiveEvidence.png");
    const cases = [
      ["/Users/wyatt/evidence.png", "absoluteLocalPath"],
      ["assets/../outside.png", "unsafeTraversal"],
      ["data/fixtures/test-only/evidence.png", "fixtureEvidencePath"],
      ["assets/masters/missing.png", "missingAsset"],
      ["assets/masters/casesensitiveevidence.png", "filenameCaseMismatch"]
    ] as const;

    for (const [relativePath, code] of cases) {
      const report = validateEvidenceAssetPath({
        assetID: `asset-${code}`,
        relativePath,
        sha256: "a".repeat(64),
        derivativeState: "master"
      }, { packageDirectory: packageRoot });
      expect(errorCodes(report), code).toContain(code);
      expect(report.repairSuggestions.length, code).toBeGreaterThan(0);
    }
  });

  it("rejects files that escape the catalog root through links", () => {
    const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-package-root-"));
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-package-outside-"));
    fs.mkdirSync(path.join(packageRoot, "assets"), { recursive: true });
    fs.writeFileSync(path.join(outsideRoot, "outside.png"), "test-only outside evidence");
    fs.symlinkSync(path.join(outsideRoot, "outside.png"), path.join(packageRoot, "assets", "linked.png"));

    const report = validateEvidenceAssetPath({
      assetID: "asset-linked",
      relativePath: "assets/linked.png",
      sha256: sha256File(path.join(outsideRoot, "outside.png")),
      derivativeState: "master"
    }, { packageDirectory: packageRoot });

    expect(errorCodes(report)).toContain("pathEscapesCatalogRoot");
    expect(formatReport(report)).toContain("repair pathEscapesCatalogRoot");
  });

  it("rejects master and derivative state mismatches without rewriting records", () => {
    const { packageRoot } = createTemporaryPackageRoot("assets/masters/master-evidence.png");
    const derivativeAsMaster = validateEvidenceAssetPath({
      assetID: "asset-derivative",
      relativePath: "assets/masters/master-evidence.png",
      sha256: "a".repeat(64),
      derivativeState: "derivative"
    }, { packageDirectory: packageRoot });
    const masterAsDerivative = validateEvidenceAssetPath({
      assetID: "asset-master",
      relativePath: "assets/derivatives/derived-evidence.png",
      sha256: "a".repeat(64),
      derivativeState: "master"
    }, { packageDirectory: packageRoot });

    expect(errorCodes(derivativeAsMaster)).toContain("derivativeStateMismatch");
    expect(errorCodes(masterAsDerivative)).toContain("derivativeStateMismatch");
  });

  it("applies strict evidence path validation during package validation", () => {
    const { packageRoot, assetPath, sha256 } = createTemporaryPackageRoot("assets/masters/cfb27__test-only-platform__test-only-version__asset-front__straightOn__20260710.png");
    const catalogPackage = withChecksums(validPackage());
    catalogPackage.assets[0].relativePath = assetPath;
    catalogPackage.assets[0].sha256 = sha256;
    catalogPackage.assets[0].derivativeState = "derivative";

    const report = validatePackage(catalogPackage, { packageDirectory: packageRoot });

    expect(errorCodes(report)).toContain("derivativeStateMismatch");
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
      sourceType: "production",
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
      relativePath: `assets/cfb27__test-only-platform__test-only-version__${item.stableInternalID}__${angle}__20260710.png`,
      sha256: "a".repeat(64),
      capturedAt: "2026-07-10T00:00:00.000Z",
      derivativeState: "master"
    })),
    reviews: [
      {
        reviewID: "review-test-only",
        stableInternalID: item.stableInternalID,
        reviewer: "test-only-reviewer",
        stage: "first",
        reviewedAt: "2026-07-10T00:00:00.000Z",
        decision: "approved",
        checks: {
          labelsMatched: true,
          navigationVerified: true
        },
        notes: "test-only"
      },
      {
        reviewID: "review-test-only-second",
        stableInternalID: item.stableInternalID,
        reviewer: "test-only-second-reviewer",
        stage: "second",
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
    sourceType: "production",
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
    catalogManagerDisposition: "approved",
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

function patchComparableItem(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...validItem(id),
    ...overrides
  };
}

function createTemporaryPackageRoot(relativePath: string) {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-package-root-"));
  const absolutePath = path.join(packageRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `test-only evidence ${relativePath}`);
  return {
    packageRoot,
    assetPath: relativePath.replaceAll(path.sep, "/"),
    sha256: sha256File(absolutePath)
  };
}

function sha256File(filePath: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
