import type {
  AppearanceAttribute,
  AppearanceRecommendationCategory,
  CatalogFacialMeasurement,
  FacialMeasurement,
  GameAppearanceMatch,
  GameCatalogItem,
  GameCatalogManifest,
  MatchFeatureContribution,
  MatchFeatureEvidence,
  MeasurementConfidence,
  StandardFaceProfile,
  StandardFacialMeasurementID,
  UserConfirmedAttributeValue,
  UserConfirmedAttributeCategory,
  VerifiedAppearanceRecommendation
} from "@/types/domain";
import { classifyCatalogRecord } from "@/lib/catalog/catalog-record-classification";

export interface MatchingEngine {
  readonly modelVersion: string;
  matchTopThree(input: MatchingInput): GameAppearanceMatch[];
}

export interface MatchingInput {
  profile: StandardFaceProfile;
  catalog: GameCatalogManifest;
  preferences?: MatchingPreferences;
  limit?: number;
  allowTestFixtures?: boolean;
}

export interface MatchingPreferences {
  overallResemblance?: number;
  faceAndJawShape?: number;
  eyesAndEyebrows?: number;
  nose?: number;
  mouth?: number;
  hair?: number;
  facialHair?: number;
  desiredAthletePhysique?: number;
}

export interface MatchingFeatureConfig {
  id: StandardFacialMeasurementID;
  group: "faceAndJawShape" | "eyesAndEyebrows" | "nose" | "mouth" | "profileProjection";
  weight: number;
  maxDistance: number;
}

export interface MatchingAppearanceFeatureConfig {
  category: UserConfirmedAttributeCategory;
  group: "hair" | "facialHair" | "desiredAthletePhysique";
  weight: number;
  annotationKeys: string[];
}

export interface AppearanceRecommendationDefinition {
  category: AppearanceRecommendationCategory;
  label: string;
  userAttributeCategories: UserConfirmedAttributeCategory[];
  nativeAnnotationKeys: string[];
  classifierAnnotationKeys: string[];
}

export interface RuleBasedMatchingEngineConfig {
  geometryFeatures?: MatchingFeatureConfig[];
  appearanceFeatures?: MatchingAppearanceFeatureConfig[];
  requireApprovedProductionRelease?: boolean;
}

export const RULE_BASED_MATCHING_MODEL_VERSION = "rule-based-web-mvp-v2-rgb-geometry";
const scoreLabel = "Match score based on the game’s available appearance options.";
const lowConfidenceThreshold = 0.25;
const nearTieScoreDelta = 1;

export const defaultGeometryFeatureConfig: MatchingFeatureConfig[] = [
  { id: "faceWidthRatio", group: "faceAndJawShape", weight: 0.12, maxDistance: 0.35 },
  { id: "faceLengthRatio", group: "faceAndJawShape", weight: 0.05, maxDistance: 0.35 },
  { id: "foreheadWidthRatio", group: "faceAndJawShape", weight: 0.07, maxDistance: 0.3 },
  { id: "jawWidthRatio", group: "faceAndJawShape", weight: 0.11, maxDistance: 0.3 },
  { id: "chinWidthRatio", group: "faceAndJawShape", weight: 0.07, maxDistance: 0.3 },
  { id: "lowerFaceRatio", group: "faceAndJawShape", weight: 0.05, maxDistance: 0.22 },
  { id: "jawAngle", group: "faceAndJawShape", weight: 0.04, maxDistance: 0.22 },
  { id: "eyeSpacingRatio", group: "eyesAndEyebrows", weight: 0.09, maxDistance: 0.22 },
  { id: "meanEyeWidthRatio", group: "eyesAndEyebrows", weight: 0.05, maxDistance: 0.18 },
  { id: "eyeTilt", group: "eyesAndEyebrows", weight: 0.03, maxDistance: 0.12 },
  { id: "browPosition", group: "eyesAndEyebrows", weight: 0.04, maxDistance: 0.16 },
  { id: "noseWidthRatio", group: "nose", weight: 0.09, maxDistance: 0.22 },
  { id: "noseLengthRatio", group: "nose", weight: 0.07, maxDistance: 0.24 },
  { id: "noseProjection", group: "profileProjection", weight: 0.05, maxDistance: 0.2 },
  { id: "chinProjection", group: "profileProjection", weight: 0.04, maxDistance: 0.2 },
  { id: "mouthWidthRatio", group: "mouth", weight: 0.07, maxDistance: 0.26 }
];

