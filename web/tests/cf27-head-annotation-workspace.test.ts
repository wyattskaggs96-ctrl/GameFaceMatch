import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Root research scripts are ESM Node modules without TypeScript declarations.
import { applyHeadAnnotationRevision, buildHeadAnnotationWorkspacePackage, CF27_HEAD_ANNOTATION_WORKSPACE_SCHEMA_VERSION, writeHeadAnnotationWorkspaceOutputs } from "../../scripts/cf27-head-annotation-workspace.mjs";

let temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  temporaryRoots = [];
});

describe("CF27 head annotation workspace", () => {
  it("populates research-only head workspaces while separating native labels, automated context, and human annotations", () => {
    const root = createFixtureRepository();
    const workspacePackage = buildHeadAnnotationWorkspacePackage(fixtureOptions(root));

    expect(workspacePackage.schemaVersion).toBe(CF27_HEAD_ANNOTATION_WORKSPACE_SCHEMA_VERSION);
    expect(workspacePackage.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(workspacePackage.productionRecommendationsEnabled).toBe(false);
    expect(workspacePackage.summary.workspaceCount).toBe(2);
    expect(workspacePackage.summary.recordsProductionVerified).toBe(0);

    const first = workspacePackage.workspaces[0];
    expect(first.catalogStableID).toBe("CF27_XBOXUNKNOWN_RTG_HEAD_001");
    expect(first.nativeGameLabelReference.visibleGameLabelOrIndex).toBe("Face 1");
    expect(first.sourceClassification).toMatchObject({
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationState: "NOT_VERIFIED",
      readyForProductionCatalog: false
    });
    expect(first.automatedMeasurementContext.available).toBe(true);
    expect(first.automatedMeasurementContext.measurements.faceWidthToHeightRatio.value).toBe(0.72);
    expect(first.humanAnnotations.current).toEqual([]);
    expect(first.humanAnnotations.annotationTemplate.controlledFields).toHaveProperty("faceWidth");
    expect(first.humanAnnotations.annotationTemplate.controlledFields).toHaveProperty("occlusion");
  });

  it("requires reviewer identity before a human annotation revision can be recorded", () => {
    const root = createFixtureRepository();
    const workspace = buildHeadAnnotationWorkspacePackage(fixtureOptions(root)).workspaces[0];

    expect(() =>
      applyHeadAnnotationRevision(workspace, {
        reviewer: { reviewerID: "", reviewerDisplayName: "Reviewer", reviewerRole: "primaryResearcher" },
        reason: "Initial review",
        confidence: 0.8,
        annotationFields: {}
      })
    ).toThrow(/reviewerID/);
  });

  it("preserves annotation history and does not mark a record production verified", () => {
    const root = createFixtureRepository();
    const workspace = buildHeadAnnotationWorkspacePackage(fixtureOptions(root)).workspaces[0];
    const firstRevision = applyHeadAnnotationRevision(workspace, {
      reviewer: { reviewerID: "reviewer-001", reviewerDisplayName: "Primary Reviewer", reviewerRole: "primaryResearcher" },
      reason: "Initial objective review",
      supportingViews: ["straightOn"],
      confidence: 0.7,
      annotationFields: {
        faceWidth: {
          reviewState: "VISIBLE_LIMITED",
          value: "medium",
          confidence: 0.7,
          supportingViews: ["straightOn"],
          notes: "Synthetic fixture note.",
          evidenceFileIDs: ["frame-head-001-front"]
        }
      }
    }, "2026-07-13T12:00:00.000Z");
    const secondRevision = applyHeadAnnotationRevision(firstRevision, {
      reviewer: { reviewerID: "reviewer-001", reviewerDisplayName: "Primary Reviewer", reviewerRole: "primaryResearcher" },
      reason: "Rechecked supporting view",
      supportingViews: ["straightOn", "left45"],
      confidence: 0.75,
      annotationFields: {
        faceWidth: {
          reviewState: "VISIBLE",
          value: "medium",
          confidence: 0.75,
          supportingViews: ["straightOn", "left45"],
          notes: "Synthetic fixture note after recheck.",
          evidenceFileIDs: ["frame-head-001-front", "frame-head-001-left-3q"]
        }
      }
    }, "2026-07-13T12:05:00.000Z");

    expect(secondRevision.humanAnnotations.current).toHaveLength(1);
    expect(secondRevision.humanAnnotations.history).toHaveLength(2);
    expect(secondRevision.humanAnnotations.history[1].previousAnnotationSnapshot).toHaveLength(1);
    expect(secondRevision.sourceClassification.verificationState).toBe("NOT_VERIFIED");
    expect(secondRevision.sourceClassification.readyForProductionCatalog).toBe(false);
    expect(secondRevision.annotationReadiness.blockers.join(" ")).toContain("not second-person verified");
  });

  it("rejects production output directories for generated research workspaces", () => {
    const root = createFixtureRepository();
    const workspacePackage = buildHeadAnnotationWorkspacePackage(fixtureOptions(root));

    expect(() =>
      writeHeadAnnotationWorkspaceOutputs(workspacePackage, {
        root,
        outputDirectory: "data/catalog/production/head-annotations"
      })
    ).toThrow(/data\/research\/cf27/);
  });
});

function fixtureOptions(root: string) {
  return {
    root,
    headCandidatePath: "data/research/cf27/catalog-candidates/research/head-templates/head-candidates.json",
    frameSelectionPath: "data/research/cf27/reports/view-selection/report.json",
    measurementPath: "data/research/cf27/reports/measurements/report.json",
    standardizationQAPath: "data/research/cf27/reports/qa/report.json",
    generatedAt: "2026-07-13T00:00:00.000Z"
  };
}

function createFixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-head-annotation-"));
  temporaryRoots.push(root);
  writeJson(root, "data/research/cf27/catalog-candidates/research/head-templates/head-candidates.json", {
    records: [
      headCandidate(1),
      headCandidate(2)
    ]
  });
  writeJson(root, "data/research/cf27/reports/view-selection/report.json", {
    records: [
      selectionRecord(1),
      selectionRecord(2)
    ]
  });
  writeJson(root, "data/research/cf27/reports/measurements/report.json", {
    records: [
      measurementRecord(1),
      measurementRecord(2)
    ]
  });
  writeJson(root, "data/research/cf27/reports/qa/report.json", {
    records: [
      qaRecord(1),
      qaRecord(2)
    ]
  });
  return root;
}

