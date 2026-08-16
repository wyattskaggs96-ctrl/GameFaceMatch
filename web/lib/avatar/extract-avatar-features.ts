import {
  DEFAULT_AVATAR_FEATURE_MODEL,
  clamp,
  clampUnit,
  luminance,
  mixColor,
  type AvatarFeatureModel,
  type AvatarHairShape,
  type AvatarRgbColor
} from "@/lib/avatar/avatar-feature-model";

export interface AvatarPixelInput {
  width: number;
  height: number;
  data: Uint8ClampedArray | number[];
}

interface PixelSample extends AvatarRgbColor {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export async function extractAvatarFeatureModelFromImage(image: HTMLImageElement): Promise<AvatarFeatureModel> {
  if (typeof document === "undefined") return DEFAULT_AVATAR_FEATURE_MODEL;

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return DEFAULT_AVATAR_FEATURE_MODEL;

  const analysisSize = 128;
  const canvas = document.createElement("canvas");
  canvas.width = analysisSize;
  canvas.height = analysisSize;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return DEFAULT_AVATAR_FEATURE_MODEL;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, analysisSize, analysisSize);
  const imageData = context.getImageData(0, 0, analysisSize, analysisSize);
  return extractAvatarFeatureModelFromPixels({
    width: imageData.width,
    height: imageData.height,
    data: imageData.data
  });
}

