import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generatedProductionCatalogManifest } from "@/lib/catalog/generated-production-manifest";
import { KEY_NAVIGATION_FLOW } from "@/lib/navigation";

describe("production bundle boundaries", () => {
  it("does not include test-only fixture files under web public", () => {
    const publicDir = path.join(process.cwd(), "public");
    const files = fs.existsSync(publicDir) ? listFiles(publicDir) : [];
    expect(files.some((file) => file.includes("test-only") || file.includes(`${path.sep}fixtures${path.sep}`))).toBe(false);
  });

  it("keeps the generated web production manifest in sync with shared catalog data", () => {
    const sharedManifestPath = path.resolve(process.cwd(), "../data/catalog/production/catalog_manifest.json");
    const sharedManifest = JSON.parse(fs.readFileSync(sharedManifestPath, "utf8"));
    expect(generatedProductionCatalogManifest).toEqual(sharedManifest);
  });
});

describe("source governance", () => {
  it("keeps a registry that classifies binding and unrelated sources", () => {
    const registryPath = path.resolve(process.cwd(), "../docs/governance/SOURCE_REGISTRY.md");
    const registry = fs.readFileSync(registryPath, "utf8");
    expect(registry).toContain("docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md");
    expect(registry).toContain("EA Sports College Football 27");
    expect(registry).toContain("Skaggs Systems First Customer Autopilot source");
    expect(registry).toContain("Unrelated");
    expect(registry).toContain("Excluded");
  });

  it("requires contributors to consult the source registry", () => {
    const agentsPath = path.resolve(process.cwd(), "../AGENTS.md");
    const agents = fs.readFileSync(agentsPath, "utf8");
    expect(agents).toContain("docs/governance/SOURCE_REGISTRY.md");
  });
});

describe("key navigation flow", () => {
  it("contains the expected customer-facing sequence", () => {
    expect(KEY_NAVIGATION_FLOW).toEqual([
      "welcome",
      "product",
      "disclaimer",
      "privacy",
      "consent",
      "home",
      "start",
      "preparation",
      "capability",
      "capture",
      "attributes",
      "profile-review",
      "processing",
      "results"
    ]);
  });
});

function listFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
