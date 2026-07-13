import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface EyeColorResearchPackage {
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
    approximateColorSamplingComputed: boolean;
    eyeColorChangesVisibleIrisPresentation: boolean;
  };
  observationPolicy: {
    nativeLabelsPreserved: boolean;
    noGenericColorSubstitutionForUnreadableLabels: boolean;
    sampledColorIsDerivedResearchMetadataOnly: boolean;
    noSensitiveTraitInference: boolean;
    eyeColorExcludedFromGeometrySimilarity: boolean;
    productionUseAllowed: boolean;
  };
  nativeOrder: Array<{
    nativeOrder: number;
    stableInternalID: string;
    nativeLabelOriginalText: string;
    nativeRow: number;
    nativeColumn: number;
  }>;
  selectionSequence: Array<{
    sequenceOrder: number;
    nativeOrder: number;
    stableInternalID: string;
    nativeLabelOriginalText: string;
  }>;
  unreliableVisibleResultFlags: string[];
  labelsRequiringManualTextConfirmation: string[];
  records: EyeColorResearchRecord[];
}

interface EyeColorResearchRecord {
  nativeOrder: number;
  stableInternalID: string;
  nativeLabelOriginalText: string;
  visibleGameLabelOrIndex: string;
  category: string;
  kind: string;
  attributeFamily: string;
  originalTextPreserved: boolean;
  affectsTextureRatherThanGeometry: boolean;
  affectsGeometrySimilarity: boolean;
  selectedMenuEvidence: Array<{
    videoID: string;
    timestampRangeSeconds: string;
    stableTimestampSeconds: number;
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
  sampledIrisColor: {
    status: string;
    source: string;
    approximateHex: string;
    sampledPixelCount: number;
    method: string;
  };
  visibilityAssessment: {
    selectedMenuThumbnailColorVisible: boolean;
    stableFaceFrameColorVisible: string;
    colorVisibleConfidence: string;
    flaggedForUnreliableVisibleResult: boolean;
    requiresProductionRecaptureForReliableComparison: boolean;
  };
  lightingAndObstructionLimitations: {
    eyeBlackPresent: boolean;
    eyeBlackImpact: string;
    notificationOverlayPresent: boolean;
  };
  completenessStatus: {
    menuThumbnailEvidence: string;
    stableFaceFrame: string;
    standardizedViews: string;
    selectorCompletenessProven: boolean;
    requiredProductionRecapture: boolean;
  };
  researchMetadata: {
    sampledIrisColor: {
      approximateHex: string;
    };
    colorSamplingPolicy: string;
    nativeLabelPolicy: string;
  };
  dependencies: {
    status: string;
  };
  verificationState: string;
  productionStatus: string;
}

interface EyeColorFrameManifest {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  outputRoot: string;
  extractionPolicy: {
    productionUseAllowed: boolean;
  };
  frames: EyeColorFrameReference[];
}

interface EyeColorFrameReference {
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

describe("CF27 Eye Color research candidates", () => {
  const researchPackage = readJson<EyeColorResearchPackage>(
    "../data/research/cf27/catalog-candidates/research/eye-color-options-001-007/eye_color_research_candidates.json"
  );
  const frameManifest = readJson<EyeColorFrameManifest>(
    "../data/research/cf27/manifests/eye-color-evidence-frames/eye_color_evidence_frame_manifest.json"
  );

  it("keeps Eye Color records explicitly outside production", () => {
    expect(researchPackage.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(researchPackage.sourceType).toBe("researchCandidate");
    expect(researchPackage.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(researchPackage.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(researchPackage.verificationStateForAllRecords).toBe("NOT_VERIFIED");
    expect(researchPackage.scope.completeCategoryCountClaimed).toBe(false);
    expect(researchPackage.observationPolicy.productionUseAllowed).toBe(false);
  });

  it("preserves directly readable native labels in visible native tile order", () => {
    const expectedNativeOrder = [
      ["Light Blue", 1, 1],
      ["Light Brown", 1, 2],
      ["Brown", 1, 3],
      ["Blue", 1, 4],
      ["Light Green", 2, 1],
      ["Grey", 2, 2],
      ["Hazel", 2, 3]
    ] as const;

    expect(researchPackage.scope.directlySelectedRecordCount).toBe(7);
    expect(researchPackage.scope.directlySelectedNativeLabels).toEqual(expectedNativeOrder.map(([label]) => label));
    expect(researchPackage.nativeOrder.map((record) => record.nativeLabelOriginalText)).toEqual(expectedNativeOrder.map(([label]) => label));
    expect(researchPackage.selectorObservations.gridStructure).toBe("4-column grid with 7 visible tiles");
    expect(researchPackage.selectorObservations.selectorAppearsComplete).toBe(false);
    expect(researchPackage.selectorObservations.wrapObserved).toBe(false);
    expect(researchPackage.scope).not.toHaveProperty("totalCount");
    expect(researchPackage).not.toHaveProperty("claimedTotalCount");

    for (const [index, [label, row, column]] of expectedNativeOrder.entries()) {
      const record = researchPackage.nativeOrder[index];
      expect(record.nativeOrder).toBe(index + 1);
      expect(record.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_EYECOLOR_${String(index + 1).padStart(3, "0")}`);
      expect(record.nativeLabelOriginalText).toBe(label);
      expect(record.nativeRow).toBe(row);
      expect(record.nativeColumn).toBe(column);
    }
  });

  it("keeps selection sequence distinct from visible native order", () => {
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText)).toEqual([
      "Light Blue",
      "Light Brown",
      "Brown",
      "Blue",
      "Hazel",
      "Grey",
      "Light Green"
    ]);
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeOrder)).toEqual([1, 2, 3, 4, 7, 6, 5]);
    expect(researchPackage.selectorObservations.firstObservedSelectedValue).toBe("Light Blue");
    expect(researchPackage.selectorObservations.finalObservedSelectedValue).toBe("Light Green");
  });

  it("stores native labels as authoritative and keeps sampled colors as derived metadata", () => {
    expect(researchPackage.observationPolicy.nativeLabelsPreserved).toBe(true);
    expect(researchPackage.observationPolicy.noGenericColorSubstitutionForUnreadableLabels).toBe(true);
    expect(researchPackage.observationPolicy.sampledColorIsDerivedResearchMetadataOnly).toBe(true);
    expect(researchPackage.selectorObservations.approximateColorSamplingComputed).toBe(true);
    expect(researchPackage.labelsRequiringManualTextConfirmation).toEqual([]);

    for (const record of researchPackage.records) {
      expect(record.visibleGameLabelOrIndex).toBe(record.nativeLabelOriginalText);
      expect(record.originalTextPreserved).toBe(true);
      expect(record.sampledIrisColor.status).toBe("ESTIMATED");
      expect(record.sampledIrisColor.source).toBe("selected_menu_thumbnail_crop");
      expect(record.sampledIrisColor.approximateHex).toMatch(/^#[a-f0-9]{6}$/);
      expect(record.sampledIrisColor.sampledPixelCount).toBeGreaterThan(0);
      expect(record.sampledIrisColor.method).toContain("not a replacement for the native game label");
      expect(record.researchMetadata.sampledIrisColor.approximateHex).toBe(record.sampledIrisColor.approximateHex);
      expect(record.researchMetadata.colorSamplingPolicy).toContain("does not replace the native label");
      expect(record.researchMetadata.nativeLabelPolicy).toContain("Native game label is authoritative");
    }
  });

  it("treats Eye Color as presentation and not geometry or sensitive inference", () => {
    expect(researchPackage.observationPolicy.noSensitiveTraitInference).toBe(true);
    expect(researchPackage.observationPolicy.eyeColorExcludedFromGeometrySimilarity).toBe(true);
    for (const record of researchPackage.records) {
      expect(record.category).toBe("Eye Color");
      expect(record.kind).toBe("additionalFaceMatchingAttribute");
      expect(record.attributeFamily).toBe("eyeColor");
      expect(record.affectsTextureRatherThanGeometry).toBe(true);
      expect(record.affectsGeometrySimilarity).toBe(false);
      expect(record.dependencies.status).toBe("UNKNOWN");
      expect(record).not.toHaveProperty("race");
      expect(record).not.toHaveProperty("ethnicity");
      expect(record).not.toHaveProperty("identityLabel");
      expect(record).not.toHaveProperty("health");
      expect(record).not.toHaveProperty("attractiveness");
      expect(record.verificationState).toBe("NOT_VERIFIED");
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
    }
  });

  it("records visibility confidence, limitations, and completeness status", () => {
    expect(researchPackage.unreliableVisibleResultFlags).toEqual([]);
    for (const record of researchPackage.records) {
      expect(record.selectedMenuEvidence.length).toBe(1);
      expect(record.selectedMenuEvidence[0].videoID).toBe("video-007");
      expect(record.selectedMenuEvidence[0].timestampRangeSeconds).toMatch(/^[0-9.]+-[0-9.]+$/);
      expect(record.selectedMenuEvidence[0].basis).toContain("direct selected Eye Color label");
      expect(record.sourceImageReferences.map((reference) => reference.role).sort()).toEqual(["CHARACTER_STABLE", "MENU_THUMBNAIL_EVIDENCE"]);
      expect(record.gridPositionFromNativeIndex.columns).toBe(4);
      expect(record.visibilityAssessment.selectedMenuThumbnailColorVisible).toBe(true);
      expect(["medium", "medium_high"]).toContain(record.visibilityAssessment.colorVisibleConfidence);
      expect(record.visibilityAssessment.flaggedForUnreliableVisibleResult).toBe(false);
      expect(record.visibilityAssessment.requiresProductionRecaptureForReliableComparison).toBe(true);
      expect(record.lightingAndObstructionLimitations.eyeBlackPresent).toBe(true);
      expect(record.lightingAndObstructionLimitations.eyeBlackImpact).toContain("does not cover the iris");
      expect(record.completenessStatus.menuThumbnailEvidence).toBe("present");
      expect(record.completenessStatus.stableFaceFrame).toBe("present_limited");
      expect(record.completenessStatus.standardizedViews).toBe("not_present");
      expect(record.completenessStatus.selectorCompletenessProven).toBe(false);
      expect(record.completenessStatus.requiredProductionRecapture).toBe(true);
    }

    const lightGreen = researchPackage.records.find((record) => record.nativeLabelOriginalText === "Light Green");
    expect(lightGreen?.lightingAndObstructionLimitations.notificationOverlayPresent).toBe(true);
  });

  it("keeps derivative frames relative, local, and research-only", () => {
    expect(frameManifest.dataClass).toBe("RESEARCH_DERIVATIVE");
    expect(frameManifest.sourceType).toBe("researchDerivative");
    expect(frameManifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(frameManifest.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(frameManifest.outputRoot).toBe("data/research/cf27/generated/full-resolution-frames/eye-color-options-001-007");
    expect(frameManifest.extractionPolicy.productionUseAllowed).toBe(false);
    expect(frameManifest.frames).toHaveLength(14);

    for (const frame of frameManifest.frames) {
      expect(["MENU_THUMBNAIL_EVIDENCE", "CHARACTER_STABLE"]).toContain(frame.role);
      expect(frame.sourceVideoID).toBe("video-007");
      expect(frame.portableRelativeEvidencePath).toBe("OWNER_DOWNLOADS/a1e6193d-625e-4880-8977-3a8c7670c336.MP4");
      expect(path.isAbsolute(frame.outputRelativePath), frame.outputRelativePath).toBe(false);
      expect(frame.outputRelativePath).toContain("data/research/cf27/generated/full-resolution-frames/eye-color-options-001-007");
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
