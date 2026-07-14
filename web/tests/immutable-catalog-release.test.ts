import { describe, expect, it } from "vitest";
import {
  ImmutableCatalogReleaseError,
  addCatalogRelease,
  createCatalogReleaseRecord,
  createCorrectedCatalogRelease,
  createEmptyCatalogReleaseRegistry,
  getCatalogVersionForRecommendation,
  getHistoricalCatalogRelease,
  transitionCatalogRelease,
  validateCatalogReleaseRegistry,
  validateCatalogReleaseRegistryIntegrity,
  verifyCatalogReleaseRecordIntegrity
} from "@/lib/catalog/immutable-catalog-release";
import type { CatalogReleaseNotes, GameAppearanceMatch, GameCatalogItem, GameCatalogManifest } from "@/types/domain";

const now = "2026-07-12T00:00:00.000Z";

describe("immutable catalog releases", () => {
  it("supports draft, review candidate, verification candidate, approved, superseded, and rejected statuses", async () => {
    let registry = createEmptyCatalogReleaseRegistry();
    const draft = await createCatalogReleaseRecord({
      manifest: manifest("catalog-release-v1"),
      status: "draft",
      releaseNotes: notes("Initial draft."),
      createdAt: now
    });
    registry = addCatalogRelease(registry, draft);
    registry = await transitionCatalogRelease({ registry, catalogVersionID: "catalog-release-v1", toStatus: "reviewCandidate", changedAt: now });
    registry = await transitionCatalogRelease({ registry, catalogVersionID: "catalog-release-v1", toStatus: "verificationCandidate", changedAt: now });
    registry = await transitionCatalogRelease({ registry, catalogVersionID: "catalog-release-v1", toStatus: "approvedRelease", changedAt: now });
    registry = await transitionCatalogRelease({ registry, catalogVersionID: "catalog-release-v1", toStatus: "supersededRelease", changedAt: "2026-07-13T00:00:00.000Z" });
    const rejected = await createCatalogReleaseRecord({
      manifest: manifest("catalog-release-rejected"),
      status: "rejectedRelease",
      releaseNotes: notes("Rejected release candidate."),
      createdAt: now
    });
    registry = addCatalogRelease(registry, rejected);

    expect(registry.releases.map((release) => release.status)).toEqual(["supersededRelease", "rejectedRelease"]);
    expect(validateCatalogReleaseRegistry(registry).errors).toEqual([]);
  });

  it("prevents silently editing an approved release and detects nested manifest mutations", async () => {
    let registry = createEmptyCatalogReleaseRegistry();
    const approved = await createCatalogReleaseRecord({
      manifest: manifest("catalog-release-v1"),
      status: "approvedRelease",
      releaseNotes: notes("Approved release."),
      createdAt: now
    });
    registry = addCatalogRelease(registry, approved);

    await expect(transitionCatalogRelease({ registry, catalogVersionID: "catalog-release-v1", toStatus: "draft", changedAt: now })).rejects.toMatchObject(
      new ImmutableCatalogReleaseError("immutablePublishedRelease", "catalog-release-v1 is immutable after approval. Create a corrected release instead.")
    );

    const mutated = getHistoricalCatalogRelease(registry, "catalog-release-v1");
    expect(mutated).not.toBeNull();
    mutated!.manifest.items[0].visibleGameLabelOrIndex = "unit-test-mutated-label";
    const integrity = await verifyCatalogReleaseRecordIntegrity(mutated!);

    expect(integrity.ok).toBe(false);
    expect(integrity.errors.map((error) => error.code)).toContain("immutableReleaseModified");
  });

  it("requires corrections to create a new catalog version while preserving the previous release", async () => {
    let registry = createEmptyCatalogReleaseRegistry();
    const approved = await createCatalogReleaseRecord({
      manifest: manifest("catalog-release-v1"),
      status: "approvedRelease",
      releaseNotes: notes("Approved release."),
      createdAt: now
    });
    registry = addCatalogRelease(registry, approved);

    await expect(createCorrectedCatalogRelease({
      registry,
      previousCatalogVersionID: "catalog-release-v1",
      correctedManifest: manifest("catalog-release-v1"),
      releaseNotes: notes("Invalid same-version correction."),
      createdAt: "2026-07-13T00:00:00.000Z"
    })).rejects.toMatchObject(new ImmutableCatalogReleaseError("correctionMustUseNewVersion", "Corrections to published catalogs must create a new catalog version."));

    registry = await createCorrectedCatalogRelease({
      registry,
      previousCatalogVersionID: "catalog-release-v1",
      correctedManifest: manifest("catalog-release-v2"),
      releaseNotes: notes("Corrected verified label.", [{ type: "corrected", stableInternalID: "unit-test-item", description: "Corrected synthetic item metadata." }]),
      createdAt: "2026-07-13T00:00:00.000Z"
    });

    expect(getHistoricalCatalogRelease(registry, "catalog-release-v1")?.status).toBe("approvedRelease");
    expect(getHistoricalCatalogRelease(registry, "catalog-release-v2")).toMatchObject({
      status: "verificationCandidate",
      previousCatalogVersionID: "catalog-release-v1"
    });
  });

  it("retains historical releases for recommendations and stores the catalog version used", async () => {
    const release = await createCatalogReleaseRecord({
      manifest: manifest("catalog-release-v1"),
      status: "approvedRelease",
      releaseNotes: notes("Approved release."),
      createdAt: now
    });
    const registry = addCatalogRelease(createEmptyCatalogReleaseRegistry(), release);
    const match = {
      catalogVersion: release.manifest.catalogVersion
    } as GameAppearanceMatch;

    expect(match.catalogVersion.identifier).toBe("catalog-release-v1");
    expect(getCatalogVersionForRecommendation(match, registry)?.manifest.catalogVersion.identifier).toBe("catalog-release-v1");
  });

  it("requires release notes and checksums on approved release manifests", async () => {
    const release = await createCatalogReleaseRecord({
      manifest: manifest("catalog-release-v1"),
      status: "approvedRelease",
      releaseNotes: { ...notes(""), changes: [] },
      createdAt: now
    });
    const registry = addCatalogRelease(createEmptyCatalogReleaseRegistry(), release);
    const report = await validateCatalogReleaseRegistryIntegrity(registry);

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingReleaseNotes");
    expect(release.manifest.packageChecksum).toMatch(/^[a-f0-9]{64}$/);
  });
});

