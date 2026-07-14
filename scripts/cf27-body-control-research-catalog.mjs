#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_BODY_CONTROL_RESEARCH_SCHEMA_VERSION = "cf27-body-control-research-catalog-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T04:15:00-04:00";
const productionStatus = "NOT_PRODUCTION_DATA";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";

const defaultEnvironmentPath = "data/phase-zero/environment_manifest.research.json";
const defaultCreationPathsPath = "data/phase-zero/creation_paths.research.json";
const defaultGapMatrixPath = "data/phase-zero/appearance_menu_gap_matrix.json";
const defaultIssuesPath = "data/phase-zero/issues_register.research.json";
const defaultOutputJsonPath = "data/phase-zero/body_controls.research.json";
const defaultOutputCsvPath = "data/phase-zero/body_controls.research.csv";
const defaultDocPath = "docs/phase-zero/BODY_CONTROL_RESEARCH_CATALOG.md";

const requestedControls = [
  {
    controlID: "cf27-body-control-height",
    requestedControlLabel: "Height",
    field: "height",
    productRole: "USER_DESIRED_BODY_ATTRIBUTE_NOT_MEASURED_FACIAL_CHARACTERISTIC"
  },
  {
    controlID: "cf27-body-control-weight",
    requestedControlLabel: "Weight",
    field: "weight",
    productRole: "USER_DESIRED_BODY_ATTRIBUTE_NOT_MEASURED_FACIAL_CHARACTERISTIC"
  },
  {
    controlID: "cf27-body-control-body-type",
    requestedControlLabel: "Body Type",
    field: "bodyType",
    productRole: "USER_DESIRED_BODY_ATTRIBUTE_NOT_MEASURED_FACIAL_CHARACTERISTIC"
  },
  {
    controlID: "cf27-body-control-build",
    requestedControlLabel: "Build",
    field: "build",
    productRole: "USER_DESIRED_BODY_ATTRIBUTE_NOT_MEASURED_FACIAL_CHARACTERISTIC"
  },
  {
    controlID: "cf27-body-control-physique",
    requestedControlLabel: "Physique",
    field: "physique",
    productRole: "USER_DESIRED_BODY_ATTRIBUTE_NOT_MEASURED_FACIAL_CHARACTERISTIC"
  },
  {
    controlID: "cf27-body-control-muscle-definition",
    requestedControlLabel: "Muscle Definition",
    field: "muscleDefinition",
    productRole: "USER_DESIRED_BODY_ATTRIBUTE_NOT_MEASURED_FACIAL_CHARACTERISTIC"
  },
  {
    controlID: "cf27-body-control-position",
    requestedControlLabel: "Position",
    field: "position",
    productRole: "CREATION_PATH_CONTEXT_POTENTIAL_RESTRICTION"
  },
  {
    controlID: "cf27-body-control-archetype",
    requestedControlLabel: "Archetype Restrictions",
    field: "archetype",
    productRole: "CREATION_PATH_CONTEXT_POTENTIAL_RESTRICTION"
  }
];

export function generateBodyControlResearchCatalog(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const environment = readJson(path.resolve(root, options.environmentPath ?? defaultEnvironmentPath));
  const creationPaths = readJson(path.resolve(root, options.creationPathsPath ?? defaultCreationPathsPath));
  const gapMatrix = readJson(path.resolve(root, options.gapMatrixPath ?? defaultGapMatrixPath));
  const issuesRegister = readJson(path.resolve(root, options.issuesPath ?? defaultIssuesPath));

  const records = buildObservedRecords(environment, generatedAt);
  const controls = requestedControls.map((control) => buildControl(control, environment, records, gapMatrix, issuesRegister));
  const dependencyAssessment = buildDependencyAssessment(records);

  return {
    schemaVersion: CF27_BODY_CONTROL_RESEARCH_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_BODY_CONTROL_RESEARCH_CATALOG",
    sourceType: "shippingGameVideoResearch",
    productionStatus,
    verificationStatus,
    productionRecommendationsEnabled: false,
    sourceEnvironmentManifest: options.environmentPath ?? defaultEnvironmentPath,
    sourceCreationPaths: options.creationPathsPath ?? defaultCreationPathsPath,
    sourceGapMatrix: options.gapMatrixPath ?? defaultGapMatrixPath,
    sourceIssuesRegister: options.issuesPath ?? defaultIssuesPath,
    directObservationPolicy: [
      "Create body-control records only from directly visible shipping-game evidence.",
      "Do not infer height, weight, body type, build, physique, muscle-definition, position, or archetype values from product requirements.",
      "Do not treat desired athlete physique as a measured facial characteristic.",
      "Dependency effects on heads, hair, facial hair, camera framing, and instructions remain unknown until tested directly."
    ],
    summary: {
      observedResearchRecordCount: records.length,
      productionEligibleRecords: 0,
      observedPositionContext: environment.position ?? null,
      observedJourneyTypeHighlight: environment.observedJourneyTypeHighlight ?? null,
      controlsWithDirectContextValues: controls.filter((control) => control.observationStatus === "DIRECT_CONTEXT_VALUE_OBSERVED_PENDING_VERIFICATION").map((control) => control.requestedControlLabel),
      controlsNotCaptured: controls.filter((control) => control.observationStatus !== "DIRECT_CONTEXT_VALUE_OBSERVED_PENDING_VERIFICATION").map((control) => control.requestedControlLabel),
      dependencyTestingStatus: "NOT_TESTED",
      blocker: "Current evidence supports QB and journey-type context only. It does not inspect height, weight, body type, build, physique, muscle definition, or dependency effects."
    },
    canonicalContext: {
      environmentID: environment.environmentID ?? null,
      creationPathID: creationPaths.creationPaths?.[0]?.id ?? null,
      gameMode: environment.gameMode ?? null,
      creationPathStatus: creationPaths.creationPaths?.[0]?.status ?? null,
      productionCatalogPathAssessment: creationPaths.creationPaths?.[0]?.assessment?.productionCatalogPathAssessment ?? "UNKNOWN",
      notes: [
        "The observed path is usable for research context only.",
        "Production body-control instructions require version, patch, dependency testing, second verification, and catalog-manager approval."
      ]
    },
    dependencyAssessment,
    controls,
    records
  };
}

