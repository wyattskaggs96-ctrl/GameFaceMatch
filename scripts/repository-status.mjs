#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sizeLimitBytes = Number(process.env.REPO_STATUS_SIZE_LIMIT_MB ?? 25) * 1024 * 1024;
const strict = process.argv.includes("--strict");

const secretPatterns = [
  /api[_-]?key\s*[:=]\s*["']?[^"'\s]+/i,
  /client[_-]?secret\s*[:=]\s*["']?[^"'\s]+/i,
  /BEGIN PRIVATE KEY/,
  /AWS_SECRET_ACCESS_KEY\s*[:=]/i,
  /STRIPE_SECRET/i,
  /STRIPE_WEBHOOK/i,
  /PAYPAL_CLIENT_SECRET/i,
  /SQUARE_ACCESS_TOKEN/i,
  /sk_live_/i,
  /rk_live_/i
];

const rawMediaExtensions = new Set([
  ".3gp",
  ".avi",
  ".dng",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".m4v",
  ".mov",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".png",
  ".raw",
  ".tif",
  ".tiff",
  ".webm",
  ".webp"
]);
const videoExtensions = new Set([".3gp", ".avi", ".m4v", ".mov", ".mp4", ".mpeg", ".mpg", ".webm"]);
const riskyFacePathPattern = /(^|[/_-])(face|facial|selfie|scan|capture|captures|portrait|tester|user-face)([/_.-]|$)/i;
const localEvidencePathPattern = /(^|[/_-])(local-evidence|evidence-master|evidence-masters|raw-evidence|raw-media|raw-videos|game-videos)([/_.-]|$)/i;
const cf27ResearchPathPattern = /^data\/research\/cf27\//;
const cf27ResearchGeneratedMediaPattern = /^data\/research\/cf27\/generated\/(contact-sheets|full-resolution-frames|cropped-measurement-derivatives)\//;
const cf27ResearchSourceVideoPattern = /^data\/research\/cf27\/(source-video-references|imports)\//;
const approvedTemporaryPathPatterns = [
  /^web\/test-results\//,
  /^web\/playwright-report\//,
  /^web\/blob-report\//,
  /^build-artifacts\//,
  /^data\/fixtures\/test-only\//,
  /^web\/public\/mediapipe\//
];

const statusEntries = getGitStatusEntries();
const trackedAndVisibleFiles = getGitLines(["ls-files", "--cached", "--others", "--exclude-standard"]);
const ignoredEntries = statusEntries.filter((entry) => entry.kind === "ignored");
const oversizedFiles = findOversizedFiles(trackedAndVisibleFiles);
const warnings = [
  ...findSecretWarnings(trackedAndVisibleFiles),
  ...findProductionFixtureWarnings(),
  ...findRawMediaWarnings(trackedAndVisibleFiles),
  ...findResearchEvidenceReferenceWarnings(trackedAndVisibleFiles),
  ...findOversizedWarnings(oversizedFiles)
];

printSection("Repository");
console.log(`Path: ${repositoryRoot}`);
console.log(`Branch: ${gitText(["rev-parse", "--abbrev-ref", "HEAD"])}`);
console.log(`HEAD: ${gitText(["log", "-1", "--oneline"])}`);
console.log(`Strict mode: ${strict ? "on" : "off"}`);

printSection("Git Status");
printList("Staged", statusEntries.filter((entry) => entry.kind === "staged").map(formatStatusEntry));
printList("Modified", statusEntries.filter((entry) => entry.kind === "modified").map(formatStatusEntry));
printList("Untracked", statusEntries.filter((entry) => entry.kind === "untracked").map((entry) => entry.path));
printList("Ignored", ignoredEntries.map((entry) => entry.path));

printSection("Oversized Files");
printList(
  `Files over ${Math.round(sizeLimitBytes / (1024 * 1024))} MB`,
  oversizedFiles.map((file) => `${file.relativePath} (${formatBytes(file.size)})`)
);

printSection("Safety Warnings");
printList("Warnings", warnings);

if (strict && warnings.length > 0) {
  process.exitCode = 1;
}

function getGitStatusEntries() {
  const output = gitBuffer(["status", "--porcelain=v1", "-z", "--ignored=matching"]);
  if (output.length === 0) return [];
  const records = output.toString("utf8").split("\0").filter(Boolean);
  return records.map((record) => {
    const indexStatus = record[0] ?? " ";
    const worktreeStatus = record[1] ?? " ";
    const filePath = record.slice(3);
    if (indexStatus === "?" && worktreeStatus === "?") return { kind: "untracked", indexStatus, worktreeStatus, path: filePath };
    if (indexStatus === "!" && worktreeStatus === "!") return { kind: "ignored", indexStatus, worktreeStatus, path: filePath };
    if (indexStatus !== " ") return { kind: "staged", indexStatus, worktreeStatus, path: filePath };
    return { kind: "modified", indexStatus, worktreeStatus, path: filePath };
  });
}

function findOversizedFiles(files) {
  return files
    .flatMap((relativePath) => {
      const absolutePath = path.join(repositoryRoot, relativePath);
      try {
        const stat = fs.statSync(absolutePath);
        return stat.isFile() && stat.size > sizeLimitBytes ? [{ relativePath, size: stat.size }] : [];
      } catch {
        return [];
      }
    })
    .sort((first, second) => second.size - first.size);
}

function findSecretWarnings(files) {
  const warnings = [];
  for (const relativePath of files) {
    if (shouldSkipContentScan(relativePath)) continue;
    const text = safeReadText(path.join(repositoryRoot, relativePath));
    if (!text) continue;
    for (const pattern of secretPatterns) {
      if (pattern.test(text)) warnings.push(`Potential secret-like pattern in ${relativePath}`);
    }
  }
  return warnings;
}

function findProductionFixtureWarnings() {
  const productionDir = path.join(repositoryRoot, "data", "catalog", "production");
  if (!fs.existsSync(productionDir)) return [];
  const warnings = [];
  for (const absolutePath of listFiles(productionDir)) {
    const relativePath = path.relative(repositoryRoot, absolutePath);
    const normalized = relativePath.replaceAll(path.sep, "/");
    const basename = path.basename(absolutePath).toLowerCase();
    const text = safeReadText(absolutePath);
    if (/fixture|test-only|synthetic|sample|demo|mock/.test(basename)) {
      warnings.push(`Fixture-like file name in production catalog directory: ${normalized}`);
    }
    if (/isTestFixture"\s*:\s*true|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|synthetic|fixture/i.test(text)) {
      warnings.push(`Fixture or placeholder content in production catalog directory: ${normalized}`);
    }
  }
  return warnings;
}

function findRawMediaWarnings(files) {
  const warnings = [];
  for (const relativePath of files) {
    const normalized = relativePath.replaceAll(path.sep, "/");
    if (isApprovedTemporaryPath(normalized)) continue;
    const extension = path.extname(normalized).toLowerCase();
    if (!rawMediaExtensions.has(extension)) continue;
    if (localEvidencePathPattern.test(normalized)) {
      warnings.push(`Local evidence or raw media should not be committed: ${normalized}`);
    }
    if (cf27ResearchGeneratedMediaPattern.test(normalized)) {
      warnings.push(`Generated CF27 research media should stay local and ignored; commit manifests instead: ${normalized}`);
    }
    if (cf27ResearchSourceVideoPattern.test(normalized) && videoExtensions.has(extension)) {
      warnings.push(`CF27 source-video masters should be referenced by metadata, not committed: ${normalized}`);
    }
    if (cf27ResearchPathPattern.test(normalized) && rawMediaExtensions.has(extension)) {
      warnings.push(`CF27 research evidence media should stay outside git unless explicitly approved as a small metadata fixture: ${normalized}`);
    }
    if (videoExtensions.has(extension) && /game|cfb|college-football|road-to-glory|audit|evidence/i.test(normalized)) {
      warnings.push(`Raw game video should stay outside git or in private evidence storage: ${normalized}`);
    }
    if (riskyFacePathPattern.test(normalized)) {
      warnings.push(`Possible raw facial media outside approved temporary directories: ${normalized}`);
    }
  }
  return warnings;
}

function findResearchEvidenceReferenceWarnings(files) {
  const warnings = [];
  for (const relativePath of files) {
    const normalized = relativePath.replaceAll(path.sep, "/");
    if (!cf27ResearchPathPattern.test(normalized)) continue;
    if (!/\.(csv|json|md|txt)$/i.test(normalized)) continue;
    const text = safeReadText(path.join(repositoryRoot, relativePath));
    if (!text) continue;
    const containsAbsoluteLocalPath = /\/Users\/|\/Volumes\/|[A-Z]:\\Users\\/i.test(text);
    if (!containsAbsoluteLocalPath) continue;
    const containsPortableReference = /OWNER_DOWNLOADS|portableRelativeEvidencePath|relativeEvidencePath|evidenceRootToken|sourceRootToken|portable/i.test(text);
    if (!containsPortableReference) {
      warnings.push(`CF27 research evidence file contains local absolute paths without a portable evidence reference: ${normalized}`);
    }
  }
  return warnings;
}

function findOversizedWarnings(files) {
  return files.map((file) => `Oversized file should be reviewed before commit: ${file.relativePath} (${formatBytes(file.size)})`);
}

function shouldSkipContentScan(relativePath) {
  const normalized = relativePath.replaceAll(path.sep, "/");
  return (
    normalized === "scripts/repository-status.mjs" ||
    isApprovedTemporaryPath(normalized) ||
    normalized.startsWith("web/package-lock.json") ||
    normalized.startsWith("ios/GameFaceMatch.xcodeproj/project.pbxproj") ||
    rawMediaExtensions.has(path.extname(normalized).toLowerCase())
  );
}

function isApprovedTemporaryPath(relativePath) {
  return approvedTemporaryPathPatterns.some((pattern) => pattern.test(relativePath));
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function safeReadText(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function getGitLines(args) {
  const output = gitText(args);
  return output ? output.split("\n").filter(Boolean) : [];
}

function gitText(args) {
  return gitBuffer(args).toString("utf8").trim();
}

function gitBuffer(args) {
  return execFileSync("git", args, { cwd: repositoryRoot });
}

function formatStatusEntry(entry) {
  return `${entry.indexStatus}${entry.worktreeStatus} ${entry.path}`;
}

function printSection(title) {
  console.log(`\n## ${title}`);
}

function printList(label, items) {
  console.log(`${label}: ${items.length}`);
  for (const item of items) console.log(`- ${item}`);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
