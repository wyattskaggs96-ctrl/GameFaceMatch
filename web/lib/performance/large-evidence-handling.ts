export const LARGE_EVIDENCE_PERFORMANCE_VERSION = "large-evidence-performance-v1";

export const DEFAULT_CATALOG_TABLE_PAGE_SIZE = 25;
export const DEFAULT_EVIDENCE_PREVIEW_PAGE_SIZE = 12;
export const MAX_UI_PAGE_SIZE = 100;
export const DEFAULT_PROCESSING_CHUNK_SIZE = 50;

export interface PaginationInput {
  page: number;
  pageSize: number;
  maxPageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  startIndex: number;
  endIndexExclusive: number;
}

export interface PreviewableEvidence {
  id: string;
  sizeBytes: number;
  mimeType: string;
  objectUrl?: string | null;
}

export interface EvidencePreviewPlan {
  immediatePreviewIDs: string[];
  lazyPreviewIDs: string[];
  skippedPreviewIDs: string[];
  totalPreviewBytes: number;
  warnings: string[];
}

export interface IncrementalProcessingPlan {
  totalItems: number;
  chunkSize: number;
  chunkCount: number;
  workerRecommended: boolean;
  estimatedLargeItemCount: number;
}

export function paginateCollection<T>(items: readonly T[], input: PaginationInput): PaginatedResult<T> {
  const totalItems = items.length;
  const pageSize = clampInteger(input.pageSize, 1, input.maxPageSize ?? MAX_UI_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = clampInteger(input.page, 1, totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndexExclusive = Math.min(totalItems, startIndex + pageSize);
  return {
    items: items.slice(startIndex, endIndexExclusive),
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
    startIndex,
    endIndexExclusive
  };
}

export function createEvidencePreviewPlan(
  evidence: readonly PreviewableEvidence[],
  options: { immediateLimit?: number; maxImmediateBytes?: number; maxPreviewableBytes?: number } = {}
): EvidencePreviewPlan {
  const immediateLimit = options.immediateLimit ?? DEFAULT_EVIDENCE_PREVIEW_PAGE_SIZE;
  const maxImmediateBytes = options.maxImmediateBytes ?? 32 * 1024 * 1024;
  const maxPreviewableBytes = options.maxPreviewableBytes ?? 64 * 1024 * 1024;
  const immediatePreviewIDs: string[] = [];
  const lazyPreviewIDs: string[] = [];
  const skippedPreviewIDs: string[] = [];
  const warnings: string[] = [];
  let totalPreviewBytes = 0;

  for (const item of evidence) {
    if (!isPreviewableMimeType(item.mimeType) || item.sizeBytes > maxPreviewableBytes) {
      skippedPreviewIDs.push(item.id);
      continue;
    }
    if (immediatePreviewIDs.length < immediateLimit && totalPreviewBytes + item.sizeBytes <= maxImmediateBytes) {
      immediatePreviewIDs.push(item.id);
      totalPreviewBytes += item.sizeBytes;
    } else {
      lazyPreviewIDs.push(item.id);
    }
  }

  if (lazyPreviewIDs.length > 0) warnings.push(`${lazyPreviewIDs.length} previews should be lazy-loaded as the operator pages through evidence.`);
  if (skippedPreviewIDs.length > 0) warnings.push(`${skippedPreviewIDs.length} previews are too large or unsupported and should show metadata only.`);

  return {
    immediatePreviewIDs,
    lazyPreviewIDs,
    skippedPreviewIDs,
    totalPreviewBytes,
    warnings
  };
}

export function createIncrementalProcessingPlan(input: {
  totalItems: number;
  largeItemCount?: number;
  chunkSize?: number;
  workerThreshold?: number;
}): IncrementalProcessingPlan {
  const chunkSize = clampInteger(input.chunkSize ?? DEFAULT_PROCESSING_CHUNK_SIZE, 1, 500);
  const totalItems = Math.max(0, Math.floor(input.totalItems));
  const estimatedLargeItemCount = Math.max(0, Math.floor(input.largeItemCount ?? 0));
  return {
    totalItems,
    chunkSize,
    chunkCount: Math.ceil(totalItems / chunkSize),
    workerRecommended: totalItems >= (input.workerThreshold ?? 250) || estimatedLargeItemCount > 0,
    estimatedLargeItemCount
  };
}

export function* iterateInChunks<T>(items: readonly T[], chunkSize = DEFAULT_PROCESSING_CHUNK_SIZE): Generator<T[]> {
  const normalizedChunkSize = clampInteger(chunkSize, 1, 500);
  for (let index = 0; index < items.length; index += normalizedChunkSize) {
    yield items.slice(index, index + normalizedChunkSize);
  }
}

function isPreviewableMimeType(mimeType: string) {
  return ["image/png", "image/jpeg", "image/webp"].includes(mimeType);
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}
