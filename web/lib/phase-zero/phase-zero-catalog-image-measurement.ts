import type {
  FaceBoundingBox,
  FaceLandmarkPoint,
  FaceLandmarkProviderMetadata,
  FaceLandmarkReport,
  ISODateString,
  MeasurementConfidence,
  StandardFacialMeasurementID
} from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";
import type { Phase0CatalogAnnotationViewID } from "./phase-zero-catalog-annotation-workspace";

export const PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION = "phase0-catalog-image-measurement-v1";

export type Phase0CatalogMeasurementSource = "landmarkDerived" | "humanCorrected" | "unavailable";
export type Phase0CatalogMeasurementAvailability = "available" | "unavailable" | "needsHumanCorrection";
export type Phase0CatalogViewValidationStatus = "usable" | "needsHumanReview" | "blocked";
export type Phase0CatalogViewValidationIssueCode =
  | "missingEvidenceID"
  | "invalidDimensions"
  | "landmarksUnavailable"
  | "zeroFaces"
  | "multipleFaces"
  | "faceRegionMissing"
  | "viewPoseUnconfirmed"
  | "viewPoseMismatch"
  | "lowLandmarkConfidence";

type PointLabel =
  | "forehead top"
  | "nose tip"
  | "nose bridge"
  | "nose base"
  | "left nose wing"
  | "right nose wing"
  | "chin"
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
  | "left brow"
  | "right brow";

