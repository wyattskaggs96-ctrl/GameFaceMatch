import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { getDeploymentRuntimeConfig } from "@/lib/config/deployment";
import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import {
  createOwnerReviewDemoAnalyticsPayload,
  createOwnerReviewDemoLearningRecord,
  createOwnerReviewDemoRecommendationResult,
  getOwnerReviewDemoCatalog,
  isOwnerReviewDemoEnabled,
  OWNER_REVIEW_DEMO_BANNER_COPY,
  validateOwnerReviewDemoCatalogIsolation,
  validateOwnerReviewDemoNoProductionLeakage
} from "@/lib/owner-review-demo/owner-review-demo";

describe("OWNER_REVIEW_DEMO mode", () => {
  it("requires an explicit environment flag and disables itself for production deployment", () => {
    expect(isOwnerReviewDemoEnabled({ NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: "true" })).toBe(true);
    expect(isOwnerReviewDemoEnabled({ NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: "false" })).toBe(false);
    expect(isOwnerReviewDemoEnabled({ NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: "true", NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "production" })).toBe(false);

    const config = getDeploymentRuntimeConfig({
      NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO: "true",
      NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV: "production",
      NEXT_PUBLIC_GAMEFACE_APP_BASE_URL: "https://app.example.com",
      NEXT_PUBLIC_GAMEFACE_PRIVACY_URL: "https://example.com/privacy",
      NEXT_PUBLIC_GAMEFACE_TERMS_URL: "https://example.com/terms",
      NEXT_PUBLIC_GAMEFACE_SUPPORT_URL: "https://example.com/support"
    });
    expect(config.ownerReviewDemoEnabled).toBe(false);
  });

  it("ships demo data with unmistakable non-production provenance", () => {
    const catalog = getOwnerReviewDemoCatalog();
    expect(validateOwnerReviewDemoCatalogIsolation(catalog)).toEqual({ ok: true, errors: [] });
    expect(catalog).toMatchObject({
      sourceType: "demoData",
      isProduction: false,
      declaredItemCount: 3
    });
    expect(catalog.items.every((item) => item.sourceType === "demoData")).toBe(true);
    expect(catalog.items.every((item) => item.humanAnnotations.ownerReviewDemoProvenance === "OWNER_REVIEW_DEMO_TEST_DATA")).toBe(true);
    expect(catalog.items.every((item) => item.catalogManagerDisposition === "rejected")).toBe(true);
  });

  it("keeps the generated web demo catalog in sync with shared demo data", () => {
    const sharedManifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/demo/owner-review-demo-catalog.json"), "utf8"));
    expect(getOwnerReviewDemoCatalog()).toEqual(sharedManifest);
  });

  it("generates deterministic demo recommendations and realistic build settings", () => {
    const result = createOwnerReviewDemoRecommendationResult();
    expect(result.bannerCopy).toBe(OWNER_REVIEW_DEMO_BANNER_COPY);
    expect(result.matches).toHaveLength(3);
    expect(result.matches.map((match) => match.catalogItem.sourceType)).toEqual(["demoData", "demoData", "demoData"]);
    expect(result.primarySettings.map((setting) => setting.category)).toEqual([
      "Head / face preset",
      "Skin",
      "Hair",
      "Hair color",
      "Facial hair",
      "Facial-hair color",
      "Nose bridge",
      "Jaw width",
      "Chin depth"
    ]);
    expect(result.buildInstructions.length).toBeGreaterThan(0);
    expect(result.refinementPlan).toMatchObject({
      initialBuildScore: 84,
      refinedBuildScore: 92,
      passingThreshold: 90,
      rawMediaRetained: false
    });
  });

  it("keeps production matching disabled and rejects demo records unless the demo switch is explicit", () => {
    const result = createOwnerReviewDemoRecommendationResult();
    const engine = createRuleBasedMatchingEngine();
    expect(engine.matchTopThree({ profile: result.profile, catalog: getOwnerReviewDemoCatalog() })).toEqual([]);
    expect(engine.matchTopThree({ profile: result.profile, catalog: getOwnerReviewDemoCatalog(), allowOwnerReviewDemo: true })).toHaveLength(3);
    expect(productionCatalogManifest.items).toHaveLength(0);
    expect(productionCatalogManifest.sourceType).toBe("production");
  });

  it("prevents demo analytics and learning records from contaminating real beta metrics or production weights", () => {
    const analytics = createOwnerReviewDemoAnalyticsPayload("owner_review_demo_complete");
    const learning = createOwnerReviewDemoLearningRecord("btp_owner_demo");

    expect(analytics).toMatchObject({
      excludedFromRealBetaMetrics: true,
      containsBiometricMedia: false,
      containsPreciseFacialMeasurements: false
    });
    expect(learning).toMatchObject({
      eligibleForRealBetaMetrics: false,
      eligibleForGlobalLearning: false,
      productionWeightMutationAllowed: false
    });
    expect(
      validateOwnerReviewDemoNoProductionLeakage({
        productionCatalog: productionCatalogManifest,
        demoCatalog: getOwnerReviewDemoCatalog(),
        learningRecord: learning
      })
    ).toEqual({ ok: true, errors: [] });
  });
});
