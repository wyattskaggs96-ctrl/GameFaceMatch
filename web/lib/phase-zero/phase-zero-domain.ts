import type { CapturedAngleID, ISODateString, StandardFacialMeasurementID } from "@/types/domain";

export const PHASE0_DOMAIN_SCHEMA_VERSION = "phase0-domain-v1";

export type Phase0EntityID = string;
export type Phase0VersionID = string;
export type Phase0VerificationState = "draft" | "firstReviewPending" | "firstReviewApproved" | "secondReviewPending" | "verified" | "rejected" | "retired";
export type Phase0PlatformFamily = "playstation" | "xbox" | "pc" | "unknown";
export type Phase0SupportStatus = "unknown" | "planned" | "inAudit" | "supported" | "unsupported" | "retired";
export type Phase0AuditEnvironmentKind = "consoleCapture" | "browserCapture" | "manualReview" | "unknown";
export type Phase0MenuItemKind = "root" | "category" | "subcategory" | "option" | "navigationStep";
export type Phase0CatalogItemKind = "head" | "hairstyle" | "facialHair" | "additionalAttribute";
export type Phase0EvidenceFileKind = "screenshot" | "video" | "photo" | "export" | "notes" | "checksumManifest";
export type Phase0EvidenceStorageScope = "localAuditOnly" | "testFixture" | "productionReference";
export type Phase0CopyType = "disc" | "digital" | "subscription" | "trial" | "unknown";
export type Phase0LatestUpdateState = "latestInstalled" | "updateAvailable" | "offlineUnknown" | "unknown";
export type Phase0EAAccountState = "signedIn" | "signedOut" | "notRequired" | "unknown";
export type Phase0HDRState = "enabled" | "disabled" | "unsupported" | "unknown";
export type Phase0Handedness = "left" | "right" | "ambidextrous" | "notApplicable" | "unknown";
export type Phase0CaptureEventKind = "standardAngle" | "navigationEvidence" | "recapture" | "manualAnnotation";
export type Phase0IssueSeverity = "info" | "warning" | "blocking";
export type Phase0IssueStatus = "open" | "inReview" | "resolved" | "wontFix";
export type Phase0ReviewStage = "first" | "second" | "publication";
export type Phase0ReviewDecision = "approved" | "rejected" | "needsChanges";
export type Phase0DiscrepancyKind = "labelMismatch" | "missingEvidence" | "navigationMismatch" | "patchMismatch" | "reorderedOption" | "retiredOption" | "measurementConflict" | "other";
export type Phase0DependencyTestKind = "categoryDependency" | "platformDifference" | "patchDifference" | "creationPathDifference" | "appearanceInteraction";
export type Phase0DependencyTestStatus = "planned" | "running" | "passed" | "failed" | "inconclusive";
export type Phase0CatalogReleaseStatus = "draft" | "reviewCandidate" | "verificationCandidate" | "approvedRelease" | "supersededRelease" | "rejectedRelease";
export type Phase0ImportValidationStatus = "passed" | "failed" | "passedWithWarnings";
export type Phase0ManualStudyStatus = "planned" | "running" | "complete" | "blocked";
export type Phase0SubjectResultStatus = "complete" | "incomplete" | "withdrawn";

