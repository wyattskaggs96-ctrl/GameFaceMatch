import type { ISODateString } from "@/types/domain";
import {
  createEmptyPhase0AdminAuditLogSnapshot,
  recordPhase0AdminMaterialAction,
  type Phase0AdminAuditLogSnapshot,
  type Phase0AuditActor
} from "./phase-zero-admin-audit-log";
import type { Phase0EntityID, Phase0VerificationState } from "./phase-zero-domain";
import {
  createUnavailablePhase0FeatureMetric,
  PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION,
  phase0FacialFeatureGroups,
  validatePhase0FacialFeatureAnnotationSet,
  type Phase0AnnotationSource,
  type Phase0FacialFeatureAnnotationSet,
  type Phase0FacialFeatureGroup
} from "./phase-zero-facial-feature-taxonomy";

export const PHASE0_CATALOG_ANNOTATION_WORKSPACE_VERSION = "phase0-catalog-annotation-workspace-v1";

export const PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"] as const;

export type Phase0CatalogAnnotationViewID = (typeof PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS)[number] | "rear" | "elevated" | "lowered" | "menuEvidence";
export type Phase0AnnotationOverlayKind = "landmark" | "measurement" | "guide";
export type Phase0CatalogReviewerRole = "primaryResearcher" | "secondVerifier" | "catalogManager";
export type Phase0CatalogAnnotationReadinessStatus = "blocked" | "reviewReady" | "productionReady";

export interface Phase0CatalogAnnotationImageView {
  viewID: Phase0CatalogAnnotationViewID;
  evidenceFileID: Phase0EntityID;
  imageRelativePath: string;
  width: number;
  height: number;
  capturedAt: ISODateString;
  overlays: Phase0AnnotationOverlay[];
}

export interface Phase0AnnotationOverlay {
  overlayID: Phase0EntityID;
  kind: Phase0AnnotationOverlayKind;
  label: string;
  featureGroup: Phase0FacialFeatureGroup;
  confidence: number;
  points: Array<{ x: number; y: number }>;
  measurementValue: number | null;
  source: Phase0AnnotationSource;
}

export interface Phase0CatalogReviewerAnnotation {
  annotationVersionID: Phase0EntityID;
  reviewerID: Phase0EntityID;
  reviewerRole: Phase0CatalogReviewerRole;
  createdAt: ISODateString;
  notes: string;
  confidence: number;
  supportingViews: Phase0CatalogAnnotationViewID[];
  annotationSet: Phase0FacialFeatureAnnotationSet;
}

export interface Phase0InterReviewerDifference {
  path: string;
  primaryValue: string;
  secondaryValue: string;
}

export interface Phase0InterReviewerComparison {
  status: "notEnoughReviewers" | "compared";
  primaryReviewerID: Phase0EntityID | null;
  secondaryReviewerID: Phase0EntityID | null;
  comparedMetricCount: number;
  agreementCount: number;
  differenceCount: number;
  differences: Phase0InterReviewerDifference[];
}

export interface Phase0CatalogAnnotationWorkspace {
  schemaVersion: typeof PHASE0_CATALOG_ANNOTATION_WORKSPACE_VERSION;
  workspaceID: Phase0EntityID;
  catalogStableID: string;
  catalogVersionID: string;
  underlyingRecordVerificationState: Phase0VerificationState;
  nativeGameLabel: Phase0FacialFeatureAnnotationSet["nativeGameLabel"];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  imageViews: Phase0CatalogAnnotationImageView[];
  reviewerAnnotations: Phase0CatalogReviewerAnnotation[];
  auditTrail: Phase0AdminAuditLogSnapshot;
}

export interface Phase0CatalogAnnotationValidationIssue {
  code:
    | "missingWorkspaceID"
    | "missingCatalogStableID"
    | "recordNotVerified"
    | "missingRequiredView"
    | "invalidImageView"
    | "invalidOverlay"
    | "invalidReviewerAnnotation"
    | "missingSecondReviewer"
    | "invalidAuditTrail";
  message: string;
  path?: string;
}

