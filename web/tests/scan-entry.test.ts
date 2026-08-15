import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyCoverageFrame,
  canBeginGuidedCapture,
  createInitialGuidedScanState,
  getGuidedScanCoveragePercent,
  getSecondPassTargets,
  getSelectiveRetakeRegion,
  isDevelopmentGuidedScanSimulationAllowed
} from "@/lib/capture/guided-scan-strategy";
import {
  DEFAULT_SCAN_ENTRY_PLAN_ID,
  SCAN_ENTRY_PLANS,
  evaluateScanEntryStartGate,
  isScanEntryPreviewModeAllowed
} from "@/lib/onboarding/scan-entry";
import { createInitialConsentState, updateConsent, type ConsentID, type ConsentState } from "@/lib/privacy/consent";

describe("mobile scan entry gate", () => {
  it("defaults to Launch Pack and keeps only one selected plan at a time", () => {
    expect(DEFAULT_SCAN_ENTRY_PLAN_ID).toBe("launch_pack");
    expect(SCAN_ENTRY_PLANS.map((plan) => plan.id)).toEqual(["launch_pack", "all_access_annual"]);
    expect(SCAN_ENTRY_PLANS.find((plan) => plan.id === "launch_pack")?.price).toBe("$4.99");
    expect(SCAN_ENTRY_PLANS.find((plan) => plan.id === "all_access_annual")?.price).toBe("$9.99/year");
  });

  it("keeps start disabled until required consent and verified entitlement are present", () => {
    const missingConsent = evaluateScanEntryStartGate({
      selectedPlanID: "launch_pack",
      consentState: createInitialConsentState(),
      billingState: "verifiedEntitlement",
      catalogAvailable: true,
      environment: "production",
      previewModeEnabled: false
    });

    expect(missingConsent).toMatchObject({ allowed: false, reason: "missingConsent" });

    const ready = evaluateScanEntryStartGate({
      selectedPlanID: "all_access_annual",
      consentState: grantRequiredConsent(),
      billingState: "verifiedEntitlement",
      catalogAvailable: true,
      environment: "production",
      previewModeEnabled: false
    });

    expect(ready).toMatchObject({ allowed: true, reason: "ready" });
  });

  it("does not let unverified payment or production preview unlock a scan", () => {
    const consentState = grantRequiredConsent();
    expect(
      evaluateScanEntryStartGate({
        selectedPlanID: "launch_pack",
        consentState,
        billingState: "notConfigured",
        catalogAvailable: true,
        environment: "production",
        previewModeEnabled: false
      })
    ).toMatchObject({ allowed: false, reason: "billingNotConfigured" });

    expect(
      evaluateScanEntryStartGate({
        selectedPlanID: "launch_pack",
        consentState,
        billingState: "previewOnly",
        catalogAvailable: true,
        environment: "production",
        previewModeEnabled: true
      })
    ).toMatchObject({ allowed: false, reason: "previewNotAllowedInProduction" });

    expect(isScanEntryPreviewModeAllowed("development", true)).toBe(true);
    expect(isScanEntryPreviewModeAllowed("production", true)).toBe(false);
  });

  it("does not contain unsupported authentication or depth-capture claims in the new entry source", () => {
    const source = [
      "features/onboarding/ScanEntryScreen.tsx",
      "features/capture/GuidedCaptureFlow.tsx",
      "lib/capture/guided-scan-strategy.ts",
      "lib/onboarding/scan-entry.ts"
    ]
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/facial recognition|identity verification|biometric authentication|Apple-equivalent|uses TrueDepth|uses ARKit|performs 3D reconstruction/i);
  });
});

