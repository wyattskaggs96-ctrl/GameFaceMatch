import type { ISODateString } from "@/types/domain";
import type { Phase0ApprovedVerificationStatus } from "./phase-zero-verification";
import { approvedPhase0VerificationStatuses } from "./phase-zero-verification";

export const CF27_VERIFIER_DECISION_WORKSPACE_SCHEMA_VERSION = "cf27-verifier-decision-workspace-v1";

export type Cf27VerifierDecisionStatus = Phase0ApprovedVerificationStatus;
export type Cf27QueueBooleanFilter = "all" | "yes" | "no";
export type Cf27EvidenceCompletenessFilter = "all" | "EVIDENCE_LINKED" | "MISSING_EVIDENCE";

export interface Cf27ProductionVerificationQueue {
  schemaVersion: string;
  generatedAt: ISODateString;
  productionStatus: "NOT_PRODUCTION_DATA";
  verificationStatus: "NOT_VERIFIED";
  verificationHasOccurred: false;
  productionRecommendationsEnabled: false;
  allowedSecondVerifierStatuses: Cf27VerifierDecisionStatus[];
  summary: Cf27ProductionVerificationQueueSummary;
  categoryCounts: Cf27ProductionVerificationQueueCategoryCount[];
  records: Cf27ProductionVerificationQueueRecord[];
}

export interface Cf27ProductionVerificationQueueSummary {
  totalCandidates: number;
  evidenceLinkedCount: number;
  missingEvidenceCount: number;
  duplicateOrNearDuplicateCount: number;
  dependencyFlagCount: number;
  versionOrEnvironmentGapCount: number;
  recaptureRecommendedCount: number;
  missingViewRecords: number;
  secondVerifiedRecords: number;
  productionApprovedRecords: number;
  productionCatalogRecords: number;
  productionEligibleCount: number;
  [key: string]: unknown;
}

export interface Cf27ProductionVerificationQueueCategoryCount {
  category: string;
  candidateCount: number;
  evidenceLinkedCount: number;
  duplicateOrNearDuplicateCount: number;
  dependencyFlagCount: number;
  versionOrEnvironmentGapCount: number;
  missingViewRecords: number;
  recaptureRecommendedCount: number;
  productionEligibleCount: number;
  primaryReviewStatusCounts?: Record<string, number>;
}

export interface Cf27QueueEvidenceReference {
  evidenceID: string;
  relativePath?: string;
  path?: string;
  sha256?: string;
  sourceVideoID?: string;
  timestamp?: number | string | null;
  timestampRange?: string;
  view?: string;
  pathResolutionStatus?: string;
  verificationStatus?: string;
  [key: string]: unknown;
}

export interface Cf27QueueSourceVideoReference {
  sourceVideoID?: string;
  sourceVideoFilename?: string;
  originalFilename?: string;
  sha256?: string;
  timestamp?: string | number | null;
  timestampRange?: string;
  sourceVideoResolved?: boolean;
  timelineResolved?: boolean;
}

export interface Cf27QueueIssueReference {
  issueID: string;
  kind: string;
  severity?: string;
  status?: string;
  title?: string;
  recaptureRequired?: boolean;
}

