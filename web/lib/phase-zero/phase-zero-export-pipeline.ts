import type {
  Phase0CatalogItem,
  Phase0DomainSnapshot,
  Phase0Issue,
  Phase0RecaptureRequest,
  Phase0Discrepancy,
  Phase0EvidenceFile
} from "./phase-zero-domain";
import { validatePhase0DomainSnapshot } from "./phase-zero-domain";

export const PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION = "phase0-export-pipeline-v1";

export const PHASE0_REQUIRED_EXPORT_FILE_NAMES = [
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
] as const;

export type Phase0ExportFileName = typeof PHASE0_REQUIRED_EXPORT_FILE_NAMES[number];
export type Phase0ExportMode = "audit" | "production";

export interface Phase0ExportFile {
  fileName: Phase0ExportFileName;
  contentType: "application/json; charset=utf-8" | "text/csv; charset=utf-8";
  contentUtf8: string;
}

export interface Phase0ProductionReadinessExport {
  schemaVersion: typeof PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION;
  generatedAt: string;
  mode: Phase0ExportMode;
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: {
    auditEnvironments: number;
    creationPaths: number;
    menuItems: number;
    heads: number;
    hairstyles: number;
    facialHair: number;
    additionalAttributes: number;
    dependencyTests: number;
    evidenceFiles: number;
    captureEvents: number;
    issuesAndExceptions: number;
    verificationRecords: number;
    catalogItemsExported: number;
    fixtureRecordsExcluded: number;
  };
  requiredFiles: Phase0ExportFileName[];
  fixtureRecordsExcluded: string[];
}

export interface Phase0ExportPackage {
  schemaVersion: typeof PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION;
  generatedAt: string;
  mode: Phase0ExportMode;
  files: Phase0ExportFile[];
  productionReadiness: Phase0ProductionReadinessExport;
}

export function createPhase0ExportPackage(snapshot: Phase0DomainSnapshot, mode: Phase0ExportMode = "production"): Phase0ExportPackage {
  const generatedAt = snapshot.generatedAt;
  const exportSnapshot = mode === "production" ? productionFilteredSnapshot(snapshot) : snapshot;
  const readiness = createProductionReadiness(snapshot, exportSnapshot, mode);
  const catalogManifest = createCatalogManifestExport(exportSnapshot, readiness);
  const files: Phase0ExportFile[] = [
    jsonFile("environment_manifest.json", {
      schemaVersion: PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION,
      generatedAt,
      environments: sortByID(exportSnapshot.auditEnvironments)
    }),
    csvFile("creation_paths.csv", creationPathRows(exportSnapshot), creationPathColumns),
    jsonFile("creation_paths.json", creationPathRows(exportSnapshot)),
    csvFile("menu_map.csv", menuRows(exportSnapshot), menuColumns),
    jsonFile("menu_map.json", menuRows(exportSnapshot)),
    csvFile("heads.csv", catalogRows(exportSnapshot, "head"), catalogColumns),
    jsonFile("heads.json", catalogRows(exportSnapshot, "head")),
    csvFile("hairstyles.csv", catalogRows(exportSnapshot, "hairstyle"), catalogColumns),
    jsonFile("hairstyles.json", catalogRows(exportSnapshot, "hairstyle")),
    csvFile("facial_hair.csv", catalogRows(exportSnapshot, "facialHair"), catalogColumns),
    jsonFile("facial_hair.json", catalogRows(exportSnapshot, "facialHair")),
    csvFile("additional_attributes.csv", catalogRows(exportSnapshot, "additionalAttribute"), catalogColumns),
    jsonFile("additional_attributes.json", catalogRows(exportSnapshot, "additionalAttribute")),
    csvFile("dependency_tests.csv", dependencyRows(exportSnapshot), dependencyColumns),
    jsonFile("dependency_tests.json", dependencyRows(exportSnapshot)),
    csvFile("evidence_manifest.csv", evidenceRows(exportSnapshot), evidenceColumns),
    jsonFile("evidence_manifest.json", evidenceRows(exportSnapshot)),
    csvFile("capture_log.csv", captureRows(exportSnapshot), captureColumns),
    csvFile("issues_and_exceptions.csv", issueRows(exportSnapshot), issueColumns),
    jsonFile("catalog_manifest.json", catalogManifest),
    csvFile("verification_results.csv", verificationRows(exportSnapshot), verificationColumns),
    jsonFile("production_readiness.json", readiness)
  ];

  return {
    schemaVersion: PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION,
    generatedAt,
    mode,
    files: sortFiles(files),
    productionReadiness: readiness
  };
}

