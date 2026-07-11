import { describe, expect, it } from "vitest";
import {
  cancelCaptureSession,
  createInitialCaptureSession,
  getCompletedAngleCount,
  getMissingRequiredAngles,
  removeAngleCapture,
  retakeAngle,
  setAngleCapture
} from "@/lib/capture/capture-session";
import { createBasicDuplicateSignature, createTemporaryImageReference, validateImageMetadata } from "@/lib/capture/image-validation";
import type { CapturedAngleID, TemporaryImageReference } from "@/types/domain";

describe("capture session", () => {
  it("requires all five capture angles", () => {
    const session = createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z"));
    expect(getMissingRequiredAngles(session.angles)).toEqual(["straightOn", "left45", "right45", "leftProfile", "rightProfile"]);
  });

  it("recognizes completed required angles", () => {
    const session = createInitialCaptureSession();
    const complete = session.angles.map((angle) => ({ ...angle, status: "complete" as const }));
    expect(getMissingRequiredAngles(complete)).toEqual([]);
  });

  it("tracks completion, retake, removal, and object URL cleanup", () => {
    const session = createInitialCaptureSession();
    const captured = setAngleCapture(session, "straightOn", image("straightOn", "blob:front"), "upload");
    expect(getCompletedAngleCount(captured.session.angles)).toBe(1);
    expect(captured.objectUrlsToRevoke).toEqual([]);

    const retaken = retakeAngle(captured.session, "straightOn");
    expect(retaken.session.angles[0].status).toBe("empty");
    expect(retaken.objectUrlsToRevoke).toEqual(["blob:front"]);

    const recaptured = setAngleCapture(retaken.session, "straightOn", image("straightOn", "blob:front-2"), "camera");
    const removed = removeAngleCapture(recaptured.session, "straightOn");
    expect(removed.session.angles[0].image).toBeUndefined();
    expect(removed.objectUrlsToRevoke).toEqual(["blob:front-2"]);
  });

  it("cancels the session and returns every temporary object URL for cleanup", () => {
    let session = createInitialCaptureSession();
    session = setAngleCapture(session, "straightOn", image("straightOn", "blob:front"), "upload").session;
    session = setAngleCapture(session, "left45", image("left45", "blob:left"), "camera").session;
    const cancelled = cancelCaptureSession(session);
    expect(cancelled.session.status).toBe("cancelled");
    expect(cancelled.objectUrlsToRevoke).toEqual(["blob:front", "blob:left"]);
  });
});

describe("image metadata validation", () => {
  it("accepts practical browser-safe metadata", () => {
    const result = validateImageMetadata({
      fileName: "front.jpg",
      fileType: "image/jpeg",
      fileSizeBytes: 2_000_000,
      width: 1200,
      height: 1600,
      associatedAngleID: "straightOn"
    });
    expect(result.errors).toEqual([]);
    expect(result.orientation).toBe("portrait");
  });

  it("rejects unreadable or undersized images", () => {
    const result = validateImageMetadata({
      fileName: "tiny.gif",
      fileType: "image/gif",
      fileSizeBytes: 0,
      width: 120,
      height: 120,
      associatedAngleID: "straightOn"
    });
    expect(result.errors).toContain("Use a JPEG, PNG, or WebP image.");
    expect(result.errors).toContain("The image file is empty or unreadable.");
    expect(result.errors).toContain("Use an image at least 480 pixels wide and tall.");
  });

  it("rejects supported MIME types with unsafe image extensions", () => {
    const result = validateImageMetadata({
      fileName: "front.exe",
      fileType: "image/jpeg",
      fileSizeBytes: 2_000_000,
      width: 1200,
      height: 1600,
      associatedAngleID: "straightOn"
    });
    expect(result.errors).toContain("Use a file ending in .jpg, .jpeg, .png, or .webp.");
  });

  it("detects duplicate uploads by metadata signature", () => {
    const existing = createInitialCaptureSession().angles;
    existing[0] = {
      ...existing[0],
      status: "complete",
      image: {
        objectUrl: "blob:test",
        fileName: "same.jpg",
        fileType: "image/jpeg",
        fileSizeBytes: 1234,
        width: 800,
        height: 800,
        signature: "same.jpg:image/jpeg:1234:800x800",
        source: "upload",
        orientation: "square",
        associatedAngleID: "straightOn",
        createdAt: "2026-07-10T00:00:00.000Z"
      }
    };
    const result = validateImageMetadata(
      {
        fileName: "same.jpg",
        fileType: "image/jpeg",
        fileSizeBytes: 1234,
        width: 800,
        height: 800,
        associatedAngleID: "left45"
      },
      existing
    );
    expect(result.errors[0]).toMatch(/duplicate/i);
  });

  it("creates a duplicate-detection signature from image bytes", async () => {
    const first = new Blob(["same-bytes"], { type: "image/jpeg" });
    const second = new Blob(["same-bytes"], { type: "image/jpeg" });
    await expect(createBasicDuplicateSignature(first)).resolves.toBe(await createBasicDuplicateSignature(second));
  });
});

function image(angleID: CapturedAngleID, objectUrl: string): TemporaryImageReference {
  return createTemporaryImageReference(
    {
      objectUrl,
      fileName: `${angleID}.jpg`,
      fileType: "image/jpeg",
      fileSizeBytes: 1024,
      width: 900,
      height: 1200,
      source: "upload",
      associatedAngleID: angleID,
      signature: objectUrl
    },
    objectUrl
  );
}
