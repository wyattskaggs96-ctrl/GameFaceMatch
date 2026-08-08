import type { BuddyTrialFinalOutcome, BuddyTrialSession, BuddyTrialVersionPreference } from "@/lib/buddy-trial/buddy-trial-session";
import type { CharacterVideoProcessingStatus, StandardizedCharacterVideoView } from "@/lib/buddy-trial/character-video-review";
import {
  OWNER_REVIEW_DEMO_ANALYTICS_DATASET,
  OWNER_REVIEW_DEMO_MODE,
  OWNER_REVIEW_DEMO_MATCHING_CONFIG_VERSION,
  type OwnerReviewDemoRecommendationResult,
  type OwnerReviewDemoRefinementAdjustment
} from "@/lib/owner-review-demo/owner-review-demo";
import type { StandardFaceProfile, StandardFacialMeasurementID } from "@/types/domain";

export const BUDDY_TRIAL_LEARNING_SCHEMA_VERSION = "buddy-trial-learning-record-v1";
export const BUDDY_TRIAL_OPTIMIZATION_REPORT_VERSION = "buddy-trial-offline-optimization-report-v1";
export const BUDDY_TRIAL_OPTIMIZATION_CANDIDATE_VERSION = "buddy-trial-optimization-candidate-v1";

export type BuddyTrialLearningSource = "owner_review_demo" | "production";
export type BuddyTrialMeasurementBin = "very_low" | "low" | "middle" | "high" | "very_high" | "unavailable";
export type BuddyTrialOptimizationChangeType = "matching_weight_change" | "calibration_change" | "ranking_change";

export interface BuddyTrialLearningConsent {
  normalTrialConsentVersion: string;
  productImprovementOptIn: boolean;
  productImprovementConsentVersion: string | null;
  rawHumanFaceMediaRetentionOptIn: false;
  modelTrainingConsentSeparateFromTrialConsent: true;
}

export interface BuddyTrialLearningMeasurementSignal {
  measurementID: StandardFacialMeasurementID;
  bin: BuddyTrialMeasurementBin;
  confidenceLabel: string;
  valueStored: false;
}

export interface BuddyTrialLearningVideoComparison {
  iteration: 1 | 2;
  status: CharacterVideoProcessingStatus;
  standardizedViewCount: number;
  standardizedViews: Array<Pick<StandardizedCharacterVideoView, "viewID" | "qualityStatus" | "issues">>;
  buildScore: number | null;
  rawVideoRetained: false;
}

export interface BuddyTrialLearningRecord {
  schemaVersion: typeof BUDDY_TRIAL_LEARNING_SCHEMA_VERSION;
  learningRecordID: string;
  pseudonymousTrialID: string;
  source: BuddyTrialLearningSource;
  analyticsDataset: string;
  excludedFromRealBetaMetrics: boolean;
  excludedFromProductionOptimization: boolean;
  eligibleForOfflineOptimization: boolean;
  consent: BuddyTrialLearningConsent;
  captureQuality: {
    requiredViewsComplete: boolean | null;
    overallQualityScore: number | null;
    browserRgbOnly: boolean | null;
    qualityWarnings: string[];
    rawFaceMediaRetained: false;
  };
  derivedFaceMeasurements: {
    profileID: string | null;
    profileVersion: string | null;
    measurementModelVersion: string | null;
    signals: BuddyTrialLearningMeasurementSignal[];
    exactMeasurementsStored: false;
    rawLandmarksStored: false;
  };
  initialRecommendation: {
    recommendationID: string | null;
    catalogItemID: string | null;
    label: string | null;
    rank: number | null;
    score: number | null;
  };
  recommendationModelVersion: string | null;
  catalogVersionID: string | null;
  initialGameSettings: Array<{
    label: string;
    value: string;
    menuPath: string[];
  }>;
  videoOneComparison: BuddyTrialLearningVideoComparison | null;
  initialBuildScore: number | null;
  refinementChanges: Array<{
    controlID: string;
    label: string;
    from: string;
    to: string;
    reason: string;
  }>;
  videoTwoComparison: BuddyTrialLearningVideoComparison | null;
  finalBuildScore: number | null;
  numericDelta: number | null;
  testerPreferredVersion: BuddyTrialVersionPreference | null;
  resemblanceRating: number | null;
  optionalFeedback: string | null;
  errorRetryEvents: Array<{
    state: string;
    at: string;
    note: string;
  }>;
  rawHumanScanMediaRetained: false;
  rawCharacterVideoRetained: false;
  automaticTrainingStarted: false;
  productionMutationAllowed: false;
  createdAt: string;
}

