import { describe, expect, it } from "vitest";
import { createInitialCaptureSession, type ActiveCaptureSession } from "@/lib/capture/capture-session";
import {
  createFallbackPostScanAvatarPreview,
  selectPostScanAvatarSourceImage
} from "@/lib/post-scan/avatar-preview";
import type { CapturedAngleID, TemporaryImageReference } from "@/types/domain";

describe("post-scan avatar preview", () => {
  it("prefers the accepted front capture for the game-avatar source image", () => {
    const session = sessionWithImages(["left45", "straightOn", "right45"]);

    const selection = selectPostScanAvatarSourceImage(session);

    expect(selection).toMatchObject({
      angleID: "straightOn",
      reason: "front-capture"
    });
    expect(selection.image?.objectUrl).toBe("blob:straightOn");
  });

  it("uses the strongest near-front completed capture when front is unavailable", () => {
    const session = sessionWithImages(["right45", "leftProfile"]);

    const selection = selectPostScanAvatarSourceImage(session);

    expect(selection).toMatchObject({
      angleID: "right45",
      reason: "near-front-capture"
    });
    expect(selection.image?.objectUrl).toBe("blob:right45");
  });

  it("ignores incomplete or imageless angles and falls back without throwing", () => {
    const session = sessionWithImages(["left45"]);
    session.angles = session.angles.map((angle) =>
      angle.id === "left45"
        ? {
            ...angle,
            status: "empty",
            image: undefined
          }
        : angle
    );

    const selection = selectPostScanAvatarSourceImage(session);
    const fallback = createFallbackPostScanAvatarPreview();

    expect(selection).toEqual({
      angleID: null,
      image: null,
      reason: "fallback-no-image"
    });
    expect(fallback).toEqual({
      source: "fallback",
      imageUrl: null,
      threeDConfig: null,
      selectedAngleID: null,
      alt: "Generic GameFace player silhouette",
      fallbackReason: "no-image"
    });
  });
});

function sessionWithImages(angleIDs: CapturedAngleID[]): ActiveCaptureSession {
  const session = createInitialCaptureSession(new Date("2026-08-15T20:00:00.000Z"));
  return {
    ...session,
    angles: session.angles.map((angle) =>
      angleIDs.includes(angle.id)
        ? {
            ...angle,
            status: "complete" as const,
            image: temporaryImage(angle.id),
            validationStatus: "valid" as const,
            validationErrors: []
          }
        : angle
    )
  };
}

function temporaryImage(angleID: CapturedAngleID): TemporaryImageReference {
  return {
    objectUrl: `blob:${angleID}`,
    fileName: `${angleID}.png`,
    fileType: "image/png",
    fileSizeBytes: 1024,
    width: 640,
    height: 640,
    signature: `${angleID}:test`,
    source: "camera",
    orientation: "square",
    associatedAngleID: angleID,
    createdAt: "2026-08-15T20:00:00.000Z"
  };
}