export const defaultAppearanceFeatureConfig: MatchingAppearanceFeatureConfig[] = [
  { category: "hairColorFamily", group: "hair", weight: 0.04, annotationKeys: ["hairColorFamily"] },
  { category: "hairTextureFamily", group: "hair", weight: 0.03, annotationKeys: ["hairTextureFamily"] },
  { category: "hairstyleFamily", group: "hair", weight: 0.04, annotationKeys: ["hairstyleFamily"] },
  { category: "facialHairPresence", group: "facialHair", weight: 0.04, annotationKeys: ["facialHairPresence"] },
  { category: "facialHairStyleFamily", group: "facialHair", weight: 0.03, annotationKeys: ["facialHairStyleFamily"] },
  { category: "preferredBodyType", group: "desiredAthletePhysique", weight: 0.03, annotationKeys: ["preferredBodyType"] }
];

export const defaultAppearanceRecommendationDefinitions: AppearanceRecommendationDefinition[] = [
  {
    category: "hairstyle",
    label: "Hairstyle",
    userAttributeCategories: ["hairstyleFamily", "hairTextureFamily"],
    nativeAnnotationKeys: ["verifiedHairstyleNativeValue", "hairstyleNativeValue", "nativeHairstyleLabel", "hairstyleGameLabel"],
    classifierAnnotationKeys: ["hairstyleFamily", "hairTextureFamily"]
  },
  {
    category: "hairColor",
    label: "Hair color",
    userAttributeCategories: ["hairColorFamily"],
    nativeAnnotationKeys: ["verifiedHairColorNativeValue", "hairColorNativeValue", "nativeHairColorLabel", "hairColorGameLabel"],
    classifierAnnotationKeys: ["hairColorFamily"]
  },
  {
    category: "facialHair",
    label: "Facial hair",
    userAttributeCategories: ["facialHairPresence", "facialHairStyleFamily"],
    nativeAnnotationKeys: ["verifiedFacialHairNativeValue", "facialHairNativeValue", "nativeFacialHairLabel", "facialHairGameLabel"],
    classifierAnnotationKeys: ["facialHairPresence", "facialHairStyleFamily"]
  },
  {
    category: "facialHairColor",
    label: "Facial-hair color",
    userAttributeCategories: ["facialHairPresence", "facialHairColorFamily"],
    nativeAnnotationKeys: ["verifiedFacialHairColorNativeValue", "facialHairColorNativeValue", "nativeFacialHairColorLabel", "facialHairColorGameLabel"],
    classifierAnnotationKeys: ["facialHairPresence", "facialHairColorFamily"]
  },
  {
    category: "eyebrows",
    label: "Eyebrows",
    userAttributeCategories: ["eyebrowThickness"],
    nativeAnnotationKeys: ["verifiedEyebrowNativeValue", "eyebrowNativeValue", "nativeEyebrowLabel", "eyebrowGameLabel"],
    classifierAnnotationKeys: ["eyebrowThickness"]
  },
  {
    category: "skinPresentation",
    label: "Skin presentation",
    userAttributeCategories: ["skinPresentation"],
    nativeAnnotationKeys: ["verifiedSkinPresentationNativeValue", "skinPresentationNativeValue", "nativeSkinPresentationLabel", "skinPresentationGameLabel"],
    classifierAnnotationKeys: ["skinPresentation"]
  },
  {
    category: "otherVisualAttribute",
    label: "Other verified visual attribute",
    userAttributeCategories: ["visibleMarks", "preferredBodyType"],
    nativeAnnotationKeys: ["verifiedOtherVisualAttributeNativeValue", "otherVisualAttributeNativeValue", "visibleMarksNativeValue", "preferredBodyTypeNativeValue"],
    classifierAnnotationKeys: ["visibleMarks", "preferredBodyType"]
  }
];

export function createRuleBasedMatchingEngine(config: MatchingFeatureConfig[] | RuleBasedMatchingEngineConfig = defaultGeometryFeatureConfig): MatchingEngine {
  const engineConfig: Required<RuleBasedMatchingEngineConfig> = Array.isArray(config)
    ? {
        geometryFeatures: config,
        appearanceFeatures: defaultAppearanceFeatureConfig,
        requireApprovedProductionRelease: true
      }
    : {
        geometryFeatures: config.geometryFeatures ?? defaultGeometryFeatureConfig,
        appearanceFeatures: config.appearanceFeatures ?? defaultAppearanceFeatureConfig,
        requireApprovedProductionRelease: config.requireApprovedProductionRelease ?? true
      };
  return {
    modelVersion: RULE_BASED_MATCHING_MODEL_VERSION,
    matchTopThree(input) {
      if (!canMatchCatalog(input.catalog, input.allowTestFixtures ?? false, engineConfig.requireApprovedProductionRelease)) {
        return [];
      }
      const candidates = input.catalog.items
        .filter((item) => isMatchableCatalogItem(item, input.catalog, input.allowTestFixtures ?? false))
        .filter((item) => hasVerifiedMenuInstructions(item, input.allowTestFixtures ?? false))
        .map((item) =>
          scoreCatalogItem({
            profile: input.profile,
            item,
            catalog: input.catalog,
            geometryConfig: engineConfig.geometryFeatures,
            appearanceConfig: engineConfig.appearanceFeatures,
            preferences: input.preferences,
            modelVersion: this.modelVersion
          })
        )
        .sort(compareMatches);
      return assignRanksAndTies(candidates).slice(0, input.limit ?? 3);
    }
  };
}

