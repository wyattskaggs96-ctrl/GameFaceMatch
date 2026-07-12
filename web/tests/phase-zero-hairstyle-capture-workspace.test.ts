import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addHairstyleCaptureEntry,
  addHairstyleDoubleCountRun,
  assignHairstyleStableID,
  createEmptyHairstyleCaptureWorkspace,
  createHairstyleCaptureEntry,
  detectHairstyleRecaptureNeeds,
  PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS,
  PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS,
  validateHairstyleCaptureWorkspace,
  type Phase0HairstyleCaptureEntry,
  type Phase0HairstyleCaptureWorkspace
} from "@/lib/phase-zero/phase-zero-hairstyle-capture-workspace";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 hairstyle-capture workspace", () => {
  it("documents the machine-readable hairstyle workspace schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/hairstyle-capture-workspace.schema.json"), "utf8"));
    for (const field of ["doubleCountRuns", "entries", "canonicalCaptureConfigurationHash", "platformCode", "modeCode", "menuMapID"]) {
      expect(schema.required).toContain(field);
    }
    for (const field of [
      "stableInternalID",
      "nativeOrder",
      "nativeCategoryLabel",
      "visibleGameLabelOrIndex",
      "canonicalHeadStableID",
      "canonicalHeadConfirmed",
      "canonicalHairColor",
      "fullScreenMenuEvidenceIDs",
      "viewEvidence",
      "dependencies",
      "researcherVisualMetadata",
      "recaptureRequests",
      "captureCompletionStatus",
      "verificationStatus",
      "catalogManagerDisposition"
    ]) {
      expect(schema.$defs.hairstyleEntry.required).toContain(field);
    }
  });

  it("assigns stable hairstyle IDs from platform, mode, and native order", () => {
    expect(assignHairstyleStableID("ps5", "rtg", 7)).toBe("CF27_PS5_RTG_HAIR_007");
    expect(assignHairstyleStableID("PS5", "ROAD TO GLORY", 12)).toBe("CF27_PS5_ROADTOGLORY_HAIR_012");
  });

  it("blocks production completion when double-count runs are missing or disagree", () => {
    const missing = addHairstyleCaptureEntry(baseWorkspace(), completeEntry(), now);
    expect(validateHairstyleCaptureWorkspace(missing).errors.map((error) => error.code)).toContain("missingDoubleCountRuns");

    let mismatch = baseWorkspace();
    mismatch = addHairstyleDoubleCountRun(mismatch, doubleCountRun(1, 1), now);
    mismatch = addHairstyleDoubleCountRun(mismatch, doubleCountRun(2, 2), now);
    mismatch = addHairstyleCaptureEntry(mismatch, completeEntry(), now);
    const report = validateHairstyleCaptureWorkspace(mismatch);
    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("doubleCountMismatch");
  });

  it("blocks production completion when required views, menu evidence, or canonical setup are missing", () => {
    const entry = completeEntry();
    entry.viewEvidence = entry.viewEvidence.filter((evidence) => evidence.viewID !== "rear");
    entry.fullScreenMenuEvidenceIDs = [];
    entry.canonicalHeadConfirmed = false;
    entry.canonicalHairColor = "";
    const report = validateHairstyleCaptureWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingFullScreenMenuEvidence",
      "missingRequiredHairstyleViewEvidence",
      "canonicalHeadNotConfirmed",
      "missingHairstyleField"
    ]));
  });

  it("requires all dependency kinds with evidence", () => {
    const entry = completeEntry();
    entry.dependencies = entry.dependencies.filter((dependency) => dependency.kind !== "unlock");
    entry.dependencies[0].evidenceFileIDs = [];
    const report = validateHairstyleCaptureWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingDependencyRecord",
      "missingDependencyEvidence"
    ]));
  });

  it("stores researcher visual metadata separately from native labels", () => {
    const entry = completeEntry({
      nativeCategoryLabel: "synthetic-native-category",
      visibleGameLabelOrIndex: "synthetic-native-label"
    });
    entry.researcherVisualMetadata = {
      metadataID: "metadata-synthetic",
      standardizedHairLength: "medium",
      standardizedHairTexture: "wavy",
      obscuresForehead: true,
      obscuresEars: false,
      silhouetteNotes: "Synthetic silhouette notes separate from native game label.",
      visualNotes: "Synthetic visual annotation from researcher review."
    };
    const report = validateHairstyleCaptureWorkspace(workspaceWithEntry(entry));

    expect(report.ok).toBe(true);
    expect(report.productionCompletionAllowed).toBe(true);
    expect(entry.researcherVisualMetadata.visualNotes).not.toContain(entry.visibleGameLabelOrIndex);
  });

  it("detects missing views and blocks open recapture requests", () => {
    const entry = completeEntry();
    entry.viewEvidence = entry.viewEvidence.filter((evidence) => evidence.viewID !== "leftProfile");
    entry.recaptureRequests = [{
      requestID: "recapture-synthetic",
      viewID: "rightProfile",
      reason: "Synthetic blur issue.",
      status: "open",
      evidenceFileIDs: ["evidence-rightProfile"],
      notes: "Open synthetic recapture."
    }];
    const report = validateHairstyleCaptureWorkspace(workspaceWithEntry(entry));

    expect(detectHairstyleRecaptureNeeds(entry).map((request) => request.viewID)).toEqual(expect.arrayContaining(["leftProfile", "rightProfile"]));
    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingRequiredHairstyleViewEvidence",
      "openRecaptureRequest"
    ]));
  });

  it("rejects accepted catalog-manager disposition before verification", () => {
    const entry = completeEntry({
      catalogManagerDisposition: "accepted",
      verificationStatus: "secondReviewPending"
    });
    const report = validateHairstyleCaptureWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("catalogDispositionRequiresVerification");
  });
});

