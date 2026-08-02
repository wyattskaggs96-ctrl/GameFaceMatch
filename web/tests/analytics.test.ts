import { describe, expect, it } from "vitest";
import {
  ANALYTICS_SCHEMA_VERSION,
  assertAnalyticsProviderApproved,
  createAnalyticsDashboard,
  createAnalyticsEvent,
  createLocalAnalyticsRecorder,
  createNoopAnalytics,
  validateAnalyticsEvent,
  type AnalyticsEvent,
  type AnalyticsEventName
} from "@/lib/analytics/privacy-safe-analytics";

const allowedEvents: AnalyticsEventName[] = [
  "appSessionStarted",
  "onboardingCompleted",
  "scanEntryViewed",
  "scanPlanSelected",
  "scanConsentChanged",
  "scanStartTapped",
  "scanPurchaseStarted",
  "scanPurchaseCompleted",
  "scanPurchaseCanceled",
  "scanPurchaseFailed",
  "scanEntryBlocked",
  "scanPreparationOpened",
  "permissionAccepted",
  "captureStarted",
  "captureCompleted",
  "captureAbandoned",
  "qualityFailureCategory",
  "retake",
  "resultGenerated",
  "resultBlocked",
  "catalogUnavailable",
  "topThreeViewed",
  "recommendationSelected",
  "buildGuideUsed",
  "buildSaved",
  "buildShared",
  "deletionRequested",
  "deletionCompleted",
  "profileDeleted",
  "refinementStarted",
  "refinementCompleted",
  "errorOccurred",
  "latencyRecorded",
  "crashReported"
];

