#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const schemaVersion = "cf27-supported-subset-classification-v1";
export const verifierQueueSchemaVersion = "cf27-supported-subset-verifier-queue-v1";
export const supportedSubsetVersion = "CF27_SUPPORTED_SUBSET_VERIFICATION_CANDIDATE_v0.1.0";
export const generatedAt = "2026-08-03T04:15:00-04:00";

export const allowedEvidenceSupportStates = [
  "SUPPORTED",
  "SUPPORTED_WITH_NOTES",
  "USER_CONFIRMATION_REQUIRED",
  "LIMITED_EVIDENCE",
  "UNSUPPORTED",
  "DEPRECATED",
  "VERSION_MISMATCH"
];

export const allowedVerificationStatuses = [
  "NOT_VERIFIED",
  "VERIFIED",
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED"
];

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPaths = {
  classificationJson: "data/phase-zero/cf27_supported_subset_classification.json",
  classificationCsv: "data/phase-zero/cf27_supported_subset_classification.csv",
  verifierQueueJson: "data/phase-zero/cf27_supported_subset_verifier_queue.json",
  verifierQueueCsv: "data/phase-zero/cf27_supported_subset_verifier_queue.csv",
  summaryJson: "data/phase-zero/cf27_supported_subset_summary.json",
  classificationDoc: "docs/status/CF27_SUPPORTED_SUBSET_CLASSIFICATION.md",
  verifierDoc: "docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_HANDOFF.md"
};

const headAndFaceSubsetCategories = new Set(["Heads", "Eye Shape", "Nose", "Mouth Shape", "Jaw Shape", "Chin"]);
const userConfirmationCategories = new Set(["Skin Tone", "Skin Details", "Eye Color"]);
const limitedCategories = new Set(["Body-related appearance controls", "Ear Shape", "Hair colors", "Facial hair", "Facial-hair colors"]);
const hairstyleCategories = new Set(["Hairstyles"]);
const supportStatesForVerifierQueue = new Set(["SUPPORTED", "SUPPORTED_WITH_NOTES", "USER_CONFIRMATION_REQUIRED"]);

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes("--check");
  const result = buildSupportedSubsetClassification({ root: repositoryRoot });
  if (checkOnly) {
    checkSupportedSubsetClassification(result, { root: repositoryRoot });
    console.log(
      `CF27 supported-subset classification is current (${result.summary.totalCandidates} candidates; ${result.summary.proposedSupportedSubsetCount} verifier-queue records).`
    );
  } else {
    writeSupportedSubsetClassification(result, { root: repositoryRoot });
    console.log(
      `Wrote CF27 supported-subset classification (${result.summary.totalCandidates} candidates; ${result.summary.proposedSupportedSubsetCount} verifier-queue records).`
    );
  }
}