function headCandidate(order: number) {
  return {
    nativeOrder: order,
    stableInternalID: stableID(order),
    visibleGameLabelOrIndex: `Face ${order}`,
    selectedMenuEvidence: [{ videoID: "video-test", timestampRangeSeconds: "1-2", basis: "test fixture selected label" }],
    eyeBlackObservation: "Synthetic test-only eye-black obstruction note.",
    hairObservation: "Synthetic test-only hair obstruction note.",
    otherVisibleObstructions: [],
    verificationState: "NOT_VERIFIED"
  };
}

function selectionRecord(order: number) {
  return {
    stableInternalID: stableID(order),
    nativeOrder: order,
    visibleGameLabelOrIndex: `Face ${order}`,
    selections: {
      FRONT: selectedFrame(order, "FRONT", "front"),
      LEFT_3Q: selectedFrame(order, "LEFT_3Q", "left-3q")
    }
  };
}

function selectedFrame(order: number, view: string, token: string) {
  return {
    selectionStatus: "autoSelected",
    confidence: 0.8,
    selectedFrame: {
      frameID: `frame-head-${String(order).padStart(3, "0")}-${token}`,
      outputRelativePath: `data/research/cf27/generated/test-only/${stableID(order)}_${view}.png`,
      sourceVideoID: "video-test",
      sourceWorkingFilename: "test-only.mp4",
      sourceTimestampSeconds: order
    }
  };
}

function measurementRecord(order: number) {
  return {
    stableInternalID: stableID(order),
    dataClass: "PRIMARY_RESEARCH_MEASUREMENT",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "IMAGE_DERIVED_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    supportingFrameCount: 1,
    sourceViews: ["FRONT"],
    frameMeasurements: [
      {
        frameID: `frame-head-${String(order).padStart(3, "0")}-front`,
        view: "FRONT",
        width: 1920,
        height: 1080,
        outputRelativePath: `data/research/cf27/generated/test-only/${stableID(order)}_FRONT.png`,
        sourceVideoID: "video-test",
        sourceWorkingFilename: "test-only.mp4",
        sourceTimestampSeconds: order,
        selectionConfidence: 0.8
      }
    ],
    imageDerivedMeasurements: {
      faceWidthToHeightRatio: {
        value: 0.72,
        availabilityState: "available",
        confidence: { score: 0.4, label: "low" },
        supportingViews: ["FRONT"],
        depthSupported: false,
        algorithmVersion: "test-only",
        productionStatus: "NOT_PRODUCTION_DATA"
      }
    }
  };
}

function qaRecord(order: number) {
  return {
    stableInternalID: stableID(order),
    evidenceClassification: {
      recaptureRequiredForProductionComparison: true
    },
    standardizedCaptureChecks: {
      eyeBlack: {
        status: "PRESENT",
        severity: "PRODUCTION_COMPARISON_BLOCKER",
        requiredAction: "Synthetic fixture recapture action."
      }
    }
  };
}

function stableID(order: number) {
  return `CF27_XBOXUNKNOWN_RTG_HEAD_${String(order).padStart(3, "0")}`;
}

function writeJson(root: string, relativePath: string, value: unknown) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(value, null, 2));
}
