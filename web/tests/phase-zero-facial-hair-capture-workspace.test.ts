import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addFacialHairCaptureEntry,
  addFacialHairDoubleCountRun,
  assignFacialHairStableID,
  createEmptyFacialHairCaptureWorkspace,
  createFacialHairCaptureEntry,
  detectFacialHairRecaptureNeeds,
  PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS,
  PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS,
  PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS,
  validateFacialHairCaptureWorkspace,
  type Phase0FacialHairCaptureEntry,
  type Phase0FacialHairCaptureWorkspace
} from "@/lib/phase-zero/phase-zero-facial-hair-capture-workspace";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 facial-hair capture workspace", () => {
  it("documents the machine-readable facial-hair workspace schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/facial-hair-capture-workspace.schema.json"), "utf8"));
    for (const field of ["doubleCountRuns", "entries", "canonicalCaptureConfigurationHash", "platformCode", "modeCode", "menuMapID"]) {
      expect(schema.required).toContain(field);
    }
    for (const field of [
      "stableInternalID",
      "nativeOrder",
      "nativeCategoryLabel",
      "visibleGameLabelOrIndex",
      "isNoneOption",
      "canonicalHeadStableID",
      "canonicalHeadConfirmed",
      "canonicalHairstyleStableID",
      "canonicalHairstyleConfirmed",
      "facialHairColor",
      "fullScreenMenuEvidenceIDs",
      "viewEvidence",
      "dependencies",
      "coverageMetadata",
      "observations",
      "recaptureRequests",
      "captureCompletionStatus",
      "verificationStatus",
      "catalogManagerDisposition"
    ]) {
      expect(schema.$defs.facialHairEntry.required).toContain(field);
    }
  });

  it("assigns stable facial-hair IDs from platform, mode, and native order", () => {
    expect(assignFacialHairStableID("ps5", "rtg", 7)).toBe("CF27_PS5_RTG_FACIALHAIR_007");
    expect(assignFacialHairStableID("PS5", "ROAD TO GLORY", 12)).toBe("CF27_PS5_ROADTOGLORY_FACIALHAIR_012");
  });

  it("requires inclusion of the None option", () => {
    const workspace = workspaceWithEntries([completeEntry({ isNoneOption: false, facialHairColor: "synthetic-color" })]);
    const report = validateFacialHairCaptureWorkspace(workspace);

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingNoneOption");
  });

  it("allows a complete None option with not-applicable color", () => {
    const entry = completeEntry({
      isNoneOption: true,
      facialHairColor: null,
      coverageMetadata: {
        metadataID: "coverage-none-synthetic",
        standardizedCoverage: "none",
        obscuresJawline: false,
        obscuresMouth: false,
        coverageNotes: "Synthetic None option coverage."
      }
    });
    const report = validateFacialHairCaptureWorkspace(workspaceWithEntries([entry]));

    expect(report.ok).toBe(true);
    expect(report.productionCompletionAllowed).toBe(true);
  });

  it("blocks production completion when double-count runs are missing or disagree", () => {
    const missing = addFacialHairCaptureEntry(baseWorkspace(), completeEntry({ isNoneOption: true }), now);
    expect(validateFacialHairCaptureWorkspace(missing).errors.map((error) => error.code)).toContain("missingDoubleCountRuns");

    let mismatch = baseWorkspace();
    mismatch = addFacialHairDoubleCountRun(mismatch, doubleCountRun(1, 1), now);
    mismatch = addFacialHairDoubleCountRun(mismatch, doubleCountRun(2, 2), now);
    mismatch = addFacialHairCaptureEntry(mismatch, completeEntry({ isNoneOption: true }), now);
    const report = validateFacialHairCaptureWorkspace(mismatch);
    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("doubleCountMismatch");
  });

  it("blocks production completion when required evidence or canonical setup is missing", () => {
    const entry = completeEntry({ isNoneOption: true });
    entry.viewEvidence = entry.viewEvidence.filter((evidence) => evidence.viewID !== "rightProfile");
    entry.fullScreenMenuEvidenceIDs = [];
    entry.canonicalHeadConfirmed = false;
    entry.canonicalHairstyleConfirmed = false;
    const report = validateFacialHairCaptureWorkspace(workspaceWithEntries([entry]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingFullScreenMenuEvidence",
      "missingRequiredFacialHairViewEvidence",
      "canonicalHeadNotConfirmed",
      "canonicalHairstyleNotConfirmed"
    ]));
  });

  it("requires facial-hair color for non-None entries", () => {
    const report = validateFacialHairCaptureWorkspace(workspaceWithEntries([completeEntry({ isNoneOption: false, facialHairColor: null })]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("missingFacialHairColor");
  });

  it("requires dependency and observation evidence", () => {
    const entry = completeEntry({ isNoneOption: true });
    entry.dependencies = entry.dependencies.filter((dependency) => dependency.kind !== "unlock");
    entry.dependencies[0].evidenceFileIDs = [];
    entry.observations = entry.observations.filter((observation) => observation.kind !== "colorControl");
    entry.observations[0].evidenceFileIDs = [];
    const report = validateFacialHairCaptureWorkspace(workspaceWithEntries([entry]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingDependencyRecord",
      "missingDependencyEvidence",
      "missingObservationRecord",
      "missingObservationEvidence"
    ]));
  });

  it("detects missing views and blocks open recapture requests", () => {
    const entry = completeEntry({ isNoneOption: true });
    entry.viewEvidence = entry.viewEvidence.filter((evidence) => evidence.viewID !== "leftProfile");
    entry.recaptureRequests = [{
      requestID: "recapture-synthetic",
      viewID: "rightProfile",
      reason: "Synthetic blur issue.",
      status: "open",
      evidenceFileIDs: ["evidence-rightProfile"],
      notes: "Open synthetic recapture."
    }];
    const report = validateFacialHairCaptureWorkspace(workspaceWithEntries([entry]));

    expect(detectFacialHairRecaptureNeeds(entry).map((request) => request.viewID)).toEqual(expect.arrayContaining(["leftProfile", "rightProfile"]));
    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingRequiredFacialHairViewEvidence",
      "openRecaptureRequest"
    ]));
  });

  it("rejects accepted catalog-manager disposition before verification", () => {
    const entry = completeEntry({
      isNoneOption: true,
      catalogManagerDisposition: "accepted",
      verificationStatus: "secondReviewPending"
    });
    const report = validateFacialHairCaptureWorkspace(workspaceWithEntries([entry]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("catalogDispositionRequiresVerification");
  });
});