export function extractAvatarFeatureModelFromPixels(input: AvatarPixelInput): AvatarFeatureModel {
  const notes: string[] = [];
  const skinSamples = collectSkinSamples(input);
  const centralSamples = sampleRegion(input, 0.24, 0.18, 0.76, 0.76).filter((sample) => sample.r + sample.g + sample.b > 42);
  const faceSamples = skinSamples.length >= 24 ? skinSamples : centralSamples;
  const faceBounds = boundsForSamples(faceSamples);

  if (!faceBounds || faceSamples.length < 16) {
    return {
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      analysisNotes: ["Scan analysis could not find enough stable complexion pixels; fallback synthetic player model used."]
    };
  }

  if (skinSamples.length < 24) {
    notes.push("Complexion confidence is limited; central image tones were used.");
  }

  const skinTone = averageColor(faceSamples);
  const hairSamples = collectHairSamples(input, skinTone);
  const browSamples = sampleDarkRegion(input, 0.28, 0.26, 0.72, 0.43, skinTone);
  const mouthSamples = sampleMouthRegion(input, skinTone);
  const lowerFaceDarkSamples = sampleDarkRegion(input, 0.34, 0.54, 0.66, 0.75, skinTone);

  const faceWidthRatio = (faceBounds.maxX - faceBounds.minX + 1) / input.width;
  const faceHeightRatio = (faceBounds.maxY - faceBounds.minY + 1) / input.height;
  const upperWidth = rowWidth(faceSamples, input.height, 0.26, 0.42);
  const cheekWidth = rowWidth(faceSamples, input.height, 0.42, 0.58);
  const jawWidth = rowWidth(faceSamples, input.height, 0.62, 0.78);
  const eyeDarkWidth = horizontalSpread(browSamples);
  const mouthSpread = horizontalSpread(mouthSamples);

  const hairTone = hairSamples.length > 8 ? averageColor(hairSamples) : mixColor(skinTone, { r: 20, g: 18, b: 16 }, 0.72);
  const hairPresence = clampUnit(hairSamples.length / Math.max(42, Math.round(input.width * input.height * 0.012)));
  const hairCoverage = clampUnit(hairSamples.length / Math.max(1, sampleRegion(input, 0.22, 0.04, 0.78, 0.3).length));
  const facialHairPresence = clampUnit(lowerFaceDarkSamples.length / Math.max(18, Math.round(input.width * input.height * 0.006)));

  const faceCenter = (faceBounds.minX + faceBounds.maxX) / 2 / input.width;
  const upperCenter = centerX(sampleRegion(input, 0.25, 0.2, 0.75, 0.45).filter((sample) => isSkinLike(sample, skinTone))) ?? faceCenter;
  const lowerCenter = centerX(sampleRegion(input, 0.25, 0.48, 0.75, 0.78).filter((sample) => isSkinLike(sample, skinTone))) ?? faceCenter;
  const headTilt = clamp((lowerCenter - upperCenter) * 3, -0.24, 0.24);

  const confidence = skinSamples.length > 120 ? "high" : skinSamples.length > 42 ? "medium" : "low";
  const hairShape: AvatarHairShape = hairPresence < 0.18 ? "close-cropped" : hairCoverage > 0.38 ? "short" : "unknown";

  return {
    modelVersion: "avatar-feature-model-v1",
    source: "scan-analysis",
    confidence,
    skinTone,
    skinHighlightTone: mixColor(skinTone, { r: 255, g: 226, b: 198 }, 0.32),
    skinShadowTone: mixColor(skinTone, { r: 46, g: 25, b: 20 }, 0.52),
    eyeIrisTone: averageColor(sampleDarkRegion(input, 0.28, 0.32, 0.72, 0.47, skinTone).slice(0, 80), { r: 54, g: 65, b: 70 }),
    hairTone,
    browTone: browSamples.length > 4 ? averageColor(browSamples) : mixColor(hairTone, { r: 16, g: 14, b: 13 }, 0.32),
    lipTone: mouthSamples.length > 4 ? averageColor(mouthSamples) : mixColor(skinTone, { r: 135, g: 49, b: 65 }, 0.28),
    facialHairTone: lowerFaceDarkSamples.length > 4 ? averageColor(lowerFaceDarkSamples) : mixColor(hairTone, skinTone, 0.24),
    faceWidth: normalize(faceWidthRatio, 0.22, 0.58),
    faceHeight: normalize(faceHeightRatio, 0.34, 0.78),
    jawWidth: clampUnit(jawWidth / Math.max(0.01, cheekWidth)),
    jawRoundness: clampUnit(1.12 - jawWidth / Math.max(0.01, cheekWidth)),
    cheekWidth: normalize(cheekWidth, 0.18, 0.58),
    foreheadWidth: clampUnit(upperWidth / Math.max(0.01, cheekWidth)),
    eyeSpacing: normalize(eyeDarkWidth || cheekWidth * 0.36, 0.08, 0.32),
    eyeWidth: normalize(eyeDarkWidth || cheekWidth * 0.34, 0.08, 0.34),
    eyeHeight: 0.42 + clampUnit(browSamples.length / 180) * 0.18,
    browHeight: normalize(verticalAverage(browSamples) ?? 0.35, 0.26, 0.48),
    browThickness: clampUnit(browSamples.length / 130),
    noseWidth: clampUnit(0.34 + (cheekWidth - jawWidth) * 0.7 + facialHairPresence * 0.08),
    noseLength: normalize(faceHeightRatio, 0.34, 0.72),
    mouthWidth: normalize(mouthSpread || cheekWidth * 0.38, 0.08, 0.34),
    lipFullness: clampUnit(mouthSamples.length / 90),
    hairPresence,
    hairCoverage,
    hairShape,
    facialHairPresence,
    headTilt,
    analysisNotes: notes
  };
}

function collectSkinSamples(input: AvatarPixelInput) {
  return sampleRegion(input, 0.18, 0.14, 0.82, 0.82).filter((sample) => isLikelySkinTone(sample));
}

function collectHairSamples(input: AvatarPixelInput, skinTone: AvatarRgbColor) {
  const crown = sampleRegion(input, 0.18, 0.02, 0.82, 0.32);
  return crown.filter((sample) => isDarkerThanSkin(sample, skinTone, 0.13) && sample.y < input.height * 0.34);
}

function sampleMouthRegion(input: AvatarPixelInput, skinTone: AvatarRgbColor) {
  return sampleRegion(input, 0.32, 0.55, 0.68, 0.72).filter((sample) => {
    const redBias = sample.r - (sample.g + sample.b) / 2;
    return redBias > 10 || isDarkerThanSkin(sample, skinTone, 0.1);
  });
}

function sampleDarkRegion(input: AvatarPixelInput, left: number, top: number, right: number, bottom: number, skinTone: AvatarRgbColor) {
  return sampleRegion(input, left, top, right, bottom).filter((sample) => isDarkerThanSkin(sample, skinTone, 0.11));
}

