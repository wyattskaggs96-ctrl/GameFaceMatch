import { describe, expect, it } from "vitest";
import {
  createCaptureGuidanceSession,
  evaluateCaptureGuidanceFrame
} from "@/lib/capture/capture-guidance-service";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA, unavailableFaceLandmarkReport } from "@/lib/face-landmarks/face-landmark-provider";
import type { CapturedAngleID, DetectedFaceLandmarks, FaceLandmarkReport, ImageQualityReport } from "@/types/domain";

describe("capture guidance frame validation", () => {
  it("validates all five required head directions", () => {
    const cases: Array<[CapturedAngleID, number]> = [
      ["straightOn", 0],
      ["left45", -42],
      ["right45", 42],
      ["leftProfile", -78],
      ["rightProfile", 78]
    ];
    for (const [angleID, yawDegrees] of cases) {
      const guidance = evaluateCaptureGuidanceFrame({
        angleID,
        faceLandmarkReport: report({ yawDegrees }),
        imageQualityReport: quality(),
        timestampMs: 0
      });
      expect(guidance.requiredPoseReached, angleID).toBe(true);
      expect(guidance.blockingIssues).toEqual([]);
      expect(guidance.readyMessages.map((issue) => issue.code)).toContain("poseReached");
    }
  });

  it("reports face not found and multiple faces as blocking", () => {
    const zero = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: { ...report({}), faceCount: "zero", detectedFaceCount: 0, faces: [] },
      timestampMs: 0
    });
    expect(zero.blockingIssues.map((issue) => issue.code)).toContain("faceNotFound");

    const multiple = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: { ...report({}), faceCount: "multiple", detectedFaceCount: 2, faces: [face({}), face({ centerX: 0.7 })] },
      timestampMs: 0
    });
    expect(multiple.blockingIssues.map((issue) => issue.code)).toContain("multipleFaces");
  });

  it("detects distance and centering problems", () => {
    const tooClose = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: report({ boxWidth: 0.8, boxHeight: 0.8 }),
      timestampMs: 0
    });
    expect(tooClose.blockingIssues.map((issue) => issue.code)).toContain("faceTooClose");

    const tooFar = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: report({ boxWidth: 0.2, boxHeight: 0.2 }),
      timestampMs: 0
    });
    expect(tooFar.blockingIssues.map((issue) => issue.code)).toContain("faceTooFar");

    const offCenter = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: report({ centerX: 0.75 }),
      timestampMs: 0
    });
    expect(offCenter.blockingIssues.map((issue) => issue.code)).toContain("faceOffCenter");
  });

  it("detects incorrect head direction without claiming depth accuracy", () => {
    const guidance = evaluateCaptureGuidanceFrame({
      angleID: "left45",
      faceLandmarkReport: report({ yawDegrees: 4 }),
      timestampMs: 0
    });
    expect(guidance.blockingIssues.map((issue) => issue.code)).toContain("incorrectHeadDirection");
    expect(guidance.protocolVersion).toBe("web-rgb-guidance-1.0.0");
  });

  it("treats blink, mouth open, and strong expression as advisory warnings", () => {
    const guidance = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: report({
        leftEyeOpenness: 0.05,
        mouthOpenness: 0.32,
        strongExpressionLikelihood: 0.85
      }),
      timestampMs: 0
    });
    expect(guidance.blockingIssues).toEqual([]);
    expect(guidance.advisoryWarnings.map((issue) => issue.code)).toEqual(expect.arrayContaining(["blink", "mouthOpen", "strongExpression"]));
    expect(guidance.canContinueWithLimitations).toBe(true);
  });

  it("blocks poor lighting and severe blur for capture readiness", () => {
    const guidance = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: report({}),
      imageQualityReport: quality({ brightness: 0.1, sharpness: 2 }),
      timestampMs: 0
    });
    expect(guidance.blockingIssues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["poorLighting", "severeBlur"]));
  });

  it("allows safe continuation when local landmarks are unavailable", () => {
    const guidance = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: unavailableFaceLandmarkReport({ message: "Model missing." }),
      imageQualityReport: quality(),
      timestampMs: 0
    });
    expect(guidance.blockingIssues).toEqual([]);
    expect(guidance.advisoryWarnings.map((issue) => issue.code)).toContain("landmarksUnavailable");
    expect(guidance.canContinueWithLimitations).toBe(true);
  });

  it("does not block fallback continuation for blur when landmarks are unavailable", () => {
    const guidance = evaluateCaptureGuidanceFrame({
      angleID: "straightOn",
      faceLandmarkReport: unavailableFaceLandmarkReport({ message: "Model missing." }),
      imageQualityReport: quality({ sharpness: 2 }),
      timestampMs: 0
    });
    expect(guidance.blockingIssues).toEqual([]);
    expect(guidance.advisoryWarnings.map((issue) => issue.code)).toContain("severeBlur");
  });
});

