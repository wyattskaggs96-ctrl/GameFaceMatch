import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root catalog import validator is plain ESM JavaScript and is exercised here as the command source of truth.
import { CATALOG_IMPORT_CHECKS, createCatalogImportSelfCheckPackage, formatCatalogImportReport, validateCatalogImport } from "../../scripts/catalog-import-validator.mjs";
// @ts-expect-error Root catalog CLI is plain ESM JavaScript and supplies the checksum algorithm used by publication gates.
import { calculateDeterministicChecksum } from "../../scripts/catalog-tools.mjs";

const repositoryRoot = path.resolve("..");

describe("catalog import validation engine", () => {
  it("produces machine-readable and human-readable reports for a valid package", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    const report = validateCatalogImport(catalogPackage, {
      packageDirectory: packageRoot,
      repositoryRoot,
      generatedAt: "2026-07-10T00:00:00.000Z"
    });

    expect(report.ok).toBe(true);
    expect(report.schemaVersion).toBe("catalog-import-validation-v1");
    expect(report.checks.map((check: { name: string }) => check.name)).toEqual(CATALOG_IMPORT_CHECKS);
    expect(report.summary.itemCount).toBe(1);
    expect(formatCatalogImportReport(report)).toContain("OK catalog import validation");

    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects duplicate IDs and native-order gaps", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    const duplicate = structuredClone(catalogPackage.items[0]);
    duplicate.nativeOrder = 3;
    catalogPackage.items.push(duplicate);
    catalogPackage.manifest.items = catalogPackage.items;
    withChecksums(catalogPackage);

    const report = validateCatalogImport(catalogPackage, { packageDirectory: packageRoot, repositoryRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["duplicateID", "nativeOrderGap"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects missing evidence paths and required evidence references", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    catalogPackage.assets[0].relativePath = "assets/masters/missing.png";
    catalogPackage.items[0].requiredAngles.straightOn = "missing-asset";
    withChecksums(catalogPackage);

    const report = validateCatalogImport(catalogPackage, { packageDirectory: packageRoot, repositoryRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["missingAsset", "missingEvidenceAsset"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects placeholders, College Football 26 references, and invalid verification states", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    catalogPackage.items[0].visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
    catalogPackage.items[0].game = "EA SPORTS College Football 26";
    catalogPackage.items[0].verificationState = "reviewed";
    catalogPackage.manifest.items = catalogPackage.items;
    withChecksums(catalogPackage);

    const report = validateCatalogImport(catalogPackage, { packageDirectory: packageRoot, repositoryRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["placeholderToken", "collegeFootball26Record", "invalidVerificationState"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects production/test separation failures and fixture recommender access", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    catalogPackage.items[0].sourceType = "testFixture";
    catalogPackage.items[0].isTestFixture = true;
    catalogPackage.assets[0].relativePath = "data/fixtures/test-only/evidence.png";
    catalogPackage.manifest.items = catalogPackage.items;
    withChecksums(catalogPackage);

    const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-import-repo-"));
    const runtimeFile = path.join(repositoryRoot, "web/lib/catalog/production-manifest.ts");
    fs.mkdirSync(path.dirname(runtimeFile), { recursive: true });
    fs.writeFileSync(runtimeFile, "export const bad = 'data/fixtures/test-only/synthetic-catalog.json';");

    const report = validateCatalogImport(catalogPackage, { packageDirectory: packageRoot, repositoryRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["fixtureFlag", "nonProductionSourceInProduction", "fixtureRecordInProduction", "fixtureEvidencePath", "productionRecommenderFixtureAccess"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
    fs.rmSync(repositoryRoot, { recursive: true, force: true });
  });

  it("rejects unsupported targets and checksum mismatches", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    catalogPackage.manifest.packageChecksum = "0".repeat(64);

    const report = validateCatalogImport(catalogPackage, {
      packageDirectory: packageRoot,
      repositoryRoot,
      supportedPlatforms: ["different-test-only-platform"],
      supportedGameVersions: ["test-only-version"],
      supportedGameModes: ["Road to Glory"],
      supportedCreationPaths: ["test-only-creation-path"]
    });

    expect(codes(report)).toEqual(expect.arrayContaining(["unsupportedTarget", "checksumMismatch"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects invalid supersession chains and destructive duplicate dispositions", () => {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    const replacement = structuredClone(catalogPackage.items[0]);
    replacement.stableInternalID = "CF27_TESTONLY_RTG_HEAD_002";
    replacement.nativeOrder = 2;
    replacement.supersedesStableID = catalogPackage.items[0].stableInternalID;
    replacement.supersededByStableID = catalogPackage.items[0].stableInternalID;
    replacement.duplicateObservations = [
      {
        observedStableID: replacement.stableInternalID,
        comparisonStableID: catalogPackage.items[0].stableInternalID,
        evidenceAssetID: "",
        disposition: "merged"
      }
    ];
    catalogPackage.items[0].supersededByStableID = replacement.stableInternalID;
    catalogPackage.items.push(replacement);
    catalogPackage.manifest.items = catalogPackage.items;
    withChecksums(catalogPackage);

    const report = validateCatalogImport(catalogPackage, { packageDirectory: packageRoot, repositoryRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["supersessionCycle", "duplicateObservationMissingEvidence", "duplicateObservationNotRetained"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });
});

function withChecksums(catalogPackage: {
  manifest: { packageChecksum: string };
  publication: { sourcePackageChecksum: string };
}) {
  const checksum = calculateDeterministicChecksum(catalogPackage);
  catalogPackage.manifest.packageChecksum = checksum;
  catalogPackage.publication.sourcePackageChecksum = checksum;
}

function codes(report: { errors: Array<{ code: string }> }) {
  return report.errors.map((entry) => entry.code);
}
