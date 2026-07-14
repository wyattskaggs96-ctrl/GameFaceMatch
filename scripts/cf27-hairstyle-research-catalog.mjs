#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_HAIRSTYLE_RESEARCH_SCHEMA_VERSION = "cf27-hairstyle-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T02:30:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "REQUESTED_NOT_CAPTURED";
const requiredViews = ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"];

const defaultMenuMapPath = "data/phase-zero/menu_map.research.json";
const defaultCaptureRequestsPath = "data/phase-zero/capture_requests.json";
const defaultOutputJsonPath = "data/phase-zero/hairstyles.research.json";
const defaultOutputCsvPath = "data/phase-zero/hairstyles.research.csv";
const defaultQualityJsonPath = "data/phase-zero/hairstyle_quality_report.research.json";
const defaultQualityCsvPath = "data/phase-zero/hairstyle_quality_report.research.csv";
const defaultRecaptureJsonPath = "data/phase-zero/hairstyle_recapture_report.research.json";
const defaultRecaptureCsvPath = "data/phase-zero/hairstyle_recapture_report.research.csv";
const defaultCatalogDocPath = "docs/phase-zero/HAIRSTYLE_RESEARCH_CATALOG.md";
const defaultQualityDocPath = "docs/phase-zero/HAIRSTYLE_QUALITY_REPORT.md";
const defaultRecaptureDocPath = "docs/phase-zero/HAIRSTYLE_RECAPTURE_REPORT.md";
const defaultEvidenceRoot = "data/phase-zero/hairstyle-evidence";

export function generateHairstyleResearchCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const menuMap = readJson(path.resolve(root, options.menuMapPath ?? defaultMenuMapPath));
  const captureRequests = readJson(path.resolve(root, options.captureRequestsPath ?? defaultCaptureRequestsPath));

  const hairMenuRecord = (menuMap.records ?? []).find((record) => record.stableMenuID === "cf27-menu-appearance-hair")
    ?? (menuMap.records ?? []).find((record) => record.displayLabel === "Hair");
  const hairstyleRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-008");
  const hairBoundaryRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-007");

  const hairMenuObserved = Boolean(hairMenuRecord);
  const selectorOpened = false;
  const records = [];

  const catalog = {
    schemaVersion: CF27_HAIRSTYLE_RESEARCH_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_HAIRSTYLE_RESEARCH_CATALOG",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceMenuMap: options.menuMapPath ?? defaultMenuMapPath,
    sourceCaptureRequests: options.captureRequestsPath ?? defaultCaptureRequestsPath,
    directObservationPolicy: [
      "Create hairstyle option records only from directly selected native game values.",
      "Do not infer hairstyles from a visible Hair submenu row.",
      "Do not assign cultural, ethnic, personality, gender-identity, or lifestyle labels.",
      "Researcher-applied visual metadata must remain separate from native game labels."
    ],
    summary: {
      recordCount: records.length,
      productionEligibleRecords: 0,
      hairMenuRowObserved: hairMenuObserved,
      hairstyleSelectorOpened: selectorOpened,
      hairstyleNativeValuesObserved: false,
      completeSelectorDoubleCountAvailable: false,
      nativeOrderStatus: "NOT_OBSERVED",
      countStatus: "COUNT_UNKNOWN",
      noneShavedOrShortestOptionStatus: "NOT_IDENTIFIED_NO_SELECTOR_EVIDENCE",
      evidenceExtractionStatus: "NO_HAIRSTYLE_OPTION_FRAMES_AVAILABLE",
      recaptureRequired: true,
      blocker: "Current evidence shows the Hair submenu row only. It does not open a hairstyle control or select hairstyle values."
    },
    canonicalContext: {
      canonicalHead: "UNCONFIRMED_NOT_CAPTURED",
      canonicalSkinSetting: "UNCONFIRMED_NOT_CAPTURED",
      facialHairState: "UNCONFIRMED_NOT_CAPTURED",
      hairColorUsed: "UNCONFIRMED_NOT_CAPTURED",
      framingConsistency: "NOT_ASSESSABLE_NO_HAIRSTYLE_SEQUENCE",
      menuOrder: "HAIR_ROW_VISIBLE_ONLY_HAIRSTYLE_ORDER_NOT_OBSERVED",
      notes: [
        "The existing head-template footage does not independently lock a canonical head for hairstyle capture.",
        "The current evidence does not prove a canonical skin setting, facial-hair state, or hair color for hairstyle comparison."
      ]
    },
    sourceEvidence: {
      hairMenuRow: hairMenuRecord ? compactHairMenuRecord(hairMenuRecord) : null,
      hairBoundaryCaptureRequest: hairBoundaryRequest ? compactCaptureRequest(hairBoundaryRequest) : null,
      hairstyleCaptureRequest: hairstyleRequest ? compactCaptureRequest(hairstyleRequest) : null,
      hairstyleOptionEvidence: []
    },
    viewCoverage: {
      requiredViews,
      extractedViews: [],
      missingViews: requiredViews,
      status: "NO_OPTION_VIEW_EVIDENCE_AVAILABLE"
    },
    dependencyAssessment: {
      changesByHead: "UNKNOWN_NOT_TESTED",
      changesByPosition: "UNKNOWN_NOT_TESTED",
      changesByMode: "UNKNOWN_NOT_TESTED",
      changesByBodyType: "UNKNOWN_NOT_TESTED",
      changesByAccount: "UNKNOWN_NOT_TESTED",
      changesByUnlockState: "UNKNOWN_NOT_TESTED",
      notes: [
        "Hair submenu dependencies cannot be assessed until GFM-CAP-007 maps visible Hair controls and GFM-CAP-008 captures a hairstyle selector if present."
      ]
    },
    researcherAppliedVisualMetadata: {
      status: "NONE_RECORDED_NO_OPTION_EVIDENCE",
      prohibitedLabels: [
        "cultural labels",
        "ethnic labels",
        "personality labels",
        "gender-identity labels",
        "lifestyle labels",
        "real-person resemblance labels"
      ],
      separationRule: "Any future visual tags must be stored under researcherAppliedVisualMetadata, separate from nativeGameLabel."
    },
    records
  };

  const qualityReport = buildQualityReport(catalog, generatedAt);
  const recaptureReport = buildRecaptureReport(catalog, generatedAt);
  return { catalog, qualityReport, recaptureReport };
}

