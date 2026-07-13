import type { ActiveCaptureSession } from "@/lib/capture/capture-session";
import { createCaptureReviewReport } from "@/lib/capture/image-quality-service";
import type {
  AppearanceAttribute,
  AppearanceProfile,
  CaptureMetadata,
  CaptureQualityReport,
  CapturedAngleID,
  FacialMeasurement,
  GeometryProfile,
  MeasurementConfidence,
  SourceAngleAvailability,
  StandardFaceProfile,
  StandardFaceProfileAngleSupport,
  StandardFaceProfileConfidence,
  StandardFaceProfileDeletionState,
  StandardFaceProfileModelVersions,
  StandardFaceProfileSupportingFrames,
  StandardFacialMeasurementID
} from "@/types/domain";
import type { AttributeConfirmationState } from "./attribute-confirmation";
import { containsSensitiveTraitField, createAppearanceAttributes } from "./attribute-confirmation";
import {
  createRgbLandmarkGeometryProfile,
  rgbLandmarkGeometryAlgorithmVersion,
  webRgbGeometryMeasurementIDs
} from "./rgb-landmark-geometry";

export const standardFaceProfileContractVersion = "standard-face-profile-contract-v2";
export const standardFaceProfileVersion = "standard-face-profile-v2";
export const standardFaceProfileBuilderVersion = "web-standard-face-profile-builder-v2";
export const captureQualityModelVersion = "web-capture-quality-summary-v1";
export const unavailableWebMeasurementIDs: StandardFacialMeasurementID[] = webRgbGeometryMeasurementIDs;

export interface StandardFaceProfileValidationIssue {
  code: string;
  message: string;
  path: string;
}

export interface StandardFaceProfileValidationResult {
  ok: boolean;
  errors: StandardFaceProfileValidationIssue[];
  warnings: StandardFaceProfileValidationIssue[];
}

export function createStandardFaceProfile(input: {
  session: ActiveCaptureSession;
  attributes: AttributeConfirmationState;
  now?: Date;
  userAgent?: string;
}): StandardFaceProfile {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const geometry = createRgbLandmarkGeometryProfile(input.session);
  const userConfirmedAttributes = createAppearanceAttributes(input.attributes);
  const appearance = createAppearanceProfile(userConfirmedAttributes);
  const qualityReport = createCaptureQualitySummary(input.session);
  const sourceAngleAvailability = createSourceAngleAvailability(input.session);
  const supportingFrames = createSupportingFrameSummary(input.session);
  const modelVersions = createModelVersions(geometry, appearance, input.session);
  return {
    id: `profile-${createdAt}`,
    profileContractVersion: standardFaceProfileContractVersion,
    profileVersion: standardFaceProfileVersion,
    createdAt,
    capture: createCaptureMetadata(input.session, createdAt, input.userAgent),
    qualityReport,
    geometry,
    appearance,
    confidence: createProfileConfidenceSummary(qualityReport, geometry, userConfirmedAttributes, supportingFrames),
    supportingFrames,
    userConfirmedAttributes,
    modelVersions,
    deletionState: createActiveDeletionState(),
    sourceAngleAvailability
  };
}

export function createUnavailableGeometryProfile(): GeometryProfile {
  return {
    modelVersion: rgbLandmarkGeometryAlgorithmVersion,
    measurements: Object.fromEntries(unavailableWebMeasurementIDs.map((id) => [id, createUnavailableMeasurement()])) as GeometryProfile["measurements"],
    unavailableMeasurements: unavailableWebMeasurementIDs
  };
}

