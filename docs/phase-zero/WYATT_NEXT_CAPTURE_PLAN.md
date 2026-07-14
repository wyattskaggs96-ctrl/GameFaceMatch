# Wyatt Next Capture Plan

**Status:** Phase 0 capture-request plan  
**Generated:** 2026-07-14T03:30:00-04:00  
**Data class:** PHASE_ZERO_CAPTURE_REQUESTS - NOT PRODUCTION DATA  
**Production recommendations enabled:** No

This plan is the smallest complete capture set currently supported by the repository artifacts. It is not a generic list. It consolidates the current video inventory, timeline map, menu map, research catalogs, recapture queues, issues register, and quality reports into executable captures for Wyatt.

Permanent rule: if the game screen differs from this plan, record what is visible and create an issue. Do not invent a missing option, label, count, path, or dependency.

## Source Artifacts

- `data/phase-zero/video_inventory.json`
- `data/phase-zero/video_timeline.json`
- `data/phase-zero/menu_map.research.json`
- `data/phase-zero/heads.research.json`
- `data/phase-zero/additional_attributes.research.json`
- `data/phase-zero/head_template_recapture_list.research.json`
- `data/phase-zero/additional_attributes_recapture_requirements.research.json`
- `data/phase-zero/issues_register.research.json`
- `data/research/cf27/reports/authoritative-recapture-queue/authoritative_recapture_queue.json`
- `data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json`

## Summary

- Capture requests: 21
- P0 requests now: 12
- P1 requests: 7
- P2 requests: 1
- Current footage can be reused for research provenance, menu/order evidence, and partial labels where noted.
- Current footage cannot be treated as independently verified production catalog imagery.

## 1. Must Capture Before Phase 0 Catalog Completion

### GFM-CAP-001 - Environment and game-version evidence

- **Priority:** P0
- **Exact menu path:** Xbox Settings > System > Console info; Xbox Settings > System > Updates; Xbox Home > College Football 27 tile > Manage game and add-ons; College Football 27 title/version screen if visible
- **Starting option:** Console info screen
- **Ending option:** Installed game/update/entitlement or title-version screen
- **Perform two counts:** No
- **Native index must remain visible:** No
- **Required views:** READABLE_FULL_SCREEN_SYSTEM_OR_GAME_CONTEXT
- **Rear view required:** No
- **Canonical head:** Not applicable
- **Canonical hairstyle:** Not applicable
- **Facial-hair setting:** Not applicable
- **Skin setting:** Not applicable
- **Body setting:** Not applicable
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 4-7 minutes total, split only to avoid exposing private account details
- **Video or screenshots:** Video preferred; screenshots acceptable for static version/update screens if filenames preserve order
- **Existing footage can be reused:** Yes for Road to Glory and appearance research context, but not for exact console model, OS, game executable, patch, edition, entitlement, storefront, or update-state proof.
- **Why required:** Current evidence cannot prove the exact Xbox environment, game executable, patch/update state, edition, entitlement, or account context required for a versioned catalog release.
- **Acceptance criteria:**
  - Console family/model and console OS/update state are visible without serial numbers or secrets.
  - Game executable/version and installed update state are visible or explicitly shown unavailable.
  - Edition, entitlement/add-on, online/offline, and EA account state are recorded only where safely visible.
- **Related queue items:** RQ-001, RQ-002, RQ-003

### GFM-CAP-002 - Creation path and body setup

