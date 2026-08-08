import { describe, expect, it } from "vitest";
import {
  evaluateMobileScanRuntime,
  getCameraBlockedRecoverySteps,
  getMobileScanLifecycleNotice,
  shouldAutoAdvanceFromPositioning,
  isCameraSecureContext
} from "@/lib/capture/mobile-safari-scan-hardening";

describe("mobile Safari guided scan hardening", () => {
  it("requires a secure browser context for camera access outside localhost", () => {
    expect(isCameraSecureContext({ isSecureContext: false, protocol: "http:", hostname: "example.com" })).toBe(false);
    expect(isCameraSecureContext({ isSecureContext: false, protocol: "http:", hostname: "localhost" })).toBe(true);
    expect(isCameraSecureContext({ isSecureContext: true, protocol: "https:", hostname: "gamefacematch.test" })).toBe(true);
  });

  it("detects iPhone Safari portrait state and reduced-motion warnings", () => {
    const state = evaluateMobileScanRuntime({
      isSecureContext: true,
      protocol: "https:",
      hostname: "trial.gamefacematch.test",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      innerWidth: 390,
      innerHeight: 844,
      orientationType: "portrait-primary",
      prefersReducedMotion: true,
      online: true
    });

    expect(state.isLikelyIPhoneSafari).toBe(true);
    expect(state.isPortrait).toBe(true);
    expect(state.warnings).toContain("Reduced Motion is on. Decorative motion is minimized; scan progress still requires accepted face coverage.");
  });

  it("treats rendered portrait iPhone-sized viewports as portrait even when orientation API is stale", () => {
    for (const viewport of [
      { innerWidth: 390, innerHeight: 844 },
      { innerWidth: 430, innerHeight: 932 },
      { innerWidth: 438, innerHeight: 841 }
    ]) {
      const state = evaluateMobileScanRuntime({
        isSecureContext: true,
        protocol: "https:",
        hostname: "trial.gamefacematch.test",
        userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
        ...viewport,
        visualViewportWidth: viewport.innerWidth,
        visualViewportHeight: viewport.innerHeight,
        orientationType: "landscape-primary",
        prefersReducedMotion: false,
        online: true
      });

      expect(state.isPortrait, `${viewport.innerWidth}x${viewport.innerHeight}`).toBe(true);
      expect(state.warnings).not.toContain("Rotate the phone to portrait before starting the guided scan.");
    }
  });

  it("keeps true landscape viewports behind rotate guidance", () => {
    const state = evaluateMobileScanRuntime({
      isSecureContext: true,
      protocol: "https:",
      hostname: "trial.gamefacematch.test",
      userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
      innerWidth: 844,
      innerHeight: 390,
      visualViewportWidth: 844,
      visualViewportHeight: 390,
      orientationType: "portrait-primary",
      prefersReducedMotion: false,
      online: true
    });

    expect(state.isPortrait).toBe(false);
    expect(state.warnings).toContain("Rotate the phone to portrait before starting the guided scan.");
  });

  it("auto-advances positioning only after camera, quality, and portrait gates pass", () => {
    expect(shouldAutoAdvanceFromPositioning({ streamActive: true, circularCanBegin: true, cameraError: false, isPortrait: true })).toBe(true);
    expect(shouldAutoAdvanceFromPositioning({ streamActive: false, circularCanBegin: true, cameraError: false, isPortrait: true })).toBe(false);
    expect(shouldAutoAdvanceFromPositioning({ streamActive: true, circularCanBegin: false, cameraError: false, isPortrait: true })).toBe(false);
    expect(shouldAutoAdvanceFromPositioning({ streamActive: true, circularCanBegin: true, cameraError: true, isPortrait: true })).toBe(false);
    expect(shouldAutoAdvanceFromPositioning({ streamActive: true, circularCanBegin: true, cameraError: false, isPortrait: false })).toBe(false);
  });

  it("warns for landscape orientation and insecure remote links", () => {
    const state = evaluateMobileScanRuntime({
      isSecureContext: false,
      protocol: "http:",
      hostname: "trial.gamefacematch.test",
      userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
      innerWidth: 844,
      innerHeight: 390,
      orientationType: "landscape-primary",
      prefersReducedMotion: false,
      online: false
    });

    expect(state.secureContext).toBe(false);
    expect(state.isPortrait).toBe(false);
    expect(state.warnings).toEqual(
      expect.arrayContaining([
        "Camera access requires HTTPS or localhost. Open the private trial from a secure website link.",
        "Rotate the phone to portrait before starting the guided scan.",
        "You are offline. Capture remains local, but resume and catalog checks may need the network later."
      ])
    );
  });

  it("provides iPhone Safari camera recovery steps without claiming TrueDepth or Face ID", () => {
    const steps = getCameraBlockedRecoverySteps({ isLikelyIPhoneSafari: true, secureContext: false });
    expect(steps.join(" ")).toMatch(/HTTPS/);
    expect(steps.join(" ")).toMatch(/Settings, Safari, Camera/);
    expect(steps.join(" ")).not.toMatch(/Face ID|TrueDepth|authentication/i);
  });

  it("keeps lifecycle recovery language focused on resume and cleanup", () => {
    expect(getMobileScanLifecycleNotice("visibilityHidden")).toMatch(/Camera preview paused/);
    expect(getMobileScanLifecycleNotice("pageShow")).toMatch(/Review completed angles/);
    expect(getMobileScanLifecycleNotice("online")).toMatch(/No raw face media was uploaded/);
  });
});
