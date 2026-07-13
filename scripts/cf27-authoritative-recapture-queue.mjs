#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CF27_AUTHORITATIVE_RECAPTURE_QUEUE_VERSION = "cf27-authoritative-recapture-queue-v1";
export const authoritativeRecaptureQueueLabel = "AUTHORITATIVE CURRENT RECAPTURE QUEUE - PRIMARY RESEARCH ONLY - NOT PRODUCTION VERIFIED";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputDirectory = "data/research/cf27/reports/authoritative-recapture-queue";
const defaultDocsPath = "docs/catalog/AUTHORITATIVE_CURRENT_RECAPTURE_QUEUE.md";

const sourcePaths = {
  partialManifest: "data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json",
  partialRecaptureQueue: "data/research/cf27/exports/partial-research-catalog-current/recapture_queue.csv",
  partialIssues: "data/research/cf27/exports/partial-research-catalog-current/issues_and_exceptions.csv",
  headStandardizationQA: "data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json",
  headRecaptureQueue: "data/research/cf27/reports/head-template-standardization-qa/head_template_recapture_queue.csv",
  sequenceReviewQueue: "data/research/cf27/reports/native-sequence-integrity/native_sequence_human_review_queue.json",
  ocrReviewQueue: "data/research/cf27/reports/ocr-native-label-review/manual_label_review_queue.json",
  videoInventory: "data/research/cf27/video_inventory.json",
  timelineIndex: "data/research/cf27/video_timeline_index.json"
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? "generate";
  if (["--help", "-h", "help"].includes(command)) {
    printHelp();
  } else if (command === "generate") {
    const queue = buildAuthoritativeRecaptureQueue({
      root: repositoryRoot,
      generatedAt: new Date().toISOString()
    });
    const output = writeAuthoritativeRecaptureQueueOutputs(queue, {
      root: repositoryRoot,
      outputDirectory: cliValue("--output-directory") ?? defaultOutputDirectory,
      docsPath: cliValue("--docs-path") ?? defaultDocsPath
    });
    console.log(JSON.stringify({ ok: true, summary: queue.summary, files: output.files }, null, 2));
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
  }
}

export function buildAuthoritativeRecaptureQueue({ root = repositoryRoot, generatedAt = new Date().toISOString() } = {}) {
  const context = loadQueueContext(root);
  const items = createQueueItems(context);
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const sortedItems = items
    .map((item, index) => ({ ...item, nativeSort: index + 1 }))
    .sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority] || left.nativeSort - right.nativeSort);

  return {
    schemaVersion: CF27_AUTHORITATIVE_RECAPTURE_QUEUE_VERSION,
    reportLabel: authoritativeRecaptureQueueLabel,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    sourceType: "researchCandidate",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "RECAPTURE_REQUIRED_NOT_SECOND_VERIFIED",
    productionRecommendationsEnabled: false,
    policy: {
      noInventedOptions: "The queue records what to capture next. It does not create, verify, or infer College Football 27 options.",
      evidenceUsePolicy: "Existing recordings remain useful for the exact evidence roles listed on each queue item.",
      productionGatePolicy: "Completing this queue still does not mark records production verified; second-person verification and publication gates remain required.",
      sourceSeparation: "This queue lives under data/research/cf27 and docs/catalog, not production catalog data."
    },
    sourceInputs: sourcePaths,
    sourceContext: context.summary,
    summary: summarizeItems(sortedItems, context),
    items: sortedItems
  };
}

export function writeAuthoritativeRecaptureQueueOutputs(queue, { root = repositoryRoot, outputDirectory = defaultOutputDirectory, docsPath = defaultDocsPath } = {}) {
  assertResearchOutputPath(outputDirectory, "outputDirectory");
  assertDocsCatalogPath(docsPath, "docsPath");
  const absoluteOutputDirectory = path.resolve(root, outputDirectory);
  fs.mkdirSync(absoluteOutputDirectory, { recursive: true });
  const jsonPath = path.join(absoluteOutputDirectory, "authoritative_recapture_queue.json");
  const csvPath = path.join(absoluteOutputDirectory, "authoritative_recapture_queue.csv");
  const markdownPath = path.join(absoluteOutputDirectory, "AUTHORITATIVE_RECAPTURE_QUEUE.md");
  const absoluteDocsPath = path.resolve(root, docsPath);
  fs.mkdirSync(path.dirname(absoluteDocsPath), { recursive: true });
  const markdown = renderQueueMarkdown(queue);
  fs.writeFileSync(jsonPath, `${JSON.stringify(queue, null, 2)}\n`);
  fs.writeFileSync(csvPath, serializeQueueCSV(queue));
  fs.writeFileSync(markdownPath, markdown);
  fs.writeFileSync(absoluteDocsPath, markdown);
  return {
    files: [jsonPath, csvPath, markdownPath, absoluteDocsPath].map((filePath) => path.relative(root, filePath))
  };
}

