#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_CATALOG_COUNT_ORDER_AUDIT_SCHEMA_VERSION = "cf27-catalog-count-order-audit-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T06:15:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";

const defaultHeadsPath = "data/phase-zero/heads.research.json";
const defaultAdditionalAttributesPath = "data/phase-zero/additional_attributes.research.json";
const defaultHairstylesPath = "data/phase-zero/hairstyles.research.json";
const defaultHairColorsPath = "data/phase-zero/hair_colors.research.json";
const defaultFacialHairPath = "data/phase-zero/facial_hair.research.json";
const defaultFacialHairColorsPath = "data/phase-zero/facial_hair_colors.research.json";
const defaultBodyControlsPath = "data/phase-zero/body_controls.research.json";
const defaultOutputJsonPath = "data/phase-zero/catalog_count_order_audit.research.json";
const defaultOutputCsvPath = "data/phase-zero/catalog_count_order_audit.research.csv";
const defaultMarkdownPath = "docs/phase-zero/CATALOG_COUNT_AND_NATIVE_ORDER_AUDIT.md";

const requiredCheckIDs = [
  "beginningBoundary",
  "endingBoundary",
  "twoCompleteCounts",
  "nativeOrderContinuity",
  "missingIndices",
  "repeatedIndices",
  "duplicateInternalIDs",
  "continuityOverlaps",
  "wrappingBehavior",
  "countMatchesRecordTotal",
  "evidenceForEveryClaimedOption",
  "unprovenFinalOptionClaims"
];

export function generateCatalogCountOrderAudit(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const heads = readJson(path.resolve(root, options.headsPath ?? defaultHeadsPath));
  const additionalAttributes = readJson(path.resolve(root, options.additionalAttributesPath ?? defaultAdditionalAttributesPath));
  const hairstyles = readJson(path.resolve(root, options.hairstylesPath ?? defaultHairstylesPath));
  const hairColors = readJson(path.resolve(root, options.hairColorsPath ?? defaultHairColorsPath));
  const facialHair = readJson(path.resolve(root, options.facialHairPath ?? defaultFacialHairPath));
  const facialHairColors = readJson(path.resolve(root, options.facialHairColorsPath ?? defaultFacialHairColorsPath));
  const bodyControls = readJson(path.resolve(root, options.bodyControlsPath ?? defaultBodyControlsPath));

  const categories = [
    auditHeadTemplate(heads),
    ...auditAdditionalAttributes(additionalAttributes),
    auditZeroRecordCategory("Hairstyles", hairstyles, "hairstyle"),
    auditZeroRecordCategory("Hair Color", hairColors, "hairColor"),
    auditZeroRecordCategory("Facial Hair", facialHair, "facialHair"),
    auditZeroRecordCategory("Facial-Hair Color", facialHairColors, "facialHairColor"),
    auditBodyControls(bodyControls)
  ].map(finalizeCategory);

  const blockingIssues = categories.flatMap((category) => category.blockingIssues.map((issue) => ({
    categoryID: category.categoryID,
    categoryLabel: category.categoryLabel,
    ...issue
  })));

  return {
    schemaVersion: CF27_CATALOG_COUNT_ORDER_AUDIT_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_COUNT_NATIVE_ORDER_AUDIT",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceFiles: {
      heads: options.headsPath ?? defaultHeadsPath,
      additionalAttributes: options.additionalAttributesPath ?? defaultAdditionalAttributesPath,
      hairstyles: options.hairstylesPath ?? defaultHairstylesPath,
      hairColors: options.hairColorsPath ?? defaultHairColorsPath,
      facialHair: options.facialHairPath ?? defaultFacialHairPath,
      facialHairColors: options.facialHairColorsPath ?? defaultFacialHairColorsPath,
      bodyControls: options.bodyControlsPath ?? defaultBodyControlsPath
    },
    policy: {
      requiredCheckIDs,
      completeRule: "A category is COMPLETE only when every required count/native-order check passes or is not applicable.",
      incompleteRule: "Any FAIL, UNKNOWN, or NOT_PROVEN result keeps the category INCOMPLETE.",
      noInferenceRule: "Missing indices, totals, final options, wrapping, and boundaries are not inferred from neighboring thumbnails or partial traversal."
    },
    summary: {
      categoryCount: categories.length,
      completeCategoryCount: categories.filter((category) => category.categoryCompletionStatus === "COMPLETE").length,
      incompleteCategoryCount: categories.filter((category) => category.categoryCompletionStatus === "INCOMPLETE").length,
      hardFailureCategoryCount: categories.filter((category) => category.hasHardFailures).length,
      productionEligibleCategoryCount: 0,
      blockingIssueCount: blockingIssues.length
    },
    categories,
    blockingIssues
  };
}

