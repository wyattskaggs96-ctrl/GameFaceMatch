"use client";

import { useState } from "react";
import { Alert, Button, LoadingState, ScreenHeader } from "@/components/design-system";
import type { BrowserCameraService, BrowserCapabilityReport } from "@/lib/capture/browser-camera-service";

const initialReport: BrowserCapabilityReport = {
  secureContext: "secureContextAvailable",
  cameraApi: "cameraApiUnsupported",
  permission: "permissionNotRequested",
  device: "cameraUnavailable",
  fallback: "fileUploadFallbackAvailable",
  summary: "permissionNotRequested",
  availableCameras: [],
  messages: ["Camera status has not been checked yet.", "File-upload fallback available."]
};

export function BrowserCapabilityPanel({
  cameraService,
  onContinue
}: {
  cameraService: BrowserCameraService;
  onContinue: () => void;
}) {
  const [report, setReport] = useState<BrowserCapabilityReport>(initialReport);
  const [isLoading, setIsLoading] = useState(false);

  async function checkCapability() {
    setIsLoading(true);
    const nextReport = await cameraService.getCapabilityReport();
    setReport(nextReport);
    setIsLoading(false);
  }

  return (
    <section className="screen-stack narrow" aria-labelledby="browser-capability-title">
      <ScreenHeader eyebrow="Browser capability" title="Camera or upload" id="browser-capability-title">
        <p>
          Live camera preview is optional in this foundation. Browser camera access requires HTTPS or localhost; every required angle has a manual upload
          fallback. Upload fallback is still an RGB-only workflow and does not add depth or TrueDepth geometry.
        </p>
      </ScreenHeader>
      {isLoading ? <LoadingState label="Checking browser capability" /> : null}
      <Alert title={isLoading ? "Checking browser..." : report.messages[0]} tone={report.summary === "permissionDenied" ? "danger" : "info"}>
        RGB browser capture is not equivalent to native iPhone TrueDepth capture. If secure camera access is unavailable, continue with upload fallback.
      </Alert>
      <div className="metadata-list capability-list" aria-label="Browser capability details">
        <div>
          <span>Secure context</span>
          <strong>{report.secureContext}</strong>
        </div>
        <div>
          <span>Camera API</span>
          <strong>{report.cameraApi}</strong>
        </div>
        <div>
          <span>Permission</span>
          <strong>{report.permission}</strong>
        </div>
        <div>
          <span>Device</span>
          <strong>{report.device}</strong>
        </div>
        <div>
          <span>Fallback</span>
          <strong>{report.fallback}</strong>
        </div>
        <div>
          <span>Camera count</span>
          <strong>{report.availableCameras.length}</strong>
        </div>
      </div>
      {report.summary === "insecureContext" || report.summary === "cameraApiUnsupported" || report.summary === "cameraUnavailable" || report.summary === "noMatchingCameraDevice" ? (
        <Alert title="Use upload fallback" tone="warning">
          {report.summary === "insecureContext"
            ? "Camera preview is blocked outside HTTPS or localhost. Open the app from a secure origin or continue with image upload."
            : null}
          {report.summary === "cameraApiUnsupported"
            ? "This browser does not expose the camera API needed for live preview. Continue with image upload for each required angle."
            : null}
          {report.summary === "cameraUnavailable"
            ? "No usable camera was found. Continue with image upload from the camera roll or another local image source."
            : null}
          {report.summary === "noMatchingCameraDevice"
            ? "A front-facing camera could not be confirmed. You can still try camera preview or use upload fallback."
            : null}
        </Alert>
      ) : null}
      {report.summary === "permissionDenied" || report.summary === "permissionBlocked" ? (
        <Alert title="Permission recovery" tone="warning">
          On iPhone Safari, open Settings, Safari, Camera, then allow or reset camera access for this site. On Android Chrome, use the lock icon in the address
          bar, Site settings, Camera, then allow or reset the permission. Reload this page and tap Check again, or use upload fallback for every angle.
        </Alert>
      ) : null}
      <div className="button-row">
        <Button variant="secondary" onClick={checkCapability}>
          Check again
        </Button>
        <Button onClick={onContinue}>
          Continue to guided capture
        </Button>
      </div>
    </section>
  );
}
