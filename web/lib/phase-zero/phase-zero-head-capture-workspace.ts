import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";

export const PHASE0_HEAD_CAPTURE_WORKSPACE_SCHEMA_VERSION = "phase0-head-capture-workspace-v1";

export type Phase0HeadCaptureViewID =
  | "front"
  | "leftThreeQuarter"
  | "leftProfile"
  | "rightThreeQuarter"
  | "rightProfile"
  | "elevated"
  | "lowered";

export type Phase0HeadSelectorWrapBehavior = "wraps" | "clamps" | "unknown";
export type Phase0HeadCaptureCompletionStatus = "notStarted" | "inProgress" | "complete" | "blocked";
export type Phase0HeadLockStatus = "unlocked" | "locked" | "entitlementDependent" | "unknown";
export type Phase0CatalogManagerDisposition = "notReady" | "readyForReview" | "accepted" | "rejected" | "deferred";
export type Phase0HeadDuplicateObservationKind = "duplicate" | "nearDuplicate";

export const PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS: Phase0HeadCaptureViewID[] = [
  "front",
  "leftThreeQuarter",
  "leftProfile",
  "rightThreeQuarter",
  "rightProfile",
  "elevated",
  "lowered"
];

export interface Phase0HeadDoubleCountRun {
  runID: Phase0EntityID;
  runNumber: number;
  observedCount: number | null;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  sourceVideoEvidenceID: Phase0EntityID | null;
  notes: string;
}

export interface Phase0HeadCaptureEvidence {
  evidenceFileID: Phase0EntityID;
  viewID: Phase0HeadCaptureViewID | "fullScreenMenu";
  sourceVideoID: Phase0EntityID | null;
  sourceVideoTimestamp: string | null;
  notes: string;
}

