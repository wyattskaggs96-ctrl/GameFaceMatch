import type { ConsentState } from "@/lib/privacy/consent";
import { isConsentGranted } from "@/lib/privacy/consent";
import type { BuildInstruction, GameAppearanceMatch, MeasurementConfidence, RefinementAction, RefinementResult, StandardFaceProfile } from "@/types/domain";
import type { SupportedGameID } from "@/lib/adapters/game-registry";

export const SELF_IMPROVING_FEEDBACK_LOOP_VERSION = "self-improving-feedback-loop-v1";
export const DEFAULT_BUILD_MATCH_PASSING_SCORE = 90;
export const GLOBAL_LEARNING_REVIEW_MODEL_VERSION = "global-learning-review-queue-v1";
export const DAY1_BUILD_MATCH_SCORE_CONFIG = {
  schemaVersion: "build-match-score-config-v1",
  configID: "day-1-build-match-threshold-v1",
  buildPassThreshold: DEFAULT_BUILD_MATCH_PASSING_SCORE,
  scoreRange: { min: 0, max: 100 },
  customerFacingLabel: "Build match: {score}/100 based on the appearance options available in this game.",
  interpretation:
    "A score at or above the threshold passes the configured build-match target; it is not identity probability, scientific certainty, or a first-attempt guarantee."
} as const;

export type BuildMatchStatus = "passed" | "needsRefinement" | "blocked";
export type FeedbackLoopStage =
  | "profileCreated"
  | "recommendationsGenerated"
  | "buildInstructionsShown"
  | "screenshotsCompared"
  | "finalSettingsConfirmed"
  | "personalPreferencesUpdated"
  | "globalLearningQueued";
export type GlobalLearningCandidateStatus =
  | "notConsented"
  | "queuedForHumanReview"
  | "validationRequired"
  | "approvedForNextVersion"
  | "rejected"
  | "rolledBack";

export interface BuildMatchScoreConfig {
  passingScore?: number;
  buildPassThreshold?: number;
}

export interface BuildMatchScore {
  score: number | null;
  passingScore: number;
  status: BuildMatchStatus;
  confidence: MeasurementConfidence;
  comparedFeatureCount: number;
  reasons: string[];
  differences: string[];
  limitations: string[];
  source: "screenshotProfileComparison" | "candidateScreenshotComparison" | "unavailable";
  scoreLabel: "Build-match score based on local appearance-geometry comparison, not identity probability.";
}

export interface VerifiedBuildSetting {
  instructionID: string;
  catalogItemID: string;
  instructionKind: BuildInstruction["instructionKind"];
  menuCategory: string;
  verifiedGameLabel: string;
  navigationPath: string[];
  finalValue: string;
  source: "buildInstruction" | "userConfirmedOverride";
}

export interface FinalConfirmedSettings {
  schemaVersion: "final-confirmed-settings-v1";
  confirmedAt: string;
  gameID: SupportedGameID;
  profileID: string;
  catalogVersionID: string | null;
  winningMatchID: string;
  winningCatalogItemID: string;
  userAcceptedRank: number;
  settings: VerifiedBuildSetting[];
  userNotes: string | null;
}

export interface PersonalRecommendationPreference {
  schemaVersion: "personal-recommendation-preference-v1";
  profileID: string;
  gameID: SupportedGameID;
  preferredCatalogItemID: string;
  preferredRank: number;
  buildMatchScore: number | null;
  reinforcedSettings: VerifiedBuildSetting[];
  updatedAt: string;
  appliesOnlyToSameUserProfile: true;
}

export interface GlobalLearningReviewCandidate {
  schemaVersion: "global-learning-review-candidate-v1";
  candidateID: string;
  status: GlobalLearningCandidateStatus;
  createdAt: string;
  consentVersion: string | null;
  gameID: SupportedGameID;
  catalogVersionID: string | null;
  matcherModelVersion: string | null;
  feedbackLoopVersion: typeof SELF_IMPROVING_FEEDBACK_LOOP_VERSION;
  reviewModelVersion: typeof GLOBAL_LEARNING_REVIEW_MODEL_VERSION;
  scoreBand: "90-100" | "80-89" | "70-79" | "60-69" | "0-59" | "unavailable";
  acceptedRank: 1 | 2 | 3 | null;
  recommendationCount: number;
  actionTypeIDs: string[];
  affectedVerifiedControlKinds: BuildInstruction["instructionKind"][];
  rawMediaIncluded: false;
  exactMeasurementsIncluded: false;
  identityDataIncluded: false;
  requiresHumanApproval: true;
  requiresValidationStudy: true;
  requiresVersionedRollbackPlan: true;
  notes: string[];
}

