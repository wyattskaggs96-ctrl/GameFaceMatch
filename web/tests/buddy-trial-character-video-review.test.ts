import { describe, expect, it } from "vitest";
import {
  CHARACTER_VIDEO_MAX_SIZE_BYTES,
  confirmManualCharacterVideoSelection,
  createCharacterVideoReviewResult,
  createPersistableCharacterVideoReview,
  validateCharacterVideoMetadata,
  type CharacterVideoFrameCandidate,
  type CharacterVideoMetadata
} from "@/lib/buddy-trial/character-video-review";

const validMetadata: CharacterVideoMetadata = {
  fileName: "buddy-tv-character-sweep.mp4",
  fileType: "video/mp4",
  fileSizeBytes: 12_000_000,
  durationSeconds: 12,
  width: 1280,
  height: 720,
  source: "upload"
};

describe("Buddy Trial character video review", () => {
  it("accepts iPhone, TV/monitor, and console-style video metadata with notes", () => {
    expect(validateCharacterVideoMetadata(validMetadata)).toMatchObject({
      status: "usable_with_notes",
      errors: [],
      warnings: ["Videos filmed from a TV or monitor are accepted when the character face is visible and sharp."]
    });

    const review = createCharacterVideoReviewResult({ metadata: validMetadata });
    expect(review.status).toBe("manual_selection_required");
    expect(review.candidateFrames.map((frame) => frame.expectedView)).toEqual([
      "front",
      "leftThreeQuarter",
      "leftProfile",
      "rightThreeQuarter",
      "rightProfile"
    ]);
    expect(review.missingRequiredViews).toEqual([]);
    expect(review.retention).toMatchObject({
      rawVideoPersisted: false,
      temporaryMediaRetention: "temporary_processing_only"
    });
  });

  it("blocks unsupported, corrupt, too short, too large, and undersized videos with retake guidance", () => {
    const blocked = validateCharacterVideoMetadata({
      fileName: "bad.txt",
      fileType: "text/plain",
      fileSizeBytes: CHARACTER_VIDEO_MAX_SIZE_BYTES + 1,
      durationSeconds: 1,
      width: 120,
      height: 120,
      source: "upload"
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.errors).toEqual([
      "Use an MP4, MOV, M4V, or WebM video.",
      "Use a shorter video under 250 MB.",
      "Record at least 4 seconds so the front, left, and right views can be reviewed.",
      "Use a video with at least 240px height and width."
    ]);
    expect(blocked.retakeInstructions).toContain("Start facing forward, rotate slowly left, return to center, rotate slowly right, and return to center.");
  });

  it("lets the tester confirm uncertain automatic frames without retaining thumbnails or raw video", () => {
    const review = createCharacterVideoReviewResult({
      metadata: validMetadata,
      candidateFrames: usableCandidates()
    });
    const confirmed = confirmManualCharacterVideoSelection(review, {
      front: "front-1",
      leftThreeQuarter: "left-1",
      rightThreeQuarter: "right-1"
    });
    const persisted = createPersistableCharacterVideoReview(confirmed);

    expect(confirmed.status).toBe("usable");
    expect(confirmed.manualSelectionRequired).toBe(false);
    expect(confirmed.standardizedViews.map((view) => view.viewID)).toEqual(["front", "leftThreeQuarter", "rightThreeQuarter"]);
    expect(persisted.candidateFrames).toEqual([]);
    expect(persisted.standardizedViews.every((view) => view.thumbnailRetained === false)).toBe(true);
    expect(JSON.stringify(persisted)).not.toMatch(/blob:|data:video|data:image|base64/i);
  });

  it("keeps missing required views blocked after manual selection", () => {
    const review = createCharacterVideoReviewResult({
      metadata: validMetadata,
      candidateFrames: usableCandidates().filter((frame) => frame.expectedView !== "rightThreeQuarter")
    });
    const confirmed = confirmManualCharacterVideoSelection(review, {
      front: "front-1",
      leftThreeQuarter: "left-1"
    });

    expect(confirmed.status).toBe("blocked");
    expect(confirmed.missingRequiredViews).toEqual(["rightThreeQuarter"]);
  });
});

function usableCandidates(): CharacterVideoFrameCandidate[] {
  return [
    candidate("front-1", "front", 1.2),
    candidate("left-1", "leftThreeQuarter", 3.8),
    candidate("right-1", "rightThreeQuarter", 8.1)
  ];
}

function candidate(frameID: string, expectedView: CharacterVideoFrameCandidate["expectedView"], timestampSeconds: number): CharacterVideoFrameCandidate {
  return {
    frameID,
    expectedView,
    timestampSeconds,
    quality: {
      faceVisibility: "usable",
      blur: "low",
      screenGlare: "none",
      obstruction: "none",
      frameSize: "usable",
      pose: "usable",
      duplicateRisk: "low"
    }
  };
}
