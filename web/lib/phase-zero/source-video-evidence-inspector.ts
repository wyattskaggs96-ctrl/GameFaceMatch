import {
  createDerivativePreviewURL,
  type CaptureLogEvent,
  type CurrentEvidenceGalleryRecord,
  type EvidenceManifestEntry,
  type ImportedResearchCatalogRecord,
  type ResearchTimestampReference
} from "@/lib/phase-zero/current-evidence-gallery";

export const SOURCE_VIDEO_EVIDENCE_INSPECTOR_SCHEMA_VERSION = "source-video-evidence-inspector-v1";
export const SOURCE_VIDEO_REVIEW_LABEL = "PRIMARY RESEARCH REVIEW — NOT PRODUCTION VERIFICATION";

export type SourceVideoReviewDecision = "approvedDerivative" | "rejectedDerivative" | "incorrectOptionAssociation" | "recaptureRequested";
export type EvidenceQAStatus =
  | "OBSERVED_PENDING_QA"
  | "QA_ACCEPTED_RESEARCH"
  | "QA_REJECTED"
  | "RECAPTURE_REQUIRED"
  | "PENDING_SECOND_VERIFICATION"
  | "VERIFIED"
  | "VERIFIED_WITH_NOTES";
export type EvidenceQAReviewerRole = "QA_REVIEWER" | "SECOND_VERIFIER";
export type EvidenceQAActionType = SourceVideoReviewDecision | "statusMarked" | "noteAdded";

export const EVIDENCE_QA_STATUSES: EvidenceQAStatus[] = [
  "OBSERVED_PENDING_QA",
  "QA_ACCEPTED_RESEARCH",
  "QA_REJECTED",
  "RECAPTURE_REQUIRED",
  "PENDING_SECOND_VERIFICATION",
  "VERIFIED",
  "VERIFIED_WITH_NOTES"
];

export const SECOND_VERIFIER_ONLY_STATUSES: EvidenceQAStatus[] = ["VERIFIED", "VERIFIED_WITH_NOTES"];

export interface SourceVideoInspectorRecord extends CurrentEvidenceGalleryRecord {
  sourceVideoOptions: SourceVideoInspectorOption[];
  comparisonGroups: SourceVideoComparisonGroup[];
}

export interface SourceVideoInspectorOption {
  sourceVideoID: string;
  sourceFilename: string | null;
  exactTimestampSeconds: number | null;
  surroundingStartSeconds: number | null;
  surroundingEndSeconds: number | null;
  basis: string;
  localVideoURL: string;
}

export interface SourceVideoComparisonGroup {
  sourceVideoID: string;
  menuFrames: EvidenceManifestEntry[];
  characterFrames: EvidenceManifestEntry[];
}

export interface SourceVideoInspectorModel {
  schemaVersion: typeof SOURCE_VIDEO_EVIDENCE_INSPECTOR_SCHEMA_VERSION;
  reviewLabel: typeof SOURCE_VIDEO_REVIEW_LABEL;
  records: SourceVideoInspectorRecord[];
}

export interface SourceVideoReviewAction {
  actionID: string;
  actionType: EvidenceQAActionType;
  catalogID: string;
  evidenceID: string | null;
  sourceVideoID: string | null;
  timestampSeconds: number | null;
  reviewerID: string;
  reviewerRole: EvidenceQAReviewerRole;
  targetStatus: EvidenceQAStatus | null;
  notes: string;
  createdAt: string;
  previousActionHash: string | null;
  actionHash: string;
}

export interface SourceVideoReviewAuditLog {
  schemaVersion: typeof SOURCE_VIDEO_EVIDENCE_INSPECTOR_SCHEMA_VERSION;
  reviewLabel: typeof SOURCE_VIDEO_REVIEW_LABEL;
  actions: SourceVideoReviewAction[];
}

