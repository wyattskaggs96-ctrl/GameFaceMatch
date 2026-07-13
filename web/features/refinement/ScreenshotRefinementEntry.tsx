"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import {
  canSubmitScreenshotRefinement,
  getScreenshotRefinementReadiness,
  SCREENSHOT_REFINEMENT_CHECKLIST,
  createUnavailableScreenshotRefinementProcessor,
  deleteScreenshotRefinementSession,
  setScreenshot,
  setScreenshotChecklistItem,
  type ScreenshotChecklistItemID,
  type ScreenshotRefinementSession,
  type ScreenshotSlotState,
  type ScreenshotViewID
} from "@/lib/refinement/screenshot-refinement";
import { migrateStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import type { RefinementResult } from "@/types/domain";

export function ScreenshotRefinementEntry({
  session,
  onSessionChange,
  onSessionDeleted
}: {
  session: ScreenshotRefinementSession;
  onSessionChange: (session: ScreenshotRefinementSession) => void;
  onSessionDeleted: () => void;
}) {
  const [result, setResult] = useState<RefinementResult | null>(null);
  const processor = useMemo(() => createUnavailableScreenshotRefinementProcessor(), []);
  const canSubmit = canSubmitScreenshotRefinement(session);
  const readiness = getScreenshotRefinementReadiness(session);

  async function handleFile(viewID: ScreenshotViewID, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    try {
      const dimensions = await readImageDimensions(objectUrl);
      const mutation = setScreenshot(session, {
        viewID,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        objectUrl
      });
      revokeObjectUrls(mutation.objectUrlsToRevoke);
      if (mutation.session.slots.find((slot) => slot.viewID === viewID)?.validationStatus === "invalid") {
        URL.revokeObjectURL(objectUrl);
      }
      onSessionChange(mutation.session);
      setResult(null);
    } catch {
      URL.revokeObjectURL(objectUrl);
      const mutation = setScreenshot(session, {
        viewID,
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        width: 0,
        height: 0
      });
      onSessionChange({
        ...mutation.session,
        slots: mutation.session.slots.map((slot) =>
          slot.viewID === viewID ? { ...slot, validationErrors: [...slot.validationErrors, "The screenshot could not be decoded."] } : slot
        )
      });
    } finally {
      event.currentTarget.value = "";
    }
  }

  function deleteSession() {
    const mutation = deleteScreenshotRefinementSession(session);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onSessionChange(mutation.session);
    onSessionDeleted();
    setResult(null);
  }

  function updateChecklistItem(itemID: ScreenshotChecklistItemID, checked: boolean) {
    onSessionChange(setScreenshotChecklistItem(session, itemID, checked));
    setResult(null);
  }

  async function requestRefinement() {
    const unavailable = await processor.refine({
      originalProfile: createPlaceholderProfile(),
      screenshots: session.slots.flatMap((slot) => (slot.screenshot ? [slot.screenshot] : []))
    });
    setResult(unavailable);
  }

  return (
    <section className="screen-stack" aria-labelledby="refinement-title">
      <ScreenHeader eyebrow="Screenshot refinement" title="Screenshot refinement intake" id="refinement-title">
        <p>
          Upload a front-facing created-player screenshot, with optional left and right 45-degree images for future comparison. This intake validates basic
          image metadata and records your confirmations, but it does not perform cross-domain face comparison.
        </p>
      </ScreenHeader>
      <Alert title="Refinement unavailable" tone="warning">
        Verified catalog matching and real comparison logic must exist before GameFace Match can recommend screenshot-based changes.
      </Alert>
      <Card tone="info">
        <h2>Screenshot requirements</h2>
        <ul className="message-list">
          <li>Use screenshots from the same created player build.</li>
          <li>Upload at least one front-facing character screenshot.</li>
          <li>Optional left and right 45-degree screenshots can support future refinement.</li>
          <li>Keep the face visible and avoid helmets, masks, sunglasses, and UI overlays over the head.</li>
          <li>Use neutral expression and steady menu lighting where the game allows it.</li>
          <li>Use JPEG, PNG, or WebP files under 12 MB.</li>
          <li>Use screenshots at least 720 pixels wide and tall.</li>
          <li>Delete the screenshot session when finished; screenshots are not stored in localStorage.</li>
        </ul>
      </Card>
      <div className="screenshot-grid">
        {session.slots.map((slot) => (
          <ScreenshotSlot key={slot.viewID} slot={slot} onFile={handleFile} />
        ))}
      </div>
      <Card>
        <h2>Manual screenshot confirmations</h2>
        <p className="field-note">
          These confirmations are required because the current web MVP cannot yet verify helmets, masks, overlays, expression, or game-character pose
          automatically.
        </p>
        <div className="confirmation-list" role="group" aria-label="Screenshot refinement requirements">
          {SCREENSHOT_REFINEMENT_CHECKLIST.map((item) => (
            <label className="confirmation-item" key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(session.checklist[item.id])}
                onChange={(event) => updateChecklistItem(item.id, event.currentTarget.checked)}
              />
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </label>
          ))}
        </div>
      </Card>
      <Card tone={readiness.canSubmit ? "success" : "warning"}>
        <div className="status-row">
          <h2>Intake readiness</h2>
          <StatusBadge tone={readiness.canSubmit ? "success" : "warning"}>{readiness.canSubmit ? "Ready" : "Blocked"}</StatusBadge>
        </div>
        {readiness.blockingMessages.length > 0 ? (
          <ul className="error-list">
            {readiness.blockingMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : (
          <p>Screenshot intake requirements are complete. Refinement recommendations remain unavailable until verified catalog data and comparison logic exist.</p>
        )}
        {readiness.advisoryMessages.length > 0 ? (
          <ul className="message-list">
            {readiness.advisoryMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
      </Card>
      {result ? (
        <Alert title="Refinement result" tone="info" role="status">
          {result.message}
        </Alert>
      ) : null}
      <div className="button-row">
        <Button onClick={() => void requestRefinement()} disabled={!canSubmit}>
          Check refinement
        </Button>
        <Button variant="danger" onClick={deleteSession}>
          Delete screenshot session data
        </Button>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {session.slots.filter((slot) => slot.screenshot).length} of 3 screenshot views uploaded. {readiness.blockingMessages.length} blocking screenshot intake
        requirements remaining.
      </div>
    </section>
  );
}

function ScreenshotSlot({
  slot,
  onFile
}: {
  slot: ScreenshotSlotState;
  onFile: (viewID: ScreenshotViewID, event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card className="screenshot-card" tone={slot.validationStatus === "valid" ? "success" : "neutral"}>
      <div className="status-row">
        <h2>{slot.label}</h2>
        <StatusBadge tone={slot.validationStatus === "valid" ? "success" : "warning"}>
          {slot.required ? slot.validationStatus : slot.validationStatus === "valid" ? "valid" : "optional"}
        </StatusBadge>
      </div>
      <p>{slot.instruction}</p>
      {slot.screenshot ? (
        <img className="capture-thumb" src={slot.screenshot.objectUrl} alt={`${slot.label} preview`} />
      ) : (
        <div className="empty-thumb">No screenshot selected</div>
      )}
      {slot.screenshot ? (
        <p className="field-note">
          {slot.screenshot.fileName} | {slot.screenshot.width}x{slot.screenshot.height}
        </p>
      ) : null}
      {slot.validationErrors.length > 0 ? (
        <ul className="error-list">
          {slot.validationErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      <label className="form-field">
        <span>{slot.screenshot ? "Replace screenshot" : "Upload screenshot"}</span>
        <input className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onFile(slot.viewID, event)} />
      </label>
    </Card>
  );
}

function readImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = objectUrl;
  });
}

function revokeObjectUrls(objectUrls: string[]) {
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
}

function createPlaceholderProfile() {
  return migrateStandardFaceProfile({
    id: "refinement-placeholder-profile",
    profileVersion: "web-refinement-scaffold",
    createdAt: new Date().toISOString(),
    capture: {
      mode: "screenshotRefinement" as const,
      deviceModel: "browser",
      capturedAt: new Date().toISOString(),
      overallQuality: 0,
      operatingSystemVersion: "unknown",
      appVersion: "web-mvp",
      browserRgbOnly: true
    },
    qualityReport: {
      overallScore: 0,
      issues: [],
      isUsableForPrototype: false,
      requiredAnglesComplete: false
    },
    geometry: {
      measurements: {},
      unavailableMeasurements: [],
      modelVersion: "not-measured"
    },
    appearance: {
      attributes: [],
      modelVersion: "not-confirmed"
    },
    sourceAngleAvailability: {
      straightOn: { angleID: "straightOn" as const, available: false },
      left45: { angleID: "left45" as const, available: false },
      right45: { angleID: "right45" as const, available: false },
      leftProfile: { angleID: "leftProfile" as const, available: false },
      rightProfile: { angleID: "rightProfile" as const, available: false }
    }
  });
}
