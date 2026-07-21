import type { CatalogCompatibilityReport, CatalogIntegrityReport } from "@/lib/catalog/catalog-integrity";
import { isProductionPublishGateApproved, type ProductionPublishGateReport } from "@/lib/catalog/production-publish-gate";
import { validateProductionCatalog } from "@/lib/catalog/catalog-validator";
import type { GameCatalogManifest } from "@/types/domain";

export type CapabilityGateKey =
  | "catalogAvailable"
  | "catalogVerified"
  | "catalogVersionSupported"
  | "recommendationsEnabled"
  | "screenshotRefinementEnabled"
  | "faceCaptureEnabled"
  | "trueDepthAvailable"
  | "standardRGBCaptureAvailable"
  | "adminCatalogToolsEnabled"
  | "verifierToolsEnabled"
  | "manualStudyEnabled";

export interface CapabilityGateState {
  enabled: boolean;
  reason: string;
}

export type CapabilityGateReport = Record<CapabilityGateKey, CapabilityGateState>;

export interface FeatureGateEnvironment {
  nodeEnv?: "development" | "test" | "production" | string;
  faceCaptureEnabled?: boolean;
  standardRGBCaptureAvailable?: boolean;
  trueDepthAvailable?: boolean;
  screenshotRefinementEnabled?: boolean;
  recommendationsDisabled?: boolean;
  screenshotRefinementDisabled?: boolean;
  disableReason?: string;
  adminCatalogToolsEnabled?: boolean;
  verifierToolsEnabled?: boolean;
  manualStudyEnabled?: boolean;
}

export interface ApprovedCatalogRelease {
  approved: true;
  catalogVersionID: string;
  packageChecksum: string;
  verifiedAt: string;
  itemCount: number;
}

export interface CatalogReleaseApprovalResult {
  approvedRelease: ApprovedCatalogRelease | null;
  reasons: string[];
}

export interface FeatureGateInput {
  manifest?: GameCatalogManifest | null;
  integrity?: CatalogIntegrityReport | null;
  compatibility?: CatalogCompatibilityReport | null;
  publishGate?: ProductionPublishGateReport | null;
  environment?: FeatureGateEnvironment;
}

export function evaluateFeatureGates(input: FeatureGateInput = {}): CapabilityGateReport {
  const environment = input.environment ?? {};
  const releaseApproval = approveCatalogRelease(input);
  const isProductionRuntime = environment.nodeEnv === "production";
  const catalogAvailable = Boolean(input.manifest && input.manifest.items.length > 0);
  const catalogVersionSupported = Boolean(input.compatibility?.compatible);
  const recommendationsDisabled = environment.recommendationsDisabled === true;
  const recommendationDisableReason = environment.disableReason ?? "Recommendations are disabled by the deployment kill switch.";
  const catalogVerified = Boolean(releaseApproval.approvedRelease);
  const recommendationsEnabled = catalogVerified && !recommendationsDisabled;
  const standardRGBCaptureAvailable = environment.standardRGBCaptureAvailable ?? true;
  const screenshotRefinementDisabled = environment.screenshotRefinementDisabled === true;

  return {
    catalogAvailable: gate(catalogAvailable, catalogAvailable ? "Catalog records are loaded." : "No catalog records are loaded."),
    catalogVerified: gate(catalogVerified, catalogVerified ? "Catalog release is approved." : releaseApproval.reasons.join(" ")),
    catalogVersionSupported: gate(
      catalogVersionSupported,
      input.compatibility?.message ?? "Catalog compatibility has not been evaluated."
    ),
    recommendationsEnabled: gate(
      recommendationsEnabled,
      recommendationsEnabled
        ? "Recommendations are enabled for the approved catalog release."
        : recommendationsDisabled
          ? recommendationDisableReason
          : releaseApproval.reasons.join(" ")
    ),
    screenshotRefinementEnabled: gate(
      Boolean(environment.screenshotRefinementEnabled && recommendationsEnabled && !screenshotRefinementDisabled),
      environment.screenshotRefinementEnabled && recommendationsEnabled && !screenshotRefinementDisabled
        ? "Screenshot refinement is enabled behind the approved catalog release gate."
        : screenshotRefinementDisabled
          ? "Screenshot refinement is disabled by the deployment kill switch."
          : environment.screenshotRefinementEnabled
        ? "Screenshot refinement still requires an approved recommendation catalog."
        : "Screenshot refinement is not enabled for this MVP."
    ),
    faceCaptureEnabled: gate(
      environment.faceCaptureEnabled ?? standardRGBCaptureAvailable,
      environment.faceCaptureEnabled === false
        ? "Face capture is disabled by the current runtime gate."
        : standardRGBCaptureAvailable
          ? "RGB capture or upload fallback is available."
          : "Face capture is unavailable in this runtime."
    ),
    trueDepthAvailable: gate(Boolean(environment.trueDepthAvailable), "TrueDepth is not available to the responsive web MVP."),
    standardRGBCaptureAvailable: gate(standardRGBCaptureAvailable, "Standard RGB browser capture/upload path is available."),
    adminCatalogToolsEnabled: gate(
      Boolean(!isProductionRuntime && environment.adminCatalogToolsEnabled),
      isProductionRuntime ? "Admin catalog tools are disabled in production." : "Admin catalog tools require an explicit development flag."
    ),
    verifierToolsEnabled: gate(
      Boolean(!isProductionRuntime && environment.verifierToolsEnabled),
      isProductionRuntime ? "Verifier tools are disabled in production." : "Verifier tools require an explicit development flag."
    ),
    manualStudyEnabled: gate(
      Boolean(!isProductionRuntime && environment.manualStudyEnabled),
      isProductionRuntime ? "Manual study tools are disabled in production." : "Manual study requires an explicit development flag."
    )
  };
}

