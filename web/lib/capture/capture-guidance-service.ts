import type {
  CapturedAngleID,
  CaptureGuidanceIssue,
  CaptureGuidanceReport,
  FaceLandmarkReport,
  ImageQualityReport,
  RealtimeCaptureQualityReport,
  RealtimeCaptureQualitySignal,
  RealtimeCaptureQualitySignalID,
  RealtimeCaptureQualitySignalState
} from "@/types/domain";
import { faceBoxCenter, projectFaceBoxToVisiblePreview, type VisiblePreviewGeometry } from "./visible-preview-geometry";

export const CAPTURE_GUIDANCE_PROTOCOL_VERSION = "web-rgb-guidance-1.0.0";
export const CAPTURE_GUIDANCE_THRESHOLD_VERSION = "web-rgb-thresholds-2026-08-15";

export interface CaptureGuidanceThresholds {
  faceMinBoxSize: number;
  faceMaxBoxSize: number;
  centerToleranceX: number;
  centerToleranceY: number;
  blinkEyeOpenness: number;
  mouthOpenRatio: number;
  strongExpressionLikelihood: number;
  severeBlurSharpness: number;
  targetSharpness: number;
  poorBrightnessLow: number;
  poorBrightnessHigh: number;
  maxHighlightClipping: number;
  maxShadowClipping: number;
  maxLightingImbalance: number;
  severeLightingImbalance: number;
  minRequiredRegionCoverage: number;
  maxCenterMotionPerSecond: number;
  maxYawMotionPerSecond: number;
  holdTargetMs: number;
  extendedHoldTargetMs: number;
  headYawRanges: Record<CapturedAngleID, { min: number; max: number; label: string }>;
  requiredCoreLandmarks: Record<CapturedAngleID, string[]>;
  qualityWeights: Record<RealtimeCaptureQualitySignalID, number>;
}

export interface CaptureGuidanceInput {
  angleID: CapturedAngleID;
  faceLandmarkReport: FaceLandmarkReport;
  imageQualityReport?: Pick<
    ImageQualityReport,
    "brightnessEstimate" | "highlightClippingEstimate" | "shadowClippingEstimate" | "sharpnessEstimate" | "lightingImbalanceEstimate"
  >;
  timestampMs: number;
  useExtendedHold?: boolean;
  requireOperationalLandmarks?: boolean;
  visiblePreviewGeometry?: VisiblePreviewGeometry | null;
}

interface FrameSignal {
  centerX: number;
  centerY: number;
  yaw: number | null;
}

export const defaultCaptureGuidanceThresholds: CaptureGuidanceThresholds = {
  faceMinBoxSize: 0.26,
  faceMaxBoxSize: 0.74,
  centerToleranceX: 0.16,
  centerToleranceY: 0.18,
  blinkEyeOpenness: 0.12,
  mouthOpenRatio: 0.18,
  strongExpressionLikelihood: 0.68,
  severeBlurSharpness: 4,
  targetSharpness: 18,
  poorBrightnessLow: 0.16,
  poorBrightnessHigh: 0.9,
  maxHighlightClipping: 0.18,
  maxShadowClipping: 0.28,
  maxLightingImbalance: 0.24,
  severeLightingImbalance: 0.38,
  minRequiredRegionCoverage: 0.72,
  maxCenterMotionPerSecond: 0.22,
  maxYawMotionPerSecond: 34,
  holdTargetMs: 900,
  extendedHoldTargetMs: 1600,
  headYawRanges: {
    straightOn: { min: -14, max: 14, label: "face straight toward the camera" },
    left45: { min: -62, max: -20, label: "turn left about 45 degrees" },
    right45: { min: 20, max: 62, label: "turn right about 45 degrees" },
    leftProfile: { min: -105, max: -52, label: "show your left profile" },
    rightProfile: { min: 52, max: 105, label: "show your right profile" }
  },
  requiredCoreLandmarks: {
    straightOn: ["nose tip", "chin", "left eye outer corner", "right eye outer corner", "left mouth corner", "right mouth corner"],
    left45: ["nose tip", "chin", "left eye outer corner", "right eye outer corner", "left mouth corner", "right mouth corner"],
    right45: ["nose tip", "chin", "left eye outer corner", "right eye outer corner", "left mouth corner", "right mouth corner"],
    leftProfile: ["nose tip", "chin", "nose bridge", "upper lip", "lower lip"],
    rightProfile: ["nose tip", "chin", "nose bridge", "upper lip", "lower lip"]
  },
  qualityWeights: {
    faceFound: 0.11,
    singleFace: 0.11,
    faceSize: 0.1,
    centering: 0.1,
    pose: 0.14,
    blur: 0.12,
    exposure: 0.1,
    lightingUniformity: 0.08,
    occlusionFreedom: 0.08,
    expressionNeutrality: 0.08,
    requiredRegions: 0.08
  }
};

