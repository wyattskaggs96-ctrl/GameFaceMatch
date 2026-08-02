import { defaultCaptureGuidanceThresholds, type CaptureGuidanceThresholds } from "@/lib/capture/capture-guidance-service";
import type {
  FaceBoundingBox,
  FaceDetectionCount,
  FaceLandmarkConfidence,
  FaceLandmarkReport,
  ImageQualityReport,
  QualityEvidenceKind
} from "@/types/domain";
import type { GuidedScanCoverageFrame, GuidedScanCoverageSegmentID, GuidedScanPassID } from "./guided-scan-strategy";

export type GuidedLiveSignalState = "pass" | "advisory" | "blocking" | "unavailable";
export type GuidedLiveFrameDecisionStatus = "accepted" | "rejected" | "pendingStability";

export interface GuidedLiveFrameSignal<T> {
  value: T;
  state: GuidedLiveSignalState;
  evidence: QualityEvidenceKind;
  message: string;
}

export interface GuidedLiveAcceptedFrame {
  timestampMs: number;
  assignedSegmentID: GuidedScanCoverageSegmentID;
  passID: GuidedScanPassID;
  yawDegrees: number;
  pitchDegrees: number | null;
  rollDegrees: number | null;
}

export interface GuidedLiveFrameDecision {
  timestampMs: number;
  passID: GuidedScanPassID;
  faceCount: FaceDetectionCount;
  faceConfidence: GuidedLiveFrameSignal<number | null>;
  faceBoundingBox: FaceBoundingBox | null;
  centering: GuidedLiveFrameSignal<number | null>;
  relativeFaceSize: GuidedLiveFrameSignal<number | null>;
  yawDegrees: GuidedLiveFrameSignal<number | null>;
  pitchDegrees: GuidedLiveFrameSignal<number | null>;
  rollDegrees: GuidedLiveFrameSignal<number | null>;
  sharpness: GuidedLiveFrameSignal<number | null>;
  exposure: GuidedLiveFrameSignal<number | null>;
  lightingUniformity: GuidedLiveFrameSignal<number | null>;
  landmarkConfidence: GuidedLiveFrameSignal<number | null>;
  expressionNeutrality: GuidedLiveFrameSignal<"pass" | "advisory" | "unavailable">;
  occlusion: GuidedLiveFrameSignal<"pass" | "advisory" | "unavailable">;
  assignedSegmentID: GuidedScanCoverageSegmentID | null;
  duplicateAngle: boolean;
  status: GuidedLiveFrameDecisionStatus;
  accepted: boolean;
  rejectionReasons: string[];
}

export interface GuidedLiveCoverageAccumulatorState {
  pendingSegmentID: GuidedScanCoverageSegmentID | null;
  pendingPassID: GuidedScanPassID | null;
  firstSeenAtMs: number | null;
  agreeingSampleCount: number;
  lastDecision: GuidedLiveFrameDecision | null;
}

export interface GuidedLiveCoverageUpdate {
  accumulator: GuidedLiveCoverageAccumulatorState;
  decision: GuidedLiveFrameDecision;
  acceptedFrame: GuidedLiveAcceptedFrame | null;
  coverageFrame: GuidedScanCoverageFrame | null;
}

export interface GuidedLiveCoverageOptions {
  minAgreeingSamples: number;
  minDwellMs: number;
  duplicateYawToleranceDegrees: number;
  duplicatePitchToleranceDegrees: number;
  minFaceConfidence: number;
  thresholds: CaptureGuidanceThresholds;
}

export const defaultGuidedLiveCoverageOptions: GuidedLiveCoverageOptions = {
  minAgreeingSamples: 2,
  minDwellMs: 650,
  duplicateYawToleranceDegrees: 9,
  duplicatePitchToleranceDegrees: 12,
  minFaceConfidence: 0.35,
  thresholds: defaultCaptureGuidanceThresholds
};

export function createInitialGuidedLiveCoverageAccumulatorState(): GuidedLiveCoverageAccumulatorState {
  return {
    pendingSegmentID: null,
    pendingPassID: null,
    firstSeenAtMs: null,
    agreeingSampleCount: 0,
    lastDecision: null
  };
}

