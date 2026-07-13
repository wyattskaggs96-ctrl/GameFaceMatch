import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 partial research import CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { defaultOutputDirectory, importPartialResearchCatalog, loadPartialResearchCatalogExport, researchImportLabel, validateImportedResearchCatalogCannotPromote } from "../../scripts/cf27-partial-research-catalog-import.mjs";

const root = path.resolve(process.cwd(), "..");

describe("CF27 partial research catalog import", () => {
  it("imports the partial export into the research namespace without enabling production access", () => {
    const result = importPartialResearchCatalog({ exportData: loadPartialResearchCatalogExport({ root }) });

    expect(result.report.ok).toBe(true);
    expect(result.report.status).toBe("passed");
    expect(result.report.summary).toMatchObject({
      importedRecords: 86,
      incompleteRecordCount: 86,
      productionRecommendationAccess: false,
      promotionEligible: false
    });
    expect(result.importedCatalog).toMatchObject({
      packageLabel: researchImportLabel,
      dataClass: "PRIMARY_RESEARCH_CANDIDATE",
      sourceType: "researchDraft",
      productionStatus: "NOT_PRODUCTION_DATA",
      productionRecommendationAccess: false,
      promotionEligible: false
    });
    expect(result.importedCatalog.researchNamespace).toBe(defaultOutputDirectory);
    expect(result.importedCatalog.records).toHaveLength(86);
    expect(JSON.stringify(result.importedCatalog)).not.toContain("data/catalog/production");
  });

  it("preserves native order and does not create unobserved head candidate records", () => {
    const result = importPartialResearchCatalog({ exportData: loadPartialResearchCatalogExport({ root }) });
    const heads = result.importedCatalog.records.filter((record: { categoryExport: string }) => record.categoryExport === "heads");

    expect(heads).toHaveLength(29);
    expect(heads.map((record: { nativeOrder: number }) => record.nativeOrder)).toEqual(Array.from({ length: 29 }, (_, index) => index + 1));
    expect(heads.map((record: { nativeLabel: string }) => record.nativeLabel)).not.toContain("Face 30");
    expect(heads.map((record: { nativeLabel: string }) => record.nativeLabel)).not.toContain("Face 31");
  });

  it("merges the Face 12 overlap while preserving both evidence sources", () => {
    const result = importPartialResearchCatalog({ exportData: loadPartialResearchCatalogExport({ root }) });
    const face12 = result.importedCatalog.records.find((record: { stableInternalID: string }) => record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012");

    expect(face12).toBeDefined();
    expect(face12.overlapHandling).toContain("video-002 and video-003");
    expect(face12.captureEventIDs).toEqual(["capture-event-video-002-tl-015", "capture-event-video-003-tl-001"]);
    expect(face12.evidenceFileIDs).toEqual(expect.arrayContaining(["evidence-video-002-source-master", "evidence-video-003-source-master"]));
    expect(face12.sourceTimestamps.map((entry: { sourceVideoID: string }) => entry.sourceVideoID)).toEqual(expect.arrayContaining(["video-002", "video-003"]));
  });

  it("rejects duplicate stable IDs instead of merging visually similar or duplicated records", () => {
    const exportData = structuredClone(loadPartialResearchCatalogExport({ root }));
    const duplicate = structuredClone(exportData.categories.heads.payload.records[0]);
    duplicate.nativeOrder = 30;
    exportData.categories.eye_shapes.payload.records.push(duplicate);

    const result = importPartialResearchCatalog({ exportData });

    expect(result.report.ok).toBe(false);
    expect(result.report.status).toBe("failed");
    expect(result.report.errors.map((entry: { code: string }) => entry.code)).toContain("duplicateStableID");
    expect(result.importedCatalog.records.filter((record: { stableInternalID: string }) => record.stableInternalID === duplicate.stableInternalID)).toHaveLength(1);
  });

  it("surfaces incomplete fields without inventing version, patch, reviewer, or production values", () => {
    const result = importPartialResearchCatalog({ exportData: loadPartialResearchCatalogExport({ root }) });
    const firstRecord = result.importedCatalog.records[0];

    expect(firstRecord.gameExecutableVersion).toBeNull();
    expect(firstRecord.patchLabel).toBeNull();
    expect(firstRecord.platformModel).toBeNull();
    expect(firstRecord.incompleteFields).toEqual(expect.arrayContaining([
      "environment.gameExecutableVersion",
      "environment.patchLabel",
      "record.secondVerifier",
      "record.verifiedDate",
      "record.productionCatalogVersion"
    ]));
    expect(result.report.warnings.map((entry: { code: string }) => entry.code)).toContain("incompleteResearchRecord");
  });

  it("blocks accidental production promotion for the imported research catalog", () => {
    const result = importPartialResearchCatalog({ exportData: loadPartialResearchCatalogExport({ root }) });
    const promotionReport = validateImportedResearchCatalogCannotPromote(result.importedCatalog);

    expect(promotionReport.ok).toBe(false);
    expect(promotionReport.status).toBe("failed");
    expect(promotionReport.errors.map((entry: { code: string }) => entry.code)).toEqual(expect.arrayContaining([
      "nonProductionSource",
      "notProductionData",
      "notVerified",
      "recommendationAccessBlocked",
      "promotionEligibilityBlocked",
      "recordNonProductionSource",
      "recordNotVerified"
    ]));
  });

  it("writes import artifacts and a hash-chained audit trail under research candidates", () => {
    const outputDirectory = path.resolve(root, defaultOutputDirectory);

    for (const fileName of ["imported_research_catalog.json", "import_report.json", "import_audit_log.json", "import_report.md"]) {
      expect(fs.existsSync(path.join(outputDirectory, fileName))).toBe(true);
    }

    const auditLog = JSON.parse(fs.readFileSync(path.join(outputDirectory, "import_audit_log.json"), "utf8"));
    expect(auditLog.entries).toHaveLength(2);
    expect(auditLog.entries[0]).toMatchObject({ action: "import", previousEntryHash: "GENESIS" });
    expect(auditLog.entries[1]).toMatchObject({ action: "validation", previousEntryHash: auditLog.entries[0].entryHash });
  });
});
