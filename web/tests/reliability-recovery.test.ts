import { describe, expect, it } from "vitest";
import {
  assertRecoveryCatalogComplete,
  getAllRecoveryPlans,
  getRecoveryPlan,
  recoveryPlanForCameraError,
  recoveryPlanForGuidanceIssue,
  recoveryPlanForImageMessage,
  recoveryPlanForResultsState,
  requiredReliabilityErrorIDs
} from "@/lib/reliability/recovery-actions";

describe("reliability recovery actions", () => {
  it("defines a recovery action for every required product error", () => {
    expect(assertRecoveryCatalogComplete()).toBe(true);
    expect(getAllRecoveryPlans().map((plan) => plan.id)).toEqual(requiredReliabilityErrorIDs);
    for (const plan of getAllRecoveryPlans()) {
      expect(plan.title).toBeTruthy();
      expect(plan.userMessage).toBeTruthy();
      expect(plan.primaryAction.label).toBeTruthy();
      expect(plan.primaryAction.description).toBeTruthy();
      expect(plan.secondaryActions.length).toBeGreaterThan(0);
    }
  });

  it("maps camera failures to actionable capture recovery", () => {
    expect(recoveryPlanForCameraError("permissionDenied").id).toBe("permissionDenied");
    expect(recoveryPlanForCameraError("permissionBlocked").primaryAction.label).toMatch(/upload/i);
    expect(recoveryPlanForCameraError("cameraUnavailable").id).toBe("cameraUnavailable");
    expect(recoveryPlanForCameraError("noMatchingCameraDevice").id).toBe("cameraUnavailable");
    expect(recoveryPlanForCameraError("cameraApiUnsupported").id).toBe("unsupportedDevice");
    expect(recoveryPlanForCameraError("unknownError").id).toBe("processingFailure");
  });

  it("maps real-time guidance failures to user recovery actions", () => {
    expect(recoveryPlanForGuidanceIssue("faceNotFound")?.id).toBe("faceNotFound");
    expect(recoveryPlanForGuidanceIssue("multipleFaces")?.id).toBe("multipleFaces");
    expect(recoveryPlanForGuidanceIssue("severeBlur")?.id).toBe("blur");
    expect(recoveryPlanForGuidanceIssue("underexposed")?.id).toBe("poorLighting");
    expect(recoveryPlanForGuidanceIssue("overexposed")?.id).toBe("poorLighting");
    expect(recoveryPlanForGuidanceIssue("lightingImbalance")?.id).toBe("poorLighting");
    expect(recoveryPlanForGuidanceIssue("incorrectHeadDirection")?.id).toBe("invalidPose");
  });

  it("maps upload and quality messages without pretending advanced analysis exists", () => {
    expect(recoveryPlanForImageMessage("The image could not be read.").id).toBe("uploadFailure");
    expect(recoveryPlanForImageMessage("HEIC/HEIF images are not supported.").primaryAction.description).toMatch(/JPEG|PNG|WebP/);
    expect(recoveryPlanForImageMessage("Required angle missing.").id).toBe("missingView");
    expect(recoveryPlanForImageMessage("Image may be blurry.").id).toBe("blur");
    expect(recoveryPlanForImageMessage("Image may be dark.").id).toBe("poorLighting");
    expect(recoveryPlanForImageMessage("Confirm that the requested angle was followed.").id).toBe("invalidPose");
    expect(recoveryPlanForImageMessage("Front screenshot is required.").id).toBe("invalidScreenshot");
  });

  it("keeps catalog and matching failures fail-closed with recovery paths", () => {
    expect(recoveryPlanForResultsState("catalogUnavailable", "Verified catalog not loaded.")?.id).toBe("emptyProductionCatalog");
    expect(recoveryPlanForResultsState("insufficientProfileData", "Complete capture.")?.id).toBe("missingView");
    expect(recoveryPlanForResultsState("matchingError", "Catalog version is incompatible.")?.id).toBe("catalogMismatch");
    expect(recoveryPlanForResultsState("matchingError", "Local processing failed.")?.id).toBe("processingFailure");
    expect(getRecoveryPlan("emptyProductionCatalog").primaryAction.description).toMatch(/approved catalog release|retry/i);
  });

  it("documents local-only recovery for save, deletion, network, and account or sync failures", () => {
    expect(getRecoveryPlan("saveFailure").primaryAction.description).toMatch(/consent|storage/i);
    expect(getRecoveryPlan("deletionFailure").secondaryActions[0].description).toMatch(/browser data/i);
    expect(getRecoveryPlan("networkFailure").userMessage).toMatch(/local MVP/i);
    expect(getRecoveryPlan("accountOrSyncFailure").userMessage).toMatch(/no account|sync/i);
  });
});
