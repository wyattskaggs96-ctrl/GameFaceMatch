import { getScanEntryPricingOptions, LAUNCH_PACK_PRODUCT_ID, type PricingOption } from "@/lib/payments/pricing";
import { hasRequiredCaptureConsent, type ConsentState } from "@/lib/privacy/consent";

export const SCAN_ENTRY_CONSENT_VERSION = "scan-entry-consent-v1";

export type ScanEntryPlanID = "launch_pack" | "all_access_annual";
export type BillingEligibilityState = "notConfigured" | "verifiedEntitlement" | "cancelled" | "failed" | "previewOnly";
export type ScanEntryEnvironment = "development" | "test" | "production";
export type ScanEntryStartDecisionReason =
  | "ready"
  | "missingPlan"
  | "missingConsent"
  | "billingNotConfigured"
  | "catalogUnavailable"
  | "previewNotAllowedInProduction"
  | "purchaseCancelled"
  | "purchaseFailed";

export interface ScanEntryPlan {
  id: ScanEntryPlanID;
  title: string;
  price: string;
  description: string;
  entitlementRule: string;
  billingProductID: string;
  billingPriceID: string;
}

export interface ScanEntryGateInput {
  selectedPlanID: ScanEntryPlanID | null;
  consentState: ConsentState;
  billingState: BillingEligibilityState;
  catalogAvailable: boolean;
  environment: ScanEntryEnvironment;
  previewModeEnabled: boolean;
}

export interface ScanEntryGateDecision {
  allowed: boolean;
  reason: ScanEntryStartDecisionReason;
  message: string;
}

export const SCAN_ENTRY_PLANS: ScanEntryPlan[] = getScanEntryPricingOptions().map((option) => toScanEntryPlan(option));

export const DEFAULT_SCAN_ENTRY_PLAN_ID: ScanEntryPlanID = LAUNCH_PACK_PRODUCT_ID;

export function getDefaultScanEntryPlan() {
  return getScanEntryPlan(DEFAULT_SCAN_ENTRY_PLAN_ID);
}

export function getScanEntryPlan(id: ScanEntryPlanID | null, plans: ScanEntryPlan[] = SCAN_ENTRY_PLANS) {
  return plans.find((plan) => plan.id === id) ?? null;
}

export function isValidScanEntryPlanID(value: string): value is ScanEntryPlanID {
  return value === "launch_pack" || value === "all_access_annual";
}

export function isScanEntryPreviewModeAllowed(environment: ScanEntryEnvironment, previewModeEnabled: boolean) {
  return environment !== "production" && previewModeEnabled;
}

export function evaluateScanEntryStartGate(input: ScanEntryGateInput): ScanEntryGateDecision {
  if (!input.selectedPlanID) {
    return { allowed: false, reason: "missingPlan", message: "Choose a scan plan before starting." };
  }
  if (!hasRequiredCaptureConsent(input.consentState)) {
    return { allowed: false, reason: "missingConsent", message: "Complete each required consent acknowledgment before starting." };
  }
  if (input.billingState === "cancelled") {
    return { allowed: false, reason: "purchaseCancelled", message: "Purchase was canceled. No scan was consumed." };
  }
  if (input.billingState === "failed") {
    return { allowed: false, reason: "purchaseFailed", message: "Purchase verification failed. Try again when checkout is available." };
  }
  if (input.billingState === "previewOnly" && !isScanEntryPreviewModeAllowed(input.environment, input.previewModeEnabled)) {
    return { allowed: false, reason: "previewNotAllowedInProduction", message: "Preview mode cannot unlock a production scan." };
  }
  if (input.billingState === "notConfigured") {
    return {
      allowed: false,
      reason: "billingNotConfigured",
      message: "Purchase verification is not connected yet, so production scans stay blocked."
    };
  }
  if (!input.catalogAvailable) {
    return {
      allowed: false,
      reason: "catalogUnavailable",
      message: "Verified catalog data is not loaded, so recommendations remain unavailable."
    };
  }
  return { allowed: true, reason: "ready", message: "Plan, consent, billing, and catalog gates are satisfied." };
}

export function getScanEntryEnvironment(nodeEnv: string | undefined): ScanEntryEnvironment {
  if (nodeEnv === "production") return "production";
  if (nodeEnv === "test") return "test";
  return "development";
}

function toScanEntryPlan(option: PricingOption): ScanEntryPlan {
  const id = option.product.id;
  if (!isValidScanEntryPlanID(id)) {
    throw new Error(`Unsupported scan entry plan: ${id}`);
  }
  return {
    id,
    title: option.product.name,
    price: option.price.displayAmount,
    description: option.product.description,
    entitlementRule:
      id === "launch_pack"
        ? "Covers the five original launch games only after each game has verified production support."
        : "Covers supported and future supported games only while the annual subscription is active.",
    billingProductID: option.product.id,
    billingPriceID: option.price.id
  };
}