export function writeCatalogCountOrderAudit(report, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatCategoryCsv(report.categories));
  writeText(root, options.markdownPath ?? defaultMarkdownPath, formatMarkdown(report));
}

function auditHeadTemplate(heads) {
  const records = heads.records ?? [];
  const orders = numericOrders(records);
  const missing = missingInRange(orders);
  const duplicateIDs = duplicates(records.map(stableIDFor));
  const repeated = heads.continuityReport?.duplicateObservationNumbers ?? repeatedObservationOrders(records);
  const overlaps = heads.continuityReport?.overlaps ?? [];
  const unprovenFinal = heads.selectorBoundaryProof?.face29Finality === "FINAL_CAPTURED_OPTION_ONLY_NOT_FINAL_GAME_OPTION";
  return {
    categoryID: "head-template",
    categoryLabel: "Head Template",
    sourceFile: defaultHeadsPath,
    recordCount: records.length,
    claimedTotal: null,
    claimedTotalStatus: "COUNT_UNKNOWN",
    nativeOrders: orders,
    checks: {
      beginningBoundary: result(heads.selectorBoundaryProof?.beginningProven ? "PASS" : "NOT_PROVEN", heads.selectorBoundaryProof?.beginningProof ?? "Beginning boundary is not proven."),
      endingBoundary: result(heads.selectorBoundaryProof?.endProven ? "PASS" : "NOT_PROVEN", heads.selectorBoundaryProof?.endProof ?? "Ending boundary is not proven."),
      twoCompleteCounts: result("NOT_PROVEN", "Two complete independent counts are not available."),
      nativeOrderContinuity: result(missing.length === 0 ? "PASS" : "FAIL", missing.length === 0 ? "Native-order range has no gaps." : `Missing native indices within observed range: ${missing.join(", ")}.`),
      missingIndices: result(missing.length === 0 ? "PASS" : "FAIL", missing.length === 0 ? "No missing indices inside observed range." : `Missing indices: ${missing.join(", ")}.`, { missingIndices: missing }),
      repeatedIndices: result(repeated.length === 0 ? "PASS" : "FAIL", repeated.length === 0 ? "No repeated selected indices." : `Repeated selected indices: ${repeated.join(", ")}.`, { repeatedIndices: repeated }),
      duplicateInternalIDs: result(duplicateIDs.length === 0 ? "PASS" : "FAIL", duplicateIDs.length === 0 ? "No duplicate internal IDs." : `Duplicate internal IDs: ${duplicateIDs.join(", ")}.`, { duplicateInternalIDs: duplicateIDs }),
      continuityOverlaps: result(overlaps.length > 0 && overlaps.some((overlap) => overlap.nativeNumber === 12) ? "PASS_WITH_NOTES" : "NOT_PROVEN", overlaps.length > 0 ? "Continuity overlaps are recorded; Face 12 is preserved as overlap evidence." : "No continuity overlap proof is recorded.", { overlaps }),
      wrappingBehavior: result(heads.selectorBoundaryProof?.wrapShown ? "PASS" : "NOT_PROVEN", heads.selectorBoundaryProof?.wrapProof ?? "Wrapping behavior is not proven."),
      countMatchesRecordTotal: result("UNKNOWN", "No total count is claimed, so count cannot be matched to record total."),
      evidenceForEveryClaimedOption: evidenceCheck(records),
      unprovenFinalOptionClaims: result(unprovenFinal ? "FAIL" : "PASS", unprovenFinal ? heads.selectorBoundaryProof?.face29FinalityReason : "No unproven final-option claim is present.")
    }
  };
}