- **Priority:** P0
- **Exact menu path:** College Football 27 main interface > Road to Glory > Road to Glory setup > Journey type selection > Position selection > QB selection > Create Player > Player
- **Starting option:** Road to Glory entry from the main interface
- **Ending option:** Last visible Player/body/height/weight/physique control reached in this path
- **Perform two counts:** No
- **Native index must remain visible:** Yes
- **Required views:** MENU_PATH, PLAYER_TAB_CONTROLS, DEFAULT_OR_BOUNDARY_VALUES_WHERE_VISIBLE
- **Rear view required:** No
- **Canonical head:** Current path evidence only; do not alter head for this capture
- **Canonical hairstyle:** Current path evidence only
- **Facial-hair setting:** Current path evidence only
- **Skin setting:** Current path evidence only
- **Body setting:** Record exact visible body, height, weight, physique, handedness, position, and archetype values; leave unknown when not visible
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 6-10 minutes
- **Video or screenshots:** Video preferred because path transitions matter
- **Existing footage can be reused:** Partially. Existing footage supports the observed path, but unresolved body/archetype/handedness/editability fields remain.
- **Why required:** The catalog must tie appearance recommendations to a reproducible creation path and player setup context.
- **Acceptance criteria:**
  - Every transition from Road to Glory to Appearance entry is visible.
  - Position, archetype, handedness, height, weight, body type, and physique controls are recorded when visible.
  - Unavailable or unobserved fields remain unresolved rather than inferred.
- **Related queue items:** RQ-017, RQ-018

### GFM-CAP-003 - Appearance menu hierarchy

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin, then Create Player > Player > Appearance > Hair
- **Starting option:** Appearance entry
- **Ending option:** Last visible Head & Skin and Hair submenu item after any scrolling continuation
- **Perform two counts:** No
- **Native index must remain visible:** Yes
- **Required views:** FULL_MENU_LIST, SCROLL_CONTINUATION, LOCK_OR_WARNING_STATE_IF_VISIBLE
- **Rear view required:** No
- **Canonical head:** Do not change head; menu-map capture only
- **Canonical hairstyle:** Do not change hairstyle; menu-map capture only
- **Facial-hair setting:** Do not change facial hair; menu-map capture only
- **Skin setting:** Do not change skin; menu-map capture only
- **Body setting:** No body change
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 5-8 minutes
- **Video or screenshots:** Video preferred; screenshots may supplement long static menu lists
- **Existing footage can be reused:** Partially. Existing footage proves Head & Skin and Hair entries, but every current menu record is still partial.
- **Why required:** All catalog records need stable parent menus, native order, control type, scrolling evidence, locks, and warnings.
- **Acceptance criteria:**
  - Head & Skin submenu order is fully visible from first through final item.
  - Hair submenu order is fully visible from first through final item.
  - Any locks, hidden states, warnings, or scroll continuations are recorded.
- **Related queue items:** RQ-009, RQ-010, RQ-011, RQ-012

### GFM-CAP-004 - Head Template count and native order

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Head Template
- **Starting option:** Face 1 if visible as the first selected Head Template value; otherwise the first visible selected value
- **Ending option:** Proven final selected Head Template value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU_LABEL_OR_INDEX_FOR_EVERY_SELECTED_VALUE, FIRST_VALUE_PROOF, FINAL_VALUE_PROOF, WRAP_OR_NO_WRAP_PROOF
- **Rear view required:** No
- **Canonical head:** Head Template value changes are the subject of this capture
- **Canonical hairstyle:** No need to standardize; count/order evidence only
- **Facial-hair setting:** No need to standardize; count/order evidence only
- **Skin setting:** No need to standardize; count/order evidence only
- **Body setting:** Keep the same player setup throughout
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 20-35 minutes if both counts are continuous; split with overlap if needed
- **Video or screenshots:** Video strongly preferred
- **Existing footage can be reused:** Yes for Face 1-31 research observations and Face 12 overlap; not enough to prove skipped numbers, final count, or wrap.
- **Why required:** The current head-template evidence has skipped numbers, duplicate observations, and no proven final selector boundary.
- **Acceptance criteria:**
  - Two complete selected-value passes are recorded.
  - Face 12 overlap is preserved if clips split.
  - Skipped values inside the currently observed range are resolved as selected, skipped by traversal, unavailable, or recording error.
  - No Face count is claimed until final/wrap evidence is visible.
