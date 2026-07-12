"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, StatusBadge, TextField } from "@/components/design-system";
import {
  compareCaptureSessionToLockedConfiguration,
  createEmptyCaptureConfigurationDraft,
  findMissingCaptureConfigurationFields,
  lockCaptureConfiguration,
  PHASE0_CAPTURE_CONFIGURATION_FIELDS,
  type Phase0CaptureConfigurationFieldDefinition,
  type Phase0CaptureConfigurationFieldID,
  type Phase0CaptureConfigurationSettings,
  type Phase0LockedCaptureConfiguration
} from "@/lib/phase-zero/phase-zero-capture-configuration";

const fieldGroups: Array<{
  id: Phase0CaptureConfigurationFieldDefinition["group"];
  label: string;
  description: string;
}> = [
  {
    id: "playerContext",
    label: "Player context",
    description: "Mode and player setup values that must stay consistent during audit capture."
  },
  {
    id: "appearanceControls",
    label: "Appearance controls",
    description: "Visual controls used only to stabilize game capture; they are not geometry-matching inputs."
  },
  {
    id: "sceneControls",
    label: "Scene controls",
    description: "Non-gameplay setup that keeps screenshots comparable across sessions."
  },
  {
    id: "cameraControls",
    label: "Camera controls",
    description: "Capture-device and display settings that affect screenshot consistency."
  },
  {
    id: "fileControls",
    label: "File controls",
    description: "Output-format settings required for repeatable evidence packages."
  }
];

export function CaptureConfigurationEditor() {
  const nowISO = new Date().toISOString();
  const [draft, setDraft] = useState(() =>
    createEmptyCaptureConfigurationDraft({
      id: "cf27-canonical-capture-draft",
      label: "College Football 27 canonical capture configuration",
      nowISO
    })
  );
  const [lockedConfiguration, setLockedConfiguration] = useState<Phase0LockedCaptureConfiguration | null>(null);
  const [sessionSettings, setSessionSettings] = useState<Phase0CaptureConfigurationSettings>(draft.settings);
  const missingFields = useMemo(() => findMissingCaptureConfigurationFields(draft.settings), [draft.settings]);
  const comparison = lockedConfiguration
    ? compareCaptureSessionToLockedConfiguration({ approvedConfiguration: lockedConfiguration, actualSettings: sessionSettings })
    : null;

  function updateDraftField(fieldID: Phase0CaptureConfigurationFieldID, value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      settings: {
        ...currentDraft.settings,
        [fieldID]: value
      },
      updatedAt: new Date().toISOString()
    }));
  }

  function updateSessionField(fieldID: Phase0CaptureConfigurationFieldID, value: string) {
    setSessionSettings((currentSettings) => ({
      ...currentSettings,
      [fieldID]: value
    }));
  }

  function lockDraft() {
    const result = lockCaptureConfiguration({
      draft,
      lockedAt: new Date().toISOString(),
      lockedBy: "local-audit-operator"
    });
    if (!result.ok || !result.lockedConfiguration) return;
    setLockedConfiguration(result.lockedConfiguration);
    setSessionSettings(result.lockedConfiguration.settings);
  }

  return (
    <Card tone="info">
      <div className="status-row">
        <div>
          <p className="eyebrow">Internal audit tool</p>
          <h2>Canonical capture configuration</h2>
        </div>
        <StatusBadge tone={lockedConfiguration ? "success" : "warning"}>{lockedConfiguration ? "locked" : "draft"}</StatusBadge>
      </div>
      <p className="supporting">
        Define the approved setup for manual College Football 27 evidence capture. Locking creates a stable settings hash and later capture sessions
        warn when they deviate from these values.
      </p>
      <Alert title="No game options are inferred" tone="info">
        These fields describe audit setup only. They do not create College Football 27 records, recommendations, or geometry measurements.
      </Alert>
      <div className="card-grid">
        {fieldGroups.map((group) => (
          <Card key={group.id}>
            <h3>{group.label}</h3>
            <p className="supporting">{group.description}</p>
            <div className="form-stack">
              {PHASE0_CAPTURE_CONFIGURATION_FIELDS.filter((field) => field.group === group.id).map((field) => (
                <TextField
                  key={field.id}
                  label={field.label}
                  value={draft.settings[field.id]}
                  onChange={(event) => updateDraftField(field.id, event.currentTarget.value)}
                  disabled={Boolean(lockedConfiguration)}
                  note={field.affectsGeometrySimilarity ? "Audit consistency input." : "Appearance or scene control only; not used for geometry similarity."}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="button-row">
        <Button onClick={lockDraft} disabled={Boolean(lockedConfiguration) || missingFields.length > 0}>
          Lock canonical configuration
        </Button>
        {lockedConfiguration ? <StatusBadge tone="success">{lockedConfiguration.settingsHash}</StatusBadge> : null}
      </div>
      {missingFields.length > 0 && !lockedConfiguration ? (
        <Alert title="Configuration incomplete" tone="warning">
          Missing required fields: {missingFields.map((field) => field.label).join(", ")}.
        </Alert>
      ) : null}
      {lockedConfiguration ? (
        <>
          <Card>
            <div className="status-row">
              <h3>Capture session deviation check</h3>
              <StatusBadge tone={comparison?.matchesApprovedConfiguration ? "success" : "warning"}>
                {comparison?.matchesApprovedConfiguration ? "matches approved setup" : "deviation warning"}
              </StatusBadge>
            </div>
            <p className="supporting">
              Enter observed values from the current capture session. Differences are warnings that must be recaptured or documented before publication.
            </p>
            <div className="card-grid">
              {fieldGroups.map((group) => (
                <Card key={`session-${group.id}`}>
                  <h4>{group.label}</h4>
                  <div className="form-stack">
                    {PHASE0_CAPTURE_CONFIGURATION_FIELDS.filter((field) => field.group === group.id).map((field) => (
                      <TextField
                        key={`session-${field.id}`}
                        label={`Session ${field.label}`}
                        value={sessionSettings[field.id]}
                        onChange={(event) => updateSessionField(field.id, event.currentTarget.value)}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
            {comparison && comparison.deviations.length > 0 ? (
              <Alert title="Session deviates from locked configuration" tone="warning" role="alert">
                {comparison.deviations.length} field{comparison.deviations.length === 1 ? "" : "s"} differ from the approved hash.
              </Alert>
            ) : null}
            {comparison && comparison.deviations.length > 0 ? (
              <ul className="compact-list">
                {comparison.deviations.map((deviation) => (
                  <li key={deviation.fieldID}>
                    <strong>{deviation.label}:</strong> expected "{deviation.expectedValue}"; observed "{deviation.actualValue}".
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </>
      ) : null}
    </Card>
  );
}
