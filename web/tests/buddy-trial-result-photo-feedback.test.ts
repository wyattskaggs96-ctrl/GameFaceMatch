import { describe, expect, it } from "vitest";
import {
  BUDDY_TRIAL_RESULT_PHOTO_MAX_BYTES,
  createBuddyTrialResultPhotoRecord,
  createEmptyBuddyTrialResultPhotoFeedback,
  removeBuddyTrialResultPhoto,
  submitBuddyTrialResultFeedback,
  upsertBuddyTrialResultPhoto,
  validateBuddyTrialResultPhotoFeedback
} from "@/lib/buddy-trial/buddy-trial-result-photo-feedback";

const baseBinding = {
  recommendationVersion: "owner-review-demo-matching-v1",
  catalogVersionID: "owner-review-demo-catalog-v1",
  evidenceVersionID: null,
  selectedRecommendationRank: 1 as const,
  selectedRecommendationLabel: "Demo Face Alpha"
};

const baseInput = {
  trialID: "btp_b9c7a1f0_1234",
  inviteID: "btv1_8f4c2a7d9e6b41c0a3f5d8e2b9c7a1f0",
  viewID: "front" as const,
  originalFilename: "cf27-front.png",
  mimeType: "image/png",
  sizeBytes: 1_200_000,
  width: 1280,
  height: 1600,
  sha256: "a".repeat(64),
  uploadedAt: "2026-08-13T12:00:00.000Z"
};

function createDraft() {
  return createEmptyBuddyTrialResultPhotoFeedback({
    trialID: baseInput.trialID,
    inviteID: baseInput.inviteID,
    sessionID: "bt_session_test_1234",
    source: "owner_review_demo",
    recommendationBinding: baseBinding
  });
}

describe("Buddy Trial result-photo feedback contract", () => {
  it("binds a usable game-result photo to private beta storage metadata", () => {
    const record = createBuddyTrialResultPhotoRecord(baseInput);

    expect(record).toMatchObject({
      viewID: "front",
      storageBucket: "private-beta-game-results",
      uploadStatus: "pending_private_storage",
      validationStatus: "usable",
      rawFaceScanMedia: false
    });
    expect(record.objectPath).toBe(`private-beta/${baseInput.trialID}/game-results/${record.photoID}.png`);
    expect(record.validationErrors).toEqual([]);
  });

  it("blocks invalid file type, oversize, corrupt digest, or unclear dimensions", () => {
    expect(createBuddyTrialResultPhotoRecord({ ...baseInput, mimeType: "image/gif" }).validationErrors).toContain("Use a JPEG, PNG, or WebP image.");
    expect(createBuddyTrialResultPhotoRecord({ ...baseInput, sizeBytes: BUDDY_TRIAL_RESULT_PHOTO_MAX_BYTES + 1 }).validationErrors).toContain("Use an image smaller than 25 MB.");
    expect(createBuddyTrialResultPhotoRecord({ ...baseInput, width: 120, height: 120 }).validationErrors).toContain("Use a clearer image at least 360 pixels wide and tall.");
    expect(createBuddyTrialResultPhotoRecord({ ...baseInput, sha256: "not-a-sha" }).validationErrors).toContain("Image SHA-256 must be a 64-character hex digest.");
  });

  it("requires one useful front view and complete tester feedback before submit", () => {
    const draft = createDraft();
    expect(validateBuddyTrialResultPhotoFeedback(draft).errors).toContain("One usable front-view College Football 27 player image is required.");

    const withFront = upsertBuddyTrialResultPhoto(draft, createBuddyTrialResultPhotoRecord(baseInput), new Date("2026-08-13T12:01:00.000Z"));
    expect(validateBuddyTrialResultPhotoFeedback(withFront).errors).toContain("Tester must rate resemblance from 1 to 5.");

    const submitted = submitBuddyTrialResultFeedback(
      withFront,
      {
        ...withFront.feedback,
        resemblanceRating: 4,
        otherTopThreeBetter: "no",
        mostWrong: "jaw is still a little wide",
        changedSettingsManually: false,
        productImprovementOptIn: true,
        productImprovementConsentVersion: "buddy-trial-consent-v1"
      },
      new Date("2026-08-13T12:02:00.000Z")
    );

    expect(submitted.feedback.submittedAt).toBe("2026-08-13T12:02:00.000Z");
    expect(validateBuddyTrialResultPhotoFeedback(submitted)).toEqual({ ok: true, errors: [] });
    expect(submitted.refinementSignals[0]).toMatchObject({
      status: "not_calculated",
      summary: "Automated refinement is not treated as production truth from result photos in this beta flow."
    });
  });

  it("stores optional left and right views but rejects more than three active photos", () => {
    const draft = createDraft();
    const withPhotos = ["front", "leftThreeQuarter", "rightThreeQuarter"].reduce(
      (current, viewID, index) =>
        upsertBuddyTrialResultPhoto(
          current,
          createBuddyTrialResultPhotoRecord({
            ...baseInput,
            viewID: viewID as "front" | "leftThreeQuarter" | "rightThreeQuarter",
            originalFilename: `cf27-${viewID}.webp`,
            mimeType: "image/webp",
            uploadedAt: `2026-08-13T12:0${index}:00.000Z`
          })
        ),
      draft
    );

    expect(withPhotos.photos.filter((photo) => photo.uploadStatus !== "deleted")).toHaveLength(3);
    expect(validateBuddyTrialResultPhotoFeedback(withPhotos).errors).not.toContain("At most three result photos are allowed.");
  });

  it("marks deleted photos and clears submitted state", () => {
    const withFront = upsertBuddyTrialResultPhoto(createDraft(), createBuddyTrialResultPhotoRecord(baseInput));
    const deleted = removeBuddyTrialResultPhoto(
      {
        ...withFront,
        feedback: {
          ...withFront.feedback,
          submittedAt: "2026-08-13T12:02:00.000Z"
        }
      },
      "front"
    );

    expect(deleted.photos[0]).toMatchObject({
      uploadStatus: "deleted",
      validationStatus: "blocked"
    });
    expect(deleted.feedback.submittedAt).toBeNull();
    expect(validateBuddyTrialResultPhotoFeedback(deleted).errors).toContain("One usable front-view College Football 27 player image is required.");
  });

  it("redacts media-like feedback text and rejects raw media references in stored payloads", () => {
    const withFront = upsertBuddyTrialResultPhoto(createDraft(), createBuddyTrialResultPhotoRecord(baseInput));
    const submitted = submitBuddyTrialResultFeedback(
      withFront,
      {
        ...withFront.feedback,
        resemblanceRating: 3,
        otherTopThreeBetter: "not_sure",
        mostWrong: "data:image/png;base64,abc",
        notes: "preview blob:https://example.test/object",
        changedSettingsManually: false,
        productImprovementOptIn: false
      },
      new Date("2026-08-13T12:02:00.000Z")
    );

    expect(submitted.feedback.mostWrong).toBe("[redacted-media-reference]");
    expect(submitted.feedback.notes).toBe("preview [redacted-media-reference]");
    expect(
      validateBuddyTrialResultPhotoFeedback({
        ...submitted,
        feedback: {
          ...submitted.feedback,
          notes: "raw landmarks should not be saved"
        }
      }).errors
    ).toContain("Result-photo feedback must not contain raw media bytes or browser object URLs.");
  });
});
