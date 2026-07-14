#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_FACIAL_HAIR_COLOR_RESEARCH_SCHEMA_VERSION = "cf27-facial-hair-color-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T04:10:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "REQUESTED_NOT_CAPTURED";
const requiredViews = ["MENU", "FRONT_REPRESENTATIVE_FRAME_PER_VALUE", "LEFT_3Q_IF_NEEDED_FOR_VISIBILITY"];

const defaultMenuMapPath = "data/phase-zero/menu_map.research.json";
const defaultCaptureRequestsPath = "data/phase-zero/capture_requests.json";
const defaultOutputJsonPath = "data/phase-zero/facial_hair_colors.research.json";
const defaultOutputCsvPath = "data/phase-zero/facial_hair_colors.research.csv";
const defaultQualityJsonPath = "data/phase-zero/facial_hair_color_quality_report.research.json";
const defaultQualityCsvPath = "data/phase-zero/facial_hair_color_quality_report.research.csv";
const defaultRecaptureJsonPath = "data/phase-zero/facial_hair_color_recapture_report.research.json";
const defaultRecaptureCsvPath = "data/phase-zero/facial_hair_color_recapture_report.research.csv";
const defaultCatalogDocPath = "docs/phase-zero/FACIAL_HAIR_COLOR_RESEARCH_CATALOG.md";
const defaultQualityDocPath = "docs/phase-zero/FACIAL_HAIR_COLOR_QUALITY_REPORT.md";
const defaultRecaptureDocPath = "docs/phase-zero/FACIAL_HAIR_COLOR_RECAPTURE_REPORT.md";
const defaultEvidenceRoot = "data/phase-zero/facial-hair-color-evidence";

export function generateFacialHairColorResearchCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const menuMap = readJson(path.resolve(root, options.menuMapPath ?? defaultMenuMapPath));
  const captureRequests = readJson(path.resolve(root, options.captureRequestsPath ?? defaultCaptureRequestsPath));

  const hairMenuRecord = (menuMap.records ?? []).find((record) => record.stableMenuID === "cf27-menu-appearance-hair")
    ?? (menuMap.records ?? []).find((record) => record.displayLabel === "Hair");
  const hairBoundaryRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-007");
  const facialHairColorRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-010");

  const records = [];
  const catalog = {
    schemaVersion: CF27_FACIAL_HAIR_COLOR_RESEARCH_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_FACIAL_HAIR_COLOR_RESEARCH_CATALOG",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceMenuMap: options.menuMapPath ?? defaultMenuMapPath,
    sourceCaptureRequests: options.captureRequestsPath ?? defaultCaptureRequestsPath,
    directObservationPolicy: [
      "Create facial-hair-color records only from directly selected native game values.",
      "Do not infer facial-hair colors from hair-color controls, current head-template footage, visible preview colors, or expected game behavior.",
      "Preserve native labels or indices exactly; never replace unreadable native values with guessed color names.",
      "Researcher-applied color descriptions must remain separate from native game labels and indices.",
      "Do not assume every facial-hair style supports every color unless directly tested."
    ],
    summary: {
      recordCount: records.length,
      productionEligibleRecords: 0,
      hairMenuRowObserved: Boolean(hairMenuRecord),
      facialHairColorControlObserved: false,
      facialHairColorNativeValuesObserved: false,
      totalObservedCount: 0,
      nativeOrderStatus: "NOT_OBSERVED",
      countStatus: "COUNT_UNKNOWN",
      defaultStatus: "DEFAULT_NOT_DEMONSTRATED",
      selectorBoundaryStatus: "BOUNDARIES_UNKNOWN",
      selectorWrapStatus: "NOT_OBSERVED",
      evidenceExtractionStatus: "NO_FACIAL_HAIR_COLOR_OPTION_FRAMES_AVAILABLE",
      recaptureRequired: true,
      blocker: "Current evidence shows the Hair submenu row only. It does not open Hair or show any facial-hair-color control or selected facial-hair-color values."
    },
    canonicalContext: {
      selectedCanonicalFacialHairStyle: "UNCONFIRMED_NOT_CAPTURED",
      selectedCanonicalHairstyle: "UNCONFIRMED_NOT_CAPTURED",
      selectedCanonicalHead: "UNCONFIRMED_NOT_CAPTURED",
      selectedCanonicalSkinSetting: "UNCONFIRMED_NOT_CAPTURED",
      framingConsistency: "NOT_ASSESSABLE_NO_FACIAL_HAIR_COLOR_SEQUENCE",
      notes: [
        "No current footage confirms the facial-hair style used for a facial-hair-color pass.",
        "No current footage confirms the head, hairstyle, or skin setting used for a facial-hair-color pass.",
        "No current footage opens the Hair submenu or proves whether a separate facial-hair-color control exists."
      ]
    },
    sourceEvidence: {
      hairMenuRow: hairMenuRecord ? compactHairMenuRecord(hairMenuRecord) : null,
      hairBoundaryCaptureRequest: hairBoundaryRequest ? compactCaptureRequest(hairBoundaryRequest) : null,
      facialHairColorCaptureRequest: facialHairColorRequest ? compactCaptureRequest(facialHairColorRequest) : null,
      facialHairColorOptionEvidence: []
    },
    viewCoverage: {
      requiredViews,
      extractedViews: [],
      missingViews: requiredViews,
      status: "NO_OPTION_VIEW_EVIDENCE_AVAILABLE"
    },
    menuDependencyAssessment: {
      relationshipToHairColor: "UNKNOWN_NOT_TESTED",
      hairColorAutomaticallyChangesFacialHairColor: "UNKNOWN_NOT_TESTED",
      allFacialHairStylesSupportAllColors: "UNKNOWN_NOT_TESTED",
      noneAffectsColorAvailability: "UNKNOWN_NOT_TESTED",
      changesByFacialHairStyle: "UNKNOWN_NOT_TESTED",
      changesByHead: "UNKNOWN_NOT_TESTED",
      changesByHairstyle: "UNKNOWN_NOT_TESTED",
      changesByPosition: "UNKNOWN_NOT_TESTED",
      changesByMode: "UNKNOWN_NOT_TESTED",
      changesByBodyType: "UNKNOWN_NOT_TESTED",
      changesByAccount: "UNKNOWN_NOT_TESTED",
      changesByUnlockState: "UNKNOWN_NOT_TESTED",
      notes: [
        "Facial-hair-color dependencies cannot be assessed until GFM-CAP-007 maps visible Hair controls and GFM-CAP-010 captures facial-hair-related controls if present.",
        "Hair color and facial-hair color must remain separate controls unless direct footage proves they are linked."
      ]
    },
    researcherAppliedColorMetadata: {
      status: "NONE_RECORDED_NO_OPTION_EVIDENCE",
      separationRule: "Any future approximate color-family notes must be stored under researcherAppliedColorMetadata, separate from nativeGameLabel and nativeIndex.",
      prohibitedReplacementRule: "Do not replace native labels or indices with guessed color names."
    },
    records
  };

  const qualityReport = buildQualityReport(catalog, generatedAt);
  const recaptureReport = buildRecaptureReport(catalog, generatedAt);
  return { catalog, qualityReport, recaptureReport };
}

export function writeFacialHairColorResearchCatalog(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const { catalog, qualityReport, recaptureReport } = outputs;
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatFacialHairColorCsv(catalog.records));
  writeText(root, options.qualityJsonPath ?? defaultQualityJsonPath, `${JSON.stringify(qualityReport, null, 2)}\n`);
  writeText(root, options.qualityCsvPath ?? defaultQualityCsvPath, formatRowsCsv(qualityReport.checks));
  writeText(root, options.recaptureJsonPath ?? defaultRecaptureJsonPath, `${JSON.stringify(recaptureReport, null, 2)}\n`);
  writeText(root, options.recaptureCsvPath ?? defaultRecaptureCsvPath, formatRowsCsv(recaptureReport.requests));
  writeText(root, options.catalogDocPath ?? defaultCatalogDocPath, formatCatalogMarkdown(catalog));
  writeText(root, options.qualityDocPath ?? defaultQualityDocPath, formatQualityMarkdown(qualityReport));
  writeText(root, options.recaptureDocPath ?? defaultRecaptureDocPath, formatRecaptureMarkdown(recaptureReport));
  writeEvidenceFolders(root, options.evidenceRoot ?? defaultEvidenceRoot);
}

