import {
  BUDDY_TRIAL_OWNER_INVITE_PREFIX,
  createBuddyTrialStorageKey,
  parseBuddyTrialSession,
  type BuddyTrialSession,
  type BuddyTrialState
} from "@/lib/buddy-trial/buddy-trial-session";

export const OWNER_BUDDY_TRIAL_DASHBOARD_SCHEMA_VERSION = "owner-buddy-trial-dashboard-v1";
export const OWNER_BUDDY_TRIAL_EXPORT_SCHEMA_VERSION = "owner-buddy-trial-export-v1";
export const OWNER_BUDDY_TRIAL_DASHBOARD_STORAGE_KEY = "gfm:owner:buddy-trial-dashboard:v1";
export const OWNER_BUDDY_TRIAL_DEFAULT_TEXT =
  "Hey, try this for me. It scans your face and tells you how to build yourself in College Football 27. Takes a couple minutes:";

export type OwnerBuddyTrialStatus = "active" | "expired" | "revoked" | "deleted";
export type OwnerBuddyTrialMode = "owner_review_demo" | "production_catalog";
export type OwnerInterventionState = "unknown" | "unassisted" | "owner_helped";

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
}

export interface OwnerBuddyTrialSummaryMetrics {
  trialsStarted: number;
  scansCompleted: number;
  buildsCompleted: number;
  videoOneCompletion: number;
  refinementCompletion: number;
  trialsCompleted: number;
  averageInitialScore: number | null;
  averageFinalScore: number | null;
  averageImprovement: number | null;
  averageResemblanceRating: number | null;
  unassistedCompletionRate: number | null;
}

export interface OwnerBuddyTrialExport {
  schemaVersion: typeof OWNER_BUDDY_TRIAL_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  summary: OwnerBuddyTrialSummaryMetrics;
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
      records: parsed.records.filter(isOwnerBuddyTrialRecord)
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
  patch: Partial<Pick<OwnerBuddyTrialRecord, "status" | "ownerIntervention" | "ownerInterventionNotes" | "technicalErrors">>,
  now = new Date()
): OwnerBuddyTrialRecord {
  return {
    ...record,
    ...patch,
    ownerInterventionNotes: patch.ownerInterventionNotes === undefined ? record.ownerInterventionNotes : scrubOwnerNote(patch.ownerInterventionNotes),
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
    resemblanceRating: finalOutcome?.resemblanceRating ?? null,
    errors: errors.filter(Boolean),
    sourceLabel: input.record.mode === "owner_review_demo" ? "OWNER_REVIEW_DEMO" : "REAL_CATALOG"
  };
}

export function summarizeOwnerBuddyTrialProgress(rows: OwnerBuddyTrialProgress[]): OwnerBuddyTrialSummaryMetrics {
  const completed = rows.filter((row) => row.stages.complete);
  return {
    trialsStarted: rows.filter((row) => row.stages.opened).length,
    scansCompleted: rows.filter((row) => row.stages.scan).length,
    buildsCompleted: rows.filter((row) => row.stages.buildGuide).length,
    videoOneCompletion: rows.filter((row) => row.stages.videoOne).length,
    refinementCompletion: rows.filter((row) => row.stages.refinement).length,
    trialsCompleted: completed.length,
    averageInitialScore: average(rows.flatMap((row) => (typeof row.session?.finalOutcome?.beforeScore === "number" ? [row.session.finalOutcome.beforeScore] : []))),
    averageFinalScore: average(rows.flatMap((row) => (typeof row.session?.finalOutcome?.afterScore === "number" ? [row.session.finalOutcome.afterScore] : []))),
    averageImprovement: average(rows.flatMap((row) => (typeof row.session?.finalOutcome?.scoreDelta === "number" ? [row.session.finalOutcome.scoreDelta] : []))),
    averageResemblanceRating: average(rows.flatMap((row) => (typeof row.resemblanceRating === "number" ? [row.resemblanceRating] : []))),
    unassistedCompletionRate:
      completed.length === 0 ? null : Math.round((completed.filter((row) => row.record.ownerIntervention === "unassisted").length / completed.length) * 100)
  };
}

export function createOwnerBuddyTrialExport(rows: OwnerBuddyTrialProgress[], now = new Date()): OwnerBuddyTrialExport {
  return {
    schemaVersion: OWNER_BUDDY_TRIAL_EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    summary: summarizeOwnerBuddyTrialProgress(rows),
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
      technicalErrors: row.errors,
      rawMediaIncluded: false
    }))
  };
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

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function scrubOwnerNote(value: string | null | undefined) {
  if (!value?.trim()) return null;
  return value.trim().replace(/(?:data:image|data:video|blob:|objectUrl|thumbnailUrl|base64)[^\s]*/gi, "[redacted-media-reference]").slice(0, 280);
}
