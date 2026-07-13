import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import type { ConsentState } from "@/lib/privacy/consent";
import type { AttributeConfirmationState } from "@/lib/profile/attribute-confirmation";
import type { SavedBuild, StandardFaceProfile } from "@/types/domain";
import type { ScreenshotRefinementSession } from "@/lib/refinement/screenshot-refinement";

export type DeletionScope =
  | "active-capture-session"
  | "temporary-images"
  | "derived-profile"
  | "saved-profile"
  | "saved-profiles"
  | "saved-build"
  | "saved-builds"
  | "screenshot-session"
  | "application-preferences"
  | "all-local-data";

export interface DeletionRecord {
  scope: DeletionScope;
  completedAt: string;
}

export interface ApplicationPreferences {
  reducedMotion?: boolean;
  preferredTheme?: "system" | "light";
}

export interface DataInventoryInput {
  consentState: ConsentState;
  captureSession: ActiveCaptureSession;
  attributes: AttributeConfirmationState;
  derivedProfile: StandardFaceProfile | null;
  savedBuilds: SavedBuild[];
  screenshotSession: ScreenshotRefinementSession;
  deletionRecords: DeletionRecord[];
  preferences: ApplicationPreferences;
  savedProfileCount?: number;
  savedProfileStorageLocation?: string;
  savedProfileEncryptionDescription?: string;
}

export interface DataInventoryItem {
  id:
    | "consent-version"
    | "capture-session-metadata"
    | "temporary-blob-urls"
    | "captured-image-bytes"
    | "user-confirmed-attributes"
    | "derived-profile"
    | "saved-profiles"
    | "saved-builds"
    | "screenshot-refinement-session"
    | "deletion-records"
    | "application-preferences";
  label: string;
  currentlyStored: boolean;
  count: number;
  storageLocation: string;
  uploaded: boolean;
  retention: string;
  deleteAction?: DeletionScope;
}

export interface DeletionVerificationResult {
  passed: boolean;
  messages: string[];
}

export function createDataInventory(input: DataInventoryInput): DataInventoryItem[] {
  const captureImageCount = input.captureSession.angles.filter((angle) => angle.image).length;
  const hasCaptureActivity =
    captureImageCount > 0 ||
    input.captureSession.currentAngleID !== "straightOn" ||
    input.captureSession.angles.some(
      (angle) =>
        angle.status !== "empty" ||
        angle.validationStatus !== "notStarted" ||
        angle.manualConfirmation.neutralExpression ||
        angle.manualConfirmation.onePerson ||
        angle.manualConfirmation.requestedAngle
    );
  const screenshotCount = input.screenshotSession.slots.filter((slot) => slot.screenshot).length;
  const attributeCount = Object.values(input.attributes).filter((value) => String(value ?? "").trim() !== "" && value !== "unspecified").length;
  const preferenceCount = Object.keys(input.preferences).length;

  return [
    {
      id: "consent-version",
      label: "Consent version",
      currentlyStored: true,
      count: Object.values(input.consentState).filter((record) => record.granted).length,
      storageLocation: "React session memory for this MVP",
      uploaded: false,
      retention: "Until the tab reloads or all local data is deleted.",
      deleteAction: "all-local-data"
    },
    {
      id: "capture-session-metadata",
      label: "Capture-session metadata",
      currentlyStored: hasCaptureActivity,
      count: hasCaptureActivity ? 1 : 0,
      storageLocation: "React session memory",
      uploaded: false,
      retention: "Active session only.",
      deleteAction: "active-capture-session"
    },
    {
      id: "temporary-blob-urls",
      label: "Temporary Blob URLs",
      currentlyStored: captureImageCount > 0,
      count: captureImageCount,
      storageLocation: "Browser memory/object URL registry",
      uploaded: false,
      retention: "Until retake, removal, session cancellation, or delete-all.",
      deleteAction: "temporary-images"
    },
    {
      id: "captured-image-bytes",
      label: "Captured image bytes in memory",
      currentlyStored: captureImageCount > 0,
      count: captureImageCount,
      storageLocation: "File/Blob objects and object URLs in active browser memory only",
      uploaded: false,
      retention: "Active session only. Never written to localStorage.",
      deleteAction: "temporary-images"
    },
    {
      id: "user-confirmed-attributes",
      label: "User-confirmed attributes",
      currentlyStored: attributeCount > 0,
      count: attributeCount,
      storageLocation: "React session memory",
      uploaded: false,
      retention: "Active session only unless included in a saved non-image build.",
      deleteAction: "active-capture-session"
    },
    {
      id: "derived-profile",
      label: "Current derived profile",
      currentlyStored: Boolean(input.derivedProfile),
      count: input.derivedProfile ? 1 : 0,
      storageLocation: "React session memory",
      uploaded: false,
      retention: "Current recommendation only unless the user explicitly saves it.",
      deleteAction: "derived-profile"
    },
    {
      id: "saved-profiles",
      label: "Saved derived profiles",
      currentlyStored: (input.savedProfileCount ?? 0) > 0,
      count: input.savedProfileCount ?? 0,
      storageLocation: input.savedProfileStorageLocation ?? "Browser sessionStorage profile vault",
      uploaded: false,
      retention: `Only after explicit save. ${input.savedProfileEncryptionDescription ?? "Encrypted with WebCrypto where available."}`,
      deleteAction: "saved-profiles"
    },
    {
      id: "saved-builds",
      label: "Saved builds",
      currentlyStored: input.savedBuilds.length > 0,
      count: input.savedBuilds.length,
      storageLocation: "Local non-image privacy store for this MVP",
      uploaded: false,
      retention: "Until the user deletes one build, all builds, or all local data.",
      deleteAction: "saved-builds"
    },
    {
      id: "screenshot-refinement-session",
      label: "Screenshot-refinement session",
      currentlyStored: screenshotCount > 0,
      count: screenshotCount,
      storageLocation: "Browser memory/object URL registry",
      uploaded: false,
      retention: "Temporary session only. Screenshot saving is not implemented.",
      deleteAction: "screenshot-session"
    },
    {
      id: "deletion-records",
      label: "Deletion records",
      currentlyStored: input.deletionRecords.length > 0,
      count: input.deletionRecords.length,
      storageLocation: "Local deletion log without face images",
      uploaded: false,
      retention: "Kept locally to show deletion completion.",
      deleteAction: "all-local-data"
    },
    {
      id: "application-preferences",
      label: "Application preferences",
      currentlyStored: preferenceCount > 0,
      count: preferenceCount,
      storageLocation: "Local preference memory; browser localStorage only for future non-sensitive preferences",
      uploaded: false,
      retention: "Until preferences or all local data are deleted.",
      deleteAction: "application-preferences"
    }
  ];
}

