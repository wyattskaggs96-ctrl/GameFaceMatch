import type { GameCatalogManifest } from "@/types/domain";

export type CatalogReleaseMonitorState = "empty" | "available" | "mismatch" | "unverified";

export interface CatalogReleaseMonitorReport {
  state: CatalogReleaseMonitorState;
  catalogVersionID: string;
  expectedCatalogVersionID: string | null;
  itemCount: number;
  verifiedAt: string | null;
  message: string;
}

export function monitorCatalogRelease(manifest: GameCatalogManifest, expectedCatalogVersionID?: string | null): CatalogReleaseMonitorReport {
  const catalogVersionID = manifest.catalogVersion.identifier;
  const expected = expectedCatalogVersionID || null;
  if (expected && expected !== catalogVersionID) {
    return {
      state: "mismatch",
      catalogVersionID,
      expectedCatalogVersionID: expected,
      itemCount: manifest.items.length,
      verifiedAt: manifest.catalogVersion.verifiedAt,
      message: `Loaded catalog ${catalogVersionID} does not match expected catalog ${expected}.`
    };
  }
  if (manifest.items.length === 0) {
    return {
      state: "empty",
      catalogVersionID,
      expectedCatalogVersionID: expected,
      itemCount: 0,
      verifiedAt: manifest.catalogVersion.verifiedAt,
      message: "Production catalog is empty; recommendations remain fail-closed."
    };
  }
  if (!manifest.catalogVersion.verifiedAt) {
    return {
      state: "unverified",
      catalogVersionID,
      expectedCatalogVersionID: expected,
      itemCount: manifest.items.length,
      verifiedAt: null,
      message: "Catalog records are present but the catalog version is not verified."
    };
  }
  return {
    state: "available",
    catalogVersionID,
    expectedCatalogVersionID: expected,
    itemCount: manifest.items.length,
    verifiedAt: manifest.catalogVersion.verifiedAt,
    message: "Catalog release metadata is present for monitoring."
  };
}
