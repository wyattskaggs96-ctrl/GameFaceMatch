#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildProductionVerificationQueue } from "./cf27-production-verification-queue.mjs";

export const CF27_EVIDENCE_RECAPTURE_PACKAGE_SCHEMA_VERSION = "cf27-evidence-recapture-package-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-02T20:45:00-04:00";
const outputDirectory = "data/phase-zero/evidence-recapture-package";
const outputPaths = {
  qualityReport: `${outputDirectory}/evidence_quality_report.json`,
  recordReadinessCsv: `${outputDirectory}/record_readiness.csv`,
  recaptureQueueJson: `${outputDirectory}/recapture_queue.json`,
  recaptureQueueCsv: `${outputDirectory}/recapture_queue.csv`,
  discrepancyReportJson: `${outputDirectory}/verifier_discrepancy_report.json`,
  discrepancyReportCsv: `${outputDirectory}/verifier_discrepancy_report.csv`,
  packageDoc: "docs/phase-zero/CF27_EVIDENCE_RECAPTURE_PACKAGE.md",
  ownerChecklist: "docs/phase-zero/CF27_OWNER_RECAPTURE_CHECKLIST.md"
};

const sourcePaths = {
  productionVerificationQueue: "data/phase-zero/production_verification_queue.json",
  primaryReview: "data/phase-zero/primary_review_status.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  videoInventory: "data/phase-zero/video_inventory.json",
  issuesRegister: "data/phase-zero/issues_register.research.json",
  captureRequests: "data/phase-zero/capture_requests.json",
  countOrderAudit: "data/phase-zero/catalog_count_order_audit.research.json",
  productionManifest: "data/catalog/production/catalog_manifest.json"
};

const allowedViews = new Set([
  "MENU",
  "FULLSCREEN",
  "FRONT",
  "LEFT_3Q",
  "LEFT_PROFILE",
  "REAR",
  "RIGHT_PROFILE",
  "RIGHT_3Q",
  "DEPENDENCY_TEST",
  "UNKNOWN"
]);

const groupOrder = [
  "Environment evidence",
  "Creation-path evidence",
  "Menu-map evidence",
  "Head records",
  "Hairstyles",
  "Facial hair",
  "Additional attributes",
  "Duplicate disputes",
  "Ordering disputes",
  "Version mismatches",
  "Dependency tests"
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes("--check");
  const built = buildEvidenceRecapturePackage({ root: repositoryRoot });
  if (checkOnly) {
    checkEvidenceRecapturePackage(built, { root: repositoryRoot });
    console.log(`CF27 evidence recapture package is current (${built.qualityReport.summary.totalRecords} records, ${built.recaptureQueue.summary.recaptureRequiredRecords} recapture-required records).`);
  } else {
    writeEvidenceRecapturePackage(built, { root: repositoryRoot });
    console.log(`Wrote CF27 evidence recapture package (${built.qualityReport.summary.totalRecords} records, ${built.recaptureQueue.summary.totalTasks} tasks).`);
  }
}

export function buildEvidenceRecapturePackage({ root = repositoryRoot, generatedAtISO = generatedAt } = {}) {
  const queueResult = buildProductionVerificationQueue({ root });
  const queue = readJson(root, sourcePaths.productionVerificationQueue);
  const rebuiltQueue = queueResult.queue;
  const primaryReview = readJson(root, sourcePaths.primaryReview);
  const evidenceManifest = readJson(root, sourcePaths.evidenceManifest);
  const videoInventory = readJson(root, sourcePaths.videoInventory);
  const issuesRegister = readJson(root, sourcePaths.issuesRegister);
  const captureRequests = readJson(root, sourcePaths.captureRequests);
  const countOrderAudit = readJson(root, sourcePaths.countOrderAudit);
  const productionManifest = readJson(root, sourcePaths.productionManifest);

  const evidenceEntries = evidenceManifest.entries ?? [];
  const videoRows = videoInventory.inventory ?? [];
  const issues = issuesRegister.issues ?? [];
  const orderCategories = countOrderAudit.categories ?? [];
  const records = queue.records ?? [];
  const currentProductionRecords = productionManifest.items?.length ?? productionManifest.manifest?.items?.length ?? 0;

  const evidenceQuality = inspectEvidenceEntries({ root, evidenceEntries, videoRows });
  const recordInspections = inspectQueueRecords({
    root,
    records,
    evidenceQuality,
    videoRows,
    orderCategories,
    issues,
    rebuiltQueue
  });
  const recaptureTasks = buildRecaptureTasks({ recordInspections, captureRequests, orderCategories, issues });
  const discrepancyRows = buildDiscrepancyRows({ recordInspections, orderCategories });

  const summary = summarizePackage({
    records,
    recordInspections,
    evidenceQuality,
    recaptureTasks,
    discrepancyRows,
    currentProductionRecords,
    primaryReview
  });

  const base = {
    schemaVersion: CF27_EVIDENCE_RECAPTURE_PACKAGE_SCHEMA_VERSION,
    generatedAt: generatedAtISO,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "EVIDENCE_RECAPTURE_PACKAGE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_SECOND_VERIFIED",
    productionRecommendationsEnabled: false,
    sourceArtifacts: sourcePaths,
    policy: {
      noProductionPromotion: true,
      noSecondVerificationClaim: true,
      noGeneratedDerivativeAsObservationProof: true,
      preserveOriginalEvidenceReferences: true,
      preserveDuplicatesAndSupersessionHistory: true
    }
  };

  const qualityReport = {
    ...base,
    reportType: "evidence_quality_report",
    summary,
    evidenceManifestSummary: {
      entries: evidenceEntries.length,
      locallyResolvableEvidenceFiles: evidenceQuality.filter((entry) => entry.pathResolutionStatus === "RESOLVES").length,
      portableExternalReferences: evidenceQuality.filter((entry) => entry.pathResolutionStatus === "PORTABLE_EXTERNAL_SOURCE_REFERENCE").length,
      missingEvidenceFiles: evidenceQuality.filter((entry) => entry.pathResolutionStatus === "MISSING").length,
      unsafeEvidencePaths: evidenceQuality.filter((entry) => entry.pathResolutionStatus === "UNSAFE_PATH").length,
      invalidSha256Entries: evidenceQuality.filter((entry) => entry.sha256Status !== "VALID_SHA256").length,
      duplicateHashGroups: duplicateHashGroups(evidenceQuality).length
    },
    videoInventorySummary: {
      rows: videoRows.length,
      uniqueSourceVideos: videoInventory.summary?.uniqueVideoFiles ?? null,
      exactDuplicateFiles: videoInventory.summary?.exactDuplicateFiles ?? null
    },
    recordReadiness: recordInspections,
    evidenceInspections: evidenceQuality,
    duplicateHashes: duplicateHashGroups(evidenceQuality),
    validation: validateEvidenceRecapturePackage({ recordInspections, recaptureTasks, summary })
  };

  const recaptureQueue = {
    ...base,
    reportType: "recapture_queue",
    summary: {
      totalTasks: recaptureTasks.length,
      recaptureRequiredRecords: summary.recaptureRequiredRecords,
      missingEvidenceRecords: summary.missingEvidenceRecords,
      reviewReadyRecords: summary.reviewReadyRecords,
      groups: countBy(recaptureTasks, "group")
    },
    groupedTasks: groupOrder.map((group) => ({
      group,
      tasks: recaptureTasks.filter((task) => task.group === group)
    })),
    tasks: recaptureTasks
  };

  const discrepancyReport = {
    ...base,
    reportType: "verifier_discrepancy_report",
    summary: {
      totalRows: discrepancyRows.length,
      duplicateDisputes: discrepancyRows.filter((row) => row.discrepancyType === "DUPLICATE_REVIEW_REQUIRED").length,
      orderingDisputes: discrepancyRows.filter((row) => row.discrepancyType === "ORDERING_DISPUTE").length,
      versionMismatches: discrepancyRows.filter((row) => row.discrepancyType === "ENVIRONMENT_VERSION_GAP").length,
      dependencyUnresolved: discrepancyRows.filter((row) => row.discrepancyType === "DEPENDENCY_UNRESOLVED").length,
      missingEvidenceRows: discrepancyRows.filter((row) => row.discrepancyType === "MISSING_EVIDENCE").length
    },
    rows: discrepancyRows
  };

  return {
    qualityReport,
    recaptureQueue,
    discrepancyReport,
    files: {
      qualityReport: `${JSON.stringify(qualityReport, null, 2)}\n`,
      recordReadinessCsv: toCsv(recordInspections.map(recordReadinessCsvRow)),
      recaptureQueueJson: `${JSON.stringify(recaptureQueue, null, 2)}\n`,
      recaptureQueueCsv: toCsv(recaptureTasks.map(recaptureTaskCsvRow)),
      discrepancyReportJson: `${JSON.stringify(discrepancyReport, null, 2)}\n`,
      discrepancyReportCsv: toCsv(discrepancyRows.map(discrepancyCsvRow)),
      packageDoc: formatPackageMarkdown({ qualityReport, recaptureQueue, discrepancyReport }),
      ownerChecklist: formatOwnerChecklist({ qualityReport, recaptureQueue })
    }
  };
}

