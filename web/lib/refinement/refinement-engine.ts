import { approveCatalogRelease, type FeatureGateInput } from "@/lib/gates/feature-gates";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type {
  GameAppearanceMatch,
  GameCatalogManifest,
  MeasurementConfidence,
  RefinementCandidateComparison,
  RefinementAction,
  RefinementComparisonReport,
  RefinementFeedbackRecord,
  RefinementResult,
  StandardFacialMeasurementID,
  StandardFaceProfile
} from "@/types/domain";
import { defaultGeometryFeatureConfig } from "@/lib/matching/matching-engine";
import type { ScreenshotRefinementSession } from "./screenshot-refinement";
import type { ScreenshotNormalizedGeometryMeasurement, ScreenshotQualityAlignmentReport } from "./screenshot-quality-alignment";

export interface ScreenshotRefinementEngine {
  readonly engineVersion: typeof SCREENSHOT_REFINEMENT_ENGINE_VERSION;
  refine(input: ScreenshotRefinementEngineInput): RefinementResult;
}

export interface ScreenshotRefinementEngineInput {
  profile: StandardFaceProfile | null;
  session: ScreenshotRefinementSession;
  currentMatch?: GameAppearanceMatch | null;
  rankedMatches?: GameAppearanceMatch[];
  catalogManifest?: GameCatalogManifest | null;
  catalogGate?: FeatureGateInput;
  allowTestFixtures?: boolean;
  runtimeEnvironment?: "development" | "test" | "production";
  userFeedback?: RefinementUserFeedbackInput;
  feedbackConsent?: RefinementFeedbackConsent;
  now?: string;
}

export interface RefinementUserFeedbackInput {
  rating: RefinementFeedbackRecord["rating"];
  notes?: string | null;
}

export interface RefinementFeedbackConsent {
  consented: boolean;
  consentVersion: string;
}

export const SCREENSHOT_REFINEMENT_ENGINE_VERSION = "screenshot-refinement-engine-v2-local-comparison";

const unavailableMessage = "Screenshot refinement is unavailable until verified catalog data exists.";
const comparisonLimitations = [
  "Screenshot comparison uses local RGB landmarks and normalized ratios only.",
  "Cross-domain confidence is intentionally reduced because user photos and game screenshots are different image domains.",
  "Only verified catalog candidates can be suggested.",
  "Raw screenshot bytes are not stored by this engine."
];

export function createScreenshotRefinementEngine(): ScreenshotRefinementEngine {
  return {
    engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
    refine(input) {
      const catalogReadiness = evaluateRefinementCatalogReadiness(input);
      const feedbackRecord = createConsentedFeedbackRecord(input);
      if (!catalogReadiness.allowed) {
        return unavailableResult({
          reasons: catalogReadiness.reasons,
          feedbackRecord,
          catalogManifest: input.catalogManifest ?? input.catalogGate?.manifest ?? null
        });
      }

      const screenshots = input.session.slots.filter((slot) => slot.screenshot);
      if (screenshots.length === 0) {
        return {
          status: "invalidScreenshot",
          message: "Screenshot refinement needs at least one validated screenshot before it can evaluate changes.",
          suggestedMatches: [],
          engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
          catalogVersion: catalogReadiness.manifest.catalogVersion,
          feedbackRecord,
          unavailableReasons: ["No validated screenshot was provided."]
        };
      }
      const screenshotReadiness = evaluateScreenshotReadiness(input.session);
      if (!screenshotReadiness.valid) {
        return {
          status: "invalidScreenshot",
          message: "Screenshot refinement could not run because the uploaded screenshot needs recovery.",
          suggestedMatches: [],
          engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
          catalogVersion: catalogReadiness.manifest.catalogVersion,
          feedbackRecord,
          unavailableReasons: screenshotReadiness.reasons,
          comparisonReport: createBlockedComparisonReport(input, screenshotReadiness.reasons)
        };
      }

      const safeMatches = getVerifiedMatches(input.rankedMatches ?? [], catalogReadiness.fixtureMode);
      if (safeMatches.length === 0) {
        return unavailableResult({
          reasons: ["No verified candidate recommendations were supplied to the refinement engine."],
          feedbackRecord,
          catalogManifest: catalogReadiness.manifest
        });
      }

      const comparisonReport = compareScreenshotToMatches(input, safeMatches);
      if (!comparisonReport) {
        return {
          status: "invalidScreenshot",
          message: "Screenshot refinement could not run because local game-character landmark extraction did not produce comparable measurements.",
          suggestedMatches: [],
          engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
          catalogVersion: catalogReadiness.manifest.catalogVersion,
          feedbackRecord,
          unavailableReasons: [
            "No usable normalized screenshot measurements were available.",
            "Retake or replace the screenshot with the face visible, no helmet, no overlays, and steady menu lighting."
          ]
        };
      }
      const actions = buildRefinementActions(safeMatches, comparisonReport);
      const selectedAlternative = comparisonReport.candidateComparisons.find(
        (candidate) => candidate.rank !== 1 && candidate.screenshotClosenessScore > (comparisonReport.currentRecommendation?.screenshotClosenessScore ?? 0) + 2
      );
      return {
        status: selectedAlternative ? "tryAlternative" : "keepCurrent",
        message:
          catalogReadiness.fixtureMode
            ? "Synthetic fixture refinement actions were generated for tests only. They are not production recommendations."
            : selectedAlternative
              ? "Screenshot comparison suggests reviewing a verified alternate recommendation."
              : "Screenshot comparison supports keeping the current verified recommendation.",
        suggestedMatches: safeMatches.slice(0, 3),
        engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
        catalogVersion: catalogReadiness.manifest.catalogVersion,
        actions,
        comparisonReport,
        feedbackRecord
      };
    }
  };
}

