#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateDeterministicChecksum,
  formatReport as formatCatalogToolReport,
  validateEvidenceAssetPath,
  validatePackage
} from "./catalog-tools.mjs";

const currentFile = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(currentFile);
const defaultRepositoryRoot = path.resolve(scriptDirectory, "..");

export const CATALOG_IMPORT_VALIDATION_SCHEMA_VERSION = "catalog-import-validation-v1";
export const CATALOG_IMPORT_CHECKS = [
  "schemaImports",
  "basePackageValidation",
  "uniqueIDs",
  "resolvableEvidencePaths",
  "nativeOrderContinuity",
  "requiredEvidence",
  "requiredEnvironmentFields",
  "verificationStatusValidity",
  "placeholderRecords",
  "collegeFootball26Records",
  "duplicateObservationsRetained",
  "productionTestSeparation",
  "recordClassification",
  "productionRecommenderFixtureAccess",
  "supportedTarget",
  "validChecksums",
  "validSupersessionChains",
  "dependencyRecordValidity"
];

const requiredAngles = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];
const allowedVerificationStates = new Set(["verified", "unverified", "rejected", "archived"]);
const productionBlockedSourceTypes = new Set(["research", "researchDraft", "researchCandidate", "shippingGameVideoResearch", "publicSourceOnly", "testFixture", "demoData", "localDeveloperSample"]);
const approvedCatalogManagerDispositions = new Set(["approved", "approvedWithNotes"]);
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;
const collegeFootball26Pattern = /\b(College\s*Football\s*26|CFB?26|CF26|CollegeFootball26)\b/i;
const fixtureAccessPattern = /data\/fixtures\/test-only|synthetic-catalog|synthetic-match|sourceType["']?\s*:\s*["']testFixture/i;
const schemaReferencePattern = /^(?<fileName>[a-z0-9.-]+\.schema\.json)(?:#.*)?$/i;
const coreSchemaFiles = [
  "catalog-package.schema.json",
  "catalog-manifest.schema.json",
  "catalog-item.schema.json",
  "asset-reference.schema.json",
  "review-record.schema.json",
  "publication-record.schema.json",
  "navigation-instruction.schema.json",
  "facial-measurement.schema.json"
];
const productionRuntimeFiles = [
  "web/lib/catalog/production-manifest.ts",
  "web/lib/catalog/generated-production-manifest.ts",
  "web/lib/catalog/catalog-repository.ts",
  "web/lib/game-adapters/college-football-27-adapter.ts"
];

export function validateCatalogImport(catalogPackage, options = {}) {
  const report = createImportReport(catalogPackage, options);
  runCheck(report, "schemaImports", () => validateSchemaImports(options.repositoryRoot ?? defaultRepositoryRoot));
  runCheck(report, "basePackageValidation", () => validateBasePackage(catalogPackage, options));
  runCheck(report, "uniqueIDs", () => validateUniqueIDs(catalogPackage));
  runCheck(report, "resolvableEvidencePaths", () => validateResolvableEvidencePaths(catalogPackage, options));
  runCheck(report, "nativeOrderContinuity", () => validateNativeOrderContinuity(catalogPackage));
  runCheck(report, "requiredEvidence", () => validateRequiredEvidence(catalogPackage));
  runCheck(report, "requiredEnvironmentFields", () => validateRequiredEnvironmentFields(catalogPackage));
  runCheck(report, "verificationStatusValidity", () => validateVerificationStatusValidity(catalogPackage));
  runCheck(report, "placeholderRecords", () => validateNoPlaceholderRecords(catalogPackage));
  runCheck(report, "collegeFootball26Records", () => validateNoCollegeFootball26Records(catalogPackage));
  runCheck(report, "duplicateObservationsRetained", () => validateDuplicateObservationsRetained(catalogPackage));
  runCheck(report, "productionTestSeparation", () => validateProductionTestSeparation(catalogPackage));
  runCheck(report, "recordClassification", () => validateRecordClassification(catalogPackage));
  runCheck(report, "productionRecommenderFixtureAccess", () => validateProductionRecommenderFixtureAccess(options.repositoryRoot ?? defaultRepositoryRoot));
  runCheck(report, "supportedTarget", () => validateSupportedTargets(catalogPackage, options));
  runCheck(report, "validChecksums", () => validateChecksums(catalogPackage, options));
  runCheck(report, "validSupersessionChains", () => validateSupersessionChains(catalogPackage));
  runCheck(report, "dependencyRecordValidity", () => validateDependencyRecords(catalogPackage));
  finalizeImportReport(report);
  return report;
}

export function formatCatalogImportReport(report) {
  const lines = [
    `${report.ok ? "OK" : "FAIL"} catalog import validation`,
    `schema: ${report.schemaVersion}`,
    `package: ${report.packageID}`,
    `items: ${report.summary.itemCount}`,
    `assets: ${report.summary.assetCount}`,
    `errors: ${report.summary.errorCount}`,
    `warnings: ${report.summary.warningCount}`
  ];
  for (const check of report.checks) {
    lines.push(`check ${check.name}: ${check.status}`);
    for (const warning of check.warnings) lines.push(`warning ${check.name}/${warning.code}: ${warning.message}`);
    for (const error of check.errors) {
      lines.push(`error ${check.name}/${error.code}: ${error.message}`);
      if (error.repairSuggestion) lines.push(`repair ${check.name}/${error.code}: ${error.repairSuggestion}`);
    }
  }
  for (const repair of report.repairSuggestions) lines.push(`repair: ${repair}`);
  return `${lines.join("\n")}\n`;
}

export function createCatalogImportSelfCheckPackage() {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-import-validator-"));
  const item = {
    sourceType: "production",
    stableInternalID: "CF27_TESTONLY_RTG_HEAD_001",
    game: "EA SPORTS College Football 27",
    gameVersion: "test-only-version",
    patchVersion: "test-only-patch",
    platform: "test-only-platform",
    gameMode: "Road to Glory",
    creationPath: "test-only-creation-path",
    category: "head",
    nativeOrder: 1,
    visibleGameLabelOrIndex: "test-only verified label",
    verificationState: "verified",
    capturedDate: "2026-07-10T00:00:00.000Z",
    verifiedDate: "2026-07-10T00:00:00.000Z",
    sourceImageReferences: ["asset-front", "asset-left45", "asset-right45", "asset-left-profile", "asset-right-profile"],
    requiredAngles: {
      straightOn: "asset-front",
      left45: "asset-left45",
      right45: "asset-right45",
      leftProfile: "asset-left-profile",
      rightProfile: "asset-right-profile"
    },
    geometryMeasurements: {
      faceWidthRatio: {
        value: 0.7,
        confidence: 0.9,
        supportingFrameCount: 5,
        variance: 0.01,
        depthSupported: false,
        occlusionStatus: "none",
        measurementSource: "test-only-human-annotation",
        availabilityState: "available"
      }
    },
    humanAnnotations: { note: "test-only validator self-check" },
    catalogManagerDisposition: "approved",
    navigationInstructions: [
      {
        sequenceNumber: 1,
        instruction: "test-only verified navigation instruction",
        evidenceAssetID: "asset-navigation"
      }
    ],
    catalogVersion: {
      identifier: "test-only-catalog-version",
      gameVersion: "test-only-version",
      platform: "test-only-platform",
      verifiedAt: "2026-07-10T00:00:00.000Z"
    },
    isTestFixture: false,
    deprecated: false,
    deprecatedContext: null,
    supersedesStableID: null,
    supersededByStableID: null,
    duplicateObservations: [
      {
        observedStableID: "CF27_TESTONLY_RTG_HEAD_001",
        comparisonStableID: "CF27_TESTONLY_RTG_HEAD_001",
        evidenceAssetID: "asset-front",
        disposition: "retained"
      }
    ]
  };
  const assets = [
    ["asset-front", "straightOn"],
    ["asset-left45", "left45"],
    ["asset-right45", "right45"],
    ["asset-left-profile", "leftProfile"],
    ["asset-right-profile", "rightProfile"],
    ["asset-navigation", "navigationEvidence"]
  ].map(([assetID, angle]) => {
    const relativePath = `assets/masters/cfb27__test-only-platform__test-only-version__${assetID}__${angle}__20260710.png`;
    const absolutePath = path.join(packageRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `test-only evidence ${assetID}`);
    return {
      assetID,
      angle,
      relativePath,
      sha256: sha256File(absolutePath),
      capturedAt: "2026-07-10T00:00:00.000Z",
      derivativeState: "master"
    };
  });
  const catalogPackage = {
    packageID: "test-only-import-package",
    packageVersion: "test-only-package-version",
    supportedTargets: {
      platforms: ["test-only-platform"],
      gameVersions: ["test-only-version"],
      gameModes: ["Road to Glory"],
      creationPaths: ["test-only-creation-path"]
    },
    manifest: {
      sourceType: "production",
      catalogVersion: item.catalogVersion,
      generatedAt: "2026-07-10T00:00:00.000Z",
      isProduction: true,
      declaredItemCount: 1,
      packageChecksum: "",
      items: [item]
    },
    items: [item],
    assets,
    reviews: [
      {
        reviewID: "review-test-only-first",
        stableInternalID: item.stableInternalID,
        reviewer: "test-only-reviewer-one",
        stage: "first",
        reviewedAt: "2026-07-10T00:00:00.000Z",
        decision: "approved",
        checks: { labelsMatched: true, navigationVerified: true },
        notes: "test-only"
      },
      {
        reviewID: "review-test-only-second",
        stableInternalID: item.stableInternalID,
        reviewer: "test-only-reviewer-two",
        stage: "second",
        reviewedAt: "2026-07-10T00:00:00.000Z",
        decision: "approved",
        checks: { labelsMatched: true, navigationVerified: true },
        notes: "test-only"
      }
    ],
    publication: {
      publicationID: "publication-test-only",
      catalogVersionID: item.catalogVersion.identifier,
      publishedAt: "2026-07-10T00:00:00.000Z",
      publisher: "test-only-publisher",
      sourcePackageChecksum: "",
      stateTransition: {
        from: "reviewed",
        to: "verified",
        approvedByReviewID: "review-test-only-first"
      },
      notes: "test-only"
    }
  };
  const checksum = calculateDeterministicChecksum(catalogPackage);
  catalogPackage.manifest.packageChecksum = checksum;
  catalogPackage.publication.sourcePackageChecksum = checksum;
  return { packageRoot, catalogPackage };
}

function validateSchemaImports(repositoryRoot) {
  const schemaRoot = path.join(repositoryRoot, "data", "schemas");
  const findings = createCheckFindings();
  for (const fileName of coreSchemaFiles) validateSchemaFile(schemaRoot, fileName, findings, new Set());
  return findings;
}

function validateSchemaFile(schemaRoot, fileName, findings, seen) {
  const schemaPath = path.join(schemaRoot, fileName);
  if (seen.has(fileName)) return;
  seen.add(fileName);
  if (!fs.existsSync(schemaPath)) {
    findings.errors.push(error("missingSchemaImport", `Missing schema import ${fileName}.`, "Restore the schema file under data/schemas before importing catalogs."));
    return;
  }
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch {
    findings.errors.push(error("invalidSchemaJson", `Schema ${fileName} is not valid JSON.`, "Fix schema JSON syntax before importing catalogs."));
    return;
  }
  for (const reference of collectSchemaRefs(schema)) {
    const match = reference.match(schemaReferencePattern);
    if (match?.groups?.fileName) validateSchemaFile(schemaRoot, match.groups.fileName, findings, seen);
  }
}

function validateBasePackage(catalogPackage, options) {
  const baseReport = validatePackage(catalogPackage, {
    packageDirectory: options.packageDirectory,
    requireVerified: true,
    requireProductionSource: true
  });
  return {
    errors: baseReport.errors.map((entry) => error(entry.code, entry.message, entry.repairSuggestion)),
    warnings: baseReport.warnings.map((message) => warning("basePackageWarning", message))
  };
}

function validateUniqueIDs(catalogPackage) {
  const findings = createCheckFindings();
  validateUniqueField(findings, "packageID", [catalogPackage], (entry) => entry?.packageID);
  validateUniqueField(findings, "stableInternalID", catalogPackage?.items ?? [], (entry) => entry?.stableInternalID);
  validateUniqueField(findings, "assetID", catalogPackage?.assets ?? [], (entry) => entry?.assetID);
  validateUniqueField(findings, "reviewID", catalogPackage?.reviews ?? [], (entry) => entry?.reviewID);
  return findings;
}

function validateResolvableEvidencePaths(catalogPackage, options) {
  const findings = createCheckFindings();
  for (const asset of catalogPackage?.assets ?? []) {
    const assetReport = validateEvidenceAssetPath(asset, { packageDirectory: options.packageDirectory });
    findings.errors.push(...assetReport.errors.map((entry) => error(entry.code, entry.message, entry.repairSuggestion)));
    findings.warnings.push(...assetReport.warnings.map((message) => warning("evidencePathWarning", message)));
  }
  return findings;
}

function validateNativeOrderContinuity(catalogPackage) {
  const findings = createCheckFindings();
  const groups = new Map();
  for (const item of catalogPackage?.items ?? []) {
    const id = item?.stableInternalID || "Record";
    if (!Number.isInteger(item?.nativeOrder) || item.nativeOrder < 1) {
      findings.errors.push(error("missingNativeOrder", `${id} is missing positive integer nativeOrder.`, "Record exact native menu order before importing."));
      continue;
    }
    const key = [item.platform, item.gameVersion, item.gameMode, item.creationPath, item.category].join("::");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const [key, items] of groups) {
    const sorted = [...items].sort((first, second) => first.nativeOrder - second.nativeOrder);
    sorted.forEach((item, index) => {
      const expected = index + 1;
      if (item.nativeOrder !== expected) {
        findings.errors.push(error("nativeOrderGap", `${key} expected native order ${expected} but found ${item.nativeOrder} on ${item.stableInternalID}.`, "Recount the category in native menu order and keep gaps explicit through retired records."));
      }
    });
  }
  return findings;
}

function validateRequiredEvidence(catalogPackage) {
  const findings = createCheckFindings();
  const assetIDs = new Set((catalogPackage?.assets ?? []).map((asset) => asset.assetID));
  for (const item of catalogPackage?.items ?? []) {
    const id = item?.stableInternalID || "Record";
    for (const angle of requiredAngles) {
      const assetID = item?.requiredAngles?.[angle];
      if (!hasText(assetID)) {
        findings.errors.push(error("missingRequiredAngle", `${id} is missing required angle ${angle}.`, "Attach the standard evidence set before import."));
      } else if (!assetIDs.has(assetID)) {
        findings.errors.push(error("missingEvidenceAsset", `${id} required angle ${angle} references unknown asset ${assetID}.`, "Add the evidence asset record or fix the required angle reference."));
      }
    }
    for (const instruction of item?.navigationInstructions ?? []) {
      if (!assetIDs.has(instruction?.evidenceAssetID)) {
        findings.errors.push(error("missingNavigationEvidence", `${id} navigation instruction references unknown asset ${instruction?.evidenceAssetID ?? ""}.`, "Attach menu-instruction evidence before import."));
      }
    }
  }
  return findings;
}

function validateRequiredEnvironmentFields(catalogPackage) {
  const findings = createCheckFindings();
  const manifestVersion = catalogPackage?.manifest?.catalogVersion ?? {};
  for (const [field, value] of [
    ["manifest.catalogVersion.identifier", manifestVersion.identifier],
    ["manifest.catalogVersion.gameVersion", manifestVersion.gameVersion],
    ["manifest.catalogVersion.platform", manifestVersion.platform],
    ["manifest.generatedAt", catalogPackage?.manifest?.generatedAt]
  ]) {
    if (!hasText(value)) findings.errors.push(error("missingEnvironmentField", `Import package is missing ${field}.`, "Record the shipping-game environment before import."));
  }
  for (const item of catalogPackage?.items ?? []) {
    const id = item?.stableInternalID || "Record";
    for (const field of ["platform", "gameVersion", "patchVersion", "gameMode", "creationPath"]) {
      if (!hasText(item?.[field])) findings.errors.push(error("missingEnvironmentField", `${id} is missing ${field}.`, "Record platform, version, patch, mode, and creation path before import."));
    }
  }
  return findings;
}

function validateVerificationStatusValidity(catalogPackage) {
  const findings = createCheckFindings();
  for (const item of catalogPackage?.items ?? []) {
    const state = item?.verificationState;
    if (!allowedVerificationStates.has(state)) {
      findings.errors.push(error("invalidVerificationState", `${item?.stableInternalID || "Record"} has invalid verificationState ${state}.`, "Use only approved verification states."));
    } else if (state !== "verified") {
      findings.errors.push(error("unverifiedRecord", `${item?.stableInternalID || "Record"} is ${state}, not verified.`, "Complete first and second review before production import."));
    }
  }
  return findings;
}

function validateNoPlaceholderRecords(catalogPackage) {
  const findings = createCheckFindings();
  for (const [pathLabel, value] of walkValues(catalogPackage)) {
    if (typeof value === "string" && placeholderPattern.test(value)) {
      findings.errors.push(error("placeholderToken", `Placeholder token found at ${pathLabel}.`, "Replace placeholders with directly verified game evidence before import."));
    }
  }
  return findings;
}

function validateNoCollegeFootball26Records(catalogPackage) {
  const findings = createCheckFindings();
  for (const [pathLabel, value] of walkValues(catalogPackage)) {
    if (typeof value === "string" && collegeFootball26Pattern.test(value)) {
      findings.errors.push(error("collegeFootball26Record", `College Football 26 reference found at ${pathLabel}.`, "Remove CF26 data; it cannot substitute for College Football 27 evidence."));
    }
  }
  return findings;
}

function validateDuplicateObservationsRetained(catalogPackage) {
  const findings = createCheckFindings();
  const observedPairs = new Set();
  const byCategoryLabel = new Map();
  for (const item of catalogPackage?.items ?? []) {
    const labelKey = [item?.platform, item?.gameVersion, item?.gameMode, item?.creationPath, item?.category, item?.visibleGameLabelOrIndex].join("::");
    if (!byCategoryLabel.has(labelKey)) byCategoryLabel.set(labelKey, []);
    byCategoryLabel.get(labelKey).push(item);
    for (const observation of item?.duplicateObservations ?? []) {
      const disposition = observation?.disposition;
      const evidenceAssetID = observation?.evidenceAssetID;
      if (!hasText(evidenceAssetID)) {
        findings.errors.push(error("duplicateObservationMissingEvidence", `${item.stableInternalID} duplicate observation is missing evidence.`, "Retain the observation and cite evidence instead of merging or deleting silently."));
      }
      if (["deleted", "merged", "removed"].includes(String(disposition).toLowerCase())) {
        findings.errors.push(error("duplicateObservationNotRetained", `${item.stableInternalID} duplicate observation uses destructive disposition ${disposition}.`, "Keep duplicate observations as review metadata; never silently delete or merge records."));
      }
      observedPairs.add(`${observation?.observedStableID ?? item.stableInternalID}->${observation?.comparisonStableID ?? ""}`);
    }
  }
  for (const [labelKey, items] of byCategoryLabel) {
    if (items.length > 1) {
      findings.warnings.push(warning("duplicateVisibleLabelRetained", `${items.length} records share ${labelKey}; records are retained for human review.`));
    }
  }
  if (observedPairs.size > 0) {
    findings.warnings.push(warning("duplicateObservationsRetained", `${observedPairs.size} duplicate observation(s) retained as metadata.`));
  }
  return findings;
}

function validateProductionTestSeparation(catalogPackage) {
  const findings = createCheckFindings();
  for (const [owner, value] of [
    ["manifest", catalogPackage?.manifest],
    ...(catalogPackage?.items ?? []).map((item) => [item?.stableInternalID || "Record", item])
  ]) {
    if (value?.sourceType !== "production") {
      findings.errors.push(error("nonProductionSourceInProduction", `${owner} uses sourceType ${value?.sourceType ?? "missing"}.`, "Only production sourceType may enter production import."));
    }
    if (productionBlockedSourceTypes.has(value?.sourceType)) {
      findings.errors.push(error("fixtureLeakage", `${owner} uses blocked sourceType ${value.sourceType}.`, "Keep research, fixture, demo, and local sample data outside production imports."));
    }
    if (value?.isTestFixture) {
      findings.errors.push(error("fixtureRecordInProduction", `${owner} is marked isTestFixture.`, "Move fixture records under data/fixtures/test-only and exclude them from import."));
    }
  }
  for (const asset of catalogPackage?.assets ?? []) {
    if (/data\/fixtures\/test-only|\/fixtures\/test-only\/|^fixtures\/test-only\/|\/test-only\//i.test(String(asset?.relativePath ?? "").replaceAll("\\", "/"))) {
      findings.errors.push(error("fixtureEvidencePath", `${asset?.assetID || "Asset"} points to test-only or fixture evidence.`, "Production imports must reference verified production evidence paths."));
    }
  }
  return findings;
}

function validateRecordClassification(catalogPackage) {
  const findings = createCheckFindings();
  for (const item of catalogPackage?.items ?? []) {
    const id = item?.stableInternalID || "Record";
    if (item?.sourceType !== "production") {
      findings.errors.push(error("recordNotProductionVerified", `${id} is non-production ${item?.sourceType ?? "missing"}.`, "Only approved production records can enter production import."));
    }
    if (item?.sourceType === "publicSourceOnly") {
      findings.errors.push(error("publicSourceOnlyRecordInProduction", `${id} is public-source-only and cannot be shown as a shipping-game setting.`, "Replace public-source planning data with verified shipping-game evidence."));
    }
    if (item?.verificationState !== "verified") {
      findings.errors.push(error("recordNotProductionVerified", `${id} is not verified.`, "Complete verification and catalog-manager approval before import."));
    }
    if (!approvedCatalogManagerDispositions.has(item?.catalogManagerDisposition)) {
      findings.errors.push(error("missingCatalogManagerDisposition", `${id} is missing approved catalog-manager disposition.`, "Record catalog-manager disposition on each production item."));
    }
    if (item?.deprecated === true && !hasText(item?.deprecatedContext)) {
      findings.errors.push(error("deprecatedContextMissing", `${id} is deprecated without context.`, "Record deprecation context before import."));
    }
  }
  return findings;
}

function validateProductionRecommenderFixtureAccess(repositoryRoot) {
  const findings = createCheckFindings();
  for (const relativeFile of productionRuntimeFiles) {
    const filePath = path.join(repositoryRoot, relativeFile);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    if (fixtureAccessPattern.test(text)) {
      findings.errors.push(error("productionRecommenderFixtureAccess", `${relativeFile} contains a fixture-access token.`, "Production recommender paths must load only validated production catalog data."));
    }
  }
  return findings;
}

function validateSupportedTargets(catalogPackage, options) {
  const findings = createCheckFindings();
  const supported = resolveSupportedTargets(catalogPackage, options);
  for (const item of catalogPackage?.items ?? []) {
    const id = item?.stableInternalID || "Record";
    for (const [field, supportedValues] of [
      ["platform", supported.platforms],
      ["gameVersion", supported.gameVersions],
      ["gameMode", supported.gameModes],
      ["creationPath", supported.creationPaths]
    ]) {
      if (supportedValues.length > 0 && !supportedValues.includes(item?.[field])) {
        findings.errors.push(error("unsupportedTarget", `${id} has unsupported ${field}: ${item?.[field] ?? ""}.`, "Import only platform/version/mode/path combinations approved for this catalog release."));
      }
    }
  }
  return findings;
}

function validateChecksums(catalogPackage, options) {
  const findings = createCheckFindings();
  const checksum = calculateDeterministicChecksum(catalogPackage);
  if (!hasText(catalogPackage?.manifest?.packageChecksum)) {
    findings.errors.push(error("checksumMismatch", "Manifest packageChecksum is missing.", "Calculate deterministic checksum before import."));
  } else if (catalogPackage.manifest.packageChecksum !== checksum) {
    findings.errors.push(error("checksumMismatch", "Manifest packageChecksum does not match deterministic checksum.", "Regenerate packageChecksum from the exact package contents."));
  }
  if (!hasText(catalogPackage?.publication?.sourcePackageChecksum)) {
    findings.errors.push(error("checksumMismatch", "Publication sourcePackageChecksum is missing.", "Record the package checksum in the publication record."));
  } else if (catalogPackage.publication.sourcePackageChecksum !== checksum) {
    findings.errors.push(error("checksumMismatch", "Publication sourcePackageChecksum does not match deterministic checksum.", "Regenerate sourcePackageChecksum from the exact package contents."));
  }
  for (const asset of catalogPackage?.assets ?? []) {
    const assetReport = validateEvidenceAssetPath(asset, { packageDirectory: options.packageDirectory });
    findings.errors.push(...assetReport.errors.filter((entry) => entry.code === "checksumMismatch").map((entry) => error(entry.code, entry.message, entry.repairSuggestion)));
  }
  return findings;
}

function validateSupersessionChains(catalogPackage) {
  const findings = createCheckFindings();
  const items = catalogPackage?.items ?? [];
  const byID = new Map(items.map((item) => [item.stableInternalID, item]));
  for (const item of items) {
    const supersedes = cleanOptionalID(item?.supersedesStableID);
    const supersededBy = cleanOptionalID(item?.supersededByStableID);
    if (supersedes && !byID.has(supersedes)) {
      findings.errors.push(error("invalidSupersessionReference", `${item.stableInternalID} supersedes missing record ${supersedes}.`, "Include the referenced record in the package or remove the supersession link."));
    }
    if (supersededBy && !byID.has(supersededBy)) {
      findings.errors.push(error("invalidSupersessionReference", `${item.stableInternalID} is superseded by missing record ${supersededBy}.`, "Include the referenced record in the package or remove the supersession link."));
    }
    if (item?.deprecated && !supersededBy && !hasText(item?.deprecatedContext)) {
      findings.errors.push(error("invalidSupersessionChain", `${item.stableInternalID} is deprecated without supersession or context.`, "Record why the option was retired or which verified record supersedes it."));
    }
  }
  for (const item of items) {
    const visited = new Set();
    let current = item;
    while (cleanOptionalID(current?.supersededByStableID)) {
      const nextID = cleanOptionalID(current.supersededByStableID);
      if (visited.has(nextID)) {
        findings.errors.push(error("supersessionCycle", `${item.stableInternalID} participates in a supersession cycle.`, "Break the cycle and keep supersession chains one-way."));
        break;
      }
      visited.add(nextID);
      current = byID.get(nextID);
      if (!current) break;
    }
  }
  return findings;
}

function validateDependencyRecords(catalogPackage) {
  const findings = createCheckFindings();
  const assetIDs = new Set((catalogPackage?.assets ?? []).map((asset) => asset?.assetID).filter(hasText));
  for (const item of catalogPackage?.items ?? []) {
    const id = item?.stableInternalID || "Record";
    if (item?.dependencies === undefined || item.dependencies === null) continue;
    if (!Array.isArray(item.dependencies)) {
      findings.errors.push(error("invalidDependencyRecord", `${id} dependencies must be an array.`, "Record each dependency as a structured object with evidence."));
      continue;
    }
    const seenDependencyIDs = new Set();
    for (const [index, dependency] of item.dependencies.entries()) {
      const dependencyLabel = dependency?.dependencyID || `${id} dependency ${index + 1}`;
      if (!dependency || typeof dependency !== "object" || Array.isArray(dependency)) {
        findings.errors.push(error("invalidDependencyRecord", `${dependencyLabel} is not a structured dependency record.`, "Replace malformed dependency entries with reviewed dependency records."));
        continue;
      }
      if (!hasText(dependency.dependencyID)) {
        findings.errors.push(error("missingDependencyID", `${id} dependency ${index + 1} is missing dependencyID.`, "Assign a stable dependency ID before production import."));
      } else if (seenDependencyIDs.has(dependency.dependencyID)) {
        findings.errors.push(error("duplicateDependencyID", `${id} repeats dependencyID ${dependency.dependencyID}.`, "Keep dependency identifiers unique within each catalog item."));
      }
      if (hasText(dependency.dependencyID)) seenDependencyIDs.add(dependency.dependencyID);
      if (!hasText(dependency.condition)) {
        findings.errors.push(error("invalidDependencyRecord", `${dependencyLabel} is missing a condition.`, "Describe the exact verified condition that changes availability or ordering."));
      }
      if (!hasText(dependency.dependsOnStableID) && !hasText(dependency.dependsOnMenuID)) {
        findings.errors.push(error("invalidDependencyRecord", `${dependencyLabel} is missing dependsOnStableID or dependsOnMenuID.`, "Link the dependency to a catalog record or menu control."));
      }
      if (dependency.dependsOnStableID === id) {
        findings.errors.push(error("invalidDependencyRecord", `${dependencyLabel} depends on its own catalog item.`, "Reference the external record or menu control that actually creates the dependency."));
      }
      if (!Array.isArray(dependency.evidenceFileIDs) || dependency.evidenceFileIDs.length === 0) {
        findings.errors.push(error("missingDependencyEvidence", `${dependencyLabel} is missing evidenceFileIDs.`, "Attach direct evidence for the dependency before import."));
        continue;
      }
      for (const evidenceID of dependency.evidenceFileIDs) {
        if (!hasText(evidenceID)) {
          findings.errors.push(error("missingDependencyEvidence", `${dependencyLabel} includes a blank evidence ID.`, "Remove blank evidence references and attach verified evidence."));
        } else if (!assetIDs.has(evidenceID)) {
          findings.errors.push(error("missingDependencyEvidence", `${dependencyLabel} references unavailable evidence ${evidenceID}.`, "Add the evidence asset record or correct the dependency reference."));
        }
      }
    }
  }
  return findings;
}

function resolveSupportedTargets(catalogPackage, options) {
  const targets = catalogPackage?.supportedTargets ?? {};
  return {
    platforms: options.supportedPlatforms ?? targets.platforms ?? [catalogPackage?.manifest?.catalogVersion?.platform].filter(hasText),
    gameVersions: options.supportedGameVersions ?? targets.gameVersions ?? [catalogPackage?.manifest?.catalogVersion?.gameVersion].filter(hasText),
    gameModes: options.supportedGameModes ?? targets.gameModes ?? unique((catalogPackage?.items ?? []).map((item) => item.gameMode).filter(hasText)),
    creationPaths: options.supportedCreationPaths ?? targets.creationPaths ?? unique((catalogPackage?.items ?? []).map((item) => item.creationPath).filter(hasText))
  };
}

function validateUniqueField(findings, label, values, getter) {
  const seen = new Set();
  for (const value of values) {
    const id = getter(value);
    if (!hasText(id)) continue;
    if (seen.has(id)) findings.errors.push(error("duplicateID", `Duplicate ${label}: ${id}`, "Keep stable identifiers unique inside the import package."));
    seen.add(id);
  }
}

function collectSchemaRefs(value) {
  if (Array.isArray(value)) return value.flatMap(collectSchemaRefs);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) => key === "$ref" && typeof entry === "string" ? [entry] : collectSchemaRefs(entry));
}

