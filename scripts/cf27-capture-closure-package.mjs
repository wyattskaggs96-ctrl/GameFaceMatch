#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-02T00:00:00-04:00";
const outputDirectory = "data/phase-zero/capture-closure";

const sourcePaths = {
  primaryReview: "data/phase-zero/primary_review_status.json",
  issues: "data/phase-zero/issues_register.research.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  videoInventory: "data/phase-zero/video_inventory.json",
  captureRequests: "data/phase-zero/capture_requests.json",
  gapMatrix: "data/phase-zero/appearance_menu_gap_matrix.json",
  environmentManifest: "data/phase-zero/environment_manifest.research.json",
  productionManifest: "data/catalog/production/catalog_manifest.json"
};

const outputPaths = {
  planJson: `${outputDirectory}/owner-capture-plan.json`,
  planCsv: `${outputDirectory}/owner-capture-plan.csv`,
  traceabilityJson: `${outputDirectory}/issue-to-capture-traceability.json`,
  intakeTemplateJson: `${outputDirectory}/owner-intake-manifest-template.json`,
  intakeTemplateCsv: `${outputDirectory}/owner-intake-manifest-template.csv`,
  doc: "docs/phase-zero/CF27_CAPTURE_CLOSURE_PACKAGE.md"
};

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

main();

function main() {
  const built = buildClosurePackage();
  validateClosurePackage(built);

  const writes = [
    [outputPaths.planJson, `${JSON.stringify(built.plan, null, 2)}\n`],
    [outputPaths.planCsv, toCsv(flattenSessionRows(built.plan.sessions))],
    [outputPaths.traceabilityJson, `${JSON.stringify(built.traceability, null, 2)}\n`],
    [outputPaths.intakeTemplateJson, `${JSON.stringify(built.intakeTemplate, null, 2)}\n`],
    [outputPaths.intakeTemplateCsv, toCsv(built.intakeTemplate.fields.map((field) => ({
      field: field.name,
      required: field.required ? "yes" : "no",
      description: field.description
    })))],
    [outputPaths.doc, formatClosureMarkdown(built)]
  ];

  const stale = writes.filter(([relativePath, contents]) => {
    const absolutePath = path.join(repositoryRoot, relativePath);
    return !fs.existsSync(absolutePath) || fs.readFileSync(absolutePath, "utf8") !== contents;
  });

  if (checkOnly) {
    if (stale.length > 0) {
      console.error("CF27 capture closure package is stale:");
      for (const [relativePath] of stale) console.error(`- ${relativePath}`);
      process.exit(1);
    }
    console.log("CF27 capture closure package check passed.");
    return;
  }

  for (const [relativePath, contents] of writes) {
    const absolutePath = path.join(repositoryRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, contents);
  }
  console.log(`Wrote CF27 capture closure package to ${outputDirectory}.`);
}

