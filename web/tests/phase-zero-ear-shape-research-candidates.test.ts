import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface EarShapeResearchPackage {
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
    firstGridSelectedValue: string;
    finalObservedSelectedValue: string;
    repeatedSelectionNativeOrders: number[];
    timelineCorrectionNotes: string[];
    selectorAppearsComplete: boolean;
    wrapObserved: boolean;
    earShapeChangesVisibleEarPresentation: boolean;
    geometryMeasurementComputed: boolean;
  };
  observationPolicy: {
    nativeLabelsPreserved: boolean;
    noSubjectiveAppearanceDescriptions: boolean;
    noEthnicityAttractivenessIdentityOrRealPersonResemblance: boolean;
    singleVisibleEarOnly: boolean;
    noBothEarsClaim: boolean;
    geometryObservationIsQualitativeOnly: boolean;
    noDepthOrTrueDepthClaim: boolean;
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
    selectionType: string;
  }>;
  labelsRequiringManualTextConfirmation: string[];
  categoryCompletenessWarnings: string[];
  records: EarShapeResearchRecord[];
}

interface EarShapeResearchRecord {
  nativeOrder: number;
  stableInternalID: string;
  nativeLabelOriginalText: string;
  visibleGameLabelOrIndex: string;
  category: string;
  kind: string;
  attributeFamily: string;
  originalTextPreserved: boolean;
  selectedMenuEvidence: Array<{
    videoID: string;
    timestampRangeSeconds: string;
    stableTimestampSeconds: number;
    evidenceType: string;
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
  geometryObservation: {
    appearsGeometryChanging: boolean;
    geometryMeasurementComputed: boolean;
    measurementStatus: string;
    depthAvailable: boolean;
  };
  earVisibility: {
    singleLateralEarVisible: boolean;
    bothEarsEvaluated: boolean;
    leftEarVisibility: string;
    rightEarVisibility: string;
    visibleEarSideDescription: string;
  };
  hairstyleObstruction: {
    status: string;
    notes: string;
  };
  visualDistinguishability: {
    selectedMenuThumbnailVisible: boolean;
    liveCharacterEarVisible: boolean;
    selectedOptionDistinguishable: string;
    subjectiveDescriptorsAvoided: boolean;
  };
  completenessStatus: {
    menuEvidence: string;
    sideOrThreeQuarterFrame: string;
    leftEarEvaluated: boolean;
    rightEarEvaluated: boolean;
    bothEarsEvaluated: boolean;
    selectorCompletenessProven: boolean;
    requiredProductionRecapture: boolean;
  };
  missingViews: string[];
  recaptureNeed: {
    required: boolean;
    couldOneStandardizedRunRepairAllObservedEarShapeRecords: boolean;
  };
  dependencies: {
    status: string;
  };
  verificationState: string;
  productionStatus: string;
}

interface EarShapeFrameManifest {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  outputRoot: string;
  extractionPolicy: {
    productionUseAllowed: boolean;
    roles: string[];
    appearanceAltered: boolean;
  };
  frames: EarShapeFrameReference[];
}

interface EarShapeFrameReference {
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

describe("CF27 Ear Shape research candidates", () => {
  const researchPackage = readJson<EarShapeResearchPackage>(
    "../data/research/cf27/catalog-candidates/research/ear-shape-options-001-004/ear_shape_research_candidates.json"
  );
  const frameManifest = readJson<EarShapeFrameManifest>(
    "../data/research/cf27/manifests/ear-shape-evidence-frames/ear_shape_evidence_frame_manifest.json"
  );

  it("keeps Ear Shape records explicitly outside production", () => {
    expect(researchPackage.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(researchPackage.sourceType).toBe("researchCandidate");
    expect(researchPackage.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(researchPackage.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(researchPackage.verificationStateForAllRecords).toBe("NOT_VERIFIED");
    expect(researchPackage.scope.completeCategoryCountClaimed).toBe(false);
    expect(researchPackage.observationPolicy.productionUseAllowed).toBe(false);
  });

  it("preserves directly readable native labels in loaded grid order", () => {
    const expectedNativeOrder = [
      ["Attached Lobe", 1, 1],
      ["None", 1, 2],
      ["Round Free Lobe", 1, 3],
      ["Pointed", 1, 4]
    ] as const;

    expect(researchPackage.scope.directlySelectedRecordCount).toBe(4);
    expect(researchPackage.scope.directlySelectedNativeLabels).toEqual(expectedNativeOrder.map(([label]) => label));
    expect(researchPackage.nativeOrder.map((record) => record.nativeLabelOriginalText)).toEqual(expectedNativeOrder.map(([label]) => label));
    expect(researchPackage.selectorObservations.gridStructure).toBe("4-column single-row grid with 4 visible Ear Shape tiles");
    expect(researchPackage.selectorObservations.selectorAppearsComplete).toBe(false);
    expect(researchPackage.selectorObservations.wrapObserved).toBe(false);
    expect(researchPackage.scope).not.toHaveProperty("totalCount");
    expect(researchPackage).not.toHaveProperty("claimedTotalCount");

    for (const [index, [label, row, column]] of expectedNativeOrder.entries()) {
      const record = researchPackage.nativeOrder[index];
      expect(record.nativeOrder).toBe(index + 1);
      expect(record.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_EARSHAPE_${String(index + 1).padStart(3, "0")}`);
      expect(record.nativeLabelOriginalText).toBe(label);
      expect(record.nativeRow).toBe(row);
      expect(record.nativeColumn).toBe(column);
    }
  });

  it("keeps the initial None observation separate from loaded grid native order", () => {
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText)).toEqual([
      "None",
      "Attached Lobe",
      "None",
      "Round Free Lobe",
      "Pointed"
    ]);
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeOrder)).toEqual([2, 1, 2, 3, 4]);
    expect(researchPackage.selectorObservations.firstObservedSelectedValue).toBe("None");
    expect(researchPackage.selectorObservations.firstGridSelectedValue).toBe("Attached Lobe");
    expect(researchPackage.selectorObservations.finalObservedSelectedValue).toBe("Pointed");
    expect(researchPackage.selectorObservations.repeatedSelectionNativeOrders).toEqual([2]);
    expect(researchPackage.selectorObservations.timelineCorrectionNotes).toEqual(expect.arrayContaining([
      expect.stringContaining("full-frame inspection shows Attached Lobe remains selected at 21s"),
      expect.stringContaining("native order is based on the loaded Ear Shape grid beginning at 18s")
    ]));

    const noneRecords = researchPackage.records.filter((record) => record.nativeLabelOriginalText === "None");
    expect(noneRecords).toHaveLength(1);
    expect(noneRecords[0].stableInternalID).toBe("CF27_XBOXUNKNOWN_RTG_EARSHAPE_002");
    expect(noneRecords[0].selectedMenuEvidence.map((entry) => entry.timestampRangeSeconds)).toEqual([
      "17.0-17.9",
      "23.0-23.9"
    ]);
    expect(researchPackage.selectionSequence[0].selectionType).toBe("initial_loaded_label_before_grid");
    expect(researchPackage.selectionSequence[2].selectionType).toBe("deliberately_reselected_same_native_identity");
  });

  it("records qualitative geometry only without depth, measurements, or sensitive descriptors", () => {
    expect(researchPackage.selectorObservations.earShapeChangesVisibleEarPresentation).toBe(true);
    expect(researchPackage.selectorObservations.geometryMeasurementComputed).toBe(false);
    expect(researchPackage.observationPolicy.nativeLabelsPreserved).toBe(true);
    expect(researchPackage.observationPolicy.noSubjectiveAppearanceDescriptions).toBe(true);
    expect(researchPackage.observationPolicy.noEthnicityAttractivenessIdentityOrRealPersonResemblance).toBe(true);
    expect(researchPackage.observationPolicy.geometryObservationIsQualitativeOnly).toBe(true);
    expect(researchPackage.observationPolicy.noDepthOrTrueDepthClaim).toBe(true);

    for (const record of researchPackage.records) {
      expect(record.category).toBe("Ear Shape");
      expect(record.kind).toBe("faceGeometryAttribute");
      expect(record.attributeFamily).toBe("earShape");
      expect(record.visibleGameLabelOrIndex).toBe(record.nativeLabelOriginalText);
      expect(record.originalTextPreserved).toBe(true);
      expect(record.geometryObservation.appearsGeometryChanging).toBe(true);
      expect(record.geometryObservation.geometryMeasurementComputed).toBe(false);
      expect(record.geometryObservation.measurementStatus).toBe("NOT_MEASURED");
      expect(record.geometryObservation.depthAvailable).toBe(false);
      expect(record.visualDistinguishability.subjectiveDescriptorsAvoided).toBe(true);
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

  it("does not claim both ears were evaluated and records hairstyle obstruction", () => {
    expect(researchPackage.observationPolicy.singleVisibleEarOnly).toBe(true);
    expect(researchPackage.observationPolicy.noBothEarsClaim).toBe(true);
    expect(researchPackage.categoryCompletenessWarnings).toContain("Only one lateral live-character ear side is visible.");

    for (const record of researchPackage.records) {
      expect(record.earVisibility.singleLateralEarVisible).toBe(true);
      expect(record.earVisibility.bothEarsEvaluated).toBe(false);
      expect(record.earVisibility.leftEarVisibility).toBe("NOT_CONFIRMED_FROM_RECORDING");
      expect(record.earVisibility.rightEarVisibility).toBe("NOT_CONFIRMED_FROM_RECORDING");
      expect(record.earVisibility.visibleEarSideDescription).toContain("not used to assert");
      expect(record.hairstyleObstruction.status).toBe("PARTIAL");
      expect(record.hairstyleObstruction.notes).toContain("upper and rear ear");
      expect(record.completenessStatus.leftEarEvaluated).toBe(false);
      expect(record.completenessStatus.rightEarEvaluated).toBe(false);
      expect(record.completenessStatus.bothEarsEvaluated).toBe(false);
      expect(record.missingViews).toEqual(expect.arrayContaining(["OPPOSITE_EAR_SIDE", "HAIR_PULLED_CLEAR_OF_EARS"]));
    }
  });

  it("records side-frame evidence, distinguishability, completeness, and recapture status", () => {
    expect(researchPackage.labelsRequiringManualTextConfirmation).toEqual([]);
    expect(researchPackage.categoryCompletenessWarnings).toContain("No total count is claimed.");

    for (const record of researchPackage.records) {
      expect(record.selectedMenuEvidence.length).toBeGreaterThanOrEqual(1);
      for (const evidence of record.selectedMenuEvidence) {
        expect(evidence.videoID).toBe("video-009");
        expect(evidence.timestampRangeSeconds).toMatch(/^[0-9.]+-[0-9.]+$/);
        expect(["selected_grid_tile", "label_visible_before_grid"]).toContain(evidence.evidenceType);
      }
      expect(record.sourceImageReferences.map((reference) => reference.role).sort()).toEqual([
        "BEST_AVAILABLE_SIDE_OR_THREE_QUARTER",
        "MENU_EVIDENCE"
      ]);
      expect(record.gridPositionFromNativeIndex.columns).toBe(4);
      expect(record.visualDistinguishability.selectedMenuThumbnailVisible).toBe(true);
      expect(record.visualDistinguishability.liveCharacterEarVisible).toBe(true);
      expect(record.visualDistinguishability.selectedOptionDistinguishable).toBe("medium");
      expect(record.completenessStatus.menuEvidence).toBe("present");
      expect(record.completenessStatus.sideOrThreeQuarterFrame).toBe("present_limited_nonstandard");
      expect(record.completenessStatus.selectorCompletenessProven).toBe(false);
      expect(record.completenessStatus.requiredProductionRecapture).toBe(true);
      expect(record.recaptureNeed.required).toBe(true);
      expect(record.recaptureNeed.couldOneStandardizedRunRepairAllObservedEarShapeRecords).toBe(true);
    }
  });

  it("keeps extracted frame derivatives as non-production manifest entries", () => {
    expect(frameManifest.dataClass).toBe("RESEARCH_DERIVATIVE");
    expect(frameManifest.sourceType).toBe("researchDerivative");
    expect(frameManifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(frameManifest.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(frameManifest.extractionPolicy.productionUseAllowed).toBe(false);
    expect(frameManifest.extractionPolicy.appearanceAltered).toBe(false);
    expect(frameManifest.extractionPolicy.roles).toEqual(["MENU_EVIDENCE", "BEST_AVAILABLE_SIDE_OR_THREE_QUARTER"]);
    expect(frameManifest.frames).toHaveLength(8);

    const framesByRecord = new Map<string, EarShapeFrameReference[]>();
    for (const frame of frameManifest.frames) {
      expect(frame.sourceVideoID).toBe("video-009");
      expect(frame.portableRelativeEvidencePath).toBe("OWNER_DOWNLOADS/55b7d607-eefa-41a4-8635-1eedb5296ab0.MP4");
      expect(frame.outputRelativePath).toMatch(/^data\/research\/cf27\/generated\/full-resolution-frames\/ear-shape-options-001-004\//);
      expect(frame.outputRelativePath).not.toContain("data/catalog/production");
      expect(frame.outputSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(frame.width).toBe(1920);
      expect(frame.height).toBe(1080);
      expect(frame.preservesOriginalAspectRatio).toBe(true);
      expect(frame.appearanceAltered).toBe(false);
      framesByRecord.set(frame.stableInternalID, [...(framesByRecord.get(frame.stableInternalID) ?? []), frame]);
    }

    for (const record of researchPackage.records) {
      expect(framesByRecord.get(record.stableInternalID)?.map((frame) => frame.role).sort()).toEqual([
        "BEST_AVAILABLE_SIDE_OR_THREE_QUARTER",
        "MENU_EVIDENCE"
      ]);
    }
  });
});

function readJson<T>(relativePath: string): T {
  const filePath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}
