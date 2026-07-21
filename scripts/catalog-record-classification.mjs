#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "..");
const outputCSVPath = path.join(repositoryRoot, "data", "phase-zero", "catalog_record_classification.csv");
const outputDocPath = path.join(repositoryRoot, "docs", "phase-zero", "CATALOG_DATA_INTEGRITY_STATUS.md");

const classifications = [
  "PRODUCTION_VERIFIED",
  "RESEARCH_OBSERVED",
  "PUBLIC_SOURCE_ONLY",
  "TEST_FIXTURE",
  "PLACEHOLDER",
  "DEPRECATED",
  "INVALID",
  "UNKNOWN_ORIGIN"
];
const researchSourceTypes = new Set(["research", "researchDraft", "researchCandidate", "shippingGameVideoResearch"]);
const fixtureSourceTypes = new Set(["testFixture", "demoData", "localDeveloperSample"]);
const publicSourceTypes = new Set(["publicSourceOnly"]);
const approvedCatalogManagerDispositions = new Set(["approved", "approvedWithNotes"]);
const catalogMetadataDataClasses = new Set([
  "PHASE_ZERO_VERIFICATION_CANDIDATE_GATE",
  "SECOND_VERIFIER_EXECUTION_PACKAGE",
  "SECOND_VERIFIER_RESULTS_INTAKE"
]);
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;
const fixturePathPattern = /data\/fixtures\/test-only|\/fixtures\/test-only\/|^fixtures\/test-only\/|\/test-only\//i;
const verifierExecutionPackagePathPattern = /data\/phase-zero\/second-verifier-execution-package\//i;

const scanRoots = [
  "data/catalog",
  "data/phase-zero",
  "data/research/cf27/catalog-candidates",
  "data/research/cf27/exports/partial-research-catalog-current",
  "data/research/cf27/manifests",
  "data/fixtures/test-only",
  "data/audit/college-football-27/templates"
];

export function buildCatalogRecordClassification(repositoryDirectory = repositoryRoot) {
  const rows = [];
  for (const relativeRoot of scanRoots) {
    const absoluteRoot = path.join(repositoryDirectory, relativeRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const filePath of walkFiles(absoluteRoot)) {
      if (!filePath.endsWith(".json")) continue;
      collectFileRows(repositoryDirectory, filePath, rows);
    }
  }
  rows.sort((first, second) => `${first.file_path}:${first.record_path}`.localeCompare(`${second.file_path}:${second.record_path}`));
  return rows;
}

export function writeCatalogRecordClassification(repositoryDirectory = repositoryRoot) {
  const rows = buildCatalogRecordClassification(repositoryDirectory);
  fs.mkdirSync(path.dirname(outputCSVPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputDocPath), { recursive: true });
  fs.writeFileSync(outputCSVPath, toCSV(rows));
  fs.writeFileSync(outputDocPath, toMarkdown(rows));
  return rows;
}

export function classifyRecord(record, context = {}) {
  const value = record && typeof record === "object" && !Array.isArray(record) ? record : {};
  const sourceType = stringValue(value.sourceType);
  const verificationStatus = stringValue(value.verificationStatus ?? value.verificationState ?? value.status);
  const dataClass = stringValue(value.dataClass);
  const productionStatus = stringValue(value.productionStatus);
  const hasSourceEvidence = hasRecordSourceEvidence(value);
  const hasCatalogManagerDisposition = approvedCatalogManagerDispositions.has(stringValue(value.catalogManagerDisposition));
  const reasons = [];
  const blockingIssues = [];
  let classification = "UNKNOWN_ORIGIN";

  const serialized = JSON.stringify(value);
  if (fixturePathPattern.test(context.filePath ?? "") || value.isTestFixture === true || fixtureSourceTypes.has(sourceType)) {
    classification = "TEST_FIXTURE";
    blockingIssues.push("fixtureRecord");
  } else if (verifierExecutionPackagePathPattern.test(context.filePath ?? "")) {
    classification = "RESEARCH_OBSERVED";
    reasons.push("secondVerifierExecutionPackageRecord");
  } else if (placeholderPattern.test(serialized)) {
    classification = "PLACEHOLDER";
    blockingIssues.push("placeholderToken");
  } else if (value.deprecated === true || stringValue(value.deprecationState).toLowerCase() === "deprecated") {
    classification = "DEPRECATED";
    reasons.push("deprecatedRecord");
  } else if (publicSourceTypes.has(sourceType)) {
    classification = "PUBLIC_SOURCE_ONLY";
    blockingIssues.push("publicSourceOnlyRecord");
  } else if (catalogMetadataDataClasses.has(dataClass)) {
    classification = "UNKNOWN_ORIGIN";
    reasons.push("catalogMetadataNotCandidateRecord");
  } else if (sourceType === "production" && verificationStatus === "verified" && !value.isTestFixture) {
    classification = "PRODUCTION_VERIFIED";
    if (!hasCatalogManagerDisposition) blockingIssues.push("missingCatalogManagerDisposition");
  } else if (
    researchSourceTypes.has(sourceType) ||
    /RESEARCH|OBSERVED_PENDING_VERIFICATION|PRIMARY_RESEARCH|NOT_PRODUCTION_DATA/i.test([dataClass, productionStatus, verificationStatus].join(" "))
  ) {
    classification = "RESEARCH_OBSERVED";
    if (!hasSourceEvidence) blockingIssues.push("researchRecordMissingSourceEvidence");
  } else if (sourceType === "production" || verificationStatus === "verified") {
    classification = "INVALID";
    blockingIssues.push("invalidProductionRecord");
  }

  if (!classifications.includes(classification)) classification = "UNKNOWN_ORIGIN";
  if (sourceType) reasons.push(`sourceType:${sourceType}`);
  if (dataClass) reasons.push(`dataClass:${dataClass}`);
  if (verificationStatus) reasons.push(`verification:${verificationStatus}`);
  if (productionStatus) reasons.push(`productionStatus:${productionStatus}`);

  return {
    classification,
    productionAccessAllowed: classification === "PRODUCTION_VERIFIED" && blockingIssues.length === 0,
    hasSourceEvidence,
    hasCatalogManagerDisposition,
    reasons,
    blockingIssues
  };
}

