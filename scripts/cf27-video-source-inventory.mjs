#!/usr/bin/env node
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_VIDEO_SOURCE_INVENTORY_SCHEMA_VERSION = "cf27-video-source-inventory-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputJson = "data/phase-zero/video_inventory.json";
const defaultOutputCsv = "data/phase-zero/video_inventory.csv";
const defaultOutputMarkdown = "docs/phase-zero/VIDEO_SOURCE_INVENTORY.md";
const existingResearchInventoryPath = "data/research/cf27/video_inventory.json";
const defaultSourceRootToken = "OWNER_DOWNLOADS";
const defaultManifestName = "RELABELED_VIDEO_MANIFEST.csv";
const supportedVideoExtensions = new Set([".mp4", ".mov", ".m4v", ".webm"]);

const contentSuitability = new Map([
  ["Environment and Road to Glory creation path", {
    menuEvidence: true,
    countEvidence: false,
    orderingEvidence: false,
    visualComparison: false,
    productionQualityCatalogImagery: false,
    observedContent: "Environment and Road to Glory creation-path navigation."
  }],
  ["Head Template captures Face 1 through Face 12", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Head Template recording with menu entry, selected Face labels, rotations, and intentional Face 12 continuity overlap."
  }],
  ["Head Template captures Face 12 through Face 29", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Head Template continuation recording with selected Face labels and intentional Face 12 overlap; category boundary beyond Face 29 is not proven."
  }],
  ["Skin Tone menu and options", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Skin Tone menu/options recording; research metadata only and not a production recommendation source."
  }],
  ["Skin Details menu and options", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Skin Details menu/options recording; labels requiring confirmation stay research-only."
  }],
  ["Eye Shape menu and options", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Eye Shape menu/options recording with navigation lead-in limitations."
  }],
  ["Eye Color menu and options", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Eye Color menu/options recording; visual color confidence varies with recording resolution and lighting."
  }],
  ["Nose menu and options", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Nose menu/options recording; profile evidence remains incomplete."
  }],
  ["Ear Shape menu and options", {
    menuEvidence: true,
    countEvidence: true,
    orderingEvidence: true,
    visualComparison: "limited",
    productionQualityCatalogImagery: false,
    observedContent: "Ear Shape menu/options recording with navigation lead-in, side-visibility, and obstruction limitations."
  }]
]);

