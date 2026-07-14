import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");
const checkpointPath = join(repoRoot, "docs", "status", "FINAL_PROGRAM_CHECKPOINT.md");
const checkpoint = readFileSync(checkpointPath, "utf8");

describe("final program checkpoint", () => {
  it("records conservative completion numbers and a blocked release decision", () => {
    expect(checkpoint).toContain("Web product shell completion | 54.5%");
    expect(checkpoint).toContain("Phase 0 evidence preparation | 42%");
    expect(checkpoint).toContain("Research catalog completion | 50%");
    expect(checkpoint).toContain("Production catalog completion | 0%");
    expect(checkpoint).toContain("Decision: `BLOCKED`");
  });

  it("keeps production catalog, verification, and study claims honest", () => {
    expect(checkpoint).toContain("Production catalog has zero verified records");
    expect(checkpoint).toContain("No false participant result exists");
    expect(checkpoint).toContain("Production recommendations remain fail-closed");
  });

  it("documents the required launch plans without approving launch", () => {
    expect(checkpoint).toContain("Catalog Maintenance Plan");
    expect(checkpoint).toContain("Patch Monitoring Plan");
    expect(checkpoint).toContain("First 30-Day Launch Plan");
    expect(checkpoint).toContain("Do not create a release candidate");
  });
});
