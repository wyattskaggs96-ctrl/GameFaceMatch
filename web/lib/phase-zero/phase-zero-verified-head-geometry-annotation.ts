import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";

export const PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION = "phase0-verified-head-geometry-annotation-v1";

export const verifiedHeadGeometryViews = ["FRONT", "LEFT_3Q", "RIGHT_3Q", "LEFT_PROFILE", "RIGHT_PROFILE", "REAR", "ELEVATED", "LOWERED"] as const;
export type VerifiedHeadGeometryView = (typeof verifiedHeadGeometryViews)[number];

export const verifiedHeadGeometryMeasurementSources = [
  "LANDMARK_MEASUREMENT",
  "MANUAL_FROM_STANDARDIZED_IMAGE",
  "HYBRID_LANDMARK_AND_REVIEW",
  "HUMAN_REVIEW",
  "UNAVAILABLE"
] as const;
export type VerifiedHeadGeometryMeasurementSource = (typeof verifiedHeadGeometryMeasurementSources)[number];

export const verifiedHeadGeometryAvailabilityStates = ["MEASURED", "CONTROLLED_REVIEW", "UNAVAILABLE", "NOT_APPLICABLE"] as const;
export type VerifiedHeadGeometryAvailabilityState = (typeof verifiedHeadGeometryAvailabilityStates)[number];

export const verifiedHeadGeometryAgreementStatuses = ["NOT_REVIEWED", "SINGLE_REVIEWER", "AGREED", "DISPUTED", "ADJUDICATED"] as const;
export type VerifiedHeadGeometryAgreementStatus = (typeof verifiedHeadGeometryAgreementStatuses)[number];

export const verifiedHeadGeometryQAStatuses = ["DRAFT", "QA_READY", "QA_ACCEPTED", "QA_REJECTED", "RECAPTURE_REQUIRED"] as const;
export type VerifiedHeadGeometryQAStatus = (typeof verifiedHeadGeometryQAStatuses)[number];

export const noseTipFormValues = ["roundedApex", "pointedApex", "broadApex", "flatApex", "asymmetricApex", "unavailable"] as const;
export type NoseTipFormValue = (typeof noseTipFormValues)[number];

export const verifiedHeadGeometryFieldIDs = [
  "faceWidth",
  "faceLength",
  "foreheadWidth",
  "templeWidth",
  "cheekboneWidth",
  "jawWidth",
  "jawAngle",
  "chinWidth",
  "chinHeight",
  "chinProjection",
  "eyeSize",
  "eyeSpacing",
  "eyeTilt",
  "browPosition",
  "noseLength",
  "noseWidth",
  "noseProjection",
  "noseTipForm",
  "mouthWidth",
  "lipProportions",
  "earHeight",
  "earProjection",
  "symmetryIndicators"
] as const;
export type VerifiedHeadGeometryFieldID = (typeof verifiedHeadGeometryFieldIDs)[number];

export type VerifiedHeadGeometryValueKind = "normalizedRatio" | "angleDegrees" | "controlledGeometryForm" | "symmetryIndicators";

export interface VerifiedHeadSymmetryIndicators {
  faceMidlineDeviationRatio: number;
  eyeHeightDifferenceRatio: number;
  jawSideDifferenceRatio: number;
  mouthCornerHeightDifferenceRatio: number;
}

export type VerifiedHeadGeometryFieldValue = number | NoseTipFormValue | VerifiedHeadSymmetryIndicators | null;

export interface VerifiedHeadGeometryFieldDefinition {
  fieldID: VerifiedHeadGeometryFieldID;
  label: string;
  valueKind: VerifiedHeadGeometryValueKind;
  range: {
    minimum: number | null;
    maximum: number | null;
    unit: "normalizedRatio" | "degrees" | "controlledValue" | "ratioSet";
  };
  acceptableEvidenceViews: VerifiedHeadGeometryView[];
  allowedMeasurementSources: VerifiedHeadGeometryMeasurementSource[];
  missingDataBehavior: "MARK_UNAVAILABLE_DO_NOT_INFER";
  qaNotes: string;
}

export interface VerifiedHeadGeometryFieldAnnotation {
  fieldID: VerifiedHeadGeometryFieldID;
  availability: VerifiedHeadGeometryAvailabilityState;
  value: VerifiedHeadGeometryFieldValue;
  confidence: number;
  measurementSource: VerifiedHeadGeometryMeasurementSource;
  supportingEvidenceIDs: Phase0EntityID[];
  supportingViews: VerifiedHeadGeometryView[];
  missingReason?: string;
  reviewerNotes?: string;
}

