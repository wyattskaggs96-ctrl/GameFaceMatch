#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_PARTIAL_RESEARCH_EXPORT_SCHEMA_VERSION = "cf27-partial-research-catalog-export-v1";
export const researchPackageLabel = "PRIMARY RESEARCH CANDIDATE — NOT PRODUCTION VERIFIED";
export const defaultOutputDirectory = "data/research/cf27/exports/partial-research-catalog-current";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sourcePaths = {
  environmentManifest: "data/research/cf27/catalog-candidates/research/road-to-glory-creation-path/environment_manifest.json",
  creationPaths: "data/research/cf27/catalog-candidates/research/road-to-glory-creation-path/creation_paths.json",
  menuMap: "data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/menu_map_schema_export.json",
  roadIssues: "data/research/cf27/catalog-candidates/research/road-to-glory-creation-path/issues_and_exceptions.json",
  heads: "data/research/cf27/catalog-candidates/research/head-templates-faces-001-029/head_template_research_candidates.json",
  skinTones: "data/research/cf27/catalog-candidates/research/skin-tone-values-001-024/skin_tone_research_candidates.json",
  skinDetails: "data/research/cf27/catalog-candidates/research/skin-details-options-001-010/skin_details_research_candidates.json",
  eyeShapes: "data/research/cf27/catalog-candidates/research/eye-shape-options-001-005/eye_shape_research_candidates.json",
  eyeColors: "data/research/cf27/catalog-candidates/research/eye-color-options-001-007/eye_color_research_candidates.json",
  noses: "data/research/cf27/catalog-candidates/research/nose-options-001-007/nose_research_candidates.json",
  earShapes: "data/research/cf27/catalog-candidates/research/ear-shape-options-001-004/ear_shape_research_candidates.json",
  evidenceManifest: "data/research/cf27/manifests/current-evidence/current_evidence_manifest.json",
  evidenceManifestCSV: "data/research/cf27/manifests/current-evidence/current_evidence_manifest.csv",
  captureLog: "data/research/cf27/catalog-candidates/research/current-capture-log/capture_log.json",
  captureLogCSV: "data/research/cf27/catalog-candidates/research/current-capture-log/capture_log.csv",
  headTemplateQA: "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json"
};

const requiredPackageFiles = [
  "environment_manifest.json",
  "creation_paths.csv",
  "creation_paths.json",
  "menu_map.csv",
  "menu_map.json",
  "heads.csv",
  "heads.json",
  "skin_tones.csv",
  "skin_tones.json",
  "skin_details.csv",
  "skin_details.json",
  "eye_shapes.csv",
  "eye_shapes.json",
  "eye_colors.csv",
  "eye_colors.json",
  "noses.csv",
  "noses.json",
  "ear_shapes.csv",
  "ear_shapes.json",
  "evidence_manifest.csv",
  "evidence_manifest.json",
  "capture_log.csv",
  "capture_log.json",
  "issues_and_exceptions.csv",
  "recapture_queue.csv",
  "research_catalog_manifest.json"
];

const catalogColumnNames = [
  "stableInternalID",
  "nativeOrder",
  "category",
  "nativeOption",
  "kind",
  "verificationState",
  "productionStatus",
  "selectedEvidence",
  "sourceImageFrameIDs",
  "missingViews",
  "recaptureRequired",
  "notes"
];

