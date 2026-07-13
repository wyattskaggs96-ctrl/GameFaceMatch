import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";
import type { Phase0EvidenceDerivativeState, Phase0EvidenceView } from "./phase-zero-evidence";

export const PHASE0_IMAGE_DERIVATIVE_SCHEMA_VERSION = "phase0-image-derivative-v1";
export const PHASE0_IMAGE_DERIVATIVE_STORAGE_KEY = "gameface-match.phase0.image-derivative.metadata.v1";

export type Phase0ImageDerivativeStatus = "ready" | "blocked";
export type Phase0ImageDerivativeExportFormat = "image/png" | "image/jpeg" | "image/webp";
export type Phase0ImageCropUnit = "normalized";
export type Phase0ImageAspectRatioMode = "preserveSource" | "fixed";
export type Phase0FramingGuide = "ruleOfThirds" | "centerCrosshair" | "safeMargin" | "standardFiveAngle";
export type Phase0FaceRegionAlignmentTarget = "center" | "upperThird" | "profileNoseRoom";
export type Phase0ProhibitedImageOperation = "beautyFilter" | "generativeEdit" | "geometryWarp" | "optionChangingEdit" | "colorRestyle";

export interface Phase0ImageDimensions {
  width: number;
  height: number;
}

export interface Phase0NormalizedCropRect {
  unit: Phase0ImageCropUnit;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Phase0ImageAspectRatio {
  mode: Phase0ImageAspectRatioMode;
  width: number | null;
  height: number | null;
}

export interface Phase0FaceRegionAlignmentGuide {
  enabled: boolean;
  target: Phase0FaceRegionAlignmentTarget;
  region: Phase0NormalizedCropRect;
  operatorConfirmed: boolean;
  notes: string;
}

export interface Phase0ImageMasterEvidenceReference {
  stableEvidenceID: Phase0EntityID;
  relativePath: string;
  sha256: string | null;
  dimensions: Phase0ImageDimensions;
  view: Phase0EvidenceView;
  derivativeState: Extract<Phase0EvidenceDerivativeState, "master">;
}

export interface Phase0ImageTransformationMetadata {
  crop: Phase0NormalizedCropRect;
  rotationDegrees: number;
  aspectRatio: Phase0ImageAspectRatio;
  framingGuides: Phase0FramingGuide[];
  faceRegionAlignmentGuide: Phase0FaceRegionAlignmentGuide;
  preservesDepictedOption: true;
  prohibitedOperations: Phase0ProhibitedImageOperation[];
}

export interface Phase0ImageDerivativeRequest {
  derivativeID: Phase0EntityID;
  sourceMaster: Phase0ImageMasterEvidenceReference;
  outputRelativePath: string;
  exportFormat: Phase0ImageDerivativeExportFormat;
  transform: Phase0ImageTransformationMetadata;
  operatorID: string;
  exportedAt: ISODateString;
  notes: string;
}

export interface Phase0ImageDerivativeRecord {
  schemaVersion: typeof PHASE0_IMAGE_DERIVATIVE_SCHEMA_VERSION;
  derivativeID: Phase0EntityID;
  sourceMasterEvidenceID: Phase0EntityID;
  sourceMasterRelativePath: string;
  sourceMasterSha256: string | null;
  outputRelativePath: string;
  derivativeState: Extract<Phase0EvidenceDerivativeState, "derivative">;
  exportFormat: Phase0ImageDerivativeExportFormat;
  view: Phase0EvidenceView;
  sourceDimensions: Phase0ImageDimensions;
  outputDimensions: Phase0ImageDimensions;
  transformationMetadata: Phase0ImageTransformationMetadata;
  exportedAt: ISODateString;
  operatorID: string;
  preservationNote: string;
  notes: string;
}

export interface Phase0ImageDerivativeIssue {
  code: string;
  message: string;
  entityID?: string;
}

export interface Phase0ImageDerivativePlan {
  status: Phase0ImageDerivativeStatus;
  record: Phase0ImageDerivativeRecord | null;
  issues: Phase0ImageDerivativeIssue[];
  warnings: Phase0ImageDerivativeIssue[];
  previewOnly: true;
  destructiveOverwriteAllowed: false;
}

export interface Phase0ImageDerivativeLocalStore {
  load(): Phase0ImageDerivativeRecord[];
  save(records: Phase0ImageDerivativeRecord[]): void;
  clear(): void;
}

const supportedImageMimeTypes = new Set<Phase0ImageDerivativeExportFormat>(["image/png", "image/jpeg", "image/webp"]);
const allowedFramingGuides = new Set<Phase0FramingGuide>(["ruleOfThirds", "centerCrosshair", "safeMargin", "standardFiveAngle"]);

export function createDefaultImageTransform(): Phase0ImageTransformationMetadata {
  return {
    crop: {
      unit: "normalized",
      x: 0,
      y: 0,
      width: 1,
      height: 1
    },
    rotationDegrees: 0,
    aspectRatio: {
      mode: "preserveSource",
      width: null,
      height: null
    },
    framingGuides: ["centerCrosshair", "safeMargin"],
    faceRegionAlignmentGuide: {
      enabled: false,
      target: "center",
      region: {
        unit: "normalized",
        x: 0.28,
        y: 0.18,
        width: 0.44,
        height: 0.58
      },
      operatorConfirmed: false,
      notes: "Alignment guide only; no face-shape or option-changing edit is applied."
    },
    preservesDepictedOption: true,
    prohibitedOperations: []
  };
}

export function createImageDerivativePlan(request: Phase0ImageDerivativeRequest): Phase0ImageDerivativePlan {
  const issues = validateImageDerivativeRequest(request);
  const warnings = createWarnings(request);
  const outputDimensions = estimateOutputDimensions(request.sourceMaster.dimensions, request.transform);
  const record: Phase0ImageDerivativeRecord | null = issues.length === 0
    ? {
        schemaVersion: PHASE0_IMAGE_DERIVATIVE_SCHEMA_VERSION,
        derivativeID: request.derivativeID,
        sourceMasterEvidenceID: request.sourceMaster.stableEvidenceID,
        sourceMasterRelativePath: request.sourceMaster.relativePath,
        sourceMasterSha256: request.sourceMaster.sha256,
        outputRelativePath: normalizeRelativePathInput(request.outputRelativePath),
        derivativeState: "derivative",
        exportFormat: request.exportFormat,
        view: request.sourceMaster.view,
        sourceDimensions: request.sourceMaster.dimensions,
        outputDimensions,
        transformationMetadata: normalizeTransform(request.transform),
        exportedAt: request.exportedAt,
        operatorID: request.operatorID.trim(),
        preservationNote: "Derivative image export is non-destructive. The master evidence file is never overwritten, filtered, warped, generated over, or modified.",
        notes: request.notes.trim()
      }
    : null;

  return {
    status: issues.length === 0 ? "ready" : "blocked",
    record,
    issues,
    warnings,
    previewOnly: true,
    destructiveOverwriteAllowed: false
  };
}

export function validateImageDerivativeRequest(request: Phase0ImageDerivativeRequest): Phase0ImageDerivativeIssue[] {
  const issues: Phase0ImageDerivativeIssue[] = [];
  if (!hasUsableText(request.derivativeID)) issues.push(issue("missingDerivativeID", "Derivative ID is required.", request.derivativeID));
  if (!hasUsableText(request.sourceMaster.stableEvidenceID)) issues.push(issue("missingMasterEvidenceID", "Source master evidence ID is required.", request.derivativeID));
  if (request.sourceMaster.derivativeState !== "master") issues.push(issue("sourceMustBeMaster", "Derivative images must link back to master evidence.", request.derivativeID));
  if (!isRelativeSafePath(request.sourceMaster.relativePath)) issues.push(issue("unsafeMasterPath", "Source master path must be repository-relative and safe.", request.derivativeID));
  const outputRelativePath = normalizeRelativePathInput(request.outputRelativePath);
  if (!isRelativeSafePath(outputRelativePath)) issues.push(issue("unsafeOutputPath", "Output path must be repository-relative and safe.", request.derivativeID));
  if (normalizePathForComparison(outputRelativePath) === normalizePathForComparison(request.sourceMaster.relativePath)) {
    issues.push(issue("wouldOverwriteMaster", "Derivative output path must not overwrite the original master evidence.", request.derivativeID));
  }
  if (!supportedImageMimeTypes.has(request.exportFormat)) issues.push(issue("unsupportedExportFormat", "Derivative export format must be PNG, JPEG, or WebP.", request.derivativeID));
  if (!isValidDimensions(request.sourceMaster.dimensions)) issues.push(issue("invalidSourceDimensions", "Source image dimensions must be positive integers.", request.derivativeID));
  if (request.sourceMaster.sha256 !== null && !/^[a-f0-9]{64}$/.test(request.sourceMaster.sha256)) {
    issues.push(issue("invalidMasterChecksum", "Source master checksum must be lowercase SHA-256 when recorded.", request.derivativeID));
  }
  validateCropRect(request.transform.crop, "crop", issues, request.derivativeID);
  validateCropRect(request.transform.faceRegionAlignmentGuide.region, "faceRegion", issues, request.derivativeID);
  if (!Number.isFinite(request.transform.rotationDegrees) || Math.abs(request.transform.rotationDegrees) > 45) {
    issues.push(issue("invalidRotation", "Rotation correction must be between -45 and 45 degrees.", request.derivativeID));
  }
  if (request.transform.aspectRatio.mode === "fixed" && (!isPositiveNumber(request.transform.aspectRatio.width) || !isPositiveNumber(request.transform.aspectRatio.height))) {
    issues.push(issue("invalidAspectRatio", "Fixed aspect ratio requires positive width and height values.", request.derivativeID));
  }
  for (const guide of request.transform.framingGuides) {
    if (!allowedFramingGuides.has(guide)) issues.push(issue("invalidFramingGuide", `Unsupported framing guide: ${guide}.`, request.derivativeID));
  }
  if (!request.transform.preservesDepictedOption) {
    issues.push(issue("optionChangingEdit", "Derivative transforms must preserve the depicted game option.", request.derivativeID));
  }
  if (request.transform.prohibitedOperations.length > 0) {
    issues.push(issue("prohibitedVisualModification", "Beauty filters, generative edits, geometry warping, option-changing edits, and color restyles are prohibited.", request.derivativeID));
  }
  if (!hasUsableText(request.operatorID)) issues.push(issue("missingOperator", "Operator ID is required.", request.derivativeID));
  if (!hasUsableText(request.notes)) issues.push(issue("missingNotes", "Derivative notes are required.", request.derivativeID));
  if (!isISODate(request.exportedAt)) issues.push(issue("invalidTimestamp", "exportedAt must be an ISO timestamp.", request.derivativeID));
  return issues;
}

export function createImageDerivativeLocalStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): Phase0ImageDerivativeLocalStore {
  return {
    load() {
      const raw = storage.getItem(PHASE0_IMAGE_DERIVATIVE_STORAGE_KEY);
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed as Phase0ImageDerivativeRecord[] : [];
      } catch {
        return [];
      }
    },
    save(records) {
      storage.setItem(PHASE0_IMAGE_DERIVATIVE_STORAGE_KEY, JSON.stringify(records));
    },
    clear() {
      storage.removeItem(PHASE0_IMAGE_DERIVATIVE_STORAGE_KEY);
    }
  };
}

