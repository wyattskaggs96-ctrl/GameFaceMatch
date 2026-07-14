# Authoritative Current Recapture Queue

**Historical report:** Preserved for provenance. Use `docs/phase-zero/PHASE_ZERO_ARTIFACT_MAP.md` and `docs/phase-zero/WYATT_NEXT_CAPTURE_PLAN.md` for current canonical capture planning.

**AUTHORITATIVE CURRENT RECAPTURE QUEUE - PRIMARY RESEARCH ONLY - NOT PRODUCTION VERIFIED**

This queue consolidates the current evidence gaps into one owner-facing recording plan. It does not create production catalog records, verify records, or enable recommendations.

## Summary

- Queue items: 24
- P0 items: 8
- P1 items: 12
- P2 items: 4
- Production-blocking items: 22
- Existing source recapture rows consolidated: 56
- Production recommendations enabled: false

## Rules

- Preserve original recordings unchanged.
- Record only what is visible in the shipping game or console UI.
- Do not infer missing counts, labels, sliders, ranges, menu paths, patches, or platform differences.
- Existing evidence remains useful only for the roles stated on each queue item.
- Completing the queue still requires first review, second-person verification, catalog-manager approval, validation, and publication gates.

## Queue

### RQ-001 - P0 - Record exact Xbox console model and console OS

- Group: Environment
- What Wyatt should record: Open Xbox Settings > System > Console info and record the exact console model name, serial-sensitive fields excluded, console OS version, and system update status. Include a continuous screen recording from the settings navigation into the visible console-info screen.
- Required evidence: Console info screen; System update status screen
- Acceptance criteria: Console model is visible; Console OS version is visible; Update status is visible; No account secrets or serial numbers are transcribed into catalog data
- Existing evidence remains useful: Yes
- Existing evidence use: Existing gameplay recordings remain useful for Road to Glory navigation, selected menu labels, and current research-candidate provenance, but they do not prove exact Xbox model or console OS.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/issues_and_exceptions.csv; data/research/cf27/video_inventory.json

### RQ-002 - P0 - Record game executable version and installed patch/update screen

- Group: Environment
- What Wyatt should record: Record the game title screen and any visible in-game version/build display, then record Xbox manage-game/update screens showing installed version, latest update state, and update date if visible. Do not infer patch from upload date.
- Required evidence: Game title/version screen; Installed game version screen; Update/latest-version screen
- Acceptance criteria: Game executable version or explicit UNKNOWN is recorded from evidence; Patch/update state is visible; Capture date is recorded
- Existing evidence remains useful: Yes
- Existing evidence use: Existing videos remain useful for observed menus and options, but they cannot become production records until the executable version and patch context are tied to the audit environment.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/issues_and_exceptions.csv; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-003 - P0 - Record edition, entitlement, copy type, storefront, online, and EA account state

- Group: Environment
- What Wyatt should record: Record only non-secret account/entitlement context: game edition as shown by the console/store/manage-game UI, installed add-ons or entitlements relevant to player creation, copy type, storefront/region, online/offline state, and EA account signed-in state if visible without exposing credentials.
- Required evidence: Manage game add-ons/edition screen; Storefront or ownership screen where safe; Network or online-state evidence where safe
- Acceptance criteria: Edition is visible or marked UNKNOWN from evidence; Entitlements/add-ons are visible or marked none/UNKNOWN; No credentials, emails, payment data, or recovery data are recorded
- Existing evidence remains useful: Yes
- Existing evidence use: Existing menu recordings remain useful for current Road to Glory observations, but they do not prove whether edition or entitlement state changes available appearance options.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/issues_and_exceptions.csv

### RQ-004 - P0 - Capture Remaining Head Templates after Face 29 and prove category boundary

