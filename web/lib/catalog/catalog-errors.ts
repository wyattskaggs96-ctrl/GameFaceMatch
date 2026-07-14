export class CatalogValidationError extends Error {
  constructor(
    public readonly code:
      | "duplicateStableID"
      | "missingStableID"
      | "missingGameVersion"
      | "missingPatchVersion"
      | "missingPlatform"
      | "missingGameMode"
      | "missingCreationPath"
      | "missingCategory"
      | "placeholderLabel"
      | "unverifiedProductionRecord"
      | "fixtureRecordInProduction"
      | "publicSourceOnlyRecordInProduction"
      | "missingCatalogManagerDisposition"
      | "recordNotProductionVerified"
      | "invalidSourceType"
      | "nonProductionSourceInProduction"
      | "malformedMeasurement"
      | "unavailableAssetReference"
      | "placeholderToken"
      | "invalidDate"
      | "invalidConfidence"
      | "negativeVariance"
      | "invalidGame"
      | "missingSourceImage"
      | "missingRequiredAngle"
      | "missingNavigationInstruction"
      | "missingNavigationEvidence"
      | "incorrectManifestItemCount"
      | "invalidVerificationStateTransition"
      | "deprecatedContextMissing"
      | "malformedCatalog",
    message: string
  ) {
    super(message);
    this.name = "CatalogValidationError";
  }
}
