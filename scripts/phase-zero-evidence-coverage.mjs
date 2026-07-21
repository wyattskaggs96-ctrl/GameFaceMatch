#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PHASE_ZERO_EVIDENCE_COVERAGE_VERSION = "phase-zero-evidence-coverage-v1";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAtDefault = "2026-07-21T03:00:00-04:00";

const artifactPaths = {
  videoInventory: "data/phase-zero/video_inventory.json",
  evidenceManifest: "data/phase-zero/evidence_manifest.json",
  heads: "data/phase-zero/heads.research.json",
  additionalAttributes: "data/phase-zero/additional_attributes.research.json",
  bodyControls: "data/phase-zero/body_controls.research.json",
  hairstyles: "data/phase-zero/hairstyles.research.json",
  hairColors: "data/phase-zero/hair_colors.research.json",
  facialHair: "data/phase-zero/facial_hair.research.json",
  facialHairColors: "data/phase-zero/facial_hair_colors.research.json",
  primaryReview: "data/phase-zero/primary_review_status.json",
  issues: "data/phase-zero/issues_register.research.json",
  captureRequests: "data/phase-zero/capture_requests.json",
  verifierQueue: "data/phase-zero/verifier_candidate_queue.json",
  gapMatrix: "data/phase-zero/appearance_menu_gap_matrix.json",
  productionManifest: "data/catalog/production/catalog_manifest.json",
  intakeMissingCoverage: "data/phase-zero/intake/missing_coverage.json"
};

const outputPaths = {
  controlCenterJson: "data/phase-zero/evidence_coverage_control_center.json",
  controlCenterCsv: "data/phase-zero/evidence_coverage_control_center.csv",
  assignmentsJson: "data/phase-zero/evidence_capture_assignments.json",
  assignmentsCsv: "data/phase-zero/evidence_capture_assignments.csv",
  masterPlanDoc: "docs/phase-zero/WYATT_CAPTURE_MASTER_PLAN.md"
};

