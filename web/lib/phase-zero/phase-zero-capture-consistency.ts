import type { ISODateString } from "@/types/domain";
import type { PixelSample } from "@/lib/capture/image-quality-service";
import type { Phase0EntityID } from "./phase-zero-domain";
import type { Phase0EvidenceView } from "./phase-zero-evidence";
import type { Phase0ImageDimensions, Phase0NormalizedCropRect } from "./phase-zero-image-derivative";

export const PHASE0_CAPTURE_CONSISTENCY_SCHEMA_VERSION = "phase0-capture-consistency-v1";

export type Phase0CaptureConsistencyEvidenceKind = "measured" | "estimated" | "manualFlag" | "unavailable";
export type Phase0CaptureConsistencySeverity = "info" | "warning";
export type Phase0CaptureConsistencyCheckCode =
  | "imageDimensions"
  | "aspectRatio"
  | "cropConsistency"
  | "headBoundingBoxSize"
  | "headCenterPosition"
  | "brightness"
  | "contrast"
  | "sharpness"
  | "colorBalance"
  | "overlayObstruction"
  | "cursorObstruction"
  | "missingSkullOrChin"
  | "unexpectedHairstyle"
  | "unexpectedFacialHair"
  | "suspectedLoadingAnimation";

export interface Phase0CaptureConsistencyMetric {
  value: number | null;
  evidence: Phase0CaptureConsistencyEvidenceKind;
}

export interface Phase0CaptureConsistencyColorBalance {
  redMean: number;
  greenMean: number;
  blueMean: number;
  channelSpread: number;
}

export interface Phase0CaptureConsistencyMeasurements {
  brightness: Phase0CaptureConsistencyMetric;
  contrast: Phase0CaptureConsistencyMetric;
  sharpness: Phase0CaptureConsistencyMetric;
  colorBalance: Phase0CaptureConsistencyColorBalance | null;
}

export interface Phase0HeadBoundingBox {
  unit: "normalized";
  x: number;
  y: number;
  width: number;
  height: number;
  source: "localLandmarks" | "operatorEstimate" | "other";
}

export interface Phase0CaptureConsistencyManualFlags {
  overlayObstruction: boolean;
  cursorObstruction: boolean;
  missingSkullOrChin: boolean;
  unexpectedHairstyle: boolean;
  unexpectedFacialHair: boolean;
  suspectedLoadingAnimation: boolean;
  notes: string;
}

export interface Phase0CaptureConsistencyEvidence {
  evidenceID: Phase0EntityID;
  view: Phase0EvidenceView;
  dimensions: Phase0ImageDimensions;
  crop: Phase0NormalizedCropRect | null;
  headBoundingBox: Phase0HeadBoundingBox | null;
  measurements: Phase0CaptureConsistencyMeasurements | null;
  manualFlags: Phase0CaptureConsistencyManualFlags;
}

export interface Phase0CaptureConsistencyTolerances {
  environmentID: Phase0EntityID;
  dimensions: {
    expectedWidth: number | null;
    expectedHeight: number | null;
    tolerancePixels: number;
    crossImageTolerancePixels: number;
  };
  aspectRatio: {
    expected: number | null;
    tolerance: number;
    crossImageTolerance: number;
  };
  crop: {
    normalizedTolerance: number;
  };
  headBoundingBox: {
    minSizeRatio: number;
    maxSizeRatio: number;
    crossImageSizeTolerance: number;
    centerXTolerance: number;
    centerYTolerance: number;
  };
  brightness: {
    minimum: number;
    maximum: number;
    crossImageTolerance: number;
  };
  contrast: {
    minimum: number;
    maximum: number;
    crossImageTolerance: number;
  };
  sharpness: {
    minimum: number;
    crossImageTolerance: number;
  };
  colorBalance: {
    maxChannelSpread: number;
    crossImageTolerance: number;
  };
}

export interface Phase0CaptureConsistencyFinding {
  code: Phase0CaptureConsistencyCheckCode;
  severity: Phase0CaptureConsistencySeverity;
  evidenceID?: Phase0EntityID;
  message: string;
  evidenceKind: Phase0CaptureConsistencyEvidenceKind;
  automatedFinding: boolean;
}

