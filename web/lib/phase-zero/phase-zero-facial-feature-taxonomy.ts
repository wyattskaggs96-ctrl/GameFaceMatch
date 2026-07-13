import type { ISODateString } from "@/types/domain";
import type { Phase0EntityID } from "./phase-zero-domain";

export const PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION = "phase0-facial-feature-taxonomy-v1";

export const phase0FacialFeatureGroups = [
  "face",
  "forehead",
  "temples",
  "cheekbones",
  "jaw",
  "chin",
  "eyes",
  "brows",
  "nose",
  "mouth",
  "ears",
  "symmetry",
  "hairline",
  "facialHairCoverage"
] as const;

export type Phase0FacialFeatureGroup = (typeof phase0FacialFeatureGroups)[number];
export type Phase0AnnotationSource = "measured" | "researcherReviewed" | "userConfirmed" | "unavailable";
export type Phase0OrdinalSize = "unknown" | "verySmall" | "small" | "medium" | "large" | "veryLarge";
export type Phase0OrdinalWidth = "unknown" | "veryNarrow" | "narrow" | "medium" | "wide" | "veryWide";
export type Phase0OrdinalHeight = "unknown" | "veryShort" | "short" | "medium" | "tall" | "veryTall";
export type Phase0OrdinalProjection = "unknown" | "recessed" | "slight" | "medium" | "prominent" | "veryProminent";
export type Phase0OrdinalAngle = "unknown" | "low" | "medium" | "high";
export type Phase0Coverage = "unknown" | "none" | "light" | "partial" | "full";
export type Phase0Visibility = "unknown" | "notVisible" | "partiallyVisible" | "visible";
export type Phase0SymmetryReview = "unknown" | "appearsSymmetric" | "minorAsymmetry" | "notableAsymmetry";

export const prohibitedFacialFeatureAnnotationKeys = [
  "race",
  "ethnicity",
  "attractiveness",
  "personality",
  "identity",
  "criminality",
  "health",
  "realPersonResemblance",
  "celebrityResemblance",
  "lookalike"
] as const;

export type ProhibitedFacialFeatureAnnotationKey = (typeof prohibitedFacialFeatureAnnotationKeys)[number];

export interface Phase0FeatureMetric<TValue extends string | number | boolean | null> {
  value: TValue;
  source: Phase0AnnotationSource;
  confidence: number;
  evidenceFileIDs: Phase0EntityID[];
  notes?: string;
}

export interface Phase0CatalogNativeLabelReference {
  nativeCategoryLabel: string;
  visibleGameLabelOrIndex: string;
  nativeOrder: number;
  menuItemID: Phase0EntityID;
}

export interface Phase0FaceFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  lengthRatio: Phase0FeatureMetric<number | null>;
  widthClass: Phase0FeatureMetric<Phase0OrdinalWidth>;
  lengthClass: Phase0FeatureMetric<Phase0OrdinalHeight>;
}

export interface Phase0ForeheadFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  heightRatio: Phase0FeatureMetric<number | null>;
  widthClass: Phase0FeatureMetric<Phase0OrdinalWidth>;
  heightClass: Phase0FeatureMetric<Phase0OrdinalHeight>;
}

export interface Phase0TemplesFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  taperClass: Phase0FeatureMetric<"unknown" | "straight" | "slightInward" | "strongInward" | "outward">;
}

export interface Phase0CheekboneFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  prominenceClass: Phase0FeatureMetric<Phase0OrdinalProjection>;
}

export interface Phase0JawFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  angleClass: Phase0FeatureMetric<Phase0OrdinalAngle>;
  taperClass: Phase0FeatureMetric<"unknown" | "tapered" | "straight" | "broad">;
}

export interface Phase0ChinFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  lengthRatio: Phase0FeatureMetric<number | null>;
  projectionClass: Phase0FeatureMetric<Phase0OrdinalProjection>;
}

export interface Phase0EyesFeatureAnnotation {
  spacingRatio: Phase0FeatureMetric<number | null>;
  meanEyeWidthRatio: Phase0FeatureMetric<number | null>;
  tiltClass: Phase0FeatureMetric<"unknown" | "downward" | "level" | "upward">;
  opennessClass: Phase0FeatureMetric<Phase0OrdinalHeight>;
}

