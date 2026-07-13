import type { ISODateString } from "@/types/domain";

export const PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION = "phase0-admin-audit-log-v1";
export const PHASE0_ADMIN_AUDIT_LOG_GENESIS_HASH = "GENESIS";

export const phase0AdminRoles = [
  "primaryResearcher",
  "evidenceCustodian",
  "catalogManager",
  "secondVerifier",
  "readOnlyReviewer",
  "developer"
] as const;

export type Phase0AdminRole = (typeof phase0AdminRoles)[number];

export const phase0MaterialActions = [
  "recordCreation",
  "edit",
  "evidenceAssociation",
  "verification",
  "rejection",
  "recaptureRequest",
  "import",
  "validation",
  "release",
  "rollback",
  "productionEnablement"
] as const;

export type Phase0MaterialAction = (typeof phase0MaterialActions)[number];

export type Phase0AuditTargetType =
  | "catalogRecord"
  | "evidenceFile"
  | "auditEnvironment"
  | "creationPath"
  | "menuMap"
  | "catalogPackage"
  | "validationRun"
  | "catalogRelease"
  | "rollback"
  | "productionGate"
  | "other";

export interface Phase0AuditActor {
  actorID: string;
  displayName?: string;
  roles: Phase0AdminRole[];
}

export interface Phase0AuditTarget {
  targetType: Phase0AuditTargetType;
  targetID: string;
}

export interface Phase0AdminAuditLogEntry {
  schemaVersion: typeof PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION;
  entryID: string;
  occurredAt: ISODateString;
  actor: Phase0AuditActor;
  action: Phase0MaterialAction;
  target: Phase0AuditTarget;
  summary: string;
  reason: string;
  relatedEntityIDs: string[];
  beforeChecksum: string | null;
  afterChecksum: string | null;
  metadata: Record<string, string | number | boolean | null>;
  previousEntryHash: string;
  entryHash: string;
}

export interface Phase0AdminAuditLogSnapshot {
  schemaVersion: typeof PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  entries: Phase0AdminAuditLogEntry[];
}

export interface Phase0AdminAuditLogInput {
  entryID: string;
  occurredAt: ISODateString;
  actor: Phase0AuditActor;
  action: Phase0MaterialAction;
  target: Phase0AuditTarget;
  summary: string;
  reason: string;
  relatedEntityIDs?: string[];
  beforeChecksum?: string | null;
  afterChecksum?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface Phase0AdminAuditLogValidationIssue {
  code:
    | "invalidSchemaVersion"
    | "missingEntryID"
    | "duplicateEntryID"
    | "invalidTimestamp"
    | "missingActorID"
    | "missingActorRole"
    | "invalidActorRole"
    | "invalidAction"
    | "roleNotPermitted"
    | "missingTarget"
    | "invalidTargetType"
    | "missingSummary"
    | "missingReason"
    | "invalidPreviousEntryHash"
    | "entryHashMismatch";
  message: string;
  entryID?: string;
}

export interface Phase0AdminAuditLogValidationReport {
  ok: boolean;
  errors: Phase0AdminAuditLogValidationIssue[];
  warnings: Phase0AdminAuditLogValidationIssue[];
}

export class Phase0AdminAuditLogError extends Error {
  readonly code: Phase0AdminAuditLogValidationIssue["code"];