describe("capture guidance hold and motion", () => {
  it("requires the pose to be held steadily before capture", () => {
    const session = createCaptureGuidanceSession();
    const first = session.evaluate({
      angleID: "straightOn",
      faceLandmarkReport: report({}),
      imageQualityReport: quality(),
      timestampMs: 0
    });
    const second = session.evaluate({
      angleID: "straightOn",
      faceLandmarkReport: report({}),
      imageQualityReport: quality(),
      timestampMs: 950
    });
    expect(first.poseHeldLongEnough).toBe(false);
    expect(second.poseHeldLongEnough).toBe(true);
    expect(second.canCapture).toBe(true);
  });

  it("supports extended hold timing", () => {
    const session = createCaptureGuidanceSession();
    session.evaluate({
      angleID: "straightOn",
      faceLandmarkReport: report({}),
      imageQualityReport: quality(),
      timestampMs: 0,
      useExtendedHold: true
    });
    const shortHold = session.evaluate({
      angleID: "straightOn",
      faceLandmarkReport: report({}),
      imageQualityReport: quality(),
      timestampMs: 950,
      useExtendedHold: true
    });
    const longHold = session.evaluate({
      angleID: "straightOn",
      faceLandmarkReport: report({}),
      imageQualityReport: quality(),
      timestampMs: 1700,
      useExtendedHold: true
    });
    expect(shortHold.poseHeldLongEnough).toBe(false);
    expect(longHold.poseHeldLongEnough).toBe(true);
  });

  it("detects excessive motion and resets capture readiness", () => {
    const session = createCaptureGuidanceSession();
    session.evaluate({
      angleID: "straightOn",
      faceLandmarkReport: report({ centerX: 0.5 }),
      imageQualityReport: quality(),
      timestampMs: 0
    });
    const moved = session.evaluate({
      angleID: "straightOn",
      faceLandmarkReport: report({ centerX: 0.68 }),
      imageQualityReport: quality(),
      timestampMs: 300
    });
    expect(moved.blockingIssues.map((issue) => issue.code)).toContain("excessiveMotion");
    expect(moved.canCapture).toBe(false);
  });
});

function report(input: Partial<Parameters<typeof face>[0]>): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: "one",
    detectedFaceCount: 1,
    faces: [face(input)],
    provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: { score: 0.8, label: "medium", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: [],
    createdAt: "2026-07-11T00:00:00.000Z"
  };
}

function face({
  centerX = 0.5,
  centerY = 0.5,
  boxWidth = 0.45,
  boxHeight = 0.58,
  yawDegrees = 0,
  leftEyeOpenness = 0.25,
  rightEyeOpenness = 0.25,
  mouthOpenness = 0.08,
  strongExpressionLikelihood = 0.2
}: {
  centerX?: number;
  centerY?: number;
  boxWidth?: number;
  boxHeight?: number;
  yawDegrees?: number;
  leftEyeOpenness?: number;
  rightEyeOpenness?: number;
  mouthOpenness?: number;
  strongExpressionLikelihood?: number;
}): DetectedFaceLandmarks {
  return {
    boundingBox: {
      x: centerX - boxWidth / 2,
      y: centerY - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
      confidence: { score: 0.8, label: "medium", evidence: "estimated" }
    },
    coreLandmarks: [],
    approximateHeadPose: {
      yawDegrees,
      pitchDegrees: 0,
      rollDegrees: 0,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    expression: {
      leftEyeOpenness,
      rightEyeOpenness,
      mouthOpenness,
      smileLikelihood: 0.1,
      strongExpressionLikelihood,
      confidence: { score: 0.6, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    confidence: { score: 0.8, label: "medium", evidence: "estimated" }
  };
}

function quality(input: { brightness?: number; sharpness?: number } = {}): Pick<ImageQualityReport, "brightnessEstimate" | "sharpnessEstimate"> {
  return {
    brightnessEstimate: {
      value: input.brightness ?? 0.55,
      evidence: "estimated",
      label: "Synthetic brightness"
    },
    sharpnessEstimate: {
      value: input.sharpness ?? 12,
      evidence: "estimated",
      label: "Synthetic sharpness"
    }
  };
}
