import type { ISODateString, StandardFacialMeasurementID } from "@/types/domain";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";

export const PHASE0_CATALOG_ITEM_SCHEMA_VERSION = "phase0-catalog-item-v1";

export type Phase0CatalogRecordKind = "headPreset" | "hairstyle" | "facialHair" | "additionalFaceMatchingAttribute";
export type Phase0CatalogDeprecationState = "active" | "deprecated" | "superseded" | "retired";
export type Phase0CanonicalSettingValueType = "label" | "index" | "number" | "boolean" | "color" | "unknown";
export type Phase0CatalogEvidencePurpose = "optionIdentity" | "menuNavigation" | "requiredAngle" | "dependency" | "review" | "deprecation" | "supersession";

export interface Phase0CatalogEvidenceReference {
  evidenceFileID: Phase0EntityID;
  purpose: Phase0CatalogEvidencePurpose;
  requiredAngleID: string | null;
  notes: string;
}

export interface Phase0CatalogDependencyReference {
  dependencyID: Phase0EntityID;
  dependsOnStableID: string | null;
  dependsOnMenuID: Phase0EntityID | null;
  condition: string;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0CanonicalCatalogSetting {
  settingID: Phase0EntityID;
  menuMapID: Phase0EntityID;
  menuItemID: Phase0EntityID;
  nativeLabel: string;
  visibleLabelOrIndex: string;
  nativeOrder: number;
  valueType: Phase0CanonicalSettingValueType;
  canonicalValue: string | number | boolean | null;
  navigationInstructionIDs: Phase0EntityID[];
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0CatalogItemCore {
  schemaVersion: typeof PHASE0_CATALOG_ITEM_SCHEMA_VERSION;
  stableInternalID: string;
  kind: Phase0CatalogRecordKind;
  gameID: Phase0EntityID;
  platformCode: string;
  modeCode: string;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  menuMapID: Phase0EntityID;
  menuItemID: Phase0EntityID;
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  nativeOrder: number;
  evidence: Phase0CatalogEvidenceReference[];
  dependencies: Phase0CatalogDependencyReference[];
  canonicalSettings: Phase0CanonicalCatalogSetting[];
  verificationState: Phase0VerificationState;
  firstReviewID: Phase0EntityID | null;
  secondReviewID: Phase0EntityID | null;
  deprecationState: Phase0CatalogDeprecationState;
  deprecatedReason: string | null;
  supersedesStableID: string | null;
  supersededByStableID: string | null;
  lastCheckedDate: ISODateString;
  isTestFixture: boolean;
  notes: string;
}

export interface Phase0HeadPresetRecord extends Phase0CatalogItemCore {
  kind: "headPreset";
  supportedMeasurementIDs: StandardFacialMeasurementID[];
  geometryAnnotationStatus: "notStarted" | "partial" | "complete";
}

export interface Phase0HairstyleRecord extends Phase0CatalogItemCore {
  kind: "hairstyle";
  standardizedHairLength: "unknown" | "short" | "medium" | "long";
  standardizedHairTexture: "unknown" | "straight" | "wavy" | "curly" | "coiled" | "shaved" | "covered";
  obscuresForehead: boolean | null;
  obscuresEars: boolean | null;
}

export interface Phase0FacialHairRecord extends Phase0CatalogItemCore {
  kind: "facialHair";
  standardizedCoverage: "unknown" | "none" | "mustache" | "goatee" | "beard" | "mixed";
  obscuresJawline: boolean | null;
  obscuresMouth: boolean | null;
}

export interface Phase0AdditionalFaceMatchingAttributeRecord extends Phase0CatalogItemCore {
  kind: "additionalFaceMatchingAttribute";
  attributeFamily: "eyebrow" | "visibleMark" | "body" | "height" | "weight" | "skinPresentation" | "other";
  valueType: Phase0CanonicalSettingValueType;
  affectsGeometrySimilarity: boolean;
}

export type Phase0TypedCatalogItemRecord =
  | Phase0HeadPresetRecord
  | Phase0HairstyleRecord
  | Phase0FacialHairRecord
  | Phase0AdditionalFaceMatchingAttributeRecord;

export interface Phase0TypedCatalogItemValidationIssue {
  code: string;
  message: string;
  stableInternalID?: string;
}

export interface Phase0TypedCatalogItemValidationReport {
  ok: boolean;
  errors: Phase0TypedCatalogItemValidationIssue[];
  warnings: Phase0TypedCatalogItemValidationIssue[];
}

const idPatterns: Record<Phase0CatalogRecordKind, RegExp> = {
  headPreset: /^CF27_[A-Z0-9]+_[A-Z0-9]+_HEAD_[0-9]{3}$/,
  hairstyle: /^CF27_[A-Z0-9]+_[A-Z0-9]+_HAIR_[0-9]{3}$/,
  facialHair: /^CF27_[A-Z0-9]+_[A-Z0-9]+_FACIALHAIR_[0-9]{3}$/,
  additionalFaceMatchingAttribute: /^CF27_[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_[0-9]{3}$/
};

const requiredAngleIDs = new Set(["straightOn", "left45", "right45", "leftProfile", "rightProfile"]);

export function validatePhase0TypedCatalogItemRecord(record: Phase0TypedCatalogItemRecord): Phase0TypedCatalogItemValidationReport {
  const errors: Phase0TypedCatalogItemValidationIssue[] = [];
  const warnings: Phase0TypedCatalogItemValidationIssue[] = [];
  const stableInternalID = record.stableInternalID;

  if (record.schemaVersion !== PHASE0_CATALOG_ITEM_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_CATALOG_ITEM_SCHEMA_VERSION}.`, stableInternalID));
  }
  if (!idPatterns[record.kind].test(stableInternalID)) {
    errors.push(issue("invalidStableIDConvention", `${stableInternalID} does not match the required ${record.kind} stable ID convention.`, stableInternalID));
  }
  if (!stableInternalID.includes(`_${record.platformCode}_`) || !stableInternalID.includes(`_${record.modeCode}_`)) {
    errors.push(issue("stableIDMetadataMismatch", `${stableInternalID} must include platformCode and modeCode segments.`, stableInternalID));
  }
  for (const [field, value] of [
    ["platformCode", record.platformCode],
    ["modeCode", record.modeCode],
    ["nativeCategoryLabel", record.nativeCategoryLabel],
    ["visibleGameLabelOrIndex", record.visibleGameLabelOrIndex],
    ["notes", record.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingCatalogItemField", `${stableInternalID} is missing ${field}.`, stableInternalID));
  }
  if (!Number.isInteger(record.nativeOrder) || record.nativeOrder < 1) {
    errors.push(issue("invalidNativeOrder", `${stableInternalID} nativeOrder must be a positive integer.`, stableInternalID));
  }
  if (!isDateOnly(record.lastCheckedDate)) {
    errors.push(issue("invalidLastCheckedDate", `${stableInternalID} lastCheckedDate must be YYYY-MM-DD.`, stableInternalID));
  }
  validateEvidence(record, errors);
  validateDependencies(record, errors, warnings);
  validateCanonicalSettings(record, errors);
  validateVerification(record, errors);
  validateDeprecation(record, errors, warnings);
  validateKindSpecificFields(record, errors);

  return { ok: errors.length === 0, errors, warnings };
}

export function requiredStableIDPatternForCatalogKind(kind: Phase0CatalogRecordKind) {
  return idPatterns[kind];
}

function validateEvidence(record: Phase0TypedCatalogItemRecord, errors: Phase0TypedCatalogItemValidationIssue[]) {
  if (record.evidence.length === 0) {
    errors.push(issue("missingEvidenceReference", `${record.stableInternalID} requires evidence references.`, record.stableInternalID));
  }
  for (const evidence of record.evidence) {
    if (!hasUsableText(evidence.evidenceFileID) || !hasUsableText(evidence.notes)) {
      errors.push(issue("missingEvidenceReference", `${record.stableInternalID} has incomplete evidence metadata.`, record.stableInternalID));
    }
  }
  if (record.kind === "headPreset") {
    const angles = new Set(record.evidence.map((evidence) => evidence.requiredAngleID).filter((angle): angle is string => Boolean(angle)));
    for (const angle of requiredAngleIDs) {
      if (!angles.has(angle)) {
        errors.push(issue("missingRequiredAngleEvidence", `${record.stableInternalID} is missing ${angle} evidence.`, record.stableInternalID));
      }
    }
  }
}

function validateDependencies(
  record: Phase0TypedCatalogItemRecord,
  errors: Phase0TypedCatalogItemValidationIssue[],
  warnings: Phase0TypedCatalogItemValidationIssue[]
) {
  for (const dependency of record.dependencies) {
    if (!hasUsableText(dependency.dependencyID) || !hasUsableText(dependency.condition)) {
      errors.push(issue("invalidDependency", `${record.stableInternalID} has incomplete dependency metadata.`, record.stableInternalID));
    }
    if (!dependency.dependsOnStableID && !dependency.dependsOnMenuID) {
      warnings.push(issue("dependencyTargetUnknown", `${record.stableInternalID} dependency has no linked stable ID or menu ID.`, record.stableInternalID));
    }
    if (dependency.evidenceFileIDs.length === 0) {
      errors.push(issue("missingEvidenceReference", `${record.stableInternalID} dependency requires evidence.`, record.stableInternalID));
    }
  }
}

function validateCanonicalSettings(record: Phase0TypedCatalogItemRecord, errors: Phase0TypedCatalogItemValidationIssue[]) {
  if (record.canonicalSettings.length === 0) {
    errors.push(issue("missingCanonicalSettings", `${record.stableInternalID} requires canonical setting metadata.`, record.stableInternalID));
  }
  for (const setting of record.canonicalSettings) {
    for (const [field, value] of [
      ["settingID", setting.settingID],
      ["menuMapID", setting.menuMapID],
      ["menuItemID", setting.menuItemID],
      ["nativeLabel", setting.nativeLabel],
      ["visibleLabelOrIndex", setting.visibleLabelOrIndex],
      ["notes", setting.notes]
    ] as const) {
      if (!hasUsableText(value)) errors.push(issue("invalidCanonicalSetting", `${record.stableInternalID} canonical setting is missing ${field}.`, record.stableInternalID));
    }
    if (!Number.isInteger(setting.nativeOrder) || setting.nativeOrder < 1) {
      errors.push(issue("invalidNativeOrder", `${record.stableInternalID} canonical setting nativeOrder must be a positive integer.`, record.stableInternalID));
    }
    if (setting.navigationInstructionIDs.length === 0 || setting.evidenceFileIDs.length === 0) {
      errors.push(issue("missingCanonicalSettingEvidence", `${record.stableInternalID} canonical setting requires navigation and evidence references.`, record.stableInternalID));
    }
  }
}

function validateVerification(record: Phase0TypedCatalogItemRecord, errors: Phase0TypedCatalogItemValidationIssue[]) {
  if (record.verificationState === "verified" && (!record.firstReviewID || !record.secondReviewID || record.firstReviewID === record.secondReviewID)) {
    errors.push(issue("missingSecondReview", `${record.stableInternalID} requires first and second reviews from different records before verification.`, record.stableInternalID));
  }
}

function validateDeprecation(
  record: Phase0TypedCatalogItemRecord,
  errors: Phase0TypedCatalogItemValidationIssue[],
  warnings: Phase0TypedCatalogItemValidationIssue[]
) {
  if (record.deprecationState === "superseded" && !hasUsableText(record.supersededByStableID ?? "")) {
    errors.push(issue("missingSupersessionTarget", `${record.stableInternalID} is superseded without a supersededByStableID.`, record.stableInternalID));
  }
  if ((record.deprecationState === "deprecated" || record.deprecationState === "retired") && !hasUsableText(record.deprecatedReason ?? "")) {
    errors.push(issue("missingDeprecationContext", `${record.stableInternalID} requires deprecation context.`, record.stableInternalID));
  }
  if (record.deprecationState === "active" && (record.deprecatedReason || record.supersededByStableID)) {
    warnings.push(issue("activeRecordHasDeprecationMetadata", `${record.stableInternalID} is active but includes deprecation metadata.`, record.stableInternalID));
  }
}

function validateKindSpecificFields(record: Phase0TypedCatalogItemRecord, errors: Phase0TypedCatalogItemValidationIssue[]) {
  if (record.kind === "headPreset" && record.geometryAnnotationStatus === "complete" && record.supportedMeasurementIDs.length === 0) {
    errors.push(issue("missingMeasurementAnnotations", `${record.stableInternalID} complete head geometry requires supported measurements.`, record.stableInternalID));
  }
  if (record.kind === "additionalFaceMatchingAttribute" && record.attributeFamily === "skinPresentation" && record.affectsGeometrySimilarity) {
    errors.push(issue("sensitiveGeometrySeparation", `${record.stableInternalID} skin presentation must not affect geometry similarity.`, record.stableInternalID));
  }
}

function issue(code: string, message: string, stableInternalID?: string): Phase0TypedCatalogItemValidationIssue {
  return { code, message, stableInternalID };
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
