import type { DataSourceType, GameCatalogItem, GameCatalogManifest } from "@/types/domain";

export const dataSourceTypes: DataSourceType[] = ["production", "researchDraft", "testFixture", "demoData", "localDeveloperSample"];

export const dataSourceTypeLabels: Record<DataSourceType, string> = {
  production: "Production catalog data",
  researchDraft: "Research draft data",
  testFixture: "Test fixture data",
  demoData: "Demo data",
  localDeveloperSample: "Local developer sample"
};

export const dataSourceTypeDescriptions: Record<DataSourceType, string> = {
  production: "Verified records approved for production loading.",
  researchDraft: "Unpublished audit or research data that cannot become user-facing.",
  testFixture: "Synthetic automated-test data isolated from production bundles.",
  demoData: "Non-production demo data for controlled previews only.",
  localDeveloperSample: "Local-only sample data that must not be committed as production input."
};

const validDataSourceTypeSet = new Set<string>(dataSourceTypes);
const productionBlockedTypes = new Set<DataSourceType>(["researchDraft", "testFixture", "demoData", "localDeveloperSample"]);

export function isDataSourceType(value: unknown): value is DataSourceType {
  return typeof value === "string" && validDataSourceTypeSet.has(value);
}

export function getDataSourceTypeLabel(value: DataSourceType | undefined) {
  return value ? dataSourceTypeLabels[value] : "Unclassified data";
}

export function isProductionSource(value: unknown): value is "production" {
  return value === "production";
}

export function isProductionBlockedSource(value: unknown): value is Exclude<DataSourceType, "production"> {
  return isDataSourceType(value) && productionBlockedTypes.has(value);
}

export function classifyCatalogManifest(manifest: Pick<GameCatalogManifest, "sourceType" | "isProduction">) {
  if (!isDataSourceType(manifest.sourceType)) return "unclassified";
  if (manifest.isProduction && manifest.sourceType !== "production") return "invalidProduction";
  return manifest.sourceType;
}

export function hasProductionSource(item: Pick<GameCatalogItem, "sourceType" | "isTestFixture">) {
  return item.sourceType === "production" && item.isTestFixture === false;
}
