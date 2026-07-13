export const CURRENT_EVIDENCE_GALLERY_SCHEMA_VERSION = "current-evidence-gallery-v1";
export const CURRENT_EVIDENCE_GALLERY_LABEL = "PRIMARY RESEARCH CANDIDATE — NOT PRODUCTION VERIFIED";

export interface ImportedResearchCatalogRecord {
  stableInternalID: string;
  sourceType: string;
  dataClass: string;
  productionStatus: string;
  verificationState: string;
  productionRecommendationAccess: boolean;
  categoryExport: string;
  category: string;
  nativeOrder: number | null;
  nativeLabel: string;
  sourceTimestamps: ResearchTimestampReference[];
  evidenceFileIDs: string[];
  captureEventIDs: string[];
  missingViews: string[];
  recaptureRequired: boolean;
  incompleteFields: string[];
  overlapHandling: string | null;
  visualSimilarityMergeStatus: string;
}

export interface ResearchTimestampReference {
  sourceVideoID: string;
  sourceFilename: string | null;
  startSeconds: number | null;
  endSeconds: number | null;
  basis: string;
}

export interface EvidenceManifestEntry {
  evidenceID: string;
  catalogID?: string;
  fileRole: string;
  masterOrDerivative: "master" | "derivative" | string;
  relativePath?: string;
  sourceVideo?: string;
  sourceVideoPath?: string;
  timestamp?: number;
  view?: string;
  verificationState?: string;
  validationState?: string;
  notes?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
}

export interface CaptureLogEvent {
  captureEventID: string;
  catalogCandidate: string | null;
  category: string;
  nativeOption: string | null;
  action: string;
  sourceVideoID: string;
  sourceFilename: string;
  beginningTimestamp: number;
  endingTimestamp: number;
  evidenceGenerated: string[];
  issueDetected: Array<{ code: string; severity: string; message: string }>;
  retakeStatus: string;
  notes: string;
}

export interface CurrentEvidenceGalleryRecord {
  stableInternalID: string;
  categoryExport: string;
  categoryLabel: string;
  nativeOrder: number | null;
  nativeLabel: string;
  researchStatus: string;
  productionStatus: string;
  recaptureStatus: "required" | "not-recorded";
  sourceVideoNames: string[];
  timestampReferences: ResearchTimestampReference[];
  menuEvidence: EvidenceManifestEntry[];
  angleViews: EvidenceManifestEntry[];
  derivativePreview: EvidenceManifestEntry | null;
  captureQualityWarnings: string[];
  missingViews: string[];
  duplicateEvidence: EvidenceManifestEntry[];
  face12Overlap: boolean;
  overlapSummary: string | null;
  incompleteFields: string[];
}

export interface CurrentEvidenceGallerySummary {
  schemaVersion: typeof CURRENT_EVIDENCE_GALLERY_SCHEMA_VERSION;
  packageLabel: typeof CURRENT_EVIDENCE_GALLERY_LABEL;
  records: CurrentEvidenceGalleryRecord[];
  categories: string[];
  totalRecords: number;
  recordsRequiringRecapture: number;
  recordsWithMissingViews: number;
  recordsWithDuplicateEvidence: number;
  face12OverlapRecord: CurrentEvidenceGalleryRecord | null;
}

export function createCurrentEvidenceGallerySummary(input: {
  importedRecords: ImportedResearchCatalogRecord[];
  evidenceEntries: EvidenceManifestEntry[];
  captureEvents: CaptureLogEvent[];
}): CurrentEvidenceGallerySummary {
  const evidenceByID = new Map(input.evidenceEntries.map((entry) => [entry.evidenceID, entry]));
  const eventsByCandidate = indexByCatalogCandidate(input.captureEvents);
  const records = [...input.importedRecords]
    .sort((left, right) => compareRecords(left, right))
    .map((record) => createGalleryRecord(record, evidenceByID, eventsByCandidate.get(record.stableInternalID) ?? []));
  return {
    schemaVersion: CURRENT_EVIDENCE_GALLERY_SCHEMA_VERSION,
    packageLabel: CURRENT_EVIDENCE_GALLERY_LABEL,
    records,
    categories: unique(records.map((record) => record.categoryExport)),
    totalRecords: records.length,
    recordsRequiringRecapture: records.filter((record) => record.recaptureStatus === "required").length,
    recordsWithMissingViews: records.filter((record) => record.missingViews.length > 0).length,
    recordsWithDuplicateEvidence: records.filter((record) => record.duplicateEvidence.length > 0).length,
    face12OverlapRecord: records.find((record) => record.face12Overlap) ?? null
  };
}

