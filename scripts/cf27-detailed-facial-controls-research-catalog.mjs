#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateAppearanceControlsResearchCatalog } from "./cf27-appearance-controls-research-catalog.mjs";

export const CF27_DETAILED_FACIAL_CONTROLS_SCHEMA_VERSION = "cf27-detailed-facial-controls-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T01:15:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";

const defaultJsonPath = "data/phase-zero/detailed_facial_controls.research.json";
const defaultCsvPath = "data/phase-zero/detailed_facial_controls.research.csv";
const defaultMarkdownPath = "docs/phase-zero/DETAILED_FACIAL_CONTROLS_RESEARCH_CATALOG.md";

const requestedControlTerms = [
  "Eyebrows",
  "Brow Shape",
  "Brow Color",
  "Mouth",
  "Lips",
  "Jaw",
  "Chin",
  "Cheeks",
  "Face Shape",
  "Eye Depth",
  "Nose Depth",
  "Ear Size",
  "Head Width",
  "Head Height",
  "Scars",
  "Blemishes",
  "Freckles",
  "Complexion",
  "Morphs",
  "Blends",
  "Sliders",
  "Fine-Tuning Controls"
];

const observedValueAliases = new Map([
  ["Scars", ["Scar 1", "Scar 2", "Scar 3"]],
  ["Freckles", ["Freckles 1", "Freckles 2"]]
]);

const menuOnlyAlias = new Map([
  ["Mouth", "Mouth Shape"],
  ["Jaw", "Jaw Shape"],
  ["Chin", "Chin"]
]);

export function generateDetailedFacialControlsCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const appearanceOutputs = generateAppearanceControlsResearchCatalog({ root, generatedAt });
  const appearanceCatalog = appearanceOutputs.catalog;
  const directControls = appearanceCatalog.categories.map((category) => directControlFromCategory(category, appearanceCatalog.records));
  const menuOnlyControls = appearanceCatalog.menuOnlyObservedCategories.map(menuOnlyControlFromCategory);
  const allNativeValues = new Set(appearanceCatalog.records.map((record) => record.nativeDisplayLabel));
  const requestedCoverage = requestedControlTerms.map((term) => requestedCoverageRecord(term, directControls, menuOnlyControls, allNativeValues));
  const records = directControls.flatMap((control) => control.values.map((value) => ({
    detailedControlID: control.detailedControlID,
    nativeControlLabel: control.nativeControlLabel,
    nativeDisplayLabel: value.nativeDisplayLabel,
    nativeOptionNumber: value.nativeOptionNumber,
    nativeOrder: value.nativeOrder,
    valueKind: value.valueKind,
    dataClass: value.dataClass,
    productionStatus: value.productionStatus,
    verificationStatus: value.verificationStatus,
    evidenceFramePath: value.evidenceFrame?.path ?? null,
    sourceTimestampRange: value.sourceTimestampRange,
    recommendationSuitability: control.recommendationSuitability
  })));

  return {
    schemaVersion: CF27_DETAILED_FACIAL_CONTROLS_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceAppearanceControlsCatalog: "data/phase-zero/additional_attributes.research.json",
    summary: {
      directlyObservedControlCount: directControls.length,
      menuOnlyObservedControlCount: menuOnlyControls.length,
      requestedTermCount: requestedControlTerms.length,
      directlyObservedValueCount: records.length,
      productionEligibleRecordCount: 0,
      observedNativeControls: directControls.map((control) => control.nativeControlLabel),
      menuOnlyNativeControls: menuOnlyControls.map((control) => control.nativeControlLabel),
      requestedTermsNotObservedAsStandaloneControls: requestedCoverage
        .filter((item) => item.coverageStatus !== "DIRECT_CONTROL_OBSERVED")
        .map((item) => item.requestedTerm)
    },
    rules: [
      "This catalog preserves only directly observed native labels and values.",
      "Menu-only controls do not receive invented values, ranges, defaults, or counts.",
      "Requested controls absent from current evidence are recorded as not observed, not inferred absent.",
      "All entries remain research-only and unsuitable for production recommendations until verification and production gates pass."
    ],
    controls: [...directControls, ...menuOnlyControls],
    requestedCoverage,
    records
  };
}

