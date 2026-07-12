"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, ProgressBar, ScreenHeader, SelectField, StatusBadge, TextField } from "@/components/design-system";
import { createBrowserPhase0AuditStore, createMemoryPhase0AuditStore, type Phase0AuditStore } from "@/lib/phase-zero/phase-zero-audit-store";
import {
  buildCreationPathFromCandidate,
  createCreationPathCandidateDraft,
  createCreationPathStepDraft,
  evaluateCreationPathCandidate,
  type CreationPathAuditStepDraft,
  type CreationPathCandidateDraft,
  type CreationPathDependencyDraft
} from "@/lib/phase-zero/phase-zero-creation-path-workspace";
import type { Phase0CatalogItemKind } from "@/lib/phase-zero/phase-zero-domain";

const appearanceKinds: Phase0CatalogItemKind[] = ["head", "hairstyle", "facialHair", "additionalAttribute"];

export function CreationPathAuditWorkspace({ store }: { store?: Phase0AuditStore }) {
  const auditStore = useMemo(() => store ?? createDefaultStore(), [store]);
  const [candidate, setCandidate] = useState<CreationPathCandidateDraft>(() => createCreationPathCandidateDraft("creation-path-candidate-1"));
  const [savedCreationPathID, setSavedCreationPathID] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(() => auditStore.listCreationPaths().length);
  const evaluation = evaluateCreationPathCandidate(candidate);

  function update<K extends keyof CreationPathCandidateDraft>(field: K, value: CreationPathCandidateDraft[K]) {
    setCandidate((current) => ({ ...current, [field]: value, updatedAt: new Date().toISOString() }));
    setSavedCreationPathID(null);
    setSaveErrors([]);
  }

  function updateStep(stepNumber: number, nextStep: Partial<CreationPathAuditStepDraft>) {
    update(
      "steps",
      candidate.steps.map((step) => (step.stepNumber === stepNumber ? { ...step, ...nextStep } : step))
    );
  }

  function addStep() {
    update("steps", [...candidate.steps, createCreationPathStepDraft(candidate.steps.length + 1)]);
  }

  function updateDependencyNotes(value: string) {
    const dependencies: CreationPathDependencyDraft[] = splitLines(value).map((description, index) => ({
      id: `${candidate.id}-dependency-${index + 1}`,
      kind: inferDependencyKind(description),
      description,
      evidenceFileIDs: candidate.steps.flatMap((step) => step.evidenceFileIDs)
    }));
    update("dependencies", dependencies);
  }

  function toggleAppearanceKind(kind: Phase0CatalogItemKind) {
    const next = candidate.appearanceCategoriesAvailable.includes(kind)
      ? candidate.appearanceCategoriesAvailable.filter((item) => item !== kind)
      : [...candidate.appearanceCategoriesAvailable, kind];
    update("appearanceCategoriesAvailable", next);
  }

  function saveCreationPath() {
    const result = buildCreationPathFromCandidate(candidate);
    if (!result.creationPath) {
      setSaveErrors(result.errors);
      return;
    }
    const validation = auditStore.saveCreationPath(result.creationPath);
    if (!validation.ok) {
      setSaveErrors(validation.errors.map((error) => error.message));
      return;
    }
    setSavedCreationPathID(result.creationPath.id);
    setSavedCount(auditStore.listCreationPaths().length);
    setSaveErrors([]);
  }

  return (
    <section className="screen-stack" aria-labelledby="creation-path-workspace-title">
      <ScreenHeader eyebrow="Development-only path audit" title="Creation-path audit workspace" id="creation-path-workspace-title">
        <p>
          Investigate candidate player-creation and appearance-editing paths. Every path is a non-production research draft until direct evidence,
          reproducible steps, and review gates confirm it.
        </p>
      </ScreenHeader>
      <Alert title={evaluation.canExportCreationPath ? "Candidate ready for first review" : "Candidate blocked"} tone={evaluation.canExportCreationPath ? "success" : "danger"}>
        {evaluation.nextAction}
      </Alert>
      <div className="card-grid">
        <Card>
          <div className="status-row">
            <h2>Canonical-path score</h2>
            <StatusBadge tone={evaluation.canExportCreationPath ? "success" : "warning"}>{evaluation.canonicalScore}/100</StatusBadge>
          </div>
          <ProgressBar value={evaluation.canonicalScore} max={100} label="Canonical-path score" />
          <dl className="metadata-list">
            <div>
              <dt>Data class</dt>
              <dd>Research draft</dd>
            </div>
            <div>
              <dt>Saved creation paths</dt>
              <dd>{savedCount}</dd>
            </div>
          </dl>
        </Card>
        <Card tone={evaluation.blockers.length > 0 ? "danger" : "success"}>
          <h2>Blocked states</h2>
          {evaluation.blockers.length === 0 ? (
            <p className="supporting">No blockers detected for this candidate.</p>
          ) : (
            <ul className="compact-list">
              {evaluation.blockers.slice(0, 5).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2>Warnings</h2>
          {evaluation.warnings.length === 0 ? (
            <p className="supporting">No warnings.</p>
          ) : (
            <ul className="compact-list">
              {evaluation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <h2>Candidate path</h2>
        <div className="form-grid">
          <TextField label="Display name" value={candidate.displayName} onChange={(event) => update("displayName", event.currentTarget.value)} />
          <TextField label="Game mode" value={candidate.gameMode} onChange={(event) => update("gameMode", event.currentTarget.value)} />
          <TextField label="Exact path" value={candidate.exactPath} onChange={(event) => update("exactPath", event.currentTarget.value)} />
          <TextField label="Platform IDs" value={candidate.platformIDs.join(", ")} onChange={(event) => update("platformIDs", splitTokens(event.currentTarget.value))} />
          <TextField label="Observed patch IDs" value={candidate.observedPatchIDs.join(", ")} onChange={(event) => update("observedPatchIDs", splitTokens(event.currentTarget.value))} />
          <TextField label="Menu item IDs" value={candidate.menuItemIDs.join(", ")} onChange={(event) => update("menuItemIDs", splitTokens(event.currentTarget.value))} />
          <SelectField label="Candidate kind" value={candidate.candidateKind} onChange={(event) => update("candidateKind", event.currentTarget.value as typeof candidate.candidateKind)}>
            <option value="primaryCandidate">primaryCandidate</option>
            <option value="supplemental">supplemental</option>
          </SelectField>
          <SelectField label="Confirmation state" value={candidate.confirmationState} onChange={(event) => update("confirmationState", event.currentTarget.value as typeof candidate.confirmationState)}>
            {["draft", "provisional", "evidenceBacked", "rejected"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
        </div>
        {/road\s*to\s*glory/i.test(`${candidate.displayName} ${candidate.gameMode} ${candidate.exactPath}`) && candidate.confirmationState !== "evidenceBacked" ? (
          <Alert title="Road to Glory remains provisional" tone="warning">
            Do not treat this path as confirmed until direct evidence supports every step.
          </Alert>
        ) : null}
      </Card>
      <Card>
        <h2>Requirements and dependencies</h2>
        <div className="form-grid">
          <SelectField label="Account requirement" value={candidate.accountRequirement} onChange={(event) => update("accountRequirement", event.currentTarget.value as typeof candidate.accountRequirement)}>
            {["unknown", "required", "notRequired"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Account notes" value={candidate.accountRequirementNotes} onChange={(event) => update("accountRequirementNotes", event.currentTarget.value)} />
          <SelectField label="Online requirement" value={candidate.onlineRequirement} onChange={(event) => update("onlineRequirement", event.currentTarget.value as typeof candidate.onlineRequirement)}>
            {["unknown", "required", "notRequired"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Online notes" value={candidate.onlineRequirementNotes} onChange={(event) => update("onlineRequirementNotes", event.currentTarget.value)} />
          <TextField label="Restrictions" value={candidate.restrictions.join("; ")} onChange={(event) => update("restrictions", splitLines(event.currentTarget.value))} />
          <TextField label="Dependency notes" value={candidate.dependencies.map((dependency) => dependency.description).join("; ")} onChange={(event) => updateDependencyNotes(event.currentTarget.value)} />
          <SelectField label="Identifier consistency" value={candidate.identifierConsistency} onChange={(event) => update("identifierConsistency", event.currentTarget.value as typeof candidate.identifierConsistency)}>
            {["unknown", "consistent", "inconsistent"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Identifier notes" value={candidate.identifierConsistencyNotes} onChange={(event) => update("identifierConsistencyNotes", event.currentTarget.value)} />
          <SelectField label="Later editability" value={candidate.laterEditability} onChange={(event) => update("laterEditability", event.currentTarget.value as typeof candidate.laterEditability)}>
            {["unknown", "editable", "partiallyEditable", "lockedAfterCreation"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Later editability notes" value={candidate.laterEditabilityNotes} onChange={(event) => update("laterEditabilityNotes", event.currentTarget.value)} />
          <TextField label="Supplemental path IDs" value={candidate.supplementalPathIDs.join(", ")} onChange={(event) => update("supplementalPathIDs", splitTokens(event.currentTarget.value))} />
        </div>
        <div className="button-row" role="group" aria-label="Appearance categories available">
          {appearanceKinds.map((kind) => (
            <Button key={kind} variant={candidate.appearanceCategoriesAvailable.includes(kind) ? "primary" : "secondary"} onClick={() => toggleAppearanceKind(kind)}>
              {kind}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <h2>Reproducible steps</h2>
        <div className="result-grid">
          {candidate.steps.map((step) => (
            <Card key={step.stepNumber} tone={step.evidenceFileIDs.length > 0 ? "success" : "warning"}>
              <h3>Step {step.stepNumber}</h3>
              <TextField label="Instruction" value={step.instruction} onChange={(event) => updateStep(step.stepNumber, { instruction: event.currentTarget.value })} />
              <TextField label="Button/input sequence" value={step.buttonInputSequence} onChange={(event) => updateStep(step.stepNumber, { buttonInputSequence: event.currentTarget.value })} />
              <TextField label="Expected result" value={step.expectedResult} onChange={(event) => updateStep(step.stepNumber, { expectedResult: event.currentTarget.value })} />
              <TextField label="Evidence file IDs" value={step.evidenceFileIDs.join(", ")} onChange={(event) => updateStep(step.stepNumber, { evidenceFileIDs: splitTokens(event.currentTarget.value) })} />
            </Card>
          ))}
        </div>
        <Button variant="secondary" onClick={addStep}>
          Add step
        </Button>
      </Card>
      <Card>
        <h2>Canonical scoring</h2>
        <div className="form-grid">
          <TextField label="Evidence completeness" type="number" min={0} max={100} value={candidate.canonicalScoreInput.evidenceCompleteness} onChange={(event) => update("canonicalScoreInput", { ...candidate.canonicalScoreInput, evidenceCompleteness: Number(event.currentTarget.value) })} />
          <TextField label="Reproducibility" type="number" min={0} max={100} value={candidate.canonicalScoreInput.reproducibility} onChange={(event) => update("canonicalScoreInput", { ...candidate.canonicalScoreInput, reproducibility: Number(event.currentTarget.value) })} />
          <TextField label="Appearance coverage" type="number" min={0} max={100} value={candidate.canonicalScoreInput.appearanceCoverage} onChange={(event) => update("canonicalScoreInput", { ...candidate.canonicalScoreInput, appearanceCoverage: Number(event.currentTarget.value) })} />
          <TextField label="Dependency clarity" type="number" min={0} max={100} value={candidate.canonicalScoreInput.dependencyClarity} onChange={(event) => update("canonicalScoreInput", { ...candidate.canonicalScoreInput, dependencyClarity: Number(event.currentTarget.value) })} />
          <TextField label="Editability confidence" type="number" min={0} max={100} value={candidate.canonicalScoreInput.laterEditabilityConfidence} onChange={(event) => update("canonicalScoreInput", { ...candidate.canonicalScoreInput, laterEditabilityConfidence: Number(event.currentTarget.value) })} />
          <TextField label="Canonical justification" value={candidate.canonicalJustification} onChange={(event) => update("canonicalJustification", event.currentTarget.value)} />
        </div>
      </Card>
      {saveErrors.length > 0 ? (
        <Alert title="Save blocked" tone="danger" role="alert">
          {saveErrors[0]}
        </Alert>
      ) : null}
      {savedCreationPathID ? (
        <Alert title="Creation path saved" tone="success">
          Saved non-production creation path {savedCreationPathID}.
        </Alert>
      ) : null}
      <div className="button-row">
        <Button onClick={saveCreationPath} disabled={!evaluation.canExportCreationPath}>
          Save candidate for first review
        </Button>
        <Button variant="secondary" onClick={() => setCandidate(createCreationPathCandidateDraft("creation-path-candidate-1"))}>
          Start new candidate
        </Button>
      </div>
    </section>
  );
}

function createDefaultStore() {
  if (typeof window !== "undefined" && window.localStorage) return createBrowserPhase0AuditStore(window.localStorage);
  return createMemoryPhase0AuditStore();
}

function splitTokens(value: string) {
  return splitLines(value);
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferDependencyKind(description: string): CreationPathDependencyDraft["kind"] {
  if (/position/i.test(description)) return "position";
  if (/archetype/i.test(description)) return "archetype";
  if (/body/i.test(description)) return "bodyType";
  if (/account/i.test(description)) return "account";
  if (/online|network/i.test(description)) return "online";
  return "other";
}
