import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import type { CapturedAngleID, ISODateString } from "@/types/domain";

export const OFFLINE_RECOVERY_VERSION = "offline-recovery-v1";
export const CAPTURE_RECOVERY_STORAGE_KEY = "gameface-match.capture-recovery.metadata.v1";

export type ExternalResourceState = "available" | "unavailable" | "unknown";
export type RecoverySeverity = "info" | "warning" | "blocking";

export interface OfflineRecoveryStatus {
  schemaVersion: typeof OFFLINE_RECOVERY_VERSION;
  checkedAt: ISODateString;
  browserOnline: boolean;
  noNetworkCaptureSupported: boolean;
  externalResources: Record<string, ExternalResourceState>;
  messages: Array<{ severity: RecoverySeverity; message: string }>;
}

export interface CaptureAngleRecoverySnapshot {
  angleID: CapturedAngleID;
  label: string;
  status: string;
  validationStatus: string;
  fileName: string | null;
  fileType: string | null;
  fileSizeBytes: number | null;
  width: number | null;
  height: number | null;
  source: string | null;
  validationErrors: string[];
}

export interface CaptureRecoverySnapshot {
  schemaVersion: typeof OFFLINE_RECOVERY_VERSION;
  sessionID: string;
  savedAt: ISODateString;
  completedAngleCount: number;
  totalAngleCount: number;
  currentAngleID: CapturedAngleID;
  status: ActiveCaptureSession["status"];
  productionReady: false;
  rawImageBytesStored: false;
  objectUrlsStored: false;
  recoveryNote: string;
  angles: CaptureAngleRecoverySnapshot[];
}

export interface CaptureRecoveryStore {
  load(): CaptureRecoverySnapshot | null;
  save(snapshot: CaptureRecoverySnapshot): void;
  clear(): void;
}

export interface ChecksumRecoveryPlan {
  path: string;
  failedAt: ISODateString;
  errorMessage: string;
  retryAllowed: boolean;
  recommendedActions: string[];
}

export function createOfflineRecoveryStatus(input: {
  browserOnline: boolean;
  externalResources?: Record<string, ExternalResourceState>;
  checkedAt?: ISODateString;
}): OfflineRecoveryStatus {
  const externalResources = input.externalResources ?? {};
  const unavailableResources = Object.entries(externalResources).filter(([, state]) => state === "unavailable");
  const messages: OfflineRecoveryStatus["messages"] = [];
  if (!input.browserOnline) {
    messages.push({
      severity: "warning",
      message: "Browser is offline. Local capture and draft metadata can continue where browser APIs allow, but catalog updates and external model assets are unavailable."
    });
  }
  for (const [name] of unavailableResources) {
    messages.push({
      severity: "warning",
      message: `${name} is unavailable. Continue with local draft work and rerun validation when the resource is available.`
    });
  }
  if (messages.length === 0) {
    messages.push({ severity: "info", message: "No offline or external-resource recovery issues detected." });
  }
  return {
    schemaVersion: OFFLINE_RECOVERY_VERSION,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    browserOnline: input.browserOnline,
    noNetworkCaptureSupported: true,
    externalResources,
    messages
  };
}

export function createCaptureRecoverySnapshot(session: ActiveCaptureSession, savedAt = new Date().toISOString()): CaptureRecoverySnapshot {
  const completedAngleCount = session.angles.filter((angle) => angle.status === "complete").length;
  return {
    schemaVersion: OFFLINE_RECOVERY_VERSION,
    sessionID: session.id,
    savedAt,
    completedAngleCount,
    totalAngleCount: session.angles.length,
    currentAngleID: session.currentAngleID,
    status: session.status,
    productionReady: false,
    rawImageBytesStored: false,
    objectUrlsStored: false,
    recoveryNote:
      "This is metadata-only recovery context. Raw image bytes and object URLs are not stored; reselect or recapture images after a browser refresh.",
    angles: session.angles.map((angle) => ({
      angleID: angle.id,
      label: angle.label,
      status: angle.status,
      validationStatus: angle.validationStatus,
      fileName: angle.image?.fileName ?? null,
      fileType: angle.image?.fileType ?? null,
      fileSizeBytes: angle.image?.fileSizeBytes ?? null,
      width: angle.image?.width ?? null,
      height: angle.image?.height ?? null,
      source: angle.source ?? angle.image?.source ?? null,
      validationErrors: angle.validationErrors
    }))
  };
}

export function hasRecoverableCaptureProgress(snapshot: CaptureRecoverySnapshot | null): boolean {
  return Boolean(snapshot && (snapshot.completedAngleCount > 0 || snapshot.angles.some((angle) => angle.validationErrors.length > 0)));
}

export function createCaptureRecoveryStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): CaptureRecoveryStore {
  return {
    load() {
      const raw = storage.getItem(CAPTURE_RECOVERY_STORAGE_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as CaptureRecoverySnapshot;
        return parsed?.schemaVersion === OFFLINE_RECOVERY_VERSION ? parsed : null;
      } catch {
        return null;
      }
    },
    save(snapshot) {
      storage.setItem(CAPTURE_RECOVERY_STORAGE_KEY, JSON.stringify(stripObjectUrls(snapshot)));
    },
    clear() {
      storage.removeItem(CAPTURE_RECOVERY_STORAGE_KEY);
    }
  };
}

export function createUnsavedChangeMessage(input: { hasUnsavedChanges: boolean; workLabel: string }) {
  if (!input.hasUnsavedChanges) return null;
  return `${input.workLabel} has local draft changes. Leaving now may require rerunning validation or reselecting local files.`;
}

export function createChecksumRecoveryPlan(input: {
  path: string;
  errorMessage: string;
  failedAt?: ISODateString;
  retryAllowed?: boolean;
}): ChecksumRecoveryPlan {
  return {
    path: input.path,
    errorMessage: input.errorMessage,
    failedAt: input.failedAt ?? new Date().toISOString(),
    retryAllowed: input.retryAllowed ?? true,
    recommendedActions: [
      "Confirm the referenced file still exists and is readable.",
      "Rerun checksum or manifest validation after the local evidence drive is available.",
      "Do not publish or promote the draft while checksum validation is unresolved."
    ]
  };
}

function stripObjectUrls(snapshot: CaptureRecoverySnapshot): CaptureRecoverySnapshot {
  return {
    ...snapshot,
    rawImageBytesStored: false,
    objectUrlsStored: false
  };
}
