export type ISODateString = string;

export type CurrencyCode = "USD" | "CAD" | "GBP" | "EUR" | "AUD" | "unknown";
export type PurchaseType = "free" | "oneTime" | "subscription" | "consumable" | "creatorPackage";
export type PaymentStatus = "notStarted" | "providerUnavailable" | "pending" | "paid" | "failed" | "cancelled";
export type RefundStatus = "notRequested" | "requested" | "approved" | "rejected" | "processed" | "unavailable";
export type CustomerAccessStatus = "anonymous" | "freeAccess" | "entitled" | "expired" | "revoked";
export type EntitlementAccess =
  | "basicFreeMatch"
  | "topThreeResults"
  | "detailedBuildGuide"
  | "screenshotRefinement"
  | "savedProfiles"
  | "multiGameAccess";

export type CaptureMode =
  | "webRgbGuided"
  | "webManualUpload"
  | "iPhoneTrueDepthAssisted"
  | "iPhoneTrueDepthSelfScan"
  | "standardCamera"
  | "screenshotRefinement"
  | "unknown";

export type CaptureCapabilityStatus =
  | "secureContextAvailable"
  | "insecureContext"
  | "cameraApiSupported"
  | "cameraApiUnsupported"
  | "permissionNotRequested"
  | "permissionGranted"
  | "permissionDenied"
  | "permissionBlocked"
  | "cameraUnavailable"
  | "noMatchingCameraDevice"
  | "fileUploadFallbackAvailable"
  | "unknownError";

export type CatalogVerificationStatus = "verified" | "unverified" | "rejected" | "archived";
export type DataSourceType =
  | "production"
  | "research"
  | "researchDraft"
  | "researchCandidate"
  | "shippingGameVideoResearch"
  | "publicSourceOnly"
  | "testFixture"
  | "demoData"
  | "localDeveloperSample";
export type CatalogReleaseLifecycleStatus =
  | "draft"
  | "reviewCandidate"
  | "verificationCandidate"
  | "approvedRelease"
  | "supersededRelease"
  | "rejectedRelease";

export type CapturedAngleID = "straightOn" | "left45" | "right45" | "leftProfile" | "rightProfile";
export type CaptureSource = "camera" | "upload";
export type CaptureValidationStatus = "notStarted" | "valid" | "invalid";
export type QualityEvidenceKind = "measured" | "estimated" | "notYetImplemented" | "userConfirmed";
export type ImageQualityState = "ready" | "needsReview" | "blocked";
export type FaceLandmarkAvailabilityState = "available" | "unavailable" | "error" | "timeout" | "notRequested";
export type FaceDetectionCount = "zero" | "one" | "multiple" | "unavailable" | "error";
export type CaptureGuidanceSeverity = "blocking" | "advisory" | "ready";
export type CaptureGuidanceIssueCode =
  | "faceNotFound"
  | "multipleFaces"
  | "faceTooClose"
  | "faceTooFar"
  | "faceOffCenter"
  | "incorrectHeadDirection"
  | "blink"
  | "mouthOpen"
  | "strongExpression"
  | "excessiveMotion"
  | "poorLighting"
  | "underexposed"
  | "overexposed"
  | "lightingImbalance"
  | "severeBlur"
  | "occlusionLikely"
  | "missingRequiredRegion"
  | "poseReached"
  | "poseHoldPending"
  | "poseHeld"
  | "landmarksUnavailable";
export type RealtimeCaptureQualitySignalID =
  | "faceFound"
  | "singleFace"
  | "faceSize"
  | "centering"
  | "pose"
  | "blur"
  | "exposure"
  | "lightingUniformity"
  | "occlusionFreedom"
  | "expressionNeutrality"
  | "requiredRegions";