export interface BuddyTrialOptimizationCandidateChange {
  schemaVersion: typeof BUDDY_TRIAL_OPTIMIZATION_CANDIDATE_VERSION;
  changeID: string;
  version: string;
  changeType: BuddyTrialOptimizationChangeType;
  summary: string;
  evidenceRecordIDs: string[];
  oldBehaviorSummary: string;
  proposedBehaviorSummary: string;
  evaluation: {
    retainedCaseCount: number;
    oldAverageFinalScore: number | null;
    proposedEstimatedAverageFinalScore: number | null;
    averageDeltaObserved: number | null;
  };
  requiresOwnerApproval: true;
  requiresValidationStudy: true;
  requiresRollbackPlan: true;
  approvedForProduction: false;
}

export interface BuddyTrialOfflineOptimizationReport {
  schemaVersion: typeof BUDDY_TRIAL_OPTIMIZATION_REPORT_VERSION;
  reportID: string;
  generatedAt: string;
  sourceRecordCount: number;
  eligibleRecordCount: number;
  excludedDemoRecordCount: number;
  excludedConsentRecordCount: number;
  patterns: {
    controlOvershoot: Array<{ controlID: string; direction: "over" | "under"; count: number; averageDelta: number }>;
    presetPerformance: Array<{ catalogItemID: string; count: number; averageFinalScore: number | null; averageRating: number | null }>;
    matchingWeightSignals: Array<{ feature: string; count: number; averageRating: number | null }>;
    refinementEffects: Array<{ feature: string; count: number; averageDelta: number }>;
  };
  candidateChanges: BuddyTrialOptimizationCandidateChange[];
  automaticProductionDeployment: false;
  approvalRequiredBeforeProduction: true;
  notes: string[];
}

export function createBuddyTrialLearningRecord(input: {
  session: BuddyTrialSession;
  source: BuddyTrialLearningSource;
  profile?: StandardFaceProfile | null;
  ownerReviewDemo?: OwnerReviewDemoRecommendationResult | null;
  productImprovementOptIn: boolean;
  productImprovementConsentVersion: string | null;
  now?: Date;
}): BuddyTrialLearningRecord {
  const now = input.now ?? new Date();
  const finalOutcome = input.session.finalOutcome;
  const demo = input.source === "owner_review_demo";
  const primaryMatch = input.ownerReviewDemo?.matches[0] ?? null;
  const learningRecord: BuddyTrialLearningRecord = {
    schemaVersion: BUDDY_TRIAL_LEARNING_SCHEMA_VERSION,
    learningRecordID: `btl_${input.session.sessionId}_${now.getTime()}`,
    pseudonymousTrialID: createPseudonymousLearningTrialID(input.session),
    source: input.source,
    analyticsDataset: demo ? OWNER_REVIEW_DEMO_ANALYTICS_DATASET : "private_beta_trial_learning_candidates",
    excludedFromRealBetaMetrics: demo,
    excludedFromProductionOptimization: demo || !input.productImprovementOptIn,
    eligibleForOfflineOptimization: !demo && input.productImprovementOptIn && Boolean(finalOutcome),
    consent: {
      normalTrialConsentVersion: input.session.consent.consentVersion,
      productImprovementOptIn: input.productImprovementOptIn,
      productImprovementConsentVersion: input.productImprovementOptIn ? input.productImprovementConsentVersion : null,
      rawHumanFaceMediaRetentionOptIn: false,
      modelTrainingConsentSeparateFromTrialConsent: true
    },
    captureQuality: createCaptureQualitySummary(input.profile),
    derivedFaceMeasurements: createMeasurementSignals(input.profile),
    initialRecommendation: {
      recommendationID: primaryMatch?.id ?? null,
      catalogItemID: primaryMatch?.catalogItem.stableInternalID ?? null,
      label: primaryMatch?.catalogItem.visibleGameLabelOrIndex ?? finalOutcome?.initialRecommendationLabel ?? null,
      rank: primaryMatch?.rank ?? null,
      score: primaryMatch?.score ?? null
    },
    recommendationModelVersion: primaryMatch?.modelVersion ?? (demo ? OWNER_REVIEW_DEMO_MATCHING_CONFIG_VERSION : null),
    catalogVersionID: primaryMatch?.catalogVersion.identifier ?? null,
    initialGameSettings: input.ownerReviewDemo?.primarySettings.map((setting) => ({
      label: setting.category,
      value: setting.value,
      menuPath: setting.menuPath
    })) ?? [],
    videoOneComparison: input.session.videoOneReview ? createVideoComparison(1, input.session.videoOneReview, finalOutcome?.beforeScore ?? null) : null,
    initialBuildScore: finalOutcome?.beforeScore ?? input.ownerReviewDemo?.refinementPlan.initialBuildScore ?? null,
    refinementChanges: input.ownerReviewDemo?.refinementPlan.recommendedChanges.map(learningChangeFromAdjustment) ?? [],
    videoTwoComparison: input.session.videoTwoReview ? createVideoComparison(2, input.session.videoTwoReview, finalOutcome?.afterScore ?? null) : null,
    finalBuildScore: finalOutcome?.afterScore ?? null,
    numericDelta: finalOutcome?.scoreDelta ?? null,
    testerPreferredVersion: finalOutcome?.userPreference ?? null,
    resemblanceRating: finalOutcome?.resemblanceRating ?? null,
    optionalFeedback: scrubFeedback(finalOutcome?.stillLooksOff ?? null),
    errorRetryEvents: input.session.history
      .filter((event) => /retry|error|blocked|failed|retake/i.test(event.note))
      .map((event) => ({ state: event.state, at: event.at, note: scrubFeedback(event.note) ?? "" })),
    rawHumanScanMediaRetained: false,
    rawCharacterVideoRetained: false,
    automaticTrainingStarted: false,
    productionMutationAllowed: false,
    createdAt: now.toISOString()
  };

  return learningRecord;
}

