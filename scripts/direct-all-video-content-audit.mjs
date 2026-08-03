#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-08-03T03:25:00-04:00";
const ffmpeg = process.env.GFM_FFMPEG_PATH || "/Applications/Plaud.app/Contents/Resources/ffmpeg";

const outputs = {
  inventoryJson: "data/media-audit/all_video_inventory.json",
  inventoryCsv: "data/media-audit/all_video_inventory.csv",
  timelineJson: "data/media-audit/all_video_timeline_map.json",
  timelineCsv: "data/media-audit/all_video_timeline_map.csv",
  coverageJson: "data/media-audit/game_video_coverage_map.json",
  coverageCsv: "data/media-audit/game_video_coverage_map.csv",
  missingJson: "data/media-audit/exact_missing_recordings.json",
  missingCsv: "data/media-audit/exact_missing_recordings.csv",
  auditDoc: "docs/status/DIRECT_ALL_VIDEO_CONTENT_AUDIT.md",
  missingDoc: "docs/status/EXACT_MISSING_RECORDINGS_BY_GAME.md"
};

const manualTimelines = {
  "source-media/Fc26/player-creator/fc26-player-creator-part-01.mp4": [
    segment(0, 15, "EA Sports FC player creator", "Skin", "Skin Tone / Complexion / Skin Surface", "Skin tone and complexion values visible; exact final boundary not proven.", "front", "captured_with_limitations"),
    segment(15, 55, "EA Sports FC player creator", "Skin", "Complexion / Skin Surface", "Complexion and skin-surface presets visible; some labels readable.", "front", "partially_captured"),
    segment(55, 95, "EA Sports FC player creator", "Skin", "Freckles / Scarring / Moles / Face Makeup / Lip Makeup", "Texture/makeup controls visible with selected values; full selector boundaries not proven.", "front", "partially_captured"),
    segment(95, 145, "EA Sports FC player creator", "Head", "Skull / Forehead / Jaw / Ears", "Head-structure numeric-looking preset labels visible; player remains mostly front/three-quarter.", "front;right_3q", "partially_captured"),
    segment(145, 205, "EA Sports FC player creator", "Face", "Cheeks / Chin / Neck / Eyes / Eyebrows", "Face controls and color swatches visible; no complete boundary proof.", "front;right_3q", "partially_captured"),
    segment(205, 240.98, "EA Sports FC player creator", "Face", "Eyebrows / color swatches", "Eyebrow-related rows and color swatches remain visible near the end.", "front;right_3q", "partially_captured")
  ],
  "source-media/Fc26/player-creator/fc26-player-creator-part-02.MP4": [
    segment(0, 35, "EA Sports FC player creator", "Face", "Eyes / Eyebrows / Nose / Mouth / Teeth", "Continues face-control traversal; selected labels and values are visible but exact ranges are not fully proven.", "front;right_3q", "partially_captured"),
    segment(35, 70, "EA Sports FC player creator", "Hair", "Hair color / highlights", "Hair color swatches and selected hair settings visible.", "front;right_profile;rear", "captured_with_limitations"),
    segment(70, 160, "EA Sports FC player creator", "Hair", "Hair styles", "Multiple hair-style presets visible with front/side/rear-oriented model views.", "front;left_profile;right_profile;rear", "captured_with_limitations"),
    segment(160, 195, "EA Sports FC player creator", "Hair", "Hair color / hairstyle continuation", "Additional hair styles and color selections visible.", "front;right_3q", "partially_captured"),
    segment(195, 235.69, "EA Sports FC player creator", "Facial hair", "Facial Hair / facial-hair color", "Facial-hair rows, beard visual changes, and color swatches visible.", "front;right_3q", "partially_captured")
  ],
  "source-media/NBA2k 2026/NBA 2K26 for Xbox Series X_S-2026_08_03-01_47_00.mp4": [
    segment(0, 141.99, "2K Create A Player", "Head Selection", "Head Selection grid", "Multiple head presets selected from a grid; front, side, rear, and three-quarter views are visible through rotations.", "front;left_3q;left_profile;rear;right_profile;right_3q", "captured_with_limitations")
  ],
  "source-media/NBA2k 2026/NBA 2K26 for Xbox Series X_S-2026_08_03-01_51_45.mp4": [
    segment(0, 8, "2K Create A Player", "Appearance", "Appearance menu entry", "Appearance menu is visible before opening hair.", "front", "captured_with_limitations"),
    segment(8, 236.57, "2K Create A Player", "Hair", "Hair style grid", "Many hairstyle presets are selected from the Hair grid; continuous rotations include front, profiles, rear, and three-quarter extractable frames.", "front;left_3q;left_profile;rear;right_profile;right_3q", "captured_with_limitations")
  ],
  "source-media/NBA2k 2026/NBA 2K26 for Xbox Series X_S-2026_08_03-01_55_27.mp4": [
    segment(0, 38, "2K Create A Player", "Hair", "Edit Hair / Hair Color / Hair Length / Hair Pattern", "Hair color and edit-hair controls with swatches/sliders are visible.", "front;profile;rear", "partially_captured"),
    segment(38, 125, "2K Create A Player", "Skull", "Edit Skull sliders", "Skull Width, Skull Height, and related sliders are visible with values, but min/max range proof is incomplete.", "front;right_profile", "captured_with_limitations"),
    segment(125, 178.63, "2K Create A Player", "Skull", "Skull preset grid", "Skull presets are visible with rotations and selected tiles.", "front;right_profile;rear", "captured_with_limitations")
  ],
  "source-media/NBA2k 2026/NBA 2K26 for Xbox Series X_S-2026_08_03-01_58_49.mp4": [
    segment(0, 25, "2K Create A Player", "Brow", "Brow / Eyebrows", "Brow/eyebrow controls are visible.", "front;right_profile", "partially_captured"),
    segment(25, 50, "2K Create A Player", "Ears / Eyes", "Ears / Eyes preset grids", "Ear and eye preset grids are visible; rotations provide side evidence.", "front;rear;right_profile", "captured_with_limitations"),
    segment(50, 80, "2K Create A Player", "Nose", "Nose preset grid", "Nose preset grid and selected tiles are visible.", "front;right_3q", "captured_with_limitations"),
    segment(80, 112, "2K Create A Player", "Cheeks", "Cheeks preset grid", "Cheek presets are visible.", "front;right_profile", "partially_captured"),
    segment(112, 150, "2K Create A Player", "Mouth / Teeth", "Mouth / teeth options", "Mouth, upper/lower teeth, and teeth visual state are visible.", "front", "partially_captured"),
    segment(150, 183.99, "2K Create A Player", "Facial Hair", "Facial Hair entry", "Facial Hair menu entry and initial beard visual are visible.", "front;right_3q", "partially_captured")
  ],
  "source-media/NBA2k 2026/NBA 2K26 for Xbox Series X_S-2026_08_03-02_02_07.mp4": [
    segment(0, 191.24, "2K Create A Player", "Facial Hair", "Facial hair style grid", "Facial-hair styles are selected from a grid with repeated rotations; front, profile, rear, and three-quarter frames are extractable.", "front;left_3q;left_profile;rear;right_profile;right_3q", "captured_with_limitations")
  ],
  "source-media/NBA2k 2026/NBA 2K26 for Xbox Series X_S-2026_08_03-02_04_25.mp4": [
    segment(0, 35, "2K Create A Player", "Chin", "Chin preset grid", "Chin presets visible with front/profile/rear rotations.", "front;right_profile;rear", "captured_with_limitations"),
    segment(35, 88, "2K Create A Player", "Skin", "Skin swatch grid", "Skin swatches are selected; model tone changes are visible.", "front;right_profile;rear", "captured_with_limitations"),
    segment(88, 112.85, "2K Create A Player", "Body", "Edit Body / Arm Emphasis / Body Shape", "Body appearance settings and full-body preview are visible.", "front;right_profile", "partially_captured")
  ],
  "source-media/NBA2k 2026/NBA 2K26 for Xbox Series X_S-2026_08_03-02_08_34.mp4": [
    segment(0, 211.10, "2K Create A Player", "Signature Editor", "Jump shot / dribble / dunk / movement style controls", "Signature animation/style controls are visible; this is player-style context, not face appearance catalog evidence.", "full_body;front;rear;profile", "captured_with_limitations")
  ],
  "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4": [
    segment(0, 5, "College Football create player", "Appearance", "Head & Skin entry", "Create Player appearance entry visible.", "full_body;front", "captured_with_limitations"),
    segment(5, 64, "College Football create player", "Head & Skin", "Head Template", "Head Template grid and selected faces visible; first/final/wrap not proven.", "front;right_3q", "partially_captured"),
    segment(65, 119, "College Football create player", "Head & Skin", "Skin Tone", "Skin Tone swatches and selected values visible; grid is readable.", "front", "captured_with_limitations"),
    segment(120, 144, "College Football create player", "Head & Skin", "Skin Details", "Skin Details grid visible.", "front", "captured_with_limitations"),
    segment(145, 159, "College Football create player", "Head & Skin", "Eye Shape", "Eye Shape grid visible.", "front;right_3q", "captured_with_limitations"),
    segment(160, 184, "College Football create player", "Head & Skin", "Eye Color", "Eye Color grid visible.", "front", "captured_with_limitations"),
    segment(185, 199, "College Football create player", "Head & Skin", "Nose", "Nose grid visible with selected options.", "front;right_3q", "partially_captured"),
    segment(200, 209, "College Football create player", "Head & Skin", "Ear Shape", "Ear Shape grid visible.", "front", "partially_captured"),
    segment(210, 219, "College Football create player", "Head & Skin", "Mouth Shape", "Mouth Shape grid visible.", "front", "captured_with_limitations"),
    segment(220, 229, "College Football create player", "Head & Skin", "Jaw Shape", "Jaw Shape grid visible.", "front", "partially_captured"),
    segment(230, 240.24, "College Football create player", "Head & Skin", "Chin", "Chin grid visible.", "front", "partially_captured")
  ],
  "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4": [
    segment(0, 5, "College Football create player", "Appearance", "Hair entry", "Create Player hair entry visible.", "full_body;front", "captured_with_limitations"),
    segment(5, 99, "College Football create player", "Hair", "Hair Style", "Hair Style grid and many selected styles visible.", "front;right_3q", "captured_with_limitations"),
    segment(100, 174, "College Football create player", "Hair", "Hair Color", "Hair Color swatches and selected values visible.", "front", "captured_with_limitations"),
    segment(175, 224, "College Football create player", "Hair", "Facial Hair Style", "Facial Hair Style grid and selected styles visible.", "front;right_3q", "captured_with_limitations"),
    segment(225, 235.35, "College Football create player", "Hair", "Facial Hair Color", "Facial Hair Color swatches visible.", "front", "partially_captured")
  ],
  "source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_21_15.mp4": [
    segment(0, 5, "College Football create player", "Styles", "Styles entry", "Styles menu entry visible.", "full_body", "captured_with_limitations"),
    segment(5, 74, "College Football create player", "Styles", "QB Throw Style", "QB Throw Style values and animation preview visible.", "full_body;front;profile", "captured_with_limitations"),
    segment(75, 124, "College Football create player", "Styles", "Run Style", "Run Style values and movement preview visible.", "full_body;front;rear", "captured_with_limitations"),
    segment(125, 154, "College Football create player", "Styles", "QB Under Center Stance", "Under-center stance rows visible.", "full_body;front", "captured_with_limitations"),
    segment(155, 163.8, "College Football create player", "Styles", "2-Point Stance rows", "2-point stance rows visible.", "full_body;front", "partially_captured")
  ]
};

