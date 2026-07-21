export type OperationalEventLevel = "info" | "warn" | "error";
export type OperationalEventCategory =
  | "healthCheck"
  | "catalogMonitor"
  | "deployment"
  | "rollback"
  | "privacyDeletion"
  | "clientError"
  | "serverError";

export interface OperationalLogEvent {
  schemaVersion: "privacy-safe-ops-log-v1";
  occurredAt: string;
  level: OperationalEventLevel;
  category: OperationalEventCategory;
  releaseID?: string;
  catalogVersionID?: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface OperationalLogValidation {
  ok: boolean;
  errors: string[];
}

const allowedMetadataKeys = new Set([
  "route",
  "statusCode",
  "durationMs",
  "catalogRecordCount",
  "recommendationsDisabled",
  "screenshotRefinementDisabled",
  "deploymentEnvironment",
  "rollbackTarget",
  "deletionScope"
]);

const prohibitedPatterns = [
  /raw/i,
  /image/i,
  /photo/i,
  /frame/i,
  /blob/i,
  /objectUrl/i,
  /dataUrl/i,
  /base64/i,
  /measurement/i,
  /geometry/i,
  /landmark/i,
  /embedding/i,
  /profile/i,
  /faceVector/i,
  /camera/i
];

const prohibitedStringPatterns = [/^data:image/i, /^blob:/i, /base64,/i];

export function createOperationalLogEvent(input: Omit<OperationalLogEvent, "schemaVersion" | "occurredAt">, now = new Date()): OperationalLogEvent {
  return {
    schemaVersion: "privacy-safe-ops-log-v1",
    occurredAt: now.toISOString(),
    ...input
  };
}

export function validateOperationalLogEvent(event: OperationalLogEvent): OperationalLogValidation {
  const errors: string[] = [];
  if (event.schemaVersion !== "privacy-safe-ops-log-v1") errors.push("Operational log schema version is unsupported.");
  if (Number.isNaN(Date.parse(event.occurredAt))) errors.push("Operational log timestamp is invalid.");
  if (event.message.length > 240) errors.push("Operational log message is too long for privacy-safe logging.");
  if (prohibitedPatterns.some((pattern) => pattern.test(event.message))) {
    errors.push("Operational log message appears to contain prohibited biometric or media content.");
  }

  for (const [key, value] of Object.entries(event.metadata ?? {})) {
    if (!allowedMetadataKeys.has(key)) errors.push(`Operational metadata key '${key}' is not allowed.`);
    if (prohibitedPatterns.some((pattern) => pattern.test(key))) {
      errors.push(`Operational metadata key '${key}' may contain prohibited biometric or media content.`);
    }
    if (typeof value === "string" && (value.length > 160 || prohibitedStringPatterns.some((pattern) => pattern.test(value)))) {
      errors.push(`Operational metadata value for '${key}' is not privacy-safe.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function createPrivacySafeErrorReport(error: unknown, context: Omit<OperationalLogEvent, "schemaVersion" | "occurredAt" | "level" | "message">): OperationalLogEvent {
  const message = error instanceof Error ? error.name : "UnknownError";
  return createOperationalLogEvent({
    ...context,
    level: "error",
    message: `Operational error captured: ${message}`
  });
}