- **Related queue items:** RQ-004, RQ-005, RQ-019

### GFM-CAP-013 - Mouth, Jaw, Chin face-shape controls

- **Priority:** P1
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Mouth Shape; then Jaw Shape; then Chin
- **Starting option:** First visible selected value in Mouth Shape, then first visible selected value in Jaw Shape, then first visible selected value in Chin
- **Ending option:** Final value and boundary/wrap for each of Mouth Shape, Jaw Shape, and Chin
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT, LEFT_3Q_OR_PROFILE_WHERE_RELEVANT, RIGHT_3Q_OR_PROFILE_WHERE_RELEVANT
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 15-30 minutes
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** Only for proof that these menu labels exist in the Head & Skin hierarchy; no option values are currently cataloged.
- **Why required:** Mouth, Jaw, and Chin are required geometry controls but have no option records yet.
- **Acceptance criteria:**
  - Every selected value is directly visible and ordered.
  - Each category has first/final/wrap proof.
  - Values are not inferred from neighboring thumbnails or expected game behavior.
- **Related queue items:** RQ-009, RQ-010, RQ-011, RQ-019

### GFM-CAP-014 - Hair menu hierarchy

- **Priority:** P1
- **Exact menu path:** Create Player > Player > Appearance > Hair
- **Starting option:** Hair menu entry
- **Ending option:** Last visible Hair submenu item after scrolling
- **Perform two counts:** No
- **Native index must remain visible:** Yes
- **Required views:** FULL_MENU_LIST, SCROLL_CONTINUATION, LOCK_OR_WARNING_STATE_IF_VISIBLE
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Do not change values; menu-map capture only
- **Facial-hair setting:** Do not change values; menu-map capture only
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 3-6 minutes
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** Only for confirming Hair menu entry exists; submenu hierarchy is not complete.
- **Why required:** Hairstyles, hair colors, facial hair, and facial-hair colors need exact native menu location before option capture.
- **Acceptance criteria:**
  - Every visible Hair submenu/control is readable in native order.
  - Locks, dependencies, hidden controls, or missing controls are recorded without assumptions.
- **Related queue items:** RQ-012

### GFM-CAP-015 - Hairstyles

- **Priority:** P1
- **Exact menu path:** Create Player > Player > Appearance > Hair > exact visible hairstyle control recorded in GFM-CAP-014
- **Starting option:** First visible selected hairstyle value
- **Ending option:** Final selected hairstyle value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q
- **Rear view required:** Yes
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Hairstyle value changes are the subject of this capture
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 20-45 minutes depending on count
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** No complete hairstyle catalog evidence exists.
- **Why required:** Hairstyles are required appearance recommendations and can obstruct head/ear evidence.
- **Acceptance criteria:**
  - Every selected hairstyle has readable menu evidence and required angle views.
  - Rear view is captured for hair shape/length.
  - Researcher-applied visual metadata stays separate from native labels.
- **Related queue items:** RQ-013, RQ-019

### GFM-CAP-016 - Hair colors

- **Priority:** P1
- **Exact menu path:** Create Player > Player > Appearance > Hair > exact visible hair-color control recorded in GFM-CAP-014
- **Starting option:** First visible selected hair-color value
- **Ending option:** Final selected hair-color value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT_REPRESENTATIVE_FRAME_PER_VALUE, LEFT_3Q_IF_NEEDED_FOR_VISIBILITY
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** One canonical hairstyle that shows color clearly
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 8-15 minutes
- **Video or screenshots:** Video preferred; screenshots useful for subtle color differences
- **Existing footage can be reused:** No complete hair-color evidence exists.
- **Why required:** Hair color is a separate recommendation surface and must not be guessed from generic color names.
- **Acceptance criteria:**
  - Every selected color has native label/index evidence and stable visual frame.
  - Lighting remains constant.
  - Unreadable native labels are queued for manual review.
- **Related queue items:** RQ-014, RQ-019

### GFM-CAP-017 - Facial hair

