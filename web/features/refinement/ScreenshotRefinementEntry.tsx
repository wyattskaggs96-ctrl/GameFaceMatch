"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import {
  canSubmitScreenshotRefinement,
  createUnavailableScreenshotRefinementProcessor,
  deleteScreenshotRefinementSession,
  setScreenshot,
  type ScreenshotRefinementSession,
  type ScreenshotSlotState,
  type ScreenshotViewID
} from "@/lib/refinement/screenshot-refinement";
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

  async function requestRefinement() {
    const unavailable = await processor.refine({
      originalProfile: createPlaceholderProfile(),
      screenshots: session.slots.flatMap((slot) => (slot.screenshot ? [slot.screenshot] : []))
    });
    setResult(unavailable);
  }

  return (
    <section className="screen-stack" aria-labelledby="refinement-title">
      <ScreenHeader eyebrow="Screenshot refinement" title="Refinement scaffold" id="refinement-title">
        <p>
          Upload front, left 45-degree, and right 45-degree created-player screenshots. This scaffold validates basic image metadata but does not perform
          cross-domain face comparison.
        </p>
      </ScreenHeader>
      <Alert title="Refinement unavailable" tone="warning">
        Verified catalog matching and real comparison logic must exist before GameFace Match can recommend screenshot-based changes.
      </Alert>
      <Card tone="info">
        <h2>Screenshot requirements</h2>
        <ul className="message-list">
          <li>Use screenshots from the same created player build.</li>
          <li>Keep the face visible and avoid UI overlays over the head.</li>
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
        {session.slots.filter((slot) => slot.screenshot).length} of 3 screenshot views uploaded.
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
        <StatusBadge tone={slot.validationStatus === "valid" ? "success" : "warning"}>{slot.validationStatus}</StatusBadge>
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
  return {
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
  };
}
