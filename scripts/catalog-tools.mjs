#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const requiredAngles = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];
export const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;
export const screenshotNamePattern = /^cfb27__[a-z0-9-]+__[a-z0-9.-]+__[a-z0-9-]+__(straightOn|left45|right45|leftProfile|rightProfile|navigationEvidence)__\d{8}\.(png|jpg|jpeg|webp)$/i;
export const sourceTypes = ["production", "researchDraft", "testFixture", "demoData", "localDeveloperSample"];
const sourceTypeSet = new Set(sourceTypes);
const productionBlockedSourceTypes = new Set(["researchDraft", "testFixture", "demoData", "localDeveloperSample"]);
const validVerificationStates = new Set(["verified", "unverified", "rejected", "archived"]);
const allowedTransitions = new Set(["draft->verified", "unverified->verified", "reviewed->verified", "reviewed->archived"]);
const csvColumns = [
  "sourceType",
  "stableInternalID",
  "platform",
  "gameVersion",
  "patchVersion",
  "gameMode",
  "creationPath",
  "category",
  "visibleGameLabelOrIndex",
  "straightOn",
  "left45",
  "right45",
  "leftProfile",
  "rightProfile",
  "navigationInstruction",
  "navigationEvidenceAssetID",
  "captureConditions",
  "humanAnnotation"
];

export function validateRecord(record, options = {}) {
  const report = createReport("record");
  const id = stringValue(record?.stableInternalID);
  if (!id) addError(report, "missingStableID", "Record is missing stableInternalID.");
  if (containsPlaceholder(record)) addError(report, "placeholderToken", `${id || "Record"} contains a placeholder token.`);
  for (const [field, label] of [
    ["platform", "platform"],
    ["gameVersion", "game version"],
    ["gameMode", "game mode"],
    ["creationPath", "creation path"]
  ]) {
    if (!stringValue(record?.[field])) addError(report, `missing-${field}`, `${id || "Record"} is missing ${label}.`);
  }
  if (!validVerificationStates.has(record?.verificationState)) {
    addError(report, "invalidVerificationState", `${id || "Record"} has an invalid verification state.`);
  }
  if (!isValidVisibleLabel(record?.visibleGameLabelOrIndex)) {
    addError(report, "invalidVisibleLabel", `${id || "Record"} is missing an exact visible game label or index from evidence.`);
  }
  if ((options.requireVerified ?? true) && record?.verificationState !== "verified") {
    addError(report, "unverifiedRecord", `${id || "Record"} is not verified.`);
  }
  validateSourceType(report, record, id || "Record", options);
  if (record?.isTestFixture) addError(report, "fixtureFlag", `${id || "Record"} is marked as a fixture.`);
  validateDateField(report, record?.capturedDate, "capturedDate", id);
  if (record?.verificationState === "verified") validateDateField(report, record?.verifiedDate, "verifiedDate", id);
  validateDateField(report, record?.catalogVersion?.verifiedAt, "catalogVersion.verifiedAt", id, { allowNull: true });
  if (record?.deprecated && !stringValue(record?.deprecatedContext)) {
    addError(report, "deprecatedContextMissing", `${id || "Record"} is deprecated without required context.`);
  }

  const sourceRefs = Array.isArray(record?.sourceImageReferences) ? record.sourceImageReferences : [];
  if (sourceRefs.length === 0) addError(report, "missingSourceImage", `${id || "Record"} has no source image references.`);
  for (const angle of requiredAngles) {
    const assetID = record?.requiredAngles?.[angle];
    if (!stringValue(assetID)) {
      addError(report, "missingRequiredAngle", `${id || "Record"} is missing required angle ${angle}.`);
    } else if (!sourceRefs.includes(assetID)) {
      addError(report, "missingSourceImage", `${id || "Record"} required angle ${angle} is not listed in sourceImageReferences.`);
    }
  }

  for (const [measurementID, measurement] of Object.entries(record?.geometryMeasurements ?? {})) {
    validateMeasurement(report, measurementID, measurement, id);
  }

  if (options.availableAssetIDs) {
    for (const reference of sourceRefs) {
      if (!options.availableAssetIDs.has(reference)) addError(report, "missingAsset", `${id || "Record"} references unavailable asset ${reference}.`);
    }
    for (const instruction of record?.navigationInstructions ?? []) {
      if (instruction?.evidenceAssetID && !options.availableAssetIDs.has(instruction.evidenceAssetID)) {
        addError(report, "missingAsset", `${id || "Record"} navigation evidence asset is unavailable: ${instruction.evidenceAssetID}.`);
      }
    }
  }

  const navigationInstructions = Array.isArray(record?.navigationInstructions) ? record.navigationInstructions : [];
  if (navigationInstructions.length === 0) {
    addError(report, "missingNavigationInstruction", `${id || "Record"} is missing menu navigation instructions.`);
  }
  for (const instruction of navigationInstructions) {
    if (!Number.isInteger(instruction?.sequenceNumber) || instruction.sequenceNumber < 1 || !stringValue(instruction?.instruction)) {
      addError(report, "invalidNavigationInstruction", `${id || "Record"} has an invalid navigation instruction.`);
    }
    if (containsPlaceholder(instruction)) {
      addError(report, "placeholderToken", `${id || "Record"} navigation instruction contains a placeholder token.`);
    }
    if (!stringValue(instruction?.evidenceAssetID)) {
      addError(report, "missingNavigationEvidence", `${id || "Record"} navigation instruction is missing evidence asset ID.`);
    }
  }

  return finalizeReport(report);
}

