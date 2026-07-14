import type { GameCatalogManifest } from "@/types/domain";
import { classifyCatalogRecord, hasApprovedCatalogManagerDisposition } from "@/lib/catalog/catalog-record-classification";
import { isDataSourceType, isProductionBlockedSource, isProductionSource } from "@/lib/data/source-types";
import { CatalogValidationError } from "./catalog-errors";

const requiredAngles = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"] as const;
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;

export function validateProductionCatalog(manifest: GameCatalogManifest, availableAssetIDs = new Set<string>()) {
  if (!manifest || !Array.isArray(manifest.items) || !manifest.catalogVersion) {
    throw new CatalogValidationError("malformedCatalog", "Catalog manifest is malformed.");
  }
  if (Number.isInteger(manifest.declaredItemCount) && manifest.declaredItemCount !== manifest.items.length) {
    throw new CatalogValidationError("incorrectManifestItemCount", `Manifest declares ${manifest.declaredItemCount} items but contains ${manifest.items.length}.`);
  }
  if (!isValidISODate(manifest.generatedAt)) {
    throw new CatalogValidationError("invalidDate", "Catalog manifest has invalid generatedAt date.");
  }
  if (!isDataSourceType(manifest.sourceType)) {
    throw new CatalogValidationError("invalidSourceType", "Catalog manifest is missing a valid sourceType.");
  }
  if (!manifest.isProduction) {
    return manifest;
  }
  if (!isProductionSource(manifest.sourceType)) {
    throw new CatalogValidationError("nonProductionSourceInProduction", `Production catalog cannot use sourceType ${manifest.sourceType}.`);
  }

  const seen = new Set<string>();
  for (const item of manifest.items) {
    const id = item.stableInternalID?.trim();
    if (!id) {
      throw new CatalogValidationError("missingStableID", "Production catalog item is missing a stable internal ID.");
    }
    if (item.game !== "EA SPORTS College Football 27") {
      throw new CatalogValidationError("invalidGame", `Invalid game for ${id}.`);
    }
    if (!isDataSourceType(item.sourceType)) {
      throw new CatalogValidationError("invalidSourceType", `Invalid sourceType for ${id}.`);
    }
    if (isProductionBlockedSource(item.sourceType)) {
      throw new CatalogValidationError("nonProductionSourceInProduction", `Production catalog cannot include ${item.sourceType} record: ${id}.`);
    }
    const classification = classifyCatalogRecord(item);
    if (classification.classification === "PUBLIC_SOURCE_ONLY") {
      throw new CatalogValidationError("publicSourceOnlyRecordInProduction", `Public-source-only record cannot be shown as a shipping-game setting: ${id}.`);
    }
    if (classification.classification === "PLACEHOLDER") {
      throw new CatalogValidationError("placeholderToken", `Placeholder token in production record: ${id}.`);
    }
    if (seen.has(id)) {
      throw new CatalogValidationError("duplicateStableID", `Duplicate stable ID: ${id}`);
    }
    seen.add(id);
    if (!item.gameVersion?.trim()) {
      throw new CatalogValidationError("missingGameVersion", `Missing game version for ${id}.`);
    }
    if (!item.patchVersion?.trim()) {
      throw new CatalogValidationError("missingPatchVersion", `Missing patch version for ${id}.`);
    }
    if (!item.platform?.trim()) {
      throw new CatalogValidationError("missingPlatform", `Missing platform for ${id}.`);
    }
    if (!item.gameMode?.trim()) {
      throw new CatalogValidationError("missingGameMode", `Missing game mode for ${id}.`);
    }
    if (!item.creationPath?.trim()) {
      throw new CatalogValidationError("missingCreationPath", `Missing creation path for ${id}.`);
    }
    if (!item.category?.trim()) {
      throw new CatalogValidationError("missingCategory", `Missing category for ${id}.`);
    }
    if (item.verificationState !== "verified") {
      throw new CatalogValidationError("unverifiedProductionRecord", `Unverified production record: ${id}.`);
    }
    if (item.isTestFixture) {
      throw new CatalogValidationError("fixtureRecordInProduction", `Fixture record in production catalog: ${id}.`);
    }
    if (!hasApprovedCatalogManagerDisposition(item)) {
      throw new CatalogValidationError("missingCatalogManagerDisposition", `Production record is missing catalog-manager disposition: ${id}.`);
    }
    if (!classification.productionAccessAllowed) {
      throw new CatalogValidationError("recordNotProductionVerified", `Record is not eligible for production recommendation access: ${id}.`);
    }
    if (containsPlaceholder(item)) {
      throw new CatalogValidationError("placeholderToken", `Placeholder token in production record: ${id}.`);
    }
    if (isPlaceholderLabel(item.visibleGameLabelOrIndex)) {
      throw new CatalogValidationError("placeholderLabel", `Placeholder visible game label for ${id}.`);
    }
    if (!isValidISODate(item.capturedDate) || !isValidISODate(item.verifiedDate)) {
      throw new CatalogValidationError("invalidDate", `Invalid catalog date for ${id}.`);
    }
    if (item.deprecated && !item.deprecatedContext?.trim()) {
      throw new CatalogValidationError("deprecatedContextMissing", `Deprecated record lacks context: ${id}.`);
    }
    if ((item.sourceImageReferences ?? []).length === 0) {
      throw new CatalogValidationError("missingSourceImage", `Missing source images for ${id}.`);
    }
    for (const angle of requiredAngles) {
      const assetID = item.requiredAngles?.[angle];
      if (!assetID?.trim()) {
        throw new CatalogValidationError("missingRequiredAngle", `Missing required angle ${angle} for ${id}.`);
      }
      if (assetID && !item.sourceImageReferences.includes(assetID)) {
        throw new CatalogValidationError("missingSourceImage", `Required angle ${angle} is missing from source images for ${id}.`);
      }
    }
    for (const [measurement, value] of Object.entries(item.geometryMeasurements ?? {})) {
      if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 0) {
          throw new CatalogValidationError("malformedMeasurement", `Malformed measurement ${measurement} for ${id}.`);
        }
      } else {
        if (!Number.isFinite(value.value) || value.value < 0) {
          throw new CatalogValidationError("malformedMeasurement", `Malformed measurement ${measurement} for ${id}.`);
        }
        if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
          throw new CatalogValidationError("invalidConfidence", `Invalid confidence for measurement ${measurement} on ${id}.`);
        }
        if (!Number.isFinite(value.variance) || value.variance < 0) {
          throw new CatalogValidationError("negativeVariance", `Invalid variance for measurement ${measurement} on ${id}.`);
        }
      }
    }
    for (const reference of item.sourceImageReferences ?? []) {
      if (availableAssetIDs.size > 0 && !availableAssetIDs.has(reference)) {
        throw new CatalogValidationError("unavailableAssetReference", `Unavailable asset reference ${reference} for ${id}.`);
      }
    }
    if ((item.navigationInstructions ?? []).length === 0) {
      throw new CatalogValidationError("missingNavigationInstruction", `Missing verified navigation instructions for ${id}.`);
    }
    for (const instruction of item.navigationInstructions ?? []) {
      if (!instruction.instruction?.trim()) {
        throw new CatalogValidationError("missingNavigationInstruction", `Missing verified navigation instruction text for ${id}.`);
      }
      if (!instruction.evidenceAssetID?.trim()) {
        throw new CatalogValidationError("missingNavigationEvidence", `Missing navigation evidence asset for ${id}.`);
      }
    }
  }

  return manifest;
}

function containsPlaceholder(value: unknown) {
  return placeholderPattern.test(JSON.stringify(value));
}

function isValidISODate(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function isPlaceholderLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === "placeholder" ||
    normalized === "tbd" ||
    normalized === "todo" ||
    normalized === "mock" ||
    normalized === "test" ||
    normalized.includes("placeholder") ||
    normalized.includes("to be verified")
  );
}
