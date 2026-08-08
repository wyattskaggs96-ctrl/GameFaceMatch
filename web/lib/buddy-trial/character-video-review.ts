export const CHARACTER_VIDEO_REVIEW_SCHEMA_VERSION = "buddy-trial-character-video-review-v1";
export const CHARACTER_VIDEO_MAX_SIZE_BYTES = 250 * 1024 * 1024;
export const CHARACTER_VIDEO_MIN_DURATION_SECONDS = 4;
export const CHARACTER_VIDEO_MAX_DURATION_SECONDS = 45;

export const CHARACTER_VIDEO_ACCEPTED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/mov"
] as const;

export const CHARACTER_VIDEO_REQUIRED_VIEWS = ["front", "leftThreeQuarter", "rightThreeQuarter"] as const;
export const CHARACTER_VIDEO_OPTIONAL_VIEWS = ["leftProfile", "rightProfile"] as const;
export const CHARACTER_VIDEO_ALL_VIEWS = [...CHARACTER_VIDEO_REQUIRED_VIEWS, ...CHARACTER_VIDEO_OPTIONAL_VIEWS] as const;

export type CharacterVideoAcceptedMimeType = (typeof CHARACTER_VIDEO_ACCEPTED_MIME_TYPES)[number];
export type CharacterVideoViewID = (typeof CHARACTER_VIDEO_ALL_VIEWS)[number];
export type CharacterVideoSource = "upload" | "recording" | "fixture";
export type CharacterVideoProcessingStatus = "not_started" | "recording" | "processing" | "usable" | "manual_selection_required" | "blocked";
export type CharacterVideoQualityStatus = "usable" | "usable_with_notes" | "blocked";

export interface CharacterVideoMetadata {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  source: CharacterVideoSource;
}

export interface CharacterVideoValidationResult {
  status: CharacterVideoQualityStatus;
  errors: string[];
  warnings: string[];
  retakeInstructions: string[];
}

export interface CharacterVideoFrameCandidate {
  frameID: string;
  timestampSeconds: number;
  expectedView: CharacterVideoViewID;
  quality: {
    faceVisibility: "usable" | "uncertain" | "blocked";
    blur: "low" | "medium" | "high" | "unknown";
    screenGlare: "none" | "minor" | "major" | "unknown";
    obstruction: "none" | "minor" | "major" | "unknown";
    frameSize: "usable" | "small" | "unknown";
    pose: "usable" | "uncertain";
    duplicateRisk: "low" | "medium" | "high";
  };
  thumbnailUrl?: string;
}

export interface StandardizedCharacterVideoView {
  viewID: CharacterVideoViewID;
  selectedFrameID: string;
  timestampSeconds: number;
  qualityStatus: CharacterVideoQualityStatus;
  issues: string[];
  thumbnailRetained: false;
}

export interface CharacterVideoReviewResult {
  schemaVersion: typeof CHARACTER_VIDEO_REVIEW_SCHEMA_VERSION;
  iteration: 1 | 2;
  status: CharacterVideoProcessingStatus;
  metadata: CharacterVideoMetadata;
  validation: CharacterVideoValidationResult;
  candidateFrames: CharacterVideoFrameCandidate[];
  standardizedViews: StandardizedCharacterVideoView[];
  missingRequiredViews: CharacterVideoViewID[];
  manualSelectionRequired: boolean;
  processingSummary: string;
  retention: {
    rawVideoPersisted: false;
    temporaryMediaRetention: "temporary_processing_only";
    objectUrlsRevokedAfterProcessing: boolean;
  };
}