function buildClosurePackage() {
  const primaryReview = readJson(sourcePaths.primaryReview);
  const issuesRegister = readJson(sourcePaths.issues);
  const evidenceManifest = readJson(sourcePaths.evidenceManifest);
  const videoInventory = readJson(sourcePaths.videoInventory);
  const captureRequests = readJson(sourcePaths.captureRequests);
  const gapMatrix = readJson(sourcePaths.gapMatrix);
  const environmentManifest = readJson(sourcePaths.environmentManifest);
  const productionManifest = readJson(sourcePaths.productionManifest);

  const issues = issuesRegister.issues ?? [];
  const candidates = primaryReview.candidates ?? [];
  const duplicateCandidates = candidates.filter((candidate) => candidate.primaryReviewStatus === "DUPLICATE_REVIEW_REQUIRED");
  const categoryRows = primaryReview.categoryStatus ?? [];
  const gapRows = gapMatrix.rows ?? [];
  const openBlockingIssues = issues.filter((issue) => issue.status === "open" && issue.severity === "blocking");
  const productionRecords = countProductionRecords(productionManifest);

  const sessions = attachIssueMappings(buildCaptureSessions({ categoryRows, duplicateCandidates, captureRequests }), issues);
  const traceability = buildTraceability({ issues, sessions, categoryRows, gapRows, duplicateCandidates });

  const sourceCounts = {
    totalResearchCandidates: primaryReview.summary.totalResearchCandidates,
    primaryApproved: primaryReview.summary.primaryApproved,
    primaryApprovedWithNotes: primaryReview.summary.primaryApprovedWithNotes,
    duplicateReviewRequired: primaryReview.summary.duplicateReviewRequired,
    secondVerified: primaryReview.summary.secondVerified,
    productionApproved: primaryReview.summary.productionApproved,
    productionRecords,
    recordsAllowedInProductionRecommendations: primaryReview.summary.recordsAllowedInProductionRecommendations,
    openIssues: issues.length,
    openBlockingIssues: openBlockingIssues.length,
    evidenceEntries: (evidenceManifest.entries ?? []).length,
    videoInventoryRows: (videoInventory.inventory ?? []).length,
    uniqueSourceVideos: videoInventory.summary?.uniqueVideoFiles ?? null,
    duplicateSourceVideos: videoInventory.summary?.exactDuplicateFiles ?? null,
    gapRows: gapRows.length
  };

  const missingCategoriesCovered = gapRows
    .filter((row) => row.captureStatus === "NOT_CAPTURED" || row.captureStatus === "UNKNOWN_NOT_FULLY_INSPECTED")
    .map((row) => ({
      category: row.displayedCategoryLabel,
      classification: row.classification,
      captureStatus: row.captureStatus,
      currentObservedCandidateCount: row.directlyCatalogedValueCount ?? 0,
      expectedRecordCount: null,
      expectedRecordCountReason: "Unknown until direct selector boundary evidence is recorded.",
      captureSessionIDs: traceability.categoryToSessions[row.displayedCategoryLabel] ?? []
    }));

  const plan = {
    schemaVersion: "cf27-owner-capture-closure-package-v1",
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "owner_capture_closure_plan",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_SECOND_VERIFIED",
    sourceArtifacts: sourcePaths,
    sourceCounts,
    policy: {
      preserveMasters: true,
      noProductionPromotion: true,
      noSecondVerificationClaim: true,
      noExpectedCountFabrication: true,
      nativeOrderMustBePreserved: true,
      allNewEvidenceStartsAs: "research_or_unreviewed_evidence"
    },
    firstRecordingSessionID: "GFM-CF27-S01",
    sessions,
    missingCategoriesCovered,
    duplicateReviewPlan: {
      duplicateReviewRequiredCount: duplicateCandidates.length,
      candidateIDs: duplicateCandidates.map((candidate) => candidate.candidateID),
      captureSessionID: "GFM-CF27-S06",
      rule: "Preserve both observations and record direct continuity/duplicate-resolution evidence. Do not merge duplicate-looking options from video alone."
    },
    environmentEvidencePlan: {
      captureSessionID: "GFM-CF27-S01",
      unresolvedFields: primaryReview.environmentStatus.unresolvedFields,
      requestedEvidence: [
        "Game title screen",
        "Console game info screen",
        "Executable/version/update screen when available",
        "Xbox platform and console model where visible without exposing private account or serial details",
        "Edition, region, online state, EA account requirement, and entitlement state only where visible",
        "Display output, HDR, and capture conditions where visible",
        "Mode, creation path, position, archetype, handedness, height, weight, and body settings where visible"
      ],
      rule: "Leave any field null when the recording cannot show it safely and directly."
    },
    intakeInstructions: {
      approvedPendingFolder: "data/phase-zero/intake/pending/",
      commandAfterCopy: "npm run phase-zero:intake -- --path data/phase-zero/intake/pending",
      preserveOriginalFilename: true,
      doNotRenameMasters: true,
      doNotEditVideos: true,
      acceptedExtensions: ["mp4", "mov", "png", "jpg", "jpeg"],
      namingPattern: "Use the session filename pattern exactly, with YYYYMMDD and partNN."
    }
  };

  return {
    plan,
    traceability,
    intakeTemplate: buildIntakeTemplate(plan, environmentManifest)
  };
}