export function writeHairstyleResearchCatalog(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const { catalog, qualityReport, recaptureReport } = outputs;
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatHairstyleCsv(catalog.records));
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
  const status = "BLOCKED_NO_HAIRSTYLE_SELECTOR_EVIDENCE";
  const checks = [
    check("canonical_head", "UNCONFIRMED", "No hairstyle capture sequence proves the canonical head used for hair comparison."),
    check("canonical_skin_setting", "UNCONFIRMED", "No hairstyle capture sequence proves the skin setting."),
    check("facial_hair_absent", "UNCONFIRMED", "No hairstyle capture sequence proves facial hair was set to None or absent."),
    check("hair_color", "UNCONFIRMED", "No hairstyle capture sequence proves the hair color used."),
    check("framing_consistency", "NOT_ASSESSABLE", "No hairstyle option sequence exists for framing comparison."),
    check("menu_order", "NOT_OBSERVED", "The hairstyle selector has not been opened or traversed."),
    check("double_count", "NOT_AVAILABLE", "No complete hairstyle selector count is available."),
    check("required_views", "MISSING", `Missing all required views: ${requiredViews.join(", ")}.`),
    check("loading_animation", "NOT_ASSESSABLE", "No hairstyle frames were extracted."),
    check("clipping", "NOT_ASSESSABLE", "No hairstyle frames were extracted."),
    check("native_label_integrity", "NO_RECORDS_CREATED", "No native hairstyle labels or indices have been entered.")
  ];
  return {
    schemaVersion: "cf27-hairstyle-quality-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_HAIRSTYLE_QUALITY_REPORT",
    sourceType: catalog.sourceType,
    productionStatus,
    verificationStatus,
    summary: {
      status,
      optionsAssessed: 0,
      optionsAcceptedForResearch: 0,
      optionsRejected: 0,
      optionsRequiringRecapture: 0,
      sequenceLevelRecaptureRequired: true,
      blocker: catalog.summary.blocker
    },
    checks
  };
}