export interface Phase0CatalogAnnotationValidationReport {
  ok: boolean;
  readinessStatus: Phase0CatalogAnnotationReadinessStatus;
  errors: Phase0CatalogAnnotationValidationIssue[];
  warnings: Phase0CatalogAnnotationValidationIssue[];
  missingRequiredViews: Phase0CatalogAnnotationViewID[];
  interReviewerComparison: Phase0InterReviewerComparison;
}

export function createCatalogAnnotationWorkspace({
  workspaceID,
  catalogStableID,
  catalogVersionID,
  underlyingRecordVerificationState,
  nativeGameLabel,
  nowISO
}: {
  workspaceID: Phase0EntityID;
  catalogStableID: string;
  catalogVersionID: string;
  underlyingRecordVerificationState: Phase0VerificationState;
  nativeGameLabel: Phase0FacialFeatureAnnotationSet["nativeGameLabel"];
  nowISO: ISODateString;
}): Phase0CatalogAnnotationWorkspace {
  return {
    schemaVersion: PHASE0_CATALOG_ANNOTATION_WORKSPACE_VERSION,
    workspaceID,
    catalogStableID,
    catalogVersionID,
    underlyingRecordVerificationState,
    nativeGameLabel,
    createdAt: nowISO,
    updatedAt: nowISO,
    imageViews: [],
    reviewerAnnotations: [],
    auditTrail: createEmptyPhase0AdminAuditLogSnapshot(nowISO)
  };
}

export async function addAnnotationImageView(
  workspace: Phase0CatalogAnnotationWorkspace,
  imageView: Phase0CatalogAnnotationImageView,
  actor: Phase0AuditActor,
  nowISO: ISODateString
): Promise<Phase0CatalogAnnotationWorkspace> {
  const imageViews = [...workspace.imageViews.filter((view) => view.viewID !== imageView.viewID), imageView].sort((a, b) => a.viewID.localeCompare(b.viewID));
  const auditResult = await recordPhase0AdminMaterialAction(workspace.auditTrail, {
    entryID: `${workspace.workspaceID}-${imageView.viewID}-evidence-${nowISO}`,
    occurredAt: nowISO,
    actor,
    action: "evidenceAssociation",
    target: { targetType: "evidenceFile", targetID: imageView.evidenceFileID },
    summary: `Associated ${imageView.viewID} evidence with ${workspace.catalogStableID}.`,
    reason: "Catalog annotation workspace requires view-specific evidence before review.",
    relatedEntityIDs: [workspace.catalogStableID],
    metadata: { viewID: imageView.viewID, workspaceID: workspace.workspaceID }
  });
  return {
    ...workspace,
    updatedAt: nowISO,
    imageViews,
    auditTrail: auditResult.snapshot
  };
}

export async function addReviewerAnnotation(
  workspace: Phase0CatalogAnnotationWorkspace,
  annotation: Phase0CatalogReviewerAnnotation,
  actor: Phase0AuditActor,
  nowISO: ISODateString
): Promise<Phase0CatalogAnnotationWorkspace> {
  const reviewerAnnotations = [...workspace.reviewerAnnotations.filter((item) => item.annotationVersionID !== annotation.annotationVersionID), annotation].sort((a, b) =>
    a.annotationVersionID.localeCompare(b.annotationVersionID)
  );
  const auditResult = await recordPhase0AdminMaterialAction(workspace.auditTrail, {
    entryID: `${workspace.workspaceID}-${annotation.annotationVersionID}-annotation-${nowISO}`,
    occurredAt: nowISO,
    actor,
    action: annotation.reviewerRole === "secondVerifier" ? "verification" : "edit",
    target: { targetType: "catalogRecord", targetID: workspace.catalogStableID },
    summary: `${annotation.reviewerRole} recorded annotation version ${annotation.annotationVersionID}.`,
    reason: "Catalog annotation review requires versioned reviewer notes, confidence, supporting views, and taxonomy metadata.",
    relatedEntityIDs: [annotation.annotationSet.annotationID, workspace.catalogVersionID],
    metadata: { reviewerRole: annotation.reviewerRole, workspaceID: workspace.workspaceID, confidence: annotation.confidence }
  });
  return {
    ...workspace,
    updatedAt: nowISO,
    reviewerAnnotations,
    auditTrail: auditResult.snapshot
  };
}

