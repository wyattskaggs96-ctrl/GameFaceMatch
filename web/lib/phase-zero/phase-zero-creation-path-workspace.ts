import type { ISODateString } from "@/types/domain";
import {
  PHASE0_DOMAIN_SCHEMA_VERSION,
  validatePhase0CreationPath,
  type Phase0CatalogItemKind,
  type Phase0CreationPath,
  type Phase0EntityID
} from "./phase-zero-domain";

export const PHASE0_CREATION_PATH_WORKSPACE_SCHEMA_VERSION = "phase0-creation-path-workspace-v1";

export type CreationPathCandidateKind = "primaryCandidate" | "supplemental";
export type CreationPathConfirmationState = "draft" | "provisional" | "evidenceBacked" | "rejected";
export type CreationPathRequirementState = "unknown" | "required" | "notRequired";
export type CreationPathIdentifierConsistency = "unknown" | "consistent" | "inconsistent";
export type CreationPathLaterEditability = "unknown" | "editable" | "partiallyEditable" | "lockedAfterCreation";
export type CreationPathDependencyKind = "position" | "archetype" | "bodyType" | "account" | "online" | "other";

export interface CreationPathAuditStepDraft {
  stepNumber: number;
  instruction: string;
  expectedResult: string;
  buttonInputSequence: string;
  evidenceFileIDs: string[];
}

export interface CreationPathDependencyDraft {
  id: Phase0EntityID;
  kind: CreationPathDependencyKind;
  description: string;
  evidenceFileIDs: string[];
}

export interface CreationPathCanonicalScoreInput {
  evidenceCompleteness: number;
  reproducibility: number;
  appearanceCoverage: number;
  dependencyClarity: number;
  laterEditabilityConfidence: number;
}

export interface CreationPathCandidateDraft {
  id: Phase0EntityID;
  schemaVersion: typeof PHASE0_CREATION_PATH_WORKSPACE_SCHEMA_VERSION;
  updatedAt: ISODateString;
  sourceType: "researchDraft";
  candidateKind: CreationPathCandidateKind;
  confirmationState: CreationPathConfirmationState;
  gameID: Phase0EntityID;
  displayName: string;
  gameMode: string;
  exactPath: string;
  platformIDs: Phase0EntityID[];
  observedPatchIDs: Phase0EntityID[];
  menuItemIDs: Phase0EntityID[];
  accountRequirement: CreationPathRequirementState;
  accountRequirementNotes: string;
  onlineRequirement: CreationPathRequirementState;
  onlineRequirementNotes: string;
  restrictions: string[];
  appearanceCategoriesAvailable: Phase0CatalogItemKind[];
  identifierConsistency: CreationPathIdentifierConsistency;
  identifierConsistencyNotes: string;
  dependencies: CreationPathDependencyDraft[];
  laterEditability: CreationPathLaterEditability;
  laterEditabilityNotes: string;
  steps: CreationPathAuditStepDraft[];
  canonicalScoreInput: CreationPathCanonicalScoreInput;
  canonicalJustification: string;
  supplementalPathIDs: Phase0EntityID[];
  notes: string;
}

export interface CreationPathWorkspace {
  schemaVersion: typeof PHASE0_CREATION_PATH_WORKSPACE_SCHEMA_VERSION;
  updatedAt: ISODateString;
  candidates: CreationPathCandidateDraft[];
}

export interface CreationPathCandidateEvaluation {
  candidateID: string;
  status: CreationPathConfirmationState;
  canonicalScore: number;
  canExportCreationPath: boolean;
  missingCriticalFields: string[];
  missingEvidenceStepNumbers: number[];
  blockers: string[];
  warnings: string[];
  nextAction: string;
}

export interface CreationPathExportResult {
  creationPath: Phase0CreationPath | null;
  evaluation: CreationPathCandidateEvaluation;
  errors: string[];
}

export function createCreationPathCandidateDraft(
  id: Phase0EntityID = `creation-path-candidate-${Date.now()}`,
  now: ISODateString = new Date().toISOString()
): CreationPathCandidateDraft {
  return {
    id,
    schemaVersion: PHASE0_CREATION_PATH_WORKSPACE_SCHEMA_VERSION,
    updatedAt: now,
    sourceType: "researchDraft",
    candidateKind: "primaryCandidate",
    confirmationState: "draft",
    gameID: "college-football-27",
    displayName: "",
    gameMode: "",
    exactPath: "",
    platformIDs: [],
    observedPatchIDs: [],
    menuItemIDs: [],
    accountRequirement: "unknown",
    accountRequirementNotes: "",
    onlineRequirement: "unknown",
    onlineRequirementNotes: "",
    restrictions: [],
    appearanceCategoriesAvailable: [],
    identifierConsistency: "unknown",
    identifierConsistencyNotes: "",
    dependencies: [],
    laterEditability: "unknown",
    laterEditabilityNotes: "",
    steps: [createCreationPathStepDraft(1)],
    canonicalScoreInput: {
      evidenceCompleteness: 0,
      reproducibility: 0,
      appearanceCoverage: 0,
      dependencyClarity: 0,
      laterEditabilityConfidence: 0
    },
    canonicalJustification: "",
    supplementalPathIDs: [],
    notes: ""
  };
}

