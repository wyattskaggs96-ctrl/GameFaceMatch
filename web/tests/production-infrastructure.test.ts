import { describe, expect, it } from "vitest";
import { checkCatalogCompatibility, verifyManifestIntegrity } from "@/lib/catalog/catalog-integrity";
import { PRODUCTION_PUBLISH_GATE_VERSION, requiredProductionPublishGateChecks, type ProductionPublishGateReport } from "@/lib/catalog/production-publish-gate";
import { getDeploymentRuntimeConfig } from "@/lib/config/deployment";
import { validateDeploymentEnvironment } from "@/lib/config/environment";
import { evaluateFeatureGates } from "@/lib/gates/feature-gates";
import { createHealthReport } from "@/lib/operations/health";
import { createPrivacySafeErrorReport, validateOperationalLogEvent } from "@/lib/operations/privacy-safe-error-reporting";
import { monitorCatalogRelease } from "@/lib/operations/release-monitoring";
import { createRollbackReadinessReport } from "@/lib/operations/rollback";
import type { GameCatalogItem, GameCatalogManifest } from "@/types/domain";

describe("production infrastructure safety", () => {
  it("validates deployment configuration without requiring secrets before payment is connected", () => {
    const config = getDeploymentRuntimeConfig({
      NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "production",
      NEXT_PUBLIC_GAMEFACE_APP_BASE_URL: "https://app.example.com",
      NEXT_PUBLIC_GAMEFACE_PRIVACY_URL: "https://example.com/privacy",
      NEXT_PUBLIC_GAMEFACE_TERMS_URL: "https://example.com/terms",
      NEXT_PUBLIC_GAMEFACE_SUPPORT_URL: "https://example.com/support",
      NEXT_PUBLIC_GAMEFACE_SUPPORT_CONTACT: "support@example.com",
      NEXT_PUBLIC_GAMEFACE_RELEASE_ID: "release-2026-07-21",
      NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED: "true",
      NEXT_PUBLIC_GAMEFACE_SCREENSHOT_REFINEMENT_DISABLED: "false"
    });

    expect(config.validation.valid).toBe(true);
    expect(config.releaseID).toBe("release-2026-07-21");
    expect(config.recommendationsDisabled).toBe(true);
    expect(config.screenshotRefinementDisabled).toBe(false);
  });

  it("rejects malformed deployment kill-switch values", () => {
    expect(
      validateDeploymentEnvironment({
        NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED: "yes"
      }).errors
    ).toContain('NEXT_PUBLIC_GAMEFACE_RECOMMENDATIONS_DISABLED must be either "true" or "false" when set.');
  });

  it("uses deployment kill switches only to disable approved recommendations and refinement", async () => {
    const catalog = await approvedCatalog();
    const integrity = await verifyManifestIntegrity(catalog);
    const compatibility = checkCatalogCompatibility(catalog, {
      supportedPlatforms: ["unit-test-platform"],
      supportedGameVersions: ["unit-test-version"]
    });
    const publishGate: ProductionPublishGateReport = {
      schemaVersion: PRODUCTION_PUBLISH_GATE_VERSION,
      ok: true,
      generatedAt: "2026-07-21T00:00:00.000Z",
      catalogVersionID: catalog.catalogVersion.identifier,
      checks: requiredProductionPublishGateChecks.map((name) => ({ name, status: "pass" as const, errors: [] })),
      errors: []
    };
    const gates = evaluateFeatureGates({
      manifest: catalog,
      integrity,
      compatibility,
      publishGate,
      environment: {
        nodeEnv: "production",
        screenshotRefinementEnabled: true,
        recommendationsDisabled: true,
        screenshotRefinementDisabled: true,
        disableReason: "Unit-test deployment kill switch."
      }
    });

    expect(gates.catalogVerified.enabled).toBe(true);
    expect(gates.recommendationsEnabled).toEqual({ enabled: false, reason: "Unit-test deployment kill switch." });
    expect(gates.screenshotRefinementEnabled.reason).toMatch(/disabled by the deployment kill switch/i);
  });

  it("reports health and catalog status without exposing secrets or media", () => {
    const manifest: GameCatalogManifest = {
      sourceType: "production",
      catalogVersion: { identifier: "empty-production", gameVersion: "", platform: "", verifiedAt: null },
      generatedAt: "2026-07-10T00:00:00.000Z",
      isProduction: true,
      items: []
    };
    const config = getDeploymentRuntimeConfig({
      NEXT_PUBLIC_GAMEFACE_RELEASE_ID: "unit-health",
      NEXT_PUBLIC_GAMEFACE_SUPPORT_URL: "https://example.com/support",
      NEXT_PUBLIC_GAMEFACE_SUPPORT_CONTACT: "support@example.com"
    });
    const report = createHealthReport({
      config,
      manifest,
      now: new Date("2026-07-21T00:00:00.000Z"),
      uptimeSeconds: 42
    });

    expect(report.status).toBe("degraded");
    expect(report.catalog.state).toBe("empty");
    expect(report.privacy).toEqual({
      rawMediaLogging: "disabled",
      analyticsPreciseMeasurements: "prohibited",
      externalErrorProviderConnected: false
    });
    expect(JSON.stringify(report)).not.toMatch(/TOKEN|SECRET|data:image|blob:/i);
  });

  it("monitors catalog release mismatch without enabling recommendations", () => {
    const report = monitorCatalogRelease(
      {
        sourceType: "production",
        catalogVersion: { identifier: "catalog-a", gameVersion: "1", platform: "xbox", verifiedAt: "2026-07-21T00:00:00.000Z" },
        generatedAt: "2026-07-21T00:00:00.000Z",
        isProduction: true,
        items: []
      },
      "catalog-b"
    );

    expect(report.state).toBe("mismatch");
    expect(report.message).toContain("does not match expected catalog");
  });

  it("keeps operational error reports privacy-safe", () => {
    const safe = createPrivacySafeErrorReport(new TypeError("camera frame should not be copied"), {
      category: "clientError",
      releaseID: "unit-release",
      catalogVersionID: "empty-production",
      metadata: { route: "/", statusCode: 500 }
    });
    expect(validateOperationalLogEvent(safe)).toEqual({ ok: true, errors: [] });

    expect(
      validateOperationalLogEvent({
        ...safe,
        metadata: { rawImage: "data:image/png;base64,abc" } as never
      }).ok
    ).toBe(false);
  });

  it("blocks rollback until a target artifact, catalog manifest, and approval are present", () => {
    const blocked = createRollbackReadinessReport({
      currentReleaseID: "release-current",
      targetReleaseID: "release-current",
      targetBuildArtifactAvailable: false,
      targetCatalogManifestAvailable: false,
      operatorApprovalRecorded: false
    });
    expect(blocked.ready).toBe(false);
    expect(blocked.blockers).toEqual([
      "Rollback target must differ from the current release.",
      "Rollback target build artifact is not available.",
      "Rollback target catalog manifest is not available.",
      "Owner or release-manager rollback approval has not been recorded."
    ]);

    const ready = createRollbackReadinessReport({
      currentReleaseID: "release-current",
      targetReleaseID: "release-previous",
      targetBuildArtifactAvailable: true,
      targetCatalogManifestAvailable: true,
      operatorApprovalRecorded: true
    });
    expect(ready.ready).toBe(true);
    expect(ready.steps).toContain("Verify /api/health and /api/uptime on the rollback URL.");
  });
});