function buildQualityReport(catalog, generatedAt) {
  const checks = [
    check("native_values", "NO_RECORDS_CREATED", "No native facial-hair-color labels or indices have been entered."),
    check("native_order", "NOT_OBSERVED", "No facial-hair-color selector has been traversed."),
    check("total_observed_count", "COUNT_UNKNOWN", "No facial-hair-color selector has been counted."),
    check("default", "NOT_DEMONSTRATED", "No facial-hair-color default is visible in current evidence."),
    check("selector_boundaries", "BOUNDARIES_UNKNOWN", "No first or final facial-hair-color value is visible."),
    check("selector_wrap", "NOT_DEMONSTRATED", "No facial-hair-color boundary or wrap proof exists."),
    check("relationship_to_hair_color", "UNKNOWN_NOT_TESTED", "No evidence proves whether hair color and facial-hair color are linked or separate."),
    check("hair_color_auto_change", "UNKNOWN_NOT_TESTED", "No evidence proves whether selecting hair color automatically changes facial-hair color."),
    check("all_styles_support_all_colors", "UNKNOWN_NOT_TESTED", "No facial-hair styles or facial-hair-color values have been cross-tested."),
    check("none_color_availability", "UNKNOWN_NOT_TESTED", "No evidence proves whether selecting None hides, disables, or preserves facial-hair color availability."),
    check("required_views", "MISSING", `Missing all required views: ${requiredViews.join(", ")}.`)
  ];
  return {
    schemaVersion: "cf27-facial-hair-color-quality-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_FACIAL_HAIR_COLOR_QUALITY_REPORT",
    sourceType: catalog.sourceType,
    productionStatus,
    verificationStatus,
    summary: {
      status: "BLOCKED_NO_FACIAL_HAIR_COLOR_CONTROL_EVIDENCE",
      valuesAssessed: 0,
      valuesAcceptedForResearch: 0,
      valuesRejected: 0,
      sequenceLevelRecaptureRequired: true,
      blocker: catalog.summary.blocker
    },
    checks
  };
}

function buildRecaptureReport(catalog, generatedAt) {
  return {
    schemaVersion: "cf27-facial-hair-color-recapture-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_FACIAL_HAIR_COLOR_RECAPTURE_REPORT",
    sourceType: catalog.sourceType,
    productionStatus,
    verificationStatus,
    summary: {
      openRequests: 1,
      productionBlockers: 1,
      captureRequestIDs: ["GFM-CAP-007", "GFM-CAP-010"],
      status: "OPEN_RECAPTURE_REQUIRED"
    },
    requests: [
      {
        recaptureID: "FACIAL-HAIR-COLOR-RECAPTURE-001",
        priority: "P0",
        linkedCaptureRequestIDs: ["GFM-CAP-007", "GFM-CAP-010"],
        exactMenuPath: "Create Player > Player > Appearance > Hair, then the visible facial-hair-color control only if directly shown",
        reason: "Current evidence proves only that Hair is visible as an Appearance submenu row. It does not show a facial-hair-color control or selected facial-hair-color values.",
        requiredCanonicalContext: [
          "Confirm the native facial-hair style used for color review.",
          "Confirm the native head, hairstyle, and skin setting.",
          "Keep lighting and framing stable across all selected facial-hair-color values.",
          "Record whether Hair Color and Facial Hair Color are separate controls or visibly linked."
        ],
        requiredEvidence: [
          "Hair submenu boundary map from GFM-CAP-007.",
          "Readable native facial-hair-color label or index for every selected value.",
          "Two complete counts when selector boundaries make that possible.",
          "Representative frames for MENU, FRONT_REPRESENTATIVE_FRAME_PER_VALUE, and LEFT_3Q_IF_NEEDED_FOR_VISIBILITY.",
          "Boundary or wrap/no-wrap proof for first and final values.",
          "Default-state evidence.",
          "Observation of whether selecting hair color automatically changes facial-hair color.",
          "Observation of whether every facial-hair style supports every color.",
          "Observation of whether None hides, disables, or preserves color availability."
        ],
        acceptanceCriteria: [
          "Every entered facial-hair-color record is backed by directly selected native game evidence.",
          "Native order is preserved without inferred skipped values.",
          "Researcher-applied color descriptions are stored separately and never replace native labels.",
          "Hair-color relationship, automatic linkage, style support, None behavior, defaults, wrapping, and dependencies are recorded only when demonstrated.",
          "No record is assigned VERIFIED or production eligibility during primary research."
        ],
        existingFootageUsefulness: "Current footage remains useful only to show that Hair appears as an Appearance submenu row.",
        status: "OPEN",
        productionBlocker: true
      }
    ]
  };
}

