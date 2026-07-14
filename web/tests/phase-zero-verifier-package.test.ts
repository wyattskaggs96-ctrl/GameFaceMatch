import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectAssignmentTargetIDs,
  parseSecondVerifierResultsCSV,
  phase0VerifierResultsColumns,
  validateSecondVerifierAssignmentPackage,
  validateSecondVerifierResultsImport
} from "@/lib/phase-zero/phase-zero-verifier-package";

describe("Phase 0 second-verifier package", () => {
  it("ships a non-production assignment that does not claim verification occurred", () => {
    const assignment = readAssignment();
    const report = validateSecondVerifierAssignmentPackage(assignment);

    expect(report.ok).toBe(true);
    expect(report.importable).toBe(false);
    expect(assignment).toMatchObject({
      schemaVersion: "phase0-second-verifier-assignment-v1",
      dataClass: "SECOND_VERIFIER_ASSIGNMENT_TEMPLATE",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "NOT_VERIFIED",
      verificationHasOccurred: false,
      primaryCountsWithheld: true,
      noProductionRecommendationAccess: true
    });
  });

  it("withholds primary counts and masks native-order comparison values", () => {
    const assignment = readAssignment();

    expect(assignment.independentCountingForms.length).toBeGreaterThan(0);
    expect(assignment.independentCountingForms.every((form: Record<string, unknown>) =>
      form.primaryCountHiddenUntilComparison === true &&
      form.comparePrimaryAfterSubmission === true &&
      !("primaryCount" in form) &&
      !("primaryFinalCount" in form)
    )).toBe(true);
    expect(assignment.nativeOrderComparisonSheet.length).toBeGreaterThan(0);
    expect(assignment.nativeOrderComparisonSheet.every((row: Record<string, unknown>) =>
      row.primaryNativeOrderMasked === "WITHHELD_UNTIL_COMPARISON" &&
      row.primaryLabelMasked === "WITHHELD_UNTIL_COMPARISON" &&
      !("primaryNativeOrder" in row) &&
      !("primaryCount" in row)
    )).toBe(true);
  });

  it("includes the required human-readable verifier documents", () => {
    const instructions = fs.readFileSync(path.resolve(process.cwd(), "../docs/phase-zero/SECOND_VERIFIER_INSTRUCTIONS.md"), "utf8");
    const printable = fs.readFileSync(path.resolve(process.cwd(), "../docs/phase-zero/SECOND_VERIFIER_PRINTABLE_CHECKLIST.md"), "utf8");

    expect(instructions).toContain("NOT PRODUCTION DATA");
    expect(instructions).toContain("Randomized 25% Secondary-Angle Sampling");
    expect(instructions).toContain("No second-person verification has occurred");
    expect(printable).toContain("WITHHELD UNTIL INDEPENDENT COUNT IS COMPLETE");
    expect(printable).toContain("Head Templates");
    expect(printable).toContain("Sign-Off");
  });

  it("validates the CSV template shape without exposing primary data columns", () => {
    const csv = fs.readFileSync(path.resolve(process.cwd(), "../data/phase-zero/verification_results.template.csv"), "utf8");
    const report = parseSecondVerifierResultsCSV(csv);
    const header = csv.split("\n")[0].split(",");

    expect(report.ok).toBe(true);
    expect(report.rowCount).toBe(1);
    expect(header).toEqual([...phase0VerifierResultsColumns]);
    expect(header.some((column) => column.toLowerCase().includes("primary"))).toBe(false);
  });

  it("treats the template row as non-importable until real verifier values replace placeholders", () => {
    const assignment = readAssignment();
    const csv = fs.readFileSync(path.resolve(process.cwd(), "../data/phase-zero/verification_results.template.csv"), "utf8");
    const report = validateSecondVerifierResultsImport(csv, assignment);

    expect(report.ok).toBe(true);
    expect(report.importable).toBe(false);
    expect(report.warnings.map((warning) => warning.code)).toContain("templateOnly");
  });

  it("accepts a completed NOT_VERIFIED verifier result row for a known target", () => {
    const assignment = readAssignment();
    const target = [...collectAssignmentTargetIDs(assignment)].find((id) => id.startsWith("CF27_XBOXUNKNOWN_RTG_HEAD_")) ?? "";
    const csv = csvForRows([
      validRow({
        assignment_id: assignment.assignmentID,
        target_stable_id: target,
        category: "Head Template",
        final_disposition: "NOT_VERIFIED",
        evidence_exists: "yes",
        front_view_exists: "yes",
        secondary_angle_sample_included: "yes"
      })
    ]);

    const report = validateSecondVerifierResultsImport(csv, assignment);

    expect(report.ok).toBe(true);
    expect(report.importable).toBe(true);
    expect(report.rowCount).toBe(1);
  });

  it("rejects verified rows without required evidence and unknown targets", () => {
    const assignment = readAssignment();
    const csv = csvForRows([
      validRow({
        assignment_id: assignment.assignmentID,
        target_stable_id: "CF27_UNKNOWN_TARGET",
        final_disposition: "VERIFIED",
        evidence_exists: "no",
        front_view_exists: "no",
        secondary_angle_sample_included: "no"
      })
    ]);

    const report = validateSecondVerifierResultsImport(csv, assignment);

    expect(report.ok).toBe(false);
    expect(report.importable).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["unknownTarget", "verifiedWithoutEvidence"]));
  });

  it("rejects packages that claim verification or expose primary counts", () => {
    const assignment = readAssignment();
    const compromised = {
      ...assignment,
      verificationHasOccurred: true,
      verificationStatus: "VERIFIED",
      independentCountingForms: [
        {
          ...assignment.independentCountingForms[0],
          primaryCountHiddenUntilComparison: false,
          primaryCount: 99
        }
      ]
    };

    const report = validateSecondVerifierAssignmentPackage(compromised);

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "assignmentClaimsVerification",
      "verificationAlreadyOccurred",
      "countFormPrimaryDataExposed",
      "primaryCountFieldPresent"
    ]));
  });
});

function readAssignment() {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/phase-zero/verification_assignment.json"), "utf8"));
}

function validRow(overrides: Partial<Record<(typeof phase0VerifierResultsColumns)[number], string>> = {}) {
  return {
    assignment_id: "phase0-second-verifier-assignment-test-only",
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
    resolution_evidence_ids: "",
    notes: "test-only verifier import row",
    ...overrides
  };
}

function csvForRows(rows: Array<Record<(typeof phase0VerifierResultsColumns)[number], string>>) {
  return [
    phase0VerifierResultsColumns.join(","),
    ...rows.map((row) => phase0VerifierResultsColumns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n");
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}