export type RealtimeCaptureQualitySignalState = "pass" | "advisory" | "blocking" | "unavailable";
export type MeasurementAvailabilityState = "available" | "unavailable" | "pending";
export type MeasurementSource = "browserRgbImage" | "iPhoneTrueDepth" | "userConfirmed" | "notMeasured";
export type StandardFacialMeasurementID =
  | "faceWidthRatio"
  | "faceLengthRatio"
  | "foreheadWidthRatio"
  | "jawWidthRatio"
  | "chinWidthRatio"
  | "eyeSpacingRatio"
  | "meanEyeWidthRatio"
  | "noseWidthRatio"
  | "noseLengthRatio"
  | "mouthWidthRatio"
  | "lowerFaceRatio"
  | "eyeTilt"
  | "browPosition"
  | "jawAngle"
  | "noseProjection"
  | "chinProjection";
export type UserConfirmedAttributeCategory =
  | "hairColorFamily"
  | "hairTextureFamily"
  | "hairstyleFamily"
  | "facialHairPresence"
  | "facialHairStyleFamily"
  | "facialHairColorFamily"
  | "eyebrowThickness"
  | "skinPresentation"
  | "visibleMarks"
  | "desiredInGameHeight"
  | "desiredInGameWeight"
  | "preferredBodyType"
  | "resemblancePhysiquePreference";
export type UserConfirmedAttributeValue = string | number | boolean | null;

export interface QualityMetric<T> {
  value: T;
  evidence: QualityEvidenceKind;
  label: string;
}

export interface ImageQualityReport {
  decodedSuccessfully: QualityMetric<boolean>;
  width: QualityMetric<number>;
  height: QualityMetric<number>;
  aspectRatio: QualityMetric<number>;
  fileSizeBytes: QualityMetric<number>;
  brightnessEstimate: QualityMetric<number | null>;
  highlightClippingEstimate: QualityMetric<number | null>;
  shadowClippingEstimate: QualityMetric<number | null>;
  sharpnessEstimate: QualityMetric<number | null>;
  lightingImbalanceEstimate: QualityMetric<number | null>;
  orientation: QualityMetric<"portrait" | "landscape" | "square" | "unknown">;
  duplicateImage: QualityMetric<boolean>;
  requiredAnglePresent: QualityMetric<boolean>;
  userConfirmedRequestedAngle: QualityMetric<boolean>;
  userConfirmedNeutralExpression: QualityMetric<boolean>;
  userConfirmedOnePerson: QualityMetric<boolean>;
  advisoryMessages: string[];
  blockingMessages: string[];
  overallState: ImageQualityState;
}

export interface CaptureReviewReport {
  angleReports: Record<CapturedAngleID, ImageQualityReport>;
  blockingMessages: string[];
  advisoryMessages: string[];
  canContinue: boolean;
}

export interface StandardFaceProfile {
  id: string;
  profileContractVersion: string;
  profileVersion: string;
  createdAt: ISODateString;
  capture: CaptureMetadata;
  qualityReport: CaptureQualityReport;
  geometry: GeometryProfile;
  appearance: AppearanceProfile;
  confidence: StandardFaceProfileConfidence;
  supportingFrames: StandardFaceProfileSupportingFrames;
  userConfirmedAttributes: AppearanceAttribute[];
  modelVersions: StandardFaceProfileModelVersions;
  deletionState: StandardFaceProfileDeletionState;
  sourceAngleAvailability: Record<CapturedAngleID, SourceAngleAvailability>;
}

export interface StandardFaceProfileModelVersions {
  profileContract: string;
  profileBuilder: string;
  geometry: string;
  appearance: string;
  captureQuality: string;
  measurementAlgorithm: string;
  landmarkProvider: string;
}

export interface StandardFaceProfileConfidence {
  overall: MeasurementConfidence;
  captureQuality: MeasurementConfidence;
  geometry: MeasurementConfidence;
  appearance: MeasurementConfidence;
  evidenceCompleteness: MeasurementConfidence;
}

export interface StandardFaceProfileSupportingFrames {
  totalFrameCount: number;
  availableAngleIDs: CapturedAngleID[];
  requiredAngleCount: number;
  profileAngleCount: number;
  depthFrameCount: number;
  byAngle: Record<CapturedAngleID, StandardFaceProfileAngleSupport>;
}

