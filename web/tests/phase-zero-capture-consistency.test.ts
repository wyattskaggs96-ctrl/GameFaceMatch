import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_CAPTURE_CONSISTENCY_SCHEMA_VERSION,
  createCaptureConsistencyReport,
  createConsistencyMeasurementsFromPixelSample,
  createDefaultCaptureConsistencyTolerances,
  createEmptyManualConsistencyFlags,
  type Phase0CaptureConsistencyEvidence,
  type Phase0CaptureConsistencyMeasurements
} from "@/lib/phase-zero/phase-zero-capture-consistency";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 capture consistency QA", () => {
  it("documents warning-only QA schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/capture-consistency-qa.schema.json"), "utf8"));

    expect(schema.properties.schemaVersion.const).toBe(PHASE0_CAPTURE_CONSISTENCY_SCHEMA_VERSION);
    expect(schema.properties.summary.properties.verifiedGameFactsCreated.const).toBe(false);
    expect(schema.$defs.finding.properties.severity.const).toBe("warning");
    expect(schema.$defs.finding.properties.code.enum).toEqual(expect.arrayContaining(["overlayObstruction", "unexpectedHairstyle", "suspectedLoadingAnimation"]));
  });

  it("passes a consistent synthetic capture set without creating verified game facts", () => {
    const report = createCaptureConsistencyReport({
      environmentID: "environment-synthetic",
      generatedAt: now,
      evidence: [evidence("front", "straightOn"), evidence("left", "left45")]
    });

    expect(report.summary.warningCount).toBe(0);
    expect(report.summary.verifiedGameFactsCreated).toBe(false);
    expect(report.qaNotice).toMatch(/not verified College Football 27 facts/);
  });

  it("warns on image dimensions, aspect ratio, crop consistency, head size, and head-center drift", () => {
    const tolerances = createDefaultCaptureConsistencyTolerances("environment-synthetic", {
      dimensions: {
        expectedWidth: 1920,
        expectedHeight: 1080,
        tolerancePixels: 1,
        crossImageTolerancePixels: 1
      },
      aspectRatio: {
        expected: 1.777,
        tolerance: 0.005,
        crossImageTolerance: 0.005
      },
      crop: {
        normalizedTolerance: 0.01
      },
      headBoundingBox: {
        minSizeRatio: 0.4,
        maxSizeRatio: 0.7,
        crossImageSizeTolerance: 0.02,
        centerXTolerance: 0.04,
        centerYTolerance: 0.04
      }
    });

    const report = createCaptureConsistencyReport({
      environmentID: "environment-synthetic",
      generatedAt: now,
      tolerances,
      evidence: [
        evidence("front", "straightOn"),
        evidence("bad", "left45", {
          dimensions: { width: 1280, height: 1080 },
          crop: { unit: "normalized", x: 0.1, y: 0.08, width: 0.8, height: 0.84 },
          headBoundingBox: { unit: "normalized", x: 0.7, y: 0.68, width: 0.22, height: 0.2, source: "operatorEstimate" }
        })
      ]
    });

    expect(codes(report)).toEqual(expect.arrayContaining(["imageDimensions", "aspectRatio", "cropConsistency", "headBoundingBoxSize", "headCenterPosition"]));
    expect(report.findings.every((finding) => finding.severity === "warning")).toBe(true);
  });

  it("warns on brightness, contrast, sharpness, and color-balance issues", () => {
    const report = createCaptureConsistencyReport({
      environmentID: "environment-synthetic",
      generatedAt: now,
      evidence: [
        evidence("front", "straightOn", {
          measurements: measurements({ brightness: 0.12, contrast: 0.03, sharpness: 2, channelSpread: 0.28 })
        })
      ]
    });

    expect(codes(report)).toEqual(expect.arrayContaining(["brightness", "contrast", "sharpness", "colorBalance"]));
    expect(report.summary.automatedWarningCount).toBe(4);
  });

  it("turns manual obstruction and appearance flags into QA warnings only", () => {
    const flags = createEmptyManualConsistencyFlags("Operator spotted a transient overlay.");
    flags.overlayObstruction = true;
    flags.cursorObstruction = true;
    flags.missingSkullOrChin = true;
    flags.unexpectedHairstyle = true;
    flags.unexpectedFacialHair = true;
    flags.suspectedLoadingAnimation = true;

    const report = createCaptureConsistencyReport({
      environmentID: "environment-synthetic",
      generatedAt: now,
      evidence: [evidence("front", "straightOn", { manualFlags: flags })]
    });

    expect(codes(report)).toEqual(expect.arrayContaining([
      "overlayObstruction",
      "cursorObstruction",
      "missingSkullOrChin",
      "unexpectedHairstyle",
      "unexpectedFacialHair",
      "suspectedLoadingAnimation"
    ]));
    expect(report.summary.manualFlagCount).toBe(6);
    expect(report.findings.filter((finding) => finding.evidenceKind === "manualFlag").every((finding) => !finding.automatedFinding)).toBe(true);
  });

  it("flags unavailable crop, head-box, and measurement data for manual review", () => {
    const report = createCaptureConsistencyReport({
      environmentID: "environment-synthetic",
      generatedAt: now,
      evidence: [
        evidence("front", "straightOn", {
          crop: null,
          headBoundingBox: null,
          measurements: null
        })
      ]
    });

    expect(codes(report)).toEqual(expect.arrayContaining(["cropConsistency", "headBoundingBoxSize", "headCenterPosition", "brightness", "contrast", "sharpness", "colorBalance"]));
    expect(report.findings.some((finding) => finding.evidenceKind === "unavailable")).toBe(true);
  });

  it("derives brightness, contrast, sharpness, and color balance from synthetic pixels", () => {
    const measured = createConsistencyMeasurementsFromPixelSample(pixelSample(3, 3, [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255]
    ]));

    expect(measured.brightness.evidence).toBe("estimated");
    expect(measured.brightness.value).toBeGreaterThan(0);
    expect(measured.contrast.value).toBeGreaterThan(0);
    expect(measured.sharpness.value).toBeGreaterThan(0);
    expect(measured.colorBalance?.channelSpread).toBe(0);
  });

  it("honors configurable per-environment tolerances", () => {
    const strict = createDefaultCaptureConsistencyTolerances("environment-strict", {
      brightness: {
        minimum: 0.5,
        maximum: 0.6,
        crossImageTolerance: 0.02
      }
    });
    const relaxed = createDefaultCaptureConsistencyTolerances("environment-relaxed", {
      brightness: {
        minimum: 0.1,
        maximum: 0.9,
        crossImageTolerance: 0.5
      }
    });
    const input = [evidence("front", "straightOn", { measurements: measurements({ brightness: 0.3 }) })];

    expect(codes(createCaptureConsistencyReport({ environmentID: "environment-strict", generatedAt: now, tolerances: strict, evidence: input }))).toContain("brightness");
    expect(codes(createCaptureConsistencyReport({ environmentID: "environment-relaxed", generatedAt: now, tolerances: relaxed, evidence: input }))).not.toContain("brightness");
  });
});

