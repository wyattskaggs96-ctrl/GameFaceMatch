import { describe, expect, it } from "vitest";
import {
  canSubmitScreenshotRefinement,
  createInitialScreenshotRefinementSession,
  createUnavailableScreenshotRefinementProcessor,
  getScreenshotRefinementReadiness,
  SCREENSHOT_REFINEMENT_CHECKLIST,
  deleteScreenshotRefinementSession,
  setScreenshot,
  setScreenshotChecklistItem,
  validateScreenshotMetadata
} from "@/lib/refinement/screenshot-refinement";
import { migrateStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import { analyzeScreenshotQualityAndAlignment } from "@/lib/refinement/screenshot-quality-alignment";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA, unavailableFaceLandmarkReport } from "@/lib/face-landmarks/face-landmark-provider";
import type { FaceLandmarkReport, FaceLandmarkPoint, StandardFaceProfile } from "@/types/domain";

describe("screenshot refinement scaffold", () => {
  it("requires a front screenshot and supports optional three-quarter screenshots", () => {
    const session = createInitialScreenshotRefinementSession(new Date("2026-07-10T00:00:00.000Z"));
    expect(session.slots.map((slot) => slot.viewID)).toEqual(["front", "left45", "right45"]);
    expect(session.slots.map((slot) => slot.required)).toEqual([true, false, false]);
    expect(canSubmitScreenshotRefinement(session)).toBe(false);
    expect(getScreenshotRefinementReadiness(session).blockingMessages).toContain("Front screenshot is required.");
    expect(getScreenshotRefinementReadiness(session).advisoryMessages).toContain(
      "Optional three-quarter screenshots not provided: Left 45 screenshot, Right 45 screenshot."
    );
  });

  it("validates screenshot type, size, and dimensions", () => {
    expect(
      validateScreenshotMetadata({
        viewID: "front",
        fileName: "created-player.bmp",
        fileType: "image/bmp",
        fileSizeBytes: 0,
        width: 320,
        height: 320
      }).errors
    ).toEqual([
      "Use a JPEG, PNG, or WebP screenshot.",
      "Use a screenshot file ending in .jpg, .jpeg, .png, or .webp.",
      "The screenshot file is empty or unreadable.",
      "Use a screenshot at least 720 pixels wide and tall."
    ]);
  });

  it("tracks valid screenshot completion and replacement cleanup", () => {
    let session = createInitialScreenshotRefinementSession();
    const first = setScreenshot(session, validScreenshot("front", "blob:front"));
    expect(first.objectUrlsToRevoke).toEqual([]);
    session = first.session;
    expect(session.slots[0].validationStatus).toBe("valid");

    const replacement = setScreenshot(session, validScreenshot("front", "blob:front-new"));
    expect(replacement.objectUrlsToRevoke).toEqual(["blob:front"]);
    expect(replacement.session.slots[0].screenshot?.objectUrl).toBe("blob:front-new");
  });

  it("blocks submission until the front screenshot and manual confirmations are complete", () => {
    let session = createInitialScreenshotRefinementSession();
    session = setScreenshot(session, validScreenshot("front", "blob:front")).session;
    expect(canSubmitScreenshotRefinement(session)).toBe(false);
    expect(getScreenshotRefinementReadiness(session).blockingMessages).toContain("Confirm: No helmet is covering the head.");

    for (const item of SCREENSHOT_REFINEMENT_CHECKLIST) {
      session = setScreenshotChecklistItem(session, item.id, true);
    }
    expect(canSubmitScreenshotRefinement(session)).toBe(true);
    expect(getScreenshotRefinementReadiness(session).advisoryMessages).toContain(
      "Optional three-quarter screenshots not provided: Left 45 screenshot, Right 45 screenshot."
    );
  });

  it("blocks low-resolution front screenshots even when the manual checklist is confirmed", () => {
    let session = createInitialScreenshotRefinementSession();
    session = setScreenshot(session, {
      ...validScreenshot("front", "blob:small-front"),
      width: 640,
      height: 640
    }).session;
    for (const item of SCREENSHOT_REFINEMENT_CHECKLIST) {
      session = setScreenshotChecklistItem(session, item.id, true);
    }
    expect(canSubmitScreenshotRefinement(session)).toBe(false);
    expect(session.slots[0].validationErrors).toContain("Use a screenshot at least 720 pixels wide and tall.");
  });

  it("does not require optional three-quarter screenshots for intake readiness", () => {
    let session = createInitialScreenshotRefinementSession();
    session = setScreenshot(session, validScreenshot("front", "blob:front")).session;
    for (const item of SCREENSHOT_REFINEMENT_CHECKLIST) {
      session = setScreenshotChecklistItem(session, item.id, true);
    }
    expect(canSubmitScreenshotRefinement(session)).toBe(true);
  });

  it("deletes screenshot session data and returns object URLs for revocation", () => {
    let session = createInitialScreenshotRefinementSession();
    session = setScreenshot(session, validScreenshot("front", "blob:front")).session;
    session = setScreenshot(session, validScreenshot("left45", "blob:left45")).session;
    const deleted = deleteScreenshotRefinementSession(session);
    expect(deleted.objectUrlsToRevoke).toEqual(["blob:front", "blob:left45"]);
    expect(deleted.session.status).toBe("deleted");
    expect(deleted.session.slots.every((slot) => slot.screenshot === undefined)).toBe(true);
    expect(Object.values(deleted.session.checklist).every((checked) => checked === false)).toBe(true);
  });

  it("returns an honest unavailable refinement result", async () => {
    const result = await createUnavailableScreenshotRefinementProcessor().refine({
      originalProfile: placeholderProfile(),
      screenshots: []
    });
    expect(result.status).toBe("unavailable");
    expect(result.message).toMatch(/unavailable until verified catalog data/i);
    expect(result.suggestedMatches).toEqual([]);
  });

  it("gracefully reports unavailable local face analysis without fabricating landmarks", () => {
    const report = analyzeScreenshotQualityAndAlignment({
      screenshot: validScreenshot("front", "blob:front"),
      faceLandmarkReport: unavailableFaceLandmarkReport({ message: "Local model missing." }),
      imageMeasurements: goodMeasurements()
    });

    expect(report.overallState).toBe("needsReview");
    expect(report.faceDetection.state).toBe("unavailable");
    expect(report.landmarkEstimate.coreLandmarkCount).toBe(0);
    expect(report.alignment.transform).toBeNull();
    expect(report.advisoryMessages.join(" ")).toMatch(/unavailable/i);
  });

  it("creates an alignment report from a single detected face", () => {
    const report = analyzeScreenshotQualityAndAlignment({
      screenshot: validScreenshot("front", "blob:front"),
      faceLandmarkReport: oneFaceReport({ yaw: 2, roll: 3 }),
      imageMeasurements: goodMeasurements()
    });

    expect(report.overallState).toBe("ready");
    expect(report.faceDetection.faceCount).toBe("one");
    expect(report.faceDetection.boundingBox).toMatchObject({ x: 0.3, y: 0.16, width: 0.4, height: 0.5 });
    expect(report.poseEstimate.state).toBe("ready");
    expect(report.landmarkEstimate.coreLandmarkCount).toBeGreaterThanOrEqual(8);
    expect(report.alignment.standardCoordinateSystem).toBe("gameface-screenshot-alignment-v1");
    expect(report.alignment.transform).toMatchObject({ translateX: 0, translateY: 0.01, scale: 0.96, rotationDegrees: -3 });
  });

  it("blocks zero or multiple detected faces with actionable retake guidance", () => {
    const zero = analyzeScreenshotQualityAndAlignment({
      screenshot: validScreenshot("front", "blob:front"),
      faceLandmarkReport: { ...oneFaceReport(), faceCount: "zero", detectedFaceCount: 0, faces: [] },
      imageMeasurements: goodMeasurements()
    });
    const multiple = analyzeScreenshotQualityAndAlignment({
      screenshot: validScreenshot("front", "blob:front"),
      faceLandmarkReport: { ...oneFaceReport(), faceCount: "multiple", detectedFaceCount: 2, faces: [oneFaceReport().faces[0], oneFaceReport().faces[0]] },
      imageMeasurements: goodMeasurements()
    });

    expect(zero.overallState).toBe("blocked");
    expect(multiple.overallState).toBe("blocked");
    expect(multiple.retakeInstructions.map((instruction) => instruction.code)).toContain("useSingleVisibleFace");
  });

  it("blocks front screenshots with a strong turned-pose estimate", () => {
    const report = analyzeScreenshotQualityAndAlignment({
      screenshot: validScreenshot("front", "blob:front"),
      faceLandmarkReport: oneFaceReport({ yaw: 34 }),
      imageMeasurements: goodMeasurements()
    });

    expect(report.overallState).toBe("blocked");
    expect(report.poseEstimate.message).toMatch(/retake facing the camera/i);
    expect(report.retakeInstructions.map((instruction) => instruction.code)).toContain("retakeFront");
  });

  it("blocks extreme lighting, severe blur, and low resolution", () => {
    const report = analyzeScreenshotQualityAndAlignment({
      screenshot: { ...validScreenshot("front", "blob:front"), width: 640, height: 640 },
      faceLandmarkReport: oneFaceReport(),
      imageMeasurements: {
        ...goodMeasurements(),
        brightness: 0.08,
        shadowClipping: 0.52,
        sharpness: 4
      }
    });

    expect(report.overallState).toBe("blocked");
    expect(report.resolutionCheck.state).toBe("blocked");
    expect(report.lightingWarning.state).toBe("blocked");
    expect(report.retakeInstructions.map((instruction) => instruction.code)).toEqual(expect.arrayContaining(["useHigherResolution", "improveLighting"]));
  });

  it("flags occlusion when required core regions cannot be estimated", () => {
    const base = oneFaceReport();
    const report = analyzeScreenshotQualityAndAlignment({
      screenshot: validScreenshot("front", "blob:front"),
      faceLandmarkReport: {
        ...base,
        faces: [
          {
            ...base.faces[0],
            coreLandmarks: base.faces[0].coreLandmarks.filter((landmark) => landmark.label === "nose tip")
          }
        ]
      },
      imageMeasurements: goodMeasurements()
    });

    expect(report.overallState).toBe("blocked");
    expect(report.occlusionCheck.missingCoreRegions).toContain("chin");
    expect(report.retakeInstructions.map((instruction) => instruction.code)).toContain("removeObstruction");
  });
});