export interface FeedbackLoopResult {
  schemaVersion: "gameface-feedback-loop-result-v1";
  loopVersion: typeof SELF_IMPROVING_FEEDBACK_LOOP_VERSION;
  gameID: SupportedGameID;
  stagesCompleted: FeedbackLoopStage[];
  profileID: string;
  recommendationIDs: string[];
  buildInstructions: BuildInstruction[];
  buildMatchScore: BuildMatchScore;
  recommendedRefinements: RefinementAction[];
  finalConfirmedSettings: FinalConfirmedSettings | null;
  personalPreference: PersonalRecommendationPreference | null;
  globalLearningCandidate: GlobalLearningReviewCandidate;
  rawMediaStored: false;
  automaticRetrainingStarted: false;
  limitations: string[];
}

export interface FeedbackLoopInput {
  gameID: SupportedGameID;
  profile: StandardFaceProfile;
  recommendations: GameAppearanceMatch[];
  buildInstructions: BuildInstruction[];
  refinementResult: RefinementResult | null;
  selectedFinalMatch?: GameAppearanceMatch | null;
  userConfirmedSettings?: Array<Partial<VerifiedBuildSetting> & { instructionID: string; finalValue: string }>;
  userNotes?: string | null;
  consentState: ConsentState;
  now?: Date;
  scoreConfig?: BuildMatchScoreConfig;
}

export function completeSelfImprovingFeedbackLoop(input: FeedbackLoopInput): FeedbackLoopResult {
  const now = input.now ?? new Date();
  const timestamp = now.toISOString();
  const recommendations = sortedTopThree(input.recommendations);
  const selectedFinalMatch = input.selectedFinalMatch ?? recommendations[0] ?? null;
  const buildMatchScore = calculateBuildMatchScore(input.refinementResult, input.scoreConfig);
  const recommendedRefinements = buildMatchScore.status === "needsRefinement" ? getVerifiedRefinementActions(input.refinementResult) : [];
  const finalConfirmedSettings = selectedFinalMatch
    ? createFinalConfirmedSettings({
        gameID: input.gameID,
        profile: input.profile,
        match: selectedFinalMatch,
        buildInstructions: input.buildInstructions,
        userConfirmedSettings: input.userConfirmedSettings ?? [],
        userNotes: input.userNotes ?? null,
        confirmedAt: timestamp
      })
    : null;
  const personalPreference =
    finalConfirmedSettings && buildMatchScore.status !== "blocked"
      ? createPersonalRecommendationPreference({
          finalSettings: finalConfirmedSettings,
          buildMatchScore,
          updatedAt: timestamp
        })
      : null;
  const globalLearningCandidate = createGlobalLearningCandidate({
    gameID: input.gameID,
    profileID: input.profile.id,
    recommendations,
    selectedFinalMatch,
    refinementResult: input.refinementResult,
    buildMatchScore,
    consentState: input.consentState,
    createdAt: timestamp
  });

  return {
    schemaVersion: "gameface-feedback-loop-result-v1",
    loopVersion: SELF_IMPROVING_FEEDBACK_LOOP_VERSION,
    gameID: input.gameID,
    stagesCompleted: completedStages({
      recommendations,
      buildInstructions: input.buildInstructions,
      refinementResult: input.refinementResult,
      finalConfirmedSettings,
      personalPreference,
      globalLearningCandidate
    }),
    profileID: input.profile.id,
    recommendationIDs: recommendations.map((match) => match.id),
    buildInstructions: input.buildInstructions,
    buildMatchScore,
    recommendedRefinements,
    finalConfirmedSettings,
    personalPreference,
    globalLearningCandidate,
    rawMediaStored: false,
    automaticRetrainingStarted: false,
    limitations: [
      "The build-match score is a local appearance-geometry refinement score, not identity probability.",
      "Global learning candidates require human approval, validation, versioning, monitoring, and rollback before any matcher change.",
      "Raw face photos, raw screenshots, landmark payloads, and exact facial measurements are not included."
    ]
  };
}

