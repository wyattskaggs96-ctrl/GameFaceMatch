#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_RESEARCH_PACKAGE_VALIDATION_VERSION = "cf27-current-research-package-validation-v1";
export const researchPackageValidationLabel = "CURRENT RESEARCH PACKAGE VALIDATION - PRIMARY RESEARCH ONLY - NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSourceDirectory = "data/research/cf27/exports/partial-research-catalog-current";
const defaultOutputDirectory = "data/research/cf27/reports/current-research-package-validation";
const defaultDocsPath = "docs/catalog/CURRENT_RESEARCH_PACKAGE_VALIDATION.md";

const categoryFiles = [
  "heads",
  "skin_tones",
  "skin_details",
  "eye_shapes",
  "eye_colors",
  "noses",
  "ear_shapes"
];

const allowedPackageVerificationStatuses = new Set(["PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED"]);
const allowedRecordVerificationStatuses = new Set(["NOT_VERIFIED", "PRIMARY_RESEARCH_ONLY_NOT_SECOND_VERIFIED"]);
const forbiddenProductionValues = new Set(["PRODUCTION_DATA", "PRODUCTION", "VERIFIED"]);
const contaminationPattern = /data\/fixtures\/test-only|testFixture|fixtureOnly|synthetic-catalog|synthetic-match/i;
const collegeFootball26Pattern = /\b(College\s*Football\s*26|CFB?26|CF26|CollegeFootball26)\b/i;
const fabricatedVersionPattern = /(?:\b\d+\.\d+(?:\.\d+)?\b|patch\s*\d+|title\s*update\s*\d+)/i;

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "generate";
  if (["--help", "-h", "help"].includes(command)) {
    printHelp();
  } else if (command === "generate" || command === "validate") {
    const report = validateCurrentResearchPackage({
      root: repositoryRoot,
      sourceDirectory: cliValue("--source-directory") ?? defaultSourceDirectory,
      generatedAt: new Date().toISOString()
    });
    const output = writeResearchPackageValidationReports(report, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory,
      docsPath: cliValue("--docs-path") ?? defaultDocsPath
    });
    console.log(JSON.stringify({ ok: report.ok, status: report.status, summary: report.summary, files: output.files }, null, 2));
    if (!report.ok) process.exitCode = 1;
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function validateCurrentResearchPackage({
  root = repositoryRoot,
  sourceDirectory = defaultSourceDirectory,
  generatedAt = new Date().toISOString()
} = {}) {
  const packageData = loadResearchPackage(root, sourceDirectory);
  const checks = [];
  const ctx = buildValidationContext(root, sourceDirectory, packageData);

  checks.push(checkUniqueIDs(ctx));
  checks.push(checkNativeOrderContinuity(ctx));
  checks.push(checkFace12Overlap(ctx));
  checks.push(checkRelativePaths(ctx));
  checks.push(checkEvidenceExistence(ctx));
  checks.push(checkChecksums(ctx));
  checks.push(checkSourceTimestamps(ctx));
  checks.push(checkAllowedStatuses(ctx));
  checks.push(checkResearchProductionSeparation(ctx));
  checks.push(checkNoFixtureContamination(ctx));
  checks.push(checkNoCollegeFootball26Contamination(ctx));
  checks.push(checkNoUnsupportedFace30Plus(ctx));
  checks.push(checkNoFabricatedVersionOrPatch(ctx));
  checks.push(checkNoProductionRecommendationAccess(ctx));

  const summary = summarizeChecks(checks, ctx);
  return {
    schemaVersion: CF27_RESEARCH_PACKAGE_VALIDATION_VERSION,
    reportLabel: researchPackageValidationLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    sourceDirectory,
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    sourceType: "researchCandidate",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    productionRecommendationsEnabled: false,
    ok: summary.errorCount === 0,
    status: summary.errorCount === 0 ? "passed" : "failed",
    summary,
    checks,
    sourcePackage: {
      manifestCounts: packageData.manifest.counts,
      exportFileCount: packageData.manifest.exportFiles?.length ?? 0,
      categories: Object.fromEntries(Object.entries(ctx.recordsByCategory).map(([category, records]) => [category, records.length]))
    },
    policy: {
      packageUse:
        "This report validates the current partial research package only. It does not verify records, publish production data, or enable recommendations.",
      evidenceUse:
        "Repository derivative evidence is checksum-verified locally. Source-video masters are portable external references and are validated against video_inventory hashes.",
      productionGate:
        "Production recommendations remain blocked until second-person verification, catalog-manager approval, immutable release publication, and production gates pass."
    }
  };
}

