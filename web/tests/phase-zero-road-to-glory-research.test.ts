import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const researchPath = path.resolve(process.cwd(), "../data/research/cf27/catalog-candidates/research/road-to-glory-creation-path");

describe("CF27 Road to Glory creation-path research candidate", () => {
  it("keeps the observed environment manifest research-only with unknown fields explicit", () => {
    const environment = readJson("environment_manifest.json");

    expect(environment.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(environment.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(environment.platformName).toBe("Xbox (model UNKNOWN)");
    expect(environment.consoleModel).toBe("UNKNOWN");
    expect(environment.gameExecutableVersion).toBe("UNKNOWN");
    expect(environment.patchLabel).toBe("UNKNOWN");
    expect(environment.edition).toBe("UNKNOWN");
    expect(environment.region).toBe("UNKNOWN");
    expect(environment.hdrState).toBe("unknown");
    expect(environment.displayModel).toBe("UNKNOWN");
    expect(environment.notes).toContain("Hair is visible");
  });

  it("records only directly observed creation-path steps and timestamps", () => {
    const creationPaths = readJson("creation_paths.json");
    const [pathRecord] = creationPaths.creationPaths;

    expect(pathRecord.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(pathRecord.verificationState).toBe("research_candidate");
    expect(pathRecord.status).toBe("draft");
    expect(pathRecord.exactPath).toContain("Road to Glory");
    expect(pathRecord.exactPath).toContain("QB");
    expect(pathRecord.exactPath).toContain("Head & Skin / Hair visible");
    expect(pathRecord.exactPath).not.toContain("Hair opened");

    const instructions = pathRecord.reproducibleSteps.map((step: { instruction: string }) => step.instruction);
    expect(instructions).toEqual([
      expect.stringContaining("Road to Glory"),
      expect.stringContaining("Advance"),
      expect.stringContaining("journey type"),
      expect.stringContaining("QB"),
      expect.stringContaining("Create Player"),
      expect.stringContaining("Player top tab"),
      expect.stringContaining("Appearance"),
      expect.stringContaining("Head & Skin"),
      expect.stringContaining("Hair")
    ]);

    for (const step of pathRecord.reproducibleSteps) {
      expect(step.evidence.sourceVideoID).toBe("video-001");
      expect(step.evidence.evidenceID).toBe("evidence-cf27-video-001-source");
      expect(typeof step.evidence.startSeconds).toBe("number");
      expect(typeof step.evidence.endSeconds).toBe("number");
    }
    expect(pathRecord.reproducibleSteps.at(-1).limitation).toContain("Hair visibility is confirmed");
  });

  it("stores root menu records without promoting catalog options", () => {
    const menuMap = readJson("menu_map.json");
    const labels = menuMap.items.map((item: { nativeLabel: string }) => item.nativeLabel);

    expect(menuMap.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(menuMap.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(labels).toEqual(expect.arrayContaining(["ROAD TO GLORY", "ROAD TO GLORY SETUP", "QB", "CREATE PLAYER", "PLAYER", "Appearance", "Head & Skin", "Hair"]));
    expect(menuMap.items.every((item: { verificationState: string; sourceType: string }) => item.verificationState === "research_candidate" && item.sourceType === "research")).toBe(true);
    expect(JSON.stringify(menuMap)).not.toContain("CF27_XBOX_RTG_HEAD_");
    expect(JSON.stringify(menuMap)).not.toContain("VERIFIED");
  });

  it("links source-video evidence timestamps and missing-field issues", () => {
    const evidence = readJson("evidence_references.json");
    const issues = readJson("issues_and_exceptions.json");
    const issueTitles = issues.issues.map((issue: { title: string }) => issue.title);

    expect(evidence.sourceVideo.sha256).toBe("6f42d3ef2572810fc09ac5138970dee5f325c539925f084a130d3fdcf7c2a0b2");
    expect(evidence.evidenceFiles[0].relativePath).toBe("OWNER_DOWNLOADS/01_Environment_and_Creation_Path.MP4");
    expect(evidence.evidenceFiles[0].verificationStatus).toBe("draft");
    expect(evidence.timestampReferences.length).toBeGreaterThanOrEqual(10);
    expect(evidence.timestampReferences.some((reference: { observedLabels: string[] }) => reference.observedLabels.includes("Hair"))).toBe(true);

    expect(issues.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(issues.issues.every((issue: { status: string }) => issue.status === "open")).toBe(true);
    expect(issueTitles).toEqual(expect.arrayContaining([
      "Missing environment field: console model",
      "Missing environment field: game executable version",
      "Missing environment field: patch",
      "Missing environment field: hdr",
      "Missing environment field: display model",
      "Hair menu visible but not opened in video-001"
    ]));
  });
});

function readJson(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(researchPath, fileName), "utf8"));
}