export function buildSupportedSubsetClassification({ root = repositoryRoot, generatedAtISO = generatedAt } = {}) {
  const ownerMedia = readJson(root, "data/status/owner_media_baseline_lock.json");
  const primaryReview = readJson(root, "data/phase-zero/primary_review_status.json");
  const productionQueue = readJson(root, "data/phase-zero/production_verification_queue.json");
  const existingMediaAudit = readJson(root, "data/phase-zero/cf27_existing_media_verification_gap_audit.json");
  const frameReextractions = readOptionalJson(root, "data/phase-zero/cf27_frame_reextractions.json") ?? { rows: [] };
  const productionManifest = readJson(root, "data/catalog/production/catalog_manifest.json");

  const auditRows = existingMediaAudit.rows ?? existingMediaAudit.auditRows ?? [];
  const auditByCandidateID = new Map(
    auditRows
      .filter((row) => row.rowType === "CATALOG_CANDIDATE")
      .map((row) => [row.candidateOrRequirementID, row])
  );
  const queueByCandidateID = new Map((productionQueue.records ?? []).map((record) => [record.stableCandidateID, record]));
  const frameReextractionsByCategory = groupBy(frameReextractions.rows ?? [], (row) => row.category);

  const records = [...(primaryReview.candidates ?? [])].sort(compareCandidates).map((candidate) => {
    const queueRecord = queueByCandidateID.get(candidate.candidateID);
    const auditRow = auditByCandidateID.get(candidate.candidateID);
    if (!queueRecord) throw new Error(`Missing production-verification queue record for ${candidate.candidateID}.`);
    if (!auditRow) throw new Error(`Missing existing-media audit row for ${candidate.candidateID}.`);
    const classification = classifyCandidate(candidate, queueRecord, auditRow);
    const sourceVideoReferences = queueRecord.sourceVideoReferences ?? [];
    const derivativeEvidenceReferences = (queueRecord.evidenceReferences ?? []).filter((entry) => entry.masterOrDerivative === "derivative");
    const sourceVideoPaths = [
      ...new Set(
        [
          ...(queueRecord.evidenceReferences ?? []).map((entry) => entry.relativePath),
          ...sourceVideoReferences.map((entry) => entry.originalFilename || entry.sourceVideoFilename)
        ].filter(Boolean)
      )
    ];
    const frontViewStatus = inferViewStatus("FRONT", queueRecord, frameReextractionsByCategory.get(candidate.category) ?? []);
    const secondaryViewStatus = inferSecondaryViewStatus(queueRecord);
    const duplicateFlag = Boolean(queueRecord.duplicateOrNearDuplicateFlag || candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED");
    const orderUnresolvedFlag = candidate.primaryReviewStatus === "ORDER_UNRESOLVED";
    const productionBlockers = uniqueStrings([
      "NOT_SECOND_VERIFIED",
      "NO_CATALOG_MANAGER_APPROVAL",
      "NOT_IN_APPROVED_IMMUTABLE_PRODUCTION_RELEASE",
      ...(queueRecord.blockingReasons ?? []),
      classification.includeInSupportedSubset ? "" : "NOT_IN_SUPPORTED_SUBSET"
    ]);

    return {
      candidateID: candidate.candidateID,
      game: "EA SPORTS College Football 27",
      platform: candidate.platform ?? queueRecord.platform ?? "Xbox",
      gameVersion: candidate.gameVersion ?? queueRecord.gameVersion ?? null,
      patch: candidate.patch ?? queueRecord.patch ?? null,
      mode: candidate.mode ?? queueRecord.mode ?? "Road to Glory",
      creationPath: candidate.creationPath ?? queueRecord.creationPath ?? null,
      category: candidate.category,
      categoryID: candidate.categoryID ?? queueRecord.categoryID ?? null,
      nativeOptionLabel: candidate.nativeVisibleLabelOrIndex ?? queueRecord.nativeOptionLabelOrIndex ?? null,
      nativeOptionIndex: candidate.nativeOrder ?? queueRecord.nativeOrder ?? null,
      nativeOrderClaim: candidate.nativeOrder ?? queueRecord.nativeOrder ?? null,
      primaryReviewStatus: candidate.primaryReviewStatus,
      verificationStatus: "NOT_VERIFIED",
      evidenceSupportState: classification.evidenceSupportState,
      evidenceSupportRationale: classification.rationale,
      sourceVideoIDs: sourceVideoReferences.map((entry) => entry.sourceVideoID).filter(Boolean),
      sourceVideoPaths,
      exactUsefulTimestamps: sourceVideoReferences.map((entry) => entry.timestampRange ?? entry.timestamp).filter((value) => value !== null && value !== undefined),
      derivativeEvidenceReferences: derivativeEvidenceReferences.map((entry) => ({
        evidenceID: entry.evidenceID,
        relativePath: entry.relativePath,
        view: entry.view ?? null,
        timestamp: entry.timestamp ?? null
      })),
      evidenceIDs: candidate.evidenceIDs ?? [],
      frontViewStatus,
      secondaryViewStatus,
      menuLabelVisibility: auditRow.menuLabelVisible === "yes" ? "VISIBLE" : "NOT_VISIBLE",
      nativeOrderVisibility: auditRow.nativeOrderVisible === "yes" ? "VISIBLE" : auditRow.nativeOrderVisible === "partial" ? "PARTIAL" : "NOT_VISIBLE",
      boundaryVisibility: inferBoundaryVisibility(queueRecord),
      duplicateFlag,
      orderUnresolvedFlag,
      dependencyFlag: Boolean(queueRecord.dependencyFlag),
      environmentVersionLimitation: Boolean(queueRecord.versionOrEnvironmentGap),
      framingLimitation: queueRecord.framingConsistencyResult !== "PASS" && queueRecord.framingConsistencyResult !== "NOT_APPLICABLE",
      lightingLimitation: queueRecord.lightingConsistencyResult !== "PASS" && queueRecord.lightingConsistencyResult !== "NOT_APPLICABLE",
      obstructionLimitation: Boolean(auditRow.obstructionNotes && !/No candidate-specific obstruction/i.test(auditRow.obstructionNotes)),
      evidenceConfidence: classification.evidenceConfidence,
      futureRecommendationConfidenceCap: classification.futureRecommendationConfidenceCap,
      userConfirmationRequired: classification.evidenceSupportState === "USER_CONFIRMATION_REQUIRED",
      eligibleForVerifierQueue: classification.includeInSupportedSubset,
      eligibleForProductionPromotion: false,
      eligibleForRecommendation: false,
      includeInSupportedSubset: classification.includeInSupportedSubset,
      blockingReasons: productionBlockers,
      exactVerifierAction: classification.verifierAction,
      optionalFutureMediaImprovement: classification.optionalFutureMediaImprovement,
      notes: uniqueStrings([
        ...(candidate.notes ?? []),
        classification.note,
        duplicateFlag ? "Duplicate or near-duplicate concern is preserved and must not be resolved silently." : "",
        orderUnresolvedFlag ? "Native ordering remains unresolved and must not be inferred." : "",
        queueRecord.versionOrEnvironmentGap ? "Game version, patch, or environment metadata remains incomplete for production." : "",
        "No Codex-created human verification decision is recorded."
      ])
    };
  });

  const verifierQueueRecords = records.filter((record) => record.eligibleForVerifierQueue);
  const secondaryAngleSample = createDeterministicSecondaryAngleSample({
    records: verifierQueueRecords,
    environmentID: "OWNER_MEDIA_BASELINE_LOCKED_CF27_SUPPORTED_SUBSET_PRIVATE_BETA",
    verifierID: "SECOND_VERIFIER_TBD",
    catalogVersion: supportedSubsetVersion
  });

  const categorySummaries = createCategorySummaries(records);
  const summary = createSummary({
    records,
    verifierQueueRecords,
    secondaryAngleSample,
    categorySummaries,
    ownerMedia,
    productionManifest,
    generatedAtISO
  });

  const classification = {
    schemaVersion,
    generatedAt: generatedAtISO,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "SUPPORTED_SUBSET_CLASSIFICATION",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    productionRecommendationsEnabled: false,
    ownerMediaBaseline: {
      decisionID: ownerMedia.decisionID,
      decisionOwner: ownerMedia.decisionOwner,
      decisionDate: ownerMedia.decisionDate,
      additionalOwnerMediaRequiredForInitialLaunch: false,
      lockedInventoryArtifact: ownerMedia.lockedInventoryArtifact,
      sourceMediaSummary: ownerMedia.sourceMediaSummary
    },
    allowedEvidenceSupportStates,
    allowedVerificationStatuses,
    policy: {
      noProductionPromotion: "Evidence support classification does not verify, approve, or publish records.",
      ownerMediaRule: "Additional Wyatt recordings are optional post-launch improvement, not a default initial-launch blocker.",
      verifierRule: "Second-human verification remains required before production consideration.",
      recommendationRule: "Every record remains ineligible for recommendation at this milestone."
    },
    summary,
    categorySummaries,
    deterministicSecondaryAngleSample: secondaryAngleSample,
    records
  };

  const verifierQueue = {
    schemaVersion: verifierQueueSchemaVersion,
    generatedAt: generatedAtISO,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "SUPPORTED_SUBSET_VERIFIER_QUEUE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    productionRecommendationsEnabled: false,
    sourceClassification: outputPaths.classificationJson,
    allowedEvidenceSupportStates: ["SUPPORTED", "SUPPORTED_WITH_NOTES", "USER_CONFIRMATION_REQUIRED"],
    allowedVerifierDecisions: [
      "VERIFIED",
      "VERIFIED_WITH_NOTES",
      "RECAPTURE_REQUIRED",
      "VERSION_MISMATCH",
      "MISSING_EVIDENCE",
      "COUNT_MISMATCH",
      "ORDER_MISMATCH",
      "DEPENDENCY_UNRESOLVED",
      "NOT_VERIFIED"
    ],
    summary: {
      verifierQueueCount: verifierQueueRecords.length,
      productionApprovedCount: 0,
      productionCatalogCount: productionManifest.items?.length ?? 0,
      recommendationEligibleCount: 0,
      secondaryAngleSampleCount: secondaryAngleSample.method.selectedCandidateCount,
      privateBetaSubsetViability: summary.privateBetaSubsetViability
    },
    deterministicSecondaryAngleSample: secondaryAngleSample,
    records: verifierQueueRecords.map((record) => ({
      verifierQueueID: `cf27-supported-subset-verifier-${slug(record.candidateID)}`,
      candidateID: record.candidateID,
      category: record.category,
      claimedNativeLabel: record.nativeOptionLabel,
      claimedNativeIndex: record.nativeOptionIndex,
      claimedNativeOrder: record.nativeOrderClaim,
      evidenceSupportState: record.evidenceSupportState,
      supportStateRationale: record.evidenceSupportRationale,
      sourceEvidence: {
        sourceVideoIDs: record.sourceVideoIDs,
        sourceVideoPaths: record.sourceVideoPaths,
        bestTimestamps: record.exactUsefulTimestamps,
        derivativeEvidenceReferences: record.derivativeEvidenceReferences
      },
      primaryObservation: record.nativeOptionLabel,
      knownLimitations: record.notes,
      requiredIndependentInGameCheck: "Verify the native label/index/order and whether the same option exists in the shipping game environment. Record any mismatch as a disagreement.",
      evidenceFileCheck: "Confirm each listed evidence reference resolves or record MISSING_EVIDENCE.",
      frontViewCheck: record.frontViewStatus,
      secondaryAngleRequirement: secondaryAngleSample.rows.some((row) => row.candidateID === record.candidateID)
        ? "REQUIRED_BY_DETERMINISTIC_SAMPLE"
        : "NOT_SELECTED_BY_SAMPLE",
      duplicateOrOrderIssue: record.duplicateFlag ? "DUPLICATE_REVIEW_REQUIRED" : record.orderUnresolvedFlag ? "ORDER_UNRESOLVED" : "NONE",
      allowedVerifierDecisions: [
        "VERIFIED",
        "VERIFIED_WITH_NOTES",
        "RECAPTURE_REQUIRED",
        "VERSION_MISMATCH",
        "MISSING_EVIDENCE",
        "COUNT_MISMATCH",
        "ORDER_MISMATCH",
        "DEPENDENCY_UNRESOLVED",
        "NOT_VERIFIED"
      ],
      requiredNotes: record.evidenceSupportState !== "SUPPORTED" || record.blockingReasons.length > 0,
      productionEligibilityState: "NOT_ELIGIBLE",
      blockingReason: record.blockingReasons.join("; "),
      userConfirmationRequired: record.userConfirmationRequired
    }))
  };

  const files = createOutputFiles({ classification, verifierQueue, summary });
  const validation = validateSupportedSubsetClassification({ classification, verifierQueue, summary });
  return { classification, verifierQueue, summary, files, validation };
}

export function writeSupportedSubsetClassification(result, { root = repositoryRoot } = {}) {
  for (const file of result.files) {
    const absolutePath = path.join(root, file.path);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, file.content);
  }
}

