export class CatalogValidationError extends Error {
  constructor(
    public readonly code:
      | "duplicateStableID"
      | "missingStableID"
      | "missingGameVersion"
      | "missingPlatform"
      | "missingGameMode"
      | "missingCreationPath"
      | "placeholderLabel"
      | "unverifiedProductionRecord"
      | "fixtureRecordInProduction"
      | "malformedMeasurement"
      | "unavailableAssetReference"
      | "placeholderToken"
      | "invalidDate"
      | "invalidConfidence"
      | "negativeVariance"
      | "missingSourceImage"
      | "missingRequiredAngle"
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