export interface VerifiedHeadReviewerAgreement {
  status: VerifiedHeadGeometryAgreementStatus;
  primaryReviewerID: Phase0EntityID | null;
  secondReviewerID: Phase0EntityID | null;
  adjudicatorID?: Phase0EntityID | null;
  agreementScore: number | null;
  disagreements: Array<{
    fieldID: VerifiedHeadGeometryFieldID;
    primaryValue: string;
    secondValue: string;
    resolution: string | null;
  }>;
}

export interface VerifiedHeadAnnotationQA {
  status: VerifiedHeadGeometryQAStatus;
  checkedBy: Phase0EntityID | null;
  checkedAt: ISODateString | null;
  checklist: {
    nativeLabelPreserved: boolean;
    verifiedHeadPresetOnly: boolean;
    evidenceViewsAllowed: boolean;
    noSensitiveTraits: boolean;
    missingDataMarkedUnavailable: boolean;
    reviewerAgreementRecorded: boolean;
  };
  unresolvedBlockers: string[];
}

export interface VerifiedHeadGeometryAnnotation {
  schemaVersion: typeof PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION;
  annotationID: Phase0EntityID;
  catalogStableID: string;
  catalogVersionID: string;
  targetCategory: "headPreset";
  targetVerificationStatus: "VERIFIED" | "VERIFIED_WITH_NOTES";
  createdAt: ISODateString;
  updatedAt: ISODateString;
  fieldDefinitionsVersion: typeof PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION;
  fields: Record<VerifiedHeadGeometryFieldID, VerifiedHeadGeometryFieldAnnotation>;
  reviewerAgreement: VerifiedHeadReviewerAgreement;
  annotationQA: VerifiedHeadAnnotationQA;
}

export interface VerifiedHeadGeometryValidationIssue {
  code:
    | "invalidSchemaVersion"
    | "invalidTarget"
    | "missingField"
    | "unknownField"
    | "invalidAvailability"
    | "invalidValue"
    | "invalidConfidence"
    | "invalidMeasurementSource"
    | "invalidEvidence"
    | "invalidReviewerAgreement"
    | "invalidAnnotationQA"
    | "prohibitedAnnotationField";
  message: string;
  path: string;
}

export interface VerifiedHeadGeometryValidationReport {
  ok: boolean;
  errors: VerifiedHeadGeometryValidationIssue[];
  warnings: VerifiedHeadGeometryValidationIssue[];
}

export const verifiedHeadGeometryProhibitedKeys = [
  "race",
  "ethnicity",
  "attractiveness",
  "personality",
  "health",
  "criminality",
  "identity",
  "celebrityResemblance",
  "lifestyle"
] as const;

const frontViews: VerifiedHeadGeometryView[] = ["FRONT", "LEFT_3Q", "RIGHT_3Q"];
const profileViews: VerifiedHeadGeometryView[] = ["LEFT_PROFILE", "RIGHT_PROFILE", "LEFT_3Q", "RIGHT_3Q"];