function runCheck(report, name, callback) {
  const findings = callback();
  const status = findings.errors.length > 0 ? "fail" : findings.warnings.length > 0 ? "warning" : "pass";
  report.checks.push({ name, status, errors: findings.errors, warnings: findings.warnings });
}

function createImportReport(catalogPackage, options) {
  return {
    schemaVersion: CATALOG_IMPORT_VALIDATION_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packageID: catalogPackage?.packageID ?? "unknown",
    packageVersion: catalogPackage?.packageVersion ?? "unknown",
    ok: false,
    summary: {
      itemCount: Array.isArray(catalogPackage?.items) ? catalogPackage.items.length : 0,
      assetCount: Array.isArray(catalogPackage?.assets) ? catalogPackage.assets.length : 0,
      errorCount: 0,
      warningCount: 0
    },
    checks: [],
    errors: [],
    warnings: [],
    repairSuggestions: []
  };
}

function finalizeImportReport(report) {
  report.errors = report.checks.flatMap((check) => check.errors.map((entry) => ({ ...entry, check: check.name })));
  report.warnings = report.checks.flatMap((check) => check.warnings.map((entry) => ({ ...entry, check: check.name })));
  report.repairSuggestions = unique(report.errors.map((entry) => entry.repairSuggestion).filter(hasText));
  report.summary.errorCount = report.errors.length;
  report.summary.warningCount = report.warnings.length;
  report.ok = report.errors.length === 0;
}

