#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_HAIR_COLOR_RESEARCH_SCHEMA_VERSION = "cf27-hair-color-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T03:15:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "REQUESTED_NOT_CAPTURED";
const requiredViews = ["MENU", "FRONT_REPRESENTATIVE_FRAME_PER_VALUE", "LEFT_3Q_IF_NEEDED_FOR_VISIBILITY"];

const defaultMenuMapPath = "data/phase-zero/menu_map.research.json";
const defaultCaptureRequestsPath = "data/phase-zero/capture_requests.json";
const defaultOutputJsonPath = "data/phase-zero/hair_colors.research.json";
const defaultOutputCsvPath = "data/phase-zero/hair_colors.research.csv";
const defaultQualityJsonPath = "data/phase-zero/hair_color_quality_report.research.json";
const defaultQualityCsvPath = "data/phase-zero/hair_color_quality_report.research.csv";
const defaultRecaptureJsonPath = "data/phase-zero/hair_color_recapture_report.research.json";
const defaultRecaptureCsvPath = "data/phase-zero/hair_color_recapture_report.research.csv";
const defaultCatalogDocPath = "docs/phase-zero/HAIR_COLOR_RESEARCH_CATALOG.md";
const defaultQualityDocPath = "docs/phase-zero/HAIR_COLOR_QUALITY_REPORT.md";
const defaultRecaptureDocPath = "docs/phase-zero/HAIR_COLOR_RECAPTURE_REPORT.md";
const defaultEvidenceRoot = "data/phase-zero/hair-color-evidence";

export function generateHairColorResearchCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const menuMap = readJson(path.resolve(root, options.menuMapPath ?? defaultMenuMapPath));
  const captureRequests = readJson(path.resolve(root, options.captureRequestsPath ?? defaultCaptureRequestsPath));

  const hairMenuRecord = (menuMap.records ?? []).find((record) => record.stableMenuID === "cf27-menu-appearance-hair")
    ?? (menuMap.records ?? []).find((record) => record.displayLabel === "Hair");
  const hairBoundaryRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-007");
  const hairColorRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-009");

  const records = [];
  const catalog = {
    schemaVersion: CF27_HAIR_COLOR_RESEARCH_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_HAIR_COLOR_RESEARCH_CATALOG",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceMenuMap: options.menuMapPath ?? defaultMenuMapPath,
    sourceCaptureRequests: options.captureRequestsPath ?? defaultCaptureRequestsPath,
    directObservationPolicy: [
      "Create hair-color records only from directly selected native game values.",
      "Do not infer hair colors from a visible Hair submenu row or from current head-template footage.",
      "Preserve native labels or indices exactly; never replace unreadable native values with guessed color names.",
      "Researcher-applied color descriptions must remain separate from native game labels."
    ],
    summary: {
      recordCount: records.length,
      productionEligibleRecords: 0,
      hairMenuRowObserved: Boolean(hairMenuRecord),
      hairColorControlObserved: false,
      hairColorNativeValuesObserved: false,
      completeSelectorDoubleCountAvailable: false,
      nativeOrderStatus: "NOT_OBSERVED",
      countStatus: "COUNT_UNKNOWN",
      defaultStatus: "DEFAULT_NOT_DEMONSTRATED",
      selectorWrapStatus: "NOT_OBSERVED",
      evidenceExtractionStatus: "NO_HAIR_COLOR_OPTION_FRAMES_AVAILABLE",
      recaptureRequired: true,
      blocker: "Current evidence shows the Hair submenu row only. It does not open Hair or show any hair-color control or selected hair-color values."
    },
    canonicalContext: {
      selectedCanonicalHairstyle: "UNCONFIRMED_NOT_CAPTURED",
      selectedCanonicalHead: "UNCONFIRMED_NOT_CAPTURED",
      selectedCanonicalSkinSetting: "UNCONFIRMED_NOT_CAPTURED",
      selectedFacialHairState: "UNCONFIRMED_NOT_CAPTURED",
      framingConsistency: "NOT_ASSESSABLE_NO_HAIR_COLOR_SEQUENCE",
      notes: [
        "No current footage confirms the hairstyle used for a hair-color pass.",
        "No current footage confirms the head used for a hair-color pass.",
        "No current footage opens the Hair submenu or proves whether a hair-color control exists."
      ]
    },
    sourceEvidence: {
      hairMenuRow: hairMenuRecord ? compactHairMenuRecord(hairMenuRecord) : null,
      hairBoundaryCaptureRequest: hairBoundaryRequest ? compactCaptureRequest(hairBoundaryRequest) : null,
      hairColorCaptureRequest: hairColorRequest ? compactCaptureRequest(hairColorRequest) : null,
      hairColorOptionEvidence: []
    },
    viewCoverage: {
      requiredViews,
      extractedViews: [],
      missingViews: requiredViews,
      status: "NO_OPTION_VIEW_EVIDENCE_AVAILABLE"
    },
    observations: {
      hairTexturePresentationChanges: "UNKNOWN_NOT_TESTED",
      eyebrowsChangeAutomatically: "UNKNOWN_NOT_TESTED",
      facialHairColorChangesAutomatically: "UNKNOWN_NOT_TESTED",
      selectorWrapping: "NOT_DEMONSTRATED",
      defaults: "NOT_DEMONSTRATED",
      dependencies: {
        changesByHead: "UNKNOWN_NOT_TESTED",
        changesByHairstyle: "UNKNOWN_NOT_TESTED",
        changesByPosition: "UNKNOWN_NOT_TESTED",
        changesByMode: "UNKNOWN_NOT_TESTED",
        changesByBodyType: "UNKNOWN_NOT_TESTED",
        changesByAccount: "UNKNOWN_NOT_TESTED",
        changesByUnlockState: "UNKNOWN_NOT_TESTED"
      }
    },
    researcherAppliedColorMetadata: {
      status: "NONE_RECORDED_NO_OPTION_EVIDENCE",
      separationRule: "Any future approximate color-family notes must be stored under researcherAppliedColorMetadata, separate from nativeGameLabel.",
      prohibitedReplacementRule: "Do not replace native labels or indices with guessed color names."
    },
    records
  };

  const qualityReport = buildQualityReport(catalog, generatedAt);
  const recaptureReport = buildRecaptureReport(catalog, generatedAt);
  return { catalog, qualityReport, recaptureReport };
}