export function evaluateRefinementCatalogReadiness(input: ScreenshotRefinementEngineInput):
  | { allowed: true; manifest: GameCatalogManifest; fixtureMode: boolean; reasons: string[] }
  | { allowed: false; manifest: GameCatalogManifest | null; fixtureMode: false; reasons: string[] } {
  const manifest = input.catalogManifest ?? input.catalogGate?.manifest ?? null;
  if (!manifest) {
    return { allowed: false, manifest: null, fixtureMode: false, reasons: ["Catalog manifest is not loaded."] };
  }

  if (input.allowTestFixtures) {
    if (input.runtimeEnvironment === "production") {
      return {
        allowed: false,
        manifest,
        fixtureMode: false,
        reasons: ["Test fixtures cannot enable screenshot refinement in production."]
      };
    }
    if (isFixtureCatalog(manifest)) {
      return { allowed: true, manifest, fixtureMode: true, reasons: ["Test fixture catalog accepted for non-production tests."] };
    }
    return {
      allowed: false,
      manifest,
      fixtureMode: false,
      reasons: ["Fixture mode requires a test-only catalog manifest and test-only catalog items."]
    };
  }

  const approval = approveCatalogRelease(input.catalogGate ?? { manifest });
  if (!approval.approvedRelease) {
    return {
      allowed: false,
      manifest,
      fixtureMode: false,
      reasons: [
        CATALOG_UNAVAILABLE_MESSAGE,
        ...approval.reasons,
        "Screenshot refinement requires the same approved production catalog gate as recommendations."
      ]
    };
  }
  return { allowed: true, manifest, fixtureMode: false, reasons: approval.reasons };
}

function buildRefinementActions(matches: GameAppearanceMatch[], comparisonReport: RefinementComparisonReport): RefinementAction[] {
  const current = matches.find((match) => match.rank === 1) ?? matches[0];
  const rankTwo = matches.find((match) => match.rank === 2);
  const rankThree = matches.find((match) => match.rank === 3);
  const currentComparison = comparisonForMatch(comparisonReport, current);
  const actions: RefinementAction[] = [
    {
      id: "keep-current-recommendation",
      type: "keepCurrentRecommendation",
      label: "Keep current recommendation",
      description: "Keep the current verified recommendation when screenshot comparison does not support a better verified alternative.",
      targetMatch: current,
      relatedCatalogItemID: current.catalogItem.stableInternalID,
      requiresVerifiedCatalog: true,
      confidence: currentComparison?.confidence ?? actionConfidence(current),
      reasons: [
        currentComparison
          ? `Current recommendation screenshot closeness score: ${currentComparison.screenshotClosenessScore}.`
          : "The current recommendation remains the baseline.",
        comparisonReport.actionSummary
      ]
    }
  ];
  if (rankTwo) actions.push(alternativeAction("try-rank-two", "tryRankTwo", "Try rank two", rankTwo, comparisonReport));
  if (rankThree) actions.push(alternativeAction("try-rank-three", "tryRankThree", "Try rank three", rankThree, comparisonReport));
  const controlActions = buildVerifiedControlActions(current);
  actions.push(...controlActions);
  return actions;
}

