#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const requiredFileNames = [
  "environment_manifest.json",
  "creation_paths.csv",
  "creation_paths.json",
  "menu_map.csv",
  "menu_map.json",
  "heads.csv",
  "heads.json",
  "hairstyles.csv",
  "hairstyles.json",
  "facial_hair.csv",
  "facial_hair.json",
  "additional_attributes.csv",
  "additional_attributes.json",
  "dependency_tests.csv",
  "dependency_tests.json",
  "evidence_manifest.csv",
  "evidence_manifest.json",
  "capture_log.csv",
  "issues_and_exceptions.csv",
  "catalog_manifest.json",
  "verification_results.csv",
  "production_readiness.json"
];

const emptySnapshot = {
  schemaVersion: "phase0-domain-v1",
  generatedAt: "2026-07-12T00:00:00.000Z",
  auditEnvironments: [],
  creationPaths: [],
  menuItems: [],
  catalogItems: [],
  dependencyTests: [],
  evidenceFiles: [],
  captureEvents: [],
  issues: [],
  discrepancies: [],
  recaptureRequests: [],
  verificationRecords: []
};

function createExportPackage(snapshot, mode = "production") {
  const filtered = mode === "production" ? productionFilteredSnapshot(snapshot) : snapshot;
  const readiness = readinessReport(snapshot, filtered, mode);
  const files = [
    jsonFile("environment_manifest.json", { schemaVersion: "phase0-export-pipeline-v1", generatedAt: snapshot.generatedAt, environments: sortByID(filtered.auditEnvironments ?? []) }),
    csvFile("creation_paths.csv", creationPathRows(filtered), ["id", "gameID", "gameMode", "displayName", "exactPath", "platformIDs", "observedPatchIDs", "verificationState", "status", "stepCount", "evidenceFileIDs"]),
    jsonFile("creation_paths.json", creationPathRows(filtered)),
    csvFile("menu_map.csv", menuRows(filtered), ["id", "gameID", "creationPathID", "parentMenuItemID", "kind", "exactVisibleLabelOrIndex", "ordinal", "verificationState", "evidenceFileIDs"]),
    jsonFile("menu_map.json", menuRows(filtered)),
    csvFile("heads.csv", catalogRows(filtered, "head"), catalogColumns()),
    jsonFile("heads.json", catalogRows(filtered, "head")),
    csvFile("hairstyles.csv", catalogRows(filtered, "hairstyle"), catalogColumns()),
    jsonFile("hairstyles.json", catalogRows(filtered, "hairstyle")),
    csvFile("facial_hair.csv", catalogRows(filtered, "facialHair"), catalogColumns()),
    jsonFile("facial_hair.json", catalogRows(filtered, "facialHair")),
    csvFile("additional_attributes.csv", catalogRows(filtered, "additionalAttribute"), catalogColumns()),
    jsonFile("additional_attributes.json", catalogRows(filtered, "additionalAttribute")),
    csvFile("dependency_tests.csv", dependencyRows(filtered), ["id", "kind", "gameID", "platformIDs", "gameVersionIDs", "patchIDs", "catalogItemIDs", "hypothesis", "result", "evidenceFileIDs"]),
    jsonFile("dependency_tests.json", dependencyRows(filtered)),
    csvFile("evidence_manifest.csv", evidenceRows(filtered), ["id", "kind", "relativePath", "sha256", "storageScope", "containsRawFaceMedia", "approvedForProductionCatalog", "capturedAt", "capturedAngleID", "fileSizeBytes", "width", "height"]),
    jsonFile("evidence_manifest.json", evidenceRows(filtered)),
    csvFile("capture_log.csv", captureRows(filtered), ["id", "kind", "auditEnvironmentID", "captureConfigurationID", "catalogItemID", "angleID", "evidenceFileID", "capturedAt", "operatorID", "qualityState"]),
    csvFile("issues_and_exceptions.csv", issueRows(filtered), ["id", "type", "relatedEntityID", "severity", "status", "title", "description", "evidenceFileIDs", "resolvedAt"]),
    jsonFile("catalog_manifest.json", catalogManifest(filtered, readiness)),
    csvFile("verification_results.csv", verificationRows(filtered), ["id", "targetEntityID", "targetEntityType", "stage", "verifierID", "decision", "reviewedAt", "checklistVersion", "evidenceFileIDs", "discrepancyIDs"]),
    jsonFile("production_readiness.json", readiness)
  ];
  return { files, readiness };
}

