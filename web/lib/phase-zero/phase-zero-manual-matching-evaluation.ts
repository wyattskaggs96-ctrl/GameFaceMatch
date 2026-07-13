import type { CaptureMode } from "@/types/domain";
import {
  validatePhase0ManualMatchingStudyResult,
  type Phase0ManualMatchingStudyResult,
  type Phase0ManualMismatchReason,
  type Phase0StudyRank
} from "./phase-zero-manual-matching-study";

export const PHASE0_MANUAL_MATCHING_EVALUATION_VERSION = "phase0-manual-matching-evaluation-v1";
export const FIXTURE_DERIVED_METRIC_LABEL = "Fixture-derived metric. Not production evidence.";

export interface Phase0ManualMatchingEvaluationInput {
  result: Phase0ManualMatchingStudyResult;
  captureDeviceLabel?: string | null;
  predictedConfidence?: number | null;
}

export interface Phase0RateMetric {
  numerator: number;
  denominator: number;
  rate: number | null;
  fixtureDerived: boolean;
  label: string;
}

export interface Phase0DistributionEntry {
  key: string;
  count: number;
  rate: number | null;
  fixtureDerived: boolean;
  label: string;
}

export interface Phase0PresetConfusionCell {
  predictedTopPresetID: string;
  selectedPresetID: string;
  count: number;
  fixtureDerived: boolean;
  label: string;
}

export interface Phase0PerformanceGroup {
  key: string;
  sampleCount: number;
  topOneUsefulMatchRate: Phase0RateMetric;
  topThreeUsefulMatchRate: Phase0RateMetric;
  averagePredictedConfidence: number | null;
  fixtureDerived: boolean;
  label: string;
}

export interface Phase0ConfidenceCalibrationBucket {
  bucket: "low" | "medium" | "high";
  sampleCount: number;
  averagePredictedConfidence: number | null;
  observedTopThreeUsefulRate: number | null;
  calibrationGap: number | null;
  fixtureDerived: boolean;
  label: string;
}

export interface Phase0ManualMatchingEvaluationIssue {
  code: string;
  message: string;
  resultID?: string;
}

export interface Phase0ManualMatchingEvaluationReport {
  evaluationVersion: typeof PHASE0_MANUAL_MATCHING_EVALUATION_VERSION;
  sourceLabel: string;
  fixtureDerived: boolean;
  totalInputCount: number;
  includedResultCount: number;
  excludedResultCount: number;
  topOneUsefulMatchRate: Phase0RateMetric;
  topThreeUsefulMatchRate: Phase0RateMetric;
  rankSelectedDistribution: Phase0DistributionEntry[];
  interReviewerAgreement: {
    topChoiceAgreementRate: Phase0RateMetric;
    topThreeSetAgreementRate: Phase0RateMetric;
  };
  presetConfusionMatrix: Phase0PresetConfusionCell[];
  commonMismatchReasons: Phase0DistributionEntry[];
  performanceByCaptureMode: Phase0PerformanceGroup[];
  performanceByDevice: Phase0PerformanceGroup[];
  confidenceCalibration: {
    buckets: Phase0ConfidenceCalibrationBucket[];
    unavailableCount: number;
    meanAbsoluteCalibrationError: number | null;
  };
  issues: Phase0ManualMatchingEvaluationIssue[];
}

interface IncludedEvaluationRecord {
  result: Phase0ManualMatchingStudyResult;
  captureDeviceLabel: string;
  predictedConfidence: number | null;
}

const rankKeys: Array<Phase0StudyRank | "notSelected"> = [1, 2, 3, "notSelected"];
const unknownDeviceLabel = "unknown-capture-device";

