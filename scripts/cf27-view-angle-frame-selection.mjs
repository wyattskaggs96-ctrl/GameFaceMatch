#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_VIEW_ANGLE_FRAME_SELECTION_SCHEMA_VERSION = "cf27-view-angle-frame-selection-v1";
export const viewAngleFrameSelectionLabel = "PRIMARY RESEARCH FRAME SELECTION — NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultManifestRoot = "data/research/cf27/manifests";
const defaultOutputDirectory = "data/research/cf27/reports/view-angle-frame-selection";
const desiredViews = ["FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"];

const viewDisplayNames = {
  FRONT: "Front",
  LEFT_3Q: "Left three-quarter",
  LEFT_PROFILE: "Left profile",
  RIGHT_3Q: "Right three-quarter",
  RIGHT_PROFILE: "Right profile",
  REAR: "Rear"
};

export function buildViewAngleFrameSelectionReport({
  root = repositoryRoot,
  manifestRoot = defaultManifestRoot,
  generatedAt = new Date().toISOString(),
  overrides = []
} = {}) {
  const manifests = loadFrameManifests(path.resolve(root, manifestRoot), root);
  const frames = manifests.flatMap((manifest) => manifest.frames.map((frame) => normalizeFrame(frame, manifest)));
  const records = groupFramesByRecord(frames);
  const recordSelections = [...records.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([stableInternalID, recordFrames]) => {
    const sortedFrames = recordFrames.sort((left, right) => String(left.frameID).localeCompare(String(right.frameID)));
    const sample = sortedFrames[0];
    const selections = Object.fromEntries(desiredViews.map((view) => [
      view,
      rankFramesForView({
        stableInternalID,
        view,
        frames: sortedFrames,
        override: findLatestOverride(overrides, stableInternalID, view)
      })
    ]));
    return {
      stableInternalID,
      nativeOrder: sample.nativeOrder ?? null,
      visibleGameLabelOrIndex: sample.visibleGameLabelOrIndex ?? sample.nativeLabelOriginalText ?? "",
      sourceManifests: unique(sortedFrames.map((frame) => frame.sourceManifest)),
      dataClass: "PRIMARY_RESEARCH_CANDIDATE",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "FRAME_SELECTION_REVIEW_REQUIRED",
      selections
    };
  });
  const flatSelections = recordSelections.flatMap((record) => desiredViews.map((view) => record.selections[view]));
  const report = {
    schemaVersion: CF27_VIEW_ANGLE_FRAME_SELECTION_SCHEMA_VERSION,
    reportLabel: viewAngleFrameSelectionLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "AUTOMATED_RANKING_REVIEW_REQUIRED",
    sourceManifestRoot: manifestRoot,
    desiredViews: desiredViews.map((view) => ({ view, displayName: viewDisplayNames[view] })),
    policy: {
      factStatus: "Automated frame rankings are review aids, not verified game facts.",
      missingViewPolicy: "If no exact view candidate exists, the view remains missing. The tool does not fabricate left/right/profile/rear evidence from ambiguous frames.",
      overridePolicy: "Reviewer overrides append selection history and preserve the previous automated or reviewer selection.",
      masterHandling: "The tool reads frame-manifest metadata only. It does not modify source videos or generated image derivatives.",
      productionUseAllowed: false
    },
    scoringModel: {
      version: "view-angle-frame-selection-v1",
      criteria: [
        "headPoseOrViewMatch",
        "faceVisibility",
        "sharpnessProxy",
        "cropAndFraming",
        "loadingStateStability",
        "overlayObstruction",
        "lightingAvailability",
        "headSizeAvailability"
      ],
      note: "Current scoring uses manifest metadata and local file-size proxies when available. It does not perform identity recognition or infer unobserved head pose."
    },
    sourceManifests: manifests.map((manifest) => ({
      relativePath: manifest.relativePath,
      schemaVersion: manifest.schemaVersion,
      frameCount: manifest.frames.length,
      productionStatus: manifest.productionStatus,
      verificationStatus: manifest.verificationStatus
    })),
    summary: {
      sourceManifestCount: manifests.length,
      frameCount: frames.length,
      recordCount: recordSelections.length,
      desiredViewCount: desiredViews.length,
      selectedViewCount: flatSelections.filter((selection) => selection.selectionStatus === "autoSelected" || selection.selectionStatus === "reviewerOverride").length,
      missingViewCount: flatSelections.filter((selection) => selection.selectionStatus === "missingViewNoSelection").length,
      reviewerOverrideCount: flatSelections.filter((selection) => selection.selectionStatus === "reviewerOverride").length,
      fabricatedViewCount: 0
    },
    records: recordSelections,
    reviewerOverrides: overrides
  };
  return report;
}