export const naturalPhonePositioningThresholds: CaptureGuidanceThresholds = {
  ...defaultCaptureGuidanceThresholds,
  faceMinBoxSize: 0.22,
  faceMaxBoxSize: 0.84,
  centerToleranceX: 0.22,
  centerToleranceY: 0.26,
  maxCenterMotionPerSecond: 0.5,
  maxYawMotionPerSecond: 60,
  holdTargetMs: 450,
  extendedHoldTargetMs: 1_100
};

export class CaptureGuidanceSession {
  private poseStableSinceMs: number | null = null;
  private previousSignal: FrameSignal | null = null;
  private previousTimestampMs: number | null = null;

  constructor(private readonly thresholds: CaptureGuidanceThresholds = defaultCaptureGuidanceThresholds) {}

  reset() {
    this.poseStableSinceMs = null;
    this.previousSignal = null;
    this.previousTimestampMs = null;
  }

  evaluate(input: CaptureGuidanceInput): CaptureGuidanceReport {
    const baseReport = evaluateCaptureGuidanceFrame(input, this.thresholds);
    const signal = getFrameSignal(input.faceLandmarkReport, input.visiblePreviewGeometry);
    const motionIssue = signal ? this.evaluateMotion(signal, input.timestampMs) : null;
    const blockingIssues = motionIssue ? [...baseReport.blockingIssues, motionIssue] : baseReport.blockingIssues;
    const poseStable = baseReport.requiredPoseReached && blockingIssues.length === 0;
    if (!poseStable) {
      this.poseStableSinceMs = null;
    } else if (this.poseStableSinceMs === null) {
      this.poseStableSinceMs = input.timestampMs;
    }
    const holdTargetMs = input.useExtendedHold ? this.thresholds.extendedHoldTargetMs : this.thresholds.holdTargetMs;
    const holdDurationMs = poseStable && this.poseStableSinceMs !== null ? Math.max(0, Math.round(input.timestampMs - this.poseStableSinceMs)) : 0;
    const poseHeldLongEnough = holdDurationMs >= holdTargetMs;
    const readyMessages = [...baseReport.readyMessages];
    const advisoryWarnings = [...baseReport.advisoryWarnings];
    if (poseStable && !poseHeldLongEnough) {
      advisoryWarnings.push(issue("poseHoldPending", "advisory", `Pose reached. Hold steady for ${holdTargetMs} ms before capture.`, true));
    }
    if (poseHeldLongEnough) {
      readyMessages.push(issue("poseHeld", "ready", "Pose held steadily long enough for capture.", true));
    }
    return {
      ...baseReport,
      holdDurationMs,
      holdTargetMs,
      poseHeldLongEnough,
      blockingIssues,
      advisoryWarnings,
      readyMessages,
      canCapture: baseReport.requiredPoseReached && blockingIssues.length === 0 && poseHeldLongEnough,
      canContinueWithLimitations: blockingIssues.length === 0 || blockingIssues.every((item) => item.canContinueWithLimitations)
    };
  }

  private evaluateMotion(signal: FrameSignal, timestampMs: number): CaptureGuidanceIssue | null {
    if (!this.previousSignal || this.previousTimestampMs === null) {
      this.previousSignal = signal;
      this.previousTimestampMs = timestampMs;
      return null;
    }
    const elapsedSeconds = Math.max((timestampMs - this.previousTimestampMs) / 1000, 0.001);
    const centerMotion = Math.hypot(signal.centerX - this.previousSignal.centerX, signal.centerY - this.previousSignal.centerY) / elapsedSeconds;
    const yawMotion =
      signal.yaw !== null && this.previousSignal.yaw !== null ? Math.abs(signal.yaw - this.previousSignal.yaw) / elapsedSeconds : 0;
    this.previousSignal = signal;
    this.previousTimestampMs = timestampMs;
    if (centerMotion > this.thresholds.maxCenterMotionPerSecond || yawMotion > this.thresholds.maxYawMotionPerSecond) {
      return issue("excessiveMotion", "blocking", "Hold still for a moment before capturing this angle.", true);
    }
    return null;
  }
}