export const verifiedHeadGeometryFieldDefinitions: Record<VerifiedHeadGeometryFieldID, VerifiedHeadGeometryFieldDefinition> = {
  faceWidth: ratio("faceWidth", "Face width ratio", frontViews, "Normalize to face length or canonical head box height."),
  faceLength: ratio("faceLength", "Face length ratio", frontViews, "Normalize to face width or canonical head box width."),
  foreheadWidth: ratio("foreheadWidth", "Forehead width ratio", frontViews, "Requires clear hairline or reviewer-confirmed forehead boundary."),
  templeWidth: ratio("templeWidth", "Temple width ratio", frontViews, "Mark unavailable when hair or menu obstruction hides temples."),
  cheekboneWidth: ratio("cheekboneWidth", "Cheekbone width ratio", frontViews, "Use visible cheekbone span only when boundaries are reviewable."),
  jawWidth: ratio("jawWidth", "Jaw width ratio", frontViews, "Use lower-face width normalized to face width."),
  jawAngle: angle("jawAngle", "Approximate jaw angle", 45, 170, ["FRONT", "LEFT_3Q", "RIGHT_3Q", "LEFT_PROFILE", "RIGHT_PROFILE"]),
  chinWidth: ratio("chinWidth", "Chin width ratio", frontViews, "Use chin width normalized to face width."),
  chinHeight: ratio("chinHeight", "Chin height ratio", frontViews, "Use chin height normalized to lower-face height."),
  chinProjection: ratio("chinProjection", "Chin projection ratio", profileViews, "Requires profile or three-quarter evidence; do not infer from front-only imagery."),
  eyeSize: ratio("eyeSize", "Mean eye size ratio", frontViews, "Use visible eye opening/width only when eyes are unobstructed."),
  eyeSpacing: ratio("eyeSpacing", "Eye spacing ratio", frontViews, "Use inner-eye or pupil-center spacing normalized to face width."),
  eyeTilt: angle("eyeTilt", "Eye tilt", -30, 30, frontViews),
  browPosition: ratio("browPosition", "Brow position ratio", frontViews, "Use brow-to-eye distance normalized to eye height or face height."),
  noseLength: ratio("noseLength", "Nose length ratio", frontViews, "Use nose bridge/tip span normalized to face length."),
  noseWidth: ratio("noseWidth", "Nose width ratio", frontViews, "Use nostril or nose base width normalized to face width."),
  noseProjection: ratio("noseProjection", "Nose projection ratio", profileViews, "Requires profile or three-quarter evidence; do not infer from front-only imagery."),
  noseTipForm: {
    fieldID: "noseTipForm",
    label: "Nose-tip form",
    valueKind: "controlledGeometryForm",
    range: { minimum: null, maximum: null, unit: "controlledValue" },
    acceptableEvidenceViews: ["FRONT", "LEFT_3Q", "RIGHT_3Q", "LEFT_PROFILE", "RIGHT_PROFILE"],
    allowedMeasurementSources: ["HUMAN_REVIEW", "HYBRID_LANDMARK_AND_REVIEW", "UNAVAILABLE"],
    missingDataBehavior: "MARK_UNAVAILABLE_DO_NOT_INFER",
    qaNotes: "Allowed values are geometric apex descriptors only; do not record identity, ethnicity, or attractiveness labels."
  },
  mouthWidth: ratio("mouthWidth", "Mouth width ratio", frontViews, "Use mouth corner span normalized to face width."),
  lipProportions: ratio("lipProportions", "Upper-to-lower lip height ratio", frontViews, "Use lip-height ratio only when lips are visible and neutral enough to review."),
  earHeight: ratio("earHeight", "Ear height ratio", ["LEFT_PROFILE", "RIGHT_PROFILE", "LEFT_3Q", "RIGHT_3Q"], "Requires side visibility; do not claim both ears from one side."),
  earProjection: ratio("earProjection", "Ear projection ratio", ["LEFT_PROFILE", "RIGHT_PROFILE", "LEFT_3Q", "RIGHT_3Q"], "Requires side visibility; mark unavailable when hair obstructs the ear."),
  symmetryIndicators: {
    fieldID: "symmetryIndicators",
    label: "Symmetry indicators",
    valueKind: "symmetryIndicators",
    range: { minimum: 0, maximum: 0.5, unit: "ratioSet" },
    acceptableEvidenceViews: frontViews,
    allowedMeasurementSources: ["LANDMARK_MEASUREMENT", "MANUAL_FROM_STANDARDIZED_IMAGE", "HYBRID_LANDMARK_AND_REVIEW", "HUMAN_REVIEW", "UNAVAILABLE"],
    missingDataBehavior: "MARK_UNAVAILABLE_DO_NOT_INFER",
    qaNotes: "Record left/right geometry deltas only; do not label identity, health, or attractiveness."
  }
};

export function createVerifiedHeadGeometryAnnotationTemplate({
  annotationID,
  catalogStableID,
  catalogVersionID,
  nowISO
}: {
  annotationID: Phase0EntityID;
  catalogStableID: string;
  catalogVersionID: string;
  nowISO: ISODateString;
}): VerifiedHeadGeometryAnnotation {
  return {
    schemaVersion: PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION,
    annotationID,
    catalogStableID,
    catalogVersionID,
    targetCategory: "headPreset",
    targetVerificationStatus: "VERIFIED",
    createdAt: nowISO,
    updatedAt: nowISO,
    fieldDefinitionsVersion: PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION,
    fields: Object.fromEntries(verifiedHeadGeometryFieldIDs.map((fieldID) => [fieldID, unavailableField(fieldID)])) as Record<
      VerifiedHeadGeometryFieldID,
      VerifiedHeadGeometryFieldAnnotation
    >,
    reviewerAgreement: {
      status: "NOT_REVIEWED",
      primaryReviewerID: null,
      secondReviewerID: null,
      agreementScore: null,
      disagreements: []
    },
    annotationQA: {
      status: "DRAFT",
      checkedBy: null,
      checkedAt: null,
      checklist: {
        nativeLabelPreserved: false,
        verifiedHeadPresetOnly: false,
        evidenceViewsAllowed: false,
        noSensitiveTraits: false,
        missingDataMarkedUnavailable: true,
        reviewerAgreementRecorded: false
      },
      unresolvedBlockers: ["No reviewer agreement or QA acceptance has been recorded."]
    }
  };
}