export function validateManifest(manifest, options = {}) {
  const report = createReport("manifest");
  if (!manifest || !manifest.catalogVersion || !Array.isArray(manifest.items)) {
    addError(report, "malformedManifest", "Catalog manifest is malformed.");
    return finalizeReport(report);
  }
  if (containsPlaceholder(manifest)) addError(report, "placeholderToken", "Manifest contains a placeholder token.");
  validateSourceType(report, manifest, "Manifest", options);
  validateDateField(report, manifest.generatedAt, "generatedAt", "manifest");
  validateDateField(report, manifest.catalogVersion.verifiedAt, "catalogVersion.verifiedAt", "manifest", { allowNull: true });
  if (Number.isInteger(manifest.declaredItemCount) && manifest.declaredItemCount !== manifest.items.length) {
    addError(report, "incorrectManifestItemCount", `Manifest declares ${manifest.declaredItemCount} items but contains ${manifest.items.length}.`);
  }
  const packageItems = options.packageItems;
  if (packageItems && manifest.items.length !== packageItems.length) {
    addError(report, "incorrectManifestItemCount", `Manifest item count ${manifest.items.length} does not match package item count ${packageItems.length}.`);
  }
  return finalizeReport(report);
}

export function validatePackage(catalogPackage, options = {}) {
  const report = createReport("package");
  if (!catalogPackage || !catalogPackage.manifest || !Array.isArray(catalogPackage.items)) {
    addError(report, "malformedPackage", "Catalog package is malformed.");
    return finalizeReport(report);
  }
  mergeReport(report, validateManifest(catalogPackage.manifest, { packageItems: catalogPackage.items, requireProductionSource: options.requireProductionSource ?? options.requireVerified ?? true }));
  if (containsPlaceholder(catalogPackage)) addError(report, "placeholderToken", "Catalog package contains a placeholder token.");

  const assetMap = new Map((catalogPackage.assets ?? []).map((asset) => [asset.assetID, asset]));
  const availableAssetIDs = new Set(assetMap.keys());
  const seen = new Set();
  for (const item of catalogPackage.items) {
    const id = stringValue(item?.stableInternalID);
    if (id && seen.has(id)) addError(report, "duplicateStableID", `Duplicate stable ID: ${id}`);
    if (id) seen.add(id);
    if (
      catalogPackage.manifest?.catalogVersion?.gameVersion &&
      item?.gameVersion &&
      catalogPackage.manifest.catalogVersion.gameVersion !== item.gameVersion
    ) {
      addError(report, "patchMismatch", `${id || "Record"} game version does not match the package manifest.`);
    }
    if (catalogPackage.manifest?.catalogVersion?.platform && item?.platform && catalogPackage.manifest.catalogVersion.platform !== item.platform) {
      addError(report, "platformMismatch", `${id || "Record"} platform does not match the package manifest.`);
    }
    mergeReport(report, validateRecord(item, { availableAssetIDs, requireVerified: options.requireVerified ?? true, requireProductionSource: options.requireProductionSource ?? options.requireVerified ?? true }));
    validateRequiredReviews(catalogPackage, item, report);
  }

  for (const asset of catalogPackage.assets ?? []) {
    validateDateField(report, asset?.capturedAt, "asset.capturedAt", asset?.assetID);
    validateScreenshotName(asset, report);
    if (options.packageDirectory && asset?.relativePath) {
      const assetPath = path.resolve(options.packageDirectory, asset.relativePath);
      if (!fs.existsSync(assetPath)) {
        addError(report, "missingAsset", `Asset file missing: ${asset.relativePath}`);
      } else {
        const actual = sha256File(assetPath);
        if (asset.sha256 && asset.sha256 !== actual) addError(report, "checksumMismatch", `Asset checksum mismatch for ${asset.assetID}.`);
      }
    }
  }

  for (const review of catalogPackage.reviews ?? []) {
    validateDateField(report, review?.reviewedAt, "reviewedAt", review?.reviewID);
    if (review?.decision !== "approved" && review?.decision !== "rejected") {
      addError(report, "invalidReviewDecision", `${review?.reviewID ?? "Review"} has an invalid decision.`);
    }
  }
  validatePublication(catalogPackage, report);

  const checksum = calculateDeterministicChecksum(catalogPackage);
  if (!catalogPackage.manifest.packageChecksum) {
    addError(report, "checksumMismatch", "Manifest packageChecksum is missing.");
  } else if (catalogPackage.manifest.packageChecksum !== checksum) {
    addError(report, "checksumMismatch", "Manifest packageChecksum does not match deterministic checksum.");
  }
  if (!catalogPackage.publication?.sourcePackageChecksum) {
    addError(report, "checksumMismatch", "Publication sourcePackageChecksum is missing.");
  } else if (catalogPackage.publication.sourcePackageChecksum !== checksum) {
    addError(report, "checksumMismatch", "Publication sourcePackageChecksum does not match deterministic checksum.");
  }
  report.checksum = checksum;
  return finalizeReport(report);
}

