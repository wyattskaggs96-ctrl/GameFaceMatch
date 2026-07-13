import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";
import type { Phase0EvidenceDerivativeState, Phase0EvidenceFileRole, Phase0EvidenceView } from "./phase-zero-evidence";

export const PHASE0_SOURCE_VIDEO_SCHEMA_VERSION = "phase0-source-video-v1";
export const PHASE0_SOURCE_VIDEO_STORAGE_KEY = "gameface-match.phase0.source-video.metadata.v1";

export type Phase0SourceVideoStatus = "registered" | "metadataIncomplete" | "removed";
export type Phase0SourceVideoCaptureMethod = "captureCard" | "consoleRecording" | "phoneVideo" | "screenRecording" | "unknown";
export type Phase0FrameExtractionCapabilityStatus = "available" | "unavailable";
export type Phase0FrameExtractionStatus = "ready" | "disabled" | "extracted" | "failed";

export interface Phase0SourceVideoMetadata {
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  frameRate: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  containerFormat: string | null;
}

export interface Phase0SourceVideoFileLike {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  relativePath?: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  frameRate?: number | null;
  videoCodec?: string | null;
  audioCodec?: string | null;
  containerFormat?: string | null;
  sha256?: string | null;
}

export interface Phase0SourceVideoRecord {
  schemaVersion: typeof PHASE0_SOURCE_VIDEO_SCHEMA_VERSION;
  videoID: Phase0EntityID;
  originalFilename: string;
  relativePath: string;
  sha256: string | null;
  sizeBytes: number;
  mimeType: string;
  lastModified: number;
  status: Phase0SourceVideoStatus;
  captureMethod: Phase0SourceVideoCaptureMethod;
  captureDevice: string;
  platformID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  mode: string;
  creationPathID: Phase0EntityID;
  environmentID: Phase0EntityID;
  registeredAt: ISODateString;
  metadata: Phase0SourceVideoMetadata;
  preservationNote: string;
  notes: string;
}

export interface Phase0VideoTimestampReference {
  referenceID: Phase0EntityID;
  videoID: Phase0EntityID;
  catalogItemID: Phase0EntityID | null;
  view: Phase0EvidenceView;
  timestampSeconds: number;
  label: string;
  notes: string;
  verificationStatus: Phase0VerificationState;
  createdAt: ISODateString;
}

export interface Phase0DerivativeFrameRecord {
  frameID: Phase0EntityID;
  sourceVideoID: Phase0EntityID;
  timestampReferenceID: Phase0EntityID;
  relativePath: string;
  derivativeState: Extract<Phase0EvidenceDerivativeState, "derivative">;
  fileRole: Phase0EvidenceFileRole;
  view: Phase0EvidenceView;
  timestampSeconds: number;
  extractionMethod: string;
  extractedAt: ISODateString;
  sourceVideoProvenance: {
    videoID: Phase0EntityID;
    originalFilename: string;
    relativePath: string;
    sha256: string | null;
  };
  notes: string;
}

export interface Phase0FrameExtractionCapability {
  status: Phase0FrameExtractionCapabilityStatus;
  toolName: string;
  reason: string;
}

export interface Phase0FrameExtractionRequest {
  sourceVideo: Phase0SourceVideoRecord;
  timestampReference: Phase0VideoTimestampReference;
  outputRelativePath: string;
  outputFrameID: Phase0EntityID;
  fileRole: Phase0EvidenceFileRole;
  extractedAt: ISODateString;
}

export interface Phase0FrameExtractionPlan {
  status: Phase0FrameExtractionStatus;
  capability: Phase0FrameExtractionCapability;
  command: string[];
  sourceRelativePath: string;
  outputRelativePath: string;
  timestampSeconds: number;
  warnings: string[];
  preservationNote: string;
}

export interface Phase0SourceVideoValidationIssue {
  code: string;
  message: string;
  entityID?: string;
}

export interface Phase0SourceVideoValidationReport {
  ok: boolean;
  errors: Phase0SourceVideoValidationIssue[];
  warnings: Phase0SourceVideoValidationIssue[];
}