function scoreCatalogItem(input: {
  profile: StandardFaceProfile;
  item: GameCatalogItem;
  catalog: GameCatalogManifest;
  geometryConfig: MatchingFeatureConfig[];
  appearanceConfig: MatchingAppearanceFeatureConfig[];
  preferences?: MatchingPreferences;
  modelVersion: string;
}): GameAppearanceMatch {
  const contributions = [
    ...input.geometryConfig.map((feature) => scoreGeometryFeature(input.profile, input.item, feature, input.preferences)),
    ...input.appearanceConfig.map((feature) => scoreAppearanceFeature(input.profile, input.item, feature, input.preferences))
  ];
  const included = contributions.filter((contribution) => contribution.included && contribution.effectiveWeight > 0);
  const effectiveWeightTotal = included.reduce((total, contribution) => total + contribution.effectiveWeight, 0);
  const weightedDistance =
    effectiveWeightTotal > 0 ? included.reduce((total, contribution) => total + contribution.normalizedDistance * contribution.effectiveWeight, 0) / effectiveWeightTotal : 1;
  const evidenceCoverage = calculateEvidenceCoverage(contributions, input.preferences, input.geometryConfig, input.appearanceConfig);
  const averageReliability = included.length > 0 ? included.reduce((total, contribution) => total + contribution.reliability, 0) / included.length : 0;
  const preferenceAdjustment = calculatePreferenceAdjustment(input.profile, input.item, input.preferences);
  const score = clamp(round((1 - weightedDistance) * 100 + preferenceAdjustment * 5), 0, 100);
  const confidenceScore = clamp(round(evidenceCoverage * averageReliability), 0, 1);

  return {
    id: `${input.item.stableInternalID}-${input.modelVersion}`,
    rank: 0,
    catalogItem: input.item,
    score,
    scoreLabel,
    confidence: confidenceFromScore(confidenceScore),
    explanation: buildExplanation(input.item, score, contributions, evidenceCoverage, averageReliability),
    catalogVersion: input.item.catalogVersion ?? input.catalog.catalogVersion,
    modelVersion: input.modelVersion,
    featureContributions: contributions,
    appearanceRecommendations: buildAppearanceRecommendations(input.profile, input.item, input.catalog)
  };
}

export function buildAppearanceRecommendations(
  profile: StandardFaceProfile,
  item: GameCatalogItem,
  catalog: GameCatalogManifest
): VerifiedAppearanceRecommendation[] {
  return defaultAppearanceRecommendationDefinitions.map((definition) => buildAppearanceRecommendation(profile, item, catalog, definition));
}