export function createAuditSession(input = {}) {
  const now = input.createdAt ?? new Date().toISOString();
  return {
    sessionID: input.sessionID ?? `audit-${now.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8)}`,
    sourceType: "researchDraft",
    game: "EA SPORTS College Football 27",
    platform: input.platform ?? "REPLACE_WITH_VERIFIED_PLATFORM",
    gameVersion: input.gameVersion ?? "REPLACE_WITH_VERIFIED_GAME_VERSION",
    patchVersion: input.patchVersion ?? "REPLACE_WITH_PATCH_OR_BUILD_IDENTIFIER",
    gameMode: input.gameMode ?? "Road to Glory",
    creationPath: input.creationPath ?? "REPLACE_WITH_VERIFIED_ROAD_TO_GLORY_CREATION_PATH",
    auditor: input.auditor ?? "REPLACE_WITH_AUDITOR_NAME",
    createdAt: now,
    categories: [],
    records: [],
    notes: "NOT PRODUCTION DATA - NOT A VERIFIED GAME RECORD"
  };
}

export function validateAuditRecord(record, options = {}) {
  const report = validateRecord(record, { ...options, requireVerified: false });
  if (record?.sourceType !== "researchDraft") {
    addError(report, "invalidAuditSourceType", `${record?.stableInternalID || "Record"} audit records must use sourceType researchDraft.`);
  }
  if (record?.verificationState === "verified") {
    addError(report, "autoVerificationBlocked", `${record?.stableInternalID || "Record"} cannot be marked verified during audit entry.`);
  }
  const missingAngles = requiredAngles.filter((angle) => !stringValue(record?.requiredAngles?.[angle]));
  if (missingAngles.length > 0) report.nextActions = [`Capture missing standard screenshots: ${missingAngles.join(", ")}`];
  else report.nextActions = ["Complete first reviewer checklist, then second reviewer checklist."];
  report.progress = auditProgress([record]);
  return finalizeReport(report);
}

