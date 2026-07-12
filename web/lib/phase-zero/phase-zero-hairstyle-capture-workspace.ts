import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";
import type { Phase0CatalogManagerDisposition } from "./phase-zero-head-capture-workspace";

export const PHASE0_HAIRSTYLE_CAPTURE_WORKSPACE_SCHEMA_VERSION = "phase0-hairstyle-capture-workspace-v1";

export type Phase0HairstyleCaptureViewID =
  | "front"
  | "leftThreeQuarter"
  | "leftProfile"
  | "rear"
  | "rightProfile"
  | "rightThreeQuarter";

export type Phase0HairstyleCaptureCompletionStatus = "notStarted" | "inProgress" | "complete" | "blocked";
export type Phase0HairstyleDependencyKind =
  | "head"
  | "mode"
  | "body"
  | "position"
  | "archetype"
  | "account"
  | "platform"
  | "skinTone"
  | "unlock";
export type Phase0HairstyleRecaptureStatus = "open" | "resolved" | "waived";
export type Phase0ResearcherHairLength = "unknown" | "short" | "medium" | "long";
export type Phase0ResearcherHairTexture = "unknown" | "straight" | "wavy" | "curly" | "coiled" | "shaved" | "covered";

export const PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS: Phase0HairstyleCaptureViewID[] = [
  "front",
  "leftThreeQuarter",
  "leftProfile",
  "rear",
  "rightProfile",
  "rightThreeQuarter"
];

export const PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS: Phase0HairstyleDependencyKind[] = [
  "head",
  "mode",
  "body",
  "position",
  "archetype",
  "account",
  "platform",
  "skinTone",
  "unlock"
];

export interface Phase0HairstyleDoubleCountRun {
  runID: Phase0EntityID;
  runNumber: number;
  observedCount: number | null;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  sourceVideoEvidenceID: Phase0EntityID | null;
  notes: string;
}

export interface Phase0HairstyleCaptureEvidence {
  evidenceFileID: Phase0EntityID;
  viewID: Phase0HairstyleCaptureViewID | "fullScreenMenu";
  sourceVideoID: Phase0EntityID | null;
  sourceVideoTimestamp: string | null;
  notes: string;
}

