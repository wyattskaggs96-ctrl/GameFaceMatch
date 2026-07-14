#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_FACIAL_HAIR_RESEARCH_SCHEMA_VERSION = "cf27-facial-hair-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T03:45:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "REQUESTED_NOT_CAPTURED";
const requiredViews = ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE"];
const coverageFields = [
  "beardCoverage",
  "mustachePresence",
  "chinCoverage",
  "cheekCoverage",
  "jawCoverage",
  "neckCoverage",
  "sideburnPresence"
];

const defaultMenuMapPath = "data/phase-zero/menu_map.research.json";
const defaultCaptureRequestsPath = "data/phase-zero/capture_requests.json";
const defaultOutputJsonPath = "data/phase-zero/facial_hair.research.json";
const defaultOutputCsvPath = "data/phase-zero/facial_hair.research.csv";
const defaultQualityJsonPath = "data/phase-zero/facial_hair_quality_report.research.json";
const defaultQualityCsvPath = "data/phase-zero/facial_hair_quality_report.research.csv";
const defaultRecaptureJsonPath = "data/phase-zero/facial_hair_recapture_report.research.json";
const defaultRecaptureCsvPath = "data/phase-zero/facial_hair_recapture_report.research.csv";
const defaultCatalogDocPath = "docs/phase-zero/FACIAL_HAIR_RESEARCH_CATALOG.md";
const defaultQualityDocPath = "docs/phase-zero/FACIAL_HAIR_QUALITY_REPORT.md";
const defaultRecaptureDocPath = "docs/phase-zero/FACIAL_HAIR_RECAPTURE_REPORT.md";
const defaultEvidenceRoot = "data/phase-zero/facial-hair-evidence";