function check(checkID, status, finding) {
  return {
    checkID,
    status,
    finding,
    productionImpact: "BLOCKS_PRODUCTION_FACIAL_HAIR_COLOR_RECORDS",
    evidence: null
  };
}

function compactHairMenuRecord(record) {
  return {
    stableMenuID: record.stableMenuID,
    displayLabel: record.displayLabel,
    nativeLabel: record.nativeLabel,
    nativeOrder: record.nativeOrder,
    captureStatus: record.captureStatus,
    inspected: record.inspected,
    complete: record.complete,
    gapFlags: record.gapFlags ?? [],
    evidence: record.evidence ?? [],
    missingEvidence: record.missingEvidence ?? []
  };
}

function compactCaptureRequest(request) {
  return {
    captureID: request.captureID,
    title: request.title,
    priority: request.priority,
    exactMenuPath: request.exactMenuPath,
    requiredViews: request.requiredViews ?? request.requiredCameraViews ?? [],
    twoIndependentCountsRequired: request.twoIndependentCountsRequired,
    verificationStatus: request.verificationStatus,
    existingFootageCanBeReused: request.existingFootageCanBeReused,
    acceptanceCriteria: request.acceptanceCriteria ?? []
  };
}

function formatFacialHairColorCsv(records) {
  const headers = [
    "stableResearchID",
    "nativeOrder",
    "nativeGameLabel",
    "nativeIndex",
    "sourceVideoID",
    "sourceTimestamp",
    "menuEvidencePath",
    "frontEvidencePath",
    "leftThreeQuarterEvidencePath",
    "selectedCanonicalFacialHairStyle",
    "selectedCanonicalHairstyle",
    "selectedCanonicalHead",
    "defaultStatus",
    "selectorBoundaryStatus",
    "selectorWrapStatus",
    "relationshipToHairColor",
    "hairColorAutomaticallyChangesFacialHairColor",
    "allFacialHairStylesSupportAllColors",
    "noneAffectsColorAvailability",
    "dependencyObservations",
    "researcherAppliedColorMetadata",
    "verificationStatus",
    "productionStatus"
  ];
  return `${headers.join(",")}\n${records.map((record) => headers.map((header) => csvCell(record[header])).join(",")).join("\n")}${records.length ? "\n" : ""}`;
}

