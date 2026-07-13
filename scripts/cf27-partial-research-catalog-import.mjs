#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_PARTIAL_RESEARCH_IMPORT_SCHEMA_VERSION = "cf27-partial-research-catalog-import-v1";
export const researchImportLabel = "PRIMARY RESEARCH CANDIDATE — NOT PRODUCTION VERIFIED";
export const defaultSourceDirectory = "data/research/cf27/exports/partial-research-catalog-current";
export const defaultOutputDirectory = "data/research/cf27/catalog-candidates/research/partial-catalog-import-current";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const categoryFileNames = [
  "heads",
  "skin_tones",
  "skin_details",
  "eye_shapes",
  "eye_colors",
  "noses",
  "ear_shapes"
];

export function loadPartialResearchCatalogExport({
  root = repositoryRoot,
  sourceDirectory = defaultSourceDirectory
} = {}) {
  const absoluteSourceDirectory = path.resolve(root, sourceDirectory);
  const readExportJSON = (fileName) => readJSON(path.join(absoluteSourceDirectory, fileName));
  return {
    sourceDirectory,
    manifest: readExportJSON("research_catalog_manifest.json"),
    environmentManifest: readExportJSON("environment_manifest.json"),
    creationPaths: readExportJSON("creation_paths.json"),
    menuMap: readExportJSON("menu_map.json"),
    evidenceManifest: readExportJSON("evidence_manifest.json"),
    captureLog: readExportJSON("capture_log.json"),
    issuesAndExceptionsCSV: readTextIfExists(path.join(absoluteSourceDirectory, "issues_and_exceptions.csv")),
    recaptureQueueCSV: readTextIfExists(path.join(absoluteSourceDirectory, "recapture_queue.csv")),
    categories: Object.fromEntries(categoryFileNames.map((category) => [category, readExportJSON(`${category}.json`)]))
  };
}

export function importPartialResearchCatalog({
  exportData,
  sourceDirectory = defaultSourceDirectory,
  outputDirectory = defaultOutputDirectory
} = {}) {
  const source = exportData ?? loadPartialResearchCatalogExport({ sourceDirectory });
  const generatedAt = source.manifest.generatedAt ?? "2026-07-13T00:00:00-04:00";
  const environment = source.environmentManifest.payload;
  const creationPath = (source.creationPaths.payload.creationPaths ?? [])[0] ?? null;
  const evidenceByCatalogID = indexEvidenceByCatalogID(source.evidenceManifest.payload.entries ?? []);
  const captureEventsByCatalogID = indexCaptureEventsByCatalogID(source.captureLog.payload.events ?? []);
  const records = [];
  const errors = [];
  const warnings = [];
  const seenIDs = new Map();

  for (const categoryName of categoryFileNames) {
    const categoryPayload = source.categories[categoryName];
    if (!isResearchPackage(categoryPayload)) {
      errors.push(issue("sourceNotResearchCandidate", `${categoryName}.json is not labeled as a non-production primary-research package.`));
      continue;
    }
    for (const record of categoryPayload.payload.records ?? []) {
      const id = record.stableInternalID;
      if (!id) {
        errors.push(issue("missingStableID", `${categoryName}.json contains a record without stableInternalID.`));
        continue;
      }
      if (seenIDs.has(id)) {
        errors.push(issue("duplicateStableID", `Duplicate stable ID ${id} appears in both ${seenIDs.get(id)} and ${categoryName}.`, "Keep one imported research record per stable ID; preserve duplicate observations as evidence, not duplicate records."));
        continue;
      }
      seenIDs.set(id, categoryName);
      records.push(normalizeResearchRecord({
        record,
        categoryName,
        environment,
        creationPath,
        evidenceEntries: evidenceByCatalogID.get(id) ?? [],
        captureEvents: captureEventsByCatalogID.get(id) ?? []
      }));
    }
  }

  if (!isResearchPackage(source.manifest)) errors.push(issue("sourceNotResearchCandidate", "research_catalog_manifest.json is not labeled as non-production research."));
  if (String(outputDirectory).includes("data/catalog/production")) {
    errors.push(issue("productionOutputBlocked", "Partial research imports cannot be written to data/catalog/production.", "Write imported research candidates under data/research/cf27/catalog-candidates/research/."));
  }

  for (const record of records) {
    if (record.incompleteFields.length > 0) {
      warnings.push(issue("incompleteResearchRecord", `${record.stableInternalID} has incomplete fields: ${record.incompleteFields.join(", ")}`));
    }
  }

  const importID = "cf27-partial-research-import-current";
  const importedCatalog = {
    schemaVersion: CF27_PARTIAL_RESEARCH_IMPORT_SCHEMA_VERSION,
    importID,
    packageLabel: researchImportLabel,
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    sourceType: "researchDraft",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    generatedAt,
    sourceDirectory,
    researchNamespace: defaultOutputDirectory,
    productionRecommendationAccess: false,
    promotionEligible: false,
    promotionGate: {
      status: "blocked",
      reasons: [
        "primary research only",
        "not second-person verified",
        "unknown game executable version",
        "unknown patch",
        "not an approved immutable production release"
      ]
    },
    duplicatePolicy: {
      stableIDs: "reject duplicates during import",
      face12Overlap: "merged as one stable ID while preserving both source-video evidence references",
      visuallySimilarOptions: "never merged without explicit human duplicate-review disposition"
    },
    environment: {
      environmentID: environment?.environmentID ?? null,
      platformFamily: "Xbox",
      platformModel: valueOrNull(environment?.consoleModel),
      platformName: valueOrNull(environment?.platformName),
      gameVersionID: valueOrNull(environment?.gameVersionID),
      gameExecutableVersion: valueOrNull(environment?.gameExecutableVersion),
      patchID: valueOrNull(environment?.patchID),
      patchLabel: valueOrNull(environment?.patchLabel),
      gameMode: valueOrNull(environment?.mode),
      creationPathID: creationPath?.id ?? null,
      exactPath: valueOrNull(environment?.exactPath)
    },
    records: records.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map(({ sortKey, ...record }) => record)
  };
  const report = createImportReport({ importedCatalog, errors, warnings, generatedAt, source });
  const auditLog = createImportAuditLog({ importedCatalog, report, generatedAt });
  return { importedCatalog, report, auditLog };
}

