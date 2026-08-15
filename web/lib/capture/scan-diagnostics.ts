import type { GuidedScanQualityGate, GuidedScanState } from "@/lib/capture/guided-scan-strategy";
import { getGuidedScanCoveragePercent } from "@/lib/capture/guided-scan-strategy";
import { getObjectFitCoverVisibleCrop, type VisiblePreviewGeometry } from "@/lib/capture/visible-preview-geometry";
import type { MobileScanRuntimeState } from "@/lib/capture/mobile-safari-scan-hardening";
import type { CameraAccessError, CameraFacingMode } from "@/lib/capture/browser-camera-service";
import type { GuidedLiveFrameDecision } from "@/lib/capture/guided-live-coverage";
import type { CaptureGuidanceReport } from "@/types/domain";

export const SCAN_DIAGNOSTICS_SCHEMA_VERSION = "gfm-scan-diagnostics-v1";

export interface ScanDiagnosticFrameTrace {
  timestampMs: number;
  passID: string;
  yawDegrees: number | null;
  pitchDegrees: number | null;
  rollDegrees: number | null;
  faceSize: number | null;
  landmarkConfidence: number | null;
  candidateSlot: string | null;
  slotAlreadyFilled: boolean;
  qualityGateResult: GuidedLiveFrameDecision["status"];
  rejectionReason: string | null;
  acceptedSlot: string | null;
  currentFilledSlots: string[];
}

export interface ScanDiagnosticSnapshot {
  schemaVersion: typeof SCAN_DIAGNOSTICS_SCHEMA_VERSION;
  privacyNotice: string;
  generatedAt: string;
  runtime: {
    secureContext: boolean | null;
    likelyIPhoneSafari: boolean | null;
    portrait: boolean | null;
    reducedMotion: boolean | null;
    online: boolean | null;
    viewport: { width: number | null; height: number | null };
    warnings: string[];
  };
  camera: {
    streamActive: boolean;
    starting: boolean;
    selectedFacingMode: CameraFacingMode;
    selectedDeviceKnown: boolean;
    availableDeviceCount: number;
    errorCode: CameraAccessError["code"] | null;
    video: {
      intrinsicWidth: number | null;
      intrinsicHeight: number | null;
      readyState: number | null;
      renderedWidth: number | null;
      renderedHeight: number | null;
    };
    track: {
      width: number | null;
      height: number | null;
      frameRate: number | null;
      facingMode: string | null;
    };
  };
  preview: {
    mirrored: boolean;
    objectFit: "cover";
    crop: { x: number; y: number; width: number; height: number } | null;
  };
  readiness: {
    guidedStage: string;
    positioningReady: boolean;
    circularCanBegin: boolean;
    gates: GuidedScanQualityGate;
    guidanceBlockingCodes: string[];
    guidanceAdvisoryCodes: string[];
    coverageStatus: GuidedLiveFrameDecision["status"] | "notStarted";
    assignedSegment: string | null;
    rejectionReasons: string[];
    acceptedLiveFrameCount: number;
    firstPassPercent: number;
    secondPassPercent: number;
    currentClassifiedSector: string | null;
    lastAcceptedSector: string | null;
    completedSectors: string[];
    duplicateRejectionReason: string | null;
  };
  observedFace: {
    faceCount: string;
    providerState: string;
    poseDegrees: {
      yaw: number | null;
      pitch: number | null;
      roll: number | null;
    };
    centerBucket: "centered" | "slightlyOffCenter" | "offCenter" | "unknown";
    distanceBucket: "tooFar" | "usable" | "tooClose" | "unknown";
    yawBucket: string;
    pitchBucket: string;
    rollBucket: string;
  };
  frameTrace: ScanDiagnosticFrameTrace[];
}

export function createScanDiagnosticFrameTrace(input: {
  decision: GuidedLiveFrameDecision;
  completedSlotsBefore: string[];
  completedSlotsAfter: string[];
  acceptedSlot: string | null;
}): ScanDiagnosticFrameTrace {
  const candidateSlot = input.decision.assignedSegmentID ?? null;
  return {
    timestampMs: Math.round(input.decision.timestampMs),
    passID: input.decision.passID,
    yawDegrees: roundOrNull(input.decision.yawDegrees.value),
    pitchDegrees: roundOrNull(input.decision.pitchDegrees.value),
    rollDegrees: roundOrNull(input.decision.rollDegrees.value),
    faceSize: roundOrNull(input.decision.relativeFaceSize.value),
    landmarkConfidence: roundOrNull(input.decision.landmarkConfidence.value),
    candidateSlot,
    slotAlreadyFilled: Boolean(candidateSlot && input.completedSlotsBefore.includes(candidateSlot)),
    qualityGateResult: input.decision.status,
    rejectionReason: input.decision.rejectionReasons[0] ?? null,
    acceptedSlot: input.acceptedSlot,
    currentFilledSlots: input.completedSlotsAfter
  };
}