  constructor(code: Phase0AdminAuditLogValidationIssue["code"], message: string) {
    super(message);
    this.name = "Phase0AdminAuditLogError";
    this.code = code;
  }
}

export const phase0RolePermissions: Readonly<Record<Phase0AdminRole, readonly Phase0MaterialAction[]>> = {
  primaryResearcher: ["recordCreation", "edit", "evidenceAssociation", "recaptureRequest", "validation"],
  evidenceCustodian: ["evidenceAssociation", "recaptureRequest", "validation"],
  catalogManager: ["import", "validation", "rejection", "release", "rollback", "productionEnablement"],
  secondVerifier: ["verification", "rejection", "recaptureRequest", "validation"],
  readOnlyReviewer: [],
  developer: ["validation"]
};

const targetTypes: readonly Phase0AuditTargetType[] = [
  "catalogRecord",
  "evidenceFile",
  "auditEnvironment",
  "creationPath",
  "menuMap",
  "catalogPackage",
  "validationRun",
  "catalogRelease",
  "rollback",
  "productionGate",
  "other"
];

export function createEmptyPhase0AdminAuditLogSnapshot(now: ISODateString): Phase0AdminAuditLogSnapshot {
  return {
    schemaVersion: PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    entries: []
  };
}

export function canRolePerformPhase0Action(role: Phase0AdminRole, action: Phase0MaterialAction): boolean {
  if (!phase0AdminRoles.includes(role)) return false;
  return phase0RolePermissions[role].includes(action);
}

export function canActorPerformPhase0Action(actor: Phase0AuditActor, action: Phase0MaterialAction): boolean {
  return actor.roles.some((role) => canRolePerformPhase0Action(role, action));
}

export async function recordPhase0AdminMaterialAction(
  snapshot: Phase0AdminAuditLogSnapshot,
  input: Phase0AdminAuditLogInput
): Promise<{ snapshot: Phase0AdminAuditLogSnapshot; entry: Phase0AdminAuditLogEntry }> {
  const baseEntry = normalizeAuditLogInput(snapshot, input);
  validateEntryShape(baseEntry);
  if (!canActorPerformPhase0Action(baseEntry.actor, baseEntry.action)) {
    throw new Phase0AdminAuditLogError("roleNotPermitted", `Actor ${baseEntry.actor.actorID} is not permitted to record ${baseEntry.action}.`);
  }

  const entry = {
    ...baseEntry,
    entryHash: await hashPhase0AdminAuditEntry(baseEntry)
  };
  const nextSnapshot = {
    ...snapshot,
    updatedAt: input.occurredAt,
    entries: [...snapshot.entries, entry]
  };
  const report = await validatePhase0AdminAuditLogSnapshot(nextSnapshot);
  if (!report.ok) {
    throw new Phase0AdminAuditLogError(report.errors[0].code, report.errors[0].message);
  }
  return { snapshot: nextSnapshot, entry };
}

export async function validatePhase0AdminAuditLogSnapshot(snapshot: Phase0AdminAuditLogSnapshot): Promise<Phase0AdminAuditLogValidationReport> {
  const errors: Phase0AdminAuditLogValidationIssue[] = [];
  if (snapshot.schemaVersion !== PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION) {
    errors.push({ code: "invalidSchemaVersion", message: "Audit-log snapshot schema version is not supported." });
  }
  if (!isValidISODate(snapshot.createdAt) || !isValidISODate(snapshot.updatedAt)) {
    errors.push({ code: "invalidTimestamp", message: "Audit-log snapshot timestamps must be valid ISO date strings." });
  }

  const seenEntryIDs = new Set<string>();
  for (const [index, entry] of snapshot.entries.entries()) {
    const shapeErrors = validateEntryShape(entry, false);
    errors.push(...shapeErrors);
    if (seenEntryIDs.has(entry.entryID)) {
      errors.push({ code: "duplicateEntryID", entryID: entry.entryID, message: `Duplicate audit-log entry ID: ${entry.entryID}.` });
    }
    seenEntryIDs.add(entry.entryID);
    const expectedPreviousHash = index === 0 ? PHASE0_ADMIN_AUDIT_LOG_GENESIS_HASH : snapshot.entries[index - 1].entryHash;
    if (entry.previousEntryHash !== expectedPreviousHash) {
      errors.push({
        code: "invalidPreviousEntryHash",
        entryID: entry.entryID,
        message: `Audit-log entry ${entry.entryID} does not point to the previous entry hash.`
      });
    }
    const expectedEntryHash = await hashPhase0AdminAuditEntry({ ...entry, entryHash: "" });
    if (entry.entryHash !== expectedEntryHash) {
      errors.push({ code: "entryHashMismatch", entryID: entry.entryID, message: `Audit-log entry ${entry.entryID} hash does not match its contents.` });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: []
  };
}

export function summarizePhase0AdminAuditLog(snapshot: Phase0AdminAuditLogSnapshot) {
  const actionCounts = Object.fromEntries(phase0MaterialActions.map((action) => [action, 0])) as Record<Phase0MaterialAction, number>;
  const roleCounts = Object.fromEntries(phase0AdminRoles.map((role) => [role, 0])) as Record<Phase0AdminRole, number>;
  for (const entry of snapshot.entries) {
    actionCounts[entry.action] += 1;
    for (const role of entry.actor.roles) {
      roleCounts[role] += 1;
    }
  }
  return {
    entryCount: snapshot.entries.length,
    actionCounts,
    roleCounts,
    latestEntryAt: snapshot.entries.at(-1)?.occurredAt ?? null
  };
}

async function hashPhase0AdminAuditEntry(entry: Omit<Phase0AdminAuditLogEntry, "entryHash"> | Phase0AdminAuditLogEntry): Promise<string> {
  const canonicalPayload = stableStringify({ ...entry, entryHash: undefined });
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalPayload));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeAuditLogInput(snapshot: Phase0AdminAuditLogSnapshot, input: Phase0AdminAuditLogInput): Phase0AdminAuditLogEntry {
  return {
    schemaVersion: PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION,
    entryID: input.entryID,
    occurredAt: input.occurredAt,
    actor: {
      ...input.actor,
      roles: dedupePhase0AdminRoles(input.actor.roles).sort()
    },
    action: input.action,
    target: input.target,
    summary: input.summary,
    reason: input.reason,
    relatedEntityIDs: dedupe(input.relatedEntityIDs ?? []).sort(),
    beforeChecksum: input.beforeChecksum ?? null,
    afterChecksum: input.afterChecksum ?? null,
    metadata: sanitizeMetadata(input.metadata ?? {}),
    previousEntryHash: snapshot.entries.at(-1)?.entryHash ?? PHASE0_ADMIN_AUDIT_LOG_GENESIS_HASH,
    entryHash: ""
  };
}

function validateEntryShape(entry: Phase0AdminAuditLogEntry, throwOnError = true): Phase0AdminAuditLogValidationIssue[] {
  const errors: Phase0AdminAuditLogValidationIssue[] = [];
  const push = (code: Phase0AdminAuditLogValidationIssue["code"], message: string) => {
    errors.push({ code, entryID: entry.entryID, message });
  };
  if (entry.schemaVersion !== PHASE0_ADMIN_AUDIT_LOG_SCHEMA_VERSION) push("invalidSchemaVersion", "Audit-log entry schema version is not supported.");
  if (!entry.entryID.trim()) push("missingEntryID", "Audit-log entry ID is required.");
  if (!isValidISODate(entry.occurredAt)) push("invalidTimestamp", `Audit-log entry ${entry.entryID} must include a valid ISO timestamp.`);
  if (!entry.actor.actorID.trim()) push("missingActorID", `Audit-log entry ${entry.entryID} must include a local actor ID.`);
  if (entry.actor.roles.length === 0) push("missingActorRole", `Audit-log entry ${entry.entryID} must include at least one local role.`);
  for (const role of entry.actor.roles) {
    if (!phase0AdminRoles.includes(role)) push("invalidActorRole", `Audit-log entry ${entry.entryID} uses unsupported role ${role}.`);
  }
  if (!phase0MaterialActions.includes(entry.action)) push("invalidAction", `Audit-log entry ${entry.entryID} uses unsupported action ${entry.action}.`);
  if (!canActorPerformPhase0Action(entry.actor, entry.action)) {
    push("roleNotPermitted", `Actor ${entry.actor.actorID} is not permitted to record ${entry.action}.`);
  }
  if (!entry.target.targetID.trim()) push("missingTarget", `Audit-log entry ${entry.entryID} must identify a target.`);
  if (!targetTypes.includes(entry.target.targetType)) push("invalidTargetType", `Audit-log entry ${entry.entryID} uses unsupported target type.`);
  if (!entry.summary.trim()) push("missingSummary", `Audit-log entry ${entry.entryID} must summarize the material action.`);
  if (!entry.reason.trim()) push("missingReason", `Audit-log entry ${entry.entryID} must state why the material action was taken.`);

  if (throwOnError && errors.length > 0) {
    throw new Phase0AdminAuditLogError(errors[0].code, errors[0].message);
  }
  return errors;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

function sanitizeMetadata(metadata: Record<string, string | number | boolean | null | undefined>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined)) as Record<string, string | number | boolean | null>;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function dedupePhase0AdminRoles(values: Phase0AdminRole[]): Phase0AdminRole[] {
  return [...new Set(values)];
}

function isValidISODate(value: string): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}
