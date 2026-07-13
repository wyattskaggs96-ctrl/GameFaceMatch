import type { SavedBuild, StandardFaceProfile, TemporaryImageReference } from "@/types/domain";
import type { ConsentState } from "./consent";
import type { ApplicationPreferences, DeletionRecord, DeletionScope } from "./data-lifecycle";
import type { ScreenshotReference } from "@/lib/refinement/screenshot-refinement";
import { parseLocalStorageJSON } from "@/lib/security/security-hardening";

export interface LocalPrivacyStore {
  saveConsentState(consent: ConsentState): void;
  getConsentState(): ConsentState | null;
  setCurrentSessionImages(images: TemporaryImageReference[]): void;
  getCurrentSessionImages(): TemporaryImageReference[];
  deleteCurrentSession(): void;
  deleteTemporaryImages(): void;
  saveDerivedProfile(profile: StandardFaceProfile): void;
  getDerivedProfiles(): StandardFaceProfile[];
  deleteDerivedProfile(profileID?: string): void;
  saveBuild(build: SavedBuild): void;
  getSavedBuilds(): SavedBuild[];
  deleteSavedBuild(buildID: string): void;
  deleteSavedBuilds(): void;
  setScreenshotSessionImages(images: ScreenshotReference[]): void;
  getScreenshotSessionImages(): ScreenshotReference[];
  deleteScreenshotSession(): void;
  setApplicationPreference<K extends keyof ApplicationPreferences>(key: K, value: ApplicationPreferences[K]): void;
  getApplicationPreferences(): ApplicationPreferences;
  deleteApplicationPreferences(): void;
  deleteAllLocalData(): void;
  recordDeletionCompletion(scope: DeletionScope): void;
  getDeletionRecords(): DeletionRecord[];
}

export function createMemoryPrivacyStore(): LocalPrivacyStore {
  let consentState: ConsentState | null = null;
  let sessionImages: TemporaryImageReference[] = [];
  let derivedProfiles: StandardFaceProfile[] = [];
  let savedBuilds: SavedBuild[] = [];
  let screenshotSessionImages: ScreenshotReference[] = [];
  let preferences: ApplicationPreferences = {};
  let deletionRecords: DeletionRecord[] = [];

  return {
    saveConsentState(consent) {
      consentState = consent;
    },
    getConsentState() {
      return consentState;
    },
    setCurrentSessionImages(images) {
      sessionImages = images;
    },
    getCurrentSessionImages() {
      return sessionImages;
    },
    deleteCurrentSession() {
      sessionImages = [];
    },
    deleteTemporaryImages() {
      sessionImages = [];
    },
    saveDerivedProfile(profile) {
      derivedProfiles = [...derivedProfiles, profile];
    },
    getDerivedProfiles() {
      return derivedProfiles;
    },
    deleteDerivedProfile(profileID) {
      derivedProfiles = profileID ? derivedProfiles.filter((profile) => profile.id !== profileID) : [];
    },
    saveBuild(build) {
      savedBuilds = [...savedBuilds, build];
    },
    getSavedBuilds() {
      return savedBuilds;
    },
    deleteSavedBuild(buildID) {
      savedBuilds = savedBuilds.filter((build) => build.id !== buildID);
    },
    deleteSavedBuilds() {
      savedBuilds = [];
    },
    setScreenshotSessionImages(images) {
      screenshotSessionImages = images;
    },
    getScreenshotSessionImages() {
      return screenshotSessionImages;
    },
    deleteScreenshotSession() {
      screenshotSessionImages = [];
    },
    setApplicationPreference(key, value) {
      preferences = {
        ...preferences,
        [key]: value
      };
    },
    getApplicationPreferences() {
      return preferences;
    },
    deleteApplicationPreferences() {
      preferences = {};
    },
    deleteAllLocalData() {
      consentState = null;
      sessionImages = [];
      derivedProfiles = [];
      savedBuilds = [];
      screenshotSessionImages = [];
      preferences = {};
      deletionRecords = [
        ...deletionRecords,
        {
          scope: "all-local-data",
          completedAt: new Date().toISOString()
        }
      ];
    },
    recordDeletionCompletion(scope) {
      deletionRecords = [...deletionRecords, { scope, completedAt: new Date().toISOString() }];
    },
    getDeletionRecords() {
      return deletionRecords;
    }
  };
}

export function createBrowserLocalPrivacyStore(
  storage: Storage
): Pick<
  LocalPrivacyStore,
  | "saveConsentState"
  | "getConsentState"
  | "saveBuild"
  | "getSavedBuilds"
  | "deleteSavedBuild"
  | "deleteSavedBuilds"
  | "setApplicationPreference"
  | "getApplicationPreferences"
  | "deleteApplicationPreferences"
  | "recordDeletionCompletion"
  | "getDeletionRecords"
> {
  const consentKey = "gameface-match:consent";
  const savedBuildKey = "gameface-match:saved-builds";
  const deletionKey = "gameface-match:deletion-records";
  const preferencesKey = "gameface-match:preferences";
  return {
    saveConsentState(consent) {
      storage.setItem(consentKey, JSON.stringify(consent));
    },
    getConsentState() {
      return parseLocalStorageJSON<ConsentState | null>(storage.getItem(consentKey), null).value;
    },
    saveBuild(build) {
      const saved = this.getSavedBuilds();
      storage.setItem(savedBuildKey, JSON.stringify([...saved, build]));
    },
    getSavedBuilds() {
      return parseLocalStorageJSON<SavedBuild[]>(storage.getItem(savedBuildKey), []).value;
    },
    deleteSavedBuild(buildID) {
      storage.setItem(savedBuildKey, JSON.stringify(this.getSavedBuilds().filter((build) => build.id !== buildID)));
      this.recordDeletionCompletion("saved-build");
    },
    deleteSavedBuilds() {
      storage.removeItem(savedBuildKey);
      this.recordDeletionCompletion("saved-builds");
    },
    setApplicationPreference(key, value) {
      storage.setItem(
        preferencesKey,
        JSON.stringify({
          ...this.getApplicationPreferences(),
          [key]: value
        })
      );
    },
    getApplicationPreferences() {
      return parseLocalStorageJSON<ApplicationPreferences>(storage.getItem(preferencesKey), {}).value;
    },
    deleteApplicationPreferences() {
      storage.removeItem(preferencesKey);
      this.recordDeletionCompletion("application-preferences");
    },
    recordDeletionCompletion(scope) {
      const records = this.getDeletionRecords();
      storage.setItem(deletionKey, JSON.stringify([...records, { scope, completedAt: new Date().toISOString() }]));
    },
    getDeletionRecords() {
      return parseLocalStorageJSON<DeletionRecord[]>(storage.getItem(deletionKey), []).value;
    }
  };
}
