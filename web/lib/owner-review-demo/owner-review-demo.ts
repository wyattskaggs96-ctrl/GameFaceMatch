import { createRuleBasedMatchingEngine } from "@/lib/matching/matching-engine";
import { generatedOwnerReviewDemoCatalog } from "@/lib/owner-review-demo/generated-owner-review-demo-catalog";
import { createBuildInstructions } from "@/lib/results/results-experience";
import type {
  AppearanceAttribute,
  BuildInstruction,
  CapturedAngleID,
  GameAppearanceMatch,
  GameCatalogItem,
  GameCatalogManifest,
  StandardFaceProfile,
  StandardFacialMeasurementID,
  UserConfirmedAttributeCategory,
  UserConfirmedAttributeValue
} from "@/types/domain";

export const OWNER_REVIEW_DEMO_MODE = "OWNER_REVIEW_DEMO";
export const OWNER_REVIEW_DEMO_ENV_KEY = "NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO";
export const OWNER_REVIEW_DEMO_BANNER_COPY = "Owner Review Demo — appearance settings are test data.";
export const OWNER_REVIEW_DEMO_ANALYTICS_DATASET = "owner_review_demo_excluded_from_beta_metrics";
export const OWNER_REVIEW_DEMO_MATCHING_CONFIG_VERSION = "owner-review-demo-matching-v1";
const ownerReviewDemoAngles: CapturedAngleID[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];

export interface OwnerReviewDemoSetting {
  id: string;
  category: string;
  controlKind: "preset" | "color" | "facialHair" | "slider" | "menu";
  value: string;
  menuPath: string[];
  provenance: typeof OWNER_REVIEW_DEMO_MODE;
}

export interface OwnerReviewDemoBuildStep {
  id: string;
  title: string;
  category: string;
  menuPath: string[];
  controls: Array<{
    label: string;
    value: string;
    controlKind: OwnerReviewDemoSetting["controlKind"];
  }>;
  rationale: string;
  provenance: typeof OWNER_REVIEW_DEMO_MODE;
}

export interface OwnerReviewDemoRefinementPlan {
  schemaVersion: "owner-review-demo-refinement-v1";
  initialBuildScore: number;
  refinedBuildScore: number;
  passingThreshold: 90;
  buildReview: OwnerReviewDemoBuildMatchReview;
  recommendedChanges: OwnerReviewDemoRefinementAdjustment[];
  refinementBuildGuideSteps: OwnerReviewDemoBuildStep[];
  rawMediaRetained: false;
}

export interface OwnerReviewDemoRefinementAdjustment {
  id: string;
  controlID: string;
  category: string;
  label: string;
  controlKind: "slider" | "preset";
  currentValue: string;
  recommendedValue: string;
  menuPath: string[];
  reason: string;
  expectedEffect: string;
  availableInActiveCatalogAdapter: boolean;
  requiresVerifiedCalibration: true;
  provenance: typeof OWNER_REVIEW_DEMO_MODE;
}

export interface OwnerReviewDemoBuildMatchReview {
  schemaVersion: "owner-review-demo-build-match-review-v1";
  status: "changes_recommended" | "no_changes" | "uncertain";
  buildMatchScore: number;
  passingThreshold: 90;
  scoreLanguage: string;
  strengths: string[];
  weaknesses: string[];
  adjustments: OwnerReviewDemoRefinementAdjustment[];
  noChangeReason: string | null;
  uncertaintyReasons: string[];
  alternativeHeadRecommendation: {
    label: string;
    reason: string;
    provenance: typeof OWNER_REVIEW_DEMO_MODE;
  } | null;
  comparedInputs: {
    derivedFaceProfile: string;
    initialRecommendation: string;
    renderedCharacterVideo: string;
  };
  productionEligible: false;
  rawMediaRetained: false;
  provenance: typeof OWNER_REVIEW_DEMO_MODE;
}

export type OwnerReviewDemoRefinementScenario = "clear_improvement" | "no_change" | "uncertain" | "alternative_head";

