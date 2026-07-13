import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluatePhase0ManualMatchingStudy,
  FIXTURE_DERIVED_METRIC_LABEL,
  PHASE0_MANUAL_MATCHING_EVALUATION_VERSION,
  type Phase0ManualMatchingEvaluationInput
} from "@/lib/phase-zero/phase-zero-manual-matching-evaluation";
import type { Phase0ManualMatchingStudyResult, Phase0StudyRank } from "@/lib/phase-zero/phase-zero-manual-matching-study";

describe("Phase 0 manual matching evaluation harness", () => {
  it("calculates fixture-labeled top-one, top-three, rank distribution, agreement, and confusion metrics", () => {
    const report = evaluatePhase0ManualMatchingStudy(
      [
        input(cloneFixture("001", { rankSelected: 1, selectedStableID: "CF27_TESTONLY_HEAD_001", agreedTopChoice: true, agreedTopThreeSet: true }), {
          device: "synthetic-iPhone",
          confidence: 0.9
        }),
        input(cloneFixture("002", { rankSelected: 2, selectedStableID: "CF27_TESTONLY_HEAD_002", agreedTopChoice: false, agreedTopThreeSet: true }), {
          device: "synthetic-Android",
          confidence: 0.65
        }),
        input(cloneFixture("003", { rankSelected: null, selectedStableID: null, agreedTopChoice: null, agreedTopThreeSet: false }), {
          device: "synthetic-iPhone",
          confidence: 0.35
        })
      ],
      { fixtureOnly: true }
    );

    expect(report.evaluationVersion).toBe(PHASE0_MANUAL_MATCHING_EVALUATION_VERSION);
    expect(report.sourceLabel).toBe(FIXTURE_DERIVED_METRIC_LABEL);
    expect(report.fixtureDerived).toBe(true);
    expect(report.includedResultCount).toBe(3);
    expect(report.topOneUsefulMatchRate).toMatchObject({ numerator: 1, denominator: 3, fixtureDerived: true, label: FIXTURE_DERIVED_METRIC_LABEL });
    expect(report.topOneUsefulMatchRate.rate).toBeCloseTo(1 / 3);
    expect(report.topThreeUsefulMatchRate.rate).toBeCloseTo(2 / 3);
    expect(report.rankSelectedDistribution).toEqual([
      expect.objectContaining({ key: "1", count: 1 }),
      expect.objectContaining({ key: "2", count: 1 }),
      expect.objectContaining({ key: "3", count: 0 }),
      expect.objectContaining({ key: "notSelected", count: 1 })
    ]);
    expect(report.interReviewerAgreement.topChoiceAgreementRate.rate).toBeCloseTo(1 / 2);
    expect(report.interReviewerAgreement.topThreeSetAgreementRate.rate).toBeCloseTo(2 / 3);
    expect(report.presetConfusionMatrix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ predictedTopPresetID: "CF27_TESTONLY_HEAD_001", selectedPresetID: "CF27_TESTONLY_HEAD_001", count: 1 }),
        expect.objectContaining({ predictedTopPresetID: "CF27_TESTONLY_HEAD_001", selectedPresetID: "CF27_TESTONLY_HEAD_002", count: 1 }),
        expect.objectContaining({ predictedTopPresetID: "CF27_TESTONLY_HEAD_001", selectedPresetID: "NO_SELECTION", count: 1 })
      ])
    );
  });

  it("summarizes common mismatch reasons and performance by capture mode and device", () => {
    const webGuided = cloneFixture("guided", { rankSelected: 1, mismatchReasons: ["jawMismatch", "captureQuality"], captureMode: "webRgbGuided" });
    const manualUpload = cloneFixture("manual", { rankSelected: 3, mismatchReasons: ["jawMismatch"], captureMode: "webManualUpload" });
    const report = evaluatePhase0ManualMatchingStudy(
      [input(webGuided, { device: "synthetic-iPhone", confidence: 0.8 }), input(manualUpload, { device: "synthetic-Desktop", confidence: 0.6 })],
      { fixtureOnly: true }
    );

    expect(report.commonMismatchReasons).toEqual([
      expect.objectContaining({ key: "jawMismatch", count: 2, fixtureDerived: true }),
      expect.objectContaining({ key: "captureQuality", count: 1, fixtureDerived: true })
    ]);
    expect(report.performanceByCaptureMode).toEqual([
      expect.objectContaining({ key: "webManualUpload", sampleCount: 1, topThreeUsefulMatchRate: expect.objectContaining({ rate: 1 }) }),
      expect.objectContaining({ key: "webRgbGuided", sampleCount: 1, topThreeUsefulMatchRate: expect.objectContaining({ rate: 1 }) })
    ]);
    expect(report.performanceByDevice).toEqual([
      expect.objectContaining({ key: "synthetic-Desktop", sampleCount: 1 }),
      expect.objectContaining({ key: "synthetic-iPhone", sampleCount: 1 })
    ]);
  });

  it("calculates confidence calibration without treating scores as identity probability", () => {
    const report = evaluatePhase0ManualMatchingStudy(
      [
        input(cloneFixture("low", { rankSelected: null }), { confidence: 0.25 }),
        input(cloneFixture("medium", { rankSelected: 2 }), { confidence: 0.6 }),
        input(cloneFixture("high", { rankSelected: 1 }), { confidence: 0.9 }),
        input(cloneFixture("missing-confidence", { rankSelected: 3 }), { confidence: null })
      ],
      { fixtureOnly: true }
    );

    expect(report.confidenceCalibration.unavailableCount).toBe(1);
    expect(report.confidenceCalibration.buckets).toEqual([
      expect.objectContaining({ bucket: "low", sampleCount: 1, averagePredictedConfidence: 0.25, observedTopThreeUsefulRate: 0 }),
      expect.objectContaining({ bucket: "medium", sampleCount: 1, averagePredictedConfidence: 0.6, observedTopThreeUsefulRate: 1 }),
      expect.objectContaining({ bucket: "high", sampleCount: 1, averagePredictedConfidence: 0.9, observedTopThreeUsefulRate: 1 })
    ]);
    expect(report.confidenceCalibration.meanAbsoluteCalibrationError).toBeCloseTo((0.25 + 0.4 + 0.1) / 3);
  });

  it("excludes invalid or incomplete records and reports why", () => {
    const nonFixture = cloneFixture("non-fixture", { rankSelected: 1 });
    nonFixture.sourceType = "researchDraft";
    nonFixture.isTestFixture = false;
    nonFixture.subjectPseudonymousID = "subject-001";
    const incomplete = cloneFixture("incomplete", { rankSelected: 1 });
    incomplete.status = "inReview";

    const report = evaluatePhase0ManualMatchingStudy(
      [input(nonFixture, { confidence: 0.5 }), input(incomplete, { confidence: 1.5 })],
      { fixtureOnly: true }
    );

    expect(report.includedResultCount).toBe(0);
    expect(report.excludedResultCount).toBe(2);
    expect(report.topThreeUsefulMatchRate.rate).toBeNull();
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["fixtureSourceTypeRequired", "fixtureFlagRequired", "incompleteStudyResult"])
    );
  });
});