export interface Phase0CaptureConsistencyReport {
  schemaVersion: typeof PHASE0_CAPTURE_CONSISTENCY_SCHEMA_VERSION;
  environmentID: Phase0EntityID;
  generatedAt: ISODateString;
  evidenceCount: number;
  tolerances: Phase0CaptureConsistencyTolerances;
  findings: Phase0CaptureConsistencyFinding[];
  summary: {
    warningCount: number;
    manualFlagCount: number;
    automatedWarningCount: number;
    verifiedGameFactsCreated: false;
  };
  qaNotice: string;
}

type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends object ? DeepPartial<T[Key]> : T[Key];
};

const manualFlagLabels: Array<[keyof Phase0CaptureConsistencyManualFlags, Phase0CaptureConsistencyCheckCode, string]> = [
  ["overlayObstruction", "overlayObstruction", "Operator flagged possible menu or UI overlay obstruction."],
  ["cursorObstruction", "cursorObstruction", "Operator flagged possible cursor obstruction."],
  ["missingSkullOrChin", "missingSkullOrChin", "Operator flagged missing skull, hairline, chin, or lower-face framing."],
  ["unexpectedHairstyle", "unexpectedHairstyle", "Operator flagged unexpected hairstyle relative to the canonical capture setup."],
  ["unexpectedFacialHair", "unexpectedFacialHair", "Operator flagged unexpected facial hair relative to the canonical capture setup."],
  ["suspectedLoadingAnimation", "suspectedLoadingAnimation", "Operator flagged suspected loading animation or transient visual state."]
];

export function createDefaultCaptureConsistencyTolerances(
  environmentID: Phase0EntityID,
  overrides: DeepPartial<Phase0CaptureConsistencyTolerances> = {}
): Phase0CaptureConsistencyTolerances {
  const base: Phase0CaptureConsistencyTolerances = {
    environmentID,
    dimensions: {
      expectedWidth: null,
      expectedHeight: null,
      tolerancePixels: 2,
      crossImageTolerancePixels: 2
    },
    aspectRatio: {
      expected: null,
      tolerance: 0.01,
      crossImageTolerance: 0.01
    },
    crop: {
      normalizedTolerance: 0.025
    },
    headBoundingBox: {
      minSizeRatio: 0.35,
      maxSizeRatio: 0.78,
      crossImageSizeTolerance: 0.08,
      centerXTolerance: 0.08,
      centerYTolerance: 0.1
    },
    brightness: {
      minimum: 0.28,
      maximum: 0.82,
      crossImageTolerance: 0.18
    },
    contrast: {
      minimum: 0.08,
      maximum: 0.42,
      crossImageTolerance: 0.16
    },
    sharpness: {
      minimum: 8,
      crossImageTolerance: 12
    },
    colorBalance: {
      maxChannelSpread: 0.18,
      crossImageTolerance: 0.16
    }
  };
  return {
    ...base,
    ...overrides,
    dimensions: { ...base.dimensions, ...overrides.dimensions },
    aspectRatio: { ...base.aspectRatio, ...overrides.aspectRatio },
    crop: { ...base.crop, ...overrides.crop },
    headBoundingBox: { ...base.headBoundingBox, ...overrides.headBoundingBox },
    brightness: { ...base.brightness, ...overrides.brightness },
    contrast: { ...base.contrast, ...overrides.contrast },
    sharpness: { ...base.sharpness, ...overrides.sharpness },
    colorBalance: { ...base.colorBalance, ...overrides.colorBalance }
  };
}

