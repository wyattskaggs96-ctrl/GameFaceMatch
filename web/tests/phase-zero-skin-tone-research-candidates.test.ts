import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface SkinToneResearchPackage {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  verificationStateForAllRecords: string;
  scope: {
    recordRange: string;
    completeCategoryCountClaimed: boolean;
    excludedLabels: string[];
  };
  selectorObservations: {
    firstObservedSelectedValue: string;
    finalObservedSelectedValue: string;
    gridStructure: string;
    selectorAppearsComplete: boolean;
    wrapObserved: boolean;
  };
  observationPolicy: {
    sensitiveTraitLabelsAllowed: boolean;
    objectiveColorMeasurementAllowed: boolean;
    geometrySimilarityUse: string;
  };
  selectionSequence: Array<{
    visibleGameLabelOrIndex: string;
    timestampRangeSeconds: string;
  }>;
  records: SkinToneResearchRecord[];
}

interface SkinToneResearchRecord {
  nativeOrder: number;
  stableInternalID: string;
  visibleGameLabelOrIndex: string;
  category: string;
  kind: string;
  attributeFamily: string;
  valueType: string;
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
  researchMetadata: {
    visualColorMeasurement: {
      status: string;
      method: string;
      calibrated: boolean;
      productionUseAllowed: boolean;
      rgbMean: {
        r: number;
        g: number;
        b: number;
      };
    };
    geometryUse: string;
  };
  characterContext: {
    selectedHeadAppearsConstant: boolean;
    characterRotationAvailable: boolean;
    otherVisibleSettingsChanged: boolean;
  };
  verificationState: string;
  productionStatus: string;
}

interface SkinToneFrameManifest {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  outputRoot: string;
  frames: SkinToneFrameReference[];
}

