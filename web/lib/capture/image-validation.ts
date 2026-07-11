import type { CapturedAngle, CapturedAngleID, CaptureSource, TemporaryImageReference } from "@/types/domain";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const maxFileSizeBytes = 12 * 1024 * 1024;
const minDimension = 480;

export interface ImageMetadataInput {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  source?: CaptureSource;
  associatedAngleID?: CapturedAngleID;
  objectUrl?: string;
  createdAt?: string;
  signature?: string;
}

export function validateImageMetadata(input: ImageMetadataInput, existingAngles: CapturedAngle[] = []) {
  const errors: string[] = [];
  if (!allowedTypes.has(input.fileType)) {
    errors.push("Use a JPEG, PNG, or WebP image.");
  }
  if (!hasAllowedImageExtension(input.fileName)) {
    errors.push("Use a file ending in .jpg, .jpeg, .png, or .webp.");
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
