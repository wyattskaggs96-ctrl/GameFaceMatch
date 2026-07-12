import { describe, expect, it } from "vitest";
import { CollegeFootball27Adapter } from "@/lib/adapters/college-football-27-adapter";
import { GameAdapterError } from "@/lib/adapters/game-appearance-adapter";
import { CatalogValidationError } from "@/lib/catalog/catalog-errors";
import { assessCatalogStaleness, checkCatalogCompatibility, verifyManifestIntegrity } from "@/lib/catalog/catalog-integrity";
import { createBundledCatalogRepository } from "@/lib/catalog/catalog-repository";
import { validateProductionCatalog } from "@/lib/catalog/catalog-validator";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import type { GameCatalogItem, GameCatalogManifest, StandardFaceProfile } from "@/types/domain";

describe("catalog validation", () => {
  it("accepts an empty production catalog", () => {
    expect(validateProductionCatalog(manifest([])).items).toHaveLength(0);
  });

  it("rejects malformed catalogs", () => {
    expect(() => validateProductionCatalog({ items: [] } as unknown as GameCatalogManifest)).toThrow(CatalogValidationError);
  });

  it("rejects fixture records in production", () => {
    const item = validItem("fixture");
    item.isTestFixture = true;
    expect(() => validateProductionCatalog(manifest([item]))).toThrow(/Fixture record/);
  });

  it("rejects non-production source types in production", () => {
    const catalog = manifest([validItem("source-type")]);
    catalog.sourceType = "researchDraft";
    expect(() => validateProductionCatalog(catalog)).toThrow(/sourceType researchDraft/);

    const item = validItem("fixture-source-type");
    item.sourceType = "testFixture";
    expect(() => validateProductionCatalog(manifest([item]))).toThrow(/testFixture record/);
  });

  it("rejects duplicate catalog IDs", () => {
    const item = validItem("duplicate");
    expect(() => validateProductionCatalog(manifest([item, item]))).toThrow(/Duplicate stable ID/);
  });

  it("rejects unverified production records", () => {
    const item = validItem("unverified");
    item.verificationState = "unverified";
    expect(() => validateProductionCatalog(manifest([item]))).toThrow(/Unverified production record/);
  });

  it("rejects records with missing patch version or wrong game identity", () => {
    const missingPatch = validItem("missing-patch");
    missingPatch.patchVersion = "";
    expect(() => validateProductionCatalog(manifest([missingPatch]))).toThrow(/Missing patch version/);

    const wrongGame = validItem("wrong-game");
    wrongGame.game = "Unit Test Game";
    expect(() => validateProductionCatalog(manifest([wrongGame]))).toThrow(/Invalid game/);
  });
});

describe("production catalog runtime loading", () => {
  it("loads the repository production manifest and remains empty when no audited package exists", async () => {
    const repository = createBundledCatalogRepository(productionCatalogManifest);
    const status = await repository.loadRuntimeStatus();
    expect(status.manifest.catalogVersion.identifier).toBe("empty-production");
    expect(status.manifest.items).toHaveLength(0);
    expect(status.integrity.state).toBe("emptyCatalogUnsigned");
    expect(status.compatibility.compatible).toBe(true);
    expect(status.staleness.state).toBe("unverified");
  });

  it("fails closed for non-empty production catalogs without checksums", async () => {
    const repository = createBundledCatalogRepository(manifest([validItem("missing-checksum")]));
    await expect(repository.loadProductionManifest()).rejects.toThrow(/missing packageChecksum/i);
    expect(repository.getRuntimeErrors()[0]).toMatchObject({
      code: "missingChecksum",
      catalogVersionID: "unit-test-only"
    });
  });

  it("verifies deterministic checksums before exposing records", async () => {
    const catalog = manifest([validItem("checksum-ok")]);
    const firstReport = await verifyManifestIntegrity(catalog);
    catalog.packageChecksum = firstReport.actualChecksum;
    const secondReport = await verifyManifestIntegrity(catalog);
    expect(secondReport.state).toBe("verified");
    expect(secondReport.ok).toBe(true);
  });

  it("blocks incompatible platform or game version selections", () => {
    const report = checkCatalogCompatibility(manifest([validItem("compatibility")]), {
      supportedPlatforms: ["different-platform"],
      supportedGameVersions: ["unit-test-version"]
    });
    expect(report.compatible).toBe(false);
  });

  it("warns when verified catalog data is stale", () => {
    const catalog = manifest([validItem("stale")]);
    catalog.catalogVersion.verifiedAt = "2026-07-10T00:00:00.000Z";
    const report = assessCatalogStaleness(catalog, new Date("2026-09-01T00:00:00.000Z"), 30);
    expect(report.state).toBe("stale");
    expect(report.message).toMatch(/re-audited/i);
  });
});

describe("CollegeFootball27Adapter", () => {
  it("fails closed when the verified catalog is not loaded", async () => {
    const adapter = new CollegeFootball27Adapter(createBundledCatalogRepository(manifest([])));
    await expect(adapter.match(profile)).rejects.toMatchObject(new GameAdapterError("catalogUnavailable", CATALOG_UNAVAILABLE_MESSAGE));
  });
});

function manifest(items: GameCatalogItem[]): GameCatalogManifest {
  return {
    sourceType: "production",
    catalogVersion: {
      identifier: "unit-test-only",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: null
    },
    generatedAt: "2026-07-10T00:00:00.000Z",
    isProduction: true,
    items
  };
}

function validItem(id: string): GameCatalogItem {
  return {
    sourceType: "production",
    stableInternalID: id,
    game: "EA SPORTS College Football 27",
    gameVersion: "unit-test-version",
    patchVersion: "unit-test-patch",
    platform: "unit-test-platform",
    gameMode: "unit-test-mode",
    creationPath: "unit-test-path",
    category: "unit-test-category",
    visibleGameLabelOrIndex: "unit-test-label",
    verificationState: "verified",
    capturedDate: "2026-07-10T00:00:00.000Z",
    verifiedDate: "2026-07-10T00:00:00.000Z",
    sourceImageReferences: ["asset-front", "asset-left45", "asset-right45", "asset-left-profile", "asset-right-profile"],
    requiredAngles: {
      straightOn: "asset-front",
      left45: "asset-left45",
      right45: "asset-right45",
      leftProfile: "asset-left-profile",
      rightProfile: "asset-right-profile"
    },
    geometryMeasurements: {
      faceWidthRatio: {
        value: 0.7,
        confidence: 0.9,
        supportingFrameCount: 5,
        variance: 0.01,
        depthSupported: false,
        occlusionStatus: "none",
        measurementSource: "unit-test-only",
        availabilityState: "available"
      }
    },
    humanAnnotations: { note: "unit-test-only" },
    navigationInstructions: [
      {
        sequenceNumber: 1,
        instruction: "unit-test-only navigation",
        evidenceAssetID: "asset-front"
      }
    ],
    catalogVersion: {
      identifier: "unit-test-only",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: "2026-07-10T00:00:00.000Z"
    },
    isTestFixture: false
  };
}

const profile: StandardFaceProfile = {
  ...createStandardFaceProfile({
    session: createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z")),
    attributes: createInitialAttributeConfirmation(),
    now: new Date("2026-07-10T00:00:00.000Z"),
    userAgent: "unit-test"
  })
};
