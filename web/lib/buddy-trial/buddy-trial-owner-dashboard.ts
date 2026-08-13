import {
  BUDDY_TRIAL_OWNER_INVITE_PREFIX,
  createBuddyTrialStorageKey,
  parseBuddyTrialSession,
  type BuddyTrialSession,
  type BuddyTrialState
} from "@/lib/buddy-trial/buddy-trial-session";
import { createOwnerReviewDemoRecommendationResult, OWNER_REVIEW_DEMO_MODE } from "@/lib/owner-review-demo/owner-review-demo";

export const OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION = "owner-buddy-trial-dashboard-v1";
export const OWNER_BUDDY_TRIAL_EXPORT_SCHEMA_VERSION = "owner-buddy-trial-export-v1";
export const OWNER_BUDDY_TRIAL_DASHBOARD_STORAGE_KEY = "gfm:owner:buddy-trial-dashboard:v1";
export const OWNER_BUDDY_TRIAL_DEFAULT_TEXT =
  "Hey, try this for me. It scans your face and tells you how to build yourself in College Football 27. Takes a couple minutes:";

export type OwnerBuddyTrialStatus = "active" | "expired" | "revoked" | "deleted";
export type OwnerBuddyTrialMode = "owner_review_demo" | "production_catalog";
export type OwnerInterventionState = "unknown" | "unassisted" | "owner_helped";
export type OwnerBetaReviewDisposition = "unreviewed" | "good_match" | "needs_matcher_adjustment" | "catalog_issue" | "scan_issue" | "unclear" | "exclude_from_learning";

export interface OwnerBuddyTrialRecord {
  schemaVersion: typeof OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION;
  trialNumber: number;
  label: string;
  inviteId: string;
  createdAt: string;
  updatedAt: string;
  status: OwnerBuddyTrialStatus;
  mode: OwnerBuddyTrialMode;
  ownerIntervention: OwnerInterventionState;
  ownerInterventionNotes: string | null;
  ownerReviewDisposition: OwnerBetaReviewDisposition;
  ownerReviewNotes: string | null;
  technicalErrors: string[];
}

export interface OwnerBuddyTrialDashboardStore {
  schemaVersion: typeof OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION;
  records: OwnerBuddyTrialRecord[];
}

export interface OwnerBuddyTrialProgress {
  record: OwnerBuddyTrialRecord;
  session: BuddyTrialSession | null;
  inviteLink: string;
  textMessage: string;
  stages: {
    invited: boolean;
    opened: boolean;
    consent: boolean;
    scan: boolean;
    recommendation: boolean;
    buildGuide: boolean;
    videoOne: boolean;
    refinement: boolean;
    videoTwo: boolean;
    complete: boolean;
  };
  finalScore: number | null;
  resemblanceRating: number | null;
  errors: string[];
  sourceLabel: "OWNER_REVIEW_DEMO" | "REAL_CATALOG";
  reviewEvidence: OwnerBetaReviewEvidence;
}

export interface OwnerBuddyTrialSummaryMetrics {
  invitesIssued: number;
  trialsStarted: number;
  scanStarted: number;
  scanFailures: number;
  scansCompleted: number;
  recommendationsGenerated: number;
  buildsCompleted: number;
  gamePhotoUploaded: number;
  selectedRankCounts: Record<1 | 2 | 3, number>;
  topOneSelectionRate: number | null;
  topThreeUsefulnessProxy: number | null;
  gamePhotoCompletionRate: number | null;
  refinementCompletion: number;
  trialsCompleted: number;
  averageInitialScore: number | null;
  averageFinalScore: number | null;
  averageImprovement: number | null;
  averageResemblanceRating: number | null;
  unassistedCompletionRate: number | null;
  deletedTrials: number;
  runtimeErrorCount: number;
  majorFailureCategories: Array<{ category: string; count: number }>;
}

