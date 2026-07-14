import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import { createBuildInstructions, createRecommendationExplanationReport, createResultsState, getTieGroups, validateBuildInstructions } from "@/lib/results/results-experience";
import { createSafeShareCard } from "@/lib/share/share-card";
import { migrateStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import type { AppearanceAttribute, FacialMeasurement, GameCatalogManifest, StandardFaceProfile } from "@/types/domain";

const fixtureCatalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "..", "data", "fixtures", "test-only", "matching", "synthetic-catalog.json"), "utf8")
) as GameCatalogManifest;

describe("results experience state", () => {
  it("shows catalog unavailable instead of fake production results", () => {
    const state = createResultsState({
      profile: syntheticProfile(),
      catalogIsEmpty: productionCatalogManifest.items.length === 0,
      matches: []
    });
    expect(state.kind).toBe("catalogUnavailable");
    expect(state.title).toBe(CATALOG_UNAVAILABLE_MESSAGE);
    expect(state.matches).toEqual([]);
  });

  it("does not render fixture recommendations when the production catalog is unavailable", () => {
    const fixtureMatches = createRuleBasedMatchingEngine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true });
    const state = createResultsState({
      profile: syntheticProfile(),
      catalogIsEmpty: true,
      matches: fixtureMatches
    });

    expect(fixtureMatches.length).toBeGreaterThan(0);
    expect(state.kind).toBe("catalogUnavailable");
    expect(state.matches).toEqual([]);
    expect(JSON.stringify(state)).not.toContain("synthetic-match-alpha");
    expect(JSON.stringify(state)).not.toContain("synthetic-label-alpha");
  });

  it("blocks results when profile evidence is incomplete", () => {
    const profile = syntheticProfile();
    profile.sourceAngleAvailability.rightProfile = { angleID: "rightProfile", available: false };
    const state = createResultsState({ profile, catalogIsEmpty: false });
    expect(state.kind).toBe("insufficientProfileData");
  });

  it("supports top-three development fixture behavior without production catalog records", () => {
    const matches = createRuleBasedMatchingEngine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true });
    const state = createResultsState({ profile: syntheticProfile(), catalogIsEmpty: false, matches });
    expect(state.kind).toBe("topThree");
    expect(state.matches.map((match) => match.catalogItem.stableInternalID)).toEqual([
      "synthetic-match-alpha",
      "synthetic-match-gamma",
      "synthetic-match-beta"
    ]);
  });

  it("does not expose fixture matches unless explicitly allowed by the test/dev path", () => {
    const matches = createRuleBasedMatchingEngine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog });
    expect(matches).toEqual([]);
  });

  it("surfaces tie groups for comparison copy", () => {
    const tiedCatalog = {
      ...fixtureCatalog,
      items: [
        { ...fixtureCatalog.items[0], stableInternalID: "synthetic-result-tie-a" },
        { ...fixtureCatalog.items[0], stableInternalID: "synthetic-result-tie-b" }
      ]
    };
    const matches = createRuleBasedMatchingEngine().matchTopThree({ profile: syntheticProfile(), catalog: tiedCatalog, allowTestFixtures: true });
    expect(getTieGroups(matches)[0].map((match) => match.catalogItem.stableInternalID)).toEqual(["synthetic-result-tie-a", "synthetic-result-tie-b"]);
  });

  it("renders generic build-guide fields from verified catalog instructions", () => {
    const match = createRuleBasedMatchingEngine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true })[0];
    const instruction = createBuildInstructions(match)[0];
    expect(instruction.gameTitle).toBe("SYNTHETIC_TEST_GAME_DO_NOT_USE");
    expect(instruction.instructionKind).toBe("headOption");
    expect(instruction.menuCategory).toBe("synthetic-test-category");
    expect(instruction.verifiedGameLabel).toBe("synthetic-label-alpha");
    expect(instruction.nativeHeadOption).toBe("synthetic-label-alpha");
    expect(instruction.navigationPath).toEqual(["synthetic-test-navigation"]);
    expect(instruction.platform).toBe("synthetic-test-platform");
    expect(instruction.gameVersion).toBe("synthetic-test-version");
    expect(instruction.patchVersion).toBe("synthetic-test-patch");
    expect(instruction.mode).toBe("synthetic-test-mode");
    expect(instruction.creationPath).toBe("synthetic-test-path");
    expect(instruction.verificationDate).toBe("2026-07-10T00:00:00.000Z");
    expect(instruction.limitations.join(" ")).toMatch(/verified native game values/i);
  });

  it("generates exact verified reproduction instructions for selected visual recommendations and body controls", () => {
    const catalog = catalogWithBuildGuideAnnotations();
    const match = createRuleBasedMatchingEngine().matchTopThree({
      profile: syntheticProfileWithConfirmedAppearance(),
      catalog,
      allowTestFixtures: true
    })[0];
    const instructions = createBuildInstructions(match);
    const validation = validateBuildInstructions(match, instructions);

    expect(validation).toEqual({ ok: true, errors: [] });
    expect(instructions.map((instruction) => instruction.instructionKind)).toEqual([
      "headOption",
      "hairstyle",
      "hairColor",
      "facialHair",
      "facialHairColor",
      "eyebrows",
      "skinPresentation",
      "otherVerifiedControl",
      "height",
      "weight",
      "bodySelection"
    ]);
    expect(instructions.every((instruction) => instruction.relatedCatalogItemID === match.catalogItem.stableInternalID)).toBe(true);
    expect(instructions.every((instruction) => instruction.gameTitle === "SYNTHETIC_TEST_GAME_DO_NOT_USE")).toBe(true);
    expect(instructions.every((instruction) => instruction.nativeHeadOption === "synthetic-label-alpha")).toBe(true);
    expect(instructions.every((instruction) => instruction.navigationPath[0] === "Road to Glory")).toBe(true);
    expect(instructions.find((instruction) => instruction.instructionKind === "hairstyle")).toMatchObject({
      verifiedGameLabel: "SYNTHETIC_NATIVE_HAIRSTYLE_ALPHA",
      navigationPath: ["Road to Glory", "Player", "Appearance", "Hair", "Hairstyle"],
      sourceAnnotationKey: "verifiedHairstyleNativeValue"
    });
    expect(instructions.find((instruction) => instruction.instructionKind === "skinPresentation")).toMatchObject({
      verifiedGameLabel: "SYNTHETIC_NATIVE_SKIN_PRESENTATION_ALPHA",
      navigationPath: ["Road to Glory", "Player", "Appearance", "Head & Skin", "Skin Tone"]
    });
    expect(instructions.find((instruction) => instruction.instructionKind === "bodySelection")).toMatchObject({
      verifiedGameLabel: "SYNTHETIC_NATIVE_BODY_SELECTION_ALPHA",
      navigationPath: ["Road to Glory", "Player", "Player Info", "Body Type"]
    });
  });

  it("does not create appearance instructions when a verified menu path is unavailable", () => {
    const catalog = catalogWithBuildGuideAnnotations({
      verifiedHairstyleMenuPath: "",
      verifiedHairColorMenuPath: ""
    });
    const match = createRuleBasedMatchingEngine().matchTopThree({
      profile: syntheticProfileWithConfirmedAppearance(),
      catalog,
      allowTestFixtures: true
    })[0];
    const instructions = createBuildInstructions(match);

    expect(instructions.map((instruction) => instruction.instructionKind)).not.toContain("hairstyle");
    expect(instructions.map((instruction) => instruction.instructionKind)).not.toContain("hairColor");
    expect(instructions.map((instruction) => instruction.sequenceNumber)).toEqual(instructions.map((_, index) => index + 1));
    expect(validateBuildInstructions(match, instructions).ok).toBe(true);
  });

  it("generates a structured top-three recommendation explanation without identity-probability language", () => {
    const profile = syntheticProfile();
    const matches = createRuleBasedMatchingEngine().matchTopThree({ profile, catalog: fixtureCatalog, allowTestFixtures: true });
    const report = createRecommendationExplanationReport({ profile, matches });

    expect(report.title).toBe("Top three closest available settings");
    expect(report.scoreLanguage).toBe("Match score based on available game options.");
    expect(report.captureQuality).toMatch(/5 of 5 RGB angles available/);
    expect(report.recommendations.map((recommendation) => recommendation.position)).toEqual(["Best match", "Second match", "Third match"]);
    expect(report.recommendations.map((recommendation) => recommendation.catalogItemID)).toEqual([
      "synthetic-match-alpha",
      "synthetic-match-gamma",
      "synthetic-match-beta"
    ]);
    const best = report.recommendations[0];
    expect(best.matchScore).toBe(matches[0].score);
    expect(best.confidence.label).toBe(matches[0].confidence.label);
    expect(best.keyReasons.length).toBeGreaterThan(0);
    expect(best.keyDifferences.length).toBeGreaterThan(0);
    expect(best.catalogVersion).toBe("synthetic-test-catalog-v1");
    expect(best.verificationDate).toBe("2026-07-10T00:00:00.000Z");
    expect(best.stepByStepGameInstructions[0]).toMatchObject({
      stepNumber: 1,
      gameTitle: "SYNTHETIC_TEST_GAME_DO_NOT_USE",
      instructionKind: "headOption",
      menuCategory: "synthetic-test-category",
      exactVerifiedGameLabel: "synthetic-label-alpha",
      nativeHeadOption: "synthetic-label-alpha",
      platform: "synthetic-test-platform",
      gameVersion: "synthetic-test-version",
      patchVersion: "synthetic-test-patch",
      mode: "synthetic-test-mode",
      creationPath: "synthetic-test-path",
      verificationDate: "2026-07-10T00:00:00.000Z"
    });
    expect(JSON.stringify(report).toLowerCase()).not.toMatch(/percent identical|% identical|identity probability/);
    expect(report.limitations.join(" ")).toMatch(/do not identify a person/i);
  });

  it("returns an empty explanation report when no verified matches are supplied", () => {
    const report = createRecommendationExplanationReport({ profile: syntheticProfile(), matches: [] });
    expect(report.recommendations).toEqual([]);
    expect(report.limitations.join(" ")).toMatch(/verified catalog navigation evidence/i);
  });

  it("defaults share cards to text-only settings", () => {
    const share = createSafeShareCard({
      buildInstructions: [],
      includeFaceImage: false,
      faceImageObjectUrl: "blob:should-not-share"
    });
    expect(share.includesFaceImage).toBe(false);
    expect(share.faceImageObjectUrl).toBeUndefined();
    expect(share.text).toContain(CATALOG_UNAVAILABLE_MESSAGE);
  });
});

