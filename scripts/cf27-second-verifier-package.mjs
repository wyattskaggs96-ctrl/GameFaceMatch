#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const phaseZeroDir = path.join(repoRoot, "data/phase-zero");
const docsDir = path.join(repoRoot, "docs/phase-zero");
const generatedAt = new Date().toISOString();

const assignmentPath = path.join(phaseZeroDir, "verification_assignment.json");
const templatePath = path.join(phaseZeroDir, "verification_results.template.csv");
const instructionsPath = path.join(docsDir, "SECOND_VERIFIER_INSTRUCTIONS.md");
const printablePath = path.join(docsDir, "SECOND_VERIFIER_PRINTABLE_CHECKLIST.md");

const env = readJSON("data/phase-zero/environment_manifest.research.json");
const creationPaths = readJSON("data/phase-zero/creation_paths.research.json");
const menuMap = readJSON("data/phase-zero/menu_map.research.json");
const heads = readJSON("data/phase-zero/heads.research.json");
const attrs = readJSON("data/phase-zero/additional_attributes.research.json");
const evidenceManifest = readJSON("data/phase-zero/evidence_manifest.json");
const captureRequests = readJSON("data/phase-zero/capture_requests.json");

const allowedStatuses = [
  "VERIFIED",
  "VERIFIED_WITH_NOTES",
  "RECAPTURE_REQUIRED",
  "VERSION_MISMATCH",
  "MISSING_EVIDENCE",
  "COUNT_MISMATCH",
  "ORDER_MISMATCH",
  "DEPENDENCY_UNRESOLVED",
  "NOT_VERIFIED"
];

const menuRecords = (menuMap.records ?? []).filter((record) => record.recordType === "menu");
const optionRecords = (menuMap.records ?? []).filter((record) => record.recordType === "option");
const headRecords = heads.records ?? [];
const additionalRecords = attrs.records ?? [];
const evidenceEntries = evidenceManifest.entries ?? [];
const categoryNames = [...new Set(additionalRecords.map((record) => record.category).filter(Boolean))].sort();