export function assertCompletePhase0ExportPackage(exportPackage: Phase0ExportPackage) {
  const present = new Set(exportPackage.files.map((file) => file.fileName));
  const missing = PHASE0_REQUIRED_EXPORT_FILE_NAMES.filter((fileName) => !present.has(fileName));
  if (missing.length > 0) {
    throw new Error(`Phase 0 export package is missing required files: ${missing.join(", ")}`);
  }
}

const creationPathColumns = [
  "id",
  "gameID",
  "gameMode",
  "displayName",
  "exactPath",
  "platformIDs",
  "observedPatchIDs",
  "verificationState",
  "status",
  "stepCount",
  "evidenceFileIDs"
];
const menuColumns = ["id", "gameID", "creationPathID", "parentMenuItemID", "kind", "exactVisibleLabelOrIndex", "ordinal", "verificationState", "evidenceFileIDs"];
const catalogColumns = [
  "id",
  "stableInternalID",
  "kind",
  "categoryLabel",
  "exactVisibleLabelOrIndex",
  "platformID",
  "gameVersionID",
  "patchID",
  "creationPathID",
  "menuItemID",
  "verificationState",
  "isProductionCandidate",
  "catalogVersionID",
  "evidenceFileIDs"
];
const dependencyColumns = ["id", "kind", "gameID", "platformIDs", "gameVersionIDs", "patchIDs", "catalogItemIDs", "hypothesis", "result", "evidenceFileIDs"];
const evidenceColumns = [
  "id",
  "kind",
  "relativePath",
  "sha256",
  "storageScope",
  "containsRawFaceMedia",
  "approvedForProductionCatalog",
  "capturedAt",
  "capturedAngleID",
  "fileSizeBytes",
  "width",
  "height"
];
const captureColumns = ["id", "kind", "auditEnvironmentID", "captureConfigurationID", "catalogItemID", "angleID", "evidenceFileID", "capturedAt", "operatorID", "qualityState"];
const issueColumns = ["id", "type", "relatedEntityID", "severity", "status", "title", "description", "evidenceFileIDs", "resolvedAt"];
const verificationColumns = ["id", "targetEntityID", "targetEntityType", "stage", "verifierID", "decision", "reviewedAt", "checklistVersion", "evidenceFileIDs", "discrepancyIDs"];

function productionFilteredSnapshot(snapshot: Phase0DomainSnapshot): Phase0DomainSnapshot {
  const catalogItems = snapshot.catalogItems.filter((item) => !item.isTestFixture && item.isProductionCandidate);
  const catalogItemIDs = new Set(catalogItems.map((item) => item.id));
  const productionEvidenceIDs = new Set(
    snapshot.evidenceFiles
      .filter((file) => !isFixtureEvidence(file) && (file.storageScope === "productionReference" || file.approvedForProductionCatalog))
      .map((file) => file.id)
  );
  return {
    ...snapshot,
    catalogItems,
    evidenceFiles: snapshot.evidenceFiles.filter((file) => productionEvidenceIDs.has(file.id)),
    captureEvents: snapshot.captureEvents.filter((event) => !event.catalogItemID || catalogItemIDs.has(event.catalogItemID)),
    issues: snapshot.issues.filter((issue) => catalogItemIDs.has(issue.relatedEntityID) || !issue.relatedEntityID),
    recaptureRequests: snapshot.recaptureRequests.filter((request) => catalogItemIDs.has(request.catalogItemID)),
    verificationRecords: snapshot.verificationRecords.filter((record) => catalogItemIDs.has(record.targetEntityID) || record.targetEntityType !== "catalogItem"),
    discrepancies: snapshot.discrepancies.filter((discrepancy) => discrepancy.relatedEntityIDs.some((id) => catalogItemIDs.has(id))),
    dependencyTests: snapshot.dependencyTests.filter((test) => test.catalogItemIDs.length === 0 || test.catalogItemIDs.some((id) => catalogItemIDs.has(id)))
  };
}

