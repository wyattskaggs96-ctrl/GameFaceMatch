import type { CapturedAngle, CapturedAngleID, CaptureSource, TemporaryImageReference } from "@/types/domain";
import { isSafeUploadFileName } from "@/lib/security/security-hardening";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const heicTypes = new Set(["image/heic", "image/heif"]);
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const heicExtensions = [".heic", ".heif"];
const maxFileSizeBytes = 12 * 1024 * 1024;
const minDimension = 480;
const maxAnalysisDimension = 1600;

export interface ImageMetadataInput {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  originalFileSizeBytes?: number;
  processingNotes?: string[];
  wasDownscaled?: boolean;
  source?: CaptureSource;
  associatedAngleID?: CapturedAngleID;
  objectUrl?: string;
  createdAt?: string;
  signature?: string;
}

export function validateImageMetadata(input: ImageMetadataInput, existingAngles: CapturedAngle[] = []) {
  const errors: string[] = [];
  if (isHeicOrHeif(input.fileName, input.fileType)) {
    errors.push("HEIC/HEIF images are not supported in this web MVP. Export or upload JPEG, PNG, or WebP instead.");
  }
  if (!allowedTypes.has(input.fileType)) {
    errors.push("Use a JPEG, PNG, or WebP image.");
  }
  if (!hasAllowedImageExtension(input.fileName)) {
    errors.push("Use a file ending in .jpg, .jpeg, .png, or .webp.");
  }
  if (!isSafeUploadFileName(input.fileName, { allowedExtensions })) {
    errors.push("Use a simple image filename without folders, control characters, or unsafe path characters.");
  }
  if (input.fileSizeBytes <= 0) {
    errors.push("The image file is empty or unreadable.");
  }
  if (input.fileSizeBytes > maxFileSizeBytes) {
    errors.push("Use an image smaller than 12 MB.");
  }
  if (input.width < minDimension || input.height < minDimension) {
    errors.push("Use an image at least 480 pixels wide and tall.");
  }
  if (!Number.isFinite(input.width) || !Number.isFinite(input.height)) {
    errors.push("The image dimensions could not be read.");
  }

  const orientation = getImageOrientation(input.width, input.height);
  const signature = input.signature ?? createImageSignature(input);
  const duplicateAngle = existingAngles.find((angle) => angle.image?.signature === signature);
  if (duplicateAngle) {
    errors.push(`This image appears to duplicate ${duplicateAngle.label}.`);
  }

  return {
    errors,
    signature,
    orientation
  };
}

export function hasAllowedImageExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  return allowedExtensions.some((extension) => normalizedName.endsWith(extension));
}

