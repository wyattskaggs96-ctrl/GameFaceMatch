import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import { CONSENT_DEFINITIONS, CONSENT_VERSION, type ConsentState } from "@/lib/privacy/consent";
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
  purpose: string;
  uploaded: boolean;
  leavesDevice: boolean;
  retention: string;
  deletionDescription: string;
  deleteAction?: DeletionScope;
}

export interface DeletionVerificationResult {
  passed: boolean;
  messages: string[];
}

export interface NonRawPrivacyExportInput extends DataInventoryInput {
  savedProfileSummaries?: Array<{
    profileID: string;
    savedAt: string;
    encryptionStatus: string;
  }>;
}

export interface NonRawPrivacyExport {
  exportVersion: "gameface-match-non-raw-export-v1";
  exportedAt: string;
  consentVersion: string;
  consent: Array<{
    id: string;
    label: string;
    granted: boolean;
    available: boolean;
    requiredForCapture: boolean;
    updatedAt: string | null;
  }>;
  inventory: Array<{
    id: DataInventoryItem["id"];
    label: string;
    currentlyStored: boolean;
    count: number;
    storageLocation: string;
    retention: string;
    leavesDevice: boolean;
  }>;
  savedProfiles: Array<{
    profileID: string;
    savedAt: string;
    encryptionStatus: string;
  }>;
  savedBuilds: Array<{
    id: string;
    createdAt: string;
    profileVersion: string;
    catalogVersionID: string | null;
    buildInstructionCount: number;
  }>;
  deletionRecords: DeletionRecord[];
  preferences: ApplicationPreferences;
  privacyAssertions: string[];
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
      purpose: "Records which separate consent acknowledgments are currently active in this tab.",
      uploaded: false,
      leavesDevice: false,
      retention: "Until the tab reloads or all local data is deleted.",
      deletionDescription: "Use Delete everything local to reset all consent acknowledgments.",
      deleteAction: "all-local-data"
    },
    {
      id: "capture-session-metadata",
      label: "Capture-session metadata",
      currentlyStored: hasCaptureActivity,
      count: hasCaptureActivity ? 1 : 0,
      storageLocation: "React session memory",
      purpose: "Tracks angle completion, retake state, quality state, and non-image capture progress.",
      uploaded: false,
      leavesDevice: false,
      retention: "Active session only.",
      deletionDescription: "Delete the active capture session or delete everything local.",
      deleteAction: "active-capture-session"
    },
    {
      id: "temporary-blob-urls",
      label: "Temporary Blob URLs",
      currentlyStored: captureImageCount > 0,
      count: captureImageCount,
      storageLocation: "Browser memory/object URL registry",
      purpose: "Shows selected or captured images during the active review flow without writing bytes to localStorage.",
      uploaded: false,
      leavesDevice: false,
      retention: "Until retake, removal, session cancellation, or delete-all.",
      deletionDescription: "Delete temporary images, delete the active capture session, retake/remove an angle, or delete everything local.",
      deleteAction: "temporary-images"
    },
    {
      id: "captured-image-bytes",
      label: "Captured image bytes in memory",
      currentlyStored: captureImageCount > 0,
      count: captureImageCount,
      storageLocation: "File/Blob objects and object URLs in active browser memory only",
      purpose: "Temporarily supports local quality review, landmark processing, profile creation, and user review.",
      uploaded: false,
      leavesDevice: false,
      retention: "Active session only. Never written to localStorage.",
      deletionDescription: "Delete temporary images, delete the active capture session, retake/remove an angle, or delete everything local.",
      deleteAction: "temporary-images"
    },
    {
      id: "user-confirmed-attributes",
      label: "User-confirmed attributes",
      currentlyStored: attributeCount > 0,
      count: attributeCount,
      storageLocation: "React session memory",
      purpose: "Keeps user-confirmed appearance preferences separate from model estimates.",
      uploaded: false,
      leavesDevice: false,
      retention: "Active session only unless included in a saved non-image build.",
      deletionDescription: "Delete the active capture session or delete everything local.",
      deleteAction: "active-capture-session"
    },
    {
      id: "derived-profile",
      label: "Current derived profile",
      currentlyStored: Boolean(input.derivedProfile),
      count: input.derivedProfile ? 1 : 0,
      storageLocation: "React session memory",
      purpose: "Holds the current non-image standardized profile needed to show blocked results or save an explicit profile.",
      uploaded: false,
      leavesDevice: false,
      retention: "Current recommendation only unless the user explicitly saves it.",
      deletionDescription: "Delete the current derived profile or delete everything local.",
      deleteAction: "derived-profile"
    },
    {
      id: "saved-profiles",
      label: "Saved derived profiles",
      currentlyStored: (input.savedProfileCount ?? 0) > 0,
      count: input.savedProfileCount ?? 0,
      storageLocation: input.savedProfileStorageLocation ?? "Browser sessionStorage profile vault",
      purpose: "Stores only explicit non-image derived profile saves for this browser session.",
      uploaded: false,
      leavesDevice: false,
      retention: `Only after explicit save. ${input.savedProfileEncryptionDescription ?? "Encrypted with WebCrypto where available."}`,
      deletionDescription: "Delete one saved profile, delete all saved profiles, or delete everything local.",
      deleteAction: "saved-profiles"
    },
    {
      id: "saved-builds",
      label: "Saved builds",
      currentlyStored: input.savedBuilds.length > 0,
      count: input.savedBuilds.length,
      storageLocation: "Local non-image privacy store for this MVP",
      purpose: "Stores non-image build records and catalog traceability only when the user saves a build.",
      uploaded: false,
      leavesDevice: false,
      retention: "Until the user deletes one build, all builds, or all local data.",
      deletionDescription: "Delete one saved build, delete all saved builds, or delete everything local.",
      deleteAction: "saved-builds"
    },
    {
      id: "screenshot-refinement-session",
      label: "Screenshot-refinement session",
      currentlyStored: screenshotCount > 0,
      count: screenshotCount,
      storageLocation: "Browser memory/object URL registry",
      purpose: "Temporarily supports local screenshot-refinement intake and validation.",
      uploaded: false,
      leavesDevice: false,
      retention: "Temporary session only. Screenshot saving is not implemented.",
      deletionDescription: "Delete the screenshot session or delete everything local.",
      deleteAction: "screenshot-session"
    },
    {
      id: "deletion-records",
      label: "Deletion records",
      currentlyStored: input.deletionRecords.length > 0,
      count: input.deletionRecords.length,
      storageLocation: "Local deletion log without face images",
      purpose: "Shows the user that a local deletion action completed.",
      uploaded: false,
      leavesDevice: false,
      retention: "Kept locally to show deletion completion.",
      deletionDescription: "Delete everything local to clear deletion records too.",
      deleteAction: "all-local-data"
    },
    {
      id: "application-preferences",
      label: "Application preferences",
      currentlyStored: preferenceCount > 0,
      count: preferenceCount,
      storageLocation: "Local preference memory; browser localStorage only for future non-sensitive preferences",
      purpose: "Remembers non-sensitive display and interaction preferences.",
      uploaded: false,
      leavesDevice: false,
      retention: "Until preferences or all local data are deleted.",
      deletionDescription: "Delete application preferences or delete everything local.",
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

export function createNonRawPrivacyExport(input: NonRawPrivacyExportInput, now = new Date()): NonRawPrivacyExport {
  const inventory = createDataInventory(input);
  return {
    exportVersion: "gameface-match-non-raw-export-v1",
    exportedAt: now.toISOString(),
    consentVersion: CONSENT_VERSION,
    consent: CONSENT_DEFINITIONS.map((definition) => ({
      id: definition.id,
      label: definition.label,
      granted: Boolean(input.consentState[definition.id]?.granted),
      available: definition.available,
      requiredForCapture: definition.requiredForCapture,
      updatedAt: input.consentState[definition.id]?.updatedAt ?? null
    })),
    inventory: inventory.map((item) => ({
      id: item.id,
      label: item.label,
      currentlyStored: item.currentlyStored,
      count: item.count,
      storageLocation: item.storageLocation,
      retention: item.retention,
      leavesDevice: item.leavesDevice
    })),
    savedProfiles: input.savedProfileSummaries ?? [],
    savedBuilds: input.savedBuilds.map((build) => ({
      id: build.id,
      createdAt: build.createdAt,
      profileVersion: build.profileVersion,
      catalogVersionID: build.catalogVersion?.identifier ?? build.match?.catalogVersion.identifier ?? null,
      buildInstructionCount: build.buildInstructions.length
    })),
    deletionRecords: input.deletionRecords,
    preferences: input.preferences,
    privacyAssertions: [
      "This export excludes raw face images, screenshot images, File/Blob objects, object URLs, landmark coordinates, identity embeddings, and precise facial measurements.",
      "No face images, screenshots, profiles, or builds are uploaded by the web MVP.",
      "Saved builds contain non-image build metadata and catalog traceability only."
    ]
  };
}
