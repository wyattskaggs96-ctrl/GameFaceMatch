import type { DetectedFaceLandmarks, FaceLandmarkPoint, FaceLandmarkReport } from "@/types/domain";

export const FC26_GAME_ID = "ea-sports-fc-26" as const;
export const FC26_FACE_PROFILE_STORAGE_KEY = "gameface-match:fc26-face-profiles";
export const FC26_FACE_ANALYSIS_VERSION = "fc26-face-analysis-mvp-v1";
export const FC26_RECIPE_RULE_VERSION = "fc26-rule-recipe-mvp-v1";

export type Fc26ReferenceViewID = "front" | "threeQuarter" | "sideProfile";
export type Fc26SweepViewID = "leftProfile" | "leftThreeQuarter" | "front" | "rightThreeQuarter" | "rightProfile";
export type Fc26CaptureMethod = "three_photo" | "guided_sweep";
export type Fc26ConfidenceLabel = "high" | "medium" | "low" | "unavailable";
export type Fc26RecommendationStatus = "directional_adjustment" | "manual_selection_required" | "unsupported";
export type Fc26RecipeControlState = "accepted" | "edited" | "tested" | "unresolved";
export type Fc26ResearchConfidence = "verified" | "probable" | "unclear" | "not_shown";

export interface Fc26ResearchValue {
  value: string;
  timestampSeconds: number;
  videoID: string;
  confidence: Fc26ResearchConfidence;
}

export interface Fc26ResearchControl {
  controlID: string;
  label: string;
  menuID: string;
  section: "Skin" | "Head" | "Face" | "Hair" | "Other";
  controlType: string;
  observedValues: Fc26ResearchValue[];
  rangeComplete: boolean;
  confidence: Fc26ResearchConfidence;
  evidenceSummary: string;
}

export interface Fc26PhotoMetadata {
  viewID: Fc26ReferenceViewID;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  landmarkReport?: FaceLandmarkReport | null;
}

export interface Fc26PhotoQualityReport {
  viewID: Fc26ReferenceViewID;
  status: "usable" | "needs_review" | "blocked";
  blockingMessages: string[];
  advisoryMessages: string[];
  faceCount: FaceLandmarkReport["faceCount"] | "not_checked";
  resolution: {
    width: number;
    height: number;
    sufficient: boolean;
  };
}

export interface Fc26Measurement {
  id: string;
  displayLabel: string;
  normalizedValue: number | null;
  sourceView: Fc26ReferenceViewID | Fc26SweepViewID | "combined";
  confidence: Fc26ConfidenceLabel;
  qualityWarnings: string[];
  explanation: string;
  contributingViews?: Fc26SweepViewID[];
  fusionMethod?: "single_view" | "confidence_weighted" | "front_dominant" | "profile_supported" | "unavailable";
  reliableForRecommendation?: boolean;
}

export interface Fc26RecipeRecommendation {
  controlID: string;
  controlLabel: string;
  section: Fc26ResearchControl["section"];
  status: Fc26RecommendationStatus;
  recommendedValue: string | null;
  direction: string | null;
  confidence: Fc26ConfidenceLabel;
  reason: string;
  measurementIDs: string[];
  sourceRuleID: string;
  researchEvidence: Array<{
    videoID: string;
    timestampSeconds: number;
    confidence: Fc26ResearchConfidence;
  }>;
}

export interface Fc26RecipeItem extends Fc26RecipeRecommendation {
  state: Fc26RecipeControlState;
  manualValue: string;
  userNote: string;
}

export interface Fc26Recipe {
  gameID: typeof FC26_GAME_ID;
  recipeID: string;
  recipeVersion: string;
  generatedAt: string;
  controls: Fc26RecipeItem[];
  unsupportedControlCount: number;
  manualSelectionCount: number;
  limitations: string[];
}

export interface Fc26FaceProfile {
  schemaVersion: "fc26-face-profile-v1";
  gameID: typeof FC26_GAME_ID;
  profileID: string;
  profileName: string;
  createdAt: string;
  updatedAt: string;
  captureMethod?: Fc26CaptureMethod;
  scanStatus?: "complete" | "partial" | "blocked";
  selectedFrameMetadata?: Fc26SelectedSweepFrameMetadata[];
  photoAnalysisStatus: "complete" | "partial" | "blocked";
  measurements: Fc26Measurement[];
  qualityWarnings: string[];
  recipe: Fc26Recipe;
  iterationNumber: number;
  userNotes: string;
}

export interface Fc26SelectedSweepFrameMetadata {
  viewID: Fc26SweepViewID;
  timestampSeconds: number;
  yawDegrees: number | null;
  pitchDegrees: number | null;
  rollDegrees: number | null;
  landmarkConfidence: Fc26ConfidenceLabel;
  qualityWarnings: string[];
}

export interface Fc26MeasurementDifference {
  measurementID: string;
  displayLabel: string;
  referenceValue: number;
  screenshotValue: number;
  difference: number;
  confidence: Fc26ConfidenceLabel;
}