function createProductionReadiness(snapshot: Phase0DomainSnapshot, exportSnapshot: Phase0DomainSnapshot, mode: Phase0ExportMode): Phase0ProductionReadinessExport {
  const validation = validatePhase0DomainSnapshot(snapshot);
  const fixtureRecordsExcluded = snapshot.catalogItems.filter((item) => item.isTestFixture).map((item) => item.id).sort();
  const exportableItems = exportSnapshot.catalogItems.filter((item) => item.verificationState === "verified" && item.isProductionCandidate && !item.isTestFixture);
  const errors = validation.errors.map((error) => `${error.code}: ${error.message}`);
  if (mode === "production") {
    for (const item of exportSnapshot.catalogItems) {
      if (item.verificationState !== "verified") errors.push(`unverifiedProductionCandidate: ${item.id} is not verified.`);
      if (item.isTestFixture) errors.push(`fixtureProductionCandidate: ${item.id} is marked as a fixture.`);
    }
  }
  const warnings = validation.warnings.map((warning) => `${warning.code}: ${warning.message}`);
  if (exportableItems.length === 0) warnings.push("Production catalog export contains zero verified records; recommendations remain unavailable.");

  return {
    schemaVersion: PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION,
    generatedAt: snapshot.generatedAt,
    mode,
    ok: errors.length === 0 && exportableItems.length > 0,
    errors: errors.sort(),
    warnings: warnings.sort(),
    counts: {
      auditEnvironments: exportSnapshot.auditEnvironments.length,
      creationPaths: exportSnapshot.creationPaths.length,
      menuItems: exportSnapshot.menuItems.length,
      heads: exportSnapshot.catalogItems.filter((item) => item.kind === "head").length,
      hairstyles: exportSnapshot.catalogItems.filter((item) => item.kind === "hairstyle").length,
      facialHair: exportSnapshot.catalogItems.filter((item) => item.kind === "facialHair").length,
      additionalAttributes: exportSnapshot.catalogItems.filter((item) => item.kind === "additionalAttribute").length,
      dependencyTests: exportSnapshot.dependencyTests.length,
      evidenceFiles: exportSnapshot.evidenceFiles.length,
      captureEvents: exportSnapshot.captureEvents.length,
      issuesAndExceptions: exportSnapshot.issues.length + exportSnapshot.discrepancies.length + exportSnapshot.recaptureRequests.length,
      verificationRecords: exportSnapshot.verificationRecords.length,
      catalogItemsExported: exportableItems.length,
      fixtureRecordsExcluded: fixtureRecordsExcluded.length
    },
    requiredFiles: [...PHASE0_REQUIRED_EXPORT_FILE_NAMES],
    fixtureRecordsExcluded
  };
}

function createCatalogManifestExport(snapshot: Phase0DomainSnapshot, readiness: Phase0ProductionReadinessExport) {
  const items = snapshot.catalogItems
    .filter((item) => item.verificationState === "verified" && item.isProductionCandidate && !item.isTestFixture)
    .map((item) => catalogRow(item));
  return {
    schemaVersion: PHASE0_EXPORT_PIPELINE_SCHEMA_VERSION,
    sourceType: "production",
    generatedAt: snapshot.generatedAt,
    declaredItemCount: items.length,
    items,
    productionReadiness: {
      ok: readiness.ok,
      warningCount: readiness.warnings.length,
      errorCount: readiness.errors.length,
      fixtureRecordsExcluded: readiness.fixtureRecordsExcluded
    }
  };
}

function creationPathRows(snapshot: Phase0DomainSnapshot) {
  return sortByID(snapshot.creationPaths).map((item) => ({
    id: item.id,
    gameID: item.gameID,
    gameMode: item.gameMode,
    displayName: item.displayName,
    exactPath: item.exactPath,
    platformIDs: joinList(item.platformIDs),
    observedPatchIDs: joinList(item.observedPatchIDs),
    verificationState: item.verificationState,
    status: item.status,
    stepCount: item.reproducibleSteps.length,
    evidenceFileIDs: joinList(item.evidenceFileIDs)
  }));
}

