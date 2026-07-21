#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_SECOND_VERIFIER_RESULTS_INTAKE_SCHEMA_VERSION = "cf27-second-verifier-results-intake-v1";
export const CF27_SECOND_VERIFIER_SUBMISSION_SCHEMA_VERSION = "phase0-second-verifier-results-submission-v1";
export const defaultIntakeDirectory = "data/phase-zero/second-verifier-results-intake";
export const defaultSubmissionDirectory = "data/phase-zero/second-verifier-submissions";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultResultsPath = `${defaultSubmissionDirectory}/verification_results.csv`;
const defaultMetadataPath = `${defaultSubmissionDirectory}/submission_metadata.json`;
const defaultImportedAt = "2026-07-14T04:30:00-04:00";

const requiredMetadataFields = [
  "verifierID",
  "verificationDate",
  "platform",
  "consoleModel",
  "gameVersion",
  "patch",
  "mode",
  "creationPath"
];

const allowedCheckStatuses = new Set(["confirmed", "mismatch", "notChecked", "notApplicable"]);
const approvedFinalDispositions = new Set([
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

const expectedResultColumns = [
  "assignment_id",
  "verifier_id",
  "target_stable_id",
  "category",
  "verification_scope",
  "verifier_native_order",
  "verifier_native_label",
  "verifier_count",
  "evidence_exists",
  "front_view_exists",
  "secondary_angle_sample_included",
  "native_order_status",
  "record_fields_status",
  "evidence_files_status",
  "front_view_status",
  "secondary_angle_status",
  "dependency_status",
  "exception_status",
  "final_disposition",
  "discrepancy_type",
  "resolution_action",
  "resolution_evidence_ids",
  "notes"
];

export function buildSecondVerifierResultsIntake({
  root = repositoryRoot,
  resultsCSV,
  submissionMetadata,
  importedAt = defaultImportedAt
} = {}) {
  const normalizedRoot = path.resolve(root);
  const assignment = readJSON(path.join(normalizedRoot, "data/phase-zero/verification_assignment.json"));
  const primaryEnvironment = readJSON(path.join(normalizedRoot, "data/phase-zero/environment_manifest.research.json"));
  const menuMap = readJSON(path.join(normalizedRoot, "data/phase-zero/menu_map.research.json"));
  const heads = readJSON(path.join(normalizedRoot, "data/phase-zero/heads.research.json"));
  const attributes = readJSON(path.join(normalizedRoot, "data/phase-zero/additional_attributes.research.json"));

  const errors = [];
  const warnings = [];
  const metadata = asRecord(submissionMetadata) ?? {};
  validateSubmissionMetadata(metadata, primaryEnvironment, errors, warnings);

  const parsed = parseResultsCSV(resultsCSV ?? "");
  errors.push(...parsed.errors);
  warnings.push(...parsed.warnings);
  const targetIndex = createPrimaryTargetIndex({ assignment, menuMap, heads, attributes });
  const assignmentID = stringValue(assignment.assignmentID);
  const expectedVerifierID = stringValue(metadata.verifierID);
  const records = [];
  const discrepancies = [];
  const unknownTargets = [];

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const target = targetIndex.get(row.target_stable_id);
    if (!target) {
      unknownTargets.push(row.target_stable_id);
      errors.push(issue("unknownTarget", `Row ${rowNumber} references a target not present in primary research assignment: ${row.target_stable_id}.`, row.target_stable_id));
    }
    if (assignmentID && row.assignment_id !== assignmentID) {
      errors.push(issue("assignmentMismatch", `Row ${rowNumber} assignment_id does not match ${assignmentID}.`, row.target_stable_id));
    }
    if (expectedVerifierID && row.verifier_id !== expectedVerifierID) {
      errors.push(issue("verifierIDMismatch", `Row ${rowNumber} verifier_id does not match submission metadata verifierID.`, row.target_stable_id));
    }
    validateResultRowShape(row, rowNumber, errors, warnings);

    const rowDiscrepancies = target ? compareVerifierRowToPrimary({
      row,
      rowNumber,
      target,
      metadata,
      importedAt
    }) : [];
    discrepancies.push(...rowDiscrepancies);
    records.push(createImportedRecord({
      row,
      rowNumber,
      target,
      rowDiscrepancies,
      importedAt
    }));
  });

  const metadataDiscrepancies = compareEnvironment(metadata, primaryEnvironment, importedAt);
  discrepancies.push(...metadataDiscrepancies);

  const unresolvedDiscrepancies = discrepancies.filter((discrepancy) => discrepancy.status === "OPEN_UNRESOLVED");
  const finalRecords = unresolvedDiscrepancies.length > 0
    ? records.map((record) => ({
      ...record,
      importedFinalDisposition: "NOT_VERIFIED",
      dispositionReason: "Unresolved discrepancies exist; VERIFIED dispositions are blocked until resolution."
    }))
    : records;
  const requiredSignOffPresent = hasRequiredSignOff(metadata);
  if (!requiredSignOffPresent) {
    errors.push(issue("missingRequiredSignOff", "Submission metadata must include required sign-off for independent counts, evidence review, and verifier signature."));
  }

  const intakeState = {
    schemaVersion: CF27_SECOND_VERIFIER_RESULTS_INTAKE_SCHEMA_VERSION,
    generatedAt: importedAt,
    importedAt,
    dataClass: "SECOND_VERIFIER_RESULTS_INTAKE",
    sourceType: "secondVerifierSubmission",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    assignmentID,
    verifierID: expectedVerifierID,
    verificationDate: stringValue(metadata.verificationDate),
    submissionMetadata: sanitizeMetadata(metadata),
    validation: {
      ok: errors.length === 0,
      importable: errors.length === 0 && parsed.rows.length > 0 && requiredSignOffPresent,
      errors,
      warnings
    },
    summary: {
      rowCount: parsed.rows.length,
      importedRecordCount: finalRecords.length,
      discrepancyCount: discrepancies.length,
      unresolvedDiscrepancyCount: unresolvedDiscrepancies.length,
      unknownTargetCount: unknownTargets.length,
      verifiedAssignedCount: finalRecords.filter((record) => record.importedFinalDisposition === "VERIFIED" || record.importedFinalDisposition === "VERIFIED_WITH_NOTES").length,
      verifiedBlockedByUnresolvedDiscrepancies: unresolvedDiscrepancies.length > 0
    },
    importedRecords: finalRecords,
    discrepancies,
    status: statusFor({ errors, parsedRows: parsed.rows, unresolvedDiscrepancies }),
    nextActions: nextActionsFor({ errors, parsedRows: parsed.rows, unresolvedDiscrepancies })
  };

  return {
    intakeState,
    files: createIntakeFiles(intakeState)
  };
}