export function validateVerifiedHeadGeometryAnnotation(annotation: VerifiedHeadGeometryAnnotation): VerifiedHeadGeometryValidationReport {
  const errors: VerifiedHeadGeometryValidationIssue[] = [];
  const warnings: VerifiedHeadGeometryValidationIssue[] = [];

  if (annotation.schemaVersion !== PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION || annotation.fieldDefinitionsVersion !== PHASE0_VERIFIED_HEAD_GEOMETRY_ANNOTATION_VERSION) {
    errors.push(issue("invalidSchemaVersion", "Verified head geometry annotation schema version is unsupported.", "schemaVersion"));
  }
  if (annotation.targetCategory !== "headPreset" || !["VERIFIED", "VERIFIED_WITH_NOTES"].includes(annotation.targetVerificationStatus)) {
    errors.push(issue("invalidTarget", "Geometry annotations are valid only for verified head preset catalog records.", "targetVerificationStatus"));
  }
  if (!annotation.annotationID?.trim() || !annotation.catalogStableID?.trim() || !annotation.catalogVersionID?.trim()) {
    errors.push(issue("invalidTarget", "Annotation ID, catalog stable ID, and catalog version ID are required.", "annotationID"));
  }

  for (const prohibitedKey of verifiedHeadGeometryProhibitedKeys) {
    if (containsKeyDeep(annotation, prohibitedKey)) {
      errors.push(issue("prohibitedAnnotationField", `Verified head geometry annotations must not include ${prohibitedKey}.`, prohibitedKey));
    }
  }

  const fieldRecord = annotation.fields ?? ({} as Record<VerifiedHeadGeometryFieldID, VerifiedHeadGeometryFieldAnnotation>);
  const expectedFieldSet = new Set<string>(verifiedHeadGeometryFieldIDs);
  for (const fieldID of verifiedHeadGeometryFieldIDs) {
    const field = fieldRecord[fieldID];
    if (!field) {
      errors.push(issue("missingField", `Missing required geometry annotation field ${fieldID}.`, `fields.${fieldID}`));
      continue;
    }
    validateField(fieldID, field, errors, warnings);
  }
  for (const fieldID of Object.keys(fieldRecord)) {
    if (!expectedFieldSet.has(fieldID)) {
      errors.push(issue("unknownField", `Unsupported geometry annotation field ${fieldID}.`, `fields.${fieldID}`));
    }
  }

  validateReviewerAgreement(annotation.reviewerAgreement, errors);
  validateAnnotationQA(annotation.annotationQA, errors);

  return { ok: errors.length === 0, errors, warnings };
}

function ratio(fieldID: VerifiedHeadGeometryFieldID, label: string, acceptableEvidenceViews: VerifiedHeadGeometryView[], qaNotes: string): VerifiedHeadGeometryFieldDefinition {
  return {
    fieldID,
    label,
    valueKind: "normalizedRatio",
    range: { minimum: 0, maximum: 2, unit: "normalizedRatio" },
    acceptableEvidenceViews,
    allowedMeasurementSources: ["LANDMARK_MEASUREMENT", "MANUAL_FROM_STANDARDIZED_IMAGE", "HYBRID_LANDMARK_AND_REVIEW", "HUMAN_REVIEW", "UNAVAILABLE"],
    missingDataBehavior: "MARK_UNAVAILABLE_DO_NOT_INFER",
    qaNotes
  };
}

function angle(
  fieldID: VerifiedHeadGeometryFieldID,
  label: string,
  minimum: number,
  maximum: number,
  acceptableEvidenceViews: VerifiedHeadGeometryView[]
): VerifiedHeadGeometryFieldDefinition {
  return {
    fieldID,
    label,
    valueKind: "angleDegrees",
    range: { minimum, maximum, unit: "degrees" },
    acceptableEvidenceViews,
    allowedMeasurementSources: ["LANDMARK_MEASUREMENT", "MANUAL_FROM_STANDARDIZED_IMAGE", "HYBRID_LANDMARK_AND_REVIEW", "HUMAN_REVIEW", "UNAVAILABLE"],
    missingDataBehavior: "MARK_UNAVAILABLE_DO_NOT_INFER",
    qaNotes: "Record approximate degrees only when supporting views make the angle reviewable."
  };
}