export function calculateBuildMatchScore(refinementResult: RefinementResult | null, config: BuildMatchScoreConfig = {}): BuildMatchScore {
  const passingScore = config.buildPassThreshold ?? config.passingScore ?? DAY1_BUILD_MATCH_SCORE_CONFIG.buildPassThreshold;
  const comparison = refinementResult?.comparisonReport;
  const profileComparison = comparison?.originalProfileComparison;
  const currentRecommendation = comparison?.currentRecommendation;
  const source = profileComparison ? "screenshotProfileComparison" : currentRecommendation ? "candidateScreenshotComparison" : "unavailable";
  const score = profileComparison?.screenshotClosenessScore ?? currentRecommendation?.screenshotClosenessScore ?? null;
  if (typeof score !== "number") {
    return {
      score: null,
      passingScore,
      status: "blocked",
      confidence: unavailableConfidence(),
      comparedFeatureCount: 0,
      reasons: [],
      differences: ["No usable screenshot/profile comparison exists yet."],
      limitations: ["Upload usable confirmation screenshots before scoring a created build."],
      source,
      scoreLabel: "Build-match score based on local appearance-geometry comparison, not identity probability."
    };
  }
  const confidence = profileComparison?.confidence ?? currentRecommendation?.confidence ?? unavailableConfidence();
  return {
    score: clampScore(score),
    passingScore,
    status: score >= passingScore ? "passed" : "needsRefinement",
    confidence,
    comparedFeatureCount: profileComparison?.comparedFeatureCount ?? currentRecommendation?.comparedFeatureCount ?? 0,
    reasons: profileComparison?.reasons ?? currentRecommendation?.reasons ?? [],
    differences: profileComparison?.differences ?? currentRecommendation?.differences ?? [],
    limitations: profileComparison?.limitations ?? comparison?.limitations ?? [],
    source,
    scoreLabel: "Build-match score based on local appearance-geometry comparison, not identity probability."
  };
}

export function getVerifiedRefinementActions(refinementResult: RefinementResult | null): RefinementAction[] {
  return (refinementResult?.actions ?? []).filter((action) => action.requiresVerifiedCatalog && action.relatedCatalogItemID);
}

export function createFinalConfirmedSettings(input: {
  gameID: SupportedGameID;
  profile: StandardFaceProfile;
  match: GameAppearanceMatch;
  buildInstructions: BuildInstruction[];
  userConfirmedSettings: Array<Partial<VerifiedBuildSetting> & { instructionID: string; finalValue: string }>;
  userNotes: string | null;
  confirmedAt: string;
}): FinalConfirmedSettings {
  const instructionSettings = input.buildInstructions
    .filter((instruction) => instruction.relatedCatalogItemID && instruction.verifiedGameLabel)
    .map((instruction) => ({
      instructionID: instruction.id,
      catalogItemID: instruction.relatedCatalogItemID ?? input.match.catalogItem.stableInternalID,
      instructionKind: instruction.instructionKind,
      menuCategory: instruction.menuCategory,
      verifiedGameLabel: instruction.verifiedGameLabel,
      navigationPath: instruction.navigationPath,
      finalValue: instruction.verifiedGameLabel,
      source: "buildInstruction" as const
    }));
  const overrides = input.userConfirmedSettings.flatMap((override): VerifiedBuildSetting[] => {
    const base = instructionSettings.find((setting) => setting.instructionID === override.instructionID);
    if (!base || !override.finalValue.trim()) return [];
    return [
      {
        ...base,
        finalValue: override.finalValue.trim(),
        source: "userConfirmedOverride"
      }
    ];
  });
  const overrideIDs = new Set(overrides.map((override) => override.instructionID));
  const settings = [...instructionSettings.filter((setting) => !overrideIDs.has(setting.instructionID)), ...overrides].sort((first, second) =>
    first.instructionID.localeCompare(second.instructionID)
  );
  return {
    schemaVersion: "final-confirmed-settings-v1",
    confirmedAt: input.confirmedAt,
    gameID: input.gameID,
    profileID: input.profile.id,
    catalogVersionID: input.match.catalogVersion.identifier,
    winningMatchID: input.match.id,
    winningCatalogItemID: input.match.catalogItem.stableInternalID,
    userAcceptedRank: input.match.rank,
    settings,
    userNotes: scrubShortNote(input.userNotes)
  };
}

export function createPersonalRecommendationPreference(input: {
  finalSettings: FinalConfirmedSettings;
  buildMatchScore: BuildMatchScore;
  updatedAt: string;
}): PersonalRecommendationPreference {
  return {
    schemaVersion: "personal-recommendation-preference-v1",
    profileID: input.finalSettings.profileID,
    gameID: input.finalSettings.gameID,
    preferredCatalogItemID: input.finalSettings.winningCatalogItemID,
    preferredRank: input.finalSettings.userAcceptedRank,
    buildMatchScore: input.buildMatchScore.score,
    reinforcedSettings: input.finalSettings.settings,
    updatedAt: input.updatedAt,
    appliesOnlyToSameUserProfile: true
  };
}

