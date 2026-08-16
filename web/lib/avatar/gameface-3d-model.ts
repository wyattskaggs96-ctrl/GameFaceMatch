import {
  DEFAULT_AVATAR_FEATURE_MODEL,
  clamp,
  clampUnit,
  mixColor,
  type AvatarConfidence,
  type AvatarFeatureModel,
  type AvatarHairShape,
  type AvatarRgbColor
} from "@/lib/avatar/avatar-feature-model";

export const GAMEFACE_3D_MODEL_URL = "/models/gameface/avatar/gameface_neutral_head_v1.glb";
export const GAMEFACE_3D_MODEL_VERSION = "gameface-neutral-head-v1";
export const GAMEFACE_3D_RENDERER_VERSION = "gameface-3d-avatar-v1";

export const GAMEFACE_3D_MORPH_TARGET_IDS = [
  "head_width",
  "head_height",
  "head_depth",
  "forehead_width",
  "forehead_height",
  "cheek_width",
  "cheek_fullness",
  "jaw_width",
  "jaw_angle",
  "jaw_depth",
  "chin_width",
  "chin_height",
  "chin_projection",
  "chin_roundness",
  "eye_spacing",
  "eye_size",
  "eye_depth",
  "brow_height",
  "nose_width",
  "nose_length",
  "nose_projection",
  "nose_bridge_height",
  "mouth_width",
  "upper_lip_fullness",
  "lower_lip_fullness",
  "ear_size",
  "ear_projection",
  "neck_width"
] as const;

export type GameFace3DMorphTargetID = (typeof GAMEFACE_3D_MORPH_TARGET_IDS)[number];

export type MeasurementConfidence = "HIGH_CONFIDENCE" | "MEDIUM_CONFIDENCE" | "LOW_CONFIDENCE" | "UNSUPPORTED";

export interface GameFace3DMorphRange {
  id: GameFace3DMorphTargetID;
  min: number;
  max: number;
  neutral: number;
  description: string;
}

export type GameFace3DMorphWeights = Record<GameFace3DMorphTargetID, number>;

export interface NormalizedFaceMeasurement {
  id: string;
  value: number;
  confidence: MeasurementConfidence;
  source: "scan-landmarks" | "scan-pixels" | "user-confirmed" | "unsupported";
}

export interface NormalizedFaceMeasurements {
  modelVersion: "normalized-face-measurements-v1";
  measurements: NormalizedFaceMeasurement[];
}

export interface GameFace3DAppearanceConfig {
  skinTone: AvatarRgbColor;
  skinHighlightTone: AvatarRgbColor;
  skinShadowTone: AvatarRgbColor;
  eyeTone: AvatarRgbColor;
  hairTone: AvatarRgbColor;
  facialHairTone: AvatarRgbColor;
  hairFamily: "close-cropped" | "short" | "covered" | "neutral";
  facialHairFamily: "none" | "light" | "medium";
  confidence: AvatarConfidence;
}

export interface GameFace3DAvatarConfig {
  rendererVersion: typeof GAMEFACE_3D_RENDERER_VERSION;
  modelVersion: typeof GAMEFACE_3D_MODEL_VERSION;
  modelUrl: typeof GAMEFACE_3D_MODEL_URL;
  morphWeights: GameFace3DMorphWeights;
  measurements: NormalizedFaceMeasurements;
  appearance: GameFace3DAppearanceConfig;
  sourceConfidence: AvatarConfidence;
  fallbackSafe: true;
}

export const GAMEFACE_3D_MORPH_RANGES: readonly GameFace3DMorphRange[] = [
  ["head_width", "Overall cranial width."],
  ["head_height", "Overall head height."],
  ["head_depth", "Forward/back head depth."],
  ["forehead_width", "Upper-face width."],
  ["forehead_height", "Upper forehead height."],
  ["cheek_width", "Mid-face cheek width."],
  ["cheek_fullness", "Forward cheek volume."],
  ["jaw_width", "Lower-face jaw width."],
  ["jaw_angle", "Jawline angle and squareness."],
  ["jaw_depth", "Forward jaw volume."],
  ["chin_width", "Chin width."],
  ["chin_height", "Chin vertical size."],
  ["chin_projection", "Forward chin projection."],
  ["chin_roundness", "Chin softness versus point."],
  ["eye_spacing", "Distance between the eyes."],
  ["eye_size", "Eye opening size."],
  ["eye_depth", "Eye socket depth."],
  ["brow_height", "Vertical brow placement."],
  ["nose_width", "Nose bridge and base width."],
  ["nose_length", "Nose vertical length."],
  ["nose_projection", "Forward nose projection."],
  ["nose_bridge_height", "Bridge height."],
  ["mouth_width", "Mouth width."],
  ["upper_lip_fullness", "Upper lip fullness."],
  ["lower_lip_fullness", "Lower lip fullness."],
  ["ear_size", "Ear size."],
  ["ear_projection", "Ear projection."],
  ["neck_width", "Neck width."]
].map(([id, description]) => ({ id: id as GameFace3DMorphTargetID, min: -1, max: 1, neutral: 0, description }));