export function buildPartialResearchCatalogPackage({ root = repositoryRoot } = {}) {
  const sources = loadSources(root);
  const evidenceFrameIDsByCatalog = buildEvidenceFrameIDsByCatalog(sources.evidenceManifest);
  const recaptureRequiredByCatalog = buildRecaptureRequiredByCatalog(sources);
  const categoryExports = {
    heads: catalogRows(sources.heads, "Head Template", { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog }),
    skin_tones: catalogRows(sources.skinTones, "Skin Tone", { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog }),
    skin_details: catalogRows(sources.skinDetails, "Skin Details", { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog }),
    eye_shapes: catalogRows(sources.eyeShapes, "Eye Shape", { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog }),
    eye_colors: catalogRows(sources.eyeColors, "Eye Color", { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog }),
    noses: catalogRows(sources.noses, "Nose", { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog }),
    ear_shapes: catalogRows(sources.earShapes, "Ear Shape", { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog })
  };
  const recaptureQueue = buildRecaptureQueue(sources);
  const issueRows = issueRowsFromRoadIssues(sources.roadIssues);
  const generatedAt = sources.captureLog.generatedAt ?? sources.evidenceManifest.generatedAt ?? "2026-07-13T00:00:00-04:00";
  const files = [];

  files.push(jsonFile("environment_manifest.json", packageWrapped("environmentManifest", sources.environmentManifest, generatedAt)));
  files.push(csvFile("creation_paths.csv", creationPathRows(sources.creationPaths), ["id", "displayName", "gameMode", "exactPath", "platformIDs", "observedPatchIDs", "verificationState", "productionStatus", "evidenceFileIDs"]));
  files.push(jsonFile("creation_paths.json", packageWrapped("creationPaths", { creationPaths: sortByKey(sources.creationPaths.creationPaths ?? [], "id") }, generatedAt)));
  files.push(csvFile("menu_map.csv", menuRows(sources.menuMap), ["stableMenuID", "parentMenuID", "displayLabel", "nativeLabel", "nativeOrder", "controlType", "verificationStatus", "environmentID", "evidenceFileIDs", "notes"]));
  files.push(jsonFile("menu_map.json", packageWrapped("menuMap", { ...sources.menuMap, items: sortByKey(sources.menuMap.items ?? [], "stableMenuID") }, generatedAt)));

  for (const [name, rows] of Object.entries(categoryExports)) {
    files.push(csvFile(`${name}.csv`, rows, catalogColumnNames));
    files.push(jsonFile(`${name}.json`, packageWrapped(name, { records: rows }, generatedAt)));
  }

  files.push({ fileName: "evidence_manifest.csv", contentUtf8: labelExistingCSV(normalizeLineEndings(fs.readFileSync(path.resolve(root, sourcePaths.evidenceManifestCSV), "utf8"))) });
  files.push(jsonFile("evidence_manifest.json", packageWrapped("evidenceManifest", sources.evidenceManifest, generatedAt)));
  files.push({ fileName: "capture_log.csv", contentUtf8: labelExistingCSV(normalizeLineEndings(fs.readFileSync(path.resolve(root, sourcePaths.captureLogCSV), "utf8"))) });
  files.push(jsonFile("capture_log.json", packageWrapped("captureLog", sources.captureLog, generatedAt)));
  files.push(csvFile("issues_and_exceptions.csv", issueRows, ["issueID", "issueKind", "severity", "status", "title", "affectedRecordIDs", "recaptureRequestID", "evidenceFileIDs", "description"]));
  files.push(csvFile("recapture_queue.csv", recaptureQueue, ["recaptureID", "catalogCandidate", "category", "nativeOption", "priority", "source", "reason", "requiredViews", "optionalViews", "status"]));

  const manifest = researchCatalogManifest({ sources, categoryExports, issueRows, recaptureQueue, generatedAt, files });
  files.push(jsonFile("research_catalog_manifest.json", manifest));
  files.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return { files, manifest };
}

export function writePartialResearchCatalogPackage(exportPackage, {
  root = repositoryRoot,
  outputDirectory = defaultOutputDirectory
} = {}) {
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  if (!absoluteOutputDirectory.startsWith(path.resolve(root, "data/research/cf27/exports"))) {
    throw new Error(`Refusing to write partial research export outside data/research/cf27/exports: ${outputDirectory}`);
  }
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  for (const file of exportPackage.files) {
    fs.writeFileSync(path.join(absoluteOutputDirectory, file.fileName), file.contentUtf8, "utf8");
  }
}

