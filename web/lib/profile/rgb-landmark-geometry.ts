import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import type {
  CapturedAngle,
  CapturedAngleID,
  CaptureGuidanceIssue,
  DetectedFaceLandmarks,
  FacialMeasurement,
  FaceLandmarkPoint,
  GeometryProfile,
  MeasurementConfidence,
  StandardFacialMeasurementID
} from "@/types/domain";

export const rgbLandmarkGeometryAlgorithmVersion = "web-rgb-landmark-geometry-v1";

export const webRgbGeometryMeasurementIDs: StandardFacialMeasurementID[] = [
  "faceWidthRatio",
  "faceLengthRatio",
  "foreheadWidthRatio",
  "jawWidthRatio",
  "chinWidthRatio",
  "eyeSpacingRatio",
  "meanEyeWidthRatio",
  "noseWidthRatio",
  "noseLengthRatio",
  "mouthWidthRatio",
  "lowerFaceRatio",
  "eyeTilt",
  "browPosition",
  "jawAngle",
  "noseProjection",
  "chinProjection"
];

type PointLabel =
  | "forehead top"
  | "nose tip"
  | "nose bridge"
  | "nose base"
  | "left nose wing"
  | "right nose wing"
  | "chin"
  | "left face edge"
  | "right face edge"
  | "left jaw"
  | "right jaw"
  | "left chin edge"
  | "right chin edge"
  | "left eye outer corner"
  | "left eye inner corner"
  | "right eye inner corner"
  | "right eye outer corner"
  | "left mouth corner"
  | "right mouth corner"
  | "upper lip"
  | "lower lip"
  | "left brow"
  | "right brow";

interface MeasurementSample {
  value: number;
  pose: CapturedAngleID;
  confidence: number;
  approximate: boolean;
}

export function createRgbLandmarkGeometryProfile(session: ActiveCaptureSession): GeometryProfile {
  const usableAngles = session.angles.flatMap((angle) => {
    const face = angle.faceLandmarkReport?.faces[0];
    return angle.faceLandmarkReport?.faceCount === "one" && face && angleUsableForGeometry(angle, face) ? [{ angle, face }] : [];
  });
  const front = usableAngles.find((entry) => entry.angle.id === "straightOn");
  const profiles = usableAngles.filter((entry) => entry.angle.id === "leftProfile" || entry.angle.id === "rightProfile");
  const measurements: GeometryProfile["measurements"] = {};

  measurements.faceWidthRatio = fromSamples("faceWidthRatio", front ? [sample(front, faceWidthToLength)] : []);
  measurements.faceLengthRatio = unavailableMeasurement("Standalone RGB face length depends on camera distance and is not used as a stable web measurement.");
  measurements.foreheadWidthRatio = fromSamples("foreheadWidthRatio", front ? [sample(front, foreheadWidth)] : []);
  measurements.jawWidthRatio = fromSamples("jawWidthRatio", front ? [sample(front, jawWidth, true)] : []);
  measurements.chinWidthRatio = fromSamples("chinWidthRatio", front ? [sample(front, chinWidth, true)] : []);
  measurements.eyeSpacingRatio = fromSamples("eyeSpacingRatio", front ? [sample(front, eyeSpacing)] : []);
  measurements.meanEyeWidthRatio = fromSamples("meanEyeWidthRatio", front ? [sample(front, meanEyeWidth)] : []);
  measurements.noseWidthRatio = fromSamples("noseWidthRatio", front ? [sample(front, noseWidth)] : []);
  measurements.noseLengthRatio = fromSamples("noseLengthRatio", front ? [sample(front, noseLength)] : []);
  measurements.mouthWidthRatio = fromSamples("mouthWidthRatio", front ? [sample(front, mouthWidth)] : []);
  measurements.lowerFaceRatio = fromSamples("lowerFaceRatio", front ? [sample(front, lowerFace)] : []);
  measurements.eyeTilt = fromSamples("eyeTilt", front ? [sample(front, eyeTilt, true)] : []);
  measurements.browPosition = fromSamples("browPosition", front ? [sample(front, browPosition, true)] : []);
  measurements.jawAngle = fromSamples("jawAngle", front ? [sample(front, jawAngle, true)] : []);
  measurements.noseProjection = fromSamples(
    "noseProjection",
    profiles.map((entry) => sample(entry, noseProjection, true))
  );
  measurements.chinProjection = fromSamples(
    "chinProjection",
    profiles.map((entry) => sample(entry, chinProjection, true))
  );

  return {
    modelVersion: rgbLandmarkGeometryAlgorithmVersion,
    measurements,
    unavailableMeasurements: webRgbGeometryMeasurementIDs.filter((id) => measurements[id]?.availabilityState !== "available")
  };
}

