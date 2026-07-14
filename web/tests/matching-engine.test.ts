import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CollegeFootball27Adapter } from "@/lib/adapters/college-football-27-adapter";
import { GameAdapterError } from "@/lib/adapters/game-appearance-adapter";
import { verifyManifestIntegrity } from "@/lib/catalog/catalog-integrity";
import { createBundledCatalogRepository } from "@/lib/catalog/catalog-repository";
import { PRODUCTION_PUBLISH_GATE_VERSION, requiredProductionPublishGateChecks, type ProductionPublishGateReport } from "@/lib/catalog/production-publish-gate";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import { createRuleBasedMatchingEngine, type MatchingFeatureConfig } from "@/lib/matching/matching-engine";
import { migrateStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import type { AppearanceAttribute, FacialMeasurement, GameCatalogManifest, StandardFaceProfile, StandardFacialMeasurementID } from "@/types/domain";

const fixtureCatalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "..", "data", "fixtures", "test-only", "matching", "synthetic-catalog.json"), "utf8")
) as GameCatalogManifest;

describe("rule-based matching engine", () => {
  it("returns an exact match score for identical reliable features without identity-probability language", () => {
    const profile = syntheticProfile();
    profile.appearance.attributes = [
      attribute("hairColorFamily", "brown"),
      attribute("facialHairPresence", "yes"),
      attribute("preferredBodyType", "balanced")
    ];
    const match = engine().matchTopThree({ profile, catalog: fixtureCatalog, allowTestFixtures: true })[0];

    expect(match.catalogItem.stableInternalID).toBe("synthetic-match-alpha");
    expect(match.score).toBe(100);
    expect(match.scoreLabel).toBe("Match score based on the game’s available appearance options.");
    expect(match.explanation.summary).not.toMatch(/percent identical|you are|identity match|identity probability/i);
  });

  it("orders the top three deterministically using synthetic fixtures", () => {
    const matches = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true });
    expect(matches.map((match) => match.catalogItem.stableInternalID)).toEqual(["synthetic-match-alpha", "synthetic-match-gamma", "synthetic-match-beta"]);
    expect(matches.map((match) => match.rank)).toEqual([1, 2, 3]);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it("handles missing features by redistributing weight among reliable features", () => {
    const profile = syntheticProfile();
    delete profile.geometry.measurements.noseWidthRatio;
    const matches = engine().matchTopThree({ profile, catalog: fixtureCatalog, allowTestFixtures: true });
    expect(matches[0].catalogItem.stableInternalID).toBe("synthetic-match-alpha");
    expect(matches[0].featureContributions.find((feature) => feature.featureID === "noseWidthRatio")?.included).toBe(false);
    expect(matches[0].explanation.uncertaintyNotes.join(" ")).toMatch(/noseWidthRatio/);
  });

  it("reduces confidence when low-confidence features are excluded", () => {
    const strong = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true })[0];
    const weakProfile = syntheticProfile();
    weakProfile.geometry.measurements.faceWidthRatio = measurement(0.7, 0.1);
    weakProfile.geometry.measurements.jawWidthRatio = measurement(0.61, 0.1);
    const weak = engine().matchTopThree({ profile: weakProfile, catalog: fixtureCatalog, allowTestFixtures: true })[0];
    expect(weak.confidence.score).toBeLessThan(strong.confidence.score);
    expect(weak.explanation.uncertaintyNotes.join(" ")).toMatch(/confidence below matching threshold/i);
  });

  it("records tie groups while keeping stable ID ordering deterministic", () => {
    const tiedCatalog = {
      ...fixtureCatalog,
      items: [
        { ...fixtureCatalog.items[0], stableInternalID: "synthetic-tie-b" },
        { ...fixtureCatalog.items[0], stableInternalID: "synthetic-tie-a" },
        fixtureCatalog.items[1]
      ]
    };
    const matches = engine().matchTopThree({ profile: syntheticProfile(), catalog: tiedCatalog, allowTestFixtures: true });
    expect(matches[0].catalogItem.stableInternalID).toBe("synthetic-tie-a");
    expect(matches[1].catalogItem.stableInternalID).toBe("synthetic-tie-b");
    expect(matches[0].tieGroup).toBe(matches[1].tieGroup);
    expect(matches[1].explanation.uncertaintyNotes.join(" ")).toMatch(/tied/i);
  });

  it("detects near ties within the MVP score tolerance", () => {
    const nearTieCatalog = {
      ...fixtureCatalog,
      items: [
        { ...fixtureCatalog.items[0], stableInternalID: "synthetic-near-tie-a" },
        {
          ...fixtureCatalog.items[0],
          stableInternalID: "synthetic-near-tie-b",
          geometryMeasurements: {
            ...fixtureCatalog.items[0].geometryMeasurements,
            faceWidthRatio: {
              value: 0.702,
              confidence: 0.95,
              supportingFrameCount: 5,
              variance: 0.01,
              depthSupported: false,
              occlusionStatus: "none" as const,
              measurementSource: "synthetic-fixture",
              availabilityState: "available" as const
            }
          }
        },
        fixtureCatalog.items[1]
      ]
    };
    const matches = engine().matchTopThree({ profile: syntheticProfile(), catalog: nearTieCatalog, allowTestFixtures: true });

    expect(matches[0].tieGroup).toBe(matches[1].tieGroup);
    expect(matches[1].explanation.uncertaintyNotes.join(" ")).toMatch(/tied/i);
  });

  it("keeps skin presentation out of geometric similarity", () => {
    const changedSkinCatalog = {
      ...fixtureCatalog,
      items: fixtureCatalog.items.map((item) => ({
        ...item,
        humanAnnotations: {
          ...item.humanAnnotations,
          skinPresentation: `${item.stableInternalID}-changed-skin-presentation`
        }
      }))
    };
    const original = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true });
    const changedSkin = engine().matchTopThree({ profile: syntheticProfile(), catalog: changedSkinCatalog, allowTestFixtures: true });
    expect(changedSkin.map((match) => match.score)).toEqual(original.map((match) => match.score));
  });

  it("returns verified native appearance recommendations from user-confirmed attributes", () => {
    const match = engine().matchTopThree({
      profile: syntheticProfileWithConfirmedAppearance(),
      catalog: catalogWithVerifiedAppearanceAnnotations(),
      allowTestFixtures: true
    })[0];
    const recommendations = match.appearanceRecommendations ?? [];

    expect(recommendations.filter((recommendation) => recommendation.status === "selected").map((recommendation) => recommendation.category)).toEqual([
      "hairstyle",
      "hairColor",
      "facialHair",
      "facialHairColor",
      "eyebrows",
      "skinPresentation",
      "otherVisualAttribute"
    ]);
    expect(recommendations.find((recommendation) => recommendation.category === "hairstyle")).toMatchObject({
      nativeGameValue: "SYNTHETIC_NATIVE_HAIRSTYLE_ALPHA",
      sourceAnnotationKey: "verifiedHairstyleNativeValue",
      gameVersion: "synthetic-test-version",
      platform: "synthetic-test-platform",
      mode: "synthetic-test-mode",
      creationPath: "synthetic-test-path"
    });
    expect(recommendations.every((recommendation) => recommendation.explanation.includes("geometric head similarity") || recommendation.status !== "selected")).toBe(true);
  });

  it("marks unsupported appearance categories unavailable without inventing game values", () => {
    const match = engine().matchTopThree({
      profile: syntheticProfileWithConfirmedAppearance(),
      catalog: fixtureCatalog,
      allowTestFixtures: true
    })[0];
    const recommendations = match.appearanceRecommendations ?? [];

    expect(recommendations.find((recommendation) => recommendation.category === "hairstyle")).toMatchObject({
      status: "unavailable",
      nativeGameValue: null,
      sourceAnnotationKey: null
    });
    expect(recommendations.find((recommendation) => recommendation.category === "facialHairColor")?.explanation).toMatch(/does not include a verified native game value/i);
  });

  it("marks appearance recommendations ambiguous until user corrections align with catalog classifications", () => {
    const ambiguous = engine().matchTopThree({
      profile: syntheticProfileWithConfirmedAppearance({ hairstyleFamily: "long" }),
      catalog: catalogWithVerifiedAppearanceAnnotations(),
      allowTestFixtures: true
    })[0].appearanceRecommendations?.find((recommendation) => recommendation.category === "hairstyle");
    const corrected = engine().matchTopThree({
      profile: syntheticProfileWithConfirmedAppearance({ hairstyleFamily: "short" }),
      catalog: catalogWithVerifiedAppearanceAnnotations(),
      allowTestFixtures: true
    })[0].appearanceRecommendations?.find((recommendation) => recommendation.category === "hairstyle");

    expect(ambiguous).toMatchObject({
      status: "ambiguous",
      nativeGameValue: "SYNTHETIC_NATIVE_HAIRSTYLE_ALPHA"
    });
    expect(ambiguous?.explanation).toMatch(/user-confirmed appearance value does not match/i);
    expect(corrected).toMatchObject({
      status: "selected",
      nativeGameValue: "SYNTHETIC_NATIVE_HAIRSTYLE_ALPHA"
    });
  });

  it("does not let skin presentation recommendations alter geometric head similarity", () => {
    const profile = syntheticProfileWithConfirmedAppearance({ skinPresentation: "synthetic-skin-alpha" });
    const withSkin = engine().matchTopThree({ profile, catalog: catalogWithVerifiedAppearanceAnnotations(), allowTestFixtures: true });
    const changedSkinNativeValues = engine().matchTopThree({
      profile,
      catalog: {
        ...catalogWithVerifiedAppearanceAnnotations(),
        items: catalogWithVerifiedAppearanceAnnotations().items.map((item) => ({
          ...item,
          humanAnnotations: {
            ...item.humanAnnotations,
            verifiedSkinPresentationNativeValue: `DIFFERENT_${item.stableInternalID}`,
            skinPresentation: "different-skin-classification"
          }
        }))
      },
      allowTestFixtures: true
    });

    expect(changedSkinNativeValues.map((match) => match.catalogItem.stableInternalID)).toEqual(withSkin.map((match) => match.catalogItem.stableInternalID));
    expect(changedSkinNativeValues[0].featureContributions.filter((feature) => feature.group === "geometry").map((feature) => feature.featureID)).not.toContain("skinPresentation");
    expect(changedSkinNativeValues[0].appearanceRecommendations?.find((recommendation) => recommendation.category === "skinPresentation")).toMatchObject({
      status: "ambiguous",
      nativeGameValue: "DIFFERENT_synthetic-match-alpha"
    });
  });

  it("applies user preferences separately from geometry", () => {
    const defaultOrder = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true });
    const athleteOrder = engine().matchTopThree({
      profile: syntheticProfile(),
      catalog: fixtureCatalog,
      allowTestFixtures: true,
      preferences: {
        faceAndJawShape: 0.05,
        nose: 0.05,
        mouth: 0.05,
        hair: 0,
        facialHair: 0,
        desiredAthletePhysique: 8
      }
    });
    expect(defaultOrder[0].catalogItem.stableInternalID).toBe("synthetic-match-alpha");
    expect(athleteOrder[0].catalogItem.stableInternalID).toBe("synthetic-match-beta");
  });

  it("supports configurable feature weights without changing the default model", () => {
    const profile = syntheticProfile();
    profile.geometry.measurements.faceWidthRatio = measurement(0.76, 0.96);
    const defaultOrder = engine().matchTopThree({ profile, catalog: fixtureCatalog, allowTestFixtures: true });
    const faceWidthOnly: MatchingFeatureConfig[] = [{ id: "faceWidthRatio", group: "faceAndJawShape", weight: 1, maxDistance: 0.35 }];
    const weightedOrder = createRuleBasedMatchingEngine({ geometryFeatures: faceWidthOnly, appearanceFeatures: [] }).matchTopThree({
      profile,
      catalog: fixtureCatalog,
      allowTestFixtures: true
    });

    expect(defaultOrder[0].catalogItem.stableInternalID).toBe("synthetic-match-alpha");
    expect(weightedOrder[0].catalogItem.stableInternalID).toBe("synthetic-match-beta");
    expect(weightedOrder[0].featureContributions.filter((feature) => feature.included).map((feature) => feature.featureID)).toEqual(["faceWidthRatio"]);
  });

  it("keeps production matching disabled until an approved catalog release exists", async () => {
    const notChecksummed = productionStyleCatalog();
    expect(engine().matchTopThree({ profile: syntheticProfile(), catalog: notChecksummed })).toEqual([]);

    const notApproved = await checksumCatalog({ ...productionStyleCatalog(), releaseStatus: "reviewCandidate" });
    expect(engine().matchTopThree({ profile: syntheticProfile(), catalog: notApproved })).toEqual([]);

    const approved = await checksumCatalog(productionStyleCatalog());
    const matches = engine().matchTopThree({ profile: syntheticProfile(), catalog: approved });
    expect(matches).toHaveLength(3);
    expect(matches.every((match) => match.catalogVersion.identifier === "unit-test-production-catalog-v1")).toBe(true);
  });

  it("fails closed for an empty production catalog", async () => {
    const emptyCatalog = await checksumCatalog({
      ...productionStyleCatalog(),
      declaredItemCount: 0,
      releaseNotes: {
        summary: "Unit-test empty catalog.",
        createdAt: "2026-07-10T00:00:00.000Z",
        author: "unit-test",
        changes: []
      },
      items: []
    });

    expect(engine().matchTopThree({ profile: syntheticProfile(), catalog: emptyCatalog })).toEqual([]);
  });

  it("filters out production records whose version metadata is incompatible with the manifest", async () => {
    const catalog = productionStyleCatalog();
    const incompatible = await checksumCatalog({
      ...catalog,
      items: catalog.items.map((item, index) =>
        index === 0
          ? {
              ...item,
              gameVersion: "different-unit-test-version",
              catalogVersion: {
                ...item.catalogVersion,
                gameVersion: "different-unit-test-version"
              }
            }
          : item
      )
    });
    const matches = engine().matchTopThree({ profile: syntheticProfile(), catalog: incompatible });

    expect(matches).toHaveLength(2);
    expect(matches.map((match) => match.catalogItem.stableInternalID)).not.toContain("unit-test-production-1");
  });

  it("blocks fixture leakage from production matching even when a manifest is production-shaped", async () => {
    const catalog = productionStyleCatalog();
    const leakedFixture = await checksumCatalog({
      ...catalog,
      items: catalog.items.map((item) => ({
        ...item,
        sourceType: "testFixture" as const,
        isTestFixture: true
      }))
    });

    expect(engine().matchTopThree({ profile: syntheticProfile(), catalog: leakedFixture })).toEqual([]);
  });

  it("blocks unverified production records from matching", async () => {
    const catalog = productionStyleCatalog();
    const unverified = await checksumCatalog({
      ...catalog,
      items: catalog.items.map((item) => ({
        ...item,
        verificationState: "unverified" as const,
        verifiedDate: null
      }))
    });

    expect(engine().matchTopThree({ profile: syntheticProfile(), catalog: unverified })).toEqual([]);
  });

  it("generates explanations and traceability metadata", () => {
    const match = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true })[0];
    expect(match.scoreLabel).toBe("Match score based on the game’s available appearance options.");
    expect(match.explanation.summary).not.toMatch(/identical/i);
    expect(match.explanation.strongestSimilarities.length).toBeGreaterThan(0);
    expect(match.catalogVersion.identifier).toBe("synthetic-test-catalog-v1");
    expect(match.modelVersion).toBe("rule-based-web-mvp-v2-rgb-geometry");
    expect(match.explanation.summary).toMatch(/relative game-option score/i);
    expect(match.explanation.summary).not.toMatch(/identity probability|percent identical|you are/i);
  });

  it("excludes test fixtures unless explicitly allowed", () => {
    expect(engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog })).toEqual([]);
  });

  it("reduces confidence when catalog measurements are incompletely annotated", () => {
    const complete = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true })[0];
    const incompleteCatalog = {
      ...fixtureCatalog,
      items: [
        {
          ...fixtureCatalog.items[0],
          geometryMeasurements: {
            faceWidthRatio: fixtureCatalog.items[0].geometryMeasurements.faceWidthRatio
          }
        }
      ]
    };
    const incomplete = engine().matchTopThree({ profile: syntheticProfile(), catalog: incompleteCatalog, allowTestFixtures: true })[0];
    expect(incomplete.confidence.score).toBeLessThan(complete.confidence.score);
    expect(incomplete.explanation.uncertaintyNotes.join(" ")).toMatch(/Catalog measurement unavailable or not yet annotated/);
  });

  it("records explicit evidence metadata for included and missing features", () => {
    const profile = syntheticProfile();
    delete profile.geometry.measurements.mouthWidthRatio;
    const match = engine().matchTopThree({ profile, catalog: fixtureCatalog, allowTestFixtures: true })[0];
    const includedFaceWidth = match.featureContributions.find((feature) => feature.featureID === "faceWidthRatio");
    const missingMouth = match.featureContributions.find((feature) => feature.featureID === "mouthWidthRatio");

    expect(includedFaceWidth).toMatchObject({
      profileAvailability: "available",
      included: true,
      profileEvidence: {
        value: 0.7,
        confidence: { score: 0.96, label: "high" },
        supportingFrameCount: 5,
        variance: 0.01,
        depthSupported: false,
        availabilityState: "available",
        occlusionState: "none"
      },
      catalogEvidence: {
        value: 0.7,
        confidence: { score: 0.95, label: "high" },
        supportingFrameCount: 5,
        variance: 0.01,
        depthSupported: false,
        availabilityState: "available",
        occlusionState: "none"
      }
    });
    expect(missingMouth).toMatchObject({
      included: false,
      profileAvailability: "unavailable",
      profileEvidence: {
        value: null,
        confidence: { score: 0, label: "unavailable" },
        supportingFrameCount: 0,
        variance: null,
        depthSupported: false,
        availabilityState: "unavailable",
        occlusionState: "unknown"
      },
      reason: "Profile measurement unavailable."
    });
  });

  it("reduces confidence for partial profiles without filling missing measurements", () => {
    const complete = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true })[0];
    const partialProfile = syntheticProfile();
    for (const id of ["eyeSpacingRatio", "meanEyeWidthRatio", "noseWidthRatio", "noseLengthRatio", "mouthWidthRatio"] as const) {
      delete partialProfile.geometry.measurements[id];
      partialProfile.geometry.unavailableMeasurements.push(id);
    }
    const partial = engine().matchTopThree({ profile: partialProfile, catalog: fixtureCatalog, allowTestFixtures: true })[0];

    expect(partial.catalogItem.stableInternalID).toBe("synthetic-match-alpha");
    expect(partial.score).toBeGreaterThan(0);
    expect(partial.confidence.score).toBeLessThan(complete.confidence.score);
    expect(partial.featureContributions.find((feature) => feature.featureID === "noseWidthRatio")).toMatchObject({
      profileValue: null,
      profileAvailability: "unavailable",
      included: false,
      effectiveWeight: 0
    });
    expect(partial.explanation.uncertaintyNotes.join(" ")).toMatch(/reliable feature evidence is incomplete/i);
  });

  it("excludes profile projection features when side-view evidence is missing", () => {
    const profile = syntheticProfile();
    profile.sourceAngleAvailability.leftProfile.available = false;
    profile.sourceAngleAvailability.rightProfile.available = false;
    profile.geometry.measurements.noseProjection = {
      ...measurement(0.18, 0.8),
      supportingFrameCount: 1,
      supportingPoses: ["straightOn"],
      profileEvidenceExists: false
    };
    const match = engine().matchTopThree({ profile, catalog: catalogWithProjectionMeasurements(), allowTestFixtures: true })[0];
    const noseProjection = match.featureContributions.find((feature) => feature.featureID === "noseProjection");

    expect(noseProjection).toMatchObject({
      included: false,
      profileAvailability: "available",
      effectiveWeight: 0,
      reason: "Profile side-view evidence unavailable for this projection feature."
    });
    expect(noseProjection?.profileEvidence.supportingFrameCount).toBe(1);
    expect(noseProjection?.profileEvidence.depthSupported).toBe(false);
    expect(match.explanation.uncertaintyNotes.join(" ")).toMatch(/side-view evidence unavailable/i);
  });

  it("excludes significantly occluded measurements and explains the uncertainty", () => {
    const profile = syntheticProfile();
    profile.geometry.measurements.faceWidthRatio = {
      ...measurement(0.7, 0.96),
      occlusionImpact: "significant",
      occlusionStatus: "significant"
    };
    const match = engine().matchTopThree({ profile, catalog: fixtureCatalog, allowTestFixtures: true })[0];
    const occluded = match.featureContributions.find((feature) => feature.featureID === "faceWidthRatio");

    expect(occluded).toMatchObject({
      included: false,
      effectiveWeight: 0,
      reliability: 0,
      profileEvidence: {
        occlusionState: "significant",
        confidence: { score: 0.96, label: "high" }
      },
      reason: "Profile measurement blocked by significant occlusion."
    });
    expect(match.explanation.uncertaintyNotes.join(" ")).toMatch(/significant occlusion/i);
  });

  it("keeps low-confidence measurements unavailable to weighting while preserving their evidence", () => {
    const profile = syntheticProfile();
    profile.geometry.measurements.jawWidthRatio = {
      ...measurement(0.61, 0.2),
      supportingFrameCount: 2,
      variance: 0.05
    };
    const match = engine().matchTopThree({ profile, catalog: fixtureCatalog, allowTestFixtures: true })[0];
    const weak = match.featureContributions.find((feature) => feature.featureID === "jawWidthRatio");

    expect(weak).toMatchObject({
      included: false,
      effectiveWeight: 0,
      profileAvailability: "available",
      profileEvidence: {
        value: 0.61,
        confidence: { score: 0.2, label: "low" },
        supportingFrameCount: 2,
        variance: 0.05,
        depthSupported: false,
        availabilityState: "available",
        occlusionState: "none"
      },
      reason: "Feature confidence below matching threshold."
    });
  });
});