export function createCreationPathStepDraft(stepNumber: number): CreationPathAuditStepDraft {
  return {
    stepNumber,
    instruction: "",
    expectedResult: "",
    buttonInputSequence: "",
    evidenceFileIDs: []
  };
}

export function createCreationPathWorkspace(now: ISODateString = new Date().toISOString()): CreationPathWorkspace {
  return {
    schemaVersion: PHASE0_CREATION_PATH_WORKSPACE_SCHEMA_VERSION,
    updatedAt: now,
    candidates: [createCreationPathCandidateDraft("creation-path-candidate-1", now)]
  };
}

export function evaluateCreationPathCandidate(candidate: CreationPathCandidateDraft): CreationPathCandidateEvaluation {
  const missingCriticalFields = [
    ["display name", candidate.displayName],
    ["game mode", candidate.gameMode],
    ["exact path", candidate.exactPath],
    ["canonical justification", candidate.canonicalJustification]
  ]
    .filter(([, value]) => typeof value === "string" && value.trim().length === 0)
    .map(([label]) => label);
  if (candidate.platformIDs.length === 0) missingCriticalFields.push("platform IDs");
  if (candidate.observedPatchIDs.length === 0) missingCriticalFields.push("observed patch IDs");
  if (candidate.appearanceCategoriesAvailable.length === 0) missingCriticalFields.push("appearance categories available");

  const missingEvidenceStepNumbers = candidate.steps.filter((step) => step.evidenceFileIDs.length === 0).map((step) => step.stepNumber);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (missingCriticalFields.length > 0) blockers.push("Candidate path is missing required identifying fields.");
  if (candidate.steps.length === 0) blockers.push("Candidate path requires at least one reproducible step.");
  if (missingEvidenceStepNumbers.length > 0) blockers.push("Every reproducible step needs evidence before export.");
  if (candidate.confirmationState !== "evidenceBacked") blockers.push("Candidate path remains provisional until direct evidence confirms it.");
  if (isRoadToGloryCandidate(candidate) && candidate.confirmationState !== "evidenceBacked") {
    blockers.push("Road to Glory path is provisional until confirmed through direct evidence.");
  }
  if (candidate.identifierConsistency === "unknown") warnings.push("Identifier consistency has not been checked.");
  if (candidate.laterEditability === "unknown") warnings.push("Later editability has not been checked.");
  if (candidate.accountRequirement === "unknown") warnings.push("Account requirement is unknown.");
  if (candidate.onlineRequirement === "unknown") warnings.push("Online requirement is unknown.");

  const canonicalScore = scoreCandidate(candidate);
  const canExportCreationPath = blockers.length === 0 && canonicalScore >= 70;

  return {
    candidateID: candidate.id,
    status: candidate.confirmationState,
    canonicalScore,
    canExportCreationPath,
    missingCriticalFields,
    missingEvidenceStepNumbers,
    blockers: unique(blockers),
    warnings: unique(warnings),
    nextAction: chooseNextAction({ candidate, blockers, missingEvidenceStepNumbers, missingCriticalFields, canonicalScore })
  };
}