export function evaluatePhase0ManualMatchingStudy(
  inputs: Phase0ManualMatchingEvaluationInput[],
  options: { fixtureOnly?: boolean } = {}
): Phase0ManualMatchingEvaluationReport {
  const issues: Phase0ManualMatchingEvaluationIssue[] = [];
  const included: IncludedEvaluationRecord[] = [];

  for (const input of inputs) {
    const resultID = input.result.resultID || input.result.studyID;
    const validation = validatePhase0ManualMatchingStudyResult(input.result, { fixtureOnly: options.fixtureOnly });
    if (!validation.ok) {
      issues.push(
        ...validation.errors.map((error) => ({
          code: error.code,
          message: error.message,
          resultID
        }))
      );
      continue;
    }
    if (input.result.status !== "complete") {
      issues.push({ code: "incompleteStudyResult", message: `${resultID} is not complete and was excluded from evaluation.`, resultID });
      continue;
    }

    const predictedConfidence = normalizeConfidence(input.predictedConfidence, resultID, issues);
    included.push({
      result: input.result,
      captureDeviceLabel: normalizeGroupKey(input.captureDeviceLabel, unknownDeviceLabel),
      predictedConfidence
    });
  }

  const fixtureDerived = included.some((record) => record.result.sourceType === "testFixture" || record.result.isTestFixture);
  const sourceLabel = fixtureDerived ? FIXTURE_DERIVED_METRIC_LABEL : "Study-derived metric from entered manual results.";
  const topOneUsefulCount = included.filter((record) => record.result.rankSelected === 1).length;
  const topThreeUsefulCount = included.filter((record) => isSelectedTopThree(record.result.rankSelected)).length;

  return {
    evaluationVersion: PHASE0_MANUAL_MATCHING_EVALUATION_VERSION,
    sourceLabel,
    fixtureDerived,
    totalInputCount: inputs.length,
    includedResultCount: included.length,
    excludedResultCount: inputs.length - included.length,
    topOneUsefulMatchRate: rate(topOneUsefulCount, included.length, fixtureDerived, sourceLabel),
    topThreeUsefulMatchRate: rate(topThreeUsefulCount, included.length, fixtureDerived, sourceLabel),
    rankSelectedDistribution: rankSelectedDistribution(included, fixtureDerived, sourceLabel),
    interReviewerAgreement: {
      topChoiceAgreementRate: booleanRate(
        included.map((record) => record.result.reviewerAgreement.agreedTopChoice),
        fixtureDerived,
        sourceLabel
      ),
      topThreeSetAgreementRate: booleanRate(
        included.map((record) => record.result.reviewerAgreement.agreedTopThreeSet),
        fixtureDerived,
        sourceLabel
      )
    },
    presetConfusionMatrix: buildPresetConfusionMatrix(included, fixtureDerived, sourceLabel),
    commonMismatchReasons: buildMismatchReasonDistribution(included, fixtureDerived, sourceLabel),
    performanceByCaptureMode: buildPerformanceGroups(
      included,
      (record) => record.result.captureMode,
      fixtureDerived,
      sourceLabel
    ),
    performanceByDevice: buildPerformanceGroups(
      included,
      (record) => record.captureDeviceLabel,
      fixtureDerived,
      sourceLabel
    ),
    confidenceCalibration: buildConfidenceCalibration(included, fixtureDerived, sourceLabel),
    issues
  };
}

function rankSelectedDistribution(records: IncludedEvaluationRecord[], fixtureDerived: boolean, label: string): Phase0DistributionEntry[] {
  return rankKeys.map((key) => {
    const count = records.filter((record) => (record.result.rankSelected ?? "notSelected") === key).length;
    return distribution(String(key), count, records.length, fixtureDerived, label);
  });
}

function buildPresetConfusionMatrix(records: IncludedEvaluationRecord[], fixtureDerived: boolean, label: string): Phase0PresetConfusionCell[] {
  const cells = new Map<string, Phase0PresetConfusionCell>();
  for (const record of records) {
    const predicted = record.result.rankedHeadChoices.find((choice) => choice.rank === 1)?.catalogStableInternalID ?? "UNKNOWN_TOP_PRESET";
    const selected = selectedStableID(record.result);
    const key = `${predicted}=>${selected}`;
    const existing = cells.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      cells.set(key, {
        predictedTopPresetID: predicted,
        selectedPresetID: selected,
        count: 1,
        fixtureDerived,
        label
      });
    }
  }
  return [...cells.values()].sort((a, b) => a.predictedTopPresetID.localeCompare(b.predictedTopPresetID) || a.selectedPresetID.localeCompare(b.selectedPresetID));
}

