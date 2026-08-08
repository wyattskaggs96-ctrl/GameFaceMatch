import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { getDeploymentRuntimeConfig } from "@/lib/config/deployment";
import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import {
  createOwnerReviewDemoAnalyticsPayload,
  createOwnerReviewDemoBeforeAfterResult,
  createOwnerReviewDemoBuildMatchReview,
  createOwnerReviewDemoLearningRecord,
  createOwnerReviewDemoRecommendationResult,
  evaluateProductionRefinementAvailability,
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
      "Skin details",
      "Hair",
      "Hair color",
      "Facial hair",
      "Facial-hair color",
      "Nose bridge",
      "Jaw width",
      "Chin depth"
    ]);
    expect(result.buildInstructions.length).toBeGreaterThan(0);
    expect(result.buildGuideSteps).toHaveLength(11);
    expect(result.buildGuideSteps.map((step) => step.title)).toEqual([
      "Open Road to Glory",
      "Open Appearance",
      "Head / face preset",
      "Skin",
      "Skin details",
      "Hair",
      "Hair color",
      "Facial hair",
      "Facial-hair color",
      "Nose",
      "Jaw and chin"
    ]);
    expect(result.buildGuideSteps.flatMap((step) => step.controls).some((control) => control.controlKind === "slider")).toBe(true);
    expect(result.refinementPlan).toMatchObject({
      initialBuildScore: 82,
      refinedBuildScore: 92,
      passingThreshold: 90,
      rawMediaRetained: false
    });
    expect(result.refinementPlan.buildReview).toMatchObject({
      status: "changes_recommended",
      buildMatchScore: 82,
      scoreLanguage: expect.stringMatching(/not identity probability/i),
      strengths: ["Eye spacing", "Overall face width", "Hair"],
      weaknesses: ["Jaw appears too wide", "Nose appears too short", "Chin projection is too strong"],
      productionEligible: false,
      rawMediaRetained: false
    });
    expect(result.refinementPlan.recommendedChanges.map((change) => `${change.label}:${change.currentValue}->${change.recommendedValue}`)).toEqual([
      "Jaw Width:67->61",
      "Nose Height:46->51",
      "Chin Projection:58->52"
    ]);
    expect(result.refinementPlan.refinementBuildGuideSteps.map((step) => step.title)).toEqual(["Jaw Width", "Nose Height", "Chin Projection"]);
    expect(result.refinementPlan.recommendedChanges.every((change) => change.availableInActiveCatalogAdapter && change.requiresVerifiedCalibration)).toBe(true);
  });

  it("supports no-change, uncertain, and alternate-head demo refinement outcomes without making identity claims", () => {
    const item = createOwnerReviewDemoRecommendationResult().matches[0].catalogItem;
    const noChange = createOwnerReviewDemoBuildMatchReview(item, "no_change");
    const uncertain = createOwnerReviewDemoBuildMatchReview(item, "uncertain");
    const alternative = createOwnerReviewDemoBuildMatchReview(item, "alternative_head");

    expect(noChange).toMatchObject({
      status: "no_changes",
      buildMatchScore: 93,
      adjustments: [],
      noChangeReason: expect.stringMatching(/above the configured 90\/100/i)
    });
    expect(uncertain).toMatchObject({
      status: "uncertain",
      adjustments: [],
      uncertaintyReasons: expect.arrayContaining([expect.stringMatching(/not strong enough/i)])
    });
    expect(alternative.alternativeHeadRecommendation).toMatchObject({
      label: "Review Demo Face Gamma",
      provenance: "OWNER_REVIEW_DEMO"
    });
    expect([noChange, uncertain, alternative].every((review) => review.scoreLanguage.includes("not identity probability"))).toBe(true);
  });

  it("calculates before-after demo outcomes without forcing improvement", () => {
    const item = createOwnerReviewDemoRecommendationResult().matches[0].catalogItem;
    const improvement = createOwnerReviewDemoBeforeAfterResult(item, "improvement");
    const noChange = createOwnerReviewDemoBeforeAfterResult(item, "no_change");
    const regression = createOwnerReviewDemoBeforeAfterResult(item, "regression");

    expect(improvement).toMatchObject({
      initialBuildScore: 82,
      refinedBuildScore: 91,
      scoreDelta: 9,
      trend: "improvement",
      improved: ["Jaw proportion", "Nose length", "Chin projection"],
      stillDifferent: ["Brow height"],
      productionEligible: false,
      rawMediaRetained: false
    });
    expect(noChange).toMatchObject({
      initialBuildScore: 82,
      refinedBuildScore: 82,
      scoreDelta: 0,
      trend: "no_change"
    });
    expect(regression).toMatchObject({
      initialBuildScore: 82,
      refinedBuildScore: 77,
      scoreDelta: -5,
      trend: "regression"
    });
    expect([improvement, noChange, regression].every((result) => result.scoreLanguage.includes("not identity probability"))).toBe(true);
    expect(improvement.finalSettings.some((setting) => setting.label === "Jaw Width" && setting.value === "61")).toBe(true);
  });

  it("suppresses unsupported demo sliders and keeps production refinement unavailable without verified calibration", () => {
    const result = createOwnerReviewDemoRecommendationResult();
    expect(JSON.stringify(result.refinementPlan)).not.toMatch(/Mouth Width|demo-mouth-width-slider/);

    const productionAvailability = evaluateProductionRefinementAvailability({
      catalog: productionCatalogManifest,
      verifiedCalibrationControlIDs: []
    });
    expect(productionAvailability).toEqual({
      available: false,
      reasons: [
        "Production refinement requires a nonempty verified production catalog.",
        "Production refinement requires verified control-effect calibration before any slider adjustment can be shown."
      ],
      allowedControlIDs: [],
      adjustments: []
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
