import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 environment CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateEnvironmentCreationPathResearch, writeEnvironmentCreationPathResearch } from "../../scripts/cf27-environment-creation-path-research.mjs";

describe("CF27 environment and creation-path research", () => {
  it("populates only directly supported fields and leaves unresolved fields null", () => {
    const fixture = createFixtureWorkspace();

    const outputs = generateEnvironmentCreationPathResearch({
      root: fixture.root,
      generatedAt: "2026-07-13T22:20:00-04:00"
    });

    expect(outputs.environment).toMatchObject({
      dataClass: "RESEARCH_CANDIDATE",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "OBSERVED_PENDING_VERIFICATION",
      gameTitle: "EA SPORTS College Football 27",
      platform: "Xbox",
      gameMode: "Road to Glory",
      position: "QB",
      gameVersion: null,
      patchVersion: null,
      consoleModel: null,
      eaAccountRequirement: null,
      appearanceEditableLater: null
    });
    expect(outputs.environment.fieldEvidence.position.timelineRecordID).toBe("phase0-video-001-tl-005");
    expect(outputs.environment.missingEnvironmentEvidence.map((field: { field: string }) => field.field)).toContain("gameVersion");
    expect(outputs.environment.canonicalPathAssessment.productionCatalogPathAssessment).toBe("NOT_SUFFICIENT_FOR_PRODUCTION_CATALOG_PATH");
  });

  it("creates a reproducible research-only path with timestamped evidence for every step", () => {
    const fixture = createFixtureWorkspace();

    const outputs = generateEnvironmentCreationPathResearch({
      root: fixture.root,
      generatedAt: "2026-07-13T22:20:00-04:00"
    });

    const pathRecord = outputs.creationPaths.creationPaths[0];
    expect(pathRecord.status).toBe("supported_for_research_only");
    expect(pathRecord.reproducibleSteps).toHaveLength(9);
    expect(pathRecord.reproducibleSteps.every((step: { evidence: { startTimestamp: number | null; endTimestamp: number | null } }) => Number.isFinite(step.evidence.startTimestamp) && Number.isFinite(step.evidence.endTimestamp))).toBe(true);
    expect(pathRecord.restrictions.map((restriction: { id: string }) => restriction.id)).toContain("restriction-research-only");
  });

  it("writes environment, path, issue, CSV, and findings outputs", () => {
    const fixture = createFixtureWorkspace();
    const outputs = generateEnvironmentCreationPathResearch({
      root: fixture.root,
      generatedAt: "2026-07-13T22:20:00-04:00"
    });

    writeEnvironmentCreationPathResearch(outputs, { root: fixture.root });

    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/environment_manifest.research.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/creation_paths.research.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/creation_paths.research.csv"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/issues_register.research.json"))).toBe(true);
    expect(Object.keys(JSON.parse(fs.readFileSync(path.join(fixture.root, "data/phase-zero/issues_register.research.json"), "utf8"))).sort()).toEqual([
      "createdAt",
      "issues",
      "registerID",
      "schemaVersion",
      "updatedAt"
    ]);
    expect(fs.readFileSync(path.join(fixture.root, "docs/phase-zero/ENVIRONMENT_AND_CREATION_PATH_FINDINGS.md"), "utf8")).toContain("SUPPORTED_AS_RESEARCH_CANONICAL_PATH_WITH_LIMITATIONS");
  });
});

function createFixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-env-path-"));
  fs.mkdirSync(path.join(root, "data/phase-zero"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/phase-zero/video_inventory.json"), JSON.stringify({
    inventory: [
      {
        inventoryId: "phase0-video-001",
        originalFilename: "01_Environment_and_Creation_Path.MP4",
        canonicalFilename: "01_Environment_and_Creation_Path.mp4",
        sha256: "source-sha",
        fileSizeBytes: 123,
        durationSeconds: 73.57,
        dimensions: { width: 1920, height: 1080 },
        frameRate: 58.96,
        sourceLocation: { portableRelativeEvidencePath: "OWNER_DOWNLOADS/01_Environment_and_Creation_Path.MP4" }
      }
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/evidence_manifest.json"), JSON.stringify({
    entries: [
      {
        evidence_id: "phase0-source-phase0-video-001",
        relative_path: "OWNER_DOWNLOADS/01_Environment_and_Creation_Path.MP4",
        sha256: "source-sha",
        size_bytes: 123
      }
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/video_timeline.json"), JSON.stringify({
    records: [
      record("phase0-video-001-tl-001", 0, 7, "College Football hub / Road to Glory navigation"),
      record("phase0-video-001-tl-003", 12, 17, "Road to Glory menu/start area"),
      record("phase0-video-001-tl-004", 18, 23, "Archetype / prospect selection cards"),
      record("phase0-video-001-tl-005", 24, 29, "Player setup / position path"),
      record("phase0-video-001-tl-007", 33, 37, "Create Player appearance path/menu"),
      record("phase0-video-001-tl-008", 38, 45, "Create Player menu navigation")
    ]
  }, null, 2));
  return { root };
}

function record(timeline_record_id: string, start_timestamp: number, end_timestamp: number, visible_menu_label: string) {
  return {
    timeline_record_id,
    start_timestamp,
    end_timestamp,
    visible_menu_label
  };
}
