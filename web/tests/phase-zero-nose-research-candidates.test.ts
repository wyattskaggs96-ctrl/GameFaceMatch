import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface NoseResearchPackage {
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
    repeatedSelectionNativeOrders: number[];
    selectorAppearsComplete: boolean;
    wrapObserved: boolean;
    noseChangesVisibleGeometryPresentation: boolean;
    geometryMeasurementComputed: boolean;
  };
  observationPolicy: {
    nativeLabelsPreserved: boolean;
    noSubjectiveAppearanceDescriptions: boolean;
    noEthnicityAttractivenessIdentityOrRealPersonResemblance: boolean;
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
  records: NoseResearchRecord[];
}

interface NoseResearchRecord {
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
  viewAvailability: {
    menuEvidence: string;
    frontFrame: string;
    bestAvailableThreeQuarterFrame: string;
    profileViewAvailable: boolean;
    profileViewSource: string;
    standardizedProductionCaptureAvailable: boolean;
  };
  visualDistinguishability: {
    selectedMenuThumbnailVisible: boolean;
    liveCharacterDifferenceVisible: string;
    subjectiveDescriptorsAvoided: boolean;
  };
  missingViews: string[];
  recaptureNeed: {
    required: boolean;
    couldOneStandardizedRunRepairAllObservedNoseRecords: boolean;
  };
  dependencies: {
    status: string;
  };
  verificationState: string;
  productionStatus: string;
}

interface NoseFrameManifest {
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
  frames: NoseFrameReference[];
}

