import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root CF27 capture-log CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { CF27_CURRENT_CAPTURE_LOG_SCHEMA_VERSION, formatCurrentCaptureLogCSV, generateCurrentCaptureLog, validatePortableRelativePath } from "../../scripts/cf27-current-capture-log.mjs";

const root = path.resolve(process.cwd(), "..");

describe("CF27 current capture log", () => {
  it("covers the nine unique recordings and excludes duplicate master references", () => {
    const inventory = JSON.parse(fs.readFileSync(path.resolve(root, "data/research/cf27/video_inventory.json"), "utf8"));
    const uniqueVideos = inventory.inventory.filter((video: { exactDuplicate: boolean }) => !video.exactDuplicate);
    const captureLog = generateCurrentCaptureLog({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const loggedVideoIDs = new Set(captureLog.events.map((event: { sourceVideoID: string }) => event.sourceVideoID));

    expect(captureLog.schemaVersion).toBe(CF27_CURRENT_CAPTURE_LOG_SCHEMA_VERSION);
    expect(captureLog.summary.uniqueRecordingsCovered).toBe(9);
    expect(loggedVideoIDs).toEqual(new Set(uniqueVideos.map((video: { inventoryId: string }) => video.inventoryId)));
    expect(loggedVideoIDs.has("video-010")).toBe(false);
    expect(loggedVideoIDs.has("video-011")).toBe(false);
  });

  it("links a deliberate selected Head Template event to its research candidate and generated evidence", () => {
    const captureLog = generateCurrentCaptureLog({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const faceOne = captureLog.events.find((event: { captureEventID: string }) => event.captureEventID === "capture-event-video-002-tl-004");

    expect(faceOne).toMatchObject({
      sourceFilename: "02_Head_Templates_Faces_01-12.mov",
      beginningTimestamp: 10,
      endingTimestamp: 19,
      category: "Head Template",
      nativeOption: "Face 1",
      catalogCandidate: "CF27_XBOXUNKNOWN_RTG_HEAD_001",
      action: "optionSelection",
      rotationOrMenuSelectionEvent: "menu_selection_and_rotation",
      optionVisibility: "deliberate_selection",
      retakeStatus: "recapture_required_for_production_comparison"
    });
    expect(faceOne.evidenceGenerated).toContain("evidence-video-002-source-master");
    expect(faceOne.evidenceGenerated).toContain("evidence-frame-cf27_xboxunknown_rtg_head_001-front");
    expect(faceOne.uncertainty.catalogCandidateMatch).toBe("overlappingEvidenceRange");
  });

  it("does not promote context-only labels or incidental visibility into catalog candidates", () => {
    const captureLog = generateCurrentCaptureLog({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const prospectCards = captureLog.events.find((event: { captureEventID: string }) => event.captureEventID === "capture-event-video-001-tl-004");

    expect(prospectCards).toMatchObject({
      category: "Navigation",
      nativeOption: null,
      catalogCandidate: null,
      action: "contextObservation",
      optionVisibility: "context_or_incidental_visibility"
    });
    expect(prospectCards.issueDetected.map((issue: { code: string }) => issue.code)).toContain("contextLabelsNotCatalogOptions");
    expect(prospectCards.uncertainty.selectedOptionCertainty).toBe("context_only_not_catalog_evidence");
  });

  it("preserves selected labels that do not yet have research-candidate records without inventing records", () => {
    const captureLog = generateCurrentCaptureLog({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const faceThirtyOne = captureLog.events.find((event: { captureEventID: string }) => event.captureEventID === "capture-event-video-003-tl-013");

    expect(faceThirtyOne).toMatchObject({
      category: "Head Template",
      nativeOption: "Face 31",
      catalogCandidate: null,
      optionVisibility: "deliberate_selection",
      action: "optionSelection"
    });
    expect(faceThirtyOne.issueDetected.map((issue: { code: string }) => issue.code)).toContain("selectedOptionWithoutCandidateRecord");
    expect(faceThirtyOne.notes).toContain("No catalog candidate was created by this capture-log task.");
  });

  it("validates portable paths and exports required Prompt 97 CSV columns", () => {
    const captureLog = generateCurrentCaptureLog({ root, generatedAt: "2026-07-13T00:00:00.000Z" });
    const csv = formatCurrentCaptureLogCSV(captureLog);

    for (const event of captureLog.events) {
      expect(validatePortableRelativePath(event.portableRelativeEvidencePath)).toBe(true);
      for (const key of ["captureEventID", "sourceFilename", "beginningTimestamp", "endingTimestamp", "category", "nativeOption", "catalogCandidate", "action", "rotationOrMenuSelectionEvent", "evidenceGenerated", "issueDetected", "retakeStatus", "notes"]) {
        expect(event).toHaveProperty(key);
      }
    }
    expect(captureLog.validation.status).toBe("passed");
    expect(csv.split("\n")[0]).toBe("captureEventID,sourceFilename,beginningTimestamp,endingTimestamp,category,nativeOption,catalogCandidate,action,rotationOrMenuSelectionEvent,evidenceGenerated,issueDetected,retakeStatus,notes");
    expect(csv).not.toContain("/Users/skaggssystems/");
  });
});
