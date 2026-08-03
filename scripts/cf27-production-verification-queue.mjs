#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_PRODUCTION_VERIFICATION_QUEUE_SCHEMA_VERSION = "cf27-production-verification-queue-v1";
export const defaultQueueJsonPath = "data/phase-zero/production_verification_queue.json";
export const defaultQueueCsvPath = "data/phase-zero/production_verification_queue.csv";
export const defaultSummaryPath = "docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-02T20:15:00-04:00";
const allowedSecondVerifierStatuses = new Set([
  "VERIFIED",
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED",
  "NOT_VERIFIED"
]);

const requiredViewsByCategory = new Map([
  ["Heads", ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"]],
  ["Hairstyles", ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"]],
  ["Hair colors", ["MENU", "FRONT"]],
  ["Facial hair", ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE"]],
  ["Facial-hair colors", ["MENU", "FRONT"]],
  ["Skin Tone", ["MENU", "FRONT"]],
  ["Skin Details", ["MENU", "FRONT"]],
  ["Eye Shape", ["MENU", "FRONT"]],
  ["Eye Color", ["MENU", "FRONT"]],
  ["Nose", ["MENU", "FRONT", "LEFT_PROFILE", "RIGHT_PROFILE"]],
  ["Ear Shape", ["MENU", "LEFT_PROFILE", "RIGHT_PROFILE"]],
  ["Mouth Shape", ["MENU", "FRONT"]],
  ["Jaw Shape", ["MENU", "FRONT", "LEFT_PROFILE", "RIGHT_PROFILE"]],
  ["Chin", ["MENU", "FRONT", "LEFT_PROFILE", "RIGHT_PROFILE"]],
  ["Body-related appearance controls", ["MENU"]]
]);

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes("--check");
  const result = buildProductionVerificationQueue({ root: repositoryRoot });
  if (checkOnly) {
    checkProductionVerificationQueue(result, { root: repositoryRoot });
    console.log(`CF27 production verification queue is current (${result.queue.summary.totalCandidates} candidates).`);
  } else {
    writeProductionVerificationQueue(result, { root: repositoryRoot });
    console.log(`Wrote CF27 production verification queue (${result.queue.summary.totalCandidates} candidates).`);
  }
}

export function buildProductionVerificationQueue({ root = repositoryRoot, generatedAtISO = generatedAt } = {}) {
  const primaryReview = readJson(root, "data/phase-zero/primary_review_status.json");
  const traceability = readJson(root, "data/phase-zero/primary_review_traceability.json");
  const evidenceManifest = readJson(root, "data/phase-zero/evidence_manifest.json");
  const coverage = readJson(root, "data/phase-zero/evidence_coverage_control_center.json");
  const issues = readJson(root, "data/phase-zero/issues_register.research.json");
  const captureRequests = readJson(root, "data/phase-zero/capture_requests.json");
  const countOrderAudit = readJson(root, "data/phase-zero/catalog_count_order_audit.research.json");
  const verifierQueue = readJson(root, "data/phase-zero/verifier_candidate_queue.json");
  const productionManifest = readJson(root, "data/catalog/production/catalog_manifest.json");
  const candidateGate = readOptionalJson(root, "data/phase-zero/verification-candidates/CF27_XBOX_RTG_RESEARCH_CANDIDATE_v1.0.0/candidate_validation_report.json");
  const secondVerifierTargets = readOptionalJson(root, "data/phase-zero/second-verifier-execution-package/required_import_targets.json");

  const evidenceByID = new Map((evidenceManifest.entries ?? []).map((entry) => [evidenceID(entry), entry]));
  const traceabilityByID = new Map((traceability.candidates ?? []).map((entry) => [entry.candidateID, entry]));
  const verifierQueueByID = new Map((verifierQueue.records ?? []).map((entry) => [entry.candidateID, entry]));
  const issuesByRecordID = groupIssuesByRecordID(issues.issues ?? []);
  const auditByCategory = new Map((countOrderAudit.categories ?? []).map((category) => [category.categoryLabel, category]));
  const categoryCoverageByName = new Map((coverage.categoryCoverage ?? []).map((category) => [category.category, category]));
  const requiredTargetsByID = new Map((secondVerifierTargets?.rows ?? []).map((row) => [row.target_stable_id, row]));

  const records = [...(primaryReview.candidates ?? [])]
    .sort(compareCandidates)
    .map((candidate) => {
      const evidenceReferences = buildEvidenceReferences(candidate, evidenceByID, root);
      const availableViews = inferAvailableViews(candidate, evidenceReferences);
      const requiredViews = requiredViewsByCategory.get(candidate.category) ?? ["MENU"];
      const missingViews = requiredViews.filter((view) => !availableViews.includes(view));
      const recordIssues = issuesByRecordID.get(candidate.candidateID) ?? [];
      const queueRecord = verifierQueueByID.get(candidate.candidateID) ?? {};
      const trace = traceabilityByID.get(candidate.candidateID) ?? {};
      const categoryAudit = auditByCategory.get(candidate.category) ?? {};
      const categoryCoverage = categoryCoverageByName.get(candidate.category) ?? {};
      const targetRequirement = requiredTargetsByID.get(candidate.candidateID) ?? {};
      const blockingReasons = uniqueStrings([
        ...asArray(candidate.publicationBlockers),
        ...asArray(queueRecord.productionBlockedBy),
        ...recordIssues.map((issue) => `ISSUE:${issue.issueID}`),
        candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED" ? "DUPLICATE_REVIEW_REQUIRED" : "",
        candidate.primaryReviewStatus === "ORDER_UNRESOLVED" ? "ORDER_UNRESOLVED" : "",
        candidate.environmentResolved === false ? "ENVIRONMENT_UNRESOLVED" : "",
        missingViews.length > 0 ? "MISSING_REQUIRED_VIEWS" : "",
        categoryAudit.categoryCompletionStatus && categoryAudit.categoryCompletionStatus !== "COMPLETE" ? "CATEGORY_COUNT_ORDER_INCOMPLETE" : "",
        categoryCoverage.status && categoryCoverage.status !== "READY_FOR_VERIFIER" ? `COVERAGE:${categoryCoverage.status}` : ""
      ]);
      const duplicateFlag = candidate.duplicated === true || candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED";
      const dependencyFlag = blockingReasons.some((reason) => /DEPENDENCY/i.test(reason)) || recordIssues.some((issue) => issue.kind === "dependencyUncertainty");
      const versionOrEnvironmentGap =
        candidate.environmentResolved === false || !candidate.gameVersion || !candidate.patch || asArray(candidate.unresolvedEnvironmentFields).length > 0;
      return {
        queueRecordID: `cf27-production-verification-${slug(candidate.candidateID)}`,
        stableCandidateID: candidate.candidateID,
        category: candidate.category,
        categoryID: candidate.categoryID,
        nativeOptionLabelOrIndex: nullToBlank(candidate.nativeVisibleLabelOrIndex),
        nativeOrder: candidate.nativeOrder ?? null,
        platform: candidate.platform ?? null,
        gameVersion: candidate.gameVersion ?? null,
        patch: candidate.patch ?? null,
        mode: candidate.mode ?? null,
        creationPath: candidate.creationPath ?? null,
        environmentID: primaryReview.environmentStatus?.environmentID ?? "CF27_XBOX_RTG_ENVIRONMENT_UNRESOLVED",
        primaryResearcher: "UNKNOWN_RESEARCHER",
        primaryReviewStatus: candidate.primaryReviewStatus,
        evidenceCompletenessStatus: evidenceReferences.length > 0 && candidate.evidenceResolved === true ? "EVIDENCE_LINKED" : "MISSING_EVIDENCE",
        evidenceReferences,
        sourceVideoReferences: [{
          sourceVideoID: candidate.sourceVideoID,
          sourceVideoFilename: candidate.sourceVideoFilename,
          originalFilename: candidate.originalFilename,
          sha256: candidate.sourceVideoSha256,
          timestamp: candidate.sourceTimestamp ?? null,
          timestampRange: candidate.sourceTimestampRange,
          sourceVideoResolved: Boolean(candidate.sourceVideoResolved ?? trace.sourceVideoResolved),
          timelineResolved: Boolean(candidate.timelineResolved ?? trace.timelineResolved)
        }],
        requiredViews,
        availableViews,
        missingViews,
        framingConsistencyResult: normalizeCheck(candidate.framingSufficient),
        lightingConsistencyResult: "UNRESOLVED_NOT_CAPTURE_STANDARDIZED",
        canonicalSettingsConsistencyResult: normalizeCheck(candidate.evidenceConditionsConsistent),
        duplicateOrNearDuplicateFlag: duplicateFlag,
        dependencyFlag,
        versionOrEnvironmentGap,
        selectedValueVisible: Boolean(candidate.selectedValueVisible),
        categoryVisible: Boolean(candidate.categoryVisible),
        optionTransitionObservable: normalizeCheck(candidate.optionTransitionObservable),
        neighboringOptionsEstablishOrdering: normalizeCheck(candidate.neighboringOptionsEstablishOrdering),
        selectorBoundaryState: {
          firstSelectorOptionKnown: normalizeCheck(candidate.firstSelectorOptionKnown),
          finalSelectorOptionKnown: normalizeCheck(candidate.finalSelectorOptionKnown),
          selectorWrapKnown: normalizeCheck(candidate.selectorWrapKnown)
        },
        issueReferences: recordIssues.map((issue) => ({
          issueID: issue.issueID,
          kind: issue.kind,
          severity: issue.severity,
          status: issue.status,
          title: issue.title,
          recaptureRequired: issue.recaptureRequest?.required === true
        })),
        captureRequestReferences: findCaptureRequests(candidate, captureRequests.requests ?? []),
        countOrderAudit: {
          categoryCompletionStatus: categoryAudit.categoryCompletionStatus ?? "UNKNOWN",
          productionEligible: categoryAudit.productionEligible === true,
          blockingIssueCount: Array.isArray(categoryAudit.blockingIssues) ? categoryAudit.blockingIssues.length : 0
        },
        recommendedVerifierAction: recommendedVerifierAction(candidate, blockingReasons, duplicateFlag),
        recommendedRecaptureAction: recommendedRecaptureAction(candidate, recordIssues, missingViews),
        currentProductionEligibility: "NOT_ELIGIBLE",
        blockingReasons,
        secondVerifierStatus: "NOT_VERIFIED",
        catalogManagerDisposition: candidate.catalogManagerDisposition ?? "NOT_REVIEWED",
        requiredImportTarget: {
          present: Boolean(targetRequirement.target_stable_id),
          requiresNativeOrder: targetRequirement.requires_native_order === true,
          requiresEvidenceReference: targetRequirement.requires_evidence_reference === true,
          requiresFrontView: targetRequirement.requires_front_view === true,
          requiresSecondaryAngleSample: targetRequirement.requires_secondary_angle_sample === true,
          requiresDuplicateExceptionReview: targetRequirement.requires_duplicate_exception_review === true
        },
        notes: uniqueStrings([
          ...asArray(candidate.notes),
          "Primary review is not second-person verification.",
          "Production eligibility remains blocked until real second verification, resolved discrepancies, catalog-manager approval, and immutable production release."
        ])
      };
    });

  const summary = summarizeRecords(records, {
    primaryReview,
    coverage,
    candidateGate,
    productionManifest
  });
  const queue = {
    schemaVersion: CF27_PRODUCTION_VERIFICATION_QUEUE_SCHEMA_VERSION,
    generatedAt: generatedAtISO,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRODUCTION_VERIFICATION_QUEUE",
    sourceType: "derived_from_primary_research_and_evidence_manifests",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    verificationHasOccurred: false,
    productionRecommendationsEnabled: false,
    allowedSecondVerifierStatuses: [...allowedSecondVerifierStatuses],
    sourceArtifacts: {
      primaryReview: "data/phase-zero/primary_review_status.json",
      primaryTraceability: "data/phase-zero/primary_review_traceability.json",
      evidenceManifest: "data/phase-zero/evidence_manifest.json",
      verifierCandidateQueue: "data/phase-zero/verifier_candidate_queue.json",
      coverageControlCenter: "data/phase-zero/evidence_coverage_control_center.json",
      issuesRegister: "data/phase-zero/issues_register.research.json",
      captureRequests: "data/phase-zero/capture_requests.json",
      countOrderAudit: "data/phase-zero/catalog_count_order_audit.research.json",
      productionManifest: "data/catalog/production/catalog_manifest.json"
    },
    policy: {
      noPromotion: "This queue organizes evidence for human verification only. It does not verify, approve, or publish any record.",
      productionGate: "A record remains production-ineligible until second-person verification, discrepancy resolution, catalog-manager approval, and immutable release gates pass.",
      noInference: "Do not infer missing labels, counts, ordering, dependencies, environment metadata, views, or production suitability."
    },
    summary,
    categoryCounts: summarizeByCategory(records),
    records
  };
  const validation = validateProductionVerificationQueue(queue, { primaryReview });
  const csv = toCsv(records.map(recordToCsvRow));
  const markdown = formatQueueSummary(queue, validation);
  return { queue, validation, files: { json: queue, csv, markdown } };
}

export function validateProductionVerificationQueue(queue, { primaryReview } = {}) {
  const errors = [];
  const warnings = [];
  const records = queue.records ?? [];
  const ids = new Set();
  for (const record of records) {
    if (!record.stableCandidateID) errors.push(issue("missingCandidateID", "Queue record is missing stableCandidateID."));
    if (ids.has(record.stableCandidateID)) errors.push(issue("duplicateCandidateID", `Duplicate candidate ${record.stableCandidateID}.`, record.stableCandidateID));
    ids.add(record.stableCandidateID);
    if (!allowedSecondVerifierStatuses.has(record.secondVerifierStatus)) {
      errors.push(issue("invalidSecondVerifierStatus", `${record.stableCandidateID} has invalid secondVerifierStatus ${record.secondVerifierStatus}.`, record.stableCandidateID));
    }
    if (record.secondVerifierStatus !== "NOT_VERIFIED") {
      errors.push(issue("fabricatedSecondVerification", `${record.stableCandidateID} was assigned a second-verifier status before real verification.`, record.stableCandidateID));
    }
    if (record.currentProductionEligibility !== "NOT_ELIGIBLE") {
      errors.push(issue("productionEligibilityGranted", `${record.stableCandidateID} is production-eligible without required gates.`, record.stableCandidateID));
    }
    if (!Array.isArray(record.evidenceReferences) || record.evidenceReferences.length === 0) {
      errors.push(issue("missingEvidenceReferences", `${record.stableCandidateID} has no evidence references.`, record.stableCandidateID));
    }
    if (!Array.isArray(record.blockingReasons) || record.blockingReasons.length === 0) {
      errors.push(issue("missingBlockingReasons", `${record.stableCandidateID} has no explicit blocking reasons.`, record.stableCandidateID));
    }
  }
  const primaryIDs = new Set((primaryReview?.candidates ?? []).map((candidate) => candidate.candidateID));
  if (primaryReview && primaryIDs.size !== records.length) {
    errors.push(issue("candidateCountMismatch", `Primary review has ${primaryIDs.size} candidates but queue has ${records.length}.`));
  }
  if (primaryReview) {
    for (const id of primaryIDs) {
      if (!ids.has(id)) errors.push(issue("missingPrimaryCandidate", `Primary candidate ${id} is missing from queue.`, id));
    }
  }
  if (queue.summary?.productionEligibleCount !== 0) errors.push(issue("productionEligibleCountNonzero", "Production eligible count must remain zero."));
  if (queue.productionRecommendationsEnabled !== false) errors.push(issue("productionRecommendationsEnabled", "Production recommendations must remain disabled."));
  if (queue.verificationHasOccurred !== false) errors.push(issue("verificationClaimed", "Queue must not claim verification occurred."));
  if ((queue.summary?.identityConflicts ?? 0) > 0) warnings.push(issue("identityConflicts", "One or more candidate identities could not be reconciled."));
  return {
    schemaVersion: `${CF27_PRODUCTION_VERIFICATION_QUEUE_SCHEMA_VERSION}-validation`,
    generatedAt: queue.generatedAt,
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    errors,
    warnings,
    summary: queue.summary
  };
}

export function writeProductionVerificationQueue(result, { root = repositoryRoot } = {}) {
  writeJson(root, defaultQueueJsonPath, result.queue);
  writeText(root, defaultQueueCsvPath, result.files.csv);
  writeText(root, defaultSummaryPath, result.files.markdown);
}

export function checkProductionVerificationQueue(result, { root = repositoryRoot } = {}) {
  if (!result.validation.ok) {
    throw new Error(`Production verification queue validation failed: ${result.validation.errors.map((error) => error.message).join("; ")}`);
  }
  const expectedJson = `${JSON.stringify(result.queue, null, 2)}\n`;
  const expectedCsv = result.files.csv;
  const expectedMarkdown = result.files.markdown;
  assertCurrent(root, defaultQueueJsonPath, expectedJson);
  assertCurrent(root, defaultQueueCsvPath, expectedCsv);
  assertCurrent(root, defaultSummaryPath, expectedMarkdown);
  return true;
}

function buildEvidenceReferences(candidate, evidenceByID, root) {
  const refs = [];
  const candidateFiles = new Set(asArray(candidate.evidenceFiles));
  for (const id of asArray(candidate.evidenceIDs)) {
    const entry = evidenceByID.get(id);
    const relativePath = entry?.relative_path ?? entry?.relativePath ?? "";
    const resolved = relativePath ? pathResolutionStatus(root, relativePath, entry?.master_or_derivative ?? entry?.masterOrDerivative) : "NO_FILE_REFERENCE";
    refs.push({
      evidenceID: id,
      relativePath,
      masterOrDerivative: entry?.master_or_derivative ?? entry?.masterOrDerivative ?? "unknown",
      fileRole: entry?.file_role ?? entry?.fileRole ?? "unknown",
      sha256: entry?.sha256 ?? null,
      sourceVideoID: entry?.video_id ?? entry?.sourceVideoID ?? candidate.sourceVideoID,
      sourceVideoFilename: entry?.source_video ?? candidate.sourceVideoFilename,
      timestamp: entry?.timestamp ?? candidate.sourceTimestamp ?? null,
      verificationState: entry?.verification_state ?? entry?.verificationStatus ?? "OBSERVED_PENDING_VERIFICATION",
      view: inferView(relativePath, entry?.file_role ?? entry?.fileRole),
      pathResolutionStatus: resolved,
      notes: entry?.notes ?? ""
    });
    if (relativePath) candidateFiles.delete(relativePath);
  }
  for (const file of candidateFiles) {
    refs.push({
      evidenceID: `candidate-file:${file}`,
      relativePath: file,
      masterOrDerivative: "derivative",
      fileRole: "candidateEvidenceFile",
      sha256: null,
      sourceVideoID: candidate.sourceVideoID,
      sourceVideoFilename: candidate.sourceVideoFilename,
      timestamp: candidate.sourceTimestamp ?? null,
      verificationState: "OBSERVED_PENDING_VERIFICATION",
      view: inferView(file, ""),
      pathResolutionStatus: pathResolutionStatus(root, file, "derivative"),
      notes: "Evidence path came from the primary-review candidate record."
    });
  }
  return refs;
}

function inferAvailableViews(candidate, evidenceReferences) {
  const views = new Set();
  for (const ref of evidenceReferences) {
    if (ref.view && ref.view !== "UNKNOWN") views.add(ref.view);
  }
  if (candidate.categoryVisible || candidate.selectedValueVisible) views.add("MENU");
  return [...views].sort(viewSort);
}

function inferView(relativePath, fileRole) {
  const text = `${relativePath ?? ""} ${fileRole ?? ""}`.toLowerCase();
  if (/dependency/.test(text)) return "DEPENDENCY_TEST";
  if (/menu|source_master|source-video|sourcevideo|phase_zero_source_master/.test(text)) return "MENU";
  if (/left[_-]?3q|left[_-]?three/.test(text)) return "LEFT_3Q";
  if (/right[_-]?3q|right[_-]?three/.test(text)) return "RIGHT_3Q";
  if (/left[_-]?profile/.test(text)) return "LEFT_PROFILE";
  if (/right[_-]?profile/.test(text)) return "RIGHT_PROFILE";
  if (/rear|back/.test(text)) return "REAR";
  if (/front|character_stable/.test(text)) return "FRONT";
  if (/fullscreen|full-screen/.test(text)) return "FULLSCREEN";
  return "UNKNOWN";
}

function pathResolutionStatus(root, relativePath, masterOrDerivative) {
  if (!relativePath) return "NO_FILE_REFERENCE";
  if (/^OWNER_DOWNLOADS\//.test(relativePath)) return "PORTABLE_EXTERNAL_SOURCE_REFERENCE";
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) return "UNSAFE_PATH";
  if (fs.existsSync(absolute)) return "RESOLVES";
  if (masterOrDerivative === "master" && relativePath.startsWith("source-media/")) return "IGNORED_SOURCE_MASTER_NOT_PRESENT_IN_GIT_CHECKOUT";
  return "MISSING";
}

function recommendedVerifierAction(candidate, blockingReasons, duplicateFlag) {
  if (duplicateFlag) return "REVIEW_DUPLICATE_OR_CONTINUITY_AFTER_INDEPENDENT_COUNTS";
  if (candidate.primaryReviewStatus === "ORDER_UNRESOLVED" || blockingReasons.includes("ORDER_UNRESOLVED")) return "RESOLVE_NATIVE_ORDER_AND_BOUNDARIES";
  if (candidate.evidenceResolved !== true) return "LOCATE_OR_RECAPTURE_MISSING_EVIDENCE";
  if (candidate.readyForVerifierEvidenceReview === true) return "INDEPENDENTLY_REVIEW_EVIDENCE_AFTER_BLIND_COUNTS";
  return "BLOCKED_PENDING_REPAIR_OR_RECAPTURE";
}

function recommendedRecaptureAction(candidate, issues, missingViews) {
  const recaptureIssues = issues.filter((item) => item.recaptureRequest?.required === true);
  if (recaptureIssues.length > 0) {
    return recaptureIssues.map((item) => `${item.issueID}: ${item.recaptureRequest.notes || item.title}`).join(" | ");
  }
  if (missingViews.length > 0) return `Capture missing required view(s): ${missingViews.join(", ")}.`;
  if (candidate.environmentResolved === false) return "Capture environment/version/patch evidence before production approval.";
  return "No record-specific recapture beyond required second-verifier review is documented.";
}

function findCaptureRequests(candidate, requests) {
  const candidateText = `${candidate.categoryID ?? ""} ${candidate.category ?? ""} ${candidate.candidateID ?? ""}`.toLowerCase();
  return requests
    .filter((request) => {
      const requestText = `${request.category ?? ""} ${request.subcategory ?? ""} ${request.exactCategory ?? ""} ${request.captureID ?? ""}`.toLowerCase();
      return candidateText.includes(slug(request.category ?? "")) || requestText.includes(String(candidate.categoryID ?? "").toLowerCase()) || requestText.includes(String(candidate.category ?? "").toLowerCase());
    })
    .map((request) => ({
      captureID: request.captureID,
      priority: request.priority,
      category: request.category ?? request.exactCategory,
      status: request.status,
      owner: request.owner,
      objective: request.objective ?? request.title
    }))
    .slice(0, 3);
}

function summarizeRecords(records, { primaryReview, coverage, candidateGate, productionManifest }) {
  const statusCounts = countBy(records, "primaryReviewStatus");
  return {
    totalCandidates: records.length,
    candidateIdentitiesReconciled: records.length,
    identityConflicts: 0,
    evidenceLinkedCount: records.filter((record) => record.evidenceCompletenessStatus === "EVIDENCE_LINKED").length,
    missingEvidenceCount: records.filter((record) => record.evidenceCompletenessStatus !== "EVIDENCE_LINKED").length,
    primaryReviewStatusCounts: statusCounts,
    duplicateOrNearDuplicateCount: records.filter((record) => record.duplicateOrNearDuplicateFlag).length,
    dependencyFlagCount: records.filter((record) => record.dependencyFlag).length,
    versionOrEnvironmentGapCount: records.filter((record) => record.versionOrEnvironmentGap).length,
    recaptureRecommendedCount: records.filter((record) => /Capture|recapture|issue-/i.test(record.recommendedRecaptureAction)).length,
    missingViewRecords: records.filter((record) => record.missingViews.length > 0).length,
    secondVerifierStatusCounts: countBy(records, "secondVerifierStatus"),
    catalogManagerDispositionCounts: countBy(records, "catalogManagerDisposition"),
    productionEligibleCount: records.filter((record) => record.currentProductionEligibility !== "NOT_ELIGIBLE").length,
    productionCatalogRecords: productionManifest.items?.length ?? productionManifest.manifest?.items?.length ?? 0,
    secondVerifiedRecords: primaryReview.summary?.secondVerified ?? 0,
    productionApprovedRecords: primaryReview.summary?.productionApproved ?? 0,
    coverageCategories: coverage.summary?.coverageCategories ?? null,
    openCaptureAssignments: coverage.summary?.assignmentsBlocking ?? candidateGate?.summary?.openCaptureAssignments ?? null,
    candidateGateDecision: candidateGate?.completenessDecision ?? "UNKNOWN"
  };
}

function summarizeByCategory(records) {
  return [...groupBy(records, (record) => record.category).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, rows]) => ({
      category,
      candidateCount: rows.length,
      evidenceLinkedCount: rows.filter((record) => record.evidenceCompletenessStatus === "EVIDENCE_LINKED").length,
      primaryReviewStatusCounts: countBy(rows, "primaryReviewStatus"),
      duplicateOrNearDuplicateCount: rows.filter((record) => record.duplicateOrNearDuplicateFlag).length,
      dependencyFlagCount: rows.filter((record) => record.dependencyFlag).length,
      versionOrEnvironmentGapCount: rows.filter((record) => record.versionOrEnvironmentGap).length,
      missingViewRecords: rows.filter((record) => record.missingViews.length > 0).length,
      recaptureRecommendedCount: rows.filter((record) => /Capture|recapture|issue-/i.test(record.recommendedRecaptureAction)).length,
      productionEligibleCount: 0
    }));
}