export function writeHairColorResearchCatalog(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const { catalog, qualityReport, recaptureReport } = outputs;
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatHairColorCsv(catalog.records));
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
    check("native_values", "NO_RECORDS_CREATED", "No native hair-color labels or indices have been entered."),
    check("selected_canonical_hairstyle", "UNCONFIRMED", "No hair-color capture sequence proves the selected canonical hairstyle."),
    check("selected_canonical_head", "UNCONFIRMED", "No hair-color capture sequence proves the selected canonical head."),
    check("hair_texture_presentation_change", "UNKNOWN_NOT_TESTED", "No hair-color value changes were captured, so texture-presentation effects cannot be assessed."),
    check("eyebrow_auto_change", "UNKNOWN_NOT_TESTED", "No hair-color value changes were captured, so automatic eyebrow-color behavior cannot be assessed."),
    check("facial_hair_color_auto_change", "UNKNOWN_NOT_TESTED", "No hair-color value changes were captured, so automatic facial-hair-color behavior cannot be assessed."),
    check("selector_wrap", "NOT_DEMONSTRATED", "No hair-color selector boundary or wrap proof exists."),
    check("default", "NOT_DEMONSTRATED", "No hair-color default is visible in current evidence."),
    check("dependency_observations", "UNKNOWN_NOT_TESTED", "No head, hairstyle, mode, body, account, or unlock dependency tests exist for hair color."),
    check("required_views", "MISSING", `Missing all required views: ${requiredViews.join(", ")}.`)
  ];
  return {
    schemaVersion: "cf27-hair-color-quality-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_HAIR_COLOR_QUALITY_REPORT",
    sourceType: catalog.sourceType,
    productionStatus,
    verificationStatus,
    summary: {
      status: "BLOCKED_NO_HAIR_COLOR_CONTROL_EVIDENCE",
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
    schemaVersion: "cf27-hair-color-recapture-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_HAIR_COLOR_RECAPTURE_REPORT",
    sourceType: catalog.sourceType,
    productionStatus,
    verificationStatus,
    summary: {
      openRequests: 1,
      productionBlockers: 1,
      captureRequestIDs: ["GFM-CAP-007", "GFM-CAP-009"],
      status: "OPEN_RECAPTURE_REQUIRED"
    },
    requests: [
      {
        recaptureID: "HAIR-COLOR-RECAPTURE-001",
        priority: "P0",
        linkedCaptureRequestIDs: ["GFM-CAP-007", "GFM-CAP-009"],
        exactMenuPath: "Create Player > Player > Appearance > Hair, then the visible hair-color control only if directly shown",
        reason: "Current evidence proves only that Hair is visible as an Appearance submenu row. It does not show a hair-color control or selected hair-color values.",
        requiredCanonicalContext: [
          "Confirm the native hairstyle value used for color review.",
          "Confirm the native head value used for color review.",
          "Confirm skin setting and facial-hair state before changing hair colors.",
          "Keep lighting and framing stable across all selected color values."
        ],
        requiredEvidence: [
          "Hair submenu boundary map from GFM-CAP-007.",
          "Readable native hair-color label or index for every selected value.",
          "Two complete counts when selector boundaries make that possible.",
          "Representative frames for MENU, FRONT_REPRESENTATIVE_FRAME_PER_VALUE, and LEFT_3Q_IF_NEEDED_FOR_VISIBILITY.",
          "Boundary or wrap/no-wrap proof for first and final values.",
          "Observation of whether eyebrows or facial-hair color change automatically."
        ],
        acceptanceCriteria: [
          "Every entered hair-color record is backed by directly selected native game evidence.",
          "Native order is preserved without inferred skipped values.",
          "Researcher-applied color descriptions are stored separately and never replace native labels.",
          "Hair texture presentation, eyebrow behavior, facial-hair color behavior, defaults, wrapping, and dependencies are recorded only when demonstrated.",
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
    productionImpact: "BLOCKS_PRODUCTION_HAIR_COLOR_RECORDS",
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

function formatHairColorCsv(records) {
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
    "selectedCanonicalHairstyle",
    "selectedCanonicalHead",
    "hairTexturePresentationChange",
    "eyebrowsChangeAutomatically",
    "facialHairColorChangesAutomatically",
    "selectorWrapStatus",
    "defaultStatus",
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
  return `# Hair Color Research Catalog

Status: **${catalog.productionStatus}**  
Verification: **${catalog.verificationStatus}**

## Summary

- Research records: ${catalog.summary.recordCount}
- Production-eligible records: ${catalog.summary.productionEligibleRecords}
- Hair menu row observed: ${catalog.summary.hairMenuRowObserved ? "yes" : "no"}
- Hair-color control observed: ${catalog.summary.hairColorControlObserved ? "yes" : "no"}
- Complete selector counted twice: ${catalog.summary.completeSelectorDoubleCountAvailable ? "yes" : "no"}
- Native order status: ${catalog.summary.nativeOrderStatus}
- Count status: ${catalog.summary.countStatus}
- Default status: ${catalog.summary.defaultStatus}
- Selector wrap status: ${catalog.summary.selectorWrapStatus}

## Finding

Current evidence shows the **Hair** submenu row, but no current video opens the Hair submenu or directly selects hair-color values. No hair-color option records were created.

## Canonical Context

- Selected canonical hairstyle: ${catalog.canonicalContext.selectedCanonicalHairstyle}
- Selected canonical head: ${catalog.canonicalContext.selectedCanonicalHead}
- Selected canonical skin setting: ${catalog.canonicalContext.selectedCanonicalSkinSetting}
- Selected facial-hair state: ${catalog.canonicalContext.selectedFacialHairState}
- Framing consistency: ${catalog.canonicalContext.framingConsistency}

## Behavior Observations

- Hair texture presentation changes: ${catalog.observations.hairTexturePresentationChanges}
- Eyebrows change automatically: ${catalog.observations.eyebrowsChangeAutomatically}
- Facial-hair color changes automatically: ${catalog.observations.facialHairColorChangesAutomatically}
- Selector wrapping: ${catalog.observations.selectorWrapping}
- Defaults: ${catalog.observations.defaults}

## Evidence Coverage

Required option views: ${catalog.viewCoverage.requiredViews.join(", ")}

Extracted hair-color option views: none.

## Researcher-Applied Color Metadata Rule

No researcher-applied color metadata exists yet because no hair-color values have been directly captured. Future approximate color descriptions must remain separate from native game labels and must never replace native labels or indices.

## Production Eligibility

No hair-color record is production eligible. A verified production catalog still requires direct option evidence, QA, second-person verification, and catalog-manager approval.
`;
}

function formatQualityMarkdown(report) {
  return `# Hair Color Quality Report

Status: **${report.summary.status}**

${report.summary.blocker}

| Check | Status | Finding |
| --- | --- | --- |
${report.checks.map((row) => `| ${row.checkID} | ${row.status} | ${row.finding} |`).join("\n")}
`;
}

function formatRecaptureMarkdown(report) {
  const request = report.requests[0];
  return `# Hair Color Recapture Report

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
  const readme = `# Hair Color Evidence Folder

Status: NOT PRODUCTION DATA

This folder is reserved for derivative hair-color evidence generated from direct College Football 27 hair-color capture. It is intentionally empty because the current evidence does not open the Hair submenu or show any hair-color control values.

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
  const outputs = generateHairColorResearchCatalog();
  if (checkOnly) {
    if (outputs.catalog.records.length !== 0) {
      console.error("Hair-color research catalog unexpectedly produced records without selector evidence.");
      process.exit(1);
    }
    console.log("Hair-color research catalog check passed: zero production records, recapture required.");
  } else {
    writeHairColorResearchCatalog(outputs);
    console.log("Wrote hair-color research catalog, quality report, recapture report, and evidence folder placeholders.");
  }
}
