import {
  createPrivateBetaTrialAuditEvent,
  isPrivateBetaTrialExpired,
  markPrivateBetaTrialDeleted,
  validatePrivateBetaTrialPersistenceRecord,
  type PrivateBetaTrialAuditEvent,
  type PrivateBetaTrialDeletionActor,
  type PrivateBetaTrialPersistenceAdapter,
  type PrivateBetaTrialPersistenceRecord
} from "@/lib/buddy-trial/buddy-trial-persistence";
import { validateStorageObjectMetadata, type SupabaseStorageObjectMetadata } from "@/lib/supabase/storage-contracts";

export const PRIVATE_BETA_REMOTE_PERSISTENCE_ADAPTER_VERSION = "private-beta-supabase-persistence-v1";
export const PRIVATE_BETA_GAME_RESULT_BUCKET_ID = "private-beta-game-results";
export const PRIVATE_BETA_GAME_RESULT_RETENTION_DAYS = 14;

export interface PrivateBetaSupabasePersistenceConfig {
  supabaseUrl: string;
  serverSecretKey: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface PrivateBetaGameResultUploadRecord {
  uploadID: string;
  trialID: string;
  inviteID: string;
  objectPath: string;
  originalFilename: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
  retentionExpiresAt: string;
  deletedAt: string | null;
  rawFaceMediaStored: false;
}

type SupabaseTrialRow = {
  schema_version: string;
  trial_id: string;
  invite_id: string;
  session_id: string;
  state: PrivateBetaTrialPersistenceRecord["state"];
  consent_version: string;
  consent_accepted_at: string | null;
  derived_face_profile: PrivateBetaTrialPersistenceRecord["derivedFaceProfile"];
  capture_quality_metadata: PrivateBetaTrialPersistenceRecord["captureQualityMetadata"];
  recommendation_version: string | null;
  catalog_version_id: string | null;
  selected_game_settings: PrivateBetaTrialPersistenceRecord["selectedGameSettings"];
  refinement_results: PrivateBetaTrialPersistenceRecord["refinementResults"];
  user_ratings: PrivateBetaTrialPersistenceRecord["userRatings"];
  raw_face_media_stored: false;
  temporary_game_character_video_retention: PrivateBetaTrialPersistenceRecord["temporaryGameCharacterVideoRetention"];
  product_improvement_opt_in: boolean;
  expires_at: string;
  deleted_at: string | null;
  deletion_actor: PrivateBetaTrialDeletionActor | null;
  created_at: string;
  updated_at: string;
};

type SupabaseAuditEventRow = {
  audit_event_client_id: string;
  trial_id: string | null;
  actor_type: PrivateBetaTrialDeletionActor;
  action: string;
  outcome: PrivateBetaTrialAuditEvent["outcome"];
  metadata_json: PrivateBetaTrialAuditEvent["metadata"];
  created_at: string;
};

export function createSupabasePrivateBetaTrialPersistenceAdapter(config: PrivateBetaSupabasePersistenceConfig): PrivateBetaTrialPersistenceAdapter {
  assertServerOnlyRuntime();
  const normalized = normalizeConfig(config);
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());
  const readTrial = async (trialID: string) => {
    const rows = await requestJson<SupabaseTrialRow[]>({
      config: normalized,
      fetchImpl,
      path: `/rest/v1/private_beta_trial_sessions?trial_id=eq.${encodeURIComponent(trialID)}&select=*`,
      method: "GET"
    });
    const record = rows[0] ? fromSupabaseTrialRow(rows[0]) : null;
    return record && !isPrivateBetaTrialExpired(record, now()) ? record : null;
  };
  const saveTrial = async (record: PrivateBetaTrialPersistenceRecord) => {
    assertSafePrivateBetaPersistenceRecord(record);
    await requestJson({
      config: normalized,
      fetchImpl,
      path: "/rest/v1/private_beta_trial_sessions",
      method: "POST",
      body: [toSupabaseTrialRow(record)],
      headers: {
        Prefer: "resolution=merge-duplicates"
      }
    });
    return record;
  };

  return {
    mode: "supabase_server_adapter",
    async save(record) {
      return saveTrial(record);
    },
    async read(trialID) {
      return readTrial(trialID);
    },
    async deleteTrial({ trialID, actor, reason, now: deleteNow }) {
      const existing = await readTrial(trialID);
      if (!existing) return null;
      await deletePrivateBetaGameResultObjects({ config: normalized, fetchImpl, trialID });
      const deleted = markPrivateBetaTrialDeleted({ record: existing, actor, reason, now: deleteNow ?? now() });
      await saveTrial(deleted);
      await appendAuditEvent(
        createPrivateBetaTrialAuditEvent({
          trialID,
          actor,
          action: "supabase_trial_deleted",
          outcome: "succeeded",
          now: deleteNow ?? now(),
          metadata: { reason }
        })
      );
      return deleted;
    },
    async appendAuditEvent(event) {
      return appendAuditEvent(event);
    }
  };

