#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_VERIFICATION_CANDIDATE_SCHEMA_VERSION = "cf27-verification-candidate-v1-gate-v1";
export const CF27_VERIFICATION_CANDIDATE_ID = "CF27_XBOX_RTG_RESEARCH_CANDIDATE_v1.0.0";
export const defaultCandidateDirectory = `data/phase-zero/verification-candidates/${CF27_VERIFICATION_CANDIDATE_ID}`;
export const deterministicGeneratedAt = "2026-07-21T04:00:00-04:00";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");

const sourceArtifacts = {
  environmentManifest: "data/phase-zero/environment_manifest.research.json",
  creationPaths: "data/phase-zero/creation_paths.research.json",
  menuMap: "data/phase-zero/menu_map.research.json",
  heads: "data/phase-zero/heads.research.json",
  hairstyles: "data/phase-zero/hairstyles.research.json",
  hairColors: "data/phase-zero/hair_colors.research.json",
  facialHair: "data/phase-zero/facial_hair.research.json",
  facialHairColors: "data/phase-zero/facial_hair_colors.research.json",
  additionalAttributes: "data/phase-zero/additional_attributes.research.json",
  bodyControls: "data/phase-zero/body_controls.research.json",
  dependencyTests: "data/phase-zero/dependency_tests.research.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  captureLog: "data/phase-zero/capture_log.json",
  issuesRegister: "data/phase-zero/issues_register.research.json",
  primaryReview: "data/phase-zero/primary_review_status.json",
  videoInventory: "data/phase-zero/video_inventory.json",
  videoTimeline: "data/phase-zero/video_timeline.json",
  verifierQueue: "data/phase-zero/verifier_candidate_queue.json",
  coverageControlCenter: "data/phase-zero/evidence_coverage_control_center.json",
  productionManifest: "data/catalog/production/catalog_manifest.json"
};

const requiredCandidateFiles = [
  "candidate_manifest.json",
  "candidate_validation_report.json",
  "candidate_validation_report.csv",
  "release_notes.md",
  "checksums.json",
  "README.md"
];

const categoryConfig = [
  { id: "environment", label: "Environment", artifact: "environmentManifest", required: true },
  { id: "creation_paths", label: "Creation paths", artifact: "creationPaths", required: true },
  { id: "menu_hierarchy", label: "Menu hierarchy", artifact: "menuMap", required: true },
  { id: "head_templates", label: "Head templates", artifact: "heads", required: true },
  { id: "hairstyles", label: "Hairstyles", artifact: "hairstyles", required: true },
  { id: "hair_colors", label: "Hair colors", artifact: "hairColors", required: true },
  { id: "facial_hair", label: "Facial hair", artifact: "facialHair", required: true },
  { id: "facial_hair_colors", label: "Facial-hair colors", artifact: "facialHairColors", required: true },
  { id: "additional_attributes", label: "Additional attributes", artifact: "additionalAttributes", required: true },
  { id: "body_controls", label: "Body/context controls", artifact: "bodyControls", required: true },
  { id: "dependency_tests", label: "Dependency observations", artifact: "dependencyTests", required: true }
];

const productionForbiddenPattern = /PRODUCTION_VERIFIED|PRODUCTION_APPROVED|productionRecommendationsEnabled"\s*:\s*true/i;
const fixturePattern = /data\/fixtures\/test-only|fixtureOnly|testFixture|synthetic-test|TEST_FIXTURE/i;
const placeholderPattern = /REPLACE_WITH_|Head 34|NOT A VERIFIED GAME RECORD|College Football 26|CFB?26|CF26/i;

