import type { CameraAccessError } from "@/lib/capture/browser-camera-service";
import type { CaptureGuidanceIssueCode } from "@/types/domain";

export type ReliabilityErrorID =
  | "permissionDenied"
  | "cameraUnavailable"
  | "unsupportedDevice"
  | "faceNotFound"
  | "multipleFaces"
  | "blur"
  | "poorLighting"
  | "invalidPose"
  | "missingView"
  | "uploadFailure"
  | "processingFailure"
  | "emptyProductionCatalog"
  | "catalogMismatch"
  | "networkFailure"
  | "invalidScreenshot"
  | "saveFailure"
  | "deletionFailure"
  | "accountOrSyncFailure";

export type RecoverySeverity = "info" | "warning" | "danger";
export type RecoveryResultsViewKind = "processing" | "catalogUnavailable" | "insufficientProfileData" | "matchingError" | "topThree";

export interface RecoveryAction {
  label: string;
  description: string;
}

export interface ReliabilityRecoveryPlan {
  id: ReliabilityErrorID;
  title: string;
  userMessage: string;
  severity: RecoverySeverity;
  primaryAction: RecoveryAction;
  secondaryActions: RecoveryAction[];
}

export const requiredReliabilityErrorIDs: readonly ReliabilityErrorID[] = [
  "permissionDenied",
  "cameraUnavailable",
  "unsupportedDevice",
  "faceNotFound",
  "multipleFaces",
  "blur",
  "poorLighting",
  "invalidPose",
  "missingView",
  "uploadFailure",
  "processingFailure",
  "emptyProductionCatalog",
  "catalogMismatch",
  "networkFailure",
  "invalidScreenshot",
  "saveFailure",
  "deletionFailure",
  "accountOrSyncFailure"
];