function syntheticProfile(): StandardFaceProfile {
  return migrateStandardFaceProfile({
    id: "synthetic-results-profile",
    profileVersion: "synthetic-test-profile",
    createdAt: "2026-07-10T00:00:00.000Z",
    capture: {
      mode: "webRgbGuided",
      deviceModel: "synthetic-test-browser",
      capturedAt: "2026-07-10T00:00:00.000Z",
      overallQuality: 1,
      operatingSystemVersion: "synthetic-test-os",
      appVersion: "synthetic-test-app",
      browserRgbOnly: true
    },
    qualityReport: {
      overallScore: 1,
      issues: [],
      isUsableForPrototype: true,
      requiredAnglesComplete: true
    },
    geometry: {
      modelVersion: "synthetic-test-geometry",
      unavailableMeasurements: [],
      measurements: {
        faceWidthRatio: measurement(0.7),
        jawWidthRatio: measurement(0.61),
        eyeSpacingRatio: measurement(0.32),
        noseWidthRatio: measurement(0.22),
        mouthWidthRatio: measurement(0.43)
      }
    },
    appearance: {
      modelVersion: "synthetic-user-confirmed",
      attributes: [
        attribute("hairColorFamily", "brown"),
        attribute("facialHairPresence", "yes"),
        attribute("preferredBodyType", "muscular")
      ]
    },
    sourceAngleAvailability: {
      straightOn: { angleID: "straightOn", available: true },
      left45: { angleID: "left45", available: true },
      right45: { angleID: "right45", available: true },
      leftProfile: { angleID: "leftProfile", available: true },
      rightProfile: { angleID: "rightProfile", available: true }
    }
  });
}

