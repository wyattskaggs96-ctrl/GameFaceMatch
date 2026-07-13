import type { FaceBoundingBox, FaceHeadPoseEstimate, FaceLandmarkReport } from "@/types/domain";
import type { ScreenshotChecklistState, ScreenshotReference, ScreenshotViewID } from "./screenshot-refinement";
import type { calculateImageMeasurements } from "@/lib/capture/image-quality-service";

export type ScreenshotQualityAlignmentState = "ready" | "needsReview" | "blocked" | "unavailable";
export type ScreenshotAnalysisEvidence = "measured" | "estimated" | "userConfirmed" | "unavailable";

export interface ScreenshotRetakeInstruction {
  code:
    | "retakeFront"
    | "useSingleVisibleFace"
    | "moveCloser"
    | "moveAway"
    | "centerFace"
    | "reduceTilt"
    | "improveLighting"
    | "removeObstruction"
    | "useHigherResolution"
    | "manualReview";
  message: string;
}

export interface ScreenshotFaceDetectionSummary {
  state: ScreenshotQualityAlignmentState;
  faceCount: FaceLandmarkReport["faceCount"];
  detectedFaceCount: number | null;
  boundingBox: FaceBoundingBox | null;
  confidenceLabel: string;
  evidence: ScreenshotAnalysisEvidence;
  message: string;
}

export interface ScreenshotPoseSummary {
  state: ScreenshotQualityAlignmentState;
  estimate: FaceHeadPoseEstimate | null;
  expectedPose: "front" | "threeQuarter";
  evidence: ScreenshotAnalysisEvidence;
  message: string;
}

export interface ScreenshotLandmarkSummary {
  state: ScreenshotQualityAlignmentState;
  coreLandmarkCount: number;
  providerName: string | null;
  providerVersion: string | null;
  evidence: ScreenshotAnalysisEvidence;
  message: string;
}

export interface ScreenshotLightingSummary {
  state: ScreenshotQualityAlignmentState;
  brightness: number | null;
  highlightClipping: number | null;
  shadowClipping: number | null;
  lightingImbalance: number | null;
  sharpness: number | null;
  evidence: ScreenshotAnalysisEvidence;
  message: string;
}

export interface ScreenshotOcclusionSummary {
  state: ScreenshotQualityAlignmentState;
  evidence: ScreenshotAnalysisEvidence;
  missingCoreRegions: string[];
  message: string;
}

export interface ScreenshotAlignmentReport {
  state: ScreenshotQualityAlignmentState;
  standardCoordinateSystem: "gameface-screenshot-alignment-v1";
  target: {
    centerX: number;
    centerY: number;
    faceHeightRatio: number;
  };
  transform: {
    translateX: number;
    translateY: number;
    scale: number;
    rotationDegrees: number | null;
  } | null;
  evidence: ScreenshotAnalysisEvidence;
  message: string;
}

export interface ScreenshotQualityAlignmentReport {
  reportVersion: "screenshot-quality-alignment-v1";
  screenshotViewID: ScreenshotViewID;
  createdAt: string;
  resolutionCheck: {
    state: ScreenshotQualityAlignmentState;
    width: number;
    height: number;
    minimumDimension: number;
    message: string;
  };
  faceDetection: ScreenshotFaceDetectionSummary;
  poseEstimate: ScreenshotPoseSummary;
  landmarkEstimate: ScreenshotLandmarkSummary;
  occlusionCheck: ScreenshotOcclusionSummary;
  lightingWarning: ScreenshotLightingSummary;
  alignment: ScreenshotAlignmentReport;
  blockingMessages: string[];
  advisoryMessages: string[];
  retakeInstructions: ScreenshotRetakeInstruction[];
  overallState: ScreenshotQualityAlignmentState;
}

export interface ScreenshotQualityAlignmentInput {
  screenshot: ScreenshotReference;
  faceLandmarkReport?: FaceLandmarkReport | null;
  imageMeasurements?: ReturnType<typeof calculateImageMeasurements> | null;
  checklist?: ScreenshotChecklistState;
  createdAt?: string;
}

const minimumScreenshotDimension = 720;
const alignmentTarget = {
  centerX: 0.5,
  centerY: 0.42,
  faceHeightRatio: 0.48
} as const;
const requiredCoreRegions = ["nose tip", "left eye inner corner", "right eye inner corner", "left mouth corner", "right mouth corner", "chin"];

