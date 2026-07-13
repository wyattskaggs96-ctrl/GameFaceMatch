import { describe, expect, it } from "vitest";
import {
  cancelCaptureSession,
  createInitialCaptureSession,
  getCompletedAngleCount,
  getMissingRequiredAngles,
  REQUIRED_CAPTURE_ANGLES,
  removeAngleCapture,
  retakeAngle,
  setAngleCapture,
  setAngleError,
  setAngleManualConfirmation
} from "@/lib/capture/capture-session";
import { createCaptureCoverageMap } from "@/lib/capture/capture-coverage";
import {
  abandonGuidedCaptureView,
  createGuidedCaptureStateMachine,
  getOptionalViewIDs,
  getRequiredViewIDs,
  recoverGuidedCaptureView,
  skipOptionalGuidedCaptureView,
  summarizeGuidedCapture
} from "@/lib/capture/capture-state-machine";
import {
  createBasicDuplicateSignature,
  createTemporaryImageReference,
  getDownscaledDimensions,
  isHeicOrHeif,
  shouldDownscaleImage,
  validateImageMetadata
} from "@/lib/capture/image-validation";
import type { CapturedAngleID, ImageQualityReport, TemporaryImageReference } from "@/types/domain";

describe("capture session", () => {
  it("initializes a multi-view state machine with required and optional RGB views", () => {
    const session = createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z"));
    expect(getRequiredViewIDs()).toEqual(["front", "leftThreeQuarter", "rightThreeQuarter", "leftProfile", "rightProfile"]);
    expect(getOptionalViewIDs()).toEqual(["elevatedFront", "loweredFront", "hairlineDetail", "facialHairDetail"]);
    expect(Object.keys(session.captureState.views)).toHaveLength(9);
    expect(session.captureState.currentViewID).toBe("front");
    expect(session.captureState.canContinueToReview).toBe(false);
  });

  it("requires all five capture angles", () => {
    const session = createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z"));
    expect(getMissingRequiredAngles(session.angles)).toEqual(["straightOn", "left45", "right45", "leftProfile", "rightProfile"]);
  });

  it("gives honest front, three-quarter, profile, one-face, and neutral-expression instructions", () => {
    expect(REQUIRED_CAPTURE_ANGLES.map((angle) => angle.label)).toEqual(["Straight-on", "Left 45 degrees", "Right 45 degrees", "Left profile", "Right profile"]);
    expect(REQUIRED_CAPTURE_ANGLES.find((angle) => angle.id === "straightOn")?.instruction).toContain("neutral expression");
    expect(REQUIRED_CAPTURE_ANGLES.find((angle) => angle.id === "straightOn")?.instruction).toContain("one face centered");
    expect(REQUIRED_CAPTURE_ANGLES.find((angle) => angle.id === "left45")?.instruction).toContain("Three-quarter view");
    expect(REQUIRED_CAPTURE_ANGLES.find((angle) => angle.id === "right45")?.instruction).toContain("Three-quarter view");
    expect(REQUIRED_CAPTURE_ANGLES.find((angle) => angle.id === "leftProfile")?.instruction).toContain("Profile view");
    expect(REQUIRED_CAPTURE_ANGLES.find((angle) => angle.id === "rightProfile")?.instruction).toContain("Profile view");
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
    expect(captured.session.captureState.views.front.status).toBe("captured");
    expect(captured.session.captureState.currentViewID).toBe("leftThreeQuarter");

    const retaken = retakeAngle(captured.session, "straightOn");
    expect(retaken.session.angles[0].status).toBe("empty");
    expect(retaken.objectUrlsToRevoke).toEqual(["blob:front"]);
    expect(retaken.session.captureState.views.front.status).toBe("retakeRequested");
    expect(retaken.session.captureState.views.front.retakeCount).toBe(1);

    const recaptured = setAngleCapture(retaken.session, "straightOn", image("straightOn", "blob:front-2"), "camera");
    const removed = removeAngleCapture(recaptured.session, "straightOn");
    expect(removed.session.angles[0].image).toBeUndefined();
    expect(removed.objectUrlsToRevoke).toEqual(["blob:front-2"]);
    expect(removed.session.captureState.views.front.status).toBe("retakeRequested");
    expect(removed.session.captureState.views.leftThreeQuarter.status).toBe("pending");
  });

  it("marks one failed required view without restarting completed views", () => {
    let session = createInitialCaptureSession();
    session = setAngleCapture(session, "straightOn", image("straightOn", "blob:front"), "upload").session;
    const failed = setAngleError(session, "left45", ["Image may be blurry."]);
    expect(failed.captureState.views.front.status).toBe("captured");
    expect(failed.captureState.views.leftThreeQuarter.status).toBe("qualityFailed");
    expect(failed.captureState.currentViewID).toBe("leftThreeQuarter");
    expect(failed.captureState.canContinueToReview).toBe(false);
  });

  it("reaches review when required views are complete while optional views remain pending", () => {
    let session = createInitialCaptureSession();
    for (const angleID of ["straightOn", "left45", "right45", "leftProfile", "rightProfile"] as const) {
      session = setAngleCapture(session, angleID, image(angleID, `blob:${angleID}`), "upload").session;
    }
    expect(session.status).toBe("complete");
    expect(session.captureState.status).toBe("requiredComplete");
    expect(session.captureState.canContinueToReview).toBe(true);
    expect(session.captureState.completedRequiredCount).toBe(5);
    expect(session.captureState.completedOptionalCount).toBe(0);
  });

  it("tracks optional view skip and required-view abandonment recovery separately", () => {
    let machine = createGuidedCaptureStateMachine(new Date("2026-07-10T00:00:00.000Z"));
    machine = skipOptionalGuidedCaptureView(machine, "hairlineDetail", "Hairline detail not practical for this session.");
    expect(machine.views.hairlineDetail.status).toBe("skipped");

    machine = abandonGuidedCaptureView(machine, "leftProfile", "User paused before profile capture.");
    expect(machine.views.leftProfile.status).toBe("abandoned");
    expect(summarizeGuidedCapture(machine).abandonedViewIDs).toContain("leftProfile");

    machine = recoverGuidedCaptureView(machine, "leftProfile", "User returned to finish only this view.");
    expect(machine.views.leftProfile.status).toBe("active");
    expect(machine.views.front.status).toBe("pending");
    expect(machine.currentViewID).toBe("leftProfile");
  });

  it("does not allow optional-skip semantics for required views", () => {
    expect(() => skipOptionalGuidedCaptureView(createGuidedCaptureStateMachine(), "front", "Required view cannot be skipped.")).toThrow(
      /Cannot skip required/
    );
  });

  it("tracks missing coverage regions and selective retake targets", () => {
    const session = createInitialCaptureSession();
    expect(session.coverageMap.regions.forehead.state).toBe("missing");
    expect(session.coverageMap.regions.ears.retakeAngleIDs).toEqual(["leftProfile", "rightProfile"]);
    expect(session.coverageMap.counts.missing).toBe(11);
  });

  it("marks present but unconfirmed coverage as weak", () => {
    const session = setAngleCapture(createInitialCaptureSession(), "straightOn", image("straightOn", "blob:front"), "upload").session;
    expect(session.coverageMap.regions.forehead.state).toBe("weak");
    expect(session.coverageMap.regions.brows.state).toBe("weak");
  });

  it("marks coverage sufficient after required views and manual confirmations are complete", () => {
    let session = createInitialCaptureSession();
    for (const angleID of ["straightOn", "left45", "right45", "leftProfile", "rightProfile"] as const) {
      session = setAngleCapture(session, angleID, image(angleID, `blob:${angleID}`), "upload", qualityReport("ready")).session;
      session = setAngleManualConfirmation(session, angleID, {
        requestedAngle: true,
        neutralExpression: true,
        onePerson: true
      });
    }
    expect(session.coverageMap.counts.sufficient).toBe(11);
    expect(session.coverageMap.blockingRegionIDs).toEqual([]);
  });

  it("marks blocking quality as conflicting unusable without restarting other coverage", () => {
    let session = createInitialCaptureSession();
    session = setAngleCapture(session, "straightOn", image("straightOn", "blob:front"), "upload", qualityReport("ready")).session;
    session = setAngleManualConfirmation(session, "straightOn", {
      requestedAngle: true,
      neutralExpression: true,
      onePerson: true
    });
    session = setAngleCapture(session, "rightProfile", image("rightProfile", "blob:right-profile"), "upload", qualityReport("ready")).session;
    session = setAngleManualConfirmation(session, "rightProfile", {
      requestedAngle: true,
      neutralExpression: true,
      onePerson: true
    });
    session = setAngleCapture(session, "leftProfile", image("leftProfile", "blob:left-profile"), "upload", qualityReport("blocked")).session;
    expect(session.coverageMap.regions.ears.state).toBe("conflictingUnusable");
    expect(session.coverageMap.regions.ears.retakeAngleIDs).toEqual(["leftProfile"]);
    expect(session.coverageMap.regions.mouth.state).toBe("sufficient");
  });

  it("recomputes coverage after selective retake and removal", () => {
    let session = createInitialCaptureSession();
    session = setAngleCapture(session, "leftProfile", image("leftProfile", "blob:left-profile"), "upload", qualityReport("ready")).session;
    session = setAngleManualConfirmation(session, "leftProfile", {
      requestedAngle: true,
      neutralExpression: true,
      onePerson: true
    });
    session = setAngleCapture(session, "rightProfile", image("rightProfile", "blob:right-profile"), "upload", qualityReport("ready")).session;
    session = setAngleManualConfirmation(session, "rightProfile", {
      requestedAngle: true,
      neutralExpression: true,
      onePerson: true
    });
    expect(session.coverageMap.regions.ears.state).toBe("sufficient");
    const retaken = retakeAngle(session, "leftProfile").session;
    expect(retaken.coverageMap.regions.ears.state).toBe("missing");
    expect(retaken.coverageMap.regions.ears.retakeAngleIDs).toEqual(["leftProfile"]);
  });

  it("can build a standalone coverage map from captured angles", () => {
    const session = setAngleCapture(createInitialCaptureSession(), "straightOn", image("straightOn", "blob:front"), "upload").session;
    const coverage = createCaptureCoverageMap(session.angles, new Date("2026-07-10T00:00:00.000Z"));
    expect(coverage.version).toBe("web-rgb-coverage-map-1.0.0");
    expect(coverage.regions).toHaveProperty("hairline");
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

  it("rejects HEIC and HEIF with an honest unsupported state", () => {
    expect(isHeicOrHeif("camera-roll.heic", "")).toBe(true);
    expect(isHeicOrHeif("camera-roll.jpg", "image/jpeg")).toBe(false);
    const result = validateImageMetadata({
      fileName: "camera-roll.heic",
      fileType: "image/heic",
      fileSizeBytes: 2_000_000,
      width: 1200,
      height: 1600,
      associatedAngleID: "straightOn"
    });
    expect(result.errors).toContain("HEIC/HEIF images are not supported in this web MVP. Export or upload JPEG, PNG, or WebP instead.");
  });

  it("calculates large-image downscaling dimensions before browser analysis", () => {
    expect(shouldDownscaleImage(4032, 3024)).toBe(true);
    expect(getDownscaledDimensions(4032, 3024)).toEqual({ width: 1600, height: 1200, scale: 1600 / 4032 });
    expect(getDownscaledDimensions(1200, 900)).toEqual({ width: 1200, height: 900, scale: 1 });
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

function qualityReport(overallState: ImageQualityReport["overallState"]): ImageQualityReport {
  return {
    decodedSuccessfully: { value: true, evidence: "measured", label: "Decoded" },
    width: { value: 900, evidence: "measured", label: "Width" },
    height: { value: 1200, evidence: "measured", label: "Height" },
    aspectRatio: { value: 0.75, evidence: "measured", label: "Aspect ratio" },
    fileSizeBytes: { value: 1024, evidence: "measured", label: "File size" },
    brightnessEstimate: { value: 128, evidence: "estimated", label: "Brightness" },
    highlightClippingEstimate: { value: 0, evidence: "estimated", label: "Highlights" },
    shadowClippingEstimate: { value: 0, evidence: "estimated", label: "Shadows" },
    sharpnessEstimate: { value: 60, evidence: "estimated", label: "Sharpness" },
    lightingImbalanceEstimate: { value: 0, evidence: "estimated", label: "Lighting imbalance" },
    orientation: { value: "portrait", evidence: "measured", label: "Orientation" },
    duplicateImage: { value: false, evidence: "measured", label: "Duplicate" },
    requiredAnglePresent: { value: true, evidence: "measured", label: "Required angle present" },
    userConfirmedRequestedAngle: { value: true, evidence: "userConfirmed", label: "Requested angle" },
    userConfirmedNeutralExpression: { value: true, evidence: "userConfirmed", label: "Neutral expression" },
    userConfirmedOnePerson: { value: true, evidence: "userConfirmed", label: "One person" },
    advisoryMessages: overallState === "needsReview" ? ["Synthetic advisory for coverage test."] : [],
    blockingMessages: overallState === "blocked" ? ["Synthetic blocking issue for coverage test."] : [],
    overallState
  };
}