function recordToCsvRow(record) {
  return {
    queue_record_id: record.queueRecordID,
    stable_candidate_id: record.stableCandidateID,
    category: record.category,
    native_option_label_or_index: record.nativeOptionLabelOrIndex,
    native_order: nullToBlank(record.nativeOrder),
    platform: nullToBlank(record.platform),
    game_version: nullToBlank(record.gameVersion),
    patch: nullToBlank(record.patch),
    mode: nullToBlank(record.mode),
    creation_path: nullToBlank(record.creationPath),
    environment_id: record.environmentID,
    primary_review_status: record.primaryReviewStatus,
    evidence_completeness_status: record.evidenceCompletenessStatus,
    evidence_ids: record.evidenceReferences.map((entry) => entry.evidenceID).join(";"),
    source_videos: record.sourceVideoReferences.map((entry) => entry.sourceVideoID).join(";"),
    source_timestamps: record.sourceVideoReferences.map((entry) => entry.timestampRange).join(";"),
    required_views: record.requiredViews.join(";"),
    available_views: record.availableViews.join(";"),
    missing_views: record.missingViews.join(";"),
    framing_consistency_result: record.framingConsistencyResult,
    lighting_consistency_result: record.lightingConsistencyResult,
    canonical_settings_consistency_result: record.canonicalSettingsConsistencyResult,
    duplicate_or_near_duplicate_flag: record.duplicateOrNearDuplicateFlag,
    dependency_flag: record.dependencyFlag,
    version_or_environment_gap: record.versionOrEnvironmentGap,
    recommended_verifier_action: record.recommendedVerifierAction,
    recommended_recapture_action: record.recommendedRecaptureAction,
    current_production_eligibility: record.currentProductionEligibility,
    blocking_reasons: record.blockingReasons.join(";"),
    second_verifier_status: record.secondVerifierStatus,
    catalog_manager_disposition: record.catalogManagerDisposition
  };
}

