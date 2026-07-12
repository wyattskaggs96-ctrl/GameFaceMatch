import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";
import type { Phase0CatalogManagerDisposition } from "./phase-zero-head-capture-workspace";

export const PHASE0_ADDITIONAL_ATTRIBUTES_WORKSPACE_SCHEMA_VERSION = "phase0-additional-attributes-workspace-v1";

export type Phase0AdditionalControlType = "preset" | "carousel" | "numberedOptions" | "namedOptions" | "slider" | "color" | "toggle";
export type Phase0AdditionalEffectState = "unknown" | "none" | "minor" | "major";
export type Phase0LaterVisibilityState = "unknown" | "visibleLater" | "hiddenLater" | "lockedLater" | "notApplicable";
export type Phase0RecommendationSuitability = "unknown" | "suitable" | "supportingOnly" | "notSuitable" | "blockedByEvidence";
export type Phase0StableIdentifierAvailability = "unknown" | "available" | "derivedFromNativeOrder" | "notAvailable" | "requiresVerification";

export interface Phase0AdditionalAttributeRange {
  count: number | null;
  defaultValue: string | number | boolean | null;
  minimum: number | null;
  maximum: number | null;
  step: number | null;
}

export interface Phase0AdditionalAttributeEffects {
  geometryEffect: Phase0AdditionalEffectState;
  textureEffect: Phase0AdditionalEffectState;
  colorEffect: Phase0AdditionalEffectState;
  presentationOnlyEffect: Phase0AdditionalEffectState;
}

