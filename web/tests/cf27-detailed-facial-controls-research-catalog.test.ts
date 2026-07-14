import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 detailed facial-control research CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateDetailedFacialControlsCatalog, writeDetailedFacialControlsCatalog } from "../../scripts/cf27-detailed-facial-controls-research-catalog.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");

describe("CF27 detailed facial-control research catalog", () => {
  it("catalogs only directly observed facial controls and menu-only rows", () => {
    const catalog = generateDetailedFacialControlsCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    }) as DetailedFacialControlsCatalog;

    expect(catalog.summary.directlyObservedControlCount).toBe(6);
    expect(catalog.summary.menuOnlyObservedControlCount).toBe(3);
    expect(catalog.summary.directlyObservedValueCount).toBe(54);
    expect(catalog.summary.productionEligibleRecordCount).toBe(0);
    expect(catalog.summary.observedNativeControls).toEqual([
      "Skin Tone",
      "Skin Details",
      "Eye Shape",
      "Eye Color",
      "Nose",
      "Ear Shape"
    ]);
    expect(catalog.summary.menuOnlyNativeControls).toEqual(["Mouth Shape", "Jaw Shape", "Chin"]);
  });

  it("preserves native labels and does not invent missing ranges, defaults, or sliders", () => {
    const catalog = generateDetailedFacialControlsCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    }) as DetailedFacialControlsCatalog;
    const skinDetails = control(catalog, "Skin Details");
    const mouth = control(catalog, "Mouth Shape");

    expect(skinDetails.values.map((value) => value.nativeDisplayLabel)).toEqual([
      "None",
      "Freckles 2",
      "Scar 3",
      "Scar 2",
      "Scar 1",
      "Acne Scar 1",
      "Redness 3",
      "Redness 2",
      "Redness 1",
      "Freckles 1"
    ]);
    expect(skinDetails.totalCountStatus).toBe("COUNT_UNKNOWN");
    expect(skinDetails.defaultStatus).toBe("UNKNOWN_NOT_DIRECTLY_SHOWN");
    expect(skinDetails.sliderStatus).toBe("NOT_APPLICABLE_NON_SLIDER_CONTROL");
    expect(skinDetails.minimum).toBeNull();
    expect(skinDetails.maximum).toBeNull();
    expect(skinDetails.stepSize).toBeNull();

    expect(mouth.observationStatus).toBe("MENU_ROW_OBSERVED_VALUES_NOT_CAPTURED");
    expect(mouth.values).toEqual([]);
    expect(mouth.totalCountStatus).toBe("COUNT_UNKNOWN");
    expect(mouth.recommendationSuitability).toBe("UNSUITABLE_MENU_ONLY_NO_VALUES_CATALOGED");
  });

  it("maps requested terms without creating standalone controls absent from current evidence", () => {
    const catalog = generateDetailedFacialControlsCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    }) as DetailedFacialControlsCatalog;
    const scars = requested(catalog, "Scars");
    const freckles = requested(catalog, "Freckles");
    const eyebrows = requested(catalog, "Eyebrows");
    const jaw = requested(catalog, "Jaw");

    expect(scars).toMatchObject({
      coverageStatus: "OBSERVED_AS_NATIVE_VALUE_UNDER_SKIN_DETAILS",
      mappedNativeControlLabel: "Skin Details",
      mappedNativeValues: ["Scar 1", "Scar 2", "Scar 3"]
    });
    expect(freckles).toMatchObject({
      coverageStatus: "OBSERVED_AS_NATIVE_VALUE_UNDER_SKIN_DETAILS",
      mappedNativeControlLabel: "Skin Details",
      mappedNativeValues: ["Freckles 1", "Freckles 2"]
    });
    expect(eyebrows).toMatchObject({
      coverageStatus: "NOT_OBSERVED_IN_CURRENT_EVIDENCE",
      mappedNativeControlLabel: null,
      mappedNativeValues: []
    });
    expect(jaw).toMatchObject({
      coverageStatus: "MENU_ROW_OBSERVED_VALUES_NOT_CAPTURED",
      mappedNativeControlLabel: "Jaw Shape",
      mappedNativeValues: []
    });

    expect(catalog.controls.some((item) => item.nativeControlLabel === "Eyebrows")).toBe(false);
    expect(catalog.controls.some((item) => item.nativeControlLabel === "Brow Shape")).toBe(false);
    expect(catalog.controls.some((item) => item.nativeControlLabel === "Sliders")).toBe(false);
  });

  it("keeps every value research-only and production-ineligible", () => {
    const catalog = generateDetailedFacialControlsCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    }) as DetailedFacialControlsCatalog;

    expect(catalog.productionRecommendationsEnabled).toBe(false);
    for (const record of catalog.records) {
      expect(record.dataClass).toBe("RESEARCH_CANDIDATE");
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(record.verificationStatus).toBe("OBSERVED_PENDING_VERIFICATION");
      expect(record.recommendationSuitability).toBe("UNSUITABLE_RESEARCH_ONLY_NOT_VERIFIED");
    }
    for (const item of catalog.controls) {
      expect(item.productionEligibility.eligible).toBe(false);
    }
  });

  it("writes JSON, CSV, and Markdown outputs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-detailed-facial-controls-"));
    const catalog = generateDetailedFacialControlsCatalog({
      root: repositoryRoot,
      generatedAt: "2026-07-14T01:15:00-04:00"
    }) as DetailedFacialControlsCatalog;

    writeDetailedFacialControlsCatalog(catalog, { root });

    const json = JSON.parse(fs.readFileSync(path.join(root, "data/phase-zero/detailed_facial_controls.research.json"), "utf8")) as DetailedFacialControlsCatalog;
    const csv = fs.readFileSync(path.join(root, "data/phase-zero/detailed_facial_controls.research.csv"), "utf8");
    const markdown = fs.readFileSync(path.join(root, "docs/phase-zero/DETAILED_FACIAL_CONTROLS_RESEARCH_CATALOG.md"), "utf8");

    expect(json.summary.directlyObservedValueCount).toBe(54);
    expect(csv).toContain("detailedControlID,nativeControlLabel,observationStatus");
    expect(markdown).toContain("PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED");
    expect(markdown).toContain("No detailed facial-control record in this catalog is production eligible.");
  });
});

