#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_CURRENT_EVIDENCE_MANIFEST_SCHEMA_VERSION = "cf27-current-evidence-manifest-v1";

export const defaultOutputDirectory = "data/research/cf27/manifests/current-evidence";
export const defaultJsonOutputPath = `${defaultOutputDirectory}/current_evidence_manifest.json`;
export const defaultCsvOutputPath = `${defaultOutputDirectory}/current_evidence_manifest.csv`;
export const defaultReportOutputPath = "docs/catalog/CURRENT_EVIDENCE_MANIFEST.md";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const videoCategoryByID = new Map([
  ["video-002", "Head Template"],
  ["video-003", "Head Template"],
  ["video-004", "Skin Tone"],
  ["video-005", "Skin Details"],
  ["video-006", "Eye Shape"],
  ["video-007", "Eye Color"],
  ["video-008", "Nose"],
  ["video-009", "Ear Shape"],
  ["video-010", "Skin Tone"],
  ["video-011", "Skin Details"]
]);

const categoryBySourcePackageSegment = [
  ["head-template", "Head Template"],
  ["skin-tone", "Skin Tone"],
  ["skin-details", "Skin Details"],
  ["eye-shape", "Eye Shape"],
  ["eye-color", "Eye Color"],
  ["nose", "Nose"],
  ["ear-shape", "Ear Shape"]
];

const manifestCsvColumns = [
  "evidenceID",
  "relativePath",
  "masterOrDerivative",
  "fileRole",
  "sha256",
  "sizeBytes",
  "mimeType",
  "sourceVideo",
  "timestamp",
  "environmentCandidate",
  "menuID",
  "catalogID",
  "view",
  "captureDate",
  "researcher",
  "verificationState",
  "supersessionState",
  "validationState",
  "notes"
];

export function generateCurrentEvidenceManifest({
  root = repositoryRoot,
  generatedAt = null
} = {}) {
  const normalizedRoot = path.resolve(root);
  const inventory = readJSON(path.resolve(normalizedRoot, "data/research/cf27/video_inventory.json"));
  const videos = inventory.inventory ?? [];
  const menuIDByLabel = loadMenuIDByLabel(normalizedRoot);
  const videosByID = new Map(videos.map((video) => [video.inventoryId, video]));
  const validationIssues = [];
  const entries = [];

  for (const video of videos) {
    entries.push(createSourceVideoEntry(video, menuIDByLabel));
  }

  for (const manifestPath of listEvidenceFrameManifestPaths(normalizedRoot)) {
    const frameManifest = readJSON(path.resolve(normalizedRoot, manifestPath));
    const sourcePackage = readOptionalJSON(normalizedRoot, frameManifest.sourcePackage);
    const category = inferCategory(frameManifest, sourcePackage, manifestPath);
    const menuID = menuIDByLabel.get(category) ?? sourcePackage?.scope?.menuID ?? sourcePackage?.context?.menuItemID ?? null;
    const environmentCandidate = sourcePackage?.environmentID ?? sourcePackage?.context?.environmentID ?? "env-cf27-research-video-001-rtg-path";

    for (const frame of frameManifest.frames ?? []) {
      entries.push(createDerivativeFrameEntry({
        frame,
        frameManifest,
        sourceVideo: videosByID.get(frame.sourceVideoID),
        menuID,
        environmentCandidate,
        category
      }));
    }
  }

  entries.sort((a, b) => a.evidenceID.localeCompare(b.evidenceID));
  validateEntries(entries, normalizedRoot, validationIssues);
  const duplicateEvidenceIDs = findDuplicates(entries.map((entry) => entry.evidenceID));
  for (const evidenceID of duplicateEvidenceIDs) {
    validationIssues.push({
      code: "duplicateEvidenceID",
      severity: "error",
      message: `Duplicate evidence ID generated: ${evidenceID}`
    });
  }

  const sourceVideoEntries = entries.filter((entry) => entry.masterOrDerivative === "master");
  const derivativeEntries = entries.filter((entry) => entry.masterOrDerivative === "derivative");
  const invalidEntries = entries.filter((entry) => entry.validationState !== "valid");
  const sourceVideoIDs = new Set(sourceVideoEntries.map((entry) => entry.sourceVideo).filter(Boolean));

  return {
    schemaVersion: CF27_CURRENT_EVIDENCE_MANIFEST_SCHEMA_VERSION,
    generatedAt: generatedAt ?? inventory.generatedAt ?? new Date().toISOString(),
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_EVIDENCE_MANIFEST",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    uploadPolicy: "local-only; no external upload performed",
    pathPolicy: {
      portableRelativePathsRequired: true,
      absoluteDiscoveryPathsExcludedFromEntries: true,
      sourceMasterReferenceRoot: "OWNER_DOWNLOADS",
      generatedDerivativeRoot: "data/research/cf27/generated",
      note: "Source video masters are referenced by portable OWNER_DOWNLOADS paths and are not copied into the repository."
    },
    sourceInventory: {
      path: "data/research/cf27/video_inventory.json",
      generatedAt: inventory.generatedAt,
      sourceManifest: inventory.sourceManifest ?? null
    },
    summary: {
      totalEntries: entries.length,
      sourceVideoMasters: sourceVideoEntries.length,
      derivativeFrames: derivativeEntries.length,
      uniqueSourceVideosReferenced: sourceVideoIDs.size,
      exactDuplicateSourceReferences: sourceVideoEntries.filter((entry) => entry.supersessionState.startsWith("DUPLICATE_OF_")).length,
      invalidEntries: invalidEntries.length,
      validationIssueCount: validationIssues.length
    },
    validation: {
      status: validationIssues.some((issue) => issue.severity === "error") ? "failed" : "passed",
      issues: validationIssues
    },
    entries
  };
}