export function createCaptureConsistencyReport(input: {
  environmentID: Phase0EntityID;
  evidence: Phase0CaptureConsistencyEvidence[];
  tolerances?: Phase0CaptureConsistencyTolerances;
  generatedAt: ISODateString;
}): Phase0CaptureConsistencyReport {
  const tolerances = input.tolerances ?? createDefaultCaptureConsistencyTolerances(input.environmentID);
  const findings: Phase0CaptureConsistencyFinding[] = [];
  for (const evidence of input.evidence) {
    findings.push(...analyzeSingleEvidence(evidence, tolerances));
  }
  findings.push(...analyzeCrossEvidenceConsistency(input.evidence, tolerances));
  const manualFlagCount = findings.filter((finding) => finding.evidenceKind === "manualFlag").length;
  const automatedWarningCount = findings.filter((finding) => finding.automatedFinding).length;
  return {
    schemaVersion: PHASE0_CAPTURE_CONSISTENCY_SCHEMA_VERSION,
    environmentID: input.environmentID,
    generatedAt: input.generatedAt,
    evidenceCount: input.evidence.length,
    tolerances,
    findings,
    summary: {
      warningCount: findings.length,
      manualFlagCount,
      automatedWarningCount,
      verifiedGameFactsCreated: false
    },
    qaNotice: "Capture-consistency QA findings are warnings for human review. They are not verified College Football 27 facts and must not auto-publish catalog records."
  };
}

export function createConsistencyMeasurementsFromPixelSample(sample: PixelSample): Phase0CaptureConsistencyMeasurements {
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let luminanceTotal = 0;
  let sharpnessTotal = 0;
  let sharpnessSamples = 0;
  const luminance = new Float32Array(sample.width * sample.height);

  for (let index = 0, pixelIndex = 0; index < sample.rgba.length; index += 4, pixelIndex += 1) {
    const red = sample.rgba[index] / 255;
    const green = sample.rgba[index + 1] / 255;
    const blue = sample.rgba[index + 2] / 255;
    const value = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    redTotal += red;
    greenTotal += green;
    blueTotal += blue;
    luminanceTotal += value;
    luminance[pixelIndex] = value;
  }

  const pixelCount = Math.max(sample.width * sample.height, 1);
  const brightness = luminanceTotal / pixelCount;
  let variance = 0;
  for (const value of luminance) variance += (value - brightness) ** 2;

  for (let y = 1; y < sample.height - 1; y += 1) {
    for (let x = 1; x < sample.width - 1; x += 1) {
      const current = luminance[y * sample.width + x];
      sharpnessTotal += Math.abs(current - luminance[y * sample.width + x - 1]);
      sharpnessTotal += Math.abs(current - luminance[(y - 1) * sample.width + x]);
      sharpnessSamples += 1;
    }
  }

  const redMean = redTotal / pixelCount;
  const greenMean = greenTotal / pixelCount;
  const blueMean = blueTotal / pixelCount;
  const minChannel = Math.min(redMean, greenMean, blueMean);
  const maxChannel = Math.max(redMean, greenMean, blueMean);
  return {
    brightness: metric(round(brightness), "estimated"),
    contrast: metric(round(Math.sqrt(variance / pixelCount)), "estimated"),
    sharpness: metric(round((sharpnessTotal / Math.max(sharpnessSamples, 1)) * 100), "estimated"),
    colorBalance: {
      redMean: round(redMean),
      greenMean: round(greenMean),
      blueMean: round(blueMean),
      channelSpread: round(maxChannel - minChannel)
    }
  };
}

export function createEmptyManualConsistencyFlags(notes = ""): Phase0CaptureConsistencyManualFlags {
  return {
    overlayObstruction: false,
    cursorObstruction: false,
    missingSkullOrChin: false,
    unexpectedHairstyle: false,
    unexpectedFacialHair: false,
    suspectedLoadingAnimation: false,
    notes
  };
}

