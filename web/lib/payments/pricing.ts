import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { CurrencyCode, EntitlementAccess, Price, Product, PurchaseType } from "@/types/domain";

export type OfferAvailabilityState = "availableAfterCatalogVerification" | "providerUnavailable" | "futureSuite";

export interface PricingOption {
  product: Product;
  price: Price;
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

export const SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID = "single_scan";
export const SELECTED_COLLEGE_FOOTBALL_27_PRICE_ID = "single_scan-usd-099";
export const MONTHLY_SCAN_OFFER_ID = "monthly";
export const MONTHLY_SCAN_PRICE_ID = "monthly-usd-199";

const pricingInputs: PricingInput[] = [
  {
    id: SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID,
    priceID: SELECTED_COLLEGE_FOOTBALL_27_PRICE_ID,
    name: "One Scan",
    description: "One completed game-specific appearance match and build guide.",
    purchaseType: "consumable",
    entitlementIDs: ["topThreeResults", "detailedBuildGuide", "screenshotRefinement"],
    amountMinor: 99,
    displayAmount: "$0.99",
    recommendedForLaunch: true,
    productActive: true,
    priceActive: true,
    offerState: "availableAfterCatalogVerification",
    featureList: [
      "One completed game-specific appearance match from verified catalog records.",
      "Detailed manual build guide using verified menu paths.",
      "Retakes required to successfully complete the same purchased scan do not consume an additional purchase.",
      "Catalog version, platform, mode, and creation-path traceability."
    ],
    supportGuidance: "Refund and support requests must use the owner-approved support path before checkout is enabled.",
    restoreGuidance: "Purchase restoration will be available only through the selected payment provider after receipt handling is implemented.",
    resultPreview:
      "Before purchase, the app may preview capture quality, catalog availability, and what the pack unlocks. It must not show fake head, hair, facial-hair, or menu values."
  },
  {
    id: MONTHLY_SCAN_OFFER_ID,
    priceID: MONTHLY_SCAN_PRICE_ID,
    name: "Monthly",
    description: "Repeat scans and screenshot refinements while your subscription is active.",
    purchaseType: "subscription",
    entitlementIDs: ["topThreeResults", "detailedBuildGuide", "screenshotRefinement", "savedProfiles"],
    amountMinor: 199,
    displayAmount: "$1.99/month",
    productActive: true,
    priceActive: true,
    offerState: "availableAfterCatalogVerification",
    featureList: [
      "Repeat scans while the subscription is active.",
      "Screenshot refinements when verified refinement logic and catalog data are available.",
      "Manual build guides from verified menu paths."
    ],
    supportGuidance: "Subscription support, cancellation, refund, tax, and provider receipt handling must be finalized before checkout is enabled.",
    restoreGuidance: "Subscription restoration will be available only through the selected payment provider after receipt handling is implemented.",
    resultPreview:
      "Before purchase, the app may preview capture quality, catalog availability, and what monthly access unlocks. It must not show fake head, hair, facial-hair, or menu values."
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
  recommendedForLaunch: input.recommendedForLaunch ?? false,
  checkoutEnabled: false,
  unavailableReason: input.id === SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID ? selectedOfferUnavailableReason : checkoutUnavailableReason,
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
    if (option.product.id === SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID) {
      if (option.product.purchaseType !== "consumable") errors.push("One Scan must be configured as the one-completed-scan consumable plan.");
      if (!option.product.entitlementIDs.includes("topThreeResults")) errors.push("One Scan must include top-three results.");
      if (!option.product.entitlementIDs.includes("detailedBuildGuide")) errors.push("One Scan must include detailed build guide.");
      if (!option.resultPreview.toLowerCase().includes("must not show fake")) errors.push("One Scan must prohibit fake result previews.");
      if (!option.featureList.some((feature) => feature.toLowerCase().includes("retakes"))) errors.push("One Scan must preserve same-purchase completion retakes.");
      if (!option.privacyCommitments.some((commitment) => commitment.toLowerCase().includes("not sold"))) errors.push("One Scan must state face data is not sold.");
      if (!option.privacyCommitments.some((commitment) => commitment.toLowerCase().includes("biometric advertising"))) {
        errors.push("One Scan must prohibit biometric advertising.");
      }
    }
    if (option.product.id === MONTHLY_SCAN_OFFER_ID && option.product.purchaseType !== "subscription") {
      errors.push("Monthly must be configured as a subscription plan.");
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

export function getSelectedCollegeFootball27Offer(options: PricingOption[] = PRICING_OPTIONS) {
  return options.find((option) => option.product.id === SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID);
}

export function getScanEntryPricingOptions(options: PricingOption[] = PRICING_OPTIONS) {
  return options.filter((option) => option.product.id === SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID || option.product.id === MONTHLY_SCAN_OFFER_ID);
}

export function createCheckoutUnavailableCopy(option: PricingOption, catalogIsEmpty: boolean) {
  const paidClaims = canMakePaidRecommendationClaims(catalogIsEmpty);
  if (!paidClaims.allowed) {
    return `${paidClaims.reason} The purchase button remains disabled because verified recommendations cannot be delivered yet.`;
  }
  return option.unavailableReason;
}
