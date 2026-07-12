import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_CATALOG_ITEM_SCHEMA_VERSION,
  requiredStableIDPatternForCatalogKind,
  validatePhase0TypedCatalogItemRecord,
  type Phase0CatalogItemCore,
  type Phase0AdditionalFaceMatchingAttributeRecord,
  type Phase0CatalogEvidenceReference,
  type Phase0CatalogRecordKind,
  type Phase0FacialHairRecord,
  type Phase0HairstyleRecord,
  type Phase0HeadPresetRecord,
  type Phase0TypedCatalogItemRecord
} from "@/lib/phase-zero/phase-zero-catalog-item-schemas";

describe("Phase 0 typed catalog item schemas", () => {
  it("requires source fields for every typed catalog schema", () => {
    for (const schemaFile of ["head-preset", "hairstyle", "facial-hair-option", "additional-face-attribute"]) {
      const schema = readSchema(schemaFile);
      for (const field of [
        "schemaVersion",
        "stableInternalID",
        "kind",
        "gameID",
        "platformCode",
        "modeCode",
        "gameVersionID",
        "patchID",
        "creationPathID",
        "menuMapID",
        "menuItemID",
        "nativeCategoryLabel",
        "visibleGameLabelOrIndex",
        "nativeOrder",
        "evidence",
        "dependencies",
        "canonicalSettings",
        "verificationState",
        "firstReviewID",
        "secondReviewID",
        "deprecationState",
        "deprecatedReason",
        "supersedesStableID",
        "supersededByStableID",
        "lastCheckedDate",
        "isTestFixture",
        "notes"
      ]) {
        expect(schema.required, `${schemaFile} missing ${field}`).toContain(field);
      }
    }
  });

  it("documents the required stable ID conventions without creating real records", () => {
    expect(requiredStableIDPatternForCatalogKind("headPreset").test("CF27_SYNTHETIC_SYNTHETICMODE_HEAD_001")).toBe(true);
    expect(requiredStableIDPatternForCatalogKind("hairstyle").test("CF27_SYNTHETIC_SYNTHETICMODE_HAIR_001")).toBe(true);
    expect(requiredStableIDPatternForCatalogKind("facialHair").test("CF27_SYNTHETIC_SYNTHETICMODE_FACIALHAIR_001")).toBe(true);
    expect(requiredStableIDPatternForCatalogKind("headPreset").test("head-synthetic")).toBe(false);
  });

  it("accepts complete synthetic records for all typed catalog kinds", () => {
    for (const record of [headRecord(), hairstyleRecord(), facialHairRecord(), additionalAttributeRecord()]) {
      const report = validatePhase0TypedCatalogItemRecord(record);
      expect(report.errors, record.stableInternalID).toEqual([]);
      expect(report.ok).toBe(true);
    }
  });

  it("rejects wrong stable ID conventions and metadata mismatches", () => {
    const record = headRecord();
    record.stableInternalID = "CF27_SYNTHETIC_SYNTHETICMODE_HAIR_001";
    record.platformCode = "OTHER";
    const codes = validatePhase0TypedCatalogItemRecord(record).errors.map((error) => error.code);
    expect(codes).toContain("invalidStableIDConvention");
    expect(codes).toContain("stableIDMetadataMismatch");
  });

  it("rejects missing required angle evidence for head presets", () => {
    const record = headRecord();
    record.evidence = record.evidence.filter((evidence) => evidence.requiredAngleID !== "leftProfile");
    expect(validatePhase0TypedCatalogItemRecord(record).errors.map((error) => error.code)).toContain("missingRequiredAngleEvidence");
  });

  it("rejects verified records without second review and deprecated records without context", () => {
    const record = hairstyleRecord();
    record.verificationState = "verified";
    record.secondReviewID = null;
    record.deprecationState = "deprecated";
    record.deprecatedReason = null;
    const codes = validatePhase0TypedCatalogItemRecord(record).errors.map((error) => error.code);
    expect(codes).toContain("missingSecondReview");
    expect(codes).toContain("missingDeprecationContext");
  });

  it("rejects canonical settings without evidence and skin presentation in geometry similarity", () => {
    const record = additionalAttributeRecord();
    record.attributeFamily = "skinPresentation";
    record.affectsGeometrySimilarity = true;
    record.canonicalSettings[0].evidenceFileIDs = [];
    const codes = validatePhase0TypedCatalogItemRecord(record).errors.map((error) => error.code);
    expect(codes).toContain("missingCanonicalSettingEvidence");
    expect(codes).toContain("sensitiveGeometrySeparation");
  });
});