export async function createVideoSourceInventory(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const sourceRoot = path.resolve(expandHome(options.sourceRoot ?? path.join(os.homedir(), "Downloads")));
  const sourceRootToken = options.sourceRootToken ?? defaultSourceRootToken;
  const manifestPath = path.resolve(options.manifestPath ?? path.join(sourceRoot, defaultManifestName));
  const existingResearchInventory = readJsonIfExists(path.resolve(root, options.existingResearchInventoryPath ?? existingResearchInventoryPath));
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const ffmpegWrapper = path.resolve(root, options.ffmpegWrapper ?? "scripts/media/ffmpeg-wrapper");
  const ffmpegTool = options.ffmpegTool ?? ffmpegWrapper;

  const manifestRows = parseManifestRows(readTextIfExists(manifestPath) ?? "");
  const manifestRowsByOriginal = new Map(manifestRows.map((row) => [row.originalFilename, row]));
  const existingByManifestOriginal = mapExistingInventoryByManifestOriginal(existingResearchInventory);
  const discoveredFiles = discoverSourceVideoFiles(sourceRoot, options.includeExtensions ?? supportedVideoExtensions, manifestRows);
  const discoveredReports = [];

  for (const filePath of discoveredFiles) {
    discoveredReports.push(await inspectDiscoveredVideo(filePath, {
      sourceRoot,
      sourceRootToken,
      ffmpegTool,
      ffmpegToolArgsPrefix: options.ffmpegToolArgsPrefix,
      inspector: options.inspector
    }));
  }

  const reportsByFilename = new Map(discoveredReports.map((report) => [report.originalFilename, report]));
  const claimedFilenames = new Set();
  const inventory = [];

  for (const row of manifestRows) {
    const direct = reportsByFilename.get(row.originalFilename);
    const existingMatchFilename = existingByManifestOriginal.get(row.originalFilename)?.discoveredFilename;
    const existingMatch = existingMatchFilename ? reportsByFilename.get(existingMatchFilename) : null;
    const durationMatch = direct || existingMatch ? null : findDurationMatch(discoveredReports, row, claimedFilenames);
    const matched = direct ?? existingMatch ?? durationMatch;
    if (!matched) {
      inventory.push(missingManifestInventoryItem(row, inventory.length + 1, sourceRootToken));
      continue;
    }
    claimedFilenames.add(matched.originalFilename);
    inventory.push(toInventoryItem({
      baseReport: matched,
      row,
      existing: existingByManifestOriginal.get(row.originalFilename),
      index: inventory.length + 1,
      sourceRootToken
    }));
  }

  for (const report of discoveredReports) {
    if (claimedFilenames.has(report.originalFilename)) continue;
    const duplicateOf = inventory.find((item) => item.sha256 === report.sha256 && item.fileOpenStatus === "opens");
    inventory.push(toInventoryItem({
      baseReport: report,
      row: null,
      existing: findExistingByDiscoveredFilename(existingResearchInventory, report.originalFilename),
      index: inventory.length + 1,
      sourceRootToken,
      duplicateOf
    }));
  }

  applyDuplicateReview(inventory);

  const summary = summarizeInventory(inventory, manifestRows);
  const report = {
    schemaVersion: CF27_VIDEO_SOURCE_INVENTORY_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "SOURCE_VIDEO_INVENTORY",
    productionStatus: "NOT_PRODUCTION_DATA",
    preservationPolicy: "Original source videos are read-only masters. This inventory records metadata and checksums only; it does not rename, trim, recompress, or alter master evidence.",
    sourceRoot: {
      token: sourceRootToken,
      absoluteDiscoveryRootInternal: sourceRoot
    },
    relabeledManifest: {
      path: fs.existsSync(manifestPath) ? sourcePath(sourceRoot, sourceRootToken, manifestPath) : null,
      rowCount: manifestRows.length,
      status: fs.existsSync(manifestPath) ? "loaded" : "missing"
    },
    ffmpeg: {
      wrapper: normalizeRelativePath(path.relative(root, ffmpegWrapper)),
      metadataMethod: "ffmpeg first-frame open probe; ffprobe is optional and not required for this inventory"
    },
    summary,
    inventory
  };

  if (options.write !== false) {
    writeOutputFiles(report, {
      root,
      outputJson: options.outputJson ?? defaultOutputJson,
      outputCsv: options.outputCsv ?? defaultOutputCsv,
      outputMarkdown: options.outputMarkdown ?? defaultOutputMarkdown
    });
  }

  return report;
}

async function inspectDiscoveredVideo(filePath, options) {
  const stat = fs.statSync(filePath);
  const sha256 = await sha256FileStream(filePath);
  const media = inspectMedia(filePath, options);
  return {
    originalFilename: path.basename(filePath),
    absoluteDiscoveryPathInternal: filePath,
    portableRelativeEvidencePath: sourcePath(options.sourceRoot, options.sourceRootToken, filePath),
    sha256,
    fileSizeBytes: stat.size,
    media
  };
}

