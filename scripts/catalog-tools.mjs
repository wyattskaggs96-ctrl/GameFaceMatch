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
    mergeReport(report, validateEvidenceAssetPath(asset, { packageDirectory: options.packageDirectory }));
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

export function validateEvidenceAssetPath(asset, options = {}) {
  const report = createReport("asset-path");
  const assetID = stringValue(asset?.assetID) || "Asset";
  const relativePath = stringValue(asset?.relativePath);
  const packageDirectory = options.packageDirectory ? path.resolve(options.packageDirectory) : "";

  if (!relativePath) {
    addError(report, "missingAssetPath", `${assetID} is missing relativePath.`, "Record a repository-relative asset path under the catalog package root.");
    return finalizeReport(report);
  }
  if (path.isAbsolute(relativePath) || /^[A-Za-z]:[\\/]/.test(relativePath) || /^[a-z][a-z0-9+.-]*:\/\//i.test(relativePath)) {
    addError(
      report,
      "absoluteLocalPath",
      `${assetID} uses an absolute path or URL instead of a portable relative path: ${relativePath}`,
      "Move or reference the evidence under the catalog package root and store only its relative path."
    );
    return finalizeReport(report);
  }
  if (hasUnsafePathTraversal(relativePath)) {
    addError(
      report,
      "unsafeTraversal",
      `${assetID} contains unsafe path traversal: ${relativePath}`,
      "Remove parent-directory segments and reference an evidence file inside the catalog package root."
    );
  }
  if (pointsIntoFixtureDirectory(relativePath)) {
    addError(
      report,
      "fixtureEvidencePath",
      `${assetID} points into a fixture or test-only directory: ${relativePath}`,
      "Replace this with verified production evidence stored under the production catalog evidence root."
    );
  }
  validateDerivativePathState(asset, report);

  if (!packageDirectory || !relativePath || report.errors.some((error) => error.code === "absoluteLocalPath" || error.code === "unsafeTraversal")) {
    return finalizeReport(report);
  }

  const resolvedPath = path.resolve(packageDirectory, relativePath);
  if (!isPathInsideRoot(resolvedPath, packageDirectory)) {
    addError(
      report,
      "pathEscapesCatalogRoot",
      `${assetID} resolves outside the catalog package root: ${relativePath}`,
      "Move the evidence under the catalog package root and update relativePath without using traversal."
    );
    return finalizeReport(report);
  }
  const caseCheck = findCaseMismatch(packageDirectory, relativePath);
  if (!caseCheck.exists) {
    addError(
      report,
      "missingAsset",
      `Asset file missing: ${relativePath}`,
      "Confirm the evidence file exists at the recorded relative path before publishing."
    );
    return finalizeReport(report);
  }
  const filesystemPath = path.join(packageDirectory, caseCheck.actualRelativePath);
  const realPath = fs.realpathSync(filesystemPath);
  const realRoot = fs.realpathSync(packageDirectory);
  if (!isPathInsideRoot(realPath, realRoot)) {
    addError(
      report,
      "pathEscapesCatalogRoot",
      `${assetID} resolves outside the catalog package root: ${relativePath}`,
      "Store evidence files directly under the catalog package root instead of through links or paths that leave the package."
    );
    return finalizeReport(report);
  }
  if (caseCheck.caseMismatch) {
    addError(
      report,
      "filenameCaseMismatch",
      `${assetID} path case differs from the file on disk: ${relativePath}`,
      `Use exact filesystem casing: ${caseCheck.actualRelativePath}`
    );
  }
  if (asset?.sha256) {
    const actual = sha256File(filesystemPath);
    if (asset.sha256 !== actual) {
      addError(
        report,
        "checksumMismatch",
        `Asset checksum mismatch for ${assetID}.`,
        "Regenerate the manifest checksum from the current evidence file or restore the expected file."
      );
    }
  }
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
  const previousEntries = catalogEntries(previousManifest);
  const nextEntries = catalogEntries(nextManifest);
  const previousItems = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const nextItems = new Map(nextEntries.map((entry) => [entry.id, entry]));
  const previousCategories = groupEntriesByCategory(previousEntries);
  const nextCategories = groupEntriesByCategory(nextEntries);
  const changes = {
    menuCountChanges: [],
    nativeOrderChanges: [],
    firstMiddleFinalChanges: [],
    addedOptions: [],
    removedOptions: [],
    changedLabels: [],
    changedEvidenceHashes: [],
    changedVisualAssets: [],
    dependencyChanges: [],
    environmentChanges: []
  };

  const categories = Array.from(new Set([...previousCategories.keys(), ...nextCategories.keys()])).sort();
  for (const category of categories) {
    const previousCategoryEntries = previousCategories.get(category) ?? [];
    const nextCategoryEntries = nextCategories.get(category) ?? [];
    if (previousCategoryEntries.length !== nextCategoryEntries.length) {
      changes.menuCountChanges.push(categoryChange("menuCountChanged", category, previousCategoryEntries.length, nextCategoryEntries.length));
    }

    const previousBoundary = boundarySnapshot(previousCategoryEntries);
    const nextBoundary = boundarySnapshot(nextCategoryEntries);
    for (const position of ["first", "middle", "final"]) {
      if (previousBoundary[position] !== nextBoundary[position]) {
        changes.firstMiddleFinalChanges.push(categoryChange(`${position}OptionChanged`, category, previousBoundary[position], nextBoundary[position]));
      }
    }
  }

  for (const [id, next] of nextItems) {
    const previous = previousItems.get(id);
    if (!previous) {
      changes.addedOptions.push(recordChange("optionAdded", id, null, summarizeRecord(next.item), next));
      continue;
    }
    if (!valuesEqual(previous.item.visibleGameLabelOrIndex, next.item.visibleGameLabelOrIndex)) {
      changes.changedLabels.push(recordChange("labelChanged", id, previous.item.visibleGameLabelOrIndex, next.item.visibleGameLabelOrIndex, next));
    }
    if (previous.item.category === next.item.category && previous.categoryIndex !== next.categoryIndex) {
      changes.nativeOrderChanges.push(recordChange("nativeOrderChanged", id, previous.categoryIndex + 1, next.categoryIndex + 1, next));
    }
    if (!valuesEqual(evidenceHashSnapshot(previous.item), evidenceHashSnapshot(next.item))) {
      changes.changedEvidenceHashes.push(recordChange("evidenceHashChanged", id, evidenceHashSnapshot(previous.item), evidenceHashSnapshot(next.item), next));
    }
    if (!valuesEqual(visualAssetSnapshot(previous.item), visualAssetSnapshot(next.item))) {
      changes.changedVisualAssets.push(recordChange("visualAssetChanged", id, visualAssetSnapshot(previous.item), visualAssetSnapshot(next.item), next));
    }
    if (!valuesEqual(dependencySnapshot(previous.item), dependencySnapshot(next.item))) {
      changes.dependencyChanges.push(recordChange("dependencyChanged", id, dependencySnapshot(previous.item), dependencySnapshot(next.item), next));
    }
    if (!valuesEqual(environmentSnapshot(previous.item), environmentSnapshot(next.item))) {
      changes.environmentChanges.push(recordChange("environmentChanged", id, environmentSnapshot(previous.item), environmentSnapshot(next.item), next));
    }
  }

  for (const [id, previous] of previousItems) {
    if (!nextItems.has(id)) {
      changes.removedOptions.push(recordChange("optionRemoved", id, summarizeRecord(previous.item), null, previous));
    }
  }

  const added = changes.addedOptions.map((change) => change.stableInternalID);
  const removed = changes.removedOptions.map((change) => change.stableInternalID);
  const reorderedOptions = changes.nativeOrderChanges.map((change) => change.stableInternalID);
  const retiredOptions = Array.from(new Set([
    ...nextEntries.filter((entry) => entry.item?.deprecated).map((entry) => entry.id),
    ...previousEntries.filter((entry) => entry.item?.deprecated).map((entry) => entry.id)
  ])).sort();

  const affectedRecords = createAffectedRecordList(changes, previousCategories, nextCategories);
  const requiredReverification = createRequiredReverificationList(changes, affectedRecords);
  const recommendedRecaptureQueue = createRecommendedRecaptureQueue(affectedRecords);
  const summary = {
    previousItemCount: previousEntries.length,
    nextItemCount: nextEntries.length,
    affectedRecordCount: affectedRecords.length,
    requiredReverificationCount: requiredReverification.length,
    recommendedRecaptureCount: recommendedRecaptureQueue.length
  };
  const result = {
    previousCatalogVersionID: previousManifest?.catalogVersion?.identifier ?? "unknown",
    nextCatalogVersionID: nextManifest?.catalogVersion?.identifier ?? "unknown",
    previousPatchVersion: manifestPatchVersion(previousManifest),
    nextPatchVersion: manifestPatchVersion(nextManifest),
    generatedAt: new Date().toISOString(),
    summary,
    ...changes,
    affectedRecords,
    requiredReverification,
    recommendedRecaptureQueue,
    suggestedSemanticCatalogVersion: suggestSemanticCatalogVersion(previousManifest?.catalogVersion?.identifier, changes),
    added,
    removed,
    reorderedOptions,
    retiredOptions
  };
  return {
    ...result,
    humanReadableReport: formatPatchDiffReport(result)
  };
}

