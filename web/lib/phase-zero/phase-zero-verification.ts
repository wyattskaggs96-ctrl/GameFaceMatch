import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";

export const PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION = "phase0-second-person-verification-v1";
export const PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION = "phase0-discrepancy-resolution-v1";

export const approvedPhase0VerificationStatuses = [
  "VERIFIED",
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED",
  "NOT_VERIFIED"
] as const;

export type Phase0ApprovedVerificationStatus = (typeof approvedPhase0VerificationStatuses)[number];
export type Phase0VerificationScope = "catalogItem" | "menuMap" | "evidenceFile" | "captureLog" | "catalogPackage";
export type Phase0DiscrepancyType =
  | "none"
  | "labelMismatch"
  | "versionMismatch"
  | "missingEvidence"
  | "countMismatch"
  | "orderMismatch"
  | "dependencyUnresolved"
  | "captureQuality"
  | "menuNavigationMismatch"
  | "other";
export type Phase0ResolutionAction =
  | "acceptPrimaryObservation"
  | "acceptVerifierObservation"
  | "recaptureEvidence"
  | "splitByVersion"
  | "correctDraftRecord"
  | "markNotVerified"
  | "holdForResearch"
  | "retireRecord";

export interface Phase0ObservationSummary {
  observerID: string;
  observedAt: ISODateString;
  summary: string;
  evidenceIDs: Phase0EntityID[];
}

export interface Phase0SecondPersonVerificationRecord {
  schemaVersion: typeof PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION;
  verificationID: Phase0EntityID;
  targetStableID: string;
  verificationScope: Phase0VerificationScope;
  primaryObservation: Phase0ObservationSummary;
  verifierObservation: Phase0ObservationSummary;
  evidenceExists: boolean;
  frontViewExists: boolean;
  secondaryAngleSampleIncluded: boolean;
  randomizationMethod: string;
  discrepancyType: Phase0DiscrepancyType;
  resolutionAction: Phase0ResolutionAction;
  resolutionEvidenceIDs: Phase0EntityID[];
  primaryAcknowledgedAt: ISODateString | null;
  verifierAcknowledgedAt: ISODateString | null;
  finalDisposition: Phase0ApprovedVerificationStatus;
  notes: string;
}

export interface Phase0DiscrepancyResolutionRecord {
  schemaVersion: typeof PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION;
  discrepancyID: Phase0EntityID;
  verificationID: Phase0EntityID;
  targetStableID: string;
  verificationScope: Phase0VerificationScope;
  primaryObservation: Phase0ObservationSummary;
  verifierObservation: Phase0ObservationSummary;
  discrepancyType: Phase0DiscrepancyType;
  randomizationMethod: string;
  resolutionAction: Phase0ResolutionAction;
  resolutionEvidenceIDs: Phase0EntityID[];
  primaryAcknowledgedAt: ISODateString | null;
  verifierAcknowledgedAt: ISODateString | null;
  finalDisposition: Phase0ApprovedVerificationStatus;
  notes: string;
}

export interface Phase0VerificationValidationIssue {
  code: string;
  message: string;
  entityID?: string;
}

export interface Phase0VerificationValidationReport {
  ok: boolean;
  publishable: boolean;
  errors: Phase0VerificationValidationIssue[];
  warnings: Phase0VerificationValidationIssue[];
}

const approvedStatusSet = new Set<string>(approvedPhase0VerificationStatuses);

export function validatePhase0SecondPersonVerification(record: Phase0SecondPersonVerificationRecord): Phase0VerificationValidationReport {
  const errors: Phase0VerificationValidationIssue[] = [];
  const warnings: Phase0VerificationValidationIssue[] = [];
  if (record.schemaVersion !== PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION}.`, record.verificationID));
  }
  validateSharedVerificationFields(record, errors, warnings, record.verificationID);
  if (!record.evidenceExists) errors.push(issue("missingEvidence", `${record.verificationID} cannot publish without evidence.`, record.verificationID));
  if (!record.frontViewExists) errors.push(issue("missingFrontView", `${record.verificationID} cannot publish without front-view evidence.`, record.verificationID));
  if (!record.secondaryAngleSampleIncluded) {
    errors.push(issue("missingSecondaryAngleSample", `${record.verificationID} requires secondary-angle sample inclusion.`, record.verificationID));
  }
  return finalize(errors, warnings, record.finalDisposition);
}

export function validatePhase0DiscrepancyResolution(record: Phase0DiscrepancyResolutionRecord): Phase0VerificationValidationReport {
  const errors: Phase0VerificationValidationIssue[] = [];
  const warnings: Phase0VerificationValidationIssue[] = [];
  if (record.schemaVersion !== PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION}.`, record.discrepancyID));
  }
  validateSharedVerificationFields(record, errors, warnings, record.discrepancyID);
  if (record.discrepancyType === "none") {
    errors.push(issue("missingDiscrepancy", `${record.discrepancyID} must describe a real discrepancy.`, record.discrepancyID));
  }
  return finalize(errors, warnings, record.finalDisposition);
}

