#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_ENVIRONMENT_CREATION_PATH_SCHEMA_VERSION = "cf27-environment-creation-path-research-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-13T22:20:00-04:00";
const videoID = "phase0-video-001";
const sourceLegacyVideoID = "video-001";
const verificationStatus = "OBSERVED_PENDING_VERIFICATION";

const environmentJsonPath = "data/phase-zero/environment_manifest.research.json";
const creationPathsJsonPath = "data/phase-zero/creation_paths.research.json";
const creationPathsCsvPath = "data/phase-zero/creation_paths.research.csv";
const issuesJsonPath = "data/phase-zero/issues_register.research.json";
const findingsDocPath = "docs/phase-zero/ENVIRONMENT_AND_CREATION_PATH_FINDINGS.md";

const creationPathID = "creation-path-cf27-rtg-custom-qb-create-player-appearance-video-001";
const environmentID = "env-cf27-phase0-video-001-rtg-custom-qb";
const sourceEvidenceID = "phase0-source-phase0-video-001";

const unresolvedFields = [
  ["gameVersion", "Visible game version or executable version is not shown in the footage."],
  ["patchVersion", "Patch number or update version is not shown in the footage."],
  ["consoleModel", "The recording supports Xbox family context, but not Series X versus Series S."],
  ["consoleOSVersion", "Console OS/version screen is not shown."],
  ["edition", "Game edition is not shown."],
  ["storefrontRegion", "Storefront or region is not shown."],
  ["copyType", "Disc/digital/subscription copy type is not shown."],
  ["entitlementStatus", "Entitlement, preorder, deluxe, or subscription status is not shown."],
  ["displayModel", "Display device model is not shown."],
  ["hdrState", "HDR state is not shown."],
  ["outputResolution", "Console output resolution is not shown; only source-video resolution is known."],
  ["onlineState", "Online/offline state is not visible."],
  ["eaAccountRequirement", "EA account requirement/sign-in state is not visible."],
  ["playerBaseSelection", "Player Base screen is visible as a top-tab step, but a selected player-base value is not shown."],
  ["archetype", "Journey cards are visible, including Contributor, but archetype as a player-build value is not confirmed."],
  ["handedness", "Player Info includes Handedness as a visible field, but its value is not readable/confirmed."],
  ["height", "Height value is not shown."],
  ["weight", "Weight value is not shown."],
  ["bodyType", "Body type value is not shown."],
  ["appearanceEditableLater", "The footage reaches creation-time Appearance but does not prove later editability after creation."]
];