export function analyzeScreenshotQualityAndAlignment(input: ScreenshotQualityAlignmentInput): ScreenshotQualityAlignmentReport {
  const blockingMessages: string[] = [];
  const advisoryMessages: string[] = [];
  const retakeInstructions: ScreenshotRetakeInstruction[] = [];
  const resolutionCheck = summarizeResolution(input.screenshot);
  if (resolutionCheck.state === "blocked") {
    blockingMessages.push(resolutionCheck.message);
    retakeInstructions.push({ code: "useHigherResolution", message: "Use a screenshot at least 720 pixels wide and tall." });
  }

  const faceDetection = summarizeFaceDetection(input.faceLandmarkReport);
  if (faceDetection.state === "blocked") {
    blockingMessages.push(faceDetection.message);
    retakeInstructions.push({
      code: "useSingleVisibleFace",
      message: "Retake from the appearance menu with exactly one unobstructed character face visible."
    });
  } else if (faceDetection.state !== "ready") {
    advisoryMessages.push(faceDetection.message);
  }

  const face = input.faceLandmarkReport?.faceCount === "one" ? input.faceLandmarkReport.faces[0] : null;
  const poseEstimate = summarizePose(input.screenshot.viewID, face?.approximateHeadPose ?? null);
  if (poseEstimate.state === "blocked") {
    blockingMessages.push(poseEstimate.message);
    retakeInstructions.push({ code: "retakeFront", message: "Retake the front screenshot with the character facing the camera." });
  } else if (poseEstimate.state !== "ready") {
    advisoryMessages.push(poseEstimate.message);
  }

  const landmarkEstimate = summarizeLandmarks(input.faceLandmarkReport);
  if (landmarkEstimate.state === "blocked") {
    blockingMessages.push(landmarkEstimate.message);
    retakeInstructions.push({ code: "manualReview", message: "Retake or manually confirm the screenshot before relying on future refinement." });
  } else if (landmarkEstimate.state !== "ready") {
    advisoryMessages.push(landmarkEstimate.message);
  }

  const occlusionCheck = summarizeOcclusion(face, input.checklist);
  if (occlusionCheck.state === "blocked") {
    blockingMessages.push(occlusionCheck.message);
    retakeInstructions.push({ code: "removeObstruction", message: "Remove helmets, masks, sunglasses, or overlays and retake the screenshot." });
  } else if (occlusionCheck.state !== "ready") {
    advisoryMessages.push(occlusionCheck.message);
  }

  const lightingWarning = summarizeLighting(input.imageMeasurements, faceDetection.state === "ready");
  if (lightingWarning.state === "blocked") {
    blockingMessages.push(lightingWarning.message);
    retakeInstructions.push({ code: "improveLighting", message: "Retake with even menu lighting and avoid very dark or overexposed scenes." });
  } else if (lightingWarning.state !== "ready") {
    advisoryMessages.push(lightingWarning.message);
    retakeInstructions.push({ code: "improveLighting", message: "If the screenshot looks dark, blurry, or overexposed, retake with steadier menu lighting." });
  }

  const alignment = summarizeAlignment(face?.boundingBox ?? null, face?.approximateHeadPose ?? null);
  if (alignment.state === "needsReview") {
    advisoryMessages.push(alignment.message);
    retakeInstructions.push({ code: "centerFace", message: "Center the face in the screenshot and keep the head upright before retaking." });
  } else if (alignment.state === "unavailable") {
    advisoryMessages.push(alignment.message);
  }

  const dedupedBlocking = [...new Set(blockingMessages)];
  const dedupedAdvisory = [...new Set(advisoryMessages)];
  const overallState = dedupedBlocking.length > 0 ? "blocked" : dedupedAdvisory.length > 0 ? "needsReview" : "ready";
  return {
    reportVersion: "screenshot-quality-alignment-v1",
    screenshotViewID: input.screenshot.viewID,
    createdAt: input.createdAt ?? new Date().toISOString(),
    resolutionCheck,
    faceDetection,
    poseEstimate,
    landmarkEstimate,
    occlusionCheck,
    lightingWarning,
    alignment,
    blockingMessages: dedupedBlocking,
    advisoryMessages: dedupedAdvisory,
    retakeInstructions: uniqueInstructions(retakeInstructions),
    overallState
  };
}

function summarizeResolution(screenshot: ScreenshotReference): ScreenshotQualityAlignmentReport["resolutionCheck"] {
  const passes = screenshot.width >= minimumScreenshotDimension && screenshot.height >= minimumScreenshotDimension;
  return {
    state: passes ? "ready" : "blocked",
    width: screenshot.width,
    height: screenshot.height,
    minimumDimension: minimumScreenshotDimension,
    message: passes
      ? "Resolution is adequate for the current intake checks."
      : "Screenshot resolution is too low for refinement intake."
  };
}

