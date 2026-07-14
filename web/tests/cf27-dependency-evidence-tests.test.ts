import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 evidence CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { generateDependencyEvidenceReport, writeDependencyEvidenceReport } from "../../scripts/cf27-dependency-evidence-tests.mjs";

type DependencyTestRecord = {
  variable: string;
  executionStatus: string;
  result: string;
  productionEligible: boolean;
  evidence: Array<Record<string, unknown>>;
  observedChanges: Record<string, string>;
  requiredFollowUp: string[];
};

describe("CF27 dependency evidence tests", () => {
  it("executes only dependency observations supported by current evidence", () => {
    const report = generateDependencyEvidenceReport({
      generatedAt: "2026-07-14T07:00:00-04:00"
    });

    expect(report.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(report.productionRecommendationsEnabled).toBe(false);
    expect(report.productionCompletionAllowed).toBe(false);
    expect(report.summary.variableCount).toBe(16);
    expect(report.summary.executedVariableCount).toBe(2);
    expect(report.summary.blockedOrNotExecutedVariableCount).toBe(14);
    expect(report.summary.variablesWithExecutedEvidence).toEqual(["head", "skinTone"]);
    expect(report.tests.every((test: DependencyTestRecord) => test.productionEligible === false)).toBe(true);
  });

  it("keeps head dependency research inconclusive until controlled follow-up captures exist", () => {
    const head = dependency("head");

    expect(head.executionStatus).toBe("EXECUTED_RESEARCH_OBSERVATION");
    expect(head.result).toBe("INCONCLUSIVE_RESEARCH_ONLY");
    expect(head.evidence.length).toBe(2);
    expect(head.observedChanges.countsChanged).toBe("UNKNOWN_NOT_TESTED");
    expect(head.observedChanges.orderChanged).toBe("ORDER_INCOMPLETE_WITH_VISIBLE_GAPS");
    expect(head.observedChanges.geometryChanged).toBe("SELECTED_HEAD_VISUAL_PRESENTATION_CHANGED_BUT_PRODUCTION_GEOMETRY_NOT_VALIDATED");
    expect(head.requiredFollowUp.join(" ")).toContain("GFM-CAP-002");
  });

  it("records skin tone as a presentation-control observation without claiming geometry dependency", () => {
    const skinTone = dependency("skinTone");

    expect(skinTone.executionStatus).toBe("EXECUTED_RESEARCH_OBSERVATION");
    expect(skinTone.result).toBe("INCONCLUSIVE_RESEARCH_ONLY");
    expect(skinTone.evidence.length).toBe(2);
    expect(skinTone.observedChanges.geometryChanged).toBe("NO_GEOMETRY_CHANGE_CLAIMED_COLOR_PRESENTATION_CONTROL_ONLY");
    expect(skinTone.observedChanges.labelsChanged).toBe("SELECTED_NATIVE_SKIN_TONE_LABEL_CHANGED");
    expect(skinTone.requiredFollowUp.join(" ")).toContain("GFM-CAP-005");
  });

  it("does not mark missing environment, body, hair, or account dependency tests as passed", () => {
    const blockedVariables = [
      "platform",
      "patch",
      "height",
      "weight",
      "bodyType",
      "hairstyle",
      "facialHair",
      "onlineState",
      "eaAccountState",
      "edition",
      "entitlements"
    ];

    for (const variable of blockedVariables) {
      const test = dependency(variable);
      expect(test.executionStatus).not.toBe("EXECUTED_RESEARCH_OBSERVATION");
      expect(test.result).toBe("NOT_RUN");
      expect(test.observedChanges.countsChanged).toBe("NOT_TESTED");
      expect(test.requiredFollowUp.length).toBeGreaterThan(0);
    }
  });

  it("writes JSON, CSV, and Markdown research outputs", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-dependency-tests-"));
    const report = generateDependencyEvidenceReport({
      generatedAt: "2026-07-14T07:00:00-04:00"
    });

    writeDependencyEvidenceReport(report, {
      root,
      outputJsonPath: "data/phase-zero/dependency_tests.research.json",
      outputCsvPath: "data/phase-zero/dependency_tests.research.csv",
      outputMarkdownPath: "docs/phase-zero/DEPENDENCY_TEST_EXECUTION.md"
    });

    expect(JSON.parse(fs.readFileSync(path.join(root, "data/phase-zero/dependency_tests.research.json"), "utf8")).summary.executedVariableCount).toBe(2);
    expect(fs.readFileSync(path.join(root, "data/phase-zero/dependency_tests.research.csv"), "utf8")).toContain("BLOCKED_BY_MISSING_ENVIRONMENT_METADATA");
    expect(fs.readFileSync(path.join(root, "docs/phase-zero/DEPENDENCY_TEST_EXECUTION.md"), "utf8")).toContain("none are marked passed");
  });
});

function dependency(variable: string): DependencyTestRecord {
  const report = generateDependencyEvidenceReport({
    generatedAt: "2026-07-14T07:00:00-04:00"
  });
  const test = report.tests.find((candidate: DependencyTestRecord) => candidate.variable === variable);
  expect(test).toBeTruthy();
  return test as DependencyTestRecord;
}
