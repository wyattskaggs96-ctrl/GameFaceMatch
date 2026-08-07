export const CF27_SUPPORTED_SUBSET_VERIFIER_LOCAL_STORAGE_KEY = "gfm:cf27-supported-subset-verifier:v1";

export const allowedVerifierStatuses = [
  "VERIFIED",
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED",
  "NOT_VERIFIED"
] as const;

export type VerifierStatus = (typeof allowedVerifierStatuses)[number];
export type TriState = "" | "yes" | "no" | "uncertain";
export type FrontViewState = "" | "yes" | "no" | "not_applicable";
export type SecondaryAngleState = "" | "yes" | "no" | "not_selected" | "not_available";
export type DuplicateState = "" | "yes" | "no" | "uncertain" | "not_applicable";

export interface SupportedSubsetVerifierPackage {
  sessionManifest: Record<string, unknown>;
  candidateDetails: SupportedSubsetVerifierCandidate[];
  recordDecisionTemplate: VerifierRecordDecision[];
  menuCountTemplate: VerifierMenuCount[];
  secondaryAngleTemplate: VerifierSecondaryAngleResult[];
  duplicateOrderTemplate: VerifierDuplicateOrderDisposition[];
  exportTemplate: Record<string, unknown>;
}

export interface SupportedSubsetVerifierCandidate {
  candidateID: string;
  category: string;
  claimedNativeLabel: string;
  claimedNativeIndex: number | string | null;
  claimedNativeOrder: number | string | null;
  evidenceSupportState: string;
  primaryReviewStatus: string;
  currentVerificationStatus: string;
  primaryObservation: string;
  primaryNotes: string;
  knownLimitations: string[];
  sourceVideoIDs: string[];
  sourceVideoPaths: string[];
  exactEvidenceTimestamps: string[];
  derivativeEvidenceReferences: Array<{
    evidenceID?: string;
    relativePath?: string;
    view?: string;
    timestamp?: number | string | null;
  }>;
  frontViewEvidence: string;
  secondaryViewEvidence: string;
  menuLabelVisibility: string;
  nativeOrderVisibility: string;
  boundaryVisibility: string;
  duplicateFlag: boolean;
  orderUnresolvedFlag: boolean;
  dependencyFlag: boolean;
  environmentVersionLimitation: boolean;
  currentProductionEligibility: string;
  currentRecommendationEligibility: boolean;
  blockedReason: string;
  deterministicSecondaryAngleSampleRequired: boolean;
  allowedVerifierDecisions: VerifierStatus[];
  productionEligibilityState: "NOT_ELIGIBLE";
  recommendationEligibilityState: "NOT_ELIGIBLE";
}

export interface VerifierEnvironment {
  verifierId: string;
  verificationDate: string;
  gameTitleDisplayed: string;
  platform: string;
  consoleModel: string;
  gameEdition: string;
  region: string;
  gameVersion: string;
  patchOrInstalledUpdate: string;
  mode: string;
  creationPath: string;
  accountState: string;
  onlineState: string;
  sameEnvironmentAsPrimaryResearcher: string;
  environmentDifference: string;
  independentlyAccessedShippingGame: boolean;
  environmentEvidenceReference: string;
  notes: string;
}

export interface VerifierAttestation {
  attestationVersion: string;
  verifierId: string;
  attestationTimestamp: string;
  attestationAccepted: boolean;
  realSecondPerson: boolean;
  independentlyAccessedShippingGame: boolean;
  didNotMerelyApprovePrimarySummary: boolean;
  reviewedCandidateAndEvidencePresented: boolean;
  recordedDisagreementsHonestly: boolean;
  didNotGuessMissingLabelsOrderCountsOrViews: boolean;
  understandsNotPublishingCatalog: boolean;
  understandsCatalogManagerApprovalSeparate: boolean;
  notes: string;
}

export interface VerifierRecordDecision {
  candidateID: string;
  category: string;
  independentObservation: string;
  candidateIdentityConfirmed: TriState;
  nativeLabelConfirmed: TriState;
  nativeIndexConfirmed: TriState;
  nativeOrderConfirmed: TriState;
  evidenceFilesResolve: "" | "yes" | "no";
  frontViewConfirmed: FrontViewState;
  secondaryAngleReviewed: SecondaryAngleState;
  menuCountConfirmed: TriState;
  duplicateRelationshipConfirmed: DuplicateState;
  environmentCompatible: TriState;
  decisionStatus: "" | VerifierStatus;
  discrepancyType: string;
  requiredNotes: string;
  recommendedResolution: string;
  resolutionEvidenceReference: string;
  decisionTimestamp: string;
  productionEligibilityState: "NOT_ELIGIBLE";
  recommendationEligibilityState: "NOT_ELIGIBLE";
}

