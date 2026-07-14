import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateProductionCatalog } from "@/lib/catalog/catalog-validator";
import { classifyCatalogRecord } from "@/lib/catalog/catalog-record-classification";
import type { DataSourceType, GameCatalogItem, GameCatalogManifest } from "@/types/domain";
// @ts-expect-error Root classification command is plain ESM JavaScript and is exercised here as the command source of truth.
import { buildCatalogRecordClassification } from "../../scripts/catalog-record-classification.mjs";

const repositoryRoot = path.resolve("..");

describe("catalog record classification", () => {
  it("blocks research, public-source-only, fixture, and placeholder records from production access", () => {
    const research = classifyCatalogRecord({
      sourceType: "shippingGameVideoResearch",
      dataClass: "RESEARCH_CANDIDATE",
      verificationStatus: "OBSERVED_PENDING_VERIFICATION",
      sourceObservations: [{ videoID: "phase0-video-001", timestamp: 12 }]
    });
    const publicOnly = classifyCatalogRecord({ sourceType: "publicSourceOnly", stableInternalID: "public-only", verificationState: "verified" });
    const fixture = classifyCatalogRecord({ sourceType: "testFixture", isTestFixture: true, stableInternalID: "fixture" });
    const placeholder = classifyCatalogRecord({ sourceType: "production", stableInternalID: "placeholder", visibleGameLabelOrIndex: "REPLACE_WITH_VERIFIED_GAME_LABEL" });

    expect(research).toMatchObject({ classification: "RESEARCH_OBSERVED", productionAccessAllowed: false, hasSourceEvidence: true });
    expect(publicOnly).toMatchObject({ classification: "PUBLIC_SOURCE_ONLY", productionAccessAllowed: false });
    expect(fixture).toMatchObject({ classification: "TEST_FIXTURE", productionAccessAllowed: false });
    expect(placeholder).toMatchObject({ classification: "PLACEHOLDER", productionAccessAllowed: false });
  });

  it("allows only verified production records with catalog-manager disposition", () => {
    expect(classifyCatalogRecord(validItem("approved"))).toMatchObject({
      classification: "PRODUCTION_VERIFIED",
      productionAccessAllowed: true,
      hasCatalogManagerDisposition: true
    });

    const missingDisposition = validItem("missing-disposition");
    delete missingDisposition.catalogManagerDisposition;
    expect(classifyCatalogRecord(missingDisposition)).toMatchObject({
      classification: "PRODUCTION_VERIFIED",
      productionAccessAllowed: false,
      blockingIssues: ["missingCatalogManagerDisposition"]
    });
  });

  it("rejects public-source-only and manager-unapproved records in production validation", () => {
    const publicOnly = validItem("public-source-only", "publicSourceOnly");
    expect(() => validateProductionCatalog(manifest([publicOnly]))).toThrow(/Public-source-only|publicSourceOnly|sourceType publicSourceOnly/);

    const missingDisposition = validItem("missing-manager");
    delete missingDisposition.catalogManagerDisposition;
    expect(() => validateProductionCatalog(manifest([missingDisposition]))).toThrow(/catalog-manager disposition/i);
  });

  it("classifies current repository catalog records as non-production-accessible", () => {
    const rows = buildCatalogRecordClassification(repositoryRoot);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row: { classification: string }) => row.classification === "RESEARCH_OBSERVED")).toBe(true);
    expect(rows.some((row: { classification: string }) => row.classification === "TEST_FIXTURE")).toBe(true);
    expect(rows.some((row: { classification: string }) => row.classification === "PLACEHOLDER")).toBe(true);
    expect(rows.filter((row: { production_access_allowed: string }) => row.production_access_allowed === "true")).toHaveLength(0);
    expect(rows.filter((row: { classification: string; has_source_evidence: string }) => row.classification === "RESEARCH_OBSERVED" && row.has_source_evidence !== "true")).toHaveLength(0);
  });
});

function manifest(items: GameCatalogItem[]): GameCatalogManifest {
  return {
    sourceType: "production",
    catalogVersion: {
      identifier: "unit-test-only",
      gameVersion: "unit-test-version",
      platform: "unit-test-platform",
      verifiedAt: "2026-07-10T00:00:00.000Z"
    },
    generatedAt: "2026-07-10T00:00:00.000Z",
    isProduction: true,
    items
  };
}

function validItem(id: string, sourceType: DataSourceType = "production"): GameCatalogItem {
  return {
    sourceType,
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
    catalogManagerDisposition: "approved",
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
