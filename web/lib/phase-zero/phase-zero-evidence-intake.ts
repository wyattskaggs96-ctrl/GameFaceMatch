import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";
import type { Phase0EvidenceDerivativeState, Phase0EvidenceFileRole, Phase0EvidenceView } from "./phase-zero-evidence";

export const PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION = "phase0-evidence-intake-v1";
export const PHASE0_EVIDENCE_INTAKE_STORAGE_KEY = "gameface-match.phase0.evidence-intake.metadata.v1";
export const PHASE0_EVIDENCE_INTAKE_DRAFT_STORAGE_KEY = "gameface-match.phase0.evidence-intake.draft.v1";

export type Phase0EvidenceIntakeSource = "dragDrop" | "filePicker" | "folderPicker";
export type Phase0EvidenceClassification = "environment" | "catalogItem" | "menuNavigation" | "standardAngle" | "review" | "other";
export type Phase0EvidenceIntakeStatus = "pending" | "readyForFinalization" | "finalized" | "removed";
export type Phase0EvidenceIntakeSeverity = "warning" | "error";

export const PHASE0_ALLOWED_EVIDENCE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
  "text/plain",
  "application/json"
];

export const PHASE0_MAX_EVIDENCE_FILE_SIZE_BYTES = 500 * 1024 * 1024;

export interface Phase0EvidenceIntakeFileLike {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath?: string;
}

export interface Phase0EvidenceIntakeMetadata {
  classification: Phase0EvidenceClassification | "";
  catalogItemID: Phase0EntityID | null;
  environmentID: Phase0EntityID | null;
  derivativeState: Phase0EvidenceDerivativeState | "";
  fileRole: Phase0EvidenceFileRole | "";
  view: Phase0EvidenceView | "";
  notes: string;
}

export interface Phase0EvidenceIntakeWarning {
  code: string;
  severity: Phase0EvidenceIntakeSeverity;
  message: string;
  intakeID: Phase0EntityID;
}

export interface Phase0EvidenceIntakeItem {
  intakeID: Phase0EntityID;
  originalFilename: string;
  relativeSourcePath: string;
  sizeBytes: number;
  mimeType: string;
  lastModified: number;
  source: Phase0EvidenceIntakeSource;
  addedAt: ISODateString;
  status: Phase0EvidenceIntakeStatus;
  metadata: Phase0EvidenceIntakeMetadata;
  warnings: Phase0EvidenceIntakeWarning[];
}

export interface Phase0FinalizedEvidenceIntakeRecord {
  intakeID: Phase0EntityID;
  originalFilename: string;
  relativeSourcePath: string;
  sizeBytes: number;
  mimeType: string;
  lastModified: number;
  source: Phase0EvidenceIntakeSource;
  finalizedAt: ISODateString;
  metadata: Phase0EvidenceIntakeMetadata;
  preservationNote: string;
}

export interface Phase0EvidenceIntakeBatch {
  schemaVersion: typeof PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION;
  batchID: Phase0EntityID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  items: Phase0EvidenceIntakeItem[];
  finalizedRecords: Phase0FinalizedEvidenceIntakeRecord[];
}

export interface Phase0EvidenceIntakeDraft {
  schemaVersion: typeof PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION;
  draftID: Phase0EntityID;
  savedAt: ISODateString;
  batch: Phase0EvidenceIntakeBatch;
  productionReady: false;
  rawFileBytesStored: false;
  recoveryNote: string;
}

export interface Phase0EvidenceIntakeRecoveryReport {
  hasDraft: boolean;
  activeItemCount: number;
  interruptedUploadCount: number;
  canFinalize: boolean;
  messages: string[];
}

export interface Phase0EvidenceIntakeReport {
  ok: boolean;
  errors: Phase0EvidenceIntakeWarning[];
  warnings: Phase0EvidenceIntakeWarning[];
  pendingCount: number;
  finalizedCount: number;
}

export interface Phase0EvidenceIntakeLocalStore {
  load(): Phase0FinalizedEvidenceIntakeRecord[];
  save(records: Phase0FinalizedEvidenceIntakeRecord[]): void;
  clear(): void;
}

