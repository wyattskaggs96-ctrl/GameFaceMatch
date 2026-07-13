import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CollegeFootball27Adapter } from "@/lib/adapters/college-football-27-adapter";
import { GameAdapterError } from "@/lib/adapters/game-appearance-adapter";
import { verifyManifestIntegrity } from "@/lib/catalog/catalog-integrity";
import { createBundledCatalogRepository } from "@/lib/catalog/catalog-repository";
import { PRODUCTION_PUBLISH_GATE_VERSION, requiredProductionPublishGateChecks, type ProductionPublishGateReport } from "@/lib/catalog/production-publish-gate";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import type { AppearanceAttribute, FacialMeasurement, GameCatalogManifest, StandardFaceProfile, StandardFacialMeasurementID } from "@/types/domain";

const fixtureCatalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "..", "data", "fixtures", "test-only", "matching", "synthetic-catalog.json"), "utf8")
) as GameCatalogManifest;

describe("rule-based matching engine", () => {
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

  it("generates explanations and traceability metadata", () => {
    const match = engine().matchTopThree({ profile: syntheticProfile(), catalog: fixtureCatalog, allowTestFixtures: true })[0];
    expect(match.scoreLabel).toBe("Match score based on the game’s available appearance options.");
    expect(match.explanation.summary).not.toMatch(/identical/i);
    expect(match.explanation.strongestSimilarities.length).toBeGreaterThan(0);
    expect(match.catalogVersion.identifier).toBe("synthetic-test-catalog-v1");
    expect(match.modelVersion).toBe("rule-based-web-mvp-v2-rgb-geometry");
    expect(match.explanation.summary).toMatch(/not an identity probability/i);
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
  return {
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
  };
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