function buildCaptureSessions({ categoryRows, duplicateCandidates, captureRequests }) {
  const requestIDs = new Set((captureRequests.requests ?? []).map((request) => request.captureID));
  const category = (name) => categoryRows.find((row) => row.category === name) ?? {};
  const base = [
    session({
      sessionID: "GFM-CF27-S01",
      priority: "P0",
      title: "Environment and game-version evidence",
      objective: "Resolve the publication-blocking Xbox, game version, patch, edition, entitlement, online, display, and capture-method fields that are currently null.",
      startingGameLocation: "Xbox dashboard or College Football 27 title/main screen before entering Road to Glory.",
      navigationPathWhenKnown: "Use the least-private Xbox or in-game screens that visibly show game info, update status, version/build, and console context.",
      preconditions: ["Do not expose account email, serial number, payment details, or credentials.", "Do not change game settings."],
      constantCharacterSettings: ["Not applicable. This is environment and version evidence only."],
      whatToRecord: ["Title screen", "Game info/update/version screen when available", "Console model/platform screen when safe", "Online/EA account/entitlement state only when visible without private details", "Display/HDR/output context only if visible"],
      cameraRotationRequirements: ["None"],
      pauseInstructions: "Pause 3-5 seconds on every environment/version field so text is readable.",
      beginningEvidence: "Xbox dashboard, game tile, title screen, or main menu visible before opening details.",
      endingEvidence: "Return to College Football 27 title/main screen or Road to Glory entry without changing settings.",
      categoriesOrRecordsClosed: ["Environment metadata", "Production path prerequisites"],
      issueTerms: ["environment", "console", "version", "patch", "edition", "region", "copytype", "entitlement", "online", "ea account", "display", "hdr", "output"],
      fileNaming: "GFM-CF27-S01-environment-game-version-YYYYMMDD-partNN.mp4",
      estimatedDuration: "5-10 minutes",
      whatNotToChange: ["Do not change game settings.", "Do not show private account/payment/serial information."],
      factBoundary: "Direct fact only when visible on screen; otherwise remains unresolved."
    }),
    session({
      sessionID: "GFM-CF27-S02",
      priority: "P0",
      title: "Complete menu hierarchy and canonical creation path",
      objective: "Re-record the Road to Glory creation path and prove Appearance, Head & Skin, and Hair menu boundaries without assuming hidden rows.",
      startingGameLocation: "College Football 27 main interface before Road to Glory.",
      navigationPathWhenKnown: "Road to Glory > setup > journey type > position > QB > Create Player > Player > Appearance > Head & Skin and Hair.",
      preconditions: ["Use the same intended RTG Custom/QB research path.", "Do not skip transition screens."],
      constantCharacterSettings: ["Do not change appearance values during the boundary pass."],
      whatToRecord: ["Every meaningful transition to Appearance", "Appearance root", "Head & Skin root", "Hair row/root if accessible", "First and final visible rows for each menu", "Any scroll continuation or lack of continuation"],
      cameraRotationRequirements: ["None; menu labels take priority."],
      pauseInstructions: "Pause 3 seconds on each transition, menu heading, and row before moving.",
      beginningEvidence: "Road to Glory entry visible from the main game interface.",
      endingEvidence: "Appearance, Head & Skin, Hair, and final visible menu boundaries shown.",
      categoriesOrRecordsClosed: ["Creation paths", "Appearance menu hierarchy", "Menu boundary issues"],
      existingCaptureRequestIDs: ["GFM-CAP-001", "GFM-CAP-013"].filter((id) => requestIDs.has(id) || id === "GFM-CAP-013"),
      issueTerms: ["creation path", "appearance menu", "menu-appearance", "menu-head-skin", "menu-hair", "appearanceeditablelater", "playerbaseselection", "handedness", "archetype", "height", "weight", "body"],
      fileNaming: "GFM-CF27-S02-creation-path-menu-boundaries-YYYYMMDD-partNN.mp4",
      estimatedDuration: "15-25 minutes",
      whatNotToChange: ["Do not infer categories from prior games.", "Do not count thumbnail-only options as selected values."],
      factBoundary: "Menu labels/paths are facts only where they are visible and readable."
    }),
    session({
      sessionID: "GFM-CF27-S03",
      priority: "P0",
      title: "Missing hairstyles and hair colors",
      objective: "Open the Hair menu and record directly selected hairstyle and hair-color controls if present.",
      startingGameLocation: "Create Player > Player > Appearance > Hair.",
      navigationPathWhenKnown: "Appearance > Hair, then child controls visible inside Hair. Specific children are unknown until opened.",
      preconditions: ["Use the canonical character setup from the current research path.", "Keep head, skin, body, and facial hair constant unless the Hair menu requires a change."],
      constantCharacterSettings: ["Canonical head", "Canonical skin setting", "No facial hair where supported", "Consistent lighting/framing"],
      whatToRecord: ["Hair menu child controls", "Hairstyle selector if present", "Hair-color selector if present", "First value", "Every selected value", "Final value", "Wrap/no-wrap proof", "Native labels or indices"],
      cameraRotationRequirements: ["Front, left three-quarter, left profile, rear if hair is visible from rear, right profile, right three-quarter for hairstyle values where available"],
      pauseInstructions: "Pause on each selected value until label/index and preview are stable.",
      beginningEvidence: "Hair menu title and first child control/value visible.",
      endingEvidence: "Final hairstyle and hair-color values, plus boundary/wrap proof, if those controls exist.",
      categoriesOrRecordsClosed: ["Hairstyles", "Hair colors", "Hair submenu child controls"],
      existingCaptureRequestIDs: ["GFM-CAP-007", "GFM-CAP-008", "GFM-CAP-009"].filter((id) => requestIDs.has(id)),
      issueTerms: ["hair menu", "hairstyle", "hair color", "hair-visible-not-opened"],
      fileNaming: "GFM-CF27-S03-hair-hairstyles-colors-YYYYMMDD-partNN.mp4",
      estimatedDuration: "30-75 minutes depending on unknown counts",
      whatNotToChange: ["Do not create expected hairstyle or color counts until boundaries are shown.", "Do not use cultural, ethnic, or lifestyle labels."],
      factBoundary: "Hair controls are suspected/not observed until this session directly opens them."
    }),
    session({
      sessionID: "GFM-CF27-S04",
      priority: "P0",
      title: "Missing facial hair and facial-hair colors",
      objective: "Record facial-hair style and facial-hair color controls if the Hair menu exposes them.",
      startingGameLocation: "Create Player > Player > Appearance > Hair.",
      navigationPathWhenKnown: "Appearance > Hair, then facial-hair child controls if visible.",
      preconditions: ["Use one canonical head, hairstyle, skin setting, and body setting.", "Confirm None if the game presents it."],
      constantCharacterSettings: ["Canonical head", "Canonical hairstyle", "Canonical skin", "Canonical facial-hair color when style values are captured"],
      whatToRecord: ["Facial-hair style selector if present", "Facial-hair color selector if present", "None option if present", "First/final values", "Wrap/no-wrap proof", "Whether None affects color availability"],
      cameraRotationRequirements: ["Front", "Left three-quarter", "Right three-quarter", "Profile where available"],
      pauseInstructions: "Pause on every selected style/color value until label/index and preview are stable.",
      beginningEvidence: "Facial-hair control title or visible absence inside Hair menu.",
      endingEvidence: "Final facial-hair style/color boundary proof or direct unavailable evidence.",
      categoriesOrRecordsClosed: ["Facial hair", "Facial-hair colors"],
      existingCaptureRequestIDs: ["GFM-CAP-007", "GFM-CAP-010"].filter((id) => requestIDs.has(id)),
      issueTerms: ["facial hair", "facial-hair", "beard", "mustache"],
      fileNaming: "GFM-CF27-S04-facial-hair-colors-YYYYMMDD-partNN.mp4",
      estimatedDuration: "30-75 minutes depending on unknown counts",
      whatNotToChange: ["Do not infer beard coverage from labels alone.", "Do not use cultural, ethnic, lifestyle, or personality labels."],
      factBoundary: "Facial-hair controls remain unobserved unless visible in this session."
    }),
    session({
      sessionID: "GFM-CF27-S05",
      priority: "P0",
      title: "Missing eyebrows and remaining face controls",
      objective: "Record any remaining visible face controls, especially eyebrows, mouth, jaw, chin, cheeks, sliders, toggles, and additional presets.",
      startingGameLocation: "Create Player > Player > Appearance > Head & Skin.",
      navigationPathWhenKnown: "Head & Skin visible controls through Chin; rows after Chin are unknown until boundary evidence proves them.",
      preconditions: ["Use canonical character settings.", "Change one control at a time."],
      constantCharacterSettings: ["Canonical head", "Canonical skin", "Canonical hairstyle", "No facial hair where supported", "Constant body/height/weight"],
      whatToRecord: ["Eyebrows if present", "Mouth Shape", "Jaw Shape", "Chin", "Cheeks or additional rows if present", "Any sliders/toggles/presets/colors visible beyond current records"],
      cameraRotationRequirements: ["Front for labels and visible changes", "Three-quarter/profile for nose, jaw, chin, and ear controls where useful"],
      pauseInstructions: "Pause on every control heading and selected value; keep native label/index visible.",
      beginningEvidence: "Head & Skin menu title and first control in scope visible.",
      endingEvidence: "Final value and boundary/wrap proof for each control; explicit no-more-rows proof where applicable.",
      categoriesOrRecordsClosed: ["Eyebrows", "Mouth Shape", "Jaw Shape", "Chin", "Additional sliders/toggles/colors/presets", "Nose", "Ear Shape", "Eye Shape", "Eye Color", "Skin Tone", "Skin Details"],
      existingCaptureRequestIDs: ["GFM-CAP-005", "GFM-CAP-006"].filter((id) => requestIDs.has(id)),
      issueTerms: ["eyebrow", "mouth", "jaw", "chin", "cheek", "additional", "skin tone", "skin details", "eye shape", "eye color", "nose", "ear shape", "menu-chin", "menu-jaw", "menu-mouth"],
      fileNaming: "GFM-CF27-S05-face-controls-boundaries-YYYYMMDD-partNN.mp4",
      estimatedDuration: "45-90 minutes depending on unknown counts",
      whatNotToChange: ["Do not infer intermediate values.", "Do not describe controls with subjective identity, attractiveness, or ethnicity labels."],
      factBoundary: "Counts and ranges are unknown until first/final values and wrap/no-wrap proof are recorded."
    }),
    session({
      sessionID: "GFM-CF27-S06",
      priority: "P1",
      title: "Duplicate and ambiguity resolution",
      objective: "Record focused evidence for the five duplicate-review candidates without merging records prematurely.",
      startingGameLocation: "Relevant selector for each duplicate-review candidate.",
      navigationPathWhenKnown: "Head Template for Face 12 and Face 16; Skin Tone for Skin Tone 10; Nose for Aquiline; Ear Shape for None.",
      preconditions: ["Keep the candidate value label/index visible.", "Preserve both old and new observations in notes."],
      constantCharacterSettings: ["Same canonical slate used for the category capture"],
      whatToRecord: duplicateCandidates.map((candidate) => `${candidate.candidateID}: ${candidate.nativeVisibleLabelOrIndex} at ${candidate.category}`),
      cameraRotationRequirements: ["Menu proof first; visual view only where needed to resolve association/continuity."],
      pauseInstructions: "Pause before, on, and after each duplicate candidate to show neighboring selected values.",
      beginningEvidence: "Neighboring option before the duplicate candidate is visible.",
      endingEvidence: "Neighboring option after the duplicate candidate is visible.",
      categoriesOrRecordsClosed: ["Duplicate review records"],
      issueTerms: ["duplicate", "continuity", "overlap"],
      fileNaming: "GFM-CF27-S06-duplicate-review-YYYYMMDD-partNN.mp4",
      estimatedDuration: "15-30 minutes",
      whatNotToChange: ["Do not delete duplicates.", "Do not silently merge visually similar options.", "Do not mark verified."],
      factBoundary: "This session can support primary duplicate resolution only; second verification is still required."
    }),
    session({
      sessionID: "GFM-CF27-S07",
      priority: "P1",
      title: "Required recaptures and weak production evidence",
      objective: "Recapture currently observed categories under standardized, stable conditions for future production comparison.",
      startingGameLocation: "Create Player > Player > Appearance > Head & Skin.",
      navigationPathWhenKnown: "Current observed categories: Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape.",
      preconditions: ["Run after environment and canonical slate are documented.", "Use consistent zoom, lighting, body, head, skin, hair, and facial-hair settings."],
      constantCharacterSettings: ["Canonical slate from GFM-CAP-003", "Eye black removed/absent where supported", "Hair and facial hair controlled where supported"],
      whatToRecord: ["Stable front/menu evidence for every currently observed option", "Required side/three-quarter/profile views where useful", "Loading completion before each representative frame", "Obstructions and missing views as explicit notes"],
      cameraRotationRequirements: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR_IF_AVAILABLE"],
      pauseInstructions: "Wait for loading/animation to finish before rotating or changing options.",
      beginningEvidence: "Canonical slate visible before category recapture begins.",
      endingEvidence: "Final recaptured category value and completion slate visible.",
      categoriesOrRecordsClosed: ["Production-standard imagery gaps", "Current captured category recaptures"],
      issueTerms: ["recapture", "weak", "framing", "profile", "view", "obstruction", "category incomplete", "production comparison"],
      fileNaming: "GFM-CF27-S07-standardized-recaptures-YYYYMMDD-partNN.mp4",
      estimatedDuration: "60-120 minutes depending on category counts",
      whatNotToChange: ["Do not reject current footage for menu/order evidence.", "Do not hide missing views.", "Do not alter game imagery."],
      factBoundary: "This creates better primary evidence but does not create second verification or production approval."
    }),
    session({
      sessionID: "GFM-CF27-S08",
      priority: "P2",
      title: "Dependency checks",
      objective: "Change one variable at a time to determine whether option counts, order, labels, geometry, or availability change.",
      startingGameLocation: "Known stable creation path and relevant Appearance selector.",
      navigationPathWhenKnown: "Use the verified canonical path after Sessions 1-5 establish it.",
      preconditions: ["Run after baseline count/order captures.", "Record baseline before changing a variable."],
      constantCharacterSettings: ["Change exactly one tested variable when practical."],
      whatToRecord: ["Position", "Archetype", "Height", "Weight", "Body type", "Selected head", "Skin tone", "Hairstyle", "Facial hair", "Online/offline", "EA account state", "Edition/entitlement", "Platform/patch where feasible"],
      cameraRotationRequirements: ["Menu/count evidence; visual evidence only where a dependency changes rendering."],
      pauseInstructions: "Pause on baseline, changed variable, and affected selector before recording result.",
      beginningEvidence: "Baseline environment and selector count/order shown.",
      endingEvidence: "Changed-variable result and whether count/order/label/rendering changed.",
      categoriesOrRecordsClosed: ["Dependency tests", "Patch/version compatibility blockers"],
      issueTerms: ["dependency", "appearanceeditablelater", "archetype", "body type", "height", "weight", "online", "ea account", "edition", "entitlement"],
      fileNaming: "GFM-CF27-S08-dependency-checks-YYYYMMDD-partNN.mp4",
      estimatedDuration: "30-90 minutes; can wait until primary catalog evidence is complete",
      whatNotToChange: ["Do not mark unexecuted tests passed.", "Do not combine multiple variable changes in one conclusion."],
      factBoundary: "Dependency status remains unknown for tests not directly executed."
    })
  ];
  return base;
}

