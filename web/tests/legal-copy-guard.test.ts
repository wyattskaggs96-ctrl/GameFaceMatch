import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(__dirname, "..", "..");
const guardScript = path.join(repositoryRoot, "scripts", "legal-copy-guard.mjs");

describe("legal copy guard", () => {
  it("passes current product and marketing copy surfaces", () => {
    const result = spawnSync("node", [guardScript, "--json"], {
      cwd: repositoryRoot,
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as { findingCount: number; scannedFileCount: number };
    expect(report.findingCount).toBe(0);
    expect(report.scannedFileCount).toBeGreaterThan(0);
  });

  it("blocks affirmative perfect-match, official-integration, and face-import claims", () => {
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-legal-copy-"));
    const fixture = path.join(fixtureDir, "bad-copy.md");
    fs.writeFileSync(
      fixture,
      [
        "# Bad copy",
        "Get a perfect match in College Football 27.",
        "GameFace Match is the official EA integration for face import.",
        "Guaranteed resemblance in every result."
      ].join("\n")
    );

    const result = spawnSync("node", [guardScript, "--json", fixture], {
      cwd: repositoryRoot,
      encoding: "utf8"
    });
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as { findings: Array<{ claimID: string }> };
    expect(report.findings.map((finding) => finding.claimID)).toEqual(
      expect.arrayContaining(["perfect-match", "official-ea-integration", "face-import", "guaranteed-resemblance"])
    );
  });

  it("allows disclaimer and prohibition-list context", () => {
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-legal-copy-"));
    const fixture = path.join(fixtureDir, "safe-copy.md");
    fs.writeFileSync(
      fixture,
      [
        "# Safe copy",
        "Do not claim perfect match, direct face import, official EA integration, guaranteed resemblance, biometric identification, or medical-grade measurement.",
        "GameFace Match is not affiliated with, endorsed by, or sponsored by Electronic Arts or EA SPORTS.",
        "The app does not identify people."
      ].join("\n")
    );

    const result = spawnSync("node", [guardScript, "--json", fixture], {
      cwd: repositoryRoot,
      encoding: "utf8"
    });
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as { findingCount: number; allowedReferenceCount: number };
    expect(report.findingCount).toBe(0);
    expect(report.allowedReferenceCount).toBeGreaterThan(0);
  });
});