export function writeResearchPackageValidationReports(report, {
  root = repositoryRoot,
  outputDirectory = defaultOutputDirectory,
  docsPath = defaultDocsPath
} = {}) {
  assertResearchOutputPath(outputDirectory, "outputDirectory");
  assertDocsCatalogPath(docsPath, "docsPath");
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const jsonPath = path.join(absoluteOutputDirectory, "current_research_package_validation.json");
  const markdownPath = path.join(absoluteOutputDirectory, "CURRENT_RESEARCH_PACKAGE_VALIDATION.md");
  const absoluteDocsPath = path.resolve(root, docsPath);
  fs.mkdirSync(path.dirname(absoluteDocsPath), { recursive: true });
  const markdown = renderValidationMarkdown(report);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, markdown);
  fs.writeFileSync(absoluteDocsPath, markdown);
  return {
    files: [jsonPath, markdownPath, absoluteDocsPath].map((filePath) => path.relative(root, filePath))
  };
}

function loadResearchPackage(root, sourceDirectory) {
  const readExport = (fileName) => readJson(path.resolve(root, sourceDirectory, fileName));
  return {
    manifest: readExport("research_catalog_manifest.json"),
    environmentManifest: readExport("environment_manifest.json"),
    creationPaths: readExport("creation_paths.json"),
    menuMap: readExport("menu_map.json"),
    evidenceManifest: readExport("evidence_manifest.json"),
    captureLog: readExport("capture_log.json"),
    categories: Object.fromEntries(categoryFiles.map((category) => [category, readExport(`${category}.json`)])),
    videoInventory: readJson(path.resolve(root, "data/research/cf27/video_inventory.json"))
  };
}

function buildValidationContext(root, sourceDirectory, packageData) {
  const recordsByCategory = Object.fromEntries(
    Object.entries(packageData.categories).map(([category, wrapped]) => [category, wrapped.payload?.records ?? []])
  );
  const records = Object.entries(recordsByCategory).flatMap(([categoryName, recordsForCategory]) =>
    recordsForCategory.map((record) => ({ ...record, categoryExport: categoryName }))
  );
  const evidenceEntries = packageData.evidenceManifest.payload?.entries ?? [];
  const evidenceByID = new Map(evidenceEntries.map((entry) => [entry.evidenceID, entry]));
  const videoByID = new Map((packageData.videoInventory.inventory ?? []).map((entry) => [entry.inventoryId, entry]));
  const captureLogEvents = packageData.captureLog.payload?.events ?? [];
  const packageText = stableStringify(packageData);
  return {
    root,
    sourceDirectory,
    packageData,
    recordsByCategory,
    records,
    evidenceEntries,
    evidenceByID,
    videoByID,
    captureLogEvents,
    packageText
  };
}

function checkUniqueIDs(ctx) {
  const findings = createFindings();
  const recordIDs = new Map();
  for (const record of ctx.records) {
    if (!record.stableInternalID) {
      findings.errors.push(issue("missingStableID", `${record.categoryExport} contains a record without stableInternalID.`));
      continue;
    }
    const seen = recordIDs.get(record.stableInternalID) ?? [];
    seen.push(record.categoryExport);
    recordIDs.set(record.stableInternalID, seen);
  }
  for (const [id, sources] of recordIDs.entries()) {
    if (sources.length > 1) findings.errors.push(issue("duplicateStableID", `${id} appears in ${sources.join(", ")}.`));
  }

  const evidenceIDs = new Map();
  for (const entry of ctx.evidenceEntries) {
    if (!entry.evidenceID) {
      findings.errors.push(issue("missingEvidenceID", "Evidence manifest contains an entry without evidenceID."));
      continue;
    }
    evidenceIDs.set(entry.evidenceID, (evidenceIDs.get(entry.evidenceID) ?? 0) + 1);
  }
  for (const [id, count] of evidenceIDs.entries()) {
    if (count > 1) findings.errors.push(issue("duplicateEvidenceID", `${id} appears ${count} times.`));
  }
  return finalizeCheck("uniqueIDs", findings, {
    recordCount: ctx.records.length,
    uniqueRecordIDs: recordIDs.size,
    evidenceCount: ctx.evidenceEntries.length,
    uniqueEvidenceIDs: evidenceIDs.size
  });
}

