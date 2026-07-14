#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_DEPENDENCY_EVIDENCE_TESTS_SCHEMA_VERSION = "cf27-dependency-evidence-tests-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T07:00:00-04:00";

const dependencyVariables = [
  "position",
  "archetype",
  "height",
  "weight",
  "bodyType",
  "head",
  "skinTone",
  "hairstyle",
  "facialHair",
  "onlineState",
  "eaAccountState",
  "edition",
  "entitlements",
  "baseType",
  "platform",
  "patch"
];

const defaultPaths = {
  environment: "data/phase-zero/environment_manifest.research.json",
  creationPaths: "data/phase-zero/creation_paths.research.json",
  heads: "data/phase-zero/heads.research.json",
  additionalAttributes: "data/phase-zero/additional_attributes.research.json",
  bodyControls: "data/phase-zero/body_controls.research.json",
  captureRequests: "data/phase-zero/capture_requests.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  outputJson: "data/phase-zero/dependency_tests.research.json",
  outputCsv: "data/phase-zero/dependency_tests.research.csv",
  outputMarkdown: "docs/phase-zero/DEPENDENCY_TEST_EXECUTION.md"
};

export function generateDependencyEvidenceReport(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const environment = readJson(path.resolve(root, options.environmentPath ?? defaultPaths.environment));
  const creationPaths = readJson(path.resolve(root, options.creationPathsPath ?? defaultPaths.creationPaths));
  const heads = readJson(path.resolve(root, options.headsPath ?? defaultPaths.heads));
  const additionalAttributes = readJson(path.resolve(root, options.additionalAttributesPath ?? defaultPaths.additionalAttributes));
  const bodyControls = readJson(path.resolve(root, options.bodyControlsPath ?? defaultPaths.bodyControls));
  const captureRequests = readJson(path.resolve(root, options.captureRequestsPath ?? defaultPaths.captureRequests));
  const evidenceManifest = readJson(path.resolve(root, options.evidenceManifestPath ?? defaultPaths.evidenceManifest));

  const baseline = createBaseline(environment, creationPaths);
  const context = { environment, creationPaths, heads, additionalAttributes, bodyControls, captureRequests, evidenceManifest, baseline };
  const tests = dependencyVariables.map((variable, index) => dependencyTestFor(variable, index + 1, context));
  const executed = tests.filter((test) => test.executionStatus === "EXECUTED_RESEARCH_OBSERVATION");
  const blocked = tests.filter((test) => test.executionStatus !== "EXECUTED_RESEARCH_OBSERVATION");

  return {
    schemaVersion: CF27_DEPENDENCY_EVIDENCE_TESTS_SCHEMA_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_DEPENDENCY_TEST_EXECUTION",
    sourceType: "shippingGameVideoResearch",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "OBSERVED_PENDING_VERIFICATION",
    productionRecommendationsEnabled: false,
    productionCompletionAllowed: false,
    sourceArtifacts: {
      environment: options.environmentPath ?? defaultPaths.environment,
      creationPaths: options.creationPathsPath ?? defaultPaths.creationPaths,
      heads: options.headsPath ?? defaultPaths.heads,
      additionalAttributes: options.additionalAttributesPath ?? defaultPaths.additionalAttributes,
      bodyControls: options.bodyControlsPath ?? defaultPaths.bodyControls,
      captureRequests: options.captureRequestsPath ?? defaultPaths.captureRequests,
      evidenceManifest: options.evidenceManifestPath ?? defaultPaths.evidenceManifest
    },
    rules: [
      "Only direct controlled evidence can create an executed dependency test.",
      "Observed menu traversal is not treated as a complete dependency test unless the changed variable is the selected control itself.",
      "Unexecuted tests are recorded as blocked or not executed, never passed.",
      "No dependency test in this report is independently verified or production eligible."
    ],
    baseline,
    summary: {
      variableCount: tests.length,
      executedVariableCount: executed.length,
      blockedOrNotExecutedVariableCount: blocked.length,
      independentlyVerifiedRunCount: 0,
      productionEligibleRunCount: 0,
      variablesWithExecutedEvidence: executed.map((test) => test.variable),
      variablesStillRequired: blocked.map((test) => test.variable)
    },
    tests
  };
}