function summarizeFaceDetection(report?: FaceLandmarkReport | null): ScreenshotFaceDetectionSummary {
  if (!report || report.availabilityState !== "available") {
    return {
      state: "unavailable",
      faceCount: report?.faceCount ?? "unavailable",
      detectedFaceCount: report?.detectedFaceCount ?? null,
      boundingBox: null,
      confidenceLabel: report?.confidence.label ?? "unavailable",
      evidence: "unavailable",
      message: report?.advisoryMessages[0] ?? "Local game-face detection is unavailable; continue only with manual screenshot confirmations."
    };
  }
  if (report.faceCount === "zero") {
    return {
      state: "blocked",
      faceCount: "zero",
      detectedFaceCount: 0,
      boundingBox: null,
      confidenceLabel: report.confidence.label,
      evidence: "estimated",
      message: "No face-like region was detected in the screenshot."
    };
  }
  if (report.faceCount === "multiple") {
    return {
      state: "blocked",
      faceCount: "multiple",
      detectedFaceCount: report.detectedFaceCount,
      boundingBox: null,
      confidenceLabel: report.confidence.label,
      evidence: "estimated",
      message: "Multiple face-like regions were detected in the screenshot."
    };
  }
  const face = report.faces[0];
  return {
    state: "ready",
    faceCount: "one",
    detectedFaceCount: report.detectedFaceCount,
    boundingBox: face?.boundingBox ?? null,
    confidenceLabel: face?.confidence.label ?? report.confidence.label,
    evidence: "estimated",
    message: "One face-like region was detected locally. This does not validate cross-domain matching accuracy."
  };
}

function summarizePose(viewID: ScreenshotViewID, pose: FaceHeadPoseEstimate | null): ScreenshotPoseSummary {
  const expectedPose = viewID === "front" ? "front" : "threeQuarter";
  if (!pose || pose.availabilityState !== "available" || pose.yawDegrees === null) {
    return {
      state: "unavailable",
      estimate: pose,
      expectedPose,
      evidence: "unavailable",
      message: "Head-pose estimate is unavailable; manually confirm the requested screenshot angle."
    };
  }
  const absoluteYaw = Math.abs(pose.yawDegrees);
  if (viewID === "front" && absoluteYaw > 25) {
    return {
      state: "blocked",
      estimate: pose,
      expectedPose,
      evidence: "estimated",
      message: `Front screenshot pose appears turned about ${round(absoluteYaw)} degrees; retake facing the camera.`
    };
  }
  if (viewID !== "front" && (absoluteYaw < 15 || absoluteYaw > 75)) {
    return {
      state: "needsReview",
      estimate: pose,
      expectedPose,
      evidence: "estimated",
      message: `Three-quarter screenshot pose estimate is about ${round(absoluteYaw)} degrees; confirm the intended 45-degree view.`
    };
  }
  return {
    state: "ready",
    estimate: pose,
    expectedPose,
    evidence: "estimated",
    message: "Pose estimate is within the expected intake range."
  };
}

function summarizeLandmarks(report?: FaceLandmarkReport | null): ScreenshotLandmarkSummary {
  if (!report || report.availabilityState !== "available" || report.faceCount !== "one") {
    return {
      state: "unavailable",
      coreLandmarkCount: 0,
      providerName: report?.provider.providerName ?? null,
      providerVersion: report?.provider.packageVersion ?? null,
      evidence: "unavailable",
      message: "Landmark estimate is unavailable; no fabricated landmarks are used."
    };
  }
  const count = report.faces[0]?.coreLandmarks.length ?? 0;
  return {
    state: count >= 8 ? "ready" : "blocked",
    coreLandmarkCount: count,
    providerName: report.provider.providerName,
    providerVersion: report.provider.packageVersion,
    evidence: "estimated",
    message: count >= 8 ? "Core landmark estimate is available for alignment scaffolding." : "Too few landmarks were estimated for alignment scaffolding."
  };
}

