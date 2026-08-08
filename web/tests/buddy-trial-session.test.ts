import { describe, expect, it } from "vitest";
import {
  applyBuddyTrialConsent,
  attachBuddyTrialFinalOutcome,
  BUDDY_TRIAL_ACTIVE_INVITE_ID,
  BUDDY_TRIAL_EXPIRED_INVITE_ID,
  BUDDY_TRIAL_STATES,
  BUDDY_TRIAL_USED_INVITE_ID,
  attachBuddyTrialVideoOneReview,
  attachBuddyTrialVideoTwoReview,
  canAdvanceBuddyTrialToRecommendation,
  createBuddyTrialSession,
  createBuddyTrialStorageKey,
  createBuddyTrialBuildGuideProgress,
  getBuddyTrialInvite,
  hasRequiredBuddyTrialConsent,
  markBuddyTrialScanCompleteInStorage,
  REQUIRED_BUDDY_TRIAL_CONSENTS,
  serializeBuddyTrialSession,
  transitionBuddyTrialSession,
  updateBuddyTrialBuildGuideProgress,
  updateBuddyTrialRefinementGuideProgress
} from "@/lib/buddy-trial/buddy-trial-session";
import { createCharacterVideoReviewResult, createPersistableCharacterVideoReview } from "@/lib/buddy-trial/character-video-review";