function buildAppearanceRecommendation(
  profile: StandardFaceProfile,
  item: GameCatalogItem,
  catalog: GameCatalogManifest,
  definition: AppearanceRecommendationDefinition
): VerifiedAppearanceRecommendation {
  const nativeEntry = firstAnnotationEntry(item, definition.nativeAnnotationKeys);
  const classifierValues = definition.classifierAnnotationKeys.map((key) => item.humanAnnotations[key]).filter(isUsableAppearanceValue);
  const appearanceAttributes = profile.userConfirmedAttributes.length > 0 ? profile.userConfirmedAttributes : profile.appearance.attributes;
  const userConfirmedValues = Object.fromEntries(
    definition.userAttributeCategories.map((category) => [category, findAttribute(appearanceAttributes, category)?.value ?? null])
  ) as Partial<Record<UserConfirmedAttributeCategory, UserConfirmedAttributeValue>>;
  const usableUserValues = Object.values(userConfirmedValues).filter(isUsableAppearanceValue);
  const classifierMatchState = classifyAppearanceRecommendation(definition, userConfirmedValues, item);
  const traceability = {
    sourceCatalogItemID: item.stableInternalID,
    verificationDate: item.verifiedDate ?? catalog.catalogVersion.verifiedAt,
    catalogVersion: item.catalogVersion ?? catalog.catalogVersion,
    gameVersion: item.gameVersion,
    platform: item.platform,
    mode: item.gameMode,
    creationPath: item.creationPath
  };

  if (!nativeEntry) {
    return {
      category: definition.category,
      label: definition.label,
      status: "unavailable" as const,
      nativeGameValue: null,
      sourceAnnotationKey: null,
      userConfirmedValues,
      confidence: confidenceFromScore(0),
      explanation: `${definition.label} is unavailable because this verified catalog record does not include a verified native game value for that category.`,
      ...traceability
    };
  }

  if (definition.category === "facialHairColor" && userConfirmedValues.facialHairPresence === "none") {
    return {
      category: definition.category,
      label: definition.label,
      status: "unavailable" as const,
      nativeGameValue: null,
      sourceAnnotationKey: nativeEntry.key,
      userConfirmedValues,
      confidence: confidenceFromScore(0),
      explanation: "Facial-hair color is not recommended because the user confirmed no facial hair.",
      ...traceability
    };
  }

  if (usableUserValues.length === 0) {
    return {
      category: definition.category,
      label: definition.label,
      status: "ambiguous" as const,
      nativeGameValue: nativeEntry.value,
      sourceAnnotationKey: nativeEntry.key,
      userConfirmedValues,
      confidence: confidenceFromScore(0.35),
      explanation: `${definition.label} has a verified native value, but the user-confirmed profile value is unspecified. Ask for correction before treating it as selected.`,
      ...traceability
    };
  }

  if (classifierValues.length === 0) {
    return {
      category: definition.category,
      label: definition.label,
      status: "ambiguous" as const,
      nativeGameValue: nativeEntry.value,
      sourceAnnotationKey: nativeEntry.key,
      userConfirmedValues,
      confidence: confidenceFromScore(0.45),
      explanation: `${definition.label} has a verified native value, but the catalog lacks standardized appearance classification for the user-confirmed attribute.`,
      ...traceability
    };
  }

  if (classifierMatchState === "mismatch") {
    return {
      category: definition.category,
      label: definition.label,
      status: "ambiguous" as const,
      nativeGameValue: nativeEntry.value,
      sourceAnnotationKey: nativeEntry.key,
      userConfirmedValues,
      confidence: confidenceFromScore(0.45),
      explanation: `${definition.label} has a verified native value, but the user-confirmed appearance value does not match the catalog classification. Let the user correct the attribute or choose another verified result.`,
      ...traceability
    };
  }

  if (classifierMatchState === "unclassified") {
    return {
      category: definition.category,
      label: definition.label,
      status: "ambiguous" as const,
      nativeGameValue: nativeEntry.value,
      sourceAnnotationKey: nativeEntry.key,
      userConfirmedValues,
      confidence: confidenceFromScore(0.45),
      explanation: `${definition.label} has a verified native value, but the catalog classification cannot be compared directly to the user-confirmed attribute.`,
      ...traceability
    };
  }

  return {
    category: definition.category,
    label: definition.label,
    status: "selected" as const,
    nativeGameValue: nativeEntry.value,
    sourceAnnotationKey: nativeEntry.key,
    userConfirmedValues,
    confidence: confidenceFromScore(0.9),
    explanation: `${definition.label} selected verified native game value "${nativeEntry.value}" because the user-confirmed appearance attribute matches the catalog classification. This does not affect geometric head similarity.`,
    ...traceability
  };
}

function scoreGeometryFeature(
  profile: StandardFaceProfile,
  item: GameCatalogItem,
  feature: MatchingFeatureConfig,
  preferences?: MatchingPreferences
): MatchFeatureContribution {
  const profileMeasurement = profile.geometry.measurements[feature.id];
  const catalogMeasurement = item.geometryMeasurements[feature.id];
  const profileEvidence = profileMeasurementEvidence(profileMeasurement);
  const catalogEvidence = catalogMeasurementEvidence(catalogMeasurement);
  const profileValue = profileEvidence.value === null ? null : Number(profileEvidence.value);
  const catalogValue = catalogEvidence.value === null ? null : Number(catalogEvidence.value);
  const reliability = adjustedGeometryReliability(profileMeasurement, catalogMeasurement, Math.min(profileEvidence.confidence.score, catalogEvidence.confidence.score));
  const preferenceMultiplier = preferenceForGroup(feature.group, preferences);
  const effectiveWeight = feature.weight * preferenceMultiplier * Math.max(reliability, 0);
  const missingReason = getGeometryMissingReason({
    feature,
    profileEvidence,
    catalogEvidence,
    profileMeasurement,
    reliability
  });
  if (missingReason) {
    return {
      featureID: feature.id,
      group: "geometry",
      profileValue,
      catalogValue,
      profileAvailability: profileEvidence.availabilityState === "notApplicable" ? "unavailable" : profileEvidence.availabilityState,
      profileEvidence,
      catalogEvidence,
      normalizedDistance: 1,
      effectiveWeight: 0,
      reliability,
      included: false,
      reason: missingReason
    };
  }
  return {
    featureID: feature.id,
    group: "geometry",
    profileValue,
    catalogValue,
    normalizedDistance: clamp(round(Math.abs(Number(profileValue) - Number(catalogValue)) / feature.maxDistance), 0, 1),
    effectiveWeight,
    reliability,
    profileAvailability: profileEvidence.availabilityState === "notApplicable" ? "unavailable" : profileEvidence.availabilityState,
    profileEvidence,
    catalogEvidence,
    included: true,
    reason: "Reliable geometry feature included."
  };
}