export function writeEvidenceRecapturePackage(built, { root = repositoryRoot } = {}) {
  writeText(root, outputPaths.qualityReport, built.files.qualityReport);
  writeText(root, outputPaths.recordReadinessCsv, built.files.recordReadinessCsv);
  writeText(root, outputPaths.recaptureQueueJson, built.files.recaptureQueueJson);
  writeText(root, outputPaths.recaptureQueueCsv, built.files.recaptureQueueCsv);
  writeText(root, outputPaths.discrepancyReportJson, built.files.discrepancyReportJson);
  writeText(root, outputPaths.discrepancyReportCsv, built.files.discrepancyReportCsv);
  writeText(root, outputPaths.packageDoc, built.files.packageDoc);
  writeText(root, outputPaths.ownerChecklist, built.files.ownerChecklist);
}

export function checkEvidenceRecapturePackage(built, { root = repositoryRoot } = {}) {
  const validation = built.qualityReport.validation;
  if (!validation.ok) {
    throw new Error(`CF27 evidence recapture package validation failed: ${validation.errors.map((error) => error.message).join("; ")}`);
  }
  assertCurrent(root, outputPaths.qualityReport, built.files.qualityReport);
  assertCurrent(root, outputPaths.recordReadinessCsv, built.files.recordReadinessCsv);
  assertCurrent(root, outputPaths.recaptureQueueJson, built.files.recaptureQueueJson);
  assertCurrent(root, outputPaths.recaptureQueueCsv, built.files.recaptureQueueCsv);
  assertCurrent(root, outputPaths.discrepancyReportJson, built.files.discrepancyReportJson);
  assertCurrent(root, outputPaths.discrepancyReportCsv, built.files.discrepancyReportCsv);
  assertCurrent(root, outputPaths.packageDoc, built.files.packageDoc);
  assertCurrent(root, outputPaths.ownerChecklist, built.files.ownerChecklist);
  return true;
}

export function validateEvidenceRecapturePackage({ recordInspections, recaptureTasks, summary }) {
  const errors = [];
  const warnings = [];
  const taskRecordIDs = new Set(recaptureTasks.flatMap((task) => task.affectedCandidateIDs));
  for (const record of recordInspections) {
    if (!record.stableCandidateID) errors.push(issue("missingStableCandidateID", "A record readiness row is missing stableCandidateID."));
    if (record.productionEligible) errors.push(issue("productionEligibilityGranted", `${record.stableCandidateID} is marked production eligible.`, record.stableCandidateID));
    if (record.secondVerifierStatus !== "NOT_VERIFIED") errors.push(issue("verificationClaimed", `${record.stableCandidateID} has a second-verifier status.`, record.stableCandidateID));
    if (record.recaptureRequired && !taskRecordIDs.has(record.stableCandidateID)) {
      errors.push(issue("recaptureRecordMissingTask", `${record.stableCandidateID} requires recapture but has no mapped recapture task.`, record.stableCandidateID));
    }
    if (record.missingEvidence && record.reviewReadiness === "READY_FOR_SECOND_VERIFIER_REVIEW") {
      errors.push(issue("missingEvidenceMarkedReady", `${record.stableCandidateID} is missing evidence but marked review ready.`, record.stableCandidateID));
    }
  }
  if (summary.productionCatalogRecords !== 0) errors.push(issue("productionRecordsNonzero", "The package must not be generated as a production-release package."));
  if (summary.secondVerifiedRecords !== 0) errors.push(issue("secondVerificationClaimed", "The package must not claim second verification."));
  if (summary.recaptureRequiredRecords > 0 && recaptureTasks.length === 0) errors.push(issue("missingRecaptureQueue", "Recapture is required but the queue is empty."));
  if (summary.unexpectedViewLabelRecords > 0) warnings.push(issue("unexpectedViewLabels", "Unexpected view labels are present and should be reviewed."));
  return {
    schemaVersion: `${CF27_EVIDENCE_RECAPTURE_PACKAGE_SCHEMA_VERSION}-validation`,
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    errors,
    warnings
  };
}

function inspectEvidenceEntries({ root, evidenceEntries, videoRows }) {
  const videoIDs = new Set(videoRows.map((row) => row.inventoryId));
  return evidenceEntries.map((entry) => {
    const evidenceID = evidenceId(entry);
    const relativePath = entry.relative_path ?? entry.relativePath ?? "";
    const masterOrDerivative = entry.master_or_derivative ?? entry.masterOrDerivative ?? "unknown";
    const sha256 = entry.sha256 ?? null;
    const pathResolution = resolveEvidencePath(root, relativePath, masterOrDerivative);
    const localHash = pathResolution.status === "RESOLVES" ? sha256File(pathResolution.absolutePath) : null;
    const sourceVideoID = entry.video_id ?? entry.sourceVideoID ?? entry.source_video_id ?? "";
    const view = inferEvidenceView(entry);
    return {
      evidenceID,
      relativePath,
      masterOrDerivative,
      fileRole: entry.file_role ?? entry.fileRole ?? "",
      sha256,
      sha256Status: isValidSha256(sha256) ? "VALID_SHA256" : "INVALID_OR_MISSING_SHA256",
      localHash,
      localHashMatchesManifest: localHash && sha256 ? localHash.toLowerCase() === sha256.toLowerCase() : null,
      pathResolutionStatus: pathResolution.status,
      fileExistsLocally: pathResolution.status === "RESOLVES",
      view,
      unexpectedViewLabel: !allowedViews.has(view),
      sourceVideoID,
      sourceVideoTraceable: sourceVideoID ? videoIDs.has(sourceVideoID) : false,
      timestamp: entry.timestamp ?? null,
      timestampPresent: entry.timestamp !== undefined && entry.timestamp !== null && entry.timestamp !== "",
      verificationState: entry.verification_state ?? entry.verificationStatus ?? "",
      sourceVideoFilename: entry.source_video ?? entry.sourceVideoFilename ?? "",
      notes: entry.notes ?? ""
    };
  }).sort((left, right) => String(left.evidenceID).localeCompare(String(right.evidenceID)));
}

