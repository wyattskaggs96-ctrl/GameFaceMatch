#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_RESEARCH_CATALOG_RELEASE_SCHEMA_VERSION = "cf27-research-catalog-release-v1";
export const CF27_RESEARCH_CATALOG_VERSION = "0.1.0-research.1";
export const defaultReleaseDirectory = `data/phase-zero/research-catalog-releases/${CF27_RESEARCH_CATALOG_VERSION}`;

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deterministicGeneratedAt = "2026-07-14T03:15:00-04:00";

const sourceExports = [
  { key: "environment_manifest", json: "data/phase-zero/environment_manifest.research.json", csv: null, arrayKey: null },
  { key: "creation_paths", json: "data/phase-zero/creation_paths.research.json", csv: "data/phase-zero/creation_paths.research.csv", arrayKey: "creationPaths" },
  { key: "menu_map", json: "data/phase-zero/menu_map.research.json", csv: "data/phase-zero/menu_map.research.csv", arrayKey: "records" },
  { key: "heads", json: "data/phase-zero/heads.research.json", csv: "data/phase-zero/heads.research.csv", arrayKey: "records" },
  { key: "hairstyles", json: "data/phase-zero/hairstyles.research.json", csv: "data/phase-zero/hairstyles.research.csv", arrayKey: "records" },
  { key: "hair_colors", json: "data/phase-zero/hair_colors.research.json", csv: "data/phase-zero/hair_colors.research.csv", arrayKey: "records" },
  { key: "facial_hair", json: "data/phase-zero/facial_hair.research.json", csv: "data/phase-zero/facial_hair.research.csv", arrayKey: "records" },
  { key: "facial_hair_colors", json: "data/phase-zero/facial_hair_colors.research.json", csv: "data/phase-zero/facial_hair_colors.research.csv", arrayKey: "records" },
  { key: "additional_attributes", json: "data/phase-zero/additional_attributes.research.json", csv: "data/phase-zero/additional_attributes.research.csv", arrayKey: "records" },
  { key: "body_controls", json: "data/phase-zero/body_controls.research.json", csv: "data/phase-zero/body_controls.research.csv", arrayKey: "records" },
  { key: "dependency_tests", json: "data/phase-zero/dependency_tests.research.json", csv: "data/phase-zero/dependency_tests.research.csv", arrayKey: "tests" },
  { key: "evidence_manifest", json: "data/phase-zero/evidence_manifest.json", csv: "data/phase-zero/evidence_manifest.csv", arrayKey: "entries" },
  { key: "capture_log", json: "data/phase-zero/capture_log.json", csv: "data/phase-zero/capture_log.csv", arrayKey: "events" },
  { key: "issues_and_exceptions", json: "data/phase-zero/issues_register.research.json", csv: null, arrayKey: "issues" },
  { key: "recapture_requests", json: "data/phase-zero/capture_requests.json", csv: "data/phase-zero/capture_requests.csv", arrayKey: "requests" }
];

const expectedReleaseFiles = [
  ...sourceExports.flatMap((source) => [`${source.key}.json`, `${source.key}.csv`]),
  "research_catalog_release_manifest.json",
  "research_catalog_release_validation.json",
  "research_catalog_release_validation.csv",
  "README.md"
].sort();

const allowedProductionStatuses = new Set(["NOT_PRODUCTION_DATA"]);
const allowedVerificationStatuses = new Set([
  "OBSERVED_PENDING_VERIFICATION",
  "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED",
  "NOT_VERIFIED",
  "REQUESTED_NOT_CAPTURED"
]);
const placeholderPattern = /REPLACE_WITH|Head 34/i;
const fixturePattern = /data\/fixtures\/test-only|testFixture|fixtureOnly|synthetic-test|test-only/i;
const collegeFootball26Pattern = /\b(College\s*Football\s*26|CFB?26|CF26|CollegeFootball26)\b/i;

