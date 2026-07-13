import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root OCR review CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { buildOcrNativeLabelReviewReport, summarizeOcr, writeOcrNativeLabelReviewOutputs } from "../../scripts/cf27-ocr-native-label-review.mjs";

describe("CF27 OCR-assisted native-label review", () => {
  it("creates secondary OCR review records without promoting labels", () => {
    const fixture = createFixtureRepository();
    const report = buildOcrNativeLabelReviewReport({
      root: fixture.root,
      categoryConfigs: [fixture.categoryConfig],
      runOcr: false,
      generatedAt: "2026-07-13T18:00:00.000Z"
    });

    expect(report.summary.candidateLabelCount).toBe(2);
    expect(report.summary.rawOcrOutputCount).toBe(2);
    expect(report.summary.visualConfirmationRequiredCount).toBe(2);
    expect(report.summary.ocrUnavailableCount).toBe(2);
    expect(report.records).toBeUndefined();
    expect(report.categories[0].records[0]).toMatchObject({
      candidateNativeLabel: "Synthetic Label 1",
      manualReviewRequired: true,
      reviewReason: "ocrEngineUnavailable",
      catalogCandidateLabelAction: "BLOCK_PROMOTION_UNTIL_VISUALLY_CONFIRMED",
      factStatus: "ocr_assist_not_verified_game_fact"
    });
    expect(report.categories[0].records[0].ocr.canPromoteLabel).toBe(false);
  });

  it("flags OCR/candidate mismatches and never silently corrects uncertain labels", () => {
    const ocr = summarizeOcr({
      rawOcrOutput: {
        status: "OCR_ATTEMPTED",
        rawText: "Different Label",
        confidence: 0.98,
        confidenceSource: "fixture"
      },
      candidateNativeLabel: "Synthetic Label 1",
      confidenceThreshold: 0.86
    });

    expect(ocr.status).toBe("HIGH_CONFIDENCE_ASSIST");
    expect(ocr.exactCandidateMatch).toBe(false);
    expect(ocr.canPromoteLabel).toBe(false);
    expect(ocr.normalizedText).toBe("different label");
  });

  it("keeps low-confidence matching OCR in the manual confirmation path", () => {
    const ocr = summarizeOcr({
      rawOcrOutput: {
        status: "OCR_ATTEMPTED",
        rawText: "Synthetic Label 1",
        confidence: 0.35,
        confidenceSource: "fixture"
      },
      candidateNativeLabel: "Synthetic Label 1",
      confidenceThreshold: 0.86
    });

    expect(ocr.status).toBe("LOW_CONFIDENCE_ASSIST");
    expect(ocr.exactCandidateMatch).toBe(true);
    expect(ocr.canPromoteLabel).toBe(false);
  });

  it("writes raw OCR outputs separately and refuses production directories", () => {
    const fixture = createFixtureRepository();
    const report = buildOcrNativeLabelReviewReport({
      root: fixture.root,
      categoryConfigs: [fixture.categoryConfig],
      runOcr: false,
      generatedAt: "2026-07-13T18:00:00.000Z"
    });
    const output = writeOcrNativeLabelReviewOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/research/cf27/reports/ocr-native-label-review"
    });

    expect(output.ok).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/research/cf27/reports/ocr-native-label-review/raw_ocr_outputs.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/research/cf27/reports/ocr-native-label-review/manual_label_review_queue.csv"))).toBe(true);
    expect(() => writeOcrNativeLabelReviewOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/catalog/production/ocr"
    })).toThrow(/Refusing to write/);
  });
});

function createFixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-ocr-label-review-"));
  const candidateDirectory = path.join(root, "data/research/cf27/catalog-candidates/research/fixture-labels");
  const manifestDirectory = path.join(root, "data/research/cf27/manifests/fixture-label-frames");
  fs.mkdirSync(candidateDirectory, { recursive: true });
  fs.mkdirSync(manifestDirectory, { recursive: true });
  fs.writeFileSync(path.join(candidateDirectory, "fixture_candidates.json"), `${JSON.stringify({
    schemaVersion: "fixture-candidates-v1",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "TEST_ONLY",
    records: [
      candidate(1, "Synthetic Label 1"),
      candidate(2, "Synthetic Label 2")
    ]
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(manifestDirectory, "fixture_frame_manifest.json"), `${JSON.stringify({
    schemaVersion: "fixture-frame-manifest-v1",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "TEST_ONLY",
    frames: [
      frame(1),
      frame(2)
    ]
  }, null, 2)}\n`);
  return {
    root,
    categoryConfig: {
      key: "fixtureLabels",
      displayName: "Fixture Labels",
      candidatePath: "data/research/cf27/catalog-candidates/research/fixture-labels/fixture_candidates.json",
      frameManifestPath: "data/research/cf27/manifests/fixture-label-frames/fixture_frame_manifest.json",
      menuRoles: ["MENU"],
      labelCrop: { x: 12, y: 34, width: 120, height: 30 },
      confidenceThreshold: 0.86
    }
  };
}

function candidate(nativeOrder: number, nativeLabelOriginalText: string) {
  return {
    nativeOrder,
    stableInternalID: `CF27_TEST_LABEL_${String(nativeOrder).padStart(3, "0")}`,
    nativeLabelOriginalText,
    visibleGameLabelOrIndex: nativeLabelOriginalText,
    selectedMenuEvidence: [{ videoID: "video-fixture", stableTimestampSeconds: nativeOrder }],
    verificationState: "NOT_VERIFIED",
    productionStatus: "NOT_PRODUCTION_DATA"
  };
}

function frame(nativeOrder: number) {
  const stableInternalID = `CF27_TEST_LABEL_${String(nativeOrder).padStart(3, "0")}`;
  return {
    frameID: `frame-${stableInternalID.toLowerCase()}-menu`,
    stableInternalID,
    nativeOrder,
    nativeLabelOriginalText: `Synthetic Label ${nativeOrder}`,
    role: "MENU",
    outputRelativePath: `data/research/cf27/generated/full-resolution-frames/fixture/${stableInternalID}.png`,
    outputSha256: `sha-${stableInternalID}`,
    sourceVideoID: "video-fixture",
    sourceWorkingFilename: "fixture.mp4",
    portableRelativeEvidencePath: "fixtures/not-production.mp4",
    sourceTimestampSeconds: nativeOrder,
    width: 1920,
    height: 1080
  };
}