function inspectQueueRecords({ root, records, evidenceQuality, videoRows, orderCategories, issues, rebuiltQueue }) {
  const evidenceByID = new Map(evidenceQuality.map((entry) => [entry.evidenceID, entry]));
  const videoIDs = new Set(videoRows.map((row) => row.inventoryId));
  const stableIDs = new Map();
  for (const record of records) stableIDs.set(record.stableCandidateID, (stableIDs.get(record.stableCandidateID) ?? 0) + 1);
  const orderIssueCategories = new Set(orderCategories
    .filter((category) => category.categoryCompletionStatus !== "COMPLETE" || Object.values(category.checks ?? {}).some((check) => ["FAIL", "NOT_PROVEN", "UNKNOWN"].includes(check?.status)))
    .map((category) => category.categoryLabel));
  const issuesByRecord = groupIssuesByRecordID(issues);
  const rebuiltByID = new Map((rebuiltQueue.records ?? []).map((record) => [record.stableCandidateID, record]));

  return records.map((record) => {
    const evidenceRefs = record.evidenceReferences ?? [];
    const evidenceChecks = evidenceRefs.map((ref) => {
      const entry = evidenceByID.get(ref.evidenceID);
      const refPathStatus = ref.pathResolutionStatus ?? entry?.pathResolutionStatus ?? "NO_FILE_REFERENCE";
      return {
        evidenceID: ref.evidenceID,
        view: ref.view ?? entry?.view ?? "UNKNOWN",
        relativePath: ref.relativePath ?? entry?.relativePath ?? "",
        pathResolutionStatus: refPathStatus,
        sha256Status: isValidSha256(ref.sha256 ?? entry?.sha256) ? "VALID_SHA256" : "INVALID_OR_MISSING_SHA256",
        localHashMatchesManifest: entry?.localHashMatchesManifest ?? null,
        sourceVideoTraceable: entry?.sourceVideoTraceable ?? record.sourceVideoReferences?.some((source) => videoIDs.has(source.sourceVideoID)) ?? false,
        timestampPresent: entry?.timestampPresent ?? Boolean(ref.timestamp ?? record.sourceVideoReferences?.some((source) => source.timestamp || source.timestampRange))
      };
    });
    const sourceTraceable = (record.sourceVideoReferences ?? []).some((source) => source.sourceVideoID && videoIDs.has(source.sourceVideoID) && (source.timestamp || source.timestampRange));
    const missingMetadataFields = [
      record.environmentID ? "" : "environmentID",
      record.platform ? "" : "platform",
      record.gameVersion ? "" : "gameVersion",
      record.patch ? "" : "patch",
      record.mode ? "" : "mode",
      record.creationPath ? "" : "creationPath"
    ].filter(Boolean);
    const localPathFailures = evidenceChecks.filter((entry) => ["MISSING", "UNSAFE_PATH", "NO_FILE_REFERENCE"].includes(entry.pathResolutionStatus));
    const invalidHashes = evidenceChecks.filter((entry) => entry.sha256Status !== "VALID_SHA256");
    const unexpectedViews = unique([
      ...asArray(record.requiredViews).filter((view) => !allowedViews.has(view)),
      ...asArray(record.availableViews).filter((view) => !allowedViews.has(view)),
      ...evidenceChecks.map((entry) => entry.view).filter((view) => !allowedViews.has(view))
    ]);
    const recordIssues = issuesByRecord.get(record.stableCandidateID) ?? [];
    const deficiencies = buildRecordDeficiencies({
      record,
      missingMetadataFields,
      localPathFailures,
      invalidHashes,
      unexpectedViews,
      sourceTraceable,
      orderIssueCategories,
      recordIssues
    });
    const missingEvidence = record.evidenceCompletenessStatus !== "EVIDENCE_LINKED" || evidenceRefs.length === 0 || localPathFailures.some((entry) => entry.pathResolutionStatus !== "PORTABLE_EXTERNAL_SOURCE_REFERENCE");
    const blockingForReview = missingEvidence || !sourceTraceable || invalidHashes.length > 0 || unexpectedViews.length > 0 || stableIDs.get(record.stableCandidateID) > 1;
    const recaptureRequired = deficiencies.some((deficiency) => deficiency.recaptureRequired);
    return {
      stableCandidateID: record.stableCandidateID,
      queueRecordID: record.queueRecordID,
      category: record.category,
      nativeOptionLabelOrIndex: record.nativeOptionLabelOrIndex,
      nativeOrder: record.nativeOrder,
      environmentID: record.environmentID,
      platform: record.platform,
      gameVersion: record.gameVersion,
      patch: record.patch,
      mode: record.mode,
      creationPath: record.creationPath,
      secondVerifierStatus: record.secondVerifierStatus,
      productionEligible: record.currentProductionEligibility !== "NOT_ELIGIBLE",
      reviewReadiness: blockingForReview ? "BLOCKED_PENDING_EVIDENCE_REPAIR" : "READY_FOR_SECOND_VERIFIER_REVIEW",
      reviewReadyNow: !blockingForReview,
      recaptureRequired,
      missingEvidence,
      missingMetadataFields,
      missingViews: record.missingViews ?? [],
      unexpectedViews,
      duplicateOrNearDuplicateFlag: Boolean(record.duplicateOrNearDuplicateFlag),
      dependencyFlag: Boolean(record.dependencyFlag),
      versionOrEnvironmentGap: Boolean(record.versionOrEnvironmentGap),
      canonicalSettingsConsistencyResult: record.canonicalSettingsConsistencyResult,
      framingConsistencyResult: record.framingConsistencyResult,
      lightingConsistencyResult: record.lightingConsistencyResult,
      sourceVideoTraceable: sourceTraceable,
      evidenceChecks,
      sourceVideoReferences: record.sourceVideoReferences ?? [],
      issueReferences: record.issueReferences ?? [],
      deficiencies,
      blockerReasons: record.blockingReasons ?? [],
      recommendedVerifierAction: record.recommendedVerifierAction,
      recommendedRecaptureAction: record.recommendedRecaptureAction,
      rebuiltQueueMatchesCommittedQueue: JSON.stringify(rebuiltByID.get(record.stableCandidateID) ?? {}) === JSON.stringify(record)
    };
  }).sort(compareRecordReadiness);
}