export function validateBuddyTrialLearningRecord(record: BuddyTrialLearningRecord) {
  const errors: string[] = [];
  if (record.schemaVersion !== BUDDY_TRIAL_LEARNING_SCHEMA_VERSION) errors.push("Unexpected Buddy Trial learning schema version.");
  if (!record.pseudonymousTrialID.startsWith("btlp_")) errors.push("Learning record must use a pseudonymous trial ID.");
  if (record.rawHumanScanMediaRetained || record.rawCharacterVideoRetained) errors.push("Learning records must not retain raw media by default.");
  if (record.derivedFaceMeasurements.exactMeasurementsStored || record.derivedFaceMeasurements.rawLandmarksStored) {
    errors.push("Learning records must not store exact measurements or raw landmarks by default.");
  }
  if ((record.videoOneComparison === null || record.videoTwoComparison === null || record.finalBuildScore === null) && record.eligibleForOfflineOptimization) {
    errors.push("Offline optimization requires a completed before/after trial outcome.");
  }
  if (!record.consent.modelTrainingConsentSeparateFromTrialConsent) errors.push("Model-training/product-improvement consent must be separate from normal trial consent.");
  if (!record.consent.productImprovementOptIn && record.eligibleForOfflineOptimization) {
    errors.push("Offline optimization eligibility requires product-improvement consent.");
  }
  if (record.source === "owner_review_demo") {
    if (!record.excludedFromRealBetaMetrics || !record.excludedFromProductionOptimization || record.eligibleForOfflineOptimization) {
      errors.push("OWNER_REVIEW_DEMO records must be excluded from real metrics and production optimization.");
    }
  }
  if (record.automaticTrainingStarted || record.productionMutationAllowed) {
    errors.push("Learning records cannot start training or mutate production behavior automatically.");
  }
  if (containsRawMediaReference(record)) errors.push("Learning record contains a raw-media URL or data URL.");
  return { ok: errors.length === 0, errors };
}