const assignmentDefinitions = [
  assignment({
    captureID: "GFM-CAP-011",
    priority: "P0",
    category: "Environment",
    subcategory: "Console and game version evidence",
    objective: "Record direct evidence for Xbox console identity, game title/version screens, and account-safe environment context.",
    exactStartScreen: "Xbox dashboard or College Football 27 title screen before entering Road to Glory.",
    exactActionSequence: [
      "Start from the Xbox dashboard or title screen.",
      "Open visible game title/version information if the game provides it.",
      "Open console information screens only if they do not expose private account, serial, payment, or credential data.",
      "Return to College Football 27 without changing game settings."
    ],
    requiredBeginningProof: "Game title or console/game context visible before navigation.",
    requiredEndingProof: "College Football 27 title or Road to Glory entry visible after environment proof.",
    filenamePattern: "GFM-CAP-011_ENVIRONMENT_CONSOLE_GAME_VERSION_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Game title is visible.",
      "Platform family is visible or directly supported by the recording context.",
      "No private account, payment, serial-number, or credential details are exposed.",
      "Unknown version fields remain unresolved if not visible."
    ],
    recaptureTriggers: ["Version/build text unreadable.", "Private account or credential information is exposed.", "Only a filename, not visible screen evidence, supports the environment claim."]
  }),
  assignment({
    captureID: "GFM-CAP-012",
    priority: "P0",
    category: "Environment",
    subcategory: "Patch/update evidence",
    objective: "Record direct evidence of installed game update or patch state without guessing a version.",
    exactStartScreen: "Xbox game tile, game management screen, or in-game version/update screen if visible.",
    exactActionSequence: [
      "Open the least private screen that shows update status, installed version, or latest-update state.",
      "Pause long enough for patch/update fields to be readable.",
      "If no version or patch is visible, record the screen proving that it is unavailable in that path."
    ],
    requiredBeginningProof: "Screen title or game tile visible before opening update/version details.",
    requiredEndingProof: "Patch/update/version state visible or visibly unavailable.",
    filenamePattern: "GFM-CAP-012_PATCH_UPDATE_STATE_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Visible patch/update/version evidence is readable when available.",
      "No patch value is inferred from date, filename, or memory.",
      "If unavailable, the unavailable state is captured directly."
    ],
    recaptureTriggers: ["Patch/update text unreadable.", "Evidence shows a different game or path.", "Patch state is inferred rather than visible."]
  }),
  assignment({
    captureID: "GFM-CAP-013",
    priority: "P0",
    category: "Creation paths",
    subcategory: "Exact canonical Road to Glory creation path",
    objective: "Re-record the canonical Road to Glory Custom creation path with direct timestamps and no missing transition steps.",
    exactStartScreen: "College Football 27 main interface before Road to Glory.",
    exactActionSequence: [
      "Navigate Road to Glory > setup > journey type selection.",
      "Select the visible Custom/Create Player path only if shown.",
      "Proceed through position, QB selection, Create Player, Player, Appearance, Head & Skin, and Hair menu visibility.",
      "Pause on each meaningful transition."
    ],
    requiredBeginningProof: "Road to Glory entry path visible from the main game interface.",
    requiredEndingProof: "Create Player > Player > Appearance path and Head & Skin/Hair menu visibility shown.",
    filenamePattern: "GFM-CAP-013_RTG_CREATION_PATH_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Every meaningful menu transition is visible.",
      "Mode, creation path, player base, position, and Appearance entry are directly supported.",
      "Unknown version, entitlement, and later-editability fields remain unresolved unless visible."
    ],
    recaptureTriggers: ["A transition is skipped.", "A selected path is hidden by blur or overlay.", "The clip begins after the canonical path decision point."]
  }),
  assignment({
    captureID: "GFM-CAP-001",
    priority: "P0",
    category: "Appearance menu hierarchy",
    subcategory: "Menu beginning and ending boundaries",
    objective: "Prove first and final visible Appearance, Head & Skin, and Hair menu boundaries without claiming absent categories.",
    exactStartScreen: "Create Player > Player > Appearance.",
    exactActionSequence: [
      "Pause on Appearance.",
      "Open Head & Skin and slowly traverse every visible row.",
      "Show any scroll continuation and final boundary.",
      "Return to Appearance and show the Hair row and any additional visible rows."
    ],
    requiredBeginningProof: "Appearance entry visible from Player tab.",
    requiredEndingProof: "Final Head & Skin row and final visible Appearance row shown with no uninspected scroll region hidden.",
    filenamePattern: "GFM-CAP-001_APPEARANCE_HEADSKIN_BOUNDARY_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Menu titles and row labels are readable.",
      "First and final visible menu rows are proven.",
      "Rows beyond visible Chin or beyond visible Hair remain unknown unless boundary evidence proves otherwise."
    ],
    recaptureTriggers: ["Menu labels unreadable.", "Scroll boundary not shown.", "Any row is skipped or hidden by transition blur."]
  }),
  assignment({
    captureID: "GFM-CAP-002",
    priority: "P0",
    category: "Head templates",
    subcategory: "Complete Head Template count and native order",
    objective: "Record two complete Head Template count/order passes with native Face number visible on each selected value.",
    exactStartScreen: "Create Player > Player > Appearance > Head & Skin > Head Template.",
    exactActionSequence: [
      "Start at the first available Head Template value.",
      "Move one selected value at a time while the native number remains visible.",
      "Pause on every value.",
      "Continue to the final value and show wrap/no-wrap proof.",
      "Repeat the count a second time or visibly document any discrepancy."
    ],
    requiredBeginningProof: "First selector value shown directly.",
    requiredEndingProof: "Final selector value plus wrap or no-wrap proof shown directly.",
    filenamePattern: "GFM-CAP-002_HEAD_TEMPLATE_COUNT_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Two count passes agree or a discrepancy is clearly captured.",
      "Native order is preserved without skipped selected values.",
      "Face 12 overlap remains continuity evidence only.",
      "Face 29 is not treated as final unless boundary proof shows that."
    ],
    recaptureTriggers: ["Native number hidden.", "Selected value skipped.", "Ending boundary not shown.", "Transition frame used as selected evidence."]
  }),
  assignment({
    captureID: "GFM-CAP-003",
    priority: "P0",
    category: "Canonical capture conditions",
    subcategory: "Head and skin dependency baseline",
    objective: "Record the stable appearance slate used for later production-quality comparison captures.",
    exactStartScreen: "Create Player > Player > Appearance > Head & Skin.",
    exactActionSequence: [
      "Record the current native value for every visible Head & Skin control.",
      "Record whether eye black, obstructive hair, facial hair, hats/headwear, or other blockers can be removed.",
      "Do not invent unavailable settings."
    ],
    requiredBeginningProof: "Head & Skin root visible before changing any values.",
    requiredEndingProof: "Stable slate shown unchanged across several option changes.",
    filenamePattern: "GFM-CAP-003_CANONICAL_APPEARANCE_LOCK_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Only visible native settings or explicit unavailable states are recorded.",
      "Obstruction-removal attempts are directly supported.",
      "The slate can be repeated by a verifier."
    ],
    recaptureTriggers: ["A canonical setting is inferred.", "Slate changes without documentation.", "Obstruction-removal controls are ambiguous."]
  }),
  assignment({
    captureID: "GFM-CAP-004",
    priority: "P0",
    category: "Head templates",
    subcategory: "Standardized head views",
    objective: "Capture production-comparison candidate views for every head template after count/order evidence is complete.",
    exactStartScreen: "Create Player > Player > Appearance > Head & Skin > Head Template.",
    exactActionSequence: [
      "Use the canonical slate from GFM-CAP-003.",
      "For each selected head, wait for the preview to load completely.",
      "Capture menu proof plus front, left three-quarter, left profile, right three-quarter, right profile, and rear if available.",
      "Preserve native order."
    ],
    requiredBeginningProof: "Canonical slate and first head value shown.",
    requiredEndingProof: "Final captured head value and final required view shown.",
    requiredCameraViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE", "REAR_IF_AVAILABLE"],
    filenamePattern: "GFM-CAP-004_HEAD_TEMPLATE_STANDARDIZED_VIEWS_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Every captured head uses the same slate.",
      "Required views are not transition frames.",
      "Obstructions and missing views are logged instead of hidden."
    ],
    recaptureTriggers: ["Preview not fully loaded.", "Framing/zoom changes materially.", "Eye black or hair/facial-hair obstruction remains unexplained.", "Required view missing."]
  }),
  assignment({
    captureID: "GFM-CAP-005",
    priority: "P0",
    category: "Head & Skin controls",
    subcategory: "Skin tone, skin details, eye shape, and eye color boundaries",
    objective: "Record direct first-to-final selector evidence for Skin Tone, Skin Details, Eye Shape, and Eye Color.",
    exactStartScreen: "Create Player > Player > Appearance > Head & Skin.",
    exactActionSequence: [
      "Open Skin Tone, Skin Details, Eye Shape, and Eye Color one at a time.",
      "For each control, show first value, every selected value, final value, default when visible, and wrap/no-wrap proof.",
      "Pause on each value until labels and preview are readable."
    ],
    requiredBeginningProof: "Each control's selector title and first available value shown.",
    requiredEndingProof: "Each control's final value plus wrap/no-wrap proof shown.",
    filenamePattern: "GFM-CAP-005_HEADSKIN_COLOR_TEXTURE_EYES_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Skin Tone boundaries are directly shown.",
      "Skin Details boundaries are directly shown.",
      "Eye Shape boundaries are directly shown.",
      "Eye Color boundaries are directly shown.",
      "No tone, detail, eye shape, or eye color is inferred from neighboring thumbnails."
    ],
    recaptureTriggers: ["Label/index unreadable.", "First or final boundary missing.", "Default not visible and not documented as unavailable.", "Character preview not loaded."]
  }),
  assignment({
    captureID: "GFM-CAP-006",
    priority: "P0",
    category: "Head & Skin geometry controls",
    subcategory: "Nose, ear, mouth, jaw, chin, and any additional visible geometry controls",
    objective: "Record direct selector evidence for Nose, Ear Shape, Mouth Shape, Jaw Shape, Chin, and any additional Head & Skin controls directly visible.",
    exactStartScreen: "Create Player > Player > Appearance > Head & Skin.",
    exactActionSequence: [
      "Open Nose, Ear Shape, Mouth Shape, Jaw Shape, and Chin one at a time when visible.",
      "For each control, show first value, every selected value, final value, default when visible, and wrap/no-wrap proof.",
      "If an expected control is absent, show the menu boundary rather than inventing it."
    ],
    requiredBeginningProof: "Each opened control's selector title and first available value shown.",
    requiredEndingProof: "Each opened control's final value plus wrap/no-wrap proof shown.",
    filenamePattern: "GFM-CAP-006_HEADSKIN_GEOMETRY_CONTROLS_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Nose boundaries are directly shown.",
      "Ear Shape boundaries are directly shown.",
      "Mouth, Jaw, and Chin controls are opened only if directly visible.",
      "Absent controls are not claimed absent unless menu boundary proof supports it."
    ],
    recaptureTriggers: ["Selector boundary missing.", "Native label/index hidden.", "Control inferred from requirements rather than visible game menu."]
  }),
  assignment({
    captureID: "GFM-CAP-007",
    priority: "P1",
    category: "Hair menu hierarchy",
    subcategory: "Hair submenu child controls",
    objective: "Open Hair and map every visible child control without assuming hairstyles, colors, or facial hair exist.",
    exactStartScreen: "Create Player > Player > Appearance > Hair.",
    exactActionSequence: [
      "Open Hair from Appearance.",
      "Pause on every visible child row.",
      "Show first and final child-control boundary plus any scroll continuation.",
      "Do not enter child controls until hierarchy is readable."
    ],
    requiredBeginningProof: "Hair row visible from Appearance and opened directly.",
    requiredEndingProof: "Final Hair child row and scroll boundary shown.",
    filenamePattern: "GFM-CAP-007_HAIR_SUBMENU_BOUNDARY_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Hair child controls are directly observed.",
      "Unknown child controls remain unknown if no boundary proof exists.",
      "No hairstyle, hair-color, facial-hair, or facial-hair-color value is created from this hierarchy-only capture."
    ],
    recaptureTriggers: ["Hair submenu not opened.", "Child rows unreadable.", "Scroll boundary hidden."]
  }),
  assignment({
    captureID: "GFM-CAP-008",
    priority: "P1",
    category: "Hairstyles",
    subcategory: "Hairstyle selector values",
    objective: "Catalog hairstyle values only if a native hairstyle control is directly visible in Hair.",
    exactStartScreen: "Create Player > Player > Appearance > Hair.",
    exactActionSequence: [
      "Open the native hairstyle control only if it is directly visible.",
      "Show first value, every selected value, final value, and wrap/no-wrap proof.",
      "Capture front, three-quarter, profile, and rear views where available."
    ],
    requiredBeginningProof: "Native hairstyle control label visible before opening.",
    requiredEndingProof: "Final hairstyle value plus boundary/wrap proof shown.",
    requiredCameraViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "REAR", "RIGHT_PROFILE", "RIGHT_3Q"],
    filenamePattern: "GFM-CAP-008_HAIRSTYLES_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "The hairstyle control is direct evidence, not assumed.",
      "Native order is preserved.",
      "Researcher visual metadata stays separate from native labels."
    ],
    recaptureTriggers: ["Hairstyle control label absent.", "Rear/side evidence missing where required.", "Selected value skipped."]
  }),
  assignment({
    captureID: "GFM-CAP-009",
    priority: "P1",
    category: "Hair colors",
    subcategory: "Hair-color selector values",
    objective: "Catalog hair colors only if a native hair-color control is directly visible in Hair.",
    exactStartScreen: "Create Player > Player > Appearance > Hair.",
    exactActionSequence: [
      "Open the native hair-color control only if directly visible.",
      "Show default, first value, every selected value, final value, and wrap/no-wrap proof.",
      "Record whether eyebrow or facial-hair colors change automatically only if visible."
    ],
    requiredBeginningProof: "Native hair-color control label visible before opening.",
    requiredEndingProof: "Final hair-color value plus boundary/wrap proof shown.",
    filenamePattern: "GFM-CAP-009_HAIR_COLORS_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Native labels or indices are preserved.",
      "No generic color name replaces an unreadable native value.",
      "Automatic dependency claims are supported by visible evidence."
    ],
    recaptureTriggers: ["Color label/index unreadable.", "Default or boundary not shown.", "Dependency inferred."]
  }),
  assignment({
    captureID: "GFM-CAP-010",
    priority: "P1",
    category: "Facial hair",
    subcategory: "Facial-hair and facial-hair-color selector values",
    objective: "Catalog facial hair and facial-hair colors only if native controls are directly visible in Hair.",
    exactStartScreen: "Create Player > Player > Appearance > Hair.",
    exactActionSequence: [
      "Open native facial-hair control if directly visible and record None if present.",
      "Show every selected facial-hair value in native order with menu evidence and required face views.",
      "Open facial-hair color only if directly visible and record boundaries/default/wrap evidence."
    ],
    requiredBeginningProof: "Native facial-hair or facial-hair-color control label visible before opening.",
    requiredEndingProof: "Final selected value plus boundary/wrap proof shown for each opened control.",
    requiredCameraViews: ["MENU", "FRONT", "LEFT_3Q", "LEFT_PROFILE", "RIGHT_3Q", "RIGHT_PROFILE"],
    filenamePattern: "GFM-CAP-010_FACIAL_HAIR_AND_COLORS_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "None is recorded only if directly present.",
      "Coverage metadata is researcher-applied and separate from native labels.",
      "Facial-hair color dependencies are directly shown or left unresolved."
    ],
    recaptureTriggers: ["Control not visible.", "None option unclear.", "Side/profile evidence missing.", "Color relationship inferred."]
  }),
  assignment({
    captureID: "GFM-CAP-014",
    priority: "P1",
    category: "Dependencies",
    subcategory: "Head and skin dependency tests",
    objective: "Run controlled dependency checks for head/skin controls against platform, mode, creation path, head, skin presentation, account state, and entitlement state only where visible.",
    exactStartScreen: "Create Player > Player > Appearance > Head & Skin after baseline controls are documented.",
    exactActionSequence: [
      "Record the baseline count/order for one control.",
      "Change one variable at a time only when the game directly exposes that variable.",
      "Return to the same control and record whether count, order, labels, or availability changed."
    ],
    requiredBeginningProof: "Baseline variable and control state visible.",
    requiredEndingProof: "Changed-variable state and comparison result visible.",
    filenamePattern: "GFM-CAP-014_HEADSKIN_DEPENDENCY_TESTS_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Only one variable changes per test.",
      "Observed effect is recorded with direct evidence.",
      "Unexecuted tests remain not tested."
    ],
    recaptureTriggers: ["More than one variable changed.", "Baseline not visible.", "Result inferred."]
  }),
  assignment({
    captureID: "GFM-CAP-015",
    priority: "P1",
    category: "Body and physique controls",
    subcategory: "Height, weight, body type, build, physique, and restrictions",
    objective: "Record body-related controls and determine whether they affect appearance availability or recommendation instructions.",
    exactStartScreen: "Create Player setup path or Player tab where height, weight, body type, build, or physique controls are visible.",
    exactActionSequence: [
      "Open each directly visible body-related control.",
      "Record native labels, ranges, defaults, restrictions, and dependencies.",
      "Return to Appearance only if needed to test whether availability changed."
    ],
    requiredBeginningProof: "Native body-related control label visible.",
    requiredEndingProof: "Control boundaries/ranges or visible unavailable state captured.",
    filenamePattern: "GFM-CAP-015_BODY_PHYSIQUE_CONTROLS_YYYYMMDD_partNN.mp4",
    acceptanceCriteria: [
      "Height, weight, body type, build, and physique are cataloged only when directly visible.",
      "Desired athlete physique remains separate from facial measurement.",
      "Availability effects are tested, not assumed."
    ],
    recaptureTriggers: ["Range boundaries hidden.", "Control inferred from product requirements.", "Appearance dependency not directly tested."]
  })
];