export function writeCurrentEvidenceManifest(manifest, {
  root = repositoryRoot,
  jsonOutputPath = defaultJsonOutputPath,
  csvOutputPath = defaultCsvOutputPath,
  reportOutputPath = defaultReportOutputPath
} = {}) {
  writeTextFile(root, jsonOutputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeTextFile(root, csvOutputPath, formatCurrentEvidenceManifestCSV(manifest));
  writeTextFile(root, reportOutputPath, formatCurrentEvidenceManifestReport(manifest));
}

export function formatCurrentEvidenceManifestCSV(manifest) {
  const rows = [manifestCsvColumns.join(",")];
  for (const entry of manifest.entries) {
    rows.push(manifestCsvColumns.map((column) => csvEscape(entry[column] ?? "")).join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function formatCurrentEvidenceManifestReport(manifest) {
  const lines = [
    "# Current CF27 Evidence Manifest",
    "",
    "This manifest is research evidence only. It is not production catalog data and does not enable user-facing College Football 27 recommendations.",
    "",
    "## Summary",
    "",
    `- Generated at: ${manifest.generatedAt}`,
    `- Total entries: ${manifest.summary.totalEntries}`,
    `- Source video masters: ${manifest.summary.sourceVideoMasters}`,
    `- Extracted derivative frames: ${manifest.summary.derivativeFrames}`,
    `- Unique source videos referenced: ${manifest.summary.uniqueSourceVideosReferenced}`,
    `- Exact duplicate source references preserved: ${manifest.summary.exactDuplicateSourceReferences}`,
    `- Validation status: ${manifest.validation.status}`,
    "",
    "## Outputs",
    "",
    `- JSON: \`${defaultJsonOutputPath}\``,
    `- CSV: \`${defaultCsvOutputPath}\``,
    "",
    "## Path Policy",
    "",
    "- Source masters are referenced by portable `OWNER_DOWNLOADS/...` paths.",
    "- Local absolute discovery paths are intentionally excluded from evidence entries.",
    "- Generated PNG frame derivatives remain local generated artifacts and are not production assets.",
    "- Every entry is marked `PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED` unless a later second-human verification workflow changes that state.",
    "",
    "## Validation",
    ""
  ];

  if (manifest.validation.issues.length === 0) {
    lines.push("- No path or manifest validation issues were found.");
  } else {
    for (const issue of manifest.validation.issues) {
      lines.push(`- ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function validatePortableRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.trim() === "") return false;
  if (path.isAbsolute(relativePath)) return false;
  if (/^[a-zA-Z]:[\\/]/.test(relativePath)) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(relativePath)) return false;
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized !== relativePath) return false;
  if (normalized.split("/").some((segment) => segment === ".." || segment === "")) return false;
  if (normalized.includes("\0")) return false;
  return true;
}

function createSourceVideoEntry(video, menuIDByLabel) {
  const category = videoCategoryByID.get(video.inventoryId) ?? null;
  const isDuplicate = Boolean(video.exactDuplicate && video.duplicateOfInventoryId);
  const notes = [
    video.identifiedContent,
    video.reviewNotes,
    isDuplicate ? `Exact duplicate source reference of ${video.duplicateOfInventoryId}; preserved for provenance.` : "",
    video.inventoryId === "video-001" ? "Spans environment and creation-path evidence rather than one catalog item." : ""
  ].filter(Boolean).join(" ");

  return {
    evidenceID: `evidence-${video.inventoryId}-source-master`,
    relativePath: video.portableRelativeEvidencePath,
    masterOrDerivative: "master",
    fileRole: "sourceVideoMaster",
    sha256: video.sha256,
    sizeBytes: video.fileSizeBytes,
    mimeType: mimeTypeForPath(video.portableRelativeEvidencePath, video.container),
    sourceVideo: video.inventoryId,
    timestamp: null,
    environmentCandidate: "env-cf27-research-video-001-rtg-path",
    menuID: category ? menuIDByLabel.get(category) ?? null : null,
    catalogID: null,
    view: "SOURCE_VIDEO",
    captureDate: video.creationMetadata?.creationTimeUtc ?? null,
    researcher: "UNKNOWN_RESEARCHER",
    verificationState: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    supersessionState: isDuplicate ? `DUPLICATE_OF_${video.duplicateOfInventoryId}` : "CURRENT",
    validationState: "valid",
    notes,
    pathReferenceType: "portableExternalSourceReference",
    sourceWorkingFilename: video.workingFilename,
    duplicateOfInventoryId: video.duplicateOfInventoryId ?? null,
    acceptanceStatus: video.acceptanceStatus ?? null
  };
}

function createDerivativeFrameEntry({ frame, frameManifest, sourceVideo, menuID, environmentCandidate, category }) {
  const view = normalizeView(frame.view ?? frame.role ?? "UNKNOWN");
  const notes = [
    frame.selectionNotes,
    frame.angleLabelStatus ? `Angle label status: ${frame.angleLabelStatus}.` : "",
    category ? `Category: ${category}.` : ""
  ].filter(Boolean).join(" ");

  return {
    evidenceID: `evidence-${frame.frameID}`,
    relativePath: frame.outputRelativePath,
    masterOrDerivative: "derivative",
    fileRole: fileRoleForFrame(frame),
    sha256: frame.outputSha256,
    sizeBytes: frame.outputSizeBytes,
    mimeType: mimeTypeForPath(frame.outputRelativePath, frame.outputFormat),
    sourceVideo: frame.sourceVideoID,
    timestamp: frame.sourceTimestampSeconds,
    environmentCandidate,
    menuID,
    catalogID: frame.stableInternalID ?? null,
    view,
    captureDate: sourceVideo?.creationMetadata?.creationTimeUtc ?? null,
    researcher: "UNKNOWN_RESEARCHER",
    verificationState: frameManifest.verificationStatus ?? "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    supersessionState: "CURRENT",
    validationState: "valid",
    notes,
    pathReferenceType: "repositoryGeneratedDerivative",
    sourceVideoPath: frame.portableRelativeEvidencePath,
    sourceVideoSha256: frame.sourceVideoSha256,
    derivativeGeneratedAt: frameManifest.generatedAt ?? null,
    width: frame.width ?? null,
    height: frame.height ?? null,
    appearanceAltered: frame.appearanceAltered ?? false
  };
}

function validateEntries(entries, root, validationIssues) {
  const sourceMasterPaths = new Set();
  for (const entry of entries) {
    const entryIssues = [];
    if (!validatePortableRelativePath(entry.relativePath)) entryIssues.push("unsafe or non-portable relative path");
    if (String(entry.relativePath).includes("absoluteDiscoveryPathInternal")) entryIssues.push("absolute discovery path leaked into relative path");
    if (entry.masterOrDerivative === "derivative") {
      const absoluteDerivativePath = path.resolve(root, entry.relativePath);
      const expectedRoot = path.resolve(root, "data/research/cf27/generated");
      if (!absoluteDerivativePath.startsWith(`${expectedRoot}${path.sep}`)) entryIssues.push("derivative path escapes generated research directory");
      if (!fs.existsSync(absoluteDerivativePath)) entryIssues.push("derivative file is missing locally");
    }
    if (entry.masterOrDerivative === "master") {
      sourceMasterPaths.add(entry.relativePath);
      if (!entry.relativePath.startsWith("OWNER_DOWNLOADS/")) entryIssues.push("source master reference does not use OWNER_DOWNLOADS");
    }
    if (entryIssues.length > 0) {
      entry.validationState = "invalid";
      for (const issue of entryIssues) {
        validationIssues.push({
          code: "invalidEvidenceEntry",
          severity: "error",
          evidenceID: entry.evidenceID,
          message: `${entry.evidenceID}: ${issue}`
        });
      }
    }
  }

  for (const entry of entries) {
    if (entry.masterOrDerivative !== "derivative") continue;
    if (entry.sourceVideoPath && !sourceMasterPaths.has(entry.sourceVideoPath)) {
      validationIssues.push({
        code: "unmatchedSourceVideoReference",
        severity: "warning",
        evidenceID: entry.evidenceID,
        message: `${entry.evidenceID}: source video path is not represented by a source master manifest entry`
      });
    }
  }
}

function loadMenuIDByLabel(root) {
  const hierarchyPath = path.resolve(root, "data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/appearance_menu_hierarchy.json");
  const menuIDByLabel = new Map();
  if (!fs.existsSync(hierarchyPath)) return menuIDByLabel;
  const hierarchy = readJSON(hierarchyPath);
  for (const record of hierarchy.records ?? []) {
    if (record.displayLabel && record.stableMenuID) menuIDByLabel.set(record.displayLabel, record.stableMenuID);
    if (record.nativeLabel && record.stableMenuID) menuIDByLabel.set(record.nativeLabel, record.stableMenuID);
  }
  return menuIDByLabel;
}

function listEvidenceFrameManifestPaths(root) {
  const manifestsRoot = path.resolve(root, "data/research/cf27/manifests");
  if (!fs.existsSync(manifestsRoot)) return [];
  return listFiles(manifestsRoot)
    .map((filePath) => normalizeRelativePath(path.relative(root, filePath)))
    .filter((relativePath) => relativePath.endsWith("_evidence_frame_manifest.json"))
    .sort();
}

function inferCategory(frameManifest, sourcePackage, manifestPath) {
  const packageCategory = sourcePackage?.scope?.category ?? sourcePackage?.context?.category ?? sourcePackage?.records?.[0]?.category;
  if (packageCategory) return packageCategory;
  const source = `${frameManifest.sourcePackage ?? ""} ${manifestPath}`.toLowerCase();
  for (const [needle, category] of categoryBySourcePackageSegment) {
    if (source.includes(needle)) return category;
  }
  return null;
}

function normalizeView(value) {
  const normalized = String(value ?? "UNKNOWN").trim().toUpperCase();
  if (normalized === "MENU_EVIDENCE" || normalized === "MENU_THUMBNAIL_EVIDENCE") return "MENU";
  return normalized;
}

function fileRoleForFrame(frame) {
  const role = normalizeView(frame.view ?? frame.role ?? "");
  if (role === "MENU") return "menuEvidenceFrame";
  if (role.includes("THREE_QUARTER") || role.includes("3Q") || role.includes("PROFILE") || role === "FRONT" || role === "REAR") {
    return "standardAngleDerivativeFrame";
  }
  return "catalogDerivativeFrame";
}

function mimeTypeForPath(filePath, fallback) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png") || fallback === "png") return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".mov") || String(fallback).toLowerCase().includes("quicktime") || String(fallback).toLowerCase().includes("mov")) return "video/quicktime";
  if (lower.endsWith(".mp4") || String(fallback).toLowerCase().includes("mp4")) return "video/mp4";
  return "application/octet-stream";
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readOptionalJSON(root, relativePath) {
  if (!relativePath) return null;
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return readJSON(absolutePath);
}

function listFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolutePath));
    if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function normalizeRelativePath(value) {
  return value.replaceAll(path.sep, "/");
}

function csvEscape(value) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replaceAll('"', '""')}"`;
}

function writeTextFile(root, relativePath, contents) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = generateCurrentEvidenceManifest();
  writeCurrentEvidenceManifest(manifest);
  console.log(formatCurrentEvidenceManifestReport(manifest));
  if (manifest.validation.status !== "passed") process.exitCode = 1;
}