export interface Phase0SourceVideoLocalStore {
  load(): Phase0SourceVideoRecord[];
  save(records: Phase0SourceVideoRecord[]): void;
  clear(): void;
}

const supportedVideoMimeTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const supportedViews = new Set<Phase0EvidenceView>([
  "straightOn",
  "left45",
  "right45",
  "leftProfile",
  "rightProfile",
  "navigationEvidence",
  "menuOverview",
  "environment",
  "notApplicable"
]);

export function registerSourceVideo(input: {
  videoID: Phase0EntityID;
  file: Phase0SourceVideoFileLike;
  captureMethod: Phase0SourceVideoCaptureMethod;
  captureDevice: string;
  platformID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  mode: string;
  creationPathID: Phase0EntityID;
  environmentID: Phase0EntityID;
  registeredAt: ISODateString;
  notes: string;
}): Phase0SourceVideoRecord {
  return {
    schemaVersion: PHASE0_SOURCE_VIDEO_SCHEMA_VERSION,
    videoID: input.videoID,
    originalFilename: input.file.name,
    relativePath: normalizeRelativePathInput(input.file.relativePath ?? input.file.name),
    sha256: normalizeNullable(input.file.sha256 ?? null),
    sizeBytes: input.file.size,
    mimeType: input.file.type || "application/octet-stream",
    lastModified: input.file.lastModified,
    status: hasRequiredVideoMetadata(input.file) ? "registered" : "metadataIncomplete",
    captureMethod: input.captureMethod,
    captureDevice: input.captureDevice.trim(),
    platformID: input.platformID,
    gameVersionID: input.gameVersionID,
    patchID: input.patchID,
    mode: input.mode.trim(),
    creationPathID: input.creationPathID,
    environmentID: input.environmentID,
    registeredAt: input.registeredAt,
    metadata: {
      durationSeconds: normalizePositiveNumber(input.file.durationSeconds ?? null),
      width: normalizePositiveInteger(input.file.width ?? null),
      height: normalizePositiveInteger(input.file.height ?? null),
      frameRate: normalizePositiveNumber(input.file.frameRate ?? null),
      videoCodec: normalizeNullable(input.file.videoCodec ?? null),
      audioCodec: normalizeNullable(input.file.audioCodec ?? null),
      containerFormat: normalizeNullable(input.file.containerFormat ?? null)
    },
    preservationNote: "Original source video is registered as master evidence metadata only; bytes are not serialized, recompressed, or uploaded.",
    notes: input.notes.trim()
  };
}

export function createVideoTimestampReference(input: {
  referenceID: Phase0EntityID;
  video: Phase0SourceVideoRecord;
  catalogItemID: Phase0EntityID | null;
  view: Phase0EvidenceView;
  timestampSeconds: number;
  label: string;
  notes: string;
  verificationStatus?: Phase0VerificationState;
  createdAt: ISODateString;
}): Phase0VideoTimestampReference {
  return {
    referenceID: input.referenceID,
    videoID: input.video.videoID,
    catalogItemID: normalizeNullable(input.catalogItemID),
    view: input.view,
    timestampSeconds: roundTimestamp(input.timestampSeconds),
    label: input.label.trim(),
    notes: input.notes.trim(),
    verificationStatus: input.verificationStatus ?? "draft",
    createdAt: input.createdAt
  };
}

export function previewTimestampReference(video: Phase0SourceVideoRecord, reference: Phase0VideoTimestampReference) {
  const safeTimestamp = Math.max(0, reference.timestampSeconds);
  return {
    videoID: video.videoID,
    referenceID: reference.referenceID,
    label: `${reference.label || reference.view} at ${safeTimestamp.toFixed(3)}s`,
    mediaFragment: `${video.relativePath}#t=${safeTimestamp.toFixed(3)}`,
    canPreviewInBrowser: supportedVideoMimeTypes.has(video.mimeType) && video.status !== "removed"
  };
}

