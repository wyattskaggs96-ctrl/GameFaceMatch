import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generatedProductionCatalogManifest } from "@/lib/catalog/generated-production-manifest";
import { dataSourceTypeLabels, dataSourceTypes } from "@/lib/data/source-types";
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

describe("data source separation", () => {
  it("keeps production, research, fixture, demo, and local sample namespaces explicit", () => {
    expect(dataSourceTypes).toEqual(["production", "researchDraft", "testFixture", "demoData", "localDeveloperSample"]);
    for (const sourceType of dataSourceTypes) {
      expect(dataSourceTypeLabels[sourceType]).toBeTruthy();
    }
    for (const relativePath of ["../data/catalog/production", "../data/audit/college-football-27", "../data/fixtures/test-only", "../data/demo", "../data/local-samples"]) {
      expect(fs.existsSync(path.resolve(process.cwd(), relativePath)), relativePath).toBe(true);
    }
  });

  it("requires production JSON files to use production source type only", () => {
    const productionDir = path.resolve(process.cwd(), "../data/catalog/production");
    for (const file of listFiles(productionDir).filter((candidate) => candidate.endsWith(".json"))) {
      const json = JSON.parse(fs.readFileSync(file, "utf8")) as { sourceType?: string };
      expect(json.sourceType, file).toBe("production");
      expect(JSON.stringify(json), file).not.toMatch(/testFixture|researchDraft|demoData|localDeveloperSample|test-only|fixture/i);
    }
  });

  it("keeps test fixtures under the fixture namespace with fixture source type", () => {
    const fixtureDir = path.resolve(process.cwd(), "../data/fixtures/test-only");
    const fixtureFiles = listFiles(fixtureDir).filter((candidate) => candidate.endsWith(".json"));
    expect(fixtureFiles.length).toBeGreaterThan(0);
    for (const file of fixtureFiles) {
      const json = JSON.parse(fs.readFileSync(file, "utf8")) as { sourceType?: string };
      expect(json.sourceType, file).toBe("testFixture");
    }
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

describe("architecture decision records", () => {
  it("documents the current architecture decisions and known gaps", () => {
    const adrDir = path.resolve(process.cwd(), "../docs/adr");
    const adrIndex = fs.readFileSync(path.join(adrDir, "README.md"), "utf8");
    const adrFiles = fs.readdirSync(adrDir).filter((file) => /^ADR-\d{4}-.+\.md$/.test(file));
    expect(adrFiles.length).toBeGreaterThanOrEqual(12);
    for (const required of [
      "ADR-0001-responsive-web-mvp.md",
      "ADR-0002-native-ios-foundation-status.md",
      "ADR-0003-on-device-first-facial-processing.md",
      "ADR-0004-game-specific-adapter-architecture.md",
      "ADR-0005-production-catalog-versus-fixtures.md",
      "ADR-0006-evidence-storage-relative-paths.md",
      "ADR-0007-immutable-catalog-releases.md",
      "ADR-0008-local-first-raw-media-handling.md",
      "ADR-0009-user-facing-recommendation-gate.md",
      "ADR-0010-admin-catalog-manager-boundaries.md",
      "ADR-0011-second-verifier-workflow.md",
      "ADR-0012-patch-version-handling.md"
    ]) {
      expect(adrFiles).toContain(required);
      expect(adrIndex).toContain(required);
      const text = fs.readFileSync(path.join(adrDir, required), "utf8");
      expect(text).toContain("Status: Accepted");
      expect(text).toContain("## Current Gaps");
    }
  });
});

describe("repository hygiene tooling", () => {
  it("documents and ships the safe repository status script", () => {
    const scriptPath = path.resolve(process.cwd(), "../scripts/repository-status.mjs");
    const workflowPath = path.resolve(process.cwd(), "../docs/development/GIT_WORKFLOW.md");
    const script = fs.readFileSync(scriptPath, "utf8");
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(script).toContain("getGitStatusEntries");
    expect(script).toContain("findProductionFixtureWarnings");
    expect(script).toContain("findRawMediaWarnings");
    expect(script).toContain("--strict");
    expect(workflow).toContain("node scripts/repository-status.mjs");
    expect(workflow).toContain("Do not run `git reset --hard`");
  });
});

describe("unified verification command", () => {
  it("documents and exposes the root verify command", () => {
    const rootPackagePath = path.resolve(process.cwd(), "../package.json");
    const verifyScriptPath = path.resolve(process.cwd(), "../scripts/verify.mjs");
    const readmePath = path.resolve(process.cwd(), "../README.md");
    const workflowPath = path.resolve(process.cwd(), "../docs/development/GIT_WORKFLOW.md");
    const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));
    const verifyScript = fs.readFileSync(verifyScriptPath, "utf8");
    const readme = fs.readFileSync(readmePath, "utf8");
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(rootPackage.scripts.verify).toBe("node scripts/verify.mjs");
    expect(verifyScript).toContain("Web type-check");
    expect(verifyScript).toContain("Requirement traceability check");
    expect(verifyScript).toContain("Production catalog fixture separation check");
    expect(verifyScript).toContain("Web local smoke and end-to-end tests");
    expect(verifyScript).toContain("Native iOS unit tests");
    expect(readme).toContain("npm run verify");
    expect(workflow).toContain("Unified Verification Command");
  });
});

describe("requirement traceability", () => {
  it("keeps a machine-readable matrix and generated report in sync", () => {
    const matrixPath = path.resolve(process.cwd(), "../data/traceability/requirements.json");
    const reportPath = path.resolve(process.cwd(), "../docs/status/REQUIREMENT_TRACEABILITY.md");
    const generatorPath = path.resolve(process.cwd(), "../scripts/generate-traceability-report.mjs");
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    const report = fs.readFileSync(reportPath, "utf8");
    const generator = fs.readFileSync(generatorPath, "utf8");
    expect(matrix.metadata.generatedReport).toBe("docs/status/REQUIREMENT_TRACEABILITY.md");
    expect(matrix.requirements.length).toBeGreaterThanOrEqual(20);
    expect(matrix.requirements.map((requirement: { id: string }) => requirement.id)).toContain("GFM-CAP-001");
    expect(matrix.requirements.map((requirement: { id: string }) => requirement.id)).toContain("GFM-MATCH-001");
    expect(matrix.requirements.map((requirement: { id: string }) => requirement.id)).toContain("GFM-PRIV-001");
    expect(report).toContain("Requirement Traceability Matrix");
    expect(report).toContain("GFM-P0-001");
    expect(report).toContain("BLOCKED_BY_GAME_ACCESS");
    expect(generator).toContain("--check");
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
