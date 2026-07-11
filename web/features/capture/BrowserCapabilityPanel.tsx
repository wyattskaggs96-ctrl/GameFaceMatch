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
          fallback.
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
      </div>
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
