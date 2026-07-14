import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import type { ScreenshotRefinementSession } from "@/lib/refinement/screenshot-refinement";
import type { ConsentID, ConsentState } from "@/lib/privacy/consent";
import { CONSENT_VERSION, getConsentDefinition, isConsentGranted } from "@/lib/privacy/consent";
import type { DeletionScope } from "./data-lifecycle";

export const RETENTION_POLICY_VERSION = "web-mvp-retention-v1";

export type RetentionEvent =
  | "frameSelectionCompleted"
  | "captureFrameRejected"
  | "profileCreated"
  | "refinementCompleted"
  | "retentionExpired"
  | "consentRevoked";

export interface RetentionAction {
  event: RetentionEvent;
  scope: DeletionScope;
  reason: string;
  objectUrlsToRevoke: string[];
  deletionAuditScope: DeletionScope;
}

export interface RejectedFrameReference {
  objectUrl?: string;
  fileName?: string;
}

export interface ExpirationJobInput {
  now: Date;
  captureSession?: ActiveCaptureSession;
  captureSessionExpiresAt?: Date | null;
  screenshotSession?: ScreenshotRefinementSession;
  screenshotSessionExpiresAt?: Date | null;
}

export interface DerivedProfileStoragePolicy {
  localOnlyByDefault: true;
  cloudSaveEnabled: boolean;
  cloudSaveRequiresConsentID: "cloudBackup";
  rawMediaIncluded: false;
  consentVersion: typeof CONSENT_VERSION;
}

const prohibitedDiagnosticKeys = [
  /raw/i,
  /image/i,
  /photo/i,
  /frame/i,
  /blob/i,
  /objecturl/i,
  /dataurl/i,
  /base64/i,
  /landmark/i,
  /geometry/i,
  /measurement/i,
  /embedding/i,
  /profilecontent/i,
  /profilepayload/i,
  /faceprofile/i,
  /facevector/i,
  /cameraframe/i
];

const prohibitedDiagnosticValues = [/data:image/i, /blob:/i, /base64,/i];

export function createFrameSelectionRetentionPlan(): RetentionAction[] {
  return [
    {
      event: "frameSelectionCompleted",
      scope: "raw-videos",
      reason: "Raw browser video streams are discarded after still-frame selection. The web MVP does not persist raw capture video.",
      objectUrlsToRevoke: [],
      deletionAuditScope: "raw-videos"
    }
  ];
}

export function createRejectedFrameRetentionPlan(frame: RejectedFrameReference): RetentionAction[] {
  return [
    {
      event: "captureFrameRejected",
      scope: "rejected-frames",
      reason: frame.fileName
        ? `Rejected frame ${frame.fileName} must be deleted immediately.`
        : "Rejected frames must be deleted immediately.",
      objectUrlsToRevoke: frame.objectUrl ? [frame.objectUrl] : [],
      deletionAuditScope: "rejected-frames"
    }
  ];
}

export function createProfileCreationRetentionPlan(session: ActiveCaptureSession): RetentionAction[] {
  const objectUrlsToRevoke = getCaptureObjectUrls(session);
  return [
    {
      event: "profileCreated",
      scope: "temporary-images",
      reason: "Selected raw capture frames are deleted after the standardized non-image profile is created.",
      objectUrlsToRevoke,
      deletionAuditScope: "temporary-images"
    }
  ];
}

export function createRefinementCompletionRetentionPlan(session: ScreenshotRefinementSession): RetentionAction[] {
  const objectUrlsToRevoke = getScreenshotObjectUrls(session);
  return [
    {
      event: "refinementCompleted",
      scope: "screenshot-session",
      reason: "Screenshot refinement intake media is deleted after the refinement check completes.",
      objectUrlsToRevoke,
      deletionAuditScope: "screenshot-session"
    }
  ];
}