export function importCatalogItemsFromCsv(csvText, defaults = {}) {
  const rows = parseCSV(csvText);
  return rows.map((row) => {
    const requiredAnglesMap = Object.fromEntries(requiredAngles.map((angle) => [angle, row[angle] ?? ""]));
    const sourceImageReferences = requiredAngles.map((angle) => row[angle]).filter((value) => stringValue(value));
    const navigationInstruction = row.navigationInstruction ?? "";
    const navigationEvidenceAssetID = row.navigationEvidenceAssetID ?? "";
    return {
      stableInternalID: row.stableInternalID ?? "",
      sourceType: "researchDraft",
      game: "EA SPORTS College Football 27",
      gameVersion: row.gameVersion ?? defaults.gameVersion ?? "",
      patchVersion: row.patchVersion ?? defaults.patchVersion ?? "",
      platform: row.platform ?? defaults.platform ?? "",
      gameMode: row.gameMode ?? defaults.gameMode ?? "Road to Glory",
      creationPath: row.creationPath ?? defaults.creationPath ?? "",
      category: row.category ?? "",
      visibleGameLabelOrIndex: row.visibleGameLabelOrIndex ?? "",
      verificationState: "unverified",
      capturedDate: defaults.capturedDate ?? new Date().toISOString(),
      verifiedDate: null,
      sourceImageReferences,
      requiredAngles: requiredAnglesMap,
      geometryMeasurements: {},
      humanAnnotations: {
        captureConditions: row.captureConditions ?? "",
        note: row.humanAnnotation ?? ""
      },
      navigationInstructions: navigationInstruction
        ? [
            {
              sequenceNumber: 1,
              instruction: navigationInstruction,
              evidenceAssetID: navigationEvidenceAssetID
            }
          ]
        : [],
      catalogVersion: {
        identifier: defaults.catalogVersionID ?? "audit-draft",
        gameVersion: row.gameVersion ?? defaults.gameVersion ?? "",
        platform: row.platform ?? defaults.platform ?? "",
        verifiedAt: null
      },
      isTestFixture: false,
      deprecated: false,
      deprecatedContext: null
    };
  });
}

export function exportCatalogItemsToCsv(items) {
  const rows = items.map((item) => ({
    sourceType: item.sourceType,
    stableInternalID: item.stableInternalID,
    platform: item.platform,
    gameVersion: item.gameVersion,
    patchVersion: item.patchVersion ?? "",
    gameMode: item.gameMode,
    creationPath: item.creationPath,
    category: item.category,
    visibleGameLabelOrIndex: item.visibleGameLabelOrIndex,
    ...Object.fromEntries(requiredAngles.map((angle) => [angle, item.requiredAngles?.[angle] ?? ""])),
    navigationInstruction: item.navigationInstructions?.[0]?.instruction ?? "",
    navigationEvidenceAssetID: item.navigationInstructions?.[0]?.evidenceAssetID ?? "",
    captureConditions: item.humanAnnotations?.captureConditions ?? "",
    humanAnnotation: item.humanAnnotations?.note ?? item.humanAnnotations?.reviewNote ?? ""
  }));
  return serializeCSV(rows, csvColumns);
}

