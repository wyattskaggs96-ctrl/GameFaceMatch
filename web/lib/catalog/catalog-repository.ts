import type { DataSourceType, GameCatalogManifest, GameCatalogVersion } from "@/types/domain";
import {
  assessCatalogStaleness,
  checkCatalogCompatibility,
  createCatalogRuntimeErrorRecord,
  verifyManifestIntegrity,
  type CatalogCompatibilityReport,
  type CatalogIntegrityReport,
  type CatalogRuntimeErrorRecord,
  type CatalogStalenessReport
} from "./catalog-integrity";
import { validateProductionCatalog } from "./catalog-validator";
import { productionCatalogManifest } from "./production-manifest";

export interface CatalogRepository {
  loadProductionManifest(): Promise<GameCatalogManifest>;
  loadRuntimeStatus(): Promise<CatalogRuntimeStatus>;
  getRuntimeErrors(): CatalogRuntimeErrorRecord[];
  getCatalogStatus(): Promise<{
    isEmpty: boolean;
    sourceType: DataSourceType;
    version: GameCatalogVersion;
    verifiedAt: string | null;
    integrity: CatalogIntegrityReport;
    compatibility: CatalogCompatibilityReport;
    staleness: CatalogStalenessReport;
  }>;
}

export interface CatalogRuntimeStatus {
  manifest: GameCatalogManifest;
  integrity: CatalogIntegrityReport;
  compatibility: CatalogCompatibilityReport;
  staleness: CatalogStalenessReport;
  runtimeErrors: CatalogRuntimeErrorRecord[];
}

export function createBundledCatalogRepository(
  manifest: GameCatalogManifest = productionCatalogManifest,
  options: {
    supportedPlatforms?: string[];
    supportedGameVersions?: string[];
    now?: Date;
  } = {}
): CatalogRepository {
  const runtimeErrors: CatalogRuntimeErrorRecord[] = [];

  async function loadRuntimeStatus(): Promise<CatalogRuntimeStatus> {
    try {
      const validManifest = validateProductionCatalog(manifest);
      const integrity = await verifyManifestIntegrity(validManifest);
      if (!integrity.ok) {
        throw Object.assign(new Error(integrity.message), { code: integrity.state });
      }
      const compatibility = checkCatalogCompatibility(validManifest, options);
      if (!compatibility.compatible) {
        throw Object.assign(new Error(compatibility.message), { code: "catalogCompatibilityError" });
      }
      const staleness = assessCatalogStaleness(validManifest, options.now);
      return { manifest: validManifest, integrity, compatibility, staleness, runtimeErrors };
    } catch (error) {
      const record = createCatalogRuntimeErrorRecord(error, manifest);
      runtimeErrors.push(record);
      persistRuntimeError(record);
      throw error;
    }
  }

  return {
    async loadProductionManifest() {
      const status = await loadRuntimeStatus();
      return status.manifest;
    },
    loadRuntimeStatus,
    getRuntimeErrors() {
      return [...runtimeErrors];
    },
    async getCatalogStatus() {
      const status = await loadRuntimeStatus();
      const validManifest = status.manifest;
      return {
        isEmpty: validManifest.items.length === 0,
        sourceType: validManifest.sourceType,
        version: validManifest.catalogVersion,
        verifiedAt: validManifest.catalogVersion.verifiedAt,
        integrity: status.integrity,
        compatibility: status.compatibility,
        staleness: status.staleness
      };
    }
  };
}

function persistRuntimeError(record: CatalogRuntimeErrorRecord) {
  if (typeof window === "undefined") return;
  try {
    const key = "gameface.catalog.runtimeErrors.v1";
    const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as CatalogRuntimeErrorRecord[];
    window.localStorage.setItem(key, JSON.stringify([...existing.slice(-19), record]));
  } catch {
    // Local error reporting is best-effort and must never keep the catalog from failing closed.
  }
}