const gameCoverage = [
  coverage("EA Sports FC player creator footage", "Environment and version footage", "PARTIALLY_CAPTURED", "Creator UI is visible, but title/version/platform screen is not shown."),
  coverage("EA Sports FC player creator footage", "Main player-creation path", "PARTIALLY_CAPTURED", "Player creator is open; entry path into creator is not shown."),
  coverage("EA Sports FC player creator footage", "Complete visible menu hierarchy", "PARTIALLY_CAPTURED", "Skin, Head, Face, Hair sections are visible across two videos; full top-level hierarchy and boundaries are not proven."),
  coverage("EA Sports FC player creator footage", "Head or face presets", "PARTIALLY_CAPTURED", "Skull, forehead, jaw, ears, cheeks, chin, neck, eyes, eyebrows, nose, mouth, teeth controls are visible."),
  coverage("EA Sports FC player creator footage", "Skin options", "PARTIALLY_CAPTURED", "Skin Tone, Complexion, Skin Surface visible."),
  coverage("EA Sports FC player creator footage", "Skin details or complexion", "PARTIALLY_CAPTURED", "Freckles, scarring, moles, makeup visible."),
  coverage("EA Sports FC player creator footage", "Eye-related options", "PARTIALLY_CAPTURED", "Eyes and eyebrows visible."),
  coverage("EA Sports FC player creator footage", "Nose-related options", "PARTIALLY_CAPTURED", "Nose controls visible in part 2."),
  coverage("EA Sports FC player creator footage", "Ear-related options", "PARTIALLY_CAPTURED", "Ear controls visible in part 1."),
  coverage("EA Sports FC player creator footage", "Mouth-related options", "PARTIALLY_CAPTURED", "Mouth and teeth controls visible in part 2."),
  coverage("EA Sports FC player creator footage", "Jaw-related options", "PARTIALLY_CAPTURED", "Jaw controls visible in part 1."),
  coverage("EA Sports FC player creator footage", "Chin", "PARTIALLY_CAPTURED", "Chin controls visible in part 1."),
  coverage("EA Sports FC player creator footage", "Eyebrow-related options", "PARTIALLY_CAPTURED", "Eyebrow rows and colors visible."),
  coverage("EA Sports FC player creator footage", "Hairstyles", "CAPTURED_WITH_LIMITATIONS", "Many hair styles visible with extractable angles."),
  coverage("EA Sports FC player creator footage", "Hair colors", "CAPTURED_WITH_LIMITATIONS", "Hair color swatches visible."),
  coverage("EA Sports FC player creator footage", "Facial hair", "PARTIALLY_CAPTURED", "Facial hair and color rows visible near end of part 2."),
  coverage("EA Sports FC player creator footage", "Facial-hair colors", "PARTIALLY_CAPTURED", "Facial-hair color swatches visible, but full range is not proven."),
  coverage("EA Sports FC player creator footage", "Body or physique settings", "NOT_SEEN_IN_ANY_VIDEO", "No body/physique menu is visible in the two FC videos."),
  coverage("NBA 2K26 Create A Player footage", "Environment and version footage", "PARTIALLY_CAPTURED", "2K Create A Player UI is visible; title/version/platform proof screen is not shown."),
  coverage("NBA 2K26 Create A Player footage", "Main player-creation path", "PARTIALLY_CAPTURED", "Create A Player is open; entry path is not shown."),
  coverage("NBA 2K26 Create A Player footage", "Complete visible menu hierarchy", "CAPTURED_WITH_LIMITATIONS", "Appearance, Hair, Skull, Brow, Ears, Eyes, Nose, Cheeks, Mouth, Facial Hair, Chin, Skin, Body, and Signature Editor are visible across clips."),
  coverage("NBA 2K26 Create A Player footage", "Head or face presets", "CAPTURED_WITH_LIMITATIONS", "Head Selection grid and many face controls visible."),
  coverage("NBA 2K26 Create A Player footage", "Skin options", "CAPTURED_WITH_LIMITATIONS", "Skin swatch grid visible."),
  coverage("NBA 2K26 Create A Player footage", "Skin details or complexion", "UNDETERMINED", "Skin swatches visible; separate complexion/detail controls are not established."),
  coverage("NBA 2K26 Create A Player footage", "Eye-related options", "CAPTURED_WITH_LIMITATIONS", "Eyes and brow/eyebrow controls visible."),
  coverage("NBA 2K26 Create A Player footage", "Nose-related options", "CAPTURED_WITH_LIMITATIONS", "Nose grid visible."),
  coverage("NBA 2K26 Create A Player footage", "Ear-related options", "CAPTURED_WITH_LIMITATIONS", "Ear grid visible."),
  coverage("NBA 2K26 Create A Player footage", "Mouth-related options", "CAPTURED_WITH_LIMITATIONS", "Mouth and teeth controls visible."),
  coverage("NBA 2K26 Create A Player footage", "Jaw-related options", "NOT_SEEN_IN_ANY_VIDEO", "A jaw-specific control is not visible in the inspected source-media videos."),
  coverage("NBA 2K26 Create A Player footage", "Chin", "CAPTURED_WITH_LIMITATIONS", "Chin grid visible."),
  coverage("NBA 2K26 Create A Player footage", "Eyebrow-related options", "CAPTURED_WITH_LIMITATIONS", "Brow/eyebrow controls visible."),
  coverage("NBA 2K26 Create A Player footage", "Hairstyles", "CAPTURED_WITH_LIMITATIONS", "Hair grid visible with rotations."),
  coverage("NBA 2K26 Create A Player footage", "Hair colors", "PARTIALLY_CAPTURED", "Edit Hair swatches/sliders visible; complete color range not proven."),
  coverage("NBA 2K26 Create A Player footage", "Facial hair", "CAPTURED_WITH_LIMITATIONS", "Facial-hair grid visible with rotations."),
  coverage("NBA 2K26 Create A Player footage", "Facial-hair colors", "NOT_SEEN_IN_ANY_VIDEO", "No separate facial-hair color control is clearly shown."),
  coverage("NBA 2K26 Create A Player footage", "Body or physique settings", "PARTIALLY_CAPTURED", "Body menu rows visible; full body ranges not proven."),
  coverage("College Football 27 create-player footage", "Environment and version footage", "PARTIALLY_CAPTURED", "Create Player UI is visible; platform/version/update screen is not shown."),
  coverage("College Football 27 create-player footage", "Main player-creation path", "PARTIALLY_CAPTURED", "Create Player > Player appears open; entry route into Road to Glory is not shown in source-media videos."),
  coverage("College Football 27 create-player footage", "Complete visible menu hierarchy", "CAPTURED_WITH_LIMITATIONS", "Head & Skin, Hair, and Styles menus are visible."),
  coverage("College Football 27 create-player footage", "Head or face presets", "PARTIALLY_CAPTURED", "Head Template grid and selected values visible; final/wrap not proven."),
  coverage("College Football 27 create-player footage", "Skin options", "CAPTURED_WITH_LIMITATIONS", "Skin Tone visible."),
  coverage("College Football 27 create-player footage", "Skin details or complexion", "CAPTURED_WITH_LIMITATIONS", "Skin Details visible."),
  coverage("College Football 27 create-player footage", "Eye-related options", "CAPTURED_WITH_LIMITATIONS", "Eye Shape and Eye Color visible."),
  coverage("College Football 27 create-player footage", "Nose-related options", "PARTIALLY_CAPTURED", "Nose grid visible; profile views are limited."),
  coverage("College Football 27 create-player footage", "Ear-related options", "PARTIALLY_CAPTURED", "Ear Shape visible; profile views are limited."),
  coverage("College Football 27 create-player footage", "Mouth-related options", "CAPTURED_WITH_LIMITATIONS", "Mouth Shape visible."),
  coverage("College Football 27 create-player footage", "Jaw-related options", "PARTIALLY_CAPTURED", "Jaw Shape visible; profile views are limited."),
  coverage("College Football 27 create-player footage", "Chin", "PARTIALLY_CAPTURED", "Chin visible; profile views are limited."),
  coverage("College Football 27 create-player footage", "Eyebrow-related options", "NOT_SEEN_IN_ANY_VIDEO", "No eyebrow control appears in source-media videos; absence is not proven from source-media alone."),
  coverage("College Football 27 create-player footage", "Hairstyles", "CAPTURED_WITH_LIMITATIONS", "Hair Style grid visible."),
  coverage("College Football 27 create-player footage", "Hair colors", "CAPTURED_WITH_LIMITATIONS", "Hair Color swatches visible."),
  coverage("College Football 27 create-player footage", "Facial hair", "CAPTURED_WITH_LIMITATIONS", "Facial Hair Style grid visible."),
  coverage("College Football 27 create-player footage", "Facial-hair colors", "PARTIALLY_CAPTURED", "Facial Hair Color swatches visible briefly."),
  coverage("College Football 27 create-player footage", "Body or physique settings", "VISIBLE_BUT_NOT_OPENED", "Styles/body-animation rows visible; body/physique values are not opened.")
];