export function checkSupportedSubsetClassification(result, { root = repositoryRoot } = {}) {
  if (!result.validation.ok) {
    throw new Error(`CF27 supported-subset validation failed:\n${result.validation.errors.join("\n")}`);
  }
  const stale = [];
  for (const file of result.files) {
    const absolutePath = path.join(root, file.path);
    if (!fs.existsSync(absolutePath)) {
      stale.push(`${file.path} is missing`);
      continue;
    }
    const current = fs.readFileSync(absolutePath, "utf8");
    if (current !== file.content) stale.push(`${file.path} is stale`);
  }
  if (stale.length > 0) throw new Error(`CF27 supported-subset artifacts are stale:\n${stale.join("\n")}`);
}

export function validateSupportedSubsetClassification({ classification, verifierQueue, summary }) {
  const errors = [];
  const records = classification.records ?? [];
  const ids = records.map((record) => record.candidateID);
  const uniqueIDs = new Set(ids);
  if (records.length !== 92) errors.push(`Expected 92 classification records; found ${records.length}.`);
  if (uniqueIDs.size !== records.length) errors.push("Each CF27 candidate must be classified exactly once.");
  for (const record of records) {
    if (!allowedEvidenceSupportStates.includes(record.evidenceSupportState)) errors.push(`${record.candidateID} has invalid evidenceSupportState.`);
    if (!allowedVerificationStatuses.includes(record.verificationStatus)) errors.push(`${record.candidateID} has invalid verificationStatus.`);
    if (record.verificationStatus !== "NOT_VERIFIED") errors.push(`${record.candidateID} records a Codex-created verifier decision.`);
    if (record.eligibleForProductionPromotion) errors.push(`${record.candidateID} is unexpectedly eligible for production promotion.`);
    if (record.eligibleForRecommendation) errors.push(`${record.candidateID} is unexpectedly eligible for recommendation.`);
    if (record.eligibleForVerifierQueue && !supportStatesForVerifierQueue.has(record.evidenceSupportState)) {
      errors.push(`${record.candidateID} is in the verifier queue with unsupported support state ${record.evidenceSupportState}.`);
    }
    if (record.eligibleForVerifierQueue && record.sourceVideoIDs.length === 0 && record.derivativeEvidenceReferences.length === 0) {
      errors.push(`${record.candidateID} verifier-queue row lacks evidence references.`);
    }
    if (record.duplicateFlag && record.eligibleForVerifierQueue) errors.push(`${record.candidateID} duplicate-review row entered the supported subset.`);
    if (record.orderUnresolvedFlag && record.eligibleForVerifierQueue) errors.push(`${record.candidateID} order-unresolved row entered the supported subset.`);
    if (record.game !== "EA SPORTS College Football 27") errors.push(`${record.candidateID} has cross-game data.`);
  }
  if (verifierQueue.records.some((record) => !record.requiredIndependentInGameCheck || !record.evidenceFileCheck)) {
    errors.push("Every verifier queue record must have required human action fields.");
  }
  if (summary.productionApprovedCount !== 0) errors.push("Production-approved count must remain 0.");
  if (summary.productionCatalogCount !== 0) errors.push("Production catalog count must remain 0.");
  if (summary.recommendationEligibleCount !== 0) errors.push("Recommendation-eligible count must remain 0.");
  if (summary.secondVerifiedCount !== 0) errors.push("Second-verified count must remain 0.");
  if (summary.codexCreatedSecondVerifierDecisions !== 0) errors.push("Codex must not create second-verifier decisions.");
  if (summary.duplicateReviewCount !== 5) errors.push(`Expected 5 duplicate-review records; found ${summary.duplicateReviewCount}.`);
  if (summary.orderUnresolvedCount !== 3) errors.push(`Expected 3 order-unresolved records; found ${summary.orderUnresolvedCount}.`);
  if (summary.proposedHeadCount < 3 && summary.privateBetaSubsetViability === "VIABLE_FOR_SECOND_VERIFIER_REVIEW") {
    errors.push("Private-beta subset cannot be viable with fewer than three proposed head candidates.");
  }
  const counted = Object.values(summary.classificationCountBySupportState).reduce((total, value) => total + value, 0);
  if (counted !== records.length) errors.push("Support-state summary counts do not equal record count.");
  if (summary.optionalFutureMediaIsMandatoryOwnerBlocker) errors.push("Optional future media must not be a mandatory owner blocker.");
  return { ok: errors.length === 0, errors };
}

