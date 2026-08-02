import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { CurrencyCode, EntitlementAccess, Price, Product, PurchaseType } from "@/types/domain";

export type OfferAvailabilityState = "availableAfterCatalogVerification" | "providerUnavailable" | "futureSuite";

export interface PricingOption {
  product: Product;
  price: Price;
  billingInterval: "none" | "year" | "future";
  recommendedForLaunch: boolean;
  checkoutEnabled: boolean;
  unavailableReason: string;
  offerState: OfferAvailabilityState;
  featureList: string[];
  privacyCommitments: string[];
  supportGuidance: string;
  restoreGuidance: string;
  resultPreview: string;
}

export interface PricingValidationResult {
  valid: boolean;
  errors: string[];
}

interface PricingInput {
  id: string;
  priceID?: string;
  name: string;
  description: string;
  purchaseType: PurchaseType;
  entitlementIDs: EntitlementAccess[];
  amountMinor: number;
  displayAmount: string;
  billingInterval?: PricingOption["billingInterval"];
  currency?: CurrencyCode;
  recommendedForLaunch?: boolean;
  productActive?: boolean;
  priceActive?: boolean;
  offerState: OfferAvailabilityState;
  featureList: string[];
  privacyCommitments?: string[];
  supportGuidance?: string;
  restoreGuidance?: string;
  resultPreview?: string;
}

const checkoutUnavailableReason = "Payment is not connected yet. No checkout session will be created.";
const selectedOfferUnavailableReason =
  "Checkout is unavailable until the owner supplies a payment provider, credentials are configured securely, and the verified catalog gate passes.";
const defaultPrivacyCommitments = [
  "Face images are not sold.",
  "Face data is not used for biometric advertising.",
  "Raw face media remains local and temporary by default.",
  "The payment provider must never receive raw face images, landmarks, or precise facial measurements."
];

export const LAUNCH_PACK_PRODUCT_ID = "launch_pack";
export const LAUNCH_PACK_PRICE_ID = "launch_pack-usd-499";
export const ALL_ACCESS_ANNUAL_PRODUCT_ID = "all_access_annual";
export const ALL_ACCESS_ANNUAL_PRICE_ID = "all_access_annual-usd-999";