function collectFileRows(repositoryDirectory, filePath, rows) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return;
  }
  const relativePath = path.relative(repositoryDirectory, filePath).replaceAll("\\", "/");
  for (const { record, recordPath } of collectRecordObjects(data, "$", relativePath)) {
    const classification = classifyRecord(record, { filePath: relativePath });
    rows.push({
      record_id: resolveRecordID(record, recordPath),
      file_path: relativePath,
      record_path: recordPath,
      record_kind: resolveRecordKind(record, relativePath),
      classification: classification.classification,
      source_type: stringValue(record.sourceType),
      data_class: stringValue(record.dataClass),
      production_status: stringValue(record.productionStatus),
      verification_status: stringValue(record.verificationStatus ?? record.verificationState ?? record.status),
      has_source_evidence: String(classification.hasSourceEvidence),
      has_catalog_manager_disposition: String(classification.hasCatalogManagerDisposition),
      production_access_allowed: String(classification.productionAccessAllowed),
      reasons: classification.reasons.join(";"),
      blocking_issues: classification.blockingIssues.join(";")
    });
  }
}

function collectRecordObjects(value, currentPath, filePath) {
  const records = [];
  if (!value || typeof value !== "object") return records;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      records.push(...collectRecordObjects(entry, `${currentPath}[${index}]`, filePath));
    });
    return records;
  }
  if (isClassifiableRecord(value, filePath, currentPath)) records.push({ record: value, recordPath: currentPath });
  for (const [key, entry] of Object.entries(value)) {
    if (entry && typeof entry === "object") records.push(...collectRecordObjects(entry, `${currentPath}.${key}`, filePath));
  }
  return dedupeRecords(records);
}