function formatQueueSummary(queue, validation) {
  const s = queue.summary;
  const rows = queue.categoryCounts
    .map((category) => `| ${category.category} | ${category.candidateCount} | ${category.evidenceLinkedCount} | ${category.duplicateOrNearDuplicateCount} | ${category.dependencyFlagCount} | ${category.missingViewRecords} | ${category.productionEligibleCount} |`)
    .join("\n");
  return `# CF27 Production Verification Queue

**Status:** primary-research queue only; not second verified; not production data
**Generated at:** ${queue.generatedAt}
**Production recommendations enabled:** ${queue.productionRecommendationsEnabled}

This queue converts current College Football 27 research candidates into a human-operable production-verification worklist. It does not independently verify records, approve records, or publish a production catalog.

## Summary

| Metric | Count |
| --- | ---: |
| Candidate records | ${s.totalCandidates} |
| Candidate identities reconciled | ${s.candidateIdentitiesReconciled} |
| Identity conflicts | ${s.identityConflicts} |
| Evidence-linked records | ${s.evidenceLinkedCount} |
| Missing-evidence records | ${s.missingEvidenceCount} |
| Duplicate or near-duplicate records | ${s.duplicateOrNearDuplicateCount} |
| Dependency-flagged records | ${s.dependencyFlagCount} |
| Version/environment-gap records | ${s.versionOrEnvironmentGapCount} |
| Records with missing required views | ${s.missingViewRecords} |
| Recapture-recommended records | ${s.recaptureRecommendedCount} |
| Second-verified records | ${s.secondVerifiedRecords} |
| Production-approved records | ${s.productionApprovedRecords} |
| Production catalog records | ${s.productionCatalogRecords} |
| Production-eligible records from this queue | ${s.productionEligibleCount} |

## Primary Review Status

${Object.entries(s.primaryReviewStatusCounts).map(([status, count]) => `- ${status}: ${count}`).join("\n")}

## Second-Verifier Status

${Object.entries(s.secondVerifierStatusCounts).map(([status, count]) => `- ${status}: ${count}`).join("\n")}

## Category Counts

| Category | Candidates | Evidence linked | Duplicate/near duplicate | Dependency flagged | Missing views | Production eligible |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}

## Verifier Operating Instructions

1. Complete blind independent counts and menu/order worksheets before opening record-level primary comparison.
2. For each queue record, review the source video and timestamp, then inspect every listed evidence reference.
3. Use only these second-verifier statuses: ${queue.allowedSecondVerifierStatuses.map((status) => `\`${status}\``).join(", ")}.
4. Leave records as \`NOT_VERIFIED\` unless a real second human verifies them from direct evidence.
5. File discrepancies for count, order, label, evidence, dependency, environment, or version mismatches. Do not average or guess.
6. Do not mark any row production approved. Production approval requires later catalog-manager disposition and immutable release gates.

## Validation

- Status: ${validation.status}
- Errors: ${validation.errors.length}
- Warnings: ${validation.warnings.length}

## Source Artifacts

${Object.entries(queue.sourceArtifacts).map(([label, sourcePath]) => `- ${label}: \`${sourcePath}\``).join("\n")}
`;
}

function groupIssuesByRecordID(issues) {
  const grouped = new Map();
  for (const issue of issues) {
    for (const id of issue.affectedRecordIDs ?? []) {
      const rows = grouped.get(id) ?? [];
      rows.push(issue);
      grouped.set(id, rows);
    }
  }
  return grouped;
}

function evidenceID(entry) {
  return entry.evidence_id ?? entry.evidenceID ?? entry.stableEvidenceID;
}

function normalizeCheck(value) {
  if (value === true) return "PASS";
  if (value === false) return "FAIL";
  if (value === null || value === undefined || value === "") return "UNKNOWN";
  if (String(value).toUpperCase() === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  return String(value);
}

function compareCandidates(a, b) {
  const categoryCompare = String(a.categoryID ?? a.category).localeCompare(String(b.categoryID ?? b.category));
  if (categoryCompare !== 0) return categoryCompare;
  const aOrder = Number.isFinite(a.nativeOrder) ? a.nativeOrder : 9999;
  const bOrder = Number.isFinite(b.nativeOrder) ? b.nativeOrder : 9999;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return String(a.candidateID).localeCompare(String(b.candidateID));
}

function viewSort(a, b) {
  const order = ["MENU", "FULLSCREEN", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q", "DEPENDENCY_TEST", "UNKNOWN"];
  return order.indexOf(a) - order.indexOf(b);
}

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "UNKNOWN";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined).map(String) : [String(value)];
}

function nullToBlank(value) {
  return value === null || value === undefined ? "" : String(value);
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readOptionalJson(root, relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(root, relativePath, data) {
  writeText(root, relativePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function assertCurrent(root, relativePath, expected) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`${relativePath} is missing. Run npm run cf27:production-verification-queue.`);
  const actual = fs.readFileSync(filePath, "utf8");
  if (actual !== expected) throw new Error(`${relativePath} is stale. Run npm run cf27:production-verification-queue.`);
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")).join("\n")}\n`;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function issue(code, message, target = "") {
  return { code, message, target };
}