export function evaluateGuidedLiveFrameDecision(input: {
  passID: GuidedScanPassID;
  timestampMs: number;
  faceLandmarkReport: FaceLandmarkReport;
  imageQualityReport?: Pick<
    ImageQualityReport,
    "brightnessEstimate" | "highlightClippingEstimate" | "shadowClippingEstimate" | "sharpnessEstimate" | "lightingImbalanceEstimate"
  >;
  acceptedFrames: GuidedLiveAcceptedFrame[];
  options?: Partial<GuidedLiveCoverageOptions>;
}): GuidedLiveFrameDecision {
  const options = { ...defaultGuidedLiveCoverageOptions, ...input.options };
  const face = input.faceLandmarkReport.faces[0] ?? null;
  const pose = face?.approximateHeadPose ?? null;
  const bbox = face?.boundingBox ?? null;
  const yaw = pose?.yawDegrees ?? null;
  const pitch = pose?.pitchDegrees ?? null;
  const roll = pose?.rollDegrees ?? null;
  const assignedSegmentID = assignCoverageSegment(yaw, pitch);
  const duplicateAngle = assignedSegmentID
    ? input.acceptedFrames.some(
        (frame) =>
          frame.passID === input.passID &&
          frame.assignedSegmentID === assignedSegmentID &&
          yaw !== null &&
          Math.abs(frame.yawDegrees - yaw) <= options.duplicateYawToleranceDegrees &&
          (pitch === null ||
            frame.pitchDegrees === null ||
            Math.abs(frame.pitchDegrees - pitch) <= options.duplicatePitchToleranceDegrees)
      )
    : false;
  const faceSize = bbox ? Math.max(bbox.width, bbox.height) : null;
  const centerDistance = bbox ? Math.hypot(bbox.x + bbox.width / 2 - 0.5, bbox.y + bbox.height / 2 - 0.5) : null;
  const faceConfidenceScore = normalizeConfidence(face?.confidence ?? input.faceLandmarkReport.confidence);
  const landmarkConfidenceScore = average(
    face?.coreLandmarks.map((landmark) => normalizeConfidence(landmark.confidence)).filter(isNumber) ?? []
  );
  const sharpness = input.imageQualityReport?.sharpnessEstimate.value ?? null;
  const brightness = input.imageQualityReport?.brightnessEstimate.value ?? null;
  const highlightClipping = input.imageQualityReport?.highlightClippingEstimate.value ?? null;
  const shadowClipping = input.imageQualityReport?.shadowClippingEstimate.value ?? null;
  const lightingImbalance = input.imageQualityReport?.lightingImbalanceEstimate.value ?? null;
  const expressionState = face?.expression.availabilityState === "available" ? expressionNeutralityState(face.expression.strongExpressionLikelihood) : "unavailable";
  const occlusionState = face && face.coreLandmarks.length > 0 ? "pass" : "unavailable";

  const rejectionReasons: string[] = [];
  if (input.faceLandmarkReport.availabilityState !== "available") rejectionReasons.push("Landmark provider unavailable.");
  if (input.faceLandmarkReport.faceCount === "zero") rejectionReasons.push("Face not found.");
  if (input.faceLandmarkReport.faceCount === "multiple") rejectionReasons.push("Only one person can be in the scan.");
  if (input.faceLandmarkReport.faceCount !== "one") rejectionReasons.push("Exactly one usable face is required.");
  if (faceConfidenceScore !== null && faceConfidenceScore < options.minFaceConfidence) rejectionReasons.push("Face confidence is too low.");
  if (!bbox) rejectionReasons.push("Face bounding box is unavailable.");
  if (faceSize !== null && faceSize < options.thresholds.faceMinBoxSize) rejectionReasons.push("Move closer.");
  if (faceSize !== null && faceSize > options.thresholds.faceMaxBoxSize) rejectionReasons.push("Move farther away.");
  if (
    bbox &&
    (Math.abs(bbox.x + bbox.width / 2 - 0.5) > options.thresholds.centerToleranceX ||
      Math.abs(bbox.y + bbox.height / 2 - 0.5) > options.thresholds.centerToleranceY)
  ) {
    rejectionReasons.push("Center your face.");
  }
  if (yaw === null || pose?.availabilityState !== "available") rejectionReasons.push("Head direction is unavailable.");
  if (!assignedSegmentID) rejectionReasons.push("Pose does not belong to a guided coverage region.");
  if (sharpness !== null && sharpness < options.thresholds.severeBlurSharpness) rejectionReasons.push("Hold still.");
  if (
    (brightness !== null && brightness < options.thresholds.poorBrightnessLow) ||
    (shadowClipping !== null && shadowClipping > options.thresholds.maxShadowClipping)
  ) {
    rejectionReasons.push("More light needed.");
  }
  if (
    (brightness !== null && brightness > options.thresholds.poorBrightnessHigh) ||
    (highlightClipping !== null && highlightClipping > options.thresholds.maxHighlightClipping)
  ) {
    rejectionReasons.push("Reduce direct light.");
  }
  if (lightingImbalance !== null && lightingImbalance > options.thresholds.severeLightingImbalance) {
    rejectionReasons.push("Use more even lighting.");
  }
  if (landmarkConfidenceScore !== null && landmarkConfidenceScore < options.minFaceConfidence) rejectionReasons.push("Landmark confidence is too low.");
  if (duplicateAngle) rejectionReasons.push("Duplicate angle ignored.");

  const accepted = rejectionReasons.length === 0;
  return {
    timestampMs: input.timestampMs,
    passID: input.passID,
    faceCount: input.faceLandmarkReport.faceCount,
    faceConfidence: signal(faceConfidenceScore, faceConfidenceScore === null ? "unavailable" : faceConfidenceScore >= options.minFaceConfidence ? "pass" : "blocking", faceConfidenceScore === null ? "notYetImplemented" : "estimated", faceConfidenceScore === null ? "Face confidence unavailable." : "Face confidence estimated locally."),
    faceBoundingBox: bbox,
    centering: signal(centerDistance, centerDistance === null ? "unavailable" : rejectionReasons.includes("Center your face.") ? "blocking" : "pass", centerDistance === null ? "notYetImplemented" : "estimated", rejectionReasons.includes("Center your face.") ? "Center your face." : "Face is centered enough."),
    relativeFaceSize: signal(faceSize, faceSize === null ? "unavailable" : rejectionReasons.includes("Move closer.") || rejectionReasons.includes("Move farther away.") ? "blocking" : "pass", faceSize === null ? "notYetImplemented" : "estimated", faceSize === null ? "Face size unavailable." : "Face size is within range."),
    yawDegrees: signal(yaw, yaw === null ? "unavailable" : "pass", yaw === null ? "notYetImplemented" : "estimated", yaw === null ? "Yaw unavailable." : "Yaw estimated locally."),
    pitchDegrees: signal(pitch, pitch === null ? "unavailable" : "pass", pitch === null ? "notYetImplemented" : "estimated", pitch === null ? "Pitch unavailable." : "Pitch estimated locally."),
    rollDegrees: signal(roll, roll === null ? "unavailable" : "pass", roll === null ? "notYetImplemented" : "estimated", roll === null ? "Roll unavailable." : "Roll estimated locally."),
    sharpness: signal(sharpness, sharpness === null ? "unavailable" : rejectionReasons.includes("Hold still.") ? "blocking" : "pass", sharpness === null ? "notYetImplemented" : "estimated", rejectionReasons.includes("Hold still.") ? "Hold still." : "Sharpness is acceptable."),
    exposure: signal(brightness, brightness === null ? "unavailable" : rejectionReasons.includes("More light needed.") || rejectionReasons.includes("Reduce direct light.") ? "blocking" : "pass", brightness === null ? "notYetImplemented" : "estimated", "Exposure estimated from the live preview."),
    lightingUniformity: signal(lightingImbalance, lightingImbalance === null ? "unavailable" : rejectionReasons.includes("Use more even lighting.") ? "blocking" : "pass", lightingImbalance === null ? "notYetImplemented" : "estimated", "Lighting uniformity estimated locally."),
    landmarkConfidence: signal(landmarkConfidenceScore, landmarkConfidenceScore === null ? "unavailable" : landmarkConfidenceScore >= options.minFaceConfidence ? "pass" : "blocking", landmarkConfidenceScore === null ? "notYetImplemented" : "estimated", landmarkConfidenceScore === null ? "Landmark confidence unavailable." : "Landmark confidence estimated locally."),
    expressionNeutrality: signal(expressionState, expressionState === "advisory" ? "advisory" : expressionState === "unavailable" ? "unavailable" : "pass", expressionState === "unavailable" ? "notYetImplemented" : "estimated", expressionState === "advisory" ? "Relax your expression." : "Expression check is advisory only."),
    occlusion: signal(occlusionState, occlusionState === "unavailable" ? "unavailable" : "pass", occlusionState === "unavailable" ? "notYetImplemented" : "estimated", occlusionState === "unavailable" ? "Occlusion detail unavailable." : "Required landmarks are visible."),
    assignedSegmentID,
    duplicateAngle,
    status: accepted ? "pendingStability" : "rejected",
    accepted,
    rejectionReasons: unique(rejectionReasons)
  };
}

