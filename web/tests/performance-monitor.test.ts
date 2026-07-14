import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERFORMANCE_BUDGETS,
  createInitialLoadPerformanceRecord,
  createLocalPerformanceMonitor,
  createMobileResponsivenessRecord,
  createPerformanceDashboard,
  createPerformanceRecord,
  estimateTemporaryImageMemoryBytes,
  processInResponsiveChunks,
  shouldSkipLiveFrameAnalysis,
  shouldYieldToMainThread
} from "@/lib/performance/performance-monitor";

describe("performance monitor", () => {
  it("sets explicit budgets for every performance objective in the web MVP", () => {
    expect(Object.keys(DEFAULT_PERFORMANCE_BUDGETS).sort()).toEqual(
      [
        "cameraStart",
        "catalogLoading",
        "failureRecovery",
        "frameProcessing",
        "initialLoad",
        "interruptedSessionRecovery",
        "liveGuidanceFrame",
        "matchingLatency",
        "memoryUsage",
        "mobileResponsiveness",
        "profileGeneration",
        "screenshotRefinement"
      ].sort()
    );
    expect(DEFAULT_PERFORMANCE_BUDGETS.frameProcessing.maxDurationMs).toBeGreaterThan(0);
    expect(DEFAULT_PERFORMANCE_BUDGETS.memoryUsage.maxMemoryBytes).toBeGreaterThan(0);
  });

  it("marks records within and over budget without storing sensitive payloads", () => {
    const withinBudget = createPerformanceRecord({
      operation: "profileGeneration",
      durationMs: 30,
      notes: ["local profile build; blob:https://example.invalid/raw-face was redacted"]
    });
    const overBudget = createPerformanceRecord({
      operation: "profileGeneration",
      durationMs: 999
    });

    expect(withinBudget.budgetStatus).toBe("withinBudget");
    expect(withinBudget.notes.join(" ")).not.toContain("blob:https://example.invalid/raw-face");
    expect(overBudget.budgetStatus).toBe("overBudget");
  });

  it("aggregates development dashboard metrics locally", () => {
    const dashboard = createPerformanceDashboard(
      [
        createPerformanceRecord({ operation: "catalogLoading", durationMs: 100 }),
        createPerformanceRecord({ operation: "catalogLoading", durationMs: 300 }),
        createPerformanceRecord({ operation: "frameProcessing", durationMs: 1_200, memoryBytes: 12 * 1024 * 1024 })
      ],
      new Date("2026-07-14T00:00:00.000Z")
    );
    const catalogMetric = dashboard.metrics.find((metric) => metric.operation === "catalogLoading");
    const frameMetric = dashboard.metrics.find((metric) => metric.operation === "frameProcessing");

    expect(dashboard.generatedAt).toBe("2026-07-14T00:00:00.000Z");
    expect(dashboard.privacyMode).toBe("local-only");
    expect(catalogMetric?.averageDurationMs).toBe(200);
    expect(frameMetric?.budgetStatus).toBe("overBudget");
    expect(dashboard.overBudgetOperations).toContain("frameProcessing");
  });

  it("keeps only the recent local performance samples", () => {
    const monitor = createLocalPerformanceMonitor(2);
    monitor.record(createPerformanceRecord({ operation: "initialLoad", durationMs: 1 }));
    monitor.record(createPerformanceRecord({ operation: "catalogLoading", durationMs: 2 }));
    monitor.record(createPerformanceRecord({ operation: "profileGeneration", durationMs: 3 }));

    expect(monitor.getRecords().map((record) => record.operation)).toEqual(["catalogLoading", "profileGeneration"]);
    monitor.clear();
    expect(monitor.getRecords()).toEqual([]);
  });

  it("estimates temporary image memory from encoded and decoded browser image footprints", () => {
    expect(
      estimateTemporaryImageMemoryBytes([
        {
          fileSizeBytes: 1_000,
          width: 10,
          height: 10
        }
      ])
    ).toBe(1_400);
  });

  it("skips live frame analysis when hidden, busy, or too soon", () => {
    expect(
      shouldSkipLiveFrameAnalysis({
        nowMs: 1_000,
        lastStartedAtMs: 900,
        minIntervalMs: 500,
        isProcessing: false
      })
    ).toBe(true);
    expect(
      shouldSkipLiveFrameAnalysis({
        nowMs: 1_000,
        lastStartedAtMs: 0,
        isProcessing: true
      })
    ).toBe(true);
    expect(
      shouldSkipLiveFrameAnalysis({
        nowMs: 1_000,
        lastStartedAtMs: 0,
        isProcessing: false,
        documentVisibilityState: "hidden"
      })
    ).toBe(true);
    expect(
      shouldSkipLiveFrameAnalysis({
        nowMs: 1_000,
        lastStartedAtMs: 0,
        isProcessing: false
      })
    ).toBe(false);
  });

  it("yields long local loops to keep the main UI thread responsive", async () => {
    const yieldedAt: number[] = [];
    const results = await processInResponsiveChunks(
      [1, 2, 3, 4, 5],
      (value) => value * 2,
      {
        chunkSize: 2,
        now: () => 0,
        yieldFn: async () => {
          yieldedAt.push(yieldedAt.length + 1);
        }
      }
    );

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(yieldedAt).toEqual([1, 2]);
    expect(shouldYieldToMainThread({ elapsedMs: 17, frameBudgetMs: 16 })).toBe(true);
  });

  it("creates initial-load and mobile-responsiveness records without URLs or identity data", () => {
    const performanceLike = {
      now: () => 111,
      getEntriesByType: () => [{ domInteractive: 321 }]
    } as unknown as Performance;
    const initialLoad = createInitialLoadPerformanceRecord(performanceLike, new Date("2026-07-14T00:00:00.000Z"));
    const mobile = createMobileResponsivenessRecord({
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 3,
      measuredAt: new Date("2026-07-14T00:00:01.000Z")
    });

    expect(initialLoad.durationMs).toBe(321);
    expect(initialLoad.notes.join(" ")).not.toContain("http");
    expect(mobile.itemCount).toBe(1);
    expect(mobile.notes.join(" ")).toContain("390x844");
  });
});