export interface Phase0EvidenceIntakeDraftStore {
  load(): Phase0EvidenceIntakeDraft | null;
  save(draft: Phase0EvidenceIntakeDraft): void;
  clear(): void;
}

export function createEmptyEvidenceIntakeBatch({
  batchID,
  nowISO
}: {
  batchID: Phase0EntityID;
  nowISO: ISODateString;
}): Phase0EvidenceIntakeBatch {
  return {
    schemaVersion: PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION,
    batchID,
    createdAt: nowISO,
    updatedAt: nowISO,
    items: [],
    finalizedRecords: []
  };
}

export function addEvidenceFilesToBatch(
  batch: Phase0EvidenceIntakeBatch,
  files: Phase0EvidenceIntakeFileLike[],
  source: Phase0EvidenceIntakeSource,
  nowISO: ISODateString
): Phase0EvidenceIntakeBatch {
  const existingFilenames = batch.items.filter((item) => item.status !== "removed").map((item) => item.originalFilename);
  const newItems = files.map((file, index) =>
    createEvidenceIntakeItem({
      file,
      source,
      intakeID: `${batch.batchID}-item-${batch.items.length + index + 1}`,
      nowISO,
      existingFilenames: [...existingFilenames, ...files.slice(0, index).map((previousFile) => previousFile.name)]
    })
  );
  const nextBatch = {
    ...batch,
    updatedAt: nowISO,
    items: [...batch.items, ...newItems]
  };
  return revalidateEvidenceIntakeBatch(nextBatch);
}

export function updateEvidenceIntakeMetadata(
  batch: Phase0EvidenceIntakeBatch,
  intakeID: Phase0EntityID,
  metadata: Partial<Phase0EvidenceIntakeMetadata>,
  updatedAt: ISODateString
): Phase0EvidenceIntakeBatch {
  const nextBatch = {
    ...batch,
    updatedAt,
    items: batch.items.map((item) =>
      item.intakeID === intakeID
        ? {
            ...item,
            metadata: normalizeMetadata({ ...item.metadata, ...metadata })
          }
        : item
    )
  };
  return revalidateEvidenceIntakeBatch(nextBatch);
}

export function removeEvidenceIntakeItem(
  batch: Phase0EvidenceIntakeBatch,
  intakeID: Phase0EntityID,
  updatedAt: ISODateString
): Phase0EvidenceIntakeBatch {
  return {
    ...batch,
    updatedAt,
    items: batch.items.map((item) => item.intakeID === intakeID ? { ...item, status: "removed", warnings: [] } : item)
  };
}

export function finalizeEvidenceIntakeBatch(
  batch: Phase0EvidenceIntakeBatch,
  finalizedAt: ISODateString
): Phase0EvidenceIntakeBatch {
  const report = validateEvidenceIntakeBatch(batch);
  if (!report.ok) return batch;
  const finalizedRecords = batch.items
    .filter((item) => item.status !== "removed")
    .map((item): Phase0FinalizedEvidenceIntakeRecord => ({
      intakeID: item.intakeID,
      originalFilename: item.originalFilename,
      relativeSourcePath: item.relativeSourcePath,
      sizeBytes: item.sizeBytes,
      mimeType: item.mimeType,
      lastModified: item.lastModified,
      source: item.source,
      finalizedAt,
      metadata: item.metadata,
      preservationNote: "Original file bytes are not modified, uploaded, or serialized by the intake manager."
    }));
  return {
    ...batch,
    updatedAt: finalizedAt,
    items: batch.items.map((item) => item.status === "removed" ? item : { ...item, status: "finalized" }),
    finalizedRecords
  };
}

export function validateEvidenceIntakeBatch(batch: Phase0EvidenceIntakeBatch): Phase0EvidenceIntakeReport {
  const warnings = batch.items.flatMap((item) => item.warnings.filter((warning) => warning.severity === "warning"));
  const errors = batch.items.flatMap((item) => item.warnings.filter((warning) => warning.severity === "error"));
  if (batch.schemaVersion !== PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION) {
    errors.push({
      code: "invalidSchemaVersion",
      severity: "error",
      message: `Expected ${PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION}.`,
      intakeID: batch.batchID
    });
  }
  return {
    ok: errors.length === 0 && batch.items.some((item) => item.status !== "removed"),
    errors,
    warnings,
    pendingCount: batch.items.filter((item) => item.status !== "removed" && item.status !== "finalized").length,
    finalizedCount: batch.finalizedRecords.length
  };
}

