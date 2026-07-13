import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA, unavailableFaceLandmarkReport } from "@/lib/face-landmarks/face-landmark-provider";
import {
  createCatalogImageMeasurementReport,
  detectFaceRegion,
  PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION,
  summarizeLandmarkExtraction,
  validateCatalogMeasurementView,
  type Phase0CatalogMeasurementViewInput
} from "@/lib/phase-zero/phase-zero-catalog-image-measurement";
import type {
  DetectedFaceLandmarks,
  FaceLandmarkPoint,
  FaceLandmarkReport
} from "@/types/domain";

const now = "2026-07-13T00:00:00.000Z";
const testOnlyCatalogID = "TEST_ONLY_CATALOG_RECORD_NOT_PRODUCTION";

describe("Phase 0 catalog image measurement pipeline", () => {
  it("ships a schema for local catalog image measurements, failures, corrections, and precision limits", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/catalog-image-measurement.schema.json"), "utf8"));
    expect(schema.title).toBe("Phase0CatalogImageMeasurementReport");
    expect(schema.properties.schemaVersion.const).toBe(PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION);
    expect(schema.required).toEqual(expect.arrayContaining(["viewValidations", "faceRegions", "landmarkExtractions", "measurements", "readyForProductionCatalog"]));
    expect(schema.properties.readyForProductionCatalog.const).toBe(false);
    expect(schema.$defs.measurement.required).toEqual(expect.arrayContaining(["confidence", "supportingViewCount", "variance", "humanCorrection"]));
    expect(schema.$defs.measurement.properties.depthSupported.const).toBe(false);
  });

  it("validates view pose and face count before using catalog imagery", () => {
    const good = validateCatalogMeasurementView(view("straightOn", { yaw: 0 }));
    expect(good.status).toBe("usable");

    const mismatch = validateCatalogMeasurementView(view("leftProfile", { yaw: -40 }));
    expect(mismatch.status).toBe("needsHumanReview");
    expect(mismatch.issues.map((issue) => issue.code)).toContain("viewPoseMismatch");

    const blocked = validateCatalogMeasurementView({
      ...view("straightOn"),
      faceLandmarkReport: unavailableFaceLandmarkReport({ message: "No local model asset." })
    });
    expect(blocked.status).toBe("blocked");
    expect(blocked.issues.map((issue) => issue.code)).toContain("landmarksUnavailable");
  });

  it("detects face regions and summarizes landmark extraction reliability", () => {
    const input = view("straightOn");
    const region = detectFaceRegion(input);
    const extraction = summarizeLandmarkExtraction(input);

    expect(region.state).toBe("detected");
    expect(region.region).toMatchObject({ unit: "normalized", source: "landmarkBoundingBox", width: 0.48, height: 0.64 });
    expect(extraction).toMatchObject({
      state: "available",
      provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
      coreLandmarkCount: 23
    });
  });

  it("calculates normalized, explainable game-character image ratios with confidence and no depth support", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: requiredViews()
    });

    expect(report.readyForProductionCatalog).toBe(false);
    expect(report.precisionNotice).toContain("not scientific biometric");
    expect(report.measurements.faceWidthRatio).toMatchObject({
      value: 0.75,
      source: "landmarkDerived",
      availabilityState: "available",
      supportingViewCount: 1,
      supportingViews: ["straightOn"],
      variance: 0,
      depthSupported: false,
      algorithmVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION
    });
    expect(report.measurements.eyeSpacingRatio?.value).toBe(0.2);
    expect(report.measurements.noseWidthRatio?.value).toBe(0.16);
    expect(report.measurements.mouthWidthRatio?.value).toBe(0.34);
    expect(report.measurements.noseProjection).toMatchObject({
      availabilityState: "available",
      supportingViewCount: 2,
      supportingViews: ["leftProfile", "rightProfile"],
      variance: 0
    });
  });

  it("records failure states instead of fabricating measurements", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: [view("straightOn", { report: multipleFaceReport() })]
    });

    expect(report.viewValidations[0].status).toBe("blocked");
    expect(report.viewValidations[0].issues.map((issue) => issue.code)).toContain("multipleFaces");
    expect(report.measurements.faceWidthRatio).toMatchObject({
      value: null,
      source: "unavailable",
      availabilityState: "unavailable",
      supportingViewCount: 0
    });
    expect(report.failureMessages.join(" ")).toContain("Multiple face regions");
  });

  it("supports human measurement correction with provenance without making production-ready claims", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: [view("straightOn")],
      humanCorrections: [
        {
          measurementID: "noseProjection",
          value: 0.22,
          confidence: 0.62,
          correctedBy: "reviewer-test-only",
          reason: "Profile landmark unavailable in this synthetic test case.",
          supportingViewIDs: ["straightOn"],
          createdAt: now
        }
      ]
    });

    expect(report.humanCorrectionCount).toBe(1);
    expect(report.readyForProductionCatalog).toBe(false);
    expect(report.measurements.noseProjection).toMatchObject({
      value: 0.22,
      source: "humanCorrected",
      availabilityState: "available",
      supportingViewCount: 1,
      humanCorrection: {
        correctedBy: "reviewer-test-only",
        reason: "Profile landmark unavailable in this synthetic test case."
      }
    });
  });

  it("reports variance across repeated profile views", () => {
    const report = createCatalogImageMeasurementReport({
      catalogStableID: testOnlyCatalogID,
      catalogVersionID: "catalog-version-test-only",
      createdAt: now,
      imageViews: [
        view("leftProfile", { profileOffset: -0.09 }),
        view("rightProfile", { profileOffset: 0.11 })
      ]
    });

    expect(report.measurements.noseProjection?.supportingViewCount).toBe(2);
    expect(Number(report.measurements.noseProjection?.variance)).toBeGreaterThan(0);
    expect(Number(report.measurements.noseProjection?.confidence.score)).toBeLessThanOrEqual(0.82);
  });
});

