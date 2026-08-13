import { createPrivateBetaGameResultUploadRecord, PRIVATE_BETA_GAME_RESULT_BUCKET_ID } from "./buddy-trial-supabase-persistence";

export const BUDDY_TRIAL_RESULT_PHOTO_FEEDBACK_VERSION = "buddy-trial-result-photo-feedback-v1";
export const BUDDY_TRIAL_RESULT_PHOTO_MAX_BYTES = 25 * 1024 * 1024;
export const BUDDY_TRIAL_RESULT_PHOTO_MIN_DIMENSION = 360;
export const BUDDY_TRIAL_RESULT_PHOTO_ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type BuddyTrialResultPhotoViewID = "front" | "leftThreeQuarter" | "rightThreeQuarter";
export type BuddyTrialOtherRecommendationAnswer = "yes" | "no" | "not_sure";

export interface BuddyTrialResultPhotoRecord {
  schemaVersion: typeof BUDDY_TRIAL_RESULT_PHOTO_FEEDBACK_VERSION;
  photoID: string;
  viewID: BuddyTrialResultPhotoViewID;
  label: string;
  required: boolean;
  originalFilename: string;
  mimeType: (typeof BUDDY_TRIAL_RESULT_PHOTO_ACCEPTED_MIME_TYPES)[number];
  sizeBytes: number;
  width: number;
  height: number;
  sha256: string;
  uploadedAt: string;
  storageBucket: typeof PRIVATE_BETA_GAME_RESULT_BUCKET_ID;
  objectPath: string;
  uploadStatus: "pending_private_storage" | "uploaded_private_storage" | "deleted";
  validationStatus: "usable" | "blocked";
  validationErrors: string[];
  guidanceWarnings: string[];
  rawFaceScanMedia: false;
}

export interface BuddyTrialResultRecommendationBinding {
  recommendationVersion: string;
  catalogVersionID: string | null;
  evidenceVersionID: string | null;
  selectedRecommendationRank: 1 | 2 | 3 | null;
  selectedRecommendationLabel: string | null;
}

export interface BuddyTrialResultFeedback {
  selectedRecommendationRank: 1 | 2 | 3 | null;
  resemblanceRating: 1 | 2 | 3 | 4 | 5 | null;
  otherTopThreeBetter: BuddyTrialOtherRecommendationAnswer | null;
  mostWrong: string | null;
  notes: string | null;
  changedSettingsManually: boolean | null;
  manualSettingChangeSummary: string | null;
  productImprovementOptIn: boolean;
  productImprovementConsentVersion: string | null;
  submittedAt: string | null;
}

export interface BuddyTrialResultPhotoFeedback {
  schemaVersion: typeof BUDDY_TRIAL_RESULT_PHOTO_FEEDBACK_VERSION;
  source: "owner_review_demo" | "beta_research" | "production";
  trialID: string;
  inviteID: string;
  sessionID: string;
  recommendationBinding: BuddyTrialResultRecommendationBinding;
  photos: BuddyTrialResultPhotoRecord[];
  feedback: BuddyTrialResultFeedback;
  refinementSignals: BuddyTrialExperimentalRefinementSignal[];
  retention: {
    rawFaceScanMediaStored: false;
    gameResultPhotoStorage: "private_beta_storage_only";
    uploadedPlayerPhotosTemporary: true;
  };
}

export interface BuddyTrialExperimentalRefinementSignal {
  schemaVersion: "buddy-trial-experimental-refinement-signal-v1";
  source: "owner_review_demo_fixture" | "beta_photo_feedback";
  modelVersion: string;
  createdAt: string;
  status: "not_calculated" | "experimental_signal_only";
  summary: string;
  warnings: string[];
}

export interface BuddyTrialResultPhotoInput {
  trialID: string;
  inviteID: string;
  viewID: BuddyTrialResultPhotoViewID;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sha256: string;
  uploadedAt: string;
}