function syntheticProfileWithConfirmedAppearance(input: Partial<Record<AppearanceAttribute["category"], string>> = {}): StandardFaceProfile {
  const profile = syntheticProfile();
  profile.appearance.attributes = [
    attribute("hairColorFamily", input.hairColorFamily ?? "brown"),
    attribute("hairTextureFamily", input.hairTextureFamily ?? "wavy"),
    attribute("hairstyleFamily", input.hairstyleFamily ?? "short"),
    attribute("facialHairPresence", input.facialHairPresence ?? "yes"),
    attribute("facialHairStyleFamily", input.facialHairStyleFamily ?? "beard"),
    attribute("facialHairColorFamily", input.facialHairColorFamily ?? "brown"),
    attribute("eyebrowThickness", input.eyebrowThickness ?? "medium"),
    attribute("skinPresentation", input.skinPresentation ?? "synthetic-skin-alpha"),
    attribute("visibleMarks", input.visibleMarks ?? "freckles"),
    attribute("preferredBodyType", input.preferredBodyType ?? "muscular")
  ];
  profile.userConfirmedAttributes = profile.appearance.attributes;
  return profile;
}

function measurement(value: number): FacialMeasurement {
  return {
    value,
    confidence: {
      score: 0.96,
      label: "high"
    },
    supportingFrameCount: 5,
    supportingPoses: ["straightOn", "left45", "right45", "leftProfile", "rightProfile"],
    variance: 0.01,
    depthSupported: false,
    profileEvidenceExists: false,
    occlusionImpact: "none",
    occlusionStatus: "none",
    measurementSource: "browserRgbImage",
    availabilityState: "available",
    algorithmVersion: "synthetic-test-geometry"
  };
}