- **Priority:** P1
- **Exact menu path:** Create Player > Player > Appearance > Hair > exact visible facial-hair control recorded in GFM-CAP-014
- **Starting option:** None if visibly present; otherwise first visible selected facial-hair value
- **Ending option:** Final selected facial-hair value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** Facial-hair value changes are the subject of this capture
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 15-30 minutes depending on count
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** No complete facial-hair catalog evidence exists.
- **Why required:** Facial-hair presence and style are required appearance recommendations and must include None if available.
- **Acceptance criteria:**
  - None and every selected option are directly recorded where present.
  - Coverage metadata can be reviewed from stable front and side views.
  - Dependencies or locked states are documented.
- **Related queue items:** RQ-015, RQ-019

### GFM-CAP-018 - Facial-hair colors

- **Priority:** P1
- **Exact menu path:** Create Player > Player > Appearance > Hair > exact visible facial-hair-color control recorded in GFM-CAP-014
- **Starting option:** First visible selected facial-hair-color value
- **Ending option:** Final selected facial-hair-color value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT_REPRESENTATIVE_FRAME_PER_VALUE, LEFT_3Q_IF_NEEDED_FOR_VISIBILITY
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** One visible facial-hair option that makes color review possible
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 8-15 minutes
- **Video or screenshots:** Video preferred; screenshots useful for subtle colors
- **Existing footage can be reused:** No complete facial-hair-color evidence exists.
- **Why required:** Facial-hair color may be independent from hair color and cannot be assumed.
- **Acceptance criteria:**
  - Control is captured if available, or absence is visibly proven.
  - Every selected value has readable native evidence and stable visual frame.
- **Related queue items:** RQ-016, RQ-019

## 2. Must Recapture Because Current Evidence Is Inadequate

### GFM-CAP-005 - Canonical comparison setup lock

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin plus Create Player > Player > Appearance > Hair controls that visibly affect eye black, hairstyle obstruction, or facial hair
- **Starting option:** Current visible obstruction-affecting setting, if present
- **Ending option:** Locked canonical state or visible proof that the control is unavailable
- **Perform two counts:** No
- **Native index must remain visible:** Yes
- **Required views:** MENU_LABEL, FRONT_PREVIEW, LEFT_3Q_IF_NEEDED, RIGHT_3Q_IF_NEEDED
- **Rear view required:** No
- **Canonical head:** Use one stable head only for setup proof; record its visible label/index if shown
- **Canonical hairstyle:** Controlled short or least-obstructing hairstyle if a visible control exists; do not invent the label
- **Facial-hair setting:** None if visibly available; otherwise record the visible limitation
- **Skin setting:** Keep current skin setting unless changing is required to remove obstruction; record visible value only
- **Body setting:** Keep unchanged from the creation path
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 5-8 minutes
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** No for production-comparison setup. Existing head footage includes eye black and inconsistent obstruction/framing.
- **Why required:** Standardized head and geometry comparison requires locked obstruction, hair, facial-hair, zoom, lighting, and framing conditions.
- **Acceptance criteria:**
  - Eye black is removed or proven unavailable from direct evidence.
  - Hair and facial hair are locked to low-obstruction states where controls exist.
  - A stable canonical setup is recorded before standardized capture begins.
- **Related queue items:** RQ-006, RQ-007, RQ-008