function loadQueueContext(root) {
  const partialManifest = readJsonIfExists(root, sourcePaths.partialManifest);
  const headQA = readJsonIfExists(root, sourcePaths.headStandardizationQA);
  const sequenceQueue = readJsonIfExists(root, sourcePaths.sequenceReviewQueue);
  const ocrQueue = readJsonIfExists(root, sourcePaths.ocrReviewQueue);
  const videoInventory = readJsonIfExists(root, sourcePaths.videoInventory);
  const partialRecaptureCount = countCSVRows(root, sourcePaths.partialRecaptureQueue);
  const partialIssueCount = countCSVRows(root, sourcePaths.partialIssues);
  const headRecaptureCount = countCSVRows(root, sourcePaths.headRecaptureQueue);
  const sequenceReviewCount = sequenceQueue?.humanReviewQueue?.length ?? 0;
  const ocrReviewCount = ocrQueue?.manualReviewQueue?.length ?? 0;
  return {
    partialManifest,
    headQA,
    sequenceQueue,
    ocrQueue,
    videoInventory,
    summary: {
      currentResearchRecordCounts: partialManifest?.counts ?? {},
      currentRecaptureRows: partialRecaptureCount,
      currentIssueRows: partialIssueCount,
      headRecaptureRows: headRecaptureCount,
      sequenceReviewSuggestions: sequenceReviewCount,
      ocrManualReviewItems: ocrReviewCount,
      acceptedOrPartialVideoCount:
        (videoInventory?.summary?.acceptedResearchCandidates ?? 0) + (videoInventory?.summary?.partiallyAcceptedResearchCandidates ?? 0),
      intentionalFace12OverlapConfirmed: Boolean(videoInventory?.summary?.intentionalFace12OverlapConfirmed),
      productionRecordsCreated: partialManifest?.counts?.productionRecordsCreated ?? 0
    }
  };
}

