export interface AvatarRgbColor {
  r: number;
  g: number;
  b: number;
}

export type AvatarConfidence = "high" | "medium" | "low";

export type AvatarHairShape = "close-cropped" | "short" | "covered" | "unknown";

export interface AvatarFeatureModel {
  modelVersion: "avatar-feature-model-v1";
  source: "scan-analysis" | "fallback";
  confidence: AvatarConfidence;
  skinTone: AvatarRgbColor;
  skinHighlightTone: AvatarRgbColor;
  skinShadowTone: AvatarRgbColor;
  eyeIrisTone: AvatarRgbColor;
  hairTone: AvatarRgbColor;
  browTone: AvatarRgbColor;
  lipTone: AvatarRgbColor;
  facialHairTone: AvatarRgbColor;
  faceWidth: number;
  faceHeight: number;
  jawWidth: number;
  jawRoundness: number;
  cheekWidth: number;
  foreheadWidth: number;
  eyeSpacing: number;
  eyeWidth: number;
  eyeHeight: number;
  browHeight: number;
  browThickness: number;
  noseWidth: number;
  noseLength: number;
  mouthWidth: number;
  lipFullness: number;
  hairPresence: number;
  hairCoverage: number;
  hairShape: AvatarHairShape;
  facialHairPresence: number;
  headTilt: number;
  analysisNotes: string[];
}

export const DEFAULT_AVATAR_FEATURE_MODEL: AvatarFeatureModel = {
  modelVersion: "avatar-feature-model-v1",
  source: "fallback",
  confidence: "low",
  skinTone: { r: 168, g: 116, b: 82 },
  skinHighlightTone: { r: 217, g: 161, b: 121 },
  skinShadowTone: { r: 91, g: 54, b: 39 },
  eyeIrisTone: { r: 57, g: 76, b: 81 },
  hairTone: { r: 31, g: 27, b: 24 },
  browTone: { r: 27, g: 24, b: 22 },
  lipTone: { r: 129, g: 70, b: 66 },
  facialHairTone: { r: 39, g: 34, b: 29 },
  faceWidth: 0.52,
  faceHeight: 0.58,
  jawWidth: 0.5,
  jawRoundness: 0.48,
  cheekWidth: 0.54,
  foreheadWidth: 0.5,
  eyeSpacing: 0.48,
  eyeWidth: 0.52,
  eyeHeight: 0.45,
  browHeight: 0.52,
  browThickness: 0.44,
  noseWidth: 0.48,
  noseLength: 0.5,
  mouthWidth: 0.52,
  lipFullness: 0.42,
  hairPresence: 0.72,
  hairCoverage: 0.44,
  hairShape: "short",
  facialHairPresence: 0.12,
  headTilt: 0,
  analysisNotes: ["Fallback synthetic player model used because scan analysis was unavailable."]
};

export function clampUnit(value: number) {
  return clamp(value, 0, 1);
}

export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function mixColor(first: AvatarRgbColor, second: AvatarRgbColor, amount: number): AvatarRgbColor {
  const t = clampUnit(amount);
  return {
    r: Math.round(first.r + (second.r - first.r) * t),
    g: Math.round(first.g + (second.g - first.g) * t),
    b: Math.round(first.b + (second.b - first.b) * t)
  };
}

export function colorToHex(color: AvatarRgbColor) {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function luminance(color: AvatarRgbColor) {
  return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
}

function toHex(channel: number) {
  return clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
}
