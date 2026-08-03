import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root production release manager is plain ESM JavaScript and is exercised here as the command source of truth.
import { buildProductionCatalogReleaseSnapshot, createProductionCatalogReleaseSelfCheckPackage, defaultReleaseVersion, writeProductionCatalogReleaseSnapshot } from "../../scripts/cf27-production-catalog-release-manager.mjs";

const generatedAt = "2026-07-14T00:00:00.000Z";

describe("CF27 production catalog release manager", () => {
  it("generates a blocked immutable empty snapshot when no verification candidate exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-release-missing-"));
    const activePath = writeJSON(root, "catalog_manifest.json", emptyActiveProduction());

    const snapshot = buildProductionCatalogReleaseSnapshot({
      repositoryRoot: root,
      productionCatalogPath: activePath,
      candidatePackagePath: "missing-candidate.json",
      candidateImportReportPath: "missing-report.json",
      generatedAt
    });
    const output = writeProductionCatalogReleaseSnapshot(snapshot, path.join(root, "release"));

    expect(snapshot.releaseVersion).toBe(defaultReleaseVersion);
    expect(snapshot.releaseStatus).toBe("rejectedRelease");
    expect(snapshot.promotedItems).toHaveLength(0);
    expect(snapshot.manifest.items).toHaveLength(0);
    expect(snapshot.gateReport.ok).toBe(false);
    expect(snapshot.readinessDecision).toMatchObject({
      decision: "BLOCKED_NO_PRODUCTION_ELIGIBLE_RECORDS",
      productionRecommendationsEnabled: false,
      activeProductionCatalogUnchanged: true,
      recordsPromoted: 0,
      partialCategoriesPromoted: false,
      unsupportedOutputsFailClosed: true
    });
    expect(output.files.map((file: string) => path.basename(file))).toEqual(expect.arrayContaining([
      "catalog_manifest.json",
      "release_notes.md",
      "checksum_manifest.json",
      "rollback_instructions.md",
      "supersession_map.json",
      "production_readiness_decision.json",
      "production_publish_gate_report.json"
    ]));
    expect(JSON.parse(fs.readFileSync(activePath, "utf8")).catalogVersion.identifier).toBe("empty-production");

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("promotes only a fully verified synthetic candidate in isolated validation", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-release-valid-"));
    const { packageRoot, candidatePackage } = createProductionCatalogReleaseSelfCheckPackage();
    const activePath = writeJSON(root, "catalog_manifest.json", emptyActiveProduction());
    const candidatePath = writeJSON(packageRoot, "candidate.json", candidatePackage);

    const snapshot = buildProductionCatalogReleaseSnapshot({
      repositoryRoot: root,
      productionCatalogPath: activePath,
      candidatePackagePath: candidatePath,
      candidateImportReportPath: "missing-report.json",
      releaseVersion: "cf27-test-only-production-candidate",
      generatedAt
    });

    expect(snapshot.promotedItems).toHaveLength(1);
    expect(snapshot.manifest.items[0].stableInternalID).toBe("CF27_TESTONLY_RTG_HEAD_001");
    expect(snapshot.manifest.declaredItemCount).toBe(1);
    expect(snapshot.gateReport.ok).toBe(true);
    expect(snapshot.readinessDecision.recordsPromoted).toBe(1);
    expect(snapshot.readinessDecision.productionRecommendationsEnabled).toBe(false);

    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects fixture, unverified, and placeholder records instead of partially promoting categories", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-release-reject-"));
    const { packageRoot, candidatePackage } = createProductionCatalogReleaseSelfCheckPackage();
    candidatePackage.records[0].sourceType = "testFixture";
    candidatePackage.records[0].isTestFixture = true;
    candidatePackage.records[0].verificationState = "unverified";
    candidatePackage.records[0].verificationStatus = "NOT_VERIFIED";
    candidatePackage.records[0].visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
    candidatePackage.items = candidatePackage.records;
    candidatePackage.manifest.items = candidatePackage.records;
    const activePath = writeJSON(root, "catalog_manifest.json", emptyActiveProduction());
    const candidatePath = writeJSON(packageRoot, "candidate.json", candidatePackage);

    const snapshot = buildProductionCatalogReleaseSnapshot({
      repositoryRoot: root,
      productionCatalogPath: activePath,
      candidatePackagePath: candidatePath,
      candidateImportReportPath: "missing-report.json",
      generatedAt
    });

    expect(snapshot.promotedItems).toHaveLength(0);
    expect(snapshot.readinessDecision.partialCategoriesPromoted).toBe(false);
    expect(snapshot.readinessDecision.rejectedRecords[0].reasons).toEqual(expect.arrayContaining([
      "nonProductionOrBlockedSourceType",
      "fixtureOrigin",
      "placeholderData",
      "candidateImportDidNotPass"
    ]));
    expect(snapshot.manifest.items).toHaveLength(0);

    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(packageRoot, { recursive: true, force: true });
  });

  it("rejects every non-publishable second-verifier final status", () => {
    const blockedStatuses = [
      "RECAPTURE_REQUIRED",
      "VERSION_MISMATCH",
      "MISSING_EVIDENCE",
      "COUNT_MISMATCH",
      "ORDER_MISMATCH",
      "DEPENDENCY_UNRESOLVED",
      "NOT_VERIFIED"
    ];

    for (const status of blockedStatuses) {
      const { snapshot, cleanup } = snapshotForRecord((record) => {
        record.verificationStatus = status;
      });

      expect(snapshot.promotedItems).toHaveLength(0);
      expect(snapshot.promotionResults[0].reasons).toEqual(expect.arrayContaining([`blockedFinalVerificationStatus:${status}`]));
      expect(snapshot.manifest.items).toHaveLength(0);

      cleanup();
    }
  });

  it("requires second-verifier attribution and date before promotion", () => {
    const { snapshot, cleanup } = snapshotForRecord((record) => {
      record.secondVerifierID = "";
      record.secondVerificationDate = "";
    });

    expect(snapshot.promotedItems).toHaveLength(0);
    expect(snapshot.promotionResults[0].reasons).toEqual(expect.arrayContaining([
      "missing:secondVerifierID",
      "missing:secondVerificationDate"
    ]));

    cleanup();
  });

  it("requires production version, environment, and last-checked metadata before promotion", () => {
    const { snapshot, cleanup } = snapshotForRecord((record) => {
      record.environmentID = "";
      record.productionCatalogVersion = "";
      record.lastCheckedDate = "";
      record.catalogVersion.identifier = "";
      record.catalogVersion.verifiedAt = null;
    });

    expect(snapshot.promotedItems).toHaveLength(0);
    expect(snapshot.promotionResults[0].reasons).toEqual(expect.arrayContaining([
      "missing:environmentID",
      "missing:productionCatalogVersion",
      "missing:lastCheckedDate",
      "missing:catalogVersion.identifier",
      "missing:catalogVersion.verifiedAt"
    ]));

    cleanup();
  });

  it("requires explicit catalog-manager acceptance for VERIFIED_WITH_NOTES", () => {
    const blocked = snapshotForRecord((record) => {
      record.verificationStatus = "VERIFIED_WITH_NOTES";
      record.catalogManagerDisposition = "approved";
      record.catalogManagerVerifiedWithNotesAcceptance = "";
      record.verifiedWithNotesAcceptedByCatalogManager = false;
    });

    expect(blocked.snapshot.promotedItems).toHaveLength(0);
    expect(blocked.snapshot.promotionResults[0].reasons).toContain("verifiedWithNotesNotAcceptedByCatalogManager");
    blocked.cleanup();

    const accepted = snapshotForRecord((record) => {
      record.verificationStatus = "VERIFIED_WITH_NOTES";
      record.catalogManagerDisposition = "approvedWithNotes";
      record.catalogManagerVerifiedWithNotesAcceptance = "Catalog manager accepts the verifier notes for production v1 test-only release.";
    });

    expect(accepted.snapshot.promotedItems).toHaveLength(1);
    accepted.cleanup();
  });

  it("rejects unresolved duplicates, dependencies, and wrong-game records", () => {
    const { snapshot, cleanup } = snapshotForRecord((record) => {
      record.game = "EA SPORTS College Football 26";
      record.duplicateResolution = { status: "DUPLICATE_REVIEW_REQUIRED" };
      record.dependencyResolution = { status: "DEPENDENCY_UNRESOLVED" };
      record.dependencies = [{ dependencyID: "dep-platform", status: "DEPENDENCY_UNRESOLVED", evidenceIDs: [] }];
    });

    expect(snapshot.promotedItems).toHaveLength(0);
    expect(snapshot.promotionResults[0].reasons).toEqual(expect.arrayContaining([
      "unsupportedOrWrongGame",
      "duplicateResolutionUnresolved",
      "dependencyResolutionUnresolved",
      "unresolvedDependency:dep-platform"
    ]));

    cleanup();
  });
});

