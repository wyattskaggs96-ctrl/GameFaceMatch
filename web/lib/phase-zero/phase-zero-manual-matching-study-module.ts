import type { CapturedAngleID, CaptureMode, DataSourceType, ISODateString } from "@/types/domain";
import type { Phase0EntityID, Phase0VersionID } from "./phase-zero-domain";
import {
  evaluatePhase0ManualMatchingStudy,
  type Phase0ManualMatchingEvaluationReport
} from "./phase-zero-manual-matching-evaluation";
import {
  PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION,
  validatePhase0ManualMatchingStudyResult,
  type Phase0ManualAppearanceChoice,
  type Phase0ManualMatchingStudyResult,
  type Phase0ManualMismatchReason,
  type Phase0ManualStudyCatalogVersion,
  type Phase0ManualStudyConsentRecord,
  type Phase0RankedHeadChoice,
  type Phase0RawMediaDeletionState,
  type Phase0ReferenceViewCompleteness,
  type Phase0ReviewerAgreement,
  type Phase0StudyRank,
  type Phase0SubjectPreferredResult
} from "./phase-zero-manual-matching-study";

export const PHASE0_MANUAL_MATCHING_OPERATION_VERSION = "phase0-manual-matching-operation-v1";
export const MANUAL_STUDY_MIN_PARTICIPANTS = 10;
export const MANUAL_STUDY_MAX_PARTICIPANTS = 20;

export type Phase0ManualStudyParticipantStatus = "draft" | "readyForReview" | "inReview" | "readyForParticipantPreference" | "complete" | "blocked" | "withdrawn";
export type Phase0ManualStudyOperationalIssueSeverity = "blocking" | "warning";

export interface Phase0ManualStudyCatalogGate {
  approvedCatalogReleaseAvailable: boolean;
  releaseID: Phase0EntityID | null;
  releaseStatus: "approvedRelease" | "draft" | "reviewCandidate" | "verificationCandidate" | "supersededRelease" | "rejectedRelease" | "unknown";
  gateCheckedAt: ISODateString;
}

export interface Phase0ManualStudyReferenceImageCheck {
  angleID: CapturedAngleID;
  present: boolean;
  qualityAccepted: boolean;
  notes: string;
}

export type Phase0ManualStudyReferenceImageChecklist = Record<CapturedAngleID, Phase0ManualStudyReferenceImageCheck>;

export interface Phase0ManualStudyConsentCheckpoint extends Phase0ManualStudyConsentRecord {
  allowsPublicSharing: boolean;
  publicSharingDefault: false;
}

export interface Phase0ManualStudyIndependentReview {
  reviewerID: string;
  rankedHeadChoices: Phase0RankedHeadChoice[];
  hairChoice: Phase0ManualAppearanceChoice | null;
  facialHairChoice: Phase0ManualAppearanceChoice | null;
  completedAt: ISODateString | null;
  notes: string;
}

export interface Phase0ManualStudyParticipant {
  participantID: Phase0EntityID;
  participantSequence: number;
  status: Phase0ManualStudyParticipantStatus;
  consentCheckpoint: Phase0ManualStudyConsentCheckpoint | null;
  captureMode: CaptureMode;
  captureDeviceLabel: string;
  referenceImageChecklist: Phase0ManualStudyReferenceImageChecklist;
  assignedReviewerIDs: string[];
  independentReviews: Phase0ManualStudyIndependentReview[];
  participantPreference: Phase0SubjectPreferredResult | null;
  rankSelected: Phase0StudyRank | null;
  mainMismatchReasons: Phase0ManualMismatchReason[];
  rawMediaDeletionState: Phase0RawMediaDeletionState;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  notes: string;
}

