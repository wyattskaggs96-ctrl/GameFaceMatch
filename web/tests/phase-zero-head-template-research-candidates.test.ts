import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { requiredStableIDPatternForCatalogKind } from "@/lib/phase-zero/phase-zero-catalog-item-schemas";

interface HeadTemplateResearchPackage {
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  verificationStateForAllRecords: string;
  scope: {
    completeCategoryCountClaimed: boolean;
    excludedLabels: string[];
  };
  records: HeadTemplateResearchRecord[];
}

interface HeadTemplateResearchRecord {
  nativeOrder: number;
  stableInternalID: string;
  visibleGameLabelOrIndex: string;
  selectedMenuEvidence: Array<{
    videoID: string;
    timestampRangeSeconds: string;
    basis: string;
  }>;
  observedViews: string[];
  missingViews: string[];
  hairObservation: string;
  facialHairObservation: string;
  eyeBlackObservation: string;
  otherVisibleObstructions: string[];
  characterLoaded: boolean;
  notificationOverlayObserved: boolean;
  captureCompleteness: string;
  verificationState: string;
}

describe("CF27 Head Template research candidates", () => {
  const researchPackage = readResearchPackage();

  it("keeps the package explicitly outside production", () => {
    expect(researchPackage.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(researchPackage.sourceType).toBe("researchCandidate");
    expect(researchPackage.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(researchPackage.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(researchPackage.verificationStateForAllRecords).toBe("NOT_VERIFIED");
    expect(researchPackage.scope.completeCategoryCountClaimed).toBe(false);
  });

  it("contains only selected Head Template labels Face 1 through Face 29", () => {
    expect(researchPackage.records).toHaveLength(29);
    expect(researchPackage.records.map((record) => record.nativeOrder)).toEqual(Array.from({ length: 29 }, (_, index) => index + 1));
    expect(researchPackage.records.map((record) => record.visibleGameLabelOrIndex)).toEqual(
      Array.from({ length: 29 }, (_, index) => `Face ${index + 1}`)
    );
    expect(researchPackage.records.some((record) => /Face 3[0-9]/.test(record.visibleGameLabelOrIndex))).toBe(false);
    expect(researchPackage.scope.excludedLabels).toEqual(["labels beyond Face 29"]);
  });

  it("uses the approved research stable-ID convention and preserves native order", () => {
    const stableIDPattern = requiredStableIDPatternForCatalogKind("headPreset");
    const stableIDs = new Set<string>();
    for (const record of researchPackage.records) {
      expect(stableIDPattern.test(record.stableInternalID), record.stableInternalID).toBe(true);
      expect(record.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_HEAD_${String(record.nativeOrder).padStart(3, "0")}`);
      expect(stableIDs.has(record.stableInternalID)).toBe(false);
      stableIDs.add(record.stableInternalID);
    }
  });

  it("preserves Face 12 as one identity with evidence from both head-template videos", () => {
    const face12 = researchPackage.records.find((record) => record.nativeOrder === 12);
    expect(face12).toBeDefined();
    expect(face12?.stableInternalID).toBe("CF27_XBOXUNKNOWN_RTG_HEAD_012");
    expect(face12?.selectedMenuEvidence.map((evidence) => evidence.videoID).sort()).toEqual(["video-002", "video-003"]);
  });

  it("records selected-menu evidence, view coverage, obstructions, load state, and non-verified status for every record", () => {
    for (const record of researchPackage.records) {
      expect(record.selectedMenuEvidence.length, record.stableInternalID).toBeGreaterThanOrEqual(1);
      for (const evidence of record.selectedMenuEvidence) {
        expect(["video-002", "video-003"]).toContain(evidence.videoID);
        expect(evidence.timestampRangeSeconds).toMatch(/^[0-9.]+-[0-9.]+$/);
        expect(evidence.basis).toContain("direct selected Head Template label");
      }
      expect(record.observedViews).toEqual(expect.arrayContaining(["front", "leftThreeQuarter", "leftProfile", "rear", "rightProfile", "rightThreeQuarter"]));
      expect(record.missingViews).toEqual(["elevated", "lowered"]);
      expect(record.hairObservation).toContain("not inferred as a game option");
      expect(record.facialHairObservation).toContain("No native facial-hair option inferred");
      expect(record.eyeBlackObservation).toContain("Black cheek eye paint visible");
      expect(record.otherVisibleObstructions).toContain("football uniform shoulder pads");
      expect(record.characterLoaded).toBe(true);
      expect(typeof record.notificationOverlayObserved).toBe("boolean");
      expect(record.captureCompleteness).toBe("primary_rotation_views_present_missing_elevated_and_lowered");
      expect(record.verificationState).toBe("NOT_VERIFIED");
    }
  });
});

function readResearchPackage(): HeadTemplateResearchPackage {
  const filePath = path.resolve(
    process.cwd(),
    "../data/research/cf27/catalog-candidates/research/head-templates-faces-001-029/head_template_research_candidates.json"
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as HeadTemplateResearchPackage;
}