function analyzeSingleEvidence(
  evidence: Phase0CaptureConsistencyEvidence,
  tolerances: Phase0CaptureConsistencyTolerances
): Phase0CaptureConsistencyFinding[] {
  const findings: Phase0CaptureConsistencyFinding[] = [];
  const aspectRatio = evidence.dimensions.width / Math.max(evidence.dimensions.height, 1);
  if (tolerances.dimensions.expectedWidth !== null && Math.abs(evidence.dimensions.width - tolerances.dimensions.expectedWidth) > tolerances.dimensions.tolerancePixels) {
    findings.push(warning("imageDimensions", evidence.evidenceID, `Image width ${evidence.dimensions.width}px differs from expected ${tolerances.dimensions.expectedWidth}px.`, "measured", true));
  }
  if (tolerances.dimensions.expectedHeight !== null && Math.abs(evidence.dimensions.height - tolerances.dimensions.expectedHeight) > tolerances.dimensions.tolerancePixels) {
    findings.push(warning("imageDimensions", evidence.evidenceID, `Image height ${evidence.dimensions.height}px differs from expected ${tolerances.dimensions.expectedHeight}px.`, "measured", true));
  }
  if (tolerances.aspectRatio.expected !== null && Math.abs(aspectRatio - tolerances.aspectRatio.expected) > tolerances.aspectRatio.tolerance) {
    findings.push(warning("aspectRatio", evidence.evidenceID, `Aspect ratio ${round(aspectRatio)} differs from expected ${tolerances.aspectRatio.expected}.`, "measured", true));
  }
  if (!evidence.crop) findings.push(warning("cropConsistency", evidence.evidenceID, "Crop metadata is unavailable for this evidence.", "unavailable", true));
  if (!evidence.headBoundingBox) {
    findings.push(warning("headBoundingBoxSize", evidence.evidenceID, "Head bounding-box metadata is unavailable.", "unavailable", true));
    findings.push(warning("headCenterPosition", evidence.evidenceID, "Head-center metadata is unavailable.", "unavailable", true));
  } else {
    const headSize = Math.max(evidence.headBoundingBox.width, evidence.headBoundingBox.height);
    const centerX = evidence.headBoundingBox.x + evidence.headBoundingBox.width / 2;
    const centerY = evidence.headBoundingBox.y + evidence.headBoundingBox.height / 2;
    if (headSize < tolerances.headBoundingBox.minSizeRatio || headSize > tolerances.headBoundingBox.maxSizeRatio) {
      findings.push(warning("headBoundingBoxSize", evidence.evidenceID, `Head bounding-box size ratio ${round(headSize)} is outside the configured range.`, "estimated", true));
    }
    if (Math.abs(centerX - 0.5) > tolerances.headBoundingBox.centerXTolerance || Math.abs(centerY - 0.5) > tolerances.headBoundingBox.centerYTolerance) {
      findings.push(warning("headCenterPosition", evidence.evidenceID, `Head center (${round(centerX)}, ${round(centerY)}) is outside configured center tolerance.`, "estimated", true));
    }
  }
  findings.push(...measurementFindings(evidence, tolerances));
  for (const [field, code, message] of manualFlagLabels) {
    if (field === "notes") continue;
    if (evidence.manualFlags[field]) findings.push(warning(code, evidence.evidenceID, message, "manualFlag", false));
  }
  return findings;
}

function measurementFindings(
  evidence: Phase0CaptureConsistencyEvidence,
  tolerances: Phase0CaptureConsistencyTolerances
): Phase0CaptureConsistencyFinding[] {
  if (!evidence.measurements) {
    return [
      warning("brightness", evidence.evidenceID, "Brightness measurement is unavailable.", "unavailable", true),
      warning("contrast", evidence.evidenceID, "Contrast measurement is unavailable.", "unavailable", true),
      warning("sharpness", evidence.evidenceID, "Sharpness measurement is unavailable.", "unavailable", true),
      warning("colorBalance", evidence.evidenceID, "Color-balance measurement is unavailable.", "unavailable", true)
    ];
  }
  const findings: Phase0CaptureConsistencyFinding[] = [];
  const brightness = evidence.measurements.brightness.value;
  const contrast = evidence.measurements.contrast.value;
  const sharpness = evidence.measurements.sharpness.value;
  if (brightness !== null && (brightness < tolerances.brightness.minimum || brightness > tolerances.brightness.maximum)) {
    findings.push(warning("brightness", evidence.evidenceID, `Brightness ${brightness} is outside configured range.`, evidence.measurements.brightness.evidence, true));
  }
  if (contrast !== null && (contrast < tolerances.contrast.minimum || contrast > tolerances.contrast.maximum)) {
    findings.push(warning("contrast", evidence.evidenceID, `Contrast ${contrast} is outside configured range.`, evidence.measurements.contrast.evidence, true));
  }
  if (sharpness !== null && sharpness < tolerances.sharpness.minimum) {
    findings.push(warning("sharpness", evidence.evidenceID, `Sharpness ${sharpness} is below configured minimum.`, evidence.measurements.sharpness.evidence, true));
  }
  if (evidence.measurements.colorBalance && evidence.measurements.colorBalance.channelSpread > tolerances.colorBalance.maxChannelSpread) {
    findings.push(warning("colorBalance", evidence.evidenceID, `Color channel spread ${evidence.measurements.colorBalance.channelSpread} exceeds configured tolerance.`, "estimated", true));
  }
  return findings;
}

