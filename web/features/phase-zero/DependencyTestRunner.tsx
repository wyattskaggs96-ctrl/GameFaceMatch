"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, ProgressBar, SelectField, StatusBadge, TextField } from "@/components/design-system";
import {
  PHASE0_DEPENDENCY_VARIABLES,
  addDependencyTestRun,
  createDependencyTestRun,
  createEmptyDependencyTestRunnerWorkspace,
  validateDependencyTestRunnerWorkspace,
  type Phase0DependencyBaseType,
  type Phase0DependencyOnlineState,
  type Phase0DependencyTestResult,
  type Phase0DependencyVariable,
  type Phase0DependencyRunStatus
} from "@/lib/phase-zero/phase-zero-dependency-test-runner";
import type { Phase0EAAccountState, Phase0VerificationState } from "@/lib/phase-zero/phase-zero-domain";

interface DependencyTestDraft {
  baselineID: string;
  platform: string;
  mode: string;
  baseType: Phase0DependencyBaseType;
  position: string;
  archetype: string;
  height: string;
  weight: string;
  bodyType: string;
  skinTone: string;
  headStableID: string;
  hairstyleStableID: string;
  onlineState: Phase0DependencyOnlineState;
  eaAccountState: Phase0EAAccountState;
  edition: string;
  entitlements: string;
  patchID: string;
  baselineEvidenceFileIDs: string;
  baselineNotes: string;
  variable: Phase0DependencyVariable;
  fromValue: string;
  toValue: string;
  expectedBehavior: string;
  observedBehavior: string;
  countChanges: string;
  orderChanges: string;
  geometryChanges: string;
  labelChanges: string;
  evidenceFileIDs: string;
  result: Phase0DependencyTestResult;
  remainingUncertainty: string;
  runStatus: Phase0DependencyRunStatus;
  verificationStatus: Phase0VerificationState;
  notes: string;
}

const initialDraft: DependencyTestDraft = {
  baselineID: "synthetic-baseline-draft",
  platform: "SYNTHETIC_PLATFORM",
  mode: "SYNTHETIC_MODE",
  baseType: "custom",
  position: "SYNTHETIC_POSITION",
  archetype: "SYNTHETIC_ARCHETYPE",
  height: "SYNTHETIC_HEIGHT",
  weight: "SYNTHETIC_WEIGHT",
  bodyType: "SYNTHETIC_BODY_TYPE",
  skinTone: "SYNTHETIC_SKIN_PRESENTATION",
  headStableID: "",
  hairstyleStableID: "",
  onlineState: "offline",
  eaAccountState: "notRequired",
  edition: "SYNTHETIC_EDITION",
  entitlements: "synthetic-entitlement-state",
  patchID: "synthetic-patch",
  baselineEvidenceFileIDs: "synthetic-baseline-evidence",
  baselineNotes: "Synthetic baseline draft. Replace with direct shipping-game evidence before production use.",
  variable: "platform",
  fromValue: "synthetic-from-state",
  toValue: "synthetic-to-state",
  expectedBehavior: "Synthetic expected behavior entry for test-run structure only.",
  observedBehavior: "Synthetic observed behavior entry for test-run structure only.",
  countChanges: "Synthetic count observation.",
  orderChanges: "Synthetic order observation.",
  geometryChanges: "Synthetic geometry observation.",
  labelChanges: "Synthetic label observation.",
  evidenceFileIDs: "synthetic-run-evidence",
  result: "matchesExpected",
  remainingUncertainty: "Synthetic remaining uncertainty note.",
  runStatus: "verified",
  verificationStatus: "verified",
  notes: "Research draft; no game option is created by this run."
};

const baseTypes: Phase0DependencyBaseType[] = ["custom", "legends", "unknown"];
const onlineStates: Phase0DependencyOnlineState[] = ["online", "offline", "unknown"];
const eaAccountStates: Phase0EAAccountState[] = ["signedIn", "signedOut", "notRequired", "unknown"];
const resultStates: Phase0DependencyTestResult[] = ["matchesExpected", "differsFromExpected", "inconclusive", "blocked", "notRun"];
const runStatuses: Phase0DependencyRunStatus[] = ["verified", "readyForReview", "draft", "blocked", "retestRequired"];
const verificationStates: Phase0VerificationState[] = ["verified", "secondReviewPending", "firstReviewApproved", "firstReviewPending", "draft", "rejected", "retired"];