const neutralMorphWeights = Object.fromEntries(GAMEFACE_3D_MORPH_TARGET_IDS.map((id) => [id, 0])) as GameFace3DMorphWeights;

export function isGameFace3DAvatarEnabled(input: { nodeEnv?: string; publicFlag?: string; vercelEnv?: string } = {}) {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  const publicFlag = input.publicFlag ?? process.env.NEXT_PUBLIC_GAMEFACE_3D_AVATAR_V1 ?? process.env.GAMEFACE_3D_AVATAR_V1;
  const vercelEnv = input.vercelEnv ?? process.env.VERCEL_ENV;
  if (publicFlag === "0" || publicFlag === "false") return false;
  if (publicFlag === "1" || publicFlag === "true") return true;
  if (vercelEnv === "preview") return true;
  return nodeEnv !== "production";
}

export function createGameFace3DAvatarConfig(model: AvatarFeatureModel): GameFace3DAvatarConfig {
  const measurements = normalizeAvatarFeatureModel(model);
  return {
    rendererVersion: GAMEFACE_3D_RENDERER_VERSION,
    modelVersion: GAMEFACE_3D_MODEL_VERSION,
    modelUrl: GAMEFACE_3D_MODEL_URL,
    morphWeights: mapMeasurementsToMorphWeights(measurements),
    measurements,
    appearance: mapAppearanceTo3DConfig(model),
    sourceConfidence: model.confidence,
    fallbackSafe: true
  };
}

export function normalizeAvatarFeatureModel(model: AvatarFeatureModel): NormalizedFaceMeasurements {
  const geometryConfidence = model.confidence === "low" ? "LOW_CONFIDENCE" : "MEDIUM_CONFIDENCE";
  return {
    modelVersion: "normalized-face-measurements-v1",
    measurements: [
      measurement("headWidth", model.faceWidth, geometryConfidence, "scan-pixels"),
      measurement("faceHeight", model.faceHeight, "LOW_CONFIDENCE", "scan-pixels"),
      measurement("foreheadWidth", model.foreheadWidth, geometryConfidence, "scan-pixels"),
      measurement("cheekWidth", model.cheekWidth, geometryConfidence, "scan-pixels"),
      measurement("jawWidth", model.jawWidth, geometryConfidence, "scan-pixels"),
      measurement("chinWidth", model.jawWidth * 0.62 + model.jawRoundness * 0.24, "LOW_CONFIDENCE", "scan-pixels"),
      measurement("chinHeight", model.faceHeight * 0.54 + model.jawRoundness * 0.16, "LOW_CONFIDENCE", "scan-pixels"),
      measurement("eyeSpacing", model.eyeSpacing, geometryConfidence, "scan-pixels"),
      measurement("eyeSize", (model.eyeWidth + model.eyeHeight) / 2, "LOW_CONFIDENCE", "scan-pixels"),
      measurement("noseWidth", model.noseWidth, geometryConfidence, "scan-pixels"),
      measurement("noseLength", model.noseLength, geometryConfidence, "scan-pixels"),
      measurement("mouthWidth", model.mouthWidth, geometryConfidence, "scan-pixels"),
      measurement("skinTone", colorLuma(model.skinTone), model.confidence === "low" ? "LOW_CONFIDENCE" : "MEDIUM_CONFIDENCE", "scan-pixels"),
      measurement("hairTone", colorLuma(model.hairTone), model.hairPresence > 0.2 ? "MEDIUM_CONFIDENCE" : "LOW_CONFIDENCE", "scan-pixels"),
      measurement("hairPresence", model.hairPresence, model.hairPresence > 0.12 ? "MEDIUM_CONFIDENCE" : "LOW_CONFIDENCE", "scan-pixels"),
      measurement("facialHairPresence", model.facialHairPresence, model.facialHairPresence > 0.18 ? "MEDIUM_CONFIDENCE" : "LOW_CONFIDENCE", "scan-pixels")
    ]
  };
}