function auditAdditionalAttributes(packageData) {
  return (packageData.categories ?? []).map((category) => {
    const records = (packageData.records ?? []).filter((record) => record.category === category.category);
    const orders = numericOrders(records);
    const missing = category.missingObservedRangeValues ?? missingInRange(orders);
    const duplicateIDs = duplicates(records.map(stableIDFor));
    const repeated = category.duplicateObservedValues?.map((label) => records.find((record) => record.nativeDisplayLabel === label)?.nativeOrder).filter(Number.isFinite) ?? repeatedObservationOrders(records);
    const totalKnown = Number.isFinite(category.totalCount);
    return {
      categoryID: slugify(category.category),
      categoryLabel: category.category,
      sourceFile: defaultAdditionalAttributesPath,
      recordCount: records.length,
      claimedTotal: category.totalCount ?? null,
      claimedTotalStatus: category.totalCountStatus ?? "COUNT_UNKNOWN",
      nativeOrders: orders,
      checks: {
        beginningBoundary: result(category.demonstratedFirstValueStatus === "DEMONSTRATED_AS_SELECTOR_BOUNDARY" ? "PASS" : "NOT_PROVEN", category.demonstratedFirstValueStatus ?? "Beginning boundary is not proven."),
        endingBoundary: result(category.demonstratedLastValueStatus === "DEMONSTRATED_AS_SELECTOR_BOUNDARY" ? "PASS" : "NOT_PROVEN", category.demonstratedLastValueStatus ?? "Ending boundary is not proven."),
        twoCompleteCounts: result("NOT_PROVEN", "Two complete independent counts are not available."),
        nativeOrderContinuity: result(missing.length === 0 ? "PASS_WITH_NOTES" : "FAIL", missing.length === 0 ? "No missing native-order values inside the observed range." : `Missing native-order values inside observed range: ${missing.join(", ")}.`),
        missingIndices: result(missing.length === 0 ? "PASS" : "FAIL", missing.length === 0 ? "No missing indices inside observed range." : `Missing indices: ${missing.join(", ")}.`, { missingIndices: missing }),
        repeatedIndices: result(repeated.length === 0 ? "PASS" : "FAIL", repeated.length === 0 ? "No repeated selected indices." : `Repeated selected indices or labels: ${repeated.join(", ")}.`, { repeatedIndices: repeated }),
        duplicateInternalIDs: result(duplicateIDs.length === 0 ? "PASS" : "FAIL", duplicateIDs.length === 0 ? "No duplicate internal IDs." : `Duplicate internal IDs: ${duplicateIDs.join(", ")}.`, { duplicateInternalIDs: duplicateIDs }),
        continuityOverlaps: result("NOT_APPLICABLE", "No multi-clip continuity overlap is required for this category in current evidence."),
        wrappingBehavior: result(category.selectorBoundaryEvidence?.wrappingDemonstrated ? "PASS" : "NOT_PROVEN", category.selectorBoundaryEvidence?.wrappingEvidence ?? category.selectorWrapStatus ?? "Wrapping behavior is not proven."),
        countMatchesRecordTotal: totalKnown
          ? result(category.totalCount === records.length ? "PASS" : "FAIL", category.totalCount === records.length ? "Claimed total matches record count." : `Claimed total ${category.totalCount} does not match record count ${records.length}.`)
          : result("UNKNOWN", "No total count is claimed, so count cannot be matched to record total."),
        evidenceForEveryClaimedOption: evidenceCheck(records),
        unprovenFinalOptionClaims: result(category.demonstratedLastValueStatus === "DEMONSTRATED_AS_SELECTOR_BOUNDARY" ? "PASS" : "NOT_PROVEN", category.lastObservedStatus ?? "Final option is not proven.")
      }
    };
  });
}

