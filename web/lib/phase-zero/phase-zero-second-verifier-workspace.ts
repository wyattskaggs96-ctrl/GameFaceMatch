import type { ISODateString } from "@/types/domain";
import type {
  Phase0ApprovedVerificationStatus,
  Phase0DiscrepancyResolutionRecord,
  Phase0DiscrepancyType,
  Phase0ObservationSummary,
  Phase0ResolutionAction,
  Phase0SecondPersonVerificationRecord,
  Phase0VerificationScope
} from "./phase-zero-verification";
import {
  PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION,
  PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION,
  approvedPhase0VerificationStatuses,
  validatePhase0DiscrepancyResolution,
  validatePhase0SecondPersonVerification
} from "./phase-zero-verification";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";

export const PHASE0_SECOND_VERIFIER_WORKSPACE_SCHEMA_VERSION = "phase0-second-verifier-workspace-v1";

export type Phase0VerifierCheckStatus = "confirmed" | "mismatch" | "notChecked" | "notApplicable";
export type Phase0VerifierMismatchKind =
  | "environmentMismatch"
  | "menuCountMismatch"
  | "catalogCountMismatch"
  | "nativeOrderMismatch"
  | "recordMismatch"
  | "evidenceMismatch"
  | "frontViewMissing"
  | "secondaryAngleMissing"
  | "dependencyMismatch"
  | "exceptionMismatch";

