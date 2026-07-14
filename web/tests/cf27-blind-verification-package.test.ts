import { describe, expect, it } from "vitest";

type BlindPackageFile = {
  content: string;
  relativePath: string;
};

type BlindWorksheet = {
  primaryCountsWithheld?: boolean;
  rows: Array<Record<string, string>>;
};

type BlindPackageData = {
  schemaVersion: string;
  dataClass: string;
  productionStatus: string;
  verificationStatus: string;
  verificationHasOccurred: boolean;
  primaryCountsWithheld: boolean;
  productionRecommendationsEnabled: boolean;
  independentCountWorksheet: BlindWorksheet;
  menuMapWorksheet: BlindWorksheet;
  importFormat: { requiredColumns: string[] };
  dataEntryTemplate: { columns: string[] };
};

type BlindPackage = {
  packageData: BlindPackageData;
  files: BlindPackageFile[];
  validation: { ok: boolean };
};

const {
  buildBlindVerificationPackage,
  formatBlindVerifierInstructions,
  formatBlindVerifierPrintablePacket,
  validateBlindVerificationPackage
} = await import("../../scripts/cf27-blind-verification-package.mjs" as string) as {
  buildBlindVerificationPackage: (options: { root: string }) => BlindPackage;
  formatBlindVerifierInstructions: (packageData: BlindPackageData) => string;
  formatBlindVerifierPrintablePacket: (packageData: BlindPackageData) => string;
  validateBlindVerificationPackage: (input: {
    files: BlindPackageFile[];
    packageData: BlindPackageData;
  }) => { ok: boolean; errors: Array<{ code: string }> };
};

const forbiddenPrimaryCountPattern =
  /primaryCount(?!sWithheld)|primaryFinalCount|primaryTotal|totalResearchCatalogRecords|directlyObservedUniqueHeadTemplates/;
const forbiddenPrimaryHeadPattern = /CF27_XBOXUNKNOWN_RTG_HEAD_\d{3}|Face\s+\d+/;

describe("CF27 blind verification package", () => {
  it("builds a non-production package that does not claim verification", () => {
    const pkg = buildBlindVerificationPackage({ root: repositoryRoot() });

    expect(pkg.validation.ok).toBe(true);
    expect(pkg.packageData).toMatchObject({
      schemaVersion: "cf27-blind-verification-package-v1",
      dataClass: "BLIND_SECOND_VERIFIER_PACKAGE",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "NOT_VERIFIED",
      verificationHasOccurred: false,
      primaryCountsWithheld: true,
      productionRecommendationsEnabled: false
    });
  });

  it("withholds primary counts, primary head IDs, and primary head labels", () => {
    const pkg = buildBlindVerificationPackage({ root: repositoryRoot() });
    const combined = [
      JSON.stringify(pkg.packageData),
      ...pkg.files.map((file) => file.content),
      formatBlindVerifierInstructions(pkg.packageData),
      formatBlindVerifierPrintablePacket(pkg.packageData)
    ].join("\n");

    expect(combined).not.toMatch(forbiddenPrimaryCountPattern);
    expect(combined).not.toMatch(forbiddenPrimaryHeadPattern);
    expect(combined).toContain("Do not look at the primary catalog counts");
    expect(pkg.packageData.independentCountWorksheet.primaryCountsWithheld).toBe(true);
    expect(pkg.packageData.menuMapWorksheet.primaryCountsWithheld).toBe(true);
  });

  it("includes the required blind verifier forms and import format", () => {
    const pkg = buildBlindVerificationPackage({ root: repositoryRoot() });
    const paths = new Set(pkg.files.map((file) => file.relativePath));
    const countLabels = pkg.packageData.independentCountWorksheet.rows.map((row: Record<string, string>) => row.target_label);

    for (const requiredPath of [
      "data/phase-zero/blind-verification-package/blind_verification_package.json",
      "data/phase-zero/blind-verification-package/environment_form.csv",
      "data/phase-zero/blind-verification-package/creation_path_worksheet.csv",
      "data/phase-zero/blind-verification-package/menu_map_worksheet.csv",
      "data/phase-zero/blind-verification-package/independent_count_worksheet.csv",
      "data/phase-zero/blind-verification-package/evidence_review_form.csv",
      "data/phase-zero/blind-verification-package/discrepancy_form.csv",
      "data/phase-zero/blind-verification-package/sign_off_form.csv",
      "data/phase-zero/blind-verification-package/data_entry_template.csv",
      "data/phase-zero/blind-verification-package/import_format.json"
    ]) {
      expect(paths.has(requiredPath), requiredPath).toBe(true);
    }
    expect(countLabels).toEqual(expect.arrayContaining([
      "Head Templates",
      "Hairstyles",
      "Facial Hair",
      "Hair Colors",
      "Skin Tone",
      "Eye Color",
      "Nose",
      "Ear Shape"
    ]));
    expect(pkg.packageData.importFormat.requiredColumns).toEqual(pkg.packageData.dataEntryTemplate.columns);
    expect(pkg.packageData.importFormat.requiredColumns.some((column: string) => column.toLowerCase().includes("primary"))).toBe(false);
  });

  it("rejects injected primary data and production recommendation access", () => {
    const pkg = buildBlindVerificationPackage({ root: repositoryRoot() });
    const compromised: BlindPackageData = {
      ...pkg.packageData,
      productionRecommendationsEnabled: true,
      independentCountWorksheet: {
        ...pkg.packageData.independentCountWorksheet,
        rows: [
          ...pkg.packageData.independentCountWorksheet.rows,
          {
            target_id: "compromised-primary-row",
            target_label: "Face 1",
            primaryCount: "99"
          }
        ]
      }
    };
    const report = validateBlindVerificationPackage({ files: pkg.files, packageData: compromised });

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "primaryCountLeak",
      "primaryHeadRecordLeak",
      "productionRecommendationAccess"
    ]));
  });

  it("keeps menu-map worksheets to menu discovery rather than option records", () => {
    const pkg = buildBlindVerificationPackage({ root: repositoryRoot() });

    expect(pkg.packageData.menuMapWorksheet.rows.length).toBeGreaterThan(0);
    expect(pkg.packageData.menuMapWorksheet.rows.every((row: Record<string, string>) =>
      !forbiddenPrimaryHeadPattern.test(row.displayed_label_to_find) &&
      !forbiddenPrimaryHeadPattern.test(row.menu_id)
    )).toBe(true);
    expect(pkg.packageData.menuMapWorksheet.rows.some((row: Record<string, string>) =>
      row.displayed_label_to_find === "Any extra appearance category visible"
    )).toBe(true);
  });
});

function repositoryRoot() {
  return new URL("../..", import.meta.url).pathname;
}
