import type { CapturedAngleID, CaptureMode, DataSourceType, ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VersionID } from "./phase-zero-domain";

export const PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION = "phase0-manual-matching-study-v1";

export type Phase0StudyRank = 1 | 2 | 3;
export type Phase0ManualStudyResultStatus = "planned" | "inReview" | "complete" | "withdrawn" | "blocked";
export type Phase0RawMediaDeletionStatus = "notCaptured" | "pendingDeletion" | "deleted" | "retainedWithExplicitConsent";
export type Phase0ManualMismatchReason =
  | "headShapeMismatch"
  | "jawMismatch"
  | "eyeMismatch"
  | "noseMismatch"
  | "mouthMismatch"
  | "hairMismatch"
  | "facialHairMismatch"
  | "bodyPreferenceMismatch"
  | "catalogCoverageGap"
  | "captureQuality"
  | "uncertain";

export type Phase0ReferenceViewCompleteness = Record<CapturedAngleID, boolean>;

export interface Phase0ManualStudyConsentRecord {
  consentRecordID: Phase0EntityID;
  consentVersion: Phase0VersionID;
  acknowledgedAt: ISODateString;
  allowsManualReviewerEvaluation: boolean;
  allowsTemporaryRawMediaProcessing: boolean;
  allowsDerivedProfileUse: boolean;
  withdrawalRequestedAt: ISODateString | null;
}

export interface Phase0ManualStudyCatalogVersion {
  catalogVersionID: Phase0VersionID;
  game: string;
  platform: string;
  gameVersion: string;
  patchVersion: string;
  verifiedAt: ISODateString | null;
}

export interface Phase0RankedHeadChoice {
  rank: Phase0StudyRank;
  catalogItemID: Phase0EntityID;
  catalogStableInternalID: string;
  reviewerID: string;
  reason: string;
}

export interface Phase0ManualAppearanceChoice {
  catalogItemID: Phase0EntityID | null;
  catalogStableInternalID: string | null;
  reviewerID: string;
  reason: string;
}

export interface Phase0SubjectPreferredResult {
  selectedCatalogItemID: Phase0EntityID | null;
  selectedStableInternalID: string | null;
  notes: string;
}

export interface Phase0ReviewerAgreement {
  reviewerIDs: string[];
  agreedTopChoice: boolean | null;
  agreedTopThreeSet: boolean | null;
  agreementNotes: string;
}

export interface Phase0RawMediaDeletionState {
  status: Phase0RawMediaDeletionStatus;
  requestedAt: ISODateString | null;
  completedAt: ISODateString | null;
  verifiedBy: string | null;
  retentionConsentRecordID: Phase0EntityID | null;
}

export interface Phase0ManualMatchingStudyResult {
  schemaVersion: typeof PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION;
  sourceType: DataSourceType;
  studyVersion: Phase0VersionID;
  studyID: Phase0EntityID;
  resultID: Phase0EntityID;
  consentRecord: Phase0ManualStudyConsentRecord;
  subjectPseudonymousID: string;
  captureMode: CaptureMode;
  referenceViewCompleteness: Phase0ReferenceViewCompleteness;
  humanReviewerIDs: string[];
  rankedHeadChoices: Phase0RankedHeadChoice[];
  hairChoice: Phase0ManualAppearanceChoice | null;
  facialHairChoice: Phase0ManualAppearanceChoice | null;
  subjectPreferredResult: Phase0SubjectPreferredResult | null;
  rankSelected: Phase0StudyRank | null;
  mainMismatchReasons: Phase0ManualMismatchReason[];
  reviewerAgreement: Phase0ReviewerAgreement;
  rawMediaDeletionState: Phase0RawMediaDeletionState;
  catalogVersion: Phase0ManualStudyCatalogVersion;
  status: Phase0ManualStudyResultStatus;
  resultTimestamps: {
    capturedAt: ISODateString | null;
    reviewedAt: ISODateString | null;
    subjectSelectedAt: ISODateString | null;
    finalizedAt: ISODateString | null;
  };
  notes: string;
  isTestFixture: boolean;
}

