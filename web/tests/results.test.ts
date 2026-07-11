import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import { createBuildInstructions, createResultsState, getTieGroups } from "@/lib/results/results-experience";
import { createSafeShareCard } from "@/lib/share/share-card";
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
    expect(instruction.menuCategory).toBe("synthetic-test-category");
    expect(instruction.verifiedGameLabel).toBe("synthetic-label-alpha");
    expect(instruction.platform).toBe("synthetic-test-platform");
    expect(instruction.gameVersion).toBe("synthetic-test-version");
    expect(instruction.patchVersion).toBe("synthetic-test-patch");
    expect(instruction.mode).toBe("synthetic-test-mode");
    expect(instruction.creationPath).toBe("synthetic-test-path");
    expect(instruction.verificationDate).toBe("2026-07-10T00:00:00.000Z");
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
  return {
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
  };
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