export function createConsentRevocationRetentionPlan(consentID: ConsentID): RetentionAction[] {
  if (consentID === "saveDerivedProfile") {
    return [
      {
        event: "consentRevoked",
        scope: "saved-profiles",
        reason: "Revoking saved-profile consent removes locally saved derived profiles.",
        objectUrlsToRevoke: [],
        deletionAuditScope: "saved-profiles"
      }
    ];
  }
  if (consentID === "saveCompletedBuild") {
    return [
      {
        event: "consentRevoked",
        scope: "saved-builds",
        reason: "Revoking saved-build consent removes locally saved build records.",
        objectUrlsToRevoke: [],
        deletionAuditScope: "saved-builds"
      }
    ];
  }
  if (consentID === "saveScreenshots") {
    return [
      {
        event: "consentRevoked",
        scope: "screenshot-session",
        reason: "Revoking screenshot-saving consent removes screenshot refinement session media.",
        objectUrlsToRevoke: [],
        deletionAuditScope: "screenshot-session"
      }
    ];
  }
  return [];
}

export function runRetentionExpirationJob(input: ExpirationJobInput): RetentionAction[] {
  const actions: RetentionAction[] = [];
  if (input.captureSession && input.captureSessionExpiresAt && input.captureSessionExpiresAt.getTime() <= input.now.getTime()) {
    actions.push({
      event: "retentionExpired",
      scope: "active-capture-session",
      reason: "Active capture session retention expired.",
      objectUrlsToRevoke: getCaptureObjectUrls(input.captureSession),
      deletionAuditScope: "active-capture-session"
    });
  }
  if (input.screenshotSession && input.screenshotSessionExpiresAt && input.screenshotSessionExpiresAt.getTime() <= input.now.getTime()) {
    actions.push({
      event: "retentionExpired",
      scope: "screenshot-session",
      reason: "Screenshot refinement session retention expired.",
      objectUrlsToRevoke: getScreenshotObjectUrls(input.screenshotSession),
      deletionAuditScope: "screenshot-session"
    });
  }
  return actions;
}

export function removeRawImagesFromCaptureSession(session: ActiveCaptureSession): ActiveCaptureSession {
  return {
    ...session,
    angles: session.angles.map((angle) =>
      angle.image
        ? {
            ...angle,
            image: undefined
          }
        : angle
    ),
    updatedAt: new Date().toISOString()
  };
}

export function getDerivedProfileStoragePolicy(consentState: ConsentState): DerivedProfileStoragePolicy {
  return {
    localOnlyByDefault: true,
    cloudSaveEnabled: isCloudSaveEnabled(consentState),
    cloudSaveRequiresConsentID: "cloudBackup",
    rawMediaIncluded: false,
    consentVersion: CONSENT_VERSION
  };
}

export function isCloudSaveEnabled(consentState: ConsentState): boolean {
  const definition = getConsentDefinition("cloudBackup");
  return Boolean(definition?.available) && isConsentGranted(consentState, "cloudBackup");
}

export function isModelTrainingUseAllowed(consentState: ConsentState): boolean {
  const definition = getConsentDefinition("futureModelTraining");
  return Boolean(definition?.available) && isConsentGranted(consentState, "futureModelTraining");
}

export function validateDiagnosticLogPayload(payload: unknown): { allowed: boolean; blockedReasons: string[] } {
  const blockedReasons: string[] = [];

  function visit(value: unknown, path: string) {
    if (typeof value === "string") {
      prohibitedDiagnosticValues.forEach((pattern) => {
        if (pattern.test(value)) blockedReasons.push(`Diagnostic value at ${path} contains prohibited biometric media content.`);
      });
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      if (prohibitedDiagnosticKeys.some((pattern) => pattern.test(key))) {
        blockedReasons.push(`Diagnostic key ${path ? `${path}.` : ""}${key} is prohibited for biometric privacy.`);
      }
      visit(child, path ? `${path}.${key}` : key);
    });
  }

  visit(payload, "");
  return {
    allowed: blockedReasons.length === 0,
    blockedReasons: [...new Set(blockedReasons)]
  };
}

function getCaptureObjectUrls(session: ActiveCaptureSession) {
  return session.angles.flatMap((angle) => (angle.image?.objectUrl ? [angle.image.objectUrl] : []));
}

function getScreenshotObjectUrls(session: ScreenshotRefinementSession) {
  return session.slots.flatMap((slot) => (slot.screenshot?.objectUrl ? [slot.screenshot.objectUrl] : []));
}
