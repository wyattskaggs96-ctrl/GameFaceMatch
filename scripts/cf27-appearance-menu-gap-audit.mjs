#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_APPEARANCE_MENU_GAP_AUDIT_VERSION = "cf27-appearance-menu-gap-audit-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultMenuMapPath = "data/phase-zero/menu_map.research.json";
const defaultTimelinePath = "data/phase-zero/video_timeline.json";
const defaultHeadsPath = "data/phase-zero/heads.research.json";
const defaultAdditionalAttributesPath = "data/phase-zero/additional_attributes.research.json";
const defaultCaptureRequestsPath = "data/phase-zero/capture_requests.json";
const defaultOutputJsonPath = "data/phase-zero/appearance_menu_gap_matrix.json";
const defaultOutputCsvPath = "data/phase-zero/appearance_menu_gap_matrix.csv";
const defaultOutputDocPath = "docs/phase-zero/APPEARANCE_MENU_GAP_MATRIX.md";
const defaultMenuCaptureGapsPath = "docs/phase-zero/MENU_CAPTURE_GAPS.md";
const generatedAtDefault = "2026-07-14T01:30:00-04:00";

const requiredButUnobservedSourceCategories = [
  {
    label: "Hairstyles",
    sourceBasis: "Source-of-truth MVP requires hairstyle recommendations, but current footage only proves a Hair submenu row.",
    likelyParent: "Hair"
  },
  {
    label: "Hair colors",
    sourceBasis: "Source-of-truth MVP requires hair-color recommendations, but current footage has not opened the Hair submenu.",
    likelyParent: "Hair"
  },
  {
    label: "Facial hair",
    sourceBasis: "Source-of-truth MVP requires facial-hair recommendations, but current footage has not opened the Hair submenu.",
    likelyParent: "Hair"
  },
  {
    label: "Facial-hair colors",
    sourceBasis: "Source-of-truth MVP requires facial-hair color handling when supported, but current footage has not opened the Hair submenu.",
    likelyParent: "Hair"
  },
  {
    label: "Eyebrows",
    sourceBasis: "The matching and profile requirements include eyebrows, but current footage does not show a native Eyebrows control.",
    likelyParent: "Unknown"
  },
  {
    label: "Body/height/weight/physique",
    sourceBasis: "The product requirements include height, weight, body type, and physique preferences, but current appearance-menu footage does not inspect those controls.",
    likelyParent: "Unknown"
  }
];

const unknownInspectionAreas = [
  {
    label: "Additional Appearance rows beyond visible Head & Skin and Hair",
    sourceBasis: "Appearance was not fully boundary-captured, so additional rows cannot be confirmed absent.",
    likelyParent: "Appearance"
  },
  {
    label: "Additional Head & Skin rows beyond visible Chin",
    sourceBasis: "Head & Skin was not fully boundary-captured, so rows after Chin or before Head Template cannot be confirmed absent.",
    likelyParent: "Head & Skin"
  },
  {
    label: "Hair submenu child controls",
    sourceBasis: "Hair is visible as a submenu row, but the submenu was not opened in current footage.",
    likelyParent: "Hair"
  }
];