export function validateCatalogAnnotationWorkspace(workspace: Phase0CatalogAnnotationWorkspace): Phase0CatalogAnnotationValidationReport {
  const errors: Phase0CatalogAnnotationValidationIssue[] = [];
  const warnings: Phase0CatalogAnnotationValidationIssue[] = [];
  if (!workspace.workspaceID.trim()) errors.push(issue("missingWorkspaceID", "Annotation workspace requires a stable workspace ID.", "workspaceID"));
  if (!workspace.catalogStableID.trim()) errors.push(issue("missingCatalogStableID", "Annotation workspace requires a catalog stable ID.", "catalogStableID"));

  const missingRequiredViews = getMissingRequiredAnnotationViews(workspace);
  for (const viewID of missingRequiredViews) {
    warnings.push(issue("missingRequiredView", `${viewID} evidence is missing from the annotation workspace.`, `imageViews.${viewID}`));
  }
  for (const [index, view] of workspace.imageViews.entries()) {
    validateImageView(view, index, errors);
  }
  for (const [index, annotation] of workspace.reviewerAnnotations.entries()) {
    validateReviewerAnnotation(annotation, index, errors);
  }
  if (!hasPrimaryAndSecondReviewer(workspace)) {
    warnings.push(issue("missingSecondReviewer", "Production readiness requires both primary researcher and second verifier annotations.", "reviewerAnnotations"));
  }
  if (workspace.auditTrail.entries.length === 0) {
    warnings.push(issue("invalidAuditTrail", "Annotation workspace has no material action audit trail yet.", "auditTrail"));
  }

  const readinessBlockers: Phase0CatalogAnnotationValidationIssue[] = [];
  if (workspace.underlyingRecordVerificationState !== "verified") {
    readinessBlockers.push(issue("recordNotVerified", "Annotations cannot become production-ready until the underlying catalog record is verified.", "underlyingRecordVerificationState"));
  }
  if (missingRequiredViews.length > 0) {
    readinessBlockers.push(issue("missingRequiredView", "All required views must be present before annotation production readiness.", "imageViews"));
  }
  if (!hasPrimaryAndSecondReviewer(workspace)) {
    readinessBlockers.push(issue("missingSecondReviewer", "Primary and second-verifier annotations are required before production readiness.", "reviewerAnnotations"));
  }

  const comparison = compareReviewerAnnotations(workspace);
  const readinessStatus: Phase0CatalogAnnotationReadinessStatus =
    errors.length === 0 && readinessBlockers.length === 0 ? "productionReady" : errors.length === 0 && workspace.reviewerAnnotations.length > 0 ? "reviewReady" : "blocked";

  return {
    ok: errors.length === 0,
    readinessStatus,
    errors: [...errors, ...readinessBlockers],
    warnings,
    missingRequiredViews,
    interReviewerComparison: comparison
  };
}

export function getMissingRequiredAnnotationViews(workspace: Phase0CatalogAnnotationWorkspace): Phase0CatalogAnnotationViewID[] {
  const present = new Set(workspace.imageViews.map((view) => view.viewID));
  return PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS.filter((viewID) => !present.has(viewID));
}

