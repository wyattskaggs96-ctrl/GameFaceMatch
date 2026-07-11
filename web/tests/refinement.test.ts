import { describe, expect, it } from "vitest";
import {
  canSubmitScreenshotRefinement,
  createInitialScreenshotRefinementSession,
  createUnavailableScreenshotRefinementProcessor,
  deleteScreenshotRefinementSession,
  setScreenshot,
  validateScreenshotMetadata
} from "@/lib/refinement/screenshot-refinement";
import type { StandardFaceProfile } from "@/types/domain";

describe("screenshot refinement scaffold", () => {
  it("requires front, left 45, and right 45 screenshots", () => {
    const session = createInitialScreenshotRefinementSession(new Date("2026-07-10T00:00:00.000Z"));
    expect(session.slots.map((slot) => slot.viewID)).toEqual(["front", "left45", "right45"]);
    expect(canSubmitScreenshotRefinement(session)).toBe(false);
  });

  it("validates screenshot type, size, and dimensions", () => {
    expect(
      validateScreenshotMetadata({
        viewID: "front",
        fileName: "created-player.bmp",
        fileType: "image/bmp",
        fileSizeBytes: 0,
        width: 320,
        height: 320
      }).errors
    ).toEqual([
      "Use a JPEG, PNG, or WebP screenshot.",
      "Use a screenshot file ending in .jpg, .jpeg, .png, or .webp.",
      "The screenshot file is empty or unreadable.",
      "Use a screenshot at least 720 pixels wide and tall."
    ]);
  });

  it("tracks valid screenshot completion and replacement cleanup", () => {
    let session = createInitialScreenshotRefinementSession();
    const first = setScreenshot(session, validScreenshot("front", "blob:front"));
    expect(first.objectUrlsToRevoke).toEqual([]);
    session = first.session;
    expect(session.slots[0].validationStatus).toBe("valid");

    const replacement = setScreenshot(session, validScreenshot("front", "blob:front-new"));
    expect(replacement.objectUrlsToRevoke).toEqual(["blob:front"]);
    expect(replacement.session.slots[0].screenshot?.objectUrl).toBe("blob:front-new");
  });

  it("allows submission only after all required screenshot views are valid", () => {
    let session = createInitialScreenshotRefinementSession();
    session = setScreenshot(session, validScreenshot("front", "blob:front")).session;
    session = setScreenshot(session, validScreenshot("left45", "blob:left45")).session;
    expect(canSubmitScreenshotRefinement(session)).toBe(false);
    session = setScreenshot(session, validScreenshot("right45", "blob:right45")).session;
    expect(canSubmitScreenshotRefinement(session)).toBe(true);
  });

  it("deletes screenshot session data and returns object URLs for revocation", () => {
    let session = createInitialScreenshotRefinementSession();
    session = setScreenshot(session, validScreenshot("front", "blob:front")).session;
    session = setScreenshot(session, validScreenshot("left45", "blob:left45")).session;
    const deleted = deleteScreenshotRefinementSession(session);
    expect(deleted.objectUrlsToRevoke).toEqual(["blob:front", "blob:left45"]);
    expect(deleted.session.status).toBe("deleted");
    expect(deleted.session.slots.every((slot) => slot.screenshot === undefined)).toBe(true);
  });

  it("returns an honest unavailable refinement result", async () => {
    const result = await createUnavailableScreenshotRefinementProcessor().refine({
      originalProfile: placeholderProfile(),
      screenshots: []
    });
    expect(result.status).toBe("unavailable");
    expect(result.message).toMatch(/unavailable until verified catalog data/i);
    expect(result.suggestedMatches).toEqual([]);
  });
});

function validScreenshot(viewID: "front" | "left45" | "right45", objectUrl: string) {
  return {
    viewID,
    fileName: `${viewID}.png`,
    fileType: "image/png",
    fileSizeBytes: 1_000_000,
    width: 1280,
    height: 720,
    objectUrl,
    createdAt: "2026-07-10T00:00:00.000Z"
  };
}

function placeholderProfile(): StandardFaceProfile {
  return {
    id: "refinement-test-profile",
    profileVersion: "test",
    createdAt: "2026-07-10T00:00:00.000Z",
    capture: {
      mode: "webRgbGuided",
      deviceModel: "test",
      capturedAt: "2026-07-10T00:00:00.000Z",
      overallQuality: 0,
      operatingSystemVersion: "test",
      appVersion: "test",
      browserRgbOnly: true
    },
    qualityReport: {
      overallScore: 0,
      issues: [],
      isUsableForPrototype: false,
      requiredAnglesComplete: false
    },
    geometry: {
      measurements: {},
      unavailableMeasurements: [],
      modelVersion: "test"
    },
    appearance: {
      attributes: [],
      modelVersion: "test"
    },
    sourceAngleAvailability: {
      straightOn: { angleID: "straightOn", available: false },
      left45: { angleID: "left45", available: false },
      right45: { angleID: "right45", available: false },
      leftProfile: { angleID: "leftProfile", available: false },
      rightProfile: { angleID: "rightProfile", available: false }
    }
  };
}
