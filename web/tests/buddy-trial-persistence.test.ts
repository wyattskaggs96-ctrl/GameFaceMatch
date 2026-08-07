import { describe, expect, it } from "vitest";
import { BUDDY_TRIAL_ACTIVE_INVITE_ID, createBuddyTrialSession, transitionBuddyTrialSession } from "@/lib/buddy-trial/buddy-trial-session";
import {
  attachDerivedFaceProfile,
  createLocalPrivateBetaTrialPersistenceAdapter,
  createPrivateBetaTrialAuditEvent,
  createPrivateBetaTrialPersistenceRecord,
  createSupabaseUnavailablePrivateBetaTrialPersistenceAdapter,
  isPrivateBetaTrialExpired,
  markPrivateBetaTrialDeleted,
  sanitizePrivateBetaTrialAuditEvent,
  validatePrivateBetaTrialPersistenceRecord
} from "@/lib/buddy-trial/buddy-trial-persistence";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";

describe("private-beta Buddy Trial persistence contract", () => {
  it("creates a pseudonymous resumable trial record without raw face media", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test_1234"
    });

    const record = createPrivateBetaTrialPersistenceRecord({ session, now: new Date("2026-08-07T12:00:00.000Z") });

    expect(record.trialID).toBe("btp_b9c7a1f0_1234");
    expect(record.rawFaceMediaPersisted).toBe(false);
    expect(record.temporaryGameCharacterVideoRetention).toBe("temporary_processing_only");
    expect(record.derivedFaceProfile).toBeNull();
    expect(validatePrivateBetaTrialPersistenceRecord(record)).toEqual({ ok: true, errors: [] });
  });

  it("stores derived profile and capture quality summaries without image bytes or exact global-learning measurements", () => {
    const session = transitionBuddyTrialSession(
      createBuddyTrialSession({
        inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
        productionCatalogRecordCount: 0,
        now: new Date("2026-08-07T12:00:00.000Z"),
        sessionId: "bt_session_test_1234"
      }),
      "CONSENTED",
      new Date("2026-08-07T12:01:00.000Z")
    );
    const record = createPrivateBetaTrialPersistenceRecord({ session, now: new Date("2026-08-07T12:01:00.000Z") });
    const profile = createStandardFaceProfile({
      session: createInitialCaptureSession(),
      attributes: createInitialAttributeConfirmation(),
      now: new Date("2026-08-07T12:02:00.000Z")
    });

    const withProfile = attachDerivedFaceProfile(record, profile, new Date("2026-08-07T12:03:00.000Z"));

    expect(withProfile.derivedFaceProfile).toMatchObject({
      profileID: profile.id,
      rawFaceMediaPersisted: false,
      rawLandmarksPersisted: false,
      exactMeasurementsStoredForGlobalLearning: false
    });
    expect(withProfile.captureQualityMetadata).toMatchObject({
      browserRgbOnly: true,
      rawFaceMediaPersisted: false
    });
    expect(JSON.stringify(withProfile)).not.toMatch(/blob:|data:image|objectUrl|base64/i);
    expect(validatePrivateBetaTrialPersistenceRecord(withProfile)).toEqual({ ok: true, errors: [] });
  });

  it("rejects records that attempt to persist raw media references or retained video without separate opt-in", () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test_1234"
    });
    const record = createPrivateBetaTrialPersistenceRecord({ session });

    expect(
      validatePrivateBetaTrialPersistenceRecord({
        ...record,
        userRatings: { ...record.userRatings, notes: "preview blob:https://example.test/abc" }
      }).errors
    ).toContain("Persistence record contains a raw-media URL or data URL.");

    expect(
      validatePrivateBetaTrialPersistenceRecord({
        ...record,
        temporaryGameCharacterVideoRetention: "retained_with_separate_opt_in"
      }).errors
    ).toContain("Game-character video retention requires separate product-improvement opt-in.");
  });

  it("expires trial records and supports local adapter resume", async () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test_1234"
    });
    const adapter = createLocalPrivateBetaTrialPersistenceAdapter();
    const record = createPrivateBetaTrialPersistenceRecord({ session, now: new Date("2026-08-07T12:00:00.000Z"), retentionDays: 1 });

    await adapter.save(record);
    await expect(adapter.read(record.trialID)).resolves.toMatchObject({ trialID: record.trialID });
    expect(isPrivateBetaTrialExpired(record, new Date("2026-08-08T12:00:00.000Z"))).toBe(true);
  });

  it("deletes user and owner-admin trial data without retaining derived payloads", async () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test_1234"
    });
    const record = createPrivateBetaTrialPersistenceRecord({ session });
    const deleted = markPrivateBetaTrialDeleted({
      record,
      actor: "owner_admin",
      reason: "owner deletion request",
      now: new Date("2026-08-07T13:00:00.000Z")
    });

    expect(deleted).toMatchObject({
      state: "DELETED",
      deletionActor: "owner_admin",
      derivedFaceProfile: null,
      captureQualityMetadata: null,
      selectedGameSettings: [],
      refinementResults: []
    });
    expect(validatePrivateBetaTrialPersistenceRecord(deleted)).toEqual({ ok: true, errors: [] });
  });

  it("redacts media-like strings from audit metadata and keeps Supabase unavailable fail-closed", async () => {
    expect(
      sanitizePrivateBetaTrialAuditEvent(
        createPrivateBetaTrialAuditEvent({
          trialID: "btp_test",
          actor: "trusted_server_process",
          action: "persistence_failure",
          outcome: "failed",
          metadata: { diagnostic: "data:image/png;base64,abc" },
          now: new Date("2026-08-07T12:00:00.000Z")
        })
      ).metadata.diagnostic
    ).toBe("[redacted-media-reference]");

    const unavailable = createSupabaseUnavailablePrivateBetaTrialPersistenceAdapter();
    await expect(unavailable.read("btp_test")).rejects.toThrow(/Supabase private-beta trial persistence is not active/);
  });
});