export function buildVerificationCandidateGate({
  root = repositoryRoot,
  generatedAt = deterministicGeneratedAt
} = {}) {
  const artifacts = loadArtifacts(root);
  const categorySummaries = buildCategorySummaries(artifacts);
  const checks = [];
  const blockers = [];
  const warnings = [];

  addCheck(checkArtifactPresence(artifacts, blockers));
  addCheck(checkProductionCatalogEmpty(artifacts, blockers));
  addCheck(checkPrimaryReviewStatus(artifacts, blockers));
  addCheck(checkCoverageAssignments(artifacts, blockers));
  addCheck(checkCategoryCompleteness(categorySummaries, blockers));
  addCheck(checkStableIDs(artifacts, blockers));
  addCheck(checkEvidenceIntegrity(artifacts, blockers));
  addCheck(checkMenuAndOrder(artifacts, blockers));
  addCheck(checkEnvironmentMetadata(artifacts, blockers));
  addCheck(checkDependencyEvidence(artifacts, blockers));
  addCheck(checkForbiddenContamination(artifacts, blockers));
  addCheck(checkVerifierQueue(artifacts, blockers, warnings));

  const readyForFreeze = blockers.length === 0;
  const releaseFiles = readyForFreeze ? buildCandidateReleaseFiles({ artifacts, categorySummaries, generatedAt }) : [];
  const report = {
    schemaVersion: CF27_VERIFICATION_CANDIDATE_SCHEMA_VERSION,
    candidateID: CF27_VERIFICATION_CANDIDATE_ID,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_VERIFICATION_CANDIDATE_GATE",
    sourceType: "shippingGameVideoResearch",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    completenessDecision: readyForFreeze ? "READY_TO_FREEZE_VERIFICATION_CANDIDATE" : "BLOCKED_NOT_READY_TO_FREEZE",
    releasePackageCreated: readyForFreeze,
    releasePackageLocation: readyForFreeze ? defaultCandidateDirectory : null,
    blockedPackageLocation: readyForFreeze ? null : defaultCandidateDirectory,
    summary: {
      candidateRecords: candidateRecordCount(artifacts),
      evidenceEntries: countArray(artifacts.evidenceManifest.value.entries),
      sourceVideos: countArray(artifacts.videoInventory.value.inventory),
      primaryApproved: numberValue(artifacts.primaryReview.value.summary?.primaryApproved),
      primaryApprovedWithNotes: numberValue(artifacts.primaryReview.value.summary?.primaryApprovedWithNotes),
      duplicateReviewRequired: numberValue(artifacts.primaryReview.value.summary?.duplicateReviewRequired),
      secondVerifiedRecords: numberValue(artifacts.primaryReview.value.summary?.secondVerified),
      productionApprovedRecords: numberValue(artifacts.primaryReview.value.summary?.productionApproved),
      productionCatalogRecords: productionRecordCount(artifacts.productionManifest.value),
      openCaptureAssignments: (artifacts.coverageControlCenter.value.captureAssignments ?? []).filter((assignment) => assignment.status !== "COMPLETE").length,
      blockerCount: blockers.length,
      warningCount: warnings.length
    },
    categorySummaries,
    checks,
    blockers,
    warnings,
    recaptureRequests: buildRecaptureRequests(artifacts),
    candidateFiles: releaseFiles.map((file) => ({
      fileName: file.fileName,
      contentType: file.contentType,
      sha256: file.sha256,
      sizeBytes: file.sizeBytes
    }))
  };

  return { report, releaseFiles };

  function addCheck(check) {
    checks.push(check);
  }
}