export function DependencyTestRunner() {
  const [workspace, setWorkspace] = useState(() =>
    createEmptyDependencyTestRunnerWorkspace({
      workspaceID: "cf27-dependency-test-runner-draft",
      gameID: "college-football-27",
      gameVersionID: "unconfirmed-game-version",
      creationPathID: "unconfirmed-creation-path",
      menuMapID: "cf27-menu-map-draft",
      nowISO: new Date().toISOString()
    })
  );
  const [draft, setDraft] = useState<DependencyTestDraft>(initialDraft);
  const validation = useMemo(() => validateDependencyTestRunnerWorkspace(workspace), [workspace]);
  const nextRunNumber = workspace.runs.length + 1;

  function updateDraft<Key extends keyof DependencyTestDraft>(key: Key, value: DependencyTestDraft[Key]) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  function addRun() {
    const nowISO = new Date().toISOString();
    const run = createDependencyTestRun({
      runID: `dependency-run-${nextRunNumber}`,
      runNumber: nextRunNumber,
      baseline: {
        baselineID: draft.baselineID,
        platform: draft.platform,
        mode: draft.mode,
        baseType: draft.baseType,
        position: draft.position,
        archetype: draft.archetype,
        height: draft.height,
        weight: draft.weight,
        bodyType: draft.bodyType,
        skinTone: draft.skinTone,
        headStableID: draft.headStableID || null,
        hairstyleStableID: draft.hairstyleStableID || null,
        onlineState: draft.onlineState,
        eaAccountState: draft.eaAccountState,
        edition: draft.edition,
        entitlements: splitList(draft.entitlements),
        patchID: draft.patchID,
        evidenceFileIDs: splitList(draft.baselineEvidenceFileIDs),
        notes: draft.baselineNotes
      },
      changedVariable: {
        variable: draft.variable,
        fromValue: draft.fromValue,
        toValue: draft.toValue
      },
      expectedBehavior: draft.expectedBehavior,
      observedBehavior: draft.observedBehavior,
      observedChanges: {
        countChanges: draft.countChanges,
        orderChanges: draft.orderChanges,
        geometryChanges: draft.geometryChanges,
        labelChanges: draft.labelChanges
      },
      evidenceFileIDs: splitList(draft.evidenceFileIDs),
      result: draft.result,
      remainingUncertainty: draft.remainingUncertainty,
      runStatus: draft.runStatus,
      verificationStatus: draft.verificationStatus,
      notes: draft.notes,
      nowISO
    });
    setWorkspace((currentWorkspace) => addDependencyTestRun(currentWorkspace, run, nowISO));
    setDraft((currentDraft) => ({
      ...currentDraft,
      variable: nextUntestedVariable([...workspace.runs.map((item) => item.changedVariable.variable), currentDraft.variable]),
      fromValue: "synthetic-from-state",
      toValue: "synthetic-to-state",
      expectedBehavior: "Synthetic expected behavior entry for test-run structure only.",
      observedBehavior: "Synthetic observed behavior entry for test-run structure only.",
      countChanges: "Synthetic count observation.",
      orderChanges: "Synthetic order observation.",
      geometryChanges: "Synthetic geometry observation.",
      labelChanges: "Synthetic label observation.",
      evidenceFileIDs: "synthetic-run-evidence",
      result: "matchesExpected",
      remainingUncertainty: "Synthetic remaining uncertainty note.",
      runStatus: "verified",
      verificationStatus: "verified",
      notes: "Research draft; no game option is created by this run."
    }));
  }

  return (
    <section className="screen-stack" aria-labelledby="dependency-test-runner-title">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2 id="dependency-test-runner-title">Dependency test runner</h2>
        </div>
        <StatusBadge tone={validation.productionCompletionAllowed ? "success" : "danger"}>
          {validation.productionCompletionAllowed ? "production complete" : "production blocked"}
        </StatusBadge>
      </div>
      <p className="supporting">
        Record one changed variable at a time so platform, mode, base type, player attributes, account state, entitlements, and patch dependencies can
        be reviewed without inventing any College Football 27 options.
      </p>
      <Alert title="Evidence required" tone="warning" role="alert">
        Dependency tests are production-blocking until every required variable has verified baseline evidence, changed-variable evidence, observations,
        and remaining-uncertainty notes.
      </Alert>
      <Card>
        <ProgressBar
          value={validation.testedVariables.length}
          max={PHASE0_DEPENDENCY_VARIABLES.length}
          label="Dependency variables covered"
        />
        <p className="supporting">
          Missing: {validation.missingVariables.length > 0 ? validation.missingVariables.join(", ") : "none"}.
        </p>
      </Card>
      <div className="card-grid">
        <Card>
          <h3>Baseline</h3>
          <div className="form-stack">
            <TextField label="Baseline ID" value={draft.baselineID} onChange={(event) => updateDraft("baselineID", event.currentTarget.value)} />
            <TextField label="Platform" value={draft.platform} onChange={(event) => updateDraft("platform", event.currentTarget.value)} />
            <TextField label="Mode" value={draft.mode} onChange={(event) => updateDraft("mode", event.currentTarget.value)} />
            <SelectField label="Custom versus Legends base" value={draft.baseType} onChange={(event) => updateDraft("baseType", event.currentTarget.value as Phase0DependencyBaseType)}>
              {baseTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Position" value={draft.position} onChange={(event) => updateDraft("position", event.currentTarget.value)} />
            <TextField label="Archetype" value={draft.archetype} onChange={(event) => updateDraft("archetype", event.currentTarget.value)} />
            <TextField label="Height" value={draft.height} onChange={(event) => updateDraft("height", event.currentTarget.value)} />
            <TextField label="Weight" value={draft.weight} onChange={(event) => updateDraft("weight", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Baseline context</h3>
          <div className="form-stack">
            <TextField label="Body type" value={draft.bodyType} onChange={(event) => updateDraft("bodyType", event.currentTarget.value)} />
            <TextField label="Skin presentation" value={draft.skinTone} onChange={(event) => updateDraft("skinTone", event.currentTarget.value)} />
            <TextField label="Head stable ID" value={draft.headStableID} onChange={(event) => updateDraft("headStableID", event.currentTarget.value)} note="Leave blank until a verified catalog ID exists." />
            <TextField label="Hairstyle stable ID" value={draft.hairstyleStableID} onChange={(event) => updateDraft("hairstyleStableID", event.currentTarget.value)} note="Leave blank until a verified catalog ID exists." />
            <SelectField label="Online state" value={draft.onlineState} onChange={(event) => updateDraft("onlineState", event.currentTarget.value as Phase0DependencyOnlineState)}>
              {onlineStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="EA account state" value={draft.eaAccountState} onChange={(event) => updateDraft("eaAccountState", event.currentTarget.value as Phase0EAAccountState)}>
              {eaAccountStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Edition" value={draft.edition} onChange={(event) => updateDraft("edition", event.currentTarget.value)} />
            <TextField label="Entitlements" value={draft.entitlements} onChange={(event) => updateDraft("entitlements", event.currentTarget.value)} note="Comma-separated observed entitlement states." />
            <TextField label="Patch ID" value={draft.patchID} onChange={(event) => updateDraft("patchID", event.currentTarget.value)} />
            <TextField label="Baseline evidence IDs" value={draft.baselineEvidenceFileIDs} onChange={(event) => updateDraft("baselineEvidenceFileIDs", event.currentTarget.value)} />
            <TextField label="Baseline notes" value={draft.baselineNotes} onChange={(event) => updateDraft("baselineNotes", event.currentTarget.value)} />
          </div>
        </Card>
      </div>
      <div className="card-grid">
        <Card>
          <h3>Changed variable</h3>
          <div className="form-stack">
            <SelectField label="Variable under test" value={draft.variable} onChange={(event) => updateDraft("variable", event.currentTarget.value as Phase0DependencyVariable)}>
              {PHASE0_DEPENDENCY_VARIABLES.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="From value" value={draft.fromValue} onChange={(event) => updateDraft("fromValue", event.currentTarget.value)} />
            <TextField label="To value" value={draft.toValue} onChange={(event) => updateDraft("toValue", event.currentTarget.value)} />
            <TextField label="Expected behavior" value={draft.expectedBehavior} onChange={(event) => updateDraft("expectedBehavior", event.currentTarget.value)} />
            <TextField label="Observed behavior" value={draft.observedBehavior} onChange={(event) => updateDraft("observedBehavior", event.currentTarget.value)} />
            <TextField label="Changed-variable evidence IDs" value={draft.evidenceFileIDs} onChange={(event) => updateDraft("evidenceFileIDs", event.currentTarget.value)} />
          </div>
        </Card>
        <Card>
          <h3>Observed differences</h3>
          <div className="form-stack">
            <TextField label="Count changes" value={draft.countChanges} onChange={(event) => updateDraft("countChanges", event.currentTarget.value)} />
            <TextField label="Order changes" value={draft.orderChanges} onChange={(event) => updateDraft("orderChanges", event.currentTarget.value)} />
            <TextField label="Geometry changes" value={draft.geometryChanges} onChange={(event) => updateDraft("geometryChanges", event.currentTarget.value)} />
            <TextField label="Label changes" value={draft.labelChanges} onChange={(event) => updateDraft("labelChanges", event.currentTarget.value)} />
            <SelectField label="Result" value={draft.result} onChange={(event) => updateDraft("result", event.currentTarget.value as Phase0DependencyTestResult)}>
              {resultStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Remaining uncertainty" value={draft.remainingUncertainty} onChange={(event) => updateDraft("remainingUncertainty", event.currentTarget.value)} />
            <SelectField label="Run status" value={draft.runStatus} onChange={(event) => updateDraft("runStatus", event.currentTarget.value as Phase0DependencyRunStatus)}>
              {runStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="Verification status" value={draft.verificationStatus} onChange={(event) => updateDraft("verificationStatus", event.currentTarget.value as Phase0VerificationState)}>
              {verificationStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <TextField label="Notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.currentTarget.value)} />
            <Button onClick={addRun}>Add dependency run</Button>
          </div>
        </Card>
      </div>
      <Card tone={validation.errors.length > 0 ? "danger" : "success"}>
        <h3>Validation report</h3>
        {validation.errors.length === 0 ? (
          <p className="supporting">All dependency test gates are currently satisfied.</p>
        ) : (
          <ul className="compact-list">
            {validation.errors.slice(0, 8).map((error) => (
              <li key={`${error.code}-${error.runID ?? error.message}`}>{error.message}</li>
            ))}
          </ul>
        )}
        {validation.warnings.length > 0 ? (
          <ul className="compact-list">
            {validation.warnings.slice(0, 4).map((warning) => (
              <li key={`${warning.code}-${warning.runID ?? warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        ) : null}
      </Card>
      <div className="result-grid">
        {workspace.runs.map((run) => (
          <Card key={run.runID}>
            <div className="status-row">
              <h3>Run {run.runNumber}</h3>
              <StatusBadge tone={run.runStatus === "verified" && run.verificationStatus === "verified" ? "success" : "warning"}>
                {run.changedVariable.variable}
              </StatusBadge>
            </div>
            <dl className="metadata-list">
              <div>
                <dt>From</dt>
                <dd>{run.changedVariable.fromValue}</dd>
              </div>
              <div>
                <dt>To</dt>
                <dd>{run.changedVariable.toValue}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>{run.result}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{run.evidenceFileIDs.join(", ")}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </section>
  );
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function nextUntestedVariable(testedVariables: Phase0DependencyVariable[]) {
  return PHASE0_DEPENDENCY_VARIABLES.find((variable) => !testedVariables.includes(variable)) ?? "platform";
}
