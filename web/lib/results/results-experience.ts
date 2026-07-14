import { CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/product-copy";
import type { AppearanceRecommendationCategory, BuildInstruction, GameAppearanceMatch, StandardFaceProfile } from "@/types/domain";

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

export type RecommendationPosition = "Best match" | "Second match" | "Third match";

export interface RecommendationInstructionExplanation {
  stepNumber: number;
  gameTitle: string;
  instructionKind: BuildInstruction["instructionKind"];
  menuCategory: string;
  exactVerifiedGameLabel: string;
  nativeHeadOption: string;
  navigationPath: string[];
  platform: string;
  gameVersion: string;
  patchVersion: string | null;
  mode: string;
  creationPath: string;
  notes: string[];
  limitations: string[];
  verificationDate: string | null;
}

export interface RecommendationMatchExplanation {
  position: RecommendationPosition;
  rank: number;
  catalogItemID: string;
  matchScore: number;
  scoreLabel: string;
  confidence: {
    label: GameAppearanceMatch["confidence"]["label"];
    score: number;
  };
  keyReasons: string[];
  keyDifferences: string[];
  uncertaintyNotes: string[];
  captureQuality: string;
  catalogVersion: string;
  verificationDate: string | null;
  stepByStepGameInstructions: RecommendationInstructionExplanation[];
}

export interface RecommendationExplanationReport {
  title: string;
  scoreLanguage: string;
  captureQuality: string;
  recommendations: RecommendationMatchExplanation[];
  catalogVersions: string[];
  verificationDates: Array<string | null>;
  limitations: string[];
}

const recommendationScoreLanguage = "Match score based on available game options.";
const recommendationPositions: RecommendationPosition[] = ["Best match", "Second match", "Third match"];
const missingInstructionLimitations = [
  "Only verified native game values with verified menu paths are shown as steps.",
  "Unavailable or ambiguous appearance categories require user correction or additional catalog evidence before they can become instructions."
];

type AppearanceInstructionSpec = {
  category: AppearanceRecommendationCategory;
  instructionKind: BuildInstruction["instructionKind"];
  menuCategory: string;
  menuPathKeys: string[];
};

const appearanceInstructionSpecs: AppearanceInstructionSpec[] = [
  {
    category: "hairstyle",
    instructionKind: "hairstyle",
    menuCategory: "Hairstyle",
    menuPathKeys: ["verifiedHairstyleMenuPath", "hairstyleMenuPath", "nativeHairstyleMenuPath"]
  },
  {
    category: "hairColor",
    instructionKind: "hairColor",
    menuCategory: "Hair color",
    menuPathKeys: ["verifiedHairColorMenuPath", "hairColorMenuPath", "nativeHairColorMenuPath"]
  },
  {
    category: "facialHair",
    instructionKind: "facialHair",
    menuCategory: "Facial hair",
    menuPathKeys: ["verifiedFacialHairMenuPath", "facialHairMenuPath", "nativeFacialHairMenuPath"]
  },
  {
    category: "facialHairColor",
    instructionKind: "facialHairColor",
    menuCategory: "Facial-hair color",
    menuPathKeys: ["verifiedFacialHairColorMenuPath", "facialHairColorMenuPath", "nativeFacialHairColorMenuPath"]
  },
  {
    category: "eyebrows",
    instructionKind: "eyebrows",
    menuCategory: "Eyebrows",
    menuPathKeys: ["verifiedEyebrowMenuPath", "eyebrowMenuPath", "nativeEyebrowMenuPath"]
  },
  {
    category: "skinPresentation",
    instructionKind: "skinPresentation",
    menuCategory: "Skin controls",
    menuPathKeys: ["verifiedSkinPresentationMenuPath", "skinPresentationMenuPath", "nativeSkinPresentationMenuPath"]
  },
  {
    category: "otherVisualAttribute",
    instructionKind: "otherVerifiedControl",
    menuCategory: "Additional verified control",
    menuPathKeys: ["verifiedOtherVisualAttributeMenuPath", "otherVisualAttributeMenuPath", "nativeOtherVisualAttributeMenuPath"]
  }
];

const directControlInstructionSpecs: Array<{
  instructionKind: BuildInstruction["instructionKind"];
  menuCategory: string;
  nativeValueKeys: string[];
  menuPathKeys: string[];
}> = [
  {
    instructionKind: "height",
    menuCategory: "Height",
    nativeValueKeys: ["verifiedHeightNativeValue", "heightNativeValue", "nativeHeightLabel"],
    menuPathKeys: ["verifiedHeightMenuPath", "heightMenuPath", "nativeHeightMenuPath"]
  },
  {
    instructionKind: "weight",
    menuCategory: "Weight",
    nativeValueKeys: ["verifiedWeightNativeValue", "weightNativeValue", "nativeWeightLabel"],
    menuPathKeys: ["verifiedWeightMenuPath", "weightMenuPath", "nativeWeightMenuPath"]
  },
  {
    instructionKind: "bodySelection",
    menuCategory: "Body selection",
    nativeValueKeys: ["verifiedBodySelectionNativeValue", "bodySelectionNativeValue", "preferredBodyTypeNativeValue", "nativeBodySelectionLabel"],
    menuPathKeys: ["verifiedBodySelectionMenuPath", "bodySelectionMenuPath", "preferredBodyTypeMenuPath", "nativeBodySelectionMenuPath"]
  }
];

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

export function createRecommendationExplanationReport(input: {
  profile: StandardFaceProfile | null;
  matches: GameAppearanceMatch[];
}): RecommendationExplanationReport {
  const captureQuality = summarizeCaptureQuality(input.profile);
  const recommendations = [...input.matches]
    .sort((first, second) => first.rank - second.rank)
    .slice(0, 3)
    .map((match, index) => createRecommendationMatchExplanation(match, recommendationPositions[index], captureQuality));
  return {
    title: "Top three closest available settings",
    scoreLanguage: recommendationScoreLanguage,
    captureQuality,
    recommendations,
    catalogVersions: Array.from(new Set(recommendations.map((recommendation) => recommendation.catalogVersion))),
    verificationDates: Array.from(new Set(recommendations.map((recommendation) => recommendation.verificationDate))),
    limitations: [
      "Scores compare available verified game options only.",
      "Scores do not identify a person.",
      "Step-by-step instructions are shown only when verified catalog navigation evidence exists."
    ]
  };
}

export function hasMinimumProfileEvidence(profile: StandardFaceProfile) {
  return profile.qualityReport.requiredAnglesComplete && Object.values(profile.sourceAngleAvailability).every((angle) => angle.available);
}

export function createBuildInstructions(match: GameAppearanceMatch): BuildInstruction[] {
  if (match.catalogItem.verificationState !== "verified") return [];
  const headInstructions = (match.catalogItem.navigationInstructions ?? [])
    .filter((instruction) => instruction.instruction.trim().length > 0 && instruction.evidenceAssetID.trim().length > 0)
    .map((instruction) => ({
      id: `${match.catalogItem.stableInternalID}-step-${instruction.sequenceNumber}`,
      sequenceNumber: instruction.sequenceNumber,
      title: `Set ${match.catalogItem.category}`,
      detail: instruction.instruction,
      gameTitle: match.catalogItem.game,
      menuCategory: match.catalogItem.category,
      verifiedGameLabel: match.catalogItem.visibleGameLabelOrIndex,
      instructionKind: "headOption" as const,
      nativeHeadOption: match.catalogItem.visibleGameLabelOrIndex,
      navigationPath: splitNavigationPath(instruction.instruction),
      platform: match.catalogItem.platform,
      gameVersion: match.catalogItem.gameVersion,
      patchVersion: match.catalogItem.patchVersion ?? null,
      mode: match.catalogItem.gameMode,
      creationPath: match.catalogItem.creationPath,
      notes: [`Evidence asset: ${instruction.evidenceAssetID}`],
      limitations: [...missingInstructionLimitations],
      verificationDate: match.catalogItem.verifiedDate,
      relatedCatalogItemID: match.catalogItem.stableInternalID
    }));
  const nextSequenceNumber = Math.max(0, ...headInstructions.map((instruction) => instruction.sequenceNumber)) + 1;
  const appearanceInstructions = createAppearanceBuildInstructions(match, nextSequenceNumber);
  const directControlInstructions = createDirectControlBuildInstructions(match, nextSequenceNumber + appearanceInstructions.length);
  return [...headInstructions, ...appearanceInstructions, ...directControlInstructions].filter((instruction) => instruction.navigationPath.length > 0);
}

export function validateBuildInstructions(match: GameAppearanceMatch, instructions: BuildInstruction[]) {
  const errors: string[] = [];
  for (const instruction of instructions) {
    if (match.catalogItem.verificationState !== "verified") errors.push(`${instruction.id} references an unverified catalog item.`);
    if (instruction.relatedCatalogItemID !== match.catalogItem.stableInternalID) errors.push(`${instruction.id} does not resolve to the matched catalog item.`);
    if (instruction.gameTitle !== match.catalogItem.game) errors.push(`${instruction.id} has the wrong game title.`);
    if (instruction.platform !== match.catalogItem.platform) errors.push(`${instruction.id} has the wrong platform.`);
    if (instruction.gameVersion !== match.catalogItem.gameVersion) errors.push(`${instruction.id} has the wrong game version.`);
    if (instruction.mode !== match.catalogItem.gameMode) errors.push(`${instruction.id} has the wrong mode.`);
    if (instruction.creationPath !== match.catalogItem.creationPath) errors.push(`${instruction.id} has the wrong creation path.`);
    if (instruction.nativeHeadOption !== match.catalogItem.visibleGameLabelOrIndex) errors.push(`${instruction.id} has the wrong native head option.`);
    if (instruction.navigationPath.length === 0) errors.push(`${instruction.id} is missing an exact menu hierarchy.`);
    if (!instruction.verifiedGameLabel.trim()) errors.push(`${instruction.id} is missing a verified native value.`);
    if (!instruction.verificationDate) errors.push(`${instruction.id} is missing a catalog verification date.`);

    if (instruction.instructionKind === "headOption") {
      const matchingNavigation = (match.catalogItem.navigationInstructions ?? []).some(
        (navigation) => splitNavigationPath(navigation.instruction).join(" > ") === instruction.navigationPath.join(" > ") && navigation.evidenceAssetID.trim().length > 0
      );
      if (!matchingNavigation) errors.push(`${instruction.id} does not reference verified navigation evidence.`);
      if (instruction.verifiedGameLabel !== match.catalogItem.visibleGameLabelOrIndex) errors.push(`${instruction.id} does not reference the native head option.`);
    } else if (instruction.relatedAppearanceCategory) {
      const recommendation = match.appearanceRecommendations?.find((candidate) => candidate.category === instruction.relatedAppearanceCategory);
      if (!recommendation || recommendation.status !== "selected") errors.push(`${instruction.id} does not resolve to a selected verified appearance recommendation.`);
      if (recommendation && instruction.verifiedGameLabel !== recommendation.nativeGameValue) {
        errors.push(`${instruction.id} does not reference the selected verified native appearance value.`);
      }
      if (!instruction.sourceAnnotationKey) errors.push(`${instruction.id} is missing the source annotation key for the verified native value.`);
    }
  }
  return { ok: errors.length === 0, errors };
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

function createRecommendationMatchExplanation(
  match: GameAppearanceMatch,
  position: RecommendationPosition,
  captureQuality: string
): RecommendationMatchExplanation {
  return {
    position,
    rank: match.rank,
    catalogItemID: match.catalogItem.stableInternalID,
    matchScore: match.score,
    scoreLabel: recommendationScoreLanguage,
    confidence: {
      label: match.confidence.label,
      score: match.confidence.score
    },
    keyReasons: match.explanation.strongestSimilarities,
    keyDifferences: match.explanation.largestDifferences,
    uncertaintyNotes: match.explanation.uncertaintyNotes,
    captureQuality,
    catalogVersion: match.catalogVersion.identifier,
    verificationDate: match.catalogVersion.verifiedAt ?? match.catalogItem.verifiedDate,
    stepByStepGameInstructions: createBuildInstructions(match).map((instruction) => ({
      stepNumber: instruction.sequenceNumber,
      gameTitle: instruction.gameTitle,
      instructionKind: instruction.instructionKind,
      menuCategory: instruction.menuCategory,
      exactVerifiedGameLabel: instruction.verifiedGameLabel,
      nativeHeadOption: instruction.nativeHeadOption,
      navigationPath: instruction.navigationPath,
      platform: instruction.platform,
      gameVersion: instruction.gameVersion,
      patchVersion: instruction.patchVersion ?? null,
      mode: instruction.mode,
      creationPath: instruction.creationPath,
      notes: instruction.notes,
      limitations: instruction.limitations,
      verificationDate: instruction.verificationDate
    }))
  };
}

function createAppearanceBuildInstructions(match: GameAppearanceMatch, startingSequenceNumber: number): BuildInstruction[] {
  const instructions: BuildInstruction[] = [];
  for (const spec of appearanceInstructionSpecs) {
    const recommendation = match.appearanceRecommendations?.find((candidate) => candidate.category === spec.category);
    if (!recommendation || recommendation.status !== "selected" || !recommendation.nativeGameValue) continue;
    if (recommendation.sourceCatalogItemID !== match.catalogItem.stableInternalID) continue;
    const menuPath = firstAnnotationValue(match, spec.menuPathKeys);
    if (!menuPath) continue;
    instructions.push(
      instructionFromVerifiedControl({
        match,
        sequenceNumber: startingSequenceNumber + instructions.length,
        instructionKind: spec.instructionKind,
        menuCategory: spec.menuCategory,
        verifiedGameLabel: recommendation.nativeGameValue,
        menuPath,
        sourceAnnotationKey: recommendation.sourceAnnotationKey,
        relatedAppearanceCategory: recommendation.category,
        note: recommendation.explanation
      })
    );
  }
  return instructions;
}

function createDirectControlBuildInstructions(match: GameAppearanceMatch, startingSequenceNumber: number): BuildInstruction[] {
  const instructions: BuildInstruction[] = [];
  for (const spec of directControlInstructionSpecs) {
    const verifiedGameLabel = firstAnnotationValue(match, spec.nativeValueKeys);
    const menuPath = firstAnnotationValue(match, spec.menuPathKeys);
    if (!verifiedGameLabel || !menuPath) continue;
    instructions.push(
      instructionFromVerifiedControl({
        match,
        sequenceNumber: startingSequenceNumber + instructions.length,
        instructionKind: spec.instructionKind,
        menuCategory: spec.menuCategory,
        verifiedGameLabel,
        menuPath,
        sourceAnnotationKey: firstAnnotationKey(match, spec.nativeValueKeys),
        note: "Included because this catalog item contains a verified native body or physique control value."
      })
    );
  }
  return instructions;
}

function instructionFromVerifiedControl(input: {
  match: GameAppearanceMatch;
  sequenceNumber: number;
  instructionKind: BuildInstruction["instructionKind"];
  menuCategory: string;
  verifiedGameLabel: string;
  menuPath: string;
  sourceAnnotationKey: string | null;
  relatedAppearanceCategory?: AppearanceRecommendationCategory;
  note: string;
}): BuildInstruction {
  return {
    id: `${input.match.catalogItem.stableInternalID}-${input.instructionKind}-${input.sequenceNumber}`,
    sequenceNumber: input.sequenceNumber,
    title: `Set ${input.menuCategory}`,
    detail: `${input.menuPath} > ${input.verifiedGameLabel}`,
    gameTitle: input.match.catalogItem.game,
    menuCategory: input.menuCategory,
    verifiedGameLabel: input.verifiedGameLabel,
    instructionKind: input.instructionKind,
    nativeHeadOption: input.match.catalogItem.visibleGameLabelOrIndex,
    navigationPath: splitNavigationPath(input.menuPath),
    platform: input.match.catalogItem.platform,
    gameVersion: input.match.catalogItem.gameVersion,
    patchVersion: input.match.catalogItem.patchVersion ?? null,
    mode: input.match.catalogItem.gameMode,
    creationPath: input.match.catalogItem.creationPath,
    notes: [`Native head option: ${input.match.catalogItem.visibleGameLabelOrIndex}`, input.note],
    limitations: [...missingInstructionLimitations],
    verificationDate: input.match.catalogItem.verifiedDate ?? input.match.catalogVersion.verifiedAt,
    relatedCatalogItemID: input.match.catalogItem.stableInternalID,
    relatedAppearanceCategory: input.relatedAppearanceCategory,
    sourceAnnotationKey: input.sourceAnnotationKey
  };
}

function firstAnnotationValue(match: GameAppearanceMatch, keys: string[]) {
  const key = firstAnnotationKey(match, keys);
  return key ? match.catalogItem.humanAnnotations[key]?.trim() : null;
}

function firstAnnotationKey(match: GameAppearanceMatch, keys: string[]) {
  return keys.find((key) => match.catalogItem.humanAnnotations[key]?.trim()) ?? null;
}

function splitNavigationPath(instruction: string) {
  return instruction
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
}
