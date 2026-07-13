import type {
  CapturedAngle,
  CapturedAngleID,
  CaptureQualityReport,
  CaptureSource,
  CaptureGuidanceReport,
  FaceLandmarkReport,
  ImageQualityReport,
  TemporaryImageReference
} from "@/types/domain";
import {
  abandonGuidedCaptureSession,
  createGuidedCaptureStateMachine,
  markCapturedAngleFailureInStateMachine,
  recordCapturedAngleInStateMachine,
  requestCapturedAngleRetakeInStateMachine,
  type GuidedCaptureStateMachine
} from "./capture-state-machine";
import { createCaptureCoverageMap, type CaptureCoverageMap } from "./capture-coverage";

export interface ActiveCaptureSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  mode: "webRgbGuided";
  status: "active" | "cancelled" | "complete";
  currentAngleID: CapturedAngleID;
  errorMessage?: string;
  angles: CapturedAngle[];
  captureState: GuidedCaptureStateMachine;
  coverageMap: CaptureCoverageMap;
}

export interface CaptureSessionMutation {
  session: ActiveCaptureSession;
  objectUrlsToRevoke: string[];
}

export const REQUIRED_CAPTURE_ANGLES: ReadonlyArray<
  Omit<CapturedAngle, "status" | "validationErrors" | "validationStatus" | "source" | "image" | "qualityReport" | "manualConfirmation">
> = [
  {
    id: "straightOn",
    label: "Straight-on",
    instruction: "Front view: face the camera directly, keep one face centered, hold a neutral expression with lips gently closed, and use even front lighting."
  },
  {
    id: "left45",
    label: "Left 45 degrees",
    instruction: "Three-quarter view: turn your head about 45 degrees to your left while keeping the full face visible, centered, and still."
  },
  {
    id: "right45",
    label: "Right 45 degrees",
    instruction: "Three-quarter view: turn your head about 45 degrees to your right while keeping the full face visible, centered, and still."
  },
  {
    id: "leftProfile",
    label: "Left profile",
    instruction: "Profile view: turn to show the left side of your face, keep one person in frame, avoid blur, and keep the full forehead, nose, lips, chin, and jaw visible."
  },
  {
    id: "rightProfile",
    label: "Right profile",
    instruction: "Profile view: turn to show the right side of your face, avoid strong shadows and motion, and keep the full forehead, nose, lips, chin, and jaw visible."
  }
];