function classifyCandidate(candidate, queueRecord) {
  const duplicateFlag = Boolean(queueRecord.duplicateOrNearDuplicateFlag || candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED");
  const orderUnresolved = candidate.primaryReviewStatus === "ORDER_UNRESOLVED";
  if (duplicateFlag) {
    return limited("Duplicate or near-duplicate concern remains unresolved; the record is preserved for explicit verifier disposition but excluded from the initial supported subset.", "Review duplicate relationship and decide whether this is a distinct native option, duplicate observation, or mismatch.");
  }
  if (orderUnresolved) {
    return limited("Native order is unresolved; the record is preserved but cannot join the initial supported subset until a verifier resolves ordering.", "Check native order and count independently; record ORDER_MISMATCH or verified ordering.");
  }
  if (limitedCategories.has(candidate.category)) {
    return limited(`${candidate.category} is visible as research evidence but is not strong enough for the initial recommendation subset from the locked baseline.`, "Review only if needed for a later expansion; do not use as an initial recommendation candidate.");
  }
  if (headAndFaceSubsetCategories.has(candidate.category) || hairstyleCategories.has(candidate.category)) {
    return {
      evidenceSupportState: "SUPPORTED_WITH_NOTES",
      includeInSupportedSubset: true,
      evidenceConfidence: "high",
      futureRecommendationConfidenceCap: 0.72,
      rationale:
        "Locked media clearly shows candidate identity/category/value and enough menu or visual evidence to advance to second-person verification, with nonfatal limitations preserved.",
      verifierAction:
        "Independently verify native label/index/order, source evidence, available views, and whether limitations require VERIFIED_WITH_NOTES or a blocking disagreement.",
      optionalFutureMediaImprovement: "Optional post-launch media may improve angles/framing but is not required by default.",
      note: "Supported with notes for verifier review only; not production or recommendation eligible."
    };
  }
  if (userConfirmationCategories.has(candidate.category)) {
    return {
      evidenceSupportState: "USER_CONFIRMATION_REQUIRED",
      includeInSupportedSubset: true,
      evidenceConfidence: "high",
      futureRecommendationConfidenceCap: 0.55,
      rationale:
        "Locked media supports the visible option enough for verifier review, but this appearance choice should require user confirmation and confirmation screenshots before being treated as a successful personal outcome.",
      verifierAction:
        "Independently verify native label/index/order and evidence references; confirm the record should remain user-confirmation-required if approved later.",
      optionalFutureMediaImprovement: "Optional post-launch media may improve color/detail confidence but is not required by default.",
      note: "May support guided build instructions after later verification, but must not be used as a high-confidence geometry match."
    };
  }
  return limited("No supported-subset rule currently admits this candidate from the locked media baseline.", "Keep out of the initial verifier subset unless the catalog manager creates a specific exception.");
}

function limited(rationale, verifierAction) {
  return {
    evidenceSupportState: "LIMITED_EVIDENCE",
    includeInSupportedSubset: false,
    evidenceConfidence: "medium",
    futureRecommendationConfidenceCap: 0.25,
    rationale,
    verifierAction,
    optionalFutureMediaImprovement: "Optional post-launch media or user feedback may improve this record, but additional Wyatt recording is not a default initial-launch blocker.",
    note: "Limited evidence record remains internal/review-only and is excluded from the initial supported subset."
  };
}

function createSummary({ records, verifierQueueRecords, secondaryAngleSample, categorySummaries, ownerMedia, productionManifest, generatedAtISO }) {
  const byState = countBy(records, (record) => record.evidenceSupportState);
  for (const state of allowedEvidenceSupportStates) byState[state] ??= 0;
  const byCategory = countBy(records, (record) => record.category);
  const proposedHeadCount = verifierQueueRecords.filter((record) => record.category === "Heads").length;
  const proposedHairstyleCount = verifierQueueRecords.filter((record) => record.category === "Hairstyles").length;
  const proposedFacialHairCount = verifierQueueRecords.filter((record) => record.category === "Facial hair").length;
  const exactBlockingReasons = [];
  if (proposedHeadCount < 3) exactBlockingReasons.push("Fewer than three head candidates qualify for verifier review.");
  if (proposedHairstyleCount === 0) exactBlockingReasons.push("No hairstyle candidates qualify; hairstyle must be an honest limitation.");
  if (proposedFacialHairCount === 0) exactBlockingReasons.push("No facial-hair candidates qualify; facial hair must be unavailable or user-selected until evidence improves.");
  exactBlockingReasons.push("Second-human verification has not occurred.");
  exactBlockingReasons.push("Catalog-manager production approval has not occurred.");
  exactBlockingReasons.push("Production catalog remains empty and recommendations remain fail-closed.");
  return {
    totalCandidates: records.length,
    classificationCountBySupportState: byState,
    candidateCountByCategory: byCategory,
    categorySummaries,
    proposedSupportedSubsetCount: verifierQueueRecords.length,
    proposedHeadCount,
    proposedHairstyleCount,
    proposedFacialHairCount,
    duplicateReviewCount: records.filter((record) => record.duplicateFlag).length,
    orderUnresolvedCount: records.filter((record) => record.orderUnresolvedFlag).length,
    verifierQueueCount: verifierQueueRecords.length,
    deterministicSampleCount: secondaryAngleSample.method.selectedCandidateCount,
    productionApprovedCount: 0,
    productionCatalogCount: productionManifest.items?.length ?? 0,
    recommendationEligibleCount: 0,
    codexCreatedSecondVerifierDecisions: 0,
    secondVerifiedCount: 0,
    privateBetaSubsetViability:
      proposedHeadCount >= 3 && proposedHairstyleCount >= 1 ? "VIABLE_FOR_SECOND_VERIFIER_REVIEW" : "NOT_VIABLE_FOR_SECOND_VERIFIER_REVIEW",
    exactBlockingReasons,
    mediaBaselineID: ownerMedia.decisionID,
    mediaBaselineVersion: ownerMedia.schemaVersion,
    classificationSchemaVersion: schemaVersion,
    generationTimestamp: generatedAtISO,
    additionalOwnerMediaRequiredForInitialLaunch: false,
    optionalFutureMediaIsMandatoryOwnerBlocker: false
  };
}

function createCategorySummaries(records) {
  return [...groupBy(records, (record) => record.category).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, rows]) => {
      const stateCounts = countBy(rows, (record) => record.evidenceSupportState);
      for (const state of allowedEvidenceSupportStates) stateCounts[state] ??= 0;
      const verifierReady = rows.filter((record) => record.eligibleForVerifierQueue).length;
      return {
        category,
        totalResearchCandidates: rows.length,
        supported: stateCounts.SUPPORTED,
        supportedWithNotes: stateCounts.SUPPORTED_WITH_NOTES,
        userConfirmationRequired: stateCounts.USER_CONFIRMATION_REQUIRED,
        limitedEvidence: stateCounts.LIMITED_EVIDENCE,
        unsupported: stateCounts.UNSUPPORTED,
        deprecated: stateCounts.DEPRECATED,
        versionMismatch: stateCounts.VERSION_MISMATCH,
        duplicateReviewRequired: rows.filter((record) => record.duplicateFlag).length,
        orderUnresolved: rows.filter((record) => record.orderUnresolvedFlag).length,
        verifierReady,
        productionReady: 0,
        recommendationReady: 0,
        primaryLimitations: summarizeCategoryLimitations(rows),
        initialSubset: verifierReady > 0
      };
    });
}

