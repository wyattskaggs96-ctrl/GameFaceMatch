import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 body-control research CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateBodyControlResearchCatalog, writeBodyControlResearchCatalog } from "../../scripts/cf27-body-control-research-catalog.mjs";

const generatedAt = "2026-07-14T04:15:00-04:00";

describe("CF27 body-control research catalog", () => {
  it("creates stable research records only for directly observed context values", () => {
    const { root } = createWorkspace();
    const catalog = generateBodyControlResearchCatalog({ root, generatedAt }) as BodyControlCatalog;

    expect(catalog.summary.observedResearchRecordCount).toBe(5);
    expect(catalog.summary.observedPositionContext).toBe("QB");
    expect(catalog.summary.observedJourneyTypeHighlight).toBe("CONTRIBUTOR");
    expect(catalog.summary.controlsWithDirectContextValues).toEqual(["Position", "Archetype Restrictions"]);
    expect(catalog.summary.controlsNotCaptured).toEqual([
      "Height",
      "Weight",
      "Body Type",
      "Build",
      "Physique",
      "Muscle Definition"
    ]);
    expect(catalog.records.map((record) => record.stableResearchID)).toEqual([
      "CF27_XBOXUNKNOWN_RTG_POSITION_QB",
      "CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_ELITE",
      "CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_BLUE_CHIP",
      "CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_CONTRIBUTOR",
      "CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_UNDERDOG"
    ]);
  });

  it("keeps height, weight, body type, build, physique, and muscle definition uncataloged without direct evidence", () => {
    const { root } = createWorkspace();
    const catalog = generateBodyControlResearchCatalog({ root, generatedAt }) as BodyControlCatalog;

    for (const label of ["Height", "Weight", "Body Type", "Build", "Physique", "Muscle Definition"]) {
      const item = control(catalog, label);
      expect(item.observationStatus).toBe("NOT_OBSERVED_IN_CURRENT_EVIDENCE");
      expect(item.records).toEqual([]);
      expect(item.nativeControlLabel).toBeNull();
      expect(item.valuesOrRangeStatus).toBe("NO_VALUES_OR_RANGE_CAPTURED");
      expect(item.countStatus).toBe("COUNT_UNKNOWN");
      expect(item.unsuitableForRecommendation).toBe(true);
      expect(item.isMeasuredFacialCharacteristic).toBe(false);
    }
  });

  it("does not treat desired athlete physique or position context as facial measurement data", () => {
    const { root } = createWorkspace();
    const catalog = generateBodyControlResearchCatalog({ root, generatedAt }) as BodyControlCatalog;

    expect(control(catalog, "Physique").productRole).toBe("USER_DESIRED_BODY_ATTRIBUTE_NOT_MEASURED_FACIAL_CHARACTERISTIC");
    expect(control(catalog, "Position").productRole).toBe("CREATION_PATH_CONTEXT_POTENTIAL_RESTRICTION");
    for (const record of catalog.records) {
      expect(record.isMeasuredFacialCharacteristic).toBe(false);
      expect(record.productionStatus).toBe("NOT_PRODUCTION_DATA");
      expect(record.productionEligibility.eligible).toBe(false);
    }
  });

  it("keeps dependency effects unknown until direct tests exist", () => {
    const { root } = createWorkspace();
    const catalog = generateBodyControlResearchCatalog({ root, generatedAt }) as BodyControlCatalog;

    expect(catalog.dependencyAssessment.changesAvailableHeadOptions.status).toBe("UNKNOWN_NOT_TESTED");
    expect(catalog.dependencyAssessment.changesHeadRendering.status).toBe("UNKNOWN_NOT_TESTED");
    expect(catalog.dependencyAssessment.changesHairstyleAvailability.status).toBe("UNKNOWN_NOT_TESTED");
    expect(catalog.dependencyAssessment.changesFacialHairAvailability.status).toBe("UNKNOWN_NOT_TESTED");
    expect(catalog.dependencyAssessment.altersCameraFraming.status).toBe("UNKNOWN_NOT_TESTED");
    expect(catalog.dependencyAssessment.affectsRecommendationInstructions.status).toBe("AFFECTS_CREATION_PATH_CONTEXT_ONLY");
  });

  it("links existing missing-evidence issues and writes outputs", () => {
    const { root } = createWorkspace();
    const catalog = generateBodyControlResearchCatalog({ root, generatedAt }) as BodyControlCatalog;
    writeBodyControlResearchCatalog(catalog, { root });

    expect(control(catalog, "Height").relatedIssueIDs).toEqual(["issue-phase0-env-height"]);
    expect(control(catalog, "Weight").relatedIssueIDs).toEqual(["issue-phase0-env-weight"]);
    expect(control(catalog, "Body Type").relatedIssueIDs).toEqual(["issue-phase0-env-body-type"]);
    expect(control(catalog, "Archetype Restrictions").relatedIssueIDs).toEqual(["issue-phase0-env-archetype"]);

    const json = JSON.parse(fs.readFileSync(path.join(root, "data/phase-zero/body_controls.research.json"), "utf8")) as BodyControlCatalog;
    const csv = fs.readFileSync(path.join(root, "data/phase-zero/body_controls.research.csv"), "utf8");
    const markdown = fs.readFileSync(path.join(root, "docs/phase-zero/BODY_CONTROL_RESEARCH_CATALOG.md"), "utf8");

    expect(json.records).toHaveLength(5);
    expect(csv).toContain("controlID,requestedControlLabel,nativeControlLabel");
    expect(markdown).toContain("PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED");
    expect(markdown).toContain("Desired athlete physique is treated as a user preference/body instruction concept");
  });
});