const explicitCaptureRequestsByLabel = new Map([
  ["Appearance", ["GFM-CAP-001"]],
  ["Head & Skin", ["GFM-CAP-001"]],
  ["Head Template", ["GFM-CAP-002", "GFM-CAP-004"]],
  ["Skin Tone", ["GFM-CAP-005"]],
  ["Skin Details", ["GFM-CAP-005"]],
  ["Eye Shape", ["GFM-CAP-005"]],
  ["Eye Color", ["GFM-CAP-005"]],
  ["Nose", ["GFM-CAP-006"]],
  ["Ear Shape", ["GFM-CAP-006"]],
  ["Mouth Shape", ["GFM-CAP-006"]],
  ["Jaw Shape", ["GFM-CAP-006"]],
  ["Chin", ["GFM-CAP-006"]],
  ["Hair", ["GFM-CAP-007"]],
  ["Hairstyles", ["GFM-CAP-007", "GFM-CAP-008"]],
  ["Hair colors", ["GFM-CAP-007", "GFM-CAP-009"]],
  ["Facial hair", ["GFM-CAP-007", "GFM-CAP-010"]],
  ["Facial-hair colors", ["GFM-CAP-007", "GFM-CAP-010"]],
  ["Body/height/weight/physique", []],
  ["Additional Appearance rows beyond visible Head & Skin and Hair", ["GFM-CAP-001"]],
  ["Additional Head & Skin rows beyond visible Chin", ["GFM-CAP-001"]],
  ["Hair submenu child controls", ["GFM-CAP-007"]]
]);

const menuOrderRankByLabel = new Map([
  ["Appearance", 10],
  ["Head & Skin", 20],
  ["Head Template", 30],
  ["Skin Tone", 40],
  ["Skin Details", 50],
  ["Eye Shape", 60],
  ["Eye Color", 70],
  ["Nose", 80],
  ["Ear Shape", 90],
  ["Mouth Shape", 100],
  ["Jaw Shape", 110],
  ["Chin", 120],
  ["Hair", 130]
]);

export function generateAppearanceMenuGapAudit(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const menuMap = readJson(path.resolve(root, options.menuMapPath ?? defaultMenuMapPath));
  const timeline = readJson(path.resolve(root, options.timelinePath ?? defaultTimelinePath));
  const heads = readJson(path.resolve(root, options.headsPath ?? defaultHeadsPath));
  const additionalAttributes = readJson(path.resolve(root, options.additionalAttributesPath ?? defaultAdditionalAttributesPath));
  const captureRequests = readJson(path.resolve(root, options.captureRequestsPath ?? defaultCaptureRequestsPath));

  const rows = [
    ...confirmedMenuRows(menuMap, timeline, heads, additionalAttributes, captureRequests),
    ...requiredButUnobservedRows(captureRequests),
    ...unknownInspectionRows(captureRequests)
  ];
  const summary = summarizeRows(rows);
  return {
    schemaVersion: CF27_APPEARANCE_MENU_GAP_AUDIT_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "RESEARCH_GAP_AUDIT",
    productionStatus: "NOT_PRODUCTION_DATA",
    sourceMenuMap: options.menuMapPath ?? defaultMenuMapPath,
    sourceTimeline: options.timelinePath ?? defaultTimelinePath,
    sourceHeadCatalog: options.headsPath ?? defaultHeadsPath,
    sourceAdditionalAttributes: options.additionalAttributesPath ?? defaultAdditionalAttributesPath,
    sourceCaptureRequests: options.captureRequestsPath ?? defaultCaptureRequestsPath,
    rules: [
      "Do not infer categories, values, counts, boundaries, defaults, or absence from other games.",
      "Treat visible menu rows without selected values as confirmed present but incomplete.",
      "Treat source-required but unobserved recommendation surfaces as suspected, not game facts.",
      "Treat uninspected menu regions as unknown, not absent.",
      "No row in this gap audit is production eligible."
    ],
    summary,
    rows
  };
}

export function writeAppearanceMenuGapAudit(audit, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatGapCsv(audit.rows));
  const markdown = formatGapMarkdown(audit);
  writeText(root, options.outputDocPath ?? defaultOutputDocPath, markdown);
  writeText(root, options.menuCaptureGapsPath ?? defaultMenuCaptureGapsPath, formatMenuCaptureGapsMarkdown(audit));
}