export function buildResearchCatalogRelease({
  root = repositoryRoot,
  version = CF27_RESEARCH_CATALOG_VERSION,
  generatedAt = deterministicGeneratedAt
} = {}) {
  const normalizedRoot = path.resolve(root);
  const releaseFiles = [];
  const sourceSummaries = [];

  for (const source of sourceExports) {
    const jsonValue = readJSON(path.join(normalizedRoot, source.json));
    const jsonContent = `${JSON.stringify(jsonValue, null, 2)}\n`;
    const csvContent = source.csv
      ? normalizeLineEndings(fs.readFileSync(path.join(normalizedRoot, source.csv), "utf8"))
      : generatedCSVForSource(source, jsonValue);
    releaseFiles.push(fileRecord(`${source.key}.json`, jsonContent, "application/json; charset=utf-8", source.json));
    releaseFiles.push(fileRecord(`${source.key}.csv`, csvContent, "text/csv; charset=utf-8", source.csv ?? source.json));
    sourceSummaries.push(sourceSummary(source, jsonValue));
  }

  const preliminaryManifest = createManifest({ version, generatedAt, sourceSummaries, releaseFiles: [] });
  releaseFiles.push(fileRecord("research_catalog_release_manifest.json", `${JSON.stringify(preliminaryManifest, null, 2)}\n`, "application/json; charset=utf-8", null));
  const validation = validateResearchCatalogRelease({
    root: normalizedRoot,
    version,
    generatedAt,
    files: releaseFiles,
    sourceSummaries
  });
  releaseFiles.push(fileRecord("research_catalog_release_validation.json", `${JSON.stringify(validation, null, 2)}\n`, "application/json; charset=utf-8", null));
  releaseFiles.push(fileRecord("research_catalog_release_validation.csv", formatValidationCSV(validation), "text/csv; charset=utf-8", null));
  releaseFiles.push(fileRecord("README.md", formatReleaseReadme({ version, generatedAt, validation, sourceSummaries }), "text/markdown; charset=utf-8", null));

  const finalManifest = createManifest({ version, generatedAt, sourceSummaries, releaseFiles });
  const manifestIndex = releaseFiles.findIndex((file) => file.fileName === "research_catalog_release_manifest.json");
  releaseFiles[manifestIndex] = fileRecord("research_catalog_release_manifest.json", `${JSON.stringify(finalManifest, null, 2)}\n`, "application/json; charset=utf-8", null);

  const finalValidation = validateResearchCatalogRelease({
    root: normalizedRoot,
    version,
    generatedAt,
    files: releaseFiles,
    sourceSummaries
  });
  const validationIndex = releaseFiles.findIndex((file) => file.fileName === "research_catalog_release_validation.json");
  releaseFiles[validationIndex] = fileRecord("research_catalog_release_validation.json", `${JSON.stringify(finalValidation, null, 2)}\n`, "application/json; charset=utf-8", null);
  const validationCsvIndex = releaseFiles.findIndex((file) => file.fileName === "research_catalog_release_validation.csv");
  releaseFiles[validationCsvIndex] = fileRecord("research_catalog_release_validation.csv", formatValidationCSV(finalValidation), "text/csv; charset=utf-8", null);
  const readmeIndex = releaseFiles.findIndex((file) => file.fileName === "README.md");
  releaseFiles[readmeIndex] = fileRecord("README.md", formatReleaseReadme({ version, generatedAt, validation: finalValidation, sourceSummaries }), "text/markdown; charset=utf-8", null);

  return {
    schemaVersion: CF27_RESEARCH_CATALOG_RELEASE_SCHEMA_VERSION,
    version,
    generatedAt,
    releaseDirectory: `${defaultReleaseDirectory}`,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    productionRecommendationsEnabled: false,
    files: releaseFiles.sort((a, b) => a.fileName.localeCompare(b.fileName)),
    manifest: finalManifest,
    validation: finalValidation
  };
}