function buildMismatchReasonDistribution(records: IncludedEvaluationRecord[], fixtureDerived: boolean, label: string): Phase0DistributionEntry[] {
  const counts = new Map<Phase0ManualMismatchReason, number>();
  for (const record of records) {
    for (const reason of record.result.mainMismatchReasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => distribution(key, count, records.length, fixtureDerived, label))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function buildPerformanceGroups(
  records: IncludedEvaluationRecord[],
  keyForRecord: (record: IncludedEvaluationRecord) => CaptureMode | string,
  fixtureDerived: boolean,
  label: string
): Phase0PerformanceGroup[] {
  const grouped = new Map<string, IncludedEvaluationRecord[]>();
  for (const record of records) {
    const key = normalizeGroupKey(keyForRecord(record), "unknown");
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }
  return [...grouped.entries()]
    .map(([key, group]) => ({
      key,
      sampleCount: group.length,
      topOneUsefulMatchRate: rate(group.filter((record) => record.result.rankSelected === 1).length, group.length, fixtureDerived, label),
      topThreeUsefulMatchRate: rate(group.filter((record) => isSelectedTopThree(record.result.rankSelected)).length, group.length, fixtureDerived, label),
      averagePredictedConfidence: average(group.map((record) => record.predictedConfidence).filter(isNumber)),
      fixtureDerived,
      label
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function buildConfidenceCalibration(records: IncludedEvaluationRecord[], fixtureDerived: boolean, label: string) {
  const available = records.filter((record) => record.predictedConfidence !== null);
  const buckets = [
    calibrationBucket("low" as const, available.filter((record) => (record.predictedConfidence ?? 0) < 0.5), fixtureDerived, label),
    calibrationBucket(
      "medium" as const,
      available.filter((record) => (record.predictedConfidence ?? 0) >= 0.5 && (record.predictedConfidence ?? 0) < 0.75),
      fixtureDerived,
      label
    ),
    calibrationBucket("high" as const, available.filter((record) => (record.predictedConfidence ?? 0) >= 0.75), fixtureDerived, label)
  ];
  const gaps = buckets.map((bucket) => bucket.calibrationGap).filter(isNumber).map(Math.abs);
  return {
    buckets,
    unavailableCount: records.length - available.length,
    meanAbsoluteCalibrationError: average(gaps)
  };
}

function calibrationBucket(
  bucket: "low" | "medium" | "high",
  records: IncludedEvaluationRecord[],
  fixtureDerived: boolean,
  label: string
): Phase0ConfidenceCalibrationBucket {
  const averagePredictedConfidence = average(records.map((record) => record.predictedConfidence).filter(isNumber));
  const observedTopThreeUsefulRate = records.length > 0 ? records.filter((record) => isSelectedTopThree(record.result.rankSelected)).length / records.length : null;
  return {
    bucket,
    sampleCount: records.length,
    averagePredictedConfidence,
    observedTopThreeUsefulRate,
    calibrationGap: averagePredictedConfidence !== null && observedTopThreeUsefulRate !== null ? averagePredictedConfidence - observedTopThreeUsefulRate : null,
    fixtureDerived,
    label
  };
}

function booleanRate(values: Array<boolean | null>, fixtureDerived: boolean, label: string): Phase0RateMetric {
  const available = values.filter((value): value is boolean => value !== null);
  return rate(available.filter(Boolean).length, available.length, fixtureDerived, label);
}

function rate(numerator: number, denominator: number, fixtureDerived: boolean, label: string): Phase0RateMetric {
  return {
    numerator,
    denominator,
    rate: denominator > 0 ? numerator / denominator : null,
    fixtureDerived,
    label
  };
}

function distribution(key: string, count: number, denominator: number, fixtureDerived: boolean, label: string): Phase0DistributionEntry {
  return {
    key,
    count,
    rate: denominator > 0 ? count / denominator : null,
    fixtureDerived,
    label
  };
}

function selectedStableID(result: Phase0ManualMatchingStudyResult) {
  if (result.rankSelected !== null) {
    return result.rankedHeadChoices.find((choice) => choice.rank === result.rankSelected)?.catalogStableInternalID ?? "UNKNOWN_SELECTED_PRESET";
  }
  return result.subjectPreferredResult?.selectedStableInternalID ?? "NO_SELECTION";
}

function isSelectedTopThree(rank: Phase0StudyRank | null): rank is Phase0StudyRank {
  return rank === 1 || rank === 2 || rank === 3;
}

function normalizeConfidence(value: number | null | undefined, resultID: string, issues: Phase0ManualMatchingEvaluationIssue[]) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    issues.push({ code: "invalidPredictedConfidence", message: `${resultID} has predicted confidence outside the 0-1 range.`, resultID });
    return null;
  }
  return value;
}

function normalizeGroupKey(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