function productionFilteredSnapshot(snapshot) {
  const catalogItems = (snapshot.catalogItems ?? []).filter((item) => !item.isTestFixture && item.isProductionCandidate);
  const catalogIDs = new Set(catalogItems.map((item) => item.id));
  return {
    ...snapshot,
    catalogItems,
    evidenceFiles: (snapshot.evidenceFiles ?? []).filter((item) => item.storageScope !== "testFixture" && !String(item.relativePath ?? "").includes("fixtures/test-only")),
    captureEvents: (snapshot.captureEvents ?? []).filter((item) => !item.catalogItemID || catalogIDs.has(item.catalogItemID)),
    dependencyTests: (snapshot.dependencyTests ?? []).filter((item) => !item.catalogItemIDs?.length || item.catalogItemIDs.some((id) => catalogIDs.has(id))),
    verificationRecords: (snapshot.verificationRecords ?? []).filter((item) => item.targetEntityType !== "catalogItem" || catalogIDs.has(item.targetEntityID)),
    issues: (snapshot.issues ?? []).filter((item) => !item.relatedEntityID || catalogIDs.has(item.relatedEntityID)),
    discrepancies: (snapshot.discrepancies ?? []).filter((item) => (item.relatedEntityIDs ?? []).some((id) => catalogIDs.has(id))),
    recaptureRequests: (snapshot.recaptureRequests ?? []).filter((item) => catalogIDs.has(item.catalogItemID))
  };
}

function readinessReport(snapshot, filtered, mode) {
  const fixtureRecordsExcluded = (snapshot.catalogItems ?? []).filter((item) => item.isTestFixture).map((item) => item.id).sort();
  const exported = (filtered.catalogItems ?? []).filter((item) => item.verificationState === "verified" && item.isProductionCandidate && !item.isTestFixture);
  return {
    schemaVersion: "phase0-export-pipeline-v1",
    generatedAt: snapshot.generatedAt,
    mode,
    ok: exported.length > 0,
    errors: [],
    warnings: exported.length === 0 ? ["Production catalog export contains zero verified records; recommendations remain unavailable."] : [],
    counts: {
      auditEnvironments: (filtered.auditEnvironments ?? []).length,
      creationPaths: (filtered.creationPaths ?? []).length,
      menuItems: (filtered.menuItems ?? []).length,
      heads: (filtered.catalogItems ?? []).filter((item) => item.kind === "head").length,
      hairstyles: (filtered.catalogItems ?? []).filter((item) => item.kind === "hairstyle").length,
      facialHair: (filtered.catalogItems ?? []).filter((item) => item.kind === "facialHair").length,
      additionalAttributes: (filtered.catalogItems ?? []).filter((item) => item.kind === "additionalAttribute").length,
      dependencyTests: (filtered.dependencyTests ?? []).length,
      evidenceFiles: (filtered.evidenceFiles ?? []).length,
      captureEvents: (filtered.captureEvents ?? []).length,
      issuesAndExceptions: (filtered.issues ?? []).length + (filtered.discrepancies ?? []).length + (filtered.recaptureRequests ?? []).length,
      verificationRecords: (filtered.verificationRecords ?? []).length,
      catalogItemsExported: exported.length,
      fixtureRecordsExcluded: fixtureRecordsExcluded.length
    },
    requiredFiles: requiredFileNames,
    fixtureRecordsExcluded
  };
}

function creationPathRows(snapshot) {
  return sortByID(snapshot.creationPaths ?? []).map((item) => ({
    id: item.id,
    gameID: item.gameID,
    gameMode: item.gameMode,
    displayName: item.displayName,
    exactPath: item.exactPath,
    platformIDs: joinList(item.platformIDs),
    observedPatchIDs: joinList(item.observedPatchIDs),
    verificationState: item.verificationState,
    status: item.status,
    stepCount: item.reproducibleSteps?.length ?? 0,
    evidenceFileIDs: joinList(item.evidenceFileIDs)
  }));
}

