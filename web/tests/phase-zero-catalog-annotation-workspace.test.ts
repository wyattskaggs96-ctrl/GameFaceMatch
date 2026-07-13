import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addAnnotationImageView,
  addReviewerAnnotation,
  compareReviewerAnnotations,
  createCatalogAnnotationWorkspace,
  createDraftFacialFeatureAnnotationSet,
  getMissingRequiredAnnotationViews,
  PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS,
  PHASE0_CATALOG_ANNOTATION_WORKSPACE_VERSION,
  validateCatalogAnnotationWorkspace,
  type Phase0CatalogAnnotationImageView,
  type Phase0CatalogAnnotationWorkspace,
  type Phase0CatalogReviewerAnnotation
} from "@/lib/phase-zero/phase-zero-catalog-annotation-workspace";
import type { Phase0AuditActor } from "@/lib/phase-zero/phase-zero-admin-audit-log";
import type { Phase0FacialFeatureAnnotationSet } from "@/lib/phase-zero/phase-zero-facial-feature-taxonomy";

const now = "2026-07-13T00:00:00.000Z";
const testOnlyCatalogID = "TEST_ONLY_CATALOG_RECORD_NOT_PRODUCTION";

describe("Phase 0 catalog annotation workspace", () => {
  it("ships schema coverage for multi-view images, overlays, reviewers, versions, and audit trail", () => {
    const schema = readSchema();
    expect(schema.title).toBe("Phase0CatalogAnnotationWorkspace");
    expect(schema.properties.schemaVersion.const).toBe(PHASE0_CATALOG_ANNOTATION_WORKSPACE_VERSION);
    expect(schema.required).toEqual(expect.arrayContaining(["imageViews", "reviewerAnnotations", "auditTrail"]));
    expect(schema.$defs.imageView.required).toEqual(expect.arrayContaining(["viewID", "evidenceFileID", "imageRelativePath", "overlays"]));
    expect(schema.$defs.overlay.properties.featureGroup.enum).toEqual(expect.arrayContaining(["face", "jaw", "nose", "facialHairCoverage"]));
    expect(schema.$defs.reviewerAnnotation.required).toEqual(expect.arrayContaining(["annotationVersionID", "notes", "confidence", "supportingViews", "annotationSet"]));
  });

  it("blocks production readiness until the underlying catalog record is verified", async () => {
    let workspace = await completeWorkspace("firstReviewPending");
    let report = validateCatalogAnnotationWorkspace(workspace);
    expect(report.ok).toBe(true);
    expect(report.readinessStatus).toBe("reviewReady");
    expect(report.errors.map((error) => error.code)).toContain("recordNotVerified");

    workspace = { ...workspace, underlyingRecordVerificationState: "verified" };
    report = validateCatalogAnnotationWorkspace(workspace);
    expect(report.errors).toEqual([]);
    expect(report.readinessStatus).toBe("productionReady");
  });

  it("reports missing required views before annotation review can complete", () => {
    const workspace = createWorkspace("verified");
    const report = validateCatalogAnnotationWorkspace(workspace);
    expect(getMissingRequiredAnnotationViews(workspace)).toEqual(PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS);
    expect(report.warnings.map((warning) => warning.code)).toContain("missingRequiredView");
    expect(report.errors.map((error) => error.code)).toContain("missingRequiredView");
    expect(report.readinessStatus).toBe("blocked");
  });

  it("supports image overlays, reviewer confidence, supporting views, versioning, and audit trail", async () => {
    let workspace = createWorkspace("verified");
    workspace = await addAllViews(workspace);
    workspace = await addReviewerAnnotation(workspace, reviewerAnnotation("annotation-primary-v1", "primaryResearcher", 0.82), actor("primary", "primaryResearcher"), now);

    const report = validateCatalogAnnotationWorkspace(workspace);
    expect(report.ok).toBe(true);
    expect(report.readinessStatus).toBe("reviewReady");
    expect(workspace.imageViews[0].overlays[0]).toMatchObject({ kind: "measurement", featureGroup: "face", measurementValue: 0.72 });
    expect(workspace.reviewerAnnotations[0]).toMatchObject({
      annotationVersionID: "annotation-primary-v1",
      confidence: 0.82,
      supportingViews: ["straightOn", "left45"]
    });
    expect(workspace.auditTrail.entries.map((entry) => entry.action)).toEqual([
      "evidenceAssociation",
      "evidenceAssociation",
      "evidenceAssociation",
      "evidenceAssociation",
      "evidenceAssociation",
      "edit"
    ]);
  });

  it("compares primary and second verifier taxonomy annotations", async () => {
    let workspace = await completeWorkspace("verified");
    const comparison = compareReviewerAnnotations(workspace);
    expect(comparison.status).toBe("compared");
    expect(comparison.primaryReviewerID).toBe("primary-reviewer");
    expect(comparison.secondaryReviewerID).toBe("second-reviewer");
    expect(comparison.comparedMetricCount).toBeGreaterThan(0);
    expect(comparison.differenceCount).toBeGreaterThan(0);
    expect(comparison.differences.map((difference) => difference.path)).toContain("researcherAppliedMetadata.face.widthClass");
  });

  it("rejects invalid reviewer annotations and invalid overlay confidence", async () => {
    let workspace = createWorkspace("verified");
    workspace = await addAnnotationImageView(workspace, { ...imageView("straightOn"), overlays: [{ ...imageView("straightOn").overlays[0], confidence: 2 }] }, actor("custodian", "evidenceCustodian"), now);
    workspace = {
      ...workspace,
      reviewerAnnotations: [
        {
          ...reviewerAnnotation("bad-annotation", "primaryResearcher", 1.2),
          notes: "",
          supportingViews: []
        }
      ]
    };

    const report = validateCatalogAnnotationWorkspace(workspace);
    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["invalidOverlay", "invalidReviewerAnnotation"]));
  });
});