export interface Phase0SecondVerifierEnvironmentEntry {
  verifierEnvironmentID: Phase0EntityID;
  verifierID: string;
  observedAt: ISODateString;
  platform: string;
  gameVersion: string;
  patchVersion: string;
  gameMode: string;
  creationPath: string;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0SecondVerifierCountCheck {
  checkID: Phase0EntityID;
  label: string;
  primaryCount: number;
  verifierCount: number | null;
  status: Phase0VerifierCheckStatus;
  notes: string;
}

export interface Phase0SecondVerifierRecordCheck {
  recordID: Phase0EntityID;
  stableInternalID: string;
  verificationScope: Phase0VerificationScope;
  primaryObservation: Phase0ObservationSummary;
  verifierObservation: Phase0ObservationSummary;
  nativeOrderStatus: Phase0VerifierCheckStatus;
  recordFieldsStatus: Phase0VerifierCheckStatus;
  evidenceFilesStatus: Phase0VerifierCheckStatus;
  frontViewStatus: Phase0VerifierCheckStatus;
  secondaryAngleStatus: Phase0VerifierCheckStatus;
  dependencyStatus: Phase0VerifierCheckStatus;
  exceptionStatus: Phase0VerifierCheckStatus;
  randomizationMethod: string;
  resolutionAction: Phase0ResolutionAction;
  resolutionEvidenceIDs: Phase0EntityID[];
  finalDisposition: Phase0ApprovedVerificationStatus;
  notes: string;
  primaryAcknowledgedAt: ISODateString | null;
  verifierAcknowledgedAt: ISODateString | null;
}

export interface Phase0SecondVerifierMismatchReport {
  mismatchID: Phase0EntityID;
  recordID: Phase0EntityID;
  stableInternalID: string;
  kind: Phase0VerifierMismatchKind;
  primaryValue: string;
  verifierValue: string;
  evidenceFileIDs: Phase0EntityID[];
  severity: "advisory" | "blocking";
  notes: string;
}

export type Phase0DiscrepancyWorkflowStatus = "awaitingEvidence" | "evidenceLinked" | "resolved" | "acknowledged";
export type Phase0DiscrepancyAuditEventKind =
  | "discrepancyOpened"
  | "directEvidenceLinked"
  | "recaptureLinked"
  | "supersededEvidencePreserved"
  | "resolutionRecorded"
  | "primaryAcknowledged"
  | "verifierAcknowledged"
  | "verificationStateUpdated";

export interface Phase0DiscrepancyAuditEvent {
  eventID: Phase0EntityID;
  kind: Phase0DiscrepancyAuditEventKind;
  occurredAt: ISODateString;
  actorID: string;
  affectedRecordIDs: Phase0EntityID[];
  evidenceFileIDs: Phase0EntityID[];
  supersededEvidenceFileIDs: Phase0EntityID[];
  summary: string;
}

export interface Phase0DiscrepancyResolutionWorkflow {
  workflowID: Phase0EntityID;
  discrepancyID: Phase0EntityID;
  openedAt: ISODateString;
  openedBy: string;
  affectedRecordIDs: Phase0EntityID[];
  affectedStableInternalIDs: string[];
  sourceMismatchIDs: Phase0EntityID[];
  primaryObservation: Phase0ObservationSummary;
  verifierObservation: Phase0ObservationSummary;
  discrepancyType: Phase0DiscrepancyType;
  status: Phase0DiscrepancyWorkflowStatus;
  requiredDirectEvidenceIDs: Phase0EntityID[];
  linkedRecaptureFileIDs: Phase0EntityID[];
  supersededEvidenceFileIDs: Phase0EntityID[];
  resolutionAction: Phase0ResolutionAction | null;
  finalResolution: string;
  finalDisposition: Phase0ApprovedVerificationStatus | null;
  verificationState: Phase0VerificationState;
  primaryAcknowledgedAt: ISODateString | null;
  verifierAcknowledgedAt: ISODateString | null;
  auditHistory: Phase0DiscrepancyAuditEvent[];
}

export interface Phase0SecondaryAngleEligibleCatalogRecord {
  stableInternalID: Phase0EntityID;
  category: string;
}

export interface Phase0SecondaryAngleSampleSeed {
  environmentID: Phase0EntityID;
  verifierID: string;
  catalogVersion: string;
}

export interface Phase0SecondaryAngleSampleSelection {
  stableInternalID: Phase0EntityID;
  category: string;
  hashInput: string;
  hash: string;
  categoryRank: number;
  categorySize: number;
  requiredCategorySampleSize: number;
}

export interface Phase0SecondaryAngleCategorySampleSummary {
  category: string;
  eligibleCount: number;
  requiredSampleSize: number;
  selectedCount: number;
  selectedStableInternalIDs: Phase0EntityID[];
}

export interface Phase0SecondaryAngleSampleReport {
  methodID: "deterministic-sha256-category-quartile-v1";
  methodDescription: string;
  seedInput: string;
  seed: Phase0SecondaryAngleSampleSeed;
  eligibleCount: number;
  selectedCount: number;
  categories: Phase0SecondaryAngleCategorySampleSummary[];
  selectedRecords: Phase0SecondaryAngleSampleSelection[];
  humanReadableReport: string;
}

export interface Phase0SecondVerifierWorkspace {
  schemaVersion: typeof PHASE0_SECOND_VERIFIER_WORKSPACE_SCHEMA_VERSION;
  workspaceID: Phase0EntityID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  environment: Phase0SecondVerifierEnvironmentEntry;
  menuCountChecks: Phase0SecondVerifierCountCheck[];
  catalogCountChecks: Phase0SecondVerifierCountCheck[];
  recordChecks: Phase0SecondVerifierRecordCheck[];
  mismatchReports: Phase0SecondVerifierMismatchReport[];
  discrepancyWorkflows: Phase0DiscrepancyResolutionWorkflow[];
  secondaryAngleSample: Phase0SecondaryAngleSampleReport | null;
  signedOffAt: ISODateString | null;
  signOffVerifierID: string | null;
  signOffNotes: string;
}

export interface Phase0SecondVerifierValidationIssue {
  code: string;
  message: string;
  entityID?: Phase0EntityID;
}

export interface Phase0SecondVerifierSummary {
  recordCount: number;
  independentlyCheckedRecords: number;
  countMismatches: number;
  recordMismatches: number;
  evidenceFailures: number;
  frontViewFailures: number;
  secondaryAngleFailures: number;
  dependencyOrExceptionFailures: number;
  blockingMismatchReports: number;
  unresolvedDiscrepancyWorkflows: number;
  signOffReady: boolean;
}

export interface Phase0SecondVerifierValidationReport {
  ok: boolean;
  signOffReady: boolean;
  errors: Phase0SecondVerifierValidationIssue[];
  warnings: Phase0SecondVerifierValidationIssue[];
  summary: Phase0SecondVerifierSummary;
}

const checkStatuses: Phase0VerifierCheckStatus[] = ["confirmed", "mismatch", "notChecked", "notApplicable"];
const mismatchKinds: Phase0VerifierMismatchKind[] = [
  "environmentMismatch",
  "menuCountMismatch",
  "catalogCountMismatch",
  "nativeOrderMismatch",
  "recordMismatch",
  "evidenceMismatch",
  "frontViewMissing",
  "secondaryAngleMissing",
  "dependencyMismatch",
  "exceptionMismatch"
];
const approvedStatusSet = new Set<string>(approvedPhase0VerificationStatuses);

export function createEmptySecondVerifierWorkspace(input: {
  workspaceID: Phase0EntityID;
  verifierID: string;
  nowISO: ISODateString;
}): Phase0SecondVerifierWorkspace {
  return {
    schemaVersion: PHASE0_SECOND_VERIFIER_WORKSPACE_SCHEMA_VERSION,
    workspaceID: input.workspaceID.trim(),
    createdAt: input.nowISO,
    updatedAt: input.nowISO,
    environment: {
      verifierEnvironmentID: `${input.workspaceID.trim()}-environment`,
      verifierID: input.verifierID.trim(),
      observedAt: input.nowISO,
      platform: "",
      gameVersion: "",
      patchVersion: "",
      gameMode: "",
      creationPath: "",
      evidenceFileIDs: [],
      notes: ""
    },
    menuCountChecks: [],
    catalogCountChecks: [],
    recordChecks: [],
    mismatchReports: [],
    discrepancyWorkflows: [],
    secondaryAngleSample: null,
    signedOffAt: null,
    signOffVerifierID: null,
    signOffNotes: ""
  };
}

export async function createDeterministicSecondaryAngleSample(input: {
  seed: Phase0SecondaryAngleSampleSeed;
  eligibleRecords: Phase0SecondaryAngleEligibleCatalogRecord[];
}): Promise<Phase0SecondaryAngleSampleReport> {
  const seedInput = `${input.seed.environmentID.trim()}+${input.seed.verifierID.trim()}+${input.seed.catalogVersion.trim()}`;
  const grouped = groupEligibleRecords(input.eligibleRecords);
  const categories: Phase0SecondaryAngleCategorySampleSummary[] = [];
  const selectedRecords: Phase0SecondaryAngleSampleSelection[] = [];

  for (const [category, records] of grouped.entries()) {
    const ranked = await Promise.all(records.map(async (record) => {
      const hashInput = `${seedInput}+${record.stableInternalID}`;
      return {
        stableInternalID: record.stableInternalID,
        category,
        hashInput,
        hash: await sha256Hex(hashInput)
      };
    }));
    ranked.sort((first, second) => first.hash.localeCompare(second.hash) || first.stableInternalID.localeCompare(second.stableInternalID));
    const requiredSampleSize = Math.ceil(ranked.length / 4);
    const selected = ranked.slice(0, requiredSampleSize).map((record, index): Phase0SecondaryAngleSampleSelection => ({
      ...record,
      categoryRank: index + 1,
      categorySize: ranked.length,
      requiredCategorySampleSize: requiredSampleSize
    }));
    selectedRecords.push(...selected);
    categories.push({
      category,
      eligibleCount: ranked.length,
      requiredSampleSize,
      selectedCount: selected.length,
      selectedStableInternalIDs: selected.map((record) => record.stableInternalID)
    });
  }

  selectedRecords.sort((first, second) => first.category.localeCompare(second.category) || first.categoryRank - second.categoryRank);
  categories.sort((first, second) => first.category.localeCompare(second.category));

  return {
    methodID: "deterministic-sha256-category-quartile-v1",
    methodDescription: "For each category, hash environment_id + verifier_id + catalog_version with every eligible catalog ID, sort by SHA-256 hash, and select the first required quartile.",
    seedInput,
    seed: {
      environmentID: input.seed.environmentID.trim(),
      verifierID: input.seed.verifierID.trim(),
      catalogVersion: input.seed.catalogVersion.trim()
    },
    eligibleCount: [...grouped.values()].reduce((total, records) => total + records.length, 0),
    selectedCount: selectedRecords.length,
    categories,
    selectedRecords,
    humanReadableReport: buildSecondaryAngleSampleReport(seedInput, categories, selectedRecords)
  };
}

export function applySecondaryAngleSampleToWorkspace(input: {
  workspace: Phase0SecondVerifierWorkspace;
  sample: Phase0SecondaryAngleSampleReport;
  updatedAt: ISODateString;
}): Phase0SecondVerifierWorkspace {
  return {
    ...input.workspace,
    updatedAt: input.updatedAt,
    secondaryAngleSample: input.sample,
    signedOffAt: null,
    signOffVerifierID: null,
    signOffNotes: ""
  };
}

export function createSecondVerifierCountCheck(input: {
  checkID: Phase0EntityID;
  label: string;
  primaryCount: number;
  verifierCount: number | null;
  notes?: string;
}): Phase0SecondVerifierCountCheck {
  const status = input.verifierCount === null ? "notChecked" : input.primaryCount === input.verifierCount ? "confirmed" : "mismatch";
  return {
    checkID: input.checkID.trim(),
    label: input.label.trim(),
    primaryCount: Math.max(0, Math.trunc(input.primaryCount)),
    verifierCount: input.verifierCount === null ? null : Math.max(0, Math.trunc(input.verifierCount)),
    status,
    notes: input.notes?.trim() ?? ""
  };
}

export function createSecondVerifierRecordCheck(input: {
  recordID: Phase0EntityID;
  stableInternalID: string;
  verificationScope?: Phase0VerificationScope;
  primaryObserverID: string;
  primarySummary: string;
  verifierObserverID: string;
  verifierSummary: string;
  evidenceIDs: Phase0EntityID[];
  observedAt: ISODateString;
  statuses?: Partial<Pick<
    Phase0SecondVerifierRecordCheck,
    "nativeOrderStatus" | "recordFieldsStatus" | "evidenceFilesStatus" | "frontViewStatus" | "secondaryAngleStatus" | "dependencyStatus" | "exceptionStatus"
  >>;
  randomizationMethod: string;
  resolutionAction?: Phase0ResolutionAction;
  resolutionEvidenceIDs?: Phase0EntityID[];
  finalDisposition: Phase0ApprovedVerificationStatus;
  notes?: string;
  primaryAcknowledgedAt?: ISODateString | null;
  verifierAcknowledgedAt?: ISODateString | null;
}): Phase0SecondVerifierRecordCheck {
  return {
    recordID: input.recordID.trim(),
    stableInternalID: input.stableInternalID.trim(),
    verificationScope: input.verificationScope ?? "catalogItem",
    primaryObservation: observation(input.primaryObserverID, input.observedAt, input.primarySummary, input.evidenceIDs),
    verifierObservation: observation(input.verifierObserverID, input.observedAt, input.verifierSummary, input.evidenceIDs),
    nativeOrderStatus: input.statuses?.nativeOrderStatus ?? "notChecked",
    recordFieldsStatus: input.statuses?.recordFieldsStatus ?? "notChecked",
    evidenceFilesStatus: input.statuses?.evidenceFilesStatus ?? "notChecked",
    frontViewStatus: input.statuses?.frontViewStatus ?? "notChecked",
    secondaryAngleStatus: input.statuses?.secondaryAngleStatus ?? "notChecked",
    dependencyStatus: input.statuses?.dependencyStatus ?? "notApplicable",
    exceptionStatus: input.statuses?.exceptionStatus ?? "notApplicable",
    randomizationMethod: input.randomizationMethod.trim(),
    resolutionAction: input.resolutionAction ?? "acceptPrimaryObservation",
    resolutionEvidenceIDs: uniqueList(input.resolutionEvidenceIDs ?? []),
    finalDisposition: input.finalDisposition,
    notes: input.notes?.trim() ?? "",
    primaryAcknowledgedAt: input.primaryAcknowledgedAt ?? null,
    verifierAcknowledgedAt: input.verifierAcknowledgedAt ?? null
  };
}

export function addSecondVerifierRecordCheck(
  workspace: Phase0SecondVerifierWorkspace,
  recordCheck: Phase0SecondVerifierRecordCheck,
  updatedAt: ISODateString
): Phase0SecondVerifierWorkspace {
  const recordChecks = [
    ...workspace.recordChecks.filter((record) => record.recordID !== recordCheck.recordID),
    recordCheck
  ].sort((first, second) => first.stableInternalID.localeCompare(second.stableInternalID));
  return {
    ...workspace,
    updatedAt,
    recordChecks,
    mismatchReports: buildMismatchReports(recordChecks),
    discrepancyWorkflows: workspace.discrepancyWorkflows ?? [],
    signedOffAt: null,
    signOffVerifierID: null,
    signOffNotes: ""
  };
}

export function openDiscrepancyResolutionWorkflow(input: {
  workspace: Phase0SecondVerifierWorkspace;
  mismatchID: Phase0EntityID;
  openedBy: string;
  openedAt: ISODateString;
}): Phase0SecondVerifierWorkspace {
  const mismatch = input.workspace.mismatchReports.find((report) => report.mismatchID === input.mismatchID);
  const record = mismatch ? input.workspace.recordChecks.find((recordCheck) => recordCheck.recordID === mismatch.recordID) : null;
  if (!mismatch || !record) return input.workspace;
  const workflowID = `${mismatch.mismatchID}-resolution`;
  const existing = (input.workspace.discrepancyWorkflows ?? []).find((workflow) => workflow.workflowID === workflowID);
  if (existing) return input.workspace;
  const workflow: Phase0DiscrepancyResolutionWorkflow = {
    workflowID,
    discrepancyID: `${mismatch.mismatchID}-discrepancy`,
    openedAt: input.openedAt,
    openedBy: input.openedBy.trim(),
    affectedRecordIDs: uniqueList([record.recordID]),
    affectedStableInternalIDs: uniqueList([record.stableInternalID]),
    sourceMismatchIDs: uniqueList([mismatch.mismatchID]),
    primaryObservation: cloneObservation(record.primaryObservation),
    verifierObservation: cloneObservation(record.verifierObservation),
    discrepancyType: discrepancyTypeForMismatchReport(mismatch),
    status: "awaitingEvidence",
    requiredDirectEvidenceIDs: [],
    linkedRecaptureFileIDs: [],
    supersededEvidenceFileIDs: mismatch.evidenceFileIDs,
    resolutionAction: null,
    finalResolution: "",
    finalDisposition: null,
    verificationState: "secondReviewPending",
    primaryAcknowledgedAt: null,
    verifierAcknowledgedAt: null,
    auditHistory: [auditEvent({
      workflowID,
      sequence: 1,
      kind: "discrepancyOpened",
      occurredAt: input.openedAt,
      actorID: input.openedBy,
      affectedRecordIDs: [record.recordID],
      evidenceFileIDs: mismatch.evidenceFileIDs,
      supersededEvidenceFileIDs: mismatch.evidenceFileIDs,
      summary: `Opened discrepancy for ${record.stableInternalID}: ${mismatch.kind}.`
    })]
  };
  return upsertDiscrepancyResolutionWorkflow({
    workspace: input.workspace,
    workflow,
    updatedAt: input.openedAt
  });
}

export function linkDiscrepancyResolutionEvidence(input: {
  workflow: Phase0DiscrepancyResolutionWorkflow;
  actorID: string;
  occurredAt: ISODateString;
  directEvidenceIDs: Phase0EntityID[];
  recaptureFileIDs: Phase0EntityID[];
  supersededEvidenceFileIDs: Phase0EntityID[];
}): Phase0DiscrepancyResolutionWorkflow {
  const directEvidenceIDs = uniqueList([...input.workflow.requiredDirectEvidenceIDs, ...input.directEvidenceIDs]);
  const recaptureFileIDs = uniqueList([...input.workflow.linkedRecaptureFileIDs, ...input.recaptureFileIDs]);
  const supersededEvidenceFileIDs = uniqueList([...input.workflow.supersededEvidenceFileIDs, ...input.supersededEvidenceFileIDs]);
  const history = [...input.workflow.auditHistory];
  if (input.directEvidenceIDs.length > 0) {
    history.push(auditEvent({
      workflowID: input.workflow.workflowID,
      sequence: history.length + 1,
      kind: "directEvidenceLinked",
      occurredAt: input.occurredAt,
      actorID: input.actorID,
      affectedRecordIDs: input.workflow.affectedRecordIDs,
      evidenceFileIDs: input.directEvidenceIDs,
      supersededEvidenceFileIDs: [],
      summary: "Linked new direct evidence for discrepancy resolution."
    }));
  }
  if (input.recaptureFileIDs.length > 0) {
    history.push(auditEvent({
      workflowID: input.workflow.workflowID,
      sequence: history.length + 1,
      kind: "recaptureLinked",
      occurredAt: input.occurredAt,
      actorID: input.actorID,
      affectedRecordIDs: input.workflow.affectedRecordIDs,
      evidenceFileIDs: input.recaptureFileIDs,
      supersededEvidenceFileIDs: [],
      summary: "Linked recapture files for discrepancy resolution."
    }));
  }
  if (input.supersededEvidenceFileIDs.length > 0) {
    history.push(auditEvent({
      workflowID: input.workflow.workflowID,
      sequence: history.length + 1,
      kind: "supersededEvidencePreserved",
      occurredAt: input.occurredAt,
      actorID: input.actorID,
      affectedRecordIDs: input.workflow.affectedRecordIDs,
      evidenceFileIDs: [],
      supersededEvidenceFileIDs: input.supersededEvidenceFileIDs,
      summary: "Preserved superseded evidence references instead of overwriting them."
    }));
  }
  return {
    ...input.workflow,
    requiredDirectEvidenceIDs: directEvidenceIDs,
    linkedRecaptureFileIDs: recaptureFileIDs,
    supersededEvidenceFileIDs,
    status: "evidenceLinked",
    auditHistory: history
  };
}

export function recordDiscrepancyFinalResolution(input: {
  workflow: Phase0DiscrepancyResolutionWorkflow;
  actorID: string;
  occurredAt: ISODateString;
  resolutionAction: Phase0ResolutionAction;
  finalResolution: string;
  finalDisposition: Phase0ApprovedVerificationStatus;
  verificationState: Phase0VerificationState;
}): Phase0DiscrepancyResolutionWorkflow {
  const resolutionEvent = auditEvent({
    workflowID: input.workflow.workflowID,
    sequence: input.workflow.auditHistory.length + 1,
    kind: "resolutionRecorded",
    occurredAt: input.occurredAt,
    actorID: input.actorID,
    affectedRecordIDs: input.workflow.affectedRecordIDs,
    evidenceFileIDs: uniqueList([...input.workflow.requiredDirectEvidenceIDs, ...input.workflow.linkedRecaptureFileIDs]),
    supersededEvidenceFileIDs: input.workflow.supersededEvidenceFileIDs,
    summary: input.finalResolution.trim()
  });
  const stateEvent = auditEvent({
    workflowID: input.workflow.workflowID,
    sequence: input.workflow.auditHistory.length + 2,
    kind: "verificationStateUpdated",
    occurredAt: input.occurredAt,
    actorID: input.actorID,
    affectedRecordIDs: input.workflow.affectedRecordIDs,
    evidenceFileIDs: [],
    supersededEvidenceFileIDs: [],
    summary: `Verification state updated to ${input.verificationState}; final disposition ${input.finalDisposition}.`
  });
  return {
    ...input.workflow,
    resolutionAction: input.resolutionAction,
    finalResolution: input.finalResolution.trim(),
    finalDisposition: input.finalDisposition,
    verificationState: input.verificationState,
    status: "resolved",
    auditHistory: [...input.workflow.auditHistory, resolutionEvent, stateEvent]
  };
}

export function acknowledgeDiscrepancyResolution(input: {
  workflow: Phase0DiscrepancyResolutionWorkflow;
  party: "primary" | "verifier";
  actorID: string;
  occurredAt: ISODateString;
}): Phase0DiscrepancyResolutionWorkflow {
  const eventKind = input.party === "primary" ? "primaryAcknowledged" : "verifierAcknowledged";
  const nextWorkflow = {
    ...input.workflow,
    primaryAcknowledgedAt: input.party === "primary" ? input.occurredAt : input.workflow.primaryAcknowledgedAt,
    verifierAcknowledgedAt: input.party === "verifier" ? input.occurredAt : input.workflow.verifierAcknowledgedAt,
    auditHistory: [
      ...input.workflow.auditHistory,
      auditEvent({
        workflowID: input.workflow.workflowID,
        sequence: input.workflow.auditHistory.length + 1,
        kind: eventKind,
        occurredAt: input.occurredAt,
        actorID: input.actorID,
        affectedRecordIDs: input.workflow.affectedRecordIDs,
        evidenceFileIDs: [],
        supersededEvidenceFileIDs: [],
        summary: `${input.party} party acknowledged the discrepancy resolution.`
      })
    ]
  };
  return {
    ...nextWorkflow,
    status: nextWorkflow.primaryAcknowledgedAt && nextWorkflow.verifierAcknowledgedAt ? "acknowledged" : nextWorkflow.status
  };
}

export function upsertDiscrepancyResolutionWorkflow(input: {
  workspace: Phase0SecondVerifierWorkspace;
  workflow: Phase0DiscrepancyResolutionWorkflow;
  updatedAt: ISODateString;
}): Phase0SecondVerifierWorkspace {
  const workflows = [
    ...(input.workspace.discrepancyWorkflows ?? []).filter((workflow) => workflow.workflowID !== input.workflow.workflowID),
    input.workflow
  ].sort((first, second) => first.workflowID.localeCompare(second.workflowID));
  const workspaceWithWorkflow = {
    ...input.workspace,
    updatedAt: input.updatedAt,
    discrepancyWorkflows: workflows,
    signedOffAt: null,
    signOffVerifierID: null,
    signOffNotes: ""
  };
  return applyResolvedDiscrepancyWorkflows(workspaceWithWorkflow);
}

export function validateDiscrepancyResolutionWorkflow(workflow: Phase0DiscrepancyResolutionWorkflow): Phase0SecondVerifierValidationReport {
  const errors: Phase0SecondVerifierValidationIssue[] = [];
  const warnings: Phase0SecondVerifierValidationIssue[] = [];
  validateDiscrepancyWorkflowFields(workflow, errors, warnings);
  return {
    ok: errors.length === 0,
    signOffReady: errors.length === 0 && isDiscrepancyWorkflowProductionResolved(workflow),
    errors,
    warnings,
    summary: emptySummary()
  };
}

export function exportDiscrepancyResolutionRecords(workspace: Phase0SecondVerifierWorkspace): Phase0DiscrepancyResolutionRecord[] {
  return (workspace.discrepancyWorkflows ?? [])
    .filter((workflow) => workflow.finalDisposition && workflow.resolutionAction)
    .map((workflow) => ({
      schemaVersion: PHASE0_DISCREPANCY_RESOLUTION_SCHEMA_VERSION,
      discrepancyID: workflow.discrepancyID,
      verificationID: `${workspace.workspaceID}-${workflow.affectedRecordIDs[0] ?? workflow.workflowID}-second-verification`,
      targetStableID: workflow.affectedStableInternalIDs[0] ?? "",
      verificationScope: "catalogItem",
      primaryObservation: workflow.primaryObservation,
      verifierObservation: workflow.verifierObservation,
      discrepancyType: workflow.discrepancyType,
      randomizationMethod: workflow.sourceMismatchIDs.join(", "),
      resolutionAction: workflow.resolutionAction ?? "holdForResearch",
      resolutionEvidenceIDs: uniqueList([...workflow.requiredDirectEvidenceIDs, ...workflow.linkedRecaptureFileIDs]),
      primaryAcknowledgedAt: workflow.primaryAcknowledgedAt,
      verifierAcknowledgedAt: workflow.verifierAcknowledgedAt,
      finalDisposition: workflow.finalDisposition ?? "NOT_VERIFIED",
      notes: workflow.finalResolution
    }));
}

export function validateSecondVerifierWorkspace(workspace: Phase0SecondVerifierWorkspace): Phase0SecondVerifierValidationReport {
  const errors: Phase0SecondVerifierValidationIssue[] = [];
  const warnings: Phase0SecondVerifierValidationIssue[] = [];
  const resolvedMismatchIDs = resolvedProductionMismatchIDs(workspace);

  if (workspace.schemaVersion !== PHASE0_SECOND_VERIFIER_WORKSPACE_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_SECOND_VERIFIER_WORKSPACE_SCHEMA_VERSION}.`, workspace.workspaceID));
  }
  if (!hasUsableText(workspace.workspaceID)) errors.push(issue("missingWorkspaceID", "Second-verifier workspace requires a workspace ID."));
  validateVerifierEnvironment(workspace.environment, errors);
  validateCountChecks(workspace.menuCountChecks, "menuCount", errors, warnings);
  validateCountChecks(workspace.catalogCountChecks, "catalogCount", errors, warnings);

  const recordIDs = new Set<string>();
  for (const record of workspace.recordChecks) {
    validateRecordCheck(record, errors, warnings, resolvedMismatchIDs);
    if (recordIDs.has(record.recordID)) errors.push(issue("duplicateRecordCheck", `${record.recordID} appears more than once.`, record.recordID));
    recordIDs.add(record.recordID);
  }

  for (const report of workspace.mismatchReports) validateMismatchReport(report, errors);
  for (const workflow of workspace.discrepancyWorkflows ?? []) validateDiscrepancyWorkflowFields(workflow, errors, warnings);

  const summary = summarizeSecondVerifierWorkspace(workspace);
  const signedOff = Boolean(workspace.signedOffAt || workspace.signOffVerifierID || workspace.signOffNotes);
  if (signedOff) {
    if (!summary.signOffReady) errors.push(issue("signOffBlocked", "Second-verifier sign-off is blocked until independent checks and mandatory gates pass.", workspace.workspaceID));
    if (!workspace.signedOffAt || !isISODate(workspace.signedOffAt)) errors.push(issue("invalidSignOffTimestamp", "Second-verifier sign-off requires a valid timestamp.", workspace.workspaceID));
    if (!hasUsableText(workspace.signOffVerifierID ?? "")) errors.push(issue("missingSignOffVerifier", "Second-verifier sign-off requires a verifier ID.", workspace.workspaceID));
  }

  return {
    ok: errors.length === 0,
    signOffReady: errors.length === 0 && summary.signOffReady,
    errors,
    warnings,
    summary
  };
}

export function summarizeSecondVerifierWorkspace(workspace: Phase0SecondVerifierWorkspace): Phase0SecondVerifierSummary {
  const resolvedMismatchIDs = resolvedProductionMismatchIDs(workspace);
  const countMismatches = [...workspace.menuCountChecks, ...workspace.catalogCountChecks].filter((check) => check.status === "mismatch").length;
  const recordMismatches = workspace.recordChecks.filter((record) =>
    (record.recordFieldsStatus === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, "recordFieldsStatus"))) ||
    record.recordFieldsStatus === "notChecked" ||
    (record.nativeOrderStatus === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, "nativeOrderStatus"))) ||
    record.nativeOrderStatus === "notChecked"
  ).length;
  const evidenceFailures = workspace.recordChecks.filter((record) =>
    (record.evidenceFilesStatus === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, "evidenceFilesStatus"))) ||
    record.evidenceFilesStatus === "notChecked"
  ).length;
  const frontViewFailures = workspace.recordChecks.filter((record) =>
    record.frontViewStatus === "notChecked" ||
    (record.frontViewStatus === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, "frontViewStatus")))
  ).length;
  const secondaryAngleFailures = workspace.recordChecks.filter((record) =>
    record.secondaryAngleStatus === "notChecked" ||
    (record.secondaryAngleStatus === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, "secondaryAngleStatus")))
  ).length;
  const dependencyOrExceptionFailures = workspace.recordChecks.filter((record) =>
    (record.dependencyStatus === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, "dependencyStatus"))) ||
    record.dependencyStatus === "notChecked" ||
    (record.exceptionStatus === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, "exceptionStatus"))) ||
    record.exceptionStatus === "notChecked"
  ).length;
  const independentlyCheckedRecords = workspace.recordChecks.filter((record) =>
    record.primaryObservation.observerID !== record.verifierObservation.observerID &&
    record.verifierObservation.summary.trim().length > 0 &&
    record.verifierObservation.evidenceIDs.length > 0
  ).length;
  const blockingMismatchReports = workspace.mismatchReports.filter((report) => report.severity === "blocking" && !resolvedMismatchIDs.has(report.mismatchID)).length;
  const unresolvedDiscrepancyWorkflows = (workspace.discrepancyWorkflows ?? []).filter((workflow) => !isDiscrepancyWorkflowProductionResolved(workflow)).length;
  return {
    recordCount: workspace.recordChecks.length,
    independentlyCheckedRecords,
    countMismatches,
    recordMismatches,
    evidenceFailures,
    frontViewFailures,
    secondaryAngleFailures,
    dependencyOrExceptionFailures,
    blockingMismatchReports,
    unresolvedDiscrepancyWorkflows,
    signOffReady:
      workspace.recordChecks.length > 0 &&
      independentlyCheckedRecords === workspace.recordChecks.length &&
      countMismatches === 0 &&
      recordMismatches === 0 &&
      evidenceFailures === 0 &&
      frontViewFailures === 0 &&
      secondaryAngleFailures === 0 &&
      dependencyOrExceptionFailures === 0 &&
      blockingMismatchReports === 0 &&
      unresolvedDiscrepancyWorkflows === 0 &&
      workspace.recordChecks.every((record) => record.finalDisposition === "VERIFIED" || record.finalDisposition === "VERIFIED_WITH_NOTES")
  };
}

export function signOffSecondVerifierWorkspace(input: {
  workspace: Phase0SecondVerifierWorkspace;
  verifierID: string;
  notes: string;
  signedOffAt: ISODateString;
}): Phase0SecondVerifierWorkspace {
  const nextWorkspace = {
    ...input.workspace,
    updatedAt: input.signedOffAt,
    signedOffAt: input.signedOffAt,
    signOffVerifierID: input.verifierID.trim(),
    signOffNotes: input.notes.trim()
  };
  const validation = validateSecondVerifierWorkspace(nextWorkspace);
  if (!validation.signOffReady) return nextWorkspace;
  return nextWorkspace;
}

export function exportSecondPersonVerificationRecords(workspace: Phase0SecondVerifierWorkspace): Phase0SecondPersonVerificationRecord[] {
  return workspace.recordChecks.map((record) => ({
    schemaVersion: PHASE0_SECOND_PERSON_VERIFICATION_SCHEMA_VERSION,
    verificationID: `${workspace.workspaceID}-${record.recordID}-second-verification`,
    targetStableID: record.stableInternalID,
    verificationScope: record.verificationScope,
    primaryObservation: record.primaryObservation,
    verifierObservation: record.verifierObservation,
    evidenceExists: record.evidenceFilesStatus === "confirmed",
    frontViewExists: record.frontViewStatus === "confirmed",
    secondaryAngleSampleIncluded: record.secondaryAngleStatus === "confirmed",
    randomizationMethod: record.randomizationMethod,
    discrepancyType: mapDiscrepancyType(record),
    resolutionAction: record.resolutionAction,
    resolutionEvidenceIDs: record.resolutionEvidenceIDs,
    primaryAcknowledgedAt: record.primaryAcknowledgedAt,
    verifierAcknowledgedAt: record.verifierAcknowledgedAt,
    finalDisposition: record.finalDisposition,
    notes: record.notes
  }));
}

export function getAllowedSecondVerifierStatuses(): Phase0ApprovedVerificationStatus[] {
  return [...approvedPhase0VerificationStatuses];
}

function validateVerifierEnvironment(environment: Phase0SecondVerifierEnvironmentEntry, errors: Phase0SecondVerifierValidationIssue[]) {
  for (const [field, value] of [
    ["verifierEnvironmentID", environment.verifierEnvironmentID],
    ["verifierID", environment.verifierID],
    ["platform", environment.platform],
    ["gameVersion", environment.gameVersion],
    ["patchVersion", environment.patchVersion],
    ["gameMode", environment.gameMode],
    ["creationPath", environment.creationPath]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingVerifierEnvironmentField", `Verifier environment is missing ${field}.`, environment.verifierEnvironmentID));
  }
  if (!isISODate(environment.observedAt)) errors.push(issue("invalidVerifierEnvironmentTimestamp", "Verifier environment observedAt must be a valid timestamp.", environment.verifierEnvironmentID));
  if (environment.evidenceFileIDs.length === 0) errors.push(issue("missingVerifierEnvironmentEvidence", "Verifier environment requires evidence references.", environment.verifierEnvironmentID));
}

function validateCountChecks(
  checks: Phase0SecondVerifierCountCheck[],
  prefix: string,
  errors: Phase0SecondVerifierValidationIssue[],
  warnings: Phase0SecondVerifierValidationIssue[]
) {
  const seen = new Set<string>();
  for (const check of checks) {
    if (!hasUsableText(check.checkID) || !hasUsableText(check.label)) errors.push(issue("invalidCountCheck", `${prefix} check is missing an ID or label.`, check.checkID));
    if (seen.has(check.checkID)) errors.push(issue("duplicateCountCheck", `${check.checkID} appears more than once.`, check.checkID));
    seen.add(check.checkID);
    if (check.primaryCount < 0 || (check.verifierCount !== null && check.verifierCount < 0)) errors.push(issue("invalidCountValue", `${check.checkID} has a negative count.`, check.checkID));
    if (check.status === "notChecked") warnings.push(issue("countNotChecked", `${check.checkID} still needs independent verifier count.`, check.checkID));
    if (check.status === "mismatch") errors.push(issue(`${prefix}Mismatch`, `${check.checkID} primary count ${check.primaryCount} does not match verifier count ${check.verifierCount ?? "missing"}.`, check.checkID));
  }
}

function validateRecordCheck(
  record: Phase0SecondVerifierRecordCheck,
  errors: Phase0SecondVerifierValidationIssue[],
  warnings: Phase0SecondVerifierValidationIssue[],
  resolvedMismatchIDs: Set<Phase0EntityID>
) {
  if (!hasUsableText(record.recordID) || !hasUsableText(record.stableInternalID)) errors.push(issue("invalidRecordCheck", "Record check requires record and stable IDs.", record.recordID));
  validateObservation(record.primaryObservation, "primary", errors, record.recordID);
  validateObservation(record.verifierObservation, "verifier", errors, record.recordID);
  if (record.primaryObservation.observerID === record.verifierObservation.observerID) errors.push(issue("sameVerifierAsPrimary", `${record.recordID} must be checked by a different verifier.`, record.recordID));
  for (const [field, value] of Object.entries(recordStatuses(record))) {
    if (!checkStatuses.includes(value)) errors.push(issue("invalidCheckStatus", `${record.recordID} has invalid ${field}.`, record.recordID));
    if (value === "notChecked" && field !== "dependencyStatus" && field !== "exceptionStatus") warnings.push(issue("recordCheckIncomplete", `${record.recordID} still needs ${field}.`, record.recordID));
    if (value === "mismatch" && !resolvedMismatchIDs.has(mismatchIDForRecordField(record.recordID, field))) {
      errors.push(issue("recordCheckMismatch", `${record.recordID} has mismatch in ${field}.`, record.recordID));
    }
  }
  if (!hasUsableText(record.randomizationMethod)) errors.push(issue("missingRandomizationMethod", `${record.recordID} requires a secondary-angle sampling method.`, record.recordID));
  if (!approvedStatusSet.has(record.finalDisposition)) errors.push(issue("invalidVerificationStatus", `${record.recordID} uses an unsupported final disposition.`, record.recordID));
  if (!record.primaryAcknowledgedAt || !record.verifierAcknowledgedAt) errors.push(issue("missingSignOffAcknowledgment", `${record.recordID} requires both primary and verifier acknowledgment.`, record.recordID));
  if ((record.primaryAcknowledgedAt && !isISODate(record.primaryAcknowledgedAt)) || (record.verifierAcknowledgedAt && !isISODate(record.verifierAcknowledgedAt))) {
    errors.push(issue("invalidAcknowledgmentTimestamp", `${record.recordID} has invalid acknowledgment timestamps.`, record.recordID));
  }
  const exported = exportSecondPersonVerificationRecords({
    schemaVersion: PHASE0_SECOND_VERIFIER_WORKSPACE_SCHEMA_VERSION,
    workspaceID: "validation-workspace",
    createdAt: record.verifierObservation.observedAt,
    updatedAt: record.verifierObservation.observedAt,
    environment: emptyEnvironment(record.verifierObservation.observedAt),
    menuCountChecks: [],
    catalogCountChecks: [],
    recordChecks: [record],
    mismatchReports: [],
    discrepancyWorkflows: [],
    secondaryAngleSample: null,
    signedOffAt: null,
    signOffVerifierID: null,
    signOffNotes: ""
  })[0];
  const exportedValidation = validatePhase0SecondPersonVerification(exported);
  for (const exportedError of exportedValidation.errors) {
    errors.push(issue(`exported-${exportedError.code}`, exportedError.message, record.recordID));
  }
}

function validateMismatchReport(report: Phase0SecondVerifierMismatchReport, errors: Phase0SecondVerifierValidationIssue[]) {
  if (!hasUsableText(report.mismatchID) || !hasUsableText(report.recordID)) errors.push(issue("invalidMismatchReport", "Mismatch report requires IDs.", report.mismatchID));
  if (!mismatchKinds.includes(report.kind)) errors.push(issue("invalidMismatchKind", `${report.mismatchID} uses unsupported mismatch kind.`, report.mismatchID));
  if (!hasUsableText(report.primaryValue) || !hasUsableText(report.verifierValue)) errors.push(issue("missingMismatchValues", `${report.mismatchID} requires primary and verifier values.`, report.mismatchID));
  if (report.evidenceFileIDs.length === 0) errors.push(issue("missingMismatchEvidence", `${report.mismatchID} requires evidence references.`, report.mismatchID));
}

function validateDiscrepancyWorkflowFields(
  workflow: Phase0DiscrepancyResolutionWorkflow,
  errors: Phase0SecondVerifierValidationIssue[],
  warnings: Phase0SecondVerifierValidationIssue[]
) {
  if (!hasUsableText(workflow.workflowID) || !hasUsableText(workflow.discrepancyID)) {
    errors.push(issue("invalidDiscrepancyWorkflow", "Discrepancy workflow requires workflow and discrepancy IDs.", workflow.workflowID));
  }
  if (!isISODate(workflow.openedAt)) errors.push(issue("invalidDiscrepancyOpenedAt", `${workflow.workflowID} requires a valid openedAt timestamp.`, workflow.workflowID));
  if (!hasUsableText(workflow.openedBy)) errors.push(issue("missingDiscrepancyOpener", `${workflow.workflowID} requires an opener ID.`, workflow.workflowID));
  if (workflow.affectedRecordIDs.length === 0 || workflow.affectedStableInternalIDs.length === 0) {
    errors.push(issue("missingAffectedRecords", `${workflow.workflowID} must identify affected records.`, workflow.workflowID));
  }
  if (workflow.sourceMismatchIDs.length === 0) errors.push(issue("missingSourceMismatch", `${workflow.workflowID} must link the source mismatch report.`, workflow.workflowID));
  validateObservation(workflow.primaryObservation, "primary", errors, workflow.workflowID);
  validateObservation(workflow.verifierObservation, "verifier", errors, workflow.workflowID);
  if (workflow.primaryObservation.observerID === workflow.verifierObservation.observerID) {
    errors.push(issue("sameDiscrepancyObservers", `${workflow.workflowID} must preserve different primary and verifier observers.`, workflow.workflowID));
  }
  if (workflow.discrepancyType === "none") errors.push(issue("missingDiscrepancyType", `${workflow.workflowID} must describe a real discrepancy.`, workflow.workflowID));
  if (workflow.requiredDirectEvidenceIDs.length === 0) errors.push(issue("missingNewDirectEvidence", `${workflow.workflowID} requires new direct evidence.`, workflow.workflowID));
  if (workflow.linkedRecaptureFileIDs.length === 0) errors.push(issue("missingRecaptureEvidence", `${workflow.workflowID} requires linked recapture files.`, workflow.workflowID));
  if (workflow.supersededEvidenceFileIDs.length === 0) errors.push(issue("missingSupersededEvidence", `${workflow.workflowID} must preserve superseded evidence references.`, workflow.workflowID));
  if (!workflow.resolutionAction) errors.push(issue("missingResolutionAction", `${workflow.workflowID} requires a resolution action.`, workflow.workflowID));
  if (!hasUsableText(workflow.finalResolution)) errors.push(issue("missingFinalResolution", `${workflow.workflowID} requires final resolution notes.`, workflow.workflowID));
  if (!workflow.finalDisposition || !approvedStatusSet.has(workflow.finalDisposition)) {
    errors.push(issue("invalidDiscrepancyFinalDisposition", `${workflow.workflowID} requires an approved final disposition.`, workflow.workflowID));
  }
  if (!workflow.primaryAcknowledgedAt || !workflow.verifierAcknowledgedAt) {
    errors.push(issue("missingDiscrepancyAcknowledgment", `${workflow.workflowID} requires both-party acknowledgment.`, workflow.workflowID));
  } else if (!isISODate(workflow.primaryAcknowledgedAt) || !isISODate(workflow.verifierAcknowledgedAt)) {
    errors.push(issue("invalidDiscrepancyAcknowledgment", `${workflow.workflowID} has invalid acknowledgment timestamps.`, workflow.workflowID));
  }
  validateDiscrepancyAuditHistory(workflow, errors, warnings);
  const exported = exportDiscrepancyResolutionRecords({
    schemaVersion: PHASE0_SECOND_VERIFIER_WORKSPACE_SCHEMA_VERSION,
    workspaceID: "validation-workspace",
    createdAt: workflow.openedAt,
    updatedAt: workflow.openedAt,
    environment: emptyEnvironment(workflow.openedAt),
    menuCountChecks: [],
    catalogCountChecks: [],
    recordChecks: [],
    mismatchReports: [],
    discrepancyWorkflows: [workflow],
    secondaryAngleSample: null,
    signedOffAt: null,
    signOffVerifierID: null,
    signOffNotes: ""
  })[0];
  if (exported) {
    const exportedValidation = validatePhase0DiscrepancyResolution(exported);
    for (const exportedError of exportedValidation.errors) {
      errors.push(issue(`exported-discrepancy-${exportedError.code}`, exportedError.message, workflow.workflowID));
    }
  }
}

function validateDiscrepancyAuditHistory(
  workflow: Phase0DiscrepancyResolutionWorkflow,
  errors: Phase0SecondVerifierValidationIssue[],
  warnings: Phase0SecondVerifierValidationIssue[]
) {
  if (workflow.auditHistory.length === 0) {
    errors.push(issue("missingAuditHistory", `${workflow.workflowID} requires immutable audit history events.`, workflow.workflowID));
    return;
  }
  const seenEvents = new Set<string>();
  let previousTime = 0;
  for (const event of workflow.auditHistory) {
    if (seenEvents.has(event.eventID)) errors.push(issue("duplicateAuditEvent", `${workflow.workflowID} has duplicate audit event ${event.eventID}.`, workflow.workflowID));
    seenEvents.add(event.eventID);
    if (!hasUsableText(event.actorID) || !hasUsableText(event.summary)) errors.push(issue("invalidAuditEvent", `${event.eventID} is missing actor or summary.`, workflow.workflowID));
    if (event.affectedRecordIDs.length === 0) errors.push(issue("auditEventMissingRecord", `${event.eventID} must identify affected records.`, workflow.workflowID));
    const currentTime = Date.parse(event.occurredAt);
    if (Number.isNaN(currentTime)) errors.push(issue("invalidAuditEventTimestamp", `${event.eventID} has invalid timestamp.`, workflow.workflowID));
    if (!Number.isNaN(currentTime) && currentTime < previousTime) errors.push(issue("auditHistoryNotChronological", `${workflow.workflowID} audit history must remain chronological.`, workflow.workflowID));
    if (!Number.isNaN(currentTime)) previousTime = currentTime;
  }
  for (const requiredEvent of ["discrepancyOpened", "directEvidenceLinked", "recaptureLinked", "supersededEvidencePreserved", "resolutionRecorded", "primaryAcknowledged", "verifierAcknowledged", "verificationStateUpdated"] as const) {
    if (!workflow.auditHistory.some((event) => event.kind === requiredEvent)) {
      const issueCode = requiredEvent === "supersededEvidencePreserved" ? "missingSupersededEvidenceHistory" : "missingAuditEvent";
      errors.push(issue(issueCode, `${workflow.workflowID} audit history is missing ${requiredEvent}.`, workflow.workflowID));
    }
  }
  if (workflow.auditHistory.some((event) => event.kind === "directEvidenceLinked" && event.evidenceFileIDs.length === 0)) {
    warnings.push(issue("emptyDirectEvidenceEvent", `${workflow.workflowID} has a direct-evidence event without evidence IDs.`, workflow.workflowID));
  }
}

function applyResolvedDiscrepancyWorkflows(workspace: Phase0SecondVerifierWorkspace): Phase0SecondVerifierWorkspace {
  const resolvedWorkflows = (workspace.discrepancyWorkflows ?? []).filter(isDiscrepancyWorkflowProductionResolved);
  if (resolvedWorkflows.length === 0) return workspace;
  const recordChecks = workspace.recordChecks.map((record) => {
    const workflow = resolvedWorkflows.find((candidate) => candidate.affectedRecordIDs.includes(record.recordID));
    if (!workflow || !workflow.finalDisposition || !workflow.resolutionAction) return record;
    return {
      ...record,
      resolutionAction: workflow.resolutionAction,
      resolutionEvidenceIDs: uniqueList([...workflow.requiredDirectEvidenceIDs, ...workflow.linkedRecaptureFileIDs]),
      finalDisposition: workflow.finalDisposition,
      primaryAcknowledgedAt: workflow.primaryAcknowledgedAt,
      verifierAcknowledgedAt: workflow.verifierAcknowledgedAt,
      notes: `${record.notes}\nDiscrepancy ${workflow.discrepancyID}: ${workflow.finalResolution}`.trim()
    };
  });
  return { ...workspace, recordChecks };
}

function resolvedProductionMismatchIDs(workspace: Phase0SecondVerifierWorkspace) {
  return new Set((workspace.discrepancyWorkflows ?? [])
    .filter(isDiscrepancyWorkflowProductionResolved)
    .flatMap((workflow) => workflow.sourceMismatchIDs));
}

function isDiscrepancyWorkflowProductionResolved(workflow: Phase0DiscrepancyResolutionWorkflow) {
  return workflow.status === "acknowledged" &&
    (workflow.finalDisposition === "VERIFIED" || workflow.finalDisposition === "VERIFIED_WITH_NOTES") &&
    workflow.verificationState === "verified" &&
    workflow.requiredDirectEvidenceIDs.length > 0 &&
    workflow.linkedRecaptureFileIDs.length > 0 &&
    workflow.supersededEvidenceFileIDs.length > 0 &&
    Boolean(workflow.resolutionAction && workflow.finalResolution && workflow.primaryAcknowledgedAt && workflow.verifierAcknowledgedAt);
}

function emptySummary(): Phase0SecondVerifierSummary {
  return {
    recordCount: 0,
    independentlyCheckedRecords: 0,
    countMismatches: 0,
    recordMismatches: 0,
    evidenceFailures: 0,
    frontViewFailures: 0,
    secondaryAngleFailures: 0,
    dependencyOrExceptionFailures: 0,
    blockingMismatchReports: 0,
    unresolvedDiscrepancyWorkflows: 0,
    signOffReady: false
  };
}

function buildMismatchReports(recordChecks: Phase0SecondVerifierRecordCheck[]): Phase0SecondVerifierMismatchReport[] {
  return recordChecks.flatMap((record) =>
    Object.entries(recordStatuses(record))
      .filter(([, status]) => status === "mismatch")
      .map(([field]) => ({
        mismatchID: mismatchIDForRecordField(record.recordID, field),
        recordID: record.recordID,
        stableInternalID: record.stableInternalID,
        kind: mismatchKindForField(field),
        primaryValue: record.primaryObservation.summary,
        verifierValue: record.verifierObservation.summary,
        evidenceFileIDs: uniqueList([...record.primaryObservation.evidenceIDs, ...record.verifierObservation.evidenceIDs]),
        severity: "blocking" as const,
        notes: `${field} requires discrepancy resolution before sign-off.`
      }))
  );
}

function recordStatuses(record: Phase0SecondVerifierRecordCheck) {
  return {
    nativeOrderStatus: record.nativeOrderStatus,
    recordFieldsStatus: record.recordFieldsStatus,
    evidenceFilesStatus: record.evidenceFilesStatus,
    frontViewStatus: record.frontViewStatus,
    secondaryAngleStatus: record.secondaryAngleStatus,
    dependencyStatus: record.dependencyStatus,
    exceptionStatus: record.exceptionStatus
  };
}

function mismatchKindForField(field: string): Phase0VerifierMismatchKind {
  if (field === "nativeOrderStatus") return "nativeOrderMismatch";
  if (field === "evidenceFilesStatus") return "evidenceMismatch";
  if (field === "frontViewStatus") return "frontViewMissing";
  if (field === "secondaryAngleStatus") return "secondaryAngleMissing";
  if (field === "dependencyStatus") return "dependencyMismatch";
  if (field === "exceptionStatus") return "exceptionMismatch";
  return "recordMismatch";
}

function mismatchIDForRecordField(recordID: Phase0EntityID, field: string) {
  return `${recordID}-${field}-mismatch`;
}

function discrepancyTypeForMismatchReport(report: Phase0SecondVerifierMismatchReport): Phase0DiscrepancyType {
  if (report.kind === "nativeOrderMismatch") return "orderMismatch";
  if (report.kind === "evidenceMismatch" || report.kind === "frontViewMissing" || report.kind === "secondaryAngleMissing") return "missingEvidence";
  if (report.kind === "dependencyMismatch" || report.kind === "exceptionMismatch") return "dependencyUnresolved";
  if (report.kind === "environmentMismatch") return "versionMismatch";
  if (report.kind === "menuCountMismatch" || report.kind === "catalogCountMismatch") return "countMismatch";
  if (report.kind === "recordMismatch") return "other";
  return "other";
}

function cloneObservation(observationToClone: Phase0ObservationSummary): Phase0ObservationSummary {
  return {
    ...observationToClone,
    evidenceIDs: [...observationToClone.evidenceIDs]
  };
}

function auditEvent(input: {
  workflowID: Phase0EntityID;
  sequence: number;
  kind: Phase0DiscrepancyAuditEventKind;
  occurredAt: ISODateString;
  actorID: string;
  affectedRecordIDs: Phase0EntityID[];
  evidenceFileIDs: Phase0EntityID[];
  supersededEvidenceFileIDs: Phase0EntityID[];
  summary: string;
}): Phase0DiscrepancyAuditEvent {
  return {
    eventID: `${input.workflowID}-${String(input.sequence).padStart(3, "0")}-${input.kind}`,
    kind: input.kind,
    occurredAt: input.occurredAt,
    actorID: input.actorID.trim(),
    affectedRecordIDs: uniqueList(input.affectedRecordIDs),
    evidenceFileIDs: uniqueList(input.evidenceFileIDs),
    supersededEvidenceFileIDs: uniqueList(input.supersededEvidenceFileIDs),
    summary: input.summary.trim()
  };
}

function mapDiscrepancyType(record: Phase0SecondVerifierRecordCheck): "none" | "versionMismatch" | "missingEvidence" | "countMismatch" | "orderMismatch" | "dependencyUnresolved" | "other" {
  if (record.evidenceFilesStatus === "mismatch" || record.frontViewStatus === "mismatch" || record.secondaryAngleStatus === "mismatch") return "missingEvidence";
  if (record.nativeOrderStatus === "mismatch") return "orderMismatch";
  if (record.dependencyStatus === "mismatch" || record.exceptionStatus === "mismatch") return "dependencyUnresolved";
  if (record.recordFieldsStatus === "mismatch") return "other";
  return "none";
}

function observation(observerID: string, observedAt: ISODateString, summary: string, evidenceIDs: Phase0EntityID[]): Phase0ObservationSummary {
  return {
    observerID: observerID.trim(),
    observedAt,
    summary: summary.trim(),
    evidenceIDs: uniqueList(evidenceIDs)
  };
}

function validateObservation(
  observation: Phase0ObservationSummary,
  label: string,
  errors: Phase0SecondVerifierValidationIssue[],
  entityID: Phase0EntityID
) {
  if (!hasUsableText(observation.observerID) || !hasUsableText(observation.summary)) errors.push(issue("invalidObservation", `${entityID} has incomplete ${label} observation.`, entityID));
  if (!isISODate(observation.observedAt)) errors.push(issue("invalidObservationTimestamp", `${entityID} has invalid ${label} timestamp.`, entityID));
  if (observation.evidenceIDs.length === 0) errors.push(issue("missingObservationEvidence", `${entityID} ${label} observation requires evidence references.`, entityID));
}

function emptyEnvironment(nowISO: ISODateString): Phase0SecondVerifierEnvironmentEntry {
  return {
    verifierEnvironmentID: "validation-environment",
    verifierID: "validation-verifier",
    observedAt: nowISO,
    platform: "validation",
    gameVersion: "validation",
    patchVersion: "validation",
    gameMode: "validation",
    creationPath: "validation",
    evidenceFileIDs: ["validation-evidence"],
    notes: ""
  };
}

function groupEligibleRecords(records: Phase0SecondaryAngleEligibleCatalogRecord[]) {
  const grouped = new Map<string, Phase0SecondaryAngleEligibleCatalogRecord[]>();
  const seen = new Set<string>();
  for (const record of records) {
    const stableInternalID = record.stableInternalID.trim();
    const category = record.category.trim();
    if (!stableInternalID || !category || seen.has(stableInternalID)) continue;
    seen.add(stableInternalID);
    grouped.set(category, [...(grouped.get(category) ?? []), { stableInternalID, category }]);
  }
  return new Map([...grouped.entries()].sort(([first], [second]) => first.localeCompare(second)));
}

function buildSecondaryAngleSampleReport(
  seedInput: string,
  categories: Phase0SecondaryAngleCategorySampleSummary[],
  selectedRecords: Phase0SecondaryAngleSampleSelection[]
) {
  const lines = [
    "Deterministic secondary-angle sample",
    `Method: deterministic-sha256-category-quartile-v1`,
    `Seed input: ${seedInput}`,
    `Eligible records: ${categories.reduce((total, category) => total + category.eligibleCount, 0)}`,
    `Selected records: ${selectedRecords.length}`,
    "Category coverage:"
  ];
  for (const category of categories) {
    lines.push(`- ${category.category}: ${category.selectedCount}/${category.eligibleCount} selected (${category.selectedStableInternalIDs.join(", ") || "none"})`);
  }
  lines.push("Selected record order:");
  for (const record of selectedRecords) {
    lines.push(`- ${record.category} #${record.categoryRank}/${record.categorySize}: ${record.stableInternalID} (${record.hash})`);
  }
  return lines.join("\n");
}

async function sha256Hex(text: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function uniqueList(values: Phase0EntityID[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}

function isISODate(value: string) {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function issue(code: string, message: string, entityID?: Phase0EntityID): Phase0SecondVerifierValidationIssue {
  return { code, message, entityID };
}
