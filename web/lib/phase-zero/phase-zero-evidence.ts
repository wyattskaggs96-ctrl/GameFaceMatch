import type { CapturedAngleID, ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";
import { isSafeRepositoryRelativePath } from "@/lib/security/security-hardening";

export const PHASE0_EVIDENCE_SCHEMA_VERSION = "phase0-evidence-v1";
export const PHASE0_CAPTURE_LOG_SCHEMA_VERSION = "phase0-capture-log-v1";

export type Phase0EvidenceDerivativeState = "master" | "derivative";
export type Phase0EvidenceFileRole = "standardAngle" | "navigationEvidence" | "menuState" | "environment" | "review" | "checksumManifest" | "notes" | "other";
export type Phase0EvidenceCaptureMethod = "consoleScreenshot" | "captureCard" | "phonePhoto" | "screenRecording" | "manualEntry" | "export" | "unknown";
export type Phase0EvidenceView = CapturedAngleID | "navigationEvidence" | "menuOverview" | "environment" | "notApplicable";
export type Phase0CaptureLogActionKind =
  | "sessionStarted"
  | "settingSnapshot"
  | "evidenceCaptured"
  | "issueLogged"
  | "retakeRequested"
  | "retakeCompleted"
  | "verificationAction"
  | "sessionCompleted"
  | "sessionCancelled"
  | "note";

export interface Phase0EvidenceFileRecord {
  schemaVersion: typeof PHASE0_EVIDENCE_SCHEMA_VERSION;
  stableEvidenceID: Phase0EntityID;
  relativePath: string;
  derivativeState: Phase0EvidenceDerivativeState;
  fileRole: Phase0EvidenceFileRole;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  platformID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  mode: string;
  creationPathID: Phase0EntityID;
  environmentID: Phase0EntityID;
  catalogItemID: Phase0EntityID | null;
  view: Phase0EvidenceView;
  captureMethod: Phase0EvidenceCaptureMethod;
  captureDevice: string;
  capturedAt: ISODateString;
  researcherID: string;
  verifierID: string | null;
  verificationStatus: Phase0VerificationState;
  supersededEvidenceID: Phase0EntityID | null;
  notes: string;
}

export interface Phase0CaptureSettingSnapshot {
  snapshotID: Phase0EntityID;
  menuMapID: Phase0EntityID;
  menuItemID: Phase0EntityID;
  visibleLabelOrIndex: string;
  nativeOrder: number | null;
  canonicalValue: string | number | boolean | null;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0CaptureLogAction {
  actionID: Phase0EntityID;
  actionAt: ISODateString;
  actionKind: Phase0CaptureLogActionKind;
  operatorID: string;
  settingSnapshotIDs: Phase0EntityID[];
  generatedEvidenceIDs: Phase0EntityID[];
  issueIDs: Phase0EntityID[];
  retakeOfEvidenceID: Phase0EntityID | null;
  notes: string;
}

export interface Phase0CaptureLog {
  schemaVersion: typeof PHASE0_CAPTURE_LOG_SCHEMA_VERSION;
  captureLogID: Phase0EntityID;
  auditSessionID: Phase0EntityID;
  environmentID: Phase0EntityID;
  platformID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  mode: string;
  creationPathID: Phase0EntityID;
  catalogItemID: Phase0EntityID | null;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  primaryOperatorID: string;
  actions: Phase0CaptureLogAction[];
  settingSnapshots: Phase0CaptureSettingSnapshot[];
  generatedEvidenceIDs: Phase0EntityID[];
  issueIDs: Phase0EntityID[];
  retakeCount: number;
  notes: string;
}

export interface Phase0EvidenceValidationIssue {
  code: string;
  message: string;
  entityID?: string;
}

export interface Phase0EvidenceValidationReport {
  ok: boolean;
  errors: Phase0EvidenceValidationIssue[];
  warnings: Phase0EvidenceValidationIssue[];
}

export function validatePhase0EvidenceFile(record: Phase0EvidenceFileRecord): Phase0EvidenceValidationReport {
  const errors: Phase0EvidenceValidationIssue[] = [];
  const warnings: Phase0EvidenceValidationIssue[] = [];
  if (record.schemaVersion !== PHASE0_EVIDENCE_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_EVIDENCE_SCHEMA_VERSION}.`, record.stableEvidenceID));
  }
  for (const [field, value] of [
    ["stableEvidenceID", record.stableEvidenceID],
    ["relativePath", record.relativePath],
    ["sha256", record.sha256],
    ["mimeType", record.mimeType],
    ["mode", record.mode],
    ["captureDevice", record.captureDevice],
    ["researcherID", record.researcherID],
    ["notes", record.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingEvidenceField", `${record.stableEvidenceID || "evidence"} is missing ${field}.`, record.stableEvidenceID));
  }
  if (!isRelativePath(record.relativePath)) {
    errors.push(issue("absoluteProductionEvidencePath", `${record.stableEvidenceID} must use a repository-relative path, not an absolute path or URL.`, record.stableEvidenceID));
  }
  if (!/^[a-f0-9]{64}$/.test(record.sha256)) {
    errors.push(issue("invalidSha256", `${record.stableEvidenceID} requires a lowercase SHA-256 digest.`, record.stableEvidenceID));
  }
  if (!Number.isInteger(record.sizeBytes) || record.sizeBytes < 1) {
    errors.push(issue("invalidEvidenceSize", `${record.stableEvidenceID} sizeBytes must be a positive integer.`, record.stableEvidenceID));
  }
  if (!/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(record.mimeType)) {
    errors.push(issue("invalidMimeType", `${record.stableEvidenceID} has invalid MIME type metadata.`, record.stableEvidenceID));
  }
  if (!isISODate(record.capturedAt)) {
    errors.push(issue("invalidTimestamp", `${record.stableEvidenceID} capturedAt must be an ISO timestamp.`, record.stableEvidenceID));
  }
  if (record.verificationStatus === "verified" && !hasUsableText(record.verifierID ?? "")) {
    errors.push(issue("missingVerifier", `${record.stableEvidenceID} cannot be verified without verifierID.`, record.stableEvidenceID));
  }
  if (record.derivativeState === "derivative" && !hasUsableText(record.supersededEvidenceID ?? "")) {
    warnings.push(issue("derivativeWithoutMasterReference", `${record.stableEvidenceID} is derivative evidence without a supersededEvidenceID/master reference.`, record.stableEvidenceID));
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function validatePhase0CaptureLog(log: Phase0CaptureLog): Phase0EvidenceValidationReport {
  const errors: Phase0EvidenceValidationIssue[] = [];
  const warnings: Phase0EvidenceValidationIssue[] = [];
  if (log.schemaVersion !== PHASE0_CAPTURE_LOG_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_CAPTURE_LOG_SCHEMA_VERSION}.`, log.captureLogID));
  }
  for (const [field, value] of [
    ["captureLogID", log.captureLogID],
    ["auditSessionID", log.auditSessionID],
    ["environmentID", log.environmentID],
    ["mode", log.mode],
    ["primaryOperatorID", log.primaryOperatorID],
    ["notes", log.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingCaptureLogField", `${log.captureLogID || "capture log"} is missing ${field}.`, log.captureLogID));
  }
  if (!isISODate(log.startedAt) || (log.completedAt !== null && !isISODate(log.completedAt))) {
    errors.push(issue("invalidTimestamp", `${log.captureLogID} has invalid start or completion timestamp.`, log.captureLogID));
  }
  if (log.actions.length === 0) {
    errors.push(issue("missingCaptureLogActions", `${log.captureLogID} requires chronological actions.`, log.captureLogID));
  }
  validateChronology(log, errors);
  validateActionReferences(log, errors, warnings);
  if (!Number.isInteger(log.retakeCount) || log.retakeCount < 0) {
    errors.push(issue("invalidRetakeCount", `${log.captureLogID} retakeCount must be a nonnegative integer.`, log.captureLogID));
  }
  return { ok: errors.length === 0, errors, warnings };
}

function validateChronology(log: Phase0CaptureLog, errors: Phase0EvidenceValidationIssue[]) {
  let previousTime = Date.parse(log.startedAt);
  for (const action of log.actions) {
    if (!hasUsableText(action.actionID) || !hasUsableText(action.operatorID) || !hasUsableText(action.notes)) {
      errors.push(issue("invalidCaptureLogAction", `${log.captureLogID} has an incomplete action.`, action.actionID));
    }
    const actionTime = Date.parse(action.actionAt);
    if (Number.isNaN(actionTime)) {
      errors.push(issue("invalidTimestamp", `${action.actionID} has an invalid actionAt timestamp.`, action.actionID));
      continue;
    }
    if (actionTime < previousTime) {
      errors.push(issue("nonChronologicalCaptureLog", `${log.captureLogID} actions must be chronological.`, action.actionID));
    }
    previousTime = actionTime;
  }
  if (log.completedAt !== null && Date.parse(log.completedAt) < previousTime) {
    errors.push(issue("nonChronologicalCaptureLog", `${log.captureLogID} completedAt cannot precede the final action.`, log.captureLogID));
  }
}

function validateActionReferences(log: Phase0CaptureLog, errors: Phase0EvidenceValidationIssue[], warnings: Phase0EvidenceValidationIssue[]) {
  const snapshotIDs = new Set(log.settingSnapshots.map((snapshot) => snapshot.snapshotID));
  const generatedEvidenceFromActions = new Set<string>();
  const retakeActions = log.actions.filter((action) => action.actionKind === "retakeRequested" || action.actionKind === "retakeCompleted");
  for (const snapshot of log.settingSnapshots) {
    if (!hasUsableText(snapshot.snapshotID) || !hasUsableText(snapshot.visibleLabelOrIndex) || !hasUsableText(snapshot.notes)) {
      errors.push(issue("invalidSettingSnapshot", `${log.captureLogID} has an incomplete setting snapshot.`, snapshot.snapshotID));
    }
    if (snapshot.evidenceFileIDs.length === 0) {
      warnings.push(issue("settingSnapshotWithoutEvidence", `${snapshot.snapshotID} has no evidence references.`, snapshot.snapshotID));
    }
  }
  for (const action of log.actions) {
    for (const snapshotID of action.settingSnapshotIDs) {
      if (!snapshotIDs.has(snapshotID)) {
        errors.push(issue("missingSettingSnapshot", `${action.actionID} references missing setting snapshot ${snapshotID}.`, action.actionID));
      }
    }
    for (const evidenceID of action.generatedEvidenceIDs) generatedEvidenceFromActions.add(evidenceID);
    if ((action.actionKind === "retakeRequested" || action.actionKind === "retakeCompleted") && !hasUsableText(action.retakeOfEvidenceID ?? "")) {
      errors.push(issue("missingRetakeReference", `${action.actionID} must reference the evidence being retaken.`, action.actionID));
    }
  }
  for (const evidenceID of log.generatedEvidenceIDs) {
    if (!generatedEvidenceFromActions.has(evidenceID)) {
      warnings.push(issue("generatedEvidenceNotInActions", `${evidenceID} is listed on the log but not generated by an action.`, log.captureLogID));
    }
  }
  if (log.retakeCount !== retakeActions.length) {
    errors.push(issue("retakeCountMismatch", `${log.captureLogID} retakeCount must match retake actions.`, log.captureLogID));
  }
}

function isRelativePath(value: string) {
  return hasUsableText(value) && isSafeRepositoryRelativePath(value);
}

function isISODate(value: string) {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}

function issue(code: string, message: string, entityID?: string): Phase0EvidenceValidationIssue {
  return { code, message, entityID };
}