function requiredViews() {
  return [
    view("straightOn", { yaw: 0 }),
    view("left45", { yaw: -42 }),
    view("right45", { yaw: 42 }),
    view("leftProfile", { yaw: -78 }),
    view("rightProfile", { yaw: 78 })
  ];
}

function view(
  viewID: Phase0CatalogMeasurementViewInput["viewID"],
  input: { yaw?: number; report?: FaceLandmarkReport; profileOffset?: number } = {}
): Phase0CatalogMeasurementViewInput {
  return {
    viewID,
    evidenceFileID: `evidence-${viewID}`,
    imageRelativePath: `data/fixtures/test-only/catalog-measurement/${viewID}.png`,
    width: 1200,
    height: 1600,
    capturedAt: now,
    faceLandmarkReport: input.report ?? landmarkReport(viewID, input.yaw ?? yawForView(viewID), input.profileOffset)
  };
}

function landmarkReport(viewID: Phase0CatalogMeasurementViewInput["viewID"], yaw: number, profileOffset?: number): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: "one",
    detectedFaceCount: 1,
    faces: [face(viewID, yaw, profileOffset)],
    provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: { score: 0.8, label: "high", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: [],
    createdAt: now
  };
}

function multipleFaceReport(): FaceLandmarkReport {
  return {
    ...landmarkReport("straightOn", 0),
    faceCount: "multiple",
    detectedFaceCount: 2,
    faces: [face("straightOn", 0), face("straightOn", 0)]
  };
}

function face(viewID: Phase0CatalogMeasurementViewInput["viewID"], yaw: number, profileOffset?: number): DetectedFaceLandmarks {
  const centerX = viewID === "leftProfile" ? 0.47 : viewID === "rightProfile" ? 0.53 : 0.5;
  const centerY = 0.5;
  const faceWidth = 0.48;
  const faceHeight = 0.64;
  const left = centerX - faceWidth / 2;
  const right = centerX + faceWidth / 2;
  const top = centerY - faceHeight / 2;
  const bottom = centerY + faceHeight / 2;
  const noseOffset = profileOffset ?? (viewID === "leftProfile" ? -0.1 : viewID === "rightProfile" ? 0.1 : 0);
  const chinOffset = viewID === "leftProfile" ? -0.04 : viewID === "rightProfile" ? 0.04 : 0;
  const points: Array<[string, number, number]> = [
    ["forehead top", centerX, top],
    ["left brow", centerX - 0.14, centerY - 0.15],
    ["right brow", centerX + 0.14, centerY - 0.15],
    ["left eye outer corner", centerX - 0.116, centerY - 0.08],
    ["left eye inner corner", centerX - 0.048, centerY - 0.075],
    ["right eye inner corner", centerX + 0.048, centerY - 0.075],
    ["right eye outer corner", centerX + 0.116, centerY - 0.08],
    ["left nose wing", centerX - 0.0385, centerY + 0.02],
    ["right nose wing", centerX + 0.0385, centerY + 0.02],
    ["nose bridge", centerX, centerY - 0.09],
    ["nose base", centerX, centerY + 0.11],
    ["nose tip", centerX + noseOffset, centerY + 0.02],
    ["left mouth corner", centerX - 0.0815, centerY + 0.18],
    ["right mouth corner", centerX + 0.0815, centerY + 0.18],
    ["left jaw", centerX - 0.155, centerY + 0.23],
    ["right jaw", centerX + 0.155, centerY + 0.23],
    ["left chin edge", centerX - 0.08, bottom - 0.03],
    ["right chin edge", centerX + 0.08, bottom - 0.03],
    ["chin", centerX + chinOffset, bottom],
    ["nose base", centerX, centerY + 0.11],
    ["left face edge", left, centerY],
    ["right face edge", right, centerY],
    ["upper lip", centerX, centerY + 0.16]
  ];
  return {
    boundingBox: {
      x: left,
      y: top,
      width: faceWidth,
      height: faceHeight,
      confidence: { score: 0.8, label: "high", evidence: "estimated" }
    },
    coreLandmarks: points.map(([label, x, y], index) => landmark(label, index, x, y)),
    approximateHeadPose: {
      yawDegrees: yaw,
      pitchDegrees: 0,
      rollDegrees: 0,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    expression: {
      leftEyeOpenness: 0.24,
      rightEyeOpenness: 0.24,
      mouthOpenness: 0.05,
      smileLikelihood: 0.1,
      strongExpressionLikelihood: 0.2,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    confidence: { score: 0.8, label: "high", evidence: "estimated" }
  };
}

function landmark(label: string, sourceIndex: number, x: number, y: number): FaceLandmarkPoint {
  return {
    label,
    sourceIndex,
    x,
    y,
    z: null,
    confidence: { score: 0.8, label: "high", evidence: "estimated" }
  };
}

function yawForView(viewID: Phase0CatalogMeasurementViewInput["viewID"]) {
  if (viewID === "left45") return -42;
  if (viewID === "right45") return 42;
  if (viewID === "leftProfile") return -78;
  if (viewID === "rightProfile") return 78;
  return 0;
}