export function createCaptureGuidanceSession(thresholds = defaultCaptureGuidanceThresholds) {
  return new CaptureGuidanceSession(thresholds);
}

export function evaluateCaptureGuidanceFrame(
  input: CaptureGuidanceInput,
  thresholds: CaptureGuidanceThresholds = defaultCaptureGuidanceThresholds
): CaptureGuidanceReport {
  const blockingIssues: CaptureGuidanceIssue[] = [];
  const advisoryWarnings: CaptureGuidanceIssue[] = [];
  const readyMessages: CaptureGuidanceIssue[] = [];
  const faceReport = input.faceLandmarkReport;
  const face = faceReport.faces[0];
  const visibleFaceBox = face ? projectFaceBoxToVisiblePreview(face.boundingBox, input.visiblePreviewGeometry).boundingBox : null;
  let requiredRegionCoverage: number | null = null;

  if (faceReport.availabilityState !== "available") {
    const message = input.requireOperationalLandmarks
      ? "Face tracking couldn't start. Your camera is working, but GameFace Match couldn't initialize the face-tracking system required for this scan."
      : "Local landmarks are unavailable. Continue only if the manual pose checks look correct.";
    if (input.requireOperationalLandmarks) {
      blockingIssues.push(issue("landmarksUnavailable", "blocking", message, false));
    } else {
      advisoryWarnings.push(issue("landmarksUnavailable", "advisory", message, true));
    }
  } else if (faceReport.faceCount === "zero") {
    blockingIssues.push(issue("faceNotFound", "blocking", "Face not found. Center one face in the frame or use upload fallback.", false));
  } else if (faceReport.faceCount === "multiple") {
    blockingIssues.push(issue("multipleFaces", "blocking", "Multiple faces detected. Capture one person only.", false));
  }

  if (face) {
    const boxForGate = visibleFaceBox ?? face.boundingBox;
    const visibleCenter = faceBoxCenter(boxForGate);
    const size = Math.max(boxForGate.width, boxForGate.height);
    const centerX = visibleCenter.x;
    const centerY = visibleCenter.y;
    if (size > thresholds.faceMaxBoxSize) {
      blockingIssues.push(issue("faceTooClose", "blocking", "Face is too close. Move the camera slightly farther away.", true));
    }
    if (size < thresholds.faceMinBoxSize) {
      blockingIssues.push(issue("faceTooFar", "blocking", "Face is too far away. Move slightly closer.", true));
    }
    if (Math.abs(centerX - 0.5) > thresholds.centerToleranceX || Math.abs(centerY - 0.5) > thresholds.centerToleranceY) {
      blockingIssues.push(issue("faceOffCenter", "blocking", "Face is off-center. Re-center your face in the preview.", true));
    }

    const yaw = face.approximateHeadPose.yawDegrees;
    const range = thresholds.headYawRanges[input.angleID];
    if (yaw === null || face.approximateHeadPose.availabilityState !== "available") {
      advisoryWarnings.push(issue("incorrectHeadDirection", "advisory", `Confirm the requested pose manually: ${range.label}.`, true));
    } else if (yaw < range.min || yaw > range.max) {
      blockingIssues.push(issue("incorrectHeadDirection", "blocking", `Incorrect head direction. Please ${range.label}.`, true));
    }

    const expression = face.expression;
    const leftBlink = expression.leftEyeOpenness !== null && expression.leftEyeOpenness < thresholds.blinkEyeOpenness;
    const rightBlink = expression.rightEyeOpenness !== null && expression.rightEyeOpenness < thresholds.blinkEyeOpenness;
    if (leftBlink || rightBlink) {
      advisoryWarnings.push(issue("blink", "advisory", "Blink detected or eyes appear closed. Retake if that was not intentional.", true));
    }
    if (expression.mouthOpenness !== null && expression.mouthOpenness > thresholds.mouthOpenRatio) {
      advisoryWarnings.push(issue("mouthOpen", "advisory", "Mouth appears open. Retake if you want a neutral closed-mouth reference.", true));
    }
    if (expression.strongExpressionLikelihood !== null && expression.strongExpressionLikelihood > thresholds.strongExpressionLikelihood) {
      advisoryWarnings.push(issue("strongExpression", "advisory", "Strong smile or expression detected. Retake for a more neutral reference if practical.", true));
    }

    const requiredRegions = thresholds.requiredCoreLandmarks[input.angleID];
    if (face.coreLandmarks.length === 0) {
      advisoryWarnings.push(
        issue("missingRequiredRegion", "advisory", "Required facial-region visibility could not be confirmed from local landmarks.", true)
      );
    } else {
      const availableLabels = new Set(face.coreLandmarks.map((landmark) => landmark.label));
      const missingRegions = requiredRegions.filter((label) => !availableLabels.has(label));
      requiredRegionCoverage = (requiredRegions.length - missingRegions.length) / Math.max(requiredRegions.length, 1);
      if (requiredRegionCoverage < thresholds.minRequiredRegionCoverage) {
        blockingIssues.push(
          issue(
            "missingRequiredRegion",
            "blocking",
            `Required facial regions are missing or hidden: ${formatRegionList(missingRegions)}.`,
            true
          )
        );
        blockingIssues.push(issue("occlusionLikely", "blocking", "A key face region may be occluded. Clear hair, hands, or objects from the face.", true));
      } else if (missingRegions.length > 0) {
        advisoryWarnings.push(
          issue(
            "missingRequiredRegion",
            "advisory",
            `Some facial regions were not confidently visible: ${formatRegionList(missingRegions)}.`,
            true
          )
        );
        advisoryWarnings.push(issue("occlusionLikely", "advisory", "Possible minor occlusion detected. Retake if the face is covered.", true));
      }
    }
  }

  const brightness = input.imageQualityReport?.brightnessEstimate.value;
  const highlightClipping = input.imageQualityReport?.highlightClippingEstimate?.value;
  const shadowClipping = input.imageQualityReport?.shadowClippingEstimate?.value;
  const lightingImbalance = input.imageQualityReport?.lightingImbalanceEstimate?.value;
  const sharpness = input.imageQualityReport?.sharpnessEstimate.value;
  const landmarksAvailable = faceReport.availabilityState === "available";
  if (
    (brightness !== undefined && brightness !== null && brightness < thresholds.poorBrightnessLow) ||
    (shadowClipping !== undefined && shadowClipping !== null && shadowClipping > thresholds.maxShadowClipping)
  ) {
    const message = "Image appears underexposed. Add soft front lighting and avoid backlighting.";
    if (landmarksAvailable) {
      blockingIssues.push(issue("underexposed", "blocking", message, true));
    } else {
      advisoryWarnings.push(issue("underexposed", "advisory", message, true));
    }
  }
  if (
    (brightness !== undefined && brightness !== null && brightness > thresholds.poorBrightnessHigh) ||
    (highlightClipping !== undefined && highlightClipping !== null && highlightClipping > thresholds.maxHighlightClipping)
  ) {
    const message = "Image appears overexposed. Move away from direct light or bright windows.";
    if (landmarksAvailable) {
      blockingIssues.push(issue("overexposed", "blocking", message, true));
    } else {
      advisoryWarnings.push(issue("overexposed", "advisory", message, true));
    }
  }
  if (lightingImbalance !== undefined && lightingImbalance !== null && lightingImbalance > thresholds.maxLightingImbalance) {
    const message = "Lighting is uneven across the frame. Use softer front lighting and avoid strong side light.";
    if (lightingImbalance > thresholds.severeLightingImbalance && landmarksAvailable) {
      blockingIssues.push(issue("lightingImbalance", "blocking", message, true));
    } else {
      advisoryWarnings.push(issue("lightingImbalance", "advisory", message, true));
    }
  }
  if (sharpness !== undefined && sharpness !== null && sharpness < thresholds.severeBlurSharpness) {
    const message = "Severe blur detected. Hold still or retake this angle.";
    if (landmarksAvailable) {
      blockingIssues.push(issue("severeBlur", "blocking", message, true));
    } else {
      advisoryWarnings.push(issue("severeBlur", "advisory", message, true));
    }
  }

  const requiredPoseReached = faceReport.faceCount === "one" && blockingIssues.length === 0;
  if (requiredPoseReached) {
    readyMessages.push(issue("poseReached", "ready", "Required pose reached.", true));
  }
  const realtimeQuality = createRealtimeCaptureQualityReport({
    input,
    thresholds,
    blockingIssues,
    advisoryWarnings,
    requiredPoseReached,
    requiredRegionCoverage
  });

  return {
    protocolVersion: CAPTURE_GUIDANCE_PROTOCOL_VERSION,
    thresholdVersion: CAPTURE_GUIDANCE_THRESHOLD_VERSION,
    angleID: input.angleID,
    realtimeQuality,
    requiredPoseReached,
    poseHeldLongEnough: false,
    holdDurationMs: 0,
    holdTargetMs: input.useExtendedHold ? thresholds.extendedHoldTargetMs : thresholds.holdTargetMs,
    canCapture: false,
    canContinueWithLimitations: blockingIssues.length === 0 || blockingIssues.every((item) => item.canContinueWithLimitations),
    blockingIssues,
    advisoryWarnings,
    readyMessages,
    createdAt: new Date(input.timestampMs).toISOString()
  };
}

