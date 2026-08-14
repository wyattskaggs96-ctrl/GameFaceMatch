import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const guardScriptPath = path.resolve(process.cwd(), "scripts/production-bundle-guard.mjs");

describe("production bundle guard", () => {
  it("rejects blocked fixture paths inside traced NFT metadata", () => {
    const buildRoot = createTemporaryBuildRoot();
    fs.writeFileSync(path.join(buildRoot, ".next/server/route.js.nft.json"), JSON.stringify({ files: ["../../data/fixtures/test-only/matching/synthetic-catalog.json"] }));

    expect(() => execFileSync("node", [guardScriptPath], { cwd: buildRoot, encoding: "utf8", stdio: "pipe" })).toThrow(/data\\\/fixtures\\\/test-only|data\/fixtures\/test-only/);
  });

  it("passes a production bundle without blocked fixture traces", () => {
    const buildRoot = createTemporaryBuildRoot();
    fs.writeFileSync(path.join(buildRoot, ".next/server/route.js.nft.json"), JSON.stringify({ files: ["../../data/catalog/production/catalog_manifest.json"] }));
    fs.writeFileSync(path.join(buildRoot, ".next/static/app.js"), "production bundle asset");

    const output = execFileSync("node", [guardScriptPath], { cwd: buildRoot, encoding: "utf8" });
    expect(output).toContain("Production bundle guard OK");
  });
});

function createTemporaryBuildRoot() {
  const buildRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gfm-production-bundle-guard-"));
  fs.mkdirSync(path.join(buildRoot, ".next/server"), { recursive: true });
  fs.mkdirSync(path.join(buildRoot, ".next/static"), { recursive: true });
  return buildRoot;
}