export function createOfflineBuddyTrialOptimizationReport(records: BuddyTrialLearningRecord[], now = new Date()): BuddyTrialOfflineOptimizationReport {
  const eligibleRecords = records.filter((record) => validateBuddyTrialLearningRecord(record).ok && record.eligibleForOfflineOptimization);
  const excludedDemoRecordCount = records.filter((record) => record.source === "owner_review_demo").length;
  const excludedConsentRecordCount = records.filter((record) => !record.consent.productImprovementOptIn).length;
  const controlOvershoot = summarizeControlOvershoot(eligibleRecords);
  const presetPerformance = summarizePresetPerformance(eligibleRecords);
  const refinementEffects = summarizeRefinementEffects(eligibleRecords);
  const matchingWeightSignals = summarizeMatchingWeightSignals(eligibleRecords);
  const candidateChanges = createOptimizationCandidates({
    eligibleRecords,
    controlOvershoot,
    presetPerformance,
    matchingWeightSignals,
    refinementEffects
  });

  return {
    schemaVersion: BUDDY_TRIAL_OPTIMIZATION_REPORT_VERSION,
    reportID: `bto_${now.getTime()}`,
    generatedAt: now.toISOString(),
    sourceRecordCount: records.length,
    eligibleRecordCount: eligibleRecords.length,
    excludedDemoRecordCount,
    excludedConsentRecordCount,
    patterns: {
      controlOvershoot,
      presetPerformance,
      matchingWeightSignals,
      refinementEffects
    },
    candidateChanges,
    automaticProductionDeployment: false,
    approvalRequiredBeforeProduction: true,
    notes: [
      "Offline optimization may propose changes only from consented, non-demo structured outcomes.",
      "Candidate changes are proposals, not deployed matching behavior.",
      "Owner approval, validation cases, versioning, monitoring, and rollback are required before production use."
    ]
  };
}

export function validateOptimizationCandidateForProduction(input: {
  candidate: BuddyTrialOptimizationCandidateChange;
  ownerApproved: boolean;
  validationCasesPassed: boolean;
  version: string | null;
  rollbackPlanID: string | null;
}) {
  const errors: string[] = [];
  if (!input.ownerApproved) errors.push("Owner approval is required before production promotion.");
  if (!input.validationCasesPassed) errors.push("Retained validation cases must pass before production promotion.");
  if (!input.version?.trim()) errors.push("A versioned matching/calibration/ranking change ID is required.");
  if (!input.rollbackPlanID?.trim()) errors.push("A rollback plan ID is required.");
  if (input.candidate.approvedForProduction) errors.push("Candidate changes must not be pre-approved by the offline optimizer.");
  return {
    ok: errors.length === 0,
    errors,
    nextStatus: errors.length === 0 ? ("ready_for_owner_approved_release_candidate" as const) : ("blocked_pending_approval" as const)
  };
}

function createCaptureQualitySummary(profile?: StandardFaceProfile | null): BuddyTrialLearningRecord["captureQuality"] {
  return {
    requiredViewsComplete: profile?.qualityReport.requiredAnglesComplete ?? null,
    overallQualityScore: profile?.qualityReport.overallScore ?? null,
    browserRgbOnly: profile?.capture.browserRgbOnly ?? null,
    qualityWarnings: profile?.qualityReport.issues.map((issue) => issue.message).slice(0, 12) ?? [],
    rawFaceMediaRetained: false
  };
}

function createMeasurementSignals(profile?: StandardFaceProfile | null): BuddyTrialLearningRecord["derivedFaceMeasurements"] {
  const measurements = profile?.geometry.measurements ?? {};
  const signals = Object.entries(measurements)
    .flatMap(([measurementID, measurement]): BuddyTrialLearningMeasurementSignal[] => {
      if (!measurement || measurement.availabilityState !== "available") return [];
      return [
        {
          measurementID: measurementID as StandardFacialMeasurementID,
          bin: binMeasurement(measurement.value),
          confidenceLabel: measurement.confidence.label,
          valueStored: false
        }
      ];
    })
    .sort((first, second) => first.measurementID.localeCompare(second.measurementID));

  return {
    profileID: profile?.id ?? null,
    profileVersion: profile?.profileVersion ?? null,
    measurementModelVersion: profile?.modelVersions.measurementAlgorithm ?? null,
    signals,
    exactMeasurementsStored: false,
    rawLandmarksStored: false
  };
}

function createVideoComparison(
  iteration: 1 | 2,
  review: NonNullable<BuddyTrialSession["videoOneReview"] | BuddyTrialSession["videoTwoReview"]>,
  buildScore: number | null
): BuddyTrialLearningVideoComparison {
  return {
    iteration,
    status: review.status,
    standardizedViewCount: review.standardizedViews.length,
    standardizedViews: review.standardizedViews.map((view) => ({
      viewID: view.viewID,
      qualityStatus: view.qualityStatus,
      issues: view.issues
    })),
    buildScore,
    rawVideoRetained: false
  };
}

function learningChangeFromAdjustment(adjustment: OwnerReviewDemoRefinementAdjustment) {
  return {
    controlID: adjustment.controlID,
    label: adjustment.label,
    from: adjustment.currentValue,
    to: adjustment.recommendedValue,
    reason: adjustment.reason
  };
}