function session(input) {
  return {
    ...input,
    owner: "Wyatt",
    status: "OPEN_REQUIRED_CAPTURE",
    nativeOrderInstruction: "Preserve native menu order exactly. Do not infer skipped or hidden values.",
    masterEvidenceRule: "Record a new master video/screenshot and preserve it unchanged. Any extracted image or renamed copy is derivative evidence.",
    acceptanceCriteria: [
      "All visible labels/indices needed for the session are readable.",
      "The beginning and ending evidence requirements are satisfied.",
      "No values, counts, ranges, dependencies, or menu paths are inferred from memory.",
      "The original master file remains unchanged and can be hashed after intake."
    ]
  };
}

function attachIssueMappings(sessions, issues) {
  const assignments = new Map(sessions.map((sessionRecord) => [sessionRecord.sessionID, []]));
  for (const issue of issues) {
    const sessionID = classifyIssue(issue, sessions);
    assignments.get(sessionID).push(issue.issueID);
  }
  return sessions.map((sessionRecord) => ({
    ...withoutInternalTerms(sessionRecord),
    linkedIssueIDs: assignments.get(sessionRecord.sessionID).sort()
  }));
}

function classifyIssue(issue, sessions) {
  const text = `${issue.issueID} ${issue.kind} ${issue.title} ${issue.description ?? ""}`.toLowerCase();
  if (text.includes("duplicate") || text.includes("continuity") || text.includes("overlap")) return "GFM-CF27-S06";
  if (issue.kind === "recaptureRequired") return "GFM-CF27-S07";
  if (text.includes("facial-hair") || text.includes("facial hair") || text.includes("beard") || text.includes("mustache")) return "GFM-CF27-S04";
  if (text.includes("hairstyle") || text.includes("hair color") || text.includes("hair menu") || text.includes("hair-visible")) return "GFM-CF27-S03";
  if (text.includes("environment") || text.includes("issue-phase0-env") || text.includes("console") || text.includes("version") || text.includes("patch") || text.includes("edition") || text.includes("storefront") || text.includes("copytype") || text.includes("display") || text.includes("hdr") || text.includes("output") || text.includes("online") || text.includes("entitlement")) return "GFM-CF27-S01";
  if (text.includes("dependency") || text.includes("bodytype")) return "GFM-CF27-S08";
  if (text.includes("creation") || text.includes("playerbase") || text.includes("appearanceeditablelater") || text.includes("handedness") || text.includes("menu-appearance") || text.includes("menu-head-skin")) return "GFM-CF27-S02";
  if (text.includes("eyebrow") || text.includes("mouth") || text.includes("jaw") || text.includes("chin") || text.includes("skin") || text.includes("eye") || text.includes("nose") || text.includes("ear")) return "GFM-CF27-S05";
  if (text.includes("recapture") || text.includes("category incomplete")) return "GFM-CF27-S07";
  const fallback = sessions.find((sessionRecord) => sessionRecord.sessionID === "GFM-CF27-S07");
  return fallback.sessionID;
}

