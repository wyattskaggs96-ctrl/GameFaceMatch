import { approvedPhase0VerificationStatuses, type Phase0ApprovedVerificationStatus } from "./phase-zero-verification";

export const PHASE0_SECOND_VERIFIER_ASSIGNMENT_SCHEMA_VERSION = "phase0-second-verifier-assignment-v1";

export const phase0VerifierResultsColumns = [
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
] as const;

export type Phase0VerifierResultsColumn = (typeof phase0VerifierResultsColumns)[number];

export interface Phase0VerifierPackageIssue {
  code: string;
  message: string;
  rowNumber?: number;
  entityID?: string;
}

export interface Phase0VerifierPackageValidationReport {
  ok: boolean;
  importable: boolean;
  errors: Phase0VerifierPackageIssue[];
  warnings: Phase0VerifierPackageIssue[];
}

export type Phase0VerifierResultsRow = Record<Phase0VerifierResultsColumn, string>;

export interface Phase0VerifierResultsImportReport extends Phase0VerifierPackageValidationReport {
  rows: Phase0VerifierResultsRow[];
  rowCount: number;
}

const checkStatuses = new Set(["confirmed", "mismatch", "notChecked", "notApplicable"]);
const approvedStatusSet = new Set<string>(approvedPhase0VerificationStatuses);
const placeholderValues = new Set([
  "REPLACE_WITH_VERIFIER_ID",
  "REPLACE_WITH_TARGET_STABLE_ID",
  "REPLACE_WITH_CATEGORY"
]);

export function validateSecondVerifierAssignmentPackage(assignment: unknown): Phase0VerifierPackageValidationReport {
  const errors: Phase0VerifierPackageIssue[] = [];
  const warnings: Phase0VerifierPackageIssue[] = [];
  const value = asRecord(assignment);

  if (!value) {
    return finish(errors.concat(issue("invalidAssignment", "Verification assignment must be an object.")), warnings, false);
  }
  if (value.schemaVersion !== PHASE0_SECOND_VERIFIER_ASSIGNMENT_SCHEMA_VERSION) {
    errors.push(issue("invalidAssignmentSchema", `Expected ${PHASE0_SECOND_VERIFIER_ASSIGNMENT_SCHEMA_VERSION}.`));
  }
  if (value.productionStatus !== "NOT_PRODUCTION_DATA") {
    errors.push(issue("productionAssignment", "Second-verifier assignment must remain NOT_PRODUCTION_DATA."));
  }
  if (value.verificationStatus !== "NOT_VERIFIED") {
    errors.push(issue("assignmentClaimsVerification", "Verifier package must not claim verification has occurred."));
  }
  if (value.verificationHasOccurred !== false) {
    errors.push(issue("verificationAlreadyOccurred", "Assignment is a pre-verification handoff and must have verificationHasOccurred=false."));
  }
  if (value.primaryCountsWithheld !== true) {
    errors.push(issue("primaryCountsExposed", "Primary counts must be withheld until the verifier completes an independent count."));
  }
  if (value.noProductionRecommendationAccess !== true) {
    errors.push(issue("productionAccessNotBlocked", "Verifier package must explicitly block production recommendation access."));
  }

  validateCountingForms(asArray(value.independentCountingForms), errors);
  validateNativeOrderSheet(asArray(value.nativeOrderComparisonSheet), errors);
  validateAllowedStatusDefinitions(asRecord(value.allowedStatusDefinitions), errors);
  validateObjectArray(asArray(value.menuMapChecklist), "menuMapChecklist", warnings);
  validateObjectArray(asArray(value.headTemplateChecklist), "headTemplateChecklist", warnings);
  validateObjectArray(asArray(value.additionalAttributeChecklist), "additionalAttributeChecklist", warnings);
  validateObjectArray(asArray(value.evidenceReferenceLinks), "evidenceReferenceLinks", warnings);

  return finish(errors, warnings, false);
}

export function parseSecondVerifierResultsCSV(csvText: string): Phase0VerifierResultsImportReport {
  const errors: Phase0VerifierPackageIssue[] = [];
  const warnings: Phase0VerifierPackageIssue[] = [];
  const parsed = parseCSV(csvText);

  if (parsed.length === 0) {
    errors.push(issue("emptyCSV", "Verifier results CSV is empty."));
    return { ...finish(errors, warnings, false), rows: [], rowCount: 0 };
  }

  const header = parsed[0].map((column) => column.trim());
  const missingColumns = phase0VerifierResultsColumns.filter((column) => !header.includes(column));
  const extraColumns = header.filter((column) => !phase0VerifierResultsColumns.includes(column as Phase0VerifierResultsColumn));
  if (missingColumns.length > 0) {
    errors.push(issue("missingColumns", `Verifier results CSV is missing columns: ${missingColumns.join(", ")}.`));
  }
  if (extraColumns.some((column) => column.toLowerCase().includes("primary"))) {
    errors.push(issue("primaryDataColumn", "Verifier results CSV must not include primary count or primary native-order columns."));
  } else if (extraColumns.length > 0) {
    warnings.push(issue("extraColumns", `Ignoring extra columns: ${extraColumns.join(", ")}.`));
  }

  const rows = parsed.slice(1)
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => rowToObject(header, row));

  return { ...finish(errors, warnings, errors.length === 0), rows, rowCount: rows.length };
}