describe("CollegeFootball27Adapter matching boundary", () => {
  it("keeps empty production catalog failing closed", async () => {
    const adapter = new CollegeFootball27Adapter(
      createBundledCatalogRepository({
        sourceType: "production",
        catalogVersion: {
          identifier: "empty-production",
          gameVersion: "",
          platform: "",
          verifiedAt: null
        },
        generatedAt: "2026-07-10T00:00:00.000Z",
        isProduction: true,
        items: []
      })
    );
    await expect(adapter.match(syntheticProfile())).rejects.toMatchObject(new GameAdapterError("catalogUnavailable", CATALOG_UNAVAILABLE_MESSAGE));
  });

  it("does not allow fixture catalog records through the production adapter", async () => {
    const catalog = productionStyleCatalog();
    const adapter = new CollegeFootball27Adapter(createBundledCatalogRepository({ ...catalog, items: catalog.items.map((item) => ({ ...item, isTestFixture: true })) }));
    await expect(adapter.match(syntheticProfile())).rejects.toMatchObject({ code: "fixtureRecordInProduction" });
  });

  it("returns verified candidates and patch-aware build instructions from a checksum-verified catalog", async () => {
    const catalog = await checksumCatalog(productionStyleCatalog());
    const adapter = new CollegeFootball27Adapter(createBundledCatalogRepository(catalog), undefined, passingPublishGate(catalog));
    const matches = await adapter.match(syntheticProfile());
    expect(matches).toHaveLength(3);
    expect(matches.every((match) => match.catalogItem.verificationState === "verified")).toBe(true);
    expect(matches[0].catalogVersion.identifier).toBe("unit-test-production-catalog-v1");
    expect(matches[0].modelVersion).toBe("rule-based-web-mvp-v2-rgb-geometry");
    const instructions = adapter.buildInstructions(matches[0]);
    expect(instructions[0]).toMatchObject({
      platform: "unit-test-platform",
      gameVersion: "unit-test-version",
      patchVersion: "unit-test-patch",
      creationPath: "unit-test-road-to-glory-path",
      verifiedGameLabel: matches[0].catalogItem.visibleGameLabelOrIndex
    });
  });
});