describe("guided circular scan coverage contract", () => {
  it("requires camera permission and initial quality gates before capture begins", () => {
    const gate = {
      singleFace: true,
      centered: true,
      acceptableDistance: true,
      acceptableLighting: true,
      acceptableSharpness: true,
      neutralExpression: true,
      requiredRegionsVisible: true
    };
    expect(canBeginGuidedCapture(false, gate)).toBe(false);
    expect(canBeginGuidedCapture(true, { ...gate, acceptableLighting: false })).toBe(false);
    expect(canBeginGuidedCapture(true, gate)).toBe(true);
  });

  it("advances progress only from accepted non-duplicate coverage frames", () => {
    const initial = createInitialGuidedScanState();
    const rejected = applyCoverageFrame(initial, {
      passID: "first",
      segmentID: "center",
      timestampMs: 100,
      qualityAccepted: false,
      duplicateAngle: false,
      warnings: ["More light needed."]
    });
    expect(getGuidedScanCoveragePercent(rejected.passes[0])).toBe(0);

    const duplicate = applyCoverageFrame(rejected, {
      passID: "first",
      segmentID: "center",
      timestampMs: 200,
      qualityAccepted: true,
      duplicateAngle: true,
      warnings: []
    });
    expect(getGuidedScanCoveragePercent(duplicate.passes[0])).toBe(0);

    const accepted = applyCoverageFrame(duplicate, {
      passID: "first",
      segmentID: "center",
      timestampMs: 300,
      qualityAccepted: true,
      duplicateAngle: false,
      warnings: []
    });
    expect(getGuidedScanCoveragePercent(accepted.passes[0])).toBe(20);
  });

  it("keeps first and second passes distinct and targets weak regions", () => {
    let state = createInitialGuidedScanState();
    for (const segment of state.passes[0].segments) {
      state = applyCoverageFrame(state, {
        passID: "first",
        segmentID: segment.id,
        timestampMs: 1000,
        qualityAccepted: true,
        duplicateAngle: false,
        warnings: []
      });
    }

    expect(state.passes[0].completed).toBe(true);
    expect(state.activePassID).toBe("second");
    expect(state.passes[1].completed).toBe(false);

    const missingTargets = getSecondPassTargets(createInitialGuidedScanState());
    expect(missingTargets).toEqual(expect.arrayContaining(["frontView", "leftSide", "rightSide", "jawAndChin", "foreheadAndHairline"]));
  });

  it("can identify a single weak region for selective retake", () => {
    const state = createInitialGuidedScanState();
    const reviewState = {
      ...state,
      reviewRegions: state.reviewRegions.map((region) => ({
        ...region,
        status: region.id === "rightSide" ? ("needsAnotherLook" as const) : ("complete" as const)
      }))
    };
    expect(getSelectiveRetakeRegion(reviewState)).toBe("rightSide");
  });

  it("blocks simulated progress in production mode", () => {
    expect(isDevelopmentGuidedScanSimulationAllowed("development", true)).toBe(true);
    expect(isDevelopmentGuidedScanSimulationAllowed("test", true)).toBe(true);
    expect(isDevelopmentGuidedScanSimulationAllowed("production", true)).toBe(false);
  });

  it("keeps circular guided UI tied to accepted live coverage", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "features/capture/GuidedCaptureFlow.tsx"), "utf8");
    expect(source).toContain("Circular progress advances only after a stable, distinct live frame passes face");
    expect(source).toContain("pose, blur, exposure, and duplicate-angle checks");
    expect(source).toContain("requireOperationalLandmarks: true");
    expect(source).toContain("blockingCodes.has(\"landmarksUnavailable\")");
    expect(source).toContain("Live coverage decision");
    expect(source).toContain("Accessibility Options");
    expect(source).toContain("First Face ID");
    expect(source).toContain("scan complete.");
    expect(source).toContain("Move your head slowly to complete the circle");
    expect(source).toContain("NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS");
    expect(source).toContain("process.env.NODE_ENV !== \"production\"");
    expect(source).not.toMatch(/setTimeout\([^)]*complete|elapsed.*complete|fake progress/i);
  });
});

function grantRequiredConsent(): ConsentState {
  return ["cameraUse", "currentFaceAnalysis", "temporaryProcessing", "ageEligibility", "subjectPermission"].reduce(
    (state, id) => updateConsent(state, id as ConsentID, true, new Date("2026-08-02T12:00:00.000Z")),
    createInitialConsentState()
  );
}