const recordingSessions = [
  {
    sessionNumber: 1,
    title: "Environment, patch, canonical path, and menu boundary",
    captureIDs: ["GFM-CAP-011", "GFM-CAP-012", "GFM-CAP-013", "GFM-CAP-001"],
    expectedDuration: "15-25 minutes",
    rationale: "Start with version/path facts before any catalog evidence, then end already positioned at Appearance."
  },
  {
    sessionNumber: 2,
    title: "Head Template count and order",
    captureIDs: ["GFM-CAP-002"],
    expectedDuration: "15-30 minutes",
    rationale: "Head count/order is the highest-impact catalog blocker and should be recorded separately from visual comparison."
  },
  {
    sessionNumber: 3,
    title: "Canonical slate and standardized head views",
    captureIDs: ["GFM-CAP-003", "GFM-CAP-004"],
    expectedDuration: "45-90 minutes",
    rationale: "Lock stable conditions first, then capture head views without changing settings."
  },
  {
    sessionNumber: 4,
    title: "Head & Skin selectors",
    captureIDs: ["GFM-CAP-005", "GFM-CAP-006"],
    expectedDuration: "30-60 minutes",
    rationale: "Color/texture/geometry selectors live together and can be captured from the same menu region."
  },
  {
    sessionNumber: 5,
    title: "Hair submenu and supported child controls",
    captureIDs: ["GFM-CAP-007", "GFM-CAP-008", "GFM-CAP-009", "GFM-CAP-010"],
    expectedDuration: "45-120 minutes depending on option counts",
    rationale: "Open Hair once, prove child controls, then capture only directly visible supported controls."
  },
  {
    sessionNumber: 6,
    title: "Dependency and body/physique controls",
    captureIDs: ["GFM-CAP-014", "GFM-CAP-015"],
    expectedDuration: "30-75 minutes",
    rationale: "Run after baseline selectors are known so dependency tests have a valid comparison point."
  }
];