function normalizeTransform(transform: Phase0ImageTransformationMetadata): Phase0ImageTransformationMetadata {
  return {
    ...transform,
    crop: normalizeCropRect(transform.crop),
    rotationDegrees: roundToThreeDecimals(transform.rotationDegrees),
    aspectRatio: {
      mode: transform.aspectRatio.mode,
      width: transform.aspectRatio.width,
      height: transform.aspectRatio.height
    },
    framingGuides: Array.from(new Set(transform.framingGuides)),
    faceRegionAlignmentGuide: {
      ...transform.faceRegionAlignmentGuide,
      region: normalizeCropRect(transform.faceRegionAlignmentGuide.region),
      notes: transform.faceRegionAlignmentGuide.notes.trim()
    },
    prohibitedOperations: [...transform.prohibitedOperations]
  };
}

function createWarnings(request: Phase0ImageDerivativeRequest) {
  const warnings: Phase0ImageDerivativeIssue[] = [];
  if (Math.abs(request.transform.rotationDegrees) > 10) {
    warnings.push(issue("largeRotationCorrection", "Large rotation corrections may indicate the master should be recaptured instead.", request.derivativeID));
  }
  if (request.transform.faceRegionAlignmentGuide.enabled && !request.transform.faceRegionAlignmentGuide.operatorConfirmed) {
    warnings.push(issue("alignmentGuideUnconfirmed", "Face-region alignment guide should be operator-confirmed before publication review.", request.derivativeID));
  }
  return warnings;
}