export const phase0CatalogMeasurementIDs: StandardFacialMeasurementID[] = [
  "faceWidthRatio",
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

export interface Phase0CatalogMeasurementViewInput {
  viewID: Phase0CatalogAnnotationViewID;
  evidenceFileID: Phase0EntityID;
  imageRelativePath: string;
  width: number;
  height: number;
  capturedAt: ISODateString;
  faceLandmarkReport?: FaceLandmarkReport | null;
  manualFaceRegion?: Phase0CatalogFaceRegion | null;
}

export interface Phase0CatalogFaceRegion {
  unit: "normalized";
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: MeasurementConfidence;
  source: "landmarkBoundingBox" | "humanCorrected";
}

export interface Phase0CatalogViewValidationIssue {
  code: Phase0CatalogViewValidationIssueCode;
  severity: "blocking" | "warning";
  message: string;
}

export interface Phase0CatalogViewValidation {
  viewID: Phase0CatalogAnnotationViewID;
  evidenceFileID: Phase0EntityID;
  status: Phase0CatalogViewValidationStatus;
  issues: Phase0CatalogViewValidationIssue[];
}

export interface Phase0CatalogLandmarkExtraction {
  viewID: Phase0CatalogAnnotationViewID;
  state: "available" | "unavailable" | "unreliable";
  provider: FaceLandmarkProviderMetadata | null;
  coreLandmarkCount: number;
  confidence: MeasurementConfidence;
  failureReason: string | null;
}

export interface Phase0CatalogMeasurementSample {
  viewID: Phase0CatalogAnnotationViewID;
  evidenceFileID: Phase0EntityID;
  value: number;
  confidence: number;
  approximate: boolean;
}

export interface Phase0CatalogHumanMeasurementCorrection {
  measurementID: StandardFacialMeasurementID;
  value: number;
  confidence: number;
  correctedBy: Phase0EntityID;
  reason: string;
  supportingViewIDs: Phase0CatalogAnnotationViewID[];
  createdAt: ISODateString;
}

export interface Phase0CatalogImageMeasurement {
  measurementID: StandardFacialMeasurementID;
  value: number | null;
  source: Phase0CatalogMeasurementSource;
  availabilityState: Phase0CatalogMeasurementAvailability;
  confidence: MeasurementConfidence;
  supportingViewCount: number;
  supportingViews: Phase0CatalogAnnotationViewID[];
  supportingEvidenceFileIDs: Phase0EntityID[];
  variance: number | null;
  depthSupported: false;
  algorithmVersion: typeof PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION;
  failureReason: string | null;
  humanCorrection: Phase0CatalogHumanMeasurementCorrection | null;
  precisionNotice: string;
}

export interface Phase0CatalogImageMeasurementReport {
  schemaVersion: typeof PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION;
  catalogStableID: string;
  catalogVersionID: string;
  createdAt: ISODateString;
  viewValidations: Phase0CatalogViewValidation[];
  faceRegions: Phase0CatalogFaceRegionDetection[];
  landmarkExtractions: Phase0CatalogLandmarkExtraction[];
  measurements: Partial<Record<StandardFacialMeasurementID, Phase0CatalogImageMeasurement>>;
  failureMessages: string[];
  humanCorrectionCount: number;
  readyForAnnotationReview: boolean;
  readyForProductionCatalog: false;
  precisionNotice: string;
}

export interface Phase0CatalogFaceRegionDetection {
  viewID: Phase0CatalogAnnotationViewID;
  evidenceFileID: Phase0EntityID;
  state: "detected" | "humanCorrected" | "unavailable";
  region: Phase0CatalogFaceRegion | null;
  message: string;
}

export interface Phase0CatalogImageMeasurementInput {
  catalogStableID: string;
  catalogVersionID: string;
  createdAt: ISODateString;
  imageViews: Phase0CatalogMeasurementViewInput[];
  humanCorrections?: Phase0CatalogHumanMeasurementCorrection[];
}

interface UsableView {
  input: Phase0CatalogMeasurementViewInput;
  face: NonNullable<FaceLandmarkReport["faces"][number]>;
  validation: Phase0CatalogViewValidation;
}

export function createCatalogImageMeasurementReport(input: Phase0CatalogImageMeasurementInput): Phase0CatalogImageMeasurementReport {
  const viewValidations = input.imageViews.map(validateCatalogMeasurementView);
  const faceRegions = input.imageViews.map((view) => detectFaceRegion(view));
  const landmarkExtractions = input.imageViews.map((view) => summarizeLandmarkExtraction(view));
  const usableViews = input.imageViews.flatMap((view) => {
    const validation = viewValidations.find((item) => item.evidenceFileID === view.evidenceFileID && item.viewID === view.viewID);
    const face = view.faceLandmarkReport?.faces[0];
    return validation && validation.status !== "blocked" && view.faceLandmarkReport?.faceCount === "one" && face ? [{ input: view, face, validation }] : [];
  });
  const measurements: Partial<Record<StandardFacialMeasurementID, Phase0CatalogImageMeasurement>> = {};

  measurements.faceWidthRatio = measurementFromSamples("faceWidthRatio", samplesFor(usableViews, ["straightOn"], faceWidthToLength));
  measurements.faceLengthRatio = unavailableMeasurement("faceLengthRatio", "Standalone game-image face length is not defensible without a locked camera scale.");
  measurements.foreheadWidthRatio = measurementFromSamples("foreheadWidthRatio", samplesFor(usableViews, ["straightOn"], foreheadWidth));
  measurements.jawWidthRatio = measurementFromSamples("jawWidthRatio", samplesFor(usableViews, ["straightOn"], jawWidth, true));
  measurements.chinWidthRatio = measurementFromSamples("chinWidthRatio", samplesFor(usableViews, ["straightOn"], chinWidth, true));
  measurements.eyeSpacingRatio = measurementFromSamples("eyeSpacingRatio", samplesFor(usableViews, ["straightOn"], eyeSpacing));
  measurements.meanEyeWidthRatio = measurementFromSamples("meanEyeWidthRatio", samplesFor(usableViews, ["straightOn"], meanEyeWidth));
  measurements.noseWidthRatio = measurementFromSamples("noseWidthRatio", samplesFor(usableViews, ["straightOn"], noseWidth));
  measurements.noseLengthRatio = measurementFromSamples("noseLengthRatio", samplesFor(usableViews, ["straightOn"], noseLength));
  measurements.mouthWidthRatio = measurementFromSamples("mouthWidthRatio", samplesFor(usableViews, ["straightOn"], mouthWidth));
  measurements.lowerFaceRatio = measurementFromSamples("lowerFaceRatio", samplesFor(usableViews, ["straightOn"], lowerFace));
  measurements.eyeTilt = measurementFromSamples("eyeTilt", samplesFor(usableViews, ["straightOn"], eyeTilt, true));
  measurements.browPosition = measurementFromSamples("browPosition", samplesFor(usableViews, ["straightOn"], browPosition, true));
  measurements.jawAngle = measurementFromSamples("jawAngle", samplesFor(usableViews, ["straightOn"], jawAngle, true));
  measurements.noseProjection = measurementFromSamples("noseProjection", samplesFor(usableViews, ["leftProfile", "rightProfile"], noseProjection, true));
  measurements.chinProjection = measurementFromSamples("chinProjection", samplesFor(usableViews, ["leftProfile", "rightProfile"], chinProjection, true));

  for (const correction of input.humanCorrections ?? []) {
    measurements[correction.measurementID] = applyHumanCorrection(measurements[correction.measurementID], correction);
  }

  const failureMessages = [
    ...viewValidations.flatMap((validation) => validation.issues.filter((issue) => issue.severity === "blocking").map((issue) => `${validation.viewID}: ${issue.message}`)),
    ...Object.values(measurements)
      .filter((measurement): measurement is Phase0CatalogImageMeasurement => Boolean(measurement))
      .filter((measurement) => measurement.availabilityState !== "available")
      .map((measurement) => `${measurement.measurementID}: ${measurement.failureReason ?? "Measurement unavailable."}`)
  ];

  return {
    schemaVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION,
    catalogStableID: input.catalogStableID,
    catalogVersionID: input.catalogVersionID,
    createdAt: input.createdAt,
    viewValidations,
    faceRegions,
    landmarkExtractions,
    measurements,
    failureMessages,
    humanCorrectionCount: input.humanCorrections?.length ?? 0,
    readyForAnnotationReview: failureMessages.length === 0 && Object.values(measurements).some((measurement) => measurement?.availabilityState === "available"),
    readyForProductionCatalog: false,
    precisionNotice:
      "Catalog image measurements are explainable normalized ratios from local game-character imagery. They are not scientific biometric measurements and require human review before catalog use."
  };
}

export function validateCatalogMeasurementView(view: Phase0CatalogMeasurementViewInput): Phase0CatalogViewValidation {
  const issues: Phase0CatalogViewValidationIssue[] = [];
  if (!view.evidenceFileID.trim() || !view.imageRelativePath.trim()) {
    issues.push(issue("missingEvidenceID", "View requires a stable evidence ID and relative path.", "blocking"));
  }
  if (!Number.isFinite(view.width) || !Number.isFinite(view.height) || view.width <= 0 || view.height <= 0) {
    issues.push(issue("invalidDimensions", "View dimensions must be positive numbers.", "blocking"));
  }
  const report = view.faceLandmarkReport;
  if (!report || report.availabilityState !== "available") {
    issues.push(issue("landmarksUnavailable", "Local landmark extraction is unavailable for this view.", "blocking"));
  } else if (report.faceCount === "zero") {
    issues.push(issue("zeroFaces", "No face region was detected in this catalog image.", "blocking"));
  } else if (report.faceCount === "multiple") {
    issues.push(issue("multipleFaces", "Multiple face regions were detected; catalog measurement requires one character face.", "blocking"));
  } else if (report.faceCount !== "one" || !report.faces[0]) {
    issues.push(issue("faceRegionMissing", "A reliable face region is missing.", "blocking"));
  } else {
    const face = report.faces[0];
    if (face.confidence.score !== null && face.confidence.score < 0.45) {
      issues.push(issue("lowLandmarkConfidence", "Landmark confidence is low; human correction or recapture is recommended.", "warning"));
    }
    issues.push(...validateViewPose(view.viewID, face.approximateHeadPose.yawDegrees));
  }
  return {
    viewID: view.viewID,
    evidenceFileID: view.evidenceFileID,
    status: issues.some((item) => item.severity === "blocking") ? "blocked" : issues.length > 0 ? "needsHumanReview" : "usable",
    issues
  };
}

export function detectFaceRegion(view: Phase0CatalogMeasurementViewInput): Phase0CatalogFaceRegionDetection {
  if (view.manualFaceRegion) {
    return {
      viewID: view.viewID,
      evidenceFileID: view.evidenceFileID,
      state: "humanCorrected",
      region: view.manualFaceRegion,
      message: "Human-corrected face region supplied."
    };
  }
  const face = view.faceLandmarkReport?.faces[0];
  if (view.faceLandmarkReport?.faceCount === "one" && face && face.boundingBox.width > 0 && face.boundingBox.height > 0) {
    return {
      viewID: view.viewID,
      evidenceFileID: view.evidenceFileID,
      state: "detected",
      region: faceRegionFromBoundingBox(face.boundingBox),
      message: "Face region estimated from local landmarks."
    };
  }
  return {
    viewID: view.viewID,
    evidenceFileID: view.evidenceFileID,
    state: "unavailable",
    region: null,
    message: "Face region unavailable; human correction is required before measurement."
  };
}

export function summarizeLandmarkExtraction(view: Phase0CatalogMeasurementViewInput): Phase0CatalogLandmarkExtraction {
  const report = view.faceLandmarkReport;
  const face = report?.faces[0];
  if (!report || report.availabilityState !== "available") {
    return {
      viewID: view.viewID,
      state: "unavailable",
      provider: report?.provider ?? null,
      coreLandmarkCount: 0,
      confidence: confidence(0),
      failureReason: "Landmark extraction unavailable."
    };
  }
  if (report.faceCount !== "one" || !face) {
    return {
      viewID: view.viewID,
      state: "unreliable",
      provider: report.provider,
      coreLandmarkCount: 0,
      confidence: confidence(report.confidence.score ?? 0),
      failureReason: `Expected one face, got ${report.faceCount}.`
    };
  }
  const score = Math.min(report.confidence.score ?? face.confidence.score ?? 0.5, face.confidence.score ?? 0.5);
  return {
    viewID: view.viewID,
    state: face.coreLandmarks.length >= 8 && score >= 0.45 ? "available" : "unreliable",
    provider: report.provider,
    coreLandmarkCount: face.coreLandmarks.length,
    confidence: confidence(score),
    failureReason: face.coreLandmarks.length >= 8 ? null : "Too few core landmarks for reliable catalog measurements."
  };
}

function measurementFromSamples(id: StandardFacialMeasurementID, samples: Phase0CatalogMeasurementSample[]): Phase0CatalogImageMeasurement {
  const validSamples = samples.filter((sample) => Number.isFinite(sample.value));
  if (validSamples.length === 0) return unavailableMeasurement(id, `No reliable landmark-derived samples for ${id}.`);
  const values = validSamples.map((sample) => sample.value);
  const supportingViews = Array.from(new Set(validSamples.map((sample) => sample.viewID))).sort();
  const confidenceScore = round(
    Math.min(
      0.82,
      mean(validSamples.map((sample) => sample.confidence)) *
        (validSamples.length > 1 ? 1 : 0.86) *
        (validSamples.some((sample) => sample.approximate) ? 0.78 : 1)
    )
  );
  return {
    measurementID: id,
    value: round(mean(values)),
    source: "landmarkDerived",
    availabilityState: "available",
    confidence: confidence(confidenceScore),
    supportingViewCount: supportingViews.length,
    supportingViews,
    supportingEvidenceFileIDs: Array.from(new Set(validSamples.map((sample) => sample.evidenceFileID))).sort(),
    variance: round(sampleVariance(values)),
    depthSupported: false,
    algorithmVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION,
    failureReason: null,
    humanCorrection: null,
    precisionNotice: "Normalized game-image ratio; not a scientific biometric measurement."
  };
}

function applyHumanCorrection(
  existing: Phase0CatalogImageMeasurement | undefined,
  correction: Phase0CatalogHumanMeasurementCorrection
): Phase0CatalogImageMeasurement {
  const correctionValid = Number.isFinite(correction.value) && correction.value >= 0 && correction.value <= 2 && correction.confidence >= 0 && correction.confidence <= 1;
  if (!correctionValid) return unavailableMeasurement(correction.measurementID, "Human correction is outside the accepted normalized range or confidence bounds.");
  return {
    measurementID: correction.measurementID,
    value: round(correction.value),
    source: "humanCorrected",
    availabilityState: "available",
    confidence: confidence(round(correction.confidence)),
    supportingViewCount: correction.supportingViewIDs.length,
    supportingViews: [...correction.supportingViewIDs].sort(),
    supportingEvidenceFileIDs: existing?.supportingEvidenceFileIDs ?? [],
    variance: existing?.variance ?? null,
    depthSupported: false,
    algorithmVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION,
    failureReason: null,
    humanCorrection: correction,
    precisionNotice: "Human-corrected normalized game-image ratio; not a scientific biometric measurement."
  };
}

function unavailableMeasurement(id: StandardFacialMeasurementID, reason: string): Phase0CatalogImageMeasurement {
  return {
    measurementID: id,
    value: null,
    source: "unavailable",
    availabilityState: "unavailable",
    confidence: confidence(0),
    supportingViewCount: 0,
    supportingViews: [],
    supportingEvidenceFileIDs: [],
    variance: null,
    depthSupported: false,
    algorithmVersion: PHASE0_CATALOG_IMAGE_MEASUREMENT_VERSION,
    failureReason: reason,
    humanCorrection: null,
    precisionNotice: "Measurement unavailable; do not infer or fabricate game-character geometry."
  };
}

function samplesFor(
  views: UsableView[],
  requiredViews: Phase0CatalogAnnotationViewID[],
  calculate: (face: UsableView["face"]) => number | null,
  approximate = false
): Phase0CatalogMeasurementSample[] {
  return views
    .filter((view) => requiredViews.includes(view.input.viewID))
    .flatMap((view) => {
      const value = calculate(view.face);
      if (value === null || !Number.isFinite(value)) return [];
      const confidencePenalty = view.validation.status === "needsHumanReview" ? 0.82 : 1;
      return [
        {
          viewID: view.input.viewID,
          evidenceFileID: view.input.evidenceFileID,
          value,
          confidence: Math.min((view.face.confidence.score ?? 0.55) * confidencePenalty, 0.82),
          approximate
        }
      ];
    });
}

function validateViewPose(viewID: Phase0CatalogAnnotationViewID, yawDegrees: number | null): Phase0CatalogViewValidationIssue[] {
  if (!["straightOn", "left45", "right45", "leftProfile", "rightProfile"].includes(viewID)) return [];
  if (yawDegrees === null || !Number.isFinite(yawDegrees)) {
    return [issue("viewPoseUnconfirmed", "Head-pose estimate is unavailable; human view confirmation is required.", "warning")];
  }
  const ranges: Partial<Record<Phase0CatalogAnnotationViewID, [number, number]>> = {
    straightOn: [-18, 18],
    left45: [-65, -20],
    right45: [20, 65],
    leftProfile: [-95, -65],
    rightProfile: [65, 95]
  };
  const range = ranges[viewID];
  if (!range) return [];
  return yawDegrees >= range[0] && yawDegrees <= range[1]
    ? []
    : [issue("viewPoseMismatch", `${viewID} expected yaw ${range[0]} to ${range[1]} degrees; estimate was ${yawDegrees}.`, "warning")];
}

function faceRegionFromBoundingBox(box: FaceBoundingBox): Phase0CatalogFaceRegion {
  return {
    unit: "normalized",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    confidence: confidence(box.confidence.score ?? 0.5),
    source: "landmarkBoundingBox"
  };
}

function faceWidthToLength(face: UsableView["face"]) {
  return safeRatio(face.boundingBox.width, face.boundingBox.height);
}

function foreheadWidth(face: UsableView["face"]) {
  return ratioDistance(face, "left brow", "right brow", face.boundingBox.width);
}

function jawWidth(face: UsableView["face"]) {
  return ratioDistance(face, "left jaw", "right jaw", face.boundingBox.width);
}

function chinWidth(face: UsableView["face"]) {
  return ratioDistance(face, "left chin edge", "right chin edge", face.boundingBox.width);
}

function eyeSpacing(face: UsableView["face"]) {
  return ratioDistance(face, "left eye inner corner", "right eye inner corner", face.boundingBox.width);
}

function meanEyeWidth(face: UsableView["face"]) {
  const left = ratioDistance(face, "left eye outer corner", "left eye inner corner", face.boundingBox.width);
  const right = ratioDistance(face, "right eye inner corner", "right eye outer corner", face.boundingBox.width);
  return left === null || right === null ? null : round((left + right) / 2);
}

function noseWidth(face: UsableView["face"]) {
  return ratioDistance(face, "left nose wing", "right nose wing", face.boundingBox.width);
}

function noseLength(face: UsableView["face"]) {
  return ratioDistance(face, "nose bridge", "nose base", face.boundingBox.height);
}

function mouthWidth(face: UsableView["face"]) {
  return ratioDistance(face, "left mouth corner", "right mouth corner", face.boundingBox.width);
}

function lowerFace(face: UsableView["face"]) {
  return ratioDistance(face, "nose base", "chin", face.boundingBox.height);
}

function eyeTilt(face: UsableView["face"]) {
  const leftOuter = point(face, "left eye outer corner");
  const leftInner = point(face, "left eye inner corner");
  const rightInner = point(face, "right eye inner corner");
  const rightOuter = point(face, "right eye outer corner");
  if (!leftOuter || !leftInner || !rightInner || !rightOuter) return null;
  const leftSlope = Math.abs(leftInner.y - leftOuter.y) / Math.max(distance(leftOuter, leftInner), 0.001);
  const rightSlope = Math.abs(rightOuter.y - rightInner.y) / Math.max(distance(rightInner, rightOuter), 0.001);
  return round((leftSlope + rightSlope) / 2);
}

function browPosition(face: UsableView["face"]) {
  const leftBrow = point(face, "left brow");
  const rightBrow = point(face, "right brow");
  const leftEye = point(face, "left eye inner corner");
  const rightEye = point(face, "right eye inner corner");
  if (!leftBrow || !rightBrow || !leftEye || !rightEye) return null;
  return round(Math.abs((leftEye.y + rightEye.y) / 2 - (leftBrow.y + rightBrow.y) / 2) / Math.max(face.boundingBox.height, 0.001));
}

function jawAngle(face: UsableView["face"]) {
  const leftJaw = point(face, "left jaw");
  const rightJaw = point(face, "right jaw");
  const chin = point(face, "chin");
  if (!leftJaw || !rightJaw || !chin) return null;
  return round(((angleBetween(leftJaw, chin) + angleBetween(rightJaw, chin)) / 2) / 180);
}

function noseProjection(face: UsableView["face"]) {
  const nose = point(face, "nose tip");
  const bridge = point(face, "nose bridge");
  if (!nose || !bridge) return null;
  return round(Math.abs(nose.x - bridge.x) / Math.max(face.boundingBox.width, 0.001));
}

function chinProjection(face: UsableView["face"]) {
  const chin = point(face, "chin");
  const mouthLeft = point(face, "left mouth corner");
  const mouthRight = point(face, "right mouth corner");
  if (!chin || !mouthLeft || !mouthRight) return null;
  return round(Math.abs(chin.x - (mouthLeft.x + mouthRight.x) / 2) / Math.max(face.boundingBox.width, 0.001));
}

function ratioDistance(face: UsableView["face"], first: PointLabel, second: PointLabel, denominator: number) {
  const firstPoint = point(face, first);
  const secondPoint = point(face, second);
  if (!firstPoint || !secondPoint) return null;
  return safeRatio(distance(firstPoint, secondPoint), denominator);
}

function point(face: UsableView["face"], label: PointLabel) {
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

function confidence(score: number): MeasurementConfidence {
  return {
    score,
    label: score >= 0.75 ? "high" : score >= 0.45 ? "medium" : score > 0 ? "low" : "unavailable"
  };
}

function issue(
  code: Phase0CatalogViewValidationIssueCode,
  message: string,
  severity: Phase0CatalogViewValidationIssue["severity"]
): Phase0CatalogViewValidationIssue {
  return { code, message, severity };
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