function unavailableField(fieldID: VerifiedHeadGeometryFieldID): VerifiedHeadGeometryFieldAnnotation {
  return {
    fieldID,
    availability: "UNAVAILABLE",
    value: null,
    confidence: 0,
    measurementSource: "UNAVAILABLE",
    supportingEvidenceIDs: [],
    supportingViews: [],
    missingReason: "Not annotated yet."
  };
}

function validateField(
  fieldID: VerifiedHeadGeometryFieldID,
  field: VerifiedHeadGeometryFieldAnnotation,
  errors: VerifiedHeadGeometryValidationIssue[],
  warnings: VerifiedHeadGeometryValidationIssue[]
) {
  const definition = verifiedHeadGeometryFieldDefinitions[fieldID];
  const path = `fields.${fieldID}`;
  if (field.fieldID !== fieldID) errors.push(issue("invalidValue", `Field ID mismatch for ${fieldID}.`, `${path}.fieldID`));
  if (!verifiedHeadGeometryAvailabilityStates.includes(field.availability)) {
    errors.push(issue("invalidAvailability", `${fieldID} has invalid availability.`, `${path}.availability`));
  }
  if (!verifiedHeadGeometryMeasurementSources.includes(field.measurementSource)) {
    errors.push(issue("invalidMeasurementSource", `${fieldID} has invalid measurement source.`, `${path}.measurementSource`));
  }
  if (typeof field.confidence !== "number" || field.confidence < 0 || field.confidence > 1) {
    errors.push(issue("invalidConfidence", `${fieldID} confidence must be between 0 and 1.`, `${path}.confidence`));
  }
  if (!Array.isArray(field.supportingEvidenceIDs) || !Array.isArray(field.supportingViews)) {
    errors.push(issue("invalidEvidence", `${fieldID} requires supporting evidence ID and view arrays.`, path));
  }
  for (const view of field.supportingViews ?? []) {
    if (!definition.acceptableEvidenceViews.includes(view)) {
      errors.push(issue("invalidEvidence", `${fieldID} does not accept supporting view ${view}.`, `${path}.supportingViews`));
    }
  }
  if (!definition.allowedMeasurementSources.includes(field.measurementSource)) {
    errors.push(issue("invalidMeasurementSource", `${fieldID} does not support measurement source ${field.measurementSource}.`, `${path}.measurementSource`));
  }

  if (field.availability === "UNAVAILABLE" || field.availability === "NOT_APPLICABLE") {
    if (field.value !== null || field.confidence !== 0 || field.measurementSource !== "UNAVAILABLE") {
      errors.push(issue("invalidAvailability", `${fieldID} unavailable fields must have null value, zero confidence, and UNAVAILABLE source.`, path));
    }
    if (!field.missingReason?.trim()) {
      errors.push(issue("invalidAvailability", `${fieldID} unavailable fields require a missing reason.`, `${path}.missingReason`));
    }
    return;
  }

  if (field.value === null) errors.push(issue("invalidValue", `${fieldID} has a measured/reviewed availability but no value.`, `${path}.value`));
  if (field.confidence <= 0) errors.push(issue("invalidConfidence", `${fieldID} measured/reviewed fields require confidence greater than 0.`, `${path}.confidence`));
  if (field.measurementSource === "UNAVAILABLE") errors.push(issue("invalidMeasurementSource", `${fieldID} measured/reviewed fields cannot use UNAVAILABLE source.`, `${path}.measurementSource`));
  if ((field.supportingEvidenceIDs?.length ?? 0) === 0 || (field.supportingViews?.length ?? 0) === 0) {
    errors.push(issue("invalidEvidence", `${fieldID} measured/reviewed fields require evidence and supporting views.`, path));
  }
  validateFieldValue(definition, field.value, `${path}.value`, errors);
  if (field.availability === "CONTROLLED_REVIEW" && field.measurementSource === "LANDMARK_MEASUREMENT") {
    warnings.push(issue("invalidMeasurementSource", `${fieldID} is marked controlled review but uses pure landmark measurement source.`, `${path}.measurementSource`));
  }
}