function confirmedMenuRows(menuMap, timeline, heads, additionalAttributes, captureRequests) {
  const selectedByLabel = selectedValueCounts(timeline);
  const additionalByCategory = new Map((additionalAttributes.categories ?? []).map((category) => [category.category, category]));
  const recordsByCategory = new Map();
  for (const record of additionalAttributes.records ?? []) {
    const list = recordsByCategory.get(record.category) ?? [];
    list.push(record);
    recordsByCategory.set(record.category, list);
  }

  return (menuMap.records ?? [])
    .filter((record) => record.recordType === "menu")
    .sort((left, right) => menuOrderRank(left.displayLabel) - menuOrderRank(right.displayLabel) || String(left.displayLabel).localeCompare(String(right.displayLabel)))
    .map((record) => {
      const label = record.displayLabel;
      const headCategory = label === "Head Template";
      const attributeCategory = additionalByCategory.get(label);
      const selectedCount = headCategory
        ? heads.summary?.totalSelectedObservations ?? 0
        : selectedByLabel.get(label.toUpperCase()) ?? attributeCategory?.selectedObservationCount ?? 0;
      const catalogedCount = headCategory
        ? heads.summary?.directlyObservedUniqueHeadTemplates ?? 0
        : recordsByCategory.get(label)?.length ?? 0;
      const hasSelectedValues = selectedCount > 0 || catalogedCount > 0;
      const visibleOnly = !record.inspected && selectedCount === 0;
      const hasNumberedControl = String(record.controlType ?? "").includes("numbered");
      const missingRangeValues = headCategory
        ? heads.summary?.skippedNumbersWithinObservedRange ?? []
        : attributeCategory?.missingObservedRangeValues ?? [];
      const selectorBoundaryMissing = hasGap(record, "FIRST_VALUE_UNKNOWN") || hasGap(record, "FINAL_VALUE_UNKNOWN") || record.countStatus === "COUNT_UNKNOWN";
      const stableConditionsMissing = !["Appearance", "Head & Skin", "Hair"].includes(label);
      const visualViewsMissing = isVisualMatchingCategory(label) && !hasProductionViewEvidence(label, record, headCategory, attributeCategory);
      const productionUnsuitableReasons = productionUnsuitableReasonsFor({
        label,
        record,
        headCategory,
        attributeCategory,
        selectedCount,
        catalogedCount,
        selectorBoundaryMissing,
        missingRangeValues,
        stableConditionsMissing,
        visualViewsMissing
      });
      const categoryStatus = record.complete === true && productionUnsuitableReasons.length === 0
        ? "CONFIRMED_PRESENT_COMPLETE_FOR_RESEARCH"
        : "CONFIRMED_PRESENT_INCOMPLETE";

      return {
        gapID: `appearance-gap-${slug(label)}`,
        displayedCategoryLabel: label,
        stableMenuID: record.stableMenuID,
        parentMenuID: record.parentMenuID ?? null,
        parentMenuLabel: parentLabel(record.parentMenuID),
        nativeOrder: record.nativeOrder ?? null,
        evidenceBasis: hasSelectedValues ? "SELECTED_VALUES_OBSERVED" : "MENU_ROW_VISIBLE_ONLY",
        classification: categoryStatus,
        controlType: record.controlType ?? "UNKNOWN",
        captureStatus: record.captureStatus ?? "UNKNOWN",
        directlySelectedObservationCount: selectedCount,
        directlyCatalogedValueCount: catalogedCount,
        visibleCountStatus: record.countStatus ?? attributeCategory?.totalCountStatus ?? "COUNT_UNKNOWN",
        defaultStatus: record.defaultValue ? "DEFAULT_VISIBLE" : "DEFAULT_NOT_DEMONSTRATED",
        wrapStatus: record.wrapBehavior ?? attributeCategory?.selectorWrapStatus ?? "UNKNOWN",
        notCaptured: visibleOnly,
        partiallyCaptured: true,
        capturedWithoutClearIndices: hasNumberedControl && missingRangeValues.length > 0,
        capturedWithoutSelectorBoundaries: selectorBoundaryMissing,
        capturedWithoutStableConditions: stableConditionsMissing,
        capturedWithoutSufficientVisualViews: visualViewsMissing,
        capturedButUnsuitableForProductionMatching: productionUnsuitableReasons.length > 0,
        productionUnsuitableReasons,
        missingEvidence: [
          ...(record.missingEvidence ?? []),
          ...(missingRangeValues.length > 0 ? [`Resolve observed numeric/index gaps: ${missingRangeValues.join(", ")}.`] : []),
          ...(stableConditionsMissing ? ["Record under locked canonical conditions before production matching use."] : []),
          ...(visualViewsMissing ? ["Capture required standardized visual views for production matching suitability."] : [])
        ],
        sourceEvidence: normalizeSourceEvidence(record.evidence ?? []),
        relatedCaptureRequestIDs: captureRequestsForLabel(captureRequests, label),
        productionEligible: false,
        notes: [
          "Research-only gap audit row.",
          hasSelectedValues ? "Directly selected values exist in current evidence." : "Only the menu/category row is visible in current evidence."
        ]
      };
    });
}

