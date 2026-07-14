export const CONSENT_VERSION = "web-mvp-consent-v1";

export type ConsentID =
  | "cameraUse"
  | "currentFaceAnalysis"
  | "temporaryProcessing"
  | "ageEligibility"
  | "subjectPermission"
  | "saveDerivedProfile"
  | "cloudBackup"
  | "saveRawImages"
  | "saveCompletedBuild"
  | "saveScreenshots"
  | "futureProductImprovement"
  | "futureModelTraining"
  | "marketingOrSharing";

export interface ConsentDefinition {
  id: ConsentID;
  label: string;
  description: string;
  requiredForCapture: boolean;
  available: boolean;
}

export interface ConsentRecord {
  id: ConsentID;
  granted: boolean;
  version: string;
  updatedAt: string | null;
}

export type ConsentState = Record<ConsentID, ConsentRecord>;

export const CONSENT_DEFINITIONS: ConsentDefinition[] = [
  {
    id: "cameraUse",
    label: "Camera use",
    description: "Use the browser camera only when you start preview or capture.",
    requiredForCapture: true,
    available: true
  },
  {
    id: "currentFaceAnalysis",
    label: "Face analysis for this recommendation",
    description: "Use the current RGB captures and manual confirmations to create a local profile for this recommendation.",
    requiredForCapture: true,
    available: true
  },
  {
    id: "temporaryProcessing",
    label: "Temporary local processing",
    description: "Keep images in memory or temporary object URLs during the active session, then delete them when the session ends.",
    requiredForCapture: true,
    available: true
  },
  {
    id: "ageEligibility",
    label: "Age eligibility",
    description: "Confirm you meet the age requirements for using this prototype, or have the required parent or guardian involvement.",
    requiredForCapture: true,
    available: true
  },
  {
    id: "subjectPermission",
    label: "Self or permission confirmation",
    description: "Confirm you are scanning yourself or have permission from the person being captured.",
    requiredForCapture: true,
    available: true
  },
  {
    id: "saveDerivedProfile",
    label: "Save derived face profile",
    description: "Save non-image profile data locally so you can review it later in this browser session.",
    requiredForCapture: false,
    available: true
  },
  {
    id: "cloudBackup",
    label: "Cloud backup",
    description: "Unavailable in this MVP. No account, cloud sync, or backup service is connected.",
    requiredForCapture: false,
    available: false
  },
  {
    id: "saveRawImages",
    label: "Save raw images",
    description: "Unavailable in this MVP. Raw face images are temporary by default and are not saved to browser storage.",
    requiredForCapture: false,
    available: false
  },
  {
    id: "saveCompletedBuild",
    label: "Save completed build",
    description: "Save non-image match and build-guide information locally. Raw face images are not included.",
    requiredForCapture: false,
    available: true
  },
  {
    id: "saveScreenshots",
    label: "Save screenshots",
    description: "Screenshot saving is not implemented. Current screenshots remain temporary and can be deleted from the privacy center.",
    requiredForCapture: false,
    available: false
  },
  {
    id: "futureProductImprovement",
    label: "Future product-improvement participation",
    description: "Unavailable in this MVP. No product-improvement data program is implemented.",
    requiredForCapture: false,
    available: false
  },
  {
    id: "futureModelTraining",
    label: "Future model-training participation",
    description: "Unavailable in this MVP. Face data is not used for model training.",
    requiredForCapture: false,
    available: false
  },
  {
    id: "marketingOrSharing",
    label: "Marketing or sharing",
    description: "Unavailable in this MVP. The app does not share your face, profile, screenshots, or build publicly.",
    requiredForCapture: false,
    available: false
  }
];

export function createInitialConsentState(now: Date | null = null): ConsentState {
  return Object.fromEntries(
    CONSENT_DEFINITIONS.map((definition) => [
      definition.id,
      {
        id: definition.id,
        granted: false,
        version: CONSENT_VERSION,
        updatedAt: now?.toISOString() ?? null
      }
    ])
  ) as ConsentState;
}

export function updateConsent(state: ConsentState, id: ConsentID, granted: boolean, now = new Date()): ConsentState {
  const definition = CONSENT_DEFINITIONS.find((item) => item.id === id);
  if (!definition?.available && granted) {
    return state;
  }
  return {
    ...state,
    [id]: {
      id,
      granted,
      version: CONSENT_VERSION,
      updatedAt: now.toISOString()
    }
  };
}

export function hasRequiredCaptureConsent(state: ConsentState) {
  return CONSENT_DEFINITIONS.filter((definition) => definition.requiredForCapture).every((definition) => state[definition.id]?.granted);
}

export function isConsentGranted(state: ConsentState, id: ConsentID) {
  return Boolean(state[id]?.granted);
}