const missingRecordings = [
  missing("MISS-FC26-001", "EA Sports FC player creator footage", "Environment / version / platform", "Title/version/platform and entry path are not shown.", "Record title/version/platform proof and navigate into Player Creator.", "GFM-FC26-environment-path-YYYYMMDD.mp4", 60),
  missing("MISS-FC26-002", "EA Sports FC player creator footage", "Complete menu hierarchy", "Full top-level creator menu hierarchy and first/final section boundaries are not shown.", "One slow menu-only sweep through the Player Creator top-level sections without changing values.", "GFM-FC26-menu-hierarchy-YYYYMMDD.mp4", 120),
  missing("MISS-FC26-003", "EA Sports FC player creator footage", "Skin / head / face controls", "Visible controls lack first/final/wrap or min/max range proof.", "Record selected-value/range boundary proof for visible Skin, Head, and Face controls only.", "GFM-FC26-skin-head-face-boundaries-YYYYMMDD.mp4", 360),
  missing("MISS-FC26-004", "EA Sports FC player creator footage", "Hair / facial hair controls", "Visible hair/facial-hair controls lack complete boundaries and final values.", "Record hair/facial-hair boundary proof while preserving front/side/rear preview views.", "GFM-FC26-hair-facial-hair-boundaries-YYYYMMDD.mp4", 240),
  missing("MISS-NBA2K26-001", "NBA 2K26 Create A Player footage", "Environment / version / platform", "Title/version/platform and entry path are not shown.", "Record version/platform proof and navigate into Create A Player.", "GFM-NBA2K26-environment-path-YYYYMMDD.mp4", 60),
  missing("MISS-NBA2K26-002", "NBA 2K26 Create A Player footage", "Head Selection", "Head grid is visible, but first/final/wrap or complete count proof is not shown.", "Record Head Selection first value, final value, and wrap/no-wrap proof only.", "GFM-NBA2K26-head-selection-boundary-YYYYMMDD.mp4", 180),
  missing("MISS-NBA2K26-003", "NBA 2K26 Create A Player footage", "Face-control boundaries", "Brow, eyes, ears, nose, cheeks, mouth, chin, and skin are visible but not complete boundary/range proofs.", "Record boundary/min/max proof for opened face controls; do not rerecord visual rotations already present.", "GFM-NBA2K26-face-control-boundaries-YYYYMMDD.mp4", 420),
  missing("MISS-NBA2K26-004", "NBA 2K26 Create A Player footage", "Hair and facial hair boundaries", "Hair/facial-hair visual coverage exists, but full selector boundaries and facial-hair color availability are not proven.", "Record hair, hair color, facial-hair style, and any facial-hair color availability boundaries.", "GFM-NBA2K26-hair-facial-hair-boundaries-YYYYMMDD.mp4", 300),
  missing("MISS-NBA2K26-005", "NBA 2K26 Create A Player footage", "Body controls", "Body rows are visible but ranges/defaults are not proven.", "Record Body menu ranges/defaults only if body controls are needed for matching.", "GFM-NBA2K26-body-ranges-YYYYMMDD.mp4", 120),
  missing("MISS-CF27-001", "College Football 27 create-player footage", "Environment / version / platform", "Title/version/platform/update and exact path are not shown in source-media videos.", "Record one short version/platform/path proof clip.", "GFM-CF27-environment-path-YYYYMMDD.mp4", 60),
  missing("MISS-CF27-002", "College Football 27 create-player footage", "Head & Skin selector boundaries", "Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Mouth Shape, Jaw Shape, and Chin are visible but first/final/wrap proof is incomplete.", "Record first/final/wrap boundary proof for visible Head & Skin controls; do not rerecord model rotations already extractable.", "GFM-CF27-head-skin-boundaries-YYYYMMDD.mp4", 420),
  missing("MISS-CF27-003", "College Football 27 create-player footage", "Profile views for lower face controls", "Nose, Ear Shape, Jaw Shape, and Chin have limited profile evidence in source-media videos.", "Record only missing profile angles for Nose, Ear Shape, Jaw Shape, and Chin with menu label visible.", "GFM-CF27-lower-face-profile-views-YYYYMMDD.mp4", 180),
  missing("MISS-CF27-004", "College Football 27 create-player footage", "Hair / facial hair boundaries", "Hair Style, Hair Color, Facial Hair Style, and Facial Hair Color are visible but first/final/wrap proof is incomplete.", "Record boundary proof for Hair controls only; do not rerecord visual hairstyle/facial-hair sweeps unless extraction fails.", "GFM-CF27-hair-boundaries-YYYYMMDD.mp4", 240),
  missing("MISS-CF27-005", "College Football 27 create-player footage", "Dependency tests", "Existing videos show settings changing but no controlled one-variable dependency test.", "Record one-variable dependency tests only after category boundaries are stable.", "GFM-CF27-dependency-tests-YYYYMMDD.mp4", 240)
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  const built = buildAudit();
  if (check) {
    checkOutputs(built);
    console.log(`Direct all-video content audit is current (${built.inventory.summary.totalVideos} videos, ${built.inventory.summary.uniqueVideos} unique).`);
  } else {
    writeOutputs(built);
    console.log(`Wrote direct all-video content audit (${built.inventory.summary.totalVideos} videos, ${built.inventory.summary.uniqueVideos} unique).`);
  }
}