- Group: Head Templates
- What Wyatt should record: Starting from Face 29 in Head Template, continue advancing in native order until the selector visibly reaches the last option and either wraps to the first option or otherwise proves the end boundary. Keep the visible selected label/index on screen for every deliberate selection.
- Required evidence: Menu evidence for every selected option after Face 29; End-of-category or wrap evidence; Timestamped continuous recording
- Acceptance criteria: No option after Face 29 is created unless deliberately selected; Final count is proven by boundary/wrap evidence; Native order is preserved
- Existing evidence remains useful: Yes
- Existing evidence use: Existing Face 1-29 recordings remain useful for selected label/order evidence, extracted derivatives, Face 12 overlap provenance, and sequence-review cues. They do not prove the complete Head Template count.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json; data/research/cf27/reports/native-sequence-integrity/native_sequence_human_review_queue.json; data/research/cf27/video_inventory.json

### RQ-005 - P0 - Perform a second full Head Template count

- Group: Head Templates
- What Wyatt should record: Run a second pass through the complete Head Template selector from the first option to the proven final option. Record selected labels/indices in native order without skipping, and call out any grid traversal or jump intentionally.
- Required evidence: Continuous second count recording; First option evidence; Final/wrap evidence; Researcher count notes
- Acceptance criteria: Second count agrees or discrepancy is opened; Selector jumps are documented; Face 12 overlap is preserved as overlap evidence, not duplicate identity
- Existing evidence remains useful: Yes
- Existing evidence use: Existing Face 1-29 footage remains useful as the primary-observation pass and as a comparison source for the second count.
- Production blocking: Yes
- Source references: data/research/cf27/reports/native-sequence-integrity/native_sequence_human_review_queue.json; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-006 - P0 - Standardized head capture pass without eye black

- Group: Head Templates
- What Wyatt should record: After confirming the canonical capture configuration, record every Head Template with eye black disabled or absent if the game allows. Capture menu evidence plus front, left three-quarter, left profile, rear, right profile, and right three-quarter views for each selected head.
- Required evidence: MENU; FRONT; LEFT_3Q; LEFT_PROFILE; REAR; RIGHT_PROFILE; RIGHT_3Q
- Optional evidence: ELEVATED; LOWERED
- Acceptance criteria: Eye black is absent or explicitly unavoidable; Zoom/framing is consistent; Native order is preserved; Every current and newly discovered head has the standard view set
- Existing evidence remains useful: Yes
- Existing evidence use: Existing Face 1-29 recordings remain valid identity/order/menu evidence. Current QA says one standardized recapture run can repair recurring image-comparison limitations, but not category completeness, environment gaps, or second verification.
- Production blocking: Yes
- Source references: data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json; data/research/cf27/reports/head-template-standardization-qa/head_template_recapture_queue.csv

### RQ-007 - P0 - Lock controlled short hairstyle and facial hair set to None where possible for head comparison

- Group: Head Templates
- What Wyatt should record: Before the standardized head pass, identify whether hair and facial-hair controls can be held constant while changing Head Template. If possible, set a controlled short/non-obstructing hairstyle and facial hair None, then record proof of those settings before the pass.
- Required evidence: Hair/facial-hair settings before head pass; Evidence that settings remain unchanged after several head changes; Note if head templates force hair or facial hair
- Acceptance criteria: Canonical hair state is recorded; Canonical facial-hair state is recorded; Any forced changes are documented as dependencies, not inferred options
- Existing evidence remains useful: Yes
- Existing evidence use: Existing head footage remains useful for native Head Template labels and order, but visible hair, facial hair, and eye black currently limit geometry comparison.
- Production blocking: Yes
- Source references: data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json; data/research/cf27/exports/partial-research-catalog-current/recapture_queue.csv

### RQ-008 - P0 - Record missing true front and profile views under a locked capture protocol

- Group: Capture protocol
- What Wyatt should record: For each category being captured, pause on stable character views and record true front, left profile, and right profile views where the UI allows. Avoid transition frames, loading animation, cursor/notification overlays, and inconsistent zoom.
- Required evidence: True front stable frame; Left profile stable frame; Right profile stable frame; View-angle notes
- Acceptance criteria: Angle labels are supported by visible rotation state; Profile views are not approximated from three-quarter views; Missing views are explicitly marked unavailable if the UI cannot show them
- Existing evidence remains useful: Yes
- Existing evidence use: Existing extracted frames remain useful as derivatives and review aids, but some are best-available approximations rather than production-ready true front/profile evidence.
- Production blocking: Yes
- Source references: data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json; data/research/cf27/exports/partial-research-catalog-current/recapture_queue.csv

