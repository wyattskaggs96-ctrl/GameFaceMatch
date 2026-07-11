import type { GameCatalogManifest, GameCatalogVersion } from "@/types/domain";
import { validateProductionCatalog } from "./catalog-validator";
import { productionCatalogManifest } from "./production-manifest";

export interface CatalogRepository {
  loadProductionManifest(): Promise<GameCatalogManifest>;
  getCatalogStatus(): Promise<{
    isEmpty: boolean;
    version: GameCatalogVersion;
    verifiedAt: string | null;
  }>;
}

export function createBundledCatalogRepository(manifest: GameCatalogManifest = productionCatalogManifest): CatalogRepository {
  return {
    async loadProductionManifest() {
      return validateProductionCatalog(manifest);
    },
    async getCatalogStatus() {
      const validManifest = validateProductionCatalog(manifest);
      return {
        isEmpty: validManifest.items.length === 0,
        version: validManifest.catalogVersion,
        verifiedAt: validManifest.catalogVersion.verifiedAt
      };
    }
  };
}
