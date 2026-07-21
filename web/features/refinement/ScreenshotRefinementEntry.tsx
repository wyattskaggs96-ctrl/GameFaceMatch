"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, ScreenHeader, StatusBadge } from "@/components/design-system";
import { RecoveryActionList } from "@/components/reliability";
import {
  canSubmitScreenshotRefinement,
  getScreenshotRefinementReadiness,
  SCREENSHOT_REFINEMENT_CHECKLIST,
  deleteScreenshotRefinementSession,
  setScreenshot,
  setScreenshotAnalysisReport,
  setScreenshotChecklistItem,
  type ScreenshotChecklistItemID,
  type ScreenshotReference,
  type ScreenshotRefinementSession,
  type ScreenshotSlotState,
  type ScreenshotViewID
} from "@/lib/refinement/screenshot-refinement";
import { createScreenshotRefinementEngine } from "@/lib/refinement/refinement-engine";
import {
  analyzeScreenshotQualityAndAlignment,
  type ScreenshotQualityAlignmentReport
} from "@/lib/refinement/screenshot-quality-alignment";
import { calculateImageMeasurements, type PixelSample } from "@/lib/capture/image-quality-service";
import { createLocalFaceLandmarkProvider } from "@/lib/face-landmarks/face-landmark-worker-client";
import { migrateStandardFaceProfile } from "@/lib/profile/standard-face-profile";
import { productionCatalogManifest } from "@/lib/catalog/production-manifest";
import { getRecoveryPlan, recoveryPlanForImageMessage } from "@/lib/reliability/recovery-actions";
import type { GameAppearanceMatch, RefinementResult, StandardFaceProfile } from "@/types/domain";

