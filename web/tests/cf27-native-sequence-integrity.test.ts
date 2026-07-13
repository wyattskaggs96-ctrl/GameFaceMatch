import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root sequence-integrity CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { analyzeNativeSequence, buildNativeSequenceIntegrityReport, writeNativeSequenceIntegrityOutputs } from "../../scripts/cf27-native-sequence-integrity.mjs";

describe("CF27 native option sequence integrity", () => {
  it("detects repeated selections, skips, reverse movement, and possible wrap as review suggestions", () => {
    const records = [
      record(1, "Option 1"),
      record(2, "Option 2"),
      record(3, "Option 3"),
      record(4, "Option 4")
    ];
    const events = [
      event("tl-1", "video-fixture", 1, "Option 1"),
      event("tl-2", "video-fixture", 2, "Option 3"),
      event("tl-3", "video-fixture", 3, "Option 2"),
      event("tl-4", "video-fixture", 4, "Option 4"),
      event("tl-5", "video-fixture", 5, "Option 1")
    ];

    const result = analyzeNativeSequence(records, events, {
      categoryKey: "fixtureCategory",
      displayName: "Fixture Category",
      labelPattern: /^Option\s+(\d+)$/i
    });
    const codes = result.suggestions.map((suggestion: { code: string }) => suggestion.code);

    expect(codes).toContain("repeatedSelection");
    expect(codes).toContain("skippedIndices");
    expect(codes).toContain("reversedMovement");
    expect(codes).toContain("accidentalJump");
    expect(codes).toContain("selectorWrap");
    expect(result.suggestions.every((suggestion: { factStatus: string }) => suggestion.factStatus === "review_suggestion_not_verified_game_fact")).toBe(true);
  });

  it("builds a report that separates deliberately selected labels from thumbnail-only labels", () => {
    const fixture = createFixtureRepository();
    const report = buildNativeSequenceIntegrityReport({
      root: fixture.root,
      timelineIndexPath: "timeline.json",
      categoryConfigs: [fixture.config],
      generatedAt: "2026-07-13T15:00:00.000Z"
    });
    const category = report.categories[0];

    expect(report.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(category.deliberateSelectionEventCount).toBe(4);
    expect(category.thumbnailOnlyObservationCount).toBe(1);
    expect(category.deliberateSelectedSequence.map((entry: { selectedNativeOptionLabel: string }) => entry.selectedNativeOptionLabel)).toEqual([
      "Option 1",
      "Option 3",
      "Option 2",
      "Option 5"
    ]);
    expect(category.reviewSuggestions.some((suggestion: { code: string }) => suggestion.code === "thumbnailOnlyObservation")).toBe(true);
    expect(category.reviewSuggestions.some((suggestion: { code: string }) => suggestion.code === "selectedLabelOutsideCandidateScope")).toBe(true);
  });

  it("writes JSON, CSV, and Markdown review outputs only under research reports", () => {
    const fixture = createFixtureRepository();
    const report = buildNativeSequenceIntegrityReport({
      root: fixture.root,
      timelineIndexPath: "timeline.json",
      categoryConfigs: [fixture.config],
      generatedAt: "2026-07-13T15:00:00.000Z"
    });
    const output = writeNativeSequenceIntegrityOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/research/cf27/reports/native-sequence-integrity"
    });

    expect(output.ok).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/research/cf27/reports/native-sequence-integrity/native_sequence_integrity_report.json"))).toBe(true);
    expect(fs.readFileSync(path.join(fixture.root, "data/research/cf27/reports/native-sequence-integrity/native_sequence_human_review_queue.csv"), "utf8")).toContain("review_suggestion_not_verified_game_fact");
    expect(() => writeNativeSequenceIntegrityOutputs(report, {
      root: fixture.root,
      outputDirectory: "data/catalog/production/native-sequence-integrity"
    })).toThrow(/Refusing to write/);
  });
});

function createFixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-sequence-integrity-"));
  const candidatePath = "data/research/cf27/catalog-candidates/research/fixture/fixture_candidates.json";
  fs.mkdirSync(path.dirname(path.join(root, candidatePath)), { recursive: true });
  fs.writeFileSync(path.join(root, candidatePath), `${JSON.stringify({
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    selectorObservations: { selectorCompletenessProven: false },
    records: [
      record(1, "Option 1"),
      record(2, "Option 2"),
      record(3, "Option 3")
    ]
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "timeline.json"), `${JSON.stringify({
    videos: [
      {
        videoId: "video-fixture",
        workingFilename: "fixture.mp4",
        identifiedContent: "Synthetic fixture category",
        productionStatus: "NOT_PRODUCTION_DATA",
        verificationStatus: "TEST_ONLY"
      }
    ],
    events: [
      event("tl-0", "video-fixture", 0, null, { selectionState: "visible_thumbnail_only", visibleNonSelectedLabels: ["Option 4"] }),
      event("tl-1", "video-fixture", 1, "Option 1"),
      event("tl-2", "video-fixture", 2, "Option 3"),
      event("tl-3", "video-fixture", 3, "Option 2"),
      event("tl-4", "video-fixture", 4, "Option 5")
    ]
  }, null, 2)}\n`);
  return {
    root,
    config: {
      key: "fixture",
      displayName: "Fixture Category",
      categoryName: "Fixture Category",
      candidatePath,
      timelineVideoIDs: ["video-fixture"],
      timelineHeadings: ["FIXTURE"],
      labelPattern: /^Option\s+(\d+)$/i
    }
  };
}

function record(nativeOrder: number, label: string) {
  return {
    nativeOrder,
    stableInternalID: `FIXTURE_OPTION_${String(nativeOrder).padStart(3, "0")}`,
    visibleGameLabelOrIndex: label,
    verificationState: "NOT_VERIFIED",
    productionStatus: "NOT_PRODUCTION_DATA"
  };
}

function event(
  timelineId: string,
  videoId: string,
  startSeconds: number,
  selectedNativeOptionLabel: string | null,
  overrides: Record<string, unknown> = {}
) {
  return {
    timelineId,
    videoId,
    startSeconds,
    endSeconds: startSeconds,
    menuHeading: "FIXTURE",
    selectedNativeOptionLabel,
    selectionState: selectedNativeOptionLabel ? "deliberately_selected" : "not_applicable",
    visibleNonSelectedLabels: [],
    viewCoverage: ["menu_grid"],
    characterLoading: false,
    stableVisualPeriod: true,
    rotationObserved: false,
    notificationOverlayObserved: false,
    motionBlurObserved: false,
    menuExitObserved: false,
    recordingGapObserved: false,
    ...overrides
  };
}
