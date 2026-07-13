import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root view-frame selection CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { applyFrameSelectionOverride, buildViewAngleFrameSelectionReport, rankFramesForView, writeViewAngleFrameSelectionOutputs } from "../../scripts/cf27-view-angle-frame-selection.mjs";

describe("CF27 view-angle frame selection", () => {
  it("ranks exact front frames above menu context frames with explainable criteria", () => {
    const selection = rankFramesForView({
      stableInternalID: "CF27_TEST_HEAD_001",
      view: "FRONT",
      frames: [
        frame("frame-menu", "MENU", { outputSizeBytes: 200_000 }),
        frame("frame-front", "FRONT", { outputSizeBytes: 1_200_000, transitionFrameRejected: true })
      ]
    });

    expect(selection.selectionStatus).toBe("autoSelected");
    expect(selection.selectedFrame.frameID).toBe("frame-front");
    expect(selection.selectedFrame.criteria).toHaveProperty("headPoseOrViewMatch", 1);
    expect(selection.selectedFrame.explainability.join(" ")).toMatch(/View evidence is exact/);
    expect(selection.candidates.find((candidate: { frameID: string }) => candidate.frameID === "frame-menu").autoSelectionAllowed).toBe(false);
  });

  it("does not fabricate left or right views from ambiguous three-quarter frames", () => {
    const selection = rankFramesForView({
      stableInternalID: "CF27_TEST_NOSE_001",
      view: "LEFT_3Q",
      frames: [
        frame("frame-ambiguous", "BEST_AVAILABLE_THREE_QUARTER", { outputSizeBytes: 1_000_000 })
      ]
    });

    expect(selection.selectionStatus).toBe("missingViewNoSelection");
    expect(selection.selectedFrame).toBeNull();
    expect(selection.candidates[0]).toMatchObject({
      canonicalFrameView: "THREE_QUARTER_UNSPECIFIED",
      autoSelectionAllowed: false
    });
    expect(selection.reviewReason).toMatch(/No exact view candidate/);
  });

  it("applies reviewer overrides while preserving prior selection history", () => {
    const report = {
      generatedAt: "2026-07-13T16:00:00.000Z",
      summary: { selectedViewCount: 1, reviewerOverrideCount: 0 },
      reviewerOverrides: [],
      records: [
        {
          stableInternalID: "CF27_TEST_HEAD_001",
          selections: {
            FRONT: rankFramesForView({
              stableInternalID: "CF27_TEST_HEAD_001",
              view: "FRONT",
              frames: [
                frame("frame-front-auto", "FRONT", { outputSizeBytes: 1_000_000 }),
                frame("frame-front-reviewer", "FRONT", { outputSizeBytes: 900_000 })
              ]
            }),
            LEFT_3Q: emptySelection("LEFT_3Q"),
            LEFT_PROFILE: emptySelection("LEFT_PROFILE"),
            RIGHT_3Q: emptySelection("RIGHT_3Q"),
            RIGHT_PROFILE: emptySelection("RIGHT_PROFILE"),
            REAR: emptySelection("REAR")
          }
        }
      ]
    };

    const next = applyFrameSelectionOverride(report, {
      stableInternalID: "CF27_TEST_HEAD_001",
      view: "FRONT",
      frameID: "frame-front-reviewer",
      reviewerID: "reviewer-fixture",
      reason: "Sharper jawline in manual inspection.",
      overriddenAt: "2026-07-13T16:05:00.000Z"
    });

    const selection = next.records[0].selections.FRONT;
    expect(selection.selectionStatus).toBe("reviewerOverride");
    expect(selection.selectedFrame.frameID).toBe("frame-front-reviewer");
    expect(selection.selectionHistory).toHaveLength(1);
    expect(selection.selectionHistory[0].previousSelection.selectedFrameID).toBe("frame-front-auto");
    expect(next.reviewerOverrides[0]).toMatchObject({
      reviewerID: "reviewer-fixture",
      factStatus: "reviewer_override_not_verified_game_fact"
    });
  });

  it("builds and writes report outputs only under research reports", () => {
    const fixture = createFixtureRepository();
    const report = buildViewAngleFrameSelectionReport({
      root: fixture.root,
      manifestRoot: "data/research/cf27/manifests",
      generatedAt: "2026-07-13T16:00:00.000Z"
    });

    expect(report.summary.recordCount).toBe(1);
    expect(report.summary.fabricatedViewCount).toBe(0);
    expect(report.records[0].selections.FRONT.selectionStatus).toBe("autoSelected");
    expect(report.records[0].selections.LEFT_3Q.selectionStatus).toBe("missingViewNoSelection");

    const output = writeViewAngleFrameSelectionOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/research/cf27/reports/view-angle-frame-selection"
    });

    expect(output.ok).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/research/cf27/reports/view-angle-frame-selection/view_angle_frame_selection_report.json"))).toBe(true);
    expect(() => writeViewAngleFrameSelectionOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/catalog/production/frame-selection"
    })).toThrow(/Refusing to write/);
  });
});

function createFixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-view-angle-frame-selection-"));
  const manifestDirectory = path.join(root, "data/research/cf27/manifests/fixture-evidence-frames");
  fs.mkdirSync(manifestDirectory, { recursive: true });
  fs.writeFileSync(path.join(manifestDirectory, "fixture_evidence_frame_manifest.json"), `${JSON.stringify({
    schemaVersion: "fixture-evidence-frame-manifest-v1",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "TEST_ONLY",
    frames: [
      frame("frame-cf27-test-front", "FRONT"),
      frame("frame-cf27-test-menu", "MENU"),
      frame("frame-cf27-test-ambiguous", "BEST_AVAILABLE_THREE_QUARTER")
    ]
  }, null, 2)}\n`);
  return { root };
}

function frame(frameID: string, viewOrRole: string, overrides: Record<string, unknown> = {}) {
  return {
    frameID,
    stableInternalID: "CF27_TEST_HEAD_001",
    nativeOrder: 1,
    visibleGameLabelOrIndex: "Synthetic Test Head",
    view: viewOrRole,
    role: viewOrRole,
    sourceVideoID: "video-fixture",
    sourceWorkingFilename: "fixture.mp4",
    outputRelativePath: `data/research/cf27/generated/full-resolution-frames/fixture/${frameID}.png`,
    outputSha256: `sha-${frameID}`,
    outputSizeBytes: 800_000,
    outputFormat: "png",
    width: 1920,
    height: 1080,
    preservesOriginalAspectRatio: true,
    transitionFrameRejected: true,
    severeMotionBlurRejected: true,
    mostlyOutsideUsefulCropRejected: true,
    prompt87NotificationOverlayObserved: false,
    appearanceAltered: false,
    ...overrides
  };
}

function emptySelection(view: string) {
  return {
    stableInternalID: "CF27_TEST_HEAD_001",
    view,
    viewDisplayName: view,
    selectionStatus: "missingViewNoSelection",
    selectedFrame: null,
    confidence: 0,
    candidates: [],
    selectionHistory: [],
    reviewRequired: true
  };
}
