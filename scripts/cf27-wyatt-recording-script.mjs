#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_WYATT_RECORDING_SCRIPT_VERSION = "cf27-wyatt-recording-script-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-14T04:15:00-04:00";
const sourceGapMatrixPath = "data/phase-zero/appearance_menu_gap_matrix.json";
const captureRequestsJsonPath = "data/phase-zero/capture_requests.json";
const captureRequestsCsvPath = "data/phase-zero/capture_requests.csv";
const recordingScriptDocPath = "docs/phase-zero/WYATT_RECORDING_SCRIPT.md";
const quickChecklistDocPath = "docs/phase-zero/WYATT_RECORDING_QUICK_CHECKLIST.md";
const legacyCapturePlanDocPath = "docs/phase-zero/WYATT_NEXT_CAPTURE_PLAN.md";
const issueRegisterPath = "data/phase-zero/issues_register.research.json";

const globalSettingsToLock = [
  "Use the same Road to Glory Create Player flow already observed in current evidence; start from Create Player > Player > Appearance.",
  "Use one continuous player draft for all sessions unless the game forces a restart.",
  "Do not change height, weight, position, archetype, body type, handedness, equipment, or unrelated Player-tab values during these appearance-menu sessions.",
  "Keep the selected native menu label or index visible before every option change.",
  "Use Xbox screen recording or capture-card recording where possible; if phone recording is the only option, keep the display square, stable, glare-free, and readable.",
  "Turn off notifications and avoid private account, payment, serial-number, or credential screens.",
  "Do not invent labels. If a control, boundary, or value differs from this script, record the visible screen and note the discrepancy."
];

const qualityChecklist = [
  "Menu title and selected option label/index are readable.",
  "No notification overlay, cursor obstruction, loading spinner, or transition blur covers the selected value.",
  "Pause after each option change until the character preview is fully loaded.",
  "Keep zoom/framing constant inside each session.",
  "If a clip must split, overlap by the last completed option and use the next part number.",
  "Record only direct game evidence; do not narrate guesses as facts."
];

const sourceGapLabelsByCaptureID = new Map([
  ["GFM-CAP-001", ["Appearance", "Head & Skin", "Additional Appearance rows beyond visible Head & Skin and Hair", "Additional Head & Skin rows beyond visible Chin"]],
  ["GFM-CAP-002", ["Head Template"]],
  ["GFM-CAP-003", ["Head Template", "Skin Tone", "Skin Details", "Eye Shape", "Eye Color", "Nose", "Ear Shape", "Mouth Shape", "Jaw Shape", "Chin"]],
  ["GFM-CAP-004", ["Head Template"]],
  ["GFM-CAP-005", ["Skin Tone", "Skin Details", "Eye Shape", "Eye Color"]],
  ["GFM-CAP-006", ["Nose", "Ear Shape", "Mouth Shape", "Jaw Shape", "Chin"]],
  ["GFM-CAP-007", ["Hair", "Hair submenu child controls", "Hairstyles", "Hair colors", "Facial hair", "Facial-hair colors"]],
  ["GFM-CAP-008", ["Hairstyles"]],
  ["GFM-CAP-009", ["Hair colors"]],
  ["GFM-CAP-010", ["Facial hair", "Facial-hair colors"]]
]);

