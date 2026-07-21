#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MANUAL_MATCHING_FEASIBILITY_VERSION = "phase0-manual-matching-feasibility-v1";
export const PRIVATE_BETA_MATCHING_TARGETS = {
  minimumCompletedParticipants: 10,
  maximumCompletedParticipants: 20,
  topThreeUsefulMatchRate: 0.8,
  topOneAcceptanceRate: 0.5
};
export const BASELINE_MATCHING_MODEL_VERSION = "rule-based-web-mvp-v2-rgb-geometry";

export const subjectColumns = [
  "study_id",
  "study_version",
  "participant_id",
  "participant_sequence",
  "consent_version",
  "consent_acknowledged_at",
  "consent_manual_review",
  "consent_temporary_processing",
  "consent_derived_profile",
  "consent_future_contact_optional",
  "capture_mode",
  "capture_device_label",
  "straight_on_present",
  "left45_present",
  "right45_present",
  "left_profile_present",
  "right_profile_present",
  "neutral_expression_confirmed",
  "one_person_confirmed",
  "photo_requirements_met",
  "raw_media_deletion_status",
  "raw_media_deletion_requested_at",
  "raw_media_deletion_completed_at",
  "raw_media_deletion_verified_by",
  "withdrawal_requested_at",
  "notes"
];

export const reviewColumns = [
  "study_id",
  "participant_id",
  "reviewer_id",
  "review_completed_at",
  "feature_annotation_face_width",
  "feature_annotation_face_length",
  "feature_annotation_forehead",
  "feature_annotation_temples",
  "feature_annotation_cheekbones",
  "feature_annotation_jaw",
  "feature_annotation_chin",
  "feature_annotation_eyes",
  "feature_annotation_brows",
  "feature_annotation_nose",
  "feature_annotation_mouth",
  "feature_annotation_ears",
  "feature_annotation_hairline",
  "feature_annotation_occlusion",
  "top_head_rank_1_catalog_id",
  "top_head_rank_1_reason",
  "top_head_rank_2_catalog_id",
  "top_head_rank_2_reason",
  "top_head_rank_3_catalog_id",
  "top_head_rank_3_reason",
  "hair_catalog_id",
  "hair_reason",
  "facial_hair_catalog_id",
  "facial_hair_reason",
  "reviewer_disagreement_flag",
  "mismatch_reason_codes",
  "notes"
];

export const resultColumns = [
  "source_type",
  "study_id",
  "participant_id",
  "catalog_version_id",
  "algorithm_version",
  "original_top_three_catalog_ids",
  "original_top_three_scores",
  "original_top_three_confidence",
  "capture_quality_state",
  "capture_quality_score",
  "capture_failure_flag",
  "reviewer_a_id",
  "reviewer_b_id",
  "reviewers_agreed_top_choice",
  "reviewers_agreed_top_three_set",
  "participant_selected_rank",
  "participant_selected_catalog_id",
  "participant_usefulness_rating_1_to_5",
  "participant_resemblance_rating_1_to_5",
  "top_one_accepted",
  "top_three_useful",
  "final_in_game_catalog_id",
  "final_in_game_notes",
  "repeat_scan_completed",
  "repeat_scan_top_three_catalog_ids",
  "repeat_scan_same_top_choice",
  "repeat_scan_overlap_count",
  "confidence_perception_1_to_5",
  "disagreement_logged",
  "mismatch_reason_codes",
  "raw_media_deleted_confirmed",
  "deletion_confirmed_at",
  "profile_deleted_confirmed",
  "notes"
];

