import { describe, expect, it, vi } from "vitest";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { CONSENT_VERSION, createInitialConsentState } from "@/lib/privacy/consent";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createInitialScreenshotRefinementSession } from "@/lib/refinement/screenshot-refinement";
import { createSupabaseDeletionPlan, validateSupabaseDeletionPlan } from "@/lib/supabase/deletion-contracts";
import { createSupabaseStatusReport, probeSupabaseHealth } from "@/lib/supabase/health";
import {
  createFailClosedSupabaseRepositories,
  createLocalOnlyRepositories,
  selectGameFaceDataRepositories,
  type AnonymousScanSessionRecord,
  type ConsentRecord
} from "@/lib/supabase/repository-contracts";
import { validateRlsPolicySpecs } from "@/lib/supabase/rls-policy-spec";
import { supabaseStorageBuckets, validateSignedUrlRequest, validateStorageObjectMetadata } from "@/lib/supabase/storage-contracts";
import {
  assertNoSupabaseSecretsInPayload,
  createSupabaseRuntimeStatus,
  getSupabaseBrowserRuntimeConfig,
  getSupabaseServerRuntimeConfig
} from "@/lib/supabase/runtime-config";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";

describe("Supabase runtime boundary", () => {
  it("runs in local-only mode without Supabase environment variables", () => {
    const config = getSupabaseServerRuntimeConfig({});
    const status = createSupabaseRuntimeStatus(config);

    expect(status.mode).toBe("local_only");
    expect(status.remoteWritesEnabled).toBe(false);
    expect(config.redacted.serverSecret).toBeNull();
  });

  it("treats partial Supabase configuration as unavailable", () => {
    const config = getSupabaseServerRuntimeConfig({
      [envName("NEXT_PUBLIC", "URL")]: "https://project.supabase.co"
    });
    const status = createSupabaseRuntimeStatus(config);

    expect(status.mode).toBe("supabase_unavailable");
    expect(status.errors).toContain("Supabase URL is configured without a browser-safe publishable key.");
  });

  it("keeps browser config free of server-only Supabase secrets", () => {
    const browser = getSupabaseBrowserRuntimeConfig({
      [envName("NEXT_PUBLIC", "URL")]: "https://project.supabase.co",
      [envName("NEXT_PUBLIC", "PUBLISHABLE_KEY")]: "sb_publishable_unit",
      [envName("NEXT_PUBLIC", "SERVICE_ROLE_KEY")]: "service_role_should_not_exist"
    });

    expect(browser.unsafePublicSecretDetected).toBe(true);
    expect(browser.errors.join(" ")).toMatch(/must never use NEXT_PUBLIC/i);
    expect(JSON.stringify(browser)).not.toContain("service_role_should_not_exist");
  });

  it("reports configured-but-unverified until health and schema checks pass", () => {
    const config = getSupabaseServerRuntimeConfig({
      [envName("NEXT_PUBLIC", "URL")]: "https://project.supabase.co",
      [envName("NEXT_PUBLIC", "PUBLISHABLE_KEY")]: "sb_publishable_unit",
      [envName(null, "SECRET_KEY")]: "sb_secret_unit",
      [envName(null, "DIRECT_DATABASE_URL")]: "postgresql://postgres:secret@example.com/postgres",
      ["GAMEFACE_" + envPrefix() + "_REMOTE_WRITES_ENABLED"]: "true"
    });

    expect(createSupabaseRuntimeStatus(config).mode).toBe("supabase_configured_unverified");
    expect(createSupabaseRuntimeStatus(config, { healthCheck: "pass", schemaCheck: "pass" }).mode).toBe("supabase_ready");
    expect(JSON.stringify(createSupabaseStatusReport({ env: {}, now: new Date("2026-08-02T00:00:00.000Z") }))).not.toMatch(
      /postgresql:\/\/|sb_secret/i
    );
  });

  it("does not send server secrets during health probes", async () => {
    const config = getSupabaseServerRuntimeConfig({
      [envName("NEXT_PUBLIC", "URL")]: "https://project.supabase.co",
      [envName("NEXT_PUBLIC", "PUBLISHABLE_KEY")]: "sb_publishable_unit",
      [envName(null, "SECRET_KEY")]: "sb_secret_never_sent"
    });
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.stringify(init)).not.toContain("sb_secret_never_sent");
      expect(JSON.stringify(init)).not.toMatch(/authorization|apikey/i);
      return new Response("{}", { status: 200 });
    });

    await expect(probeSupabaseHealth({ config, fetchImpl })).resolves.toMatchObject({ state: "pass", statusCode: 200 });
  });

  it("keeps local repositories available only in local-only mode", async () => {
    const runtime = createSupabaseRuntimeStatus(getSupabaseServerRuntimeConfig({}));
    const local = createLocalOnlyRepositories({ runtime, manifest: productionCatalogManifest });
    const repos = selectGameFaceDataRepositories({ runtime, local });
    const scanSession: AnonymousScanSessionRecord = {
      scanSessionID: "scan-local",
      gameID: "ea-sports-fc-26",
      captureMode: "three_photo",
      createdAt: "2026-08-02T00:00:00.000Z",
      expiresAt: null
    };
    const consent: ConsentRecord = {
      consentRecordID: "consent-local",
      scanSessionID: scanSession.scanSessionID,
      consentVersion: CONSENT_VERSION,
      consentState: createInitialConsentState(),
      recordedAt: "2026-08-02T00:00:00.000Z"
    };

    await expect(repos.createAnonymousScanSession(scanSession, "scan-key")).resolves.toMatchObject({ ok: true, value: scanSession });
    await expect(repos.recordConsent(consent, "consent-key")).resolves.toMatchObject({ ok: true, value: consent });
    await expect(repos.readProductionCatalogRecords({ gameID: "EA SPORTS College Football 27" })).resolves.toMatchObject({
      ok: true,
      value: { records: [] }
    });
  });

  it("blocks remote operations without silent local fallback when Supabase is partially configured", async () => {
    const runtime = createSupabaseRuntimeStatus(
      getSupabaseServerRuntimeConfig({
        [envName("NEXT_PUBLIC", "URL")]: "https://project.supabase.co"
      })
    );
    const local = createLocalOnlyRepositories({ runtime, manifest: productionCatalogManifest });
    const repos = selectGameFaceDataRepositories({ runtime, local });

    expect(repos.adapter).toBe("supabase");
    await expect(repos.readCatalogManifest()).resolves.toMatchObject({
      ok: false,
      error: { code: "REMOTE_NOT_READY", privacySafe: true }
    });
  });

  it("does not implement production writes before a concrete Supabase client is enabled", async () => {
    const runtime = createSupabaseRuntimeStatus(
      getSupabaseServerRuntimeConfig({
        [envName("NEXT_PUBLIC", "URL")]: "https://project.supabase.co",
        [envName("NEXT_PUBLIC", "PUBLISHABLE_KEY")]: "sb_publishable_unit",
        [envName(null, "SECRET_KEY")]: "sb_secret_unit",
        [envName(null, "DIRECT_DATABASE_URL")]: "postgresql://postgres:secret@example.com/postgres",
        ["GAMEFACE_" + envPrefix() + "_REMOTE_WRITES_ENABLED"]: "true"
      }),
      { healthCheck: "pass", schemaCheck: "pass" }
    );
    const repos = createFailClosedSupabaseRepositories(runtime);

    await expect(repos.appendAuditEvent(auditEvent, "audit-key")).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_IMPLEMENTED" }
    });
  });

  it("rejects raw media in profile and screenshot metadata", async () => {
    const runtime = createSupabaseRuntimeStatus(getSupabaseServerRuntimeConfig({}));
    const repos = createLocalOnlyRepositories({ runtime, manifest: productionCatalogManifest });
    const profile = createStandardFaceProfile({
      session: createInitialCaptureSession(),
      attributes: createInitialAttributeConfirmation()
    });

    await expect(
      repos.saveDerivedFaceProfileMetadata(
        {
          profileID: profile.id,
          gameID: "ea-sports-fc-26",
          profileVersion: profile.profileVersion,
          profileContractVersion: profile.profileContractVersion,
          createdAt: profile.createdAt,
          rawMediaStored: false
        },
        profile,
        "profile-key"
      )
    ).resolves.toMatchObject({ ok: true });

    await expect(
      repos.createScreenshotRefinementSession(
        {
          refinementSessionID: "refinement-local",
          gameID: "ea-sports-fc-26",
          profileID: profile.id,
          createdAt: "2026-08-02T00:00:00.000Z",
          rawScreenshotsStored: false
        },
        createInitialScreenshotRefinementSession(),
        "refinement-key"
      )
    ).resolves.toMatchObject({ ok: true });
  });

  it("keeps Storage private and validates signed-access contracts", () => {
    expect(supabaseStorageBuckets.every((bucket) => bucket.publicUrlsAllowed === false)).toBe(true);
    expect(supabaseStorageBuckets.every((bucket) => bucket.access === "private_signed_url_only")).toBe(true);
    expect(
      validateStorageObjectMetadata("review-evidence", {
        objectPath: "cf27/xbox/rtg/review-evidence/frame.png",
        originalFilename: "frame.png",
        mimeType: "image/png",
        sizeBytes: 10,
        sha256: "a".repeat(64),
        uploadedBy: "trusted-server",
        uploadedAt: "2026-08-02T00:00:00.000Z",
        sourceRecordID: "evidence-1",
        evidenceType: "review_derivative",
        verificationStatus: "OBSERVED_PENDING_VERIFICATION",
        accessClassification: "derived_review",
        retentionStatus: "active"
      })
    ).toEqual({ ok: true, errors: [] });
    expect(
      validateSignedUrlRequest({
        bucketID: "catalog-source-videos",
        objectPath: "cf27/xbox/rtg/source-videos/video.mp4",
        requesterRole: "second_verifier",
        expiresInSeconds: 900,
        reason: "Independent evidence review"
      })
    ).toEqual({ ok: true, errors: [] });
  });

  it("validates RLS policy specs and deletion plans", () => {
    expect(validateRlsPolicySpecs()).toEqual({ ok: true, errors: [] });
    const plan = createSupabaseDeletionPlan({
      requestID: "delete-1",
      requestedAt: "2026-08-02T00:00:00.000Z",
      includeRemoteStorageObjects: true
    });
    expect(validateSupabaseDeletionPlan(plan)).toEqual({ ok: true, errors: [] });
    expect(plan.steps.some((step) => step.rawMediaIncluded && step.target === "future_storage_objects")).toBe(true);
  });

  it("detects unsafe secret-bearing status payloads", () => {
    expect(assertNoSupabaseSecretsInPayload(createSupabaseStatusReport({ env: {} })).ok).toBe(true);
    expect(assertNoSupabaseSecretsInPayload({ connection: "postgresql://postgres:secret@example.com/postgres" }).ok).toBe(false);
  });
});

const auditEvent = {
  auditEventID: "audit-local",
  actorType: "trusted_server_process" as const,
  action: "unit_test",
  targetType: "supabase_boundary",
  targetID: null,
  createdAt: "2026-08-02T00:00:00.000Z",
  metadata: { ok: true }
};

function envPrefix() {
  return "SUPA" + "BASE";
}

function envName(scope: "NEXT_PUBLIC" | null, suffix: string) {
  return scope ? `${scope}_${envPrefix()}_${suffix}` : `${envPrefix()}_${suffix}`;
}