export interface OwnerBetaReviewEvidence {
  pseudonymousTesterID: string;
  captureQuality: {
    scanStarted: boolean;
    scanCompleted: boolean;
    browserRgbOnly: boolean | null;
    overallQualityScore: number | null;
    requiredViewsComplete: boolean | null;
    qualityWarnings: string[];
  };
  topThreeRecommendations: Array<{
    rank: 1 | 2 | 3;
    label: string;
    score: number;
    catalogItemID: string;
    provenance: "OWNER_REVIEW_DEMO" | "PRODUCTION_CATALOG";
  }>;
  selectedRecommendation: {
    rank: 1 | 2 | 3 | null;
    label: string | null;
  };
  evidence: {
    status: string;
    catalogVersionID: string | null;
    recommendationVersion: string | null;
    evidenceVersionID: string | null;
  };
  uploadedCf27OutputImages: Array<{
    photoID: string;
    viewID: string;
    label: string;
    validationStatus: string;
    uploadStatus: string;
    storageBucket: string;
    objectPath: string;
    sizeBytes: number;
    width: number;
    height: number;
    privateAccessOnly: true;
    rawFaceScanMedia: false;
  }>;
  resemblanceRating: number | null;
  testerMismatch: string | null;
  testerNotes: string | null;
  changedSettingsManually: boolean | null;
  manualSettingChangeSummary: string | null;
  experimentalRefinementSignals: Array<{
    status: string;
    modelVersion: string;
    summary: string;
    warnings: string[];
  }>;
  ownerReviewNotes: string | null;
  ownerReviewDisposition: OwnerBetaReviewDisposition;
  deletionStatus: "active" | "deleted";
  processingErrors: string[];
}

export interface OwnerBuddyTrialExport {
  schemaVersion: typeof OWNER_BUDDY_TRIAL_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  summary: OwnerBuddyTrialSummaryMetrics;
  privacy: {
    rawFaceMediaIncluded: false;
    rawImageBytesIncluded: false;
    browserObjectURLsIncluded: false;
    exportPurpose: "owner_beta_research_review";
  };
  records: Array<{
    trialNumber: number;
    label: string;
    inviteId: string;
    status: OwnerBuddyTrialStatus;
    mode: OwnerBuddyTrialMode;
    ownerIntervention: OwnerInterventionState;
    ownerInterventionNotes: string | null;
    sessionState: BuddyTrialState | null;
    consentAcceptedAt: string | null;
    finalOutcome: BuddyTrialSession["finalOutcome"];
    learningRecordID: string | null;
    reviewEvidence: OwnerBetaReviewEvidence;
    technicalErrors: string[];
    rawMediaIncluded: false;
  }>;
}

export function createEmptyOwnerBuddyTrialDashboardStore(): OwnerBuddyTrialDashboardStore {
  return {
    schemaVersion: OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION,
    records: []
  };
}

export function parseOwnerBuddyTrialDashboardStore(value: string | null): OwnerBuddyTrialDashboardStore {
  if (!value) return createEmptyOwnerBuddyTrialDashboardStore();
  try {
    const parsed = JSON.parse(value) as OwnerBuddyTrialDashboardStore;
    if (parsed.schemaVersion !== OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION || !Array.isArray(parsed.records)) {
      return createEmptyOwnerBuddyTrialDashboardStore();
    }
    return {
      schemaVersion: OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION,
      records: parsed.records.filter(isOwnerBuddyTrialRecord).map(normalizeOwnerBuddyTrialRecord)
    };
  } catch {
    return createEmptyOwnerBuddyTrialDashboardStore();
  }
}

export function serializeOwnerBuddyTrialDashboardStore(store: OwnerBuddyTrialDashboardStore) {
  return JSON.stringify(store);
}