function requiredButUnobservedRows(captureRequests) {
  return requiredButUnobservedSourceCategories.map((category) => ({
    gapID: `appearance-gap-suspected-${slug(category.label)}`,
    displayedCategoryLabel: category.label,
    stableMenuID: null,
    parentMenuID: null,
    parentMenuLabel: category.likelyParent,
    nativeOrder: null,
    evidenceBasis: "SOURCE_REQUIRED_NOT_DIRECTLY_OBSERVED",
    classification: "SUSPECTED_NOT_OBSERVED",
    controlType: "UNKNOWN_NOT_OBSERVED",
    captureStatus: "NOT_CAPTURED",
    directlySelectedObservationCount: 0,
    directlyCatalogedValueCount: 0,
    visibleCountStatus: "COUNT_UNKNOWN",
    defaultStatus: "DEFAULT_NOT_DEMONSTRATED",
    wrapStatus: "UNKNOWN",
    notCaptured: true,
    partiallyCaptured: false,
    capturedWithoutClearIndices: false,
    capturedWithoutSelectorBoundaries: true,
    capturedWithoutStableConditions: true,
    capturedWithoutSufficientVisualViews: true,
    capturedButUnsuitableForProductionMatching: true,
    productionUnsuitableReasons: [
      "No direct native game category, selected values, boundaries, defaults, or visual evidence are present in current footage."
    ],
    missingEvidence: [
      category.sourceBasis,
      "Capture direct shipping-game evidence before creating research candidate records."
    ],
    sourceEvidence: [],
    relatedCaptureRequestIDs: captureRequestsForLabel(captureRequests, category.label),
    productionEligible: false,
    notes: [
      "This row is a source-required product gap, not a confirmed College Football 27 native category."
    ]
  }));
}

function unknownInspectionRows(captureRequests) {
  return unknownInspectionAreas.map((area) => ({
    gapID: `appearance-gap-unknown-${slug(area.label)}`,
    displayedCategoryLabel: area.label,
    stableMenuID: null,
    parentMenuID: null,
    parentMenuLabel: area.likelyParent,
    nativeOrder: null,
    evidenceBasis: "MENU_REGION_NOT_FULLY_INSPECTED",
    classification: "UNKNOWN_MENU_NOT_FULLY_INSPECTED",
    controlType: "UNKNOWN",
    captureStatus: "UNKNOWN_NOT_FULLY_INSPECTED",
    directlySelectedObservationCount: 0,
    directlyCatalogedValueCount: 0,
    visibleCountStatus: "COUNT_UNKNOWN",
    defaultStatus: "DEFAULT_NOT_DEMONSTRATED",
    wrapStatus: "UNKNOWN",
    notCaptured: true,
    partiallyCaptured: false,
    capturedWithoutClearIndices: false,
    capturedWithoutSelectorBoundaries: true,
    capturedWithoutStableConditions: true,
    capturedWithoutSufficientVisualViews: true,
    capturedButUnsuitableForProductionMatching: true,
    productionUnsuitableReasons: [
      "The relevant menu region has not been fully inspected, so additional categories cannot be confirmed absent or cataloged."
    ],
    missingEvidence: [
      area.sourceBasis,
      "Record complete first-to-final menu boundary evidence and scrolling continuation where applicable."
    ],
    sourceEvidence: [],
    relatedCaptureRequestIDs: captureRequestsForLabel(captureRequests, area.label),
    productionEligible: false,
    notes: [
      "This row records uncertainty caused by incomplete menu inspection, not a native game option."
    ]
  }));
}