export function createEmptyBuddyTrialResultPhotoFeedback(input: {
  trialID: string;
  inviteID: string;
  sessionID: string;
  source: BuddyTrialResultPhotoFeedback["source"];
  recommendationBinding: BuddyTrialResultRecommendationBinding;
}): BuddyTrialResultPhotoFeedback {
  return {
    schemaVersion: BUDDY_TRIAL_RESULT_PHOTO_FEEDBACK_VERSION,
    source: input.source,
    trialID: input.trialID,
    inviteID: input.inviteID,
    sessionID: input.sessionID,
    recommendationBinding: input.recommendationBinding,
    photos: [],
    feedback: createEmptyBuddyTrialResultFeedback(input.recommendationBinding.selectedRecommendationRank),
    refinementSignals: [createNoAutomaticRefinementSignal()],
    retention: {
      rawFaceScanMediaStored: false,
      gameResultPhotoStorage: "private_beta_storage_only",
      uploadedPlayerPhotosTemporary: true
    }
  };
}

export function createEmptyBuddyTrialResultFeedback(selectedRecommendationRank: 1 | 2 | 3 | null = null): BuddyTrialResultFeedback {
  return {
    selectedRecommendationRank,
    resemblanceRating: null,
    otherTopThreeBetter: null,
    mostWrong: null,
    notes: null,
    changedSettingsManually: null,
    manualSettingChangeSummary: null,
    productImprovementOptIn: false,
    productImprovementConsentVersion: null,
    submittedAt: null
  };
}

export function createBuddyTrialResultPhotoRecord(input: BuddyTrialResultPhotoInput): BuddyTrialResultPhotoRecord {
  const photoID = createBuddyTrialResultPhotoID(input);
  const mimeType = normalizePhotoMimeType(input.mimeType);
  const safeSha256ForPathMetadata = /^[a-f0-9]{64}$/i.test(input.sha256) ? input.sha256 : "0".repeat(64);
  const upload = createPrivateBetaGameResultUploadRecord({
    trialID: input.trialID,
    inviteID: input.inviteID,
    uploadID: photoID,
    originalFilename: input.originalFilename,
    mimeType: mimeType ?? "image/jpeg",
    sizeBytes: input.sizeBytes,
    sha256: safeSha256ForPathMetadata,
    uploadedAt: input.uploadedAt
  });
  const validation = validateBuddyTrialResultPhotoRecord({
    schemaVersion: BUDDY_TRIAL_RESULT_PHOTO_FEEDBACK_VERSION,
    photoID,
    viewID: input.viewID,
    label: getBuddyTrialResultPhotoViewLabel(input.viewID),
    required: input.viewID === "front",
    originalFilename: input.originalFilename,
    mimeType: mimeType ?? "image/jpeg",
    sizeBytes: input.sizeBytes,
    width: input.width,
    height: input.height,
    sha256: input.sha256,
    uploadedAt: input.uploadedAt,
    storageBucket: PRIVATE_BETA_GAME_RESULT_BUCKET_ID,
    objectPath: upload.objectPath,
    uploadStatus: "pending_private_storage",
    validationStatus: "usable",
    validationErrors: [],
    guidanceWarnings: [],
    rawFaceScanMedia: false
  });
  if (!mimeType) {
    validation.errors.push("Use a JPEG, PNG, or WebP image.");
  }
  return {
    ...validation.record,
    validationStatus: validation.errors.length ? "blocked" : "usable",
    validationErrors: validation.errors,
    guidanceWarnings: validation.warnings
  };
}

export function upsertBuddyTrialResultPhoto(
  feedback: BuddyTrialResultPhotoFeedback,
  photo: BuddyTrialResultPhotoRecord,
  now = new Date()
): BuddyTrialResultPhotoFeedback {
  const photos = feedback.photos.filter((item) => item.viewID !== photo.viewID);
  return {
    ...feedback,
    photos: [...photos, photo],
    feedback: {
      ...feedback.feedback,
      submittedAt: null
    },
    refinementSignals: [createNoAutomaticRefinementSignal(now)]
  };
}

