import type { ConsentState } from "@/lib/privacy/consent";
import type { ScreenshotRefinementSession } from "@/lib/refinement/screenshot-refinement";
import type { GameCatalogManifest, SavedBuild, StandardFaceProfile } from "@/types/domain";
import type { SupabaseRuntimeStatus } from "./runtime-config";
import type { FinalConfirmedSettings, GlobalLearningReviewCandidate, PersonalRecommendationPreference } from "@/lib/feedback/self-improving-feedback-loop";

export type RepositoryAdapterKind = "local" | "supabase";
export type RepositoryErrorCode =
  | "REMOTE_NOT_READY"
  | "REMOTE_WRITE_DISABLED"
  | "REMOTE_READ_DISABLED"
  | "LOCAL_ONLY"
  | "CONFLICT"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NOT_IMPLEMENTED";

export interface RepositoryError {
  code: RepositoryErrorCode;
  message: string;
  retryable: boolean;
  privacySafe: true;
}

export type RepositoryResult<T> = { ok: true; value: T } | { ok: false; error: RepositoryError };

export interface AnonymousScanSessionRecord {
  scanSessionID: string;
  gameID: string;
  captureMode: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface ConsentRecord {
  consentRecordID: string;
  scanSessionID: string;
  consentVersion: string;
  consentState: ConsentState;
  recordedAt: string;
}

export interface DerivedFaceProfileMetadataRecord {
  profileID: string;
  gameID: string;
  profileVersion: string;
  profileContractVersion: string;
  createdAt: string;
  rawMediaStored: false;
}

export interface SavedBuildRecord {
  savedBuildID: string;
  gameID: string;
  profileID: string;
  catalogVersionID: string | null;
  createdAt: string;
}

export interface CatalogManifestReadRecord {
  manifest: GameCatalogManifest;
  source: RepositoryAdapterKind;
}

export interface CatalogRecordReadRequest {
  gameID: string;
  platformID?: string;
  mode?: string;
  category?: string;
  catalogVersionID?: string;
}

export interface CatalogRecordReadResult {
  records: Array<{
    catalogRecordID: string;
    gameID: string;
    category: string;
    nativeLabel: string | null;
    nativeIndex: string | number | null;
    sourceType: "production";
    status: "PRODUCTION_APPROVED";
  }>;
  catalogVersionID: string | null;
}

export interface EvidenceMetadataRecord {
  evidenceID: string;
  catalogRecordID: string | null;
  storageBucket: string | null;
  objectPath: string | null;
  originalFilename: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  sourceTimestamp: string | null;
  accessClassification: "private_source" | "private_review" | "derived_review" | "public_release_metadata" | "test_only";
}

export interface RecommendationRecord {
  recommendationID: string;
  scanSessionID: string;
  gameID: string;
  catalogVersionID: string;
  matchRunID: string;
  rankCount: number;
  createdAt: string;
}

export interface ScreenshotRefinementSessionRecord {
  refinementSessionID: string;
  gameID: string;
  profileID: string;
  createdAt: string;
  rawScreenshotsStored: false;
}

export interface BuildFeedbackOutcomeRecord {
  feedbackOutcomeID: string;
  gameID: string;
  profileID: string;
  catalogVersionID: string | null;
  selectedCatalogItemID: string;
  buildMatchScore: number | null;
  passingScore: number;
  passed: boolean;
  createdAt: string;
  rawMediaStored: false;
  exactMeasurementsStored: false;
}

export interface PersonalPreferenceRecord {
  preferenceID: string;
  gameID: string;
  profileID: string;
  preferredCatalogItemID: string;
  updatedAt: string;
  rawMediaStored: false;
}

export interface GlobalLearningCandidateRecord {
  candidateID: string;
  gameID: string;
  catalogVersionID: string | null;
  status: GlobalLearningReviewCandidate["status"];
  createdAt: string;
  consentVersion: string | null;
  rawMediaStored: false;
  exactMeasurementsStored: false;
  automaticTrainingStarted: false;
}

export interface DeletionRequestRecord {
  deletionRequestID: string;
  scope:
    | "local_session"
    | "saved_profile_metadata"
    | "saved_build"
    | "screenshot_media"
    | "future_storage_objects"
    | "all_user_data";
  requestedAt: string;
  completedAt: string | null;
}

export interface AuditEventRecord {
  auditEventID: string;
  actorType: "anonymous_user" | "private_beta_customer" | "trusted_server_process" | "catalog_reviewer" | "second_verifier" | "owner_admin";
  action: string;
  targetType: string;
  targetID: string | null;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface GameFaceDataRepositories {
  adapter: RepositoryAdapterKind;
  runtime: SupabaseRuntimeStatus;
  createAnonymousScanSession(record: AnonymousScanSessionRecord, idempotencyKey: string): Promise<RepositoryResult<AnonymousScanSessionRecord>>;
  recordConsent(record: ConsentRecord, idempotencyKey: string): Promise<RepositoryResult<ConsentRecord>>;
  saveDerivedFaceProfileMetadata(
    record: DerivedFaceProfileMetadataRecord,
    profile: StandardFaceProfile,
    idempotencyKey: string
  ): Promise<RepositoryResult<DerivedFaceProfileMetadataRecord>>;
  saveBuild(record: SavedBuildRecord, build: SavedBuild, idempotencyKey: string): Promise<RepositoryResult<SavedBuildRecord>>;
  readCatalogManifest(): Promise<RepositoryResult<CatalogManifestReadRecord>>;
  readProductionCatalogRecords(request: CatalogRecordReadRequest): Promise<RepositoryResult<CatalogRecordReadResult>>;
  readEvidenceMetadata(evidenceID: string): Promise<RepositoryResult<EvidenceMetadataRecord>>;
  recordRecommendation(record: RecommendationRecord, idempotencyKey: string): Promise<RepositoryResult<RecommendationRecord>>;
  createScreenshotRefinementSession(
    record: ScreenshotRefinementSessionRecord,
    session: ScreenshotRefinementSession,
    idempotencyKey: string
  ): Promise<RepositoryResult<ScreenshotRefinementSessionRecord>>;
  recordBuildFeedbackOutcome(
    record: BuildFeedbackOutcomeRecord,
    finalSettings: FinalConfirmedSettings,
    idempotencyKey: string
  ): Promise<RepositoryResult<BuildFeedbackOutcomeRecord>>;
  savePersonalPreference(
    record: PersonalPreferenceRecord,
    preference: PersonalRecommendationPreference,
    idempotencyKey: string
  ): Promise<RepositoryResult<PersonalPreferenceRecord>>;
  queueGlobalLearningCandidate(
    record: GlobalLearningCandidateRecord,
    candidate: GlobalLearningReviewCandidate,
    idempotencyKey: string
  ): Promise<RepositoryResult<GlobalLearningCandidateRecord>>;
  requestDeletion(record: DeletionRequestRecord, idempotencyKey: string): Promise<RepositoryResult<DeletionRequestRecord>>;
  appendAuditEvent(record: AuditEventRecord, idempotencyKey: string): Promise<RepositoryResult<AuditEventRecord>>;
}

export function createLocalOnlyRepositories(input: { runtime: SupabaseRuntimeStatus; manifest: GameCatalogManifest }): GameFaceDataRepositories {
  const idempotency = new Map<string, unknown>();
  const consentRecords = new Map<string, ConsentRecord>();
  const scanSessions = new Map<string, AnonymousScanSessionRecord>();
  const profileMetadata = new Map<string, DerivedFaceProfileMetadataRecord>();
  const savedBuilds = new Map<string, SavedBuildRecord>();
  const recommendations = new Map<string, RecommendationRecord>();
  const screenshotSessions = new Map<string, ScreenshotRefinementSessionRecord>();
  const buildFeedbackOutcomes = new Map<string, BuildFeedbackOutcomeRecord>();
  const personalPreferences = new Map<string, PersonalPreferenceRecord>();
  const globalLearningCandidates = new Map<string, GlobalLearningCandidateRecord>();
  const deletionRequests = new Map<string, DeletionRequestRecord>();
  const auditEvents = new Map<string, AuditEventRecord>();

  return {
    adapter: "local",
    runtime: input.runtime,
    async createAnonymousScanSession(record, idempotencyKey) {
      return idempotent(idempotency, idempotencyKey, () => {
        scanSessions.set(record.scanSessionID, record);
        return record;
      });
    },
    async recordConsent(record, idempotencyKey) {
      return idempotent(idempotency, idempotencyKey, () => {
        consentRecords.set(record.consentRecordID, record);
        return record;
      });
    },
    async saveDerivedFaceProfileMetadata(record, _profile, idempotencyKey) {
      if (record.rawMediaStored !== false) return repositoryFailure("VALIDATION_ERROR", "Derived profile metadata cannot include raw media.");
      return idempotent(idempotency, idempotencyKey, () => {
        profileMetadata.set(record.profileID, record);
        return record;
      });
    },
    async saveBuild(record, _build, idempotencyKey) {
      return idempotent(idempotency, idempotencyKey, () => {
        savedBuilds.set(record.savedBuildID, record);
        return record;
      });
    },
    async readCatalogManifest() {
      return { ok: true, value: { manifest: input.manifest, source: "local" } };
    },
    async readProductionCatalogRecords() {
      if (!input.manifest.isProduction || input.manifest.items.length === 0) {
        return { ok: true, value: { records: [], catalogVersionID: input.manifest.catalogVersion.identifier } };
      }
      return {
        ok: true,
        value: {
          catalogVersionID: input.manifest.catalogVersion.identifier,
          records: input.manifest.items
            .filter((item) => item.sourceType === "production" && item.verificationState === "verified" && !item.isTestFixture)
            .map((item) => ({
              catalogRecordID: item.stableInternalID,
              gameID: item.game,
              category: item.category,
              nativeLabel: item.visibleGameLabelOrIndex,
              nativeIndex: null,
              sourceType: "production" as const,
              status: "PRODUCTION_APPROVED" as const
            }))
        }
      };
    },
    async readEvidenceMetadata() {
      return repositoryFailure("LOCAL_ONLY", "Private evidence metadata is not available through the local customer runtime.");
    },
    async recordRecommendation(record, idempotencyKey) {
      return idempotent(idempotency, idempotencyKey, () => {
        recommendations.set(record.recommendationID, record);
        return record;
      });
    },
    async createScreenshotRefinementSession(record, _session, idempotencyKey) {
      if (record.rawScreenshotsStored !== false) return repositoryFailure("VALIDATION_ERROR", "Screenshot refinement metadata cannot include raw screenshot media.");
      return idempotent(idempotency, idempotencyKey, () => {
        screenshotSessions.set(record.refinementSessionID, record);
        return record;
      });
    },
    async recordBuildFeedbackOutcome(record, _finalSettings, idempotencyKey) {
      if (record.rawMediaStored !== false || record.exactMeasurementsStored !== false) {
        return repositoryFailure("VALIDATION_ERROR", "Build feedback outcomes cannot store raw media or exact facial measurements.");
      }
      return idempotent(idempotency, idempotencyKey, () => {
        buildFeedbackOutcomes.set(record.feedbackOutcomeID, record);
        return record;
      });
    },
    async savePersonalPreference(record, _preference, idempotencyKey) {
      if (record.rawMediaStored !== false) {
        return repositoryFailure("VALIDATION_ERROR", "Personal recommendation preferences cannot store raw media.");
      }
      return idempotent(idempotency, idempotencyKey, () => {
        personalPreferences.set(record.preferenceID, record);
        return record;
      });
    },
    async queueGlobalLearningCandidate(record, candidate, idempotencyKey) {
      if (record.rawMediaStored !== false || record.exactMeasurementsStored !== false || record.automaticTrainingStarted !== false) {
        return repositoryFailure("VALIDATION_ERROR", "Global learning candidates cannot store raw media, exact facial measurements, or start automatic training.");
      }
      if (candidate.status !== "queuedForHumanReview") {
        return repositoryFailure("VALIDATION_ERROR", "Only consented global learning candidates may be queued.");
      }
      return idempotent(idempotency, idempotencyKey, () => {
        globalLearningCandidates.set(record.candidateID, record);
        return record;
      });
    },
    async requestDeletion(record, idempotencyKey) {
      return idempotent(idempotency, idempotencyKey, () => {
        deletionRequests.set(record.deletionRequestID, record);
        return record;
      });
    },
    async appendAuditEvent(record, idempotencyKey) {
      return idempotent(idempotency, idempotencyKey, () => {
        auditEvents.set(record.auditEventID, record);
        return record;
      });
    }
  };
}

export function createFailClosedSupabaseRepositories(runtime: SupabaseRuntimeStatus): GameFaceDataRepositories {
  const failure = async () =>
    repositoryFailure(
      runtime.mode === "supabase_ready" ? "NOT_IMPLEMENTED" : "REMOTE_NOT_READY",
      runtime.mode === "supabase_ready"
        ? "Supabase is configured, but the concrete client adapter has not been enabled in this build."
        : "Supabase runtime is not ready; remote data operations are blocked without local fallback."
    );
  return {
    adapter: "supabase",
    runtime,
    createAnonymousScanSession: failure,
    recordConsent: failure,
    saveDerivedFaceProfileMetadata: failure,
    saveBuild: failure,
    readCatalogManifest: failure,
    readProductionCatalogRecords: failure,
    readEvidenceMetadata: failure,
    recordRecommendation: failure,
    createScreenshotRefinementSession: failure,
    recordBuildFeedbackOutcome: failure,
    savePersonalPreference: failure,
    queueGlobalLearningCandidate: failure,
    requestDeletion: failure,
    appendAuditEvent: failure
  };
}

export function selectGameFaceDataRepositories(input: { runtime: SupabaseRuntimeStatus; local: GameFaceDataRepositories }): GameFaceDataRepositories {
  if (input.runtime.mode === "local_only") return input.local;
  return createFailClosedSupabaseRepositories(input.runtime);
}

export function repositoryFailure(code: RepositoryErrorCode, message: string): RepositoryResult<never> {
  return { ok: false, error: { code, message, retryable: code === "REMOTE_NOT_READY" || code === "REMOTE_READ_DISABLED", privacySafe: true } };
}

function idempotent<T>(cache: Map<string, unknown>, key: string, create: () => T): RepositoryResult<T> {
  if (!key.trim()) return repositoryFailure("VALIDATION_ERROR", "Idempotency key is required.");
  if (cache.has(key)) return { ok: true, value: cache.get(key) as T };
  const value = create();
  cache.set(key, value);
  return { ok: true, value };
}
