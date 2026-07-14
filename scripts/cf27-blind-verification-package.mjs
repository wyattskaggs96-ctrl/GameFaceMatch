#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_BLIND_VERIFICATION_PACKAGE_SCHEMA_VERSION = "cf27-blind-verification-package-v1";
export const CF27_BLIND_VERIFICATION_PACKAGE_ID = "phase0-blind-second-verifier-package-20260714";
export const defaultPackageDirectory = "data/phase-zero/blind-verification-package";
export const defaultInstructionsPath = "docs/phase-zero/BLIND_SECOND_VERIFIER_INSTRUCTIONS.md";
export const defaultPrintablePath = "docs/phase-zero/BLIND_SECOND_VERIFIER_PRINTABLE_PACKET.md";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-07-14T03:45:00-04:00";

const countTargets = [
  { targetID: "count-head-templates", label: "Head Templates", targetKind: "headTemplateCategory", task: "Count every head template from the first available value to the final available value." },
  { targetID: "count-hairstyles", label: "Hairstyles", targetKind: "hairstyleCategory", task: "Count every hairstyle option if the Hair menu exposes hairstyles." },
  { targetID: "count-facial-hair", label: "Facial Hair", targetKind: "facialHairCategory", task: "Count every facial-hair option, including None if present." },
  { targetID: "count-facial-hair-colors", label: "Facial-Hair Colors", targetKind: "facialHairColorCategory", task: "Count every facial-hair color option if the game exposes this control." },
  { targetID: "count-hair-colors", label: "Hair Colors", targetKind: "hairColorCategory", task: "Count every hair color option if the game exposes this control." },
  { targetID: "count-skin-tone", label: "Skin Tone", targetKind: "additionalCategory", task: "Count Skin Tone values and confirm first/final boundaries." },
  { targetID: "count-skin-details", label: "Skin Details", targetKind: "additionalCategory", task: "Count Skin Details values and confirm first/final boundaries." },
  { targetID: "count-eye-shape", label: "Eye Shape", targetKind: "additionalCategory", task: "Count Eye Shape values and confirm first/final boundaries." },
  { targetID: "count-eye-color", label: "Eye Color", targetKind: "additionalCategory", task: "Count Eye Color values and confirm first/final boundaries." },
  { targetID: "count-nose", label: "Nose", targetKind: "additionalCategory", task: "Count Nose values and confirm first/final boundaries." },
  { targetID: "count-ear-shape", label: "Ear Shape", targetKind: "additionalCategory", task: "Count Ear Shape values and confirm first/final boundaries." },
  { targetID: "count-mouth-shape", label: "Mouth Shape", targetKind: "additionalCategory", task: "Confirm whether Mouth Shape exists; count it only if directly visible." },
  { targetID: "count-jaw-shape", label: "Jaw Shape", targetKind: "additionalCategory", task: "Confirm whether Jaw Shape exists; count it only if directly visible." },
  { targetID: "count-chin", label: "Chin", targetKind: "additionalCategory", task: "Confirm whether Chin exists; count it only if directly visible." }
];

const dataEntryColumns = [
  "package_id",
  "verifier_id",
  "section",
  "target_id",
  "target_label",
  "verifier_count",
  "first_observed_value",
  "final_observed_value",
  "wrap_observed",
  "native_order_preserved",
  "selector_boundary_confirmed",
  "dependency_observed",
  "evidence_ids",
  "screenshot_or_video_reference",
  "status",
  "notes"
];

const discrepancyColumns = [
  "package_id",
  "verifier_id",
  "discrepancy_id",
  "target_id",
  "discrepancy_type",
  "verifier_observation",
  "evidence_ids",
  "recapture_required",
  "severity",
  "notes"
];

const evidenceReviewColumns = [
  "package_id",
  "verifier_id",
  "review_id",
  "evidence_id",
  "evidence_type",
  "opens_successfully",
  "matches_target",
  "timestamp_visible_or_recorded",
  "quality_status",
  "issue_or_discrepancy_id",
  "notes"
];

const environmentColumns = [
  "package_id",
  "verifier_id",
  "game_title_seen",
  "platform",
  "console_model",
  "console_os_version",
  "game_version",
  "patch_version",
  "edition_or_entitlement",
  "online_state",
  "ea_account_state",
  "display_resolution",
  "hdr_state",
  "capture_method",
  "capture_date",
  "evidence_reference",
  "notes"
];