export function removeBuddyTrialResultPhoto(
  feedback: BuddyTrialResultPhotoFeedback,
  viewID: BuddyTrialResultPhotoViewID,
  now = new Date()
): BuddyTrialResultPhotoFeedback {
  return {
    ...feedback,
    photos: feedback.photos.map((photo) => (photo.viewID === viewID ? { ...photo, uploadStatus: "deleted", validationStatus: "blocked", validationErrors: ["Photo deleted by tester."] } : photo)),
    feedback: {
      ...feedback.feedback,
      submittedAt: null
    },
    refinementSignals: [createNoAutomaticRefinementSignal(now)]
  };
}

export function submitBuddyTrialResultFeedback(
  photoFeedback: BuddyTrialResultPhotoFeedback,
  feedback: BuddyTrialResultFeedback,
  now = new Date()
): BuddyTrialResultPhotoFeedback {
  const next = {
    ...photoFeedback,
    feedback: {
      ...feedback,
      notes: scrubFeedbackText(feedback.notes),
      mostWrong: scrubFeedbackText(feedback.mostWrong),
      manualSettingChangeSummary: scrubFeedbackText(feedback.manualSettingChangeSummary),
      productImprovementConsentVersion: feedback.productImprovementOptIn ? feedback.productImprovementConsentVersion : null,
      submittedAt: now.toISOString()
    },
    refinementSignals: [createNoAutomaticRefinementSignal(now)]
  };
  const validation = validateBuddyTrialResultPhotoFeedback(next);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  return next;
}

export function validateBuddyTrialResultPhotoFeedback(feedback: BuddyTrialResultPhotoFeedback): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (feedback.schemaVersion !== BUDDY_TRIAL_RESULT_PHOTO_FEEDBACK_VERSION) errors.push("Unexpected result-photo feedback schema version.");
  if (!feedback.trialID.startsWith("btp_")) errors.push("Photo feedback must be linked to a pseudonymous private-beta trial ID.");
  if (!feedback.inviteID.trim()) errors.push("Invite ID is required.");
  if (!feedback.sessionID.trim()) errors.push("Session ID is required.");
  if (feedback.retention.rawFaceScanMediaStored !== false) errors.push("Raw face scan media must not be stored in result-photo feedback.");
  const activePhotos = feedback.photos.filter((photo) => photo.uploadStatus !== "deleted");
  if (!activePhotos.some((photo) => photo.viewID === "front" && photo.validationStatus === "usable")) {
    errors.push("One usable front-view College Football 27 player image is required.");
  }
  if (activePhotos.length > 3) errors.push("At most three result photos are allowed.");
  for (const photo of feedback.photos) {
    errors.push(...validateBuddyTrialResultPhotoRecord(photo).errors.map((error) => `${photo.viewID}: ${error}`));
  }
  if (![1, 2, 3].includes(feedback.feedback.selectedRecommendationRank ?? 0)) errors.push("Tester must choose which top-three recommendation they built.");
  if (![1, 2, 3, 4, 5].includes(feedback.feedback.resemblanceRating ?? 0)) errors.push("Tester must rate resemblance from 1 to 5.");
  if (!feedback.feedback.otherTopThreeBetter) errors.push("Tester must answer whether another top-three option looked better.");
  if (!feedback.feedback.mostWrong?.trim()) errors.push("Tester must say what looks most wrong, even if the answer is 'nothing obvious'.");
  if (feedback.feedback.changedSettingsManually === null) errors.push("Tester must say whether they changed any recommended setting manually.");
  if (feedback.feedback.changedSettingsManually && !feedback.feedback.manualSettingChangeSummary?.trim()) {
    errors.push("Manual setting changes require a short description.");
  }
  if (feedback.feedback.productImprovementOptIn && !feedback.feedback.productImprovementConsentVersion) {
    errors.push("Product-improvement opt-in requires a consent version.");
  }
  if (containsRawMediaReference(feedback)) errors.push("Result-photo feedback must not contain raw media bytes or browser object URLs.");
  return { ok: errors.length === 0, errors };
}

