import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHASE0_APPROVED_EVIDENCE_VIEW_LABELS,
  createEvidenceRenamePlan,
  createEvidenceRenamePlans,
  extensionFromFilename,
  generateEvidenceFilename,
  validateEvidenceNamingInput
} from "@/lib/phase-zero/phase-zero-evidence-naming";

const now = "2026-07-12T00:00:00.000Z";

describe("Phase 0 evidence file and folder naming", () => {
  it("documents preview-only rename plans with destructive renames disabled", () => {
    const schema = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../data/schemas/evidence-naming.schema.json"), "utf8"));

    expect(schema.required).toContain("previewOnly");
    expect(schema.properties.previewOnly.const).toBe(true);
    expect(schema.properties.destructiveRenameAllowed.const).toBe(false);
  });

  it("generates deterministic safe filenames in the required token order", () => {
    expect(generateEvidenceFilename(validInput())).toBe("CF27_PS5_RTG_HEAD_001_front_1.0.0_patch-2026-07_20260712.png");
  });

  it("supports every approved evidence view label", () => {
    for (const view of PHASE0_APPROVED_EVIDENCE_VIEW_LABELS) {
      expect(validateEvidenceNamingInput({ ...validInput(), view })).toEqual([]);
    }
  });

  it("rejects missing fields, placeholder tokens, and unsafe characters", () => {
    const issues = validateEvidenceNamingInput({
      catalogID: "REPLACE_WITH_VERIFIED_GAME_LABEL",
      view: "front*bad",
      gameVersion: "",
      patch: "patch/unsafe",
      date: "",
      extension: ""
    });

    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["missingField", "invalidView", "unsafeCharacters"]));
    expect(issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(["catalogID", "gameVersion", "patch", "date", "extension"]));
  });

  it("validates catalog ID, version, patch, real date, view, and extension", () => {
    const issues = validateEvidenceNamingInput({
      catalogID: "CF27_HEAD_001",
      view: "quarterTurn",
      gameVersion: "1 0",
      patch: "patch 1",
      date: "20260231",
      extension: "exe"
    });

    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "invalidCatalogID",
      "invalidView",
      "invalidVersion",
      "invalidPatch",
      "invalidDate",
      "invalidExtension"
    ]));
  });

  it("creates a non-destructive rename-plan preview with target path validation", () => {
    const plan = createEvidenceRenamePlan({
      ...validInput(),
      intakeID: "intake-synthetic-001",
      currentRelativePath: "audit/session/front.png",
      targetDirectory: "data/audit/college-football-27/local-evidence",
      existingRelativePaths: []
    }, now);

    expect(plan).toMatchObject({
      status: "ready",
      previewOnly: true,
      destructiveRenameAllowed: false,
      generatedFilename: "CF27_PS5_RTG_HEAD_001_front_1.0.0_patch-2026-07_20260712.png",
      targetRelativePath: "data/audit/college-football-27/local-evidence/CF27_PS5_RTG_HEAD_001_front_1.0.0_patch-2026-07_20260712.png"
    });
  });

  it("blocks duplicate target paths from existing paths and pending plans", () => {
    const duplicateExisting = createEvidenceRenamePlan({
      ...validInput(),
      intakeID: "intake-synthetic-001",
      currentRelativePath: "audit/session/front.png",
      targetDirectory: "data/audit/college-football-27/local-evidence",
      existingRelativePaths: ["data/audit/college-football-27/local-evidence/CF27_PS5_RTG_HEAD_001_front_1.0.0_patch-2026-07_20260712.png"]
    }, now);
    const pendingPlans = createEvidenceRenamePlans([
      {
        ...validInput(),
        intakeID: "intake-synthetic-001",
        currentRelativePath: "audit/session/front-a.png",
        targetDirectory: "data/audit/college-football-27/local-evidence",
        existingRelativePaths: []
      },
      {
        ...validInput(),
        intakeID: "intake-synthetic-002",
        currentRelativePath: "audit/session/front-b.png",
        targetDirectory: "data/audit/college-football-27/local-evidence",
        existingRelativePaths: []
      }
    ], now);

    expect(duplicateExisting.status).toBe("blocked");
    expect(duplicateExisting.issues.map((issue) => issue.code)).toContain("duplicatePath");
    expect(pendingPlans.every((plan) => plan.status === "blocked")).toBe(true);
    expect(pendingPlans.flatMap((plan) => plan.issues.map((issue) => issue.code))).toContain("duplicatePath");
  });

  it("blocks unsafe target directories and extracts extensions safely", () => {
    const plan = createEvidenceRenamePlan({
      ...validInput(),
      extension: extensionFromFilename("folder/evidence.HEIC"),
      intakeID: "intake-synthetic-001",
      currentRelativePath: "audit/session/evidence.HEIC",
      targetDirectory: "../outside",
      existingRelativePaths: []
    }, now);

    expect(plan.status).toBe("blocked");
    expect(plan.issues.map((issue) => issue.code)).toContain("unsafeTargetDirectory");
    expect(plan.generatedFilename).toBe("CF27_PS5_RTG_HEAD_001_front_1.0.0_patch-2026-07_20260712.heic");
  });
});

function validInput() {
  return {
    catalogID: "CF27_PS5_RTG_HEAD_001",
    view: "front",
    gameVersion: "1.0.0",
    patch: "patch-2026-07",
    date: "20260712",
    extension: "png"
  };
}
