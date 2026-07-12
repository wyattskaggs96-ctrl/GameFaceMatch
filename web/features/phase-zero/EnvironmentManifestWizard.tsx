"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, ScreenHeader, SelectField, StatusBadge, TextField } from "@/components/design-system";
import { createBrowserPhase0AuditStore, createMemoryPhase0AuditStore, type Phase0AuditStore } from "@/lib/phase-zero/phase-zero-audit-store";
import {
  buildAuditEnvironmentFromWizard,
  createEnvironmentEvidenceReference,
  createEnvironmentWizardDraft,
  getEnvironmentWizardCompletion,
  requiredEvidenceSlotIDs,
  type EnvironmentEvidenceSlotID,
  type Phase0EnvironmentWizardDraft
} from "@/lib/phase-zero/phase-zero-environment-wizard";

export function EnvironmentManifestWizard({ store }: { store?: Phase0AuditStore }) {
  const auditStore = useMemo(() => store ?? createDefaultStore(), [store]);
  const [draft, setDraft] = useState<Phase0EnvironmentWizardDraft>(() => createEnvironmentWizardDraft());
  const [savedEnvironmentID, setSavedEnvironmentID] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(() => auditStore.listAuditEnvironments().length);
  const completion = getEnvironmentWizardCompletion(draft);

  function update<K extends keyof Phase0EnvironmentWizardDraft>(field: K, value: Phase0EnvironmentWizardDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value, updatedAt: new Date().toISOString() }));
    setSavedEnvironmentID(null);
    setSaveErrors([]);
  }

  function updateEvidence(slotID: EnvironmentEvidenceSlotID, file: File | null) {
    setDraft((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      evidenceSlots: {
        ...current.evidenceSlots,
        [slotID]: file
          ? createEnvironmentEvidenceReference({
              slotID,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: file.size,
              draft: current
            })
          : { ...current.evidenceSlots[slotID], fileName: "", mimeType: "", sizeBytes: 0, evidenceFileID: "" }
      }
    }));
    setSavedEnvironmentID(null);
    setSaveErrors([]);
  }

  function saveEnvironment() {
    const result = buildAuditEnvironmentFromWizard(draft);
    if (!result.environment) {
      setSaveErrors(result.errors);
      return;
    }
    const validation = auditStore.saveAuditEnvironment(result.environment);
    if (!validation.ok) {
      setSaveErrors(validation.errors.map((error) => error.message));
      return;
    }
    setSavedEnvironmentID(result.environment.id);
    setSavedCount(auditStore.listAuditEnvironments().length);
    setSaveErrors([]);
  }

  return (
    <section className="screen-stack" aria-labelledby="environment-wizard-title">
      <ScreenHeader eyebrow="Development-only audit wizard" title="Environment manifest wizard" id="environment-wizard-title">
        <p>
          Record the exact shipping-game environment before entering catalog records. Drafts are incomplete, local, and non-production until every required
          field and evidence slot is confirmed.
        </p>
      </ScreenHeader>
      <Alert title={completion.canComplete ? "Manifest ready to save" : "Incomplete non-production draft"} tone={completion.canComplete ? "success" : "warning"}>
        {completion.messages[0]}
      </Alert>
      <div className="card-grid">
        <Card>
          <div className="status-row">
            <h2>Generated environment ID</h2>
            <StatusBadge tone={completion.canComplete ? "success" : "warning"}>{completion.status}</StatusBadge>
          </div>
          <p className="small-text">{completion.generatedEnvironmentID}</p>
          <dl className="metadata-list">
            <div>
              <dt>Data class</dt>
              <dd>Research draft</dd>
            </div>
            <div>
              <dt>Saved audit environments</dt>
              <dd>{savedCount}</dd>
            </div>
          </dl>
        </Card>
        <Card tone={completion.missingCriticalFields.length > 0 ? "danger" : "success"}>
          <h2>Critical gate</h2>
          {completion.missingCriticalFields.length === 0 ? (
            <p className="supporting">Platform, version, patch, mode, and creation path are recorded.</p>
          ) : (
            <ul className="compact-list">
              {completion.missingCriticalFields.map((field) => (
                <li key={field}>{field} is required for completion.</li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2>Evidence slots</h2>
          <ul className="review-list">
            {requiredEvidenceSlotIDs().map((slotID) => (
              <li key={slotID}>
                <span>{draft.evidenceSlots[slotID].label}</span>
                <strong>{draft.evidenceSlots[slotID].evidenceFileID ? "recorded" : "missing"}</strong>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card>
        <h2>Required environment fields</h2>
        <div className="form-grid">
          <TextField label="Auditor ID" value={draft.auditorID} onChange={(event) => update("auditorID", event.currentTarget.value)} />
          <TextField label="Platform" value={draft.platformName} onChange={(event) => update("platformName", event.currentTarget.value)} />
          <TextField label="Console model" value={draft.consoleModel} onChange={(event) => update("consoleModel", event.currentTarget.value)} />
          <TextField label="Console OS" value={draft.consoleOSVersion} onChange={(event) => update("consoleOSVersion", event.currentTarget.value)} />
          <TextField label="Edition" value={draft.edition} onChange={(event) => update("edition", event.currentTarget.value)} />
          <TextField label="Region" value={draft.region} onChange={(event) => update("region", event.currentTarget.value)} />
          <TextField label="Storefront" value={draft.storefront} onChange={(event) => update("storefront", event.currentTarget.value)} />
          <SelectField label="Copy type" value={draft.copyType} onChange={(event) => update("copyType", event.currentTarget.value as typeof draft.copyType)}>
            {["unknown", "disc", "digital", "subscription", "trial"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Game executable version"
            value={draft.gameExecutableVersion}
            onChange={(event) => update("gameExecutableVersion", event.currentTarget.value)}
          />
          <TextField label="Patch/build label" value={draft.patchLabel} onChange={(event) => update("patchLabel", event.currentTarget.value)} />
          <SelectField
            label="Latest update state"
            value={draft.latestUpdateState}
            onChange={(event) => update("latestUpdateState", event.currentTarget.value as typeof draft.latestUpdateState)}
          >
            {["unknown", "latestInstalled", "updateAvailable", "offlineUnknown"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Observed date/time" type="datetime-local" value={toLocalDateTimeValue(draft.observedAt)} onChange={(event) => update("observedAt", fromLocalDateTimeValue(event.currentTarget.value))} />
          <SelectField label="Online state" value={draft.onlineState} onChange={(event) => update("onlineState", event.currentTarget.value as typeof draft.onlineState)}>
            {["unknown", "online", "offline"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <SelectField label="EA account state" value={draft.eaAccountState} onChange={(event) => update("eaAccountState", event.currentTarget.value as typeof draft.eaAccountState)}>
            {["unknown", "signedIn", "signedOut", "notRequired"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Resolution" value={draft.resolution} onChange={(event) => update("resolution", event.currentTarget.value)} />
          <SelectField label="HDR" value={draft.hdrState} onChange={(event) => update("hdrState", event.currentTarget.value as typeof draft.hdrState)}>
            {["unknown", "enabled", "disabled", "unsupported"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Display model" value={draft.displayModel} onChange={(event) => update("displayModel", event.currentTarget.value)} />
          <TextField label="Capture hardware" value={draft.captureHardware} onChange={(event) => update("captureHardware", event.currentTarget.value)} />
          <TextField label="Capture format" value={draft.captureFormat} onChange={(event) => update("captureFormat", event.currentTarget.value)} />
          <TextField label="Selected mode" value={draft.mode} onChange={(event) => update("mode", event.currentTarget.value)} />
          <TextField label="Exact creation path" value={draft.exactPath} onChange={(event) => update("exactPath", event.currentTarget.value)} />
          <TextField label="Position" value={draft.position} onChange={(event) => update("position", event.currentTarget.value)} />
          <TextField label="Archetype" value={draft.archetype} onChange={(event) => update("archetype", event.currentTarget.value)} />
          <SelectField label="Handedness" value={draft.handedness} onChange={(event) => update("handedness", event.currentTarget.value as typeof draft.handedness)}>
            {["unknown", "left", "right", "ambidextrous", "notApplicable"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
          <TextField label="Height" value={draft.height} onChange={(event) => update("height", event.currentTarget.value)} />
          <TextField label="Weight" value={draft.weight} onChange={(event) => update("weight", event.currentTarget.value)} />
          <TextField label="Body type" value={draft.bodyType} onChange={(event) => update("bodyType", event.currentTarget.value)} />
          <TextField label="Entitlements" value={draft.entitlements} onChange={(event) => update("entitlements", event.currentTarget.value)} note="Comma-separated or short text list." />
          <TextField label="Notes" value={draft.notes} onChange={(event) => update("notes", event.currentTarget.value)} />
        </div>
      </Card>
      <Card>
        <h2>Evidence upload slots</h2>
        <p className="supporting">Files are selected only to record local evidence metadata. The wizard does not upload screenshots or make them public web assets.</p>
        <div className="card-grid">
          {requiredEvidenceSlotIDs().map((slotID) => (
            <Card key={slotID} tone={draft.evidenceSlots[slotID].evidenceFileID ? "success" : "warning"}>
              <h3>{draft.evidenceSlots[slotID].label}</h3>
              <label className="form-field">
                <span>{draft.evidenceSlots[slotID].label} evidence file</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  aria-label={`${draft.evidenceSlots[slotID].label} evidence file`}
                  onChange={(event) => updateEvidence(slotID, event.currentTarget.files?.[0] ?? null)}
                />
              </label>
              <p className="small-text">{draft.evidenceSlots[slotID].evidenceFileID || "Missing required evidence reference"}</p>
            </Card>
          ))}
        </div>
      </Card>
      {completion.missingRequiredFields.length > 0 || completion.missingEvidenceSlots.length > 0 ? (
        <Alert title="Incomplete draft" tone="warning">
          Missing {completion.missingRequiredFields.length} required fields and {completion.missingEvidenceSlots.length} evidence slots.
        </Alert>
      ) : null}
      {saveErrors.length > 0 ? (
        <Alert title="Save blocked" tone="danger" role="alert">
          {saveErrors[0]}
        </Alert>
      ) : null}
      {savedEnvironmentID ? (
        <Alert title="Environment saved" tone="success">
          Saved non-production audit environment {savedEnvironmentID}.
        </Alert>
      ) : null}
      <div className="button-row">
        <Button onClick={saveEnvironment} disabled={!completion.canComplete}>
          Save complete environment manifest
        </Button>
        <Button variant="secondary" onClick={() => setDraft(createEnvironmentWizardDraft())}>
          Start new draft
        </Button>
      </div>
    </section>
  );
}

function createDefaultStore() {
  if (typeof window !== "undefined" && window.localStorage) return createBrowserPhase0AuditStore(window.localStorage);
  return createMemoryPhase0AuditStore();
}

function toLocalDateTimeValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromLocalDateTimeValue(value: string) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}
