import type { BuddyTrialSession, BuddyTrialState } from "@/lib/buddy-trial/buddy-trial-session";
import type { StandardFaceProfile } from "@/types/domain";

export const PRIVATE_BETA_TRIAL_PERSISTENCE_SCHEMA_VERSION = "private-beta-trial-persistence-v1";
export const PRIVATE_BETA_TRIAL_DEFAULT_RETENTION_DAYS = 30;
export const PRIVATE_BETA_TRIAL_STORAGE_PREFIX = "gfm:private-beta-trial:persistence:v1";

export type PrivateBetaTrialPersistenceMode =
  | "browser_local_test_adapter"
  | "supabase_schema_contract_only"
  | "supabase_server_adapter"
  | "supabase_unavailable";
export type PrivateBetaTrialDeletionActor = "buddy_tester" | "owner_admin" | "trusted_server_process";
export type PrivateBetaTrialAuditOutcome = "succeeded" | "failed" | "blocked";
export type PrivateBetaTrialGameCharacterVideoRetention = "temporary_processing_only" | "retained_with_separate_opt_in";

export interface PrivateBetaCaptureQualityMetadata {
  captureSessionID: string | null;
  captureMode: string;
  browserRgbOnly: boolean;
  requiredViewsComplete: boolean;
  overallQualityScore: number | null;
  blockingIssueCount: number;
  advisoryIssueCount: number;
  qualityWarnings: string[];
  sourceAngleIDs: string[];
  rawFaceMediaPersisted: false;
}

export interface PrivateBetaDerivedFaceProfileRecord {
  profileID: string;
  profileVersion: string;
  profileContractVersion: string;
  createdAt: string;
  confidence: {
    overall: string;
    captureQuality: string;
    geometry: string;
    appearance: string;
    evidenceCompleteness: string;
  };
  availableMeasurementIDs: string[];
  unavailableMeasurementIDs: string[];
  userConfirmedAttributeIDs: string[];
  modelVersions: StandardFaceProfile["modelVersions"];
  rawFaceMediaPersisted: false;
  rawLandmarksPersisted: false;
  exactMeasurementsStoredForGlobalLearning: false;
}

export interface PrivateBetaSelectedGameSetting {
  catalogRecordID: string;
  gameID: string;
  catalogVersionID: string | null;
  category: string;
  nativeLabel: string | null;
  nativeIndex: number | string | null;
  confidence: "low" | "medium" | "high" | "unavailable";
  userConfirmed: boolean;
}

export interface PrivateBetaRefinementResult {
  iteration: 1 | 2;
  uploadedAt: string | null;
  mediaKind: "screenshot" | "video";
  qualityStatus: "not_started" | "blocked" | "usable" | "usable_with_notes";
  buildMatchScore: number | null;
  passingThreshold: number;
  passed: boolean | null;
  recommendedRefinementIDs: string[];
  warnings: string[];
  rawMediaPersisted: false;
  gameCharacterVideoRetention: PrivateBetaTrialGameCharacterVideoRetention;
}

export interface PrivateBetaUserRatings {
  resemblanceRating: 1 | 2 | 3 | 4 | 5 | null;
  wouldUseAgain: boolean | null;
  notes: string | null;
  finalSettingsConfirmed: boolean;
  productImprovementOptIn: boolean;
  productImprovementConsentVersion: string | null;
}

export interface PrivateBetaTrialPersistenceRecord {
  schemaVersion: typeof PRIVATE_BETA_TRIAL_PERSISTENCE_SCHEMA_VERSION;
  trialID: string;
  inviteID: string;
  sessionID: string;
  state: BuddyTrialState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  deletedAt: string | null;
  deletionActor: PrivateBetaTrialDeletionActor | null;
  consentVersion: string;
  consentAcceptedAt: string | null;
  derivedFaceProfile: PrivateBetaDerivedFaceProfileRecord | null;
  captureQualityMetadata: PrivateBetaCaptureQualityMetadata | null;
  recommendationVersion: string | null;
  catalogVersionID: string | null;
  selectedGameSettings: PrivateBetaSelectedGameSetting[];
  refinementResults: PrivateBetaRefinementResult[];
  userRatings: PrivateBetaUserRatings;
  rawFaceMediaPersisted: false;
  temporaryGameCharacterVideoRetention: PrivateBetaTrialGameCharacterVideoRetention;
  auditEvents: PrivateBetaTrialAuditEvent[];
}