function catalogEntries(manifest) {
  const categoryPositions = new Map();
  return (manifest?.items ?? []).flatMap((item, index) => {
    const id = stringValue(item?.stableInternalID);
    if (!id) return [];
    const category = stringValue(item?.category) || "uncategorized";
    const categoryIndex = categoryPositions.get(category) ?? 0;
    categoryPositions.set(category, categoryIndex + 1);
    return [{ id, item, index, category, categoryIndex }];
  });
}

function groupEntriesByCategory(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!groups.has(entry.category)) groups.set(entry.category, []);
    groups.get(entry.category).push(entry);
  }
  return groups;
}

function boundarySnapshot(entries) {
  if (entries.length === 0) return { first: null, middle: null, final: null };
  return {
    first: entries[0].id,
    middle: entries[Math.floor((entries.length - 1) / 2)].id,
    final: entries[entries.length - 1].id
  };
}

function categoryChange(reason, category, previousValue, nextValue) {
  return {
    reason,
    category,
    previousValue,
    nextValue,
    severity: reason === "menuCountChanged" ? "blocking" : "advisory"
  };
}

function recordChange(reason, stableInternalID, previousValue, nextValue, entry) {
  return {
    reason,
    stableInternalID,
    category: entry?.category ?? (stringValue(entry?.item?.category) || "uncategorized"),
    previousValue,
    nextValue,
    severity: ["optionAdded", "optionRemoved", "dependencyChanged", "environmentChanged"].includes(reason) ? "blocking" : "advisory"
  };
}

