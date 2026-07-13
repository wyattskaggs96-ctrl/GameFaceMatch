import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface SkinDetailsResearchPackage {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  verificationStateForAllRecords: string;
  scope: {
    directlySelectedRecordCount: number;
    directlySelectedNativeLabels: string[];
    completeCategoryCountClaimed: boolean;
  };
  selectorObservations: {
    gridStructure: string;
    firstObservedSelectedValue: string;
    finalObservedSelectedValue: string;
    selectorAppearsComplete: boolean;
    wrapObserved: boolean;
    eyeBlackPresent: boolean;
  };
  observationPolicy: {
    nativeLabelsPreserved: boolean;
    normalizedResearchCategoriesAreDerivedFromReadableNativeLabels: boolean;
    skinDetailsExcludedFromGeometrySimilarity: boolean;
    productionUseAllowed: boolean;
  };
  nativeOrder: Array<{
    nativeOrder: number;
    stableInternalID: string;
    nativeLabelOriginalText: string;
    readableNativeCategory: string;
    nativeRow: number;
    nativeColumn: number;
  }>;
  selectionSequence: Array<{
    sequenceOrder: number;
    nativeOrder: number;
    stableInternalID: string;
    nativeLabelOriginalText: string;
  }>;
  labelsRequiringManualTextConfirmation: string[];
  records: SkinDetailsResearchRecord[];
}

interface SkinDetailsResearchRecord {
  nativeOrder: number;
  stableInternalID: string;
  nativeLabelOriginalText: string;
  visibleGameLabelOrIndex: string;
  category: string;
  kind: string;
  attributeFamily: string;
  readableNativeCategory: string;
  nativeLabelNormalizedForResearch: string;
  originalTextPreserved: boolean;
  affectsTextureRatherThanGeometry: boolean;
  affectsGeometrySimilarity: boolean;
  selectedMenuEvidence: Array<{
    videoID: string;
    timestampRangeSeconds: string;
    basis: string;
  }>;
  sourceImageReferences: Array<{
    role: string;
    outputRelativePath: string;
  }>;
  gridPositionFromNativeIndex: {
    columns: number;
    nativeRow: number;
    nativeColumn: number;
  };
  detailVisibility: {
    detailClearlyVisible: string;
    visibleInSelectedMenuThumbnail: boolean;
    visibleInRepresentativeCharacterFrame: string | boolean;
  };
  representativeFrameQA: {
    eyeBlackObstructsEvaluation: boolean;
  };
  captureCompleteness: {
    menuEvidence: string;
    representativeFaceFrame: string;
    standardizedViews: string;
    requiredProductionRecapture: boolean;
  };
  verificationState: string;
  productionStatus: string;
}

interface SkinDetailsFrameManifest {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  outputRoot: string;
  frames: SkinDetailsFrameReference[];
}

interface SkinDetailsFrameReference {
  frameID: string;
  stableInternalID: string;
  nativeLabelOriginalText: string;
  role: string;
  sourceVideoID: string;
  portableRelativeEvidencePath: string;
  outputRelativePath: string;
  outputSha256: string;
  width: number;
  height: number;
  preservesOriginalAspectRatio: boolean;
  appearanceAltered: boolean;
}

