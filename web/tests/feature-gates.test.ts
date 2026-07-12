import { describe, expect, it } from "vitest";
import { checkCatalogCompatibility, verifyManifestIntegrity } from "@/lib/catalog/catalog-integrity";
import { approveCatalogRelease, evaluateFeatureGates } from "@/lib/gates/feature-gates";
import type { GameCatalogItem, GameCatalogManifest } from "@/types/domain";

describe("feature and capability gates", () => {
  it("keeps fixture records from enabling production recommendations", async () => {
    const catalog = await approvedStyleCatalog({ itemOverrides: { isTestFixture: true } });
    const gates = await gatesFor(catalog);
    expect(gates.recommendationsEnabled.enabled).toBe(false);
    expect(gates.catalogVerified.reason).toMatch(/Fixture record/i);
  });

  it("keeps an unverified catalog from enabling recommendations", async () => {
    const catalog = await approvedStyleCatalog({ itemOverrides: { verificationState: "unverified" } });
    const gates = await gatesFor(catalog);
    expect(gates.catalogAvailable.enabled).toBe(true);
    expect(gates.recommendationsEnabled.enabled).toBe(false);
    expect(gates.catalogVerified.reason).toMatch(/Unverified production record/i);
  });

  it("blocks recommendations when the catalog version is unsupported", async () => {
    const catalog = await approvedStyleCatalog();
    const integrity = await verifyManifestIntegrity(catalog);
    const compatibility = checkCatalogCompatibility(catalog, {
      supportedPlatforms: ["unsupported-test-platform"],
      supportedGameVersions: ["unit-test-version"]
    });
    const gates = evaluateFeatureGates({ manifest: catalog, integrity, compatibility });
    expect(gates.catalogVersionSupported.enabled).toBe(false);
    expect(gates.recommendationsEnabled.enabled).toBe(false);
    expect(gates.recommendationsEnabled.reason).toMatch(/not supported by this runtime/i);
  });

  it("enables recommendations only for an approved catalog release path", async () => {
    const catalog = await approvedStyleCatalog();
    const integrity = await verifyManifestIntegrity(catalog);
    const compatibility = checkCatalogCompatibility(catalog, {
      supportedPlatforms: ["unit-test-platform"],
      supportedGameVersions: ["unit-test-version"]
    });
    const approval = approveCatalogRelease({ manifest: catalog, integrity, compatibility });
    const gates = evaluateFeatureGates({
      manifest: catalog,
      integrity,
      compatibility,
      environment: {
        nodeEnv: "production",
        adminCatalogToolsEnabled: true,
        verifierToolsEnabled: true,
        manualStudyEnabled: true,
        screenshotRefinementEnabled: true
      }
    });
    expect(approval.approvedRelease).toMatchObject({
      catalogVersionID: "unit-test-approved-release-v1",
      packageChecksum: catalog.packageChecksum,
      itemCount: 1
    });
    expect(gates.catalogVerified.enabled).toBe(true);
    expect(gates.recommendationsEnabled.enabled).toBe(true);
    expect(gates.adminCatalogToolsEnabled.enabled).toBe(false);
    expect(gates.verifierToolsEnabled.enabled).toBe(false);
    expect(gates.manualStudyEnabled.enabled).toBe(false);
  });

  it("does not allow environment flags alone to bypass catalog verification", () => {
    const gates = evaluateFeatureGates({
      environment: {
        nodeEnv: "development",
        adminCatalogToolsEnabled: true,
        verifierToolsEnabled: true,
        manualStudyEnabled: true,
        screenshotRefinementEnabled: true
      }
    });
    expect(gates.adminCatalogToolsEnabled.enabled).toBe(true);
    expect(gates.verifierToolsEnabled.enabled).toBe(true);
    expect(gates.manualStudyEnabled.enabled).toBe(true);
    expect(gates.catalogVerified.enabled).toBe(false);
    expect(gates.recommendationsEnabled.enabled).toBe(false);
  });
});

async function gatesFor(catalog: GameCatalogManifest) {
  const integrity = await verifyManifestIntegrity(catalog);
  const compatibility = checkCatalogCompatibility(catalog, {
    supportedPlatforms: ["unit-test-platform"],
    supportedGameVersions: ["unit-test-version"]
  });
  return evaluateFeatureGates({ manifest: catalog, integrity, compatibility });
}

async function approvedStyleCatalog(options: { itemOverrides?: Partial<GameCatalogItem> } = {}): Promise<GameCatalogManifest> {
  const item = {
    ...validItem("unit-test-gate-item"),
    ...options.itemOverrides
  };
  const catalog: GameCatalogManifest = {
    catalogVersion: {
      identifier: "unit-test-approved-release-v1",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: "2026-07-10T00:00:00.000Z"
    },
    generatedAt: "2026-07-10T00:00:00.000Z",
    isProduction: true,
    declaredItemCount: 1,
    items: [item]
  };
  const integrity = await verifyManifestIntegrity(catalog);
  return { ...catalog, packageChecksum: integrity.actualChecksum };
}

function validItem(id: string): GameCatalogItem {
  return {
    stableInternalID: id,
    game: "EA SPORTS College Football 27",
    gameVersion: "unit-test-version",
    patchVersion: "unit-test-patch",
    platform: "unit-test-platform",
    gameMode: "unit-test-mode",
    creationPath: "unit-test-path",
    category: "unit-test-category",
    visibleGameLabelOrIndex: "unit-test-visible-label",
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
      identifier: "unit-test-approved-release-v1",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: "2026-07-10T00:00:00.000Z"
    },
    isTestFixture: false
  };
}
