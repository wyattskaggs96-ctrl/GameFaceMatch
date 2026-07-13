export const ANALYTICS_SCHEMA_VERSION = "privacy-safe-analytics-v1";

export type AnalyticsEventName =
  | "captureStarted"
  | "captureCompleted"
  | "captureAbandoned"
  | "qualityFailureCategory"
  | "retake"
  | "resultBlocked"
  | "catalogUnavailable"
  | "profileDeleted"
  | "refinementStarted"
  | "refinementCompleted";

export type AnalyticsCaptureMode = "webRgbGuided" | "manualUploadFallback" | "mixedRgb";
export type AnalyticsCaptureSource = "camera" | "upload" | "mixed" | "unknown";
export type AnalyticsQualityFailureCategory =
  | "missingRequiredAngle"
  | "unsupportedFormat"
  | "unreadableImage"
  | "imageTooSmall"
  | "imageTooLarge"
  | "exactDuplicate"
  | "poorLighting"
  | "blur"
  | "multipleFaces"
  | "faceNotFound"
  | "manualConfirmationMissing"
  | "unknown";
export type AnalyticsResultBlockReason = "catalogUnavailable" | "insufficientProfileData" | "matchingError" | "unsupportedCatalogVersion" | "unknown";
export type AnalyticsRefinementOutcome = "unavailable" | "completedWithLimitations" | "cancelled";

export interface AnalyticsPayload {
  captureMode?: AnalyticsCaptureMode;
  captureSource?: AnalyticsCaptureSource;
  completedAngleCount?: number;
  requiredAngleCount?: number;
  failedAngleCount?: number;
  retakeCount?: number;
  qualityFailureCategory?: AnalyticsQualityFailureCategory;
  resultBlockReason?: AnalyticsResultBlockReason;
  catalogVersionID?: string;
  catalogRecordCount?: number;
  profileSaved?: boolean;
  deletionScope?: "derivedProfile" | "savedProfile" | "allLocalData";
  refinementOutcome?: AnalyticsRefinementOutcome;
  usedUploadFallback?: boolean;
  usedExtendedHold?: boolean;
}

export interface AnalyticsEvent {
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  name: AnalyticsEventName;
  occurredAt: string;
  payload: AnalyticsPayload;
}

export interface AnalyticsValidationResult {
  ok: boolean;
  errors: string[];
}

export interface PrivacySafeAnalytics {
  track(name: AnalyticsEventName, payload?: AnalyticsPayload, now?: Date): AnalyticsValidationResult;
  getLocalEvents(): AnalyticsEvent[];
  clearLocalEvents(): void;
}

const allowedPayloadKeys = new Set<keyof AnalyticsPayload>([
  "captureMode",
  "captureSource",
  "completedAngleCount",
  "requiredAngleCount",
  "failedAngleCount",
  "retakeCount",
  "qualityFailureCategory",
  "resultBlockReason",
  "catalogVersionID",
  "catalogRecordCount",
  "profileSaved",
  "deletionScope",
  "refinementOutcome",
  "usedUploadFallback",
  "usedExtendedHold"
]);

const prohibitedKeyPatterns = [
  /raw/i,
  /image/i,
  /photo/i,
  /frame/i,
  /blob/i,
  /objectUrl/i,
  /dataUrl/i,
  /base64/i,
  /geometry/i,
  /measurement/i,
  /landmark/i,
  /embedding/i,
  /profileContent/i,
  /profilePayload/i,
  /faceVector/i,
  /cameraFrame/i
];

const prohibitedStringPatterns = [/^data:image/i, /^blob:/i, /base64,/i];

export function createNoopAnalytics(): PrivacySafeAnalytics {
  return {
    track(name, payload = {}, now = new Date()) {
      return validateAnalyticsEvent(createAnalyticsEvent(name, payload, now));
    },
    getLocalEvents() {
      return [];
    },
    clearLocalEvents() {
      // No-op by design.
    }
  };
}

export function createLocalAnalyticsRecorder(): PrivacySafeAnalytics {
  let events: AnalyticsEvent[] = [];
  return {
    track(name, payload = {}, now = new Date()) {
      const event = createAnalyticsEvent(name, payload, now);
      const validation = validateAnalyticsEvent(event);
      if (validation.ok) {
        events = [...events, event];
      }
      return validation;
    },
    getLocalEvents() {
      return events;
    },
    clearLocalEvents() {
      events = [];
    }
  };
}

export function createAnalyticsEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}, now = new Date()): AnalyticsEvent {
  return {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    name,
    occurredAt: now.toISOString(),
    payload
  };
}

export function validateAnalyticsEvent(event: AnalyticsEvent): AnalyticsValidationResult {
  const errors: string[] = [];

  if (event.schemaVersion !== ANALYTICS_SCHEMA_VERSION) errors.push("Analytics schema version is unsupported.");
  if (!isAllowedEventName(event.name)) errors.push("Analytics event name is not allowed.");
  if (Number.isNaN(Date.parse(event.occurredAt))) errors.push("Analytics event timestamp is invalid.");
  if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
    errors.push("Analytics payload must be an object.");
    return { ok: false, errors };
  }

  const payload = event.payload as Record<string, unknown>;
  for (const [key, value] of Object.entries(payload)) {
    if (!allowedPayloadKeys.has(key as keyof AnalyticsPayload)) {
      errors.push(`Analytics payload key '${key}' is not allowed.`);
    }
    if (prohibitedKeyPatterns.some((pattern) => pattern.test(key))) {
      errors.push(`Analytics payload key '${key}' is prohibited because it may contain face media, geometry, measurements, frames, or profile content.`);
    }
    if (!isSafeAnalyticsValue(value)) {
      errors.push(`Analytics payload value for '${key}' is not privacy-safe.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function assertAnalyticsProviderApproved(providerName: string | null | undefined) {
  return {
    approved: false,
    providerName: providerName ?? "none",
    reason: "No analytics provider is approved for the MVP. Use the local or no-op analytics implementation only."
  };
}

function isAllowedEventName(name: string): name is AnalyticsEventName {
  return [
    "captureStarted",
    "captureCompleted",
    "captureAbandoned",
    "qualityFailureCategory",
    "retake",
    "resultBlocked",
    "catalogUnavailable",
    "profileDeleted",
    "refinementStarted",
    "refinementCompleted"
  ].includes(name);
}

function isSafeAnalyticsValue(value: unknown): value is string | number | boolean | null | undefined {
  if (value === null || value === undefined || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  if (value.length > 160) return false;
  return !prohibitedStringPatterns.some((pattern) => pattern.test(value));
}
