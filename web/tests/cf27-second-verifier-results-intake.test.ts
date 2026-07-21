import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type IntakeState = {
  validation: {
    ok: boolean;
    importable: boolean;
    errors: Array<{ code: string }>;
    warnings: Array<{ code: string }>;
  };
  status: string;
  summary: {
    rowCount: number;
    discrepancyCount: number;
    unresolvedDiscrepancyCount: number;
    verifiedAssignedCount: number;
    verifiedBlockedByUnresolvedDiscrepancies: boolean;
  };
  importedRecords: Array<{
    targetStableID: string;
    requestedFinalDisposition: string;
    importedFinalDisposition: string;
    discrepancyIDs: string[];
  }>;
  discrepancies: Array<{
    discrepancyType: string;
    status: string;
    targetStableID: string;
  }>;
};

const {
  buildSecondVerifierResultsIntake
} = await import("../../scripts/cf27-second-verifier-results-intake.mjs" as string) as {
  buildSecondVerifierResultsIntake: (input: {
    root: string;
    resultsCSV: string;
    submissionMetadata: Record<string, unknown>;
    importedAt: string;
  }) => { intakeState: IntakeState };
};

describe("CF27 second-verifier results intake", () => {
  it("imports a completed submission, creates unresolved discrepancies, and blocks VERIFIED assignment", () => {
    const metadata = validSubmissionMetadata();
    const csv = csvForRows([
      validRow({
        target_stable_id: "cf27-menu-head-skin-head-template",
        category: "Head Template menu",
        verification_scope: "menuMap",
        verifier_count: "27",
        final_disposition: "VERIFIED",
        notes: "Verifier counted one more selected value than the current primary research artifact."
      }),
      validRow({
        target_stable_id: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
        category: "Head Template",
        verifier_native_order: "2",
        verifier_native_label: "Verifier label differs test-only",
        native_order_status: "mismatch",
        record_fields_status: "mismatch",
        final_disposition: "VERIFIED",
        notes: "Verifier reported a different native order and label."
      })
    ]);

    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csv,
      submissionMetadata: metadata,
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state.validation.ok).toBe(true);
    expect(state.validation.importable).toBe(true);
    expect(state.status).toBe("DISCREPANCIES_OPENED");
    expect(state.summary).toMatchObject({
      rowCount: 2,
      unresolvedDiscrepancyCount: state.summary.discrepancyCount,
      verifiedAssignedCount: 0,
      verifiedBlockedByUnresolvedDiscrepancies: true
    });
    expect(state.discrepancies.map((item) => item.discrepancyType)).toEqual(expect.arrayContaining([
      "count_mismatch",
      "order_mismatch",
      "visual_mismatch"
    ]));
    expect(state.discrepancies.every((item) => item.status === "OPEN_UNRESOLVED")).toBe(true);
    expect(state.importedRecords.every((record) => record.requestedFinalDisposition === "VERIFIED")).toBe(true);
    expect(state.importedRecords.every((record) => record.importedFinalDisposition === "NOT_VERIFIED")).toBe(true);
  });

  it("requires verifier identity, environment metadata, evidence references, and sign-off", () => {
    const incompleteMetadata = {
      schemaVersion: "phase0-second-verifier-results-submission-v1",
      verifierID: "second-verifier-test-only"
    };
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows([validRow()]),
      submissionMetadata: incompleteMetadata,
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state.validation.ok).toBe(false);
    expect(state.validation.importable).toBe(false);
    expect(state.status).toBe("IMPORT_BLOCKED");
    expect(state.validation.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingSubmissionMetadata",
      "missingSubmissionEvidence",
      "missingRequiredSignOff"
    ]));
  });

  it("rejects incomplete independent count verification rows", () => {
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows([
        validRow({
          target_stable_id: "count-head-templates",
          category: "Head Templates",
          verification_scope: "independentCount",
          verifier_count: "",
          final_disposition: "NOT_VERIFIED"
        })
      ]),
      submissionMetadata: validSubmissionMetadata(),
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state.validation.ok).toBe(false);
    expect(state.validation.importable).toBe(false);
    expect(state.status).toBe("IMPORT_BLOCKED");
    expect(state.validation.errors.map((error) => error.code)).toContain("missingVerifierCount");
  });

  it("detects version, dependency, menu, evidence, and environment discrepancies without resolving them", () => {
    const metadata = {
      ...validSubmissionMetadata(),
      platform: "test-only-other-platform"
    };
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows([
        validRow({
          target_stable_id: "CF27_XBOXUNKNOWN_RTG_SKINTONE_001",
          category: "Skin Tone",
          evidence_exists: "no",
          front_view_exists: "no",
          secondary_angle_sample_included: "no",
          evidence_files_status: "mismatch",
          front_view_status: "mismatch",
          secondary_angle_status: "mismatch",
          dependency_status: "mismatch",
          exception_status: "mismatch",
          discrepancy_type: "versionMismatch",
          final_disposition: "VERIFIED_WITH_NOTES",
          notes: "Verifier reported version and dependency uncertainty."
        })
      ]),
      submissionMetadata: metadata,
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state.status).toBe("DISCREPANCIES_OPENED");
    expect(state.discrepancies.map((item) => item.discrepancyType)).toEqual(expect.arrayContaining([
      "environment_mismatch",
      "missing_evidence",
      "dependency_mismatch",
      "menu_mismatch",
      "version_mismatch"
    ]));
    expect(state.importedRecords[0].importedFinalDisposition).toBe("NOT_VERIFIED");
  });

  it("does not create production data or enable recommendations in intake output", () => {
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows([validRow({ final_disposition: "NOT_VERIFIED" })]),
      submissionMetadata: validSubmissionMetadata(),
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state).toMatchObject({
      productionStatus: "NOT_PRODUCTION_DATA",
      productionRecommendationsEnabled: false
    });
    expect(JSON.stringify(state)).not.toMatch(/productionStatus":"PRODUCTION_VERIFIED|productionRecommendationsEnabled":true/);
  });
});