export function createTemporaryImageReference(input: ImageMetadataInput, signature: string): TemporaryImageReference {
  if (!input.associatedAngleID) {
    throw new Error("Temporary image references must be associated with a required capture angle.");
  }
  return {
    objectUrl: input.objectUrl ?? "",
    fileName: input.fileName,
    fileType: input.fileType,
    fileSizeBytes: input.fileSizeBytes,
    width: input.width,
    height: input.height,
    originalWidth: input.originalWidth,
    originalHeight: input.originalHeight,
    originalFileSizeBytes: input.originalFileSizeBytes,
    processingNotes: input.processingNotes,
    wasDownscaled: input.wasDownscaled,
    signature,
    source: input.source ?? "upload",
    orientation: getImageOrientation(input.width, input.height),
    associatedAngleID: input.associatedAngleID,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function createImageSignature(input: ImageMetadataInput): string {
  return `${input.fileName}:${input.fileType}:${input.fileSizeBytes}:${input.width}x${input.height}`;
}

export function isHeicOrHeif(fileName: string, fileType: string) {
  const normalizedType = fileType.trim().toLowerCase();
  const normalizedName = fileName.trim().toLowerCase();
  return heicTypes.has(normalizedType) || heicExtensions.some((extension) => normalizedName.endsWith(extension));
}

export function shouldDownscaleImage(width: number, height: number, maxDimension = maxAnalysisDimension) {
  return Math.max(width, height) > maxDimension;
}

export function getDownscaledDimensions(width: number, height: number, maxDimension = maxAnalysisDimension) {
  if (!shouldDownscaleImage(width, height, maxDimension)) {
    return { width, height, scale: 1 };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale
  };
}

export async function prepareImageForAnalysis(input: {
  file: File;
  objectUrl: string;
  imageElement: HTMLImageElement;
  maxDimension?: number;
}): Promise<{
  file: File;
  objectUrl: string;
  imageElement: HTMLImageElement;
  originalObjectUrl: string | null;
  originalWidth: number;
  originalHeight: number;
  originalFileSizeBytes: number;
  wasDownscaled: boolean;
  processingNotes: string[];
}> {
  const originalWidth = input.imageElement.naturalWidth;
  const originalHeight = input.imageElement.naturalHeight;
  const originalFileSizeBytes = input.file.size;
  const nextDimensions = getDownscaledDimensions(originalWidth, originalHeight, input.maxDimension);
  if (nextDimensions.scale === 1) {
    return {
      file: input.file,
      objectUrl: input.objectUrl,
      imageElement: input.imageElement,
      originalObjectUrl: null,
      originalWidth,
      originalHeight,
      originalFileSizeBytes,
      wasDownscaled: false,
      processingNotes: ["Browser decoded image dimensions after EXIF orientation where supported."]
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = nextDimensions.width;
  canvas.height = nextDimensions.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return {
      file: input.file,
      objectUrl: input.objectUrl,
      imageElement: input.imageElement,
      originalObjectUrl: null,
      originalWidth,
      originalHeight,
      originalFileSizeBytes,
      wasDownscaled: false,
      processingNotes: ["Large image downscaling was skipped because canvas was unavailable."]
    };
  }

  context.drawImage(input.imageElement, 0, 0, nextDimensions.width, nextDimensions.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) {
    return {
      file: input.file,
      objectUrl: input.objectUrl,
      imageElement: input.imageElement,
      originalObjectUrl: null,
      originalWidth,
      originalHeight,
      originalFileSizeBytes,
      wasDownscaled: false,
      processingNotes: ["Large image downscaling was skipped because the browser could not create a JPEG."]
    };
  }

  const file = new File([blob], replaceImageExtension(input.file.name), { type: "image/jpeg" });
  const objectUrl = URL.createObjectURL(file);
  const imageElement = await readImageElement(objectUrl);
  return {
    file,
    objectUrl,
    imageElement,
    originalObjectUrl: input.objectUrl,
    originalWidth,
    originalHeight,
    originalFileSizeBytes,
    wasDownscaled: true,
    processingNotes: [
      `Large image was downscaled from ${originalWidth}x${originalHeight} to ${nextDimensions.width}x${nextDimensions.height} before analysis.`,
      "Browser decoded image dimensions after EXIF orientation where supported."
    ]
  };
}

export async function createBasicDuplicateSignature(file: Blob & { name?: string; type?: string; size: number }) {
  const buffer = await file.arrayBuffer();
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
    return `sha256:${toHex(new Uint8Array(digest))}`;
  }
  return `basic:${createFallbackByteHash(new Uint8Array(buffer))}:${file.size}:${file.type ?? ""}:${file.name ?? ""}`;
}

export async function validateImageFile(
  file: Blob & { name?: string; type?: string; size: number },
  dimensions: { width: number; height: number },
  existingAngles: CapturedAngle[],
  associatedAngleID: CapturedAngleID,
  source: CaptureSource,
  objectUrl: string
) {
  const signature = await createBasicDuplicateSignature(file);
  return validateImageMetadata(
    {
      fileName: file.name ?? `${associatedAngleID}.jpg`,
      fileType: file.type,
      fileSizeBytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
      associatedAngleID,
      source,
      objectUrl,
      signature
    },
    existingAngles
  );
}

function getImageOrientation(width: number, height: number) {
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

function replaceImageExtension(fileName: string) {
  const trimmed = fileName.trim();
  const baseName = trimmed.replace(/\.[^.]+$/, "");
  return `${baseName || "capture"}-analysis.jpg`;
}

function readImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = objectUrl;
  });
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createFallbackByteHash(bytes: Uint8Array) {
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