export function buildBlindVerificationPackage({
  root = repositoryRoot
} = {}) {
  const normalizedRoot = path.resolve(root);
  const environment = readJSON(path.join(normalizedRoot, "data/phase-zero/environment_manifest.research.json"));
  const creationPaths = readJSON(path.join(normalizedRoot, "data/phase-zero/creation_paths.research.json"));
  const menuMap = readJSON(path.join(normalizedRoot, "data/phase-zero/menu_map.research.json"));
  const captureRequests = readJSON(path.join(normalizedRoot, "data/phase-zero/capture_requests.json"));
  const packageData = {
    schemaVersion: CF27_BLIND_VERIFICATION_PACKAGE_SCHEMA_VERSION,
    generatedAt,
    packageID: CF27_BLIND_VERIFICATION_PACKAGE_ID,
    dataClass: "BLIND_SECOND_VERIFIER_PACKAGE",
    sourceType: "verification_assignment",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    verificationHasOccurred: false,
    primaryCountsWithheld: true,
    productionRecommendationsEnabled: false,
    instructionsDocument: defaultInstructionsPath,
    printablePacket: defaultPrintablePath,
    ruleSummary: [
      "Use only this blind package until your independent counts are submitted.",
      "Do not look up primary research totals, head lists, or existing catalog exports first.",
      "Write exactly what you see in the game or evidence.",
      "If you are unsure, write unsure and request recapture."
    ],
    environmentForm: createEnvironmentForm(environment),
    creationPathWorksheet: createCreationPathWorksheet(creationPaths),
    menuMapWorksheet: createMenuMapWorksheet(menuMap),
    independentCountWorksheet: createCountWorksheet(),
    evidenceReviewForm: createEvidenceReviewForm(),
    discrepancyForm: createDiscrepancyForm(),
    signOffForm: createSignOffForm(),
    dataEntryTemplate: {
      columns: dataEntryColumns,
      csvPath: `${defaultPackageDirectory}/data_entry_template.csv`,
      jsonPath: `${defaultPackageDirectory}/data_entry_template.json`
    },
    importFormat: createImportFormat(),
    captureRequestReference: createCaptureRequestReference(captureRequests)
  };
  const files = createPackageFiles(packageData);
  const validation = validateBlindVerificationPackage({ files, packageData });
  return { packageData, files, validation };
}

export function writeBlindVerificationPackage(pkg, {
  root = repositoryRoot,
  packageDirectory = defaultPackageDirectory,
  instructionsPath = defaultInstructionsPath,
  printablePath = defaultPrintablePath
} = {}) {
  const absolutePackageDirectory = path.resolve(root, packageDirectory);
  const allowedRoot = path.resolve(root, "data/phase-zero");
  if (!absolutePackageDirectory.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error(`Refusing to write blind verification package outside data/phase-zero: ${packageDirectory}`);
  }
  fs.mkdirSync(absolutePackageDirectory, { recursive: true });
  for (const file of pkg.files.filter((item) => item.relativePath.startsWith(`${packageDirectory}/`))) {
    writeText(root, file.relativePath, file.content);
  }
  writeText(root, instructionsPath, formatBlindVerifierInstructions(pkg.packageData));
  writeText(root, printablePath, formatBlindVerifierPrintablePacket(pkg.packageData));
}