const assignment = {
  schemaVersion: "phase0-second-verifier-assignment-v1",
  generatedAt,
  assignmentID: `phase0-second-verifier-assignment-${dateStamp(generatedAt)}`,
  dataClass: "SECOND_VERIFIER_ASSIGNMENT_TEMPLATE",
  sourceType: "verification_assignment",
  productionStatus: "NOT_PRODUCTION_DATA",
  verificationStatus: "NOT_VERIFIED",
  verificationHasOccurred: false,
  primaryCountsWithheld: true,
  noProductionRecommendationAccess: true,
  instructionsDocument: "docs/phase-zero/SECOND_VERIFIER_INSTRUCTIONS.md",
  printableChecklist: "docs/phase-zero/SECOND_VERIFIER_PRINTABLE_CHECKLIST.md",
  resultsTemplate: "data/phase-zero/verification_results.template.csv",
  environmentSummary: {
    environmentID: env.environmentID,
    gameTitle: env.gameTitle,
    platform: env.platform,
    consoleFamily: env.consoleFamily,
    consoleModel: env.consoleModel,
    gameVersion: env.gameVersion,
    patchVersion: env.patchVersion,
    gameMode: env.gameMode,
    creationStartingPoint: env.creationStartingPoint,
    appearanceEntryPoint: env.appearanceEntryPoint,
    captureMethod: env.captureMethod,
    captureFormat: env.captureFormat,
    sourceVideo: env.sourceVideo,
    verificationStatus: env.verificationStatus,
    unresolvedFields: (env.missingEnvironmentEvidence ?? []).map((item) => item.field ?? item)
  },
  creationPathInstructions: (creationPaths.creationPaths ?? []).map((creationPath) => ({
    creationPathID: creationPath.id,
    displayName: creationPath.displayName,
    status: creationPath.status,
    productionStatus: creationPath.productionStatus,
    verificationStatus: creationPath.verificationStatus,
    evidenceReferences: (creationPath.reproducibleSteps ?? []).map((step) => step.evidence).filter(Boolean),
    steps: (creationPath.reproducibleSteps ?? []).map((step) => ({
      stepID: step.stepID,
      stepNumber: step.stepNumber,
      instruction: step.instruction,
      expectedResult: step.expectedResult,
      parentMenu: step.parentMenu,
      visibleMenuLabel: step.visibleMenuLabel,
      evidence: step.evidence
    }))
  })),
  menuMapChecklist: menuRecords.map((record) => ({
    stableMenuID: record.stableMenuID,
    parentMenuID: record.parentMenuID,
    displayLabel: record.displayLabel,
    nativeLabel: record.nativeLabel,
    nativeOrder: record.nativeOrder,
    controlType: record.controlType,
    captureStatus: record.captureStatus,
    gapFlags: record.gapFlags ?? [],
    inspected: Boolean(record.inspected),
    complete: Boolean(record.complete),
    visibleValueCount: record.visibleValueCount ?? null,
    countPrompt: "Verifier must independently count this menu before comparing with primary records.",
    primaryCountHiddenUntilComparison: true,
    evidenceIDs: (record.evidence ?? []).map((item) => item.evidenceID).filter(Boolean),
    verificationStatus: record.verificationStatus
  })),
  independentCountingForms: buildIndependentCountingForms(menuRecords, categoryNames),
  headTemplateChecklist: headRecords.map((record) => ({
    stableResearchCatalogID: record.stableResearchCatalogID,
    nativeOptionNumber: record.nativeOptionNumber,
    visibleGameLabelOrIndex: record.visibleGameLabelOrIndex,
    sourceVideo: record.primarySourceVideo,
    timestampRange: record.primaryTimestampRange,
    evidenceID: record.evidenceID,
    evidenceFramePath: record.evidenceFramePath,
    checks: checklistChecks(["Native number visible", "Menu label/index readable", "Transition/loading finished", "Front view exists", "Secondary-angle sample reviewed when assigned", "Hair/facial-hair/eye-black obstructions noted", "Recapture need recorded"]),
    primaryCountHiddenUntilComparison: true,
    verificationStatus: record.verificationStatus,
    productionStatus: record.productionStatus
  })),
  hairstyleChecklist: buildAwaitingCaptureChecklist("Hairstyles", "No hairstyle catalog records are production-verifiable yet. Use capture requests before second verification."),
  facialHairChecklist: buildAwaitingCaptureChecklist("Facial hair", "No facial-hair catalog records are production-verifiable yet. Use capture requests before second verification."),
  additionalAttributeChecklist: additionalRecords.map((record) => ({
    stableResearchCatalogID: record.stableResearchCatalogID,
    category: record.category,
    parentMenuLabel: record.parentMenuLabel,
    controlType: record.controlType,
    nativeOrder: record.nativeOrder,
    nativeDisplayLabel: record.nativeDisplayLabel,
    nativeOptionNumber: record.nativeOptionNumber ?? null,
    sourceVideo: record.sourceVideo,
    timestampRange: record.sourceTimestampRange,
    evidenceID: record.evidenceID,
    evidenceFramePath: record.evidenceFramePath,
    primaryCountHiddenUntilComparison: true,
    verificationStatus: record.verificationStatus,
    productionStatus: record.productionStatus
  })),
  evidenceReferenceLinks: evidenceEntries.map((entry) => ({
    evidenceID: entry.evidence_id,
    relativePath: entry.relative_path,
    role: entry.file_role,
    masterOrDerivative: entry.master_or_derivative,
    sourceVideo: entry.source_video,
    timestamp: entry.timestamp ?? null,
    verificationState: entry.verification_state,
    linkedCatalogID: entry.headResearchCatalogID ?? entry.additionalAttributeCatalogID ?? null,
    notes: entry.notes ?? ""
  })),
  nativeOrderComparisonSheet: [...headRecords, ...additionalRecords].map((record) => ({
    stableResearchCatalogID: record.stableResearchCatalogID,
    category: record.category ?? "Head Template",
    verifierNativeOrder: "",
    verifierNativeLabel: "",
    verifierCountEvidenceID: "",
    primaryNativeOrderMasked: "WITHHELD_UNTIL_COMPARISON",
    primaryLabelMasked: "WITHHELD_UNTIL_COMPARISON",
    compareAfterIndependentCount: true
  })),
  discrepancyForm: {
    requiredFields: [
      "target_stable_id",
      "discrepancy_type",
      "verifier_observation",
      "primary_observation_after_unmasking",
      "evidence_ids",
      "requested_resolution",
      "recapture_required",
      "notes"
    ],
    allowedDiscrepancyTypes: [
      "labelMismatch",
      "versionMismatch",
      "missingEvidence",
      "countMismatch",
      "orderMismatch",
      "dependencyUnresolved",
      "captureQuality",
      "menuNavigationMismatch",
      "other"
    ]
  },
  recaptureRequestForm: {
    source: "data/phase-zero/capture_requests.json",
    requiredFields: [
      "capture_id",
      "affected_record_id",
      "exact_menu_path",
      "required_views",
      "reason",
      "acceptance_criteria",
      "priority",
      "requested_by"
    ],
    currentOpenRequests: (captureRequests.requests ?? []).map((request) => ({
      captureID: request.captureID,
      priority: request.priority,
      exactCategory: request.exactCategory,
      exactMenuPath: request.exactMenuPath,
      whyRequired: request.whyRequired
    }))
  },
  allowedStatusDefinitions: Object.fromEntries(allowedStatuses.map((status) => [status, statusDefinition(status)])),
  randomizedSecondaryAngleSamplingMethod: {
    methodID: "deterministic-sha256-category-quartile-v1",
    summary: "For each category, hash environment_id + verifier_id + catalog_version with every eligible catalog ID, sort by SHA-256 hash, and select the first required quartile.",
    seedInputs: ["environment_id", "verifier_id", "catalog_version"],
    categoryAware: true,
    requiredQuartile: "ceil(category_eligible_count / 4)",
    cherryPickingAllowed: false,
    storeSeedInput: true,
    storeSelectedIDs: true
  },
  signOffForm: {
    verifierID: "",
    verifierNameOrInitials: "",
    completedAt: "",
    independentCountCompleted: false,
    evidenceReviewedDirectly: false,
    secondaryAngleSampleCompleted: false,
    discrepanciesFiled: false,
    recaptureRequestsFiled: false,
    finalStatus: "NOT_VERIFIED",
    verifierSignature: "",
    notes: ""
  }
};

