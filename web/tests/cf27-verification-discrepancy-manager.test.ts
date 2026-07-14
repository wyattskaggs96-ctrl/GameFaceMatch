import path from "node:path";
import { describe, expect, it } from "vitest";

type ManagerState = {
  productionStatus: string;
  productionRecommendationsEnabled: boolean;
  summary: {
    discrepancyCount: number;
    openTaskCount: number;
    resolvedTaskCount: number;
    verifiedStatusBlocked: boolean;
  };
  resolutionTasks: Array<{
    discrepancyID: string;
    exactDisputedOption: string;
    currentStatus: string;
    resolutionState: string;
    primaryObservation: { value: string; evidenceIDs: string[] };
    verifierObservation: { value: string; evidenceIDs: string[] };
    evidenceOnBothSides: { bothSidesHaveEvidence: boolean };
    requiredConsoleRecheck: string;
    requiredRecapture: { required: boolean; requiredViews: string[] };
    supersededEvidenceIDs: string[];
    resolutionEvidenceIDs: string[];
    acknowledgment: { acknowledgmentsComplete: boolean };
    resolution: { accepted: boolean; rejectionReason: string } | null;
  }>;
  recordStatusUpdates: Array<{
    targetStableID: string;
    status: string;
    unresolvedDiscrepancyIDs: string[];
    resolvedDiscrepancyIDs: string[];
  }>;
  validation: { ok: boolean; errors: Array<{ code: string }>; warnings: Array<{ code: string }> };
};

const {
  buildVerificationDiscrepancyManagement
} = await import("../../scripts/cf27-verification-discrepancy-manager.mjs" as string) as {
  buildVerificationDiscrepancyManagement: (input: {
    root: string;
    intakeState: Record<string, unknown>;
    resolutionEvidence?: Record<string, unknown>;
    managedAt: string;
  }) => { managerState: ManagerState };
};