function summarizeRows(rows) {
  const count = (classification) => rows.filter((row) => row.classification === classification).length;
  return {
    totalRows: rows.length,
    confirmedPresentIncomplete: count("CONFIRMED_PRESENT_INCOMPLETE"),
    confirmedPresentCompleteForResearch: count("CONFIRMED_PRESENT_COMPLETE_FOR_RESEARCH"),
    suspectedButNotObserved: count("SUSPECTED_NOT_OBSERVED"),
    confirmedAbsent: count("CONFIRMED_ABSENT"),
    unknownBecauseMenuNotFullyInspected: count("UNKNOWN_MENU_NOT_FULLY_INSPECTED"),
    notCaptured: rows.filter((row) => row.notCaptured).length,
    partiallyCaptured: rows.filter((row) => row.partiallyCaptured).length,
    capturedWithoutClearIndices: rows.filter((row) => row.capturedWithoutClearIndices).length,
    capturedWithoutSelectorBoundaries: rows.filter((row) => row.capturedWithoutSelectorBoundaries).length,
    capturedWithoutStableConditions: rows.filter((row) => row.capturedWithoutStableConditions).length,
    capturedWithoutSufficientVisualViews: rows.filter((row) => row.capturedWithoutSufficientVisualViews).length,
    capturedButUnsuitableForProductionMatching: rows.filter((row) => row.capturedButUnsuitableForProductionMatching).length,
    productionEligibleRows: rows.filter((row) => row.productionEligible).length
  };
}

function selectedValueCounts(timeline) {
  const counts = new Map();
  for (const record of timeline.records ?? []) {
    if (record.event_type !== "option_change" || !record.visible_option_label) continue;
    counts.set(record.visible_menu_label, (counts.get(record.visible_menu_label) ?? 0) + 1);
  }
  return counts;
}

function productionUnsuitableReasonsFor(input) {
  const reasons = [];
  if (input.selectedCount === 0 && input.catalogedCount === 0) reasons.push("No selected option values are cataloged.");
  if (input.selectorBoundaryMissing) reasons.push("Selector first/final boundary, default, total count, or wrap/no-wrap proof is missing.");
  if (input.missingRangeValues.length > 0) reasons.push(`Observed numeric/index range has unresolved gaps: ${input.missingRangeValues.join(", ")}.`);
  if (input.stableConditionsMissing) reasons.push("Canonical capture conditions are not locked and independently verified.");
  if (input.visualViewsMissing) reasons.push("Required standardized visual views are missing or insufficient.");
  if (input.record?.verificationStatus !== "VERIFIED" && input.record?.verificationStatus !== "VERIFIED_WITH_NOTES") reasons.push("Independent second-person verification has not occurred.");
  return reasons;
}

function normalizeSourceEvidence(evidence) {
  return evidence.map((entry) => ({
    ...entry,
    sourceType: entry.sourceType ?? "research",
    dataClass: entry.dataClass ?? "RESEARCH_GAP_AUDIT",
    productionStatus: entry.productionStatus ?? "NOT_PRODUCTION_DATA",
    verificationStatus: entry.verificationStatus ?? "OBSERVED_PENDING_VERIFICATION"
  }));
}