writeJSON(assignmentPath, assignment);
writeText(templatePath, buildResultsTemplate());
writeText(instructionsPath, buildInstructionsMarkdown(assignment));
writeText(printablePath, buildPrintableChecklistMarkdown(assignment));

console.log(`Wrote ${path.relative(repoRoot, assignmentPath)}`);
console.log(`Wrote ${path.relative(repoRoot, templatePath)}`);
console.log(`Wrote ${path.relative(repoRoot, instructionsPath)}`);
console.log(`Wrote ${path.relative(repoRoot, printablePath)}`);

function readJSON(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function writeJSON(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function dateStamp(value) {
  return value.slice(0, 10).replaceAll("-", "");
}

function checklistChecks(labels) {
  return labels.map((label) => ({ label, status: "NOT_STARTED", notes: "" }));
}

function buildIndependentCountingForms(records, categories) {
  const menuForms = records.map((record) => ({
    formID: `count-${record.stableMenuID}`,
    targetID: record.stableMenuID,
    targetType: "menu",
    label: record.displayLabel,
    verifierCount: "",
    verifierFirstObservedValue: "",
    verifierLastObservedValue: "",
    verifierWrapObserved: "",
    verifierEvidenceIDs: [],
    primaryCountHiddenUntilComparison: true,
    comparePrimaryAfterSubmission: true
  }));
  const categoryForms = categories.map((category) => ({
    formID: `count-category-${slug(category)}`,
    targetID: `category-${slug(category)}`,
    targetType: "catalogCategory",
    label: category,
    verifierCount: "",
    verifierFirstObservedValue: "",
    verifierLastObservedValue: "",
    verifierWrapObserved: "",
    verifierEvidenceIDs: [],
    primaryCountHiddenUntilComparison: true,
    comparePrimaryAfterSubmission: true
  }));
  return [...menuForms, ...categoryForms];
}

function buildAwaitingCaptureChecklist(category, notes) {
  return {
    category,
    status: "AWAITING_PRIMARY_CAPTURE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    notes,
    requiredChecks: checklistChecks(["Independent count", "Native order", "Menu evidence", "Required views", "Dependency review", "Recapture requests"])
  };
}

function statusDefinition(status) {
  const definitions = {
    VERIFIED: "Second verifier agrees that the scoped record satisfies mandatory evidence checks. Use only after independent review and required sign-off.",
    VERIFIED_WITH_NOTES: "Second verifier agrees with documented limitations or non-blocking notes. Requires manager acceptance before publication.",
    RECAPTURE_REQUIRED: "Evidence is insufficient or ambiguous and a new capture is required.",
    VERSION_MISMATCH: "Verifier observed a game/platform/patch/environment mismatch.",
    MISSING_EVIDENCE: "Required evidence is absent or cannot be resolved.",
    COUNT_MISMATCH: "Verifier count differs from the primary observation.",
    ORDER_MISMATCH: "Verifier native order differs from the primary observation.",
    DEPENDENCY_UNRESOLVED: "A dependency, lock, entitlement, mode, or path condition remains unresolved.",
    NOT_VERIFIED: "Default state. No second-person verification has occurred or completed."
  };
  return definitions[status];
}

function buildResultsTemplate() {
  const headers = [
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
  const example = [
    assignment.assignmentID,
    "REPLACE_WITH_VERIFIER_ID",
    "REPLACE_WITH_TARGET_STABLE_ID",
    "REPLACE_WITH_CATEGORY",
    "catalogItem",
    "",
    "",
    "",
    "no",
    "no",
    "no",
    "notChecked",
    "notChecked",
    "notChecked",
    "notChecked",
    "notChecked",
    "notApplicable",
    "notApplicable",
    "NOT_VERIFIED",
    "none",
    "holdForResearch",
    "",
    "Template row only. Replace before importing real verifier results."
  ];
  return `${headers.join(",")}\n${example.map(csvEscape).join(",")}\n`;
}

function buildInstructionsMarkdown(pkg) {
  const menuRows = pkg.menuMapChecklist
    .map((record) => `| ${record.stableMenuID} | ${record.displayLabel} | ${record.controlType} | ${record.captureStatus} | ${record.gapFlags.join("; ")} |`)
    .join("\n");
  const countingRows = pkg.independentCountingForms
    .map((form) => `| ${form.formID} | ${form.label} | ${form.targetType} | verifier records independently | primary count withheld |`)
    .join("\n");
  const categorySummary = categoryNames.length > 0 ? categoryNames.join(", ") : "No additional attribute categories available.";
  return `# Second Verifier Instructions

**Status:** NOT PRODUCTION DATA
**Verification state:** NOT_VERIFIED
**Generated:** ${pkg.generatedAt}

This package prepares a future independent second-human verification pass. It does not mean verification has occurred, and it must not enable production recommendations.

## Core Rules

- Re-count directly from evidence or live game capture before seeing primary final counts.
- Do not invent menu labels, counts, categories, paths, or missing values.
- Preserve native order exactly as observed.
- Use only the allowed statuses listed below.
- File discrepancies instead of averaging conflicting observations.
- Research observations remain unavailable to production recommendations.

## Environment Summary

| Field | Value |
| --- | --- |
| Environment ID | ${pkg.environmentSummary.environmentID} |
| Game | ${pkg.environmentSummary.gameTitle} |
| Platform | ${pkg.environmentSummary.platform ?? "UNRESOLVED"} |
| Game version | ${pkg.environmentSummary.gameVersion ?? "UNRESOLVED"} |
| Patch version | ${pkg.environmentSummary.patchVersion ?? "UNRESOLVED"} |
| Mode | ${pkg.environmentSummary.gameMode ?? "UNRESOLVED"} |
| Capture method | ${pkg.environmentSummary.captureMethod ?? "UNRESOLVED"} |
| Verification status | ${pkg.environmentSummary.verificationStatus} |

Unresolved environment fields: ${pkg.environmentSummary.unresolvedFields.length > 0 ? pkg.environmentSummary.unresolvedFields.join(", ") : "none recorded"}.

## Creation-Path Instructions

${pkg.creationPathInstructions.map((pathRecord) => [
  `### ${pathRecord.displayName}`,
  "",
  `Status: ${pathRecord.status}. Production status: ${pathRecord.productionStatus}.`,
  "",
  ...pathRecord.steps.map((step) => `${step.stepNumber}. ${step.instruction} Expected: ${step.expectedResult} Evidence: ${step.evidence?.timelineRecordID ?? "UNRESOLVED"} @ ${step.evidence?.startTimestamp ?? "?"}-${step.evidence?.endTimestamp ?? "?"}s.`)
].join("\n")).join("\n\n")}

## Menu-Map Checklist

| Menu ID | Label | Control | Capture | Gaps |
| --- | --- | --- | --- | --- |
${menuRows}

## Independent Counting Forms

Primary counts are withheld in the package. Complete these forms before any comparison step.

| Form ID | Label | Target | Verifier task | Primary data |
| --- | --- | --- | --- | --- |
${countingRows}

## Catalog Checklists

- Head-template records available for research review: ${pkg.headTemplateChecklist.length}
- Hairstyle checklist: ${pkg.hairstyleChecklist.status}; primary capture still required.
- Facial-hair checklist: ${pkg.facialHairChecklist.status}; primary capture still required.
- Additional-attribute categories currently represented: ${categorySummary}

For every assigned record, confirm native label/index, native order, source evidence, timestamp, required view status, and recapture need.

## Evidence References

Use \`data/phase-zero/verification_assignment.json\` for machine-readable evidence references. Paths are repository-relative and may point to source-master references or generated derivatives. Do not rewrite or publish master media.

## Native-Order Comparison Sheet

The machine-readable package contains a native-order comparison sheet with primary native order masked as \`WITHHELD_UNTIL_COMPARISON\`. Fill in verifier order first, then compare after submission.

## Discrepancy Form

Record target ID, discrepancy type, verifier observation, primary observation after unmasking, evidence IDs, requested resolution, recapture requirement, and notes. Do not average conflicting observations.

## Recapture Request Form

Use the current capture-request list as the starting queue. Any new request must identify affected records, exact menu path, required views, reason, acceptance criteria, priority, and requester.

## Allowed Status Definitions

${allowedStatuses.map((status) => `- \`${status}\`: ${pkg.allowedStatusDefinitions[status]}`).join("\n")}

