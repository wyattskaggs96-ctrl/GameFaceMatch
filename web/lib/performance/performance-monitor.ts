export const PERFORMANCE_MONITOR_VERSION = "web-performance-monitor-v1";

export type PerformanceOperation =
  | "initialLoad"
  | "cameraStart"
  | "liveGuidanceFrame"
  | "frameProcessing"
  | "profileGeneration"
  | "matchingLatency"
  | "catalogLoading"
  | "screenshotRefinement"
  | "memoryUsage"
  | "mobileResponsiveness"
  | "failureRecovery"
  | "interruptedSessionRecovery";

export type PerformanceBudgetStatus = "withinBudget" | "overBudget" | "notMeasured";

export interface PerformanceBudget {
  operation: PerformanceOperation;
  label: string;
  maxDurationMs?: number;
  maxMemoryBytes?: number;
  description: string;
}

export interface PerformanceMetricRecord {
  id: string;
  schemaVersion: typeof PERFORMANCE_MONITOR_VERSION;
  operation: PerformanceOperation;
  measuredAt: string;
  durationMs?: number;
  memoryBytes?: number;
  itemCount?: number;
  budgetStatus: PerformanceBudgetStatus;
  notes: string[];
}

export interface PerformanceDashboardMetric {
  operation: PerformanceOperation;
  label: string;
  sampleSize: number;
  latestDurationMs: number | null;
  averageDurationMs: number | null;
  maxDurationMs: number | null;
  latestMemoryBytes: number | null;
  maxMemoryBytes: number | null;
  budgetStatus: PerformanceBudgetStatus;
  budgetDescription: string;
}

export interface PerformanceDashboard {
  generatedAt: string;
  schemaVersion: typeof PERFORMANCE_MONITOR_VERSION;
  privacyMode: "local-only";
  eventCount: number;
  metrics: PerformanceDashboardMetric[];
  overBudgetOperations: PerformanceOperation[];
}

export interface LocalPerformanceMonitor {
  record(record: PerformanceMetricRecord): void;
  getRecords(): PerformanceMetricRecord[];
  clear(): void;
}

export const DEFAULT_PERFORMANCE_BUDGETS: Record<PerformanceOperation, PerformanceBudget> = {
  initialLoad: {
    operation: "initialLoad",
    label: "Initial load",
    maxDurationMs: 2_500,
    description: "Navigation start to interactive shell readiness on a modern mobile browser."
  },
  cameraStart: {
    operation: "cameraStart",
    label: "Camera start",
    maxDurationMs: 1_500,
    description: "User action to active camera preview request completion."
  },
  liveGuidanceFrame: {
    operation: "liveGuidanceFrame",
    label: "Live guidance frame",
    maxDurationMs: 120,
    description: "One local live-guidance frame analysis pass. Work should be skipped rather than queued when busy."
  },
  frameProcessing: {
    operation: "frameProcessing",
    label: "Captured frame processing",
    maxDurationMs: 900,
    maxMemoryBytes: 32 * 1024 * 1024,
    description: "Decode, validate, downscale where needed, quality-check, and landmark-check one selected image."
  },
  profileGeneration: {
    operation: "profileGeneration",
    label: "Face-profile generation",
    maxDurationMs: 250,
    description: "Create a StandardFaceProfile from completed local capture metadata and user-confirmed attributes."
  },
  matchingLatency: {
    operation: "matchingLatency",
    label: "Matching latency",
    maxDurationMs: 250,
    description: "Run recommendation gating and matching against the currently loaded verified catalog."
  },
  catalogLoading: {
    operation: "catalogLoading",
    label: "Catalog loading",
    maxDurationMs: 500,
    description: "Load, validate, and integrity-check the bundled production catalog manifest."
  },
  screenshotRefinement: {
    operation: "screenshotRefinement",
    label: "Screenshot refinement",
    maxDurationMs: 700,
    maxMemoryBytes: 24 * 1024 * 1024,
    description: "Validate screenshot-refinement session data and run the currently available local scaffold."
  },
  memoryUsage: {
    operation: "memoryUsage",
    label: "Temporary image memory",
    maxMemoryBytes: 96 * 1024 * 1024,
    description: "Estimated memory pressure from active temporary images, Blob references, and decoded RGBA buffers."
  },
  mobileResponsiveness: {
    operation: "mobileResponsiveness",
    label: "Mobile responsiveness",
    maxDurationMs: 50,
    description: "Main-thread responsiveness sample. Long work should yield before exceeding this budget."
  },
  failureRecovery: {
    operation: "failureRecovery",
    label: "Failure recovery",
    maxDurationMs: 250,
    description: "Local recovery action such as deleting session data or clearing failed state."
  },
  interruptedSessionRecovery: {
    operation: "interruptedSessionRecovery",
    label: "Interrupted-session recovery",
    maxDurationMs: 250,
    description: "Restore recoverable non-raw capture metadata after refresh, back navigation, or browser interruption."
  }
};