function withoutInternalTerms(sessionRecord) {
  const { issueTerms, ...publicSession } = sessionRecord;
  return publicSession;
}

function buildTraceability({ issues, sessions, categoryRows, gapRows, duplicateCandidates }) {
  const issueToCapture = {};
  const categoryToSessions = {};
  const sessionByIssue = new Map();
  for (const sessionRecord of sessions) {
    for (const issueID of sessionRecord.linkedIssueIDs ?? []) {
      sessionByIssue.set(issueID, sessionRecord.sessionID);
    }
    for (const category of sessionRecord.categoriesOrRecordsClosed ?? []) {
      categoryToSessions[category] ??= [];
      if (!categoryToSessions[category].includes(sessionRecord.sessionID)) categoryToSessions[category].push(sessionRecord.sessionID);
    }
  }
  for (const row of gapRows) {
    categoryToSessions[row.displayedCategoryLabel] ??= sessions
      .filter((sessionRecord) => (sessionRecord.categoriesOrRecordsClosed ?? []).some((category) => category.toLowerCase().includes(String(row.displayedCategoryLabel).toLowerCase()) || String(row.displayedCategoryLabel).toLowerCase().includes(category.toLowerCase())))
      .map((sessionRecord) => sessionRecord.sessionID);
  }
  for (const issue of issues) {
    const sessionID = sessionByIssue.get(issue.issueID) ?? "GFM-CF27-S07";
    issueToCapture[issue.issueID] = {
      issueID: issue.issueID,
      issueKind: issue.kind,
      severity: issue.severity,
      status: issue.status,
      title: issue.title,
      affectedRecordCount: (issue.affectedRecordIDs ?? []).length,
      captureSessionID: sessionID,
      captureSessionTitle: sessions.find((sessionRecord) => sessionRecord.sessionID === sessionID)?.title ?? null,
      mappingBasis: "Keyword/category mapping from current issue register plus prompt-required eight-session closure plan.",
      nonCaptureDecision: null
    };
  }
  return {
    schemaVersion: "cf27-issue-to-capture-traceability-v1",
    generatedAt,
    sourceIssues: sourcePaths.issues,
    issueCount: issues.length,
    blockingIssueCount: issues.filter((issue) => issue.status === "open" && issue.severity === "blocking").length,
    mappedIssueCount: Object.keys(issueToCapture).length,
    unmappedBlockingIssues: issues
      .filter((issue) => issue.status === "open" && issue.severity === "blocking" && !issueToCapture[issue.issueID])
      .map((issue) => issue.issueID),
    categoryToSessions,
    duplicateReviewCandidates: duplicateCandidates.map((candidate) => ({
      candidateID: candidate.candidateID,
      category: candidate.category,
      nativeOrder: candidate.nativeOrder,
      nativeVisibleLabelOrIndex: candidate.nativeVisibleLabelOrIndex,
      captureSessionID: "GFM-CF27-S06"
    })),
    issueToCapture
  };
}

