import { describe, expect, it } from "vitest";
import { extractAvatarFeatureModelFromPixels } from "@/lib/avatar/extract-avatar-features";
import { DEFAULT_AVATAR_FEATURE_MODEL, type AvatarRgbColor } from "@/lib/avatar/avatar-feature-model";
import { renderGameAvatar, renderGameAvatarSvg } from "@/lib/avatar/render-game-avatar";

describe("scan-derived synthetic game avatar", () => {
  it("extracts stable visible appearance features from local scan pixels", () => {
    const model = extractAvatarFeatureModelFromPixels(testFacePixels({ skin: { r: 172, g: 116, b: 82 }, hair: { r: 28, g: 23, b: 18 }, widthScale: 1 }));

    expect(model.source).toBe("scan-analysis");
    expect(model.skinTone.r).toBeGreaterThan(120);
    expect(model.hairPresence).toBeGreaterThan(0.1);
    expect(model.faceWidth).toBeGreaterThan(0.2);
    expect(model.faceHeight).toBeGreaterThan(0.2);
  });

  it("differentiates two users without rendering either source image", () => {
    const narrowLight = extractAvatarFeatureModelFromPixels(
      testFacePixels({ skin: { r: 214, g: 174, b: 135 }, hair: { r: 156, g: 102, b: 54 }, widthScale: 0.82 })
    );
    const broadDeep = extractAvatarFeatureModelFromPixels(
      testFacePixels({ skin: { r: 92, g: 58, b: 42 }, hair: { r: 18, g: 16, b: 15 }, widthScale: 1.18, facialHair: true })
    );

    expect(Math.abs(narrowLight.skinTone.r - broadDeep.skinTone.r)).toBeGreaterThan(50);
    expect(Math.abs(narrowLight.faceWidth - broadDeep.faceWidth)).toBeGreaterThan(0.08);
    expect(broadDeep.facialHairPresence).toBeGreaterThan(narrowLight.facialHairPresence);
    expect(renderGameAvatarSvg(narrowLight)).not.toBe(renderGameAvatarSvg(broadDeep));
  });

  it("changes complexion, hair silhouette, and face-shape cues across users", () => {
    const lightCloseCropped = {
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      skinTone: { r: 218, g: 178, b: 138 },
      skinHighlightTone: { r: 246, g: 215, b: 184 },
      skinShadowTone: { r: 122, g: 78, b: 58 },
      hairTone: { r: 78, g: 56, b: 36 },
      hairPresence: 0.08,
      hairCoverage: 0.08,
      hairShape: "close-cropped" as const,
      faceWidth: 0.3,
      faceHeight: 0.62,
      jawWidth: 0.28
    };
    const deepShortHair = {
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      skinTone: { r: 74, g: 48, b: 35 },
      skinHighlightTone: { r: 142, g: 96, b: 69 },
      skinShadowTone: { r: 32, g: 22, b: 17 },
      hairTone: { r: 12, g: 11, b: 10 },
      hairPresence: 0.94,
      hairCoverage: 0.68,
      hairShape: "short" as const,
      faceWidth: 0.76,
      faceHeight: 0.5,
      jawWidth: 0.78
    };

    const lightSvg = renderGameAvatarSvg(lightCloseCropped);
    const deepSvg = renderGameAvatarSvg(deepShortHair);

    expect(lightSvg).toContain("#dab28a");
    expect(deepSvg).toContain("#4a3023");
    expect(lightSvg).toContain("data-avatar-part=\"close-cropped-hair-texture\"");
    expect(deepSvg.match(/data-avatar-part=\"hair-strand\"/g)?.length).toBe(18);
    expect(lightSvg).not.toContain("data-avatar-part=\"hair-strand\"");
    expect(lightSvg).not.toBe(deepSvg);
  });

  it("renders deterministically as a procedural SVG data URL", () => {
    const first = renderGameAvatar(DEFAULT_AVATAR_FEATURE_MODEL);
    const second = renderGameAvatar(DEFAULT_AVATAR_FEATURE_MODEL);

    expect(first).toEqual(second);
    expect(first.dataUrl).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(first.dataUrl)).toContain("Synthetic GameFace player portrait");
  });

  it("does not include raw image, photo texture, or canvas drawImage paths in the final renderer", () => {
    const svg = renderGameAvatarSvg(DEFAULT_AVATAR_FEATURE_MODEL);
    const rendererSource = renderGameAvatarSvg.toString();

    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("href=");
    expect(svg).not.toContain("background-image");
    expect(rendererSource).not.toContain("drawImage");
    expect(rendererSource).not.toContain("HTMLImageElement");
  });

  it("renders as a part-based sports-player portrait instead of a flat single-layer icon", () => {
    const svg = renderGameAvatarSvg(DEFAULT_AVATAR_FEATURE_MODEL);

    expect(svg.match(/data-avatar-part=/g)?.length).toBeGreaterThanOrEqual(20);
    expect(svg).toContain("data-avatar-part=\"jersey-neckline\"");
    expect(svg).toContain("data-avatar-part=\"cheek-plane-left\"");
    expect(svg).toContain("data-avatar-part=\"under-eye-plane\"");
    expect(svg).toContain("url(#helmetGlass)");
  });
});

function testFacePixels(input: { skin: AvatarRgbColor; hair: AvatarRgbColor; widthScale: number; facialHair?: boolean }) {
  const width = 128;
  const height = 128;
  const data = new Uint8ClampedArray(width * height * 4);
  fill(data, width, height, { r: 10, g: 14, b: 22 });

  const cx = 64;
  const faceRx = 28 * input.widthScale;
  const faceRy = 42;
  for (let y = 18; y < 104; y += 1) {
    for (let x = 10; x < 118; x += 1) {
      const face = ((x - cx) / faceRx) ** 2 + ((y - 62) / faceRy) ** 2 <= 1;
      if (face) setPixel(data, width, x, y, input.skin);
      const hair = ((x - cx) / (faceRx * 1.08)) ** 2 + ((y - 31) / 22) ** 2 <= 1 && y < 43;
      if (hair) setPixel(data, width, x, y, input.hair);
    }
  }

  drawEllipse(data, width, 46, 58, 8, 3, { r: 32, g: 38, b: 42 });
  drawEllipse(data, width, 82, 58, 8, 3, { r: 32, g: 38, b: 42 });
  drawEllipse(data, width, 64, 83, 14, 3, { r: 128, g: 61, b: 66 });
  if (input.facialHair) drawEllipse(data, width, 64, 91, 22, 10, input.hair);

  return { width, height, data };
}

function fill(data: Uint8ClampedArray, width: number, height: number, color: AvatarRgbColor) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) setPixel(data, width, x, y, color);
  }
}

function drawEllipse(data: Uint8ClampedArray, width: number, cx: number, cy: number, rx: number, ry: number, color: AvatarRgbColor) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) setPixel(data, width, x, y, color);
    }
  }
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, color: AvatarRgbColor) {
  const index = (y * width + x) * 4;
  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
  data[index + 3] = 255;
}
