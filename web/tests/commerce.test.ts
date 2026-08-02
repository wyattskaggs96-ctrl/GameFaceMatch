import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalEntitlementService } from "@/lib/payments/entitlements";
import {
  PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE,
  PURCHASE_RESTORATION_UNAVAILABLE_MESSAGE,
  createSafePaymentAdapter,
  createUnavailablePaymentProvider
} from "@/lib/payments/payment-provider";
import {
  MONTHLY_SCAN_OFFER_ID,
  MONTHLY_SCAN_PRICE_ID,
  PRICING_OPTIONS,
  SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID,
  SELECTED_COLLEGE_FOOTBALL_27_PRICE_ID,
  canMakePaidRecommendationClaims,
  createCheckoutUnavailableCopy,
  getScanEntryPricingOptions,
  getSelectedCollegeFootball27Offer,
  validatePricingConfiguration
} from "@/lib/payments/pricing";

describe("payment provider scaffold", () => {
  it("fails closed when no provider is selected", async () => {
    const provider = createUnavailablePaymentProvider();
    const result = await provider.createCheckoutSession({
      productID: "cfb27-game-pack",
      priceID: "cfb27-game-pack-price",
      successUrl: "https://example.invalid/success",
      cancelUrl: "https://example.invalid/cancel"
    });

    expect(provider.isLiveConfigured).toBe(false);
    expect(result.status).toBe("providerUnavailable");
    expect(result.checkoutUrl).toBeUndefined();
    expect(result.message).toBe(PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE);
  });

  it("keeps checkout and purchase restoration behind the safe adapter", async () => {
    const offer = getSelectedCollegeFootball27Offer();
    expect(offer).toBeDefined();
    const adapter = createSafePaymentAdapter(createUnavailablePaymentProvider());

    const checkout = await adapter.startCheckout(offer!, {
      productID: SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID,
      priceID: SELECTED_COLLEGE_FOOTBALL_27_PRICE_ID,
      successUrl: "https://example.invalid/success",
      cancelUrl: "https://example.invalid/cancel"
    });
    const restoration = await adapter.restorePurchase({
      id: "receipt-reference-test-only",
      provider: "provider-unselected",
      productID: SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID,
      priceID: SELECTED_COLLEGE_FOOTBALL_27_PRICE_ID,
      paymentStatus: "paid",
      refundStatus: "notRequested"
    });

    expect(checkout.status).toBe("providerUnavailable");
    expect(checkout.checkoutUrl).toBeUndefined();
    expect(checkout.message).toContain(PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE);
    expect(restoration).toEqual({
      status: "providerUnavailable",
      message: PURCHASE_RESTORATION_UNAVAILABLE_MESSAGE
    });
  });

  it("does not expose live payment dependencies or credential-shaped keys in client source", () => {
    const packageJSON = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = { ...packageJSON.dependencies, ...packageJSON.devDependencies };
    expect(Object.keys(dependencies)).not.toEqual(expect.arrayContaining(["stripe", "@stripe/stripe-js", "@paypal/react-paypal-js", "square"]));

    const sourceText = ["app", "components", "features", "lib", "services", "storage", "game-adapters", "catalog"]
      .map((root) => path.join(process.cwd(), root))
      .filter((root) => fs.existsSync(root))
      .flatMap(listFiles)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");

    const credentialPatterns = [
      new RegExp("STRIPE_" + "SECRET_KEY"),
      new RegExp("STRIPE_" + "WEBHOOK_SECRET"),
      new RegExp("PAYPAL_" + "CLIENT_SECRET"),
      new RegExp("SQUARE_" + "ACCESS_TOKEN"),
      new RegExp("sk_" + "live_"),
      new RegExp("rk_" + "live_")
    ];
    for (const pattern of credentialPatterns) {
      expect(sourceText).not.toMatch(pattern);
    }
  });
});