export interface Phase0BrowsFeatureAnnotation {
  thicknessClass: Phase0FeatureMetric<Phase0OrdinalSize>;
  positionRatio: Phase0FeatureMetric<number | null>;
  archClass: Phase0FeatureMetric<"unknown" | "flat" | "slightArch" | "strongArch">;
}

export interface Phase0NoseFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  lengthRatio: Phase0FeatureMetric<number | null>;
  bridgeClass: Phase0FeatureMetric<"unknown" | "low" | "medium" | "high">;
  projectionClass: Phase0FeatureMetric<Phase0OrdinalProjection>;
}

export interface Phase0MouthFeatureAnnotation {
  widthRatio: Phase0FeatureMetric<number | null>;
  fullnessClass: Phase0FeatureMetric<Phase0OrdinalSize>;
  cornerTiltClass: Phase0FeatureMetric<"unknown" | "downward" | "level" | "upward">;
}

export interface Phase0EarsFeatureAnnotation {
  visibilityClass: Phase0FeatureMetric<Phase0Visibility>;
  sizeClass: Phase0FeatureMetric<Phase0OrdinalSize>;
  protrusionClass: Phase0FeatureMetric<Phase0OrdinalProjection>;
}

export interface Phase0SymmetryFeatureAnnotation {
  leftRightDifferenceRatio: Phase0FeatureMetric<number | null>;
  reviewClass: Phase0FeatureMetric<Phase0SymmetryReview>;
}

export interface Phase0HairlineFeatureAnnotation {
  positionClass: Phase0FeatureMetric<Phase0OrdinalHeight>;
  contourClass: Phase0FeatureMetric<"unknown" | "straight" | "rounded" | "widowsPeak" | "templeRecessed" | "covered">;
  visibleCoverageClass: Phase0FeatureMetric<Phase0Visibility>;
}

export interface Phase0FacialHairCoverageAnnotation {
  upperLipCoverage: Phase0FeatureMetric<Phase0Coverage>;
  chinCoverage: Phase0FeatureMetric<Phase0Coverage>;
  cheekCoverage: Phase0FeatureMetric<Phase0Coverage>;
  jawCoverage: Phase0FeatureMetric<Phase0Coverage>;
  sideburnCoverage: Phase0FeatureMetric<Phase0Coverage>;
  densityClass: Phase0FeatureMetric<Phase0OrdinalSize>;
}

export interface Phase0FacialFeatureAnnotationSet {
  schemaVersion: typeof PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION;
  annotationID: Phase0EntityID;
  catalogStableID: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  nativeGameLabel: Phase0CatalogNativeLabelReference;
  researcherAppliedMetadata: {
    taxonomyVersion: typeof PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION;
    face: Phase0FaceFeatureAnnotation;
    forehead: Phase0ForeheadFeatureAnnotation;
    temples: Phase0TemplesFeatureAnnotation;
    cheekbones: Phase0CheekboneFeatureAnnotation;
    jaw: Phase0JawFeatureAnnotation;
    chin: Phase0ChinFeatureAnnotation;
    eyes: Phase0EyesFeatureAnnotation;
    brows: Phase0BrowsFeatureAnnotation;
    nose: Phase0NoseFeatureAnnotation;
    mouth: Phase0MouthFeatureAnnotation;
    ears: Phase0EarsFeatureAnnotation;
    symmetry: Phase0SymmetryFeatureAnnotation;
    hairline: Phase0HairlineFeatureAnnotation;
    facialHairCoverage: Phase0FacialHairCoverageAnnotation;
  };
}

export interface Phase0FacialFeatureTaxonomyValidationIssue {
  code: "invalidSchemaVersion" | "missingNativeGameLabel" | "missingFeatureGroup" | "invalidMetric" | "prohibitedAnnotationField";
  message: string;
  path: string;
}

export interface Phase0FacialFeatureTaxonomyValidationReport {
  ok: boolean;
  errors: Phase0FacialFeatureTaxonomyValidationIssue[];
  warnings: Phase0FacialFeatureTaxonomyValidationIssue[];
}

export function createUnavailablePhase0FeatureMetric<TValue extends string | number | boolean | null>(value: TValue): Phase0FeatureMetric<TValue> {
  return {
    value,
    source: "unavailable",
    confidence: 0,
    evidenceFileIDs: []
  };
}

