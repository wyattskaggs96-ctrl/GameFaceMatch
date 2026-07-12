import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";
import type { Phase0CatalogManagerDisposition } from "./phase-zero-head-capture-workspace";

export const PHASE0_FACIAL_HAIR_CAPTURE_WORKSPACE_SCHEMA_VERSION = "phase0-facial-hair-capture-workspace-v1";

export type Phase0FacialHairCaptureViewID =
  | "front"
  | "leftThreeQuarter"
  | "leftProfile"
  | "rightThreeQuarter"
  | "rightProfile";

export type Phase0FacialHairCaptureCompletionStatus = "notStarted" | "inProgress" | "complete" | "blocked";
export type Phase0FacialHairDependencyKind =
  | "head"
  | "hairstyle"
  | "mode"
  | "body"
  | "position"
  | "archetype"
  | "account"
  | "platform"
  | "skinTone"
  | "unlock";
export type Phase0FacialHairRecaptureStatus = "open" | "resolved" | "waived";
export type Phase0FacialHairCoverage = "unknown" | "none" | "mustache" | "goatee" | "beard" | "mixed";
export type Phase0FacialHairObservationKind = "mustache" | "beard" | "sideburn" | "stubble" | "density" | "length" | "colorControl";

export const PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS: Phase0FacialHairCaptureViewID[] = [
  "front",
  "leftThreeQuarter",
  "leftProfile",
  "rightThreeQuarter",
  "rightProfile"
];

export const PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS: Phase0FacialHairDependencyKind[] = [
  "head",
  "hairstyle",
  "mode",
  "body",
  "position",
  "archetype",
  "account",
  "platform",
  "skinTone",
  "unlock"
];

export const PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS: Phase0FacialHairObservationKind[] = [
  "mustache",
  "beard",
  "sideburn",
  "stubble",
  "density",
  "length",
  "colorControl"
];

export interface Phase0FacialHairDoubleCountRun {
  runID: Phase0EntityID;
  runNumber: number;
  observedCount: number | null;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  sourceVideoEvidenceID: Phase0EntityID | null;
  notes: string;
}

export interface Phase0FacialHairCaptureEvidence {
  evidenceFileID: Phase0EntityID;
  viewID: Phase0FacialHairCaptureViewID | "fullScreenMenu";
  sourceVideoID: Phase0EntityID | null;
  sourceVideoTimestamp: string | null;
  notes: string;
}