function createQueueItems(context) {
  const currentCounts = context.summary.currentResearchRecordCounts;
  const headCount = currentCounts.heads ?? 29;
  const oneHeadRunRepairs = Boolean(context.headQA?.summary?.oneStandardizedRecaptureRunCanRepairCurrentImageLimitations);
  const baseSourceReferences = [
    sourcePaths.partialRecaptureQueue,
    sourcePaths.partialIssues,
    sourcePaths.headStandardizationQA,
    sourcePaths.headRecaptureQueue
  ];
  return [
    item({
      id: "RQ-001",
      priority: "P0",
      group: "Environment",
      title: "Record exact Xbox console model and console OS",
      ownerRecordingInstructions:
        "Open Xbox Settings > System > Console info and record the exact console model name, serial-sensitive fields excluded, console OS version, and system update status. Include a continuous screen recording from the settings navigation into the visible console-info screen.",
      requiredEvidence: ["Console info screen", "System update status screen"],
      acceptanceCriteria: ["Console model is visible", "Console OS version is visible", "Update status is visible", "No account secrets or serial numbers are transcribed into catalog data"],
      existingEvidenceUsefulness:
        "Existing gameplay recordings remain useful for Road to Glory navigation, selected menu labels, and current research-candidate provenance, but they do not prove exact Xbox model or console OS.",
      sourceReferences: [sourcePaths.partialIssues, sourcePaths.videoInventory],
      blocksProduction: true
    }),
    item({
      id: "RQ-002",
      priority: "P0",
      group: "Environment",
      title: "Record game executable version and installed patch/update screen",
      ownerRecordingInstructions:
        "Record the game title screen and any visible in-game version/build display, then record Xbox manage-game/update screens showing installed version, latest update state, and update date if visible. Do not infer patch from upload date.",
      requiredEvidence: ["Game title/version screen", "Installed game version screen", "Update/latest-version screen"],
      acceptanceCriteria: ["Game executable version or explicit UNKNOWN is recorded from evidence", "Patch/update state is visible", "Capture date is recorded"],
      existingEvidenceUsefulness:
        "Existing videos remain useful for observed menus and options, but they cannot become production records until the executable version and patch context are tied to the audit environment.",
      sourceReferences: [sourcePaths.partialIssues, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-003",
      priority: "P0",
      group: "Environment",
      title: "Record edition, entitlement, copy type, storefront, online, and EA account state",
      ownerRecordingInstructions:
        "Record only non-secret account/entitlement context: game edition as shown by the console/store/manage-game UI, installed add-ons or entitlements relevant to player creation, copy type, storefront/region, online/offline state, and EA account signed-in state if visible without exposing credentials.",
      requiredEvidence: ["Manage game add-ons/edition screen", "Storefront or ownership screen where safe", "Network or online-state evidence where safe"],
      acceptanceCriteria: ["Edition is visible or marked UNKNOWN from evidence", "Entitlements/add-ons are visible or marked none/UNKNOWN", "No credentials, emails, payment data, or recovery data are recorded"],
      existingEvidenceUsefulness:
        "Existing menu recordings remain useful for current Road to Glory observations, but they do not prove whether edition or entitlement state changes available appearance options.",
      sourceReferences: [sourcePaths.partialIssues],
      blocksProduction: true
    }),
    item({
      id: "RQ-004",
      priority: "P0",
      group: "Head Templates",
      title: "Capture Remaining Head Templates after Face 29 and prove category boundary",
      ownerRecordingInstructions:
        "Starting from Face 29 in Head Template, continue advancing in native order until the selector visibly reaches the last option and either wraps to the first option or otherwise proves the end boundary. Keep the visible selected label/index on screen for every deliberate selection.",
      requiredEvidence: ["Menu evidence for every selected option after Face 29", "End-of-category or wrap evidence", "Timestamped continuous recording"],
      acceptanceCriteria: ["No option after Face 29 is created unless deliberately selected", "Final count is proven by boundary/wrap evidence", "Native order is preserved"],
      existingEvidenceUsefulness:
        `Existing Face 1-${headCount} recordings remain useful for selected label/order evidence, extracted derivatives, Face 12 overlap provenance, and sequence-review cues. They do not prove the complete Head Template count.`,
      sourceReferences: [sourcePaths.partialManifest, sourcePaths.sequenceReviewQueue, sourcePaths.videoInventory],
      blocksProduction: true
    }),
    item({
      id: "RQ-005",
      priority: "P0",
      group: "Head Templates",
      title: "Perform a second full Head Template count",
      ownerRecordingInstructions:
        "Run a second pass through the complete Head Template selector from the first option to the proven final option. Record selected labels/indices in native order without skipping, and call out any grid traversal or jump intentionally.",
      requiredEvidence: ["Continuous second count recording", "First option evidence", "Final/wrap evidence", "Researcher count notes"],
      acceptanceCriteria: ["Second count agrees or discrepancy is opened", "Selector jumps are documented", "Face 12 overlap is preserved as overlap evidence, not duplicate identity"],
      existingEvidenceUsefulness:
        "Existing Face 1-29 footage remains useful as the primary-observation pass and as a comparison source for the second count.",
      sourceReferences: [sourcePaths.sequenceReviewQueue, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-006",
      priority: "P0",
      group: "Head Templates",
      title: "Standardized head capture pass without eye black",
      ownerRecordingInstructions:
        "After confirming the canonical capture configuration, record every Head Template with eye black disabled or absent if the game allows. Capture menu evidence plus front, left three-quarter, left profile, rear, right profile, and right three-quarter views for each selected head.",
      requiredEvidence: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"],
      optionalEvidence: ["ELEVATED", "LOWERED"],
      acceptanceCriteria: ["Eye black is absent or explicitly unavoidable", "Zoom/framing is consistent", "Native order is preserved", "Every current and newly discovered head has the standard view set"],
      existingEvidenceUsefulness:
        oneHeadRunRepairs
          ? "Existing Face 1-29 recordings remain valid identity/order/menu evidence. Current QA says one standardized recapture run can repair recurring image-comparison limitations, but not category completeness, environment gaps, or second verification."
          : "Existing Face 1-29 recordings remain valid identity/order/menu evidence, but standardized visual evidence is still required.",
      sourceReferences: [sourcePaths.headStandardizationQA, sourcePaths.headRecaptureQueue],
      blocksProduction: true
    }),
    item({
      id: "RQ-007",
      priority: "P0",
      group: "Head Templates",
      title: "Lock controlled short hairstyle and facial hair set to None where possible for head comparison",
      ownerRecordingInstructions:
        "Before the standardized head pass, identify whether hair and facial-hair controls can be held constant while changing Head Template. If possible, set a controlled short/non-obstructing hairstyle and facial hair None, then record proof of those settings before the pass.",
      requiredEvidence: ["Hair/facial-hair settings before head pass", "Evidence that settings remain unchanged after several head changes", "Note if head templates force hair or facial hair"],
      acceptanceCriteria: ["Canonical hair state is recorded", "Canonical facial-hair state is recorded", "Any forced changes are documented as dependencies, not inferred options"],
      existingEvidenceUsefulness:
        "Existing head footage remains useful for native Head Template labels and order, but visible hair, facial hair, and eye black currently limit geometry comparison.",
      sourceReferences: [sourcePaths.headStandardizationQA, sourcePaths.partialRecaptureQueue],
      blocksProduction: true
    }),
    item({
      id: "RQ-008",
      priority: "P0",
      group: "Capture protocol",
      title: "Record missing true front and profile views under a locked capture protocol",
      ownerRecordingInstructions:
        "For each category being captured, pause on stable character views and record true front, left profile, and right profile views where the UI allows. Avoid transition frames, loading animation, cursor/notification overlays, and inconsistent zoom.",
      requiredEvidence: ["True front stable frame", "Left profile stable frame", "Right profile stable frame", "View-angle notes"],
      acceptanceCriteria: ["Angle labels are supported by visible rotation state", "Profile views are not approximated from three-quarter views", "Missing views are explicitly marked unavailable if the UI cannot show them"],
      existingEvidenceUsefulness:
        "Existing extracted frames remain useful as derivatives and review aids, but some are best-available approximations rather than production-ready true front/profile evidence.",
      sourceReferences: [sourcePaths.headStandardizationQA, sourcePaths.partialRecaptureQueue],
      blocksProduction: true
    }),
    item({
      id: "RQ-009",
      priority: "P1",
      group: "Uncaptured face menus",
      title: "Record Mouth Shape menu",
      ownerRecordingInstructions:
        "Navigate to Appearance > Head & Skin > Mouth Shape if present. Record the category entry, every deliberately selected native label/index in order, representative character view, and selector boundary/wrap evidence.",
      requiredEvidence: ["Category entry", "Every selected Mouth Shape value", "Boundary or wrap evidence", "Stable face frame per value where available"],
      acceptanceCriteria: ["Native labels/indices are readable or queued for manual label review", "Count is not claimed without boundary evidence", "No values are inferred from thumbnails"],
      existingEvidenceUsefulness:
        "Existing appearance hierarchy evidence suggests Mouth Shape is part of the observed hierarchy, but no complete own-category recording is available for production use.",
      sourceReferences: [sourcePaths.timelineIndex, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-010",
      priority: "P1",
      group: "Uncaptured face menus",
      title: "Record Jaw Shape menu",
      ownerRecordingInstructions:
        "Navigate to Jaw Shape if present and record each deliberately selected value in native order with front and profile/three-quarter character evidence where available. Prove selector boundary or wrap.",
      requiredEvidence: ["Category entry", "Every selected Jaw Shape value", "Front and side/three-quarter evidence", "Boundary or wrap evidence"],
      acceptanceCriteria: ["Native order is preserved", "Geometry-changing status is recorded as observation, not production fact until reviewed", "Count is proven"],
      existingEvidenceUsefulness:
        "Existing hierarchy evidence supports that Jaw Shape appears in the current menu area, but option values are not cataloged yet.",
      sourceReferences: [sourcePaths.timelineIndex, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-011",
      priority: "P1",
      group: "Uncaptured face menus",
      title: "Complete Chin menu capture",
      ownerRecordingInstructions:
        "Navigate to Chin if present and record every selected native value in order, with front and profile/three-quarter evidence where available. Capture first, middle, final, and wrap/boundary evidence.",
      requiredEvidence: ["Category entry", "Every selected Chin value", "Front and side/three-quarter evidence", "Boundary or wrap evidence"],
      acceptanceCriteria: ["No Chin values are inferred from neighboring thumbnails", "Native labels/indices are readable or sent to manual review", "Count is proven"],
      existingEvidenceUsefulness:
        "Existing hierarchy evidence suggests Chin is visible, but the category values still need direct selected evidence.",
      sourceReferences: [sourcePaths.timelineIndex, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-012",
      priority: "P1",
      group: "Hair",
      title: "Open and map the complete Hair menu",
      ownerRecordingInstructions:
        "From Appearance, enter Hair and record the full submenu hierarchy before selecting options. Capture all visible categories, native order, control type, whether later editable, and dependencies or locks.",
      requiredEvidence: ["Hair menu entry", "Full submenu list", "Scroll continuation if any", "Control type evidence"],
      acceptanceCriteria: ["Hair controls are discovered from direct menu evidence", "No category is pre-populated as confirmed", "Locked/unavailable controls are documented"],
      existingEvidenceUsefulness:
        "Existing Road to Glory path footage shows Hair as a visible menu item but does not open it; it remains useful only as path evidence.",
      sourceReferences: [sourcePaths.partialIssues, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-013",
      priority: "P1",
      group: "Hair",
      title: "Capture complete Hairstyles catalog",
      ownerRecordingInstructions:
        "Within Hair, record every hairstyle deliberately selected in native order using the canonical head and canonical hair color. Capture menu evidence, front, left three-quarter, left profile, rear, right profile, and right three-quarter views where available.",
      requiredEvidence: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"],
      acceptanceCriteria: ["Native order and count are proven", "Canonical head and hair color are visible/recorded", "Dependencies or unlocks are recorded"],
      existingEvidenceUsefulness:
        "Existing videos do not provide a complete Hair menu or hairstyle catalog. Existing head footage may help choose a non-obstructing canonical head after review.",
      sourceReferences: [sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-014",
      priority: "P1",
      group: "Hair",
      title: "Capture Hair Colors",
      ownerRecordingInstructions:
        "Record every hair-color control value in native order with the canonical hairstyle and head. Capture menu evidence and a stable representative character frame for each value.",
      requiredEvidence: ["Every selected Hair Color value", "Representative character frame", "Boundary or wrap evidence"],
      acceptanceCriteria: ["Native labels/indices are preserved", "Lighting/capture conditions are constant", "Color observations are objective metadata only"],
      existingEvidenceUsefulness:
        "Existing current videos do not prove hair-color values. They remain useful for path and non-hair categories only.",
      sourceReferences: [sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-015",
      priority: "P1",
      group: "Facial hair",
      title: "Capture complete Facial Hair menu, including None",
      ownerRecordingInstructions:
        "Navigate to facial-hair controls if present. Record None and every other deliberately selected option in native order using canonical head, hairstyle, and facial-hair color. Capture required angle views and menu evidence.",
      requiredEvidence: ["None option evidence if present", "Every selected Facial Hair value", "Front and side/three-quarter evidence", "Boundary or wrap evidence"],
      acceptanceCriteria: ["Native order and count are proven", "Coverage metadata stays researcher-applied and separate from native labels", "Dependencies are recorded"],
      existingEvidenceUsefulness:
        "Existing head footage cannot be treated as facial-hair catalog evidence because facial-hair controls were not independently locked or audited.",
      sourceReferences: [sourcePaths.headStandardizationQA, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-016",
      priority: "P1",
      group: "Facial hair",
      title: "Capture Facial Hair Colors",
      ownerRecordingInstructions:
        "Record every facial-hair color control value in native order using a canonical visible facial-hair option. Capture menu label/index evidence and stable face frames under constant lighting.",
      requiredEvidence: ["Every selected Facial Hair Color value", "Representative character frame", "Boundary or wrap evidence"],
      acceptanceCriteria: ["Values are not inferred from hair color controls", "Color observations are objective metadata only", "Dependencies with facial-hair style are recorded"],
      existingEvidenceUsefulness:
        "Existing videos do not prove facial-hair color values. They remain useful for non-facial-hair research only.",
      sourceReferences: [sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-017",
      priority: "P1",
      group: "Body and physique",
      title: "Record Physique controls",
      ownerRecordingInstructions:
        "In the Road to Glory creation path, record every physique/body-shape control that affects player appearance. Preserve exact native labels, indices, ranges, default values, and dependencies.",
      requiredEvidence: ["Physique menu entry", "Every control value or range boundary", "Default/reset evidence", "Representative character frames where useful"],
      acceptanceCriteria: ["Controls are categorized as geometry, texture, color, or presentation-only effects", "No slider range is guessed", "Position/archetype dependencies are noted"],
      existingEvidenceUsefulness:
        "Existing path footage proves the route into player creation but does not audit physique controls.",
      sourceReferences: [sourcePaths.partialManifest],
      blocksProduction: false
    }),
    item({
      id: "RQ-018",
      priority: "P1",
      group: "Body and physique",
      title: "Record Height, Weight, and Body Type controls",
      ownerRecordingInstructions:
        "Record height, weight, and body type controls from the selected Road to Glory creation path. Capture min, max, step, default, restrictions, and whether values affect available appearance options.",
      requiredEvidence: ["Height min/max/default", "Weight min/max/default", "Body Type values or range", "Restriction/dependency evidence"],
      acceptanceCriteria: ["No ranges are inferred", "Position and archetype used during capture are recorded", "Dependency checks are queued if values change appearance menus"],
      existingEvidenceUsefulness:
        "Existing path evidence records QB/Create Player context but does not prove height, weight, or body type ranges.",
      sourceReferences: [sourcePaths.partialManifest],
      blocksProduction: false
    }),
    item({
      id: "RQ-019",
      priority: "P1",
      group: "Selector validation",
      title: "Run selector wrap and boundary tests for every captured category",
      ownerRecordingInstructions:
        "For Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, and future categories, record first value, final value, and wrap/no-wrap behavior. Include deliberate navigation steps and avoid relying on thumbnail visibility.",
      requiredEvidence: ["First value", "Final value", "Wrap or boundary behavior", "Navigation notes"],
      acceptanceCriteria: ["Complete counts are only claimed when boundary/wrap is proven", "Repeated selections and jumps are documented", "Native order remains intact"],
      existingEvidenceUsefulness:
        "Existing recordings provide many selected values and sequence-review suggestions, but several categories still need explicit boundary or wrap proof before production.",
      sourceReferences: [sourcePaths.sequenceReviewQueue, sourcePaths.partialRecaptureQueue],
      blocksProduction: true
    }),
    item({
      id: "RQ-020",
      priority: "P1",
      group: "Dependency checks",
      title: "Run dependency checks across platform, mode, position, archetype, height, weight, body type, online state, EA account state, edition, entitlements, and patch",
      ownerRecordingInstructions:
        "Use the dependency-test runner matrix: record a baseline, change one variable at a time, capture expected versus observed behavior, and document count/order/label/geometry changes with evidence.",
      requiredEvidence: ["Baseline recording", "Changed-variable recording", "Observed count/order/label changes", "Remaining uncertainty notes"],
      acceptanceCriteria: ["Each run changes only one variable where practical", "No dependency is promoted from assumption", "Unresolved dependencies create issues or recapture requests"],
      existingEvidenceUsefulness:
        "Existing current videos provide a single research environment and path baseline, but they do not prove whether other states change catalog availability.",
      sourceReferences: [sourcePaths.partialIssues, sourcePaths.partialManifest],
      blocksProduction: true
    }),
    item({
      id: "RQ-021",
      priority: "P2",
      group: "Manual text review",
      title: "Review OCR/manual-label queue for readable native labels",
      ownerRecordingInstructions:
        "For Skin Details, Eye Shape, Eye Color, Nose, and Ear Shape labels already extracted into the OCR review queue, visually inspect the original frame and targeted crop before confirming or correcting each native label.",
      requiredEvidence: ["Original menu frame", "Targeted label crop", "Reviewer confirmation"],
      acceptanceCriteria: ["OCR output is not accepted without visual confirmation", "Low-confidence labels remain queued", "Native labels are preserved exactly as shown"],
      existingEvidenceUsefulness:
        "Existing extracted menu frames and crops remain useful for manual label confirmation; they are not production-verified without review.",
      sourceReferences: [sourcePaths.ocrReviewQueue],
      blocksProduction: true
    }),
    item({
      id: "RQ-022",
      priority: "P2",
      group: "Current captured categories",
      title: "Recapture Nose category with standardized profile evidence",
      ownerRecordingInstructions:
        "Repeat Nose options under the canonical capture configuration, preserving native order and capturing menu evidence, front, best three-quarter, and true profile views when available.",
      requiredEvidence: ["MENU", "FRONT", "LEFT_3Q or RIGHT_3Q", "LEFT_PROFILE or RIGHT_PROFILE", "Boundary or wrap evidence"],
      acceptanceCriteria: ["Profile view availability is proven or explicitly unavailable", "Current labels are confirmed by direct selected evidence", "No subjective trait labels are added"],
      existingEvidenceUsefulness:
        "Existing Nose footage remains useful for selected labels/order and current research candidates, but current frames are not standardized production comparison captures.",
      sourceReferences: [sourcePaths.partialRecaptureQueue],
      blocksProduction: true
    }),
    item({
      id: "RQ-023",
      priority: "P2",
      group: "Current captured categories",
      title: "Recapture Ear Shape with unobstructed side evidence where possible",
      ownerRecordingInstructions:
        "Repeat Ear Shape options with a hairstyle that exposes ears if the game allows. Capture menu evidence and side/three-quarter evidence sufficient to determine left/right ear visibility.",
      requiredEvidence: ["MENU", "Left or right side evidence", "Hair obstruction state", "Boundary or wrap evidence"],
      acceptanceCriteria: ["Do not claim both ears evaluated unless both are visible", "Hair obstruction is recorded", "Selector completeness is proven"],
      existingEvidenceUsefulness:
        "Existing Ear Shape footage remains useful for selected labels/order, but hair obstruction and one-sided visibility limit production comparison.",
      sourceReferences: [sourcePaths.partialRecaptureQueue],
      blocksProduction: true
    }),
    item({
      id: "RQ-024",
      priority: "P2",
      group: "Current captured categories",
      title: "Confirm Skin Tone, Skin Details, Eye Shape, and Eye Color boundaries and representative frames",
      ownerRecordingInstructions:
        "For each currently captured category, record deliberate first-to-final selection evidence, wrap/no-wrap behavior, and stable representative frames under consistent lighting. Keep native labels/indices separate from researcher metadata.",
      requiredEvidence: ["First value evidence", "Final value evidence", "Wrap/no-wrap evidence", "Representative frames"],
      acceptanceCriteria: ["Counts are proven by boundary evidence", "Manual-label queue items are resolved", "Color/texture observations remain objective metadata"],
      existingEvidenceUsefulness:
        "Existing recordings provide primary research candidates for Skin Tone, Skin Details, Eye Shape, and Eye Color, but production use still requires boundary confirmation, label review, and second verification.",
      sourceReferences: [sourcePaths.partialManifest, sourcePaths.ocrReviewQueue, sourcePaths.sequenceReviewQueue],
      blocksProduction: true
    })
  ];
}

function item(input) {
  return {
    queueID: input.id,
    priority: input.priority,
    group: input.group,
    title: input.title,
    ownerRecordingInstructions: input.ownerRecordingInstructions,
    requiredEvidence: input.requiredEvidence ?? [],
    optionalEvidence: input.optionalEvidence ?? [],
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    existingEvidenceRemainsUseful: true,
    existingEvidenceUsefulness: input.existingEvidenceUsefulness,
    sourceReferences: input.sourceReferences ?? [],
    blocksProduction: Boolean(input.blocksProduction),
    status: "open",
    dataClass: "PRIMARY_RESEARCH_CANDIDATE",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_VERIFIED"
  };
}

function summarizeItems(items, context) {
  const priorityCounts = Object.fromEntries(["P0", "P1", "P2", "P3"].map((priority) => [priority, items.filter((item) => item.priority === priority).length]));
  return {
    queueItemCount: items.length,
    priorityCounts,
    productionBlockingCount: items.filter((item) => item.blocksProduction).length,
    existingEvidenceUsefulCount: items.filter((item) => item.existingEvidenceRemainsUseful).length,
    sourceRecaptureRowsConsolidated: context.summary.currentRecaptureRows,
    sourceIssueRowsConsolidated: context.summary.currentIssueRows,
    headStandardizationRecaptureRowsConsolidated: context.summary.headRecaptureRows,
    sequenceReviewSuggestionsReferenced: context.summary.sequenceReviewSuggestions,
    ocrManualReviewItemsReferenced: context.summary.ocrManualReviewItems,
    productionRecommendationsEnabled: false
  };
}

function serializeQueueCSV(queue) {
  const header = [
    "queueID",
    "priority",
    "group",
    "title",
    "ownerRecordingInstructions",
    "requiredEvidence",
    "optionalEvidence",
    "acceptanceCriteria",
    "existingEvidenceRemainsUseful",
    "existingEvidenceUsefulness",
    "sourceReferences",
    "blocksProduction",
    "status"
  ];
  const rows = queue.items.map((item) => [
    item.queueID,
    item.priority,
    item.group,
    item.title,
    item.ownerRecordingInstructions,
    item.requiredEvidence.join("|"),
    item.optionalEvidence.join("|"),
    item.acceptanceCriteria.join("|"),
    String(item.existingEvidenceRemainsUseful),
    item.existingEvidenceUsefulness,
    item.sourceReferences.join("|"),
    String(item.blocksProduction),
    item.status
  ]);
  return `${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function renderQueueMarkdown(queue) {
  const lines = [
    "# Authoritative Current Recapture Queue",
    "",
    `**${authoritativeRecaptureQueueLabel}**`,
    "",
    "This queue consolidates the current evidence gaps into one owner-facing recording plan. It does not create production catalog records, verify records, or enable recommendations.",
    "",
    "## Summary",
    "",
    `- Queue items: ${queue.summary.queueItemCount}`,
    `- P0 items: ${queue.summary.priorityCounts.P0}`,
    `- P1 items: ${queue.summary.priorityCounts.P1}`,
    `- P2 items: ${queue.summary.priorityCounts.P2}`,
    `- Production-blocking items: ${queue.summary.productionBlockingCount}`,
    `- Existing source recapture rows consolidated: ${queue.summary.sourceRecaptureRowsConsolidated}`,
    `- Production recommendations enabled: ${queue.summary.productionRecommendationsEnabled}`,
    "",
    "## Rules",
    "",
    "- Preserve original recordings unchanged.",
    "- Record only what is visible in the shipping game or console UI.",
    "- Do not infer missing counts, labels, sliders, ranges, menu paths, patches, or platform differences.",
    "- Existing evidence remains useful only for the roles stated on each queue item.",
    "- Completing the queue still requires first review, second-person verification, catalog-manager approval, validation, and publication gates.",
    "",
    "## Queue",
    ""
  ];
  for (const item of queue.items) {
    lines.push(`### ${item.queueID} - ${item.priority} - ${item.title}`);
    lines.push("");
    lines.push(`- Group: ${item.group}`);
    lines.push(`- What Wyatt should record: ${item.ownerRecordingInstructions}`);
    lines.push(`- Required evidence: ${item.requiredEvidence.join("; ") || "None specified"}`);
    if (item.optionalEvidence.length > 0) lines.push(`- Optional evidence: ${item.optionalEvidence.join("; ")}`);
    lines.push(`- Acceptance criteria: ${item.acceptanceCriteria.join("; ") || "None specified"}`);
    lines.push(`- Existing evidence remains useful: ${item.existingEvidenceRemainsUseful ? "Yes" : "No"}`);
    lines.push(`- Existing evidence use: ${item.existingEvidenceUsefulness}`);
    lines.push(`- Production blocking: ${item.blocksProduction ? "Yes" : "No"}`);
    lines.push(`- Source references: ${item.sourceReferences.join("; ") || "Current research context"}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function readJsonIfExists(root, relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function countCSVRows(root, relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) return 0;
  const text = fs.readFileSync(absolutePath, "utf8").trim();
  if (!text) return 0;
  return Math.max(0, text.split(/\r?\n/).length - 1);
}

function assertResearchOutputPath(relativePath, label) {
  const normalized = relativePath.split(path.sep).join("/");
  if (path.isAbsolute(relativePath)) throw new Error(`${label} must be repository-relative.`);
  if (normalized.includes("..")) throw new Error(`${label} must not escape the repository root.`);
  if (!normalized.startsWith("data/research/cf27/")) throw new Error(`${label} must stay under data/research/cf27/.`);
  if (normalized.includes("/production/")) throw new Error(`${label} must not point at production data.`);
}

function assertDocsCatalogPath(relativePath, label) {
  const normalized = relativePath.split(path.sep).join("/");
  if (path.isAbsolute(relativePath)) throw new Error(`${label} must be repository-relative.`);
  if (normalized.includes("..")) throw new Error(`${label} must not escape the repository root.`);
  if (!normalized.startsWith("docs/catalog/")) throw new Error(`${label} must stay under docs/catalog/.`);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

function printHelp() {
  console.log(`Usage:
  npm run cf27:recapture-queue -- generate

Generates the authoritative current College Football 27 recapture queue from current research evidence gaps.
`);
}