export function compareReviewerAnnotations(workspace: Phase0CatalogAnnotationWorkspace): Phase0InterReviewerComparison {
  const primary = workspace.reviewerAnnotations.find((annotation) => annotation.reviewerRole === "primaryResearcher") ?? null;
  const secondary = workspace.reviewerAnnotations.find((annotation) => annotation.reviewerRole === "secondVerifier") ?? null;
  if (!primary || !secondary) {
    return {
      status: "notEnoughReviewers",
      primaryReviewerID: primary?.reviewerID ?? null,
      secondaryReviewerID: secondary?.reviewerID ?? null,
      comparedMetricCount: 0,
      agreementCount: 0,
      differenceCount: 0,
      differences: []
    };
  }

  const primaryMetrics = flattenMetricValues(primary.annotationSet.researcherAppliedMetadata);
  const secondaryMetrics = flattenMetricValues(secondary.annotationSet.researcherAppliedMetadata);
  const sharedPaths = Object.keys(primaryMetrics).filter((path) => path in secondaryMetrics).sort();
  const differences = sharedPaths
    .filter((path) => primaryMetrics[path] !== secondaryMetrics[path])
    .map((path) => ({ path, primaryValue: primaryMetrics[path], secondaryValue: secondaryMetrics[path] }));

  return {
    status: "compared",
    primaryReviewerID: primary.reviewerID,
    secondaryReviewerID: secondary.reviewerID,
    comparedMetricCount: sharedPaths.length,
    agreementCount: sharedPaths.length - differences.length,
    differenceCount: differences.length,
    differences
  };
}