describe("buddy trial session contract", () => {
  it("defines the complete invite-only trial state machine", () => {
    expect(BUDDY_TRIAL_STATES).toEqual([
      "INVITED",
      "CONSENTED",
      "SCAN_IN_PROGRESS",
      "SCAN_COMPLETE",
      "RECOMMENDATION_READY",
      "BUILD_IN_PROGRESS",
      "VIDEO_1_REQUIRED",
      "VIDEO_1_PROCESSING",
      "REFINEMENT_READY",
      "VIDEO_2_REQUIRED",
      "FINAL_RESULT_READY",
      "COMPLETE",
      "DELETED"
    ]);
  });

  it("resolves active, expired, used, and invalid opaque invites", () => {
    const now = new Date("2026-08-07T12:00:00.000Z");
    expect(getBuddyTrialInvite(BUDDY_TRIAL_ACTIVE_INVITE_ID, now).status).toBe("active");
    expect(getBuddyTrialInvite(BUDDY_TRIAL_EXPIRED_INVITE_ID, now).status).toBe("expired");
    expect(getBuddyTrialInvite(BUDDY_TRIAL_USED_INVITE_ID, now).status).toBe("used");
    expect(getBuddyTrialInvite("not-a-real-invite", now).status).toBe("invalid");
  });

  it("uses one local storage namespace per invite", () => {
    expect(createBuddyTrialStorageKey(BUDDY_TRIAL_ACTIVE_INVITE_ID)).toBe(`gfm:buddy-trial:v1:${BUDDY_TRIAL_ACTIVE_INVITE_ID}`);
  });

  it("requires every capture consent before moving into the scan", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });

    expect(hasRequiredBuddyTrialConsent(session.consent)).toBe(false);
    expect(applyBuddyTrialConsent(session, session.consent).state).toBe("INVITED");

    const consent = {
      ...session.consent,
      acknowledgments: Object.fromEntries(REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => [id, true])) as typeof session.consent.acknowledgments
    };
    expect(hasRequiredBuddyTrialConsent(consent)).toBe(true);
    expect(applyBuddyTrialConsent(session, consent, new Date("2026-08-07T12:01:00.000Z")).state).toBe("CONSENTED");
  });

  it("keeps real recommendations fail-closed while the production catalog is empty", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    const consent = {
      ...session.consent,
      acknowledgments: Object.fromEntries(REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => [id, true])) as typeof session.consent.acknowledgments
    };
    const started = transitionBuddyTrialSession(applyBuddyTrialConsent(session, consent), "SCAN_IN_PROGRESS");
    const scanComplete = transitionBuddyTrialSession(started, "SCAN_COMPLETE");
    expect(scanComplete.catalogGate).toBe("production_catalog_unavailable");
    expect(canAdvanceBuddyTrialToRecommendation(scanComplete)).toBe(false);
    expect(() => transitionBuddyTrialSession(scanComplete, "RECOMMENDATION_READY")).toThrow(/production catalog/);
  });

  it("separates owner review demo availability from production catalog availability", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      ownerReviewDemoEnabled: true,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    const consent = {
      ...session.consent,
      acknowledgments: Object.fromEntries(REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => [id, true])) as typeof session.consent.acknowledgments
    };
    const started = transitionBuddyTrialSession(applyBuddyTrialConsent(session, consent), "SCAN_IN_PROGRESS");
    const scanComplete = transitionBuddyTrialSession(started, "SCAN_COMPLETE");

    expect(scanComplete.catalogGate).toBe("owner_review_demo_available");
    expect(canAdvanceBuddyTrialToRecommendation(scanComplete)).toBe(true);
    expect(transitionBuddyTrialSession(scanComplete, "RECOMMENDATION_READY").state).toBe("RECOMMENDATION_READY");
  });

  it("marks an existing active invite session scan-complete for browser resume without enabling recommendations", () => {
    const now = new Date("2026-08-07T12:00:00.000Z");
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now,
      sessionId: "bt_session_test"
    });
    const consent = {
      ...session.consent,
      acknowledgments: Object.fromEntries(REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => [id, true])) as typeof session.consent.acknowledgments
    };
    const scanInProgress = transitionBuddyTrialSession(applyBuddyTrialConsent(session, consent, now), "SCAN_IN_PROGRESS", now);
    const storage = new Map<string, string>();
    storage.set(createBuddyTrialStorageKey(BUDDY_TRIAL_ACTIVE_INVITE_ID), serializeBuddyTrialSession(scanInProgress));

    const nextSession = markBuddyTrialScanCompleteInStorage({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        }
      },
      now: new Date("2026-08-07T12:05:00.000Z")
    });

    expect(nextSession.state).toBe("SCAN_COMPLETE");
    expect(nextSession.catalogGate).toBe("production_catalog_unavailable");
    expect(canAdvanceBuddyTrialToRecommendation(nextSession)).toBe(false);
  });

  it("marks scan-complete with demo catalog gate only when owner review demo is explicit", () => {
    const storage = new Map<string, string>();
    const nextSession = markBuddyTrialScanCompleteInStorage({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      ownerReviewDemoEnabled: true,
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        }
      },
      now: new Date("2026-08-07T12:05:00.000Z")
    });

    expect(nextSession.catalogGate).toBe("owner_review_demo_available");
  });

  it("persists build-guide progress for resume after refresh or browser close", () => {
    const progress = createBuddyTrialBuildGuideProgress(11, new Date("2026-08-07T12:00:00.000Z"));
    expect(progress).toMatchObject({
      totalStepCount: 11,
      currentStepIndex: 0,
      completedStepIds: [],
      viewMode: "step"
    });

    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      ownerReviewDemoEnabled: true,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    const withProgress = updateBuddyTrialBuildGuideProgress(session, {
      totalStepCount: 11,
      currentStepIndex: 4,
      completedStepIds: ["demo-build-open-rtg", "demo-build-open-appearance", "demo-build-head", "demo-build-skin"],
      viewMode: "summary"
    });
    const resumed = JSON.parse(serializeBuddyTrialSession(withProgress));

    expect(resumed.buildGuide).toMatchObject({
      totalStepCount: 11,
      currentStepIndex: 4,
      completedStepIds: ["demo-build-open-rtg", "demo-build-open-appearance", "demo-build-head", "demo-build-skin"],
      viewMode: "summary"
    });
  });

  it("stores Video #1 review summaries without retaining candidate frames or raw media", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      ownerReviewDemoEnabled: true,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    const review = createPersistableCharacterVideoReview(
      createCharacterVideoReviewResult({
        metadata: {
          fileName: "character-video.mp4",
          fileType: "video/mp4",
          fileSizeBytes: 1_000_000,
          durationSeconds: 12,
          width: 1280,
          height: 720,
          source: "upload"
        },
        objectUrlsRevokedAfterProcessing: true
      })
    );
    const withReview = attachBuddyTrialVideoOneReview(session, review);

    expect(withReview.videoOneReview).toMatchObject({
      metadata: { fileName: "character-video.mp4" },
      candidateFrames: [],
      retention: {
        rawVideoPersisted: false,
        temporaryMediaRetention: "temporary_processing_only",
        objectUrlsRevokedAfterProcessing: true
      }
    });
    expect(JSON.stringify(withReview)).not.toMatch(/blob:|data:video|data:image|base64/i);
  });

  it("treats deleted sessions as terminal and prevents unsupported jumps", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 1,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    expect(() => transitionBuddyTrialSession(session, "RECOMMENDATION_READY")).toThrow(/Invalid Buddy Trial transition/);
    const deleted = transitionBuddyTrialSession(session, "DELETED");
    expect(deleted.deletedAt).toBeTruthy();
    expect(() => transitionBuddyTrialSession(deleted, "CONSENTED")).toThrow(/Invalid Buddy Trial transition/);
  });

  it("allows Video #1 retry and clears video review data on deletion", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      ownerReviewDemoEnabled: true,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    const consent = {
      ...session.consent,
      acknowledgments: Object.fromEntries(REQUIRED_BUDDY_TRIAL_CONSENTS.map((id) => [id, true])) as typeof session.consent.acknowledgments
    };
    const readyForRetry = transitionBuddyTrialSession(
      transitionBuddyTrialSession(
        transitionBuddyTrialSession(
          transitionBuddyTrialSession(applyBuddyTrialConsent(session, consent), "SCAN_IN_PROGRESS"),
          "SCAN_COMPLETE"
        ),
        "RECOMMENDATION_READY"
      ),
      "BUILD_IN_PROGRESS"
    );
    const videoRequired = transitionBuddyTrialSession(readyForRetry, "VIDEO_1_REQUIRED");
    const processing = transitionBuddyTrialSession(videoRequired, "VIDEO_1_PROCESSING");
    expect(transitionBuddyTrialSession(processing, "VIDEO_1_REQUIRED").state).toBe("VIDEO_1_REQUIRED");
    const deleted = transitionBuddyTrialSession(
      attachBuddyTrialVideoOneReview(processing, createPersistableCharacterVideoReview(createCharacterVideoReviewResult({
        metadata: {
          fileName: "character-video.mp4",
          fileType: "video/mp4",
          fileSizeBytes: 1_000_000,
          durationSeconds: 12,
          width: 1280,
          height: 720,
          source: "upload"
        }
      }))),
      "DELETED"
    );
    expect(deleted.videoOneReview).toBeNull();
    expect(deleted.videoTwoReview).toBeNull();
    expect(deleted.finalOutcome).toBeNull();
    expect(deleted.buildGuide).toBeNull();
  });

  it("persists refinement-guide progress separately from initial build progress and clears it on deletion", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      ownerReviewDemoEnabled: true,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    const withBuildProgress = updateBuddyTrialBuildGuideProgress(session, {
      totalStepCount: 11,
      currentStepIndex: 10,
      completedStepIds: ["initial-step"],
      viewMode: "step"
    });
    const withRefinementProgress = updateBuddyTrialRefinementGuideProgress(withBuildProgress, {
      totalStepCount: 3,
      currentStepIndex: 1,
      completedStepIds: ["owner-demo-refinement-step-1-demo-jaw-width-slider"],
      viewMode: "summary"
    });

    expect(withRefinementProgress.buildGuide?.totalStepCount).toBe(11);
    expect(withRefinementProgress.refinementGuide).toMatchObject({
      totalStepCount: 3,
      currentStepIndex: 1,
      completedStepIds: ["owner-demo-refinement-step-1-demo-jaw-width-slider"],
      viewMode: "summary"
    });
    const deleted = transitionBuddyTrialSession(withRefinementProgress, "DELETED");
    expect(deleted.buildGuide).toBeNull();
    expect(deleted.refinementGuide).toBeNull();
  });

  it("stores Video #2 and final before-after feedback without retaining raw media", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      ownerReviewDemoEnabled: true,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test"
    });
    const review = createPersistableCharacterVideoReview(
      createCharacterVideoReviewResult({
        iteration: 2,
        metadata: {
          fileName: "updated-character-video.mp4",
          fileType: "video/mp4",
          fileSizeBytes: 1_000_000,
          durationSeconds: 12,
          width: 1280,
          height: 720,
          source: "upload"
        },
        objectUrlsRevokedAfterProcessing: true
      })
    );
    const withVideoTwo = attachBuddyTrialVideoTwoReview(session, review);
    expect(withVideoTwo.videoTwoReview).toMatchObject({
      iteration: 2,
      metadata: { fileName: "updated-character-video.mp4" },
      candidateFrames: [],
      retention: {
        rawVideoPersisted: false,
        temporaryMediaRetention: "temporary_processing_only",
        objectUrlsRevokedAfterProcessing: true
      }
    });

    const withOutcome = attachBuddyTrialFinalOutcome(withVideoTwo, {
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
      submittedAt: "2026-08-07T12:45:00.000Z",
      rawMediaRetained: false
    });
    expect(withOutcome.finalOutcome).toMatchObject({
      scoreDelta: 9,
      trend: "improvement",
      userPreference: "refined",
      resemblanceRating: 8,
      rawMediaRetained: false
    });
    expect(JSON.stringify(withOutcome)).not.toMatch(/blob:|data:video|data:image|base64/i);
  });
});
