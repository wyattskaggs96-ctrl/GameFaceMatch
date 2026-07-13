import type { ISODateString, RefinementResult, StandardFaceProfile } from "@/types/domain";

export type ScreenshotViewID = "front" | "left45" | "right45";
export type ScreenshotValidationStatus = "valid" | "invalid";
export type ScreenshotChecklistItemID =
  | "frontFacingCharacter"
  | "neutralExpression"
  | "noHelmet"
  | "noMask"
  | "noSunglasses"
  | "faceVisible"
  | "adequateResolution"
  | "noObstructingOverlay"
  | "noSevereBlur"
  | "noExtremeLighting";

export type ScreenshotChecklistState = Record<ScreenshotChecklistItemID, boolean>;

export interface ScreenshotReference {
  viewID: ScreenshotViewID;
  objectUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  createdAt: ISODateString;
}

export interface ScreenshotSlotState {
  viewID: ScreenshotViewID;
  label: string;
  instruction: string;
  required: boolean;
  screenshot?: ScreenshotReference;
  validationStatus: ScreenshotValidationStatus;
  validationErrors: string[];
}

export interface ScreenshotRefinementSession {
  id: string;
  createdAt: ISODateString;
  status: "active" | "deleted";
  slots: ScreenshotSlotState[];
  checklist: ScreenshotChecklistState;
}

export interface ScreenshotValidationInput {
  viewID: ScreenshotViewID;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  objectUrl?: string;
  createdAt?: ISODateString;
}

export interface ScreenshotMutation {
  session: ScreenshotRefinementSession;
  objectUrlsToRevoke: string[];
}

export interface ScreenshotChecklistItem {
  id: ScreenshotChecklistItemID;
  label: string;
  description: string;
}

export interface ScreenshotRefinementReadiness {
  canSubmit: boolean;
  blockingMessages: string[];
  advisoryMessages: string[];
}

export interface ScreenshotRefinementProcessor {
  refine(input: { originalProfile: StandardFaceProfile; screenshots: ScreenshotReference[] }): Promise<RefinementResult>;
}

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const maxFileSizeBytes = 12 * 1024 * 1024;
const minDimension = 720;

export const SCREENSHOT_REFINEMENT_VIEWS: ReadonlyArray<Pick<ScreenshotSlotState, "viewID" | "label" | "instruction" | "required">> = [
  {
    viewID: "front",
    label: "Front screenshot",
    instruction: "Upload a clear front-facing created-player screenshot with the face visible and the UI not covering the head.",
    required: true
  },
  {
    viewID: "left45",
    label: "Left 45 screenshot",
    instruction: "Optional: add a left 45-degree created-player screenshot from the same build to support future refinement.",
    required: false
  },
  {
    viewID: "right45",
    label: "Right 45 screenshot",
    instruction: "Optional: add a right 45-degree created-player screenshot from the same build to support future refinement.",
    required: false
  }
];

export const SCREENSHOT_REFINEMENT_CHECKLIST: ReadonlyArray<ScreenshotChecklistItem> = [
  {
    id: "frontFacingCharacter",
    label: "The required screenshot shows the character facing the camera.",
    description: "The browser cannot yet verify game-character pose, so this is user-confirmed."
  },
  {
    id: "neutralExpression",
    label: "The expression is neutral where possible.",
    description: "Avoid strong smiles, open mouth, or exaggerated expression when the game allows it."
  },
  {
    id: "noHelmet",
    label: "No helmet is covering the head.",
    description: "Helmets hide the head shape needed for future comparison."
  },
  {
    id: "noMask",
    label: "No face mask is covering the face.",
    description: "Masks block the facial regions that would be needed for future refinement."
  },
  {
    id: "noSunglasses",
    label: "No sunglasses are covering the eyes.",
    description: "Sunglasses hide eye and brow presentation."
  },
  {
    id: "faceVisible",
    label: "The face is clearly visible.",
    description: "The face should be unobstructed and not cropped out."
  },
  {
    id: "adequateResolution",
    label: "The screenshot has adequate resolution.",
    description: "The app also blocks files below the minimum readable dimensions."
  },
  {
    id: "noObstructingOverlay",
    label: "No menu overlay covers the face.",
    description: "Menu text, cursors, and selection overlays should not cover the head or face."
  },
  {
    id: "noSevereBlur",
    label: "There is no severe blur.",
    description: "Avoid motion blur, focus blur, and heavily compressed images."
  },
  {
    id: "noExtremeLighting",
    label: "There is no extreme lighting.",
    description: "Avoid very dark, overexposed, or cinematic lighting that hides facial shape."
  }
];

export function createInitialScreenshotRefinementSession(now = new Date()): ScreenshotRefinementSession {
  const timestamp = now.toISOString();
  return {
    id: `screenshot-refinement-${timestamp}`,
    createdAt: timestamp,
    status: "active",
    slots: SCREENSHOT_REFINEMENT_VIEWS.map((view) => ({
      ...view,
      validationStatus: "invalid",
      validationErrors: view.required ? ["Required front screenshot missing."] : []
    })),
    checklist: createInitialScreenshotChecklist()
  };
}