function formatRowsCsv(rows) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function formatCatalogMarkdown(catalog) {
  return `# Facial Hair Color Research Catalog

Status: **${catalog.productionStatus}**  
Verification: **${catalog.verificationStatus}**

## Summary

- Research records: ${catalog.summary.recordCount}
- Production-eligible records: ${catalog.summary.productionEligibleRecords}
- Hair menu row observed: ${catalog.summary.hairMenuRowObserved ? "yes" : "no"}
- Facial-hair-color control observed: ${catalog.summary.facialHairColorControlObserved ? "yes" : "no"}
- Total observed count: ${catalog.summary.totalObservedCount}
- Complete selector counted twice: ${catalog.summary.completeSelectorDoubleCountAvailable ? "yes" : "no"}
- Native order status: ${catalog.summary.nativeOrderStatus}
- Count status: ${catalog.summary.countStatus}
- Default status: ${catalog.summary.defaultStatus}
- Selector boundary status: ${catalog.summary.selectorBoundaryStatus}
- Selector wrap status: ${catalog.summary.selectorWrapStatus}

## Finding

Current evidence shows the **Hair** submenu row, but no current video opens the Hair submenu or directly selects facial-hair-color values. No facial-hair-color option records were created.

## Canonical Context

- Selected canonical facial-hair style: ${catalog.canonicalContext.selectedCanonicalFacialHairStyle}
- Selected canonical hairstyle: ${catalog.canonicalContext.selectedCanonicalHairstyle}
- Selected canonical head: ${catalog.canonicalContext.selectedCanonicalHead}
- Selected canonical skin setting: ${catalog.canonicalContext.selectedCanonicalSkinSetting}

## Menu Dependencies

- Relationship to hair color: ${catalog.menuDependencyAssessment.relationshipToHairColor}
- Hair color automatically changes facial-hair color: ${catalog.menuDependencyAssessment.hairColorAutomaticallyChangesFacialHairColor}
- All facial-hair styles support all colors: ${catalog.menuDependencyAssessment.allFacialHairStylesSupportAllColors}
- None affects color availability: ${catalog.menuDependencyAssessment.noneAffectsColorAvailability}

## Evidence Coverage

Required option views: ${catalog.viewCoverage.requiredViews.join(", ")}

Extracted facial-hair-color option views: none.

## Researcher-Applied Color Metadata Rule

No researcher-applied color metadata exists yet because no facial-hair-color values have been directly captured. Future approximate color descriptions must remain separate from native game labels and must never replace native labels or indices.

## Production Eligibility

No facial-hair-color record is production eligible. A verified production catalog still requires direct option evidence, QA, second-person verification, and catalog-manager approval.
`;
}

function formatQualityMarkdown(report) {
  return `# Facial Hair Color Quality Report

Status: **${report.summary.status}**

${report.summary.blocker}

| Check | Status | Finding |
| --- | --- | --- |
${report.checks.map((row) => `| ${row.checkID} | ${row.status} | ${row.finding} |`).join("\n")}
`;
}

function formatRecaptureMarkdown(report) {
  const request = report.requests[0];
  return `# Facial Hair Color Recapture Report

Status: **${report.summary.status}**

## ${request.recaptureID}

- Priority: ${request.priority}
- Linked capture requests: ${request.linkedCaptureRequestIDs.join(", ")}
- Exact menu path: ${request.exactMenuPath}
- Reason: ${request.reason}
- Existing footage usefulness: ${request.existingFootageUsefulness}

## Required Canonical Context

${request.requiredCanonicalContext.map((item) => `- ${item}`).join("\n")}

## Required Evidence

${request.requiredEvidence.map((item) => `- ${item}`).join("\n")}

## Acceptance Criteria

${request.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}
`;
}

function writeEvidenceFolders(root, evidenceRoot) {
  const readme = `# Facial Hair Color Evidence Folder

Status: NOT PRODUCTION DATA

This folder is reserved for derivative facial-hair-color evidence generated from direct College Football 27 facial-hair-color capture. It is intentionally empty because the current evidence does not open the Hair submenu or show any facial-hair-color control values.

Required future views:

${requiredViews.map((view) => `- ${view}`).join("\n")}

Do not place master videos here. Masters must remain preserved unchanged and referenced through the source evidence inventory.
`;
  writeText(root, path.join(evidenceRoot, "README.md"), readme);
  for (const view of requiredViews.map((view) => view.toLowerCase().replaceAll("_", "-"))) {
    writeText(root, path.join(evidenceRoot, view, ".gitkeep"), "");
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, contents) {
  const outputPath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, contents);
}

function csvCell(value) {
  if (value == null) return "";
  const text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const checkOnly = process.argv.includes("--check");
  const outputs = generateFacialHairColorResearchCatalog();
  if (checkOnly) {
    if (outputs.catalog.records.length !== 0) {
      console.error("Facial-hair-color research catalog unexpectedly produced records without selector evidence.");
      process.exit(1);
    }
    console.log("Facial-hair-color research catalog check passed: zero production records, recapture required.");
  } else {
    writeFacialHairColorResearchCatalog(outputs);
    console.log("Wrote facial-hair-color research catalog, quality report, recapture report, and evidence folder placeholders.");
  }
}