export function writeResearchCatalogRelease(release, {
  root = repositoryRoot,
  releaseDirectory = defaultReleaseDirectory
} = {}) {
  const absoluteReleaseDirectory = path.resolve(root, releaseDirectory);
  const allowedRoot = path.resolve(root, "data/phase-zero/research-catalog-releases");
  if (!absoluteReleaseDirectory.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Refusing to write research catalog release outside ${allowedRoot}: ${releaseDirectory}`);
  }
  fs.mkdirSync(absoluteReleaseDirectory, { recursive: true });
  for (const file of release.files) {
    fs.writeFileSync(path.join(absoluteReleaseDirectory, file.fileName), file.contentUtf8, "utf8");
  }
}

export function validateResearchCatalogRelease({ root = repositoryRoot, version = CF27_RESEARCH_CATALOG_VERSION, generatedAt = deterministicGeneratedAt, files, sourceSummaries }) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const fileMap = new Map(files.map((file) => [file.fileName, file]));
  const evidence = fileMap.has("evidence_manifest.json") ? JSON.parse(fileMap.get("evidence_manifest.json").contentUtf8) : { entries: [] };
  const evidenceIDs = new Set((evidence.entries ?? []).map((entry) => entry.evidence_id));
  const evidencePaths = new Set((evidence.entries ?? []).map((entry) => entry.relative_path));

  addCheck(checkExpectedFiles(fileMap, errors));
  addCheck(checkUtf8(files, errors));
  addCheck(checkForbiddenText(files, errors));
  addCheck(checkRequiredFields(fileMap, errors));
  addCheck(checkStatuses(fileMap, errors));
  addCheck(checkStableIDsAndNativeOrder(fileMap, errors, warnings));
  addCheck(checkEvidenceLinks(fileMap, evidenceIDs, evidencePaths, root, errors));
  addCheck(checkVersionPlatformModePath(fileMap, warnings));

  const status = errors.length > 0 ? "failed" : warnings.length > 0 ? "passed_with_warnings" : "passed";
  return {
    schemaVersion: `${CF27_RESEARCH_CATALOG_RELEASE_SCHEMA_VERSION}-validation`,
    version,
    generatedAt,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    productionRecommendationsEnabled: false,
    status,
    ok: errors.length === 0,
    summary: {
      filesChecked: files.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      sourceExports: sourceSummaries.length,
      totalRows: sourceSummaries.reduce((total, source) => total + source.recordCount, 0)
    },
    checks,
    errors,
    warnings
  };

  function addCheck(check) {
    checks.push(check);
  }
}

function createManifest({ version, generatedAt, sourceSummaries, releaseFiles }) {
  return {
    schemaVersion: CF27_RESEARCH_CATALOG_RELEASE_SCHEMA_VERSION,
    version,
    semver: version,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_RESEARCH_CATALOG_RELEASE_CANDIDATE",
    sourceType: "shippingGameVideoResearch",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    productionRecommendationsEnabled: false,
    releaseLabel: "PRIMARY RESEARCH CATALOG EXPORT - NOT PRODUCTION VERIFIED",
    versionDecision: "0.1.0-research.1 is the first semantic release-candidate package from the canonical data/phase-zero artifacts.",
    productionGate: {
      recommendationsEnabled: false,
      reason: "Records are research observations only. Second-person verification and catalog-manager approval have not occurred."
    },
    sourceExports: sourceSummaries,
    files: releaseFiles.map((file) => ({
      fileName: file.fileName,
      contentType: file.contentType,
      sha256: file.sha256,
      sizeBytes: file.sizeBytes,
      sourcePath: file.sourcePath
    })).sort((a, b) => a.fileName.localeCompare(b.fileName))
  };
}

function sourceSummary(source, value) {
  const records = recordsForSource(source, value);
  return {
    key: source.key,
    sourceJsonPath: source.json,
    sourceCsvPath: source.csv,
    jsonOutput: `${source.key}.json`,
    csvOutput: `${source.key}.csv`,
    recordCount: records.length,
    productionStatus: value.productionStatus ?? "NOT_PRODUCTION_DATA",
    verificationStatus: value.verificationStatus ?? "OBSERVED_PENDING_VERIFICATION"
  };
}

function generatedCSVForSource(source, value) {
  if (source.key === "environment_manifest") return objectRowsCSV([flattenRecord(value)], ["environmentID", "gameTitle", "platform", "consoleFamily", "gameVersion", "patchVersion", "gameMode", "roadToGloryPath", "verificationStatus", "productionStatus", "sourceVideo"]);
  if (source.key === "issues_and_exceptions") return objectRowsCSV((value.issues ?? []).map(flattenRecord), ["issueID", "kind", "severity", "status", "title", "owner", "affectedRecordIDs", "affectedEvidenceFileIDs", "createdAt", "updatedAt"]);
  return objectRowsCSV(recordsForSource(source, value).map(flattenRecord), null);
}

function recordsForSource(source, value) {
  if (!source.arrayKey) return [value];
  return value[source.arrayKey] ?? [];
}

function fileRecord(fileName, contentUtf8, contentType, sourcePath) {
  return {
    fileName,
    contentType,
    sourcePath,
    contentUtf8,
    sha256: sha256(contentUtf8),
    sizeBytes: Buffer.byteLength(contentUtf8, "utf8")
  };
}

function checkExpectedFiles(fileMap, errors) {
  const missing = expectedReleaseFiles.filter((fileName) => !fileMap.has(fileName));
  for (const fileName of missing) errors.push(issue("missingReleaseFile", `${fileName} is missing from the research release package.`));
  return check("expectedFiles", missing.length === 0, { expected: expectedReleaseFiles.length, missing });
}

function checkUtf8(files, errors) {
  const invalid = [];
  for (const file of files) {
    const buffer = Buffer.from(file.contentUtf8, "utf8");
    if (buffer.toString("utf8") !== file.contentUtf8 || file.contentUtf8.includes("\uFFFD")) invalid.push(file.fileName);
  }
  for (const fileName of invalid) errors.push(issue("invalidUtf8", `${fileName} is not clean UTF-8.`));
  return check("utf8", invalid.length === 0, { invalid });
}

function checkForbiddenText(files, errors) {
  const findings = [];
  for (const file of files) {
    if (placeholderPattern.test(file.contentUtf8)) findings.push({ fileName: file.fileName, code: "placeholderText" });
    if (fixturePattern.test(file.contentUtf8)) findings.push({ fileName: file.fileName, code: "fixtureContamination" });
    if (collegeFootball26Pattern.test(file.contentUtf8)) findings.push({ fileName: file.fileName, code: "collegeFootball26Contamination" });
    if (/\/Users\/skaggssystems\//.test(file.contentUtf8)) findings.push({ fileName: file.fileName, code: "absoluteLocalPath" });
  }
  for (const finding of findings) errors.push(issue(finding.code, `${finding.fileName} contains forbidden ${finding.code}.`));
  return check("noPlaceholdersFixturesOrForbiddenSources", findings.length === 0, { findings });
}

function checkRequiredFields(fileMap, errors) {
  const missing = [];
  for (const source of sourceExports) {
    const file = fileMap.get(`${source.key}.json`);
    if (!file) continue;
    const value = JSON.parse(file.contentUtf8);
    if (!value.schemaVersion) missing.push(`${source.key}.json:schemaVersion`);
    for (const record of recordsForSource(source, value)) {
      const id = recordID(record);
      if (!id) missing.push(`${source.key}.json:recordID`);
      if (source.key !== "issues_and_exceptions" && source.key !== "recapture_requests" && record.productionStatus === undefined && value.productionStatus === undefined) missing.push(`${source.key}.json:${id}:productionStatus`);
      if (source.key !== "issues_and_exceptions" && source.key !== "recapture_requests" && record.verificationStatus === undefined && record.verification_state === undefined && value.verificationStatus === undefined) missing.push(`${source.key}.json:${id}:verificationStatus`);
    }
  }
  for (const item of missing) errors.push(issue("missingRequiredField", `${item} is missing.`));
  return check("requiredFields", missing.length === 0, { missing });
}

function checkStatuses(fileMap, errors) {
  const invalid = [];
  for (const source of sourceExports) {
    const file = fileMap.get(`${source.key}.json`);
    if (!file) continue;
    const value = JSON.parse(file.contentUtf8);
    const topProductionStatus = value.productionStatus;
    const topVerificationStatus = value.verificationStatus;
    if (topProductionStatus && !allowedProductionStatuses.has(topProductionStatus)) invalid.push(`${source.key}.json:productionStatus:${topProductionStatus}`);
    if (topVerificationStatus && !allowedVerificationStatuses.has(topVerificationStatus)) invalid.push(`${source.key}.json:verificationStatus:${topVerificationStatus}`);
    if (value.productionRecommendationsEnabled === true) invalid.push(`${source.key}.json:productionRecommendationsEnabled:true`);
    for (const record of recordsForSource(source, value)) {
      const productionStatus = record.productionStatus;
      const verificationStatus = record.verificationStatus ?? record.verification_state;
      if (productionStatus && !allowedProductionStatuses.has(productionStatus)) invalid.push(`${source.key}.json:${recordID(record)}:productionStatus:${productionStatus}`);
      if (verificationStatus && !allowedVerificationStatuses.has(verificationStatus)) invalid.push(`${source.key}.json:${recordID(record)}:verificationStatus:${verificationStatus}`);
      if (productionStatus && productionStatus !== "NOT_PRODUCTION_DATA" && !String(verificationStatus).startsWith("VERIFIED")) {
        invalid.push(`${source.key}.json:${recordID(record)}:productionWithoutVerification`);
      }
    }
  }
  for (const item of invalid) errors.push(issue("invalidStatus", `${item} is not allowed in a research release.`));
  return check("enumValuesAndProductionStatus", invalid.length === 0, { invalid });
}

function checkStableIDsAndNativeOrder(fileMap, errors, warnings) {
  const duplicateIDs = [];
  const nativeOrderWarnings = [];
  for (const source of sourceExports) {
    const file = fileMap.get(`${source.key}.json`);
    if (!file) continue;
    const value = JSON.parse(file.contentUtf8);
    const seen = new Set();
    const nativeByGroup = new Map();
    for (const record of recordsForSource(source, value)) {
      const id = recordID(record);
      if (!id) continue;
      if (seen.has(id)) duplicateIDs.push(`${source.key}:${id}`);
      seen.add(id);
      if (record.nativeOrder !== undefined && record.nativeOrder !== null && record.nativeOrder !== "") {
        const numericOrder = Number(record.nativeOrder);
        if (!Number.isFinite(numericOrder) || numericOrder < 0) nativeOrderWarnings.push(`${source.key}:${id}:invalidNativeOrder`);
        const group = source.key === "menu_map"
          ? record.parentMenuID ?? "root"
          : record.category ?? record.displayedCategoryLabel ?? record.recordKind ?? source.key;
        const groupKey = `${source.key}:${group}`;
        if (!nativeByGroup.has(groupKey)) nativeByGroup.set(groupKey, new Set());
        const orders = nativeByGroup.get(groupKey);
        if (orders.has(numericOrder)) nativeOrderWarnings.push(`${groupKey}:duplicateNativeOrder:${numericOrder}`);
        orders.add(numericOrder);
      }
    }
  }
  for (const item of duplicateIDs) errors.push(issue("duplicateStableID", `${item} appears more than once.`));
  for (const item of nativeOrderWarnings) warnings.push(issue("nativeOrderWarning", `${item} requires human review or remains incomplete.`));
  return check("stableIDsAndNativeOrder", duplicateIDs.length === 0, { duplicateIDs, nativeOrderWarnings });
}

function checkEvidenceLinks(fileMap, evidenceIDs, evidencePaths, root, errors) {
  const invalidLinks = [];
  for (const source of sourceExports) {
    if (!["heads", "additional_attributes", "body_controls", "evidence_manifest", "capture_log"].includes(source.key)) continue;
    const file = fileMap.get(`${source.key}.json`);
    if (!file) continue;
    const value = JSON.parse(file.contentUtf8);
    for (const record of recordsForSource(source, value)) {
      const ids = collectEvidenceIDs(record);
      const paths = collectEvidencePaths(record);
      for (const id of ids) {
        if (!evidenceIDs.has(id)) invalidLinks.push(`${source.key}:${recordID(record)}:missingEvidenceID:${id}`);
      }
      for (const relativePath of paths) {
        if (!evidencePaths.has(relativePath) && !fs.existsSync(path.join(root, relativePath))) invalidLinks.push(`${source.key}:${recordID(record)}:missingEvidencePath:${relativePath}`);
      }
    }
  }
  for (const item of invalidLinks) errors.push(issue("invalidEvidenceLink", item));
  return check("evidenceLinks", invalidLinks.length === 0, { invalidLinks });
}

function checkVersionPlatformModePath(fileMap, warnings) {
  const notes = [];
  const environmentFile = fileMap.get("environment_manifest.json");
  const environment = environmentFile ? JSON.parse(environmentFile.contentUtf8) : {};
  for (const field of ["gameVersion", "patchVersion", "platform", "gameMode", "roadToGloryPath"]) {
    if (!(field in environment)) notes.push(`environment:${field}:missing`);
    else if (environment[field] === null || String(environment[field]).startsWith("UNKNOWN")) notes.push(`environment:${field}:unresolved`);
  }
  const headFile = fileMap.get("heads.json");
  const headRecords = headFile ? JSON.parse(headFile.contentUtf8).records ?? [] : [];
  if (headRecords.some((record) => String(record.stableResearchCatalogID ?? "").includes("XBOXUNKNOWN"))) {
    notes.push("heads:platformExactModel:unresolvedStableIDSegment");
  }
  for (const note of notes) warnings.push(issue("versionPlatformModePathLimitation", `${note} remains unresolved in research release ${CF27_RESEARCH_CATALOG_VERSION}.`));
  return check("versionPlatformModeAndCreationPath", true, { notes });
}

function collectEvidenceIDs(value) {
  const ids = [];
  visit(value, (key, child) => {
    if (/evidenceID$|evidence_id$/i.test(key) && typeof child === "string") ids.push(child);
    if ((key === "evidence_generated" || key === "affectedEvidenceFileIDs") && Array.isArray(child)) {
      for (const item of child) if (typeof item === "string") ids.push(item);
    }
  });
  return ids;
}

function collectEvidencePaths(value) {
  const paths = [];
  visit(value, (key, child) => {
    if (typeof child === "string" && /evidenceFramePath$|frameManifestPath$|relativePath$|path$/i.test(key) && child.startsWith("data/")) paths.push(child);
  });
  return paths;
}

function visit(value, callback) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, callback);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    callback(key, child);
    visit(child, callback);
  }
}

function flattenRecord(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Array.isArray(value) ? value.join("|") : value && typeof value === "object" ? JSON.stringify(value) : value ?? ""]));
}

function objectRowsCSV(rows, preferredColumns = null) {
  const columns = preferredColumns ?? [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  return `${[
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column] ?? "")).join(","))
  ].join("\n")}\n`;
}

function formatValidationCSV(validation) {
  return objectRowsCSV(validation.checks.map((item) => ({
    name: item.name,
    ok: item.ok,
    detail: JSON.stringify(item.detail)
  })), ["name", "ok", "detail"]);
}

function formatReleaseReadme({ version, generatedAt, validation, sourceSummaries }) {
  const lines = [
    `# CF27 Research Catalog Release ${version}`,
    "",
    "**Status:** PRIMARY RESEARCH CATALOG EXPORT - NOT PRODUCTION VERIFIED",
    "",
    "This package is a versioned research export from the canonical `data/phase-zero` artifacts. It does not contain production-verified College Football 27 catalog records and must not enable user-facing recommendations.",
    "",
    `- Generated at: ${generatedAt}`,
    `- Validation status: ${validation.status}`,
    `- Export families: ${sourceSummaries.length}`,
    `- Total exported rows: ${validation.summary.totalRows}`,
    `- Production recommendations enabled: false`,
    "",
    "## Export Families",
    "",
    ...sourceSummaries.map((source) => `- ${source.key}: ${source.recordCount} row(s)`),
    "",
    "## Known Research Limitations",
    "",
    "- Exact game executable version and patch remain unresolved.",
    "- Exact Xbox model/platform detail remains unresolved in current stable research IDs.",
    "- No record has second-person verification or catalog-manager production approval.",
    "- Production catalog remains empty."
  ];
  return `${lines.join("\n")}\n`;
}

