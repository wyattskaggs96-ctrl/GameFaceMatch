import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root head visual measurement CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import * as headVisualMeasurements from "../../scripts/cf27-head-visual-measurements.mjs";

const {
  buildHeadVisualMeasurementReport,
  decodePng,
  detectApproximateFaceRegion,
  writeHeadVisualMeasurementOutputs
} = headVisualMeasurements;

describe("CF27 head visual measurement research pipeline", () => {
  it("decodes PNGs and detects an approximate face region without sensitive inference", () => {
    const image = decodePng(createSyntheticHeadPng());
    const region = detectApproximateFaceRegion(image);

    expect(image.width).toBe(120);
    expect(image.height).toBe(120);
    expect(region.availabilityState).toBe("available");
    expect(region.source).toBe("coarse_skin_mask_character_region");
    expect(region.warnings).toContain("not_identity_or_sensitive_trait_detection");
  });

  it("builds research-only measurements for head candidates while leaving landmark-dependent ratios unavailable", () => {
    const fixture = createFixtureRepository();
    const report = buildHeadVisualMeasurementReport({
      root: fixture.root,
      frameManifestPath: fixture.frameManifestPath,
      frameSelectionPath: fixture.frameSelectionPath,
      standardizationQAPath: fixture.qaPath,
      generatedAt: "2026-07-13T19:00:00.000Z"
    });

    expect(report.schemaVersion).toBe("cf27-head-visual-measurements-v1");
    expect(report.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(report.policy.productionUseAllowed).toBe(false);
    expect(report.summary.headRecordCount).toBe(1);
    expect(report.summary.productionMatcherEnabled).toBe(false);
    expect(report.records[0].imageDerivedMeasurements.faceRegionBoundingBox.availabilityState).toBe("available");
    expect(report.records[0].imageDerivedMeasurements.faceWidthToHeightRatio.availabilityState).toBe("available");
    expect(report.records[0].imageDerivedMeasurements.jawWidthRatio.availabilityState).toBe("available");
    expect(report.records[0].imageDerivedMeasurements.eyeSpacingRatio).toMatchObject({
      value: null,
      availabilityState: "unavailable",
      reasonUnavailable: "landmarks_or_reviewed_eye_annotation_required"
    });
    expect(report.records[0].frameMeasurements[0].occlusionFlags.eyeBlack.status).toBe("present");
    expect(report.records[0].productionReadiness.readyForProductionMatching).toBe(false);
  });

  it("does not fabricate measurements for missing or undecodable frames", () => {
    const fixture = createFixtureRepository({ writeImage: false });
    const report = buildHeadVisualMeasurementReport({
      root: fixture.root,
      frameManifestPath: fixture.frameManifestPath,
      frameSelectionPath: fixture.frameSelectionPath,
      standardizationQAPath: fixture.qaPath,
      generatedAt: "2026-07-13T19:00:00.000Z"
    });

    const record = report.records[0];
    expect(record.frameMeasurements[0].decodeStatus).toBe("missing_file");
    expect(record.imageDerivedMeasurements.faceWidthToHeightRatio).toMatchObject({
      value: null,
      availabilityState: "unavailable"
    });
  });

  it("writes research reports only under the CF27 research report namespace", () => {
    const fixture = createFixtureRepository();
    const report = buildHeadVisualMeasurementReport({
      root: fixture.root,
      frameManifestPath: fixture.frameManifestPath,
      frameSelectionPath: fixture.frameSelectionPath,
      standardizationQAPath: fixture.qaPath,
      generatedAt: "2026-07-13T19:00:00.000Z"
    });
    const output = writeHeadVisualMeasurementOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/research/cf27/reports/head-template-visual-measurements"
    });

    expect(output.ok).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/research/cf27/reports/head-template-visual-measurements/head_visual_measurement_report.json"))).toBe(true);
    expect(() => writeHeadVisualMeasurementOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/catalog/production/head-measurements"
    })).toThrow(/Refusing to write/);
  });
});