function buildRecaptureReport(catalog, generatedAt) {
  return {
    schemaVersion: "cf27-hairstyle-recapture-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_HAIRSTYLE_RECAPTURE_REPORT",
    sourceType: catalog.sourceType,
    productionStatus,
    verificationStatus,
    summary: {
      openRequests: 1,
      productionBlockers: 1,
      captureRequestIDs: ["GFM-CAP-007", "GFM-CAP-008"],
      status: "OPEN_RECAPTURE_REQUIRED"
    },
    requests: [
      {
        recaptureID: "HAIRSTYLE-RECAPTURE-001",
        priority: "P0",
        linkedCaptureRequestIDs: ["GFM-CAP-007", "GFM-CAP-008"],
        exactMenuPath: "Create Player > Player > Appearance > Hair, then the visible hairstyle control only if directly shown",
        reason: "The current evidence proves the Hair submenu row exists but does not open Hair or show any hairstyle selector values.",
        requiredCanonicalContext: [
          "Confirm native head value used for hairstyle capture.",
          "Confirm native skin setting.",
          "Confirm facial hair is None/absent if the game offers that control.",
          "Confirm hair color used for the hairstyle pass.",
          "Keep position, mode, body type, account state, and unlock state unchanged or document visible constraints."
        ],
        requiredEvidence: [
          "Hair submenu boundary map from GFM-CAP-007.",
          "Readable native hairstyle label or index for every selected value.",
          "Two complete counts when selector boundaries make that possible.",
          "Required views for each option: MENU, FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q.",
          "Boundary or wrap/no-wrap proof for first and final values."
        ],
        acceptanceCriteria: [
          "Every entered hairstyle record is backed by directly selected native game evidence.",
          "Native order is preserved without inferred skipped values.",
          "None, shaved, or shortest option is identified only if visibly selected.",
          "Clipping, loading, animation, obstruction, and framing issues are recorded per option.",
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
    productionImpact: "BLOCKS_PRODUCTION_HAIRSTYLE_RECORDS",
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

function formatHairstyleCsv(records) {
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
    "leftProfileEvidencePath",
    "rearEvidencePath",
    "rightProfileEvidencePath",
    "rightThreeQuarterEvidencePath",
    "canonicalHead",
    "canonicalSkinSetting",
    "facialHairState",
    "hairColorUsed",
    "researcherAppliedVisualMetadata",
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
  return `# Hairstyle Research Catalog

Status: **${catalog.productionStatus}**  
Verification: **${catalog.verificationStatus}**

## Summary

- Research records: ${catalog.summary.recordCount}
- Production-eligible records: ${catalog.summary.productionEligibleRecords}
- Hair menu row observed: ${catalog.summary.hairMenuRowObserved ? "yes" : "no"}
- Hairstyle selector opened: ${catalog.summary.hairstyleSelectorOpened ? "yes" : "no"}
- Complete selector counted twice: ${catalog.summary.completeSelectorDoubleCountAvailable ? "yes" : "no"}
- Native order status: ${catalog.summary.nativeOrderStatus}
- Count status: ${catalog.summary.countStatus}

## Finding

Current evidence shows the **Hair** submenu row, but no current video opens the Hair submenu or directly selects hairstyle values. No hairstyle option records were created.

## Canonical Context

- Canonical head: ${catalog.canonicalContext.canonicalHead}
- Canonical skin setting: ${catalog.canonicalContext.canonicalSkinSetting}
- Facial hair state: ${catalog.canonicalContext.facialHairState}
- Hair color used: ${catalog.canonicalContext.hairColorUsed}
- Framing consistency: ${catalog.canonicalContext.framingConsistency}

## Evidence Coverage

Required option views: ${catalog.viewCoverage.requiredViews.join(", ")}

Extracted hairstyle option views: none.

## Researcher-Applied Metadata Rule

No researcher-applied visual metadata exists yet because no hairstyle values have been directly captured. Future metadata must remain separate from native game labels and must not use cultural, ethnic, personality, gender-identity, or lifestyle labels.

## Production Eligibility

No hairstyle record is production eligible. A verified production catalog still requires direct option evidence, QA, second-person verification, and catalog-manager approval.
`;
}

function formatQualityMarkdown(report) {
  return `# Hairstyle Quality Report

Status: **${report.summary.status}**

${report.summary.blocker}

| Check | Status | Finding |
| --- | --- | --- |
${report.checks.map((row) => `| ${row.checkID} | ${row.status} | ${row.finding} |`).join("\n")}
`;
}

function formatRecaptureMarkdown(report) {
  const request = report.requests[0];
  return `# Hairstyle Recapture Report

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
  const readme = `# Hairstyle Evidence Folder

Status: NOT PRODUCTION DATA

This folder is reserved for derivative hairstyle evidence generated from direct College Football 27 hairstyle capture. It is intentionally empty because the current evidence does not open the Hair submenu or show any hairstyle selector values.

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
  const outputs = generateHairstyleResearchCatalog();
  if (checkOnly) {
    if (outputs.catalog.records.length !== 0) {
      console.error("Hairstyle research catalog unexpectedly produced records without selector evidence.");
      process.exit(1);
    }
    console.log("Hairstyle research catalog check passed: zero production records, recapture required.");
  } else {
    writeHairstyleResearchCatalog(outputs);
    console.log("Wrote hairstyle research catalog, quality report, recapture report, and evidence folder placeholders.");
  }
}
