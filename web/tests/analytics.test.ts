import { describe, expect, it } from "vitest";
import {
  ANALYTICS_SCHEMA_VERSION,
  assertAnalyticsProviderApproved,
  createAnalyticsEvent,
  createLocalAnalyticsRecorder,
  createNoopAnalytics,
  validateAnalyticsEvent,
  type AnalyticsEvent,
  type AnalyticsEventName
} from "@/lib/analytics/privacy-safe-analytics";

const allowedEvents: AnalyticsEventName[] = [
  "captureStarted",
  "captureCompleted",
  "captureAbandoned",
  "qualityFailureCategory",
  "retake",
  "resultBlocked",
  "catalogUnavailable",
  "profileDeleted",
  "refinementStarted",
  "refinementCompleted"
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
          catalogRecordCount: 0
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
});