function checkNativeOrderContinuity(ctx) {
  const findings = createFindings();
  const details = {};
  for (const [category, records] of Object.entries(ctx.recordsByCategory)) {
    const orders = records.map((record) => Number(record.nativeOrder)).sort((a, b) => a - b);
    const finiteOrders = orders.filter(Number.isFinite);
    details[category] = { count: records.length, first: finiteOrders[0] ?? null, last: finiteOrders.at(-1) ?? null };
    if (finiteOrders.length !== records.length) {
      findings.errors.push(issue("invalidNativeOrder", `${category} contains missing or nonnumeric nativeOrder values.`));
      continue;
    }
    for (let index = 0; index < finiteOrders.length; index += 1) {
      const expected = index + 1;
      if (finiteOrders[index] !== expected) {
        findings.errors.push(issue("nativeOrderGap", `${category} expected native order ${expected} but found ${finiteOrders[index]}.`));
        break;
      }
    }
  }
  return finalizeCheck("nativeOrderContinuity", findings, details);
}

function checkFace12Overlap(ctx) {
  const findings = createFindings();
  const face12Records = ctx.records.filter((record) => record.stableInternalID === "CF27_XBOXUNKNOWN_RTG_HEAD_012");
  const face12 = face12Records[0];
  if (face12Records.length !== 1) findings.errors.push(issue("invalidFace12RecordCount", `Expected one Face 12 record, found ${face12Records.length}.`));
  if (face12) {
    const selectedEvidence = String(face12.selectedEvidence ?? "");
    if (!selectedEvidence.includes("video-002") || !selectedEvidence.includes("video-003")) {
      findings.errors.push(issue("missingFace12OverlapSource", "Face 12 selectedEvidence must preserve both video-002 and video-003."));
    }
    if (Number(face12.nativeOrder) !== 12 || face12.nativeOption !== "Face 12") {
      findings.errors.push(issue("face12IdentityMismatch", "Face 12 must retain native order 12 and label Face 12."));
    }
  }
  return finalizeCheck("face12OverlapHandling", findings, {
    face12RecordCount: face12Records.length,
    selectedEvidence: face12?.selectedEvidence ?? null
  });
}

function checkRelativePaths(ctx) {
  const findings = createFindings();
  let portableExternalReferences = 0;
  let repositoryRelativeReferences = 0;
  for (const entry of ctx.evidenceEntries) {
    const relativePath = String(entry.relativePath ?? "");
    if (!relativePath) {
      findings.errors.push(issue("missingEvidencePath", `${entry.evidenceID} has no relativePath.`));
      continue;
    }
    if (path.isAbsolute(relativePath) || relativePath.includes("..")) {
      findings.errors.push(issue("unsafeEvidencePath", `${entry.evidenceID} has unsafe path ${relativePath}.`));
    }
    if (relativePath.startsWith("OWNER_DOWNLOADS/")) portableExternalReferences += 1;
    else if (relativePath.startsWith("data/research/cf27/")) repositoryRelativeReferences += 1;
    else findings.errors.push(issue("unexpectedEvidencePathRoot", `${entry.evidenceID} path must be data/research/cf27/... or OWNER_DOWNLOADS/...`));
  }
  return finalizeCheck("relativePaths", findings, { portableExternalReferences, repositoryRelativeReferences });
}