### GFM-CAP-006 - Standardized Head Template visual catalog

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Head Template
- **Starting option:** First selected Head Template value proven in GFM-CAP-004
- **Ending option:** Final selected Head Template value proven in GFM-CAP-004
- **Perform two counts:** No
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q
- **Rear view required:** Yes
- **Canonical head:** Each selected Head Template value in native order
- **Canonical hairstyle:** Canonical low-obstruction hairstyle from GFM-CAP-005
- **Facial-hair setting:** None or lowest-obstruction setting from GFM-CAP-005
- **Skin setting:** Stable value from GFM-CAP-005; do not change mid-run
- **Body setting:** Stable player setup from GFM-CAP-002
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** Multiple 20-35 minute clips are acceptable; overlap each split by the last completed face
- **Video or screenshots:** Video preferred for provenance; extracted frames can become derivatives
- **Existing footage can be reused:** Existing footage remains useful for order/menu evidence, but current quality is inadequate for production geometric comparison.
- **Why required:** Every head candidate needs standardized menu and angle evidence before annotation, measurement, second verification, or production approval.
- **Acceptance criteria:**
  - Every selected head has all required angle views after loading completes.
  - Native label/index remains visible before each angle set.
  - No severe blur, overlay, transition frame, or inconsistent zoom/framing contaminates the accepted view set.
- **Related queue items:** RQ-006, RQ-008

### GFM-CAP-007 - Skin Tone

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Skin Tone
- **Starting option:** First available Skin Tone value; current footage starts at Skin Tone 09 but does not prove first boundary
- **Ending option:** Final available Skin Tone value plus boundary or wrap evidence; current footage reaches Skin Tone 23 but does not prove final boundary
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT_REPRESENTATIVE_FRAME_PER_VALUE
- **Rear view required:** No
- **Canonical head:** Use canonical head from GFM-CAP-005 unless the game forces a different preview
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Skin Tone value changes are the subject of this capture
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 8-15 minutes
- **Video or screenshots:** Video preferred; screenshots may supplement representative frames
- **Existing footage can be reused:** Yes for partial native values and duplicate observations; not for total count or boundaries.
- **Why required:** Current Skin Tone evidence has unknown total count, missing observed range values, and no wrap/default proof.
- **Acceptance criteria:**
  - First and final values are proven.
  - Every selected value has readable native index/label and representative frame.
  - Two counts or one count plus clear wrap/no-wrap proof closes gaps without racial or ethnic labels.
- **Related queue items:** RQ-019, RQ-024, appearance-control-skin-tone-recapture

### GFM-CAP-008 - Skin Details

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Skin Details
- **Starting option:** First available Skin Details value; current evidence includes None but first boundary must be shown
- **Ending option:** Final available Skin Details value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT_REPRESENTATIVE_FRAME_PER_VALUE
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value unless the control itself changes visible skin details
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 8-15 minutes
- **Video or screenshots:** Video preferred; screenshots may supplement subtle texture details
- **Existing footage can be reused:** Yes for observed labels such as None and current Skin Details candidates; not for total count or production-quality frames.
- **Why required:** Current Skin Details evidence is directly observed but count/boundary/default/wrap proof is missing.
- **Acceptance criteria:**
  - All selected native labels are readable and visually confirmed.
  - Representative face frame exists per value.
  - Texture effects are recorded separately from geometry claims.
- **Related queue items:** RQ-019, RQ-024, appearance-control-skin-details-recapture

### GFM-CAP-009 - Eye Shape

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Eye Shape
- **Starting option:** First available Eye Shape value; current evidence includes Almond but first boundary must be shown
- **Ending option:** Final available Eye Shape value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT_CLOSE_REPRESENTATIVE_FRAME_PER_VALUE
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 6-10 minutes
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** Yes for partial labels/order; not enough for boundary and production review.
- **Why required:** Eye Shape count and boundaries remain unknown, and the current footage may be affected by eye black.
- **Acceptance criteria:**
  - Every selected value is readable.
  - The face is stable and front-facing long enough to evaluate eye-region changes.
  - No ethnicity, identity, or subjective classification is recorded.
- **Related queue items:** RQ-019, RQ-024, appearance-control-eye-shape-recapture