export function createOwnerBuddyTrialRecord({
  existingRecords,
  ownerReviewDemoEnabled,
  now = new Date(),
  randomID
}: {
  existingRecords: OwnerBuddyTrialRecord[];
  ownerReviewDemoEnabled: boolean;
  now?: Date;
  randomID?: string;
}): OwnerBuddyTrialRecord {
  const trialNumber = Math.max(0, ...existingRecords.map((record) => record.trialNumber)) + 1;
  const timestamp = now.toISOString();
  return {
    schemaVersion: OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION,
    trialNumber,
    label: `Buddy Trial #${String(trialNumber).padStart(3, "0")}`,
    inviteId: `${BUDDY_TRIAL_OWNER_INVITE_PREFIX}${normalizeInviteRandomID(randomID ?? createRandomInviteSuffix(now))}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "active",
    mode: ownerReviewDemoEnabled ? "owner_review_demo" : "production_catalog",
    ownerIntervention: "unknown",
    ownerInterventionNotes: null,
    ownerReviewDisposition: "unreviewed",
    ownerReviewNotes: null,
    technicalErrors: []
  };
}

export function createOwnerBuddyTrialInviteLink(record: OwnerBuddyTrialRecord, origin: string) {
  return `${origin.replace(/\/$/, "")}/trial/${record.inviteId}`;
}

export function createOwnerBuddyTrialTextMessage(inviteLink: string) {
  return `${OWNER_BUDDY_TRIAL_DEFAULT_TEXT}\n${inviteLink}`;
}

export function updateOwnerBuddyTrialRecord(
  record: OwnerBuddyTrialRecord,
  patch: Partial<
    Pick<
      OwnerBuddyTrialRecord,
      "status" | "ownerIntervention" | "ownerInterventionNotes" | "ownerReviewDisposition" | "ownerReviewNotes" | "technicalErrors"
    >
  >,
  now = new Date()
): OwnerBuddyTrialRecord {
  return {
    ...record,
    ...patch,
    ownerInterventionNotes: patch.ownerInterventionNotes === undefined ? record.ownerInterventionNotes : scrubOwnerNote(patch.ownerInterventionNotes),
    ownerReviewNotes: patch.ownerReviewNotes === undefined ? record.ownerReviewNotes : scrubOwnerNote(patch.ownerReviewNotes),
    technicalErrors: patch.technicalErrors?.map((error) => scrubOwnerNote(error) ?? "").filter(Boolean) ?? record.technicalErrors,
    updatedAt: now.toISOString()
  };
}

export function createOwnerBuddyTrialProgress(input: {
  record: OwnerBuddyTrialRecord;
  session: BuddyTrialSession | null;
  origin: string;
}): OwnerBuddyTrialProgress {
  const inviteLink = createOwnerBuddyTrialInviteLink(input.record, input.origin);
  const session = input.session;
  const finalOutcome = session?.finalOutcome ?? null;
  const betaResemblanceRating = session?.resultPhotoFeedback?.feedback.resemblanceRating ?? null;
  const errors = [
    ...input.record.technicalErrors,
    ...(session?.history ?? [])
      .filter((entry) => /error|failed|blocked|denied|retry|retake/i.test(entry.note))
      .map((entry) => `${entry.state}: ${entry.note}`)
  ].map((error) => scrubOwnerNote(error) ?? "");

  return {
    record: input.record,
    session,
    inviteLink,
    textMessage: createOwnerBuddyTrialTextMessage(inviteLink),
    stages: {
      invited: input.record.status === "active",
      opened: Boolean(session),
      consent: Boolean(session?.consent.acceptedAt),
      scan: isAtOrPast(session?.state ?? null, "SCAN_COMPLETE"),
      recommendation: isAtOrPast(session?.state ?? null, "RECOMMENDATION_READY"),
      buildGuide: Boolean(session?.buildGuide && session.buildGuide.completedStepIds.length >= session.buildGuide.totalStepCount),
      videoOne: Boolean(session?.videoOneReview),
      refinement: isAtOrPast(session?.state ?? null, "REFINEMENT_READY") || Boolean(session?.refinementGuide),
      videoTwo: Boolean(session?.videoTwoReview),
      complete: session?.state === "COMPLETE"
    },
    finalScore: finalOutcome?.afterScore ?? null,
    resemblanceRating: betaResemblanceRating,
    errors: errors.filter(Boolean),
    sourceLabel: input.record.mode === "owner_review_demo" ? "OWNER_REVIEW_DEMO" : "REAL_CATALOG",
    reviewEvidence: createOwnerBetaReviewEvidence(input.record, session, errors.filter(Boolean))
  };
}

export function summarizeOwnerBuddyTrialProgress(rows: OwnerBuddyTrialProgress[]): OwnerBuddyTrialSummaryMetrics {
  const completed = rows.filter((row) => row.stages.complete);
  const feedbackRows = rows.filter((row) => row.reviewEvidence.resemblanceRating !== null);
  const selectedRanks = rows.flatMap((row) => {
    const rank = row.reviewEvidence.selectedRecommendation.rank;
    return rank === 1 || rank === 2 || rank === 3 ? [rank] : [];
  });
  const selectedRankCounts = {
    1: selectedRanks.filter((rank) => rank === 1).length,
    2: selectedRanks.filter((rank) => rank === 2).length,
    3: selectedRanks.filter((rank) => rank === 3).length
  };
  return {
    invitesIssued: rows.length,
    trialsStarted: rows.filter((row) => row.stages.opened).length,
    scanStarted: rows.filter((row) => row.reviewEvidence.captureQuality.scanStarted).length,
    scanFailures: rows.filter((row) => row.errors.some((error) => /scan|camera|permission|capture|face/i.test(error))).length,
    scansCompleted: rows.filter((row) => row.stages.scan).length,
    recommendationsGenerated: rows.filter((row) => row.stages.recommendation).length,
    buildsCompleted: rows.filter((row) => row.stages.buildGuide).length,
    gamePhotoUploaded: rows.filter((row) => row.reviewEvidence.uploadedCf27OutputImages.length > 0).length,
    selectedRankCounts,
    topOneSelectionRate: selectedRanks.length === 0 ? null : Math.round((selectedRankCounts[1] / selectedRanks.length) * 100),
    topThreeUsefulnessProxy: feedbackRows.length === 0 ? null : Math.round((feedbackRows.length / Math.max(1, rows.filter((row) => row.stages.recommendation).length)) * 100),
    gamePhotoCompletionRate:
      rows.filter((row) => row.stages.buildGuide).length === 0
        ? null
        : Math.round((rows.filter((row) => row.reviewEvidence.uploadedCf27OutputImages.length > 0).length / rows.filter((row) => row.stages.buildGuide).length) * 100),
    refinementCompletion: rows.filter((row) => row.stages.refinement).length,
    trialsCompleted: completed.length,
    averageInitialScore: average(rows.flatMap((row) => (typeof row.session?.finalOutcome?.beforeScore === "number" ? [row.session.finalOutcome.beforeScore] : []))),
    averageFinalScore: average(rows.flatMap((row) => (typeof row.session?.finalOutcome?.afterScore === "number" ? [row.session.finalOutcome.afterScore] : []))),
    averageImprovement: average(rows.flatMap((row) => (typeof row.session?.finalOutcome?.scoreDelta === "number" ? [row.session.finalOutcome.scoreDelta] : []))),
    averageResemblanceRating: average(rows.flatMap((row) => (typeof row.reviewEvidence.resemblanceRating === "number" ? [row.reviewEvidence.resemblanceRating] : []))),
    unassistedCompletionRate:
      completed.length === 0 ? null : Math.round((completed.filter((row) => row.record.ownerIntervention === "unassisted").length / completed.length) * 100),
    deletedTrials: rows.filter((row) => row.record.status === "deleted" || row.session?.state === "DELETED").length,
    runtimeErrorCount: rows.reduce((count, row) => count + row.errors.length, 0),
    majorFailureCategories: summarizeFailureCategories(rows)
  };
}

export function createOwnerBuddyTrialExport(rows: OwnerBuddyTrialProgress[], now = new Date()): OwnerBuddyTrialExport {
  return {
    schemaVersion: OWNER_BUDDY_TRIAL_EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    summary: summarizeOwnerBuddyTrialProgress(rows),
    privacy: {
      rawFaceMediaIncluded: false,
      rawImageBytesIncluded: false,
      browserObjectURLsIncluded: false,
      exportPurpose: "owner_beta_research_review"
    },
    records: rows.map((row) => ({
      trialNumber: row.record.trialNumber,
      label: row.record.label,
      inviteId: row.record.inviteId,
      status: row.record.status,
      mode: row.record.mode,
      ownerIntervention: row.record.ownerIntervention,
      ownerInterventionNotes: row.record.ownerInterventionNotes,
      sessionState: row.session?.state ?? null,
      consentAcceptedAt: row.session?.consent.acceptedAt ?? null,
      finalOutcome: row.session?.finalOutcome ?? null,
      learningRecordID: row.session?.trialLearningRecord?.learningRecordID ?? null,
      reviewEvidence: row.reviewEvidence,
      technicalErrors: row.errors,
      rawMediaIncluded: false
    }))
  };
}

export function validateOwnerBuddyTrialExport(exported: OwnerBuddyTrialExport) {
  const serialized = JSON.stringify(exported);
  const errors: string[] = [];
  if (exported.schemaVersion !== OWNER_BUDDY_TRIAL_EXPORT_SCHEMA_VERSION) errors.push("Unexpected owner Buddy Trial export schema version.");
  if (exported.privacy.rawFaceMediaIncluded || exported.privacy.rawImageBytesIncluded || exported.privacy.browserObjectURLsIncluded) {
    errors.push("Owner beta export privacy flags must remain false.");
  }
  if (/(?:data:image|data:video|blob:|base64|rawFaceImage|rawFaceVideo|faceEmbedding|rawLandmarks|landmarkCoordinates|faceLandmarks)/i.test(serialized)) {
    errors.push("Owner beta export contains prohibited raw media or facial payload references.");
  }
  for (const record of exported.records) {
    if (record.rawMediaIncluded) errors.push(`${record.label} cannot include raw media.`);
    for (const image of record.reviewEvidence.uploadedCf27OutputImages) {
      if (!image.privateAccessOnly || image.rawFaceScanMedia) errors.push(`${record.label} has an unsafe image access classification.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function readBuddyTrialSessionFromStorage(inviteId: string, storage: Pick<Storage, "getItem">) {
  return parseBuddyTrialSession(storage.getItem(createBuddyTrialStorageKey(inviteId)));
}

const orderedStates: BuddyTrialState[] = [
  "INVITED",
  "CONSENTED",
  "SCAN_IN_PROGRESS",
  "SCAN_COMPLETE",
  "RECOMMENDATION_READY",
  "BUILD_IN_PROGRESS",
  "VIDEO_1_REQUIRED",
  "VIDEO_1_PROCESSING",
  "REFINEMENT_READY",
  "VIDEO_2_REQUIRED",
  "FINAL_RESULT_READY",
  "COMPLETE",
  "DELETED"
];

function isAtOrPast(current: BuddyTrialState | null, target: BuddyTrialState) {
  if (!current) return false;
  return orderedStates.indexOf(current) >= orderedStates.indexOf(target);
}

function normalizeInviteRandomID(value: string) {
  const normalized = value.replace(/[^a-f0-9]/gi, "").toLowerCase();
  if (normalized.length >= 32) return normalized.slice(0, 32);
  return normalized.padEnd(32, "0");
}

function createRandomInviteSuffix(now: Date) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${now.getTime().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function isOwnerBuddyTrialRecord(value: OwnerBuddyTrialRecord) {
  return (
    value?.schemaVersion === OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION &&
    Number.isInteger(value.trialNumber) &&
    typeof value.inviteId === "string" &&
    value.inviteId.startsWith(BUDDY_TRIAL_OWNER_INVITE_PREFIX) &&
    ["active", "expired", "revoked", "deleted"].includes(value.status) &&
    ["owner_review_demo", "production_catalog"].includes(value.mode)
  );
}

function normalizeOwnerBuddyTrialRecord(record: OwnerBuddyTrialRecord): OwnerBuddyTrialRecord {
  return {
    ...record,
    ownerReviewDisposition: isOwnerBetaReviewDisposition(record.ownerReviewDisposition) ? record.ownerReviewDisposition : "unreviewed",
    ownerReviewNotes: scrubOwnerNote(record.ownerReviewNotes) ?? null,
    ownerInterventionNotes: scrubOwnerNote(record.ownerInterventionNotes) ?? null,
    technicalErrors: record.technicalErrors.map((error) => scrubOwnerNote(error) ?? "").filter(Boolean)
  };
}

function createOwnerBetaReviewEvidence(
  record: OwnerBuddyTrialRecord,
  session: BuddyTrialSession | null,
  errors: string[]
): OwnerBetaReviewEvidence {
  const feedback = session?.resultPhotoFeedback ?? null;
  const demoResult = record.mode === "owner_review_demo" ? createOwnerReviewDemoRecommendationResult() : null;
  const learning = session?.trialLearningRecord ?? null;
  const topThreeRecommendations = demoResult
    ? demoResult.matches.slice(0, 3).map((match) => ({
        rank: match.rank as 1 | 2 | 3,
        label: match.catalogItem.visibleGameLabelOrIndex,
        score: match.score,
        catalogItemID: match.catalogItem.stableInternalID,
        provenance: OWNER_REVIEW_DEMO_MODE as "OWNER_REVIEW_DEMO"
      }))
    : [];
  const selectedRank = feedback?.feedback.selectedRecommendationRank ?? feedback?.recommendationBinding.selectedRecommendationRank ?? null;
  const selectedLabel =
    feedback?.recommendationBinding.selectedRecommendationLabel ??
    topThreeRecommendations.find((recommendation) => recommendation.rank === selectedRank)?.label ??
    null;
  const activeImages =
    feedback?.photos
      .filter((photo) => photo.uploadStatus !== "deleted")
      .map((photo) => ({
        photoID: photo.photoID,
        viewID: photo.viewID,
        label: photo.label,
        validationStatus: photo.validationStatus,
        uploadStatus: photo.uploadStatus,
        storageBucket: photo.storageBucket,
        objectPath: photo.objectPath,
        sizeBytes: photo.sizeBytes,
        width: photo.width,
        height: photo.height,
        privateAccessOnly: true as const,
        rawFaceScanMedia: false as const
      })) ?? [];

  return {
    pseudonymousTesterID: createPseudonymousTesterID(record, session),
    captureQuality: {
      scanStarted: isAtOrPast(session?.state ?? null, "SCAN_IN_PROGRESS") || Boolean(session?.history.some((entry) => entry.state === "SCAN_IN_PROGRESS")),
      scanCompleted: isAtOrPast(session?.state ?? null, "SCAN_COMPLETE"),
      browserRgbOnly: learning?.captureQuality.browserRgbOnly ?? null,
      overallQualityScore: learning?.captureQuality.overallQualityScore ?? null,
      requiredViewsComplete: learning?.captureQuality.requiredViewsComplete ?? null,
      qualityWarnings: learning?.captureQuality.qualityWarnings ?? []
    },
    topThreeRecommendations,
    selectedRecommendation: {
      rank: selectedRank,
      label: selectedLabel
    },
    evidence: {
      status:
        record.mode === "owner_review_demo"
          ? "OWNER_REVIEW_DEMO_TEST_DATA"
          : session?.catalogGate === "available"
            ? "PRODUCTION_CATALOG_AVAILABLE"
            : "PRODUCTION_CATALOG_UNAVAILABLE",
      catalogVersionID: feedback?.recommendationBinding.catalogVersionID ?? learning?.catalogVersionID ?? demoResult?.catalog.catalogVersion.identifier ?? null,
      recommendationVersion: feedback?.recommendationBinding.recommendationVersion ?? learning?.recommendationModelVersion ?? null,
      evidenceVersionID: feedback?.recommendationBinding.evidenceVersionID ?? null
    },
    uploadedCf27OutputImages: activeImages,
    resemblanceRating: feedback?.feedback.resemblanceRating ?? null,
    testerMismatch: scrubOwnerNote(feedback?.feedback.mostWrong ?? null),
    testerNotes: scrubOwnerNote(feedback?.feedback.notes),
    changedSettingsManually: feedback?.feedback.changedSettingsManually ?? null,
    manualSettingChangeSummary: scrubOwnerNote(feedback?.feedback.manualSettingChangeSummary),
    experimentalRefinementSignals:
      feedback?.refinementSignals.map((signal) => ({
        status: signal.status,
        modelVersion: signal.modelVersion,
        summary: signal.summary,
        warnings: signal.warnings
      })) ?? [],
    ownerReviewNotes: record.ownerReviewNotes,
    ownerReviewDisposition: record.ownerReviewDisposition,
    deletionStatus: record.status === "deleted" || session?.state === "DELETED" ? "deleted" : "active",
    processingErrors: errors
  };
}

function summarizeFailureCategories(rows: OwnerBuddyTrialProgress[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const error of row.errors) {
      const category = categorizeError(error);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function categorizeError(error: string) {
  if (/camera|permission/i.test(error)) return "camera_permission";
  if (/scan|face|capture/i.test(error)) return "scan_capture";
  if (/upload|photo|image|storage/i.test(error)) return "result_photo";
  if (/recommendation|catalog/i.test(error)) return "recommendation";
  if (/delete|deletion/i.test(error)) return "deletion";
  return "runtime";
}

function createPseudonymousTesterID(record: OwnerBuddyTrialRecord, session: BuddyTrialSession | null) {
  const source = session?.sessionId ?? record.inviteId;
  return `tester_${record.trialNumber.toString().padStart(3, "0")}_${source.slice(-8)}`;
}

function isOwnerBetaReviewDisposition(value: unknown): value is OwnerBetaReviewDisposition {
  return (
    value === "unreviewed" ||
    value === "good_match" ||
    value === "needs_matcher_adjustment" ||
    value === "catalog_issue" ||
    value === "scan_issue" ||
    value === "unclear" ||
    value === "exclude_from_learning"
  );
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function scrubOwnerNote(value: string | null | undefined) {
  if (!value?.trim()) return null;
  return value.trim().replace(/(?:data:image|data:video|blob:|objectUrl|thumbnailUrl|base64)[^\s]*/gi, "[redacted-media-reference]").slice(0, 280);
}
