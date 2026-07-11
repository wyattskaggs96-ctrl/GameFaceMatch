import { describe, expect, it } from "vitest";
import { createInitialCaptureSession, setAngleCapture, setAngleManualConfirmation } from "@/lib/capture/capture-session";
import {
  applyManualConfirmationToReport,
  calculateImageMeasurements,
  createCaptureReviewReport,
  createImageQualityReport
} from "@/lib/capture/image-quality-service";
import { createTemporaryImageReference } from "@/lib/capture/image-validation";
import type { CapturedAngleID, TemporaryImageReference } from "@/types/domain";

describe("image quality measurements", () => {
  it("estimates dark and bright brightness boundaries", () => {
    const dark = calculateImageMeasurements(pixelSample(2, 2, [0, 0, 0, 255]));
    expect(dark.brightness).toBe(0);
    expect(dark.shadowClipping).toBe(1);

    const bright = calculateImageMeasurements(pixelSample(2, 2, [255, 255, 255, 255]));
    expect(bright.brightness).toBe(1);
    expect(bright.highlightClipping).toBe(1);
  });

  it("blocks images below dimension boundaries", () => {
    const report = createImageQualityReport({
      decodedSuccessfully: true,
      image: image("straightOn", "tiny.jpg", "image/jpeg", 1_000_000, 320, 320, "tiny"),
      pixelSample: pixelSample(2, 2, [128, 128, 128, 255]),
      existingAngles: [],
      associatedAngleID: "straightOn",
      manualConfirmation: confirmed()
    });
    expect(report.blockingMessages).toContain("Image dimensions are too small.");
    expect(report.overallState).toBe("blocked");
  });

  it("blocks unsupported image formats", () => {
    const report = createImageQualityReport({
      decodedSuccessfully: true,
      image: image("straightOn", "front.gif", "image/gif", 1_000_000, 900, 900, "gif"),
      pixelSample: pixelSample(2, 2, [128, 128, 128, 255]),
      existingAngles: [],
      associatedAngleID: "straightOn",
      manualConfirmation: confirmed()
    });
    expect(report.blockingMessages).toContain("Unsupported file format.");
  });

  it("blocks exact duplicate images across angles", () => {
    const session = createInitialCaptureSession();
    const duplicate = image("straightOn", "same.jpg", "image/jpeg", 1_000_000, 900, 900, "same-signature");
    const existing = setAngleCapture(session, "straightOn", duplicate, "upload").session.angles;

    const report = createImageQualityReport({
      decodedSuccessfully: true,
      image: image("left45", "same.jpg", "image/jpeg", 1_000_000, 900, 900, "same-signature"),
      pixelSample: pixelSample(2, 2, [128, 128, 128, 255]),
      existingAngles: existing,
      associatedAngleID: "left45",
      manualConfirmation: confirmed()
    });
    expect(report.duplicateImage.value).toBe(true);
    expect(report.blockingMessages).toContain("Exact duplicate used for multiple angles.");
  });

  it("blocks missing required views in capture review", () => {
    const session = createInitialCaptureSession();
    const review = createCaptureReviewReport(session.angles);
    expect(review.canContinue).toBe(false);
    expect(review.blockingMessages).toContain("Image cannot be decoded.");
    expect(review.blockingMessages).toContain("Required angle missing.");
  });

  it("separates advisory messages from blocking failures", () => {
    const report = createImageQualityReport({
      decodedSuccessfully: true,
      image: image("straightOn", "dark.jpg", "image/jpeg", 1_000_000, 900, 900, "dark"),
      pixelSample: pixelSample(2, 2, [10, 10, 10, 255]),
      existingAngles: [],
      associatedAngleID: "straightOn",
      manualConfirmation: { requestedAngle: false, neutralExpression: false, onePerson: false }
    });
    expect(report.blockingMessages).toEqual([]);
    expect(report.advisoryMessages).toContain("Image may be dark.");
    expect(report.advisoryMessages).toContain("Confirm that only one person is visible.");
    expect(report.overallState).toBe("needsReview");
  });

  it("updates manual confirmations without treating them as detected facial analysis", () => {
    const report = createImageQualityReport({
      decodedSuccessfully: true,
      image: image("straightOn", "front.jpg", "image/jpeg", 1_000_000, 900, 900, "front"),
      pixelSample: pixelSample(2, 2, [128, 128, 128, 255]),
      existingAngles: [],
      associatedAngleID: "straightOn",
      manualConfirmation: { requestedAngle: false, neutralExpression: false, onePerson: false }
    });

    const confirmedReport = applyManualConfirmationToReport(report, confirmed());
    expect(confirmedReport.userConfirmedRequestedAngle.value).toBe(true);
    expect(confirmedReport.userConfirmedNeutralExpression.evidence).toBe("userConfirmed");
    expect(confirmedReport.advisoryMessages).not.toContain("Confirm neutral expression and gently closed lips.");

    const session = createInitialCaptureSession();
    const updated = setAngleManualConfirmation(session, "straightOn", { requestedAngle: true });
    expect(updated.angles[0].manualConfirmation.requestedAngle).toBe(true);
  });

  it("supports selective retake by only blocking the replaced angle", () => {
    let session = createInitialCaptureSession();
    for (const angle of session.angles) {
      const report = createImageQualityReport({
        decodedSuccessfully: true,
        image: image(angle.id, `${angle.id}.jpg`, "image/jpeg", 1_000_000, 900, 900, angle.id),
        pixelSample: pixelSample(2, 2, [128, 128, 128, 255]),
        existingAngles: session.angles.filter((candidate) => candidate.id !== angle.id),
        associatedAngleID: angle.id,
        manualConfirmation: confirmed()
      });
      session = setAngleCapture(session, angle.id, image(angle.id, `${angle.id}.jpg`, "image/jpeg", 1_000_000, 900, 900, angle.id), "upload", report).session;
    }

    const retakeSession = {
      ...session,
      angles: session.angles.map((angle) =>
        angle.id === "right45"
          ? {
              ...angle,
              status: "empty" as const,
              image: undefined,
              qualityReport: undefined
            }
          : angle
      )
    };
    const review = createCaptureReviewReport(retakeSession.angles);
    expect(review.canContinue).toBe(false);
    expect(review.angleReports.right45.blockingMessages).toContain("Required angle missing.");
    expect(review.angleReports.straightOn.blockingMessages).toEqual([]);
  });

  it("blocks invalid image decoding", () => {
    const report = createImageQualityReport({
      decodedSuccessfully: false,
      existingAngles: [],
      associatedAngleID: "straightOn",
      decodeError: "Image cannot be decoded.",
      manualConfirmation: confirmed()
    });
    expect(report.decodedSuccessfully.value).toBe(false);
    expect(report.blockingMessages).toContain("Image cannot be decoded.");
  });
});

function image(
  angleID: CapturedAngleID,
  fileName: string,
  fileType: string,
  fileSizeBytes: number,
  width: number,
  height: number,
  signature: string
): TemporaryImageReference {
  return createTemporaryImageReference(
    {
      objectUrl: `blob:${signature}`,
      fileName,
      fileType,
      fileSizeBytes,
      width,
      height,
      source: "upload",
      associatedAngleID: angleID,
      signature
    },
    signature
  );
}

function pixelSample(width: number, height: number, rgba: [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = rgba[0];
    data[index + 1] = rgba[1];
    data[index + 2] = rgba[2];
    data[index + 3] = rgba[3];
  }
  return { width, height, rgba: data };
}

function confirmed() {
  return {
    requestedAngle: true,
    neutralExpression: true,
    onePerson: true
  };
}
