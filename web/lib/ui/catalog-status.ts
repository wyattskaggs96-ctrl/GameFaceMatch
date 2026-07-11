import type { GameCatalogManifest } from "@/types/domain";

export function isProductionCatalogEmpty(manifest: GameCatalogManifest) {
  return manifest.isProduction && manifest.items.length === 0;
}

export function shouldShowDevelopmentCatalogBanner(nodeEnv: string, catalogIsEmpty: boolean) {
  return nodeEnv !== "production" && catalogIsEmpty;
}
