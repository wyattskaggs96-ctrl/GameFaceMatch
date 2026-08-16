import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GAMEFACE_3D_MODEL_URL,
  GAMEFACE_3D_MORPH_RANGES,
  GAMEFACE_3D_MORPH_TARGET_IDS,
  createGameFace3DAvatarConfig,
  createGameFace3DTestIdentities,
  createWyattMorphPresetV1,
  isGameFace3DAvatarEnabled,
  mapMeasurementsToMorphWeights,
  normalizeAvatarFeatureModel
} from "@/lib/avatar/gameface-3d-model";
import { DEFAULT_AVATAR_FEATURE_MODEL } from "@/lib/avatar/avatar-feature-model";

describe("GameFace 3D avatar pipeline", () => {
  it("defines safe bounded morph targets for the reusable neutral head", () => {
    expect(GAMEFACE_3D_MORPH_TARGET_IDS).toHaveLength(28);
    expect(GAMEFACE_3D_MORPH_RANGES.map((range) => range.id)).toEqual([...GAMEFACE_3D_MORPH_TARGET_IDS]);
    expect(GAMEFACE_3D_MORPH_RANGES.every((range) => range.min === -1 && range.neutral === 0 && range.max === 1)).toBe(true);
  });

  it("ships a GLB with matching named morph targets and no private path strings", () => {
    const glb = readGlbJson(path.join(process.cwd(), "public", GAMEFACE_3D_MODEL_URL));
    const headMesh = glb.meshes.find((mesh: { name?: string }) => mesh.name === "gameface_neutral_head_v1");

    expect(headMesh).toBeTruthy();
    expect(headMesh.extras.targetNames).toEqual([...GAMEFACE_3D_MORPH_TARGET_IDS]);
    expect(headMesh.primitives[0].targets).toHaveLength(GAMEFACE_3D_MORPH_TARGET_IDS.length);
    const serialized = JSON.stringify(glb);
    expect(serialized).not.toMatch(/source-media|wyatt|IMG_|FaceBuilder|photograph|texture/i);
  });

  it("maps scan-derived measurements to deterministic safe morph values", () => {
    const measurements = normalizeAvatarFeatureModel(DEFAULT_AVATAR_FEATURE_MODEL);
    const first = mapMeasurementsToMorphWeights(measurements);
    const second = mapMeasurementsToMorphWeights(measurements);

    expect(first).toEqual(second);
    expect(Object.keys(first)).toEqual([...GAMEFACE_3D_MORPH_TARGET_IDS]);
    expect(Object.values(first).every((value) => value >= -1 && value <= 1)).toBe(true);
  });

  it("keeps low-confidence or unsupported measurements conservative", () => {
    const config = createGameFace3DAvatarConfig({
      ...DEFAULT_AVATAR_FEATURE_MODEL,
      confidence: "low",
      faceWidth: 1,
      jawWidth: 1,
      noseLength: 1
    });

    expect(Math.abs(config.morphWeights.head_width)).toBeLessThan(0.35);
    expect(Math.abs(config.morphWeights.jaw_width)).toBeLessThan(0.35);
    expect(Math.abs(config.morphWeights.nose_length)).toBeLessThan(0.35);
  });

  it("produces materially different morphs and appearance configs for five fixture identities", () => {
    const configs = createGameFace3DTestIdentities().map(createGameFace3DAvatarConfig);
    const signatures = configs.map((config) =>
      [
        config.morphWeights.head_width,
        config.morphWeights.jaw_width,
        config.morphWeights.chin_width,
        config.morphWeights.eye_spacing,
        config.morphWeights.nose_width,
        config.morphWeights.mouth_width,
        config.appearance.skinTone.r,
        config.appearance.hairFamily,
        config.appearance.facialHairFamily
      ].join("|")
    );

    expect(new Set(signatures).size).toBe(5);
    expect(configs.some((config) => config.morphWeights.jaw_width > 0.35)).toBe(true);
    expect(configs.some((config) => config.morphWeights.head_width < -0.2)).toBe(true);
    expect(configs.some((config) => config.appearance.facialHairFamily !== "none")).toBe(true);
  });

  it("keeps Wyatt calibration as a morph preset rather than a hard-coded mesh", () => {
    const preset = createWyattMorphPresetV1();
    expect(Object.keys(preset)).toEqual([...GAMEFACE_3D_MORPH_TARGET_IDS]);
    expect(preset.head_width).toBeGreaterThan(0);
    expect(preset.jaw_width).toBeGreaterThan(0);
    expect(JSON.stringify(preset)).not.toMatch(/wyatt_head|source-media|jpg|png|glb/i);
  });

  it("enables the 3D path for local/test use and leaves production off by default", () => {
    expect(isGameFace3DAvatarEnabled({ nodeEnv: "development" })).toBe(true);
    expect(isGameFace3DAvatarEnabled({ nodeEnv: "test" })).toBe(true);
    expect(isGameFace3DAvatarEnabled({ nodeEnv: "production" })).toBe(false);
    expect(isGameFace3DAvatarEnabled({ nodeEnv: "production", vercelEnv: "preview" })).toBe(true);
    expect(isGameFace3DAvatarEnabled({ nodeEnv: "production", vercelEnv: "production" })).toBe(false);
    expect(isGameFace3DAvatarEnabled({ nodeEnv: "production", publicFlag: "true" })).toBe(true);
    expect(isGameFace3DAvatarEnabled({ nodeEnv: "development", publicFlag: "false" })).toBe(false);
  });
});

function readGlbJson(filePath: string) {
  const buffer = fs.readFileSync(filePath);
  expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  expect(jsonChunkType).toBe(0x4e4f534a);
  const json = buffer.subarray(20, 20 + jsonChunkLength).toString("utf8").trim();
  return JSON.parse(json);
}
