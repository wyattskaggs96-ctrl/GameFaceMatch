import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { CurrencyCode, EntitlementAccess, Price, Product, PurchaseType } from "@/types/domain";

export interface PricingOption {
  product: Product;
  price: Price;
  recommendedForLaunch: boolean;
  checkoutEnabled: boolean;
  unavailableReason: string;
}

export interface PricingValidationResult {
  valid: boolean;
  errors: string[];
}

interface PricingInput {
  id: string;
  name: string;
  description: string;
  purchaseType: PurchaseType;
  entitlementIDs: EntitlementAccess[];
  amountMinor: number;
  displayAmount: string;
  currency?: CurrencyCode;
  recommendedForLaunch?: boolean;
}

const checkoutUnavailableReason = "Payment is not connected yet. No checkout session will be created.";

const pricingInputs: PricingInput[] = [
  {
    id: "free-beta",
    name: "Free beta",
    description: "Validate capture, privacy, and catalog-unavailable flow before charging.",
    purchaseType: "free",
    entitlementIDs: ["basicFreeMatch"],
    amountMinor: 0,
    displayAmount: "$0",
    recommendedForLaunch: true
  },
  {
    id: "cfb27-game-pack",
    name: "College Football 27 game pack",
    description: "Potential one-time purchase after verified catalog records and build guides exist.",
    purchaseType: "oneTime",
    entitlementIDs: ["topThreeResults", "detailedBuildGuide"],
    amountMinor: 0,
    displayAmount: "Not priced"
  },
  {
    id: "screenshot-refinement",
    name: "Screenshot refinement",
    description: "Potential paid refinement after real screenshot comparison logic exists.",
    purchaseType: "oneTime",
    entitlementIDs: ["screenshotRefinement"],
    amountMinor: 0,
    displayAmount: "Not priced"
  },
  {
    id: "multi-game-sports-pass",
    name: "Multi-game sports pass",
    description: "Potential pass after multiple verified game adapters exist.",
    purchaseType: "subscription",
    entitlementIDs: ["multiGameAccess", "savedProfiles"],
    amountMinor: 0,
    displayAmount: "Not priced"
  },
  {
    id: "creator-package",
    name: "Creator package",
    description: "Potential creator tools after share templates and consent flows are proven.",
    purchaseType: "creatorPackage",
    entitlementIDs: ["savedProfiles", "multiGameAccess"],
    amountMinor: 0,
    displayAmount: "Not priced"
  }
];

export const PRICING_OPTIONS: PricingOption[] = pricingInputs.map((input) => ({
  product: {
    id: input.id,
    name: input.name,
    description: input.description,
    purchaseType: input.purchaseType,
    entitlementIDs: input.entitlementIDs,
    active: input.purchaseType === "free"
  },
  price: {
    id: `${input.id}-price`,
    productID: input.id,
    currency: input.currency ?? "USD",
    amountMinor: input.amountMinor,
    displayAmount: input.displayAmount,
    purchaseType: input.purchaseType,
    active: input.purchaseType === "free"
  },
  recommendedForLaunch: input.recommendedForLaunch ?? false,
  checkoutEnabled: false,
  unavailableReason: checkoutUnavailableReason
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
  }
  return { valid: errors.length === 0, errors };
}

export function canMakePaidRecommendationClaims(catalogIsEmpty: boolean) {
  return {
    allowed: !catalogIsEmpty,
    reason: catalogIsEmpty ? CATALOG_UNAVAILABLE_MESSAGE : "Verified catalog records are available."
  };
}