function menuRows(snapshot: Phase0DomainSnapshot) {
  return sortByID(snapshot.menuItems).map((item) => ({
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

function catalogRows(snapshot: Phase0DomainSnapshot, kind: Phase0CatalogItem["kind"]) {
  return sortByID(snapshot.catalogItems.filter((item) => item.kind === kind)).map(catalogRow);
}

function catalogRow(item: Phase0CatalogItem) {
  return {
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
  };
}

function dependencyRows(snapshot: Phase0DomainSnapshot) {
  return sortByID(snapshot.dependencyTests).map((item) => ({
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

function evidenceRows(snapshot: Phase0DomainSnapshot) {
  return sortByID(snapshot.evidenceFiles).map((item) => ({
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

function captureRows(snapshot: Phase0DomainSnapshot) {
  return sortByID(snapshot.captureEvents).map((item) => ({
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

function issueRows(snapshot: Phase0DomainSnapshot) {
  const issues = sortByID(snapshot.issues).map((item) => issueRow("issue", item));
  const discrepancies = sortByID(snapshot.discrepancies).map((item) => discrepancyRow(item));
  const recaptures = sortByID(snapshot.recaptureRequests).map((item) => recaptureRow(item));
  return [...issues, ...discrepancies, ...recaptures].sort((first, second) => `${first.type}:${first.id}`.localeCompare(`${second.type}:${second.id}`));
}

function issueRow(type: string, item: Phase0Issue) {
  return {
    id: item.id,
    type,
    relatedEntityID: item.relatedEntityID,
    severity: item.severity,
    status: item.status,
    title: item.title,
    description: item.description,
    evidenceFileIDs: "",
    resolvedAt: item.resolvedAt ?? ""
  };
}

function discrepancyRow(item: Phase0Discrepancy) {
  return {
    id: item.id,
    type: "discrepancy",
    relatedEntityID: joinList(item.relatedEntityIDs),
    severity: item.severity,
    status: item.status,
    title: item.kind,
    description: item.description,
    evidenceFileIDs: joinList(item.evidenceFileIDs),
    resolvedAt: ""
  };
}

function recaptureRow(item: Phase0RecaptureRequest) {
  return {
    id: item.id,
    type: "recaptureRequest",
    relatedEntityID: item.catalogItemID,
    severity: item.status === "open" ? "blocking" : "info",
    status: item.status,
    title: "Recapture request",
    description: item.reason,
    evidenceFileIDs: joinList(item.completedCaptureEventIDs),
    resolvedAt: item.status === "completed" ? item.updatedAt : ""
  };
}

function verificationRows(snapshot: Phase0DomainSnapshot) {
  return sortByID(snapshot.verificationRecords).map((item) => ({
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

function jsonFile(fileName: Phase0ExportFileName, value: unknown): Phase0ExportFile {
  return {
    fileName,
    contentType: "application/json; charset=utf-8",
    contentUtf8: `${stableStringify(value)}\n`
  };
}

function csvFile(fileName: Phase0ExportFileName, rows: Array<Record<string, unknown>>, columns: string[]): Phase0ExportFile {
  return {
    fileName,
    contentType: "text/csv; charset=utf-8",
    contentUtf8: serializeCSV(rows, columns)
  };
}

function serializeCSV(rows: Array<Record<string, unknown>>, columns: string[]) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value: unknown) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}

function sortByID<T extends { id: string }>(items: T[]) {
  return [...items].sort((first, second) => first.id.localeCompare(second.id));
}

function sortFiles(files: Phase0ExportFile[]) {
  const order = new Map(PHASE0_REQUIRED_EXPORT_FILE_NAMES.map((fileName, index) => [fileName, index]));
  return [...files].sort((first, second) => (order.get(first.fileName) ?? 999) - (order.get(second.fileName) ?? 999));
}

function joinList(values: string[]) {
  return [...values].sort().join("|");
}

function isFixtureEvidence(file: Phase0EvidenceFile) {
  return file.storageScope === "testFixture" || file.relativePath.toLowerCase().includes("fixtures/test-only") || file.relativePath.toLowerCase().includes("/test-only/");
}