export function writeDependencyEvidenceReport(report, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.outputJsonPath ?? defaultPaths.outputJson, `${JSON.stringify(report, null, 2)}\n`);
  writeText(root, options.outputCsvPath ?? defaultPaths.outputCsv, formatCsv(report.tests));
  writeText(root, options.outputMarkdownPath ?? defaultPaths.outputMarkdown, formatMarkdown(report));
}

function dependencyTestFor(variable, runNumber, context) {
  if (variable === "head") return headDependencyTest(runNumber, context);
  if (variable === "skinTone") return skinToneDependencyTest(runNumber, context);
  return blockedDependencyTest(variable, runNumber, context);
}

function headDependencyTest(runNumber, context) {
  const records = [...(context.heads.records ?? [])].sort((first, second) => numeric(first.nativeOrder) - numeric(second.nativeOrder));
  const first = records[0];
  const last = records.at(-1);
  const evidence = evidenceFromRecords([first, last], context.evidenceManifest);
  return {
    testID: "dep-test-head-selected-head-change",
    runNumber,
    variable: "head",
    executionStatus: evidence.length > 0 ? "EXECUTED_RESEARCH_OBSERVATION" : "BLOCKED_BY_MISSING_EVIDENCE",
    result: "INCONCLUSIVE_RESEARCH_ONLY",
    baseline: context.baseline,
    changedVariable: {
      variable: "head",
      fromValue: labelForRecord(first),
      toValue: labelForRecord(last)
    },
    expectedTest: "Change selected Head Template values while holding all other variables constant enough to detect whether counts, ordering, labels, geometry, or other categories change.",
    observedBehavior: "Head Template selected values were changed across the current head-template footage. Native selected labels/order are directly observed for the recorded head values, but canonical settings were not locked and other category dependencies were not directly tested.",
    observedChanges: {
      countsChanged: "UNKNOWN_NOT_TESTED",
      orderChanged: context.heads.summary?.skippedNumbersWithinObservedRange?.length ? "ORDER_INCOMPLETE_WITH_VISIBLE_GAPS" : "NO_ORDER_GAPS_WITHIN_OBSERVED_RECORDS",
      geometryChanged: "SELECTED_HEAD_VISUAL_PRESENTATION_CHANGED_BUT_PRODUCTION_GEOMETRY_NOT_VALIDATED",
      labelsChanged: "SELECTED_NATIVE_HEAD_LABEL_CHANGED"
    },
    evidence,
    uncertainty: [
      "Hair, facial hair, skin tone, and other category resets are not directly tested by this footage.",
      "Selector total, final boundary, wrap behavior, and two complete counts remain unproven.",
      "Visual comparison suitability is limited by non-canonical conditions."
    ],
    requiredFollowUp: [
      "Run GFM-CAP-002 for complete Head Template count/order boundary proof.",
      "Run GFM-CAP-003 and GFM-CAP-004 for canonical appearance lock and standardized head visual evidence.",
      "Test whether changing head resets skin, hair, facial hair, and other controls under locked conditions."
    ],
    productionEligible: false,
    verificationStatus: "OBSERVED_PENDING_VERIFICATION"
  };
}