export function validateCharacterVideoMetadata(metadata: CharacterVideoMetadata): CharacterVideoValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const retakeInstructions = [
    "Open your created player with helmet and face accessories off.",
    "Start facing forward, rotate slowly left, return to center, rotate slowly right, and return to center.",
    "Keep the character face large, sharp, and evenly lit in the frame."
  ];
  const fileType = normalizeVideoMimeType(metadata.fileType, metadata.fileName);

  if (!CHARACTER_VIDEO_ACCEPTED_MIME_TYPES.includes(fileType as CharacterVideoAcceptedMimeType)) {
    errors.push("Use an MP4, MOV, M4V, or WebM video.");
  }
  if (metadata.fileSizeBytes <= 0) errors.push("The selected video is empty or could not be read.");
  if (metadata.fileSizeBytes > CHARACTER_VIDEO_MAX_SIZE_BYTES) {
    errors.push("Use a shorter video under 250 MB.");
  }
  if (metadata.durationSeconds === null || !Number.isFinite(metadata.durationSeconds)) {
    errors.push("The browser could not read the video duration. Choose another file or record again.");
  } else {
    if (metadata.durationSeconds < CHARACTER_VIDEO_MIN_DURATION_SECONDS) {
      errors.push("Record at least 4 seconds so the front, left, and right views can be reviewed.");
    }
    if (metadata.durationSeconds > CHARACTER_VIDEO_MAX_DURATION_SECONDS) {
      errors.push("Keep the video under 45 seconds.");
    }
  }
  if ((metadata.width ?? 0) < 240 || (metadata.height ?? 0) < 240) {
    errors.push("Use a video with at least 240px height and width.");
  }
  if (metadata.source === "recording" && fileType !== "video/webm") {
    warnings.push("Browser recording formats vary by device; upload fallback remains available if this recording cannot be decoded.");
  }
  if (metadata.source === "upload") {
    warnings.push("Videos filmed from a TV or monitor are accepted when the character face is visible and sharp.");
  }

  return {
    status: errors.length > 0 ? "blocked" : warnings.length > 0 ? "usable_with_notes" : "usable",
    errors,
    warnings,
    retakeInstructions
  };
}

export function buildDeterministicCharacterFrameCandidates(metadata: CharacterVideoMetadata): CharacterVideoFrameCandidate[] {
  return buildDeterministicCharacterFrameCandidatesForIteration(metadata, 1);
}

export function buildDeterministicCharacterFrameCandidatesForIteration(
  metadata: CharacterVideoMetadata,
  iteration: CharacterVideoReviewResult["iteration"]
): CharacterVideoFrameCandidate[] {
  const duration = Math.max(metadata.durationSeconds ?? 0, CHARACTER_VIDEO_MIN_DURATION_SECONDS);
  const frameSize = (metadata.width ?? 0) >= 360 && (metadata.height ?? 0) >= 360 ? "usable" : "small";
  const plan: Array<[CharacterVideoViewID, number]> = [
    ["front", 0.12],
    ["leftThreeQuarter", 0.32],
    ["leftProfile", 0.42],
    ["rightThreeQuarter", 0.68],
    ["rightProfile", 0.78]
  ];

  return plan.map(([expectedView, position], index) => ({
    frameID: `character-video-${iteration}-${expectedView}-${index + 1}`,
    timestampSeconds: Math.round(duration * position * 1000) / 1000,
    expectedView,
    quality: {
      faceVisibility: "uncertain",
      blur: "unknown",
      screenGlare: "unknown",
      obstruction: "unknown",
      frameSize,
      pose: "uncertain",
      duplicateRisk: "low"
    }
  }));
}

export function createCharacterVideoReviewResult(input: {
  metadata: CharacterVideoMetadata;
  iteration?: CharacterVideoReviewResult["iteration"];
  candidateFrames?: CharacterVideoFrameCandidate[];
  selectedFrameIDsByView?: Partial<Record<CharacterVideoViewID, string>>;
  objectUrlsRevokedAfterProcessing?: boolean;
}): CharacterVideoReviewResult {
  const validation = validateCharacterVideoMetadata(input.metadata);
  const iteration = input.iteration ?? 1;
  const candidateFrames = input.candidateFrames ?? buildDeterministicCharacterFrameCandidatesForIteration(input.metadata, iteration);
  const standardizedViews =
    validation.status === "blocked"
      ? []
      : selectStandardizedCharacterViews(candidateFrames, input.selectedFrameIDsByView);
  const missingRequiredViews = CHARACTER_VIDEO_REQUIRED_VIEWS.filter((viewID) => !standardizedViews.some((view) => view.viewID === viewID));
  const manualSelectionRequired =
    validation.status !== "blocked" &&
    (candidateFrames.some((frame) => frame.quality.faceVisibility === "uncertain" || frame.quality.pose === "uncertain" || frame.quality.blur === "unknown") ||
      missingRequiredViews.length > 0);
  const status: CharacterVideoProcessingStatus =
    validation.status === "blocked" ? "blocked" : missingRequiredViews.length > 0 ? "blocked" : manualSelectionRequired ? "manual_selection_required" : "usable";

  return {
    schemaVersion: CHARACTER_VIDEO_REVIEW_SCHEMA_VERSION,
    iteration,
    status,
    metadata: input.metadata,
    validation,
    candidateFrames,
    standardizedViews,
    missingRequiredViews,
    manualSelectionRequired,
    processingSummary: summaryFor(status, validation, missingRequiredViews),
    retention: {
      rawVideoPersisted: false,
      temporaryMediaRetention: "temporary_processing_only",
      objectUrlsRevokedAfterProcessing: input.objectUrlsRevokedAfterProcessing ?? false
    }
  };
}