export function createLocalPerformanceMonitor(limit = 240): LocalPerformanceMonitor {
  let records: PerformanceMetricRecord[] = [];
  return {
    record(record) {
      records = [...records, record].slice(-limit);
    },
    getRecords() {
      return [...records];
    },
    clear() {
      records = [];
    }
  };
}

export function createPerformanceRecord(input: {
  operation: PerformanceOperation;
  durationMs?: number;
  memoryBytes?: number;
  itemCount?: number;
  measuredAt?: Date;
  notes?: string[];
  budgets?: Partial<Record<PerformanceOperation, PerformanceBudget>>;
}): PerformanceMetricRecord {
  const budget = input.budgets?.[input.operation] ?? DEFAULT_PERFORMANCE_BUDGETS[input.operation];
  const durationMs = normalizeNonNegativeNumber(input.durationMs);
  const memoryBytes = normalizeNonNegativeNumber(input.memoryBytes);
  return {
    id: `perf-${input.operation}-${(input.measuredAt ?? new Date()).toISOString()}-${durationMs ?? memoryBytes ?? "sample"}`,
    schemaVersion: PERFORMANCE_MONITOR_VERSION,
    operation: input.operation,
    measuredAt: (input.measuredAt ?? new Date()).toISOString(),
    durationMs,
    memoryBytes,
    itemCount: input.itemCount,
    budgetStatus: evaluateBudgetStatus({ durationMs, memoryBytes, budget }),
    notes: sanitizePerformanceNotes(input.notes ?? [])
  };
}

export function createPerformanceDashboard(
  records: readonly PerformanceMetricRecord[],
  now = new Date(),
  budgets: Record<PerformanceOperation, PerformanceBudget> = DEFAULT_PERFORMANCE_BUDGETS
): PerformanceDashboard {
  const metrics = Object.values(budgets).map((budget) => {
    const operationRecords = records.filter((record) => record.operation === budget.operation);
    const durationSamples = operationRecords.map((record) => record.durationMs).filter(isNumber);
    const memorySamples = operationRecords.map((record) => record.memoryBytes).filter(isNumber);
    const latest = operationRecords.at(-1);
    return {
      operation: budget.operation,
      label: budget.label,
      sampleSize: operationRecords.length,
      latestDurationMs: latest?.durationMs ?? null,
      averageDurationMs: durationSamples.length > 0 ? Math.round(average(durationSamples)) : null,
      maxDurationMs: durationSamples.length > 0 ? Math.max(...durationSamples) : null,
      latestMemoryBytes: latest?.memoryBytes ?? null,
      maxMemoryBytes: memorySamples.length > 0 ? Math.max(...memorySamples) : null,
      budgetStatus: summarizeBudgetStatus(operationRecords),
      budgetDescription: describeBudget(budget)
    } satisfies PerformanceDashboardMetric;
  });
  return {
    generatedAt: now.toISOString(),
    schemaVersion: PERFORMANCE_MONITOR_VERSION,
    privacyMode: "local-only",
    eventCount: records.length,
    metrics,
    overBudgetOperations: metrics.filter((metric) => metric.budgetStatus === "overBudget").map((metric) => metric.operation)
  };
}

export async function measureAsyncPerformance<T>(
  operation: PerformanceOperation,
  work: () => Promise<T>,
  onRecord: (record: PerformanceMetricRecord) => void,
  options: { itemCount?: number; memoryBytes?: number; notes?: string[]; now?: () => number } = {}
): Promise<T> {
  const now = options.now ?? defaultNow;
  const startedAt = now();
  try {
    return await work();
  } finally {
    onRecord(
      createPerformanceRecord({
        operation,
        durationMs: now() - startedAt,
        memoryBytes: options.memoryBytes,
        itemCount: options.itemCount,
        notes: options.notes
      })
    );
  }
}

export function measureSyncPerformance<T>(
  operation: PerformanceOperation,
  work: () => T,
  onRecord: (record: PerformanceMetricRecord) => void,
  options: { itemCount?: number; memoryBytes?: number; notes?: string[]; now?: () => number } = {}
): T {
  const now = options.now ?? defaultNow;
  const startedAt = now();
  try {
    return work();
  } finally {
    onRecord(
      createPerformanceRecord({
        operation,
        durationMs: now() - startedAt,
        memoryBytes: options.memoryBytes,
        itemCount: options.itemCount,
        notes: options.notes
      })
    );
  }
}

export function createInitialLoadPerformanceRecord(performanceLike: Performance | undefined, measuredAt = new Date()): PerformanceMetricRecord {
  const navigation = performanceLike?.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
  const durationMs =
    navigation && Number.isFinite(navigation.domInteractive) && navigation.domInteractive > 0
      ? navigation.domInteractive
      : performanceLike && Number.isFinite(performanceLike.now())
        ? performanceLike.now()
        : undefined;
  return createPerformanceRecord({
    operation: "initialLoad",
    durationMs,
    measuredAt,
    notes: ["Uses browser Navigation Timing when available; records no URLs, user identifiers, images, or profile data."]
  });
}

