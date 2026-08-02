export const ANALYTICS_SCHEMA_VERSION = "privacy-safe-analytics-v1";

export type AnalyticsEventName =
  | "appSessionStarted"
  | "onboardingCompleted"
  | "scanEntryViewed"
  | "scanPlanSelected"
  | "scanConsentChanged"
  | "scanStartTapped"
  | "scanPurchaseStarted"
  | "scanPurchaseCompleted"
  | "scanPurchaseCanceled"
  | "scanPurchaseFailed"
  | "scanEntryBlocked"
  | "scanPreparationOpened"
  | "permissionAccepted"
  | "captureStarted"
  | "captureCompleted"
  | "captureAbandoned"
  | "qualityFailureCategory"
  | "retake"
  | "resultGenerated"
  | "resultBlocked"
  | "catalogUnavailable"
  | "topThreeViewed"
  | "recommendationSelected"
  | "buildGuideUsed"
  | "buildSaved"
  | "buildShared"
  | "deletionRequested"
  | "deletionCompleted"
  | "profileDeleted"
  | "refinementStarted"
  | "refinementCompleted"
  | "errorOccurred"
  | "latencyRecorded"
  | "crashReported";

export type AnalyticsCaptureMode = "webRgbGuided" | "manualUploadFallback" | "mixedRgb";
export type AnalyticsCaptureSource = "camera" | "upload" | "mixed" | "unknown";
export type AnalyticsPermissionKind = "camera" | "currentFaceAnalysis" | "temporaryProcessing" | "saveDerivedProfile" | "saveCompletedBuild";
export type AnalyticsPermissionOutcome = "accepted";
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
export type AnalyticsResultOutcome = "success" | "blocked" | "error" | "unavailable";
export type AnalyticsRefinementOutcome = "unavailable" | "completedWithLimitations" | "cancelled";
export type AnalyticsSaveTarget = "derivedProfile" | "completedBuild";
export type AnalyticsShareKind = "textOnlyBuildCard" | "disabledTestData" | "unavailable";
export type AnalyticsErrorCategory =
  | "cameraPermissionDenied"
  | "cameraUnavailable"
  | "unsupportedDevice"
  | "captureValidation"
  | "catalogUnavailable"
  | "catalogMismatch"
  | "processingFailure"
  | "saveFailure"
  | "shareFailure"
  | "deletionFailure"
  | "refinementFailure"
  | "unknown";
export type AnalyticsLatencyOperation = "captureSession" | "profileCreation" | "resultGeneration" | "screenshotRefinement" | "catalogLoad";
export type AnalyticsCrashCategory = "unhandledError" | "unhandledRejection" | "renderFailure" | "unknown";
export type AnalyticsScanPlan = "launch_pack" | "all_access_annual";
export type AnalyticsScanEntryGate =
  | "ready"
  | "missingPlan"
  | "missingConsent"
  | "billingNotConfigured"
  | "catalogUnavailable"
  | "previewNotAllowedInProduction"
  | "purchaseCancelled"
  | "purchaseFailed";

