import type { ISODateString } from "@/types/domain";

export const CATALOG_MANAGER_REVIEW_SCHEMA_VERSION = "catalog-manager-review-v1";

export type CatalogManagerGateStatus = "pass" | "warning" | "fail";
export type CatalogManagerReviewDecision = "acceptVerifiedWithNotes" | "rejectVerifiedWithNotes" | "requestRepair" | "rejectRecord";
export type CatalogManagerReportDecision = "approvedReleaseCandidate" | "repairsRequested" | "rejected";

export interface CatalogManagerValidationIssue {
  code: string;
  message: string;
  recordID?: string;
  severity: "mandatory" | "advisory";
}

export interface CatalogManagerValidationCheck {
  name: string;
  status: CatalogManagerGateStatus;
  errors?: CatalogManagerValidationIssue[];
  warnings?: CatalogManagerValidationIssue[];
}

export interface CatalogManagerValidationReport {
  ok: boolean;
  checks: CatalogManagerValidationCheck[];
  errors?: CatalogManagerValidationIssue[];
  warnings?: CatalogManagerValidationIssue[];
}

export interface CatalogManagerPackageRecord {
  stableInternalID?: string;
  category?: string;
  nativeOrder?: number;
  visibleGameLabelOrIndex?: string;
  verificationState?: string;
  sourceImageReferences?: string[];
  requiredAngles?: Record<string, string>;
  navigationInstructions?: Array<{ evidenceAssetID?: string; instruction?: string }>;
  duplicateObservations?: Array<Record<string, unknown>>;
  isTestFixture?: boolean;
  [key: string]: unknown;
}

export interface CatalogManagerPackageEvidence {
  assetID?: string;
  angle?: string;
  relativePath?: string;
  sha256?: string;
  [key: string]: unknown;
}