interface BodyControlCatalog {
  summary: {
    observedResearchRecordCount: number;
    observedPositionContext: string | null;
    observedJourneyTypeHighlight: string | null;
    controlsWithDirectContextValues: string[];
    controlsNotCaptured: string[];
  };
  controls: BodyControl[];
  records: BodyControlRecord[];
  dependencyAssessment: Record<string, { status: string; reason: string }>;
}

interface BodyControl {
  requestedControlLabel: string;
  nativeControlLabel: string | null;
  observationStatus: string;
  productRole: string;
  isMeasuredFacialCharacteristic: boolean;
  records: string[];
  valuesOrRangeStatus: string;
  countStatus: string;
  unsuitableForRecommendation: boolean;
  relatedIssueIDs: string[];
}

interface BodyControlRecord {
  stableResearchID: string;
  productionStatus: string;
  isMeasuredFacialCharacteristic: boolean;
  productionEligibility: {
    eligible: boolean;
  };
}

function control(catalog: BodyControlCatalog, requestedControlLabel: string): BodyControl {
  const result = catalog.controls.find((item) => item.requestedControlLabel === requestedControlLabel);
  if (!result) throw new Error(`Missing body control ${requestedControlLabel}`);
  return result;
}

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-body-controls-"));
  writeJson(path.join(root, "data/phase-zero/environment_manifest.research.json"), {
    environmentID: "env-cf27-test",
    gameMode: "Road to Glory",
    position: "QB",
    observedJourneyTypeHighlight: "CONTRIBUTOR",
    fieldEvidence: {
      position: evidence("phase0-video-001-tl-005", "Player setup / position path", "QB is visible during the position/path step."),
      observedJourneyTypeHighlight: evidence("phase0-video-001-tl-004", "Archetype / prospect selection cards", "CONTRIBUTOR highlighted before position selection."),
      journeyTypeCardsVisible: {
        ...evidence("phase0-video-001-tl-004", "Archetype / prospect selection cards", "Journey type cards are visible."),
        value: ["ELITE", "BLUE CHIP", "CONTRIBUTOR", "UNDERDOG"]
      }
    }
  });
  writeJson(path.join(root, "data/phase-zero/creation_paths.research.json"), {
    creationPaths: [{
      id: "creation-path-test",
      status: "supported_for_research_only",
      assessment: {
        productionCatalogPathAssessment: "NOT_SUFFICIENT_FOR_PRODUCTION_CATALOG_PATH"
      }
    }]
  });
  writeJson(path.join(root, "data/phase-zero/appearance_menu_gap_matrix.json"), {
    rows: [{
      gapID: "appearance-gap-suspected-body-height-weight-physique",
      displayedCategoryLabel: "Body/height/weight/physique"
    }]
  });
  writeJson(path.join(root, "data/phase-zero/issues_register.research.json"), {
    issues: [
      { issueID: "issue-phase0-env-height", title: "Missing environment/path evidence: height" },
      { issueID: "issue-phase0-env-weight", title: "Missing environment/path evidence: weight" },
      { issueID: "issue-phase0-env-body-type", title: "Missing environment/path evidence: bodyType" },
      { issueID: "issue-phase0-env-archetype", title: "Missing environment/path evidence: archetype" }
    ]
  });
  return { root };
}

function evidence(timelineRecordID: string, visibleMenuLabel: string, note: string) {
  return {
    evidenceID: "phase0-source-phase0-video-001",
    videoID: "phase0-video-001",
    originalFilename: "01_Environment_and_Creation_Path.MP4",
    canonicalFilename: "01_Environment_and_Creation_Path.mp4",
    timelineRecordID,
    startTimestamp: timelineRecordID.endsWith("004") ? 18 : 24,
    endTimestamp: timelineRecordID.endsWith("004") ? 23 : 29,
    visibleMenuLabel,
    confidence: "HIGH_OBSERVED_PENDING_VERIFICATION",
    note
  };
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
