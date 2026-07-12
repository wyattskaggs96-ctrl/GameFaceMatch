#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EVIDENCE_MANIFEST_SCHEMA_VERSION = "phase0-evidence-manifest-v1";
export const approvedEvidenceDirectories = [
  "data/audit/college-football-27/evidence",
  "data/fixtures/test-only/evidence-manifest"
];

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredFileNames = new Set([".DS_Store"]);

const mimeTypesByExtension = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".heic", "image/heic"],
  [".heif", "image/heif"],
  [".mp4", "video/mp4"],
  [".mov", "video/quicktime"],
  [".pdf", "application/pdf"],
  [".txt", "text/plain"],
  [".json", "application/json"]
]);

export function generateEvidenceManifest({
  root = repositoryRoot,
  directories = [approvedEvidenceDirectories[0]],
  metadataByPath = {},
  previousManifest = null,
  generatedAt = new Date().toISOString()
} = {}) {
  const normalizedRoot = path.resolve(root);
  const approvedRoots = approvedEvidenceDirectories.map((directory) => normalizeRelativePath(directory));
  const normalizedDirectories = directories.map((directory) => normalizeRelativePath(directory));
  const warnings = [];
  const entries = [];

  for (const directory of normalizedDirectories) {
    if (!isApprovedEvidenceDirectory(directory, approvedRoots)) {
      warnings.push(warning("unapprovedDirectory", `Skipped unapproved evidence directory: ${directory}`));
      continue;
    }
    const absoluteDirectory = path.resolve(normalizedRoot, directory);
    if (!fs.existsSync(absoluteDirectory)) {
      warnings.push(warning("missingDirectory", `Evidence directory does not exist: ${directory}`));
      continue;
    }
    for (const absoluteFilePath of listFiles(absoluteDirectory)) {
      const relativePath = normalizeRelativePath(path.relative(normalizedRoot, absoluteFilePath));
      if (!isRelativeSafePath(relativePath)) {
        warnings.push(warning("unsafePath", `Skipped unsafe evidence path: ${relativePath}`));
        continue;
      }
      const metadata = metadataByPath[relativePath] ?? metadataByPath[normalizeRelativePath(path.relative(absoluteDirectory, absoluteFilePath))] ?? {};
      if (Object.keys(metadata).length === 0) warnings.push(warning("missingMetadata", `No metadata supplied for ${relativePath}`));
      entries.push(createManifestEntry(normalizedRoot, absoluteFilePath, relativePath, metadata));
    }
  }

  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const comparison = compareEvidenceManifests(previousManifest, { entries });

  return {
    schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
    generatedAt,
    approvedDirectories: normalizedDirectories,
    entries,
    comparison,
    warnings,
    uploadPolicy: "local-only; no external upload performed"
  };
}

export function compareEvidenceManifests(previousManifest, nextManifest) {
  if (!previousManifest) {
    return {
      changed: [],
      missing: [],
      unexpected: []
    };
  }
  const previousEntries = new Map((previousManifest?.entries ?? []).map((entry) => [entry.relativePath, entry]));
  const nextEntries = new Map((nextManifest?.entries ?? []).map((entry) => [entry.relativePath, entry]));
  const changed = [];
  const missing = [];
  const unexpected = [];

  for (const [relativePath, previous] of previousEntries) {
    const next = nextEntries.get(relativePath);
    if (!next) {
      missing.push(relativePath);
      continue;
    }
    if (previous.sha256 !== next.sha256 || previous.sizeBytes !== next.sizeBytes) changed.push(relativePath);
  }
  for (const relativePath of nextEntries.keys()) {
    if (!previousEntries.has(relativePath)) unexpected.push(relativePath);
  }

  return {
    changed,
    missing,
    unexpected
  };
}

export function readMetadataFile(filePath, root = repositoryRoot) {
  if (!filePath) return {};
  const parsed = readJSON(path.resolve(root, filePath));
  if (parsed.files && typeof parsed.files === "object") return parsed.files;
  return parsed;
}