interface NoseFrameReference {
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

describe("CF27 Nose research candidates", () => {
  const researchPackage = readJson<NoseResearchPackage>(
    "../data/research/cf27/catalog-candidates/research/nose-options-001-007/nose_research_candidates.json"
  );
  const frameManifest = readJson<NoseFrameManifest>(
    "../data/research/cf27/manifests/nose-evidence-frames/nose_evidence_frame_manifest.json"
  );

  it("keeps Nose records explicitly outside production", () => {
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
      ["None", 1, 1],
      ["Hooked", 1, 2],
      ["Button", 1, 3],
      ["Nubian", 1, 4],
      ["Aquiline", 2, 1],
      ["Roman", 2, 2],
      ["Funnel", 2, 3]
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
      expect(record.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_NOSE_${String(index + 1).padStart(3, "0")}`);
      expect(record.nativeLabelOriginalText).toBe(label);
      expect(record.nativeRow).toBe(row);
      expect(record.nativeColumn).toBe(column);
    }
  });

  it("keeps Aquiline as one record with two direct observations", () => {
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeLabelOriginalText)).toEqual([
      "Aquiline",
      "None",
      "Hooked",
      "Button",
      "Nubian",
      "Funnel",
      "Roman",
      "Aquiline"
    ]);
    expect(researchPackage.selectionSequence.map((entry) => entry.nativeOrder)).toEqual([5, 1, 2, 3, 4, 7, 6, 5]);
    expect(researchPackage.selectorObservations.firstObservedSelectedValue).toBe("Aquiline");
    expect(researchPackage.selectorObservations.finalObservedSelectedValue).toBe("Aquiline");
    expect(researchPackage.selectorObservations.repeatedSelectionNativeOrders).toEqual([5]);

    const aquilineRecords = researchPackage.records.filter((record) => record.nativeLabelOriginalText === "Aquiline");
    expect(aquilineRecords).toHaveLength(1);
    expect(aquilineRecords[0].stableInternalID).toBe("CF27_XBOXUNKNOWN_RTG_NOSE_005");
    expect(aquilineRecords[0].selectedMenuEvidence.map((entry) => entry.timestampRangeSeconds)).toEqual([
      "14.0-14.9",
      "28.0-32.45"
    ]);
    expect(researchPackage.selectionSequence.at(-1)?.selectionType).toBe("deliberately_reselected_same_native_identity");
  });

  it("records qualitative geometry only without depth, measurements, or sensitive descriptors", () => {
    expect(researchPackage.selectorObservations.noseChangesVisibleGeometryPresentation).toBe(true);
    expect(researchPackage.selectorObservations.geometryMeasurementComputed).toBe(false);
    expect(researchPackage.observationPolicy.nativeLabelsPreserved).toBe(true);
    expect(researchPackage.observationPolicy.noSubjectiveAppearanceDescriptions).toBe(true);
    expect(researchPackage.observationPolicy.noEthnicityAttractivenessIdentityOrRealPersonResemblance).toBe(true);
    expect(researchPackage.observationPolicy.geometryObservationIsQualitativeOnly).toBe(true);
    expect(researchPackage.observationPolicy.noDepthOrTrueDepthClaim).toBe(true);

    for (const record of researchPackage.records) {
      expect(record.category).toBe("Nose");
      expect(record.kind).toBe("faceGeometryAttribute");
      expect(record.attributeFamily).toBe("nose");
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

  it("records missing views, recapture needs, and source frames for every selected option", () => {
    expect(researchPackage.labelsRequiringManualTextConfirmation).toEqual([]);
    expect(researchPackage.categoryCompletenessWarnings).toContain("No total count is claimed.");

    for (const record of researchPackage.records) {
      expect(record.selectedMenuEvidence.length).toBeGreaterThanOrEqual(1);
      for (const evidence of record.selectedMenuEvidence) {
        expect(evidence.videoID).toBe("video-008");
        expect(evidence.timestampRangeSeconds).toMatch(/^[0-9.]+-[0-9.]+$/);
        expect(evidence.basis).toContain("direct selected Nose label");
      }
      expect(record.sourceImageReferences.map((reference) => reference.role).sort()).toEqual([
        "BEST_AVAILABLE_THREE_QUARTER",
        "FRONT",
        "MENU_EVIDENCE"
      ]);
      expect(record.gridPositionFromNativeIndex.columns).toBe(4);
      expect(record.viewAvailability.menuEvidence).toBe("present");
      expect(record.viewAvailability.frontFrame).toBe("present_limited_nonstandard");
      expect(record.viewAvailability.bestAvailableThreeQuarterFrame).toBe("present_limited_nonstandard");
      expect(record.viewAvailability.profileViewAvailable).toBe(false);
      expect(record.viewAvailability.profileViewSource).toBe("menu_thumbnail_only_not_live_character_profile");
      expect(record.viewAvailability.standardizedProductionCaptureAvailable).toBe(false);
      expect(record.missingViews).toEqual(expect.arrayContaining(["LEFT_PROFILE", "RIGHT_PROFILE", "STANDARDIZED_LEFT_45", "STANDARDIZED_RIGHT_45"]));
      expect(record.recaptureNeed.required).toBe(true);
      expect(record.recaptureNeed.couldOneStandardizedRunRepairAllObservedNoseRecords).toBe(true);
    }
  });

  it("keeps extracted frame derivatives as non-production manifest entries", () => {
    expect(frameManifest.dataClass).toBe("RESEARCH_DERIVATIVE");
    expect(frameManifest.sourceType).toBe("researchDerivative");
    expect(frameManifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(frameManifest.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(frameManifest.extractionPolicy.productionUseAllowed).toBe(false);
    expect(frameManifest.extractionPolicy.appearanceAltered).toBe(false);
    expect(frameManifest.extractionPolicy.roles).toEqual(["MENU_EVIDENCE", "FRONT", "BEST_AVAILABLE_THREE_QUARTER"]);
    expect(frameManifest.frames).toHaveLength(21);

    const framesByRecord = new Map<string, NoseFrameReference[]>();
    for (const frame of frameManifest.frames) {
      expect(frame.sourceVideoID).toBe("video-008");
      expect(frame.portableRelativeEvidencePath).toBe("OWNER_DOWNLOADS/5bcd4869-531b-41bf-b643-5331f34cb3f3.MP4");
      expect(frame.outputRelativePath).toMatch(/^data\/research\/cf27\/generated\/full-resolution-frames\/nose-options-001-007\//);
      expect(frame.outputSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(frame.width).toBe(1920);
      expect(frame.height).toBe(1080);
      expect(frame.preservesOriginalAspectRatio).toBe(true);
      expect(frame.appearanceAltered).toBe(false);
      framesByRecord.set(frame.stableInternalID, [...(framesByRecord.get(frame.stableInternalID) ?? []), frame]);
    }

    for (const record of researchPackage.records) {
      expect(framesByRecord.get(record.stableInternalID)?.map((frame) => frame.role).sort()).toEqual([
        "BEST_AVAILABLE_THREE_QUARTER",
        "FRONT",
        "MENU_EVIDENCE"
      ]);
    }
  });
});

function readJson<T>(relativePath: string): T {
  const filePath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}