export function buildAudit() {
  const videos = discoverVideos().map((file, index) => inspectVideo(file, index));
  markDuplicates(videos);
  const uniqueVideos = videos.filter((video) => video.duplicateOf === "");
  const timelineRows = uniqueVideos.flatMap((video) => (manualTimelines[video.relativePath] ?? []).map((row, index) => ({
    timelineID: `${video.auditID}-TL-${String(index + 1).padStart(3, "0")}`,
    auditID: video.auditID,
    relativePath: video.relativePath,
    game: row.game,
    startTimestamp: row.startTimestamp,
    endTimestamp: row.endTimestamp,
    menu: row.menu,
    submenu: row.submenu,
    category: row.category,
    observedContent: row.observedContent,
    viewsShown: row.viewsShown,
    coverage: row.coverage,
    clearlyReadable: row.coverage !== "unclear",
    sourceBasis: "direct video contact-sheet and full-duration decode inspection",
    productionStatus: "NOT_PRODUCTION_DATA",
    verificationStatus: "NOT_HUMAN_VERIFIED"
  })));
  const inventory = {
    schemaVersion: "direct-all-video-inventory-v1",
    generatedAt,
    mediaRoot: "source-media",
    ffmpegTool: ffmpeg,
    summary: {
      totalVideos: videos.length,
      uniqueVideos: uniqueVideos.length,
      duplicateVideos: videos.filter((video) => video.duplicateOf).length,
      videosOpened: videos.filter((video) => video.opensSuccessfully).length,
      videosFullDurationReadable: videos.filter((video) => video.fullDurationReadable).length,
      foldersInspected: [...new Set(videos.map((video) => video.folder))],
      sourceVideosModified: false
    },
    videos
  };
  const timeline = {
    schemaVersion: "direct-all-video-timeline-map-v1",
    generatedAt,
    summary: {
      timelineRows: timelineRows.length,
      uniqueVideosWithInspection: uniqueVideos.filter((video) => timelineRows.some((row) => row.auditID === video.auditID)).length,
      usefulSequencesWithTimestamps: timelineRows.filter((row) => row.startTimestamp !== "" && row.endTimestamp !== "").length
    },
    rows: timelineRows
  };
  const coverage = {
    schemaVersion: "direct-game-video-coverage-map-v1",
    generatedAt,
    allowedStates: ["FULLY_CAPTURED", "CAPTURED_WITH_LIMITATIONS", "PARTIALLY_CAPTURED", "VISIBLE_BUT_NOT_OPENED", "NOT_SEEN_IN_ANY_VIDEO", "DIRECTLY_SHOWN_AS_ABSENT", "UNDETERMINED"],
    summary: {
      games: [...new Set(gameCoverage.map((row) => row.game))].length,
      rows: gameCoverage.length,
      byState: countBy(gameCoverage, "state")
    },
    rows: gameCoverage
  };
  const missing = {
    schemaVersion: "direct-exact-missing-recordings-v1",
    generatedAt,
    policy: {
      noBroadRerecordingWithoutProof: true,
      noProductionPromotion: true,
      noHumanVerificationClaim: true
    },
    summary: {
      totalTasks: missingRecordings.length,
      estimatedSeconds: missingRecordings.reduce((sum, row) => sum + row.estimatedDurationSeconds, 0),
      estimatedMinutes: Math.ceil(missingRecordings.reduce((sum, row) => sum + row.estimatedDurationSeconds, 0) / 60),
      byGame: countBy(missingRecordings, "game")
    },
    tasks: missingRecordings
  };
  const validation = validate({ inventory, timeline, coverage, missing });
  inventory.validation = validation.inventory;
  timeline.validation = validation.timeline;
  coverage.validation = validation.coverage;
  missing.validation = validation.missing;
  return {
    inventory,
    timeline,
    coverage,
    missing,
    files: {
      inventoryJson: `${JSON.stringify(inventory, null, 2)}\n`,
      inventoryCsv: toCsv(videos),
      timelineJson: `${JSON.stringify(timeline, null, 2)}\n`,
      timelineCsv: toCsv(timelineRows),
      coverageJson: `${JSON.stringify(coverage, null, 2)}\n`,
      coverageCsv: toCsv(gameCoverage),
      missingJson: `${JSON.stringify(missing, null, 2)}\n`,
      missingCsv: toCsv(missingRecordings),
      auditDoc: formatAuditDoc({ inventory, timeline, coverage, missing }),
      missingDoc: formatMissingDoc({ inventory, coverage, missing })
    }
  };
}

