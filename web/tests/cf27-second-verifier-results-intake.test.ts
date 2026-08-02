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
    const csv = csvForRows(completedRows([
      {
        target_stable_id: "cf27-menu-head-skin-head-template",
        verifier_count: "27",
        final_disposition: "VERIFIED",
        notes: "Verifier counted one more selected value than the current primary research artifact."
      },
      {
        target_stable_id: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
        verifier_native_order: "2",
        verifier_native_label: "Verifier label differs test-only",
        native_order_status: "mismatch",
        record_fields_status: "mismatch",
        final_disposition: "VERIFIED",
        notes: "Verifier reported a different native order and label."
      }
    ]));

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
      rowCount: requiredTargets().length,
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
    const requestedVerified = state.importedRecords.filter((record) => record.requestedFinalDisposition === "VERIFIED");
    expect(requestedVerified.length).toBeGreaterThanOrEqual(2);
    expect(requestedVerified.every((record) => record.importedFinalDisposition === "NOT_VERIFIED")).toBe(true);
    expect(state.importedRecords.every((record) => record.importedFinalDisposition === "NOT_VERIFIED")).toBe(true);
  });

  it("requires verifier identity, environment metadata, evidence references, and sign-off", () => {
    const incompleteMetadata = {
      schemaVersion: "phase0-second-verifier-results-submission-v1",
      verifierID: "second-verifier-test-only"
    };
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows(completedRows()),
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
      resultsCSV: csvForRows(completedRows([
        {
          target_stable_id: "cf27-menu-head-skin-head-template",
          verifier_count: "",
          final_disposition: "NOT_VERIFIED"
        }
      ])),
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
      resultsCSV: csvForRows(completedRows([
        {
          target_stable_id: "CF27_XBOXUNKNOWN_RTG_SKINTONE_001",
          evidence_files_status: "mismatch",
          front_view_status: "mismatch",
          secondary_angle_status: "mismatch",
          dependency_status: "mismatch",
          exception_status: "mismatch",
          discrepancy_type: "versionMismatch",
          final_disposition: "VERIFIED_WITH_NOTES",
          notes: "Verifier reported version and dependency uncertainty."
        }
      ])),
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
      resultsCSV: csvForRows(completedRows([{ final_disposition: "NOT_VERIFIED" }])),
      submissionMetadata: validSubmissionMetadata(),
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state).toMatchObject({
      productionStatus: "NOT_PRODUCTION_DATA",
      productionRecommendationsEnabled: false
    });
    expect(JSON.stringify(state)).not.toMatch(/productionStatus":"PRODUCTION_VERIFIED|productionRecommendationsEnabled":true/);
  });

  it("rejects missing secondary-angle sample completion", () => {
    const sampledTarget = requiredTargets().find((target) => target.requires_secondary_angle_sample);
    expect(sampledTarget).toBeTruthy();
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows(completedRows([
        {
          target_stable_id: sampledTarget!.target_stable_id,
          secondary_angle_sample_included: "",
          secondary_angle_status: "notChecked"
        }
      ])),
      submissionMetadata: validSubmissionMetadata(),
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state.validation.ok).toBe(false);
    expect(state.validation.errors.map((error) => error.code)).toContain("missingSecondaryAngleSampleCompletion");
  });

  it("rejects duplicate-review rows left unresolved", () => {
    const duplicateTarget = requiredTargets().find((target) => target.requires_duplicate_exception_review);
    expect(duplicateTarget).toBeTruthy();
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows(completedRows([
        {
          target_stable_id: duplicateTarget!.target_stable_id,
          exception_status: "notChecked"
        }
      ])),
      submissionMetadata: validSubmissionMetadata(),
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state.validation.ok).toBe(false);
    expect(state.validation.errors.map((error) => error.code)).toContain("duplicateReviewIncomplete");
  });

  it("rejects invalid final verification statuses", () => {
    const state = buildSecondVerifierResultsIntake({
      root: repositoryRoot(),
      resultsCSV: csvForRows(completedRows([
        {
          target_stable_id: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
          final_disposition: "PRODUCTION_APPROVED"
        }
      ])),
      submissionMetadata: validSubmissionMetadata(),
      importedAt: "2026-07-14T04:30:00.000Z"
    }).intakeState;

    expect(state.validation.ok).toBe(false);
    expect(state.validation.errors.map((error) => error.code)).toContain("invalidFinalDisposition");
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
      completedEnvironmentWorksheet: true,
      completedFrontViewChecks: true,
      completedSecondaryAngleSample: true,
      completedDuplicateExceptionReview: true,
      evidenceReviewed: true,
      discrepanciesLogged: true,
      signedBy: "second-verifier-test-only",
      signedAt: "2026-07-14T04:29:00.000Z"
    }
  };
}