export function updateGuidedLiveCoverageAccumulator(
  accumulator: GuidedLiveCoverageAccumulatorState,
  decision: GuidedLiveFrameDecision,
  options: Partial<GuidedLiveCoverageOptions> = {}
): GuidedLiveCoverageUpdate {
  const merged = { ...defaultGuidedLiveCoverageOptions, ...options };
  if (!decision.accepted || !decision.assignedSegmentID) {
    return {
      accumulator: {
        ...createInitialGuidedLiveCoverageAccumulatorState(),
        lastDecision: decision
      },
      decision,
      acceptedFrame: null,
      coverageFrame: rejectedCoverageFrame(decision)
    };
  }
  const samePending = accumulator.pendingSegmentID === decision.assignedSegmentID && accumulator.pendingPassID === decision.passID;
  const firstSeenAtMs = samePending ? (accumulator.firstSeenAtMs ?? decision.timestampMs) : decision.timestampMs;
  const agreeingSampleCount = samePending ? accumulator.agreeingSampleCount + 1 : 1;
  const stable = agreeingSampleCount >= merged.minAgreeingSamples && decision.timestampMs - firstSeenAtMs >= merged.minDwellMs;
  const nextDecision: GuidedLiveFrameDecision = stable ? { ...decision, status: "accepted" } : decision;
  const acceptedFrame = stable
    ? {
        timestampMs: decision.timestampMs,
        assignedSegmentID: decision.assignedSegmentID,
        passID: decision.passID,
        yawDegrees: decision.yawDegrees.value ?? 0,
        pitchDegrees: decision.pitchDegrees.value,
        rollDegrees: decision.rollDegrees.value
      }
    : null;
  return {
    accumulator: stable
      ? { ...createInitialGuidedLiveCoverageAccumulatorState(), lastDecision: nextDecision }
      : {
          pendingSegmentID: decision.assignedSegmentID,
          pendingPassID: decision.passID,
          firstSeenAtMs,
          agreeingSampleCount,
          lastDecision: nextDecision
        },
    decision: nextDecision,
    acceptedFrame,
    coverageFrame: stable
      ? {
          passID: decision.passID,
          segmentID: decision.assignedSegmentID,
          timestampMs: decision.timestampMs,
          qualityAccepted: true,
          duplicateAngle: false,
          warnings: []
        }
      : null
  };
}