function buildRecordDeficiencies({ record, missingMetadataFields, localPathFailures, invalidHashes, unexpectedViews, sourceTraceable, orderIssueCategories, recordIssues }) {
  const deficiencies = [];
  if (record.evidenceCompletenessStatus !== "EVIDENCE_LINKED" || (record.evidenceReferences ?? []).length === 0) {
    deficiencies.push(deficiency("MISSING_EVIDENCE", "Evidence references are missing or not linked.", true));
  }
  if (localPathFailures.length > 0) {
    deficiencies.push(deficiency("BROKEN_EVIDENCE_PATH", `Evidence path failures: ${localPathFailures.map((entry) => `${entry.evidenceID}:${entry.pathResolutionStatus}`).join("; ")}.`, true));
  }
  if (invalidHashes.length > 0) {
    deficiencies.push(deficiency("INVALID_EVIDENCE_HASH", `Invalid SHA-256 references: ${invalidHashes.map((entry) => entry.evidenceID).join("; ")}.`, false));
  }
  if ((record.missingViews ?? []).length > 0) {
    deficiencies.push(deficiency("MISSING_REQUIRED_VIEWS", `Missing required production view(s): ${record.missingViews.join(", ")}.`, true));
  }
  if (unexpectedViews.length > 0) {
    deficiencies.push(deficiency("UNEXPECTED_VIEW_LABEL", `Unexpected view label(s): ${unexpectedViews.join(", ")}.`, false));
  }
  if (missingMetadataFields.length > 0 || record.versionOrEnvironmentGap) {
    deficiencies.push(deficiency("ENVIRONMENT_VERSION_GAP", `Missing environment/version field(s): ${missingMetadataFields.join(", ") || "version/environment gap flag present"}.`, true));
  }
  if (!sourceTraceable) {
    deficiencies.push(deficiency("SOURCE_VIDEO_TRACEABILITY_GAP", "Source video and timestamp could not be traced to the inventory.", true));
  }
  if (record.duplicateOrNearDuplicateFlag || record.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED") {
    deficiencies.push(deficiency("DUPLICATE_REVIEW_REQUIRED", "Duplicate or continuity concern must be reviewed from direct evidence.", true));
  }
  if (record.primaryReviewStatus === "ORDER_UNRESOLVED" || orderIssueCategories.has(record.category)) {
    deficiencies.push(deficiency("ORDERING_DISPUTE", "Native order, selector boundary, or count continuity is unresolved for this record/category.", true));
  }
  if (record.dependencyFlag || recordIssues.some((issue) => /dependency/i.test(`${issue.kind} ${issue.title} ${issue.description}`))) {
    deficiencies.push(deficiency("DEPENDENCY_UNRESOLVED", "Dependency behavior is unresolved or flagged.", true));
  }
  if (!["PASS", "NOT_APPLICABLE"].includes(String(record.canonicalSettingsConsistencyResult))) {
    deficiencies.push(deficiency("CANONICAL_SETTING_INCONSISTENCY", `Canonical setting consistency is ${record.canonicalSettingsConsistencyResult}.`, true));
  }
  if (!["PASS", "NOT_APPLICABLE"].includes(String(record.framingConsistencyResult))) {
    deficiencies.push(deficiency("FRAMING_OR_VISIBILITY_LIMITATION", `Framing/visibility status is ${record.framingConsistencyResult}.`, true));
  }
  if (!["PASS", "NOT_APPLICABLE"].includes(String(record.lightingConsistencyResult))) {
    deficiencies.push(deficiency("LIGHTING_NOT_STANDARDIZED", `Lighting status is ${record.lightingConsistencyResult}.`, true));
  }
  return deficiencies;
}