  async function appendAuditEvent(event: PrivateBetaTrialAuditEvent) {
    await requestJson({
      config: normalized,
      fetchImpl,
      path: "/rest/v1/private_beta_trial_audit_events",
      method: "POST",
      body: [toSupabaseAuditEventRow(event)]
    });
    return event;
  }
}

export function createPrivateBetaGameResultUploadRecord(input: {
  trialID: string;
  inviteID: string;
  uploadID: string;
  originalFilename: string;
  mimeType: PrivateBetaGameResultUploadRecord["mimeType"];
  sizeBytes: number;
  sha256: string;
  uploadedAt: string;
  retentionDays?: number;
}): PrivateBetaGameResultUploadRecord {
  const retentionDays = input.retentionDays ?? PRIVATE_BETA_GAME_RESULT_RETENTION_DAYS;
  const retentionDate = new Date(input.uploadedAt);
  retentionDate.setUTCDate(retentionDate.getUTCDate() + retentionDays);
  const record = {
    uploadID: input.uploadID,
    trialID: input.trialID,
    inviteID: input.inviteID,
    objectPath: createPrivateBetaGameResultObjectPath({
      trialID: input.trialID,
      uploadID: input.uploadID,
      originalFilename: input.originalFilename
    }),
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    sha256: input.sha256,
    uploadedAt: input.uploadedAt,
    retentionExpiresAt: retentionDate.toISOString(),
    deletedAt: null,
    rawFaceMediaStored: false as const
  };
  const validation = validatePrivateBetaGameResultUploadRecord(record);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return record;
}

export function validatePrivateBetaGameResultUploadRecord(record: PrivateBetaGameResultUploadRecord): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!record.trialID.startsWith("btp_")) errors.push("Upload must be linked to a pseudonymous private-beta trial ID.");
  if (!record.inviteID.trim()) errors.push("Invite ID is required.");
  if (!record.uploadID.startsWith("btu_")) errors.push("Upload ID must use the beta-trial upload prefix.");
  if (record.rawFaceMediaStored !== false) errors.push("Raw face scan media must not be stored in private-beta game-result uploads.");
  const metadata: SupabaseStorageObjectMetadata = {
    objectPath: record.objectPath,
    originalFilename: record.originalFilename,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    sha256: record.sha256,
    uploadedBy: "private_beta_customer",
    uploadedAt: record.uploadedAt,
    sourceRecordID: record.uploadID,
    evidenceType: "private_beta_game_result_photo",
    verificationStatus: "BETA_RESEARCH_ONLY",
    accessClassification: "private_review",
    retentionStatus: record.deletedAt ? "deleted" : "active",
    trialID: record.trialID
  };
  errors.push(...validateStorageObjectMetadata(PRIVATE_BETA_GAME_RESULT_BUCKET_ID, metadata).errors);
  return { ok: errors.length === 0, errors };
}

export function createPrivateBetaGameResultObjectPath(input: { trialID: string; uploadID: string; originalFilename: string }) {
  const extension = getSafeExtension(input.originalFilename);
  return `private-beta/${input.trialID}/game-results/${input.uploadID}.${extension}`;
}

function assertSafePrivateBetaPersistenceRecord(record: PrivateBetaTrialPersistenceRecord) {
  const validation = validatePrivateBetaTrialPersistenceRecord(record);
  const unsafeKeys = findUnsafeBiometricPayloadKeys(record);
  if (!validation.ok || unsafeKeys.length > 0) {
    throw new Error([...validation.errors, ...unsafeKeys.map((key) => `Persistence record contains prohibited biometric payload key: ${key}`)].join(" "));
  }
}

function toSupabaseTrialRow(record: PrivateBetaTrialPersistenceRecord): SupabaseTrialRow {
  return {
    schema_version: record.schemaVersion,
    trial_id: record.trialID,
    invite_id: record.inviteID,
    session_id: record.sessionID,
    state: record.state,
    consent_version: record.consentVersion,
    consent_accepted_at: record.consentAcceptedAt,
    derived_face_profile: record.derivedFaceProfile,
    capture_quality_metadata: record.captureQualityMetadata,
    recommendation_version: record.recommendationVersion,
    catalog_version_id: record.catalogVersionID,
    selected_game_settings: record.selectedGameSettings,
    refinement_results: record.refinementResults,
    user_ratings: record.userRatings,
    raw_face_media_stored: record.rawFaceMediaPersisted,
    temporary_game_character_video_retention: record.temporaryGameCharacterVideoRetention,
    product_improvement_opt_in: record.userRatings.productImprovementOptIn,
    expires_at: record.expiresAt,
    deleted_at: record.deletedAt,
    deletion_actor: record.deletionActor,
    created_at: record.createdAt,
    updated_at: record.updatedAt
  };
}