export function writeDetailedFacialControlsCatalog(catalog, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.jsonPath ?? defaultJsonPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeText(root, options.csvPath ?? defaultCsvPath, formatControlsCsv(catalog.controls));
  writeText(root, options.markdownPath ?? defaultMarkdownPath, formatMarkdown(catalog));
}

function directControlFromCategory(category, allRecords) {
  const values = allRecords
    .filter((record) => record.category === category.category)
    .map((record) => ({
      stableResearchCatalogID: record.stableResearchCatalogID,
      nativeDisplayLabel: record.nativeDisplayLabel,
      nativeOptionNumber: record.nativeOptionNumber,
      nativeOrder: record.nativeOrder,
      valueKind: record.valueKind,
      dataClass: record.dataClass,
      productionStatus: record.productionStatus,
      verificationStatus: record.verificationStatus,
      sourceVideo: record.sourceVideo,
      sourceTimestampRange: record.sourceTimestampRange,
      evidenceFrame: record.evidenceFrame,
      effectProfile: record.effectProfile,
      automaticChangesOrDependencies: record.automaticChangesOrDependencies,
      visualEvidenceQuality: record.visualEvidenceQuality,
      confidence: record.confidence,
      productionEligibility: record.productionEligibility
    }));

  const sample = values[0];
  return {
    detailedControlID: `detailed-control-${slugify(category.nativeCategoryLabel)}`,
    observationStatus: "DIRECT_VALUES_OBSERVED_PENDING_VERIFICATION",
    nativeControlLabel: category.nativeCategoryLabel,
    displayedControlLabel: category.displayedCategoryLabel,
    parentMenu: category.parentMenu,
    parentMenuID: category.parentMenuID,
    menuID: category.menuID,
    controlType: category.controlType,
    values,
    valueCount: values.length,
    valuesOrRangeStatus: values.length > 0 ? "DIRECTLY_OBSERVED_VALUES_ONLY" : "NO_VALUES_OBSERVED",
    totalCount: category.totalCount,
    totalCountStatus: category.totalCountStatus,
    minimum: category.sliderBoundaries.minimum,
    maximum: category.sliderBoundaries.maximum,
    default: category.visibleDefault,
    defaultStatus: category.visibleDefaultStatus,
    stepSize: category.sliderBoundaries.step,
    sliderStatus: category.sliderBoundaries.status,
    firstObservedValue: category.firstObservedValue,
    lastObservedValue: category.lastObservedValue,
    selectorWrapStatus: category.selectorWrapStatus,
    affectsGeometry: sample?.effectProfile.geometry ?? "not_supported_by_current_evidence",
    affectsTexture: sample?.effectProfile.texture ?? "not_supported_by_current_evidence",
    affectsColor: sample?.effectProfile.color ?? "not_supported_by_current_evidence",
    affectsPresentation: sample?.effectProfile.presentationOnly ?? "not_supported_by_current_evidence",
    dependencyBehavior: category.automaticChangesOrDependencies.dependenciesObserved,
    resetBehavior: category.automaticChangesOrDependencies.resetBehaviorObserved,
    laterEditabilityStatus: "UNKNOWN_NOT_DEMONSTRATED_IN_CURRENT_EVIDENCE",
    evidence: values.map((value) => ({
      stableResearchCatalogID: value.stableResearchCatalogID,
      nativeDisplayLabel: value.nativeDisplayLabel,
      evidenceFramePath: value.evidenceFrame?.path ?? null,
      sourceVideo: value.sourceVideo,
      sourceTimestampRange: value.sourceTimestampRange
    })),
    evidenceStatus: "DIRECT_SELECTED_VALUE_EVIDENCE_AVAILABLE",
    recommendationSuitability: "UNSUITABLE_RESEARCH_ONLY_NOT_VERIFIED",
    productionEligibility: category.productionEligibility,
    ambiguities: category.ambiguityAndMissingRanges,
    notes: [
      "Values are research observations only.",
      "Selector boundaries, defaults, later editability, and dependency behavior remain unverified unless explicitly demonstrated."
    ]
  };
}