function estimateOutputDimensions(sourceDimensions: Phase0ImageDimensions, transform: Phase0ImageTransformationMetadata): Phase0ImageDimensions {
  const crop = normalizeCropRect(transform.crop);
  const croppedWidth = Math.max(1, Math.round(sourceDimensions.width * crop.width));
  const croppedHeight = Math.max(1, Math.round(sourceDimensions.height * crop.height));
  const fixedWidth = transform.aspectRatio.width;
  const fixedHeight = transform.aspectRatio.height;
  if (transform.aspectRatio.mode !== "fixed" || !isPositiveNumber(fixedWidth) || !isPositiveNumber(fixedHeight)) {
    return { width: croppedWidth, height: croppedHeight };
  }
  const targetRatio = fixedWidth / fixedHeight;
  const croppedRatio = croppedWidth / croppedHeight;
  if (croppedRatio > targetRatio) {
    return { width: Math.max(1, Math.round(croppedHeight * targetRatio)), height: croppedHeight };
  }
  return { width: croppedWidth, height: Math.max(1, Math.round(croppedWidth / targetRatio)) };
}

function validateCropRect(rect: Phase0NormalizedCropRect, label: string, issues: Phase0ImageDerivativeIssue[], entityID: string) {
  if (rect.unit !== "normalized") {
    issues.push(issue("invalidCropUnit", `${label} must use normalized coordinates.`, entityID));
    return;
  }
  for (const [field, value] of Object.entries(rect) as Array<[keyof Phase0NormalizedCropRect, string | number]>) {
    if (field === "unit") continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push(issue("invalidCropValue", `${label}.${field} must be a finite number.`, entityID));
    }
  }
  if (rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0 || rect.x + rect.width > 1 || rect.y + rect.height > 1) {
    issues.push(issue("cropOutOfBounds", `${label} must stay within the source image bounds.`, entityID));
  }
}

