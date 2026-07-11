import { describe, expect, it } from "vitest";
import { CollegeFootball27Adapter } from "@/lib/adapters/college-football-27-adapter";
import { GameAdapterError } from "@/lib/adapters/game-appearance-adapter";
import { CatalogValidationError } from "@/lib/catalog/catalog-errors";
import { createBundledCatalogRepository } from "@/lib/catalog/catalog-repository";
import { validateProductionCatalog } from "@/lib/catalog/catalog-validator";
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

  it("rejects duplicate catalog IDs", () => {
    const item = validItem("duplicate");
    expect(() => validateProductionCatalog(manifest([item, item]))).toThrow(/Duplicate stable ID/);
  });

  it("rejects unverified production records", () => {
    const item = validItem("unverified");
    item.verificationState = "unverified";
    expect(() => validateProductionCatalog(manifest([item]))).toThrow(/Unverified production record/);
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
    stableInternalID: id,
    game: "EA SPORTS College Football 27",
    gameVersion: "unit-test-version",
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
