import { describe, expect, it, vi } from "vitest";
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
import {
  createPrivateBetaGameResultUploadRecord,
  createSupabasePrivateBetaTrialPersistenceAdapter,
  validatePrivateBetaGameResultUploadRecord
} from "@/lib/buddy-trial/buddy-trial-supabase-persistence";
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
    const adapter = createLocalPrivateBetaTrialPersistenceAdapter(undefined, { now: () => new Date("2026-08-07T12:30:00.000Z") });
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

  it("uses a server-only Supabase adapter for durable beta session save/read without raw media", async () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test_1234"
    });
    const record = createPrivateBetaTrialPersistenceRecord({ session, now: new Date("2026-08-07T12:00:00.000Z") });
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let savedRow: Record<string, unknown> | null = null;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).includes("/private_beta_trial_sessions?")) {
        return new Response(JSON.stringify(savedRow ? [savedRow] : []), { status: 200 });
      }
      if (String(url).includes("/private_beta_trial_sessions")) {
        savedRow = JSON.parse(String(init?.body))[0];
      }
      return new Response("[]", { status: 200 });
    });
    const adapter = createSupabasePrivateBetaTrialPersistenceAdapter({
      supabaseUrl: "https://gameface-match.supabase.co",
      serverSecretKey: "sb_secret_unit",
      fetchImpl: fetchImpl as typeof fetch
    });

    await expect(adapter.save(record)).resolves.toMatchObject({ trialID: record.trialID });
    await expect(adapter.read(record.trialID)).resolves.toMatchObject({ trialID: record.trialID, rawFaceMediaPersisted: false });

    expect(adapter.mode).toBe("supabase_server_adapter");
    expect(calls[0].url).toBe("https://gameface-match.supabase.co/rest/v1/private_beta_trial_sessions");
    expect(calls[0].init?.headers).toMatchObject({ Authorization: "Bearer sb_secret_unit" });
    expect(JSON.stringify(calls)).not.toMatch(/data:image|blob:|base64|rawFaceVideo/i);
    expect(savedRow).toMatchObject({
      schema_version: "private-beta-trial-persistence-v1",
      trial_id: record.trialID,
      raw_face_media_stored: false
    });
  });

  it("rejects prohibited raw landmark or embedding payload keys before remote writes", async () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test_1234"
    });
    const record = createPrivateBetaTrialPersistenceRecord({ session });
    const adapter = createSupabasePrivateBetaTrialPersistenceAdapter({
      supabaseUrl: "https://gameface-match.supabase.co",
      serverSecretKey: "sb_secret_unit",
      fetchImpl: vi.fn() as unknown as typeof fetch
    });

    await expect(
      adapter.save({
        ...record,
        derivedFaceProfile: {
          landmarkVector: [0.1, 0.2, 0.3]
        } as never
      })
    ).rejects.toThrow(/prohibited biometric payload key: derivedFaceProfile.landmarkVector/);
  });

  it("deletes durable trial payloads and marks linked game-result uploads deleted", async () => {
    const session = createBuddyTrialSession({
      inviteId: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      productionCatalogRecordCount: 0,
      now: new Date("2026-08-07T12:00:00.000Z"),
      sessionId: "bt_session_test_1234"
    });
    const record = createPrivateBetaTrialPersistenceRecord({ session, now: new Date("2026-08-07T12:00:00.000Z") });
    let savedRow = {
      schema_version: record.schemaVersion,
      trial_id: record.trialID,
      invite_id: record.inviteID,
      session_id: record.sessionID,
      state: record.state,
      consent_version: record.consentVersion,
      consent_accepted_at: record.consentAcceptedAt,
      derived_face_profile: record.derivedFaceProfile,
      capture_quality_metadata: record.captureQualityMetadata,
      recommendation_version: record.recommendationVersion,
      catalog_version_id: record.catalogVersionID,
      selected_game_settings: record.selectedGameSettings,
      refinement_results: record.refinementResults,
      user_ratings: record.userRatings,
      raw_face_media_stored: record.rawFaceMediaPersisted,
      temporary_game_character_video_retention: record.temporaryGameCharacterVideoRetention,
      product_improvement_opt_in: false,
      expires_at: record.expiresAt,
      deleted_at: record.deletedAt,
      deletion_actor: record.deletionActor,
      created_at: record.createdAt,
      updated_at: record.updatedAt
    };
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).includes("/private_beta_trial_sessions?")) {
        return new Response(JSON.stringify([savedRow]), { status: 200 });
      }
      if (String(url).includes("/private_beta_trial_sessions") && init?.method === "POST") {
        savedRow = JSON.parse(String(init.body))[0];
      }
      return new Response("[]", { status: 200 });
    });
    const adapter = createSupabasePrivateBetaTrialPersistenceAdapter({
      supabaseUrl: "https://gameface-match.supabase.co",
      serverSecretKey: "sb_secret_unit",
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date("2026-08-07T13:00:00.000Z")
    });

    await expect(
      adapter.deleteTrial({
        trialID: record.trialID,
        actor: "buddy_tester",
        reason: "tester requested deletion",
        now: new Date("2026-08-07T13:00:00.000Z")
      })
    ).resolves.toMatchObject({
      trialID: record.trialID,
      state: "DELETED",
      derivedFaceProfile: null,
      selectedGameSettings: []
    });

    expect(calls.some((call) => call.url.includes("/private_beta_trial_uploads?trial_id=eq."))).toBe(true);
    expect(JSON.stringify(calls)).not.toMatch(/data:image|blob:|base64/);
  });

  it("validates private game-result photo metadata for later Storage uploads", () => {
    const upload = createPrivateBetaGameResultUploadRecord({
      trialID: "btp_b9c7a1f0_1234",
      inviteID: BUDDY_TRIAL_ACTIVE_INVITE_ID,
      uploadID: "btu_photo_1",
      originalFilename: "cf27-result.jpeg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      sha256: "b".repeat(64),
      uploadedAt: "2026-08-07T12:00:00.000Z"
    });

    expect(upload.objectPath).toBe("private-beta/btp_b9c7a1f0_1234/game-results/btu_photo_1.jpeg");
    expect(validatePrivateBetaGameResultUploadRecord(upload)).toEqual({ ok: true, errors: [] });
    expect(
      validatePrivateBetaGameResultUploadRecord({
        ...upload,
        trialID: "raw-user-name",
        rawFaceMediaStored: true as false
      }).errors
    ).toEqual(
      expect.arrayContaining([
        "Upload must be linked to a pseudonymous private-beta trial ID.",
        "Raw face scan media must not be stored in private-beta game-result uploads."
      ])
    );
  });
});
