# Wyatt Capture Master Plan

Generated: 2026-07-21T03:00:00-04:00

This plan is the current Phase 0 evidence-coverage control center for GameFace Match. It is research-only and does not make any College Football 27 catalog record production-ready.

## Current Coverage

- Research candidates: 92
- Primary approved with notes: 84
- Duplicate review required: 5
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0
- Capture assignments blocking completion: 15

## Recommended Recording Order

### Session 1: Environment, patch, canonical path, and menu boundary

- Capture IDs: GFM-CAP-011, GFM-CAP-012, GFM-CAP-013, GFM-CAP-001
- Expected duration: 15-25 minutes
- Why this order: Start with version/path facts before any catalog evidence, then end already positioned at Appearance.

### Session 2: Head Template count and order

- Capture IDs: GFM-CAP-002
- Expected duration: 15-30 minutes
- Why this order: Head count/order is the highest-impact catalog blocker and should be recorded separately from visual comparison.

### Session 3: Canonical slate and standardized head views

- Capture IDs: GFM-CAP-003, GFM-CAP-004
- Expected duration: 45-90 minutes
- Why this order: Lock stable conditions first, then capture head views without changing settings.

### Session 4: Head & Skin selectors

- Capture IDs: GFM-CAP-005, GFM-CAP-006
- Expected duration: 30-60 minutes
- Why this order: Color/texture/geometry selectors live together and can be captured from the same menu region.

### Session 5: Hair submenu and supported child controls

- Capture IDs: GFM-CAP-007, GFM-CAP-008, GFM-CAP-009, GFM-CAP-010
- Expected duration: 45-120 minutes depending on option counts
- Why this order: Open Hair once, prove child controls, then capture only directly visible supported controls.

### Session 6: Dependency and body/physique controls

- Capture IDs: GFM-CAP-014, GFM-CAP-015
- Expected duration: 30-75 minutes
- Why this order: Run after baseline selectors are known so dependency tests have a valid comparison point.

## Assignments

### GFM-CAP-011 — Environment: Console and game version evidence

- Priority: P0
- Status: EXISTING_RESEARCH_EVIDENCE_INCOMPLETE
- Owner: wyatt-skaggs
- Objective: Record direct evidence for Xbox console identity, game title/version screens, and account-safe environment context.
- Exact start screen: Xbox dashboard or College Football 27 title screen before entering Road to Glory.
- Exact action sequence: Start from the Xbox dashboard or title screen. | Open visible game title/version information if the game provides it. | Open console information screens only if they do not expose private account, serial, payment, or credential data. | Return to College Football 27 without changing game settings.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Game title or console/game context visible before navigation.
- Required ending proof: College Football 27 title or Road to Glory entry visible after environment proof.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-011_ENVIRONMENT_CONSOLE_GAME_VERSION_YYYYMMDD_partNN.mp4
- Acceptance criteria: Game title is visible. | Platform family is visible or directly supported by the recording context. | No private account, payment, serial-number, or credential details are exposed. | Unknown version fields remain unresolved if not visible.
- Recapture triggers: Version/build text unreadable. | Private account or credential information is exposed. | Only a filename, not visible screen evidence, supports the environment claim.
- Existing evidence summary: 1 research candidate(s) exist for related categories, with 0 incomplete evidence marker(s).

### GFM-CAP-012 — Environment: Patch/update evidence

- Priority: P0
- Status: EXISTING_RESEARCH_EVIDENCE_INCOMPLETE
- Owner: wyatt-skaggs
- Objective: Record direct evidence of installed game update or patch state without guessing a version.
- Exact start screen: Xbox game tile, game management screen, or in-game version/update screen if visible.
- Exact action sequence: Open the least private screen that shows update status, installed version, or latest-update state. | Pause long enough for patch/update fields to be readable. | If no version or patch is visible, record the screen proving that it is unavailable in that path.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Screen title or game tile visible before opening update/version details.
- Required ending proof: Patch/update/version state visible or visibly unavailable.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-012_PATCH_UPDATE_STATE_YYYYMMDD_partNN.mp4
- Acceptance criteria: Visible patch/update/version evidence is readable when available. | No patch value is inferred from date, filename, or memory. | If unavailable, the unavailable state is captured directly.
- Recapture triggers: Patch/update text unreadable. | Evidence shows a different game or path. | Patch state is inferred rather than visible.
- Existing evidence summary: 1 research candidate(s) exist for related categories, with 0 incomplete evidence marker(s).