### GFM-CAP-010 - Eye Color

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Eye Color
- **Starting option:** First available Eye Color value; current evidence includes Light Blue but first boundary must be shown
- **Ending option:** Final available Eye Color value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT_CLOSE_REPRESENTATIVE_FRAME_PER_VALUE
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 6-10 minutes
- **Video or screenshots:** Video preferred; high-resolution screenshots helpful for iris visibility
- **Existing footage can be reused:** Yes for partial observed labels; not enough for final count and visibility confidence.
- **Why required:** Eye Color needs readable native labels, full selector proof, and representative frames with sufficient resolution.
- **Acceptance criteria:**
  - Every selected color label is readable and visually confirmable.
  - Lighting and eye-black limitations are absent or documented.
  - No generic color substitution replaces unreadable native text.
- **Related queue items:** RQ-019, RQ-024, appearance-control-eye-color-recapture

### GFM-CAP-011 - Nose

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Nose
- **Starting option:** First available Nose value; current evidence includes Aquiline but first boundary must be shown
- **Ending option:** Final available Nose value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical low-obstruction hairstyle
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 10-18 minutes
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** Yes for partial labels/order; not enough for profile evidence or final count.
- **Why required:** Nose is geometry-relevant and current evidence lacks reliable profile views and selector boundaries.
- **Acceptance criteria:**
  - Each value has readable menu evidence plus front and profile/three-quarter frames.
  - Transition/loading frames are rejected.
  - No subjective ethnicity or attractiveness terms are recorded.
- **Related queue items:** RQ-019, RQ-022, appearance-control-nose-recapture

### GFM-CAP-012 - Ear Shape

- **Priority:** P0
- **Exact menu path:** Create Player > Player > Appearance > Head & Skin > Ear Shape
- **Starting option:** First available Ear Shape value; current evidence includes None but first boundary must be shown
- **Ending option:** Final available Ear Shape value plus boundary or wrap evidence
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** MENU, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE
- **Rear view required:** No
- **Canonical head:** Canonical head from GFM-CAP-005
- **Canonical hairstyle:** Canonical hairstyle that exposes ears if visibly available; otherwise record obstruction
- **Facial-hair setting:** None or lowest-obstruction setting
- **Skin setting:** Stable skin value
- **Body setting:** Stable player setup
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 8-15 minutes
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** Yes for partial labels/order; not enough for unobstructed side evidence.
- **Why required:** Ear Shape needs side evidence, hairstyle-obstruction review, and complete selector boundary proof.
- **Acceptance criteria:**
  - At least one ear is clearly visible per value, and both-side visibility is recorded only when actually shown.
  - Hair obstruction is documented.
  - Complete count and wrap/no-wrap proof are visible.
- **Related queue items:** RQ-019, RQ-023, appearance-control-ear-shape-recapture

## 3. Dependency Tests

### GFM-CAP-019 - Dependency tests

- **Priority:** P1
- **Exact menu path:** Create Player with baseline from GFM-CAP-005; test Head & Skin, Hair, Player/body controls one variable at a time
- **Starting option:** Baseline canonical state from GFM-CAP-005
- **Ending option:** Last dependency variable tested and baseline restored where possible
- **Perform two counts:** No
- **Native index must remain visible:** Yes
- **Required views:** BASELINE_MENU_STATE, CHANGED_VARIABLE, OBSERVED_COUNT_OR_ORDER_CHANGE, RETURN_TO_BASELINE_WHERE_POSSIBLE
- **Rear view required:** No
- **Canonical head:** Baseline canonical head unless head is the changed variable
- **Canonical hairstyle:** Baseline canonical hairstyle unless hairstyle is the changed variable
- **Facial-hair setting:** Baseline facial-hair setting unless facial hair is the changed variable
- **Skin setting:** Baseline skin setting unless skin is the changed variable
- **Body setting:** Test position, archetype, height, weight, body type, online state, EA account state, edition, entitlements, and patch only where safe and visible
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 15-30 minutes, split by variable if needed
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** Partially for baseline path only; no structured dependency matrix is complete.
- **Why required:** Production catalog records must know whether options vary by mode, platform, body setup, account state, entitlements, patch, or other controls.
- **Acceptance criteria:**
  - Only one variable changes per test.
  - Expected versus observed count/order/geometry/label changes are visible.
  - Uncertainty is recorded instead of resolved by assumption.