export function buildEvidenceCoverageControlCenter(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const generatedAt = options.generatedAt ?? generatedAtDefault;
  const artifacts = Object.fromEntries(Object.entries(artifactPaths).map(([key, relativePath]) => [key, readJson(path.join(root, relativePath), {})]));
  const categoryRows = buildCategoryCoverageRows(artifacts);
  const assignments = assignmentDefinitions.map((definition) => enrichAssignment(definition, artifacts, categoryRows));
  const summary = summarizeControlCenter({ artifacts, categoryRows, assignments });
  return {
    schemaVersion: PHASE_ZERO_EVIDENCE_COVERAGE_VERSION,
    generatedAt,
    project: "GameFace Match",
    game: "EA SPORTS College Football 27",
    dataClass: "PHASE_ZERO_EVIDENCE_COVERAGE_CONTROL_CENTER",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    policy: {
      noInference: "Categories, counts, values, boundaries, and dependencies are marked complete only when directly supported by current evidence.",
      productionRule: "No assignment, research candidate, or primary review result can publish records without second-person verification and the production release gate.",
      assignmentStatusMeaning: "Assignments are recording work orders, not catalog records."
    },
    sourceArtifacts: artifactPaths,
    summary,
    categoryCoverage: categoryRows,
    captureAssignments: assignments,
    recordingOrder: recordingSessions,
    nextRecordingIDs: chooseNextRecordingIDs(assignments)
  };
}