### GFM-CAP-013 — Creation paths: Exact canonical Road to Glory creation path

- Priority: P0
- Status: EXISTING_RESEARCH_EVIDENCE_INCOMPLETE
- Owner: wyatt-skaggs
- Objective: Re-record the canonical Road to Glory Custom creation path with direct timestamps and no missing transition steps.
- Exact start screen: College Football 27 main interface before Road to Glory.
- Exact action sequence: Navigate Road to Glory > setup > journey type selection. | Select the visible Custom/Create Player path only if shown. | Proceed through position, QB selection, Create Player, Player, Appearance, Head & Skin, and Hair menu visibility. | Pause on each meaningful transition.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Road to Glory entry path visible from the main game interface.
- Required ending proof: Create Player > Player > Appearance path and Head & Skin/Hair menu visibility shown.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-013_RTG_CREATION_PATH_YYYYMMDD_partNN.mp4
- Acceptance criteria: Every meaningful menu transition is visible. | Mode, creation path, player base, position, and Appearance entry are directly supported. | Unknown version, entitlement, and later-editability fields remain unresolved unless visible.
- Recapture triggers: A transition is skipped. | A selected path is hidden by blur or overlay. | The clip begins after the canonical path decision point.
- Existing evidence summary: 1 research candidate(s) exist for related categories, with 1 incomplete evidence marker(s).

### GFM-CAP-001 — Appearance menu hierarchy: Menu beginning and ending boundaries

- Priority: P0
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Prove first and final visible Appearance, Head & Skin, and Hair menu boundaries without claiming absent categories.
- Exact start screen: Create Player > Player > Appearance.
- Exact action sequence: Pause on Appearance. | Open Head & Skin and slowly traverse every visible row. | Show any scroll continuation and final boundary. | Return to Appearance and show the Hair row and any additional visible rows.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Appearance entry visible from Player tab.
- Required ending proof: Final Head & Skin row and final visible Appearance row shown with no uninspected scroll region hidden.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-001_APPEARANCE_HEADSKIN_BOUNDARY_YYYYMMDD_partNN.mp4
- Acceptance criteria: Menu titles and row labels are readable. | First and final visible menu rows are proven. | Rows beyond visible Chin or beyond visible Hair remain unknown unless boundary evidence proves otherwise.
- Recapture triggers: Menu labels unreadable. | Scroll boundary not shown. | Any row is skipped or hidden by transition blur.
- Existing evidence summary: 93 research candidate(s) exist for related categories, with 13 incomplete evidence marker(s).

### GFM-CAP-002 — Head templates: Complete Head Template count and native order

- Priority: P0
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Record two complete Head Template count/order passes with native Face number visible on each selected value.
- Exact start screen: Create Player > Player > Appearance > Head & Skin > Head Template.
- Exact action sequence: Start at the first available Head Template value. | Move one selected value at a time while the native number remains visible. | Pause on every value. | Continue to the final value and show wrap/no-wrap proof. | Repeat the count a second time or visibly document any discrepancy.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: First selector value shown directly.
- Required ending proof: Final selector value plus wrap or no-wrap proof shown directly.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-002_HEAD_TEMPLATE_COUNT_YYYYMMDD_partNN.mp4
- Acceptance criteria: Two count passes agree or a discrepancy is clearly captured. | Native order is preserved without skipped selected values. | Face 12 overlap remains continuity evidence only. | Face 29 is not treated as final unless boundary proof shows that.
- Recapture triggers: Native number hidden. | Selected value skipped. | Ending boundary not shown. | Transition frame used as selected evidence.
- Existing evidence summary: 26 research candidate(s) exist for related categories, with 1 incomplete evidence marker(s).

### GFM-CAP-003 — Canonical capture conditions: Head and skin dependency baseline

