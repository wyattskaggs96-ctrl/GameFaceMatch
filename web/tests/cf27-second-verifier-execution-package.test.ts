import { describe, expect, it } from "vitest";

type VerifierPackageFile = {
  content: string;
  relativePath: string;
};

type VerifierExecutionPackage = {
  packageData: {
    schemaVersion: string;
    productionStatus: string;
    verificationStatus: string;
    verificationHasOccurred: boolean;
    productionRecommendationsEnabled: boolean;
    primaryReviewConclusionsWithheldForBlindPhase: boolean;
    allowedStatuses: string[];
    samplingMethod: {
      methodID: string;
      seedInput: string;
      eligibleCandidateCount: number;
      selectedCandidateCount: number;
    };
    dashboard: {
      assigned: number;
      completed: number;
      disagreement: number;
      blocked: number;
      productionEligible: number;
      secondVerifiedRecords: number;
      productionApprovedRecords: number;
      primaryReviewAloneCanPublish: boolean;
    };
  };
  files: VerifierPackageFile[];
  validation: {
    ok: boolean;
    errors: Array<{ code: string }>;
  };
};

const {
  buildSecondVerifierExecutionPackage,
  createDeterministicSecondaryAngleSample,
  validateSecondVerifierExecutionPackage
} = await import("../../scripts/cf27-second-verifier-execution-package.mjs" as string) as {
  buildSecondVerifierExecutionPackage: (input: {
    root: string;
    verifierID?: string;
  }) => VerifierExecutionPackage;
  createDeterministicSecondaryAngleSample: (input: {
    candidates: Array<{
      candidateID: string;
      category: string;
      evidenceIDs: string[];
      sourceTimestampRange: string;
      readyForVerifierEvidenceReview: boolean;
    }>;
    environmentID: string;
    verifierID: string;
    catalogVersion: string;
  }) => {
    method: { selectedCandidateCount: number; seedInput: string };
    rows: Array<{ candidateID: string; category: string; selectionHash: string }>;
  };
  validateSecondVerifierExecutionPackage: (input: {
    packageData: VerifierExecutionPackage["packageData"];
    files: VerifierPackageFile[];
    candidates: Array<{ productionEligible?: boolean; productionRecommendationsEnabled?: boolean }>;
  }) => { ok: boolean; errors: Array<{ code: string }> };
};

describe("CF27 second-verifier execution package", () => {
  it("builds an executable non-production package for the current 92-record verifier queue", () => {
    const pkg = buildSecondVerifierExecutionPackage({
      root: repositoryRoot(),
      verifierID: "second-verifier-test-only"
    });
    const paths = new Set(pkg.files.map((file) => file.relativePath));

    expect(pkg.validation.ok).toBe(true);
    expect(pkg.packageData).toMatchObject({
      schemaVersion: "cf27-second-verifier-execution-package-v1",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "NOT_VERIFIED",
      verificationHasOccurred: false,
      productionRecommendationsEnabled: false,
      primaryReviewConclusionsWithheldForBlindPhase: true
    });
    expect(pkg.packageData.dashboard).toMatchObject({
      assigned: 92,
      completed: 0,
      disagreement: 0,
      productionEligible: 0,
      secondVerifiedRecords: 0,
      productionApprovedRecords: 0,
      primaryReviewAloneCanPublish: false
    });
    for (const requiredPath of [
      "data/phase-zero/second-verifier-execution-package/environment_worksheet.csv",
      "data/phase-zero/second-verifier-execution-package/independent_menu_map_worksheet.csv",
      "data/phase-zero/second-verifier-execution-package/independent_counts_worksheet.csv",
      "data/phase-zero/second-verifier-execution-package/native_order_worksheet.csv",
      "data/phase-zero/second-verifier-execution-package/record_level_comparison_worksheet.csv",
      "data/phase-zero/second-verifier-execution-package/front_view_checks.csv",
      "data/phase-zero/second-verifier-execution-package/secondary_angle_sample.csv",
      "data/phase-zero/second-verifier-execution-package/duplicate_exception_review.csv",
      "data/phase-zero/second-verifier-execution-package/discrepancy_form.csv",
      "data/phase-zero/second-verifier-execution-package/sign_off_form.csv",
      "data/phase-zero/second-verifier-execution-package/verifier_import_template.csv",
      "data/phase-zero/second-verifier-execution-package/verifier_dashboard.json"
    ]) {
      expect(paths.has(requiredPath), requiredPath).toBe(true);
    }
  });

  it("keeps blind worksheets free of primary-review conclusions", () => {
    const pkg = buildSecondVerifierExecutionPackage({
      root: repositoryRoot(),
      verifierID: "second-verifier-test-only"
    });
    const blindContent = pkg.files
      .filter((file) => /independent_counts|independent_menu_map|environment_worksheet|native_order_worksheet/.test(file.relativePath))
      .map((file) => file.content)
      .join("\n");

    expect(blindContent).not.toMatch(/PRIMARY_APPROVED|DUPLICATE_REVIEW_REQUIRED|primaryReviewStatus|primaryApprovedWithNotes/);
    expect(blindContent).toContain("BLIND_INDEPENDENT_COUNTS");
  });

  it("uses deterministic category-aware 25 percent secondary-angle sampling", () => {
    const candidates = [
      candidate("a-1", "Heads"),
      candidate("a-2", "Heads"),
      candidate("a-3", "Heads"),
      candidate("a-4", "Heads"),
      candidate("b-1", "Skin Tone"),
      candidate("b-2", "Skin Tone"),
      candidate("b-3", "Skin Tone"),
      candidate("b-4", "Skin Tone")
    ];
    const first = createDeterministicSecondaryAngleSample({
      candidates,
      environmentID: "env-test-only",
      verifierID: "verifier-test-only",
      catalogVersion: "catalog-test-only"
    });
    const second = createDeterministicSecondaryAngleSample({
      candidates,
      environmentID: "env-test-only",
      verifierID: "verifier-test-only",
      catalogVersion: "catalog-test-only"
    });
    const changedVerifier = createDeterministicSecondaryAngleSample({
      candidates,
      environmentID: "env-test-only",
      verifierID: "different-verifier-test-only",
      catalogVersion: "catalog-test-only"
    });

    expect(first.rows).toEqual(second.rows);
    expect(first.method.selectedCandidateCount).toBe(2);
    expect(first.rows.filter((row) => row.category === "Heads")).toHaveLength(1);
    expect(first.rows.filter((row) => row.category === "Skin Tone")).toHaveLength(1);
    expect(first.rows.map((row) => row.selectionHash)).not.toEqual(changedVerifier.rows.map((row) => row.selectionHash));
  });

  it("rejects any package that tries to make primary-reviewed records production eligible", () => {
    const pkg = buildSecondVerifierExecutionPackage({
      root: repositoryRoot(),
      verifierID: "second-verifier-test-only"
    });
    const compromised = {
      ...pkg.packageData,
      dashboard: {
        ...pkg.packageData.dashboard,
        productionEligible: 1
      }
    };
    const report = validateSecondVerifierExecutionPackage({
      packageData: compromised,
      files: pkg.files,
      candidates: [{ productionEligible: false, productionRecommendationsEnabled: false }]
    });

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("productionEligibleFromPrimaryReview");
  });
});

function candidate(candidateID: string, category: string) {
  return {
    candidateID,
    category,
    evidenceIDs: [`evidence-${candidateID}`],
    sourceTimestampRange: "0-1",
    readyForVerifierEvidenceReview: true
  };
}

function repositoryRoot() {
  return new URL("../..", import.meta.url).pathname;
}