export function writeBodyControlResearchCatalog(catalog, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.outputJsonPath ?? defaultOutputJsonPath, `${JSON.stringify(catalog, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultOutputCsvPath, formatBodyControlsCsv(catalog.controls));
  writeText(root, options.docPath ?? defaultDocPath, formatMarkdown(catalog));
}

function buildObservedRecords(environment, generatedAt) {
  const records = [];
  if (environment.position) {
    records.push({
      stableResearchID: stableID("POSITION", environment.position),
      recordKind: "POSITION_CONTEXT",
      nativeControlLabel: "Position",
      nativeDisplayLabel: environment.position,
      nativeOrder: null,
      dataClass: "RESEARCH_CANDIDATE",
      sourceType: "shippingGameVideoResearch",
      productionStatus,
      verificationStatus,
      productionEligibility: notProduction("Position context is observed but not independently verified and not dependency tested."),
      isMeasuredFacialCharacteristic: false,
      sourceEvidence: compactEvidence(environment.fieldEvidence?.position),
      effectAssessment: baseEffectAssessment("UNKNOWN_NOT_TESTED", "UNKNOWN_NOT_TESTED", "UNKNOWN_NOT_TESTED", "UNKNOWN_NOT_TESTED", "AFFECTS_CREATION_PATH_CONTEXT_ONLY"),
      notes: [
        "QB is observed as creation-path context.",
        "Current evidence does not prove whether position changes body controls, head options, rendering, hairstyles, facial hair, or camera framing."
      ],
      createdAt: generatedAt,
      updatedAt: generatedAt
    });
  }

  const journeyCards = Array.isArray(environment.fieldEvidence?.journeyTypeCardsVisible?.value)
    ? environment.fieldEvidence.journeyTypeCardsVisible.value
    : [];
  for (const label of journeyCards) {
    const highlighted = label === environment.observedJourneyTypeHighlight;
    records.push({
      stableResearchID: stableID("JOURNEYTYPE", label),
      recordKind: "ROAD_TO_GLORY_JOURNEY_TYPE_CONTEXT",
      nativeControlLabel: "Journey Type Cards",
      nativeDisplayLabel: label,
      nativeOrder: null,
      selectionStatus: highlighted ? "HIGHLIGHTED_PENDING_SECOND_VERIFICATION" : "VISIBLE_CONTEXT_LABEL_NOT_SELECTED_CONFIRMED",
      dataClass: "RESEARCH_CANDIDATE",
      sourceType: "shippingGameVideoResearch",
      productionStatus,
      verificationStatus,
      productionEligibility: notProduction("Journey type cards are creation-flow context, not verified appearance/body controls."),
      isMeasuredFacialCharacteristic: false,
      sourceEvidence: compactEvidence(highlighted ? environment.fieldEvidence?.observedJourneyTypeHighlight : environment.fieldEvidence?.journeyTypeCardsVisible),
      effectAssessment: baseEffectAssessment("UNKNOWN_NOT_TESTED", "UNKNOWN_NOT_TESTED", "UNKNOWN_NOT_TESTED", "UNKNOWN_NOT_TESTED", "AFFECTS_CREATION_PATH_CONTEXT_ONLY"),
      notes: [
        "Visible journey-type card labels are preserved as context only.",
        "Current evidence does not prove these are body archetype controls or that they affect appearance options."
      ],
      createdAt: generatedAt,
      updatedAt: generatedAt
    });
  }
  return records;
}

function buildControl(control, environment, records, gapMatrix, issuesRegister) {
  const matchingRecords = records.filter((record) => {
    if (control.field === "position") return record.recordKind === "POSITION_CONTEXT";
    if (control.field === "archetype") return record.recordKind === "ROAD_TO_GLORY_JOURNEY_TYPE_CONTEXT";
    return false;
  });
  const issueMatches = (issuesRegister.issues ?? []).filter((issue) => {
    const haystack = normalizeSearch(`${issue.issueID ?? ""} ${issue.title ?? ""}`);
    return haystack.includes(normalizeSearch(control.field)) || haystack.includes(normalizeSearch(control.requestedControlLabel));
  });
  const gap = (gapMatrix.rows ?? []).find((row) => row.gapID === "appearance-gap-suspected-body-height-weight-physique");
  const observed = matchingRecords.length > 0;
  return {
    controlID: control.controlID,
    requestedControlLabel: control.requestedControlLabel,
    nativeControlLabel: observed ? matchingRecords[0].nativeControlLabel : null,
    observationStatus: observed ? "DIRECT_CONTEXT_VALUE_OBSERVED_PENDING_VERIFICATION" : "NOT_OBSERVED_IN_CURRENT_EVIDENCE",
    productRole: control.productRole,
    isMeasuredFacialCharacteristic: false,
    records: matchingRecords.map((record) => record.stableResearchID),
    valuesOrRangeStatus: observed ? "DIRECT_CONTEXT_LABELS_ONLY_NOT_BODY_CONTROL_RANGE" : "NO_VALUES_OR_RANGE_CAPTURED",
    minimum: null,
    maximum: null,
    default: null,
    stepSize: null,
    countStatus: observed ? "COUNT_NOT_APPLICABLE_CONTEXT_ONLY" : "COUNT_UNKNOWN",
    dependencyStatus: "UNKNOWN_NOT_TESTED",
    resetBehavior: "UNKNOWN_NOT_TESTED",
    laterEditabilityStatus: "UNKNOWN_NOT_DEMONSTRATED_IN_CURRENT_EVIDENCE",
    recommendationInstructionImpact: control.field === "position"
      ? "MAY_AFFECT_CREATION_PATH_CONTEXT_ONLY_UNTIL_DEPENDENCY_TESTED"
      : "UNKNOWN_NOT_TESTED",
    unsuitableForRecommendation: true,
    suitabilityReason: observed
      ? "Observed context is not independently verified or dependency tested."
      : "No direct native control evidence is available.",
    relatedGapID: gap?.gapID ?? null,
    relatedIssueIDs: issueMatches.map((issue) => issue.issueID),
    missingEvidence: observed
      ? [
          "Second-person verification.",
          "Dependency tests for head, hair, facial hair, body, and camera effects.",
          "Production catalog path/version/patch approval."
        ]
      : [
          "Direct menu/control evidence.",
          "Readable native label or index.",
          "Minimum, maximum, default, step, count, and wrap evidence where applicable.",
          "Dependency and later-editability testing."
        ],
    sourceEvidence: matchingRecords.flatMap((record) => record.sourceEvidence ?? [])
  };
}

function buildDependencyAssessment(records) {
  return {
    changesAvailableHeadOptions: {
      status: "UNKNOWN_NOT_TESTED",
      reason: "No direct test changes position, journey type, height, weight, body type, build, or physique while inspecting head availability."
    },
    changesHeadRendering: {
      status: "UNKNOWN_NOT_TESTED",
      reason: "No direct test compares head rendering across body-control contexts."
    },
    changesHairstyleAvailability: {
      status: "UNKNOWN_NOT_TESTED",
      reason: "Hair controls were not opened in current body/position evidence."
    },
    changesFacialHairAvailability: {
      status: "UNKNOWN_NOT_TESTED",
      reason: "Facial-hair controls were not opened in current body/position evidence."
    },
    altersCameraFraming: {
      status: "UNKNOWN_NOT_TESTED",
      reason: "A preview rotation is visible, but no controlled body-value comparison is available."
    },
    affectsRecommendationInstructions: {
      status: records.some((record) => record.recordKind === "POSITION_CONTEXT") ? "AFFECTS_CREATION_PATH_CONTEXT_ONLY" : "UNKNOWN_NOT_TESTED",
      reason: "Future instructions may need to preserve observed Road to Glory position/path context. No facial-option dependency is proven."
    }
  };
}

function baseEffectAssessment(headOptions, headRendering, hairstyles, facialHair, instructions) {
  return {
    changesAvailableHeadOptions: headOptions,
    changesHeadRendering: headRendering,
    changesHairstyleAvailability: hairstyles,
    changesFacialHairAvailability: facialHair,
    altersCameraFraming: "UNKNOWN_NOT_TESTED",
    affectsRecommendationInstructions: instructions
  };
}

function compactEvidence(evidence) {
  if (!evidence) return [];
  return [{
    evidenceID: evidence.evidenceID ?? null,
    videoID: evidence.videoID ?? null,
    originalFilename: evidence.originalFilename ?? null,
    canonicalFilename: evidence.canonicalFilename ?? null,
    timelineRecordID: evidence.timelineRecordID ?? null,
    startTimestamp: evidence.startTimestamp ?? null,
    endTimestamp: evidence.endTimestamp ?? null,
    visibleMenuLabel: evidence.visibleMenuLabel ?? null,
    confidence: evidence.confidence ?? null,
    note: evidence.note ?? null
  }];
}

function notProduction(reason) {
  return { eligible: false, reason };
}

function stableID(kind, label) {
  return `CF27_XBOXUNKNOWN_RTG_${kind}_${String(label).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

function normalizeSearch(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function formatBodyControlsCsv(controls) {
  const columns = [
    "controlID",
    "requestedControlLabel",
    "nativeControlLabel",
    "observationStatus",
    "productRole",
    "recordCount",
    "valuesOrRangeStatus",
    "countStatus",
    "dependencyStatus",
    "recommendationInstructionImpact",
    "unsuitableForRecommendation",
    "relatedIssueIDs"
  ];
  const rows = controls.map((control) => ({
    ...control,
    recordCount: control.records.length,
    relatedIssueIDs: control.relatedIssueIDs.join(";")
  }));
  return toCsv(columns, rows);
}

function formatMarkdown(catalog) {
  const lines = [
    "# Body Control Research Catalog",
    "",
    "PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED",
    "",
    `Generated: ${catalog.generatedAt}`,
    "",
    "This document catalogs only directly observed body-control context from current College Football 27 evidence. It does not invent height, weight, body type, build, physique, muscle-definition, position, archetype, or dependency values.",
    "",
    "Desired athlete physique is treated as a user preference/body instruction concept, not a measured facial characteristic.",
    "",
    "## Summary",
    "",
    `- Observed research records: ${catalog.summary.observedResearchRecordCount}`,
    `- Observed position context: ${display(catalog.summary.observedPositionContext)}`,
    `- Observed journey-type highlight: ${display(catalog.summary.observedJourneyTypeHighlight)}`,
    `- Production-eligible records: ${catalog.summary.productionEligibleRecords}`,
    `- Dependency testing: ${catalog.summary.dependencyTestingStatus}`,
    `- Blocker: ${catalog.summary.blocker}`,
    "",
    "## Controls",
    "",
    "| Control | Status | Native label | Records | Recommendation suitability |",
    "| --- | --- | --- | ---: | --- |"
  ];
  for (const control of catalog.controls) {
    lines.push(`| ${control.requestedControlLabel} | ${control.observationStatus} | ${display(control.nativeControlLabel)} | ${control.records.length} | ${control.suitabilityReason} |`);
  }
  lines.push("");
  lines.push("## Observed Research Records");
  lines.push("");
  for (const record of catalog.records) {
    lines.push(`### ${record.stableResearchID}`);
    lines.push("");
    lines.push(`- Kind: ${record.recordKind}`);
    lines.push(`- Native control label: ${record.nativeControlLabel}`);
    lines.push(`- Native display label: ${record.nativeDisplayLabel}`);
    lines.push(`- Measured facial characteristic: ${record.isMeasuredFacialCharacteristic ? "yes" : "no"}`);
    lines.push(`- Production eligibility: ${record.productionEligibility.reason}`);
    lines.push("");
  }
  lines.push("## Dependency Assessment");
  lines.push("");
  for (const [key, value] of Object.entries(catalog.dependencyAssessment)) {
    lines.push(`- ${key}: ${value.status} - ${value.reason}`);
  }
  lines.push("");
  lines.push("No body-control record in this catalog may enable production recommendations until direct evidence, dependency testing, second verification, and production gates pass.");
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
  console.log("Usage: node scripts/cf27-body-control-research-catalog.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const catalog = generateBodyControlResearchCatalog(options);
    writeBodyControlResearchCatalog(catalog, options);
    console.log(`Body-control research catalog generated: ${catalog.records.length} records, ${catalog.controls.length} controls.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