export function createScanDiagnosticSnapshot(input: {
  generatedAt?: string;
  runtime: MobileScanRuntimeState | null;
  streamActive: boolean;
  starting: boolean;
  selectedFacingMode: CameraFacingMode;
  selectedDeviceId: string;
  availableDeviceCount: number;
  cameraErrorCode: CameraAccessError["code"] | null;
  videoMetrics: {
    intrinsicWidth?: number | null;
    intrinsicHeight?: number | null;
    readyState?: number | null;
    renderedWidth?: number | null;
    renderedHeight?: number | null;
  };
  trackSettings?: MediaTrackSettings | null;
  previewGeometry: VisiblePreviewGeometry | null;
  previewIsMirrored: boolean;
  guidedStage: string;
  positioningReady: boolean;
  circularCanBegin: boolean;
  qualityGate: GuidedScanQualityGate;
  liveGuidance: CaptureGuidanceReport | null;
  liveCoverageDecision: GuidedLiveFrameDecision | null;
  guidedScanState: GuidedScanState;
  acceptedLiveFrameCount: number;
  acceptedFrames?: Array<{ assignedSegmentID: string; passID: string }>;
  frameTrace?: ScanDiagnosticFrameTrace[];
}): ScanDiagnosticSnapshot {
  const firstPass = input.guidedScanState.passes.find((pass) => pass.id === "first") ?? input.guidedScanState.passes[0];
  const secondPass = input.guidedScanState.passes.find((pass) => pass.id === "second") ?? input.guidedScanState.passes[1];
  const centerDistance = input.liveCoverageDecision?.centering.value ?? null;
  const relativeFaceSize = input.liveCoverageDecision?.relativeFaceSize.value ?? null;
  const completedSectors = firstPass.segments.filter((segment) => segment.status === "accepted").map((segment) => segment.id);
  const lastAcceptedSector = input.acceptedFrames?.at(-1)?.assignedSegmentID ?? null;
  const providerState = input.liveCoverageDecision?.rejectionReasons.includes("Landmark provider unavailable.")
    ? "unavailable"
    : input.liveCoverageDecision
      ? "available"
      : "notChecked";

  return {
    schemaVersion: SCAN_DIAGNOSTICS_SCHEMA_VERSION,
    privacyNotice:
      "Sanitized diagnostic only: no images, video, landmarks, embeddings, identity data, or raw facial measurements are included.",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    runtime: {
      secureContext: input.runtime?.secureContext ?? null,
      likelyIPhoneSafari: input.runtime?.isLikelyIPhoneSafari ?? null,
      portrait: input.runtime?.isPortrait ?? null,
      reducedMotion: input.runtime?.reducedMotion ?? null,
      online: input.runtime?.online ?? null,
      viewport: {
        width: input.runtime?.viewportWidth ?? null,
        height: input.runtime?.viewportHeight ?? null
      },
      warnings: input.runtime?.warnings ?? []
    },
    camera: {
      streamActive: input.streamActive,
      starting: input.starting,
      selectedFacingMode: input.selectedFacingMode,
      selectedDeviceKnown: Boolean(input.selectedDeviceId),
      availableDeviceCount: input.availableDeviceCount,
      errorCode: input.cameraErrorCode,
      video: {
        intrinsicWidth: finiteOrNull(input.videoMetrics.intrinsicWidth),
        intrinsicHeight: finiteOrNull(input.videoMetrics.intrinsicHeight),
        readyState: finiteOrNull(input.videoMetrics.readyState),
        renderedWidth: finiteOrNull(input.videoMetrics.renderedWidth),
        renderedHeight: finiteOrNull(input.videoMetrics.renderedHeight)
      },
      track: {
        width: finiteOrNull(input.trackSettings?.width),
        height: finiteOrNull(input.trackSettings?.height),
        frameRate: finiteOrNull(input.trackSettings?.frameRate),
        facingMode: input.trackSettings?.facingMode ?? null
      }
    },
    preview: {
      mirrored: input.previewIsMirrored,
      objectFit: "cover",
      crop: input.previewGeometry ? roundCrop(getObjectFitCoverVisibleCrop(input.previewGeometry)) : null
    },
    readiness: {
      guidedStage: input.guidedStage,
      positioningReady: input.positioningReady,
      circularCanBegin: input.circularCanBegin,
      gates: input.qualityGate,
      guidanceBlockingCodes: input.liveGuidance?.blockingIssues.map((issue) => issue.code) ?? [],
      guidanceAdvisoryCodes: input.liveGuidance?.advisoryWarnings.map((issue) => issue.code) ?? [],
      coverageStatus: input.liveCoverageDecision?.status ?? "notStarted",
      assignedSegment: input.liveCoverageDecision?.assignedSegmentID ?? null,
      rejectionReasons: input.liveCoverageDecision?.rejectionReasons ?? [],
      acceptedLiveFrameCount: input.acceptedLiveFrameCount,
      firstPassPercent: getGuidedScanCoveragePercent(firstPass),
      secondPassPercent: getGuidedScanCoveragePercent(secondPass),
      currentClassifiedSector: input.liveCoverageDecision?.classifiedPoseSectorID ?? null,
      lastAcceptedSector,
      completedSectors,
      duplicateRejectionReason: input.liveCoverageDecision?.duplicateRejectionReason ?? null
    },
    observedFace: {
      faceCount: input.liveCoverageDecision?.faceCount ?? "notChecked",
      providerState,
      poseDegrees: {
        yaw: roundOrNull(input.liveCoverageDecision?.yawDegrees.value ?? null),
        pitch: roundOrNull(input.liveCoverageDecision?.pitchDegrees.value ?? null),
        roll: roundOrNull(input.liveCoverageDecision?.rollDegrees.value ?? null)
      },
      centerBucket: bucketCenter(centerDistance),
      distanceBucket: bucketDistance(relativeFaceSize),
      yawBucket: bucketPose(input.liveCoverageDecision?.yawDegrees.value ?? null, "yaw"),
      pitchBucket: bucketPose(input.liveCoverageDecision?.pitchDegrees.value ?? null, "pitch"),
      rollBucket: bucketPose(input.liveCoverageDecision?.rollDegrees.value ?? null, "roll")
    },
    frameTrace: input.frameTrace ?? []
  };
}