function validScreenshot(viewID: "front" | "left45" | "right45", objectUrl: string) {
  return {
    viewID,
    fileName: `${viewID}.png`,
    fileType: "image/png",
    fileSizeBytes: 1_000_000,
    width: 1280,
    height: 720,
    objectUrl,
    createdAt: "2026-07-10T00:00:00.000Z"
  };
}

function goodMeasurements() {
  return {
    brightness: 0.5,
    highlightClipping: 0.01,
    shadowClipping: 0.02,
    sharpness: 22,
    lightingImbalance: 0.04
  };
}

function oneFaceReport(input: { yaw?: number; roll?: number } = {}): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: "one",
    detectedFaceCount: 1,
    faces: [
      {
        boundingBox: {
          x: 0.3,
          y: 0.16,
          width: 0.4,
          height: 0.5,
          confidence: { score: 0.8, label: "medium", evidence: "estimated" }
        },
        coreLandmarks: [
          landmark("nose tip", 1, 0.5, 0.38),
          landmark("left eye inner corner", 133, 0.44, 0.3),
          landmark("right eye inner corner", 362, 0.56, 0.3),
          landmark("left mouth corner", 61, 0.44, 0.52),
          landmark("right mouth corner", 291, 0.56, 0.52),
          landmark("chin", 152, 0.5, 0.66),
          landmark("left jaw", 172, 0.36, 0.56),
          landmark("right jaw", 397, 0.64, 0.56)
        ],
        approximateHeadPose: {
          yawDegrees: input.yaw ?? 0,
          pitchDegrees: 0,
          rollDegrees: input.roll ?? 0,
          confidence: { score: 0.6, label: "medium", evidence: "estimated" },
          availabilityState: "available"
        },
        expression: {
          leftEyeOpenness: 0.2,
          rightEyeOpenness: 0.2,
          mouthOpenness: 0.05,
          smileLikelihood: 0.1,
          strongExpressionLikelihood: 0.12,
          confidence: { score: 0.6, label: "medium", evidence: "estimated" },
          availabilityState: "available"
        },
        confidence: { score: 0.8, label: "medium", evidence: "estimated" }
      }
    ],
    provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: { score: 0.8, label: "medium", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: [],
    createdAt: "2026-07-10T00:00:00.000Z"
  };
}