export function validatePhase0FacialFeatureAnnotationSet(annotation: Phase0FacialFeatureAnnotationSet): Phase0FacialFeatureTaxonomyValidationReport {
  const errors: Phase0FacialFeatureTaxonomyValidationIssue[] = [];
  if (annotation.schemaVersion !== PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION || annotation.researcherAppliedMetadata.taxonomyVersion !== PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION) {
    errors.push(issue("invalidSchemaVersion", "Facial-feature taxonomy version is not supported.", "schemaVersion"));
  }
  for (const [field, value] of [
    ["nativeCategoryLabel", annotation.nativeGameLabel.nativeCategoryLabel],
    ["visibleGameLabelOrIndex", annotation.nativeGameLabel.visibleGameLabelOrIndex],
    ["menuItemID", annotation.nativeGameLabel.menuItemID]
  ] as const) {
    if (!hasUsableText(value)) errors.push(issue("missingNativeGameLabel", `Native game label reference is missing ${field}.`, `nativeGameLabel.${field}`));
  }
  if (!Number.isInteger(annotation.nativeGameLabel.nativeOrder) || annotation.nativeGameLabel.nativeOrder < 1) {
    errors.push(issue("missingNativeGameLabel", "Native game label reference requires a positive native order.", "nativeGameLabel.nativeOrder"));
  }

  const metadata = annotation.researcherAppliedMetadata as unknown as Record<string, unknown>;
  for (const prohibitedKey of prohibitedFacialFeatureAnnotationKeys) {
    if (containsKeyDeep(metadata, prohibitedKey)) {
      errors.push(issue("prohibitedAnnotationField", `Researcher-applied metadata must not include ${prohibitedKey}.`, `researcherAppliedMetadata.${prohibitedKey}`));
    }
  }
  for (const group of phase0FacialFeatureGroups) {
    if (!metadata[group] || typeof metadata[group] !== "object") {
      errors.push(issue("missingFeatureGroup", `Researcher-applied metadata is missing ${group}.`, `researcherAppliedMetadata.${group}`));
      continue;
    }
    validateMetricTree(metadata[group], `researcherAppliedMetadata.${group}`, errors);
  }

  return { ok: errors.length === 0, errors, warnings: [] };
}

function validateMetricTree(value: unknown, path: string, errors: Phase0FacialFeatureTaxonomyValidationIssue[]) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (isMetric(child)) {
      if (!["measured", "researcherReviewed", "userConfirmed", "unavailable"].includes(child.source)) {
        errors.push(issue("invalidMetric", "Feature metric source is invalid.", `${childPath}.source`));
      }
      if (typeof child.confidence !== "number" || child.confidence < 0 || child.confidence > 1) {
        errors.push(issue("invalidMetric", "Feature metric confidence must be between 0 and 1.", `${childPath}.confidence`));
      }
      if (!Array.isArray(child.evidenceFileIDs)) {
        errors.push(issue("invalidMetric", "Feature metric evidenceFileIDs must be an array.", `${childPath}.evidenceFileIDs`));
      }
      if (child.source !== "unavailable" && Array.isArray(child.evidenceFileIDs) && child.evidenceFileIDs.length === 0) {
        errors.push(issue("invalidMetric", "Measured, reviewed, or user-confirmed feature metrics require evidence references.", `${childPath}.evidenceFileIDs`));
      }
    } else {
      validateMetricTree(child, childPath, errors);
    }
  }
}

function isMetric(value: unknown): value is Phase0FeatureMetric<unknown extends never ? never : string | number | boolean | null> {
  return Boolean(value && typeof value === "object" && "value" in value && "source" in value && "confidence" in value && "evidenceFileIDs" in value);
}

function containsKeyDeep(value: unknown, targetKey: string): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => key.toLowerCase() === targetKey.toLowerCase() || containsKeyDeep(child, targetKey));
}

function hasUsableText(value: string): boolean {
  return value.trim().length > 0;
}

function issue(
  code: Phase0FacialFeatureTaxonomyValidationIssue["code"],
  message: string,
  path: string
): Phase0FacialFeatureTaxonomyValidationIssue {
  return { code, message, path };
}