function readSchema(name: string) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `../data/schemas/${name}.schema.json`), "utf8")) as { required: string[] };
}

function headRecord(): Phase0HeadPresetRecord {
  return {
    ...baseRecord("CF27_SYNTHETIC_SYNTHETICMODE_HEAD_001", "headPreset"),
    supportedMeasurementIDs: ["faceWidthRatio"],
    geometryAnnotationStatus: "partial",
    evidence: requiredAngleEvidence()
  };
}

function hairstyleRecord(): Phase0HairstyleRecord {
  return {
    ...baseRecord("CF27_SYNTHETIC_SYNTHETICMODE_HAIR_001", "hairstyle"),
    standardizedHairLength: "unknown",
    standardizedHairTexture: "unknown",
    obscuresForehead: null,
    obscuresEars: null
  };
}

function facialHairRecord(): Phase0FacialHairRecord {
  return {
    ...baseRecord("CF27_SYNTHETIC_SYNTHETICMODE_FACIALHAIR_001", "facialHair"),
    standardizedCoverage: "unknown",
    obscuresJawline: null,
    obscuresMouth: null
  };
}

function additionalAttributeRecord(): Phase0AdditionalFaceMatchingAttributeRecord {
  return {
    ...baseRecord("CF27_SYNTHETIC_SYNTHETICMODE_EYEBROW_001", "additionalFaceMatchingAttribute"),
    attributeFamily: "eyebrow",
    valueType: "label",
    affectsGeometrySimilarity: false
  };
}

function baseRecord<K extends Phase0CatalogRecordKind>(stableInternalID: string, kind: K): Phase0CatalogItemCore & { kind: K } {
  return {
    schemaVersion: PHASE0_CATALOG_ITEM_SCHEMA_VERSION,
    stableInternalID,
    kind,
    gameID: "game-synthetic",
    platformCode: "SYNTHETIC",
    modeCode: "SYNTHETICMODE",
    gameVersionID: "version-synthetic",
    patchID: "patch-synthetic",
    creationPathID: "creation-path-synthetic",
    menuMapID: "menu-map-synthetic",
    menuItemID: "menu-item-synthetic",
    nativeCategoryLabel: "synthetic-category",
    visibleGameLabelOrIndex: "synthetic-visible-label",
    nativeOrder: 1,
    evidence: [
      {
        evidenceFileID: "evidence-synthetic",
        purpose: "optionIdentity",
        requiredAngleID: null,
        notes: "Synthetic test-only evidence reference."
      }
    ],
    dependencies: [
      {
        dependencyID: "dependency-synthetic",
        dependsOnStableID: null,
        dependsOnMenuID: "menu-item-synthetic",
        condition: "Synthetic dependency condition.",
        evidenceFileIDs: ["evidence-synthetic"]
      }
    ],
    canonicalSettings: [
      {
        settingID: "setting-synthetic",
        menuMapID: "menu-map-synthetic",
        menuItemID: "menu-item-synthetic",
        nativeLabel: "synthetic-native-label",
        visibleLabelOrIndex: "synthetic-visible-label",
        nativeOrder: 1,
        valueType: "label",
        canonicalValue: "synthetic-value",
        navigationInstructionIDs: ["navigation-synthetic"],
        evidenceFileIDs: ["evidence-synthetic"],
        notes: "Synthetic canonical setting."
      }
    ],
    verificationState: "firstReviewPending",
    firstReviewID: null,
    secondReviewID: null,
    deprecationState: "active",
    deprecatedReason: null,
    supersedesStableID: null,
    supersededByStableID: null,
    lastCheckedDate: "2026-07-12",
    isTestFixture: true,
    notes: "Synthetic test-only typed catalog record."
  };
}

function requiredAngleEvidence(): Phase0CatalogEvidenceReference[] {
  return ["straightOn", "left45", "right45", "leftProfile", "rightProfile"].map((requiredAngleID) => ({
    evidenceFileID: `evidence-${requiredAngleID}`,
    purpose: "requiredAngle",
    requiredAngleID,
    notes: `Synthetic ${requiredAngleID} evidence.`
  }));
}
