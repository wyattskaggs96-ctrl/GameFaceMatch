import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(__dirname, "..", "..");
const reviewPath = path.join(repositoryRoot, "docs", "status", "MVP_ACCEPTANCE_REVIEW.md");

const requiredCriteria = [
  "Guided scan",
  "Unusable-capture blocking",
  "Selective retakes",
  "Standardized profile",
  "Verified production catalog",
  "Top-three recommendations",
  "Accurate menu instructions",
  "User-correctable attributes",
  "No invented options",
  "Complete deletion",
  "Raw-media deletion by default",
  "Screenshot refinement",
  "Invalid screenshot recovery",
  "Confidence and limitations",
  "Disclaimer",
  "Accessibility",
  "Safe analytics",
  "Stable repeat scans",
  "Useful human-rated top-three performance"
];

describe("MVP acceptance review", () => {
  it("keeps the acceptance verdict and every required criterion documented", () => {
    const review = fs.readFileSync(reviewPath, "utf8");

    expect(review).toContain("## Verdict");
    expect(review).toMatch(/\nFAIL\n/);

    for (const criterion of requiredCriteria) {
      expect(review).toContain(`| ${criterion} |`);
    }
  });

  it("documents the data-dependent failures without weakening production gates", () => {
    const review = fs.readFileSync(reviewPath, "utf8");

    expect(review).toContain("The production College Football 27 catalog contains zero verified records.");
    expect(review).toContain("Real production top-three recommendations and exact build instructions are intentionally disabled while the catalog is empty.");
    expect(review).toContain("No invented College Football 27 option can reach the user-facing production path.");
  });
});
