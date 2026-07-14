import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(__dirname, "..", "..");
const boardPath = path.join(repositoryRoot, "docs", "status", "FINAL_PRODUCTION_READINESS_BOARD.md");

const reviewedAreas = [
  "Product",
  "Catalog",
  "Verification",
  "Matching accuracy",
  "Privacy",
  "Security",
  "Accessibility",
  "Legal-review status",
  "Analytics",
  "Support",
  "Payments",
  "Performance",
  "Operational readiness",
  "Rollback",
  "Patch maintenance"
];

describe("final production-readiness board", () => {
  it("returns a single blocked launch decision and reviews every required area", () => {
    const board = fs.readFileSync(boardPath, "utf8");

    expect(board).toContain("## Decision\n\nBLOCKED");
    for (const area of reviewedAreas) {
      expect(board).toContain(`| ${area} |`);
    }
  });

  it("keeps mandatory human and legal gates explicit before launch approval", () => {
    const board = fs.readFileSync(boardPath, "utf8");

    expect(board).toContain("Production catalog records: 0.");
    expect(board).toContain("Independent second-verifier approvals: 0.");
    expect(board).toContain("Real matching accuracy study participants: 0.");
    expect(board).toContain("Public-launch legal review: not completed.");
    expect(board).toContain("`APPROVED_FOR_PUBLIC_LAUNCH` is not available");
  });
});