function scoreAppearanceFeature(
  profile: StandardFaceProfile,
  item: GameCatalogItem,
  feature: MatchingAppearanceFeatureConfig,
  preferences?: MatchingPreferences
): MatchFeatureContribution {
  const profileAttribute = findAttribute(profile.appearance.attributes, feature.category);
  const catalogValue = feature.annotationKeys.map((key) => item.humanAnnotations[key]).find((value) => value !== undefined) ?? null;
  const profileValue = profileAttribute?.value ?? null;
  const profileEvidence = appearanceProfileEvidence(profileAttribute);
  const catalogEvidence = appearanceCatalogEvidence(catalogValue);
  const reliability = profileAttribute?.userConfirmed ? 1 : 0;
  const preferenceMultiplier = preferenceForGroup(feature.group, preferences);
  if (profileValue === null || profileValue === "" || profileValue === "unspecified" || catalogValue === null) {
    return {
      featureID: feature.category,
      group: "appearance",
      profileValue,
      catalogValue,
      profileAvailability: profileEvidence.availabilityState === "notApplicable" ? "unavailable" : profileEvidence.availabilityState,
      profileEvidence,
      catalogEvidence,
      normalizedDistance: 1,
      effectiveWeight: 0,
      reliability,
      included: false,
      reason: "Appearance feature unavailable or unspecified."
    };
  }
  const normalizedDistance = String(profileValue).toLowerCase() === String(catalogValue).toLowerCase() ? 0 : 1;
  return {
    featureID: feature.category,
    group: "appearance",
    profileValue,
    catalogValue,
    normalizedDistance,
    effectiveWeight: feature.weight * preferenceMultiplier * reliability,
    reliability,
    profileAvailability: profileEvidence.availabilityState === "notApplicable" ? "unavailable" : profileEvidence.availabilityState,
    profileEvidence,
    catalogEvidence,
    included: true,
    reason: "User-confirmed appearance feature included separately from geometry."
  };
}

function calculatePreferenceAdjustment(profile: StandardFaceProfile, item: GameCatalogItem, preferences?: MatchingPreferences) {
  const bodyPreference = preferences?.desiredAthletePhysique ?? 0;
  if (bodyPreference <= 0) return 0;
  const preferredBody = findAttribute(profile.appearance.attributes, "preferredBodyType")?.value;
  const catalogBody = item.humanAnnotations.preferredBodyType;
  if (!preferredBody || !catalogBody) return 0;
  return String(preferredBody).toLowerCase() === catalogBody.toLowerCase() ? bodyPreference : -bodyPreference / 2;
}

function calculateEvidenceCoverage(
  contributions: MatchFeatureContribution[],
  preferences: MatchingPreferences | undefined,
  geometryConfig: MatchingFeatureConfig[],
  appearanceConfig: MatchingAppearanceFeatureConfig[]
) {
  const intendedTotal = contributions.reduce((total, contribution) => total + baseIntendedWeight(contribution, preferences, geometryConfig, appearanceConfig), 0);
  const includedTotal = contributions
    .filter((contribution) => contribution.included)
    .reduce((total, contribution) => total + baseIntendedWeight(contribution, preferences, geometryConfig, appearanceConfig), 0);
  return intendedTotal > 0 ? includedTotal / intendedTotal : 0;
}

function baseIntendedWeight(
  contribution: MatchFeatureContribution,
  preferences: MatchingPreferences | undefined,
  geometryConfig: MatchingFeatureConfig[],
  appearanceConfig: MatchingAppearanceFeatureConfig[]
) {
  const geometryFeature = geometryConfig.find((feature) => feature.id === contribution.featureID);
  if (geometryFeature) return geometryFeature.weight * preferenceForGroup(geometryFeature.group, preferences);
  const appearanceFeature = appearanceConfig.find((feature) => feature.category === contribution.featureID);
  return appearanceFeature ? appearanceFeature.weight * preferenceForGroup(appearanceFeature.group, preferences) : 0;
}