- Priority: P0
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Record the stable appearance slate used for later production-quality comparison captures.
- Exact start screen: Create Player > Player > Appearance > Head & Skin.
- Exact action sequence: Record the current native value for every visible Head & Skin control. | Record whether eye black, obstructive hair, facial hair, hats/headwear, or other blockers can be removed. | Do not invent unavailable settings.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Head & Skin root visible before changing any values.
- Required ending proof: Stable slate shown unchanged across several option changes.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-003_CANONICAL_APPEARANCE_LOCK_YYYYMMDD_partNN.mp4
- Acceptance criteria: Only visible native settings or explicit unavailable states are recorded. | Obstruction-removal attempts are directly supported. | The slate can be repeated by a verifier.
- Recapture triggers: A canonical setting is inferred. | Slate changes without documentation. | Obstruction-removal controls are ambiguous.
- Existing evidence summary: Existing capture request GFM-CAP-003 is open and not yet satisfied.

### GFM-CAP-004 — Head templates: Standardized head views

- Priority: P0
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Capture production-comparison candidate views for every head template after count/order evidence is complete.
- Exact start screen: Create Player > Player > Appearance > Head & Skin > Head Template.
- Exact action sequence: Use the canonical slate from GFM-CAP-003. | For each selected head, wait for the preview to load completely. | Capture menu proof plus front, left three-quarter, left profile, right three-quarter, right profile, and rear if available. | Preserve native order.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Canonical slate and first head value shown.
- Required ending proof: Final captured head value and final required view shown.
- Required camera views: MENU | FRONT | LEFT_3Q | LEFT_PROFILE | RIGHT_3Q | RIGHT_PROFILE | REAR_IF_AVAILABLE
- Filename pattern: GFM-CAP-004_HEAD_TEMPLATE_STANDARDIZED_VIEWS_YYYYMMDD_partNN.mp4
- Acceptance criteria: Every captured head uses the same slate. | Required views are not transition frames. | Obstructions and missing views are logged instead of hidden.
- Recapture triggers: Preview not fully loaded. | Framing/zoom changes materially. | Eye black or hair/facial-hair obstruction remains unexplained. | Required view missing.
- Existing evidence summary: 26 research candidate(s) exist for related categories, with 1 incomplete evidence marker(s).

### GFM-CAP-005 — Head & Skin controls: Skin tone, skin details, eye shape, and eye color boundaries

- Priority: P0
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Record direct first-to-final selector evidence for Skin Tone, Skin Details, Eye Shape, and Eye Color.
- Exact start screen: Create Player > Player > Appearance > Head & Skin.
- Exact action sequence: Open Skin Tone, Skin Details, Eye Shape, and Eye Color one at a time. | For each control, show first value, every selected value, final value, default when visible, and wrap/no-wrap proof. | Pause on each value until labels and preview are readable.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Each control's selector title and first available value shown.
- Required ending proof: Each control's final value plus wrap/no-wrap proof shown.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-005_HEADSKIN_COLOR_TEXTURE_EYES_YYYYMMDD_partNN.mp4
- Acceptance criteria: Skin Tone boundaries are directly shown. | Skin Details boundaries are directly shown. | Eye Shape boundaries are directly shown. | Eye Color boundaries are directly shown. | No tone, detail, eye shape, or eye color is inferred from neighboring thumbnails.
- Recapture triggers: Label/index unreadable. | First or final boundary missing. | Default not visible and not documented as unavailable. | Character preview not loaded.
- Existing evidence summary: 48 research candidate(s) exist for related categories, with 48 incomplete evidence marker(s).

### GFM-CAP-006 — Head & Skin geometry controls: Nose, ear, mouth, jaw, chin, and any additional visible geometry controls

- Priority: P0
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Record direct selector evidence for Nose, Ear Shape, Mouth Shape, Jaw Shape, Chin, and any additional Head & Skin controls directly visible.
- Exact start screen: Create Player > Player > Appearance > Head & Skin.
- Exact action sequence: Open Nose, Ear Shape, Mouth Shape, Jaw Shape, and Chin one at a time when visible. | For each control, show first value, every selected value, final value, default when visible, and wrap/no-wrap proof. | If an expected control is absent, show the menu boundary rather than inventing it.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Each opened control's selector title and first available value shown.
- Required ending proof: Each opened control's final value plus wrap/no-wrap proof shown.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-006_HEADSKIN_GEOMETRY_CONTROLS_YYYYMMDD_partNN.mp4
- Acceptance criteria: Nose boundaries are directly shown. | Ear Shape boundaries are directly shown. | Mouth, Jaw, and Chin controls are opened only if directly visible. | Absent controls are not claimed absent unless menu boundary proof supports it.
- Recapture triggers: Selector boundary missing. | Native label/index hidden. | Control inferred from requirements rather than visible game menu.
- Existing evidence summary: 19 research candidate(s) exist for related categories, with 20 incomplete evidence marker(s).

