import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";
import nextConfig from "../next.config";
import {
  BROWSER_SUPPORT_MATRIX,
  NETWORK_UPLOAD_SURFACES,
  PRODUCTION_SOURCE_MAP_DECISION,
  PWA_READINESS_DECISION,
  SECURE_CONTEXT_CAMERA_NOTE
} from "@/lib/security/mobile-hardening";

describe("security headers and production debugging posture", () => {
  it("configures CSP, permissions policy, frame blocking, and source map suppression", async () => {
    expect(nextConfig.productionBrowserSourceMaps).toBe(false);
    expect(PRODUCTION_SOURCE_MAP_DECISION.enabled).toBe(false);

    const headers = (await nextConfig.headers?.()) ?? [];
    const headerMap = Object.fromEntries(headers[0].headers.map((header) => [header.key, header.value]));
    expect(headerMap["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headerMap["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headerMap["Content-Security-Policy"]).toContain("img-src 'self' blob: data:");
    expect(headerMap["Permissions-Policy"]).toContain("camera=(self)");
    expect(headerMap["Permissions-Policy"]).toContain("microphone=()");
    expect(headerMap["X-Content-Type-Options"]).toBe("nosniff");
    expect(headerMap["Referrer-Policy"]).toBe("no-referrer");
  });

  it("keeps client code free of obvious upload APIs", () => {
    expect(NETWORK_UPLOAD_SURFACES).toEqual([]);
    const sourceRoots = ["app", "components", "features", "lib", "services", "storage", "game-adapters", "catalog"];
    const sourceText = sourceRoots
      .map((root) => path.join(process.cwd(), root))
      .filter((root) => fs.existsSync(root))
      .flatMap(listFiles)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    const fetchCalls = sourceText.match(/\bfetch\s*\([^\n]+/g) ?? [];
    expect(fetchCalls.every((call) => call.includes("modelPath"))).toBe(true);
    expect(sourceText).toContain('method: "HEAD"');
    expect(sourceText).not.toMatch(/method:\s*["']POST["']/i);
    expect(sourceText).not.toMatch(/method:\s*["']PUT["']/i);
    expect(sourceText).not.toMatch(/method:\s*["']PATCH["']/i);
    expect(fetchCalls.join("\n")).not.toMatch(/https?:\/\//i);
    expect(sourceText).not.toMatch(/\bXMLHttpRequest\b/);
    expect(sourceText).not.toMatch(/\bsendBeacon\b/);
    expect(sourceText).not.toMatch(/\bWebSocket\s*\(/);
  });
});

describe("PWA and mobile browser testing posture", () => {
  it("provides a manifest without claiming offline support", () => {
    const appManifest = manifest();
    expect(appManifest.name).toBe("GameFace Match");
    expect(appManifest.display).toBe("standalone");
    expect(PWA_READINESS_DECISION.manifestProvided).toBe(true);
    expect(PWA_READINESS_DECISION.serviceWorkerProvided).toBe(false);
    expect(PWA_READINESS_DECISION.offlineClaim).toMatch(/No offline guarantee/i);
  });

  it("documents secure-context and browser support limitations", () => {
    expect(SECURE_CONTEXT_CAMERA_NOTE).toMatch(/HTTPS or localhost/);
    expect(BROWSER_SUPPORT_MATRIX.map((entry) => entry.browser)).toEqual([
      "iOS Safari",
      "Chrome for Android",
      "Desktop Chrome, Edge, Safari, Firefox",
      "Unsupported or insecure browser"
    ]);
    expect(BROWSER_SUPPORT_MATRIX.find((entry) => entry.browser === "Unsupported or insecure browser")?.capturePath).toBe("upload-fallback");
    expect(BROWSER_SUPPORT_MATRIX.every((entry) => entry.notes.length > 20)).toBe(true);
  });

  it("keeps mobile, reduced-motion, focus, and touch-target CSS present", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).toContain("@media (max-width: 720px) and (orientation: landscape)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("env(safe-area-inset-bottom");
    expect(css).toContain(".skip-link");
    expect(css).toContain("min-height: 48px");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});

function listFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