function getFrameSignal(report: FaceLandmarkReport, visiblePreviewGeometry?: VisiblePreviewGeometry | null): FrameSignal | null {
  const face = report.faces[0];
  if (!face) return null;
  const visibleBox = projectFaceBoxToVisiblePreview(face.boundingBox, visiblePreviewGeometry).boundingBox;
  const center = faceBoxCenter(visibleBox);
  return {
    centerX: center.x,
    centerY: center.y,
    yaw: face.approximateHeadPose.yawDegrees
  };
}

function createRealtimeCaptureQualityReport({
  input,
  thresholds,
  blockingIssues,
  advisoryWarnings,
  requiredPoseReached,
  requiredRegionCoverage
}: {
  input: CaptureGuidanceInput;
  thresholds: CaptureGuidanceThresholds;
  blockingIssues: CaptureGuidanceIssue[];
  advisoryWarnings: CaptureGuidanceIssue[];
  requiredPoseReached: boolean;
  requiredRegionCoverage: number | null;
}): RealtimeCaptureQualityReport {
  const faceReport = input.faceLandmarkReport;
  const face = faceReport.faces[0];
  const visibleFaceBox = face ? projectFaceBoxToVisiblePreview(face.boundingBox, input.visiblePreviewGeometry).boundingBox : null;
  const visibleCenter = visibleFaceBox ? faceBoxCenter(visibleFaceBox) : null;
  const size = visibleFaceBox ? Math.max(visibleFaceBox.width, visibleFaceBox.height) : null;
  const centerX = visibleCenter?.x ?? null;
  const centerY = visibleCenter?.y ?? null;
  const brightness = input.imageQualityReport?.brightnessEstimate.value ?? null;
  const highlightClipping = input.imageQualityReport?.highlightClippingEstimate?.value ?? null;
  const shadowClipping = input.imageQualityReport?.shadowClippingEstimate?.value ?? null;
  const lightingImbalance = input.imageQualityReport?.lightingImbalanceEstimate?.value ?? null;
  const sharpness = input.imageQualityReport?.sharpnessEstimate.value ?? null;
  const expressionIssues = advisoryWarnings.some((item) => item.code === "blink" || item.code === "mouthOpen" || item.code === "strongExpression");
  const requiredRegionIssue = [...blockingIssues, ...advisoryWarnings].find((item) => item.code === "missingRequiredRegion");
  const occlusionIssue = [...blockingIssues, ...advisoryWarnings].find((item) => item.code === "occlusionLikely");
  const faceSizeIssue = blockingIssues.find((item) => item.code === "faceTooClose" || item.code === "faceTooFar");
  const centeringIssue = blockingIssues.find((item) => item.code === "faceOffCenter");
  const poseIssue = blockingIssues.find((item) => item.code === "incorrectHeadDirection");
  const exposureIssue = [...blockingIssues, ...advisoryWarnings].find((item) => item.code === "underexposed" || item.code === "overexposed");
  const lightingIssue = [...blockingIssues, ...advisoryWarnings].find((item) => item.code === "lightingImbalance");
  const blurIssue = [...blockingIssues, ...advisoryWarnings].find((item) => item.code === "severeBlur");
  const signals: RealtimeCaptureQualitySignal[] = [
    signal({
      id: "faceFound",
      label: "Face found",
      score: faceReport.faceCount === "one" || faceReport.faceCount === "multiple" ? 1 : 0,
      state: stateForIssues(blockingIssues, advisoryWarnings, ["faceNotFound", "landmarksUnavailable"], faceReport.availabilityState === "available"),
      message: faceReport.faceCount === "zero" ? "No face found." : faceReport.availabilityState === "available" ? "Face detection is available." : "Face detection unavailable.",
      evidence: faceReport.availabilityState === "available" ? "estimated" : "notYetImplemented"
    }),
    signal({
      id: "singleFace",
      label: "One face",
      score: faceReport.faceCount === "one" ? 1 : 0,
      state: stateForIssues(blockingIssues, advisoryWarnings, ["multipleFaces", "landmarksUnavailable"], faceReport.availabilityState === "available"),
      message: faceReport.faceCount === "multiple" ? "Multiple faces detected." : "One-face check is clear.",
      evidence: faceReport.availabilityState === "available" ? "estimated" : "notYetImplemented"
    }),
    signal({
      id: "faceSize",
      label: "Face size",
      score: size === null ? null : scoreWithinRange(size, thresholds.faceMinBoxSize, thresholds.faceMaxBoxSize),
      state: faceSizeIssue ? "blocking" : size === null ? "unavailable" : "pass",
      message: faceSizeIssue?.message ?? "Face size is within the current capture range.",
      evidence: size === null ? "notYetImplemented" : "estimated"
    }),
    signal({
      id: "centering",
      label: "Centering",
      score: centerX === null || centerY === null ? null : scoreCentering(centerX, centerY, thresholds),
      state: centeringIssue ? "blocking" : centerX === null || centerY === null ? "unavailable" : "pass",
      message: centeringIssue?.message ?? "Face is centered enough for this capture step.",
      evidence: centerX === null || centerY === null ? "notYetImplemented" : "estimated"
    }),
    signal({
      id: "pose",
      label: "Pose",
      score: face?.approximateHeadPose.availabilityState === "available" ? (requiredPoseReached || !poseIssue ? 1 : 0) : null,
      state: blockingIssues.some((item) => item.code === "landmarksUnavailable")
        ? "blocking"
        : poseIssue
          ? "blocking"
          : face?.approximateHeadPose.availabilityState === "available"
            ? "pass"
            : "advisory",
      message: poseIssue?.message ?? "Requested pose is within the configured range or needs manual confirmation.",
      evidence: face?.approximateHeadPose.availabilityState === "available" ? "estimated" : "userConfirmed"
    }),
    signal({
      id: "blur",
      label: "Blur",
      score: sharpness === null ? null : clamp01((sharpness - thresholds.severeBlurSharpness) / Math.max(thresholds.targetSharpness - thresholds.severeBlurSharpness, 1)),
      state: severityToSignalState(blurIssue?.severity, sharpness !== null),
      message: blurIssue?.message ?? "Sharpness is acceptable for real-time guidance.",
      evidence: sharpness === null ? "notYetImplemented" : "estimated"
    }),
    signal({
      id: "exposure",
      label: "Exposure",
      score: scoreExposure(brightness, highlightClipping, shadowClipping, thresholds),
      state: severityToSignalState(exposureIssue?.severity, brightness !== null),
      message: exposureIssue?.message ?? "Exposure is within the configured guidance range.",
      evidence: brightness === null ? "notYetImplemented" : "estimated"
    }),
    signal({
      id: "lightingUniformity",
      label: "Lighting uniformity",
      score: lightingImbalance === null ? null : clamp01(1 - lightingImbalance / Math.max(thresholds.severeLightingImbalance, 0.001)),
      state: severityToSignalState(lightingIssue?.severity, lightingImbalance !== null),
      message: lightingIssue?.message ?? "Lighting appears reasonably even across the frame.",
      evidence: lightingImbalance === null ? "notYetImplemented" : "estimated"
    }),
    signal({
      id: "occlusionFreedom",
      label: "Occlusion freedom",
      score: requiredRegionCoverage,
      state: severityToSignalState(occlusionIssue?.severity, requiredRegionCoverage !== null),
      message: occlusionIssue?.message ?? "Required visible regions are not showing likely occlusion.",
      evidence: requiredRegionCoverage === null ? "notYetImplemented" : "estimated"
    }),
    signal({
      id: "expressionNeutrality",
      label: "Expression neutrality",
      score: face?.expression.availabilityState === "available" ? (expressionIssues ? 0.55 : 1) : null,
      state: expressionIssues ? "advisory" : face?.expression.availabilityState === "available" ? "pass" : "unavailable",
      message: expressionIssues ? "Expression may not be neutral." : "Expression appears neutral enough for guidance.",
      evidence: face?.expression.availabilityState === "available" ? "estimated" : "userConfirmed"
    }),
    signal({
      id: "requiredRegions",
      label: "Required regions",
      score: requiredRegionCoverage,
      state: severityToSignalState(requiredRegionIssue?.severity, requiredRegionCoverage !== null),
      message: requiredRegionIssue?.message ?? "Required facial regions are visible enough for this pose.",
      evidence: requiredRegionCoverage === null ? "notYetImplemented" : "estimated"
    })
  ];
  const weighted = signals.reduce(
    (total, item) => {
      const weight = thresholds.qualityWeights[item.id];
      if (item.score === null) return total;
      return {
        score: total.score + item.score * weight,
        weight: total.weight + weight
      };
    },
    { score: 0, weight: 0 }
  );
  const score = weighted.weight > 0 ? Math.round((weighted.score / weighted.weight) * 100) : 0;
  const blockingSignalCount = signals.filter((item) => item.state === "blocking").length;
  const advisorySignalCount = signals.filter((item) => item.state === "advisory").length;
  return {
    score,
    state: blockingSignalCount > 0 ? "blocked" : advisorySignalCount > 0 ? "needsReview" : "ready",
    thresholdVersion: CAPTURE_GUIDANCE_THRESHOLD_VERSION,
    signals,
    blockingSignalCount,
    advisorySignalCount
  };
}

