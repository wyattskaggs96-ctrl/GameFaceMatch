import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addAdditionalAttributeEntry,
  assignAdditionalAttributeStableID,
  createAdditionalAttributeEntry,
  createEmptyAdditionalAttributesWorkspace,
  validateAdditionalAttributesWorkspace,
  type Phase0AdditionalAttributeEntry,
  type Phase0AdditionalAttributesWorkspace,
  type Phase0AdditionalControlType
} from "@/lib/phase-zero/phase-zero-additional-attributes-workspace";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 additional attributes workspace", () => {
  it("documents the machine-readable generic workspace schema fields", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/additional-attributes-workspace.schema.json"), "utf8"));
    for (const field of ["entries", "platformCode", "modeCode", "menuMapID", "creationPathID"]) {
      expect(schema.required).toContain(field);
    }
    for (const field of [
      "stableInternalID",
      "nativeCategoryLabel",
      "nativeControlLabel",
      "nativeOrder",
      "controlType",
      "range",
      "effects",
      "resetOnHeadChange",
      "laterVisibility",
      "recommendationSuitability",
      "stableIdentifierAvailability",
      "evidence",
      "dependencies",
      "verificationStatus",
      "catalogManagerDisposition"
    ]) {
      expect(schema.$defs.entry.required).toContain(field);
    }
  });

  it("assigns generic stable IDs from platform, mode, attribute code, and native order", () => {
    expect(assignAdditionalAttributeStableID("ps5", "rtg", "eye color", 7)).toBe("CF27_PS5_RTG_EYECOLOR_007");
  });

  it("starts blank and does not pre-populate confirmed categories", () => {
    const workspace = baseWorkspace();
    expect(workspace.entries).toEqual([]);
    expect(validateAdditionalAttributesWorkspace(workspace).productionCompletionAllowed).toBe(false);
  });

  it.each<Phase0AdditionalControlType>(["preset", "carousel", "numberedOptions", "namedOptions", "slider", "color", "toggle"])(
    "supports %s mechanics when evidence and review gates are complete",
    (controlType) => {
      const entry = completeEntry({ controlType });
      const report = validateAdditionalAttributesWorkspace(workspaceWithEntry(entry));

      expect(report.ok).toBe(true);
      expect(report.productionCompletionAllowed).toBe(true);
    }
  );

  it("blocks sliders without valid boundaries", () => {
    const entry = completeEntry({ controlType: "slider" });
    entry.range.minimum = 10;
    entry.range.maximum = 5;
    entry.range.step = 0;
    const report = validateAdditionalAttributesWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["invalidRange", "invalidStep"]));
  });

  it("blocks option controls without counts and color or toggle controls without defaults", () => {
    const optionEntry = completeEntry({ controlType: "carousel" });
    optionEntry.range.count = null;
    const colorEntry = completeEntry({ controlType: "color", nativeOrder: 2 });
    colorEntry.range.defaultValue = null;
    const report = validateAdditionalAttributesWorkspace(workspaceWithEntries([optionEntry, colorEntry]));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["missingOptionCount", "missingDefaultValue"]));
  });

  it("requires effect classification and boundary plus representative evidence", () => {
    const entry = completeEntry();
    entry.effects = {
      geometryEffect: "unknown",
      textureEffect: "unknown",
      colorEffect: "unknown",
      presentationOnlyEffect: "unknown"
    };
    entry.evidence.boundaryEvidenceIDs = [];
    entry.evidence.representativeEvidenceIDs = [];
    const report = validateAdditionalAttributesWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "unknownEffectProfile",
      "missingBoundaryEvidence",
      "missingRepresentativeEvidence"
    ]));
  });

  it("blocks incomplete dependency metadata", () => {
    const entry = completeEntry();
    entry.dependencies = [{
      dependencyID: "dependency-synthetic",
      condition: "synthetic condition",
      dependsOnStableID: null,
      dependsOnMenuID: null,
      evidenceFileIDs: [],
      notes: "Synthetic dependency."
    }];
    const report = validateAdditionalAttributesWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toEqual(expect.arrayContaining([
      "missingDependencyTarget",
      "missingDependencyEvidence"
    ]));
  });

  it("does not allow recommendation suitability before verification", () => {
    const entry = completeEntry({
      recommendationSuitability: "suitable",
      verificationStatus: "secondReviewPending"
    });
    const report = validateAdditionalAttributesWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("recommendationRequiresVerification");
  });

  it("rejects accepted catalog-manager disposition before verification", () => {
    const entry = completeEntry({
      catalogManagerDisposition: "accepted",
      verificationStatus: "secondReviewPending"
    });
    const report = validateAdditionalAttributesWorkspace(workspaceWithEntry(entry));

    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.errors.map((error) => error.code)).toContain("catalogDispositionRequiresVerification");
  });
});

function baseWorkspace(): Phase0AdditionalAttributesWorkspace {
  return createEmptyAdditionalAttributesWorkspace({
    workspaceID: "additional-attributes-workspace-synthetic",
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

function workspaceWithEntry(entry: Phase0AdditionalAttributeEntry): Phase0AdditionalAttributesWorkspace {
  return workspaceWithEntries([entry]);
}

function workspaceWithEntries(entries: Phase0AdditionalAttributeEntry[]): Phase0AdditionalAttributesWorkspace {
  let workspace = baseWorkspace();
  for (const entry of entries) {
    workspace = addAdditionalAttributeEntry(workspace, entry, now);
  }
  return workspace;
}

function completeEntry(overrides: Partial<Phase0AdditionalAttributeEntry> = {}): Phase0AdditionalAttributeEntry {
  const nativeOrder = overrides.nativeOrder ?? 1;
  const controlType = overrides.controlType ?? "namedOptions";
  const entry = createAdditionalAttributeEntry({
    platformCode: "SYNTHETIC",
    modeCode: "SYNTHETICMODE",
    attributeCode: `synthetic-attribute-${nativeOrder}`,
    nativeCategoryLabel: "synthetic-native-category",
    nativeControlLabel: "synthetic-native-control",
    nativeOrder,
    controlType,
    stableIdentifierAvailability: "derivedFromNativeOrder",
    nowISO: now
  });
  return {
    ...entry,
    range: controlRange(controlType),
    effects: {
      geometryEffect: "none",
      textureEffect: "minor",
      colorEffect: controlType === "color" ? "major" : "none",
      presentationOnlyEffect: "minor"
    },
    resetOnHeadChange: false,
    laterVisibility: "visibleLater",
    recommendationSuitability: "supportingOnly",
    evidence: {
      boundaryEvidenceIDs: ["evidence-boundary-synthetic"],
      representativeEvidenceIDs: ["evidence-representative-synthetic"],
      notes: "Synthetic evidence notes."
    },
    dependencies: [],
    verificationStatus: "verified",
    catalogManagerDisposition: "readyForReview",
    notes: "Synthetic additional attribute entry.",
    ...overrides
  };
}

function controlRange(controlType: Phase0AdditionalControlType) {
  if (controlType === "slider") {
    return { count: null, defaultValue: 5, minimum: 0, maximum: 10, step: 1 };
  }
  if (controlType === "color") {
    return { count: null, defaultValue: "synthetic-color", minimum: null, maximum: null, step: null };
  }
  if (controlType === "toggle") {
    return { count: null, defaultValue: false, minimum: null, maximum: null, step: null };
  }
  return { count: 3, defaultValue: "synthetic-default", minimum: null, maximum: null, step: null };
}