function skinToneDependencyTest(runNumber, context) {
  const records = (context.additionalAttributes.records ?? [])
    .filter((record) => record.category === "Skin Tone")
    .sort((first, second) => numeric(first.nativeOrder) - numeric(second.nativeOrder));
  const first = records[0];
  const last = records.at(-1);
  const category = (context.additionalAttributes.categories ?? []).find((candidate) => candidate.category === "Skin Tone") ?? {};
  const evidence = evidenceFromRecords([first, last], context.evidenceManifest);
  return {
    testID: "dep-test-skin-tone-selected-value-change",
    runNumber,
    variable: "skinTone",
    executionStatus: evidence.length > 0 ? "EXECUTED_RESEARCH_OBSERVATION" : "BLOCKED_BY_MISSING_EVIDENCE",
    result: "INCONCLUSIVE_RESEARCH_ONLY",
    baseline: context.baseline,
    changedVariable: {
      variable: "skinTone",
      fromValue: labelForRecord(first),
      toValue: labelForRecord(last)
    },
    expectedTest: "Change Skin Tone selected values while holding the player draft constant and observe whether counts, order, labels, geometry, or dependent appearance settings change.",
    observedBehavior: "Skin Tone selected values were changed in current footage and native selected labels are directly observed for recorded values. The selector run is partial and does not prove total count, final boundary, wrapping, or automatic dependency effects.",
    observedChanges: {
      countsChanged: category.missingObservedRangeValues?.length ? "UNKNOWN_PARTIAL_RANGE_WITH_MISSING_OBSERVED_INDICES" : "UNKNOWN_TOTAL_COUNT_NOT_PROVEN",
      orderChanged: category.missingObservedRangeValues?.length ? "ORDER_INCOMPLETE_WITH_VISIBLE_GAPS" : "NO_GAPS_INSIDE_CURRENT_OBSERVED_RECORDS",
      geometryChanged: "NO_GEOMETRY_CHANGE_CLAIMED_COLOR_PRESENTATION_CONTROL_ONLY",
      labelsChanged: "SELECTED_NATIVE_SKIN_TONE_LABEL_CHANGED"
    },
    evidence,
    uncertainty: [
      "The first and final selector boundaries are not proven.",
      "No controlled test shows whether skin tone affects other categories.",
      "No racial or ethnic labels are inferred from this evidence."
    ],
    requiredFollowUp: [
      "Run GFM-CAP-005 for complete Skin Tone boundary, count, default, wrap, and dependency evidence.",
      "Under canonical settings, test whether skin tone changes skin details, head rendering, hair, or other visible controls."
    ],
    productionEligible: false,
    verificationStatus: "OBSERVED_PENDING_VERIFICATION"
  };
}

function blockedDependencyTest(variable, runNumber, context) {
  const definition = blockedDefinition(variable, context);
  return {
    testID: `dep-test-${kebab(variable)}-not-executed`,
    runNumber,
    variable,
    executionStatus: definition.executionStatus,
    result: definition.result,
    baseline: context.baseline,
    changedVariable: {
      variable,
      fromValue: definition.fromValue,
      toValue: "UNAVAILABLE_IN_CURRENT_EVIDENCE"
    },
    expectedTest: definition.expectedTest,
    observedBehavior: definition.observedBehavior,
    observedChanges: {
      countsChanged: "NOT_TESTED",
      orderChanged: "NOT_TESTED",
      geometryChanged: "NOT_TESTED",
      labelsChanged: "NOT_TESTED"
    },
    evidence: definition.evidence,
    uncertainty: definition.uncertainty,
    requiredFollowUp: definition.requiredFollowUp,
    productionEligible: false,
    verificationStatus: "OBSERVED_PENDING_VERIFICATION"
  };
}

