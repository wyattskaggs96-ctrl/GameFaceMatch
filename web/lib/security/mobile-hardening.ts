export interface BrowserSupportEntry {
  browser: string;
  capturePath: "camera-and-upload" | "upload-fallback";
  notes: string;
  tested: "automated" | "manual-required";
}

export const PRODUCTION_SOURCE_MAP_DECISION = {
  enabled: false,
  reason: "Production browser source maps are disabled for the local MVP hardening pass to avoid exposing more client implementation detail than necessary."
} as const;

export const PWA_READINESS_DECISION = {
  manifestProvided: true,
  serviceWorkerProvided: false,
  offlineClaim: "No offline guarantee. Without a service worker, the app should be treated as online/local-dev only even if a browser cache keeps assets briefly."
} as const;

export const SECURE_CONTEXT_CAMERA_NOTE =
  "Browser camera access generally requires HTTPS or localhost. In insecure contexts, use the per-angle file-upload fallback.";

export const BROWSER_SUPPORT_MATRIX: BrowserSupportEntry[] = [
  {
    browser: "iOS Safari",
    capturePath: "camera-and-upload",
    notes: "Requires a secure origin or localhost-equivalent development setup. Camera permissions and memory limits must be tested on device.",
    tested: "manual-required"
  },
  {
    browser: "Chrome for Android",
    capturePath: "camera-and-upload",
    notes: "Expected to support getUserMedia on secure origins; upload fallback remains available.",
    tested: "manual-required"
  },
  {
    browser: "Desktop Chrome, Edge, Safari, Firefox",
    capturePath: "camera-and-upload",
    notes: "Camera behavior depends on secure origin, permission state, and available camera devices.",
    tested: "manual-required"
  },
  {
    browser: "Unsupported or insecure browser",
    capturePath: "upload-fallback",
    notes: "The five required angles can be completed with image uploads when camera APIs are unavailable.",
    tested: "automated"
  }
];

export const NETWORK_UPLOAD_SURFACES: string[] = [];