export function mapMeasurementsToMorphWeights(measurements: NormalizedFaceMeasurements): GameFace3DMorphWeights {
  const get = (id: string) => measurements.measurements.find((candidate) => candidate.id === id);
  const mapped: GameFace3DMorphWeights = { ...neutralMorphWeights };
  const assign = (morph: GameFace3DMorphTargetID, measurementID: string, scale = 1) => {
    const entry = get(measurementID);
    if (!entry || entry.confidence === "UNSUPPORTED") return;
    mapped[morph] = safeMorphValue(unitToMorph(entry.value) * confidenceWeight(entry.confidence) * scale);
  };

  assign("head_width", "headWidth", 0.9);
  assign("head_height", "faceHeight", 0.55);
  assign("forehead_width", "foreheadWidth", 0.8);
  assign("cheek_width", "cheekWidth", 0.85);
  assign("cheek_fullness", "cheekWidth", 0.55);
  assign("jaw_width", "jawWidth", 0.9);
  assign("jaw_angle", "jawWidth", 0.45);
  assign("chin_width", "chinWidth", 0.7);
  assign("chin_height", "chinHeight", 0.45);
  assign("eye_spacing", "eyeSpacing", 0.8);
  assign("eye_size", "eyeSize", 0.45);
  assign("nose_width", "noseWidth", 0.75);
  assign("nose_length", "noseLength", 0.65);
  assign("mouth_width", "mouthWidth", 0.75);
  assign("upper_lip_fullness", "mouthWidth", 0.18);
  assign("lower_lip_fullness", "mouthWidth", 0.2);

  mapped.head_depth = safeMorphValue(mapped.head_width * 0.24);
  mapped.jaw_depth = safeMorphValue(mapped.jaw_width * 0.22);
  mapped.chin_projection = safeMorphValue((mapped.chin_width + mapped.chin_height) * 0.18);
  mapped.chin_roundness = safeMorphValue((get("chinWidth")?.value ?? 0.5) < 0.48 ? -0.18 : 0.18);
  mapped.eye_depth = safeMorphValue(-Math.abs(mapped.eye_size) * 0.22);
  mapped.brow_height = safeMorphValue(unitToMorph(get("eyeSize")?.value ?? 0.5) * 0.15);
  mapped.nose_projection = safeMorphValue(mapped.nose_length * 0.32 + mapped.nose_width * 0.08);
  mapped.nose_bridge_height = safeMorphValue(mapped.nose_length * 0.24);
  mapped.ear_size = safeMorphValue(mapped.head_height * 0.2);
  mapped.ear_projection = safeMorphValue(mapped.head_width * 0.18);
  mapped.neck_width = safeMorphValue(mapped.jaw_width * 0.35 + mapped.head_width * 0.18);
  return mapped;
}

export function mapAppearanceTo3DConfig(model: AvatarFeatureModel): GameFace3DAppearanceConfig {
  return {
    skinTone: model.skinTone,
    skinHighlightTone: model.skinHighlightTone,
    skinShadowTone: model.skinShadowTone,
    eyeTone: model.eyeIrisTone,
    hairTone: model.hairPresence < 0.12 ? mixColor(model.hairTone, model.skinTone, 0.72) : model.hairTone,
    facialHairTone: model.facialHairTone,
    hairFamily: hairShapeToFamily(model.hairShape, model.hairPresence),
    facialHairFamily: model.facialHairPresence < 0.16 ? "none" : model.facialHairPresence > 0.42 ? "medium" : "light",
    confidence: model.confidence
  };
}

export function createWyattMorphPresetV1(): GameFace3DMorphWeights {
  return {
    ...neutralMorphWeights,
    head_width: 0.24,
    head_height: 0.12,
    forehead_width: 0.18,
    cheek_width: 0.2,
    cheek_fullness: 0.16,
    jaw_width: 0.18,
    jaw_angle: 0.12,
    chin_width: 0.08,
    chin_height: 0.06,
    chin_projection: 0.08,
    eye_spacing: 0.1,
    nose_width: 0.04,
    nose_length: 0.1,
    mouth_width: 0.12,
    neck_width: 0.16
  };
}