export function createUnavailableMeasurement(_reason?: string): FacialMeasurement {
  return {
    value: null,
    confidence: unavailableConfidence(),
    supportingFrameCount: 0,
    supportingPoses: [],
    variance: null,
    depthSupported: false,
    profileEvidenceExists: false,
    occlusionImpact: "unknown",
    occlusionStatus: "unknown",
    measurementSource: "notMeasured",
    availabilityState: "unavailable",
    algorithmVersion: rgbLandmarkGeometryAlgorithmVersion
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
  const validation = validateStandardFaceProfile(profile);
  if (!validation.ok) {
    throw new Error(`Cannot serialize invalid StandardFaceProfile: ${validation.errors.map((error) => error.code).join(", ")}`);
  }
  return JSON.stringify(profile);
}

export function deserializeProfile(serializedProfile: string) {
  return migrateStandardFaceProfile(JSON.parse(serializedProfile));
}

export function migrateStandardFaceProfile(input: unknown): StandardFaceProfile {
  if (!isRecord(input)) {
    throw new Error("Cannot migrate StandardFaceProfile: expected an object.");
  }
  const legacy = input as Partial<StandardFaceProfile>;
  const geometry = legacy.geometry ?? createUnavailableGeometryProfile();
  const appearance = legacy.appearance ?? { modelVersion: "unknown-appearance-model", attributes: [] };
  const sourceAngleAvailability = normalizeSourceAngleAvailability(legacy.sourceAngleAvailability);
  const qualityReport = legacy.qualityReport ?? {
    overallScore: 0,
    issues: [],
    isUsableForPrototype: false,
    requiredAnglesComplete: false
  };
  const supportingFrames = legacy.supportingFrames ?? createSupportingFrameSummaryFromAvailability(sourceAngleAvailability);
  const userConfirmedAttributes = legacy.userConfirmedAttributes ?? appearance.attributes.filter((attribute) => attribute.userConfirmed);
  const modelVersions =
    legacy.modelVersions ??
    ({
      profileContract: standardFaceProfileContractVersion,
      profileBuilder: standardFaceProfileBuilderVersion,
      geometry: geometry.modelVersion,
      appearance: appearance.modelVersion,
      captureQuality: captureQualityModelVersion,
      measurementAlgorithm: geometry.modelVersion,
      landmarkProvider: inferLandmarkProviderVersion(geometry)
    } satisfies StandardFaceProfileModelVersions);
  const migrated: StandardFaceProfile = {
    id: typeof legacy.id === "string" ? legacy.id : `profile-${new Date().toISOString()}`,
    profileContractVersion: standardFaceProfileContractVersion,
    profileVersion: standardFaceProfileVersion,
    createdAt: typeof legacy.createdAt === "string" ? legacy.createdAt : new Date().toISOString(),
    capture: legacy.capture ?? createUnknownCaptureMetadata(),
    qualityReport,
    geometry,
    appearance,
    confidence: legacy.confidence ?? createProfileConfidenceSummary(qualityReport, geometry, userConfirmedAttributes, supportingFrames),
    supportingFrames,
    userConfirmedAttributes,
    modelVersions: {
      ...modelVersions,
      profileContract: standardFaceProfileContractVersion,
      profileBuilder: modelVersions.profileBuilder || standardFaceProfileBuilderVersion
    },
    deletionState: legacy.deletionState ?? createActiveDeletionState(),
    sourceAngleAvailability
  };
  const validation = validateStandardFaceProfile(migrated);
  if (!validation.ok) {
    throw new Error(`Migrated StandardFaceProfile is invalid: ${validation.errors.map((error) => error.code).join(", ")}`);
  }
  return migrated;
}

export function validateStandardFaceProfile(profile: StandardFaceProfile): StandardFaceProfileValidationResult {
  const errors: StandardFaceProfileValidationIssue[] = [];
  const warnings: StandardFaceProfileValidationIssue[] = [];
  if (profile.profileContractVersion !== standardFaceProfileContractVersion) {
    errors.push(issue("profileContractVersionUnsupported", "Profile contract version is not supported.", "profileContractVersion"));
  }
  if (profile.profileVersion !== standardFaceProfileVersion) {
    errors.push(issue("profileVersionUnsupported", "Profile version is not supported.", "profileVersion"));
  }
  if (!isISODateString(profile.createdAt)) {
    errors.push(issue("invalidCreatedAt", "Profile creation timestamp must be an ISO date string.", "createdAt"));
  }
  validateCapture(profile, errors);
  validateModelVersions(profile.modelVersions, errors);
  validateMeasurements(profile.geometry.measurements, errors);
  validateUserConfirmedAttributes(profile.userConfirmedAttributes, errors);
  validateDeletionState(profile.deletionState, errors);
  validateSupportingFrames(profile.supportingFrames, errors);
  validateNoSerializedRawMedia(profile, errors);
  if (profile.appearance.attributes.length !== profile.userConfirmedAttributes.length) {
    warnings.push(issue("appearanceAttributeMirrorMismatch", "Appearance attributes and user-confirmed attributes differ.", "userConfirmedAttributes"));
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

export function markStandardFaceProfileDeleted(
  profile: StandardFaceProfile,
  input: { deletedAt?: Date; deletionRecordID: string; reason: string }
): StandardFaceProfile {
  const deletedAt = (input.deletedAt ?? new Date()).toISOString();
  return {
    ...profile,
    deletionState: {
      status: "deleted",
      deletedAt,
      deletionRecordID: input.deletionRecordID,
      reason: input.reason
    }
  };
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

function createAppearanceProfile(attributes: AppearanceAttribute[]): AppearanceProfile {
  return {
    modelVersion: "user-confirmed-appearance-v1",
    attributes
  };
}

function unavailableConfidence(): MeasurementConfidence {
  return {
    score: 0,
    label: "unavailable"
  };
}

function createModelVersions(
  geometry: GeometryProfile,
  appearance: AppearanceProfile,
  session: ActiveCaptureSession
): StandardFaceProfileModelVersions {
  return {
    profileContract: standardFaceProfileContractVersion,
    profileBuilder: standardFaceProfileBuilderVersion,
    geometry: geometry.modelVersion,
    appearance: appearance.modelVersion,
    captureQuality: captureQualityModelVersion,
    measurementAlgorithm: rgbLandmarkGeometryAlgorithmVersion,
    landmarkProvider: inferLandmarkProviderVersion(geometry, session)
  };
}

function createProfileConfidenceSummary(
  qualityReport: CaptureQualityReport,
  geometry: GeometryProfile,
  userConfirmedAttributes: AppearanceAttribute[],
  supportingFrames: StandardFaceProfileSupportingFrames
): StandardFaceProfileConfidence {
  const availableMeasurements = Object.values(geometry.measurements).filter((measurement) => measurement?.availabilityState === "available");
  const geometryScore = average(availableMeasurements.map((measurement) => measurement?.confidence.score ?? 0));
  const appearanceScore = userConfirmedAttributes.length > 0 ? average(userConfirmedAttributes.map((attribute) => attribute.confidence.score)) : 0;
  const evidenceScore = supportingFrames.availableAngleIDs.length / Math.max(supportingFrames.requiredAngleCount, 1);
  const captureScore = qualityReport.overallScore;
  return {
    overall: confidenceFromScore(average([captureScore, geometryScore, appearanceScore, evidenceScore])),
    captureQuality: confidenceFromScore(captureScore),
    geometry: confidenceFromScore(geometryScore),
    appearance: confidenceFromScore(appearanceScore),
    evidenceCompleteness: confidenceFromScore(evidenceScore)
  };
}

function createSupportingFrameSummary(session: ActiveCaptureSession): StandardFaceProfileSupportingFrames {
  return createSupportingFrameSummaryFromAvailability(createSourceAngleAvailability(session));
}

function createSupportingFrameSummaryFromAvailability(
  sourceAngleAvailability: StandardFaceProfile["sourceAngleAvailability"]
): StandardFaceProfileSupportingFrames {
  const byAngle = Object.fromEntries(
    requiredAngles.map((angleID) => {
      const availability = sourceAngleAvailability[angleID];
      return [
        angleID,
        {
          angleID,
          available: Boolean(availability?.available),
          source: availability?.source,
          frameCount: availability?.available ? 1 : 0,
          width: availability?.width,
          height: availability?.height,
          qualityState: availability?.qualityState
        } satisfies StandardFaceProfileAngleSupport
      ];
    })
  ) as StandardFaceProfileSupportingFrames["byAngle"];
  const availableAngleIDs = requiredAngles.filter((angleID) => byAngle[angleID].available);
  return {
    totalFrameCount: Object.values(byAngle).reduce((total, angle) => total + angle.frameCount, 0),
    availableAngleIDs,
    requiredAngleCount: requiredAngles.length,
    profileAngleCount: availableAngleIDs.filter((angleID) => angleID === "leftProfile" || angleID === "rightProfile").length,
    depthFrameCount: 0,
    byAngle
  };
}

function createActiveDeletionState(): StandardFaceProfileDeletionState {
  return {
    status: "active",
    deletedAt: null,
    deletionRecordID: null,
    reason: null
  };
}

function createUnknownCaptureMetadata(): CaptureMetadata {
  return {
    mode: "unknown",
    deviceModel: "unknown",
    capturedAt: new Date().toISOString(),
    overallQuality: 0,
    operatingSystemVersion: "unknown",
    appVersion: "unknown",
    browserRgbOnly: true
  };
}

function normalizeSourceAngleAvailability(input: unknown): StandardFaceProfile["sourceAngleAvailability"] {
  const record = isRecord(input) ? input : {};
  return Object.fromEntries(
    requiredAngles.map((angleID) => {
      const value = isRecord(record[angleID]) ? record[angleID] : {};
      return [
        angleID,
        {
          angleID,
          available: Boolean(value.available),
          source: value.source === "camera" || value.source === "upload" ? value.source : undefined,
          qualityState: value.qualityState === "ready" || value.qualityState === "needsReview" || value.qualityState === "blocked" ? value.qualityState : undefined,
          width: typeof value.width === "number" ? value.width : undefined,
          height: typeof value.height === "number" ? value.height : undefined
        } satisfies SourceAngleAvailability
      ];
    })
  ) as StandardFaceProfile["sourceAngleAvailability"];
}

function validateCapture(profile: StandardFaceProfile, errors: StandardFaceProfileValidationIssue[]) {
  if (!profile.capture.browserRgbOnly && profile.capture.mode === "webRgbGuided") {
    errors.push(issue("webRgbProfileMustBeRgbOnly", "Web RGB profiles must keep browserRgbOnly true.", "capture.browserRgbOnly"));
  }
  if (!isNormalizedScore(profile.capture.overallQuality)) {
    errors.push(issue("invalidCaptureQuality", "Capture overallQuality must be a normalized score from 0 to 1.", "capture.overallQuality"));
  }
}

function validateModelVersions(modelVersions: StandardFaceProfileModelVersions, errors: StandardFaceProfileValidationIssue[]) {
  for (const [key, value] of Object.entries(modelVersions)) {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(issue("missingModelVersion", `Model version '${key}' must be recorded.`, `modelVersions.${key}`));
    }
  }
}

function validateMeasurements(
  measurements: GeometryProfile["measurements"],
  errors: StandardFaceProfileValidationIssue[]
) {
  for (const [id, measurement] of Object.entries(measurements)) {
    if (!measurement) continue;
    if (measurement.availabilityState === "available") {
      if (!isNormalizedScore(measurement.value)) {
        errors.push(issue("measurementNotNormalized", `${id} value must be a normalized finite value from 0 to 1.`, `geometry.measurements.${id}.value`));
      }
      if (measurement.supportingFrameCount <= 0) {
        errors.push(issue("measurementMissingSupport", `${id} must include supporting-frame information.`, `geometry.measurements.${id}.supportingFrameCount`));
      }
    }
    if (!isNormalizedScore(measurement.confidence.score)) {
      errors.push(issue("measurementConfidenceInvalid", `${id} confidence must be from 0 to 1.`, `geometry.measurements.${id}.confidence.score`));
    }
    if (measurement.variance !== null && (!Number.isFinite(measurement.variance) || measurement.variance < 0)) {
      errors.push(issue("measurementVarianceInvalid", `${id} variance must be null or nonnegative.`, `geometry.measurements.${id}.variance`));
    }
    if (measurement.depthSupported) {
      errors.push(issue("webMeasurementDepthUnsupported", `${id} must not claim depth support in the web RGB profile contract.`, `geometry.measurements.${id}.depthSupported`));
    }
  }
}

function validateUserConfirmedAttributes(attributes: AppearanceAttribute[], errors: StandardFaceProfileValidationIssue[]) {
  if (containsSensitiveTraitField(attributes.map((attribute) => attribute.category))) {
    errors.push(issue("sensitiveTraitField", "User-confirmed attributes must not include sensitive-trait fields.", "userConfirmedAttributes"));
  }
  for (const attribute of attributes) {
    if (!attribute.userConfirmed || attribute.source !== "userConfirmed") {
      errors.push(issue("attributeNotUserConfirmed", `${attribute.category} must be user-confirmed.`, `userConfirmedAttributes.${attribute.category}`));
    }
  }
}

function validateDeletionState(deletionState: StandardFaceProfileDeletionState, errors: StandardFaceProfileValidationIssue[]) {
  if (deletionState.status === "deleted" && !deletionState.deletedAt) {
    errors.push(issue("deletedProfileMissingTimestamp", "Deleted profiles must include a deletion timestamp.", "deletionState.deletedAt"));
  }
  if (deletionState.deletedAt && !isISODateString(deletionState.deletedAt)) {
    errors.push(issue("invalidDeletionTimestamp", "Deletion timestamp must be an ISO date string.", "deletionState.deletedAt"));
  }
}

function validateSupportingFrames(supportingFrames: StandardFaceProfileSupportingFrames, errors: StandardFaceProfileValidationIssue[]) {
  if (supportingFrames.depthFrameCount !== 0) {
    errors.push(issue("webDepthFramesUnsupported", "Web RGB profiles must not record depth frames.", "supportingFrames.depthFrameCount"));
  }
  if (supportingFrames.requiredAngleCount !== requiredAngles.length) {
    errors.push(issue("requiredAngleCountMismatch", "Supporting-frame summary must track all required RGB views.", "supportingFrames.requiredAngleCount"));
  }
  for (const angleID of requiredAngles) {
    const support = supportingFrames.byAngle[angleID];
    if (!support || support.angleID !== angleID || support.frameCount < 0) {
      errors.push(issue("invalidAngleSupport", `${angleID} supporting-frame entry is invalid.`, `supportingFrames.byAngle.${angleID}`));
    }
  }
}

function validateNoSerializedRawMedia(profile: StandardFaceProfile, errors: StandardFaceProfileValidationIssue[]) {
  const serialized = JSON.stringify(profile);
  const rawMediaTokens = ["blob:", "objectUrl", ".jpg", ".jpeg", ".png", ".webp", "coreLandmarks"];
  for (const token of rawMediaTokens) {
    if (serialized.includes(token)) {
      errors.push(issue("rawMediaReferenceSerialized", `Profile must not serialize raw media or landmark references containing '${token}'.`, "profile"));
    }
  }
}

function inferLandmarkProviderVersion(geometry: GeometryProfile, session?: ActiveCaptureSession) {
  const providerFromSession = session?.angles.find((angle) => angle.faceLandmarkReport)?.faceLandmarkReport?.provider;
  if (providerFromSession) return `${providerFromSession.providerName}@${providerFromSession.packageVersion}/${providerFromSession.modelVersion}`;
  const hasMeasuredGeometry = Object.values(geometry.measurements).some((measurement) => measurement?.availabilityState === "available");
  return hasMeasuredGeometry ? "local-browser-landmark-provider-recorded-per-measurement" : "unavailable";
}

function confidenceFromScore(score: number): MeasurementConfidence {
  const normalized = clamp01(score);
  return {
    score: normalized,
    label: normalized >= 0.75 ? "high" : normalized >= 0.45 ? "medium" : normalized > 0 ? "low" : "unavailable"
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function isNormalizedScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isISODateString(value: string) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(code: string, message: string, path: string): StandardFaceProfileValidationIssue {
  return { code, message, path };
}

const requiredAngles: CapturedAngleID[] = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];
