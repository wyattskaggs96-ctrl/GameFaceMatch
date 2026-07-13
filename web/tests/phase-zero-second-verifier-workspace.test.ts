import { describe, expect, it } from "vitest";
import {
  addSecondVerifierRecordCheck,
  createEmptySecondVerifierWorkspace,
  createSecondVerifierCountCheck,
  createSecondVerifierRecordCheck,
  exportSecondPersonVerificationRecords,
  getAllowedSecondVerifierStatuses,
  signOffSecondVerifierWorkspace,
  validateSecondVerifierWorkspace,
  type Phase0SecondVerifierWorkspace
} from "@/lib/phase-zero/phase-zero-second-verifier-workspace";
import { approvedPhase0VerificationStatuses, validatePhase0SecondPersonVerification } from "@/lib/phase-zero/phase-zero-verification";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 second-verifier workspace", () => {
  it("requires a verifier environment before sign-off", () => {
    const workspace = createEmptySecondVerifierWorkspace({
      workspaceID: "second-verifier-test-only",
      verifierID: "second-verifier-test-only",
      nowISO: now
    });

    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(false);
    expect(report.signOffReady).toBe(false);
    expect(codes(report.errors)).toContain("missingVerifierEnvironmentField");
    expect(codes(report.errors)).toContain("missingVerifierEnvironmentEvidence");
  });

  it("accepts independent menu counts, catalog counts, and record checks", () => {
    const workspace = addSecondVerifierRecordCheck(validWorkspace(), validRecordCheck(), now);
    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(true);
    expect(report.signOffReady).toBe(true);
    expect(report.summary).toMatchObject({
      recordCount: 1,
      independentlyCheckedRecords: 1,
      countMismatches: 0,
      recordMismatches: 0,
      evidenceFailures: 0,
      frontViewFailures: 0,
      secondaryAngleFailures: 0
    });
  });

  it("does not allow the verifier to reuse the primary researcher identity", () => {
    const workspace = addSecondVerifierRecordCheck(
      validWorkspace(),
      validRecordCheck({
        primaryObserverID: "same-reviewer",
        verifierObserverID: "same-reviewer"
      }),
      now
    );

    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(false);
    expect(report.signOffReady).toBe(false);
    expect(codes(report.errors)).toContain("sameVerifierAsPrimary");
  });

  it("reports menu and catalog count mismatches as blockers", () => {
    const workspace = {
      ...validWorkspace(),
      menuCountChecks: [createSecondVerifierCountCheck({ checkID: "menu-count-test-only", label: "Head menu", primaryCount: 12, verifierCount: 11 })],
      catalogCountChecks: [createSecondVerifierCountCheck({ checkID: "catalog-count-test-only", label: "Head catalog", primaryCount: 12, verifierCount: 13 })],
      recordChecks: [validRecordCheck()]
    };
    const report = validateSecondVerifierWorkspace(workspace);

    expect(report.ok).toBe(false);
    expect(report.summary.countMismatches).toBe(2);
    expect(codes(report.errors)).toEqual(expect.arrayContaining(["menuCountMismatch", "catalogCountMismatch"]));
  });

  it("creates mismatch reports for native-order, record, evidence, angle, dependency, and exception failures", () => {
    const workspace = addSecondVerifierRecordCheck(
      validWorkspace(),
      validRecordCheck({
        statuses: {
          nativeOrderStatus: "mismatch",
          recordFieldsStatus: "mismatch",
          evidenceFilesStatus: "mismatch",
          frontViewStatus: "mismatch",
          secondaryAngleStatus: "mismatch",
          dependencyStatus: "mismatch",
          exceptionStatus: "mismatch"
        },
        finalDisposition: "NOT_VERIFIED"
      }),
      now
    );

    expect(workspace.mismatchReports.map((report) => report.kind)).toEqual(expect.arrayContaining([
      "nativeOrderMismatch",
      "recordMismatch",
      "evidenceMismatch",
      "frontViewMissing",
      "secondaryAngleMissing",
      "dependencyMismatch",
      "exceptionMismatch"
    ]));
    const report = validateSecondVerifierWorkspace(workspace);
    expect(report.signOffReady).toBe(false);
    expect(report.summary.blockingMismatchReports).toBeGreaterThan(0);
  });

  it("exports second-person verification records using only approved statuses", () => {
    const workspace = addSecondVerifierRecordCheck(validWorkspace(), validRecordCheck({ finalDisposition: "VERIFIED_WITH_NOTES" }), now);
    const exported = exportSecondPersonVerificationRecords(workspace);

    expect(getAllowedSecondVerifierStatuses()).toEqual([...approvedPhase0VerificationStatuses]);
    expect(exported).toHaveLength(1);
    expect(exported[0].finalDisposition).toBe("VERIFIED_WITH_NOTES");
    expect(validatePhase0SecondPersonVerification(exported[0]).publishable).toBe(true);
  });

  it("blocks sign-off when required checks are incomplete", () => {
    const workspace = addSecondVerifierRecordCheck(
      validWorkspace(),
      validRecordCheck({
        statuses: {
          nativeOrderStatus: "notChecked",
          recordFieldsStatus: "confirmed",
          evidenceFilesStatus: "confirmed",
          frontViewStatus: "confirmed",
          secondaryAngleStatus: "confirmed",
          dependencyStatus: "notApplicable",
          exceptionStatus: "notApplicable"
        }
      }),
      now
    );
    const signed = signOffSecondVerifierWorkspace({
      workspace,
      verifierID: "second-verifier-test-only",
      notes: "test-only sign-off attempt",
      signedOffAt: now
    });
    const report = validateSecondVerifierWorkspace(signed);

    expect(report.signOffReady).toBe(false);
    expect(codes(report.errors)).toContain("signOffBlocked");
  });
});

