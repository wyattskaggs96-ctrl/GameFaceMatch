export type GameFaceSetupState =
  | "INTRO"
  | "CAMERA_PERMISSION"
  | "POSITION_FACE"
  | "SCAN_ACTIVE"
  | "SCAN_PAUSED"
  | "QUALITY_WARNING"
  | "SCAN_COMPLETE"
  | "ERROR"
  | "CANCELLED";

export type GameFaceSetupEvent =
  | "GET_STARTED"
  | "PERMISSION_GRANTED"
  | "PERMISSION_DENIED"
  | "QUALITY_READY"
  | "QUALITY_BLOCKED"
  | "FACE_LOST"
  | "FACE_RECOVERED"
  | "COVERAGE_COMPLETE"
  | "ERROR_THROWN"
  | "START_OVER"
  | "CANCEL";

const transitions: Record<GameFaceSetupState, Partial<Record<GameFaceSetupEvent, GameFaceSetupState>>> = {
  INTRO: {
    GET_STARTED: "CAMERA_PERMISSION",
    CANCEL: "CANCELLED"
  },
  CAMERA_PERMISSION: {
    PERMISSION_GRANTED: "POSITION_FACE",
    PERMISSION_DENIED: "ERROR",
    CANCEL: "CANCELLED",
    START_OVER: "INTRO"
  },
  POSITION_FACE: {
    QUALITY_READY: "SCAN_ACTIVE",
    QUALITY_BLOCKED: "QUALITY_WARNING",
    ERROR_THROWN: "ERROR",
    CANCEL: "CANCELLED",
    START_OVER: "INTRO"
  },
  SCAN_ACTIVE: {
    FACE_LOST: "SCAN_PAUSED",
    QUALITY_BLOCKED: "QUALITY_WARNING",
    COVERAGE_COMPLETE: "SCAN_COMPLETE",
    ERROR_THROWN: "ERROR",
    CANCEL: "CANCELLED",
    START_OVER: "INTRO"
  },
  SCAN_PAUSED: {
    FACE_RECOVERED: "SCAN_ACTIVE",
    QUALITY_BLOCKED: "QUALITY_WARNING",
    ERROR_THROWN: "ERROR",
    CANCEL: "CANCELLED",
    START_OVER: "INTRO"
  },
  QUALITY_WARNING: {
    QUALITY_READY: "SCAN_ACTIVE",
    FACE_LOST: "SCAN_PAUSED",
    ERROR_THROWN: "ERROR",
    CANCEL: "CANCELLED",
    START_OVER: "INTRO"
  },
  SCAN_COMPLETE: {
    START_OVER: "INTRO",
    CANCEL: "CANCELLED"
  },
  ERROR: {
    START_OVER: "INTRO",
    CANCEL: "CANCELLED"
  },
  CANCELLED: {
    START_OVER: "INTRO"
  }
};

export function transitionGameFaceSetupState(state: GameFaceSetupState, event: GameFaceSetupEvent): GameFaceSetupState {
  return transitions[state][event] ?? state;
}

export function canCompleteGameFaceSetupFromCoverage(input: { elapsedMs: number; requiredCoverageComplete: boolean; qualityAccepted: boolean }) {
  return input.requiredCoverageComplete && input.qualityAccepted;
}