export interface VerifierMenuCount {
  targetID: string;
  category: string;
  representedInSupportedSubset: string;
  independentVerifierCount: string;
  firstVisibleValue: string;
  finalVisibleValue: string;
  boundaryOrWrapObserved: string;
  evidenceReference: string;
  countConfirmed: TriState;
  notes: string;
}

export interface VerifierSecondaryAngleResult {
  sampleID: string;
  candidateID: string;
  category: string;
  requiredSecondaryViews: string;
  sourceVideoIDs: string;
  exactUsefulTimestamps: string;
  selectionHash: string;
  requiredAction: string;
  reviewed: "" | "yes" | "no" | "not_available";
  verifierObservation: string;
  result: string;
  missingAngleLimitation: string;
  notes: string;
}

export interface VerifierDuplicateOrderDisposition {
  candidateID: string;
  category: string;
  evidenceSupportState: string;
  duplicateFlag: boolean;
  orderUnresolvedFlag: boolean;
  includedInSupportedSubset: boolean;
  requiredHumanAction: string;
  productionEligibilityState: "NOT_ELIGIBLE";
  notes: string;
  verifierDisposition?: string;
  verifierObservation?: string;
}

export interface VerifierDraftState {
  schemaVersion: "cf27-supported-subset-browser-verifier-v1";
  updatedAt: string;
  currentIndex: number;
  environment: VerifierEnvironment;
  attestation: VerifierAttestation;
  decisions: Record<string, VerifierRecordDecision>;
  menuCounts: Record<string, VerifierMenuCount>;
  secondaryAngles: Record<string, VerifierSecondaryAngleResult>;
  duplicateOrderRows: Record<string, VerifierDuplicateOrderDisposition>;
}

export interface VerifierProgress {
  total: number;
  completed: number;
  remaining: number;
  flagged: number;
  percentComplete: number;
}

const triStateValues = new Set(["yes", "no", "uncertain"]);
const evidenceValues = new Set(["yes", "no"]);
const frontViewValues = new Set(["yes", "no", "not_applicable"]);
const secondaryValues = new Set(["yes", "no", "not_selected", "not_available"]);
const duplicateValues = new Set(["yes", "no", "uncertain", "not_applicable"]);

export function createInitialVerifierDraft(pkg: SupportedSubsetVerifierPackage, now = new Date()): VerifierDraftState {
  return {
    schemaVersion: "cf27-supported-subset-browser-verifier-v1",
    updatedAt: now.toISOString(),
    currentIndex: 0,
    environment: {
      verifierId: "",
      verificationDate: now.toISOString().slice(0, 10),
      gameTitleDisplayed: "EA SPORTS College Football 27",
      platform: "",
      consoleModel: "",
      gameEdition: "unknown",
      region: "unknown",
      gameVersion: "unknown",
      patchOrInstalledUpdate: "unknown",
      mode: "Road to Glory",
      creationPath: "Road to Glory > Create Player > Appearance",
      accountState: "unknown",
      onlineState: "unknown",
      sameEnvironmentAsPrimaryResearcher: "unknown",
      environmentDifference: "",
      independentlyAccessedShippingGame: false,
      environmentEvidenceReference: "",
      notes: ""
    },
    attestation: {
      attestationVersion: "cf27-supported-subset-verifier-attestation-v1",
      verifierId: "",
      attestationTimestamp: "",
      attestationAccepted: false,
      realSecondPerson: false,
      independentlyAccessedShippingGame: false,
      didNotMerelyApprovePrimarySummary: false,
      reviewedCandidateAndEvidencePresented: false,
      recordedDisagreementsHonestly: false,
      didNotGuessMissingLabelsOrderCountsOrViews: false,
      understandsNotPublishingCatalog: false,
      understandsCatalogManagerApprovalSeparate: false,
      notes: ""
    },
    decisions: Object.fromEntries(pkg.recordDecisionTemplate.map((row) => [row.candidateID, { ...row }])),
    menuCounts: Object.fromEntries(pkg.menuCountTemplate.map((row) => [row.targetID, { ...row }])),
    secondaryAngles: Object.fromEntries(pkg.secondaryAngleTemplate.map((row) => [row.candidateID, { ...row }])),
    duplicateOrderRows: Object.fromEntries(pkg.duplicateOrderTemplate.map((row) => [row.candidateID, { ...row }]))
  };
}

export function calculateVerifierProgress(pkg: SupportedSubsetVerifierPackage, state: VerifierDraftState): VerifierProgress {
  const completed = pkg.candidateDetails.filter((record) => isRecordDecisionComplete(record, state.decisions[record.candidateID])).length;
  const flagged = Object.values(state.decisions).filter((decision) => decision.decisionStatus && decision.decisionStatus !== "VERIFIED").length;
  return {
    total: pkg.candidateDetails.length,
    completed,
    remaining: pkg.candidateDetails.length - completed,
    flagged,
    percentComplete: Math.round((completed / Math.max(pkg.candidateDetails.length, 1)) * 100)
  };
}

