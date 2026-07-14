export type LightingReadinessCheckID =
  | "frontLighting"
  | "avoidBacklight"
  | "avoidStrongShadows"
  | "faceClearlyVisible"
  | "cameraLensClean";

export interface LightingReadinessCheck {
  id: LightingReadinessCheckID;
  label: string;
  description: string;
  required: boolean;
}

export type LightingReadinessState = Record<LightingReadinessCheckID, boolean>;

export interface LightingReadinessReport {
  status: "blocked" | "ready";
  completedCount: number;
  requiredCount: number;
  missingRequiredIDs: LightingReadinessCheckID[];
  blockingMessages: string[];
  advisoryMessages: string[];
  summary: string;
}

export const LIGHTING_READINESS_CHECKS: LightingReadinessCheck[] = [
  {
    id: "frontLighting",
    label: "Soft front lighting",
    description: "Your face is lit from the front with steady, even light.",
    required: true
  },
  {
    id: "avoidBacklight",
    label: "No strong backlight",
    description: "Bright windows, lamps, or screens are not behind your head.",
    required: true
  },
  {
    id: "avoidStrongShadows",
    label: "No strong shadows",
    description: "The forehead, eyes, nose, mouth, chin, and jaw are not hidden by hard shadows.",
    required: true
  },
  {
    id: "faceClearlyVisible",
    label: "Face clearly visible",
    description: "One face is centered and visible before starting the five required RGB views.",
    required: true
  },
  {
    id: "cameraLensClean",
    label: "Camera lens clean",
    description: "The phone or webcam lens has been wiped and the preview is not hazy.",
    required: true
  }
];

export function createInitialLightingReadinessState(): LightingReadinessState {
  return Object.fromEntries(LIGHTING_READINESS_CHECKS.map((check) => [check.id, false])) as LightingReadinessState;
}

export function updateLightingReadiness(
  state: LightingReadinessState,
  id: LightingReadinessCheckID,
  checked: boolean
): LightingReadinessState {
  return {
    ...state,
    [id]: checked
  };
}

export function evaluateLightingReadiness(state: LightingReadinessState): LightingReadinessReport {
  const requiredChecks = LIGHTING_READINESS_CHECKS.filter((check) => check.required);
  const missingRequiredIDs = requiredChecks.filter((check) => !state[check.id]).map((check) => check.id);
  const completedCount = requiredChecks.length - missingRequiredIDs.length;
  const blockingMessages = missingRequiredIDs.map((id) => {
    const check = LIGHTING_READINESS_CHECKS.find((item) => item.id === id);
    return `${check?.label ?? id} must be confirmed before capture.`;
  });
  const advisoryMessages = [
    "Browser capture still runs measured brightness, shadow, highlight, blur, and lighting-imbalance checks during live preview and upload review.",
    "If the camera API is unavailable, use the same lighting setup for camera-roll uploads."
  ];
  return {
    status: missingRequiredIDs.length === 0 ? "ready" : "blocked",
    completedCount,
    requiredCount: requiredChecks.length,
    missingRequiredIDs,
    blockingMessages,
    advisoryMessages,
    summary:
      missingRequiredIDs.length === 0
        ? "Lighting readiness confirmed for guided RGB capture."
        : `${completedCount} of ${requiredChecks.length} lighting checks confirmed.`
  };
}
