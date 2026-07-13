import type { CapturedAngle, CapturedAngleID, ISODateString } from "@/types/domain";

export type CaptureCoverageRegionID =
  | "forehead"
  | "temples"
  | "brows"
  | "eyes"
  | "nose"
  | "cheeks"
  | "mouth"
  | "chin"
  | "jaw"
  | "ears"
  | "hairline";

export type CaptureCoverageState = "missing" | "weak" | "sufficient" | "conflictingUnusable";

export interface CaptureCoverageRegionDefinition {
  id: CaptureCoverageRegionID;
  label: string;
  icon: string;
  requiredAngleIDs: CapturedAngleID[];
  supportingAngleIDs: CapturedAngleID[];
  retakePriorityAngleIDs: CapturedAngleID[];
}

export interface CaptureCoverageRegion {
  definition: CaptureCoverageRegionDefinition;
  state: CaptureCoverageState;
  statusText: string;
  supportingAngleIDs: CapturedAngleID[];
  retakeAngleIDs: CapturedAngleID[];
  messages: string[];
}

export interface CaptureCoverageMap {
  version: "web-rgb-coverage-map-1.0.0";
  createdAt: ISODateString;
  updatedAt: ISODateString;
  regions: Record<CaptureCoverageRegionID, CaptureCoverageRegion>;
  counts: Record<CaptureCoverageState, number>;
  recommendedRetakeAngleIDs: CapturedAngleID[];
  blockingRegionIDs: CaptureCoverageRegionID[];
}

export const captureCoverageRegionDefinitions: readonly CaptureCoverageRegionDefinition[] = [
  {
    id: "forehead",
    label: "Forehead",
    icon: "^",
    requiredAngleIDs: ["straightOn"],
    supportingAngleIDs: ["straightOn", "left45", "right45"],
    retakePriorityAngleIDs: ["straightOn"]
  },
  {
    id: "temples",
    label: "Temples",
    icon: "<>",
    requiredAngleIDs: ["left45", "right45"],
    supportingAngleIDs: ["left45", "right45", "leftProfile", "rightProfile"],
    retakePriorityAngleIDs: ["left45", "right45"]
  },
  {
    id: "brows",
    label: "Brows",
    icon: "=",
    requiredAngleIDs: ["straightOn"],
    supportingAngleIDs: ["straightOn", "left45", "right45"],
    retakePriorityAngleIDs: ["straightOn"]
  },
  {
    id: "eyes",
    label: "Eyes",
    icon: "oo",
    requiredAngleIDs: ["straightOn"],
    supportingAngleIDs: ["straightOn", "left45", "right45"],
    retakePriorityAngleIDs: ["straightOn"]
  },
  {
    id: "nose",
    label: "Nose",
    icon: "|",
    requiredAngleIDs: ["straightOn", "leftProfile", "rightProfile"],
    supportingAngleIDs: ["straightOn", "left45", "right45", "leftProfile", "rightProfile"],
    retakePriorityAngleIDs: ["straightOn", "leftProfile", "rightProfile"]
  },
  {
    id: "cheeks",
    label: "Cheeks",
    icon: "()",
    requiredAngleIDs: ["left45", "right45"],
    supportingAngleIDs: ["straightOn", "left45", "right45"],
    retakePriorityAngleIDs: ["left45", "right45"]
  },
  {
    id: "mouth",
    label: "Mouth",
    icon: "--",
    requiredAngleIDs: ["straightOn"],
    supportingAngleIDs: ["straightOn", "left45", "right45"],
    retakePriorityAngleIDs: ["straightOn"]
  },
  {
    id: "chin",
    label: "Chin",
    icon: "v",
    requiredAngleIDs: ["straightOn", "leftProfile", "rightProfile"],
    supportingAngleIDs: ["straightOn", "leftProfile", "rightProfile"],
    retakePriorityAngleIDs: ["straightOn", "leftProfile", "rightProfile"]
  },
  {
    id: "jaw",
    label: "Jaw",
    icon: "L",
    requiredAngleIDs: ["leftProfile", "rightProfile"],
    supportingAngleIDs: ["left45", "right45", "leftProfile", "rightProfile"],
    retakePriorityAngleIDs: ["leftProfile", "rightProfile"]
  },
  {
    id: "ears",
    label: "Ears",
    icon: ")(",
    requiredAngleIDs: ["leftProfile", "rightProfile"],
    supportingAngleIDs: ["leftProfile", "rightProfile"],
    retakePriorityAngleIDs: ["leftProfile", "rightProfile"]
  },
  {
    id: "hairline",
    label: "Hairline",
    icon: "~",
    requiredAngleIDs: ["straightOn"],
    supportingAngleIDs: ["straightOn", "left45", "right45"],
    retakePriorityAngleIDs: ["straightOn"]
  }
];