### GFM-CAP-007 — Hair menu hierarchy: Hair submenu child controls

- Priority: P1
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Open Hair and map every visible child control without assuming hairstyles, colors, or facial hair exist.
- Exact start screen: Create Player > Player > Appearance > Hair.
- Exact action sequence: Open Hair from Appearance. | Pause on every visible child row. | Show first and final child-control boundary plus any scroll continuation. | Do not enter child controls until hierarchy is readable.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Hair row visible from Appearance and opened directly.
- Required ending proof: Final Hair child row and scroll boundary shown.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-007_HAIR_SUBMENU_BOUNDARY_YYYYMMDD_partNN.mp4
- Acceptance criteria: Hair child controls are directly observed. | Unknown child controls remain unknown if no boundary proof exists. | No hairstyle, hair-color, facial-hair, or facial-hair-color value is created from this hierarchy-only capture.
- Recapture triggers: Hair submenu not opened. | Child rows unreadable. | Scroll boundary hidden.
- Existing evidence summary: 109 research candidate(s) exist for related categories, with 30 incomplete evidence marker(s).

### GFM-CAP-008 — Hairstyles: Hairstyle selector values

- Priority: P1
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Catalog hairstyle values only if a native hairstyle control is directly visible in Hair.
- Exact start screen: Create Player > Player > Appearance > Hair.
- Exact action sequence: Open the native hairstyle control only if it is directly visible. | Show first value, every selected value, final value, and wrap/no-wrap proof. | Capture front, three-quarter, profile, and rear views where available.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Native hairstyle control label visible before opening.
- Required ending proof: Final hairstyle value plus boundary/wrap proof shown.
- Required camera views: MENU | FRONT | LEFT_3Q | LEFT_PROFILE | REAR | RIGHT_PROFILE | RIGHT_3Q
- Filename pattern: GFM-CAP-008_HAIRSTYLES_YYYYMMDD_partNN.mp4
- Acceptance criteria: The hairstyle control is direct evidence, not assumed. | Native order is preserved. | Researcher visual metadata stays separate from native labels.
- Recapture triggers: Hairstyle control label absent. | Rear/side evidence missing where required. | Selected value skipped.
- Existing evidence summary: 1 research candidate(s) exist for related categories, with 2 incomplete evidence marker(s).

### GFM-CAP-009 — Hair colors: Hair-color selector values

- Priority: P1
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Catalog hair colors only if a native hair-color control is directly visible in Hair.
- Exact start screen: Create Player > Player > Appearance > Hair.
- Exact action sequence: Open the native hair-color control only if directly visible. | Show default, first value, every selected value, final value, and wrap/no-wrap proof. | Record whether eyebrow or facial-hair colors change automatically only if visible.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Native hair-color control label visible before opening.
- Required ending proof: Final hair-color value plus boundary/wrap proof shown.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-009_HAIR_COLORS_YYYYMMDD_partNN.mp4
- Acceptance criteria: Native labels or indices are preserved. | No generic color name replaces an unreadable native value. | Automatic dependency claims are supported by visible evidence.
- Recapture triggers: Color label/index unreadable. | Default or boundary not shown. | Dependency inferred.
- Existing evidence summary: 9 research candidate(s) exist for related categories, with 12 incomplete evidence marker(s).

### GFM-CAP-010 — Facial hair: Facial-hair and facial-hair-color selector values