function signal(input: RealtimeCaptureQualitySignal): RealtimeCaptureQualitySignal {
  return input;
}

function stateForIssues(
  blockingIssues: CaptureGuidanceIssue[],
  advisoryWarnings: CaptureGuidanceIssue[],
  codes: CaptureGuidanceIssue["code"][],
  available: boolean
): RealtimeCaptureQualitySignalState {
  if (blockingIssues.some((item) => codes.includes(item.code))) return "blocking";
  if (advisoryWarnings.some((item) => codes.includes(item.code))) return "advisory";
  return available ? "pass" : "unavailable";
}

function severityToSignalState(severity: CaptureGuidanceIssue["severity"] | undefined, available: boolean): RealtimeCaptureQualitySignalState {
  if (severity === "blocking") return "blocking";
  if (severity === "advisory") return "advisory";
  return available ? "pass" : "unavailable";
}

function scoreWithinRange(value: number, min: number, max: number) {
  if (value >= min && value <= max) return 1;
  if (value < min) return clamp01(value / Math.max(min, 0.001));
  return clamp01(1 - (value - max) / Math.max(1 - max, 0.001));
}

function scoreCentering(centerX: number, centerY: number, thresholds: CaptureGuidanceThresholds) {
  const xScore = clamp01(1 - Math.abs(centerX - 0.5) / thresholds.centerToleranceX);
  const yScore = clamp01(1 - Math.abs(centerY - 0.5) / thresholds.centerToleranceY);
  return Math.min(xScore, yScore);
}