export function canPublishFromSecondPersonVerification(record: Phase0SecondPersonVerificationRecord) {
  return validatePhase0SecondPersonVerification(record).publishable;
}

function validateSharedVerificationFields(
  record: Phase0SecondPersonVerificationRecord | Phase0DiscrepancyResolutionRecord,
  errors: Phase0VerificationValidationIssue[],
  warnings: Phase0VerificationValidationIssue[],
  entityID: string
) {
  for (const [field, value] of [
    ["targetStableID", record.targetStableID],
    ["randomizationMethod", record.randomizationMethod],
    ["notes", record.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingVerificationField", `${entityID} is missing ${field}.`, entityID));
  }
  validateObservation(record.primaryObservation, "primaryObservation", errors, entityID);
  validateObservation(record.verifierObservation, "verifierObservation", errors, entityID);
  if (record.primaryObservation.observerID === record.verifierObservation.observerID) {
    errors.push(issue("sameReviewer", `${entityID} requires a verifier different from the primary observer.`, entityID));
  }
  if (!approvedStatusSet.has(record.finalDisposition)) {
    errors.push(issue("invalidVerificationStatus", `${entityID} has an unsupported final disposition.`, entityID));
  }
  if ((record.finalDisposition === "VERIFIED" || record.finalDisposition === "VERIFIED_WITH_NOTES") && record.discrepancyType !== "none" && record.resolutionEvidenceIDs.length === 0) {
    errors.push(issue("missingResolutionEvidence", `${entityID} needs resolution evidence before verified disposition.`, entityID));
  }
  if (!record.primaryAcknowledgedAt || !record.verifierAcknowledgedAt) {
    errors.push(issue("missingBothPartyAcknowledgment", `${entityID} requires both-party acknowledgment.`, entityID));
  } else if (!isISODate(record.primaryAcknowledgedAt) || !isISODate(record.verifierAcknowledgedAt)) {
    errors.push(issue("invalidAcknowledgmentTimestamp", `${entityID} has invalid acknowledgment timestamps.`, entityID));
  }
  if (record.finalDisposition === "VERIFIED_WITH_NOTES" && record.discrepancyType === "none") {
    warnings.push(issue("verifiedWithNotesWithoutDiscrepancy", `${entityID} is verified with notes but has no discrepancy type.`, entityID));
  }
}

function validateObservation(observation: Phase0ObservationSummary, label: string, errors: Phase0VerificationValidationIssue[], entityID: string) {
  if (!hasUsableText(observation.observerID) || !hasUsableText(observation.summary)) {
    errors.push(issue("invalidObservation", `${entityID} has incomplete ${label}.`, entityID));
  }
  if (!isISODate(observation.observedAt)) {
    errors.push(issue("invalidObservationTimestamp", `${entityID} has invalid ${label} timestamp.`, entityID));
  }
  if (observation.evidenceIDs.length === 0) {
    errors.push(issue("missingObservationEvidence", `${entityID} ${label} requires evidence references.`, entityID));
  }
}

function finalize(errors: Phase0VerificationValidationIssue[], warnings: Phase0VerificationValidationIssue[], finalDisposition: Phase0ApprovedVerificationStatus) {
  const publishable = errors.length === 0 && (finalDisposition === "VERIFIED" || finalDisposition === "VERIFIED_WITH_NOTES");
  return { ok: errors.length === 0, publishable, errors, warnings };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}

function isISODate(value: string) {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function issue(code: string, message: string, entityID?: string): Phase0VerificationValidationIssue {
  return { code, message, entityID };
}
