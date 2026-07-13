import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface EyeShapeResearchPackage {
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
    eyeShapeAppearsToChangeEyeGeometry: boolean;
    geometryMeasurementComputed: boolean;
    eyeBlackPresent: boolean;
  };
  observationPolicy: {
    nativeLabelsPreserved: boolean;
    noRaceOrEthnicityLabels: boolean;
    noIdentityRelatedClassification: boolean;
    noSensitiveTraitInference: boolean;
    noComputedFacialMeasurements: boolean;
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
  labelsRequiringManualTextConfirmation: string[];
  records: EyeShapeResearchRecord[];
}

interface EyeShapeResearchRecord {
  nativeOrder: number;
  stableInternalID: string;
  nativeLabelOriginalText: string;
  visibleGameLabelOrIndex: string;
  category: string;
  kind: string;
  attributeFamily: string;
  originalTextPreserved: boolean;
  appearsGeometryChanging: boolean;
  affectsTextureRatherThanGeometry: boolean;
  affectsGeometrySimilarity: string;
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
  eyeBlackAssessment: {
    eyeBlackPresent: boolean;
    eyeBlackAffectsAssessment: boolean;
    impact: string;
  };
  visualDistinguishability: {
    selectedMenuThumbnail: string;
    representativeCharacterFrame: string;
  };
  geometryObservation: {
    appearsGeometryChanging: boolean;
    measurementComputed: boolean;
    measurementStatus: string;
  };
  dependencies: {
    status: string;
  };
  captureCompleteness: {
    menuEvidence: string;
    frontCharacterFrame: string;
    standardizedViews: string;
    requiredProductionRecapture: boolean;
  };
  verificationState: string;
  productionStatus: string;
}

interface EyeShapeFrameManifest {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  outputRoot: string;
  extractionPolicy: {
    productionUseAllowed: boolean;
  };
  frames: EyeShapeFrameReference[];
}

