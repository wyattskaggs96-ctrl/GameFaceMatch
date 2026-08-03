#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const CF27_FRAME_REEXTRACTIONS_SCHEMA_VERSION = "cf27-frame-reextractions-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-02T23:20:00-04:00";
const ffmpegPath = "/Applications/Plaud.app/Contents/Resources/ffmpeg";

const outputJsonPath = "data/phase-zero/cf27_frame_reextractions.json";
const outputCsvPath = "data/phase-zero/cf27_frame_reextractions.csv";
const evidenceManifestPath = "data/phase-zero/evidence_manifest.json";
const outputDirectory = "data/phase-zero/derivative-frames/frame-reextractions";

const frameSpecs = [
  {
    requirementID: "REQ-VIEWS-eye-color",
    category: "Eye color",
    sourceVideoID: "phase0-video-007",
    sourceTimestamp: 13,
    sourceTimelineRecordID: "phase0-video-007-tl-003",
    selectedValueContext: "Eye Color 01",
    sourceEvidenceID: "phase0-frame-video-007-tl-003"
  },
  {
    requirementID: "REQ-VIEWS-eye-shape",
    category: "Eye shape",
    sourceVideoID: "phase0-video-006",
    sourceTimestamp: 14,
    sourceTimelineRecordID: "phase0-video-006-tl-002",
    selectedValueContext: "Eye Shape 01",
    sourceEvidenceID: "phase0-frame-video-006-tl-002"
  },
  {
    requirementID: "REQ-VIEWS-facial-hair-colors",
    category: "Facial-hair colors",
    sourceVideoID: "CF27_XBOX_SOURCE_2026_08_02_002",
    sourceTimestamp: 225.5,
    sourceTimelineRecordID: "CF27_XBOX_SOURCE_2026_08_02_002-tl-005",
    selectedValueContext: "Facial Hair Color Purple",
    sourceEvidenceID: "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_002-tl-005"
  },
  {
    requirementID: "REQ-VIEWS-hair-colors",
    category: "Hair colors",
    sourceVideoID: "CF27_XBOX_SOURCE_2026_08_02_002",
    sourceTimestamp: 100.5,
    sourceTimelineRecordID: "CF27_XBOX_SOURCE_2026_08_02_002-tl-003",
    selectedValueContext: "Hair Color Light Brown",
    sourceEvidenceID: "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_002-tl-003"
  },
  {
    requirementID: "REQ-VIEWS-mouth-shape",
    category: "Mouth shape",
    sourceVideoID: "CF27_XBOX_SOURCE_2026_08_02_001",
    sourceTimestamp: 215.5,
    sourceTimelineRecordID: "CF27_XBOX_SOURCE_2026_08_02_001-tl-009",
    selectedValueContext: "Mouth Shape Heavy",
    sourceEvidenceID: "phase0-frame-CF27_XBOX_SOURCE_2026_08_02_001-tl-009"
  },
  {
    requirementID: "REQ-VIEWS-skin-details",
    category: "Skin details",
    sourceVideoID: "phase0-video-005",
    sourceTimestamp: 8,
    sourceTimelineRecordID: "phase0-video-005-tl-002",
    selectedValueContext: "Skin Details 01",
    sourceEvidenceID: "phase0-frame-video-005-tl-002"
  },
  {
    requirementID: "REQ-VIEWS-skin-tone",
    category: "Skin tone",
    sourceVideoID: "phase0-video-004",
    sourceTimestamp: 45.5,
    sourceTimelineRecordID: "phase0-video-004-tl-019",
    selectedValueContext: "Skin Tone 01",
    sourceEvidenceID: "phase0-frame-video-004-tl-019"
  }
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes("--check");
  const built = buildFrameReextractions({ root: repositoryRoot, writeFrames: !checkOnly });
  if (checkOnly) {
    checkFrameReextractions(built, { root: repositoryRoot });
    console.log(`CF27 frame re-extractions are current (${built.manifest.summary.totalFrameReextractions} frames).`);
  } else {
    writeFrameReextractions(built, { root: repositoryRoot });
    console.log(`Wrote CF27 frame re-extractions (${built.manifest.summary.totalFrameReextractions} frames).`);
  }
}