export function createGameFace3DTestIdentities(): AvatarFeatureModel[] {
  return [
    DEFAULT_AVATAR_FEATURE_MODEL,
    {
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      source: "scan-analysis",
      confidence: "medium",
      skinTone: { r: 222, g: 181, b: 140 },
      skinHighlightTone: { r: 246, g: 219, b: 188 },
      skinShadowTone: { r: 128, g: 82, b: 60 },
      hairTone: { r: 162, g: 108, b: 58 },
      faceWidth: 0.32,
      faceHeight: 0.7,
      jawWidth: 0.3,
      jawRoundness: 0.62,
      eyeSpacing: 0.42,
      noseWidth: 0.38,
      noseLength: 0.62,
      mouthWidth: 0.44,
      hairPresence: 0.18,
      hairCoverage: 0.1,
      hairShape: "close-cropped"
    },
    {
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      source: "scan-analysis",
      confidence: "medium",
      skinTone: { r: 78, g: 50, b: 36 },
      skinHighlightTone: { r: 146, g: 101, b: 72 },
      skinShadowTone: { r: 34, g: 23, b: 18 },
      hairTone: { r: 14, g: 12, b: 11 },
      faceWidth: 0.78,
      faceHeight: 0.48,
      jawWidth: 0.82,
      jawRoundness: 0.34,
      cheekWidth: 0.76,
      eyeSpacing: 0.58,
      noseWidth: 0.66,
      noseLength: 0.46,
      mouthWidth: 0.68,
      hairPresence: 0.92,
      hairCoverage: 0.72,
      facialHairPresence: 0.58
    },
    {
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      source: "scan-analysis",
      confidence: "medium",
      skinTone: { r: 188, g: 127, b: 86 },
      skinHighlightTone: { r: 231, g: 171, b: 128 },
      skinShadowTone: { r: 92, g: 56, b: 38 },
      faceWidth: 0.56,
      faceHeight: 0.62,
      foreheadWidth: 0.62,
      cheekWidth: 0.48,
      jawWidth: 0.42,
      eyeSpacing: 0.66,
      noseWidth: 0.42,
      noseLength: 0.72,
      mouthWidth: 0.5,
      hairPresence: 0.64,
      hairCoverage: 0.5
    },
    {
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      source: "scan-analysis",
      confidence: "high",
      skinTone: { r: 132, g: 84, b: 58 },
      skinHighlightTone: { r: 194, g: 137, b: 94 },
      skinShadowTone: { r: 58, g: 37, b: 27 },
      faceWidth: 0.46,
      faceHeight: 0.54,
      foreheadWidth: 0.4,
      cheekWidth: 0.44,
      jawWidth: 0.54,
      jawRoundness: 0.3,
      eyeSpacing: 0.36,
      eyeWidth: 0.42,
      noseWidth: 0.54,
      noseLength: 0.42,
      mouthWidth: 0.74,
      hairPresence: 0.86,
      facialHairPresence: 0.28
    }
  ];
}

function measurement(id: string, value: number, confidence: MeasurementConfidence, source: NormalizedFaceMeasurement["source"]): NormalizedFaceMeasurement {
  return { id, value: clampUnit(value), confidence, source };
}

function confidenceWeight(confidence: MeasurementConfidence) {
  if (confidence === "HIGH_CONFIDENCE") return 1;
  if (confidence === "MEDIUM_CONFIDENCE") return 0.72;
  if (confidence === "LOW_CONFIDENCE") return 0.34;
  return 0;
}

function unitToMorph(value: number) {
  return (clampUnit(value) - 0.5) * 2;
}

function safeMorphValue(value: number) {
  return clamp(value, -1, 1);
}

function colorLuma(color: AvatarRgbColor) {
  return clampUnit((0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255);
}

function hairShapeToFamily(shape: AvatarHairShape, presence: number): GameFace3DAppearanceConfig["hairFamily"] {
  if (presence < 0.12) return "neutral";
  if (shape === "close-cropped") return "close-cropped";
  if (shape === "covered") return "covered";
  return "short";
}