function hasProductionViewEvidence(label, record, headCategory, attributeCategory) {
  if (["Appearance", "Head & Skin", "Hair"].includes(label)) return false;
  if (headCategory) return false;
  if (attributeCategory?.productionEligibility?.eligible === true) return true;
  return false;
}

function isVisualMatchingCategory(label) {
  return !["Appearance", "Head & Skin", "Hair"].includes(label);
}

function hasGap(record, gap) {
  return Array.isArray(record.gapFlags) && record.gapFlags.includes(gap);
}

function captureRequestsForLabel(captureRequests, label) {
  const explicit = explicitCaptureRequestsByLabel.get(label);
  if (explicit) {
    const known = new Set((captureRequests.requests ?? []).map((request) => request.captureID).filter(Boolean));
    return explicit.filter((captureID) => known.has(captureID)).sort();
  }
  const normalized = label.toLowerCase();
  return (captureRequests.requests ?? [])
    .filter((request) => JSON.stringify(request).toLowerCase().includes(normalized))
    .map((request) => request.captureID)
    .filter(Boolean)
    .sort();
}

function menuOrderRank(label) {
  return menuOrderRankByLabel.get(label) ?? 999;
}

function parentLabel(parentMenuID) {
  if (parentMenuID === "cf27-menu-player-appearance") return "Appearance";
  if (parentMenuID === "cf27-menu-appearance-head-skin") return "Head & Skin";
  if (parentMenuID === "menu-cf27-create-player-player-tab") return "Player tab";
  return parentMenuID ?? "Unknown";
}