export function createInitialScreenshotChecklist(): ScreenshotChecklistState {
  return Object.fromEntries(SCREENSHOT_REFINEMENT_CHECKLIST.map((item) => [item.id, false])) as ScreenshotChecklistState;
}

export function validateScreenshotMetadata(input: ScreenshotValidationInput) {
  const errors: string[] = [];
  if (!allowedTypes.has(input.fileType)) errors.push("Use a JPEG, PNG, or WebP screenshot.");
  if (!hasAllowedScreenshotExtension(input.fileName)) errors.push("Use a screenshot file ending in .jpg, .jpeg, .png, or .webp.");
  if (input.fileSizeBytes <= 0) errors.push("The screenshot file is empty or unreadable.");
  if (input.fileSizeBytes > maxFileSizeBytes) errors.push("Use a screenshot smaller than 12 MB.");
  if (!Number.isFinite(input.width) || !Number.isFinite(input.height)) errors.push("The screenshot dimensions could not be read.");
  if (input.width < minDimension || input.height < minDimension) errors.push("Use a screenshot at least 720 pixels wide and tall.");
  return {
    errors,
    status: errors.length === 0 ? ("valid" as const) : ("invalid" as const)
  };
}

export function hasAllowedScreenshotExtension(fileName: string) {
  const normalizedName = fileName.trim().toLowerCase();
  return allowedExtensions.some((extension) => normalizedName.endsWith(extension));
}

export function setScreenshot(session: ScreenshotRefinementSession, input: ScreenshotValidationInput): ScreenshotMutation {
  const validation = validateScreenshotMetadata(input);
  const objectUrlsToRevoke = session.slots.flatMap((slot) => (slot.viewID === input.viewID && slot.screenshot?.objectUrl ? [slot.screenshot.objectUrl] : []));
  const screenshot: ScreenshotReference | undefined =
    validation.errors.length === 0
      ? {
          viewID: input.viewID,
          objectUrl: input.objectUrl ?? "",
          fileName: input.fileName,
          fileType: input.fileType,
          fileSizeBytes: input.fileSizeBytes,
          width: input.width,
          height: input.height,
          createdAt: input.createdAt ?? new Date().toISOString()
        }
      : undefined;

  return {
    objectUrlsToRevoke,
    session: {
      ...session,
      slots: session.slots.map((slot) =>
        slot.viewID === input.viewID
          ? {
              ...slot,
              screenshot,
              validationStatus: validation.status,
              validationErrors: validation.errors
            }
          : slot
      )
    }
  };
}

export function deleteScreenshotRefinementSession(session: ScreenshotRefinementSession): ScreenshotMutation {
  return {
    objectUrlsToRevoke: session.slots.flatMap((slot) => (slot.screenshot?.objectUrl ? [slot.screenshot.objectUrl] : [])),
    session: {
      ...createInitialScreenshotRefinementSession(),
      status: "deleted"
    }
  };
}

export function setScreenshotChecklistItem(
  session: ScreenshotRefinementSession,
  itemID: ScreenshotChecklistItemID,
  checked: boolean
): ScreenshotRefinementSession {
  return {
    ...session,
    checklist: {
      ...session.checklist,
      [itemID]: checked
    }
  };
}

export function getScreenshotRefinementReadiness(session: ScreenshotRefinementSession): ScreenshotRefinementReadiness {
  const blockingMessages: string[] = [];
  const advisoryMessages: string[] = [];
  const requiredSlots = session.slots.filter((slot) => slot.required);
  const optionalSlots = session.slots.filter((slot) => !slot.required);

  requiredSlots.forEach((slot) => {
    if (!slot.screenshot) {
      blockingMessages.push(`${slot.label} is required.`);
    } else if (slot.validationStatus === "invalid" && slot.validationErrors.length > 0) {
      blockingMessages.push(...slot.validationErrors);
    }
  });

  const missingChecklistItems = SCREENSHOT_REFINEMENT_CHECKLIST.filter((item) => !session.checklist[item.id]);
  blockingMessages.push(...missingChecklistItems.map((item) => `Confirm: ${item.label}`));

  const missingOptionalViews = optionalSlots.filter((slot) => !slot.screenshot).map((slot) => slot.label);
  if (missingOptionalViews.length > 0) {
    advisoryMessages.push(`Optional three-quarter screenshots not provided: ${missingOptionalViews.join(", ")}.`);
  }
  optionalSlots.forEach((slot) => {
    if (slot.screenshot && slot.validationStatus === "invalid") {
      advisoryMessages.push(...slot.validationErrors.map((error) => `${slot.label}: ${error}`));
    }
  });

  return {
    canSubmit: blockingMessages.length === 0,
    blockingMessages: [...new Set(blockingMessages)],
    advisoryMessages: [...new Set(advisoryMessages)]
  };
}

export function canSubmitScreenshotRefinement(session: ScreenshotRefinementSession) {
  return getScreenshotRefinementReadiness(session).canSubmit;
}

export function createUnavailableScreenshotRefinementProcessor(): ScreenshotRefinementProcessor {
  return {
    async refine() {
      return {
        status: "unavailable",
        message: "Screenshot refinement is unavailable until verified catalog data and real cross-image comparison logic exist.",
        suggestedMatches: []
      };
    }
  };
}