function repositoryRoot() {
  return path.resolve(process.cwd(), "..");
}

function validSubmissionMetadata() {
  return {
    schemaVersion: "phase0-second-verifier-results-submission-v1",
    verifierID: "second-verifier-test-only",
    verificationDate: "2026-07-14",
    platform: "Xbox",
    consoleModel: "Xbox Series X test-only verifier entry",
    gameVersion: "test-only-visible-version",
    patch: "test-only-visible-patch",
    mode: "Road to Glory",
    creationPath: "Create Player > Player > Appearance > Head & Skin",
    evidenceReferences: ["second-verifier-evidence-test-only"],
    signOff: {
      completedIndependentCounts: true,
      evidenceReviewed: true,
      discrepanciesLogged: true,
      signedBy: "second-verifier-test-only",
      signedAt: "2026-07-14T04:29:00.000Z"
    }
  };
}

function validRow(overrides: Partial<Record<string, string>> = {}) {
  const assignment = JSON.parse(fs.readFileSync(path.join(repositoryRoot(), "data/phase-zero/verification_assignment.json"), "utf8"));
  return {
    assignment_id: assignment.assignmentID,
    verifier_id: "second-verifier-test-only",
    target_stable_id: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
    category: "Head Template",
    verification_scope: "catalogItem",
    verifier_native_order: "1",
    verifier_native_label: "Face 1",
    verifier_count: "",
    evidence_exists: "yes",
    front_view_exists: "yes",
    secondary_angle_sample_included: "yes",
    native_order_status: "confirmed",
    record_fields_status: "confirmed",
    evidence_files_status: "confirmed",
    front_view_status: "confirmed",
    secondary_angle_status: "confirmed",
    dependency_status: "notApplicable",
    exception_status: "notApplicable",
    final_disposition: "NOT_VERIFIED",
    discrepancy_type: "none",
    resolution_action: "holdForResearch",
    resolution_evidence_ids: "second-verifier-evidence-test-only",
    notes: "test-only second-verifier result",
    ...overrides
  };
}

function csvForRows(rows: Array<Record<string, string>>) {
  const columns = [
    "assignment_id",
    "verifier_id",
    "target_stable_id",
    "category",
    "verification_scope",
    "verifier_native_order",
    "verifier_native_label",
    "verifier_count",
    "evidence_exists",
    "front_view_exists",
    "secondary_angle_sample_included",
    "native_order_status",
    "record_fields_status",
    "evidence_files_status",
    "front_view_status",
    "secondary_angle_status",
    "dependency_status",
    "exception_status",
    "final_disposition",
    "discrepancy_type",
    "resolution_action",
    "resolution_evidence_ids",
    "notes"
  ];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column] ?? "")).join(","))
  ].join("\n");
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}