function menuOnlyControlFromCategory(category) {
  return {
    detailedControlID: `detailed-control-${slugify(category.displayedCategoryLabel)}`,
    observationStatus: "MENU_ROW_OBSERVED_VALUES_NOT_CAPTURED",
    nativeControlLabel: category.displayedCategoryLabel,
    displayedControlLabel: category.displayedCategoryLabel,
    parentMenu: "Head & Skin",
    parentMenuID: category.parentMenuID,
    menuID: category.menuID,
    controlType: category.controlType,
    values: [],
    valueCount: 0,
    valuesOrRangeStatus: "NO_VALUES_OR_RANGE_CAPTURED",
    totalCount: null,
    totalCountStatus: "COUNT_UNKNOWN",
    minimum: null,
    maximum: null,
    default: null,
    defaultStatus: "UNKNOWN_NOT_DIRECTLY_SHOWN",
    stepSize: null,
    sliderStatus: "UNKNOWN_CONTROL_NOT_INSPECTED",
    firstObservedValue: null,
    lastObservedValue: null,
    selectorWrapStatus: "NOT_OBSERVED",
    affectsGeometry: "not_supported_by_current_evidence",
    affectsTexture: "not_supported_by_current_evidence",
    affectsColor: "not_supported_by_current_evidence",
    affectsPresentation: "not_supported_by_current_evidence",
    dependencyBehavior: "NOT_OBSERVED",
    resetBehavior: "NOT_OBSERVED",
    laterEditabilityStatus: "UNKNOWN_NOT_DEMONSTRATED_IN_CURRENT_EVIDENCE",
    evidence: category.sourceEvidence ?? [],
    evidenceStatus: category.sourceTimestampStatus,
    recommendationSuitability: "UNSUITABLE_MENU_ONLY_NO_VALUES_CATALOGED",
    productionEligibility: {
      eligible: false,
      reason: "Only the menu row is observed. No values, range, default, dependencies, or production evidence are cataloged."
    },
    ambiguities: [
      "Native values are not captured.",
      "Control type is not proven beyond current menu-map classification.",
      "Minimum, maximum, default, step size, wrap behavior, and later editability are unknown."
    ],
    notes: [
      "This control is visible in the menu map but has no selected-option timeline evidence.",
      "No recommendation can use this control until values are captured and verified."
    ]
  };
}

function requestedCoverageRecord(term, directControls, menuOnlyControls, allNativeValues) {
  const direct = directControls.find((control) => normalize(control.nativeControlLabel) === normalize(term));
  if (direct) {
    return {
      requestedTerm: term,
      coverageStatus: "DIRECT_CONTROL_OBSERVED",
      mappedNativeControlLabel: direct.nativeControlLabel,
      mappedNativeValues: direct.values.map((value) => value.nativeDisplayLabel),
      note: "The current evidence contains this native control label."
    };
  }

  const menuLabel = menuOnlyAlias.get(term);
  const menuOnly = menuOnlyControls.find((control) => control.nativeControlLabel === menuLabel);
  if (menuOnly) {
    return {
      requestedTerm: term,
      coverageStatus: "MENU_ROW_OBSERVED_VALUES_NOT_CAPTURED",
      mappedNativeControlLabel: menuOnly.nativeControlLabel,
      mappedNativeValues: [],
      note: "The menu row is visible, but no values or range are captured."
    };
  }

  const valueAliases = observedValueAliases.get(term) ?? [];
  const observedValues = valueAliases.filter((value) => allNativeValues.has(value));
  if (observedValues.length > 0) {
    return {
      requestedTerm: term,
      coverageStatus: "OBSERVED_AS_NATIVE_VALUE_UNDER_SKIN_DETAILS",
      mappedNativeControlLabel: "Skin Details",
      mappedNativeValues: observedValues,
      note: "Current evidence supports these as native Skin Details values, not as a standalone control."
    };
  }

  return {
    requestedTerm: term,
    coverageStatus: "NOT_OBSERVED_IN_CURRENT_EVIDENCE",
    mappedNativeControlLabel: null,
    mappedNativeValues: [],
    note: "No standalone control or native value with this label is directly observed in the current footage. This is not a claim that the game lacks the control."
  };
}