function alternativeAction(
  id: string,
  type: RefinementAction["type"],
  label: string,
  match: GameAppearanceMatch,
  comparisonReport: RefinementComparisonReport
): RefinementAction {
  const comparison = comparisonForMatch(comparisonReport, match);
  return {
    id,
    type,
    label,
    description: "Consider this verified ranked candidate if screenshot comparison and user review support the change.",
    targetMatch: match,
    relatedCatalogItemID: match.catalogItem.stableInternalID,
    requiresVerifiedCatalog: true,
    confidence: comparison?.confidence ?? actionConfidence(match),
    reasons: [
      comparison
        ? `Screenshot closeness score for this verified candidate: ${comparison.screenshotClosenessScore}.`
        : "This action references an already ranked verified catalog candidate.",
      "It is not an identity probability and does not invent a new game option."
    ]
  };
}

function buildVerifiedControlActions(current: GameAppearanceMatch): RefinementAction[] {
  const actions: RefinementAction[] = [];
  const hairstyle = current.appearanceRecommendations?.find((recommendation) => recommendation.category === "hairstyle" && recommendation.status === "selected");
  const facialHair = current.appearanceRecommendations?.find((recommendation) => recommendation.category === "facialHair" && recommendation.status === "selected");
  if (hairstyle?.nativeGameValue) {
    actions.push(verifiedControlAction("change-verified-hairstyle", "changeVerifiedHairstyle", "Review verified hairstyle", current, hairstyle.nativeGameValue));
  }
  if (facialHair?.nativeGameValue) {
    actions.push(verifiedControlAction("change-verified-facial-hair", "changeVerifiedFacialHair", "Review verified facial hair", current, facialHair.nativeGameValue));
  }
  return actions;
}

function verifiedControlAction(id: string, type: RefinementAction["type"], label: string, match: GameAppearanceMatch, nativeValue: string): RefinementAction {
  return {
    id,
    type,
    label,
    description: `Review verified native value "${nativeValue}" if the created-player screenshot issue is visual rather than head geometry.`,
    targetMatch: match,
    relatedCatalogItemID: match.catalogItem.stableInternalID,
    requiresVerifiedCatalog: true,
    confidence: actionConfidence(match),
    reasons: [
      `Only the verified native value "${nativeValue}" is referenced.`,
      "This suggestion does not create or infer an unverified game option."
    ]
  };
}

function getVerifiedMatches(matches: GameAppearanceMatch[], fixtureMode: boolean) {
  return [...matches]
    .sort((first, second) => first.rank - second.rank)
    .filter((match) => match.catalogItem.verificationState === "verified")
    .filter((match) => (fixtureMode ? isFixtureItem(match.catalogItem) : isProductionItem(match.catalogItem)))
    .slice(0, 3);
}

function unavailableResult(input: {
  reasons: string[];
  feedbackRecord: RefinementFeedbackRecord | undefined;
  catalogManifest: GameCatalogManifest | null;
}): RefinementResult {
  return {
    status: "unavailable",
    message: unavailableMessage,
    suggestedMatches: [],
    engineVersion: SCREENSHOT_REFINEMENT_ENGINE_VERSION,
    catalogVersion: input.catalogManifest?.catalogVersion,
    feedbackRecord: input.feedbackRecord,
    unavailableReasons: [...new Set(input.reasons)]
  };
}

function evaluateScreenshotReadiness(session: ScreenshotRefinementSession) {
  const reasons: string[] = [];
  const front = session.slots.find((slot) => slot.viewID === "front");
  if (!front?.screenshot) reasons.push("Front screenshot is required.");
  for (const slot of session.slots.filter((slot) => slot.screenshot)) {
    if (slot.validationStatus === "invalid") reasons.push(...slot.validationErrors.map((error) => `${slot.label}: ${error}`));
    if (slot.analysisReport?.overallState === "blocked") reasons.push(...slot.analysisReport.blockingMessages.map((message) => `${slot.label}: ${message}`));
  }
  const missingConfirmations = Object.entries(session.checklist).filter(([, checked]) => !checked);
  if (missingConfirmations.length > 0) {
    reasons.push("Helmet, obstruction, expression, lighting, and face-visibility confirmations must be complete.");
  }
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)] };
}