function createCheckFindings() {
  return { errors: [], warnings: [] };
}

function error(code, message, repairSuggestion = "") {
  return repairSuggestion ? { code, message, repairSuggestion } : { code, message };
}

function warning(code, message) {
  return { code, message };
}

function walkValues(value, prefix = "$") {
  if (Array.isArray(value)) return value.flatMap((entry, index) => walkValues(entry, `${prefix}[${index}]`));
  if (!value || typeof value !== "object") return [[prefix, value]];
  return Object.entries(value).flatMap(([key, entry]) => walkValues(entry, `${prefix}.${key}`));
}

function cleanOptionalID(value) {
  return hasText(value) ? value.trim() : "";
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values) {
  return Array.from(new Set(values));
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runCLI(argv) {
  const [command, target, ...rest] = argv;
  if (command === "--check") {
    const { packageRoot, catalogPackage } = createCatalogImportSelfCheckPackage();
    const report = validateCatalogImport(catalogPackage, { packageDirectory: packageRoot, repositoryRoot: defaultRepositoryRoot, generatedAt: "2026-07-10T00:00:00.000Z" });
    fs.rmSync(packageRoot, { recursive: true, force: true });
    if (!report.ok) {
      console.error(formatCatalogImportReport(report));
      return 1;
    }
    console.log(`Catalog import validation check OK (${CATALOG_IMPORT_CHECKS.length} checks).`);
    return 0;
  }
  if (command !== "validate-import" || !target) {
    console.error("Usage: node scripts/catalog-import-validator.mjs validate-import <package.json> [--json]");
    console.error("       node scripts/catalog-import-validator.mjs --check");
    return 1;
  }
  const packagePath = path.resolve(target);
  const report = validateCatalogImport(readJSON(packagePath), {
    packageDirectory: path.dirname(packagePath),
    repositoryRoot: defaultRepositoryRoot
  });
  if (rest.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(formatCatalogImportReport(report));
    if (!report.ok) {
      const baseReport = validatePackage(readJSON(packagePath), { packageDirectory: path.dirname(packagePath), requireVerified: true, requireProductionSource: true });
      if (!baseReport.ok) console.log(formatCatalogToolReport(baseReport));
    }
  }
  return report.ok ? 0 : 1;
}

if (process.argv[1] === currentFile) {
  process.exitCode = runCLI(process.argv.slice(2));
}