export function compareCatalogVersions(previousManifest, nextManifest) {
  const previousItems = new Map((previousManifest?.items ?? []).map((item, index) => [item.stableInternalID, { item, index }]));
  const nextItems = new Map((nextManifest?.items ?? []).map((item, index) => [item.stableInternalID, { item, index }]));
  const added = [];
  const removed = [];
  const changedLabels = [];
  const reorderedOptions = [];
  const retiredOptions = [];
  for (const [id, next] of nextItems) {
    const previous = previousItems.get(id);
    if (!previous) {
      added.push(id);
      continue;
    }
    if (previous.item.visibleGameLabelOrIndex !== next.item.visibleGameLabelOrIndex) changedLabels.push(id);
    if (previous.item.category === next.item.category && previous.index !== next.index) reorderedOptions.push(id);
    if (next.item.deprecated) retiredOptions.push(id);
  }
  for (const [id, previous] of previousItems) {
    if (!nextItems.has(id)) removed.push(id);
    if (previous.item.deprecated) retiredOptions.push(id);
  }
  return { added, removed, changedLabels, reorderedOptions, retiredOptions };
}

export function createPatchReauditPlan(previousManifest, nextGameVersion) {
  const items = previousManifest?.items ?? [];
  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort();
  return {
    fromCatalogVersion: previousManifest?.catalogVersion?.identifier ?? "unknown",
    nextGameVersion,
    totalRecordsToCheck: items.length,
    categories,
    requiredActions: [
      "Reconfirm platform, game version, and patch/build identifier.",
      "Walk Road to Glory creation path from the start.",
      "Check every known category for added, removed, renamed, or reordered options.",
      "Recapture changed records and route them through first and second review."
    ]
  };
}

export function publishPackage(catalogPackage) {
  const report = validatePackage(catalogPackage, { requireVerified: true, requireProductionSource: true });
  if (!report.ok) return { ok: false, report, manifest: null };
  return {
    ok: true,
    report,
    manifest: {
      ...catalogPackage.manifest,
      sourceType: "production",
      isProduction: true,
      items: catalogPackage.items.map((item) => ({ ...item, sourceType: "production" }))
    }
  };
}

export function rollbackPackage(currentManifest, targetManifest, reason = "") {
  return {
    ok: Boolean(targetManifest?.catalogVersion),
    rollbackFrom: currentManifest?.catalogVersion?.identifier ?? "unknown",
    rollbackTo: targetManifest?.catalogVersion?.identifier ?? "unknown",
    reason,
    nextActions: [
      "Record rollback reason in publication log.",
      "Restore the prior immutable manifest package.",
      "Run production validation, placeholder detection, fixture detection, and duplicate detection.",
      "Confirm the app still fails closed if the restored catalog is empty."
    ]
  };
}

export function validateProductionDirectory(directoryPath) {
  const manifestPath = path.join(directoryPath, "catalog_manifest.json");
  const report = createReport("production");
  if (!fs.existsSync(manifestPath)) {
    addError(report, "missingManifest", `Production manifest missing at ${manifestPath}.`);
    return finalizeReport(report);
  }
  const manifest = readJSON(manifestPath);
  mergeReport(report, validateManifest(manifest, { requireProductionSource: true }));
  const seen = new Set();
  for (const item of manifest.items ?? []) {
    const id = stringValue(item?.stableInternalID);
    if (id && seen.has(id)) addError(report, "duplicateStableID", `Duplicate stable ID: ${id}`);
    if (id) seen.add(id);
    mergeReport(report, validateRecord(item, { requireVerified: true, requireProductionSource: true }));
  }
  if ((manifest.items ?? []).length === 0) {
    report.warnings.push("Production catalog is empty. No recommendations can be produced.");
  }
  return finalizeReport(report);
}

