import { describe, expect, it } from "vitest";
import { getGuidedScanMovementCue, getGuidedScanProgressSummary } from "@/lib/capture/guided-scan-progress";
import { applyCoverageFrame, createInitialGuidedScanState, type GuidedScanCoverageSegmentID, type GuidedScanPassState } from "@/lib/capture/guided-scan-strategy";
import type { GuidedLiveFrameDecision } from "@/lib/capture/guided-live-coverage";

const orderedSegments: GuidedScanCoverageSegmentID[] = ["center", "left45", "leftProfile", "right45", "rightProfile"];

describe("guided scan customer progress", () => {
  it("maps accepted five-slot coverage directly to customer percentages", () => {
    for (let acceptedCount = 0; acceptedCount <= orderedSegments.length; acceptedCount += 1) {
      const pass = passWithAcceptedSegments(orderedSegments.slice(0, acceptedCount));
      expect(getGuidedScanProgressSummary(pass)).toMatchObject({
        acceptedCount,
        totalCount: 5,
        percent: acceptedCount * 20
      });
    }
  });

  it("does not count duplicate or rejected captures toward customer progress", () => {
    let state = createInitialGuidedScanState();
    state = applyCoverageFrame(state, {
      passID: "first",
      segmentID: "center",
      timestampMs: 100,
      qualityAccepted: true,
      duplicateAngle: true,
      warnings: []
    });
    state = applyCoverageFrame(state, {
      passID: "first",
      segmentID: "left45",
      timestampMs: 200,
      qualityAccepted: false,
      duplicateAngle: false,
      warnings: ["Hold still."]
    });

    expect(getGuidedScanProgressSummary(state.passes[0])).toMatchObject({
      acceptedCount: 0,
      percent: 0,
      missingLabels: ["Front", "Left 45", "Left outer", "Right 45", "Right outer"]
    });

    state = applyCoverageFrame(state, {
      passID: "first",
      segmentID: "center",
      timestampMs: 300,
      qualityAccepted: true,
      duplicateAngle: false,
      warnings: []
    });

    expect(getGuidedScanProgressSummary(state.passes[0])).toMatchObject({
      acceptedCount: 1,
      percent: 20,
      capturedLabels: ["Front"],
      missingLabels: ["Left 45", "Left outer", "Right 45", "Right outer"]
    });
  });

  it("removes completed slots from still-needed guidance", () => {
    const summary = getGuidedScanProgressSummary(passWithAcceptedSegments(["center", "left45", "right45"]));
    expect(summary).toMatchObject({
      acceptedCount: 3,
      percent: 60,
      capturedLabels: ["Front", "Left 45", "Right 45"],
      missingLabels: ["Left outer", "Right outer"]
    });
  });

  it("selects customer movement cues for every missing-slot family", () => {
    expect(getGuidedScanMovementCue(passWithAcceptedSegments([]), decision("left45"))).toBe("Return to center.");
    expect(getGuidedScanMovementCue(passWithAcceptedSegments(["center"]), decision("center"))).toBe("Turn a little left.");
    expect(getGuidedScanMovementCue(passWithAcceptedSegments(["center"]), decision("left45", "pendingStability"))).toBe("Hold this angle for a moment.");
    expect(getGuidedScanMovementCue(passWithAcceptedSegments(["center", "left45"]), decision("left45"))).toBe("Turn farther left.");
    expect(getGuidedScanMovementCue(passWithAcceptedSegments(["center", "left45"]), decision("leftProfile", "pendingStability"))).toBe("Hold this angle for a moment.");
    expect(getGuidedScanMovementCue(passWithAcceptedSegments(["center", "left45", "leftProfile"]), decision("leftProfile"))).toBe("Turn a little right.");
    expect(getGuidedScanMovementCue(passWithAcceptedSegments(["center", "left45", "leftProfile", "right45"]), decision("right45"))).toBe("Turn farther right.");
    expect(getGuidedScanMovementCue(passWithAcceptedSegments(orderedSegments), decision("rightProfile"))).toBe("All angles captured.");
  });

  it("turns routine duplicate observations into still-missing guidance instead of duplicate copy", () => {
    const cue = getGuidedScanMovementCue(passWithAcceptedSegments(["center"]), {
      ...decision("center", "rejected"),
      duplicateAngle: true,
      rejectionReasons: ["Duplicate angle ignored."]
    });
    expect(cue).toBe("Turn a little left.");
  });
});

function passWithAcceptedSegments(acceptedSegments: GuidedScanCoverageSegmentID[]): GuidedScanPassState {
  let state = createInitialGuidedScanState();
  for (const segmentID of acceptedSegments) {
    state = applyCoverageFrame(state, {
      passID: "first",
      segmentID,
      timestampMs: 1_000,
      qualityAccepted: true,
      duplicateAngle: false,
      warnings: []
    });
  }
  return state.passes[0];
}

function decision(segmentID: GuidedScanCoverageSegmentID, status: GuidedLiveFrameDecision["status"] = "rejected"): GuidedLiveFrameDecision {
  return {
    timestampMs: 1_000,
    passID: "first",
    faceCount: "one",
    faceConfidence: signal(0.9),
    faceBoundingBox: null,
    centering: signal(0),
    relativeFaceSize: signal(0.4),
    yawDegrees: signal(0),
    pitchDegrees: signal(0),
    rollDegrees: signal(0),
    sharpness: signal(10),
    exposure: signal(0.5),
    lightingUniformity: signal(0),
    landmarkConfidence: signal(0.9),
    expressionNeutrality: signal("pass"),
    occlusion: signal("pass"),
    classifiedPoseSectorID: "center",
    assignedSegmentID: segmentID,
    duplicateAngle: false,
    duplicateRejectionReason: null,
    status,
    accepted: status !== "rejected",
    rejectionReasons: []
  };
}

function signal<T>(value: T) {
  return {
    value,
    state: "pass" as const,
    evidence: "estimated" as const,
    message: ""
  };
}