export interface AnalyticsPayload {
  onboardingStepCount?: number;
  permissionKind?: AnalyticsPermissionKind;
  permissionOutcome?: AnalyticsPermissionOutcome;
  captureMode?: AnalyticsCaptureMode;
  captureSource?: AnalyticsCaptureSource;
  completedAngleCount?: number;
  requiredAngleCount?: number;
  failedAngleCount?: number;
  retakeCount?: number;
  qualityFailureCategory?: AnalyticsQualityFailureCategory;
  resultOutcome?: AnalyticsResultOutcome;
  resultBlockReason?: AnalyticsResultBlockReason;
  catalogVersionID?: string;
  catalogRecordCount?: number;
  recommendationCount?: number;
  selectedRecommendationRank?: 1 | 2 | 3;
  topThreeVisible?: boolean;
  buildGuideStepCount?: number;
  profileSaved?: boolean;
  saveTarget?: AnalyticsSaveTarget;
  shareKind?: AnalyticsShareKind;
  deletionScope?: "activeCaptureSession" | "temporaryImages" | "derivedProfile" | "savedProfile" | "savedBuild" | "screenshotSession" | "allLocalData";
  refinementOutcome?: AnalyticsRefinementOutcome;
  errorCategory?: AnalyticsErrorCategory;
  latencyOperation?: AnalyticsLatencyOperation;
  latencyMs?: number;
  crashCategory?: AnalyticsCrashCategory;
  usedUploadFallback?: boolean;
  usedExtendedHold?: boolean;
  selectedScanPlan?: AnalyticsScanPlan;
  scanEntryGate?: AnalyticsScanEntryGate;
  consentKind?: AnalyticsPermissionKind | "ageEligibility" | "subjectPermission";
  consentGranted?: boolean;
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

export type AnalyticsDashboardMetricID =
  | "scanCompletion"
  | "retakeRate"
  | "qualityPassRate"
  | "recommendationSuccess"
  | "topOneSelection"
  | "topThreeSelection"
  | "screenshotRefinement"
  | "deletionSuccess"
  | "crashFreeSessions"
  | "processingLatency";

export interface AnalyticsDashboardMetric {
  id: AnalyticsDashboardMetricID;
  label: string;
  value: number | null;
  unit: "percent" | "count" | "milliseconds";
  numerator?: number;
  denominator?: number;
  sampleSize: number;
  description: string;
}

export interface AnalyticsDashboard {
  generatedAt: string;
  eventCount: number;
  providerConnected: false;
  privacyMode: "local-only";
  metrics: AnalyticsDashboardMetric[];
}

const allowedPayloadKeys = new Set<keyof AnalyticsPayload>([
  "onboardingStepCount",
  "permissionKind",
  "permissionOutcome",
  "captureMode",
  "captureSource",
  "completedAngleCount",
  "requiredAngleCount",
  "failedAngleCount",
  "retakeCount",
  "qualityFailureCategory",
  "resultOutcome",
  "resultBlockReason",
  "catalogVersionID",
  "catalogRecordCount",
  "recommendationCount",
  "selectedRecommendationRank",
  "topThreeVisible",
  "buildGuideStepCount",
  "profileSaved",
  "saveTarget",
  "shareKind",
  "deletionScope",
  "refinementOutcome",
  "errorCategory",
  "latencyOperation",
  "latencyMs",
  "crashCategory",
  "usedUploadFallback",
  "usedExtendedHold",
  "selectedScanPlan",
  "scanEntryGate",
  "consentKind",
  "consentGranted"
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
    if (key === "selectedRecommendationRank" && ![1, 2, 3].includes(value as number)) {
      errors.push("Analytics selected recommendation rank must be 1, 2, or 3.");
    }
    if (key === "latencyMs" && (typeof value !== "number" || value < 0 || value > 300_000)) {
      errors.push("Analytics latency must be a finite non-negative duration under five minutes.");
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

export function createAnalyticsDashboard(events: AnalyticsEvent[], now = new Date()): AnalyticsDashboard {
  const validEvents = events.filter((event) => validateAnalyticsEvent(event).ok);
  const captureStarted = countEvents(validEvents, "captureStarted");
  const captureCompleted = countEvents(validEvents, "captureCompleted");
  const qualityFailures = countEvents(validEvents, "qualityFailureCategory");
  const resultGenerated = validEvents.filter((event) => event.name === "resultGenerated");
  const successfulRecommendations = resultGenerated.filter((event) => event.payload.resultOutcome === "success").length;
  const topThreeViews = countEvents(validEvents, "topThreeViewed");
  const recommendationSelections = validEvents.filter((event) => event.name === "recommendationSelected");
  const topOneSelections = recommendationSelections.filter((event) => event.payload.selectedRecommendationRank === 1).length;
  const topThreeSelections = recommendationSelections.filter((event) => [1, 2, 3].includes(event.payload.selectedRecommendationRank ?? 0)).length;
  const refinementStarted = countEvents(validEvents, "refinementStarted");
  const refinementCompleted = countEvents(validEvents, "refinementCompleted");
  const deletionCompleted = countEvents(validEvents, "deletionCompleted") + countEvents(validEvents, "profileDeleted");
  const deletionFailures = validEvents.filter((event) => event.name === "errorOccurred" && event.payload.errorCategory === "deletionFailure").length;
  const appSessions = Math.max(countEvents(validEvents, "appSessionStarted"), 1);
  const crashes = countEvents(validEvents, "crashReported");
  const latencyEvents = validEvents.filter((event) => event.name === "latencyRecorded" && typeof event.payload.latencyMs === "number");
  const averageLatency =
    latencyEvents.length > 0
      ? Math.round(latencyEvents.reduce((sum, event) => sum + (event.payload.latencyMs ?? 0), 0) / latencyEvents.length)
      : null;

  return {
    generatedAt: now.toISOString(),
    eventCount: validEvents.length,
    providerConnected: false,
    privacyMode: "local-only",
    metrics: [
      rateMetric("scanCompletion", "Scan completion", captureCompleted, captureStarted, "Completed capture sessions divided by capture starts."),
      rateMetric("retakeRate", "Retake rate", countEvents(validEvents, "retake"), captureStarted, "Retake events divided by capture starts."),
      rateMetric(
        "qualityPassRate",
        "Quality pass rate",
        captureCompleted,
        captureCompleted + qualityFailures,
        "Completed captures divided by completed captures plus broad quality failures."
      ),
      rateMetric(
        "recommendationSuccess",
        "Recommendation success",
        successfulRecommendations,
        resultGenerated.length,
        "Successful verified recommendation generations divided by result-generation attempts."
      ),
      rateMetric("topOneSelection", "Top-one selection", topOneSelections, recommendationSelections.length, "Rank-one selections divided by all recorded selections."),
      rateMetric("topThreeSelection", "Top-three selection", topThreeSelections, topThreeViews, "Top-three rank selections divided by top-three result views."),
      rateMetric(
        "screenshotRefinement",
        "Screenshot refinement completion",
        refinementCompleted,
        refinementStarted,
        "Completed screenshot-refinement checks divided by screenshot-refinement starts."
      ),
      rateMetric(
        "deletionSuccess",
        "Deletion success",
        deletionCompleted,
        deletionCompleted + deletionFailures,
        "Successful local deletion events divided by successful deletions plus deletion failures."
      ),
      rateMetric("crashFreeSessions", "Crash-free sessions", Math.max(appSessions - crashes, 0), appSessions, "Local sessions without recorded crashes."),
      {
        id: "processingLatency",
        label: "Processing latency",
        value: averageLatency,
        unit: "milliseconds",
        sampleSize: latencyEvents.length,
        description: "Average local processing latency for permitted coarse operations."
      }
    ]
  };
}

function isAllowedEventName(name: string): name is AnalyticsEventName {
  return [
    "appSessionStarted",
    "onboardingCompleted",
    "scanEntryViewed",
    "scanPlanSelected",
    "scanConsentChanged",
    "scanStartTapped",
    "scanPurchaseStarted",
    "scanPurchaseCompleted",
    "scanPurchaseCanceled",
    "scanPurchaseFailed",
    "scanEntryBlocked",
    "scanPreparationOpened",
    "permissionAccepted",
    "captureStarted",
    "captureCompleted",
    "captureAbandoned",
    "qualityFailureCategory",
    "retake",
    "resultGenerated",
    "resultBlocked",
    "catalogUnavailable",
    "topThreeViewed",
    "recommendationSelected",
    "buildGuideUsed",
    "buildSaved",
    "buildShared",
    "deletionRequested",
    "deletionCompleted",
    "profileDeleted",
    "refinementStarted",
    "refinementCompleted",
    "errorOccurred",
    "latencyRecorded",
    "crashReported"
  ].includes(name);
}

function isSafeAnalyticsValue(value: unknown): value is string | number | boolean | null | undefined {
  if (value === null || value === undefined || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  if (value.length > 160) return false;
  return !prohibitedStringPatterns.some((pattern) => pattern.test(value));
}

function countEvents(events: AnalyticsEvent[], name: AnalyticsEventName) {
  return events.filter((event) => event.name === name).length;
}

function rateMetric(
  id: AnalyticsDashboardMetricID,
  label: string,
  numerator: number,
  denominator: number,
  description: string
): AnalyticsDashboardMetric {
  return {
    id,
    label,
    value: denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null,
    unit: "percent",
    numerator,
    denominator,
    sampleSize: denominator,
    description
  };
}
