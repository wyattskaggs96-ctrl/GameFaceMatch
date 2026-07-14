import type { DataSourceType, GameCatalogItem, GameCatalogManifest } from "@/types/domain";

export const dataSourceTypes: DataSourceType[] = [
  "production",
  "research",
  "researchDraft",
  "researchCandidate",
  "shippingGameVideoResearch",
  "publicSourceOnly",
  "testFixture",
  "demoData",
  "localDeveloperSample"
];

export const dataSourceTypeLabels: Record<DataSourceType, string> = {
  production: "Production catalog data",
  research: "Research data",
  researchDraft: "Research draft data",
  researchCandidate: "Research candidate data",
  shippingGameVideoResearch: "Shipping-game video research data",
  publicSourceOnly: "Public-source-only data",
  testFixture: "Test fixture data",
  demoData: "Demo data",
  localDeveloperSample: "Local developer sample"
};

export const dataSourceTypeDescriptions: Record<DataSourceType, string> = {
  production: "Verified records approved for production loading.",
  research: "Observed research data that cannot become user-facing until independently verified and published.",
  researchDraft: "Unpublished audit or research data that cannot become user-facing.",
  researchCandidate: "Directly observed research data that still requires independent verification and publication gates.",
  shippingGameVideoResearch: "Research data derived from supplied shipping-game video evidence; never user-facing until verified and released.",
  publicSourceOnly: "Public information that may guide research planning but cannot be shown as shipping-game settings.",
  testFixture: "Synthetic automated-test data isolated from production bundles.",
  demoData: "Non-production demo data for controlled previews only.",
  localDeveloperSample: "Local-only sample data that must not be committed as production input."
};

const validDataSourceTypeSet = new Set<string>(dataSourceTypes);
const productionBlockedTypes = new Set<DataSourceType>([
  "researchDraft",
  "research",
  "researchCandidate",
  "shippingGameVideoResearch",
  "publicSourceOnly",
  "testFixture",
  "demoData",
  "localDeveloperSample"
]);

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
