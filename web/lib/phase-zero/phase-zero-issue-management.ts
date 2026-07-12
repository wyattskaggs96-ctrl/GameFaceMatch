import type { ISODateString } from "@/types/domain";
import type { CapturedAngleID } from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";

export const PHASE0_ISSUE_REGISTER_SCHEMA_VERSION = "phase0-issue-register-v1";

export type Phase0AuditIssueKind =
  | "missingEvidence"
  | "wrongOptionAssociation"
  | "countMismatch"
  | "orderMismatch"
  | "inconsistentFraming"
  | "inconsistentLighting"
  | "wrongCanonicalHair"
  | "wrongFacialHair"
  | "versionMismatch"
  | "platformMismatch"
  | "dependencyUncertainty"
  | "duplicateAmbiguity"
  | "corruptFile"
  | "unresolvedPath"
  | "recaptureRequired";

export type Phase0AuditIssueSeverity = "info" | "warning" | "blocking" | "critical";
export type Phase0AuditIssueStatus = "open" | "inReview" | "recaptureQueued" | "resolved" | "wontFix";
export type Phase0RecaptureQueueStatus = "notQueued" | "queued" | "captured" | "verified" | "cancelled";

export const PHASE0_AUDIT_ISSUE_KINDS: Phase0AuditIssueKind[] = [
  "missingEvidence",
  "wrongOptionAssociation",
  "countMismatch",
  "orderMismatch",
  "inconsistentFraming",
  "inconsistentLighting",
  "wrongCanonicalHair",
  "wrongFacialHair",
  "versionMismatch",
  "platformMismatch",
  "dependencyUncertainty",
  "duplicateAmbiguity",
  "corruptFile",
  "unresolvedPath",
  "recaptureRequired"
];

export interface Phase0RecaptureRequest {
  required: boolean;
  queueStatus: Phase0RecaptureQueueStatus;
  requestedAngles: CapturedAngleID[];
  requestedEvidenceKinds: string[];
  owner: string;
  priority: Phase0AuditIssueSeverity;
  notes: string;
}