export function createGlobalLearningCandidate(input: {
  gameID: SupportedGameID;
  profileID: string;
  recommendations: GameAppearanceMatch[];
  selectedFinalMatch: GameAppearanceMatch | null;
  refinementResult: RefinementResult | null;
  buildMatchScore: BuildMatchScore;
  consentState: ConsentState;
  createdAt: string;
}): GlobalLearningReviewCandidate {
  const consented = isConsentGranted(input.consentState, "futureProductImprovement");
  const selectedRank = input.selectedFinalMatch?.rank;
  return {
    schemaVersion: "global-learning-review-candidate-v1",
    candidateID: `global-learning-${input.gameID}-${input.profileID}-${input.createdAt}`,
    status: consented ? "queuedForHumanReview" : "notConsented",
    createdAt: input.createdAt,
    consentVersion: consented ? input.consentState.futureProductImprovement.version : null,
    gameID: input.gameID,
    catalogVersionID: input.recommendations[0]?.catalogVersion.identifier ?? null,
    matcherModelVersion: input.recommendations[0]?.modelVersion ?? null,
    feedbackLoopVersion: SELF_IMPROVING_FEEDBACK_LOOP_VERSION,
    reviewModelVersion: GLOBAL_LEARNING_REVIEW_MODEL_VERSION,
    scoreBand: scoreBand(input.buildMatchScore.score),
    acceptedRank: selectedRank === 1 || selectedRank === 2 || selectedRank === 3 ? selectedRank : null,
    recommendationCount: Math.min(input.recommendations.length, 3),
    actionTypeIDs: getVerifiedRefinementActions(input.refinementResult).map((action) => action.type),
    affectedVerifiedControlKinds: Array.from(new Set((input.refinementResult?.actions ?? []).flatMap(actionToInstructionKinds))),
    rawMediaIncluded: false,
    exactMeasurementsIncluded: false,
    identityDataIncluded: false,
    requiresHumanApproval: true,
    requiresValidationStudy: true,
    requiresVersionedRollbackPlan: true,
    notes: consented
      ? ["Consented derived outcome queued for human review; no automatic retraining is allowed."]
      : ["Future product-improvement consent is not granted or not available, so no global learning data may be used."]
  };
}

export function validateGlobalLearningApproval(input: {
  candidate: GlobalLearningReviewCandidate;
  validationStudyPassed: boolean;
  humanApproved: boolean;
  versionedChangeID: string | null;
  rollbackPlanID: string | null;
}) {
  const errors: string[] = [];
  if (input.candidate.status !== "queuedForHumanReview") errors.push("Candidate must be consented and queued for human review.");
  if (!input.validationStudyPassed) errors.push("A validation study must pass before global improvement adoption.");
  if (!input.humanApproved) errors.push("A human approver must approve the candidate improvement.");
  if (!input.versionedChangeID) errors.push("A versioned matcher/catalog change ID is required.");
  if (!input.rollbackPlanID) errors.push("A rollback plan ID is required.");
  if (input.candidate.rawMediaIncluded || input.candidate.exactMeasurementsIncluded || input.candidate.identityDataIncluded) {
    errors.push("Global learning candidates cannot include raw media, exact measurements, or identity data.");
  }
  return {
    ok: errors.length === 0,
    errors,
    nextStatus: errors.length === 0 ? ("approvedForNextVersion" as const) : ("validationRequired" as const)
  };
}

function completedStages(input: {
  recommendations: GameAppearanceMatch[];
  buildInstructions: BuildInstruction[];
  refinementResult: RefinementResult | null;
  finalConfirmedSettings: FinalConfirmedSettings | null;
  personalPreference: PersonalRecommendationPreference | null;
  globalLearningCandidate: GlobalLearningReviewCandidate;
}): FeedbackLoopStage[] {
  const stages: FeedbackLoopStage[] = ["profileCreated"];
  if (input.recommendations.length > 0) stages.push("recommendationsGenerated");
  if (input.buildInstructions.length > 0) stages.push("buildInstructionsShown");
  if (input.refinementResult?.comparisonReport) stages.push("screenshotsCompared");
  if (input.finalConfirmedSettings) stages.push("finalSettingsConfirmed");
  if (input.personalPreference) stages.push("personalPreferencesUpdated");
  if (input.globalLearningCandidate.status === "queuedForHumanReview") stages.push("globalLearningQueued");
  return stages;
}

function sortedTopThree(recommendations: GameAppearanceMatch[]) {
  return [...recommendations].sort((first, second) => first.rank - second.rank).slice(0, 3);
}

function actionToInstructionKinds(action: RefinementAction): BuildInstruction["instructionKind"][] {
  if (action.type === "changeVerifiedHairstyle") return ["hairstyle"];
  if (action.type === "changeVerifiedFacialHair") return ["facialHair"];
  if (action.type === "changeVerifiedControl") return ["otherVerifiedControl"];
  return [];
}

function scoreBand(score: number | null): GlobalLearningReviewCandidate["scoreBand"] {
  if (score === null) return "unavailable";
  if (score >= 90) return "90-100";
  if (score >= 80) return "80-89";
  if (score >= 70) return "70-79";
  if (score >= 60) return "60-69";
  return "0-59";
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scrubShortNote(note: string | null) {
  if (!note?.trim()) return null;
  return note.trim().slice(0, 240);
}

function unavailableConfidence(): MeasurementConfidence {
  return { score: 0, label: "unavailable" };
}
