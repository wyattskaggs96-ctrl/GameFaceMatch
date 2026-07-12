import type { ISODateString } from "@/types/domain";
import {
  PHASE0_DOMAIN_SCHEMA_VERSION,
  validatePhase0AuditEnvironment,
  type Phase0AuditEnvironment,
  type Phase0CopyType,
  type Phase0EAAccountState,
  type Phase0HDRState,
  type Phase0Handedness,
  type Phase0LatestUpdateState
} from "./phase-zero-domain";

export const PHASE0_ENVIRONMENT_WIZARD_SCHEMA_VERSION = "phase0-environment-wizard-v1";

export type EnvironmentEvidenceSlotID =
  | "titleScreen"
  | "versionBuildScreen"
  | "consoleUpdateScreen"
  | "selectedMode"
  | "creationWorkflowStart";

export type EnvironmentWizardStatus = "draftIncomplete" | "readyToSave" | "saved";

export interface EnvironmentEvidenceSlot {
  id: EnvironmentEvidenceSlotID;
  label: string;
  required: boolean;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  evidenceFileID: string;
}

export interface Phase0EnvironmentWizardDraft {
  schemaVersion: typeof PHASE0_ENVIRONMENT_WIZARD_SCHEMA_VERSION;
  updatedAt: ISODateString;
  auditorID: string;
  platformName: string;
  consoleModel: string;
  consoleOSVersion: string;
  edition: string;
  region: string;
  storefront: string;
  copyType: Phase0CopyType;
  gameExecutableVersion: string;
  patchLabel: string;
  latestUpdateState: Phase0LatestUpdateState;
  observedAt: ISODateString;
  onlineState: "online" | "offline" | "unknown";
  eaAccountState: Phase0EAAccountState;
  resolution: string;
  hdrState: Phase0HDRState;
  displayModel: string;
  captureHardware: string;
  captureFormat: string;
  mode: string;
  exactPath: string;
  position: string;
  archetype: string;
  handedness: Phase0Handedness;
  height: string;
  weight: string;
  bodyType: string;
  entitlements: string;
  notes: string;
  evidenceSlots: Record<EnvironmentEvidenceSlotID, EnvironmentEvidenceSlot>;
}

export interface Phase0EnvironmentWizardCompletion {
  status: EnvironmentWizardStatus;
  generatedEnvironmentID: string;
  canComplete: boolean;
  sourceType: "researchDraft";
  missingCriticalFields: string[];
  missingRequiredFields: string[];
  missingEvidenceSlots: EnvironmentEvidenceSlotID[];
  messages: string[];
}

export interface Phase0EnvironmentWizardBuildResult {
  environment: Phase0AuditEnvironment | null;
  completion: Phase0EnvironmentWizardCompletion;
  errors: string[];
}

const evidenceSlotLabels: Record<EnvironmentEvidenceSlotID, string> = {
  titleScreen: "Title screen",
  versionBuildScreen: "Version/build screen",
  consoleUpdateScreen: "Console update screen",
  selectedMode: "Selected mode",
  creationWorkflowStart: "Creation-workflow start"
};

const criticalFields: Array<keyof Phase0EnvironmentWizardDraft> = ["platformName", "gameExecutableVersion", "patchLabel", "mode", "exactPath"];

const requiredFields: Array<keyof Phase0EnvironmentWizardDraft> = [
  "auditorID",
  "platformName",
  "consoleModel",
  "consoleOSVersion",
  "edition",
  "region",
  "storefront",
  "gameExecutableVersion",
  "patchLabel",
  "observedAt",
  "resolution",
  "displayModel",
  "captureHardware",
  "captureFormat",
  "mode",
  "exactPath",
  "position",
  "archetype",
  "height",
  "weight",
  "bodyType"
];

export function createEnvironmentWizardDraft(now: ISODateString = new Date().toISOString()): Phase0EnvironmentWizardDraft {
  return {
    schemaVersion: PHASE0_ENVIRONMENT_WIZARD_SCHEMA_VERSION,
    updatedAt: now,
    auditorID: "",
    platformName: "",
    consoleModel: "",
    consoleOSVersion: "",
    edition: "",
    region: "",
    storefront: "",
    copyType: "unknown",
    gameExecutableVersion: "",
    patchLabel: "",
    latestUpdateState: "unknown",
    observedAt: now,
    onlineState: "unknown",
    eaAccountState: "unknown",
    resolution: "",
    hdrState: "unknown",
    displayModel: "",
    captureHardware: "",
    captureFormat: "",
    mode: "",
    exactPath: "",
    position: "",
    archetype: "",
    handedness: "unknown",
    height: "",
    weight: "",
    bodyType: "",
    entitlements: "",
    notes: "",
    evidenceSlots: createEmptyEvidenceSlots()
  };
}

export function createEnvironmentEvidenceReference(input: {
  slotID: EnvironmentEvidenceSlotID;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  draft: Phase0EnvironmentWizardDraft;
}): EnvironmentEvidenceSlot {
  const fileStem = slugify(input.fileName.replace(/\.[^.]+$/, ""));
  const environmentStem = environmentIDStem(input.draft);
  return {
    id: input.slotID,
    label: evidenceSlotLabels[input.slotID],
    required: true,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    evidenceFileID: `${environmentStem}-${input.slotID}-${fileStem || "evidence"}`
  };
}