export interface Fc26AdjustmentSuggestion {
  affectedControlID: string;
  affectedControlLabel: string;
  direction: string;
  reason: string;
  confidence: Fc26ConfidenceLabel;
  measurementIDs: string[];
}

export interface Fc26ScreenshotComparisonResult {
  gameID: typeof FC26_GAME_ID;
  iterationNumber: number;
  comparedViews: Fc26ReferenceViewID[];
  usableViewStatus: Record<Fc26ReferenceViewID, "usable" | "missing" | "unusable">;
  measurementDifferences: Fc26MeasurementDifference[];
  adjustmentSuggestions: Fc26AdjustmentSuggestion[];
  internalGeometricSimilarityScore: number | null;
  confidence: Fc26ConfidenceLabel;
  notes: string[];
}

export interface Fc26ResearchData {
  game: {
    gameID: string;
  };
  menuHierarchy: Array<{
    menuID: string;
    label: string;
  }>;
  controls: Array<{
    controlID: string;
    label: string;
    menuID: string;
    controlType: string;
    observedValues: Fc26ResearchValue[];
    rangeComplete: boolean;
    confidence: Fc26ResearchConfidence;
  }>;
}

export const FC26_REQUIRED_REFERENCE_VIEWS: Array<{
  id: Fc26ReferenceViewID;
  label: string;
  instruction: string;
}> = [
  {
    id: "front",
    label: "Front",
    instruction: "Use a straight-on face photo with neutral expression, no sunglasses, no hat, and even lighting."
  },
  {
    id: "threeQuarter",
    label: "Three-quarter",
    instruction: "Use a left or right 45-degree view so cheek, nose, and jaw projection can be estimated."
  },
  {
    id: "sideProfile",
    label: "Side profile",
    instruction: "Use a side profile where the nose, lips, chin, and jawline are visible."
  }
];

export const FC26_SWEEP_VIEWS: Array<{ id: Fc26SweepViewID; label: string; targetYawDegrees: number }> = [
  { id: "leftProfile", label: "Left profile", targetYawDegrees: -70 },
  { id: "leftThreeQuarter", label: "Left three-quarter", targetYawDegrees: -35 },
  { id: "front", label: "Front", targetYawDegrees: 0 },
  { id: "rightThreeQuarter", label: "Right three-quarter", targetYawDegrees: 35 },
  { id: "rightProfile", label: "Right profile", targetYawDegrees: 70 }
];

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 12 * 1024 * 1024;
const minDimension = 480;
const comfortableDimension = 720;

export function getFc26ResearchControls(research: Fc26ResearchData): Fc26ResearchControl[] {
  if (research.game.gameID !== FC26_GAME_ID) {
    throw new Error(`Expected FC 26 research data, received ${research.game.gameID}.`);
  }
  const menuLabels = new Map(research.menuHierarchy.map((menu) => [menu.menuID, menu.label]));
  return research.controls.map((control) => ({
    controlID: control.controlID,
    label: control.label,
    menuID: control.menuID,
    section: sectionForMenu(control.menuID),
    controlType: control.controlType,
    observedValues: control.observedValues,
    rangeComplete: control.rangeComplete,
    confidence: control.confidence,
    evidenceSummary: `${menuLabels.get(control.menuID) ?? "Unknown menu"}; ${control.observedValues.length} observed value(s); range complete: ${
      control.rangeComplete ? "yes" : "no"
    }`
  }));
}

