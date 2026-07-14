import { describe, expect, it } from "vitest";
import { createBrowserLocalPrivacyStore, createMemoryPrivacyStore } from "@/lib/privacy/local-privacy-store";
import { createBrowserSavedProfileStorage, SAVED_PROFILE_STORAGE_KEY } from "@/lib/privacy/profile-storage";
import { createInitialCaptureSession, setAngleCapture } from "@/lib/capture/capture-session";
import { createTemporaryImageReference } from "@/lib/capture/image-validation";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import { CONSENT_DEFINITIONS, CONSENT_VERSION, createInitialConsentState, hasRequiredCaptureConsent, updateConsent } from "@/lib/privacy/consent";
import {
  assertNoRawImagesInStorage,
  createDataInventory,
  createDeletionConfirmation,
  createNonRawPrivacyExport,
  getNetworkUploadStatus,
  verifyDeletionState
} from "@/lib/privacy/data-lifecycle";
import {
  RETENTION_POLICY_VERSION,
  createConsentRevocationRetentionPlan,
  createFrameSelectionRetentionPlan,
  createProfileCreationRetentionPlan,
  createRefinementCompletionRetentionPlan,
  createRejectedFrameRetentionPlan,
  getDerivedProfileStoragePolicy,
  isCloudSaveEnabled,
  isModelTrainingUseAllowed,
  removeRawImagesFromCaptureSession,
  runRetentionExpirationJob,
  validateDiagnosticLogPayload
} from "@/lib/privacy/retention-policy";
import { createInitialScreenshotRefinementSession, setScreenshot } from "@/lib/refinement/screenshot-refinement";
import type { CapturedAngleID, SavedBuild, StandardFaceProfile } from "@/types/domain";

describe("consent architecture", () => {
  it("versions separate consent records", () => {
    const consent = updateConsent(createInitialConsentState(new Date("2026-07-10T00:00:00.000Z")), "cameraUse", true, new Date("2026-07-10T01:00:00.000Z"));
    expect(consent.cameraUse.version).toBe(CONSENT_VERSION);
    expect(consent.cameraUse.granted).toBe(true);
    expect(consent.cameraUse.updatedAt).toBe("2026-07-10T01:00:00.000Z");
  });

  it("keeps required, optional, and unavailable consent controls separate", () => {
    expect(CONSENT_DEFINITIONS.map((definition) => definition.id)).toEqual([
      "cameraUse",
      "currentFaceAnalysis",
      "temporaryProcessing",
      "ageEligibility",
      "subjectPermission",
      "saveDerivedProfile",
      "cloudBackup",
      "saveRawImages",
      "saveCompletedBuild",
      "saveScreenshots",
      "futureProductImprovement",
      "futureModelTraining",
      "marketingOrSharing"
    ]);
    expect(CONSENT_DEFINITIONS.find((definition) => definition.id === "cloudBackup")?.available).toBe(false);
    expect(CONSENT_DEFINITIONS.find((definition) => definition.id === "saveRawImages")?.available).toBe(false);
    expect(CONSENT_DEFINITIONS.find((definition) => definition.id === "futureProductImprovement")?.available).toBe(false);
    expect(CONSENT_DEFINITIONS.find((definition) => definition.id === "futureModelTraining")?.available).toBe(false);
    expect(CONSENT_DEFINITIONS.find((definition) => definition.id === "marketingOrSharing")?.available).toBe(false);
  });

  it("requires camera, current analysis, and temporary processing before capture", () => {
    let consent = createInitialConsentState();
    expect(hasRequiredCaptureConsent(consent)).toBe(false);
    consent = updateConsent(consent, "cameraUse", true);
    consent = updateConsent(consent, "currentFaceAnalysis", true);
    consent = updateConsent(consent, "temporaryProcessing", true);
    consent = updateConsent(consent, "ageEligibility", true);
    consent = updateConsent(consent, "subjectPermission", true);
    expect(hasRequiredCaptureConsent(consent)).toBe(true);
  });

  it("does not grant unavailable future consent", () => {
    let consent = createInitialConsentState();
    consent = updateConsent(consent, "cloudBackup", true);
    consent = updateConsent(consent, "saveRawImages", true);
    consent = updateConsent(consent, "futureModelTraining", true);
    consent = updateConsent(consent, "marketingOrSharing", true);
    expect(consent.cloudBackup.granted).toBe(false);
    expect(consent.saveRawImages.granted).toBe(false);
    expect(consent.futureModelTraining.granted).toBe(false);
    expect(consent.marketingOrSharing.granted).toBe(false);
  });
});

