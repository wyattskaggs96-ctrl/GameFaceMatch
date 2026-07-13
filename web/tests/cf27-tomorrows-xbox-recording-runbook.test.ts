import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Root research scripts are ESM Node modules without TypeScript declarations.
import { buildXboxRecordingRunbook, writeXboxRecordingRunbookOutputs } from "../../scripts/cf27-tomorrows-xbox-recording-runbook.mjs";

type RunbookClip = Record<string, unknown> & {
  clipID: string;
  order: number;
  completionCheckbox: string;
  productionStatus: string;
  verificationStatus: string;
};

let temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  temporaryRoots = [];
});

describe("CF27 tomorrow Xbox recording runbook", () => {
  it("builds a research-only console-side plan from current evidence gaps", () => {
    const runbook = buildXboxRecordingRunbook({
      root: path.resolve(process.cwd(), ".."),
      generatedAt: "2026-07-13T00:00:00.000Z"
    });

    expect(runbook.reportLabel).toContain("TOMORROW'S XBOX RECORDING RUNBOOK");
    expect(runbook.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(runbook.verificationStatus).toBe("NOT_VERIFIED");
    expect(runbook.productionRecommendationsEnabled).toBe(false);
    expect(runbook.summary.clipCount).toBeGreaterThanOrEqual(15);
    expect(runbook.summary.completeCountRequiredClipCount).toBeGreaterThan(0);
    expect(runbook.summary.rearViewRequiredClipCount).toBeGreaterThan(0);
  });

  it("includes every prompt-required recording field for every clip", () => {
    const runbook = buildXboxRecordingRunbook({
      root: createFixtureRepository(),
      generatedAt: "2026-07-13T00:00:00.000Z"
    });
    const requiredFields = [
      "recommendedFilename",
      "startingScreen",
      "exactMenu",
      "firstOption",
      "finalOption",
      "completeCountRequired",
      "requiredCameraRotations",
      "pauseDuration",
      "canonicalPlayerSettings",
      "eyeBlackMustBeRemoved",
      "hairOrFacialHairMustBeChanged",
      "rearViewRequired",
      "expectedClipLength",
      "continuityOverlapWithPriorClip",
      "completionCheckbox"
    ];

    for (const clip of runbook.clips) {
      for (const field of requiredFields) {
        expect(clip).toHaveProperty(field);
        expect(String(clip[field]).trim().length).toBeGreaterThan(0);
      }
      expect(clip.completionCheckbox).toContain("[ ]");
      expect(clip.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(clip.verificationStatus).toBe("NOT_VERIFIED");
    }
  });

  it("orders clips to minimize repeated Xbox navigation and covers the required gap categories", () => {
    const runbook = buildXboxRecordingRunbook({
      root: createFixtureRepository(),
      generatedAt: "2026-07-13T00:00:00.000Z"
    });
    const text = JSON.stringify(runbook);
    const orderByID = Object.fromEntries(runbook.clips.map((clip: RunbookClip) => [clip.clipID, clip.order]));

    expect(orderByID["XR-001"]).toBeLessThan(orderByID["XR-003"]);
    expect(orderByID["XR-003"]).toBeLessThan(orderByID["XR-004"]);
    expect(orderByID["XR-004"]).toBeLessThan(orderByID["XR-005"]);
    expect(orderByID["XR-012"]).toBeLessThan(orderByID["XR-013"]);
    for (const phrase of [
      "Console info",
      "game executable",
      "entitlement",
      "Face 29",
      "second count",
      "eye black",
      "controlled short",
      "facial hair None",
      "Mouth Shape",
      "Jaw Shape",
      "Chin",
      "Hair",
      "hairstyle",
      "hair-color",
      "facial-hair",
      "Physique",
      "Height",
      "Weight",
      "Body Type",
      "wrap",
      "dependency"
    ]) {
      expect(text.toLowerCase()).toContain(phrase.toLowerCase());
    }
  });

  it("writes JSON, CSV, and Markdown outputs only to research and catalog documentation paths", () => {
    const root = createFixtureRepository();
    const runbook = buildXboxRecordingRunbook({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const output = writeXboxRecordingRunbookOutputs(runbook, {
      root,
      outputDirectory: "data/research/cf27/reports/tomorrows-xbox-recording-runbook",
      docsPath: "docs/catalog/TOMORROWS_XBOX_RECORDING_RUNBOOK.md"
    });

    expect(output.files).toEqual([
      "data/research/cf27/reports/tomorrows-xbox-recording-runbook/tomorrows_xbox_recording_runbook.json",
      "data/research/cf27/reports/tomorrows-xbox-recording-runbook/tomorrows_xbox_recording_runbook.csv",
      "data/research/cf27/reports/tomorrows-xbox-recording-runbook/TOMORROWS_XBOX_RECORDING_RUNBOOK.md",
      "docs/catalog/TOMORROWS_XBOX_RECORDING_RUNBOOK.md"
    ]);
    expect(() =>
      writeXboxRecordingRunbookOutputs(runbook, {
        root,
        outputDirectory: "data/catalog/production/xbox-runbook",
        docsPath: "docs/catalog/TOMORROWS_XBOX_RECORDING_RUNBOOK.md"
      })
    ).toThrow(/data\/research\/cf27/);
  });
});

function createFixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-xbox-runbook-"));
  temporaryRoots.push(root);
  writeJson(root, "data/research/cf27/reports/authoritative-recapture-queue/authoritative_recapture_queue.json", {
    summary: {
      queueItemCount: 24
    }
  });
  writeJson(root, "data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json", {
    counts: {
      heads: 29,
      totalResearchCatalogRecords: 86,
      productionRecordsCreated: 0
    }
  });
  writeJson(root, "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json", {
    summary: {
      oneStandardizedRecaptureRunCanRepairCurrentImageLimitations: true
    }
  });
  return root;
}

function writeJson(root: string, relativePath: string, value: unknown) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(value, null, 2));
}