export function validateSecondVerifierResultsImport(csvText: string, assignment: unknown): Phase0VerifierResultsImportReport {
  const assignmentReport = validateSecondVerifierAssignmentPackage(assignment);
  const csvReport = parseSecondVerifierResultsCSV(csvText);
  const errors = [...assignmentReport.errors, ...csvReport.errors];
  const warnings = [...assignmentReport.warnings, ...csvReport.warnings];
  const assignmentRecord = asRecord(assignment);
  const assignmentID = typeof assignmentRecord?.assignmentID === "string" ? assignmentRecord.assignmentID : "";
  const knownTargets = collectAssignmentTargetIDs(assignment);
  const rows = csvReport.rows;

  rows.forEach((row, index) => {
    validateVerifierResultsRow(row, index + 2, assignmentID, knownTargets, errors, warnings);
  });

  const templateOnly = rows.length === 1 && isTemplateRow(rows[0]);
  if (templateOnly) {
    warnings.push(issue("templateOnly", "CSV contains the template placeholder row only; replace it before importing real verifier results.", 2));
  } else if (rows.length === 0) {
    errors.push(issue("noResultRows", "Verifier results CSV contains no result rows."));
  }

  return {
    ok: errors.length === 0,
    importable: errors.length === 0 && rows.length > 0 && !templateOnly,
    errors,
    warnings,
    rows,
    rowCount: rows.length
  };
}

export function collectAssignmentTargetIDs(assignment: unknown): Set<string> {
  const value = asRecord(assignment);
  const ids = new Set<string>();
  if (!value) return ids;

  for (const form of asArray(value.independentCountingForms)) {
    const record = asRecord(form);
    addID(ids, record?.targetID);
  }
  for (const record of asArray(value.menuMapChecklist)) {
    const item = asRecord(record);
    addID(ids, item?.stableMenuID);
  }
  for (const record of asArray(value.headTemplateChecklist)) {
    const item = asRecord(record);
    addID(ids, item?.stableResearchCatalogID);
  }
  for (const record of asArray(value.additionalAttributeChecklist)) {
    const item = asRecord(record);
    addID(ids, item?.stableResearchCatalogID);
  }
  for (const row of asArray(value.nativeOrderComparisonSheet)) {
    const item = asRecord(row);
    addID(ids, item?.stableResearchCatalogID);
  }
  return ids;
}

function validateCountingForms(forms: unknown[], errors: Phase0VerifierPackageIssue[]) {
  if (forms.length === 0) {
    errors.push(issue("missingIndependentCountingForms", "Assignment must include independent counting forms."));
  }
  forms.forEach((form, index) => {
    const record = asRecord(form);
    if (!record) {
      errors.push(issue("invalidCountingForm", "Independent counting form must be an object.", index + 1));
      return;
    }
    if (record.primaryCountHiddenUntilComparison !== true || record.comparePrimaryAfterSubmission !== true) {
      errors.push(issue("countFormPrimaryDataExposed", "Every independent counting form must withhold primary counts until comparison.", index + 1));
    }
    if ("primaryCount" in record || "primaryFinalCount" in record) {
      errors.push(issue("primaryCountFieldPresent", "Independent counting forms must not include primary count fields.", index + 1));
    }
  });
}

function validateNativeOrderSheet(rows: unknown[], errors: Phase0VerifierPackageIssue[]) {
  if (rows.length === 0) {
    errors.push(issue("missingNativeOrderSheet", "Assignment must include a native-order comparison sheet."));
  }
  rows.forEach((row, index) => {
    const record = asRecord(row);
    if (!record) {
      errors.push(issue("invalidNativeOrderRow", "Native-order row must be an object.", index + 1));
      return;
    }
    if (record.primaryNativeOrderMasked !== "WITHHELD_UNTIL_COMPARISON" || record.primaryLabelMasked !== "WITHHELD_UNTIL_COMPARISON") {
      errors.push(issue("nativeOrderPrimaryDataExposed", "Native-order comparison rows must mask primary values until comparison.", index + 1));
    }
    if ("primaryNativeOrder" in record || "primaryCount" in record) {
      errors.push(issue("nativeOrderPrimaryFieldPresent", "Native-order comparison sheet must not include unmasked primary fields.", index + 1));
    }
  });
}