function buildRecaptureTasks({ recordInspections, captureRequests, orderCategories, issues }) {
  const tasks = [];
  const versionGapRecords = recordInspections.filter((record) => record.versionOrEnvironmentGap);
  if (versionGapRecords.length > 0) {
    tasks.push(globalTask({
      id: "CF27-REC-GLOBAL-ENVIRONMENT-VERSION",
      group: "Environment evidence",
      priority: "P0",
      candidateOrMenuID: "CF27_ENVIRONMENT_VERSION_PATCH",
      affectedCandidateIDs: versionGapRecords.map((record) => record.stableCandidateID),
      category: "Environment metadata",
      exactMissingOrDefectiveEvidence: ["Direct game version, patch/update state, and environment metadata are unresolved for all current records."],
      requiredView: "ENVIRONMENT_SCREEN",
      recommendedFileName: "GFM-CF27-ENVIRONMENT-VERSION-PATCH-YYYYMMDD-partNN.mp4",
      whyRecordRemainsBlocked: "Production release cannot bind observations to a reproducible game version and patch.",
      evidenceWillClearBlocker: "Direct console/game screens showing platform, game version, patch/update state, mode, creation path, and safe account/entitlement context."
    }));
    tasks.push(globalTask({
      id: "CF27-REC-GLOBAL-VERSION-MISMATCH-BASELINE",
      group: "Version mismatches",
      priority: "P0",
      candidateOrMenuID: "CF27_VERSION_PATCH_BASELINE",
      affectedCandidateIDs: versionGapRecords.map((record) => record.stableCandidateID),
      category: "Version and patch baseline",
      exactMissingOrDefectiveEvidence: ["No production-usable version/patch baseline exists for comparing a second verifier environment against primary research."],
      requiredView: "VERSION_OR_PATCH_SCREEN",
      recommendedFileName: "GFM-CF27-VERSION-PATCH-BASELINE-YYYYMMDD-partNN.mp4",
      whyRecordRemainsBlocked: "A verifier cannot distinguish matching evidence from a version mismatch until the supported version/patch baseline is captured.",
      evidenceWillClearBlocker: "Direct title/update/manage-game evidence showing the game version or explicit patch/update state."
    }));
  }
  const creationRequest = findRequestByID(captureRequests.requests ?? [], "GFM-CAP-013");
  const creationPathAffectedIDs = recordInspections.filter((record) => /journey|body|creation|path/i.test(`${record.category} ${record.stableCandidateID} ${record.creationPath ?? ""}`)).map((record) => record.stableCandidateID);
  if (creationRequest || creationPathAffectedIDs.length > 0) {
    tasks.push(globalTask({
      id: "CF27-REC-GLOBAL-CREATION-PATH",
      group: "Creation-path evidence",
      priority: "P0",
      candidateOrMenuID: creationRequest?.captureID ?? "CF27_CREATION_PATH_CANONICAL",
      affectedCandidateIDs: creationPathAffectedIDs,
      category: creationRequest?.exactCategory ?? "Creation paths",
      exactMissingOrDefectiveEvidence: [creationRequest?.existingFootageCanBeReused ?? "Canonical creation path requires direct re-walk evidence before production publication."],
      requiredView: "MENU",
      recommendedFileName: creationRequest?.requiredFileNamingConvention ?? "GFM-CF27-CREATION-PATH-CANONICAL-YYYYMMDD-partNN.mp4",
      whyRecordRemainsBlocked: "Creation path and environment context must be reproducible before production publication.",
      evidenceWillClearBlocker: "Continuous menu evidence from Road to Glory entry through the supported Create Player appearance path."
    }));
  }
  const menuRequest = findRequestByID(captureRequests.requests ?? [], "GFM-CAP-001");
  if (menuRequest) {
    tasks.push(globalTask({
      id: "CF27-REC-GLOBAL-MENU-MAP",
      group: "Menu-map evidence",
      priority: "P0",
      candidateOrMenuID: menuRequest.captureID,
      affectedCandidateIDs: recordInspections.map((record) => record.stableCandidateID),
      category: menuRequest.exactCategory ?? "Appearance menu hierarchy",
      exactMissingOrDefectiveEvidence: [menuRequest.existingFootageCanBeReused ?? "Appearance menu boundaries require direct proof."],
      requiredView: "MENU",
      recommendedFileName: menuRequest.requiredFileNamingConvention,
      whyRecordRemainsBlocked: "Menu-map boundaries and scroll continuations are not production complete.",
      evidenceWillClearBlocker: "Readable menu labels, first/final visible rows, and scroll/wrap proof without inferred categories."
    }));
  }
  const dependencyRequest = findRequestByID(captureRequests.requests ?? [], "GFM-CAP-014");
  if (dependencyRequest || recordInspections.length > 0) {
    tasks.push(globalTask({
      id: "CF27-REC-GLOBAL-DEPENDENCY-TESTS",
      group: "Dependency tests",
      priority: "P1",
      candidateOrMenuID: dependencyRequest?.captureID ?? "CF27_DEPENDENCY_TESTS",
      affectedCandidateIDs: recordInspections.map((record) => record.stableCandidateID),
      category: dependencyRequest?.exactCategory ?? "Dependencies",
      exactMissingOrDefectiveEvidence: [dependencyRequest?.existingFootageCanBeReused ?? "Dependency behavior has not been fully tested for production publication."],
      requiredView: "DEPENDENCY_TEST",
      recommendedFileName: dependencyRequest?.requiredFileNamingConvention ?? "GFM-CF27-DEPENDENCY-TESTS-YYYYMMDD-partNN.mp4",
      whyRecordRemainsBlocked: "Untested dependencies can change available options, order, rendering, or recommendation instructions.",
      evidenceWillClearBlocker: "Controlled dependency-test captures that change one variable at a time and preserve before/after counts/order."
    }));
  }
  for (const record of recordInspections.filter((row) => row.recaptureRequired || row.missingEvidence)) {
    const recaptureDeficiencies = record.deficiencies.filter((deficiency) => deficiency.recaptureRequired || deficiency.code === "MISSING_EVIDENCE");
    const group = groupForRecord(record, recaptureDeficiencies);
    const request = findBestCaptureRequest(record, captureRequests.requests ?? []);
    tasks.push({
      taskID: `CF27-REC-${slug(record.stableCandidateID)}`,
      group,
      priority: priorityForRecord(record, recaptureDeficiencies),
      candidateOrMenuID: record.stableCandidateID,
      affectedCandidateIDs: [record.stableCandidateID],
      category: record.category,
      exactMissingOrDefectiveEvidence: recaptureDeficiencies.map((item) => `${item.code}: ${item.message}`),
      requiredConsoleEnvironment: requiredConsoleEnvironment(record),
      requiredCanonicalSettings: requiredCanonicalSettings(record),
      requiredView: record.missingViews.length > 0 ? record.missingViews.join(";") : inferRequiredViewFromDeficiencies(recaptureDeficiencies),
      recommendedFileName: recommendedFileName(record, request, group),
      relatedSourceVideoTimestamp: formatSourceVideoTimestamp(record),
      whyRecordRemainsBlocked: recaptureDeficiencies.map((item) => item.message).join(" "),
      evidenceWillClearBlocker: evidenceToClearBlocker(record, recaptureDeficiencies),
      sourceIssueIDs: record.issueReferences.map((issue) => issue.issueID),
      sourceCaptureIDs: request ? [request.captureID].filter(Boolean) : [],
      preservesOriginalEvidence: true,
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "RECAPTURE_REQUIRED_NOT_SECOND_VERIFIED"
    });
  }

  for (const category of orderCategories.filter((row) => row.categoryCompletionStatus !== "COMPLETE")) {
    const affected = recordInspections.filter((record) => record.category === category.categoryLabel);
    if (affected.length === 0) continue;
    tasks.push({
      taskID: `CF27-ORDER-${slug(category.categoryID ?? category.categoryLabel)}`,
      group: "Ordering disputes",
      priority: "P0",
      candidateOrMenuID: category.categoryID ?? category.categoryLabel,
      affectedCandidateIDs: affected.map((record) => record.stableCandidateID),
      category: category.categoryLabel,
      exactMissingOrDefectiveEvidence: orderDefectMessages(category),
      requiredConsoleEnvironment: "Same supported CF27 Road to Glory Custom environment; game version and patch must be visible in the environment package.",
      requiredCanonicalSettings: "Keep selector/category state stable; show first value, every selected value, final value, and wrap/no-wrap proof where applicable.",
      requiredView: "MENU",
      recommendedFileName: `GFM-CF27-ORDER-${slug(category.categoryID ?? category.categoryLabel)}-YYYYMMDD-partNN.mp4`,
      relatedSourceVideoTimestamp: affected.map(formatSourceVideoTimestamp).filter(Boolean).slice(0, 5).join(" | "),
      whyRecordRemainsBlocked: "Category count/order audit is incomplete.",
      evidenceWillClearBlocker: "A continuous console capture proving native order continuity, first/final boundaries, two counts where required, and wrap/no-wrap behavior.",
      sourceIssueIDs: issues.filter((issue) => affected.some((record) => (issue.affectedRecordIDs ?? []).includes(record.stableCandidateID))).map((issue) => issue.issueID),
      sourceCaptureIDs: [],
      preservesOriginalEvidence: true,
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "ORDER_MISMATCH_OR_COUNT_UNRESOLVED"
    });
  }
  return dedupeTasks(tasks).sort(compareTasks);
}

function buildDiscrepancyRows({ recordInspections, orderCategories }) {
  const rows = [];
  for (const record of recordInspections) {
    for (const deficiency of record.deficiencies) {
      if (!["DUPLICATE_REVIEW_REQUIRED", "ORDERING_DISPUTE", "ENVIRONMENT_VERSION_GAP", "DEPENDENCY_UNRESOLVED", "MISSING_EVIDENCE"].includes(deficiency.code)) continue;
      rows.push({
        discrepancyID: `CF27-DISC-${slug(record.stableCandidateID)}-${slug(deficiency.code)}`,
        discrepancyType: deficiency.code,
        stableCandidateID: record.stableCandidateID,
        category: record.category,
        nativeOrder: record.nativeOrder ?? "",
        primaryObservation: record.nativeOptionLabelOrIndex,
        verifierInstruction: verifierInstructionFor(deficiency.code),
        evidenceReferences: record.evidenceChecks.map((entry) => entry.evidenceID).join(";"),
        sourceVideoTimestamp: formatSourceVideoTimestamp(record),
        currentStatus: "OPEN_PENDING_SECOND_VERIFIER_OR_RECAPTURE",
        blocksProduction: "yes",
        notes: deficiency.message
      });
    }
  }
  for (const category of orderCategories.filter((row) => row.categoryCompletionStatus !== "COMPLETE")) {
    rows.push({
      discrepancyID: `CF27-DISC-CATEGORY-${slug(category.categoryID ?? category.categoryLabel)}-ORDERING`,
      discrepancyType: "ORDERING_DISPUTE",
      stableCandidateID: category.categoryID ?? category.categoryLabel,
      category: category.categoryLabel,
      nativeOrder: "",
      primaryObservation: category.claimedTotalStatus ?? "COUNT_UNKNOWN",
      verifierInstruction: "Independently recount this full category and preserve native order before comparing primary records.",
      evidenceReferences: "",
      sourceVideoTimestamp: "",
      currentStatus: "OPEN_PENDING_SECOND_VERIFIER_OR_RECAPTURE",
      blocksProduction: "yes",
      notes: orderDefectMessages(category).join(" ")
    });
  }
  return uniqueBy(rows, (row) => row.discrepancyID).sort((left, right) => left.discrepancyID.localeCompare(right.discrepancyID));
}

