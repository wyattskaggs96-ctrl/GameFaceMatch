import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { BuildInstruction, GameAppearanceMatch, StandardFaceProfile } from "@/types/domain";

export type ResultsViewKind = "processing" | "catalogUnavailable" | "insufficientProfileData" | "matchingError" | "topThree";

export interface ResultsStateInput {
  profile: StandardFaceProfile | null;
  catalogIsEmpty: boolean;
  matches?: GameAppearanceMatch[];
  errorMessage?: string | null;
  isProcessing?: boolean;
}

export interface ResultsState {
  kind: ResultsViewKind;
  title: string;
  message: string;
  matches: GameAppearanceMatch[];
  canSave: boolean;
  canShare: boolean;
}

export function createResultsState(input: ResultsStateInput): ResultsState {
  if (input.isProcessing) {
    return {
      kind: "processing",
      title: "Processing match",
      message: "Checking the local profile and verified catalog state.",
      matches: [],
      canSave: false,
      canShare: false
    };
  }

  if (!input.profile || !hasMinimumProfileEvidence(input.profile)) {
    return {
      kind: "insufficientProfileData",
      title: "Profile needs more data",
      message: "Complete the required RGB capture angles and profile review before matching.",
      matches: [],
      canSave: false,
      canShare: false
    };
  }

  if (input.catalogIsEmpty) {
    return {
      kind: "catalogUnavailable",
      title: CATALOG_UNAVAILABLE_MESSAGE,
      message: "No verified College Football 27 records are loaded, so no production top-three results or build instructions can be shown.",
      matches: [],
      canSave: false,
      canShare: true
    };
  }

  if (input.errorMessage) {
    return {
      kind: "matchingError",
      title: "Matching error",
      message: input.errorMessage,
      matches: [],
      canSave: false,
      canShare: false
    };
  }

  if ((input.matches ?? []).length === 0) {
    return {
      kind: "matchingError",
      title: "No verified matches returned",
      message: "The verified catalog loaded, but no match could be produced from the available profile data.",
      matches: [],
      canSave: false,
      canShare: false
    };
  }

  const matches = [...(input.matches ?? [])].sort((first, second) => first.rank - second.rank).slice(0, 3);
  return {
    kind: "topThree",
    title: "Top three closest available settings",
    message: "Match score based on the game’s available appearance options.",
    matches,
    canSave: true,
    canShare: true
  };
}

export function hasMinimumProfileEvidence(profile: StandardFaceProfile) {
  return profile.qualityReport.requiredAnglesComplete && Object.values(profile.sourceAngleAvailability).every((angle) => angle.available);
}

export function createBuildInstructions(match: GameAppearanceMatch): BuildInstruction[] {
  return (match.catalogItem.navigationInstructions ?? []).map((instruction) => ({
    id: `${match.catalogItem.stableInternalID}-step-${instruction.sequenceNumber}`,
    sequenceNumber: instruction.sequenceNumber,
    title: `${match.catalogItem.category} step ${instruction.sequenceNumber}`,
    detail: instruction.instruction,
    menuCategory: match.catalogItem.category,
    verifiedGameLabel: match.catalogItem.visibleGameLabelOrIndex,
    navigationPath: splitNavigationPath(instruction.instruction),
    platform: match.catalogItem.platform,
    gameVersion: match.catalogItem.gameVersion,
    mode: match.catalogItem.gameMode,
    creationPath: match.catalogItem.creationPath,
    notes: [`Evidence asset: ${instruction.evidenceAssetID}`],
    verificationDate: match.catalogItem.verifiedDate,
    relatedCatalogItemID: match.catalogItem.stableInternalID
  }));
}

export function getTieGroups(matches: GameAppearanceMatch[]) {
  const groups = new Map<number, GameAppearanceMatch[]>();
  for (const match of matches) {
    const groupID = match.tieGroup ?? match.rank;
    const current = groups.get(groupID) ?? [];
    current.push(match);
    groups.set(groupID, current);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

export function summarizeCaptureQuality(profile: StandardFaceProfile | null) {
  if (!profile) return "No local standardized profile has been created.";
  const blocking = profile.qualityReport.blockingIssueCount ?? profile.qualityReport.issues.filter((issue) => issue.severity === "blocking").length;
  const advisory = profile.qualityReport.advisoryIssueCount ?? profile.qualityReport.issues.filter((issue) => issue.severity === "advisory").length;
  return `${Object.values(profile.sourceAngleAvailability).filter((angle) => angle.available).length} of 5 RGB angles available. ${blocking} blocking issue(s), ${advisory} advisory issue(s).`;
}

function splitNavigationPath(instruction: string) {
  return instruction
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
}