export function detectPlaceholdersInPath(targetPath) {
  const report = createReport("placeholders");
  for (const file of listDataFiles(targetPath)) {
    if (placeholderPattern.test(fs.readFileSync(file, "utf8"))) addError(report, "placeholderToken", `Placeholder token found in ${file}.`);
  }
  return finalizeReport(report);
}

export function detectFixtureLeakageInPath(targetPath) {
  const report = createReport("fixtures");
  for (const file of listDataFiles(targetPath)) {
    const text = fs.readFileSync(file, "utf8");
    if (/isTestFixture"\s*:\s*true|test-only|fixture|"sourceType"\s*:\s*"(researchDraft|testFixture|demoData|localDeveloperSample)"/i.test(text)) {
      addError(report, "fixtureLeakage", `Non-production data marker found in ${file}.`);
    }
  }
  return finalizeReport(report);
}

export function detectDuplicateIDsInManifest(manifest) {
  const report = createReport("duplicates");
  const seen = new Set();
  for (const item of manifest.items ?? []) {
    const id = stringValue(item?.stableInternalID);
    if (!id) continue;
    if (seen.has(id)) addError(report, "duplicateStableID", `Duplicate stable ID: ${id}`);
    seen.add(id);
  }
  return finalizeReport(report);
}

export function calculateDeterministicChecksum(value) {
  return crypto.createHash("sha256").update(stableStringify(stripChecksumFields(value))).digest("hex");
}

export function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function formatReport(report) {
  const lines = [`${report.ok ? "OK" : "FAIL"} ${report.scope}`];
  for (const warning of report.warnings) lines.push(`warning: ${warning}`);
  for (const error of report.errors) lines.push(`error ${error.code}: ${error.message}`);
  for (const action of report.nextActions ?? []) lines.push(`next: ${action}`);
  if (report.progress) {
    lines.push(`progress: ${report.progress.totalRecords} records`);
    for (const [state, count] of Object.entries(report.progress.byVerificationState ?? {})) lines.push(`progress state ${state}: ${count}`);
    for (const [category, count] of Object.entries(report.progress.byCategory ?? {})) lines.push(`progress category ${category}: ${count}`);
  }
  if (report.checksum) lines.push(`checksum: ${report.checksum}`);
  return lines.join("\n");
}

function validatePublication(catalogPackage, report) {
  const publication = catalogPackage.publication;
  if (!publication) {
    addError(report, "missingPublicationRecord", "Catalog package is missing publication record.");
    return;
  }
  validateDateField(report, publication.publishedAt, "publishedAt", publication.publicationID);
  const transition = `${publication.stateTransition?.from}->${publication.stateTransition?.to}`;
  if (!allowedTransitions.has(transition)) {
    addError(report, "invalidVerificationStateTransition", `Invalid verification state transition: ${transition}.`);
  }
  const approvedReviewIDs = new Set((catalogPackage.reviews ?? []).filter((review) => review.decision === "approved").map((review) => review.reviewID));
  if (!approvedReviewIDs.has(publication.stateTransition?.approvedByReviewID)) {
    addError(report, "invalidVerificationStateTransition", "Publication transition does not reference an approved review.");
  }
}

function validateRequiredReviews(catalogPackage, item, report) {
  const id = stringValue(item?.stableInternalID);
  if (!id) return;
  const approvedReviews = (catalogPackage.reviews ?? []).filter((review) => review.stableInternalID === id && review.decision === "approved");
  const firstReviews = approvedReviews.filter((review) => !review.stage || review.stage === "first");
  const secondReviews = approvedReviews.filter((review) => review.stage === "second");
  const distinctReviewers = new Set(approvedReviews.map((review) => stringValue(review.reviewer)).filter(Boolean));
  if (firstReviews.length === 0) addError(report, "missingFirstReview", `${id} is missing first approved review.`);
  if (secondReviews.length === 0) addError(report, "missingSecondReview", `${id} is missing second approved review.`);
  if (approvedReviews.length < 2 || distinctReviewers.size < 2) {
    addError(report, "missingSecondReview", `${id} requires two approved reviews from distinct reviewers.`);
  }
}