export function writeVerificationCandidateGate(gate, {
  root = repositoryRoot,
  candidateDirectory = defaultCandidateDirectory
} = {}) {
  const outputDirectory = path.resolve(root, candidateDirectory);
  const allowedRoot = path.resolve(root, "data/phase-zero/verification-candidates");
  if (!outputDirectory.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Refusing to write verification candidate outputs outside ${allowedRoot}: ${candidateDirectory}`);
  }
  fs.mkdirSync(outputDirectory, { recursive: true });

  if (gate.report.releasePackageCreated) {
    for (const file of gate.releaseFiles) fs.writeFileSync(path.join(outputDirectory, file.fileName), file.contentUtf8, "utf8");
  } else {
    fs.writeFileSync(path.join(outputDirectory, "candidate_validation_report.json"), `${JSON.stringify(gate.report, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(outputDirectory, "candidate_validation_report.csv"), formatValidationCSV(gate.report), "utf8");
    fs.writeFileSync(path.join(outputDirectory, "README.md"), formatBlockedReadme(gate.report), "utf8");
  }
}

export function checkVerificationCandidateGate(gate, {
  root = repositoryRoot,
  candidateDirectory = defaultCandidateDirectory
} = {}) {
  const outputDirectory = path.resolve(root, candidateDirectory);
  const reportPath = path.join(outputDirectory, "candidate_validation_report.json");
  if (!fs.existsSync(reportPath)) throw new Error(`Missing candidate validation report: ${reportPath}`);
  const currentReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const currentComparable = comparableReport(currentReport);
  const expectedComparable = comparableReport(gate.report);
  if (JSON.stringify(currentComparable) !== JSON.stringify(expectedComparable)) {
    throw new Error("Verification-candidate gate report is not current. Run npm run cf27:verification-candidate:v1.");
  }
  if (gate.report.releasePackageCreated) {
    const missing = requiredCandidateFiles.filter((fileName) => !fs.existsSync(path.join(outputDirectory, fileName)));
    if (missing.length > 0) throw new Error(`Verification-candidate package is missing required file(s): ${missing.join(", ")}`);
  }
}

function loadArtifacts(root) {
  return Object.fromEntries(Object.entries(sourceArtifacts).map(([key, relativePath]) => {
    const absolutePath = path.join(root, relativePath);
    return [key, {
      relativePath,
      exists: fs.existsSync(absolutePath),
      value: fs.existsSync(absolutePath) ? JSON.parse(fs.readFileSync(absolutePath, "utf8")) : null
    }];
  }));
}

function buildCategorySummaries(artifacts) {
  const coverageByID = new Map((artifacts.coverageControlCenter.value?.categoryCoverage ?? []).map((row) => [row.categoryID, row]));
  return categoryConfig.map((category) => {
    const artifact = artifacts[category.artifact]?.value ?? {};
    const records = recordsForArtifact(category.artifact, artifact);
    const coverage = coverageByID.get(category.id) ?? null;
    const nativeOrders = records.map((record) => record.nativeOrder ?? record.nativeOptionNumber ?? record.nativeOptionIndex).filter((value) => Number.isInteger(value));
    const duplicateOrders = duplicates(nativeOrders);
    const missingEvidence = records.filter((record) => !hasEvidenceReference(record)).map(recordID);
    const explicitReviewStatuses = records.filter((record) => hasText(record.primaryReviewStatus) || hasText(record.verificationStatus) || hasText(record.reviewStatus)).length;
    return {
      categoryID: category.id,
      category: category.label,
      required: category.required,
      recordCount: records.length,
      observedCandidateRecords: numberValue(coverage?.observedCandidateRecords, records.length),
      primaryReviewedRecords: numberValue(coverage?.primaryReviewedRecords),
      productionApprovedRecords: numberValue(coverage?.productionApprovedRecords),
      verifierReady: coverage?.verifierReady === true,
      beginningProof: coverage?.beginningProof === true,
      endingProof: coverage?.endingProof === true,
      productionReady: coverage?.productionReady === true,
      nativeOrderValues: nativeOrders,
      duplicateNativeOrders: duplicateOrders,
      missingEvidenceRecordIDs: missingEvidence,
      explicitReviewStatusRecords: explicitReviewStatuses,
      blocker: coverage?.blocker ?? categoryBlocker(category.artifact, artifact),
      status: coverage?.status ?? (records.length > 0 ? "OBSERVED_PENDING_REVIEW" : "MISSING_EVIDENCE")
    };
  });
}

function checkArtifactPresence(artifacts, blockers) {
  const missing = Object.values(artifacts).filter((artifact) => !artifact.exists).map((artifact) => artifact.relativePath);
  for (const file of missing) blockers.push(blocker("missingArtifact", file, `${file} is required for the verification-candidate gate.`));
  return check("artifactPresence", missing.length === 0, { missing });
}

function checkProductionCatalogEmpty(artifacts, blockers) {
  const count = productionRecordCount(artifacts.productionManifest.value);
  const enabled = artifacts.productionManifest.value?.productionRecommendationsEnabled === true || artifacts.coverageControlCenter.value?.productionRecommendationsEnabled === true;
  if (count !== 0) blockers.push(blocker("unexpectedProductionRecords", "data/catalog/production", `Production catalog contains ${count} record(s); this Phase 0 gate must not promote records.`));
  if (enabled) blockers.push(blocker("productionRecommendationsEnabled", "production gate", "Production recommendations are enabled before verification-candidate freeze."));
  return check("productionCatalogRemainsEmpty", count === 0 && !enabled, { productionRecords: count, productionRecommendationsEnabled: enabled });
}

function checkPrimaryReviewStatus(artifacts, blockers) {
  const summary = artifacts.primaryReview.value?.summary ?? {};
  const total = numberValue(summary.totalResearchCandidates);
  const reviewed = numberValue(summary.primaryApproved) + numberValue(summary.primaryApprovedWithNotes) + numberValue(summary.duplicateReviewRequired) + numberValue(summary.recaptureRequired) + numberValue(summary.missingEvidence) + numberValue(summary.labelUnresolved) + numberValue(summary.orderUnresolved) + numberValue(summary.categoryIncomplete) + numberValue(summary.environmentUnresolved);
  const duplicateReviewRequired = numberValue(summary.duplicateReviewRequired);
  if (total === 0) blockers.push(blocker("noResearchCandidates", "primary review", "No research candidates are available for the candidate package."));
  if (reviewed !== total) blockers.push(blocker("primaryReviewCountMismatch", "primary review", `Primary-review statuses cover ${reviewed} of ${total} research candidate(s).`));
  if (duplicateReviewRequired > 0) blockers.push(blocker("duplicateReviewUnresolved", "primary review", `${duplicateReviewRequired} candidate(s) still require duplicate or continuity review.`));
  return check("primaryReviewExplicitForEveryCandidate", total > 0 && reviewed === total && duplicateReviewRequired === 0, { total, reviewed, duplicateReviewRequired });
}

function checkCoverageAssignments(artifacts, blockers) {
  const open = (artifacts.coverageControlCenter.value?.captureAssignments ?? []).filter((assignment) => assignment.status !== "COMPLETE");
  for (const assignment of open) blockers.push(blocker("openCaptureAssignment", assignment.captureID, `${assignment.captureID}: ${assignment.category} / ${assignment.subcategory} remains ${assignment.status}.`));
  return check("captureAssignmentsComplete", open.length === 0, { openCaptureAssignments: open.map((assignment) => assignment.captureID) });
}

function checkCategoryCompleteness(categorySummaries, blockers) {
  const incomplete = [];
  for (const category of categorySummaries) {
    const categoryIsIncomplete = category.required && (
      category.recordCount === 0 ||
      category.status !== "READY_FOR_VERIFICATION_CANDIDATE" && category.productionReady !== true ||
      !category.beginningProof ||
      !category.endingProof ||
      category.duplicateNativeOrders.length > 0 ||
      category.missingEvidenceRecordIDs.length > 0
    );
    if (categoryIsIncomplete) {
      incomplete.push(category.categoryID);
      blockers.push(blocker("categoryIncomplete", category.categoryID, `${category.category} is not complete enough for v1 verification-candidate freeze: ${category.blocker}`));
    }
  }
  return check("categoryCompleteness", incomplete.length === 0, { incomplete });
}

function checkStableIDs(artifacts, blockers) {
  const records = allCandidateRecords(artifacts);
  const IDs = records.map(recordID).filter(hasText);
  const duplicateIDs = duplicates(IDs);
  const missingIDs = records.length - IDs.length;
  if (missingIDs > 0) blockers.push(blocker("missingStableID", "research catalogs", `${missingIDs} record(s) lack a stable research ID.`));
  for (const id of duplicateIDs) blockers.push(blocker("duplicateStableID", id, `${id} appears more than once in research candidate records.`));
  return check("stableIDUniqueness", missingIDs === 0 && duplicateIDs.length === 0, { records: records.length, missingIDs, duplicateIDs });
}

function checkEvidenceIntegrity(artifacts, blockers) {
  const entries = artifacts.evidenceManifest.value?.entries ?? [];
  const evidenceIDs = new Set(entries.map((entry) => entry.evidence_id ?? entry.evidenceID).filter(hasText));
  const missingHashes = entries.filter((entry) => !hasText(entry.sha256)).map((entry) => entry.evidence_id ?? entry.evidenceID ?? entry.relative_path);
  const absoluteOnly = entries.filter((entry) => hasText(entry.absolute_path) && !hasText(entry.relative_path)).map((entry) => entry.evidence_id ?? entry.evidenceID ?? entry.absolute_path);
  const candidateMissingEvidence = allCandidateRecords(artifacts).filter((record) => !candidateEvidenceIDs(record).some((id) => evidenceIDs.has(id))).map(recordID);
  for (const id of missingHashes) blockers.push(blocker("missingEvidenceHash", id, `${id} does not have a SHA-256 hash.`));
  for (const id of absoluteOnly) blockers.push(blocker("absoluteOnlyEvidencePath", id, `${id} has only an absolute evidence path.`));
  for (const id of candidateMissingEvidence) blockers.push(blocker("candidateEvidenceUnresolved", id, `${id} does not resolve to canonical evidence manifest IDs.`));
  return check("evidenceIntegrity", missingHashes.length === 0 && absoluteOnly.length === 0 && candidateMissingEvidence.length === 0, { entries: entries.length, missingHashes, absoluteOnly, candidateMissingEvidence });
}

function checkMenuAndOrder(artifacts, blockers) {
  const menuSummary = artifacts.menuMap.value?.summary ?? {};
  const headSummary = artifacts.heads.value?.summary ?? {};
  const additionalSummary = artifacts.additionalAttributes.value?.summary ?? {};
  const failures = [];
  if (numberValue(menuSummary.partialMenus) > 0) failures.push(`${menuSummary.partialMenus} partial menu(s)`);
  if (numberValue(menuSummary.recaptureRequiredMenus) > 0) failures.push(`${menuSummary.recaptureRequiredMenus} menu(s) require recapture`);
  if ((headSummary.skippedNumbersWithinObservedRange ?? []).length > 0) failures.push(`head skipped native numbers ${(headSummary.skippedNumbersWithinObservedRange ?? []).join(", ")}`);
  if (numberValue(headSummary.ambiguousRecordCount) > 0) failures.push(`${headSummary.ambiguousRecordCount} ambiguous head record(s)`);
  if ((additionalSummary.categoriesWithUnknownTotalCount ?? []).length > 0) failures.push(`unknown total counts: ${(additionalSummary.categoriesWithUnknownTotalCount ?? []).join(", ")}`);
  for (const failure of failures) blockers.push(blocker("menuOrderBoundaryIncomplete", "menu/order", failure));
  return check("menuOrderAndBoundaries", failures.length === 0, { failures });
}

function checkEnvironmentMetadata(artifacts, blockers) {
  const text = JSON.stringify(artifacts.environmentManifest.value ?? {}) + JSON.stringify(artifacts.creationPaths.value ?? {});
  const unresolved = ["UNKNOWN", "UNKNOWN_NOT_VISIBLE", "XBOXUNKNOWN", "null"].filter((token) => text.includes(token));
  if (unresolved.length > 0) blockers.push(blocker("environmentMetadataUnresolved", "environment", `Environment/version/path metadata still contains unresolved tokens: ${[...new Set(unresolved)].join(", ")}.`));
  return check("environmentMetadataResolved", unresolved.length === 0, { unresolved: [...new Set(unresolved)] });
}

function checkDependencyEvidence(artifacts, blockers) {
  const tests = artifacts.dependencyTests.value?.tests ?? [];
  const notRun = tests.filter((test) => test.executionStatus !== "EXECUTED" && test.result !== "PASS").map((test) => test.testID);
  if (notRun.length > 0) blockers.push(blocker("dependencyTestsNotExecuted", "dependency tests", `${notRun.length} dependency test(s) are not executed from controlled evidence.`));
  return check("dependencyEvidenceComplete", notRun.length === 0, { notRun });
}

function checkForbiddenContamination(artifacts, blockers) {
  const findings = [];
  for (const [key, artifact] of Object.entries(artifacts)) {
    const text = JSON.stringify(artifact.value ?? {});
    if (fixturePattern.test(text)) findings.push(`${key}:fixture`);
    if (placeholderPattern.test(text)) findings.push(`${key}:placeholderOrCF26`);
    if (productionForbiddenPattern.test(text) && key !== "productionManifest") findings.push(`${key}:productionClaim`);
  }
  for (const finding of findings) blockers.push(blocker("forbiddenContamination", finding, `${finding} was detected in candidate source artifacts.`));
  return check("noFixturePlaceholderOrCF26Contamination", findings.length === 0, { findings });
}

function checkVerifierQueue(artifacts, blockers, warnings) {
  const summary = artifacts.verifierQueue.value?.summary ?? {};
  const records = numberValue(summary.records);
  const ready = numberValue(summary.readyForEvidenceReview);
  const duplicate = numberValue(summary.duplicateOrContinuityReview);
  if (records === 0) blockers.push(blocker("emptyVerifierQueue", "verifier queue", "No verifier queue records exist."));
  if (duplicate > 0) warnings.push(issue("duplicateReviewInVerifierQueue", "verifier queue", `${duplicate} record(s) require duplicate or continuity review before full candidate freeze.`));
  return check("verifierQueuePresent", records > 0 && ready > 0, { records, readyForEvidenceReview: ready, duplicateOrContinuityReview: duplicate });
}

function buildCandidateReleaseFiles({ artifacts, categorySummaries, generatedAt }) {
  const payloads = {
    "environment_manifest.json": artifacts.environmentManifest.value,
    "creation_paths.json": artifacts.creationPaths.value,
    "menu_map.json": artifacts.menuMap.value,
    "heads.json": artifacts.heads.value,
    "hairstyles.json": artifacts.hairstyles.value,
    "hair_colors.json": artifacts.hairColors.value,
    "facial_hair.json": artifacts.facialHair.value,
    "facial_hair_colors.json": artifacts.facialHairColors.value,
    "additional_attributes.json": artifacts.additionalAttributes.value,
    "body_context_records.json": artifacts.bodyControls.value,
    "dependency_tests.json": artifacts.dependencyTests.value,
    "evidence_manifest.json": artifacts.evidenceManifest.value,
    "capture_log.json": artifacts.captureLog.value,
    "issue_log.json": artifacts.issuesRegister.value,
    "primary_review_results.json": artifacts.primaryReview.value,
    "duplicate_report.json": duplicateReport(artifacts),
    "verifier_queue.json": artifacts.verifierQueue.value,
    "candidate_manifest.json": candidateManifest({ artifacts, categorySummaries, generatedAt }),
    "candidate_validation_report.json": null,
    "release_notes.md": null,
    "README.md": null
  };
  const files = Object.entries(payloads).map(([fileName, payload]) => {
    const contentUtf8 = typeof payload === "string" ? payload : `${JSON.stringify(payload, null, 2)}\n`;
    return fileRecord(fileName, contentUtf8, fileName.endsWith(".md") ? "text/markdown; charset=utf-8" : "application/json; charset=utf-8");
  });
  const checksums = checksumManifest(files);
  files.push(fileRecord("checksums.json", `${JSON.stringify(checksums, null, 2)}\n`, "application/json; charset=utf-8"));
  return files.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

function candidateManifest({ artifacts, categorySummaries, generatedAt }) {
  return {
    schemaVersion: CF27_VERIFICATION_CANDIDATE_SCHEMA_VERSION,
    candidateID: CF27_VERIFICATION_CANDIDATE_ID,
    generatedAt,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PENDING_SECOND_VERIFICATION",
    productionRecommendationsEnabled: false,
    sourceArtifacts,
    summary: {
      candidateRecords: candidateRecordCount(artifacts),
      sourceVideos: countArray(artifacts.videoInventory.value?.inventory),
      evidenceEntries: countArray(artifacts.evidenceManifest.value?.entries)
    },
    categorySummaries
  };
}

function buildRecaptureRequests(artifacts) {
  return (artifacts.coverageControlCenter.value?.captureAssignments ?? [])
    .filter((assignment) => assignment.status !== "COMPLETE")
    .map((assignment) => ({
      captureID: assignment.captureID,
      priority: assignment.priority,
      category: assignment.category,
      objective: assignment.objective,
      exactStartScreen: assignment.exactStartScreen,
      exactActionSequence: assignment.exactActionSequence,
      filenamePattern: assignment.filenamePattern,
      acceptanceCriteria: assignment.acceptanceCriteria,
      recaptureTriggers: assignment.recaptureTriggers,
      owner: assignment.owner
    }));
}

function duplicateReport(artifacts) {
  return {
    sourceVideoDuplicates: artifacts.videoInventory.value?.inventory?.filter((video) => video.exactDuplicateOf) ?? [],
    primaryReviewDuplicateCandidates: artifacts.primaryReview.value?.candidates?.filter((candidate) => candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED") ?? [],
    headDuplicateObservations: artifacts.heads.value?.summary?.duplicateObservationNumbers ?? [],
    additionalAttributeDuplicateCategories: artifacts.additionalAttributes.value?.summary?.categoriesWithDuplicateObservations ?? []
  };
}

function recordsForArtifact(key, value) {
  if (!value) return [];
  if (key === "environmentManifest") return [value];
  if (key === "creationPaths") return value.creationPaths ?? [];
  if (key === "dependencyTests") return value.tests ?? [];
  return value.records ?? value.entries ?? value.inventory ?? [];
}

function allCandidateRecords(artifacts) {
  return [
    ...(artifacts.heads.value?.records ?? []),
    ...(artifacts.hairstyles.value?.records ?? []),
    ...(artifacts.hairColors.value?.records ?? []),
    ...(artifacts.facialHair.value?.records ?? []),
    ...(artifacts.facialHairColors.value?.records ?? []),
    ...(artifacts.additionalAttributes.value?.records ?? []),
    ...(artifacts.bodyControls.value?.records ?? [])
  ];
}

function candidateRecordCount(artifacts) {
  return allCandidateRecords(artifacts).length;
}

function productionRecordCount(manifest) {
  return (manifest?.items ?? manifest?.records ?? []).length;
}

function recordID(record) {
  return record?.stableResearchCatalogID ?? record?.stableResearchID ?? record?.stableInternalID ?? record?.catalogID ?? record?.testID ?? record?.environmentID ?? "unknown";
}

function candidateEvidenceIDs(record) {
  const observations = [
    ...(record?.sourceObservations ?? []),
    ...(record?.sourceEvidence ?? []),
    ...(record?.evidence ?? [])
  ];
  const direct = [
    record?.evidenceID,
    record?.sourceEvidenceID,
    record?.menuEvidenceID
  ];
  return [...direct, ...observations.flatMap((observation) => [observation.evidenceID, observation.evidence_id])].filter(hasText);
}

function hasEvidenceReference(record) {
  return candidateEvidenceIDs(record).length > 0 || hasText(record?.evidenceFramePath) || hasText(record?.sourceVideo);
}

function categoryBlocker(artifact, value) {
  return value?.summary?.blocker ?? value?.blocker ?? `${artifact} has no explicit completion blocker in the source artifact.`;
}

function duplicates(values) {
  const seen = new Set();
  const duplicate = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function check(name, passed, details = {}) {
  return { name, status: passed ? "PASS" : "BLOCKED", details };
}

function blocker(code, target, message) {
  return issue(code, target, message, "BLOCKER");
}

function issue(code, target, message, severity = "WARNING") {
  return { code, target, message, severity };
}

function fileRecord(fileName, contentUtf8, contentType) {
  return {
    fileName,
    contentType,
    contentUtf8,
    sha256: sha256(contentUtf8),
    sizeBytes: Buffer.byteLength(contentUtf8, "utf8")
  };
}

function checksumManifest(files) {
  return {
    schemaVersion: `${CF27_VERIFICATION_CANDIDATE_SCHEMA_VERSION}-checksums`,
    candidateID: CF27_VERIFICATION_CANDIDATE_ID,
    files: files.map((file) => ({
      fileName: file.fileName,
      sha256: file.sha256,
      sizeBytes: file.sizeBytes
    })).sort((a, b) => a.fileName.localeCompare(b.fileName))
  };
}

function formatValidationCSV(report) {
  const rows = [
    ["type", "code_or_name", "target", "status_or_severity", "message"],
    ...report.checks.map((check) => ["check", check.name, "", check.status, JSON.stringify(check.details)]),
    ...report.blockers.map((item) => ["blocker", item.code, item.target, item.severity, item.message]),
    ...report.warnings.map((item) => ["warning", item.code, item.target, item.severity, item.message])
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function formatBlockedReadme(report) {
  return `# ${report.candidateID}\n\n` +
    `Status: ${report.completenessDecision}\n\n` +
    `This directory contains the validation report for the proposed verification-candidate package. ` +
    `No immutable verification-candidate package was created because the current research catalog remains blocked.\n\n` +
    `## Summary\n\n` +
    `- Candidate records: ${report.summary.candidateRecords}\n` +
    `- Source videos: ${report.summary.sourceVideos}\n` +
    `- Evidence entries: ${report.summary.evidenceEntries}\n` +
    `- Open capture assignments: ${report.summary.openCaptureAssignments}\n` +
    `- Blockers: ${report.summary.blockerCount}\n` +
    `- Production catalog records: ${report.summary.productionCatalogRecords}\n\n` +
    `## Highest Priority Recaptures\n\n` +
    report.recaptureRequests.slice(0, 5).map((request, index) => `${index + 1}. ${request.captureID}: ${request.objective}`).join("\n") +
    `\n`;
}

function comparableReport(report) {
  return {
    candidateID: report.candidateID,
    completenessDecision: report.completenessDecision,
    releasePackageCreated: report.releasePackageCreated,
    summary: report.summary,
    categorySummaries: report.categorySummaries,
    checks: report.checks,
    blockers: report.blockers,
    warnings: report.warnings,
    recaptureRequests: report.recaptureRequests
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function numberValue(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const args = new Set(process.argv.slice(2));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const gate = buildVerificationCandidateGate();
  if (args.has("--check")) {
    checkVerificationCandidateGate(gate);
    console.log(`${CF27_VERIFICATION_CANDIDATE_ID} gate is current: ${gate.report.completenessDecision} (${gate.report.summary.blockerCount} blocker(s)).`);
  } else {
    writeVerificationCandidateGate(gate);
    console.log(`${CF27_VERIFICATION_CANDIDATE_ID} gate wrote ${gate.report.releasePackageCreated ? "release package" : "blocked validation report"} (${gate.report.summary.blockerCount} blocker(s)).`);
  }
  if (args.has("--require-ready") && !gate.report.releasePackageCreated) {
    console.error(`${CF27_VERIFICATION_CANDIDATE_ID} is not ready to freeze.`);
    process.exitCode = 1;
  }
}