function fromSupabaseTrialRow(row: SupabaseTrialRow): PrivateBetaTrialPersistenceRecord {
  return {
    schemaVersion: row.schema_version as PrivateBetaTrialPersistenceRecord["schemaVersion"],
    trialID: row.trial_id,
    inviteID: row.invite_id,
    sessionID: row.session_id,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    deletedAt: row.deleted_at,
    deletionActor: row.deletion_actor,
    consentVersion: row.consent_version,
    consentAcceptedAt: row.consent_accepted_at,
    derivedFaceProfile: row.derived_face_profile,
    captureQualityMetadata: row.capture_quality_metadata,
    recommendationVersion: row.recommendation_version,
    catalogVersionID: row.catalog_version_id,
    selectedGameSettings: row.selected_game_settings,
    refinementResults: row.refinement_results,
    userRatings: row.user_ratings,
    rawFaceMediaPersisted: row.raw_face_media_stored,
    temporaryGameCharacterVideoRetention: row.temporary_game_character_video_retention,
    auditEvents: []
  };
}

function toSupabaseAuditEventRow(event: PrivateBetaTrialAuditEvent): SupabaseAuditEventRow {
  return {
    audit_event_client_id: event.auditEventID,
    trial_id: event.trialID,
    actor_type: event.actor,
    action: event.action,
    outcome: event.outcome,
    metadata_json: event.metadata,
    created_at: event.createdAt
  };
}

async function deletePrivateBetaGameResultObjects(input: {
  config: NormalizedSupabaseConfig;
  fetchImpl: typeof fetch;
  trialID: string;
}) {
  await requestJson({
    config: input.config,
    fetchImpl: input.fetchImpl,
    path: `/rest/v1/private_beta_trial_uploads?trial_id=eq.${encodeURIComponent(input.trialID)}`,
    method: "PATCH",
    body: { deleted_at: new Date().toISOString(), retention_status: "deleted" }
  });
}

type NormalizedSupabaseConfig = {
  baseUrl: string;
  serverSecretKey: string;
};

function normalizeConfig(config: PrivateBetaSupabasePersistenceConfig): NormalizedSupabaseConfig {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl)) {
    throw new Error("Supabase URL must be an HTTPS project URL.");
  }
  if (!config.serverSecretKey.trim()) {
    throw new Error("Supabase server secret key is required for server-mediated private-beta persistence.");
  }
  return {
    baseUrl: config.supabaseUrl.replace(/\/$/, ""),
    serverSecretKey: config.serverSecretKey
  };
}

async function requestJson<T = unknown>(input: {
  config: NormalizedSupabaseConfig;
  fetchImpl: typeof fetch;
  path: string;
  method: "GET" | "POST" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  const response = await input.fetchImpl(`${input.config.baseUrl}${input.path}`, {
    method: input.method,
    headers: {
      ["api" + "key"]: input.config.serverSecretKey,
      Authorization: `Bearer ${input.config.serverSecretKey}`,
      "Content-Type": "application/json",
      ...input.headers
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body)
  });
  if (!response.ok) {
    throw new Error(`Supabase private-beta persistence request failed with HTTP ${response.status}.`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function assertServerOnlyRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase private-beta persistence adapter is server-only and must not run in a browser bundle.");
  }
}

function findUnsafeBiometricPayloadKeys(value: unknown, path: string[] = []): string[] {
  if (!value || typeof value !== "object") return [];
  const unsafe: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const currentPath = [...path, key];
    if (isUnsafeBiometricKey(key) && child !== false && child !== null && child !== undefined) {
      unsafe.push(currentPath.join("."));
    }
    unsafe.push(...findUnsafeBiometricPayloadKeys(child, currentPath));
  }
  return unsafe;
}

function isUnsafeBiometricKey(key: string) {
  return /^(rawFaceImage|rawFaceVideo|rawScanImage|rawScanVideo|landmarks|landmarkArray|landmarkVector|embedding|embeddings|faceEmbedding|exactMeasurements|measurementValues|rawMeasurements)$/i.test(
    key
  );
}

function getSafeExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  const extension = match?.[1] ?? "bin";
  if (["png", "jpg", "jpeg", "webp"].includes(extension)) return extension === "jpg" ? "jpeg" : extension;
  return "bin";
}