export function createSourceVideoEvidenceInspectorModel(input: {
  importedRecords: ImportedResearchCatalogRecord[];
  evidenceEntries: EvidenceManifestEntry[];
  captureEvents: CaptureLogEvent[];
}): SourceVideoInspectorModel {
  const evidenceByID = new Map(input.evidenceEntries.map((entry) => [entry.evidenceID, entry]));
  const captureEventsByCatalogID = indexCaptureEvents(input.captureEvents);
  const records = [...input.importedRecords]
    .sort(compareImportedRecords)
    .map((record) => createInspectorRecord(record, evidenceByID, captureEventsByCatalogID.get(record.stableInternalID) ?? []));
  return {
    schemaVersion: SOURCE_VIDEO_EVIDENCE_INSPECTOR_SCHEMA_VERSION,
    reviewLabel: SOURCE_VIDEO_REVIEW_LABEL,
    records
  };
}

export function createSourceVideoReviewAuditLog(): SourceVideoReviewAuditLog {
  return {
    schemaVersion: SOURCE_VIDEO_EVIDENCE_INSPECTOR_SCHEMA_VERSION,
    reviewLabel: SOURCE_VIDEO_REVIEW_LABEL,
    actions: []
  };
}

export function createSourceVideoReviewAction(input: {
  actionType: EvidenceQAActionType;
  catalogID: string;
  evidenceID: string | null;
  sourceVideoID: string | null;
  timestampSeconds: number | null;
  reviewerID?: string;
  reviewerRole?: EvidenceQAReviewerRole;
  targetStatus?: EvidenceQAStatus | null;
  notes?: string;
  createdAt: string;
  previousActionHash: string | null;
}): SourceVideoReviewAction {
  const reviewerRole = input.reviewerRole ?? "QA_REVIEWER";
  const targetStatus = input.targetStatus ?? null;
  assertEvidenceQAStatusTransition({ targetStatus, reviewerRole });
  const actionID = `source-video-review-${stableTextHash(
    [
      input.actionType,
      input.catalogID,
      input.evidenceID ?? "no-evidence",
      input.sourceVideoID ?? "no-video",
      input.timestampSeconds ?? "no-time",
      targetStatus ?? "no-status",
      reviewerRole,
      input.createdAt,
      input.previousActionHash ?? "root"
    ].join("|")
  )}`;
  const baseAction = {
    actionID,
    actionType: input.actionType,
    catalogID: input.catalogID,
    evidenceID: input.evidenceID,
    sourceVideoID: input.sourceVideoID,
    timestampSeconds: input.timestampSeconds,
    reviewerID: input.reviewerID ?? "LOCAL_REVIEWER",
    reviewerRole,
    targetStatus,
    notes: input.notes ?? "",
    createdAt: input.createdAt,
    previousActionHash: input.previousActionHash
  };
  return {
    ...baseAction,
    actionHash: stableTextHash(JSON.stringify(baseAction))
  };
}

export function appendSourceVideoReviewAction(log: SourceVideoReviewAuditLog, action: Omit<Parameters<typeof createSourceVideoReviewAction>[0], "previousActionHash">) {
  const previousActionHash = log.actions.at(-1)?.actionHash ?? null;
  return {
    ...log,
    actions: [...log.actions, createSourceVideoReviewAction({ ...action, previousActionHash })]
  };
}

export function summarizeSourceVideoReviewActions(log: SourceVideoReviewAuditLog) {
  const latestStatusByCatalogID = getLatestEvidenceQAStatusByCatalogID(log);
  return {
    totalActions: log.actions.length,
    approvedDerivatives: log.actions.filter((action) => action.actionType === "approvedDerivative").length,
    rejectedDerivatives: log.actions.filter((action) => action.actionType === "rejectedDerivative").length,
    incorrectAssociations: log.actions.filter((action) => action.actionType === "incorrectOptionAssociation").length,
    recaptureRequests: log.actions.filter((action) => action.actionType === "recaptureRequested" || action.targetStatus === "RECAPTURE_REQUIRED").length,
    statusCounts: Object.fromEntries(EVIDENCE_QA_STATUSES.map((status) => [
      status,
      [...latestStatusByCatalogID.values()].filter((candidate) => candidate === status).length
    ])) as Record<EvidenceQAStatus, number>
  };
}