export interface Cf27QueueCaptureRequestReference {
  captureID?: string;
  title?: string;
  status?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface Cf27ProductionVerificationQueueRecord {
  queueRecordID: string;
  stableCandidateID: string;
  category: string;
  categoryID?: string;
  nativeOptionLabelOrIndex: string;
  nativeOrder: number | null;
  platform: string | null;
  gameVersion: string | null;
  patch: string | null;
  mode: string | null;
  creationPath: string | null;
  environmentID: string;
  primaryResearcher: string;
  primaryReviewStatus: string;
  evidenceCompletenessStatus: "EVIDENCE_LINKED" | "MISSING_EVIDENCE" | string;
  evidenceReferences: Cf27QueueEvidenceReference[];
  sourceVideoReferences: Cf27QueueSourceVideoReference[];
  requiredViews: string[];
  availableViews: string[];
  missingViews: string[];
  framingConsistencyResult: string;
  lightingConsistencyResult: string;
  canonicalSettingsConsistencyResult: string;
  duplicateOrNearDuplicateFlag: boolean;
  dependencyFlag: boolean;
  versionOrEnvironmentGap: boolean;
  selectedValueVisible: boolean;
  categoryVisible: boolean;
  optionTransitionObservable: string;
  neighboringOptionsEstablishOrdering: string;
  selectorBoundaryState?: {
    firstSelectorOptionKnown?: string;
    finalSelectorOptionKnown?: string;
    selectorWrapKnown?: string;
  };
  issueReferences: Cf27QueueIssueReference[];
  captureRequestReferences: Cf27QueueCaptureRequestReference[];
  countOrderAudit?: {
    categoryCompletionStatus?: string;
    productionEligible?: boolean;
    blockingIssueCount?: number;
  };
  recommendedVerifierAction: string;
  recommendedRecaptureAction: string;
  currentProductionEligibility: "NOT_ELIGIBLE" | string;
  blockingReasons: string[];
  secondVerifierStatus: Cf27VerifierDecisionStatus;
  catalogManagerDisposition: string;
  requiredImportTarget?: {
    present?: boolean;
    requiresNativeOrder?: boolean;
    requiresEvidenceReference?: boolean;
    requiresFrontView?: boolean;
    requiresSecondaryAngleSample?: boolean;
    requiresDuplicateExceptionReview?: boolean;
  };
  notes: string[];
}

export interface Cf27VerifierQueueFilters {
  category: string;
  verifierStatus: "all" | Cf27VerifierDecisionStatus;
  evidenceCompleteness: Cf27EvidenceCompletenessFilter;
  missingViews: Cf27QueueBooleanFilter;
  duplicateOrAmbiguous: Cf27QueueBooleanFilter;
  environmentGap: Cf27QueueBooleanFilter;
  search: string;
}

export interface Cf27VerifierDecisionDraft {
  schemaVersion: typeof CF27_VERIFIER_DECISION_WORKSPACE_SCHEMA_VERSION;
  stableCandidateID: string;
  queueRecordID: string;
  decisionStatus: Cf27VerifierDecisionStatus;
  verifierID: string;
  verificationDate: string;
  verifierEnvironment: string;
  independentObservation: string;
  evidenceConfirmed: boolean;
  nativeOrderConfirmed: boolean;
  frontViewConfirmed: boolean;
  secondaryAngleConfirmed: boolean;
  exceptionReviewed: boolean;
  notes: string;
  savedAt: string | null;
  productionPromotionAttempted: false;
  productionEligibleAfterDraft: false;
}

export interface Cf27VerifierDecisionValidationIssue {
  code: string;
  message: string;
  candidateID?: string;
}

export interface Cf27VerifierDecisionValidationReport {
  ok: boolean;
  exportable: boolean;
  productionEligible: false;
  errors: Cf27VerifierDecisionValidationIssue[];
  warnings: Cf27VerifierDecisionValidationIssue[];
}

export interface Cf27VerifierProgressCounts {
  total: number;
  draftSaved: number;
  notVerified: number;
  verified: number;
  verifiedWithNotes: number;
  recaptureRequired: number;
  mismatchOrBlocked: number;
  missingEvidence: number;
  missingViews: number;
  duplicateOrAmbiguous: number;
  environmentGaps: number;
  productionEligible: 0;
}

export const defaultCf27VerifierQueueFilters: Cf27VerifierQueueFilters = {
  category: "all",
  verifierStatus: "all",
  evidenceCompleteness: "all",
  missingViews: "all",
  duplicateOrAmbiguous: "all",
  environmentGap: "all",
  search: ""
};

const allowedStatusSet = new Set<string>(approvedPhase0VerificationStatuses);
const nonCleanStatuses = new Set<Cf27VerifierDecisionStatus>([
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED",
  "NOT_VERIFIED"
]);

export function getAllowedCf27VerifierDecisionStatuses(): Cf27VerifierDecisionStatus[] {
  return [...approvedPhase0VerificationStatuses];
}

export function createVerifierDecisionDraft(record: Cf27ProductionVerificationQueueRecord, overrides: Partial<Cf27VerifierDecisionDraft> = {}): Cf27VerifierDecisionDraft {
  return {
    schemaVersion: CF27_VERIFIER_DECISION_WORKSPACE_SCHEMA_VERSION,
    stableCandidateID: record.stableCandidateID,
    queueRecordID: record.queueRecordID,
    decisionStatus: "NOT_VERIFIED",
    verifierID: "",
    verificationDate: "",
    verifierEnvironment: "",
    independentObservation: "",
    evidenceConfirmed: false,
    nativeOrderConfirmed: false,
    frontViewConfirmed: false,
    secondaryAngleConfirmed: false,
    exceptionReviewed: false,
    notes: "",
    savedAt: null,
    productionPromotionAttempted: false,
    productionEligibleAfterDraft: false,
    ...overrides
  };
}

export function validateVerifierDecisionDraft(
  draft: Cf27VerifierDecisionDraft,
  record: Cf27ProductionVerificationQueueRecord
): Cf27VerifierDecisionValidationReport {
  const errors: Cf27VerifierDecisionValidationIssue[] = [];
  const warnings: Cf27VerifierDecisionValidationIssue[] = [];
  if (draft.schemaVersion !== CF27_VERIFIER_DECISION_WORKSPACE_SCHEMA_VERSION) errors.push(issue("invalidDraftSchema", "Verifier draft schema is not supported.", record.stableCandidateID));
  if (draft.stableCandidateID !== record.stableCandidateID || draft.queueRecordID !== record.queueRecordID) errors.push(issue("draftRecordMismatch", "Verifier draft does not match the selected queue record.", record.stableCandidateID));
  if (!allowedStatusSet.has(draft.decisionStatus)) errors.push(issue("invalidDecisionStatus", "Verifier decision status is not allowed.", record.stableCandidateID));
  if (!hasText(draft.verifierID)) errors.push(issue("missingVerifierID", "Verifier ID is required.", record.stableCandidateID));
  if (!hasText(draft.verificationDate) || Number.isNaN(Date.parse(draft.verificationDate))) errors.push(issue("missingVerificationDate", "Verification date is required.", record.stableCandidateID));
  if (!hasText(draft.verifierEnvironment)) errors.push(issue("missingVerifierEnvironment", "Verifier environment is required.", record.stableCandidateID));
  if (!hasText(draft.independentObservation)) errors.push(issue("missingIndependentObservation", "Independent observation is required.", record.stableCandidateID));
  if (!draft.evidenceConfirmed) errors.push(issue("evidenceNotConfirmed", "Evidence-file existence must be confirmed.", record.stableCandidateID));
  if (!draft.nativeOrderConfirmed) errors.push(issue("nativeOrderNotConfirmed", "Native order must be checked.", record.stableCandidateID));
  if (!draft.frontViewConfirmed) errors.push(issue("frontViewNotConfirmed", "Required front view must be checked.", record.stableCandidateID));
  if (!draft.secondaryAngleConfirmed) errors.push(issue("secondaryAngleNotConfirmed", "Secondary-angle sampling or not-applicable decision must be checked.", record.stableCandidateID));
  if ((record.duplicateOrNearDuplicateFlag || record.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED") && !draft.exceptionReviewed) {
    errors.push(issue("duplicateExceptionNotReviewed", "Duplicate or exception flag must be reviewed.", record.stableCandidateID));
  }
  if (nonCleanStatuses.has(draft.decisionStatus) && !hasText(draft.notes)) errors.push(issue("missingNonCleanDecisionNotes", "Notes are required for every non-clean verifier decision.", record.stableCandidateID));
  if (draft.decisionStatus === "VERIFIED" && record.blockingReasons.length > 0) warnings.push(issue("verifiedDespiteQueueBlockers", "Queue blockers remain; this draft cannot publish the record.", record.stableCandidateID));
  if (record.currentProductionEligibility !== "NOT_ELIGIBLE") errors.push(issue("unexpectedProductionEligibility", "Queue record should not already be production eligible.", record.stableCandidateID));
  if (draft.productionPromotionAttempted || draft.productionEligibleAfterDraft) errors.push(issue("draftAttemptedPromotion", "Verifier drafts must not promote records.", record.stableCandidateID));
  return {
    ok: errors.length === 0,
    exportable: errors.length === 0,
    productionEligible: false,
    errors,
    warnings
  };
}

export function filterVerificationQueueRecords(
  records: Cf27ProductionVerificationQueueRecord[],
  filters: Cf27VerifierQueueFilters,
  drafts: Record<string, Cf27VerifierDecisionDraft> = {}
) {
  const search = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    const draftStatus = drafts[record.stableCandidateID]?.decisionStatus ?? record.secondVerifierStatus;
    if (filters.category !== "all" && record.category !== filters.category) return false;
    if (filters.verifierStatus !== "all" && draftStatus !== filters.verifierStatus) return false;
    if (filters.evidenceCompleteness !== "all" && record.evidenceCompletenessStatus !== filters.evidenceCompleteness) return false;
    if (!matchesBooleanFilter(record.missingViews.length > 0, filters.missingViews)) return false;
    if (!matchesBooleanFilter(record.duplicateOrNearDuplicateFlag || record.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED", filters.duplicateOrAmbiguous)) return false;
    if (!matchesBooleanFilter(record.versionOrEnvironmentGap, filters.environmentGap)) return false;
    if (search && ![
      record.stableCandidateID,
      record.category,
      record.nativeOptionLabelOrIndex,
      String(record.nativeOrder ?? ""),
      record.primaryReviewStatus,
      ...record.blockingReasons
    ].join(" ").toLowerCase().includes(search)) return false;
    return true;
  });
}

export function getNextUnresolvedCandidate(
  records: Cf27ProductionVerificationQueueRecord[],
  drafts: Record<string, Cf27VerifierDecisionDraft> = {}
) {
  return records.find((record) => (drafts[record.stableCandidateID]?.decisionStatus ?? record.secondVerifierStatus) === "NOT_VERIFIED") ?? records[0] ?? null;
}

export function getVerifierProgressCounts(
  queue: Cf27ProductionVerificationQueue,
  drafts: Record<string, Cf27VerifierDecisionDraft> = {}
): Cf27VerifierProgressCounts {
  const statuses = queue.records.map((record) => drafts[record.stableCandidateID]?.decisionStatus ?? record.secondVerifierStatus);
  const mismatchOrBlocked = statuses.filter((status) => ["VERSION_MISMATCH", "MISSING_EVIDENCE", "COUNT_MISMATCH", "ORDER_MISMATCH", "DEPENDENCY_UNRESOLVED"].includes(status)).length;
  return {
    total: queue.records.length,
    draftSaved: Object.values(drafts).filter((draft) => Boolean(draft.savedAt)).length,
    notVerified: statuses.filter((status) => status === "NOT_VERIFIED").length,
    verified: statuses.filter((status) => status === "VERIFIED").length,
    verifiedWithNotes: statuses.filter((status) => status === "VERIFIED_WITH_NOTES").length,
    recaptureRequired: statuses.filter((status) => status === "RECAPTURE_REQUIRED").length,
    mismatchOrBlocked,
    missingEvidence: queue.records.filter((record) => record.evidenceCompletenessStatus === "MISSING_EVIDENCE").length,
    missingViews: queue.records.filter((record) => record.missingViews.length > 0).length,
    duplicateOrAmbiguous: queue.records.filter((record) => record.duplicateOrNearDuplicateFlag || record.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED").length,
    environmentGaps: queue.records.filter((record) => record.versionOrEnvironmentGap).length,
    productionEligible: 0
  };
}

export function queueRecordsForSecondaryAngleSampling(queue: Cf27ProductionVerificationQueue) {
  return queue.records
    .filter((record) => record.requiredViews.some((view) => view !== "MENU"))
    .map((record) => ({
      stableInternalID: record.stableCandidateID,
      category: record.category
    }));
}

export function validateVerifierDecisionSet(queue: Cf27ProductionVerificationQueue, drafts: Record<string, Cf27VerifierDecisionDraft>) {
  const reports = queue.records.map((record) => validateVerifierDecisionDraft(drafts[record.stableCandidateID] ?? createVerifierDecisionDraft(record), record));
  return {
    ok: reports.every((report) => report.ok),
    productionEligible: false as const,
    completed: reports.filter((report) => report.ok).length,
    total: queue.records.length,
    errors: reports.flatMap((report) => report.errors),
    warnings: reports.flatMap((report) => report.warnings)
  };
}

export function exportVerifierDecisionDrafts(drafts: Record<string, Cf27VerifierDecisionDraft>) {
  const rows = Object.values(drafts).sort((left, right) => left.stableCandidateID.localeCompare(right.stableCandidateID));
  return toCsv(rows.map((draft) => ({
    stable_candidate_id: draft.stableCandidateID,
    queue_record_id: draft.queueRecordID,
    verifier_id: draft.verifierID,
    verification_date: draft.verificationDate,
    verifier_environment: draft.verifierEnvironment,
    decision_status: draft.decisionStatus,
    evidence_confirmed: String(draft.evidenceConfirmed),
    native_order_confirmed: String(draft.nativeOrderConfirmed),
    front_view_confirmed: String(draft.frontViewConfirmed),
    secondary_angle_confirmed: String(draft.secondaryAngleConfirmed),
    exception_reviewed: String(draft.exceptionReviewed),
    independent_observation: draft.independentObservation,
    notes: draft.notes,
    saved_at: draft.savedAt ?? ""
  })));
}

export function importVerifierDecisionDrafts(csv: string, queue: Cf27ProductionVerificationQueue) {
  const recordsByID = new Map(queue.records.map((record) => [record.stableCandidateID, record]));
  const drafts: Record<string, Cf27VerifierDecisionDraft> = {};
  const errors: Cf27VerifierDecisionValidationIssue[] = [];
  const rows = parseCsv(csv);
  for (const [index, row] of rows.entries()) {
    const stableCandidateID = row.stable_candidate_id ?? "";
    const record = recordsByID.get(stableCandidateID);
    if (!record) {
      errors.push(issue("unknownCandidateImport", `Imported row ${index + 2} references unknown candidate ${stableCandidateID}.`, stableCandidateID));
      continue;
    }
    const draft = createVerifierDecisionDraft(record, {
      verifierID: row.verifier_id ?? "",
      verificationDate: row.verification_date ?? "",
      verifierEnvironment: row.verifier_environment ?? "",
      decisionStatus: (row.decision_status ?? "NOT_VERIFIED") as Cf27VerifierDecisionStatus,
      evidenceConfirmed: row.evidence_confirmed === "true",
      nativeOrderConfirmed: row.native_order_confirmed === "true",
      frontViewConfirmed: row.front_view_confirmed === "true",
      secondaryAngleConfirmed: row.secondary_angle_confirmed === "true",
      exceptionReviewed: row.exception_reviewed === "true",
      independentObservation: row.independent_observation ?? "",
      notes: row.notes ?? "",
      savedAt: row.saved_at || null
    });
    const report = validateVerifierDecisionDraft(draft, record);
    if (!report.ok) errors.push(...report.errors);
    drafts[record.stableCandidateID] = draft;
  }
  return { drafts, errors, rowCount: rows.length, importable: errors.length === 0 };
}

function matchesBooleanFilter(value: boolean, filter: Cf27QueueBooleanFilter) {
  return filter === "all" || (filter === "yes" ? value : !value);
}

function toCsv(rows: Array<Record<string, string>>) {
  const columns = Object.keys(rows[0] ?? {
    stable_candidate_id: "",
    queue_record_id: "",
    verifier_id: "",
    verification_date: "",
    verifier_environment: "",
    decision_status: "",
    evidence_confirmed: "",
    native_order_confirmed: "",
    front_view_confirmed: "",
    secondary_angle_confirmed: "",
    exception_reviewed: "",
    independent_observation: "",
    notes: "",
    saved_at: ""
  });
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column] ?? "")).join(",")).join("\n")}\n`;
}

function parseCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(splitCsvLine(line).map((value, index) => [headers[index] ?? `column_${index}`, value])));
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function issue(code: string, message: string, candidateID?: string): Cf27VerifierDecisionValidationIssue {
  return { code, message, candidateID };
}
