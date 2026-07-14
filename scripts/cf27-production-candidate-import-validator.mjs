#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(currentFile);
const defaultRepositoryRoot = path.resolve(scriptDirectory, "..");

export const PRODUCTION_CANDIDATE_IMPORT_SCHEMA_VERSION = "cf27-production-candidate-import-v1";
export const defaultCandidatePackagePath = "data/phase-zero/verification-candidate-package/catalog_manifest.json";
export const defaultReportDirectory = "data/phase-zero/production-candidate-import";
export const productionCandidateImportChecks = [
  "schemaImport",
  "idUniqueness",
  "nativeOrderContinuity",
  "evidencePathResolution",
  "requiredEvidence",
  "verificationStatus",
  "platformVersionPatchCompleteness",
  "fixtureSeparation",
  "placeholderRejection",
  "productionTestSeparation",
  "duplicateObservationRetention",
  "countAndOrderMismatch",
  "environmentConsistency",
  "visualConditionApproval",
  "gameReproducibility",
  "dependencyResolution",
  "supersession"
];

const approvedVerificationStatuses = new Set(["VERIFIED", "VERIFIED_WITH_NOTES"]);
const approvedVisualConditionStatuses = new Set(["APPROVED_STANDARD_CAPTURE", "CONSISTENT", "CONSISTENT_WITH_NOTES", "PRODUCTION_APPROVED"]);
const approvedReproducibilityStatuses = new Set(["REPRODUCIBLE_IN_GAME", "REPRODUCIBLE_WITH_NOTES"]);
const allowedCandidateSourceTypes = new Set(["production", "productionVerified", "verificationCandidate", "verification_candidate", "VERIFICATION_CANDIDATE", "PRODUCTION_VERIFIED"]);
const blockedSourceTypes = new Set(["research", "researchDraft", "researchCandidate", "shippingGameVideoResearch", "publicSourceOnly", "testFixture", "demoData", "localDeveloperSample"]);
const destructiveDuplicateDispositions = new Set(["deleted", "merged", "removed", "discarded"]);
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK|UNKNOWN_ORIGIN|XBOXUNKNOWN)\b/i;
const fixturePathPattern = /(^|\/)(fixtures|test-only|synthetic|demo)(\/|$)/i;
const productionBlockedStatusPattern = /COUNT_MISMATCH|ORDER_MISMATCH|MISSING_EVIDENCE|RECAPTURE_REQUIRED|VERSION_MISMATCH|DEPENDENCY_UNRESOLVED|NOT_VERIFIED/i;

export function validateProductionCandidateImport(candidatePackage, options = {}) {
  const normalized = normalizeCandidatePackage(candidatePackage);
  const report = createReport(normalized, options);
  runCheck(report, "schemaImport", () => validateSchemaImport(normalized));
  runCheck(report, "idUniqueness", () => validateIDUniqueness(normalized));
  runCheck(report, "nativeOrderContinuity", () => validateNativeOrderContinuity(normalized));
  runCheck(report, "evidencePathResolution", () => validateEvidencePathResolution(normalized, options));
  runCheck(report, "requiredEvidence", () => validateRequiredEvidence(normalized));
  runCheck(report, "verificationStatus", () => validateVerificationStatus(normalized));
  runCheck(report, "platformVersionPatchCompleteness", () => validatePlatformVersionPatchCompleteness(normalized));
  runCheck(report, "fixtureSeparation", () => validateFixtureSeparation(normalized));
  runCheck(report, "placeholderRejection", () => validatePlaceholderRejection(normalized));
  runCheck(report, "productionTestSeparation", () => validateProductionTestSeparation(normalized));
  runCheck(report, "duplicateObservationRetention", () => validateDuplicateObservationRetention(normalized));
  runCheck(report, "countAndOrderMismatch", () => validateCountAndOrderMismatch(normalized));
  runCheck(report, "environmentConsistency", () => validateEnvironmentConsistency(normalized));
  runCheck(report, "visualConditionApproval", () => validateVisualConditionApproval(normalized));
  runCheck(report, "gameReproducibility", () => validateGameReproducibility(normalized));
  runCheck(report, "dependencyResolution", () => validateDependencyResolution(normalized));
  runCheck(report, "supersession", () => validateSupersession(normalized));
  finalizeReport(report, normalized);
  return report;
}