function fromSamples(id: StandardFacialMeasurementID, samples: Array<MeasurementSample | null>): FacialMeasurement {
  const validSamples = samples.filter((item): item is MeasurementSample => item !== null && Number.isFinite(item.value));
  if (validSamples.length === 0) {
    return unavailableMeasurement(`No defensible RGB landmark evidence for ${id}.`);
  }
  const values = validSamples.map((item) => item.value);
  const value = round(mean(values));
  const variance = round(sampleVariance(values));
  const confidenceScore = round(
    Math.min(
      0.82,
      mean(validSamples.map((item) => item.confidence)) *
        (validSamples.length >= 2 ? 1 : 0.86) *
        (validSamples.some((item) => item.approximate) ? 0.78 : 1)
    )
  );
  const supportingPoses = Array.from(new Set(validSamples.map((item) => item.pose)));
  return {
    value,
    confidence: confidenceFromScore(confidenceScore),
    supportingFrameCount: validSamples.length,
    supportingPoses,
    variance,
    depthSupported: false,
    profileEvidenceExists: supportingPoses.some((pose) => pose === "leftProfile" || pose === "rightProfile"),
    occlusionImpact: "none",
    occlusionStatus: "none",
    measurementSource: "browserRgbImage",
    availabilityState: "available",
    algorithmVersion: rgbLandmarkGeometryAlgorithmVersion
  };
}

function unavailableMeasurement(_reason: string): FacialMeasurement {
  return {
    value: null,
    confidence: confidenceFromScore(0),
    supportingFrameCount: 0,
    supportingPoses: [],
    variance: null,
    depthSupported: false,
    profileEvidenceExists: false,
    occlusionImpact: "unknown",
    occlusionStatus: "unknown",
    measurementSource: "notMeasured",
    availabilityState: "unavailable",
    algorithmVersion: rgbLandmarkGeometryAlgorithmVersion
  };
}

function sample(
  entry: { angle: CapturedAngle; face: DetectedFaceLandmarks },
  calculate: (face: DetectedFaceLandmarks) => number | null,
  approximate = false
): MeasurementSample | null {
  const value = calculate(entry.face);
  if (value === null || !Number.isFinite(value)) return null;
  const guidancePenalty = confidencePenaltyForGuidance(entry.angle);
  const qualityPenalty = confidencePenaltyForImageQuality(entry.angle);
  const faceConfidence = entry.face.confidence.score ?? 0.55;
  return {
    value,
    pose: entry.angle.id,
    confidence: Math.min(faceConfidence * guidancePenalty * qualityPenalty, 0.82),
    approximate
  };
}

function angleUsableForGeometry(angle: CapturedAngle, face: DetectedFaceLandmarks) {
  if (angle.status !== "complete") return false;
  if (angle.qualityReport?.overallState === "blocked") return false;
  if (angle.captureGuidanceReport?.blockingIssues.length) return false;
  return poseMatchesRequestedAngle(angle.id, face);
}

function poseMatchesRequestedAngle(angleID: CapturedAngleID, face: DetectedFaceLandmarks) {
  const yaw = face.approximateHeadPose.yawDegrees;
  if (yaw === null || face.approximateHeadPose.availabilityState !== "available") return true;
  const range = yawRangeForAngle(angleID);
  return yaw >= range.min && yaw <= range.max;
}

function yawRangeForAngle(angleID: CapturedAngleID) {
  switch (angleID) {
    case "straightOn":
      return { min: -18, max: 18 };
    case "left45":
      return { min: -68, max: -16 };
    case "right45":
      return { min: 16, max: 68 };
    case "leftProfile":
      return { min: -110, max: -48 };
    case "rightProfile":
      return { min: 48, max: 110 };
  }
}

function confidencePenaltyForGuidance(angle: CapturedAngle) {
  const warnings = angle.captureGuidanceReport?.advisoryWarnings ?? [];
  let penalty = warnings.length ? 0.94 : 1;
  if (hasIssue(warnings, ["blink", "mouthOpen", "strongExpression"])) penalty *= 0.84;
  if (hasIssue(warnings, ["poorLighting", "underexposed", "overexposed", "lightingImbalance"])) penalty *= 0.86;
  if (hasIssue(warnings, ["occlusionLikely", "missingRequiredRegion"])) penalty *= 0.8;
  if (hasIssue(warnings, ["severeBlur", "excessiveMotion"])) penalty *= 0.72;
  return penalty;
}

function confidencePenaltyForImageQuality(angle: CapturedAngle) {
  const report = angle.qualityReport;
  if (!report) return 0.86;
  let penalty = 1;
  const messages = report.advisoryMessages.join(" ").toLowerCase();
  if (messages.includes("blurry")) penalty *= 0.78;
  if (messages.includes("dark") || messages.includes("shadow") || messages.includes("overexposed") || messages.includes("lighting")) penalty *= 0.86;
  if (!report.userConfirmedNeutralExpression.value) penalty *= 0.86;
  if (!report.userConfirmedRequestedAngle.value) penalty *= 0.82;
  if (!report.userConfirmedOnePerson.value) penalty *= 0.72;
  return penalty;
}

