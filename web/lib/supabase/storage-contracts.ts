export const supabaseStorageContractVersion = "supabase-storage-contract-v1";

export type SupabaseStorageBucketID = "catalog-source-videos" | "catalog-source-images" | "review-evidence" | "generated-match-assets";
export type SupabaseStorageAccess = "private_signed_url_only";

export interface SupabaseStorageBucketContract {
  bucketID: SupabaseStorageBucketID;
  access: SupabaseStorageAccess;
  purpose: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  publicUrlsAllowed: false;
  rawFaceMediaAllowed: boolean;
}

export interface SupabaseStorageObjectMetadata {
  objectPath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  uploadedBy: string;
  uploadedAt: string;
  sourceRecordID: string;
  evidenceType: "source_video" | "source_image" | "review_derivative" | "generated_match_asset";
  verificationStatus: string;
  accessClassification: "private_source" | "private_review" | "derived_review" | "public_release_metadata" | "test_only";
  retentionStatus: "active" | "pending_deletion" | "deleted" | "retired";
}

export const supabaseStorageBuckets: SupabaseStorageBucketContract[] = [
  {
    bucketID: "catalog-source-videos",
    access: "private_signed_url_only",
    purpose: "Private original source videos supplied for catalog evidence review.",
    maxSizeBytes: 5 * 1024 * 1024 * 1024,
    allowedMimeTypes: ["video/mp4", "video/quicktime"],
    publicUrlsAllowed: false,
    rawFaceMediaAllowed: false
  },
  {
    bucketID: "catalog-source-images",
    access: "private_signed_url_only",
    purpose: "Private original screenshots or still source evidence for catalog review.",
    maxSizeBytes: 100 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    publicUrlsAllowed: false,
    rawFaceMediaAllowed: false
  },
  {
    bucketID: "review-evidence",
    access: "private_signed_url_only",
    purpose: "Private derivative frames, contact sheets, and review images linked to source evidence.",
    maxSizeBytes: 250 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "application/json", "text/csv"],
    publicUrlsAllowed: false,
    rawFaceMediaAllowed: false
  },
  {
    bucketID: "generated-match-assets",
    access: "private_signed_url_only",
    purpose: "Future user-consented generated match assets. Raw face media remains excluded by default.",
    maxSizeBytes: 50 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "application/json"],
    publicUrlsAllowed: false,
    rawFaceMediaAllowed: false
  }
];

export interface StorageValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateStorageObjectMetadata(bucketID: SupabaseStorageBucketID, metadata: SupabaseStorageObjectMetadata): StorageValidationResult {
  const bucket = supabaseStorageBuckets.find((item) => item.bucketID === bucketID);
  const errors: string[] = [];
  if (!bucket) errors.push(`Unknown bucket: ${bucketID}`);
  if (!metadata.objectPath || metadata.objectPath.startsWith("/") || metadata.objectPath.includes("..")) {
    errors.push("Object path must be relative and must not contain path traversal.");
  }
  if (!/^[a-f0-9]{64}$/i.test(metadata.sha256)) errors.push("SHA-256 must be a 64-character hex digest.");
  if (metadata.sizeBytes <= 0) errors.push("File size must be positive.");
  if (bucket && !bucket.allowedMimeTypes.includes(metadata.mimeType)) errors.push(`MIME type ${metadata.mimeType} is not allowed for ${bucketID}.`);
  if (/data:image|blob:|base64/i.test(JSON.stringify(metadata))) errors.push("Storage metadata must not contain raw image bytes or browser object URLs.");
  return { ok: errors.length === 0, errors };
}

export interface SignedUrlRequestContract {
  bucketID: SupabaseStorageBucketID;
  objectPath: string;
  requesterRole: "owner_admin" | "catalog_reviewer" | "second_verifier" | "read_only_reviewer" | "trusted_server_process";
  expiresInSeconds: number;
  reason: string;
}

export function validateSignedUrlRequest(request: SignedUrlRequestContract): StorageValidationResult {
  const errors: string[] = [];
  if (!supabaseStorageBuckets.some((bucket) => bucket.bucketID === request.bucketID)) errors.push(`Unknown bucket: ${request.bucketID}`);
  if (!request.objectPath || request.objectPath.startsWith("/") || request.objectPath.includes("..")) errors.push("Signed URL object path must be portable and relative.");
  if (request.expiresInSeconds < 60 || request.expiresInSeconds > 3600) errors.push("Signed URLs must expire between 60 and 3600 seconds.");
  if (!request.reason.trim()) errors.push("Signed URL reason is required for audit traceability.");
  return { ok: errors.length === 0, errors };
}