export function ScreenshotRefinementEntry({
  session,
  profile,
  rankedMatches = [],
  currentMatch = null,
  onSessionChange,
  onSessionDeleted,
  onRefinementCompleted
}: {
  session: ScreenshotRefinementSession;
  profile?: StandardFaceProfile | null;
  rankedMatches?: GameAppearanceMatch[];
  currentMatch?: GameAppearanceMatch | null;
  onSessionChange: (session: ScreenshotRefinementSession) => void;
  onSessionDeleted: () => void;
  onRefinementCompleted?: (session: ScreenshotRefinementSession, result: RefinementResult) => void;
}) {
  const [result, setResult] = useState<RefinementResult | null>(null);
  const [analysisPendingViewID, setAnalysisPendingViewID] = useState<ScreenshotViewID | null>(null);
  const latestSessionRef = useRef(session);
  const refinementEngine = useMemo(() => createScreenshotRefinementEngine(), []);
  const faceLandmarkProvider = useMemo(() => createLocalFaceLandmarkProvider(), []);
  const canSubmit = canSubmitScreenshotRefinement(session) && analysisPendingViewID === null;
  const readiness = getScreenshotRefinementReadiness(session);

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    return () => {
      void faceLandmarkProvider.dispose();
    };
  }, [faceLandmarkProvider]);

  async function handleFile(viewID: ScreenshotViewID, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    try {
      const imageElement = await loadImageElement(objectUrl);
      const dimensions = { width: imageElement.naturalWidth, height: imageElement.naturalHeight };
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
      latestSessionRef.current = mutation.session;
      onSessionChange(mutation.session);
      setResult(null);
      const screenshot = mutation.session.slots.find((slot) => slot.viewID === viewID)?.screenshot;
      if (screenshot) {
        setAnalysisPendingViewID(viewID);
        const analysisReport = await analyzeScreenshot(imageElement, screenshot);
        const nextSession = setScreenshotAnalysisReport(latestSessionRef.current, viewID, analysisReport);
        latestSessionRef.current = nextSession;
        onSessionChange(nextSession);
      }
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
      setAnalysisPendingViewID(null);
      event.currentTarget.value = "";
    }
  }

  async function analyzeScreenshot(imageElement: HTMLImageElement, screenshot: ScreenshotReference): Promise<ScreenshotQualityAlignmentReport> {
    const faceLandmarkReport = await faceLandmarkProvider.detect(
      {
        image: imageElement,
        width: screenshot.width,
        height: screenshot.height,
        angleID: screenshot.viewID
      },
      {
        detectionTimeoutMs: 6_000
      }
    );
    const pixelSample = createScreenshotPixelSample(imageElement);
    return analyzeScreenshotQualityAndAlignment({
      screenshot,
      faceLandmarkReport,
      imageMeasurements: pixelSample ? calculateImageMeasurements(pixelSample) : null
    });
  }

  function deleteSession() {
    const mutation = deleteScreenshotRefinementSession(session);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    latestSessionRef.current = mutation.session;
    onSessionChange(mutation.session);
    onSessionDeleted();
    setResult(null);
  }

  function updateChecklistItem(itemID: ScreenshotChecklistItemID, checked: boolean) {
    const nextSession = setScreenshotChecklistItem(latestSessionRef.current, itemID, checked);
    latestSessionRef.current = nextSession;
    onSessionChange(nextSession);
    setResult(null);
  }

  async function requestRefinement() {
    const activeSession = latestSessionRef.current;
    const refinementResult = refinementEngine.refine({
      profile: profile ?? createPlaceholderProfile(),
      session: activeSession,
      currentMatch,
      rankedMatches,
      catalogManifest: productionCatalogManifest,
      runtimeEnvironment: process.env.NODE_ENV
    });
    setResult(refinementResult);
    onRefinementCompleted?.(activeSession, refinementResult);
  }

  const refinementCanRun = rankedMatches.length > 0;

  return (
    <section className="screen-stack" aria-labelledby="refinement-title">
      <ScreenHeader eyebrow="Screenshot refinement" title="Screenshot refinement intake" id="refinement-title">
        <p>
          Upload a front-facing created-player screenshot, with optional left and right 45-degree images for future comparison. This intake validates basic
          image metadata, runs local quality and landmark checks when available, and compares only against verified catalog recommendations.
        </p>
      </ScreenHeader>
      <Alert title={refinementCanRun ? "Verified refinement checks" : "Refinement unavailable"} tone={refinementCanRun ? "info" : "warning"}>
        {refinementCanRun
          ? "Screenshot refinement will compare the uploaded created-player screenshot against the original local profile and the current verified top-three recommendations."
          : "Verified catalog matching must exist before GameFace Match can recommend screenshot-based changes."}
      </Alert>
      {refinementCanRun ? null : <RecoveryActionList plans={[getRecoveryPlan("emptyProductionCatalog")]} />}
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
          <ScreenshotSlot key={slot.viewID} slot={slot} pending={analysisPendingViewID === slot.viewID} onFile={handleFile} />
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
          <p>
            Screenshot intake requirements are complete.
            {refinementCanRun
              ? " Check refinement to compare only against verified recommendations."
              : " Refinement recommendations remain unavailable until verified catalog data exists."}
          </p>
        )}
        {readiness.blockingMessages.length > 0 ? (
          <RecoveryActionList plans={readiness.blockingMessages.map(recoveryPlanForImageMessage)} title="Screenshot recovery action" />
        ) : null}
        {analysisPendingViewID ? <p role="status">Running local screenshot analysis for {analysisPendingViewID}.</p> : null}
        {readiness.advisoryMessages.length > 0 ? (
          <ul className="message-list">
            {readiness.advisoryMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
      </Card>
      {result ? (
        <>
          <Alert title="Refinement result" tone="info" role="status">
            <p>{result.message}</p>
            {result.comparisonReport ? <RefinementComparisonSummary result={result} /> : null}
            {result.unavailableReasons && result.unavailableReasons.length > 0 ? (
              <ul className="message-list">
                {result.unavailableReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </Alert>
          <RecoveryActionList plans={[result.status === "invalidScreenshot" ? getRecoveryPlan("invalidScreenshot") : getRecoveryPlan("emptyProductionCatalog")]} />
        </>
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

function RefinementComparisonSummary({ result }: { result: RefinementResult }) {
  const report = result.comparisonReport;
  if (!report) return null;
  return (
    <div className="analysis-panel" aria-label="Screenshot refinement comparison">
      <h3>Local comparison</h3>
      <p>
        {report.normalizedMeasurementCount} normalized screenshot measurement(s). Cross-domain confidence: {report.crossDomainConfidence.label}.
      </p>
      {report.originalProfileComparison ? (
        <div>
          <h3>Original profile comparison</h3>
          <p>
            Screenshot-to-profile closeness {report.originalProfileComparison.screenshotClosenessScore} using{" "}
            {report.originalProfileComparison.comparedFeatureCount} feature(s). Confidence: {report.originalProfileComparison.confidence.label}.
          </p>
          <ul className="message-list">
            {[...report.originalProfileComparison.reasons, ...report.originalProfileComparison.differences, ...report.originalProfileComparison.limitations].map(
              (message) => (
                <li key={message}>{message}</li>
              )
            )}
          </ul>
        </div>
      ) : null}
      <p>{report.actionSummary}</p>
      {report.candidateComparisons.length > 0 ? (
        <ul className="message-list">
          {report.candidateComparisons.map((comparison) => (
            <li key={comparison.catalogItemID}>
              Rank {comparison.rank}: {comparison.nativeHeadOption} | screenshot closeness {comparison.screenshotClosenessScore} |{" "}
              {comparison.comparedFeatureCount} feature(s)
            </li>
          ))}
        </ul>
      ) : null}
      {result.actions && result.actions.length > 0 ? (
        <>
          <h3>Actionable suggestions</h3>
          <ul className="message-list">
            {result.actions.map((action) => (
              <li key={action.id}>
                <strong>{action.label}:</strong> {action.description}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <ul className="message-list">
        {report.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </div>
  );
}

function ScreenshotSlot({
  slot,
  pending,
  onFile
}: {
  slot: ScreenshotSlotState;
  pending: boolean;
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
      {pending ? <p role="status">Analyzing screenshot locally...</p> : null}
      {slot.analysisReport ? <ScreenshotAnalysisSummary report={slot.analysisReport} /> : null}
      {slot.validationErrors.length > 0 ? (
        <ul className="error-list">
          {slot.validationErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {slot.validationErrors.length > 0 ? <RecoveryActionList plans={slot.validationErrors.map(recoveryPlanForImageMessage)} title="Screenshot upload recovery" /> : null}
      <label className="form-field">
        <span>{slot.screenshot ? "Replace screenshot" : "Upload screenshot"}</span>
        <input className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onFile(slot.viewID, event)} />
      </label>
    </Card>
  );
}

function ScreenshotAnalysisSummary({ report }: { report: ScreenshotQualityAlignmentReport }) {
  return (
    <div className="analysis-panel" aria-label="Local screenshot quality and alignment">
      <div className="status-row">
        <h3>Local quality and alignment</h3>
        <StatusBadge tone={report.overallState === "ready" ? "success" : report.overallState === "blocked" ? "danger" : "warning"}>
          {report.overallState}
        </StatusBadge>
      </div>
      <dl className="quality-metrics">
        <div>
          <dt>Face detection</dt>
          <dd>{report.faceDetection.message}</dd>
        </div>
        <div>
          <dt>Bounding box</dt>
          <dd>{formatBoundingBox(report.faceDetection.boundingBox)}</dd>
        </div>
        <div>
          <dt>Pose estimate</dt>
          <dd>{report.poseEstimate.message}</dd>
        </div>
        <div>
          <dt>Landmarks</dt>
          <dd>{report.landmarkEstimate.coreLandmarkCount} core points</dd>
        </div>
        <div>
          <dt>Lighting</dt>
          <dd>{report.lightingWarning.message}</dd>
        </div>
        <div>
          <dt>Alignment</dt>
          <dd>{report.alignment.message}</dd>
        </div>
      </dl>
      {report.alignment.transform ? (
        <p className="field-note">
          Standard coordinate system {report.alignment.standardCoordinateSystem}: translate {report.alignment.transform.translateX},{" "}
          {report.alignment.transform.translateY}; scale {report.alignment.transform.scale}; rotation{" "}
          {report.alignment.transform.rotationDegrees ?? "unavailable"} degrees.
        </p>
      ) : null}
      {report.blockingMessages.length > 0 ? (
        <ul className="error-list">
          {report.blockingMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {report.blockingMessages.length > 0 ? <RecoveryActionList plans={[getRecoveryPlan("invalidScreenshot")]} title="Screenshot recovery action" /> : null}
      {report.advisoryMessages.length > 0 ? (
        <ul className="message-list">
          {report.advisoryMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {report.retakeInstructions.length > 0 ? (
        <ul className="message-list">
          {report.retakeInstructions.map((instruction) => (
            <li key={instruction.code}>{instruction.message}</li>
          ))}
        </ul>
      ) : null}
      <p className="field-note">These local signals are intake checks only. They do not validate cross-domain match accuracy.</p>
    </div>
  );
}

function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = objectUrl;
  });
}

function createScreenshotPixelSample(imageElement: HTMLImageElement): PixelSample | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(imageElement.naturalWidth, 1);
  canvas.height = Math.max(imageElement.naturalHeight, 1);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    rgba: imageData.data
  };
}

function formatBoundingBox(box: ScreenshotQualityAlignmentReport["faceDetection"]["boundingBox"]) {
  if (!box) return "Unavailable";
  return `${box.x}, ${box.y}, ${box.width} x ${box.height}`;
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