export function approveCatalogRelease(input: FeatureGateInput): CatalogReleaseApprovalResult {
  const reasons: string[] = [];
  const manifest = input.manifest;
  if (!manifest) {
    return { approvedRelease: null, reasons: ["Catalog manifest is not loaded."] };
  }

  try {
    validateProductionCatalog(manifest);
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "Catalog validation failed.");
  }

  if (!manifest.isProduction) reasons.push("Catalog manifest is not marked as production.");
  if (manifest.items.length === 0) reasons.push("Production catalog has no verified records.");
  if (manifest.items.length > 0 && manifest.releaseStatus !== "approvedRelease") {
    reasons.push("Catalog release is not marked as an approved immutable release.");
  }
  if (!manifest.catalogVersion.verifiedAt) reasons.push("Catalog version has no verification date.");
  if (!manifest.packageChecksum) reasons.push("Catalog release has no package checksum.");
  if (input.integrity?.state !== "verified" || !input.integrity.ok) {
    reasons.push(input.integrity?.message ?? "Catalog integrity has not been verified.");
  }
  if (!input.compatibility?.compatible) {
    reasons.push(input.compatibility?.message ?? "Catalog platform or game version support has not been verified.");
  }
  if (manifest.items.length > 0 && !isProductionPublishGateApproved(input.publishGate)) {
    reasons.push("Definitive production publish gate has not passed.");
  }

  const mismatchedVersion = manifest.items.find((item) => item.catalogVersion.identifier !== manifest.catalogVersion.identifier);
  if (mismatchedVersion) {
    reasons.push(`Catalog item ${mismatchedVersion.stableInternalID} does not belong to manifest version ${manifest.catalogVersion.identifier}.`);
  }

  if (reasons.length > 0) return { approvedRelease: null, reasons };

  return {
    approvedRelease: {
      approved: true,
      catalogVersionID: manifest.catalogVersion.identifier,
      packageChecksum: manifest.packageChecksum as string,
      verifiedAt: manifest.catalogVersion.verifiedAt as string,
      itemCount: manifest.items.length
    },
    reasons: ["Catalog release is approved for production recommendations."]
  };
}

function gate(enabled: boolean, reason: string): CapabilityGateState {
  return { enabled, reason };
}