function buildExplanation(item: GameCatalogItem, score: number, contributions: MatchFeatureContribution[], evidenceCoverage: number, averageReliability: number) {
  const included = contributions.filter((contribution) => contribution.included);
  const geometryIncluded = included.filter((contribution) => contribution.group === "geometry").length;
  const appearanceIncluded = included.filter((contribution) => contribution.group === "appearance").length;
  const strongestSimilarities = included
    .filter((contribution) => contribution.normalizedDistance <= 0.25)
    .sort((first, second) => second.effectiveWeight - first.effectiveWeight)
    .slice(0, 3)
    .map((contribution) => `${String(contribution.featureID)} is close to the catalog record.`);
  const largestDifferences = included
    .filter((contribution) => contribution.normalizedDistance >= 0.45)
    .sort((first, second) => second.normalizedDistance - first.normalizedDistance)
    .slice(0, 3)
    .map((contribution) => `${String(contribution.featureID)} differs from the catalog record.`);
  const uncertaintyNotes = contributions
    .filter((contribution) => !contribution.included)
    .map((contribution) => `${String(contribution.featureID)} was not used: ${contribution.reason}`);
  if (evidenceCoverage < 0.75) uncertaintyNotes.push("Overall confidence is reduced because reliable feature evidence is incomplete.");
  if (averageReliability < 0.75) uncertaintyNotes.push("Overall confidence is reduced because profile or catalog measurement confidence is incomplete.");
  if (geometryIncluded === 0) uncertaintyNotes.push("No reliable geometry measurements were available for this catalog option.");
  if (appearanceIncluded === 0) uncertaintyNotes.push("Appearance selection was not used because catalog annotations or user-confirmed attributes were incomplete.");

  return {
    summary: `${scoreLabel} ${item.stableInternalID} scored ${score}/100. This is a relative game-option score, not biometric identification.`,
    strongestSimilarities: strongestSimilarities.length > 0 ? strongestSimilarities : ["No strong similarity feature crossed the current threshold."],
    largestDifferences: largestDifferences.length > 0 ? largestDifferences : ["No large feature differences crossed the current threshold."],
    uncertaintyNotes
  };
}

function assignRanksAndTies(matches: GameAppearanceMatch[]) {
  let currentTieGroup = 0;
  return matches.map((match, index) => {
    const previous = matches[index - 1];
    const isTie = previous ? Math.abs(previous.score - match.score) <= nearTieScoreDelta : false;
    if (!isTie) currentTieGroup += 1;
    return {
      ...match,
      rank: index + 1,
      tieGroup: currentTieGroup,
      explanation: isTie
        ? {
            ...match.explanation,
            uncertaintyNotes: [...match.explanation.uncertaintyNotes, "This result is tied with the neighboring catalog option at current precision."]
          }
        : match.explanation
    };
  });
}

function compareMatches(first: GameAppearanceMatch, second: GameAppearanceMatch) {
  if (second.score !== first.score) return second.score - first.score;
  if (second.confidence.score !== first.confidence.score) return second.confidence.score - first.confidence.score;
  return first.catalogItem.stableInternalID.localeCompare(second.catalogItem.stableInternalID);
}

function getGeometryMissingReason(input: {
  feature: MatchingFeatureConfig;
  profileEvidence: MatchFeatureEvidence;
  catalogEvidence: MatchFeatureEvidence;
  profileMeasurement: StandardFaceProfile["geometry"]["measurements"][StandardFacialMeasurementID] | undefined;
  reliability: number;
}) {
  if (input.profileEvidence.availabilityState === "pending") return "Profile measurement pending; feature was not used.";
  if (input.profileEvidence.availabilityState !== "available" || input.profileEvidence.value === null) return "Profile measurement unavailable.";
  if (input.profileEvidence.supportingFrameCount <= 0) return "Profile measurement has no supporting frames.";
  if (input.profileEvidence.occlusionState === "significant") return "Profile measurement blocked by significant occlusion.";
  if (input.feature.group === "profileProjection" && !hasProfilePoseEvidence(input.profileMeasurement)) {
    return "Profile side-view evidence unavailable for this projection feature.";
  }
  if (input.catalogEvidence.availabilityState === "pending") return "Catalog measurement pending; feature was not used.";
  if (input.catalogEvidence.availabilityState !== "available" || input.catalogEvidence.value === null) return "Catalog measurement unavailable or not yet annotated.";
  if (input.catalogEvidence.supportingFrameCount <= 0) return "Catalog measurement has no supporting frames.";
  if (input.catalogEvidence.occlusionState === "significant") return "Catalog measurement blocked by significant occlusion.";
  if (input.reliability < lowConfidenceThreshold) return "Feature confidence below matching threshold.";
  return null;
}

