import { isDataSourceType, isProductionSource } from "@/lib/data/source-types";

export type CatalogRecordClassification =
  | "PRODUCTION_VERIFIED"
  | "RESEARCH_OBSERVED"
  | "PUBLIC_SOURCE_ONLY"
  | "TEST_FIXTURE"
  | "PLACEHOLDER"
  | "DEPRECATED"
  | "INVALID"
  | "UNKNOWN_ORIGIN";

export interface CatalogRecordClassificationResult {
  classification: CatalogRecordClassification;
  productionAccessAllowed: boolean;
  hasSourceEvidence: boolean;
  hasCatalogManagerDisposition: boolean;
  reasons: string[];
  blockingIssues: string[];
}

const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK|UNKNOWN_ORIGIN)\b/i;
const fixturePathPattern = /data\/fixtures\/test-only|\/fixtures\/test-only\/|^fixtures\/test-only\/|\/test-only\//i;
const researchSourceTypes = new Set(["research", "researchDraft", "researchCandidate", "shippingGameVideoResearch", "betaResearch"]);
const fixtureSourceTypes = new Set(["testFixture", "demoData", "localDeveloperSample"]);
const publicSourceTypes = new Set(["publicSourceOnly"]);
const approvedCatalogManagerDispositions = new Set(["approved", "approvedWithNotes"]);

export function classifyCatalogRecord(record: unknown): CatalogRecordClassificationResult {
  const value = asRecord(record);
  const reasons: string[] = [];
  const blockingIssues: string[] = [];
  const sourceType = stringValue(value.sourceType);
  const verificationState = stringValue(value.verificationState ?? value.verificationStatus ?? value.status);
  const deprecated = value.deprecated === true || stringValue(value.deprecationState).toLowerCase() === "deprecated";
  const hasSourceEvidence = hasRecordSourceEvidence(value);
  const hasCatalogManagerDisposition = approvedCatalogManagerDispositions.has(stringValue(value.catalogManagerDisposition));

  let classification: CatalogRecordClassification = "UNKNOWN_ORIGIN";

  if (containsPlaceholder(value)) {
    classification = "PLACEHOLDER";
    blockingIssues.push("placeholderToken");
  } else if (deprecated) {
    classification = "DEPRECATED";
    reasons.push("recordDeprecated");
  } else if (isFixtureRecord(value)) {
    classification = "TEST_FIXTURE";
    blockingIssues.push("fixtureRecord");
  } else if (publicSourceTypes.has(sourceType)) {
    classification = "PUBLIC_SOURCE_ONLY";
    blockingIssues.push("publicSourceOnlyRecord");
  } else if (isResearchObservedRecord(value, sourceType, verificationState)) {
    classification = "RESEARCH_OBSERVED";
    if (!hasSourceEvidence) blockingIssues.push("researchRecordMissingSourceEvidence");
  } else if (isProductionVerifiedRecord(value, sourceType, verificationState)) {
    classification = "PRODUCTION_VERIFIED";
    if (!hasCatalogManagerDisposition) blockingIssues.push("missingCatalogManagerDisposition");
  } else if (isInvalidProductionLikeRecord(value, sourceType, verificationState)) {
    classification = "INVALID";
    blockingIssues.push("invalidProductionRecord");
  }

  if (!isDataSourceType(sourceType)) {
    if (classification === "UNKNOWN_ORIGIN") blockingIssues.push("invalidSourceType");
    reasons.push(`sourceType:${sourceType || "missing"}`);
  } else {
    reasons.push(`sourceType:${sourceType}`);
  }
  if (verificationState) reasons.push(`verification:${verificationState}`);
  if (classification === "PRODUCTION_VERIFIED" && blockingIssues.length === 0) reasons.push("productionVerifiedWithManagerDisposition");

  return {
    classification,
    productionAccessAllowed: classification === "PRODUCTION_VERIFIED" && blockingIssues.length === 0,
    hasSourceEvidence,
    hasCatalogManagerDisposition,
    reasons,
    blockingIssues
  };
}

export function hasRecordSourceEvidence(value: Record<string, unknown>): boolean {
  const candidateCollections = [
    value.sourceImageReferences,
    value.evidenceReferences,
    value.evidenceFileIDs,
    value.sourceObservations,
    value.selectedMenuEvidence,
    value.extractedFrames,
    value.timelineEvidence,
    value.evidence,
    value.evidenceIDs,
    value.sourceEvidence,
    value.sourceImageFrameIDs,
    value.sourceMenuEvidence,
    value.reproducibleSteps,
    value.actions
  ];
  if (candidateCollections.some((entry) => Array.isArray(entry) && entry.some(hasUsefulEvidenceValue))) return true;

  const candidateValues = [
    value.sourceVideoID,
    value.selectedEvidence,
    value.sourceVideo,
    value.sourceFilename,
    value.video_id,
    value.videoID,
    value.timelineRecordID,
    value.timeline_record_id,
    value.evidenceFramePath,
    value.extracted_frame_path,
    value.relativePath,
    value.relative_path,
    value.path
  ];
  return candidateValues.some(hasUsefulEvidenceValue);
}

export function hasApprovedCatalogManagerDisposition(record: unknown): boolean {
  return approvedCatalogManagerDispositions.has(stringValue(asRecord(record).catalogManagerDisposition));
}

function isProductionVerifiedRecord(value: Record<string, unknown>, sourceType: string, verificationState: string): boolean {
  return (
    isProductionSource(sourceType) &&
    verificationState === "verified" &&
    value.isTestFixture !== true &&
    !containsPlaceholder(value) &&
    !deprecatedOrArchived(value)
  );
}

function isInvalidProductionLikeRecord(value: Record<string, unknown>, sourceType: string, verificationState: string): boolean {
  return isProductionSource(sourceType) || verificationState === "verified" || Boolean(value.catalogManagerDisposition);
}

function isResearchObservedRecord(value: Record<string, unknown>, sourceType: string, verificationState: string): boolean {
  const statusTokens = [
    verificationState,
    stringValue(value.productionStatus),
    stringValue(value.dataClass),
    stringValue(value.researchStatus),
    stringValue(value.verificationDisposition)
  ].join(" ");
  return (
    researchSourceTypes.has(sourceType) ||
    /OBSERVED_PENDING_VERIFICATION|PRIMARY_RESEARCH|RESEARCH|NOT_PRODUCTION_DATA|RECAPTURE_REQUIRED/i.test(statusTokens)
  );
}

function isFixtureRecord(value: Record<string, unknown>): boolean {
  const sourceType = stringValue(value.sourceType);
  const serialized = JSON.stringify(value);
  return value.isTestFixture === true || fixtureSourceTypes.has(sourceType) || fixturePathPattern.test(serialized);
}

function deprecatedOrArchived(value: Record<string, unknown>): boolean {
  return value.deprecated === true || stringValue(value.verificationState) === "archived" || stringValue(value.deprecationState).toLowerCase() === "deprecated";
}

function containsPlaceholder(value: unknown): boolean {
  return placeholderPattern.test(JSON.stringify(value ?? ""));
}

function hasUsefulEvidenceValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(hasUsefulEvidenceValue);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