function auditZeroRecordCategory(label, packageData, id) {
  const records = packageData.records ?? [];
  const duplicateIDs = duplicates(records.map(stableIDFor));
  return {
    categoryID: id,
    categoryLabel: label,
    sourceFile: `data/phase-zero/${fileNameForZeroCategory(id)}`,
    recordCount: records.length,
    claimedTotal: null,
    claimedTotalStatus: packageData.summary?.countStatus ?? "COUNT_UNKNOWN",
    nativeOrders: [],
    checks: {
      beginningBoundary: result("NOT_PROVEN", "No selected values are captured."),
      endingBoundary: result("NOT_PROVEN", "No selected values are captured."),
      twoCompleteCounts: result(packageData.summary?.completeSelectorDoubleCountAvailable ? "PASS" : "NOT_PROVEN", "Two complete independent counts are not available."),
      nativeOrderContinuity: result("UNKNOWN", "No native-order rows are available to audit."),
      missingIndices: result("UNKNOWN", "No selected values are captured."),
      repeatedIndices: result("PASS", "No repeated selected indices are present because no records exist."),
      duplicateInternalIDs: result(duplicateIDs.length === 0 ? "PASS" : "FAIL", duplicateIDs.length === 0 ? "No duplicate internal IDs." : `Duplicate internal IDs: ${duplicateIDs.join(", ")}.`),
      continuityOverlaps: result("NOT_APPLICABLE", "No continuity overlap is available or required for a zero-record category."),
      wrappingBehavior: result("NOT_PROVEN", packageData.summary?.selectorWrapStatus ?? packageData.summary?.selectorBoundaryStatus ?? "Wrapping behavior is not proven."),
      countMatchesRecordTotal: result("UNKNOWN", "No total count is claimed, so count cannot be matched to record total."),
      evidenceForEveryClaimedOption: result(records.length === 0 ? "UNKNOWN" : "PASS", records.length === 0 ? "No claimed options exist; category is incomplete because no selected values are captured." : "Evidence exists."),
      unprovenFinalOptionClaims: result("NOT_PROVEN", "No final option is proven.")
    }
  };
}

function auditBodyControls(bodyControls) {
  const records = bodyControls.records ?? [];
  const duplicateIDs = duplicates(records.map(stableIDFor));
  return {
    categoryID: "body-controls",
    categoryLabel: "Body Controls / Position Context",
    sourceFile: defaultBodyControlsPath,
    recordCount: records.length,
    claimedTotal: null,
    claimedTotalStatus: "COUNT_UNKNOWN",
    nativeOrders: [],
    checks: {
      beginningBoundary: result("NOT_APPLICABLE", "Body controls are context records, not a counted appearance selector in current evidence."),
      endingBoundary: result("NOT_APPLICABLE", "Body controls are context records, not a counted appearance selector in current evidence."),
      twoCompleteCounts: result("NOT_APPLICABLE", "Body controls are context records, not a counted appearance selector in current evidence."),
      nativeOrderContinuity: result("NOT_APPLICABLE", "No body-control option order is captured."),
      missingIndices: result("NOT_APPLICABLE", "No body-control option order is captured."),
      repeatedIndices: result("NOT_APPLICABLE", "No body-control option order is captured."),
      duplicateInternalIDs: result(duplicateIDs.length === 0 ? "PASS" : "FAIL", duplicateIDs.length === 0 ? "No duplicate internal IDs." : `Duplicate internal IDs: ${duplicateIDs.join(", ")}.`),
      continuityOverlaps: result("NOT_APPLICABLE", "No body-control continuity overlap is available or required."),
      wrappingBehavior: result("NOT_APPLICABLE", "No body-control selector wrapping is captured."),
      countMatchesRecordTotal: result("NOT_APPLICABLE", "No body-control total count is claimed."),
      evidenceForEveryClaimedOption: evidenceCheck(records),
      unprovenFinalOptionClaims: result("NOT_APPLICABLE", "No body-control final option is claimed.")
    }
  };
}

function finalizeCategory(category) {
  const checks = category.checks;
  const blockingIssues = Object.entries(checks)
    .filter(([, check]) => ["FAIL", "UNKNOWN", "NOT_PROVEN"].includes(check.status))
    .map(([checkID, check]) => ({
      checkID,
      status: check.status,
      message: check.message
    }));
  const hasHardFailures = Object.values(checks).some((check) => check.status === "FAIL");
  const allComplete = Object.values(checks).every((check) => ["PASS", "PASS_WITH_NOTES", "NOT_APPLICABLE"].includes(check.status));
  return {
    ...category,
    categoryCompletionStatus: allComplete ? "COMPLETE" : "INCOMPLETE",
    hasHardFailures,
    productionEligible: false,
    blockingIssues
  };
}

function evidenceCheck(records) {
  const missingEvidence = records
    .filter((record) => !hasEvidence(record))
    .map((record) => stableIDFor(record) || record.nativeDisplayLabel || record.nativeLabel || "UNKNOWN_RECORD");
  if (records.length === 0) return result("UNKNOWN", "No claimed options exist; category remains incomplete until values are captured.");
  return result(missingEvidence.length === 0 ? "PASS" : "FAIL", missingEvidence.length === 0 ? "Every claimed option has evidence linkage." : `Records missing evidence: ${missingEvidence.join(", ")}.`, { missingEvidence });
}