function profileMeasurementEvidence(measurement: StandardFaceProfile["geometry"]["measurements"][StandardFacialMeasurementID] | undefined): MatchFeatureEvidence {
  return {
    value: measurement?.availabilityState === "available" ? measurement.value : null,
    confidence: measurement?.confidence ?? confidenceFromScore(0),
    supportingFrameCount: measurement?.supportingFrameCount ?? 0,
    variance: measurement?.variance ?? null,
    depthSupported: measurement?.depthSupported ?? false,
    availabilityState: measurement?.availabilityState ?? "unavailable",
    occlusionState: measurement?.occlusionStatus ?? "unknown"
  };
}

function catalogMeasurementEvidence(measurement: number | CatalogFacialMeasurement | undefined): MatchFeatureEvidence {
  if (typeof measurement === "number") {
    return {
      value: measurement,
      confidence: confidenceFromScore(1),
      supportingFrameCount: 1,
      variance: null,
      depthSupported: false,
      availabilityState: "available",
      occlusionState: "unknown"
    };
  }
  return {
    value: measurement?.availabilityState === "available" ? measurement.value : null,
    confidence: confidenceFromScore(measurement?.availabilityState === "available" ? measurement.confidence : 0),
    supportingFrameCount: measurement?.supportingFrameCount ?? 0,
    variance: measurement?.variance ?? null,
    depthSupported: measurement?.depthSupported ?? false,
    availabilityState: measurement?.availabilityState ?? "unavailable",
    occlusionState: measurement?.occlusionStatus ?? "unknown"
  };
}

function appearanceProfileEvidence(attribute: AppearanceAttribute | undefined): MatchFeatureEvidence {
  const available = Boolean(attribute && attribute.value !== null && attribute.value !== "" && attribute.value !== "unspecified");
  return {
    value: attribute?.value ?? null,
    confidence: attribute?.confidence ?? confidenceFromScore(0),
    supportingFrameCount: available && attribute?.userConfirmed ? 1 : 0,
    variance: null,
    depthSupported: false,
    availabilityState: available ? "available" : "unavailable",
    occlusionState: "notApplicable"
  };
}

function appearanceCatalogEvidence(value: string | null): MatchFeatureEvidence {
  const available = value !== null && value !== "";
  return {
    value,
    confidence: confidenceFromScore(available ? 1 : 0),
    supportingFrameCount: available ? 1 : 0,
    variance: null,
    depthSupported: false,
    availabilityState: available ? "available" : "unavailable",
    occlusionState: "notApplicable"
  };
}

function adjustedGeometryReliability(
  profileMeasurement: StandardFaceProfile["geometry"]["measurements"][StandardFacialMeasurementID] | undefined,
  catalogMeasurement: number | CatalogFacialMeasurement | undefined,
  baseReliability: number
) {
  return round(baseReliability * profileMeasurementQualityMultiplier(profileMeasurement) * catalogMeasurementQualityMultiplier(catalogMeasurement));
}

function profileMeasurementQualityMultiplier(measurement: StandardFaceProfile["geometry"]["measurements"][StandardFacialMeasurementID] | undefined) {
  if (!measurement) return 0;
  return occlusionMultiplier(measurement.occlusionStatus, measurement.occlusionImpact) * varianceMultiplier(measurement.variance);
}

function catalogMeasurementQualityMultiplier(measurement: number | CatalogFacialMeasurement | undefined) {
  if (typeof measurement === "number") return 1;
  if (!measurement) return 0;
  return occlusionMultiplier(measurement.occlusionStatus, undefined) * varianceMultiplier(measurement.variance);
}

function occlusionMultiplier(
  occlusionStatus: MatchFeatureEvidence["occlusionState"],
  occlusionImpact?: FacialMeasurement["occlusionImpact"]
) {
  if (occlusionStatus === "significant" || occlusionImpact === "significant") return 0;
  if (occlusionStatus === "partial" || occlusionImpact === "moderate") return 0.6;
  if (occlusionStatus === "unknown" || occlusionImpact === "unknown") return 0.85;
  return 1;
}

function varianceMultiplier(variance: number | null | undefined) {
  if (variance === null || variance === undefined) return 1;
  if (variance <= 0.02) return 1;
  if (variance <= 0.06) return 0.85;
  return 0.65;
}

function hasProfilePoseEvidence(measurement: StandardFaceProfile["geometry"]["measurements"][StandardFacialMeasurementID] | undefined) {
  return Boolean(measurement?.supportingPoses.some((pose) => pose === "leftProfile" || pose === "rightProfile"));
}