export function createEvidenceIntakeDraft(batch: Phase0EvidenceIntakeBatch, savedAt: ISODateString): Phase0EvidenceIntakeDraft {
  return {
    schemaVersion: PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION,
    draftID: `${batch.batchID}-draft`,
    savedAt,
    batch: sanitizeDraftBatch(batch),
    productionReady: false,
    rawFileBytesStored: false,
    recoveryNote:
      "Draft audit-session metadata is local and incomplete until source files are available, validation passes, and the catalog publication workflow approves it."
  };
}

export function createEvidenceIntakeRecoveryReport(draft: Phase0EvidenceIntakeDraft | null): Phase0EvidenceIntakeRecoveryReport {
  if (!draft) {
    return {
      hasDraft: false,
      activeItemCount: 0,
      interruptedUploadCount: 0,
      canFinalize: false,
      messages: ["No local evidence-intake draft is available."]
    };
  }
  const activeItems = draft.batch.items.filter((item) => item.status !== "removed");
  const report = validateEvidenceIntakeBatch(draft.batch);
  return {
    hasDraft: true,
    activeItemCount: activeItems.length,
    interruptedUploadCount: activeItems.length,
    canFinalize: report.ok,
    messages: [
      `${activeItems.length} evidence metadata row${activeItems.length === 1 ? "" : "s"} can be reviewed after recovery.`,
      "Browser refresh cannot restore original File objects. Reselect source evidence before relying on checksums or final package validation.",
      "Recovered drafts are not production-ready and cannot verify College Football 27 records."
    ]
  };
}

export function createEvidenceIntakeLocalStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): Phase0EvidenceIntakeLocalStore {
  return {
    load() {
      const raw = storage.getItem(PHASE0_EVIDENCE_INTAKE_STORAGE_KEY);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed as Phase0FinalizedEvidenceIntakeRecord[] : [];
      } catch {
        return [];
      }
    },
    save(records) {
      storage.setItem(PHASE0_EVIDENCE_INTAKE_STORAGE_KEY, JSON.stringify(records));
    },
    clear() {
      storage.removeItem(PHASE0_EVIDENCE_INTAKE_STORAGE_KEY);
    }
  };
}

export function createEvidenceIntakeDraftStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): Phase0EvidenceIntakeDraftStore {
  return {
    load() {
      const raw = storage.getItem(PHASE0_EVIDENCE_INTAKE_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as Phase0EvidenceIntakeDraft;
        return parsed?.schemaVersion === PHASE0_EVIDENCE_INTAKE_SCHEMA_VERSION ? parsed : null;
      } catch {
        return null;
      }
    },
    save(draft) {
      storage.setItem(PHASE0_EVIDENCE_INTAKE_DRAFT_STORAGE_KEY, JSON.stringify({
        ...draft,
        batch: sanitizeDraftBatch(draft.batch),
        productionReady: false,
        rawFileBytesStored: false
      }));
    },
    clear() {
      storage.removeItem(PHASE0_EVIDENCE_INTAKE_DRAFT_STORAGE_KEY);
    }
  };
}

function createEvidenceIntakeItem({
  file,
  source,
  intakeID,
  nowISO,
  existingFilenames
}: {
  file: Phase0EvidenceIntakeFileLike;
  source: Phase0EvidenceIntakeSource;
  intakeID: Phase0EntityID;
  nowISO: ISODateString;
  existingFilenames: string[];
}): Phase0EvidenceIntakeItem {
  const item: Phase0EvidenceIntakeItem = {
    intakeID,
    originalFilename: file.name,
    relativeSourcePath: sanitizeRelativePath(file.webkitRelativePath || file.name),
    sizeBytes: file.size,
    mimeType: file.type || "application/octet-stream",
    lastModified: file.lastModified,
    source,
    addedAt: nowISO,
    status: "pending",
    metadata: emptyMetadata(),
    warnings: []
  };
  return {
    ...item,
    warnings: buildWarnings(item, existingFilenames)
  };
}