function validateAllowedStatusDefinitions(definitions: Record<string, unknown> | null, errors: Phase0VerifierPackageIssue[]) {
  if (!definitions) {
    errors.push(issue("missingStatusDefinitions", "Assignment must include allowed status definitions."));
    return;
  }
  for (const status of approvedPhase0VerificationStatuses) {
    if (typeof definitions[status] !== "string" || definitions[status].trim().length === 0) {
      errors.push(issue("missingStatusDefinition", `Missing definition for ${status}.`));
    }
  }
}

function validateObjectArray(rows: unknown[], label: string, warnings: Phase0VerifierPackageIssue[]) {
  if (rows.length === 0) warnings.push(issue("emptyAssignmentSection", `${label} is empty.`));
}

function validateVerifierResultsRow(
  row: Phase0VerifierResultsRow,
  rowNumber: number,
  assignmentID: string,
  knownTargets: Set<string>,
  errors: Phase0VerifierPackageIssue[],
  warnings: Phase0VerifierPackageIssue[]
) {
  if (isTemplateRow(row)) return;
  if (assignmentID && row.assignment_id !== assignmentID) {
    errors.push(issue("assignmentMismatch", "Result row assignment_id does not match the verifier assignment.", rowNumber));
  }
  for (const field of ["verifier_id", "target_stable_id", "category", "verification_scope"] as const) {
    if (!hasUsableValue(row[field])) errors.push(issue("missingRequiredValue", `Missing ${field}.`, rowNumber, row.target_stable_id));
  }
  if (!knownTargets.has(row.target_stable_id)) {
    errors.push(issue("unknownTarget", "Result row target_stable_id is not present in the verifier assignment.", rowNumber, row.target_stable_id));
  }
  for (const field of [
    "native_order_status",
    "record_fields_status",
    "evidence_files_status",
    "front_view_status",
    "secondary_angle_status",
    "dependency_status",
    "exception_status"
  ] as const) {
    if (!checkStatuses.has(row[field])) {
      errors.push(issue("invalidCheckStatus", `${field} must be one of ${[...checkStatuses].join(", ")}.`, rowNumber, row.target_stable_id));
    }
  }
  if (!approvedStatusSet.has(row.final_disposition)) {
    errors.push(issue("invalidFinalDisposition", "final_disposition is not an approved Phase 0 verification status.", rowNumber, row.target_stable_id));
  }
  if ((row.final_disposition === "VERIFIED" || row.final_disposition === "VERIFIED_WITH_NOTES") && !hasStrictVerificationEvidence(row)) {
    errors.push(issue("verifiedWithoutEvidence", "VERIFIED dispositions require evidence_exists, front_view_exists, and secondary_angle_sample_included to be yes.", rowNumber, row.target_stable_id));
  }
  if (row.resolution_evidence_ids.trim().length === 0 && row.discrepancy_type !== "none") {
    warnings.push(issue("missingResolutionEvidence", "Discrepancy row should include resolution evidence IDs.", rowNumber, row.target_stable_id));
  }
}

function hasStrictVerificationEvidence(row: Phase0VerifierResultsRow) {
  return yes(row.evidence_exists) && yes(row.front_view_exists) && yes(row.secondary_angle_sample_included);
}

function isTemplateRow(row: Phase0VerifierResultsRow | undefined) {
  if (!row) return false;
  return placeholderValues.has(row.verifier_id) || placeholderValues.has(row.target_stable_id) || placeholderValues.has(row.category);
}

function parseCSV(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
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

function rowToObject(header: string[], row: string[]): Phase0VerifierResultsRow {
  return Object.fromEntries(phase0VerifierResultsColumns.map((column) => {
    const index = header.indexOf(column);
    return [column, index >= 0 ? row[index]?.trim() ?? "" : ""];
  })) as Phase0VerifierResultsRow;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function addID(ids: Set<string>, value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) ids.add(value.trim());
}

function hasUsableValue(value: string) {
  return value.trim().length > 0 && !placeholderValues.has(value.trim());
}

function yes(value: string) {
  return value.trim().toLowerCase() === "yes";
}

function finish(
  errors: Phase0VerifierPackageIssue[],
  warnings: Phase0VerifierPackageIssue[],
  importable: boolean
): Phase0VerifierPackageValidationReport {
  return { ok: errors.length === 0, importable: errors.length === 0 && importable, errors, warnings };
}

function issue(code: string, message: string, rowNumber?: number, entityID?: string): Phase0VerifierPackageIssue {
  return { code, message, rowNumber, entityID };
}