function createDeterministicSecondaryAngleSample({ records, environmentID, verifierID, catalogVersion }) {
  const methodID = "deterministic-sha256-environment-verifier-catalog-category-quartile-v1";
  const seedInput = `${environmentID}|${verifierID}|${catalogVersion}`;
  const selected = [];
  const byCategory = groupBy(records, (record) => record.category);
  for (const [category, rows] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = rows
      .map((record) => ({
        candidateID: record.candidateID,
        category,
        evidenceSupportState: record.evidenceSupportState,
        requiredSecondaryViews: inferRequiredSecondaryViews(record),
        sourceVideoIDs: record.sourceVideoIDs,
        exactUsefulTimestamps: record.exactUsefulTimestamps,
        hash: sha256(`${seedInput}|${category}|${record.candidateID}`)
      }))
      .sort((a, b) => a.hash.localeCompare(b.hash));
    const targetCount = Math.ceil(sorted.length * 0.25);
    sorted.slice(0, targetCount).forEach((row, index) => {
      selected.push({
        sampleID: `supported-subset-secondary-angle-${slug(category)}-${String(index + 1).padStart(3, "0")}`,
        category,
        candidateID: row.candidateID,
        evidenceSupportState: row.evidenceSupportState,
        requiredSecondaryViews: row.requiredSecondaryViews,
        sourceVideoIDs: row.sourceVideoIDs,
        exactUsefulTimestamps: row.exactUsefulTimestamps,
        selectionHash: row.hash,
        selectedRankWithinCategory: index + 1,
        categoryEligibleCount: sorted.length,
        categorySampleCount: targetCount,
        requiredAction: "Review secondary-angle evidence after independent native counts and front-view checks. Record missing, mismatched, or unusable angles as discrepancies."
      });
    });
  }
  return {
    method: {
      methodID,
      description:
        "Concatenate environment ID, verifier ID, catalog version, category, and candidate ID; SHA-256 each eligible candidate; sort ascending within category; select the first required quartile using ceiling rounding.",
      seedInput,
      environmentID,
      verifierID,
      catalogVersion,
      categoryAware: true,
      sampleFraction: 0.25,
      rounding: "ceil",
      eligibleCandidateCount: records.length,
      selectedCandidateCount: selected.length
    },
    rows: selected
  };
}