export function buildCreationPathFromCandidate(
  candidate: CreationPathCandidateDraft,
  now: ISODateString = new Date().toISOString()
): CreationPathExportResult {
  const evaluation = evaluateCreationPathCandidate(candidate);
  if (!evaluation.canExportCreationPath) {
    return { creationPath: null, evaluation, errors: ["Candidate path is not ready for creation-path export."] };
  }

  const evidenceFileIDs = unique(candidate.steps.flatMap((step) => step.evidenceFileIDs));
  const creationPath: Phase0CreationPath = {
    id: canonicalCreationPathID(candidate),
    schemaVersion: PHASE0_DOMAIN_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    gameID: candidate.gameID,
    gameMode: candidate.gameMode.trim(),
    displayName: candidate.displayName.trim(),
    exactPath: candidate.exactPath.trim(),
    platformIDs: candidate.platformIDs,
    observedPatchIDs: candidate.observedPatchIDs,
    menuItemIDs: candidate.menuItemIDs,
    reproducibleSteps: candidate.steps.map((step) => ({
      stepNumber: step.stepNumber,
      instruction: step.buttonInputSequence.trim() ? `${step.instruction.trim()} Input sequence: ${step.buttonInputSequence.trim()}` : step.instruction.trim(),
      expectedResult: step.expectedResult.trim(),
      menuItemID: candidate.menuItemIDs[step.stepNumber - 1] ?? null,
      evidenceFileIDs: step.evidenceFileIDs
    })),
    requirements: [
      {
        id: `${candidate.id}-account-requirement`,
        description: `Account requirement: ${candidate.accountRequirement}. ${candidate.accountRequirementNotes || "No extra notes."}`,
        required: candidate.accountRequirement === "required",
        evidenceFileIDs
      },
      {
        id: `${candidate.id}-online-requirement`,
        description: `Online requirement: ${candidate.onlineRequirement}. ${candidate.onlineRequirementNotes || "No extra notes."}`,
        required: candidate.onlineRequirement === "required",
        evidenceFileIDs
      }
    ],
    restrictions: candidate.restrictions.map((restriction, index) => ({
      id: `${candidate.id}-restriction-${index + 1}`,
      description: restriction,
      severity: "info",
      evidenceFileIDs
    })),
    appearanceRelevance: {
      affectsAppearance: candidate.appearanceCategoriesAvailable.length > 0,
      affectedCatalogKinds: candidate.appearanceCategoriesAvailable,
      affectedAttributeFamilies: candidate.appearanceCategoriesAvailable,
      notes: [
        `Identifier consistency: ${candidate.identifierConsistency}. ${candidate.identifierConsistencyNotes || "No identifier notes."}`,
        `Later editability: ${candidate.laterEditability}. ${candidate.laterEditabilityNotes || "No editability notes."}`,
        `Canonical score: ${evaluation.canonicalScore}. ${candidate.canonicalJustification}`
      ].join(" ")
    },
    dependencies: candidate.dependencies.map((dependency) => ({
      id: dependency.id,
      description: `${dependency.kind}: ${dependency.description}`,
      dependencyTestID: null,
      requiredCreationPathID: null,
      evidenceFileIDs: dependency.evidenceFileIDs.length > 0 ? dependency.evidenceFileIDs : evidenceFileIDs
    })),
    verificationState: "firstReviewPending",
    verificationRecordIDs: [],
    evidenceFileIDs,
    status: candidate.candidateKind === "supplemental" ? "planned" : "inAudit"
  };

  const validation = validatePhase0CreationPath(creationPath);
  return {
    creationPath: validation.ok ? creationPath : null,
    evaluation,
    errors: validation.errors.map((error) => error.message)
  };
}

export function canonicalCreationPathID(candidate: CreationPathCandidateDraft) {
  return `creation-path-${slugify(candidate.gameMode) || "mode"}-${slugify(candidate.exactPath) || "path"}-${deterministicChecksum([
    candidate.gameID,
    candidate.gameMode,
    candidate.exactPath,
    candidate.platformIDs.join(","),
    candidate.observedPatchIDs.join(",")
  ])}`;
}

function scoreCandidate(candidate: CreationPathCandidateDraft) {
  const input = candidate.canonicalScoreInput;
  const score =
    clamp(input.evidenceCompleteness) * 0.32 +
    clamp(input.reproducibility) * 0.24 +
    clamp(input.appearanceCoverage) * 0.2 +
    clamp(input.dependencyClarity) * 0.14 +
    clamp(input.laterEditabilityConfidence) * 0.1;
  return Math.round(score);
}

function chooseNextAction(input: {
  candidate: CreationPathCandidateDraft;
  blockers: string[];
  missingEvidenceStepNumbers: number[];
  missingCriticalFields: string[];
  canonicalScore: number;
}) {
  if (input.missingCriticalFields.length > 0) return `Record ${input.missingCriticalFields[0]} before scoring this path.`;
  if (input.candidate.steps.length === 0) return "Add reproducible steps with button/input sequences.";
  if (input.missingEvidenceStepNumbers.length > 0) return `Attach evidence for step ${input.missingEvidenceStepNumbers[0]}.`;
  if (isRoadToGloryCandidate(input.candidate) && input.candidate.confirmationState !== "evidenceBacked") {
    return "Confirm the proposed Road to Glory path through direct evidence before treating it as canonical.";
  }
  if (input.candidate.confirmationState !== "evidenceBacked") return "Mark the candidate evidence-backed only after direct evidence review.";
  if (input.canonicalScore < 70) return "Improve evidence completeness, reproducibility, appearance coverage, dependency clarity, or editability confidence.";
  return "Export this candidate as a non-production creation-path audit record for first review.";
}

function isRoadToGloryCandidate(candidate: CreationPathCandidateDraft) {
  return /road\s*to\s*glory/i.test([candidate.displayName, candidate.gameMode, candidate.exactPath].join(" "));
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function deterministicChecksum(values: string[]) {
  const input = values.map((value) => value.trim().toLowerCase()).join("|");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort();
}
