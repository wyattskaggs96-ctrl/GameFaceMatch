import type { GuidedLiveFrameDecision } from "@/lib/capture/guided-live-coverage";
import { GUIDED_SCAN_SEGMENTS, type GuidedScanCoverageSegmentID, type GuidedScanPassState } from "@/lib/capture/guided-scan-strategy";

export const CUSTOMER_GUIDED_SCAN_SEGMENT_LABELS: Record<GuidedScanCoverageSegmentID, string> = {
  center: "Front",
  left45: "Left 45",
  leftProfile: "Left outer",
  right45: "Right 45",
  rightProfile: "Right outer"
};

export interface GuidedScanProgressSummary {
  acceptedCount: number;
  totalCount: number;
  percent: number;
  capturedSegments: GuidedScanCoverageSegmentID[];
  missingSegments: GuidedScanCoverageSegmentID[];
  capturedLabels: string[];
  missingLabels: string[];
}

export function getGuidedScanProgressSummary(pass: GuidedScanPassState): GuidedScanProgressSummary {
  const totalCount = pass.segments.length;
  const capturedSegments = pass.segments.filter((segment) => segment.status === "accepted").map((segment) => segment.id);
  const missingSegments = GUIDED_SCAN_SEGMENTS.map((segment) => segment.id).filter((segmentID) => !capturedSegments.includes(segmentID));
  const acceptedCount = capturedSegments.length;
  const percent = Math.round((acceptedCount / Math.max(totalCount, 1)) * 100);
  return {
    acceptedCount,
    totalCount,
    percent,
    capturedSegments,
    missingSegments,
    capturedLabels: capturedSegments.map(formatCustomerGuidedScanSegment),
    missingLabels: missingSegments.map(formatCustomerGuidedScanSegment)
  };
}

export function getGuidedScanMovementCue(pass: GuidedScanPassState, liveCoverageDecision: GuidedLiveFrameDecision | null) {
  const summary = getGuidedScanProgressSummary(pass);
  if (summary.missingSegments.length === 0) return "All angles captured.";
  const currentSegment = liveCoverageDecision?.assignedSegmentID ?? null;
  if (currentSegment && summary.missingSegments.includes(currentSegment) && liveCoverageDecision?.status !== "rejected") {
    return "Hold this angle for a moment.";
  }
  if (summary.missingSegments.includes("center")) {
    return currentSegment === "center" ? "Hold center for a moment." : "Return to center.";
  }
  if (summary.missingSegments.includes("left45")) {
    return currentSegment === "leftProfile" ? "Ease slightly back left." : "Turn a little left.";
  }
  if (summary.missingSegments.includes("leftProfile")) {
    return currentSegment === "leftProfile" ? "Hold the far-left angle." : "Turn farther left.";
  }
  if (summary.missingSegments.includes("right45")) {
    return currentSegment === "rightProfile" ? "Ease slightly back right." : "Turn a little right.";
  }
  if (summary.missingSegments.includes("rightProfile")) {
    return currentSegment === "rightProfile" ? "Hold the far-right angle." : "Turn farther right.";
  }
  return "Move your head slowly.";
}

export function formatCustomerGuidedScanSegment(segmentID: GuidedScanCoverageSegmentID) {
  return CUSTOMER_GUIDED_SCAN_SEGMENT_LABELS[segmentID];
}