function checkEvidenceExistence(ctx) {
  const findings = createFindings();
  let localDerivativeEvidencePresent = 0;
  let portableSourceMasterReferences = 0;
  for (const entry of ctx.evidenceEntries) {
    const relativePath = String(entry.relativePath ?? "");
    if (relativePath.startsWith("OWNER_DOWNLOADS/")) {
      const inventory = ctx.videoByID.get(entry.sourceVideo);
      if (!inventory || inventory.portableRelativeEvidencePath !== relativePath) {
        findings.errors.push(issue("missingSourceVideoInventoryReference", `${entry.evidenceID} does not resolve to video_inventory.json by sourceVideo and path.`));
      } else {
        portableSourceMasterReferences += 1;
      }
      continue;
    }
    const absolutePath = path.resolve(ctx.root, relativePath);
    if (!absolutePath.startsWith(ctx.root) || !fs.existsSync(absolutePath)) {
      findings.errors.push(issue("missingLocalEvidenceFile", `${entry.evidenceID} missing local derivative file ${relativePath}.`));
    } else {
      localDerivativeEvidencePresent += 1;
    }
  }
  return finalizeCheck("evidenceExistence", findings, { localDerivativeEvidencePresent, portableSourceMasterReferences });
}

function checkChecksums(ctx) {
  const findings = createFindings();
  let exportFilesChecked = 0;
  let localEvidenceChecked = 0;
  let sourceMasterHashesChecked = 0;

  for (const exportFile of ctx.packageData.manifest.exportFiles ?? []) {
    const absolutePath = path.resolve(ctx.root, ctx.sourceDirectory, exportFile.fileName);
    if (!fs.existsSync(absolutePath)) {
      findings.errors.push(issue("missingExportFile", `${exportFile.fileName} listed in manifest is missing.`));
      continue;
    }
    exportFilesChecked += 1;
    const sizeBytes = fs.statSync(absolutePath).size;
    const sha256 = sha256File(absolutePath);
    if (sizeBytes !== exportFile.sizeBytes) findings.errors.push(issue("exportSizeMismatch", `${exportFile.fileName} size mismatch.`));
    if (sha256 !== exportFile.sha256) findings.errors.push(issue("exportChecksumMismatch", `${exportFile.fileName} checksum mismatch.`));
  }

  for (const entry of ctx.evidenceEntries) {
    const relativePath = String(entry.relativePath ?? "");
    if (relativePath.startsWith("OWNER_DOWNLOADS/")) {
      const inventory = ctx.videoByID.get(entry.sourceVideo);
      if (inventory?.sha256 === entry.sha256) sourceMasterHashesChecked += 1;
      else findings.errors.push(issue("sourceMasterChecksumMismatch", `${entry.evidenceID} source hash does not match video inventory.`));
      continue;
    }
    const absolutePath = path.resolve(ctx.root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    localEvidenceChecked += 1;
    const sizeBytes = fs.statSync(absolutePath).size;
    const sha256 = sha256File(absolutePath);
    if (sizeBytes !== entry.sizeBytes) findings.errors.push(issue("evidenceSizeMismatch", `${entry.evidenceID} size mismatch.`));
    if (sha256 !== entry.sha256) findings.errors.push(issue("evidenceChecksumMismatch", `${entry.evidenceID} checksum mismatch.`));
  }

  return finalizeCheck("checksums", findings, { exportFilesChecked, localEvidenceChecked, sourceMasterHashesChecked });
}

function checkSourceTimestamps(ctx) {
  const findings = createFindings();
  let selectedEvidenceRanges = 0;
  let timestampedEvidenceEntries = 0;
  for (const record of ctx.records) {
    const selections = splitPipe(record.selectedEvidence);
    if (selections.length === 0) findings.errors.push(issue("missingSelectedEvidence", `${record.stableInternalID} has no selectedEvidence timestamp reference.`));
    for (const selection of selections) {
      const match = /^video-\d{3}:\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?$/.exec(selection);
      if (!match) {
        findings.errors.push(issue("invalidSelectedEvidenceTimestamp", `${record.stableInternalID} has invalid selectedEvidence ${selection}.`));
        continue;
      }
      selectedEvidenceRanges += 1;
      const sourceVideoID = selection.split(":")[0];
      if (!ctx.videoByID.has(sourceVideoID)) findings.errors.push(issue("unknownSelectedEvidenceVideo", `${record.stableInternalID} references ${sourceVideoID}.`));
    }
    for (const evidenceID of splitPipe(record.sourceImageFrameIDs)) {
      if (!resolveEvidenceID(ctx, evidenceID)) findings.errors.push(issue("unknownRecordEvidenceID", `${record.stableInternalID} references missing evidence ${evidenceID}.`));
    }
  }
  for (const entry of ctx.evidenceEntries) {
    if (entry.masterOrDerivative === "derivative" && typeof entry.timestamp !== "number") {
      findings.errors.push(issue("missingDerivativeTimestamp", `${entry.evidenceID} derivative evidence must have a source timestamp.`));
    }
    if (typeof entry.timestamp === "number") timestampedEvidenceEntries += 1;
  }
  for (const event of ctx.captureLogEvents) {
    for (const evidenceID of event.evidenceGenerated ?? []) {
      if (!ctx.evidenceByID.has(evidenceID)) findings.errors.push(issue("captureLogUnknownEvidence", `${event.captureEventID} references missing evidence ${evidenceID}.`));
    }
  }
  return finalizeCheck("sourceTimestamps", findings, {
    selectedEvidenceRanges,
    timestampedEvidenceEntries,
    captureLogEventsChecked: ctx.captureLogEvents.length
  });
}

function checkAllowedStatuses(ctx) {
  const findings = createFindings();
  for (const [name, wrapped] of Object.entries({
    manifest: ctx.packageData.manifest,
    environmentManifest: ctx.packageData.environmentManifest,
    creationPaths: ctx.packageData.creationPaths,
    menuMap: ctx.packageData.menuMap,
    evidenceManifest: ctx.packageData.evidenceManifest,
    captureLog: ctx.packageData.captureLog,
    ...ctx.packageData.categories
  })) {
    if (wrapped.productionStatus !== "NOT_PRODUCTION_DATA") findings.errors.push(issue("invalidPackageProductionStatus", `${name} is ${wrapped.productionStatus}.`));
    if (wrapped.verificationStatus && !allowedPackageVerificationStatuses.has(wrapped.verificationStatus)) {
      findings.errors.push(issue("invalidPackageVerificationStatus", `${name} is ${wrapped.verificationStatus}.`));
    }
  }
  for (const record of ctx.records) {
    if (record.productionStatus !== "NOT_PRODUCTION_DATA") findings.errors.push(issue("invalidRecordProductionStatus", `${record.stableInternalID} is ${record.productionStatus}.`));
    if (!allowedRecordVerificationStatuses.has(record.verificationState)) {
      findings.errors.push(issue("invalidRecordVerificationStatus", `${record.stableInternalID} is ${record.verificationState}.`));
    }
  }
  return finalizeCheck("allowedStatuses", findings, {
    packageAllowedVerificationStatuses: [...allowedPackageVerificationStatuses],
    recordAllowedVerificationStatuses: [...allowedRecordVerificationStatuses]
  });
}

function checkResearchProductionSeparation(ctx) {
  const findings = createFindings();
  let forbiddenValueHits = 0;
  for (const forbidden of forbiddenProductionValues) {
    const pattern = new RegExp(`"${escapeRegExp(forbidden)}"`, "g");
    const matches = ctx.packageText.match(pattern) ?? [];
    forbiddenValueHits += matches.length;
  }
  if (forbiddenValueHits > 0) findings.errors.push(issue("productionStatusLeak", `Found ${forbiddenValueHits} forbidden production status values in the research package.`));
  if (ctx.packageData.manifest.dataClass !== "PRIMARY_RESEARCH_CANDIDATE") {
    findings.errors.push(issue("manifestNotResearch", "Manifest dataClass is not PRIMARY_RESEARCH_CANDIDATE."));
  }
  if (ctx.packageData.manifest.productionStatus !== "NOT_PRODUCTION_DATA") {
    findings.errors.push(issue("manifestProductionStatusInvalid", "Manifest is not explicitly NOT_PRODUCTION_DATA."));
  }
  return finalizeCheck("researchVersusProductionSeparation", findings, {
    dataClass: ctx.packageData.manifest.dataClass,
    productionStatus: ctx.packageData.manifest.productionStatus,
    forbiddenProductionValueHits: forbiddenValueHits
  });
}

function checkNoFixtureContamination(ctx) {
  const findings = createFindings();
  const matches = ctx.packageText.match(contaminationPattern) ?? [];
  if (matches.length > 0) findings.errors.push(issue("fixtureContamination", `Found ${matches.length} fixture/test-only references in the research package.`));
  return finalizeCheck("noFixtureContamination", findings, { fixtureReferenceMatches: matches.length });
}

function checkNoCollegeFootball26Contamination(ctx) {
  const findings = createFindings();
  const matches = ctx.packageText.match(collegeFootball26Pattern) ?? [];
  if (matches.length > 0) findings.errors.push(issue("collegeFootball26Contamination", `Found ${matches.length} College Football 26 references.`));
  return finalizeCheck("noCollegeFootball26Contamination", findings, { collegeFootball26Matches: matches.length });
}

function checkNoUnsupportedFace30Plus(ctx) {
  const findings = createFindings();
  const headRecords = ctx.recordsByCategory.heads ?? [];
  const unsupported = [];
  for (const record of headRecords) {
    const labelMatch = /^Face\s+(\d+)$/i.exec(String(record.nativeOption ?? ""));
    const idMatch = /_HEAD_(\d{3})$/.exec(String(record.stableInternalID ?? ""));
    const labelNumber = labelMatch ? Number(labelMatch[1]) : null;
    const idNumber = idMatch ? Number(idMatch[1]) : null;
    if ((labelNumber && labelNumber >= 30) || (idNumber && idNumber >= 30)) unsupported.push(record.stableInternalID);
  }
  if (unsupported.length > 0) findings.errors.push(issue("unsupportedFace30Plus", `Unsupported Face 30+ records found: ${unsupported.join(", ")}.`));
  return finalizeCheck("noUnsupportedFace30PlusRecords", findings, {
    headRecordCount: headRecords.length,
    maxHeadNativeOrder: Math.max(...headRecords.map((record) => Number(record.nativeOrder)).filter(Number.isFinite)),
    unsupportedFace30PlusCount: unsupported.length
  });
}

function checkNoFabricatedVersionOrPatch(ctx) {
  const findings = createFindings();
  const environment = ctx.packageData.environmentManifest.payload ?? {};
  const checkedFields = {
    consoleModel: environment.consoleModel,
    consoleOSVersion: environment.consoleOSVersion,
    gameExecutableVersion: environment.gameExecutableVersion,
    patchLabel: environment.patchLabel,
    patchID: environment.patchID,
    edition: environment.edition,
    platformName: environment.platformName,
    gameVersionID: environment.gameVersionID
  };
  const allowedUnknownValues = new Set([
    "UNKNOWN",
    "unknown",
    null,
    undefined,
    "Xbox (model UNKNOWN)",
    "cf27-version-unknown-video-001",
    "cf27-patch-unknown-video-001",
    "platform-xbox-unknown"
  ]);
  for (const [field, value] of Object.entries(checkedFields)) {
    if (allowedUnknownValues.has(value)) continue;
    if (fabricatedVersionPattern.test(String(value))) {
      findings.errors.push(issue("fabricatedVersionOrPatch", `${field} contains a concrete-looking value not supported by current environment evidence: ${value}`));
    }
  }
  return finalizeCheck("noFabricatedVersionOrPatch", findings, checkedFields);
}

function checkNoProductionRecommendationAccess(ctx) {
  const findings = createFindings();
  const productionManifestPath = path.resolve(ctx.root, "data/catalog/production/catalog_manifest.json");
  const productionManifest = readJson(productionManifestPath);
  const productionItemCount = productionManifest.items?.length ?? productionManifest.manifest?.items?.length ?? 0;
  if (productionItemCount !== 0) findings.errors.push(issue("productionCatalogNotEmpty", `Production catalog contains ${productionItemCount} items.`));
  if (/productionRecommendationAccess["']?\s*:\s*true|recommendationsEnabled["']?\s*:\s*true/i.test(ctx.packageText)) {
    findings.errors.push(issue("productionRecommendationAccessEnabled", "Research package contains enabled production recommendation access."));
  }
  return finalizeCheck("noProductionRecommendationAccess", findings, {
    productionCatalogItemCount: productionItemCount,
    productionRecommendationsEnabled: false
  });
}

function renderValidationMarkdown(report) {
  const lines = [
    "# Current Research Package Validation",
    "",
    `**${report.reportLabel}**`,
    "",
    "This report validates the current partial College Football 27 research package. It does not verify records, publish production data, or enable recommendations.",
    "",
    "## Summary",
    "",
    `- Status: ${report.status}`,
    `- Checks: ${report.summary.checkCount}`,
    `- Passed checks: ${report.summary.passedCheckCount}`,
    `- Errors: ${report.summary.errorCount}`,
    `- Warnings: ${report.summary.warningCount}`,
    `- Research records: ${report.summary.recordCount}`,
    `- Evidence entries: ${report.summary.evidenceCount}`,
    `- Local derivative checksums verified: ${report.summary.localEvidenceChecked}`,
    `- Portable source master references verified: ${report.summary.sourceMasterHashesChecked}`,
    `- Production recommendations enabled: ${report.summary.productionRecommendationsEnabled}`,
    "",
    "## Required Validations",
    ""
  ];
  for (const check of report.checks) {
    lines.push(`### ${check.name}: ${check.status}`);
    lines.push("");
    lines.push(`- Errors: ${check.errors.length}`);
    lines.push(`- Warnings: ${check.warnings.length}`);
    if (Object.keys(check.details).length > 0) lines.push(`- Details: ${JSON.stringify(check.details)}`);
    for (const error of check.errors) lines.push(`- Error ${error.code}: ${error.message}`);
    for (const warning of check.warnings) lines.push(`- Warning ${warning.code}: ${warning.message}`);
    lines.push("");
  }
  lines.push("## Production Gate Statement");
  lines.push("");
  lines.push("- The partial research package is not production data.");
  lines.push("- Current records are not second-person verified.");
  lines.push("- The production catalog remains empty.");
  lines.push("- No production recommendation access is enabled.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function summarizeChecks(checks, ctx) {
  const errorCount = checks.reduce((sum, check) => sum + check.errors.length, 0);
  const warningCount = checks.reduce((sum, check) => sum + check.warnings.length, 0);
  const checksumCheck = checks.find((check) => check.name === "checksums");
  return {
    checkCount: checks.length,
    passedCheckCount: checks.filter((check) => check.status === "passed").length,
    failedCheckCount: checks.filter((check) => check.status === "failed").length,
    errorCount,
    warningCount,
    recordCount: ctx.records.length,
    evidenceCount: ctx.evidenceEntries.length,
    localEvidenceChecked: checksumCheck?.details.localEvidenceChecked ?? 0,
    sourceMasterHashesChecked: checksumCheck?.details.sourceMasterHashesChecked ?? 0,
    productionRecommendationsEnabled: false
  };
}

function finalizeCheck(name, findings, details = {}) {
  return {
    name,
    status: findings.errors.length === 0 ? "passed" : "failed",
    errors: findings.errors,
    warnings: findings.warnings,
    details
  };
}

function createFindings() {
  return { errors: [], warnings: [] };
}

function issue(code, message, repairSuggestion = null) {
  return { code, message, repairSuggestion };
}

function splitPipe(value) {
  if (!value) return [];
  return String(value).split("|").map((part) => part.trim()).filter(Boolean);
}

function resolveEvidenceID(ctx, evidenceID) {
  if (ctx.evidenceByID.has(evidenceID)) return evidenceID;
  const prefixed = `evidence-${evidenceID}`;
  if (ctx.evidenceByID.has(prefixed)) return prefixed;
  return null;
}

function readJson(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function sha256File(absolutePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
}

function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertResearchOutputPath(relativePath, label) {
  if (!relativePath.startsWith("data/research/cf27/")) throw new Error(`${label} must stay under data/research/cf27/`);
}

function assertDocsCatalogPath(relativePath, label) {
  if (!relativePath.startsWith("docs/catalog/")) throw new Error(`${label} must stay under docs/catalog/`);
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function printHelp() {
  console.log(`Usage: node scripts/cf27-current-research-package-validator.mjs [generate|validate]\n\nOptions:\n  --source-directory <path>  Defaults to ${defaultSourceDirectory}\n  --output-directory <path>  Defaults to ${defaultOutputDirectory}\n  --docs-path <path>         Defaults to ${defaultDocsPath}`);
}