function summarizeRecord(item) {
  if (!item) return null;
  return {
    stableInternalID: item.stableInternalID,
    category: item.category,
    visibleGameLabelOrIndex: item.visibleGameLabelOrIndex,
    platform: item.platform,
    gameVersion: item.gameVersion,
    patchVersion: item.patchVersion,
    gameMode: item.gameMode,
    creationPath: item.creationPath
  };
}

function evidenceHashSnapshot(item) {
  return pickNonEmptyFields(
    {
      evidenceHash: item?.humanAnnotations?.evidenceHash,
      evidenceSha256: item?.humanAnnotations?.evidenceSha256,
      sha256: item?.humanAnnotations?.sha256,
      assetChecksum: item?.humanAnnotations?.assetChecksum,
      checksum: item?.humanAnnotations?.checksum,
      navigationEvidenceChecksum: item?.navigationInstructions?.map((instruction) => instruction?.evidenceChecksum ?? null)
    }
  );
}

function visualAssetSnapshot(item) {
  return {
    sourceImageReferences: [...(item?.sourceImageReferences ?? [])].sort(),
    requiredAngles: item?.requiredAngles ?? {},
    navigationEvidenceAssetIDs: (item?.navigationInstructions ?? []).map((instruction) => instruction?.evidenceAssetID ?? null)
  };
}