function snapshotForRecord(mutator: (record: Record<string, any>) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-release-mutated-"));
  const { packageRoot, candidatePackage } = createProductionCatalogReleaseSelfCheckPackage();
  mutator(candidatePackage.records[0]);
  candidatePackage.items = candidatePackage.records;
  candidatePackage.manifest.items = candidatePackage.records;
  const activePath = writeJSON(root, "catalog_manifest.json", emptyActiveProduction());
  const candidatePath = writeJSON(packageRoot, "candidate.json", candidatePackage);
  const snapshot = buildProductionCatalogReleaseSnapshot({
    repositoryRoot: root,
    productionCatalogPath: activePath,
    candidatePackagePath: candidatePath,
    candidateImportReportPath: "missing-report.json",
    releaseVersion: "cf27-test-only-production-candidate",
    generatedAt
  });

  return {
    snapshot,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(packageRoot, { recursive: true, force: true });
    }
  };
}

function emptyActiveProduction() {
  return {
    sourceType: "production",
    catalogVersion: {
      identifier: "empty-production",
      gameVersion: "",
      platform: "",
      verifiedAt: null
    },
    generatedAt,
    isProduction: true,
    items: []
  };
}

function writeJSON(root: string, fileName: string, value: unknown) {
  const filePath = path.isAbsolute(fileName) ? fileName : path.join(root, fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}