export function validateImportedResearchCatalogCannotPromote(importedCatalog) {
  const errors = [];
  if (importedCatalog?.sourceType !== "production") errors.push(issue("nonProductionSource", "Imported research catalog sourceType is not production."));
  if (importedCatalog?.productionStatus !== "PRODUCTION_DATA") errors.push(issue("notProductionData", "Imported research catalog is explicitly not production data."));
  if (importedCatalog?.verificationStatus !== "VERIFIED") errors.push(issue("notVerified", "Imported research catalog is not second-person verified."));
  if (importedCatalog?.productionRecommendationAccess !== true) errors.push(issue("recommendationAccessBlocked", "Imported research catalog has production recommendation access disabled."));
  if (importedCatalog?.promotionEligible !== true) errors.push(issue("promotionEligibilityBlocked", "Imported research catalog is not promotion eligible."));
  for (const record of importedCatalog?.records ?? []) {
    if (record.sourceType !== "production") errors.push(issue("recordNonProductionSource", `${record.stableInternalID} is ${record.sourceType}.`));
    if (record.verificationState !== "VERIFIED") errors.push(issue("recordNotVerified", `${record.stableInternalID} is ${record.verificationState}.`));
  }
  return {
    ok: false,
    status: "failed",
    errors,
    warnings: [],
    summary: {
      checkedRecords: (importedCatalog?.records ?? []).length,
      blockingReason: "Research candidates must pass second-person verification and immutable production publish gates before recommendation access."
    }
  };
}

export function writePartialResearchImport({ importedCatalog, report, auditLog }, {
  root = repositoryRoot,
  outputDirectory = defaultOutputDirectory
} = {}) {
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  if (!absoluteOutputDirectory.startsWith(path.resolve(root, "data/research/cf27/catalog-candidates/research"))) {
    throw new Error(`Refusing to write partial research import outside the research-candidate namespace: ${outputDirectory}`);
  }
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  writeJSON(path.join(absoluteOutputDirectory, "imported_research_catalog.json"), importedCatalog);
  writeJSON(path.join(absoluteOutputDirectory, "import_report.json"), report);
  writeJSON(path.join(absoluteOutputDirectory, "import_audit_log.json"), auditLog);
  fs.writeFileSync(path.join(absoluteOutputDirectory, "import_report.md"), formatImportReportMarkdown(report), "utf8");
}