const fieldEvidenceDefinitions = [
  ["gameTitle", "EA SPORTS College Football 27", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Main menu footage is identified as College Football 27 in the source inventory and existing evidence notes."],
  ["platform", "Xbox", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Current evidence set is direct Xbox screen recording; exact model remains unresolved."],
  ["consoleFamily", "Xbox", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Console family is supported by the supplied Xbox capture context; exact console model is unresolved."],
  ["gameMode", "Road to Glory", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Road to Glory is visible in the left navigation and then entered."],
  ["roadToGloryPath", "Main interface > Road to Glory > Road to Glory Setup > Journey type cards > Choose Your Position > QB > Create Player > Player > Appearance > Head & Skin visible", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "The sequence is supported by timestamped events in video 001."],
  ["creationStartingPoint", "Create Player flow reached from Road to Glory setup", "phase0-video-001-tl-007", "Create Player appearance path/menu", "The Create Player area is visible after Road to Glory setup and position selection."],
  ["appearanceEntryPoint", "Create Player > Player > Appearance > Head & Skin", "phase0-video-001-tl-008", "Create Player menu navigation", "Appearance is opened from Player; Head & Skin is visible/selected and Hair is visible as a sibling row."],
  ["playerBaseScreenVisible", true, "phase0-video-001-tl-005", "Player setup / position path", "PLAYER BASE is visible as a top-tab step on the position/player setup screen."],
  ["position", "QB", "phase0-video-001-tl-005", "Player setup / position path", "QB is visible during the position/path step."],
  ["journeyTypeCardsVisible", ["ELITE", "BLUE CHIP", "CONTRIBUTOR", "UNDERDOG"], "phase0-video-001-tl-004", "Archetype / prospect selection cards", "Journey type cards are visible; they are context labels, not appearance catalog records."],
  ["observedJourneyTypeHighlight", "CONTRIBUTOR", "phase0-video-001-tl-004", "Archetype / prospect selection cards", "Existing evidence references note CONTRIBUTOR highlighted before position selection; requires second verification before production use."],
  ["playerInfoFieldsVisible", ["First Name", "Last Name", "Position", "Jersey #", "Handedness", "Home State", "Hometown", "Pipeline", "High School Name", "Mascot"], "phase0-video-001-tl-008", "Create Player menu navigation", "Existing timestamp references show Player Info fields after entering the Player tab."],
  ["visibleAppearanceMenus", ["Head & Skin", "Hair"], "phase0-video-001-tl-008", "Create Player menu navigation", "Head & Skin and Hair are visible under Appearance; Hair is not opened in this footage."],
  ["captureDate", "2026-07-12T19:03:45.000Z", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Capture timestamp comes from source-video metadata/inventory."],
  ["captureMethod", "Xbox screen recording", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Source evidence is a direct Xbox screen recording; exact capture hardware remains unresolved."],
  ["captureFormat", "MP4, 1920x1080, h264 Main, AAC audio, approximately 58.96 fps", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Technical media metadata comes from authoritative video inventory."],
  ["visibleDisplayConditions", "In-game screen capture at 1920x1080 source-video resolution; display model, HDR, and console output settings are not visible.", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Only the video file resolution/format is known."]
];

const steps = [
  ["step-001", 1, "Open College Football 27 main interface and navigate to Road to Glory.", "Road to Glory transition/loading begins.", "phase0-video-001-tl-001", "College Football hub / Road to Glory navigation", "Road to Glory"],
  ["step-002", 2, "On Road to Glory Setup, choose Advance.", "Journey type cards appear.", "phase0-video-001-tl-003", "Road to Glory menu/start area", "Road to Glory"],
  ["step-003", 3, "Select the observed journey type card highlighted before the position screen.", "Position selection appears.", "phase0-video-001-tl-004", "Archetype / prospect selection cards", "Road to Glory Setup"],
  ["step-004", 4, "Choose QB on the position screen.", "QB is selected and the flow can continue toward Create Player.", "phase0-video-001-tl-005", "Player setup / position path", "Choose Your Position"],
  ["step-005", 5, "Advance into Create Player.", "Create Player opens on the Player top tab.", "phase0-video-001-tl-007", "Create Player appearance path/menu", "Create Player"],
  ["step-006", 6, "Open or observe Player Info from the Player tab.", "Player Info fields are visible, including Handedness as a field.", "phase0-video-001-tl-008", "Create Player menu navigation", "Create Player > Player"],
  ["step-007", 7, "Open Appearance from the Player tab.", "Appearance submenu appears.", "phase0-video-001-tl-008", "Create Player menu navigation", "Create Player > Player"],
  ["step-008", 8, "Observe Head & Skin in the Appearance submenu.", "Head & Skin is visible and selected.", "phase0-video-001-tl-008", "Create Player menu navigation", "Create Player > Appearance"],
  ["step-009", 9, "Observe Hair under Appearance.", "Hair is visible as a sibling row; Hair is not opened in this footage.", "phase0-video-001-tl-008", "Create Player menu navigation", "Create Player > Appearance"]
];

export function generateEnvironmentCreationPathResearch(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const inventory = readJson(path.resolve(root, "data/phase-zero/video_inventory.json"));
  const timeline = readJson(path.resolve(root, "data/phase-zero/video_timeline.json"));
  const evidenceManifest = readJson(path.resolve(root, "data/phase-zero/evidence_manifest.json"));
  const sourceVideo = (inventory.inventory ?? []).find((video) => video.inventoryId === videoID);
  const timelineByID = new Map((timeline.records ?? []).map((record) => [record.timeline_record_id, record]));
  const sourceEvidence = (evidenceManifest.entries ?? []).find((entry) => entry.evidence_id === sourceEvidenceID);

  const fieldEvidence = Object.fromEntries(fieldEvidenceDefinitions.map(([field, value, timelineID, visibleMenuLabel, note]) => {
    const timelineRecord = timelineByID.get(timelineID);
    return [field, {
      value,
      support: "direct_video_or_source_inventory",
      evidenceID: sourceEvidenceID,
      videoID,
      originalFilename: sourceVideo?.originalFilename ?? "01_Environment_and_Creation_Path.MP4",
      canonicalFilename: sourceVideo?.canonicalFilename ?? "01_Environment_and_Creation_Path.mp4",
      timelineRecordID: timelineID,
      startTimestamp: timelineRecord?.start_timestamp ?? null,
      endTimestamp: timelineRecord?.end_timestamp ?? null,
      visibleMenuLabel,
      confidence: field === "observedJourneyTypeHighlight" ? "MEDIUM_PENDING_SECOND_VERIFICATION" : "HIGH_OBSERVED_PENDING_VERIFICATION",
      note
    }];
  }));

  const missingFields = unresolvedFields.map(([field, reason]) => ({
    field,
    value: null,
    status: "unresolved",
    reason,
    requiredBeforeProduction: true,
    evidenceID: sourceEvidenceID,
    recommendedEvidence: recommendedEvidenceFor(field)
  }));

  const environment = {
    schemaVersion: CF27_ENVIRONMENT_CREATION_PATH_SCHEMA_VERSION,
    generatedAt,
    environmentID,
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus,
    gameTitle: fieldEvidence.gameTitle.value,
    gameVersion: null,
    patchVersion: null,
    platform: fieldEvidence.platform.value,
    consoleFamily: fieldEvidence.consoleFamily.value,
    consoleModel: null,
    consoleOSVersion: null,
    edition: null,
    storefrontRegion: null,
    copyType: null,
    entitlementStatus: null,
    gameMode: fieldEvidence.gameMode.value,
    roadToGloryPath: fieldEvidence.roadToGloryPath.value,
    exactButtonMenuSequence: steps.map((step) => step[2]),
    playerBaseSelection: null,
    playerBaseScreenVisible: true,
    position: "QB",
    archetype: null,
    observedJourneyTypeHighlight: "CONTRIBUTOR",
    handedness: null,
    onlineState: null,
    eaAccountRequirement: null,
    creationStartingPoint: fieldEvidence.creationStartingPoint.value,
    appearanceEntryPoint: fieldEvidence.appearanceEntryPoint.value,
    appearanceEditableLater: null,
    visibleVersionOrPatchDetails: null,
    visibleDisplayConditions: fieldEvidence.visibleDisplayConditions.value,
    captureDate: fieldEvidence.captureDate.value,
    captureMethod: fieldEvidence.captureMethod.value,
    captureFormat: fieldEvidence.captureFormat.value,
    sourceVideo: {
      evidenceID: sourceEvidenceID,
      videoID,
      originalFilename: sourceVideo?.originalFilename ?? null,
      canonicalFilename: sourceVideo?.canonicalFilename ?? null,
      portableRelativeEvidencePath: sourceVideo?.sourceLocation?.portableRelativeEvidencePath ?? sourceEvidence?.relative_path ?? null,
      sha256: sourceVideo?.sha256 ?? sourceEvidence?.sha256 ?? null,
      fileSizeBytes: sourceVideo?.fileSizeBytes ?? sourceEvidence?.size_bytes ?? null,
      durationSeconds: sourceVideo?.durationSeconds ?? null,
      dimensions: sourceVideo?.dimensions ?? null,
      frameRate: sourceVideo?.frameRate ?? null
    },
    fieldEvidence,
    missingEnvironmentEvidence: missingFields,
    canonicalPathAssessment: {
      researchPathAssessment: "SUPPORTED_AS_RESEARCH_CANONICAL_PATH_WITH_LIMITATIONS",
      researchPathReason: "The footage directly supports Road to Glory > QB > Create Player > Player > Appearance > Head & Skin as a reproducible research path for the current audit, with timestamped evidence for each observed step.",
      productionCatalogPathAssessment: "NOT_SUFFICIENT_FOR_PRODUCTION_CATALOG_PATH",
      productionCatalogPathReason: "Production path support still requires exact game version/patch, platform environment, later editability/dependency checks, second-person verification, and catalog-manager approval."
    }
  };

  const creationPath = {
    schemaVersion: `${CF27_ENVIRONMENT_CREATION_PATH_SCHEMA_VERSION}-creation-path`,
    generatedAt,
    id: creationPathID,
    environmentID,
    dataClass: "RESEARCH_CANDIDATE",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus,
    gameTitle: environment.gameTitle,
    gameMode: environment.gameMode,
    displayName: "Road to Glory Custom QB Create Player appearance path",
    exactPath: environment.roadToGloryPath,
    status: "supported_for_research_only",
    reproducibleSteps: steps.map(([stepID, stepNumber, instruction, expectedResult, timelineRecordID, visibleMenuLabel, parentMenu]) => {
      const record = timelineByID.get(timelineRecordID);
      return {
        stepID,
        stepNumber,
        instruction,
        expectedResult,
        parentMenu,
        visibleMenuLabel,
        evidence: {
          evidenceID: sourceEvidenceID,
          videoID,
          timelineRecordID,
          startTimestamp: record?.start_timestamp ?? null,
          endTimestamp: record?.end_timestamp ?? null,
          confidence: "OBSERVED_PENDING_VERIFICATION"
        }
      };
    }),
    dependencies: missingFields.filter((field) => ["gameVersion", "patchVersion", "consoleModel", "onlineState", "eaAccountRequirement", "appearanceEditableLater"].includes(field.field)),
    restrictions: [
      {
        id: "restriction-research-only",
        severity: "blocking",
        description: "This creation path is not production verified and cannot enable production recommendations."
      },
      {
        id: "restriction-hair-not-opened",
        severity: "warning",
        description: "Hair is visible under Appearance but was not opened in the environment video."
      },
      {
        id: "restriction-later-editability-not-proven",
        severity: "blocking",
        description: "The footage does not prove whether appearance can be edited later after player creation."
      }
    ],
    assessment: environment.canonicalPathAssessment
  };

  const issues = issueRegister(generatedAt, missingFields);
  return { environment, creationPaths: { schemaVersion: `${CF27_ENVIRONMENT_CREATION_PATH_SCHEMA_VERSION}-creation-path-package`, generatedAt, dataClass: "RESEARCH_CANDIDATE", productionStatus: "NOT_PRODUCTION_DATA", verificationStatus, creationPaths: [creationPath] }, issues };
}

export function writeEnvironmentCreationPathResearch(outputs, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, options.environmentJsonPath ?? environmentJsonPath, `${JSON.stringify(outputs.environment, null, 2)}\n`);
  writeText(root, options.creationPathsJsonPath ?? creationPathsJsonPath, `${JSON.stringify(outputs.creationPaths, null, 2)}\n`);
  writeText(root, options.creationPathsCsvPath ?? creationPathsCsvPath, creationPathsCsv(outputs.creationPaths.creationPaths));
  writeText(root, options.issuesJsonPath ?? issuesJsonPath, `${JSON.stringify(outputs.issues, null, 2)}\n`);
  writeText(root, options.findingsDocPath ?? findingsDocPath, findingsMarkdown(outputs));
}

function issueRegister(generatedAt, missingFields) {
  const issues = missingFields.map((field) => ({
    issueID: `issue-phase0-env-${slug(field.field)}`,
    kind: field.field === "appearanceEditableLater" ? "dependencyUncertainty" : "missingEvidence",
    title: `Missing environment/path evidence: ${field.field}`,
    description: field.reason,
    owner: "wyatt-skaggs",
    severity: "blocking",
    status: "open",
    affectedRecordIDs: [environmentID, creationPathID],
    affectedEvidenceFileIDs: [sourceEvidenceID],
    createdAt: generatedAt,
    updatedAt: generatedAt,
    resolutionNotes: "",
    recaptureRequest: {
      required: true,
      queueStatus: "queued",
      requestedAngles: [],
      requestedEvidenceKinds: [field.recommendedEvidence],
      owner: "wyatt-skaggs",
      priority: "blocking",
      notes: field.reason
    }
  }));
  issues.push({
    issueID: "issue-phase0-env-hair-visible-not-opened",
    kind: "missingEvidence",
    title: "Hair menu visible but not opened in environment video",
    description: "Hair is visible under Appearance, but the environment/creation-path recording does not open Hair or prove its controls.",
    owner: "wyatt-skaggs",
    severity: "warning",
    status: "open",
    affectedRecordIDs: [environmentID, creationPathID],
    affectedEvidenceFileIDs: [sourceEvidenceID],
    createdAt: generatedAt,
    updatedAt: generatedAt,
    resolutionNotes: "",
    recaptureRequest: {
      required: true,
      queueStatus: "queued",
      requestedAngles: [],
      requestedEvidenceKinds: ["Open Appearance > Hair and record visible child controls."],
      owner: "wyatt-skaggs",
      priority: "warning",
      notes: "Required before Hair controls can be mapped."
    }
  });
  return {
    schemaVersion: "phase0-issue-register-v1",
    registerID: "phase0-environment-creation-path-issues",
    createdAt: generatedAt,
    updatedAt: generatedAt,
    issues
  };
}

function creationPathsCsv(paths) {
  const columns = ["id", "display_name", "status", "game_mode", "exact_path", "research_path_assessment", "production_path_assessment", "step_count", "verification_status"];
  const rows = paths.map((creationPath) => ({
    id: creationPath.id,
    display_name: creationPath.displayName,
    status: creationPath.status,
    game_mode: creationPath.gameMode,
    exact_path: creationPath.exactPath,
    research_path_assessment: creationPath.assessment.researchPathAssessment,
    production_path_assessment: creationPath.assessment.productionCatalogPathAssessment,
    step_count: creationPath.reproducibleSteps.length,
    verification_status: creationPath.verificationStatus
  }));
  return `${[columns, ...rows.map((row) => columns.map((column) => row[column] ?? ""))]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n")}\n`;
}

function findingsMarkdown({ environment, creationPaths, issues }) {
  const pathRecord = creationPaths.creationPaths[0];
  const supported = Object.entries(environment.fieldEvidence);
  const lines = [
    "# Environment And Creation Path Findings",
    "",
    `Generated: ${environment.generatedAt}`,
    "",
    "These findings are Phase 0 research records. They are not production verification and do not enable recommendations.",
    "",
    "## Supported Findings",
    "",
    "| Field | Value | Evidence | Timestamp |",
    "| --- | --- | --- | --- |"
  ];
  for (const [field, evidence] of supported) {
    lines.push(`| ${field} | ${formatMarkdownValue(evidence.value)} | ${evidence.timelineRecordID} / ${evidence.visibleMenuLabel} | ${formatTimestampRange(evidence.startTimestamp, evidence.endTimestamp)} |`);
  }
  lines.push(
    "",
    "## Reproducible Creation Path",
    "",
    `Path: ${pathRecord.exactPath}`,
    "",
    "| Step | Instruction | Expected Result | Evidence |",
    "| ---: | --- | --- | --- |"
  );
  for (const step of pathRecord.reproducibleSteps) {
    lines.push(`| ${step.stepNumber} | ${step.instruction} | ${step.expectedResult} | ${step.evidence.timelineRecordID} ${formatTimestampRange(step.evidence.startTimestamp, step.evidence.endTimestamp)} |`);
  }
  lines.push(
    "",
    "## Missing Environment Evidence",
    "",
    "| Field | Reason | Required before production |",
    "| --- | --- | --- |"
  );
  for (const field of environment.missingEnvironmentEvidence) {
    lines.push(`| ${field.field} | ${field.reason} | ${field.requiredBeforeProduction ? "yes" : "no"} |`);
  }
  lines.push(
    "",
    "## Canonical Path Assessment",
    "",
    `- Research path: ${environment.canonicalPathAssessment.researchPathAssessment}`,
    `- Reason: ${environment.canonicalPathAssessment.researchPathReason}`,
    `- Production catalog path: ${environment.canonicalPathAssessment.productionCatalogPathAssessment}`,
    `- Reason: ${environment.canonicalPathAssessment.productionCatalogPathReason}`,
    "",
    "## Issue Register",
    "",
    `- Open issues: ${issues.issues.filter((issue) => issue.status === "open").length}`,
    `- Blocking issues: ${issues.issues.filter((issue) => issue.severity === "blocking").length}`,
    `- Warning issues: ${issues.issues.filter((issue) => issue.severity === "warning").length}`,
    "",
    "## Outputs",
    "",
    "- `data/phase-zero/environment_manifest.research.json`",
    "- `data/phase-zero/creation_paths.research.json`",
    "- `data/phase-zero/creation_paths.research.csv`",
    "- `data/phase-zero/issues_register.research.json`"
  );
  return `${lines.join("\n")}\n`;
}

function recommendedEvidenceFor(field) {
  const recommendations = {
    gameVersion: "Record the visible game version/build screen.",
    patchVersion: "Record the installed patch/update details.",
    consoleModel: "Record the Xbox console model screen.",
    consoleOSVersion: "Record the console OS/version screen.",
    edition: "Record purchase/edition screen or visible edition evidence.",
    storefrontRegion: "Record storefront/region evidence if used for catalog scope.",
    copyType: "Record disc/digital/subscription copy evidence if available.",
    entitlementStatus: "Record entitlement/add-on state if it can affect menus.",
    displayModel: "Record display/capture setup notes.",
    hdrState: "Record console/display HDR state.",
    outputResolution: "Record console output resolution setting.",
    onlineState: "Record online/offline state during audit.",
    eaAccountRequirement: "Record EA account sign-in/requirement state.",
    playerBaseSelection: "Record Player Base screen and selected value.",
    archetype: "Record player archetype/build value after journey setup.",
    handedness: "Record Player Info handedness selected value.",
    height: "Record selected height.",
    weight: "Record selected weight.",
    bodyType: "Record selected body type.",
    appearanceEditableLater: "Record post-creation editability path or absence."
  };
  return recommendations[field] ?? "Record direct evidence for this field.";
}

function formatTimestampRange(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  return `${start}s-${end}s`;
}

function formatMarkdownValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null) return "null";
  return String(value);
}

function slug(value) {
  return String(value).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(root, relativePath, text) {
  const filePath = path.resolve(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function printHelp() {
  console.log("Usage: node scripts/cf27-environment-creation-path-research.mjs [--generated-at <iso>]");
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }
    const outputs = generateEnvironmentCreationPathResearch(options);
    writeEnvironmentCreationPathResearch(outputs, options);
    console.log(`Environment and creation-path research generated: ${outputs.creationPaths.creationPaths[0].reproducibleSteps.length} steps, ${outputs.issues.issues.length} issues.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