export function validatePartialResearchCatalogPackage(exportPackage, { outputDirectory = defaultOutputDirectory } = {}) {
  const fileNames = new Set(exportPackage.files.map((file) => file.fileName));
  const issues = [];
  for (const requiredFileName of requiredPackageFiles) {
    if (!fileNames.has(requiredFileName)) issues.push({ code: "missingRequiredExportFile", severity: "error", message: `Missing ${requiredFileName}` });
  }
  if (String(outputDirectory).includes("data/catalog/production")) {
    issues.push({ code: "productionDirectoryWriteBlocked", severity: "error", message: "Partial research export must not be placed in the production catalog directory." });
  }
  for (const file of exportPackage.files) {
    if (file.contentUtf8.includes("/Users/skaggssystems/")) issues.push({ code: "absolutePathLeak", severity: "error", message: `${file.fileName} contains a local absolute path.` });
    if (file.fileName !== "research_catalog_manifest.json" && !file.contentUtf8.includes("NOT_PRODUCTION") && !file.contentUtf8.includes("PRIMARY RESEARCH")) {
      issues.push({ code: "missingResearchLabel", severity: "warning", message: `${file.fileName} does not contain an explicit research/non-production label.` });
    }
  }
  return {
    status: issues.some((issue) => issue.severity === "error") ? "failed" : "passed",
    issues
  };
}

function loadSources(root) {
  return Object.fromEntries(Object.entries(sourcePaths)
    .filter(([key]) => !key.endsWith("CSV"))
    .map(([key, relativePath]) => [key, readJSON(path.resolve(root, relativePath))]));
}

function packageWrapped(exportType, payload, generatedAt) {
  return {
    schemaVersion: CF27_PARTIAL_RESEARCH_EXPORT_SCHEMA_VERSION,
    packageLabel: researchPackageLabel,
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    generatedAt,
    exportType,
    payload
  };
}

function creationPathRows(creationPaths) {
  return sortByKey(creationPaths.creationPaths ?? [], "id").map((item) => ({
    id: item.id,
    displayName: item.displayName,
    gameMode: item.gameMode,
    exactPath: item.exactPath,
    platformIDs: joinList(item.platformIDs),
    observedPatchIDs: joinList(item.observedPatchIDs),
    verificationState: item.verificationState,
    productionStatus: item.productionStatus,
    evidenceFileIDs: joinList(item.evidenceFileIDs)
  }));
}

function menuRows(menuMap) {
  return sortByKey(menuMap.items ?? [], "stableMenuID").map((item) => ({
    stableMenuID: item.stableMenuID,
    parentMenuID: item.parentMenuID ?? "",
    displayLabel: item.displayLabel,
    nativeLabel: item.nativeLabel,
    nativeOrder: item.nativeOrder ?? "",
    controlType: item.controlType,
    verificationStatus: item.verificationStatus,
    environmentID: item.environmentID,
    evidenceFileIDs: joinList((item.evidence ?? []).map((entry) => entry.evidenceFileID)),
    notes: item.notes ?? ""
  }));
}

function catalogRows(packageJSON, fallbackCategory, { evidenceFrameIDsByCatalog, recaptureRequiredByCatalog }) {
  return sortByNumberThenString(packageJSON.records ?? [], "nativeOrder", "stableInternalID").map((record) => ({
    stableInternalID: record.stableInternalID,
    nativeOrder: record.nativeOrder,
    category: record.category ?? fallbackCategory,
    nativeOption: record.visibleGameLabelOrIndex ?? record.nativeLabelOriginalText ?? "",
    kind: record.kind ?? "",
    verificationState: record.verificationState ?? packageJSON.verificationStateForAllRecords ?? packageJSON.verificationStatus,
    productionStatus: record.productionStatus ?? packageJSON.productionStatus ?? "NOT_PRODUCTION_DATA",
    selectedEvidence: joinList((record.selectedMenuEvidence ?? []).map((evidence) => `${evidence.videoID}:${evidence.timestampRangeSeconds}`)),
    sourceImageFrameIDs: joinList([
      ...(record.sourceImageReferences ?? []).map((reference) => reference.frameID),
      ...(evidenceFrameIDsByCatalog.get(record.stableInternalID) ?? [])
    ]),
    missingViews: joinList(record.missingViews),
    recaptureRequired: Boolean(record.recaptureNeed?.required || recaptureRequiredByCatalog.has(record.stableInternalID)),
    notes: summarizeCatalogRecord(record)
  }));
}

