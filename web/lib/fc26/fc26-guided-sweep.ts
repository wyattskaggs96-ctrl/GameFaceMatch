import type { FaceLandmarkReport } from "@/types/domain";
import {
  calculateFc26Measurements,
  FC26_SWEEP_VIEWS,
  type Fc26ConfidenceLabel,
  type Fc26Measurement,
  type Fc26SweepViewID
} from "./fc26-face-matching";

export type Fc26SweepProcessingStatus = "not_started" | "processing" | "complete" | "cancelled" | "blocked";
export type Fc26SweepFrameDecision = "candidate" | "selected" | "rejected";

export interface Fc26SweepVideoMetadata {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

export interface Fc26SweepVideoValidationReport {
  status: "usable" | "needs_review" | "blocked";
  blockingMessages: string[];
  advisoryMessages: string[];
}

export interface Fc26SweepFrameCandidate {
  frameID: string;
  timestampSeconds: number;
  report: FaceLandmarkReport;
  estimatedYawDegrees: number | null;
  estimatedPitchDegrees: number | null;
  estimatedRollDegrees: number | null;
  faceBoxSize: number | null;
  landmarkConfidence: Fc26ConfidenceLabel;
  blurScore: number | null;
  duplicateSimilarityScore: number | null;
  warnings: string[];
}

export interface Fc26SweepFrameReview extends Fc26SweepFrameCandidate {
  classifiedView: Fc26SweepViewID | null;
  qualityScore: number;
  selectedForView: Fc26SweepViewID | null;
  decision: Fc26SweepFrameDecision;
  rejectionReason: string | null;
}

export interface Fc26SelectedSweepFrame extends Fc26SweepFrameReview {
  classifiedView: Fc26SweepViewID;
  selectedForView: Fc26SweepViewID;
  decision: "selected";
}

export interface Fc26SweepSelectionResult {
  selectedFrames: Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>;
  reviewedFrames: Fc26SweepFrameReview[];
  missingViews: Fc26SweepViewID[];
  blockingMessages: string[];
  advisoryMessages: string[];
}

export interface Fc26SweepFusionResult {
  measurements: Fc26Measurement[];
  warnings: string[];
  selectedViewIDs: Fc26SweepViewID[];
}

const supportedVideoTypes = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);
const maxVideoBytes = 180 * 1024 * 1024;
const recommendedMinDurationSeconds = 15;
const recommendedMaxDurationSeconds = 25;
const hardShortDurationSeconds = 4;
const minimumUsableDimension = 480;

export function validateFc26SweepVideo(metadata: Fc26SweepVideoMetadata): Fc26SweepVideoValidationReport {
  const blockingMessages: string[] = [];
  const advisoryMessages: string[] = [];
  const type = metadata.fileType.toLowerCase();

  if (!supportedVideoTypes.has(type)) {
    blockingMessages.push("Unsupported video type. Use MP4, MOV, or WebM for the guided face sweep.");
  }
  if (metadata.fileSizeBytes > maxVideoBytes) {
    blockingMessages.push("Video is over 180 MB. Use a shorter or smaller recording before analysis.");
  }
  if (metadata.durationSeconds === null || !Number.isFinite(metadata.durationSeconds)) {
    advisoryMessages.push("Video duration could not be read; the browser will attempt local frame analysis anyway.");
  } else {
    if (metadata.durationSeconds < hardShortDurationSeconds) {
      blockingMessages.push("Recording is too short to cover the required face angles.");
    } else if (metadata.durationSeconds < 8) {
      advisoryMessages.push("Recording is short. Move slowly enough to capture both profiles and the front.");
    } else if (metadata.durationSeconds < recommendedMinDurationSeconds) {
      advisoryMessages.push("Recommended sweep length is 15-25 seconds; this may still work if all angles are visible.");
    } else if (metadata.durationSeconds > recommendedMaxDurationSeconds + 20) {
      advisoryMessages.push("Recording is longer than needed. The app will sample frames instead of analyzing every frame.");
    }
  }
  if (metadata.width !== null && metadata.height !== null) {
    if (metadata.width < minimumUsableDimension || metadata.height < minimumUsableDimension) {
      blockingMessages.push("Video resolution is too low for dependable landmark analysis.");
    } else if (metadata.width < 720 || metadata.height < 720) {
      advisoryMessages.push("Higher resolution may improve frame selection.");
    }
  } else {
    advisoryMessages.push("Video dimensions could not be read before analysis.");
  }

  return {
    status: blockingMessages.length > 0 ? "blocked" : advisoryMessages.length > 0 ? "needs_review" : "usable",
    blockingMessages: unique(blockingMessages),
    advisoryMessages: unique(advisoryMessages)
  };
}