describe("privacy-safe analytics contract", () => {
  it("allows the approved product event names", () => {
    for (const name of allowedEvents) {
      const event = createAnalyticsEvent(
        name,
        {
          captureMode: "webRgbGuided",
          captureSource: "upload",
          completedAngleCount: 5,
          requiredAngleCount: 5,
          catalogVersionID: "empty-production",
          catalogRecordCount: 0,
          resultOutcome: "unavailable",
          recommendationCount: 0
        },
        new Date("2026-07-13T00:00:00.000Z")
      );

      expect(validateAnalyticsEvent(event), name).toEqual({ ok: true, errors: [] });
    }
  });

  it("records events locally without contacting a provider", () => {
    const analytics = createLocalAnalyticsRecorder();

    const result = analytics.track(
      "captureCompleted",
      {
        captureMode: "webRgbGuided",
        captureSource: "mixed",
        completedAngleCount: 5,
        requiredAngleCount: 5,
        usedUploadFallback: true,
        usedExtendedHold: false
      },
      new Date("2026-07-13T01:00:00.000Z")
    );

    expect(result).toEqual({ ok: true, errors: [] });
    expect(analytics.getLocalEvents()).toEqual([
      {
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        name: "captureCompleted",
        occurredAt: "2026-07-13T01:00:00.000Z",
        payload: {
          captureMode: "webRgbGuided",
          captureSource: "mixed",
          completedAngleCount: 5,
          requiredAngleCount: 5,
          usedUploadFallback: true,
          usedExtendedHold: false
        }
      }
    ]);

    analytics.clearLocalEvents();
    expect(analytics.getLocalEvents()).toEqual([]);
  });

  it("supports a no-op implementation by default", () => {
    const analytics = createNoopAnalytics();
    const result = analytics.track("catalogUnavailable", { resultBlockReason: "catalogUnavailable", catalogRecordCount: 0 });

    expect(result).toEqual({ ok: true, errors: [] });
    expect(analytics.getLocalEvents()).toEqual([]);
  });

  it("rejects raw images, object URLs, frames, geometry, landmarks, exact measurements, and profile content", () => {
    const unsafePayloads: Array<Record<string, unknown>> = [
      { rawImage: "data:image/png;base64,abc" },
      { objectUrl: "blob:http://localhost/unsafe" },
      { identifyingCameraFrame: "frame-001" },
      { facialGeometry: { jawWidthRatio: 0.42 } },
      { exactFacialMeasurement: 0.12345 },
      { landmarkCoordinates: [{ x: 0.1, y: 0.2 }] },
      { unencryptedProfileContent: "{\"profileVersion\":\"unsafe\"}" }
    ];

    for (const payload of unsafePayloads) {
      const event: AnalyticsEvent = {
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        name: "captureCompleted",
        occurredAt: "2026-07-13T00:00:00.000Z",
        payload: payload as never
      };

      expect(validateAnalyticsEvent(event).ok, JSON.stringify(payload)).toBe(false);
    }
  });

  it("rejects unknown payload keys and long string values", () => {
    const unknownKeyEvent: AnalyticsEvent = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      name: "retake",
      occurredAt: "2026-07-13T00:00:00.000Z",
      payload: { arbitraryNotes: "free text can accidentally collect sensitive data" } as never
    };
    const longStringEvent: AnalyticsEvent = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      name: "retake",
      occurredAt: "2026-07-13T00:00:00.000Z",
      payload: { catalogVersionID: "x".repeat(161) }
    };

    expect(validateAnalyticsEvent(unknownKeyEvent).ok).toBe(false);
    expect(validateAnalyticsEvent(longStringEvent).ok).toBe(false);
  });

  it("supports safe product analytics payloads for permissions, results, saving, sharing, errors, latency, and crashes", () => {
    const events = [
      createAnalyticsEvent("permissionAccepted", { permissionKind: "camera", permissionOutcome: "accepted" }),
      createAnalyticsEvent("resultGenerated", {
        resultOutcome: "success",
        catalogVersionID: "verified-test",
        catalogRecordCount: 12,
        recommendationCount: 3
      }),
      createAnalyticsEvent("topThreeViewed", { recommendationCount: 3, topThreeVisible: true }),
      createAnalyticsEvent("recommendationSelected", { selectedRecommendationRank: 1 }),
      createAnalyticsEvent("buildGuideUsed", { buildGuideStepCount: 8 }),
      createAnalyticsEvent("buildSaved", { saveTarget: "completedBuild", profileSaved: false }),
      createAnalyticsEvent("buildShared", { shareKind: "textOnlyBuildCard" }),
      createAnalyticsEvent("deletionCompleted", { deletionScope: "allLocalData" }),
      createAnalyticsEvent("errorOccurred", { errorCategory: "catalogUnavailable" }),
      createAnalyticsEvent("latencyRecorded", { latencyOperation: "profileCreation", latencyMs: 42 }),
      createAnalyticsEvent("crashReported", { crashCategory: "unhandledError" })
    ];

    for (const event of events) {
      expect(validateAnalyticsEvent(event), event.name).toEqual({ ok: true, errors: [] });
    }
  });

  it("rejects invalid recommendation ranks and unsafe latency values", () => {
    expect(
      validateAnalyticsEvent({
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        name: "recommendationSelected",
        occurredAt: "2026-07-13T00:00:00.000Z",
        payload: { selectedRecommendationRank: 4 as never }
      }).ok
    ).toBe(false);
    expect(
      validateAnalyticsEvent({
        schemaVersion: ANALYTICS_SCHEMA_VERSION,
        name: "latencyRecorded",
        occurredAt: "2026-07-13T00:00:00.000Z",
        payload: { latencyOperation: "profileCreation", latencyMs: -1 }
      }).ok
    ).toBe(false);
  });

  it("rejects malformed payloads without reading unsafe fields", () => {
    const event: AnalyticsEvent = {
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      name: "retake",
      occurredAt: "2026-07-13T00:00:00.000Z",
      payload: null as never
    };

    expect(validateAnalyticsEvent(event)).toEqual({
      ok: false,
      errors: ["Analytics payload must be an object."]
    });
  });

  it("keeps analytics providers unapproved until the owner explicitly approves one", () => {
    expect(assertAnalyticsProviderApproved("example-provider")).toEqual({
      approved: false,
      providerName: "example-provider",
      reason: "No analytics provider is approved for the MVP. Use the local or no-op analytics implementation only."
    });
  });

  it("creates privacy-safe dashboard metrics from local events", () => {
    const events = [
      createAnalyticsEvent("appSessionStarted", {}, new Date("2026-07-13T00:00:00.000Z")),
      createAnalyticsEvent("captureStarted", { captureMode: "webRgbGuided" }),
      createAnalyticsEvent("captureCompleted", { captureMode: "webRgbGuided", completedAngleCount: 5, requiredAngleCount: 5 }),
      createAnalyticsEvent("retake", { retakeCount: 1 }),
      createAnalyticsEvent("resultGenerated", { resultOutcome: "success", recommendationCount: 3 }),
      createAnalyticsEvent("topThreeViewed", { recommendationCount: 3, topThreeVisible: true }),
      createAnalyticsEvent("recommendationSelected", { selectedRecommendationRank: 1 }),
      createAnalyticsEvent("refinementStarted", {}),
      createAnalyticsEvent("refinementCompleted", { refinementOutcome: "unavailable" }),
      createAnalyticsEvent("deletionCompleted", { deletionScope: "allLocalData" }),
      createAnalyticsEvent("latencyRecorded", { latencyOperation: "profileCreation", latencyMs: 40 }),
      createAnalyticsEvent("latencyRecorded", { latencyOperation: "resultGeneration", latencyMs: 60 })
    ];

    const dashboard = createAnalyticsDashboard(events, new Date("2026-07-13T01:00:00.000Z"));
    const metric = (id: string) => dashboard.metrics.find((candidate) => candidate.id === id);

    expect(dashboard).toMatchObject({
      generatedAt: "2026-07-13T01:00:00.000Z",
      providerConnected: false,
      privacyMode: "local-only"
    });
    expect(metric("scanCompletion")?.value).toBe(100);
    expect(metric("retakeRate")?.value).toBe(100);
    expect(metric("qualityPassRate")?.value).toBe(100);
    expect(metric("recommendationSuccess")?.value).toBe(100);
    expect(metric("topOneSelection")?.value).toBe(100);
    expect(metric("topThreeSelection")?.value).toBe(100);
    expect(metric("screenshotRefinement")?.value).toBe(100);
    expect(metric("deletionSuccess")?.value).toBe(100);
    expect(metric("crashFreeSessions")?.value).toBe(100);
    expect(metric("processingLatency")?.value).toBe(50);
  });
});