const pricingInputs: PricingInput[] = [
  {
    id: LAUNCH_PACK_PRODUCT_ID,
    priceID: LAUNCH_PACK_PRICE_ID,
    name: "Launch Pack",
    description: "One-time access to the five original launch games after each game has verified production support.",
    purchaseType: "oneTime",
    entitlementIDs: ["topThreeResults", "detailedBuildGuide", "screenshotRefinement", "multiGameAccess"],
    amountMinor: 499,
    displayAmount: "$4.99",
    billingInterval: "none",
    recommendedForLaunch: true,
    productActive: true,
    priceActive: true,
    offerState: "availableAfterCatalogVerification",
    featureList: [
      "Intended for the five original launch games once each game has verified production catalog records.",
      "Game-specific top-three appearance matches from verified catalog records only.",
      "Detailed manual build guides using verified menu paths.",
      "Unsupported or empty-catalog games remain unavailable even after purchase.",
      "Catalog version, platform, mode, and creation-path traceability."
    ],
    supportGuidance: "Refund and support requests must use the owner-approved support path before checkout is enabled.",
    restoreGuidance: "Purchase restoration will be available only through the selected payment provider after receipt handling is implemented.",
    resultPreview:
      "Before purchase, the app may preview capture quality, catalog availability, and what the Launch Pack unlocks. It must not show fake head, hair, facial-hair, or menu values."
  },
  {
    id: ALL_ACCESS_ANNUAL_PRODUCT_ID,
    priceID: ALL_ACCESS_ANNUAL_PRICE_ID,
    name: "All Access",
    description: "Annual access to all currently supported games and future supported games while the subscription is active.",
    purchaseType: "subscription",
    entitlementIDs: ["topThreeResults", "detailedBuildGuide", "screenshotRefinement", "savedProfiles", "multiGameAccess"],
    amountMinor: 999,
    displayAmount: "$9.99/year",
    billingInterval: "year",
    productActive: true,
    priceActive: true,
    offerState: "availableAfterCatalogVerification",
    featureList: [
      "Repeat scans for supported games while the subscription is active.",
      "Screenshot refinements when verified refinement logic and catalog data are available.",
      "Manual build guides from verified menu paths.",
      "Future supported games are eligible only after their production catalogs pass release gates."
    ],
    supportGuidance: "Subscription support, cancellation, refund, tax, and provider receipt handling must be finalized before checkout is enabled.",
    restoreGuidance: "Subscription restoration will be available only through the selected payment provider after receipt handling is implemented.",
    resultPreview:
      "Before purchase, the app may preview capture quality, catalog availability, and what All Access unlocks. It must not show fake head, hair, facial-hair, or menu values."
  },
  {
    id: "screenshot-refinement",
    name: "Screenshot refinement",
    description: "Potential paid refinement after real screenshot comparison logic exists.",
    purchaseType: "oneTime",
    entitlementIDs: ["screenshotRefinement"],
    amountMinor: 0,
    displayAmount: "Not priced",
    offerState: "futureSuite",
    featureList: ["Future add-on only after screenshot comparison is proven."],
    resultPreview: "Unavailable until real comparison logic and verified catalog data exist."
  },
  {
    id: "multi-game-sports-pass",
    name: "Multi-game sports pass",
    description: "Potential pass after multiple verified game adapters exist.",
    purchaseType: "subscription",
    entitlementIDs: ["multiGameAccess", "savedProfiles"],
    amountMinor: 0,
    displayAmount: "Not priced",
    offerState: "futureSuite",
    featureList: ["Future suite for multiple verified sports-game catalogs."],
    resultPreview: "Not part of the College Football 27 one-game purchase."
  },
  {
    id: "creator-package",
    name: "Creator package",
    description: "Potential creator tools after share templates and consent flows are proven.",
    purchaseType: "creatorPackage",
    entitlementIDs: ["savedProfiles", "multiGameAccess"],
    amountMinor: 0,
    displayAmount: "Not priced",
    offerState: "futureSuite",
    featureList: ["Future creator workflow after sharing, consent, and support policies are proven."],
    resultPreview: "Not part of the College Football 27 one-game purchase."
  }
];

export const PRICING_OPTIONS: PricingOption[] = pricingInputs.map((input) => ({
  product: {
    id: input.id,
    name: input.name,
    description: input.description,
    purchaseType: input.purchaseType,
    entitlementIDs: input.entitlementIDs,
    active: input.productActive ?? input.purchaseType === "free"
  },
  price: {
    id: input.priceID ?? `${input.id}-price`,
    productID: input.id,
    currency: input.currency ?? "USD",
    amountMinor: input.amountMinor,
    displayAmount: input.displayAmount,
    purchaseType: input.purchaseType,
    active: input.priceActive ?? input.purchaseType === "free"
  },
  billingInterval: input.billingInterval ?? (input.offerState === "futureSuite" ? "future" : "none"),
  recommendedForLaunch: input.recommendedForLaunch ?? false,
  checkoutEnabled: false,
  unavailableReason: input.id === LAUNCH_PACK_PRODUCT_ID ? selectedOfferUnavailableReason : checkoutUnavailableReason,
  offerState: input.offerState,
  featureList: input.featureList,
  privacyCommitments: input.privacyCommitments ?? defaultPrivacyCommitments,
  supportGuidance: input.supportGuidance ?? "Support terms must be finalized before paid launch.",
  restoreGuidance: input.restoreGuidance ?? "Purchase restoration is unavailable until a payment provider is selected.",
  resultPreview: input.resultPreview ?? "No paid result preview is available for this future offer."
}));