export interface Phase0HeadDuplicateObservation {
  observationID: Phase0EntityID;
  kind: Phase0HeadDuplicateObservationKind;
  comparedStableID: string;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0HeadCaptureEntry {
  entryID: Phase0EntityID;
  stableInternalID: string;
  nativeOrder: number;
  visibleGameLabelOrIndex: string;
  selectorWrapBehavior: Phase0HeadSelectorWrapBehavior;
  lockStatus: Phase0HeadLockStatus;
  entitlementDependency: string | null;
  forcedAttributes: string[];
  canonicalSettingsConfirmed: boolean;
  canonicalSettingsHash: string | null;
  fullScreenMenuEvidenceIDs: Phase0EntityID[];
  viewEvidence: Phase0HeadCaptureEvidence[];
  duplicateObservations: Phase0HeadDuplicateObservation[];
  captureCompletionStatus: Phase0HeadCaptureCompletionStatus;
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

export interface Phase0HeadCaptureWorkspace {
  schemaVersion: typeof PHASE0_HEAD_CAPTURE_WORKSPACE_SCHEMA_VERSION;
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
  doubleCountRuns: Phase0HeadDoubleCountRun[];
  entries: Phase0HeadCaptureEntry[];
}

export interface Phase0HeadCaptureValidationIssue {
  code: string;
  message: string;
  entryID?: Phase0EntityID;
}

export interface Phase0HeadCaptureValidationReport {
  ok: boolean;
  errors: Phase0HeadCaptureValidationIssue[];
  warnings: Phase0HeadCaptureValidationIssue[];
  productionCompletionAllowed: boolean;
}

export function createEmptyHeadCaptureWorkspace({
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
}): Phase0HeadCaptureWorkspace {
  return {
    schemaVersion: PHASE0_HEAD_CAPTURE_WORKSPACE_SCHEMA_VERSION,
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

export function assignHeadStableID(platformCode: string, modeCode: string, nativeOrder: number): string {
  const normalizedPlatform = normalizeCode(platformCode);
  const normalizedMode = normalizeCode(modeCode);
  const order = Number.isInteger(nativeOrder) && nativeOrder > 0 ? nativeOrder : 0;
  return `CF27_${normalizedPlatform}_${normalizedMode}_HEAD_${String(order).padStart(3, "0")}`;
}

export function createHeadCaptureEntry({
  platformCode,
  modeCode,
  nativeOrder,
  visibleGameLabelOrIndex,
  nowISO
}: {
  platformCode: string;
  modeCode: string;
  nativeOrder: number;
  visibleGameLabelOrIndex: string;
  nowISO: ISODateString;
}): Phase0HeadCaptureEntry {
  const stableInternalID = assignHeadStableID(platformCode, modeCode, nativeOrder);
  return {
    entryID: `head-entry-${stableInternalID.toLowerCase()}`,
    stableInternalID,
    nativeOrder,
    visibleGameLabelOrIndex: visibleGameLabelOrIndex.trim(),
    selectorWrapBehavior: "unknown",
    lockStatus: "unknown",
    entitlementDependency: null,
    forcedAttributes: [],
    canonicalSettingsConfirmed: false,
    canonicalSettingsHash: null,
    fullScreenMenuEvidenceIDs: [],
    viewEvidence: [],
    duplicateObservations: [],
    captureCompletionStatus: "notStarted",
    verificationStatus: "draft",
    catalogManagerDisposition: "notReady",
    notes: `Created ${nowISO}; awaiting direct evidence.`
  };
}

export function addHeadCaptureEntry(workspace: Phase0HeadCaptureWorkspace, entry: Phase0HeadCaptureEntry, updatedAt: ISODateString): Phase0HeadCaptureWorkspace {
  return {
    ...workspace,
    updatedAt,
    entries: [...workspace.entries, entry].sort((first, second) => first.nativeOrder - second.nativeOrder)
  };
}

export function addHeadDoubleCountRun(workspace: Phase0HeadCaptureWorkspace, run: Phase0HeadDoubleCountRun, updatedAt: ISODateString): Phase0HeadCaptureWorkspace {
  return {
    ...workspace,
    updatedAt,
    doubleCountRuns: [...workspace.doubleCountRuns, run].sort((first, second) => first.runNumber - second.runNumber)
  };
}

export function createHeadEvidenceReference({
  evidenceFileID,
  viewID,
  sourceVideoID,
  sourceVideoTimestamp,
  notes
}: Phase0HeadCaptureEvidence): Phase0HeadCaptureEvidence {
  return {
    evidenceFileID: evidenceFileID.trim(),
    viewID,
    sourceVideoID: sourceVideoID?.trim() || null,
    sourceVideoTimestamp: sourceVideoTimestamp?.trim() || null,
    notes: notes.trim()
  };
}

export function getMissingHeadViews(entry: Phase0HeadCaptureEntry): Phase0HeadCaptureViewID[] {
  const capturedViews = new Set(entry.viewEvidence.map((evidence) => evidence.viewID).filter((viewID): viewID is Phase0HeadCaptureViewID => viewID !== "fullScreenMenu"));
  return PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.filter((viewID) => !capturedViews.has(viewID));
}

export function validateHeadCaptureWorkspace(workspace: Phase0HeadCaptureWorkspace): Phase0HeadCaptureValidationReport {
  const errors: Phase0HeadCaptureValidationIssue[] = [];
  const warnings: Phase0HeadCaptureValidationIssue[] = [];

  if (workspace.schemaVersion !== PHASE0_HEAD_CAPTURE_WORKSPACE_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_HEAD_CAPTURE_WORKSPACE_SCHEMA_VERSION}.`));
  }
  if (!hasUsableText(workspace.platformCode) || !hasUsableText(workspace.modeCode)) {
    errors.push(issue("missingWorkspaceMetadata", "Head capture workspace requires platformCode and modeCode."));
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
  workspace: Phase0HeadCaptureWorkspace,
  errors: Phase0HeadCaptureValidationIssue[],
  warnings: Phase0HeadCaptureValidationIssue[]
) {
  const completeRuns = workspace.doubleCountRuns.filter((run) => run.observedCount !== null && run.completedAt !== null);
  if (completeRuns.length < 2) {
    errors.push(issue("missingDoubleCountRuns", "Head catalog production completion requires two completed count runs."));
    return;
  }
  const counts = new Set(completeRuns.map((run) => run.observedCount));
  if (counts.size > 1) {
    errors.push(issue("doubleCountMismatch", "Double-count runs disagree; resolve count mismatch before production completion."));
  }
  if (workspace.entries.length > 0 && completeRuns[0]?.observedCount !== workspace.entries.length) {
    warnings.push(issue("entryCountDoesNotMatchDoubleCount", `Workspace has ${workspace.entries.length} head entries but double-count run observed ${completeRuns[0]?.observedCount}.`));
  }
}

function validateEntries(
  workspace: Phase0HeadCaptureWorkspace,
  errors: Phase0HeadCaptureValidationIssue[],
  warnings: Phase0HeadCaptureValidationIssue[]
) {
  const stableIDs = new Set<string>();
  for (const entry of workspace.entries) {
    if (stableIDs.has(entry.stableInternalID)) {
      errors.push(issue("duplicateStableID", `Duplicate stable head ID ${entry.stableInternalID}.`, entry.entryID));
    }
    stableIDs.add(entry.stableInternalID);
    if (entry.stableInternalID !== assignHeadStableID(workspace.platformCode, workspace.modeCode, entry.nativeOrder)) {
      errors.push(issue("stableIDMismatch", `${entry.stableInternalID} does not match platform/mode/native order.`, entry.entryID));
    }
    if (!Number.isInteger(entry.nativeOrder) || entry.nativeOrder < 1) {
      errors.push(issue("invalidNativeOrder", `${entry.entryID} requires a positive native order.`, entry.entryID));
    }
    if (!hasUsableText(entry.visibleGameLabelOrIndex)) {
      errors.push(issue("missingVisibleLabel", `${entry.stableInternalID} requires the exact visible label or index from evidence.`, entry.entryID));
    }
    if (entry.fullScreenMenuEvidenceIDs.length === 0) {
      errors.push(issue("missingFullScreenMenuEvidence", `${entry.stableInternalID} requires full-screen menu evidence.`, entry.entryID));
    }
    const missingViews = getMissingHeadViews(entry);
    if (missingViews.length > 0) {
      errors.push(issue("missingRequiredHeadViewEvidence", `${entry.stableInternalID} is missing required views: ${missingViews.join(", ")}.`, entry.entryID));
    }
    if (entry.canonicalSettingsConfirmed && !hasUsableText(entry.canonicalSettingsHash ?? "")) {
      errors.push(issue("missingCanonicalSettingsHash", `${entry.stableInternalID} confirms canonical settings without a settings hash.`, entry.entryID));
    }
    if (!entry.canonicalSettingsConfirmed) {
      errors.push(issue("canonicalSettingsNotConfirmed", `${entry.stableInternalID} requires canonical settings confirmation before production completion.`, entry.entryID));
    }
    if (entry.lockStatus === "entitlementDependent" && !hasUsableText(entry.entitlementDependency ?? "")) {
      errors.push(issue("missingEntitlementDependency", `${entry.stableInternalID} is entitlement-dependent without dependency details.`, entry.entryID));
    }
    for (const evidence of entry.viewEvidence) {
      if (!hasUsableText(evidence.evidenceFileID) || !hasUsableText(evidence.notes)) {
        errors.push(issue("invalidViewEvidence", `${entry.stableInternalID} has incomplete view evidence metadata.`, entry.entryID));
      }
    }
    for (const observation of entry.duplicateObservations) {
      if (observation.evidenceFileIDs.length === 0) {
        warnings.push(issue("duplicateObservationWithoutEvidence", `${entry.stableInternalID} duplicate observation should cite evidence.`, entry.entryID));
      }
    }
    if (entry.captureCompletionStatus === "complete" && missingViews.length > 0) {
      errors.push(issue("invalidCompletionStatus", `${entry.stableInternalID} cannot be complete while required views are missing.`, entry.entryID));
    }
    if (entry.catalogManagerDisposition === "accepted" && entry.verificationStatus !== "verified") {
      errors.push(issue("catalogDispositionRequiresVerification", `${entry.stableInternalID} cannot be accepted by catalog manager before verification.`, entry.entryID));
    }
  }
}

function normalizeCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || "UNKNOWN";
}

function issue(code: string, message: string, entryID?: Phase0EntityID): Phase0HeadCaptureValidationIssue {
  return { code, message, entryID };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