interface DetailedFacialControlsCatalog {
  productionRecommendationsEnabled: boolean;
  summary: {
    directlyObservedControlCount: number;
    menuOnlyObservedControlCount: number;
    directlyObservedValueCount: number;
    productionEligibleRecordCount: number;
    observedNativeControls: string[];
    menuOnlyNativeControls: string[];
  };
  controls: DetailedFacialControl[];
  requestedCoverage: RequestedCoverage[];
  records: DetailedFacialControlRecord[];
}

interface DetailedFacialControl {
  nativeControlLabel: string;
  observationStatus: string;
  values: Array<{
    nativeDisplayLabel: string;
  }>;
  totalCountStatus: string;
  defaultStatus: string;
  sliderStatus: string;
  minimum: number | null;
  maximum: number | null;
  stepSize: number | null;
  recommendationSuitability: string;
  productionEligibility: {
    eligible: boolean;
  };
}

interface RequestedCoverage {
  requestedTerm: string;
  coverageStatus: string;
  mappedNativeControlLabel: string | null;
  mappedNativeValues: string[];
}

interface DetailedFacialControlRecord {
  dataClass: string;
  productionStatus: string;
  verificationStatus: string;
  recommendationSuitability: string;
}

function control(catalog: DetailedFacialControlsCatalog, nativeControlLabel: string): DetailedFacialControl {
  const result = catalog.controls.find((item) => item.nativeControlLabel === nativeControlLabel);
  if (!result) throw new Error(`Missing detailed facial control ${nativeControlLabel}`);
  return result;
}

function requested(catalog: DetailedFacialControlsCatalog, requestedTerm: string): RequestedCoverage {
  const result = catalog.requestedCoverage.find((item) => item.requestedTerm === requestedTerm);
  if (!result) throw new Error(`Missing requested coverage ${requestedTerm}`);
  return result;
}