type RequiredTarget = {
  target_stable_id: string;
  category: string;
  verification_scope: string;
  requires_count: boolean;
  requires_native_order: boolean;
  requires_evidence_reference: boolean;
  requires_front_view: boolean;
  requires_secondary_angle_sample: boolean;
  requires_duplicate_exception_review: boolean;
};

function requiredTargets(): RequiredTarget[] {
  const targets = JSON.parse(fs.readFileSync(path.join(repositoryRoot(), "data/phase-zero/second-verifier-execution-package/required_import_targets.json"), "utf8"));
  return targets.rows;
}

function completedRows(overrides: Array<Partial<Record<string, string>>> = []) {
  const byTarget = new Map(overrides.filter((override) => override.target_stable_id).map((override) => [override.target_stable_id, override]));
  const globalOverrides = overrides.filter((override) => !override.target_stable_id);
  return requiredTargets().map((target) => {
    const row = validRowForTarget(target);
    Object.assign(row, ...globalOverrides, byTarget.get(target.target_stable_id));
    return row;
  });
}

function validRowForTarget(target: RequiredTarget) {
  const assignment = JSON.parse(fs.readFileSync(path.join(repositoryRoot(), "data/phase-zero/verification_assignment.json"), "utf8"));
  const primary = primaryLookup(target.target_stable_id);
  return {
    assignment_id: assignment.assignmentID,
    verifier_id: "second-verifier-test-only",
    target_stable_id: target.target_stable_id,
    category: target.category,
    verification_scope: target.verification_scope,
    verifier_native_order: target.requires_native_order ? String(primary.nativeOrder ?? 1) : "",
    verifier_native_label: primary.label || target.category,
    verifier_count: target.requires_count ? String(primary.count ?? 1) : "",
    evidence_exists: "yes",
    front_view_exists: target.requires_front_view ? "yes" : "notApplicable",
    secondary_angle_sample_included: target.requires_secondary_angle_sample ? "yes" : "notApplicable",
    native_order_status: target.requires_native_order ? "confirmed" : "notApplicable",
    record_fields_status: "confirmed",
    evidence_files_status: "confirmed",
    front_view_status: target.requires_front_view ? "confirmed" : "notApplicable",
    secondary_angle_status: target.requires_secondary_angle_sample ? "confirmed" : "notApplicable",
    dependency_status: "notApplicable",
    exception_status: target.requires_duplicate_exception_review ? "confirmed" : "notApplicable",
    final_disposition: "NOT_VERIFIED",
    discrepancy_type: "none",
    resolution_action: "holdForResearch",
    resolution_evidence_ids: "second-verifier-evidence-test-only",
    notes: "test-only second-verifier result"
  };
}

function primaryLookup(targetID: string) {
  const menu = JSON.parse(fs.readFileSync(path.join(repositoryRoot(), "data/phase-zero/menu_map.research.json"), "utf8"));
  const primaryReview = JSON.parse(fs.readFileSync(path.join(repositoryRoot(), "data/phase-zero/primary_review_status.json"), "utf8"));
  const menuRecord = (menu.records ?? []).find((record: { stableMenuID?: string }) => record.stableMenuID === targetID);
  const candidate = (primaryReview.candidates ?? []).find((record: { candidateID?: string }) => record.candidateID === targetID);
  return {
    count: menuRecord?.visibleValueCount ?? null,
    nativeOrder: candidate?.nativeOrder ?? menuRecord?.nativeOrder ?? null,
    label: candidate?.nativeVisibleLabelOrIndex ?? menuRecord?.displayLabel ?? ""
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
