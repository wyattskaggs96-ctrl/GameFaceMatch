import { describe, expect, it } from "vitest";
import {
  calculateFc26Measurements,
  compareFc26Screenshots,
  createFc26Profile,
  deserializeFc26Profile,
  FC26_FACE_PROFILE_STORAGE_KEY,
  FC26_GAME_ID,
  generateFc26Recipe,
  getFc26ResearchControls,
  loadFc26ProfilesFromSessionStorage,
  removeFc26TemporaryPhotoObjectUrls,
  saveFc26ProfileToSessionStorage,
  serializeFc26Profile,
  validateFc26Photo,
  type Fc26Measurement,
  type Fc26ResearchData
} from "@/lib/fc26/fc26-face-matching";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile, serializeProfile } from "@/lib/profile/standard-face-profile";
import type { DetectedFaceLandmarks, FaceLandmarkProviderMetadata, FaceLandmarkReport } from "@/types/domain";
import fc26ResearchJson from "../../data/research/fc26/player_creator_research.json";

const fc26Controls = () => getFc26ResearchControls(fc26ResearchJson as unknown as Fc26ResearchData);

describe("FC 26 face matching MVP", () => {
  it("loads FC 26 controls without duplicate IDs or College Football leakage", () => {
    const controls = fc26Controls();
    expect(controls).toHaveLength(28);
    expect(new Set(controls.map((control) => control.controlID)).size).toBe(controls.length);
    expect(controls.every((control) => control.controlID.startsWith("FC26_"))).toBe(true);
    expect(controls.some((control) => control.controlID.includes("CF27"))).toBe(false);
  });

  it("validates required photo blockers and review warnings", () => {
    const noFace = validateFc26Photo({
      viewID: "front",
      fileName: "front.jpg",
      fileType: "image/jpeg",
      fileSizeBytes: 800_000,
      width: 1080,
      height: 1080,
      landmarkReport: report([])
    });
    expect(noFace.status).toBe("blocked");
    expect(noFace.blockingMessages.join(" ")).toMatch(/No usable face/i);

    const multipleFaces = validateFc26Photo({
      viewID: "threeQuarter",
      fileName: "group.png",
      fileType: "image/png",
      fileSizeBytes: 800_000,
      width: 1080,
      height: 1080,
      landmarkReport: report([face(), face({ xOffset: 0.2 })])
    });
    expect(multipleFaces.blockingMessages.join(" ")).toMatch(/Multiple faces/i);

    const unsupported = validateFc26Photo({
      viewID: "sideProfile",
      fileName: "profile.gif",
      fileType: "image/gif",
      fileSizeBytes: 13 * 1024 * 1024,
      width: 320,
      height: 320,
      landmarkReport: null
    });
    expect(unsupported.status).toBe("blocked");
    expect(unsupported.blockingMessages.join(" ")).toMatch(/Unsupported image type/i);
    expect(unsupported.blockingMessages.join(" ")).toMatch(/12 MB/i);
    expect(unsupported.blockingMessages.join(" ")).toMatch(/resolution/i);
  });

  it("calculates normalized measurements from deterministic landmarks", () => {
    const measurements = calculateFc26Measurements({
      front: report([face()]),
      threeQuarter: report([face({ xOffset: 0.02 })]),
      sideProfile: report([face({ profile: true })])
    });
    const byID = new Map(measurements.map((measurement) => [measurement.id, measurement]));

    expect(byID.get("face_width_to_height_ratio")?.normalizedValue).toBeCloseTo(0.667, 3);
    expect(byID.get("jaw_to_cheek_ratio")?.normalizedValue).toBeCloseTo(0.72, 2);
    expect(byID.get("eye_spacing")?.normalizedValue).toBeGreaterThan(0);
    expect(byID.get("nose_projection_estimate")?.sourceView).toBe("sideProfile");
    expect(byID.get("ear_height")?.normalizedValue).toBeNull();
  });

  it("creates deterministic directional recommendations without inventing exact presets", () => {
    const recipe = generateFc26Recipe(
      calculateFc26Measurements({
        front: report([face({ wideJaw: true })]),
        sideProfile: report([face({ profile: true })])
      }),
      fc26Controls(),
      new Date("2026-08-01T00:00:00.000Z")
    );
    const jaw = recipe.controls.find((control) => control.controlID === "FC26_HEAD_JAW");
    const hair = recipe.controls.find((control) => control.controlID === "FC26_HAIR_STYLE");

    expect(recipe.gameID).toBe(FC26_GAME_ID);
    expect(jaw).toMatchObject({
      status: "directional_adjustment",
      recommendedValue: null,
      direction: expect.stringMatching(/wider|angular/i)
    });
    expect(jaw?.measurementIDs).toEqual(["jaw_to_cheek_ratio"]);
    expect(hair).toMatchObject({
      status: "manual_selection_required",
      recommendedValue: null
    });
  });

  it("keeps invalid measurement values from becoming confident recommendations", () => {
    const recipe = generateFc26Recipe(
      [
        {
          id: "jaw_to_cheek_ratio",
          displayLabel: "Jaw-to-cheek ratio",
          normalizedValue: Number.NaN,
          sourceView: "front",
          confidence: "high",
          qualityWarnings: [],
          explanation: "invalid fixture"
        }
      ],
      fc26Controls()
    );
    const jaw = recipe.controls.find((control) => control.controlID === "FC26_HEAD_JAW");
    expect(jaw?.status).toBe("manual_selection_required");
  });

  it("serializes FC 26 profiles without raw images and preserves College Football profile compatibility", () => {
    const recipe = generateFc26Recipe(calculateFc26Measurements({ front: report([face()]) }), fc26Controls(), new Date("2026-08-01T00:00:00.000Z"));
    const profile = createFc26Profile({
      profileName: "Unit FC26",
      measurements: calculateFc26Measurements({ front: report([face()]) }),
      qualityReports: [],
      recipe,
      now: new Date("2026-08-01T00:00:00.000Z")
    });
    const serialized = serializeFc26Profile(profile);
    expect(serialized).not.toMatch(/data:image|blob:|base64/i);
    expect(deserializeFc26Profile(serialized)).toMatchObject({
      gameID: FC26_GAME_ID,
      profileName: "Unit FC26"
    });

    const cf27Profile = createStandardFaceProfile({
      session: createInitialCaptureSession(new Date("2026-08-01T00:00:00.000Z")),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-08-01T00:00:00.000Z"),
      userAgent: "unit-test"
    });
    expect(serializeProfile(cf27Profile)).not.toContain(FC26_GAME_ID);
  });

  it("saves FC 26 profiles under an FC26-specific storage key", () => {
    const storage = new MemoryStorage();
    const recipe = generateFc26Recipe([], fc26Controls());
    const profile = createFc26Profile({
      profileName: "Stored FC26",
      measurements: [],
      qualityReports: [],
      recipe,
      now: new Date("2026-08-01T00:00:00.000Z")
    });
    saveFc26ProfileToSessionStorage(storage, profile);
    expect(storage.getItem(FC26_FACE_PROFILE_STORAGE_KEY)).toBeTruthy();
    expect(loadFc26ProfilesFromSessionStorage(storage)).toHaveLength(1);
    expect(storage.getItem("gameface-match:profiles")).toBeNull();
  });

  it("compares screenshots and returns directional adjustment suggestions", () => {
    const recipe = generateFc26Recipe([], fc26Controls());
    const result = compareFc26Screenshots({
      referenceMeasurements: [
        measurement("jaw_to_cheek_ratio", "Jaw-to-cheek ratio", 0.65),
        measurement("nose_to_face_width_ratio", "Nose width", 0.18)
      ],
      screenshotMeasurements: [
        measurement("jaw_to_cheek_ratio", "Jaw-to-cheek ratio", 0.8),
        measurement("nose_to_face_width_ratio", "Nose width", 0.12)
      ],
      recipe,
      iterationNumber: 2
    });
    expect(result.gameID).toBe(FC26_GAME_ID);
    expect(result.internalGeometricSimilarityScore).not.toBeNull();
    expect(result.adjustmentSuggestions.map((suggestion) => suggestion.affectedControlID)).toContain("FC26_HEAD_JAW");
    expect(result.notes.join(" ")).toMatch(/not identity confidence/i);
  });

  it("returns removable object URLs without touching non-object references", () => {
    expect(removeFc26TemporaryPhotoObjectUrls(["blob:front", "https://example.test/image.jpg", "blob:side"])).toEqual(["blob:front", "blob:side"]);
  });
});