function createFixtureRepository({ writeImage = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-head-visual-measurements-"));
  const imageRelativePath = "data/research/cf27/generated/full-resolution-frames/head-templates-faces-001-029/CF27_XBOXUNKNOWN_RTG_HEAD_001/front.png";
  const imagePath = path.join(root, imageRelativePath);
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  if (writeImage) fs.writeFileSync(imagePath, createSyntheticHeadPng());

  const frameManifestPath = "data/research/cf27/manifests/head-template-evidence-frames/head_template_evidence_frame_manifest.json";
  const frameSelectionPath = "data/research/cf27/reports/view-angle-frame-selection/view_angle_frame_selection_report.json";
  const qaPath = "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json";
  fs.mkdirSync(path.dirname(path.join(root, frameManifestPath)), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(root, frameSelectionPath)), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(root, qaPath)), { recursive: true });

  const frame = {
    frameID: "frame-cf27_xboxunknown_rtg_head_001-front",
    stableInternalID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
    nativeOrder: 1,
    visibleGameLabelOrIndex: "Face 1",
    view: "FRONT",
    angleLabelStatus: "approximate_from_rotation_sequence",
    sourceVideoID: "video-fixture",
    sourceWorkingFilename: "fixture.mp4",
    sourceTimestampSeconds: 12.34,
    outputRelativePath: imageRelativePath,
    outputSha256: "fixture-sha",
    width: 120,
    height: 120,
    transitionFrameRejected: true,
    severeMotionBlurRejected: true,
    mostlyOutsideUsefulCropRejected: true,
    prompt87NotificationOverlayObserved: false
  };

  fs.writeFileSync(path.join(root, frameManifestPath), `${JSON.stringify({
    schemaVersion: "fixture-frame-manifest-v1",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "TEST_ONLY",
    frames: [frame]
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, frameSelectionPath), `${JSON.stringify({
    schemaVersion: "fixture-selection-v1",
    records: [
      {
        stableInternalID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
        nativeOrder: 1,
        visibleGameLabelOrIndex: "Face 1",
        selections: {
          FRONT: {
            selectionStatus: "autoSelected",
            confidence: 0.7,
            selectedFrame: frame
          }
        }
      }
    ]
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, qaPath), `${JSON.stringify({
    schemaVersion: "fixture-qa-v1",
    records: [
      {
        stableInternalID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
        evidenceClassification: {
          usableMatchingImage: false,
          limitedMatchingImage: true,
          recaptureRequiredForProductionComparison: true
        },
        standardizedCaptureChecks: {
          eyeBlack: { status: "PRESENT" },
          hairstyleObstruction: { status: "PRESENT_OR_VARIABLE" },
          facialHair: { status: "NOT_STANDARDIZED" }
        }
      }
    ]
  }, null, 2)}\n`);
  return { root, frameManifestPath, frameSelectionPath, qaPath };
}

function createSyntheticHeadPng() {
  const width = 120;
  const height = 120;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      rgba[offset] = 5;
      rgba[offset + 1] = 8;
      rgba[offset + 2] = 18;
      rgba[offset + 3] = 255;
      const dx = (x - 86) / 20;
      const dy = (y - 57) / 32;
      if (dx * dx + dy * dy <= 1) {
        rgba[offset] = 142;
        rgba[offset + 1] = 88;
        rgba[offset + 2] = 58;
      }
      if (x >= 74 && x <= 98 && (y === 50 || y === 51)) {
        rgba[offset] = 20;
        rgba[offset + 1] = 18;
        rgba[offset + 2] = 16;
      }
    }
  }
  return encodePng(width, height, rgba);
}

function encodePng(width: number, height: number, rgba: Buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const rawRows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    rawRows.push(Buffer.from([0]));
    rawRows.push(rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rawRows))),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  return Buffer.concat([length, typeBuffer, data, crc]);
}