export function createMissingCandidateReport(options = {}) {
  const report = {
    schemaVersion: PRODUCTION_CANDIDATE_IMPORT_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    inputPath: options.inputPath ?? defaultCandidatePackagePath,
    isolatedEnvironment: {
      mode: "read-only-candidate-validation",
      productionCatalogMutationAllowed: false,
      productionRecommendationAccessAllowed: false
    },
    packageID: "missing",
    ok: false,
    status: "NO_VERIFICATION_CANDIDATE_PACKAGE",
    summary: {
      recordCount: 0,
      evidenceCount: 0,
      rejectedRecordCount: 0,
      errorCount: 1,
      warningCount: 0
    },
    checks: [
      {
        name: "candidatePackageDiscovery",
        status: "fail",
        errors: [
          {
            code: "candidatePackageMissing",
            message: `No verification-candidate package was found at ${options.inputPath ?? defaultCandidatePackagePath}.`,
            repairSuggestion: "Place a catalog-manager-approved verification candidate package at the configured path, then rerun the isolated production-candidate import validator."
          }
        ],
        warnings: []
      }
    ],
    recordResults: [],
    rejectedRecords: [],
    errors: [
      {
        check: "candidatePackageDiscovery",
        code: "candidatePackageMissing",
        message: `No verification-candidate package was found at ${options.inputPath ?? defaultCandidatePackagePath}.`,
        repairSuggestion: "Place a catalog-manager-approved verification candidate package at the configured path, then rerun the isolated production-candidate import validator."
      }
    ],
    warnings: [],
    productionImportAllowed: false
  };
  return report;
}

export function formatProductionCandidateImportReport(report) {
  const lines = [
    `# Production Candidate Import Report`,
    "",
    `- Status: ${report.status}`,
    `- OK: ${report.ok ? "yes" : "no"}`,
    `- Schema: ${report.schemaVersion}`,
    `- Package: ${report.packageID}`,
    `- Input: ${report.inputPath}`,
    `- Records: ${report.summary.recordCount}`,
    `- Evidence assets: ${report.summary.evidenceCount}`,
    `- Rejected records: ${report.summary.rejectedRecordCount}`,
    `- Errors: ${report.summary.errorCount}`,
    `- Warnings: ${report.summary.warningCount}`,
    `- Production import allowed: ${report.productionImportAllowed ? "yes" : "no"}`,
    "",
    "## Checks",
    "",
    "| Check | Status | Errors | Warnings |",
    "| --- | --- | ---: | ---: |"
  ];
  for (const check of report.checks) lines.push(`| ${check.name} | ${check.status} | ${check.errors.length} | ${check.warnings.length} |`);
  if (report.errors.length > 0) {
    lines.push("", "## Errors", "");
    for (const error of report.errors) {
      lines.push(`- \`${error.check}/${error.code}\`: ${error.message}`);
      if (error.repairSuggestion) lines.push(`  - Repair: ${error.repairSuggestion}`);
    }
  }
  if (report.rejectedRecords.length > 0) {
    lines.push("", "## Rejected Records", "");
    for (const record of report.rejectedRecords) lines.push(`- \`${record.recordID}\`: ${record.reasons.join("; ")}`);
  }
  return `${lines.join("\n")}\n`;
}

export function writeProductionCandidateImportReports(report, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, "production_candidate_import_report.json");
  const mdPath = path.join(outputDirectory, "production_candidate_import_report.md");
  const csvPath = path.join(outputDirectory, "production_candidate_rejected_records.csv");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, formatProductionCandidateImportReport(report));
  fs.writeFileSync(csvPath, rejectedRecordsCSV(report.rejectedRecords));
  return { jsonPath, mdPath, csvPath };
}