describe("local privacy store", () => {
  it("deletes the active session", () => {
    const store = createMemoryPrivacyStore();
    store.setCurrentSessionImages([
      {
        objectUrl: "blob:test",
        fileName: "front.jpg",
        fileType: "image/jpeg",
        fileSizeBytes: 10,
        width: 800,
        height: 800,
        signature: "front",
        source: "upload",
        orientation: "square",
        associatedAngleID: "straightOn",
        createdAt: "2026-07-10T00:00:00.000Z"
      }
    ]);
    store.deleteCurrentSession();
    expect(store.getCurrentSessionImages()).toEqual([]);
  });

  it("deletes saved builds", () => {
    const store = createMemoryPrivacyStore();
    store.saveBuild(savedBuild);
    expect(store.getSavedBuilds()).toHaveLength(1);
    store.deleteSavedBuild("saved-build");
    expect(store.getSavedBuilds()).toEqual([]);
  });

  it("deletes all saved builds", () => {
    const store = createMemoryPrivacyStore();
    store.saveBuild(savedBuild);
    store.deleteSavedBuilds();
    expect(store.getSavedBuilds()).toEqual([]);
  });

  it("deletes derived profiles", () => {
    const store = createMemoryPrivacyStore();
    store.saveDerivedProfile(profile);
    expect(store.getDerivedProfiles()).toHaveLength(1);
    store.deleteDerivedProfile(profile.id);
    expect(store.getDerivedProfiles()).toEqual([]);
  });

  it("deletes screenshot session references", () => {
    const store = createMemoryPrivacyStore();
    store.setScreenshotSessionImages([
      {
        viewID: "front",
        objectUrl: "blob:screenshot",
        fileName: "front.png",
        fileType: "image/png",
        fileSizeBytes: 100,
        width: 800,
        height: 800,
        createdAt: "2026-07-10T00:00:00.000Z"
      }
    ]);
    expect(store.getScreenshotSessionImages()).toHaveLength(1);
    store.deleteScreenshotSession();
    expect(store.getScreenshotSessionImages()).toEqual([]);
  });

  it("deletes all local data and records completion", () => {
    const store = createMemoryPrivacyStore();
    store.saveDerivedProfile(profile);
    store.saveBuild(savedBuild);
    store.deleteAllLocalData();
    expect(store.getDerivedProfiles()).toEqual([]);
    expect(store.getSavedBuilds()).toEqual([]);
    expect(store.getDeletionRecords()).toHaveLength(1);
  });

  it("does not expose raw image persistence through browser local storage", () => {
    const store = createBrowserLocalPrivacyStore(memoryStorage());
    expect("setCurrentSessionImages" in store).toBe(false);
  });

  it("keeps raw images absent from browser localStorage", () => {
    const storage = memoryStorage();
    const store = createBrowserLocalPrivacyStore(storage);
    store.saveBuild(savedBuild);
    store.saveConsentState(createInitialConsentState());
    expect(assertNoRawImagesInStorage(storage)).toEqual({ passed: true, unsafeMatches: [] });
  });

  it("falls back safely when browser localStorage contains malformed or oversized JSON", () => {
    const storage = memoryStorage();
    const store = createBrowserLocalPrivacyStore(storage);

    storage.setItem("gameface-match:saved-builds", "{not-json");
    storage.setItem("gameface-match:consent", "x".repeat(300 * 1024));
    storage.setItem("gameface-match:preferences", "[");
    storage.setItem("gameface-match:deletion-records", "[");

    expect(store.getSavedBuilds()).toEqual([]);
    expect(store.getConsentState()).toBeNull();
    expect(store.getApplicationPreferences()).toEqual({});
    expect(store.getDeletionRecords()).toEqual([]);
  });

  it("saves derived profiles only through explicit browser profile storage without raw media", async () => {
    const storage = memoryStorage();
    const store = createBrowserSavedProfileStorage(storage, globalThis.crypto ?? null);
    expect(store.listProfileSummaries()).toEqual([]);

    const result = await store.saveProfile(profile, new Date("2026-07-10T02:00:00.000Z"));
    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      profileID: profile.id,
      savedAt: "2026-07-10T02:00:00.000Z"
    });
    expect(store.listProfileSummaries()).toHaveLength(1);
    expect(assertNoRawImagesInStorage(storage)).toEqual({ passed: true, unsafeMatches: [] });

    const loaded = await store.loadProfile(profile.id);
    expect(loaded.error).toBeNull();
    expect(loaded.profile?.id).toBe(profile.id);

    expect(store.deleteProfile(profile.id)).toBe(true);
    expect(store.listProfileSummaries()).toEqual([]);
  });

  it("uses an explicit session-only fallback when WebCrypto is unavailable", async () => {
    const storage = memoryStorage();
    const store = createBrowserSavedProfileStorage(storage, null);
    const result = await store.saveProfile(profile);
    expect(result.ok).toBe(true);
    expect(result.summary?.encryptionStatus).toBe("unavailable");
    expect(store.getStatus()).toMatchObject({
      storageLocation: "browser-session-storage",
      encryptionAvailable: false,
      storedProfileCount: 1
    });
    expect(assertNoRawImagesInStorage(storage)).toEqual({ passed: true, unsafeMatches: [] });
  });

  it("deletes all saved profiles from browser profile storage", async () => {
    const storage = memoryStorage();
    const store = createBrowserSavedProfileStorage(storage, null);
    await store.saveProfile(profile);
    expect(storage.getItem(SAVED_PROFILE_STORAGE_KEY)).toBeTruthy();
    store.deleteAllProfiles();
    expect(storage.getItem(SAVED_PROFILE_STORAGE_KEY)).toBeNull();
  });
});