function landmark(label: string, sourceIndex: number, x: number, y: number): FaceLandmarkPoint {
  return {
    label,
    sourceIndex,
    x,
    y,
    z: null,
    confidence: { score: 0.7, label: "medium", evidence: "estimated" }
  };
}

function placeholderProfile(): StandardFaceProfile {
  return migrateStandardFaceProfile({
    id: "refinement-test-profile",
    profileVersion: "test",
    createdAt: "2026-07-10T00:00:00.000Z",
    capture: {
      mode: "webRgbGuided",
      deviceModel: "test",
      capturedAt: "2026-07-10T00:00:00.000Z",
      overallQuality: 0,
      operatingSystemVersion: "test",
      appVersion: "test",
      browserRgbOnly: true
    },
    qualityReport: {
      overallScore: 0,
      issues: [],
      isUsableForPrototype: false,
      requiredAnglesComplete: false
    },
    geometry: {
      measurements: {},
      unavailableMeasurements: [],
      modelVersion: "test"
    },
    appearance: {
      attributes: [],
      modelVersion: "test"
    },
    sourceAngleAvailability: {
      straightOn: { angleID: "straightOn", available: false },
      left45: { angleID: "left45", available: false },
      right45: { angleID: "right45", available: false },
      leftProfile: { angleID: "leftProfile", available: false },
      rightProfile: { angleID: "rightProfile", available: false }
    }
  });
}
