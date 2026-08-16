import { describe, expect, it } from "vitest";
import { CollegeFootball27Adapter } from "@/lib/adapters/college-football-27-adapter";
import { EaSportsFc26Adapter, FC26_CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/adapters/ea-sports-fc-26-adapter";
import { GameAdapterError } from "@/lib/adapters/game-appearance-adapter";
import { GAME_SELECTION_TILES, SUPPORTED_GAME_DEFINITIONS, createGameProfileContext, getGameSelectionTileByGame, getSupportedGameDefinition } from "@/lib/adapters/game-registry";
import { createBundledCatalogRepository } from "@/lib/catalog/catalog-repository";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import type { GameCatalogManifest, StandardFaceProfile } from "@/types/domain";

describe("game adapter isolation", () => {
  it("registers FC26 separately from the College Football MVP", () => {
    const cf27 = getSupportedGameDefinition("college-football-27");
    const fc26 = getSupportedGameDefinition("ea-sports-fc-26");

    expect(cf27.gameID).toBe("college-football-27");
    expect(cf27.activeProductStatus).toBe("activeMvp");
    expect(cf27.launchTarget).toBe(true);
    expect(cf27.productionCatalogAvailability).toBe("empty");
    expect(cf27.recommendationAvailability).toBe("unavailableNoProductionCatalog");
    expect(cf27.entitlementEligibility).toBe("eligibleWhenProductionSupported");
    expect(fc26.gameID).toBe("ea-sports-fc-26");
    expect(fc26.activeProductStatus).toBe("researchOnly");
    expect(fc26.launchTarget).toBe(false);
    expect(fc26.entitlementEligibility).toBe("notEligibleResearchOnly");
    expect(fc26.researchNamespace).not.toBe(cf27.researchNamespace);
    expect(fc26.recommendationsEnabled).toBe(false);
  });

  it("registers the five launch targets without false production support", () => {
    const launchTargets = SUPPORTED_GAME_DEFINITIONS.filter((definition) => definition.launchTarget);
    expect(launchTargets.map((definition) => definition.gameID)).toEqual([
      "college-football-27",
      "nba-2k26",
      "madden-nfl-26",
      "ea-sports-pga-tour",
      "pba-pro-bowling-2026"
    ]);
    for (const definition of launchTargets) {
      expect(definition.productionCatalogAvailability).toBe("empty");
      expect(definition.recommendationsEnabled).toBe(false);
      expect(definition.entitlementEligibility).toBe("eligibleWhenProductionSupported");
      expect(definition.customerFacingSupportState).not.toBe("supported");
    }
    expect(getSupportedGameDefinition("nba-2k26")).toMatchObject({
      researchStatus: "researchEvidenceExists",
      productionCatalogAvailability: "empty",
      recommendationAvailability: "unavailableNoProductionCatalog",
      recommendationsEnabled: false,
      customerFacingSupportState: "researchEvidenceCatalogUnavailable"
    });
    expect(getSupportedGameDefinition("madden-nfl-26").recommendationAvailability).toBe("unavailableNotStarted");
    expect(getSupportedGameDefinition("ea-sports-pga-tour").productionCatalogNamespace).toBe("data/catalog/production/ea-sports-pga-tour");
    expect(getSupportedGameDefinition("pba-pro-bowling-2026").customerFacingSupportState).toBe("notStartedUnavailable");
  });

  it("centralizes every visible post-scan game tile without sharing catalog namespaces", () => {
    expect(GAME_SELECTION_TILES.map((tile) => tile.displayName)).toEqual([
      "CFB game 2027",
      "Pro Football game 2026",
      "Pro Basketball game 2026",
      "Pro Golf game 2026",
      "Pro Bowling game 2026",
      "Pro Soccer game 2026"
    ]);

    const gameTiles = GAME_SELECTION_TILES.filter((tile) => tile.gameID);
    expect(gameTiles.map((tile) => tile.screenID)).toEqual([
      "game-college-football-27",
      "game-madden-nfl-26",
      "game-nba-2k26",
      "game-ea-sports-pga-tour",
      "game-pba-pro-bowling-2026",
      "game-ea-sports-fc-26"
    ]);
    expect(new Set(gameTiles.map((tile) => tile.gameID)).size).toBe(gameTiles.length);
    expect(new Set(gameTiles.map((tile) => tile.catalogNamespace)).size).toBe(gameTiles.length);
    expect(getGameSelectionTileByGame("college-football-27").catalogNamespace).toBe("data/catalog/production");
    expect(getGameSelectionTileByGame("nba-2k26").catalogNamespace).toBe("data/catalog/production/nba-2k26");
    expect(getGameSelectionTileByGame("ea-sports-fc-26")).toMatchObject({
      displayName: "Pro Soccer game 2026",
      gameID: "ea-sports-fc-26",
      adapterID: "ea-sports-fc-26",
      catalogNamespace: "data/catalog/production/fc26",
      screenID: "game-ea-sports-fc-26"
    });
  });

  it("keeps FC26 recommendations fail-closed even when research observations exist", async () => {
    const adapter = new EaSportsFc26Adapter();
    await expect(adapter.match(profile())).rejects.toMatchObject(new GameAdapterError("catalogUnavailable", FC26_CATALOG_UNAVAILABLE_MESSAGE));
  });

  it("does not let the FC26 adapter validate College Football catalog records", () => {
    const adapter = new EaSportsFc26Adapter();
    expect(() => adapter.validateCatalog(cf27Manifest())).toThrow(/cannot validate another game catalog/i);
  });

  it("preserves the existing College Football fail-closed behavior", async () => {
    const adapter = new CollegeFootball27Adapter(createBundledCatalogRepository(emptyProductionManifest()));
    await expect(adapter.match(profile())).rejects.toMatchObject(new GameAdapterError("catalogUnavailable", CATALOG_UNAVAILABLE_MESSAGE));
  });

  it("stores game context separately from the game-independent face profile contract", () => {
    const baseProfile = profile();
    const fc26Context = createGameProfileContext(baseProfile, "ea-sports-fc-26");
    const cf27Context = createGameProfileContext(baseProfile, "college-football-27");

    expect(baseProfile).not.toHaveProperty("gameID");
    expect(fc26Context).toMatchObject({
      schemaVersion: "gameface-game-profile-context-v1",
      gameID: "ea-sports-fc-26",
      profileID: baseProfile.id,
      profileVersion: baseProfile.profileVersion
    });
    expect(cf27Context.gameID).toBe("college-football-27");
  });
});

function emptyProductionManifest(): GameCatalogManifest {
  return {
    sourceType: "production",
    catalogVersion: {
      identifier: "empty-production",
      gameVersion: "unavailable",
      platform: "unavailable",
      verifiedAt: null
    },
    generatedAt: "2026-07-10T00:00:00.000Z",
    isProduction: true,
    items: []
  };
}

function cf27Manifest(): GameCatalogManifest {
  return {
    ...emptyProductionManifest(),
    items: [
      {
        sourceType: "production",
        stableInternalID: "CF27_UNIT_TEST_HEAD_001",
        game: "EA SPORTS College Football 27",
        gameVersion: "unit-test-version",
        patchVersion: "unit-test-patch",
        platform: "unit-test-platform",
        gameMode: "unit-test-mode",
        creationPath: "unit-test-path",
        category: "head",
        visibleGameLabelOrIndex: "Face 1",
        verificationState: "verified",
        capturedDate: "2026-07-10T00:00:00.000Z",
        verifiedDate: "2026-07-10T00:00:00.000Z",
        sourceImageReferences: ["front"],
        requiredAngles: {
          straightOn: "front",
          left45: "left45",
          right45: "right45",
          leftProfile: "leftProfile",
          rightProfile: "rightProfile"
        },
        geometryMeasurements: {},
        humanAnnotations: {},
        catalogManagerDisposition: "approved",
        navigationInstructions: [],
        catalogVersion: {
          identifier: "unit-test",
          gameVersion: "unit-test-version",
          platform: "unit-test-platform",
          verifiedAt: "2026-07-10T00:00:00.000Z"
        },
        isTestFixture: false
      }
    ]
  };
}

function profile(): StandardFaceProfile {
  return createStandardFaceProfile({
    session: createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z")),
    attributes: createInitialAttributeConfirmation(),
    now: new Date("2026-07-10T00:00:00.000Z"),
    userAgent: "unit-test"
  });
}