export interface StandardFaceProfileAngleSupport {
  angleID: CapturedAngleID;
  available: boolean;
  source?: CaptureSource;
  frameCount: number;
  width?: number;
  height?: number;
  qualityState?: ImageQualityState;
}

export interface StandardFaceProfileDeletionState {
  status: "active" | "deleted";
  deletedAt: ISODateString | null;
  deletionRecordID: string | null;
  reason: string | null;
}

export interface SourceAngleAvailability {
  angleID: CapturedAngleID;
  available: boolean;
  source?: CaptureSource;
  qualityState?: ImageQualityState;
  width?: number;
  height?: number;
}

export interface CaptureMetadata {
  mode: CaptureMode;
  deviceModel: string;
  capturedAt: ISODateString;
  overallQuality: number;
  operatingSystemVersion: string;
  appVersion: string;
  browserName?: string;
  browserRgbOnly: boolean;
}

export interface CapturedAngle {
  id: CapturedAngleID;
  label: string;
  instruction: string;
  status: "empty" | "capturing" | "complete" | "error";
  source?: CaptureSource;
  validationStatus: CaptureValidationStatus;
  image?: TemporaryImageReference;
  qualityReport?: ImageQualityReport;
  faceLandmarkReport?: FaceLandmarkReport;
  captureGuidanceReport?: CaptureGuidanceReport;
  manualConfirmation: {
    requestedAngle: boolean;
    neutralExpression: boolean;
    onePerson: boolean;
  };
  validationErrors: string[];
}

export interface CaptureGuidanceIssue {
  code: CaptureGuidanceIssueCode;
  severity: CaptureGuidanceSeverity;
  message: string;
  canContinueWithLimitations: boolean;
}

export interface CaptureGuidanceReport {
  protocolVersion: string;
  thresholdVersion: string;
  angleID: CapturedAngleID;
  realtimeQuality: RealtimeCaptureQualityReport;
  requiredPoseReached: boolean;
  poseHeldLongEnough: boolean;
  holdDurationMs: number;
  holdTargetMs: number;
  canCapture: boolean;
  canContinueWithLimitations: boolean;
  blockingIssues: CaptureGuidanceIssue[];
  advisoryWarnings: CaptureGuidanceIssue[];
  readyMessages: CaptureGuidanceIssue[];
  createdAt: ISODateString;
}

export interface RealtimeCaptureQualitySignal {
  id: RealtimeCaptureQualitySignalID;
  label: string;
  score: number | null;
  state: RealtimeCaptureQualitySignalState;
  message: string;
  evidence: QualityEvidenceKind;
}

export interface RealtimeCaptureQualityReport {
  score: number;
  state: ImageQualityState;
  thresholdVersion: string;
  signals: RealtimeCaptureQualitySignal[];
  blockingSignalCount: number;
  advisorySignalCount: number;
}

export interface FaceLandmarkProviderMetadata {
  providerName: string;
  packageName: string;
  packageVersion: string;
  modelName: string;
  modelVersion: string;
  modelSource: string;
  modelPath: string;
  license: string;
  integrityStrategy: string;
  updateStrategy: string;
  localOnly: boolean;
}

export interface FaceLandmarkConfidence {
  score: number | null;
  label: "low" | "medium" | "high" | "unavailable";
  evidence: QualityEvidenceKind;
}

export interface FaceLandmarkPoint {
  label: string;
  sourceIndex: number;
  x: number;
  y: number;
  z: number | null;
  confidence: FaceLandmarkConfidence;
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: FaceLandmarkConfidence;
}

export interface FaceHeadPoseEstimate {
  yawDegrees: number | null;
  pitchDegrees: number | null;
  rollDegrees: number | null;
  confidence: FaceLandmarkConfidence;
  availabilityState: FaceLandmarkAvailabilityState;
}