- **Related queue items:** RQ-020

## 4. Second-Verifier Captures

### GFM-CAP-020 - Second-person verification

- **Priority:** P0_AFTER_PRIMARY_CAPTURE
- **Exact menu path:** Same paths as GFM-CAP-001 through GFM-CAP-018, performed independently by the second verifier on the same shipping-game environment where possible
- **Starting option:** Verifier starts from environment proof, then independently checks menu counts and selected catalog records
- **Ending option:** Verifier sign-off or discrepancy/recapture request
- **Perform two counts:** Yes
- **Native index must remain visible:** Yes
- **Required views:** ENVIRONMENT_PROOF, INDEPENDENT_MENU_COUNTS, FRONT_VIEW_CHECKS, DETERMINISTIC_SECONDARY_ANGLE_SAMPLE
- **Rear view required:** Yes
- **Canonical head:** Use the primary package records selected for second review
- **Canonical hairstyle:** Match primary canonical setup for sampled records
- **Facial-hair setting:** Match primary canonical setup for sampled records
- **Skin setting:** Match primary canonical setup for sampled records
- **Body setting:** Match primary canonical setup for sampled records
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** As needed after primary package is ready; split by category
- **Video or screenshots:** Video preferred for counts; screenshots acceptable for static file-existence review evidence
- **Existing footage can be reused:** No as independent verification; primary footage remains the object being verified.
- **Why required:** No record may become production verified without genuine second-person verification and discrepancy handling.
- **Acceptance criteria:**
  - Verifier observations are stored separately from primary observations.
  - Disagreements open discrepancy records instead of averaging.
  - Allowed verification statuses only are used.
- **Related queue items:** second-person-verification-gate

## 5. Nice-To-Have Evidence

### GFM-CAP-021 - Operator context slates and backup evidence

- **Priority:** P2
- **Exact menu path:** Any capture session used above; begin and end with a full-screen context slate showing game mode, menu path, and clip purpose where safe
- **Starting option:** Full-screen context before a planned capture
- **Ending option:** Full-screen context after capture completes
- **Perform two counts:** No
- **Native index must remain visible:** No
- **Required views:** CONTEXT_SLATE, CLIP_END_STATE
- **Rear view required:** No
- **Canonical head:** Not applicable
- **Canonical hairstyle:** Not applicable
- **Facial-hair setting:** Not applicable
- **Skin setting:** Not applicable
- **Body setting:** Not applicable
- **Lighting requirement:** Even front lighting on the game screen capture; avoid glare, reflections, notification overlays, and unreadable menu text.
- **Camera requirement:** Use Xbox screen recording or capture-card recording when available; if phone recording is the only option, keep the screen square, stable, and readable.
- **Zoom requirement:** Keep menu label/index readable and the player preview large enough to evaluate the face; do not change zoom/framing mid-category unless the game requires it.
- **Recommended recording length:** 10-20 seconds per clip
- **Video or screenshots:** Video preferred
- **Existing footage can be reused:** Existing filenames/manifests are useful but context slates would reduce ambiguity.
- **Why required:** Nice-to-have provenance that makes tomorrow imports easier and reduces relabeling risk.
- **Acceptance criteria:**
  - Clip purpose and start/end state are visible without exposing secrets.
  - No master evidence is renamed or edited to add the slate.
- **Related queue items:** RQ-021

## Simple Xbox Recording Checklist

Use this as the beside-the-console checklist. Mark each line only after the clip has saved.