export function validateFc26Photo(metadata: Fc26PhotoMetadata): Fc26PhotoQualityReport {
  const blockingMessages: string[] = [];
  const advisoryMessages: string[] = [];
  const report = metadata.landmarkReport;

  if (!supportedImageTypes.has(metadata.fileType)) {
    blockingMessages.push("Unsupported image type. Use JPEG, PNG, or WebP for the FC 26 MVP.");
  }
  if (metadata.fileSizeBytes > maxImageBytes) {
    blockingMessages.push("Image is over 12 MB. Use a smaller export before analysis.");
  }
  if (metadata.width < minDimension || metadata.height < minDimension) {
    blockingMessages.push("Image resolution is too low for reliable local landmark analysis.");
  } else if (metadata.width < comfortableDimension || metadata.height < comfortableDimension) {
    advisoryMessages.push("Higher resolution may improve landmark stability.");
  }

  if (report) {
    if (report.faceCount === "zero") blockingMessages.push("No usable face was detected.");
    if (report.faceCount === "multiple") blockingMessages.push("Multiple faces were detected. Use one person only.");
    if (report.availabilityState !== "available") {
      advisoryMessages.push("Local landmark detection is unavailable, so this photo requires manual review.");
    }
    advisoryMessages.push(...report.advisoryMessages);
    blockingMessages.push(...report.blockingMessages);

    const face = report.faces[0];
    if (face) {
      const maxFaceSide = Math.max(face.boundingBox.width, face.boundingBox.height);
      const minFaceSide = Math.min(face.boundingBox.width, face.boundingBox.height);
      if (maxFaceSide > 0.9) advisoryMessages.push("Face may be too close to the edge of the frame.");
      if (minFaceSide < 0.22) blockingMessages.push("Face is too small in the frame for dependable proportions.");
      const yaw = face.approximateHeadPose.yawDegrees;
      if (metadata.viewID === "front" && yaw !== null && Math.abs(yaw) > 18) {
        advisoryMessages.push("Front photo appears rotated. A straighter front view will improve the recipe.");
      }
      const mouth = face.expression.mouthOpenness;
      if (mouth !== null && mouth > 0.36) advisoryMessages.push("Mouth appears open; a neutral expression is better.");
      const leftEye = face.expression.leftEyeOpenness;
      const rightEye = face.expression.rightEyeOpenness;
      if ((leftEye !== null && leftEye < 0.1) || (rightEye !== null && rightEye < 0.1)) {
        advisoryMessages.push("One or both eyes may be closed.");
      }
      const expression = face.expression.strongExpressionLikelihood;
      if (expression !== null && expression > 0.55) advisoryMessages.push("Strong expression may affect proportions.");
    }
  } else {
    advisoryMessages.push("Face count has not been checked yet.");
  }

  advisoryMessages.push("Blur, hats, sunglasses, and severe obstruction should still be reviewed visually.");
  return {
    viewID: metadata.viewID,
    status: blockingMessages.length > 0 ? "blocked" : advisoryMessages.length > 0 ? "needs_review" : "usable",
    blockingMessages: unique(blockingMessages),
    advisoryMessages: unique(advisoryMessages),
    faceCount: report?.faceCount ?? "not_checked",
    resolution: {
      width: metadata.width,
      height: metadata.height,
      sufficient: metadata.width >= minDimension && metadata.height >= minDimension
    }
  };
}

export function calculateFc26Measurements(reportsByView: Partial<Record<Fc26ReferenceViewID, FaceLandmarkReport>>): Fc26Measurement[] {
  const front = oneFace(reportsByView.front);
  const threeQuarter = oneFace(reportsByView.threeQuarter);
  const sideProfile = oneFace(reportsByView.sideProfile);
  const faceWidth = front ? width(front, "left face edge", "right face edge") : null;
  const faceHeight = front ? height(front, "forehead top", "chin") : null;
  const cheek = front ? width(front, "left face edge", "right face edge") : null;
  const jaw = front ? width(front, "left jaw", "right jaw") : null;
  const chin = front ? width(front, "left chin edge", "right chin edge") : null;
  const noseWidth = front ? width(front, "left nose wing", "right nose wing") : null;
  const noseLength = front ? height(front, "nose bridge", "nose base") : null;
  const mouthWidth = front ? width(front, "left mouth corner", "right mouth corner") : null;
  const leftEyeWidth = front ? width(front, "left eye outer corner", "left eye inner corner") : null;
  const rightEyeWidth = front ? width(front, "right eye inner corner", "right eye outer corner") : null;
  const eyeSpacing = front ? width(front, "left eye inner corner", "right eye inner corner") : null;
  const browAverageHeight = front ? averageVerticalGap(front, ["left brow", "right brow"], ["left eye outer corner", "right eye outer corner"]) : null;
  const source = front ? "front" : threeQuarter ? "threeQuarter" : sideProfile ? "sideProfile" : "combined";

  return [
    measurement("face_width", "Face width", normalize(faceWidth, front?.boundingBox.width), "front", front, "Face width normalized to the detected face box."),
    measurement("face_height", "Face height", normalize(faceHeight, front?.boundingBox.height), "front", front, "Face height normalized to the detected face box."),
    measurement(
      "face_width_to_height_ratio",
      "Face width-to-height ratio",
      ratio(faceWidth, faceHeight),
      "front",
      front,
      "Wider values indicate a broader face relative to length."
    ),
    measurement("forehead_height", "Forehead height", normalize(height(front, "forehead top", "nose bridge"), faceHeight), "front", front, "Approximate upper-face height from RGB landmarks."),
    measurement("temple_width", "Temple width", normalize(faceWidth, faceWidth), "front", front, "Approximate temple width from face-edge landmarks."),
    measurement("cheekbone_width", "Cheekbone width", normalize(cheek, faceWidth), "front", front, "Approximate cheek width relative to face width."),
    measurement("jaw_width", "Jaw width", normalize(jaw, faceWidth), "front", front, "Jaw width relative to detected face width."),
    measurement("jaw_to_cheek_ratio", "Jaw-to-cheek ratio", ratio(jaw, cheek), "front", front, "Compares jaw width to cheek width."),
    measurement("chin_width", "Chin width", normalize(chin, faceWidth), "front", front, "Chin width relative to face width."),
    measurement("chin_length", "Chin length", normalize(height(front, "lower lip", "chin"), faceHeight), "front", front, "Lower-lip to chin distance relative to face height."),
    measurement(
      "chin_projection_estimate",
      "Chin projection estimate",
      projection(sideProfile, "lower lip", "chin"),
      "sideProfile",
      sideProfile,
      "Approximate side-view chin projection; this is not depth capture."
    ),
    measurement("eye_width", "Mean eye width", mean([leftEyeWidth, rightEyeWidth].filter(isNumber)), "front", front, "Average visible eye width normalized by image coordinates."),
    measurement("eye_height", "Eye height", null, "front", front, "Eye-height landmarks are not defensible from the current reduced landmark set."),
    measurement("eye_spacing", "Eye spacing", normalize(eyeSpacing, faceWidth), "front", front, "Distance between inner eye corners relative to face width."),
    measurement("eye_tilt", "Eye tilt", eyeTilt(front), "front", front, "Approximate line angle between outer eye corners."),
    measurement("eyebrow_height", "Eyebrow height", normalize(browAverageHeight, faceHeight), "front", front, "Average brow height above the eye area."),
    measurement("eyebrow_angle", "Eyebrow angle", eyebrowAngle(front), "front", front, "Approximate eyebrow angle from left and right brow landmarks."),
    measurement("nose_length", "Nose length", normalize(noseLength, faceHeight), "front", front, "Nose bridge-to-base length relative to face height."),
    measurement("nose_width", "Nose width", normalize(noseWidth, faceWidth), "front", front, "Nose width relative to face width."),
    measurement("nose_to_face_width_ratio", "Nose-to-face-width ratio", normalize(noseWidth, faceWidth), "front", front, "Compares nose width to face width."),
    measurement(
      "nose_projection_estimate",
      "Nose projection estimate",
      projection(sideProfile ?? threeQuarter, "nose tip", "nose bridge"),
      sideProfile ? "sideProfile" : threeQuarter ? "threeQuarter" : source,
      sideProfile ?? threeQuarter,
      "Approximate projection from profile or three-quarter RGB evidence; this is not depth capture."
    ),
    measurement("mouth_width", "Mouth width", normalize(mouthWidth, faceWidth), "front", front, "Mouth width relative to face width."),
    measurement("upper_lip_height", "Upper-lip height", normalize(height(front, "upper lip", "left mouth corner"), faceHeight), "front", front, "Approximate upper-lip vertical proportion."),
    measurement("lower_lip_height", "Lower-lip height", normalize(height(front, "lower lip", "left mouth corner"), faceHeight), "front", front, "Approximate lower-lip vertical proportion."),
    measurement("mouth_to_face_width_ratio", "Mouth-to-face-width ratio", normalize(mouthWidth, faceWidth), "front", front, "Compares mouth width to face width."),
    measurement("ear_height", "Ear height", null, "sideProfile", sideProfile, "Ear landmarks are not available in the MVP landmark set."),
    measurement("ear_projection", "Ear projection", null, "sideProfile", sideProfile, "Ear projection is unavailable without reliable ear landmarks.")
  ];
}