### RQ-009 - P1 - Record Mouth Shape menu

- Group: Uncaptured face menus
- What Wyatt should record: Navigate to Appearance > Head & Skin > Mouth Shape if present. Record the category entry, every deliberately selected native label/index in order, representative character view, and selector boundary/wrap evidence.
- Required evidence: Category entry; Every selected Mouth Shape value; Boundary or wrap evidence; Stable face frame per value where available
- Acceptance criteria: Native labels/indices are readable or queued for manual label review; Count is not claimed without boundary evidence; No values are inferred from thumbnails
- Existing evidence remains useful: Yes
- Existing evidence use: Existing appearance hierarchy evidence suggests Mouth Shape is part of the observed hierarchy, but no complete own-category recording is available for production use.
- Production blocking: Yes
- Source references: data/research/cf27/video_timeline_index.json; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-010 - P1 - Record Jaw Shape menu

- Group: Uncaptured face menus
- What Wyatt should record: Navigate to Jaw Shape if present and record each deliberately selected value in native order with front and profile/three-quarter character evidence where available. Prove selector boundary or wrap.
- Required evidence: Category entry; Every selected Jaw Shape value; Front and side/three-quarter evidence; Boundary or wrap evidence
- Acceptance criteria: Native order is preserved; Geometry-changing status is recorded as observation, not production fact until reviewed; Count is proven
- Existing evidence remains useful: Yes
- Existing evidence use: Existing hierarchy evidence supports that Jaw Shape appears in the current menu area, but option values are not cataloged yet.
- Production blocking: Yes
- Source references: data/research/cf27/video_timeline_index.json; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-011 - P1 - Complete Chin menu capture

- Group: Uncaptured face menus
- What Wyatt should record: Navigate to Chin if present and record every selected native value in order, with front and profile/three-quarter evidence where available. Capture first, middle, final, and wrap/boundary evidence.
- Required evidence: Category entry; Every selected Chin value; Front and side/three-quarter evidence; Boundary or wrap evidence
- Acceptance criteria: No Chin values are inferred from neighboring thumbnails; Native labels/indices are readable or sent to manual review; Count is proven
- Existing evidence remains useful: Yes
- Existing evidence use: Existing hierarchy evidence suggests Chin is visible, but the category values still need direct selected evidence.
- Production blocking: Yes
- Source references: data/research/cf27/video_timeline_index.json; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-012 - P1 - Open and map the complete Hair menu

- Group: Hair
- What Wyatt should record: From Appearance, enter Hair and record the full submenu hierarchy before selecting options. Capture all visible categories, native order, control type, whether later editable, and dependencies or locks.
- Required evidence: Hair menu entry; Full submenu list; Scroll continuation if any; Control type evidence
- Acceptance criteria: Hair controls are discovered from direct menu evidence; No category is pre-populated as confirmed; Locked/unavailable controls are documented
- Existing evidence remains useful: Yes
- Existing evidence use: Existing Road to Glory path footage shows Hair as a visible menu item but does not open it; it remains useful only as path evidence.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/issues_and_exceptions.csv; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-013 - P1 - Capture complete Hairstyles catalog

- Group: Hair
- What Wyatt should record: Within Hair, record every hairstyle deliberately selected in native order using the canonical head and canonical hair color. Capture menu evidence, front, left three-quarter, left profile, rear, right profile, and right three-quarter views where available.
- Required evidence: MENU; FRONT; LEFT_3Q; LEFT_PROFILE; REAR; RIGHT_PROFILE; RIGHT_3Q
- Acceptance criteria: Native order and count are proven; Canonical head and hair color are visible/recorded; Dependencies or unlocks are recorded
- Existing evidence remains useful: Yes
- Existing evidence use: Existing videos do not provide a complete Hair menu or hairstyle catalog. Existing head footage may help choose a non-obstructing canonical head after review.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-014 - P1 - Capture Hair Colors

