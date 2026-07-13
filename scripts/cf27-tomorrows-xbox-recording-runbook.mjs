#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_XBOX_RECORDING_RUNBOOK_VERSION = "cf27-xbox-recording-runbook-v1";
export const xboxRecordingRunbookLabel = "TOMORROW'S XBOX RECORDING RUNBOOK - PRIMARY RESEARCH ONLY - NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDirectory = "data/research/cf27/reports/tomorrows-xbox-recording-runbook";
const defaultDocsPath = "docs/catalog/TOMORROWS_XBOX_RECORDING_RUNBOOK.md";

const sourcePaths = {
  authoritativeRecaptureQueue: "data/research/cf27/reports/authoritative-recapture-queue/authoritative_recapture_queue.json",
  partialResearchManifest: "data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json",
  appearanceHierarchy: "data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/menu_map.json",
  headStandardizationQA: "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json"
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "generate";
  if (["--help", "-h", "help"].includes(command)) {
    printHelp();
  } else if (command === "generate") {
    const runbook = buildXboxRecordingRunbook({ root: repositoryRoot, generatedAt: new Date().toISOString() });
    const output = writeXboxRecordingRunbookOutputs(runbook, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory,
      docsPath: cliValue("--docs-path") ?? defaultDocsPath
    });
    console.log(JSON.stringify({ ok: true, summary: runbook.summary, files: output.files }, null, 2));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function buildXboxRecordingRunbook({ root = repositoryRoot, generatedAt = new Date().toISOString() } = {}) {
  const context = loadRunbookContext(root);
  const clips = createRecordingClips(context);
  return {
    schemaVersion: CF27_XBOX_RECORDING_RUNBOOK_VERSION,
    reportLabel: xboxRecordingRunbookLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    sourceType: "researchCandidate",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED",
    productionRecommendationsEnabled: false,
    intent:
      "Console-side recording plan ordered to minimize repeated navigation while capturing the exact gaps found in current Xbox recordings.",
    sourceInputs: sourcePaths,
    sourceContext: context.summary,
    rules: [
      "Preserve original Xbox recordings unchanged.",
      "Record only visible game or console facts.",
      "Do not infer option counts, labels, ranges, sliders, menu paths, versions, patches, or platform differences.",
      "Keep current evidence useful for research provenance, menu/order proof, and comparison, but do not mark it production verified.",
      "If a screen differs from this runbook, record the actual visible screen and create an issue rather than forcing the plan."
    ],
    preFlight: [
      "Start each clip after the prior clip has fully saved.",
      "Keep the selected menu label or index visible before moving to the next value.",
      "Pause long enough for loading animations to finish before rotating or changing options.",
      "Avoid account credentials, payment screens, serial numbers, and private messages.",
      "If storage limits require splitting a clip, overlap by the last completed option and note the overlap aloud or in the filename."
    ],
    summary: summarizeClips(clips, context),
    clips
  };
}

export function writeXboxRecordingRunbookOutputs(runbook, { root = repositoryRoot, outputDirectory = defaultOutputDirectory, docsPath = defaultDocsPath } = {}) {
  assertResearchOutputPath(outputDirectory, "outputDirectory");
  assertDocsCatalogPath(docsPath, "docsPath");
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const jsonPath = path.join(absoluteOutputDirectory, "tomorrows_xbox_recording_runbook.json");
  const csvPath = path.join(absoluteOutputDirectory, "tomorrows_xbox_recording_runbook.csv");
  const markdownPath = path.join(absoluteOutputDirectory, "TOMORROWS_XBOX_RECORDING_RUNBOOK.md");
  const absoluteDocsPath = path.resolve(root, docsPath);
  fs.mkdirSync(path.dirname(absoluteDocsPath), { recursive: true });
  const markdown = renderRunbookMarkdown(runbook);
  fs.writeFileSync(jsonPath, `${JSON.stringify(runbook, null, 2)}\n`);
  fs.writeFileSync(csvPath, serializeClipCSV(runbook));
  fs.writeFileSync(markdownPath, markdown);
  fs.writeFileSync(absoluteDocsPath, markdown);
  return {
    files: [jsonPath, csvPath, markdownPath, absoluteDocsPath].map((filePath) => path.relative(root, filePath))
  };
}

function loadRunbookContext(root) {
  const recaptureQueue = readJsonIfExists(root, sourcePaths.authoritativeRecaptureQueue);
  const partialManifest = readJsonIfExists(root, sourcePaths.partialResearchManifest);
  const appearanceHierarchy = readJsonIfExists(root, sourcePaths.appearanceHierarchy);
  const headQA = readJsonIfExists(root, sourcePaths.headStandardizationQA);
  return {
    recaptureQueue,
    partialManifest,
    appearanceHierarchy,
    headQA,
    summary: {
      recaptureQueueItems: recaptureQueue?.summary?.queueItemCount ?? 0,
      currentHeadCandidates: partialManifest?.counts?.heads ?? 29,
      currentResearchRecords: partialManifest?.counts?.totalResearchCatalogRecords ?? 0,
      productionRecordsCreated: partialManifest?.counts?.productionRecordsCreated ?? 0,
      oneStandardizedHeadRunCanRepairCurrentImageLimitations: Boolean(
        headQA?.summary?.oneStandardizedRecaptureRunCanRepairCurrentImageLimitations
      )
    }
  };
}

function createRecordingClips(context) {
  const headCount = context.summary.currentHeadCandidates || 29;
  return [
    clip({
      order: 1,
      id: "XR-001",
      filename: "CF27_XBOX_ENV_CONSOLE_MODEL_OS_UPDATE_YYYYMMDD.mp4",
      purpose: "Lock the console environment that current videos could not prove.",
      startingScreen: "Xbox Home",
      exactMenu: "Xbox Settings > System > Console info, then System > Updates",
      firstOption: "Console info screen",
      finalOption: "Console update status screen",
      completeCountRequired: false,
      rotations: "None",
      pauseDuration: "5 seconds on each readable system screen",
      canonicalPlayerSettings: "Not applicable",
      eyeBlackRemoved: "Not applicable",
      hairOrFacialHairChanged: "No",
      rearViewRequired: false,
      expectedClipLength: "1-2 minutes",
      continuityOverlap: "Start from Xbox Home; no prior clip overlap needed.",
      completionCheckbox: "[ ] Console model, console OS, and update state are visible without recording secrets.",
      relatedRecaptureIDs: ["RQ-001"]
    }),
    clip({
      order: 2,
      id: "XR-002",
      filename: "CF27_XBOX_ENV_GAME_VERSION_ENTITLEMENTS_YYYYMMDD.mp4",
      purpose: "Record game version, patch/update, edition, ownership, and entitlement context without exposing secrets.",
      startingScreen: "Xbox Home on the College Football 27 tile",
      exactMenu: "Xbox game card/manage-game screens, then College Football 27 title or version screen if visible",
      firstOption: "College Football 27 tile or manage-game entry",
      finalOption: "Visible game title/version/update or installed-content screen",
      completeCountRequired: false,
      rotations: "None",
      pauseDuration: "5 seconds per version, update, edition, or entitlement screen",
      canonicalPlayerSettings: "Not applicable",
      eyeBlackRemoved: "Not applicable",
      hairOrFacialHairChanged: "No",
      rearViewRequired: false,
      expectedClipLength: "2-4 minutes",
      continuityOverlap: "Begin at the same tile/context used after XR-001.",
      completionCheckbox: "[ ] Game executable/version, patch/update state, edition/copy type, and entitlement state are visible or clearly unavailable.",
      relatedRecaptureIDs: ["RQ-002", "RQ-003"]
    }),
    clip({
      order: 3,
      id: "XR-003",
      filename: "CF27_XBOX_RTG_PATH_PLAYER_BODY_CONTROLS_YYYYMMDD.mp4",
      purpose: "Capture the observed Road to Glory path and player/body controls before entering appearance menus.",
      startingScreen: "College Football 27 main interface",
      exactMenu:
        "Road to Glory > Road to Glory setup > Journey type > Position > QB > Create Player > Player, then visible height/weight/body/physique controls",
      firstOption: "Road to Glory entry",
      finalOption: "Last visible Player/body/physique control reached in this path",
      completeCountRequired: true,
      rotations: "Only if the game shows a body preview; pause front-facing first",
      pauseDuration: "3 seconds on every selected path screen and 5 seconds on each control boundary/default",
      canonicalPlayerSettings:
        "Use the same Road to Glory setup path as current evidence: QB path if visible; record exact visible position/archetype/body values rather than guessing.",
      eyeBlackRemoved: "Not yet",
      hairOrFacialHairChanged: "No",
      rearViewRequired: false,
      expectedClipLength: "6-10 minutes",
      continuityOverlap: "Begin from title/main interface after XR-002; keep the first Road to Glory screen visible.",
      completionCheckbox: "[ ] Path, height, weight, body type, physique/body controls, defaults, restrictions, and visible dependencies are recorded.",
      relatedRecaptureIDs: ["RQ-017", "RQ-018", "RQ-020"]
    }),
    clip({
      order: 4,
      id: "XR-004",
      filename: "CF27_XBOX_APPEARANCE_HEADSKIN_MENU_MAP_YYYYMMDD.mp4",
      purpose: "Map the Appearance and Head & Skin hierarchy before detailed value capture.",
      startingScreen: "Create Player > Player screen from XR-003",
      exactMenu: "Player > Appearance > Head & Skin",
      firstOption: "Appearance entry",
      finalOption: "Last visible Head & Skin submenu item after any scrolling",
      completeCountRequired: true,
      rotations: "None for menu map; keep labels readable",
      pauseDuration: "3 seconds on every submenu list or scroll continuation",
      canonicalPlayerSettings: "Do not change appearance values in this clip except to enter/exit menus.",
      eyeBlackRemoved: "No",
      hairOrFacialHairChanged: "No",
      rearViewRequired: false,
      expectedClipLength: "3-5 minutes",
      continuityOverlap: "Start at the Player/Appearance area reached in XR-003.",
      completionCheckbox: "[ ] Appearance, Head & Skin, visible submenus, native order, scrolling, locks, and missing categories are recorded.",
      relatedRecaptureIDs: ["RQ-009", "RQ-010", "RQ-011", "RQ-012"]
    }),
    clip({
      order: 5,
      id: "XR-005",
      filename: "CF27_XBOX_HEAD_TEMPLATE_FACE29_TO_BOUNDARY_YYYYMMDD.mp4",
      purpose: "Continue Head Template after the current Face 29 stopping point and prove the category boundary.",
      startingScreen: "Appearance > Head & Skin > Head Template, positioned on Face 29 if possible",
      exactMenu: "Player > Appearance > Head & Skin > Head Template",
      firstOption: "Face 29",
      finalOption: "Proven final selected Head Template value, then boundary or wrap evidence",
      completeCountRequired: true,
      rotations: "Menu evidence only; no character rotation required unless quick front preview is stable",
      pauseDuration: "3 seconds on each selected value; 5 seconds on final/wrap evidence",
      canonicalPlayerSettings: "Keep current settings unchanged; this is order/count evidence, not standardized comparison capture.",
      eyeBlackRemoved: "No",
      hairOrFacialHairChanged: "No",
      rearViewRequired: false,
      expectedClipLength: "5-12 minutes, depending on remaining option count",
      continuityOverlap: "Start on Face 29 so it overlaps the prior Face 1-29 research evidence.",
      completionCheckbox: "[ ] Every selected value after Face 29 is visible, and the last value or wrap is proven without inventing a count.",
      relatedRecaptureIDs: ["RQ-004", "RQ-019"]
    }),
    clip({
      order: 6,
      id: "XR-006",
      filename: "CF27_XBOX_HEAD_TEMPLATE_SECOND_FULL_COUNT_YYYYMMDD.mp4",
      purpose: "Create an independent second count of the full Head Template sequence.",
      startingScreen: "Appearance > Head & Skin > Head Template, positioned at first value",
      exactMenu: "Player > Appearance > Head & Skin > Head Template",
      firstOption: "First selected Head Template value, expected to visibly read Face 1 if unchanged from current evidence",
      finalOption: "Proven final selected Head Template value and boundary/wrap evidence",
      completeCountRequired: true,
      rotations: "None; prioritize selected label/index and native order",
      pauseDuration: "2-3 seconds per selected value; 5 seconds at first/final/wrap",
      canonicalPlayerSettings: "Keep current settings unchanged; this is second-count/order evidence.",
      eyeBlackRemoved: "No",
      hairOrFacialHairChanged: "No",
      rearViewRequired: false,
      expectedClipLength: "10-20 minutes, depending on final count",
      continuityOverlap: "Begin by showing the first value and end by showing the same boundary/wrap proven in XR-005.",
      completionCheckbox: "[ ] Second full count agrees with or creates a discrepancy against XR-005 and current Face 1-29 evidence.",
      relatedRecaptureIDs: ["RQ-005", "RQ-019"]
    }),
    clip({
      order: 7,
      id: "XR-007",
      filename: "CF27_XBOX_CANONICAL_APPEARANCE_LOCK_YYYYMMDD.mp4",
      purpose: "Lock standardized comparison settings before high-value head/hair/facial-hair capture.",
      startingScreen: "Create Player > Appearance",
      exactMenu: "Appearance > Head & Skin and Appearance > Hair if available",
      firstOption: "Current Head & Skin setting that controls eye black or equivalent obstruction, if visible",
      finalOption: "Hair/facial-hair settings proof after several Head Template changes, if controls exist",
      completeCountRequired: false,
      rotations: "Front view, then quick left/right three-quarter only if needed to prove obstruction removal",
      pauseDuration: "5 seconds after each canonical setting is changed or proven unavailable",
      canonicalPlayerSettings:
        "Eye black removed if possible; controlled short/non-obstructing hairstyle if possible; facial hair set to None if possible; record exact native labels only when visible.",
      eyeBlackRemoved: "Yes, if the game exposes a control; otherwise record why it cannot be removed.",
      hairOrFacialHairChanged: "Yes, only to lock a controlled short hairstyle and facial hair None where visibly available.",
      rearViewRequired: false,
      expectedClipLength: "5-8 minutes",
      continuityOverlap: "Start from Appearance after Head Template count work; show before and after canonical settings.",
      completionCheckbox: "[ ] Eye black, hairstyle, and facial hair states are removed/locked or explicitly proven unavailable.",
      relatedRecaptureIDs: ["RQ-006", "RQ-007", "RQ-008"]
    }),
    clip({
      order: 8,
      id: "XR-008",
      filename: "CF27_XBOX_HEAD_STANDARDIZED_FACE001_FACE012_YYYYMMDD.mp4",
      purpose: "Capture standardized production-comparison views for the first head segment.",
      startingScreen: "Appearance > Head & Skin > Head Template on Face 1",
      exactMenu: "Player > Appearance > Head & Skin > Head Template",
      firstOption: "Face 1",
      finalOption: "Face 12",
      completeCountRequired: false,
      rotations: "MENU, FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q for each selected head",
      pauseDuration: "3 seconds on menu label; 3-5 seconds on each stable angle after loading completes",
      canonicalPlayerSettings: "Use canonical settings from XR-007; do not change hair, facial hair, eye black, zoom, lighting, or framing mid-clip.",
      eyeBlackRemoved: "Yes",
      hairOrFacialHairChanged: "No during clip; must already be locked.",
      rearViewRequired: true,
      expectedClipLength: "20-35 minutes",
      continuityOverlap: "Ends on Face 12 to overlap the existing intentional Face 12 source overlap and next clip.",
      completionCheckbox: "[ ] Faces 1-12 each have menu plus front, both three-quarter, both profile, and rear evidence.",
      relatedRecaptureIDs: ["RQ-006", "RQ-008"]
    }),
    clip({
      order: 9,
      id: "XR-009",
      filename: "CF27_XBOX_HEAD_STANDARDIZED_FACE012_FACE024_YYYYMMDD.mp4",
      purpose: "Continue standardized head capture with an overlap at Face 12.",
      startingScreen: "Appearance > Head & Skin > Head Template on Face 12",
      exactMenu: "Player > Appearance > Head & Skin > Head Template",
      firstOption: "Face 12",
      finalOption: "Face 24",
      completeCountRequired: false,
      rotations: "MENU, FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q for each selected head",
      pauseDuration: "3 seconds on menu label; 3-5 seconds on each stable angle after loading completes",
      canonicalPlayerSettings: "Use canonical settings from XR-007; preserve native order.",
      eyeBlackRemoved: "Yes",
      hairOrFacialHairChanged: "No during clip; must already be locked.",
      rearViewRequired: true,
      expectedClipLength: "20-35 minutes",
      continuityOverlap: "Begins on Face 12 from XR-008 and ends on Face 24 for the next clip.",
      completionCheckbox: "[ ] Faces 12-24 each have complete standardized angle evidence.",
      relatedRecaptureIDs: ["RQ-006", "RQ-008"]
    }),
    clip({
      order: 10,
      id: "XR-010",
      filename: "CF27_XBOX_HEAD_STANDARDIZED_FACE024_TO_FINAL_YYYYMMDD.mp4",
      purpose: "Finish standardized head capture through the proven final Head Template.",
      startingScreen: "Appearance > Head & Skin > Head Template on Face 24",
      exactMenu: "Player > Appearance > Head & Skin > Head Template",
      firstOption: "Face 24",
      finalOption: "Proven final Head Template value from XR-005/XR-006",
      completeCountRequired: false,
      rotations: "MENU, FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q for each selected head",
      pauseDuration: "3 seconds on menu label; 3-5 seconds on each stable angle after loading completes",
      canonicalPlayerSettings: "Use canonical settings from XR-007; preserve native order and boundary evidence.",
      eyeBlackRemoved: "Yes",
      hairOrFacialHairChanged: "No during clip; must already be locked.",
      rearViewRequired: true,
      expectedClipLength: "20-45 minutes, depending on final count",
      continuityOverlap: "Begins on Face 24 from XR-009; if storage requires more splits, overlap by the last completed face.",
      completionCheckbox: "[ ] Face 24 through the proven final head have complete standardized angle evidence.",
      relatedRecaptureIDs: ["RQ-004", "RQ-006", "RQ-008"]
    }),
    clip({
      order: 11,
      id: "XR-011",
      filename: "CF27_XBOX_FACE_MENUS_MOUTH_JAW_CHIN_YYYYMMDD.mp4",
      purpose: "Capture the missing face-shape categories now that the Head & Skin area is already open.",
      startingScreen: "Appearance > Head & Skin",
      exactMenu: "Player > Appearance > Head & Skin > Mouth Shape, Jaw Shape, and Chin where visible",
      firstOption: "First selected value in Mouth Shape or first visible missing face-shape category",
      finalOption: "Final selected value and boundary/wrap for Chin or the last visible missing face-shape category",
      completeCountRequired: true,
      rotations: "MENU plus FRONT and best available LEFT/RIGHT profile or three-quarter per value",
      pauseDuration: "3 seconds on label/index; 3-5 seconds on stable character view per value",
      canonicalPlayerSettings: "Keep canonical settings from XR-007 when possible.",
      eyeBlackRemoved: "Yes, if XR-007 succeeded",
      hairOrFacialHairChanged: "No during clip",
      rearViewRequired: false,
      expectedClipLength: "15-30 minutes, depending on counts",
      continuityOverlap: "Start from Head & Skin after XR-010; show category entry before first value.",
      completionCheckbox: "[ ] Mouth Shape, Jaw Shape, and Chin are captured or explicitly marked unavailable from visible evidence.",
      relatedRecaptureIDs: ["RQ-009", "RQ-010", "RQ-011", "RQ-019"]
    }),
    clip({
      order: 12,
      id: "XR-012",
      filename: "CF27_XBOX_HAIR_MENU_MAP_YYYYMMDD.mp4",
      purpose: "Open Hair and map the full Hair menu before detailed hair captures.",
      startingScreen: "Create Player > Appearance",
      exactMenu: "Player > Appearance > Hair",
      firstOption: "Hair menu entry",
      finalOption: "Last visible Hair submenu item after any scrolling",
      completeCountRequired: true,
      rotations: "None for menu map",
      pauseDuration: "3 seconds on each visible Hair submenu or scroll continuation",
      canonicalPlayerSettings: "Keep canonical head and obstruction settings from XR-007.",
      eyeBlackRemoved: "Yes, if XR-007 succeeded",
      hairOrFacialHairChanged: "No during clip",
      rearViewRequired: false,
      expectedClipLength: "3-6 minutes",
      continuityOverlap: "Navigate from Head & Skin back to Appearance, then enter Hair.",
      completionCheckbox: "[ ] Full Hair submenu hierarchy, native order, locks, dependencies, and scroll continuation are visible.",
      relatedRecaptureIDs: ["RQ-012"]
    }),
    clip({
      order: 13,
      id: "XR-013",
      filename: "CF27_XBOX_HAIRSTYLES_COMPLETE_YYYYMMDD.mp4",
      purpose: "Capture every visible hairstyle option in native order.",
      startingScreen: "Appearance > Hair, on the hairstyle control if visible",
      exactMenu: "Player > Appearance > Hair > exact visible hairstyle control",
      firstOption: "First selected hairstyle value visible in the game",
      finalOption: "Final selected hairstyle value and boundary/wrap evidence",
      completeCountRequired: true,
      rotations: "MENU, FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q for each hairstyle where practical",
      pauseDuration: "3 seconds on label/index; 3-5 seconds on each stable angle",
      canonicalPlayerSettings: "Use the canonical head and hair color chosen for hairstyle review; record the native labels rather than assigning names.",
      eyeBlackRemoved: "Yes, if XR-007 succeeded",
      hairOrFacialHairChanged: "Yes, hairstyle changes are the subject of this clip.",
      rearViewRequired: true,
      expectedClipLength: "20-45 minutes, depending on count",
      continuityOverlap: "Begin from the hairstyle control identified in XR-012.",
      completionCheckbox: "[ ] Every deliberately selected hairstyle has menu evidence, required views, and boundary/wrap proof.",
      relatedRecaptureIDs: ["RQ-013", "RQ-019"]
    }),
    clip({
      order: 14,
      id: "XR-014",
      filename: "CF27_XBOX_HAIR_COLORS_COMPLETE_YYYYMMDD.mp4",
      purpose: "Capture every visible hair-color control value under constant conditions.",
      startingScreen: "Appearance > Hair, on the hair-color control if visible",
      exactMenu: "Player > Appearance > Hair > exact visible hair-color control",
      firstOption: "First selected hair-color value visible in the game",
      finalOption: "Final selected hair-color value and boundary/wrap evidence",
      completeCountRequired: true,
      rotations: "MENU and FRONT; add LEFT_3Q only if color visibility needs it",
      pauseDuration: "3 seconds on label/index; 5 seconds on stable representative face/hair frame",
      canonicalPlayerSettings: "Use one canonical hairstyle and head; keep lighting/framing constant.",
      eyeBlackRemoved: "Yes, if XR-007 succeeded",
      hairOrFacialHairChanged: "Yes, hair color changes are the subject of this clip.",
      rearViewRequired: false,
      expectedClipLength: "8-15 minutes, depending on count",
      continuityOverlap: "Start from the last confirmed Hair menu state in XR-013.",
      completionCheckbox: "[ ] Every selected hair-color value is visible, stable, and bounded without inferred labels.",
      relatedRecaptureIDs: ["RQ-014", "RQ-019"]
    }),
    clip({
      order: 15,
      id: "XR-015",
      filename: "CF27_XBOX_FACIAL_HAIR_COMPLETE_YYYYMMDD.mp4",
      purpose: "Capture the complete facial-hair option set, including None if present.",
      startingScreen: "Appearance > Hair or the exact visible facial-hair menu location",
      exactMenu: "Player > Appearance > Hair > exact visible facial-hair control, if present",
      firstOption: "None if present; otherwise first selected facial-hair value visible in the game",
      finalOption: "Final selected facial-hair value and boundary/wrap evidence",
      completeCountRequired: true,
      rotations: "MENU, FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_PROFILE, RIGHT_3Q for each value where practical",
      pauseDuration: "3 seconds on label/index; 3-5 seconds on each stable angle",
      canonicalPlayerSettings: "Use canonical head, hairstyle, and facial-hair color if available.",
      eyeBlackRemoved: "Yes, if XR-007 succeeded",
      hairOrFacialHairChanged: "Yes, facial-hair option changes are the subject of this clip.",
      rearViewRequired: false,
      expectedClipLength: "15-30 minutes, depending on count",
      continuityOverlap: "Start from Hair menu state after XR-014; record exact visible control path before selecting values.",
      completionCheckbox: "[ ] None and every selected facial-hair option are recorded with native order, evidence, and boundary/wrap proof.",
      relatedRecaptureIDs: ["RQ-015", "RQ-019"]
    }),
    clip({
      order: 16,
      id: "XR-016",
      filename: "CF27_XBOX_FACIAL_HAIR_COLORS_COMPLETE_YYYYMMDD.mp4",
      purpose: "Capture every facial-hair color value separately from hairstyle/hair-color controls.",
      startingScreen: "Appearance > Hair or exact visible facial-hair-color control",
      exactMenu: "Player > Appearance > Hair > exact visible facial-hair-color control, if present",
      firstOption: "First selected facial-hair-color value visible in the game",
      finalOption: "Final selected facial-hair-color value and boundary/wrap evidence",
      completeCountRequired: true,
      rotations: "MENU and FRONT; add LEFT_3Q if color visibility needs it",
      pauseDuration: "3 seconds on label/index; 5 seconds on stable representative face frame",
      canonicalPlayerSettings: "Use one canonical visible facial-hair option; keep hairstyle/head constant.",
      eyeBlackRemoved: "Yes, if XR-007 succeeded",
      hairOrFacialHairChanged: "Yes, facial-hair color changes are the subject of this clip.",
      rearViewRequired: false,
      expectedClipLength: "8-15 minutes, depending on count",
      continuityOverlap: "Start from the facial-hair control area in XR-015.",
      completionCheckbox: "[ ] Facial-hair colors are recorded as their own control, or visibly proven unavailable.",
      relatedRecaptureIDs: ["RQ-016", "RQ-019"]
    }),
    clip({
      order: 17,
      id: "XR-017",
      filename: "CF27_XBOX_SELECTOR_WRAP_AND_DEPENDENCY_CHECKS_YYYYMMDD.mp4",
      purpose: "Close tomorrow's run with targeted boundary and dependency checks after the main catalog work.",
      startingScreen: "Create Player with current canonical player still loaded",
      exactMenu:
        "Player, Appearance, Head & Skin, and Hair controls touched in this run; change only one variable at a time for dependency checks",
      firstOption: "Baseline canonical state from XR-007",
      finalOption: "Last dependency or wrap test completed",
      completeCountRequired: false,
      rotations: "Only as needed to prove count/order/visual dependency changes",
      pauseDuration: "5 seconds before and after each changed variable",
      canonicalPlayerSettings:
        "Return to baseline after each dependency test when possible; record platform, mode, position, archetype, height, weight, body type, online state, EA account state, edition, entitlements, and patch context only when visible.",
      eyeBlackRemoved: "Keep the XR-007 state unless testing eye-black dependency.",
      hairOrFacialHairChanged: "Only one variable at a time for explicit dependency testing.",
      rearViewRequired: false,
      expectedClipLength: "15-30 minutes",
      continuityOverlap: "Start by showing the final canonical state after XR-016.",
      completionCheckbox: "[ ] Selector wrap and dependency checks are recorded as observations, with uncertainties queued rather than guessed.",
      relatedRecaptureIDs: ["RQ-019", "RQ-020", "RQ-021", "RQ-022", "RQ-023", "RQ-024"]
    })
  ];
}

function clip({
  order,
  id,
  filename,
  purpose,
  startingScreen,
  exactMenu,
  firstOption,
  finalOption,
  completeCountRequired,
  rotations,
  pauseDuration,
  canonicalPlayerSettings,
  eyeBlackRemoved,
  hairOrFacialHairChanged,
  rearViewRequired,
  expectedClipLength,
  continuityOverlap,
  completionCheckbox,
  relatedRecaptureIDs
}) {
  return {
    order,
    clipID: id,
    recommendedFilename: filename,
    purpose,
    startingScreen,
    exactMenu,
    firstOption,
    finalOption,
    completeCountRequired,
    requiredCameraRotations: rotations,
    pauseDuration,
    canonicalPlayerSettings,
    eyeBlackMustBeRemoved: eyeBlackRemoved,
    hairOrFacialHairMustBeChanged: hairOrFacialHairChanged,
    rearViewRequired,
    expectedClipLength,
    continuityOverlapWithPriorClip: continuityOverlap,
    completionCheckbox,
    relatedRecaptureIDs,
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED"
  };
}

function summarizeClips(clips, context) {
  return {
    clipCount: clips.length,
    completeCountRequiredClipCount: clips.filter((clipItem) => clipItem.completeCountRequired).length,
    rearViewRequiredClipCount: clips.filter((clipItem) => clipItem.rearViewRequired).length,
    eyeBlackRemovalRequiredOrConditionalClipCount: clips.filter((clipItem) => clipItem.eyeBlackMustBeRemoved !== "No").length,
    currentHeadCandidates: context.summary.currentHeadCandidates,
    currentResearchRecords: context.summary.currentResearchRecords,
    productionRecordsCreated: context.summary.productionRecordsCreated,
    productionRecommendationsEnabled: false
  };
}

function renderRunbookMarkdown(runbook) {
  const lines = [
    "# Tomorrow's Xbox Recording Runbook",
    "",
    `**${runbook.reportLabel}**`,
    "",
    "Use this beside the Xbox. It is ordered to avoid repeated navigation: console environment first, Road to Glory setup/body controls, Appearance/Head & Skin, Head Template completion and standardized capture, Hair/facial-hair work, then wrap/dependency checks.",
    "",
    "## Quick Rules",
    "",
    ...runbook.rules.map((rule) => `- ${rule}`),
    "",
    "## Pre-Flight",
    "",
    ...runbook.preFlight.map((item) => `- ${item}`),
    "",
    "## Summary",
    "",
    `- Planned clips: ${runbook.summary.clipCount}`,
    `- Complete-count clips: ${runbook.summary.completeCountRequiredClipCount}`,
    `- Clips requiring rear views: ${runbook.summary.rearViewRequiredClipCount}`,
    `- Current head candidates already captured as research evidence: ${runbook.summary.currentHeadCandidates}`,
    `- Production recommendations enabled: ${runbook.summary.productionRecommendationsEnabled}`,
    "",
    "## Recording Plan",
    ""
  ];

  for (const clipItem of runbook.clips) {
    lines.push(`### ${clipItem.order}. ${clipItem.clipID} - ${clipItem.recommendedFilename}`);
    lines.push("");
    lines.push(`- Purpose: ${clipItem.purpose}`);
    lines.push(`- Starting screen: ${clipItem.startingScreen}`);
    lines.push(`- Exact menu: ${clipItem.exactMenu}`);
    lines.push(`- First option: ${clipItem.firstOption}`);
    lines.push(`- Final option: ${clipItem.finalOption}`);
    lines.push(`- Complete count required: ${clipItem.completeCountRequired ? "Yes" : "No"}`);
    lines.push(`- Required camera rotations: ${clipItem.requiredCameraRotations}`);
    lines.push(`- Pause duration: ${clipItem.pauseDuration}`);
    lines.push(`- Canonical player settings: ${clipItem.canonicalPlayerSettings}`);
    lines.push(`- Eye black must be removed: ${clipItem.eyeBlackMustBeRemoved}`);
    lines.push(`- Hair or facial hair must be changed: ${clipItem.hairOrFacialHairMustBeChanged}`);
    lines.push(`- Rear view required: ${clipItem.rearViewRequired ? "Yes" : "No"}`);
    lines.push(`- Expected clip length: ${clipItem.expectedClipLength}`);
    lines.push(`- Continuity overlap with prior clip: ${clipItem.continuityOverlapWithPriorClip}`);
    lines.push(`- Related recapture queue items: ${clipItem.relatedRecaptureIDs.join(", ")}`);
    lines.push(`- Completion: ${clipItem.completionCheckbox}`);
    lines.push("");
  }

  lines.push("## Stop Conditions");
  lines.push("");
  lines.push("- Stop and create an issue if a menu path differs from current evidence.");
  lines.push("- Stop before recording account secrets, payment details, serial numbers, or private messages.");
  lines.push("- Stop using production terminology: these clips are primary research evidence until second-person verification and catalog publication gates pass.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function serializeClipCSV(runbook) {
  const headers = [
    "order",
    "clipID",
    "recommendedFilename",
    "startingScreen",
    "exactMenu",
    "firstOption",
    "finalOption",
    "completeCountRequired",
    "requiredCameraRotations",
    "pauseDuration",
    "canonicalPlayerSettings",
    "eyeBlackMustBeRemoved",
    "hairOrFacialHairMustBeChanged",
    "rearViewRequired",
    "expectedClipLength",
    "continuityOverlapWithPriorClip",
    "completionCheckbox",
    "relatedRecaptureIDs",
    "productionStatus",
    "verificationStatus"
  ];
  const rows = runbook.clips.map((clipItem) =>
    headers.map((header) => csvEscape(Array.isArray(clipItem[header]) ? clipItem[header].join("|") : clipItem[header])).join(",")
  );
  return `${headers.join(",")}\n${rows.join("\n")}\n`;
}

function readJsonIfExists(root, relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(root) || !fs.existsSync(absolutePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function assertResearchOutputPath(relativePath, label) {
  if (!relativePath.startsWith("data/research/cf27/")) {
    throw new Error(`${label} must stay under data/research/cf27/`);
  }
}

function assertDocsCatalogPath(relativePath, label) {
  if (!relativePath.startsWith("docs/catalog/")) {
    throw new Error(`${label} must stay under docs/catalog/`);
  }
}

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function printHelp() {
  console.log(`Usage: node scripts/cf27-tomorrows-xbox-recording-runbook.mjs [generate]\n\nOptions:\n  --output-directory <path>  Defaults to ${defaultOutputDirectory}\n  --docs-path <path>         Defaults to ${defaultDocsPath}`);
}