export function writeEvidenceCoverageControlCenter(report, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  writeText(root, outputPaths.controlCenterJson, `${JSON.stringify(report, null, 2)}\n`);
  writeText(root, outputPaths.controlCenterCsv, rowsToCsv(report.categoryCoverage, categoryCsvColumns));
  writeText(root, outputPaths.assignmentsJson, `${JSON.stringify({
    schemaVersion: `${PHASE_ZERO_EVIDENCE_COVERAGE_VERSION}-assignments`,
    generatedAt: report.generatedAt,
    dataClass: "PHASE_ZERO_EVIDENCE_CAPTURE_ASSIGNMENTS",
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    productionRecommendationsEnabled: false,
    assignments: report.captureAssignments,
    recordingOrder: report.recordingOrder
  }, null, 2)}\n`);
  writeText(root, outputPaths.assignmentsCsv, rowsToCsv(report.captureAssignments, assignmentCsvColumns));
  writeText(root, outputPaths.masterPlanDoc, formatMasterPlan(report));
}

export function checkEvidenceCoverageControlCenter(report, options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const expectedFiles = {
    [outputPaths.controlCenterJson]: `${JSON.stringify(report, null, 2)}\n`,
    [outputPaths.controlCenterCsv]: rowsToCsv(report.categoryCoverage, categoryCsvColumns),
    [outputPaths.assignmentsJson]: `${JSON.stringify({
      schemaVersion: `${PHASE_ZERO_EVIDENCE_COVERAGE_VERSION}-assignments`,
      generatedAt: report.generatedAt,
      dataClass: "PHASE_ZERO_EVIDENCE_CAPTURE_ASSIGNMENTS",
      sourceType: "research",
      productionStatus: "NOT_PRODUCTION_DATA",
      productionRecommendationsEnabled: false,
      assignments: report.captureAssignments,
      recordingOrder: report.recordingOrder
    }, null, 2)}\n`,
    [outputPaths.assignmentsCsv]: rowsToCsv(report.captureAssignments, assignmentCsvColumns),
    [outputPaths.masterPlanDoc]: formatMasterPlan(report)
  };
  const stale = Object.entries(expectedFiles)
    .filter(([relativePath, expected]) => readText(path.join(root, relativePath)) !== expected)
    .map(([relativePath]) => relativePath);
  if (stale.length > 0) {
    throw new Error(`Phase 0 evidence coverage artifacts are stale: ${stale.join(", ")}`);
  }
}

function buildCategoryCoverageRows(artifacts) {
  const gaps = artifacts.gapMatrix?.rows ?? [];
  const primaryCategories = artifacts.primaryReview?.categoryStatus ?? [];
  const issueRows = artifacts.issues?.issues ?? [];
  const verifierRows = artifacts.verifierQueue?.records ?? [];
  const productionCount = Number(artifacts.productionManifest?.itemCount ?? artifacts.productionManifest?.items?.length ?? 0);
  const rows = [
    categoryRow({ id: "environment", label: "Environment", artifactCategory: "Environment", minExpected: 1, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "creation_paths", label: "Creation paths", artifactCategory: "Creation paths", minExpected: 1, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "menu_hierarchy", label: "Menu hierarchy", artifactCategory: "Appearance menu hierarchy", minExpected: gaps.length, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "head_templates", label: "Head templates", artifactCategory: "Head Template", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "skin_tone", label: "Skin tone", artifactCategory: "Skin Tone", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "skin_details", label: "Skin details", artifactCategory: "Skin Details", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "eye_shape", label: "Eye shape", artifactCategory: "Eye Shape", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "eye_color", label: "Eye color", artifactCategory: "Eye Color", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "nose", label: "Nose", artifactCategory: "Nose", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "ears", label: "Ears", artifactCategory: "Ear Shape", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "mouth", label: "Mouth", artifactCategory: "Mouth Shape", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "jaw_chin", label: "Jaw/chin", artifactCategory: "Jaw Shape", alternateCategories: ["Chin"], minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "hairstyles", label: "Hairstyles", artifactCategory: "Hairstyles", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "hair_colors", label: "Hair colors", artifactCategory: "Hair colors", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "facial_hair", label: "Facial hair", artifactCategory: "Facial hair", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "facial_hair_colors", label: "Facial-hair colors", artifactCategory: "Facial-hair colors", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "eyebrows", label: "Eyebrows", artifactCategory: "Eyebrows", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "body_physique", label: "Body and physique controls", artifactCategory: "Body/height/weight/physique", minExpected: null, artifacts, issueRows, verifierRows, productionCount }),
    categoryRow({ id: "dependencies", label: "Dependency tests", artifactCategory: "Dependency tests", minExpected: 16, artifacts, issueRows, verifierRows, productionCount })
  ];
  return rows;
}