const recoveryPlans: Record<ReliabilityErrorID, ReliabilityRecoveryPlan> = {
  permissionDenied: {
    id: "permissionDenied",
    title: "Camera permission denied",
    userMessage: "The browser blocked camera access, but the capture can continue with upload fallback.",
    severity: "warning",
    primaryAction: {
      label: "Use upload fallback",
      description: "Upload a JPEG, PNG, or WebP image for each required angle."
    },
    secondaryActions: [
      {
        label: "Reset camera permission",
        description: "Use the browser site settings, allow camera access for this site, reload, and start the camera again."
      }
    ]
  },
  cameraUnavailable: {
    id: "cameraUnavailable",
    title: "Camera unavailable",
    userMessage: "No usable camera stream is available from this browser or device.",
    severity: "warning",
    primaryAction: {
      label: "Continue with upload fallback",
      description: "Use camera-roll images or screenshots for every required capture angle."
    },
    secondaryActions: [
      {
        label: "Check another camera",
        description: "Close other camera apps, reconnect the device camera, switch cameras if available, then retry."
      }
    ]
  },
  unsupportedDevice: {
    id: "unsupportedDevice",
    title: "Unsupported browser or device",
    userMessage: "This browser cannot provide the camera or capture capability requested by the web MVP.",
    severity: "warning",
    primaryAction: {
      label: "Use a supported browser or upload files",
      description: "Try current iPhone Safari, Android Chrome, or desktop Chrome/Safari, or complete the flow with image uploads."
    },
    secondaryActions: [
      {
        label: "Check secure context",
        description: "Camera access requires HTTPS or localhost; insecure pages should use upload fallback."
      }
    ]
  },
  faceNotFound: {
    id: "faceNotFound",
    title: "Face not found",
    userMessage: "Local guidance could not find a face in the current image.",
    severity: "warning",
    primaryAction: {
      label: "Center one visible face",
      description: "Move into even front lighting, keep the full face in frame, and retake only this angle."
    },
    secondaryActions: [
      {
        label: "Use manual fallback",
        description: "Upload a clearer image and confirm manually if local landmark guidance remains unavailable."
      }
    ]
  },
  multipleFaces: {
    id: "multipleFaces",
    title: "Multiple faces detected",
    userMessage: "The capture needs one person only so the profile is not mixed across people.",
    severity: "danger",
    primaryAction: {
      label: "Retake with one person",
      description: "Ask other people to leave the frame, then retake this angle."
    },
    secondaryActions: [
      {
        label: "Crop before upload",
        description: "If using upload fallback, choose an image where only the subject's face is visible."
      }
    ]
  },
  blur: {
    id: "blur",
    title: "Image may be blurry",
    userMessage: "The browser estimated low sharpness or motion blur.",
    severity: "warning",
    primaryAction: {
      label: "Retake this angle",
      description: "Hold the phone steady, pause before capture, clean the lens, and avoid motion."
    },
    secondaryActions: [
      {
        label: "Replace upload",
        description: "Use a sharper camera-roll image for the same required angle."
      }
    ]
  },
  poorLighting: {
    id: "poorLighting",
    title: "Lighting needs attention",
    userMessage: "The image appears too dark, too bright, shadowed, or unevenly lit.",
    severity: "warning",
    primaryAction: {
      label: "Improve front lighting",
      description: "Face a steady light source, avoid strong backlighting, and retake only the affected angle."
    },
    secondaryActions: [
      {
        label: "Move location",
        description: "Try a brighter room or turn off harsh side lighting before uploading or capturing again."
      }
    ]
  },
  invalidPose: {
    id: "invalidPose",
    title: "Pose does not match the requested view",
    userMessage: "The head direction does not match the current required angle.",
    severity: "warning",
    primaryAction: {
      label: "Retake the requested pose",
      description: "Follow the angle label exactly: front, left 45, right 45, left profile, or right profile."
    },
    secondaryActions: [
      {
        label: "Continue with limitation when safe",
        description: "If physical comfort prevents an exact pose, document it with the manual confirmation and expect lower confidence."
      }
    ]
  },
  missingView: {
    id: "missingView",
    title: "Required view missing",
    userMessage: "One or more of the five required RGB angles has no accepted image.",
    severity: "warning",
    primaryAction: {
      label: "Complete the missing angle",
      description: "Select the missing angle and capture or upload that one view; completed angles do not need a full restart."
    },
    secondaryActions: [
      {
        label: "Review the progress count",
        description: "Use the angle cards to find which required view is still marked pending or error."
      }
    ]
  },
  uploadFailure: {
    id: "uploadFailure",
    title: "Upload could not be used",
    userMessage: "The selected file could not be read or does not meet the web MVP file rules.",
    severity: "warning",
    primaryAction: {
      label: "Choose a different image",
      description: "Use a readable JPEG, PNG, or WebP file within the size and dimension limits."
    },
    secondaryActions: [
      {
        label: "Convert unsupported formats",
        description: "If the file is HEIC or HEIF, export it as JPEG or PNG before uploading."
      }
    ]
  },
  processingFailure: {
    id: "processingFailure",
    title: "Processing could not finish",
    userMessage: "Local analysis or recommendation preparation could not complete.",
    severity: "danger",
    primaryAction: {
      label: "Retry the current step",
      description: "Retry after reviewing the blocking messages; if it repeats, start over after deleting the active session."
    },
    secondaryActions: [
      {
        label: "Keep data local",
        description: "No face images are uploaded while recovering from local processing failures."
      }
    ]
  },
  emptyProductionCatalog: {
    id: "emptyProductionCatalog",
    title: "Verified catalog not loaded",
    userMessage: "Capture can complete, but production recommendations are blocked because no verified College Football 27 records are loaded.",
    severity: "warning",
    primaryAction: {
      label: "Check catalog status later",
      description: "Keep or delete the local profile, then retry after an approved catalog release is loaded."
    },
    secondaryActions: [
      {
        label: "Delete local profile",
        description: "Use the results or privacy center controls if you do not want to keep the derived profile locally."
      }
    ]
  },
  catalogMismatch: {
    id: "catalogMismatch",
    title: "Catalog mismatch",
    userMessage: "The loaded catalog does not match the selected platform, game version, mode, or supported release path.",
    severity: "danger",
    primaryAction: {
      label: "Check catalog status",
      description: "Return to catalog status and use only an approved catalog release compatible with the requested game context."
    },
    secondaryActions: [
      {
        label: "Do not use fixture data",
        description: "Fixture, research, and unverified records cannot unlock production recommendations."
      }
    ]
  },
  networkFailure: {
    id: "networkFailure",
    title: "Network unavailable",
    userMessage: "The local MVP can keep working without upload services, but browser camera permissions and reload behavior can vary offline.",
    severity: "info",
    primaryAction: {
      label: "Continue local work",
      description: "Finish capture or review with local state; no face images are transmitted."
    },
    secondaryActions: [
      {
        label: "Reconnect before permission retry",
        description: "If camera permission or asset loading fails, reconnect and reload before trying the camera again."
      }
    ]
  },
  invalidScreenshot: {
    id: "invalidScreenshot",
    title: "Screenshot needs recovery",
    userMessage: "The screenshot is missing, unreadable, obstructed, low resolution, or otherwise unsuitable for refinement intake.",
    severity: "warning",
    primaryAction: {
      label: "Replace the screenshot",
      description: "Upload a clear front screenshot with no helmet, mask, sunglasses, overlay, severe blur, or extreme lighting."
    },
    secondaryActions: [
      {
        label: "Delete screenshot session",
        description: "Clear screenshot session data if you do not want the temporary object URLs to remain active."
      }
    ]
  },
  saveFailure: {
    id: "saveFailure",
    title: "Save failed",
    userMessage: "The browser could not save the non-image profile or build data.",
    severity: "warning",
    primaryAction: {
      label: "Retry after checking consent and storage",
      description: "Enable the separate save consent, free browser storage if needed, and retry the save."
    },
    secondaryActions: [
      {
        label: "Continue session-only",
        description: "You can continue without saving; raw images are not added to saved profiles."
      }
    ]
  },
  deletionFailure: {
    id: "deletionFailure",
    title: "Deletion needs confirmation",
    userMessage: "If local deletion fails or cannot be verified, the app should tell you which local category still appears stored.",
    severity: "danger",
    primaryAction: {
      label: "Retry deletion",
      description: "Retry the specific delete action, then use Delete everything local from the privacy center."
    },
    secondaryActions: [
      {
        label: "Use browser storage controls",
        description: "If the app cannot verify deletion, clear this site's browser data from Safari or Chrome settings."
      }
    ]
  },
  accountOrSyncFailure: {
    id: "accountOrSyncFailure",
    title: "Account or sync unavailable",
    userMessage: "This MVP has no account, login, cloud backup, or sync service connected.",
    severity: "info",
    primaryAction: {
      label: "Use local controls",
      description: "Continue with local-only capture, save, export, and deletion controls."
    },
    secondaryActions: [
      {
        label: "Do not enter credentials",
        description: "GameFace Match should not ask for payment, account, or sync credentials in this local MVP."
      }
    ]
  }
};