export function generateFc26Recipe(measurements: Fc26Measurement[], controls: Fc26ResearchControl[], now = new Date()): Fc26Recipe {
  const byID = new Map(controls.map((control) => [control.controlID, control]));
  const recommendations = controls.map((control) => {
    const recommendation = recommendationForControl(control, measurements, byID);
    return {
      ...recommendation,
      state: recommendation.status === "manual_selection_required" ? "unresolved" : "accepted",
      manualValue: "",
      userNote: ""
    } satisfies Fc26RecipeItem;
  });
  return {
    gameID: FC26_GAME_ID,
    recipeID: `fc26-recipe-${now.toISOString()}`,
    recipeVersion: FC26_RECIPE_RULE_VERSION,
    generatedAt: now.toISOString(),
    controls: recommendations,
    unsupportedControlCount: recommendations.filter((item) => item.status === "unsupported").length,
    manualSelectionCount: recommendations.filter((item) => item.status === "manual_selection_required").length,
    limitations: [
      "FC 26 preset visual meanings are not fully cataloged, so the MVP recommends directional edits rather than exact preset numbers.",
      "Measurements come from local RGB landmarks and are not identity recognition, biometric authentication, or scientific resemblance scoring.",
      "Skin, hair, facial hair, color, and presentation controls remain manual unless the user confirms them."
    ]
  };
}

export function updateFc26RecipeControl(recipe: Fc26Recipe, controlID: string, patch: Partial<Pick<Fc26RecipeItem, "state" | "manualValue" | "userNote">>): Fc26Recipe {
  return {
    ...recipe,
    controls: recipe.controls.map((control) => (control.controlID === controlID ? { ...control, ...patch } : control))
  };
}