export function applyFrameSelectionOverride(report, {
  stableInternalID,
  view,
  frameID,
  reviewerID,
  reason,
  overriddenAt = new Date().toISOString()
}) {
  if (!desiredViews.includes(view)) throw new Error(`Unsupported desired view: ${view}`);
  const record = report.records.find((candidate) => candidate.stableInternalID === stableInternalID);
  if (!record) throw new Error(`Unknown stableInternalID: ${stableInternalID}`);
  const selection = record.selections[view];
  if (!selection) throw new Error(`Missing selection bucket for ${stableInternalID} ${view}`);
  const candidate = selection.candidates.find((entry) => entry.frameID === frameID);
  if (!candidate) throw new Error(`Frame ${frameID} is not a candidate for ${stableInternalID} ${view}`);

  const previousSelection = selection.selectedFrame ? {
    selectedFrameID: selection.selectedFrame.frameID,
    selectionStatus: selection.selectionStatus,
    confidence: selection.confidence,
    selectedAt: selection.selectedAt ?? report.generatedAt,
    selectedBy: selection.selectedBy ?? "automated-ranking"
  } : {
    selectedFrameID: null,
    selectionStatus: selection.selectionStatus,
    confidence: selection.confidence,
    selectedAt: selection.selectedAt ?? report.generatedAt,
    selectedBy: selection.selectedBy ?? "automated-ranking"
  };
  const historyEntry = {
    overrideID: `override-${safeToken(`${stableInternalID}-${view}-${frameID}-${overriddenAt}`).slice(0, 96)}`,
    stableInternalID,
    view,
    frameID,
    reviewerID: reviewerID || "UNKNOWN_REVIEWER",
    reason: reason || "No reason supplied",
    overriddenAt,
    previousSelection,
    factStatus: "reviewer_override_not_verified_game_fact",
    productionStatus: "NOT_PRODUCTION_DATA"
  };

  const nextReport = JSON.parse(JSON.stringify(report));
  const nextRecord = nextReport.records.find((candidateRecord) => candidateRecord.stableInternalID === stableInternalID);
  const nextSelection = nextRecord.selections[view];
  nextSelection.selectionStatus = "reviewerOverride";
  nextSelection.selectedFrame = candidate;
  nextSelection.confidence = Math.max(candidate.confidence, 0.5);
  nextSelection.selectedBy = reviewerID || "UNKNOWN_REVIEWER";
  nextSelection.selectedAt = overriddenAt;
  nextSelection.reviewRequired = true;
  nextSelection.reviewReason = "Reviewer override selected a frame. Preserve this decision history for second-person review.";
  nextSelection.selectionHistory = [...(nextSelection.selectionHistory ?? []), historyEntry];
  nextReport.reviewerOverrides = [...(nextReport.reviewerOverrides ?? []), historyEntry];
  nextReport.summary.reviewerOverrideCount = nextReport.records.flatMap((candidateRecord) => desiredViews.map((desiredView) => candidateRecord.selections[desiredView])).filter((entry) => entry.selectionStatus === "reviewerOverride").length;
  nextReport.summary.selectedViewCount = nextReport.records.flatMap((candidateRecord) => desiredViews.map((desiredView) => candidateRecord.selections[desiredView])).filter((entry) => entry.selectionStatus === "autoSelected" || entry.selectionStatus === "reviewerOverride").length;
  nextReport.generatedAt = overriddenAt;
  return nextReport;
}