export interface PrivateBetaTrialAuditEvent {
  auditEventID: string;
  trialID: string;
  actor: PrivateBetaTrialDeletionActor;
  action: string;
  outcome: PrivateBetaTrialAuditOutcome;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface PrivateBetaTrialPersistenceValidation {
  ok: boolean;
  errors: string[];
}

export interface PrivateBetaTrialPersistenceAdapter {
  mode: PrivateBetaTrialPersistenceMode;
  save(record: PrivateBetaTrialPersistenceRecord): Promise<PrivateBetaTrialPersistenceRecord>;
  read(trialID: string): Promise<PrivateBetaTrialPersistenceRecord | null>;
  deleteTrial(input: {
    trialID: string;
    actor: PrivateBetaTrialDeletionActor;
    reason: string;
    now?: Date;
  }): Promise<PrivateBetaTrialPersistenceRecord | null>;
  appendAuditEvent(event: PrivateBetaTrialAuditEvent): Promise<PrivateBetaTrialAuditEvent>;
}

export function createPrivateBetaTrialPersistenceRecord({
  session,
  now = new Date(),
  retentionDays = PRIVATE_BETA_TRIAL_DEFAULT_RETENTION_DAYS
}: {
  session: BuddyTrialSession;
  now?: Date;
  retentionDays?: number;
}): PrivateBetaTrialPersistenceRecord {
  const timestamp = now.toISOString();
  return {
    schemaVersion: PRIVATE_BETA_TRIAL_PERSISTENCE_SCHEMA_VERSION,
    trialID: createPseudonymousTrialID(session.inviteId, session.sessionId),
    inviteID: session.inviteId,
    sessionID: session.sessionId,
    state: session.state,
    createdAt: session.createdAt,
    updatedAt: timestamp,
    expiresAt: addDays(now, retentionDays).toISOString(),
    deletedAt: session.deletedAt,
    deletionActor: null,
    consentVersion: session.consent.consentVersion,
    consentAcceptedAt: session.consent.acceptedAt,
    derivedFaceProfile: null,
    captureQualityMetadata: null,
    recommendationVersion: null,
    catalogVersionID: null,
    selectedGameSettings: [],
    refinementResults: [],
    userRatings: createEmptyPrivateBetaUserRatings(),
    rawFaceMediaPersisted: false,
    temporaryGameCharacterVideoRetention: "temporary_processing_only",
    auditEvents: [
      createPrivateBetaTrialAuditEvent({
        trialID: createPseudonymousTrialID(session.inviteId, session.sessionId),
        actor: "buddy_tester",
        action: "trial_session_created",
        outcome: "succeeded",
        now
      })
    ]
  };
}

export function attachDerivedFaceProfile(
  record: PrivateBetaTrialPersistenceRecord,
  profile: StandardFaceProfile,
  now = new Date()
): PrivateBetaTrialPersistenceRecord {
  return {
    ...record,
    updatedAt: now.toISOString(),
    derivedFaceProfile: createPrivateBetaDerivedFaceProfileRecord(profile),
    captureQualityMetadata: createPrivateBetaCaptureQualityMetadata(profile)
  };
}

export function markPrivateBetaTrialDeleted({
  record,
  actor,
  reason,
  now = new Date()
}: {
  record: PrivateBetaTrialPersistenceRecord;
  actor: PrivateBetaTrialDeletionActor;
  reason: string;
  now?: Date;
}): PrivateBetaTrialPersistenceRecord {
  const timestamp = now.toISOString();
  return {
    ...record,
    state: "DELETED",
    updatedAt: timestamp,
    deletedAt: timestamp,
    deletionActor: actor,
    derivedFaceProfile: null,
    captureQualityMetadata: null,
    selectedGameSettings: [],
    refinementResults: [],
    userRatings: createEmptyPrivateBetaUserRatings(),
    rawFaceMediaPersisted: false,
    temporaryGameCharacterVideoRetention: "temporary_processing_only",
    auditEvents: [
      ...record.auditEvents,
      createPrivateBetaTrialAuditEvent({
        trialID: record.trialID,
        actor,
        action: "trial_data_deleted",
        outcome: "succeeded",
        now,
        metadata: { reason }
      })
    ]
  };
}

export function validatePrivateBetaTrialPersistenceRecord(record: PrivateBetaTrialPersistenceRecord): PrivateBetaTrialPersistenceValidation {
  const errors: string[] = [];
  if (record.schemaVersion !== PRIVATE_BETA_TRIAL_PERSISTENCE_SCHEMA_VERSION) errors.push("Unexpected private-beta trial persistence schema version.");
  if (!record.trialID.startsWith("btp_")) errors.push("Trial ID must be pseudonymous and use the private-beta prefix.");
  if (!record.inviteID.trim()) errors.push("Invite ID is required.");
  if (!record.sessionID.trim()) errors.push("Session ID is required.");
  if (record.rawFaceMediaPersisted !== false) errors.push("Raw face media must not be persisted by default.");
  if (record.temporaryGameCharacterVideoRetention === "retained_with_separate_opt_in" && !record.userRatings.productImprovementOptIn) {
    errors.push("Game-character video retention requires separate product-improvement opt-in.");
  }
  if (record.deletedAt && (record.derivedFaceProfile || record.captureQualityMetadata || record.selectedGameSettings.length > 0 || record.refinementResults.length > 0)) {
    errors.push("Deleted trial records must not retain derived profile, capture, settings, or refinement payloads.");
  }
  if (containsRawMediaReference(record)) errors.push("Persistence record contains a raw-media URL or data URL.");
  if (record.refinementResults.some((result) => result.rawMediaPersisted !== false)) errors.push("Refinement results must not persist raw media by default.");
  return { ok: errors.length === 0, errors };
}

export function isPrivateBetaTrialExpired(record: Pick<PrivateBetaTrialPersistenceRecord, "expiresAt">, now = new Date()) {
  return new Date(record.expiresAt).getTime() <= now.getTime();
}

export function createLocalPrivateBetaTrialPersistenceAdapter(
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  options: { now?: () => Date } = {}
): PrivateBetaTrialPersistenceAdapter {
  const memory = new Map<string, string>();
  const getItem = storage?.getItem.bind(storage) ?? ((key: string) => memory.get(key) ?? null);
  const setItem = storage?.setItem.bind(storage) ?? ((key: string, value: string) => void memory.set(key, value));
  const removeItem = storage?.removeItem.bind(storage) ?? ((key: string) => void memory.delete(key));
  const now = options.now ?? (() => new Date());

  return {
    mode: "browser_local_test_adapter",
    async save(record) {
      const validation = validatePrivateBetaTrialPersistenceRecord(record);
      if (!validation.ok) {
        throw new Error(validation.errors.join(" "));
      }
      setItem(privateBetaStorageKey(record.trialID), JSON.stringify(record));
      return record;
    },
    async read(trialID) {
      const parsed = parsePrivateBetaTrialPersistenceRecord(getItem(privateBetaStorageKey(trialID)));
      return parsed && !isPrivateBetaTrialExpired(parsed, now()) ? parsed : null;
    },
    async deleteTrial({ trialID, actor, reason, now }) {
      const existing = parsePrivateBetaTrialPersistenceRecord(getItem(privateBetaStorageKey(trialID)));
      if (!existing) {
        removeItem(privateBetaStorageKey(trialID));
        return null;
      }
      const deleted = markPrivateBetaTrialDeleted({ record: existing, actor, reason, now });
      setItem(privateBetaStorageKey(trialID), JSON.stringify(deleted));
      return deleted;
    },
    async appendAuditEvent(event) {
      const existing = parsePrivateBetaTrialPersistenceRecord(getItem(privateBetaStorageKey(event.trialID)));
      if (existing) {
        const next = { ...existing, auditEvents: [...existing.auditEvents, sanitizePrivateBetaTrialAuditEvent(event)] };
        setItem(privateBetaStorageKey(event.trialID), JSON.stringify(next));
      }
      return sanitizePrivateBetaTrialAuditEvent(event);
    }
  };
}

export function createSupabaseUnavailablePrivateBetaTrialPersistenceAdapter(): PrivateBetaTrialPersistenceAdapter {
  const blocked = async () => {
    throw new Error("Supabase private-beta trial persistence is not active until credentials, RLS policies, and server-only writes are enabled.");
  };
  return {
    mode: "supabase_unavailable",
    save: blocked,
    read: blocked,
    deleteTrial: blocked,
    appendAuditEvent: blocked
  };
}

export function parsePrivateBetaTrialPersistenceRecord(value: string | null): PrivateBetaTrialPersistenceRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PrivateBetaTrialPersistenceRecord;
    return validatePrivateBetaTrialPersistenceRecord(parsed).ok ? parsed : null;
  } catch {
    return null;
  }
}