export function getEnvironmentWizardCompletion(draft: Phase0EnvironmentWizardDraft): Phase0EnvironmentWizardCompletion {
  const missingCriticalFields = criticalFields.filter((field) => !hasText(draft[field])).map(fieldLabel);
  const missingRequiredFields = requiredFields.filter((field) => !hasText(draft[field])).map(fieldLabel);
  const missingEvidenceSlots = requiredEvidenceSlotIDs().filter((slotID) => !hasText(draft.evidenceSlots[slotID].evidenceFileID));
  const canComplete = missingCriticalFields.length === 0 && missingRequiredFields.length === 0 && missingEvidenceSlots.length === 0;
  return {
    status: canComplete ? "readyToSave" : "draftIncomplete",
    generatedEnvironmentID: generateEnvironmentID(draft),
    canComplete,
    sourceType: "researchDraft",
    missingCriticalFields,
    missingRequiredFields,
    missingEvidenceSlots,
    messages: [
      canComplete
        ? "Environment manifest is complete enough to save as a non-production audit record."
        : "Draft is incomplete and remains non-production.",
      "Evidence slots store file references and metadata only; they do not upload or publish screenshots."
    ]
  };
}

export function buildAuditEnvironmentFromWizard(
  draft: Phase0EnvironmentWizardDraft,
  now: ISODateString = new Date().toISOString()
): Phase0EnvironmentWizardBuildResult {
  const completion = getEnvironmentWizardCompletion(draft);
  if (!completion.canComplete) {
    return { environment: null, completion, errors: ["Environment manifest is incomplete."] };
  }

  const environment: Phase0AuditEnvironment = {
    id: completion.generatedEnvironmentID,
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    kind: "consoleCapture",
    platformID: `platform-${slugify(draft.platformName)}`,
    platformName: draft.platformName.trim(),
    gameVersionID: `game-version-${slugify(draft.gameExecutableVersion)}`,
    patchID: `patch-${slugify(draft.patchLabel)}`,
    consoleModel: draft.consoleModel.trim(),
    consoleOSVersion: draft.consoleOSVersion.trim(),
    edition: draft.edition.trim(),
    region: draft.region.trim(),
    storefront: draft.storefront.trim(),
    copyType: draft.copyType,
    gameExecutableVersion: draft.gameExecutableVersion.trim(),
    patchLabel: draft.patchLabel.trim(),
    latestUpdateState: draft.latestUpdateState,
    observedAt: draft.observedAt,
    onlineState: draft.onlineState,
    eaAccountState: draft.eaAccountState,
    resolution: draft.resolution.trim(),
    hdrState: draft.hdrState,
    displayModel: draft.displayModel.trim(),
    captureHardware: draft.captureHardware.trim(),
    captureFormat: draft.captureFormat.trim(),
    mode: draft.mode.trim(),
    exactPath: draft.exactPath.trim(),
    position: draft.position.trim(),
    archetype: draft.archetype.trim(),
    handedness: draft.handedness,
    height: draft.height.trim(),
    weight: draft.weight.trim(),
    bodyType: draft.bodyType.trim(),
    entitlements: splitLines(draft.entitlements),
    evidenceFileIDs: requiredEvidenceSlotIDs().map((slotID) => draft.evidenceSlots[slotID].evidenceFileID),
    auditorID: draft.auditorID.trim(),
    notes: draft.notes.trim() || "Non-production audit environment manifest created by the Phase 0 environment wizard."
  };

  const validation = validatePhase0AuditEnvironment(environment);
  return {
    environment: validation.ok ? environment : null,
    completion,
    errors: validation.errors.map((error) => error.message)
  };
}

export function requiredEvidenceSlotIDs(): EnvironmentEvidenceSlotID[] {
  return ["titleScreen", "versionBuildScreen", "consoleUpdateScreen", "selectedMode", "creationWorkflowStart"];
}

export function generateEnvironmentID(draft: Phase0EnvironmentWizardDraft) {
  const stem = environmentIDStem(draft);
  const checksum = deterministicChecksum([
    draft.platformName,
    draft.gameExecutableVersion,
    draft.patchLabel,
    draft.mode,
    draft.exactPath,
    draft.consoleModel,
    draft.consoleOSVersion
  ]);
  return `${stem}-${checksum}`;
}

function createEmptyEvidenceSlots(): Record<EnvironmentEvidenceSlotID, EnvironmentEvidenceSlot> {
  return Object.fromEntries(
    requiredEvidenceSlotIDs().map((slotID) => [
      slotID,
      {
        id: slotID,
        label: evidenceSlotLabels[slotID],
        required: true,
        fileName: "",
        mimeType: "",
        sizeBytes: 0,
        evidenceFileID: ""
      }
    ])
  ) as Record<EnvironmentEvidenceSlotID, EnvironmentEvidenceSlot>;
}

function environmentIDStem(draft: Phase0EnvironmentWizardDraft) {
  return `environment-${slugify(draft.platformName) || "platform"}-${slugify(draft.gameExecutableVersion) || "version"}-${slugify(draft.patchLabel) || "patch"}-${slugify(draft.mode) || "mode"}-${slugify(draft.exactPath) || "path"}`;
}

function fieldLabel(field: keyof Phase0EnvironmentWizardDraft) {
  return String(field).replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function deterministicChecksum(values: string[]) {
  const input = values.map((value) => value.trim().toLowerCase()).join("|");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