describe("CF27 Skin Details research candidates", () => {
  const researchPackage = readJson<SkinDetailsResearchPackage>(
    "../data/research/cf27/catalog-candidates/research/skin-details-options-001-010/skin_details_research_candidates.json"
  );
  const frameManifest = readJson<SkinDetailsFrameManifest>(
    "../data/research/cf27/manifests/skin-details-evidence-frames/skin_details_evidence_frame_manifest.json"
  );

  it("keeps Skin Details records explicitly outside production", () => {
    expect(researchPackage.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(researchPackage.sourceType).toBe("researchCandidate");
    expect(researchPackage.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(researchPackage.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(researchPackage.verificationStateForAllRecords).toBe("NOT_VERIFIED");
    expect(researchPackage.scope.completeCategoryCountClaimed).toBe(false);
    expect(researchPackage.observationPolicy.productionUseAllowed).toBe(false);
  });

  it("preserves directly readable native labels in native tile order", () => {
    const expectedNativeOrder = [
      ["None", "None", 1, 1],
      ["Freckles 2", "Freckles", 1, 2],
      ["Scar 3", "Scar", 1, 3],
      ["Scar 2", "Scar", 1, 4],
      ["Scar 1", "Scar", 2, 1],
      ["Acne Scar 1", "Acne Scar", 2, 2],
      ["Redness 3", "Redness", 2, 3],
      ["Redness 2", "Redness", 2, 4],
      ["Redness 1", "Redness", 3, 1],
      ["Freckles 1", "Freckles", 3, 2]
    ];

    expect(researchPackage.scope.directlySelectedRecordCount).toBe(10);
    expect(researchPackage.nativeOrder.map((record) => record.nativeLabelOriginalText)).toEqual(expectedNativeOrder.map(([label]) => label));
    for (const [index, [label, category, row, column]] of expectedNativeOrder.entries()) {
      const record = researchPackage.nativeOrder[index];
      expect(record.nativeOrder).toBe(index + 1);
      expect(record.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_SKINDETAILS_${String(index + 1).padStart(3, "0")}`);
      expect(record.nativeLabelOriginalText).toBe(label);
      expect(record.readableNativeCategory).toBe(category);
      expect(record.nativeRow).toBe(row);
      expect(record.nativeColumn).toBe(column);
    }
  });

  it("keeps navigation selection order separate from native order", () => {
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText)).toEqual([
      "None",
      "Freckles 2",
      "Scar 3",
      "Scar 2",
      "Redness 2",
      "Redness 3",
      "Acne Scar 1",
      "Scar 1",
      "Redness 1",
      "Freckles 1"
    ]);
    expect(researchPackage.selectorObservations.firstObservedSelectedValue).toBe("None");
    expect(researchPackage.selectorObservations.finalObservedSelectedValue).toBe("Freckles 1");
    expect(researchPackage.selectorObservations.gridStructure).toBe("4-column grid with 10 visible tiles");
    expect(researchPackage.selectorObservations.selectorAppearsComplete).toBe(false);
    expect(researchPackage.selectorObservations.wrapObserved).toBe(false);
  });

  it("stores original native text and only derives readable research categories from that text", () => {
    expect(researchPackage.observationPolicy.nativeLabelsPreserved).toBe(true);
    expect(researchPackage.observationPolicy.normalizedResearchCategoriesAreDerivedFromReadableNativeLabels).toBe(true);
    expect(researchPackage.labelsRequiringManualTextConfirmation).toEqual([]);
    for (const record of researchPackage.records) {
      expect(record.visibleGameLabelOrIndex).toBe(record.nativeLabelOriginalText);
      expect(record.originalTextPreserved).toBe(true);
      expect(record.nativeLabelNormalizedForResearch).toBe(record.readableNativeCategory);
      expect(record).not.toHaveProperty("race");
      expect(record).not.toHaveProperty("ethnicity");
      expect(record).not.toHaveProperty("identityLabel");
    }
  });

  it("treats Skin Details as texture/presentation, not geometry", () => {
    expect(researchPackage.observationPolicy.skinDetailsExcludedFromGeometrySimilarity).toBe(true);
    for (const record of researchPackage.records) {
      expect(record.category).toBe("Skin Details");
      expect(record.kind).toBe("additionalFaceMatchingAttribute");
      expect(record.attributeFamily).toBe("skinDetails");
      expect(record.affectsTextureRatherThanGeometry).toBe(true);
      expect(record.affectsGeometrySimilarity).toBe(false);
      expect(record.verificationState).toBe("NOT_VERIFIED");
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
    }
  });

  it("records visibility, eye-black obstruction, capture completeness, and source evidence", () => {
    for (const record of researchPackage.records) {
      expect(record.selectedMenuEvidence.length).toBe(1);
      expect(record.selectedMenuEvidence[0].videoID).toBe("video-005");
      expect(record.selectedMenuEvidence[0].timestampRangeSeconds).toMatch(/^[0-9.]+-[0-9.]+$/);
      expect(record.selectedMenuEvidence[0].basis).toContain("direct selected Skin Details label");
      expect(record.sourceImageReferences.map((reference) => reference.role).sort()).toEqual(["CHARACTER_STABLE", "MENU"]);
      expect(record.gridPositionFromNativeIndex.columns).toBe(4);
      expect(record.detailVisibility.visibleInSelectedMenuThumbnail).toBe(true);
      expect(record.captureCompleteness.menuEvidence).toBe("present");
      expect(record.captureCompleteness.representativeFaceFrame).toBe("present_limited");
      expect(record.captureCompleteness.standardizedViews).toBe("not_present");
      expect(record.captureCompleteness.requiredProductionRecapture).toBe(true);
    }

    const baseline = researchPackage.records.find((record) => record.nativeLabelOriginalText === "None");
    expect(baseline?.detailVisibility.detailClearlyVisible).toBe("not_applicable");
    expect(baseline?.representativeFrameQA.eyeBlackObstructsEvaluation).toBe(false);

    for (const record of researchPackage.records.filter((candidate) => candidate.nativeLabelOriginalText !== "None")) {
      expect(record.detailVisibility.detailClearlyVisible).toBe("limited");
      expect(record.detailVisibility.visibleInRepresentativeCharacterFrame).toBe("limited");
      expect(record.representativeFrameQA.eyeBlackObstructsEvaluation).toBe(true);
    }
  });

  it("keeps derivative frames relative, local, and research-only", () => {
    expect(frameManifest.dataClass).toBe("RESEARCH_DERIVATIVE");
    expect(frameManifest.sourceType).toBe("researchDerivative");
    expect(frameManifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(frameManifest.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(frameManifest.outputRoot).toBe("data/research/cf27/generated/full-resolution-frames/skin-details-options-001-010");
    expect(frameManifest.frames).toHaveLength(20);

    for (const frame of frameManifest.frames) {
      expect(["MENU", "CHARACTER_STABLE"]).toContain(frame.role);
      expect(frame.sourceVideoID).toBe("video-005");
      expect(frame.portableRelativeEvidencePath).toBe("OWNER_DOWNLOADS/04_Appearance_Skin_Details.MP4");
      expect(path.isAbsolute(frame.outputRelativePath), frame.outputRelativePath).toBe(false);
      expect(frame.outputRelativePath).toContain("data/research/cf27/generated/full-resolution-frames/skin-details-options-001-010");
      expect(frame.outputRelativePath).not.toContain("data/catalog/production");
      expect(frame.outputSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(frame.width).toBe(1920);
      expect(frame.height).toBe(1080);
      expect(frame.preservesOriginalAspectRatio).toBe(true);
      expect(frame.appearanceAltered).toBe(false);
    }
  });
});

function readJson<T>(relativePath: string): T {
  const filePath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}
