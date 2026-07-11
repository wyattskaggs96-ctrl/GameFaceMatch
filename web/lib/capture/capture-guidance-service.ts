import type {
  CapturedAngleID,
  CaptureGuidanceIssue,
  CaptureGuidanceReport,
  FaceLandmarkReport,
  ImageQualityReport
} from "@/types/domain";

export const CAPTURE_GUIDANCE_PROTOCOL_VERSION = "web-rgb-guidance-1.0.0";
export const CAPTURE_GUIDANCE_THRESHOLD_VERSION = "web-rgb-thresholds-2026-07-11";

export interface CaptureGuidanceThresholds {
  faceMinBoxSize: number;
  faceMaxBoxSize: number;
  centerToleranceX: number;
  centerToleranceY: number;
  blinkEyeOpenness: number;
  mouthOpenRatio: number;
  strongExpressionLikelihood: number;
  severeBlurSharpness: number;
  poorBrightnessLow: number;
  poorBrightnessHigh: number;
  maxCenterMotionPerSecond: number;
  maxYawMotionPerSecond: number;
  holdTargetMs: number;
  extendedHoldTargetMs: number;
  headYawRanges: Record<CapturedAngleID, { min: number; max: number; label: string }>;
}

export interface CaptureGuidanceInput {
  angleID: CapturedAngleID;
  faceLandmarkReport: FaceLandmarkReport;
  imageQualityReport?: Pick<ImageQualityReport, "brightnessEstimate" | "sharpnessEstimate">;
  timestampMs: number;
  useExtendedHold?: boolean;
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
  poorBrightnessLow: 0.16,
  poorBrightnessHigh: 0.9,
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
  }
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
    const signal = getFrameSignal(input.faceLandmarkReport);
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

  if (faceReport.availabilityState !== "available") {
    advisoryWarnings.push(issue("landmarksUnavailable", "advisory", "Local landmarks are unavailable. Continue only if the manual pose checks look correct.", true));
  } else if (faceReport.faceCount === "zero") {
    blockingIssues.push(issue("faceNotFound", "blocking", "Face not found. Center one face in the frame or use upload fallback.", false));
  } else if (faceReport.faceCount === "multiple") {
    blockingIssues.push(issue("multipleFaces", "blocking", "Multiple faces detected. Capture one person only.", false));
  }

  if (face) {
    const size = Math.max(face.boundingBox.width, face.boundingBox.height);
    const centerX = face.boundingBox.x + face.boundingBox.width / 2;
    const centerY = face.boundingBox.y + face.boundingBox.height / 2;
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
  }

  const brightness = input.imageQualityReport?.brightnessEstimate.value;
  const sharpness = input.imageQualityReport?.sharpnessEstimate.value;
  const landmarksAvailable = faceReport.availabilityState === "available";
  if (brightness !== undefined && brightness !== null && (brightness < thresholds.poorBrightnessLow || brightness > thresholds.poorBrightnessHigh)) {
    const message = "Lighting is poor. Use even front lighting and avoid backlighting.";
    if (landmarksAvailable) {
      blockingIssues.push(issue("poorLighting", "blocking", message, true));
    } else {
      advisoryWarnings.push(issue("poorLighting", "advisory", message, true));
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

  return {
    protocolVersion: CAPTURE_GUIDANCE_PROTOCOL_VERSION,
    thresholdVersion: CAPTURE_GUIDANCE_THRESHOLD_VERSION,
    angleID: input.angleID,
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

function getFrameSignal(report: FaceLandmarkReport): FrameSignal | null {
  const face = report.faces[0];
  if (!face) return null;
  return {
    centerX: face.boundingBox.x + face.boundingBox.width / 2,
    centerY: face.boundingBox.y + face.boundingBox.height / 2,
    yaw: face.approximateHeadPose.yawDegrees
  };
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
