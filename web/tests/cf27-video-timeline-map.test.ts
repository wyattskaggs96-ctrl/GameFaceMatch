import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error Root timeline-map CLI is plain ESM JavaScript and is exercised here as the command source of truth.
import { generateVideoTimelineMap, writeVideoTimelineMap } from "../../scripts/cf27-video-timeline-map.mjs";

describe("CF27 video timeline map", () => {
  it("maps usable source-video timeline events and excludes exact duplicate masters", async () => {
    const fixture = createFixtureWorkspace();

    const outputs = await generateVideoTimelineMap({
      root: fixture.root,
      inventoryPath: "data/phase-zero/video_inventory.json",
      sourceTimelinePath: "data/research/cf27/video_timeline_index.json",
      researchEvidencePath: "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json",
      extractFrames: false,
      generatedAt: "2026-07-13T22:00:00.000Z"
    });

    expect(outputs.timeline.summary.videosCovered).toBe(1);
    expect(outputs.timeline.summary.timelineRecords).toBe(2);
    expect(outputs.evidenceManifest.summary.sourceMasters).toBe(1);
    expect(outputs.timeline.records.map((record: { visible_option_label: string }) => record.visible_option_label)).toEqual(["Face 12", "Face 12"]);
    expect(outputs.timeline.repeatedOptionsForContinuity).toHaveLength(1);
    expect(outputs.timeline.records.every((record: { verification_status: string }) => record.verification_status === "OBSERVED_PENDING_VERIFICATION")).toBe(true);
    expect(outputs.timeline.videoProcessingResults).toEqual(expect.arrayContaining([
      expect.objectContaining({
        video_id: "phase0-video-001",
        processing_result: "FULLY_PROCESSED",
        source_video_checksum: "source-sha",
        full_duration_covered: true
      }),
      expect.objectContaining({
        video_id: "phase0-video-002",
        processing_result: "DUPLICATE",
        exact_duplicate_of: "phase0-video-001"
      })
    ]));
    expect(outputs.timeline.records[0]).toEqual(expect.objectContaining({
      source_video_checksum: "source-sha",
      native_order: 12,
      transition_contamination: "NO",
      model_fully_loaded: "FULLY_LOADED",
      menu_cursor_hides_relevant_information: "NO",
      canonical_settings_changed: "UNKNOWN_NOT_ASSESSED"
    }));
  });

  it("extracts a full-resolution representative frame only for useful selected events without existing evidence", async () => {
    const fixture = createFixtureWorkspace({ withResearchEvidence: false });

    const outputs = await generateVideoTimelineMap({
      root: fixture.root,
      inventoryPath: "data/phase-zero/video_inventory.json",
      sourceTimelinePath: "data/research/cf27/video_timeline_index.json",
      researchEvidencePath: "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json",
      generatedAt: "2026-07-13T22:00:00.000Z",
      extractor: ({ relativePath, absoluteOutput, timestamp }: { relativePath: string; absoluteOutput: string; timestamp: number }) => {
        fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
        fs.writeFileSync(absoluteOutput, "synthetic-frame");
        return {
          ok: true,
          relativePath,
          sha256: "fixture-sha",
          sizeBytes: 15,
          mimeType: "image/png",
          timestamp
        };
      }
    });

    expect(outputs.timeline.summary.recordsWithFrames).toBe(2);
    expect(outputs.evidenceManifest.summary.generatedTimelineDerivatives).toBe(2);
    expect(outputs.timeline.records[0].extracted_frame_path).toContain("data/phase-zero/derivative-frames/");
  });

  it("writes timeline, evidence manifest, and capture log outputs", async () => {
    const fixture = createFixtureWorkspace();
    const outputs = await generateVideoTimelineMap({
      root: fixture.root,
      inventoryPath: "data/phase-zero/video_inventory.json",
      sourceTimelinePath: "data/research/cf27/video_timeline_index.json",
      researchEvidencePath: "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json",
      extractFrames: false,
      generatedAt: "2026-07-13T22:00:00.000Z"
    });

    writeVideoTimelineMap(outputs, { root: fixture.root });

    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/video_timeline.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/video_timeline.csv"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/evidence_manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, "data/phase-zero/capture_log.json"))).toBe(true);
    expect(fs.readFileSync(path.join(fixture.root, "docs/phase-zero/VIDEO_TIMELINE_MAP.md"), "utf8")).toContain("OBSERVED_PENDING_VERIFICATION");
  });
});