export interface FaceExpressionEstimate {
  leftEyeOpenness: number | null;
  rightEyeOpenness: number | null;
  mouthOpenness: number | null;
  smileLikelihood: number | null;
  strongExpressionLikelihood: number | null;
  confidence: FaceLandmarkConfidence;
  availabilityState: FaceLandmarkAvailabilityState;
}

export interface DetectedFaceLandmarks {
  boundingBox: FaceBoundingBox;
  coreLandmarks: FaceLandmarkPoint[];
  approximateHeadPose: FaceHeadPoseEstimate;
  expression: FaceExpressionEstimate;
  confidence: FaceLandmarkConfidence;
}

export interface FaceLandmarkReport {
  availabilityState: FaceLandmarkAvailabilityState;
  faceCount: FaceDetectionCount;
  detectedFaceCount: number | null;
  faces: DetectedFaceLandmarks[];
  provider: FaceLandmarkProviderMetadata;
  confidence: FaceLandmarkConfidence;
  advisoryMessages: string[];
  blockingMessages: string[];
  createdAt: ISODateString;
}

export interface TemporaryImageReference {
  objectUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
  originalFileSizeBytes?: number;
  processingNotes?: string[];
  wasDownscaled?: boolean;
  signature: string;
  source: CaptureSource;
  orientation: "portrait" | "landscape" | "square";
  associatedAngleID: CapturedAngleID;
  createdAt: ISODateString;
}

export interface CaptureQualityReport {
  overallScore: number;
  issues: CaptureQualityIssue[];
  isUsableForPrototype: boolean;
  requiredAnglesComplete: boolean;
  blockingIssueCount?: number;
  advisoryIssueCount?: number;
}

export interface CaptureQualityIssue {
  id: string;
  severity: "advisory" | "blocking";
  message: string;
}

export interface FacialMeasurement {
  value: number | null;
  confidence: MeasurementConfidence;
  supportingFrameCount: number;
  supportingPoses: CapturedAngleID[];
  variance: number | null;
  depthSupported: boolean;
  profileEvidenceExists: boolean;
  occlusionImpact: "none" | "minor" | "moderate" | "significant" | "unknown";
  occlusionStatus: "none" | "partial" | "significant" | "unknown";
  measurementSource: MeasurementSource;
  availabilityState: MeasurementAvailabilityState;
  algorithmVersion: string;
}

export interface MeasurementConfidence {
  score: number;
  label: "low" | "medium" | "high" | "unavailable";
}

export interface GeometryProfile {
  measurements: Partial<Record<StandardFacialMeasurementID, FacialMeasurement>>;
  unavailableMeasurements: StandardFacialMeasurementID[];
  modelVersion: string;
}

export interface AppearanceProfile {
  attributes: AppearanceAttribute[];
  modelVersion: string;
}

export interface AppearanceAttribute {
  id: string;
  category: UserConfirmedAttributeCategory;
  label: string;
  value: UserConfirmedAttributeValue;
  confidence: MeasurementConfidence;
  userConfirmed: boolean;
  source: "userConfirmed";
  required: boolean;
}

export interface GameCatalogManifest {
  sourceType: DataSourceType;
  catalogVersion: GameCatalogVersion;
  generatedAt: ISODateString;
  isProduction: boolean;
  declaredItemCount?: number;
  packageChecksum?: string;
  releaseStatus?: CatalogReleaseLifecycleStatus;
  releaseNotes?: CatalogReleaseNotes;
  previousCatalogVersionID?: string | null;
  supersededByCatalogVersionID?: string | null;
  items: GameCatalogItem[];
}

export interface CatalogReleaseNotes {
  summary: string;
  createdAt: ISODateString;
  author: string;
  changes: CatalogReleaseChange[];
}

export interface CatalogReleaseChange {
  type: "added" | "corrected" | "removed" | "superseded" | "metadataOnly";
  stableInternalID?: string;
  description: string;
}

