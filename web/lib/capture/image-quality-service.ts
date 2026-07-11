import type {
  CapturedAngle,
  CapturedAngleID,
  CaptureReviewReport,
  ImageQualityReport,
  QualityEvidenceKind,
  QualityMetric,
  TemporaryImageReference
} from "@/types/domain";

const maxFileSizeBytes = 12 * 1024 * 1024;
const minDimension = 480;
const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface PixelSample {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export interface ImageQualityInput {
  decodedSuccessfully: boolean;
  image?: TemporaryImageReference;
  pixelSample?: PixelSample;
  existingAngles: CapturedAngle[];
  associatedAngleID: CapturedAngleID;
  manualConfirmation?: {
    requestedAngle: boolean;
    neutralExpression: boolean;
    onePerson: boolean;
  };
  decodeError?: string;
}

export interface BrowserImageQualityService {
  analyzeImageElement(input: {
    image: TemporaryImageReference;
    imageElement: HTMLImageElement | HTMLVideoElement;
    existingAngles: CapturedAngle[];
    manualConfirmation?: ImageQualityInput["manualConfirmation"];
  }): ImageQualityReport;
  createInvalidDecodeReport(input: {
    associatedAngleID: CapturedAngleID;
    existingAngles: CapturedAngle[];
    decodeError?: string;
    manualConfirmation?: ImageQualityInput["manualConfirmation"];
  }): ImageQualityReport;
}

export function createBrowserImageQualityService(): BrowserImageQualityService {
  return {
    analyzeImageElement({ image, imageElement, existingAngles, manualConfirmation }) {
      const canvas = document.createElement("canvas");
      const width = imageElement instanceof HTMLVideoElement ? imageElement.videoWidth : imageElement.naturalWidth;
      const height = imageElement instanceof HTMLVideoElement ? imageElement.videoHeight : imageElement.naturalHeight;
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      let pixelSample: PixelSample | undefined;
      if (context && width > 0 && height > 0) {
        context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        pixelSample = {
          width: canvas.width,
          height: canvas.height,
          rgba: imageData.data
        };
      }
      return createImageQualityReport({
        decodedSuccessfully: Boolean(pixelSample),
        image,
        pixelSample,
        existingAngles,
        associatedAngleID: image.associatedAngleID,
        manualConfirmation
      });
    },
    createInvalidDecodeReport({ associatedAngleID, existingAngles, decodeError, manualConfirmation }) {
      return createImageQualityReport({
        decodedSuccessfully: false,
        existingAngles,
        associatedAngleID,
        decodeError,
        manualConfirmation
      });
    }
  };
}

export function createImageQualityReport(input: ImageQualityInput): ImageQualityReport {
  const image = input.image;
  const measurements = input.pixelSample ? calculateImageMeasurements(input.pixelSample) : null;
  const manualConfirmation = input.manualConfirmation ?? {
    requestedAngle: false,
    neutralExpression: false,
    onePerson: false
  };
  const duplicateImage = Boolean(image && input.existingAngles.some((angle) => angle.image?.signature === image.signature));
  const requiredAnglePresent = Boolean(image && image.associatedAngleID === input.associatedAngleID);
  const blockingMessages: string[] = [];
  const advisoryMessages: string[] = [];

  if (!input.decodedSuccessfully) blockingMessages.push(input.decodeError ?? "Image cannot be decoded.");
  if (!image) blockingMessages.push("Required angle missing.");
  if (image && !supportedTypes.has(image.fileType)) blockingMessages.push("Unsupported file format.");
  if (image && image.fileSizeBytes > maxFileSizeBytes) blockingMessages.push("File is too large.");
  if (image && (image.width < minDimension || image.height < minDimension)) blockingMessages.push("Image dimensions are too small.");
  if (duplicateImage) blockingMessages.push("Exact duplicate used for multiple angles.");
  if (image && !requiredAnglePresent) blockingMessages.push("Required angle missing.");

  if (measurements && measurements.brightness < 0.22) advisoryMessages.push("Image may be dark.");
  if (measurements && measurements.highlightClipping > 0.12) advisoryMessages.push("Image may be overexposed.");
  if (measurements && measurements.shadowClipping > 0.22) advisoryMessages.push("Image may have heavy shadows.");
  if (measurements && measurements.sharpness < 10) advisoryMessages.push("Image may be blurry.");
  if (!manualConfirmation.onePerson) advisoryMessages.push("Confirm that only one person is visible.");
  if (!manualConfirmation.neutralExpression) advisoryMessages.push("Confirm neutral expression and gently closed lips.");
  if (!manualConfirmation.requestedAngle) advisoryMessages.push("Confirm that the requested angle was followed.");
  advisoryMessages.push(
    "Face-landmark extraction is attempted locally when the reviewed model asset is available. Face centering, expression neutrality, and one-person confirmation still require user review."
  );

  return {
    decodedSuccessfully: metric(input.decodedSuccessfully, "measured", input.decodedSuccessfully ? "Decoded" : "Not decoded"),
    width: metric(image?.width ?? 0, image ? "measured" : "notYetImplemented", "Width"),
    height: metric(image?.height ?? 0, image ? "measured" : "notYetImplemented", "Height"),
    aspectRatio: metric(image ? round(image.width / Math.max(image.height, 1)) : 0, image ? "measured" : "notYetImplemented", "Aspect ratio"),
    fileSizeBytes: metric(image?.fileSizeBytes ?? 0, image ? "measured" : "notYetImplemented", "File size"),
    brightnessEstimate: metric(measurements?.brightness ?? null, measurements ? "estimated" : "notYetImplemented", "Brightness estimate"),
    highlightClippingEstimate: metric(measurements?.highlightClipping ?? null, measurements ? "estimated" : "notYetImplemented", "Highlight clipping estimate"),
    shadowClippingEstimate: metric(measurements?.shadowClipping ?? null, measurements ? "estimated" : "notYetImplemented", "Shadow clipping estimate"),
    sharpnessEstimate: metric(measurements?.sharpness ?? null, measurements ? "estimated" : "notYetImplemented", "Sharpness estimate"),
    orientation: metric(image?.orientation ?? "unknown", image ? "measured" : "notYetImplemented", "Orientation"),
    duplicateImage: metric(duplicateImage, "measured", "Exact duplicate indicator"),
    requiredAnglePresent: metric(requiredAnglePresent, "measured", "Required-angle presence"),
    userConfirmedRequestedAngle: metric(manualConfirmation.requestedAngle, "userConfirmed", "Requested angle confirmation"),
    userConfirmedNeutralExpression: metric(manualConfirmation.neutralExpression, "userConfirmed", "Neutral expression confirmation"),
    userConfirmedOnePerson: metric(manualConfirmation.onePerson, "userConfirmed", "One-person confirmation"),
    advisoryMessages,
    blockingMessages,
    overallState: blockingMessages.length > 0 ? "blocked" : advisoryMessages.length > 0 ? "needsReview" : "ready"
  };
}

export function createCaptureReviewReport(angles: CapturedAngle[]): CaptureReviewReport {
  const angleReports = Object.fromEntries(
    angles.map((angle) => [
      angle.id,
      angle.qualityReport ??
        createImageQualityReport({
          decodedSuccessfully: false,
          associatedAngleID: angle.id,
          existingAngles: angles.filter((candidate) => candidate.id !== angle.id),
          manualConfirmation: angle.manualConfirmation
        })
    ])
  ) as Record<CapturedAngleID, ImageQualityReport>;
  const reports = Object.values(angleReports);
  const landmarkBlockingMessages = angles.flatMap((angle) => angle.faceLandmarkReport?.blockingMessages ?? []);
  const landmarkAdvisoryMessages = angles.flatMap((angle) => angle.faceLandmarkReport?.advisoryMessages ?? []);
  const guidanceBlockingMessages = angles.flatMap((angle) => angle.captureGuidanceReport?.blockingIssues.map((issue) => `${angle.label}: ${issue.message}`) ?? []);
  const guidanceAdvisoryMessages = angles.flatMap((angle) => angle.captureGuidanceReport?.advisoryWarnings.map((issue) => `${angle.label}: ${issue.message}`) ?? []);
  const blockingMessages = [...reports.flatMap((report) => report.blockingMessages), ...landmarkBlockingMessages, ...guidanceBlockingMessages];
  const advisoryMessages = [
    ...reports.flatMap((report) => report.advisoryMessages),
    ...landmarkAdvisoryMessages,
    ...guidanceAdvisoryMessages
  ];
  return {
    angleReports,
    blockingMessages,
    advisoryMessages,
    canContinue: blockingMessages.length === 0
  };
}

export function applyManualConfirmationToReport(
  report: ImageQualityReport,
  manualConfirmation: {
    requestedAngle: boolean;
    neutralExpression: boolean;
    onePerson: boolean;
  }
): ImageQualityReport {
  const advisoryMessages = [
    ...report.advisoryMessages.filter(
      (message) =>
        message !== "Confirm that only one person is visible." &&
        message !== "Confirm neutral expression and gently closed lips." &&
        message !== "Confirm that the requested angle was followed."
    ),
    ...(manualConfirmation.onePerson ? [] : ["Confirm that only one person is visible."]),
    ...(manualConfirmation.neutralExpression ? [] : ["Confirm neutral expression and gently closed lips."]),
    ...(manualConfirmation.requestedAngle ? [] : ["Confirm that the requested angle was followed."])
  ];
  return {
    ...report,
    userConfirmedRequestedAngle: metric(manualConfirmation.requestedAngle, "userConfirmed", "Requested angle confirmation"),
    userConfirmedNeutralExpression: metric(manualConfirmation.neutralExpression, "userConfirmed", "Neutral expression confirmation"),
    userConfirmedOnePerson: metric(manualConfirmation.onePerson, "userConfirmed", "One-person confirmation"),
    advisoryMessages,
    overallState: report.blockingMessages.length > 0 ? "blocked" : advisoryMessages.length > 0 ? "needsReview" : "ready"
  };
}

export function calculateImageMeasurements(sample: PixelSample) {
  let luminanceTotal = 0;
  let highlightCount = 0;
  let shadowCount = 0;
  let sharpnessTotal = 0;
  let sharpnessSamples = 0;
  const pixels = sample.rgba;
  const luminance = new Float32Array(sample.width * sample.height);

  for (let index = 0, pixelIndex = 0; index < pixels.length; index += 4, pixelIndex += 1) {
    const value = (0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2]) / 255;
    luminance[pixelIndex] = value;
    luminanceTotal += value;
    if (value > 0.94) highlightCount += 1;
    if (value < 0.08) shadowCount += 1;
  }

  for (let y = 1; y < sample.height - 1; y += 1) {
    for (let x = 1; x < sample.width - 1; x += 1) {
      const current = luminance[y * sample.width + x];
      const horizontal = Math.abs(current - luminance[y * sample.width + x - 1]);
      const vertical = Math.abs(current - luminance[(y - 1) * sample.width + x]);
      sharpnessTotal += horizontal + vertical;
      sharpnessSamples += 1;
    }
  }

  const pixelCount = Math.max(sample.width * sample.height, 1);
  return {
    brightness: round(luminanceTotal / pixelCount),
    highlightClipping: round(highlightCount / pixelCount),
    shadowClipping: round(shadowCount / pixelCount),
    sharpness: round((sharpnessTotal / Math.max(sharpnessSamples, 1)) * 100)
  };
}

function metric<T>(value: T, evidence: QualityEvidenceKind, label: string): QualityMetric<T> {
  return { value, evidence, label };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
