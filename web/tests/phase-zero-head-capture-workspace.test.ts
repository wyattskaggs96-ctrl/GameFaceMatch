import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addHeadCaptureEntry,
  addHeadDoubleCountRun,
  assignHeadStableID,
  createEmptyHeadCaptureWorkspace,
  createHeadCaptureEntry,
  PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS,
  validateHeadCaptureWorkspace,
  type Phase0HeadCaptureEntry,
  type Phase0HeadCaptureWorkspace
} from "@/lib/phase-zero/phase-zero-head-capture-workspace";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 head-capture workspace", () => {
  it("documents the machine-readable workspace schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/head-capture-workspace.schema.json"), "utf8"));
    for (const field of ["doubleCountRuns", "entries", "canonicalCaptureConfigurationHash", "platformCode", "modeCode", "menuMapID"]) {
      expect(schema.required).toContain(field);
    }
    for (const field of [
      "stableInternalID",
      "nativeOrder",
      "selectorWrapBehavior",
      "lockStatus",
      "entitlementDependency",
      "forcedAttributes",
      "canonicalSettingsConfirmed",
      "fullScreenMenuEvidenceIDs",
      "viewEvidence",
      "duplicateObservations",
      "captureCompletionStatus",
      "verificationStatus",
      "catalogManagerDisposition"
    ]) {
      expect(schema.$defs.headEntry.required).toContain(field);
    }
  });

  it("assigns stable head IDs from platform, mode, and native order", () => {
    expect(assignHeadStableID("ps5", "rtg", 7)).toBe("CF27_PS5_RTG_HEAD_007");
    expect(assignHeadStableID("PS5", "ROAD TO GLORY", 12)).toBe("CF27_PS5_ROADTOGLORY_HEAD_012");
  });

  it("blocks production completion when double-count runs are missing or disagree", () => {
    const missing = addHeadCaptureEntry(baseWorkspace(), completeEntry(), now);
    expect(validateHeadCaptureWorkspace(missing).errors.map((error) => error.code)).toContain("missingDoubleCountRuns");

    let mismatch = baseWorkspace();
    mismatch = addHeadDoubleCountRun(mismatch, doubleCountRun(1, 1), now);
    mismatch = addHeadDoubleCountRun(mismatch, doubleCountRun(2, 2), now);
    mismatch = addHeadCaptureEntry(mismatch, completeEntry(), now);
    const report = validateHeadCaptureWorkspace(mismatch);
    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("doubleCountMismatch");
  });

  it("blocks production completion when required evidence is missing", () => {
    const entry = completeEntry();
    entry.viewEvidence = entry.viewEvidence.filter((evidence) => evidence.viewID !== "elevated");
    entry.fullScreenMenuEvidenceIDs = [];
    entry.canonicalSettingsConfirmed = false;
    const report = validateHeadCaptureWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingFullScreenMenuEvidence",
      "missingRequiredHeadViewEvidence",
      "canonicalSettingsNotConfirmed"
    ]));
  });

  it("records lock, entitlement, forced attributes, source timestamps, duplicates, and catalog disposition", () => {
    const entry = completeEntry({
      lockStatus: "entitlementDependent",
      entitlementDependency: "synthetic-entitlement",
      forcedAttributes: ["synthetic-forced-attribute"],
      duplicateObservations: [{
        observationID: "duplicate-synthetic",
        kind: "nearDuplicate",
        comparedStableID: "CF27_SYNTHETIC_SYNTHETICMODE_HEAD_002",
        evidenceFileIDs: ["evidence-duplicate"],
        notes: "Synthetic near-duplicate observation."
      }],
      catalogManagerDisposition: "accepted",
      verificationStatus: "verified"
    });
    const report = validateHeadCaptureWorkspace(workspaceWithEntry(entry));

    expect(report.ok).toBe(true);
    expect(report.productionCompletionAllowed).toBe(true);
    expect(entry.viewEvidence.every((evidence) => evidence.sourceVideoTimestamp)).toBe(true);
  });

  it("rejects accepted catalog-manager disposition before verification", () => {
    const entry = completeEntry({
      catalogManagerDisposition: "accepted",
      verificationStatus: "secondReviewPending"
    });
    const report = validateHeadCaptureWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("catalogDispositionRequiresVerification");
  });
});

function baseWorkspace(): Phase0HeadCaptureWorkspace {
  return createEmptyHeadCaptureWorkspace({
    workspaceID: "head-workspace-synthetic",
    gameID: "game-synthetic",
    platformCode: "SYNTHETIC",
    modeCode: "SYNTHETICMODE",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    creationPathID: "creation-path-synthetic",
    menuMapID: "menu-map-synthetic",
    nowISO: now
  });
}

function workspaceWithEntry(entry: Phase0HeadCaptureEntry): Phase0HeadCaptureWorkspace {
  let workspace = baseWorkspace();
  workspace = addHeadDoubleCountRun(workspace, doubleCountRun(1, 1), now);
  workspace = addHeadDoubleCountRun(workspace, doubleCountRun(2, 1), now);
  return addHeadCaptureEntry(workspace, entry, now);
}

function completeEntry(overrides: Partial<Phase0HeadCaptureEntry> = {}): Phase0HeadCaptureEntry {
  return {
    ...createHeadCaptureEntry({
      platformCode: "SYNTHETIC",
      modeCode: "SYNTHETICMODE",
      nativeOrder: 1,
      visibleGameLabelOrIndex: "synthetic-visible-label",
      nowISO: now
    }),
    selectorWrapBehavior: "wraps",
    lockStatus: "unlocked",
    canonicalSettingsConfirmed: true,
    canonicalSettingsHash: "gfm-capture-v1-synthetic",
    fullScreenMenuEvidenceIDs: ["evidence-menu-full"],
    viewEvidence: PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.map((viewID) => ({
      evidenceFileID: `evidence-${viewID}`,
      viewID,
      sourceVideoID: "source-video-synthetic",
      sourceVideoTimestamp: `00:00:0${PHASE0_REQUIRED_HEAD_CAPTURE_VIEW_IDS.indexOf(viewID)}`,
      notes: `Synthetic ${viewID} evidence.`
    })),
    captureCompletionStatus: "complete",
    verificationStatus: "verified",
    catalogManagerDisposition: "readyForReview",
    notes: "Synthetic complete head capture entry.",
    ...overrides
  };
}

function doubleCountRun(runNumber: number, observedCount: number) {
  return {
    runID: `double-count-${runNumber}`,
    runNumber,
    observedCount,
    startedAt: now,
    completedAt: now,
    sourceVideoEvidenceID: `count-video-${runNumber}`,
    notes: `Synthetic count run ${runNumber}.`
  };
}