function measurement(id: string, displayLabel: string, normalizedValue: number): Fc26Measurement {
  return {
    id,
    displayLabel,
    normalizedValue,
    sourceView: "front",
    confidence: "medium",
    qualityWarnings: [],
    explanation: "synthetic fixture"
  };
}

function report(faces: DetectedFaceLandmarks[]): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: faces.length === 0 ? "zero" : faces.length === 1 ? "one" : "multiple",
    detectedFaceCount: faces.length,
    faces,
    provider: provider(),
    confidence: { score: faces.length === 1 ? 0.8 : 0.4, label: faces.length === 1 ? "high" : "low", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: faces.length === 0 ? ["No face was detected in this image."] : faces.length > 1 ? ["Multiple faces were detected."] : [],
    createdAt: "2026-08-01T00:00:00.000Z"
  };
}

function face(options: { wideJaw?: boolean; profile?: boolean; xOffset?: number } = {}): DetectedFaceLandmarks {
  const xOffset = options.xOffset ?? 0;
  const jawLeft = options.wideJaw ? 0.26 : 0.32;
  const jawRight = options.wideJaw ? 0.74 : 0.68;
  const profileShift = options.profile ? 0.08 : 0;
  return {
    boundingBox: {
      x: 0.25 + xOffset,
      y: 0.1,
      width: 0.5,
      height: 0.75,
      confidence: { score: 0.8, label: "high", evidence: "estimated" }
    },
    coreLandmarks: [
      point("forehead top", 0.5 + xOffset, 0.1),
      point("nose tip", 0.51 + xOffset + profileShift, 0.43, options.profile ? 0.07 : 0.01),
      point("nose bridge", 0.5 + xOffset, 0.3, 0),
      point("nose base", 0.5 + xOffset, 0.49),
      point("left nose wing", 0.46 + xOffset, 0.47),
      point("right nose wing", 0.54 + xOffset, 0.47),
      point("chin", 0.5 + xOffset + (options.profile ? 0.04 : 0), 0.85, options.profile ? 0.05 : 0),
      point("left face edge", 0.25 + xOffset, 0.43),
      point("right face edge", 0.75 + xOffset, 0.43),
      point("left jaw", jawLeft + xOffset, 0.68),
      point("right jaw", jawRight + xOffset, 0.68),
      point("left chin edge", 0.42 + xOffset, 0.8),
      point("right chin edge", 0.58 + xOffset, 0.8),
      point("left eye outer corner", 0.36 + xOffset, 0.32),
      point("left eye inner corner", 0.44 + xOffset, 0.32),
      point("right eye inner corner", 0.56 + xOffset, 0.32),
      point("right eye outer corner", 0.64 + xOffset, 0.32),
      point("left mouth corner", 0.38 + xOffset, 0.61),
      point("right mouth corner", 0.62 + xOffset, 0.61),
      point("upper lip", 0.5 + xOffset, 0.58),
      point("lower lip", 0.5 + xOffset + (options.profile ? -0.02 : 0), 0.64, options.profile ? 0.01 : 0),
      point("left brow", 0.4 + xOffset, 0.26),
      point("right brow", 0.6 + xOffset, 0.26)
    ],
    approximateHeadPose: {
      yawDegrees: options.profile ? 70 : 0,
      pitchDegrees: 0,
      rollDegrees: 0,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    expression: {
      leftEyeOpenness: 0.2,
      rightEyeOpenness: 0.2,
      mouthOpenness: 0.12,
      smileLikelihood: 0.1,
      strongExpressionLikelihood: 0.1,
      confidence: { score: 0.7, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    confidence: { score: 0.8, label: "high", evidence: "estimated" }
  };
}

function point(label: string, x: number, y: number, z: number | null = null) {
  return {
    label,
    sourceIndex: 0,
    x,
    y,
    z,
    confidence: { score: 0.8, label: "high" as const, evidence: "estimated" as const }
  };
}

function provider(): FaceLandmarkProviderMetadata {
  return {
    providerName: "Synthetic fixture provider",
    packageName: "unit-test",
    packageVersion: "0",
    modelName: "synthetic",
    modelVersion: "0",
    modelSource: "unit-test",
    modelPath: "unit-test",
    license: "unit-test",
    integrityStrategy: "unit-test",
    updateStrategy: "unit-test",
    localOnly: true
  };
}

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}