function formatControlsCsv(controls) {
  const columns = [
    "detailedControlID",
    "nativeControlLabel",
    "observationStatus",
    "controlType",
    "valueCount",
    "valuesOrRangeStatus",
    "totalCountStatus",
    "defaultStatus",
    "selectorWrapStatus",
    "affectsGeometry",
    "affectsTexture",
    "affectsColor",
    "affectsPresentation",
    "dependencyBehavior",
    "resetBehavior",
    "laterEditabilityStatus",
    "evidenceStatus",
    "recommendationSuitability"
  ];
  return toCsv(columns, controls);
}

function formatMarkdown(catalog) {
  const lines = [
    "# Detailed Facial Controls Research Catalog",
    "",
    "PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED",
    "",
    `Generated: ${catalog.generatedAt}`,
    "",
    "This document catalogs only directly observed facial controls and values from current College Football 27 research evidence. It does not invent absent controls, missing values, ranges, defaults, sliders, or dependencies.",
    "",
    "## Summary",
    "",
    `- Directly observed controls with selected values: ${catalog.summary.directlyObservedControlCount}`,
    `- Menu-only observed controls: ${catalog.summary.menuOnlyObservedControlCount}`,
    `- Directly observed values: ${catalog.summary.directlyObservedValueCount}`,
    `- Production-eligible records: ${catalog.summary.productionEligibleRecordCount}`,
    "",
    "## Controls",
    ""
  ];

  for (const control of catalog.controls) {
    lines.push(`### ${control.nativeControlLabel}`);
    lines.push("");
    lines.push(`- Status: ${control.observationStatus}`);
    lines.push(`- Control type: ${control.controlType}`);
    lines.push(`- Values/range: ${control.valuesOrRangeStatus}`);
    lines.push(`- Value count: ${control.valueCount}`);
    lines.push(`- Total count: ${control.totalCountStatus}`);
    lines.push(`- Minimum / maximum / step: ${display(control.minimum)} / ${display(control.maximum)} / ${display(control.stepSize)}`);
    lines.push(`- Default: ${display(control.default)} (${control.defaultStatus})`);
    lines.push(`- Effects: geometry=${control.affectsGeometry}; texture=${control.affectsTexture}; color=${control.affectsColor}; presentation=${control.affectsPresentation}`);
    lines.push(`- Dependency/reset/later editability: ${control.dependencyBehavior}; ${control.resetBehavior}; ${control.laterEditabilityStatus}`);
    lines.push(`- Recommendation suitability: ${control.recommendationSuitability}`);
    if (control.values.length > 0) {
      lines.push(`- Native values: ${control.values.map((value) => value.nativeDisplayLabel).join(", ")}`);
    }
    lines.push("");
  }

  lines.push("## Requested-Term Coverage");
  lines.push("");
  lines.push("| Requested term | Status | Native control | Native values |");
  lines.push("| --- | --- | --- | --- |");
  for (const item of catalog.requestedCoverage) {
    lines.push(`| ${item.requestedTerm} | ${item.coverageStatus} | ${display(item.mappedNativeControlLabel)} | ${item.mappedNativeValues.join("; ") || "None"} |`);
  }
  lines.push("");
  lines.push("## Production Gate");
  lines.push("");
  lines.push("No detailed facial-control record in this catalog is production eligible. Production recommendations remain blocked until a verified catalog release passes the production gate.");
  return `${lines.join("\n")}\n`;
}

function display(value) {
  return value === null || value === undefined || value === "" ? "UNKNOWN" : String(value);
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

function writeText(root, relativePath, text) {
  const filePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalize(text) {
  return String(text).trim().toLowerCase();
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
  console.log("Usage: node scripts/cf27-detailed-facial-controls-research-catalog.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const catalog = generateDetailedFacialControlsCatalog(options);
    writeDetailedFacialControlsCatalog(catalog, options);
    console.log(`Detailed facial-control research catalog generated: ${catalog.controls.length} controls, ${catalog.records.length} values.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