function validateFieldValue(
  definition: VerifiedHeadGeometryFieldDefinition,
  value: VerifiedHeadGeometryFieldValue,
  path: string,
  errors: VerifiedHeadGeometryValidationIssue[]
) {
  if (definition.valueKind === "controlledGeometryForm") {
    if (!noseTipFormValues.includes(value as NoseTipFormValue) || value === "unavailable") {
      errors.push(issue("invalidValue", `${definition.fieldID} requires a controlled nose-tip geometry form.`, path));
    }
    return;
  }
  if (definition.valueKind === "symmetryIndicators") {
    if (!value || typeof value !== "object") {
      errors.push(issue("invalidValue", "Symmetry indicators require the controlled ratio object.", path));
      return;
    }
    for (const [key, childValue] of Object.entries(value as VerifiedHeadSymmetryIndicators)) {
      if (typeof childValue !== "number" || childValue < 0 || childValue > 0.5) {
        errors.push(issue("invalidValue", `Symmetry indicator ${key} must be between 0 and 0.5.`, `${path}.${key}`));
      }
    }
    return;
  }
  if (typeof value !== "number") {
    errors.push(issue("invalidValue", `${definition.fieldID} requires a numeric value.`, path));
    return;
  }
  const { minimum, maximum } = definition.range;
  if ((minimum !== null && value < minimum) || (maximum !== null && value > maximum)) {
    errors.push(issue("invalidValue", `${definition.fieldID} value must be between ${minimum} and ${maximum}.`, path));
  }
}

function validateReviewerAgreement(agreement: VerifiedHeadReviewerAgreement, errors: VerifiedHeadGeometryValidationIssue[]) {
  if (!agreement || !verifiedHeadGeometryAgreementStatuses.includes(agreement.status)) {
    errors.push(issue("invalidReviewerAgreement", "Reviewer agreement status is invalid.", "reviewerAgreement.status"));
    return;
  }
  if (agreement.agreementScore !== null && (typeof agreement.agreementScore !== "number" || agreement.agreementScore < 0 || agreement.agreementScore > 1)) {
    errors.push(issue("invalidReviewerAgreement", "Reviewer agreement score must be null or between 0 and 1.", "reviewerAgreement.agreementScore"));
  }
  if (["AGREED", "DISPUTED", "ADJUDICATED"].includes(agreement.status) && (!agreement.primaryReviewerID || !agreement.secondReviewerID)) {
    errors.push(issue("invalidReviewerAgreement", "Agreement, dispute, or adjudication requires primary and second reviewer IDs.", "reviewerAgreement"));
  }
  if (agreement.status === "DISPUTED" && agreement.disagreements.length === 0) {
    errors.push(issue("invalidReviewerAgreement", "Disputed reviewer agreement requires at least one disagreement.", "reviewerAgreement.disagreements"));
  }
}

function validateAnnotationQA(qa: VerifiedHeadAnnotationQA, errors: VerifiedHeadGeometryValidationIssue[]) {
  if (!qa || !verifiedHeadGeometryQAStatuses.includes(qa.status)) {
    errors.push(issue("invalidAnnotationQA", "Annotation QA status is invalid.", "annotationQA.status"));
    return;
  }
  const checklist = qa.checklist;
  if (!checklist || Object.values(checklist).some((value) => typeof value !== "boolean")) {
    errors.push(issue("invalidAnnotationQA", "Annotation QA checklist must be complete booleans.", "annotationQA.checklist"));
  }
  if (qa.status === "QA_ACCEPTED") {
    if (!qa.checkedBy || !qa.checkedAt) errors.push(issue("invalidAnnotationQA", "QA acceptance requires checkedBy and checkedAt.", "annotationQA"));
    if (qa.unresolvedBlockers.length > 0) errors.push(issue("invalidAnnotationQA", "QA acceptance cannot have unresolved blockers.", "annotationQA.unresolvedBlockers"));
    for (const [key, value] of Object.entries(checklist ?? {})) {
      if (!value) errors.push(issue("invalidAnnotationQA", `QA acceptance requires checklist item ${key}.`, `annotationQA.checklist.${key}`));
    }
  }
}

function containsKeyDeep(value: unknown, targetKey: string): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => key.toLowerCase() === targetKey.toLowerCase() || containsKeyDeep(child, targetKey));
}

function issue(
  code: VerifiedHeadGeometryValidationIssue["code"],
  message: string,
  path: string
): VerifiedHeadGeometryValidationIssue {
  return { code, message, path };
}