export function createDraftFacialFeatureAnnotationSet({
  annotationID,
  catalogStableID,
  nativeGameLabel,
  nowISO
}: {
  annotationID: Phase0EntityID;
  catalogStableID: string;
  nativeGameLabel: Phase0FacialFeatureAnnotationSet["nativeGameLabel"];
  nowISO: ISODateString;
}): Phase0FacialFeatureAnnotationSet {
  return {
    schemaVersion: PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION,
    annotationID,
    catalogStableID,
    createdAt: nowISO,
    updatedAt: nowISO,
    nativeGameLabel,
    researcherAppliedMetadata: {
      taxonomyVersion: PHASE0_FACIAL_FEATURE_TAXONOMY_VERSION,
      face: {
        widthRatio: unavailableNumber(),
        lengthRatio: unavailableNumber(),
        widthClass: createUnavailablePhase0FeatureMetric("unknown"),
        lengthClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      forehead: {
        widthRatio: unavailableNumber(),
        heightRatio: unavailableNumber(),
        widthClass: createUnavailablePhase0FeatureMetric("unknown"),
        heightClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      temples: {
        widthRatio: unavailableNumber(),
        taperClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      cheekbones: {
        widthRatio: unavailableNumber(),
        prominenceClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      jaw: {
        widthRatio: unavailableNumber(),
        angleClass: createUnavailablePhase0FeatureMetric("unknown"),
        taperClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      chin: {
        widthRatio: unavailableNumber(),
        lengthRatio: unavailableNumber(),
        projectionClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      eyes: {
        spacingRatio: unavailableNumber(),
        meanEyeWidthRatio: unavailableNumber(),
        tiltClass: createUnavailablePhase0FeatureMetric("unknown"),
        opennessClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      brows: {
        thicknessClass: createUnavailablePhase0FeatureMetric("unknown"),
        positionRatio: unavailableNumber(),
        archClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      nose: {
        widthRatio: unavailableNumber(),
        lengthRatio: unavailableNumber(),
        bridgeClass: createUnavailablePhase0FeatureMetric("unknown"),
        projectionClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      mouth: {
        widthRatio: unavailableNumber(),
        fullnessClass: createUnavailablePhase0FeatureMetric("unknown"),
        cornerTiltClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      ears: {
        visibilityClass: createUnavailablePhase0FeatureMetric("unknown"),
        sizeClass: createUnavailablePhase0FeatureMetric("unknown"),
        protrusionClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      symmetry: {
        leftRightDifferenceRatio: unavailableNumber(),
        reviewClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      hairline: {
        positionClass: createUnavailablePhase0FeatureMetric("unknown"),
        contourClass: createUnavailablePhase0FeatureMetric("unknown"),
        visibleCoverageClass: createUnavailablePhase0FeatureMetric("unknown")
      },
      facialHairCoverage: {
        upperLipCoverage: createUnavailablePhase0FeatureMetric("unknown"),
        chinCoverage: createUnavailablePhase0FeatureMetric("unknown"),
        cheekCoverage: createUnavailablePhase0FeatureMetric("unknown"),
        jawCoverage: createUnavailablePhase0FeatureMetric("unknown"),
        sideburnCoverage: createUnavailablePhase0FeatureMetric("unknown"),
        densityClass: createUnavailablePhase0FeatureMetric("unknown")
      }
    }
  };
}

function validateImageView(view: Phase0CatalogAnnotationImageView, index: number, errors: Phase0CatalogAnnotationValidationIssue[]) {
  if (!view.evidenceFileID.trim() || !view.imageRelativePath.trim()) {
    errors.push(issue("invalidImageView", "Image view requires evidence ID and relative path.", `imageViews.${index}`));
  }
  if (!Number.isFinite(view.width) || !Number.isFinite(view.height) || view.width <= 0 || view.height <= 0) {
    errors.push(issue("invalidImageView", "Image view dimensions must be positive numbers.", `imageViews.${index}`));
  }
  for (const [overlayIndex, overlay] of view.overlays.entries()) {
    if (!overlay.overlayID.trim() || !overlay.label.trim() || !phase0FacialFeatureGroups.includes(overlay.featureGroup)) {
      errors.push(issue("invalidOverlay", "Overlay requires ID, label, and controlled feature group.", `imageViews.${index}.overlays.${overlayIndex}`));
    }
    if (typeof overlay.confidence !== "number" || overlay.confidence < 0 || overlay.confidence > 1) {
      errors.push(issue("invalidOverlay", "Overlay confidence must be between 0 and 1.", `imageViews.${index}.overlays.${overlayIndex}.confidence`));
    }
  }
}

function validateReviewerAnnotation(annotation: Phase0CatalogReviewerAnnotation, index: number, errors: Phase0CatalogAnnotationValidationIssue[]) {
  if (!annotation.annotationVersionID.trim() || !annotation.reviewerID.trim() || !annotation.notes.trim()) {
    errors.push(issue("invalidReviewerAnnotation", "Reviewer annotation requires version ID, reviewer ID, and notes.", `reviewerAnnotations.${index}`));
  }
  if (typeof annotation.confidence !== "number" || annotation.confidence < 0 || annotation.confidence > 1) {
    errors.push(issue("invalidReviewerAnnotation", "Reviewer confidence must be between 0 and 1.", `reviewerAnnotations.${index}.confidence`));
  }
  if (annotation.supportingViews.length === 0) {
    errors.push(issue("invalidReviewerAnnotation", "Reviewer annotation requires at least one supporting view.", `reviewerAnnotations.${index}.supportingViews`));
  }
  const taxonomyReport = validatePhase0FacialFeatureAnnotationSet(annotation.annotationSet);
  for (const taxonomyError of taxonomyReport.errors) {
    errors.push(issue("invalidReviewerAnnotation", taxonomyError.message, `reviewerAnnotations.${index}.${taxonomyError.path}`));
  }
}

function hasPrimaryAndSecondReviewer(workspace: Phase0CatalogAnnotationWorkspace) {
  return (
    workspace.reviewerAnnotations.some((annotation) => annotation.reviewerRole === "primaryResearcher") &&
    workspace.reviewerAnnotations.some((annotation) => annotation.reviewerRole === "secondVerifier")
  );
}

function flattenMetricValues(value: unknown, path = "researcherAppliedMetadata"): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const output: Record<string, string> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`;
    if (child && typeof child === "object" && "value" in child) {
      output[childPath] = String((child as { value: unknown }).value);
    } else {
      Object.assign(output, flattenMetricValues(child, childPath));
    }
  }
  return output;
}

function unavailableNumber() {
  return createUnavailablePhase0FeatureMetric<number | null>(null);
}

function issue(
  code: Phase0CatalogAnnotationValidationIssue["code"],
  message: string,
  path?: string
): Phase0CatalogAnnotationValidationIssue {
  return { code, message, path };
}