function menuRows(snapshot) {
  return sortByID(snapshot.menuItems ?? []).map((item) => ({
    id: item.id,
    gameID: item.gameID,
    creationPathID: item.creationPathID,
    parentMenuItemID: item.parentMenuItemID ?? "",
    kind: item.kind,
    exactVisibleLabelOrIndex: item.exactVisibleLabelOrIndex,
    ordinal: item.ordinal ?? "",
    verificationState: item.verificationState,
    evidenceFileIDs: joinList(item.evidenceFileIDs)
  }));
}

function catalogColumns() {
  return ["id", "stableInternalID", "kind", "categoryLabel", "exactVisibleLabelOrIndex", "platformID", "gameVersionID", "patchID", "creationPathID", "menuItemID", "verificationState", "isProductionCandidate", "catalogVersionID", "evidenceFileIDs"];
}

function catalogRows(snapshot, kind) {
  return sortByID((snapshot.catalogItems ?? []).filter((item) => item.kind === kind)).map((item) => ({
    id: item.id,
    stableInternalID: item.stableInternalID,
    kind: item.kind,
    categoryLabel: item.categoryLabel,
    exactVisibleLabelOrIndex: item.exactVisibleLabelOrIndex,
    platformID: item.platformID,
    gameVersionID: item.gameVersionID,
    patchID: item.patchID,
    creationPathID: item.creationPathID,
    menuItemID: item.menuItemID,
    verificationState: item.verificationState,
    isProductionCandidate: item.isProductionCandidate,
    catalogVersionID: item.catalogVersionID ?? "",
    evidenceFileIDs: joinList(item.evidenceFileIDs)
  }));
}

function dependencyRows(snapshot) {
  return sortByID(snapshot.dependencyTests ?? []).map((item) => ({
    id: item.id,
    kind: item.kind,
    gameID: item.gameID,
    platformIDs: joinList(item.platformIDs),
    gameVersionIDs: joinList(item.gameVersionIDs),
    patchIDs: joinList(item.patchIDs),
    catalogItemIDs: joinList(item.catalogItemIDs),
    hypothesis: item.hypothesis,
    result: item.result,
    evidenceFileIDs: joinList(item.evidenceFileIDs)
  }));
}

function evidenceRows(snapshot) {
  return sortByID(snapshot.evidenceFiles ?? []).map((item) => ({
    id: item.id,
    kind: item.kind,
    relativePath: item.relativePath,
    sha256: item.sha256 ?? "",
    storageScope: item.storageScope,
    containsRawFaceMedia: item.containsRawFaceMedia,
    approvedForProductionCatalog: item.approvedForProductionCatalog,
    capturedAt: item.capturedAt ?? "",
    capturedAngleID: item.capturedAngleID ?? "",
    fileSizeBytes: item.fileSizeBytes ?? "",
    width: item.width ?? "",
    height: item.height ?? ""
  }));
}

function captureRows(snapshot) {
  return sortByID(snapshot.captureEvents ?? []).map((item) => ({
    id: item.id,
    kind: item.kind,
    auditEnvironmentID: item.auditEnvironmentID,
    captureConfigurationID: item.captureConfigurationID,
    catalogItemID: item.catalogItemID ?? "",
    angleID: item.angleID,
    evidenceFileID: item.evidenceFileID,
    capturedAt: item.capturedAt,
    operatorID: item.operatorID,
    qualityState: item.qualityState
  }));
}

