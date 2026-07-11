import type {
  AppearanceAttribute,
  CatalogFacialMeasurement,
  GameAppearanceMatch,
  GameCatalogItem,
  GameCatalogManifest,
  MatchFeatureContribution,
  MeasurementConfidence,
  StandardFaceProfile,
  StandardFacialMeasurementID,
  UserConfirmedAttributeCategory
} from "@/types/domain";

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
  group: "faceAndJawShape" | "eyesAndEyebrows" | "nose" | "mouth";
  weight: number;
  maxDistance: number;
}

const scoreLabel = "Match score based on the game’s available appearance options.";
const lowConfidenceThreshold = 0.25;

export const defaultGeometryFeatureConfig: MatchingFeatureConfig[] = [
  { id: "faceWidthRatio", group: "faceAndJawShape", weight: 0.16, maxDistance: 0.35 },
  { id: "faceLengthRatio", group: "faceAndJawShape", weight: 0.1, maxDistance: 0.35 },
  { id: "foreheadWidthRatio", group: "faceAndJawShape", weight: 0.08, maxDistance: 0.3 },
  { id: "jawWidthRatio", group: "faceAndJawShape", weight: 0.15, maxDistance: 0.3 },
  { id: "chinWidthRatio", group: "faceAndJawShape", weight: 0.08, maxDistance: 0.3 },
  { id: "eyeSpacingRatio", group: "eyesAndEyebrows", weight: 0.12, maxDistance: 0.22 },
  { id: "noseWidthRatio", group: "nose", weight: 0.12, maxDistance: 0.22 },
  { id: "noseLengthRatio", group: "nose", weight: 0.08, maxDistance: 0.24 },
  { id: "mouthWidthRatio", group: "mouth", weight: 0.07, maxDistance: 0.26 },
  { id: "lowerFaceRatio", group: "faceAndJawShape", weight: 0.04, maxDistance: 0.22 }
];

const appearanceConfigs: Array<{
  category: UserConfirmedAttributeCategory;
  group: "hair" | "facialHair" | "desiredAthletePhysique";
  weight: number;
  annotationKeys: string[];
}> = [
  { category: "hairColorFamily", group: "hair", weight: 0.04, annotationKeys: ["hairColorFamily"] },
  { category: "hairTextureFamily", group: "hair", weight: 0.03, annotationKeys: ["hairTextureFamily"] },
  { category: "hairstyleFamily", group: "hair", weight: 0.04, annotationKeys: ["hairstyleFamily"] },
  { category: "facialHairPresence", group: "facialHair", weight: 0.04, annotationKeys: ["facialHairPresence"] },
  { category: "facialHairStyleFamily", group: "facialHair", weight: 0.03, annotationKeys: ["facialHairStyleFamily"] },
  { category: "preferredBodyType", group: "desiredAthletePhysique", weight: 0.03, annotationKeys: ["preferredBodyType"] }
];

export function createRuleBasedMatchingEngine(config: MatchingFeatureConfig[] = defaultGeometryFeatureConfig): MatchingEngine {
  return {
    modelVersion: "rule-based-web-mvp-v1",
    matchTopThree(input) {
      const candidates = input.catalog.items
        .filter((item) => item.verificationState === "verified" && (input.allowTestFixtures || !item.isTestFixture))
        .map((item) => scoreCatalogItem({ profile: input.profile, item, catalog: input.catalog, config, preferences: input.preferences, modelVersion: this.modelVersion }))
        .sort(compareMatches);
      return assignRanksAndTies(candidates).slice(0, input.limit ?? 3);
    }
  };
}

