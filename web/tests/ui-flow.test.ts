import { describe, expect, it } from "vitest";
import {
  canEnterHome,
  getKeyboardNavigatedIndex,
  getNextOnboardingScreen,
  getScreenFromHash,
  getStepFlowProgress,
  HARDENED_E2E_FLOW,
  MOBILE_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
  STEP_FLOW_DETAILS,
  toScreenHash
} from "@/lib/navigation";
import { CATALOG_UNAVAILABLE_MESSAGE, INDEPENDENT_APP_DISCLAIMER, PRODUCT_EXPLANATION } from "@/lib/product-copy";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { isProductionCatalogEmpty, shouldShowDevelopmentCatalogBanner } from "@/lib/ui/catalog-status";

describe("customer-facing navigation flow", () => {
  it("progresses through product explanation, disclaimer, privacy, consent, and home", () => {
    expect(getNextOnboardingScreen("welcome", false)).toBe("product");
    expect(getNextOnboardingScreen("product", false)).toBe("disclaimer");
    expect(getNextOnboardingScreen("disclaimer", false)).toBe("privacy");
    expect(getNextOnboardingScreen("privacy", false)).toBe("consent");
    expect(getNextOnboardingScreen("privacy", true)).toBe("home");
  });

  it("requires consent before home is available", () => {
    expect(canEnterHome(false)).toBe(false);
    expect(canEnterHome(true)).toBe(true);
  });

  it("describes the reusable match step framework", () => {
    expect(STEP_FLOW_DETAILS.map((step) => step.id)).toEqual([
      "start",
      "preparation",
      "lighting",
      "capability",
      "capture",
      "attributes",
      "profile-review",
      "processing",
      "results"
    ]);
    expect(getStepFlowProgress("capture")).toEqual({
      currentIndex: 4,
      total: 9,
      isInStepFlow: true
    });
  });
});

describe("accessible navigation behavior", () => {
  it("supports keyboard movement across navigation items", () => {
    expect(getKeyboardNavigatedIndex(0, "ArrowRight", 4)).toBe(1);
    expect(getKeyboardNavigatedIndex(0, "ArrowLeft", 4)).toBe(3);
    expect(getKeyboardNavigatedIndex(2, "Home", 4)).toBe(0);
    expect(getKeyboardNavigatedIndex(2, "End", 4)).toBe(3);
    expect(getKeyboardNavigatedIndex(2, "Enter", 4)).toBe(2);
  });

  it("keeps mobile navigation focused on the core near-console actions", () => {
    expect(MOBILE_NAV_ITEMS.map((item) => item.id)).toEqual(["home", "start", "catalog", "privacy-center"]);
    expect(PRIMARY_NAV_ITEMS.length).toBeGreaterThan(MOBILE_NAV_ITEMS.length);
  });

  it("excludes development-only screens from customer navigation", () => {
    expect(PRIMARY_NAV_ITEMS.map((item) => item.id)).not.toContain("audit");
    expect(PRIMARY_NAV_ITEMS.map((item) => item.id)).not.toContain("evidence-gallery");
    expect(PRIMARY_NAV_ITEMS.map((item) => item.id)).not.toContain("video-inspector");
    expect(PRIMARY_NAV_ITEMS.map((item) => item.id)).not.toContain("phase-0");
    expect(PRIMARY_NAV_ITEMS.map((item) => item.id)).not.toContain("matching-lab");
    expect(PRIMARY_NAV_ITEMS.map((item) => item.id)).not.toContain("pricing");
    expect(MOBILE_NAV_ITEMS.map((item) => item.id)).not.toContain("audit");
    expect(MOBILE_NAV_ITEMS.map((item) => item.id)).not.toContain("evidence-gallery");
    expect(MOBILE_NAV_ITEMS.map((item) => item.id)).not.toContain("video-inspector");
    expect(MOBILE_NAV_ITEMS.map((item) => item.id)).not.toContain("phase-0");
    expect(MOBILE_NAV_ITEMS.map((item) => item.id)).not.toContain("matching-lab");
    expect(MOBILE_NAV_ITEMS.map((item) => item.id)).not.toContain("pricing");
  });

  it("supports hash-based browser back and forward state", () => {
    expect(toScreenHash("privacy-center")).toBe("#privacy-center");
    expect(getScreenFromHash("#privacy-center")).toBe("privacy-center");
    expect(getScreenFromHash("#/refinement")).toBe("refinement");
    expect(getScreenFromHash("#unknown")).toBeNull();
  });
});

describe("required product guardrails", () => {
  it("contains the required product explanation and disclaimer copy", () => {
    expect(PRODUCT_EXPLANATION).toBe("GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27.");
    expect(INDEPENDENT_APP_DISCLAIMER).toContain("independent companion application");
    expect(INDEPENDENT_APP_DISCLAIMER).toContain("not affiliated with, endorsed by, or sponsored by");
  });

  it("keeps the empty production catalog visible and development-only banner gated", () => {
    expect(isProductionCatalogEmpty(productionCatalogManifest)).toBe(true);
    expect(CATALOG_UNAVAILABLE_MESSAGE).toBe("Verified College Football 27 catalog not loaded.");
    expect(shouldShowDevelopmentCatalogBanner("development", true)).toBe(true);
    expect(shouldShowDevelopmentCatalogBanner("production", true)).toBe(false);
    expect(shouldShowDevelopmentCatalogBanner("development", false)).toBe(false);
  });

  it("tracks the hardened end-to-end mobile test inventory", () => {
    expect(HARDENED_E2E_FLOW).toEqual([
      "welcome",
      "disclaimer",
      "privacy",
      "consent",
      "preparation",
      "lighting",
      "capability",
      "capture",
      "attributes",
      "profile-review",
      "results",
      "saved",
      "privacy-center",
      "refinement"
    ]);
  });
});