- [ ] GFM-CAP-001 (P0) - Environment and game-version evidence: Console info screen -> Installed game/update/entitlement or title-version screen
- [ ] GFM-CAP-002 (P0) - Creation path and body setup: Road to Glory entry from the main interface -> Last visible Player/body/height/weight/physique control reached in this path
- [ ] GFM-CAP-003 (P0) - Appearance menu hierarchy: Appearance entry -> Last visible Head & Skin and Hair submenu item after any scrolling continuation
- [ ] GFM-CAP-004 (P0) - Head Template count and native order: Face 1 if visible as the first selected Head Template value; otherwise the first visible selected value -> Proven final selected Head Template value plus boundary or wrap evidence
- [ ] GFM-CAP-005 (P0) - Canonical comparison setup lock: Current visible obstruction-affecting setting, if present -> Locked canonical state or visible proof that the control is unavailable
- [ ] GFM-CAP-006 (P0) - Standardized Head Template visual catalog: First selected Head Template value proven in GFM-CAP-004 -> Final selected Head Template value proven in GFM-CAP-004
- [ ] GFM-CAP-007 (P0) - Skin Tone: First available Skin Tone value; current footage starts at Skin Tone 09 but does not prove first boundary -> Final available Skin Tone value plus boundary or wrap evidence; current footage reaches Skin Tone 23 but does not prove final boundary
- [ ] GFM-CAP-008 (P0) - Skin Details: First available Skin Details value; current evidence includes None but first boundary must be shown -> Final available Skin Details value plus boundary or wrap evidence
- [ ] GFM-CAP-009 (P0) - Eye Shape: First available Eye Shape value; current evidence includes Almond but first boundary must be shown -> Final available Eye Shape value plus boundary or wrap evidence
- [ ] GFM-CAP-010 (P0) - Eye Color: First available Eye Color value; current evidence includes Light Blue but first boundary must be shown -> Final available Eye Color value plus boundary or wrap evidence
- [ ] GFM-CAP-011 (P0) - Nose: First available Nose value; current evidence includes Aquiline but first boundary must be shown -> Final available Nose value plus boundary or wrap evidence
- [ ] GFM-CAP-012 (P0) - Ear Shape: First available Ear Shape value; current evidence includes None but first boundary must be shown -> Final available Ear Shape value plus boundary or wrap evidence
- [ ] GFM-CAP-013 (P1) - Mouth, Jaw, Chin face-shape controls: First visible selected value in Mouth Shape, then first visible selected value in Jaw Shape, then first visible selected value in Chin -> Final value and boundary/wrap for each of Mouth Shape, Jaw Shape, and Chin
- [ ] GFM-CAP-014 (P1) - Hair menu hierarchy: Hair menu entry -> Last visible Hair submenu item after scrolling
- [ ] GFM-CAP-015 (P1) - Hairstyles: First visible selected hairstyle value -> Final selected hairstyle value plus boundary or wrap evidence
- [ ] GFM-CAP-016 (P1) - Hair colors: First visible selected hair-color value -> Final selected hair-color value plus boundary or wrap evidence
- [ ] GFM-CAP-017 (P1) - Facial hair: None if visibly present; otherwise first visible selected facial-hair value -> Final selected facial-hair value plus boundary or wrap evidence
- [ ] GFM-CAP-018 (P1) - Facial-hair colors: First visible selected facial-hair-color value -> Final selected facial-hair-color value plus boundary or wrap evidence
- [ ] GFM-CAP-019 (P1) - Dependency tests: Baseline canonical state from GFM-CAP-005 -> Last dependency variable tested and baseline restored where possible
- [ ] GFM-CAP-020 (P0_AFTER_PRIMARY_CAPTURE) - Second-person verification: Verifier starts from environment proof, then independently checks menu counts and selected catalog records -> Verifier sign-off or discrepancy/recapture request

## Stop Conditions

- Stop before recording passwords, payment details, email addresses, recovery codes, serial numbers, or private messages.
- Stop if the menu path or labels differ from the plan; record the visible screen and leave the field unresolved.
- Stop before calling any primary-research record production verified.
- Preserve every original recording unchanged. Any trim, crop, contact sheet, renamed copy, or extracted image is a derivative with provenance.