function blockedDefinition(variable, context) {
  const envEvidence = fieldEvidence(context.environment, "platform") ?? sourceVideoEvidence(context.environment);
  const creationEvidence = fieldEvidence(context.environment, "position") ?? sourceVideoEvidence(context.environment);
  const captureRequest = captureRequestFor(variable, context.captureRequests);
  const base = {
    executionStatus: "NOT_EXECUTED_NO_CONTROLLED_EVIDENCE",
    result: "NOT_RUN",
    fromValue: baselineValue(variable, context.baseline),
    evidence: [creationEvidence].filter(Boolean),
    uncertainty: ["No controlled before/after test exists in the current evidence set."],
    requiredFollowUp: [
      captureRequest
        ? `${captureRequest.captureID}: ${captureRequest.title}`
        : "Capture a controlled dependency run that changes only this variable and records counts, ordering, labels, geometry, and dependency effects."
    ]
  };

  const expectedTest = `Change ${labelForVariable(variable)} while holding the baseline constant and record whether counts, native order, geometry, labels, or availability change.`;
  const observedBehavior = `No current footage changes ${labelForVariable(variable)} as a controlled dependency variable.`;

  if (["platform", "patch", "edition", "entitlements", "onlineState", "eaAccountState"].includes(variable)) {
    return {
      ...base,
      executionStatus: "BLOCKED_BY_MISSING_ENVIRONMENT_METADATA",
      evidence: [envEvidence].filter(Boolean),
      expectedTest,
      observedBehavior: `${observedBehavior} The environment manifest does not contain enough metadata to compare this condition.`,
      requiredFollowUp: [
        "Record the missing environment/version/account/entitlement state before dependency testing.",
        ...base.requiredFollowUp
      ]
    };
  }

  if (["hairstyle", "facialHair"].includes(variable)) {
    return {
      ...base,
      executionStatus: "BLOCKED_BY_UNOPENED_MENU",
      expectedTest,
      observedBehavior: `${observedBehavior} The current evidence does not open the relevant Hair/facial-hair controls.`,
      requiredFollowUp: [
        "Open and record the Hair submenu before dependency testing.",
        ...base.requiredFollowUp
      ]
    };
  }

  if (["height", "weight", "bodyType"].includes(variable)) {
    return {
      ...base,
      executionStatus: "BLOCKED_BY_UNOBSERVED_BODY_CONTROL",
      expectedTest,
      observedBehavior: `${observedBehavior} The body-control research catalog confirms this control is not observed in current evidence.`,
      requiredFollowUp: [
        "Record body/height/weight/physique controls and then test their effects on appearance availability and framing.",
        ...base.requiredFollowUp
      ]
    };
  }

  if (variable === "baseType") {
    return {
      ...base,
      expectedTest: "Compare Road to Glory Custom versus other player bases such as Legend templates only when those bases are directly visible.",
      observedBehavior: "Player-base context is visible, but Custom versus Legend/template comparison is not executed in current footage."
    };
  }

  if (variable === "archetype") {
    return {
      ...base,
      fromValue: context.environment.observedJourneyTypeHighlight ?? "UNKNOWN",
      expectedTest,
      observedBehavior: "A Contributor journey-type card is observed, but no controlled archetype/prospect-type change is executed."
    };
  }

  if (variable === "position") {
    return {
      ...base,
      fromValue: context.environment.position ?? "UNKNOWN",
      expectedTest,
      observedBehavior: "QB is observed as the selected position context, but no other position is selected for comparison."
    };
  }

  return { ...base, expectedTest, observedBehavior };
}

function createBaseline(environment, creationPaths) {
  const creationPath = creationPaths.creationPaths?.[0] ?? {};
  return {
    baselineID: "baseline-cf27-phase0-current-xbox-rtg-qb",
    environmentID: environment.environmentID,
    creationPathID: creationPath.id ?? null,
    gameTitle: environment.gameTitle,
    platform: environment.platform ?? "UNKNOWN",
    mode: environment.gameMode ?? "UNKNOWN",
    creationPath: creationPath.exactPath ?? environment.roadToGloryPath ?? "UNKNOWN",
    baseType: environment.playerBaseSelection ?? "UNKNOWN_NOT_SELECTED_AS_CONTROLLED_VARIABLE",
    observedJourneyType: environment.observedJourneyTypeHighlight ?? "UNKNOWN",
    position: environment.position ?? "UNKNOWN",
    archetype: environment.archetype ?? "UNKNOWN",
    height: "UNKNOWN_NOT_VISIBLE",
    weight: "UNKNOWN_NOT_VISIBLE",
    bodyType: "UNKNOWN_NOT_VISIBLE",
    selectedHead: "VARIES_IN_HEAD_TEMPLATE_FOOTAGE",
    skinTone: "VARIES_IN_SKIN_TONE_FOOTAGE",
    hairstyle: "UNKNOWN_HAIR_MENU_NOT_OPENED",
    facialHair: "UNKNOWN_HAIR_MENU_NOT_OPENED",
    onlineState: environment.onlineState ?? "UNKNOWN_NOT_VISIBLE",
    eaAccountState: environment.eaAccountRequirement ?? "UNKNOWN_NOT_VISIBLE",
    edition: environment.edition ?? "UNKNOWN_NOT_VISIBLE",
    entitlements: environment.entitlementStatus ? [environment.entitlementStatus] : ["UNKNOWN_NOT_VISIBLE"],
    patch: environment.patchVersion ?? "UNKNOWN_NOT_VISIBLE",
    evidence: [sourceVideoEvidence(environment)].filter(Boolean),
    notes: "Baseline is the current research environment only; exact patch, edition, account state, online state, body values, hairstyle, and facial-hair settings are unresolved."
  };
}

