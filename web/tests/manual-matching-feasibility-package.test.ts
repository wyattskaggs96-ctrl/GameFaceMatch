import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 manual matching script is ESM JavaScript without TS declarations.
import * as manualMatching from "../../scripts/manual-matching-feasibility.mjs";

const {
  analyzeManualMatchingFeasibility,
  calculateManualMatchingMetrics,
  exportAnonymizedStudyResults,
  repeatabilityColumns,
  reviewColumns,
  resultColumns,
  subjectColumns
} = manualMatching;

let temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  temporaryRoots = [];
});

describe("manual matching feasibility package", () => {
  it("keeps committed templates header-only while validating their schema", () => {
    const report = analyzeManualMatchingFeasibility({
      root: path.resolve(process.cwd(), ".."),
      subjectsPath: "data/phase-zero/manual_matching_subjects.template.csv",
      reviewsPath: "data/phase-zero/manual_matching_reviews.template.csv",
      resultsPath: "data/phase-zero/manual_matching_results.template.csv"
    });

    expect(report.ok).toBe(true);
    expect(report.studyHasRun).toBe(false);
    expect(report.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(report.verificationStatus).toBe("NOT_VERIFIED");
    expect(report.rowCounts).toEqual({ subjects: 0, reviews: 0, results: 0, repeatability: 0 });
    expect(report.dashboard.status).toBe("notMeasured");
    expect(report.dashboard.topOneAcceptance).toBe("not measured");
    expect(report.warnings.map((warning: { code: string }) => warning.code)).toContain("templateOnly");
  });

  it("calculates top-one, top-three, rating, agreement, disagreement, mismatch, and deletion metrics", () => {
    const metrics = calculateManualMatchingMetrics([
      resultRow({ participant_id: "participant-001", participant_selected_rank: "1", participant_usefulness_rating_1_to_5: "5", participant_resemblance_rating_1_to_5: "5", top_one_accepted: "yes", top_three_useful: "yes", mismatch_reason_codes: "jawMismatch;hairMismatch" }),
      resultRow({ participant_id: "participant-002", participant_selected_rank: "2", participant_usefulness_rating_1_to_5: "4", participant_resemblance_rating_1_to_5: "4", top_one_accepted: "no", top_three_useful: "yes", reviewers_agreed_top_choice: "no", mismatch_reason_codes: "catalogCoverageGap" }),
      resultRow({ participant_id: "participant-003", participant_selected_rank: "", participant_usefulness_rating_1_to_5: "2", participant_resemblance_rating_1_to_5: "2", top_one_accepted: "no", top_three_useful: "no", disagreement_logged: "yes", mismatch_reason_codes: "captureQuality" })
    ]);

    expect(metrics.actualInputCount).toBe(3);
    expect(metrics.completedResultCount).toBe(3);
    expect(metrics.topOneAcceptance).toMatchObject({ numerator: 1, denominator: 3 });
    expect(metrics.topOneAcceptance.rate).toBeCloseTo(1 / 3);
    expect(metrics.topThreeUsefulness.rate).toBeCloseTo(2 / 3);
    expect(metrics.rankSelectedDistribution).toEqual({ "1": 1, "2": 1, notSelected: 1 });
    expect(metrics.averageParticipantUsefulnessRating).toBeCloseTo(11 / 3);
    expect(metrics.averageResemblanceRating).toBeCloseTo(11 / 3);
    expect(metrics.reviewerTopChoiceAgreement.rate).toBeCloseTo(2 / 3);
    expect(metrics.reviewerTopThreeSetAgreement.rate).toBe(1);
    expect(metrics.disagreementCount).toBe(2);
    expect(metrics.mismatchReasonCounts).toEqual({
      captureQuality: 1,
      catalogCoverageGap: 1,
      hairMismatch: 1,
      jawMismatch: 1
    });
    expect(metrics.deletionConfirmation.rate).toBe(1);
    expect(metrics.captureFailureRate.rate).toBe(0);
  });

  it("validates a temporary complete 10-subject study package without committing participant data", () => {
    const root = createTemporaryStudyPackage({ subjectCount: 10 });
    const report = analyzeManualMatchingFeasibility({ root });

    expect(report.ok).toBe(true);
    expect(report.studyHasRun).toBe(true);
    expect(report.rowCounts).toEqual({ subjects: 10, reviews: 20, results: 10, repeatability: 10 });
    expect(report.metrics.completedResultCount).toBe(10);
    expect(report.metrics.topOneAcceptance.rate).toBe(0.5);
    expect(report.metrics.topThreeUsefulness.rate).toBe(1);
    expect(report.dashboard.status).toBe("measured");
    expect(report.dashboard.repeatability).not.toBe("not measured");
  });

  it("excludes fixture-like study rows from actual metrics and anonymized exports include no raw media", () => {
    const root = createTemporaryStudyPackage({
      subjectCount: 1,
      mutate: ({ subjects, results }) => {
        subjects[0].participant_id = "synthetic-participant-001";
        results[0].participant_id = "synthetic-participant-001";
        results[0].source_type = "testFixture";
      }
    });
    const report = analyzeManualMatchingFeasibility({ root });
    const exportResult = exportAnonymizedStudyResults(report, "exports/anonymized-study-results.json", root);
    const exported = fs.readFileSync(path.join(root, exportResult.outputPath), "utf8");

    expect(report.metrics.fixtureRowsExcluded).toBe(1);
    expect(report.metrics.completedResultCount).toBe(0);
    expect(report.dashboard.status).toBe("notMeasured");
    expect(exportResult.rawMediaIncluded).toBe(false);
    expect(exported).not.toContain("data:image");
    expect(exported).not.toContain("faceImage");
  });

  it("rejects placeholders, missing required views, invalid mismatch reasons, same reviewer rows, and missing deletion confirmation", () => {
    const root = createTemporaryStudyPackage({
      subjectCount: 1,
      mutate: ({ subjects, reviews, results }) => {
        subjects[0].participant_id = "REPLACE_WITH_PARTICIPANT";
        subjects[0].left_profile_present = "no";
        reviews[0].mismatch_reason_codes = "unsupportedReason";
        results[0].reviewer_b_id = results[0].reviewer_a_id;
        results[0].raw_media_deleted_confirmed = "no";
        results[0].profile_deleted_confirmed = "no";
      }
    });

    const report = analyzeManualMatchingFeasibility({ root });

    expect(report.ok).toBe(false);
    expect(report.errors.map((error: { code: string }) => error.code)).toEqual(expect.arrayContaining([
      "placeholderValue",
      "missingRequiredView",
      "invalidMismatchReason",
      "sameReviewer"
    ]));
    expect(report.warnings.map((warning: { code: string }) => warning.code)).toContain("deletionNotConfirmed");
  });

  it("documents the study protocol without implying the study has run", () => {
    const protocol = fs.readFileSync(path.resolve(process.cwd(), "../docs/phase-zero/MANUAL_MATCHING_FEASIBILITY_PROTOCOL.md"), "utf8");

    expect(protocol).toContain("Study status:** NOT STARTED");
    expect(protocol).toContain("10-20 consenting subjects");
    expect(protocol).toContain("Raw photos are temporary by default");
    expect(protocol).toContain("Top-one acceptance");
    expect(protocol).toContain("Top-three usefulness");
    expect(protocol).toContain("This protocol does not mark Phase 0 complete");
  });
});

function createTemporaryStudyPackage(options: {
  subjectCount: number;
  mutate?: (data: { subjects: Array<Record<string, string>>; reviews: Array<Record<string, string>>; results: Array<Record<string, string>> }) => void;
}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-manual-study-"));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, "data/phase-zero"), { recursive: true });
  const subjects = Array.from({ length: options.subjectCount }, (_, index) => subjectRow(index + 1));
  const reviews = subjects.flatMap((subject) => [
    reviewRow(subject.participant_id, "reviewer-a"),
    reviewRow(subject.participant_id, "reviewer-b")
  ]);
  const results = subjects.map((subject, index) => resultRow({
    participant_id: subject.participant_id,
    participant_selected_rank: index % 2 === 0 ? "1" : "2",
    top_one_accepted: index % 2 === 0 ? "yes" : "no",
    top_three_useful: "yes",
    participant_usefulness_rating_1_to_5: index % 2 === 0 ? "5" : "4"
  }));
  options.mutate?.({ subjects, reviews, results });
  writeCSV(root, "data/phase-zero/manual_matching_subjects.template.csv", subjectColumns, subjects);
  writeCSV(root, "data/phase-zero/manual_matching_reviews.template.csv", reviewColumns, reviews);
  writeCSV(root, "data/phase-zero/manual_matching_results.template.csv", resultColumns, results);
  writeCSV(root, "data/phase-zero/manual_matching_repeatability.template.csv", repeatabilityColumns, subjects.map((subject) => repeatabilityRow(subject.participant_id)));
  return root;
}

function subjectRow(index: number) {
  return {
    study_id: "manual-study-test-only",
    study_version: "study-v1",
    participant_id: `participant-${String(index).padStart(3, "0")}`,
    participant_sequence: String(index),
    consent_version: "consent-v1",
    consent_acknowledged_at: "2026-07-14T00:00:00.000Z",
    consent_manual_review: "yes",
    consent_temporary_processing: "yes",
    consent_derived_profile: "yes",
    consent_future_contact_optional: "no",
    capture_mode: "webRgbGuided",
    capture_device_label: "test-only-device",
    straight_on_present: "yes",
    left45_present: "yes",
    right45_present: "yes",
    left_profile_present: "yes",
    right_profile_present: "yes",
    neutral_expression_confirmed: "yes",
    one_person_confirmed: "yes",
    photo_requirements_met: "yes",
    raw_media_deletion_status: "deleted",
    raw_media_deletion_requested_at: "2026-07-14T00:30:00.000Z",
    raw_media_deletion_completed_at: "2026-07-14T00:35:00.000Z",
    raw_media_deletion_verified_by: "privacy-reviewer-test-only",
    withdrawal_requested_at: "",
    notes: "temporary test row"
  };
}

function reviewRow(participantID: string, reviewerID: string) {
  return {
    study_id: "manual-study-test-only",
    participant_id: participantID,
    reviewer_id: reviewerID,
    review_completed_at: "2026-07-14T00:20:00.000Z",
    feature_annotation_face_width: "medium",
    feature_annotation_face_length: "medium",
    feature_annotation_forehead: "medium",
    feature_annotation_temples: "medium",
    feature_annotation_cheekbones: "medium",
    feature_annotation_jaw: "medium",
    feature_annotation_chin: "medium",
    feature_annotation_eyes: "medium",
    feature_annotation_brows: "medium",
    feature_annotation_nose: "medium",
    feature_annotation_mouth: "medium",
    feature_annotation_ears: "visible",
    feature_annotation_hairline: "visible",
    feature_annotation_occlusion: "none",
    top_head_rank_1_catalog_id: "CF27_VERIFIED_TEST_HEAD_001",
    top_head_rank_1_reason: "closest verified test option",
    top_head_rank_2_catalog_id: "CF27_VERIFIED_TEST_HEAD_002",
    top_head_rank_2_reason: "second closest verified test option",
    top_head_rank_3_catalog_id: "CF27_VERIFIED_TEST_HEAD_003",
    top_head_rank_3_reason: "third closest verified test option",
    hair_catalog_id: "CF27_VERIFIED_TEST_HAIR_001",
    hair_reason: "closest verified hair option",
    facial_hair_catalog_id: "",
    facial_hair_reason: "none selected",
    reviewer_disagreement_flag: "no",
    mismatch_reason_codes: "jawMismatch",
    notes: "temporary test row"
  };
}

function resultRow(overrides: Partial<Record<(typeof resultColumns)[number], string>> = {}) {
  return {
    source_type: "actualStudy",
    study_id: "manual-study-test-only",
    participant_id: "participant-001",
    catalog_version_id: "verified-catalog-test-version",
    algorithm_version: "manual-study-protocol-test",
    original_top_three_catalog_ids: "CF27_VERIFIED_TEST_HEAD_001;CF27_VERIFIED_TEST_HEAD_002;CF27_VERIFIED_TEST_HEAD_003",
    original_top_three_scores: "92;86;81",
    original_top_three_confidence: "0.72;0.68;0.61",
    capture_quality_state: "passed",
    capture_quality_score: "0.9",
    capture_failure_flag: "no",
    reviewer_a_id: "reviewer-a",
    reviewer_b_id: "reviewer-b",
    reviewers_agreed_top_choice: "yes",
    reviewers_agreed_top_three_set: "yes",
    participant_selected_rank: "1",
    participant_selected_catalog_id: "CF27_VERIFIED_TEST_HEAD_001",
    participant_usefulness_rating_1_to_5: "5",
    participant_resemblance_rating_1_to_5: "5",
    top_one_accepted: "yes",
    top_three_useful: "yes",
    final_in_game_catalog_id: "CF27_VERIFIED_TEST_HEAD_001",
    final_in_game_notes: "test-only final selection",
    repeat_scan_completed: "yes",
    repeat_scan_top_three_catalog_ids: "CF27_VERIFIED_TEST_HEAD_001;CF27_VERIFIED_TEST_HEAD_002;CF27_VERIFIED_TEST_HEAD_003",
    repeat_scan_same_top_choice: "yes",
    repeat_scan_overlap_count: "3",
    confidence_perception_1_to_5: "4",
    disagreement_logged: "no",
    mismatch_reason_codes: "jawMismatch",
    raw_media_deleted_confirmed: "yes",
    deletion_confirmed_at: "2026-07-14T00:35:00.000Z",
    profile_deleted_confirmed: "yes",
    notes: "temporary test row",
    ...overrides
  };
}

function repeatabilityRow(participantID: string) {
  return {
    source_type: "actualStudy",
    study_id: "manual-study-test-only",
    participant_id: participantID,
    repeat_scan_id: `${participantID}-repeat-001`,
    repeat_scan_completed_at: "2026-07-14T01:00:00.000Z",
    capture_mode: "webRgbGuided",
    capture_quality_state: "passed",
    original_top_three_catalog_ids: "CF27_VERIFIED_TEST_HEAD_001;CF27_VERIFIED_TEST_HEAD_002;CF27_VERIFIED_TEST_HEAD_003",
    repeat_top_three_catalog_ids: "CF27_VERIFIED_TEST_HEAD_001;CF27_VERIFIED_TEST_HEAD_002;CF27_VERIFIED_TEST_HEAD_003",
    same_top_choice: "yes",
    top_three_overlap_count: "3",
    notes: "temporary test row"
  };
}

function writeCSV(root: string, relativePath: string, columns: readonly string[], rows: Array<Record<string, string>>) {
  const content = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column] ?? "")).join(","))
  ].join("\n");
  fs.writeFileSync(path.join(root, relativePath), `${content}\n`);
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}