function validWorkspace(): Phase0SecondVerifierWorkspace {
  return {
    ...createEmptySecondVerifierWorkspace({
      workspaceID: "second-verifier-test-only",
      verifierID: "second-verifier-test-only",
      nowISO: now
    }),
    environment: {
      verifierEnvironmentID: "second-verifier-environment-test-only",
      verifierID: "second-verifier-test-only",
      observedAt: now,
      platform: "test-only-platform",
      gameVersion: "test-only-game-version",
      patchVersion: "test-only-patch",
      gameMode: "test-only-mode",
      creationPath: "test-only-creation-path",
      evidenceFileIDs: ["environment-evidence-test-only"],
      notes: "test-only environment"
    },
    menuCountChecks: [createSecondVerifierCountCheck({ checkID: "menu-count-test-only", label: "Head menu", primaryCount: 2, verifierCount: 2 })],
    catalogCountChecks: [createSecondVerifierCountCheck({ checkID: "catalog-count-test-only", label: "Head catalog", primaryCount: 2, verifierCount: 2 })]
  };
}

function validRecordCheck(overrides: Partial<Parameters<typeof createSecondVerifierRecordCheck>[0]> = {}) {
  return createSecondVerifierRecordCheck({
    recordID: "record-check-test-only",
    stableInternalID: "CF27_TESTONLY_SECOND_VERIFIER_HEAD_001",
    primaryObserverID: "primary-reviewer-test-only",
    primarySummary: "Primary test-only observation.",
    verifierObserverID: "second-reviewer-test-only",
    verifierSummary: "Independent second-verifier test-only observation.",
    evidenceIDs: ["evidence-front-test-only", "evidence-secondary-angle-test-only"],
    observedAt: now,
    statuses: {
      nativeOrderStatus: "confirmed",
      recordFieldsStatus: "confirmed",
      evidenceFilesStatus: "confirmed",
      frontViewStatus: "confirmed",
      secondaryAngleStatus: "confirmed",
      dependencyStatus: "notApplicable",
      exceptionStatus: "notApplicable"
    },
    randomizationMethod: "test-only deterministic secondary-angle sample list",
    finalDisposition: "VERIFIED",
    notes: "test-only second verification",
    primaryAcknowledgedAt: now,
    verifierAcknowledgedAt: now,
    ...overrides
  });
}

function codes(reportIssues: Array<{ code: string }>) {
  return reportIssues.map((issue) => issue.code);
}