export interface Phase0BaseEntity {
  id: Phase0EntityID;
  schemaVersion: typeof PHASE0_DOMAIN_SCHEMA_VERSION;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Phase0Game extends Phase0BaseEntity {
  title: string;
  publisher: string;
  releaseYear: number;
  status: Phase0SupportStatus;
  notes?: string;
}

export interface Phase0Platform extends Phase0BaseEntity {
  gameID: Phase0EntityID;
  name: string;
  family: Phase0PlatformFamily;
  generation?: string;
  status: Phase0SupportStatus;
}

export interface Phase0GameVersion extends Phase0BaseEntity {
  gameID: Phase0EntityID;
  versionLabel: string;
  releaseDate: ISODateString | null;
  sourceEvidenceFileIDs: Phase0EntityID[];
  status: Phase0SupportStatus;
}

export interface Phase0Patch extends Phase0BaseEntity {
  gameVersionID: Phase0EntityID;
  patchLabel: string;
  platformIDs: Phase0EntityID[];
  observedAt: ISODateString | null;
  sourceEvidenceFileIDs: Phase0EntityID[];
  status: Phase0SupportStatus;
}

export interface Phase0AuditEnvironment extends Phase0BaseEntity {
  kind: Phase0AuditEnvironmentKind;
  platformID: Phase0EntityID;
  platformName: string;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  consoleModel: string;
  consoleOSVersion: string;
  edition: string;
  region: string;
  storefront: string;
  copyType: Phase0CopyType;
  gameExecutableVersion: string;
  patchLabel: string;
  latestUpdateState: Phase0LatestUpdateState;
  observedAt: ISODateString;
  onlineState: "online" | "offline" | "unknown";
  eaAccountState: Phase0EAAccountState;
  resolution: string;
  hdrState: Phase0HDRState;
  displayModel: string;
  captureHardware: string;
  captureFormat: string;
  mode: string;
  exactPath: string;
  position: string;
  archetype: string;
  handedness: Phase0Handedness;
  height: string;
  weight: string;
  bodyType: string;
  entitlements: string[];
  evidenceFileIDs: Phase0EntityID[];
  auditorID: string;
  consoleDevice?: string;
  display?: string;
  captureDevice?: string;
  lightingDescription?: string;
  networkState?: "online" | "offline" | "unknown";
  notes?: string;
}

export interface Phase0CreationPathStep {
  stepNumber: number;
  instruction: string;
  expectedResult: string;
  menuItemID: Phase0EntityID | null;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0CreationPathRequirement {
  id: Phase0EntityID;
  description: string;
  required: boolean;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0CreationPathRestriction {
  id: Phase0EntityID;
  description: string;
  severity: "info" | "blocking";
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0CreationPathAppearanceRelevance {
  affectsAppearance: boolean;
  affectedCatalogKinds: Phase0CatalogItemKind[];
  affectedAttributeFamilies: string[];
  notes: string;
}

export interface Phase0CreationPathDependency {
  id: Phase0EntityID;
  description: string;
  dependencyTestID: Phase0EntityID | null;
  requiredCreationPathID: Phase0EntityID | null;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0CreationPath extends Phase0BaseEntity {
  gameID: Phase0EntityID;
  gameMode: string;
  displayName: string;
  exactPath: string;
  platformIDs: Phase0EntityID[];
  observedPatchIDs: Phase0EntityID[];
  menuItemIDs: Phase0EntityID[];
  reproducibleSteps: Phase0CreationPathStep[];
  requirements: Phase0CreationPathRequirement[];
  restrictions: Phase0CreationPathRestriction[];
  appearanceRelevance: Phase0CreationPathAppearanceRelevance;
  dependencies: Phase0CreationPathDependency[];
  verificationState: Phase0VerificationState;
  verificationRecordIDs: Phase0EntityID[];
  evidenceFileIDs: Phase0EntityID[];
  status: Phase0SupportStatus;
}

export interface Phase0MenuItem extends Phase0BaseEntity {
  gameID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  parentMenuItemID: Phase0EntityID | null;
  kind: Phase0MenuItemKind;
  exactVisibleLabelOrIndex: string;
  ordinal: number | null;
  navigationInstructionIDs: Phase0EntityID[];
  evidenceFileIDs: Phase0EntityID[];
  verificationState: Phase0VerificationState;
}

export interface Phase0CanonicalCaptureAngle {
  angleID: CapturedAngleID;
  required: boolean;
  instruction: string;
  minimumWidth: number;
  minimumHeight: number;
}

export interface Phase0CanonicalCaptureConfiguration extends Phase0BaseEntity {
  name: string;
  version: Phase0VersionID;
  requiredAngles: Phase0CanonicalCaptureAngle[];
  fileNamingPattern: string;
  requiredEvidenceKinds: Phase0EvidenceFileKind[];
}

export interface Phase0CatalogItemBase extends Phase0BaseEntity {
  stableInternalID: string;
  kind: Phase0CatalogItemKind;
  gameID: Phase0EntityID;
  platformID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  menuItemID: Phase0EntityID;
  categoryLabel: string;
  exactVisibleLabelOrIndex: string;
  verificationState: Phase0VerificationState;
  evidenceFileIDs: Phase0EntityID[];
  captureEventIDs: Phase0EntityID[];
  verificationRecordIDs: Phase0EntityID[];
  issueIDs: Phase0EntityID[];
  isTestFixture: boolean;
  isProductionCandidate: boolean;
  catalogVersionID: Phase0VersionID | null;
}

export interface Phase0HeadCatalogItem extends Phase0CatalogItemBase {
  kind: "head";
  supportedMeasurementIDs: StandardFacialMeasurementID[];
  geometryAnnotationStatus: "notStarted" | "partial" | "complete";
}

export interface Phase0HairstyleCatalogItem extends Phase0CatalogItemBase {
  kind: "hairstyle";
  standardizedHairLength: "unknown" | "short" | "medium" | "long";
  obscuresForehead: boolean | null;
  obscuresEars: boolean | null;
}

export interface Phase0FacialHairCatalogItem extends Phase0CatalogItemBase {
  kind: "facialHair";
  standardizedCoverage: "unknown" | "none" | "mustache" | "goatee" | "beard" | "mixed";
}

export interface Phase0AdditionalAttributeCatalogItem extends Phase0CatalogItemBase {
  kind: "additionalAttribute";
  attributeFamily: "eyebrow" | "visibleMark" | "body" | "height" | "weight" | "other";
  valueType: "label" | "index" | "numeric" | "boolean";
}

export type Phase0CatalogItem =
  | Phase0HeadCatalogItem
  | Phase0HairstyleCatalogItem
  | Phase0FacialHairCatalogItem
  | Phase0AdditionalAttributeCatalogItem;

export interface Phase0DependencyTest extends Phase0BaseEntity {
  kind: Phase0DependencyTestKind;
  gameID: Phase0EntityID;
  platformIDs: Phase0EntityID[];
  gameVersionIDs: Phase0EntityID[];
  patchIDs: Phase0EntityID[];
  catalogItemIDs: Phase0EntityID[];
  hypothesis: string;
  result: Phase0DependencyTestStatus;
  evidenceFileIDs: Phase0EntityID[];
}

export interface Phase0EvidenceFile extends Phase0BaseEntity {
  kind: Phase0EvidenceFileKind;
  relativePath: string;
  sha256: string | null;
  storageScope: Phase0EvidenceStorageScope;
  containsRawFaceMedia: boolean;
  approvedForProductionCatalog: boolean;
  capturedAt: ISODateString | null;
  capturedAngleID: CapturedAngleID | "navigationEvidence" | null;
  fileSizeBytes: number | null;
  width: number | null;
  height: number | null;
  notes?: string;
}

export interface Phase0CaptureEvent extends Phase0BaseEntity {
  kind: Phase0CaptureEventKind;
  auditEnvironmentID: Phase0EntityID;
  captureConfigurationID: Phase0EntityID;
  catalogItemID: Phase0EntityID | null;
  angleID: CapturedAngleID | "navigationEvidence";
  evidenceFileID: Phase0EntityID;
  capturedAt: ISODateString;
  operatorID: string;
  qualityState: "accepted" | "needsReview" | "rejected";
  notes?: string;
}

export interface Phase0Issue extends Phase0BaseEntity {
  relatedEntityID: Phase0EntityID;
  severity: Phase0IssueSeverity;
  status: Phase0IssueStatus;
  title: string;
  description: string;
  openedBy: string;
  resolvedAt: ISODateString | null;
}

export interface Phase0RecaptureRequest extends Phase0BaseEntity {
  catalogItemID: Phase0EntityID;
  requestedAngleIDs: Array<CapturedAngleID | "navigationEvidence">;
  reason: string;
  issueID: Phase0EntityID | null;
  requestedBy: string;
  status: "open" | "completed" | "cancelled";
  completedCaptureEventIDs: Phase0EntityID[];
}

export interface Phase0VerificationRecord extends Phase0BaseEntity {
  targetEntityID: Phase0EntityID;
  targetEntityType: "menuItem" | "catalogItem" | "catalogRelease" | "evidenceFile";
  stage: Phase0ReviewStage;
  verifierID: string;
  decision: Phase0ReviewDecision;
  reviewedAt: ISODateString;
  checklistVersion: Phase0VersionID;
  evidenceFileIDs: Phase0EntityID[];
  discrepancyIDs: Phase0EntityID[];
  notes?: string;
}

export interface Phase0Discrepancy extends Phase0BaseEntity {
  kind: Phase0DiscrepancyKind;
  relatedEntityIDs: Phase0EntityID[];
  description: string;
  evidenceFileIDs: Phase0EntityID[];
  severity: Phase0IssueSeverity;
  status: Phase0IssueStatus;
}

export interface Phase0CatalogRelease extends Phase0BaseEntity {
  releaseID: Phase0EntityID;
  catalogVersionID: Phase0VersionID;
  gameID: Phase0EntityID;
  platformID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  patchID: Phase0EntityID;
  status: Phase0CatalogReleaseStatus;
  itemIDs: Phase0EntityID[];
  manifestRelativePath: string;
  deterministicChecksum: string | null;
  approvedVerificationRecordIDs: Phase0EntityID[];
  releaseNotes: string;
  changeSummary: string[];
  previousCatalogVersionID: Phase0VersionID | null;
  supersededByCatalogVersionID: Phase0VersionID | null;
  publishedAt: ISODateString | null;
  supersededAt: ISODateString | null;
  rejectedAt: ISODateString | null;
}

export interface Phase0ImportValidationRun extends Phase0BaseEntity {
  runID: Phase0EntityID;
  inputRelativePath: string;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  status: Phase0ImportValidationStatus;
  checkedRecordCount: number;
  errorCount: number;
  warningCount: number;
  issueIDs: Phase0EntityID[];
  reportRelativePath: string | null;
}

export interface Phase0ManualMatchingStudy extends Phase0BaseEntity {
  studyID: Phase0EntityID;
  protocolVersion: Phase0VersionID;
  catalogReleaseID: Phase0EntityID | null;
  status: Phase0ManualStudyStatus;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  subjectResultIDs: Phase0EntityID[];
  targetMetrics: {
    topOneAcceptanceTarget: number;
    topThreeUsefulnessTarget: number;
    repeatabilityTarget: number;
  };
}

export interface Phase0SubjectResult extends Phase0BaseEntity {
  subjectResultID: Phase0EntityID;
  studyID: Phase0EntityID;
  anonymizedSubjectID: string;
  profileID: string | null;
  matchedCatalogItemIDs: Phase0EntityID[];
  selectedTopCandidateID: Phase0EntityID | null;
  topThreeUseful: boolean | null;
  resemblanceRating: number | null;
  status: Phase0SubjectResultStatus;
  notes?: string;
}

export interface Phase0DomainSnapshot {
  schemaVersion: typeof PHASE0_DOMAIN_SCHEMA_VERSION;
  generatedAt: ISODateString;
  games: Phase0Game[];
  platforms: Phase0Platform[];
  gameVersions: Phase0GameVersion[];
  patches: Phase0Patch[];
  auditEnvironments: Phase0AuditEnvironment[];
  creationPaths: Phase0CreationPath[];
  menuItems: Phase0MenuItem[];
  captureConfigurations: Phase0CanonicalCaptureConfiguration[];
  catalogItems: Phase0CatalogItem[];
  dependencyTests: Phase0DependencyTest[];
  evidenceFiles: Phase0EvidenceFile[];
  captureEvents: Phase0CaptureEvent[];
  issues: Phase0Issue[];
  recaptureRequests: Phase0RecaptureRequest[];
  verificationRecords: Phase0VerificationRecord[];
  discrepancies: Phase0Discrepancy[];
  catalogReleases: Phase0CatalogRelease[];
  importValidationRuns: Phase0ImportValidationRun[];
  manualMatchingStudies: Phase0ManualMatchingStudy[];
  subjectResults: Phase0SubjectResult[];
}

export interface Phase0DomainValidationIssue {
  code: string;
  message: string;
  entityID?: string;
}

export interface Phase0DomainValidationReport {
  ok: boolean;
  errors: Phase0DomainValidationIssue[];
  warnings: Phase0DomainValidationIssue[];
}

export function createEmptyPhase0DomainSnapshot(generatedAt: ISODateString): Phase0DomainSnapshot {
  return {
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    generatedAt,
    games: [],
    platforms: [],
    gameVersions: [],
    patches: [],
    auditEnvironments: [],
    creationPaths: [],
    menuItems: [],
    captureConfigurations: [],
    catalogItems: [],
    dependencyTests: [],
    evidenceFiles: [],
    captureEvents: [],
    issues: [],
    recaptureRequests: [],
    verificationRecords: [],
    discrepancies: [],
    catalogReleases: [],
    importValidationRuns: [],
    manualMatchingStudies: [],
    subjectResults: []
  };
}

export function validatePhase0DomainSnapshot(snapshot: Phase0DomainSnapshot): Phase0DomainValidationReport {
  const errors: Phase0DomainValidationIssue[] = [];
  const warnings: Phase0DomainValidationIssue[] = [];

  if (snapshot.schemaVersion !== PHASE0_DOMAIN_SCHEMA_VERSION) {
    errors.push({ code: "invalidSchemaVersion", message: `Expected ${PHASE0_DOMAIN_SCHEMA_VERSION}.` });
  }
  if (!isISODate(snapshot.generatedAt)) {
    errors.push({ code: "invalidTimestamp", message: "Snapshot generatedAt must be an ISO timestamp." });
  }

  const collections = getCollections(snapshot);
  for (const [collectionName, entities] of Object.entries(collections)) {
    const seen = new Set<string>();
    for (const entity of entities) {
      if (!entity.id.trim()) errors.push({ code: "missingStableID", message: `${collectionName} entity is missing a stable ID.` });
      if (seen.has(entity.id)) errors.push({ code: "duplicateStableID", message: `${collectionName} has duplicate ID ${entity.id}.`, entityID: entity.id });
      seen.add(entity.id);
      if (entity.schemaVersion !== PHASE0_DOMAIN_SCHEMA_VERSION) {
        errors.push({ code: "invalidSchemaVersion", message: `${entity.id} has an invalid schema version.`, entityID: entity.id });
      }
      if (!isISODate(entity.createdAt) || !isISODate(entity.updatedAt)) {
        errors.push({ code: "invalidTimestamp", message: `${entity.id} has invalid createdAt or updatedAt.`, entityID: entity.id });
      }
    }
  }

  for (const item of snapshot.catalogItems) {
    if (!item.stableInternalID.trim()) errors.push({ code: "missingStableID", message: "Catalog item is missing stableInternalID.", entityID: item.id });
    if (containsPlaceholder(item.exactVisibleLabelOrIndex) || containsPlaceholder(item.categoryLabel)) {
      errors.push({ code: "placeholderGameData", message: `${item.id} contains placeholder game data.`, entityID: item.id });
    }
    if (item.isProductionCandidate && item.isTestFixture) {
      errors.push({ code: "fixtureProductionCandidate", message: `${item.id} cannot be both a fixture and a production candidate.`, entityID: item.id });
    }
    if (item.verificationState === "verified") validateSecondReviewGate(item, snapshot.verificationRecords, errors);
  }

  for (const evidenceFile of snapshot.evidenceFiles) {
    if (evidenceFile.storageScope === "productionReference" && evidenceFile.containsRawFaceMedia) {
      errors.push({ code: "rawFaceMediaInProductionReference", message: `${evidenceFile.id} cannot store raw face media as production reference evidence.`, entityID: evidenceFile.id });
    }
    if (evidenceFile.approvedForProductionCatalog && evidenceFile.storageScope !== "productionReference") {
      warnings.push({ code: "nonProductionEvidenceApproved", message: `${evidenceFile.id} is approved but not stored as a production reference.`, entityID: evidenceFile.id });
    }
  }

  for (const environment of snapshot.auditEnvironments) {
    validateAuditEnvironment(environment, errors);
  }

  for (const creationPath of snapshot.creationPaths) {
    validateCreationPath(creationPath, errors);
    if (creationPath.verificationState === "verified") validateCreationPathVerificationGate(creationPath, snapshot.verificationRecords, errors);
  }

  for (const release of snapshot.catalogReleases) {
    if (release.status === "approvedRelease" || release.status === "supersededRelease") {
      if (!release.deterministicChecksum) errors.push({ code: "missingReleaseChecksum", message: `${release.id} is missing a deterministic checksum.`, entityID: release.id });
      if (!release.releaseNotes.trim() || release.changeSummary.length === 0) {
        errors.push({ code: "missingReleaseNotes", message: `${release.id} requires release notes that identify changes.`, entityID: release.id });
      }
      if (!release.publishedAt) errors.push({ code: "missingReleasePublishedAt", message: `${release.id} requires a publishedAt timestamp.`, entityID: release.id });
      const releaseItems = release.itemIDs.map((id) => snapshot.catalogItems.find((item) => item.id === id));
      if (releaseItems.some((item) => !item)) errors.push({ code: "missingReleaseItem", message: `${release.id} references a missing catalog item.`, entityID: release.id });
      for (const item of releaseItems) {
        if (item && (item.verificationState !== "verified" || item.isTestFixture)) {
          errors.push({ code: "unverifiedReleaseItem", message: `${release.id} includes an unverified or fixture item.`, entityID: release.id });
        }
      }
    }
    if (release.status === "supersededRelease" && (!release.supersededAt || !release.supersededByCatalogVersionID)) {
      errors.push({ code: "missingSupersessionContext", message: `${release.id} requires supersession context.`, entityID: release.id });
    }
    if (release.status === "rejectedRelease" && !release.rejectedAt) {
      errors.push({ code: "missingRejectedAt", message: `${release.id} requires rejectedAt.`, entityID: release.id });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validatePhase0AuditEnvironment(environment: Phase0AuditEnvironment): Phase0DomainValidationReport {
  const errors: Phase0DomainValidationIssue[] = [];
  validateBaseEntity(environment, "auditEnvironment", errors);
  validateAuditEnvironment(environment, errors);
  return { ok: errors.length === 0, errors, warnings: [] };
}

export function validatePhase0CreationPath(creationPath: Phase0CreationPath): Phase0DomainValidationReport {
  const errors: Phase0DomainValidationIssue[] = [];
  validateBaseEntity(creationPath, "creationPath", errors);
  validateCreationPath(creationPath, errors);
  return { ok: errors.length === 0, errors, warnings: [] };
}

function validateAuditEnvironment(environment: Phase0AuditEnvironment, errors: Phase0DomainValidationIssue[]) {
  for (const field of [
    "platformName",
    "consoleModel",
    "consoleOSVersion",
    "edition",
    "region",
    "storefront",
    "gameExecutableVersion",
    "patchLabel",
    "resolution",
    "displayModel",
    "captureHardware",
    "captureFormat",
    "mode",
    "exactPath",
    "position",
    "archetype",
    "height",
    "weight",
    "bodyType",
    "auditorID"
  ] as const) {
    if (!hasUsableText(environment[field])) {
      errors.push({ code: "missingAuditEnvironmentField", message: `${environment.id} is missing ${field}.`, entityID: environment.id });
    }
  }
  if (!isISODate(environment.observedAt)) {
    errors.push({ code: "invalidTimestamp", message: `${environment.id} has invalid observedAt.`, entityID: environment.id });
  }
  if (environment.evidenceFileIDs.length === 0) {
    errors.push({ code: "missingEvidenceReference", message: `${environment.id} must reference environment evidence.`, entityID: environment.id });
  }
}

function validateCreationPath(creationPath: Phase0CreationPath, errors: Phase0DomainValidationIssue[]) {
  for (const field of ["gameMode", "displayName", "exactPath"] as const) {
    if (!hasUsableText(creationPath[field])) {
      errors.push({ code: "missingCreationPathField", message: `${creationPath.id} is missing ${field}.`, entityID: creationPath.id });
    }
  }
  if (creationPath.reproducibleSteps.length === 0) {
    errors.push({ code: "missingCreationPathSteps", message: `${creationPath.id} requires reproducible steps.`, entityID: creationPath.id });
  }
  const expectedSteps = creationPath.reproducibleSteps.map((step) => step.stepNumber).sort((a, b) => a - b);
  for (let index = 0; index < expectedSteps.length; index += 1) {
    if (expectedSteps[index] !== index + 1) {
      errors.push({ code: "invalidCreationPathStepSequence", message: `${creationPath.id} step numbers must be contiguous from 1.`, entityID: creationPath.id });
      break;
    }
  }
  for (const step of creationPath.reproducibleSteps) {
    if (!hasUsableText(step.instruction) || !hasUsableText(step.expectedResult)) {
      errors.push({ code: "invalidCreationPathStep", message: `${creationPath.id} has an incomplete reproducible step.`, entityID: creationPath.id });
    }
    if (step.evidenceFileIDs.length === 0) {
      errors.push({ code: "missingEvidenceReference", message: `${creationPath.id} step ${step.stepNumber} requires evidence.`, entityID: creationPath.id });
    }
  }
  if (creationPath.evidenceFileIDs.length === 0) {
    errors.push({ code: "missingEvidenceReference", message: `${creationPath.id} must reference creation-path evidence.`, entityID: creationPath.id });
  }
}

function validateCreationPathVerificationGate(creationPath: Phase0CreationPath, records: Phase0VerificationRecord[], errors: Phase0DomainValidationIssue[]) {
  const approvals = records.filter(
    (record) =>
      creationPath.verificationRecordIDs.includes(record.id) &&
      record.targetEntityID === creationPath.id &&
      record.targetEntityType === "menuItem" &&
      record.decision === "approved"
  );
  const first = approvals.some((record) => record.stage === "first");
  const second = approvals.some((record) => record.stage === "second");
  const reviewers = new Set(approvals.map((record) => record.verifierID).filter(Boolean));
  if (!first || !second || reviewers.size < 2) {
    errors.push({ code: "missingSecondReview", message: `${creationPath.id} requires first and second approved creation-path reviews from different verifiers.`, entityID: creationPath.id });
  }
}

function validateSecondReviewGate(item: Phase0CatalogItem, records: Phase0VerificationRecord[], errors: Phase0DomainValidationIssue[]) {
  const approvals = records.filter((record) => item.verificationRecordIDs.includes(record.id) && record.targetEntityID === item.id && record.decision === "approved");
  const first = approvals.some((record) => record.stage === "first");
  const second = approvals.some((record) => record.stage === "second");
  const reviewers = new Set(approvals.map((record) => record.verifierID).filter(Boolean));
  if (!first || !second || reviewers.size < 2) {
    errors.push({ code: "missingSecondReview", message: `${item.id} requires first and second approved reviews from different verifiers.`, entityID: item.id });
  }
}

function getCollections(snapshot: Phase0DomainSnapshot): Record<string, Phase0BaseEntity[]> {
  return {
    games: snapshot.games,
    platforms: snapshot.platforms,
    gameVersions: snapshot.gameVersions,
    patches: snapshot.patches,
    auditEnvironments: snapshot.auditEnvironments,
    creationPaths: snapshot.creationPaths,
    menuItems: snapshot.menuItems,
    captureConfigurations: snapshot.captureConfigurations,
    catalogItems: snapshot.catalogItems,
    dependencyTests: snapshot.dependencyTests,
    evidenceFiles: snapshot.evidenceFiles,
    captureEvents: snapshot.captureEvents,
    issues: snapshot.issues,
    recaptureRequests: snapshot.recaptureRequests,
    verificationRecords: snapshot.verificationRecords,
    discrepancies: snapshot.discrepancies,
    catalogReleases: snapshot.catalogReleases,
    importValidationRuns: snapshot.importValidationRuns,
    manualMatchingStudies: snapshot.manualMatchingStudies,
    subjectResults: snapshot.subjectResults
  };
}

function validateBaseEntity(entity: Phase0BaseEntity, collectionName: string, errors: Phase0DomainValidationIssue[]) {
  if (!entity.id.trim()) errors.push({ code: "missingStableID", message: `${collectionName} entity is missing a stable ID.` });
  if (entity.schemaVersion !== PHASE0_DOMAIN_SCHEMA_VERSION) {
    errors.push({ code: "invalidSchemaVersion", message: `${entity.id} has an invalid schema version.`, entityID: entity.id });
  }
  if (!isISODate(entity.createdAt) || !isISODate(entity.updatedAt)) {
    errors.push({ code: "invalidTimestamp", message: `${entity.id} has invalid createdAt or updatedAt.`, entityID: entity.id });
  }
}

function isISODate(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function containsPlaceholder(value: string) {
  return /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !containsPlaceholder(value);
}
