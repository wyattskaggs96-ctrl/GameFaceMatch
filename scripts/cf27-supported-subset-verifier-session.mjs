#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const schemaVersion = "cf27-supported-subset-verifier-session-v1";
export const decisionExportSchemaVersion = "cf27-supported-subset-verifier-decision-export-v1";
export const packageID = "CF27_SUPPORTED_SUBSET_SECOND_VERIFIER_SESSION_v0.1.0";
export const defaultOutputDirectory = "data/phase-zero/supported-subset-verifier-session";
export const defaultRunbookPath = "docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_RUNBOOK.md";
export const defaultStatusPath = "docs/status/CF27_SUPPORTED_SUBSET_HUMAN_VERIFICATION_STATUS.md";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-03T05:30:00-04:00";
const supportedStatesForQueue = new Set(["SUPPORTED", "SUPPORTED_WITH_NOTES", "USER_CONFIRMATION_REQUIRED"]);
const allowedSessionStates = Object.freeze([
  "NOT_STARTED",
  "IN_PROGRESS",
  "PAUSED",
  "READY_TO_EXPORT",
  "EXPORTED",
  "IMPORT_VALIDATION_FAILED",
  "IMPORTED_NON_PRODUCTION",
  "DISCREPANCIES_REMAIN",
  "COMPLETE_FOR_CATALOG_MANAGER_REVIEW"
]);
export const allowedVerificationStatuses = Object.freeze([
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
const triState = new Set(["yes", "no", "uncertain"]);
const frontViewStates = new Set(["yes", "no", "not_applicable"]);
const secondaryAngleStates = new Set(["yes", "no", "not_selected", "not_available"]);
const duplicateStates = new Set(["yes", "no", "uncertain", "not_applicable"]);

export function buildSupportedSubsetVerifierSession({ root = repositoryRoot } = {}) {
  const normalizedRoot = path.resolve(root);
  const classification = readJSON(path.join(normalizedRoot, "data/phase-zero/cf27_supported_subset_classification.json"));
  const verifierQueue = readJSON(path.join(normalizedRoot, "data/phase-zero/cf27_supported_subset_verifier_queue.json"));
  const summary = readJSON(path.join(normalizedRoot, "data/phase-zero/cf27_supported_subset_summary.json"));
  const productionManifest = readJSON(path.join(normalizedRoot, "data/catalog/production/catalog_manifest.json"));
  const classificationByID = new Map(classification.records.map((record) => [record.candidateID, record]));
  const sampleIDs = new Set(classification.deterministicSecondaryAngleSample.rows.map((row) => row.candidateID));
  const excludedIssueRows = classification.records
    .filter((record) => record.duplicateFlag || record.orderUnresolvedFlag)
    .map((record) => ({
      candidateID: record.candidateID,
      category: record.category,
      evidenceSupportState: record.evidenceSupportState,
      duplicateFlag: record.duplicateFlag,
      orderUnresolvedFlag: record.orderUnresolvedFlag,
      includedInSupportedSubset: record.includeInSupportedSubset === true,
      requiredHumanAction: record.duplicateFlag
        ? "Preserve duplicate relationship for later catalog-manager disposition; do not merge or recommend."
        : "Independently inspect native order if this excluded record is reconsidered later; do not infer order.",
      productionEligibilityState: "NOT_ELIGIBLE",
      notes: "Excluded from the 76-record supported subset because evidence remains limited. This is not an owner recording request."
    }));
  const records = verifierQueue.records.map((queueRecord) => {
    const classificationRecord = classificationByID.get(queueRecord.candidateID);
    return {
      candidateID: queueRecord.candidateID,
      category: queueRecord.category,
      claimedNativeLabel: queueRecord.claimedNativeLabel,
      claimedNativeIndex: queueRecord.claimedNativeIndex,
      claimedNativeOrder: queueRecord.claimedNativeOrder,
      evidenceSupportState: queueRecord.evidenceSupportState,
      primaryReviewStatus: classificationRecord?.primaryReviewStatus ?? "UNKNOWN",
      currentVerificationStatus: classificationRecord?.verificationStatus ?? "NOT_VERIFIED",
      primaryObservation: queueRecord.primaryObservation,
      primaryNotes: (classificationRecord?.notes ?? []).join(" | "),
      knownLimitations: queueRecord.knownLimitations ?? [],
      sourceVideoIDs: queueRecord.sourceEvidence?.sourceVideoIDs ?? [],
      sourceVideoPaths: queueRecord.sourceEvidence?.sourceVideoPaths ?? [],
      exactEvidenceTimestamps: queueRecord.sourceEvidence?.bestTimestamps ?? [],
      derivativeEvidenceReferences: queueRecord.sourceEvidence?.derivativeEvidenceReferences ?? [],
      frontViewEvidence: queueRecord.frontViewCheck,
      secondaryViewEvidence: queueRecord.secondaryAngleRequirement,
      menuLabelVisibility: classificationRecord?.menuLabelVisibility ?? "UNKNOWN",
      nativeOrderVisibility: classificationRecord?.nativeOrderVisibility ?? "UNKNOWN",
      boundaryVisibility: classificationRecord?.boundaryVisibility ?? "UNKNOWN",
      duplicateFlag: classificationRecord?.duplicateFlag === true,
      orderUnresolvedFlag: classificationRecord?.orderUnresolvedFlag === true,
      dependencyFlag: classificationRecord?.dependencyFlag === true,
      environmentVersionLimitation: classificationRecord?.environmentVersionLimitation === true,
      currentProductionEligibility: queueRecord.productionEligibilityState,
      currentRecommendationEligibility: classificationRecord?.eligibleForRecommendation === true,
      blockedReason: queueRecord.blockingReason,
      deterministicSecondaryAngleSampleRequired: sampleIDs.has(queueRecord.candidateID),
      allowedVerifierDecisions: allowedVerificationStatuses,
      requiredHumanFields: [
        "independentObservation",
        "candidateIdentityConfirmed",
        "nativeLabelConfirmed",
        "nativeIndexConfirmed",
        "nativeOrderConfirmed",
        "evidenceFilesResolve",
        "frontViewConfirmed",
        "secondaryAngleReviewed",
        "menuCountConfirmed",
        "duplicateRelationshipConfirmed",
        "environmentCompatible",
        "decisionStatus",
        "decisionTimestamp"
      ],
      productionEligibilityState: "NOT_ELIGIBLE",
      recommendationEligibilityState: "NOT_ELIGIBLE"
    };
  });
  const sampleRows = classification.deterministicSecondaryAngleSample.rows.map((row) => ({
    sampleID: row.sampleID,
    candidateID: row.candidateID,
    category: row.category,
    requiredSecondaryViews: (row.requiredSecondaryViews ?? []).join(";"),
    sourceVideoIDs: (row.sourceVideoIDs ?? []).join(";"),
    exactUsefulTimestamps: (row.exactUsefulTimestamps ?? []).join(";"),
    selectionHash: row.selectionHash,
    requiredAction: row.requiredAction,
    reviewed: "",
    verifierObservation: "",
    result: "",
    missingAngleLimitation: "",
    notes: ""
  }));
  const menuCountTargets = buildMenuCountTargets(verifierQueue.records);
  const sessionManifest = {
    schemaVersion,
    packageID,
    generatedAt,
    dataClass: "SECOND_VERIFIER_SESSION_TEMPLATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    humanExecutionStatus: "READY_FOR_HUMAN_VERIFIER",
    verifierSessionModel: {
      verifierSessionId: "",
      verifierId: "",
      startedAt: "",
      completedAt: "",
      verificationDate: "",
      attestationVersion: "cf27-supported-subset-verifier-attestation-v1",
      shippingGameAccessConfirmed: false,
      independentInspectionConfirmed: false,
      primarySummaryNotUsedAsSoleBasis: false,
      environmentComplete: false,
      queueVersion: verifierQueue.schemaVersion,
      subsetVersion: classification.deterministicSecondaryAngleSample.method.catalogVersion,
      mediaBaselineVersion: summary.mediaBaselineVersion,
      catalogCandidateVersion: "CF27_SUPPORTED_SUBSET_VERIFICATION_CANDIDATE_v0.1.0",
      decisionCount: 0,
      completionState: "NOT_STARTED",
      exportedAt: "",
      notes: ""
    },
    allowedSessionStates,
    allowedVerificationStatuses,
    requiredRecordDecisionCount: records.length,
    requiredSecondaryAngleResultCount: sampleRows.length,
    productionApprovedRecords: productionManifest.counts?.totalRecords ?? 0,
    productionCatalogRecords: productionManifest.counts?.totalRecords ?? 0,
    recommendationEligibleRecords: 0,
    secondVerifierDecisionCount: 0,
    secondVerifiedRecords: 0
  };
  const verifierEnvironmentTemplate = {
    verifierId: "",
    verificationDate: "",
    gameTitleDisplayed: "",
    platform: "",
    consoleModel: "",
    gameEdition: "unknown",
    region: "unknown",
    gameVersion: "unknown",
    patchOrInstalledUpdate: "unknown",
    mode: "",
    creationPath: "",
    accountState: "unknown",
    onlineState: "unknown",
    sameEnvironmentAsPrimaryResearcher: "unknown",
    environmentDifference: "",
    independentlyAccessedShippingGame: false,
    environmentEvidenceReference: "",
    notes: ""
  };
  const attestationTemplate = {
    attestationVersion: "cf27-supported-subset-verifier-attestation-v1",
    verifierId: "",
    attestationTimestamp: "",
    attestationAccepted: false,
    realSecondPerson: false,
    independentlyAccessedShippingGame: false,
    didNotMerelyApprovePrimarySummary: false,
    reviewedCandidateAndEvidencePresented: false,
    recordedDisagreementsHonestly: false,
    didNotGuessMissingLabelsOrderCountsOrViews: false,
    understandsNotPublishingCatalog: false,
    understandsCatalogManagerApprovalSeparate: false,
    notes: ""
  };
  const recordDecisionTemplate = records.map((record) => ({
    candidateID: record.candidateID,
    category: record.category,
    independentObservation: "",
    candidateIdentityConfirmed: "",
    nativeLabelConfirmed: "",
    nativeIndexConfirmed: "",
    nativeOrderConfirmed: "",
    evidenceFilesResolve: "",
    frontViewConfirmed: "",
    secondaryAngleReviewed: record.deterministicSecondaryAngleSampleRequired ? "" : "not_selected",
    menuCountConfirmed: "",
    duplicateRelationshipConfirmed: record.duplicateFlag ? "" : "not_applicable",
    environmentCompatible: "",
    decisionStatus: "",
    discrepancyType: "none",
    requiredNotes: "",
    recommendedResolution: "",
    resolutionEvidenceReference: "",
    decisionTimestamp: "",
    productionEligibilityState: "NOT_ELIGIBLE",
    recommendationEligibilityState: "NOT_ELIGIBLE"
  }));
  const menuCountTemplate = menuCountTargets.map((target) => ({
    targetID: target.targetID,
    category: target.category,
    representedInSupportedSubset: target.representedInSupportedSubset,
    independentVerifierCount: "",
    firstVisibleValue: "",
    finalVisibleValue: "",
    boundaryOrWrapObserved: "",
    evidenceReference: "",
    countConfirmed: "",
    notes: target.notes
  }));
  const exportPackage = {
    schemaVersion: decisionExportSchemaVersion,
    packageID,
    generatedAt,
    sessionManifest,
    verifierEnvironment: verifierEnvironmentTemplate,
    verifierAttestation: attestationTemplate,
    recordDecisions: recordDecisionTemplate,
    menuCounts: menuCountTemplate,
    secondaryAngleResults: sampleRows,
    duplicateAndOrderDispositionRows: excludedIssueRows.map((row) => ({
      ...row,
      verifierDisposition: "",
      verifierObservation: "",
      notes: ""
    })),
    discrepancies: [],
    unresolvedItems: records.map((record) => ({
      candidateID: record.candidateID,
      reason: "Awaiting real second-human decision.",
      productionEligibilityState: "NOT_ELIGIBLE"
    })),
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false
  };
  const integrityHash = hashExportPackage(exportPackage);
  const packageWithHash = { ...exportPackage, integrityHash };
  const validation = validateSupportedSubsetVerifierSession({ sessionManifest, records, sampleRows, excludedIssueRows, classification, verifierQueue, summary });
  const files = createFiles({
    sessionManifest,
    records,
    sampleRows,
    verifierEnvironmentTemplate,
    attestationTemplate,
    recordDecisionTemplate,
    menuCountTemplate,
    excludedIssueRows,
    packageWithHash,
    validation,
    summary
  });
  return {
    sessionManifest,
    records,
    sampleRows,
    verifierEnvironmentTemplate,
    attestationTemplate,
    recordDecisionTemplate,
    menuCountTemplate,
    excludedIssueRows,
    packageWithHash,
    validation,
    files,
    runbook: formatRunbook({ sessionManifest, summary }),
    statusDocument: formatStatusDocument({ sessionManifest, summary, validation })
  };
}

export function validateSupportedSubsetVerifierSession({ sessionManifest, records, sampleRows, excludedIssueRows, classification, verifierQueue, summary }) {
  const errors = [];
  const queueIDs = new Set(verifierQueue.records.map((record) => record.candidateID));
  const classificationByID = new Map(classification.records.map((record) => [record.candidateID, record]));
  if (records.length !== 76) errors.push(`Expected 76 supported-subset verifier records; found ${records.length}.`);
  if (summary.proposedSupportedSubsetCount !== 76 || summary.verifierQueueCount !== 76) errors.push("Prompt 101 supported-subset summary no longer reports 76 verifier records.");
  if (sampleRows.length !== 24) errors.push(`Expected 24 deterministic secondary-angle rows; found ${sampleRows.length}.`);
  if (sessionManifest.secondVerifierDecisionCount !== 0 || sessionManifest.secondVerifiedRecords !== 0) errors.push("Codex must not create human verifier decisions.");
  if (sessionManifest.productionApprovedRecords !== 0 || sessionManifest.productionCatalogRecords !== 0 || sessionManifest.recommendationEligibleRecords !== 0) errors.push("Production and recommendation counts must remain 0.");
  for (const record of records) {
    if (!queueIDs.has(record.candidateID)) errors.push(`${record.candidateID} is not in the supported-subset verifier queue.`);
    const classificationRecord = classificationByID.get(record.candidateID);
    if (!classificationRecord) errors.push(`${record.candidateID} is missing from Prompt 101 classification.`);
    if (classificationRecord && !supportedStatesForQueue.has(classificationRecord.evidenceSupportState)) errors.push(`${record.candidateID} has invalid support state for the 76-record subset.`);
    if (classificationRecord?.evidenceSupportState === "LIMITED_EVIDENCE") errors.push(`${record.candidateID} is limited evidence and must not enter the supported-subset queue.`);
    if (record.currentProductionEligibility !== "NOT_ELIGIBLE" || record.currentRecommendationEligibility) errors.push(`${record.candidateID} is unexpectedly eligible for production or recommendation.`);
  }
  const limitedInQueue = verifierQueue.records.filter((record) => record.evidenceSupportState === "LIMITED_EVIDENCE");
  if (limitedInQueue.length > 0) errors.push("Limited-evidence records entered the verifier subset.");
  if (excludedIssueRows.length !== 8) errors.push(`Expected 8 excluded duplicate/order rows; found ${excludedIssueRows.length}.`);
  return {
    schemaVersion: `${schemaVersion}-validation`,
    generatedAt,
    ok: errors.length === 0,
    errors,
    summary: {
      verifierQueueCount: records.length,
      secondaryAngleSampleCount: sampleRows.length,
      excludedDuplicateOrOrderRows: excludedIssueRows.length,
      humanDecisionCount: 0,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      recommendationEligibleRecords: 0,
      humanExecutionStatus: "READY_FOR_HUMAN_VERIFIER"
    }
  };
}

export function validateCompletedVerifierDecisionExport(exportPackage, { root = repositoryRoot } = {}) {
  const normalizedRoot = path.resolve(root);
  const verifierQueue = readJSON(path.join(normalizedRoot, "data/phase-zero/cf27_supported_subset_verifier_queue.json"));
  const classification = readJSON(path.join(normalizedRoot, "data/phase-zero/cf27_supported_subset_classification.json"));
  const queueIDs = new Set(verifierQueue.records.map((record) => record.candidateID));
  const sampleIDs = new Set(classification.deterministicSecondaryAngleSample.rows.map((row) => row.candidateID));
  const errors = [];
  const warnings = [];
  if (!exportPackage || exportPackage.schemaVersion !== decisionExportSchemaVersion) errors.push("invalidSchemaVersion");
  if (exportPackage.integrityHash && exportPackage.integrityHash !== hashExportPackage({ ...exportPackage, integrityHash: undefined })) errors.push("modifiedPackageHash");
  for (const forbidden of ["productionApproved", "productionApprovedRecords", "eligibleForRecommendation", "recommendationEligibleRecords"]) {
    if (Object.prototype.hasOwnProperty.call(exportPackage, forbidden)) errors.push(`forbiddenProductionField:${forbidden}`);
  }
  const session = exportPackage.sessionManifest ?? {};
  const environment = exportPackage.verifierEnvironment ?? {};
  const attestation = exportPackage.verifierAttestation ?? {};
  const verifierID = stringValue(session.verifierSessionId ? session.verifierId : environment.verifierId || attestation.verifierId);
  if (!hasText(verifierID)) errors.push("missingVerifierID");
  if (/fixture|test-only|codex|primary/i.test(verifierID)) errors.push("fixtureOrInvalidVerifierID");
  const completionState = session.verifierSessionModel?.completionState ?? session.completionState;
  if (!allowedSessionStates.includes(completionState)) errors.push("invalidSessionState");
  for (const field of ["verificationDate", "gameTitleDisplayed", "platform", "consoleModel", "gameVersion", "patchOrInstalledUpdate", "mode", "creationPath"]) {
    if (!hasText(environment[field])) errors.push(`missingEnvironment:${field}`);
  }
  if (environment.independentlyAccessedShippingGame !== true) errors.push("shippingGameAccessNotConfirmed");
  for (const field of [
    "attestationAccepted",
    "realSecondPerson",
    "independentlyAccessedShippingGame",
    "didNotMerelyApprovePrimarySummary",
    "reviewedCandidateAndEvidencePresented",
    "recordedDisagreementsHonestly",
    "didNotGuessMissingLabelsOrderCountsOrViews",
    "understandsNotPublishingCatalog",
    "understandsCatalogManagerApprovalSeparate"
  ]) {
    if (attestation[field] !== true) errors.push(`missingAttestation:${field}`);
  }
  const decisions = Array.isArray(exportPackage.recordDecisions) ? exportPackage.recordDecisions : [];
  if (decisions.length !== 76) errors.push(`decisionCount:${decisions.length}`);
  const seen = new Set();
  for (const decision of decisions) {
    const id = stringValue(decision.candidateID);
    if (!queueIDs.has(id)) errors.push(`unknownOrOutOfSubsetCandidate:${id}`);
    if (seen.has(id)) errors.push(`duplicateCandidateDecision:${id}`);
    seen.add(id);
    if (!allowedVerificationStatuses.includes(decision.decisionStatus)) errors.push(`invalidDecisionStatus:${id}`);
    if (!hasText(decision.independentObservation)) errors.push(`missingIndependentObservation:${id}`);
    for (const field of ["candidateIdentityConfirmed", "nativeLabelConfirmed", "nativeIndexConfirmed", "nativeOrderConfirmed", "menuCountConfirmed", "environmentCompatible"]) {
      if (!triState.has(stringValue(decision[field]))) errors.push(`invalidTriState:${id}:${field}`);
    }
    if (!new Set(["yes", "no"]).has(stringValue(decision.evidenceFilesResolve))) errors.push(`invalidEvidenceFilesResolve:${id}`);
    if (!frontViewStates.has(stringValue(decision.frontViewConfirmed))) errors.push(`invalidFrontView:${id}`);
    if (!secondaryAngleStates.has(stringValue(decision.secondaryAngleReviewed))) errors.push(`invalidSecondaryAngle:${id}`);
    if (!duplicateStates.has(stringValue(decision.duplicateRelationshipConfirmed))) errors.push(`invalidDuplicateDisposition:${id}`);
    if (!hasText(decision.decisionTimestamp) || Number.isNaN(Date.parse(decision.decisionTimestamp))) errors.push(`invalidDecisionTimestamp:${id}`);
    const uncertain = ["candidateIdentityConfirmed", "nativeLabelConfirmed", "nativeIndexConfirmed", "nativeOrderConfirmed", "menuCountConfirmed", "environmentCompatible"]
      .some((field) => decision[field] === "uncertain");
    const nonClean = decision.decisionStatus !== "VERIFIED";
    if ((uncertain || nonClean) && !hasText(decision.requiredNotes)) errors.push(`missingRequiredNotes:${id}`);
    if (decision.decisionStatus === "VERIFIED" && (
      decision.candidateIdentityConfirmed !== "yes" ||
      decision.nativeLabelConfirmed !== "yes" ||
      decision.nativeIndexConfirmed !== "yes" ||
      decision.nativeOrderConfirmed !== "yes" ||
      decision.evidenceFilesResolve !== "yes" ||
      decision.frontViewConfirmed !== "yes" ||
      decision.environmentCompatible !== "yes"
    )) errors.push(`cleanVerifiedMissingConfirmation:${id}`);
    if (sampleIDs.has(id) && decision.secondaryAngleReviewed === "not_selected") errors.push(`missingSampleDecision:${id}`);
    if (decision.productionEligibilityState !== "NOT_ELIGIBLE" || decision.recommendationEligibilityState !== "NOT_ELIGIBLE") errors.push(`productionOrRecommendationAttempt:${id}`);
  }
  for (const id of queueIDs) if (!seen.has(id)) errors.push(`missingCandidateDecision:${id}`);
  const sampleResults = Array.isArray(exportPackage.secondaryAngleResults) ? exportPackage.secondaryAngleResults : [];
  const sampleResultIDs = new Set(sampleResults.map((row) => row.candidateID));
  for (const id of sampleIDs) if (!sampleResultIDs.has(id)) errors.push(`missingSecondaryAngleResult:${id}`);
  for (const row of sampleResults) {
    if (sampleIDs.has(row.candidateID) && !hasText(row.verifierObservation)) errors.push(`missingSecondaryAngleObservation:${row.candidateID}`);
  }
  const duplicateOrder = Array.isArray(exportPackage.duplicateAndOrderDispositionRows) ? exportPackage.duplicateAndOrderDispositionRows : [];
  if (duplicateOrder.length < 8) warnings.push("duplicateOrderExcludedReviewIncomplete");
  return {
    schemaVersion: `${decisionExportSchemaVersion}-import-validation`,
    generatedAt,
    ok: errors.length === 0,
    importState: errors.length === 0 ? "IMPORTED_NON_PRODUCTION" : "IMPORT_VALIDATION_FAILED",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    errors,
    warnings,
    summary: {
      decisionCount: decisions.length,
      expectedDecisionCount: 76,
      secondaryAngleResultCount: sampleResults.length,
      expectedSecondaryAngleResultCount: sampleIDs.size,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      recommendationEligibleRecords: 0
    }
  };
}

export function writeSupportedSubsetVerifierSession(result, { root = repositoryRoot } = {}) {
  for (const file of result.files) writeText(root, file.relativePath, file.content);
  writeText(root, defaultRunbookPath, result.runbook);
  writeText(root, defaultStatusPath, result.statusDocument);
}

export function checkSupportedSubsetVerifierSession(result, { root = repositoryRoot } = {}) {
  for (const file of result.files) {
    const absolutePath = path.resolve(root, file.relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`${file.relativePath} is missing. Run npm run cf27:supported-subset-verifier-session.`);
    if (fs.readFileSync(absolutePath, "utf8") !== file.content) throw new Error(`${file.relativePath} is stale. Run npm run cf27:supported-subset-verifier-session.`);
  }
  for (const [relativePath, content] of [[defaultRunbookPath, result.runbook], [defaultStatusPath, result.statusDocument]]) {
    const absolutePath = path.resolve(root, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`${relativePath} is missing. Run npm run cf27:supported-subset-verifier-session.`);
    if (fs.readFileSync(absolutePath, "utf8") !== content) throw new Error(`${relativePath} is stale. Run npm run cf27:supported-subset-verifier-session.`);
  }
}

function createFiles(input) {
  const files = [
    jsonFile("session_manifest.json", input.sessionManifest),
    jsonFile("verifier_environment_template.json", input.verifierEnvironmentTemplate),
    csvFile("verifier_environment_template.csv", [input.verifierEnvironmentTemplate]),
    jsonFile("verifier_attestation_template.json", input.attestationTemplate),
    csvFile("verifier_attestation_template.csv", [input.attestationTemplate]),
    jsonFile("record_decisions_template.json", { rows: input.recordDecisionTemplate }),
    csvFile("record_decisions_template.csv", input.recordDecisionTemplate),
    jsonFile("candidate_detail_reference.json", { rows: input.records }),
    csvFile("candidate_detail_reference.csv", input.records.map((record) => ({
      candidateID: record.candidateID,
      category: record.category,
      claimedNativeLabel: record.claimedNativeLabel,
      claimedNativeIndex: record.claimedNativeIndex,
      claimedNativeOrder: record.claimedNativeOrder,
      evidenceSupportState: record.evidenceSupportState,
      sourceVideoIDs: record.sourceVideoIDs.join(";"),
      timestamps: record.exactEvidenceTimestamps.join(";"),
      frontViewEvidence: record.frontViewEvidence,
      secondarySampleRequired: record.deterministicSecondaryAngleSampleRequired ? "yes" : "no",
      productionEligibilityState: record.productionEligibilityState
    }))),
    jsonFile("menu_counts_template.json", { rows: input.menuCountTemplate }),
    csvFile("menu_counts_template.csv", input.menuCountTemplate),
    jsonFile("secondary_angle_sample_review.json", { rows: input.sampleRows }),
    csvFile("secondary_angle_sample_review.csv", input.sampleRows),
    jsonFile("excluded_duplicate_order_review.json", { rows: input.excludedIssueRows }),
    csvFile("excluded_duplicate_order_review.csv", input.excludedIssueRows),
    jsonFile("verifier_decision_export_template.json", input.packageWithHash),
    jsonFile("import_validation_status.json", {
      schemaVersion: `${schemaVersion}-import-status`,
      generatedAt,
      humanExecutionStatus: "READY_FOR_HUMAN_VERIFIER",
      importState: "NOT_STARTED",
      secondVerifierDecisionCount: 0,
      secondVerifiedRecords: 0,
      productionApprovedRecords: 0,
      productionCatalogRecords: 0,
      recommendationEligibleRecords: 0
    }),
    jsonFile("owner_checkpoint.json", {
      schemaVersion: `${schemaVersion}-owner-checkpoint`,
      generatedAt,
      status: "READY_FOR_HUMAN_VERIFIER",
      supportedSubsetQueueRecords: 76,
      deterministicSecondaryAngleSampleRecords: 24,
      noAdditionalOwnerMediaRequired: true,
      exactWyattAction: "Give the runbook and generated verifier package to a real second verifier. Do not record more game footage by default.",
      exactVerifierAction: "Complete the generated environment, attestation, menu-count, record-decision, and secondary-angle templates from independent shipping-game inspection."
    }),
    jsonFile("validation_report.json", input.validation)
  ];
  return files.map((file) => ({ ...file, relativePath: `${defaultOutputDirectory}/${file.fileName}` }));
}

function buildMenuCountTargets(records) {
  const represented = new Set(records.map((record) => record.category));
  return [
    "Heads",
    "Hairstyles",
    "Facial hair",
    "Nose",
    "Eye Shape",
    "Eye Color",
    "Skin Details",
    "Skin Tone",
    "Chin",
    "Jaw Shape",
    "Mouth Shape"
  ].map((category) => ({
    targetID: `cf27-supported-subset-count-${slug(category)}`,
    category,
    representedInSupportedSubset: represented.has(category) ? "yes" : "no",
    notes: category === "Facial hair"
      ? "Facial Hair is excluded from the supported subset; count inspection may document the limitation but must not add it to the subset."
      : "Record the independent count where observable in the shipping game. Unknown is acceptable only with notes and a blocking status."
  }));
}

function formatRunbook({ sessionManifest, summary }) {
  return `# CF27 Supported-Subset Verifier Runbook

**Status:** READY_FOR_HUMAN_VERIFIER
**Package:** \`${packageID}\`
**Generated:** ${generatedAt}
**Production data:** no
**Human decisions recorded by Codex:** no

## 1. Start the Local Tool

From the repository root:

\`\`\`bash
npm install
npm run cf27:supported-subset-verifier-session:check
npm run verifier:start
\`\`\`

Open the local verifier page at \`http://localhost:3000/verifier\`.

This route is local/development only. It loads the 76-record supported-subset package from \`${defaultOutputDirectory}\`, saves draft progress in the browser, and downloads a completed JSON export. It does not publish a catalog or enable recommendations.

## 2. Create a Verifier Session

On \`http://localhost:3000/verifier\`, enter your verifier name or ID and the visible game/console environment. Do not edit source media, catalog files, or package JSON by hand.

## 3. Environment Details To Collect

Record verifier ID, verification date, displayed game title, platform, console model, edition if known, region if known, game version, installed update if known, mode, creation path, account state, online state, environment differences, and evidence reference.

Use \`unknown\` only when the value cannot be established. Do not invent values.

## 4. Save and Resume

Progress saves automatically in the browser on this computer. If the page refreshes, reopen \`http://localhost:3000/verifier\` and continue. Do not clear browser site data until after the export is complete.

## 5. Inspect Evidence

Each verifier page record shows the claimed category, native label/index/order, source-video IDs, timestamps, derivative references, limitations, required front-view state, and whether it belongs to the deterministic secondary-angle sample.

## 6. Inspect the Shipping Game Independently

Use the shipping game, not memory and not the primary summary alone. Confirm native labels, indices, order, menu counts, front views, evidence-file existence, and the 24 sampled secondary-angle rows.

## 7. Enter Decisions

Every one of the 76 records must receive exactly one of:

${allowedVerificationStatuses.map((status) => `- \`${status}\``).join("\n")}

Clean \`VERIFIED\` still requires an independent observation. Any uncertain field or non-clean status requires notes.

## 8. Handle Uncertainty

If a label, count, order, view, environment value, or evidence file cannot be confirmed, use the appropriate blocking status and write notes. Do not guess. Do not request new Wyatt recordings by default.

## 9. Review the Deterministic Sample

Complete all 24 rows in \`secondary_angle_sample_review.csv/json\`. The sample method is \`${sessionManifest.verifierSessionModel.subsetVersion}\` with seed from Prompt 101; do not replace it with a more convenient sample.

## 10. Export and Return

When the final review screen says every required item is complete, choose **Export verifier package**. The browser downloads a file named like:

\`\`\`text
cf27-supported-subset-verifier-export-<verifier-id>-<verification-date>.json
\`\`\`

Wyatt should keep that file and later ask Codex to run Prompt 103. The export can be checked without importing or promoting records with:

\`\`\`bash
npm run cf27:supported-subset-verifier-session:validate-export -- ~/Downloads/cf27-supported-subset-verifier-export-<verifier-id>-<verification-date>.json
\`\`\`

A future import command will store valid decisions as non-production only. It will not publish a catalog.

## Expected Time

Plan for 2 to 4 focused hours depending on console access, environment metadata visibility, and how many rows require notes.

## Completion Checklist

- Environment completed.
- Attestation accepted.
- 76 record decisions completed.
- Independent menu counts completed where observable.
- 24 secondary-angle sample rows completed.
- Duplicate/order excluded rows reviewed as limitations, not recommendations.
- Disagreements recorded.
- No production approval entered.
`;
}

