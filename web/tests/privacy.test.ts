import { describe, expect, it } from "vitest";
import { createBrowserLocalPrivacyStore, createMemoryPrivacyStore } from "@/lib/privacy/local-privacy-store";
import { createBrowserSavedProfileStorage, SAVED_PROFILE_STORAGE_KEY } from "@/lib/privacy/profile-storage";
import { createInitialCaptureSession } from "@/lib/capture/capture-session";
import { createInitialAttributeConfirmation } from "@/lib/profile/attribute-confirmation";
import { createStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import { CONSENT_DEFINITIONS, CONSENT_VERSION, createInitialConsentState, hasRequiredCaptureConsent, updateConsent } from "@/lib/privacy/consent";
import {
  assertNoRawImagesInStorage,
  createDataInventory,
  createDeletionConfirmation,
  getNetworkUploadStatus,
  verifyDeletionState
} from "@/lib/privacy/data-lifecycle";
import { createInitialScreenshotRefinementSession, setScreenshot } from "@/lib/refinement/screenshot-refinement";
import type { SavedBuild, StandardFaceProfile } from "@/types/domain";

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
      "saveDerivedProfile",
      "saveCompletedBuild",
      "saveScreenshots",
      "futureProductImprovement",
      "futureModelTraining"
    ]);
    expect(CONSENT_DEFINITIONS.find((definition) => definition.id === "futureProductImprovement")?.available).toBe(false);
    expect(CONSENT_DEFINITIONS.find((definition) => definition.id === "futureModelTraining")?.available).toBe(false);
  });

  it("requires camera, current analysis, and temporary processing before capture", () => {
    let consent = createInitialConsentState();
    expect(hasRequiredCaptureConsent(consent)).toBe(false);
    consent = updateConsent(consent, "cameraUse", true);
    consent = updateConsent(consent, "currentFaceAnalysis", true);
    consent = updateConsent(consent, "temporaryProcessing", true);
    expect(hasRequiredCaptureConsent(consent)).toBe(true);
  });

  it("does not grant unavailable future consent", () => {
    const consent = updateConsent(createInitialConsentState(), "futureModelTraining", true);
    expect(consent.futureModelTraining.granted).toBe(false);
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
