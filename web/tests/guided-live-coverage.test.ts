import { describe, expect, it } from "vitest";
import { applyCoverageFrame, createInitialGuidedScanState, getSecondPassTargets, getSelectiveRetakeRegion } from "@/lib/capture/guided-scan-strategy";
import {
  createInitialGuidedLiveCoverageAccumulatorState,
  evaluateGuidedLiveFrameDecision,
  guidedSegmentToCaptureAngle,
  naturalPhoneScanCoverageThresholds,
  updateGuidedLiveCoverageAccumulator,
  type GuidedLiveAcceptedFrame
} from "@/lib/capture/guided-live-coverage";
import { createObjectFitCoverVisiblePreview, type VisiblePreviewGeometry } from "@/lib/capture/visible-preview-geometry";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA, unavailableFaceLandmarkReport } from "@/lib/face-landmarks/face-landmark-provider";
import type { DetectedFaceLandmarks, FaceLandmarkPoint, FaceLandmarkReport, ImageQualityReport } from "@/types/domain";

describe("guided live coverage decisions", () => {
  it("rejects unavailable, zero-face, and multiple-face frames", () => {
    const unavailable = decision({ report: unavailableFaceLandmarkReport({ message: "Model missing." }) });
    expect(unavailable.status).toBe("rejected");
    expect(unavailable.rejectionReasons).toContain("Landmark provider unavailable.");

    const zero = decision({ report: { ...report({}), faceCount: "zero", detectedFaceCount: 0, faces: [] } });
    expect(zero.rejectionReasons).toContain("Face not found.");

    const multiple = decision({
      report: { ...report({}), faceCount: "multiple", detectedFaceCount: 2, faces: [face({}), face({ centerX: 0.65 })] }
    });
    expect(multiple.rejectionReasons).toContain("Only one person can be in the scan.");
  });

  it("blocks face size, centering, blur, exposure, and lighting failures", () => {
    expect(decision({ report: report({ boxWidth: 0.2, boxHeight: 0.2 }) }).rejectionReasons).toContain("Move closer.");
    expect(decision({ report: report({ boxWidth: 0.82, boxHeight: 0.82 }) }).rejectionReasons).toContain("Move farther away.");
    expect(decision({ report: report({ centerX: 0.76 }) }).rejectionReasons).toContain("Center your face.");
    expect(decision({ quality: quality({ sharpness: 2 }) }).rejectionReasons).toContain("Hold still.");
    expect(decision({ quality: quality({ brightness: 0.12, shadowClipping: 0.5 }) }).rejectionReasons).toContain("More light needed.");
    expect(decision({ quality: quality({ brightness: 0.92, highlightClipping: 0.3 }) }).rejectionReasons).toContain("Reduce direct light.");
    expect(decision({ quality: quality({ lightingImbalance: 0.45 }) }).rejectionReasons).toContain("Use more even lighting.");
  });

  it("does not count duplicate accepted angles", () => {
    const acceptedFrames: GuidedLiveAcceptedFrame[] = [
      {
        timestampMs: 100,
        assignedSegmentID: "center",
        passID: "first",
        yawDegrees: 0,
        pitchDegrees: 0,
        rollDegrees: 0
      }
    ];
    const duplicate = decision({ acceptedFrames, report: report({ yawDegrees: 3 }) });
    expect(duplicate.duplicateAngle).toBe(true);
    expect(duplicate.rejectionReasons).toContain("Duplicate angle ignored.");
    expect(duplicate.accepted).toBe(false);
  });

  it("requires temporal stability before advancing circular progress", () => {
    let accumulator = createInitialGuidedLiveCoverageAccumulatorState();
    const first = updateGuidedLiveCoverageAccumulator(accumulator, decision({ now: 0, report: report({ yawDegrees: -72 }) }));
    expect(first.coverageFrame).toBeNull();
    expect(first.decision.status).toBe("pendingStability");

    accumulator = first.accumulator;
    const second = updateGuidedLiveCoverageAccumulator(accumulator, decision({ now: 700, report: report({ yawDegrees: -72 }) }));
    expect(second.decision.status).toBe("accepted");
    expect(second.coverageFrame).toMatchObject({
      passID: "first",
      segmentID: "left",
      qualityAccepted: true,
      duplicateAngle: false
    });
    expect(second.acceptedFrame?.assignedSegmentID).toBe("left");
    expect(guidedSegmentToCaptureAngle("left")).toBe("leftProfile");
  });

  it("maps yaw and pitch into deterministic circular sectors without using phone tilt", () => {
    const cases: Array<[number, number, string]> = [
      [0, 0, "center"],
      [-38, -14, "upperLeft"],
      [-70, 0, "left"],
      [-38, 14, "lowerLeft"],
      [0, 16, "lowerCenter"],
      [38, 14, "lowerRight"],
      [70, 0, "right"],
      [38, -14, "upperRight"]
    ];

    for (const [yawDegrees, pitchDegrees, segmentID] of cases) {
      expect(decision({ report: report({ yawDegrees, pitchDegrees }) }).assignedSegmentID, segmentID).toBe(segmentID);
    }

    const rollOnly = decision({ report: report({ yawDegrees: 0, pitchDegrees: 0, rollDegrees: 28 }) });
    expect(rollOnly.assignedSegmentID).toBe("center");
    expect(rollOnly.accepted).toBe(true);
  });

  it("resets stability after a lost face before accepting a reacquired sector", () => {
    let accumulator = createInitialGuidedLiveCoverageAccumulatorState();
    const first = updateGuidedLiveCoverageAccumulator(accumulator, decision({ now: 0, report: report({ yawDegrees: 72 }) }));
    expect(first.decision.status).toBe("pendingStability");

    accumulator = first.accumulator;
    const lost = updateGuidedLiveCoverageAccumulator(accumulator, decision({ now: 300, report: { ...report({}), faceCount: "zero", detectedFaceCount: 0, faces: [] } }));
    expect(lost.decision.status).toBe("rejected");
    expect(lost.coverageFrame).toBeNull();

    const reacquired = updateGuidedLiveCoverageAccumulator(lost.accumulator, decision({ now: 900, report: report({ yawDegrees: 72 }) }));
    expect(reacquired.decision.status).toBe("pendingStability");
    expect(reacquired.coverageFrame).toBeNull();

    const stable = updateGuidedLiveCoverageAccumulator(reacquired.accumulator, decision({ now: 1_600, report: report({ yawDegrees: 72 }) }));
    expect(stable.decision.status).toBe("accepted");
    expect(stable.coverageFrame?.segmentID).toBe("right");
  });

  it("uses visible preview crop and head pose for scan progress without requiring phone steering", () => {
    const visiblePreviewGeometry = createObjectFitCoverVisiblePreview({
      sourceWidth: 720,
      sourceHeight: 1280,
      renderedWidth: 340,
      renderedHeight: 340,
      mirrored: true
    });

    const turnedHead = decision({
      report: report({ centerX: 0.56, centerY: 0.5, boxWidth: 0.34, boxHeight: 0.45, yawDegrees: 44 }),
      visiblePreviewGeometry,
      useNaturalScanThresholds: true
    });

    expect(turnedHead.assignedSegmentID).toBe("right");
    expect(turnedHead.rejectionReasons).not.toContain("Center your face.");
    expect(turnedHead.status).toBe("pendingStability");

    const phoneSteeredOffFrame = decision({
      report: report({ centerX: 0.88, centerY: 0.5, boxWidth: 0.34, boxHeight: 0.45, yawDegrees: 44 }),
      visiblePreviewGeometry,
      useNaturalScanThresholds: true
    });

    expect(phoneSteeredOffFrame.rejectionReasons).toContain("Center your face.");
    expect(phoneSteeredOffFrame.accepted).toBe(false);
  });

  it("keeps rejected frames out of progress while recording the rejected segment state", () => {
    let state = createInitialGuidedScanState();
    const rejected = updateGuidedLiveCoverageAccumulator(
      createInitialGuidedLiveCoverageAccumulatorState(),
      decision({ now: 0, quality: quality({ sharpness: 2 }), report: report({ yawDegrees: 70 }) })
    );
    expect(rejected.coverageFrame?.qualityAccepted).toBe(false);
    state = applyCoverageFrame(state, rejected.coverageFrame!);
    expect(state.passes[0].segments.find((segment) => segment.id === "right")?.status).toBe("qualityRejected");
    expect(state.passes[0].completed).toBe(false);
  });

  it("marks first pass complete only after all eight distinct accepted regions are applied", () => {
    let state = createInitialGuidedScanState();
    for (const segmentID of ["center", "upperLeft", "left", "lowerLeft", "lowerCenter", "lowerRight", "right", "upperRight"] as const) {
      state = applyCoverageFrame(state, {
        passID: "first",
        segmentID,
        timestampMs: 1_000,
        qualityAccepted: true,
        duplicateAngle: false,
        warnings: []
      });
    }
    expect(state.passes[0].completed).toBe(true);
    expect(state.activePassID).toBe("second");
    expect(getSecondPassTargets(state)).toEqual([]);
  });

  it("uses second pass targets and selective retake for weak regions without clearing accepted regions", () => {
    let state = createInitialGuidedScanState();
    state = applyCoverageFrame(state, {
      passID: "first",
      segmentID: "center",
      timestampMs: 1_000,
      qualityAccepted: true,
      duplicateAngle: false,
      warnings: []
    });
    expect(getSecondPassTargets(state)).toContain("leftSide");
    expect(getSecondPassTargets(state)).toContain("rightSide");

    for (const segmentID of ["upperLeft", "left", "lowerLeft", "upperRight", "right", "lowerRight", "lowerCenter"] as const) {
      state = applyCoverageFrame(state, {
        passID: "first",
        segmentID,
        timestampMs: 2_000,
        qualityAccepted: true,
        duplicateAngle: false,
        warnings: []
      });
    }
    state = applyCoverageFrame(state, {
      passID: "second",
      segmentID: "lowerCenter",
      timestampMs: 3_000,
      qualityAccepted: false,
      duplicateAngle: false,
      warnings: ["Hold still."]
    });
    expect(getSelectiveRetakeRegion(state)).toBeNull();
    expect(state.passes[0].segments.every((segment) => segment.status === "accepted")).toBe(true);
  });
});