export function createMobileResponsivenessRecord(input: {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio?: number;
  measuredDurationMs?: number;
  measuredAt?: Date;
}): PerformanceMetricRecord {
  const isMobileSized = Math.min(input.viewportWidth, input.viewportHeight) <= 480;
  return createPerformanceRecord({
    operation: "mobileResponsiveness",
    durationMs: input.measuredDurationMs ?? 0,
    itemCount: isMobileSized ? 1 : 0,
    measuredAt: input.measuredAt,
    notes: [
      isMobileSized ? "Mobile-sized viewport detected." : "Desktop or tablet-sized viewport detected.",
      `Viewport ${Math.round(input.viewportWidth)}x${Math.round(input.viewportHeight)} at DPR ${input.devicePixelRatio ?? 1}.`
    ]
  });
}

export function estimateTemporaryImageMemoryBytes(
  images: ReadonlyArray<{
    fileSizeBytes?: number;
    width?: number;
    height?: number;
  }>
) {
  return images.reduce((total, image) => {
    const encodedBytes = image.fileSizeBytes ?? 0;
    const decodedBytes = (image.width ?? 0) * (image.height ?? 0) * 4;
    return total + encodedBytes + decodedBytes;
  }, 0);
}

export function shouldSkipLiveFrameAnalysis(input: {
  nowMs: number;
  lastStartedAtMs: number;
  minIntervalMs?: number;
  isProcessing: boolean;
  documentVisibilityState?: DocumentVisibilityState;
}) {
  if (input.documentVisibilityState === "hidden") return true;
  if (input.isProcessing) return true;
  return input.nowMs - input.lastStartedAtMs < (input.minIntervalMs ?? 500);
}

export function shouldYieldToMainThread(input: { elapsedMs: number; frameBudgetMs?: number; processedItems?: number; processedItemBudget?: number }) {
  return input.elapsedMs >= (input.frameBudgetMs ?? 16) || (input.processedItems ?? 0) >= (input.processedItemBudget ?? Number.POSITIVE_INFINITY);
}

export async function processInResponsiveChunks<T, R>(
  items: readonly T[],
  processItem: (item: T, index: number) => R | Promise<R>,
  options: {
    chunkSize?: number;
    frameBudgetMs?: number;
    now?: () => number;
    yieldFn?: () => Promise<void>;
  } = {}
): Promise<R[]> {
  const results: R[] = [];
  const chunkSize = Math.max(1, Math.floor(options.chunkSize ?? 25));
  const now = options.now ?? defaultNow;
  const yieldFn = options.yieldFn ?? yieldToMainThread;
  let chunkStartedAt = now();
  let processedInChunk = 0;

  for (let index = 0; index < items.length; index += 1) {
    results.push(await processItem(items[index], index));
    processedInChunk += 1;
    if (
      index < items.length - 1 &&
      shouldYieldToMainThread({
        elapsedMs: now() - chunkStartedAt,
        frameBudgetMs: options.frameBudgetMs,
        processedItems: processedInChunk,
        processedItemBudget: chunkSize
      })
    ) {
      await yieldFn();
      chunkStartedAt = now();
      processedInChunk = 0;
    }
  }

  return results;
}

export function yieldToMainThread() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

function evaluateBudgetStatus(input: {
  durationMs?: number;
  memoryBytes?: number;
  budget: PerformanceBudget;
}): PerformanceBudgetStatus {
  if (!isNumber(input.durationMs) && !isNumber(input.memoryBytes)) return "notMeasured";
  if (isNumber(input.durationMs) && isNumber(input.budget.maxDurationMs) && input.durationMs > input.budget.maxDurationMs) return "overBudget";
  if (isNumber(input.memoryBytes) && isNumber(input.budget.maxMemoryBytes) && input.memoryBytes > input.budget.maxMemoryBytes) return "overBudget";
  return "withinBudget";
}

function summarizeBudgetStatus(records: readonly PerformanceMetricRecord[]): PerformanceBudgetStatus {
  if (records.length === 0) return "notMeasured";
  if (records.some((record) => record.budgetStatus === "overBudget")) return "overBudget";
  if (records.some((record) => record.budgetStatus === "withinBudget")) return "withinBudget";
  return "notMeasured";
}

function describeBudget(budget: PerformanceBudget) {
  const parts = [budget.description];
  if (isNumber(budget.maxDurationMs)) parts.push(`Budget: ${budget.maxDurationMs} ms.`);
  if (isNumber(budget.maxMemoryBytes)) parts.push(`Memory budget: ${formatBytes(budget.maxMemoryBytes)}.`);
  return parts.join(" ");
}

function sanitizePerformanceNotes(notes: readonly string[]) {
  return notes.map((note) => note.replace(/blob:[^\s]+/gi, "[object-url-redacted]").replace(/data:[^\s]+/gi, "[data-url-redacted]")).map((note) => note.slice(0, 180));
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

function normalizeNonNegativeNumber(value: number | undefined) {
  return isNumber(value) ? Math.max(0, Math.round(value)) : undefined;
}

function average(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}
