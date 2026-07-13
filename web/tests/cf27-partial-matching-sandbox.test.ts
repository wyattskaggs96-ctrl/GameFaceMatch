import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Root research scripts are ESM Node modules without TypeScript declarations.
import { buildPartialMatchingSandboxReport, createResearchOnlyFixtureProfile, scoreCandidate, writePartialMatchingSandboxOutputs } from "../../scripts/cf27-partial-matching-sandbox.mjs";

interface SandboxContribution {
  featureID: string;
  included: boolean;
}

interface SandboxMatch {
  catalogCandidateVersion: string;
  productionStatus: string;
  geometry: {
    contributions: SandboxContribution[];
  };
  score: number;
}

let temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  temporaryRoots = [];
});

describe("CF27 partial matching sandbox", () => {
  it("ranks the current Face 1-29 research candidates with a prominent unverified label and no production path", () => {
    const report = buildPartialMatchingSandboxReport({
      root: path.resolve(process.cwd(), ".."),
      generatedAt: "2026-07-13T00:00:00.000Z",
      runtimeMode: "research"
    });

    expect(report.reportLabel).toBe("PARTIAL UNVERIFIED CATALOG — INTERNAL RESEARCH SANDBOX ONLY");
    expect(report.summary.candidateCount).toBe(29);
    expect(report.matches).toHaveLength(3);
    expect(report.summary.productionRecommendationsEnabled).toBe(false);
    expect(report.summary.publicRouteCreated).toBe(false);
    expect(report.summary.fullCatalogClaimed).toBe(false);
    expect(report.publicResultRoute).toBeNull();
    expect(report.sharing.enabled).toBe(false);
    expect((report.matches as SandboxMatch[]).every((match) => match.catalogCandidateVersion === report.catalogCandidateVersion)).toBe(true);
    expect((report.matches as SandboxMatch[]).every((match) => match.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
  });

  it("refuses to run in production mode", () => {
    const root = createFixtureRepository();
    expect(() =>
      buildPartialMatchingSandboxReport({
        root,
        annotationWorkspacePath: "data/research/cf27/reports/head-template-annotation-workspace/head_annotation_workspace.json",
        runtimeMode: "production"
      })
    ).toThrow(/disabled in production/);
  });

  it("requires research-only or test-only profiles with no raw media", () => {
    const root = createFixtureRepository();
    expect(() =>
      buildPartialMatchingSandboxReport({
        root,
        annotationWorkspacePath: "data/research/cf27/reports/head-template-annotation-workspace/head_annotation_workspace.json",
        runtimeMode: "research",
        profile: createResearchOnlyFixtureProfile({ sourceType: "productionUser", rawMediaIncluded: false })
      })
    ).toThrow(/research-only or test-only/);
    expect(() =>
      buildPartialMatchingSandboxReport({
        root,
        annotationWorkspacePath: "data/research/cf27/reports/head-template-annotation-workspace/head_annotation_workspace.json",
        runtimeMode: "research",
        profile: createResearchOnlyFixtureProfile({ rawMediaIncluded: true })
      })
    ).toThrow(/must not include raw media/);
  });

  it("applies missing-data and capture-quality penalties without mixing appearance into geometry", () => {
    const candidate = {
      catalogStableID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      nativeOrder: 1,
      visibleGameLabelOrIndex: "Face 1",
      catalogCandidateVersion: "test-version",
      sourceType: "researchCandidate",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationState: "NOT_VERIFIED",
      automatedMeasurements: {
        faceWidthToHeightRatio: measurement(0.86, 0.8),
        jawWidthRatio: measurement(0.48, 0.8)
      }
    };
    const fullQuality = scoreCandidate({
      candidate,
      profile: createResearchOnlyFixtureProfile({ captureQuality: { overallScore: 1, requiredAnglesComplete: true, blockingIssueCount: 0, advisoryIssueCount: 0 } }),
      catalogCandidateVersion: "test-version"
    });
    const weakerCapture = scoreCandidate({
      candidate,
      profile: createResearchOnlyFixtureProfile({ captureQuality: { overallScore: 0.5, requiredAnglesComplete: true, blockingIssueCount: 0, advisoryIssueCount: 4 } }),
      catalogCandidateVersion: "test-version"
    });

    expect(fullQuality.geometry.contributionCount).toBe(2);
    expect((fullQuality.geometry.contributions as SandboxContribution[]).find((feature) => feature.featureID === "eyeSpacingRatio")?.included).toBe(false);
    expect(fullQuality.penalties.missingDataPenalty).toBeGreaterThan(0);
    expect(weakerCapture.score).toBeLessThan(fullQuality.score);
    expect(weakerCapture.penalties.captureQualityPenalty).toBeGreaterThan(fullQuality.penalties.captureQualityPenalty);
    expect(fullQuality.appearance).toMatchObject({ used: false, score: null });
    expect(fullQuality.explanation.appearanceNotes.join(" ")).toMatch(/Appearance was not used/);
  });

  it("keeps skin presentation out of geometry scoring", () => {
    const candidate = {
      catalogStableID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      nativeOrder: 1,
      visibleGameLabelOrIndex: "Face 1",
      catalogCandidateVersion: "test-version",
      sourceType: "researchCandidate",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationState: "NOT_VERIFIED",
      automatedMeasurements: {
        faceWidthToHeightRatio: measurement(0.86, 0.8),
        jawWidthRatio: measurement(0.48, 0.8),
        skinPresentation: measurement(0.2, 1)
      }
    };
    const baseline = scoreCandidate({ candidate, profile: createResearchOnlyFixtureProfile(), catalogCandidateVersion: "test-version" });
    const changedSkin = scoreCandidate({
      candidate: { ...candidate, automatedMeasurements: { ...candidate.automatedMeasurements, skinPresentation: measurement(0.9, 1) } },
      profile: createResearchOnlyFixtureProfile(),
      catalogCandidateVersion: "test-version"
    });

    expect(changedSkin.score).toBe(baseline.score);
    expect((changedSkin.geometry.contributions as SandboxContribution[]).map((feature) => feature.featureID)).not.toContain("skinPresentation");
  });

  it("writes research-only report outputs outside production directories", () => {
    const root = createFixtureRepository();
    const report = buildPartialMatchingSandboxReport({
      root,
      annotationWorkspacePath: "data/research/cf27/reports/head-template-annotation-workspace/head_annotation_workspace.json",
      runtimeMode: "research",
      generatedAt: "2026-07-13T00:00:00.000Z"
    });
    const output = writePartialMatchingSandboxOutputs(report, {
      root,
      outputDirectory: "data/research/cf27/reports/partial-matching-sandbox"
    });

    expect(output.files).toEqual([
      "data/research/cf27/reports/partial-matching-sandbox/partial_matching_sandbox_report.json",
      "data/research/cf27/reports/partial-matching-sandbox/partial_matching_sandbox_top_matches.csv",
      "data/research/cf27/reports/partial-matching-sandbox/PARTIAL_MATCHING_SANDBOX.md"
    ]);
    expect(() =>
      writePartialMatchingSandboxOutputs(report, {
        root,
        outputDirectory: "data/catalog/production/partial-matching-sandbox"
      })
    ).toThrow(/data\/research\/cf27/);
  });
});

function createFixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-partial-match-"));
  temporaryRoots.push(root);
  writeJson(root, "data/research/cf27/reports/head-template-annotation-workspace/head_annotation_workspace.json", {
    schemaVersion: "fixture-head-annotation-workspace-v1",
    generatedAt: "2026-07-13T00:00:00.000Z",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    workspaces: [
      workspace(1, 0.86, 0.48),
      workspace(2, 0.62, 0.35)
    ]
  });
  return root;
}

function workspace(order: number, faceWidth: number, jawWidth: number) {
  const stableID = `CF27_XBOXUNKNOWN_RTG_HEAD_${String(order).padStart(3, "0")}`;
  return {
    catalogStableID: stableID,
    nativeGameLabelReference: {
      nativeOrder: order,
      visibleGameLabelOrIndex: `Face ${order}`
    },
    sourceClassification: {
      verificationState: "NOT_VERIFIED"
    },
    supportingViews: [],
    automatedMeasurementContext: {
      measurements: {
        faceWidthToHeightRatio: measurement(faceWidth, 0.8),
        jawWidthRatio: measurement(jawWidth, 0.8)
      }
    }
  };
}

function measurement(value: number, confidence: number) {
  return {
    value,
    availabilityState: "available",
    confidence: { score: confidence, label: confidence >= 0.75 ? "high" : "medium" },
    supportingFrameCount: 1,
    supportingViews: ["FRONT"],
    depthSupported: false,
    occlusionStatus: "none",
    algorithmVersion: "test-only",
    productionStatus: "NOT_PRODUCTION_DATA"
  };
}

function writeJson(root: string, relativePath: string, value: unknown) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(value, null, 2));
}