function decision({
  acceptedFrames = [],
  now = 1_000,
  passID = "first",
  quality: imageQualityReport = quality(),
  report: faceLandmarkReport = report({}),
  useNaturalScanThresholds = false,
  visiblePreviewGeometry = null
}: {
  acceptedFrames?: GuidedLiveAcceptedFrame[];
  now?: number;
  passID?: "first" | "second";
  quality?: Pick<
    ImageQualityReport,
    "brightnessEstimate" | "highlightClippingEstimate" | "shadowClippingEstimate" | "sharpnessEstimate" | "lightingImbalanceEstimate"
  >;
  report?: FaceLandmarkReport;
  useNaturalScanThresholds?: boolean;
  visiblePreviewGeometry?: VisiblePreviewGeometry | null;
}) {
  return evaluateGuidedLiveFrameDecision({
    passID,
    timestampMs: now,
    faceLandmarkReport,
    imageQualityReport,
    acceptedFrames,
    visiblePreviewGeometry,
    options: useNaturalScanThresholds ? { thresholds: naturalPhoneScanCoverageThresholds } : undefined
  });
}

function report(input: Partial<Parameters<typeof face>[0]>): FaceLandmarkReport {
  return {
    availabilityState: "available",
    faceCount: "one",
    detectedFaceCount: 1,
    faces: [face(input)],
    provider: MEDIAPIPE_FACE_LANDMARKER_METADATA,
    confidence: { score: 0.82, label: "medium", evidence: "estimated" },
    advisoryMessages: [],
    blockingMessages: [],
    createdAt: "2026-07-11T00:00:00.000Z"
  };
}