function formatStatusDocument({ sessionManifest, summary, validation }) {
  return `# CF27 Supported-Subset Human Verification Status

**Status:** READY_FOR_HUMAN_VERIFIER
**Generated:** ${generatedAt}
**Package:** \`${packageID}\`

## Counts

| Metric | Count |
| --- | ---: |
| Supported-subset queue records | 76 |
| Deterministic secondary-angle sample | 24 |
| Human verifier decisions | 0 |
| Second-verified records | 0 |
| Production-approved records | 0 |
| Production catalog records | 0 |
| Recommendation-eligible records | 0 |

## Scope

The verifier package operationalizes the Prompt 101 supported subset. It does not add the 16 limited-evidence records to the verifier subset. Duplicate/order-limited rows are listed separately for limitation review and remain non-production.

## Human Next Action

Wyatt must start the friend-ready local verifier workflow and provide it to a real independent verifier:

\`\`\`bash
npm run verifier:start
\`\`\`

Open:

\`\`\`text
http://localhost:3000/verifier
\`\`\`

The verifier must complete the environment, attestation, all 76 record decisions, menu counts, all 24 secondary-angle sample checks, and excluded duplicate/order limitation review from independent shipping-game inspection.

Friend instructions: \`docs/verification/HUMAN_VERIFIER_QUICK_START.md\`

Owner checklist: \`docs/verification/OWNER_VERIFIER_LAUNCH_CHECKLIST.md\`

## Software Next Action After Human Completion

Run the next prompt to import and reconcile the returned supported-subset verifier package. Valid imports must remain non-production until catalog-manager approval and production release gates pass.

## Validation

- Session package validation: ${validation.ok ? "PASS" : "FAIL"}
- Private-beta subset viability from Prompt 101: \`${summary.privateBetaSubsetViability}\`
- Owner media baseline remains locked; additional Wyatt recordings are not required by default.
`;
}