function dependencySnapshot(item) {
  return pickNonEmptyFields({
    dependencies: item?.dependencies,
    locks: item?.locks,
    dependencyNotes: item?.dependencyNotes,
    humanDependencies: item?.humanAnnotations?.dependencies,
    humanDependencyNotes: item?.humanAnnotations?.dependencyNotes,
    unlockDependencies: item?.humanAnnotations?.unlockDependencies,
    positionDependency: item?.humanAnnotations?.positionDependency
  });
}

function environmentSnapshot(item) {
  return {
    platform: item?.platform ?? null,
    gameVersion: item?.gameVersion ?? null,
    patchVersion: item?.patchVersion ?? null,
    gameMode: item?.gameMode ?? null,
    creationPath: item?.creationPath ?? null,
    captureConditions: item?.captureConditions ?? null,
    catalogPlatform: item?.catalogVersion?.platform ?? null,
    catalogGameVersion: item?.catalogVersion?.gameVersion ?? null
  };
}

function pickNonEmptyFields(value) {
  const output = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue === undefined || fieldValue === null || fieldValue === "") continue;
    if (Array.isArray(fieldValue) && fieldValue.every((item) => item === null || item === undefined || item === "")) continue;
    output[key] = fieldValue;
  }
  return output;
}

function valuesEqual(previousValue, nextValue) {
  return stableStringify(previousValue ?? null) === stableStringify(nextValue ?? null);
}

function createAffectedRecordList(changes, previousCategories, nextCategories) {
  const affected = new Map();
  const addAffected = (record) => {
    const key = `${record.stableInternalID ?? "category"}:${record.category}:${record.reason}`;
    affected.set(key, record);
  };
  for (const [collectionName, collection] of Object.entries(changes)) {
    for (const change of collection) {
      if (change.stableInternalID) {
        addAffected({
          stableInternalID: change.stableInternalID,
          category: change.category,
          reason: change.reason,
          severity: change.severity,
          sourceChangeSet: collectionName
        });
        continue;
      }
      const categoryEntries = [...(previousCategories.get(change.category) ?? []), ...(nextCategories.get(change.category) ?? [])];
      const uniqueIDs = new Set(categoryEntries.map((entry) => entry.id));
      for (const stableInternalID of uniqueIDs) {
        addAffected({
          stableInternalID,
          category: change.category,
          reason: change.reason,
          severity: change.severity,
          sourceChangeSet: collectionName
        });
      }
    }
  }
  return Array.from(affected.values()).sort((a, b) => `${a.category}:${a.stableInternalID}:${a.reason}`.localeCompare(`${b.category}:${b.stableInternalID}:${b.reason}`));
}

function createRequiredReverificationList(changes, affectedRecords) {
  const actionsByReason = {
    menuCountChanged: "Re-walk the full category and confirm the new count with first and second review.",
    nativeOrderChanged: "Confirm native order against direct menu evidence.",
    firstOptionChanged: "Reconfirm boundary option evidence for the category.",
    middleOptionChanged: "Reconfirm midpoint option evidence for the category.",
    finalOptionChanged: "Reconfirm boundary option evidence for the category.",
    optionAdded: "Capture all required evidence and complete first and second review for the new option.",
    optionRemoved: "Confirm removal, retain historical release context, and mark any retired record with context.",
    labelChanged: "Confirm exact visible label or index from direct evidence.",
    evidenceHashChanged: "Verify evidence integrity and regenerate package checksums.",
    visualAssetChanged: "Review replacement visual assets and required-angle coverage.",
    dependencyChanged: "Repeat dependency checks and update affected catalog metadata.",
    environmentChanged: "Confirm platform, game version, patch, mode, and creation path before release."
  };
  return affectedRecords.map((record) => ({
    stableInternalID: record.stableInternalID,
    category: record.category,
    reason: record.reason,
    severity: record.severity,
    requiredAction: actionsByReason[record.reason] ?? "Review affected record before publication."
  }));
}

