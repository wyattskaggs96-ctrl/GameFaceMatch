import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";

export const PHASE0_EVIDENCE_NAMING_SCHEMA_VERSION = "phase0-evidence-naming-v1";

export const PHASE0_APPROVED_EVIDENCE_VIEW_LABELS = [
  "straightOn",
  "left45",
  "right45",
  "leftProfile",
  "rightProfile",
  "front",
  "leftThreeQuarter",
  "rightThreeQuarter",
  "elevated",
  "lowered",
  "rear",
  "fullScreenMenu",
  "navigationEvidence",
  "menuOverview",
  "environment",
  "review",
  "notApplicable"
] as const;

export const PHASE0_APPROVED_EVIDENCE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic",
  "heif",
  "mp4",
  "mov",
  "pdf",
  "txt",
  "json"
] as const;

export type Phase0EvidenceNamingView = (typeof PHASE0_APPROVED_EVIDENCE_VIEW_LABELS)[number];
export type Phase0EvidenceNamingExtension = (typeof PHASE0_APPROVED_EVIDENCE_EXTENSIONS)[number];
export type Phase0EvidenceRenamePlanStatus = "ready" | "blocked";

export interface Phase0EvidenceNamingInput {
  catalogID: string;
  view: string;
  gameVersion: string;
  patch: string;
  date: string;
  extension: string;
}

export interface Phase0EvidenceRenamePlanInput extends Phase0EvidenceNamingInput {
  intakeID: Phase0EntityID;
  currentRelativePath: string;
  targetDirectory: string;
  existingRelativePaths: string[];
}

export interface Phase0EvidenceNamingIssue {
  code: string;
  message: string;
  field?: keyof Phase0EvidenceNamingInput | "targetDirectory" | "targetPath";
}

export interface Phase0EvidenceRenamePlan {
  schemaVersion: typeof PHASE0_EVIDENCE_NAMING_SCHEMA_VERSION;
  intakeID: Phase0EntityID;
  currentRelativePath: string;
  generatedFilename: string | null;
  targetRelativePath: string | null;
  status: Phase0EvidenceRenamePlanStatus;
  issues: Phase0EvidenceNamingIssue[];
  previewOnly: true;
  destructiveRenameAllowed: false;
  createdAt: ISODateString;
}