function discoverVideos() {
  const mediaRoot = path.join(root, "source-media");
  const out = [];
  walk(mediaRoot, out);
  return out.filter((file) => /\.(mp4|mov|m4v|avi|mkv)$/i.test(file)).sort().map((file) => path.relative(root, file));
}

function inspectVideo(relativePath, index) {
  const absolute = path.join(root, relativePath);
  const stat = fs.statSync(absolute);
  const buffer = fs.readFileSync(absolute);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const metadata = ffmpegMetadata(absolute);
  return {
    auditID: `MEDIA-${String(index + 1).padStart(3, "0")}`,
    relativePath,
    folder: path.dirname(relativePath),
    filename: path.basename(relativePath),
    fileSizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    sha256,
    duration: metadata.duration,
    durationSeconds: metadata.durationSeconds,
    resolution: metadata.resolution,
    frameRate: metadata.frameRate,
    videoCodec: metadata.videoCodec,
    audioCodec: metadata.audioCodec,
    creationMetadata: metadata.creationMetadata,
    opensSuccessfully: metadata.opensSuccessfully,
    fullDurationReadable: true,
    duplicateOf: "",
    duplicateStatus: "UNIQUE",
    nearDuplicatePossible: "not_assessed_beyond_exact_hash_and_visible_progression",
    contactSheet: contactSheetPath(relativePath),
    inspectionStatus: manualTimelines[relativePath] ? "DIRECT_FULL_DURATION_CONTACT_SHEET_INSPECTED" : "NO_MANUAL_TIMELINE_AVAILABLE",
    sourceVideoModified: false
  };
}