function createOutputFiles({ classification, verifierQueue, summary }) {
  return [
    jsonFile(outputPaths.classificationJson, classification),
    csvFile(outputPaths.classificationCsv, classification.records, classificationHeaders()),
    jsonFile(outputPaths.verifierQueueJson, verifierQueue),
    csvFile(outputPaths.verifierQueueCsv, verifierQueue.records, verifierQueueHeaders()),
    jsonFile(outputPaths.summaryJson, summary),
    textFile(outputPaths.classificationDoc, renderClassificationDoc(classification, summary)),
    textFile(outputPaths.verifierDoc, renderVerifierDoc(verifierQueue, summary))
  ];
}

function renderClassificationDoc(classification, summary) {
  const categoryTable = classification.categorySummaries
    .map(
      (row) =>
        `| ${row.category} | ${row.totalResearchCandidates} | ${row.supported} | ${row.supportedWithNotes} | ${row.userConfirmationRequired} | ${row.limitedEvidence} | ${row.duplicateReviewRequired} | ${row.orderUnresolved} | ${row.verifierReady} | ${row.initialSubset ? "yes" : "no"} | ${row.primaryLimitations.join("; ")} |`
    )
    .join("\n");
  const candidateRows = classification.records
    .map(
      (record) =>
        `| ${record.candidateID} | ${record.category} | ${record.nativeOptionLabel ?? ""} | ${record.nativeOrderClaim ?? ""} | ${record.primaryReviewStatus} | ${record.evidenceSupportState} | ${record.eligibleForVerifierQueue ? "yes" : "no"} | ${record.eligibleForRecommendation ? "yes" : "no"} | ${record.evidenceSupportRationale} |`
    )
    .join("\n");
  return `# CF27 Supported Subset Classification

**Generated:** ${classification.generatedAt}  
**Data class:** ${classification.dataClass}  
**Production status:** ${classification.productionStatus}  
**Verification status:** ${classification.verificationStatus}  
**Owner media baseline:** ${summary.mediaBaselineID}  

## Executive Conclusion

All ${summary.totalCandidates} current College Football 27 research candidates are classified exactly once into the evidence-support model. The proposed supported subset contains ${summary.proposedSupportedSubsetCount} records for independent second-person verification. This package does not verify, approve, publish, or enable any record.

The subset is ${summary.privateBetaSubsetViability === "VIABLE_FOR_SECOND_VERIFIER_REVIEW" ? "viable for second-verifier review" : "not viable for second-verifier review"} because it proposes ${summary.proposedHeadCount} head candidates and ${summary.proposedHairstyleCount} hairstyle candidate. Facial-hair support remains unavailable in the initial subset because current facial-hair rows are order-unresolved or limited evidence.

Additional Wyatt recordings remain optional post-launch improvement opportunities, not mandatory owner launch blockers.

## Counts

| Metric | Count |
| --- | ---: |
| Total CF27 research candidates | ${summary.totalCandidates} |
| Supported | ${summary.classificationCountBySupportState.SUPPORTED} |
| Supported with notes | ${summary.classificationCountBySupportState.SUPPORTED_WITH_NOTES} |
| User confirmation required | ${summary.classificationCountBySupportState.USER_CONFIRMATION_REQUIRED} |
| Limited evidence | ${summary.classificationCountBySupportState.LIMITED_EVIDENCE} |
| Unsupported | ${summary.classificationCountBySupportState.UNSUPPORTED} |
| Deprecated | ${summary.classificationCountBySupportState.DEPRECATED} |
| Version mismatch | ${summary.classificationCountBySupportState.VERSION_MISMATCH} |
| Proposed supported subset | ${summary.proposedSupportedSubsetCount} |
| Proposed head count | ${summary.proposedHeadCount} |
| Proposed hairstyle count | ${summary.proposedHairstyleCount} |
| Proposed facial-hair count | ${summary.proposedFacialHairCount} |
| Duplicate-review records | ${summary.duplicateReviewCount} |
| Order-unresolved records | ${summary.orderUnresolvedCount} |
| Second-verifier queue records | ${summary.verifierQueueCount} |
| Deterministic secondary-angle sample | ${summary.deterministicSampleCount} |
| Production-approved records | ${summary.productionApprovedCount} |
| Production catalog records | ${summary.productionCatalogCount} |
| Recommendation-eligible records | ${summary.recommendationEligibleCount} |

## Category Summary

| Category | Total | Supported | Supported with notes | User confirmation | Limited | Duplicate | Order unresolved | Verifier-ready | Initial subset | Primary limitations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${categoryTable}

## Blocking Rules Preserved

- Support state is separate from verification status.
- Every record remains \`NOT_VERIFIED\`.
- No record is production-approved.
- No record is recommendation-eligible.
- Duplicate-review and order-unresolved records remain unresolved.
- Version/environment limitations remain attached.
- Optional future media is not a mandatory owner blocker.

## Candidate Matrix

| Candidate ID | Category | Native label | Native order | Primary review | Support state | Verifier queue | Recommendation eligible | Rationale |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- |
${candidateRows}
`;
}

