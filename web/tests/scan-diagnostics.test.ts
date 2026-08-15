import { describe, expect, it } from "vitest";
import { createInitialGuidedScanState } from "@/lib/capture/guided-scan-strategy";
import { evaluateGuidedLiveFrameDecision, naturalPhoneLiveCoverageOptions, naturalPhoneScanCoverageThresholds } from "@/lib/capture/guided-live-coverage";
import { evaluateMobileScanRuntime } from "@/lib/capture/mobile-safari-scan-hardening";
import { createScanDiagnosticFrameTrace, createScanDiagnosticSnapshot, isScanDiagnosticsEnabled } from "@/lib/capture/scan-diagnostics";
import { createObjectFitCoverVisiblePreview } from "@/lib/capture/visible-preview-geometry";
import { MEDIAPIPE_FACE_LANDMARKER_METADATA } from "@/lib/face-landmarks/face-landmark-provider";
import type { DetectedFaceLandmarks, FaceLandmarkPoint, FaceLandmarkReport } from "@/types/domain";

describe("scan diagnostics", () => {
  it("is explicitly opt-in, including owner-requested production beta diagnostics", () => {
    expect(isScanDiagnosticsEnabled({ nodeEnv: "development", search: "?scanDiagnostics=1" })).toBe(true);
    expect(isScanDiagnosticsEnabled({ nodeEnv: "test", search: "?scanDiagnostics=1" })).toBe(true);
    expect(isScanDiagnosticsEnabled({ nodeEnv: "development", search: "" })).toBe(false);
    expect(isScanDiagnosticsEnabled({ nodeEnv: "production", search: "?scanDiagnostics=1" })).toBe(false);
    expect(isScanDiagnosticsEnabled({ nodeEnv: "production", search: "?buddyTrialInvite=btv1_owner&scanDiagnostics=1" })).toBe(true);
  });

  it("creates a sanitized real-device debugging snapshot without raw face media or landmarks", () => {
    const guidedScanState = createInitialGuidedScanState();
    const decision = evaluateGuidedLiveFrameDecision({
      passID: "first",
      timestampMs: 1_000,
      faceLandmarkReport: report({ yawDegrees: 42, pitchDegrees: -12 }),
      acceptedFrames: [],
      visiblePreviewGeometry: createObjectFitCoverVisiblePreview({
        sourceWidth: 720,
        sourceHeight: 1280,
        renderedWidth: 340,
        renderedHeight: 340,
        mirrored: true
      }),
      options: { ...naturalPhoneLiveCoverageOptions, thresholds: naturalPhoneScanCoverageThresholds }
    });

    const snapshot = createScanDiagnosticSnapshot({
      generatedAt: "2026-08-13T00:00:00.000Z",
      runtime: evaluateMobileScanRuntime({
        isSecureContext: true,
        protocol: "https:",
        hostname: "example.trycloudflare.com",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        innerWidth: 390,
        innerHeight: 844,
        visualViewportWidth: 390,
        visualViewportHeight: 760,
        orientationType: "portrait-primary",
        prefersReducedMotion: false,
        online: true
      }),
      streamActive: true,
      starting: false,
      selectedFacingMode: "user",
      selectedDeviceId: "redacted-device-id",
      availableDeviceCount: 2,
      cameraErrorCode: null,
      videoMetrics: {
        intrinsicWidth: 720,
        intrinsicHeight: 1280,
        readyState: 4,
        renderedWidth: 340,
        renderedHeight: 340
      },
      trackSettings: { width: 720, height: 1280, frameRate: 30, facingMode: "user" },
      previewGeometry: createObjectFitCoverVisiblePreview({
        sourceWidth: 720,
        sourceHeight: 1280,
        renderedWidth: 340,
        renderedHeight: 340,
        mirrored: true
      }),
      previewIsMirrored: true,
      guidedStage: "firstPass",
      positioningReady: true,
      circularCanBegin: true,
      qualityGate: {
        singleFace: true,
        centered: true,
        acceptableDistance: true,
        acceptableLighting: true,
        acceptableSharpness: true,
        neutralExpression: true,
        requiredRegionsVisible: true
      },
      liveGuidance: null,
      liveCoverageDecision: decision,
      guidedScanState,
      acceptedLiveFrameCount: 0,
      acceptedFrames: [],
      frameTrace: [
        createScanDiagnosticFrameTrace({
          decision: { ...decision, status: "accepted" },
          completedSlotsBefore: [],
          completedSlotsAfter: ["rightProfile"],
          acceptedSlot: "rightProfile"
        })
      ]
    });

    expect(snapshot.schemaVersion).toBe("gfm-scan-diagnostics-v1");
    expect(snapshot.runtime.likelyIPhoneSafari).toBe(true);
    expect(snapshot.preview.crop).toMatchObject({ x: 0, width: 1 });
    expect(snapshot.observedFace.yawBucket).toBe("slight-right-about-40");
    expect(snapshot.observedFace.pitchBucket).toBe("up-about-10");
    expect(snapshot.observedFace.poseDegrees).toMatchObject({ yaw: 42, pitch: -12, roll: 0 });
    expect(snapshot.readiness.currentClassifiedSector).toBe("right");
    expect(snapshot.readiness.assignedSegment).toBe("rightProfile");
    expect(snapshot.readiness.completedSectors).toEqual([]);
    expect(snapshot.frameTrace).toEqual([
      expect.objectContaining({
        yawDegrees: 42,
        pitchDegrees: -12,
        candidateSlot: "rightProfile",
        slotAlreadyFilled: false,
        qualityGateResult: "accepted",
        acceptedSlot: "rightProfile",
        currentFilledSlots: ["rightProfile"]
      })
    ]);

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toMatch(/coreLandmarks|faceLandmarks|sourceIndex/i);
    expect(serialized).not.toMatch(/embeddingVector|faceEmbedding|embeddingValues/i);
    expect(serialized).not.toMatch(/imageData|base64|data:image|blob:/i);
    expect(serialized).not.toContain("redacted-device-id");
    expect(snapshot.camera.selectedDeviceKnown).toBe(true);
  });
});

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
    createdAt: "2026-08-13T00:00:00.000Z"
  };
}

function face({
  centerX = 0.5,
  centerY = 0.5,
  boxWidth = 0.45,
  boxHeight = 0.58,
  yawDegrees = 0,
  pitchDegrees = 0,
  rollDegrees = 0
}: {
  centerX?: number;
  centerY?: number;
  boxWidth?: number;
  boxHeight?: number;
  yawDegrees?: number;
  pitchDegrees?: number;
  rollDegrees?: number;
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
      strongExpressionLikelihood: 0.1,
      confidence: { score: 0.65, label: "medium", evidence: "estimated" },
      availabilityState: "available"
    },
    confidence: { score: 0.8, label: "medium", evidence: "estimated" }
  };
}

function landmark(label: string): FaceLandmarkPoint {
  return {
    label,
    sourceIndex: 0,
    x: 0.5,
    y: 0.5,
    z: 0,
    confidence: { score: 0.7, label: "medium", evidence: "estimated" }
  };
}