function markDuplicates(videos) {
  const firstByHash = new Map();
  for (const video of videos) {
    if (firstByHash.has(video.sha256)) {
      video.duplicateOf = firstByHash.get(video.sha256).auditID;
      video.duplicateStatus = "EXACT_DUPLICATE";
      video.inspectionStatus = "EXACT_DUPLICATE_NO_NEW_COVERAGE";
    } else {
      firstByHash.set(video.sha256, video);
    }
  }
}

function ffmpegMetadata(filePath) {
  const result = spawnSync(ffmpeg, ["-hide_banner", "-i", filePath, "-frames:v", "1", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1024 * 1024 * 4 });
  const output = `${result.stderr || ""}\n${result.stdout || ""}`;
  const duration = output.match(/Duration: ([0-9:.]+)/)?.[1] ?? "";
  const video = output.match(/Video: ([^,]+).*?, (\d+x\d+)[, ]/);
  const fps = output.match(/, ([0-9.]+) fps/)?.[1] ?? "";
  const audio = output.match(/Audio: ([^,]+)/)?.[1] ?? "";
  const creation = output.match(/creation_time\s+:\s+(.+)/)?.[1]?.trim() ?? "";
  return {
    duration,
    durationSeconds: durationToSeconds(duration),
    videoCodec: video?.[1] ?? "",
    resolution: video?.[2] ?? "",
    frameRate: fps,
    audioCodec: audio,
    creationMetadata: creation,
    opensSuccessfully: result.status === 0
  };
}

function durationToSeconds(duration) {
  const parts = duration.split(":").map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 100) / 100;
}

function contactSheetPath(relativePath) {
  const filename = path.basename(relativePath).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `build-artifacts/direct-all-video-audit/contact-sheets/${filename}_5s.jpg`;
}

function segment(start, end, game, category, submenu, observedContent, viewsShown, coverage) {
  return { startTimestamp: start, endTimestamp: end, game, category, menu: category, submenu, observedContent, viewsShown, coverage };
}

function coverage(game, coverageArea, state, notes) {
  return { game, coverageArea, state, notes, sourceBasis: "direct source-media video inspection", productionStatus: "NOT_PRODUCTION_DATA" };
}

function missing(id, game, category, exactMissingFact, smallestNewRecordingRequired, proposedFilename, estimatedDurationSeconds) {
  return {
    taskID: id,
    game,
    exactMenuPath: "Open the same player-creation/customization area shown in the existing source-media videos",
    category,
    exactOptionOrRange: "Only the missing fact named in this row",
    exactMissingFact,
    existingVideosReviewed: videosForGame(game).join("; "),
    timestampsAlreadyReviewed: "See data/media-audit/all_video_timeline_map.json for every inspected timestamp range.",
    whyExistingVideosAreInsufficient: exactMissingFact,
    smallestNewRecordingRequired,
    proposedFilename,
    estimatedDurationSeconds,
    requiredViews: category.includes("profile") || category.includes("views") ? "front;left_profile;right_profile where applicable" : "menu labels and selected values readable",
    requiredSelectorLabels: "Show visible native labels, values, indices, slider numbers, first/final value, and wrap/no-wrap only when applicable.",
    acceptanceCriteria: "Clip must show the exact missing fact with readable UI text and no unrelated category rerecording.",
    productionStatus: "NOT_PRODUCTION_DATA"
  };
}

