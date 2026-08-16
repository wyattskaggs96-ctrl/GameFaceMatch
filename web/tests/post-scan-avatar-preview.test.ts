import { describe, expect, it } from "vitest";
import { createPostScanAvatarPreviewModel } from "@/lib/post-scan/avatar-preview";
import type { AppearanceAttribute, FacialMeasurement, StandardFaceProfile } from "@/types/domain";

describe("post-scan avatar preview", () => {
  it("falls back to a deterministic generic sports-avatar model when no profile is available", () => {
    const first = createPostScanAvatarPreviewModel(null);
    const second = createPostScanAvatarPreviewModel(null);

    expect(first).toEqual(second);
    expect(first.source).toBe("fallback");
    expect(first.skinTone).toMatch(/^#/);
    expect(first.hairVariant).not.toBeUndefined();
  });

  it("derives safe visual variation from the completed profile without requiring raw media", () => {
    const profile = profileFixture({
      id: "profile-unit-a",
      attributes: [
        attribute("skinPresentation", "Skin presentation used by the game", "deep brown"),
        attribute("hairColorFamily", "Hair color family", "black"),
        attribute("hairTextureFamily", "Hair texture family", "curly"),
        attribute("hairstyleFamily", "Hairstyle family", "short curls"),
        attribute("facialHairPresence", "Facial-hair presence", "yes"),
        attribute("facialHairStyleFamily", "Facial-hair style family", "beard"),
        attribute("eyebrowThickness", "Eyebrow thickness", "thick")
      ]
    });

    const preview = createPostScanAvatarPreviewModel(profile);

    expect(preview.source).toBe("profile");
    expect(preview.skinTone).toBe("#754631");
    expect(preview.hairColor).toBe("#161312");
    expect(preview.hairVariant).toBe("curly");
    expect(preview.facialHair).toBe("beard");
    expect(preview.browWeight).toBeGreaterThan(5);
  });

  it("keeps separate completed scan profiles visually stable but distinct", () => {
    const first = createPostScanAvatarPreviewModel(profileFixture({ id: "profile-unit-a" }));
    const second = createPostScanAvatarPreviewModel(profileFixture({ id: "profile-unit-b" }));

    expect(first).toEqual(createPostScanAvatarPreviewModel(profileFixture({ id: "profile-unit-a" })));
    expect(first.seed).not.toBe(second.seed);
    expect(first.jerseyColor).not.toBe(second.jerseyColor);
  });
});

function profileFixture(input: { id: string; attributes?: AppearanceAttribute[] }): StandardFaceProfile {
  return {
    id: input.id,
    profileContractVersion: "standard-face-profile-contract-v2",
    profileVersion: "standard-face-profile-v2",
    createdAt: "2026-08-15T20:00:00.000Z",
    capture: {
      mode: "webRgbGuided",
      deviceModel: "browser",
      capturedAt: "2026-08-15T20:00:00.000Z",
      overallQuality: 1,
      operatingSystemVersion: "unknown",
      appVersion: "test",
      browserRgbOnly: true
    },
    qualityReport: {
      overallScore: 1,
      requiredAnglesComplete: true,
      isUsableForPrototype: true,
      blockingIssueCount: 0,
      advisoryIssueCount: 0,
      issues: []
    },
    geometry: {
      modelVersion: "test",
      unavailableMeasurements: [],
      measurements: {
        faceWidthRatio: measurement(0.74),
        faceLengthRatio: measurement(0.68),
        jawWidthRatio: measurement(0.61)
      }
    },
    appearance: {
      modelVersion: "test",
      attributes: input.attributes ?? []
    },
    confidence: {
      overall: confidence(),
      captureQuality: confidence(),
      geometry: confidence(),
      appearance: confidence(),
      evidenceCompleteness: confidence()
    },
    supportingFrames: {
      totalFrameCount: 5,
      availableAngleIDs: ["straightOn", "left45", "right45", "leftProfile", "rightProfile"],
      requiredAngleCount: 5,
      profileAngleCount: 2,
      depthFrameCount: 0,
      byAngle: {
        straightOn: { angleID: "straightOn", available: true, frameCount: 1 },
        left45: { angleID: "left45", available: true, frameCount: 1 },
        right45: { angleID: "right45", available: true, frameCount: 1 },
        leftProfile: { angleID: "leftProfile", available: true, frameCount: 1 },
        rightProfile: { angleID: "rightProfile", available: true, frameCount: 1 }
      }
    },
    userConfirmedAttributes: input.attributes ?? [],
    modelVersions: {
      profileContract: "standard-face-profile-contract-v2",
      profileBuilder: "test",
      geometry: "test",
      appearance: "test",
      captureQuality: "test",
      measurementAlgorithm: "test",
      landmarkProvider: "test"
    },
    deletionState: {
      status: "active",
      deletedAt: null,
      deletionRecordID: null,
      reason: null
    },
    sourceAngleAvailability: {
      straightOn: { angleID: "straightOn", available: true },
      left45: { angleID: "left45", available: true },
      right45: { angleID: "right45", available: true },
      leftProfile: { angleID: "leftProfile", available: true },
      rightProfile: { angleID: "rightProfile", available: true }
    }
  };
}

function attribute(category: AppearanceAttribute["category"], label: string, value: string): AppearanceAttribute {
  return {
    id: category,
    category,
    label,
    value,
    required: true,
    userConfirmed: true,
    source: "userConfirmed",
    confidence: confidence()
  };
}

function measurement(value: number): FacialMeasurement {
  return {
    value,
    confidence: confidence(),
    supportingFrameCount: 5,
    supportingPoses: ["straightOn"],
    variance: 0.01,
    depthSupported: false,
    profileEvidenceExists: true,
    occlusionImpact: "none",
    occlusionStatus: "none",
    measurementSource: "browserRgbImage",
    availabilityState: "available",
    algorithmVersion: "test"
  };
}

function confidence() {
  return {
    score: 1,
    label: "high" as const
  };
}