describe("entitlement defaults", () => {
  it("grants only basic free match access by default", () => {
    const service = createLocalEntitlementService();
    const access = service.getDefaultAccess();

    expect(access.status).toBe("freeAccess");
    expect(access.entitlementIDs).toEqual(["basicFreeMatch"]);
    expect(service.hasAccess(access, "basicFreeMatch")).toBe(true);
    expect(service.hasAccess(access, "topThreeResults")).toBe(false);
    expect(service.hasAccess(access, "screenshotRefinement")).toBe(false);
  });

  it("can grant and revoke future entitlements without payment-provider coupling", () => {
    const service = createLocalEntitlementService();
    const granted = service.grantEntitlement(service.getDefaultAccess(), "detailedBuildGuide");
    expect(granted.entitlementIDs).toContain("detailedBuildGuide");
    expect(service.revokeEntitlement(granted, "detailedBuildGuide").entitlementIDs).not.toContain("detailedBuildGuide");
  });
});

describe("pricing configuration", () => {
  it("validates disabled pricing configuration", () => {
    expect(validatePricingConfiguration(PRICING_OPTIONS)).toEqual({ valid: true, errors: [] });
    expect(PRICING_OPTIONS.every((option) => option.checkoutEnabled === false)).toBe(true);
    expect(PRICING_OPTIONS.every((option) => !option.product.providerProductID && !option.price.providerPriceID)).toBe(true);
  });

  it("configures the approved One Scan offer transparently", () => {
    const offer = getSelectedCollegeFootball27Offer();
    expect(offer).toBeDefined();
    expect(offer?.product).toMatchObject({
      id: SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID,
      name: "One Scan",
      purchaseType: "consumable",
      active: true
    });
    expect(offer?.price).toMatchObject({
      id: SELECTED_COLLEGE_FOOTBALL_27_PRICE_ID,
      amountMinor: 99,
      displayAmount: "$0.99",
      currency: "USD",
      active: true
    });
    expect(offer?.recommendedForLaunch).toBe(true);
    expect(offer?.checkoutEnabled).toBe(false);
    expect(offer?.product.entitlementIDs).toEqual(expect.arrayContaining(["topThreeResults", "detailedBuildGuide"]));
    expect(offer?.featureList.join(" ")).toContain("Retakes");
  });

  it("exposes exactly the two scan-entry purchase plans", () => {
    const recommended = PRICING_OPTIONS.filter((option) => option.recommendedForLaunch);
    expect(recommended.map((option) => option.product.id)).toContain(SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID);
    expect(getScanEntryPricingOptions().map((option) => option.product.id)).toEqual([SELECTED_COLLEGE_FOOTBALL_27_OFFER_ID, MONTHLY_SCAN_OFFER_ID]);
    const monthly = PRICING_OPTIONS.find((option) => option.product.id === MONTHLY_SCAN_OFFER_ID);
    expect(monthly?.price.id).toBe(MONTHLY_SCAN_PRICE_ID);
    expect(monthly?.price.displayAmount).toBe("$1.99/month");
    expect(monthly?.product.purchaseType).toBe("subscription");
    expect(monthly?.checkoutEnabled).toBe(false);
  });

  it("does not create fake purchase state", () => {
    const commerceSource = fs.readFileSync(path.join(process.cwd(), "features/commerce/PricingScaffold.tsx"), "utf8");
    const pricingSource = fs.readFileSync(path.join(process.cwd(), "lib/payments/pricing.ts"), "utf8");
    expect(`${commerceSource}\n${pricingSource}`).not.toMatch(/limited time|sale ends|testimonial|purchased by|revenue|discount|free trial/i);
  });

  it("blocks paid recommendation claims while the production catalog is empty", () => {
    expect(canMakePaidRecommendationClaims(true)).toEqual({
      allowed: false,
      reason: "Verified College Football 27 catalog not loaded."
    });
    expect(canMakePaidRecommendationClaims(false).allowed).toBe(true);
  });

  it("requires privacy-safe offer claims and distinguishes the future multi-game suite", () => {
    const offer = getSelectedCollegeFootball27Offer();
    const multiGame = PRICING_OPTIONS.find((option) => option.product.id === "multi-game-sports-pass");

    expect(offer?.privacyCommitments.join(" ")).toContain("not sold");
    expect(offer?.privacyCommitments.join(" ")).toContain("biometric advertising");
    expect(offer?.resultPreview).toContain("must not show fake");
    expect(createCheckoutUnavailableCopy(offer!, true)).toContain("Verified College Football 27 catalog not loaded.");
    expect(multiGame?.offerState).toBe("futureSuite");
    expect(multiGame?.resultPreview.toLowerCase()).toContain("not part of the college football 27 one-game purchase");
  });
});

function listFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