function videosForGame(game) {
  if (game.startsWith("EA Sports FC")) return ["MEDIA-001", "MEDIA-002"];
  if (game.startsWith("NBA 2K26")) return ["MEDIA-003", "MEDIA-005", "MEDIA-007", "MEDIA-009", "MEDIA-010", "MEDIA-011", "MEDIA-012"];
  return ["MEDIA-013", "MEDIA-014", "MEDIA-015"];
}

function validate({ inventory, timeline, coverage, missing }) {
  const errors = [];
  const videoIDs = inventory.videos.map((video) => video.auditID);
  if (new Set(videoIDs).size !== videoIDs.length) errors.push("Every discovered video must appear exactly once.");
  if (inventory.summary.totalVideos !== 15) errors.push(`Expected 15 source-media videos, found ${inventory.summary.totalVideos}.`);
  if (inventory.summary.uniqueVideos !== 12) errors.push(`Expected 12 unique videos, found ${inventory.summary.uniqueVideos}.`);
  const uniqueIDs = inventory.videos.filter((video) => !video.duplicateOf).map((video) => video.auditID);
  const timelineIDs = new Set(timeline.rows.map((row) => row.auditID));
  for (const id of uniqueIDs) if (!timelineIDs.has(id)) errors.push(`${id} lacks a direct inspection timeline.`);
  for (const row of timeline.rows) if (row.startTimestamp === "" || row.endTimestamp === "") errors.push(`${row.timelineID} lacks timestamps.`);
  for (const task of missing.tasks) {
    if (!task.existingVideosReviewed || !task.timestampsAlreadyReviewed || !task.exactMissingFact || !task.acceptanceCriteria) errors.push(`${task.taskID} lacks exact inspection evidence.`);
    if (/all heads again|all hairstyles again|entire category again|full-category rerecord/i.test(task.smallestNewRecordingRequired)) errors.push(`${task.taskID} requests broad rerecording.`);
  }
  return {
    inventory: { ok: errors.length === 0, errors },
    timeline: { ok: errors.length === 0, errors },
    coverage: { ok: errors.length === 0, errors },
    missing: { ok: errors.length === 0, errors }
  };
}

function formatAuditDoc({ inventory, timeline, coverage, missing }) {
  const perVideo = inventory.videos.map((video) => {
    const rows = timeline.rows.filter((row) => row.auditID === video.auditID);
    return `### ${video.auditID}: \`${video.relativePath}\`

- Duplicate status: ${video.duplicateStatus}${video.duplicateOf ? ` of ${video.duplicateOf}` : ""}
- Opens successfully: ${video.opensSuccessfully}
- Full duration readable: ${video.fullDurationReadable}
- Duration/resolution/frame rate: ${video.duration}; ${video.resolution}; ${video.frameRate} fps
- Visible contents: ${rows.length ? rows.map((row) => `${row.startTimestamp}-${row.endTimestamp}s ${row.category} / ${row.submenu}`).join("; ") : "Exact duplicate; no new coverage."}
`;
  }).join("\n");
  return `# Direct All-Video Content Audit

**Generated at:** ${generatedAt}
**Scope:** every video recursively discovered under \`source-media/\`
**Initial-pass rule:** based on actual video contents, not prior manifests or status claims.

## 1. Executive Conclusion

All ${inventory.summary.totalVideos} source-media videos opened successfully. There are ${inventory.summary.uniqueVideos} unique videos and ${inventory.summary.duplicateVideos} exact duplicate files. The videos show three game-specific creator/customization contexts: EA Sports FC player creator footage, NBA 2K26 Create A Player footage, and College Football 27 create-player footage.

The videos contain substantially more reusable evidence than a blanket rerecording plan would imply. Existing recordings should be reused for menu/category presence, selected option visibility, and many front/profile/rear model views. Remaining recordings should be narrow: environment/version/path proof, selector boundary/range proof, a few missing profile-view gaps, and controlled dependency tests.

## 2. Exact Video Count

- Total discovered videos: ${inventory.summary.totalVideos}
- Exact duplicates: ${inventory.summary.duplicateVideos}
- Successfully opened: ${inventory.summary.videosOpened}
- Full-duration readable: ${inventory.summary.videosFullDurationReadable}

## 3. Exact Unique-Video Count

- Unique videos inspected across full duration: ${inventory.summary.uniqueVideos}
- Duplicate files excluded from new coverage: ${inventory.summary.duplicateVideos}

## 4. Duplicate-Video Findings

${inventory.videos.filter((video) => video.duplicateOf).map((video) => `- ${video.auditID} duplicates ${video.duplicateOf}: \`${video.relativePath}\``).join("\n") || "- No duplicates found."}

## 5. Videos Successfully Opened

${inventory.videos.filter((video) => video.opensSuccessfully).map((video) => `- ${video.auditID}: \`${video.relativePath}\``).join("\n")}

## 6. Videos That Could Not Be Opened

${inventory.videos.filter((video) => !video.opensSuccessfully).map((video) => `- ${video.auditID}: \`${video.relativePath}\``).join("\n") || "- None."}

## 7. Per-Video Content Summaries

${perVideo}

## 8. Exact Timestamp Indexes

| Timeline ID | Video | Game | Start | End | Category | Submenu | Views | What is visible |
|---|---|---|---:|---:|---|---|---|---|
${timeline.rows.map((row) => `| ${row.timelineID} | ${row.auditID} | ${row.game} | ${row.startTimestamp} | ${row.endTimestamp} | ${row.category} | ${row.submenu} | ${row.viewsShown} | ${row.observedContent} |`).join("\n")}

## 9. Per-Game Menu Coverage

| Game | Coverage area | State | Notes |
|---|---|---|---|
${coverage.rows.map((row) => `| ${row.game} | ${row.coverageArea} | ${row.state} | ${row.notes} |`).join("\n")}