function createFixtureWorkspace({ withResearchEvidence = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-cf27-video-timeline-"));
  fs.mkdirSync(path.join(root, "data/phase-zero"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/research/cf27/manifests/current-evidence"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/research/cf27"), { recursive: true });
  fs.writeFileSync(path.join(root, "source.mov"), "synthetic-source");
  fs.writeFileSync(path.join(root, "data/phase-zero/video_inventory.json"), JSON.stringify({
    inventory: [
      {
        inventoryId: "phase0-video-001",
        manifestSequence: 1,
        originalFilename: "source.mov",
        discoveredFilename: "source.mov",
        canonicalFilename: "01_Source.mov",
        exactDuplicate: false,
        fileOpenStatus: "opens",
        sha256: "source-sha",
        fileSizeBytes: 16,
        durationSeconds: 5,
        sourceLocation: {
          portableRelativeEvidencePath: "OWNER_DOWNLOADS/source.mov",
          absoluteDiscoveryPathInternal: path.join(root, "source.mov")
        }
      },
      {
        inventoryId: "phase0-video-002",
        manifestSequence: 2,
        originalFilename: "duplicate.mov",
        discoveredFilename: "duplicate.mov",
        canonicalFilename: "duplicate.mov",
        exactDuplicate: true,
        exactDuplicateOf: "phase0-video-001",
        fileOpenStatus: "opens",
        sha256: "source-sha",
        fileSizeBytes: 16,
        sourceLocation: {
          portableRelativeEvidencePath: "OWNER_DOWNLOADS/duplicate.mov",
          absoluteDiscoveryPathInternal: path.join(root, "duplicate.mov")
        }
      }
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/research/cf27/video_timeline_index.json"), JSON.stringify({
    videos: [
      {
        videoId: "video-001",
        inspectionStatus: "complete_1fps_visual_pass_with_selected_spot_keyframes"
      }
    ],
    events: [
      timelineEvent("video-001-tl-001", 0, 2, "Face 12"),
      timelineEvent("video-001-tl-002", 3, 5, "Face 12"),
      timelineEvent("video-002-tl-001", 0, 2, "Skin Tone 01")
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json"), JSON.stringify({
    entries: withResearchEvidence ? [
      {
        evidenceID: "existing-menu-frame",
        sourceVideo: "video-001",
        timestamp: 1,
        masterOrDerivative: "derivative",
        fileRole: "menuEvidenceFrame",
        relativePath: "data/research/cf27/generated/full-resolution-frames/existing.png",
        sha256: "existing-sha",
        sizeBytes: 123,
        mimeType: "image/png"
      }
    ] : []
  }, null, 2));
  return { root };
}

function timelineEvent(timelineId: string, startSeconds: number, endSeconds: number, selectedNativeOptionLabel: string) {
  return {
    timelineId,
    videoId: timelineId.startsWith("video-002") ? "video-002" : "video-001",
    startSeconds,
    endSeconds,
    eventTypes: ["native_option_labels", "option_changes", "stable_visual_periods"],
    menuHeading: "HEAD TEMPLATE",
    selectedNativeOptionLabel,
    selectionState: "deliberately_selected",
    characterLoading: false,
    stableVisualPeriod: true,
    rotationObserved: false,
    notificationOverlayObserved: false,
    motionBlurObserved: false,
    menuExitObserved: false,
    notes: "Fixture selected option."
  };
}