function readSchema() {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/catalog-annotation-workspace.schema.json"), "utf8"));
}

function createWorkspace(verificationState: Phase0CatalogAnnotationWorkspace["underlyingRecordVerificationState"]) {
  return createCatalogAnnotationWorkspace({
    workspaceID: "annotation-workspace-synthetic",
    catalogStableID: testOnlyCatalogID,
    catalogVersionID: "catalog-version-synthetic",
    underlyingRecordVerificationState: verificationState,
    nativeGameLabel: nativeLabel(),
    nowISO: now
  });
}

async function completeWorkspace(verificationState: Phase0CatalogAnnotationWorkspace["underlyingRecordVerificationState"]) {
  let workspace = createWorkspace(verificationState);
  workspace = await addAllViews(workspace);
  workspace = await addReviewerAnnotation(workspace, reviewerAnnotation("annotation-primary-v1", "primaryResearcher", 0.82), actor("primary", "primaryResearcher"), now);
  workspace = await addReviewerAnnotation(workspace, reviewerAnnotation("annotation-second-v1", "secondVerifier", 0.78, "wide"), actor("second", "secondVerifier"), "2026-07-13T00:00:01.000Z");
  return workspace;
}

async function addAllViews(workspace: Phase0CatalogAnnotationWorkspace) {
  let next = workspace;
  for (const viewID of PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS) {
    next = await addAnnotationImageView(next, imageView(viewID), actor("custodian", "evidenceCustodian"), `2026-07-13T00:00:0${next.imageViews.length}.000Z`);
  }
  return next;
}

function imageView(viewID: (typeof PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS)[number]): Phase0CatalogAnnotationImageView {
  return {
    viewID,
    evidenceFileID: `evidence-${viewID}`,
    imageRelativePath: `data/audit/college-football-27/evidence/derivatives/${viewID}.png`,
    width: 1200,
    height: 1600,
    capturedAt: now,
    overlays: [
      {
        overlayID: `overlay-${viewID}`,
        kind: "measurement",
        label: "Synthetic face width ratio",
        featureGroup: "face",
        confidence: 0.8,
        points: [
          { x: 0.25, y: 0.4 },
          { x: 0.75, y: 0.4 }
        ],
        measurementValue: 0.72,
        source: "measured"
      }
    ]
  };
}

function reviewerAnnotation(
  annotationVersionID: string,
  reviewerRole: Phase0CatalogReviewerAnnotation["reviewerRole"],
  confidence: number,
  faceWidthClass = "medium"
): Phase0CatalogReviewerAnnotation {
  const annotationSet = createDraftFacialFeatureAnnotationSet({
    annotationID: `${annotationVersionID}-set`,
    catalogStableID: testOnlyCatalogID,
    nativeGameLabel: nativeLabel(),
    nowISO: now
  });
  annotationSet.researcherAppliedMetadata.face.widthClass = {
    value: faceWidthClass as never,
    source: "researcherReviewed",
    confidence: 0.8,
    evidenceFileIDs: ["evidence-straightOn"]
  };
  annotationSet.researcherAppliedMetadata.jaw.angleClass = {
    value: "medium",
    source: "researcherReviewed",
    confidence: 0.7,
    evidenceFileIDs: ["evidence-leftProfile", "evidence-rightProfile"]
  };
  return {
    annotationVersionID,
    reviewerID: reviewerRole === "secondVerifier" ? "second-reviewer" : "primary-reviewer",
    reviewerRole,
    createdAt: now,
    notes: "Synthetic reviewer note for catalog annotation workspace testing.",
    confidence,
    supportingViews: ["straightOn", "left45"],
    annotationSet: annotationSet as Phase0FacialFeatureAnnotationSet
  };
}

function nativeLabel() {
  return {
    nativeCategoryLabel: "SYNTHETIC_NATIVE_CATEGORY_TEST_ONLY",
    visibleGameLabelOrIndex: "SYNTHETIC_VISIBLE_LABEL_TEST_ONLY",
    nativeOrder: 1,
    menuItemID: "menu-synthetic"
  };
}

function actor(actorID: string, role: Phase0AuditActor["roles"][number]): Phase0AuditActor {
  return {
    actorID,
    roles: [role]
  };
}
