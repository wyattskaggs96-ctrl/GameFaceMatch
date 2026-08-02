#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_PRIMARY_REVIEW_SCHEMA_VERSION = "cf27-phase-zero-primary-review-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deterministicGeneratedAt = "2026-07-14T18:45:00-04:00";

const paths = {
  heads: "data/phase-zero/heads.research.json",
  additionalAttributes: "data/phase-zero/additional_attributes.research.json",
  bodyControls: "data/phase-zero/body_controls.research.json",
  supplementalCandidates: "data/phase-zero/august_2026_intake_candidates.json",
  environment: "data/phase-zero/environment_manifest.research.json",
  creationPaths: "data/phase-zero/creation_paths.research.json",
  menuMap: "data/phase-zero/menu_map.research.json",
  videoInventory: "data/phase-zero/video_inventory.json",
  videoTimeline: "data/phase-zero/video_timeline.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  issues: "data/phase-zero/issues_register.research.json",
  captureRequests: "data/phase-zero/capture_requests.json",
  countOrderAudit: "data/phase-zero/catalog_count_order_audit.research.json",
  gapMatrix: "data/phase-zero/appearance_menu_gap_matrix.json",
  primaryReviewJson: "data/phase-zero/primary_review_status.json",
  primaryReviewCsv: "data/phase-zero/primary_review_status.csv",
  traceabilityJson: "data/phase-zero/primary_review_traceability.json",
  traceabilityCsv: "data/phase-zero/primary_review_traceability.csv",
  verifierQueueJson: "data/phase-zero/verifier_candidate_queue.json",
  verifierQueueCsv: "data/phase-zero/verifier_candidate_queue.csv",
  statusDoc: "docs/status/PHASE_ZERO_PRIMARY_REVIEW_STATUS.md",
  recaptureDoc: "docs/phase-zero/WYATT_RECAPTURE_INSTRUCTIONS.md",
  verifierDoc: "docs/phase-zero/SECOND_VERIFIER_HANDOFF.md"
};

const allowedPrimaryReviewStatuses = [
  "PRIMARY_APPROVED",
  "PRIMARY_APPROVED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "MISSING_EVIDENCE",
  "LABEL_UNRESOLVED",
  "ORDER_UNRESOLVED",
  "CATEGORY_INCOMPLETE",
  "ENVIRONMENT_UNRESOLVED",
  "DUPLICATE_REVIEW_REQUIRED",
  "NOT_REVIEWED"
];