async function approvedCatalog(): Promise<GameCatalogManifest> {
  const item: GameCatalogItem = {
    sourceType: "production",
    stableInternalID: "unit-prod-infra-item",
    game: "EA SPORTS College Football 27",
    gameVersion: "unit-test-version",
    patchVersion: "unit-test-patch",
    platform: "unit-test-platform",
    gameMode: "unit-test-mode",
    creationPath: "unit-test-path",
    category: "unit-test-category",
    visibleGameLabelOrIndex: "unit-test-label",
    verificationState: "verified",
    capturedDate: "2026-07-21T00:00:00.000Z",
    verifiedDate: "2026-07-21T00:00:00.000Z",
    sourceImageReferences: ["asset-front", "asset-left45", "asset-right45", "asset-left-profile", "asset-right-profile"],
    requiredAngles: {
      straightOn: "asset-front",
      left45: "asset-left45",
      right45: "asset-right45",
      leftProfile: "asset-left-profile",
      rightProfile: "asset-right-profile"
    },
    geometryMeasurements: {},
    humanAnnotations: {},
    catalogManagerDisposition: "approved",
    navigationInstructions: [
      {
        sequenceNumber: 1,
        instruction: "unit-test-only navigation",
        evidenceAssetID: "asset-front"
      }
    ],
    catalogVersion: {
      identifier: "unit-production-infra-v1",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: "2026-07-21T00:00:00.000Z"
    },
    isTestFixture: false
  };
  const catalog: GameCatalogManifest = {
    sourceType: "production",
    catalogVersion: item.catalogVersion,
    generatedAt: "2026-07-21T00:00:00.000Z",
    isProduction: true,
    declaredItemCount: 1,
    releaseStatus: "approvedRelease",
    releaseNotes: {
      summary: "Unit production infrastructure fixture.",
      createdAt: "2026-07-21T00:00:00.000Z",
      author: "unit-test",
      changes: [{ type: "added", stableInternalID: item.stableInternalID, description: "Unit test record." }]
    },
    items: [item]
  };
  const integrity = await verifyManifestIntegrity(catalog);
  return { ...catalog, packageChecksum: integrity.actualChecksum };
}
