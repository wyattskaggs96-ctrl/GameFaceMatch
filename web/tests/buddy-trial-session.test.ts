import { describe, expect, it } from "vitest";
import {
  applyBuddyTrialConsent,
  BUDDY_TRIAL_ACTIVE_INVITE_ID,
  BUDDY_TRIAL_EXPIRED_INVITE_ID,
  BUDDY_TRIAL_STATES,
  BUDDY_TRIAL_USED_INVITE_ID,
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
  updateBuddyTrialBuildGuideProgress
} from "@/lib/buddy-trial/buddy-trial-session";

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
});
