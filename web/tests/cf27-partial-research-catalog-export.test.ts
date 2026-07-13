import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 partial research export CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { buildPartialResearchCatalogPackage, researchPackageLabel, validatePartialResearchCatalogPackage } from "../../scripts/cf27-partial-research-catalog-export.mjs";

const root = path.resolve(process.cwd(), "..");
const requiredFiles = [
  "environment_manifest.json",
  "creation_paths.csv",
  "creation_paths.json",
  "menu_map.csv",
  "menu_map.json",
  "heads.csv",
  "heads.json",
  "skin_tones.csv",
  "skin_tones.json",
  "skin_details.csv",
  "skin_details.json",
  "eye_shapes.csv",
  "eye_shapes.json",
  "eye_colors.csv",
  "eye_colors.json",
  "noses.csv",
  "noses.json",
  "ear_shapes.csv",
  "ear_shapes.json",
  "evidence_manifest.csv",
  "evidence_manifest.json",
  "capture_log.csv",
  "capture_log.json",
  "issues_and_exceptions.csv",
  "recapture_queue.csv",
  "research_catalog_manifest.json"
];

describe("CF27 partial research catalog export", () => {
  it("builds every required Prompt 98 file outside the production catalog", () => {
    const exportPackage = buildPartialResearchCatalogPackage({ root });
    const fileNames = exportPackage.files.map((file: { fileName: string }) => file.fileName).sort();
    const validation = validatePartialResearchCatalogPackage(exportPackage);

    expect(fileNames).toEqual([...requiredFiles].sort());
    expect(validation).toEqual({ status: "passed", issues: [] });
    expect(JSON.stringify(exportPackage)).not.toContain("data/catalog/production");
  });

  it("labels the package and every exported table as primary research, not production verified", () => {
    const exportPackage = buildPartialResearchCatalogPackage({ root });

    for (const file of exportPackage.files) {
      expect(file.contentUtf8).toContain(researchPackageLabel);
      if (file.fileName.endsWith(".json")) {
        expect(file.contentUtf8).toContain("NOT_PRODUCTION");
      }
    }
    expect(exportPackage.manifest).toMatchObject({
      packageLabel: researchPackageLabel,
      dataClass: "PRIMARY_RESEARCH_CANDIDATE",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED"
    });
  });

  it("exports current research counts without inventing uncreated catalog candidates", () => {
    const exportPackage = buildPartialResearchCatalogPackage({ root });
    const manifest = JSON.parse(exportPackage.files.find((file: { fileName: string }) => file.fileName === "research_catalog_manifest.json").contentUtf8);
    const heads = JSON.parse(exportPackage.files.find((file: { fileName: string }) => file.fileName === "heads.json").contentUtf8);

    expect(manifest.counts).toMatchObject({
      heads: 29,
      skin_tones: 24,
      skin_details: 10,
      eye_shapes: 5,
      eye_colors: 7,
      noses: 7,
      ear_shapes: 4,
      totalResearchCatalogRecords: 86,
      evidenceManifestEntries: 335,
      captureLogEvents: 106
    });
    expect(heads.payload.records.map((record: { nativeOption: string }) => record.nativeOption)).not.toContain("Face 30");
    expect(heads.payload.records.map((record: { nativeOption: string }) => record.nativeOption)).not.toContain("Face 31");
  });

  it("carries evidence frame IDs and recapture status into catalog CSV rows", () => {
    const exportPackage = buildPartialResearchCatalogPackage({ root });
    const headsCSV = exportPackage.files.find((file: { fileName: string }) => file.fileName === "heads.csv").contentUtf8;
    const nosesCSV = exportPackage.files.find((file: { fileName: string }) => file.fileName === "noses.csv").contentUtf8;

    expect(headsCSV.split("\n")[0]).toContain("packageLabel");
    expect(headsCSV).toContain("evidence-frame-cf27_xboxunknown_rtg_head_001-front");
    expect(headsCSV).toContain("CF27_XBOXUNKNOWN_RTG_HEAD_001");
    expect(headsCSV).toContain(",true,");
    expect(nosesCSV).toContain("CF27_XBOXUNKNOWN_RTG_NOSE_001");
    expect(nosesCSV).toContain("recaptureRequired=");
  });

  it("is deterministic for repeated generation and refuses production output paths", () => {
    const first = buildPartialResearchCatalogPackage({ root });
    const second = buildPartialResearchCatalogPackage({ root });
    const productionValidation = validatePartialResearchCatalogPackage(first, { outputDirectory: "data/catalog/production/partial-research" });

    expect(first.files).toEqual(second.files);
    expect(first.manifest).toEqual(second.manifest);
    expect(productionValidation.status).toBe("failed");
    expect(productionValidation.issues.map((issue: { code: string }) => issue.code)).toContain("productionDirectoryWriteBlocked");
    expect(JSON.stringify(first)).not.toContain("/Users/skaggssystems/");
  });

  it("writes the current generated package files to the research export directory", () => {
    const outputDirectory = path.resolve(root, "data/research/cf27/exports/partial-research-catalog-current");

    for (const fileName of requiredFiles) {
      expect(fs.existsSync(path.join(outputDirectory, fileName))).toBe(true);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(outputDirectory, "research_catalog_manifest.json"), "utf8"));
    expect(manifest.packageLabel).toBe(researchPackageLabel);
  });
});