export function createPrivateBetaTrialAuditEvent({
  trialID,
  actor,
  action,
  outcome,
  now = new Date(),
  metadata = {}
}: {
  trialID: string;
  actor: PrivateBetaTrialDeletionActor;
  action: string;
  outcome: PrivateBetaTrialAuditOutcome;
  now?: Date;
  metadata?: Record<string, string | number | boolean | null>;
}): PrivateBetaTrialAuditEvent {
  return sanitizePrivateBetaTrialAuditEvent({
    auditEventID: `bta_${now.getTime()}_${action}`,
    trialID,
    actor,
    action,
    outcome,
    createdAt: now.toISOString(),
    metadata
  });
}

export function sanitizePrivateBetaTrialAuditEvent(event: PrivateBetaTrialAuditEvent): PrivateBetaTrialAuditEvent {
  return {
    ...event,
    metadata: Object.fromEntries(
      Object.entries(event.metadata).map(([key, value]) => [key, typeof value === "string" ? redactMediaLikeString(value) : value])
    )
  };
}

function createPrivateBetaDerivedFaceProfileRecord(profile: StandardFaceProfile): PrivateBetaDerivedFaceProfileRecord {
  return {
    profileID: profile.id,
    profileVersion: profile.profileVersion,
    profileContractVersion: profile.profileContractVersion,
    createdAt: profile.createdAt,
    confidence: {
      overall: profile.confidence.overall.label,
      captureQuality: profile.confidence.captureQuality.label,
      geometry: profile.confidence.geometry.label,
      appearance: profile.confidence.appearance.label,
      evidenceCompleteness: profile.confidence.evidenceCompleteness.label
    },
    availableMeasurementIDs: Object.keys(profile.geometry.measurements).sort(),
    unavailableMeasurementIDs: [...profile.geometry.unavailableMeasurements].sort(),
    userConfirmedAttributeIDs: profile.userConfirmedAttributes.map((attribute) => attribute.id).sort(),
    modelVersions: profile.modelVersions,
    rawFaceMediaPersisted: false,
    rawLandmarksPersisted: false,
    exactMeasurementsStoredForGlobalLearning: false
  };
}