export function getRecoveryPlan(id: ReliabilityErrorID): ReliabilityRecoveryPlan {
  return recoveryPlans[id];
}

export function getAllRecoveryPlans(): ReliabilityRecoveryPlan[] {
  return requiredReliabilityErrorIDs.map((id) => recoveryPlans[id]);
}

export function assertRecoveryCatalogComplete(ids: readonly ReliabilityErrorID[] = requiredReliabilityErrorIDs) {
  return ids.map((id) => recoveryPlans[id]).every((plan) => Boolean(plan?.primaryAction.label && plan.primaryAction.description));
}

export function recoveryPlanForCameraError(code: CameraAccessError["code"]): ReliabilityRecoveryPlan {
  if (code === "permissionDenied" || code === "permissionBlocked") return getRecoveryPlan("permissionDenied");
  if (code === "cameraUnavailable" || code === "noMatchingCameraDevice") return getRecoveryPlan("cameraUnavailable");
  if (code === "cameraApiUnsupported") return getRecoveryPlan("unsupportedDevice");
  return getRecoveryPlan("processingFailure");
}

export function recoveryPlanForGuidanceIssue(code: CaptureGuidanceIssueCode): ReliabilityRecoveryPlan | null {
  if (code === "faceNotFound") return getRecoveryPlan("faceNotFound");
  if (code === "multipleFaces") return getRecoveryPlan("multipleFaces");
  if (code === "severeBlur") return getRecoveryPlan("blur");
  if (code === "poorLighting" || code === "underexposed" || code === "overexposed" || code === "lightingImbalance") return getRecoveryPlan("poorLighting");
  if (code === "incorrectHeadDirection") return getRecoveryPlan("invalidPose");
  if (code === "missingRequiredRegion" || code === "occlusionLikely") return getRecoveryPlan("invalidPose");
  if (code === "landmarksUnavailable") return getRecoveryPlan("processingFailure");
  return null;
}

export function recoveryPlanForImageMessage(message: string): ReliabilityRecoveryPlan {
  const normalized = message.toLowerCase();
  if (normalized.includes("missing")) return getRecoveryPlan("missingView");
  if (normalized.includes("duplicate")) return getRecoveryPlan("missingView");
  if (normalized.includes("blur") || normalized.includes("sharp")) return getRecoveryPlan("blur");
  if (normalized.includes("dark") || normalized.includes("shadow") || normalized.includes("overexposed") || normalized.includes("lighting")) {
    return getRecoveryPlan("poorLighting");
  }
  if (normalized.includes("angle") || normalized.includes("pose")) return getRecoveryPlan("invalidPose");
  if (normalized.includes("screenshot")) return getRecoveryPlan("invalidScreenshot");
  if (normalized.includes("decode") || normalized.includes("read") || normalized.includes("unsupported") || normalized.includes("file") || normalized.includes("heic")) {
    return getRecoveryPlan("uploadFailure");
  }
  return getRecoveryPlan("processingFailure");
}

export function recoveryPlanForResultsState(kind: RecoveryResultsViewKind, message: string): ReliabilityRecoveryPlan | null {
  if (kind === "catalogUnavailable") return getRecoveryPlan("emptyProductionCatalog");
  if (kind === "insufficientProfileData") return getRecoveryPlan("missingView");
  if (kind === "matchingError") {
    const normalized = message.toLowerCase();
    if (normalized.includes("catalog") || normalized.includes("version") || normalized.includes("platform")) return getRecoveryPlan("catalogMismatch");
    return getRecoveryPlan("processingFailure");
  }
  if (kind === "processing") return getRecoveryPlan("processingFailure");
  return null;
}