export function classifyFc26SweepFrame(candidate: Fc26SweepFrameCandidate): Fc26SweepViewID | null {
  if (candidate.report.faceCount !== "one") return null;
  if (candidate.landmarkConfidence === "unavailable") return null;
  const yaw = candidate.estimatedYawDegrees;
  if (yaw === null || !Number.isFinite(yaw)) return null;
  const absoluteYaw = Math.abs(yaw);
  if (absoluteYaw <= 18) return "front";
  if (yaw < 0 && absoluteYaw <= 55) return "leftThreeQuarter";
  if (yaw > 0 && absoluteYaw <= 55) return "rightThreeQuarter";
  if (yaw < 0 && absoluteYaw <= 88) return "leftProfile";
  if (yaw > 0 && absoluteYaw <= 88) return "rightProfile";
  return null;
}

export function selectBestFc26SweepFrames(candidates: Fc26SweepFrameCandidate[]): Fc26SweepSelectionResult {
  const reviewed = candidates.map(reviewCandidate);
  const selectedFrames: Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>> = {};
  const selectedCandidateIDs = new Set<string>();
  const advisoryMessages: string[] = [];
  const blockingMessages: string[] = [];

  if (reviewed.some((frame) => frame.report.faceCount === "multiple")) {
    blockingMessages.push("More than one face was detected in at least one sampled frame.");
  }

  for (const view of FC26_SWEEP_VIEWS) {
    const available = reviewed
      .filter((frame) => frame.classifiedView === view.id && frame.decision !== "rejected")
      .sort((a, b) => b.qualityScore - a.qualityScore);
    const best = available.find((frame) => !isNearDuplicateOfSelected(frame, selectedFrames));
    if (best) {
      selectedCandidateIDs.add(best.frameID);
      selectedFrames[view.id] = {
        ...best,
        classifiedView: view.id,
        selectedForView: view.id,
        decision: "selected",
        rejectionReason: null
      };
    }
  }

  const finalReviewed = reviewed.map((frame) => {
    const selectedView = Object.values(selectedFrames).find((selected) => selected?.frameID === frame.frameID)?.selectedForView ?? null;
    if (selectedView) {
      return { ...frame, selectedForView: selectedView, decision: "selected" as const, rejectionReason: null };
    }
    if (frame.decision === "rejected") return frame;
    if (selectedCandidateIDs.has(frame.frameID)) return frame;
    return {
      ...frame,
      decision: "candidate" as const,
      selectedForView: null
    };
  });

  const missingViews = FC26_SWEEP_VIEWS.flatMap((view) => (selectedFrames[view.id] ? [] : [view.id]));
  if (missingViews.length > 0) {
    advisoryMessages.push(`Missing clear sweep views: ${missingViews.map(formatSweepViewLabel).join(", ")}.`);
  }
  if (!selectedFrames.front) blockingMessages.push("A clear front view was not selected from the sweep.");
  if (!selectedFrames.leftProfile) advisoryMessages.push("The left side of the face was not captured clearly.");
  if (!selectedFrames.rightProfile) advisoryMessages.push("The right side of the face was not captured clearly.");
  if (finalReviewed.length > 1 && hasExcessiveMotion(finalReviewed)) {
    advisoryMessages.push("Move the camera more slowly; sampled yaw changes were large between neighboring frames.");
  }

  return {
    selectedFrames,
    reviewedFrames: finalReviewed,
    missingViews,
    blockingMessages: unique(blockingMessages),
    advisoryMessages: unique(advisoryMessages)
  };
}