function passingPublishGate(catalog: GameCatalogManifest): ProductionPublishGateReport {
  return {
    schemaVersion: PRODUCTION_PUBLISH_GATE_VERSION,
    ok: true,
    generatedAt: "2026-07-10T00:00:00.000Z",
    catalogVersionID: catalog.catalogVersion.identifier,
    checks: requiredProductionPublishGateChecks.map((name) => ({ name, status: "pass", errors: [] })),
    errors: []
  };
}

function engine() {
  return createRuleBasedMatchingEngine();
}

function syntheticProfile(): StandardFaceProfile {
  return migrateStandardFaceProfile({
    id: "synthetic-profile",
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
        faceWidthRatio: measurement(0.7, 0.96),
        foreheadWidthRatio: measurement(0.58, 0.96),
        jawWidthRatio: measurement(0.61, 0.96),
        chinWidthRatio: measurement(0.36, 0.96),
        eyeSpacingRatio: measurement(0.32, 0.96),
        meanEyeWidthRatio: measurement(0.16, 0.96),
        noseWidthRatio: measurement(0.22, 0.96),
        noseLengthRatio: measurement(0.31, 0.96),
        lowerFaceRatio: measurement(0.43, 0.96),
        eyeTilt: measurement(0.03, 0.8),
        browPosition: measurement(0.14, 0.8),
        jawAngle: measurement(0.44, 0.8),
        noseProjection: measurement(0.18, 0.74),
        chinProjection: measurement(0.1, 0.74),
        mouthWidthRatio: measurement(0.43, 0.96)
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

async function checksumCatalog(catalog: GameCatalogManifest): Promise<GameCatalogManifest> {
  const report = await verifyManifestIntegrity(catalog);
  return {
    ...catalog,
    packageChecksum: report.actualChecksum
  };
}

function productionStyleCatalog(): GameCatalogManifest {
  const items = fixtureCatalog.items.map((item, index) => ({
    ...item,
    sourceType: "production" as const,
    stableInternalID: `unit-test-production-${index + 1}`,
    game: "EA SPORTS College Football 27",
    patchVersion: "unit-test-patch",
    platform: "unit-test-platform",
    gameVersion: "unit-test-version",
    gameMode: "Road to Glory",
    creationPath: "unit-test-road-to-glory-path",
    isTestFixture: false,
    catalogManagerDisposition: "approved" as const,
    catalogVersion: {
      identifier: "unit-test-production-catalog-v1",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: "2026-07-10T00:00:00.000Z"
    }
  }));
  return {
    sourceType: "production",
    catalogVersion: {
      identifier: "unit-test-production-catalog-v1",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: "2026-07-10T00:00:00.000Z"
    },
    generatedAt: "2026-07-10T00:00:00.000Z",
    isProduction: true,
    declaredItemCount: items.length,
    releaseStatus: "approvedRelease",
    releaseNotes: {
      summary: "Unit-test approved production-style catalog.",
      createdAt: "2026-07-10T00:00:00.000Z",
      author: "unit-test",
      changes: items.map((item) => ({
        type: "added" as const,
        stableInternalID: item.stableInternalID,
        description: "Added synthetic production-style matching fixture."
      }))
    },
    items
  };
}

function catalogWithProjectionMeasurements(): GameCatalogManifest {
  return {
    ...fixtureCatalog,
    items: fixtureCatalog.items.map((item) => ({
      ...item,
      geometryMeasurements: {
        ...item.geometryMeasurements,
        noseProjection: { value: 0.18, confidence: 0.95, supportingFrameCount: 2, variance: 0.01, depthSupported: false, occlusionStatus: "none", measurementSource: "synthetic-fixture", availabilityState: "available" },
        chinProjection: { value: 0.1, confidence: 0.95, supportingFrameCount: 2, variance: 0.01, depthSupported: false, occlusionStatus: "none", measurementSource: "synthetic-fixture", availabilityState: "available" }
      }
    }))
  };
}

function catalogWithVerifiedAppearanceAnnotations(): GameCatalogManifest {
  return {
    ...fixtureCatalog,
    items: fixtureCatalog.items.map((item, index) => ({
      ...item,
      humanAnnotations:
        index === 0
          ? {
              ...item.humanAnnotations,
              verifiedHairstyleNativeValue: "SYNTHETIC_NATIVE_HAIRSTYLE_ALPHA",
              hairstyleFamily: "short",
              hairTextureFamily: "wavy",
              verifiedHairColorNativeValue: "SYNTHETIC_NATIVE_HAIR_COLOR_ALPHA",
              hairColorFamily: "brown",
              verifiedFacialHairNativeValue: "SYNTHETIC_NATIVE_FACIAL_HAIR_ALPHA",
              facialHairPresence: "yes",
              facialHairStyleFamily: "beard",
              verifiedFacialHairColorNativeValue: "SYNTHETIC_NATIVE_FACIAL_HAIR_COLOR_ALPHA",
              facialHairColorFamily: "brown",
              verifiedEyebrowNativeValue: "SYNTHETIC_NATIVE_EYEBROW_ALPHA",
              eyebrowThickness: "medium",
              verifiedSkinPresentationNativeValue: "SYNTHETIC_NATIVE_SKIN_PRESENTATION_ALPHA",
              skinPresentation: "synthetic-skin-alpha",
              verifiedOtherVisualAttributeNativeValue: "SYNTHETIC_NATIVE_VISIBLE_MARK_ALPHA",
              visibleMarks: "freckles",
              preferredBodyType: "muscular"
            }
          : {
              ...item.humanAnnotations,
              verifiedHairstyleNativeValue: `SYNTHETIC_NATIVE_HAIRSTYLE_${index}`,
              hairstyleFamily: "long",
              verifiedHairColorNativeValue: `SYNTHETIC_NATIVE_HAIR_COLOR_${index}`,
              hairColorFamily: "black",
              verifiedSkinPresentationNativeValue: `SYNTHETIC_NATIVE_SKIN_PRESENTATION_${index}`,
              skinPresentation: "different-skin-classification"
            }
    }))
  };
}

function measurement(value: number, confidence: number): FacialMeasurement {
  return {
    value,
    confidence: {
      score: confidence,
      label: confidence >= 0.75 ? "high" : confidence >= 0.45 ? "medium" : "low"
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
