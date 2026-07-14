#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_VERIFICATION_DISCREPANCY_MANAGER_SCHEMA_VERSION = "cf27-verification-discrepancy-manager-v1";
export const defaultDiscrepancyManagementDirectory = "data/phase-zero/verification-discrepancy-management";
export const defaultIntakeStatePath = "data/phase-zero/second-verifier-results-intake/verification_intake_state.json";
export const defaultResolutionEvidencePath = "data/phase-zero/verification-discrepancy-management/resolution_evidence.json";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultManagedAt = "2026-07-14T05:00:00-04:00";

const allowedStatuses = new Set([
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

export function buildVerificationDiscrepancyManagement({
  root = repositoryRoot,
  intakeState,
  resolutionEvidence = {},
  managedAt = defaultManagedAt
} = {}) {
  const normalizedRoot = path.resolve(root);
  const menuMap = readJSON(path.join(normalizedRoot, "data/phase-zero/menu_map.research.json"));
  const heads = readJSON(path.join(normalizedRoot, "data/phase-zero/heads.research.json"));
  const attributes = readJSON(path.join(normalizedRoot, "data/phase-zero/additional_attributes.research.json"));
  const targetIndex = createPrimaryEvidenceIndex({ menuMap, heads, attributes });
  const discrepancies = Array.isArray(intakeState?.discrepancies) ? intakeState.discrepancies : [];
  const resolutions = indexResolutions(resolutionEvidence);
  const resolutionTasks = discrepancies.map((discrepancy) => createResolutionTask({
    discrepancy,
    primaryTarget: targetIndex.get(discrepancy.targetStableID),
    resolution: resolutions.get(discrepancy.discrepancyID),
    managedAt
  }));
  const recordStatusUpdates = buildRecordStatusUpdates(resolutionTasks);
  const unresolvedTasks = resolutionTasks.filter((task) => task.resolutionState !== "RESOLVED_WITH_DIRECT_EVIDENCE");
  const resolvedTasks = resolutionTasks.filter((task) => task.resolutionState === "RESOLVED_WITH_DIRECT_EVIDENCE");
  const managerState = {
    schemaVersion: CF27_VERIFICATION_DISCREPANCY_MANAGER_SCHEMA_VERSION,
    generatedAt: managedAt,
    managedAt,
    dataClass: "VERIFICATION_DISCREPANCY_MANAGEMENT",
    sourceType: "secondVerifierDiscrepancyManagement",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    sourceIntakeStatus: intakeState?.status ?? "NO_INTAKE_STATE",
    rules: [
      "Never average counts.",
      "Never guess missing labels, counts, order, dependencies, or resolution.",
      "Resolve only discrepancies supported by direct evidence.",
      "Do not assign VERIFIED or VERIFIED_WITH_NOTES while unresolved discrepancies exist.",
      "Use only approved Phase 0 verification statuses."
    ],
    summary: {
      discrepancyCount: discrepancies.length,
      resolutionTaskCount: resolutionTasks.length,
      openTaskCount: unresolvedTasks.length,
      resolvedTaskCount: resolvedTasks.length,
      verifiedStatusBlocked: unresolvedTasks.length > 0,
      productionEligibleRecords: 0
    },
    resolutionTasks,
    recordStatusUpdates,
    validation: validateDiscrepancyManagement({ resolutionTasks, recordStatusUpdates })
  };
  return {
    managerState,
    files: createManagerFiles(managerState)
  };
}

export function writeVerificationDiscrepancyManagement(result, {
  root = repositoryRoot,
  outputDirectory = defaultDiscrepancyManagementDirectory
} = {}) {
  const absoluteOutput = path.resolve(root, outputDirectory);
  const allowedRoot = path.resolve(root, "data/phase-zero");
  if (!absoluteOutput.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Refusing to write discrepancy management outside data/phase-zero: ${outputDirectory}`);
  }
  fs.mkdirSync(absoluteOutput, { recursive: true });
  for (const file of result.files) writeText(root, file.relativePath, file.content);
}

function createResolutionTask({ discrepancy, primaryTarget, resolution, managedAt }) {
  const statusIfUnresolved = statusForDiscrepancy(discrepancy.discrepancyType);
  const requestedStatus = sanitizeStatus(resolution?.status);
  const directResolutionEvidenceIDs = ids(resolution?.resolutionEvidenceIDs);
  const primaryAcknowledgment = stringValue(resolution?.primaryAcknowledgedAt);
  const verifierAcknowledgment = stringValue(resolution?.verifierAcknowledgedAt);
  const directEvidenceProvided = directResolutionEvidenceIDs.length > 0;
  const acknowledgmentsComplete = Boolean(parseableDate(primaryAcknowledgment) && parseableDate(verifierAcknowledgment));
  const canResolve = Boolean(resolution && requestedStatus && directEvidenceProvided && acknowledgmentsComplete);
  const resolutionState = canResolve ? "RESOLVED_WITH_DIRECT_EVIDENCE" : "OPEN_RECHECK_REQUIRED";
  const finalStatus = canResolve ? requestedStatus : statusIfUnresolved;
  const primaryEvidenceIDs = primaryTarget?.evidenceIDs ?? [];
  const verifierEvidenceIDs = ids(discrepancy.evidenceIDs);
  const supersededEvidenceIDs = unique([...primaryEvidenceIDs, ...verifierEvidenceIDs]);

  return {
    taskID: `resolution-task-${slug(discrepancy.discrepancyID)}`,
    discrepancyID: discrepancy.discrepancyID,
    targetStableID: discrepancy.targetStableID,
    exactDisputedOption: primaryTarget?.label ?? discrepancy.targetStableID,
    discrepancyType: discrepancy.discrepancyType,
    openedAt: discrepancy.openedAt ?? managedAt,
    currentStatus: finalStatus,
    resolutionState,
    primaryObservation: {
      observer: "primary-research",
      value: stringValue(discrepancy.primaryValue),
      summary: primaryTarget?.summary ?? stringValue(discrepancy.primaryValue),
      evidenceIDs: primaryEvidenceIDs
    },
    verifierObservation: {
      observer: "second-verifier",
      value: stringValue(discrepancy.verifierValue),
      summary: stringValue(discrepancy.notes || discrepancy.verifierValue),
      evidenceIDs: verifierEvidenceIDs
    },
    evidenceOnBothSides: {
      primaryEvidenceIDs,
      verifierEvidenceIDs,
      bothSidesHaveEvidence: primaryEvidenceIDs.length > 0 && verifierEvidenceIDs.length > 0
    },
    requiredConsoleRecheck: consoleRecheckFor(discrepancy),
    requiredRecapture: recaptureFor(discrepancy, primaryTarget),
    resolutionTask: {
      ownerRole: "catalog-manager",
      requiredAction: "Perform the console recheck and recapture listed here, then record direct resolution evidence without averaging observations.",
      mayResolveAutomatically: false,
      directEvidenceRequired: true,
      requiredStatusVocabulary: [...allowedStatuses]
    },
    supersededEvidenceIDs,
    resolutionEvidenceIDs: directResolutionEvidenceIDs,
    acknowledgment: {
      primaryRequired: true,
      verifierRequired: true,
      primaryAcknowledgedAt: primaryAcknowledgment || null,
      verifierAcknowledgedAt: verifierAcknowledgment || null,
      acknowledgmentsComplete
    },
    resolution: resolution ? {
      proposedStatus: requestedStatus,
      resolutionEvidenceIDs: directResolutionEvidenceIDs,
      resolutionNotes: stringValue(resolution.resolutionNotes),
      accepted: canResolve,
      rejectionReason: canResolve ? "" : "Resolution requires an approved status, direct evidence, and both-party acknowledgments."
    } : null,
    notes: canResolve
      ? "Resolved with supplied direct evidence and both-party acknowledgment."
      : "Open discrepancy. Do not assign VERIFIED until direct evidence and acknowledgments are recorded."
  };
}

function buildRecordStatusUpdates(tasks) {
  const grouped = new Map();
  for (const task of tasks) {
    const existing = grouped.get(task.targetStableID) ?? {
      targetStableID: task.targetStableID,
      status: "NOT_VERIFIED",
      sourceDiscrepancyIDs: [],
      unresolvedDiscrepancyIDs: [],
      resolvedDiscrepancyIDs: [],
      reason: ""
    };
    existing.sourceDiscrepancyIDs.push(task.discrepancyID);
    if (task.resolutionState === "RESOLVED_WITH_DIRECT_EVIDENCE") {
      existing.resolvedDiscrepancyIDs.push(task.discrepancyID);
    } else {
      existing.unresolvedDiscrepancyIDs.push(task.discrepancyID);
    }
    existing.status = existing.unresolvedDiscrepancyIDs.length > 0 ? nonVerifiedStatus(existing.status, task.currentStatus) : task.currentStatus;
    existing.reason = existing.unresolvedDiscrepancyIDs.length > 0
      ? "Unresolved discrepancies remain; VERIFIED and VERIFIED_WITH_NOTES are blocked."
      : "All tracked discrepancies for this target are resolved with direct evidence.";
    grouped.set(task.targetStableID, existing);
  }
  return [...grouped.values()].sort((first, second) => first.targetStableID.localeCompare(second.targetStableID));
}

function validateDiscrepancyManagement({ resolutionTasks, recordStatusUpdates }) {
  const errors = [];
  const warnings = [];
  for (const task of resolutionTasks) {
    if (!allowedStatuses.has(task.currentStatus)) errors.push(issue("invalidTaskStatus", `${task.taskID} uses unsupported status ${task.currentStatus}.`, task.taskID));
    if (task.resolutionState !== "RESOLVED_WITH_DIRECT_EVIDENCE" && (task.currentStatus === "VERIFIED" || task.currentStatus === "VERIFIED_WITH_NOTES")) {
      errors.push(issue("verifiedWithUnresolvedDiscrepancy", `${task.taskID} cannot be verified while unresolved.`, task.taskID));
    }
    if (!task.primaryObservation.value || !task.verifierObservation.value) {
      errors.push(issue("missingPreservedObservation", `${task.taskID} must preserve primary and verifier observations.`, task.taskID));
    }
    if (task.evidenceOnBothSides.primaryEvidenceIDs.length === 0) warnings.push(issue("missingPrimaryEvidenceReference", `${task.taskID} has no primary evidence reference.`, task.taskID));
    if (task.evidenceOnBothSides.verifierEvidenceIDs.length === 0) warnings.push(issue("missingVerifierEvidenceReference", `${task.taskID} has no verifier evidence reference.`, task.taskID));
    if (task.resolution && !task.resolution.accepted && task.resolution.proposedStatus && (task.resolution.proposedStatus === "VERIFIED" || task.resolution.proposedStatus === "VERIFIED_WITH_NOTES")) {
      warnings.push(issue("proposedVerifiedRejected", `${task.taskID} proposed verified status was rejected until direct evidence and acknowledgments exist.`, task.taskID));
    }
  }
  for (const update of recordStatusUpdates) {
    if (!allowedStatuses.has(update.status)) errors.push(issue("invalidRecordStatus", `${update.targetStableID} update uses unsupported status ${update.status}.`, update.targetStableID));
    if (update.unresolvedDiscrepancyIDs.length > 0 && (update.status === "VERIFIED" || update.status === "VERIFIED_WITH_NOTES")) {
      errors.push(issue("recordVerifiedWithUnresolvedDiscrepancy", `${update.targetStableID} cannot be verified while discrepancies remain.`, update.targetStableID));
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function createPrimaryEvidenceIndex({ menuMap, heads, attributes }) {
  const index = new Map();
  for (const record of menuMap.records ?? []) {
    if (record.recordType !== "menu") continue;
    index.set(record.stableMenuID, {
      label: record.displayLabel,
      summary: `${record.displayLabel}; ${record.captureStatus ?? "unknown"}; ${record.countStatus ?? "unknown"}.`,
      evidenceIDs: ids((record.evidence ?? []).map((item) => item.evidenceID))
    });
  }
  for (const record of heads.records ?? []) {
    index.set(record.stableResearchCatalogID, {
      label: record.visibleGameLabelOrIndex ?? record.nativeLabel ?? record.stableResearchCatalogID,
      summary: `${record.visibleGameLabelOrIndex ?? record.stableResearchCatalogID}; ${record.verificationStatus ?? "unknown"}.`,
      evidenceIDs: ids([
        record.evidenceID,
        record.evidenceFrame?.evidenceID,
        record.fullScreenEvidence?.evidenceID,
        ...(record.sourceObservations ?? []).map((item) => item.evidenceID)
      ])
    });
  }
  for (const record of attributes.records ?? []) {
    index.set(record.stableResearchCatalogID, {
      label: record.nativeDisplayLabel ?? record.stableResearchCatalogID,
      summary: `${record.category ?? "attribute"} ${record.nativeDisplayLabel ?? record.stableResearchCatalogID}; ${record.verificationStatus ?? "unknown"}.`,
      evidenceIDs: ids([
        record.evidenceID,
        record.evidenceFrame?.evidenceID,
        ...(record.sourceObservations ?? []).map((item) => item.evidenceID)
      ])
    });
  }
  return index;
}

function consoleRecheckFor(discrepancy) {
  const type = discrepancy.discrepancyType;
  if (type === "count_mismatch") return "On console, navigate to the disputed category, start at the first selectable value, count every selected value in native order twice, and record first/final/wrap evidence.";
  if (type === "order_mismatch") return "On console, navigate to the disputed option and the neighboring values before and after it; record continuous movement proving native order.";
  if (type === "version_mismatch" || type === "environment_mismatch") return "Record title/version/update screens and the exact Road to Glory creation path before rechecking the disputed option.";
  if (type === "dependency_mismatch") return "Repeat the disputed option check while changing only the named dependency variable; record baseline, changed variable, and resulting count/order/label behavior.";
  if (type === "menu_mismatch") return "Record the parent menu, submenu entry, control type, and any locks/warnings from a cold navigation path.";
  return "Re-open the disputed option on console, pause on the selected value, and record direct menu evidence plus notes for any mismatch.";
}

function recaptureFor(discrepancy, primaryTarget) {
  const base = {
    required: true,
    targetStableID: discrepancy.targetStableID,
    preserveNativeMenuLabel: true,
    preserveOriginalEvidence: true,
    requiredViews: ["MENU_FULL_SCREEN"],
    notes: "Do not overwrite prior evidence; new files are resolution evidence."
  };
  if (discrepancy.discrepancyType === "visual_mismatch") {
    return {
      ...base,
      requiredViews: ["MENU_FULL_SCREEN", "FRONT", "LEFT_3Q", "RIGHT_3Q"],
      notes: "Capture standardized visual views because the primary and verifier visual observations differ."
    };
  }
  if (discrepancy.discrepancyType === "missing_evidence") {
    return {
      ...base,
      requiredViews: ["MENU_FULL_SCREEN", "FRONT", "SECONDARY_ANGLE_SAMPLE"],
      notes: "Capture missing evidence flags identified by verifier."
    };
  }
  return {
    ...base,
    requiredViews: primaryTarget?.label?.includes("Head") ? ["MENU_FULL_SCREEN", "FIRST_VALUE_PROOF", "FINAL_VALUE_PROOF", "WRAP_OR_NO_WRAP_PROOF"] : ["MENU_FULL_SCREEN", "SELECTED_VALUE"],
    notes: "Capture direct proof sufficient to resolve the specific discrepancy."
  };
}

function statusForDiscrepancy(type) {
  const mapping = {
    count_mismatch: "COUNT_MISMATCH",
    order_mismatch: "ORDER_MISMATCH",
    version_mismatch: "VERSION_MISMATCH",
    environment_mismatch: "VERSION_MISMATCH",
    missing_evidence: "MISSING_EVIDENCE",
    dependency_mismatch: "DEPENDENCY_UNRESOLVED",
    menu_mismatch: "NOT_VERIFIED",
    visual_mismatch: "RECAPTURE_REQUIRED"
  };
  return mapping[type] ?? "NOT_VERIFIED";
}

function nonVerifiedStatus(existingStatus, candidateStatus) {
  if (existingStatus === "MISSING_EVIDENCE" || candidateStatus === "MISSING_EVIDENCE") return "MISSING_EVIDENCE";
  if (existingStatus === "VERSION_MISMATCH" || candidateStatus === "VERSION_MISMATCH") return "VERSION_MISMATCH";
  if (existingStatus === "COUNT_MISMATCH" || candidateStatus === "COUNT_MISMATCH") return "COUNT_MISMATCH";
  if (existingStatus === "ORDER_MISMATCH" || candidateStatus === "ORDER_MISMATCH") return "ORDER_MISMATCH";
  if (existingStatus === "DEPENDENCY_UNRESOLVED" || candidateStatus === "DEPENDENCY_UNRESOLVED") return "DEPENDENCY_UNRESOLVED";
  if (existingStatus === "RECAPTURE_REQUIRED" || candidateStatus === "RECAPTURE_REQUIRED") return "RECAPTURE_REQUIRED";
  return "NOT_VERIFIED";
}

function sanitizeStatus(value) {
  const status = stringValue(value);
  return allowedStatuses.has(status) ? status : "";
}

function indexResolutions(input) {
  const rows = Array.isArray(input?.resolutions) ? input.resolutions : [];
  return new Map(rows.map((resolution) => [resolution.discrepancyID, resolution]));
}

function createManagerFiles(managerState) {
  return [
    jsonFile("verification_discrepancy_management.json", managerState),
    jsonFile("verification_resolution_tasks.json", {
      schemaVersion: `${CF27_VERIFICATION_DISCREPANCY_MANAGER_SCHEMA_VERSION}-tasks`,
      generatedAt: managerState.generatedAt,
      tasks: managerState.resolutionTasks
    }),
    csvFile("verification_resolution_tasks.csv", managerState.resolutionTasks, [
      "taskID",
      "discrepancyID",
      "targetStableID",
      "exactDisputedOption",
      "discrepancyType",
      "currentStatus",
      "resolutionState",
      "supersededEvidenceIDs",
      "resolutionEvidenceIDs",
      "notes"
    ]),
    csvFile("verification_record_status_updates.csv", managerState.recordStatusUpdates, [
      "targetStableID",
      "status",
      "sourceDiscrepancyIDs",
      "unresolvedDiscrepancyIDs",
      "resolvedDiscrepancyIDs",
      "reason"
    ])
  ].map((file) => ({ ...file, relativePath: `${defaultDiscrepancyManagementDirectory}/${file.fileName}` }));
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

function ids(value) {
  if (Array.isArray(value)) return unique(value.flatMap((item) => ids(item)));
  if (!value) return [];
  return [String(value)].filter((item) => item.trim().length > 0);
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function stringValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function slug(value) {
  return stringValue(value).toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || "unknown";
}

function parseableDate(value) {
  return stringValue(value).trim().length > 0 && !Number.isNaN(Date.parse(value));
}

function issue(code, message, entityID = undefined) {
  return { code, message, entityID };
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, content) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
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
  const inputPath = path.resolve(repositoryRoot, stringValue(args.get("--input") || defaultIntakeStatePath));
  const resolutionPath = path.resolve(repositoryRoot, stringValue(args.get("--resolution-evidence") || defaultResolutionEvidencePath));
  if (!fs.existsSync(inputPath)) {
    console.error(`Verification discrepancy intake state not found: ${path.relative(repositoryRoot, inputPath)}.`);
    process.exit(1);
  }
  const resolutionEvidence = fs.existsSync(resolutionPath) ? readJSON(resolutionPath) : {};
  const result = buildVerificationDiscrepancyManagement({
    intakeState: readJSON(inputPath),
    resolutionEvidence
  });
  writeVerificationDiscrepancyManagement(result);
  console.log(JSON.stringify({
    status: result.managerState.summary.openTaskCount > 0 ? "OPEN_DISCREPANCIES" : "NO_OPEN_DISCREPANCIES",
    tasks: result.managerState.summary.resolutionTaskCount,
    open: result.managerState.summary.openTaskCount,
    resolved: result.managerState.summary.resolvedTaskCount,
    errors: result.managerState.validation.errors.length,
    output: defaultDiscrepancyManagementDirectory
  }, null, 2));
  if (!result.managerState.validation.ok) process.exitCode = 1;
}