function summarizeControlOvershoot(records: BuddyTrialLearningRecord[]): BuddyTrialOfflineOptimizationReport["patterns"]["controlOvershoot"] {
  const grouped = new Map<string, { controlID: string; direction: "over" | "under"; deltas: number[] }>();
  for (const record of records) {
    for (const change of record.refinementChanges) {
      const from = Number(change.from);
      const to = Number(change.to);
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
      const direction = to < from ? "over" : "under";
      const key = `${change.controlID}:${direction}`;
      const current = grouped.get(key) ?? { controlID: change.controlID, direction, deltas: [] };
      current.deltas.push(Math.abs(to - from));
      grouped.set(key, current);
    }
  }
  return [...grouped.values()]
    .map((item) => ({ controlID: item.controlID, direction: item.direction, count: item.deltas.length, averageDelta: roundAverage(item.deltas) ?? 0 }))
    .sort((first, second) => second.count - first.count || first.controlID.localeCompare(second.controlID));
}

function summarizePresetPerformance(records: BuddyTrialLearningRecord[]): BuddyTrialOfflineOptimizationReport["patterns"]["presetPerformance"] {
  const grouped = new Map<string, BuddyTrialLearningRecord[]>();
  for (const record of records) {
    const id = record.initialRecommendation.catalogItemID;
    if (!id) continue;
    grouped.set(id, [...(grouped.get(id) ?? []), record]);
  }
  return [...grouped.entries()].map(([catalogItemID, rows]) => ({
    catalogItemID,
    count: rows.length,
    averageFinalScore: roundAverage(rows.flatMap((row) => (typeof row.finalBuildScore === "number" ? [row.finalBuildScore] : []))),
    averageRating: roundAverage(rows.flatMap((row) => (typeof row.resemblanceRating === "number" ? [row.resemblanceRating] : [])))
  }));
}

function summarizeMatchingWeightSignals(records: BuddyTrialLearningRecord[]): BuddyTrialOfflineOptimizationReport["patterns"]["matchingWeightSignals"] {
  const grouped = new Map<string, number[]>();
  for (const record of records) {
    const rating = record.resemblanceRating;
    if (typeof rating !== "number") continue;
    for (const signal of [...record.refinementChanges.map((change) => change.label), ...record.derivedFaceMeasurements.signals.map((signal) => signal.measurementID)]) {
      grouped.set(signal, [...(grouped.get(signal) ?? []), rating]);
    }
  }
  return [...grouped.entries()].map(([feature, ratings]) => ({ feature, count: ratings.length, averageRating: roundAverage(ratings) }));
}

function summarizeRefinementEffects(records: BuddyTrialLearningRecord[]): BuddyTrialOfflineOptimizationReport["patterns"]["refinementEffects"] {
  const grouped = new Map<string, number[]>();
  for (const record of records) {
    if (typeof record.numericDelta !== "number") continue;
    for (const change of record.refinementChanges) {
      grouped.set(change.label, [...(grouped.get(change.label) ?? []), record.numericDelta]);
    }
  }
  return [...grouped.entries()].map(([feature, deltas]) => ({ feature, count: deltas.length, averageDelta: roundAverage(deltas) ?? 0 }));
}

