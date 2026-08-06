import { describe, expect, it } from "vitest";
import { canCompleteGameFaceSetupFromCoverage, transitionGameFaceSetupState } from "@/lib/capture/gameface-setup-state-machine";

describe("GameFace setup reference state machine", () => {
  it("follows the intro, permission, positioning, scan, and completion path", () => {
    let state = transitionGameFaceSetupState("INTRO", "GET_STARTED");
    expect(state).toBe("CAMERA_PERMISSION");
    state = transitionGameFaceSetupState(state, "PERMISSION_GRANTED");
    expect(state).toBe("POSITION_FACE");
    state = transitionGameFaceSetupState(state, "QUALITY_READY");
    expect(state).toBe("SCAN_ACTIVE");
    state = transitionGameFaceSetupState(state, "COVERAGE_COMPLETE");
    expect(state).toBe("SCAN_COMPLETE");
  });

  it("models denied permission, face loss, warnings, start over, and cancellation", () => {
    expect(transitionGameFaceSetupState("CAMERA_PERMISSION", "PERMISSION_DENIED")).toBe("ERROR");
    expect(transitionGameFaceSetupState("SCAN_ACTIVE", "FACE_LOST")).toBe("SCAN_PAUSED");
    expect(transitionGameFaceSetupState("SCAN_PAUSED", "FACE_RECOVERED")).toBe("SCAN_ACTIVE");
    expect(transitionGameFaceSetupState("SCAN_ACTIVE", "QUALITY_BLOCKED")).toBe("QUALITY_WARNING");
    expect(transitionGameFaceSetupState("QUALITY_WARNING", "QUALITY_READY")).toBe("SCAN_ACTIVE");
    expect(transitionGameFaceSetupState("ERROR", "START_OVER")).toBe("INTRO");
    expect(transitionGameFaceSetupState("SCAN_ACTIVE", "CANCEL")).toBe("CANCELLED");
  });

  it("does not allow completion from elapsed time alone", () => {
    expect(canCompleteGameFaceSetupFromCoverage({ elapsedMs: 30_000, requiredCoverageComplete: false, qualityAccepted: true })).toBe(false);
    expect(canCompleteGameFaceSetupFromCoverage({ elapsedMs: 1_000, requiredCoverageComplete: true, qualityAccepted: false })).toBe(false);
    expect(canCompleteGameFaceSetupFromCoverage({ elapsedMs: 1_000, requiredCoverageComplete: true, qualityAccepted: true })).toBe(true);
  });
});
