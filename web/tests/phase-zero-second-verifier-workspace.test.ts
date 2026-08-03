import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addSecondVerifierRecordCheck,
  acknowledgeDiscrepancyResolution,
  applySecondaryAngleSampleToWorkspace,
  createDeterministicSecondaryAngleSample,
  createEmptySecondVerifierWorkspace,
  createSecondVerifierCountCheck,
  createSecondVerifierRecordCheck,
  exportDiscrepancyResolutionRecords,
  exportSecondPersonVerificationRecords,
  getAllowedSecondVerifierStatuses,
  linkDiscrepancyResolutionEvidence,
  openDiscrepancyResolutionWorkflow,
  recordDiscrepancyFinalResolution,
  signOffSecondVerifierWorkspace,
  upsertDiscrepancyResolutionWorkflow,
  validateDiscrepancyResolutionWorkflow,
  validateSecondVerifierWorkspace,
  type Phase0SecondVerifierWorkspace
} from "@/lib/phase-zero/phase-zero-second-verifier-workspace";
import {
  createVerifierDecisionDraft,
  defaultCf27VerifierQueueFilters,
  exportVerifierDecisionDrafts,
  filterVerificationQueueRecords,
  getAllowedCf27VerifierDecisionStatuses,
  getNextUnresolvedCandidate,
  getVerifierProgressCounts,
  importVerifierDecisionDrafts,
  queueRecordsForSecondaryAngleSampling,
  validateVerifierDecisionDraft,
  validateVerifierDecisionSet,
  type Cf27VerifierDecisionDraft,
  type Cf27ProductionVerificationQueue
} from "@/lib/phase-zero/cf27-production-verification-queue";
import { approvedPhase0VerificationStatuses, validatePhase0DiscrepancyResolution, validatePhase0SecondPersonVerification } from "@/lib/phase-zero/phase-zero-verification";