export function fuseFc26SweepMeasurements(selectedFrames: Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>): Fc26SweepFusionResult {
  const selectedViewIDs = FC26_SWEEP_VIEWS.flatMap((view) => (selectedFrames[view.id] ? [view.id] : []));
  const bestThreeQuarter = bestFrame([selectedFrames.leftThreeQuarter, selectedFrames.rightThreeQuarter]);
  const bestProfile = bestFrame([selectedFrames.leftProfile, selectedFrames.rightProfile]);
  const front = selectedFrames.front?.report;
  const mappedReports = {
    front,
    threeQuarter: bestThreeQuarter?.report,
    sideProfile: bestProfile?.report
  };
  const warnings: string[] = [];
  const baseMeasurements = calculateFc26Measurements(mappedReports);
  const asymmetryWarnings = calculateAsymmetryWarnings(selectedFrames);
  warnings.push(...asymmetryWarnings);

  const measurements = baseMeasurements.map((measurement) => {
    const contributingViews = contributingViewsForMeasurement(measurement.id, selectedFrames);
    const hasValue = measurement.normalizedValue !== null;
    const reliableForRecommendation = hasValue && measurement.confidence !== "unavailable" && (measurement.id.includes("projection") ? contributingViews.some(isProfileView) : true);
    const fusionMethod = fusionMethodForMeasurement(measurement.id, contributingViews);
    return {
      ...measurement,
      sourceView: contributingViews.length > 1 ? "combined" : measurement.sourceView,
      contributingViews,
      fusionMethod,
      reliableForRecommendation,
      qualityWarnings: unique([
        ...measurement.qualityWarnings,
        ...(selectedViewIDs.length ? [] : ["No guided-sweep frames were selected."]),
        ...(!reliableForRecommendation && hasValue ? ["Measurement is available but weak for recommendation use from this sweep."] : []),
        ...asymmetryWarnings.filter((warning) => warning.toLowerCase().includes(measurement.id.split("_")[0]))
      ]),
      explanation: `${measurement.explanation} Guided sweep fusion: ${describeFusion(fusionMethod, contributingViews)}`
    } satisfies Fc26Measurement;
  });

  return {
    measurements,
    warnings: unique(warnings),
    selectedViewIDs
  };
}

export function metadataForFc26SweepProfile(selectedFrames: Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>) {
  return FC26_SWEEP_VIEWS.flatMap((view) => {
    const frame = selectedFrames[view.id];
    if (!frame) return [];
    return [
      {
        viewID: view.id,
        timestampSeconds: frame.timestampSeconds,
        yawDegrees: frame.estimatedYawDegrees,
        pitchDegrees: frame.estimatedPitchDegrees,
        rollDegrees: frame.estimatedRollDegrees,
        landmarkConfidence: frame.landmarkConfidence,
        qualityWarnings: frame.warnings
      }
    ];
  });
}