function normalizeResearchRecord({ record, categoryName, environment, creationPath, evidenceEntries, captureEvents }) {
  const selectedEvidence = parseSelectedEvidence(record.selectedEvidence);
  const sourceTimestamps = mergeSourceTimestamps(selectedEvidence, captureEvents);
  const evidenceFileIDs = [...new Set([
    ...splitPipe(record.sourceImageFrameIDs),
    ...evidenceEntries.map((entry) => entry.evidenceID),
    ...captureEvents.flatMap((event) => event.evidenceGenerated ?? [])
  ])].sort();
  const incompleteFields = incompleteFieldsForRecord({ record, environment, creationPath });
  const nativeOrder = Number(record.nativeOrder);
  return {
    sortKey: `${categoryName.padEnd(20, "_")}:${String(Number.isFinite(nativeOrder) ? nativeOrder : 999999).padStart(6, "0")}:${record.stableInternalID}`,
    stableInternalID: record.stableInternalID,
    sourceType: "researchDraft",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationAccess: false,
    promotionEligible: false,
    categoryExport: categoryName,
    category: record.category,
    nativeOrder: Number.isFinite(nativeOrder) ? nativeOrder : null,
    nativeLabel: record.nativeOption,
    kind: record.kind || inferKind(categoryName),
    verificationState: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    game: "EA SPORTS College Football 27",
    platformFamily: "Xbox",
    platformModel: valueOrNull(environment?.consoleModel),
    platformName: valueOrNull(environment?.platformName),
    gameVersionID: valueOrNull(environment?.gameVersionID),
    gameExecutableVersion: valueOrNull(environment?.gameExecutableVersion),
    patchID: valueOrNull(environment?.patchID),
    patchLabel: valueOrNull(environment?.patchLabel),
    gameMode: valueOrNull(environment?.mode),
    creationPathID: creationPath?.id ?? null,
    sourceTimestamps,
    evidenceFileIDs,
    evidenceCount: evidenceFileIDs.length,
    captureEventIDs: captureEvents.map((event) => event.captureEventID).sort(),
    missingViews: splitPipe(record.missingViews),
    recaptureRequired: record.recaptureRequired === true,
    incompleteFields,
    importedNotes: record.notes,
    overlapHandling: record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012"
      ? "Face 12 overlap preserved as one catalog identity with evidence from video-002 and video-003."
      : null,
    visualSimilarityMergeStatus: "notMerged",
    canPromoteToProduction: false
  };
}