export function buildFrameReextractions({ root = repositoryRoot, writeFrames = false } = {}) {
  const normalizedRoot = path.resolve(root);
  const inventory = readJson(normalizedRoot, "data/phase-zero/video_inventory.json");
  const evidenceManifest = readJson(normalizedRoot, evidenceManifestPath);
  const evidenceByID = new Map((evidenceManifest.entries ?? []).map((entry) => [entry.evidence_id ?? entry.evidenceID ?? entry.stableEvidenceID, entry]));
  const sourceByVideoID = buildSourcePathMap(normalizedRoot, inventory.inventory ?? []);
  const rows = [];

  for (const spec of frameSpecs) {
    const source = sourceByVideoID.get(spec.sourceVideoID);
    if (!source?.absolutePath || !fs.existsSync(source.absolutePath)) {
      throw new Error(`Cannot re-extract ${spec.requirementID}; source master is unavailable for ${spec.sourceVideoID}.`);
    }
    if (!fs.existsSync(ffmpegPath)) {
      throw new Error(`Cannot re-extract ${spec.requirementID}; ffmpeg is unavailable at ${ffmpegPath}.`);
    }

    const outputFileName = `${spec.requirementID.replaceAll(/[^A-Za-z0-9]+/g, "_")}_${spec.category.replaceAll(/[^A-Za-z0-9]+/g, "_")}_FRONT_${String(spec.sourceTimestamp).replace(".", "p")}s.png`;
    const relativePath = `${outputDirectory}/${outputFileName}`;
    const absoluteOutputPath = path.join(normalizedRoot, relativePath);
    if (writeFrames || !fs.existsSync(absoluteOutputPath)) {
      extractFrame({ sourcePath: source.absolutePath, timestamp: spec.sourceTimestamp, outputPath: absoluteOutputPath });
    }
    if (!fs.existsSync(absoluteOutputPath)) {
      throw new Error(`Frame extraction output missing for ${spec.requirementID}: ${relativePath}`);
    }

    const sourceEvidence = evidenceByID.get(spec.sourceEvidenceID);
    const evidenceID = `phase0-frame-reextract-${spec.requirementID.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "")}-front`;
    const stats = fs.statSync(absoluteOutputPath);
    rows.push({
      frameReextractionID: `CF27-FRAME-REEXTRACT-${String(rows.length + 1).padStart(3, "0")}`,
      requirementID: spec.requirementID,
      evidenceID,
      category: spec.category,
      view: "FRONT",
      sourceVideoID: spec.sourceVideoID,
      sourceVideoFilename: source.originalFilename,
      sourceVideoRelativePath: source.portableRelativePath,
      sourceVideoSha256: source.sha256,
      sourceTimestamp: spec.sourceTimestamp,
      sourceTimelineRecordID: spec.sourceTimelineRecordID,
      sourceEvidenceID: spec.sourceEvidenceID,
      sourceEvidencePath: sourceEvidence?.relative_path ?? sourceEvidence?.relativePath ?? "",
      relativePath,
      sha256: sha256File(absoluteOutputPath),
      sizeBytes: stats.size,
      mimeType: "image/png",
      selectedValueContext: spec.selectedValueContext,
      extractionStatus: "EXTRACTED_FROM_SOURCE_MASTER",
      classificationAfterExtraction: "SECOND_VERIFIER_CONFIRMATION_REQUIRED",
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "OBSERVED_PENDING_VERIFICATION",
      notes: "Front-view recovery frame extracted from the source master to resolve the Prompt 094 frame-reextraction-only gap. It does not promote the candidate or replace second-human verification."
    });
  }

  const manifest = {
    schemaVersion: CF27_FRAME_REEXTRACTIONS_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "CF27_FRAME_REEXTRACTIONS",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    sourceArtifact: "data/phase-zero/cf27_existing_media_verification_gap_audit.json",
    policy: {
      sourceMastersUntouched: true,
      noProductionPromotion: true,
      noSecondVerificationClaim: true,
      outputFramesAreDerivatives: true
    },
    summary: {
      totalFrameReextractions: rows.length,
      categories: [...new Set(rows.map((row) => row.category))].sort(),
      requirementsResolvedForAudit: rows.map((row) => row.requirementID)
    },
    rows
  };

  const csv = toCsv(rows.map((row) => ({
    frame_reextraction_id: row.frameReextractionID,
    requirement_id: row.requirementID,
    evidence_id: row.evidenceID,
    category: row.category,
    view: row.view,
    source_video_id: row.sourceVideoID,
    source_video_filename: row.sourceVideoFilename,
    source_timestamp: row.sourceTimestamp,
    source_timeline_record_id: row.sourceTimelineRecordID,
    source_evidence_id: row.sourceEvidenceID,
    relative_path: row.relativePath,
    sha256: row.sha256,
    size_bytes: row.sizeBytes,
    selected_value_context: row.selectedValueContext,
    classification_after_extraction: row.classificationAfterExtraction,
    production_status: row.productionStatus,
    verification_status: row.verificationStatus
  })));
  const updatedEvidenceManifest = mergeEvidenceManifest(evidenceManifest, rows);
  return {
    manifest,
    csv,
    evidenceManifest: updatedEvidenceManifest,
    files: {
      json: `${JSON.stringify(manifest, null, 2)}\n`,
      csv,
      evidenceManifest: `${JSON.stringify(updatedEvidenceManifest, null, 2)}\n`
    }
  };
}