- Group: Hair
- What Wyatt should record: Record every hair-color control value in native order with the canonical hairstyle and head. Capture menu evidence and a stable representative character frame for each value.
- Required evidence: Every selected Hair Color value; Representative character frame; Boundary or wrap evidence
- Acceptance criteria: Native labels/indices are preserved; Lighting/capture conditions are constant; Color observations are objective metadata only
- Existing evidence remains useful: Yes
- Existing evidence use: Existing current videos do not prove hair-color values. They remain useful for path and non-hair categories only.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-015 - P1 - Capture complete Facial Hair menu, including None

- Group: Facial hair
- What Wyatt should record: Navigate to facial-hair controls if present. Record None and every other deliberately selected option in native order using canonical head, hairstyle, and facial-hair color. Capture required angle views and menu evidence.
- Required evidence: None option evidence if present; Every selected Facial Hair value; Front and side/three-quarter evidence; Boundary or wrap evidence
- Acceptance criteria: Native order and count are proven; Coverage metadata stays researcher-applied and separate from native labels; Dependencies are recorded
- Existing evidence remains useful: Yes
- Existing evidence use: Existing head footage cannot be treated as facial-hair catalog evidence because facial-hair controls were not independently locked or audited.
- Production blocking: Yes
- Source references: data/research/cf27/reports/head-template-standardization-qa/head_template_standardization_qa_report.json; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-016 - P1 - Capture Facial Hair Colors

- Group: Facial hair
- What Wyatt should record: Record every facial-hair color control value in native order using a canonical visible facial-hair option. Capture menu label/index evidence and stable face frames under constant lighting.
- Required evidence: Every selected Facial Hair Color value; Representative character frame; Boundary or wrap evidence
- Acceptance criteria: Values are not inferred from hair color controls; Color observations are objective metadata only; Dependencies with facial-hair style are recorded
- Existing evidence remains useful: Yes
- Existing evidence use: Existing videos do not prove facial-hair color values. They remain useful for non-facial-hair research only.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-017 - P1 - Record Physique controls

- Group: Body and physique
- What Wyatt should record: In the Road to Glory creation path, record every physique/body-shape control that affects player appearance. Preserve exact native labels, indices, ranges, default values, and dependencies.
- Required evidence: Physique menu entry; Every control value or range boundary; Default/reset evidence; Representative character frames where useful
- Acceptance criteria: Controls are categorized as geometry, texture, color, or presentation-only effects; No slider range is guessed; Position/archetype dependencies are noted
- Existing evidence remains useful: Yes
- Existing evidence use: Existing path footage proves the route into player creation but does not audit physique controls.
- Production blocking: No
- Source references: data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-018 - P1 - Record Height, Weight, and Body Type controls

- Group: Body and physique
- What Wyatt should record: Record height, weight, and body type controls from the selected Road to Glory creation path. Capture min, max, step, default, restrictions, and whether values affect available appearance options.
- Required evidence: Height min/max/default; Weight min/max/default; Body Type values or range; Restriction/dependency evidence
- Acceptance criteria: No ranges are inferred; Position and archetype used during capture are recorded; Dependency checks are queued if values change appearance menus
- Existing evidence remains useful: Yes
- Existing evidence use: Existing path evidence records QB/Create Player context but does not prove height, weight, or body type ranges.
- Production blocking: No
- Source references: data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-019 - P1 - Run selector wrap and boundary tests for every captured category

- Group: Selector validation
- What Wyatt should record: For Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, and future categories, record first value, final value, and wrap/no-wrap behavior. Include deliberate navigation steps and avoid relying on thumbnail visibility.
- Required evidence: First value; Final value; Wrap or boundary behavior; Navigation notes
- Acceptance criteria: Complete counts are only claimed when boundary/wrap is proven; Repeated selections and jumps are documented; Native order remains intact
- Existing evidence remains useful: Yes
- Existing evidence use: Existing recordings provide many selected values and sequence-review suggestions, but several categories still need explicit boundary or wrap proof before production.
- Production blocking: Yes
- Source references: data/research/cf27/reports/native-sequence-integrity/native_sequence_human_review_queue.json; data/research/cf27/exports/partial-research-catalog-current/recapture_queue.csv

### RQ-020 - P1 - Run dependency checks across platform, mode, position, archetype, height, weight, body type, online state, EA account state, edition, entitlements, and patch