export function createDeletionRecord(scope: DeletionScope, now = new Date()): DeletionRecord {
  return {
    scope,
    completedAt: now.toISOString()
  };
}

export function createDeletionConfirmation(scope: DeletionScope) {
  return {
    scope,
    title: scope === "all-local-data" ? "Delete all local data?" : `Delete ${scope.replaceAll("-", " ")}?`,
    confirmationRequired: true
  };
}

export function verifyDeletionState(input: DataInventoryInput, scope: DeletionScope): DeletionVerificationResult {
  const inventory = createDataInventory(input);
  const failures: string[] = [];
  const check = (id: DataInventoryItem["id"]) => {
    const item = inventory.find((candidate) => candidate.id === id);
    if (item?.currentlyStored) failures.push(`${item.label} still stored.`);
  };

  if (scope === "active-capture-session" || scope === "all-local-data") {
    check("capture-session-metadata");
    check("temporary-blob-urls");
    check("captured-image-bytes");
    check("user-confirmed-attributes");
  }
  if (scope === "temporary-images") {
    check("temporary-blob-urls");
    check("captured-image-bytes");
  }
  if (scope === "derived-profile" || scope === "all-local-data") check("derived-profile");
  if (scope === "saved-profile" || scope === "saved-profiles" || scope === "all-local-data") check("saved-profiles");
  if (scope === "saved-build" || scope === "saved-builds" || scope === "all-local-data") check("saved-builds");
  if (scope === "screenshot-session" || scope === "all-local-data") check("screenshot-refinement-session");
  if (scope === "application-preferences" || scope === "all-local-data") check("application-preferences");

  return {
    passed: failures.length === 0,
    messages: failures.length === 0 ? [`${scope} deletion verified.`] : failures
  };
}

export function assertNoRawImagesInStorage(storage: Storage) {
  const unsafeMatches: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    const value = key ? storage.getItem(key) ?? "" : "";
    if (/data:image|blob:|objectUrl|fileSizeBytes|associatedAngleID/i.test(value)) {
      unsafeMatches.push(key ?? `index-${index}`);
    }
  }
  return {
    passed: unsafeMatches.length === 0,
    unsafeMatches
  };
}

export function getNetworkUploadStatus() {
  return {
    uploadsEnabled: false,
    uploadedBytes: 0,
    uploadedCategories: [] as string[]
  };
}