export function validateBuddyTrialResultPhotoRecord(record: BuddyTrialResultPhotoRecord): { record: BuddyTrialResultPhotoRecord; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (record.schemaVersion !== BUDDY_TRIAL_RESULT_PHOTO_FEEDBACK_VERSION) errors.push("Unexpected result-photo schema version.");
  if (!record.photoID.startsWith("btu_")) errors.push("Photo upload ID must use the private-beta upload prefix.");
  if (!["front", "leftThreeQuarter", "rightThreeQuarter"].includes(record.viewID)) errors.push("Unsupported result-photo view.");
  if (!BUDDY_TRIAL_RESULT_PHOTO_ACCEPTED_MIME_TYPES.includes(record.mimeType)) errors.push("Use a JPEG, PNG, or WebP image.");
  if (record.sizeBytes <= 0) errors.push("The image file is empty or unreadable.");
  if (record.sizeBytes > BUDDY_TRIAL_RESULT_PHOTO_MAX_BYTES) errors.push("Use an image smaller than 25 MB.");
  if (!Number.isFinite(record.width) || !Number.isFinite(record.height)) errors.push("The image dimensions could not be read.");
  if (record.width < BUDDY_TRIAL_RESULT_PHOTO_MIN_DIMENSION || record.height < BUDDY_TRIAL_RESULT_PHOTO_MIN_DIMENSION) {
    errors.push("Use a clearer image at least 360 pixels wide and tall.");
  }
  if (!/^[a-f0-9]{64}$/i.test(record.sha256)) errors.push("Image SHA-256 must be a 64-character hex digest.");
  if (record.storageBucket !== PRIVATE_BETA_GAME_RESULT_BUCKET_ID) errors.push("Result photos must use the private beta game-result storage bucket.");
  if (record.rawFaceScanMedia !== false) errors.push("Result photos must not be treated as raw face scan media.");
  if (record.width < 720 || record.height < 720) warnings.push("A larger image will make owner review easier.");
  if (record.width > record.height && record.viewID === "front") warnings.push("Portrait or centered square framing is preferred for the front view.");
  return { record, errors, warnings };
}

export function getBuddyTrialResultPhotoViewLabel(viewID: BuddyTrialResultPhotoViewID) {
  if (viewID === "leftThreeQuarter") return "Left / three-quarter";
  if (viewID === "rightThreeQuarter") return "Right / three-quarter";
  return "Front view";
}

function createBuddyTrialResultPhotoID(input: Pick<BuddyTrialResultPhotoInput, "viewID" | "uploadedAt">) {
  return `btu_${input.viewID}_${new Date(input.uploadedAt).getTime()}`;
}

function normalizePhotoMimeType(mimeType: string): BuddyTrialResultPhotoRecord["mimeType"] | null {
  if (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp") return mimeType;
  return null;
}

function createNoAutomaticRefinementSignal(now = new Date()): BuddyTrialExperimentalRefinementSignal {
  return {
    schemaVersion: "buddy-trial-experimental-refinement-signal-v1",
    source: "beta_photo_feedback",
    modelVersion: "manual-owner-review-v1",
    createdAt: now.toISOString(),
    status: "not_calculated",
    summary: "Automated refinement is not treated as production truth from result photos in this beta flow.",
    warnings: ["Photos and tester feedback are preserved as beta research signals for owner review."]
  };
}

function scrubFeedbackText(value: string | null) {
  if (!value) return null;
  return value.replace(/(?:data:image|data:video|blob:|objectUrl|base64)[^\s]*/gi, "[redacted-media-reference]").trim() || null;
}

function containsRawMediaReference(value: unknown) {
  return /(?:data:image|data:video|blob:|objectUrl|base64|rawFaceImage|rawFaceVideo|faceEmbedding|landmarks)/i.test(JSON.stringify(value));
}