function sampleRegion(input: AvatarPixelInput, left: number, top: number, right: number, bottom: number): PixelSample[] {
  const samples: PixelSample[] = [];
  const startX = Math.max(0, Math.floor(input.width * left));
  const endX = Math.min(input.width, Math.ceil(input.width * right));
  const startY = Math.max(0, Math.floor(input.height * top));
  const endY = Math.min(input.height, Math.ceil(input.height * bottom));
  const step = Math.max(1, Math.floor(Math.min(input.width, input.height) / 64));

  for (let y = startY; y < endY; y += step) {
    for (let x = startX; x < endX; x += step) {
      const index = (y * input.width + x) * 4;
      const alpha = input.data[index + 3] ?? 255;
      if (alpha < 16) continue;
      samples.push({
        x,
        y,
        r: input.data[index] ?? 0,
        g: input.data[index + 1] ?? 0,
        b: input.data[index + 2] ?? 0
      });
    }
  }

  return samples;
}

function isLikelySkinTone(color: AvatarRgbColor) {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  const chroma = max - min;
  const brightEnough = max > 54 && min > 24;
  const warm = color.r >= color.b * 0.86 && color.g >= color.b * 0.58 && color.r >= color.g * 0.72;
  const notGreen = color.g < color.r * 1.22;
  return brightEnough && warm && notGreen && chroma > 8;
}

function isSkinLike(color: AvatarRgbColor, skinTone: AvatarRgbColor) {
  return colorDistance(color, skinTone) < 96;
}

function isDarkerThanSkin(color: AvatarRgbColor, skinTone: AvatarRgbColor, margin: number) {
  return luminance(skinTone) - luminance(color) > margin && colorDistance(color, skinTone) > 22;
}

function averageColor(samples: AvatarRgbColor[], fallback: AvatarRgbColor = DEFAULT_AVATAR_FEATURE_MODEL.skinTone): AvatarRgbColor {
  if (!samples.length) return fallback;
  const total = samples.reduce(
    (sum, sample) => ({
      r: sum.r + sample.r,
      g: sum.g + sample.g,
      b: sum.b + sample.b
    }),
    { r: 0, g: 0, b: 0 }
  );
  return {
    r: Math.round(total.r / samples.length),
    g: Math.round(total.g / samples.length),
    b: Math.round(total.b / samples.length)
  };
}

function boundsForSamples(samples: PixelSample[]): Bounds | null {
  if (!samples.length) return null;
  return samples.reduce(
    (bounds, sample) => ({
      minX: Math.min(bounds.minX, sample.x),
      maxX: Math.max(bounds.maxX, sample.x),
      minY: Math.min(bounds.minY, sample.y),
      maxY: Math.max(bounds.maxY, sample.y)
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: 0, minY: Number.POSITIVE_INFINITY, maxY: 0 }
  );
}

function rowWidth(samples: PixelSample[], imageHeight: number, top: number, bottom: number) {
  const row = samples.filter((sample) => sample.y >= imageHeight * top && sample.y <= imageHeight * bottom);
  const bounds = boundsForSamples(row);
  if (!bounds) return 0.01;
  return (bounds.maxX - bounds.minX + 1) / imageHeight;
}

function horizontalSpread(samples: PixelSample[]) {
  const bounds = boundsForSamples(samples);
  if (!bounds) return 0;
  return (bounds.maxX - bounds.minX + 1) / 128;
}

function verticalAverage(samples: PixelSample[]) {
  if (!samples.length) return null;
  const total = samples.reduce((sum, sample) => sum + sample.y, 0);
  return total / samples.length / 128;
}

function centerX(samples: PixelSample[]) {
  if (!samples.length) return null;
  const total = samples.reduce((sum, sample) => sum + sample.x, 0);
  return total / samples.length / 128;
}

function normalize(value: number, min: number, max: number) {
  return clampUnit((value - min) / (max - min));
}

function colorDistance(first: AvatarRgbColor, second: AvatarRgbColor) {
  return Math.sqrt((first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2);
}
