import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hierarchyPath = path.resolve(process.cwd(), "../data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy");

describe("CF27 appearance menu hierarchy research candidate", () => {
  it("records the directly observed Head & Skin hierarchy in native order", () => {
    const hierarchy = readJson("appearance_menu_hierarchy.json");
    const headSkinChildren = hierarchy.records
      .filter((record: MenuRecord) => record.parentMenuID === "cf27-menu-appearance-head-skin")
      .sort((left: MenuRecord, right: MenuRecord) => left.nativeOrder - right.nativeOrder);

    expect(hierarchy.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(hierarchy.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(headSkinChildren.map((record: MenuRecord) => record.displayLabel)).toEqual([
      "Head Template",
      "Skin Tone",
      "Skin Details",
      "Eye Shape",
      "Eye Color",
      "Nose",
      "Ear Shape",
      "Mouth Shape",
      "Jaw Shape",
      "Chin"
    ]);
  });

  it("keeps visible-only menus separate from inspected selector recordings", () => {
    const hierarchy = readJson("appearance_menu_hierarchy.json");
    const byLabel = new Map(hierarchy.records.map((record: MenuRecord) => [record.displayLabel, record]));

    expect(byLabel.get("Hair")).toMatchObject({ inspected: false, complete: false, additionalRecordingRequired: true });
    expect(byLabel.get("Mouth Shape")).toMatchObject({ inspected: false, complete: false, additionalRecordingRequired: true });
    expect(byLabel.get("Jaw Shape")).toMatchObject({ inspected: false, complete: false, additionalRecordingRequired: true });
    expect(byLabel.get("Chin")).toMatchObject({ inspected: false, complete: false, additionalRecordingRequired: true });

    for (const label of ["Head Template", "Skin Tone", "Skin Details", "Eye Shape", "Eye Color", "Nose", "Ear Shape"]) {
      expect(byLabel.get(label)).toMatchObject({ inspected: true, complete: false, additionalRecordingRequired: true });
    }
  });

  it("does not promote research hierarchy records to production or verified status", () => {
    const hierarchy = readJson("appearance_menu_hierarchy.json");
    const serialized = JSON.stringify(hierarchy);

    expect(hierarchy.records.every((record: MenuRecord) => record.productionStatus === "NOT_PRODUCTION_DATA")).toBe(true);
    expect(hierarchy.records.every((record: MenuRecord) => record.verificationStatus === "draft")).toBe(true);
    expect(serialized).not.toContain("approvedForProductionCatalog");
    expect(serialized).not.toContain('"verificationStatus":"verified"');
    expect(serialized).not.toContain("CF27_XBOX_RTG_HEAD_");
  });

  it("keeps the schema export within the existing menu-map schema contract", () => {
    const schema = readRootJson("data/schemas/menu-map.schema.json");
    const exportMap = readJson("menu_map_schema_export.json");
    const allowedMapKeys = Object.keys(schema.properties).sort();
    const allowedItemKeys = Object.keys(schema.$defs.menuItem.properties).sort();

    expect(exportMap.schemaVersion).toBe("phase0-menu-map-v1");
    expect(Object.keys(exportMap).sort()).toEqual(allowedMapKeys);
    for (const requiredKey of schema.required) {
      expect(exportMap[requiredKey]).not.toBeUndefined();
    }

    const ids = new Set<string>();
    for (const item of exportMap.items) {
      expect(Object.keys(item).sort()).toEqual(allowedItemKeys);
      for (const requiredKey of schema.$defs.menuItem.required) {
        expect(item[requiredKey]).not.toBeUndefined();
      }
      expect(ids.has(item.stableMenuID)).toBe(false);
      ids.add(item.stableMenuID);
      expect(item.verificationStatus).toBe("draft");
      expect(item.notes).toContain("additionalRecordingRequired=");
    }
  });

  it("documents schema comparison gaps instead of silently dropping Prompt 86 fields", () => {
    const comparison = readJson("menu_map_schema_comparison.json");

    expect(comparison.result).toBe("compatible_with_schema_export_limitations");
    expect(comparison.researchOnlyFieldsNotRepresentedInSchema).toEqual(expect.arrayContaining([
      "inspected",
      "complete",
      "additionalRecordingRequired",
      "startSeconds",
      "endSeconds"
    ]));
  });
});

interface MenuRecord {
  stableMenuID: string;
  parentMenuID: string | null;
  displayLabel: string;
  nativeOrder: number;
  inspected: boolean;
  complete: boolean;
  additionalRecordingRequired: boolean;
  productionStatus: string;
  verificationStatus: string;
}

function readJson(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(hierarchyPath, fileName), "utf8"));
}

function readRootJson(fileName: string) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "..", fileName), "utf8"));
}
