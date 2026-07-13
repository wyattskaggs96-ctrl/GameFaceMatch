import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const requestedViews = ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"];

interface FrameManifest {
  schemaVersion: string;
  dataClass: string;
  sourceType: string;
  productionStatus: string;
  verificationStatus: string;
  outputRoot: string;
  frameStoragePolicy: string;
  extractionPolicy: {
    preserveMasters: boolean;
    preserveOriginalAspectRatio: boolean;
    appearanceAltered: boolean;
    eyeBlackRemoved: boolean;
    notificationOverlayPolicy: string;
    productionUseAllowed: boolean;
  };
  requestedViews: string[];
  frames: FrameRecord[];
}

interface FrameRecord {
  frameID: string;
  stableInternalID: string;
  nativeOrder: number;
  visibleGameLabelOrIndex: string;
  view: string;
  angleLabelStatus: string;
  sourceVideoID: string;
  portableRelativeEvidencePath: string;
  sourceTimestampSeconds: number;
  outputRelativePath: string;
  outputSha256: string;
  outputFormat: string;
  width: number;
  height: number;
  aspectRatio: string;
  preservesOriginalAspectRatio: boolean;
  appearanceAltered: boolean;
  eyeBlackRemoved: boolean;
  notificationOverlayHandling: string;
  prompt87NotificationOverlayObserved: boolean;
}

interface PerHeadReport {
  dataClass: string;
  productionStatus: string;
  reports: Array<{
    stableInternalID: string;
    nativeOrder: number;
    visibleGameLabelOrIndex: string;
    verificationState: string;
    requestedViews: string[];
    extractedViews: string[];
    missingViews: string[];
    completenessStatus: string;
    frameLevelOverlayDetection: string;
  }>;
}

interface MissingViewSummary {
  dataClass: string;
  productionStatus: string;
  requestedHeadCount: number;
  requestedViews: string[];
  viewCounts: Record<string, { extracted: number; missing: number; missingStableInternalIDs: string[] }>;
  categoryCompletenessStatus: string;
  limitations: string[];
}

describe("CF27 Head Template evidence frame extraction", () => {
  const manifest = readJson<FrameManifest>("../data/research/cf27/manifests/head-template-evidence-frames/head_template_evidence_frame_manifest.json");
  const perHeadReport = readJson<PerHeadReport>("../data/research/cf27/reports/head-template-evidence-frames/head_template_per_head_completeness_report.json");
  const missingSummary = readJson<MissingViewSummary>("../data/research/cf27/reports/head-template-evidence-frames/head_template_missing_view_summary.json");

  it("keeps extracted frame metadata in the research-only namespace", () => {
    expect(manifest.schemaVersion).toBe("cf27-head-template-evidence-frame-manifest-v1");
    expect(manifest.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(manifest.sourceType).toBe("researchCandidateDerivativeFrames");
    expect(manifest.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(manifest.verificationStatus).toBe("PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED");
    expect(manifest.outputRoot).toBe("data/research/cf27/generated/full-resolution-frames/head-templates-faces-001-029");
    expect(manifest.frameStoragePolicy).toContain("git-ignored");
    expect(manifest.extractionPolicy.productionUseAllowed).toBe(false);
    expect(manifest.extractionPolicy.preserveMasters).toBe(true);
    expect(manifest.extractionPolicy.appearanceAltered).toBe(false);
    expect(manifest.extractionPolicy.eyeBlackRemoved).toBe(false);
    expect(manifest.extractionPolicy.notificationOverlayPolicy).toContain("frame-level overlay detection is not implemented");
  });

  it("extracts the requested seven view roles for Face 1 through Face 29 only", () => {
    expect(manifest.requestedViews).toEqual(requestedViews);
    expect(manifest.frames).toHaveLength(29 * requestedViews.length);
    const nativeOrders = new Set(manifest.frames.map((frame) => frame.nativeOrder));
    expect([...nativeOrders].sort((a, b) => a - b)).toEqual(Array.from({ length: 29 }, (_, index) => index + 1));
    for (const nativeOrder of nativeOrders) {
      const frames = manifest.frames.filter((frame) => frame.nativeOrder === nativeOrder);
      expect(frames.map((frame) => frame.view)).toEqual(requestedViews);
      expect(frames[0]?.visibleGameLabelOrIndex).toBe(`Face ${nativeOrder}`);
      expect(frames[0]?.stableInternalID).toBe(`CF27_XBOXUNKNOWN_RTG_HEAD_${String(nativeOrder).padStart(3, "0")}`);
    }
    expect(manifest.frames.some((frame) => /Face 3[0-9]/.test(frame.visibleGameLabelOrIndex))).toBe(false);
  });

  it("stores portable full-resolution derivative metadata without absolute paths or production locations", () => {
    for (const frame of manifest.frames) {
      expect(frame.outputRelativePath.startsWith("data/research/cf27/generated/full-resolution-frames/")).toBe(true);
      expect(frame.outputRelativePath.startsWith("/")).toBe(false);
      expect(frame.outputRelativePath.includes("data/catalog/production")).toBe(false);
      expect(frame.portableRelativeEvidencePath.startsWith("OWNER_DOWNLOADS/")).toBe(true);
      expect(frame.portableRelativeEvidencePath.startsWith("/")).toBe(false);
      expect(frame.outputFormat).toBe("png");
      expect(frame.outputSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(frame.width).toBe(1920);
      expect(frame.height).toBe(1080);
      expect(frame.aspectRatio).toBe("1920:1080");
      expect(frame.preservesOriginalAspectRatio).toBe(true);
      expect(frame.appearanceAltered).toBe(false);
      expect(frame.eyeBlackRemoved).toBe(false);
      expect(frame.notificationOverlayHandling).toBe("not_removed_frame_level_detection_not_implemented");
      expect(typeof frame.prompt87NotificationOverlayObserved).toBe("boolean");
      expect(frame.sourceTimestampSeconds).toBeGreaterThanOrEqual(0);
      expect(["video-002", "video-003"]).toContain(frame.sourceVideoID);
      expect(frame.angleLabelStatus).toBe(frame.view === "MENU" ? "menu_evidence" : "approximate_from_rotation_sequence");
    }
  });

  it("generates a per-head completeness report and category missing-view summary", () => {
    expect(perHeadReport.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(perHeadReport.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(perHeadReport.reports).toHaveLength(29);
    for (const report of perHeadReport.reports) {
      expect(report.verificationState).toBe("NOT_VERIFIED");
      expect(report.requestedViews).toEqual(requestedViews);
      expect(report.extractedViews).toEqual(requestedViews);
      expect(report.missingViews).toEqual([]);
      expect(report.completenessStatus).toBe("requested_views_extracted_with_approximate_angles");
      expect(report.frameLevelOverlayDetection).toBe("not_implemented_review_manually");
    }

    expect(missingSummary.dataClass).toBe("RESEARCH_CANDIDATE");
    expect(missingSummary.productionStatus).toBe("NOT_PRODUCTION_DATA");
    expect(missingSummary.requestedHeadCount).toBe(29);
    expect(missingSummary.requestedViews).toEqual(requestedViews);
    expect(missingSummary.categoryCompletenessStatus).toBe("requested_views_extracted_with_approximate_angles");
    expect(missingSummary.limitations.join(" ")).toContain("Frame-level overlay detection is not implemented");
    for (const view of requestedViews) {
      expect(missingSummary.viewCounts[view]).toEqual({ extracted: 29, missing: 0, missingStableInternalIDs: [] });
    }
  });
});

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8")) as T;
}