function createRecommendedRecaptureQueue(affectedRecords) {
  const recaptureReasons = new Set(["optionAdded", "visualAssetChanged", "environmentChanged", "evidenceHashChanged", "menuCountChanged", "firstOptionChanged", "middleOptionChanged", "finalOptionChanged"]);
  return affectedRecords
    .filter((record) => recaptureReasons.has(record.reason))
    .map((record) => ({
      stableInternalID: record.stableInternalID,
      category: record.category,
      reason: record.reason,
      recommendedViews: requiredAngles,
      note: "Recapture recommendations are audit tasks only; they are not verified game facts until reviewed."
    }));
}

function manifestPatchVersion(manifest) {
  const direct = stringValue(manifest?.catalogVersion?.patchVersion);
  if (direct) return direct;
  const patchVersions = Array.from(new Set((manifest?.items ?? []).map((item) => stringValue(item?.patchVersion)).filter(Boolean))).sort();
  if (patchVersions.length === 0) return null;
  return patchVersions.length === 1 ? patchVersions[0] : patchVersions.join(", ");
}

function suggestSemanticCatalogVersion(previousVersionID, changes) {
  const match = stringValue(previousVersionID).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return "manual-semantic-version-required";
  const [, majorText, minorText, patchText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);
  const majorChange = changes.removedOptions.length > 0 || changes.dependencyChanges.length > 0 || changes.environmentChanges.length > 0;
  const minorChange = changes.addedOptions.length > 0
    || changes.menuCountChanges.length > 0
    || changes.nativeOrderChanges.length > 0
    || changes.firstMiddleFinalChanges.length > 0
    || changes.changedLabels.length > 0
    || changes.changedVisualAssets.length > 0;
  const patchChange = changes.changedEvidenceHashes.length > 0;
  if (majorChange) return `${major + 1}.0.0`;
  if (minorChange) return `${major}.${minor + 1}.0`;
  if (patchChange) return `${major}.${minor}.${patch + 1}`;
  return `${major}.${minor}.${patch}`;
}

