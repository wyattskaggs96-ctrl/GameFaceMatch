"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, ProgressBar, ScreenHeader, SelectField, StatusBadge, TextField } from "@/components/design-system";
import type { Phase0AuditActor } from "@/lib/phase-zero/phase-zero-admin-audit-log";
import {
  addAnnotationImageView,
  addReviewerAnnotation,
  createCatalogAnnotationWorkspace,
  createDraftFacialFeatureAnnotationSet,
  PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS,
  validateCatalogAnnotationWorkspace,
  type Phase0CatalogAnnotationImageView,
  type Phase0CatalogAnnotationViewID,
  type Phase0CatalogAnnotationWorkspace as AnnotationWorkspace,
  type Phase0CatalogReviewerAnnotation,
  type Phase0CatalogReviewerRole
} from "@/lib/phase-zero/phase-zero-catalog-annotation-workspace";
import { createCatalogImageMeasurementReport } from "@/lib/phase-zero/phase-zero-catalog-image-measurement";
import type { Phase0OrdinalAngle, Phase0OrdinalWidth } from "@/lib/phase-zero/phase-zero-facial-feature-taxonomy";

const now = () => new Date().toISOString();

const viewLabels: Record<Phase0CatalogAnnotationViewID, string> = {
  straightOn: "Straight-on",
  left45: "Left 45",
  right45: "Right 45",
  leftProfile: "Left profile",
  rightProfile: "Right profile",
  rear: "Rear",
  elevated: "Elevated",
  lowered: "Lowered",
  menuEvidence: "Menu evidence"
};