function inspectMedia(filePath, { ffmpegTool, ffmpegToolArgsPrefix, inspector }) {
  if (typeof inspector === "function") return inspector(filePath);
  const args = [
    ...(ffmpegToolArgsPrefix ?? ["ffmpeg"]),
    "-hide_banner",
    "-i",
    filePath,
    "-map",
    "0:v:0",
    "-frames:v",
    "1",
    "-f",
    "null",
    "-"
  ];
  const result = spawnSync(ffmpegTool, args, { encoding: "utf8" });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const parsed = parseFfmpegMetadata(output);
  return {
    opensSuccessfully: !result.error && result.status === 0 && Boolean(parsed.videoCodec),
    openStatus: result.error ? "failed_to_start_ffmpeg" : result.status === 0 ? "opens" : "ffmpeg_open_failed",
    container: containerForPath(filePath, parsed.container),
    containerRaw: parsed.containerRaw,
    videoCodec: parsed.videoCodec,
    audioCodec: parsed.audioCodec,
    durationSeconds: parsed.durationSeconds,
    dimensions: parsed.dimensions,
    frameRate: parsed.frameRate,
    ffmpegStatus: result.status,
    ffmpegError: result.error?.message ?? null
  };
}

export function parseFfmpegMetadata(output) {
  const inputMatch = output.match(/Input #0,\s*([^,]+(?:,[^,]+)*?),\s*from /);
  const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const videoLine = output.split(/\r?\n/).find((line) => /Stream #\d+:\d+.*Video:/.test(line)) ?? "";
  const audioLine = output.split(/\r?\n/).find((line) => /Stream #\d+:\d+.*Audio:/.test(line)) ?? "";
  const videoCodecMatch = videoLine.match(/Video:\s*([^,\n]+)/);
  const audioCodecMatch = audioLine.match(/Audio:\s*([^,\n]+)/);
  const dimensionsMatch = videoLine.match(/,\s*(\d{2,5})x(\d{2,5})[\s,]/);
  const fpsMatch = videoLine.match(/,\s*([0-9]+(?:\.[0-9]+)?)\s*fps[\s,]/);
  return {
    containerRaw: inputMatch?.[1]?.trim() ?? null,
    container: normalizeContainer(inputMatch?.[1]),
    durationSeconds: durationMatch ? roundSeconds((Number(durationMatch[1]) * 3600) + (Number(durationMatch[2]) * 60) + Number(durationMatch[3])) : null,
    dimensions: dimensionsMatch ? {
      width: Number(dimensionsMatch[1]),
      height: Number(dimensionsMatch[2])
    } : null,
    frameRate: fpsMatch ? Number(fpsMatch[1]) : null,
    videoCodec: videoCodecMatch?.[1]?.trim() ?? null,
    audioCodec: audioCodecMatch?.[1]?.trim() ?? null
  };
}

function toInventoryItem({ baseReport, row, existing, index, sourceRootToken, duplicateOf = null }) {
  const expectedContent = row?.identifiedContent ?? existing?.identifiedContent ?? "Unmapped source video";
  const suitability = contentSuitability.get(expectedContent) ?? {
    menuEvidence: false,
    countEvidence: false,
    orderingEvidence: false,
    visualComparison: false,
    productionQualityCatalogImagery: false,
    observedContent: existing?.identifiedContent ?? "Unmapped discovered source video; requires manual classification before use."
  };
  const exactDuplicateOf = duplicateOf?.inventoryId ?? existing?.duplicateOfInventoryId ?? null;
  const status = exactDuplicateOf ? "duplicate_reference_only" : existing?.acceptanceStatus ?? acceptanceStatusFor(row, baseReport.media);
  return {
    inventoryId: `phase0-video-${String(index).padStart(3, "0")}`,
    manifestSequence: row?.sequence ?? existing?.sequence ?? null,
    originalFilename: row?.originalFilename ?? existing?.manifestOriginalFilename ?? baseReport.originalFilename,
    discoveredFilename: baseReport.originalFilename,
    canonicalFilename: row?.newFilename ?? existing?.workingFilename ?? baseReport.originalFilename,
    sourceLocation: {
      rootToken: sourceRootToken,
      portableRelativeEvidencePath: baseReport.portableRelativeEvidencePath,
      absoluteDiscoveryPathInternal: baseReport.absoluteDiscoveryPathInternal
    },
    manifestMatch: row ? {
      status: baseReport.originalFilename === row.originalFilename ? "matched_by_original_filename" : "matched_by_existing_inventory_or_duration",
      expectedDurationSeconds: row.durationSeconds,
      manifestNotes: row.notes
    } : {
      status: "not_in_relabel_manifest",
      expectedDurationSeconds: null,
      manifestNotes: ""
    },
    sha256: baseReport.sha256,
    fileSizeBytes: baseReport.fileSizeBytes,
    mediaContainer: baseReport.media.container,
    mediaContainerRaw: baseReport.media.containerRaw,
    videoCodec: baseReport.media.videoCodec,
    audioCodec: baseReport.media.audioCodec,
    durationSeconds: baseReport.media.durationSeconds,
    dimensions: baseReport.media.dimensions,
    frameRate: baseReport.media.frameRate,
    fileOpenStatus: baseReport.media.opensSuccessfully ? "opens" : "failed",
    ffmpegStatus: baseReport.media.openStatus,
    matchedManifestRow: Boolean(row),
    exactDuplicate: Boolean(exactDuplicateOf),
    exactDuplicateOf,
    likelyDuplicateOf: null,
    expectedContent,
    observedContent: existing?.identifiedContent ?? suitability.observedContent,
    conditionAssessment: conditionAssessmentFor({ row, existing, duplicateOf: exactDuplicateOf, media: baseReport.media }),
    suitability: {
      menuEvidence: suitability.menuEvidence,
      countEvidence: suitability.countEvidence,
      orderingEvidence: suitability.orderingEvidence,
      visualComparison: suitability.visualComparison,
      productionQualityCatalogImagery: suitability.productionQualityCatalogImagery
    },
    preservationStatus: "master_preserved_unchanged",
    productionUseStatus: "not_production_data"
  };
}

function missingManifestInventoryItem(row, index, sourceRootToken) {
  return {
    inventoryId: `phase0-video-${String(index).padStart(3, "0")}`,
    manifestSequence: row.sequence,
    originalFilename: row.originalFilename,
    discoveredFilename: null,
    canonicalFilename: row.newFilename,
    sourceLocation: {
      rootToken: sourceRootToken,
      portableRelativeEvidencePath: null,
      absoluteDiscoveryPathInternal: null
    },
    manifestMatch: {
      status: "manifest_row_missing_source_file",
      expectedDurationSeconds: row.durationSeconds,
      manifestNotes: row.notes
    },
    sha256: null,
    fileSizeBytes: null,
    mediaContainer: null,
    mediaContainerRaw: null,
    videoCodec: null,
    audioCodec: null,
    durationSeconds: null,
    dimensions: null,
    frameRate: null,
    fileOpenStatus: "missing",
    ffmpegStatus: "not_run",
    matchedManifestRow: true,
    exactDuplicate: false,
    exactDuplicateOf: null,
    likelyDuplicateOf: null,
    expectedContent: row.identifiedContent,
    observedContent: "Manifest row exists, but no source file was found in the current source root.",
    conditionAssessment: "missing",
    suitability: {
      menuEvidence: false,
      countEvidence: false,
      orderingEvidence: false,
      visualComparison: false,
      productionQualityCatalogImagery: false
    },
    preservationStatus: "missing_source_not_modified",
    productionUseStatus: "not_production_data"
  };
}

function applyDuplicateReview(inventory) {
  const firstByHash = new Map();
  for (const item of inventory) {
    if (!item.sha256) continue;
    const first = firstByHash.get(item.sha256);
    if (!first) {
      firstByHash.set(item.sha256, item);
      continue;
    }
    item.exactDuplicate = true;
    item.exactDuplicateOf = item.exactDuplicateOf ?? first.inventoryId;
    item.conditionAssessment = "exact_duplicate_reference_only";
    item.suitability = {
      menuEvidence: false,
      countEvidence: false,
      orderingEvidence: false,
      visualComparison: false,
      productionQualityCatalogImagery: false
    };
  }

  for (const item of inventory) {
    if (item.exactDuplicate || item.likelyDuplicateOf || !Number.isFinite(item.durationSeconds)) continue;
    const likely = inventory.find((other) => {
      if (other === item || other.exactDuplicate || !Number.isFinite(other.durationSeconds)) return false;
      if (other.sha256 === item.sha256) return false;
      if (other.expectedContent !== item.expectedContent) return false;
      return Math.abs(other.durationSeconds - item.durationSeconds) <= 0.25;
    });
    if (likely && likely.inventoryId.localeCompare(item.inventoryId) < 0) {
      item.likelyDuplicateOf = likely.inventoryId;
    }
  }
}

function summarizeInventory(inventory, manifestRows) {
  const uniqueHashes = new Set(inventory.filter((item) => item.sha256 && !item.exactDuplicate).map((item) => item.sha256));
  return {
    manifestRows: manifestRows.length,
    inventoryRows: inventory.length,
    filesFound: inventory.filter((item) => item.fileOpenStatus !== "missing").length,
    filesOpenSuccessfully: inventory.filter((item) => item.fileOpenStatus === "opens").length,
    missingManifestFiles: inventory.filter((item) => item.fileOpenStatus === "missing").length,
    uniqueVideoFiles: uniqueHashes.size,
    exactDuplicateFiles: inventory.filter((item) => item.exactDuplicate).length,
    likelyDuplicateFiles: inventory.filter((item) => item.likelyDuplicateOf).length,
    totalUniqueDurationSeconds: roundSeconds(inventory
      .filter((item) => item.sha256 && !item.exactDuplicate && Number.isFinite(item.durationSeconds))
      .reduce((sum, item) => sum + item.durationSeconds, 0)),
    productionQualityCatalogImageryFiles: inventory.filter((item) => item.suitability.productionQualityCatalogImagery === true).length
  };
}

function conditionAssessmentFor({ row, existing, duplicateOf, media }) {
  if (!media.opensSuccessfully) return "damaged_or_unreadable";
  if (duplicateOf) return "exact_duplicate_reference_only";
  if (existing?.acceptanceStatus === "partially_accepted_research_candidate") return "partially_accepted_research_evidence";
  if (row?.notes?.toLowerCase().includes("overlap")) return "complete_with_intentional_overlap";
  return "appears_complete_for_manifest_scope";
}

function acceptanceStatusFor(row, media) {
  if (!media.opensSuccessfully) return "unreadable";
  if (!row) return "unmapped_requires_review";
  return "accepted_research_candidate";
}

function findDurationMatch(discoveredReports, row, claimedFilenames) {
  if (!Number.isFinite(row.durationSeconds)) return null;
  return discoveredReports.find((report) => {
    if (claimedFilenames.has(report.originalFilename)) return false;
    if (!Number.isFinite(report.media.durationSeconds)) return false;
    return Math.abs(report.media.durationSeconds - row.durationSeconds) <= 0.05;
  }) ?? null;
}

function mapExistingInventoryByManifestOriginal(existingInventory) {
  const entries = Array.isArray(existingInventory?.inventory) ? existingInventory.inventory : [];
  return new Map(entries.filter((entry) => entry.manifestOriginalFilename).map((entry) => [entry.manifestOriginalFilename, entry]));
}

function findExistingByDiscoveredFilename(existingInventory, filename) {
  const entries = Array.isArray(existingInventory?.inventory) ? existingInventory.inventory : [];
  return entries.find((entry) => entry.discoveredFilename === filename) ?? null;
}

function discoverSourceVideoFiles(sourceRoot, includeExtensions, manifestRows = []) {
  if (!fs.existsSync(sourceRoot)) return [];
  const extensionlessManifestNames = new Set(manifestRows
    .map((row) => row.originalFilename)
    .filter((filename) => filename && path.extname(filename) === ""));
  return fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(sourceRoot, entry.name))
    .filter((filePath) => {
      if (path.basename(filePath) === defaultManifestName) return false;
      const extension = path.extname(filePath).toLowerCase();
      return includeExtensions.has(extension) || (extension === "" && extensionlessManifestNames.has(path.basename(filePath)));
    })
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

function parseManifestRows(csvText) {
  if (!csvText.trim()) return [];
  const [headerLine, ...lines] = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.filter((line) => line.trim()).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      sequence: Number.parseInt(row.sequence, 10),
      newFilename: row.new_filename,
      originalFilename: row.original_filename,
      identifiedContent: row.identified_content,
      durationSeconds: Number.parseFloat(row.duration_seconds),
      notes: row.notes
    };
  });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function writeOutputFiles(report, { root, outputJson, outputCsv, outputMarkdown }) {
  writeText(path.resolve(root, outputJson), `${JSON.stringify(report, null, 2)}\n`);
  writeText(path.resolve(root, outputCsv), toCsv(report.inventory));
  writeText(path.resolve(root, outputMarkdown), toMarkdown(report));
}

function toCsv(inventory) {
  const headers = [
    "inventory_id",
    "manifest_sequence",
    "original_filename",
    "discovered_filename",
    "canonical_filename",
    "portable_relative_evidence_path",
    "sha256",
    "file_size_bytes",
    "media_container",
    "video_codec",
    "audio_codec",
    "duration_seconds",
    "width",
    "height",
    "frame_rate",
    "file_open_status",
    "manifest_match_status",
    "exact_duplicate",
    "exact_duplicate_of",
    "likely_duplicate_of",
    "expected_content",
    "observed_content",
    "condition_assessment",
    "menu_evidence",
    "count_evidence",
    "ordering_evidence",
    "visual_comparison",
    "production_quality_catalog_imagery",
    "production_use_status"
  ];
  const rows = inventory.map((item) => [
    item.inventoryId,
    item.manifestSequence ?? "",
    item.originalFilename ?? "",
    item.discoveredFilename ?? "",
    item.canonicalFilename ?? "",
    item.sourceLocation.portableRelativeEvidencePath ?? "",
    item.sha256 ?? "",
    item.fileSizeBytes ?? "",
    item.mediaContainer ?? "",
    item.videoCodec ?? "",
    item.audioCodec ?? "",
    item.durationSeconds ?? "",
    item.dimensions?.width ?? "",
    item.dimensions?.height ?? "",
    item.frameRate ?? "",
    item.fileOpenStatus,
    item.manifestMatch.status,
    item.exactDuplicate,
    item.exactDuplicateOf ?? "",
    item.likelyDuplicateOf ?? "",
    item.expectedContent,
    item.observedContent,
    item.conditionAssessment,
    item.suitability.menuEvidence,
    item.suitability.countEvidence,
    item.suitability.orderingEvidence,
    item.suitability.visualComparison,
    item.suitability.productionQualityCatalogImagery,
    item.productionUseStatus
  ]);
  return `${[headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function toMarkdown(report) {
  const lines = [
    "# Video Source Inventory",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This inventory is source-evidence metadata only. It does not create catalog conclusions, production records, or user-facing recommendations. Original videos remain unchanged.",
    "",
    "## Summary",
    "",
    `- Manifest rows: ${report.summary.manifestRows}`,
    `- Inventory rows: ${report.summary.inventoryRows}`,
    `- Files found: ${report.summary.filesFound}`,
    `- Files that open successfully: ${report.summary.filesOpenSuccessfully}`,
    `- Missing manifest files: ${report.summary.missingManifestFiles}`,
    `- Unique video files: ${report.summary.uniqueVideoFiles}`,
    `- Exact duplicate files: ${report.summary.exactDuplicateFiles}`,
    `- Likely duplicate files: ${report.summary.likelyDuplicateFiles}`,
    `- Unique duration: ${report.summary.totalUniqueDurationSeconds} seconds`,
    `- Production-quality catalog imagery files: ${report.summary.productionQualityCatalogImageryFiles}`,
    "",
    "## Inventory",
    "",
    "| ID | Canonical filename | Source filename | Opens | Duration | Dimensions | SHA-256 | Duplicate | Suitability | Condition |",
    "| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |"
  ];
  for (const item of report.inventory) {
    const dimensions = item.dimensions ? `${item.dimensions.width}x${item.dimensions.height}` : "";
    const suitability = [
      item.suitability.menuEvidence ? "menu" : null,
      item.suitability.countEvidence ? "count" : null,
      item.suitability.orderingEvidence ? "order" : null,
      item.suitability.visualComparison ? `visual:${item.suitability.visualComparison}` : null,
      item.suitability.productionQualityCatalogImagery ? "production imagery" : null
    ].filter(Boolean).join("; ") || "not usable";
    lines.push(`| ${item.inventoryId} | \`${item.canonicalFilename ?? ""}\` | \`${item.discoveredFilename ?? item.originalFilename ?? ""}\` | ${item.fileOpenStatus} | ${item.durationSeconds ?? ""} | ${dimensions} | \`${item.sha256 ? item.sha256.slice(0, 12) : ""}\` | ${item.exactDuplicate ? `yes, ${item.exactDuplicateOf}` : "no"} | ${suitability} | ${item.conditionAssessment} |`);
  }
  lines.push(
    "",
    "## Production Use",
    "",
    "Every row is `NOT_PRODUCTION_DATA`. No row is suitable for production-quality catalog imagery yet, and no row enables production recommendations.",
    "",
    "## Source Location Policy",
    "",
    `Portable evidence paths use the \`${report.sourceRoot.token}\` token. Absolute discovery paths are retained in JSON for local custody/audit only and must not be treated as portable production evidence.`
  );
  return `${lines.join("\n")}\n`;
}