export function validateSourceVideoRecord(video: Phase0SourceVideoRecord): Phase0SourceVideoValidationReport {
  const errors: Phase0SourceVideoValidationIssue[] = [];
  const warnings: Phase0SourceVideoValidationIssue[] = [];
  if (video.schemaVersion !== PHASE0_SOURCE_VIDEO_SCHEMA_VERSION) errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_SOURCE_VIDEO_SCHEMA_VERSION}.`, video.videoID));
  for (const [field, value] of [
    ["videoID", video.videoID],
    ["originalFilename", video.originalFilename],
    ["relativePath", video.relativePath],
    ["captureDevice", video.captureDevice],
    ["platformID", video.platformID],
    ["gameVersionID", video.gameVersionID],
    ["patchID", video.patchID],
    ["mode", video.mode],
    ["creationPathID", video.creationPathID],
    ["environmentID", video.environmentID],
    ["notes", video.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingSourceVideoField", `${video.videoID || "source video"} is missing ${field}.`, video.videoID));
  }
  if (!isRelativeSafePath(video.relativePath)) errors.push(issue("unsafeSourceVideoPath", `${video.videoID} must use a safe relative source-video path.`, video.videoID));
  if (!supportedVideoMimeTypes.has(video.mimeType)) errors.push(issue("unsupportedSourceVideoType", `${video.videoID} has unsupported video MIME type ${video.mimeType}.`, video.videoID));
  if (!Number.isInteger(video.sizeBytes) || video.sizeBytes < 1) errors.push(issue("invalidSourceVideoSize", `${video.videoID} must record a positive file size.`, video.videoID));
  if (!isISODate(video.registeredAt)) errors.push(issue("invalidTimestamp", `${video.videoID} registeredAt must be an ISO timestamp.`, video.videoID));
  if (video.sha256 !== null && !/^[a-f0-9]{64}$/.test(video.sha256)) errors.push(issue("invalidSha256", `${video.videoID} requires a lowercase SHA-256 digest when recorded.`, video.videoID));
  if (video.metadata.durationSeconds === null) warnings.push(issue("missingDuration", `${video.videoID} duration is not recorded yet.`, video.videoID));
  if (video.metadata.width === null || video.metadata.height === null) warnings.push(issue("missingVideoDimensions", `${video.videoID} dimensions are not recorded yet.`, video.videoID));
  return { ok: errors.length === 0, errors, warnings };
}

export function validateTimestampReference(video: Phase0SourceVideoRecord, reference: Phase0VideoTimestampReference): Phase0SourceVideoValidationReport {
  const errors: Phase0SourceVideoValidationIssue[] = [];
  const warnings: Phase0SourceVideoValidationIssue[] = [];
  if (reference.videoID !== video.videoID) errors.push(issue("timestampVideoMismatch", `${reference.referenceID} does not reference ${video.videoID}.`, reference.referenceID));
  if (!hasUsableText(reference.referenceID) || !hasUsableText(reference.label) || !hasUsableText(reference.notes)) {
    errors.push(issue("missingTimestampReferenceField", `${reference.referenceID || "timestamp reference"} is incomplete.`, reference.referenceID));
  }
  if (!Number.isFinite(reference.timestampSeconds) || reference.timestampSeconds < 0) {
    errors.push(issue("invalidTimestampSeconds", `${reference.referenceID} timestamp must be zero or greater.`, reference.referenceID));
  }
  if (video.metadata.durationSeconds !== null && reference.timestampSeconds > video.metadata.durationSeconds) {
    errors.push(issue("timestampBeyondDuration", `${reference.referenceID} is beyond the source-video duration.`, reference.referenceID));
  }
  if (!supportedViews.has(reference.view)) errors.push(issue("invalidView", `${reference.referenceID} uses unsupported view ${reference.view}.`, reference.referenceID));
  if (reference.verificationStatus === "verified") warnings.push(issue("timestampVerifiedSeparately", `${reference.referenceID} still requires normal evidence review before publication.`, reference.referenceID));
  return { ok: errors.length === 0, errors, warnings };
}

export function planDerivativeFrameExtraction(request: Phase0FrameExtractionRequest, capability: Phase0FrameExtractionCapability): Phase0FrameExtractionPlan {
  const warnings = [];
  const sourceRelativePath = request.sourceVideo.relativePath;
  const outputRelativePath = normalizeRelativePathInput(request.outputRelativePath);
  if (sourceRelativePath === outputRelativePath) warnings.push("Output frame path must differ from the source video path.");
  if (request.sourceVideo.status === "removed") warnings.push("Source video is removed and cannot be used for extraction.");
  const status: Phase0FrameExtractionStatus = capability.status === "available" && warnings.length === 0 ? "ready" : "disabled";
  return {
    status,
    capability,
    command: status === "ready"
      ? [
          "ffmpeg",
          "-y",
          "-ss",
          request.timestampReference.timestampSeconds.toFixed(3),
          "-i",
          sourceRelativePath,
          "-frames:v",
          "1",
          outputRelativePath
        ]
      : [],
    sourceRelativePath,
    outputRelativePath,
    timestampSeconds: request.timestampReference.timestampSeconds,
    warnings: capability.status === "available" ? warnings : [capability.reason, ...warnings],
    preservationNote: "The master source video is input-only. Extraction writes a separate derivative still frame and never recompresses the original video."
  };
}

export function createDerivativeFrameRecord(request: Phase0FrameExtractionRequest, extractionMethod = "ffmpeg-local"): Phase0DerivativeFrameRecord {
  return {
    frameID: request.outputFrameID,
    sourceVideoID: request.sourceVideo.videoID,
    timestampReferenceID: request.timestampReference.referenceID,
    relativePath: normalizeRelativePathInput(request.outputRelativePath),
    derivativeState: "derivative",
    fileRole: request.fileRole,
    view: request.timestampReference.view,
    timestampSeconds: request.timestampReference.timestampSeconds,
    extractionMethod,
    extractedAt: request.extractedAt,
    sourceVideoProvenance: {
      videoID: request.sourceVideo.videoID,
      originalFilename: request.sourceVideo.originalFilename,
      relativePath: request.sourceVideo.relativePath,
      sha256: request.sourceVideo.sha256
    },
    notes: "Derivative still frame extracted locally from the registered source video."
  };
}

export function unavailableFrameExtractionCapability(reason = "FFmpeg or equivalent local extraction tool is unavailable."): Phase0FrameExtractionCapability {
  return {
    status: "unavailable",
    toolName: "ffmpeg",
    reason
  };
}

export function availableFrameExtractionCapability(toolName = "ffmpeg"): Phase0FrameExtractionCapability {
  return {
    status: "available",
    toolName,
    reason: "Local frame extraction tool is available."
  };
}

export function createSourceVideoLocalStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): Phase0SourceVideoLocalStore {
  return {
    load() {
      const raw = storage.getItem(PHASE0_SOURCE_VIDEO_STORAGE_KEY);
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed as Phase0SourceVideoRecord[] : [];
      } catch {
        return [];
      }
    },
    save(records) {
      storage.setItem(PHASE0_SOURCE_VIDEO_STORAGE_KEY, JSON.stringify(records));
    },
    clear() {
      storage.removeItem(PHASE0_SOURCE_VIDEO_STORAGE_KEY);
    }
  };
}

function hasRequiredVideoMetadata(file: Phase0SourceVideoFileLike) {
  return normalizePositiveNumber(file.durationSeconds ?? null) !== null
    && normalizePositiveInteger(file.width ?? null) !== null
    && normalizePositiveInteger(file.height ?? null) !== null;
}

function normalizePositiveNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizePositiveInteger(value: number | null) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function roundTimestamp(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 1000) / 1000) : 0;
}

function normalizeNullable(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRelativePathInput(value: string) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part.trim().length > 0 && part !== ".").join("/");
}

function isRelativeSafePath(value: string) {
  return hasUsableText(value)
    && !value.startsWith("/")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    && value.split("/").every((part) => part.length > 0 && part !== ".." && !/[<>:"\\|?*\u0000-\u001f]/.test(part));
}

function isISODate(value: string) {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}

function issue(code: string, message: string, entityID?: string): Phase0SourceVideoValidationIssue {
  return { code, message, entityID };
}