function face({
  centerX = 0.5,
  centerY = 0.5,
  boxWidth = 0.45,
  boxHeight = 0.58,
  yawDegrees = 0,
  pitchDegrees = 0,
  rollDegrees = 0,
  strongExpressionLikelihood = 0.1
}: {
  centerX?: number;
  centerY?: number;
  boxWidth?: number;
  boxHeight?: number;
  yawDegrees?: number;
  pitchDegrees?: number;
  rollDegrees?: number;
  strongExpressionLikelihood?: number;
}): DetectedFaceLandmarks {
  return {
    boundingBox: {
      x: centerX - boxWidth / 2,
      y: centerY - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
      confidence: { score: 0.8, label: "medium", evidence: "estimated" }
    },
    coreLandmarks: ["nose tip", "chin", "nose bridge", "left eye outer corner", "right eye outer corner", "left mouth corner", "right mouth corner"].map(
      landmark
    ),
    approximateHeadPose: {
      yawDegrees,
      pitchDegrees,
      rollDegrees,
      confidence: { score: 0.76, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    expression: {
      leftEyeOpenness: 0.25,
      rightEyeOpenness: 0.25,
      mouthOpenness: 0.07,
      smileLikelihood: 0.1,
      strongExpressionLikelihood,
      confidence: { score: 0.65, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    confidence: { score: 0.8, label: "medium", evidence: "estimated" }
  };
}

function landmark(label: string, sourceIndex: number): FaceLandmarkPoint {
  return {
    label,
    sourceIndex,
    x: 0.5,
    y: 0.5,
    z: null,
    confidence: { score: 0.72, label: "medium", evidence: "estimated" }
  };
}

function quality(
  input: { brightness?: number; highlightClipping?: number; shadowClipping?: number; sharpness?: number; lightingImbalance?: number } = {}
): Pick<
  ImageQualityReport,
  "brightnessEstimate" | "highlightClippingEstimate" | "shadowClippingEstimate" | "sharpnessEstimate" | "lightingImbalanceEstimate"
> {
  return {
    brightnessEstimate: { value: input.brightness ?? 0.55, evidence: "estimated", label: "Synthetic brightness" },
    highlightClippingEstimate: { value: input.highlightClipping ?? 0.01, evidence: "estimated", label: "Synthetic highlight clipping" },
    shadowClippingEstimate: { value: input.shadowClipping ?? 0.01, evidence: "estimated", label: "Synthetic shadow clipping" },
    sharpnessEstimate: { value: input.sharpness ?? 12, evidence: "estimated", label: "Synthetic sharpness" },
    lightingImbalanceEstimate: { value: input.lightingImbalance ?? 0.04, evidence: "estimated", label: "Synthetic lighting imbalance" }
  };
}