export function selectStandardizedCharacterViews(
  candidates: CharacterVideoFrameCandidate[],
  selectedFrameIDsByView: Partial<Record<CharacterVideoViewID, string>> = {}
): StandardizedCharacterVideoView[] {
  return CHARACTER_VIDEO_ALL_VIEWS.flatMap((viewID) => {
    const selectedID = selectedFrameIDsByView[viewID];
    const frame =
      (selectedID ? candidates.find((candidate) => candidate.frameID === selectedID && candidate.expectedView === viewID) : null) ??
      candidates.find((candidate) => candidate.expectedView === viewID);
    if (!frame) return [];
    const issues = qualityIssues(frame);
    return [
      {
        viewID,
        selectedFrameID: frame.frameID,
        timestampSeconds: frame.timestampSeconds,
        qualityStatus: issues.length > 0 ? "usable_with_notes" : "usable",
        issues,
        thumbnailRetained: false
      }
    ];
  });
}

export function createPersistableCharacterVideoReview(
  review: CharacterVideoReviewResult
): Omit<CharacterVideoReviewResult, "candidateFrames"> & { candidateFrames: [] } {
  return {
    ...review,
    candidateFrames: [],
    standardizedViews: review.standardizedViews.map((view) => ({ ...view, thumbnailRetained: false })),
    retention: {
      rawVideoPersisted: false,
      temporaryMediaRetention: "temporary_processing_only",
      objectUrlsRevokedAfterProcessing: true
    }
  };
}

export function confirmManualCharacterVideoSelection(
  review: CharacterVideoReviewResult,
  selectedFrameIDsByView: Partial<Record<CharacterVideoViewID, string>>
): CharacterVideoReviewResult {
  const standardizedViews = selectStandardizedCharacterViews(review.candidateFrames, selectedFrameIDsByView);
  const missingRequiredViews = CHARACTER_VIDEO_REQUIRED_VIEWS.filter((viewID) => !standardizedViews.some((view) => view.viewID === viewID));
  const status: CharacterVideoProcessingStatus = missingRequiredViews.length > 0 ? "blocked" : "usable";
  return {
    ...review,
    status,
    standardizedViews,
    missingRequiredViews,
    manualSelectionRequired: false,
    processingSummary:
      status === "usable"
        ? "Standardized character views are ready for comparison."
        : `Missing required view(s): ${missingRequiredViews.join(", ")}.`
  };
}

export function normalizeVideoMimeType(fileType: string, fileName: string) {
  const type = fileType.trim().toLowerCase();
  if (type) return type;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  return lower.endsWith(".mp4") ? "video/mp4" : "application/octet-stream";
}

function qualityIssues(frame: CharacterVideoFrameCandidate) {
  const issues: string[] = [];
  if (frame.quality.faceVisibility !== "usable") issues.push("Tester should confirm the character face is clearly visible.");
  if (frame.quality.pose !== "usable") issues.push("Tester should confirm this frame matches the requested view.");
  if (frame.quality.blur === "high" || frame.quality.blur === "unknown") issues.push("Sharpness could not be fully verified automatically.");
  if (frame.quality.screenGlare === "major" || frame.quality.screenGlare === "unknown") issues.push("Screen glare could not be fully verified automatically.");
  if (frame.quality.obstruction === "major" || frame.quality.obstruction === "unknown") issues.push("Face obstruction could not be fully verified automatically.");
  if (frame.quality.frameSize !== "usable") issues.push("Character face may be too small in the frame.");
  if (frame.quality.duplicateRisk === "high") issues.push("This frame may duplicate another selected view.");
  return issues;
}

function summaryFor(status: CharacterVideoProcessingStatus, validation: CharacterVideoValidationResult, missingRequiredViews: CharacterVideoViewID[]) {
  if (validation.status === "blocked") return validation.errors.join(" ");
  if (missingRequiredViews.length > 0) return `Missing required view(s): ${missingRequiredViews.join(", ")}.`;
  if (status === "manual_selection_required") return "We found candidate frames. Please confirm the best front, left, and right views.";
  return "Standardized character views are ready for comparison.";
}