function notes(
  summary: string,
  changes: CatalogReleaseNotes["changes"] = [{ type: "added", stableInternalID: "unit-test-item", description: "Added synthetic unit-test item." }]
): CatalogReleaseNotes {
  return {
    summary,
    createdAt: now,
    author: "unit-test",
    changes
  };
}

function manifest(versionID: string): GameCatalogManifest {
  const item = validItem("unit-test-item", versionID);
  return {
    sourceType: "production",
    catalogVersion: {
      identifier: versionID,
      gameVersion: "unit-test-game-version",
      platform: "unit-test-platform",
      verifiedAt: now
    },
    generatedAt: now,
    isProduction: true,
    declaredItemCount: 1,
    releaseStatus: "draft",
    releaseNotes: notes("Draft release."),
    items: [item]
  };
}

function validItem(id: string, versionID: string): GameCatalogItem {
  return {
    sourceType: "production",
    stableInternalID: id,
    game: "EA SPORTS College Football 27",
    gameVersion: "unit-test-game-version",
    patchVersion: "unit-test-patch",
    platform: "unit-test-platform",
    gameMode: "unit-test-mode",
    creationPath: "unit-test-creation-path",
    category: "unit-test-category",
    visibleGameLabelOrIndex: "unit-test-visible-label",
    verificationState: "verified",
    capturedDate: now,
    verifiedDate: now,
    sourceImageReferences: ["asset-front", "asset-left45", "asset-right45", "asset-left-profile", "asset-right-profile"],
    requiredAngles: {
      straightOn: "asset-front",
      left45: "asset-left45",
      right45: "asset-right45",
      leftProfile: "asset-left-profile",
      rightProfile: "asset-right-profile"
    },
    geometryMeasurements: {},
    humanAnnotations: { note: "unit-test-only" },
    catalogManagerDisposition: "approved",
    navigationInstructions: [{ sequenceNumber: 1, instruction: "unit-test-only navigation", evidenceAssetID: "asset-front" }],
    catalogVersion: {
      identifier: versionID,
      gameVersion: "unit-test-game-version",
      platform: "unit-test-platform",
      verifiedAt: now
    },
    isTestFixture: false
  };
}