interface SkinToneFrameReference {
  frameID: string;
  stableInternalID: string;
  visibleGameLabelOrIndex: string;
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

describe("CF27 Skin Tone research candidates", () => {
  const researchPackage = readJson<SkinToneResearchPackage>(
    "../data/research/cf27/catalog-candidates/research/skin-tone-values-001-024/skin_tone_research_candidates.json"
  );
  const frameManifest = readJson<SkinToneFrameManifest>(
    "../data/research/cf27/manifests/skin-tone-evidence-frames/skin_tone_evidence_frame_manifest.json"
  );

  it("keeps the package explicitly outside production", () => {
    expect(researchPackage.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(researchPackage.sourceType).toBe("researchCandidate");
    expect(researchPackage.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(researchPackage.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(researchPackage.verificationStateForAllRecords).toBe("NOT_VERIFIED");
    expect(researchPackage.scope.completeCategoryCountClaimed).toBe(false);
    expect(researchPackage.observationPolicy.sensitiveTraitLabelsAllowed).toBe(false);
    expect(researchPackage.observationPolicy.objectiveColorMeasurementAllowed).toBe(true);
    expect(researchPackage.observationPolicy.geometrySimilarityUse).toBe("excluded");
  });

  it("contains only directly selected Skin Tone 01 through Skin Tone 24 values", () => {
    expect(researchPackage.records).toHaveLength(24);
    expect(researchPackage.scope.recordRange).toBe("Skin Tone 01 through Skin Tone 24 directly selected in video-004");
    expect(researchPackage.records.map((record) => record.nativeOrder)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
    expect(researchPackage.records.map((record) => record.visibleGameLabelOrIndex)).toEqual(
      Array.from({ length: 24 }, (_, index) => `Skin Tone ${String(index + 1).padStart(2, "0")}`)
    );
    expect(researchPackage.records.some((record) => /Skin Tone (2[5-9]|[3-9][0-9])/.test(record.visibleGameLabelOrIndex))).toBe(false);
    expect(researchPackage.scope.excludedLabels).toEqual(expect.arrayContaining(["labels beyond Skin Tone 24", "unselected neighboring swatches"]));
  });

  it("records the direct selection order without converting thumbnails into records", () => {
    expect(researchPackage.selectorObservations.firstObservedSelectedValue).toBe("Skin Tone 09");
    expect(researchPackage.selectorObservations.finalObservedSelectedValue).toBe("Skin Tone 11");
    expect(researchPackage.selectorObservations.gridStructure).toBe("4-column scrollable grid");
    expect(researchPackage.selectorObservations.selectorAppearsComplete).toBe(false);
    expect(researchPackage.selectorObservations.wrapObserved).toBe(false);
    expect(researchPackage.selectionSequence.map((entry) => entry.visibleGameLabelOrIndex)).toEqual([
      "Skin Tone 09",
      "Skin Tone 08",
      "Skin Tone 04",
      "Skin Tone 16",
      "Skin Tone 20",
      "Skin Tone 19",
      "Skin Tone 18",
      "Skin Tone 15",
      "Skin Tone 21",
      "Skin Tone 06",
      "Skin Tone 07",
      "Skin Tone 05",
      "Skin Tone 23",
      "Skin Tone 24",
      "Skin Tone 22",
      "Skin Tone 17",
      "Skin Tone 14",
      "Skin Tone 13",
      "Skin Tone 10",
      "Skin Tone 12",
      "Skin Tone 01",
      "Skin Tone 02",
      "Skin Tone 03",
      "Skin Tone 11"
    ]);
  });

  it("uses research-candidate stable IDs, source video provenance, and native-order grid positions", () => {
    const stableIDs = new Set<string>();
    for (const record of researchPackage.records) {
      expect(record.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_SKINTONE_${String(record.nativeOrder).padStart(3, "0")}`);
      expect(stableIDs.has(record.stableInternalID)).toBe(false);
      stableIDs.add(record.stableInternalID);
      expect(record.selectedMenuEvidence.length, record.stableInternalID).toBeGreaterThanOrEqual(1);
      for (const evidence of record.selectedMenuEvidence) {
        expect(evidence.videoID).toBe("video-004");
        expect(evidence.timestampRangeSeconds).toMatch(/^[0-9.]+-[0-9.]+$/);
        expect(evidence.basis).toContain("direct selected Skin Tone label");
      }
      expect(record.gridPositionFromNativeIndex.columns).toBe(4);
      expect(record.gridPositionFromNativeIndex.nativeRow).toBe(Math.ceil(record.nativeOrder / 4));
      expect(record.gridPositionFromNativeIndex.nativeColumn).toBe(((record.nativeOrder - 1) % 4) + 1);
    }
  });

  it("separates native skin-presentation values from geometry matching and sensitive labels", () => {
    for (const record of researchPackage.records) {
      expect(record.category).toBe("Skin Tone");
      expect(record.kind).toBe("additionalFaceMatchingAttribute");
      expect(record.attributeFamily).toBe("skinPresentation");
      expect(record.valueType).toBe("index");
      expect(record.affectsGeometrySimilarity).toBe(false);
      expect(record.researchMetadata.geometryUse).toBe("excluded_from_geometry_similarity");
      expect(record.characterContext.selectedHeadAppearsConstant).toBe(true);
      expect(record.characterContext.characterRotationAvailable).toBe(true);
      expect(record.characterContext.otherVisibleSettingsChanged).toBe(false);
      expect(record.verificationState).toBe("NOT_VERIFIED");
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(record).not.toHaveProperty("race");
      expect(record).not.toHaveProperty("ethnicity");
      expect(record).not.toHaveProperty("demographicLabel");
    }
  });

  it("stores uncalibrated objective color measurements as research metadata only", () => {
    for (const record of researchPackage.records) {
      const measurement = record.researchMetadata.visualColorMeasurement;
      expect(measurement.status).toBe("measured_from_screen_recording");
      expect(measurement.method).toBe("ffmpeg_area_scaled_fixed_character_patch_rgb_average_v1");
      expect(measurement.calibrated).toBe(false);
      expect(measurement.productionUseAllowed).toBe(false);
      expect(measurement.rgbMean.r).toBeGreaterThanOrEqual(0);
      expect(measurement.rgbMean.r).toBeLessThanOrEqual(255);
      expect(measurement.rgbMean.g).toBeGreaterThanOrEqual(0);
      expect(measurement.rgbMean.g).toBeLessThanOrEqual(255);
      expect(measurement.rgbMean.b).toBeGreaterThanOrEqual(0);
      expect(measurement.rgbMean.b).toBeLessThanOrEqual(255);
    }
  });

  it("keeps frame derivatives local, relative, and research-only", () => {
    expect(frameManifest.dataClass).toBe("RESEARCH_DERIVATIVE");
    expect(frameManifest.sourceType).toBe("researchDerivative");
    expect(frameManifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(frameManifest.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(frameManifest.outputRoot).toBe("data/research/cf27/generated/full-resolution-frames/skin-tone-values-001-024");
    expect(frameManifest.frames).toHaveLength(48);

    for (const frame of frameManifest.frames) {
      expect(["MENU", "CHARACTER_STABLE"]).toContain(frame.role);
      expect(frame.sourceVideoID).toBe("video-004");
      expect(frame.portableRelativeEvidencePath).toBe("OWNER_DOWNLOADS/03_Appearance_Skin_Tone.MP4");
      expect(path.isAbsolute(frame.outputRelativePath), frame.outputRelativePath).toBe(false);
      expect(frame.outputRelativePath).toContain("data/research/cf27/generated/full-resolution-frames/skin-tone-values-001-024");
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