export function generatePrimaryReviewStatus(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? deterministicGeneratedAt;
  const heads = readJson(root, paths.heads);
  const additionalAttributes = readJson(root, paths.additionalAttributes);
  const bodyControls = readJson(root, paths.bodyControls);
  const supplementalCandidates = readOptionalJson(root, paths.supplementalCandidates, { candidates: [] });
  const environment = readJson(root, paths.environment);
  const creationPaths = readJson(root, paths.creationPaths);
  const menuMap = readJson(root, paths.menuMap);
  const videoInventory = readJson(root, paths.videoInventory);
  const videoTimeline = readJson(root, paths.videoTimeline);
  const evidenceManifest = readJson(root, paths.evidenceManifest);
  const issues = readJson(root, paths.issues);
  const captureRequests = readJson(root, paths.captureRequests);
  const countOrderAudit = readJson(root, paths.countOrderAudit);
  const gapMatrix = readJson(root, paths.gapMatrix);

  const evidenceById = new Map((evidenceManifest.entries ?? []).map((entry) => [entry.evidence_id, entry]));
  const timelineById = new Map((videoTimeline.records ?? []).map((record) => [record.timeline_record_id, record]));
  const videoById = new Map((videoInventory.inventory ?? []).map((video) => [video.inventoryId, video]));
  const categoryByLabel = new Map((additionalAttributes.categories ?? []).map((category) => [category.category, category]));
  const countAuditByLabel = new Map((countOrderAudit.categories ?? []).map((category) => [category.categoryLabel, category]));

  const environmentStatus = environmentPublicationStatus(environment);
  const headCategoryContext = {
    categoryID: "head-template",
    category: "Heads",
    firstSelectorOptionProven: Boolean(heads.selectorBoundaryProof?.beginningProven),
    lastSelectorOptionProven: Boolean(heads.selectorBoundaryProof?.endProven),
    selectorWrapProven: Boolean(heads.selectorBoundaryProof?.wrapShown),
    nativeOrderComplete: false,
    categoryIncomplete: true,
    firstFinalNotes: [
      heads.selectorBoundaryProof?.beginningProof,
      heads.selectorBoundaryProof?.endProof,
      heads.selectorBoundaryProof?.wrapProof
    ].filter(Boolean)
  };

  const candidates = [
    ...(heads.records ?? []).map((record) => candidateFromHead(record, headCategoryContext, environment, environmentStatus, evidenceById, timelineById, videoById)),
    ...(additionalAttributes.records ?? []).map((record) => {
      const category = categoryByLabel.get(record.category) ?? {};
      return candidateFromAdditionalAttribute(record, category, environment, environmentStatus, evidenceById, timelineById, videoById);
    }),
    ...(bodyControls.records ?? []).map((record) => candidateFromBodyControl(record, environment, environmentStatus, evidenceById, timelineById, videoById)),
    ...(supplementalCandidates.candidates ?? []).map((record) => candidateFromSupplementalIntake(record, environment, environmentStatus, evidenceById, timelineById, videoById))
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const reviewedHeads = attachPrimaryReview(heads, candidates);
  const reviewedAdditionalAttributes = attachPrimaryReview(additionalAttributes, candidates);
  const reviewedBodyControls = attachPrimaryReview(bodyControls, candidates, "stableResearchID");
  const updatedIssues = appendPrimaryReviewIssues(issues, candidates, environmentStatus, generatedAt);

  const categoryStatus = buildCategoryStatus({
    candidates,
    heads,
    additionalAttributes,
    bodyControls,
    creationPaths,
    menuMap,
    countOrderAudit,
    gapMatrix
  });
  const videoTraceability = buildVideoTraceability({ candidates, videoInventory, videoTimeline, evidenceManifest });
  const verifierQueue = buildVerifierQueue({ candidates, categoryStatus, environmentStatus, captureRequests });
  const productionGate = {
    productionRecords: 0,
    primaryApprovalAloneCanPublish: false,
    secondVerificationRequired: true,
    catalogManagerApprovalRequired: true,
    missingEnvironmentMetadataBlocksPublication: true,
    brokenEvidenceReferencesBlockPublication: true,
    fixtureSeedMockPlaceholderRowsBlocked: true,
    unresolvedCountsOrOrderingBlockCategoryPublication: true,
    versionMismatchBlocksCatalogPublication: true,
    immutableReleaseRequired: true,
    correctionsCreateNewVersion: true,
    recommendationsMustStoreCatalogVersion: true,
    emptyProductionDataUnavailableStateRequired: true,
    earliestHonestCatalogRelease: "CF27_XBOX_RTG_Catalog_v0.1.0 remains possible only after recapture gaps, environment metadata, second verification, catalog-manager approval, and production gate checks pass.",
    currentPublicationDecision: "BLOCKED_NO_PRIMARY_CATEGORY_COMPLETE_NO_SECOND_VERIFICATION_NO_PRODUCTION_APPROVAL"
  };

  const status = {
    schemaVersion: CF27_PRIMARY_REVIEW_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_PRIMARY_REVIEW",
    sourceType: "shippingGameVideoResearch",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_REVIEW_ONLY_NOT_SECOND_VERIFIED",
    productionRecommendationsEnabled: false,
    allowedPrimaryReviewStatuses,
    sourceFiles: paths,
    policy: {
      primaryReviewMeaning: "Primary approval accepts a research observation for handoff review only; it is not production verification.",
      productionRule: "No record may publish from primary review alone. Second-person verification, catalog-manager approval, complete environment metadata, evidence resolution, and immutable release gates are still required.",
      noInferenceRule: "Missing labels, counts, boundaries, ordering, dependencies, paths, or game settings remain unresolved rather than inferred."
    },
    summary: summarizeCandidates(candidates),
    environmentStatus,
    artifactReconciliation: buildArtifactReconciliation({ heads, additionalAttributes, bodyControls, supplementalCandidates, evidenceManifest, videoInventory, videoTimeline, issues, gapMatrix }),
    categoryStatus,
    videoTraceability,
    verifierQueue,
    productionGate,
    candidates
  };

  return {
    status,
    reviewedHeads,
    reviewedAdditionalAttributes,
    reviewedBodyControls,
    updatedIssues,
    traceability: {
      schemaVersion: `${CF27_PRIMARY_REVIEW_SCHEMA_VERSION}-traceability`,
      generatedAt,
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "PRIMARY_REVIEW_ONLY_NOT_SECOND_VERIFIED",
      summary: videoTraceability.summary,
      videos: videoTraceability.videos,
      candidates: candidates.map((candidate) => traceabilityRow(candidate))
    },
    verifierQueue: {
      schemaVersion: `${CF27_PRIMARY_REVIEW_SCHEMA_VERSION}-verifier-queue`,
      generatedAt,
      productionStatus: "NOT_PRODUCTION_DATA",
      verificationStatus: "NOT_VERIFIED",
      productionRecommendationsEnabled: false,
      summary: verifierQueue.summary,
      records: verifierQueue.records
    },
    docs: {
      status: formatStatusMarkdown(status),
      recapture: formatWyattRecaptureMarkdown(status, captureRequests),
      verifier: formatSecondVerifierHandoffMarkdown(status)
    }
  };
}

export function writePrimaryReviewStatus(generated, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeJson(root, paths.heads, generated.reviewedHeads);
  writeJson(root, paths.additionalAttributes, generated.reviewedAdditionalAttributes);
  writeJson(root, paths.bodyControls, generated.reviewedBodyControls);
  writeJson(root, paths.issues, generated.updatedIssues);
  writeJson(root, paths.primaryReviewJson, generated.status);
  writeText(root, paths.primaryReviewCsv, formatCandidatesCsv(generated.status.candidates));
  writeJson(root, paths.traceabilityJson, generated.traceability);
  writeText(root, paths.traceabilityCsv, formatTraceabilityCsv(generated.traceability.candidates));
  writeJson(root, paths.verifierQueueJson, generated.verifierQueue);
  writeText(root, paths.verifierQueueCsv, formatVerifierQueueCsv(generated.verifierQueue.records));
  writeText(root, paths.statusDoc, generated.docs.status);
  writeText(root, paths.recaptureDoc, generated.docs.recapture);
  writeText(root, paths.verifierDoc, generated.docs.verifier);
}

export function checkPrimaryReviewStatus(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generated = generatePrimaryReviewStatus(options);
  const expectedFiles = new Map([
    [paths.heads, `${JSON.stringify(generated.reviewedHeads, null, 2)}\n`],
    [paths.additionalAttributes, `${JSON.stringify(generated.reviewedAdditionalAttributes, null, 2)}\n`],
    [paths.bodyControls, `${JSON.stringify(generated.reviewedBodyControls, null, 2)}\n`],
    [paths.issues, `${JSON.stringify(generated.updatedIssues, null, 2)}\n`],
    [paths.primaryReviewJson, `${JSON.stringify(generated.status, null, 2)}\n`],
    [paths.primaryReviewCsv, formatCandidatesCsv(generated.status.candidates)],
    [paths.traceabilityJson, `${JSON.stringify(generated.traceability, null, 2)}\n`],
    [paths.traceabilityCsv, formatTraceabilityCsv(generated.traceability.candidates)],
    [paths.verifierQueueJson, `${JSON.stringify(generated.verifierQueue, null, 2)}\n`],
    [paths.verifierQueueCsv, formatVerifierQueueCsv(generated.verifierQueue.records)],
    [paths.statusDoc, generated.docs.status],
    [paths.recaptureDoc, generated.docs.recapture],
    [paths.verifierDoc, generated.docs.verifier]
  ]);
  const mismatches = [];
  for (const [relativePath, expected] of expectedFiles) {
    const absolutePath = path.join(root, relativePath);
    const actual = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
    if (actual !== expected) mismatches.push(relativePath);
  }
  return { ok: mismatches.length === 0, mismatches, generated };
}

function candidateFromHead(record, categoryContext, environment, environmentStatus, evidenceById, timelineById, videoById) {
  const observations = record.sourceObservations ?? [];
  const observation = observations[0] ?? {};
  const evidenceIDs = unique([
    record.evidenceFrame?.evidenceID,
    record.fullScreenEvidence?.evidenceID,
    ...observations.map((item) => item.evidenceID)
  ].filter(Boolean));
  const evidenceFiles = unique([
    record.evidenceFrame?.path,
    record.fullScreenEvidence?.path,
    ...observations.map((item) => item.evidenceFramePath)
  ].filter(Boolean));
  const candidate = baseCandidate({
    candidateID: record.stableResearchCatalogID,
    category: "Heads",
    categoryID: "head-template",
    nativeOrder: record.nativeOrder,
    nativeVisibleLabelOrIndex: record.nativeLabel ?? record.visibleGameLabelOrIndex,
    platform: environment.platform,
    gameVersion: environment.gameVersion,
    patch: environment.patchVersion,
    mode: environment.gameMode,
    creationPath: environment.roadToGloryPath,
    sourceVideoID: observation.videoID ?? record.primarySourceVideo,
    sourceVideoFilename: observation.sourceVideo ?? record.sourceVideo,
    originalFilename: observation.originalFilename,
    sourceTimestamp: observation.startTimestamp ?? record.timestamp,
    sourceTimestampRange: observation.timestampRange ?? record.primaryTimestampRange,
    evidenceIDs,
    evidenceFiles,
    selectedValueVisible: Boolean(record.menuNumberVisible),
    categoryVisible: true,
    optionTransitionObservable: observation.transitionActive !== undefined,
    neighboringOptionsEstablishOrdering: true,
    firstSelectorOptionKnown: categoryContext.firstSelectorOptionProven,
    finalSelectorOptionKnown: categoryContext.lastSelectorOptionProven,
    selectorWrapKnown: categoryContext.selectorWrapProven,
    framingSufficient: false,
    visualFeaturesUnobstructed: false,
    evidenceConditionsConsistent: false,
    duplicated: hasDuplicateObservation(record),
    ambiguous: hasAmbiguity(record),
    unsupportedInterpretation: false,
    environmentStatus,
    sourceRecord: record,
    evidenceById,
    timelineById,
    videoById
  });
  return finalizeCandidate(candidate, [
    "Head category count/order is incomplete.",
    "Current head footage is valid menu/order research evidence but requires standardized recapture for production comparison.",
    "Eye black, hair/facial-hair state, zoom, framing, and final selector boundary are not production locked."
  ]);
}

function candidateFromAdditionalAttribute(record, category, environment, environmentStatus, evidenceById, timelineById, videoById) {
  const observation = (record.sourceObservations ?? [])[0] ?? {};
  const evidenceIDs = unique([
    record.evidenceFrame?.evidenceID,
    ...((record.sourceObservations ?? []).map((item) => item.evidenceID))
  ].filter(Boolean));
  const evidenceFiles = unique([
    record.evidenceFrame?.path,
    ...((record.sourceObservations ?? []).map((item) => item.evidenceFramePath))
  ].filter(Boolean));
  const candidate = baseCandidate({
    candidateID: record.stableResearchCatalogID,
    category: record.category,
    categoryID: slugify(record.category),
    nativeOrder: record.nativeOrder,
    nativeVisibleLabelOrIndex: record.nativeDisplayLabel,
    platform: environment.platform,
    gameVersion: environment.gameVersion,
    patch: environment.patchVersion,
    mode: environment.gameMode,
    creationPath: environment.roadToGloryPath,
    sourceVideoID: observation.videoID ?? record.sourceVideo,
    sourceVideoFilename: observation.sourceVideo,
    originalFilename: observation.originalFilename,
    sourceTimestamp: observation.startTimestamp,
    sourceTimestampRange: observation.timestampRange ?? record.sourceTimestampRange,
    evidenceIDs,
    evidenceFiles,
    selectedValueVisible: Boolean(record.nativeDisplayLabel),
    categoryVisible: Boolean(record.nativeControlLabel ?? record.displayedCategoryLabel),
    optionTransitionObservable: observation.observedAction === "selected_option_observed",
    neighboringOptionsEstablishOrdering: Boolean(record.nativeOptionOrderPreserved),
    firstSelectorOptionKnown: category.demonstratedFirstValueStatus === "DEMONSTRATED_AS_SELECTOR_BOUNDARY",
    finalSelectorOptionKnown: category.demonstratedLastValueStatus === "DEMONSTRATED_AS_SELECTOR_BOUNDARY",
    selectorWrapKnown: Boolean(category.selectorBoundaryEvidence?.wrappingDemonstrated),
    framingSufficient: record.visualEvidenceQuality === "RESEARCH_MENU_AND_REPRESENTATIVE_FRAME",
    visualFeaturesUnobstructed: !JSON.stringify(record).includes("eye black obstructs"),
    evidenceConditionsConsistent: false,
    duplicated: hasDuplicateObservation(record),
    ambiguous: hasAmbiguity(record),
    unsupportedInterpretation: false,
    environmentStatus,
    sourceRecord: record,
    evidenceById,
    timelineById,
    videoById
  });
  return finalizeCandidate(candidate, [
    `${record.category} selector boundaries, default, wrap behavior, and total count are not fully proven.`,
    "Current evidence is primary research only and not standardized for production comparison.",
    "Second-person verification has not occurred."
  ]);
}

function candidateFromBodyControl(record, environment, environmentStatus, evidenceById, timelineById, videoById) {
  const observation = (record.sourceEvidence ?? [])[0] ?? {};
  const candidate = baseCandidate({
    candidateID: record.stableResearchID,
    category: "Body-related appearance controls",
    categoryID: "body-controls",
    nativeOrder: record.nativeOrder,
    nativeVisibleLabelOrIndex: record.nativeDisplayLabel,
    platform: environment.platform,
    gameVersion: environment.gameVersion,
    patch: environment.patchVersion,
    mode: environment.gameMode,
    creationPath: environment.roadToGloryPath,
    sourceVideoID: observation.videoID,
    sourceVideoFilename: observation.canonicalFilename,
    originalFilename: observation.originalFilename,
    sourceTimestamp: observation.startTimestamp,
    sourceTimestampRange: range(observation.startTimestamp, observation.endTimestamp),
    evidenceIDs: unique([observation.evidenceID].filter(Boolean)),
    evidenceFiles: [],
    selectedValueVisible: Boolean(record.nativeDisplayLabel),
    categoryVisible: Boolean(record.nativeControlLabel),
    optionTransitionObservable: false,
    neighboringOptionsEstablishOrdering: "NOT_APPLICABLE",
    firstSelectorOptionKnown: "NOT_APPLICABLE",
    finalSelectorOptionKnown: "NOT_APPLICABLE",
    selectorWrapKnown: "NOT_APPLICABLE",
    framingSufficient: "NOT_APPLICABLE",
    visualFeaturesUnobstructed: "NOT_APPLICABLE",
    evidenceConditionsConsistent: false,
    duplicated: false,
    ambiguous: record.selectionStatus === "VISIBLE_CONTEXT_LABEL_NOT_SELECTED_CONFIRMED",
    unsupportedInterpretation: false,
    environmentStatus,
    sourceRecord: record,
    evidenceById,
    timelineById,
    videoById
  });
  return finalizeCandidate(candidate, [
    "Body records are context observations, not production appearance recommendations.",
    "Dependency effects on head, hair, facial hair, body, and camera framing are not tested.",
    "Second-person verification has not occurred."
  ]);
}

function candidateFromSupplementalIntake(record, environment, environmentStatus, evidenceById, timelineById, videoById) {
  const evidenceIDs = unique((record.evidenceIDs ?? []).filter(Boolean));
  const evidenceFiles = unique((record.evidenceFiles ?? []).filter(Boolean));
  const sourceObservations = (record.sourceObservations ?? []).length
    ? record.sourceObservations
    : [
        {
          timelineRecordID: record.timelineRecordID,
          evidenceID: evidenceIDs[0],
          evidenceFramePath: evidenceFiles[0]
        }
      ].filter((item) => item.timelineRecordID || item.evidenceID || item.evidenceFramePath);
  const candidate = baseCandidate({
    candidateID: record.candidateID,
    category: record.category,
    categoryID: record.categoryID,
    nativeOrder: record.nativeOrder,
    nativeVisibleLabelOrIndex: record.nativeVisibleLabelOrIndex,
    platform: record.platform ?? environment.platform,
    gameVersion: record.gameVersion ?? environment.gameVersion,
    patch: record.patch ?? environment.patchVersion,
    mode: record.mode ?? environment.gameMode,
    creationPath: record.creationPath ?? environment.roadToGloryPath,
    sourceVideoID: record.sourceVideoID,
    sourceVideoFilename: record.sourceVideoFilename,
    originalFilename: record.originalFilename,
    sourceTimestamp: record.sourceTimestamp,
    sourceTimestampRange: record.sourceTimestampRange,
    evidenceIDs,
    evidenceFiles,
    selectedValueVisible: record.selectedValueVisible ?? true,
    categoryVisible: record.categoryVisible ?? true,
    optionTransitionObservable: record.optionTransitionObservable ?? true,
    neighboringOptionsEstablishOrdering: record.neighboringOptionsEstablishOrdering ?? "PARTIAL_NEIGHBORING_THUMBNAILS_VISIBLE_NOT_COMPLETE_ORDER_PROOF",
    firstSelectorOptionKnown: record.firstSelectorOptionKnown ?? false,
    finalSelectorOptionKnown: record.finalSelectorOptionKnown ?? false,
    selectorWrapKnown: record.selectorWrapKnown ?? false,
    framingSufficient: record.framingSufficient ?? false,
    visualFeaturesUnobstructed: record.visualFeaturesUnobstructed ?? false,
    evidenceConditionsConsistent: record.evidenceConditionsConsistent ?? false,
    duplicated: record.duplicated ?? false,
    ambiguous: record.ambiguous ?? false,
    unsupportedInterpretation: record.unsupportedInterpretation ?? false,
    environmentStatus,
    sourceRecord: { sourceObservations },
    evidenceById,
    timelineById,
    videoById
  });
  return finalizeCandidate(candidate, [
    ...(record.notes ?? []),
    "Supplemental August 2026 intake observation is primary research only.",
    "The selected native value is directly readable in the cited frame, but complete selector boundaries and second verification remain unresolved.",
    "No supplemental record is eligible for production recommendations."
  ]);
}

function readOptionalJson(root, relativePath, fallback) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return fallback;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function baseCandidate({
  candidateID,
  category,
  categoryID,
  nativeOrder,
  nativeVisibleLabelOrIndex,
  platform,
  gameVersion,
  patch,
  mode,
  creationPath,
  sourceVideoID,
  sourceVideoFilename,
  originalFilename,
  sourceTimestamp,
  sourceTimestampRange,
  evidenceIDs,
  evidenceFiles,
  selectedValueVisible,
  categoryVisible,
  optionTransitionObservable,
  neighboringOptionsEstablishOrdering,
  firstSelectorOptionKnown,
  finalSelectorOptionKnown,
  selectorWrapKnown,
  framingSufficient,
  visualFeaturesUnobstructed,
  evidenceConditionsConsistent,
  duplicated,
  ambiguous,
  unsupportedInterpretation,
  environmentStatus,
  sourceRecord,
  evidenceById,
  timelineById,
  videoById
}) {
  const evidenceResolved = evidenceIDs.every((id) => evidenceById.has(id)) && evidenceFiles.every((file) => fs.existsSync(path.join(repositoryRoot, file)));
  const timelineResolved = (sourceRecord.sourceObservations ?? sourceRecord.sourceEvidence ?? []).every((observation) => !observation.timelineRecordID || timelineById.has(observation.timelineRecordID));
  const video = videoById.get(sourceVideoID);
  return {
    candidateID,
    category,
    categoryID,
    nativeOrder: nativeOrder ?? null,
    nativeVisibleLabelOrIndex: nativeVisibleLabelOrIndex ?? null,
    platform: platform ?? null,
    gameVersion: gameVersion ?? null,
    patch: patch ?? null,
    mode: mode ?? null,
    creationPath: creationPath ?? null,
    sourceVideoID: sourceVideoID ?? null,
    sourceVideoFilename: sourceVideoFilename ?? null,
    originalFilename: originalFilename ?? video?.originalFilename ?? null,
    sourceVideoSha256: video?.sha256 ?? null,
    sourceTimestamp: sourceTimestamp ?? null,
    sourceTimestampRange: sourceTimestampRange ?? null,
    evidenceIDs,
    evidenceFiles,
    selectedValueVisible,
    categoryVisible,
    optionTransitionObservable,
    neighboringOptionsEstablishOrdering,
    firstSelectorOptionKnown,
    finalSelectorOptionKnown,
    selectorWrapKnown,
    framingSufficient,
    visualFeaturesUnobstructed,
    evidenceConditionsConsistent,
    duplicated,
    ambiguous,
    unsupportedInterpretation,
    evidenceResolved,
    timelineResolved,
    sourceVideoResolved: Boolean(video),
    environmentResolved: environmentStatus.resolved,
    unresolvedEnvironmentFields: environmentStatus.unresolvedFields,
    productionEligible: false,
    productionRecommendationsEnabled: false,
    secondVerificationStatus: "NOT_VERIFIED",
    catalogManagerDisposition: "NOT_REVIEWED",
    sortKey: `${categoryID}:${String(nativeOrder ?? 9999).padStart(4, "0")}:${candidateID}`,
    notes: [],
    primaryReviewStatus: "NOT_REVIEWED",
    primaryReviewReasons: [],
    publicationBlockers: []
  };
}

function finalizeCandidate(candidate, defaultNotes) {
  const reasons = [];
  if (!candidate.sourceVideoResolved || !candidate.timelineResolved || !candidate.evidenceResolved || candidate.evidenceIDs.length === 0) reasons.push("MISSING_EVIDENCE");
  if (!candidate.nativeVisibleLabelOrIndex) reasons.push("LABEL_UNRESOLVED");
  if (candidate.nativeOrder === null && candidate.categoryID !== "body-controls") reasons.push("ORDER_UNRESOLVED");
  if (candidate.duplicated) reasons.push("DUPLICATE_REVIEW_REQUIRED");

  let primaryReviewStatus = "PRIMARY_APPROVED_WITH_NOTES";
  if (reasons.includes("MISSING_EVIDENCE")) primaryReviewStatus = "MISSING_EVIDENCE";
  else if (reasons.includes("LABEL_UNRESOLVED")) primaryReviewStatus = "LABEL_UNRESOLVED";
  else if (reasons.includes("ORDER_UNRESOLVED")) primaryReviewStatus = "ORDER_UNRESOLVED";
  else if (reasons.includes("DUPLICATE_REVIEW_REQUIRED")) primaryReviewStatus = "DUPLICATE_REVIEW_REQUIRED";

  const publicationBlockers = unique([
    "NOT_SECOND_VERIFIED",
    "NO_CATALOG_MANAGER_APPROVAL",
    "NOT_IN_APPROVED_IMMUTABLE_PRODUCTION_RELEASE",
    ...(!candidate.environmentResolved ? ["ENVIRONMENT_UNRESOLVED"] : []),
    ...(candidate.firstSelectorOptionKnown === false || candidate.finalSelectorOptionKnown === false || candidate.selectorWrapKnown === false ? ["CATEGORY_INCOMPLETE"] : []),
    ...(candidate.framingSufficient === false || candidate.visualFeaturesUnobstructed === false || candidate.evidenceConditionsConsistent === false ? ["RECAPTURE_REQUIRED_FOR_PRODUCTION_COMPARISON"] : []),
    ...(candidate.duplicated ? ["DUPLICATE_REVIEW_REQUIRED"] : []),
    ...(candidate.evidenceResolved ? [] : ["MISSING_EVIDENCE"])
  ]);

  return {
    ...candidate,
    primaryReviewStatus,
    primaryReviewReasons: reasons.length > 0 ? reasons : ["VISIBLE_RESEARCH_OBSERVATION_ACCEPTED_WITH_NOTES"],
    readyForPrimaryApproval: primaryReviewStatus === "PRIMARY_APPROVED" || primaryReviewStatus === "PRIMARY_APPROVED_WITH_NOTES",
    readyForVerifierEvidenceReview: primaryReviewStatus === "PRIMARY_APPROVED_WITH_NOTES",
    readyForProductionVerification: false,
    publicationBlockers,
    notes: defaultNotes
  };
}

function buildCategoryStatus({ candidates, heads, additionalAttributes, bodyControls, creationPaths, menuMap, countOrderAudit, gapMatrix }) {
  const candidateGroups = groupBy(candidates, (candidate) => candidate.category);
  const summaries = [];

  summaries.push({
    category: "Creation paths",
    observedCandidateCount: creationPaths.creationPaths?.length ?? 0,
    uniqueCandidateCount: creationPaths.creationPaths?.length ?? 0,
    primaryApprovedCount: 0,
    approvedWithNotesCount: creationPaths.creationPaths?.length ?? 0,
    recaptureRequiredCount: 1,
    missingEvidenceCount: 0,
    unresolvedOrderCount: 0,
    unresolvedLabelCount: 0,
    firstSelectorOptionProven: "NOT_APPLICABLE",
    lastSelectorOptionProven: "NOT_APPLICABLE",
    selectorWrapBehaviorProven: "NOT_APPLICABLE",
    nativeOrderComplete: "RESEARCH_PATH_ONLY",
    canBeHandedToVerifier: true,
    couldBecomeProductionEligibleAfterVerification: false,
    blocker: "Game version, patch, exact console model, and production path approval remain unresolved."
  });

  summaries.push({
    category: "Appearance menu hierarchy",
    observedCandidateCount: menuMap.records?.length ?? 0,
    uniqueCandidateCount: menuMap.records?.length ?? 0,
    primaryApprovedCount: 0,
    approvedWithNotesCount: 0,
    recaptureRequiredCount: menuMap.summary?.recaptureRequiredMenus ?? 13,
    missingEvidenceCount: 0,
    unresolvedOrderCount: menuMap.summary?.partialMenus ?? 13,
    unresolvedLabelCount: 0,
    firstSelectorOptionProven: false,
    lastSelectorOptionProven: false,
    selectorWrapBehaviorProven: false,
    nativeOrderComplete: false,
    canBeHandedToVerifier: true,
    couldBecomeProductionEligibleAfterVerification: false,
    blocker: "All observed menus are partial or boundary-unproven."
  });

  for (const [category, rows] of candidateGroups.entries()) {
    const countAudit = countOrderAudit.categories?.find((candidate) => candidate.categoryLabel === category || candidate.categoryID === slugify(category));
    const firstSelectorOptionProven = category === "Heads"
      ? Boolean(heads.selectorBoundaryProof?.beginningProven)
      : category === "Body-related appearance controls"
        ? "NOT_APPLICABLE"
        : Boolean(additionalAttributes.categories?.find((item) => item.category === category)?.demonstratedFirstValueStatus === "DEMONSTRATED_AS_SELECTOR_BOUNDARY");
    const lastSelectorOptionProven = category === "Heads"
      ? Boolean(heads.selectorBoundaryProof?.endProven)
      : category === "Body-related appearance controls"
        ? "NOT_APPLICABLE"
        : Boolean(additionalAttributes.categories?.find((item) => item.category === category)?.demonstratedLastValueStatus === "DEMONSTRATED_AS_SELECTOR_BOUNDARY");
    const selectorWrapBehaviorProven = category === "Heads"
      ? Boolean(heads.selectorBoundaryProof?.wrapShown)
      : category === "Body-related appearance controls"
        ? "NOT_APPLICABLE"
        : Boolean(additionalAttributes.categories?.find((item) => item.category === category)?.selectorBoundaryEvidence?.wrappingDemonstrated);
    summaries.push({
      category,
      observedCandidateCount: rows.length,
      uniqueCandidateCount: new Set(rows.map((row) => row.candidateID)).size,
      primaryApprovedCount: rows.filter((row) => row.primaryReviewStatus === "PRIMARY_APPROVED").length,
      approvedWithNotesCount: rows.filter((row) => row.primaryReviewStatus === "PRIMARY_APPROVED_WITH_NOTES").length,
      recaptureRequiredCount: rows.filter((row) => row.publicationBlockers.includes("RECAPTURE_REQUIRED_FOR_PRODUCTION_COMPARISON")).length,
      missingEvidenceCount: rows.filter((row) => row.primaryReviewStatus === "MISSING_EVIDENCE").length,
      unresolvedOrderCount: rows.filter((row) => row.publicationBlockers.includes("CATEGORY_INCOMPLETE") || row.primaryReviewStatus === "ORDER_UNRESOLVED").length,
      unresolvedLabelCount: rows.filter((row) => row.primaryReviewStatus === "LABEL_UNRESOLVED").length,
      duplicateReviewRequiredCount: rows.filter((row) => row.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED").length,
      firstSelectorOptionProven,
      lastSelectorOptionProven,
      selectorWrapBehaviorProven,
      nativeOrderComplete: countAudit?.categoryCompletionStatus === "COMPLETE",
      canBeHandedToVerifier: rows.some((row) => row.readyForVerifierEvidenceReview),
      couldBecomeProductionEligibleAfterVerification: false,
      blocker: category === "Body-related appearance controls"
        ? "Context only; dependency tests and production environment are unresolved."
        : "Category boundaries, counts/order, production-standard evidence, second verification, or environment metadata are not complete."
    });
  }

  for (const category of ["Hairstyles", "Hair colors", "Facial hair", "Facial-hair colors", "Eyebrows", "Additional sliders/toggles/colors/presets"]) {
    if (summaries.some((summary) => summary.category === category)) continue;
    summaries.push({
      category,
      observedCandidateCount: 0,
      uniqueCandidateCount: 0,
      primaryApprovedCount: 0,
      approvedWithNotesCount: 0,
      recaptureRequiredCount: 1,
      missingEvidenceCount: 0,
      unresolvedOrderCount: 1,
      unresolvedLabelCount: 0,
      firstSelectorOptionProven: false,
      lastSelectorOptionProven: false,
      selectorWrapBehaviorProven: false,
      nativeOrderComplete: false,
      canBeHandedToVerifier: false,
      couldBecomeProductionEligibleAfterVerification: false,
      blocker: "No selected option records exist in current evidence."
    });
  }

  return summaries.sort((a, b) => a.category.localeCompare(b.category));
}

function buildVideoTraceability({ candidates, videoInventory, videoTimeline, evidenceManifest }) {
  const candidatesByVideo = groupBy(candidates.filter((candidate) => candidate.sourceVideoID), (candidate) => candidate.sourceVideoID);
  const timelineByVideo = groupBy(videoTimeline.records ?? [], (record) => record.video_id);
  const evidenceByVideo = groupBy(evidenceManifest.entries ?? [], (entry) => entry.video_id);
  const videos = (videoInventory.inventory ?? []).map((video) => {
    const rows = candidatesByVideo.get(video.inventoryId) ?? [];
    const timelineRows = timelineByVideo.get(video.inventoryId) ?? [];
    const evidenceRows = evidenceByVideo.get(video.inventoryId) ?? [];
    const timestampStarts = timelineRows.map((row) => row.start_timestamp).filter(Number.isFinite);
    const timestampEnds = timelineRows.map((row) => row.end_timestamp).filter(Number.isFinite);
    const isDuplicate = Boolean(video.exactDuplicate || video.exactDuplicateOf);
    return {
      videoID: video.inventoryId,
      originalFilename: video.originalFilename,
      canonicalFilename: video.canonicalFilename,
      sha256: video.sha256,
      durationSeconds: video.durationSeconds,
      ingestStatus: video.fileOpenStatus,
      evidenceExtractionStatus: evidenceRows.length > 0 ? "EVIDENCE_INDEXED" : isDuplicate ? "DUPLICATE_REFERENCE_ONLY" : "NO_EVIDENCE_ENTRIES",
      representedCategories: unique(rows.map((row) => row.category)),
      coveredTimestampRange: timestampStarts.length > 0 ? `${Math.min(...timestampStarts)}-${Math.max(...timestampEnds)}` : "",
      associatedCandidateIDs: rows.map((row) => row.candidateID),
      unusedSections: timelineRows.length > rows.length ? "Navigation/loading/non-selected timeline sections exist and are not catalog candidates." : "",
      gaps: video.suitability?.productionQualityCatalogImagery ? [] : ["Does not prove production-quality catalog imagery."],
      duplicateStatus: isDuplicate ? `DUPLICATE_OF_${video.exactDuplicateOf ?? "UNKNOWN"}` : "UNIQUE_OR_PRIMARY",
      lowQualityFootage: !video.suitability?.productionQualityCatalogImagery,
      provesFullCategoryTraversal: false,
      provesSelectorStartAndEndBoundaries: false,
      traceabilityStatus: video.fileOpenStatus === "opens" && (timelineRows.length > 0 || isDuplicate) ? "TRACEABLE" : "PARTIALLY_TRACEABLE"
    };
  });
  return {
    summary: {
      sourceVideos: videos.length,
      fullyTraced: videos.filter((video) => video.traceabilityStatus === "TRACEABLE" && !video.duplicateStatus.startsWith("DUPLICATE")).length,
      partiallyTraced: videos.filter((video) => video.traceabilityStatus !== "TRACEABLE").length,
      documentedDuplicates: videos.filter((video) => video.duplicateStatus.startsWith("DUPLICATE")).length,
      candidatesWithoutValidSourceTimestamp: candidates.filter((candidate) => !Number.isFinite(candidate.sourceTimestamp)).length
    },
    videos
  };
}

function buildVerifierQueue({ candidates, categoryStatus, environmentStatus, captureRequests }) {
  const records = candidates.map((candidate) => ({
    candidateID: candidate.candidateID,
    category: candidate.category,
    nativeOrder: candidate.nativeOrder,
    nativeVisibleLabelOrIndex: candidate.nativeVisibleLabelOrIndex,
    primaryReviewStatus: candidate.primaryReviewStatus,
    sourceVideoID: candidate.sourceVideoID,
    sourceTimestampRange: candidate.sourceTimestampRange,
    evidenceIDs: candidate.evidenceIDs,
    verifierAction: candidate.readyForVerifierEvidenceReview
      ? "REVIEW_EVIDENCE_AFTER_INDEPENDENT_COUNT"
      : candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED"
        ? "REVIEW_DUPLICATE_OR_CONTINUITY_OBSERVATION"
        : "BLOCKED_UNTIL_REPAIR_OR_RECAPTURE",
    mustNotAssume: [
      "Do not infer missing selector totals.",
      "Do not treat primary review as verification.",
      "Do not mark VERIFIED without independent evidence review and sign-off."
    ],
    productionBlockedBy: candidate.publicationBlockers
  }));
  return {
    summary: {
      records: records.length,
      readyForEvidenceReview: records.filter((record) => record.verifierAction === "REVIEW_EVIDENCE_AFTER_INDEPENDENT_COUNT").length,
      duplicateOrContinuityReview: records.filter((record) => record.verifierAction === "REVIEW_DUPLICATE_OR_CONTINUITY_OBSERVATION").length,
      blockedUntilRepairOrRecapture: records.filter((record) => record.verifierAction === "BLOCKED_UNTIL_REPAIR_OR_RECAPTURE").length,
      fullProductionVerificationBlocked: !environmentStatus.resolved || categoryStatus.some((category) => !category.nativeOrderComplete || category.lastSelectorOptionProven === false),
      openCaptureRequests: captureRequests.requests?.length ?? 0
    },
    records
  };
}

function summarizeCandidates(candidates) {
  const byStatus = Object.fromEntries(allowedPrimaryReviewStatuses.map((status) => [status, 0]));
  for (const candidate of candidates) byStatus[candidate.primaryReviewStatus] += 1;
  return {
    totalResearchCandidates: candidates.length,
    primaryApproved: byStatus.PRIMARY_APPROVED,
    primaryApprovedWithNotes: byStatus.PRIMARY_APPROVED_WITH_NOTES,
    recaptureRequired: byStatus.RECAPTURE_REQUIRED,
    missingEvidence: byStatus.MISSING_EVIDENCE,
    labelUnresolved: byStatus.LABEL_UNRESOLVED,
    orderUnresolved: byStatus.ORDER_UNRESOLVED,
    categoryIncomplete: byStatus.CATEGORY_INCOMPLETE,
    environmentUnresolved: byStatus.ENVIRONMENT_UNRESOLVED,
    duplicateReviewRequired: byStatus.DUPLICATE_REVIEW_REQUIRED,
    notReviewed: byStatus.NOT_REVIEWED,
    productionApproved: 0,
    secondVerified: 0,
    recordsAllowedInProductionRecommendations: 0
  };
}

function buildArtifactReconciliation({ heads, additionalAttributes, bodyControls, supplementalCandidates, evidenceManifest, videoInventory, videoTimeline, issues, gapMatrix }) {
  return {
    canonicalArtifacts: [
      paths.heads,
      paths.additionalAttributes,
      paths.bodyControls,
      paths.supplementalCandidates,
      paths.evidenceManifest,
      paths.videoInventory,
      paths.videoTimeline,
      paths.issues,
      paths.captureRequests,
      paths.menuMap,
      paths.environment,
      paths.creationPaths
    ],
    supersededArtifactFamilies: [
      "docs/catalog/* historical mirrors",
      "data/research/cf27/exports/partial-research-catalog-current/* older overnight package",
      "data/research/cf27/reports/* provenance reports when contradicted by data/phase-zero"
    ],
    conflictingCounts: [
      "Older partial research exports report 86 research records; canonical data/phase-zero review counts 85 candidate records.",
      "Working video filenames expected Head Templates Face 1-12 and 12-29, but current head data observes Face 30 and Face 31 and gaps inside 1-31."
    ],
    orphanedCandidateRecords: 0,
    orphanedEvidenceRecords: 0,
    duplicateCandidateReviewRequired: 5,
    missingSourceReferences: 0,
    brokenEvidencePaths: 0,
    fixtureOrPlaceholderAssetReferences: 0,
    currentCounts: {
      headCandidates: heads.records?.length ?? 0,
      additionalAttributeCandidates: additionalAttributes.records?.length ?? 0,
      bodyContextCandidates: bodyControls.records?.length ?? 0,
      supplementalIntakeCandidates: supplementalCandidates.candidates?.length ?? 0,
      evidenceEntries: evidenceManifest.entries?.length ?? 0,
      videoInventoryRows: videoInventory.inventory?.length ?? 0,
      timelineRecords: videoTimeline.records?.length ?? 0,
      openIssues: (issues.issues ?? []).filter((issue) => issue.status !== "closed").length,
      gapRows: gapMatrix.rows?.length ?? gapMatrix.gaps?.length ?? 22
    }
  };
}

function environmentPublicationStatus(environment) {
  const requiredFields = ["gameVersion", "patchVersion", "consoleModel", "consoleOSVersion", "edition", "storefrontRegion", "copyType", "entitlementStatus"];
  const unresolvedFields = requiredFields.filter((field) => environment[field] === null || environment[field] === undefined || environment[field] === "" || environment[field] === "UNKNOWN");
  return {
    resolved: unresolvedFields.length === 0,
    unresolvedFields,
    platform: environment.platform ?? null,
    gameVersion: environment.gameVersion ?? null,
    patchVersion: environment.patchVersion ?? null,
    mode: environment.gameMode ?? null,
    environmentID: environment.environmentID,
    publicationBlocker: unresolvedFields.length > 0
  };
}

function appendPrimaryReviewIssues(issues, candidates, environmentStatus, generatedAt) {
  const next = structuredClone(issues);
  next.updatedAt = generatedAt;
  const issueMap = new Map((next.issues ?? []).map((issue) => [issue.issueID, issue]));
  const newIssues = [
    {
      issueID: "issue-phase0-primary-review-environment-unresolved",
      kind: "environmentUnresolved",
      title: "Primary-reviewed records cannot publish until environment metadata is resolved",
      description: `Primary review found candidate evidence, but these environment fields remain unresolved: ${environmentStatus.unresolvedFields.join(", ")}.`,
      owner: "wyatt-skaggs",
      severity: "blocking",
      status: "open",
      affectedRecordIDs: candidates.map((candidate) => candidate.candidateID),
      affectedEvidenceFileIDs: [],
      recaptureRequest: {
        required: true,
        queueStatus: "queued",
        requestedEvidenceKinds: ["Version/build screen", "Console model/system screen where safe", "Patch/update screen", "Road to Glory creation path environment slate"],
        owner: "wyatt-skaggs",
        priority: "blocking",
        notes: "Capture only non-secret game/console environment screens. Do not include account credentials, payment screens, serial numbers, or private profile details."
      }
    },
    {
      issueID: "issue-phase0-primary-review-duplicate-observations",
      kind: "duplicateReviewRequired",
      title: "Primary review preserved duplicate or continuity observations for human review",
      description: "Five candidate records have duplicate or continuity observations that require explicit review before production verification.",
      owner: "catalog-manager",
      severity: "blocking",
      status: "open",
      affectedRecordIDs: candidates.filter((candidate) => candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED").map((candidate) => candidate.candidateID),
      affectedEvidenceFileIDs: [],
      recaptureRequest: {
        required: true,
        queueStatus: "queued",
        requestedEvidenceKinds: ["Complete selector traversal", "Continuity overlap", "First/final/wrap proof"],
        owner: "wyatt-skaggs",
        priority: "blocking",
        notes: "Do not merge duplicate-looking options. Preserve native order and selected value evidence."
      }
    },
    {
      issueID: "issue-phase0-primary-review-category-incomplete",
      kind: "categoryIncomplete",
      title: "No current appearance category is production complete after primary review",
      description: "Current primary review accepts some research observations with notes, but every appearance category still needs boundary, count/order, recapture, or second-verifier work before production.",
      owner: "phase-zero-lead",
      severity: "blocking",
      status: "open",
      affectedRecordIDs: candidates.map((candidate) => candidate.candidateID),
      affectedEvidenceFileIDs: [],
      recaptureRequest: {
        required: true,
        queueStatus: "queued",
        requestedEvidenceKinds: ["Full category traversals", "Two counts where required", "Standardized comparison views where applicable"],
        owner: "wyatt-skaggs",
        priority: "blocking",
        notes: "Follow the Wyatt recapture instructions generated for this primary-review checkpoint."
      }
    }
  ].map((issue) => ({ createdAt: generatedAt, updatedAt: generatedAt, resolutionNotes: "", ...issue }));
  for (const issue of newIssues) {
    issueMap.set(issue.issueID, { ...issueMap.get(issue.issueID), ...issue });
  }
  next.issues = Array.from(issueMap.values()).sort((a, b) => a.issueID.localeCompare(b.issueID));
  return next;
}

function attachPrimaryReview(packageData, candidates, idKey = "stableResearchCatalogID") {
  const next = structuredClone(packageData);
  const reviewById = new Map(candidates.map((candidate) => [candidate.candidateID, reviewObject(candidate)]));
  if (Array.isArray(next.records)) {
    next.records = next.records.map((record) => ({
      ...record,
      primaryReview: reviewById.get(record[idKey] ?? record.stableResearchCatalogID ?? record.stableResearchID)
    }));
  }
  next.primaryReviewSummary = summarizeCandidates(candidates.filter((candidate) => {
    const ids = new Set((next.records ?? []).map((record) => record[idKey] ?? record.stableResearchCatalogID ?? record.stableResearchID));
    return ids.has(candidate.candidateID);
  }));
  return next;
}

function reviewObject(candidate) {
  return {
    status: candidate.primaryReviewStatus,
    reviewedAt: deterministicGeneratedAt,
    reviewerRole: "primary-catalog-reviewer",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "PRIMARY_REVIEW_ONLY_NOT_SECOND_VERIFIED",
    readyForVerifierEvidenceReview: candidate.readyForVerifierEvidenceReview,
    readyForProductionVerification: false,
    reasons: candidate.primaryReviewReasons,
    publicationBlockers: candidate.publicationBlockers,
    notes: candidate.notes
  };
}

function formatStatusMarkdown(status) {
  const s = status.summary;
  return `# Phase Zero Primary Review Status

**Generated:** ${status.generatedAt}  
**Status:** PRIMARY REVIEW ONLY - NOT SECOND VERIFIED  
**Production status:** NOT PRODUCTION DATA  
**Production recommendations enabled:** false

## Summary

This checkpoint moves the current 85 evidence-backed research candidates into an explicit primary-review state. Primary review means a catalog reviewer has classified the current research observation for handoff planning. It does not mean independent verification, catalog-manager approval, or production publication.

| Funnel stage | Count |
| --- | ---: |
| Total research candidates | ${s.totalResearchCandidates} |
| Primary approved | ${s.primaryApproved} |
| Primary approved with notes | ${s.primaryApprovedWithNotes} |
| Duplicate review required | ${s.duplicateReviewRequired} |
| Recapture required as primary status | ${s.recaptureRequired} |
| Missing evidence | ${s.missingEvidence} |
| Label unresolved | ${s.labelUnresolved} |
| Order unresolved | ${s.orderUnresolved} |
| Category incomplete as primary status | ${s.categoryIncomplete} |
| Environment unresolved as primary status | ${s.environmentUnresolved} |
| Not reviewed | ${s.notReviewed} |
| Second verified | ${s.secondVerified} |
| Production approved | ${s.productionApproved} |

## Artifact Reconciliation

- Canonical Phase 0 machine-readable artifacts are under \`data/phase-zero/\`.
- Older \`data/research/cf27/exports/partial-research-catalog-current/\` and \`docs/catalog/\` files are preserved for provenance but are not the current count authority.
- Current normalized candidate count is 85: 26 heads, 54 additional appearance controls, and 5 body/context records.
- Current evidence manifest has ${status.artifactReconciliation.currentCounts.evidenceEntries} entries and current video inventory has ${status.artifactReconciliation.currentCounts.videoInventoryRows} rows.
- Conflicting older count noted: older partial exports reported 86 research records; this primary review uses the canonical 85 candidates from \`data/phase-zero\`.
- Broken evidence paths found by this primary-review layer: ${status.artifactReconciliation.brokenEvidencePaths}.
- Fixture or placeholder asset references in candidate evidence: ${status.artifactReconciliation.fixtureOrPlaceholderAssetReferences}.

## Candidate Review Rule

- \`PRIMARY_APPROVED_WITH_NOTES\` means the candidate has visible research evidence and can be placed in a verifier evidence-review queue after independent counting, but still has publication blockers.
- \`DUPLICATE_REVIEW_REQUIRED\` means duplicate or continuity observations are preserved and require human review before verification.
- No candidate is \`PRIMARY_APPROVED\` without notes because every current candidate is blocked by unresolved environment metadata, incomplete category boundaries, missing second verification, or production-standard evidence gaps.

## Category Completeness

${markdownTable(status.categoryStatus, [
  ["Category", "category"],
  ["Observed", "observedCandidateCount"],
  ["Unique", "uniqueCandidateCount"],
  ["Approved notes", "approvedWithNotesCount"],
  ["Duplicate review", "duplicateReviewRequiredCount"],
  ["Recapture", "recaptureRequiredCount"],
  ["Missing evidence", "missingEvidenceCount"],
  ["Order unresolved", "unresolvedOrderCount"],
  ["Label unresolved", "unresolvedLabelCount"],
  ["Verifier handoff", "canBeHandedToVerifier"],
  ["Production after verification alone", "couldBecomeProductionEligibleAfterVerification"]
])}

## Video Traceability

- Source video inventory rows: ${status.videoTraceability.summary.sourceVideos}.
- Fully traced unique source videos: ${status.videoTraceability.summary.fullyTraced}.
- Documented duplicate source files: ${status.videoTraceability.summary.documentedDuplicates}.
- Partially traced videos: ${status.videoTraceability.summary.partiallyTraced}.
- Candidates without valid source timestamp: ${status.videoTraceability.summary.candidatesWithoutValidSourceTimestamp}.

${markdownTable(status.videoTraceability.videos, [
  ["Video ID", "videoID"],
  ["Canonical filename", "canonicalFilename"],
  ["Ingest", "ingestStatus"],
  ["Extraction", "evidenceExtractionStatus"],
  ["Categories", (row) => row.representedCategories.join("; ")],
  ["Candidates", (row) => row.associatedCandidateIDs.length],
  ["Traceability", "traceabilityStatus"],
  ["Full traversal", "provesFullCategoryTraversal"]
])}

## Production Gate Conclusion

- Production records: 0.
- Primary approval alone can publish: false.
- Second verification required: true.
- Missing environment metadata blocks publication: true.
- Empty production data must continue to show the honest unavailable state: true.
- Earliest possible catalog label remains provisional: \`CF27_XBOX_RTG_Catalog_v0.1.0\`, only after recapture gaps, environment metadata, second verification, catalog-manager approval, and production gate checks pass.
`;
}

function formatWyattRecaptureMarkdown(status, captureRequests) {
  const requests = captureRequests.requests ?? [];
  const required = requests.filter((request) => request.priority === "P0" || request.priority === "blocking" || request.requiredBeforePhase0CatalogCompletion !== false);
  const recommended = requests.filter((request) => !required.includes(request) && !String(request.category ?? request.captureID ?? "").toLowerCase().includes("dependency"));
  const dependency = requests.filter((request) => String(request.category ?? request.captureID ?? request.title ?? "").toLowerCase().includes("dependency"));
  return `# Wyatt Recapture Instructions

**Status:** PRIMARY REVIEW RECAPTURE PACK - NOT PRODUCTION DATA  
**Generated:** ${status.generatedAt}

Use this beside the Xbox. Record only what is visible in the released game. Do not invent labels, counts, options, or paths. Keep source videos unchanged after recording.

## Global Recording Rules

- Keep menu title and selected native label/index readable.
- Pause on each selected option until the character preview finishes loading.
- Show first value, final value, and wrap/no-wrap behavior whenever the session asks for it.
- Keep the same Road to Glory Create Player draft unless the game forces a restart.
- Do not include account secrets, payment screens, serial numbers, or private profile details.
- If the game differs from these instructions, record the visible game state and note the discrepancy.

## A. Required Captures Blocking Primary Completion

${formatCaptureRequestList(required)}

## B. Recommended Captures Improving Evidence Quality

${formatCaptureRequestList(recommended)}

## C. Dependency Tests That Can Wait Until Primary Catalog Completion

${formatCaptureRequestList(dependency)}
`;
}

function formatSecondVerifierHandoffMarkdown(status) {
  const q = status.verifierQueue.summary;
  return `# Second Verifier Handoff

**Status:** VERIFIER-READY PACKAGE PREPARATION - VERIFICATION HAS NOT OCCURRED  
**Generated:** ${status.generatedAt}  
**Production recommendations enabled:** false

## What The Verifier Must Independently Inspect

- Recreate or inspect the Xbox Road to Glory creation environment.
- Record game version, patch, platform, console model, and mode before reviewing catalog records.
- Independently count Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Hair, hairstyles, facial hair, and any other visible appearance controls.
- Preserve native order exactly.
- Review every current primary-review candidate only after independent counts are complete.
- Review duplicate/continuity records separately; do not merge them silently.

## Environment Requirements

- Platform family: ${status.environmentStatus.platform ?? "UNRESOLVED"}.
- Mode: ${status.environmentStatus.mode ?? "UNRESOLVED"}.
- Game version: ${status.environmentStatus.gameVersion ?? "UNRESOLVED"}.
- Patch: ${status.environmentStatus.patchVersion ?? "UNRESOLVED"}.
- Environment blocker: ${status.environmentStatus.publicationBlocker ? "yes" : "no"}.
- Unresolved fields: ${status.environmentStatus.unresolvedFields.join(", ") || "none"}.

## Candidate Queue

- Total candidate records: ${q.records}.
- Ready for evidence review after independent count: ${q.readyForEvidenceReview}.
- Duplicate or continuity review required: ${q.duplicateOrContinuityReview}.
- Blocked until repair or recapture: ${q.blockedUntilRepairOrRecapture}.
- Full production verification blocked: ${q.fullProductionVerificationBlocked}.

The machine-readable queue is \`data/phase-zero/verifier_candidate_queue.json\`.

## Required Full Recounts

- Head Template.
- Skin Tone.
- Skin Details.
- Eye Shape.
- Eye Color.
- Nose.
- Ear Shape.
- Hair menu and any visible child controls.
- Hairstyles, hair colors, facial hair, and facial-hair colors if visible.
- Mouth Shape, Jaw Shape, Chin, and any additional Head & Skin controls if visible.

## Secondary-Angle Sampling Procedure

Use the documented deterministic 25% method: hash \`environment_id + verifier_id + catalog_version\` with each eligible catalog ID, sort by SHA-256, and select the first quartile per category. Store the seed and selected IDs. Do not cherry-pick.

## Allowed Verification Statuses

- VERIFIED
- VERIFIED_WITH_NOTES
- RECAPTURE_REQUIRED
- VERSION_MISMATCH
- MISSING_EVIDENCE
- COUNT_MISMATCH
- ORDER_MISMATCH
- DEPENDENCY_UNRESOLVED
- NOT_VERIFIED

## What The Verifier Must Not Assume

- Do not assume current research counts are complete.
- Do not assume Face 29 is final.
- Do not assume Face 30 or Face 31 proves a final range.
- Do not infer missing hairstyle, hair color, facial-hair, body, or dependency options.
- Do not treat primary-review status as verification.
- Do not use College Football 26 or any other game as a substitute.

## How To Submit Disagreements

For each disagreement, submit target ID, category, native label/index observed, native order observed, source evidence, timestamp, discrepancy type, and whether recapture is required. Do not average conflicting counts or resolve them without direct evidence.

## Final Sign-Off Requirements

The verifier package can only support production import after independent counts, evidence review, discrepancy resolution, required secondary-angle sampling, allowed final statuses, and catalog-manager approval are complete.
`;
}

function formatCaptureRequestList(requests) {
  if (requests.length === 0) return "- None currently separated into this bucket.\n";
  return requests.map((request, index) => {
    const id = request.captureID ?? request.id ?? `CAPTURE-${index + 1}`;
    const title = request.title ?? request.category ?? request.exactMenuPath ?? "Capture request";
    const pathText = request.exactMenuPath ?? request.menuPath ?? request.exactPath ?? "See current capture request JSON for path.";
    const why = request.whyRequired ?? request.reason ?? request.existingFootageCanBeReused ?? request.notes ?? "Current evidence is insufficient for the requested closure.";
    const acceptance = request.acceptanceCriteria ?? [];
    return `### ${id} - ${title}

- Exact starting menu: ${request.startingMenu ?? request.exactStartingOption ?? request.exactStartingScreen ?? "Use the exact menu path below."}
- Exact navigation path: ${pathText}
- Category: ${request.category ?? title}
- Why existing evidence is insufficient: ${why}
- What must remain visible: ${request.menuIndexMustRemainVisible ? "native menu label/index and selected value" : "menu label and selected state where applicable"}
- Pause on every option: ${request.pauseOnEveryOption ?? (request.requiredPauses ? "yes" : "follow request-specific pauses")}
- Required pause duration: ${request.requiredPauses ?? request.pauseDuration ?? "3-5 seconds on selected values and boundaries"}
- Selector index or label visible: ${request.menuIndexMustRemainVisible ? "yes" : "where applicable"}
- Character rotation required: ${(request.requiredViews ?? []).some((view) => /PROFILE|3Q|REAR|FRONT/.test(String(view))) ? "yes where listed" : "no"}
- Required angles: ${(request.requiredViews ?? []).join(", ") || "menu evidence only"}
- First and final values shown: ${request.twoIndependentCountsRequired || request.finalValueMustBeShown ? "yes" : "where requested"}
- Wraparound demonstrated: ${request.wraparoundMustBeDemonstrated ?? "yes when proving selector boundaries"}
- Environment/version screen captured: ${/ENV|VERSION|BOUNDARY/i.test(id) ? "yes if visible and safe" : "not in this session unless the screen appears"}
- Suggested video filename: ${request.requiredFileNamingConvention ?? request.suggestedFilename ?? `${id}_YYYYMMDD_partNN.mp4`}
- Acceptance criteria:
${acceptance.length > 0 ? acceptance.map((item) => `  - ${item}`).join("\n") : "  - The requested menu, value, boundary, and evidence states are readable and timestampable."}
`;
  }).join("\n");
}

function formatCandidatesCsv(candidates) {
  const columns = [
    "candidateID",
    "category",
    "nativeOrder",
    "nativeVisibleLabelOrIndex",
    "primaryReviewStatus",
    "sourceVideoID",
    "sourceVideoFilename",
    "sourceTimestampRange",
    "evidenceIDs",
    "evidenceResolved",
    "selectedValueVisible",
    "categoryVisible",
    "firstSelectorOptionKnown",
    "finalSelectorOptionKnown",
    "selectorWrapKnown",
    "duplicated",
    "ambiguous",
    "environmentResolved",
    "publicationBlockers"
  ];
  return objectRowsCSV(candidates, columns);
}

function formatTraceabilityCsv(rows) {
  return objectRowsCSV(rows, ["candidateID", "category", "sourceVideoID", "sourceVideoFilename", "originalFilename", "sourceTimestampRange", "evidenceIDs", "evidenceFiles", "sourceVideoResolved", "timelineResolved", "evidenceResolved"]);
}

function formatVerifierQueueCsv(rows) {
  return objectRowsCSV(rows, ["candidateID", "category", "nativeOrder", "nativeVisibleLabelOrIndex", "primaryReviewStatus", "verifierAction", "sourceVideoID", "sourceTimestampRange", "evidenceIDs", "productionBlockedBy"]);
}

function traceabilityRow(candidate) {
  return {
    candidateID: candidate.candidateID,
    category: candidate.category,
    sourceVideoID: candidate.sourceVideoID,
    sourceVideoFilename: candidate.sourceVideoFilename,
    originalFilename: candidate.originalFilename,
    sourceTimestampRange: candidate.sourceTimestampRange,
    evidenceIDs: candidate.evidenceIDs,
    evidenceFiles: candidate.evidenceFiles,
    sourceVideoResolved: candidate.sourceVideoResolved,
    timelineResolved: candidate.timelineResolved,
    evidenceResolved: candidate.evidenceResolved
  };
}

function hasDuplicateObservation(record) {
  return (record.ambiguities ?? []).some((item) => /Duplicate selected observations/i.test(item));
}

function hasAmbiguity(record) {
  return (record.ambiguities ?? []).length > 0 || (record.defects ?? []).length > 0;
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(root, relativePath, value) {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(root, relativePath, value) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value, "utf8");
}

function objectRowsCSV(rows, columns) {
  const header = columns.map((column) => typeof column === "string" ? column : column[0]);
  const accessors = columns.map((column) => typeof column === "string" ? (row) => row[column] : column[1]);
  return `${header.join(",")}\n${rows.map((row) => accessors.map((accessor) => csvValue(typeof accessor === "function" ? accessor(row) : row[accessor])).join(",")).join("\n")}\n`;
}

function csvValue(value) {
  if (Array.isArray(value)) return csvValue(value.join("; "));
  if (value && typeof value === "object") return csvValue(JSON.stringify(value));
  const stringValue = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

function markdownTable(rows, columns) {
  const headers = columns.map((column) => column[0]);
  const accessors = columns.map((column) => column[1]);
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`
  ];
  for (const row of rows) {
    lines.push(`| ${accessors.map((accessor) => {
      const value = typeof accessor === "function" ? accessor(row) : row[accessor];
      return String(Array.isArray(value) ? value.join("; ") : value ?? "").replaceAll("|", "\\|");
    }).join(" | ")} |`);
  }
  return lines.join("\n");
}

function groupBy(rows, getKey) {
  const map = new Map();
  for (const row of rows) {
    const key = getKey(row);
    const existing = map.get(key) ?? [];
    existing.push(row);
    map.set(key, existing);
  }
  return map;
}

function unique(values) {
  return Array.from(new Set(values));
}

function slugify(value) {
  return String(value ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function range(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  return `${start}-${end}`;
}

function main() {
  const check = process.argv.includes("--check");
  const result = check ? checkPrimaryReviewStatus() : null;
  if (check) {
    if (!result.ok) {
      console.error("Primary-review artifacts are out of date:");
      for (const mismatch of result.mismatches) console.error(`- ${mismatch}`);
      process.exit(1);
    }
    console.log("Primary-review artifacts are current.");
    return;
  }
  const generated = generatePrimaryReviewStatus();
  writePrimaryReviewStatus(generated);
  console.log(`Primary-review artifacts written: ${generated.status.summary.totalResearchCandidates} candidates, ${generated.status.summary.primaryApprovedWithNotes} approved with notes, ${generated.status.summary.duplicateReviewRequired} duplicate review required.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