function reviewCandidate(candidate: Fc26SweepFrameCandidate): Fc26SweepFrameReview {
  const warnings = [...candidate.warnings];
  const classifiedView = classifyFc26SweepFrame(candidate);
  const faceCount = candidate.report.faceCount;
  let rejectionReason: string | null = null;
  if (faceCount === "zero") rejectionReason = "No face detected.";
  if (faceCount === "multiple") rejectionReason = "Multiple faces detected.";
  if (faceCount === "unavailable" || faceCount === "error") rejectionReason = "Face detection unavailable.";
  if (candidate.faceBoxSize !== null && candidate.faceBoxSize < 0.22) rejectionReason = "Face is too small in the frame.";
  if (candidate.faceBoxSize !== null && candidate.faceBoxSize > 0.92) warnings.push("Face may be too close to the frame edge.");
  if (candidate.blurScore !== null && candidate.blurScore < 0.28) rejectionReason = "Frame is too blurry for reliable measurements.";
  if (candidate.estimatedPitchDegrees !== null && Math.abs(candidate.estimatedPitchDegrees) > 28) warnings.push("Pitch is high; keep the camera level with the face.");
  if (candidate.estimatedRollDegrees !== null && Math.abs(candidate.estimatedRollDegrees) > 24) warnings.push("Roll is high; avoid tilting the phone.");
  if (!classifiedView && !rejectionReason) rejectionReason = "Frame does not match a required sweep angle with enough confidence.";
  if (candidate.duplicateSimilarityScore !== null && candidate.duplicateSimilarityScore > 0.985) warnings.push("Frame is visually close to a neighboring sample.");

  return {
    ...candidate,
    warnings: unique(warnings),
    classifiedView,
    qualityScore: scoreCandidate(candidate, classifiedView),
    selectedForView: null,
    decision: rejectionReason ? "rejected" : "candidate",
    rejectionReason
  };
}

function scoreCandidate(candidate: Fc26SweepFrameCandidate, classifiedView: Fc26SweepViewID | null) {
  if (!classifiedView) return 0;
  const targetYaw = FC26_SWEEP_VIEWS.find((view) => view.id === classifiedView)?.targetYawDegrees ?? 0;
  const yaw = candidate.estimatedYawDegrees ?? targetYaw;
  const yawScore = clamp(1 - Math.abs(yaw - targetYaw) / 35);
  const pitchScore = clamp(1 - Math.abs(candidate.estimatedPitchDegrees ?? 0) / 35);
  const rollScore = clamp(1 - Math.abs(candidate.estimatedRollDegrees ?? 0) / 30);
  const faceScore = candidate.faceBoxSize === null ? 0.45 : clamp(1 - Math.abs(candidate.faceBoxSize - 0.55) / 0.45);
  const confidenceScore = confidenceScoreForLabel(candidate.landmarkConfidence);
  const blurScore = candidate.blurScore ?? 0.55;
  const duplicatePenalty = candidate.duplicateSimilarityScore !== null && candidate.duplicateSimilarityScore > 0.985 ? 0.1 : 0;
  return round(clamp(yawScore * 0.28 + pitchScore * 0.12 + rollScore * 0.1 + faceScore * 0.18 + confidenceScore * 0.18 + blurScore * 0.14 - duplicatePenalty));
}

function isNearDuplicateOfSelected(frame: Fc26SweepFrameReview, selectedFrames: Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>) {
  return Object.values(selectedFrames).some((selected) => {
    if (!selected) return false;
    if (Math.abs(selected.timestampSeconds - frame.timestampSeconds) > 0.75) return false;
    const selectedYaw = selected.estimatedYawDegrees;
    const frameYaw = frame.estimatedYawDegrees;
    return selectedYaw !== null && frameYaw !== null && Math.abs(selectedYaw - frameYaw) < 8;
  });
}

function hasExcessiveMotion(frames: Fc26SweepFrameReview[]) {
  const yawFrames = frames
    .filter((frame) => frame.estimatedYawDegrees !== null)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  if (yawFrames.length < 3) return false;
  return yawFrames.some((frame, index) => {
    const next = yawFrames[index + 1];
    if (!next || frame.estimatedYawDegrees === null || next.estimatedYawDegrees === null) return false;
    const seconds = Math.max(0.1, next.timestampSeconds - frame.timestampSeconds);
    return Math.abs(next.estimatedYawDegrees - frame.estimatedYawDegrees) / seconds > 38;
  });
}

function bestFrame(frames: Array<Fc26SelectedSweepFrame | undefined>) {
  return frames.filter((frame): frame is Fc26SelectedSweepFrame => Boolean(frame)).sort((a, b) => b.qualityScore - a.qualityScore)[0] ?? null;
}