export const repeatabilityColumns = [
  "source_type",
  "study_id",
  "participant_id",
  "repeat_scan_id",
  "repeat_scan_completed_at",
  "capture_mode",
  "capture_quality_state",
  "original_top_three_catalog_ids",
  "repeat_top_three_catalog_ids",
  "same_top_choice",
  "top_three_overlap_count",
  "notes"
];

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultPaths = {
  subjects: "data/phase-zero/manual_matching_subjects.template.csv",
  reviews: "data/phase-zero/manual_matching_reviews.template.csv",
  results: "data/phase-zero/manual_matching_results.template.csv"
};
const defaultRepeatabilityPath = "data/phase-zero/manual_matching_repeatability.template.csv";
const requiredSubjectYesNoFields = [
  "consent_manual_review",
  "consent_temporary_processing",
  "consent_derived_profile",
  "straight_on_present",
  "left45_present",
  "right45_present",
  "left_profile_present",
  "right_profile_present",
  "neutral_expression_confirmed",
  "one_person_confirmed",
  "photo_requirements_met"
];
const requiredViews = ["straight_on_present", "left45_present", "right45_present", "left_profile_present", "right_profile_present"];
const allowedMismatchReasons = new Set([
  "headShapeMismatch",
  "jawMismatch",
  "eyeMismatch",
  "noseMismatch",
  "mouthMismatch",
  "hairMismatch",
  "facialHairMismatch",
  "bodyPreferenceMismatch",
  "catalogCoverageGap",
  "captureQuality",
  "lightingOrPose",
  "participantPreference",
  "reviewerDisagreement",
  "uncertain"
]);
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "validate";
  if (["help", "--help", "-h"].includes(command)) {
    printHelp();
  } else if (command === "validate" || command === "analyze") {
    const report = analyzeManualMatchingFeasibility({
      root: repositoryRoot,
      subjectsPath: cliValue("--subjects") ?? defaultPaths.subjects,
      reviewsPath: cliValue("--reviews") ?? defaultPaths.reviews,
      resultsPath: cliValue("--results") ?? defaultPaths.results,
      repeatabilityPath: cliValue("--repeatability") ?? defaultRepeatabilityPath
    });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } else if (command === "export-anonymized") {
    const outputPath = cliValue("--out");
    if (!outputPath) {
      console.error("Missing required --out <path> for export-anonymized.");
      process.exitCode = 1;
    } else {
      const report = analyzeManualMatchingFeasibility({
        root: repositoryRoot,
        subjectsPath: cliValue("--subjects") ?? defaultPaths.subjects,
        reviewsPath: cliValue("--reviews") ?? defaultPaths.reviews,
        resultsPath: cliValue("--results") ?? defaultPaths.results,
        repeatabilityPath: cliValue("--repeatability") ?? defaultRepeatabilityPath
      });
      const exportResult = exportAnonymizedStudyResults(report, outputPath, repositoryRoot);
      console.log(JSON.stringify(exportResult, null, 2));
      if (!report.ok) process.exitCode = 1;
    }
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function analyzeManualMatchingFeasibility({
  root = repositoryRoot,
  subjectsPath = defaultPaths.subjects,
  reviewsPath = defaultPaths.reviews,
  resultsPath = defaultPaths.results,
  repeatabilityPath = defaultRepeatabilityPath
} = {}) {
  const subjects = loadCSV(root, subjectsPath, subjectColumns, "subjects");
  const reviews = loadCSV(root, reviewsPath, reviewColumns, "reviews");
  const results = loadCSV(root, resultsPath, resultColumns, "results");
  const repeatability = loadCSV(root, repeatabilityPath, repeatabilityColumns, "repeatability", { optional: true });
  const errors = [...subjects.errors, ...reviews.errors, ...results.errors, ...repeatability.errors];
  const warnings = [...subjects.warnings, ...reviews.warnings, ...results.warnings, ...repeatability.warnings];
  const rows = { subjects: subjects.rows, reviews: reviews.rows, results: results.rows, repeatability: repeatability.rows };

  validateSubjectRows(rows.subjects, errors, warnings);
  validateReviewRows(rows.reviews, rows.subjects, errors, warnings);
  validateResultRows(rows.results, rows.subjects, rows.reviews, errors, warnings);
  validateRepeatabilityRows(rows.repeatability, rows.subjects, errors, warnings);

  if (rows.subjects.length > 0 && (rows.subjects.length < 10 || rows.subjects.length > 20)) {
    warnings.push(issue("participantCountOutsideTarget", `Study target is 10-20 subjects; current subject rows: ${rows.subjects.length}.`));
  }
  if (rows.subjects.length === 0 && rows.reviews.length === 0 && rows.results.length === 0 && rows.repeatability.length === 0) {
    warnings.push(issue("templateOnly", "Manual matching CSVs are header-only templates. No study has been run."));
  }

  const recordStatus = classifyManualMatchingStudyRecords(rows);
  const metrics = calculateManualMatchingMetrics(rows.results, rows.repeatability);
  const targetComparison = compareManualMatchingTargets(metrics);
  const calibrationDecision = createMatchingCalibrationDecision(metrics, targetComparison);
  const dashboard = createManualMatchingStudyDashboard({ rows, metrics, targetComparison, calibrationDecision, errors, warnings });

  return {
    schemaVersion: MANUAL_MATCHING_FEASIBILITY_VERSION,
    ok: errors.length === 0,
    studyHasRun: rows.subjects.length > 0 || rows.reviews.length > 0 || rows.results.length > 0 || rows.repeatability.length > 0,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    rowCounts: {
      subjects: rows.subjects.length,
      reviews: rows.reviews.length,
      results: rows.results.length,
      repeatability: rows.repeatability.length
    },
    actualResultRowsIncluded: metrics.completedResultCount,
    recordStatus,
    metrics,
    targetComparison,
    calibrationDecision,
    dashboard,
    errors,
    warnings
  };
}

export function classifyManualMatchingStudyRecords(rows) {
  const subjectRows = rows.subjects ?? [];
  const resultRows = rows.results ?? [];
  const actualSubjects = subjectRows.filter((row) => !isFixtureLike(row.participant_id));
  const actualResults = resultRows.filter(isActualStudyResultRow);
  const resultsByParticipant = new Map(actualResults.map((row) => [row.participant_id, row]));
  const withdrawn = actualSubjects.filter((row) => hasText(row.withdrawal_requested_at));
  const invalidCaptureSubjectIDs = new Set(
    actualSubjects
      .filter((row) =>
        requiredViews.some((field) => !yes(row[field])) ||
        !yes(row.neutral_expression_confirmed) ||
        !yes(row.one_person_confirmed) ||
        !yes(row.photo_requirements_met)
      )
      .map((row) => row.participant_id)
  );
  for (const row of actualResults) {
    if (yes(row.capture_failure_flag) || row.capture_quality_state === "failed") invalidCaptureSubjectIDs.add(row.participant_id);
  }
  const completed = actualResults.filter(isCompletedActualResult);
  const completedIDs = new Set(completed.map((row) => row.participant_id));
  const withdrawnIDs = new Set(withdrawn.map((row) => row.participant_id));
  const incomplete = actualSubjects.filter((row) =>
    !completedIDs.has(row.participant_id) &&
    !withdrawnIDs.has(row.participant_id) &&
    !invalidCaptureSubjectIDs.has(row.participant_id)
  );
  const deletedIDs = new Set([
    ...actualSubjects.filter((row) => row.raw_media_deletion_status === "deleted").map((row) => row.participant_id),
    ...actualResults.filter((row) => yes(row.raw_media_deleted_confirmed) && yes(row.profile_deleted_confirmed)).map((row) => row.participant_id)
  ]);
  return {
    actualSubjectRows: actualSubjects.length,
    actualResultRows: actualResults.length,
    completed: completed.length,
    incomplete: incomplete.length,
    invalidCapture: invalidCaptureSubjectIDs.size,
    withdrawn: withdrawn.length,
    deleted: deletedIDs.size,
    fixtureOrSyntheticSubjectsExcluded: subjectRows.length - actualSubjects.length,
    fixtureOrSyntheticResultsExcluded: resultRows.length - actualResults.length,
    participantsWithResultRows: resultsByParticipant.size
  };
}

export function calculateManualMatchingMetrics(resultRows, repeatabilityRows = []) {
  const actualRows = resultRows.filter(isActualStudyResultRow);
  const completed = actualRows.filter(isCompletedActualResult);
  const topOneAccepted = completed.filter((row) => yes(row.top_one_accepted) || Number(row.participant_selected_rank) === 1).length;
  const topThreeUseful = completed.filter((row) => yes(row.top_three_useful) || [1, 2, 3].includes(Number(row.participant_selected_rank))).length;
  const disagreementCount = completed.filter((row) => yes(row.disagreement_logged) || !sameBoolean(row.reviewers_agreed_top_choice, row.reviewers_agreed_top_three_set)).length;
  const ratings = completed.map((row) => Number(row.participant_usefulness_rating_1_to_5));
  const resemblanceRatings = completed.map((row) => Number(row.participant_resemblance_rating_1_to_5));
  const captureFailureCount = actualRows.filter((row) => yes(row.capture_failure_flag)).length;
  const repeatScanRowsFromResults = completed.filter((row) => yes(row.repeat_scan_completed));
  const actualRepeatabilityRows = repeatabilityRows.filter(isActualRepeatabilityRow);
  const repeatScanCount = Math.max(repeatScanRowsFromResults.length, actualRepeatabilityRows.length);
  const repeatSameTopChoiceCount = Math.max(
    repeatScanRowsFromResults.filter((row) => yes(row.repeat_scan_same_top_choice)).length,
    actualRepeatabilityRows.filter((row) => yes(row.same_top_choice)).length
  );
  const repeatScanOverlaps = [
    ...repeatScanRowsFromResults.map((row) => Number(row.repeat_scan_overlap_count)),
    ...actualRepeatabilityRows.map((row) => Number(row.top_three_overlap_count))
  ].filter((value) => Number.isFinite(value));
  const confidencePerceptionRatings = completed.map((row) => Number(row.confidence_perception_1_to_5)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
  const confidenceCalibration = calculateConfidenceCalibration(completed);
  return {
    actualInputCount: actualRows.length,
    fixtureRowsExcluded: resultRows.length - actualRows.length,
    completedResultCount: completed.length,
    topOneAcceptance: rate(topOneAccepted, completed.length),
    topThreeUsefulness: rate(topThreeUseful, completed.length),
    rankSelectedDistribution: distribution(completed.map((row) => normalizeRank(row.participant_selected_rank))),
    averageParticipantUsefulnessRating: average(ratings),
    averageResemblanceRating: average(resemblanceRatings),
    reviewerTopChoiceAgreement: yesRate(completed.map((row) => row.reviewers_agreed_top_choice)),
    reviewerTopThreeSetAgreement: yesRate(completed.map((row) => row.reviewers_agreed_top_three_set)),
    disagreementCount,
    mismatchReasonCounts: distribution(completed.flatMap((row) => splitReasons(row.mismatch_reason_codes))),
    deletionConfirmation: rate(completed.filter((row) => yes(row.raw_media_deleted_confirmed) && yes(row.profile_deleted_confirmed)).length, completed.length),
    captureFailureRate: rate(captureFailureCount, actualRows.length),
    captureQualityEffect: buildGroupedRates(completed, (row) => row.capture_quality_state || "unknown"),
    repeatability: {
      repeatScanCount,
      sameTopChoiceRate: rate(repeatSameTopChoiceCount, repeatScanCount),
      averageTopThreeOverlap: average(repeatScanOverlaps)
    },
    confidenceCalibration,
    averageConfidencePerceptionRating: average(confidencePerceptionRatings)
  };
}

export function compareManualMatchingTargets(metrics) {
  const enoughCompletedRows = metrics.completedResultCount >= PRIVATE_BETA_MATCHING_TARGETS.minimumCompletedParticipants;
  return {
    participantCount: {
      target: `${PRIVATE_BETA_MATCHING_TARGETS.minimumCompletedParticipants}-${PRIVATE_BETA_MATCHING_TARGETS.maximumCompletedParticipants}`,
      actual: metrics.completedResultCount,
      status: enoughCompletedRows && metrics.completedResultCount <= PRIVATE_BETA_MATCHING_TARGETS.maximumCompletedParticipants ? "pass" : "notMeasured"
    },
    topOneAcceptance: compareRateToTarget(metrics.topOneAcceptance, PRIVATE_BETA_MATCHING_TARGETS.topOneAcceptanceRate, enoughCompletedRows),
    topThreeUsefulness: compareRateToTarget(metrics.topThreeUsefulness, PRIVATE_BETA_MATCHING_TARGETS.topThreeUsefulMatchRate, enoughCompletedRows)
  };
}

export function createMatchingCalibrationDecision(metrics, targetComparison) {
  const canHoldout = metrics.completedResultCount >= PRIVATE_BETA_MATCHING_TARGETS.minimumCompletedParticipants * 2;
  const enoughForTargetRead = metrics.completedResultCount >= PRIVATE_BETA_MATCHING_TARGETS.minimumCompletedParticipants;
  const targetFailed =
    targetComparison.topOneAcceptance.status === "fail" ||
    targetComparison.topThreeUsefulness.status === "fail";
  const unsupportedSignals = Object.entries(metrics.mismatchReasonCounts)
    .filter(([, count]) => metrics.completedResultCount > 0 && count / metrics.completedResultCount >= 0.3)
    .map(([reason, count]) => ({ reason, count, rate: count / metrics.completedResultCount }));
  const decisionStatus = !enoughForTargetRead
    ? "NOT_TUNED_INSUFFICIENT_REAL_DATA"
    : !canHoldout
      ? "NOT_TUNED_NO_HOLDOUT_GROUP"
      : targetFailed && unsupportedSignals.length > 0
        ? "REVIEW_REQUIRED_BEFORE_TUNING"
        : "NOT_TUNED_NO_EVIDENCE_OF_IMPROVEMENT";
  return {
    baselineModelVersion: BASELINE_MATCHING_MODEL_VERSION,
    candidateModelVersion: null,
    decisionStatus,
    weightChanges: [],
    priorConfigurationPreserved: true,
    fixtureDataUsedForTuning: false,
    holdout: {
      requiredForAutomaticTuning: true,
      available: canHoldout,
      reason: canHoldout ? "At least 20 completed records are available for a simple tuning/holdout split." : "Fewer than 20 completed records; do not tune and evaluate on the same small sample."
    },
    unsupportedSignals,
    beforeAfterEvaluation: {
      before: {
        modelVersion: BASELINE_MATCHING_MODEL_VERSION,
        topOneAcceptance: metrics.topOneAcceptance,
        topThreeUsefulness: metrics.topThreeUsefulness,
        confidenceCalibration: metrics.confidenceCalibration
      },
      after: null,
      reason: "No tuned candidate was adopted from the available evidence."
    }
  };
}

export function createManualMatchingStudyDashboard({ rows, metrics, targetComparison = compareManualMatchingTargets(metrics), calibrationDecision = createMatchingCalibrationDecision(metrics, targetComparison), errors = [], warnings = [] }) {
  const realParticipantCount = rows.subjects.filter((row) => !isFixtureLike(row.participant_id)).length;
  const completedParticipants = metrics.completedResultCount;
  const enoughObservations = completedParticipants >= PRIVATE_BETA_MATCHING_TARGETS.minimumCompletedParticipants;
  return {
    status: enoughObservations ? "measured" : "notMeasured",
    measurementLabel: enoughObservations ? "Calculated from real submitted study rows." : `Not measured until at least ${PRIVATE_BETA_MATCHING_TARGETS.minimumCompletedParticipants} complete real participant results exist.`,
    participantsCompleted: completedParticipants,
    participantTarget: { minimum: PRIVATE_BETA_MATCHING_TARGETS.minimumCompletedParticipants, maximum: PRIVATE_BETA_MATCHING_TARGETS.maximumCompletedParticipants },
    realParticipantRows: realParticipantCount,
    fixtureRowsExcluded: metrics.fixtureRowsExcluded,
    topOneAcceptance: notMeasuredUntilEnough(metrics.topOneAcceptance, enoughObservations),
    topThreeUsefulness: notMeasuredUntilEnough(metrics.topThreeUsefulness, enoughObservations),
    rankDistribution: enoughObservations ? metrics.rankSelectedDistribution : "not measured",
    repeatability: enoughObservations ? metrics.repeatability : "not measured",
    captureFailure: enoughObservations ? metrics.captureFailureRate : "not measured",
    captureQualityEffect: enoughObservations ? metrics.captureQualityEffect : "not measured",
    targetComparison,
    calibrationDecision,
    reviewerAgreement: enoughObservations
      ? {
          topChoice: metrics.reviewerTopChoiceAgreement,
          topThreeSet: metrics.reviewerTopThreeSetAgreement
        }
      : "not measured",
    confidenceCalibration: enoughObservations ? { averageConfidencePerceptionRating: metrics.averageConfidencePerceptionRating } : "not measured",
    issues: {
      errors: errors.length,
      warnings: warnings.length
    }
  };
}

export function exportAnonymizedStudyResults(report, outputPath, root = repositoryRoot) {
  const destination = path.resolve(root, outputPath);
  const exportPayload = {
    schemaVersion: `${MANUAL_MATCHING_FEASIBILITY_VERSION}-anonymized-export-v1`,
    generatedAt: new Date().toISOString(),
    productionStatus: report.productionStatus,
    verificationStatus: report.verificationStatus,
    rowCounts: report.rowCounts,
    metrics: report.metrics,
    dashboard: report.dashboard,
    targetComparison: report.targetComparison,
    calibrationDecision: report.calibrationDecision,
    privacy: {
      participantNamesIncluded: false,
      rawMediaIncluded: false,
      preciseFacialMeasurementsIncluded: false,
      directIdentifiersIncluded: false
    }
  };
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(exportPayload, null, 2)}\n`);
  return {
    ok: report.ok,
    outputPath: path.relative(root, destination),
    rawMediaIncluded: false,
    directIdentifiersIncluded: false
  };
}

function isCompletedActualResult(row) {
  return (
    hasText(row.participant_id) &&
    row.source_type === "actualStudy" &&
    !isFixtureLike(row.participant_id) &&
    !yes(row.capture_failure_flag) &&
    row.capture_quality_state !== "failed" &&
    yes(row.raw_media_deleted_confirmed) &&
    yes(row.profile_deleted_confirmed) &&
    isRating(row.participant_usefulness_rating_1_to_5) &&
    isRating(row.participant_resemblance_rating_1_to_5)
  );
}

function isActualRepeatabilityRow(row) {
  return row.source_type === "actualStudy" && !isFixtureLike(row.participant_id);
}

function buildGroupedRates(rows, keyForRow) {
  const groups = new Map();
  for (const row of rows) {
    const key = String(keyForRow(row) || "unknown");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Object.fromEntries(
    [...groups.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, group]) => [
        key,
        {
          sampleCount: group.length,
          topOneAcceptance: rate(group.filter((row) => yes(row.top_one_accepted) || Number(row.participant_selected_rank) === 1).length, group.length),
          topThreeUsefulness: rate(group.filter((row) => yes(row.top_three_useful) || [1, 2, 3].includes(Number(row.participant_selected_rank))).length, group.length),
          averageConfidence: average(group.map((row) => average(parseNumberList(row.original_top_three_confidence))).filter((value) => value !== null))
        }
      ])
  );
}

function calculateConfidenceCalibration(completedRows) {
  const rowsWithConfidence = completedRows
    .map((row) => ({
      confidence: average(parseNumberList(row.original_top_three_confidence)),
      topThreeUseful: yes(row.top_three_useful) || [1, 2, 3].includes(Number(row.participant_selected_rank))
    }))
    .filter((row) => row.confidence !== null);
  const buckets = [
    confidenceBucket("low", rowsWithConfidence.filter((row) => row.confidence < 0.5)),
    confidenceBucket("medium", rowsWithConfidence.filter((row) => row.confidence >= 0.5 && row.confidence < 0.75)),
    confidenceBucket("high", rowsWithConfidence.filter((row) => row.confidence >= 0.75))
  ];
  const gaps = buckets.map((bucket) => bucket.calibrationGap).filter((value) => value !== null).map(Math.abs);
  return {
    buckets,
    unavailableCount: completedRows.length - rowsWithConfidence.length,
    meanAbsoluteCalibrationError: average(gaps)
  };
}

function confidenceBucket(bucket, rows) {
  const averageConfidence = average(rows.map((row) => row.confidence).filter((value) => value !== null));
  const observedTopThreeUsefulRate = rows.length > 0 ? rows.filter((row) => row.topThreeUseful).length / rows.length : null;
  return {
    bucket,
    sampleCount: rows.length,
    averageConfidence,
    observedTopThreeUsefulRate,
    calibrationGap: averageConfidence !== null && observedTopThreeUsefulRate !== null ? averageConfidence - observedTopThreeUsefulRate : null
  };
}

function compareRateToTarget(metric, target, enoughCompletedRows) {
  if (!enoughCompletedRows || metric.rate === null) {
    return { target, actual: metric.rate, status: "notMeasured", numerator: metric.numerator, denominator: metric.denominator };
  }
  return {
    target,
    actual: metric.rate,
    status: metric.rate >= target ? "pass" : "fail",
    numerator: metric.numerator,
    denominator: metric.denominator
  };
}

function parseNumberList(value) {
  return splitList(value)
    .map((item) => Number(item))
    .map((number) => (number > 1 ? number / 100 : number))
    .filter((number) => Number.isFinite(number) && number >= 0);
}

function loadCSV(root, relativePath, expectedColumns, label, options = {}) {
  const absolutePath = path.resolve(root, relativePath);
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(absolutePath)) {
    if (options.optional) {
      warnings.push(issue("optionalCSVMissing", `${label} CSV not found at ${relativePath}; treating as not measured.`));
      return { rows: [], errors, warnings };
    }
    return { rows: [], errors: [issue("missingCSV", `${label} CSV not found at ${relativePath}.`)], warnings };
  }
  const parsed = parseCSV(fs.readFileSync(absolutePath, "utf8"));
  if (parsed.length === 0) {
    return { rows: [], errors: [issue("emptyCSV", `${label} CSV is empty.`)], warnings };
  }
  const header = parsed[0].map((column) => column.trim());
  const missing = expectedColumns.filter((column) => !header.includes(column));
  const extra = header.filter((column) => !expectedColumns.includes(column));
  if (missing.length > 0) errors.push(issue("missingColumns", `${label} CSV missing columns: ${missing.join(", ")}.`));
  if (extra.length > 0) warnings.push(issue("extraColumns", `${label} CSV has extra columns ignored by analysis: ${extra.join(", ")}.`));
  const rows = parsed.slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => Object.fromEntries(expectedColumns.map((column) => [column, row[header.indexOf(column)]?.trim() ?? ""])));
  return { rows, errors, warnings };
}

function validateSubjectRows(rows, errors, warnings) {
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    requireFields(row, ["study_id", "study_version", "participant_id", "consent_version", "capture_mode"], "subjects", rowNumber, errors);
    rejectPlaceholders(row, "subjects", rowNumber, errors);
    if (ids.has(row.participant_id)) errors.push(issue("duplicateParticipant", `Duplicate participant_id ${row.participant_id}.`, rowNumber));
    ids.add(row.participant_id);
    for (const field of requiredSubjectYesNoFields) validateYesNo(row[field], `subjects.${field}`, rowNumber, errors);
    for (const field of requiredViews) {
      if (!yes(row[field])) errors.push(issue("missingRequiredView", `${row.participant_id} is missing required view ${field}.`, rowNumber));
    }
    if (row.raw_media_deletion_status === "deleted" && (!isISO(row.raw_media_deletion_completed_at) || !hasText(row.raw_media_deletion_verified_by))) {
      errors.push(issue("incompleteRawMediaDeletion", `${row.participant_id} raw media deletion needs timestamp and verifier.`, rowNumber));
    }
    if (row.withdrawal_requested_at && !isISO(row.withdrawal_requested_at)) {
      errors.push(issue("invalidWithdrawalTimestamp", `${row.participant_id} withdrawal timestamp is invalid.`, rowNumber));
    }
    if (!yes(row.photo_requirements_met)) warnings.push(issue("photoRequirementsNotMet", `${row.participant_id} photo requirements are not fully confirmed.`, rowNumber));
  }
}

function validateReviewRows(rows, subjectRows, errors, warnings) {
  const subjectIDs = new Set(subjectRows.map((row) => row.participant_id));
  const reviewersByParticipant = new Map();
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    requireFields(row, ["study_id", "participant_id", "reviewer_id", "review_completed_at", "top_head_rank_1_catalog_id", "top_head_rank_2_catalog_id", "top_head_rank_3_catalog_id"], "reviews", rowNumber, errors);
    rejectPlaceholders(row, "reviews", rowNumber, errors);
    if (!subjectIDs.has(row.participant_id)) errors.push(issue("unknownReviewParticipant", `Review references unknown participant ${row.participant_id}.`, rowNumber));
    if (!isISO(row.review_completed_at)) errors.push(issue("invalidReviewTimestamp", `${row.participant_id} review timestamp is invalid.`, rowNumber));
    const rankedIDs = [row.top_head_rank_1_catalog_id, row.top_head_rank_2_catalog_id, row.top_head_rank_3_catalog_id];
    if (new Set(rankedIDs).size !== rankedIDs.length) errors.push(issue("duplicateTopThreeChoice", `${row.participant_id} repeats a top-three catalog ID.`, rowNumber));
    validateYesNo(row.reviewer_disagreement_flag, "reviews.reviewer_disagreement_flag", rowNumber, errors);
    validateMismatchReasons(row.mismatch_reason_codes, "reviews", rowNumber, errors);
    reviewersByParticipant.set(row.participant_id, new Set([...(reviewersByParticipant.get(row.participant_id) ?? []), row.reviewer_id]));
  }
  for (const [participantID, reviewerIDs] of reviewersByParticipant.entries()) {
    if (reviewerIDs.size < 2) warnings.push(issue("insufficientIndependentReviews", `${participantID} has fewer than two independent reviewer rows.`));
  }
}

function validateResultRows(rows, subjectRows, reviewRows, errors, warnings) {
  const subjectIDs = new Set(subjectRows.map((row) => row.participant_id));
  const reviewersByParticipant = new Map();
  for (const review of reviewRows) {
    reviewersByParticipant.set(review.participant_id, new Set([...(reviewersByParticipant.get(review.participant_id) ?? []), review.reviewer_id]));
  }
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    requireFields(row, ["source_type", "study_id", "participant_id", "catalog_version_id", "algorithm_version", "reviewer_a_id", "reviewer_b_id"], "results", rowNumber, errors);
    rejectPlaceholders(row, "results", rowNumber, errors);
    validateStudySourceType(row.source_type, "results.source_type", rowNumber, errors);
    if (!subjectIDs.has(row.participant_id)) errors.push(issue("unknownResultParticipant", `Result references unknown participant ${row.participant_id}.`, rowNumber));
    if (row.reviewer_a_id === row.reviewer_b_id) errors.push(issue("sameReviewer", `${row.participant_id} requires two different reviewers.`, rowNumber));
    const reviewers = reviewersByParticipant.get(row.participant_id) ?? new Set();
    if (reviewRows.length > 0 && (!reviewers.has(row.reviewer_a_id) || !reviewers.has(row.reviewer_b_id))) {
      errors.push(issue("resultReviewerMissingReview", `${row.participant_id} result references reviewer without matching review row.`, rowNumber));
    }
    for (const field of ["reviewers_agreed_top_choice", "reviewers_agreed_top_three_set", "top_one_accepted", "top_three_useful", "capture_failure_flag", "repeat_scan_completed", "repeat_scan_same_top_choice", "disagreement_logged", "raw_media_deleted_confirmed", "profile_deleted_confirmed"]) {
      validateYesNo(row[field], `results.${field}`, rowNumber, errors);
    }
    if (row.participant_selected_rank && !["1", "2", "3"].includes(row.participant_selected_rank)) {
      errors.push(issue("invalidSelectedRank", `${row.participant_id} selected rank must be 1, 2, 3, or blank.`, rowNumber));
    }
    if (!isRating(row.participant_usefulness_rating_1_to_5)) {
      errors.push(issue("invalidUsefulnessRating", `${row.participant_id} usefulness rating must be 1-5.`, rowNumber));
    }
    if (!isRating(row.participant_resemblance_rating_1_to_5)) {
      errors.push(issue("invalidResemblanceRating", `${row.participant_id} resemblance rating must be 1-5.`, rowNumber));
    }
    if (row.confidence_perception_1_to_5 && !isRating(row.confidence_perception_1_to_5)) {
      errors.push(issue("invalidConfidencePerceptionRating", `${row.participant_id} confidence perception rating must be blank or 1-5.`, rowNumber));
    }
    validateCatalogIDList(row.original_top_three_catalog_ids, "results.original_top_three_catalog_ids", rowNumber, errors);
    if (row.repeat_scan_top_three_catalog_ids) validateCatalogIDList(row.repeat_scan_top_three_catalog_ids, "results.repeat_scan_top_three_catalog_ids", rowNumber, errors);
    if (row.repeat_scan_overlap_count && !["0", "1", "2", "3"].includes(row.repeat_scan_overlap_count)) {
      errors.push(issue("invalidRepeatOverlap", `${row.participant_id} repeat_scan_overlap_count must be 0, 1, 2, 3, or blank.`, rowNumber));
    }
    if (isFixtureLike(row.participant_id) || row.source_type === "testFixture") {
      warnings.push(issue("fixtureStudyRowsExcluded", `${row.participant_id} is fixture-like and excluded from actual study metrics.`, rowNumber));
    }
    if (yes(row.raw_media_deleted_confirmed) && !isISO(row.deletion_confirmed_at)) {
      errors.push(issue("missingDeletionTimestamp", `${row.participant_id} deletion confirmation needs a timestamp.`, rowNumber));
    }
    if (!yes(row.raw_media_deleted_confirmed) || !yes(row.profile_deleted_confirmed)) {
      warnings.push(issue("deletionNotConfirmed", `${row.participant_id} is not complete until raw media and profile deletion are confirmed.`, rowNumber));
    }
    validateMismatchReasons(row.mismatch_reason_codes, "results", rowNumber, errors);
  }
}

function validateRepeatabilityRows(rows, subjectRows, errors, warnings) {
  const subjectIDs = new Set(subjectRows.map((row) => row.participant_id));
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    requireFields(row, ["source_type", "study_id", "participant_id", "repeat_scan_id", "repeat_scan_completed_at"], "repeatability", rowNumber, errors);
    rejectPlaceholders(row, "repeatability", rowNumber, errors);
    validateStudySourceType(row.source_type, "repeatability.source_type", rowNumber, errors);
    if (!subjectIDs.has(row.participant_id)) errors.push(issue("unknownRepeatabilityParticipant", `Repeatability row references unknown participant ${row.participant_id}.`, rowNumber));
    if (!isISO(row.repeat_scan_completed_at)) errors.push(issue("invalidRepeatScanTimestamp", `${row.participant_id} repeat scan timestamp is invalid.`, rowNumber));
    validateYesNo(row.same_top_choice, "repeatability.same_top_choice", rowNumber, errors);
    validateCatalogIDList(row.original_top_three_catalog_ids, "repeatability.original_top_three_catalog_ids", rowNumber, errors);
    validateCatalogIDList(row.repeat_top_three_catalog_ids, "repeatability.repeat_top_three_catalog_ids", rowNumber, errors);
    if (!["0", "1", "2", "3"].includes(row.top_three_overlap_count)) {
      errors.push(issue("invalidRepeatOverlap", `${row.participant_id} top_three_overlap_count must be 0, 1, 2, or 3.`, rowNumber));
    }
    if (isFixtureLike(row.participant_id) || row.source_type === "testFixture") {
      warnings.push(issue("fixtureRepeatabilityRowsExcluded", `${row.participant_id} repeatability row is fixture-like and not actual study evidence.`, rowNumber));
    }
  }
}

function requireFields(row, fields, label, rowNumber, errors) {
  for (const field of fields) {
    if (!hasText(row[field])) errors.push(issue("missingRequiredField", `${label} row is missing ${field}.`, rowNumber));
  }
}

function rejectPlaceholders(row, label, rowNumber, errors) {
  for (const [field, value] of Object.entries(row)) {
    if (placeholderPattern.test(String(value))) errors.push(issue("placeholderValue", `${label}.${field} contains a placeholder value.`, rowNumber));
  }
}

function validateYesNo(value, field, rowNumber, errors) {
  if (!["yes", "no"].includes(String(value).trim().toLowerCase())) {
    errors.push(issue("invalidBoolean", `${field} must be yes or no.`, rowNumber));
  }
}

function validateStudySourceType(value, field, rowNumber, errors) {
  if (!["actualStudy", "testFixture"].includes(String(value).trim())) {
    errors.push(issue("invalidStudySourceType", `${field} must be actualStudy or testFixture.`, rowNumber));
  }
}

function validateCatalogIDList(value, field, rowNumber, errors) {
  const ids = splitList(value);
  if (ids.length !== 3) {
    errors.push(issue("invalidTopThreeList", `${field} must contain exactly three semicolon-separated catalog IDs.`, rowNumber));
  }
  if (new Set(ids).size !== ids.length) {
    errors.push(issue("duplicateTopThreeListItem", `${field} repeats a catalog ID.`, rowNumber));
  }
}

function validateMismatchReasons(value, label, rowNumber, errors) {
  for (const reason of splitReasons(value)) {
    if (!allowedMismatchReasons.has(reason)) errors.push(issue("invalidMismatchReason", `${label} has unsupported mismatch reason ${reason}.`, rowNumber));
  }
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      current = "";
      row = [];
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function splitReasons(value) {
  return String(value ?? "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
}

function splitList(value) {
  return String(value ?? "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
}

function distribution(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function rate(numerator, denominator) {
  return { numerator, denominator, rate: denominator > 0 ? numerator / denominator : null };
}

function yesRate(values) {
  const normalized = values.filter((value) => ["yes", "no"].includes(String(value).trim().toLowerCase()));
  return rate(normalized.filter(yes).length, normalized.length);
}

function average(values) {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function normalizeRank(value) {
  return ["1", "2", "3"].includes(String(value).trim()) ? String(value).trim() : "notSelected";
}

function sameBoolean(first, second) {
  return String(first).trim().toLowerCase() === String(second).trim().toLowerCase();
}

function yes(value) {
  return String(value).trim().toLowerCase() === "yes";
}

function isActualStudyResultRow(row) {
  return row.source_type === "actualStudy" && !isFixtureLike(row.participant_id);
}

function isFixtureLike(value) {
  return /^(synthetic|test-only|fixture)/i.test(String(value ?? "").trim());
}

function notMeasuredUntilEnough(metric, enoughObservations) {
  return enoughObservations ? metric : "not measured";
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRating(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5;
}

function isISO(value) {
  return hasText(value) && !Number.isNaN(Date.parse(value));
}

function issue(code, message, rowNumber) {
  return { code, message, rowNumber };
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function printHelp() {
  console.log(`Manual matching feasibility validation

Usage:
  node scripts/manual-matching-feasibility.mjs validate
  node scripts/manual-matching-feasibility.mjs analyze
  node scripts/manual-matching-feasibility.mjs export-anonymized --out <path>

Options:
  --subjects <path>  Subjects CSV path
  --reviews <path>   Reviews CSV path
  --results <path>   Results CSV path
  --repeatability <path> Repeatability CSV path
`);
}
