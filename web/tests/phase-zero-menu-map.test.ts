import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPhase0MenuChildren, PHASE0_MENU_MAP_SCHEMA_VERSION, validatePhase0MenuMap, type Phase0MenuMap, type Phase0MenuMapItem } from "@/lib/phase-zero/phase-zero-menu-map";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 menu-map schema", () => {
  it("requires production-grade menu-map fields", () => {
    const schemaPath = path.resolve(process.cwd(), "../data/schemas/menu-map.schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const menuItemRequired = schema.$defs.menuItem.required as string[];
    for (const field of [
      "stableMenuID",
      "parentMenuID",
      "displayLabel",
      "nativeLabel",
      "nativeOrder",
      "controlType",
      "minimum",
      "maximum",
      "step",
      "defaultValue",
      "totalValues",
      "wrapBehavior",
      "visibleLabelState",
      "resetBehavior",
      "laterEditability",
      "dependencies",
      "locks",
      "warnings",
      "defects",
      "environmentID",
      "evidence",
      "scrollingContinuationEvidence",
      "captureResearcher",
      "verifier",
      "verificationStatus",
      "notes"
    ]) {
      expect(menuItemRequired).toContain(field);
    }
  });

  it("accepts a nested synthetic menu map with scrolling continuation evidence", () => {
    const report = validatePhase0MenuMap(validMenuMap());
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(getPhase0MenuChildren(validMenuMap(), "menu-root").map((item) => item.stableMenuID)).toEqual(["menu-appearance"]);
  });

  it("rejects duplicate stable menu IDs", () => {
    const menuMap = validMenuMap();
    menuMap.items.push({ ...menuMap.items[1] });
    expect(validatePhase0MenuMap(menuMap).errors.map((error) => error.code)).toContain("duplicateMenuID");
  });

  it("rejects invalid parent relationships and parent cycles", () => {
    const missingParent = validMenuMap();
    missingParent.items[1].parentMenuID = "missing-parent";
    expect(validatePhase0MenuMap(missingParent).errors.map((error) => error.code)).toContain("invalidParentMenuID");

    const cycle = validMenuMap();
    cycle.items[0].parentMenuID = "menu-head";
    expect(validatePhase0MenuMap(cycle).errors.map((error) => error.code)).toContain("invalidParentCycle");
  });

  it("rejects invalid numeric controls and missing scrolling evidence", () => {
    const menuMap = validMenuMap();
    const slider = menuMap.items.find((item) => item.stableMenuID === "menu-head");
    const continuationOwner = menuMap.items.find((item) => item.stableMenuID === "menu-appearance");
    if (!slider) throw new Error("synthetic slider missing");
    if (!continuationOwner) throw new Error("synthetic continuation owner missing");
    slider.minimum = 10;
    slider.maximum = 1;
    slider.step = 0;
    continuationOwner.scrollingContinuationEvidence[0].evidenceFileIDs = [];
    const codes = validatePhase0MenuMap(menuMap).errors.map((error) => error.code);
    expect(codes).toContain("invalidControlRange");
    expect(codes).toContain("missingEvidence");
  });

  it("requires a verifier before a menu item can be verified", () => {
    const menuMap = validMenuMap();
    menuMap.items[0].verificationStatus = "verified";
    menuMap.items[0].verifier = null;
    expect(validatePhase0MenuMap(menuMap).errors.map((error) => error.code)).toContain("missingVerifier");
  });
});

function validMenuMap(): Phase0MenuMap {
  return {
    schemaVersion: PHASE0_MENU_MAP_SCHEMA_VERSION,
    mapID: "menu-map-synthetic",
    createdAt: now,
    updatedAt: now,
    gameID: "game-synthetic",
    creationPathID: "creation-path-synthetic",
    catalogVersionID: null,
    items: [
      menuItem({
        stableMenuID: "menu-root",
        parentMenuID: null,
        displayLabel: "synthetic-root",
        nativeLabel: "synthetic-root",
        nativeOrder: 1,
        controlType: "menu"
      }),
      menuItem({
        stableMenuID: "menu-appearance",
        parentMenuID: "menu-root",
        displayLabel: "synthetic-appearance",
        nativeLabel: "synthetic-appearance",
        nativeOrder: 1,
        controlType: "submenu",
        scrollingContinuationEvidence: [
          {
            fromMenuID: "menu-appearance",
            toMenuID: "menu-head",
            direction: "down",
            evidenceFileIDs: ["evidence-scroll"],
            notes: "Synthetic continuation evidence."
          }
        ]
      }),
      menuItem({
        stableMenuID: "menu-head",
        parentMenuID: "menu-appearance",
        displayLabel: "synthetic-head",
        nativeLabel: "synthetic-head",
        nativeOrder: 1,
        controlType: "slider",
        minimum: 1,
        maximum: 10,
        step: 1,
        defaultValue: 1,
        totalValues: 10,
        dependencies: [
          {
            id: "dependency-synthetic",
            dependsOnMenuID: "menu-appearance",
            condition: "Synthetic dependency condition.",
            evidenceFileIDs: ["evidence-synthetic"]
          }
        ]
      })
    ]
  };
}

function menuItem(input: Partial<Phase0MenuMapItem> & Pick<Phase0MenuMapItem, "stableMenuID" | "parentMenuID" | "displayLabel" | "nativeLabel" | "nativeOrder" | "controlType">): Phase0MenuMapItem {
  return {
    minimum: null,
    maximum: null,
    step: null,
    defaultValue: null,
    totalValues: null,
    wrapBehavior: "none",
    visibleLabelState: "visible",
    resetBehavior: "resetsToDefault",
    laterEditability: "editableLater",
    dependencies: [],
    locks: [],
    warnings: [],
    defects: [],
    environmentID: "environment-synthetic",
    evidence: [
      {
        evidenceFileID: "evidence-synthetic",
        description: "Synthetic menu evidence."
      }
    ],
    scrollingContinuationEvidence: [],
    captureResearcher: "synthetic-researcher",
    verifier: null,
    verificationStatus: "firstReviewPending",
    notes: "Synthetic menu-map item.",
    ...input
  };
}