function hasVerifiedMenuInstructions(item: GameCatalogItem, allowTestFixtures: boolean) {
  return (
    item.verificationState === "verified" &&
    hasAllowedSourceType(item, allowTestFixtures) &&
    (item.navigationInstructions ?? []).length > 0 &&
    (item.navigationInstructions ?? []).every((instruction) => instruction.instruction.trim().length > 0 && instruction.evidenceAssetID.trim().length > 0)
  );
}

function isMatchableCatalogItem(item: GameCatalogItem, catalog: GameCatalogManifest, allowTestFixtures: boolean) {
  if (item.verificationState !== "verified") return false;
  if (!hasAllowedSourceType(item, allowTestFixtures)) return false;
  if (allowTestFixtures) return true;
  if (!classifyCatalogRecord(item).productionAccessAllowed) return false;
  if (item.catalogVersion.identifier !== catalog.catalogVersion.identifier) return false;
  if (item.catalogVersion.gameVersion !== catalog.catalogVersion.gameVersion) return false;
  if (item.catalogVersion.platform !== catalog.catalogVersion.platform) return false;
  if (item.gameVersion !== catalog.catalogVersion.gameVersion) return false;
  if (item.platform !== catalog.catalogVersion.platform) return false;
  return true;
}

function hasAllowedSourceType(item: GameCatalogItem, allowTestFixtures: boolean) {
  if (allowTestFixtures) return item.sourceType === "testFixture" && item.isTestFixture;
  return item.sourceType === "production" && !item.isTestFixture;
}

function canMatchCatalog(catalog: GameCatalogManifest, allowTestFixtures: boolean, requireApprovedProductionRelease: boolean) {
  if (allowTestFixtures) return catalog.sourceType === "testFixture" && !catalog.isProduction;
  if (catalog.sourceType !== "production" || !catalog.isProduction) return false;
  if (!requireApprovedProductionRelease) return true;
  if (!catalog.catalogVersion.gameVersion.trim() || !catalog.catalogVersion.platform.trim()) return false;
  return (
    catalog.releaseStatus === "approvedRelease" &&
    Boolean(catalog.packageChecksum) &&
    Boolean(catalog.catalogVersion.verifiedAt) &&
    catalog.items.length > 0
  );
}

function findAttribute(attributes: AppearanceAttribute[], category: UserConfirmedAttributeCategory) {
  return attributes.find((attribute) => attribute.category === category);
}

function firstAnnotationEntry(item: GameCatalogItem, keys: string[]) {
  for (const key of keys) {
    const value = item.humanAnnotations[key];
    if (isUsableAppearanceValue(value)) return { key, value: String(value).trim() };
  }
  return null;
}

function isUsableAppearanceValue(value: unknown): value is string | number | boolean {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 && normalized !== "unspecified" && normalized !== "unknown" && normalized !== "n/a";
}

function classifyAppearanceRecommendation(
  definition: AppearanceRecommendationDefinition,
  userConfirmedValues: Partial<Record<UserConfirmedAttributeCategory, UserConfirmedAttributeValue>>,
  item: GameCatalogItem
) {
  let compared = 0;
  for (const category of definition.userAttributeCategories) {
    const userValue = userConfirmedValues[category];
    const catalogValue = item.humanAnnotations[category];
    if (!isUsableAppearanceValue(userValue) || !isUsableAppearanceValue(catalogValue)) continue;
    compared += 1;
    if (normalizeAppearanceValue(userValue) !== normalizeAppearanceValue(catalogValue)) return "mismatch";
  }
  return compared > 0 ? "match" : "unclassified";
}

function normalizeAppearanceValue(value: string | number | boolean) {
  return String(value).trim().toLowerCase();
}

function preferenceForGroup(group: MatchingFeatureConfig["group"] | "hair" | "facialHair" | "desiredAthletePhysique", preferences?: MatchingPreferences) {
  const overall = preferences?.overallResemblance ?? 1;
  const specific =
    group === "profileProjection"
      ? preferences?.faceAndJawShape
      : group === "faceAndJawShape"
      ? preferences?.faceAndJawShape
      : group === "eyesAndEyebrows"
        ? preferences?.eyesAndEyebrows
        : group === "nose"
          ? preferences?.nose
          : group === "mouth"
            ? preferences?.mouth
            : group === "hair"
              ? preferences?.hair
              : group === "facialHair"
                ? preferences?.facialHair
                : preferences?.desiredAthletePhysique;
  return Math.max(0, overall) * Math.max(0, specific ?? 1);
}

function confidenceFromScore(score: number): MeasurementConfidence {
  if (score >= 0.75) return { score, label: "high" };
  if (score >= 0.45) return { score, label: "medium" };
  if (score > 0) return { score, label: "low" };
  return { score, label: "unavailable" };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
