"use client";

import { useState } from "react";
import { Alert, Button, Card, ProgressBar, ScreenHeader, StatusBadge } from "@/components/design-system";
import {
  LIGHTING_READINESS_CHECKS,
  createInitialLightingReadinessState,
  evaluateLightingReadiness,
  updateLightingReadiness,
  type LightingReadinessCheckID
} from "@/lib/capture/lighting-readiness";

export function CaptureLightingCheck({ onContinue }: { onContinue: () => void }) {
  const [state, setState] = useState(() => createInitialLightingReadinessState());
  const report = evaluateLightingReadiness(state);

  function setCheck(id: LightingReadinessCheckID, checked: boolean) {
    setState((current) => updateLightingReadiness(current, id, checked));
  }

  return (
    <section className="screen-stack narrow" aria-labelledby="lighting-check-title">
      <ScreenHeader eyebrow="Lighting check" title="Confirm lighting before capture" id="lighting-check-title">
        <p>
          This is a manual readiness checkpoint for the web RGB workflow. It does not perform TrueDepth, ARKit, depth geometry, 3D reconstruction, identity
          recognition, or sensitive-trait inference.
        </p>
      </ScreenHeader>
      <Card tone={report.status === "ready" ? "success" : "warning"}>
        <div className="status-row">
          <h2>Lighting readiness</h2>
          <StatusBadge tone={report.status === "ready" ? "success" : "warning"}>{report.status === "ready" ? "Ready" : "Needs checks"}</StatusBadge>
        </div>
        <ProgressBar value={report.completedCount} max={report.requiredCount} label="Lighting checks completed" />
        <p>{report.summary}</p>
      </Card>
      <Card>
        <fieldset className="confirmation-list" aria-describedby="lighting-check-note">
          <legend>Required lighting confirmations</legend>
          {LIGHTING_READINESS_CHECKS.map((check) => (
            <label className="confirmation-item" key={check.id}>
              <input
                type="checkbox"
                checked={state[check.id]}
                onChange={(event) => setCheck(check.id, event.currentTarget.checked)}
              />
              <span>
                <strong>{check.label}</strong>
                <small>{check.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <p id="lighting-check-note" className="field-note">
          The next capture screen also checks brightness, shadow clipping, highlight clipping, blur, and lighting imbalance with browser-safe canvas estimates.
        </p>
      </Card>
      {report.status === "ready" ? (
        <Alert title="Lighting ready" tone="success">
          {report.advisoryMessages.join(" ")}
        </Alert>
      ) : (
        <Alert title="Lighting checks still needed" tone="warning" role="alert">
          {report.blockingMessages.join(" ")}
        </Alert>
      )}
      <div className="button-row">
        <Button disabled={report.status !== "ready"} onClick={onContinue}>
          Continue to browser capability
        </Button>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        Lighting readiness state: {report.status}. Completed checks: {report.completedCount} of {report.requiredCount}.
      </div>
    </section>
  );
}
