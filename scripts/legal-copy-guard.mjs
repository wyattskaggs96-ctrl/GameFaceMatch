#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const blockedClaims = [
  {
    id: "perfect-match",
    pattern: /\bperfect\s+(?:match|facial\s+duplication|resemblance|copy)\b/i,
    description: "Do not claim a perfect match, perfect resemblance, or perfect facial copy."
  },
  {
    id: "face-import",
    pattern: /\b(?:direct\s+)?face\s+import\b|\bimport(?:s|ed|ing)?\s+(?:your\s+)?face\b/i,
    description: "Do not claim direct face import into College Football 27."
  },
  {
    id: "official-ea-integration",
    pattern: /\bofficial\s+(?:ea|ea\s+sports|electronic\s+arts)\s+(?:integration|app|partner|product|tool)\b/i,
    description: "Do not claim official EA, EA SPORTS, or Electronic Arts integration."
  },
  {
    id: "guaranteed-resemblance",
    pattern: /\bguaranteed\s+(?:resemblance|match|result|lookalike|accuracy)\b/i,
    description: "Do not claim guaranteed resemblance or guaranteed matching accuracy."
  },
  {
    id: "biometric-identification",
    pattern: /\bbiometric\s+identification\b|\bidentify\s+(?:you|people|a\s+person|the\s+person)\b/i,
    description: "Do not claim biometric identification or person identification."
  },
  {
    id: "medical-grade",
    pattern: /\bmedical[-\s]?grade\s+(?:measurement|facial\s+measurement|scan|analysis|accuracy)\b/i,
    description: "Do not claim medical-grade measurement, scan, analysis, or accuracy."
  }
];

const defaultScanPaths = [
  "README.md",
  "00_START_HERE.md",
  "docs",
  "legal",
  "web/app",
  "web/components",
  "web/features",
  "web/lib",
  "web/public"
];

const excludedPathFragments = [
  "web/public/mediapipe/",
  "web/public/_next/",
  "node_modules/",
  ".next/",
  "build-artifacts/",
  "data/fixtures/",
  "data/phase-zero/",
  "data/schemas/"
];

const textExtensions = new Set([".md", ".mdx", ".txt", ".tsx", ".ts", ".js", ".jsx", ".json", ".html", ".css"]);

const args = process.argv.slice(2);
const json = args.includes("--json");
const explicitPaths = args.filter((arg) => !arg.startsWith("--"));
const scanTargets = explicitPaths.length > 0 ? explicitPaths : defaultScanPaths;

const files = collectFiles(scanTargets);
const findings = [];
const allowedReferences = [];

for (const absoluteFile of files) {
  const relativeFile = path.relative(repositoryRoot, absoluteFile);
  const contents = fs.readFileSync(absoluteFile, "utf8");
  const lines = contents.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const claim of blockedClaims) {
      if (!claim.pattern.test(line)) continue;
      const context = classifyContext(line, lines, index);
      const record = {
        file: relativeFile,
        line: index + 1,
        claimID: claim.id,
        description: claim.description,
        text: line.trim(),
        context
      };
      if (context === "prohibited-context" || context === "disclaimer-context" || context === "historical-context" || context === "question-context") {
        allowedReferences.push(record);
      } else {
        findings.push(record);
      }
    }
  });
}

const result = {
  checkedAt: new Date().toISOString(),
  scannedFileCount: files.length,
  findingCount: findings.length,
  allowedReferenceCount: allowedReferences.length,
  findings,
  allowedReferences
};

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Legal copy guard scanned ${files.length} file(s).`);
  console.log(`Allowed contextual references: ${allowedReferences.length}`);
  if (findings.length > 0) {
    console.error(`Blocked claim findings: ${findings.length}`);
    findings.forEach((finding) => {
      console.error(`- ${finding.file}:${finding.line} [${finding.claimID}] ${finding.text}`);
      console.error(`  ${finding.description}`);
    });
  } else {
    console.log("No affirmative blocked legal/marketing claims found.");
  }
}

process.exit(findings.length > 0 ? 1 : 0);

function collectFiles(targets) {
  const result = [];
  for (const target of targets) {
    const absoluteTarget = path.resolve(repositoryRoot, target);
    if (!fs.existsSync(absoluteTarget)) continue;
    const stats = fs.statSync(absoluteTarget);
    if (stats.isDirectory()) {
      walk(absoluteTarget, result);
    } else if (isScannableFile(absoluteTarget)) {
      result.push(absoluteTarget);
    }
  }
  return Array.from(new Set(result)).sort();
}

function walk(directory, result) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absoluteEntry = path.join(directory, entry.name);
    const relativeEntry = path.relative(repositoryRoot, absoluteEntry).replaceAll(path.sep, "/");
    if (excludedPathFragments.some((fragment) => relativeEntry.includes(fragment))) continue;
    if (entry.isDirectory()) {
      walk(absoluteEntry, result);
    } else if (entry.isFile() && isScannableFile(absoluteEntry)) {
      result.push(absoluteEntry);
    }
  }
}

function isScannableFile(file) {
  const relativeFile = path.relative(repositoryRoot, file).replaceAll(path.sep, "/");
  if (excludedPathFragments.some((fragment) => relativeFile.includes(fragment))) return false;
  return textExtensions.has(path.extname(file).toLowerCase());
}

function classifyContext(line, lines, index) {
  const windowText = lines.slice(Math.max(0, index - 12), Math.min(lines.length, index + 3)).join(" ").toLowerCase();
  const normalizedLine = line.toLowerCase();
  if (/\?$/.test(line.trim()) || /\blegal review question\b|\bquestions? for counsel\b/.test(windowText)) return "question-context";
  if (/\bhistorical\b|\bsuperseded\b|\bpre-game-access\b/.test(windowText)) return "historical-context";
  if (windowText.includes("does not:")) return "prohibited-context";
  if (
    /\b(?:avoid|do not|must not|never|cannot|blocked|prohibited|not claim|no claim|do not claim|must avoid|must be reviewed|review before launch|claims?[^.:\n]*avoid|blocked claims|non-negotiable claim boundaries)\b/.test(
      windowText
    )
  ) {
    return "prohibited-context";
  }
  if (
    /\b(?:not affiliated|not endorsed|not sponsored|does not|do not|not directly|not a face import|not official|not identify|not biometric|not part of|must not identify|no official|no direct face import)\b/.test(
      normalizedLine
    )
  ) {
    return "disclaimer-context";
  }
  return "affirmative-claim";
}