export function guidedSegmentToCaptureAngle(segmentID: GuidedScanCoverageSegmentID) {
  const mapping: Record<GuidedScanCoverageSegmentID, "straightOn" | "left45" | "right45" | "leftProfile" | "rightProfile"> = {
    center: "straightOn",
    upperLeft: "left45",
    left: "leftProfile",
    lowerLeft: "left45",
    lowerCenter: "straightOn",
    lowerRight: "right45",
    right: "rightProfile",
    upperRight: "right45"
  };
  return mapping[segmentID];
}

function rejectedCoverageFrame(decision: GuidedLiveFrameDecision): GuidedScanCoverageFrame | null {
  if (!decision.assignedSegmentID) return null;
  return {
    passID: decision.passID,
    segmentID: decision.assignedSegmentID,
    timestampMs: decision.timestampMs,
    qualityAccepted: false,
    duplicateAngle: decision.duplicateAngle,
    warnings: decision.rejectionReasons
  };
}

function assignCoverageSegment(yaw: number | null, pitch: number | null): GuidedScanCoverageSegmentID | null {
  if (yaw === null) return null;
  if (yaw <= -62) return "left";
  if (yaw >= 62) return "right";
  if (yaw < -18) {
    if (pitch !== null && pitch <= -9) return "upperLeft";
    if (pitch !== null && pitch >= 9) return "lowerLeft";
    return "left";
  }
  if (yaw > 18) {
    if (pitch !== null && pitch <= -9) return "upperRight";
    if (pitch !== null && pitch >= 9) return "lowerRight";
    return "right";
  }
  if (pitch !== null && pitch >= 10) return "lowerCenter";
  return "center";
}

function expressionNeutralityState(strongExpressionLikelihood: number | null): "pass" | "advisory" | "unavailable" {
  if (strongExpressionLikelihood === null) return "unavailable";
  return strongExpressionLikelihood > defaultCaptureGuidanceThresholds.strongExpressionLikelihood ? "advisory" : "pass";
}

function normalizeConfidence(confidence?: FaceLandmarkConfidence): number | null {
  if (!confidence) return null;
  if (confidence.score !== null) return confidence.score;
  if (confidence.label === "high") return 0.9;
  if (confidence.label === "medium") return 0.68;
  if (confidence.label === "low") return 0.34;
  return null;
}

function signal<T>(value: T, state: GuidedLiveSignalState, evidence: QualityEvidenceKind, message: string): GuidedLiveFrameSignal<T> {
  return { value, state, evidence, message };
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