function analyzeCrossEvidenceConsistency(
  evidence: Phase0CaptureConsistencyEvidence[],
  tolerances: Phase0CaptureConsistencyTolerances
): Phase0CaptureConsistencyFinding[] {
  const findings: Phase0CaptureConsistencyFinding[] = [];
  const widths = evidence.map((item) => item.dimensions.width);
  const heights = evidence.map((item) => item.dimensions.height);
  const ratios = evidence.map((item) => item.dimensions.width / Math.max(item.dimensions.height, 1));
  if (range(widths) > tolerances.dimensions.crossImageTolerancePixels || range(heights) > tolerances.dimensions.crossImageTolerancePixels) {
    findings.push(warning("imageDimensions", undefined, "Image dimensions vary across the capture set.", "measured", true));
  }
  if (range(ratios) > tolerances.aspectRatio.crossImageTolerance) {
    findings.push(warning("aspectRatio", undefined, "Aspect ratio varies across the capture set.", "measured", true));
  }
  const crops = evidence.filter((item) => item.crop).map((item) => item.crop as Phase0NormalizedCropRect);
  if (crops.length > 1 && normalizedCropRange(crops) > tolerances.crop.normalizedTolerance) {
    findings.push(warning("cropConsistency", undefined, "Crop rectangles vary across the capture set.", "measured", true));
  }
  const headSizes = evidence.filter((item) => item.headBoundingBox).map((item) => Math.max(item.headBoundingBox?.width ?? 0, item.headBoundingBox?.height ?? 0));
  if (headSizes.length > 1 && range(headSizes) > tolerances.headBoundingBox.crossImageSizeTolerance) {
    findings.push(warning("headBoundingBoxSize", undefined, "Head bounding-box size varies across the capture set.", "estimated", true));
  }
  compareMeasurementRange(evidence, "brightness", tolerances.brightness.crossImageTolerance, findings);
  compareMeasurementRange(evidence, "contrast", tolerances.contrast.crossImageTolerance, findings);
  compareMeasurementRange(evidence, "sharpness", tolerances.sharpness.crossImageTolerance, findings);
  const channelSpreads = evidence.map((item) => item.measurements?.colorBalance?.channelSpread).filter(isNumber);
  if (channelSpreads.length > 1 && range(channelSpreads) > tolerances.colorBalance.crossImageTolerance) {
    findings.push(warning("colorBalance", undefined, "Color balance varies across the capture set.", "estimated", true));
  }
  return findings;
}

function compareMeasurementRange(
  evidence: Phase0CaptureConsistencyEvidence[],
  key: "brightness" | "contrast" | "sharpness",
  tolerance: number,
  findings: Phase0CaptureConsistencyFinding[]
) {
  const values = evidence.map((item) => item.measurements?.[key].value).filter(isNumber);
  if (values.length > 1 && range(values) > tolerance) {
    findings.push(warning(key, undefined, `${capitalize(key)} varies across the capture set.`, "estimated", true));
  }
}

function normalizedCropRange(crops: Phase0NormalizedCropRect[]) {
  return Math.max(range(crops.map((crop) => crop.x)), range(crops.map((crop) => crop.y)), range(crops.map((crop) => crop.width)), range(crops.map((crop) => crop.height)));
}

function range(values: number[]) {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function metric(value: number | null, evidence: Phase0CaptureConsistencyEvidenceKind): Phase0CaptureConsistencyMetric {
  return { value, evidence };
}

function warning(
  code: Phase0CaptureConsistencyCheckCode,
  evidenceID: Phase0EntityID | undefined,
  message: string,
  evidenceKind: Phase0CaptureConsistencyEvidenceKind,
  automatedFinding: boolean
): Phase0CaptureConsistencyFinding {
  return {
    code,
    severity: "warning",
    evidenceID,
    message,
    evidenceKind,
    automatedFinding
  };
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
