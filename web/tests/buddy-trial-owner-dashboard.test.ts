import { describe, expect, it } from "vitest";
import {
  applyBuddyTrialConsent,
  attachBuddyTrialFinalOutcome,
  attachBuddyTrialLearningRecord,
  attachBuddyTrialResultPhotoFeedback,
  attachBuddyTrialVideoOneReview,
  attachBuddyTrialVideoTwoReview,
  createBuddyTrialBuildGuideProgress,
  createBuddyTrialSession,
  REQUIRED_BUDDY_TRIAL_CONSENTS,
  transitionBuddyTrialSession,
  updateBuddyTrialBuildGuideProgress,
  updateBuddyTrialRefinementGuideProgress,
  type BuddyTrialFinalOutcome
} from "@/lib/buddy-trial/buddy-trial-session";
import { createBuddyTrialLearningRecord } from "@/lib/buddy-trial/buddy-trial-learning";
import {
  createBuddyTrialResultPhotoRecord,
  createEmptyBuddyTrialResultPhotoFeedback,
  submitBuddyTrialResultFeedback,
  upsertBuddyTrialResultPhoto
} from "@/lib/buddy-trial/buddy-trial-result-photo-feedback";
import { createCharacterVideoReviewResult, createPersistableCharacterVideoReview } from "@/lib/buddy-trial/character-video-review";
import {
  createOwnerBuddyTrialExport,
  createOwnerBuddyTrialInviteLink,
  createOwnerBuddyTrialProgress,
  createOwnerBuddyTrialRecord,
  createOwnerBuddyTrialTextMessage,
  summarizeOwnerBuddyTrialProgress,
  updateOwnerBuddyTrialRecord,
  validateOwnerBuddyTrialExport
} from "@/lib/buddy-trial/buddy-trial-owner-dashboard";
import { createOwnerReviewDemoRecommendationResult } from "@/lib/owner-review-demo/owner-review-demo";

const now = new Date("2026-08-07T14:00:00.000Z");