function input(result: Phase0ManualMatchingStudyResult, options: { device?: string; confidence?: number | null } = {}): Phase0ManualMatchingEvaluationInput {
  return {
    result,
    captureDeviceLabel: options.device,
    predictedConfidence: options.confidence
  };
}

function cloneFixture(
  suffix: string,
  overrides: {
    rankSelected?: Phase0StudyRank | null;
    selectedStableID?: string | null;
    agreedTopChoice?: boolean | null;
    agreedTopThreeSet?: boolean | null;
    mismatchReasons?: Phase0ManualMatchingStudyResult["mainMismatchReasons"];
    captureMode?: Phase0ManualMatchingStudyResult["captureMode"];
  } = {}
): Phase0ManualMatchingStudyResult {
  const fixture = loadSyntheticFixture();
  fixture.resultID = `synthetic-study-result-${suffix}`;
  fixture.subjectPseudonymousID = `synthetic-subject-${suffix}`;
  fixture.consentRecord.consentRecordID = `synthetic-consent-${suffix}`;
  if ("rankSelected" in overrides) {
    fixture.rankSelected = overrides.rankSelected ?? null;
  }
  fixture.captureMode = overrides.captureMode ?? fixture.captureMode;
  fixture.mainMismatchReasons = overrides.mismatchReasons ?? fixture.mainMismatchReasons;
  if ("agreedTopChoice" in overrides) {
    fixture.reviewerAgreement.agreedTopChoice = overrides.agreedTopChoice ?? null;
  }
  if ("agreedTopThreeSet" in overrides) {
    fixture.reviewerAgreement.agreedTopThreeSet = overrides.agreedTopThreeSet ?? null;
  }

  if (overrides.rankSelected === null || overrides.selectedStableID === null) {
    fixture.subjectPreferredResult = {
      selectedCatalogItemID: null,
      selectedStableInternalID: null,
      notes: "Synthetic subject did not select a useful top-three fixture."
    };
  } else if (overrides.selectedStableID) {
    fixture.subjectPreferredResult = {
      selectedCatalogItemID: `synthetic-selected-${suffix}`,
      selectedStableInternalID: overrides.selectedStableID,
      notes: "Synthetic selected fixture preset."
    };
  }

  return fixture;
}

function loadSyntheticFixture(): Phase0ManualMatchingStudyResult {
  const fixturePath = path.resolve(process.cwd(), "..", "data", "fixtures", "test-only", "manual-matching-study", "synthetic-study-result.json");
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Phase0ManualMatchingStudyResult;
}