export function isScanDiagnosticsEnabled(input: { nodeEnv?: string; search?: string | null }) {
  const params = new URLSearchParams(input.search ?? "");
  if (params.get("scanDiagnostics") !== "1") return false;
  if (input.nodeEnv !== "production") return true;
  return Boolean(params.get("buddyTrialInvite"));
}

function bucketCenter(value: number | null): ScanDiagnosticSnapshot["observedFace"]["centerBucket"] {
  if (value === null) return "unknown";
  if (value <= 0.12) return "centered";
  if (value <= 0.3) return "slightlyOffCenter";
  return "offCenter";
}

function bucketDistance(value: number | null): ScanDiagnosticSnapshot["observedFace"]["distanceBucket"] {
  if (value === null) return "unknown";
  if (value < 0.2) return "tooFar";
  if (value > 0.88) return "tooClose";
  return "usable";
}

function bucketPose(value: number | null, axis: "yaw" | "pitch" | "roll") {
  if (value === null) return "unknown";
  const rounded = Math.round(value / 5) * 5;
  if (axis === "yaw") {
    if (rounded <= -55) return `turned-left-about-${Math.abs(rounded)}`;
    if (rounded >= 55) return `turned-right-about-${rounded}`;
    if (rounded <= -20) return `slight-left-about-${Math.abs(rounded)}`;
    if (rounded >= 20) return `slight-right-about-${rounded}`;
    return "near-center";
  }
  if (axis === "pitch") {
    if (rounded <= -10) return `up-about-${Math.abs(rounded)}`;
    if (rounded >= 10) return `down-about-${rounded}`;
    return "level";
  }
  if (rounded <= -10) return `tilted-left-about-${Math.abs(rounded)}`;
  if (rounded >= 10) return `tilted-right-about-${rounded}`;
  return "level";
}

function finiteOrNull(value: number | undefined | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundOrNull(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? round(value) : null;
}

function roundCrop(crop: { x: number; y: number; width: number; height: number }) {
  return {
    x: round(crop.x),
    y: round(crop.y),
    width: round(crop.width),
    height: round(crop.height)
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