export interface CatalogManagerCandidatePackage {
  packageID?: string;
  packageVersion?: string;
  manifest?: {
    catalogVersion?: {
      identifier?: string;
      gameVersion?: string;
      platform?: string;
      verifiedAt?: string | null;
    };
    items?: CatalogManagerPackageRecord[];
    [key: string]: unknown;
  };
  items?: CatalogManagerPackageRecord[];
  assets?: CatalogManagerPackageEvidence[];
  reviews?: Array<Record<string, unknown>>;
  publication?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CatalogManagerRecordSummary {
  stableInternalID: string;
  category: string;
  nativeOrder: number | null;
  visibleGameLabelOrIndex: string;
  verificationState: string;
  evidenceCount: number;
  missingRequiredAngles: string[];
  missingNavigationEvidence: boolean;
  hasPlaceholder: boolean;
  hasDuplicateObservations: boolean;
  requiresVerifiedWithNotesDecision: boolean;
}

export interface CatalogManagerEvidenceSummary {
  assetID: string;
  angle: string;
  relativePath: string;
  sha256: string;
  referencedByRecordIDs: string[];
}

export interface CatalogManagerNativeOrderGroup {
  key: string;
  status: CatalogManagerGateStatus;
  orderedRecordIDs: string[];
  missingOrders: number[];
  duplicateOrders: number[];
}

export interface CatalogManagerReviewAction {
  recordID: string;
  decision: CatalogManagerReviewDecision;
  reviewerID: string;
  note: string;
  createdAt: ISODateString;
}

export interface CatalogManagerReviewSession {
  schemaVersion: typeof CATALOG_MANAGER_REVIEW_SCHEMA_VERSION;
  packageID: string;
  packageVersion: string;
  importedAt: ISODateString;
  validation: CatalogManagerValidationReport;
  records: CatalogManagerRecordSummary[];
  evidence: CatalogManagerEvidenceSummary[];
  nativeOrderGroups: CatalogManagerNativeOrderGroup[];
  duplicateRecordIDs: string[];
  verifiedWithNotesRecordIDs: string[];
  unresolvedFailures: CatalogManagerValidationIssue[];
  repairRequests: CatalogManagerReviewAction[];
  rejectedRecordIDs: string[];
  mandatoryGatesPass: boolean;
  releaseCandidateApprovalStatus: "blocked" | "ready";
}

export interface CatalogManagerSignedReviewReport {
  schemaVersion: typeof CATALOG_MANAGER_REVIEW_SCHEMA_VERSION;
  reportID: string;
  packageID: string;
  packageVersion: string;
  reviewerID: string;
  decision: CatalogManagerReportDecision;
  approvedForReleaseCandidate: boolean;
  mandatoryGatesPass: boolean;
  unresolvedFailureCount: number;
  repairRequestCount: number;
  rejectedRecordIDs: string[];
  acceptedVerifiedWithNotesRecordIDs: string[];
  generatedAt: ISODateString;
  notes: string;
  signature: {
    algorithm: "SHA-256";
    scope: "local-catalog-manager-review-report";
    digest: string;
  };
}

const requiredAngles = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;
const verifiedWithNotesStates = new Set(["VERIFIED_WITH_NOTES", "verifiedWithNotes", "verified_with_notes"]);

export function parseCatalogManagerCandidatePackage(jsonText: string): CatalogManagerCandidatePackage {
  const parsed = JSON.parse(jsonText) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Candidate package JSON must be an object.");
  return parsed as CatalogManagerCandidatePackage;
}

export function createCatalogManagerReviewSession(input: {
  candidatePackage: CatalogManagerCandidatePackage;
  validationReport?: CatalogManagerValidationReport;
  reviewActions?: CatalogManagerReviewAction[];
  importedAt: ISODateString;
}): CatalogManagerReviewSession {
  const candidatePackage = input.candidatePackage;
  const records = summarizeRecords(candidatePackage);
  const evidence = summarizeEvidence(candidatePackage, records);
  const internalValidation = validateCandidateForManagerReview(candidatePackage, records, evidence);
  const validation = mergeValidationReports(input.validationReport, internalValidation);
  const nativeOrderGroups = summarizeNativeOrderGroups(records);
  const reviewActions = input.reviewActions ?? [];
  const repairRequests = reviewActions.filter((action) => action.decision === "requestRepair");
  const rejectedRecordIDs = reviewActions
    .filter((action) => action.decision === "rejectRecord" || action.decision === "rejectVerifiedWithNotes")
    .map((action) => action.recordID);
  const acceptedVerifiedWithNotes = new Set(
    reviewActions.filter((action) => action.decision === "acceptVerifiedWithNotes").map((action) => action.recordID)
  );
  const unresolvedFailures = [
    ...flattenValidationErrors(validation),
    ...records
      .filter((record) => record.requiresVerifiedWithNotesDecision && !acceptedVerifiedWithNotes.has(record.stableInternalID))
      .map((record): CatalogManagerValidationIssue => ({
        code: "verifiedWithNotesDecisionRequired",
        message: `${record.stableInternalID} is VERIFIED_WITH_NOTES and requires catalog-manager acceptance or rejection.`,
        recordID: record.stableInternalID,
        severity: "mandatory"
      })),
    ...repairRequests.map((action): CatalogManagerValidationIssue => ({
      code: "repairRequested",
      message: `${action.recordID} has an unresolved repair request.`,
      recordID: action.recordID,
      severity: "mandatory"
    })),
    ...rejectedRecordIDs.map((recordID): CatalogManagerValidationIssue => ({
      code: "recordRejected",
      message: `${recordID} was rejected by the catalog manager.`,
      recordID,
      severity: "mandatory"
    }))
  ].filter((issue) => {
    if (issue.code !== "invalidVerificationState") return true;
    const recordID = issue.recordID ?? findRecordIDInMessage(issue.message, records);
    return !recordID || !acceptedVerifiedWithNotes.has(recordID);
  });
  const mandatoryGatesPass =
    unresolvedFailures.filter((issue) => issue.severity === "mandatory").length === 0
    && nativeOrderGroups.every((group) => group.status !== "fail")
    && records.every((record) => !record.hasPlaceholder && record.missingRequiredAngles.length === 0 && !record.missingNavigationEvidence);

  return {
    schemaVersion: CATALOG_MANAGER_REVIEW_SCHEMA_VERSION,
    packageID: stringOr(candidatePackage.packageID, "unknown-package"),
    packageVersion: stringOr(candidatePackage.packageVersion, "unknown-version"),
    importedAt: input.importedAt,
    validation,
    records,
    evidence,
    nativeOrderGroups,
    duplicateRecordIDs: records.filter((record) => record.hasDuplicateObservations).map((record) => record.stableInternalID),
    verifiedWithNotesRecordIDs: records.filter((record) => record.requiresVerifiedWithNotesDecision).map((record) => record.stableInternalID),
    unresolvedFailures,
    repairRequests,
    rejectedRecordIDs,
    mandatoryGatesPass,
    releaseCandidateApprovalStatus: mandatoryGatesPass ? "ready" : "blocked"
  };
}

export function createCatalogManagerReviewAction(input: {
  recordID: string;
  decision: CatalogManagerReviewDecision;
  reviewerID: string;
  note: string;
  createdAt: ISODateString;
}): CatalogManagerReviewAction {
  return {
    recordID: input.recordID.trim(),
    decision: input.decision,
    reviewerID: input.reviewerID.trim(),
    note: input.note.trim(),
    createdAt: input.createdAt
  };
}

export function canApproveReleaseCandidate(session: CatalogManagerReviewSession): boolean {
  return session.mandatoryGatesPass && session.releaseCandidateApprovalStatus === "ready";
}

export async function createSignedCatalogManagerReviewReport(input: {
  session: CatalogManagerReviewSession;
  reviewerID: string;
  decision: CatalogManagerReportDecision;
  notes: string;
  generatedAt: ISODateString;
}): Promise<CatalogManagerSignedReviewReport> {
  const approvedForReleaseCandidate = input.decision === "approvedReleaseCandidate" && canApproveReleaseCandidate(input.session);
  const unsigned = {
    schemaVersion: CATALOG_MANAGER_REVIEW_SCHEMA_VERSION,
    reportID: `catalog-manager-review-${input.generatedAt}`,
    packageID: input.session.packageID,
    packageVersion: input.session.packageVersion,
    reviewerID: input.reviewerID.trim(),
    decision: approvedForReleaseCandidate ? input.decision : input.decision === "approvedReleaseCandidate" ? "repairsRequested" : input.decision,
    approvedForReleaseCandidate,
    mandatoryGatesPass: input.session.mandatoryGatesPass,
    unresolvedFailureCount: input.session.unresolvedFailures.length,
    repairRequestCount: input.session.repairRequests.length,
    rejectedRecordIDs: input.session.rejectedRecordIDs,
    acceptedVerifiedWithNotesRecordIDs: input.session.verifiedWithNotesRecordIDs.filter((recordID) =>
      input.session.unresolvedFailures.every((issue) => issue.recordID !== recordID)
    ),
    generatedAt: input.generatedAt,
    notes: input.notes.trim()
  } satisfies Omit<CatalogManagerSignedReviewReport, "signature">;
  return {
    ...unsigned,
    signature: {
      algorithm: "SHA-256",
      scope: "local-catalog-manager-review-report",
      digest: await sha256Hex(stableStringify(unsigned))
    }
  };
}

function summarizeRecords(candidatePackage: CatalogManagerCandidatePackage): CatalogManagerRecordSummary[] {
  const items = candidatePackage.items ?? candidatePackage.manifest?.items ?? [];
  return items.map((item, index) => {
    const stableInternalID = stringOr(item.stableInternalID, `record-${index + 1}`);
    const sourceRefs = item.sourceImageReferences ?? [];
    const missingRequiredAngles = requiredAngles.filter((angle) => !stringOr(item.requiredAngles?.[angle], ""));
    const navigationInstructions = item.navigationInstructions ?? [];
    return {
      stableInternalID,
      category: stringOr(item.category, "uncategorized"),
      nativeOrder: Number.isInteger(item.nativeOrder) ? Number(item.nativeOrder) : null,
      visibleGameLabelOrIndex: stringOr(item.visibleGameLabelOrIndex, ""),
      verificationState: stringOr(item.verificationState, "unknown"),
      evidenceCount: sourceRefs.length,
      missingRequiredAngles,
      missingNavigationEvidence: navigationInstructions.length === 0 || navigationInstructions.some((instruction) => !stringOr(instruction.evidenceAssetID, "")),
      hasPlaceholder: placeholderPattern.test(JSON.stringify(item)),
      hasDuplicateObservations: (item.duplicateObservations ?? []).length > 0,
      requiresVerifiedWithNotesDecision: verifiedWithNotesStates.has(stringOr(item.verificationState, ""))
    };
  });
}

function summarizeEvidence(candidatePackage: CatalogManagerCandidatePackage, records: CatalogManagerRecordSummary[]): CatalogManagerEvidenceSummary[] {
  const items = candidatePackage.items ?? candidatePackage.manifest?.items ?? [];
  return (candidatePackage.assets ?? []).map((asset) => {
    const assetID = stringOr(asset.assetID, "unknown-asset");
    const referencedByRecordIDs = items
      .map((item, index) => ({
        recordID: records[index]?.stableInternalID ?? stringOr(item.stableInternalID, `record-${index + 1}`),
        references: [...(item.sourceImageReferences ?? []), ...Object.values(item.requiredAngles ?? {}), ...(item.navigationInstructions ?? []).map((instruction) => instruction.evidenceAssetID ?? "")]
      }))
      .filter((entry) => entry.references.includes(assetID))
      .map((entry) => entry.recordID);
    return {
      assetID,
      angle: stringOr(asset.angle, "unknown"),
      relativePath: stringOr(asset.relativePath, ""),
      sha256: stringOr(asset.sha256, ""),
      referencedByRecordIDs
    };
  });
}

function validateCandidateForManagerReview(
  candidatePackage: CatalogManagerCandidatePackage,
  records: CatalogManagerRecordSummary[],
  evidence: CatalogManagerEvidenceSummary[]
): CatalogManagerValidationReport {
  const errors: CatalogManagerValidationIssue[] = [];
  const warnings: CatalogManagerValidationIssue[] = [];
  const evidenceIDs = new Set(evidence.map((item) => item.assetID));
  if (!Array.isArray(candidatePackage.items) && !Array.isArray(candidatePackage.manifest?.items)) {
    errors.push(issue("missingItems", "Candidate package has no item list."));
  }
  for (const record of records) {
    if (!record.stableInternalID.trim()) errors.push(issue("missingStableID", "Record is missing a stable internal ID.", record.stableInternalID));
    if (record.hasPlaceholder) errors.push(issue("placeholderToken", `${record.stableInternalID} contains a placeholder token.`, record.stableInternalID));
    if (record.missingRequiredAngles.length > 0) {
      errors.push(issue("missingRequiredEvidence", `${record.stableInternalID} is missing required angles: ${record.missingRequiredAngles.join(", ")}.`, record.stableInternalID));
    }
    if (record.missingNavigationEvidence) errors.push(issue("missingNavigationEvidence", `${record.stableInternalID} is missing menu-instruction evidence.`, record.stableInternalID));
  }
  const items = candidatePackage.items ?? candidatePackage.manifest?.items ?? [];
  for (const item of items) {
    const id = stringOr(item.stableInternalID, "unknown-record");
    for (const assetID of [...(item.sourceImageReferences ?? []), ...Object.values(item.requiredAngles ?? {})]) {
      if (assetID && !evidenceIDs.has(assetID)) errors.push(issue("unresolvedEvidenceReference", `${id} references unknown evidence ${assetID}.`, id));
    }
  }
  for (const group of summarizeNativeOrderGroups(records)) {
    if (group.status === "fail") errors.push(issue("nativeOrderFailure", `${group.key} has missing or duplicate native-order values.`));
  }
  for (const record of records.filter((candidate) => candidate.hasDuplicateObservations)) {
    warnings.push({ code: "duplicateObservationReviewRequired", message: `${record.stableInternalID} includes duplicate observations for manager review.`, recordID: record.stableInternalID, severity: "advisory" });
  }
  return {
    ok: errors.length === 0,
    checks: [
      {
        name: "catalogManagerBrowserReview",
        status: errors.length > 0 ? "fail" : warnings.length > 0 ? "warning" : "pass",
        errors,
        warnings
      }
    ],
    errors,
    warnings
  };
}

function summarizeNativeOrderGroups(records: CatalogManagerRecordSummary[]): CatalogManagerNativeOrderGroup[] {
  const groups = new Map<string, CatalogManagerRecordSummary[]>();
  for (const record of records) {
    const key = record.category;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()].map(([key, groupRecords]) => {
    const orders = groupRecords.map((record) => record.nativeOrder).filter((value): value is number => Number.isInteger(value));
    const duplicateOrders = [...new Set(orders.filter((order, index) => orders.indexOf(order) !== index))];
    const missingOrders = Array.from({ length: groupRecords.length }, (_, index) => index + 1).filter((order) => !orders.includes(order));
    return {
      key,
      status: groupRecords.some((record) => record.nativeOrder === null) || duplicateOrders.length > 0 || missingOrders.length > 0 ? "fail" : "pass",
      orderedRecordIDs: [...groupRecords]
        .sort((first, second) => (first.nativeOrder ?? Number.MAX_SAFE_INTEGER) - (second.nativeOrder ?? Number.MAX_SAFE_INTEGER))
        .map((record) => record.stableInternalID),
      missingOrders,
      duplicateOrders
    };
  });
}

function mergeValidationReports(first: CatalogManagerValidationReport | undefined, second: CatalogManagerValidationReport): CatalogManagerValidationReport {
  if (!first) return second;
  const checks = [...(first.checks ?? []), ...second.checks];
  const errors = [...(first.errors ?? first.checks?.flatMap((check) => check.errors ?? []) ?? []), ...(second.errors ?? [])];
  const warnings = [...(first.warnings ?? first.checks?.flatMap((check) => check.warnings ?? []) ?? []), ...(second.warnings ?? [])];
  return {
    ok: errors.length === 0,
    checks,
    errors,
    warnings
  };
}

function flattenValidationErrors(validation: CatalogManagerValidationReport): CatalogManagerValidationIssue[] {
  return (validation.errors ?? validation.checks.flatMap((check) => check.errors ?? [])).map((entry) => ({
    ...entry,
    severity: entry.severity ?? "mandatory"
  }));
}

function findRecordIDInMessage(message: string, records: CatalogManagerRecordSummary[]) {
  return records.find((record) => message.includes(record.stableInternalID))?.stableInternalID;
}

function issue(code: string, message: string, recordID?: string): CatalogManagerValidationIssue {
  return { code, message, recordID, severity: "mandatory" };
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

async function sha256Hex(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return fallbackHash(text);
}

function fallbackHash(text: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash.toString(16).padStart(64, "0").slice(-64);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}