export function createInitialCaptureSession(now = new Date()): ActiveCaptureSession {
  const timestamp = now.toISOString();
  const angles = REQUIRED_CAPTURE_ANGLES.map((angle) => ({
    ...angle,
    status: "empty" as const,
    validationStatus: "notStarted" as const,
    manualConfirmation: {
      requestedAngle: false,
      neutralExpression: false,
      onePerson: false
    },
    validationErrors: []
  }));
  return {
    id: `session-${timestamp}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    mode: "webRgbGuided",
    status: "active",
    currentAngleID: "straightOn",
    captureState: createGuidedCaptureStateMachine(now),
    coverageMap: createCaptureCoverageMap(angles, now),
    angles
  };
}

export function getMissingRequiredAngles(angles: CapturedAngle[]): CapturedAngleID[] {
  return angles.filter((angle) => angle.status !== "complete").map((angle) => angle.id);
}

export function getCurrentAngle(session: ActiveCaptureSession) {
  return session.angles.find((angle) => angle.id === session.currentAngleID) ?? session.angles[0];
}

export function setCurrentAngle(session: ActiveCaptureSession, currentAngleID: CapturedAngleID): ActiveCaptureSession {
  return {
    ...session,
    currentAngleID,
    updatedAt: new Date().toISOString()
  };
}

export function setAngleCapture(
  session: ActiveCaptureSession,
  angleID: CapturedAngleID,
  image: TemporaryImageReference,
  source: CaptureSource,
  qualityReport?: ImageQualityReport,
  faceLandmarkReport?: FaceLandmarkReport,
  captureGuidanceReport?: CaptureGuidanceReport
): CaptureSessionMutation {
  const objectUrlsToRevoke = getObjectUrlsForAngle(session, angleID);
  const nextAngles = session.angles.map((angle) =>
    angle.id === angleID
      ? {
          ...angle,
          status: "complete" as const,
          source,
          validationStatus: "valid" as const,
          validationErrors: [],
          qualityReport,
          faceLandmarkReport,
          captureGuidanceReport,
          image
        }
      : angle
  );
  const nextSession = {
    ...session,
    status: getMissingRequiredAngles(nextAngles).length === 0 ? "complete" : "active",
    angles: nextAngles,
    captureState: recordCapturedAngleInStateMachine(session.captureState, angleID, {
      source,
      qualityReport,
      notes: captureGuidanceReport
        ? [
            `Live quality score ${captureGuidanceReport.realtimeQuality.score}/100.`,
            `${captureGuidanceReport.realtimeQuality.blockingSignalCount} blocking signals; ${captureGuidanceReport.realtimeQuality.advisorySignalCount} advisory signals.`
          ]
        : []
    }),
    updatedAt: new Date().toISOString()
  } satisfies ActiveCaptureSession;
  return {
    session: refreshCaptureCoverage(nextSession),
    objectUrlsToRevoke
  };
}

export function setAngleError(session: ActiveCaptureSession, angleID: CapturedAngleID, validationErrors: string[]): ActiveCaptureSession {
  return refreshCaptureCoverage({
    ...session,
    status: "active",
    captureState: markCapturedAngleFailureInStateMachine(session.captureState, angleID, validationErrors.join(" ")),
    angles: session.angles.map((angle) =>
      angle.id === angleID
        ? {
            ...angle,
            status: "error",
            validationStatus: "invalid",
            validationErrors,
            qualityReport: undefined,
            faceLandmarkReport: undefined,
            captureGuidanceReport: undefined,
            image: undefined
          }
        : angle
    ),
    updatedAt: new Date().toISOString()
  });
}

export function retakeAngle(session: ActiveCaptureSession, angleID: CapturedAngleID): CaptureSessionMutation {
  return clearAngle(session, angleID, angleID, "Retake requested for this view.");
}

export function removeAngleCapture(session: ActiveCaptureSession, angleID: CapturedAngleID): CaptureSessionMutation {
  return clearAngle(session, angleID, session.currentAngleID, "Captured view removed.");
}

export function setAngleManualConfirmation(
  session: ActiveCaptureSession,
  angleID: CapturedAngleID,
  confirmation: Partial<CapturedAngle["manualConfirmation"]>,
  qualityReport?: ImageQualityReport
): ActiveCaptureSession {
  return refreshCaptureCoverage({
    ...session,
    angles: session.angles.map((angle) =>
      angle.id === angleID
        ? {
            ...angle,
            manualConfirmation: {
              ...angle.manualConfirmation,
              ...confirmation
            },
            qualityReport: qualityReport ?? angle.qualityReport
          }
        : angle
    ),
    updatedAt: new Date().toISOString()
  });
}

export function cancelCaptureSession(session: ActiveCaptureSession): CaptureSessionMutation {
  const objectUrlsToRevoke = session.angles.flatMap((angle) => (angle.image?.objectUrl ? [angle.image.objectUrl] : []));
  const nextSession = createInitialCaptureSession();
  return {
    session: refreshCaptureCoverage({
      ...nextSession,
      status: "cancelled",
      errorMessage: "Capture session cancelled.",
      captureState: abandonGuidedCaptureSession(session.captureState, "Capture session cancelled.")
    }),
    objectUrlsToRevoke
  };
}

export function getCompletedAngleCount(angles: CapturedAngle[]) {
  return angles.filter((angle) => angle.status === "complete").length;
}

export function createCaptureQualityReport(angles: CapturedAngle[]): CaptureQualityReport {
  const missing = getMissingRequiredAngles(angles);
  const imageErrors = angles.flatMap((angle) =>
    angle.validationErrors.map((message) => ({
      id: `${angle.id}-${message}`,
      severity: "blocking" as const,
      message: `${angle.label}: ${message}`
    }))
  );
  return {
    overallScore: missing.length === 0 && imageErrors.length === 0 ? 1 : 0,
    issues: [
      ...missing.map((id) => ({
        id: `missing-${id}`,
        severity: "blocking" as const,
        message: `Missing required angle: ${id}`
      })),
      ...imageErrors
    ],
    isUsableForPrototype: missing.length === 0 && imageErrors.length === 0,
    requiredAnglesComplete: missing.length === 0
  };
}

function clearAngle(
  session: ActiveCaptureSession,
  angleID: CapturedAngleID,
  currentAngleID: CapturedAngleID,
  reason: string
): CaptureSessionMutation {
  const objectUrlsToRevoke = getObjectUrlsForAngle(session, angleID);
  const nextSession = {
    ...session,
    status: "active",
    currentAngleID,
    captureState: requestCapturedAngleRetakeInStateMachine(session.captureState, angleID, reason),
    angles: session.angles.map((angle) =>
      angle.id === angleID
        ? {
            ...angle,
            status: "empty",
            source: undefined,
            validationStatus: "notStarted",
            qualityReport: undefined,
            faceLandmarkReport: undefined,
            captureGuidanceReport: undefined,
            validationErrors: [],
            image: undefined
          }
        : angle
    ),
    updatedAt: new Date().toISOString()
  } satisfies ActiveCaptureSession;
  return {
    session: refreshCaptureCoverage(nextSession),
    objectUrlsToRevoke
  };
}

function getObjectUrlsForAngle(session: ActiveCaptureSession, angleID: CapturedAngleID) {
  return session.angles.flatMap((angle) => (angle.id === angleID && angle.image?.objectUrl ? [angle.image.objectUrl] : []));
}

function refreshCaptureCoverage(session: ActiveCaptureSession): ActiveCaptureSession {
  return {
    ...session,
    coverageMap: createCaptureCoverageMap(session.angles)
  };
}