export function createFc26Profile(input: {
  profileName: string;
  measurements: Fc26Measurement[];
  qualityReports: Fc26PhotoQualityReport[];
  recipe: Fc26Recipe;
  captureMethod?: Fc26CaptureMethod;
  selectedFrameMetadata?: Fc26SelectedSweepFrameMetadata[];
  qualityWarnings?: string[];
  iterationNumber?: number;
  userNotes?: string;
  now?: Date;
}): Fc26FaceProfile {
  const now = input.now ?? new Date();
  const blockingCount = input.qualityReports.flatMap((report) => report.blockingMessages).length;
  const completeMeasurements = input.measurements.filter((measurement) => measurement.normalizedValue !== null);
  return {
    schemaVersion: "fc26-face-profile-v1",
    gameID: FC26_GAME_ID,
    profileID: `fc26-profile-${now.toISOString()}`,
    profileName: input.profileName.trim() || "FC 26 face recipe",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    captureMethod: input.captureMethod ?? "three_photo",
    scanStatus: blockingCount > 0 ? "blocked" : completeMeasurements.length >= 10 ? "complete" : "partial",
    selectedFrameMetadata: input.selectedFrameMetadata ?? [],
    photoAnalysisStatus: blockingCount > 0 ? "blocked" : completeMeasurements.length >= 10 ? "complete" : "partial",
    measurements: input.measurements,
    qualityWarnings: unique([...input.qualityReports.flatMap((report) => [...report.blockingMessages, ...report.advisoryMessages]), ...(input.qualityWarnings ?? [])]),
    recipe: input.recipe,
    iterationNumber: input.iterationNumber ?? 1,
    userNotes: input.userNotes ?? ""
  };
}

export function serializeFc26Profile(profile: Fc26FaceProfile): string {
  const serialized = JSON.stringify(profile);
  if (/data:image|blob:|base64,/i.test(serialized)) {
    throw new Error("FC 26 profiles must not serialize raw images, object URLs, or embedded media.");
  }
  return serialized;
}

export function deserializeFc26Profile(serialized: string): Fc26FaceProfile {
  const parsed = JSON.parse(serialized) as Partial<Fc26FaceProfile>;
  if (parsed.schemaVersion !== "fc26-face-profile-v1" || parsed.gameID !== FC26_GAME_ID) {
    throw new Error("Serialized profile is not an FC 26 face profile.");
  }
  if (!Array.isArray(parsed.measurements) || !parsed.recipe) {
    throw new Error("Serialized FC 26 profile is missing measurements or recipe data.");
  }
  return parsed as Fc26FaceProfile;
}

export function saveFc26ProfileToSessionStorage(storage: Storage, profile: Fc26FaceProfile): Fc26FaceProfile[] {
  const profiles = loadFc26ProfilesFromSessionStorage(storage).filter((candidate) => candidate.profileID !== profile.profileID);
  const nextProfiles = [...profiles, profile];
  storage.setItem(FC26_FACE_PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles.map((candidate) => JSON.parse(serializeFc26Profile(candidate)))));
  return nextProfiles;
}

export function loadFc26ProfilesFromSessionStorage(storage: Storage): Fc26FaceProfile[] {
  const raw = storage.getItem(FC26_FACE_PROFILE_STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((profile) => deserializeFc26Profile(JSON.stringify(profile)));
}

export function compareFc26Screenshots(input: {
  referenceMeasurements: Fc26Measurement[];
  screenshotMeasurements: Fc26Measurement[];
  recipe: Fc26Recipe;
  iterationNumber: number;
}): Fc26ScreenshotComparisonResult {
  const controls = new Map(input.recipe.controls.map((control) => [control.controlID, control]));
  const referenceByID = new Map(input.referenceMeasurements.map((measurement) => [measurement.id, measurement]));
  const differences = input.screenshotMeasurements.flatMap((screenshotMeasurement) => {
    const reference = referenceByID.get(screenshotMeasurement.id);
    if (!reference || reference.normalizedValue === null || screenshotMeasurement.normalizedValue === null) return [];
    return [
      {
        measurementID: screenshotMeasurement.id,
        displayLabel: screenshotMeasurement.displayLabel,
        referenceValue: reference.normalizedValue,
        screenshotValue: screenshotMeasurement.normalizedValue,
        difference: round(screenshotMeasurement.normalizedValue - reference.normalizedValue),
        confidence: lowerConfidence(reference.confidence, screenshotMeasurement.confidence)
      } satisfies Fc26MeasurementDifference
    ];
  });

  const suggestions = differences
    .filter((difference) => Math.abs(difference.difference) >= 0.04)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, 6)
    .flatMap((difference) => suggestionFromDifference(difference, controls));
  const averageDistance =
    differences.length > 0 ? differences.reduce((sum, difference) => sum + Math.abs(difference.difference), 0) / differences.length : null;

  return {
    gameID: FC26_GAME_ID,
    iterationNumber: input.iterationNumber,
    comparedViews: unique(input.screenshotMeasurements.map((measurement) => measurement.sourceView).filter(isReferenceView)),
    usableViewStatus: {
      front: input.screenshotMeasurements.some((measurement) => measurement.sourceView === "front" && measurement.normalizedValue !== null) ? "usable" : "missing",
      threeQuarter: input.screenshotMeasurements.some((measurement) => measurement.sourceView === "threeQuarter" && measurement.normalizedValue !== null)
        ? "usable"
        : "missing",
      sideProfile: input.screenshotMeasurements.some((measurement) => measurement.sourceView === "sideProfile" && measurement.normalizedValue !== null)
        ? "usable"
        : "missing"
    },
    measurementDifferences: differences,
    adjustmentSuggestions: suggestions,
    internalGeometricSimilarityScore: averageDistance === null ? null : Math.max(0, Math.round((1 - Math.min(averageDistance, 0.4) / 0.4) * 100)),
    confidence: suggestions.some((suggestion) => suggestion.confidence === "medium" || suggestion.confidence === "high") ? "medium" : differences.length ? "low" : "unavailable",
    notes: [
      "This score is an internal geometric comparison across available RGB measurements, not identity confidence.",
      suggestions.length === 0 ? "No large directional mismatch was detected from available measurements." : "Use suggestions as the next manual edit pass inside FC 26."
    ]
  };
}