function validateScreenshotName(asset, report) {
  const relativePath = stringValue(asset?.relativePath);
  if (!relativePath) return;
  const fileName = path.basename(relativePath);
  if (!screenshotNamePattern.test(fileName)) {
    addError(report, "invalidScreenshotName", `${asset?.assetID || "Asset"} does not follow the standard screenshot naming pattern.`);
  }
}

function validateMeasurement(report, measurementID, measurement, recordID) {
  if (typeof measurement === "number") {
    if (!Number.isFinite(measurement) || measurement < 0) addError(report, "malformedMeasurement", `${recordID || "Record"} measurement ${measurementID} is malformed.`);
    return;
  }
  if (!measurement || typeof measurement !== "object") {
    addError(report, "malformedMeasurement", `${recordID || "Record"} measurement ${measurementID} is malformed.`);
    return;
  }
  if (!Number.isFinite(measurement.value)) addError(report, "malformedMeasurement", `${recordID || "Record"} measurement ${measurementID} value is invalid.`);
  if (!Number.isFinite(measurement.confidence) || measurement.confidence < 0 || measurement.confidence > 1) {
    addError(report, "invalidConfidence", `${recordID || "Record"} measurement ${measurementID} confidence is invalid.`);
  }
  if (!Number.isFinite(measurement.variance) || measurement.variance < 0) {
    addError(report, "negativeVariance", `${recordID || "Record"} measurement ${measurementID} variance is invalid.`);
  }
}

function validateSourceType(report, value, owner, options = {}) {
  const sourceType = value?.sourceType;
  if (!sourceTypeSet.has(sourceType)) {
    addError(report, "invalidSourceType", `${owner} is missing a valid sourceType.`);
    return;
  }
  if (options.requireProductionSource && sourceType !== "production") {
    addError(report, "nonProductionSourceInProduction", `${owner} uses non-production sourceType ${sourceType}.`);
  }
  if (options.requireProductionSource && productionBlockedSourceTypes.has(sourceType)) {
    addError(report, "fixtureLeakage", `${owner} cannot be imported into production from ${sourceType}.`);
  }
}

function isValidVisibleLabel(label) {
  return stringValue(label).length > 0 && !placeholderPattern.test(label);
}

function validateDateField(report, value, field, owner, options = {}) {
  if (value === null && options.allowNull) return;
  if (!stringValue(value) || Number.isNaN(Date.parse(value))) {
    addError(report, "invalidDate", `${owner || "Value"} has invalid ${field}.`);
  }
}