export function writeSecondVerifierResultsIntake(result, {
  root = repositoryRoot,
  outputDirectory = defaultIntakeDirectory
} = {}) {
  const absoluteOutput = path.resolve(root, outputDirectory);
  const allowedRoot = path.resolve(root, "data/phase-zero");
  if (!absoluteOutput.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Refusing to write second-verifier intake outside data/phase-zero: ${outputDirectory}`);
  }
  fs.mkdirSync(absoluteOutput, { recursive: true });
  for (const file of result.files) {
    writeText(root, file.relativePath, file.content);
  }
}

function validateSubmissionMetadata(metadata, primaryEnvironment, errors, warnings) {
  if (metadata.schemaVersion !== CF27_SECOND_VERIFIER_SUBMISSION_SCHEMA_VERSION) {
    errors.push(issue("invalidSubmissionSchema", `Expected ${CF27_SECOND_VERIFIER_SUBMISSION_SCHEMA_VERSION}.`));
  }
  for (const field of requiredMetadataFields) {
    if (!hasUsableText(metadata[field])) errors.push(issue("missingSubmissionMetadata", `Submission metadata is missing ${field}.`));
  }
  if (hasUsableText(metadata.verificationDate) && Number.isNaN(Date.parse(metadata.verificationDate))) {
    errors.push(issue("invalidVerificationDate", "verificationDate must be parseable as a date."));
  }
  if (!Array.isArray(metadata.evidenceReferences) || metadata.evidenceReferences.length === 0) {
    errors.push(issue("missingSubmissionEvidence", "Submission metadata must include at least one evidence reference."));
  }
  for (const field of ["gameVersion", "patchVersion", "consoleModel"]) {
    if (!hasUsableText(primaryEnvironment[field])) {
      warnings.push(issue("primaryEnvironmentUnresolved", `Primary research environment has unresolved ${field}; compare verifier value manually before promotion.`));
    }
  }
}

function compareEnvironment(metadata, primaryEnvironment, importedAt) {
  const comparisons = [
    ["platform", metadata.platform, primaryEnvironment.platform],
    ["mode", metadata.mode, primaryEnvironment.gameMode],
    ["creationPath", metadata.creationPath, primaryEnvironment.appearanceEntryPoint],
    ["gameVersion", metadata.gameVersion, primaryEnvironment.gameVersion],
    ["patch", metadata.patch, primaryEnvironment.patchVersion],
    ["consoleModel", metadata.consoleModel, primaryEnvironment.consoleModel]
  ];
  return comparisons
    .filter(([, verifierValue, primaryValue]) => hasUsableText(verifierValue) && hasUsableText(primaryValue) && !sameValue(verifierValue, primaryValue))
    .map(([field, verifierValue, primaryValue]) => discrepancy({
      targetStableID: "environment",
      rowNumber: null,
      type: "environment_mismatch",
      primaryValue,
      verifierValue,
      evidenceIDs: metadata.evidenceReferences,
      importedAt,
      notes: `Verifier ${field} does not match primary research environment.`
    }));
}

function parseResultsCSV(csvText) {
  const errors = [];
  const warnings = [];
  const parsed = parseCSV(csvText);
  if (parsed.length === 0) {
    errors.push(issue("emptyResultsCSV", "Second-verifier results CSV is empty."));
    return { errors, warnings, rows: [] };
  }
  const header = parsed[0].map((column) => column.trim());
  const missing = expectedResultColumns.filter((column) => !header.includes(column));
  const extra = header.filter((column) => !expectedResultColumns.includes(column));
  if (missing.length > 0) errors.push(issue("missingResultColumns", `Results CSV is missing columns: ${missing.join(", ")}.`));
  if (extra.some((column) => column.toLowerCase().includes("primary"))) {
    errors.push(issue("primaryResultColumn", "Results CSV must not include primary-count or primary-native-order columns."));
  } else if (extra.length > 0) {
    warnings.push(issue("extraResultColumns", `Ignoring extra columns: ${extra.join(", ")}.`));
  }
  const rows = parsed.slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => Object.fromEntries(expectedResultColumns.map((column) => {
      const columnIndex = header.indexOf(column);
      return [column, columnIndex >= 0 ? row[columnIndex]?.trim() ?? "" : ""];
    })));
  if (rows.length === 0) errors.push(issue("noResultRows", "Results CSV contains no submitted rows."));
  return { errors, warnings, rows };
}

function validateResultRowShape(row, rowNumber, errors, warnings) {
  for (const field of ["assignment_id", "verifier_id", "target_stable_id", "category", "verification_scope", "final_disposition"]){
    if (!hasUsableText(row[field])) errors.push(issue("missingResultValue", `Row ${rowNumber} is missing ${field}.`, row.target_stable_id));
  }
  for (const field of ["native_order_status", "record_fields_status", "evidence_files_status", "front_view_status", "secondary_angle_status", "dependency_status", "exception_status"]) {
    if (!allowedCheckStatuses.has(row[field])) errors.push(issue("invalidCheckStatus", `Row ${rowNumber} ${field} must be confirmed, mismatch, notChecked, or notApplicable.`, row.target_stable_id));
  }
  if (!approvedFinalDispositions.has(row.final_disposition)) {
    errors.push(issue("invalidFinalDisposition", `Row ${rowNumber} final_disposition is not approved.`, row.target_stable_id));
  }
  if (requiresIndependentCount(row) && !hasUsableText(row.verifier_count)) {
    errors.push(issue("missingVerifierCount", `Row ${rowNumber} verifies a count target but is missing verifier_count.`, row.target_stable_id));
  } else if (requiresIndependentCount(row) && !Number.isFinite(Number(row.verifier_count))) {
    errors.push(issue("invalidVerifierCount", `Row ${rowNumber} verifier_count must be a number for count verification.`, row.target_stable_id));
  }
  if (!yes(row.evidence_exists)) warnings.push(issue("rowMissingEvidence", `Row ${rowNumber} says evidence is not present.`, row.target_stable_id));
}

function requiresIndependentCount(row) {
  const target = stringValue(row.target_stable_id).toLowerCase();
  const scope = stringValue(row.verification_scope).toLowerCase();
  return target.startsWith("count-") ||
    scope.includes("count") ||
    scope === "menumap" ||
    scope === "menu_map" ||
    scope === "native_order";
}

function compareVerifierRowToPrimary({ row, rowNumber, target, metadata, importedAt }) {
  const findings = [];
  if (hasUsableText(row.verifier_count) && Number(row.verifier_count) !== target.primaryCount && Number.isFinite(Number(row.verifier_count)) && target.primaryCount !== null) {
    findings.push(discrepancy({
      targetStableID: row.target_stable_id,
      rowNumber,
      type: "count_mismatch",
      primaryValue: String(target.primaryCount),
      verifierValue: row.verifier_count,
      evidenceIDs: idsFrom(row.resolution_evidence_ids, metadata.evidenceReferences),
      importedAt,
      notes: "Verifier count differs from current primary research count."
    }));
  }
  if (hasUsableText(row.verifier_native_order) && target.primaryNativeOrder !== null && Number(row.verifier_native_order) !== target.primaryNativeOrder) {
    findings.push(discrepancy({
      targetStableID: row.target_stable_id,
      rowNumber,
      type: "order_mismatch",
      primaryValue: String(target.primaryNativeOrder),
      verifierValue: row.verifier_native_order,
      evidenceIDs: idsFrom(row.resolution_evidence_ids, metadata.evidenceReferences),
      importedAt,
      notes: "Verifier native order differs from primary research order."
    }));
  }
  if (hasUsableText(row.verifier_native_label) && hasUsableText(target.primaryLabel) && !sameValue(row.verifier_native_label, target.primaryLabel)) {
    findings.push(discrepancy({
      targetStableID: row.target_stable_id,
      rowNumber,
      type: "visual_mismatch",
      primaryValue: target.primaryLabel,
      verifierValue: row.verifier_native_label,
      evidenceIDs: idsFrom(row.resolution_evidence_ids, metadata.evidenceReferences),
      importedAt,
      notes: "Verifier label or visual description differs from primary research label."
    }));
  }
  for (const [statusField, type, message] of [
    ["native_order_status", "order_mismatch", "Verifier marked native order mismatch."],
    ["record_fields_status", "visual_mismatch", "Verifier marked record-field mismatch."],
    ["evidence_files_status", "missing_evidence", "Verifier marked evidence-file mismatch."],
    ["front_view_status", "missing_evidence", "Verifier marked front-view mismatch."],
    ["secondary_angle_status", "missing_evidence", "Verifier marked secondary-angle mismatch."],
    ["dependency_status", "dependency_mismatch", "Verifier marked dependency mismatch."],
    ["exception_status", "menu_mismatch", "Verifier marked exception/menu mismatch."]
  ]) {
    if (row[statusField] === "mismatch") {
      findings.push(discrepancy({
        targetStableID: row.target_stable_id,
        rowNumber,
        type,
        primaryValue: target.primarySummary,
        verifierValue: row.notes || statusField,
        evidenceIDs: idsFrom(row.resolution_evidence_ids, metadata.evidenceReferences),
        importedAt,
        notes: message
      }));
    }
  }
  if (!yes(row.evidence_exists) || !yes(row.front_view_exists) || !yes(row.secondary_angle_sample_included)) {
    findings.push(discrepancy({
      targetStableID: row.target_stable_id,
      rowNumber,
      type: "missing_evidence",
      primaryValue: "required evidence present before verification",
      verifierValue: `evidence=${row.evidence_exists}; front=${row.front_view_exists}; secondary=${row.secondary_angle_sample_included}`,
      evidenceIDs: idsFrom(row.resolution_evidence_ids, metadata.evidenceReferences),
      importedAt,
      notes: "Verifier row is missing required evidence flags."
    }));
  }
  if (row.discrepancy_type && row.discrepancy_type !== "none") {
    findings.push(discrepancy({
      targetStableID: row.target_stable_id,
      rowNumber,
      type: normalizeDiscrepancyType(row.discrepancy_type),
      primaryValue: target.primarySummary,
      verifierValue: row.notes || row.discrepancy_type,
      evidenceIDs: idsFrom(row.resolution_evidence_ids, metadata.evidenceReferences),
      importedAt,
      notes: "Verifier explicitly reported a discrepancy."
    }));
  }
  return dedupeDiscrepancies(findings);
}

function createImportedRecord({ row, rowNumber, target, rowDiscrepancies, importedAt }) {
  const evidenceIDs = idsFrom(row.resolution_evidence_ids, []);
  const requestedFinalDisposition = row.final_disposition || "NOT_VERIFIED";
  return {
    verificationRecordID: `second-verifier-row-${String(rowNumber).padStart(3, "0")}-${slug(row.target_stable_id)}`,
    rowNumber,
    targetStableID: row.target_stable_id,
    category: row.category,
    verificationScope: row.verification_scope,
    primarySnapshot: target ? {
      sourceClass: target.sourceClass,
      primaryCount: target.primaryCount,
      primaryNativeOrder: target.primaryNativeOrder,
      primaryLabel: target.primaryLabel,
      primarySummary: target.primarySummary
    } : null,
    verifierObservation: {
      verifierID: row.verifier_id,
      observedAt: importedAt,
      nativeOrder: row.verifier_native_order,
      nativeLabel: row.verifier_native_label,
      verifierCount: row.verifier_count,
      evidenceExists: yes(row.evidence_exists),
      frontViewExists: yes(row.front_view_exists),
      secondaryAngleSampleIncluded: yes(row.secondary_angle_sample_included),
      checkStatuses: {
        nativeOrder: row.native_order_status,
        recordFields: row.record_fields_status,
        evidenceFiles: row.evidence_files_status,
        frontView: row.front_view_status,
        secondaryAngle: row.secondary_angle_status,
        dependency: row.dependency_status,
        exception: row.exception_status
      },
      evidenceIDs,
      notes: row.notes
    },
    requestedFinalDisposition,
    importedFinalDisposition: rowDiscrepancies.length > 0 ? "NOT_VERIFIED" : requestedFinalDisposition,
    dispositionReason: rowDiscrepancies.length > 0 ? "Row has unresolved discrepancies." : "No row-level discrepancy detected by automated intake.",
    discrepancyIDs: rowDiscrepancies.map((item) => item.discrepancyID)
  };
}

function createPrimaryTargetIndex({ assignment, menuMap, heads, attributes }) {
  const index = new Map();
  for (const record of menuMap.records ?? []) {
    if (record.recordType !== "menu") continue;
    index.set(record.stableMenuID, {
      sourceClass: "menu",
      primaryCount: numberOrNull(record.visibleValueCount),
      primaryNativeOrder: numberOrNull(record.nativeOrder),
      primaryLabel: stringValue(record.displayLabel),
      primarySummary: `${record.displayLabel ?? record.stableMenuID}; capture status ${record.captureStatus ?? "unknown"}.`
    });
  }
  for (const record of heads.records ?? []) {
    index.set(record.stableResearchCatalogID, {
      sourceClass: "head",
      primaryCount: null,
      primaryNativeOrder: numberOrNull(record.nativeOptionNumber ?? record.nativeOrder),
      primaryLabel: stringValue(record.visibleGameLabelOrIndex),
      primarySummary: `${record.visibleGameLabelOrIndex ?? record.stableResearchCatalogID}; verification ${record.verificationStatus ?? "unknown"}.`
    });
  }
  for (const record of attributes.records ?? []) {
    index.set(record.stableResearchCatalogID, {
      sourceClass: "additionalAttribute",
      primaryCount: null,
      primaryNativeOrder: numberOrNull(record.nativeOrder ?? record.nativeOptionNumber),
      primaryLabel: stringValue(record.nativeDisplayLabel),
      primarySummary: `${record.category ?? "Additional Attribute"} ${record.nativeDisplayLabel ?? record.stableResearchCatalogID}; verification ${record.verificationStatus ?? "unknown"}.`
    });
  }
  for (const form of assignment.independentCountingForms ?? []) {
    if (!index.has(form.targetID)) {
      index.set(form.targetID, {
        sourceClass: "countForm",
        primaryCount: null,
        primaryNativeOrder: null,
        primaryLabel: stringValue(form.label),
        primarySummary: `${form.label ?? form.targetID}; primary count intentionally withheld in assignment.`
      });
    }
  }
  return index;
}

function createIntakeFiles(intakeState) {
  return [
    jsonFile("verification_intake_state.json", intakeState),
    jsonFile("verification_intake_report.json", {
      schemaVersion: `${CF27_SECOND_VERIFIER_RESULTS_INTAKE_SCHEMA_VERSION}-report`,
      generatedAt: intakeState.generatedAt,
      status: intakeState.status,
      summary: intakeState.summary,
      validation: intakeState.validation,
      nextActions: intakeState.nextActions
    }),
    jsonFile("verification_discrepancies.json", {
      schemaVersion: `${CF27_SECOND_VERIFIER_RESULTS_INTAKE_SCHEMA_VERSION}-discrepancies`,
      generatedAt: intakeState.generatedAt,
      discrepancies: intakeState.discrepancies
    }),
    csvFile("verification_discrepancies.csv", intakeState.discrepancies, [
      "discrepancyID",
      "targetStableID",
      "rowNumber",
      "discrepancyType",
      "primaryValue",
      "verifierValue",
      "status",
      "severity",
      "evidenceIDs",
      "notes"
    ]),
    csvFile("verification_imported_records.csv", intakeState.importedRecords, [
      "verificationRecordID",
      "rowNumber",
      "targetStableID",
      "category",
      "requestedFinalDisposition",
      "importedFinalDisposition",
      "dispositionReason",
      "discrepancyIDs"
    ])
  ].map((file) => ({ ...file, relativePath: `${defaultIntakeDirectory}/${file.fileName}` }));
}

function discrepancy({ targetStableID, rowNumber, type, primaryValue, verifierValue, evidenceIDs, importedAt, notes }) {
  return {
    discrepancyID: `disc-${slug(targetStableID)}-${type}-${rowNumber ?? "environment"}`,
    targetStableID,
    rowNumber,
    discrepancyType: type,
    primaryValue: stringValue(primaryValue),
    verifierValue: stringValue(verifierValue),
    status: "OPEN_UNRESOLVED",
    severity: type === "missing_evidence" || type === "version_mismatch" || type === "environment_mismatch" ? "blocking" : "blocking",
    evidenceIDs: unique(idsFrom(evidenceIDs, [])),
    openedAt: importedAt,
    resolutionAction: null,
    notes
  };
}

function dedupeDiscrepancies(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.targetStableID}|${item.rowNumber}|${item.discrepancyType}|${item.primaryValue}|${item.verifierValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeDiscrepancyType(value) {
  const normalized = value.trim();
  const mapping = {
    labelMismatch: "visual_mismatch",
    versionMismatch: "version_mismatch",
    missingEvidence: "missing_evidence",
    countMismatch: "count_mismatch",
    orderMismatch: "order_mismatch",
    dependencyUnresolved: "dependency_mismatch",
    captureQuality: "visual_mismatch",
    menuNavigationMismatch: "menu_mismatch",
    other: "visual_mismatch"
  };
  return mapping[normalized] ?? normalized.replaceAll(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function hasRequiredSignOff(metadata) {
  const signOff = asRecord(metadata.signOff);
  if (!signOff) return false;
  return signOff.completedIndependentCounts === true &&
    signOff.evidenceReviewed === true &&
    signOff.discrepanciesLogged === true &&
    hasUsableText(signOff.signedBy) &&
    hasUsableText(signOff.signedAt) &&
    !Number.isNaN(Date.parse(signOff.signedAt));
}

function sanitizeMetadata(metadata) {
  return {
    schemaVersion: metadata.schemaVersion,
    verifierID: metadata.verifierID,
    verificationDate: metadata.verificationDate,
    platform: metadata.platform,
    consoleModel: metadata.consoleModel,
    gameVersion: metadata.gameVersion,
    patch: metadata.patch,
    mode: metadata.mode,
    creationPath: metadata.creationPath,
    evidenceReferences: Array.isArray(metadata.evidenceReferences) ? metadata.evidenceReferences : [],
    signOff: metadata.signOff ?? null
  };
}

function statusFor({ errors, parsedRows, unresolvedDiscrepancies }) {
  if (errors.length > 0) return "IMPORT_BLOCKED";
  if (parsedRows.length === 0) return "NO_RESULTS_SUBMITTED";
  if (unresolvedDiscrepancies.length > 0) return "DISCREPANCIES_OPENED";
  return "PENDING_CATALOG_MANAGER_REVIEW";
}

function nextActionsFor({ errors, parsedRows, unresolvedDiscrepancies }) {
  if (errors.length > 0) return ["Correct submission metadata or CSV format errors, then rerun intake."];
  if (parsedRows.length === 0) return ["Place completed verifier CSV and metadata JSON in data/phase-zero/second-verifier-submissions/."];
  if (unresolvedDiscrepancies.length > 0) return [
    "Review every open discrepancy with primary and verifier observations preserved.",
    "Collect new direct evidence or recapture files where required.",
    "Do not assign VERIFIED until discrepancies are resolved and acknowledged."
  ];
  return [
    "Review imported records manually before any production catalog promotion.",
    "Confirm no unresolved discrepancy exists before assigning VERIFIED statuses."
  ];
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      current = "";
      row = [];
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function jsonFile(fileName, value) {
  return { fileName, content: `${JSON.stringify(value, null, 2)}\n` };
}

function csvFile(fileName, rows, columns) {
  return {
    fileName,
    content: `${[
      columns.join(","),
      ...rows.map((row) => columns.map((column) => csvEscape(formatCSVValue(row[column]))).join(","))
    ].join("\n")}\n`
  };
}

function formatCSVValue(value) {
  if (Array.isArray(value)) return value.join(" | ");
  if (value === null || value === undefined) return "";
  return String(value);
}

function csvEscape(value) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, content) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function issue(code, message, entityID = undefined) {
  return { code, message, entityID };
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function hasUsableText(value) {
  return typeof value === "string" && value.trim().length > 0 && !/REPLACE_WITH_|TBD|TODO|PLACEHOLDER/i.test(value);
}

function stringValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sameValue(left, right) {
  return stringValue(left).trim().toLowerCase() === stringValue(right).trim().toLowerCase();
}

function yes(value) {
  return stringValue(value).trim().toLowerCase() === "yes";
}

function idsFrom(value, fallback) {
  if (Array.isArray(value)) return unique(value.map(stringValue).filter(Boolean));
  const parsed = stringValue(value).split(/[|;]/).map((item) => item.trim()).filter(Boolean);
  return parsed.length > 0 ? unique(parsed) : unique(Array.isArray(fallback) ? fallback.map(stringValue).filter(Boolean) : []);
}

function unique(values) {
  return [...new Set(values)];
}

function slug(value) {
  return stringValue(value).toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "unknown";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith("--")) {
      args.set(arg, process.argv[index + 1]?.startsWith("--") ? true : process.argv[index + 1] ?? true);
      if (typeof args.get(arg) === "string") index += 1;
    }
  }
  const resultsPath = path.resolve(repositoryRoot, stringValue(args.get("--input") || defaultResultsPath));
  const metadataPath = path.resolve(repositoryRoot, stringValue(args.get("--metadata") || defaultMetadataPath));
  if (!fs.existsSync(resultsPath) || !fs.existsSync(metadataPath)) {
    console.error(`Second-verifier submission not found. Expected CSV at ${path.relative(repositoryRoot, resultsPath)} and metadata at ${path.relative(repositoryRoot, metadataPath)}.`);
    process.exit(1);
  }
  const intake = buildSecondVerifierResultsIntake({
    resultsCSV: fs.readFileSync(resultsPath, "utf8"),
    submissionMetadata: readJSON(metadataPath),
    importedAt: defaultImportedAt
  });
  writeSecondVerifierResultsIntake(intake);
  console.log(JSON.stringify({
    status: intake.intakeState.status,
    rows: intake.intakeState.summary.rowCount,
    discrepancies: intake.intakeState.summary.discrepancyCount,
    errors: intake.intakeState.validation.errors.length,
    output: defaultIntakeDirectory
  }, null, 2));
  if (!intake.intakeState.validation.ok) process.exitCode = 1;
}