function compareScreenshotToMatches(input: ScreenshotRefinementEngineInput, matches: GameAppearanceMatch[]): RefinementComparisonReport | null {
  const screenshotMeasurements = collectScreenshotMeasurements(input.session);
  if (screenshotMeasurements.length === 0) return null;
  const candidateComparisons = matches.slice(0, 3).map((match) => compareCandidate(screenshotMeasurements, match));
  const currentMatch = input.currentMatch ?? matches.find((match) => match.rank === 1) ?? matches[0];
  const currentRecommendation = candidateComparisons.find((candidate) => candidate.catalogItemID === currentMatch.catalogItem.stableInternalID) ?? candidateComparisons[0];
  const best = [...candidateComparisons].sort((first, second) => second.screenshotClosenessScore - first.screenshotClosenessScore || first.rank - second.rank)[0];
  const screenshotEvidenceState = summarizeScreenshotEvidenceState(input.session);
  const confidenceBase = average(candidateComparisons.map((candidate) => candidate.confidence.score ?? 0));
  const crossDomainConfidence = confidenceFromScore(round(confidenceBase * (screenshotEvidenceState === "ready" ? 0.78 : 0.62)));
  const actionSummary =
    best.catalogItemID === currentRecommendation.catalogItemID || best.screenshotClosenessScore <= currentRecommendation.screenshotClosenessScore + 2
      ? "Keep current recommendation unless the user visually prefers an alternate verified result."
      : `Review rank ${best.rank}; it scored closer to the created-player screenshot than the current recommendation.`;
  return {
    reportVersion: `${SCREENSHOT_REFINEMENT_ENGINE_VERSION}-comparison-report-v1`,
    screenshotSessionID: input.session.id,
    comparedAt: input.now ?? new Date().toISOString(),
    screenshotEvidenceState,
    normalizedMeasurementCount: screenshotMeasurements.length,
    crossDomainConfidence,
    currentRecommendation,
    candidateComparisons,
    actionSummary,
    limitations: comparisonLimitations
  };
}

function collectScreenshotMeasurements(session: ScreenshotRefinementSession) {
  const byID = new Map<StandardFacialMeasurementID, ScreenshotNormalizedGeometryMeasurement[]>();
  for (const report of session.slots.flatMap((slot) => (slot.analysisReport && slot.analysisReport.overallState !== "blocked" ? [slot.analysisReport] : []))) {
    for (const measurement of report.normalizedGeometryMeasurements) {
      const current = byID.get(measurement.id) ?? [];
      current.push(measurement);
      byID.set(measurement.id, current);
    }
  }
  return [...byID.entries()].map(([id, measurements]) => ({
    id,
    value: round(average(measurements.map((measurement) => measurement.value))),
    confidence: round(average(measurements.map((measurement) => measurement.confidence))),
    supportingViewIDs: Array.from(new Set(measurements.map((measurement) => measurement.supportingViewID)))
  }));
}

function compareCandidate(
  screenshotMeasurements: ReturnType<typeof collectScreenshotMeasurements>,
  match: GameAppearanceMatch
): RefinementCandidateComparison {
  const compared = screenshotMeasurements.flatMap((measurement) => {
    const feature = defaultGeometryFeatureConfig.find((candidate) => candidate.id === measurement.id);
    const catalogValue = catalogMeasurementValue(match, measurement.id);
    if (!feature || catalogValue === null) return [];
    const normalizedDistance = Math.min(Math.abs(measurement.value - catalogValue) / feature.maxDistance, 1);
    const closeness = round((1 - normalizedDistance) * 100);
    return [{ ...measurement, catalogValue, feature, normalizedDistance, closeness }];
  });
  if (compared.length === 0) {
    return {
      rank: match.rank,
      catalogItemID: match.catalogItem.stableInternalID,
      nativeHeadOption: match.catalogItem.visibleGameLabelOrIndex,
      screenshotClosenessScore: 0,
      confidence: confidenceFromScore(0),
      comparedFeatureCount: 0,
      verified: false,
      reasons: ["No overlapping screenshot and catalog geometry measurements were available."],
      differences: ["Retake screenshot or wait for more complete verified catalog annotations."]
    };
  }
  const weightTotal = compared.reduce((total, item) => total + item.feature.weight * item.confidence, 0);
  const weightedDistance = compared.reduce((total, item) => total + item.normalizedDistance * item.feature.weight * item.confidence, 0) / Math.max(weightTotal, 0.001);
  const screenshotClosenessScore = round((1 - weightedDistance) * 100);
  const confidence = confidenceFromScore(round(average(compared.map((item) => item.confidence)) * match.confidence.score * 0.72));
  const strongest = [...compared].sort((first, second) => second.closeness - first.closeness).slice(0, 2);
  const weakest = [...compared].sort((first, second) => first.closeness - second.closeness).slice(0, 2);
  return {
    rank: match.rank,
    catalogItemID: match.catalogItem.stableInternalID,
    nativeHeadOption: match.catalogItem.visibleGameLabelOrIndex,
    screenshotClosenessScore,
    confidence,
    comparedFeatureCount: compared.length,
    verified: match.catalogItem.verificationState === "verified",
    reasons: strongest.map((item) => `${item.id} is close to the screenshot-derived measurement.`),
    differences: weakest.map((item) => `${item.id} differs from the screenshot-derived measurement.`)
  };
}