describe("data lifecycle inventory and deletion verification", () => {
  it("reports local inventory accurately", () => {
    const session = createInitialCaptureSession();
    const screenshotSession = setScreenshot(createInitialScreenshotRefinementSession(), {
      viewID: "front",
      fileName: "front.png",
      fileType: "image/png",
      fileSizeBytes: 1_000_000,
      width: 1280,
      height: 720,
      objectUrl: "blob:front"
    }).session;
    const inventory = createDataInventory({
      consentState: updateConsent(createInitialConsentState(), "cameraUse", true),
      captureSession: session,
      attributes: {
        ...createInitialAttributeConfirmation(),
        hairColorFamily: "brown"
      },
      derivedProfile: profile,
      savedBuilds: [savedBuild],
      screenshotSession,
      deletionRecords: [{ scope: "saved-build", completedAt: "2026-07-10T00:00:00.000Z" }],
      preferences: { preferredTheme: "system" },
      savedProfileCount: 1,
      savedProfileStorageLocation: "Browser sessionStorage profile vault",
      savedProfileEncryptionDescription: "Encrypted with WebCrypto where available."
    });
    expect(inventory.find((item) => item.id === "user-confirmed-attributes")?.count).toBe(1);
    expect(inventory.find((item) => item.id === "derived-profile")?.currentlyStored).toBe(true);
    expect(inventory.find((item) => item.id === "saved-profiles")?.count).toBe(1);
    expect(inventory.find((item) => item.id === "saved-builds")?.count).toBe(1);
    expect(inventory.find((item) => item.id === "screenshot-refinement-session")?.count).toBe(1);
    expect(inventory.every((item) => item.uploaded === false)).toBe(true);
    expect(inventory.every((item) => item.leavesDevice === false)).toBe(true);
    expect(inventory.every((item) => item.purpose.length > 0)).toBe(true);
    expect(inventory.every((item) => item.deletionDescription.length > 0)).toBe(true);
    expect(inventory.find((item) => item.id === "captured-image-bytes")?.retention).toContain("Never written to localStorage");
  });

  it("verifies delete-all behavior", () => {
    const result = verifyDeletionState(
      {
        consentState: createInitialConsentState(),
        captureSession: createInitialCaptureSession(),
        attributes: createInitialAttributeConfirmation(),
        derivedProfile: null,
        savedBuilds: [],
        screenshotSession: createInitialScreenshotRefinementSession(),
        deletionRecords: [],
        preferences: {}
      },
      "all-local-data"
    );
    expect(result.passed).toBe(true);
  });

  it("requires explicit deletion confirmation", () => {
    expect(createDeletionConfirmation("all-local-data")).toMatchObject({
      confirmationRequired: true,
      title: "Delete all local data?"
    });
  });

  it("documents no network upload behavior", () => {
    expect(getNetworkUploadStatus()).toEqual({
      uploadsEnabled: false,
      uploadedBytes: 0,
      uploadedCategories: []
    });
  });

  it("exports saved non-raw data without raw media, landmarks, embeddings, or precise measurements", () => {
    const consentState = updateConsent(updateConsent(createInitialConsentState(), "saveCompletedBuild", true), "saveDerivedProfile", true);
    const exportPayload = createNonRawPrivacyExport(
      {
        consentState,
        captureSession: createInitialCaptureSession(),
        attributes: {
          ...createInitialAttributeConfirmation(),
          hairColorFamily: "brown"
        },
        derivedProfile: profile,
        savedBuilds: [savedBuild],
        screenshotSession: createInitialScreenshotRefinementSession(),
        deletionRecords: [{ scope: "saved-build", completedAt: "2026-07-10T00:00:00.000Z" }],
        preferences: { preferredTheme: "system" },
        savedProfileCount: 1,
        savedProfileSummaries: [
          {
            profileID: profile.id,
            savedAt: "2026-07-10T02:00:00.000Z",
            encryptionStatus: "encrypted"
          }
        ]
      },
      new Date("2026-07-14T00:00:00.000Z")
    );
    const serialized = JSON.stringify(exportPayload);

    expect(exportPayload.exportVersion).toBe("gameface-match-non-raw-export-v1");
    expect(exportPayload.consentVersion).toBe(CONSENT_VERSION);
    expect(exportPayload.savedBuilds).toEqual([
      {
        id: "saved-build",
        createdAt: "2026-07-10T00:00:00.000Z",
        profileVersion: "unit-test",
        catalogVersionID: null,
        buildInstructionCount: 0
      }
    ]);
    expect(exportPayload.savedProfiles[0]).toMatchObject({ profileID: profile.id, encryptionStatus: "encrypted" });
    expect(exportPayload.privacyAssertions.join(" ")).toMatch(/excludes raw face images/i);
    expect(serialized).not.toMatch(/data:image|blob:http|objectUrl|landmarkCoordinates|identityEmbedding|faceVector|cameraFrame/i);
    expect(serialized).not.toMatch(/"measurements":|"geometry":|jawWidth|faceWidth|noseWidth|mouthWidth/i);
  });
});

