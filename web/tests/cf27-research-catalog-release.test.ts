import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 research release CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { CF27_RESEARCH_CATALOG_RELEASE_SCHEMA_VERSION, CF27_RESEARCH_CATALOG_VERSION, buildResearchCatalogRelease, validateResearchCatalogRelease, writeResearchCatalogRelease } from "../../scripts/cf27-research-catalog-release.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");

const requiredExportFamilies = [
  "environment_manifest",
  "creation_paths",
  "menu_map",
  "heads",
  "hairstyles",
  "hair_colors",
  "facial_hair",
  "facial_hair_colors",
  "additional_attributes",
  "body_controls",
  "dependency_tests",
  "evidence_manifest",
  "capture_log",
  "issues_and_exceptions",
  "recapture_requests"
];

describe("CF27 research catalog release", () => {
  it("builds the semantic research release with every required CSV and JSON export", () => {
    const release = buildResearchCatalogRelease({
      root: repositoryRoot,
      generatedAt: "2026-07-14T03:15:00-04:00"
    });
    const fileNames = release.files.map((file: ReleaseFile) => file.fileName);

    expect(release.schemaVersion).toBe(CF27_RESEARCH_CATALOG_RELEASE_SCHEMA_VERSION);
    expect(release.version).toBe(CF27_RESEARCH_CATALOG_VERSION);
    expect(release.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(release.productionRecommendationsEnabled).toBe(false);
    for (const family of requiredExportFamilies) {
      expect(fileNames, family).toContain(`${family}.json`);
      expect(fileNames, family).toContain(`${family}.csv`);
    }
    expect(release.manifest.semver).toBe("0.1.0-research.1");
    expect(release.validation.status).toBe("passed_with_warnings");
    expect(release.validation.errors).toHaveLength(0);
    expect(release.validation.warnings.map((warning: ValidationIssue) => warning.code)).toEqual([
      "versionPlatformModePathLimitation",
      "versionPlatformModePathLimitation",
      "versionPlatformModePathLimitation"
    ]);
  });

  it("exports current canonical record counts and keeps empty categories explicit", () => {
    const release = buildResearchCatalogRelease({ root: repositoryRoot });
    const sourceExports = new Map(release.manifest.sourceExports.map((item: SourceSummary) => [item.key, item.recordCount]));

    expect(sourceExports.get("heads")).toBe(26);
    expect(sourceExports.get("additional_attributes")).toBe(54);
    expect(sourceExports.get("dependency_tests")).toBe(16);
    expect(sourceExports.get("evidence_manifest")).toBe(96);
    expect(sourceExports.get("capture_log")).toBe(106);
    expect(sourceExports.get("issues_and_exceptions")).toBe(44);
    expect(sourceExports.get("recapture_requests")).toBe(10);
    expect(sourceExports.get("hairstyles")).toBe(0);
    expect(sourceExports.get("hair_colors")).toBe(0);
    expect(sourceExports.get("facial_hair")).toBe(0);
    expect(sourceExports.get("facial_hair_colors")).toBe(0);
  });

  it("writes only inside the Phase 0 research-catalog release namespace", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-research-release-"));
    const release = {
      ...buildResearchCatalogRelease({ root: repositoryRoot }),
      files: [{ fileName: "README.md", contentUtf8: "research\n", contentType: "text/markdown; charset=utf-8", sourcePath: null, sha256: "a".repeat(64), sizeBytes: 9 }]
    };

    writeResearchCatalogRelease(release, { root, releaseDirectory: "data/phase-zero/research-catalog-releases/test-release" });
    expect(fs.existsSync(path.join(root, "data/phase-zero/research-catalog-releases/test-release/README.md"))).toBe(true);
    expect(() => writeResearchCatalogRelease(release, { root, releaseDirectory: "data/catalog/production/not-allowed" })).toThrow(/research-catalog-releases/);
  });

  it("fails validation when fixture contamination enters a release file", () => {
    const release = buildResearchCatalogRelease({ root: repositoryRoot });
    const files = release.files.map((file: ReleaseFile) => file.fileName === "heads.json"
      ? { ...file, contentUtf8: file.contentUtf8.replace("Face 1", "Face 1 data/fixtures/test-only") }
      : file);
    const validation = validateResearchCatalogRelease({
      root: repositoryRoot,
      version: release.version,
      generatedAt: release.generatedAt,
      files,
      sourceSummaries: release.manifest.sourceExports
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.map((error: ValidationIssue) => error.code)).toContain("fixtureContamination");
  });

  it("fails validation when a record claims production status without verification", () => {
    const release = buildResearchCatalogRelease({ root: repositoryRoot });
    const files = release.files.map((file: ReleaseFile) => {
      if (file.fileName !== "heads.json") return file;
      const heads = JSON.parse(file.contentUtf8);
      heads.records[0].productionStatus = "PRODUCTION_DATA";
      heads.records[0].verificationStatus = "OBSERVED_PENDING_VERIFICATION";
      return { ...file, contentUtf8: `${JSON.stringify(heads, null, 2)}\n` };
    });
    const validation = validateResearchCatalogRelease({
      root: repositoryRoot,
      version: release.version,
      generatedAt: release.generatedAt,
      files,
      sourceSummaries: release.manifest.sourceExports
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.map((error: ValidationIssue) => error.code)).toContain("invalidStatus");
  });
});

type ReleaseFile = {
  fileName: string;
  contentUtf8: string;
};

type SourceSummary = {
  key: string;
  recordCount: number;
};

type ValidationIssue = {
  code: string;
  message: string;
};