export function writeViewAngleFrameSelectionOutputs(report, {
  root = repositoryRoot,
  outputDirectory = defaultOutputDirectory
} = {}) {
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  assertResearchReportOutput(root, absoluteOutputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const reportPath = path.join(absoluteOutputDirectory, "view_angle_frame_selection_report.json");
  const queuePath = path.join(absoluteOutputDirectory, "view_angle_frame_review_queue.csv");
  const markdownPath = path.join(absoluteOutputDirectory, "view_angle_frame_selection_review.md");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(queuePath, formatReviewQueueCSV(report), "utf8");
  fs.writeFileSync(markdownPath, formatMarkdownReport(report), "utf8");
  return {
    ok: true,
    outputDirectory: normalizePath(path.relative(root, absoluteOutputDirectory)),
    files: [
      normalizePath(path.relative(root, reportPath)),
      normalizePath(path.relative(root, queuePath)),
      normalizePath(path.relative(root, markdownPath))
    ]
  };
}

export function rankFramesForView({ stableInternalID, view, frames, override = null }) {
  const candidates = frames
    .map((frame) => scoreFrameForView(frame, view))
    .filter((candidate) => candidate.relevance !== "not_relevant")
    .sort((left, right) => right.score - left.score || left.frameID.localeCompare(right.frameID));
  if (override) {
    const overrideCandidate = candidates.find((candidate) => candidate.frameID === override.frameID);
    if (overrideCandidate) {
      return {
        stableInternalID,
        view,
        viewDisplayName: viewDisplayNames[view],
        selectionStatus: "reviewerOverride",
        selectedFrame: overrideCandidate,
        confidence: Math.max(overrideCandidate.confidence, 0.5),
        selectedBy: override.reviewerID,
        selectedAt: override.overriddenAt,
        reviewRequired: true,
        reviewReason: "Reviewer override supplied before report generation.",
        candidates,
        selectionHistory: [override],
        missingViewReason: null
      };
    }
  }
  const exactCandidates = candidates.filter((candidate) => candidate.autoSelectionAllowed);
  const selectedFrame = exactCandidates[0] ?? null;
  if (!selectedFrame) {
    return {
      stableInternalID,
      view,
      viewDisplayName: viewDisplayNames[view],
      selectionStatus: "missingViewNoSelection",
      selectedFrame: null,
      confidence: 0,
      selectedBy: "automated-ranking",
      selectedAt: null,
      reviewRequired: true,
      reviewReason: "No exact view candidate exists. Ambiguous or menu-only frames are not promoted to this view.",
      candidates,
      selectionHistory: [],
      missingViewReason: "no_exact_candidate_for_requested_view"
    };
  }
  return {
    stableInternalID,
    view,
    viewDisplayName: viewDisplayNames[view],
    selectionStatus: "autoSelected",
    selectedFrame,
    confidence: selectedFrame.confidence,
    selectedBy: "automated-ranking",
    selectedAt: null,
    reviewRequired: true,
    reviewReason: "Automated best-frame selection requires human review before verification or publication.",
    candidates,
    selectionHistory: [],
    missingViewReason: null
  };
}

function scoreFrameForView(frame, desiredView) {
  const canonical = canonicalFrameView(frame);
  const viewMatch = viewMatchScore(canonical, desiredView);
  if (viewMatch.relevance === "not_relevant") {
    return {
      frameID: frame.frameID,
      relevance: "not_relevant",
      score: 0,
      confidence: 0
    };
  }
  const criteria = {
    headPoseOrViewMatch: viewMatch.score,
    faceVisibility: faceVisibilityScore(frame, canonical),
    sharpnessProxy: sharpnessProxyScore(frame),
    cropAndFraming: cropAndFramingScore(frame),
    loadingStateStability: loadingStateScore(frame),
    overlayObstruction: overlayScore(frame),
    lighting: lightingScore(frame),
    headSize: headSizeScore(frame)
  };
  const score = round(mean(Object.values(criteria)));
  const confidence = round(score * (viewMatch.autoSelectionAllowed ? 1 : 0.62));
  return {
    frameID: frame.frameID,
    stableInternalID: frame.stableInternalID,
    sourceManifest: frame.sourceManifest,
    sourceVideoID: frame.sourceVideoID,
    sourceWorkingFilename: frame.sourceWorkingFilename,
    outputRelativePath: frame.outputRelativePath,
    sourceTimestampSeconds: frame.sourceTimestampSeconds,
    sourceViewOrRole: frame.view ?? frame.role ?? null,
    canonicalFrameView: canonical,
    relevance: viewMatch.relevance,
    autoSelectionAllowed: viewMatch.autoSelectionAllowed,
    score,
    confidence,
    criteria,
    explainability: frameSelectionExplanation(frame, desiredView, canonical, viewMatch, criteria),
    warnings: frameWarnings(frame, canonical, viewMatch),
    productionStatus: "NOT_PRODUCTION_DATA",
    factStatus: "candidate_frame_ranking_not_verified_game_fact"
  };
}

function canonicalFrameView(frame) {
  const raw = String(frame.view ?? frame.role ?? "").toUpperCase();
  const normalized = raw.replace(/[^A-Z0-9]+/g, "_");
  if (normalized === "FRONT" || normalized === "CHARACTER_FRONT") return "FRONT";
  if (normalized === "LEFT_3Q" || normalized === "LEFT_THREE_QUARTER") return "LEFT_3Q";
  if (normalized === "LEFT_PROFILE") return "LEFT_PROFILE";
  if (normalized === "RIGHT_3Q" || normalized === "RIGHT_THREE_QUARTER") return "RIGHT_3Q";
  if (normalized === "RIGHT_PROFILE") return "RIGHT_PROFILE";
  if (normalized === "REAR") return "REAR";
  if (normalized === "BEST_AVAILABLE_THREE_QUARTER" || normalized === "BEST_AVAILABLE_SIDE_OR_THREE_QUARTER") return "THREE_QUARTER_UNSPECIFIED";
  if (normalized === "MENU" || normalized === "MENU_EVIDENCE" || normalized === "MENU_THUMBNAIL_EVIDENCE") return "MENU";
  if (normalized === "CHARACTER_STABLE") return "CHARACTER_STABLE_UNSPECIFIED";
  return "UNKNOWN";
}

function viewMatchScore(canonical, desiredView) {
  if (canonical === desiredView) return { score: 1, relevance: "exact", autoSelectionAllowed: true };
  if (desiredView === "FRONT" && canonical === "CHARACTER_STABLE_UNSPECIFIED") return { score: 0.58, relevance: "ambiguous", autoSelectionAllowed: false };
  if ((desiredView === "LEFT_3Q" || desiredView === "RIGHT_3Q") && canonical === "THREE_QUARTER_UNSPECIFIED") return { score: 0.52, relevance: "ambiguous_direction", autoSelectionAllowed: false };
  if (canonical === "MENU") return { score: 0.18, relevance: "menu_context_only", autoSelectionAllowed: false };
  return { score: 0, relevance: "not_relevant", autoSelectionAllowed: false };
}

function faceVisibilityScore(frame, canonical) {
  if (canonical === "MENU") return 0.2;
  if (canonical === "UNKNOWN") return 0.3;
  if (canonical === "CHARACTER_STABLE_UNSPECIFIED") return 0.55;
  return 0.82;
}

function sharpnessProxyScore(frame) {
  const pixels = Number(frame.width) * Number(frame.height);
  if (!Number.isFinite(pixels) || pixels <= 0 || !Number.isFinite(Number(frame.outputSizeBytes))) return 0.5;
  const bytesPerPixel = Number(frame.outputSizeBytes) / pixels;
  return clamp(round(bytesPerPixel / 0.8), 0.25, 0.95);
}

function cropAndFramingScore(frame) {
  let score = 0.55;
  if (frame.preservesOriginalAspectRatio === true) score += 0.15;
  if (frame.mostlyOutsideUsefulCropRejected === true) score += 0.1;
  if (frame.width && frame.height) score += 0.05;
  return clamp(round(score), 0, 1);
}

function loadingStateScore(frame) {
  let score = 0.55;
  if (frame.transitionFrameRejected === true) score += 0.2;
  if (/stable/i.test(String(frame.role ?? frame.view ?? ""))) score += 0.1;
  if (/loading/i.test(String(frame.selectionNotes ?? ""))) score -= 0.15;
  return clamp(round(score), 0, 1);
}

function overlayScore(frame) {
  if (frame.prompt87NotificationOverlayObserved === true) return 0.3;
  if (/overlay/i.test(String(frame.notificationOverlayHandling ?? "")) && /not_implemented/i.test(String(frame.notificationOverlayHandling ?? ""))) return 0.55;
  return 0.82;
}

function lightingScore(_frame) {
  return 0.5;
}

function headSizeScore(_frame) {
  return 0.5;
}

function frameSelectionExplanation(frame, desiredView, canonical, viewMatch, criteria) {
  const reasons = [
    `Requested ${viewDisplayNames[desiredView]} and frame was classified as ${canonical}.`,
    viewMatch.autoSelectionAllowed ? "View evidence is exact enough for automated preselection." : "View evidence is not exact enough for automated preselection.",
    `Sharpness proxy is ${criteria.sharpnessProxy}; crop/framing score is ${criteria.cropAndFraming}; overlay score is ${criteria.overlayObstruction}.`
  ];
  if (frame.prompt87NotificationOverlayObserved === true) reasons.push("Prior prompt metadata observed notification overlay risk.");
  if (canonical === "MENU") reasons.push("Menu frames are retained for context and are not selected as face-angle evidence.");
  if (canonical === "THREE_QUARTER_UNSPECIFIED") reasons.push("Three-quarter direction is unspecified, so the tool will not invent left or right.");
  return reasons;
}

function frameWarnings(frame, canonical, viewMatch) {
  return [
    viewMatch.autoSelectionAllowed ? null : "manual_review_required_before_selection",
    canonical === "MENU" ? "menu_context_only" : null,
    canonical === "THREE_QUARTER_UNSPECIFIED" ? "three_quarter_direction_unknown" : null,
    frame.prompt87NotificationOverlayObserved === true ? "overlay_obstruction_risk" : null,
    frame.notificationOverlayHandling && /not_implemented/i.test(String(frame.notificationOverlayHandling)) ? "frame_level_overlay_detection_not_implemented" : null,
    "lighting_not_measured",
    "head_size_not_measured"
  ].filter(Boolean);
}

function loadFrameManifests(absoluteManifestRoot, root) {
  const manifestPaths = listFiles(absoluteManifestRoot)
    .filter((file) => file.endsWith("evidence_frame_manifest.json"))
    .sort();
  return manifestPaths.map((manifestPath) => {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return {
      relativePath: normalizePath(path.relative(root, manifestPath)),
      schemaVersion: parsed.schemaVersion,
      productionStatus: parsed.productionStatus,
      verificationStatus: parsed.verificationStatus,
      frames: parsed.frames ?? []
    };
  });
}

function normalizeFrame(frame, manifest) {
  return {
    ...frame,
    frameID: frame.frameID,
    stableInternalID: frame.stableInternalID,
    sourceManifest: manifest.relativePath,
    productionStatus: "NOT_PRODUCTION_DATA"
  };
}

function groupFramesByRecord(frames) {
  const groups = new Map();
  for (const frame of frames) {
    if (!frame.stableInternalID || !frame.frameID) continue;
    const values = groups.get(frame.stableInternalID) ?? [];
    values.push(frame);
    groups.set(frame.stableInternalID, values);
  }
  return groups;
}

function findLatestOverride(overrides, stableInternalID, view) {
  return [...overrides]
    .filter((override) => override.stableInternalID === stableInternalID && override.view === view)
    .sort((left, right) => String(right.overriddenAt ?? "").localeCompare(String(left.overriddenAt ?? "")))[0] ?? null;
}

function formatReviewQueueCSV(report) {
  const header = [
    "stableInternalID",
    "nativeOrder",
    "visibleGameLabelOrIndex",
    "view",
    "selectionStatus",
    "selectedFrameID",
    "confidence",
    "candidateCount",
    "reviewReason",
    "missingViewReason",
    "topWarnings"
  ];
  const rows = report.records.flatMap((record) => desiredViews.map((view) => {
    const selection = record.selections[view];
    return csvRow([
      record.stableInternalID,
      record.nativeOrder ?? "",
      record.visibleGameLabelOrIndex,
      view,
      selection.selectionStatus,
      selection.selectedFrame?.frameID ?? "",
      selection.confidence,
      selection.candidates.length,
      selection.reviewReason,
      selection.missingViewReason ?? "",
      unique(selection.candidates.flatMap((candidate) => candidate.warnings)).slice(0, 6).join("|")
    ]);
  }));
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

function formatMarkdownReport(report) {
  const lines = [
    "# View-Angle Frame Selection Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "**PRIMARY RESEARCH FRAME SELECTION — NOT PRODUCTION VERIFIED**",
    "",
    "Automated frame rankings are review aids. Missing views remain missing; ambiguous frames are not promoted into left/right/profile/rear evidence.",
    "",
    "## Summary",
    "",
    `- Source manifests: ${report.summary.sourceManifestCount}`,
    `- Frames ranked: ${report.summary.frameCount}`,
    `- Records: ${report.summary.recordCount}`,
    `- Selected views: ${report.summary.selectedViewCount}`,
    `- Missing views: ${report.summary.missingViewCount}`,
    `- Reviewer overrides: ${report.summary.reviewerOverrideCount}`,
    `- Fabricated views: ${report.summary.fabricatedViewCount}`,
    "",
    "## Review Queue",
    "",
    "| Record | View | Status | Selected frame | Confidence | Review reason |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  for (const record of report.records) {
    for (const view of desiredViews) {
      const selection = record.selections[view];
      if (selection.selectionStatus === "autoSelected" && selection.confidence > 0.7) continue;
      lines.push(`| ${record.stableInternalID} | ${viewDisplayNames[view]} | ${selection.selectionStatus} | ${selection.selectedFrame?.frameID ?? ""} | ${selection.confidence} | ${escapeMarkdownCell(selection.reviewReason)} |`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolutePath) : [absolutePath];
  });
}

function assertResearchReportOutput(root, absoluteOutputDirectory) {
  const allowed = path.resolve(root, "data/research/cf27/reports");
  if (!path.resolve(absoluteOutputDirectory).startsWith(allowed)) {
    throw new Error(`Refusing to write frame-selection output outside data/research/cf27/reports: ${path.relative(root, absoluteOutputDirectory)}`);
  }
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function csvRow(values) {
  return values.map((value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
  }).join(",");
}

function normalizePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function safeToken(value) {
  return String(value).trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function escapeMarkdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

function cliValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/cf27-view-angle-frame-selection.mjs generate [--output-directory <dir>]",
    "  node scripts/cf27-view-angle-frame-selection.mjs override <report.json> --record <stable-id> --view <view> --frame <frame-id> --reviewer <id> --reason <text> [--output <report.json>]",
    "  node scripts/cf27-view-angle-frame-selection.mjs --help",
    "",
    "Ranks local research derivative frames for front, left/right three-quarter, left/right profile, and rear views.",
    "Findings are review aids only and never verified production game facts."
  ].join("\n"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (!command || command === "--help") {
    printHelp();
    process.exit(0);
  }
  if (command === "generate") {
    const report = buildViewAngleFrameSelectionReport({ root: repositoryRoot });
    const output = writeViewAngleFrameSelectionOutputs(report, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory
    });
    console.log(JSON.stringify({ ok: true, summary: report.summary, outputs: output.files }, null, 2));
    process.exit(0);
  }
  if (command === "override") {
    const reportPath = process.argv[3];
    if (!reportPath) {
      printHelp();
      process.exit(1);
    }
    const absoluteReportPath = path.resolve(repositoryRoot, reportPath);
    const report = JSON.parse(fs.readFileSync(absoluteReportPath, "utf8"));
    const nextReport = applyFrameSelectionOverride(report, {
      stableInternalID: cliValue("--record"),
      view: cliValue("--view"),
      frameID: cliValue("--frame"),
      reviewerID: cliValue("--reviewer"),
      reason: cliValue("--reason")
    });
    const outputPath = path.resolve(repositoryRoot, cliValue("--output") ?? reportPath);
    assertResearchReportOutput(repositoryRoot, path.dirname(outputPath));
    fs.writeFileSync(outputPath, `${JSON.stringify(nextReport, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ok: true, output: normalizePath(path.relative(repositoryRoot, outputPath)), summary: nextReport.summary }, null, 2));
    process.exit(0);
  }
  printHelp();
  process.exit(1);
}