export function isRecordDecisionComplete(candidate: SupportedSubsetVerifierCandidate, decision?: VerifierRecordDecision) {
  if (!decision) return false;
  if (!decision.decisionStatus || !allowedVerifierStatuses.includes(decision.decisionStatus)) return false;
  if (!decision.independentObservation.trim()) return false;
  if (!triStateValues.has(decision.candidateIdentityConfirmed)) return false;
  if (!triStateValues.has(decision.nativeLabelConfirmed)) return false;
  if (!triStateValues.has(decision.nativeIndexConfirmed)) return false;
  if (!triStateValues.has(decision.nativeOrderConfirmed)) return false;
  if (!evidenceValues.has(decision.evidenceFilesResolve)) return false;
  if (!frontViewValues.has(decision.frontViewConfirmed)) return false;
  if (!secondaryValues.has(decision.secondaryAngleReviewed)) return false;
  if (candidate.deterministicSecondaryAngleSampleRequired && decision.secondaryAngleReviewed === "not_selected") return false;
  if (!triStateValues.has(decision.menuCountConfirmed)) return false;
  if (!duplicateValues.has(decision.duplicateRelationshipConfirmed)) return false;
  if (!triStateValues.has(decision.environmentCompatible)) return false;
  if (!decision.decisionTimestamp || Number.isNaN(Date.parse(decision.decisionTimestamp))) return false;
  const uncertain = [
    decision.candidateIdentityConfirmed,
    decision.nativeLabelConfirmed,
    decision.nativeIndexConfirmed,
    decision.nativeOrderConfirmed,
    decision.menuCountConfirmed,
    decision.environmentCompatible
  ].includes("uncertain");
  if ((uncertain || decision.decisionStatus !== "VERIFIED") && !decision.requiredNotes.trim()) return false;
  if (
    decision.decisionStatus === "VERIFIED" &&
    (decision.candidateIdentityConfirmed !== "yes" ||
      decision.nativeLabelConfirmed !== "yes" ||
      decision.nativeIndexConfirmed !== "yes" ||
      decision.nativeOrderConfirmed !== "yes" ||
      decision.evidenceFilesResolve !== "yes" ||
      decision.frontViewConfirmed !== "yes" ||
      decision.environmentCompatible !== "yes")
  ) {
    return false;
  }
  return true;
}

export function getVerifierCompletionErrors(pkg: SupportedSubsetVerifierPackage, state: VerifierDraftState) {
  const errors: string[] = [];
  const environmentRequired: Array<keyof VerifierEnvironment> = [
    "verifierId",
    "verificationDate",
    "gameTitleDisplayed",
    "platform",
    "consoleModel",
    "gameVersion",
    "patchOrInstalledUpdate",
    "mode",
    "creationPath"
  ];
  for (const field of environmentRequired) if (!String(state.environment[field] ?? "").trim()) errors.push(`Environment is missing ${field}.`);
  if (!state.environment.independentlyAccessedShippingGame) errors.push("The verifier must confirm independent access to the shipping game.");
  for (const [field, value] of Object.entries(state.attestation)) {
    if (typeof value === "boolean" && value !== true) errors.push(`Attestation is missing ${field}.`);
  }
  for (const candidate of pkg.candidateDetails) {
    if (!isRecordDecisionComplete(candidate, state.decisions[candidate.candidateID])) errors.push(`${candidate.candidateID} is not complete.`);
  }
  for (const row of Object.values(state.menuCounts)) {
    if (!triStateValues.has(row.countConfirmed)) errors.push(`Menu count ${row.category} has not been confirmed or marked uncertain.`);
    if (row.countConfirmed === "yes" && !row.independentVerifierCount.trim()) errors.push(`Menu count ${row.category} needs a verifier count.`);
  }
  for (const row of pkg.secondaryAngleTemplate) {
    const result = state.secondaryAngles[row.candidateID];
    if (!result || !["yes", "no", "not_available"].includes(result.reviewed) || !result.verifierObservation.trim()) {
      errors.push(`Secondary-angle sample ${row.candidateID} is incomplete.`);
    }
  }
  for (const row of Object.values(state.duplicateOrderRows)) {
    if (!String(row.verifierDisposition ?? "").trim() || !String(row.verifierObservation ?? "").trim()) {
      errors.push(`Excluded duplicate/order row ${row.candidateID} needs a disposition and observation.`);
    }
  }
  return errors;
}

