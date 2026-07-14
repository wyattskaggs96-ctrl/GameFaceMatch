import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root Phase 0 menu-map CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateAppearanceMenuMapResearch, writeAppearanceMenuMapResearch } from "../../scripts/cf27-appearance-menu-map-research.mjs";

describe("CF27 appearance menu map research", () => {
  it("reconstructs directly observed menus and selected options without production promotion", () => {
    const fixture = createFixtureWorkspace();
    const outputs = generateAppearanceMenuMapResearch({
      root: fixture.root,
      generatedAt: "2026-07-14T00:00:00-04:00"
    });
    const menuMap = outputs.menuMap;
    const menus = menuMap.records.filter((record: MenuMapRecord) => record.recordType === "menu");
    const options = menuMap.records.filter((record: MenuMapRecord) => record.recordType === "option");

    expect(menuMap.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(menuMap.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(menuMap.summary.productionEligibleRecords).toBe(0);
    expect(menus.map((record: MenuMapRecord) => record.displayLabel)).toEqual(expect.arrayContaining([
      "Appearance",
      "Head & Skin",
      "Hair",
      "Head Template",
      "Skin Tone",
      "Skin Details",
      "Eye Shape",
      "Eye Color",
      "Nose",
      "Ear Shape",
      "Mouth Shape",
      "Jaw Shape",
      "Chin"
    ]));
    expect(options.map((record: MenuMapRecord) => record.displayLabel)).toEqual(expect.arrayContaining([
      "Face 1",
      "Face 12",
      "Skin Tone 01",
      "None",
      "Aquiline",
      "Pointed"
    ]));
    expect(menuMap.records.every((record: MenuMapRecord) => record.productionEligibility.eligible === false)).toBe(true);
    expect(JSON.stringify(menuMap)).not.toContain('"verificationStatus":"verified"');
  });

  it("marks partial categories with explicit count/order gaps and preserves repeated selected observations", () => {
    const fixture = createFixtureWorkspace();
    const outputs = generateAppearanceMenuMapResearch({
      root: fixture.root,
      generatedAt: "2026-07-14T00:00:00-04:00"
    });
    const byLabel = new Map<string, MenuMapRecord>(outputs.menuMap.records.map((record: MenuMapRecord) => [record.displayLabel, record]));
    const nose = byLabel.get("Nose")!;
    const aquiline = outputs.menuMap.records.find((record: MenuMapRecord) => record.stableMenuID === "cf27-menu-option-nose-aquiline")!;

    expect(byLabel.get("Hair")).toMatchObject({
      captureStatus: "PARTIAL",
      inspected: false,
      gapFlags: expect.arrayContaining(["FIRST_VALUE_UNKNOWN", "FINAL_VALUE_UNKNOWN", "COUNT_UNKNOWN", "ORDER_NOT_INSPECTED", "RECAPTURE_REQUIRED"])
    });
    expect(byLabel.get("Head Template")).toMatchObject({
      visibleMinimum: 1,
      visibleMaximum: 12,
      countStatus: "COUNT_UNKNOWN",
      orderStatus: "ORDER_INCOMPLETE",
      gapFlags: expect.arrayContaining(["PARTIAL", "VISIBLE_INDEX_GAPS"])
    });
    expect(nose.wrapBehavior).toBe("POSSIBLE_WRAP_OBSERVED_UNVERIFIED");
    expect(aquiline.evidence).toHaveLength(2);
  });

  it("writes JSON, CSV, documentation, and merged issue-register outputs", () => {
    const fixture = createFixtureWorkspace();
    const outputs = generateAppearanceMenuMapResearch({
      root: fixture.root,
      generatedAt: "2026-07-14T00:00:00-04:00"
    });

    writeAppearanceMenuMapResearch(outputs, { root: fixture.root });

    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/menu_map.research.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/menu_map.research.csv"))).toBe(true);
    expect(fs.readFileSync(path.join(fixture.root, "docs/phase-zero/APPEARANCE_MENU_MAP.md"), "utf8")).toContain("Directly Observed Menu Facts");
    expect(fs.readFileSync(path.join(fixture.root, "docs/phase-zero/MENU_CAPTURE_GAPS.md"), "utf8")).toContain("RECAPTURE_REQUIRED");
    const issues = JSON.parse(fs.readFileSync(path.join(fixture.root, "data/phase-zero/issues_register.research.json"), "utf8"));
    expect(issues.schemaVersion).toBe("phase0-issue-register-v1");
    expect(issues.issues.map((issue: { issueID: string }) => issue.issueID)).toEqual(expect.arrayContaining([
      "issue-phase0-env-game-version",
      "issue-phase0-menu-hair",
      "issue-phase0-menu-head-template"
    ]));
  });
});

interface MenuMapRecord {
  recordType: string;
  stableMenuID: string;
  displayLabel: string;
  captureStatus: string;
  inspected: boolean;
  visibleMinimum: number | null;
  visibleMaximum: number | null;
  countStatus: string;
  orderStatus: string;
  gapFlags: string[];
  wrapBehavior: string;
  evidence: unknown[];
  productionEligibility: { eligible: boolean };
}

function createFixtureWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-menu-map-"));
  fs.mkdirSync(path.join(root, "data/phase-zero"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/phase-zero/video_timeline.json"), JSON.stringify({
    records: [
      optionRecord("phase0-video-002-tl-004", "phase0-video-002", 10, 19, "HEAD TEMPLATE", "Face 1", 1),
      optionRecord("phase0-video-002-tl-005", "phase0-video-002", 20, 28, "HEAD TEMPLATE", "Face 12", 12),
      optionRecord("phase0-video-004-tl-019", "phase0-video-004", 45, 46, "SKIN TONE", "Skin Tone 01", 1),
      optionRecord("phase0-video-005-tl-002", "phase0-video-005", 8, 8, "SKIN DETAILS", "None", null),
      optionRecord("phase0-video-008-tl-002", "phase0-video-008", 14, 14, "NOSE", "Aquiline", null),
      optionRecord("phase0-video-008-tl-008", "phase0-video-008", 25, 27, "NOSE", "Roman", null),
      optionRecord("phase0-video-008-tl-009", "phase0-video-008", 28, 32, "NOSE", "Aquiline", null),
      optionRecord("phase0-video-009-tl-006", "phase0-video-009", 26, 30, "EAR SHAPE", "Pointed", null)
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/evidence_manifest.json"), JSON.stringify({
    entries: [
      sourceEvidence("phase0-video-001"),
      sourceEvidence("phase0-video-002"),
      sourceEvidence("phase0-video-004"),
      sourceEvidence("phase0-video-005"),
      sourceEvidence("phase0-video-008"),
      sourceEvidence("phase0-video-009"),
      frameEvidence("phase0-video-002-tl-004"),
      frameEvidence("phase0-video-002-tl-005"),
      frameEvidence("phase0-video-004-tl-019"),
      frameEvidence("phase0-video-005-tl-002"),
      frameEvidence("phase0-video-008-tl-002"),
      frameEvidence("phase0-video-008-tl-008"),
      frameEvidence("phase0-video-008-tl-009"),
      frameEvidence("phase0-video-009-tl-006")
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/phase-zero/issues_register.research.json"), JSON.stringify({
    schemaVersion: "phase0-issue-register-v1",
    registerID: "phase0-environment-creation-path-issues",
    createdAt: "2026-07-13T22:20:00-04:00",
    updatedAt: "2026-07-13T22:20:00-04:00",
    issues: [
      {
        issueID: "issue-phase0-env-game-version",
        kind: "missingEvidence",
        title: "Missing environment/path evidence: gameVersion",
        description: "Visible game version or executable version is not shown in the footage.",
        owner: "wyatt-skaggs",
        severity: "blocking",
        status: "open",
        affectedRecordIDs: ["env-cf27-phase0-video-001-rtg-custom-qb"],
        affectedEvidenceFileIDs: ["phase0-source-phase0-video-001"],
        createdAt: "2026-07-13T22:20:00-04:00",
        updatedAt: "2026-07-13T22:20:00-04:00",
        resolutionNotes: "",
        recaptureRequest: {
          required: true,
          queueStatus: "queued",
          requestedAngles: [],
          requestedEvidenceKinds: ["Record the visible game version/build screen."],
          owner: "wyatt-skaggs",
          priority: "blocking",
          notes: "Visible game version or executable version is not shown in the footage."
        }
      }
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/appearance_menu_hierarchy.json"), JSON.stringify({
    records: [
      hierarchyRecord("Appearance", "video-001", 38, 45),
      hierarchyRecord("Head & Skin", "video-002", 6, 7),
      hierarchyRecord("Hair", "video-001", 38, 45),
      ...["Head Template", "Skin Tone", "Skin Details", "Eye Shape", "Eye Color", "Nose", "Ear Shape", "Mouth Shape", "Jaw Shape", "Chin"].map((label) => hierarchyRecord(label, "video-002", 10, 19))
    ]
  }, null, 2));
  return { root };
}

function optionRecord(timeline_record_id: string, video_id: string, start_timestamp: number, end_timestamp: number, visible_menu_label: string, visible_option_label: string, visible_option_index: number | null) {
  return {
    timeline_record_id,
    video_id,
    event_type: "option_change",
    parent_menu: "Head & Skin",
    visible_menu_label,
    visible_option_label,
    visible_option_index,
    start_timestamp,
    end_timestamp,
    confidence: "HIGH",
    extracted_frame_path: `data/phase-zero/derivative-frames/${timeline_record_id}.png`,
    notes: "fixture timeline record"
  };
}

function sourceEvidence(video_id: string) {
  return {
    evidence_id: `phase0-source-${video_id}`,
    video_id,
    master_or_derivative: "master"
  };
}

function frameEvidence(timeline_record_id: string) {
  return {
    evidence_id: `phase0-frame-${timeline_record_id}`,
    timeline_record_id,
    master_or_derivative: "derivative"
  };
}

function hierarchyRecord(displayLabel: string, sourceVideoID: string, startSeconds: number, endSeconds: number) {
  return {
    displayLabel,
    nativeLabel: displayLabel,
    sourceVideoID,
    startSeconds,
    endSeconds
  };
}