export interface Phase0AuditIssue {
  issueID: Phase0EntityID;
  kind: Phase0AuditIssueKind;
  title: string;
  description: string;
  owner: string;
  severity: Phase0AuditIssueSeverity;
  status: Phase0AuditIssueStatus;
  affectedRecordIDs: Phase0EntityID[];
  affectedEvidenceFileIDs: Phase0EntityID[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  resolutionNotes: string;
  recaptureRequest: Phase0RecaptureRequest;
}

export interface Phase0IssueRegister {
  schemaVersion: typeof PHASE0_ISSUE_REGISTER_SCHEMA_VERSION;
  registerID: Phase0EntityID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  issues: Phase0AuditIssue[];
}

export interface Phase0IssueManagementIssue {
  code: string;
  message: string;
  issueID?: Phase0EntityID;
}

export interface Phase0IssueManagementValidationReport {
  ok: boolean;
  errors: Phase0IssueManagementIssue[];
  warnings: Phase0IssueManagementIssue[];
  unresolvedBlockingIssues: Phase0AuditIssue[];
  recaptureQueue: Phase0AuditIssue[];
  productionCompletionAllowed: boolean;
}

export interface Phase0IssueSummary {
  totalIssues: number;
  unresolvedIssues: number;
  unresolvedBlockingIssues: number;
  recaptureQueueCount: number;
  blockers: string[];
  nextAction: string | null;
}

export function createEmptyIssueRegister({
  registerID,
  nowISO
}: {
  registerID: Phase0EntityID;
  nowISO: ISODateString;
}): Phase0IssueRegister {
  return {
    schemaVersion: PHASE0_ISSUE_REGISTER_SCHEMA_VERSION,
    registerID,
    createdAt: nowISO,
    updatedAt: nowISO,
    issues: []
  };
}

export function createAuditIssue({
  issueID,
  kind,
  title,
  description,
  owner,
  severity,
  status,
  affectedRecordIDs,
  affectedEvidenceFileIDs,
  resolutionNotes,
  recaptureRequest,
  nowISO
}: {
  issueID: Phase0EntityID;
  kind: Phase0AuditIssueKind;
  title: string;
  description: string;
  owner: string;
  severity: Phase0AuditIssueSeverity;
  status: Phase0AuditIssueStatus;
  affectedRecordIDs: Phase0EntityID[];
  affectedEvidenceFileIDs: Phase0EntityID[];
  resolutionNotes: string;
  recaptureRequest: Phase0RecaptureRequest;
  nowISO: ISODateString;
}): Phase0AuditIssue {
  return {
    issueID: issueID.trim(),
    kind,
    title: title.trim(),
    description: description.trim(),
    owner: owner.trim(),
    severity,
    status,
    affectedRecordIDs: uniqueList(affectedRecordIDs),
    affectedEvidenceFileIDs: uniqueList(affectedEvidenceFileIDs),
    createdAt: nowISO,
    updatedAt: nowISO,
    resolutionNotes: resolutionNotes.trim(),
    recaptureRequest: normalizeRecaptureRequest(recaptureRequest)
  };
}

export function addAuditIssue(register: Phase0IssueRegister, issue: Phase0AuditIssue, updatedAt: ISODateString): Phase0IssueRegister {
  return {
    ...register,
    updatedAt,
    issues: [...register.issues, issue].sort((first, second) => first.createdAt.localeCompare(second.createdAt))
  };
}

export function resolveAuditIssue(
  register: Phase0IssueRegister,
  issueID: Phase0EntityID,
  resolutionNotes: string,
  updatedAt: ISODateString
): Phase0IssueRegister {
  return {
    ...register,
    updatedAt,
    issues: register.issues.map((issue) =>
      issue.issueID === issueID
        ? {
            ...issue,
            status: "resolved",
            updatedAt,
            resolutionNotes: resolutionNotes.trim()
          }
        : issue
    )
  };
}

export function validateIssueRegister(register: Phase0IssueRegister): Phase0IssueManagementValidationReport {
  const errors: Phase0IssueManagementIssue[] = [];
  const warnings: Phase0IssueManagementIssue[] = [];

  if (register.schemaVersion !== PHASE0_ISSUE_REGISTER_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_ISSUE_REGISTER_SCHEMA_VERSION}.`));
  }
  if (!hasUsableText(register.registerID)) {
    errors.push(issue("missingRegisterID", "Issue register requires a registerID."));
  }

  validateIssues(register.issues, errors, warnings);
  const unresolvedBlockingIssues = getUnresolvedBlockingIssues(register);
  const recaptureQueue = getRecaptureQueue(register);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    unresolvedBlockingIssues,
    recaptureQueue,
    productionCompletionAllowed: errors.length === 0 && unresolvedBlockingIssues.length === 0 && recaptureQueue.length === 0
  };
}

export function getUnresolvedBlockingIssues(register: Phase0IssueRegister): Phase0AuditIssue[] {
  return register.issues.filter((issue) => isUnresolved(issue) && (issue.severity === "blocking" || issue.severity === "critical"));
}

export function getRecaptureQueue(register: Phase0IssueRegister): Phase0AuditIssue[] {
  return register.issues.filter((issue) =>
    isUnresolved(issue) &&
    issue.recaptureRequest.required &&
    issue.recaptureRequest.queueStatus !== "verified" &&
    issue.recaptureRequest.queueStatus !== "cancelled"
  );
}

export function summarizeIssueRegister(register: Phase0IssueRegister): Phase0IssueSummary {
  const validation = validateIssueRegister(register);
  const unresolvedIssues = register.issues.filter(isUnresolved);
  const blockers = validation.unresolvedBlockingIssues.map((issue) => `${issue.title} (${issue.kind}) affects ${issue.affectedRecordIDs.join(", ")}.`);
  return {
    totalIssues: register.issues.length,
    unresolvedIssues: unresolvedIssues.length,
    unresolvedBlockingIssues: validation.unresolvedBlockingIssues.length,
    recaptureQueueCount: validation.recaptureQueue.length,
    blockers,
    nextAction: validation.recaptureQueue.length > 0
      ? "Complete queued recaptures and attach replacement evidence."
      : validation.unresolvedBlockingIssues.length > 0
        ? "Resolve blocking audit issues before catalog review can continue."
        : null
  };
}

function validateIssues(
  issues: Phase0AuditIssue[],
  errors: Phase0IssueManagementIssue[],
  warnings: Phase0IssueManagementIssue[]
) {
  const issueIDs = new Set<string>();
  for (const auditIssue of issues) {
    if (!PHASE0_AUDIT_ISSUE_KINDS.includes(auditIssue.kind)) {
      errors.push(issue("unsupportedIssueKind", `${auditIssue.issueID} uses an unsupported issue kind.`, auditIssue.issueID));
    }
    if (!hasUsableText(auditIssue.issueID)) {
      errors.push(issue("missingIssueID", "Audit issue requires issueID."));
    } else if (issueIDs.has(auditIssue.issueID)) {
      errors.push(issue("duplicateIssueID", `Duplicate audit issue ID ${auditIssue.issueID}.`, auditIssue.issueID));
    }
    issueIDs.add(auditIssue.issueID);
    for (const [field, value] of [
      ["title", auditIssue.title],
      ["description", auditIssue.description],
      ["owner", auditIssue.owner]
    ] as const) {
      if (!hasUsableText(value)) errors.push(issue("missingIssueField", `${auditIssue.issueID} requires ${field}.`, auditIssue.issueID));
    }
    if (auditIssue.affectedRecordIDs.length === 0) {
      errors.push(issue("missingAffectedRecord", `${auditIssue.issueID} requires at least one affected record.`, auditIssue.issueID));
    }
    if (auditIssue.affectedEvidenceFileIDs.length === 0) {
      errors.push(issue("missingIssueEvidence", `${auditIssue.issueID} requires evidence references.`, auditIssue.issueID));
    }
    if ((auditIssue.status === "resolved" || auditIssue.status === "wontFix") && !hasUsableText(auditIssue.resolutionNotes)) {
      errors.push(issue("missingResolutionNotes", `${auditIssue.issueID} requires resolution notes before closing.`, auditIssue.issueID));
    }
    validateRecaptureRequest(auditIssue, errors, warnings);
  }
}

function validateRecaptureRequest(
  auditIssue: Phase0AuditIssue,
  errors: Phase0IssueManagementIssue[],
  warnings: Phase0IssueManagementIssue[]
) {
  const request = auditIssue.recaptureRequest;
  if ((auditIssue.kind === "recaptureRequired" || auditIssue.status === "recaptureQueued") && !request.required) {
    errors.push(issue("missingRecaptureRequest", `${auditIssue.issueID} must include a recapture request.`, auditIssue.issueID));
  }
  if (request.required) {
    if (request.queueStatus === "notQueued" && isUnresolved(auditIssue)) {
      errors.push(issue("recaptureNotQueued", `${auditIssue.issueID} requires recapture but is not queued.`, auditIssue.issueID));
    }
    if (request.requestedAngles.length === 0 && request.requestedEvidenceKinds.length === 0) {
      errors.push(issue("missingRecaptureScope", `${auditIssue.issueID} recapture request needs angles or evidence kinds.`, auditIssue.issueID));
    }
    if (!hasUsableText(request.owner)) {
      errors.push(issue("missingRecaptureOwner", `${auditIssue.issueID} recapture request requires an owner.`, auditIssue.issueID));
    }
    if (!hasUsableText(request.notes)) {
      warnings.push(issue("missingRecaptureNotes", `${auditIssue.issueID} recapture request should explain what to capture.`, auditIssue.issueID));
    }
  }
}

function normalizeRecaptureRequest(request: Phase0RecaptureRequest): Phase0RecaptureRequest {
  return {
    required: request.required,
    queueStatus: request.required ? request.queueStatus : "notQueued",
    requestedAngles: uniqueList(request.requestedAngles) as CapturedAngleID[],
    requestedEvidenceKinds: uniqueList(request.requestedEvidenceKinds),
    owner: request.owner.trim(),
    priority: request.priority,
    notes: request.notes.trim()
  };
}

function isUnresolved(auditIssue: Phase0AuditIssue) {
  return auditIssue.status !== "resolved" && auditIssue.status !== "wontFix";
}

function uniqueList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function issue(code: string, message: string, issueID?: Phase0EntityID): Phase0IssueManagementIssue {
  return { code, message, issueID };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
