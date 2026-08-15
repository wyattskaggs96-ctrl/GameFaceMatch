export type GuidedScanPassID = "first" | "second";
export type GuidedScanCoverageSegmentID =
  | "center"
  | "left45"
  | "leftProfile"
  | "right45"
  | "rightProfile";
export type GuidedScanRegionID = "frontView" | "leftSide" | "rightSide" | "jawAndChin" | "foreheadAndHairline" | "overallQuality";
export type GuidedScanCoverageStatus = "missing" | "accepted" | "weak" | "duplicateRejected" | "qualityRejected";
export type GuidedScanRegionStatus = "complete" | "needsAnotherLook" | "optionalImprovement";

export interface GuidedScanQualityGate {
  singleFace: boolean;
  centered: boolean;
  acceptableDistance: boolean;
  acceptableLighting: boolean;
  acceptableSharpness: boolean;
  neutralExpression: boolean;
  requiredRegionsVisible: boolean;
}

export interface GuidedScanCoverageFrame {
  segmentID: GuidedScanCoverageSegmentID;
  passID: GuidedScanPassID;
  timestampMs: number;
  qualityAccepted: boolean;
  duplicateAngle: boolean;
  warnings: string[];
}

export interface GuidedScanSegmentState {
  id: GuidedScanCoverageSegmentID;
  label: string;
  status: GuidedScanCoverageStatus;
  acceptedTimestampMs: number | null;
  warnings: string[];
}

export interface GuidedScanPassState {
  id: GuidedScanPassID;
  label: string;
  instruction: string;
  segments: GuidedScanSegmentState[];
  completed: boolean;
}

export interface GuidedScanReviewRegion {
  id: GuidedScanRegionID;
  label: string;
  status: GuidedScanRegionStatus;
  supportingSegments: GuidedScanCoverageSegmentID[];
}

export interface GuidedScanState {
  permissionGranted: boolean;
  initialQualityGate: GuidedScanQualityGate;
  activePassID: GuidedScanPassID;
  passes: GuidedScanPassState[];
  reviewRegions: GuidedScanReviewRegion[];
  cancellationClearsTemporaryMedia: boolean;
}

export const GUIDED_SCAN_SEGMENTS: Array<{ id: GuidedScanCoverageSegmentID; label: string }> = [
  { id: "center", label: "Center" },
  { id: "left45", label: "Left 45" },
  { id: "leftProfile", label: "Left profile" },
  { id: "right45", label: "Right 45" },
  { id: "rightProfile", label: "Right profile" }
];

const FIRST_PASS_REQUIRED_SEGMENTS = GUIDED_SCAN_SEGMENTS.map((segment) => segment.id);
const SECOND_PASS_REGION_SUPPORT: Record<GuidedScanRegionID, GuidedScanCoverageSegmentID[]> = {
  frontView: ["center"],
  leftSide: ["left45", "leftProfile"],
  rightSide: ["right45", "rightProfile"],
  jawAndChin: ["leftProfile", "rightProfile"],
  foreheadAndHairline: ["left45", "center", "right45"],
  overallQuality: FIRST_PASS_REQUIRED_SEGMENTS
};

export function createInitialGuidedScanState(): GuidedScanState {
  return {
    permissionGranted: false,
    initialQualityGate: {
      singleFace: false,
      centered: false,
      acceptableDistance: false,
      acceptableLighting: false,
      acceptableSharpness: false,
      neutralExpression: false,
      requiredRegionsVisible: false
    },
    activePassID: "first",
    passes: [
      createPass("first", "First guided pass", "Move your head slowly to complete the circle"),
      createPass("second", "Second guided pass", "One more scan for better detail")
    ],
    reviewRegions: createReviewRegions(new Set()),
    cancellationClearsTemporaryMedia: true
  };
}

export function canBeginGuidedCapture(permissionGranted: boolean, gate: GuidedScanQualityGate) {
  return permissionGranted && Object.values(gate).every(Boolean);
}

