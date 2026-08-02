#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_SECOND_VERIFIER_EXECUTION_PACKAGE_SCHEMA_VERSION = "cf27-second-verifier-execution-package-v1";
export const CF27_SECOND_VERIFIER_EXECUTION_PACKAGE_ID = "CF27_XBOX_RTG_SECOND_VERIFIER_EXECUTION_v1";
export const defaultExecutionPackageDirectory = "data/phase-zero/second-verifier-execution-package";
export const defaultExecutionGuidePath = "docs/phase-zero/SECOND_VERIFIER_EXECUTION_GUIDE.md";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-07-21T05:00:00-04:00";
const defaultVerifierID = "VERIFIER_ID_TO_BE_ASSIGNED";

export const allowedSecondVerifierStatuses = Object.freeze([
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

const blindPhase = "BLIND_INDEPENDENT_COUNTS";
const postCountPhase = "POST_INDEPENDENT_COUNT_REVIEW";

export function buildSecondVerifierExecutionPackage({
  root = repositoryRoot,
  verifierID = defaultVerifierID,
  generatedAtISO = generatedAt
} = {}) {
  const normalizedRoot = path.resolve(root);
  const primaryReview = readJSON(path.join(normalizedRoot, "data/phase-zero/primary_review_status.json"));
  const queue = readJSON(path.join(normalizedRoot, "data/phase-zero/verifier_candidate_queue.json"));
  const assignment = readJSON(path.join(normalizedRoot, "data/phase-zero/verification_assignment.json"));
  const blockedCandidateGate = readJSON(path.join(normalizedRoot, "data/phase-zero/verification-candidates/CF27_XBOX_RTG_RESEARCH_CANDIDATE_v1.0.0/candidate_validation_report.json"));
  const coverage = readJSON(path.join(normalizedRoot, "data/phase-zero/evidence_coverage_control_center.json"));
  const evidenceManifest = readJSON(path.join(normalizedRoot, "data/phase-zero/evidence_manifest.json"));
  const issues = readJSON(path.join(normalizedRoot, "data/phase-zero/issues_register.research.json"));

  const candidates = normalizeCandidates(primaryReview.candidates ?? [], queue.records ?? []);
  const sample = createDeterministicSecondaryAngleSample({
    candidates,
    environmentID: stringValue(assignment.environmentSummary?.environmentID) || "CF27_XBOX_RTG_ENVIRONMENT_UNRESOLVED",
    verifierID,
    catalogVersion: stringValue(blockedCandidateGate.candidateID) || "CF27_XBOX_RTG_RESEARCH_CANDIDATE_v1.0.0"
  });
  const duplicateRows = candidates.filter((candidate) => candidate.duplicated || candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED");
  const dashboard = createVerifierDashboard({
    candidates,
    sample,
    coverage,
    blockedCandidateGate,
    issues,
    generatedAtISO
  });

  const packageData = {
    schemaVersion: CF27_SECOND_VERIFIER_EXECUTION_PACKAGE_SCHEMA_VERSION,
    generatedAt: generatedAtISO,
    packageID: CF27_SECOND_VERIFIER_EXECUTION_PACKAGE_ID,
    dataClass: "SECOND_VERIFIER_EXECUTION_PACKAGE",
    sourceType: "verification_assignment",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    verificationHasOccurred: false,
    productionRecommendationsEnabled: false,
    primaryReviewConclusionsWithheldForBlindPhase: true,
    candidateGate: {
      candidateID: blockedCandidateGate.candidateID,
      completenessDecision: blockedCandidateGate.completenessDecision,
      releasePackageCreated: blockedCandidateGate.releasePackageCreated,
      blockerCount: numberValue(blockedCandidateGate.summary?.blockerCount),
      warningCount: numberValue(blockedCandidateGate.summary?.warningCount)
    },
    policy: [
      "This package is for a real second human verifier with independent access to the shipping game.",
      "Do not simulate verification or copy primary conclusions into verifier fields.",
      "Complete blind independent counts before opening post-count record-level worksheets.",
      "No row can become production-approved from primary review alone."
    ],
    allowedStatuses: allowedSecondVerifierStatuses,
    packageContents: createPackageContents(),
    samplingMethod: sample.method,
    dashboard
  };

  const files = createPackageFiles({
    packageData,
    assignment,
    candidates,
    sample,
    duplicateRows,
    dashboard,
    evidenceManifest,
    coverage
  });
  const validation = validateSecondVerifierExecutionPackage({ packageData, files, candidates });
  return { packageData, files, validation };
}

export function createDeterministicSecondaryAngleSample({ candidates, environmentID, verifierID, catalogVersion }) {
  const methodID = "deterministic-sha256-environment-verifier-catalog-category-quartile-v1";
  const seedInput = `${environmentID}|${verifierID}|${catalogVersion}`;
  const eligible = candidates
    .filter((candidate) => candidate.readyForVerifierEvidenceReview)
    .map((candidate) => ({
      candidateID: candidate.candidateID,
      category: candidate.category,
      evidenceIDs: candidate.evidenceIDs,
      sourceTimestampRange: candidate.sourceTimestampRange,
      hash: sha256(`${seedInput}|${candidate.category}|${candidate.candidateID}`)
    }));
  const byCategory = groupBy(eligible, (candidate) => candidate.category || "Uncategorized");
  const selected = [];
  for (const [category, rows] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...rows].sort((a, b) => a.hash.localeCompare(b.hash));
    const targetCount = Math.ceil(sorted.length * 0.25);
    sorted.slice(0, targetCount).forEach((row, index) => {
      selected.push({
        sampleID: `secondary-angle-${slug(category)}-${String(index + 1).padStart(3, "0")}`,
        category,
        candidateID: row.candidateID,
        evidenceIDs: row.evidenceIDs,
        sourceTimestampRange: row.sourceTimestampRange,
        selectionHash: row.hash,
        selectedRankWithinCategory: index + 1,
        categoryEligibleCount: sorted.length,
        categorySampleCount: targetCount,
        requiredAction: "Review secondary-angle evidence after independent counts are submitted. Record missing, mismatched, or unusable angles as discrepancies."
      });
    });
  }
  return {
    method: {
      methodID,
      description: "Concatenate environment ID, verifier ID, catalog version, category, and candidate ID; SHA-256 each eligible candidate; sort ascending within category; select the first required quartile using ceiling rounding.",
      seedInput,
      verifierID,
      catalogVersion,
      categoryAware: true,
      sampleFraction: 0.25,
      rounding: "ceil",
      eligibleCandidateCount: eligible.length,
      selectedCandidateCount: selected.length
    },
    rows: selected
  };
}

export function validateSecondVerifierExecutionPackage({ packageData, files, candidates }) {
  const errors = [];
  const warnings = [];
  const paths = new Set(files.map((file) => file.relativePath));
  for (const requiredPath of [
    `${defaultExecutionPackageDirectory}/second_verifier_execution_package.json`,
    `${defaultExecutionPackageDirectory}/environment_worksheet.csv`,
    `${defaultExecutionPackageDirectory}/independent_menu_map_worksheet.csv`,
    `${defaultExecutionPackageDirectory}/independent_counts_worksheet.csv`,
    `${defaultExecutionPackageDirectory}/native_order_worksheet.csv`,
    `${defaultExecutionPackageDirectory}/record_level_comparison_worksheet.csv`,
    `${defaultExecutionPackageDirectory}/front_view_checks.csv`,
    `${defaultExecutionPackageDirectory}/secondary_angle_sample.csv`,
    `${defaultExecutionPackageDirectory}/duplicate_exception_review.csv`,
    `${defaultExecutionPackageDirectory}/discrepancy_form.csv`,
    `${defaultExecutionPackageDirectory}/sign_off_form.csv`,
    `${defaultExecutionPackageDirectory}/verifier_import_template.csv`,
    `${defaultExecutionPackageDirectory}/required_import_targets.csv`,
    `${defaultExecutionPackageDirectory}/verifier_dashboard.json`
  ]) {
    if (!paths.has(requiredPath)) errors.push(issue("missingExecutionPackageFile", `${requiredPath} is missing.`));
  }
  const combined = files.map((file) => file.content).join("\n");
  if (/productionRecommendationsEnabled":\s*true|productionStatus":\s*"PRODUCTION_VERIFIED"|verificationHasOccurred":\s*true/.test(combined)) {
    errors.push(issue("productionOrVerificationClaim", "Verifier execution package must not claim production access or completed verification."));
  }
  if (!packageData.primaryReviewConclusionsWithheldForBlindPhase) {
    errors.push(issue("blindPhaseNotProtected", "Blind independent-count phase must withhold primary review conclusions."));
  }
  const blindFiles = files
    .filter((file) => /independent_counts|independent_menu_map|environment_worksheet|native_order_worksheet/.test(file.relativePath))
    .map((file) => file.content)
    .join("\n");
  if (/PRIMARY_APPROVED|DUPLICATE_REVIEW_REQUIRED|primaryReviewStatus|primaryApproved|primaryApprovedWithNotes/.test(blindFiles)) {
    errors.push(issue("primaryReviewLeakInBlindWorksheet", "Blind worksheets expose primary-review conclusions."));
  }
  if (packageData.dashboard.productionEligible !== 0) {
    errors.push(issue("productionEligibleFromPrimaryReview", "Primary review alone must not create production-eligible records."));
  }
  if (candidates.some((candidate) => candidate.productionEligible === true || candidate.productionRecommendationsEnabled === true)) {
    errors.push(issue("candidateProductionEnabled", "Research candidates must not be production-enabled."));
  }
  if (packageData.samplingMethod.selectedCandidateCount === 0) {
    warnings.push(issue("emptySecondaryAngleSample", "No secondary-angle records were selected for review."));
  }
  return {
    schemaVersion: `${CF27_SECOND_VERIFIER_EXECUTION_PACKAGE_SCHEMA_VERSION}-validation`,
    generatedAt: packageData.generatedAt,
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    errors,
    warnings,
    summary: {
      fileCount: files.length,
      assignedRecords: candidates.length,
      secondaryAngleSampleCount: packageData.samplingMethod.selectedCandidateCount,
      productionEligible: packageData.dashboard.productionEligible
    }
  };
}

export function writeSecondVerifierExecutionPackage(pkg, {
  root = repositoryRoot,
  packageDirectory = defaultExecutionPackageDirectory,
  guidePath = defaultExecutionGuidePath
} = {}) {
  const absolutePackageDirectory = path.resolve(root, packageDirectory);
  const allowedRoot = path.resolve(root, "data/phase-zero");
  if (!absolutePackageDirectory.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Refusing to write second-verifier package outside data/phase-zero: ${packageDirectory}`);
  }
  fs.mkdirSync(absolutePackageDirectory, { recursive: true });
  for (const file of pkg.files) {
    writeText(root, file.relativePath, file.content);
  }
  writeText(root, guidePath, formatSecondVerifierExecutionGuide(pkg.packageData));
}

function createPackageFiles({ packageData, assignment, candidates, sample, duplicateRows, dashboard, evidenceManifest, coverage }) {
  const environmentRows = [{
    package_id: packageData.packageID,
    phase: blindPhase,
    verifier_id: "",
    game_title_seen: "",
    platform: "",
    console_model: "",
    console_os_version: "",
    game_version: "",
    patch_version: "",
    mode: "",
    creation_path: "",
    capture_method: "",
    evidence_reference: "",
    notes: "Fill from the verifier's own Xbox session. Do not copy unresolved primary environment fields."
  }];
  const countRows = (assignment.independentCountingForms ?? []).map((form) => ({
    package_id: packageData.packageID,
    phase: blindPhase,
    target_id: stringValue(form.targetID),
    target_label: stringValue(form.label),
    verifier_count: "",
    first_observed_value: "",
    final_observed_value: "",
    wrap_observed: "",
    selector_boundary_confirmed: "",
    evidence_reference: "",
    status: "NOT_VERIFIED",
    notes: stringValue(form.task)
  }));
  const menuRows = (assignment.menuMapChecklist ?? []).map((row, index) => ({
    package_id: packageData.packageID,
    phase: blindPhase,
    worksheet_row: String(index + 1),
    target_stable_id: stringValue(row.stableMenuID ?? `menu-row-${index + 1}`),
    menu_area: stringValue(row.menu_area ?? row.area ?? row.target_label),
    displayed_label_to_find: stringValue(row.displayed_label_to_find ?? row.displayLabel ?? row.label),
    verifier_observed_label: "",
    verifier_native_order: "",
    evidence_reference: "",
    status: "NOT_VERIFIED",
    notes: "Record only what the verifier independently sees."
  }));
  const nativeOrderRows = countRows.map((row) => ({
    package_id: row.package_id,
    phase: blindPhase,
    target_id: row.target_id,
    target_label: row.target_label,
    verifier_order_sequence: "",
    repeated_or_skipped_values: "",
    beginning_boundary_seen: "",
    ending_boundary_seen: "",
    wrap_seen: "",
    evidence_reference: "",
    notes: "Write the native order observed by the verifier before opening post-count worksheets."
  }));
  const recordRows = candidates.map((candidate) => ({
    package_id: packageData.packageID,
    phase: postCountPhase,
    target_stable_id: candidate.candidateID,
    category: candidate.category,
    native_order_or_observed_order: nullToBlank(candidate.nativeOrder),
    visible_label_or_index: candidate.nativeVisibleLabelOrIndex,
    source_video_id: candidate.sourceVideoID,
    source_timestamp_range: candidate.sourceTimestampRange,
    evidence_ids: candidate.evidenceIDs.join(";"),
    verifier_record_fields_status: "notChecked",
    verifier_evidence_files_status: "notChecked",
    verifier_final_disposition: "NOT_VERIFIED",
    notes: "Open only after blind independent counts are complete. Do not treat primary review as verification."
  }));
  const frontViewRows = candidates.map((candidate) => ({
    package_id: packageData.packageID,
    phase: postCountPhase,
    target_stable_id: candidate.candidateID,
    category: candidate.category,
    evidence_ids: candidate.evidenceIDs.join(";"),
    front_view_exists: "",
    front_view_usable: "",
    menu_label_visible: "",
    obstruction_or_quality_issue: "",
    verifier_status: "NOT_VERIFIED",
    notes: "Required front-view check before any production consideration."
  }));
  const duplicateReviewRows = duplicateRows.map((candidate) => ({
    package_id: packageData.packageID,
    phase: postCountPhase,
    target_stable_id: candidate.candidateID,
    category: candidate.category,
    observed_label_or_index: candidate.nativeVisibleLabelOrIndex,
    evidence_ids: candidate.evidenceIDs.join(";"),
    review_question: "Is this a duplicate, continuity overlap, or distinct observed option?",
    verifier_decision: "",
    discrepancy_id: "",
    notes: "Preserve both observations. Do not merge records silently."
  }));
  const discrepancyRows = [{
    package_id: packageData.packageID,
    phase: postCountPhase,
    discrepancy_id: "",
    verifier_id: "",
    target_stable_id: "",
    discrepancy_type: "",
    verifier_observation: "",
    evidence_reference: "",
    recapture_required: "",
    requested_status: "NOT_VERIFIED",
    notes: ""
  }];
  const signOffRows = [{
    package_id: packageData.packageID,
    verifier_id: "",
    completed_independent_counts: "",
    completed_environment_worksheet: "",
    completed_record_review: "",
    completed_front_view_checks: "",
    completed_secondary_angle_sample: "",
    completed_duplicate_exception_review: "",
    logged_all_disagreements: "",
    no_primary_counts_used_before_blind_counts: "",
    signed_by: "",
    signed_at: "",
    notes: ""
  }];
  const requiredImportTargets = createRequiredImportTargets({
    countRows,
    menuRows,
    candidates,
    sample,
    duplicateRows
  });
  const importRows = createVerifierImportRows({
    assignmentID: stringValue(assignment.assignmentID),
    requiredImportTargets
  });
  const files = [
    jsonFile("second_verifier_execution_package.json", packageData),
    jsonFile("environment_worksheet.json", { phase: blindPhase, rows: environmentRows }),
    csvFile("environment_worksheet.csv", environmentRows),
    jsonFile("independent_menu_map_worksheet.json", { phase: blindPhase, rows: menuRows }),
    csvFile("independent_menu_map_worksheet.csv", menuRows),
    jsonFile("independent_counts_worksheet.json", { phase: blindPhase, primaryCountsWithheld: true, rows: countRows }),
    csvFile("independent_counts_worksheet.csv", countRows),
    jsonFile("native_order_worksheet.json", { phase: blindPhase, primaryCountsWithheld: true, rows: nativeOrderRows }),
    csvFile("native_order_worksheet.csv", nativeOrderRows),
    jsonFile("record_level_comparison_worksheet.json", { phase: postCountPhase, rows: recordRows }),
    csvFile("record_level_comparison_worksheet.csv", recordRows),
    jsonFile("front_view_checks.json", { phase: postCountPhase, rows: frontViewRows }),
    csvFile("front_view_checks.csv", frontViewRows),
    jsonFile("secondary_angle_sample.json", sample),
    csvFile("secondary_angle_sample.csv", sample.rows),
    jsonFile("duplicate_exception_review.json", { phase: postCountPhase, rows: duplicateReviewRows }),
    csvFile("duplicate_exception_review.csv", duplicateReviewRows),
    jsonFile("discrepancy_form.json", { phase: postCountPhase, rows: discrepancyRows, allowedStatuses: allowedSecondVerifierStatuses }),
    csvFile("discrepancy_form.csv", discrepancyRows),
    jsonFile("sign_off_form.json", { phase: postCountPhase, rows: signOffRows }),
    csvFile("sign_off_form.csv", signOffRows),
    jsonFile("verifier_import_template.json", { rows: importRows }),
    csvFile("verifier_import_template.csv", importRows),
    jsonFile("required_import_targets.json", { phase: postCountPhase, rows: requiredImportTargets }),
    csvFile("required_import_targets.csv", requiredImportTargets),
    jsonFile("verifier_dashboard.json", dashboard),
    csvFile("verifier_dashboard.csv", [dashboard]),
    jsonFile("evidence_reference_index.json", createEvidenceReferenceIndex(evidenceManifest, candidates)),
    jsonFile("capture_request_reference.json", coverage.captureAssignments ?? []),
    markdownFile("README.md", formatPackageReadme(packageData))
  ];
  return files.map((file) => ({ ...file, relativePath: `${defaultExecutionPackageDirectory}/${file.fileName}` }));
}

function createRequiredImportTargets({ countRows, menuRows, candidates, sample, duplicateRows }) {
  const sampleIDs = new Set(sample.rows.map((row) => row.candidateID));
  const duplicateIDs = new Set(duplicateRows.map((row) => row.candidateID));
  return [
    ...countRows.map((row) => ({
      target_stable_id: row.target_id,
      category: row.target_label,
      verification_scope: "independentCount",
      requirement_type: "MENU_COUNT",
      requires_count: true,
      requires_native_order: false,
      requires_evidence_reference: true,
      requires_front_view: false,
      requires_secondary_angle_sample: false,
      requires_duplicate_exception_review: false,
      requires_production_candidate_review: false,
      blind_phase_required: true,
      notes: "Verifier must independently count this target before opening primary comparison worksheets."
    })),
    ...menuRows.map((row) => ({
      target_stable_id: row.target_stable_id,
      category: row.displayed_label_to_find || row.menu_area,
      verification_scope: "menuMap",
      requirement_type: "MENU_MAP",
      requires_count: false,
      requires_native_order: true,
      requires_evidence_reference: true,
      requires_front_view: false,
      requires_secondary_angle_sample: false,
      requires_duplicate_exception_review: false,
      requires_production_candidate_review: false,
      blind_phase_required: true,
      notes: "Verifier must independently confirm the menu row, parent, order, and boundary state."
    })),
    ...candidates.map((candidate) => ({
      target_stable_id: candidate.candidateID,
      category: candidate.category,
      verification_scope: "catalogItem",
      requirement_type: "CANDIDATE_RECORD",
      requires_count: false,
      requires_native_order: candidate.nativeOrder !== null,
      requires_evidence_reference: true,
      requires_front_view: true,
      requires_secondary_angle_sample: sampleIDs.has(candidate.candidateID),
      requires_duplicate_exception_review: duplicateIDs.has(candidate.candidateID),
      requires_production_candidate_review: false,
      blind_phase_required: false,
      notes: duplicateIDs.has(candidate.candidateID)
        ? "Duplicate or ambiguous record requires explicit exception review."
        : "Record-level review happens only after independent counts are complete."
    }))
  ];
}

function createVerifierImportRows({ assignmentID, requiredImportTargets }) {
  return requiredImportTargets.map((target) => ({
    assignment_id: assignmentID,
    verifier_id: "",
    target_stable_id: target.target_stable_id,
    category: target.category,
    verification_scope: target.verification_scope,
    verifier_native_order: "",
    verifier_native_label: "",
    verifier_count: "",
    evidence_exists: "",
    front_view_exists: target.requires_front_view ? "" : "notApplicable",
    secondary_angle_sample_included: target.requires_secondary_angle_sample ? "" : "notApplicable",
    native_order_status: target.requires_native_order ? "notChecked" : "notApplicable",
    record_fields_status: "notChecked",
    evidence_files_status: "notChecked",
    front_view_status: target.requires_front_view ? "notChecked" : "notApplicable",
    secondary_angle_status: target.requires_secondary_angle_sample ? "notChecked" : "notApplicable",
    dependency_status: "notApplicable",
    exception_status: target.requires_duplicate_exception_review ? "notChecked" : "notApplicable",
    final_disposition: "NOT_VERIFIED",
    discrepancy_type: "none",
    resolution_action: "",
    resolution_evidence_ids: "",
    notes: target.notes
  }));
}

function normalizeCandidates(primaryCandidates, queueRecords) {
  const queueByID = new Map(queueRecords.map((record) => [record.candidateID, record]));
  return primaryCandidates.map((candidate) => {
    const queueRecord = queueByID.get(candidate.candidateID) ?? {};
    return {
      candidateID: stringValue(candidate.candidateID),
      category: stringValue(candidate.category),
      nativeOrder: candidate.nativeOrder ?? null,
      nativeVisibleLabelOrIndex: stringValue(candidate.nativeVisibleLabelOrIndex),
      sourceVideoID: stringValue(candidate.sourceVideoID),
      sourceTimestampRange: stringValue(candidate.sourceTimestampRange),
      evidenceIDs: asStringArray(candidate.evidenceIDs),
      primaryReviewStatus: stringValue(candidate.primaryReviewStatus),
      duplicated: candidate.duplicated === true,
      ambiguous: candidate.ambiguous === true,
      readyForVerifierEvidenceReview: candidate.readyForVerifierEvidenceReview === true || queueRecord.verifierAction === "REVIEW_EVIDENCE_AFTER_INDEPENDENT_COUNT",
      productionEligible: candidate.productionEligible === true,
      productionRecommendationsEnabled: candidate.productionRecommendationsEnabled === true,
      productionBlockedBy: asStringArray(queueRecord.productionBlockedBy ?? candidate.publicationBlockers)
    };
  });
}

function createVerifierDashboard({ candidates, sample, coverage, blockedCandidateGate, issues, generatedAtISO }) {
  const assigned = candidates.length;
  const completed = 0;
  const disagreement = 0;
  const recaptureRequired = candidates.filter((candidate) => candidate.primaryReviewStatus === "RECAPTURE_REQUIRED").length;
  const blocked = candidates.filter((candidate) => candidate.productionBlockedBy.length > 0 || !candidate.readyForVerifierEvidenceReview).length;
  const productionEligible = candidates.filter((candidate) => candidate.productionEligible || candidate.productionRecommendationsEnabled).length;
  const byCategory = [...groupBy(candidates, (candidate) => candidate.category || "Uncategorized").entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, rows]) => ({
      category,
      assigned: rows.length,
      completed: 0,
      disagreement: 0,
      recaptureRequired: rows.filter((row) => row.primaryReviewStatus === "RECAPTURE_REQUIRED").length,
      blocked: rows.filter((row) => row.productionBlockedBy.length > 0).length,
      productionEligible: 0,
      secondaryAngleSample: sample.rows.filter((row) => row.category === category).length
    }));
  return {
    schemaVersion: `${CF27_SECOND_VERIFIER_EXECUTION_PACKAGE_SCHEMA_VERSION}-dashboard`,
    generatedAt: generatedAtISO,
    status: "AWAITING_REAL_SECOND_VERIFIER",
    assigned,
    completed,
    disagreement,
    recaptureRequired,
    blocked,
    productionEligible,
    secondVerifiedRecords: 0,
    productionApprovedRecords: 0,
    primaryReviewAloneCanPublish: false,
    candidateGate: {
      completenessDecision: blockedCandidateGate.completenessDecision,
      blockerCount: numberValue(blockedCandidateGate.summary?.blockerCount)
    },
    openCaptureAssignments: numberValue(coverage.summary?.assignmentsBlocking),
    openIssues: Array.isArray(issues.issues) ? issues.issues.filter((item) => item.status !== "CLOSED").length : 0,
    categoryStatus: byCategory,
    nextActions: [
      "Assign a real independent verifier ID.",
      "Verifier completes environment and blind count worksheets before opening record-level comparison sheets.",
      "Import completed verifier CSV and metadata through npm run cf27:second-verifier-results-intake.",
      "Resolve discrepancies with direct evidence before any production catalog consideration."
    ]
  };
}

function createEvidenceReferenceIndex(evidenceManifest, candidates) {
  const wantedEvidence = new Set(candidates.flatMap((candidate) => candidate.evidenceIDs));
  const entries = (evidenceManifest.entries ?? [])
    .filter((entry) => wantedEvidence.has(entry.stableEvidenceID ?? entry.evidence_id ?? entry.evidenceID))
    .map((entry) => ({
      evidenceID: entry.stableEvidenceID ?? entry.evidence_id ?? entry.evidenceID,
      relativePath: entry.relativePath ?? entry.relative_path,
      fileRole: entry.fileRole ?? entry.file_role,
      sourceVideoID: entry.sourceVideoID ?? entry.video_id,
      timestamp: entry.timestamp,
      sha256: entry.sha256,
      verificationStatus: entry.verificationStatus ?? entry.verification_state
    }));
  return {
    schemaVersion: `${CF27_SECOND_VERIFIER_EXECUTION_PACKAGE_SCHEMA_VERSION}-evidence-index`,
    generatedAt,
    productionStatus: "NOT_PRODUCTION_DATA",
    entries
  };
}

function createPackageContents() {
  return [
    "environment_worksheet.csv/json",
    "independent_menu_map_worksheet.csv/json",
    "independent_counts_worksheet.csv/json",
    "native_order_worksheet.csv/json",
    "record_level_comparison_worksheet.csv/json",
    "front_view_checks.csv/json",
    "secondary_angle_sample.csv/json",
    "duplicate_exception_review.csv/json",
    "discrepancy_form.csv/json",
    "sign_off_form.csv/json",
    "verifier_import_template.csv/json",
    "required_import_targets.csv/json",
    "verifier_dashboard.csv/json"
  ];
}

function formatPackageReadme(packageData) {
  return `# Second-Verifier Execution Package

Package: ${packageData.packageID}

This is NOT production data and does not contain completed verification.

Use the blind worksheets first:

1. Complete \`environment_worksheet.csv\`.
2. Complete \`independent_counts_worksheet.csv\`.
3. Complete \`independent_menu_map_worksheet.csv\`.
4. Complete \`native_order_worksheet.csv\`.

Only after those independent counts are recorded should the verifier open the post-count record worksheets.

Allowed final statuses:

${allowedSecondVerifierStatuses.map((status) => `- ${status}`).join("\n")}

Production recommendations remain disabled. Primary review alone cannot publish a record.
`;
}

export function formatSecondVerifierExecutionGuide(packageData) {
  return `# Second-Verifier Execution Guide

This guide is for the independent human verifier who will re-check the College Football 27 research candidate package.

## What This Package Is

- Package: \`${packageData.packageID}\`
- Data status: NOT PRODUCTION DATA
- Verification status: NOT VERIFIED
- Production recommendations: disabled

The package helps you record independent observations. It does not prove verification has happened, and it does not publish game records.

## Plain-Language Rules

1. Use the shipping game on Xbox, not memory or older College Football games.
2. Do not look at primary catalog counts before you finish the blind count worksheets.
3. Write exactly what you see on screen.
4. If a label, count, order, or view is unclear, mark it unresolved.
5. Do not mark anything verified unless you personally checked it and the evidence supports it.
6. If you disagree with the primary research package, fill out the discrepancy form. Do not average or guess.

## Step 1: Record Your Environment

Open \`${defaultExecutionPackageDirectory}/environment_worksheet.csv\`.

Fill in your verifier ID, platform, console model, game version, patch, mode, creation path, capture method, and evidence reference. If you cannot see a value on screen, leave it blank and note what is missing.

## Step 2: Complete Blind Counts

Before opening record-level comparison sheets, complete:

- \`independent_counts_worksheet.csv\`
- \`independent_menu_map_worksheet.csv\`
- \`native_order_worksheet.csv\`

Record first and final values, selector boundaries, wrapping, repeated values, skipped values, and evidence references.

## Step 3: Record-Level Review

After blind counts are complete, open:

- \`record_level_comparison_worksheet.csv\`
- \`front_view_checks.csv\`
- \`secondary_angle_sample.csv\`
- \`duplicate_exception_review.csv\`

Check the listed evidence, source timestamps, native order, front-view availability, sampled secondary angles, duplicates, and exceptions.

\`required_import_targets.csv\` is the machine-readable checklist used by the import validator. Every row in \`verifier_import_template.csv\` corresponds to one required target and scope from that file. Do not delete rows. If a target cannot be verified, keep the row and use the appropriate unresolved status with notes and evidence references.

## Secondary-Angle Sample

Method: \`${packageData.samplingMethod.methodID}\`

The tool combines environment ID, verifier ID, catalog version, category, and candidate ID, hashes the value with SHA-256, sorts records within each category, and selects the first 25% using ceiling rounding. This prevents cherry-picking.

## Allowed Statuses

${allowedSecondVerifierStatuses.map((status) => `- \`${status}\``).join("\n")}

## Submit Results

Fill \`verifier_import_template.csv\` and create \`submission_metadata.json\` under \`data/phase-zero/second-verifier-submissions/\`.

The submission metadata sign-off must confirm that independent counts, environment review, front-view checks, the deterministic secondary-angle sample, duplicate/exception review, evidence review, and discrepancy logging are complete. Missing sign-off blocks import.

Then Codex can run:

\`\`\`bash
npm run cf27:second-verifier-results-intake
\`\`\`

The import tool validates identity, environment metadata, count completion, allowed statuses, and discrepancies. It never silently overwrites primary observations.

## What Not To Do

- Do not mark research candidates as production records.
- Do not use test fixtures or placeholders.
- Do not infer missing College Football 27 options.
- Do not skip disagreements.
- Do not use the primary researcher as the second verifier.
`;
}

function jsonFile(fileName, value) {
  return { fileName, content: `${JSON.stringify(value, null, 2)}\n` };
}

function csvFile(fileName, rows) {
  const columns = Object.keys(rows[0] ?? {});
  return {
    fileName,
    content: `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`
  };
}

function markdownFile(fileName, content) {
  return { fileName, content };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(";") : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function writeText(root, relativePath, content) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function readJSON(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function asStringArray(value) {
  return Array.isArray(value) ? value.map((item) => stringValue(item)).filter(Boolean) : [];
}

function stringValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function nullToBlank(value) {
  return value === null || value === undefined ? "" : String(value);
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupBy(rows, keyFn) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slug(value) {
  return stringValue(value).toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "unknown";
}

function issue(code, message) {
  return { code, message };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const verifierFlagIndex = process.argv.indexOf("--verifier-id");
  const verifierID = verifierFlagIndex >= 0 ? process.argv[verifierFlagIndex + 1] : defaultVerifierID;
  const pkg = buildSecondVerifierExecutionPackage({ verifierID });
  if (!pkg.validation.ok) {
    console.error(JSON.stringify(pkg.validation, null, 2));
    process.exit(1);
  }
  if (!check) {
    writeSecondVerifierExecutionPackage(pkg);
    console.log(`Wrote ${pkg.files.length} second-verifier execution package files.`);
  } else {
    const existing = buildSecondVerifierExecutionPackage({ verifierID });
    for (const file of existing.files) {
      const absolutePath = path.resolve(repositoryRoot, file.relativePath);
      if (!fs.existsSync(absolutePath)) {
        console.error(`${file.relativePath} is missing. Run npm run cf27:second-verifier-execution-package.`);
        process.exit(1);
      }
      const current = fs.readFileSync(absolutePath, "utf8");
      if (current !== file.content) {
        console.error(`${file.relativePath} is stale. Run npm run cf27:second-verifier-execution-package.`);
        process.exit(1);
      }
    }
    const currentGuide = fs.existsSync(path.resolve(repositoryRoot, defaultExecutionGuidePath))
      ? fs.readFileSync(path.resolve(repositoryRoot, defaultExecutionGuidePath), "utf8")
      : "";
    if (currentGuide !== formatSecondVerifierExecutionGuide(existing.packageData)) {
      console.error(`${defaultExecutionGuidePath} is stale. Run npm run cf27:second-verifier-execution-package.`);
      process.exit(1);
    }
    console.log("Second-verifier execution package check passed.");
  }
}