function baseWorkspace(): Phase0HairstyleCaptureWorkspace {
  return createEmptyHairstyleCaptureWorkspace({
    workspaceID: "hairstyle-workspace-synthetic",
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

function workspaceWithEntry(entry: Phase0HairstyleCaptureEntry): Phase0HairstyleCaptureWorkspace {
  let workspace = baseWorkspace();
  workspace = addHairstyleDoubleCountRun(workspace, doubleCountRun(1, 1), now);
  workspace = addHairstyleDoubleCountRun(workspace, doubleCountRun(2, 1), now);
  return addHairstyleCaptureEntry(workspace, entry, now);
}

function completeEntry(overrides: Partial<Phase0HairstyleCaptureEntry> = {}): Phase0HairstyleCaptureEntry {
  return {
    ...createHairstyleCaptureEntry({
      platformCode: "SYNTHETIC",
      modeCode: "SYNTHETICMODE",
      nativeOrder: 1,
      nativeCategoryLabel: "synthetic-native-category",
      visibleGameLabelOrIndex: "synthetic-visible-label",
      nowISO: now
    }),
    canonicalHeadStableID: "CF27_SYNTHETIC_SYNTHETICMODE_HEAD_001",
    canonicalHeadConfirmed: true,
    canonicalHairColor: "synthetic-canonical-hair-color",
    fullScreenMenuEvidenceIDs: ["evidence-menu-full"],
    viewEvidence: PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.map((viewID) => ({
      evidenceFileID: `evidence-${viewID}`,
      viewID,
      sourceVideoID: "source-video-synthetic",
      sourceVideoTimestamp: `00:00:0${PHASE0_REQUIRED_HAIRSTYLE_CAPTURE_VIEW_IDS.indexOf(viewID)}`,
      notes: `Synthetic ${viewID} hairstyle evidence.`
    })),
    dependencies: PHASE0_REQUIRED_HAIRSTYLE_DEPENDENCY_KINDS.map((kind) => ({
      dependencyID: `dependency-${kind}`,
      kind,
      observedValue: `synthetic-${kind}-value`,
      evidenceFileIDs: [`evidence-${kind}`],
      notes: `Synthetic ${kind} dependency.`
    })),
    researcherVisualMetadata: {
      metadataID: "metadata-synthetic",
      standardizedHairLength: "medium",
      standardizedHairTexture: "wavy",
      obscuresForehead: false,
      obscuresEars: false,
      silhouetteNotes: "Synthetic silhouette notes.",
      visualNotes: "Synthetic visual metadata."
    },
    captureCompletionStatus: "complete",
    verificationStatus: "verified",
    catalogManagerDisposition: "readyForReview",
    notes: "Synthetic complete hairstyle capture entry.",
    ...overrides
  };
}

function doubleCountRun(runNumber: number, observedCount: number) {
  return {
    runID: `hairstyle-double-count-${runNumber}`,
    runNumber,
    observedCount,
    startedAt: now,
    completedAt: now,
    sourceVideoEvidenceID: `hairstyle-count-video-${runNumber}`,
    notes: `Synthetic hairstyle count run ${runNumber}.`
  };
}