export interface Phase0AdditionalAttributeEvidenceSet {
  boundaryEvidenceIDs: Phase0EntityID[];
  representativeEvidenceIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0AdditionalAttributeDependency {
  dependencyID: Phase0EntityID;
  condition: string;
  dependsOnStableID: string | null;
  dependsOnMenuID: Phase0EntityID | null;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0AdditionalAttributeEntry {
  entryID: Phase0EntityID;
  stableInternalID: string | null;
  nativeCategoryLabel: string;
  nativeControlLabel: string;
  nativeOrder: number;
  controlType: Phase0AdditionalControlType;
  range: Phase0AdditionalAttributeRange;
  effects: Phase0AdditionalAttributeEffects;
  resetOnHeadChange: boolean | null;
  laterVisibility: Phase0LaterVisibilityState;
  recommendationSuitability: Phase0RecommendationSuitability;
  stableIdentifierAvailability: Phase0StableIdentifierAvailability;
  evidence: Phase0AdditionalAttributeEvidenceSet;
  dependencies: Phase0AdditionalAttributeDependency[];
  verificationStatus: Phase0VerificationState;
  catalogManagerDisposition: Phase0CatalogManagerDisposition;
  notes: string;
}

export interface Phase0AdditionalAttributesWorkspace {
  schemaVersion: typeof PHASE0_ADDITIONAL_ATTRIBUTES_WORKSPACE_SCHEMA_VERSION;
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
  entries: Phase0AdditionalAttributeEntry[];
}

export interface Phase0AdditionalAttributesValidationIssue {
  code: string;
  message: string;
  entryID?: Phase0EntityID;
}

export interface Phase0AdditionalAttributesValidationReport {
  ok: boolean;
  errors: Phase0AdditionalAttributesValidationIssue[];
  warnings: Phase0AdditionalAttributesValidationIssue[];
  productionCompletionAllowed: boolean;
}

export function createEmptyAdditionalAttributesWorkspace({
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
}): Phase0AdditionalAttributesWorkspace {
  return {
    schemaVersion: PHASE0_ADDITIONAL_ATTRIBUTES_WORKSPACE_SCHEMA_VERSION,
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
    entries: []
  };
}

export function assignAdditionalAttributeStableID(platformCode: string, modeCode: string, attributeCode: string, nativeOrder: number): string {
  const normalizedPlatform = normalizeCode(platformCode);
  const normalizedMode = normalizeCode(modeCode);
  const normalizedAttribute = normalizeCode(attributeCode);
  const order = Number.isInteger(nativeOrder) && nativeOrder > 0 ? nativeOrder : 0;
  return `CF27_${normalizedPlatform}_${normalizedMode}_${normalizedAttribute}_${String(order).padStart(3, "0")}`;
}

export function createAdditionalAttributeEntry({
  platformCode,
  modeCode,
  attributeCode,
  nativeCategoryLabel,
  nativeControlLabel,
  nativeOrder,
  controlType,
  stableIdentifierAvailability,
  nowISO
}: {
  platformCode: string;
  modeCode: string;
  attributeCode: string;
  nativeCategoryLabel: string;
  nativeControlLabel: string;
  nativeOrder: number;
  controlType: Phase0AdditionalControlType;
  stableIdentifierAvailability: Phase0StableIdentifierAvailability;
  nowISO: ISODateString;
}): Phase0AdditionalAttributeEntry {
  const stableInternalID = stableIdentifierAvailability === "available" || stableIdentifierAvailability === "derivedFromNativeOrder"
    ? assignAdditionalAttributeStableID(platformCode, modeCode, attributeCode, nativeOrder)
    : null;
  return {
    entryID: `additional-attribute-entry-${stableInternalID?.toLowerCase() ?? `${normalizeCode(attributeCode).toLowerCase()}-${nativeOrder}`}`,
    stableInternalID,
    nativeCategoryLabel: nativeCategoryLabel.trim(),
    nativeControlLabel: nativeControlLabel.trim(),
    nativeOrder,
    controlType,
    range: {
      count: null,
      defaultValue: null,
      minimum: null,
      maximum: null,
      step: null
    },
    effects: {
      geometryEffect: "unknown",
      textureEffect: "unknown",
      colorEffect: "unknown",
      presentationOnlyEffect: "unknown"
    },
    resetOnHeadChange: null,
    laterVisibility: "unknown",
    recommendationSuitability: "unknown",
    stableIdentifierAvailability,
    evidence: {
      boundaryEvidenceIDs: [],
      representativeEvidenceIDs: [],
      notes: `Created ${nowISO}; category remains unconfirmed until direct evidence and review are complete.`
    },
    dependencies: [],
    verificationStatus: "draft",
    catalogManagerDisposition: "notReady",
    notes: "Research draft awaiting direct evidence."
  };
}

export function addAdditionalAttributeEntry(
  workspace: Phase0AdditionalAttributesWorkspace,
  entry: Phase0AdditionalAttributeEntry,
  updatedAt: ISODateString
): Phase0AdditionalAttributesWorkspace {
  return {
    ...workspace,
    updatedAt,
    entries: [...workspace.entries, entry].sort((first, second) => first.nativeOrder - second.nativeOrder)
  };
}

export function validateAdditionalAttributesWorkspace(workspace: Phase0AdditionalAttributesWorkspace): Phase0AdditionalAttributesValidationReport {
  const errors: Phase0AdditionalAttributesValidationIssue[] = [];
  const warnings: Phase0AdditionalAttributesValidationIssue[] = [];

  if (workspace.schemaVersion !== PHASE0_ADDITIONAL_ATTRIBUTES_WORKSPACE_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_ADDITIONAL_ATTRIBUTES_WORKSPACE_SCHEMA_VERSION}.`));
  }
  if (!hasUsableText(workspace.platformCode) || !hasUsableText(workspace.modeCode)) {
    errors.push(issue("missingWorkspaceMetadata", "Additional attributes workspace requires platformCode and modeCode."));
  }
  validateEntries(workspace, errors, warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    productionCompletionAllowed: errors.length === 0 && workspace.entries.length > 0
  };
}

function validateEntries(
  workspace: Phase0AdditionalAttributesWorkspace,
  errors: Phase0AdditionalAttributesValidationIssue[],
  warnings: Phase0AdditionalAttributesValidationIssue[]
) {
  const stableIDs = new Set<string>();
  for (const entry of workspace.entries) {
    if (!Number.isInteger(entry.nativeOrder) || entry.nativeOrder < 1) {
      errors.push(issue("invalidNativeOrder", `${entry.entryID} requires a positive native order.`, entry.entryID));
    }
    for (const [field, value] of [
      ["nativeCategoryLabel", entry.nativeCategoryLabel],
      ["nativeControlLabel", entry.nativeControlLabel],
      ["notes", entry.notes]
    ] as const) {
      if (!hasUsableText(value)) errors.push(issue("missingAdditionalAttributeField", `${entry.entryID} requires ${field}.`, entry.entryID));
    }
    if (entry.stableInternalID) {
      if (stableIDs.has(entry.stableInternalID)) {
        errors.push(issue("duplicateStableID", `Duplicate additional-attribute stable ID ${entry.stableInternalID}.`, entry.entryID));
      }
      stableIDs.add(entry.stableInternalID);
      if (!entry.stableInternalID.includes(`_${normalizeCode(workspace.platformCode)}_`) || !entry.stableInternalID.includes(`_${normalizeCode(workspace.modeCode)}_`)) {
        errors.push(issue("stableIDMetadataMismatch", `${entry.stableInternalID} must include platform and mode code.`, entry.entryID));
      }
    }
    if ((entry.stableIdentifierAvailability === "available" || entry.stableIdentifierAvailability === "derivedFromNativeOrder") && !entry.stableInternalID) {
      errors.push(issue("missingStableID", `${entry.entryID} marks stable identifier available without a stableInternalID.`, entry.entryID));
    }
    validateControlRange(entry, errors);
    validateEffects(entry, errors);
    validateEvidence(entry, errors);
    validateDependencies(entry, errors);
    validateRecommendationSuitability(entry, errors, warnings);
    if (entry.catalogManagerDisposition === "accepted" && entry.verificationStatus !== "verified") {
      errors.push(issue("catalogDispositionRequiresVerification", `${entry.entryID} cannot be accepted by catalog manager before verification.`, entry.entryID));
    }
  }
}

function validateControlRange(entry: Phase0AdditionalAttributeEntry, errors: Phase0AdditionalAttributesValidationIssue[]) {
  const range = entry.range;
  if (entry.controlType === "slider") {
    if (range.minimum === null || range.maximum === null || range.step === null) {
      errors.push(issue("missingSliderRange", `${entry.entryID} slider requires minimum, maximum, and step.`, entry.entryID));
    }
    if (range.minimum !== null && range.maximum !== null && range.minimum >= range.maximum) {
      errors.push(issue("invalidRange", `${entry.entryID} minimum must be less than maximum.`, entry.entryID));
    }
    if (range.step !== null && range.step <= 0) {
      errors.push(issue("invalidStep", `${entry.entryID} step must be positive.`, entry.entryID));
    }
  }
  if ((entry.controlType === "preset" || entry.controlType === "carousel" || entry.controlType === "numberedOptions" || entry.controlType === "namedOptions") && (range.count === null || range.count < 1)) {
    errors.push(issue("missingOptionCount", `${entry.entryID} ${entry.controlType} requires a count.`, entry.entryID));
  }
  if ((entry.controlType === "color" || entry.controlType === "toggle") && range.defaultValue === null) {
    errors.push(issue("missingDefaultValue", `${entry.entryID} ${entry.controlType} requires observed default value.`, entry.entryID));
  }
}

function validateEffects(entry: Phase0AdditionalAttributeEntry, errors: Phase0AdditionalAttributesValidationIssue[]) {
  const effects = entry.effects;
  if (
    effects.geometryEffect === "unknown" &&
    effects.textureEffect === "unknown" &&
    effects.colorEffect === "unknown" &&
    effects.presentationOnlyEffect === "unknown"
  ) {
    errors.push(issue("unknownEffectProfile", `${entry.entryID} requires observed effect classification.`, entry.entryID));
  }
}

function validateEvidence(entry: Phase0AdditionalAttributeEntry, errors: Phase0AdditionalAttributesValidationIssue[]) {
  if (entry.evidence.boundaryEvidenceIDs.length === 0) {
    errors.push(issue("missingBoundaryEvidence", `${entry.entryID} requires boundary evidence.`, entry.entryID));
  }
  if (entry.evidence.representativeEvidenceIDs.length === 0) {
    errors.push(issue("missingRepresentativeEvidence", `${entry.entryID} requires representative evidence.`, entry.entryID));
  }
  if (!hasUsableText(entry.evidence.notes)) {
    errors.push(issue("missingEvidenceNotes", `${entry.entryID} requires evidence notes.`, entry.entryID));
  }
}

function validateDependencies(entry: Phase0AdditionalAttributeEntry, errors: Phase0AdditionalAttributesValidationIssue[]) {
  for (const dependency of entry.dependencies) {
    if (!hasUsableText(dependency.dependencyID) || !hasUsableText(dependency.condition) || !hasUsableText(dependency.notes)) {
      errors.push(issue("invalidDependency", `${entry.entryID} has incomplete dependency metadata.`, entry.entryID));
    }
    if (!dependency.dependsOnStableID && !dependency.dependsOnMenuID) {
      errors.push(issue("missingDependencyTarget", `${entry.entryID} dependency requires a stable ID or menu ID target.`, entry.entryID));
    }
    if (dependency.evidenceFileIDs.length === 0) {
      errors.push(issue("missingDependencyEvidence", `${entry.entryID} dependency requires evidence.`, entry.entryID));
    }
  }
}

function validateRecommendationSuitability(
  entry: Phase0AdditionalAttributeEntry,
  errors: Phase0AdditionalAttributesValidationIssue[],
  warnings: Phase0AdditionalAttributesValidationIssue[]
) {
  if (entry.recommendationSuitability === "suitable" && entry.verificationStatus !== "verified") {
    errors.push(issue("recommendationRequiresVerification", `${entry.entryID} cannot be suitable for recommendations before verification.`, entry.entryID));
  }
  if (entry.resetOnHeadChange === null) {
    warnings.push(issue("resetBehaviorUnknown", `${entry.entryID} reset-on-head-change behavior is unknown.`, entry.entryID));
  }
  if (entry.laterVisibility === "unknown") {
    warnings.push(issue("laterVisibilityUnknown", `${entry.entryID} later visibility is unknown.`, entry.entryID));
  }
}

function normalizeCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || "UNKNOWN";
}

function issue(code: string, message: string, entryID?: Phase0EntityID): Phase0AdditionalAttributesValidationIssue {
  return { code, message, entryID };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