export interface Phase0FacialHairDependencyRecord {
  dependencyID: Phase0EntityID;
  kind: Phase0FacialHairDependencyKind;
  observedValue: string;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0FacialHairObservationRecord {
  observationID: Phase0EntityID;
  kind: Phase0FacialHairObservationKind;
  observedState: string;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0FacialHairCoverageMetadata {
  metadataID: Phase0EntityID;
  standardizedCoverage: Phase0FacialHairCoverage;
  obscuresJawline: boolean | null;
  obscuresMouth: boolean | null;
  coverageNotes: string;
}

export interface Phase0FacialHairRecaptureRequest {
  requestID: Phase0EntityID;
  viewID: Phase0FacialHairCaptureViewID | "fullScreenMenu" | "dependency" | "observation" | "canonicalSetup";
  reason: string;
  status: Phase0FacialHairRecaptureStatus;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0FacialHairCaptureEntry {
  entryID: Phase0EntityID;
  stableInternalID: string;
  nativeOrder: number;
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  isNoneOption: boolean;
  canonicalHeadStableID: string;
  canonicalHeadConfirmed: boolean;
  canonicalHairstyleStableID: string;
  canonicalHairstyleConfirmed: boolean;
  facialHairColor: string | null;
  fullScreenMenuEvidenceIDs: Phase0EntityID[];
  viewEvidence: Phase0FacialHairCaptureEvidence[];
  dependencies: Phase0FacialHairDependencyRecord[];
  coverageMetadata: Phase0FacialHairCoverageMetadata;
  observations: Phase0FacialHairObservationRecord[];
  recaptureRequests: Phase0FacialHairRecaptureRequest[];
  captureCompletionStatus: Phase0FacialHairCaptureCompletionStatus;
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

export interface Phase0FacialHairCaptureWorkspace {
  schemaVersion: typeof PHASE0_FACIAL_HAIR_CAPTURE_WORKSPACE_SCHEMA_VERSION;
  workspaceID: Phase0EntityID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  gameID: Phase0EntityID;
  platformCode: string;
  modeCode: string;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  menuMapID: Phase0EntityID;
  canonicalCaptureConfigurationHash: string | null;
  doubleCountRuns: Phase0FacialHairDoubleCountRun[];
  entries: Phase0FacialHairCaptureEntry[];
}

export interface Phase0FacialHairCaptureValidationIssue {
  code: string;
  message: string;
  entryID?: Phase0EntityID;
}

export interface Phase0FacialHairCaptureValidationReport {
  ok: boolean;
  errors: Phase0FacialHairCaptureValidationIssue[];
  warnings: Phase0FacialHairCaptureValidationIssue[];
  productionCompletionAllowed: boolean;
}

export function createEmptyFacialHairCaptureWorkspace({
  workspaceID,
  gameID,
  platformCode,
  modeCode,
  gameVersionID,
  patchID,
  creationPathID,
  menuMapID,
  nowISO
}: {
  workspaceID: Phase0EntityID;
  gameID: Phase0EntityID;
  platformCode: string;
  modeCode: string;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  menuMapID: Phase0EntityID;
  nowISO: ISODateString;
}): Phase0FacialHairCaptureWorkspace {
  return {
    schemaVersion: PHASE0_FACIAL_HAIR_CAPTURE_WORKSPACE_SCHEMA_VERSION,
    workspaceID,
    createdAt: nowISO,
    updatedAt: nowISO,
    gameID,
    platformCode,
    modeCode,
    gameVersionID,
    patchID,
    creationPathID,
    menuMapID,
    canonicalCaptureConfigurationHash: null,
    doubleCountRuns: [],
    entries: []
  };
}

export function assignFacialHairStableID(platformCode: string, modeCode: string, nativeOrder: number): string {
  const normalizedPlatform = normalizeCode(platformCode);
  const normalizedMode = normalizeCode(modeCode);
  const order = Number.isInteger(nativeOrder) && nativeOrder > 0 ? nativeOrder : 0;
  return `CF27_${normalizedPlatform}_${normalizedMode}_FACIALHAIR_${String(order).padStart(3, "0")}`;
}

export function createFacialHairCaptureEntry({
  platformCode,
  modeCode,
  nativeOrder,
  nativeCategoryLabel,
  visibleGameLabelOrIndex,
  isNoneOption,
  nowISO
}: {
  platformCode: string;
  modeCode: string;
  nativeOrder: number;
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  isNoneOption: boolean;
  nowISO: ISODateString;
}): Phase0FacialHairCaptureEntry {
  const stableInternalID = assignFacialHairStableID(platformCode, modeCode, nativeOrder);
  return {
    entryID: `facial-hair-entry-${stableInternalID.toLowerCase()}`,
    stableInternalID,
    nativeOrder,
    nativeCategoryLabel: nativeCategoryLabel.trim(),
    visibleGameLabelOrIndex: visibleGameLabelOrIndex.trim(),
    isNoneOption,
    canonicalHeadStableID: "",
    canonicalHeadConfirmed: false,
    canonicalHairstyleStableID: "",
    canonicalHairstyleConfirmed: false,
    facialHairColor: null,
    fullScreenMenuEvidenceIDs: [],
    viewEvidence: [],
    dependencies: [],
    coverageMetadata: {
      metadataID: `${stableInternalID.toLowerCase()}-coverage-metadata`,
      standardizedCoverage: isNoneOption ? "none" : "unknown",
      obscuresJawline: null,
      obscuresMouth: null,
      coverageNotes: `Created ${nowISO}; coverage metadata is researcher-applied and separate from native game labels.`
    },
    observations: [],
    recaptureRequests: [],
    captureCompletionStatus: "notStarted",
    verificationStatus: "draft",
    catalogManagerDisposition: "notReady",
    notes: `Created ${nowISO}; awaiting direct facial-hair evidence.`
  };
}

export function addFacialHairCaptureEntry(
  workspace: Phase0FacialHairCaptureWorkspace,
  entry: Phase0FacialHairCaptureEntry,
  updatedAt: ISODateString
): Phase0FacialHairCaptureWorkspace {
  return {
    ...workspace,
    updatedAt,
    entries: [...workspace.entries, entry].sort((first, second) => first.nativeOrder - second.nativeOrder)
  };
}

export function addFacialHairDoubleCountRun(
  workspace: Phase0FacialHairCaptureWorkspace,
  run: Phase0FacialHairDoubleCountRun,
  updatedAt: ISODateString
): Phase0FacialHairCaptureWorkspace {
  return {
    ...workspace,
    updatedAt,
    doubleCountRuns: [...workspace.doubleCountRuns, run].sort((first, second) => first.runNumber - second.runNumber)
  };
}

export function createFacialHairEvidenceReference({
  evidenceFileID,
  viewID,
  sourceVideoID,
  sourceVideoTimestamp,
  notes
}: Phase0FacialHairCaptureEvidence): Phase0FacialHairCaptureEvidence {
  return {
    evidenceFileID: evidenceFileID.trim(),
    viewID,
    sourceVideoID: sourceVideoID?.trim() || null,
    sourceVideoTimestamp: sourceVideoTimestamp?.trim() || null,
    notes: notes.trim()
  };
}

export function getMissingFacialHairViews(entry: Phase0FacialHairCaptureEntry): Phase0FacialHairCaptureViewID[] {
  const capturedViews = new Set(
    entry.viewEvidence.map((evidence) => evidence.viewID).filter((viewID): viewID is Phase0FacialHairCaptureViewID => viewID !== "fullScreenMenu")
  );
  return PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.filter((viewID) => !capturedViews.has(viewID));
}

export function getOpenFacialHairRecaptureRequests(entry: Phase0FacialHairCaptureEntry): Phase0FacialHairRecaptureRequest[] {
  return entry.recaptureRequests.filter((request) => request.status === "open");
}

export function detectFacialHairRecaptureNeeds(entry: Phase0FacialHairCaptureEntry): Phase0FacialHairRecaptureRequest[] {
  const missingViewRequests = getMissingFacialHairViews(entry).map((viewID) => ({
    requestID: `${entry.entryID}-recapture-${viewID}`,
    viewID,
    reason: `${viewID} evidence is missing.`,
    status: "open" as const,
    evidenceFileIDs: [],
    notes: "Generated from missing required facial-hair view evidence."
  }));
  const unresolvedRequests = getOpenFacialHairRecaptureRequests(entry);
  return [...missingViewRequests, ...unresolvedRequests];
}

export function validateFacialHairCaptureWorkspace(workspace: Phase0FacialHairCaptureWorkspace): Phase0FacialHairCaptureValidationReport {
  const errors: Phase0FacialHairCaptureValidationIssue[] = [];
  const warnings: Phase0FacialHairCaptureValidationIssue[] = [];

  if (workspace.schemaVersion !== PHASE0_FACIAL_HAIR_CAPTURE_WORKSPACE_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_FACIAL_HAIR_CAPTURE_WORKSPACE_SCHEMA_VERSION}.`));
  }
  if (!hasUsableText(workspace.platformCode) || !hasUsableText(workspace.modeCode)) {
    errors.push(issue("missingWorkspaceMetadata", "Facial-hair capture workspace requires platformCode and modeCode."));
  }
  validateDoubleCountRuns(workspace, errors, warnings);
  validateNoneOption(workspace, errors);
  validateEntries(workspace, errors, warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    productionCompletionAllowed: errors.length === 0 && workspace.entries.length > 0
  };
}

function validateDoubleCountRuns(
  workspace: Phase0FacialHairCaptureWorkspace,
  errors: Phase0FacialHairCaptureValidationIssue[],
  warnings: Phase0FacialHairCaptureValidationIssue[]
) {
  const completeRuns = workspace.doubleCountRuns.filter((run) => run.observedCount !== null && run.completedAt !== null);
  if (completeRuns.length < 2) {
    errors.push(issue("missingDoubleCountRuns", "Facial-hair catalog production completion requires two completed count runs."));
    return;
  }
  const counts = new Set(completeRuns.map((run) => run.observedCount));
  if (counts.size > 1) {
    errors.push(issue("doubleCountMismatch", "Double-count runs disagree; resolve facial-hair count mismatch before production completion."));
  }
  if (workspace.entries.length > 0 && completeRuns[0]?.observedCount !== workspace.entries.length) {
    warnings.push(issue("entryCountDoesNotMatchDoubleCount", `Workspace has ${workspace.entries.length} facial-hair entries but double-count run observed ${completeRuns[0]?.observedCount}.`));
  }
}

function validateNoneOption(workspace: Phase0FacialHairCaptureWorkspace, errors: Phase0FacialHairCaptureValidationIssue[]) {
  if (workspace.entries.length > 0 && !workspace.entries.some((entry) => entry.isNoneOption || entry.coverageMetadata.standardizedCoverage === "none")) {
    errors.push(issue("missingNoneOption", "Facial-hair catalog must include and verify the None option."));
  }
}

function validateEntries(
  workspace: Phase0FacialHairCaptureWorkspace,
  errors: Phase0FacialHairCaptureValidationIssue[],
  warnings: Phase0FacialHairCaptureValidationIssue[]
) {
  const stableIDs = new Set<string>();
  for (const entry of workspace.entries) {
    if (stableIDs.has(entry.stableInternalID)) {
      errors.push(issue("duplicateStableID", `Duplicate stable facial-hair ID ${entry.stableInternalID}.`, entry.entryID));
    }
    stableIDs.add(entry.stableInternalID);
    if (entry.stableInternalID !== assignFacialHairStableID(workspace.platformCode, workspace.modeCode, entry.nativeOrder)) {
      errors.push(issue("stableIDMismatch", `${entry.stableInternalID} does not match platform/mode/native order.`, entry.entryID));
    }
    if (!Number.isInteger(entry.nativeOrder) || entry.nativeOrder < 1) {
      errors.push(issue("invalidNativeOrder", `${entry.entryID} requires a positive native order.`, entry.entryID));
    }
    for (const [field, value] of [
      ["nativeCategoryLabel", entry.nativeCategoryLabel],
      ["visibleGameLabelOrIndex", entry.visibleGameLabelOrIndex],
      ["canonicalHeadStableID", entry.canonicalHeadStableID],
      ["canonicalHairstyleStableID", entry.canonicalHairstyleStableID]
    ] as const) {
      if (!hasUsableText(value)) errors.push(issue("missingFacialHairField", `${entry.stableInternalID} requires ${field}.`, entry.entryID));
    }
    if (!entry.isNoneOption && !hasUsableText(entry.facialHairColor ?? "")) {
      errors.push(issue("missingFacialHairColor", `${entry.stableInternalID} requires facial-hair color evidence.`, entry.entryID));
    }
    if (!entry.canonicalHeadConfirmed) {
      errors.push(issue("canonicalHeadNotConfirmed", `${entry.stableInternalID} requires canonical head confirmation.`, entry.entryID));
    }
    if (!entry.canonicalHairstyleConfirmed) {
      errors.push(issue("canonicalHairstyleNotConfirmed", `${entry.stableInternalID} requires canonical hairstyle confirmation.`, entry.entryID));
    }
    if (entry.fullScreenMenuEvidenceIDs.length === 0) {
      errors.push(issue("missingFullScreenMenuEvidence", `${entry.stableInternalID} requires full-screen menu evidence.`, entry.entryID));
    }
    const missingViews = getMissingFacialHairViews(entry);
    if (missingViews.length > 0) {
      errors.push(issue("missingRequiredFacialHairViewEvidence", `${entry.stableInternalID} is missing required views: ${missingViews.join(", ")}.`, entry.entryID));
    }
    validateCoverage(entry, errors);
    validateObservations(entry, errors);
    validateDependencies(entry, errors);
    validateEvidence(entry, errors);
    const openRequests = getOpenFacialHairRecaptureRequests(entry);
    if (openRequests.length > 0) {
      errors.push(issue("openRecaptureRequest", `${entry.stableInternalID} has open recapture requests.`, entry.entryID));
    }
    if (entry.captureCompletionStatus === "complete" && (missingViews.length > 0 || openRequests.length > 0)) {
      errors.push(issue("invalidCompletionStatus", `${entry.stableInternalID} cannot be complete with missing views or open recapture requests.`, entry.entryID));
    }
    if (entry.catalogManagerDisposition === "accepted" && entry.verificationStatus !== "verified") {
      errors.push(issue("catalogDispositionRequiresVerification", `${entry.stableInternalID} cannot be accepted by catalog manager before verification.`, entry.entryID));
    }
    if (entry.isNoneOption && entry.coverageMetadata.standardizedCoverage !== "none") {
      warnings.push(issue("noneOptionCoverageMismatch", `${entry.stableInternalID} is marked None but coverage metadata is not none.`, entry.entryID));
    }
  }
}

function validateCoverage(entry: Phase0FacialHairCaptureEntry, errors: Phase0FacialHairCaptureValidationIssue[]) {
  const metadata = entry.coverageMetadata;
  if (!hasUsableText(metadata.metadataID) || !hasUsableText(metadata.coverageNotes)) {
    errors.push(issue("missingCoverageMetadata", `${entry.stableInternalID} requires coverage metadata.`, entry.entryID));
  }
}

function validateObservations(entry: Phase0FacialHairCaptureEntry, errors: Phase0FacialHairCaptureValidationIssue[]) {
  const observationKinds = new Set(entry.observations.map((observation) => observation.kind));
  for (const kind of PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS) {
    if (!observationKinds.has(kind)) {
      errors.push(issue("missingObservationRecord", `${entry.stableInternalID} requires ${kind} observation evidence.`, entry.entryID));
    }
  }
  for (const observation of entry.observations) {
    if (!hasUsableText(observation.observationID) || !hasUsableText(observation.observedState) || !hasUsableText(observation.notes)) {
      errors.push(issue("invalidObservationRecord", `${entry.stableInternalID} has incomplete ${observation.kind} observation metadata.`, entry.entryID));
    }
    if (observation.evidenceFileIDs.length === 0) {
      errors.push(issue("missingObservationEvidence", `${entry.stableInternalID} ${observation.kind} observation requires evidence.`, entry.entryID));
    }
  }
}

function validateDependencies(entry: Phase0FacialHairCaptureEntry, errors: Phase0FacialHairCaptureValidationIssue[]) {
  const dependencyKinds = new Set(entry.dependencies.map((dependency) => dependency.kind));
  for (const kind of PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS) {
    if (!dependencyKinds.has(kind)) {
      errors.push(issue("missingDependencyRecord", `${entry.stableInternalID} requires ${kind} dependency evidence.`, entry.entryID));
    }
  }
  for (const dependency of entry.dependencies) {
    if (!hasUsableText(dependency.dependencyID) || !hasUsableText(dependency.observedValue) || !hasUsableText(dependency.notes)) {
      errors.push(issue("invalidDependencyRecord", `${entry.stableInternalID} has incomplete ${dependency.kind} dependency metadata.`, entry.entryID));
    }
    if (dependency.evidenceFileIDs.length === 0) {
      errors.push(issue("missingDependencyEvidence", `${entry.stableInternalID} ${dependency.kind} dependency requires evidence.`, entry.entryID));
    }
  }
}

function validateEvidence(entry: Phase0FacialHairCaptureEntry, errors: Phase0FacialHairCaptureValidationIssue[]) {
  for (const evidence of entry.viewEvidence) {
    if (!hasUsableText(evidence.evidenceFileID) || !hasUsableText(evidence.notes)) {
      errors.push(issue("invalidViewEvidence", `${entry.stableInternalID} has incomplete view evidence metadata.`, entry.entryID));
    }
  }
}

function normalizeCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || "UNKNOWN";
}

function issue(code: string, message: string, entryID?: Phase0EntityID): Phase0FacialHairCaptureValidationIssue {
  return { code, message, entryID };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