function scoreCatalogItem(input: {
  profile: StandardFaceProfile;
  item: GameCatalogItem;
  catalog: GameCatalogManifest;
  config: MatchingFeatureConfig[];
  preferences?: MatchingPreferences;
  modelVersion: string;
}): GameAppearanceMatch {
  const contributions = [
    ...input.config.map((feature) => scoreGeometryFeature(input.profile, input.item, feature, input.preferences)),
    ...appearanceConfigs.map((feature) => scoreAppearanceFeature(input.profile, input.item, feature, input.preferences))
  ];
  const included = contributions.filter((contribution) => contribution.included && contribution.effectiveWeight > 0);
  const effectiveWeightTotal = included.reduce((total, contribution) => total + contribution.effectiveWeight, 0);
  const availableWeightTotal = contributions.reduce((total, contribution) => total + contribution.effectiveWeight, 0);
  const weightedDistance =
    effectiveWeightTotal > 0 ? included.reduce((total, contribution) => total + contribution.normalizedDistance * contribution.effectiveWeight, 0) / effectiveWeightTotal : 1;
  const evidenceCoverage = calculateEvidenceCoverage(contributions, input.preferences);
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
    explanation: buildExplanation(input.item, score, contributions, evidenceCoverage),
    catalogVersion: input.item.catalogVersion ?? input.catalog.catalogVersion,
    modelVersion: input.modelVersion,
    featureContributions: contributions
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
  const catalogValue = readCatalogMeasurementValue(catalogMeasurement);
  const profileValue = profileMeasurement?.value ?? null;
  const reliability = Math.min(profileMeasurement?.confidence.score ?? 0, readCatalogMeasurementConfidence(catalogMeasurement));
  const preferenceMultiplier = preferenceForGroup(feature.group, preferences);
  const effectiveWeight = feature.weight * preferenceMultiplier * Math.max(reliability, 0);
  const missingReason = getGeometryMissingReason(profileValue, catalogValue, reliability);
  if (missingReason) {
    return {
      featureID: feature.id,
      group: "geometry",
      profileValue,
      catalogValue,
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
    included: true,
    reason: "Reliable geometry feature included."
  };
}

function scoreAppearanceFeature(
  profile: StandardFaceProfile,
  item: GameCatalogItem,
  feature: (typeof appearanceConfigs)[number],
  preferences?: MatchingPreferences
): MatchFeatureContribution {
  const profileAttribute = findAttribute(profile.appearance.attributes, feature.category);
  const catalogValue = feature.annotationKeys.map((key) => item.humanAnnotations[key]).find((value) => value !== undefined) ?? null;
  const profileValue = profileAttribute?.value ?? null;
  const reliability = profileAttribute?.userConfirmed ? 1 : 0;
  const preferenceMultiplier = preferenceForGroup(feature.group, preferences);
  if (profileValue === null || profileValue === "" || profileValue === "unspecified" || catalogValue === null) {
    return {
      featureID: feature.category,
      group: "appearance",
      profileValue,
      catalogValue,
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

function calculateEvidenceCoverage(contributions: MatchFeatureContribution[], preferences?: MatchingPreferences) {
  const intendedTotal = contributions.reduce((total, contribution) => total + baseIntendedWeight(contribution, preferences), 0);
  const includedTotal = contributions.filter((contribution) => contribution.included).reduce((total, contribution) => total + baseIntendedWeight(contribution, preferences), 0);
  return intendedTotal > 0 ? includedTotal / intendedTotal : 0;
}

function baseIntendedWeight(contribution: MatchFeatureContribution, preferences?: MatchingPreferences) {
  const geometryConfig = defaultGeometryFeatureConfig.find((feature) => feature.id === contribution.featureID);
  if (geometryConfig) return geometryConfig.weight * preferenceForGroup(geometryConfig.group, preferences);
  const appearanceConfig = appearanceConfigs.find((feature) => feature.category === contribution.featureID);
  return appearanceConfig ? appearanceConfig.weight * preferenceForGroup(appearanceConfig.group, preferences) : 0;
}

function buildExplanation(item: GameCatalogItem, score: number, contributions: MatchFeatureContribution[], evidenceCoverage: number) {
  const included = contributions.filter((contribution) => contribution.included);
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
    .slice(0, 4)
    .map((contribution) => `${String(contribution.featureID)} was not used: ${contribution.reason}`);
  if (evidenceCoverage < 0.75) uncertaintyNotes.push("Overall confidence is reduced because reliable feature evidence is incomplete.");

  return {
    summary: `${scoreLabel} ${item.stableInternalID} scored ${score}/100.`,
    strongestSimilarities: strongestSimilarities.length > 0 ? strongestSimilarities : ["No strong similarity feature crossed the current threshold."],
    largestDifferences: largestDifferences.length > 0 ? largestDifferences : ["No large feature differences crossed the current threshold."],
    uncertaintyNotes
  };
}

function assignRanksAndTies(matches: GameAppearanceMatch[]) {
  let currentTieGroup = 0;
  return matches.map((match, index) => {
    const previous = matches[index - 1];
    const isTie = previous ? Math.abs(previous.score - match.score) < 0.001 : false;
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

function getGeometryMissingReason(profileValue: number | null, catalogValue: number | null, reliability: number) {
  if (profileValue === null) return "Profile measurement unavailable.";
  if (catalogValue === null) return "Catalog measurement unavailable.";
  if (reliability < lowConfidenceThreshold) return "Feature confidence below matching threshold.";
  return null;
}

function readCatalogMeasurementValue(measurement: number | CatalogFacialMeasurement | undefined) {
  if (typeof measurement === "number") return measurement;
  return measurement?.availabilityState === "available" ? measurement.value : null;
}

function readCatalogMeasurementConfidence(measurement: number | CatalogFacialMeasurement | undefined) {
  if (typeof measurement === "number") return 1;
  return measurement?.availabilityState === "available" ? measurement.confidence : 0;
}

function findAttribute(attributes: AppearanceAttribute[], category: UserConfirmedAttributeCategory) {
  return attributes.find((attribute) => attribute.category === category);
}

function preferenceForGroup(group: MatchingFeatureConfig["group"] | "hair" | "facialHair" | "desiredAthletePhysique", preferences?: MatchingPreferences) {
  const overall = preferences?.overallResemblance ?? 1;
  const specific =
    group === "faceAndJawShape"
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