function evidenceFromRecords(records, evidenceManifest) {
  const entriesByID = new Map((evidenceManifest.entries ?? []).map((entry) => [entry.evidence_id, entry]));
  return records.filter(Boolean).flatMap((record) => {
    const evidenceID = record.evidenceFrame?.evidenceID ?? record.sourceObservations?.[0]?.evidenceID;
    const manifestEntry = evidenceID ? entriesByID.get(evidenceID) : null;
    return evidenceID ? [{
      evidenceID,
      relativePath: record.evidenceFrame?.path ?? manifestEntry?.relative_path ?? null,
      videoID: record.sourceObservations?.[0]?.videoID ?? record.sourceVideo ?? null,
      timestamp: record.evidenceFrame?.timestamp ?? record.sourceObservations?.[0]?.evidenceFrameTimestamp ?? null,
      note: `Evidence for ${labelForRecord(record)}.`
    }] : [];
  });
}

function fieldEvidence(environment, field) {
  const evidence = environment.fieldEvidence?.[field];
  if (!evidence) return null;
  return {
    evidenceID: evidence.evidenceID,
    videoID: evidence.videoID,
    timelineRecordID: evidence.timelineRecordID,
    timestampRange: timestampRange(evidence.startTimestamp, evidence.endTimestamp),
    note: `${field} baseline evidence: ${evidence.note ?? evidence.visibleMenuLabel ?? "directly observed context"}`
  };
}

function sourceVideoEvidence(environment) {
  const source = environment.sourceVideo;
  if (!source?.evidenceID) return null;
  return {
    evidenceID: source.evidenceID,
    videoID: source.videoID,
    relativePath: source.portableRelativeEvidencePath,
    timestampRange: timestampRange(0, source.durationSeconds),
    note: "Source environment video evidence."
  };
}

function captureRequestFor(variable, captureRequests) {
  const requests = captureRequests.requests ?? [];
  const terms = {
    position: ["position", "body", "height", "weight"],
    archetype: ["archetype", "body", "height", "weight"],
    height: ["height"],
    weight: ["weight"],
    bodyType: ["body type", "body", "physique"],
    baseType: ["player base", "custom", "legend"],
    hairstyle: ["hairstyle", "hair"],
    facialHair: ["facial hair", "facial-hair"],
    platform: ["environment", "platform"],
    patch: ["environment", "patch", "version"],
    edition: ["environment", "edition", "entitlement"],
    entitlements: ["environment", "entitlement"],
    onlineState: ["environment", "online"],
    eaAccountState: ["environment", "account"]
  }[variable] ?? [variable];
  return requests.find((request) => {
    const haystack = JSON.stringify(request).toLowerCase();
    return terms.some((term) => haystack.includes(term));
  }) ?? null;
}