export function generateFacialHairResearchCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const menuMap = readJson(path.resolve(root, options.menuMapPath ?? defaultMenuMapPath));
  const captureRequests = readJson(path.resolve(root, options.captureRequestsPath ?? defaultCaptureRequestsPath));

  const hairMenuRecord = (menuMap.records ?? []).find((record) => record.stableMenuID === "cf27-menu-appearance-hair")
    ?? (menuMap.records ?? []).find((record) => record.displayLabel === "Hair");
  const hairBoundaryRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-007");
  const facialHairRequest = (captureRequests.requests ?? []).find((request) => request.captureID === "GFM-CAP-010");

  const records = [];
  const catalog = {
    schemaVersion: CF27_FACIAL_HAIR_RESEARCH_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_FACIAL_HAIR_RESEARCH_CATALOG",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceMenuMap: options.menuMapPath ?? defaultMenuMapPath,
    sourceCaptureRequests: options.captureRequestsPath ?? defaultCaptureRequestsPath,
    directObservationPolicy: [
      "Create facial-hair option records only from directly selected native game values.",
      "Include None only when a None option is directly visible and selected.",
      "Do not infer facial-hair options from visible hair, beard-like preview states, head templates, or expected game controls.",
      "Keep researcher-applied coverage metadata separate from native game labels and indices.",
      "Do not use cultural, lifestyle, personality, race, ethnicity, attractiveness, identity, or real-person resemblance labels."
    ],
    summary: {
      recordCount: records.length,
      productionEligibleRecords: 0,
      hairMenuRowObserved: Boolean(hairMenuRecord),
      facialHairControlObserved: false,
      facialHairNativeValuesObserved: false,
      noneOptionObserved: false,
      totalObservedCount: 0,
      countStatus: "COUNT_UNKNOWN",
      nativeOrderStatus: "NOT_OBSERVED",
      completeSelectorDoubleCountAvailable: false,
      selectorWrapStatus: "NOT_OBSERVED",
      defaultStatus: "DEFAULT_NOT_DEMONSTRATED",
      evidenceExtractionStatus: "NO_FACIAL_HAIR_OPTION_FRAMES_AVAILABLE",
      recaptureRequired: true,
      blocker: "Current evidence shows the Hair submenu row only. It does not open Hair or show any facial-hair control, None option, facial-hair color, or selected facial-hair values."
    },
    canonicalContext: {
      canonicalHead: "UNCONFIRMED_NOT_CAPTURED",
      canonicalHairstyle: "UNCONFIRMED_NOT_CAPTURED",
      canonicalSkinSetting: "UNCONFIRMED_NOT_CAPTURED",
      canonicalFacialHairColor: "UNCONFIRMED_NOT_CAPTURED",
      framingConsistency: "NOT_ASSESSABLE_NO_FACIAL_HAIR_SEQUENCE",
      notes: [
        "No current footage confirms the head used for a facial-hair pass.",
        "No current footage confirms the hairstyle used for a facial-hair pass.",
        "No current footage confirms the skin setting or facial-hair color used for a facial-hair pass.",
        "No current footage opens the Hair submenu or proves whether a facial-hair control exists."
      ]
    },
    sourceEvidence: {
      hairMenuRow: hairMenuRecord ? compactHairMenuRecord(hairMenuRecord) : null,
      hairBoundaryCaptureRequest: hairBoundaryRequest ? compactCaptureRequest(hairBoundaryRequest) : null,
      facialHairCaptureRequest: facialHairRequest ? compactCaptureRequest(facialHairRequest) : null,
      facialHairOptionEvidence: []
    },
    viewCoverage: {
      requiredViews,
      extractedViews: [],
      missingViews: requiredViews,
      status: "NO_OPTION_VIEW_EVIDENCE_AVAILABLE"
    },
    coverageMetadataPolicy: {
      status: "NONE_RECORDED_NO_OPTION_EVIDENCE",
      fields: coverageFields,
      separationRule: "Coverage metadata is researcher-applied review data and must remain separate from nativeGameLabel and nativeIndex.",
      prohibitedLabels: [
        "cultural labels",
        "lifestyle labels",
        "personality labels",
        "race labels",
        "ethnicity labels",
        "identity labels",
        "real-person resemblance labels"
      ]
    },
    dependencyAssessment: {
      changesByHead: "UNKNOWN_NOT_TESTED",
      changesByHairstyle: "UNKNOWN_NOT_TESTED",
      changesBySkinSetting: "UNKNOWN_NOT_TESTED",
      changesByFacialHairColor: "UNKNOWN_NOT_TESTED",
      changesByPosition: "UNKNOWN_NOT_TESTED",
      changesByMode: "UNKNOWN_NOT_TESTED",
      changesByBodyType: "UNKNOWN_NOT_TESTED",
      changesByAccount: "UNKNOWN_NOT_TESTED",
      changesByUnlockState: "UNKNOWN_NOT_TESTED",
      notes: [
        "Facial-hair dependencies cannot be assessed until GFM-CAP-007 maps visible Hair controls and GFM-CAP-010 captures facial-hair controls if present."
      ]
    },
    records
  };

  const qualityReport = buildQualityReport(catalog, generatedAt);
  const recaptureReport = buildRecaptureReport(catalog, generatedAt);
  return { catalog, qualityReport, recaptureReport };
}