export function getLatestEvidenceQAStatus(log: SourceVideoReviewAuditLog, catalogID: string): EvidenceQAStatus {
  return [...log.actions].reverse().find((action) => action.catalogID === catalogID && action.targetStatus)?.targetStatus ?? "OBSERVED_PENDING_QA";
}

export function getDecisionHistoryForCatalog(log: SourceVideoReviewAuditLog, catalogID: string): SourceVideoReviewAction[] {
  return log.actions.filter((action) => action.catalogID === catalogID);
}

export function assertEvidenceQAStatusTransition(input: {
  targetStatus: EvidenceQAStatus | null;
  reviewerRole: EvidenceQAReviewerRole;
}) {
  if (input.targetStatus && SECOND_VERIFIER_ONLY_STATUSES.includes(input.targetStatus) && input.reviewerRole !== "SECOND_VERIFIER") {
    throw new Error(`${input.targetStatus} requires the second-verifier workflow.`);
  }
}

export function createSourceVideoURL(sourceVideoID: string) {
  if (!isSafeSourceVideoID(sourceVideoID)) return null;
  return `/api/internal/research-source-video?sourceVideoID=${encodeURIComponent(sourceVideoID)}`;
}

export function isSafeSourceVideoID(sourceVideoID: string) {
  return /^video-\d{3}$/.test(sourceVideoID);
}

export function createSurroundingTimestampWindow(reference: ResearchTimestampReference, paddingSeconds = 3) {
  if (reference.startSeconds === null) {
    return {
      exactTimestampSeconds: null,
      surroundingStartSeconds: null,
      surroundingEndSeconds: null
    };
  }
  const endSeconds = reference.endSeconds ?? reference.startSeconds;
  return {
    exactTimestampSeconds: roundSeconds(reference.startSeconds),
    surroundingStartSeconds: roundSeconds(Math.max(0, reference.startSeconds - paddingSeconds)),
    surroundingEndSeconds: roundSeconds(endSeconds + paddingSeconds)
  };
}

export function createEvidencePreviewURL(entry: EvidenceManifestEntry | null) {
  return createDerivativePreviewURL(entry);
}

function createInspectorRecord(
  record: ImportedResearchCatalogRecord,
  evidenceByID: Map<string, EvidenceManifestEntry>,
  captureEvents: CaptureLogEvent[]
): SourceVideoInspectorRecord {
  const evidenceEntries = record.evidenceFileIDs.map((id) => evidenceByID.get(id)).filter((entry): entry is EvidenceManifestEntry => Boolean(entry));
  const menuEvidence = evidenceEntries.filter((entry) => /menu/i.test(entry.view ?? "") || /menu/i.test(entry.fileRole));
  const angleViews = evidenceEntries.filter((entry) => entry.masterOrDerivative === "derivative" && !menuEvidence.includes(entry));
  const sourceVideoOptions = createSourceVideoOptions(record.sourceTimestamps, captureEvents);
  const comparisonGroups = unique(sourceVideoOptions.map((option) => option.sourceVideoID)).map((sourceVideoID) => ({
    sourceVideoID,
    menuFrames: menuEvidence.filter((entry) => entry.sourceVideo === sourceVideoID),
    characterFrames: angleViews.filter((entry) => entry.sourceVideo === sourceVideoID)
  }));
  const captureQualityWarnings = unique([
    ...captureEvents.flatMap((event) => event.issueDetected ?? []).map((issue) => `${issue.code}: ${issue.message}`),
    ...record.incompleteFields.map((field) => `Incomplete field: ${field}`)
  ]);
  return {
    stableInternalID: record.stableInternalID,
    categoryExport: record.categoryExport,
    categoryLabel: record.category,
    nativeOrder: record.nativeOrder,
    nativeLabel: record.nativeLabel,
    researchStatus: record.verificationState,
    productionStatus: record.productionStatus,
    recaptureStatus: record.recaptureRequired ? "required" : "not-recorded",
    sourceVideoNames: unique([
      ...record.sourceTimestamps.map((reference) => reference.sourceFilename ?? reference.sourceVideoID),
      ...captureEvents.map((event) => event.sourceFilename)
    ]),
    timestampReferences: record.sourceTimestamps,
    menuEvidence,
    angleViews,
    derivativePreview: chooseDerivativePreview(angleViews, menuEvidence),
    captureQualityWarnings,
    missingViews: record.missingViews,
    duplicateEvidence: evidenceEntries.filter((entry) => {
      const duplicatesForPath = evidenceEntries.filter((candidate) => candidate.relativePath && candidate.relativePath === entry.relativePath);
      return duplicatesForPath.length > 1;
    }),
    face12Overlap: record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012",
    overlapSummary: record.overlapHandling,
    incompleteFields: record.incompleteFields,
    sourceVideoOptions,
    comparisonGroups
  };
}