- Group: Dependency checks
- What Wyatt should record: Use the dependency-test runner matrix: record a baseline, change one variable at a time, capture expected versus observed behavior, and document count/order/label/geometry changes with evidence.
- Required evidence: Baseline recording; Changed-variable recording; Observed count/order/label changes; Remaining uncertainty notes
- Acceptance criteria: Each run changes only one variable where practical; No dependency is promoted from assumption; Unresolved dependencies create issues or recapture requests
- Existing evidence remains useful: Yes
- Existing evidence use: Existing current videos provide a single research environment and path baseline, but they do not prove whether other states change catalog availability.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/issues_and_exceptions.csv; data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json

### RQ-021 - P2 - Review OCR/manual-label queue for readable native labels

- Group: Manual text review
- What Wyatt should record: For Skin Details, Eye Shape, Eye Color, Nose, and Ear Shape labels already extracted into the OCR review queue, visually inspect the original frame and targeted crop before confirming or correcting each native label.
- Required evidence: Original menu frame; Targeted label crop; Reviewer confirmation
- Acceptance criteria: OCR output is not accepted without visual confirmation; Low-confidence labels remain queued; Native labels are preserved exactly as shown
- Existing evidence remains useful: Yes
- Existing evidence use: Existing extracted menu frames and crops remain useful for manual label confirmation; they are not production-verified without review.
- Production blocking: Yes
- Source references: data/research/cf27/reports/ocr-native-label-review/manual_label_review_queue.json

### RQ-022 - P2 - Recapture Nose category with standardized profile evidence

- Group: Current captured categories
- What Wyatt should record: Repeat Nose options under the canonical capture configuration, preserving native order and capturing menu evidence, front, best three-quarter, and true profile views when available.
- Required evidence: MENU; FRONT; LEFT_3Q or RIGHT_3Q; LEFT_PROFILE or RIGHT_PROFILE; Boundary or wrap evidence
- Acceptance criteria: Profile view availability is proven or explicitly unavailable; Current labels are confirmed by direct selected evidence; No subjective trait labels are added
- Existing evidence remains useful: Yes
- Existing evidence use: Existing Nose footage remains useful for selected labels/order and current research candidates, but current frames are not standardized production comparison captures.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/recapture_queue.csv

### RQ-023 - P2 - Recapture Ear Shape with unobstructed side evidence where possible

- Group: Current captured categories
- What Wyatt should record: Repeat Ear Shape options with a hairstyle that exposes ears if the game allows. Capture menu evidence and side/three-quarter evidence sufficient to determine left/right ear visibility.
- Required evidence: MENU; Left or right side evidence; Hair obstruction state; Boundary or wrap evidence
- Acceptance criteria: Do not claim both ears evaluated unless both are visible; Hair obstruction is recorded; Selector completeness is proven
- Existing evidence remains useful: Yes
- Existing evidence use: Existing Ear Shape footage remains useful for selected labels/order, but hair obstruction and one-sided visibility limit production comparison.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/recapture_queue.csv

### RQ-024 - P2 - Confirm Skin Tone, Skin Details, Eye Shape, and Eye Color boundaries and representative frames

- Group: Current captured categories
- What Wyatt should record: For each currently captured category, record deliberate first-to-final selection evidence, wrap/no-wrap behavior, and stable representative frames under consistent lighting. Keep native labels/indices separate from researcher metadata.
- Required evidence: First value evidence; Final value evidence; Wrap/no-wrap evidence; Representative frames
- Acceptance criteria: Counts are proven by boundary evidence; Manual-label queue items are resolved; Color/texture observations remain objective metadata
- Existing evidence remains useful: Yes
- Existing evidence use: Existing recordings provide primary research candidates for Skin Tone, Skin Details, Eye Shape, and Eye Color, but production use still requires boundary confirmation, label review, and second verification.
- Production blocking: Yes
- Source references: data/research/cf27/exports/partial-research-catalog-current/research_catalog_manifest.json; data/research/cf27/reports/ocr-native-label-review/manual_label_review_queue.json; data/research/cf27/reports/native-sequence-integrity/native_sequence_human_review_queue.json