function baseWorkspace(): Phase0FacialHairCaptureWorkspace {
  return createEmptyFacialHairCaptureWorkspace({
    workspaceID: "facial-hair-workspace-synthetic",
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

function workspaceWithEntries(entries: Phase0FacialHairCaptureEntry[]): Phase0FacialHairCaptureWorkspace {
  let workspace = baseWorkspace();
  workspace = addFacialHairDoubleCountRun(workspace, doubleCountRun(1, entries.length), now);
  workspace = addFacialHairDoubleCountRun(workspace, doubleCountRun(2, entries.length), now);
  for (const entry of entries) {
    workspace = addFacialHairCaptureEntry(workspace, entry, now);
  }
  return workspace;
}

function completeEntry(overrides: Partial<Phase0FacialHairCaptureEntry> = {}): Phase0FacialHairCaptureEntry {
  return {
    ...createFacialHairCaptureEntry({
      platformCode: "SYNTHETIC",
      modeCode: "SYNTHETICMODE",
      nativeOrder: 1,
      nativeCategoryLabel: "synthetic-native-category",
      visibleGameLabelOrIndex: "synthetic-visible-label",
      isNoneOption: false,
      nowISO: now
    }),
    canonicalHeadStableID: "CF27_SYNTHETIC_SYNTHETICMODE_HEAD_001",
    canonicalHeadConfirmed: true,
    canonicalHairstyleStableID: "CF27_SYNTHETIC_SYNTHETICMODE_HAIR_001",
    canonicalHairstyleConfirmed: true,
    facialHairColor: "synthetic-facial-hair-color",
    fullScreenMenuEvidenceIDs: ["evidence-menu-full"],
    viewEvidence: PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.map((viewID) => ({
      evidenceFileID: `evidence-${viewID}`,
      viewID,
      sourceVideoID: "source-video-synthetic",
      sourceVideoTimestamp: `00:00:0${PHASE0_REQUIRED_FACIAL_HAIR_CAPTURE_VIEW_IDS.indexOf(viewID)}`,
      notes: `Synthetic ${viewID} facial-hair evidence.`
    })),
    dependencies: PHASE0_REQUIRED_FACIAL_HAIR_DEPENDENCY_KINDS.map((kind) => ({
      dependencyID: `dependency-${kind}`,
      kind,
      observedValue: `synthetic-${kind}-value`,
      evidenceFileIDs: [`evidence-${kind}`],
      notes: `Synthetic ${kind} dependency.`
    })),
    coverageMetadata: {
      metadataID: "coverage-synthetic",
      standardizedCoverage: "mixed",
      obscuresJawline: true,
      obscuresMouth: false,
      coverageNotes: "Synthetic coverage metadata."
    },
    observations: PHASE0_REQUIRED_FACIAL_HAIR_OBSERVATION_KINDS.map((kind) => ({
      observationID: `observation-${kind}`,
      kind,
      observedState: `synthetic-${kind}-state`,
      evidenceFileIDs: [`evidence-${kind}`],
      notes: `Synthetic ${kind} observation.`
    })),
    captureCompletionStatus: "complete",
    verificationStatus: "verified",
    catalogManagerDisposition: "readyForReview",
    notes: "Synthetic complete facial-hair capture entry.",
    ...overrides
  };
}

function doubleCountRun(runNumber: number, observedCount: number) {
  return {
    runID: `facial-hair-double-count-${runNumber}`,
    runNumber,
    observedCount,
    startedAt: now,
    completedAt: now,
    sourceVideoEvidenceID: `facial-hair-count-video-${runNumber}`,
    notes: `Synthetic facial-hair count run ${runNumber}.`
  };
}