function contributingViewsForMeasurement(id: string, selectedFrames: Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>): Fc26SweepViewID[] {
  const views: Fc26SweepViewID[] = [];
  const add = (viewID: Fc26SweepViewID) => {
    if (selectedFrames[viewID]) views.push(viewID);
  };
  const frontDominant = new Set([
    "face_width",
    "face_height",
    "face_width_to_height_ratio",
    "forehead_height",
    "temple_width",
    "cheekbone_width",
    "jaw_width",
    "jaw_to_cheek_ratio",
    "chin_width",
    "chin_length",
    "eye_width",
    "eye_height",
    "eye_spacing",
    "eye_tilt",
    "eyebrow_height",
    "eyebrow_angle",
    "nose_length",
    "nose_width",
    "nose_to_face_width_ratio",
    "mouth_width",
    "upper_lip_height",
    "lower_lip_height",
    "mouth_to_face_width_ratio"
  ]);
  if (frontDominant.has(id)) {
    add("front");
    add("leftThreeQuarter");
    add("rightThreeQuarter");
    return unique(views);
  }
  if (id.includes("projection")) {
    add("leftProfile");
    add("rightProfile");
    add("leftThreeQuarter");
    add("rightThreeQuarter");
    return unique(views);
  }
  add("front");
  return unique(views);
}

function fusionMethodForMeasurement(id: string, views: Fc26SweepViewID[]): Fc26Measurement["fusionMethod"] {
  if (views.length === 0) return "unavailable";
  if (views.length === 1) return "single_view";
  if (id.includes("projection")) return "profile_supported";
  if (id.includes("jaw") || id.includes("cheek") || id.includes("chin")) return "confidence_weighted";
  return "front_dominant";
}

function describeFusion(method: Fc26Measurement["fusionMethod"], views: Fc26SweepViewID[]) {
  if (!method || method === "unavailable" || views.length === 0) return "no reliable view was available.";
  if (method === "single_view") return `single ${formatSweepViewLabel(views[0])} frame.`;
  if (method === "profile_supported") return `profile or three-quarter support from ${views.map(formatSweepViewLabel).join(", ")}.`;
  if (method === "confidence_weighted") return `front measurement reviewed with ${views.map(formatSweepViewLabel).join(", ")} support.`;
  return `front-dominant measurement with ${views.map(formatSweepViewLabel).join(", ")} support.`;
}

function calculateAsymmetryWarnings(selectedFrames: Partial<Record<Fc26SweepViewID, Fc26SelectedSweepFrame>>) {
  const warnings: string[] = [];
  const leftProfile = selectedFrames.leftProfile;
  const rightProfile = selectedFrames.rightProfile;
  if (leftProfile && rightProfile) {
    const left = calculateFc26Measurements({ sideProfile: leftProfile.report });
    const right = calculateFc26Measurements({ sideProfile: rightProfile.report });
    for (const id of ["nose_projection_estimate", "chin_projection_estimate"]) {
      const leftValue = left.find((measurement) => measurement.id === id)?.normalizedValue;
      const rightValue = right.find((measurement) => measurement.id === id)?.normalizedValue;
      if (leftValue !== null && rightValue !== null && typeof leftValue === "number" && typeof rightValue === "number" && Math.abs(leftValue - rightValue) > 0.08) {
        warnings.push(`${id} differs between left and right profile views; review capture quality before trusting this adjustment.`);
      }
    }
  }
  return warnings;
}

function isProfileView(viewID: Fc26SweepViewID) {
  return viewID === "leftProfile" || viewID === "rightProfile";
}

function confidenceScoreForLabel(label: Fc26ConfidenceLabel) {
  if (label === "high") return 1;
  if (label === "medium") return 0.72;
  if (label === "low") return 0.45;
  return 0.1;
}

function formatSweepViewLabel(viewID: Fc26SweepViewID) {
  return FC26_SWEEP_VIEWS.find((view) => view.id === viewID)?.label ?? viewID;
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