export interface Phase0ManualMatchingStudyOperation {
  operationVersion: typeof PHASE0_MANUAL_MATCHING_OPERATION_VERSION;
  sourceType: DataSourceType;
  studyID: Phase0EntityID;
  studyVersion: Phase0VersionID;
  catalogVersion: Phase0ManualStudyCatalogVersion;
  catalogGate: Phase0ManualStudyCatalogGate;
  participantTargetRange: {
    minimum: typeof MANUAL_STUDY_MIN_PARTICIPANTS;
    maximum: typeof MANUAL_STUDY_MAX_PARTICIPANTS;
  };
  publicSharingDefault: false;
  participants: Phase0ManualStudyParticipant[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  notes: string;
}

export interface Phase0ManualStudyOperationalIssue {
  code: string;
  message: string;
  severity: Phase0ManualStudyOperationalIssueSeverity;
  participantID?: Phase0EntityID;
}

export interface Phase0ManualMatchingStudyExportReport {
  reportVersion: typeof PHASE0_MANUAL_MATCHING_OPERATION_VERSION;
  studyID: Phase0EntityID;
  studyVersion: Phase0VersionID;
  sourceType: DataSourceType;
  publicSharingEnabled: false;
  participantCount: number;
  completedParticipantCount: number;
  participantTargetRange: Phase0ManualMatchingStudyOperation["participantTargetRange"];
  catalogVersion: Phase0ManualStudyCatalogVersion;
  catalogGate: Phase0ManualStudyCatalogGate;
  resultRecords: Phase0ManualMatchingStudyResult[];
  evaluation: Phase0ManualMatchingEvaluationReport;
  issues: Phase0ManualStudyOperationalIssue[];
  generatedAt: ISODateString;
}

const requiredAngles: CapturedAngleID[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];

export function createManualMatchingStudyOperation(input: {
  sourceType: DataSourceType;
  studyID: Phase0EntityID;
  studyVersion: Phase0VersionID;
  catalogVersion: Phase0ManualStudyCatalogVersion;
  catalogGate: Phase0ManualStudyCatalogGate;
  createdAt: ISODateString;
  notes?: string;
}): Phase0ManualMatchingStudyOperation {
  return {
    operationVersion: PHASE0_MANUAL_MATCHING_OPERATION_VERSION,
    sourceType: input.sourceType,
    studyID: input.studyID,
    studyVersion: input.studyVersion,
    catalogVersion: input.catalogVersion,
    catalogGate: input.catalogGate,
    participantTargetRange: {
      minimum: MANUAL_STUDY_MIN_PARTICIPANTS,
      maximum: MANUAL_STUDY_MAX_PARTICIPANTS
    },
    publicSharingDefault: false,
    participants: [],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    notes: input.notes ?? ""
  };
}

export function createPseudonymousParticipantID(studyID: Phase0EntityID, sequence: number, sourceType: DataSourceType) {
  const prefix = sourceType === "testFixture" ? "synthetic" : "participant";
  const safeStudyID = studyID.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${prefix}-${safeStudyID}-${String(sequence).padStart(3, "0")}`;
}

export function createReferenceImageChecklist(overrides: Partial<Record<CapturedAngleID, Partial<Phase0ManualStudyReferenceImageCheck>>> = {}): Phase0ManualStudyReferenceImageChecklist {
  return Object.fromEntries(
    requiredAngles.map((angleID) => [
      angleID,
      {
        angleID,
        present: overrides[angleID]?.present ?? false,
        qualityAccepted: overrides[angleID]?.qualityAccepted ?? false,
        notes: overrides[angleID]?.notes ?? ""
      }
    ])
  ) as Phase0ManualStudyReferenceImageChecklist;
}

export function addManualStudyParticipant(
  operation: Phase0ManualMatchingStudyOperation,
  input: {
    captureMode: CaptureMode;
    captureDeviceLabel: string;
    createdAt: ISODateString;
    participantID?: Phase0EntityID;
    referenceImageChecklist?: Phase0ManualStudyReferenceImageChecklist;
    notes?: string;
  }
): Phase0ManualMatchingStudyOperation {
  const nextSequence = operation.participants.length + 1;
  const participant: Phase0ManualStudyParticipant = {
    participantID: input.participantID ?? createPseudonymousParticipantID(operation.studyID, nextSequence, operation.sourceType),
    participantSequence: nextSequence,
    status: "draft",
    consentCheckpoint: null,
    captureMode: input.captureMode,
    captureDeviceLabel: input.captureDeviceLabel.trim() || "unknown-capture-device",
    referenceImageChecklist: input.referenceImageChecklist ?? createReferenceImageChecklist(),
    assignedReviewerIDs: [],
    independentReviews: [],
    participantPreference: null,
    rankSelected: null,
    mainMismatchReasons: [],
    rawMediaDeletionState: {
      status: "pendingDeletion",
      requestedAt: input.createdAt,
      completedAt: null,
      verifiedBy: null,
      retentionConsentRecordID: null
    },
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    notes: input.notes ?? ""
  };
  return updateParticipantList(operation, [...operation.participants, participant], input.createdAt);
}

export function recordConsentCheckpoint(
  participant: Phase0ManualStudyParticipant,
  input: Omit<Phase0ManualStudyConsentCheckpoint, "publicSharingDefault">
): Phase0ManualStudyParticipant {
  return {
    ...participant,
    consentCheckpoint: {
      ...input,
      publicSharingDefault: false
    },
    updatedAt: input.acknowledgedAt
  };
}

export function assignManualStudyReviewers(participant: Phase0ManualStudyParticipant, reviewerIDs: string[], updatedAt: ISODateString): Phase0ManualStudyParticipant {
  return {
    ...participant,
    assignedReviewerIDs: uniqueUsableText(reviewerIDs),
    status: participant.consentCheckpoint && referenceImagesReady(participant.referenceImageChecklist) ? "readyForReview" : participant.status,
    updatedAt
  };
}

export function recordIndependentTopThreeReview(
  participant: Phase0ManualStudyParticipant,
  review: Phase0ManualStudyIndependentReview
): Phase0ManualStudyParticipant {
  const reviews = participant.independentReviews.filter((existing) => existing.reviewerID !== review.reviewerID);
  reviews.push(review);
  return {
    ...participant,
    independentReviews: reviews.sort((a, b) => a.reviewerID.localeCompare(b.reviewerID)),
    status: reviews.length >= 2 ? "readyForParticipantPreference" : "inReview",
    updatedAt: review.completedAt ?? participant.updatedAt
  };
}

export function recordParticipantPreference(
  participant: Phase0ManualStudyParticipant,
  input: {
    participantPreference: Phase0SubjectPreferredResult;
    rankSelected: Phase0StudyRank | null;
    mainMismatchReasons: Phase0ManualMismatchReason[];
    updatedAt: ISODateString;
  }
): Phase0ManualStudyParticipant {
  return {
    ...participant,
    participantPreference: input.participantPreference,
    rankSelected: input.rankSelected,
    mainMismatchReasons: [...input.mainMismatchReasons],
    status: "complete",
    updatedAt: input.updatedAt
  };
}

export function confirmRawMediaDeletion(
  participant: Phase0ManualStudyParticipant,
  input: { completedAt: ISODateString; verifiedBy: string }
): Phase0ManualStudyParticipant {
  return {
    ...participant,
    rawMediaDeletionState: {
      status: "deleted",
      requestedAt: participant.rawMediaDeletionState.requestedAt,
      completedAt: input.completedAt,
      verifiedBy: input.verifiedBy,
      retentionConsentRecordID: null
    },
    updatedAt: input.completedAt
  };
}

export function validateManualMatchingStudyOperation(operation: Phase0ManualMatchingStudyOperation): Phase0ManualStudyOperationalIssue[] {
  const issues: Phase0ManualStudyOperationalIssue[] = [];
  if (!operation.catalogGate.approvedCatalogReleaseAvailable || operation.catalogGate.releaseStatus !== "approvedRelease" || !operation.catalogVersion.verifiedAt) {
    issues.push({
      code: "catalogNotApprovedForStudy",
      message: "The manual matching study cannot run as a real feasibility study until an approved verified catalog release exists.",
      severity: "blocking"
    });
  }
  if (operation.participants.length < MANUAL_STUDY_MIN_PARTICIPANTS || operation.participants.length > MANUAL_STUDY_MAX_PARTICIPANTS) {
    issues.push({
      code: "participantCountOutsideTarget",
      message: `The study needs ${MANUAL_STUDY_MIN_PARTICIPANTS}-${MANUAL_STUDY_MAX_PARTICIPANTS} participants before feasibility metrics are decision-grade.`,
      severity: "warning"
    });
  }
  for (const participant of operation.participants) {
    issues.push(...validateParticipant(participant));
  }
  return issues;
}

export function buildManualMatchingStudyResult(
  operation: Phase0ManualMatchingStudyOperation,
  participant: Phase0ManualStudyParticipant
): Phase0ManualMatchingStudyResult {
  const firstReview = participant.independentReviews[0];
  const reviewerAgreement = buildReviewerAgreement(participant.independentReviews);
  return {
    schemaVersion: PHASE0_MANUAL_MATCHING_STUDY_SCHEMA_VERSION,
    sourceType: operation.sourceType,
    studyVersion: operation.studyVersion,
    studyID: operation.studyID,
    resultID: `${participant.participantID}-result`,
    consentRecord: participant.consentCheckpoint ?? emptyConsent(participant),
    subjectPseudonymousID: participant.participantID,
    captureMode: participant.captureMode,
    referenceViewCompleteness: referenceImageCompleteness(participant.referenceImageChecklist),
    humanReviewerIDs: participant.assignedReviewerIDs,
    rankedHeadChoices: firstReview?.rankedHeadChoices ?? [],
    hairChoice: firstReview?.hairChoice ?? null,
    facialHairChoice: firstReview?.facialHairChoice ?? null,
    subjectPreferredResult: participant.participantPreference,
    rankSelected: participant.rankSelected,
    mainMismatchReasons: participant.mainMismatchReasons,
    reviewerAgreement,
    rawMediaDeletionState: participant.rawMediaDeletionState,
    catalogVersion: operation.catalogVersion,
    status: participant.status === "withdrawn" ? "withdrawn" : participant.status === "complete" ? "complete" : "inReview",
    resultTimestamps: {
      capturedAt: participant.createdAt,
      reviewedAt: participant.independentReviews.map((review) => review.completedAt).filter(isISODateString).sort().at(-1) ?? null,
      subjectSelectedAt: participant.rankSelected !== null ? participant.updatedAt : null,
      finalizedAt: participant.status === "complete" && participant.rawMediaDeletionState.status === "deleted" ? participant.rawMediaDeletionState.completedAt : null
    },
    notes: participant.notes || "Manual matching study participant result.",
    isTestFixture: operation.sourceType === "testFixture"
  };
}

export function exportManualMatchingStudyReport(operation: Phase0ManualMatchingStudyOperation, generatedAt: ISODateString): Phase0ManualMatchingStudyExportReport {
  const resultRecords = operation.participants.map((participant) => buildManualMatchingStudyResult(operation, participant));
  const validationIssues = resultRecords.flatMap((result) =>
    validatePhase0ManualMatchingStudyResult(result, { fixtureOnly: operation.sourceType === "testFixture" }).errors.map((error) => ({
      code: error.code,
      message: error.message,
      severity: "blocking" as const,
      participantID: result.subjectPseudonymousID
    }))
  );
  const issues = [...validateManualMatchingStudyOperation(operation), ...validationIssues];
  return {
    reportVersion: PHASE0_MANUAL_MATCHING_OPERATION_VERSION,
    studyID: operation.studyID,
    studyVersion: operation.studyVersion,
    sourceType: operation.sourceType,
    publicSharingEnabled: false,
    participantCount: operation.participants.length,
    completedParticipantCount: operation.participants.filter((participant) => participant.status === "complete").length,
    participantTargetRange: operation.participantTargetRange,
    catalogVersion: operation.catalogVersion,
    catalogGate: operation.catalogGate,
    resultRecords,
    evaluation: evaluatePhase0ManualMatchingStudy(
      resultRecords.map((result, index) => ({
        result,
        captureDeviceLabel: operation.participants[index]?.captureDeviceLabel ?? null,
        predictedConfidence: null
      })),
      { fixtureOnly: operation.sourceType === "testFixture" }
    ),
    issues,
    generatedAt
  };
}

function validateParticipant(participant: Phase0ManualStudyParticipant): Phase0ManualStudyOperationalIssue[] {
  const issues: Phase0ManualStudyOperationalIssue[] = [];
  if (!participant.consentCheckpoint) {
    issues.push({ code: "missingConsentCheckpoint", message: "Participant is missing the manual-study consent checkpoint.", severity: "blocking", participantID: participant.participantID });
  } else {
    const consent = participant.consentCheckpoint;
    if (!consent.allowsManualReviewerEvaluation || !consent.allowsTemporaryRawMediaProcessing || !consent.allowsDerivedProfileUse) {
      issues.push({ code: "requiredConsentMissing", message: "Participant has not granted all required manual-study consent layers.", severity: "blocking", participantID: participant.participantID });
    }
    if (consent.allowsPublicSharing) {
      issues.push({ code: "publicSharingRequiresSeparateReview", message: "Public sharing is not enabled by default and requires separate future review.", severity: "warning", participantID: participant.participantID });
    }
  }
  if (!referenceImagesReady(participant.referenceImageChecklist)) {
    issues.push({ code: "referenceImagesIncomplete", message: "Participant is missing accepted reference images for all required angles.", severity: "blocking", participantID: participant.participantID });
  }
  if (participant.assignedReviewerIDs.length < 2) {
    issues.push({ code: "insufficientReviewerAssignment", message: "Participant requires at least two assigned reviewers.", severity: "blocking", participantID: participant.participantID });
  }
  const completedAssignedReviews = participant.independentReviews.filter((review) => participant.assignedReviewerIDs.includes(review.reviewerID) && review.completedAt);
  if (completedAssignedReviews.length < 2) {
    issues.push({ code: "missingIndependentReviews", message: "Participant requires two completed independent top-three reviews.", severity: "blocking", participantID: participant.participantID });
  }
  if (!participant.participantPreference || participant.rankSelected === null) {
    issues.push({ code: "missingParticipantPreference", message: "Participant preference and selected rank are required before final evaluation.", severity: "blocking", participantID: participant.participantID });
  }
  if (participant.rawMediaDeletionState.status !== "deleted" || !participant.rawMediaDeletionState.completedAt || !participant.rawMediaDeletionState.verifiedBy) {
    issues.push({ code: "rawMediaDeletionNotConfirmed", message: "Raw-media deletion must be confirmed before the participant result is complete.", severity: "blocking", participantID: participant.participantID });
  }
  return issues;
}

function buildReviewerAgreement(reviews: Phase0ManualStudyIndependentReview[]): Phase0ReviewerAgreement {
  const completed = reviews.filter((review) => review.completedAt);
  const [first, second] = completed;
  const firstTop = first?.rankedHeadChoices.find((choice) => choice.rank === 1)?.catalogStableInternalID ?? null;
  const secondTop = second?.rankedHeadChoices.find((choice) => choice.rank === 1)?.catalogStableInternalID ?? null;
  return {
    reviewerIDs: completed.map((review) => review.reviewerID),
    agreedTopChoice: firstTop && secondTop ? firstTop === secondTop : null,
    agreedTopThreeSet:
      first && second
        ? stableIDSet(first.rankedHeadChoices).join("|") === stableIDSet(second.rankedHeadChoices).join("|")
        : null,
    agreementNotes: completed.length >= 2 ? "Agreement calculated from independent reviewer top-three submissions." : "Agreement unavailable until two independent reviews are complete."
  };
}

function stableIDSet(choices: Phase0RankedHeadChoice[]) {
  return choices.map((choice) => choice.catalogStableInternalID).sort();
}

function referenceImageCompleteness(checklist: Phase0ManualStudyReferenceImageChecklist): Phase0ReferenceViewCompleteness {
  return Object.fromEntries(requiredAngles.map((angle) => [angle, Boolean(checklist[angle]?.present && checklist[angle]?.qualityAccepted)])) as Phase0ReferenceViewCompleteness;
}

function referenceImagesReady(checklist: Phase0ManualStudyReferenceImageChecklist) {
  return requiredAngles.every((angle) => checklist[angle]?.present && checklist[angle]?.qualityAccepted);
}

function emptyConsent(participant: Phase0ManualStudyParticipant): Phase0ManualStudyConsentRecord {
  return {
    consentRecordID: `${participant.participantID}-missing-consent`,
    consentVersion: "missing-consent",
    acknowledgedAt: participant.createdAt,
    allowsManualReviewerEvaluation: false,
    allowsTemporaryRawMediaProcessing: false,
    allowsDerivedProfileUse: false,
    withdrawalRequestedAt: null
  };
}

function updateParticipantList(operation: Phase0ManualMatchingStudyOperation, participants: Phase0ManualStudyParticipant[], updatedAt: ISODateString): Phase0ManualMatchingStudyOperation {
  return {
    ...operation,
    participants,
    updatedAt
  };
}

function uniqueUsableText(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isISODateString(value: string | null): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