function summarizePackage({ records, recordInspections, evidenceQuality, recaptureTasks, discrepancyRows, currentProductionRecords, primaryReview }) {
  return {
    totalRecords: records.length,
    reviewReadyRecords: recordInspections.filter((record) => record.reviewReadyNow).length,
    blockedForEvidenceRepairRecords: recordInspections.filter((record) => !record.reviewReadyNow).length,
    recaptureRequiredRecords: recordInspections.filter((record) => record.recaptureRequired).length,
    missingEvidenceRecords: recordInspections.filter((record) => record.missingEvidence).length,
    missingRequiredViewRecords: recordInspections.filter((record) => record.missingViews.length > 0).length,
    duplicateOrOrderingDisputeRecords: recordInspections.filter((record) => record.duplicateOrNearDuplicateFlag || record.deficiencies.some((deficiency) => deficiency.code === "ORDERING_DISPUTE")).length,
    duplicateDisputeRecords: recordInspections.filter((record) => record.duplicateOrNearDuplicateFlag).length,
    orderingDisputeRecords: recordInspections.filter((record) => record.deficiencies.some((deficiency) => deficiency.code === "ORDERING_DISPUTE")).length,
    environmentVersionIssueRecords: recordInspections.filter((record) => record.versionOrEnvironmentGap).length,
    dependencyIssueRecords: recordInspections.filter((record) => record.dependencyFlag).length,
    unexpectedViewLabelRecords: recordInspections.filter((record) => record.unexpectedViews.length > 0).length,
    evidenceManifestEntries: evidenceQuality.length,
    evidenceFilesResolvingLocally: evidenceQuality.filter((entry) => entry.fileExistsLocally).length,
    duplicateHashGroups: duplicateHashGroups(evidenceQuality).length,
    recaptureTaskCount: recaptureTasks.length,
    discrepancyRows: discrepancyRows.length,
    secondVerifiedRecords: primaryReview.summary?.secondVerified ?? 0,
    productionApprovedRecords: primaryReview.summary?.productionApproved ?? 0,
    productionCatalogRecords: currentProductionRecords,
    productionRecommendationsEnabled: false
  };
}

function formatPackageMarkdown({ qualityReport, recaptureQueue, discrepancyReport }) {
  const summary = qualityReport.summary;
  const groupRows = recaptureQueue.groupedTasks
    .map((group) => `| ${group.group} | ${group.tasks.length} | ${group.tasks.filter((task) => task.priority === "P0").length} |`)
    .join("\n");
  return `# CF27 Evidence And Recapture Package

**Status:** deterministic evidence-quality and recapture package; not production data
**Generated at:** ${qualityReport.generatedAt}
**Production recommendations enabled:** ${qualityReport.productionRecommendationsEnabled}

This package tells the owner and second verifier which College Football 27 records can be inspected now and which records remain blocked by missing or defective evidence. It does not create evidence, verify records, approve records, or publish a production catalog.

## Summary

| Metric | Count |
| --- | ---: |
| Queue records inspected | ${summary.totalRecords} |
| Review-ready from current evidence | ${summary.reviewReadyRecords} |
| Blocked for evidence repair | ${summary.blockedForEvidenceRepairRecords} |
| Recapture-required records | ${summary.recaptureRequiredRecords} |
| Missing-evidence records | ${summary.missingEvidenceRecords} |
| Missing required view records | ${summary.missingRequiredViewRecords} |
| Duplicate dispute records | ${summary.duplicateDisputeRecords} |
| Ordering dispute records | ${summary.orderingDisputeRecords} |
| Environment/version issue records | ${summary.environmentVersionIssueRecords} |
| Dependency issue records | ${summary.dependencyIssueRecords} |
| Recapture tasks | ${summary.recaptureTaskCount} |
| Verifier discrepancy rows | ${summary.discrepancyRows} |
| Second-verified records | ${summary.secondVerifiedRecords} |
| Production-approved records | ${summary.productionApprovedRecords} |
| Production catalog records | ${summary.productionCatalogRecords} |

## Recapture Groups

| Group | Tasks | P0 tasks |
| --- | ---: | ---: |
${groupRows}

## Review Rules

1. A derivative frame is review evidence, not proof that the original observation is correct.
2. A record can be review-ready for the second verifier while still requiring recapture before production.
3. Environment/version gaps, missing production views, ordering disputes, duplicate disputes, dependency questions, and canonical-setting inconsistencies all block production.
4. The second verifier must preserve disagreements and use the approved status values only.

## Generated Files

- Quality report: \`${outputPaths.qualityReport}\`
- Record readiness CSV: \`${outputPaths.recordReadinessCsv}\`
- Recapture queue JSON: \`${outputPaths.recaptureQueueJson}\`
- Recapture queue CSV: \`${outputPaths.recaptureQueueCsv}\`
- Verifier discrepancy report JSON: \`${outputPaths.discrepancyReportJson}\`
- Verifier discrepancy report CSV: \`${outputPaths.discrepancyReportCsv}\`
- Owner checklist: \`${outputPaths.ownerChecklist}\`

## Verifier Discrepancy Summary

| Metric | Count |
| --- | ---: |
| Total discrepancy rows | ${discrepancyReport.summary.totalRows} |
| Duplicate disputes | ${discrepancyReport.summary.duplicateDisputes} |
| Ordering disputes | ${discrepancyReport.summary.orderingDisputes} |
| Version/environment gaps | ${discrepancyReport.summary.versionMismatches} |
| Dependency unresolved | ${discrepancyReport.summary.dependencyUnresolved} |
| Missing evidence rows | ${discrepancyReport.summary.missingEvidenceRows} |
`;
}

function formatOwnerChecklist({ qualityReport, recaptureQueue }) {
  const firstTasks = recaptureQueue.tasks.filter((task) => task.priority === "P0").slice(0, 20);
  return `# CF27 Owner Recapture Checklist

**Status:** owner recording checklist; not verification and not production data
**Generated at:** ${qualityReport.generatedAt}

## Record These First

${firstTasks.map((task, index) => `${index + 1}. **${task.group} - ${task.candidateOrMenuID}**
   - File name: \`${task.recommendedFileName}\`
   - Required view/evidence: ${task.requiredView}
   - Keep constant: ${task.requiredCanonicalSettings}
   - Why: ${task.whyRecordRemainsBlocked}
   - Clears when: ${task.evidenceWillClearBlocker}`).join("\n\n")}