interface EyeShapeFrameReference {
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

describe("CF27 Eye Shape research candidates", () => {
  const researchPackage = readJson<EyeShapeResearchPackage>(
    "../data/research/cf27/catalog-candidates/research/eye-shape-options-001-005/eye_shape_research_candidates.json"
  );
  const frameManifest = readJson<EyeShapeFrameManifest>(
    "../data/research/cf27/manifests/eye-shape-evidence-frames/eye_shape_evidence_frame_manifest.json"
  );

  it("keeps Eye Shape records explicitly outside production", () => {
    expect(researchPackage.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(researchPackage.sourceType).toBe("researchCandidate");
    expect(researchPackage.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(researchPackage.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(researchPackage.verificationStateForAllRecords).toBe("NOT_VERIFIED");
    expect(researchPackage.scope.completeCategoryCountClaimed).toBe(false);
    expect(researchPackage.observationPolicy.productionUseAllowed).toBe(false);
  });

  it("preserves directly readable native labels in native tile order without claiming total count", () => {
    const expectedNativeOrder = [
      ["Almond", 1, 1],
      ["None", 1, 2],
      ["Prominent", 1, 3],
      ["Monolid", 1, 4],
      ["Hooded", 2, 1]
    ] as const;

    expect(researchPackage.scope.directlySelectedRecordCount).toBe(5);
    expect(researchPackage.scope.directlySelectedNativeLabels).toEqual(expectedNativeOrder.map(([label]) => label));
    expect(researchPackage.nativeOrder.map((record) => record.nativeLabelOriginalText)).toEqual(expectedNativeOrder.map(([label]) => label));
    expect(researchPackage.selectorObservations.gridStructure).toBe("4-column grid with 5 visible tiles");
    expect(researchPackage.selectorObservations.selectorAppearsComplete).toBe(false);
    expect(researchPackage.selectorObservations.wrapObserved).toBe(false);
    expect(researchPackage.scope).not.toHaveProperty("totalCount");
    expect(researchPackage).not.toHaveProperty("claimedTotalCount");

    for (const [index, [label, row, column]] of expectedNativeOrder.entries()) {
      const record = researchPackage.nativeOrder[index];
      expect(record.nativeOrder).toBe(index + 1);
      expect(record.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_EYESHAPE_${String(index + 1).padStart(3, "0")}`);
      expect(record.nativeLabelOriginalText).toBe(label);
      expect(record.nativeRow).toBe(row);
      expect(record.nativeColumn).toBe(column);
    }
  });

  it("keeps selection order aligned with directly selected labels", () => {
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText)).toEqual([
      "Almond",
      "None",
      "Prominent",
      "Monolid",
      "Hooded"
    ]);
    expect(researchPackage.selectorObservations.firstObservedSelectedValue).toBe("Almond");
    expect(researchPackage.selectorObservations.finalObservedSelectedValue).toBe("Hooded");
  });

  it("stores native text only and excludes sensitive classification fields", () => {
    expect(researchPackage.observationPolicy.nativeLabelsPreserved).toBe(true);
    expect(researchPackage.observationPolicy.noRaceOrEthnicityLabels).toBe(true);
    expect(researchPackage.observationPolicy.noIdentityRelatedClassification).toBe(true);
    expect(researchPackage.observationPolicy.noSensitiveTraitInference).toBe(true);
    expect(researchPackage.labelsRequiringManualTextConfirmation).toEqual([]);
    for (const record of researchPackage.records) {
      expect(record.visibleGameLabelOrIndex).toBe(record.nativeLabelOriginalText);
      expect(record.originalTextPreserved).toBe(true);
      expect(record).not.toHaveProperty("race");
      expect(record).not.toHaveProperty("ethnicity");
      expect(record).not.toHaveProperty("identityLabel");
      expect(record).not.toHaveProperty("health");
      expect(record).not.toHaveProperty("attractiveness");
    }
  });

  it("marks geometry as observed but not measured", () => {
    expect(researchPackage.selectorObservations.eyeShapeAppearsToChangeEyeGeometry).toBe(true);
    expect(researchPackage.selectorObservations.geometryMeasurementComputed).toBe(false);
    expect(researchPackage.observationPolicy.noComputedFacialMeasurements).toBe(true);
    for (const record of researchPackage.records) {
      expect(record.category).toBe("Eye Shape");
      expect(record.kind).toBe("additionalFaceMatchingAttribute");
      expect(record.attributeFamily).toBe("eyeShape");
      expect(record.appearsGeometryChanging).toBe(true);
      expect(record.affectsTextureRatherThanGeometry).toBe(false);
      expect(record.affectsGeometrySimilarity).toBe("research_candidate_pending_measurement");
      expect(record.geometryObservation.appearsGeometryChanging).toBe(true);
      expect(record.geometryObservation.measurementComputed).toBe(false);
      expect(record.geometryObservation.measurementStatus).toBe("NOT_MEASURED");
      expect(record.dependencies.status).toBe("UNKNOWN");
      expect(record.verificationState).toBe("NOT_VERIFIED");
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
    }
  });

  it("records eye-black limits, capture completeness, and direct source evidence", () => {
    for (const record of researchPackage.records) {
      expect(record.selectedMenuEvidence.length).toBe(1);
      expect(record.selectedMenuEvidence[0].videoID).toBe("video-006");
      expect(record.selectedMenuEvidence[0].timestampRangeSeconds).toMatch(/^[0-9.]+-[0-9.]+$/);
      expect(record.selectedMenuEvidence[0].basis).toContain("direct selected Eye Shape label");
      expect(record.sourceImageReferences.map((reference) => reference.role).sort()).toEqual(["CHARACTER_FRONT", "MENU"]);
      expect(record.gridPositionFromNativeIndex.columns).toBe(4);
      expect(record.eyeBlackAssessment.eyeBlackPresent).toBe(true);
      expect(record.eyeBlackAssessment.eyeBlackAffectsAssessment).toBe(true);
      expect(record.eyeBlackAssessment.impact).toBe("limited");
      expect(record.visualDistinguishability.selectedMenuThumbnail).toBe("visible");
      expect(record.visualDistinguishability.representativeCharacterFrame).toBe("limited");
      expect(record.captureCompleteness.menuEvidence).toBe("present");
      expect(record.captureCompleteness.frontCharacterFrame).toBe("present_limited");
      expect(record.captureCompleteness.standardizedViews).toBe("not_present");
      expect(record.captureCompleteness.requiredProductionRecapture).toBe(true);
    }
  });

  it("keeps derivative frames relative, local, and research-only", () => {
    expect(frameManifest.dataClass).toBe("RESEARCH_DERIVATIVE");
    expect(frameManifest.sourceType).toBe("researchDerivative");
    expect(frameManifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(frameManifest.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(frameManifest.outputRoot).toBe("data/research/cf27/generated/full-resolution-frames/eye-shape-options-001-005");
    expect(frameManifest.extractionPolicy.productionUseAllowed).toBe(false);
    expect(frameManifest.frames).toHaveLength(10);

    for (const frame of frameManifest.frames) {
      expect(["MENU", "CHARACTER_FRONT"]).toContain(frame.role);
      expect(frame.sourceVideoID).toBe("video-006");
      expect(frame.portableRelativeEvidencePath).toBe("OWNER_DOWNLOADS/45926e39-7553-43b1-803a-6ddc787c63dd.MP4");
      expect(path.isAbsolute(frame.outputRelativePath), frame.outputRelativePath).toBe(false);
      expect(frame.outputRelativePath).toContain("data/research/cf27/generated/full-resolution-frames/eye-shape-options-001-005");
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