function categoryRow({ id, label, artifactCategory, alternateCategories = [], minExpected, artifacts, issueRows, verifierRows, productionCount }) {
  const labels = [artifactCategory, ...alternateCategories];
  const primaryStatus = artifacts.primaryReview?.categoryStatus?.find((item) => labels.includes(item.category)) ?? {};
  const gapRows = (artifacts.gapMatrix?.rows ?? []).filter((item) => labels.includes(item.displayedCategoryLabel));
  const directCounts = directCandidateCount(label, labels, artifacts);
  const evidenceAvailable = directCounts.evidenceAvailable || Number(primaryStatus.observedCandidateCount ?? 0) || Number(gapRows.reduce((sum, item) => sum + Number(item.directlySelectedObservationCount ?? 0), 0));
  const observed = directCounts.observed || Number(primaryStatus.uniqueCandidateCount ?? 0) || Number(gapRows.reduce((sum, item) => sum + Number(item.directlyCatalogedValueCount ?? 0), 0));
  const cataloged = directCounts.cataloged || observed;
  const qaReviewed = Number(primaryStatus.approvedWithNotesCount ?? 0) + Number(primaryStatus.primaryApprovedCount ?? 0);
  const duplicateEvidence = Number(primaryStatus.duplicateReviewRequiredCount ?? 0);
  const incompleteEvidence = gapRows.filter((item) => item.productionEligible !== true).length + Number(primaryStatus.recaptureRequiredCount ?? 0);
  const blockingIssueCount = issueRows.filter((issue) => issue.severity === "blocking" && issue.status !== "closed" && labels.some((term) => JSON.stringify(issue).toLowerCase().includes(term.toLowerCase()))).length;
  const verifierReady = Number(primaryStatus.canBeHandedToVerifier === true) || verifierRows.some((record) => labels.includes(record.category));
  const firstSelectorProven = allKnownTrue(primaryStatus.firstSelectorOptionProven, gapRows.map((row) => row.captureStatus !== "PARTIAL" && row.visibleCountStatus !== "COUNT_UNKNOWN"));
  const endingSelectorProven = allKnownTrue(primaryStatus.lastSelectorOptionProven, gapRows.map((row) => row.wrapStatus !== "UNKNOWN" && row.visibleCountStatus !== "COUNT_UNKNOWN"));
  const required = true;
  return {
    categoryID: id,
    category: label,
    required,
    expectedRecords: minExpected,
    observedCandidateRecords: observed,
    acceptedEvidence: evidenceAvailable,
    incompleteEvidence,
    duplicateEvidence,
    primaryReviewedRecords: qaReviewed,
    verifierReady: Boolean(verifierReady),
    secondVerifiedRecords: 0,
    productionApprovedRecords: productionCount > 0 ? Number(primaryStatus.productionApprovedCount ?? 0) : 0,
    blockerCount: blockingIssueCount + incompleteEvidence + (observed === 0 ? 1 : 0),
    beginningProof: Boolean(firstSelectorProven),
    endingProof: Boolean(endingSelectorProven),
    productionReady: false,
    status: categoryStatus({ observed, qaReviewed, verifierReady, incompleteEvidence, blockingIssueCount }),
    blocker: categoryBlocker({ label, observed, qaReviewed, verifierReady, incompleteEvidence, blockingIssueCount, gapRows, primaryStatus })
  };
}

function directCandidateCount(label, labels, artifacts) {
  if (label === "Environment") {
    const env = artifacts.primaryReview?.environmentStatus ?? {};
    return { observed: env.resolved === false ? 1 : Number(Boolean(env.environmentID)), evidenceAvailable: Number(Boolean(env.environmentID)), cataloged: Number(Boolean(env.environmentID)) };
  }
  if (label === "Creation paths") {
    const count = artifacts.creationPaths?.creationPaths?.length ?? 0;
    return { observed: count, evidenceAvailable: count, cataloged: count };
  }
  if (label === "Head templates") {
    const count = artifacts.heads?.summary?.directlyObservedUniqueHeadTemplates ?? artifacts.heads?.records?.length ?? 0;
    return { observed: count, evidenceAvailable: artifacts.heads?.records?.filter?.((record) => evidenceCount(record) > 0).length ?? count, cataloged: artifacts.heads?.records?.length ?? count };
  }
  if (label === "Body and physique controls") {
    const count = artifacts.bodyControls?.summary?.observedResearchRecordCount ?? artifacts.bodyControls?.records?.length ?? 0;
    return { observed: count, evidenceAvailable: count, cataloged: artifacts.bodyControls?.records?.length ?? count };
  }
  if (label === "Hairstyles") return zeroRecordCount(artifacts.hairstyles);
  if (label === "Hair colors") return zeroRecordCount(artifacts.hairColors);
  if (label === "Facial hair") return zeroRecordCount(artifacts.facialHair);
  if (label === "Facial-hair colors") return zeroRecordCount(artifacts.facialHairColors);
  const records = artifacts.additionalAttributes?.records?.filter((record) => labels.includes(record.category)) ?? [];
  return { observed: records.length, evidenceAvailable: records.filter((record) => evidenceCount(record) > 0).length, cataloged: records.length };
}

function zeroRecordCount(catalog) {
  const count = catalog?.records?.length ?? catalog?.summary?.recordCount ?? 0;
  return { observed: count, evidenceAvailable: catalog?.records?.filter?.((record) => evidenceCount(record) > 0).length ?? count, cataloged: count };
}

function enrichAssignment(definition, artifacts, categoryRows) {
  const relatedRows = categoryRows.filter((row) => assignmentMatchesCategory(definition, row));
  const priorRequest = artifacts.captureRequests?.requests?.find((request) => request.captureID === definition.captureID);
  const gapRows = artifacts.gapMatrix?.rows?.filter((row) => (row.relatedCaptureRequestIDs ?? []).includes(definition.captureID)) ?? [];
  const status = assignmentStatus(definition, priorRequest, relatedRows, artifacts);
  const session = recordingSessions.find((item) => item.captureIDs.includes(definition.captureID));
  return {
    ...definition,
    exactActionSequence: definition.exactActionSequence.join(" | "),
    whatMustRemainUnchanged: definition.whatMustRemainUnchanged.join(" | "),
    requiredCameraViews: definition.requiredCameraViews.join(" | "),
    acceptanceCriteria: definition.acceptanceCriteria.join(" | "),
    recaptureTriggers: definition.recaptureTriggers.join(" | "),
    requiredEndingProof: definition.requiredEndingProof,
    status,
    owner: "wyatt-skaggs",
    sessionNumber: session?.sessionNumber ?? Number(priorRequest?.sessionNumber ?? 99),
    existingEvidenceSummary: summarizeExistingEvidence({ definition, priorRequest, relatedRows, gapRows }),
    verifierReadiness: relatedRows.some((row) => row.verifierReady) ? "PARTIAL_RESEARCH_QUEUE_READY_AFTER_CAPTURE_REVIEW" : "BLOCKED_PENDING_CAPTURE",
    productionReadiness: "BLOCKED_RESEARCH_ONLY_NOT_SECOND_VERIFIED"
  };
}