export function validateBlindVerificationPackage({ files, packageData }) {
  const errors = [];
  const warnings = [];
  const required = [
    `${defaultPackageDirectory}/blind_verification_package.json`,
    `${defaultPackageDirectory}/environment_form.csv`,
    `${defaultPackageDirectory}/environment_form.json`,
    `${defaultPackageDirectory}/independent_count_worksheet.csv`,
    `${defaultPackageDirectory}/independent_count_worksheet.json`,
    `${defaultPackageDirectory}/menu_map_worksheet.csv`,
    `${defaultPackageDirectory}/menu_map_worksheet.json`,
    `${defaultPackageDirectory}/creation_path_worksheet.csv`,
    `${defaultPackageDirectory}/creation_path_worksheet.json`,
    `${defaultPackageDirectory}/discrepancy_form.csv`,
    `${defaultPackageDirectory}/discrepancy_form.json`,
    `${defaultPackageDirectory}/evidence_review_form.csv`,
    `${defaultPackageDirectory}/evidence_review_form.json`,
    `${defaultPackageDirectory}/sign_off_form.csv`,
    `${defaultPackageDirectory}/sign_off_form.json`,
    `${defaultPackageDirectory}/data_entry_template.csv`,
    `${defaultPackageDirectory}/data_entry_template.json`,
    `${defaultPackageDirectory}/import_format.json`
  ];
  const paths = new Set(files.map((file) => file.relativePath));
  for (const relativePath of required) {
    if (!paths.has(relativePath)) errors.push(issue("missingBlindPackageFile", `${relativePath} is missing.`));
  }
  const combined = `${JSON.stringify(packageData)}\n${files.map((file) => file.content).join("\n")}`;
  if (/primaryCount(?!sWithheld)|primaryFinalCount|primaryTotal|totalResearchCatalogRecords|directlyObservedUniqueHeadTemplates/.test(combined)) {
    errors.push(issue("primaryCountLeak", "Blind package exposes primary count fields or totals."));
  }
  if (/CF27_XBOXUNKNOWN_RTG_HEAD_\d{3}|Face\s+\d+/.test(combined)) {
    errors.push(issue("primaryHeadRecordLeak", "Blind package exposes primary head record IDs or labels."));
  }
  if (packageData.verificationHasOccurred !== false || packageData.verificationStatus !== "NOT_VERIFIED") {
    errors.push(issue("verificationClaimed", "Blind package must not claim verification occurred."));
  }
  if (packageData.productionRecommendationsEnabled !== false) {
    errors.push(issue("productionRecommendationAccess", "Blind package must not enable production recommendations."));
  }
  const combinedWithDocs = `${combined}\n${formatBlindVerifierInstructions(packageData)}\n${formatBlindVerifierPrintablePacket(packageData)}`;
  if (!combinedWithDocs.includes("Do not look at the primary catalog counts")) {
    warnings.push(issue("missingPlainLanguageBlindRule", "Instructions should plainly tell the verifier not to look at primary counts."));
  }
  return {
    schemaVersion: `${CF27_BLIND_VERIFICATION_PACKAGE_SCHEMA_VERSION}-validation`,
    generatedAt,
    ok: errors.length === 0,
    status: errors.length === 0 ? "passed" : "failed",
    errors,
    warnings,
    summary: {
      fileCount: files.length,
      countTargets: packageData.independentCountWorksheet.rows.length,
      menuRows: packageData.menuMapWorksheet.rows.length,
      creationPathRows: packageData.creationPathWorksheet.rows.length
    }
  };
}

function createEnvironmentForm(environment) {
  return {
    purpose: "Record the verifier's own setup before counting anything.",
    primaryEnvironmentReference: environment.environmentID,
    primaryValuesWithheld: true,
    columns: environmentColumns,
    rows: [
      blankRow(environmentColumns, {
        package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID,
        game_title_seen: "",
        notes: "Fill from the verifier's console or directly visible evidence. Leave unknown fields blank; do not guess."
      })
    ]
  };
}

function createCreationPathWorksheet(creationPaths) {
  const observedPath = creationPaths.creationPaths?.[0] ?? {};
  const steps = observedPath.reproducibleSteps ?? [];
  return {
    purpose: "Navigate the player-creation path yourself and record whether each broad step is reproducible.",
    primaryCountsWithheld: true,
    rows: steps.map((step) => ({
      package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID,
      step_number: step.stepNumber,
      broad_instruction: step.instruction,
      verifier_reached_step: "",
      verifier_screen_label_seen: "",
      evidence_reference: "",
      mismatch_or_notes: ""
    }))
  };
}

function createMenuMapWorksheet(menuMap) {
  const menuRows = (menuMap.records ?? [])
    .filter((record) => record.recordType === "menu")
    .map((record) => ({
      package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID,
      menu_id: record.stableMenuID,
      parent_menu_id: record.parentMenuID,
      displayed_label_to_find: record.displayLabel,
      control_type_hint: record.controlType,
      verifier_seen: "",
      verifier_native_order: "",
      verifier_parent_label: "",
      verifier_child_rows_seen: "",
      boundary_confirmed: "",
      dependency_or_lock_seen: "",
      evidence_reference: "",
      notes: ""
    }));
  const additionalDiscoveryRows = [
    "Any extra appearance category visible",
    "Any extra Head & Skin control visible",
    "Any Hair submenu control visible",
    "Any body/height/weight/physique control visible"
  ].map((label, index) => ({
    package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID,
    menu_id: `new-discovery-${index + 1}`,
    parent_menu_id: "",
    displayed_label_to_find: label,
    control_type_hint: "verifier records if seen",
    verifier_seen: "",
    verifier_native_order: "",
    verifier_parent_label: "",
    verifier_child_rows_seen: "",
    boundary_confirmed: "",
    dependency_or_lock_seen: "",
    evidence_reference: "",
    notes: ""
  }));
  return {
    purpose: "Map menus and controls from the game without using primary totals.",
    primaryCountsWithheld: true,
    rows: [...menuRows, ...additionalDiscoveryRows]
  };
}

