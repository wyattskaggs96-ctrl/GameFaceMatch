import type { ISODateString } from "@/types/domain";
import type { Phase0EAAccountState, Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";

export const PHASE0_DEPENDENCY_TEST_RUNNER_SCHEMA_VERSION = "phase0-dependency-test-runner-v1";

export type Phase0DependencyVariable =
  | "platform"
  | "mode"
  | "baseType"
  | "position"
  | "archetype"
  | "height"
  | "weight"
  | "bodyType"
  | "skinTone"
  | "head"
  | "hairstyle"
  | "onlineState"
  | "eaAccountState"
  | "edition"
  | "entitlements"
  | "patch";

export type Phase0DependencyBaseType = "unknown" | "custom" | "legends";
export type Phase0DependencyOnlineState = "unknown" | "online" | "offline";
export type Phase0DependencyChangeState = "notChecked" | "noChange" | "changed" | "unknown";
export type Phase0DependencyTestResult = "notRun" | "matchesExpected" | "differsFromExpected" | "inconclusive" | "blocked";
export type Phase0DependencyRunStatus = "draft" | "readyForReview" | "verified" | "blocked" | "retestRequired";

export const PHASE0_DEPENDENCY_VARIABLES: Phase0DependencyVariable[] = [
  "platform",
  "mode",
  "baseType",
  "position",
  "archetype",
  "height",
  "weight",
  "bodyType",
  "skinTone",
  "head",
  "hairstyle",
  "onlineState",
  "eaAccountState",
  "edition",
  "entitlements",
  "patch"
];

export interface Phase0DependencyTestBaseline {
  baselineID: Phase0EntityID;
  platform: string;
  mode: string;
  baseType: Phase0DependencyBaseType;
  position: string;
  archetype: string;
  height: string;
  weight: string;
  bodyType: string;
  skinTone: string;
  headStableID: string | null;
  hairstyleStableID: string | null;
  onlineState: Phase0DependencyOnlineState;
  eaAccountState: Phase0EAAccountState;
  edition: string;
  entitlements: string[];
  patchID: Phase0EntityID;
  evidenceFileIDs: Phase0EntityID[];
  notes: string;
}

export interface Phase0DependencyChangedVariable {
  variable: Phase0DependencyVariable;
  fromValue: string;
  toValue: string;
}

export interface Phase0DependencyObservedChanges {
  countChanges: string;
  orderChanges: string;
  geometryChanges: string;
  labelChanges: string;
}

export interface Phase0DependencyTestRun {
  runID: Phase0EntityID;
  runNumber: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  baseline: Phase0DependencyTestBaseline;
  changedVariable: Phase0DependencyChangedVariable;
  expectedBehavior: string;
  observedBehavior: string;
  observedChanges: Phase0DependencyObservedChanges;
  evidenceFileIDs: Phase0EntityID[];
  result: Phase0DependencyTestResult;
  remainingUncertainty: string;
  runStatus: Phase0DependencyRunStatus;
  verificationStatus: Phase0VerificationState;
  notes: string;
}

export interface Phase0DependencyTestRunnerWorkspace {
  schemaVersion: typeof PHASE0_DEPENDENCY_TEST_RUNNER_SCHEMA_VERSION;
  workspaceID: Phase0EntityID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  gameID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  menuMapID: Phase0EntityID;
  runs: Phase0DependencyTestRun[];
}

export interface Phase0DependencyTestRunnerIssue {
  code: string;
  message: string;
  runID?: Phase0EntityID;
}

export interface Phase0DependencyTestRunnerValidationReport {
  ok: boolean;
  errors: Phase0DependencyTestRunnerIssue[];
  warnings: Phase0DependencyTestRunnerIssue[];
  testedVariables: Phase0DependencyVariable[];
  missingVariables: Phase0DependencyVariable[];
  productionCompletionAllowed: boolean;
}

export function createEmptyDependencyTestRunnerWorkspace({
  workspaceID,
  gameID,
  gameVersionID,
  creationPathID,
  menuMapID,
  nowISO
}: {
  workspaceID: Phase0EntityID;
  gameID: Phase0EntityID;
  gameVersionID: Phase0EntityID;
  creationPathID: Phase0EntityID;
  menuMapID: Phase0EntityID;
  nowISO: ISODateString;
}): Phase0DependencyTestRunnerWorkspace {
  return {
    schemaVersion: PHASE0_DEPENDENCY_TEST_RUNNER_SCHEMA_VERSION,
    workspaceID,
    createdAt: nowISO,
    updatedAt: nowISO,
    gameID,
    gameVersionID,
    creationPathID,
    menuMapID,
    runs: []
  };
}

export function createDependencyTestBaseline({
  baselineID,
  platform,
  mode,
  baseType,
  position,
  archetype,
  height,
  weight,
  bodyType,
  skinTone,
  headStableID,
  hairstyleStableID,
  onlineState,
  eaAccountState,
  edition,
  entitlements,
  patchID,
  evidenceFileIDs,
  notes
}: Phase0DependencyTestBaseline): Phase0DependencyTestBaseline {
  return {
    baselineID: baselineID.trim(),
    platform: platform.trim(),
    mode: mode.trim(),
    baseType,
    position: position.trim(),
    archetype: archetype.trim(),
    height: height.trim(),
    weight: weight.trim(),
    bodyType: bodyType.trim(),
    skinTone: skinTone.trim(),
    headStableID: trimNullable(headStableID),
    hairstyleStableID: trimNullable(hairstyleStableID),
    onlineState,
    eaAccountState,
    edition: edition.trim(),
    entitlements: uniqueList(entitlements),
    patchID: patchID.trim(),
    evidenceFileIDs: uniqueList(evidenceFileIDs),
    notes: notes.trim()
  };
}

export function createDependencyTestRun({
  runID,
  runNumber,
  baseline,
  changedVariable,
  expectedBehavior,
  observedBehavior,
  observedChanges,
  evidenceFileIDs,
  result,
  remainingUncertainty,
  runStatus,
  verificationStatus,
  notes,
  nowISO
}: {
  runID: Phase0EntityID;
  runNumber: number;
  baseline: Phase0DependencyTestBaseline;
  changedVariable: Phase0DependencyChangedVariable;
  expectedBehavior: string;
  observedBehavior: string;
  observedChanges: Phase0DependencyObservedChanges;
  evidenceFileIDs: Phase0EntityID[];
  result: Phase0DependencyTestResult;
  remainingUncertainty: string;
  runStatus: Phase0DependencyRunStatus;
  verificationStatus: Phase0VerificationState;
  notes: string;
  nowISO: ISODateString;
}): Phase0DependencyTestRun {
  return {
    runID: runID.trim(),
    runNumber,
    createdAt: nowISO,
    updatedAt: nowISO,
    baseline: createDependencyTestBaseline(baseline),
    changedVariable: {
      variable: changedVariable.variable,
      fromValue: changedVariable.fromValue.trim(),
      toValue: changedVariable.toValue.trim()
    },
    expectedBehavior: expectedBehavior.trim(),
    observedBehavior: observedBehavior.trim(),
    observedChanges: {
      countChanges: observedChanges.countChanges.trim(),
      orderChanges: observedChanges.orderChanges.trim(),
      geometryChanges: observedChanges.geometryChanges.trim(),
      labelChanges: observedChanges.labelChanges.trim()
    },
    evidenceFileIDs: uniqueList(evidenceFileIDs),
    result,
    remainingUncertainty: remainingUncertainty.trim(),
    runStatus,
    verificationStatus,
    notes: notes.trim()
  };
}

export function addDependencyTestRun(
  workspace: Phase0DependencyTestRunnerWorkspace,
  run: Phase0DependencyTestRun,
  updatedAt: ISODateString
): Phase0DependencyTestRunnerWorkspace {
  return {
    ...workspace,
    updatedAt,
    runs: [...workspace.runs, run].sort((first, second) => first.runNumber - second.runNumber)
  };
}

export function validateDependencyTestRunnerWorkspace(
  workspace: Phase0DependencyTestRunnerWorkspace
): Phase0DependencyTestRunnerValidationReport {
  const errors: Phase0DependencyTestRunnerIssue[] = [];
  const warnings: Phase0DependencyTestRunnerIssue[] = [];

  if (workspace.schemaVersion !== PHASE0_DEPENDENCY_TEST_RUNNER_SCHEMA_VERSION) {
    errors.push(issue("invalidSchemaVersion", `Expected ${PHASE0_DEPENDENCY_TEST_RUNNER_SCHEMA_VERSION}.`));
  }
  for (const [field, value] of [
    ["workspaceID", workspace.workspaceID],
    ["gameID", workspace.gameID],
    ["gameVersionID", workspace.gameVersionID],
    ["creationPathID", workspace.creationPathID],
    ["menuMapID", workspace.menuMapID]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingWorkspaceMetadata", `Dependency test runner requires ${field}.`));
  }

  validateRuns(workspace.runs, errors, warnings);
  const testedVariables = variablesWithResolvedRuns(workspace.runs);
  const missingVariables = PHASE0_DEPENDENCY_VARIABLES.filter((variable) => !testedVariables.includes(variable));
  if (missingVariables.length > 0) {
    errors.push(issue("missingDependencyVariableCoverage", `Missing dependency tests for: ${missingVariables.join(", ")}.`));
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    testedVariables,
    missingVariables,
    productionCompletionAllowed: errors.length === 0 && workspace.runs.length >= PHASE0_DEPENDENCY_VARIABLES.length
  };
}

function validateRuns(
  runs: Phase0DependencyTestRun[],
  errors: Phase0DependencyTestRunnerIssue[],
  warnings: Phase0DependencyTestRunnerIssue[]
) {
  const runNumbers = new Set<number>();
  const runIDs = new Set<string>();
  for (const run of runs) {
    if (!hasUsableText(run.runID)) {
      errors.push(issue("missingRunID", "Dependency test run requires a runID."));
    } else if (runIDs.has(run.runID)) {
      errors.push(issue("duplicateRunID", `Duplicate dependency test run ID ${run.runID}.`, run.runID));
    }
    runIDs.add(run.runID);
    if (!Number.isInteger(run.runNumber) || run.runNumber < 1) {
      errors.push(issue("invalidRunNumber", `${run.runID} requires a positive runNumber.`, run.runID));
    } else if (runNumbers.has(run.runNumber)) {
      errors.push(issue("duplicateRunNumber", `Duplicate dependency test run number ${run.runNumber}.`, run.runID));
    }
    runNumbers.add(run.runNumber);

    validateBaseline(run, errors);
    validateChangedVariable(run, errors);
    validateResult(run, errors, warnings);
    validateObservedChanges(run, errors);

    for (const [field, value] of [
      ["expectedBehavior", run.expectedBehavior],
      ["observedBehavior", run.observedBehavior],
      ["remainingUncertainty", run.remainingUncertainty],
      ["notes", run.notes]
    ] as const) {
      if (!hasUsableText(value)) errors.push(issue("missingRunField", `${run.runID} requires ${field}.`, run.runID));
    }
    if (run.evidenceFileIDs.length === 0) {
      errors.push(issue("missingRunEvidence", `${run.runID} requires evidence references for the changed variable.`, run.runID));
    }
  }
}

function validateBaseline(run: Phase0DependencyTestRun, errors: Phase0DependencyTestRunnerIssue[]) {
  const baseline = run.baseline;
  for (const [field, value] of [
    ["baselineID", baseline.baselineID],
    ["platform", baseline.platform],
    ["mode", baseline.mode],
    ["position", baseline.position],
    ["archetype", baseline.archetype],
    ["height", baseline.height],
    ["weight", baseline.weight],
    ["bodyType", baseline.bodyType],
    ["skinTone", baseline.skinTone],
    ["edition", baseline.edition],
    ["patchID", baseline.patchID],
    ["notes", baseline.notes]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingBaselineField", `${run.runID} baseline requires ${field}.`, run.runID));
  }
  if (baseline.baseType === "unknown") {
    errors.push(issue("unknownBaselineBaseType", `${run.runID} baseline must identify custom versus Legends base.`, run.runID));
  }
  if (baseline.onlineState === "unknown") {
    errors.push(issue("unknownBaselineOnlineState", `${run.runID} baseline must identify online/offline state.`, run.runID));
  }
  if (baseline.eaAccountState === "unknown") {
    errors.push(issue("unknownBaselineEAAccountState", `${run.runID} baseline must identify EA account state.`, run.runID));
  }
  if (baseline.evidenceFileIDs.length === 0) {
    errors.push(issue("missingBaselineEvidence", `${run.runID} baseline requires evidence references.`, run.runID));
  }
}

function validateChangedVariable(run: Phase0DependencyTestRun, errors: Phase0DependencyTestRunnerIssue[]) {
  const changedVariable = run.changedVariable;
  if (!PHASE0_DEPENDENCY_VARIABLES.includes(changedVariable.variable)) {
    errors.push(issue("unsupportedDependencyVariable", `${run.runID} uses unsupported dependency variable.`, run.runID));
  }
  if (!hasUsableText(changedVariable.fromValue) || !hasUsableText(changedVariable.toValue)) {
    errors.push(issue("missingChangedVariableValue", `${run.runID} requires fromValue and toValue.`, run.runID));
  }
  if (changedVariable.fromValue === changedVariable.toValue) {
    errors.push(issue("unchangedDependencyVariable", `${run.runID} changed variable must compare different values.`, run.runID));
  }
}

function validateResult(
  run: Phase0DependencyTestRun,
  errors: Phase0DependencyTestRunnerIssue[],
  warnings: Phase0DependencyTestRunnerIssue[]
) {
  if (run.result === "notRun" || run.result === "inconclusive" || run.result === "blocked") {
    errors.push(issue("unresolvedDependencyResult", `${run.runID} result must be resolved before production completion.`, run.runID));
  }
  if (run.runStatus !== "verified" || run.verificationStatus !== "verified") {
    errors.push(issue("dependencyRunNotVerified", `${run.runID} requires verified run status and verification status.`, run.runID));
  }
  if (run.result === "differsFromExpected") {
    warnings.push(issue("dependencyDiffersFromExpected", `${run.runID} differs from expected behavior and may require catalog workflow updates.`, run.runID));
  }
}

function validateObservedChanges(run: Phase0DependencyTestRun, errors: Phase0DependencyTestRunnerIssue[]) {
  for (const [field, value] of [
    ["countChanges", run.observedChanges.countChanges],
    ["orderChanges", run.observedChanges.orderChanges],
    ["geometryChanges", run.observedChanges.geometryChanges],
    ["labelChanges", run.observedChanges.labelChanges]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingObservedChange", `${run.runID} requires ${field}.`, run.runID));
  }
}

function variablesWithResolvedRuns(runs: Phase0DependencyTestRun[]): Phase0DependencyVariable[] {
  const testedVariables = new Set<Phase0DependencyVariable>();
  for (const run of runs) {
    if (
      PHASE0_DEPENDENCY_VARIABLES.includes(run.changedVariable.variable) &&
      (run.result === "matchesExpected" || run.result === "differsFromExpected") &&
      run.runStatus === "verified" &&
      run.verificationStatus === "verified"
    ) {
      testedVariables.add(run.changedVariable.variable);
    }
  }
  return PHASE0_DEPENDENCY_VARIABLES.filter((variable) => testedVariables.has(variable));
}

function trimNullable(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function issue(code: string, message: string, runID?: Phase0EntityID): Phase0DependencyTestRunnerIssue {
  return { code, message, runID };
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