function baselineValue(variable, baseline) {
  return {
    position: baseline.position,
    archetype: baseline.archetype,
    height: baseline.height,
    weight: baseline.weight,
    bodyType: baseline.bodyType,
    head: baseline.selectedHead,
    skinTone: baseline.skinTone,
    hairstyle: baseline.hairstyle,
    facialHair: baseline.facialHair,
    onlineState: baseline.onlineState,
    eaAccountState: baseline.eaAccountState,
    edition: baseline.edition,
    entitlements: baseline.entitlements.join("|"),
    baseType: baseline.baseType,
    platform: baseline.platform,
    patch: baseline.patch
  }[variable] ?? "UNKNOWN";
}

function labelForRecord(record) {
  if (!record) return "UNKNOWN";
  return record.nativeLabel ?? record.nativeDisplayLabel ?? record.visibleGameLabelOrIndex ?? record.stableResearchCatalogID ?? "UNKNOWN";
}

function labelForVariable(variable) {
  return variable.replace(/([A-Z])/g, " $1").toLowerCase();
}

function timestampRange(start, end) {
  if (!Number.isFinite(Number(start)) || !Number.isFinite(Number(end))) return null;
  return `${start}-${end}`;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function kebab(value) {
  return value.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function formatCsv(tests) {
  const columns = [
    "testID",
    "variable",
    "executionStatus",
    "result",
    "fromValue",
    "toValue",
    "countsChanged",
    "orderChanged",
    "geometryChanged",
    "labelsChanged",
    "evidenceCount",
    "requiredFollowUp"
  ];
  return toCsv(columns, tests.map((test) => ({
    testID: test.testID,
    variable: test.variable,
    executionStatus: test.executionStatus,
    result: test.result,
    fromValue: test.changedVariable.fromValue,
    toValue: test.changedVariable.toValue,
    countsChanged: test.observedChanges.countsChanged,
    orderChanged: test.observedChanges.orderChanged,
    geometryChanged: test.observedChanges.geometryChanged,
    labelsChanged: test.observedChanges.labelsChanged,
    evidenceCount: test.evidence.length,
    requiredFollowUp: test.requiredFollowUp.join(" | ")
  })));
}

function formatMarkdown(report) {
  const lines = [
    "# Dependency Test Execution",
    "",
    "PRIMARY RESEARCH CANDIDATE - NOT PRODUCTION VERIFIED",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This report executes only the dependency tests supported by current direct evidence. Unexecuted variables are blocked or not executed; none are marked passed.",
    "",
    "## Summary",
    "",
    `- Variables in matrix: ${report.summary.variableCount}`,
    `- Executed from current evidence: ${report.summary.executedVariableCount}`,
    `- Blocked or not executed: ${report.summary.blockedOrNotExecutedVariableCount}`,
    `- Independently verified runs: ${report.summary.independentlyVerifiedRunCount}`,
    `- Production-eligible runs: ${report.summary.productionEligibleRunCount}`,
    "",
    "## Test Records",
    "",
    "| Variable | Status | Result | Counts | Order | Geometry | Labels | Follow-up |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  ];
  for (const test of report.tests) {
    lines.push(`| ${test.variable} | ${test.executionStatus} | ${test.result} | ${test.observedChanges.countsChanged} | ${test.observedChanges.orderChanged} | ${test.observedChanges.geometryChanged} | ${test.observedChanges.labelsChanged} | ${test.requiredFollowUp[0] ?? ""} |`);
  }
  lines.push("");
  lines.push("## Production Gate");
  lines.push("");
  lines.push("Dependency testing remains incomplete. Current research observations cannot enable production recommendations or production catalog publication.");
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
  console.log("Usage: node scripts/cf27-dependency-evidence-tests.mjs [--generated-at <iso>]");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const report = generateDependencyEvidenceReport(options);
    writeDependencyEvidenceReport(report, options);
    console.log(`Dependency evidence report generated: ${report.summary.executedVariableCount} executed, ${report.summary.blockedOrNotExecutedVariableCount} blocked/not executed.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