function revalidateEvidenceIntakeBatch(batch: Phase0EvidenceIntakeBatch): Phase0EvidenceIntakeBatch {
  const activeItems = batch.items.filter((item) => item.status !== "removed");
  return {
    ...batch,
    items: batch.items.map((item) => {
      if (item.status === "removed") return item;
      const duplicateNames = activeItems
        .filter((candidate) => candidate.intakeID !== item.intakeID)
        .map((candidate) => candidate.originalFilename);
      const warnings = buildWarnings(item, duplicateNames);
      return {
        ...item,
        status: warnings.some((warning) => warning.severity === "error") ? "pending" : "readyForFinalization",
        warnings
      };
    })
  };
}

function sanitizeDraftBatch(batch: Phase0EvidenceIntakeBatch): Phase0EvidenceIntakeBatch {
  return {
    ...batch,
    items: batch.items.map((item) => ({ ...item })),
    finalizedRecords: batch.finalizedRecords.map((record) => ({ ...record }))
  };
}

function buildWarnings(item: Phase0EvidenceIntakeItem, comparisonFilenames: string[]): Phase0EvidenceIntakeWarning[] {
  const warnings: Phase0EvidenceIntakeWarning[] = [];
  if (comparisonFilenames.includes(item.originalFilename)) {
    warnings.push(warning("duplicateFilename", "Duplicate filename detected. Confirm this is a separate evidence file before finalization.", item.intakeID));
  }
  if (!PHASE0_ALLOWED_EVIDENCE_MIME_TYPES.includes(item.mimeType)) {
    warnings.push(warning("invalidFileType", `Unsupported evidence file type: ${item.mimeType}.`, item.intakeID));
  }
  if (item.sizeBytes > PHASE0_MAX_EVIDENCE_FILE_SIZE_BYTES) {
    warnings.push(warning("oversizedFile", "Evidence file is larger than the local intake limit.", item.intakeID));
  }
  if (!hasRequiredMetadata(item.metadata)) {
    warnings.push(error("missingMetadata", "Evidence classification, environment association, derivative state, role, and view are required.", item.intakeID));
  }
  if (item.metadata.classification === "catalogItem" && !hasUsableText(item.metadata.catalogItemID ?? "")) {
    warnings.push(error("missingCatalogAssociation", "Catalog-item evidence requires catalogItemID.", item.intakeID));
  }
  return warnings;
}

function emptyMetadata(): Phase0EvidenceIntakeMetadata {
  return {
    classification: "",
    catalogItemID: null,
    environmentID: null,
    derivativeState: "",
    fileRole: "",
    view: "",
    notes: ""
  };
}

function normalizeMetadata(metadata: Phase0EvidenceIntakeMetadata): Phase0EvidenceIntakeMetadata {
  return {
    classification: metadata.classification,
    catalogItemID: normalizeNullable(metadata.catalogItemID),
    environmentID: normalizeNullable(metadata.environmentID),
    derivativeState: metadata.derivativeState,
    fileRole: metadata.fileRole,
    view: metadata.view,
    notes: metadata.notes.trim()
  };
}

function hasRequiredMetadata(metadata: Phase0EvidenceIntakeMetadata) {
  return Boolean(metadata.classification && metadata.environmentID && metadata.derivativeState && metadata.fileRole && metadata.view);
}

function sanitizeRelativePath(value: string) {
  return value.replaceAll("\\", "/").split("/").filter((part) => part.trim().length > 0 && part !== "." && part !== "..").join("/");
}

function normalizeNullable(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function warning(code: string, message: string, intakeID: Phase0EntityID): Phase0EvidenceIntakeWarning {
  return { code, severity: "warning", message, intakeID };
}

function error(code: string, message: string, intakeID: Phase0EntityID): Phase0EvidenceIntakeWarning {
  return { code, severity: "error", message, intakeID };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