const now = "2026-07-12T00:00:00.000Z";
const currentQueue = readCurrentProductionVerificationQueue();

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

  it("selects a stable deterministic 25 percent secondary-angle sample by category", async () => {
    const sample = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const repeated = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });

    expect(sample.selectedRecords.map((record) => record.stableInternalID)).toEqual(repeated.selectedRecords.map((record) => record.stableInternalID));
    expect(sample.methodID).toBe("deterministic-sha256-category-quartile-v1");
    expect(sample.seedInput).toBe("environment-test-only+second-reviewer-test-only+catalog-version-test-only");
    expect(sample.categories.map((category) => ({
      category: category.category,
      eligibleCount: category.eligibleCount,
      requiredSampleSize: category.requiredSampleSize,
      selectedCount: category.selectedCount
    }))).toEqual([
      { category: "facialHair", eligibleCount: 1, requiredSampleSize: 1, selectedCount: 1 },
      { category: "hairstyle", eligibleCount: 4, requiredSampleSize: 1, selectedCount: 1 },
      { category: "head", eligibleCount: 5, requiredSampleSize: 2, selectedCount: 2 }
    ]);
    expect(sample.selectedCount).toBe(4);
    expect(sample.humanReadableReport).toContain("Seed input: environment-test-only+second-reviewer-test-only+catalog-version-test-only");
    expect(sample.humanReadableReport).toContain("Category coverage:");
  });

  it("does not allow cherry-picking by input order", async () => {
    const first = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const reordered = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: [...eligibleRecords()].reverse()
    });

    expect(reordered.selectedRecords.map((record) => record.stableInternalID)).toEqual(first.selectedRecords.map((record) => record.stableInternalID));
    expect(reordered.selectedRecords.map((record) => record.hash)).toEqual(first.selectedRecords.map((record) => record.hash));
  });

  it("changes the sample when the deterministic seed changes", async () => {
    const first = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const changed = await createDeterministicSecondaryAngleSample({
      seed: { ...sampleSeed(), verifierID: "different-second-reviewer-test-only" },
      eligibleRecords: eligibleRecords()
    });

    expect(changed.seedInput).not.toBe(first.seedInput);
    expect(changed.selectedRecords.map((record) => record.hash)).not.toEqual(first.selectedRecords.map((record) => record.hash));
  });

  it("stores the sample report on the verifier workspace", async () => {
    const sample = await createDeterministicSecondaryAngleSample({
      seed: sampleSeed(),
      eligibleRecords: eligibleRecords()
    });
    const workspace = applySecondaryAngleSampleToWorkspace({
      workspace: validWorkspace(),
      sample,
      updatedAt: now
    });

    expect(workspace.secondaryAngleSample?.seed).toEqual(sampleSeed());
    expect(workspace.secondaryAngleSample?.selectedRecords.every((record) => record.hashInput.includes(record.stableInternalID))).toBe(true);
    expect(workspace.signedOffAt).toBeNull();
  });

  it("opens a discrepancy workflow from a mismatch while preserving both observations", () => {
    const mismatchedWorkspace = addSecondVerifierRecordCheck(
      validWorkspace(),
      validRecordCheck({
        primarySummary: "Primary counted the synthetic record as option one.",
        verifierSummary: "Verifier counted the same synthetic record as option two.",
        statuses: { recordFieldsStatus: "mismatch" },
        finalDisposition: "NOT_VERIFIED"
      }),
      now
    );
    const workflowWorkspace = openDiscrepancyResolutionWorkflow({
      workspace: mismatchedWorkspace,
      mismatchID: "record-check-test-only-recordFieldsStatus-mismatch",
      openedBy: "catalog-manager-test-only",
      openedAt: now
    });
    const workflow = workflowWorkspace.discrepancyWorkflows[0];

    expect(workflow.affectedRecordIDs).toEqual(["record-check-test-only"]);
    expect(workflow.affectedStableInternalIDs).toEqual(["CF27_TESTONLY_SECOND_VERIFIER_HEAD_001"]);
    expect(workflow.primaryObservation.summary).toBe("Primary counted the synthetic record as option one.");
    expect(workflow.verifierObservation.summary).toBe("Verifier counted the same synthetic record as option two.");
    expect(workflow.auditHistory.map((event) => event.kind)).toContain("discrepancyOpened");
  });

  it("blocks unresolved discrepancies until new direct evidence, recaptures, resolution, and both acknowledgments exist", () => {
    const workflowWorkspace = openDiscrepancyResolutionWorkflow({
      workspace: mismatchWorkspace(),
      mismatchID: "record-check-test-only-recordFieldsStatus-mismatch",
      openedBy: "catalog-manager-test-only",
      openedAt: now
    });

    const workflowReport = validateDiscrepancyResolutionWorkflow(workflowWorkspace.discrepancyWorkflows[0]);
    const workspaceReport = validateSecondVerifierWorkspace(workflowWorkspace);

    expect(workflowReport.ok).toBe(false);
    expect(workflowReport.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingNewDirectEvidence",
      "missingRecaptureEvidence",
      "missingResolutionAction",
      "missingFinalResolution",
      "missingDiscrepancyAcknowledgment",
      "missingAuditEvent"
    ]));
    expect(workspaceReport.signOffReady).toBe(false);
    expect(workspaceReport.summary.unresolvedDiscrepancyWorkflows).toBe(1);
  });

  it("resolves a discrepancy with new evidence, recapture links, state update, acknowledgments, and immutable history", () => {
    const workspace = resolveMismatchWorkspace();
    const workflow = workspace.discrepancyWorkflows[0];
    const report = validateSecondVerifierWorkspace(workspace);

    expect(validateDiscrepancyResolutionWorkflow(workflow).ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.signOffReady).toBe(true);
    expect(report.summary.blockingMismatchReports).toBe(0);
    expect(report.summary.unresolvedDiscrepancyWorkflows).toBe(0);
    expect(workflow.auditHistory.map((event) => event.kind)).toEqual([
      "discrepancyOpened",
      "directEvidenceLinked",
      "recaptureLinked",
      "supersededEvidencePreserved",
      "resolutionRecorded",
      "verificationStateUpdated",
      "primaryAcknowledged",
      "verifierAcknowledged"
    ]);
    expect(workflow.primaryObservation.summary).toBe("Primary mismatch observation.");
    expect(workflow.verifierObservation.summary).toBe("Verifier mismatch observation.");
  });

  it("exports a validated discrepancy-resolution record after both parties acknowledge", () => {
    const workspace = resolveMismatchWorkspace();
    const exported = exportDiscrepancyResolutionRecords(workspace);

    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({
      targetStableID: "CF27_TESTONLY_SECOND_VERIFIER_HEAD_001",
      discrepancyType: "other",
      resolutionAction: "recaptureEvidence",
      finalDisposition: "VERIFIED_WITH_NOTES"
    });
    expect(validatePhase0DiscrepancyResolution(exported[0]).publishable).toBe(true);
  });

  it("detects non-chronological or duplicated discrepancy audit history", () => {
    const workspace = resolveMismatchWorkspace();
    const workflow = workspace.discrepancyWorkflows[0];
    const brokenWorkflow = {
      ...workflow,
      auditHistory: [
        workflow.auditHistory[1],
        { ...workflow.auditHistory[1], occurredAt: now }
      ]
    };
    const report = validateDiscrepancyResolutionWorkflow(brokenWorkflow);

    expect(report.ok).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "duplicateAuditEvent",
      "auditHistoryNotChronological"
    ]));
  });

  it("loads the real Prompt 092 queue without treating records as production eligible", () => {
    const progress = getVerifierProgressCounts(currentQueue);

    expect(currentQueue.records).toHaveLength(92);
    expect(progress).toMatchObject({
      total: 92,
      draftSaved: 0,
      notVerified: 92,
      missingViews: 87,
      duplicateOrAmbiguous: 5,
      environmentGaps: 92,
      productionEligible: 0
    });
    expect(getAllowedCf27VerifierDecisionStatuses()).toEqual([...approvedPhase0VerificationStatuses]);
    expect(currentQueue.records.every((record) => record.currentProductionEligibility === "NOT_ELIGIBLE")).toBe(true);
  });

  it("filters the production-verification queue by category, missing views, duplicates, environment gaps, status, and search", () => {
    const headRows = filterVerificationQueueRecords(currentQueue.records, { ...defaultCf27VerifierQueueFilters, category: "Heads" });
    const duplicateRows = filterVerificationQueueRecords(currentQueue.records, { ...defaultCf27VerifierQueueFilters, duplicateOrAmbiguous: "yes" });
    const missingViewRows = filterVerificationQueueRecords(currentQueue.records, { ...defaultCf27VerifierQueueFilters, missingViews: "yes" });
    const noEnvironmentGapRows = filterVerificationQueueRecords(currentQueue.records, { ...defaultCf27VerifierQueueFilters, environmentGap: "no" });
    const searchRows = filterVerificationQueueRecords(currentQueue.records, { ...defaultCf27VerifierQueueFilters, search: "skin tone" });

    expect(headRows).toHaveLength(26);
    expect(duplicateRows).toHaveLength(5);
    expect(missingViewRows).toHaveLength(87);
    expect(noEnvironmentGapRows).toHaveLength(0);
    expect(searchRows.every((record) => /skin tone/i.test(record.category))).toBe(true);
    expect(getNextUnresolvedCandidate(currentQueue.records)?.secondVerifierStatus).toBe("NOT_VERIFIED");
  });

  it("requires attributable verifier decisions and notes for non-clean decisions", () => {
    const record = currentQueue.records.find((candidate) => candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED") ?? currentQueue.records[0];
    const incomplete = validateVerifierDecisionDraft(createVerifierDecisionDraft(record), record);
    const recaptureWithoutNotes = validateVerifierDecisionDraft(createVerifierDecisionDraft(record, {
      verifierID: "second-verifier-test-only",
      verificationDate: "2026-08-02",
      verifierEnvironment: "Xbox test-only environment",
      independentObservation: "Independent test-only observation.",
      evidenceConfirmed: true,
      nativeOrderConfirmed: true,
      frontViewConfirmed: true,
      secondaryAngleConfirmed: true,
      exceptionReviewed: true,
      decisionStatus: "RECAPTURE_REQUIRED"
    }), record);

    expect(incomplete.ok).toBe(false);
    expect(incomplete.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingVerifierID",
      "missingVerificationDate",
      "missingVerifierEnvironment",
      "missingIndependentObservation",
      "evidenceNotConfirmed",
      "nativeOrderNotConfirmed",
      "frontViewNotConfirmed",
      "secondaryAngleNotConfirmed"
    ]));
    expect(recaptureWithoutNotes.ok).toBe(false);
    expect(recaptureWithoutNotes.errors.map((error) => error.code)).toContain("missingNonCleanDecisionNotes");
  });

  it("allows draft export/import without production promotion", () => {
    const record = currentQueue.records[0];
    const draft = createVerifierDecisionDraft(record, {
      verifierID: "second-verifier-test-only",
      verificationDate: "2026-08-02",
      verifierEnvironment: "Xbox Series test-only environment",
      independentObservation: "Independent evidence check completed in test-only workflow.",
      evidenceConfirmed: true,
      nativeOrderConfirmed: true,
      frontViewConfirmed: true,
      secondaryAngleConfirmed: true,
      exceptionReviewed: true,
      decisionStatus: "VERIFIED",
      savedAt: "2026-08-02T00:00:00.000Z"
    });
    const csv = exportVerifierDecisionDrafts({ [record.stableCandidateID]: draft });
    const imported = importVerifierDecisionDrafts(csv, currentQueue);
    const setValidation = validateVerifierDecisionSet(currentQueue, imported.drafts);

    expect(imported.importable).toBe(true);
    expect(imported.drafts[record.stableCandidateID]).toMatchObject({
      verifierID: "second-verifier-test-only",
      decisionStatus: "VERIFIED",
      productionPromotionAttempted: false,
      productionEligibleAfterDraft: false
    });
    expect(setValidation.productionEligible).toBe(false);
    expect(getVerifierProgressCounts(currentQueue, imported.drafts).productionEligible).toBe(0);
  });

  it("rejects client-side draft manipulation that attempts production promotion", () => {
    const record = currentQueue.records[0];
    const manipulated = {
      ...createVerifierDecisionDraft(record, {
      verifierID: "second-verifier-test-only",
      verificationDate: "2026-08-02",
      verifierEnvironment: "Xbox test-only environment",
      independentObservation: "Independent test-only observation.",
      evidenceConfirmed: true,
      nativeOrderConfirmed: true,
      frontViewConfirmed: true,
      secondaryAngleConfirmed: true,
      exceptionReviewed: true,
      decisionStatus: "VERIFIED"
      }),
      productionPromotionAttempted: true,
      productionEligibleAfterDraft: true
    } as unknown as Cf27VerifierDecisionDraft;

    const report = validateVerifierDecisionDraft(manipulated, record);

    expect(report.ok).toBe(false);
    expect(report.productionEligible).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("draftAttemptedPromotion");
  });

  it("creates a deterministic secondary-angle sample from real queue records", async () => {
    const eligible = queueRecordsForSecondaryAngleSampling(currentQueue);
    const sample = await createDeterministicSecondaryAngleSample({
      seed: {
        environmentID: "cf27-test-only-environment",
        verifierID: "second-verifier-test-only",
        catalogVersion: currentQueue.generatedAt
      },
      eligibleRecords: eligible
    });

    expect(eligible.length).toBeGreaterThan(0);
    expect(sample.selectedCount).toBeGreaterThanOrEqual(Math.ceil(eligible.length / 4));
    expect(sample.selectedRecords.every((record) => eligible.some((eligibleRecord) => eligibleRecord.stableInternalID === record.stableInternalID))).toBe(true);
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

function mismatchWorkspace() {
  return addSecondVerifierRecordCheck(
    validWorkspace(),
    validRecordCheck({
      primarySummary: "Primary mismatch observation.",
      verifierSummary: "Verifier mismatch observation.",
      statuses: {
        nativeOrderStatus: "confirmed",
        recordFieldsStatus: "mismatch",
        evidenceFilesStatus: "confirmed",
        frontViewStatus: "confirmed",
        secondaryAngleStatus: "confirmed",
        dependencyStatus: "notApplicable",
        exceptionStatus: "notApplicable"
      },
      finalDisposition: "NOT_VERIFIED"
    }),
    now
  );
}

function resolveMismatchWorkspace() {
  let workspace = openDiscrepancyResolutionWorkflow({
    workspace: mismatchWorkspace(),
    mismatchID: "record-check-test-only-recordFieldsStatus-mismatch",
    openedBy: "catalog-manager-test-only",
    openedAt: now
  });
  let workflow = workspace.discrepancyWorkflows[0];
  workflow = linkDiscrepancyResolutionEvidence({
    workflow,
    actorID: "catalog-manager-test-only",
    occurredAt: "2026-07-12T00:01:00.000Z",
    directEvidenceIDs: ["new-direct-evidence-test-only"],
    recaptureFileIDs: ["recapture-front-test-only"],
    supersededEvidenceFileIDs: ["superseded-front-test-only"]
  });
  workflow = recordDiscrepancyFinalResolution({
    workflow,
    actorID: "catalog-manager-test-only",
    occurredAt: "2026-07-12T00:02:00.000Z",
    resolutionAction: "recaptureEvidence",
    finalResolution: "New synthetic evidence resolved the discrepancy without averaging observations.",
    finalDisposition: "VERIFIED_WITH_NOTES",
    verificationState: "verified"
  });
  workflow = acknowledgeDiscrepancyResolution({
    workflow,
    party: "primary",
    actorID: "primary-reviewer-test-only",
    occurredAt: "2026-07-12T00:03:00.000Z"
  });
  workflow = acknowledgeDiscrepancyResolution({
    workflow,
    party: "verifier",
    actorID: "second-reviewer-test-only",
    occurredAt: "2026-07-12T00:04:00.000Z"
  });
  workspace = upsertDiscrepancyResolutionWorkflow({
    workspace,
    workflow,
    updatedAt: "2026-07-12T00:04:00.000Z"
  });
  return workspace;
}

function codes(reportIssues: Array<{ code: string }>) {
  return reportIssues.map((issue) => issue.code);
}

function sampleSeed() {
  return {
    environmentID: "environment-test-only",
    verifierID: "second-reviewer-test-only",
    catalogVersion: "catalog-version-test-only"
  };
}

function eligibleRecords() {
  return [
    { stableInternalID: "CF27_TESTONLY_HEAD_001", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_002", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_003", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_004", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HEAD_005", category: "head" },
    { stableInternalID: "CF27_TESTONLY_HAIR_001", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_HAIR_002", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_HAIR_003", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_HAIR_004", category: "hairstyle" },
    { stableInternalID: "CF27_TESTONLY_FACIAL_HAIR_001", category: "facialHair" }
  ];
}

function readCurrentProductionVerificationQueue(): Cf27ProductionVerificationQueue {
  const queuePath = path.resolve(process.cwd(), "../data/phase-zero/production_verification_queue.json");
  return JSON.parse(fs.readFileSync(queuePath, "utf8")) as Cf27ProductionVerificationQueue;
}