const catalogIDPattern = /^CF27_[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_[0-9]{3}$/;
const tokenPattern = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;
const datePattern = /^[0-9]{8}$/;
const unsafeCharacterPattern = /[<>:"/\\|?*\u0000-\u001f]/;

export function generateEvidenceFilename(input: Phase0EvidenceNamingInput): string {
  const normalized = normalizeNamingInput(input);
  return [
    normalized.catalogID,
    normalized.view,
    normalized.gameVersion,
    normalized.patch,
    normalized.date
  ].join("_") + `.${normalized.extension}`;
}

export function createEvidenceRenamePlan(input: Phase0EvidenceRenamePlanInput, createdAt: ISODateString): Phase0EvidenceRenamePlan {
  const issues = validateEvidenceNamingInput(input);
  const normalizedTargetDirectory = normalizeTargetDirectory(input.targetDirectory);
  if (!isRelativeSafeDirectory(normalizedTargetDirectory)) {
    issues.push({
      code: "unsafeTargetDirectory",
      field: "targetDirectory",
      message: "Target directory must be a safe repository-relative path."
    });
  }

  const generatedFilename = issues.some((issue) => issue.field && issue.field !== "targetDirectory" && issue.field !== "targetPath")
    ? null
    : generateEvidenceFilename(input);
  const targetRelativePath = generatedFilename ? joinRelativePath(normalizedTargetDirectory, generatedFilename) : null;

  if (targetRelativePath) {
    const normalizedExistingPaths = new Set(input.existingRelativePaths.map(normalizePathForComparison));
    if (normalizedExistingPaths.has(normalizePathForComparison(targetRelativePath))) {
      issues.push({
        code: "duplicatePath",
        field: "targetPath",
        message: "Generated target path already exists in the intake set or audit storage."
      });
    }
  }

  return {
    schemaVersion: PHASE0_EVIDENCE_NAMING_SCHEMA_VERSION,
    intakeID: input.intakeID,
    currentRelativePath: input.currentRelativePath,
    generatedFilename,
    targetRelativePath,
    status: issues.length === 0 ? "ready" : "blocked",
    issues,
    previewOnly: true,
    destructiveRenameAllowed: false,
    createdAt
  };
}

export function createEvidenceRenamePlans(inputs: Phase0EvidenceRenamePlanInput[], createdAt: ISODateString): Phase0EvidenceRenamePlan[] {
  const plans = inputs.map((input) => createEvidenceRenamePlan(input, createdAt));
  const duplicateTargetPaths = new Set(
    plans
      .filter((plan): plan is Phase0EvidenceRenamePlan & { targetRelativePath: string } => Boolean(plan.targetRelativePath))
      .map((plan) => normalizePathForComparison(plan.targetRelativePath))
      .filter((path, index, paths) => paths.indexOf(path) !== index)
  );

  return plans.map((plan) => {
    if (!plan.targetRelativePath || !duplicateTargetPaths.has(normalizePathForComparison(plan.targetRelativePath))) return plan;
    const issues = [
      ...plan.issues,
      {
        code: "duplicatePath",
        field: "targetPath" as const,
        message: "Generated target path duplicates another pending rename plan."
      }
    ];
    return {
      ...plan,
      status: "blocked" as const,
      issues
    };
  });
}

export function validateEvidenceNamingInput(input: Phase0EvidenceNamingInput): Phase0EvidenceNamingIssue[] {
  const normalized = normalizeNamingInput(input);
  const issues: Phase0EvidenceNamingIssue[] = [];

  for (const field of ["catalogID", "view", "gameVersion", "patch", "date", "extension"] as const) {
    if (!hasUsableText(normalized[field])) {
      issues.push({
        code: "missingField",
        field,
        message: `${field} is required before a file name can be generated.`
      });
    }
  }
  if (hasUsableText(normalized.catalogID) && !catalogIDPattern.test(normalized.catalogID)) {
    issues.push({
      code: "invalidCatalogID",
      field: "catalogID",
      message: "Catalog ID must follow the CF27 platform/mode/category/order convention."
    });
  }
  if (hasUsableText(normalized.view) && !isApprovedEvidenceView(normalized.view)) {
    issues.push({
      code: "invalidView",
      field: "view",
      message: "View must be one of the approved audit evidence view labels."
    });
  }
  if (hasUsableText(normalized.gameVersion) && !tokenPattern.test(normalized.gameVersion)) {
    issues.push({
      code: "invalidVersion",
      field: "gameVersion",
      message: "Game version must use letters, numbers, dots, or hyphens only."
    });
  }
  if (hasUsableText(normalized.patch) && !tokenPattern.test(normalized.patch)) {
    issues.push({
      code: "invalidPatch",
      field: "patch",
      message: "Patch must use letters, numbers, dots, or hyphens only."
    });
  }
  if (hasUsableText(normalized.date) && (!datePattern.test(normalized.date) || !isValidDateToken(normalized.date))) {
    issues.push({
      code: "invalidDate",
      field: "date",
      message: "Date must be a real calendar date in YYYYMMDD format."
    });
  }
  if (hasUsableText(normalized.extension) && !isApprovedEvidenceExtension(normalized.extension)) {
    issues.push({
      code: "invalidExtension",
      field: "extension",
      message: "Extension is not approved for audit evidence."
    });
  }
  for (const [field, value] of Object.entries(normalized) as Array<[keyof Phase0EvidenceNamingInput, string]>) {
    if (hasUsableText(value) && unsafeCharacterPattern.test(value)) {
      issues.push({
        code: "unsafeCharacters",
        field,
        message: `${field} contains characters that are unsafe for evidence file names.`
      });
    }
  }

  return issues;
}

export function isApprovedEvidenceView(value: string): value is Phase0EvidenceNamingView {
  return PHASE0_APPROVED_EVIDENCE_VIEW_LABELS.includes(value as Phase0EvidenceNamingView);
}

export function isApprovedEvidenceExtension(value: string): value is Phase0EvidenceNamingExtension {
  return PHASE0_APPROVED_EVIDENCE_EXTENSIONS.includes(value.toLowerCase() as Phase0EvidenceNamingExtension);
}

export function extensionFromFilename(filename: string) {
  const lastSegment = filename.split(/[\\/]/).pop() ?? "";
  const index = lastSegment.lastIndexOf(".");
  return index > -1 ? lastSegment.slice(index + 1).toLowerCase() : "";
}

function normalizeNamingInput(input: Phase0EvidenceNamingInput): Phase0EvidenceNamingInput {
  return {
    catalogID: input.catalogID.trim().toUpperCase(),
    view: input.view.trim(),
    gameVersion: input.gameVersion.trim(),
    patch: input.patch.trim(),
    date: input.date.trim(),
    extension: input.extension.trim().replace(/^\./, "").toLowerCase()
  };
}

function normalizeTargetDirectory(value: string) {
  return value.trim().replaceAll("\\", "/").split("/").filter((part) => part && part !== ".").join("/");
}

function joinRelativePath(directory: string, filename: string) {
  return directory.length > 0 ? `${directory}/${filename}` : filename;
}

function normalizePathForComparison(value: string) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").toLowerCase();
}

function isRelativeSafeDirectory(value: string) {
  if (value.length === 0) return true;
  return !value.startsWith("/")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    && value.split("/").every((part) => part.length > 0 && part !== ".." && !/[<>:"\\|?*\u0000-\u001f]/.test(part));
}

function isValidDateToken(value: string) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasUsableText(value: string) {
  return value.trim().length > 0 && !/REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i.test(value);
}