function hasEvidence(record) {
  return Boolean(
    record.evidenceFrame?.path
    || record.fullScreenEvidence?.path
    || record.sourceEvidence?.length
    || record.sourceObservations?.some((observation) => observation.evidenceID || observation.evidenceFramePath)
  );
}

function numericOrders(records) {
  return records.map((record) => Number(record.nativeOrder ?? record.nativeOptionNumber)).filter(Number.isFinite).sort((left, right) => left - right);
}

function missingInRange(orders) {
  if (orders.length === 0) return [];
  const uniqueOrders = [...new Set(orders)];
  const missing = [];
  for (let value = uniqueOrders[0]; value <= uniqueOrders.at(-1); value += 1) {
    if (!uniqueOrders.includes(value)) missing.push(value);
  }
  return missing;
}

function repeatedObservationOrders(records) {
  return records
    .filter((record) => Array.isArray(record.sourceObservations) && record.sourceObservations.length > 1)
    .map((record) => Number(record.nativeOrder ?? record.nativeOptionNumber))
    .filter(Number.isFinite);
}

function duplicates(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function stableIDFor(record) {
  return record.stableResearchCatalogID ?? record.stableResearchID ?? record.stableInternalID ?? record.id ?? null;
}

function result(status, message, details = {}) {
  return { status, message, ...details };
}

function fileNameForZeroCategory(id) {
  return {
    hairstyle: "hairstyles.research.json",
    hairColor: "hair_colors.research.json",
    facialHair: "facial_hair.research.json",
    facialHairColor: "facial_hair_colors.research.json"
  }[id] ?? `${id}.json`;
}

function formatCategoryCsv(categories) {
  const columns = [
    "categoryID",
    "categoryLabel",
    "recordCount",
    "claimedTotal",
    "claimedTotalStatus",
    "categoryCompletionStatus",
    "hasHardFailures",
    ...requiredCheckIDs
  ];
  return toCsv(columns, categories.map((category) => ({
    ...category,
    ...Object.fromEntries(requiredCheckIDs.map((checkID) => [checkID, category.checks[checkID]?.status ?? "MISSING_CHECK"]))
  })));
}

function formatMarkdown(report) {
  const lines = [
    "# Catalog Count and Native-Order Audit",
    "",
    "PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This audit verifies count and native-order evidence without inventing missing options, final values, totals, or wrapping behavior. Any failed or unproven required check keeps the category incomplete.",
    "",
    "## Summary",
    "",
    `- Categories audited: ${report.summary.categoryCount}`,
    `- Complete categories: ${report.summary.completeCategoryCount}`,
    `- Incomplete categories: ${report.summary.incompleteCategoryCount}`,
    `- Categories with hard failures: ${report.summary.hardFailureCategoryCount}`,
    `- Blocking issue count: ${report.summary.blockingIssueCount}`,
    "",
    "## Category Results",
    "",
    "| Category | Records | Completion | Hard failures | Key blockers |",
    "| --- | ---: | --- | --- | --- |"
  ];
  for (const category of report.categories) {
    const blockers = category.blockingIssues.slice(0, 4).map((issue) => `${issue.checkID}:${issue.status}`).join("; ");
    lines.push(`| ${category.categoryLabel} | ${category.recordCount} | ${category.categoryCompletionStatus} | ${category.hasHardFailures ? "yes" : "no"} | ${blockers || "None"} |`);
  }
  lines.push("");
  lines.push("## Production Gate");
  lines.push("");
  lines.push("No category in this audit is production eligible. Categories with missing indices, repeated indices, unproven boundaries, unknown totals, unproven final options, or missing evidence must remain incomplete.");
  return `${lines.join("\n")}\n`;
}

function toCsv(columns, rows) {
  return `${[columns, ...rows.map((row) => columns.map((column) => row[column] ?? ""))]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, text) {
  const filePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function parseCliArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--generated-at") options.generatedAt = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log("Usage: node scripts/cf27-catalog-count-order-audit.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const report = generateCatalogCountOrderAudit(options);
    writeCatalogCountOrderAudit(report, options);
    console.log(`Catalog count/native-order audit generated: ${report.categories.length} categories, ${report.blockingIssues.length} blocking issues.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