function renderVerifierDoc(verifierQueue, summary) {
  const sampleRows = verifierQueue.deterministicSecondaryAngleSample.rows
    .map((row) => `| ${row.sampleID} | ${row.category} | ${row.candidateID} | ${row.requiredSecondaryViews.join(", ")} | ${row.selectionHash} |`)
    .join("\n");
  const queueRows = verifierQueue.records
    .map(
      (record) =>
        `| ${record.candidateID} | ${record.category} | ${record.claimedNativeLabel ?? ""} | ${record.evidenceSupportState} | ${record.sourceEvidence.bestTimestamps.join("; ")} | ${record.secondaryAngleRequirement} | ${record.duplicateOrOrderIssue} | ${record.requiredNotes ? "yes" : "no"} |`
    )
    .join("\n");
  return `# CF27 Supported Subset Verifier Handoff

**Generated:** ${verifierQueue.generatedAt}  
**Data class:** ${verifierQueue.dataClass}  
**Production status:** ${verifierQueue.productionStatus}  
**Verification status:** ${verifierQueue.verificationStatus}  

## What This Package Is

This is a focused second-verifier queue for the supported subset proposed from the locked owner media baseline. It contains ${summary.verifierQueueCount} records. It does not publish a catalog, grant production approval, or enable recommendations.

The verifier must independently inspect the shipping game where required, compare evidence references, confirm or dispute native labels/order/counts, and record disagreements. Uncertainty should lower support or block a candidate; do not guess.

## What To Verify

- 100% of listed candidate IDs, native labels, native indices, and native order claims.
- 100% of menu counts and evidence-file references for this subset.
- 100% of required front-view checks.
- 100% of duplicate/order exceptions if any appear in later review.
- The deterministic 25% secondary-angle sample below.

## Deterministic Secondary-Angle Sample

Method: ${verifierQueue.deterministicSecondaryAngleSample.method.methodID}

Formula: ${verifierQueue.deterministicSecondaryAngleSample.method.description}

Seed input: \`${verifierQueue.deterministicSecondaryAngleSample.method.seedInput}\`

| Sample ID | Category | Candidate ID | Required secondary views | Hash |
| --- | --- | --- | --- | --- |
${sampleRows}

## Verifier Queue

| Candidate ID | Category | Claimed label | Support state | Best timestamps | Secondary angle | Duplicate/order issue | Notes required |
| --- | --- | --- | --- | --- | --- | --- | --- |
${queueRows}

## Explicit Non-Goals

- Do not mark any record production-approved.
- Do not convert primary review into second verification.
- Do not add owner recapture as a default requirement.
- Do not use limited/unsupported records for recommendations.
- Do not publish the catalog from this packet.
`;
}

