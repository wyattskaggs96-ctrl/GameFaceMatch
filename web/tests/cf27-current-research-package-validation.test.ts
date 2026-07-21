import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Root research validator is an ESM Node script without TypeScript declarations.
import { validateCurrentResearchPackage, writeResearchPackageValidationReports } from "../../scripts/cf27-current-research-package-validator.mjs";

let temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  temporaryRoots = [];
});

describe("CF27 current research package validation", () => {
  it("validates the current partial research package without enabling production recommendations", () => {
    const report = validateCurrentResearchPackage({
      root: path.resolve(process.cwd(), ".."),
      generatedAt: "2026-07-13T00:00:00.000Z"
    });

    expect(report.ok).toBe(true);
    expect(report.status).toBe("passed");
    expect(report.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(report.productionRecommendationsEnabled).toBe(false);
    expect(report.summary).toMatchObject({
      recordCount: 86,
      evidenceCount: 335,
      errorCount: 0,
      productionRecommendationsEnabled: false
    });
    expect(report.checks.map((check: ValidationCheck) => check.name)).toEqual(expect.arrayContaining([
      "uniqueIDs",
      "nativeOrderContinuity",
      "face12OverlapHandling",
      "relativePaths",
      "evidenceExistence",
      "checksums",
      "sourceTimestamps",
      "allowedStatuses",
      "researchVersusProductionSeparation",
      "noFixtureContamination",
      "noCollegeFootball26Contamination",
      "noUnsupportedFace30PlusRecords",
      "noFabricatedVersionOrPatch",
      "noProductionRecommendationAccess"
    ]));
  });

  it("fails when Face 12 overlap evidence is not preserved", () => {
    const root = createFixtureResearchPackage();
    const headsPath = path.join(root, "data/research/cf27/exports/partial-research-catalog-current/heads.json");
    const heads = JSON.parse(fs.readFileSync(headsPath, "utf8"));
    heads.payload.records[11].selectedEvidence = "video-002:95-100";
    fs.writeFileSync(headsPath, JSON.stringify(heads, null, 2));

    const report = validateCurrentResearchPackage({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const face12Check = report.checks.find((check: ValidationCheck) => check.name === "face12OverlapHandling");

    expect(report.ok).toBe(false);
    expect(face12Check.errors.map((error: ValidationIssue) => error.code)).toContain("missingFace12OverlapSource");
  });

  it("fails when unsupported Face 30+ records appear", () => {
    const root = createFixtureResearchPackage();
    const headsPath = path.join(root, "data/research/cf27/exports/partial-research-catalog-current/heads.json");
    const heads = JSON.parse(fs.readFileSync(headsPath, "utf8"));
    heads.payload.records.push({
      ...heads.payload.records[0],
      stableInternalID: "CF27_XBOXUNKNOWN_RTG_HEAD_030",
      nativeOption: "Face 30",
      nativeOrder: 30,
      selectedEvidence: "video-003:101-105",
      sourceImageFrameIDs: ""
    });
    fs.writeFileSync(headsPath, JSON.stringify(heads, null, 2));

    const report = validateCurrentResearchPackage({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const face30Check = report.checks.find((check: ValidationCheck) => check.name === "noUnsupportedFace30PlusRecords");

    expect(report.ok).toBe(false);
    expect(face30Check.errors.map((error: ValidationIssue) => error.code)).toContain("unsupportedFace30Plus");
  });

  it("fails when fixture or College Football 26 contamination enters the package", () => {
    const root = createFixtureResearchPackage();
    const headsPath = path.join(root, "data/research/cf27/exports/partial-research-catalog-current/heads.json");
    const heads = JSON.parse(fs.readFileSync(headsPath, "utf8"));
    heads.payload.records[0].notes = "data/fixtures/test-only College Football 26";
    fs.writeFileSync(headsPath, JSON.stringify(heads, null, 2));

    const report = validateCurrentResearchPackage({ root, generatedAt: "2026-07-13T00:00:00.000Z" });

    expect(report.ok).toBe(false);
    expect(report.checks.find((check: ValidationCheck) => check.name === "noFixtureContamination").errors).toHaveLength(1);
    expect(report.checks.find((check: ValidationCheck) => check.name === "noCollegeFootball26Contamination").errors).toHaveLength(1);
  });

  it("writes reports only to research and catalog documentation paths", () => {
    const root = createFixtureResearchPackage();
    const report = validateCurrentResearchPackage({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const output = writeResearchPackageValidationReports(report, {
      root,
      outputDirectory: "data/research/cf27/reports/current-research-package-validation",
      docsPath: "docs/catalog/CURRENT_RESEARCH_PACKAGE_VALIDATION.md"
    });

    expect(output.files).toEqual([
      "data/research/cf27/reports/current-research-package-validation/current_research_package_validation.json",
      "data/research/cf27/reports/current-research-package-validation/CURRENT_RESEARCH_PACKAGE_VALIDATION.md",
      "docs/catalog/CURRENT_RESEARCH_PACKAGE_VALIDATION.md"
    ]);
    expect(() =>
      writeResearchPackageValidationReports(report, {
        root,
        outputDirectory: "data/catalog/production/current-research-package-validation",
        docsPath: "docs/catalog/CURRENT_RESEARCH_PACKAGE_VALIDATION.md"
      })
    ).toThrow(/data\/research\/cf27/);
  });
});

type ValidationIssue = {
  code: string;
  message: string;
};

type ValidationCheck = {
  name: string;
  errors: ValidationIssue[];
};

function createFixtureResearchPackage() {
  const realRoot = path.resolve(process.cwd(), "..");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-research-package-validation-"));
  temporaryRoots.push(root);
  copyDirectory(
    path.join(realRoot, "data/research/cf27/exports/partial-research-catalog-current"),
    path.join(root, "data/research/cf27/exports/partial-research-catalog-current")
  );
  linkDirectory(
    path.join(realRoot, "data/research/cf27/generated/full-resolution-frames"),
    path.join(root, "data/research/cf27/generated/full-resolution-frames")
  );
  copyFile(
    path.join(realRoot, "data/research/cf27/video_inventory.json"),
    path.join(root, "data/research/cf27/video_inventory.json")
  );
  copyFile(
    path.join(realRoot, "data/catalog/production/catalog_manifest.json"),
    path.join(root, "data/catalog/production/catalog_manifest.json")
  );
  return root;
}

function copyDirectory(source: string, destination: string) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    else fs.copyFileSync(sourcePath, destinationPath);
  }
}

function linkDirectory(source: string, destination: string) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.symlinkSync(source, destination, "dir");
}

function copyFile(source: string, destination: string) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
