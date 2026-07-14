import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");
const reportPath = join(repoRoot, "docs", "status", "FINAL_CLEANROOM_AUDIT.md");
const report = readFileSync(reportPath, "utf8");

describe("final cleanroom audit report", () => {
  it("records failures before conclusions", () => {
    const failuresIndex = report.indexOf("## 1. Failures Recorded First");
    const verdictIndex = report.indexOf("## 14. Cleanroom Verdict");

    expect(failuresIndex).toBeGreaterThanOrEqual(0);
    expect(verdictIndex).toBeGreaterThan(failuresIndex);
    expect(report).toContain("No silent product repair was performed");
  });

  it("preserves the fail-closed production catalog conclusion", () => {
    expect(report).toContain("Production record count: 0");
    expect(report).toContain("productionRecommendationsEnabled");
    expect(report).toContain("false");
    expect(report).toContain("NOT_READY_FOR_PUBLIC_LAUNCH");
  });

  it("documents fixture and placeholder production blocking", () => {
    expect(report).toContain("Fixture rows with production access allowed: 0");
    expect(report).toContain("Placeholder rows with production access allowed: 0");
    expect(report).toContain("Rows with production access allowed: 0");
  });
});
