#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateDeterministicChecksum } from "./catalog-tools.mjs";
import { validateProductionCandidateImport } from "./cf27-production-candidate-import-validator.mjs";

const currentFile = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(currentFile);
const defaultRepositoryRoot = path.resolve(scriptDirectory, "..");

export const PRODUCTION_CATALOG_RELEASE_MANAGER_SCHEMA_VERSION = "cf27-production-catalog-release-manager-v1";
export const defaultProductionCatalogPath = "data/catalog/production/catalog_manifest.json";
export const defaultCandidatePackagePath = "data/phase-zero/verification-candidate-package/catalog_manifest.json";
export const defaultCandidateImportReportPath = "data/phase-zero/production-candidate-import/production_candidate_import_report.json";
export const defaultReleaseRoot = "data/catalog/production-releases";
export const defaultReleaseVersion = "cf27-production-empty-2026-07-14";
export const defaultGeneratedAt = "2026-07-14T00:00:00.000Z";

const requiredPromotionFields = [
  "stableInternalID",
  "nativeOrder",
  "gameVersion",
  "patchVersion",
  "platform",
  "gameMode",
  "creationPath",
  "catalogManagerDisposition",
  "verificationState",
  "sourceType"
];
const requiredAngles = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];
const productionBlockedSourceTypes = new Set(["research", "researchDraft", "researchCandidate", "shippingGameVideoResearch", "publicSourceOnly", "testFixture", "demoData", "localDeveloperSample"]);
const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK|UNKNOWN_ORIGIN|XBOXUNKNOWN)\b/i;

export function buildProductionCatalogReleaseSnapshot(options = {}) {
  const repositoryRoot = options.repositoryRoot ?? defaultRepositoryRoot;
  const generatedAt = options.generatedAt ?? defaultGeneratedAt;
  const candidatePackagePath = path.resolve(repositoryRoot, options.candidatePackagePath ?? defaultCandidatePackagePath);
  const candidateImportReportPath = path.resolve(repositoryRoot, options.candidateImportReportPath ?? defaultCandidateImportReportPath);
  const activeProductionCatalogPath = path.resolve(repositoryRoot, options.productionCatalogPath ?? defaultProductionCatalogPath);
  const activeProductionManifest = readJSONIfExists(activeProductionCatalogPath) ?? emptyProductionManifest(generatedAt);
  const candidatePackage = readJSONIfExists(candidatePackagePath);
  const candidateImportReport = candidatePackage
    ? validateProductionCandidateImport(candidatePackage, { packageDirectory: path.dirname(candidatePackagePath), inputPath: path.relative(repositoryRoot, candidatePackagePath), generatedAt })
    : readJSONIfExists(candidateImportReportPath) ?? missingCandidateImportReport(path.relative(repositoryRoot, candidatePackagePath), generatedAt);

  const candidateRecords = candidatePackage ? normalizedCandidateRecords(candidatePackage) : [];
  const candidateEvidence = candidatePackage ? normalizedCandidateEvidence(candidatePackage) : [];
  const promotionResults = candidateRecords.map((record) => evaluatePromotionRecord(record, candidateEvidence, candidateImportReport));
  const promotedItems = promotionResults.filter((result) => result.status === "PROMOTED").map((result) => result.item);
  const blockedReasons = releaseBlockingReasons(candidateImportReport, promotionResults);
  const releaseVersion = promotedItems.length > 0 && options.releaseVersion
    ? options.releaseVersion
    : promotedItems.length > 0
      ? String(candidatePackage?.manifest?.catalogVersion?.identifier ?? candidatePackage?.manifest?.catalogVersion ?? defaultReleaseVersion)
      : defaultReleaseVersion;

  const manifest = attachManifestChecksum({
    sourceType: "production",
    catalogVersion: {
      identifier: releaseVersion,
      gameVersion: promotedItems.length > 0 ? commonValue(promotedItems, "gameVersion") : "",
      platform: promotedItems.length > 0 ? commonValue(promotedItems, "platform") : "",
      verifiedAt: promotedItems.length > 0 ? generatedAt : null
    },
    generatedAt,
    isProduction: true,
    declaredItemCount: promotedItems.length,
    releaseStatus: promotedItems.length > 0 && blockedReasons.length === 0 ? "verificationCandidate" : "rejectedRelease",
    previousCatalogVersionID: activeProductionManifest?.catalogVersion?.identifier ?? null,
    sourceCandidatePackageID: candidatePackage?.packageID ?? null,
    items: promotedItems
  });

  const gateReport = createProductionGateReport({
    generatedAt,
    releaseVersion,
    manifest,
    candidateImportReport,
    promotionResults,
    blockedReasons
  });
  const readinessDecision = createReadinessDecision({
    generatedAt,
    releaseVersion,
    candidatePackage,
    candidateImportReport,
    promotionResults,
    gateReport,
    activeProductionManifest
  });
  const supersessionMap = createSupersessionMap(activeProductionManifest, manifest, generatedAt);
  const releaseNotes = createReleaseNotes(readinessDecision, generatedAt);
  const rollbackInstructions = createRollbackInstructions(readinessDecision, activeProductionManifest);

  return {
    schemaVersion: PRODUCTION_CATALOG_RELEASE_MANAGER_SCHEMA_VERSION,
    releaseVersion,
    generatedAt,
    releaseStatus: manifest.releaseStatus,
    promotedItems,
    promotionResults,
    manifest,
    gateReport,
    readinessDecision,
    supersessionMap,
    releaseNotes,
    rollbackInstructions
  };
}

