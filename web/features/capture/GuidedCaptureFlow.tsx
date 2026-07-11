"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, ProgressBar, ScreenHeader, StatusBadge } from "@/components/design-system";
import { CameraAccessError, type BrowserCameraService, type CameraDeviceOption, type CameraFacingMode } from "@/lib/capture/browser-camera-service";
import {
  cancelCaptureSession,
  getCompletedAngleCount,
  getCurrentAngle,
  removeAngleCapture,
  retakeAngle,
  setAngleCapture,
  setAngleError,
  setAngleManualConfirmation,
  setCurrentAngle,
  type ActiveCaptureSession
} from "@/lib/capture/capture-session";
import { applyManualConfirmationToReport, createBrowserImageQualityService, createCaptureReviewReport } from "@/lib/capture/image-quality-service";
import { createTemporaryImageReference, isHeicOrHeif, prepareImageForAnalysis, validateImageFile } from "@/lib/capture/image-validation";
import type { CapturedAngle, CapturedAngleID, CaptureSource } from "@/types/domain";

export function GuidedCaptureFlow({
  session,
  cameraService,
  onSessionChange,
  onCancelSession,
  onContinue
}: {
  session: ActiveCaptureSession;
  cameraService: BrowserCameraService;
  onSessionChange: (session: ActiveCaptureSession) => void;
  onCancelSession: (session: ActiveCaptureSession) => void;
  onContinue: () => void;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [captureMode, setCaptureMode] = useState<"camera" | "upload">("camera");
  const [cameraDevices, setCameraDevices] = useState<CameraDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [selectedFacingMode, setSelectedFacingMode] = useState<CameraFacingMode>("user");
  const [lifecycleNotice, setLifecycleNotice] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const qualityService = useMemo(() => createBrowserImageQualityService(), []);
  const currentAngle = getCurrentAngle(session);
  const reviewReport = createCaptureReviewReport(session.angles);
  const completedAngles = getCompletedAngleCount(session.angles);
  const hasActiveCaptureData = completedAngles > 0 || Boolean(stream);
  const previewIsMirrored = selectedFacingMode === "user";

  useEffect(() => {
    return () => {
      if (stream) {
        cameraService.stopCameraPreview(stream);
      }
    };
  }, [cameraService, stream]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stopCamera();
        setLifecycleNotice("Camera preview paused because the page was backgrounded, locked, or interrupted. Restart camera before capturing the next still.");
      }
      if (document.visibilityState === "visible" && hasActiveCaptureData) {
        setLifecycleNotice("Capture session restored. Review completed angles and restart the camera if you want to continue live capture.");
      }
    }
    function handlePageHide() {
      stopCamera();
      setLifecycleNotice("Camera tracks were stopped while the page was hidden.");
    }
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted || hasActiveCaptureData) {
        setLifecycleNotice("Page restored. Temporary image references may need review on low-memory mobile browsers.");
      }
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasActiveCaptureData) return;
      event.preventDefault();
      event.returnValue = "An active GameFace Match capture session is in progress.";
    }
    function handleOffline() {
      setIsOffline(true);
      setLifecycleNotice("Browser is offline. The current MVP stays local, but camera permissions and reload behavior can vary by browser.");
    }
    function handleOnline() {
      setIsOffline(false);
      setLifecycleNotice("Browser is online again. No capture images were uploaded.");
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [hasActiveCaptureData, stream]);

  async function startCamera() {
    setCameraError(null);
    setLifecycleNotice(null);
    setIsStartingCamera(true);
    try {
      stopCamera();
      const nextStream = await cameraService.requestCameraPreview({
        deviceId: selectedDeviceId || undefined,
        facingMode: selectedDeviceId ? undefined : selectedFacingMode
      });
      setStream(nextStream);
      const nextDevices = await cameraService.getCameraDevices();
      setCameraDevices(nextDevices);
      const trackSettings = nextStream.getVideoTracks()[0]?.getSettings();
      const activeDevice = nextDevices.find((device) => device.deviceId === trackSettings?.deviceId);
      if (activeDevice?.deviceId) setSelectedDeviceId(activeDevice.deviceId);
      if (activeDevice?.facingMode === "user" || activeDevice?.facingMode === "environment") setSelectedFacingMode(activeDevice.facingMode);
      setCaptureMode("camera");
    } catch (error) {
      setCameraError(error instanceof CameraAccessError ? error.message : "Camera could not be started. Upload fallback remains available.");
      setCaptureMode("upload");
    } finally {
      setIsStartingCamera(false);
    }
  }

  async function switchCamera() {
    const availableDevices = cameraDevices.length > 0 ? cameraDevices : await cameraService.getCameraDevices();
    setCameraDevices(availableDevices);
    if (availableDevices.length > 1) {
      const currentIndex = Math.max(
        availableDevices.findIndex((device) => device.deviceId === selectedDeviceId),
        0
      );
      const nextDevice = availableDevices[(currentIndex + 1) % availableDevices.length];
      setSelectedDeviceId(nextDevice.deviceId);
      if (nextDevice.facingMode === "user" || nextDevice.facingMode === "environment") setSelectedFacingMode(nextDevice.facingMode);
    } else {
      setSelectedDeviceId("");
      setSelectedFacingMode((mode) => (mode === "user" ? "environment" : "user"));
    }
    setLifecycleNotice("Camera selection changed. Start camera again to use the new selection.");
    stopCamera();
  }

  function stopCamera() {
    if (stream) {
      cameraService.stopCameraPreview(stream);
    }
    setStream(null);
  }

  async function captureStillFrame() {
    const video = videoRef.current;
    if (!video || !stream || video.videoWidth === 0 || video.videoHeight === 0) {
      onSessionChange(setAngleError(session, currentAngle.id, ["Camera preview is not ready. Try again or upload an image."]));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      onSessionChange(setAngleError(session, currentAngle.id, ["The browser could not capture a still frame."]));
      return;
    }
    if (previewIsMirrored) {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      onSessionChange(setAngleError(session, currentAngle.id, ["The browser could not create a still image."]));
      return;
    }
    const file = new File([blob], `${currentAngle.id}-${Date.now()}.jpg`, { type: "image/jpeg" });
    const objectUrl = URL.createObjectURL(file);
    try {
      const imageElement = await readImageElement(objectUrl);
      await processFileForAngle(currentAngle.id, file, objectUrl, "camera", imageElement);
    } catch {
      URL.revokeObjectURL(objectUrl);
      onSessionChange(setAngleError(session, currentAngle.id, ["The captured image could not be decoded."]));
    }
  }

  async function handleFile(angle: CapturedAngle, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    if (isHeicOrHeif(file.name, file.type)) {
      onSessionChange(
        setAngleError(session, angle.id, [
          "HEIC/HEIF images are not supported in this web MVP. Export or upload JPEG, PNG, or WebP instead."
        ])
      );
      event.currentTarget.value = "";
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      const imageElement = await readImageElement(objectUrl);
      const prepared = await prepareImageForAnalysis({ file, objectUrl, imageElement });
      if (prepared.originalObjectUrl) URL.revokeObjectURL(prepared.originalObjectUrl);
      await processFileForAngle(angle.id, prepared.file, prepared.objectUrl, "upload", prepared.imageElement, prepared);
    } catch {
      URL.revokeObjectURL(objectUrl);
      onSessionChange(setAngleError(session, angle.id, ["The image could not be read."]));
    } finally {
      event.currentTarget.value = "";
    }
  }

  async function processFileForAngle(
    angleID: CapturedAngleID,
    file: File,
    objectUrl: string,
    source: CaptureSource,
    imageElement: HTMLImageElement,
    processing?: Awaited<ReturnType<typeof prepareImageForAnalysis>>
  ) {
    const dimensions = { width: imageElement.naturalWidth, height: imageElement.naturalHeight };
    const validation = await validateImageFile(file, dimensions, session.angles.filter((item) => item.id !== angleID), angleID, source, objectUrl);
    if (validation.errors.length > 0) {
      URL.revokeObjectURL(objectUrl);
      onSessionChange(setAngleError(session, angleID, validation.errors));
      return;
    }
    const existingAngle = session.angles.find((angle) => angle.id === angleID);
    const image = createTemporaryImageReference(
      {
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        originalWidth: processing?.originalWidth,
        originalHeight: processing?.originalHeight,
        originalFileSizeBytes: processing?.originalFileSizeBytes,
        processingNotes: processing?.processingNotes,
        wasDownscaled: processing?.wasDownscaled,
        source,
        associatedAngleID: angleID,
        objectUrl,
        signature: validation.signature
      },
      validation.signature
    );
    const imageQualityReport = qualityService.analyzeImageElement({
      image,
      imageElement,
      existingAngles: session.angles.filter((item) => item.id !== angleID),
      manualConfirmation: existingAngle?.manualConfirmation
    });
    const mutation = setAngleCapture(
      session,
      angleID,
      image,
      source,
      imageQualityReport
    );
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onSessionChange(mutation.session);
  }

  function selectAngle(angleID: CapturedAngleID) {
    onSessionChange(setCurrentAngle(session, angleID));
  }

  function retake(angleID: CapturedAngleID) {
    const mutation = retakeAngle(session, angleID);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onSessionChange(mutation.session);
  }

  function remove(angleID: CapturedAngleID) {
    const mutation = removeAngleCapture(session, angleID);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onSessionChange(mutation.session);
  }

  function updateManualConfirmation(angle: CapturedAngle, key: keyof CapturedAngle["manualConfirmation"], checked: boolean) {
    const nextConfirmation = {
      ...angle.manualConfirmation,
      [key]: checked
    };
    const nextReport = angle.qualityReport ? applyManualConfirmationToReport(angle.qualityReport, nextConfirmation) : undefined;
    onSessionChange(setAngleManualConfirmation(session, angle.id, { [key]: checked }, nextReport));
  }

  function cancelSession() {
    stopCamera();
    const mutation = cancelCaptureSession(session);
    revokeObjectUrls(mutation.objectUrlsToRevoke);
    onCancelSession(mutation.session);
  }

  return (
    <section className="screen-stack" aria-labelledby="guided-capture-title">
      <ScreenHeader eyebrow="Guided capture" title={`${completedAngles} of 5 angles completed`} id="guided-capture-title">
        <p>
          Capture five RGB images. This does not perform identity recognition, face matching, TrueDepth capture, ARKit capture, 3D reconstruction, or
          advanced facial analysis.
        </p>
      </ScreenHeader>
      <ProgressBar value={completedAngles} max={5} label="Required RGB angles" />
      <div className="capture-workspace">
        <Card className="camera-panel">
          <div className="status-row">
            <div>
              <p className="eyebrow">Current angle</p>
              <h2>{currentAngle.label}</h2>
            </div>
            <StatusBadge tone={currentAngle.status === "complete" ? "success" : currentAngle.status === "error" ? "danger" : "info"}>
              {currentAngle.status}
            </StatusBadge>
          </div>
          <p>{currentAngle.instruction}</p>
          <Alert title="Mobile capture guidance" tone="info">
            Use portrait orientation when possible. The front-camera preview is mirrored like a selfie view, but captured still images are stored unmirrored for
            review. Browser RGB capture is not TrueDepth.
          </Alert>
          {isOffline ? (
            <Alert title="Offline" tone="warning">
              The app is offline. Capture images remain local; no upload service exists.
            </Alert>
          ) : null}
          {lifecycleNotice ? (
            <Alert title="Mobile session notice" tone="warning" role="status">
              {lifecycleNotice}
            </Alert>
          ) : null}
          <div className="camera-preview" data-active={Boolean(stream)} data-mirrored={previewIsMirrored}>
            {stream ? (
              <video ref={videoRef} autoPlay playsInline muted aria-label={`${currentAngle.label} camera preview`} />
            ) : (
              <div className="camera-placeholder" aria-live="polite">
                <strong>Camera preview stopped</strong>
                <span>Start the camera or skip to file upload for this angle.</span>
              </div>
            )}
          </div>
          {cameraError ? (
            <Alert title="Camera unavailable" tone="warning" role="alert">
              {cameraError}
            </Alert>
          ) : null}
          <div className="button-row">
            <Button onClick={() => void startCamera()} disabled={isStartingCamera}>
              {isStartingCamera ? "Starting camera" : "Start camera"}
            </Button>
            <Button variant="secondary" onClick={stopCamera} disabled={!stream}>
              Stop camera
            </Button>
            <Button variant="secondary" onClick={() => void switchCamera()}>
              Switch camera
            </Button>
            <Button variant="secondary" onClick={() => void captureStillFrame()} disabled={!stream}>
              Capture still frame
            </Button>
            <Button variant="ghost" onClick={() => setCaptureMode("upload")}>
              Skip to file upload
            </Button>
          </div>
          {captureMode === "upload" ? (
            <label className="form-field">
              <span>Upload {currentAngle.label.toLowerCase()} image</span>
              <input
                className="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture="user"
                onChange={(event) => void handleFile(currentAngle, event)}
              />
            </label>
          ) : null}
          <div className="metadata-list capability-list" aria-label="Camera selection details">
            <div>
              <span>Preferred camera</span>
              <strong>{selectedFacingMode === "user" ? "Front/selfie" : "Rear/environment"}</strong>
            </div>
            <div>
              <span>Preview mirror</span>
              <strong>{previewIsMirrored ? "Mirrored preview, unmirrored capture" : "Unmirrored preview and capture"}</strong>
            </div>
            <div>
              <span>Available cameras</span>
              <strong>{cameraDevices.length}</strong>
            </div>
          </div>
          {cameraError ? (
            <Alert title="Permission reset help" tone="info">
              iPhone Safari: Settings, Safari, Camera, then allow or reset this site. Android Chrome: lock icon, Site settings, Camera, then allow or reset.
            </Alert>
          ) : null}
        </Card>
        <div className="angle-list" aria-label="Required capture angles">
          {session.angles.map((angle) => (
            <Card className="capture-card" tone={angle.status === "error" ? "danger" : angle.status === "complete" ? "success" : "neutral"} key={angle.id}>
              <div className="status-row">
                <h2>{angle.label}</h2>
                <StatusBadge tone={angle.status === "error" ? "danger" : angle.status === "complete" ? "success" : "neutral"}>
                  {angle.status}
                </StatusBadge>
              </div>
              <p>{angle.instruction}</p>
              {angle.image ? (
                <p className="field-note">
                  {angle.image.fileName} | {angle.image.width}x{angle.image.height} | {angle.image.source}
                </p>
              ) : null}
              {angle.validationErrors.length > 0 ? (
                <ul className="error-list">
                  {angle.validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              <label className="form-field">
                <span className="small-text">Upload fallback for {angle.label.toLowerCase()}</span>
                <input
                  className="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  capture="user"
                  onChange={(event) => void handleFile(angle, event)}
                />
              </label>
              <div className="button-row compact-buttons">
                <Button variant="secondary" onClick={() => selectAngle(angle.id)}>
                  Make current
                </Button>
                <Button variant="secondary" onClick={() => retake(angle.id)}>
                  Retake
                </Button>
                <Button variant="ghost" onClick={() => remove(angle.id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Card className="capture-review-card">
        <div className="section-heading">
          <p className="eyebrow">Capture review</p>
          <h2>Resolve blocking issues, then confirm what the browser cannot detect</h2>
          <p className="supporting">
            Brightness, exposure, blur, dimensions, file size, and exact duplicates are browser-side checks. Face centering, head pose, expression neutrality,
            and one-person visibility are manual confirmations in this build.
          </p>
        </div>
        <div className="review-grid" aria-label="Per-angle image quality review">
          {session.angles.map((angle) => {
            const report = reviewReport.angleReports[angle.id];
            return (
              <article className="quality-review-card" key={angle.id} aria-labelledby={`${angle.id}-review-title`}>
                <div className="status-row">
                  <div>
                    <p className="eyebrow">{angle.status === "complete" ? "Image present" : "Image needed"}</p>
                    <h3 id={`${angle.id}-review-title`}>{angle.label}</h3>
                  </div>
                  <StatusBadge tone={report.overallState === "blocked" ? "danger" : report.overallState === "ready" ? "success" : "warning"}>
                    {report.overallState}
                  </StatusBadge>
                </div>
                {angle.image ? (
                  <img className="capture-thumb" src={angle.image.objectUrl} alt={`${angle.label} captured preview`} />
                ) : (
                  <div className="empty-thumb">No image selected</div>
                )}
                <dl className="quality-metrics" aria-label={`${angle.label} quality metrics`}>
                  <div>
                    <dt>Size</dt>
                    <dd>
                      {report.width.value}x{report.height.value}
                    </dd>
                  </div>
                  <div>
                    <dt>File</dt>
                    <dd>{formatBytes(report.fileSizeBytes.value)}</dd>
                  </div>
                  <div>
                    <dt>Brightness</dt>
                    <dd>{formatMetric(report.brightnessEstimate.value)}</dd>
                  </div>
                  <div>
                    <dt>Sharpness</dt>
                    <dd>{formatMetric(report.sharpnessEstimate.value)}</dd>
                  </div>
                  <div>
                    <dt>Orientation</dt>
                    <dd>{report.orientation.value}</dd>
                  </div>
                  <div>
                    <dt>Processing</dt>
                    <dd>{angle.image?.wasDownscaled ? "Downscaled" : "Original size"}</dd>
                  </div>
                  <div>
                    <dt>Duplicate</dt>
                    <dd>{report.duplicateImage.value ? "Yes" : "No"}</dd>
                  </div>
                </dl>
                {report.blockingMessages.length > 0 ? (
                  <div>
                    <p className="message-title">Blocking</p>
                    <ul className="message-list blocking-list">
                      {report.blockingMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {report.advisoryMessages.length > 0 ? (
                  <div>
                    <p className="message-title">Advisory</p>
                    <ul className="message-list advisory-list">
                      {report.advisoryMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <fieldset className="confirmation-list">
                  <legend>Manual confirmations</legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={angle.manualConfirmation.requestedAngle}
                      onChange={(event) => updateManualConfirmation(angle, "requestedAngle", event.currentTarget.checked)}
                    />
                    Requested angle followed
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={angle.manualConfirmation.neutralExpression}
                      onChange={(event) => updateManualConfirmation(angle, "neutralExpression", event.currentTarget.checked)}
                    />
                    Neutral expression, lips gently closed
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={angle.manualConfirmation.onePerson}
                      onChange={(event) => updateManualConfirmation(angle, "onePerson", event.currentTarget.checked)}
                    />
                    One person visible
                  </label>
                </fieldset>
                <label className="form-field">
                  <span className="small-text">Replace upload for {angle.label.toLowerCase()}</span>
                <input
                  className="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  capture="user"
                    onChange={(event) => void handleFile(angle, event)}
                  />
                </label>
                <div className="button-row compact-buttons">
                  <Button variant="secondary" onClick={() => retake(angle.id)}>
                    Retake
                  </Button>
                  <Button variant="ghost" onClick={() => remove(angle.id)}>
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
      {reviewReport.canContinue ? (
        <Alert title="Blocking checks resolved" tone="success">
          Required RGB images are present and blocking browser checks have passed. Advisory items remain honest guidance, not facial analysis.
        </Alert>
      ) : (
        <Alert title="Capture needs attention" tone="warning" role="alert">
          Resolve missing images, unsupported files, unreadable images, undersized images, oversized files, or exact duplicate angle images before continuing.
        </Alert>
      )}
      <div className="button-row">
        <Button disabled={!reviewReport.canContinue} onClick={onContinue}>
          Continue to attribute confirmation
        </Button>
        <Button variant="danger" onClick={cancelSession}>
          Cancel session and delete temporary images
        </Button>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {completedAngles} of 5 required capture angles completed. Current angle is {currentAngle.label}.
      </div>
    </section>
  );
}

function readImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unreadable image"));
    image.src = objectUrl;
  });
}

function revokeObjectUrls(objectUrls: string[]) {
  objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
}

function formatBytes(value: number) {
  if (value <= 0) return "0 B";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round((value / (1024 * 1024)) * 10) / 10} MB`;
}

function formatMetric(value: number | null) {
  return value === null ? "Not measured" : String(value);
}