function attribute(category: AppearanceAttribute["category"], value: string): AppearanceAttribute {
  return {
    id: category,
    category,
    label: category,
    value,
    confidence: {
      score: 1,
      label: "high"
    },
    userConfirmed: true,
    source: "userConfirmed",
    required: true
  };
}

function catalogWithBuildGuideAnnotations(annotationOverrides: Record<string, string> = {}): GameCatalogManifest {
  return {
    ...fixtureCatalog,
    items: fixtureCatalog.items.map((item, index) => ({
      ...item,
      navigationInstructions:
        index === 0
          ? [
              {
                sequenceNumber: 1,
                instruction: "Road to Glory > Player > Appearance > Head & Skin > Head Template",
                evidenceAssetID: "synthetic-alpha-front"
              }
            ]
          : item.navigationInstructions,
      humanAnnotations:
        index === 0
          ? {
              ...item.humanAnnotations,
              verifiedHairstyleNativeValue: "SYNTHETIC_NATIVE_HAIRSTYLE_ALPHA",
              verifiedHairstyleMenuPath: "Road to Glory > Player > Appearance > Hair > Hairstyle",
              hairstyleFamily: "short",
              hairTextureFamily: "wavy",
              verifiedHairColorNativeValue: "SYNTHETIC_NATIVE_HAIR_COLOR_ALPHA",
              verifiedHairColorMenuPath: "Road to Glory > Player > Appearance > Hair > Hair Color",
              hairColorFamily: "brown",
              verifiedFacialHairNativeValue: "SYNTHETIC_NATIVE_FACIAL_HAIR_ALPHA",
              verifiedFacialHairMenuPath: "Road to Glory > Player > Appearance > Hair > Facial Hair",
              facialHairPresence: "yes",
              facialHairStyleFamily: "beard",
              verifiedFacialHairColorNativeValue: "SYNTHETIC_NATIVE_FACIAL_HAIR_COLOR_ALPHA",
              verifiedFacialHairColorMenuPath: "Road to Glory > Player > Appearance > Hair > Facial-Hair Color",
              facialHairColorFamily: "brown",
              verifiedEyebrowNativeValue: "SYNTHETIC_NATIVE_EYEBROW_ALPHA",
              verifiedEyebrowMenuPath: "Road to Glory > Player > Appearance > Head & Skin > Eyebrows",
              eyebrowThickness: "medium",
              verifiedSkinPresentationNativeValue: "SYNTHETIC_NATIVE_SKIN_PRESENTATION_ALPHA",
              verifiedSkinPresentationMenuPath: "Road to Glory > Player > Appearance > Head & Skin > Skin Tone",
              skinPresentation: "synthetic-skin-alpha",
              verifiedOtherVisualAttributeNativeValue: "SYNTHETIC_NATIVE_VISIBLE_MARK_ALPHA",
              verifiedOtherVisualAttributeMenuPath: "Road to Glory > Player > Appearance > Head & Skin > Skin Details",
              visibleMarks: "freckles",
              preferredBodyType: "muscular",
              verifiedHeightNativeValue: "SYNTHETIC_NATIVE_HEIGHT_ALPHA",
              verifiedHeightMenuPath: "Road to Glory > Player > Player Info > Height",
              verifiedWeightNativeValue: "SYNTHETIC_NATIVE_WEIGHT_ALPHA",
              verifiedWeightMenuPath: "Road to Glory > Player > Player Info > Weight",
              verifiedBodySelectionNativeValue: "SYNTHETIC_NATIVE_BODY_SELECTION_ALPHA",
              verifiedBodySelectionMenuPath: "Road to Glory > Player > Player Info > Body Type",
              ...annotationOverrides
            }
          : item.humanAnnotations
    }))
  };
}