describe("owner Buddy Trial command center model", () => {
  it("creates numbered opaque trial records with copyable link and message text", () => {
    const first = createOwnerBuddyTrialRecord({
      existingRecords: [],
      ownerReviewDemoEnabled: true,
      randomID: "01234567-89ab-cdef-0123-456789abcdef",
      now
    });
    const second = createOwnerBuddyTrialRecord({
      existingRecords: [first],
      ownerReviewDemoEnabled: false,
      randomID: "abcdefab-cdef-abcd-efab-cdefabcdefab",
      now
    });

    expect(first).toMatchObject({
      trialNumber: 1,
      label: "Buddy Trial #001",
      inviteId: "btv1_owner_0123456789abcdef0123456789abcdef",
      mode: "owner_review_demo",
      ownerIntervention: "unknown"
    });
    expect(second).toMatchObject({
      trialNumber: 2,
      label: "Buddy Trial #002",
      mode: "production_catalog"
    });
    const link = createOwnerBuddyTrialInviteLink(first, "http://localhost:3000/");
    expect(link).toBe("http://localhost:3000/trial/btv1_owner_0123456789abcdef0123456789abcdef");
    expect(createOwnerBuddyTrialTextMessage(link)).toContain(link);
  });

  it("summarizes progress, scores, ratings, and unassisted completion from existing sessions", () => {
    const record = updateOwnerBuddyTrialRecord(
      createOwnerBuddyTrialRecord({
        existingRecords: [],
        ownerReviewDemoEnabled: true,
        randomID: "01234567-89ab-cdef-0123-456789abcdef",
        now
      }),
      { ownerIntervention: "unassisted" },
      now
    );
    const session = completedDemoSession(record.inviteId);
    const progress = createOwnerBuddyTrialProgress({ record, session, origin: "http://localhost:3000" });
    const summary = summarizeOwnerBuddyTrialProgress([progress]);

    expect(progress.stages).toMatchObject({
      invited: true,
      opened: true,
      consent: true,
      scan: true,
      recommendation: true,
      buildGuide: true,
      videoOne: true,
      refinement: true,
      videoTwo: true,
      complete: true
    });
    expect(progress.finalScore).toBe(91);
    expect(progress.resemblanceRating).toBe(4);
    expect(progress.reviewEvidence).toMatchObject({
      selectedRecommendation: { rank: 1, label: "Review Demo Face Alpha" },
      evidence: { status: "OWNER_REVIEW_DEMO_TEST_DATA" },
      resemblanceRating: 4,
      testerMismatch: "Jaw is still a little wide.",
      deletionStatus: "active"
    });
    expect(progress.reviewEvidence.pseudonymousTesterID).toMatch(/^tester_001_/);
    expect(progress.reviewEvidence.topThreeRecommendations).toHaveLength(3);
    expect(progress.reviewEvidence.uploadedCf27OutputImages).toHaveLength(1);
    expect(progress.reviewEvidence.uploadedCf27OutputImages[0]).toMatchObject({
      viewID: "front",
      storageBucket: "private-beta-game-results",
      privateAccessOnly: true,
      rawFaceScanMedia: false
    });
    expect(progress.sourceLabel).toBe("OWNER_REVIEW_DEMO");
    expect(summary).toEqual({
      invitesIssued: 1,
      trialsStarted: 1,
      scanStarted: 1,
      scanFailures: 0,
      scansCompleted: 1,
      recommendationsGenerated: 1,
      buildsCompleted: 1,
      gamePhotoUploaded: 1,
      selectedRankCounts: { 1: 1, 2: 0, 3: 0 },
      topOneSelectionRate: 100,
      topThreeUsefulnessProxy: 100,
      gamePhotoCompletionRate: 100,
      refinementCompletion: 1,
      trialsCompleted: 1,
      averageInitialScore: 82,
      averageFinalScore: 91,
      averageImprovement: 9,
      averageResemblanceRating: 4,
      unassistedCompletionRate: 100,
      deletedTrials: 0,
      runtimeErrorCount: 0,
      majorFailureCategories: []
    });
  });

  it("exports structured trial results without raw media and keeps demo provenance visible", () => {
    const record = createOwnerBuddyTrialRecord({
      existingRecords: [],
      ownerReviewDemoEnabled: true,
      randomID: "01234567-89ab-cdef-0123-456789abcdef",
      now
    });
    const progress = createOwnerBuddyTrialProgress({
      record,
      session: completedDemoSession(record.inviteId),
      origin: "http://localhost:3000"
    });
    const exported = createOwnerBuddyTrialExport([progress], now);

    expect(exported.records).toHaveLength(1);
    expect(exported.records[0]).toMatchObject({
      mode: "owner_review_demo",
      sessionState: "COMPLETE",
      rawMediaIncluded: false,
      reviewEvidence: {
        selectedRecommendation: { rank: 1 },
        uploadedCf27OutputImages: [{ privateAccessOnly: true, rawFaceScanMedia: false }]
      }
    });
    expect(validateOwnerBuddyTrialExport(exported)).toEqual({ ok: true, errors: [] });
    expect(exported.privacy).toEqual({
      rawFaceMediaIncluded: false,
      rawImageBytesIncluded: false,
      browserObjectURLsIncluded: false,
      exportPurpose: "owner_beta_research_review"
    });
    expect(JSON.stringify(exported)).not.toMatch(/blob:|data:image|data:video|base64/i);
    expect(exported.summary.averageFinalScore).toBe(91);
  });

  it("marks deleted sessions without exposing deleted photo metadata as active evidence", () => {
    const record = updateOwnerBuddyTrialRecord(
      createOwnerBuddyTrialRecord({
        existingRecords: [],
        ownerReviewDemoEnabled: true,
        randomID: "01234567-89ab-cdef-0123-456789abcdef",
        now
      }),
      { status: "deleted", ownerReviewDisposition: "exclude_from_learning", ownerReviewNotes: "Tester requested deletion." },
      now
    );
    const progress = createOwnerBuddyTrialProgress({ record, session: null, origin: "http://localhost:3000" });
    const exported = createOwnerBuddyTrialExport([progress], now);

    expect(progress.reviewEvidence.deletionStatus).toBe("deleted");
    expect(progress.reviewEvidence.uploadedCf27OutputImages).toHaveLength(0);
    expect(progress.reviewEvidence.ownerReviewDisposition).toBe("exclude_from_learning");
    expect(exported.summary.deletedTrials).toBe(1);
    expect(validateOwnerBuddyTrialExport(exported)).toEqual({ ok: true, errors: [] });
  });
});