function normalizeContainer(value) {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("mp4") || lower.includes("m4a") || lower.includes("3gp")) return "MP4";
  if (lower.includes("mov") || lower.includes("quicktime")) return "QuickTime/MOV";
  if (lower.includes("matroska") || lower.includes("webm")) return "WebM";
  return value;
}

function containerForPath(filePath, parsedContainer) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".mov") return "QuickTime/MOV";
  if (extension === ".mp4" || extension === ".m4v") return "MP4";
  if (extension === ".webm") return "WebM";
  return parsedContainer;
}

function sourcePath(sourceRoot, token, filePath) {
  return `${token}/${normalizeRelativePath(path.relative(sourceRoot, filePath))}`;
}

function expandHome(value) {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function normalizeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function roundSeconds(value) {
  return Math.round(value * 1000) / 1000;
}

export function sha256FileStream(filePath, { highWaterMark = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath, { highWaterMark });
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/cf27-video-source-inventory.mjs [--source-root <dir>] [--manifest <csv>] [--json <path>] [--csv <path>] [--markdown <path>]",
    "",
    "Creates the authoritative Phase 0 source-video inventory without modifying master evidence files.",
    "Defaults:",
    `  source root: ~/Downloads`,
    `  manifest: ~/Downloads/${defaultManifestName}`,
    `  JSON: ${defaultOutputJson}`,
    `  CSV: ${defaultOutputCsv}`,
    `  Markdown: ${defaultOutputMarkdown}`
  ].join("\n"));
}

function parseCliArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--source-root") {
      options.sourceRoot = argv[++index];
    } else if (arg === "--manifest") {
      options.manifestPath = argv[++index];
    } else if (arg === "--json") {
      options.outputJson = argv[++index];
    } else if (arg === "--csv") {
      options.outputCsv = argv[++index];
    } else if (arg === "--markdown") {
      options.outputMarkdown = argv[++index];
    } else if (arg === "--generated-at") {
      options.generatedAt = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const report = await createVideoSourceInventory(options);
    console.log(`Video source inventory generated: ${report.summary.inventoryRows} rows, ${report.summary.uniqueVideoFiles} unique videos, ${report.summary.exactDuplicateFiles} exact duplicates.`);
    if (report.summary.missingManifestFiles > 0) {
      console.error(`Warning: ${report.summary.missingManifestFiles} manifest rows are missing source files.`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