function createCountWorksheet() {
  return {
    purpose: "Write your own count, first value, final value, and boundary notes before any primary comparison.",
    primaryCountsWithheld: true,
    rows: countTargets.map((target) => ({
      package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID,
      target_id: target.targetID,
      target_label: target.label,
      target_kind: target.targetKind,
      verifier_task: target.task,
      verifier_count: "",
      first_observed_value: "",
      final_observed_value: "",
      wrap_observed: "",
      native_order_preserved: "",
      selector_boundary_confirmed: "",
      dependency_observed: "",
      evidence_ids: "",
      notes: ""
    }))
  };
}

function createEvidenceReviewForm() {
  return {
    purpose: "Review source videos, screenshots, or frame evidence after independent counting. Do not copy primary counts from evidence filenames or other reports.",
    columns: evidenceReviewColumns,
    rows: [blankRow(evidenceReviewColumns, { package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID })]
  };
}

function createDiscrepancyForm() {
  return {
    purpose: "Record anything that does not match what you saw, including missing evidence, label mismatch, count mismatch, order mismatch, dependency uncertainty, or recapture need.",
    columns: discrepancyColumns,
    rows: [blankRow(discrepancyColumns, { package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID })]
  };
}

function createSignOffForm() {
  return {
    purpose: "Sign only after environment, path, menu, counts, evidence review, discrepancies, and recapture requests are complete.",
    rows: [
      { field: "verifier_id", value: "" },
      { field: "verifier_name_or_initials", value: "" },
      { field: "completed_independent_counts_before_primary_comparison", value: "" },
      { field: "environment_recorded", value: "" },
      { field: "creation_path_reproduced", value: "" },
      { field: "menu_map_completed", value: "" },
      { field: "evidence_review_completed", value: "" },
      { field: "discrepancies_logged", value: "" },
      { field: "recapture_requests_logged", value: "" },
      { field: "final_status", value: "NOT_VERIFIED" },
      { field: "signed_at", value: "" },
      { field: "notes", value: "" }
    ]
  };
}

function createImportFormat() {
  return {
    schemaVersion: "cf27-blind-verifier-import-format-v1",
    packageID: CF27_BLIND_VERIFICATION_PACKAGE_ID,
    csvTemplate: `${defaultPackageDirectory}/data_entry_template.csv`,
    requiredColumns: dataEntryColumns,
    allowedStatusValues: [
      "NOT_VERIFIED",
      "VERIFIED",
      "VERIFIED_WITH_NOTES",
      "RECAPTURE_REQUIRED",
      "VERSION_MISMATCH",
      "MISSING_EVIDENCE",
      "COUNT_MISMATCH",
      "ORDER_MISMATCH",
      "DEPENDENCY_UNRESOLVED"
    ],
    importRules: [
      "Import is allowed only after the verifier completes independent counts.",
      "Rows with VERIFIED or VERIFIED_WITH_NOTES require evidence references and sign-off.",
      "Rows may not contain primary-count columns.",
      "Rows do not enable production recommendations."
    ]
  };
}

function createCaptureRequestReference(captureRequests) {
  return (captureRequests.requests ?? []).map((request) => ({
    capture_id: request.captureID,
    priority: request.priority,
    title: sanitizeBlindVerifierText(request.title),
    exact_menu_path: sanitizeBlindVerifierText(request.exactMenuPath),
    acceptance_summary: sanitizeBlindVerifierText(request.acceptanceCriteria),
    verifier_note: "Use this as guidance for what to record or review; do not use any primary option count."
  }));
}

