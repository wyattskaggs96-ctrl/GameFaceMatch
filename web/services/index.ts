export type { BrowserCameraService } from "../lib/capture/browser-camera-service";
export { createBrowserCameraService } from "../lib/capture/browser-camera-service";
export type { ActiveCaptureSession } from "../lib/capture/capture-session";
export {
  REQUIRED_CAPTURE_ANGLES,
  cancelCaptureSession,
  createCaptureQualityReport,
  createInitialCaptureSession,
  getCompletedAngleCount,
  getCurrentAngle,
  getMissingRequiredAngles,
  removeAngleCapture,
  retakeAngle,
  setAngleCapture,
  setAngleError,
  setAngleManualConfirmation,
  setCurrentAngle
} from "../lib/capture/capture-session";
export type {
  GuidedCaptureAttempt,
  GuidedCaptureStateMachine,
  GuidedCaptureSummary,
  GuidedCaptureViewDefinition,
  GuidedCaptureViewID,
  GuidedCaptureViewState
} from "../lib/capture/capture-state-machine";
export {
  abandonGuidedCaptureSession,
  abandonGuidedCaptureView,
  capturedAngleToGuidedView,
  createGuidedCaptureStateMachine,
  getOptionalViewIDs,
  getRequiredViewIDs,
  guidedCaptureViewDefinitions,
  markCapturedAngleFailureInStateMachine,
  markGuidedCaptureQualityFailure,
  recordCapturedAngleInStateMachine,
  recordGuidedCaptureResult,
  recoverGuidedCaptureView,
  requestCapturedAngleRetakeInStateMachine,
  requestGuidedCaptureRetake,
  selectGuidedCaptureView,
  skipOptionalGuidedCaptureView,
  summarizeGuidedCapture
} from "../lib/capture/capture-state-machine";
export type { BrowserImageQualityService, ImageQualityInput, PixelSample } from "../lib/capture/image-quality-service";
export {
  applyManualConfirmationToReport,
  calculateImageMeasurements,
  createBrowserImageQualityService,
  createCaptureReviewReport,
  createImageQualityReport
} from "../lib/capture/image-quality-service";
export type { ImageMetadataInput } from "../lib/capture/image-validation";
export {
  createBasicDuplicateSignature,
  createImageSignature,
  createTemporaryImageReference,
  validateImageFile,
  validateImageMetadata
} from "../lib/capture/image-validation";
export type { AttributeConfirmationState, AttributeValidationResult } from "../lib/profile/attribute-confirmation";
export {
  attributeLabels,
  containsSensitiveTraitField,
  createAppearanceAttributes,
  createInitialAttributeConfirmation,
  requiredAttributeKeys,
  validateAttributeConfirmation
} from "../lib/profile/attribute-confirmation";
export {
  createCaptureQualitySummary,
  createSourceAngleAvailability,
  createStandardFaceProfile,
  createUnavailableGeometryProfile,
  createUnavailableMeasurement,
  deserializeProfile,
  serializeProfile,
  standardFaceProfileVersion,
  unavailableWebMeasurementIDs
} from "../lib/profile/standard-face-profile";
export type { MatchingEngine, MatchingFeatureConfig, MatchingInput, MatchingPreferences } from "../lib/matching/matching-engine";
export { createRuleBasedMatchingEngine, defaultGeometryFeatureConfig } from "../lib/matching/matching-engine";