function recordID(record) {
  return record.stableResearchCatalogID ?? record.stableResearchID ?? record.stableMenuID ?? record.environmentID ?? record.id ?? record.testID ?? record.evidence_id ?? record.capture_event_id ?? record.issueID ?? record.captureID ?? null;
}

function check(name, ok, detail) {
  return { name, ok, detail };
}

function issue(code, message) {
  return { code, message };
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeLineEndings(value) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checkOnly = process.argv.includes("--check");
  const release = buildResearchCatalogRelease();
  if (checkOnly) {
    const staleFiles = [];
    for (const file of release.files) {
      const outputPath = path.resolve(repositoryRoot, defaultReleaseDirectory, file.fileName);
      if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== file.contentUtf8) staleFiles.push(file.fileName);
    }
    if (staleFiles.length > 0) {
      console.error(`${defaultReleaseDirectory} is stale. Run npm run cf27:research-catalog-release.`);
      console.error(`Stale files: ${staleFiles.join(", ")}`);
      process.exit(1);
    }
  } else {
    writeResearchCatalogRelease(release);
  }
  console.log(JSON.stringify({
    version: release.version,
    status: release.validation.status,
    files: release.files.length,
    warnings: release.validation.summary.warningCount,
    errors: release.validation.summary.errorCount
  }, null, 2));
  if (!release.validation.ok) process.exitCode = 1;
}