function formatGapCsv(rows) {
  const columns = [
    "gapID",
    "displayedCategoryLabel",
    "classification",
    "evidenceBasis",
    "parentMenuLabel",
    "nativeOrder",
    "controlType",
    "directlySelectedObservationCount",
    "directlyCatalogedValueCount",
    "visibleCountStatus",
    "defaultStatus",
    "wrapStatus",
    "notCaptured",
    "partiallyCaptured",
    "capturedWithoutClearIndices",
    "capturedWithoutSelectorBoundaries",
    "capturedWithoutStableConditions",
    "capturedWithoutSufficientVisualViews",
    "capturedButUnsuitableForProductionMatching",
    "relatedCaptureRequestIDs",
    "productionEligible",
    "productionUnsuitableReasons"
  ];
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(Array.isArray(row[column]) ? row[column].join("; ") : row[column])).join(",")).join("\n")}\n`;
}

function formatGapMarkdown(audit) {
  return [
    "# Appearance Menu Gap Matrix",
    "",
    "PRIMARY RESEARCH GAP AUDIT - NOT PRODUCTION VERIFIED",
    "",
    "This matrix is generated from current Phase 0 menu-map, timeline, research-catalog, screenshot/evidence, and capture-request artifacts. It does not infer College Football 27 categories from other games and does not enable production recommendations.",
    "",
    "## Summary",
    "",
    `- Confirmed present but incomplete: ${audit.summary.confirmedPresentIncomplete}`,
    `- Confirmed present and complete for research: ${audit.summary.confirmedPresentCompleteForResearch}`,
    `- Suspected but not observed: ${audit.summary.suspectedButNotObserved}`,
    `- Confirmed absent: ${audit.summary.confirmedAbsent}`,
    `- Unknown because the menu was not fully inspected: ${audit.summary.unknownBecauseMenuNotFullyInspected}`,
    `- Captured but unsuitable for production matching: ${audit.summary.capturedButUnsuitableForProductionMatching}`,
    `- Production-eligible rows: ${audit.summary.productionEligibleRows}`,
    "",
    "## Exact Gap Matrix",
    "",
    "| Category | Classification | Evidence basis | Selected observations | Cataloged values | Count status | Boundary gap | Stable conditions gap | Visual views gap | Production suitability | Next capture requests |",
    "| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |",
    ...audit.rows.map((row) => `| ${row.displayedCategoryLabel} | ${row.classification} | ${row.evidenceBasis} | ${row.directlySelectedObservationCount} | ${row.directlyCatalogedValueCount} | ${row.visibleCountStatus} | ${yesNo(row.capturedWithoutSelectorBoundaries)} | ${yesNo(row.capturedWithoutStableConditions)} | ${yesNo(row.capturedWithoutSufficientVisualViews)} | ${row.capturedButUnsuitableForProductionMatching ? "blocked" : "research usable"} | ${(row.relatedCaptureRequestIDs ?? []).join(", ") || "none linked"} |`),
    "",
    "## Classification Notes",
    "",
    "- `CONFIRMED_PRESENT_INCOMPLETE`: the current footage directly shows the category or row, but evidence is incomplete.",
    "- `CONFIRMED_PRESENT_COMPLETE_FOR_RESEARCH`: reserved for direct evidence with research-complete boundaries and required views. Current count is zero.",
    "- `SUSPECTED_NOT_OBSERVED`: the product/source requirements need this recommendation surface, but the native game category has not been directly observed.",
    "- `CONFIRMED_ABSENT`: reserved for categories proven absent by full boundary inspection. Current count is zero.",
    "- `UNKNOWN_MENU_NOT_FULLY_INSPECTED`: incomplete menu inspection prevents any absence or presence claim.",
    "",
    "## Production Gate",
    "",
    "Every row remains blocked from production matching until complete direct evidence, stable capture conditions, second-person verification, catalog-manager approval, and publish-gate validation pass."
  ].join("\n") + "\n";
}

function formatMenuCaptureGapsMarkdown(audit) {
  const confirmed = audit.rows.filter((row) => row.classification === "CONFIRMED_PRESENT_INCOMPLETE");
  return [
    "# Menu Capture Gaps",
    "",
    "These gaps identify what is missing before the current appearance menu map can support production catalog publication.",
    "",
    "Canonical full matrix: `data/phase-zero/appearance_menu_gap_matrix.json` and `docs/phase-zero/APPEARANCE_MENU_GAP_MATRIX.md`.",
    "",
    "| Menu | Flags | Missing evidence | Next action |",
    "| --- | --- | --- | --- |",
    ...confirmed.map((row) => {
      const flags = [
        row.captureStatus,
        row.visibleCountStatus,
        row.capturedWithoutSelectorBoundaries ? "SELECTOR_BOUNDARIES_MISSING" : "",
        row.capturedWithoutClearIndices ? "INDEX_GAPS_OR_UNCLEAR_INDICES" : "",
        row.capturedWithoutStableConditions ? "STABLE_CONDITIONS_MISSING" : "",
        row.capturedWithoutSufficientVisualViews ? "VISUAL_VIEWS_INSUFFICIENT" : "",
        "RECAPTURE_REQUIRED"
      ].filter(Boolean).join(", ");
      return `| ${row.displayedCategoryLabel} | ${flags} | ${row.missingEvidence.join(" ")} | ${row.relatedCaptureRequestIDs.length ? `Execute ${row.relatedCaptureRequestIDs.join(", ")}.` : "Record complete direct evidence before creating production records."} |`;
    }),
    "",
    "## Non-Observed And Unknown Categories",
    "",
    "| Category | Classification | Reason |",
    "| --- | --- | --- |",
    ...audit.rows
      .filter((row) => row.classification !== "CONFIRMED_PRESENT_INCOMPLETE")
      .map((row) => `| ${row.displayedCategoryLabel} | ${row.classification} | ${row.missingEvidence.join(" ")} |`)
  ].join("\n") + "\n";
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function readJson(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function writeText(root, relativePath, contents) {
  const absolutePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const audit = generateAppearanceMenuGapAudit();
  writeAppearanceMenuGapAudit(audit);
  console.log(`Appearance menu gap matrix generated: ${audit.summary.totalRows} rows, ${audit.summary.confirmedPresentIncomplete} confirmed-present incomplete.`);
}