function scoreExposure(
  brightness: number | null,
  highlightClipping: number | null,
  shadowClipping: number | null,
  thresholds: CaptureGuidanceThresholds
) {
  if (brightness === null) return null;
  const brightnessScore =
    brightness < thresholds.poorBrightnessLow
      ? clamp01(brightness / Math.max(thresholds.poorBrightnessLow, 0.001))
      : brightness > thresholds.poorBrightnessHigh
        ? clamp01(1 - (brightness - thresholds.poorBrightnessHigh) / Math.max(1 - thresholds.poorBrightnessHigh, 0.001))
        : 1;
  const highlightScore = highlightClipping === null ? 1 : clamp01(1 - highlightClipping / Math.max(thresholds.maxHighlightClipping, 0.001));
  const shadowScore = shadowClipping === null ? 1 : clamp01(1 - shadowClipping / Math.max(thresholds.maxShadowClipping, 0.001));
  return Math.min(brightnessScore, highlightScore, shadowScore);
}

function formatRegionList(regions: string[]) {
  return regions.length > 0 ? regions.join(", ") : "unknown regions";
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function issue(
  code: CaptureGuidanceIssue["code"],
  severity: CaptureGuidanceIssue["severity"],
  message: string,
  canContinueWithLimitations: boolean
): CaptureGuidanceIssue {
  return {
    code,
    severity,
    message,
    canContinueWithLimitations
  };
}
