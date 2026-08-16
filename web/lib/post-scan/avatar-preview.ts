import type { StandardFaceProfile, UserConfirmedAttributeCategory } from "@/types/domain";

export interface PostScanAvatarPreviewModel {
  source: "profile" | "fallback";
  seed: number;
  skinTone: string;
  skinShadow: string;
  hairColor: string;
  browColor: string;
  jerseyColor: string;
  accentColor: string;
  faceWidth: number;
  faceHeight: number;
  jawCurve: number;
  hairVariant: "short" | "curly" | "cropped" | "none";
  facialHair: "none" | "stubble" | "beard";
  browWeight: number;
}

const DEFAULT_SKIN = { base: "#b9805f", shadow: "#7e4d38" };
const JERSEY_COLORS = ["#2257f5", "#256a5f", "#6138b8", "#a63446", "#2d6a2f", "#31506f"] as const;
const ACCENT_COLORS = ["#83d4ff", "#d5ff73", "#ffc857", "#ff8da1", "#93f0c4", "#bfb6ff"] as const;

export function createPostScanAvatarPreviewModel(profile: StandardFaceProfile | null): PostScanAvatarPreviewModel {
  const seed = profile ? stableHash(`${profile.id}:${profile.createdAt}:${profile.supportingFrames.availableAngleIDs.join("|")}`) : 11;
  const skin = resolveSkinTone(readAttribute(profile, "skinPresentation"));
  const hairColor = resolveHairColor(readAttribute(profile, "hairColorFamily"), seed);
  const faceWidthMeasurement = profile?.geometry.measurements.faceWidthRatio?.value ?? null;
  const faceLengthMeasurement = profile?.geometry.measurements.faceLengthRatio?.value ?? null;
  const jawWidthMeasurement = profile?.geometry.measurements.jawWidthRatio?.value ?? null;
  const hairVariant = resolveHairVariant(readAttribute(profile, "hairstyleFamily"), readAttribute(profile, "hairTextureFamily"), seed);
  const facialHair = resolveFacialHair(readAttribute(profile, "facialHairPresence"), readAttribute(profile, "facialHairStyleFamily"));
  const browWeight = resolveBrowWeight(readAttribute(profile, "eyebrowThickness"));

  return {
    source: profile ? "profile" : "fallback",
    seed,
    skinTone: skin.base,
    skinShadow: skin.shadow,
    hairColor,
    browColor: darkenHex(hairColor, 0.38),
    jerseyColor: JERSEY_COLORS[seed % JERSEY_COLORS.length],
    accentColor: ACCENT_COLORS[seed % ACCENT_COLORS.length],
    faceWidth: clamp(scaleMeasurement(faceWidthMeasurement, 42, 34, 48, seed % 5), 34, 48),
    faceHeight: clamp(scaleMeasurement(faceLengthMeasurement, 52, 46, 59, seed % 4), 46, 59),
    jawCurve: clamp(scaleMeasurement(jawWidthMeasurement, 27, 20, 34, seed % 6), 20, 34),
    hairVariant,
    facialHair,
    browWeight
  };
}

function readAttribute(profile: StandardFaceProfile | null, category: UserConfirmedAttributeCategory): string | null {
  const value = profile?.appearance.attributes.find((attribute) => attribute.category === category)?.value;
  return typeof value === "string" && value !== "unspecified" && value.trim() ? value.toLowerCase() : null;
}

function resolveSkinTone(value: string | null) {
  if (!value) return DEFAULT_SKIN;
  if (value.includes("fair") || value.includes("light")) return { base: "#d9aa85", shadow: "#a46f50" };
  if (value.includes("medium") || value.includes("olive") || value.includes("tan")) return { base: "#bd825c", shadow: "#805039" };
  if (value.includes("brown") || value.includes("dark") || value.includes("deep")) return { base: "#754631", shadow: "#4b2a21" };
  return DEFAULT_SKIN;
}

function resolveHairColor(value: string | null, seed: number) {
  if (!value) return seed % 2 === 0 ? "#211815" : "#3a261c";
  if (value.includes("blond") || value.includes("blonde")) return "#c89b43";
  if (value.includes("red") || value.includes("auburn")) return "#8e3f22";
  if (value.includes("brown")) return "#3c2419";
  if (value.includes("black")) return "#161312";
  if (value.includes("gray") || value.includes("grey")) return "#76716c";
  return seed % 2 === 0 ? "#211815" : "#3a261c";
}

function resolveHairVariant(hairstyle: string | null, texture: string | null, seed: number): PostScanAvatarPreviewModel["hairVariant"] {
  if (hairstyle?.includes("bald") || hairstyle?.includes("shaved") || hairstyle?.includes("none")) return "none";
  if (texture?.includes("curl") || hairstyle?.includes("curl") || hairstyle?.includes("afro")) return "curly";
  if (hairstyle?.includes("crop") || hairstyle?.includes("short") || seed % 3 === 0) return "cropped";
  return "short";
}

function resolveFacialHair(presence: string | null, style: string | null): PostScanAvatarPreviewModel["facialHair"] {
  if (presence !== "yes") return "none";
  if (style?.includes("beard") || style?.includes("goatee")) return "beard";
  return "stubble";
}

function resolveBrowWeight(value: string | null) {
  if (!value) return 4.2;
  if (value.includes("thin") || value.includes("light")) return 3;
  if (value.includes("thick") || value.includes("heavy")) return 5.6;
  return 4.2;
}

function scaleMeasurement(value: number | null, fallback: number, min: number, max: number, offset: number) {
  if (value === null || !Number.isFinite(value)) return fallback + offset - 2;
  return min + value * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function darkenHex(hex: string, amount: number) {
  const normalized = hex.replace("#", "");
  const channels = [0, 2, 4].map((start) => parseInt(normalized.slice(start, start + 2), 16));
  return `#${channels.map((channel) => Math.max(0, Math.round(channel * (1 - amount))).toString(16).padStart(2, "0")).join("")}`;
}