export function CatalogAnnotationWorkspace() {
  const [workspace, setWorkspace] = useState<AnnotationWorkspace>(() =>
    createCatalogAnnotationWorkspace({
      workspaceID: "phase-zero-local-annotation-workspace",
      catalogStableID: "TEST_ONLY_CATALOG_RECORD_NOT_PRODUCTION",
      catalogVersionID: "catalog-draft-local",
      underlyingRecordVerificationState: "firstReviewPending",
      nativeGameLabel: {
        nativeCategoryLabel: "SYNTHETIC_NATIVE_CATEGORY_TEST_ONLY",
        visibleGameLabelOrIndex: "SYNTHETIC_VISIBLE_LABEL_TEST_ONLY",
        nativeOrder: 1,
        menuItemID: "menu-synthetic-local"
      },
      nowISO: now()
    })
  );
  const [reviewerRole, setReviewerRole] = useState<Exclude<Phase0CatalogReviewerRole, "catalogManager">>("primaryResearcher");
  const [reviewerID, setReviewerID] = useState("primary-researcher-local");
  const [notes, setNotes] = useState("Local annotation draft; not production data.");
  const [confidence, setConfidence] = useState("0.75");
  const [faceWidthClass, setFaceWidthClass] = useState<Phase0OrdinalWidth>("medium");
  const [jawAngleClass, setJawAngleClass] = useState<Phase0OrdinalAngle>("medium");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const validation = useMemo(() => validateCatalogAnnotationWorkspace(workspace), [workspace]);
  const measurementReport = useMemo(
    () =>
      createCatalogImageMeasurementReport({
        catalogStableID: workspace.catalogStableID,
        catalogVersionID: workspace.catalogVersionID,
        createdAt: workspace.updatedAt,
        imageViews: workspace.imageViews.map((view) => ({
          ...view,
          faceLandmarkReport: null,
          manualFaceRegion: null
        }))
      }),
    [workspace]
  );
  const completedViews = PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS.length - validation.missingRequiredViews.length;

  async function attachSyntheticViewSet() {
    let next = workspace;
    for (const viewID of PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS) {
      next = await addAnnotationImageView(next, createImageView(viewID), actor("evidence-custodian-local", "evidenceCustodian"), now());
    }
    setWorkspace(next);
    setStatusMessage("Attached local synthetic evidence references for all required views.");
  }

  async function saveReviewerAnnotation() {
    const createdAt = now();
    const annotationSet = createDraftFacialFeatureAnnotationSet({
      annotationID: `${workspace.workspaceID}-${reviewerRole}-${workspace.reviewerAnnotations.length + 1}`,
      catalogStableID: workspace.catalogStableID,
      nativeGameLabel: workspace.nativeGameLabel,
      nowISO: createdAt
    });
    annotationSet.researcherAppliedMetadata.face.widthClass = {
      value: faceWidthClass,
      source: "researcherReviewed",
      confidence: normalizedConfidence(),
      evidenceFileIDs: ["evidence-straightOn"]
    };
    annotationSet.researcherAppliedMetadata.jaw.angleClass = {
      value: jawAngleClass,
      source: "researcherReviewed",
      confidence: normalizedConfidence(),
      evidenceFileIDs: ["evidence-leftProfile", "evidence-rightProfile"]
    };
    const annotation: Phase0CatalogReviewerAnnotation = {
      annotationVersionID: `${reviewerRole}-annotation-v${workspace.reviewerAnnotations.filter((item) => item.reviewerRole === reviewerRole).length + 1}`,
      reviewerID,
      reviewerRole,
      createdAt,
      notes,
      confidence: normalizedConfidence(),
      supportingViews: ["straightOn", "left45", "right45"],
      annotationSet
    };
    const next = await addReviewerAnnotation(workspace, annotation, actor(reviewerID, reviewerRole), createdAt);
    setWorkspace(next);
    setStatusMessage(`Saved ${reviewerRole} annotation ${annotation.annotationVersionID}.`);
  }

  function markUnderlyingRecordVerified() {
    setWorkspace((current) => ({
      ...current,
      underlyingRecordVerificationState: "verified",
      updatedAt: now()
    }));
    setStatusMessage("Underlying record marked verified for local readiness preview. This does not publish production catalog data.");
  }

  function normalizedConfidence() {
    const value = Number(confidence);
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 1);
  }

  return (
    <section className="screen-stack" aria-labelledby="catalog-annotation-title">
      <ScreenHeader eyebrow="Development-only annotation" title="Catalog annotation workspace" id="catalog-annotation-title">
        <p>
          Review verified catalog imagery across multiple views, add controlled taxonomy metadata, compare reviewers, and retain a local audit trail.
          Draft annotations cannot become production-ready while the underlying catalog record is unverified.
        </p>
      </ScreenHeader>
      <Alert title="Production guard" tone={validation.readinessStatus === "productionReady" ? "success" : "warning"}>
        {validation.readinessStatus === "productionReady"
          ? "Annotation package is locally ready for publication review."
          : "Annotation package remains blocked or review-only until record verification, required views, and reviewer checks pass."}
      </Alert>

      <div className="card-grid">
        <Card tone={workspace.underlyingRecordVerificationState === "verified" ? "success" : "warning"}>
          <div className="status-row">
            <h2>Catalog record</h2>
            <StatusBadge tone={workspace.underlyingRecordVerificationState === "verified" ? "success" : "warning"}>
              {workspace.underlyingRecordVerificationState}
            </StatusBadge>
          </div>
          <dl className="metadata-list">
            <div>
              <dt>Stable ID</dt>
              <dd>{workspace.catalogStableID}</dd>
            </div>
            <div>
              <dt>Catalog version</dt>
              <dd>{workspace.catalogVersionID}</dd>
            </div>
            <div>
              <dt>Native label/index</dt>
              <dd>{workspace.nativeGameLabel.visibleGameLabelOrIndex}</dd>
            </div>
            <div>
              <dt>Research metadata</dt>
              <dd>Stored separately from native game labels</dd>
            </div>
          </dl>
          <Button variant="secondary" onClick={markUnderlyingRecordVerified}>
            Mark underlying record verified locally
          </Button>
        </Card>
        <Card tone={validation.missingRequiredViews.length === 0 ? "success" : "warning"}>
          <h2>Required views</h2>
          <ProgressBar value={completedViews} max={PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS.length} label="Required views present" />
          <p className="supporting">Missing: {validation.missingRequiredViews.map((viewID) => viewLabels[viewID]).join(", ") || "None"}</p>
          <Button onClick={attachSyntheticViewSet}>Attach local synthetic view references</Button>
        </Card>
        <Card>
          <h2>Reviewer comparison</h2>
          <dl className="metadata-list">
            <div>
              <dt>Status</dt>
              <dd>{validation.interReviewerComparison.status}</dd>
            </div>
            <div>
              <dt>Compared metrics</dt>
              <dd>{validation.interReviewerComparison.comparedMetricCount}</dd>
            </div>
            <div>
              <dt>Differences</dt>
              <dd>{validation.interReviewerComparison.differenceCount}</dd>
            </div>
          </dl>
        </Card>
        <Card tone={measurementReport.readyForAnnotationReview ? "success" : "warning"}>
          <h2>Measurement pipeline</h2>
          <dl className="metadata-list">
            <div>
              <dt>Local ratios available</dt>
              <dd>{Object.values(measurementReport.measurements).filter((measurement) => measurement?.availabilityState === "available").length}</dd>
            </div>
            <div>
              <dt>Failure states</dt>
              <dd>{measurementReport.failureMessages.length}</dd>
            </div>
            <div>
              <dt>Production-ready</dt>
              <dd>{measurementReport.readyForProductionCatalog ? "Yes" : "No"}</dd>
            </div>
          </dl>
          <p className="supporting">
            The pipeline calculates explainable normalized ratios only when local landmarks are reliable. Human corrections are versioned inputs, not
            automatic game facts.
          </p>
        </Card>
      </div>

      <Card>
        <h2>Multi-view image display</h2>
        <div className="result-grid">
          {PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS.map((viewID) => {
            const view = workspace.imageViews.find((imageView) => imageView.viewID === viewID);
            return (
              <div className="capture-review-slot" key={viewID}>
                <div className="status-row">
                  <h3>{viewLabels[viewID]}</h3>
                  <StatusBadge tone={view ? "success" : "warning"}>{view ? "present" : "missing"}</StatusBadge>
                </div>
                <div className="empty-state" role="img" aria-label={`${viewLabels[viewID]} catalog evidence preview`}>
                  <p className="supporting">{view?.imageRelativePath ?? "Attach local evidence reference"}</p>
                  {view?.overlays.map((overlay) => (
                    <span className="status-badge status-info" key={overlay.overlayID}>
                      {overlay.kind}: {overlay.label} ({overlay.confidence})
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2>Controlled taxonomy values</h2>
        <div className="form-grid">
          <SelectField label="Reviewer role" value={reviewerRole} onChange={(event) => setReviewerRole(event.currentTarget.value as typeof reviewerRole)}>
            <option value="primaryResearcher">Primary researcher</option>
            <option value="secondVerifier">Second verifier</option>
          </SelectField>
          <TextField label="Reviewer ID" value={reviewerID} onChange={(event) => setReviewerID(event.currentTarget.value)} />
          <TextField label="Confidence" type="number" min="0" max="1" step="0.05" value={confidence} onChange={(event) => setConfidence(event.currentTarget.value)} />
          <SelectField label="Face width class" value={faceWidthClass} onChange={(event) => setFaceWidthClass(event.currentTarget.value as Phase0OrdinalWidth)}>
            {["unknown", "veryNarrow", "narrow", "medium", "wide", "veryWide"].map((value) => <option key={value} value={value}>{value}</option>)}
          </SelectField>
          <SelectField label="Jaw angle class" value={jawAngleClass} onChange={(event) => setJawAngleClass(event.currentTarget.value as Phase0OrdinalAngle)}>
            {["unknown", "low", "medium", "high"].map((value) => <option key={value} value={value}>{value}</option>)}
          </SelectField>
        </div>
        <label className="form-field" htmlFor="catalog-annotation-notes">
          <span>Reviewer notes</span>
          <textarea id="catalog-annotation-notes" rows={3} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
        </label>
        <Button onClick={saveReviewerAnnotation}>Save reviewer annotation</Button>
        {statusMessage ? <Alert title="Workspace update" tone="info">{statusMessage}</Alert> : null}
      </Card>

      <div className="result-grid">
        <Card>
          <h2>Annotation versions</h2>
          <ul className="compact-list">
            {workspace.reviewerAnnotations.map((annotation) => (
              <li key={annotation.annotationVersionID}>
                <strong>{annotation.annotationVersionID}</strong> · {annotation.reviewerRole} · confidence {annotation.confidence}
                <br />
                Supporting views: {annotation.supportingViews.map((viewID) => viewLabels[viewID]).join(", ")}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2>Audit trail</h2>
          <ul className="compact-list">
            {workspace.auditTrail.entries.map((entry) => (
              <li key={entry.entryID}>{entry.occurredAt}: {entry.action} by {entry.actor.actorID}</li>
            ))}
          </ul>
        </Card>
        <Card tone={validation.errors.length === 0 ? "success" : "danger"}>
          <h2>Readiness blockers</h2>
          <ul className="compact-list">
            {[...validation.errors, ...validation.warnings].map((item) => (
              <li key={`${item.code}-${item.path ?? item.message}`}>{item.message}</li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function createImageView(viewID: (typeof PHASE0_CATALOG_ANNOTATION_REQUIRED_VIEWS)[number]): Phase0CatalogAnnotationImageView {
  return {
    viewID,
    evidenceFileID: `evidence-${viewID}`,
    imageRelativePath: `data/audit/college-football-27/evidence/derivatives/${viewID}.png`,
    width: 1200,
    height: 1600,
    capturedAt: now(),
    overlays: [
      {
        overlayID: `overlay-${viewID}-face-width`,
        kind: "measurement",
        label: "Face width guide",
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

function actor(actorID: string, role: Phase0AuditActor["roles"][number]): Phase0AuditActor {
  return { actorID, roles: [role] };
}