export interface GameCatalogItem {
  sourceType: DataSourceType;
  stableInternalID: string;
  game: string;
  gameVersion: string;
  patchVersion?: string;
  platform: string;
  gameMode: string;
  creationPath: string;
  category: string;
  visibleGameLabelOrIndex: string;
  verificationState: CatalogVerificationStatus;
  capturedDate: ISODateString;
  verifiedDate: ISODateString | null;
  sourceImageReferences: string[];
  requiredAngles?: Record<CapturedAngleID, string>;
  geometryMeasurements: Record<string, number | CatalogFacialMeasurement>;
  humanAnnotations: Record<string, string>;
  captureConditions?: {
    display?: string;
    camera?: string;
    lighting?: string;
    notes?: string;
  };
  auditTrail?: {
    auditSessionID?: string;
    firstReviewID?: string;
    secondReviewID?: string;
    menuInstructionVerified?: boolean;
    retiredReason?: string;
  };
  catalogManagerDisposition?: "approved" | "approvedWithNotes" | "rejected" | "repairRequested";
  navigationInstructions?: NavigationInstruction[];
  catalogVersion: GameCatalogVersion;
  isTestFixture: boolean;
  deprecated?: boolean;
  deprecatedContext?: string | null;
}

export interface CatalogFacialMeasurement {
  value: number;
  confidence: number;
  supportingFrameCount: number;
  variance: number;
  depthSupported: boolean;
  occlusionStatus: "none" | "partial" | "significant" | "unknown";
  measurementSource: string;
  availabilityState: "available" | "pending" | "unavailable";
}

export interface NavigationInstruction {
  sequenceNumber: number;
  instruction: string;
  evidenceAssetID: string;
}

export interface GameCatalogVersion {
  identifier: string;
  gameVersion: string;
  platform: string;
  verifiedAt: ISODateString | null;
}

export interface GameAppearanceMatch {
  id: string;
  rank: number;
  catalogItem: GameCatalogItem;
  score: number;
  scoreLabel: string;
  confidence: MeasurementConfidence;
  explanation: MatchExplanation;
  catalogVersion: GameCatalogVersion;
  modelVersion: string;
  tieGroup?: number;
  featureContributions: MatchFeatureContribution[];
  appearanceRecommendations?: VerifiedAppearanceRecommendation[];
}

export type AppearanceRecommendationCategory =
  | "hairstyle"
  | "hairColor"
  | "facialHair"
  | "facialHairColor"
  | "eyebrows"
  | "skinPresentation"
  | "otherVisualAttribute";

export type AppearanceRecommendationStatus = "selected" | "unavailable" | "ambiguous";

export interface VerifiedAppearanceRecommendation {
  category: AppearanceRecommendationCategory;
  label: string;
  status: AppearanceRecommendationStatus;
  nativeGameValue: string | null;
  sourceCatalogItemID: string;
  sourceAnnotationKey: string | null;
  userConfirmedValues: Partial<Record<UserConfirmedAttributeCategory, UserConfirmedAttributeValue>>;
  confidence: MeasurementConfidence;
  explanation: string;
  verificationDate: ISODateString | null;
  catalogVersion: GameCatalogVersion;
  gameVersion: string;
  platform: string;
  mode: string;
  creationPath: string;
}

export interface MatchExplanation {
  summary: string;
  strongestSimilarities: string[];
  largestDifferences: string[];
  uncertaintyNotes: string[];
}

export interface MatchFeatureContribution {
  featureID: StandardFacialMeasurementID | UserConfirmedAttributeCategory;
  group: "geometry" | "appearance" | "preference";
  profileValue: number | string | boolean | null;
  catalogValue: number | string | boolean | null;
  profileAvailability: MeasurementAvailabilityState | "notApplicable";
  profileEvidence: MatchFeatureEvidence;
  catalogEvidence: MatchFeatureEvidence;
  normalizedDistance: number;
  effectiveWeight: number;
  reliability: number;
  included: boolean;
  reason: string;
}