describe("CF27 verification discrepancy manager", () => {
  it("creates resolution tasks that preserve primary and verifier observations without resolving them", () => {
    const state = buildVerificationDiscrepancyManagement({
      root: repositoryRoot(),
      intakeState: intakeState([
        discrepancy({
          discrepancyID: "disc-cf27-xboxunknown-rtg-head-001-order-mismatch-2",
          targetStableID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
          discrepancyType: "order_mismatch",
          primaryValue: "1",
          verifierValue: "2"
        }),
        discrepancy({
          discrepancyID: "disc-cf27-menu-head-skin-head-template-count-mismatch-3",
          targetStableID: "cf27-menu-head-skin-head-template",
          discrepancyType: "count_mismatch",
          primaryValue: "26",
          verifierValue: "27"
        })
      ]),
      managedAt: "2026-07-14T05:00:00.000Z"
    }).managerState;

    expect(state.validation.ok).toBe(true);
    expect(state).toMatchObject({
      productionStatus: "NOT_PRODUCTION_DATA",
      productionRecommendationsEnabled: false
    });
    expect(state.summary).toMatchObject({
      discrepancyCount: 2,
      openTaskCount: 2,
      resolvedTaskCount: 0,
      verifiedStatusBlocked: true
    });
    expect(state.resolutionTasks.map((task) => task.currentStatus)).toEqual(expect.arrayContaining(["ORDER_MISMATCH", "COUNT_MISMATCH"]));
    expect(state.resolutionTasks.every((task) => task.resolutionState === "OPEN_RECHECK_REQUIRED")).toBe(true);
    expect(state.resolutionTasks.every((task) => task.primaryObservation.value && task.verifierObservation.value)).toBe(true);
    expect(state.resolutionTasks.every((task) => task.requiredConsoleRecheck.length > 0 && task.requiredRecapture.required)).toBe(true);
    expect(state.recordStatusUpdates.every((update) => update.status !== "VERIFIED" && update.status !== "VERIFIED_WITH_NOTES")).toBe(true);
  });

  it("preserves evidence on both sides and superseded evidence references", () => {
    const state = buildVerificationDiscrepancyManagement({
      root: repositoryRoot(),
      intakeState: intakeState([
        discrepancy({
          discrepancyID: "disc-cf27-xboxunknown-rtg-skintone-001-visual-mismatch-2",
          targetStableID: "CF27_XBOXUNKNOWN_RTG_SKINTONE_001",
          discrepancyType: "visual_mismatch",
          primaryValue: "Skin Tone 01",
          verifierValue: "Verifier saw different visual result",
          evidenceIDs: ["second-verifier-frame-test-only"]
        })
      ]),
      managedAt: "2026-07-14T05:00:00.000Z"
    }).managerState;
    const task = state.resolutionTasks[0];

    expect(task.exactDisputedOption).toBe("Skin Tone 01");
    expect(task.evidenceOnBothSides.bothSidesHaveEvidence).toBe(true);
    expect(task.primaryObservation.evidenceIDs.length).toBeGreaterThan(0);
    expect(task.verifierObservation.evidenceIDs).toEqual(["second-verifier-frame-test-only"]);
    expect(task.supersededEvidenceIDs).toEqual(expect.arrayContaining([
      "second-verifier-frame-test-only",
      ...task.primaryObservation.evidenceIDs
    ]));
    expect(task.requiredRecapture.requiredViews).toEqual(expect.arrayContaining(["MENU_FULL_SCREEN", "FRONT"]));
  });

  it("rejects proposed verified resolutions without direct evidence and both acknowledgments", () => {
    const state = buildVerificationDiscrepancyManagement({
      root: repositoryRoot(),
      intakeState: intakeState([
        discrepancy({ discrepancyID: "disc-head-missing-evidence", discrepancyType: "missing_evidence" })
      ]),
      resolutionEvidence: {
        resolutions: [
          {
            discrepancyID: "disc-head-missing-evidence",
            status: "VERIFIED",
            resolutionNotes: "test-only unsupported resolution"
          }
        ]
      },
      managedAt: "2026-07-14T05:00:00.000Z"
    }).managerState;
    const task = state.resolutionTasks[0];

    expect(task.currentStatus).toBe("MISSING_EVIDENCE");
    expect(task.resolutionState).toBe("OPEN_RECHECK_REQUIRED");
    expect(task.resolution?.accepted).toBe(false);
    expect(task.resolution?.rejectionReason).toContain("direct evidence");
    expect(state.recordStatusUpdates[0].status).toBe("MISSING_EVIDENCE");
  });

  it("resolves only when approved status, direct evidence, and both-party acknowledgments exist", () => {
    const state = buildVerificationDiscrepancyManagement({
      root: repositoryRoot(),
      intakeState: intakeState([
        discrepancy({ discrepancyID: "disc-head-order-resolved", discrepancyType: "order_mismatch" })
      ]),
      resolutionEvidence: {
        resolutions: [
          {
            discrepancyID: "disc-head-order-resolved",
            status: "VERIFIED_WITH_NOTES",
            resolutionEvidenceIDs: ["direct-console-recheck-test-only"],
            primaryAcknowledgedAt: "2026-07-14T05:10:00.000Z",
            verifierAcknowledgedAt: "2026-07-14T05:11:00.000Z",
            resolutionNotes: "Direct console recheck resolved the order disagreement."
          }
        ]
      },
      managedAt: "2026-07-14T05:00:00.000Z"
    }).managerState;
    const task = state.resolutionTasks[0];

    expect(task.resolutionState).toBe("RESOLVED_WITH_DIRECT_EVIDENCE");
    expect(task.currentStatus).toBe("VERIFIED_WITH_NOTES");
    expect(task.resolutionEvidenceIDs).toEqual(["direct-console-recheck-test-only"]);
    expect(task.acknowledgment.acknowledgmentsComplete).toBe(true);
    expect(state.summary).toMatchObject({
      openTaskCount: 0,
      resolvedTaskCount: 1,
      verifiedStatusBlocked: false
    });
    expect(state.recordStatusUpdates[0]).toMatchObject({
      status: "VERIFIED_WITH_NOTES",
      unresolvedDiscrepancyIDs: [],
      resolvedDiscrepancyIDs: ["disc-head-order-resolved"]
    });
  });

  it("uses only approved status values for tasks and record updates", () => {
    const state = buildVerificationDiscrepancyManagement({
      root: repositoryRoot(),
      intakeState: intakeState([
        discrepancy({ discrepancyID: "disc-dependency", discrepancyType: "dependency_mismatch" }),
        discrepancy({ discrepancyID: "disc-version", discrepancyType: "version_mismatch" }),
        discrepancy({ discrepancyID: "disc-menu", discrepancyType: "menu_mismatch" })
      ]),
      managedAt: "2026-07-14T05:00:00.000Z"
    }).managerState;
    const allowed = new Set([
      "VERIFIED",
      "VERIFIED_WITH_NOTES",
      "RECAPTURE_REQUIRED",
      "VERSION_MISMATCH",
      "MISSING_EVIDENCE",
      "COUNT_MISMATCH",
      "ORDER_MISMATCH",
      "DEPENDENCY_UNRESOLVED",
      "NOT_VERIFIED"
    ]);

    expect(state.validation.ok).toBe(true);
    expect(state.resolutionTasks.every((task) => allowed.has(task.currentStatus))).toBe(true);
    expect(state.recordStatusUpdates.every((update) => allowed.has(update.status))).toBe(true);
  });
});

function repositoryRoot() {
  return path.resolve(process.cwd(), "..");
}

function intakeState(discrepancies: Array<Record<string, unknown>>) {
  return {
    schemaVersion: "cf27-second-verifier-results-intake-v1",
    dataClass: "SECOND_VERIFIER_RESULTS_INTAKE",
    productionStatus: "NOT_PRODUCTION_DATA",
    status: "DISCREPANCIES_OPENED",
    discrepancies
  };
}

function discrepancy(overrides: Record<string, unknown> = {}) {
  return {
    discrepancyID: "disc-cf27-xboxunknown-rtg-head-001-order-mismatch-2",
    targetStableID: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
    rowNumber: 2,
    discrepancyType: "order_mismatch",
    primaryValue: "1",
    verifierValue: "2",
    status: "OPEN_UNRESOLVED",
    severity: "blocking",
    evidenceIDs: ["second-verifier-evidence-test-only"],
    openedAt: "2026-07-14T04:30:00.000Z",
    resolutionAction: null,
    notes: "test-only discrepancy",
    ...overrides
  };
}