function createPrivateBetaCaptureQualityMetadata(profile: StandardFaceProfile): PrivateBetaCaptureQualityMetadata {
  return {
    captureSessionID: profile.id,
    captureMode: profile.capture.mode,
    browserRgbOnly: profile.capture.browserRgbOnly,
    requiredViewsComplete: profile.qualityReport.requiredAnglesComplete,
    overallQualityScore: profile.qualityReport.overallScore,
    blockingIssueCount: profile.qualityReport.blockingIssueCount ?? profile.qualityReport.issues.filter((issue) => issue.severity === "blocking").length,
    advisoryIssueCount: profile.qualityReport.advisoryIssueCount ?? profile.qualityReport.issues.filter((issue) => issue.severity === "advisory").length,
    qualityWarnings: profile.qualityReport.issues.map((issue) => issue.message),
    sourceAngleIDs: Object.values(profile.sourceAngleAvailability)
      .filter((angle) => angle.available)
      .map((angle) => angle.angleID)
      .sort(),
    rawFaceMediaPersisted: false
  };
}

function createEmptyPrivateBetaUserRatings(): PrivateBetaUserRatings {
  return {
    resemblanceRating: null,
    wouldUseAgain: null,
    notes: null,
    finalSettingsConfirmed: false,
    productImprovementOptIn: false,
    productImprovementConsentVersion: null
  };
}

function createPseudonymousTrialID(inviteID: string, sessionID: string) {
  return `btp_${inviteID.slice(-8)}_${sessionID.split("_").slice(-1)[0]}`;
}

function privateBetaStorageKey(trialID: string) {
  return `${PRIVATE_BETA_TRIAL_STORAGE_PREFIX}:${trialID}`;
}

function addDays(now: Date, days: number) {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function containsRawMediaReference(value: unknown) {
  const serialized = JSON.stringify(value);
  return /(?:data:image|data:video|blob:|objectUrl|base64|rawVideo|rawImage|imageBytes|videoBytes)/i.test(serialized);
}

function redactMediaLikeString(value: string) {
  return /(?:data:image|data:video|blob:|base64)/i.test(value) ? "[redacted-media-reference]" : value;
}