function buildIntakeTemplate(plan, environmentManifest) {
  return {
    schemaVersion: "cf27-owner-intake-manifest-template-v1",
    generatedAt,
    environmentCandidateID: environmentManifest.environmentID ?? environmentManifest.id ?? null,
    instructions: "Copy new Xbox recordings into data/phase-zero/intake/pending/ without renaming or editing the masters, then run the intake command listed in owner-capture-plan.json.",
    fields: [
      field("capture_session_id", true, "One of the GFM-CF27-S01 through GFM-CF27-S08 session IDs."),
      field("planned_filename", true, "Filename Wyatt intended to use from the capture plan."),
      field("original_filename", true, "Exact filename as it appears on disk after transfer."),
      field("portable_intake_path", true, "Repository-relative path under data/phase-zero/intake/pending/."),
      field("sha256", false, "Generated by intake; leave blank before processing."),
      field("file_size_bytes", false, "Generated by intake; leave blank before processing."),
      field("duration_seconds", false, "Generated by intake for videos."),
      field("resolution", false, "Generated by intake when available."),
      field("capture_date", false, "Use YYYY-MM-DD when known from the recording session."),
      field("wyatt_notes", false, "Short notes about anything unusual during capture."),
      field("privacy_review", true, "Confirm no private account/payment/serial details are visible before acceptance."),
      field("processing_status", false, "Intake pipeline status."),
      field("review_status", false, "Research review status after processing.")
    ],
    starterRows: plan.sessions.map((sessionRecord) => ({
      capture_session_id: sessionRecord.sessionID,
      planned_filename: sessionRecord.fileNaming,
      original_filename: "",
      portable_intake_path: "",
      sha256: "",
      file_size_bytes: "",
      duration_seconds: "",
      resolution: "",
      capture_date: "",
      wyatt_notes: "",
      privacy_review: "PENDING",
      processing_status: "PENDING_INTAKE",
      review_status: "NOT_REVIEWED"
    }))
  };
}

function field(name, required, description) {
  return { name, required, description };
}