function hashExportPackage(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.integrityHash;
  return crypto.createHash("sha256").update(JSON.stringify(clone)).digest("hex");
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

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : Array.isArray(value) ? value.join(";") : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function writeText(root, relativePath, content) {
  const absolutePath = path.resolve(root, relativePath);
  const allowedRoots = [
    path.resolve(root, "data/phase-zero"),
    path.resolve(root, "docs/status")
  ];
  if (!allowedRoots.some((allowedRoot) => absolutePath === allowedRoot || absolutePath.startsWith(`${allowedRoot}${path.sep}`))) {
    throw new Error(`Refusing to write outside supported verifier outputs: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function readJSON(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function hasText(value) {
  return stringValue(value).trim().length > 0;
}

function stringValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function slug(value) {
  return stringValue(value).toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "unknown";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const validateExportIndex = process.argv.indexOf("--validate-export");
  if (validateExportIndex >= 0) {
    const exportPath = process.argv[validateExportIndex + 1];
    if (!exportPath) {
      console.error("Usage: npm run cf27:supported-subset-verifier-session:validate-export -- <path-to-export.json>");
      process.exit(1);
    }
    const absoluteExportPath = path.resolve(process.cwd(), exportPath);
    const exportPackage = readJSON(absoluteExportPath);
    const validation = validateCompletedVerifierDecisionExport(exportPackage);
    console.log(JSON.stringify(validation, null, 2));
    process.exit(validation.ok ? 0 : 1);
  }
  const result = buildSupportedSubsetVerifierSession();
  if (!result.validation.ok) {
    console.error(JSON.stringify(result.validation, null, 2));
    process.exit(1);
  }
  if (check) {
    try {
      checkSupportedSubsetVerifierSession(result);
      console.log("CF27 supported-subset verifier session package is current (76 records; 24 sampled angles).");
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  } else {
    writeSupportedSubsetVerifierSession(result);
    console.log("Wrote CF27 supported-subset verifier session package (76 records; READY_FOR_HUMAN_VERIFIER).");
  }
}