export function writeFacialHairResearchCatalog(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const { catalog, qualityReport, recaptureReport } = outputs;
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatFacialHairCsv(catalog.records));
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
    check("native_values", "NO_RECORDS_CREATED", "No native facial-hair labels or indices have been entered."),
    check("none_option", "NOT_OBSERVED", "None cannot be cataloged until directly visible and selected."),
    check("total_observed_count", "COUNT_UNKNOWN", "No facial-hair selector has been counted."),
    check("selected_canonical_head", "UNCONFIRMED", "No facial-hair capture sequence proves the selected canonical head."),
    check("selected_canonical_hairstyle", "UNCONFIRMED", "No facial-hair capture sequence proves the selected canonical hairstyle."),
    check("selected_canonical_skin_setting", "UNCONFIRMED", "No facial-hair capture sequence proves the selected skin setting."),
    check("selected_canonical_facial_hair_color", "UNCONFIRMED", "No facial-hair capture sequence proves the selected facial-hair color."),
    check("full_screen_menu_evidence", "MISSING", "No full-screen facial-hair menu evidence exists."),
    check("front_evidence", "MISSING", "No front facial-hair evidence exists."),
    check("three_quarter_evidence", "MISSING", "No left or right three-quarter facial-hair evidence exists."),
    check("profile_evidence", "MISSING", "No left or right profile facial-hair evidence exists."),
    check("coverage_metadata", "NOT_ASSESSABLE", `No option evidence exists for ${coverageFields.join(", ")}.`),
    check("selector_wrap", "NOT_DEMONSTRATED", "No facial-hair selector boundary or wrap proof exists."),
    check("default", "NOT_DEMONSTRATED", "No facial-hair default is visible in current evidence."),
    check("dependency_observations", "UNKNOWN_NOT_TESTED", "No head, hairstyle, skin, mode, body, account, or unlock dependency tests exist for facial hair.")
  ];
  return {
    schemaVersion: "cf27-facial-hair-quality-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_FACIAL_HAIR_QUALITY_REPORT",
    sourceType: catalog.sourceType,
    productionStatus,
    verificationStatus,
    summary: {
      status: "BLOCKED_NO_FACIAL_HAIR_CONTROL_EVIDENCE",
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
    schemaVersion: "cf27-facial-hair-recapture-report-v1",
    generatedAt,
    project: catalog.project,
    game: catalog.game,
    dataClass: "PHASE_ZERO_FACIAL_HAIR_RECAPTURE_REPORT",
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
        recaptureID: "FACIAL-HAIR-RECAPTURE-001",
        priority: "P0",
        linkedCaptureRequestIDs: ["GFM-CAP-007", "GFM-CAP-010"],
        exactMenuPath: "Create Player > Player > Appearance > Hair, then the visible facial-hair control only if directly shown",
        reason: "Current evidence proves only that Hair is visible as an Appearance submenu row. It does not show a facial-hair control, None option, facial-hair color, or selected facial-hair values.",
        requiredCanonicalContext: [
          "Confirm the native head value used for facial-hair review.",
          "Confirm the native hairstyle value used for facial-hair review.",
          "Confirm the native skin setting.",
          "Confirm the facial-hair color used for the option pass if the game exposes such a control.",
          "Keep lighting, zoom, and framing stable across all selected facial-hair values."
        ],
        requiredEvidence: [
          "Hair submenu boundary map from GFM-CAP-007.",
          "Readable native facial-hair label or index for every selected value.",
          "None option evidence only if None is directly visible and selected.",
          "Two complete counts when selector boundaries make that possible.",
          "Required views for each option: MENU, FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE.",
          "Full-screen menu evidence for every entered option.",
          "Boundary or wrap/no-wrap proof for first and final values.",
          "Researcher-applied coverage metadata for beard, mustache, chin, cheek, jaw, neck, and sideburn coverage."
        ],
        acceptanceCriteria: [
          "Every entered facial-hair record is backed by directly selected native game evidence.",
          "Native order is preserved without inferred skipped values.",
          "Coverage metadata remains separate from native labels and does not use prohibited cultural, lifestyle, personality, race, or ethnicity labels.",
          "Evidence quality, source timestamp, and recapture status are recorded for each option.",
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
    productionImpact: "BLOCKS_PRODUCTION_FACIAL_HAIR_RECORDS",
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

function formatFacialHairCsv(records) {
  const headers = [
    "stableResearchID",
    "nativeOrder",
    "nativeGameLabel",
    "nativeIndex",
    "totalObservedCount",
    "sourceVideoID",
    "sourceTimestamp",
    "fullScreenMenuEvidencePath",
    "frontEvidencePath",
    "leftThreeQuarterEvidencePath",
    "rightThreeQuarterEvidencePath",
    "leftProfileEvidencePath",
    "rightProfileEvidencePath",
    "canonicalHead",
    "canonicalHairstyle",
    "canonicalSkinSetting",
    "canonicalFacialHairColor",
    "beardCoverage",
    "mustachePresence",
    "chinCoverage",
    "cheekCoverage",
    "jawCoverage",
    "neckCoverage",
    "sideburnPresence",
    "evidenceQuality",
    "recaptureStatus",
    "researcherAppliedCoverageMetadata",
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
  return `# Facial Hair Research Catalog

Status: **${catalog.productionStatus}**  
Verification: **${catalog.verificationStatus}**

## Summary

- Research records: ${catalog.summary.recordCount}
- Production-eligible records: ${catalog.summary.productionEligibleRecords}
- Hair menu row observed: ${catalog.summary.hairMenuRowObserved ? "yes" : "no"}
- Facial-hair control observed: ${catalog.summary.facialHairControlObserved ? "yes" : "no"}
- None option observed: ${catalog.summary.noneOptionObserved ? "yes" : "no"}
- Total observed count: ${catalog.summary.totalObservedCount}
- Complete selector counted twice: ${catalog.summary.completeSelectorDoubleCountAvailable ? "yes" : "no"}
- Native order status: ${catalog.summary.nativeOrderStatus}
- Count status: ${catalog.summary.countStatus}
- Default status: ${catalog.summary.defaultStatus}
- Selector wrap status: ${catalog.summary.selectorWrapStatus}

## Finding

Current evidence shows the **Hair** submenu row, but no current video opens the Hair submenu or directly selects facial-hair values. No facial-hair option records were created, including None.

## Canonical Context

- Canonical head: ${catalog.canonicalContext.canonicalHead}
- Canonical hairstyle: ${catalog.canonicalContext.canonicalHairstyle}
- Canonical skin setting: ${catalog.canonicalContext.canonicalSkinSetting}
- Canonical facial-hair color: ${catalog.canonicalContext.canonicalFacialHairColor}
- Framing consistency: ${catalog.canonicalContext.framingConsistency}

## Evidence Coverage

Required option views: ${catalog.viewCoverage.requiredViews.join(", ")}

Extracted facial-hair option views: none.

## Researcher-Applied Coverage Metadata Rule

No researcher-applied coverage metadata exists yet because no facial-hair values have been directly captured. Future metadata for beard, mustache, chin, cheek, jaw, neck, and sideburn coverage must remain separate from native game labels and indices.

Prohibited label classes: ${catalog.coverageMetadataPolicy.prohibitedLabels.join(", ")}.

## Production Eligibility

No facial-hair record is production eligible. A verified production catalog still requires direct option evidence, QA, second-person verification, and catalog-manager approval.
`;
}

function formatQualityMarkdown(report) {
  return `# Facial Hair Quality Report

Status: **${report.summary.status}**

${report.summary.blocker}

| Check | Status | Finding |
| --- | --- | --- |
${report.checks.map((row) => `| ${row.checkID} | ${row.status} | ${row.finding} |`).join("\n")}
`;
}

function formatRecaptureMarkdown(report) {
  const request = report.requests[0];
  return `# Facial Hair Recapture Report

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
  const readme = `# Facial Hair Evidence Folder

Status: NOT PRODUCTION DATA

This folder is reserved for derivative facial-hair evidence generated from direct College Football 27 facial-hair capture. It is intentionally empty because the current evidence does not open the Hair submenu or show any facial-hair control values.

Required future views:

${requiredViews.map((view) => `- ${view}`).join("\n")}

Coverage metadata to review later:

${coverageFields.map((field) => `- ${field}`).join("\n")}

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
  const outputs = generateFacialHairResearchCatalog();
  if (checkOnly) {
    if (outputs.catalog.records.length !== 0) {
      console.error("Facial-hair research catalog unexpectedly produced records without selector evidence.");
      process.exit(1);
    }
    console.log("Facial-hair research catalog check passed: zero production records, recapture required.");
  } else {
    writeFacialHairResearchCatalog(outputs);
    console.log("Wrote facial-hair research catalog, quality report, recapture report, and evidence folder placeholders.");
  }
}
