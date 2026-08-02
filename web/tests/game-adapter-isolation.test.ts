import { describe, expect, it } from "vitest";
import { CollegeFootball27Adapter } from "@/lib/adapters/college-football-27-adapter";
import { EaSportsFc26Adapter, FC26_CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/adapters/ea-sports-fc-26-adapter";
import { GameAdapterError } from "@/lib/adapters/game-appearance-adapter";
import { createGameProfileContext, getSupportedGameDefinition } from "@/lib/adapters/game-registry";
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
    expect(fc26.gameID).toBe("ea-sports-fc-26");
    expect(fc26.activeProductStatus).toBe("researchOnly");
    expect(fc26.researchNamespace).not.toBe(cf27.researchNamespace);
    expect(fc26.recommendationsEnabled).toBe(false);
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