export function removeFc26TemporaryPhotoObjectUrls(objectUrls: string[]) {
  return unique(objectUrls.filter((objectUrl) => objectUrl.startsWith("blob:")));
}

function recommendationForControl(
  control: Fc26ResearchControl,
  measurements: Fc26Measurement[],
  _controlsByID: Map<string, Fc26ResearchControl>
): Fc26RecipeRecommendation {
  const base = {
    controlID: control.controlID,
    controlLabel: control.label,
    section: control.section,
    recommendedValue: null,
    researchEvidence: control.observedValues.slice(0, 3).map((value) => ({
      videoID: value.videoID,
      timestampSeconds: value.timestampSeconds,
      confidence: value.confidence
    }))
  };
  const directional = directionalRule(control.controlID, measurements);
  if (directional) {
    return {
      ...base,
      status: "directional_adjustment",
      direction: directional.direction,
      confidence: directional.confidence,
      reason: directional.reason,
      measurementIDs: directional.measurementIDs,
      sourceRuleID: directional.ruleID
    };
  }
  return {
    ...base,
    status: "manual_selection_required",
    direction: null,
    confidence: "low",
    reason:
      control.rangeComplete || control.observedValues.length > 0
        ? "The control is observed in FC 26 research, but the MVP does not have verified visual mapping from face measurements to exact preset values."
        : "The control has no defensible observed values for an automatic recommendation.",
    measurementIDs: [],
    sourceRuleID: "fc26-manual-selection"
  };
}

