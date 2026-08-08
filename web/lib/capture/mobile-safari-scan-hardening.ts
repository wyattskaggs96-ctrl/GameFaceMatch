export type MobileScanLifecycleEvent = "visibilityHidden" | "visibilityVisible" | "pageHide" | "pageShow" | "offline" | "online";

export interface MobileScanRuntimeInput {
  isSecureContext: boolean;
  protocol: string;
  hostname: string;
  userAgent: string;
  innerWidth: number;
  innerHeight: number;
  visualViewportWidth?: number;
  visualViewportHeight?: number;
  orientationType?: string;
  prefersReducedMotion: boolean;
  online: boolean;
}

export interface MobileScanRuntimeState {
  secureContext: boolean;
  isLikelyIPhoneSafari: boolean;
  isPortrait: boolean;
  reducedMotion: boolean;
  online: boolean;
  viewportWidth: number;
  viewportHeight: number;
  warnings: string[];
}

export function evaluateMobileScanRuntime(input: MobileScanRuntimeInput): MobileScanRuntimeState {
  const viewportWidth = Math.round(input.visualViewportWidth ?? input.innerWidth);
  const viewportHeight = Math.round(input.visualViewportHeight ?? input.innerHeight);
  const isPortrait = isRenderedPortrait({
    innerWidth: input.innerWidth,
    innerHeight: input.innerHeight,
    viewportWidth,
    viewportHeight,
    orientationType: input.orientationType
  });
  const secureContext = isCameraSecureContext(input);
  const isLikelyIPhoneSafari = /iPhone/i.test(input.userAgent) && /Safari/i.test(input.userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(input.userAgent);
  const warnings: string[] = [];

  if (!secureContext) {
    warnings.push("Camera access requires HTTPS or localhost. Open the private trial from a secure website link.");
  }
  if (!isPortrait) {
    warnings.push("Rotate the phone to portrait before starting the guided scan.");
  }
  if (viewportWidth < 360) {
    warnings.push("The scan screen is very narrow. Use an iPhone-sized portrait viewport if possible.");
  }
  if (input.prefersReducedMotion) {
    warnings.push("Reduced Motion is on. Decorative motion is minimized; scan progress still requires accepted face coverage.");
  }
  if (!input.online) {
    warnings.push("You are offline. Capture remains local, but resume and catalog checks may need the network later.");
  }

  return {
    secureContext,
    isLikelyIPhoneSafari,
    isPortrait,
    reducedMotion: input.prefersReducedMotion,
    online: input.online,
    viewportWidth,
    viewportHeight,
    warnings
  };
}

export function isRenderedPortrait(input: {
  innerWidth: number;
  innerHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  orientationType?: string;
}) {
  const renderedPortrait = input.viewportHeight > input.viewportWidth || input.innerHeight > input.innerWidth;
  const renderedLandscape = input.viewportWidth > input.viewportHeight && input.innerWidth > input.innerHeight;
  if (renderedPortrait) return true;
  if (renderedLandscape) return false;
  if (input.orientationType?.includes("portrait")) return true;
  if (input.orientationType?.includes("landscape")) return false;
  return input.viewportHeight >= input.viewportWidth;
}

export function shouldAutoAdvanceFromPositioning(input: {
  streamActive: boolean;
  circularCanBegin: boolean;
  cameraError: boolean;
  isPortrait?: boolean;
}) {
  return input.streamActive && input.circularCanBegin && !input.cameraError && input.isPortrait !== false;
}

export function isCameraSecureContext(input: Pick<MobileScanRuntimeInput, "hostname" | "isSecureContext" | "protocol">) {
  return input.isSecureContext || input.protocol === "https:" || input.hostname === "localhost" || input.hostname === "127.0.0.1";
}

export function getCameraBlockedRecoverySteps(input: { isLikelyIPhoneSafari: boolean; secureContext: boolean }) {
  const steps = input.isLikelyIPhoneSafari
    ? [
        "Open the private link in Safari from an HTTPS website.",
        "In Safari, tap AA or the page controls, then Website Settings, then allow Camera.",
        "If Camera is still blocked, open Settings, Safari, Camera, and allow or ask for this website.",
        "Return to the trial link and tap Start Camera again."
      ]
    : [
        "Open the private link from an HTTPS website or localhost.",
        "Use the browser site settings to allow Camera.",
        "Reload the page and tap Start Camera again."
      ];

  if (!input.secureContext) {
    return ["Camera is blocked because this page is not in a secure browser context.", ...steps];
  }
  return steps;
}

export function getMobileScanLifecycleNotice(event: MobileScanLifecycleEvent) {
  const notices: Record<MobileScanLifecycleEvent, string> = {
    visibilityHidden: "Camera preview paused because Safari backgrounded, locked, or interrupted the page. Return and tap Start Camera to continue.",
    visibilityVisible: "Capture session restored. Completed local stills remain in this session; restart the camera only if you need more coverage.",
    pageHide: "Camera tracks were stopped while the page was hidden.",
    pageShow: "Page restored. Review completed angles before retaking anything.",
    offline: "Browser is offline. The scan remains local, but later resume or catalog checks may need network.",
    online: "Browser is online again. No raw face media was uploaded."
  };
  return notices[event];
}
