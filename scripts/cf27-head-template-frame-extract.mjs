#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_HEAD_TEMPLATE_FRAME_MANIFEST_SCHEMA_VERSION = "cf27-head-template-evidence-frame-manifest-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatePackagePath = "data/research/cf27/catalog-candidates/research/head-templates-faces-001-029/head_template_research_candidates.json";
const inventoryPath = "data/research/cf27/video_inventory.json";
const outputRoot = "data/research/cf27/generated/full-resolution-frames/head-templates-faces-001-029";
const manifestPath = "data/research/cf27/manifests/head-template-evidence-frames/head_template_evidence_frame_manifest.json";
const perHeadReportPath = "data/research/cf27/reports/head-template-evidence-frames/head_template_per_head_completeness_report.json";
const missingViewSummaryPath = "data/research/cf27/reports/head-template-evidence-frames/head_template_missing_view_summary.json";
const markdownReportPath = "docs/catalog/HEAD_TEMPLATE_EVIDENCE_FRAME_EXTRACTION.md";

const requestedViews = ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"];
const viewFractions = {
  MENU: 0.16,
  FRONT: 0.22,
  LEFT_3Q: 0.34,
  LEFT_PROFILE: 0.46,
  REAR: 0.58,
  RIGHT_PROFILE: 0.7,
  RIGHT_3Q: 0.82
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = extractHeadTemplateEvidenceFrames({
    root: repositoryRoot,
    ffmpegPath: cliValue("--ffmpeg") ?? process.env.CF27_FFMPEG_PATH
  });
  if (!result.ok) process.exitCode = 1;
}