describe("enforceable retention policies", () => {
  it("versions the retention policy and records raw-video deletion after frame selection", () => {
    const actions = createFrameSelectionRetentionPlan();
    expect(RETENTION_POLICY_VERSION).toBe("web-mvp-retention-v1");
    expect(actions).toEqual([
      expect.objectContaining({
        event: "frameSelectionCompleted",
        scope: "raw-videos",
        deletionAuditScope: "raw-videos"
      })
    ]);
  });

  it("deletes rejected frames immediately", () => {
    const actions = createRejectedFrameRetentionPlan({ objectUrl: "blob:rejected-frame", fileName: "blurred-front.jpg" });
    expect(actions[0]).toMatchObject({
      event: "captureFrameRejected",
      scope: "rejected-frames",
      objectUrlsToRevoke: ["blob:rejected-frame"],
      deletionAuditScope: "rejected-frames"
    });
  });

  it("deletes selected raw frames after profile creation while preserving non-image capture status", () => {
    const session = sessionWithImage("straightOn", "blob:selected-front");
    const actions = createProfileCreationRetentionPlan(session);
    const retainedSession = removeRawImagesFromCaptureSession(session);

    expect(actions[0]).toMatchObject({
      event: "profileCreated",
      scope: "temporary-images",
      objectUrlsToRevoke: ["blob:selected-front"],
      deletionAuditScope: "temporary-images"
    });
    expect(retainedSession.angles.find((angle) => angle.id === "straightOn")?.status).toBe("complete");
    expect(retainedSession.angles.find((angle) => angle.id === "straightOn")?.image).toBeUndefined();
  });

  it("deletes screenshot session media after refinement completes", () => {
    const session = setScreenshot(createInitialScreenshotRefinementSession(), {
      viewID: "front",
      fileName: "front.png",
      fileType: "image/png",
      fileSizeBytes: 1_000_000,
      width: 1280,
      height: 720,
      objectUrl: "blob:screenshot-front"
    }).session;
    const actions = createRefinementCompletionRetentionPlan(session);
    expect(actions[0]).toMatchObject({
      event: "refinementCompleted",
      scope: "screenshot-session",
      objectUrlsToRevoke: ["blob:screenshot-front"],
      deletionAuditScope: "screenshot-session"
    });
  });

  it("keeps derived profiles local-only by default and requires unavailable cloud opt-in", () => {
    const consent = createInitialConsentState();
    expect(getDerivedProfileStoragePolicy(consent)).toEqual({
      localOnlyByDefault: true,
      cloudSaveEnabled: false,
      cloudSaveRequiresConsentID: "cloudBackup",
      rawMediaIncluded: false,
      consentVersion: CONSENT_VERSION
    });
    expect(isCloudSaveEnabled(updateConsent(consent, "cloudBackup", true))).toBe(false);
  });

  it("keeps model-training use disabled without separate available consent", () => {
    const consent = updateConsent(createInitialConsentState(), "futureModelTraining", true);
    expect(isModelTrainingUseAllowed(consent)).toBe(false);
  });

  it("creates retention actions for consent revocation", () => {
    expect(createConsentRevocationRetentionPlan("saveDerivedProfile")[0]).toMatchObject({
      event: "consentRevoked",
      scope: "saved-profiles"
    });
    expect(createConsentRevocationRetentionPlan("saveCompletedBuild")[0]).toMatchObject({
      event: "consentRevoked",
      scope: "saved-builds"
    });
    expect(createConsentRevocationRetentionPlan("futureModelTraining")).toEqual([]);
  });

  it("runs expiration jobs for active session and screenshot media", () => {
    const captureSession = sessionWithImage("straightOn", "blob:expired-capture");
    const screenshotSession = setScreenshot(createInitialScreenshotRefinementSession(), {
      viewID: "front",
      fileName: "front.png",
      fileType: "image/png",
      fileSizeBytes: 1_000_000,
      width: 1280,
      height: 720,
      objectUrl: "blob:expired-screenshot"
    }).session;
    const actions = runRetentionExpirationJob({
      now: new Date("2026-07-14T02:00:00.000Z"),
      captureSession,
      captureSessionExpiresAt: new Date("2026-07-14T01:59:59.000Z"),
      screenshotSession,
      screenshotSessionExpiresAt: new Date("2026-07-14T01:59:59.000Z")
    });
    expect(actions.map((action) => action.scope)).toEqual(["active-capture-session", "screenshot-session"]);
    expect(actions.flatMap((action) => action.objectUrlsToRevoke)).toEqual(["blob:expired-capture", "blob:expired-screenshot"]);
  });

  it("records deletion audit scopes for retention-only media categories", () => {
    const store = createMemoryPrivacyStore();
    store.recordDeletionCompletion("raw-videos");
    store.recordDeletionCompletion("rejected-frames");
    store.recordDeletionCompletion("diagnostic-logs");
    expect(store.getDeletionRecords().map((record) => record.scope)).toEqual(["raw-videos", "rejected-frames", "diagnostic-logs"]);
  });

  it("blocks diagnostic logs containing biometric media or measurements", () => {
    expect(validateDiagnosticLogPayload({ event: "capture_completed", angleCount: 5 })).toEqual({
      allowed: true,
      blockedReasons: []
    });
    const result = validateDiagnosticLogPayload({
      event: "capture_failed",
      objectUrl: "blob:front",
      landmarks: [{ x: 1, y: 2 }],
      measurementSummary: { jawWidth: 0.4 }
    });
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons.join(" ")).toMatch(/objectUrl|landmarks|measurementSummary/);
  });
});

const profile: StandardFaceProfile = {
  ...createStandardFaceProfile({
    session: createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z")),
    attributes: createInitialAttributeConfirmation(),
    now: new Date("2026-07-10T00:00:00.000Z"),
    userAgent: "unit-test"
  })
};

const savedBuild: SavedBuild = {
  id: "saved-build",
  createdAt: "2026-07-10T00:00:00.000Z",
  profileVersion: "unit-test",
  buildInstructions: []
};

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

function sessionWithImage(angleID: CapturedAngleID, objectUrl: string) {
  const session = createInitialCaptureSession(new Date("2026-07-10T00:00:00.000Z"));
  return setAngleCapture(
    session,
    angleID,
    createTemporaryImageReference(
      {
        objectUrl,
        fileName: `${angleID}.jpg`,
        fileType: "image/jpeg",
        fileSizeBytes: 1_000_000,
        width: 1000,
        height: 1000,
        associatedAngleID: angleID,
        source: "upload",
        createdAt: "2026-07-10T00:00:00.000Z"
      },
      `${angleID}-signature`
    ),
    "upload"
  ).session;
}
