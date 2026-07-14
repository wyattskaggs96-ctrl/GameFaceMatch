import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 standardized-capture QA CLI is plain ESM JavaScript and is exercised here as command source of truth.
import { generateStandardizedCaptureQA, writeStandardizedCaptureQA } from "../../scripts/cf27-standardized-capture-qa.mjs";

const repositoryRoot = path.resolve(process.cwd(), "..");
const generatedAt = "2026-07-14T05:15:00-04:00";
const promptFields = [
  "gameMode",
  "position",
  "archetype",
  "head",
  "skinTone",
  "skinDetails",
  "hairstyle",
  "hairColor",
  "facialHair",
  "facialHairColor",
  "bodyType",
  "height",
  "weight",
  "uniform",
  "equipment",
  "lighting",
  "background",
  "zoom",
  "cameraAngle",
  "cameraDistance",
  "resolution",
  "hdrState",
  "loadingCompletion",
  "animationCompletion"
];

describe("CF27 standardized capture QA", () => {
  it("audits current videos, catalog image records, and context records with approved classifications", () => {
    const report = generateStandardizedCaptureQA({ root: repositoryRoot, generatedAt }) as StandardizedCaptureQAReport;

    expect(report.summary).toMatchObject({
      totalAssessments: 96,
      videoAssessments: 11,
      catalogImageAssessments: 80,
      contextAssessments: 5,
      geometricMatchingEligibleCount: 0,
      geometricMatchingBlockedCount: 42,
      materialRecaptureQueueCount: 42,
      productionGateStatus: "BLOCKED_NO_STANDARDIZED_VERIFIED_COMPARISON_IMAGES"
    });
    expect(report.summary.classificationCounts).toEqual({
      CONSISTENT: 0,
      CONSISTENT_WITH_NOTES: 0,
      COMPARISON_LIMITED: 54,
      RECAPTURE_REQUIRED: 42,
      UNUSABLE: 0
    });
    for (const assessment of report.assessments) {
      expect(["CONSISTENT", "CONSISTENT_WITH_NOTES", "COMPARISON_LIMITED", "RECAPTURE_REQUIRED", "UNUSABLE"]).toContain(assessment.classification);
      expect(assessment.consistencyFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(Object.keys(assessment.promptState).sort()).toEqual([...promptFields].sort());
    }
  });

  it("blocks every current item from geometric matching and queues only material visual inconsistencies", () => {
    const report = generateStandardizedCaptureQA({ root: repositoryRoot, generatedAt }) as StandardizedCaptureQAReport;
    const recaptureCategories = new Set(report.recaptureQueue.map((item) => assessment(report, item.itemID).category));

    expect(report.assessments.every((item) => item.geometricMatchingEligible === false)).toBe(true);
    expect(report.assessments.filter((item) => item.geometricMatchingGate === "BLOCKED_STANDARDIZED_CAPTURE_REQUIRED")).toHaveLength(42);
    expect([...recaptureCategories].sort()).toEqual(["Ear Shape", "Eye Shape", "Head Template", "Nose"]);
    expect(report.recaptureQueue.every((item) => assessment(report, item.itemID).classification === "RECAPTURE_REQUIRED")).toBe(true);
    expect(report.recaptureQueue.every((item) => assessment(report, item.itemID).materialInconsistency === true)).toBe(true);
  });

  it("keeps source videos, context records, and presentation records comparison-limited rather than recapture noise", () => {
    const report = generateStandardizedCaptureQA({ root: repositoryRoot, generatedAt }) as StandardizedCaptureQAReport;
    const sourceVideo = assessment(report, "phase0-video-001");
    const skinTone = report.assessments.find((item) => item.category === "Skin Tone");
    const eyeColor = report.assessments.find((item) => item.category === "Eye Color");
    const bodyContext = assessment(report, "CF27_XBOXUNKNOWN_RTG_POSITION_QB");

    expect(sourceVideo).toMatchObject({
      itemType: "SOURCE_VIDEO",
      classification: "COMPARISON_LIMITED",
      geometricMatchingGate: "NOT_GEOMETRIC_MATCHING_INPUT"
    });
    expect(skinTone).toMatchObject({
      classification: "COMPARISON_LIMITED",
      geometricMatchingGate: "NOT_GEOMETRIC_MATCHING_INPUT"
    });
    expect(eyeColor).toMatchObject({
      classification: "COMPARISON_LIMITED",
      geometricMatchingGate: "NOT_GEOMETRIC_MATCHING_INPUT"
    });
    expect(bodyContext).toMatchObject({
      itemType: "CONTEXT_VIDEO_RECORD",
      classification: "COMPARISON_LIMITED",
      geometricMatchingGate: "NOT_GEOMETRIC_MATCHING_INPUT"
    });
    expect(report.recaptureQueue.map((item) => item.itemID)).not.toContain("phase0-video-001");
    expect(report.recaptureQueue.map((item) => item.itemID)).not.toContain(skinTone?.itemID);
    expect(report.recaptureQueue.map((item) => item.itemID)).not.toContain(bodyContext.itemID);
  });

  it("records canonical prompt fields and unresolved standard fields honestly", () => {
    const report = generateStandardizedCaptureQA({ root: repositoryRoot, generatedAt }) as StandardizedCaptureQAReport;
    const head = assessment(report, "CF27_XBOXUNKNOWN_RTG_HEAD_001");
    const nose = report.assessments.find((item) => item.category === "Nose");

    expect(report.canonicalCaptureStandard.status).toBe("PARTIAL_RESEARCH_STANDARD_NOT_PRODUCTION_APPROVED");
    expect(report.canonicalCaptureStandard.requiredFields).toEqual(promptFields);
    expect(report.canonicalCaptureStandard.currentlySupportedFields).toMatchObject({
      gameMode: "Road to Glory",
      position: "QB",
      hdrState: null
    });
    expect(head.promptState).toMatchObject({
      gameMode: "Road to Glory",
      position: "QB",
      head: "Face 1",
      skinTone: "UNKNOWN_NOT_LOCKED",
      hairstyle: "UNKNOWN_OR_TEMPLATE_VARIABLE",
      hdrState: "UNKNOWN_NOT_VISIBLE",
      loadingCompletion: "TRANSITION_OR_LOADING_RISK"
    });
    expect(nose?.promptState.cameraAngle).toBe("MENU_FRAME_OR_REPRESENTATIVE_FRAME_NOT_STANDARDIZED");
  });

  it("produces deterministic fingerprints and writes QA and recapture outputs", () => {
    const first = generateStandardizedCaptureQA({ root: repositoryRoot, generatedAt }) as StandardizedCaptureQAReport;
    const second = generateStandardizedCaptureQA({ root: repositoryRoot, generatedAt }) as StandardizedCaptureQAReport;
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-standardized-capture-qa-"));

    expect(first.assessments.map((item) => item.consistencyFingerprint)).toEqual(second.assessments.map((item) => item.consistencyFingerprint));
    writeStandardizedCaptureQA(first, { root });

    const json = JSON.parse(fs.readFileSync(path.join(root, "data/phase-zero/standardized_capture_qa.research.json"), "utf8")) as StandardizedCaptureQAReport;
    const csv = fs.readFileSync(path.join(root, "data/phase-zero/standardized_capture_qa.research.csv"), "utf8");
    const recapture = JSON.parse(fs.readFileSync(path.join(root, "data/phase-zero/standardized_capture_recapture_queue.research.json"), "utf8")) as { recaptureQueue: Array<{ itemID: string }> };
    const markdown = fs.readFileSync(path.join(root, "docs/phase-zero/STANDARDIZED_CAPTURE_QA_REPORT.md"), "utf8");

    expect(json.summary.totalAssessments).toBe(96);
    expect(csv).toContain("itemID,itemType,category,nativeLabel,classification,consistencyFingerprint");
    expect(recapture.recaptureQueue).toHaveLength(42);
    expect(markdown).toContain("No current research catalog image is eligible for geometric matching.");
  });
});

interface StandardizedCaptureQAReport {
  canonicalCaptureStandard: {
    status: string;
    requiredFields: string[];
    currentlySupportedFields: {
      gameMode: string | null;
      position: string | null;
      hdrState: string | null;
    };
  };
  summary: {
    totalAssessments: number;
    videoAssessments: number;
    catalogImageAssessments: number;
    contextAssessments: number;
    classificationCounts: Record<string, number>;
    geometricMatchingEligibleCount: number;
    geometricMatchingBlockedCount: number;
    materialRecaptureQueueCount: number;
    productionGateStatus: string;
  };
  assessments: StandardizedCaptureAssessment[];
  recaptureQueue: Array<{
    itemID: string;
  }>;
}

interface StandardizedCaptureAssessment {
  itemID: string;
  itemType: string;
  category: string;
  classification: string;
  consistencyFingerprint: string;
  materialInconsistency: boolean;
  geometricMatchingEligible: boolean;
  geometricMatchingGate: string;
  promptState: Record<string, string>;
}

function assessment(report: StandardizedCaptureQAReport, itemID: string): StandardizedCaptureAssessment {
  const item = report.assessments.find((entry) => entry.itemID === itemID);
  if (!item) throw new Error(`Missing standardized capture QA assessment ${itemID}`);
  return item;
}