function containsPlaceholder(value) {
  return JSON.stringify(value ?? "").split(/["{}[\],:]/).some((part) => placeholderPattern.test(part));
}

function createReport(scope) {
  return { scope, ok: true, errors: [], warnings: [] };
}

function addError(report, code, message) {
  report.errors.push({ code, message });
  report.ok = false;
}

function mergeReport(target, source) {
  target.errors.push(...source.errors);
  target.warnings.push(...source.warnings);
  target.ok = target.errors.length === 0;
  if (source.checksum) target.checksum = source.checksum;
}

function finalizeReport(report) {
  report.ok = report.errors.length === 0;
  return report;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function listFiles(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(targetPath, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function listDataFiles(targetPath) {
  return listFiles(targetPath).filter((file) => file.endsWith(".json"));
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function stripChecksumFields(value) {
  if (Array.isArray(value)) return value.map(stripChecksumFields);
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (key === "packageChecksum" || key === "sourcePackageChecksum") continue;
    output[key] = stripChecksumFields(value[key]);
  }
  return output;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function auditProgress(records) {
  const byVerificationState = {};
  const byCategory = {};
  for (const record of records) {
    const state = record?.verificationState ?? "unknown";
    const category = record?.category ?? "uncategorized";
    byVerificationState[state] = (byVerificationState[state] ?? 0) + 1;
    byCategory[category] = (byCategory[category] ?? 0) + 1;
  }
  return {
    totalRecords: records.length,
    byVerificationState,
    byCategory
  };
}

function parseCSV(csvText) {
  const rows = [];
  const table = [];
  let current = "";
  let row = [];
  let quoted = false;
  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      table.push(row);
      current = "";
      row = [];
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    table.push(row);
  }
  const [headers = [], ...dataRows] = table.filter((cells) => cells.some((cell) => cell.trim().length > 0));
  for (const cells of dataRows) {
    rows.push(Object.fromEntries(headers.map((header, index) => [header.trim(), cells[index]?.trim() ?? ""])));
  }
  return rows;
}

function serializeCSV(rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function runCLI(argv) {
  const [command, target = "data/catalog/production"] = argv;
  let report;
  if (command === "validate-record") report = validateRecord(readJSON(target));
  else if (command === "validate-audit-record") report = validateAuditRecord(readJSON(target));
  else if (command === "validate-package") report = validatePackage(readJSON(target), { packageDirectory: path.dirname(target) });
  else if (command === "validate-production") report = validateProductionDirectory(target);
  else if (command === "verify-assets") report = validatePackage(readJSON(target), { packageDirectory: path.dirname(target), requireVerified: true });
  else if (command === "detect-placeholders") report = detectPlaceholdersInPath(target);
  else if (command === "detect-fixtures") report = detectFixtureLeakageInPath(target);
  else if (command === "detect-duplicates") report = detectDuplicateIDsInManifest(readJSON(target));
  else if (command === "create-audit-session") {
    console.log(JSON.stringify(createAuditSession(), null, 2));
    return 0;
  } else if (command === "import-csv") {
    const items = importCatalogItemsFromCsv(fs.readFileSync(target, "utf8"));
    console.log(JSON.stringify(items, null, 2));
    return 0;
  } else if (command === "export-csv") {
    const input = readJSON(target);
    console.log(exportCatalogItemsToCsv(Array.isArray(input) ? input : input.items ?? []));
    return 0;
  } else if (command === "compare-versions") {
    const next = argv[2];
    if (!next) {
      console.error("compare-versions requires <previous-manifest.json> <next-manifest.json>");
      return 1;
    }
    console.log(JSON.stringify(compareCatalogVersions(readJSON(target), readJSON(next)), null, 2));
    return 0;
  } else if (command === "patch-reaudit") {
    const nextGameVersion = argv[2] ?? "REPLACE_WITH_NEXT_GAME_VERSION";
    console.log(JSON.stringify(createPatchReauditPlan(readJSON(target), nextGameVersion), null, 2));
    return 0;
  } else if (command === "publish-package") {
    const result = publishPackage(readJSON(target));
    console.log(formatReport(result.report));
    if (result.ok) console.log(JSON.stringify(result.manifest, null, 2));
    return result.ok ? 0 : 1;
  } else if (command === "rollback-package") {
    const previous = argv[2];
    if (!previous) {
      console.error("rollback-package requires <current-manifest.json> <target-manifest.json>");
      return 1;
    }
    console.log(JSON.stringify(rollbackPackage(readJSON(target), readJSON(previous), argv[3] ?? ""), null, 2));
    return 0;
  }
  else if (command === "checksum") {
    const checksum = calculateDeterministicChecksum(readJSON(target));
    console.log(checksum);
    return 0;
  } else if (command === "report") report = validateProductionDirectory(target);
  else {
    console.error("Usage: node scripts/catalog-tools.mjs <create-audit-session|validate-audit-record|validate-record|validate-package|validate-production|verify-assets|detect-placeholders|detect-fixtures|detect-duplicates|import-csv|export-csv|compare-versions|patch-reaudit|publish-package|rollback-package|checksum|report> <path>");
    return 1;
  }
  console.log(formatReport(report));
  return report.ok ? 0 : 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  process.exitCode = runCLI(process.argv.slice(2));
}