export interface MatchFeatureEvidence {
  value: number | string | boolean | null;
  confidence: MeasurementConfidence;
  supportingFrameCount: number;
  variance: number | null;
  depthSupported: boolean;
  availabilityState: MeasurementAvailabilityState | "notApplicable";
  occlusionState: "none" | "partial" | "significant" | "unknown" | "notApplicable";
}

export interface BuildInstruction {
  id: string;
  sequenceNumber: number;
  title: string;
  detail: string;
  gameTitle: string;
  menuCategory: string;
  verifiedGameLabel: string;
  instructionKind:
    | "headOption"
    | "hairstyle"
    | "hairColor"
    | "facialHair"
    | "facialHairColor"
    | "eyebrows"
    | "skinPresentation"
    | "otherVerifiedControl"
    | "height"
    | "weight"
    | "bodySelection";
  nativeHeadOption: string;
  navigationPath: string[];
  platform: string;
  gameVersion: string;
  patchVersion?: string | null;
  mode: string;
  creationPath: string;
  notes: string[];
  limitations: string[];
  verificationDate: ISODateString | null;
  relatedCatalogItemID?: string;
  relatedAppearanceCategory?: AppearanceRecommendationCategory;
  sourceAnnotationKey?: string | null;
}

export interface RefinementResult {
  status: "unavailable" | "keepCurrent" | "tryAlternative" | "invalidScreenshot";
  message: string;
  suggestedMatches: GameAppearanceMatch[];
  engineVersion?: string;
  catalogVersion?: GameCatalogVersion;
  actions?: RefinementAction[];
  feedbackRecord?: RefinementFeedbackRecord;
  unavailableReasons?: string[];
}

export type RefinementActionType =
  | "keepCurrentRecommendation"
  | "tryRankTwo"
  | "tryRankThree"
  | "changeVerifiedHairstyle"
  | "changeVerifiedFacialHair"
  | "changeVerifiedControl";

export interface RefinementAction {
  id: string;
  type: RefinementActionType;
  label: string;
  description: string;
  targetMatch?: GameAppearanceMatch;
  relatedCatalogItemID?: string;
  requiresVerifiedCatalog: true;
  confidence: MeasurementConfidence;
  reasons: string[];
}

export interface RefinementFeedbackRecord {
  id: string;
  createdAt: ISODateString;
  consentVersion: string;
  rating: "currentBetter" | "rankTwoBetter" | "rankThreeBetter" | "unsure" | "notProvided";
  notes: string | null;
  screenshotSessionID: string;
  profileID: string | null;
  catalogVersionID: string | null;
}

export interface SavedBuild {
  id: string;
  createdAt: ISODateString;
  profileVersion: string;
  match?: GameAppearanceMatch;
  buildInstructions: BuildInstruction[];
  catalogVersion?: GameCatalogVersion;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  purchaseType: PurchaseType;
  entitlementIDs: EntitlementAccess[];
  active: boolean;
  providerProductID?: string;
}

export interface Price {
  id: string;
  productID: string;
  currency: CurrencyCode;
  amountMinor: number;
  displayAmount: string;
  purchaseType: PurchaseType;
  active: boolean;
  providerPriceID?: string;
}

export interface Entitlement {
  id: EntitlementAccess;
  label: string;
  description: string;
  includedByDefault: boolean;
}

export interface CustomerAccess {
  customerID?: string;
  status: CustomerAccessStatus;
  entitlementIDs: EntitlementAccess[];
  receiptReferences: ReceiptReference[];
}

export interface CheckoutRequest {
  productID: string;
  priceID: string;
  successUrl: string;
  cancelUrl: string;
  customerReference?: string;
}

export interface CheckoutResult {
  status: PaymentStatus;
  checkoutUrl?: string;
  providerReference?: string;
  message: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  receivedAt: ISODateString;
  rawPayloadReference?: string;
}

export interface ReceiptReference {
  id: string;
  provider: string;
  productID: string;
  priceID: string;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatus;
  purchasedAt?: ISODateString;
}
