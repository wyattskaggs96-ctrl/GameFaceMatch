import { describe, expect, it } from "vitest";
import {
  createCurrentEvidenceGallerySummary,
  createDerivativePreviewURL,
  createTimestampReferenceLabel,
  filterGalleryRecords,
  isSafeResearchDerivativePath,
  type CaptureLogEvent,
  type EvidenceManifestEntry,
  type ImportedResearchCatalogRecord
} from "@/lib/phase-zero/current-evidence-gallery";
import importedCatalog from "../../data/research/cf27/catalog-candidates/research/partial-catalog-import-current/imported_research_catalog.json";
import evidenceManifest from "../../data/research/cf27/exports/partial-research-catalog-current/evidence_manifest.json";
import captureLog from "../../data/research/cf27/exports/partial-research-catalog-current/capture_log.json";

function createSummary() {
  return createCurrentEvidenceGallerySummary({
    importedRecords: importedCatalog.records as ImportedResearchCatalogRecord[],
    evidenceEntries: evidenceManifest.payload.entries as EvidenceManifestEntry[],
    captureEvents: captureLog.payload.events as CaptureLogEvent[]
  });
}

describe("current evidence gallery model", () => {
  it("builds a research-only gallery summary from the imported partial catalog", () => {
    const summary = createSummary();

    expect(summary.packageLabel).toBe("PRIMARY RESEARCH CANDIDATE — NOT PRODUCTION VERIFIED");
    expect(summary.totalRecords).toBe(86);
    expect(summary.recordsRequiringRecapture).toBeGreaterThan(0);
    expect(summary.recordsWithMissingViews).toBeGreaterThan(0);
    expect(summary.categories).toEqual(["ear_shapes", "eye_colors", "eye_shapes", "heads", "noses", "skin_details", "skin_tones"]);
    expect(summary.records.every((record) => record.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
  });

  it("filters by category while preserving native-order sorting", () => {
    const summary = createSummary();
    const heads = filterGalleryRecords(summary.records, "heads");

    expect(heads).toHaveLength(29);
    expect(heads.map((record) => record.nativeOrder)).toEqual(Array.from({ length: 29 }, (_, index) => index + 1));
    expect(heads.map((record) => record.nativeLabel)).not.toContain("Face 30");
    expect(heads.map((record) => record.nativeLabel)).not.toContain("Face 31");
  });

  it("surfaces Face 12 overlap without merging away either evidence source", () => {
    const summary = createSummary();
    const face12 = summary.face12OverlapRecord;

    expect(face12).toBeDefined();
    expect(face12?.face12Overlap).toBe(true);
    expect(face12?.overlapSummary).toContain("video-002 and video-003");
    expect(face12?.sourceVideoNames).toEqual(expect.arrayContaining(["02_Head_Templates_Faces_01-12.mov", "03_Head_Templates_Faces_12-29.mov"]));
    expect(face12?.timestampReferences.map((reference) => reference.sourceVideoID)).toEqual(expect.arrayContaining(["video-002", "video-003"]));
  });

  it("creates clickable timestamp labels and derivative preview URLs", () => {
    const summary = createSummary();
    const firstHead = filterGalleryRecords(summary.records, "heads")[0];

    expect(createTimestampReferenceLabel(firstHead.timestampReferences[0])).toContain("@");
    expect(firstHead.derivativePreview?.relativePath).toContain("data/research/cf27/generated/full-resolution-frames/");
    expect(createDerivativePreviewURL(firstHead.derivativePreview)).toContain("/api/internal/research-evidence-frame?path=");
  });

  it("accepts only generated CF27 derivative images for local preview", () => {
    expect(isSafeResearchDerivativePath("data/research/cf27/generated/full-resolution-frames/head/preview.png")).toBe(true);
    expect(isSafeResearchDerivativePath("data/research/cf27/source-video-references/master.mov")).toBe(false);
    expect(isSafeResearchDerivativePath("data/catalog/production/evidence.png")).toBe(false);
    expect(isSafeResearchDerivativePath("../data/research/cf27/generated/full-resolution-frames/head/preview.png")).toBe(false);
    expect(isSafeResearchDerivativePath("/data/research/cf27/generated/full-resolution-frames/head/preview.png")).toBe(false);
  });
});