export interface Phase0ManualMatchingStudyValidationIssue {
  code: string;
  message: string;
  entityID?: string;
}

export interface Phase0ManualMatchingStudyValidationReport {
  ok: boolean;
  errors: Phase0ManualMatchingStudyValidationIssue[];
  warnings: Phase0ManualMatchingStudyValidationIssue[];
}

const validRanks = new Set([1, 2, 3]);
const supportedStudyCaptureModes = new Set<CaptureMode>(["webRgbGuided", "webManualUpload", "iPhoneTrueDepthAssisted", "iPhoneTrueDepthSelfScan", "standardCamera"]);
const requiredAngles: CapturedAngleID[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];

export function validatePhase0ManualMatchingStudyResult(
  result: Phase0ManualMatchingStudyResult,
  options: { fixtureOnly?: boolean } = {}
): Phase0ManualMatchingStudyValidationReport {
  const errors: Phase0ManualMatchingStudyValidationIssue[] = [];
  const warnings: Phase0ManualMatchingStudyValidationIssue[] = [];
  const entityID = result.resultID || result.studyID;

  if (result.schemaVersion !== PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION}.`, entityID));
  }
  if (result.sourceType !== "testFixture" && options.fixtureOnly) {
    errors.push(issue("fixtureSourceTypeRequired", `${entityID} fixture records must use sourceType testFixture.`, entityID));
  }
  for (const [field, value] of [
    ["studyVersion", result.studyVersion],
    ["studyID", result.studyID],
    ["resultID", result.resultID],
    ["subjectPseudonymousID", result.subjectPseudonymousID],
    ["notes", result.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingStudyField", `${entityID} is missing ${field}.`, entityID));
  }
  validateConsent(result, errors, entityID);
  validateReferenceViews(result.referenceViewCompleteness, errors, warnings, entityID);
  validateReviewers(result, errors, entityID);
  validateRankedChoices(result, errors, entityID);
  validateOptionalChoice(result.hairChoice, "hairChoice", errors, entityID);
  validateOptionalChoice(result.facialHairChoice, "facialHairChoice", errors, entityID);
  validateSubjectSelection(result, errors, entityID);
  validateRawMediaDeletion(result, errors, warnings, entityID);
  validateCatalogVersion(result, errors, entityID);
  validateTimestamps(result, errors, entityID);

  if (!supportedStudyCaptureModes.has(result.captureMode)) {
    errors.push(issue("unsupportedCaptureMode", `${entityID} uses unsupported study capture mode ${result.captureMode}.`, entityID));
  }
  if (options.fixtureOnly && !result.isTestFixture) {
    errors.push(issue("fixtureFlagRequired", `${entityID} must be clearly marked as a test fixture.`, entityID));
  }
  if (result.isTestFixture && !/^synthetic-|^test-only-/i.test(result.subjectPseudonymousID)) {
    errors.push(issue("invalidFixtureSubjectID", `${entityID} fixture subject IDs must use a synthetic/test-only prefix.`, entityID));
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function hasCompleteRequiredReferenceViews(result: Pick<Phase0ManualMatchingStudyResult, "referenceViewCompleteness">) {
  return requiredAngles.every((angle) => result.referenceViewCompleteness[angle]);
}

function validateConsent(result: Phase0ManualMatchingStudyResult, errors: Phase0ManualMatchingStudyValidationIssue[], entityID: string) {
  const consent = result.consentRecord;
  for (const [field, value] of [
    ["consentRecordID", consent.consentRecordID],
    ["consentVersion", consent.consentVersion]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingConsentField", `${entityID} is missing ${field}.`, entityID));
  }
  if (!isISODate(consent.acknowledgedAt)) errors.push(issue("invalidConsentTimestamp", `${entityID} has invalid consent timestamp.`, entityID));
  if (!consent.allowsManualReviewerEvaluation || !consent.allowsTemporaryRawMediaProcessing || !consent.allowsDerivedProfileUse) {
    errors.push(issue("missingRequiredConsent", `${entityID} is missing required manual study consent.`, entityID));
  }
  if (consent.withdrawalRequestedAt && !isISODate(consent.withdrawalRequestedAt)) {
    errors.push(issue("invalidConsentTimestamp", `${entityID} has invalid withdrawal timestamp.`, entityID));
  }
}

function validateReferenceViews(
  completeness: Phase0ReferenceViewCompleteness,
  errors: Phase0ManualMatchingStudyValidationIssue[],
  warnings: Phase0ManualMatchingStudyValidationIssue[],
  entityID: string
) {
  const missing = requiredAngles.filter((angle) => !completeness[angle]);
  if (missing.length > 0) {
    warnings.push(issue("incompleteReferenceViews", `${entityID} is missing reference views: ${missing.join(", ")}.`, entityID));
  }
  for (const angle of requiredAngles) {
    if (typeof completeness[angle] !== "boolean") {
      errors.push(issue("invalidReferenceViewCompleteness", `${entityID} must record ${angle} completeness as a boolean.`, entityID));
    }
  }
}

function validateReviewers(result: Phase0ManualMatchingStudyResult, errors: Phase0ManualMatchingStudyValidationIssue[], entityID: string) {
  const unique = new Set(result.humanReviewerIDs.filter(hasUsableText));
  if (unique.size < 2) {
    errors.push(issue("insufficientReviewers", `${entityID} requires at least two human reviewers for agreement tracking.`, entityID));
  }
  const agreementReviewers = new Set(result.reviewerAgreement.reviewerIDs.filter(hasUsableText));
  if (agreementReviewers.size < 2) {
    errors.push(issue("missingReviewerAgreement", `${entityID} requires reviewer agreement from at least two reviewers.`, entityID));
  }
}

function validateRankedChoices(result: Phase0ManualMatchingStudyResult, errors: Phase0ManualMatchingStudyValidationIssue[], entityID: string) {
  if (result.rankedHeadChoices.length !== 3) {
    errors.push(issue("invalidRankedHeadChoiceCount", `${entityID} must record exactly three ranked head choices.`, entityID));
  }
  const ranks = new Set<number>();
  const catalogIDs = new Set<string>();
  for (const choice of result.rankedHeadChoices) {
    if (!validRanks.has(choice.rank)) errors.push(issue("invalidRank", `${entityID} has invalid rank ${choice.rank}.`, entityID));
    if (ranks.has(choice.rank)) errors.push(issue("duplicateRank", `${entityID} repeats rank ${choice.rank}.`, entityID));
    ranks.add(choice.rank);
    if (!hasUsableText(choice.catalogItemID) || !hasUsableText(choice.catalogStableInternalID) || !hasUsableText(choice.reviewerID) || !hasUsableText(choice.reason)) {
      errors.push(issue("invalidRankedHeadChoice", `${entityID} has incomplete ranked head choice data.`, entityID));
    }
    if (catalogIDs.has(choice.catalogItemID)) errors.push(issue("duplicateRankedHeadChoice", `${entityID} repeats head choice ${choice.catalogItemID}.`, entityID));
    catalogIDs.add(choice.catalogItemID);
  }
}

function validateOptionalChoice(
  choice: Phase0ManualAppearanceChoice | null,
  field: string,
  errors: Phase0ManualMatchingStudyValidationIssue[],
  entityID: string
) {
  if (!choice) return;
  if (!hasUsableText(choice.reviewerID) || !hasUsableText(choice.reason)) {
    errors.push(issue("invalidAppearanceChoice", `${entityID} has incomplete ${field}.`, entityID));
  }
  if ((choice.catalogItemID && !choice.catalogStableInternalID) || (!choice.catalogItemID && choice.catalogStableInternalID)) {
    errors.push(issue("inconsistentAppearanceChoice", `${entityID} ${field} must pair catalog ID and stable ID together.`, entityID));
  }
}

function validateSubjectSelection(result: Phase0ManualMatchingStudyResult, errors: Phase0ManualMatchingStudyValidationIssue[], entityID: string) {
  if (result.rankSelected !== null && !validRanks.has(result.rankSelected)) {
    errors.push(issue("invalidSelectedRank", `${entityID} selected rank must be 1, 2, 3, or null.`, entityID));
  }
  if (result.subjectPreferredResult) {
    const preferred = result.subjectPreferredResult;
    if (!hasUsableText(preferred.notes)) errors.push(issue("missingSubjectPreferenceNotes", `${entityID} needs subject preference notes.`, entityID));
    if ((preferred.selectedCatalogItemID && !preferred.selectedStableInternalID) || (!preferred.selectedCatalogItemID && preferred.selectedStableInternalID)) {
      errors.push(issue("inconsistentSubjectPreference", `${entityID} subject preference must pair catalog ID and stable ID together.`, entityID));
    }
  }
}

function validateRawMediaDeletion(
  result: Phase0ManualMatchingStudyResult,
  errors: Phase0ManualMatchingStudyValidationIssue[],
  warnings: Phase0ManualMatchingStudyValidationIssue[],
  entityID: string
) {
  const deletion = result.rawMediaDeletionState;
  if (deletion.status === "deleted") {
    if (!isISODate(deletion.completedAt) || !hasUsableText(deletion.verifiedBy ?? "")) {
      errors.push(issue("incompleteRawMediaDeletion", `${entityID} deleted raw media needs completion timestamp and verifier.`, entityID));
    }
  }
  if (deletion.status === "pendingDeletion") {
    warnings.push(issue("rawMediaDeletionPending", `${entityID} raw media deletion is still pending.`, entityID));
  }
  if (deletion.status === "retainedWithExplicitConsent" && deletion.retentionConsentRecordID !== result.consentRecord.consentRecordID) {
    errors.push(issue("missingRawMediaRetentionConsent", `${entityID} retained media requires matching explicit consent record.`, entityID));
  }
  if (deletion.requestedAt && !isISODate(deletion.requestedAt)) errors.push(issue("invalidRawMediaDeletionTimestamp", `${entityID} has invalid deletion request timestamp.`, entityID));
  if (deletion.completedAt && !isISODate(deletion.completedAt)) errors.push(issue("invalidRawMediaDeletionTimestamp", `${entityID} has invalid deletion completion timestamp.`, entityID));
}

function validateCatalogVersion(result: Phase0ManualMatchingStudyResult, errors: Phase0ManualMatchingStudyValidationIssue[], entityID: string) {
  const catalogVersion = result.catalogVersion;
  for (const [field, value] of [
    ["catalogVersionID", catalogVersion.catalogVersionID],
    ["game", catalogVersion.game],
    ["platform", catalogVersion.platform],
    ["gameVersion", catalogVersion.gameVersion],
    ["patchVersion", catalogVersion.patchVersion]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingCatalogVersionField", `${entityID} is missing ${field}.`, entityID));
  }
  if (catalogVersion.verifiedAt && !isISODate(catalogVersion.verifiedAt)) {
    errors.push(issue("invalidCatalogVerificationTimestamp", `${entityID} has invalid catalog verification timestamp.`, entityID));
  }
}

function validateTimestamps(result: Phase0ManualMatchingStudyResult, errors: Phase0ManualMatchingStudyValidationIssue[], entityID: string) {
  for (const [field, value] of Object.entries(result.resultTimestamps)) {
    if (value !== null && !isISODate(value)) {
      errors.push(issue("invalidResultTimestamp", `${entityID} has invalid ${field}.`, entityID));
    }
  }
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}

function isISODate(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function issue(code: string, message: string, entityID?: string): Phase0ManualMatchingStudyValidationIssue {
  return { code, message, entityID };
}