## Rules While Recording

- Do not rename, trim, recompress, or overwrite master recordings.
- Keep menu labels, native order/index, and selected values visible.
- Pause long enough for text to be readable.
- Show first and final selector boundaries where the task asks for ordering evidence.
- Leave unknown fields unknown when the console cannot show them directly.
- Place finished files in \`data/phase-zero/intake/pending/\` for the intake pipeline.

## Current Counts

- Review-ready records from current evidence: ${qualityReport.summary.reviewReadyRecords}
- Recapture-required records: ${qualityReport.summary.recaptureRequiredRecords}
- Missing-evidence records: ${qualityReport.summary.missingEvidenceRecords}
- Production catalog records: ${qualityReport.summary.productionCatalogRecords}
`;
}

function recordReadinessCsvRow(record) {
  return {
    stable_candidate_id: record.stableCandidateID,
    category: record.category,
    native_order: record.nativeOrder ?? "",
    review_readiness: record.reviewReadiness,
    review_ready_now: record.reviewReadyNow,
    recapture_required: record.recaptureRequired,
    missing_evidence: record.missingEvidence,
    missing_views: record.missingViews.join(";"),
    duplicate_or_near_duplicate: record.duplicateOrNearDuplicateFlag,
    ordering_dispute: record.deficiencies.some((entry) => entry.code === "ORDERING_DISPUTE"),
    environment_version_gap: record.versionOrEnvironmentGap,
    dependency_flag: record.dependencyFlag,
    source_video_traceable: record.sourceVideoTraceable,
    production_eligible: record.productionEligible,
    second_verifier_status: record.secondVerifierStatus,
    deficiencies: record.deficiencies.map((entry) => entry.code).join(";")
  };
}

function recaptureTaskCsvRow(task) {
  return {
    task_id: task.taskID,
    group: task.group,
    priority: task.priority,
    candidate_or_menu_id: task.candidateOrMenuID,
    affected_candidate_ids: task.affectedCandidateIDs.join(";"),
    category: task.category,
    required_view: task.requiredView,
    recommended_file_name: task.recommendedFileName,
    related_source_video_timestamp: task.relatedSourceVideoTimestamp,
    why_blocked: task.whyRecordRemainsBlocked,
    evidence_will_clear_blocker: task.evidenceWillClearBlocker,
    source_issue_ids: task.sourceIssueIDs.join(";"),
    source_capture_ids: task.sourceCaptureIDs.join(";")
  };
}

function discrepancyCsvRow(row) {
  return {
    discrepancy_id: row.discrepancyID,
    discrepancy_type: row.discrepancyType,
    stable_candidate_id: row.stableCandidateID,
    category: row.category,
    native_order: row.nativeOrder,
    verifier_instruction: row.verifierInstruction,
    evidence_references: row.evidenceReferences,
    source_video_timestamp: row.sourceVideoTimestamp,
    current_status: row.currentStatus,
    blocks_production: row.blocksProduction,
    notes: row.notes
  };
}

function groupForRecord(record, deficiencies) {
  if (deficiencies.some((item) => item.code === "DUPLICATE_REVIEW_REQUIRED")) return "Duplicate disputes";
  if (deficiencies.some((item) => item.code === "DEPENDENCY_UNRESOLVED")) return "Dependency tests";
  if (/creation/i.test(record.category)) return "Creation-path evidence";
  if (/menu/i.test(record.category)) return "Menu-map evidence";
  if (/head/i.test(record.category)) return "Head records";
  if (/hairstyle|hair color/i.test(record.category)) return "Hairstyles";
  if (/facial-hair|facial hair/i.test(record.category)) return "Facial hair";
  if (deficiencies.some((item) => item.code === "ORDERING_DISPUTE")) return "Ordering disputes";
  return "Additional attributes";
}

function priorityForRecord(record, deficiencies) {
  if (deficiencies.some((item) => ["MISSING_EVIDENCE", "BROKEN_EVIDENCE_PATH", "ENVIRONMENT_VERSION_GAP", "ORDERING_DISPUTE"].includes(item.code))) return "P0";
  if (record.missingViews.length > 0 || record.duplicateOrNearDuplicateFlag) return "P0";
  if (record.dependencyFlag) return "P1";
  return "P1";
}

function requiredConsoleEnvironment(record) {
  return `College Football 27 Road to Glory Custom path matching environment ${record.environmentID || "UNRESOLVED"}; record game version and patch before relying on this evidence.`;
}

function requiredCanonicalSettings(record) {
  if (/head/i.test(record.category)) return "Use the locked canonical head/skin/hair/facial-hair/body setup from the capture plan; keep zoom, lighting, and framing stable.";
  if (/hair/i.test(record.category)) return "Keep canonical head, skin, body, and lighting stable; do not change unrelated Head & Skin controls.";
  return "Keep the current research path and appearance slate stable; do not change unrelated controls during the capture.";
}

function inferRequiredViewFromDeficiencies(deficiencies) {
  if (deficiencies.some((item) => item.code === "ENVIRONMENT_VERSION_GAP")) return "ENVIRONMENT_SCREEN";
  if (deficiencies.some((item) => item.code === "ORDERING_DISPUTE")) return "MENU";
  if (deficiencies.some((item) => item.code === "DUPLICATE_REVIEW_REQUIRED")) return "MENU;FRONT";
  if (deficiencies.some((item) => item.code === "DEPENDENCY_UNRESOLVED")) return "DEPENDENCY_TEST";
  return "MENU";
}

function recommendedFileName(record, request, group) {
  const requested = request?.requiredFileNamingConvention ?? request?.fileNaming ?? "";
  if (requested) return requested;
  return `GFM-CF27-${slug(group).toUpperCase()}-${slug(record.stableCandidateID).toUpperCase()}-YYYYMMDD-partNN.mp4`;
}

function formatSourceVideoTimestamp(record) {
  return record.sourceVideoReferences
    .map((source) => `${source.sourceVideoID ?? "source-unknown"}@${source.timestampRange ?? source.timestamp ?? "timestamp-unknown"}`)
    .join("; ");
}

function evidenceToClearBlocker(record, deficiencies) {
  const codes = new Set(deficiencies.map((item) => item.code));
  const requirements = [];
  if (codes.has("ENVIRONMENT_VERSION_GAP")) requirements.push("direct game version, patch, platform, mode, and creation-path evidence");
  if (codes.has("MISSING_REQUIRED_VIEWS")) requirements.push(`stable required view evidence: ${record.missingViews.join(", ")}`);
  if (codes.has("ORDERING_DISPUTE")) requirements.push("complete native-order and selector-boundary capture");
  if (codes.has("DUPLICATE_REVIEW_REQUIRED")) requirements.push("continuity/duplicate-resolution capture preserving both observations");
  if (codes.has("DEPENDENCY_UNRESOLVED")) requirements.push("controlled dependency test capture");
  if (codes.has("MISSING_EVIDENCE") || codes.has("BROKEN_EVIDENCE_PATH")) requirements.push("valid evidence file with source video timestamp and checksum");
  return requirements.join("; ") || "direct console evidence satisfying the listed defect";
}