export function buildVerifierExportPackage(pkg: SupportedSubsetVerifierPackage, state: VerifierDraftState, exportedAt = new Date()) {
  const verifierId = state.environment.verifierId.trim();
  const exportPackage = structuredClone(pkg.exportTemplate) as Record<string, unknown>;
  delete exportPackage.integrityHash;
  const sessionManifest = structuredClone(pkg.sessionManifest) as Record<string, unknown>;
  const verifierSessionModel = {
    ...((sessionManifest.verifierSessionModel as Record<string, unknown>) ?? {}),
    verifierSessionId: `cf27-supported-subset-session-${slug(verifierId)}-${state.environment.verificationDate || exportedAt.toISOString().slice(0, 10)}`,
    verifierId,
    startedAt: (sessionManifest.verifierSessionModel as Record<string, unknown> | undefined)?.startedAt || state.updatedAt,
    completedAt: exportedAt.toISOString(),
    verificationDate: state.environment.verificationDate,
    shippingGameAccessConfirmed: state.environment.independentlyAccessedShippingGame,
    independentInspectionConfirmed: state.attestation.independentlyAccessedShippingGame,
    primarySummaryNotUsedAsSoleBasis: state.attestation.didNotMerelyApprovePrimarySummary,
    environmentComplete: true,
    decisionCount: pkg.candidateDetails.length,
    completionState: "READY_TO_EXPORT",
    exportedAt: exportedAt.toISOString(),
    notes: "Exported from the GameFace Match local human verifier workflow. Non-production until Prompt 103 import, discrepancy review, catalog-manager approval, and release gates pass."
  };
  exportPackage.sessionManifest = { ...sessionManifest, verifierSessionModel };
  exportPackage.verifierEnvironment = { ...state.environment, verifierId };
  exportPackage.verifierAttestation = {
    ...state.attestation,
    verifierId,
    attestationTimestamp: state.attestation.attestationTimestamp || exportedAt.toISOString()
  };
  exportPackage.recordDecisions = pkg.candidateDetails.map((candidate) => state.decisions[candidate.candidateID]);
  exportPackage.menuCounts = Object.values(state.menuCounts);
  exportPackage.secondaryAngleResults = pkg.secondaryAngleTemplate.map((row) => state.secondaryAngles[row.candidateID]);
  exportPackage.duplicateAndOrderDispositionRows = Object.values(state.duplicateOrderRows);
  exportPackage.discrepancies = Object.values(state.decisions)
    .filter((decision) => decision.decisionStatus && decision.decisionStatus !== "VERIFIED")
    .map((decision) => ({
      candidateID: decision.candidateID,
      decisionStatus: decision.decisionStatus,
      discrepancyType: decision.discrepancyType || "verifier_flagged",
      notes: decision.requiredNotes,
      recommendedResolution: decision.recommendedResolution
    }));
  exportPackage.unresolvedItems = Object.values(state.decisions)
    .filter((decision) => decision.decisionStatus !== "VERIFIED")
    .map((decision) => ({
      candidateID: decision.candidateID,
      reason: decision.requiredNotes || decision.decisionStatus || "Awaiting catalog-manager review.",
      productionEligibilityState: "NOT_ELIGIBLE"
    }));
  exportPackage.productionStatus = "NOT_PRODUCTION_DATA";
  exportPackage.productionRecommendationsEnabled = false;
  return exportPackage;
}

export async function addIntegrityHash(exportPackage: Record<string, unknown>) {
  const clone = structuredClone(exportPackage);
  delete clone.integrityHash;
  const encoded = new TextEncoder().encode(JSON.stringify(clone));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const integrityHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { ...exportPackage, integrityHash };
}

export function verifierExportFilename(verifierId: string, verificationDate: string) {
  return `cf27-supported-subset-verifier-export-${slug(verifierId) || "unassigned"}-${verificationDate || "undated"}.json`;
}

export function sanitizeLoadedDraft(pkg: SupportedSubsetVerifierPackage, value: unknown): VerifierDraftState | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<VerifierDraftState>;
  if (draft.schemaVersion !== "cf27-supported-subset-browser-verifier-v1") return null;
  const initial = createInitialVerifierDraft(pkg);
  return {
    ...initial,
    ...draft,
    environment: { ...initial.environment, ...(draft.environment ?? {}) },
    attestation: { ...initial.attestation, ...(draft.attestation ?? {}) },
    decisions: { ...initial.decisions, ...(draft.decisions ?? {}) },
    menuCounts: { ...initial.menuCounts, ...(draft.menuCounts ?? {}) },
    secondaryAngles: { ...initial.secondaryAngles, ...(draft.secondaryAngles ?? {}) },
    duplicateOrderRows: { ...initial.duplicateOrderRows, ...(draft.duplicateOrderRows ?? {}) }
  };
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "").slice(0, 60);
}
