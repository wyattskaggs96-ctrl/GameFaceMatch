#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const requiredAngles = ["straightOn", "left45", "right45", "leftProfile", "rightProfile"];
export const placeholderPattern = /REPLACE_WITH_|NOT PRODUCTION DATA|NOT A VERIFIED GAME RECORD|\b(TBD|TODO|PLACEHOLDER|MOCK)\b/i;
const validVerificationStates = new Set(["verified", "unverified", "rejected", "archived"]);
const allowedTransitions = new Set(["draft->verified", "unverified->verified", "reviewed->verified", "reviewed->archived"]);

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
  if ((options.requireVerified ?? true) && record?.verificationState !== "verified") {
    addError(report, "unverifiedRecord", `${id || "Record"} is not verified.`);
  }
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

  return finalizeReport(report);
}

export function validateManifest(manifest, options = {}) {
  const report = createReport("manifest");
  if (!manifest || !manifest.catalogVersion || !Array.isArray(manifest.items)) {
    addError(report, "malformedManifest", "Catalog manifest is malformed.");
    return finalizeReport(report);
  }
  if (containsPlaceholder(manifest)) addError(report, "placeholderToken", "Manifest contains a placeholder token.");
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
  mergeReport(report, validateManifest(catalogPackage.manifest, { packageItems: catalogPackage.items }));
  if (containsPlaceholder(catalogPackage)) addError(report, "placeholderToken", "Catalog package contains a placeholder token.");

  const assetMap = new Map((catalogPackage.assets ?? []).map((asset) => [asset.assetID, asset]));
  const availableAssetIDs = new Set(assetMap.keys());
  const seen = new Set();
  for (const item of catalogPackage.items) {
    const id = stringValue(item?.stableInternalID);
    if (id && seen.has(id)) addError(report, "duplicateStableID", `Duplicate stable ID: ${id}`);
    if (id) seen.add(id);
    mergeReport(report, validateRecord(item, { availableAssetIDs, requireVerified: options.requireVerified ?? true }));
  }

  for (const asset of catalogPackage.assets ?? []) {
    validateDateField(report, asset?.capturedAt, "asset.capturedAt", asset?.assetID);
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

export function validateProductionDirectory(directoryPath) {
  const manifestPath = path.join(directoryPath, "catalog_manifest.json");
  const report = createReport("production");
  if (!fs.existsSync(manifestPath)) {
    addError(report, "missingManifest", `Production manifest missing at ${manifestPath}.`);
    return finalizeReport(report);
  }
  const manifest = readJSON(manifestPath);
  mergeReport(report, validateManifest(manifest));
  const seen = new Set();
  for (const item of manifest.items ?? []) {
    const id = stringValue(item?.stableInternalID);
    if (id && seen.has(id)) addError(report, "duplicateStableID", `Duplicate stable ID: ${id}`);
    if (id) seen.add(id);
    mergeReport(report, validateRecord(item, { requireVerified: true }));
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
    if (/isTestFixture"\s*:\s*true|test-only|fixture/i.test(text)) addError(report, "fixtureLeakage", `Fixture marker found in ${file}.`);
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

function runCLI(argv) {
  const [command, target = "data/catalog/production"] = argv;
  let report;
  if (command === "validate-record") report = validateRecord(readJSON(target));
  else if (command === "validate-package") report = validatePackage(readJSON(target), { packageDirectory: path.dirname(target) });
  else if (command === "validate-production") report = validateProductionDirectory(target);
  else if (command === "verify-assets") report = validatePackage(readJSON(target), { packageDirectory: path.dirname(target), requireVerified: true });
  else if (command === "detect-placeholders") report = detectPlaceholdersInPath(target);
  else if (command === "detect-fixtures") report = detectFixtureLeakageInPath(target);
  else if (command === "detect-duplicates") report = detectDuplicateIDsInManifest(readJSON(target));
  else if (command === "checksum") {
    const checksum = calculateDeterministicChecksum(readJSON(target));
    console.log(checksum);
    return 0;
  } else if (command === "report") report = validateProductionDirectory(target);
  else {
    console.error("Usage: node scripts/catalog-tools.mjs <validate-record|validate-package|validate-production|verify-assets|detect-placeholders|detect-fixtures|detect-duplicates|checksum|report> <path>");
    return 1;
  }
  console.log(formatReport(report));
  return report.ok ? 0 : 1;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  process.exitCode = runCLI(process.argv.slice(2));
}