function createImportReport({ importedCatalog, errors, warnings, generatedAt, source }) {
  const records = importedCatalog.records ?? [];
  const incompleteRecordCount = records.filter((record) => record.incompleteFields.length > 0).length;
  const face12 = records.find((record) => record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012");
  const report = {
    schemaVersion: CF27_PARTIAL_RESEARCH_IMPORT_SCHEMA_VERSION,
    reportID: "cf27-partial-research-import-current-report",
    packageLabel: researchImportLabel,
    generatedAt,
    status: errors.length === 0 ? "passed" : "failed",
    ok: errors.length === 0,
    productionStatus: "NOT_PRODUCTION_DATA",
    sourceManifestChecksum: sha256Text(stableStringify(source.manifest)),
    summary: {
      importedRecords: records.length,
      incompleteRecordCount,
      errorCount: errors.length,
      warningCount: warnings.length,
      sourceCaptureLogEvents: source.manifest.counts?.captureLogEvents ?? null,
      sourceEvidenceManifestEntries: source.manifest.counts?.evidenceManifestEntries ?? null,
      productionRecommendationAccess: false,
      promotionEligible: false
    },
    checks: [
      check("researchNamespace", true, "Imported package is written under the research-candidate namespace."),
      check("productionAccessBlocked", true, "Production recommendation access remains disabled."),
      check("duplicateStableIDs", errors.every((entry) => entry.code !== "duplicateStableID"), "Stable IDs are unique across imported research records."),
      check("face12OverlapPreserved", Boolean(face12 && face12.sourceTimestamps.some((entry) => entry.sourceVideoID === "video-002") && face12.sourceTimestamps.some((entry) => entry.sourceVideoID === "video-003")), "Face 12 includes source evidence from both overlapping recordings."),
      check("nativeOrderPreserved", records.every((record) => Number.isInteger(record.nativeOrder) && record.nativeOrder > 0), "Native order is preserved for imported records."),
      check("promotionBlocked", true, "Research candidates cannot be promoted without production gates.")
    ],
    errors,
    warnings
  };
  return report;
}

function createImportAuditLog({ importedCatalog, report, generatedAt }) {
  const importChecksum = sha256Text(stableStringify(importedCatalog));
  const reportChecksum = sha256Text(stableStringify(report));
  const importEntry = auditEntry({
    entryID: "cf27-partial-research-import-current-001",
    occurredAt: generatedAt,
    action: "import",
    targetType: "catalogPackage",
    targetID: importedCatalog.importID,
    summary: "Imported partial video-derived CF27 research catalog into the research-candidate namespace.",
    relatedEntityIDs: importedCatalog.records.map((record) => record.stableInternalID),
    previousEntryHash: "GENESIS",
    afterChecksum: importChecksum,
    metadata: {
      importedRecords: importedCatalog.records.length,
      productionRecommendationAccess: false,
      sourceType: "researchDraft"
    }
  });
  const validationEntry = auditEntry({
    entryID: "cf27-partial-research-import-current-validation-001",
    occurredAt: generatedAt,
    action: "validation",
    targetType: "validationRun",
    targetID: report.reportID,
    summary: `Partial research import validation ${report.status}.`,
    relatedEntityIDs: [importedCatalog.importID],
    previousEntryHash: importEntry.entryHash,
    afterChecksum: reportChecksum,
    metadata: {
      status: report.status,
      errors: report.summary.errorCount,
      warnings: report.summary.warningCount,
      promotionEligible: false
    }
  });
  return {
    schemaVersion: "cf27-research-import-audit-log-v1",
    packageLabel: researchImportLabel,
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    createdAt: generatedAt,
    updatedAt: generatedAt,
    entries: [importEntry, validationEntry]
  };
}

function auditEntry(input) {
  const base = {
    schemaVersion: "cf27-research-import-audit-entry-v1",
    actor: {
      actorID: "codex-catalog-importer",
      roles: ["catalogManager"]
    },
    reason: "Prompt 99 research namespace import; not production publication.",
    beforeChecksum: null,
    ...input
  };
  return {
    ...base,
    entryHash: sha256Text(stableStringify({ ...base, entryHash: undefined }))
  };
}

function formatImportReportMarkdown(report) {
  const lines = [
    "# CF27 Partial Research Catalog Import Report",
    "",
    researchImportLabel,
    "",
    `Status: ${report.status.toUpperCase()}`,
    `Imported records: ${report.summary.importedRecords}`,
    `Incomplete records: ${report.summary.incompleteRecordCount}`,
    `Errors: ${report.summary.errorCount}`,
    `Warnings: ${report.summary.warningCount}`,
    "",
    "## Checks",
    ...report.checks.map((entry) => `- ${entry.name}: ${entry.passed ? "PASS" : "FAIL"} — ${entry.message}`),
    "",
    "## Promotion Gate",
    "",
    "Blocked. This import is primary research only and does not enable production recommendations."
  ];
  if (report.errors.length > 0) {
    lines.push("", "## Errors", ...report.errors.map((entry) => `- ${entry.code}: ${entry.message}`));
  }
  if (report.warnings.length > 0) {
    lines.push("", "## Warnings", ...report.warnings.map((entry) => `- ${entry.code}: ${entry.message}`));
  }
  return `${lines.join("\n")}\n`;
}

function mergeSourceTimestamps(selectedEvidence, captureEvents) {
  const timestamps = [];
  for (const selected of selectedEvidence) timestamps.push(selected);
  for (const event of captureEvents) {
    timestamps.push({
      sourceVideoID: event.sourceVideoID,
      sourceFilename: event.sourceFilename,
      startSeconds: event.beginningTimestamp,
      endSeconds: event.endingTimestamp,
      basis: event.selectionState === "deliberately_selected" ? "capture log deliberate selected state" : "capture log event"
    });
  }
  return [...new Map(timestamps.map((entry) => [`${entry.sourceVideoID}:${entry.startSeconds}-${entry.endSeconds}`, entry])).values()]
    .sort((a, b) => `${a.sourceVideoID}:${a.startSeconds}`.localeCompare(`${b.sourceVideoID}:${b.startSeconds}`));
}

function parseSelectedEvidence(value) {
  return splitPipe(value).map((entry) => {
    const [sourceVideoID, range = ""] = entry.split(":");
    const [start, end] = range.split("-").map((part) => Number(part));
    return {
      sourceVideoID,
      sourceFilename: null,
      startSeconds: Number.isFinite(start) ? start : null,
      endSeconds: Number.isFinite(end) ? end : null,
      basis: "category selected evidence"
    };
  });
}

function incompleteFieldsForRecord({ record, environment, creationPath }) {
  const fields = [];
  for (const [field, value] of [
    ["environment.consoleModel", environment?.consoleModel],
    ["environment.gameExecutableVersion", environment?.gameExecutableVersion],
    ["environment.patchLabel", environment?.patchLabel],
    ["environment.edition", environment?.edition],
    ["environment.region", environment?.region],
    ["environment.displayModel", environment?.displayModel],
    ["creationPath.secondPersonVerification", creationPath?.verificationRecordIDs?.length ? "present" : "UNKNOWN"],
    ["record.secondVerifier", "UNKNOWN"],
    ["record.verifiedDate", "UNKNOWN"],
    ["record.productionCatalogVersion", "UNKNOWN"]
  ]) {
    if (!hasKnownValue(value)) fields.push(field);
  }
  if (record.recaptureRequired) fields.push("record.standardizedProductionCapture");
  return [...new Set(fields)].sort();
}

function indexEvidenceByCatalogID(entries) {
  const index = new Map();
  for (const entry of entries) {
    if (!entry.catalogID) continue;
    const values = index.get(entry.catalogID) ?? [];
    values.push(entry);
    index.set(entry.catalogID, values);
  }
  for (const [key, values] of index.entries()) {
    index.set(key, values.sort((a, b) => String(a.evidenceID).localeCompare(String(b.evidenceID))));
  }
  return index;
}

function indexCaptureEventsByCatalogID(events) {
  const index = new Map();
  for (const event of events) {
    if (!event.catalogCandidate) continue;
    const values = index.get(event.catalogCandidate) ?? [];
    values.push(event);
    index.set(event.catalogCandidate, values);
  }
  for (const [key, values] of index.entries()) {
    index.set(key, values.sort((a, b) => Number(a.beginningTimestamp ?? 0) - Number(b.beginningTimestamp ?? 0)));
  }
  return index;
}

function isResearchPackage(value) {
  return value?.packageLabel === researchImportLabel && value?.productionStatus === "NOT_PRODUCTION_DATA";
}

function inferKind(categoryName) {
  if (categoryName === "heads") return "head";
  return "additionalAttribute";
}

function check(name, passed, message) {
  return { name, passed, status: passed ? "passed" : "failed", message };
}

function issue(code, message, repairSuggestion = null) {
  return { code, message, repairSuggestion };
}

function splitPipe(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean).sort();
  return String(value).split("|").map((entry) => entry.trim()).filter(Boolean).sort();
}

function valueOrNull(value) {
  return hasKnownValue(value) ? value : null;
}

function hasKnownValue(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(hasKnownValue);
  const text = String(value).trim();
  return Boolean(text) && text !== "UNKNOWN" && text !== "unknown";
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readTextIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJSON(filePath, value) {
  fs.writeFileSync(filePath, `${stableStringify(value)}\n`, "utf8");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sourceDirectory = process.argv[2] ?? defaultSourceDirectory;
  const outputDirectory = process.argv[3] ?? defaultOutputDirectory;
  const result = importPartialResearchCatalog({ exportData: loadPartialResearchCatalogExport({ sourceDirectory }), sourceDirectory, outputDirectory });
  if (!result.report.ok) {
    console.error(formatImportReportMarkdown(result.report));
    process.exitCode = 1;
  } else {
    writePartialResearchImport(result, { outputDirectory });
    console.log(`Imported ${result.importedCatalog.records.length} partial research records to ${outputDirectory}`);
    console.log(researchImportLabel);
  }
}
