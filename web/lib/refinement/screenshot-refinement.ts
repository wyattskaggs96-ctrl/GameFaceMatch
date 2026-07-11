import type { ISODateString, RefinementResult, StandardFaceProfile } from "@/types/domain";

export type ScreenshotViewID = "front" | "left45" | "right45";
export type ScreenshotValidationStatus = "valid" | "invalid";

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
  screenshot?: ScreenshotReference;
  validationStatus: ScreenshotValidationStatus;
  validationErrors: string[];
}

export interface ScreenshotRefinementSession {
  id: string;
  createdAt: ISODateString;
  status: "active" | "deleted";
  slots: ScreenshotSlotState[];
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

export interface ScreenshotRefinementProcessor {
  refine(input: { originalProfile: StandardFaceProfile; screenshots: ScreenshotReference[] }): Promise<RefinementResult>;
}

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const maxFileSizeBytes = 12 * 1024 * 1024;
const minDimension = 720;

export const REQUIRED_SCREENSHOT_VIEWS: ReadonlyArray<Pick<ScreenshotSlotState, "viewID" | "label" | "instruction">> = [
  {
    viewID: "front",
    label: "Front screenshot",
    instruction: "Upload a clear front-facing created-player screenshot with the face visible and the UI not covering the head."
  },
  {
    viewID: "left45",
    label: "Left 45 screenshot",
    instruction: "Upload a left 45-degree created-player screenshot captured from the same build."
  },
  {
    viewID: "right45",
    label: "Right 45 screenshot",
    instruction: "Upload a right 45-degree created-player screenshot captured from the same build."
  }
];

export function createInitialScreenshotRefinementSession(now = new Date()): ScreenshotRefinementSession {
  const timestamp = now.toISOString();
  return {
    id: `screenshot-refinement-${timestamp}`,
    createdAt: timestamp,
    status: "active",
    slots: REQUIRED_SCREENSHOT_VIEWS.map((view) => ({
      ...view,
      validationStatus: "invalid",
      validationErrors: ["Screenshot required."]
    }))
  };
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

export function canSubmitScreenshotRefinement(session: ScreenshotRefinementSession) {
  return session.slots.every((slot) => slot.screenshot && slot.validationStatus === "valid");
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