function issueRows(snapshot) {
  return [
    ...(snapshot.issues ?? []).map((item) => ({ id: item.id, type: "issue", relatedEntityID: item.relatedEntityID, severity: item.severity, status: item.status, title: item.title, description: item.description, evidenceFileIDs: "", resolvedAt: item.resolvedAt ?? "" })),
    ...(snapshot.discrepancies ?? []).map((item) => ({ id: item.id, type: "discrepancy", relatedEntityID: joinList(item.relatedEntityIDs), severity: item.severity, status: item.status, title: item.kind, description: item.description, evidenceFileIDs: joinList(item.evidenceFileIDs), resolvedAt: "" })),
    ...(snapshot.recaptureRequests ?? []).map((item) => ({ id: item.id, type: "recaptureRequest", relatedEntityID: item.catalogItemID, severity: item.status === "open" ? "blocking" : "info", status: item.status, title: "Recapture request", description: item.reason, evidenceFileIDs: joinList(item.completedCaptureEventIDs), resolvedAt: item.status === "completed" ? item.updatedAt : "" }))
  ].sort((first, second) => `${first.type}:${first.id}`.localeCompare(`${second.type}:${second.id}`));
}

function verificationRows(snapshot) {
  return sortByID(snapshot.verificationRecords ?? []).map((item) => ({
    id: item.id,
    targetEntityID: item.targetEntityID,
    targetEntityType: item.targetEntityType,
    stage: item.stage,
    verifierID: item.verifierID,
    decision: item.decision,
    reviewedAt: item.reviewedAt,
    checklistVersion: item.checklistVersion,
    evidenceFileIDs: joinList(item.evidenceFileIDs),
    discrepancyIDs: joinList(item.discrepancyIDs)
  }));
}

function catalogManifest(snapshot, readiness) {
  const items = (snapshot.catalogItems ?? []).filter((item) => item.verificationState === "verified" && item.isProductionCandidate && !item.isTestFixture).map((item) => ({
    id: item.id,
    stableInternalID: item.stableInternalID,
    kind: item.kind,
    categoryLabel: item.categoryLabel,
    exactVisibleLabelOrIndex: item.exactVisibleLabelOrIndex,
    evidenceFileIDs: joinList(item.evidenceFileIDs)
  }));
  return { schemaVersion: "phase0-export-pipeline-v1", sourceType: "production", generatedAt: snapshot.generatedAt, declaredItemCount: items.length, items, productionReadiness: { ok: readiness.ok, warningCount: readiness.warnings.length, errorCount: readiness.errors.length, fixtureRecordsExcluded: readiness.fixtureRecordsExcluded } };
}

function jsonFile(fileName, value) {
  return { fileName, contentUtf8: `${stableStringify(value)}\n` };
}

function csvFile(fileName, rows, columns) {
  return { fileName, contentUtf8: serializeCSV(rows, columns) };
}

function serializeCSV(rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvEscape(row[column] ?? "")).join(","));
  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function sortByID(items) {
  return [...items].sort((first, second) => String(first.id).localeCompare(String(second.id)));
}

function joinList(values) {
  return [...(values ?? [])].sort().join("|");
}

function run(argv) {
  if (argv[0] === "--check") {
    const exportPackage = createExportPackage(emptySnapshot);
    const present = new Set(exportPackage.files.map((file) => file.fileName));
    const missing = requiredFileNames.filter((fileName) => !present.has(fileName));
    if (missing.length > 0) {
      console.error(`Missing export files: ${missing.join(", ")}`);
      return 1;
    }
    console.log(`Phase 0 export check OK (${exportPackage.files.length} files).`);
    return 0;
  }

  const [snapshotPath, outputDirectory, mode = "production"] = argv;
  if (!snapshotPath || !outputDirectory) {
    console.error("Usage: node scripts/phase-zero-export.mjs <snapshot.json> <output-directory> [production|audit]");
    console.error("       node scripts/phase-zero-export.mjs --check");
    return 1;
  }
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const exportPackage = createExportPackage(snapshot, mode === "audit" ? "audit" : "production");
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const file of exportPackage.files) {
    fs.writeFileSync(path.join(outputDirectory, file.fileName), file.contentUtf8, "utf8");
  }
  console.log(`Wrote ${exportPackage.files.length} Phase 0 export files to ${outputDirectory}`);
  if (exportPackage.readiness.fixtureRecordsExcluded.length > 0) {
    console.log(`Excluded fixture records: ${exportPackage.readiness.fixtureRecordsExcluded.join(", ")}`);
  }
  return 0;
}

process.exitCode = run(process.argv.slice(2));