function createPackageFiles(packageData) {
  const files = [
    jsonFile("blind_verification_package.json", packageData),
    csvFile("environment_form.csv", packageData.environmentForm.rows, environmentColumns),
    jsonFile("environment_form.json", packageData.environmentForm),
    csvFile("creation_path_worksheet.csv", packageData.creationPathWorksheet.rows),
    jsonFile("creation_path_worksheet.json", packageData.creationPathWorksheet),
    csvFile("menu_map_worksheet.csv", packageData.menuMapWorksheet.rows),
    jsonFile("menu_map_worksheet.json", packageData.menuMapWorksheet),
    csvFile("independent_count_worksheet.csv", packageData.independentCountWorksheet.rows),
    jsonFile("independent_count_worksheet.json", packageData.independentCountWorksheet),
    csvFile("evidence_review_form.csv", packageData.evidenceReviewForm.rows, evidenceReviewColumns),
    jsonFile("evidence_review_form.json", packageData.evidenceReviewForm),
    csvFile("discrepancy_form.csv", packageData.discrepancyForm.rows, discrepancyColumns),
    jsonFile("discrepancy_form.json", packageData.discrepancyForm),
    csvFile("sign_off_form.csv", packageData.signOffForm.rows),
    jsonFile("sign_off_form.json", packageData.signOffForm),
    csvFile("data_entry_template.csv", [blankRow(dataEntryColumns, { package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID })], dataEntryColumns),
    jsonFile("data_entry_template.json", { columns: dataEntryColumns, rows: [blankRow(dataEntryColumns, { package_id: CF27_BLIND_VERIFICATION_PACKAGE_ID })] }),
    jsonFile("import_format.json", packageData.importFormat),
    jsonFile("capture_request_reference.json", packageData.captureRequestReference),
    csvFile("capture_request_reference.csv", packageData.captureRequestReference)
  ].map((file) => ({ ...file, relativePath: `${defaultPackageDirectory}/${file.fileName}` }));
  return files;
}

export function formatBlindVerifierInstructions(packageData) {
  return `# Blind Second-Verifier Instructions

**Status:** NOT PRODUCTION DATA / NOT_VERIFIED  
**Package:** ${packageData.packageID}  
**Primary counts:** WITHHELD UNTIL YOU SUBMIT YOUR INDEPENDENT RESULTS

This packet is for a second human verifier. It is written for a friend or family member sitting beside the console.

## Before You Start

Do not look at the primary catalog counts, current research catalog exports, head lists, or option totals before you finish your worksheets. Your job is to make a fresh count from the game and evidence.

Use plain observations:

- If you can read a label, write it exactly.
- If a value is unclear, write "unclear".
- If a category is not visible, write "not seen".
- If the menu wraps, write where the wrap happens.
- If a dependency, lock, warning, or account requirement appears, write it down.
- Do not guess missing values.
- Do not average your answer with anyone else's answer.

## Work Order

1. Fill out the environment form.
2. Navigate the creation path and complete the creation-path worksheet.
3. Map the Appearance, Head & Skin, and Hair menus.
4. Count Head Templates.
5. Count Hairstyles.
6. Count Facial Hair and facial-hair colors.
7. Confirm additional categories such as Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Mouth Shape, Jaw Shape, and Chin.
8. Preserve native order by writing values in the order they appear.
9. Confirm first value, final value, and selector wrap or no-wrap.
10. Review evidence after your independent counts are written.
11. File discrepancies and recapture requests.
12. Complete the sign-off form.

## Files To Use

- Environment form: \`${defaultPackageDirectory}/environment_form.csv\`
- Independent count worksheet: \`${defaultPackageDirectory}/independent_count_worksheet.csv\`
- Menu-map worksheet: \`${defaultPackageDirectory}/menu_map_worksheet.csv\`
- Evidence review form: \`${defaultPackageDirectory}/evidence_review_form.csv\`
- Discrepancy form: \`${defaultPackageDirectory}/discrepancy_form.csv\`
- Sign-off form: \`${defaultPackageDirectory}/sign_off_form.csv\`
- Data-entry template: \`${defaultPackageDirectory}/data_entry_template.csv\`
- Import format: \`${defaultPackageDirectory}/import_format.json\`

## Important

This does not verify the catalog by itself. Verification happens only after your completed forms are imported, compared, discrepancies are resolved, and allowed statuses are assigned.
`;
}