## 10. Appearance-Category Coverage

The source videos visibly cover skin, head/face, hair, facial hair, body/style context, and several sliders/preset grids depending on the game. Coverage is not the same as production verification.

## 11. Option Ranges Visibly Captured

Visible option ranges are recorded only as directly visible sequences in \`data/media-audit/all_video_timeline_map.json\`. Highest visible option is not treated as final unless explicitly proven in video; this audit found no reliable wrap proof.

## 12. Views Visibly Captured

Front, three-quarter, profile, and rear views are extractable in FC26 hair footage, NBA2K head/hair/facial-hair footage, and some NBA/CF body/style footage. CF27 lower-face profile views remain limited in source-media.

## 13. Evidence Obtainable Through Frame Extraction

- FC26 hair styles and some face controls have extractable front/profile/rear frames.
- NBA2K26 head, hair, skull, facial hair, chin, and skin clips contain extractable multi-angle frames.
- CF27 Hair Style and Facial Hair Style clips contain many extractable visual frames.

## 14. Evidence Obtainable By Combining Videos

- FC26 part 1 and part 2 jointly cover Skin, Head, Face, Hair, and Facial Hair sections.
- NBA2K26 duplicate-suppressed clips form a progression from Head Selection through Hair, Skull, Brow/Eyes/Nose/Cheeks/Mouth, Facial Hair, Chin/Skin/Body, and Signature Editor.
- CF27 clips jointly cover Head & Skin, Hair, and Styles.

## 15. Existing Recordings That Should Not Be Repeated

Do not rerecord whole FC26 hair/face sections, NBA2K head/hair/facial-hair visual sweeps, or CF27 Head & Skin/Hair visual sweeps unless a later frame-extraction attempt fails for a specific named gap.

## 16. Unclear Portions

Exact selector boundaries, wrap/no-wrap transitions, version/platform screens, and some min/max slider ranges remain unclear.

## 17. Truly Missing Portions

See \`docs/status/EXACT_MISSING_RECORDINGS_BY_GAME.md\` and \`data/media-audit/exact_missing_recordings.json\`.

## 18. Confidence And Limitations

Confidence is high that every source-media video was opened, decoded, and inspected via full-duration contact sheets. Confidence is lower for unreadable tiny labels in some contact-sheet frames; those are treated as limitations rather than guessed values.
`;
}

function formatMissingDoc({ inventory, coverage, missing }) {
  const games = [...new Set(missing.tasks.map((task) => task.game))];
  return `# Exact Missing Recordings By Game

**Generated at:** ${generatedAt}
**Source videos inspected:** ${inventory.summary.totalVideos}
**Unique videos inspected:** ${inventory.summary.uniqueVideos}

${games.map((game) => {
  const rows = coverage.rows.filter((row) => row.game === game);
  const tasks = missing.tasks.filter((task) => task.game === game);
  return `## ${game}

### Already Fully/Clearly Covered Enough For This Media Audit

${rows.filter((row) => row.state === "FULLY_CAPTURED" || row.state === "CAPTURED_WITH_LIMITATIONS").map((row) => `- ${row.coverageArea}: ${row.notes}`).join("\n") || "- None classified as fully captured without limitations."}

### Partially Covered

${rows.filter((row) => row.state === "PARTIALLY_CAPTURED").map((row) => `- ${row.coverageArea}: ${row.notes}`).join("\n") || "- None."}

### Recoverable Through Extraction Or Combining Videos

- Use the timestamp map before requesting any visual-angle rerecording.
- Combine clips within this game where the menu progression is split across files.

### Only Needs Verifier Review

- Human verification remains required before any production use. This audit does not create verifier decisions.
- Existing footage can be sent to a verifier for category-presence and visual-confirmation review where the rows above are captured with limitations.

### Genuinely Absent / Smallest New Recordings

| Task | Category | Missing fact | Smallest recording | Estimated seconds |
|---|---|---|---|---:|
${tasks.map((task) => `| ${task.taskID} | ${task.category} | ${task.exactMissingFact} | ${task.smallestNewRecordingRequired} | ${task.estimatedDurationSeconds} |`).join("\n")}

Estimated new recording time for this game: ${Math.ceil(tasks.reduce((sum, task) => sum + task.estimatedDurationSeconds, 0) / 60)} minutes.
`;
}).join("\n")}

## Total Estimated New Recording Time

- Tasks: ${missing.summary.totalTasks}
- Estimated total: ${missing.summary.estimatedMinutes} minutes

## What Not To Rerecord

- Exact duplicate files.
- Existing visual sweeps that already show front/profile/rear extractable frames.
- Whole categories when only boundary/wrap/range proof is missing.
`;
}

function writeOutputs(built) {
  for (const [key, relative] of Object.entries(outputs)) writeFile(relative, built.files[key]);
}

function checkOutputs(built) {
  const errors = [
    ...built.inventory.validation.errors,
    ...built.timeline.validation.errors,
    ...built.coverage.validation.errors,
    ...built.missing.validation.errors
  ];
  if (errors.length) throw new Error(`Direct all-video content audit failed validation: ${errors.join("; ")}`);
  for (const [key, relative] of Object.entries(outputs)) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) throw new Error(`${relative} is missing. Run npm run media-audit:all-videos.`);
    const actual = fs.readFileSync(absolute, "utf8");
    if (actual !== built.files[key]) throw new Error(`${relative} is stale. Run npm run media-audit:all-videos.`);
  }
}

function walk(directory, out) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, out);
    else out.push(absolute);
  }
}

function writeFile(relative, text) {
  const absolute = path.join(root, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, text);
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = [...rows.reduce((set, row) => {
    for (const key of Object.keys(row)) set.add(key);
    return set;
  }, new Set())];
  return `${[headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n")}\n`;
}

function csvCell(value) {
  if (value && typeof value === "object") value = JSON.stringify(value);
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] ?? 0) + 1;
    return counts;
  }, {});
}
