import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root production-candidate import validator is plain ESM JavaScript and is exercised here as the command source of truth.
import { createMissingCandidateReport, createProductionCandidateSelfCheckPackage, defaultCandidatePackagePath, productionCandidateImportChecks, validateProductionCandidateImport } from "../../scripts/cf27-production-candidate-import-validator.mjs";

describe("CF27 production-candidate import validator", () => {
  it("passes a fully supported synthetic verification-candidate package only inside isolated validation", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();

    const report = validateProductionCandidateImport(candidatePackage, {
      packageDirectory: packageRoot,
      inputPath: "test-only-candidate/catalog_manifest.json",
      generatedAt: "2026-07-14T00:00:00.000Z"
    });

    expect(report.ok).toBe(true);
    expect(report.status).toBe("PASSED_ISOLATED_VALIDATION");
    expect(report.productionImportAllowed).toBe(false);
    expect(report.checks.map((check: { name: string }) => check.name)).toEqual(productionCandidateImportChecks);
    expect(report.recordResults).toEqual([
      {
        recordID: "CF27_XBOXSERIESXS_RTG_HEAD_001",
        status: "acceptedForIsolatedValidation",
        reasons: []
      }
    ]);

    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("creates a fail-closed report when no candidate package is present", () => {
    const report = createMissingCandidateReport({
      inputPath: defaultCandidatePackagePath,
      generatedAt: "2026-07-14T00:00:00.000Z"
    });

    expect(report.ok).toBe(false);
    expect(report.status).toBe("NO_VERIFICATION_CANDIDATE_PACKAGE");
    expect(report.productionImportAllowed).toBe(false);
    expect(report.errors.map((error: { code: string }) => error.code)).toContain("candidatePackageMissing");
  });

  it("rejects duplicate IDs, native-order gaps, and manifest count mismatches", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
    const duplicate = structuredClone(candidatePackage.records[0]);
    duplicate.nativeOrder = 3;
    candidatePackage.records.push(duplicate);
    candidatePackage.manifest.itemCount = 3;

    const report = validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["manifestItemCountMismatch", "duplicateStableID", "nativeOrderGap"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects missing evidence, missing required roles, and checksum mismatches", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
    candidatePackage.evidence[0].relativePath = "evidence/missing.png";
    candidatePackage.evidence[1].sha256 = "0".repeat(64);
    candidatePackage.records[0].requiredEvidence.push("REAR");
    candidatePackage.records[0].evidence.push("missing-evidence-id");

    const report = validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["missingEvidenceFile", "evidenceChecksumMismatch", "missingEvidenceReference", "missingRequiredEvidence"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects unverified, placeholder, fixture, and test-data records", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
    candidatePackage.records[0].verificationStatus = "NOT_VERIFIED";
    candidatePackage.records[0].sourceType = "testFixture";
    candidatePackage.records[0].isTestFixture = true;
    candidatePackage.records[0].visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
    candidatePackage.records[0].dataClass = "TEST_FIXTURE";
    candidatePackage.evidence[0].relativePath = "fixtures/test-only/evidence.png";

    const report = validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(codes(report)).toEqual(expect.arrayContaining([
      "recordLacksVerification",
      "fixtureRecordRejected",
      "blockedSourceType",
      "placeholderToken",
      "fixtureEvidencePath",
      "nonCandidateSourceType",
      "testDataClassRejected"
    ]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects incomplete environment, wrong environment references, and mixed platform or patch records", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
    candidatePackage.environment.patch = "";
    candidatePackage.records[0].platform = "Different platform";
    candidatePackage.records[0].patch = "different patch";

    const report = validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["missingEnvironmentMetadata", "wrongEnvironmentReference"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects unapproved visual conditions and unreproducible menu instructions", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
    candidatePackage.records[0].visualConditions.status = "COMPARISON_LIMITED";
    candidatePackage.records[0].reproducibility.status = "NOT_REPRODUCIBLE";
    candidatePackage.records[0].reproducibility.menuPathVerified = false;

    const report = validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["unapprovedVisualConditions", "notReproducibleInGame"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects unresolved dependencies, unresolved count/order statuses, and missing dependency evidence", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
    candidatePackage.records[0].orderStatus = "ORDER_MISMATCH";
    candidatePackage.records[0].dependencies = [
      {
        dependencyID: "dep-platform",
        status: "DEPENDENCY_UNRESOLVED",
        evidenceIDs: ["missing-dependency-evidence"]
      }
    ];

    const report = validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(codes(report)).toEqual(expect.arrayContaining(["unresolvedCountOrOrderMismatch", "unresolvedDependency", "missingDependencyEvidence"]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects invalid supersession and destructive duplicate-observation handling", () => {
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
    candidatePackage.records[0].supersededByStableID = "CF27_XBOXSERIESXS_RTG_HEAD_999";
    candidatePackage.records[0].deprecated = true;
    candidatePackage.records[0].deprecatedContext = "";
    candidatePackage.records[0].duplicateObservations[0].evidenceID = "";
    candidatePackage.records[0].duplicateObservations[0].disposition = "merged";

    const report = validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(codes(report)).toEqual(expect.arrayContaining([
      "invalidSupersessionReference",
      "deprecatedContextMissing",
      "duplicateObservationMissingEvidence",
      "duplicateObservationDestructiveDisposition"
    ]));
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("does not write anything into the production catalog while validating", () => {
    const productionCatalogPath = path.resolve("..", "data/catalog/production/catalog_manifest.json");
    const before = fs.readFileSync(productionCatalogPath, "utf8");
    const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();

    validateProductionCandidateImport(candidatePackage, { packageDirectory: packageRoot });

    expect(fs.readFileSync(productionCatalogPath, "utf8")).toBe(before);
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });
});

function codes(report: { errors: Array<{ code: string }> }) {
  return report.errors.map((error) => error.code);
}
