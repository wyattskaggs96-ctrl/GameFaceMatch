import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error The repository validator is an ESM script outside the web TS project.
import { validateFc26PlayerCreatorResearch } from "../../scripts/fc26-player-creator-validate.mjs";

const researchPath = path.join(process.cwd(), "..", "data", "research", "fc26", "player_creator_research.json");
const research = JSON.parse(fs.readFileSync(researchPath, "utf8"));

describe("FC26 player-creator research data", () => {
  it("validates the research-only player creator observations", () => {
    const report = validateFc26PlayerCreatorResearch(research);
    expect(report.ok).toBe(true);
    expect(report.summary).toMatchObject({
      sourceVideos: 2,
      menuEntries: 10,
      controls: 28,
      unresolvedObservations: 3
    });
  });

  it("keeps FC26 observations out of production recommendation paths", () => {
    expect(research.game.gameID).toBe("ea-sports-fc-26");
    expect(research.productionEligible).toBe(false);
    expect(research.game.recommendationsEnabled).toBe(false);
    expect(research.verificationState).toBe("research_observed_not_production_verified");
  });

  it("preserves source video and timestamp evidence for every observed value", () => {
    const sourceIDs = new Set(research.sourceVideos.map((video: { videoID: string }) => video.videoID));
    for (const control of research.controls) {
      for (const value of control.observedValues) {
        expect(value.value, control.controlID).toBeTruthy();
        expect(sourceIDs.has(value.videoID), `${control.controlID} ${value.value}`).toBe(true);
        expect(value.timestampSeconds, `${control.controlID} ${value.value}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("does not claim complete selector ranges or slider boundaries from partial footage", () => {
    expect(research.controls.every((control: { rangeComplete: boolean }) => control.rangeComplete === false)).toBe(true);
    expect(research.controls.filter((control: { controlType: string }) => control.controlType === "slider")).toHaveLength(0);
  });

  it("has no duplicate menu or control IDs", () => {
    expect(hasDuplicates(research.menuHierarchy.map((menu: { menuID: string }) => menu.menuID))).toBe(false);
    expect(hasDuplicates(research.controls.map((control: { controlID: string }) => control.controlID))).toBe(false);
  });

  it("records unclear and not-shown findings separately from observed controls", () => {
    expect(research.unresolvedObservations.map((item: { confidence: string }) => item.confidence)).toEqual(["unclear", "unclear", "unclear"]);
    expect(research.notShownRequirements.every((item: { confidence: string }) => item.confidence === "not_shown")).toBe(true);
  });
});

function hasDuplicates(values: string[]) {
  return new Set(values).size !== values.length;
}