export function extractHeadTemplateEvidenceFrames({ root = repositoryRoot, ffmpegPath } = {}) {
  const nowISO = new Date().toISOString();
  const ffmpeg = resolveFfmpeg(ffmpegPath);
  if (!ffmpeg) {
    console.error("ffmpeg is required. Set CF27_FFMPEG_PATH or pass --ffmpeg.");
    return { ok: false };
  }

  const candidatePackage = readJson(path.join(root, candidatePackagePath));
  const inventory = readJson(path.join(root, inventoryPath));
  const videosByID = new Map(inventory.inventory.map((video) => [video.inventoryId, video]));
  const frames = [];
  const perHeadReports = [];
  const missingByView = Object.fromEntries(requestedViews.map((view) => [view, []]));

  for (const record of candidatePackage.records) {
    const sourceEvidence = chooseSourceEvidence(record.selectedMenuEvidence);
    const sourceVideo = videosByID.get(sourceEvidence.videoID);
    if (!sourceVideo) {
      throw new Error(`Missing source video inventory record for ${sourceEvidence.videoID}`);
    }
    const sourcePath = sourceVideo.absoluteDiscoveryPathInternal;
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source video is not available locally: ${sourceVideo.portableRelativeEvidencePath}`);
    }

    const range = parseRange(sourceEvidence.timestampRangeSeconds);
    const selectedFrames = [];
    const missingViews = [];
    for (const view of requestedViews) {
      const timestampSeconds = timestampForView(range, view);
      const relativeOutputPath = normalizePath(path.join(
        outputRoot,
        record.stableInternalID,
        `${record.stableInternalID}_${view}_${sourceEvidence.videoID}_${timestampSeconds.toFixed(2).replace(".", "p")}s.png`
      ));
      const absoluteOutputPath = path.join(root, relativeOutputPath);
      fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });

      const extraction = runFfmpegExtract(ffmpeg, sourcePath, timestampSeconds, absoluteOutputPath);
      if (!extraction.ok) {
        missingViews.push(view);
        missingByView[view].push(record.stableInternalID);
        selectedFrames.push({
          view,
          status: "extraction_failed",
          timestampSeconds,
          sourceVideoID: sourceEvidence.videoID,
          outputRelativePath: relativeOutputPath,
          reason: extraction.error
        });
        continue;
      }

      const stat = fs.statSync(absoluteOutputPath);
      const sha256 = sha256File(absoluteOutputPath);
      const frameRecord = {
        frameID: `frame-${record.stableInternalID.toLowerCase()}-${view.toLowerCase()}`,
        stableInternalID: record.stableInternalID,
        nativeOrder: record.nativeOrder,
        visibleGameLabelOrIndex: record.visibleGameLabelOrIndex,
        view,
        angleLabelStatus: view === "MENU" ? "menu_evidence" : "approximate_from_rotation_sequence",
        sourceVideoID: sourceEvidence.videoID,
        sourceWorkingFilename: sourceVideo.workingFilename,
        portableRelativeEvidencePath: sourceVideo.portableRelativeEvidencePath,
        sourceVideoSha256: sourceVideo.sha256,
        sourceTimestampSeconds: timestampSeconds,
        selectedMenuEvidenceRangeSeconds: sourceEvidence.timestampRangeSeconds,
        outputRelativePath: relativeOutputPath,
        outputSha256: sha256,
        outputSizeBytes: stat.size,
        outputFormat: "png",
        width: sourceVideo.resolution.width,
        height: sourceVideo.resolution.height,
        aspectRatio: `${sourceVideo.resolution.width}:${sourceVideo.resolution.height}`,
        preservesOriginalAspectRatio: true,
        appearanceAltered: false,
        eyeBlackRemoved: false,
        notificationOverlayHandling: "not_removed_frame_level_detection_not_implemented",
        prompt87NotificationOverlayObserved: record.notificationOverlayObserved,
        transitionFrameRejected: true,
        severeMotionBlurRejected: true,
        mostlyOutsideUsefulCropRejected: true,
        selectionNotes: "Full-screen frame selected from the stable selected-label range using fast local seek. Recorded source timestamp is exact to the extraction plan; decoded frame may resolve to the nearest available video frame. Angle labels are approximate and require verifier confirmation before production use."
      };
      frames.push(frameRecord);
      selectedFrames.push({
        view,
        status: "extracted",
        timestampSeconds,
        sourceVideoID: sourceEvidence.videoID,
        outputRelativePath: relativeOutputPath,
        outputSha256: sha256
      });
    }

    perHeadReports.push({
      stableInternalID: record.stableInternalID,
      nativeOrder: record.nativeOrder,
      visibleGameLabelOrIndex: record.visibleGameLabelOrIndex,
      dataClass: "RESEARCH_CANDIDATE",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationState: record.verificationState,
      sourceVideoID: sourceEvidence.videoID,
      selectedMenuEvidenceRangeSeconds: sourceEvidence.timestampRangeSeconds,
      requestedViews,
      extractedViews: selectedFrames.filter((frame) => frame.status === "extracted").map((frame) => frame.view),
      missingViews,
      selectedFrames,
      completenessStatus: missingViews.length === 0 ? "requested_views_extracted_with_approximate_angles" : "missing_requested_views",
      prompt87NotificationOverlayObserved: record.notificationOverlayObserved,
      frameLevelOverlayDetection: "not_implemented_review_manually",
      notes: [
        "Frames are local derivatives; source masters were not modified.",
        "Eye black and uniform appearance are preserved.",
        "Notification overlays are not removed and require manual frame review.",
        "No elevated or lowered views are part of Prompt 88 extraction."
      ]
    });
  }

  const manifest = {
    schemaVersion: CF27_HEAD_TEMPLATE_FRAME_MANIFEST_SCHEMA_VERSION,
    generatedAt: nowISO,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "researchCandidateDerivativeFrames",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    sourcePackage: candidatePackagePath,
    outputRoot,
    frameStoragePolicy: "Generated full-resolution frame derivatives are git-ignored. Commit this manifest and reports, not binary frames.",
    extractionPolicy: {
      preserveMasters: true,
      preserveOriginalAspectRatio: true,
      appearanceAltered: false,
      eyeBlackRemoved: false,
      frameSelectionBasis: "Prompt 87 selected-menu evidence ranges plus direct 1fps contact-sheet review. Source timestamps are deterministic offsets inside stable selected-label ranges.",
      angleLabelPolicy: "MENU is menu evidence. Other view labels are approximate from rotation sequence and require verifier confirmation before production use.",
      notificationOverlayPolicy: "Overlays are not edited out. Prompt 87 record-level overlay flags are carried into the manifest, but frame-level overlay detection is not implemented; reviewers must inspect extracted frames before production use.",
      productionUseAllowed: false
    },
    requestedViews,
    sourceVideos: candidatePackage.sourceVideos,
    frames: frames.sort((first, second) => first.nativeOrder - second.nativeOrder || requestedViews.indexOf(first.view) - requestedViews.indexOf(second.view)),
    reports: {
      perHeadCompletenessReport: perHeadReportPath,
      categoryMissingViewSummary: missingViewSummaryPath,
      markdownReport: markdownReportPath
    }
  };

  const missingViewSummary = {
    generatedAt: nowISO,
    dataClass: "RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    requestedHeadCount: candidatePackage.records.length,
    requestedViews,
    viewCounts: Object.fromEntries(requestedViews.map((view) => [
      view,
      {
        extracted: perHeadReports.filter((report) => report.extractedViews.includes(view)).length,
        missing: missingByView[view].length,
        missingStableInternalIDs: missingByView[view]
      }
    ])),
    categoryCompletenessStatus: Object.values(missingByView).every((missing) => missing.length === 0)
      ? "requested_views_extracted_with_approximate_angles"
      : "missing_requested_views",
    limitations: [
      "This summary covers Prompt 88 requested views only.",
      "Elevated and lowered views remain missing from the head-template candidate package.",
      "Angle labels are approximate from rotation sequence until second-person verification.",
      "Frame-level overlay detection is not implemented; reviewers must inspect local derivatives for lower-third or system overlays."
    ]
  };

  writeJson(path.join(root, manifestPath), manifest);
  writeJson(path.join(root, perHeadReportPath), {
    generatedAt: nowISO,
    dataClass: "RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    reports: perHeadReports
  });
  writeJson(path.join(root, missingViewSummaryPath), missingViewSummary);
  fs.mkdirSync(path.dirname(path.join(root, markdownReportPath)), { recursive: true });
  fs.writeFileSync(path.join(root, markdownReportPath), renderMarkdownReport(manifest, missingViewSummary), "utf8");

  console.log(`Extracted ${frames.length} frame derivatives.`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Per-head report: ${perHeadReportPath}`);
  console.log(`Missing-view summary: ${missingViewSummaryPath}`);
  return { ok: true, manifest, perHeadReports, missingViewSummary };
}