export function createCaptureCoverageMap(angles: CapturedAngle[], now = new Date()): CaptureCoverageMap {
  const timestamp = now.toISOString();
  const angleMap = new Map(angles.map((angle) => [angle.id, angle]));
  const regions = captureCoverageRegionDefinitions.reduce(
    (record, definition) => ({
      ...record,
      [definition.id]: evaluateRegionCoverage(definition, angleMap)
    }),
    {} as Record<CaptureCoverageRegionID, CaptureCoverageRegion>
  );
  const regionValues = Object.values(regions);
  const recommendedRetakeAngleIDs = uniqueAngleIDs(regionValues.flatMap((region) => region.retakeAngleIDs));
  return {
    version: "web-rgb-coverage-map-1.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,
    regions,
    counts: {
      missing: regionValues.filter((region) => region.state === "missing").length,
      weak: regionValues.filter((region) => region.state === "weak").length,
      sufficient: regionValues.filter((region) => region.state === "sufficient").length,
      conflictingUnusable: regionValues.filter((region) => region.state === "conflictingUnusable").length
    },
    recommendedRetakeAngleIDs,
    blockingRegionIDs: regionValues.filter((region) => region.state === "missing" || region.state === "conflictingUnusable").map((region) => region.definition.id)
  };
}

function evaluateRegionCoverage(
  definition: CaptureCoverageRegionDefinition,
  angleMap: Map<CapturedAngleID, CapturedAngle>
): CaptureCoverageRegion {
  const requiredAngles = definition.requiredAngleIDs.map((angleID) => angleMap.get(angleID)).filter(Boolean) as CapturedAngle[];
  const supportingAngles = definition.supportingAngleIDs.map((angleID) => angleMap.get(angleID)).filter(Boolean) as CapturedAngle[];
  const missingRequiredAngles = requiredAngles.filter((angle) => !angle.image || angle.status !== "complete");
  const unusableAngles = supportingAngles.filter(hasBlockingEvidence);
  const weakAngles = supportingAngles.filter((angle) => angle.image && angle.status === "complete").filter(hasWeakEvidence);

  if (missingRequiredAngles.length > 0) {
    const retakeAngleIDs = uniqueAngleIDs(missingRequiredAngles.map((angle) => angle.id));
    return region(definition, "missing", retakeAngleIDs, [
      `Missing required view coverage from ${formatAngleList(retakeAngleIDs)}.`
    ]);
  }

  if (unusableAngles.length > 0) {
    const retakeAngleIDs = uniqueAngleIDs(unusableAngles.map((angle) => angle.id));
    return region(definition, "conflictingUnusable", retakeAngleIDs, [
      `Retake ${formatAngleList(retakeAngleIDs)} because blocking quality or validation issues make this region unusable.`
    ]);
  }

  if (weakAngles.length > 0) {
    const retakeAngleIDs = uniqueAngleIDs(weakAngles.filter((angle) => angle.qualityReport?.overallState === "blocked").map((angle) => angle.id));
    return region(
      definition,
      "weak",
      retakeAngleIDs,
      [`Coverage is present, but confirmations, advisories, or local quality signals are incomplete for ${formatAngleList(definition.supportingAngleIDs)}.`]
    );
  }

  return region(definition, "sufficient", [], ["Required RGB views are present with no blocking or advisory coverage issues."]);
}

function region(
  definition: CaptureCoverageRegionDefinition,
  state: CaptureCoverageState,
  retakeAngleIDs: CapturedAngleID[],
  messages: string[]
): CaptureCoverageRegion {
  return {
    definition,
    state,
    statusText: coverageStatusText[state],
    supportingAngleIDs: definition.supportingAngleIDs,
    retakeAngleIDs: retakeAngleIDs.length > 0 ? retakeAngleIDs : state === "missing" || state === "conflictingUnusable" ? definition.retakePriorityAngleIDs : [],
    messages
  };
}

function hasBlockingEvidence(angle: CapturedAngle): boolean {
  return (
    angle.status === "error" ||
    angle.validationErrors.length > 0 ||
    (angle.qualityReport?.blockingMessages.length ?? 0) > 0 ||
    (angle.faceLandmarkReport?.blockingMessages.length ?? 0) > 0 ||
    (angle.captureGuidanceReport?.blockingIssues.length ?? 0) > 0
  );
}

function hasWeakEvidence(angle: CapturedAngle): boolean {
  if (!angle.image || angle.status !== "complete") return true;
  if (!angle.manualConfirmation.requestedAngle || !angle.manualConfirmation.neutralExpression || !angle.manualConfirmation.onePerson) return true;
  return (
    angle.qualityReport?.overallState === "needsReview" ||
    (angle.qualityReport?.advisoryMessages.length ?? 0) > 0 ||
    (angle.faceLandmarkReport?.advisoryMessages.length ?? 0) > 0 ||
    (angle.captureGuidanceReport?.advisoryWarnings.length ?? 0) > 0
  );
}

function uniqueAngleIDs(angleIDs: CapturedAngleID[]): CapturedAngleID[] {
  return [...new Set(angleIDs)];
}

function formatAngleList(angleIDs: CapturedAngleID[]): string {
  return angleIDs.map((angleID) => angleLabels[angleID]).join(", ");
}

const coverageStatusText: Record<CaptureCoverageState, string> = {
  missing: "Missing",
  weak: "Weak",
  sufficient: "Sufficient",
  conflictingUnusable: "Conflicting/unusable"
};

const angleLabels: Record<CapturedAngleID, string> = {
  straightOn: "front",
  left45: "left 45",
  right45: "right 45",
  leftProfile: "left profile",
  rightProfile: "right profile"
};