export function writeFrameReextractions(built, { root = repositoryRoot } = {}) {
  writeText(root, outputJsonPath, built.files.json);
  writeText(root, outputCsvPath, built.files.csv);
  writeText(root, evidenceManifestPath, built.files.evidenceManifest);
}

export function checkFrameReextractions(built, { root = repositoryRoot } = {}) {
  assertCurrent(root, outputJsonPath, built.files.json);
  assertCurrent(root, outputCsvPath, built.files.csv);
  assertCurrent(root, evidenceManifestPath, built.files.evidenceManifest);
}

function buildSourcePathMap(root, inventoryRows) {
  const rows = new Map();
  for (const row of inventoryRows) {
    rows.set(row.inventoryId, {
      absolutePath: row.sourceLocation?.absoluteDiscoveryPathInternal,
      portableRelativePath: row.sourceLocation?.portableRelativeEvidencePath,
      originalFilename: row.originalFilename,
      canonicalFilename: row.canonicalFilename,
      sha256: row.sha256
    });
  }
  rows.set("CF27_XBOX_SOURCE_2026_08_02_001", {
    absolutePath: path.join(root, "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4"),
    portableRelativePath: "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4",
    originalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4",
    canonicalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4",
    sha256: "bdd75f0ce953aaf9fda0cb187658b9314ae7f6c21f5ab30d7e474549841037d5"
  });
  rows.set("CF27_XBOX_SOURCE_2026_08_02_002", {
    absolutePath: path.join(root, "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4"),
    portableRelativePath: "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4",
    originalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4",
    canonicalFilename: "EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4",
    sha256: "60f68a5c1af4f96f9f18c453440a7f8d6296aa661068b0092f3e41827e553d50"
  });
  return rows;
}

function extractFrame({ sourcePath, timestamp, outputPath }) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const result = spawnSync(ffmpegPath, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(timestamp),
    "-i",
    sourcePath,
    "-frames:v",
    "1",
    "-y",
    outputPath
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg frame extraction failed for ${sourcePath} @ ${timestamp}s: ${(result.stderr || result.stdout || "").trim()}`);
  }
}

function mergeEvidenceManifest(evidenceManifest, rows) {
  const retained = (evidenceManifest.entries ?? []).filter((entry) => {
    const id = entry.evidence_id ?? entry.evidenceID ?? entry.stableEvidenceID;
    return !rows.some((row) => row.evidenceID === id);
  });
  const additions = rows.map((row) => ({
    evidence_id: row.evidenceID,
    timeline_record_id: row.sourceTimelineRecordID,
    video_id: row.sourceVideoID,
    relative_path: row.relativePath,
    master_or_derivative: "derivative",
    file_role: "phase_zero_frame_reextraction_front_view",
    sha256: row.sha256,
    size_bytes: row.sizeBytes,
    mime_type: row.mimeType,
    source_video: sourceVideoCanonicalFilename(row.sourceVideoID, row.sourceVideoFilename),
    timestamp: row.sourceTimestamp,
    view: "FRONT",
    verification_state: row.verificationStatus,
    notes: row.notes
  }));
  const entries = [...retained, ...additions].sort((a, b) => String(a.evidence_id ?? "").localeCompare(String(b.evidence_id ?? "")));
  return {
    ...evidenceManifest,
    generatedAt: generatedAt,
    summary: {
      ...(evidenceManifest.summary ?? {}),
      entries: entries.length,
      sourceMasters: entries.filter((entry) => entry.master_or_derivative === "master").length,
      derivatives: entries.filter((entry) => entry.master_or_derivative === "derivative").length,
      frameReextractions: additions.length
    },
    entries
  };
}

function sourceVideoCanonicalFilename(sourceVideoID, fallback) {
  const canonical = {
    "phase0-video-004": "04_Skin_Tone.mp4",
    "phase0-video-005": "05_Skin_Details.mp4",
    "phase0-video-006": "06_Eye_Shape.mp4",
    "phase0-video-007": "07_Eye_Color.mp4"
  };
  return canonical[sourceVideoID] ?? fallback;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeText(root, relativePath, value) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value);
}

function assertCurrent(root, relativePath, expected) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`${relativePath} is missing. Run npm run cf27:frame-reextractions.`);
  const actual = fs.readFileSync(absolutePath, "utf8");
  if (actual !== expected) throw new Error(`${relativePath} is stale. Run npm run cf27:frame-reextractions.`);
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")).join("\n")}\n`;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}
