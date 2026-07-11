"use client";

import { useEffect, useState } from "react";
import { Alert, Card, ScreenHeader, StatusBadge } from "@/components/design-system";

interface MobileQAStatusState {
  secureContext: boolean;
  online: boolean;
  reducedMotion: boolean;
  standalone: boolean;
  viewport: string;
  visualViewport: string;
  orientation: string;
  touchPoints: number;
  cameraApi: boolean;
}

const initialState: MobileQAStatusState = {
  secureContext: false,
  online: true,
  reducedMotion: false,
  standalone: false,
  viewport: "unknown",
  visualViewport: "unknown",
  orientation: "unknown",
  touchPoints: 0,
  cameraApi: false
};

export function MobileQAStatus() {
  const [status, setStatus] = useState<MobileQAStatusState>(initialState);

  useEffect(() => {
    function readStatus() {
      const visualViewport = window.visualViewport;
      setStatus({
        secureContext: window.isSecureContext,
        online: navigator.onLine,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        standalone: window.matchMedia("(display-mode: standalone)").matches,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        visualViewport: visualViewport ? `${Math.round(visualViewport.width)}x${Math.round(visualViewport.height)}` : "not exposed",
        orientation: screen.orientation?.type ?? (window.innerHeight >= window.innerWidth ? "portrait" : "landscape"),
        touchPoints: navigator.maxTouchPoints,
        cameraApi: Boolean(navigator.mediaDevices?.getUserMedia)
      });
    }
    readStatus();
    window.addEventListener("resize", readStatus);
    window.visualViewport?.addEventListener("resize", readStatus);
    window.addEventListener("online", readStatus);
    window.addEventListener("offline", readStatus);
    return () => {
      window.removeEventListener("resize", readStatus);
      window.visualViewport?.removeEventListener("resize", readStatus);
      window.removeEventListener("online", readStatus);
      window.removeEventListener("offline", readStatus);
    };
  }, []);

  const rows = [
    ["Secure context", status.secureContext ? "HTTPS or localhost" : "Not secure"],
    ["Online", status.online ? "Online" : "Offline"],
    ["Camera API", status.cameraApi ? "Available" : "Unavailable"],
    ["Reduced motion", status.reducedMotion ? "Reduce" : "No preference"],
    ["Standalone display", status.standalone ? "Standalone" : "Browser tab"],
    ["Layout viewport", status.viewport],
    ["Visual viewport", status.visualViewport],
    ["Orientation", status.orientation],
    ["Touch points", String(status.touchPoints)]
  ];

  return (
    <section className="screen-stack" aria-labelledby="mobile-qa-title">
      <ScreenHeader eyebrow="Development-only QA" title="Mobile browser status" id="mobile-qa-title">
        <p>This local page shows browser readiness signals only. It does not display images, face measurements, profile attributes, or catalog fixtures.</p>
      </ScreenHeader>
      <Alert title="No sensitive data" tone="info">
        Use this page during real-device QA to confirm secure context, visual viewport changes, orientation, offline state, and reduced-motion preferences.
      </Alert>
      <div className="result-grid">
        {rows.map(([label, value]) => (
          <Card key={label}>
            <div className="status-row">
              <h2>{label}</h2>
              <StatusBadge tone={value.includes("Unavailable") || value.includes("Not secure") || value.includes("Offline") ? "warning" : "success"}>
                {value}
              </StatusBadge>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