function catalogMeasurementValue(match: GameAppearanceMatch, id: StandardFacialMeasurementID) {
  const value = match.catalogItem.geometryMeasurements[id];
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && value.availabilityState === "available") return value.value;
  return null;
}

function createBlockedComparisonReport(input: ScreenshotRefinementEngineInput, reasons: string[]): RefinementComparisonReport {
  return {
    reportVersion: `${SCREENSHOT_REFINEMENT_ENGINE_VERSION}-comparison-report-v1`,
    screenshotSessionID: input.session.id,
    comparedAt: input.now ?? new Date().toISOString(),
    screenshotEvidenceState: "blocked",
    normalizedMeasurementCount: 0,
    crossDomainConfidence: confidenceFromScore(0),
    candidateComparisons: [],
    actionSummary: "Recover the invalid screenshot before comparing recommendations.",
    limitations: [...comparisonLimitations, ...reasons]
  };
}

function summarizeScreenshotEvidenceState(session: ScreenshotRefinementSession): RefinementComparisonReport["screenshotEvidenceState"] {
  const reports = session.slots.flatMap((slot) => (slot.analysisReport ? [slot.analysisReport] : []));
  if (reports.length === 0) return "unavailable";
  if (reports.some((report) => report.overallState === "blocked")) return "blocked";
  if (reports.some((report) => report.overallState === "needsReview")) return "needsReview";
  return "ready";
}

function comparisonForMatch(report: RefinementComparisonReport, match: GameAppearanceMatch) {
  return report.candidateComparisons.find((candidate) => candidate.catalogItemID === match.catalogItem.stableInternalID) ?? null;
}

function createConsentedFeedbackRecord(input: ScreenshotRefinementEngineInput): RefinementFeedbackRecord | undefined {
  if (!input.userFeedback || !input.feedbackConsent?.consented) return undefined;
  return {
    id: `refinement-feedback-${input.session.id}-${input.now ?? new Date().toISOString()}`,
    createdAt: input.now ?? new Date().toISOString(),
    consentVersion: input.feedbackConsent.consentVersion,
    rating: input.userFeedback.rating,
    notes: input.userFeedback.notes?.trim() ? input.userFeedback.notes.trim() : null,
    screenshotSessionID: input.session.id,
    profileID: input.profile?.id ?? null,
    catalogVersionID: (input.catalogManifest ?? input.catalogGate?.manifest)?.catalogVersion.identifier ?? null
  };
}

function isFixtureCatalog(manifest: GameCatalogManifest) {
  return manifest.sourceType === "testFixture" && !manifest.isProduction && manifest.items.length > 0 && manifest.items.every(isFixtureItem);
}

function isFixtureItem(item: GameAppearanceMatch["catalogItem"]) {
  return item.sourceType === "testFixture" && item.isTestFixture;
}

function isProductionItem(item: GameAppearanceMatch["catalogItem"]) {
  return item.sourceType === "production" && !item.isTestFixture && item.verificationState === "verified";
}

function actionConfidence(match: GameAppearanceMatch): MeasurementConfidence {
  return match.confidence;
}

function unavailableConfidence(): MeasurementConfidence {
  return { score: 0, label: "unavailable" };
}

function confidenceFromScore(score: number): MeasurementConfidence {
  return {
    score,
    label: score >= 0.75 ? "high" : score >= 0.45 ? "medium" : score > 0 ? "low" : "unavailable"
  };
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