export interface ProductionRefinementAvailability {
  available: boolean;
  reasons: string[];
  allowedControlIDs: string[];
  adjustments: [];
}

export interface OwnerReviewDemoLearningRecord {
  schemaVersion: "owner-review-demo-learning-record-v1";
  trialID: string;
  provenance: typeof OWNER_REVIEW_DEMO_MODE;
  analyticsDataset: typeof OWNER_REVIEW_DEMO_ANALYTICS_DATASET;
  eligibleForRealBetaMetrics: false;
  eligibleForGlobalLearning: false;
  productionWeightMutationAllowed: false;
  matchingConfigVersion: typeof OWNER_REVIEW_DEMO_MATCHING_CONFIG_VERSION;
}

export interface OwnerReviewDemoRecommendationResult {
  mode: typeof OWNER_REVIEW_DEMO_MODE;
  bannerCopy: typeof OWNER_REVIEW_DEMO_BANNER_COPY;
  catalog: GameCatalogManifest;
  profile: StandardFaceProfile;
  matches: GameAppearanceMatch[];
  primarySettings: OwnerReviewDemoSetting[];
  buildInstructions: BuildInstruction[];
  buildGuideSteps: OwnerReviewDemoBuildStep[];
  refinementPlan: OwnerReviewDemoRefinementPlan;
  analyticsPayload: ReturnType<typeof createOwnerReviewDemoAnalyticsPayload>;
}

export function isOwnerReviewDemoEnabled(env: Record<string, string | undefined> = process.env) {
  return env[OWNER_REVIEW_DEMO_ENV_KEY] === "true" && env.NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV !== "production";
}

export function getOwnerReviewDemoCatalog(): GameCatalogManifest {
  return generatedOwnerReviewDemoCatalog;
}