function completedDemoSession(inviteId: string) {
  const demo = createOwnerReviewDemoRecommendationResult();
  const base = createBuddyTrialSession({
    inviteId,
    productionCatalogRecordCount: 0,
    ownerReviewDemoEnabled: true,
    now,
    sessionId: "bt_session_owner_dashboard"
  });
  const consent = {
    ...base.consent,
    acknowledgments: Object.fromEntries(REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => [id, true])) as typeof base.consent.acknowledgments
  };
  let session = applyBuddyTrialConsent(base, consent, now);
  for (const state of ["SCAN_IN_PROGRESS", "SCAN_COMPLETE", "RECOMMENDATION_READY", "BUILD_IN_PROGRESS"] as const) {
    session = transitionBuddyTrialSession(session, state, now, `Fixture transition to ${state}.`);
  }
  session = updateBuddyTrialBuildGuideProgress(session, {
    totalStepCount: 11,
    currentStepIndex: 10,
    completedStepIds: Array.from({ length: 11 }, (_, index) => `build-step-${index + 1}`),
    viewMode: "step"
  });
  session = transitionBuddyTrialSession(session, "VIDEO_1_REQUIRED", now, "Build guide completed.");
  session = attachBuddyTrialResultPhotoFeedback(session, submittedPhotoFeedback(inviteId, session.sessionId));
  session = attachBuddyTrialVideoOneReview(session, videoReview(1));
  session = transitionBuddyTrialSession(session, "VIDEO_1_PROCESSING", now, "Video #1 processed.");
  session = transitionBuddyTrialSession(session, "REFINEMENT_READY", now, "Refinement ready.");
  session = updateBuddyTrialRefinementGuideProgress(session, {
    ...createBuddyTrialBuildGuideProgress(3, now),
    totalStepCount: 3,
    currentStepIndex: 2,
    completedStepIds: ["refine-jaw", "refine-nose", "refine-chin"]
  });
  session = transitionBuddyTrialSession(session, "VIDEO_2_REQUIRED", now, "Refinement guide completed.");
  session = attachBuddyTrialVideoTwoReview(session, videoReview(2));
  session = transitionBuddyTrialSession(session, "FINAL_RESULT_READY", now, "Video #2 processed.");
  session = attachBuddyTrialFinalOutcome(session, finalOutcome());
  const learningRecord = createBuddyTrialLearningRecord({
    session,
    source: "owner_review_demo",
    profile: demo.profile,
    ownerReviewDemo: demo,
    productImprovementOptIn: true,
    productImprovementConsentVersion: "consent-v1",
    now
  });
  session = attachBuddyTrialLearningRecord(session, learningRecord, now);
  return transitionBuddyTrialSession(session, "COMPLETE", now, "Trial completed.");
}

function submittedPhotoFeedback(inviteId: string, sessionId: string) {
  const base = createEmptyBuddyTrialResultPhotoFeedback({
    trialID: "btp_owner_dashboard",
    inviteID: inviteId,
    sessionID: sessionId,
    source: "owner_review_demo",
    recommendationBinding: {
      recommendationVersion: "owner-review-demo-matching-v1",
      catalogVersionID: "owner-review-demo-catalog-v1",
      evidenceVersionID: "owner-review-demo-evidence-v1",
      selectedRecommendationRank: 1,
      selectedRecommendationLabel: "Review Demo Face Alpha"
    }
  });
  const withPhoto = upsertBuddyTrialResultPhoto(
    base,
    createBuddyTrialResultPhotoRecord({
      trialID: "btp_owner_dashboard",
      inviteID: inviteId,
      viewID: "front",
      originalFilename: "cf27-front.png",
      mimeType: "image/png",
      sizeBytes: 1_200_000,
      width: 900,
      height: 1100,
      sha256: "a".repeat(64),
      uploadedAt: now.toISOString()
    }),
    now
  );
  return submitBuddyTrialResultFeedback(
    withPhoto,
    {
      selectedRecommendationRank: 1,
      resemblanceRating: 4,
      otherTopThreeBetter: "no",
      mostWrong: "Jaw is still a little wide.",
      notes: "Hair felt close.",
      changedSettingsManually: false,
      manualSettingChangeSummary: null,
      productImprovementOptIn: true,
      productImprovementConsentVersion: "consent-v1",
      submittedAt: null
    },
    now
  );
}

function videoReview(iteration: 1 | 2) {
  return createPersistableCharacterVideoReview(
    createCharacterVideoReviewResult({
      iteration,
      metadata: {
        fileName: `owner-dashboard-video-${iteration}.mp4`,
        fileType: "video/mp4",
        fileSizeBytes: 900_000,
        durationSeconds: 12,
        width: 1280,
        height: 720,
        source: "fixture"
      },
      objectUrlsRevokedAfterProcessing: true
    })
  );
}

function finalOutcome(): BuddyTrialFinalOutcome {
  return {
    schemaVersion: "buddy-trial-final-outcome-v1",
    source: "owner_review_demo",
    initialRecommendationLabel: "Review Demo Face Alpha",
    finalSettingsSummary: [{ label: "Jaw Width", value: "61", menuPath: ["Road to Glory", "Appearance", "Face"] }],
    beforeScore: 82,
    afterScore: 91,
    scoreDelta: 9,
    trend: "improvement",
    improved: ["Jaw proportion"],
    stillDifferent: ["Brow height"],
    scoreLanguage: "Build Match Score is not identity probability.",
    userPreference: "refined",
    resemblanceRating: 8,
    stillLooksOff: "Brow still sits high.",
    productImprovementOptIn: true,
    productImprovementConsentVersion: "consent-v1",
    submittedAt: now.toISOString(),
    rawMediaRetained: false
  };
}