function normalizeCropRect(rect: Phase0NormalizedCropRect): Phase0NormalizedCropRect {
  return {
    unit: "normalized",
    x: roundToThreeDecimals(rect.x),
    y: roundToThreeDecimals(rect.y),
    width: roundToThreeDecimals(rect.width),
    height: roundToThreeDecimals(rect.height)
  };
}

function normalizeRelativePathInput(value: string) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part.trim().length > 0 && part !== ".").join("/");
}

function normalizePathForComparison(value: string) {
  return normalizeRelativePathInput(value).toLowerCase();
}

function isRelativeSafePath(value: string) {
  return hasUsableText(value)
    && !value.startsWith("/")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    && value.split("/").every((part) => part.length > 0 && part !== ".." && !/[<>:"\\|?*\u0000-\u001f]/.test(part));
}

function isValidDimensions(dimensions: Phase0ImageDimensions) {
  return Number.isInteger(dimensions.width) && Number.isInteger(dimensions.height) && dimensions.width > 0 && dimensions.height > 0;
}

function isPositiveNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isISODate(value: string) {
  return value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}

function roundToThreeDecimals(value: number) {
  return Math.round(value * 1000) / 1000;
}

function issue(code: string, message: string, entityID?: string): Phase0ImageDerivativeIssue {
  return { code, message, entityID };
}