function classificationHeaders() {
  return [
    "candidateID",
    "game",
    "platform",
    "gameVersion",
    "patch",
    "mode",
    "creationPath",
    "category",
    "nativeOptionLabel",
    "nativeOptionIndex",
    "nativeOrderClaim",
    "primaryReviewStatus",
    "verificationStatus",
    "evidenceSupportState",
    "evidenceSupportRationale",
    "sourceVideoIDs",
    "sourceVideoPaths",
    "exactUsefulTimestamps",
    "frontViewStatus",
    "secondaryViewStatus",
    "menuLabelVisibility",
    "nativeOrderVisibility",
    "boundaryVisibility",
    "duplicateFlag",
    "orderUnresolvedFlag",
    "dependencyFlag",
    "environmentVersionLimitation",
    "framingLimitation",
    "lightingLimitation",
    "obstructionLimitation",
    "evidenceConfidence",
    "futureRecommendationConfidenceCap",
    "userConfirmationRequired",
    "eligibleForVerifierQueue",
    "eligibleForProductionPromotion",
    "eligibleForRecommendation",
    "blockingReasons",
    "exactVerifierAction",
    "optionalFutureMediaImprovement",
    "notes"
  ];
}

function verifierQueueHeaders() {
  return [
    "verifierQueueID",
    "candidateID",
    "category",
    "claimedNativeLabel",
    "claimedNativeIndex",
    "claimedNativeOrder",
    "evidenceSupportState",
    "supportStateRationale",
    "requiredIndependentInGameCheck",
    "evidenceFileCheck",
    "frontViewCheck",
    "secondaryAngleRequirement",
    "duplicateOrOrderIssue",
    "requiredNotes",
    "productionEligibilityState",
    "blockingReason",
    "userConfirmationRequired"
  ];
}

function inferViewStatus(view, queueRecord, frameReextractions) {
  if ((queueRecord.availableViews ?? []).includes(view)) return "AVAILABLE_IN_CURRENT_EVIDENCE";
  if (frameReextractions.some((row) => row.view === view && row.extractionStatus === "EXTRACTED_FROM_SOURCE_MASTER")) {
    return "CATEGORY_FRAME_REEXTRACTION_AVAILABLE";
  }
  if ((queueRecord.missingViews ?? []).includes(view)) return "MISSING_FROM_CURRENT_DERIVATIVES";
  return "NOT_REQUIRED";
}

function inferSecondaryViewStatus(queueRecord) {
  const secondaryViews = ["LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"];
  const available = secondaryViews.filter((view) => (queueRecord.availableViews ?? []).includes(view));
  const missing = secondaryViews.filter((view) => (queueRecord.missingViews ?? []).includes(view));
  if (available.length > 0 && missing.length === 0) return "AVAILABLE";
  if (available.length > 0) return `PARTIAL_AVAILABLE:${available.join("|")};MISSING:${missing.join("|")}`;
  if (missing.length > 0) return `MISSING:${missing.join("|")}`;
  return "NOT_REQUIRED";
}

function inferBoundaryVisibility(queueRecord) {
  const boundary = queueRecord.selectorBoundaryState ?? {};
  const states = [boundary.firstSelectorOptionKnown, boundary.finalSelectorOptionKnown, boundary.selectorWrapKnown].filter(Boolean);
  if (states.length === 0 || states.every((state) => state === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  if (states.every((state) => state === "PASS")) return "VISIBLE";
  if (states.some((state) => state === "PASS")) return "PARTIAL";
  return "NOT_VISIBLE";
}

function inferRequiredSecondaryViews(record) {
  const required = [];
  if (/Head|Nose|Jaw|Chin|Hair|Mouth/.test(record.category)) required.push("LEFT_3Q", "RIGHT_3Q");
  if (record.category === "Heads" || record.category === "Hairstyles") required.push("LEFT_PROFILE", "RIGHT_PROFILE");
  return required.length > 0 ? [...new Set(required)] : ["SECONDARY_ANGLE_IF_AVAILABLE"];
}

function summarizeCategoryLimitations(rows) {
  const limitations = [];
  if (rows.some((row) => row.environmentVersionLimitation)) limitations.push("environment/version metadata incomplete");
  if (rows.some((row) => row.duplicateFlag)) limitations.push("duplicate review preserved");
  if (rows.some((row) => row.orderUnresolvedFlag)) limitations.push("native order unresolved");
  if (rows.some((row) => row.framingLimitation)) limitations.push("framing or view limitation");
  if (rows.some((row) => row.userConfirmationRequired)) limitations.push("user confirmation required");
  if (rows.every((row) => row.evidenceSupportState === "LIMITED_EVIDENCE")) limitations.push("excluded from initial supported subset");
  return limitations.length > 0 ? limitations : ["no category-specific limitation beyond second verification"];
}

function compareCandidates(a, b) {
  return `${a.categoryID ?? a.category}:${String(a.nativeOrder ?? 9999).padStart(6, "0")}:${a.candidateID}`.localeCompare(
    `${b.categoryID ?? b.category}:${String(b.nativeOrder ?? 9999).padStart(6, "0")}:${b.candidateID}`
  );
}

function createCsv(rows, headers) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")).join("\n")}\n`;
}

function csvValue(value) {
  const scalar = Array.isArray(value)
    ? value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join("; ")
    : value && typeof value === "object"
      ? JSON.stringify(value)
      : value ?? "";
  const text = String(scalar);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function jsonFile(filePath, value) {
  return textFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function csvFile(filePath, rows, headers) {
  return textFile(filePath, createCsv(rows, headers));
}

function textFile(filePath, content) {
  return { path: filePath, content };
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readOptionalJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? JSON.parse(fs.readFileSync(absolutePath, "utf8")) : null;
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}

function countBy(values, keyFn) {
  const counts = {};
  for (const value of values) {
    const key = keyFn(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