function summarizeOcclusion(face: FaceLandmarkReport["faces"][number] | null, checklist?: ScreenshotChecklistState): ScreenshotOcclusionSummary {
  const checklistBlocked = checklist
    ? (["noHelmet", "noMask", "noSunglasses", "faceVisible", "noObstructingOverlay"] as const).filter((key) => !checklist[key])
    : [];
  if (checklistBlocked.length > 0) {
    return {
      state: "blocked",
      evidence: "userConfirmed",
      missingCoreRegions: [],
      message: "Manual screenshot confirmations indicate possible face obstruction."
    };
  }
  if (!face) {
    return {
      state: "unavailable",
      evidence: "unavailable",
      missingCoreRegions: requiredCoreRegions,
      message: "Occlusion cannot be checked without a local face and landmark estimate."
    };
  }
  const available = new Set(face.coreLandmarks.map((landmark) => landmark.label));
  const missingCoreRegions = requiredCoreRegions.filter((region) => !available.has(region));
  return {
    state: missingCoreRegions.length >= 3 ? "blocked" : missingCoreRegions.length > 0 ? "needsReview" : "ready",
    evidence: "estimated",
    missingCoreRegions,
    message:
      missingCoreRegions.length === 0
        ? "Core face regions needed for future refinement appear visible."
        : `Some core face regions could not be estimated: ${missingCoreRegions.join(", ")}.`
  };
}

function summarizeLighting(measurements: ReturnType<typeof calculateImageMeasurements> | null | undefined, faceEvidenceAvailable: boolean): ScreenshotLightingSummary {
  if (!measurements) {
    return {
      state: "unavailable",
      brightness: null,
      highlightClipping: null,
      shadowClipping: null,
      lightingImbalance: null,
      sharpness: null,
      evidence: "unavailable",
      message: "Lighting estimate is unavailable."
    };
  }
  const severeLighting = measurements.brightness < 0.12 || measurements.brightness > 0.9 || measurements.shadowClipping > 0.45 || measurements.highlightClipping > 0.35;
  const weakLighting = measurements.brightness < 0.22 || measurements.brightness > 0.82 || measurements.shadowClipping > 0.22 || measurements.highlightClipping > 0.12 || measurements.lightingImbalance > 0.24;
  const blurry = measurements.sharpness < 10;
  const state = severeLighting || blurry ? (faceEvidenceAvailable ? "blocked" : "needsReview") : weakLighting ? "needsReview" : "ready";
  return {
    state,
    brightness: measurements.brightness,
    highlightClipping: measurements.highlightClipping,
    shadowClipping: measurements.shadowClipping,
    lightingImbalance: measurements.lightingImbalance,
    sharpness: measurements.sharpness,
    evidence: "estimated",
    message:
      state === "ready"
        ? "Lighting and sharpness estimates are acceptable for intake."
        : severeLighting
          ? faceEvidenceAvailable
            ? "Extreme lighting was estimated around the screenshot."
            : "Lighting may be extreme, but no face-region evidence is available; review manually."
          : blurry
            ? faceEvidenceAvailable
              ? "Severe blur was estimated in the screenshot."
              : "The whole screenshot may be soft, but no face-region evidence is available; review manually."
            : "Lighting may need review before future refinement."
  };
}

function summarizeAlignment(boundingBox: FaceBoundingBox | null, pose: FaceHeadPoseEstimate | null): ScreenshotAlignmentReport {
  if (!boundingBox || boundingBox.width <= 0 || boundingBox.height <= 0) {
    return {
      state: "unavailable",
      standardCoordinateSystem: "gameface-screenshot-alignment-v1",
      target: alignmentTarget,
      transform: null,
      evidence: "unavailable",
      message: "Alignment is unavailable without a face bounding box."
    };
  }
  const centerX = boundingBox.x + boundingBox.width / 2;
  const centerY = boundingBox.y + boundingBox.height / 2;
  const translateX = round(alignmentTarget.centerX - centerX);
  const translateY = round(alignmentTarget.centerY - centerY);
  const scale = round(alignmentTarget.faceHeightRatio / Math.max(boundingBox.height, 0.001));
  const rotationDegrees = pose?.availabilityState === "available" && pose.rollDegrees !== null ? round(-pose.rollDegrees) : null;
  const needsAdjustment = Math.abs(translateX) > 0.12 || Math.abs(translateY) > 0.14 || boundingBox.height < 0.24 || boundingBox.height > 0.7 || Math.abs(rotationDegrees ?? 0) > 12;
  return {
    state: needsAdjustment ? "needsReview" : "ready",
    standardCoordinateSystem: "gameface-screenshot-alignment-v1",
    target: alignmentTarget,
    transform: {
      translateX,
      translateY,
      scale,
      rotationDegrees
    },
    evidence: "estimated",
    message: needsAdjustment
      ? "Screenshot can be aligned to the standard coordinate system, but framing should be reviewed."
      : "Screenshot aligns cleanly to the standard coordinate system."
  };
}

function uniqueInstructions(instructions: ScreenshotRetakeInstruction[]) {
  const seen = new Set<string>();
  return instructions.filter((instruction) => {
    if (seen.has(instruction.code)) return false;
    seen.add(instruction.code);
    return true;
  });
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