function formatPatchDiffReport(result) {
  const lines = [
    `Patch diff report: ${result.previousCatalogVersionID} -> ${result.nextCatalogVersionID}`,
    `Patch context: ${result.previousPatchVersion ?? "unknown"} -> ${result.nextPatchVersion ?? "unknown"}`,
    `Items: ${result.summary.previousItemCount} -> ${result.summary.nextItemCount}`,
    `Affected records: ${result.summary.affectedRecordCount}`,
    `Required re-verifications: ${result.summary.requiredReverificationCount}`,
    `Recommended recaptures: ${result.summary.recommendedRecaptureCount}`,
    `Suggested semantic catalog version: ${result.suggestedSemanticCatalogVersion}`
  ];
  for (const [label, collection] of [
    ["Menu count changes", result.menuCountChanges],
    ["Native order changes", result.nativeOrderChanges],
    ["Boundary option changes", result.firstMiddleFinalChanges],
    ["Added options", result.addedOptions],
    ["Removed options", result.removedOptions],
    ["Changed labels", result.changedLabels],
    ["Changed evidence hashes", result.changedEvidenceHashes],
    ["Changed visual assets", result.changedVisualAssets],
    ["Dependency changes", result.dependencyChanges],
    ["Environment changes", result.environmentChanges]
  ]) {
    if (collection.length === 0) continue;
    lines.push(`${label}: ${collection.map((change) => change.stableInternalID ?? change.category).join(", ")}`);
  }
  return lines.join("\n");
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
  for (const error of report.errors) {
    lines.push(`error ${error.code}: ${error.message}`);
    if (error.repairSuggestion) lines.push(`repair ${error.code}: ${error.repairSuggestion}`);
  }
  for (const action of report.nextActions ?? []) lines.push(`next: ${action}`);
  for (const repair of report.repairSuggestions ?? []) lines.push(`repair: ${repair}`);
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

function validateDerivativePathState(asset, report) {
  const relativePath = stringValue(asset?.relativePath);
  const derivativeState = stringValue(asset?.derivativeState);
  if (!relativePath || !derivativeState) return;
  const segments = normalizedPathSegments(relativePath);
  const pathLooksMaster = segments.some((segment) => ["master", "masters", "source", "sources"].includes(segment));
  const pathLooksDerivative = segments.some((segment) => ["derivative", "derivatives", "derived"].includes(segment));
  if (derivativeState === "master" && pathLooksDerivative) {
    addError(
      report,
      "derivativeStateMismatch",
      `${asset.assetID || "Asset"} is marked master but points to derivative storage: ${relativePath}`,
      "Point master records at master/source evidence, or change derivativeState only after review confirms the file is derivative evidence."
    );
  }
  if (derivativeState === "derivative" && pathLooksMaster) {
    addError(
      report,
      "derivativeStateMismatch",
      `${asset.assetID || "Asset"} is marked derivative but points to master/source storage: ${relativePath}`,
      "Point derivative records at derivative evidence, or change derivativeState only after review confirms the file is a master."
    );
  }
}

function hasUnsafePathTraversal(relativePath) {
  return normalizedPathSegments(relativePath).includes("..");
}

function pointsIntoFixtureDirectory(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/").toLowerCase();
  return normalized.includes("data/fixtures/test-only/")
    || normalized.includes("/fixtures/test-only/")
    || normalized.startsWith("fixtures/test-only/")
    || normalized.includes("/test-only/")
    || normalized.startsWith("test-only/");
}

function isPathInsideRoot(candidatePath, rootPath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function findCaseMismatch(rootPath, relativePath) {
  const parts = relativePath.replaceAll("\\", "/").split("/").filter(Boolean);
  let current = rootPath;
  const actualParts = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") return { exists: false, caseMismatch: false, actualRelativePath: actualParts.join("/") };
    if (!fs.existsSync(current)) return { exists: false, caseMismatch: false, actualRelativePath: actualParts.join("/") };
    const entries = fs.readdirSync(current);
    const exact = entries.find((entry) => entry === part);
    if (exact) {
      actualParts.push(exact);
      current = path.join(current, exact);
      continue;
    }
    const caseInsensitive = entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
    if (!caseInsensitive) return { exists: false, caseMismatch: false, actualRelativePath: actualParts.concat(part).join("/") };
    actualParts.push(caseInsensitive);
    current = path.join(current, caseInsensitive);
  }
  return {
    exists: fs.existsSync(current),
    caseMismatch: actualParts.join("/") !== relativePath.replaceAll("\\", "/"),
    actualRelativePath: actualParts.join("/")
  };
}

function normalizedPathSegments(relativePath) {
  return relativePath.replaceAll("\\", "/").split("/").filter(Boolean).map((segment) => segment.toLowerCase());
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
  return { scope, ok: true, errors: [], warnings: [], repairSuggestions: [] };
}

function addError(report, code, message, repairSuggestion = "") {
  report.errors.push(repairSuggestion ? { code, message, repairSuggestion } : { code, message });
  if (repairSuggestion && !report.repairSuggestions.includes(repairSuggestion)) report.repairSuggestions.push(repairSuggestion);
  report.ok = false;
}

function mergeReport(target, source) {
  target.errors.push(...source.errors);
  target.warnings.push(...source.warnings);
  target.repairSuggestions = Array.from(new Set([...(target.repairSuggestions ?? []), ...(source.repairSuggestions ?? [])]));
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