export function writeManifest(manifest, outputPath, root = repositoryRoot) {
  const absoluteOutputPath = path.resolve(root, outputPath);
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function formatEvidenceManifestReport(manifest) {
  const lines = [
    `Evidence manifest: ${manifest.entries.length} files`,
    `Upload policy: ${manifest.uploadPolicy}`,
    `Changed: ${manifest.comparison.changed.length}`,
    `Missing: ${manifest.comparison.missing.length}`,
    `Unexpected: ${manifest.comparison.unexpected.length}`
  ];
  for (const warning of manifest.warnings) lines.push(`warning ${warning.code}: ${warning.message}`);
  for (const relativePath of manifest.comparison.changed) lines.push(`changed: ${relativePath}`);
  for (const relativePath of manifest.comparison.missing) lines.push(`missing: ${relativePath}`);
  for (const relativePath of manifest.comparison.unexpected) lines.push(`unexpected: ${relativePath}`);
  return lines.join("\n");
}

function createManifestEntry(root, absoluteFilePath, relativePath, metadata) {
  const stat = fs.statSync(absoluteFilePath);
  return {
    relativePath,
    sha256: sha256File(absoluteFilePath),
    sizeBytes: stat.size,
    mimeType: mimeTypeForPath(absoluteFilePath),
    fileRole: metadata.fileRole ?? "other",
    derivativeState: metadata.derivativeState ?? "master",
    environmentID: metadata.environmentID ?? null,
    catalogItemID: metadata.catalogItemID ?? null,
    view: metadata.view ?? "notApplicable",
    captureMetadata: {
      platformID: metadata.captureMetadata?.platformID ?? metadata.platformID ?? "unknown",
      gameVersionID: metadata.captureMetadata?.gameVersionID ?? metadata.gameVersionID ?? "unknown",
      patchID: metadata.captureMetadata?.patchID ?? metadata.patchID ?? "unknown",
      mode: metadata.captureMetadata?.mode ?? metadata.mode ?? "unknown",
      creationPathID: metadata.captureMetadata?.creationPathID ?? metadata.creationPathID ?? "unknown",
      captureMethod: metadata.captureMetadata?.captureMethod ?? metadata.captureMethod ?? "unknown",
      captureDevice: metadata.captureMetadata?.captureDevice ?? metadata.captureDevice ?? "unknown",
      capturedAt: metadata.captureMetadata?.capturedAt ?? metadata.capturedAt ?? null,
      researcherID: metadata.captureMetadata?.researcherID ?? metadata.researcherID ?? null,
      notes: metadata.captureMetadata?.notes ?? metadata.notes ?? ""
    }
  };
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (ignoredFileNames.has(entry.name)) return [];
    return entry.isDirectory() ? listFiles(absolutePath) : [absolutePath];
  });
}

function isApprovedEvidenceDirectory(directory, approvedRoots) {
  return approvedRoots.some((approvedRoot) => directory === approvedRoot || directory.startsWith(`${approvedRoot}/`));
}

function normalizeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\/+/, "").split("/").filter((part) => part && part !== ".").join("/");
}

function isRelativeSafePath(value) {
  return value.length > 0
    && !value.startsWith("/")
    && !/^[A-Za-z]:[\\/]/.test(value)
    && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    && value.split("/").every((part) => part.length > 0 && part !== ".." && !/[<>:"\\|?*\u0000-\u001f]/.test(part));
}

function mimeTypeForPath(filePath) {
  return mimeTypesByExtension.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function warning(code, message) {
  return { code, message };
}

function parseArgs(argv) {
  const args = {
    directories: [],
    metadata: "",
    previous: "",
    output: "",
    generatedAt: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--metadata") args.metadata = argv[++index] ?? "";
    else if (value === "--previous") args.previous = argv[++index] ?? "";
    else if (value === "--output") args.output = argv[++index] ?? "";
    else if (value === "--generated-at") args.generatedAt = argv[++index] ?? "";
    else if (value === "--help") args.help = true;
    else args.directories.push(value);
  }
  return args;
}

function printHelp() {
  console.log([
    "Usage: node scripts/evidence-manifest.mjs [approved-directory...] [--metadata metadata.json] [--previous manifest.json] [--output manifest.json]",
    "",
    "Scans approved local evidence directories, computes SHA-256 checksums, and writes a metadata manifest.",
    "No evidence files are uploaded, renamed, or modified."
  ].join("\n"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  const metadataByPath = readMetadataFile(args.metadata);
  const previousManifest = args.previous ? readJSON(path.resolve(repositoryRoot, args.previous)) : null;
  const manifest = generateEvidenceManifest({
    directories: args.directories.length > 0 ? args.directories : undefined,
    metadataByPath,
    previousManifest,
    generatedAt: args.generatedAt || undefined
  });
  if (args.output) writeManifest(manifest, args.output);
  console.log(formatEvidenceManifestReport(manifest));
}
