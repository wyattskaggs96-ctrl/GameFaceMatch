import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildVerifierExportPackage,
  calculateVerifierProgress,
  createInitialVerifierDraft,
  getVerifierCompletionErrors,
  type SupportedSubsetVerifierPackage
} from "@/lib/verifier/cf27-supported-subset-verifier";

// @ts-expect-error Root CF27 verifier-session CLI is plain ESM JavaScript and is exercised here as the import contract.
import * as sessionModule from "../../scripts/cf27-supported-subset-verifier-session.mjs";

const { validateCompletedVerifierDecisionExport } = sessionModule;
const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 supported-subset browser verifier workflow", () => {
  it("starts empty, keeps decisions non-production, and blocks incomplete export", () => {
    const pkg = readPackage();
    const state = createInitialVerifierDraft(pkg, new Date("2026-08-07T12:00:00.000Z"));

    expect(pkg.candidateDetails).toHaveLength(76);
    expect(calculateVerifierProgress(pkg, state)).toMatchObject({ total: 76, completed: 0, remaining: 76 });
    expect(getVerifierCompletionErrors(pkg, state)).toEqual(expect.arrayContaining([
      "Environment is missing verifierId.",
      `${pkg.candidateDetails[0].candidateID} is not complete.`
    ]));
    expect(Object.values(state.decisions).every((decision) => decision.productionEligibilityState === "NOT_ELIGIBLE")).toBe(true);
  });

  it("exports a completed human-shaped package that validates as non-production Prompt 103 input", () => {
    const pkg = readPackage();
    const state = createInitialVerifierDraft(pkg, new Date("2026-08-07T12:00:00.000Z"));
    state.environment = {
      ...state.environment,
      verifierId: "friend-human-verifier-105",
      verificationDate: "2026-08-07",
      platform: "Xbox",
      consoleModel: "Xbox Series X",
      gameVersion: "unknown",
      patchOrInstalledUpdate: "unknown",
      independentlyAccessedShippingGame: true,
      environmentEvidenceReference: "verifier-console-visible"
    };
    state.attestation = {
      ...state.attestation,
      verifierId: "friend-human-verifier-105",
      attestationTimestamp: "2026-08-07T13:00:00.000Z",
      attestationAccepted: true,
      realSecondPerson: true,
      independentlyAccessedShippingGame: true,
      didNotMerelyApprovePrimarySummary: true,
      reviewedCandidateAndEvidencePresented: true,
      recordedDisagreementsHonestly: true,
      didNotGuessMissingLabelsOrderCountsOrViews: true,
      understandsNotPublishingCatalog: true,
      understandsCatalogManagerApprovalSeparate: true
    };
    for (const candidate of pkg.candidateDetails) {
      state.decisions[candidate.candidateID] = {
        ...state.decisions[candidate.candidateID],
        independentObservation: `Independently checked ${candidate.candidateID}.`,
        candidateIdentityConfirmed: "yes",
        nativeLabelConfirmed: "yes",
        nativeIndexConfirmed: "yes",
        nativeOrderConfirmed: "yes",
        evidenceFilesResolve: "yes",
        frontViewConfirmed: "yes",
        secondaryAngleReviewed: candidate.deterministicSecondaryAngleSampleRequired ? "yes" : "not_selected",
        menuCountConfirmed: "yes",
        duplicateRelationshipConfirmed: candidate.duplicateFlag ? "yes" : "not_applicable",
        environmentCompatible: "yes",
        decisionStatus: "VERIFIED",
        decisionTimestamp: "2026-08-07T13:00:00.000Z"
      };
    }
    for (const targetID of Object.keys(state.menuCounts)) {
      state.menuCounts[targetID] = {
        ...state.menuCounts[targetID],
        independentVerifierCount: state.menuCounts[targetID].representedInSupportedSubset === "yes" ? "1" : "unknown",
        countConfirmed: state.menuCounts[targetID].representedInSupportedSubset === "yes" ? "yes" : "uncertain",
        notes: `${state.menuCounts[targetID].notes} Browser verifier test completion.`
      };
    }
    for (const candidateID of Object.keys(state.secondaryAngles)) {
      state.secondaryAngles[candidateID] = {
        ...state.secondaryAngles[candidateID],
        reviewed: "yes",
        verifierObservation: `Reviewed sample angle for ${candidateID}.`,
        result: "confirmed"
      };
    }
    for (const candidateID of Object.keys(state.duplicateOrderRows)) {
      state.duplicateOrderRows[candidateID] = {
        ...state.duplicateOrderRows[candidateID],
        verifierDisposition: "preserve limitation",
        verifierObservation: "Excluded row remains non-production."
      };
    }

    expect(getVerifierCompletionErrors(pkg, state)).toEqual([]);
    expect(calculateVerifierProgress(pkg, state)).toMatchObject({ completed: 76, remaining: 0 });

    const exportPackage = buildVerifierExportPackage(pkg, state, new Date("2026-08-07T13:05:00.000Z"));
    const validation = validateCompletedVerifierDecisionExport(exportPackage, { root: repositoryRoot });

    expect(validation.ok).toBe(true);
    expect(validation.importState).toBe("IMPORTED_NON_PRODUCTION");
    expect(validation.summary).toMatchObject({
      decisionCount: 76,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      recommendationEligibleRecords: 0
    });
  });
});

function readPackage(): SupportedSubsetVerifierPackage {
  const packageRoot = path.join(repositoryRoot, "data/phase-zero/supported-subset-verifier-session");
  return {
    sessionManifest: readJSON(packageRoot, "session_manifest.json"),
    candidateDetails: readRows(packageRoot, "candidate_detail_reference.json"),
    recordDecisionTemplate: readRows(packageRoot, "record_decisions_template.json"),
    menuCountTemplate: readRows(packageRoot, "menu_counts_template.json"),
    secondaryAngleTemplate: readRows(packageRoot, "secondary_angle_sample_review.json"),
    duplicateOrderTemplate: readRows(packageRoot, "excluded_duplicate_order_review.json"),
    exportTemplate: readJSON(packageRoot, "verifier_decision_export_template.json")
  };
}

function readRows(packageRoot: string, fileName: string) {
  return readJSON(packageRoot, fileName).rows;
}

function readJSON(packageRoot: string, fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, fileName), "utf8"));
}
