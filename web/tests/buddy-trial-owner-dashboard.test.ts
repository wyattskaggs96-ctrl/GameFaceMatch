import { describe, expect, it } from "vitest";
import {
  applyBuddyTrialConsent,
  attachBuddyTrialFinalOutcome,
  attachBuddyTrialLearningRecord,
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
import { createCharacterVideoReviewResult, createPersistableCharacterVideoReview } from "@/lib/buddy-trial/character-video-review";
import {
  createOwnerBuddyTrialExport,
  createOwnerBuddyTrialInviteLink,
  createOwnerBuddyTrialProgress,
  createOwnerBuddyTrialRecord,
  createOwnerBuddyTrialTextMessage,
  summarizeOwnerBuddyTrialProgress,
  updateOwnerBuddyTrialRecord
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
    expect(progress.resemblanceRating).toBe(8);
    expect(progress.sourceLabel).toBe("OWNER_REVIEW_DEMO");
    expect(summary).toEqual({
      trialsStarted: 1,
      scansCompleted: 1,
      buildsCompleted: 1,
      videoOneCompletion: 1,
      refinementCompletion: 1,
      trialsCompleted: 1,
      averageInitialScore: 82,
      averageFinalScore: 91,
      averageImprovement: 9,
      averageResemblanceRating: 8,
      unassistedCompletionRate: 100
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
      rawMediaIncluded: false
    });
    expect(JSON.stringify(exported)).not.toMatch(/blob:|data:image|data:video|base64|objectUrl/i);
    expect(exported.summary.averageFinalScore).toBe(91);
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