export function validatePricingConfiguration(options: PricingOption[] = PRICING_OPTIONS): PricingValidationResult {
  const errors: string[] = [];
  const productIDs = new Set<string>();
  const priceIDs = new Set<string>();
  for (const option of options) {
    if (!option.product.id.trim()) errors.push("Product is missing an ID.");
    if (!option.price.id.trim()) errors.push(`Price is missing an ID for product ${option.product.id || "unknown"}.`);
    if (productIDs.has(option.product.id)) errors.push(`Duplicate product ID: ${option.product.id}.`);
    if (priceIDs.has(option.price.id)) errors.push(`Duplicate price ID: ${option.price.id}.`);
    productIDs.add(option.product.id);
    priceIDs.add(option.price.id);
    if (option.price.productID !== option.product.id) errors.push(`Price ${option.price.id} points at the wrong product.`);
    if (option.price.amountMinor < 0) errors.push(`Price ${option.price.id} cannot be negative.`);
    if (option.checkoutEnabled) errors.push(`Checkout must remain disabled before a payment provider is selected: ${option.product.id}.`);
    if (option.product.providerProductID || option.price.providerPriceID) errors.push(`Provider IDs must not be configured yet: ${option.product.id}.`);
    if (option.product.purchaseType !== "free" && option.offerState !== "futureSuite" && option.price.amountMinor <= 0) {
      errors.push(`Paid offer ${option.product.id} must show a transparent positive price.`);
    }
    if (option.product.id === LAUNCH_PACK_PRODUCT_ID) {
      if (option.product.purchaseType !== "oneTime") errors.push("Launch Pack must be configured as a one-time purchase.");
      if (option.price.amountMinor !== 499 || option.price.displayAmount !== "$4.99") errors.push("Launch Pack must be priced at $4.99 USD.");
      if (option.billingInterval !== "none") errors.push("Launch Pack must not have a billing interval.");
      if (!option.product.entitlementIDs.includes("topThreeResults")) errors.push("Launch Pack must include top-three results.");
      if (!option.product.entitlementIDs.includes("detailedBuildGuide")) errors.push("Launch Pack must include detailed build guide.");
      if (!option.product.entitlementIDs.includes("multiGameAccess")) errors.push("Launch Pack must include launch-game entitlement scope.");
      if (!option.resultPreview.toLowerCase().includes("must not show fake")) errors.push("Launch Pack must prohibit fake result previews.");
      if (!option.featureList.some((feature) => feature.toLowerCase().includes("five original launch games"))) {
        errors.push("Launch Pack must describe the five original launch-game scope.");
      }
      if (!option.featureList.some((feature) => feature.toLowerCase().includes("unsupported or empty-catalog games remain unavailable"))) {
        errors.push("Launch Pack must preserve empty-catalog fail-closed behavior.");
      }
      if (!option.privacyCommitments.some((commitment) => commitment.toLowerCase().includes("not sold"))) errors.push("Launch Pack must state face data is not sold.");
      if (!option.privacyCommitments.some((commitment) => commitment.toLowerCase().includes("biometric advertising"))) {
        errors.push("Launch Pack must prohibit biometric advertising.");
      }
    }
    if (option.product.id === ALL_ACCESS_ANNUAL_PRODUCT_ID) {
      if (option.product.purchaseType !== "subscription") errors.push("All Access must be configured as a subscription plan.");
      if (option.price.amountMinor !== 999 || option.price.displayAmount !== "$9.99/year") errors.push("All Access must be priced at $9.99/year USD.");
      if (option.billingInterval !== "year") errors.push("All Access must use an annual billing interval.");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function canMakePaidRecommendationClaims(catalogIsEmpty: boolean) {
  return {
    allowed: !catalogIsEmpty,
    reason: catalogIsEmpty ? CATALOG_UNAVAILABLE_MESSAGE : "Verified catalog records are available."
  };
}

export function getLaunchPackOffer(options: PricingOption[] = PRICING_OPTIONS) {
  return options.find((option) => option.product.id === LAUNCH_PACK_PRODUCT_ID);
}

export function getScanEntryPricingOptions(options: PricingOption[] = PRICING_OPTIONS) {
  return options.filter((option) => option.product.id === LAUNCH_PACK_PRODUCT_ID || option.product.id === ALL_ACCESS_ANNUAL_PRODUCT_ID);
}

export function createCheckoutUnavailableCopy(option: PricingOption, catalogIsEmpty: boolean) {
  const paidClaims = canMakePaidRecommendationClaims(catalogIsEmpty);
  if (!paidClaims.allowed) {
    return `${paidClaims.reason} The purchase button remains disabled because verified recommendations cannot be delivered yet.`;
  }
  return option.unavailableReason;
}
