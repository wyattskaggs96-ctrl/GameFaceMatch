import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import { createCaptureReviewReport } from "@/lib/capture/image-quality-service";
import type {
  AppearanceProfile,
  CaptureMetadata,
  CaptureQualityReport,
  FacialMeasurement,
  GeometryProfile,
  MeasurementConfidence,
  SourceAngleAvailability,
  StandardFaceProfile,
  StandardFacialMeasurementID
} from "@/types/domain";
import type { AttributeConfirmationState } from "./attribute-confirmation";
import { createAppearanceAttributes } from "./attribute-confirmation";

export const standardFaceProfileVersion = "web-mvp-profile-v1";
export const unavailableWebMeasurementIDs: StandardFacialMeasurementID[] = [
  "faceWidthRatio",
  "faceLengthRatio",
  "foreheadWidthRatio",
  "jawWidthRatio",
  "chinWidthRatio",
  "eyeSpacingRatio",
  "noseWidthRatio",
  "noseLengthRatio",
  "mouthWidthRatio",
  "lowerFaceRatio"
];

export function createStandardFaceProfile(input: {
  session: ActiveCaptureSession;
  attributes: AttributeConfirmationState;
  now?: Date;
  userAgent?: string;
}): StandardFaceProfile {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  return {
    id: `profile-${createdAt}`,
    profileVersion: standardFaceProfileVersion,
    createdAt,
    capture: createCaptureMetadata(input.session, createdAt, input.userAgent),
    qualityReport: createCaptureQualitySummary(input.session),
    geometry: createUnavailableGeometryProfile(),
    appearance: createAppearanceProfile(input.attributes),
    sourceAngleAvailability: createSourceAngleAvailability(input.session)
  };
}

export function createUnavailableGeometryProfile(): GeometryProfile {
  return {
    modelVersion: "web-rgb-unavailable-geometry-v1",
    measurements: Object.fromEntries(unavailableWebMeasurementIDs.map((id) => [id, createUnavailableMeasurement()])) as GeometryProfile["measurements"],
    unavailableMeasurements: unavailableWebMeasurementIDs
  };
}

export function createUnavailableMeasurement(): FacialMeasurement {
  return {
    value: null,
    confidence: unavailableConfidence(),
    supportingFrameCount: 0,
    variance: null,
    depthSupported: false,
    occlusionStatus: "unknown",
    measurementSource: "notMeasured",
    availabilityState: "unavailable"
  };
}

export function createCaptureQualitySummary(session: ActiveCaptureSession): CaptureQualityReport {
  const review = createCaptureReviewReport(session.angles);
  return {
    overallScore: review.canContinue ? 1 : 0,
    requiredAnglesComplete: session.angles.every((angle) => angle.status === "complete"),
    isUsableForPrototype: review.canContinue,
    blockingIssueCount: review.blockingMessages.length,
    advisoryIssueCount: review.advisoryMessages.length,
    issues: [
      ...review.blockingMessages.map((message, index) => ({
        id: `blocking-${index}`,
        severity: "blocking" as const,
        message
      })),
      ...review.advisoryMessages.map((message, index) => ({
        id: `advisory-${index}`,
        severity: "advisory" as const,
        message
      }))
    ]
  };
}

export function createSourceAngleAvailability(session: ActiveCaptureSession): StandardFaceProfile["sourceAngleAvailability"] {
  return Object.fromEntries(
    session.angles.map((angle) => [
      angle.id,
      {
        angleID: angle.id,
        available: angle.status === "complete" && Boolean(angle.image),
        source: angle.image?.source,
        qualityState: angle.qualityReport?.overallState,
        width: angle.image?.width,
        height: angle.image?.height
      } satisfies SourceAngleAvailability
    ])
  ) as StandardFaceProfile["sourceAngleAvailability"];
}

export function serializeProfile(profile: StandardFaceProfile) {
  return JSON.stringify(profile);
}

export function deserializeProfile(serializedProfile: string) {
  return JSON.parse(serializedProfile) as StandardFaceProfile;
}

function createCaptureMetadata(session: ActiveCaptureSession, capturedAt: string, userAgent?: string): CaptureMetadata {
  const review = createCaptureReviewReport(session.angles);
  return {
    mode: "webRgbGuided",
    deviceModel: "browser",
    capturedAt,
    overallQuality: review.canContinue ? 1 : 0,
    operatingSystemVersion: "browser",
    appVersion: standardFaceProfileVersion,
    browserName: userAgent,
    browserRgbOnly: true
  };
}

function createAppearanceProfile(attributes: AttributeConfirmationState): AppearanceProfile {
  return {
    modelVersion: "user-confirmed-appearance-v1",
    attributes: createAppearanceAttributes(attributes)
  };
}

function unavailableConfidence(): MeasurementConfidence {
  return {
    score: 0,
    label: "unavailable"
  };
}