function directionalRule(controlID: string, measurements: Fc26Measurement[]) {
  const value = (id: string) =>
    measurements.find(
      (measurement) =>
        measurement.id === id &&
        measurement.normalizedValue !== null &&
        Number.isFinite(measurement.normalizedValue) &&
        measurement.reliableForRecommendation !== false
    );
  const evidenceText = (measurement: Fc26Measurement) =>
    measurement.contributingViews && measurement.contributingViews.length > 1
      ? ` across the ${measurement.contributingViews.map(formatSweepViewLabel).join(", ")} views`
      : "";
  if (controlID === "FC26_HEAD_JAW") {
    const jaw = value("jaw_to_cheek_ratio");
    if (!jaw) return null;
    return {
      ruleID: "fc26-jaw-width-direction",
      direction: jaw.normalizedValue! >= 0.72 ? "wider or more angular" : "narrower or softer",
      confidence: jaw.confidence,
      reason:
        jaw.normalizedValue! >= 0.72
          ? `Jaw width is high relative to cheek width${evidenceText(jaw)}, so start with a broader jaw preset.`
          : `Jaw width is modest relative to cheek width${evidenceText(jaw)}, so start with a narrower jaw preset.`,
      measurementIDs: ["jaw_to_cheek_ratio"]
    };
  }
  if (controlID === "FC26_HEAD_CHIN") {
    const chinLength = value("chin_length");
    const chinProjection = value("chin_projection_estimate");
    const basis = chinProjection ?? chinLength;
    if (!basis) return null;
    return {
      ruleID: "fc26-chin-direction",
      direction: (basis.normalizedValue ?? 0) >= 0.18 ? "longer or more projected" : "shorter or less projected",
      confidence: basis.confidence,
      reason: `Chin proportion is available${evidenceText(basis)}, so use it only as a directional starting point.`,
      measurementIDs: [basis.id]
    };
  }
  if (controlID === "FC26_FACE_NOSE") {
    const widthRatio = value("nose_to_face_width_ratio");
    const projection = value("nose_projection_estimate");
    const basis = projection ?? widthRatio;
    if (!basis) return null;
    return {
      ruleID: "fc26-nose-direction",
      direction: basis.id.includes("projection")
        ? (basis.normalizedValue ?? 0) >= 0.12
          ? "more projected"
          : "less projected"
        : (basis.normalizedValue ?? 0) >= 0.18
          ? "wider"
          : "narrower",
      confidence: basis.confidence,
      reason: `Nose proportions support a directional edit${evidenceText(basis)}, but not an exact FC 26 preset.`,
      measurementIDs: [basis.id]
    };
  }
  if (controlID === "FC26_FACE_EYES") {
    const spacing = value("eye_spacing");
    if (!spacing) return null;
    return {
      ruleID: "fc26-eye-spacing-direction",
      direction: (spacing.normalizedValue ?? 0) >= 0.24 ? "wider eye spacing" : "narrower eye spacing",
      confidence: spacing.confidence,
      reason: `Eye spacing is measurable${evidenceText(spacing) || " from the front view"} and can guide the Eyes preset family direction.`,
      measurementIDs: ["eye_spacing"]
    };
  }
  if (controlID === "FC26_FACE_EYEBROWS") {
    const brow = value("eyebrow_height");
    if (!brow) return null;
    return {
      ruleID: "fc26-brow-position-direction",
      direction: (brow.normalizedValue ?? 0) >= 0.12 ? "higher brow position" : "lower brow position",
      confidence: brow.confidence,
      reason: `Brow position${evidenceText(brow)} can guide manual eyebrow preset review.`,
      measurementIDs: ["eyebrow_height"]
    };
  }
  if (controlID === "FC26_FACE_MOUTH") {
    const mouth = value("mouth_to_face_width_ratio");
    if (!mouth) return null;
    return {
      ruleID: "fc26-mouth-width-direction",
      direction: (mouth.normalizedValue ?? 0) >= 0.42 ? "wider mouth" : "narrower mouth",
      confidence: mouth.confidence,
      reason: `Mouth width relative to face width${evidenceText(mouth)} supports a directional manual edit.`,
      measurementIDs: ["mouth_to_face_width_ratio"]
    };
  }
  if (controlID === "FC26_HEAD_FOREHEAD") {
    const forehead = value("forehead_height");
    if (!forehead) return null;
    return {
      ruleID: "fc26-forehead-height-direction",
      direction: (forehead.normalizedValue ?? 0) >= 0.34 ? "taller upper face" : "shorter upper face",
      confidence: forehead.confidence,
      reason: `Upper-face proportion${evidenceText(forehead)} can guide the Forehead preset direction.`,
      measurementIDs: ["forehead_height"]
    };
  }
  if (controlID === "FC26_HEAD_CHEEKS") {
    const cheek = value("cheekbone_width");
    if (!cheek) return null;
    return {
      ruleID: "fc26-cheek-width-direction",
      direction: (cheek.normalizedValue ?? 0) >= 0.9 ? "broader cheek structure" : "narrower cheek structure",
      confidence: cheek.confidence,
      reason: `Cheek width is only a coarse cue${evidenceText(cheek)}, so use it for manual review.`,
      measurementIDs: ["cheekbone_width"]
    };
  }
  if (controlID === "FC26_HEAD_EARS") {
    const ear = value("ear_projection") ?? value("ear_height");
    if (!ear) return null;
    return {
      ruleID: "fc26-ear-direction",
      direction: "manual ear review",
      confidence: "low" as const,
      reason: "Ear evidence is weak in the MVP and should be edited manually.",
      measurementIDs: [ear.id]
    };
  }
  return null;
}

function suggestionFromDifference(difference: Fc26MeasurementDifference, controls: Map<string, Fc26RecipeItem>): Fc26AdjustmentSuggestion[] {
  const mapping: Record<string, { controlID: string; lower: string; higher: string }> = {
    jaw_to_cheek_ratio: { controlID: "FC26_HEAD_JAW", lower: "make jaw narrower or softer", higher: "make jaw wider or more angular" },
    chin_length: { controlID: "FC26_HEAD_CHIN", lower: "shorten chin", higher: "lengthen chin" },
    chin_projection_estimate: { controlID: "FC26_HEAD_CHIN", lower: "reduce chin projection", higher: "increase chin projection" },
    nose_to_face_width_ratio: { controlID: "FC26_FACE_NOSE", lower: "narrow the nose", higher: "widen the nose" },
    nose_projection_estimate: { controlID: "FC26_FACE_NOSE", lower: "reduce nose projection", higher: "increase nose projection" },
    eye_spacing: { controlID: "FC26_FACE_EYES", lower: "reduce eye spacing", higher: "increase eye spacing" },
    eyebrow_height: { controlID: "FC26_FACE_EYEBROWS", lower: "lower the brow", higher: "raise the brow" },
    mouth_to_face_width_ratio: { controlID: "FC26_FACE_MOUTH", lower: "narrow the mouth", higher: "widen the mouth" },
    forehead_height: { controlID: "FC26_HEAD_FOREHEAD", lower: "try a shorter forehead", higher: "try a taller forehead" },
    cheekbone_width: { controlID: "FC26_HEAD_CHEEKS", lower: "narrow cheek structure", higher: "broaden cheek structure" }
  };
  const target = mapping[difference.measurementID];
  const control = target ? controls.get(target.controlID) : null;
  if (!target || !control) return [];
  return [
    {
      affectedControlID: target.controlID,
      affectedControlLabel: control.controlLabel,
      direction: difference.difference > 0 ? target.lower : target.higher,
      reason:
        difference.difference > 0
          ? `${difference.displayLabel} appears higher in the FC 26 screenshot than in the reference.`
          : `${difference.displayLabel} appears lower in the FC 26 screenshot than in the reference.`,
      confidence: difference.confidence,
      measurementIDs: [difference.measurementID]
    }
  ];
}