## Randomized 25% Secondary-Angle Sampling

Method: \`${pkg.randomizedSecondaryAngleSamplingMethod.methodID}\`.

For each category, hash \`environment_id + verifier_id + catalog_version\` with each eligible catalog ID, sort by SHA-256 hash, and select \`ceil(category_eligible_count / 4)\`. Store the seed input and selected IDs. Cherry-picking is not allowed.

## Sign-Off

Sign-off requires independent counts, direct evidence review, secondary-angle sample completion, discrepancy/recapture filing where needed, and allowed final statuses. This package starts with \`verificationHasOccurred: false\`.
`;
}

function buildPrintableChecklistMarkdown(pkg) {
  return `# Printable Second Verifier Checklist

**Package:** ${pkg.assignmentID}
**Status:** NOT PRODUCTION DATA / NOT_VERIFIED
**Primary counts:** WITHHELD UNTIL INDEPENDENT COUNT IS COMPLETE

## Verifier Setup

- [ ] Enter verifier ID.
- [ ] Confirm environment ID: ${pkg.environmentSummary.environmentID}.
- [ ] Confirm game/mode from evidence: ${pkg.environmentSummary.gameTitle} / ${pkg.environmentSummary.gameMode ?? "UNRESOLVED"}.
- [ ] Record any environment mismatch before catalog review.
- [ ] Review creation-path steps without using primary counts.

## Menu Map

${pkg.menuMapChecklist.map((record) => `- [ ] ${record.displayLabel} (${record.stableMenuID}) - count independently; gaps: ${record.gapFlags.join(", ") || "none recorded"}`).join("\n")}

## Independent Counts

${pkg.independentCountingForms.map((form) => `- [ ] ${form.label}: verifier count ____ first value ____ final value ____ wrap observed ____ evidence IDs ____`).join("\n")}

## Head Templates

${pkg.headTemplateChecklist.map((record) => `- [ ] ${record.visibleGameLabelOrIndex} (${record.stableResearchCatalogID}) - native index visible ____ evidence reviewed ____ recapture needed ____ notes ____`).join("\n")}

## Hairstyles

- [ ] Primary hairstyle capture exists before second verification.
- [ ] Independent count completed.
- [ ] Native order checked.
- [ ] Required views checked.
- [ ] Recapture requests filed when needed.

## Facial Hair

- [ ] Primary facial-hair capture exists before second verification.
- [ ] Independent count completed.
- [ ] Native order checked.
- [ ] Required views checked.
- [ ] Recapture requests filed when needed.

## Additional Attributes

${categoryNames.map((category) => `- [ ] ${category}: independent count ____ native order checked ____ evidence reviewed ____ recapture needed ____`).join("\n")}

## Secondary-Angle Sample

- [ ] Record verifier ID used in deterministic seed.
- [ ] Record catalog version used in deterministic seed.
- [ ] Generate category-aware 25% sample.
- [ ] Review all sampled secondary angles.
- [ ] Preserve selected IDs and seed input.

## Discrepancies And Recaptures

- [ ] Discrepancies filed for count/order/label/evidence mismatches.
- [ ] Recapture requests filed for missing or unusable evidence.
- [ ] Both observations preserved.
- [ ] No conflicting observation averaged or silently merged.

## Sign-Off

- [ ] Final status uses an allowed status.
- [ ] No VERIFIED status assigned without true second-human review.
- [ ] Verifier signature/initials: __________________________
- [ ] Date/time: __________________________
- [ ] Notes: __________________________
`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}
