import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_DEPENDENCY_VARIABLES,
  addDependencyTestRun,
  createDependencyTestBaseline,
  createDependencyTestRun,
  createEmptyDependencyTestRunnerWorkspace,
  validateDependencyTestRunnerWorkspace,
  type Phase0DependencyTestBaseline,
  type Phase0DependencyTestRun,
  type Phase0DependencyTestRunnerWorkspace,
  type Phase0DependencyVariable
} from "@/lib/phase-zero/phase-zero-dependency-test-runner";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 dependency test runner", () => {
  it("documents the machine-readable runner schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/dependency-test-runner.schema.json"), "utf8"));

    for (const field of ["gameVersionID", "creationPathID", "menuMapID", "runs"]) {
      expect(schema.required).toContain(field);
    }
    for (const field of [
      "baseline",
      "changedVariable",
      "expectedBehavior",
      "observedBehavior",
      "observedChanges",
      "evidenceFileIDs",
      "result",
      "remainingUncertainty"
    ]) {
      expect(schema.$defs.run.required).toContain(field);
    }
    expect(schema.$defs.dependencyVariable.enum).toEqual(PHASE0_DEPENDENCY_VARIABLES);
  });

  it("covers every required dependency variable from the prepared matrix", () => {
    expect(PHASE0_DEPENDENCY_VARIABLES).toEqual([
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
    ]);
  });

  it("starts empty and blocks production completion until every variable is tested", () => {
    const report = validateDependencyTestRunnerWorkspace(baseWorkspace());

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.missingVariables).toEqual(PHASE0_DEPENDENCY_VARIABLES);
    expect(report.errors.map((error) => error.code)).toContain("missingDependencyVariableCoverage");
  });

  it("allows production completion only after all variables have verified resolved runs", () => {
    const workspace = workspaceWithRuns(PHASE0_DEPENDENCY_VARIABLES.map((variable, index) => completeRun(variable, index + 1)));
    const report = validateDependencyTestRunnerWorkspace(workspace);

    expect(report.ok).toBe(true);
    expect(report.productionCompletionAllowed).toBe(true);
    expect(report.missingVariables).toEqual([]);
  });

  it("rejects unresolved, unverified, or blocked runs", () => {
    const unresolved = completeRun("platform", 1);
    unresolved.result = "inconclusive";
    unresolved.runStatus = "readyForReview";
    unresolved.verificationStatus = "secondReviewPending";
    const report = validateDependencyTestRunnerWorkspace(workspaceWithRuns([unresolved]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "unresolvedDependencyResult",
      "dependencyRunNotVerified",
      "missingDependencyVariableCoverage"
    ]));
  });

  it("requires evidence-backed baseline, changed-variable observations, and uncertainty notes", () => {
    const run = completeRun("mode", 1);
    run.baseline.evidenceFileIDs = [];
    run.evidenceFileIDs = [];
    run.expectedBehavior = "";
    run.observedBehavior = "";
    run.observedChanges.countChanges = "";
    run.remainingUncertainty = "";
    const report = validateDependencyTestRunnerWorkspace(workspaceWithRuns([run]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingBaselineEvidence",
      "missingRunEvidence",
      "missingRunField",
      "missingObservedChange"
    ]));
  });

  it("rejects duplicate run numbers and unchanged variable comparisons", () => {
    const first = completeRun("platform", 1);
    const second = completeRun("mode", 1);
    second.changedVariable.fromValue = second.changedVariable.toValue;
    const report = validateDependencyTestRunnerWorkspace(workspaceWithRuns([first, second]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "duplicateRunNumber",
      "unchangedDependencyVariable"
    ]));
  });

  it("blocks baselines with unknown custom versus Legends, online, or account states", () => {
    const run = completeRun("baseType", 1);
    run.baseline.baseType = "unknown";
    run.baseline.onlineState = "unknown";
    run.baseline.eaAccountState = "unknown";
    const report = validateDependencyTestRunnerWorkspace(workspaceWithRuns([run]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "unknownBaselineBaseType",
      "unknownBaselineOnlineState",
      "unknownBaselineEAAccountState"
    ]));
  });

  it("reports differs-from-expected runs as resolved with a workflow warning", () => {
    const runs = PHASE0_DEPENDENCY_VARIABLES.map((variable, index) => completeRun(variable, index + 1));
    runs[0].result = "differsFromExpected";
    const report = validateDependencyTestRunnerWorkspace(workspaceWithRuns(runs));

    expect(report.productionCompletionAllowed).toBe(true);
    expect(report.warnings.map((warning) => warning.code)).toContain("dependencyDiffersFromExpected");
  });
});

function baseWorkspace(): Phase0DependencyTestRunnerWorkspace {
  return createEmptyDependencyTestRunnerWorkspace({
    workspaceID: "dependency-test-workspace-synthetic",
    gameID: "game-synthetic",
    gameVersionID: "version-synthetic",
    creationPathID: "creation-path-synthetic",
    menuMapID: "menu-map-synthetic",
    nowISO: now
  });
}

function workspaceWithRuns(runs: Phase0DependencyTestRun[]): Phase0DependencyTestRunnerWorkspace {
  let workspace = baseWorkspace();
  for (const run of runs) {
    workspace = addDependencyTestRun(workspace, run, now);
  }
  return workspace;
}

function completeRun(variable: Phase0DependencyVariable, runNumber: number): Phase0DependencyTestRun {
  return createDependencyTestRun({
    runID: `dependency-run-synthetic-${runNumber}`,
    runNumber,
    baseline: completeBaseline(),
    changedVariable: {
      variable,
      fromValue: `synthetic-${variable}-from`,
      toValue: `synthetic-${variable}-to`
    },
    expectedBehavior: "Synthetic expected behavior.",
    observedBehavior: "Synthetic observed behavior.",
    observedChanges: {
      countChanges: "Synthetic count observation.",
      orderChanges: "Synthetic order observation.",
      geometryChanges: "Synthetic geometry observation.",
      labelChanges: "Synthetic label observation."
    },
    evidenceFileIDs: [`evidence-run-${runNumber}`],
    result: "matchesExpected",
    remainingUncertainty: "Synthetic uncertainty recorded.",
    runStatus: "verified",
    verificationStatus: "verified",
    notes: "Synthetic dependency run.",
    nowISO: now
  });
}

function completeBaseline(): Phase0DependencyTestBaseline {
  return createDependencyTestBaseline({
    baselineID: "baseline-synthetic",
    platform: "synthetic-platform",
    mode: "synthetic-mode",
    baseType: "custom",
    position: "synthetic-position",
    archetype: "synthetic-archetype",
    height: "synthetic-height",
    weight: "synthetic-weight",
    bodyType: "synthetic-body-type",
    skinTone: "synthetic-skin-presentation",
    headStableID: null,
    hairstyleStableID: null,
    onlineState: "offline",
    eaAccountState: "notRequired",
    edition: "synthetic-edition",
    entitlements: ["synthetic-entitlement-state"],
    patchID: "patch-synthetic",
    evidenceFileIDs: ["evidence-baseline-synthetic"],
    notes: "Synthetic baseline."
  });
}