function buildEvidenceFrameIDsByCatalog(evidenceManifest) {
  const index = new Map();
  for (const entry of evidenceManifest.entries ?? []) {
    if (entry.masterOrDerivative !== "derivative" || !entry.catalogID) continue;
    const values = index.get(entry.catalogID) ?? [];
    values.push(entry.evidenceID);
    index.set(entry.catalogID, values);
  }
  for (const [key, values] of index.entries()) index.set(key, [...new Set(values)].sort());
  return index;
}

function buildRecaptureRequiredByCatalog(sources) {
  const ids = new Set();
  for (const entry of sources.headTemplateQA.recaptureQueue ?? []) ids.add(entry.stableInternalID);
  for (const packageJSON of [sources.noses, sources.earShapes]) {
    for (const record of packageJSON.records ?? []) {
      if (record.recaptureNeed?.required) ids.add(record.stableInternalID);
    }
  }
  return ids;
}

function buildRecaptureQueue(sources) {
  const rows = [];
  for (const entry of sources.headTemplateQA.recaptureQueue ?? []) {
    rows.push({
      recaptureID: `recapture-${entry.stableInternalID.toLowerCase()}`,
      catalogCandidate: entry.stableInternalID,
      category: "Head Template",
      nativeOption: entry.visibleGameLabelOrIndex,
      priority: entry.priority,
      source: "head_template_standardization_qa",
      reason: entry.recaptureReason,
      requiredViews: joinList(entry.requiredViews),
      optionalViews: joinList(entry.optionalViews),
      status: "open"
    });
  }
  for (const packageJSON of [sources.noses, sources.earShapes]) {
    for (const record of packageJSON.records ?? []) {
      if (!record.recaptureNeed?.required) continue;
      rows.push({
        recaptureID: `recapture-${record.stableInternalID.toLowerCase()}`,
        catalogCandidate: record.stableInternalID,
        category: record.category,
        nativeOption: record.visibleGameLabelOrIndex ?? record.nativeLabelOriginalText,
        priority: "HIGH",
        source: "research_candidate_recapture_need",
        reason: joinList(record.recaptureNeed.reasons),
        requiredViews: "",
        optionalViews: "",
        status: "open"
      });
    }
  }
  for (const issue of sources.roadIssues.issues ?? []) {
    if (!issue.recaptureRequestID) continue;
    rows.push({
      recaptureID: issue.recaptureRequestID,
      catalogCandidate: joinList(issue.affectedRecordIDs),
      category: "Environment",
      nativeOption: "",
      priority: issue.severity,
      source: "issues_and_exceptions",
      reason: issue.description,
      requiredViews: "",
      optionalViews: "",
      status: issue.status
    });
  }
  return sortByKey(rows, "recaptureID");
}

function issueRowsFromRoadIssues(roadIssues) {
  return sortByKey(roadIssues.issues ?? [], "issueID").map((issue) => ({
    issueID: issue.issueID,
    issueKind: issue.issueKind,
    severity: issue.severity,
    status: issue.status,
    title: issue.title,
    affectedRecordIDs: joinList(issue.affectedRecordIDs),
    recaptureRequestID: issue.recaptureRequestID ?? "",
    evidenceFileIDs: joinList(issue.evidenceFileIDs),
    description: issue.description
  }));
}