function findBestCaptureRequest(record, requests) {
  const text = `${record.category} ${record.stableCandidateID}`.toLowerCase();
  return requests.find((request) => text.includes(String(request.exactCategory ?? request.category ?? "").toLowerCase()))
    ?? requests.find((request) => String(request.requiredFileNamingConvention ?? "").toLowerCase().includes(slug(record.category)))
    ?? null;
}

function orderDefectMessages(category) {
  return Object.entries(category.checks ?? {})
    .filter(([, check]) => ["FAIL", "NOT_PROVEN", "UNKNOWN"].includes(check?.status))
    .map(([name, check]) => `${name}: ${check.message ?? check.status}`);
}

function verifierInstructionFor(code) {
  const instructions = {
    DUPLICATE_REVIEW_REQUIRED: "Compare both observations and source timestamps; do not merge or discard either record without direct evidence.",
    ORDERING_DISPUTE: "Independently recount native order and selector boundaries before comparing primary records.",
    ENVIRONMENT_VERSION_GAP: "Record or confirm the verifier environment; mark version mismatch if it does not match primary evidence.",
    DEPENDENCY_UNRESOLVED: "Review only directly captured dependency behavior; do not mark untested dependencies as passed.",
    MISSING_EVIDENCE: "Confirm evidence path, source timestamp, and checksum; request recapture when unresolved."
  };
  return instructions[code] ?? "Review from direct evidence only.";
}

function duplicateHashGroups(entries) {
  return [...groupBy(entries.filter((entry) => isValidSha256(entry.sha256)), (entry) => entry.sha256.toLowerCase()).entries()]
    .filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({
      sha256,
      evidenceIDs: group.map((entry) => entry.evidenceID).sort(),
      count: group.length
    }))
    .sort((left, right) => left.sha256.localeCompare(right.sha256));
}

function resolveEvidencePath(root, relativePath, masterOrDerivative) {
  if (!relativePath) return { status: "NO_FILE_REFERENCE", absolutePath: "" };
  if (/^OWNER_DOWNLOADS\//.test(relativePath)) return { status: "PORTABLE_EXTERNAL_SOURCE_REFERENCE", absolutePath: "" };
  if (masterOrDerivative === "master" && relativePath.startsWith("source-media/")) return { status: "PORTABLE_EXTERNAL_SOURCE_REFERENCE", absolutePath: "" };
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${path.resolve(root)}${path.sep}`)) return { status: "UNSAFE_PATH", absolutePath };
  if (fs.existsSync(absolutePath)) return { status: "RESOLVES", absolutePath };
  return { status: "MISSING", absolutePath };
}

function inferEvidenceView(entry) {
  const text = `${entry.view ?? ""} ${entry.relative_path ?? ""} ${entry.relativePath ?? ""} ${entry.file_role ?? ""} ${entry.fileRole ?? ""}`.toUpperCase();
  for (const view of allowedViews) {
    if (view !== "UNKNOWN" && text.includes(view)) return view;
  }
  if (/MENU|SOURCE_MASTER|SOURCE-VIDEO|SOURCEVIDEO/.test(text)) return "MENU";
  if (/LEFT[_-]?3Q|LEFT THREE/.test(text)) return "LEFT_3Q";
  if (/RIGHT[_-]?3Q|RIGHT THREE/.test(text)) return "RIGHT_3Q";
  if (/LEFT[_-]?PROFILE/.test(text)) return "LEFT_PROFILE";
  if (/RIGHT[_-]?PROFILE/.test(text)) return "RIGHT_PROFILE";
  if (/REAR|BACK/.test(text)) return "REAR";
  if (/FRONT|CHARACTER_STABLE/.test(text)) return "FRONT";
  if (/FULLSCREEN|FULL-SCREEN/.test(text)) return "FULLSCREEN";
  if (/DEPENDENCY/.test(text)) return "DEPENDENCY_TEST";
  return "UNKNOWN";
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function isValidSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function evidenceId(entry) {
  return entry.evidence_id ?? entry.evidenceID ?? entry.stableEvidenceID ?? "";
}

function deficiency(code, message, recaptureRequired) {
  return { code, message, recaptureRequired };
}

function groupIssuesByRecordID(issues) {
  const grouped = new Map();
  for (const item of issues) {
    for (const id of item.affectedRecordIDs ?? []) {
      grouped.set(id, [...(grouped.get(id) ?? []), item]);
    }
  }
  return grouped;
}

function dedupeTasks(tasks) {
  return uniqueBy(tasks, (task) => task.taskID);
}

function compareRecordReadiness(left, right) {
  return left.category.localeCompare(right.category) || Number(left.nativeOrder ?? 9999) - Number(right.nativeOrder ?? 9999) || left.stableCandidateID.localeCompare(right.stableCandidateID);
}

function compareTasks(left, right) {
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return (priorityOrder[left.priority] ?? 99) - (priorityOrder[right.priority] ?? 99)
    || groupRank(left.group) - groupRank(right.group)
    || left.candidateOrMenuID.localeCompare(right.candidateOrMenuID);
}

function globalTask({ id, group, priority, candidateOrMenuID, affectedCandidateIDs, category, exactMissingOrDefectiveEvidence, requiredView, recommendedFileName, whyRecordRemainsBlocked, evidenceWillClearBlocker }) {
  return {
    taskID: id,
    group,
    priority,
    candidateOrMenuID,
    affectedCandidateIDs: unique(affectedCandidateIDs),
    category,
    exactMissingOrDefectiveEvidence,
    requiredConsoleEnvironment: "College Football 27 shipping game in the supported Road to Glory Custom environment; do not expose private account, payment, or serial-number data.",
    requiredCanonicalSettings: "Keep the current research path stable and do not alter unrelated player-creation settings while recording this proof.",
    requiredView,
    recommendedFileName,
    relatedSourceVideoTimestamp: "",
    whyRecordRemainsBlocked,
    evidenceWillClearBlocker,
    sourceIssueIDs: [],
    sourceCaptureIDs: [candidateOrMenuID].filter((value) => String(value).startsWith("GFM-CAP-")),
    preservesOriginalEvidence: true,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "RECAPTURE_REQUIRED_NOT_SECOND_VERIFIED"
  };
}

function findRequestByID(requests, captureID) {
  return requests.find((request) => request.captureID === captureID) ?? null;
}

function groupRank(group) {
  const index = groupOrder.indexOf(group);
  return index === -1 ? 999 : index;
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function uniqueBy(rows, keyFn) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = keyFn(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined).map(String) : [String(value)];
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "UNKNOWN";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeText(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function assertCurrent(root, relativePath, expected) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`${relativePath} is missing. Run npm run cf27:evidence-recapture-package.`);
  const actual = fs.readFileSync(filePath, "utf8");
  if (actual !== expected) throw new Error(`${relativePath} is stale. Run npm run cf27:evidence-recapture-package.`);
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")).join("\n")}\n`;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function issue(code, message, target = "") {
  return { code, message, target };
}