function sectionForMenu(menuID: string): Fc26ResearchControl["section"] {
  if (menuID.includes("head-skin")) return "Skin";
  if (menuID.includes("head-head")) return "Head";
  if (menuID.includes("head-face")) return "Face";
  if (menuID.includes("head-hair")) return "Hair";
  return "Other";
}

function measurement(
  id: string,
  displayLabel: string,
  normalizedValue: number | null,
  sourceView: Fc26Measurement["sourceView"],
  face: DetectedFaceLandmarks | null,
  explanation: string
): Fc26Measurement {
  const value = isNumber(normalizedValue) ? round(normalizedValue) : null;
  const warnings: string[] = [];
  if (!face) warnings.push("No one-face landmark report supports this measurement.");
  if (value === null) warnings.push("Measurement unavailable from the current RGB landmark set.");
  return {
    id,
    displayLabel,
    normalizedValue: value,
    sourceView,
    confidence: !face || value === null ? "unavailable" : face.confidence.label === "high" ? "high" : face.confidence.label === "medium" ? "medium" : "low",
    qualityWarnings: warnings,
    explanation
  };
}

function oneFace(report?: FaceLandmarkReport | null): DetectedFaceLandmarks | null {
  if (!report || report.faceCount !== "one" || report.faces.length !== 1) return null;
  return report.faces[0];
}

function point(face: DetectedFaceLandmarks | null | undefined, label: string): FaceLandmarkPoint | null {
  return face?.coreLandmarks.find((landmark) => landmark.label === label) ?? null;
}

function width(face: DetectedFaceLandmarks | null | undefined, first: string, second: string) {
  const a = point(face, first);
  const b = point(face, second);
  return a && b ? Math.abs(a.x - b.x) : null;
}

function height(face: DetectedFaceLandmarks | null | undefined, first: string, second: string) {
  const a = point(face, first);
  const b = point(face, second);
  return a && b ? Math.abs(a.y - b.y) : null;
}

function projection(face: DetectedFaceLandmarks | null | undefined, first: string, second: string) {
  const a = point(face, first);
  const b = point(face, second);
  if (!a || !b) return null;
  const zProjection = a.z !== null && b.z !== null ? Math.abs(a.z - b.z) : Math.abs(a.x - b.x);
  return normalize(zProjection, face?.boundingBox.width);
}

function ratio(numerator: number | null | undefined, denominator: number | null | undefined) {
  if (!isNumber(numerator) || !isNumber(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

function normalize(value: number | null | undefined, denominator: number | null | undefined) {
  return ratio(value, denominator);
}

function averageVerticalGap(face: DetectedFaceLandmarks | null | undefined, topLabels: string[], lowerLabels: string[]) {
  if (!face) return null;
  const tops = topLabels.map((label) => point(face, label)?.y).filter(isNumber);
  const lowers = lowerLabels.map((label) => point(face, label)?.y).filter(isNumber);
  if (tops.length === 0 || lowers.length === 0) return null;
  return Math.abs(mean(tops)! - mean(lowers)!);
}

function eyeTilt(face: DetectedFaceLandmarks | null | undefined) {
  const left = point(face, "left eye outer corner");
  const right = point(face, "right eye outer corner");
  if (!left || !right) return null;
  return round(Math.atan2(right.y - left.y, right.x - left.x));
}

function eyebrowAngle(face: DetectedFaceLandmarks | null | undefined) {
  const left = point(face, "left brow");
  const right = point(face, "right brow");
  if (!left || !right) return null;
  return round(Math.atan2(right.y - left.y, right.x - left.x));
}

function mean(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function lowerConfidence(first: Fc26ConfidenceLabel, second: Fc26ConfidenceLabel): Fc26ConfidenceLabel {
  const order: Fc26ConfidenceLabel[] = ["unavailable", "low", "medium", "high"];
  return order[Math.min(order.indexOf(first), order.indexOf(second))] ?? "unavailable";
}

function isReferenceView(value: unknown): value is Fc26ReferenceViewID {
  return value === "front" || value === "threeQuarter" || value === "sideProfile";
}

function formatSweepViewLabel(viewID: Fc26SweepViewID) {
  return FC26_SWEEP_VIEWS.find((view) => view.id === viewID)?.label.toLowerCase() ?? viewID;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