function createSourceVideoOptions(timestampReferences: ResearchTimestampReference[], captureEvents: CaptureLogEvent[]) {
  const options = [
    ...timestampReferences.map((reference) => {
      const window = createSurroundingTimestampWindow(reference);
      return {
        sourceVideoID: reference.sourceVideoID,
        sourceFilename: reference.sourceFilename,
        exactTimestampSeconds: window.exactTimestampSeconds,
        surroundingStartSeconds: window.surroundingStartSeconds,
        surroundingEndSeconds: window.surroundingEndSeconds,
        basis: reference.basis,
        localVideoURL: createSourceVideoURL(reference.sourceVideoID) ?? ""
      };
    }),
    ...captureEvents.map((event) => ({
      sourceVideoID: event.sourceVideoID,
      sourceFilename: event.sourceFilename,
      exactTimestampSeconds: roundSeconds(event.beginningTimestamp),
      surroundingStartSeconds: roundSeconds(Math.max(0, event.beginningTimestamp - 3)),
      surroundingEndSeconds: roundSeconds(event.endingTimestamp + 3),
      basis: "capture log event",
      localVideoURL: createSourceVideoURL(event.sourceVideoID) ?? ""
    }))
  ];
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.sourceVideoID}|${option.exactTimestampSeconds}|${option.basis}`;
    if (seen.has(key) || !isSafeSourceVideoID(option.sourceVideoID)) return false;
    seen.add(key);
    return true;
  });
}

function chooseDerivativePreview(angleViews: EvidenceManifestEntry[], menuEvidence: EvidenceManifestEntry[]) {
  return (
    angleViews.find((entry) => /front|character_front|character_stable/i.test(entry.view ?? "")) ??
    angleViews[0] ??
    menuEvidence[0] ??
    null
  );
}

function getLatestEvidenceQAStatusByCatalogID(log: SourceVideoReviewAuditLog) {
  const statuses = new Map<string, EvidenceQAStatus>();
  for (const action of log.actions) {
    if (action.targetStatus) statuses.set(action.catalogID, action.targetStatus);
  }
  return statuses;
}

function indexCaptureEvents(events: CaptureLogEvent[]) {
  const index = new Map<string, CaptureLogEvent[]>();
  for (const event of events) {
    if (!event.catalogCandidate) continue;
    const values = index.get(event.catalogCandidate) ?? [];
    values.push(event);
    index.set(event.catalogCandidate, values);
  }
  return index;
}

function compareImportedRecords(left: ImportedResearchCatalogRecord, right: ImportedResearchCatalogRecord) {
  const category = left.categoryExport.localeCompare(right.categoryExport);
  if (category !== 0) return category;
  const leftOrder = left.nativeOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.nativeOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.stableInternalID.localeCompare(right.stableInternalID);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}

function stableTextHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
