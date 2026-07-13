import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Root research scripts are ESM Node modules without TypeScript declarations.
import { buildAuthoritativeRecaptureQueue, writeAuthoritativeRecaptureQueueOutputs } from "../../scripts/cf27-authoritative-recapture-queue.mjs";

let temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  temporaryRoots = [];
});

describe("CF27 authoritative recapture queue", () => {
  it("builds an owner-facing research-only queue from the current repository evidence", () => {
    const queue = buildAuthoritativeRecaptureQueue({
      root: path.resolve(process.cwd(), ".."),
      generatedAt: "2026-07-13T00:00:00.000Z"
    });

    expect(queue.reportLabel).toMatch(/AUTHORITATIVE CURRENT RECAPTURE QUEUE/);
    expect(queue.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(queue.productionRecommendationsEnabled).toBe(false);
    expect(queue.summary.queueItemCount).toBeGreaterThanOrEqual(20);
    expect(queue.summary.productionBlockingCount).toBeGreaterThan(0);
    expect(queue.summary.existingEvidenceUsefulCount).toBe(queue.summary.queueItemCount);
  });

  it("covers all required prompt categories without claiming production verification", () => {
    const queue = buildAuthoritativeRecaptureQueue({
      root: createFixtureRepository(),
      generatedAt: "2026-07-13T00:00:00.000Z"
    });
    const text = JSON.stringify(queue);
    for (const requiredPhrase of [
      "exact Xbox console model",
      "game executable version",
      "installed patch/update screen",
      "edition",
      "Remaining Head Templates after Face 29",
      "second full Head Template count",
      "without eye black",
      "controlled short hairstyle",
      "facial hair set to None",
      "true front and profile views",
      "Mouth Shape",
      "Jaw Shape",
      "Chin",
      "complete Hair menu",
      "Hairstyles",
      "Hair Colors",
      "Facial Hair menu",
      "Facial Hair Colors",
      "Physique",
      "Height, Weight, and Body Type",
      "selector wrap",
      "dependency checks"
    ]) {
      expect(text).toContain(requiredPhrase);
    }
    expect(text).not.toContain("\"verificationStatus\":\"VERIFIED\"");
    expect(text).not.toContain("\"productionStatus\":\"PRODUCTION\"");
  });

  it("requires every item to specify exactly what Wyatt should record and whether existing evidence remains useful", () => {
    const queue = buildAuthoritativeRecaptureQueue({
      root: createFixtureRepository(),
      generatedAt: "2026-07-13T00:00:00.000Z"
    });

    for (const item of queue.items) {
      expect(item.ownerRecordingInstructions.trim().length).toBeGreaterThan(40);
      expect(item.requiredEvidence.length).toBeGreaterThan(0);
      expect(item.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(item.existingEvidenceRemainsUseful).toBe(true);
      expect(item.existingEvidenceUsefulness.trim().length).toBeGreaterThan(40);
      expect(item.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(item.verificationStatus).toBe("NOT_VERIFIED");
    }
  });

  it("writes JSON, CSV, and Markdown outputs only to research and catalog-doc paths", () => {
    const root = createFixtureRepository();
    const queue = buildAuthoritativeRecaptureQueue({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const output = writeAuthoritativeRecaptureQueueOutputs(queue, {
      root,
      outputDirectory: "data/research/cf27/reports/authoritative-recapture-queue",
      docsPath: "docs/catalog/AUTHORITATIVE_CURRENT_RECAPTURE_QUEUE.md"
    });

    expect(output.files).toEqual([
      "data/research/cf27/reports/authoritative-recapture-queue/authoritative_recapture_queue.json",
      "data/research/cf27/reports/authoritative-recapture-queue/authoritative_recapture_queue.csv",
      "data/research/cf27/reports/authoritative-recapture-queue/AUTHORITATIVE_RECAPTURE_QUEUE.md",
      "docs/catalog/AUTHORITATIVE_CURRENT_RECAPTURE_QUEUE.md"
    ]);
    expect(() =>
      writeAuthoritativeRecaptureQueueOutputs(queue, {
        root,
        outputDirectory: "data/catalog/production/recapture-queue",
        docsPath: "docs/catalog/AUTHORITATIVE_CURRENT_RECAPTURE_QUEUE.md"
      })
    ).toThrow(/data\/research\/cf27/);
  });
});

function createFixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-recapture-queue-"));
  temporaryRoots.push(root);
  writeJson(root, "data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json", {
    counts: {
      heads: 29,
      recaptureQueue: 2,
      issuesAndExceptions: 1,
      productionRecordsCreated: 0
    }
  });
  writeJson(root, "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json", {
    summary: {
      oneStandardizedRecaptureRunCanRepairCurrentImageLimitations: true
    }
  });
  writeJson(root, "data/research/cf27/reports/native-sequence-integrity/native_sequence_human_review_queue.json", {
    humanReviewQueue: [{ suggestionID: "test-only-sequence-review" }]
  });
  writeJson(root, "data/research/cf27/reports/ocr-native-label-review/manual_label_review_queue.json", {
    manualReviewQueue: [{ reviewID: "test-only-ocr-review" }]
  });
  writeJson(root, "data/research/cf27/video_inventory.json", {
    summary: {
      acceptedResearchCandidates: 1,
      partiallyAcceptedResearchCandidates: 1,
      intentionalFace12OverlapConfirmed: true
    }
  });
  writeCSV(root, "data/research/cf27/exports/partial-research-catalog-current/recapture_queue.csv", "id\none\n");
  writeCSV(root, "data/research/cf27/exports/partial-research-catalog-current/issues_and_exceptions.csv", "id\none\n");
  writeCSV(root, "data/research/cf27/reports/head-template-standardization-qa/head_template_recapture_queue.csv", "id\none\n");
  return root;
}

function writeJson(root: string, relativePath: string, value: unknown) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(value, null, 2));
}

function writeCSV(root: string, relativePath: string, value: string) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value);
}