- Priority: P1
- Status: REQUESTED_NOT_CAPTURED
- Owner: wyatt-skaggs
- Objective: Catalog facial hair and facial-hair colors only if native controls are directly visible in Hair.
- Exact start screen: Create Player > Player > Appearance > Hair.
- Exact action sequence: Open native facial-hair control if directly visible and record None if present. | Show every selected facial-hair value in native order with menu evidence and required face views. | Open facial-hair color only if directly visible and record boundaries/default/wrap evidence.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Native facial-hair or facial-hair-color control label visible before opening.
- Required ending proof: Final selected value plus boundary/wrap proof shown for each opened control.
- Required camera views: MENU | FRONT | LEFT_3Q | LEFT_PROFILE | RIGHT_3Q | RIGHT_PROFILE
- Filename pattern: GFM-CAP-010_FACIAL_HAIR_AND_COLORS_YYYYMMDD_partNN.mp4
- Acceptance criteria: None is recorded only if directly present. | Coverage metadata is researcher-applied and separate from native labels. | Facial-hair color dependencies are directly shown or left unresolved.
- Recapture triggers: Control not visible. | None option unclear. | Side/profile evidence missing. | Color relationship inferred.
- Existing evidence summary: 15 research candidate(s) exist for related categories, with 15 incomplete evidence marker(s).

### GFM-CAP-014 — Dependencies: Head and skin dependency tests

- Priority: P1
- Status: EXISTING_RESEARCH_EVIDENCE_INCOMPLETE
- Owner: wyatt-skaggs
- Objective: Run controlled dependency checks for head/skin controls against platform, mode, creation path, head, skin presentation, account state, and entitlement state only where visible.
- Exact start screen: Create Player > Player > Appearance > Head & Skin after baseline controls are documented.
- Exact action sequence: Record the baseline count/order for one control. | Change one variable at a time only when the game directly exposes that variable. | Return to the same control and record whether count, order, labels, or availability changed.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Baseline variable and control state visible.
- Required ending proof: Changed-variable state and comparison result visible.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-014_HEADSKIN_DEPENDENCY_TESTS_YYYYMMDD_partNN.mp4
- Acceptance criteria: Only one variable changes per test. | Observed effect is recorded with direct evidence. | Unexecuted tests remain not tested.
- Recapture triggers: More than one variable changed. | Baseline not visible. | Result inferred.
- Existing evidence summary: 6 research candidate(s) exist for related categories, with 2 incomplete evidence marker(s).

### GFM-CAP-015 — Body and physique controls: Height, weight, body type, build, physique, and restrictions

- Priority: P1
- Status: EXISTING_RESEARCH_EVIDENCE_INCOMPLETE
- Owner: wyatt-skaggs
- Objective: Record body-related controls and determine whether they affect appearance availability or recommendation instructions.
- Exact start screen: Create Player setup path or Player tab where height, weight, body type, build, or physique controls are visible.
- Exact action sequence: Open each directly visible body-related control. | Record native labels, ranges, defaults, restrictions, and dependencies. | Return to Appearance only if needed to test whether availability changed.
- What must remain unchanged: Do not change unrelated player setup values during the assignment. | Keep native labels, indices, or visible unavailable states on screen. | Do not rename, trim, crop, or recompress the master recording after capture.
- Required beginning proof: Native body-related control label visible.
- Required ending proof: Control boundaries/ranges or visible unavailable state captured.
- Required camera views: FULL_MENU_OR_SELECTOR
- Filename pattern: GFM-CAP-015_BODY_PHYSIQUE_CONTROLS_YYYYMMDD_partNN.mp4
- Acceptance criteria: Height, weight, body type, build, and physique are cataloged only when directly visible. | Desired athlete physique remains separate from facial measurement. | Availability effects are tested, not assumed.
- Recapture triggers: Range boundaries hidden. | Control inferred from product requirements. | Appearance dependency not directly tested.
- Existing evidence summary: 5 research candidate(s) exist for related categories, with 1 incomplete evidence marker(s).

## One-Page Recording Checklist

1. Put the next recording in `data/phase-zero/intake/pending/` after capture.
2. Include the `GFM-CAP-###` ID in the filename.
3. Keep native labels or indices visible.
4. Pause on first value, every selected value, final value, and wrap/no-wrap proof.
5. Do not edit, trim, rename, or recompress the master file.
6. Do not record private account, payment, serial-number, or credential screens.
7. Run `npm run phase-zero:intake -- --path data/phase-zero/intake/pending` after files are placed.