function codes(report: ReturnType<typeof createCaptureConsistencyReport>) {
  return report.findings.map((finding) => finding.code);
}

function evidence(
  id: string,
  view: Phase0CaptureConsistencyEvidence["view"],
  overrides: Partial<Phase0CaptureConsistencyEvidence> = {}
): Phase0CaptureConsistencyEvidence {
  return {
    evidenceID: `evidence-synthetic-${id}`,
    view,
    dimensions: { width: 1920, height: 1080 },
    crop: { unit: "normalized", x: 0, y: 0, width: 1, height: 1 },
    headBoundingBox: { unit: "normalized", x: 0.25, y: 0.16, width: 0.5, height: 0.56, source: "operatorEstimate" },
    measurements: measurements({}),
    manualFlags: createEmptyManualConsistencyFlags(),
    ...overrides
  };
}

function measurements(input: {
  brightness?: number;
  contrast?: number;
  sharpness?: number;
  channelSpread?: number;
}): Phase0CaptureConsistencyMeasurements {
  return {
    brightness: { value: input.brightness ?? 0.55, evidence: "estimated" },
    contrast: { value: input.contrast ?? 0.16, evidence: "estimated" },
    sharpness: { value: input.sharpness ?? 18, evidence: "estimated" },
    colorBalance: {
      redMean: 0.5,
      greenMean: 0.5,
      blueMean: 0.5,
      channelSpread: input.channelSpread ?? 0.02
    }
  };
}

function pixelSample(width: number, height: number, colors: Array<[number, number, number, number]>) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const color = colors[index % colors.length];
    rgba[index * 4] = color[0];
    rgba[index * 4 + 1] = color[1];
    rgba[index * 4 + 2] = color[2];
    rgba[index * 4 + 3] = color[3];
  }
  return { width, height, rgba };
}