export function createProductionCandidateSelfCheckPackage(options = {}) {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-production-candidate-"));
  const environment = {
    environmentID: "CF27_TESTONLY_ENV_VERIFICATION_CANDIDATE",
    platform: "Xbox Series X|S",
    gameVersion: "test-only-game-version",
    patch: "test-only-patch",
    mode: "Road to Glory",
    creationPath: "Road to Glory > Create Player > Appearance"
  };
  const evidenceFiles = [
    ["ev-menu-001", "MENU_FULL_SCREEN"],
    ["ev-front-001", "FRONT"],
    ["ev-left-3q-001", "LEFT_3Q"],
    ["ev-right-3q-001", "RIGHT_3Q"],
    ["ev-left-profile-001", "LEFT_PROFILE"],
    ["ev-right-profile-001", "RIGHT_PROFILE"]
  ].map(([evidenceID, role]) => {
    const relativePath = `evidence/${evidenceID}.png`;
    const absolutePath = path.join(packageRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${evidenceID}:${role}`);
    return {
      evidenceID,
      assetID: evidenceID,
      role,
      relativePath,
      sha256: sha256File(absolutePath),
      sourceType: "verificationCandidate"
    };
  });
  const record = {
    stableID: "CF27_XBOXSERIESXS_RTG_HEAD_001",
    stableInternalID: "CF27_XBOXSERIESXS_RTG_HEAD_001",
    sourceType: "verificationCandidate",
    productionStatus: "VERIFICATION_CANDIDATE",
    fixture: false,
    isTestFixture: false,
    verificationStatus: "VERIFIED",
    category: "head",
    nativeOrder: 1,
    visibleGameLabelOrIndex: "Test-only native label",
    environmentID: environment.environmentID,
    platform: environment.platform,
    gameVersion: environment.gameVersion,
    patch: environment.patch,
    patchVersion: environment.patch,
    gameMode: environment.mode,
    mode: environment.mode,
    creationPath: environment.creationPath,
    evidence: evidenceFiles.map((entry) => entry.evidenceID),
    requiredEvidence: evidenceFiles.map((entry) => entry.role),
    visualConditions: { status: "APPROVED_STANDARD_CAPTURE" },
    reproducibility: { status: "REPRODUCIBLE_IN_GAME", menuPathVerified: true },
    dependencies: [{ dependencyID: "dep-none", status: "RESOLVED", evidenceIDs: ["ev-menu-001"] }],
    duplicateObservations: [
      {
        observationID: "dup-retained-001",
        observedStableID: "CF27_XBOXSERIESXS_RTG_HEAD_001",
        comparisonStableID: "CF27_XBOXSERIESXS_RTG_HEAD_001",
        evidenceID: "ev-menu-001",
        disposition: "retained"
      }
    ]
  };
  return {
    packageRoot,
    candidatePackage: {
      schemaVersion: "cf27-production-verification-candidate-package-v1",
      packageID: "test-only-production-candidate-package",
      dataClass: "VERIFICATION_CANDIDATE_PACKAGE",
      productionStatus: "VERIFICATION_CANDIDATE",
      environment,
      manifest: {
        catalogVersion: "test-only-candidate-version",
        itemCount: 1
      },
      records: [record],
      evidence: evidenceFiles
    }
  };
}

function normalizeCandidatePackage(candidatePackage) {
  const packageObject = candidatePackage && typeof candidatePackage === "object" ? candidatePackage : {};
  const records = firstArray(packageObject.records, packageObject.items, packageObject.manifest?.items);
  const evidence = firstArray(packageObject.evidence, packageObject.assets, packageObject.evidenceManifest?.entries);
  const evidenceByID = new Map();
  for (const asset of evidence) {
    for (const id of [asset?.evidenceID, asset?.assetID, asset?.id].filter(hasText)) evidenceByID.set(id, asset);
  }
  return {
    raw: packageObject,
    packageID: packageObject.packageID ?? packageObject.id ?? "unknown",
    records,
    evidence,
    evidenceByID,
    environment: packageObject.environment ?? packageObject.auditEnvironment ?? packageObject.shippingEnvironment ?? {},
    manifest: packageObject.manifest ?? {}
  };
}

function createReport(normalized, options) {
  return {
    schemaVersion: PRODUCTION_CANDIDATE_IMPORT_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    inputPath: options.inputPath ?? defaultCandidatePackagePath,
    isolatedEnvironment: {
      mode: "read-only-candidate-validation",
      productionCatalogMutationAllowed: false,
      productionRecommendationAccessAllowed: false
    },
    packageID: normalized.packageID,
    ok: false,
    status: "FAILED_REJECTED_RECORDS",
    summary: {
      recordCount: normalized.records.length,
      evidenceCount: normalized.evidence.length,
      rejectedRecordCount: 0,
      errorCount: 0,
      warningCount: 0
    },
    checks: [],
    recordResults: normalized.records.map((record) => ({
      recordID: recordID(record),
      status: "pending",
      reasons: []
    })),
    rejectedRecords: [],
    errors: [],
    warnings: [],
    productionImportAllowed: false
  };
}

function validateSchemaImport(normalized) {
  const findings = emptyFindings();
  if (!normalized.raw || typeof normalized.raw !== "object" || Array.isArray(normalized.raw)) {
    findings.errors.push(error("invalidPackageObject", "Candidate package is not a structured JSON object.", "Submit a machine-readable verification-candidate package."));
  }
  if (normalized.records.length === 0) {
    findings.errors.push(error("noCandidateRecords", "Candidate package contains no records.", "Submit records only after catalog-manager review and second verification."));
  }
  if (normalized.manifest?.itemCount !== undefined && normalized.manifest.itemCount !== normalized.records.length) {
    findings.errors.push(error("manifestItemCountMismatch", `Manifest declares ${normalized.manifest.itemCount} records but package contains ${normalized.records.length}.`, "Regenerate the manifest from the exact candidate package contents."));
  }
  return findings;
}

function validateIDUniqueness(normalized) {
  const findings = emptyFindings();
  const seen = new Set();
  for (const record of normalized.records) {
    const id = recordID(record);
    if (!hasText(id)) {
      findings.errors.push(error("missingStableID", "Candidate record is missing a stable ID.", "Assign a stable internal catalog ID before production-candidate import."));
      continue;
    }
    if (seen.has(id)) findings.errors.push(error("duplicateStableID", `Duplicate candidate stable ID ${id}.`, "Keep one catalog record per stable ID and retain overlaps as duplicate observations."));
    seen.add(id);
  }
  return findings;
}

function validateNativeOrderContinuity(normalized) {
  const findings = emptyFindings();
  const groups = new Map();
  for (const record of normalized.records) {
    const id = recordID(record);
    const nativeOrder = Number(record.nativeOrder ?? record.native_order ?? record.order);
    if (!Number.isInteger(nativeOrder) || nativeOrder < 1) {
      findings.errors.push(error("missingNativeOrder", `${id} is missing positive integer native order.`, "Recount the category and preserve native order before import."));
      continue;
    }
    const key = [record.platform, record.gameVersion, record.patch ?? record.patchVersion, record.gameMode ?? record.mode, record.creationPath, record.category].join("::");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id, nativeOrder });
  }
  for (const [key, records] of groups) {
    const sorted = [...records].sort((first, second) => first.nativeOrder - second.nativeOrder);
    sorted.forEach((record, index) => {
      const expected = index + 1;
      if (record.nativeOrder !== expected) findings.errors.push(error("nativeOrderGap", `${key} expected native order ${expected} but found ${record.nativeOrder} on ${record.id}.`, "Resolve count/order mismatches before creating a production candidate."));
    });
  }
  return findings;
}

function validateEvidencePathResolution(normalized, options) {
  const findings = emptyFindings();
  const baseDirectory = path.resolve(options.packageDirectory ?? defaultRepositoryRoot);
  for (const asset of normalized.evidence) {
    const id = evidenceID(asset);
    const relativePath = asset?.relativePath ?? asset?.path;
    if (!hasText(relativePath)) {
      findings.errors.push(error("missingEvidencePath", `${id} is missing a portable relative evidence path.`, "Record the relative evidence path inside the candidate package."));
      continue;
    }
    const normalizedPath = String(relativePath).replaceAll("\\", "/");
    if (path.isAbsolute(normalizedPath)) {
      findings.errors.push(error("absoluteEvidencePath", `${id} uses an absolute evidence path.`, "Use portable relative paths; do not make a local machine path the only reference."));
      continue;
    }
    if (normalizedPath.includes("..")) {
      findings.errors.push(error("unsafeEvidencePath", `${id} contains unsafe path traversal.`, "Keep production-candidate evidence inside the package evidence root."));
      continue;
    }
    if (fixturePathPattern.test(normalizedPath)) {
      findings.errors.push(error("fixtureEvidencePath", `${id} points to fixture/test/demo evidence.`, "Production candidates must reference verified candidate evidence, never fixtures."));
    }
    const absolutePath = path.resolve(baseDirectory, normalizedPath);
    if (!absolutePath.startsWith(`${baseDirectory}${path.sep}`) && absolutePath !== baseDirectory) {
      findings.errors.push(error("unsafeEvidencePath", `${id} escapes the package root.`, "Keep evidence paths inside the package root."));
      continue;
    }
    if (!fs.existsSync(absolutePath)) {
      findings.errors.push(error("missingEvidenceFile", `${id} references missing file ${normalizedPath}.`, "Provide the evidence file or remove the record from the candidate package."));
      continue;
    }
    if (hasText(asset.sha256) && asset.sha256 !== sha256File(absolutePath)) {
      findings.errors.push(error("evidenceChecksumMismatch", `${id} checksum does not match ${normalizedPath}.`, "Regenerate checksums from the exact evidence files being reviewed."));
    }
  }
  return findings;
}

function validateRequiredEvidence(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const id = recordID(record);
    const evidenceRefs = recordEvidenceReferences(record);
    if (evidenceRefs.length === 0) {
      findings.errors.push(error("recordMissingEvidence", `${id} has no evidence references.`, "Attach direct source evidence before candidate import."));
    }
    for (const ref of evidenceRefs) {
      if (!normalized.evidenceByID.has(ref)) findings.errors.push(error("missingEvidenceReference", `${id} references unavailable evidence ${ref}.`, "Add the evidence record to the package manifest."));
    }
    const requiredRoles = requiredEvidenceRoles(record);
    if (requiredRoles.length === 0) {
      findings.errors.push(error("missingRequiredEvidenceList", `${id} does not declare required evidence roles.`, "Declare the required evidence set used for this catalog category."));
    }
    for (const role of requiredRoles) {
      const hasRole = evidenceRefs.some((ref) => evidenceRole(normalized.evidenceByID.get(ref)) === role);
      if (!hasRole) findings.errors.push(error("missingRequiredEvidence", `${id} is missing required evidence role ${role}.`, "Attach every required menu/view evidence item before import."));
    }
  }
  return findings;
}

function validateVerificationStatus(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const status = normalizeStatus(record.verificationStatus ?? record.verificationState);
    if (!approvedVerificationStatuses.has(status)) {
      findings.errors.push(error("recordLacksVerification", `${recordID(record)} has verification status ${status || "missing"}.`, "Complete independent second-person verification before import."));
    }
  }
  return findings;
}

function validatePlatformVersionPatchCompleteness(normalized) {
  const findings = emptyFindings();
  const environment = normalized.environment;
  for (const [field, value] of [
    ["environmentID", environment.environmentID],
    ["platform", environment.platform],
    ["gameVersion", environment.gameVersion],
    ["patch", environment.patch ?? environment.patchVersion],
    ["mode", environment.mode ?? environment.gameMode],
    ["creationPath", environment.creationPath]
  ]) {
    if (!hasText(value)) findings.errors.push(error("missingEnvironmentMetadata", `Package environment is missing ${field}.`, "Record the exact platform, version, patch, mode, and creation path before production-candidate import."));
  }
  for (const record of normalized.records) {
    const id = recordID(record);
    for (const [field, value] of [
      ["platform", record.platform],
      ["gameVersion", record.gameVersion],
      ["patch", record.patch ?? record.patchVersion],
      ["gameMode", record.gameMode ?? record.mode],
      ["creationPath", record.creationPath]
    ]) {
      if (!hasText(value)) findings.errors.push(error("missingRecordMetadata", `${id} is missing ${field}.`, "Every production-candidate record needs complete platform/version/patch/mode/path metadata."));
    }
  }
  return findings;
}

function validateFixtureSeparation(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const id = recordID(record);
    if (record.fixture === true || record.isTestFixture === true) findings.errors.push(error("fixtureRecordRejected", `${id} is marked as a fixture.`, "Move fixtures to data/fixtures/test-only and keep them out of production candidates."));
    if (blockedSourceTypes.has(record.sourceType)) findings.errors.push(error("blockedSourceType", `${id} uses blocked sourceType ${record.sourceType}.`, "Only verified production-candidate records may be imported."));
  }
  return findings;
}

function validatePlaceholderRejection(normalized) {
  const findings = emptyFindings();
  for (const [pathLabel, value] of walkValues(normalized.raw)) {
    if (typeof value === "string" && placeholderPattern.test(value)) {
      findings.errors.push(error("placeholderToken", `Placeholder or unresolved token found at ${pathLabel}.`, "Replace placeholders and unresolved environment tokens with direct verified evidence before import."));
    }
  }
  return findings;
}

function validateProductionTestSeparation(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const id = recordID(record);
    if (!allowedCandidateSourceTypes.has(record.sourceType)) {
      findings.errors.push(error("nonCandidateSourceType", `${id} sourceType ${record.sourceType ?? "missing"} is not allowed in a production-candidate import.`, "Use a verification-candidate or production-verified source type after catalog-manager review."));
    }
    if (String(record.dataClass ?? normalized.raw.dataClass ?? "").toUpperCase().includes("TEST")) {
      findings.errors.push(error("testDataClassRejected", `${id} is attached to a test data class.`, "Keep test packages outside the production-candidate import path."));
    }
  }
  return findings;
}

function validateDuplicateObservationRetention(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const id = recordID(record);
    for (const observation of record.duplicateObservations ?? []) {
      const evidence = observation?.evidenceID ?? observation?.evidenceAssetID;
      if (!hasText(evidence)) findings.errors.push(error("duplicateObservationMissingEvidence", `${id} duplicate observation is missing evidence.`, "Retain duplicate observations with direct evidence references."));
      if (destructiveDuplicateDispositions.has(String(observation?.disposition ?? "").toLowerCase())) {
        findings.errors.push(error("duplicateObservationDestructiveDisposition", `${id} duplicate observation uses ${observation.disposition}.`, "Do not delete or merge duplicate-looking observations during candidate import."));
      }
    }
  }
  return findings;
}

function validateCountAndOrderMismatch(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const id = recordID(record);
    const text = JSON.stringify({
      countStatus: record.countStatus,
      orderStatus: record.orderStatus,
      verificationStatus: record.verificationStatus ?? record.verificationState,
      issues: record.issues,
      unresolvedIssues: record.unresolvedIssues
    });
    if (productionBlockedStatusPattern.test(text)) {
      findings.errors.push(error("unresolvedCountOrOrderMismatch", `${id} contains unresolved count, order, evidence, version, recapture, or dependency status.`, "Resolve blocking discrepancies before candidate import."));
    }
  }
  return findings;
}

function validateEnvironmentConsistency(normalized) {
  const findings = emptyFindings();
  const environment = normalized.environment;
  for (const record of normalized.records) {
    const id = recordID(record);
    for (const [field, envValue, recordValue] of [
      ["environmentID", environment.environmentID, record.environmentID],
      ["platform", environment.platform, record.platform],
      ["gameVersion", environment.gameVersion, record.gameVersion],
      ["patch", environment.patch ?? environment.patchVersion, record.patch ?? record.patchVersion],
      ["mode", environment.mode ?? environment.gameMode, record.mode ?? record.gameMode],
      ["creationPath", environment.creationPath, record.creationPath]
    ]) {
      if (hasText(envValue) && hasText(recordValue) && envValue !== recordValue) {
        findings.errors.push(error("wrongEnvironmentReference", `${id} ${field} ${recordValue} does not match package environment ${envValue}.`, "Do not mix platforms, patches, modes, or creation paths in one production-candidate package."));
      }
    }
  }
  return findings;
}

function validateVisualConditionApproval(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const status = normalizeStatus(record.visualConditions?.status ?? record.captureStandardStatus ?? record.standardizedCaptureStatus ?? record.visualConditionStatus ?? record.qualityStatus);
    if (!approvedVisualConditionStatuses.has(status)) {
      findings.errors.push(error("unapprovedVisualConditions", `${recordID(record)} has visual condition status ${status || "missing"}.`, "Use only approved standardized visual conditions for production candidates."));
    }
  }
  return findings;
}

function validateGameReproducibility(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const reproducibility = record.reproducibility ?? {};
    const status = normalizeStatus(reproducibility.status ?? record.reproducibilityStatus);
    const menuPathVerified = reproducibility.menuPathVerified === true || record.menuPathVerified === true;
    if (!approvedReproducibilityStatuses.has(status) || !menuPathVerified) {
      findings.errors.push(error("notReproducibleInGame", `${recordID(record)} is not fully reproducible in the game from verified menu instructions.`, "Verify exact menu path and reproduction steps in the shipping game before import."));
    }
  }
  return findings;
}

function validateDependencyResolution(normalized) {
  const findings = emptyFindings();
  for (const record of normalized.records) {
    const id = recordID(record);
    for (const dependency of record.dependencies ?? []) {
      const status = normalizeStatus(dependency?.status ?? dependency?.verificationStatus);
      if (status !== "RESOLVED") findings.errors.push(error("unresolvedDependency", `${id} has unresolved dependency ${dependency?.dependencyID ?? "unknown"}.`, "Resolve platform, mode, patch, unlock, and option dependencies before candidate import."));
      const evidenceIDs = dependency?.evidenceIDs ?? dependency?.evidenceFileIDs ?? [];
      for (const evidenceID of evidenceIDs) {
        if (!normalized.evidenceByID.has(evidenceID)) findings.errors.push(error("missingDependencyEvidence", `${id} dependency ${dependency?.dependencyID ?? "unknown"} references missing evidence ${evidenceID}.`, "Attach evidence for dependency conclusions."));
      }
    }
  }
  return findings;
}

function validateSupersession(normalized) {
  const findings = emptyFindings();
  const ids = new Set(normalized.records.map(recordID).filter(hasText));
  for (const record of normalized.records) {
    const id = recordID(record);
    for (const field of ["supersedesStableID", "supersededByStableID"]) {
      const target = record[field];
      if (hasText(target) && !ids.has(target)) findings.errors.push(error("invalidSupersessionReference", `${id} ${field} references missing record ${target}.`, "Keep supersession references inside the package or preserve the historical release context."));
    }
    if (record.deprecated === true && !hasText(record.deprecatedContext)) {
      findings.errors.push(error("deprecatedContextMissing", `${id} is deprecated without required context.`, "Document why the record is deprecated before import."));
    }
  }
  for (const record of normalized.records) {
    const visited = new Set();
    let current = record;
    while (hasText(current?.supersededByStableID)) {
      const next = normalized.records.find((entry) => recordID(entry) === current.supersededByStableID);
      if (!next) break;
      if (visited.has(recordID(next))) {
        findings.errors.push(error("supersessionCycle", `${recordID(record)} participates in a supersession cycle.`, "Keep supersession chains one-way and immutable."));
        break;
      }
      visited.add(recordID(next));
      current = next;
    }
  }
  return findings;
}

function finalizeReport(report, normalized) {
  report.errors = report.checks.flatMap((check) => check.errors.map((entry) => ({ ...entry, check: check.name })));
  report.warnings = report.checks.flatMap((check) => check.warnings.map((entry) => ({ ...entry, check: check.name })));
  report.summary.errorCount = report.errors.length;
  report.summary.warningCount = report.warnings.length;
  const rejected = new Map();
  for (const record of normalized.records) rejected.set(recordID(record), []);
  for (const errorEntry of report.errors) {
    for (const record of normalized.records) {
      const id = recordID(record);
      if (errorEntry.message.includes(id)) rejected.get(id)?.push(`${errorEntry.check}/${errorEntry.code}`);
    }
  }
  report.rejectedRecords = Array.from(rejected.entries())
    .filter(([, reasons]) => reasons.length > 0)
    .map(([recordIDValue, reasons]) => ({ recordID: recordIDValue, reasons }));
  report.recordResults = report.recordResults.map((recordResult) => {
    const rejection = report.rejectedRecords.find((entry) => entry.recordID === recordResult.recordID);
    return rejection ? { ...recordResult, status: "rejected", reasons: rejection.reasons } : { ...recordResult, status: "acceptedForIsolatedValidation", reasons: [] };
  });
  report.summary.rejectedRecordCount = report.rejectedRecords.length;
  report.ok = report.errors.length === 0;
  report.status = report.ok ? "PASSED_ISOLATED_VALIDATION" : "FAILED_REJECTED_RECORDS";
  report.productionImportAllowed = false;
}

function runCheck(report, name, callback) {
  const findings = callback();
  report.checks.push({
    name,
    status: findings.errors.length > 0 ? "fail" : findings.warnings.length > 0 ? "warning" : "pass",
    errors: findings.errors,
    warnings: findings.warnings
  });
}

function recordEvidenceReferences(record) {
  const refs = [
    ...asArray(record.evidence),
    ...asArray(record.evidenceIDs),
    ...asArray(record.sourceImageReferences),
    ...Object.values(record.requiredAngles ?? {})
  ];
  for (const entry of asArray(record.evidenceReferences)) refs.push(entry?.evidenceID ?? entry?.assetID ?? entry);
  return unique(refs.filter(hasText));
}

function requiredEvidenceRoles(record) {
  const roles = asArray(record.requiredEvidence).map((entry) => typeof entry === "string" ? entry : entry?.role).filter(hasText);
  for (const [role, value] of Object.entries(record.requiredEvidenceByRole ?? {})) {
    if (hasText(value)) roles.push(role);
  }
  return unique(roles.map((role) => String(role).toUpperCase()));
}

function evidenceRole(asset) {
  return normalizeStatus(asset?.role ?? asset?.view ?? asset?.angle ?? asset?.fileRole);
}

function recordID(record) {
  return record?.stableID ?? record?.stableInternalID ?? record?.catalogID ?? record?.id ?? "";
}

function evidenceID(asset) {
  return asset?.evidenceID ?? asset?.assetID ?? asset?.id ?? "evidence";
}

function normalizeStatus(value) {
  if (!hasText(value)) return "";
  return String(value).trim().replaceAll("-", "_").replaceAll(" ", "_").toUpperCase();
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function emptyFindings() {
  return { errors: [], warnings: [] };
}

function error(code, message, repairSuggestion) {
  return { code, message, repairSuggestion };
}

function walkValues(value, prefix = "$") {
  if (Array.isArray(value)) return value.flatMap((entry, index) => walkValues(entry, `${prefix}[${index}]`));
  if (!value || typeof value !== "object") return [[prefix, value]];
  return Object.entries(value).flatMap(([key, entry]) => walkValues(entry, `${prefix}.${key}`));
}

function rejectedRecordsCSV(records) {
  const rows = [["recordID", "reasons"], ...records.map((record) => [record.recordID, record.reasons.join("; ")])];
  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function unique(values) {
  return Array.from(new Set(values));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = { command: "validate", input: defaultCandidatePackagePath, output: defaultReportDirectory, writeReport: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") args.command = "check";
    else if (value === "--write-report") args.writeReport = true;
    else if (value === "--input") args.input = argv[++index];
    else if (value === "--output") args.output = argv[++index];
    else if (!value.startsWith("--")) args.input = value;
  }
  return args;
}

function runSelfCheck() {
  const { packageRoot, candidatePackage } = createProductionCandidateSelfCheckPackage();
  try {
    const validReport = validateProductionCandidateImport(candidatePackage, {
      packageDirectory: packageRoot,
      inputPath: "test-only-self-check",
      generatedAt: "2026-07-14T00:00:00.000Z"
    });
    const invalidPackage = structuredClone(candidatePackage);
    invalidPackage.records[0].stableID = "";
    invalidPackage.records[0].verificationStatus = "NOT_VERIFIED";
    invalidPackage.records[0].visualConditions.status = "RECAPTURE_REQUIRED";
    invalidPackage.records[0].sourceType = "testFixture";
    invalidPackage.records[0].visibleGameLabelOrIndex = "REPLACE_WITH_VERIFIED_GAME_LABEL";
    const invalidReport = validateProductionCandidateImport(invalidPackage, {
      packageDirectory: packageRoot,
      inputPath: "test-only-self-check-invalid",
      generatedAt: "2026-07-14T00:00:00.000Z"
    });
    if (!validReport.ok) {
      console.error(formatProductionCandidateImportReport(validReport));
      return 1;
    }
    if (invalidReport.ok) {
      console.error("Production candidate validator self-check failed: invalid package passed.");
      return 1;
    }
    console.log(`Production candidate import validator check OK (${productionCandidateImportChecks.length} checks).`);
    return 0;
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function runCLI(argv) {
  const args = parseArgs(argv);
  if (args.command === "check") return runSelfCheck();
  const inputPath = path.resolve(defaultRepositoryRoot, args.input);
  let report;
  if (!fs.existsSync(inputPath)) {
    report = createMissingCandidateReport({ inputPath: args.input, generatedAt: "2026-07-14T00:00:00.000Z" });
  } else {
    report = validateProductionCandidateImport(readJSON(inputPath), {
      packageDirectory: path.dirname(inputPath),
      inputPath: args.input,
      generatedAt: "2026-07-14T00:00:00.000Z"
    });
  }
  if (args.writeReport) writeProductionCandidateImportReports(report, path.resolve(defaultRepositoryRoot, args.output));
  console.log(formatProductionCandidateImportReport(report));
  return report.ok ? 0 : 1;
}

if (process.argv[1] === currentFile) {
  process.exitCode = runCLI(process.argv.slice(2));
}
