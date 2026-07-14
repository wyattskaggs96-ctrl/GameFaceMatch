import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(__dirname, "..", "..");
const decisionPath = path.join(repositoryRoot, "docs", "status", "RELEASE_CANDIDATE_DECISION.md");

const requiredRcGates = [
  "Versioned build",
  "Immutable production catalog",
  "Signed catalog manifest",
  "Environment configuration validation",
  "No test fixtures",
  "No placeholder records",
  "No research-only records",
  "Full test suite passing",
  "Production smoke test",
  "Database migration test",
  "Rollback package",
  "Release notes",
  "Support runbook",
  "Privacy and deletion validation",
  "Monitoring enabled"
];

describe("release candidate decision", () => {
  it("blocks RC creation when the readiness board is blocked", () => {
    const decision = fs.readFileSync(decisionPath, "utf8");

    expect(decision).toContain("Release engineer decision: RELEASE_CANDIDATE_NOT_CREATED");
    expect(decision).toContain("Release candidate tag: NOT_CREATED");
    expect(decision).toContain("The current readiness review does not permit a release candidate.");
    expect(decision).toContain("tag: NOT_CREATED");
  });

  it("documents every requested release-candidate gate", () => {
    const decision = fs.readFileSync(decisionPath, "utf8");

    for (const gate of requiredRcGates) {
      expect(decision).toContain(`| ${gate} |`);
    }
  });
});