export interface Phase0HairstyleDependencyRecord {
  dependencyID: Phase0EntityID;
  kind: Phase0HairstyleDependencyKind;
  observedValue: string;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0ResearcherHairstyleVisualMetadata {
  metadataID: Phase0EntityID;
  standardizedHairLength: Phase0ResearcherHairLength;
  standardizedHairTexture: Phase0ResearcherHairTexture;
  obscuresForehead: boolean | null;
  obscuresEars: boolean | null;
  silhouetteNotes: string;
  visualNotes: string;
}

export interface Phase0HairstyleRecaptureRequest {
  requestID: Phase0EntityID;
  viewID: Phase0HairstyleCaptureViewID | "fullScreenMenu" | "dependency" | "canonicalHead";
  reason: string;
  status: Phase0HairstyleRecaptureStatus;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0HairstyleCaptureEntry {
  entryID: Phase0EntityID;
  stableInternalID: string;
  nativeOrder: number;
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  canonicalHeadStableID: string;
  canonicalHeadConfirmed: boolean;
  canonicalHairColor: string;
  fullScreenMenuEvidenceIDs: Phase0EntityID[];
  viewEvidence: Phase0HairstyleCaptureEvidence[];
  dependencies: Phase0HairstyleDependencyRecord[];
  researcherVisualMetadata: Phase0ResearcherHairstyleVisualMetadata;
  recaptureRequests: Phase0HairstyleRecaptureRequest[];
  captureCompletionStatus: Phase0HairstyleCaptureCompletionStatus;
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

export interface Phase0HairstyleCaptureWorkspace {
  schemaVersion: typeof PHASE0_HAIRSTYLE_CAPTURE_WORKSPACE_SCHEMA_VERSION;
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
  doubleCountRuns: Phase0HairstyleDoubleCountRun[];
  entries: Phase0HairstyleCaptureEntry[];
}

export interface Phase0HairstyleCaptureValidationIssue {
  code: string;
  message: string;
  entryID?: Phase0EntityID;
}

export interface Phase0HairstyleCaptureValidationReport {
  ok: boolean;
  errors: Phase0HairstyleCaptureValidationIssue[];
  warnings: Phase0HairstyleCaptureValidationIssue[];
  productionCompletionAllowed: boolean;
}

export function createEmptyHairstyleCaptureWorkspace({
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
}): Phase0HairstyleCaptureWorkspace {
  return {
    schemaVersion: PHASE0_HAIRSTYLE_CAPTURE_WORKSPACE_SCHEMA_VERSION,
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

export function assignHairstyleStableID(platformCode: string, modeCode: string, nativeOrder: number): string {
  const normalizedPlatform = normalizeCode(platformCode);
  const normalizedMode = normalizeCode(modeCode);
  const order = Number.isInteger(nativeOrder) && nativeOrder > 0 ? nativeOrder : 0;
  return `CF27_${normalizedPlatform}_${normalizedMode}_HAIR_${String(order).padStart(3, "0")}`;
}

export function createHairstyleCaptureEntry({
  platformCode,
  modeCode,
  nativeOrder,
  nativeCategoryLabel,
  visibleGameLabelOrIndex,
  nowISO
}: {
  platformCode: string;
  modeCode: string;
  nativeOrder: number;
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  nowISO: ISODateString;
}): Phase0HairstyleCaptureEntry {
  const stableInternalID = assignHairstyleStableID(platformCode, modeCode, nativeOrder);
  return {
    entryID: `hairstyle-entry-${stableInternalID.toLowerCase()}`,
    stableInternalID,
    nativeOrder,
    nativeCategoryLabel: nativeCategoryLabel.trim(),
    visibleGameLabelOrIndex: visibleGameLabelOrIndex.trim(),
    canonicalHeadStableID: "",
    canonicalHeadConfirmed: false,
    canonicalHairColor: "",
    fullScreenMenuEvidenceIDs: [],
    viewEvidence: [],
    dependencies: [],
    researcherVisualMetadata: {
      metadataID: `${stableInternalID.toLowerCase()}-visual-metadata`,
      standardizedHairLength: "unknown",
      standardizedHairTexture: "unknown",
      obscuresForehead: null,
      obscuresEars: null,
      silhouetteNotes: "",
      visualNotes: `Created ${nowISO}; researcher-applied visual metadata is separate from native game labels.`
    },
    recaptureRequests: [],
    captureCompletionStatus: "notStarted",
    verificationStatus: "draft",
    catalogManagerDisposition: "notReady",
    notes: `Created ${nowISO}; awaiting direct hairstyle evidence.`
  };
}

export function addHairstyleCaptureEntry(
  workspace: Phase0HairstyleCaptureWorkspace,
  entry: Phase0HairstyleCaptureEntry,
  updatedAt: ISODateString
): Phase0HairstyleCaptureWorkspace {
  return {
    ...workspace,
    updatedAt,
    entries: [...workspace.entries, entry].sort((first, second) => first.nativeOrder - second.nativeOrder)
  };
}

export function addHairstyleDoubleCountRun(
  workspace: Phase0HairstyleCaptureWorkspace,
  run: Phase0HairstyleDoubleCountRun,
  updatedAt: ISODateString
): Phase0HairstyleCaptureWorkspace {
  return {
    ...workspace,
    updatedAt,
    doubleCountRuns: [...workspace.doubleCountRuns, run].sort((first, second) => first.runNumber - second.runNumber)
  };
}

export function createHairstyleEvidenceReference({
  evidenceFileID,
  viewID,
  sourceVideoID,
  sourceVideoTimestamp,
  notes
}: Phase0HairstyleCaptureEvidence): Phase0HairstyleCaptureEvidence {
  return {
    evidenceFileID: evidenceFileID.trim(),
    viewID,
    sourceVideoID: sourceVideoID?.trim() || null,
    sourceVideoTimestamp: sourceVideoTimestamp?.trim() || null,
    notes: notes.trim()
  };
}

export function getMissingHairstyleViews(entry: Phase0HairstyleCaptureEntry): Phase0HairstyleCaptureViewID[] {
  const capturedViews = new Set(
    entry.viewEvidence.map((evidence) => evidence.viewID).filter((viewID): viewID is Phase0HairstyleCaptureViewID => viewID !== "fullScreenMenu")
  );
  return PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.filter((viewID) => !capturedViews.has(viewID));
}

export function getOpenHairstyleRecaptureRequests(entry: Phase0HairstyleCaptureEntry): Phase0HairstyleRecaptureRequest[] {
  return entry.recaptureRequests.filter((request) => request.status === "open");
}

export function detectHairstyleRecaptureNeeds(entry: Phase0HairstyleCaptureEntry): Phase0HairstyleRecaptureRequest[] {
  const missingViewRequests = getMissingHairstyleViews(entry).map((viewID) => ({
    requestID: `${entry.entryID}-recapture-${viewID}`,
    viewID,
    reason: `${viewID} evidence is missing.`,
    status: "open" as const,
    evidenceFileIDs: [],
    notes: "Generated from missing required hairstyle view evidence."
  }));
  const unresolvedRequests = getOpenHairstyleRecaptureRequests(entry);
  return [...missingViewRequests, ...unresolvedRequests];
}

export function validateHairstyleCaptureWorkspace(workspace: Phase0HairstyleCaptureWorkspace): Phase0HairstyleCaptureValidationReport {
  const errors: Phase0HairstyleCaptureValidationIssue[] = [];
  const warnings: Phase0HairstyleCaptureValidationIssue[] = [];

  if (workspace.schemaVersion !== PHASE0_HAIRSTYLE_CAPTURE_WORKSPACE_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_HAIRSTYLE_CAPTURE_WORKSPACE_SCHEMA_VERSION}.`));
  }
  if (!hasUsableText(workspace.platformCode) || !hasUsableText(workspace.modeCode)) {
    errors.push(issue("missingWorkspaceMetadata", "Hairstyle capture workspace requires platformCode and modeCode."));
  }
  validateDoubleCountRuns(workspace, errors, warnings);
  validateEntries(workspace, errors, warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    productionCompletionAllowed: errors.length === 0 && workspace.entries.length > 0
  };
}

function validateDoubleCountRuns(
  workspace: Phase0HairstyleCaptureWorkspace,
  errors: Phase0HairstyleCaptureValidationIssue[],
  warnings: Phase0HairstyleCaptureValidationIssue[]
) {
  const completeRuns = workspace.doubleCountRuns.filter((run) => run.observedCount !== null && run.completedAt !== null);
  if (completeRuns.length < 2) {
    errors.push(issue("missingDoubleCountRuns", "Hairstyle catalog production completion requires two completed count runs."));
    return;
  }
  const counts = new Set(completeRuns.map((run) => run.observedCount));
  if (counts.size > 1) {
    errors.push(issue("doubleCountMismatch", "Double-count runs disagree; resolve hairstyle count mismatch before production completion."));
  }
  if (workspace.entries.length > 0 && completeRuns[0]?.observedCount !== workspace.entries.length) {
    warnings.push(issue("entryCountDoesNotMatchDoubleCount", `Workspace has ${workspace.entries.length} hairstyle entries but double-count run observed ${completeRuns[0]?.observedCount}.`));
  }
}

function validateEntries(
  workspace: Phase0HairstyleCaptureWorkspace,
  errors: Phase0HairstyleCaptureValidationIssue[],
  warnings: Phase0HairstyleCaptureValidationIssue[]
) {
  const stableIDs = new Set<string>();
  for (const entry of workspace.entries) {
    if (stableIDs.has(entry.stableInternalID)) {
      errors.push(issue("duplicateStableID", `Duplicate stable hairstyle ID ${entry.stableInternalID}.`, entry.entryID));
    }
    stableIDs.add(entry.stableInternalID);
    if (entry.stableInternalID !== assignHairstyleStableID(workspace.platformCode, workspace.modeCode, entry.nativeOrder)) {
      errors.push(issue("stableIDMismatch", `${entry.stableInternalID} does not match platform/mode/native order.`, entry.entryID));
    }
    if (!Number.isInteger(entry.nativeOrder) || entry.nativeOrder < 1) {
      errors.push(issue("invalidNativeOrder", `${entry.entryID} requires a positive native order.`, entry.entryID));
    }
    for (const [field, value] of [
      ["nativeCategoryLabel", entry.nativeCategoryLabel],
      ["visibleGameLabelOrIndex", entry.visibleGameLabelOrIndex],
      ["canonicalHeadStableID", entry.canonicalHeadStableID],
      ["canonicalHairColor", entry.canonicalHairColor]
    ] as const) {
      if (!hasUsableText(value)) errors.push(issue("missingHairstyleField", `${entry.stableInternalID} requires ${field}.`, entry.entryID));
    }
    if (!entry.canonicalHeadConfirmed) {
      errors.push(issue("canonicalHeadNotConfirmed", `${entry.stableInternalID} requires canonical head confirmation.`, entry.entryID));
    }
    if (entry.fullScreenMenuEvidenceIDs.length === 0) {
      errors.push(issue("missingFullScreenMenuEvidence", `${entry.stableInternalID} requires full-screen menu evidence.`, entry.entryID));
    }
    const missingViews = getMissingHairstyleViews(entry);
    if (missingViews.length > 0) {
      errors.push(issue("missingRequiredHairstyleViewEvidence", `${entry.stableInternalID} is missing required views: ${missingViews.join(", ")}.`, entry.entryID));
    }
    validateDependencies(entry, errors);
    validateVisualMetadata(entry, errors, warnings);
    validateEvidence(entry, errors);
    const openRequests = getOpenHairstyleRecaptureRequests(entry);
    if (openRequests.length > 0) {
      errors.push(issue("openRecaptureRequest", `${entry.stableInternalID} has open recapture requests.`, entry.entryID));
    }
    if (entry.captureCompletionStatus === "complete" && (missingViews.length > 0 || openRequests.length > 0)) {
      errors.push(issue("invalidCompletionStatus", `${entry.stableInternalID} cannot be complete with missing views or open recapture requests.`, entry.entryID));
    }
    if (entry.catalogManagerDisposition === "accepted" && entry.verificationStatus !== "verified") {
      errors.push(issue("catalogDispositionRequiresVerification", `${entry.stableInternalID} cannot be accepted by catalog manager before verification.`, entry.entryID));
    }
  }
}

function validateDependencies(entry: Phase0HairstyleCaptureEntry, errors: Phase0HairstyleCaptureValidationIssue[]) {
  const dependencyKinds = new Set(entry.dependencies.map((dependency) => dependency.kind));
  for (const kind of PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS) {
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

function validateVisualMetadata(
  entry: Phase0HairstyleCaptureEntry,
  errors: Phase0HairstyleCaptureValidationIssue[],
  warnings: Phase0HairstyleCaptureValidationIssue[]
) {
  const metadata = entry.researcherVisualMetadata;
  if (!hasUsableText(metadata.metadataID) || !hasUsableText(metadata.silhouetteNotes) || !hasUsableText(metadata.visualNotes)) {
    errors.push(issue("missingResearcherVisualMetadata", `${entry.stableInternalID} requires separate researcher visual metadata.`, entry.entryID));
  }
  if (metadata.visualNotes.includes(entry.visibleGameLabelOrIndex) || metadata.silhouetteNotes.includes(entry.visibleGameLabelOrIndex)) {
    warnings.push(issue("visualMetadataMayRepeatNativeLabel", `${entry.stableInternalID} visual metadata should describe observed appearance separately from native labels.`, entry.entryID));
  }
}

function validateEvidence(entry: Phase0HairstyleCaptureEntry, errors: Phase0HairstyleCaptureValidationIssue[]) {
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

function issue(code: string, message: string, entryID?: Phase0EntityID): Phase0HairstyleCaptureValidationIssue {
  return { code, message, entryID };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