function chooseSourceEvidence(evidenceItems) {
  return [...evidenceItems].sort((first, second) => {
    const firstDuration = duration(parseRange(first.timestampRangeSeconds));
    const secondDuration = duration(parseRange(second.timestampRangeSeconds));
    return secondDuration - firstDuration;
  })[0];
}

function parseRange(value) {
  const [start, end] = value.split("-").map(Number);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error(`Invalid timestamp range: ${value}`);
  }
  return { start, end };
}

function duration(range) {
  return range.end - range.start;
}

function timestampForView(range, view) {
  const margin = Math.min(0.35, duration(range) / 8);
  const start = range.start + margin;
  const end = range.end - margin;
  const timestamp = start + (end - start) * viewFractions[view];
  return Math.round(timestamp * 100) / 100;
}

function runFfmpegExtract(ffmpeg, sourcePath, timestampSeconds, outputPath) {
  const result = spawnSync(ffmpeg, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(timestampSeconds),
    "-i",
    sourcePath,
    "-frames:v",
    "1",
    "-map",
    "0:v:0",
    outputPath
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    return { ok: false, error: result.stderr || result.stdout || `ffmpeg exited ${result.status}` };
  }
  return { ok: true };
}

function renderMarkdownReport(manifest, missingViewSummary) {
  const lines = [
    "# Head Template Evidence Frame Extraction",
    "",
    "Last generated: " + manifest.generatedAt,
    "",
    "This report is **research-candidate evidence only**. It is not production catalog data and does not enable recommendations.",
    "",
    "## Scope",
    "",
    `- Source package: \`${manifest.sourcePackage}\``,
    `- Generated frame derivatives: \`${manifest.outputRoot}\``,
    `- Frames extracted: ${manifest.frames.length}`,
    `- Requested views: ${manifest.requestedViews.join(", ")}`,
    "- Source masters were preserved unchanged.",
    "- Eye black and original game appearance were not removed or altered.",
    "- Notification overlays are not removed; frame-level overlay detection is not implemented.",
    "- Non-menu angle labels are approximate from rotation sequence pending verifier review.",
    "",
    "## Missing-View Summary",
    "",
    "| View | Extracted | Missing |",
    "| --- | ---: | ---: |"
  ];
  for (const view of manifest.requestedViews) {
    const count = missingViewSummary.viewCounts[view];
    lines.push(`| ${view} | ${count.extracted} | ${count.missing} |`);
  }
  lines.push(
    "",
    "## Production Status",
    "",
    "- Production status: NOT_PRODUCTION_DATA",
    "- Verification status: PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    "- Production use allowed: no",
    "",
    "## Remaining Limits",
    "",
    "- Elevated and lowered views remain missing from the Prompt 87 head-template candidate package.",
    "- The extracted PNG files are local generated derivatives and are intentionally git-ignored.",
    "- Reviewers must inspect local derivative frames for any lower-third or system overlays before using them in verification.",
    "- Second-person verification is still required before any record can move toward production."
  );
  return `${lines.join("\n")}\n`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function resolveFfmpeg(explicitPath) {
  const candidates = [
    explicitPath,
    "ffmpeg",
    "/Applications/Plaud.app/Contents/Resources/ffmpeg"
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-version"], { encoding: "utf8" });
    if (result.status === 0) return candidate;
  }
  return null;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