function isClassifiableRecord(value, filePath, currentPath) {
  const keys = Object.keys(value);
  if (verifierExecutionPackagePathPattern.test(filePath) && currentPath === "$.candidateGate") return false;
  if (filePath.includes("/templates/")) return currentPath === "$" || placeholderPattern.test(JSON.stringify(value));
  if (filePath.includes("data/fixtures/test-only")) return keys.length > 0;
  return [
    "stableInternalID",
    "stableResearchCatalogID",
    "catalogID",
    "catalogCandidateID",
    "catalogCandidate",
    "candidateID",
    "menuID",
    "environmentID",
    "creationPathID",
    "evidenceID",
    "captureEventID",
    "issueID",
    "nativeOption",
    "nativeOptionNumber"
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function dedupeRecords(records) {
  const seen = new Set();
  return records.filter((entry) => {
    const key = `${entry.recordPath}:${resolveRecordID(entry.record, entry.recordPath)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasRecordSourceEvidence(value) {
  const collections = [
    value.sourceImageReferences,
    value.evidenceReferences,
    value.evidenceFileIDs,
    value.sourceObservations,
    value.selectedMenuEvidence,
    value.extractedFrames,
    value.timelineEvidence,
    value.evidence,
    value.evidenceRefs,
    value.evidenceIDs,
    value.frames,
    value.sourceVideos,
    value.sourceEvidence,
    value.sourceImageFrameIDs,
    value.sourceMenuEvidence,
    value.reproducibleSteps,
    value.actions
  ];
  if (collections.some((entry) => Array.isArray(entry) && entry.some(hasUsefulEvidenceValue))) return true;
  return [
    value.sourceTimeline,
    value.sourceEvidenceManifest,
    value.sourceFrameManifest,
    value.selectedEvidence,
    value.sourceVideoID,
    value.sourceVideo,
    value.sourceFilename,
    value.video_id,
    value.videoID,
    value.timelineRecordID,
    value.timeline_record_id,
    value.evidenceFramePath,
    value.extracted_frame_path,
    value.relativePath,
    value.relative_path,
    value.path
  ].some(hasUsefulEvidenceValue);
}

function hasUsefulEvidenceValue(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(hasUsefulEvidenceValue);
}

function resolveRecordID(record, recordPath) {
  return stringValue(
    record.stableInternalID ??
    record.stableResearchCatalogID ??
    record.catalogID ??
    record.catalogCandidateID ??
    record.menuID ??
    record.environmentID ??
    record.creationPathID ??
    record.evidenceID ??
    record.captureEventID ??
    record.issueID ??
    record.packageID
  ) || recordPath;
}

function resolveRecordKind(record, filePath) {
  if (record.stableInternalID || record.stableResearchCatalogID || record.catalogCandidateID || record.catalogCandidate) return "catalog_record";
  if (record.menuID) return "menu_record";
  if (record.environmentID) return "environment_record";
  if (record.creationPathID) return "creation_path_record";
  if (record.evidenceID) return "evidence_record";
  if (record.captureEventID) return "capture_log_record";
  if (record.issueID) return "issue_record";
  if (filePath.includes("/templates/")) return "template_record";
  if (filePath.includes("/fixtures/")) return "fixture_record";
  return "catalog_related_record";
}

function toCSV(rows) {
  const columns = [
    "record_id",
    "file_path",
    "record_path",
    "record_kind",
    "classification",
    "source_type",
    "data_class",
    "production_status",
    "verification_status",
    "has_source_evidence",
    "has_catalog_manager_disposition",
    "production_access_allowed",
    "reasons",
    "blocking_issues"
  ];
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

function toMarkdown(rows) {
  const counts = Object.fromEntries(classifications.map((classification) => [classification, rows.filter((row) => row.classification === classification).length]));
  const productionAccessRows = rows.filter((row) => row.production_access_allowed === "true");
  const researchWithoutEvidence = rows.filter((row) => row.classification === "RESEARCH_OBSERVED" && row.has_source_evidence !== "true");
  const placeholderRows = rows.filter((row) => row.classification === "PLACEHOLDER");
  return `# Catalog Data Integrity Status

This report is generated from repository-local catalog, Phase 0, research, fixture, and audit-template records. It classifies record origin and production access; it does not promote any record.

## Summary

| Classification | Count |
| --- | ---: |
${classifications.map((classification) => `| ${classification} | ${counts[classification]} |`).join("\n")}

## Production Gate Status

- Production catalog record count: ${rows.filter((row) => row.file_path === "data/catalog/production/catalog_manifest.json" && row.record_kind === "catalog_record").length}
- Records allowed production recommendation access: ${productionAccessRows.length}
- Production recommendations remain fail-closed unless a record is \`PRODUCTION_VERIFIED\`, has approved catalog-manager disposition, passes import validation, and is part of an approved release.
- Fixture, research, public-source-only, placeholder, deprecated, invalid, and unknown-origin records are blocked from production access.

## Evidence Requirements

- Research records missing source evidence: ${researchWithoutEvidence.length}
- Placeholder records found: ${placeholderRows.length}
- Public-source-only records found: ${counts.PUBLIC_SOURCE_ONLY}
- Test fixture records found: ${counts.TEST_FIXTURE}

## Current Conclusion

The repository contains research and fixture material, but no production-verified College Football 27 appearance records available to the recommendation engine. Production catalog exports remain empty unless real verified records pass the full publication path.
`;
}

function walkFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(filePath);
    return [filePath];
  });
}

function csvEscape(value) {
  const string = String(value ?? "");
  return /[",\n]/.test(string) ? `"${string.replaceAll("\"", "\"\"")}"` : string;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function runCLI(argv) {
  const rows = buildCatalogRecordClassification(repositoryRoot);
  const csv = toCSV(rows);
  const markdown = toMarkdown(rows);
  if (argv.includes("--check")) {
    const currentCSV = fs.existsSync(outputCSVPath) ? fs.readFileSync(outputCSVPath, "utf8") : "";
    const currentMarkdown = fs.existsSync(outputDocPath) ? fs.readFileSync(outputDocPath, "utf8") : "";
    if (csv !== currentCSV || markdown !== currentMarkdown) {
      console.error("Catalog record classification outputs are stale. Run node scripts/catalog-record-classification.mjs.");
      return 1;
    }
    console.log(`Catalog record classification check OK (${rows.length} records).`);
    return 0;
  }
  fs.mkdirSync(path.dirname(outputCSVPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputDocPath), { recursive: true });
  fs.writeFileSync(outputCSVPath, csv);
  fs.writeFileSync(outputDocPath, markdown);
  console.log(`Wrote ${path.relative(repositoryRoot, outputCSVPath)} (${rows.length} records).`);
  console.log(`Wrote ${path.relative(repositoryRoot, outputDocPath)}.`);
  return 0;
}

if (process.argv[1] === currentFile) {
  process.exitCode = runCLI(process.argv.slice(2));
}