function validateClosurePackage({ plan, traceability, intakeTemplate }) {
  const errors = [];
  if (plan.sourceCounts.totalResearchCandidates !== 85) errors.push(`Expected 85 current research candidates, found ${plan.sourceCounts.totalResearchCandidates}.`);
  if (plan.sourceCounts.primaryApprovedWithNotes !== 80) errors.push(`Expected 80 PRIMARY_APPROVED_WITH_NOTES candidates, found ${plan.sourceCounts.primaryApprovedWithNotes}.`);
  if (plan.sourceCounts.duplicateReviewRequired !== 5) errors.push(`Expected 5 DUPLICATE_REVIEW_REQUIRED candidates, found ${plan.sourceCounts.duplicateReviewRequired}.`);
  if (plan.sourceCounts.secondVerified !== 0) errors.push(`Expected 0 second-verified records, found ${plan.sourceCounts.secondVerified}.`);
  if (plan.sourceCounts.productionApproved !== 0 || plan.sourceCounts.productionRecords !== 0) errors.push("Production catalog must remain empty for this closure package.");
  if (plan.sessions.length !== 8) errors.push(`Expected exactly 8 owner capture sessions, found ${plan.sessions.length}.`);
  for (const sessionRecord of plan.sessions) {
    if (!sessionRecord.acceptanceCriteria || sessionRecord.acceptanceCriteria.length === 0) errors.push(`${sessionRecord.sessionID} lacks acceptance criteria.`);
    if (!sessionRecord.fileNaming) errors.push(`${sessionRecord.sessionID} lacks a file naming rule.`);
    if (!sessionRecord.beginningEvidence || !sessionRecord.endingEvidence) errors.push(`${sessionRecord.sessionID} lacks beginning or ending evidence.`);
  }
  const requiredMissingCategories = ["Hairstyles", "Hair colors", "Facial hair", "Facial-hair colors", "Eyebrows", "Body/height/weight/physique"];
  for (const category of requiredMissingCategories) {
    if (!plan.missingCategoriesCovered.some((row) => row.category === category)) errors.push(`Missing category coverage omitted: ${category}.`);
  }
  const fabricatedCounts = plan.missingCategoriesCovered.filter((row) => row.expectedRecordCount !== null);
  if (fabricatedCounts.length > 0) errors.push(`Expected counts fabricated for: ${fabricatedCounts.map((row) => row.category).join(", ")}.`);
  if (traceability.unmappedBlockingIssues.length > 0) errors.push(`Unmapped blocking issues: ${traceability.unmappedBlockingIssues.join(", ")}.`);
  if (traceability.issueCount !== plan.sourceCounts.openIssues) errors.push("Issue traceability count does not match issue register count.");
  if (traceability.duplicateReviewCandidates.length !== plan.sourceCounts.duplicateReviewRequired) errors.push("Duplicate review traceability count does not match primary review count.");
  if (intakeTemplate.starterRows.length !== plan.sessions.length) errors.push("Intake starter rows do not match capture-session count.");
  if (errors.length > 0) {
    console.error("CF27 capture closure package validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
}

function flattenSessionRows(sessions) {
  return sessions.map((sessionRecord) => ({
    session_id: sessionRecord.sessionID,
    priority: sessionRecord.priority,
    title: sessionRecord.title,
    objective: sessionRecord.objective,
    starting_game_location: sessionRecord.startingGameLocation,
    navigation_path_when_known: sessionRecord.navigationPathWhenKnown,
    file_naming: sessionRecord.fileNaming,
    estimated_duration: sessionRecord.estimatedDuration,
    linked_issue_count: (sessionRecord.linkedIssueIDs ?? []).length,
    linked_issue_ids: (sessionRecord.linkedIssueIDs ?? []).join("; "),
    categories_or_records_closed: (sessionRecord.categoriesOrRecordsClosed ?? []).join("; "),
    acceptance_criteria: (sessionRecord.acceptanceCriteria ?? []).join("; "),
    what_not_to_change: (sessionRecord.whatNotToChange ?? []).join("; ")
  }));
}

function formatClosureMarkdown({ plan, traceability, intakeTemplate }) {
  const lines = [
    "# CF27 Capture Closure Package",
    "",
    "**PRIMARY RESEARCH ONLY - NOT PRODUCTION VERIFIED**",
    "",
    `Generated from machine-readable Phase 0 artifacts at \`${generatedAt}\`. This package does not create production catalog records, does not perform second-person verification, and does not enable recommendations.`,
    "",
    "## Recalculated Counts",
    "",
    `- Research candidates: ${plan.sourceCounts.totalResearchCandidates}`,
    `- Primary approved: ${plan.sourceCounts.primaryApproved}`,
    `- Primary approved with notes: ${plan.sourceCounts.primaryApprovedWithNotes}`,
    `- Duplicate review required: ${plan.sourceCounts.duplicateReviewRequired}`,
    `- Open issues: ${plan.sourceCounts.openIssues} (${plan.sourceCounts.openBlockingIssues} blocking)`,
    `- Evidence entries: ${plan.sourceCounts.evidenceEntries}`,
    `- Source-video inventory rows: ${plan.sourceCounts.videoInventoryRows}`,
    `- Unique source videos: ${plan.sourceCounts.uniqueSourceVideos}`,
    `- Second verified: ${plan.sourceCounts.secondVerified}`,
    `- Production approved: ${plan.sourceCounts.productionApproved}`,
    `- Production catalog records: ${plan.sourceCounts.productionRecords}`,
    "",
    "## First Recording Wyatt Should Make",
    "",
    "Record `GFM-CF27-S01-environment-game-version-YYYYMMDD-partNN.mp4` first. This resolves the publication-blocking environment/version evidence needed before any future catalog package can be tied to a reproducible game build.",
    "",
    "## Recording Sessions",
    ""
  ];
  for (const sessionRecord of plan.sessions) {
    lines.push(
      `### ${sessionRecord.sessionID}: ${sessionRecord.title}`,
      "",
      `- Priority: ${sessionRecord.priority}`,
      `- Starting location: ${sessionRecord.startingGameLocation}`,
      `- Navigation path when known: ${sessionRecord.navigationPathWhenKnown}`,
      `- File name: \`${sessionRecord.fileNaming}\``,
      `- Estimated duration: ${sessionRecord.estimatedDuration}`,
      `- Categories or records closed: ${(sessionRecord.categoriesOrRecordsClosed ?? []).join(", ")}`,
      `- Linked issues: ${(sessionRecord.linkedIssueIDs ?? []).join(", ") || "none"}`,
      "",
      "**Record:**",
      ...sessionRecord.whatToRecord.map((item) => `- ${item}`),
      "",
      "**Preconditions and constants:**",
      ...sessionRecord.preconditions.map((item) => `- ${item}`),
      ...sessionRecord.constantCharacterSettings.map((item) => `- ${item}`),
      "",
      "**Pause and view requirements:**",
      `- ${sessionRecord.pauseInstructions}`,
      ...sessionRecord.cameraRotationRequirements.map((item) => `- ${item}`),
      "",
      "**Acceptance conditions:**",
      ...sessionRecord.acceptanceCriteria.map((item) => `- ${item}`),
      "",
      "**Do not change:**",
      ...sessionRecord.whatNotToChange.map((item) => `- ${item}`),
      ""
    );
  }
  lines.push(
    "## Missing Categories Covered",
    "",
    "| Category | Current status | Current observed candidates | Expected count | Capture sessions |",
    "| --- | --- | ---: | --- | --- |",
    ...plan.missingCategoriesCovered.map((row) => `| ${row.category} | ${row.captureStatus} / ${row.classification} | ${row.currentObservedCandidateCount} | Unknown until recorded | ${(row.captureSessionIDs ?? []).join(", ") || "unmapped"} |`),
    "",
    "## Duplicate-Review Capture Plan",
    "",
    `Capture session: ${plan.duplicateReviewPlan.captureSessionID}`,
    "",
    ...plan.duplicateReviewPlan.candidateIDs.map((candidateID) => `- ${candidateID}`),
    "",
    "Preserve both observations. Do not merge duplicate-looking options, and do not mark any duplicate resolved without direct continuity evidence.",
    "",
    "## Environment Evidence Plan",
    "",
    `Capture session: ${plan.environmentEvidencePlan.captureSessionID}`,
    "",
    ...plan.environmentEvidencePlan.requestedEvidence.map((item) => `- ${item}`),
    "",
    `Rule: ${plan.environmentEvidencePlan.rule}`,
    "",
    "## USB To Mac Upload Instructions",
    "",
    "1. Record the sessions using the filename pattern from the plan when possible.",
    "2. Do not trim, rename, recompress, color-correct, or edit the master recording.",
    "3. Copy the original files from Xbox/USB into `data/phase-zero/intake/pending/`.",
    "4. Keep the exact original filename if the Xbox or USB export changes it.",
    "5. Run `npm run phase-zero:intake -- --path data/phase-zero/intake/pending`.",
    "6. Review the generated intake report before accepting any uncertain mapping.",
    "",
    "## Intake Manifest Template",
    "",
    `Use \`${outputPaths.intakeTemplateCsv}\` or \`${outputPaths.intakeTemplateJson}\` to track the transfer. The template has ${intakeTemplate.fields.length} fields and one starter row per capture session.`,
    "",
    "## Validation",
    "",
    "Run `npm run cf27:capture-closure-package:check` to confirm:",
    "",
    "- All 44 current issues map to a capture session or explicit non-capture decision.",
    "- All blocking issues are mapped.",
    "- Missing categories are not omitted.",
    "- Unknown expected counts remain null.",
    "- Every capture session has acceptance conditions.",
    "- Production catalog count remains zero.",
    "",
    "## Traceability",
    "",
    `Machine-readable issue mapping: \`${outputPaths.traceabilityJson}\`.`,
    "",
    `Mapped issues: ${traceability.mappedIssueCount}/${traceability.issueCount}. Unmapped blocking issues: ${traceability.unmappedBlockingIssues.length}.`,
    ""
  );
  return `${lines.join("\n")}\n`;
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replaceAll('"', '""')}"`;
  return stringValue;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"));
}

function countProductionRecords(manifest) {
  if (Array.isArray(manifest.records)) return manifest.records.length;
  if (Array.isArray(manifest.catalogRecords)) return manifest.catalogRecords.length;
  if (manifest.summary?.productionRecords != null) return manifest.summary.productionRecords;
  if (manifest.summary?.totalRecords != null) return manifest.summary.totalRecords;
  return 0;
}