function assignment(input) {
  return {
    sourceType: "research",
    productionStatus: "NOT_PRODUCTION_DATA",
    whatMustRemainUnchanged: [
      "Do not change unrelated player setup values during the assignment.",
      "Keep native labels, indices, or visible unavailable states on screen.",
      "Do not rename, trim, crop, or recompress the master recording after capture."
    ],
    requiredCameraViews: input.requiredCameraViews ?? ["FULL_MENU_OR_SELECTOR"],
    status: "REQUESTED_NOT_CAPTURED",
    owner: "wyatt-skaggs",
    ...input
  };
}

function summarizeControlCenter({ artifacts, categoryRows, assignments }) {
  return {
    sourceVideos: artifacts.videoInventory?.inventory?.length ?? artifacts.videoInventory?.videos?.length ?? 0,
    evidenceEntries: artifacts.evidenceManifest?.entries?.length ?? 0,
    researchCandidates: artifacts.primaryReview?.summary?.totalResearchCandidates ?? 0,
    primaryApprovedWithNotes: artifacts.primaryReview?.summary?.primaryApprovedWithNotes ?? 0,
    duplicateReviewRequired: artifacts.primaryReview?.summary?.duplicateReviewRequired ?? 0,
    secondVerifiedRecords: artifacts.primaryReview?.summary?.secondVerified ?? 0,
    productionApprovedRecords: artifacts.primaryReview?.summary?.productionApproved ?? 0,
    productionCatalogRecords: artifacts.productionManifest?.itemCount ?? artifacts.productionManifest?.items?.length ?? 0,
    coverageCategories: categoryRows.length,
    categoriesWithObservedCandidates: categoryRows.filter((row) => row.observedCandidateRecords > 0).length,
    categoriesProductionReady: categoryRows.filter((row) => row.productionReady).length,
    captureAssignments: assignments.length,
    p0Assignments: assignments.filter((assignment) => assignment.priority === "P0").length,
    p1Assignments: assignments.filter((assignment) => assignment.priority === "P1").length,
    assignmentsComplete: assignments.filter((assignment) => assignment.status === "COMPLETE").length,
    assignmentsBlocking: assignments.filter((assignment) => assignment.status !== "COMPLETE").length,
    productionRecommendationsEnabled: false
  };
}

function assignmentStatus(definition, priorRequest, relatedRows, artifacts) {
  if (artifacts.intakeMissingCoverage?.missingCoverage?.some?.((item) => item.capture_id === definition.captureID)) return "REQUESTED_NOT_CAPTURED";
  if (priorRequest?.verificationStatus === "REQUESTED_NOT_CAPTURED") return "REQUESTED_NOT_CAPTURED";
  if (relatedRows.some((row) => row.incompleteEvidence > 0 || row.blockerCount > 0)) return "EXISTING_RESEARCH_EVIDENCE_INCOMPLETE";
  if (relatedRows.some((row) => row.observedCandidateRecords > 0)) return "NEEDS_PRIMARY_REVIEW_AFTER_INTAKE";
  return "MISSING_REQUIRED_EVIDENCE";
}

function chooseNextRecordingIDs(assignments) {
  const byID = new Map(assignments.map((assignment) => [assignment.captureID, assignment]));
  return recordingSessions
    .flatMap((session) => session.captureIDs)
    .map((captureID) => byID.get(captureID))
    .filter((assignment) => assignment && assignment.status !== "COMPLETE")
    .slice(0, 3)
    .map((assignment) => assignment.captureID);
}

function summarizeExistingEvidence({ definition, priorRequest, relatedRows, gapRows }) {
  const observed = relatedRows.reduce((sum, row) => sum + row.observedCandidateRecords, 0);
  const incomplete = relatedRows.reduce((sum, row) => sum + row.incompleteEvidence, 0);
  if (observed > 0) return `${observed} research candidate(s) exist for related categories, with ${incomplete} incomplete evidence marker(s).`;
  if (gapRows.length > 0) return `${gapRows.length} gap row(s) currently map to ${definition.captureID}; direct selector/category coverage remains incomplete.`;
  if (priorRequest) return `Existing capture request ${definition.captureID} is open and not yet satisfied.`;
  return "No current machine-readable evidence satisfies this assignment.";
}

function assignmentMatchesCategory(assignment, row) {
  const text = `${assignment.category} ${assignment.subcategory} ${assignment.objective}`.toLowerCase();
  return text.includes(row.category.toLowerCase().split("/")[0]) || row.category.toLowerCase().split(" ").some((part) => part.length > 4 && text.includes(part));
}

function categoryStatus({ observed, qaReviewed, verifierReady, incompleteEvidence, blockingIssueCount }) {
  if (blockingIssueCount > 0 || incompleteEvidence > 0) return "INCOMPLETE_EVIDENCE";
  if (observed === 0) return "MISSING_EVIDENCE";
  if (qaReviewed > 0 && verifierReady) return "READY_FOR_VERIFIER_AFTER_RECAPTURE";
  if (qaReviewed > 0) return "PRIMARY_REVIEWED_RESEARCH_ONLY";
  return "OBSERVED_PENDING_QA";
}

function categoryBlocker({ label, observed, qaReviewed, verifierReady, incompleteEvidence, blockingIssueCount, gapRows, primaryStatus }) {
  if (observed === 0) return `${label} has no directly cataloged candidate records in current evidence.`;
  if (incompleteEvidence > 0) return `${label} has incomplete evidence, boundary, default, wrap, view, or stable-condition requirements.`;
  if (blockingIssueCount > 0) return `${label} has ${blockingIssueCount} open blocking issue(s).`;
  if (!verifierReady) return `${label} is not ready for independent verifier handoff.`;
  if (qaReviewed === 0) return `${label} has not completed primary review.`;
  if (gapRows.some((row) => row.productionEligible !== true) || primaryStatus.couldBecomeProductionEligibleAfterVerification === false) return `${label} remains research-only until verification and release gates pass.`;
  return "No production blocker detected by coverage control center.";
}