export function validateOwnerReviewDemoCatalogIsolation(manifest: GameCatalogManifest = getOwnerReviewDemoCatalog()) {
  const errors: string[] = [];
  if (manifest.sourceType !== "demoData") errors.push("Owner Review Demo manifest must use sourceType demoData.");
  if (manifest.isProduction) errors.push("Owner Review Demo manifest must never be marked production.");
  if (manifest.items.length < 3) errors.push("Owner Review Demo catalog must contain at least three ranked candidates.");

  for (const item of manifest.items) {
    if (item.sourceType !== "demoData") errors.push(`${item.stableInternalID} must use sourceType demoData.`);
    if (item.isTestFixture) errors.push(`${item.stableInternalID} must be demoData, not testFixture.`);
    if (item.catalogManagerDisposition !== "rejected") errors.push(`${item.stableInternalID} must not look catalog-manager approved.`);
    if (item.humanAnnotations.ownerReviewDemoProvenance !== "OWNER_REVIEW_DEMO_TEST_DATA") {
      errors.push(`${item.stableInternalID} is missing owner-review demo provenance.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function createOwnerReviewDemoRecommendationResult(): OwnerReviewDemoRecommendationResult {
  const catalog = getOwnerReviewDemoCatalog();
  const validation = validateOwnerReviewDemoCatalogIsolation(catalog);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const profile = createOwnerReviewDemoProfile();
  const matches = createRuleBasedMatchingEngine().matchTopThree({
    profile,
    catalog,
    limit: 3,
    allowOwnerReviewDemo: true
  });
  if (matches.length === 0) {
    throw new Error("Owner Review Demo did not produce deterministic recommendations.");
  }
  const bestMatch = matches[0];
  return {
    mode: OWNER_REVIEW_DEMO_MODE,
    bannerCopy: OWNER_REVIEW_DEMO_BANNER_COPY,
    catalog,
    profile,
    matches,
    primarySettings: createOwnerReviewDemoSettings(bestMatch.catalogItem),
    buildInstructions: createBuildInstructions(bestMatch),
    buildGuideSteps: createOwnerReviewDemoBuildGuideSteps(bestMatch.catalogItem),
    refinementPlan: createOwnerReviewDemoRefinementPlan(bestMatch.catalogItem),
    analyticsPayload: createOwnerReviewDemoAnalyticsPayload("owner_review_demo_recommendation_rendered")
  };
}

export function createOwnerReviewDemoAnalyticsPayload(eventName: string) {
  return {
    eventName,
    mode: OWNER_REVIEW_DEMO_MODE,
    analyticsDataset: OWNER_REVIEW_DEMO_ANALYTICS_DATASET,
    excludedFromRealBetaMetrics: true,
    containsBiometricMedia: false,
    containsPreciseFacialMeasurements: false
  } as const;
}

export function createOwnerReviewDemoLearningRecord(trialID: string): OwnerReviewDemoLearningRecord {
  return {
    schemaVersion: "owner-review-demo-learning-record-v1",
    trialID,
    provenance: OWNER_REVIEW_DEMO_MODE,
    analyticsDataset: OWNER_REVIEW_DEMO_ANALYTICS_DATASET,
    eligibleForRealBetaMetrics: false,
    eligibleForGlobalLearning: false,
    productionWeightMutationAllowed: false,
    matchingConfigVersion: OWNER_REVIEW_DEMO_MATCHING_CONFIG_VERSION
  };
}

export function validateOwnerReviewDemoNoProductionLeakage(input: {
  productionCatalog: GameCatalogManifest;
  demoCatalog?: GameCatalogManifest;
  learningRecord?: OwnerReviewDemoLearningRecord;
}) {
  const errors: string[] = [];
  if (input.productionCatalog.items.some((item) => item.sourceType === "demoData" || item.humanAnnotations.ownerReviewDemoProvenance)) {
    errors.push("Production catalog contains Owner Review Demo records.");
  }
  if (input.productionCatalog.sourceType !== "production" || !input.productionCatalog.isProduction) {
    errors.push("Production catalog must remain the production manifest.");
  }
  if (input.demoCatalog && input.demoCatalog.isProduction) {
    errors.push("Demo catalog must not be marked production.");
  }
  if (input.learningRecord?.eligibleForGlobalLearning || input.learningRecord?.productionWeightMutationAllowed || input.learningRecord?.eligibleForRealBetaMetrics) {
    errors.push("Owner Review Demo learning records must not affect real beta metrics, global learning, or production weights.");
  }
  return { ok: errors.length === 0, errors };
}

function createOwnerReviewDemoSettings(item: GameCatalogItem): OwnerReviewDemoSetting[] {
  const annotations = item.humanAnnotations;
  return [
    setting("demo-head-preset", "Head / face preset", "preset", item.visibleGameLabelOrIndex, "Road to Glory > Appearance > Head / face preset"),
    setting("demo-skin", "Skin", "color", annotations.verifiedSkinPresentationNativeValue, annotations.verifiedSkinPresentationMenuPath),
    setting("demo-skin-details", "Skin details", "preset", annotations.verifiedSkinDetailsNativeValue, annotations.verifiedSkinDetailsMenuPath),
    setting("demo-hair", "Hair", "preset", annotations.verifiedHairstyleNativeValue, annotations.verifiedHairstyleMenuPath),
    setting("demo-hair-color", "Hair color", "color", annotations.verifiedHairColorNativeValue, annotations.verifiedHairColorMenuPath),
    setting("demo-facial-hair", "Facial hair", "facialHair", annotations.verifiedFacialHairNativeValue, annotations.verifiedFacialHairMenuPath),
    setting("demo-facial-hair-color", "Facial-hair color", "color", annotations.verifiedFacialHairColorNativeValue ?? "Demo no facial-hair color", annotations.verifiedFacialHairColorMenuPath ?? "Road to Glory > Appearance > Facial Hair > Color"),
    setting("demo-nose-bridge-slider", "Nose bridge", "slider", annotations.demoNoseBridgeSlider, "Road to Glory > Appearance > Face > Nose Bridge"),
    setting("demo-jaw-width-slider", "Jaw width", "slider", annotations.demoJawWidthSlider, "Road to Glory > Appearance > Face > Jaw Width"),
    setting("demo-chin-depth-slider", "Chin depth", "slider", annotations.demoChinDepthSlider, "Road to Glory > Appearance > Face > Chin Depth")
  ].filter((item): item is OwnerReviewDemoSetting => Boolean(item.value));
}

function setting(
  id: string,
  category: string,
  controlKind: OwnerReviewDemoSetting["controlKind"],
  value: string | undefined,
  menuPath: string | undefined
): OwnerReviewDemoSetting {
  return {
    id,
    category,
    controlKind,
    value: value ?? "Demo unavailable",
    menuPath: splitMenuPath(menuPath ?? "Owner Review Demo"),
    provenance: OWNER_REVIEW_DEMO_MODE
  };
}

function createOwnerReviewDemoBuildGuideSteps(item: GameCatalogItem): OwnerReviewDemoBuildStep[] {
  const annotations = item.humanAnnotations;
  return [
    buildStep({
      id: "demo-build-open-rtg",
      title: "Open Road to Glory",
      category: "Setup",
      menuPath: "Road to Glory",
      controls: [{ label: "Mode", value: "Road to Glory", controlKind: "menu" }],
      rationale: "Start in the same demo path used by the recommendation contract."
    }),
    buildStep({
      id: "demo-build-open-appearance",
      title: "Open Appearance",
      category: "Setup",
      menuPath: "Road to Glory > Appearance",
      controls: [{ label: "Menu", value: "Appearance", controlKind: "menu" }],
      rationale: "All demo settings are grouped under the appearance editor."
    }),
    buildStep({
      id: "demo-build-head",
      title: "Head / face preset",
      category: "Head",
      menuPath: "Road to Glory > Appearance > Head / face preset",
      controls: [{ label: "Preset", value: item.visibleGameLabelOrIndex, controlKind: "preset" }],
      rationale: "This demo preset is the highest-ranked synthetic match."
    }),
    buildStep({
      id: "demo-build-skin",
      title: "Skin",
      category: "Skin",
      menuPath: annotations.verifiedSkinPresentationMenuPath,
      controls: [{ label: "Tone", value: annotations.verifiedSkinPresentationNativeValue ?? "Demo unavailable", controlKind: "color" }],
      rationale: "Skin presentation is shown as a selectable appearance value in demo mode."
    }),
    buildStep({
      id: "demo-build-skin-details",
      title: "Skin details",
      category: "Skin details",
      menuPath: annotations.verifiedSkinDetailsMenuPath,
      controls: [{ label: "Detail", value: annotations.verifiedSkinDetailsNativeValue ?? "Demo unavailable", controlKind: "preset" }],
      rationale: "Skin detail is included so the result screen exercises the full Buddy Trial contract."
    }),
    buildStep({
      id: "demo-build-hair",
      title: "Hair",
      category: "Hair",
      menuPath: annotations.verifiedHairstyleMenuPath,
      controls: [{ label: "Style", value: annotations.verifiedHairstyleNativeValue ?? "Demo unavailable", controlKind: "preset" }],
      rationale: "The demo hairstyle reflects the synthetic appearance attributes in the derived profile."
    }),
    buildStep({
      id: "demo-build-hair-color",
      title: "Hair color",
      category: "Hair color",
      menuPath: annotations.verifiedHairColorMenuPath,
      controls: [{ label: "Color", value: annotations.verifiedHairColorNativeValue ?? "Demo unavailable", controlKind: "color" }],
      rationale: "Hair color is shown separately from hairstyle to match the future production contract."
    }),
    buildStep({
      id: "demo-build-facial-hair",
      title: "Facial hair",
      category: "Facial hair",
      menuPath: annotations.verifiedFacialHairMenuPath,
      controls: [{ label: "Style", value: annotations.verifiedFacialHairNativeValue ?? "Demo unavailable", controlKind: "facialHair" }],
      rationale: "Facial hair is included as demo data only and remains separate from production verification."
    }),
    buildStep({
      id: "demo-build-facial-hair-color",
      title: "Facial-hair color",
      category: "Facial-hair color",
      menuPath: annotations.verifiedFacialHairColorMenuPath ?? "Road to Glory > Appearance > Facial Hair > Color",
      controls: [{ label: "Color", value: annotations.verifiedFacialHairColorNativeValue ?? "Demo no facial-hair color", controlKind: "color" }],
      rationale: "Facial-hair color is shown only when supported by the synthetic recommendation."
    }),
    buildStep({
      id: "demo-build-nose",
      title: "Nose",
      category: "Nose",
      menuPath: "Road to Glory > Appearance > Face > Nose",
      controls: [
        { label: "Bridge", value: annotations.demoNoseBridgeSlider ?? "Demo unavailable", controlKind: "slider" },
        { label: "Width", value: annotations.demoNoseBridgeSlider ?? "Demo unavailable", controlKind: "slider" },
        { label: "Projection", value: annotations.demoNoseBridgeSlider ?? "Demo unavailable", controlKind: "slider" }
      ],
      rationale: "Nose slider-style controls exercise exact value display without claiming production calibration."
    }),
    buildStep({
      id: "demo-build-jaw-chin",
      title: "Jaw and chin",
      category: "Jaw and chin",
      menuPath: "Road to Glory > Appearance > Face > Jaw and Chin",
      controls: [
        { label: "Jaw width", value: annotations.demoJawWidthSlider ?? "Demo unavailable", controlKind: "slider" },
        { label: "Chin depth", value: annotations.demoChinDepthSlider ?? "Demo unavailable", controlKind: "slider" }
      ],
      rationale: "The refinement demo later uses these same supported fixture controls."
    })
  ];
}

function buildStep({
  id,
  title,
  category,
  menuPath,
  controls,
  rationale
}: {
  id: string;
  title: string;
  category: string;
  menuPath: string | undefined;
  controls: OwnerReviewDemoBuildStep["controls"];
  rationale: string;
}): OwnerReviewDemoBuildStep {
  return {
    id,
    title,
    category,
    menuPath: splitMenuPath(menuPath ?? "Owner Review Demo"),
    controls,
    rationale,
    provenance: OWNER_REVIEW_DEMO_MODE
  };
}

function createOwnerReviewDemoRefinementPlan(item: GameCatalogItem): OwnerReviewDemoRefinementPlan {
  const buildReview = createOwnerReviewDemoBuildMatchReview(item);
  return {
    schemaVersion: "owner-review-demo-refinement-v1",
    initialBuildScore: buildReview.buildMatchScore,
    refinedBuildScore: 92,
    passingThreshold: 90,
    buildReview,
    recommendedChanges: buildReview.adjustments,
    refinementBuildGuideSteps: createOwnerReviewDemoRefinementBuildGuideSteps(buildReview.adjustments),
    rawMediaRetained: false
  };
}

export function createOwnerReviewDemoBuildMatchReview(
  item: GameCatalogItem,
  scenario: OwnerReviewDemoRefinementScenario = "clear_improvement"
): OwnerReviewDemoBuildMatchReview {
  const baseAdjustments = ownerReviewDemoCalibrationAdjustments().filter((adjustment) => adjustment.availableInActiveCatalogAdapter);
  const comparedInputs = {
    derivedFaceProfile: "owner-review-demo-profile-v1",
    initialRecommendation: item.stableInternalID,
    renderedCharacterVideo: "buddy-trial-video-1-standardized-views"
  };

  if (scenario === "no_change") {
    return buildMatchReview({
      status: "no_changes",
      buildMatchScore: 93,
      strengths: ["Eye spacing", "Overall face width", "Hair", "Jaw and chin balance"],
      weaknesses: [],
      adjustments: [],
      noChangeReason: "The owner-review demo comparison is already above the configured 90/100 build-match threshold.",
      uncertaintyReasons: [],
      alternativeHeadRecommendation: null,
      comparedInputs
    });
  }

  if (scenario === "uncertain") {
    return buildMatchReview({
      status: "uncertain",
      buildMatchScore: 78,
      strengths: ["Hair", "Overall face width"],
      weaknesses: ["Video #1 needs clearer front and side views before exact changes are defensible."],
      adjustments: [],
      noChangeReason: null,
      uncertaintyReasons: [
        "The standardized character views were not strong enough to support directional slider changes.",
        "GameFace Match should ask for a better result video instead of guessing."
      ],
      alternativeHeadRecommendation: null,
      comparedInputs
    });
  }

  if (scenario === "alternative_head") {
    return buildMatchReview({
      status: "changes_recommended",
      buildMatchScore: 79,
      strengths: ["Hair", "Skin presentation"],
      weaknesses: ["Face preset shape differs more than the fixture alternatives.", "Jaw and nose differences remain visible."],
      adjustments: baseAdjustments.slice(0, 1),
      noChangeReason: null,
      uncertaintyReasons: [],
      alternativeHeadRecommendation: {
        label: "Review Demo Face Gamma",
        reason: "The fixture comparison shows a stronger head/preset alternative than changing only sliders.",
        provenance: OWNER_REVIEW_DEMO_MODE
      },
      comparedInputs
    });
  }

  return buildMatchReview({
    status: "changes_recommended",
    buildMatchScore: 82,
    strengths: ["Eye spacing", "Overall face width", "Hair"],
    weaknesses: ["Jaw appears too wide", "Nose appears too short", "Chin projection is too strong"],
    adjustments: baseAdjustments,
    noChangeReason: null,
    uncertaintyReasons: [],
    alternativeHeadRecommendation: null,
    comparedInputs
  });
}

function buildMatchReview(input: {
  status: OwnerReviewDemoBuildMatchReview["status"];
  buildMatchScore: number;
  strengths: string[];
  weaknesses: string[];
  adjustments: OwnerReviewDemoRefinementAdjustment[];
  noChangeReason: string | null;
  uncertaintyReasons: string[];
  alternativeHeadRecommendation: OwnerReviewDemoBuildMatchReview["alternativeHeadRecommendation"];
  comparedInputs: OwnerReviewDemoBuildMatchReview["comparedInputs"];
}): OwnerReviewDemoBuildMatchReview {
  return {
    schemaVersion: "owner-review-demo-build-match-review-v1",
    status: input.status,
    buildMatchScore: input.buildMatchScore,
    passingThreshold: 90,
    scoreLanguage: "Build Match Score compares the created character to the derived face profile using available game controls. It is not identity probability.",
    strengths: input.strengths,
    weaknesses: input.weaknesses,
    adjustments: input.adjustments,
    noChangeReason: input.noChangeReason,
    uncertaintyReasons: input.uncertaintyReasons,
    alternativeHeadRecommendation: input.alternativeHeadRecommendation,
    comparedInputs: input.comparedInputs,
    productionEligible: false,
    rawMediaRetained: false,
    provenance: OWNER_REVIEW_DEMO_MODE
  };
}

function ownerReviewDemoCalibrationAdjustments(): OwnerReviewDemoRefinementAdjustment[] {
  return [
    refinementAdjustment({
      id: "owner-demo-refine-jaw-width",
      controlID: "demo-jaw-width-slider",
      category: "Jaw",
      label: "Jaw Width",
      currentValue: "67",
      recommendedValue: "61",
      menuPath: "Road to Glory > Appearance > Face > Jaw and Chin",
      reason: "The rendered character's jaw reads wider than the derived face profile.",
      expectedEffect: "Narrowing this supported demo control should bring the lower-face width closer to the scanned profile."
    }),
    refinementAdjustment({
      id: "owner-demo-refine-nose-height",
      controlID: "demo-nose-height-slider",
      category: "Nose",
      label: "Nose Height",
      currentValue: "46",
      recommendedValue: "51",
      menuPath: "Road to Glory > Appearance > Face > Nose",
      reason: "The rendered character's nose appears shorter than the derived face profile.",
      expectedEffect: "Raising this supported demo value should improve nose length balance without inventing a production slider."
    }),
    refinementAdjustment({
      id: "owner-demo-refine-chin-projection",
      controlID: "demo-chin-projection-slider",
      category: "Chin",
      label: "Chin Projection",
      currentValue: "58",
      recommendedValue: "52",
      menuPath: "Road to Glory > Appearance > Face > Jaw and Chin",
      reason: "The rendered character's chin projects more strongly than the derived face profile.",
      expectedEffect: "Reducing this supported demo value should soften the profile while keeping the verified demo head/preset."
    }),
    {
      ...refinementAdjustment({
        id: "owner-demo-unsupported-mouth-width",
        controlID: "demo-mouth-width-slider",
        category: "Mouth",
        label: "Mouth Width",
        currentValue: "55",
        recommendedValue: "49",
        menuPath: "Road to Glory > Appearance > Face > Mouth",
        reason: "This fixture intentionally represents an unsupported slider suppression case.",
        expectedEffect: "Suppressed controls must not appear in the customer plan."
      }),
      availableInActiveCatalogAdapter: false
    }
  ];
}

function refinementAdjustment(input: Omit<OwnerReviewDemoRefinementAdjustment, "menuPath" | "controlKind" | "availableInActiveCatalogAdapter" | "requiresVerifiedCalibration" | "provenance"> & { menuPath: string }): OwnerReviewDemoRefinementAdjustment {
  return {
    ...input,
    controlKind: "slider",
    menuPath: splitMenuPath(input.menuPath),
    availableInActiveCatalogAdapter: true,
    requiresVerifiedCalibration: true,
    provenance: OWNER_REVIEW_DEMO_MODE
  };
}

function createOwnerReviewDemoRefinementBuildGuideSteps(adjustments: OwnerReviewDemoRefinementAdjustment[]): OwnerReviewDemoBuildStep[] {
  return adjustments.map((adjustment, index) =>
    buildStep({
      id: `owner-demo-refinement-step-${index + 1}-${adjustment.controlID}`,
      title: adjustment.label,
      category: adjustment.category,
      menuPath: adjustment.menuPath.join(" > "),
      controls: [{ label: adjustment.label, value: `${adjustment.currentValue} -> ${adjustment.recommendedValue}`, controlKind: adjustment.controlKind }],
      rationale: adjustment.reason
    })
  );
}

export function evaluateProductionRefinementAvailability(input: {
  catalog: GameCatalogManifest;
  verifiedCalibrationControlIDs?: string[];
}): ProductionRefinementAvailability {
  const reasons: string[] = [];
  if (input.catalog.sourceType !== "production" || !input.catalog.isProduction) {
    reasons.push("Production refinement requires the production catalog manifest.");
  }
  if (input.catalog.items.length === 0) {
    reasons.push("Production refinement requires a nonempty verified production catalog.");
  }
  const allowedControlIDs = input.verifiedCalibrationControlIDs ?? [];
  if (allowedControlIDs.length === 0) {
    reasons.push("Production refinement requires verified control-effect calibration before any slider adjustment can be shown.");
  }
  return {
    available: reasons.length === 0,
    reasons,
    allowedControlIDs,
    adjustments: []
  };
}

function createOwnerReviewDemoProfile(): StandardFaceProfile {
  const now = "2026-08-07T00:00:00.000Z";
  const measurements = {
    faceWidthRatio: measurement(0.7),
    jawWidthRatio: measurement(0.61),
    chinWidthRatio: measurement(0.33),
    eyeSpacingRatio: measurement(0.32),
    noseWidthRatio: measurement(0.22),
    noseLengthRatio: measurement(0.39),
    mouthWidthRatio: measurement(0.43)
  };
  const attributes: AppearanceAttribute[] = [
    attribute("hairColorFamily", "brown"),
    attribute("hairstyleFamily", "short"),
    attribute("hairTextureFamily", "straight"),
    attribute("facialHairPresence", "yes"),
    attribute("facialHairStyleFamily", "short-boxed"),
    attribute("facialHairColorFamily", "brown"),
    attribute("skinPresentation", "owner-demo-skin-warm-medium")
  ];
  return {
    id: "owner-review-demo-profile",
    profileContractVersion: "standard-face-profile-v1",
    profileVersion: "owner-review-demo-profile-v1",
    createdAt: now,
    capture: {
      mode: "webRgbGuided",
      deviceModel: "owner-review-demo-device",
      capturedAt: now,
      overallQuality: 0.92,
      operatingSystemVersion: "owner-review-demo-os",
      appVersion: "owner-review-demo-app",
      browserName: "owner-review-demo-browser",
      browserRgbOnly: true
    },
    qualityReport: {
      overallScore: 0.92,
      issues: [],
      isUsableForPrototype: true,
      requiredAnglesComplete: true,
      blockingIssueCount: 0,
      advisoryIssueCount: 0
    },
    geometry: {
      measurements,
      unavailableMeasurements: [],
      modelVersion: "owner-review-demo-geometry-v1"
    },
    appearance: {
      attributes,
      modelVersion: "owner-review-demo-appearance-v1"
    },
    confidence: {
      overall: confidence(0.9),
      captureQuality: confidence(0.92),
      geometry: confidence(0.9),
      appearance: confidence(0.9),
      evidenceCompleteness: confidence(0.9)
    },
    supportingFrames: {
      totalFrameCount: 5,
      availableAngleIDs: ["straightOn", "left45", "right45", "leftProfile", "rightProfile"],
      requiredAngleCount: 5,
      profileAngleCount: 2,
      depthFrameCount: 0,
      byAngle: {
        straightOn: angleSupport("straightOn"),
        left45: angleSupport("left45"),
        right45: angleSupport("right45"),
        leftProfile: angleSupport("leftProfile"),
        rightProfile: angleSupport("rightProfile")
      }
    },
    userConfirmedAttributes: attributes,
    modelVersions: {
      profileContract: "standard-face-profile-v1",
      profileBuilder: "owner-review-demo-profile-builder-v1",
      geometry: "owner-review-demo-geometry-v1",
      appearance: "owner-review-demo-appearance-v1",
      captureQuality: "owner-review-demo-capture-quality-v1",
      measurementAlgorithm: "owner-review-demo-measurement-v1",
      landmarkProvider: "owner-review-demo-local-fixture"
    },
    deletionState: {
      status: "active",
      deletedAt: null,
      deletionRecordID: null,
      reason: null
    },
    sourceAngleAvailability: {
      straightOn: { angleID: "straightOn", available: true, source: "camera", qualityState: "ready", width: 720, height: 960 },
      left45: { angleID: "left45", available: true, source: "camera", qualityState: "ready", width: 720, height: 960 },
      right45: { angleID: "right45", available: true, source: "camera", qualityState: "ready", width: 720, height: 960 },
      leftProfile: { angleID: "leftProfile", available: true, source: "camera", qualityState: "ready", width: 720, height: 960 },
      rightProfile: { angleID: "rightProfile", available: true, source: "camera", qualityState: "ready", width: 720, height: 960 }
    }
  };
}

function measurement(value: number) {
  return {
    value,
    confidence: confidence(0.95),
    supportingFrameCount: 5,
      supportingPoses: ownerReviewDemoAngles,
    variance: 0.01,
    depthSupported: false,
    profileEvidenceExists: true,
    occlusionImpact: "none" as const,
    occlusionStatus: "none" as const,
    measurementSource: "browserRgbImage" as const,
    availabilityState: "available" as const,
    algorithmVersion: "owner-review-demo-measurement-v1"
  };
}

function attribute(category: UserConfirmedAttributeCategory, value: UserConfirmedAttributeValue): AppearanceAttribute {
  return {
    id: `owner-demo-${category}`,
    category,
    label: category,
    value,
    confidence: confidence(0.95),
    userConfirmed: true,
    source: "userConfirmed",
    required: false
  };
}

function confidence(score: number) {
  return {
    score,
    label: score >= 0.75 ? "high" as const : score >= 0.4 ? "medium" as const : "low" as const
  };
}

function angleSupport(angleID: StandardFaceProfile["supportingFrames"]["availableAngleIDs"][number]) {
  return {
    angleID,
    available: true,
    source: "camera" as const,
    frameCount: 1,
    width: 720,
    height: 960,
    qualityState: "ready" as const
  };
}

function splitMenuPath(value: string) {
  return value.split(">").map((part) => part.trim()).filter(Boolean);
}