const sessions = [
  session({
    captureID: "GFM-CAP-001",
    sessionNumber: 1,
    priority: "P0",
    title: "Appearance and Head & Skin boundary map",
    exactCategory: "Appearance menu hierarchy",
    exactMenuPath: "Create Player > Player > Appearance, then Head & Skin",
    exactSettingsToLock: [
      "Do not change any appearance value in this session.",
      "Keep the same current player draft and controller profile.",
      "Keep the menu list readable; this is menu-boundary evidence only."
    ],
    exactStartingOption: "Appearance entry on the Player tab",
    exactEndingOption: "Final visible Head & Skin row after any scrolling continuation, then return to Appearance without changing values",
    navigationSpeed: "Slow list navigation; pause on each menu row before scrolling.",
    requiredPauses: "3 seconds on Appearance, 3 seconds on Head & Skin, 3 seconds on each Head & Skin row, 5 seconds on first and final visible boundaries.",
    requiredCameraViews: ["FULL_MENU_LIST", "SCROLL_CONTINUATION", "LOCK_WARNING_OR_DEPENDENCY_IF_VISIBLE"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: false,
    stillScreenshotsRequired: false,
    frontViewsRequired: false,
    threeQuarterViewsRequired: false,
    profileViewsRequired: false,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-001_APPEARANCE_HEADSKIN_BOUNDARY_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after Head & Skin first/final visible boundaries are proven and the Hair entry is visible from Appearance.",
    existingFootageCanBeReused: "Existing footage proves Appearance, Head & Skin, and Hair are visible, but not complete boundaries or scroll continuations.",
    acceptanceCriteria: [
      "Appearance entry is visible from the Player tab.",
      "Head & Skin row order is visible from first through final observed row.",
      "Mouth Shape, Jaw Shape, Chin, and any additional visible Head & Skin rows are captured as menu rows only unless opened in later sessions.",
      "No category is marked absent unless the menu boundary is visible."
    ]
  }),
  session({
    captureID: "GFM-CAP-002",
    sessionNumber: 2,
    priority: "P0",
    title: "Head Template full count and boundary proof",
    exactCategory: "Head Template count and native order",
    exactMenuPath: "Create Player > Player > Appearance > Head & Skin > Head Template",
    exactSettingsToLock: [
      "Do not attempt standardized comparison views in this session.",
      "Do not change skin, hair, facial hair, or other appearance controls.",
      "Keep the native Face number/index visible before every movement."
    ],
    exactStartingOption: "First selected Head Template value visible in the selector, expected from current evidence to be Face 1 if unchanged",
    exactEndingOption: "Proven final selected Head Template value plus boundary or wrap/no-wrap evidence",
    navigationSpeed: "One deliberate option movement every 2 to 3 seconds; never jump over a selected value without showing the destination.",
    requiredPauses: "3 seconds on every selected value; 5 seconds on first value, final value, and boundary/wrap evidence.",
    requiredCameraViews: ["MENU_LABEL_OR_INDEX_PER_SELECTED_VALUE", "FIRST_VALUE_PROOF", "FINAL_VALUE_PROOF", "WRAP_OR_NO_WRAP_PROOF"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: true,
    stillScreenshotsRequired: false,
    frontViewsRequired: false,
    threeQuarterViewsRequired: false,
    profileViewsRequired: false,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-002_HEAD_TEMPLATE_COUNT_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop only after two complete counts agree or a visible discrepancy is recorded.",
    existingFootageCanBeReused: "Existing Head Template research observations remain useful for provenance, but skipped indices and selector boundaries are not closed.",
    acceptanceCriteria: [
      "Two complete selected-value passes are visible.",
      "Currently unresolved values inside the observed range are resolved by direct traversal evidence, not inference.",
      "The final count is not claimed unless final/wrap/no-wrap evidence is visible.",
      "Face 12 overlap remains preserved as continuity evidence, not a duplicate production record."
    ]
  }),
  session({
    captureID: "GFM-CAP-003",
    sessionNumber: 3,
    priority: "P0",
    title: "Canonical appearance lock slate",
    exactCategory: "Stable capture conditions",
    exactMenuPath: "Create Player > Player > Appearance > Head & Skin, plus Hair if visible",
    exactSettingsToLock: [
      "Record the current visible value for Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Mouth Shape, Jaw Shape, Chin, and Hair controls where visible.",
      "If a visible control can remove eye black, hats/headwear, facial hair, or obstructive hair, record the native label first, then set the least-obstructing available value.",
      "If no such control is visible, record that the control is unavailable in current evidence and do not invent a setting."
    ],
    exactStartingOption: "Head & Skin menu root after GFM-CAP-001 and GFM-CAP-002",
    exactEndingOption: "Recorded stable slate after the same settings are shown unchanged across at least three option changes",
    navigationSpeed: "Slow; this is proof-of-state capture, not count capture.",
    requiredPauses: "5 seconds on every visible setting used as part of the canonical slate; 5 seconds after each proof that the slate remained unchanged.",
    requiredCameraViews: ["MENU", "FRONT_PREVIEW", "LEFT_3Q_IF_NEEDED", "RIGHT_3Q_IF_NEEDED"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: false,
    stillScreenshotsRequired: true,
    frontViewsRequired: true,
    threeQuarterViewsRequired: true,
    profileViewsRequired: false,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-003_CANONICAL_APPEARANCE_LOCK_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop when the stable slate is recorded and any unavailable obstruction-removal controls are visibly documented.",
    existingFootageCanBeReused: "Existing footage is useful for current obstruction notes but not for locked production-comparison conditions.",
    acceptanceCriteria: [
      "The lock slate contains only visible native settings or explicit unavailable states.",
      "Eye black and obstruction are removed if visibly possible or documented if not possible.",
      "The slate does not rely on assumed hairstyle, facial-hair, or eye-black labels."
    ]
  }),
  session({
    captureID: "GFM-CAP-004",
    sessionNumber: 4,
    priority: "P0",
    title: "Head Template standardized visual pass",
    exactCategory: "Head Template production-comparison imagery",
    exactMenuPath: "Create Player > Player > Appearance > Head & Skin > Head Template",
    exactSettingsToLock: [
      "Use the canonical appearance slate from GFM-CAP-003.",
      "Keep hair, facial hair, skin, body, zoom, lighting, and framing unchanged unless the game forces a change.",
      "If a head template forces an attribute change, keep recording and mark it as a dependency issue."
    ],
    exactStartingOption: "First Head Template value proven in GFM-CAP-002",
    exactEndingOption: "Final Head Template value proven in GFM-CAP-002",
    navigationSpeed: "Slow value-by-value capture; do not move to the next value until all required views for the current value are complete.",
    requiredPauses: "3 seconds on menu label/index; 5 seconds after loading completes; 3 seconds per angle.",
    requiredCameraViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: false,
    stillScreenshotsRequired: true,
    frontViewsRequired: true,
    threeQuarterViewsRequired: true,
    profileViewsRequired: true,
    rearViewsRequired: true,
    requiredFileNamingConvention: "GFM-CAP-004_HEAD_TEMPLATE_STANDARD_VIEWS_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after every proven Head Template value has required views or a recapture issue is clearly noted.",
    existingFootageCanBeReused: "Existing footage remains valid menu/order research evidence but is unsuitable for production geometric comparison.",
    acceptanceCriteria: [
      "Every head has menu evidence and all required views.",
      "Frames are free of severe blur, loading animation, overlays, and inconsistent zoom.",
      "Rear view is captured for completeness but not used to infer facial geometry."
    ]
  }),
  session({
    captureID: "GFM-CAP-005",
    sessionNumber: 5,
    priority: "P0",
    title: "Head & Skin color and texture controls",
    exactCategory: "Skin Tone, Skin Details, Eye Shape, Eye Color",
    exactMenuPath: "Create Player > Player > Appearance > Head & Skin > Skin Tone, Skin Details, Eye Shape, Eye Color",
    exactSettingsToLock: [
      "Use the canonical appearance slate from GFM-CAP-003.",
      "Only the active category value changes during that category's run.",
      "Restore the canonical slate or record if the game prevents restoration."
    ],
    exactStartingOption: "First available selected value in Skin Tone, then Skin Details, then Eye Shape, then Eye Color",
    exactEndingOption: "Final available selected value plus boundary/wrap proof for each of the four categories",
    navigationSpeed: "One selected value every 3 seconds for color/texture categories; slow down for subtle labels or low readability.",
    requiredPauses: "5 seconds on first, final, default if visible, and wrap/no-wrap proof; 3 seconds per selected value.",
    requiredCameraViews: ["MENU", "FRONT_REPRESENTATIVE_FRAME_PER_VALUE", "CLOSE_FRONT_WHERE_EYE_VISIBILITY_IS_NEEDED"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: true,
    stillScreenshotsRequired: true,
    frontViewsRequired: true,
    threeQuarterViewsRequired: false,
    profileViewsRequired: false,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-005_HEADSKIN_COLOR_TEXTURE_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after Skin Tone, Skin Details, Eye Shape, and Eye Color each have first/final/wrap proof and readable selected values.",
    existingFootageCanBeReused: "Existing footage proves partial values only; it does not prove boundaries, defaults, or production-standard stable conditions.",
    acceptanceCriteria: [
      "No racial or ethnic descriptions are recorded for skin presentation.",
      "Unreadable native labels remain queued for review rather than replaced with generic names.",
      "Skin Tone unresolved numeric gaps are closed by direct evidence or explicitly recorded as unavailable/skipped."
    ]
  }),
  session({
    captureID: "GFM-CAP-006",
    sessionNumber: 6,
    priority: "P0",
    title: "Head & Skin geometry controls",
    exactCategory: "Nose, Ear Shape, Mouth Shape, Jaw Shape, Chin",
    exactMenuPath: "Create Player > Player > Appearance > Head & Skin > Nose, Ear Shape, Mouth Shape, Jaw Shape, Chin",
    exactSettingsToLock: [
      "Use the canonical appearance slate from GFM-CAP-003.",
      "Only the active geometry category value changes during that category's run.",
      "Do not record subjective resemblance, ethnicity, attractiveness, or identity labels."
    ],
    exactStartingOption: "First available selected value in Nose, then Ear Shape, then Mouth Shape, then Jaw Shape, then Chin",
    exactEndingOption: "Final available selected value plus boundary/wrap proof for each of the five categories",
    navigationSpeed: "One selected value only after the required views for the current value are captured.",
    requiredPauses: "5 seconds on menu label/index and after loading; 3 seconds per angle; 5 seconds on category boundaries.",
    requiredCameraViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: true,
    stillScreenshotsRequired: true,
    frontViewsRequired: true,
    threeQuarterViewsRequired: true,
    profileViewsRequired: true,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-006_HEADSKIN_GEOMETRY_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after all five categories have first/final/wrap proof, selected values, and required views or explicit recapture notes.",
    existingFootageCanBeReused: "Existing Nose and Ear Shape footage is partial; Mouth Shape, Jaw Shape, and Chin currently have menu-row proof only.",
    acceptanceCriteria: [
      "Every selected value is direct evidence, not a thumbnail-only observation.",
      "Side views are captured for Nose and Ear Shape when available.",
      "Mouth, Jaw Shape, and Chin selected values are cataloged only after direct selection."
    ]
  }),
  session({
    captureID: "GFM-CAP-007",
    sessionNumber: 7,
    priority: "P1",
    title: "Hair submenu boundary map",
    exactCategory: "Hair menu hierarchy",
    exactMenuPath: "Create Player > Player > Appearance > Hair",
    exactSettingsToLock: [
      "Do not change hair values in this mapping session unless the game requires selection to reveal a submenu.",
      "Keep current canonical head/skin/body values unchanged.",
      "Treat every visible Hair child control as unverified until it is directly opened."
    ],
    exactStartingOption: "Hair entry from Appearance",
    exactEndingOption: "Final visible Hair submenu/control after any scrolling continuation",
    navigationSpeed: "Slow list navigation; pause on each row and every scroll continuation.",
    requiredPauses: "3 seconds per visible Hair row; 5 seconds on first and final boundary.",
    requiredCameraViews: ["FULL_MENU_LIST", "SCROLL_CONTINUATION", "LOCK_WARNING_OR_DEPENDENCY_IF_VISIBLE"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: false,
    stillScreenshotsRequired: false,
    frontViewsRequired: false,
    threeQuarterViewsRequired: false,
    profileViewsRequired: false,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-007_HAIR_MENU_BOUNDARY_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after every visible Hair submenu/control row is recorded and unknown child controls are listed by visible native label.",
    existingFootageCanBeReused: "Existing footage proves the Hair entry exists only; no child controls are captured.",
    acceptanceCriteria: [
      "Hair child controls are directly visible in native order.",
      "Hairstyle, hair color, facial hair, and facial-hair color are not treated as confirmed native controls unless shown.",
      "Locks or unavailable controls remain documented as visible states."
    ]
  }),
  session({
    captureID: "GFM-CAP-008",
    sessionNumber: 8,
    priority: "P1",
    title: "Hairstyle options, only if visible in Hair",
    exactCategory: "Hairstyles",
    exactMenuPath: "Create Player > Player > Appearance > Hair > visible hairstyle control from GFM-CAP-007",
    exactSettingsToLock: [
      "Proceed only if GFM-CAP-007 directly shows a hairstyle-like native control.",
      "Use the canonical appearance slate from GFM-CAP-003.",
      "Only the active hairstyle value changes."
    ],
    exactStartingOption: "First visible selected value in the hairstyle control shown in GFM-CAP-007",
    exactEndingOption: "Final selected value plus boundary or wrap/no-wrap proof",
    navigationSpeed: "One selected hairstyle after all required views for the current value are captured.",
    requiredPauses: "3 seconds on menu label/index; 5 seconds after loading; 3 seconds per angle.",
    requiredCameraViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: true,
    stillScreenshotsRequired: true,
    frontViewsRequired: true,
    threeQuarterViewsRequired: true,
    profileViewsRequired: true,
    rearViewsRequired: true,
    requiredFileNamingConvention: "GFM-CAP-008_HAIRSTYLES_IF_VISIBLE_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after all visible hairstyle values are counted twice and view evidence is complete, or after the control is proven not visible.",
    existingFootageCanBeReused: "No complete hairstyle control evidence exists.",
    acceptanceCriteria: [
      "The native control is visibly confirmed before option capture begins.",
      "Every selected value has menu evidence and required angle views.",
      "Rear view is included for hair shape/length."
    ]
  }),
  session({
    captureID: "GFM-CAP-009",
    sessionNumber: 9,
    priority: "P1",
    title: "Hair color options, only if visible in Hair",
    exactCategory: "Hair colors",
    exactMenuPath: "Create Player > Player > Appearance > Hair > visible hair-color control from GFM-CAP-007",
    exactSettingsToLock: [
      "Proceed only if GFM-CAP-007 directly shows a hair-color-like native control.",
      "Use one visible hairstyle that makes color clear; record its native value first.",
      "Only the active hair-color value changes."
    ],
    exactStartingOption: "First visible selected value in the hair-color control shown in GFM-CAP-007",
    exactEndingOption: "Final selected value plus boundary or wrap/no-wrap proof",
    navigationSpeed: "One selected color every 3 seconds; slow down for subtle or unreadable labels.",
    requiredPauses: "5 seconds on first, final, and wrap/no-wrap proof; 3 seconds per color.",
    requiredCameraViews: ["MENU", "FRONT_REPRESENTATIVE_FRAME_PER_VALUE", "LEFT_3Q_IF_NEEDED_FOR_VISIBILITY"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: true,
    stillScreenshotsRequired: true,
    frontViewsRequired: true,
    threeQuarterViewsRequired: true,
    profileViewsRequired: false,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-009_HAIR_COLORS_IF_VISIBLE_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after all visible hair-color values are counted twice or after the control is proven not visible.",
    existingFootageCanBeReused: "No complete hair-color control evidence exists.",
    acceptanceCriteria: [
      "Every selected value has readable native label/index evidence.",
      "Lighting stays constant.",
      "No generic color name replaces unreadable game text."
    ]
  }),
  session({
    captureID: "GFM-CAP-010",
    sessionNumber: 10,
    priority: "P1",
    title: "Facial-hair controls, only if visible in Hair",
    exactCategory: "Facial hair and facial-hair colors",
    exactMenuPath: "Create Player > Player > Appearance > Hair > visible facial-hair or facial-hair-color controls from GFM-CAP-007",
    exactSettingsToLock: [
      "Proceed only if GFM-CAP-007 directly shows facial-hair-related native controls.",
      "Use the canonical head and hairstyle from GFM-CAP-003 unless the game forces another value.",
      "Only the active facial-hair or facial-hair-color value changes."
    ],
    exactStartingOption: "None if visibly present for facial hair; otherwise first visible selected facial-hair-related value",
    exactEndingOption: "Final selected facial-hair-related value plus boundary or wrap/no-wrap proof",
    navigationSpeed: "One selected value after menu label and face preview are stable.",
    requiredPauses: "5 seconds on None/first, final, and wrap/no-wrap proof; 3 seconds per selected value.",
    requiredCameraViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE"],
    menuIndexMustRemainVisible: true,
    twoIndependentCountsRequired: true,
    stillScreenshotsRequired: true,
    frontViewsRequired: true,
    threeQuarterViewsRequired: true,
    profileViewsRequired: true,
    rearViewsRequired: false,
    requiredFileNamingConvention: "GFM-CAP-010_FACIAL_HAIR_IF_VISIBLE_YYYYMMDD_partNN.mp4",
    stopCondition: "Stop after visible facial-hair and facial-hair-color controls are counted twice or proven not visible.",
    existingFootageCanBeReused: "No complete facial-hair or facial-hair-color evidence exists.",
    acceptanceCriteria: [
      "None is included only if directly visible.",
      "Coverage, mustache, beard, sideburn, stubble, density, and color-control observations are recorded only when visible.",
      "Facial-hair color is not assumed to exist unless shown."
    ]
  })
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] ?? "generate";
  if (!["generate", "--check"].includes(command)) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
  const output = buildWyattRecordingScript({
    root: repositoryRoot,
    generatedAt: generatedAtDefault
  });
  if (command === "--check") {
    const expected = renderOutputs(output);
    const mismatches = Object.entries(expected).filter(([relativePath, contents]) => readIfExists(path.join(repositoryRoot, relativePath)) !== contents);
    if (mismatches.length > 0) {
      console.error(`Wyatt recording script outputs are stale: ${mismatches.map(([relativePath]) => relativePath).join(", ")}`);
      process.exit(1);
    }
    console.log(`Wyatt recording script check OK (${output.summary.requestCount} sessions).`);
  } else {
    writeWyattRecordingScript(output, { root: repositoryRoot });
    console.log(`Wyatt recording script generated: ${output.summary.requestCount} sessions.`);
  }
}

export function buildWyattRecordingScript({ root = repositoryRoot, generatedAt = generatedAtDefault } = {}) {
  const gapMatrix = JSON.parse(fs.readFileSync(path.resolve(root, sourceGapMatrixPath), "utf8"));
  const requestRows = sessions.map((request) => ({
    ...request,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "REQUESTED_NOT_CAPTURED",
    dataClass: "PHASE_ZERO_CAPTURE_REQUEST",
    sourceType: "research",
    owner: "wyatt-skaggs",
    sourceGapIDs: gapIDsForRequest(gapMatrix, request.captureID),
    sourceGapLabels: gapLabelsForRequest(gapMatrix, request.captureID),
    qualityChecklist,
    globalSettingsToLock
  }));
  return {
    schemaVersion: CF27_WYATT_RECORDING_SCRIPT_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_CAPTURE_REQUESTS",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "REQUESTED_NOT_CAPTURED",
    productionRecommendationsEnabled: false,
    sourceArtifacts: [sourceGapMatrixPath],
    scope:
      "Final executable recording script for current appearance-menu gaps. It excludes broad environment, deployment, payment, and already-proven path evidence.",
    summary: summarizeRequests(requestRows, gapMatrix),
    globalSettingsToLock,
    qualityChecklist,
    requests: requestRows
  };
}

export function writeWyattRecordingScript(output, { root = repositoryRoot } = {}) {
  const rendered = renderOutputs(output);
  for (const [relativePath, contents] of Object.entries(rendered)) {
    const absolutePath = path.resolve(root, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }
  updateIssueRegister(root, output);
}

function renderOutputs(output) {
  return {
    [captureRequestsJsonPath]: `${JSON.stringify(output, null, 2)}\n`,
    [captureRequestsCsvPath]: formatCaptureRequestsCsv(output.requests),
    [recordingScriptDocPath]: formatRecordingScriptMarkdown(output),
    [quickChecklistDocPath]: formatQuickChecklistMarkdown(output),
    [legacyCapturePlanDocPath]: formatLegacyCapturePlanMarkdown(output)
  };
}

function updateIssueRegister(root, output) {
  const absolutePath = path.resolve(root, issueRegisterPath);
  if (!fs.existsSync(absolutePath)) return;
  const register = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  const requestIDs = output.requests.map((request) => request.captureID);
  for (const issue of register.issues ?? []) {
    if (issue.issueID !== "issue-phase0-wyatt-next-capture-plan") continue;
    issue.title = "Wyatt appearance-menu recording script is ready for execution";
    issue.description = "The current recording package is the executable appearance-menu script derived from the canonical gap matrix. It excludes broad Phase 0 captures already outside this menu-gap scope.";
    issue.affectedRecordIDs = requestIDs;
    issue.updatedAt = output.generatedAt;
    issue.resolutionNotes = "Close this tracking issue after the requested appearance-menu recordings are imported or explicitly superseded by a newer recording script.";
    issue.recaptureRequest.requestedEvidenceKinds = [
      "Execute data/phase-zero/capture_requests.json, docs/phase-zero/WYATT_RECORDING_SCRIPT.md, and docs/phase-zero/WYATT_RECORDING_QUICK_CHECKLIST.md."
    ];
    issue.recaptureRequest.notes = "This issue tracks the appearance-menu recording script artifact, not a single blocking category.";
  }
  fs.writeFileSync(absolutePath, `${JSON.stringify(register, null, 2)}\n`);
}

function summarizeRequests(requests, gapMatrix) {
  return {
    requestCount: requests.length,
    p0Count: requests.filter((request) => request.priority === "P0").length,
    p1Count: requests.filter((request) => request.priority === "P1").length,
    expectedTotalDuration: "Approximately 2.5-5 hours depending on final option counts and clip splits.",
    productionRecommendationsEnabled: false,
    sourceGapRows: gapMatrix.summary?.totalRows ?? 0,
    confirmedPresentIncompleteRows: gapMatrix.summary?.confirmedPresentIncomplete ?? 0,
    suspectedButNotObservedRows: gapMatrix.summary?.suspectedButNotObserved ?? 0,
    unknownMenuRegionRows: gapMatrix.summary?.unknownBecauseMenuNotFullyInspected ?? 0,
    productionEligibleRows: 0,
    excludedBecauseAlreadyProvenOrOutOfScope: [
      "Do not re-record broad Road to Glory path in this script; use the already observed path to reach Appearance.",
      "Do not record environment/version/payment/deployment evidence in this appearance-menu script.",
      "Do not recapture partial current values solely for provenance; recapture only where boundary, count, stable-condition, view, or production-suitability gaps remain."
    ]
  };
}

function session(input) {
  return {
    section: input.priority === "P0" ? "record_this_tonight" : "record_after_p0_if_time",
    ...input,
    expectedDuration: durationFor(input.captureID),
    requiredViews: input.requiredCameraViews
  };
}

function durationFor(captureID) {
  return {
    "GFM-CAP-001": "3-5 minutes",
    "GFM-CAP-002": "15-30 minutes",
    "GFM-CAP-003": "5-8 minutes",
    "GFM-CAP-004": "45-120 minutes, split by head ranges if needed",
    "GFM-CAP-005": "25-45 minutes",
    "GFM-CAP-006": "35-70 minutes",
    "GFM-CAP-007": "3-6 minutes",
    "GFM-CAP-008": "30-90 minutes if the native control is visible",
    "GFM-CAP-009": "8-20 minutes if the native control is visible",
    "GFM-CAP-010": "15-45 minutes if native controls are visible"
  }[captureID] ?? "TBD from visible game controls";
}

function gapIDsForRequest(gapMatrix, captureID) {
  const labels = sourceGapLabelsByCaptureID.get(captureID) ?? [];
  return (gapMatrix.rows ?? [])
    .filter((row) => labels.includes(row.displayedCategoryLabel))
    .map((row) => row.gapID);
}

function gapLabelsForRequest(gapMatrix, captureID) {
  const labels = sourceGapLabelsByCaptureID.get(captureID) ?? [];
  return (gapMatrix.rows ?? [])
    .filter((row) => labels.includes(row.displayedCategoryLabel))
    .map((row) => row.displayedCategoryLabel);
}

function formatRecordingScriptMarkdown(output) {
  return [
    "# Wyatt Recording Script",
    "",
    "PRIMARY RESEARCH CAPTURE SCRIPT - NOT PRODUCTION DATA",
    "",
    `Generated: ${output.generatedAt}`,
    "",
    "This is the executable recording script for the current appearance-menu gap matrix. It is ordered to minimize menu navigation and recording time. It does not include broad environment, deployment, payment, or already-proven path evidence.",
    "",
    "Permanent rule: record only what is visible in the shipping game. If a menu, label, count, boundary, or control differs from this script, keep recording the visible screen and mark the discrepancy. Do not invent a missing category or option.",
    "",
    "## Global Settings To Lock",
    "",
    ...output.globalSettingsToLock.map((item) => `- ${item}`),
    "",
    "## Quality Checklist",
    "",
    ...output.qualityChecklist.map((item) => `- ${item}`),
    "",
    "## Sessions",
    "",
    ...output.requests.flatMap((request) => formatSessionMarkdown(request))
  ].join("\n").trimEnd() + "\n";
}

function formatSessionMarkdown(request) {
  return [
    `### Session ${request.sessionNumber}: ${request.captureID} - ${request.title}`,
    "",
    `- Expected duration: ${request.expectedDuration}`,
    `- Exact menu path: ${request.exactMenuPath}`,
    `- Exact settings to lock: ${request.exactSettingsToLock.join(" ")}`,
    `- Exact starting option: ${request.exactStartingOption}`,
    `- Exact ending option: ${request.exactEndingOption}`,
    `- Navigation speed: ${request.navigationSpeed}`,
    `- Required pauses: ${request.requiredPauses}`,
    `- Required camera views: ${request.requiredCameraViews.join(", ")}`,
    `- Menu index must remain visible: ${yesNo(request.menuIndexMustRemainVisible)}`,
    `- Two independent counts required: ${yesNo(request.twoIndependentCountsRequired)}`,
    `- Still screenshots required: ${yesNo(request.stillScreenshotsRequired)}`,
    `- Front views required: ${yesNo(request.frontViewsRequired)}`,
    `- Three-quarter views required: ${yesNo(request.threeQuarterViewsRequired)}`,
    `- Profile views required: ${yesNo(request.profileViewsRequired)}`,
    `- Rear views required: ${yesNo(request.rearViewsRequired)}`,
    `- Required file naming convention: ${request.requiredFileNamingConvention}`,
    `- Existing footage can be reused: ${request.existingFootageCanBeReused}`,
    `- Stop condition: ${request.stopCondition}`,
    `- Source gap labels: ${request.sourceGapLabels.length ? request.sourceGapLabels.join(", ") : "conditional or setup gap"}`,
    "- Acceptance criteria:",
    ...request.acceptanceCriteria.map((item) => `  - ${item}`),
    ""
  ];
}

function formatQuickChecklistMarkdown(output) {
  const tonight = output.requests.filter((request) => request.section === "record_this_tonight");
  const later = output.requests.filter((request) => request.section !== "record_this_tonight");
  return [
    "# Wyatt Recording Quick Checklist",
    "",
    "ONE-PAGE CONSOLE-SIDE CHECKLIST - NOT PRODUCTION DATA",
    "",
    "Before starting:",
    "",
    "- [ ] Use Xbox/capture-card recording if possible.",
    "- [ ] Notifications are off.",
    "- [ ] Menu label/index is readable.",
    "- [ ] Do not change non-appearance player settings.",
    "- [ ] If a clip splits, overlap by the last completed option and increment `partNN`.",
    "- [ ] If the game differs from the script, record the screen and note the discrepancy.",
    "",
    "Record this tonight, in order:",
    "",
    ...tonight.map((request) => `- [ ] ${request.sessionNumber}. ${request.captureID} - ${request.title} (${request.expectedDuration})`),
    "",
    "Continue only if time and the native controls are visible:",
    "",
    ...later.map((request) => `- [ ] ${request.sessionNumber}. ${request.captureID} - ${request.title} (${request.expectedDuration})`),
    "",
    "Stop when:",
    "",
    "- [ ] The current session stop condition is met.",
    "- [ ] The menu label/index becomes unreadable and cannot be corrected.",
    "- [ ] A private account, payment, serial-number, or credential screen would be recorded.",
    "- [ ] The game behaves differently enough that a discrepancy note is needed."
  ].join("\n") + "\n";
}

function formatLegacyCapturePlanMarkdown(output) {
  return [
    "# Wyatt Next Capture Plan",
    "",
    "SUPERSEDED: The current executable capture plan is `docs/phase-zero/WYATT_RECORDING_SCRIPT.md` with the one-page checklist at `docs/phase-zero/WYATT_RECORDING_QUICK_CHECKLIST.md`.",
    "",
    "This file is preserved as a compatibility pointer for older references. The current `data/phase-zero/capture_requests.*` package now contains the appearance-menu recording script derived from `data/phase-zero/appearance_menu_gap_matrix.json`.",
    "",
    `Current request count: ${output.summary.requestCount}`,
    `Production recommendations enabled: ${output.productionRecommendationsEnabled ? "yes" : "no"}`,
    ""
  ].join("\n");
}

function formatCaptureRequestsCsv(requests) {
  const columns = [
    "captureID",
    "sessionNumber",
    "section",
    "priority",
    "title",
    "expectedDuration",
    "exactMenuPath",
    "exactCategory",
    "exactStartingOption",
    "exactEndingOption",
    "navigationSpeed",
    "requiredPauses",
    "requiredCameraViews",
    "menuIndexMustRemainVisible",
    "twoIndependentCountsRequired",
    "stillScreenshotsRequired",
    "frontViewsRequired",
    "threeQuarterViewsRequired",
    "profileViewsRequired",
    "rearViewsRequired",
    "requiredFileNamingConvention",
    "stopCondition",
    "acceptanceCriteria",
    "sourceGapLabels",
    "productionStatus",
    "verificationStatus"
  ];
  return `${columns.join(",")}\n${requests.map((request) => columns.map((column) => csvEscape(Array.isArray(request[column]) ? request[column].join("; ") : request[column])).join(",")).join("\n")}\n`;
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function readIfExists(absolutePath) {
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null;
}
