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

export interface OwnerReviewDemoRefinementPlan {
  schemaVersion: "owner-review-demo-refinement-v1";
  initialBuildScore: number;
  refinedBuildScore: number;
  passingThreshold: 90;
  recommendedChanges: Array<{
    id: string;
    label: string;
    reason: string;
    provenance: typeof OWNER_REVIEW_DEMO_MODE;
  }>;
  rawMediaRetained: false;
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

function createOwnerReviewDemoRefinementPlan(item: GameCatalogItem): OwnerReviewDemoRefinementPlan {
  return {
    schemaVersion: "owner-review-demo-refinement-v1",
    initialBuildScore: 84,
    refinedBuildScore: 92,
    passingThreshold: 90,
    recommendedChanges: [
      {
        id: "owner-demo-refine-jaw-width",
        label: `Adjust Jaw width to ${item.humanAnnotations.demoJawWidthSlider}`,
        reason: "Owner Review Demo synthetic scoring marks jaw width as the largest remaining mismatch.",
        provenance: OWNER_REVIEW_DEMO_MODE
      },
      {
        id: "owner-demo-refine-chin-depth",
        label: `Adjust Chin depth to ${item.humanAnnotations.demoChinDepthSlider}`,
        reason: "Owner Review Demo synthetic scoring marks chin depth as a supported refinement control.",
        provenance: OWNER_REVIEW_DEMO_MODE
      }
    ],
    rawMediaRetained: false
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