function allKnownTrue(primaryValue, values) {
  if (primaryValue === true) return true;
  if (primaryValue === false) return false;
  if (primaryValue === "NOT_APPLICABLE" || primaryValue === "RESEARCH_PATH_ONLY") return true;
  return values.length > 0 && values.every(Boolean);
}

function evidenceCount(record) {
  return [
    ...(record.evidenceReferences ?? []),
    ...(record.evidenceIDs ?? []),
    ...(record.sourceVideos ?? []),
    ...(record.sourceEvidence ?? [])
  ].length;
}

function formatMasterPlan(report) {
  const lines = [
    "# Wyatt Capture Master Plan",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This plan is the current Phase 0 evidence-coverage control center for GameFace Match. It is research-only and does not make any College Football 27 catalog record production-ready.",
    "",
    "## Current Coverage",
    "",
    `- Research candidates: ${report.summary.researchCandidates}`,
    `- Primary approved with notes: ${report.summary.primaryApprovedWithNotes}`,
    `- Duplicate review required: ${report.summary.duplicateReviewRequired}`,
    `- Second-verified records: ${report.summary.secondVerifiedRecords}`,
    `- Production-approved records: ${report.summary.productionApprovedRecords}`,
    `- Production catalog records: ${report.summary.productionCatalogRecords}`,
    `- Capture assignments blocking completion: ${report.summary.assignmentsBlocking}`,
    "",
    "## Recommended Recording Order",
    ""
  ];
  for (const session of report.recordingOrder) {
    lines.push(`### Session ${session.sessionNumber}: ${session.title}`);
    lines.push("");
    lines.push(`- Capture IDs: ${session.captureIDs.join(", ")}`);
    lines.push(`- Expected duration: ${session.expectedDuration}`);
    lines.push(`- Why this order: ${session.rationale}`);
    lines.push("");
  }
  lines.push("## Assignments");
  lines.push("");
  for (const assignment of report.captureAssignments) {
    lines.push(`### ${assignment.captureID} — ${assignment.category}: ${assignment.subcategory}`);
    lines.push("");
    lines.push(`- Priority: ${assignment.priority}`);
    lines.push(`- Status: ${assignment.status}`);
    lines.push(`- Owner: ${assignment.owner}`);
    lines.push(`- Objective: ${assignment.objective}`);
    lines.push(`- Exact start screen: ${assignment.exactStartScreen}`);
    lines.push(`- Exact action sequence: ${assignment.exactActionSequence}`);
    lines.push(`- What must remain unchanged: ${assignment.whatMustRemainUnchanged}`);
    lines.push(`- Required beginning proof: ${assignment.requiredBeginningProof}`);
    lines.push(`- Required ending proof: ${assignment.requiredEndingProof}`);
    lines.push(`- Required camera views: ${assignment.requiredCameraViews}`);
    lines.push(`- Filename pattern: ${assignment.filenamePattern}`);
    lines.push(`- Acceptance criteria: ${assignment.acceptanceCriteria}`);
    lines.push(`- Recapture triggers: ${assignment.recaptureTriggers}`);
    lines.push(`- Existing evidence summary: ${assignment.existingEvidenceSummary}`);
    lines.push("");
  }
  lines.push("## One-Page Recording Checklist");
  lines.push("");
  lines.push("1. Put the next recording in `data/phase-zero/intake/pending/` after capture.");
  lines.push("2. Include the `GFM-CAP-###` ID in the filename.");
  lines.push("3. Keep native labels or indices visible.");
  lines.push("4. Pause on first value, every selected value, final value, and wrap/no-wrap proof.");
  lines.push("5. Do not edit, trim, rename, or recompress the master file.");
  lines.push("6. Do not record private account, payment, serial-number, or credential screens.");
  lines.push("7. Run `npm run phase-zero:intake -- --path data/phase-zero/intake/pending` after files are placed.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const categoryCsvColumns = [
  "categoryID",
  "category",
  "required",
  "expectedRecords",
  "observedCandidateRecords",
  "acceptedEvidence",
  "incompleteEvidence",
  "duplicateEvidence",
  "primaryReviewedRecords",
  "verifierReady",
  "secondVerifiedRecords",
  "productionApprovedRecords",
  "blockerCount",
  "beginningProof",
  "endingProof",
  "productionReady",
  "status",
  "blocker"
];

const assignmentCsvColumns = [
  "captureID",
  "priority",
  "category",
  "subcategory",
  "objective",
  "exactStartScreen",
  "exactActionSequence",
  "whatMustRemainUnchanged",
  "requiredBeginningProof",
  "requiredEndingProof",
  "requiredCameraViews",
  "filenamePattern",
  "acceptanceCriteria",
  "recaptureTriggers",
  "status",
  "owner",
  "sessionNumber",
  "existingEvidenceSummary",
  "verifierReadiness",
  "productionReadiness"
];

function rowsToCsv(rows, columns) {
  return `${[columns.join(","), ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(","))].join("\n")}\n`;
}

function csvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function writeText(root, relativePath, value) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, value);
}

function priorityRank(priority) {
  if (priority === "P0") return 0;
  if (priority === "P1") return 1;
  if (priority === "P2") return 2;
  return 9;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  const report = buildEvidenceCoverageControlCenter();
  try {
    if (check) {
      checkEvidenceCoverageControlCenter(report);
      console.log(`Phase 0 evidence coverage control center is current (${report.captureAssignments.length} assignments, ${report.categoryCoverage.length} categories).`);
    } else {
      writeEvidenceCoverageControlCenter(report);
      console.log(`Wrote Phase 0 evidence coverage control center (${report.captureAssignments.length} assignments, ${report.categoryCoverage.length} categories).`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