function researchCatalogManifest({ sources, categoryExports, issueRows, recaptureQueue, generatedAt, files }) {
  const exportFiles = files.map((file) => ({
    fileName: file.fileName,
    sha256: sha256Text(file.contentUtf8),
    sizeBytes: Buffer.byteLength(file.contentUtf8, "utf8")
  })).sort((a, b) => a.fileName.localeCompare(b.fileName));
  const categoryCounts = Object.fromEntries(Object.entries(categoryExports).map(([key, rows]) => [key, rows.length]));
  const totalRecords = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  return {
    schemaVersion: CF27_PARTIAL_RESEARCH_EXPORT_SCHEMA_VERSION,
    packageLabel: researchPackageLabel,
    generatedAt,
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
    outputPolicy: {
      productionCatalogDirectoryUsed: false,
      productionRecommendationsEnabled: false,
      fixtureRecordsIncluded: false,
      sourceMastersCopied: false,
      generatedDerivativesCopied: false,
      note: "This package exports current research metadata only. It is blocked from production recommendations until second-person verification and publish gates pass."
    },
    sourcePaths,
    counts: {
      environments: 1,
      creationPaths: (sources.creationPaths.creationPaths ?? []).length,
      menuItems: (sources.menuMap.items ?? []).length,
      ...categoryCounts,
      totalResearchCatalogRecords: totalRecords,
      evidenceManifestEntries: (sources.evidenceManifest.entries ?? []).length,
      captureLogEvents: (sources.captureLog.events ?? []).length,
      issuesAndExceptions: issueRows.length,
      recaptureQueue: recaptureQueue.length
    },
    exportFiles
  };
}

function summarizeCatalogRecord(record) {
  const notes = [];
  if (record.captureCompleteness) notes.push(`captureCompleteness=${record.captureCompleteness}`);
  if (record.characterLoaded === false) notes.push("characterLoaded=false");
  if (record.notificationOverlayObserved) notes.push("notificationOverlayObserved=true");
  if (record.recaptureNeed?.required) notes.push(`recaptureRequired=${joinList(record.recaptureNeed.reasons)}`);
  if (record.eyeBlackObservation) notes.push(record.eyeBlackObservation);
  return notes.join(" ");
}

function jsonFile(fileName, value) {
  return { fileName, contentUtf8: `${stableStringify(value)}\n` };
}

function csvFile(fileName, rows, columns) {
  return { fileName, contentUtf8: serializeCSV(rows, columns) };
}

function serializeCSV(rows, columns) {
  const labeledColumns = ["packageLabel", ...columns];
  const lines = [labeledColumns.join(",")];
  for (const row of rows) lines.push(labeledColumns.map((column) => csvEscape(column === "packageLabel" ? researchPackageLabel : row[column] ?? "")).join(","));
  return `${lines.join("\n")}\n`;
}

function labelExistingCSV(value) {
  const lines = normalizeLineEndings(value).trimEnd().split("\n");
  if (lines.length === 0 || lines[0].trim() === "") return `packageLabel\n${csvEscape(researchPackageLabel)}\n`;
  return [
    `packageLabel,${lines[0]}`,
    ...lines.slice(1).map((line) => `${csvEscape(researchPackageLabel)},${line}`)
  ].join("\n") + "\n";
}

function csvEscape(value) {
  const text = Array.isArray(value) ? joinList(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function sortByKey(items, key) {
  return [...items].sort((first, second) => String(first[key] ?? "").localeCompare(String(second[key] ?? "")));
}

function sortByNumberThenString(items, numberKey, stringKey) {
  return [...items].sort((first, second) => {
    const firstNumber = Number(first[numberKey]);
    const secondNumber = Number(second[numberKey]);
    if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber) && firstNumber !== secondNumber) return firstNumber - secondNumber;
    return String(first[stringKey] ?? "").localeCompare(String(second[stringKey] ?? ""));
  });
}

function joinList(values) {
  return [...(values ?? [])].map((value) => String(value)).sort().join("|");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeLineEndings(value) {
  return value.replaceAll("\r\n", "\n");
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputDirectoryArg = process.argv[2] ?? defaultOutputDirectory;
  const exportPackage = buildPartialResearchCatalogPackage();
  const validation = validatePartialResearchCatalogPackage(exportPackage, { outputDirectory: outputDirectoryArg });
  if (validation.status !== "passed") {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
  } else {
    writePartialResearchCatalogPackage(exportPackage, { outputDirectory: outputDirectoryArg });
    console.log(`Wrote ${exportPackage.files.length} partial research catalog files to ${outputDirectoryArg}`);
    console.log(researchPackageLabel);
  }
}