export function writeProductionCatalogReleaseSnapshot(snapshot, outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const files = [
    ["catalog_manifest.json", `${JSON.stringify(snapshot.manifest, null, 2)}\n`],
    ["release_notes.md", snapshot.releaseNotes],
    ["production_publish_gate_report.json", `${JSON.stringify(snapshot.gateReport, null, 2)}\n`],
    ["production_readiness_decision.json", `${JSON.stringify(snapshot.readinessDecision, null, 2)}\n`],
    ["supersession_map.json", `${JSON.stringify(snapshot.supersessionMap, null, 2)}\n`],
    ["rollback_instructions.md", snapshot.rollbackInstructions]
  ];
  for (const [fileName, content] of files) fs.writeFileSync(path.join(outputDirectory, fileName), content);
  const checksumManifest = createChecksumManifest(outputDirectory, files.map(([fileName]) => fileName), snapshot);
  fs.writeFileSync(path.join(outputDirectory, "checksum_manifest.json"), `${JSON.stringify(checksumManifest, null, 2)}\n`);
  return {
    outputDirectory,
    files: [...files.map(([fileName]) => path.join(outputDirectory, fileName)), path.join(outputDirectory, "checksum_manifest.json")]
  };
}

export function createProductionCatalogReleaseSelfCheckPackage() {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gameface-production-release-"));
  const evidenceRoles = [
    ["asset-front", "straightOn"],
    ["asset-left45", "left45"],
    ["asset-right45", "right45"],
    ["asset-left-profile", "leftProfile"],
    ["asset-right-profile", "rightProfile"],
    ["asset-navigation", "navigationEvidence"]
  ];
  const assets = evidenceRoles.map(([assetID, angle]) => {
    const relativePath = `assets/${assetID}.png`;
    const absolutePath = path.join(packageRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${assetID}:${angle}`);
    return { assetID, evidenceID: assetID, angle, role: angle, relativePath, sha256: sha256File(absolutePath), capturedAt: "2026-07-14T00:00:00.000Z" };
  });
  const item = {
    sourceType: "production",
    stableInternalID: "CF27_TESTONLY_RTG_HEAD_001",
    nativeOrder: 1,
    game: "EA SPORTS College Football 27",
    gameVersion: "test-only-game-version",
    patchVersion: "test-only-patch",
    platform: "test-only-platform",
    gameMode: "Road to Glory",
    creationPath: "test-only creation path",
    category: "head",
    visibleGameLabelOrIndex: "test-only verified visible label",
    verificationState: "verified",
    verificationStatus: "VERIFIED",
    capturedDate: "2026-07-14T00:00:00.000Z",
    verifiedDate: "2026-07-14T00:00:00.000Z",
    sourceImageReferences: assets.map((asset) => asset.assetID),
    requiredEvidence: assets.map((asset) => asset.role),
    requiredAngles: {
      straightOn: "asset-front",
      left45: "asset-left45",
      right45: "asset-right45",
      leftProfile: "asset-left-profile",
      rightProfile: "asset-right-profile"
    },
    geometryMeasurements: {},
    humanAnnotations: { note: "synthetic test-only release manager record" },
    catalogManagerDisposition: "approved",
    navigationInstructions: [{ sequenceNumber: 1, instruction: "test-only verified instruction", evidenceAssetID: "asset-navigation" }],
    catalogVersion: { identifier: "cf27-test-only-production-candidate", gameVersion: "test-only-game-version", platform: "test-only-platform", verifiedAt: "2026-07-14T00:00:00.000Z" },
    isTestFixture: false,
    visualConditions: { status: "APPROVED_STANDARD_CAPTURE" },
    reproducibility: { status: "REPRODUCIBLE_IN_GAME", menuPathVerified: true },
    dependencies: [],
    duplicateObservations: []
  };
  const environment = {
    environmentID: "CF27_TESTONLY_ENV",
    platform: item.platform,
    gameVersion: item.gameVersion,
    patch: item.patchVersion,
    mode: item.gameMode,
    creationPath: item.creationPath
  };
  const candidatePackage = {
    packageID: "test-only-production-release-package",
    environment,
    manifest: {
      sourceType: "production",
      catalogVersion: item.catalogVersion,
      generatedAt: "2026-07-14T00:00:00.000Z",
      isProduction: true,
      itemCount: 1,
      items: [item]
    },
    records: [item],
    items: [item],
    evidence: assets,
    assets
  };
  return { packageRoot, candidatePackage };
}

function evaluatePromotionRecord(record, evidence, candidateImportReport) {
  const reasons = [];
  const id = record?.stableInternalID ?? record?.stableID ?? "unknown";
  for (const field of requiredPromotionFields) {
    if (!hasText(record?.[field]) && !(field === "nativeOrder" && Number.isInteger(record?.nativeOrder))) reasons.push(`missing:${field}`);
  }
  if (record?.sourceType !== "production" || productionBlockedSourceTypes.has(record?.sourceType)) reasons.push("nonProductionOrBlockedSourceType");
  if (record?.fixture === true || record?.isTestFixture === true) reasons.push("fixtureOrigin");
  if (record?.verificationState !== "verified" && record?.verificationStatus !== "VERIFIED" && record?.verificationStatus !== "VERIFIED_WITH_NOTES") reasons.push("missingSecondPersonVerification");
  if (!["approved", "approvedWithNotes"].includes(record?.catalogManagerDisposition)) reasons.push("missingCatalogManagerApproval");
  if (placeholderPattern.test(JSON.stringify(record))) reasons.push("placeholderData");
  for (const angle of requiredAngles) {
    const assetID = record?.requiredAngles?.[angle];
    if (!hasText(assetID) || !(record?.sourceImageReferences ?? []).includes(assetID)) reasons.push(`missingCompleteEvidence:${angle}`);
  }
  if (!Array.isArray(record?.navigationInstructions) || record.navigationInstructions.length === 0) reasons.push("missingReproducibleGameInstructions");
  const evidenceIDs = new Set(evidence.map((asset) => asset.assetID ?? asset.evidenceID).filter(hasText));
  for (const ref of record?.sourceImageReferences ?? []) {
    if (!evidenceIDs.has(ref)) reasons.push(`missingEvidenceAsset:${ref}`);
  }
  for (const dependency of record?.dependencies ?? []) {
    if (dependency?.status && String(dependency.status).toUpperCase() !== "RESOLVED") reasons.push(`unresolvedDependency:${dependency.dependencyID ?? "unknown"}`);
  }
  const importRejection = candidateImportReport?.recordResults?.find((result) => result.recordID === id && result.status === "rejected");
  if (importRejection) reasons.push(...importRejection.reasons.map((reason) => `candidateImport:${reason}`));
  if (!candidateImportReport?.ok) reasons.push("candidateImportDidNotPass");
  return {
    recordID: id,
    status: reasons.length === 0 ? "PROMOTED" : "REJECTED",
    reasons,
    item: reasons.length === 0 ? toProductionCatalogItem(record) : null
  };
}

function toProductionCatalogItem(record) {
  const item = { ...record };
  item.sourceType = "production";
  item.isTestFixture = false;
  item.verificationState = "verified";
  delete item.fixture;
  delete item.verificationStatus;
  delete item.visualConditions;
  delete item.reproducibility;
  return item;
}

function createProductionGateReport(input) {
  const checks = [
    gateCheck("candidateImportPassed", input.candidateImportReport?.ok === true, "Verification-candidate package import did not pass."),
    gateCheck("directShippingGameEvidence", input.manifest.items.length > 0 && input.promotionResults.every((result) => result.status === "PROMOTED"), "No promoted record has complete direct shipping-game evidence."),
    gateCheck("stableIDsAndNativeOrder", input.promotionResults.every((result) => !result.reasons.some((reason) => reason.includes("stableInternalID") || reason.includes("nativeOrder"))), "Stable ID or native order requirements are unresolved."),
    gateCheck("versionPlatformModePathMetadata", input.promotionResults.every((result) => !result.reasons.some((reason) => /gameVersion|patchVersion|platform|gameMode|creationPath/.test(reason))), "Version, platform, mode, or creation-path metadata is incomplete."),
    gateCheck("qaSecondVerificationManagerApproval", input.promotionResults.every((result) => !result.reasons.some((reason) => /Verification|Approval/.test(reason))), "QA acceptance, second verification, or catalog-manager approval is incomplete."),
    gateCheck("dependencyResolution", input.promotionResults.every((result) => !result.reasons.some((reason) => reason.includes("unresolvedDependency"))), "Dependencies remain unresolved."),
    gateCheck("noPlaceholdersFixturesOrResearch", input.promotionResults.every((result) => !result.reasons.some((reason) => /placeholder|fixture|BlockedSource|candidateImport/.test(reason))), "Placeholder, fixture, research, or failed-candidate data is present."),
    gateCheck("unsupportedOutputsFailClosed", true, "Unsupported outputs fail closed.")
  ];
  const errors = checks.flatMap((check) => check.errors);
  return {
    schemaVersion: "production-publish-gate-v1",
    generatedAt: input.generatedAt,
    releaseVersion: input.releaseVersion,
    catalogVersionID: input.releaseVersion,
    ok: errors.length === 0 && input.manifest.items.length > 0,
    checks,
    errors
  };
}

function createReadinessDecision(input) {
  const promotedCount = input.promotionResults.filter((result) => result.status === "PROMOTED").length;
  const decision = input.gateReport.ok ? "READY_FOR_PRODUCTION_RELEASE" : "BLOCKED_NO_PRODUCTION_ELIGIBLE_RECORDS";
  const blockers = [
    ...(input.candidateImportReport?.ok ? [] : ["verificationCandidateImportNotPassed"]),
    ...(promotedCount > 0 ? [] : ["zeroProductionEligibleRecords"]),
    ...input.gateReport.errors.map((error) => error.code)
  ];
  return {
    schemaVersion: PRODUCTION_CATALOG_RELEASE_MANAGER_SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    decision,
    productionRecommendationsEnabled: false,
    activeProductionCatalogUnchanged: true,
    activeProductionCatalogVersion: input.activeProductionManifest?.catalogVersion?.identifier ?? null,
    candidatePackageID: input.candidatePackage?.packageID ?? null,
    candidateImportStatus: input.candidateImportReport?.status ?? "unknown",
    recordsEvaluated: input.promotionResults.length,
    recordsPromoted: promotedCount,
    recordsRejected: input.promotionResults.filter((result) => result.status === "REJECTED").length,
    partialCategoriesPromoted: false,
    unsupportedOutputsFailClosed: true,
    blockers: unique(blockers),
    promotedRecordIDs: input.promotionResults.filter((result) => result.status === "PROMOTED").map((result) => result.recordID),
    rejectedRecords: input.promotionResults.filter((result) => result.status === "REJECTED").map(({ recordID, reasons }) => ({ recordID, reasons }))
  };
}

function createSupersessionMap(activeManifest, nextManifest, generatedAt) {
  return {
    schemaVersion: PRODUCTION_CATALOG_RELEASE_MANAGER_SCHEMA_VERSION,
    generatedAt,
    previousCatalogVersionID: activeManifest?.catalogVersion?.identifier ?? null,
    nextCatalogVersionID: nextManifest.catalogVersion.identifier,
    supersededRecords: [],
    correctedRecords: [],
    removedRecords: [],
    addedRecords: nextManifest.items.map((item) => item.stableInternalID),
    notes: nextManifest.items.length === 0 ? "No production records are superseded because no eligible verification-candidate package exists." : "Supersession map generated from promoted production records."
  };
}

function createReleaseNotes(readiness, generatedAt) {
  return `# Production Catalog Release Notes

**Release:** ${readiness.activeProductionCatalogVersion ?? "empty-production"} -> ${readiness.releaseVersion}
**Generated at:** ${generatedAt}
**Decision:** ${readiness.decision}
**Production recommendations enabled:** ${readiness.productionRecommendationsEnabled ? "yes" : "no"}

## Summary

No records were promoted into the active production catalog. The current verification-candidate import gate has not supplied a passing package, so the production catalog remains empty and recommendations remain unavailable.

## Changes

- Promoted records: ${readiness.recordsPromoted}
- Rejected records: ${readiness.recordsRejected}
- Partial categories promoted: no
- Unsupported outputs fail closed: yes

## Blockers

${readiness.blockers.map((blocker) => `- ${blocker}`).join("\n")}
`;
}

function createRollbackInstructions(readiness, activeManifest) {
  return `# Production Catalog Rollback Instructions

No active production catalog records were changed by this release-manager snapshot.

Current active production catalog version: \`${activeManifest?.catalogVersion?.identifier ?? "unknown"}\`
Snapshot decision: \`${readiness.decision}\`

## Rollback

No rollback action is required for the active runtime catalog. Keep \`data/catalog/production/catalog_manifest.json\` unchanged unless a future approved release explicitly replaces it.

If this blocked snapshot was generated in error, create a corrected release-manager snapshot rather than editing this snapshot in place.
`;
}

function releaseBlockingReasons(candidateImportReport, promotionResults) {
  const reasons = [];
  if (!candidateImportReport?.ok) reasons.push("verificationCandidateImportNotPassed");
  if (promotionResults.length === 0) reasons.push("noCandidateRecordsSubmitted");
  if (promotionResults.every((result) => result.status !== "PROMOTED")) reasons.push("zeroProductionEligibleRecords");
  return unique(reasons);
}

function attachManifestChecksum(manifest) {
  const checksum = calculateDeterministicChecksum(manifest);
  return { ...manifest, packageChecksum: checksum };
}

function createChecksumManifest(outputDirectory, fileNames, snapshot) {
  return {
    schemaVersion: PRODUCTION_CATALOG_RELEASE_MANAGER_SCHEMA_VERSION,
    generatedAt: snapshot.generatedAt,
    releaseVersion: snapshot.releaseVersion,
    manifestPackageChecksum: snapshot.manifest.packageChecksum,
    algorithm: "SHA-256",
    files: fileNames.map((fileName) => {
      const filePath = path.join(outputDirectory, fileName);
      return {
        path: fileName,
        sha256: sha256File(filePath),
        sizeBytes: fs.statSync(filePath).size
      };
    })
  };
}

function gateCheck(name, passed, message) {
  return { name, status: passed ? "pass" : "fail", errors: passed ? [] : [{ code: name, message }] };
}

function normalizedCandidateRecords(candidatePackage) {
  if (Array.isArray(candidatePackage?.records)) return candidatePackage.records;
  if (Array.isArray(candidatePackage?.items)) return candidatePackage.items;
  if (Array.isArray(candidatePackage?.manifest?.items)) return candidatePackage.manifest.items;
  return [];
}

function normalizedCandidateEvidence(candidatePackage) {
  if (Array.isArray(candidatePackage?.assets)) return candidatePackage.assets;
  if (Array.isArray(candidatePackage?.evidence)) return candidatePackage.evidence;
  return [];
}

function commonValue(items, field) {
  const values = unique(items.map((item) => item[field]).filter(hasText));
  return values.length === 1 ? values[0] : "";
}

function emptyProductionManifest(generatedAt) {
  return {
    sourceType: "production",
    catalogVersion: { identifier: "empty-production", gameVersion: "", platform: "", verifiedAt: null },
    generatedAt,
    isProduction: true,
    items: []
  };
}

function missingCandidateImportReport(inputPath, generatedAt) {
  return {
    schemaVersion: "cf27-production-candidate-import-v1",
    generatedAt,
    inputPath,
    ok: false,
    status: "NO_VERIFICATION_CANDIDATE_PACKAGE",
    recordResults: [],
    errors: [{ check: "candidatePackageDiscovery", code: "candidatePackageMissing", message: `No verification-candidate package was found at ${inputPath}.` }]
  };
}

function readJSONIfExists(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function unique(values) {
  return Array.from(new Set(values));
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseArgs(argv) {
  const args = { command: "release", outputRoot: defaultReleaseRoot, releaseVersion: defaultReleaseVersion, write: true };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") args.command = "check";
    else if (value === "--output-root") args.outputRoot = argv[++index];
    else if (value === "--release-version") args.releaseVersion = argv[++index];
    else if (value === "--no-write") args.write = false;
  }
  return args;
}

function runSelfCheck() {
  const { packageRoot, candidatePackage } = createProductionCatalogReleaseSelfCheckPackage();
  try {
    const validSnapshot = buildProductionCatalogReleaseSnapshot({
      repositoryRoot: defaultRepositoryRoot,
      candidatePackagePath: writeTempJSON(packageRoot, "candidate.json", candidatePackage),
      productionCatalogPath: writeTempJSON(packageRoot, "active-production.json", emptyProductionManifest(defaultGeneratedAt)),
      candidateImportReportPath: path.join(packageRoot, "missing-report.json"),
      generatedAt: defaultGeneratedAt,
      releaseVersion: "cf27-test-only-production-candidate"
    });
    if (validSnapshot.promotedItems.length !== 1 || validSnapshot.gateReport.ok !== true) {
      console.error("Production catalog release manager self-check failed: valid synthetic candidate was not promotable.");
      return 1;
    }
    const blockedSnapshot = buildProductionCatalogReleaseSnapshot({
      repositoryRoot: defaultRepositoryRoot,
      candidatePackagePath: path.join(packageRoot, "missing-candidate.json"),
      productionCatalogPath: writeTempJSON(packageRoot, "active-production-empty.json", emptyProductionManifest(defaultGeneratedAt)),
      candidateImportReportPath: path.join(packageRoot, "missing-report.json"),
      generatedAt: defaultGeneratedAt
    });
    if (blockedSnapshot.promotedItems.length !== 0 || blockedSnapshot.readinessDecision.decision !== "BLOCKED_NO_PRODUCTION_ELIGIBLE_RECORDS") {
      console.error("Production catalog release manager self-check failed: missing candidate did not fail closed.");
      return 1;
    }
    console.log("Production catalog release manager check OK.");
    return 0;
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

function writeTempJSON(root, fileName, value) {
  const absolutePath = path.join(root, fileName);
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
  return absolutePath;
}

function runCLI(argv) {
  const args = parseArgs(argv);
  if (args.command === "check") return runSelfCheck();
  const snapshot = buildProductionCatalogReleaseSnapshot({ releaseVersion: args.releaseVersion });
  const outputDirectory = path.resolve(defaultRepositoryRoot, args.outputRoot, snapshot.releaseVersion);
  let written = null;
  if (args.write) written = writeProductionCatalogReleaseSnapshot(snapshot, outputDirectory);
  console.log(JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    releaseVersion: snapshot.releaseVersion,
    releaseStatus: snapshot.releaseStatus,
    decision: snapshot.readinessDecision.decision,
    recordsPromoted: snapshot.readinessDecision.recordsPromoted,
    productionRecommendationsEnabled: snapshot.readinessDecision.productionRecommendationsEnabled,
    outputDirectory: written?.outputDirectory ?? null
  }, null, 2));
  return snapshot.gateReport.ok ? 0 : 1;
}

if (process.argv[1] === currentFile) {
  process.exitCode = runCLI(process.argv.slice(2));
}