function createOptimizationCandidates(input: {
  eligibleRecords: BuddyTrialLearningRecord[];
  controlOvershoot: BuddyTrialOfflineOptimizationReport["patterns"]["controlOvershoot"];
  presetPerformance: BuddyTrialOfflineOptimizationReport["patterns"]["presetPerformance"];
  matchingWeightSignals: BuddyTrialOfflineOptimizationReport["patterns"]["matchingWeightSignals"];
  refinementEffects: BuddyTrialOfflineOptimizationReport["patterns"]["refinementEffects"];
}): BuddyTrialOptimizationCandidateChange[] {
  if (input.eligibleRecords.length === 0) return [];
  const evidenceRecordIDs = input.eligibleRecords.map((record) => record.learningRecordID).sort();
  const averageFinal = roundAverage(input.eligibleRecords.flatMap((record) => (typeof record.finalBuildScore === "number" ? [record.finalBuildScore] : [])));
  const averageDelta = roundAverage(input.eligibleRecords.flatMap((record) => (typeof record.numericDelta === "number" ? [record.numericDelta] : [])));
  const candidates: BuddyTrialOptimizationCandidateChange[] = [];
  if (input.controlOvershoot.length > 0) {
    const top = input.controlOvershoot[0];
    candidates.push(candidateChange({
      changeID: `bto-calibration-${top.controlID}-${top.direction}`,
      changeType: "calibration_change",
      summary: `${top.controlID} appears to ${top.direction === "over" ? "overshoot high" : "undershoot low"} in retained trials.`,
      evidenceRecordIDs,
      oldBehaviorSummary: "Current calibration uses the active recommendation/refinement values.",
      proposedBehaviorSummary: `Evaluate a smaller ${top.direction === "over" ? "downward" : "upward"} correction for ${top.controlID}.`,
      retainedCaseCount: input.eligibleRecords.length,
      averageFinal,
      averageDelta
    }));
  }
  if (input.matchingWeightSignals.length > 0) {
    const top = [...input.matchingWeightSignals].sort((first, second) => second.count - first.count)[0];
    candidates.push(candidateChange({
      changeID: `bto-weight-${slug(top.feature)}`,
      changeType: "matching_weight_change",
      summary: `${top.feature} repeatedly appears in high-signal trial feedback.`,
      evidenceRecordIDs,
      oldBehaviorSummary: "Current matcher weights remain unchanged.",
      proposedBehaviorSummary: `Evaluate whether ${top.feature} should receive a different matching weight.`,
      retainedCaseCount: input.eligibleRecords.length,
      averageFinal,
      averageDelta
    }));
  }
  if (input.presetPerformance.length > 1) {
    const topPreset = [...input.presetPerformance].sort((first, second) => (second.averageRating ?? 0) - (first.averageRating ?? 0))[0];
    candidates.push(candidateChange({
      changeID: `bto-ranking-${slug(topPreset.catalogItemID)}`,
      changeType: "ranking_change",
      summary: `${topPreset.catalogItemID} has stronger retained trial feedback than alternatives.`,
      evidenceRecordIDs,
      oldBehaviorSummary: "Current ranking keeps the active top-three ordering.",
      proposedBehaviorSummary: `Evaluate whether ${topPreset.catalogItemID} should rank higher for similar binned profiles.`,
      retainedCaseCount: input.eligibleRecords.length,
      averageFinal,
      averageDelta
    }));
  }
  return candidates;
}

function candidateChange(input: {
  changeID: string;
  changeType: BuddyTrialOptimizationChangeType;
  summary: string;
  evidenceRecordIDs: string[];
  oldBehaviorSummary: string;
  proposedBehaviorSummary: string;
  retainedCaseCount: number;
  averageFinal: number | null;
  averageDelta: number | null;
}): BuddyTrialOptimizationCandidateChange {
  return {
    schemaVersion: BUDDY_TRIAL_OPTIMIZATION_CANDIDATE_VERSION,
    changeID: input.changeID,
    version: `${input.changeID}-v1`,
    changeType: input.changeType,
    summary: input.summary,
    evidenceRecordIDs: input.evidenceRecordIDs,
    oldBehaviorSummary: input.oldBehaviorSummary,
    proposedBehaviorSummary: input.proposedBehaviorSummary,
    evaluation: {
      retainedCaseCount: input.retainedCaseCount,
      oldAverageFinalScore: input.averageFinal,
      proposedEstimatedAverageFinalScore: input.averageFinal === null || input.averageDelta === null ? null : Math.min(100, input.averageFinal + Math.max(0, input.averageDelta) * 0.25),
      averageDeltaObserved: input.averageDelta
    },
    requiresOwnerApproval: true,
    requiresValidationStudy: true,
    requiresRollbackPlan: true,
    approvedForProduction: false
  };
}

function createPseudonymousLearningTrialID(session: BuddyTrialSession) {
  return `btlp_${session.inviteId.slice(-8)}_${session.sessionId.split("_").slice(-1)[0]}`;
}

function binMeasurement(value: number | null): BuddyTrialMeasurementBin {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unavailable";
  if (value < 0.2) return "very_low";
  if (value < 0.4) return "low";
  if (value < 0.6) return "middle";
  if (value < 0.8) return "high";
  return "very_high";
}

function roundAverage(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
}

function scrubFeedback(value: string | null) {
  if (!value?.trim()) return null;
  return value.trim().replace(/(?:data:image|data:video|blob:|base64)[^\s]*/gi, "[redacted-media-reference]").slice(0, 280);
}

function containsRawMediaReference(value: unknown): boolean {
  if (typeof value === "string") {
    return /(?:data:image|data:video|blob:|objectUrl|thumbnailUrl|base64|imageBytes|videoBytes)/i.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsRawMediaReference(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => containsRawMediaReference(item));
  }
  return false;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "unknown";
}