export function applyCoverageFrame(state: GuidedScanState, frame: GuidedScanCoverageFrame): GuidedScanState {
  const pass = state.passes.find((item) => item.id === frame.passID);
  if (!pass) return state;

  const passes = state.passes.map((item) => {
    if (item.id !== frame.passID) return item;
    const segments = item.segments.map((segment) => {
      if (segment.id !== frame.segmentID) return segment;
      if (segment.status === "accepted") {
        return frame.duplicateAngle ? { ...segment, warnings: unique([...segment.warnings, "Duplicate angle ignored."]) } : segment;
      }
      if (frame.duplicateAngle) {
        return { ...segment, status: "duplicateRejected" as const, warnings: unique([...segment.warnings, ...frame.warnings, "Duplicate angle ignored."]) };
      }
      if (!frame.qualityAccepted) {
        return { ...segment, status: "qualityRejected" as const, warnings: unique([...segment.warnings, ...frame.warnings, "Frame did not pass quality gates."]) };
      }
      return { ...segment, status: "accepted" as const, acceptedTimestampMs: frame.timestampMs, warnings: unique([...segment.warnings, ...frame.warnings]) };
    });
    return { ...item, segments, completed: segments.every((segment) => segment.status === "accepted") };
  });

  const acceptedSegments = new Set(
    passes.flatMap((item) => item.segments.filter((segment) => segment.status === "accepted").map((segment) => segment.id))
  );
  const activePassID = passes.find((item) => item.id === "first")?.completed ? "second" : "first";
  return {
    ...state,
    activePassID,
    passes,
    reviewRegions: createReviewRegions(acceptedSegments)
  };
}

export function getGuidedScanCoveragePercent(pass: GuidedScanPassState) {
  return Math.round((pass.segments.filter((segment) => segment.status === "accepted").length / Math.max(pass.segments.length, 1)) * 100);
}

export function getSecondPassTargets(state: GuidedScanState): GuidedScanRegionID[] {
  return state.reviewRegions.filter((region) => region.status !== "complete").map((region) => region.id);
}

export function getSelectiveRetakeRegion(state: GuidedScanState): GuidedScanRegionID | null {
  const weakRegions = state.reviewRegions.filter((region) => region.status === "needsAnotherLook");
  return weakRegions.length === 1 ? weakRegions[0].id : null;
}

export function isDevelopmentGuidedScanSimulationAllowed(environment: "development" | "test" | "production", enabled: boolean) {
  return environment !== "production" && enabled;
}

function createPass(id: GuidedScanPassID, label: string, instruction: string): GuidedScanPassState {
  return {
    id,
    label,
    instruction,
    segments: GUIDED_SCAN_SEGMENTS.map((segment) => ({
      ...segment,
      status: "missing",
      acceptedTimestampMs: null,
      warnings: []
    })),
    completed: false
  };
}

function createReviewRegions(acceptedSegments: Set<GuidedScanCoverageSegmentID>): GuidedScanReviewRegion[] {
  return Object.entries(SECOND_PASS_REGION_SUPPORT).map(([id, supportingSegments]) => {
    const acceptedCount = supportingSegments.filter((segment) => acceptedSegments.has(segment)).length;
    const status: GuidedScanRegionStatus =
      acceptedCount === supportingSegments.length ? "complete" : acceptedCount > 0 ? "optionalImprovement" : "needsAnotherLook";
    return {
      id: id as GuidedScanRegionID,
      label: regionLabel(id as GuidedScanRegionID),
      status,
      supportingSegments
    };
  });
}

function regionLabel(id: GuidedScanRegionID) {
  const labels: Record<GuidedScanRegionID, string> = {
    frontView: "Front view",
    leftSide: "Left side",
    rightSide: "Right side",
    jawAndChin: "Jaw and chin",
    foreheadAndHairline: "Forehead and hairline",
    overallQuality: "Overall quality"
  };
  return labels[id];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