export function formatBlindVerifierPrintablePacket(packageData) {
  const countLines = packageData.independentCountWorksheet.rows.map((row) => `- [ ] ${row.target_label}: count ____ first value ____ final value ____ wrap/no-wrap ____ evidence ____ notes ____`);
  const menuLines = packageData.menuMapWorksheet.rows.map((row) => `- [ ] ${row.displayed_label_to_find}: seen ____ order ____ parent ____ boundary ____ dependency/lock ____ notes ____`);
  return `# Blind Second-Verifier Printable Packet

**Do not look at primary counts before completing this packet.**

## Environment

- Verifier ID: ____________________
- Date/time: ____________________
- Console/platform: ____________________
- Game version/build visible: ____________________
- Patch/update visible: ____________________
- Online/account state: ____________________
- Capture method: ____________________
- Notes: ____________________

## Creation Path

- [ ] Start from the College Football 27 main interface.
- [ ] Enter Road to Glory.
- [ ] Reach Create Player.
- [ ] Open Player.
- [ ] Open Appearance.
- [ ] Open Head & Skin.
- [ ] Open Hair if visible.
- [ ] Write any mismatch or missing step.

## Menu Map

${menuLines.join("\n")}

## Independent Counts

${countLines.join("\n")}

## Evidence Review

- Evidence ID or filename: ____________________
- Does it open? yes / no
- Does it match the target? yes / no / unsure
- Is the timestamp visible or recorded? yes / no
- Quality: usable / ambiguous / recapture required
- Notes: ____________________

## Discrepancy

- Target: ____________________
- Type: count / order / label / evidence / dependency / version / other
- What you observed: ____________________
- Evidence: ____________________
- Recapture required? yes / no
- Notes: ____________________

## Sign-Off

- [ ] I completed independent counts before looking at any primary count.
- [ ] I recorded the environment.
- [ ] I checked the creation path.
- [ ] I mapped menus and native order.
- [ ] I reviewed evidence.
- [ ] I recorded discrepancies and recapture needs.
- Final status: NOT_VERIFIED / RECAPTURE_REQUIRED / VERSION_MISMATCH / MISSING_EVIDENCE / COUNT_MISMATCH / ORDER_MISMATCH / DEPENDENCY_UNRESOLVED / VERIFIED_WITH_NOTES / VERIFIED
- Signature/initials: ____________________
`;
}

function blankRow(columns, values = {}) {
  return Object.fromEntries(columns.map((column) => [column, values[column] ?? ""]));
}

function jsonFile(fileName, value) {
  return { fileName, content: `${JSON.stringify(value, null, 2)}\n` };
}

function csvFile(fileName, rows, columns = null) {
  const resolvedColumns = columns ?? [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const content = `${[
    resolvedColumns.join(","),
    ...rows.map((row) => resolvedColumns.map((column) => csvEscape(row[column] ?? "")).join(","))
  ].join("\n")}\n`;
  return { fileName, content };
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, content) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function issue(code, message) {
  return { code, message };
}

function sanitizeBlindVerifierText(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeBlindVerifierText(item)).join(" | ");
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll(/faces?\s+\d+\s*(?:-|through|to)\s*\d+/gi, "[withheld primary head range]")
    .replaceAll(/Face\s+\d+/g, "[withheld primary head value]");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checkOnly = process.argv.includes("--check");
  const pkg = buildBlindVerificationPackage();
  if (checkOnly) {
    const stale = [];
    for (const file of pkg.files) {
      const outputPath = path.resolve(repositoryRoot, file.relativePath);
      if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== file.content) stale.push(file.relativePath);
    }
    const docs = [
      [defaultInstructionsPath, formatBlindVerifierInstructions(pkg.packageData)],
      [defaultPrintablePath, formatBlindVerifierPrintablePacket(pkg.packageData)]
    ];
    for (const [relativePath, content] of docs) {
      const outputPath = path.resolve(repositoryRoot, relativePath);
      if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== content) stale.push(relativePath);
    }
    if (stale.length > 0) {
      console.error(`Blind verification package is stale. Run npm run cf27:blind-verification-package.`);
      console.error(`Stale files: ${stale.join(", ")}`);
      process.exit(1);
    }
  } else {
    writeBlindVerificationPackage(pkg);
  }
  console.log(JSON.stringify({
    packageID: pkg.packageData.packageID,
    status: pkg.validation.status,
    files: pkg.files.length + 2,
    countTargets: pkg.packageData.independentCountWorksheet.rows.length,
    menuRows: pkg.packageData.menuMapWorksheet.rows.length,
    errors: pkg.validation.errors.length
  }, null, 2));
  if (!pkg.validation.ok) process.exitCode = 1;
}