function hasIssue(issues: CaptureGuidanceIssue[], codes: CaptureGuidanceIssue["code"][]) {
  return issues.some((issue) => codes.includes(issue.code));
}

function faceWidthToLength(face: DetectedFaceLandmarks) {
  return safeRatio(face.boundingBox.width, face.boundingBox.height);
}

function foreheadWidth(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "left brow", "right brow", face.boundingBox.width);
}

function jawWidth(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "left jaw", "right jaw", face.boundingBox.width);
}

function chinWidth(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "left chin edge", "right chin edge", face.boundingBox.width);
}

function eyeSpacing(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "left eye inner corner", "right eye inner corner", face.boundingBox.width);
}

function meanEyeWidth(face: DetectedFaceLandmarks) {
  const left = ratioDistance(face, "left eye outer corner", "left eye inner corner", face.boundingBox.width);
  const right = ratioDistance(face, "right eye inner corner", "right eye outer corner", face.boundingBox.width);
  return left === null || right === null ? null : round((left + right) / 2);
}

function noseWidth(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "left nose wing", "right nose wing", face.boundingBox.width);
}

function noseLength(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "nose bridge", "nose base", face.boundingBox.height);
}

function mouthWidth(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "left mouth corner", "right mouth corner", face.boundingBox.width);
}

function lowerFace(face: DetectedFaceLandmarks) {
  return ratioDistance(face, "nose base", "chin", face.boundingBox.height);
}

function eyeTilt(face: DetectedFaceLandmarks) {
  const leftOuter = point(face, "left eye outer corner");
  const leftInner = point(face, "left eye inner corner");
  const rightInner = point(face, "right eye inner corner");
  const rightOuter = point(face, "right eye outer corner");
  if (!leftOuter || !leftInner || !rightInner || !rightOuter) return null;
  const leftSlope = Math.abs(leftInner.y - leftOuter.y) / Math.max(distance(leftOuter, leftInner), 0.001);
  const rightSlope = Math.abs(rightOuter.y - rightInner.y) / Math.max(distance(rightInner, rightOuter), 0.001);
  return round((leftSlope + rightSlope) / 2);
}

function browPosition(face: DetectedFaceLandmarks) {
  const leftBrow = point(face, "left brow");
  const rightBrow = point(face, "right brow");
  const leftEye = point(face, "left eye inner corner");
  const rightEye = point(face, "right eye inner corner");
  if (!leftBrow || !rightBrow || !leftEye || !rightEye) return null;
  const browY = (leftBrow.y + rightBrow.y) / 2;
  const eyeY = (leftEye.y + rightEye.y) / 2;
  return round(Math.abs(eyeY - browY) / Math.max(face.boundingBox.height, 0.001));
}

function jawAngle(face: DetectedFaceLandmarks) {
  const leftJaw = point(face, "left jaw");
  const rightJaw = point(face, "right jaw");
  const chin = point(face, "chin");
  if (!leftJaw || !rightJaw || !chin) return null;
  const left = angleBetween(leftJaw, chin);
  const right = angleBetween(rightJaw, chin);
  return round(((left + right) / 2) / 180);
}

function noseProjection(face: DetectedFaceLandmarks) {
  const nose = point(face, "nose tip");
  const bridge = point(face, "nose bridge");
  if (!nose || !bridge) return null;
  return round(Math.abs(nose.x - bridge.x) / Math.max(face.boundingBox.width, 0.001));
}

function chinProjection(face: DetectedFaceLandmarks) {
  const chin = point(face, "chin");
  const mouthLeft = point(face, "left mouth corner");
  const mouthRight = point(face, "right mouth corner");
  if (!chin || !mouthLeft || !mouthRight) return null;
  const mouthCenterX = (mouthLeft.x + mouthRight.x) / 2;
  return round(Math.abs(chin.x - mouthCenterX) / Math.max(face.boundingBox.width, 0.001));
}

function ratioDistance(face: DetectedFaceLandmarks, first: PointLabel, second: PointLabel, denominator: number) {
  const firstPoint = point(face, first);
  const secondPoint = point(face, second);
  if (!firstPoint || !secondPoint) return null;
  return safeRatio(distance(firstPoint, secondPoint), denominator);
}

function point(face: DetectedFaceLandmarks, label: PointLabel) {
  return face.coreLandmarks.find((item) => item.label === label) ?? null;
}

function safeRatio(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return round(numerator / denominator);
}

function distance(first: FaceLandmarkPoint, second: FaceLandmarkPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function angleBetween(first: FaceLandmarkPoint, second: FaceLandmarkPoint) {
  return Math.abs((Math.atan2(second.y - first.y, second.x - first.x) * 180) / Math.PI);
}

function confidenceFromScore(score: number): MeasurementConfidence {
  return {
    score,
    label: score >= 0.75 ? "high" : score >= 0.45 ? "medium" : score > 0 ? "low" : "unavailable"
  };
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}

function sampleVariance(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