export function filterGalleryRecords(records: CurrentEvidenceGalleryRecord[], category: string) {
  if (category === "all") return records;
  return records.filter((record) => record.categoryExport === category);
}

export function createTimestampReferenceLabel(reference: ResearchTimestampReference) {
  const range = reference.startSeconds === null ? "timestamp unknown" : `${formatSeconds(reference.startSeconds)}${reference.endSeconds === null ? "" : `-${formatSeconds(reference.endSeconds)}`}`;
  return `${reference.sourceFilename ?? reference.sourceVideoID} @ ${range}`;
}

export function createDerivativePreviewURL(entry: EvidenceManifestEntry | null) {
  if (!entry?.relativePath) return null;
  return `/api/internal/research-evidence-frame?path=${encodeURIComponent(entry.relativePath)}`;
}

export function isSafeResearchDerivativePath(relativePath: string) {
  if (!relativePath || relativePath.startsWith("/") || relativePath.includes("..")) return false;
  if (!relativePath.startsWith("data/research/cf27/generated/full-resolution-frames/")) return false;
  return /\.(png|jpg|jpeg|webp)$/i.test(relativePath);
}

function createGalleryRecord(
  record: ImportedResearchCatalogRecord,
  evidenceByID: Map<string, EvidenceManifestEntry>,
  captureEvents: CaptureLogEvent[]
): CurrentEvidenceGalleryRecord {
  const evidenceEntries = record.evidenceFileIDs.map((id) => evidenceByID.get(id)).filter((entry): entry is EvidenceManifestEntry => Boolean(entry));
  const menuEvidence = evidenceEntries.filter((entry) => /menu/i.test(entry.view ?? "") || /menu/i.test(entry.fileRole));
  const angleViews = evidenceEntries.filter((entry) => entry.masterOrDerivative === "derivative" && !menuEvidence.includes(entry));
  const derivativePreview = chooseDerivativePreview(angleViews, menuEvidence);
  const duplicateEvidence = evidenceEntries.filter((entry) => {
    const duplicatesForPath = evidenceEntries.filter((candidate) => candidate.relativePath && candidate.relativePath === entry.relativePath);
    return duplicatesForPath.length > 1;
  });
  const warnings = unique([
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
    derivativePreview,
    captureQualityWarnings: warnings,
    missingViews: record.missingViews,
    duplicateEvidence,
    face12Overlap: record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012",
    overlapSummary: record.overlapHandling,
    incompleteFields: record.incompleteFields
  };
}

function chooseDerivativePreview(angleViews: EvidenceManifestEntry[], menuEvidence: EvidenceManifestEntry[]) {
  return (
    angleViews.find((entry) => /front|character_front|character_stable/i.test(entry.view ?? "")) ??
    angleViews[0] ??
    menuEvidence[0] ??
    null
  );
}

function indexByCatalogCandidate(events: CaptureLogEvent[]) {
  const index = new Map<string, CaptureLogEvent[]>();
  for (const event of events) {
    if (!event.catalogCandidate) continue;
    const values = index.get(event.catalogCandidate) ?? [];
    values.push(event);
    index.set(event.catalogCandidate, values);
  }
  return index;
}

function compareRecords(left: ImportedResearchCatalogRecord, right: ImportedResearchCatalogRecord) {
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

function formatSeconds(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(2)}s`;
}
