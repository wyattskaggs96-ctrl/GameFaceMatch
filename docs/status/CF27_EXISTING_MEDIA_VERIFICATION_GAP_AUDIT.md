# CF27 Existing-Media Verification Gap Audit

**Status:** evidence-exhaustion audit; not production data
**Generated at:** 2026-08-02T22:10:00-04:00
**Production recommendations enabled:** false

## 1. Executive Conclusion

Existing CF27 footage is stronger than a blanket recapture label suggests. All 92 current catalog candidates have linked evidence and can be sent to a real second verifier for independent confirmation. However, production promotion remains blocked because version/patch evidence, selector-boundary/count proof for incomplete categories, and standardized production views are still missing or inadequate. The minimum recapture queue contains only rows classified as `GENUINE_RECAPTURE_REQUIRED`; verifier-only and frame-reextraction tasks are intentionally excluded.

## 2. Complete Existing-Video Inventory

| Source video ID | Original filename | Relative path | Duration | Resolution | Codec | Duplicate status | Local decode status |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| CF27_XBOX_SOURCE_2026_08_02_001 | EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4 | source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_13_02.mp4 | 240.24 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | OPENS_WITH_FFMPEG |
| CF27_XBOX_SOURCE_2026_08_02_002 | EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4 | source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_18_14.mp4 | 235.35 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | OPENS_WITH_FFMPEG |
| CF27_XBOX_SOURCE_2026_08_02_003 | EA SPORTS™ College Football 27-2026_08_02-21_21_15.mp4 | source-media/NCAA 26/EA SPORTS™ College Football 27-2026_08_02-21_21_15.mp4 | 163.8 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | OPENS_WITH_FFMPEG |
| phase0-video-001 | 01_Environment_and_Creation_Path.MP4 | OWNER_DOWNLOADS/01_Environment_and_Creation_Path.MP4 | 73.57 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-002 | 02_Appearance_Menu_Part_1.mp4.MOV | OWNER_DOWNLOADS/02_Appearance_Menu_Part_1.mp4.MOV | 108.8 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-003 | 02_Appearance_Menu_Part_2.mp4.MOV | OWNER_DOWNLOADS/02_Appearance_Menu_Part_2.mp4.MOV | 133.02 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-004 | 03_Appearance_Skin_Tone.MP4 | OWNER_DOWNLOADS/03_Appearance_Skin_Tone.MP4 | 53.82 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-005 | 04_Appearance_Skin_Details.MP4 | OWNER_DOWNLOADS/04_Appearance_Skin_Details.MP4 | 31.72 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-006 | 45926e39-7553-43b1-803a-6ddc787c63dd.MP4 | OWNER_DOWNLOADS/45926e39-7553-43b1-803a-6ddc787c63dd.MP4 | 24.93 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-007 | 352535 | OWNER_DOWNLOADS/a1e6193d-625e-4880-8977-3a8c7670c336.MP4 | 29.33 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-008 | 352537 | OWNER_DOWNLOADS/5bcd4869-531b-41bf-b643-5331f34cb3f3.MP4 | 32.45 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-009 | 352531 | OWNER_DOWNLOADS/55b7d607-eefa-41a4-8635-1eedb5296ab0.MP4 | 30.21 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | UNIQUE_OR_CANONICAL | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-010 | 4df34d2b-7dea-4afe-8dcc-05583430012f.MP4 | OWNER_DOWNLOADS/4df34d2b-7dea-4afe-8dcc-05583430012f.MP4 | 31.72 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | DUPLICATE_UPLOAD_NO_NEW_COVERAGE of phase0-video-005 | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |
| phase0-video-011 | 7cafeb6e-0488-42e6-8d6d-5836f8e30daf.MP4 | OWNER_DOWNLOADS/7cafeb6e-0488-42e6-8d6d-5836f8e30daf.MP4 | 53.82 | 1920x1080 | h264 (Main) (avc1 / 0x31637661) | DUPLICATE_UPLOAD_NO_NEW_COVERAGE of phase0-video-004 | PORTABLE_EXTERNAL_MASTER_NOT_LOCAL |

## 3. Duplicate-Video Findings

- Unique master videos: 12
- Duplicate uploads: 2
- Duplicate uploads are classified as `DUPLICATE_UPLOAD_NO_NEW_COVERAGE` and do not add catalog coverage.

## 4. Clearly Supported Facts

- CF27_XBOX_SOURCE_2026_08_02_001 (Source-video inventory): The local master opens with ffmpeg and has manifest metadata/hash coverage. Next: Use this source for timestamp-level review and frame re-extraction where needed.
- CF27_XBOX_SOURCE_2026_08_02_002 (Source-video inventory): The local master opens with ffmpeg and has manifest metadata/hash coverage. Next: Use this source for timestamp-level review and frame re-extraction where needed.
- CF27_XBOX_SOURCE_2026_08_02_003 (Source-video inventory): The local master opens with ffmpeg and has manifest metadata/hash coverage. Next: Use this source for timestamp-level review and frame re-extraction where needed.

## 5. Supported-With-Notes Facts

- phase0-video-001 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-002 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-003 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-004 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-005 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-006 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-007 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-008 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- phase0-video-009 (Source-video inventory): The manifest preserves metadata/hash coverage, but the master is not local in this checkout. Next: If available, re-add the original master through intake; otherwise review existing derivatives only.
- REQ-APPEARANCE-MENU-MAP (Appearance menu map): A complete proof of every menu row and scroll boundary is not fully established for production. Next: Use current timelines for verifier review; only targeted boundary clips should be requested where count/order audit rows remain incomplete.
- REQ-ORDER-body-controls-position-context (Body or physique controls): Body Controls / Position Context count/order audit is complete for current research scope. Next: Second verifier confirmation still required before production.
- REQ-GAME-TITLE (Game title/version/update evidence): Executable version and patch/update text are not visible. Next: Use existing August footage for game-title confirmation; do not rerecord solely for title text.

## 6. Facts Requiring Only Better Frame Extraction

- REQ-VIEWS-eye-color (Eye color): Missing required production view(s): FRONT. Next: Extract a full-resolution frame from existing source video where the Eye Color selected value and front character preview are both visible.
- REQ-VIEWS-eye-shape (Eye shape): Missing required production view(s): FRONT. Next: Extract a full-resolution frame from existing source video where the Eye Shape selected value and front character preview are both visible.
- REQ-VIEWS-facial-hair-colors (Facial-hair colors): Missing required production view(s): FRONT. Next: Extract a full-resolution frame from existing source video where the Facial-hair colors selected value and front character preview are both visible.
- REQ-VIEWS-hair-colors (Hair colors): Missing required production view(s): FRONT. Next: Extract a full-resolution frame from existing source video where the Hair colors selected value and front character preview are both visible.
- REQ-VIEWS-mouth-shape (Mouth shape): Missing required production view(s): FRONT. Next: Extract a full-resolution frame from existing source video where the Mouth Shape selected value and front character preview are both visible.
- REQ-VIEWS-skin-details (Skin details): Missing required production view(s): FRONT. Next: Extract a full-resolution frame from existing source video where the Skin Details selected value and front character preview are both visible.
- REQ-VIEWS-skin-tone (Skin tone): Missing required production view(s): FRONT. Next: Extract a full-resolution frame from existing source video where the Skin Tone selected value and front character preview are both visible.

## 7. Facts Ready For Second-Verifier Confirmation

- REQ-CREATION-PATH (Road to Glory creation path): The older source master is a portable OWNER_DOWNLOADS reference rather than a local master in this checkout. Next: Second verifier should inspect existing path evidence; owner should re-supply the original master if available before asking for a new recording.
- CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_BLUE_CHIP (Body-related appearance controls): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_CONTRIBUTOR (Body-related appearance controls): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_ELITE (Body-related appearance controls): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_UNDERDOG (Body-related appearance controls): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_POSITION_QB (Body-related appearance controls): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_CHIN_SQUARE (Chin): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EARSHAPE_001 (Ear Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EARSHAPE_002 (Ear Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EARSHAPE_003 (Ear Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EARSHAPE_004 (Ear Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYECOLOR_001 (Eye Color): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYECOLOR_002 (Eye Color): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYECOLOR_003 (Eye Color): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYECOLOR_004 (Eye Color): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYECOLOR_005 (Eye Color): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYECOLOR_006 (Eye Color): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYECOLOR_007 (Eye Color): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYESHAPE_001 (Eye Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYESHAPE_002 (Eye Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYESHAPE_003 (Eye Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYESHAPE_004 (Eye Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_EYESHAPE_005 (Eye Shape): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_FACIALHAIR_MUTTON_CHOPS (Facial hair): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_FACIALHAIRCOLOR_PURPLE (Facial-hair colors): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_HAIRCOLOR_LIGHT_BROWN (Hair colors): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_HAIRSTYLE_SHORT_CURLY (Hairstyles): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_HEAD_001 (Heads): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_HEAD_002 (Heads): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.
- CF27_XBOXUNKNOWN_RTG_HEAD_003 (Heads): Existing source timestamp and derivative evidence can be reviewed by a second human, but Codex cannot assign independent verification. Next: Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review.

- 63 additional candidate rows are listed in the machine-readable matrix.

## 8. Unclear Facts

- None.

## 9. Entirely Missing Categories

- REQ-EYEBROWS (Additional visible face-matching controls): Eyebrows, brow shape, or brow color controls. Next: Do not invent an eyebrow control. Confirm absence/presence only during a future full appearance-menu sweep.
- REQ-DEPENDENCY-TESTS (Dependency tests): Controlled one-variable dependency tests for position, archetype, head, skin, hairstyle, facial hair, online/offline, patch, and platform. Next: Run dependency tests only after primary category capture is complete; do not mark unexecuted dependencies as passed.

## 10. Genuine Recaptures Required

- REQ-VIEWS-chin (Chin): Missing required production view(s): FRONT, LEFT_PROFILE, RIGHT_PROFILE. Next: Record targeted Chin views with canonical settings; do not rerecord unrelated categories.
- REQ-ORDER-ear-shape (Ear shape): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; endingBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; twoCompleteCounts: Two complete independent counts are not available.; repeatedIndices: Repeated selected indices or labels: 2.; wrappingBehavior: NOT_DEMONSTRATED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; unprovenFinalOptionClaims: LAST_OBSERVED_IN_CURRENT_FOOTAGE_NOT_PROVEN_FINAL_AVAILABLE Next: Record the shortest possible Ear Shape boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-VIEWS-ear-shape (Ear shape): Missing required production view(s): LEFT_PROFILE, RIGHT_PROFILE. Next: Record targeted Ear Shape views with canonical settings; do not rerecord unrelated categories.
- REQ-ORDER-eye-color (Eye color): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; endingBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; twoCompleteCounts: Two complete independent counts are not available.; wrappingBehavior: NOT_DEMONSTRATED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; unprovenFinalOptionClaims: LAST_OBSERVED_IN_CURRENT_FOOTAGE_NOT_PROVEN_FINAL_AVAILABLE Next: Record the shortest possible Eye Color boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-ORDER-eye-shape (Eye shape): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; endingBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; twoCompleteCounts: Two complete independent counts are not available.; wrappingBehavior: NOT_DEMONSTRATED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; unprovenFinalOptionClaims: LAST_OBSERVED_IN_CURRENT_FOOTAGE_NOT_PROVEN_FINAL_AVAILABLE Next: Record the shortest possible Eye Shape boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-ORDER-facial-hair (Facial hair): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: No selected values are captured.; endingBoundary: No selected values are captured.; twoCompleteCounts: Two complete independent counts are not available.; nativeOrderContinuity: No native-order rows are available to audit.; missingIndices: No selected values are captured.; wrappingBehavior: NOT_OBSERVED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; evidenceForEveryClaimedOption: No claimed options exist; category is incomplete because no selected values are captured.; unprovenFinalOptionClaims: No final option is proven. Next: Record the shortest possible Facial Hair boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-VIEWS-facial-hair (Facial hair): Missing required production view(s): FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE. Next: Record targeted Facial hair views with canonical settings; do not rerecord unrelated categories.
- REQ-ORDER-facial-hair-color (Facial-hair colors): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: No selected values are captured.; endingBoundary: No selected values are captured.; twoCompleteCounts: Two complete independent counts are not available.; nativeOrderContinuity: No native-order rows are available to audit.; missingIndices: No selected values are captured.; wrappingBehavior: NOT_OBSERVED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; evidenceForEveryClaimedOption: No claimed options exist; category is incomplete because no selected values are captured.; unprovenFinalOptionClaims: No final option is proven. Next: Record the shortest possible Facial-Hair Color boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-VERSION-PATCH-PLATFORM (Game title/version/update evidence): Game version, patch/title update, console platform screen, online/account state, and executable metadata. Next: Record a short environment clip showing game information/version/patch/platform without exposing private account data.
- REQ-ORDER-hair-color (Hair colors): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: No selected values are captured.; endingBoundary: No selected values are captured.; twoCompleteCounts: Two complete independent counts are not available.; nativeOrderContinuity: No native-order rows are available to audit.; missingIndices: No selected values are captured.; wrappingBehavior: NOT_OBSERVED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; evidenceForEveryClaimedOption: No claimed options exist; category is incomplete because no selected values are captured.; unprovenFinalOptionClaims: No final option is proven. Next: Record the shortest possible Hair Color boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-ORDER-hairstyles (Hairstyles): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: No selected values are captured.; endingBoundary: No selected values are captured.; twoCompleteCounts: Two complete independent counts are not available.; nativeOrderContinuity: No native-order rows are available to audit.; missingIndices: No selected values are captured.; wrappingBehavior: Wrapping behavior is not proven.; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; evidenceForEveryClaimedOption: No claimed options exist; category is incomplete because no selected values are captured.; unprovenFinalOptionClaims: No final option is proven. Next: Record the shortest possible Hairstyles boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-VIEWS-hairstyles (Hairstyles): Missing required production view(s): FRONT, LEFT_3Q, LEFT_PROFILE, REAR, RIGHT_PROFILE, RIGHT_3Q. Next: Record targeted Hairstyles views with canonical settings; do not rerecord unrelated categories.
- REQ-ORDER-head-template (Head templates): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: endingBoundary: The recording does not demonstrate the final selector boundary or a terminal no-more-options state.; twoCompleteCounts: Two complete independent counts are not available.; nativeOrderContinuity: Missing native indices within observed range: 15, 19, 20, 25, 26.; missingIndices: Missing indices: 15, 19, 20, 25, 26.; repeatedIndices: Repeated selected indices: 12, 16.; wrappingBehavior: No selector wrap from final option back to first option is shown.; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; unprovenFinalOptionClaims: Face 30 and Face 31 are directly observed before the recording ends on Face 29, and no end or wrap behavior is shown. Next: Record the shortest possible Head Template boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-VIEWS-heads (Head templates): Missing required production view(s): FRONT, LEFT_3Q, LEFT_PROFILE, RIGHT_3Q, RIGHT_PROFILE, REAR. Next: Record targeted Heads views with canonical settings; do not rerecord unrelated categories.
- REQ-VIEWS-jaw-shape (Jaw shape): Missing required production view(s): FRONT, LEFT_PROFILE, RIGHT_PROFILE. Next: Record targeted Jaw Shape views with canonical settings; do not rerecord unrelated categories.
- REQ-ORDER-nose (Nose): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; endingBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; twoCompleteCounts: Two complete independent counts are not available.; repeatedIndices: Repeated selected indices or labels: 5.; wrappingBehavior: POSSIBLE_WRAP_OBSERVED_UNVERIFIED_REQUIRES_REVIEW; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; unprovenFinalOptionClaims: LAST_OBSERVED_IN_CURRENT_FOOTAGE_NOT_PROVEN_FINAL_AVAILABLE Next: Record the shortest possible Nose boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-VIEWS-nose (Nose): Missing required production view(s): FRONT, LEFT_PROFILE, RIGHT_PROFILE. Next: Record targeted Nose views with canonical settings; do not rerecord unrelated categories.
- REQ-ORDER-skin-details (Skin details): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; endingBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; twoCompleteCounts: Two complete independent counts are not available.; wrappingBehavior: NOT_DEMONSTRATED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; unprovenFinalOptionClaims: LAST_OBSERVED_IN_CURRENT_FOOTAGE_NOT_PROVEN_FINAL_AVAILABLE Next: Record the shortest possible Skin Details boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.
- REQ-ORDER-skin-tone (Skin tone): Selector beginning/final boundary, two complete counts, wrap behavior, or native-order continuity is not production-proven: beginningBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; endingBoundary: NOT_DEMONSTRATED_AS_SELECTOR_BOUNDARY; twoCompleteCounts: Two complete independent counts are not available.; nativeOrderContinuity: Missing native-order values inside observed range: 5, 14, 15, 16, 25, 26, 27, 28.; missingIndices: Missing indices: 5, 14, 15, 16, 25, 26, 27, 28.; repeatedIndices: Repeated selected indices or labels: 10.; wrappingBehavior: NOT_DEMONSTRATED; countMatchesRecordTotal: No total count is claimed, so count cannot be matched to record total.; unprovenFinalOptionClaims: LAST_OBSERVED_IN_CURRENT_FOOTAGE_NOT_PROVEN_FINAL_AVAILABLE Next: Record the shortest possible Skin Tone boundary/order clip: first value, every selected transition needed for the current gap, final value, and wrap/no-wrap proof.

## 11. Exact Minimum Recording Plan

| Recapture ID | Category | Option/range | Required views | Proposed filename |
| --- | --- | --- | --- | --- |
| CF27-MIN-RECAP-001 | Chin | CF27_XBOXUNKNOWN_RTG_CHIN_SQUARE | FRONT; LEFT_PROFILE; RIGHT_PROFILE | GFM-CF27-MIN-CHIN-REQ-VIEWS-CHIN-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-002 | Ear shape | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-EAR-SHAPE-REQ-ORDER-EAR-SHAPE-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-003 | Ear shape | CF27_XBOXUNKNOWN_RTG_EARSHAPE_001; CF27_XBOXUNKNOWN_RTG_EARSHAPE_002; CF27_XBOXUNKNOWN_RTG_EARSHAPE_003; CF27_XBOXUNKNOWN_RTG_EARSHAPE_004 | LEFT_PROFILE; RIGHT_PROFILE | GFM-CF27-MIN-EAR-SHAPE-REQ-VIEWS-EAR-SHAPE-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-004 | Eye color | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-EYE-COLOR-REQ-ORDER-EYE-COLOR-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-005 | Eye shape | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-EYE-SHAPE-REQ-ORDER-EYE-SHAPE-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-006 | Facial hair | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-FACIAL-HAIR-REQ-ORDER-FACIAL-HAIR-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-007 | Facial hair | CF27_XBOXUNKNOWN_RTG_FACIALHAIR_MUTTON_CHOPS | FRONT; LEFT_3Q; LEFT_PROFILE; RIGHT_3Q; RIGHT_PROFILE | GFM-CF27-MIN-FACIAL-HAIR-REQ-VIEWS-FACIAL-HAIR-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-008 | Facial-hair colors | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-FACIAL-HAIR-COLORS-REQ-ORDER-FACIAL-HAIR-COLOR-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-009 | Game title/version/update evidence | environment/version/patch/platform proof | ENVIRONMENT_SCREEN | GFM-CF27-MIN-GAME-TITLE-VERSION-UPDATE-EVIDENCE-REQ-VERSION-PATCH-PLATFORM-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-010 | Hair colors | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-HAIR-COLORS-REQ-ORDER-HAIR-COLOR-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-011 | Hairstyles | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-HAIRSTYLES-REQ-ORDER-HAIRSTYLES-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-012 | Hairstyles | CF27_XBOXUNKNOWN_RTG_HAIRSTYLE_SHORT_CURLY | FRONT; LEFT_3Q; LEFT_PROFILE; REAR; RIGHT_PROFILE; RIGHT_3Q | GFM-CF27-MIN-HAIRSTYLES-REQ-VIEWS-HAIRSTYLES-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-013 | Head templates | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-HEAD-TEMPLATES-REQ-ORDER-HEAD-TEMPLATE-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-014 | Head templates | CF27_XBOXUNKNOWN_RTG_HEAD_001; CF27_XBOXUNKNOWN_RTG_HEAD_002; CF27_XBOXUNKNOWN_RTG_HEAD_003; CF27_XBOXUNKNOWN_RTG_HEAD_004; CF27_XBOXUNKNOWN_RTG_HEAD_005; CF27_XBOXUNKNOWN_RTG_HEAD_006; CF27_XBOXUNKNOWN_RTG_HEAD_007; CF27_XBOXUNKNOWN_RTG_HEAD_008; CF27_XBOXUNKNOWN_RTG_HEAD_009; CF27_XBOXUNKNOWN_RTG_HEAD_010; CF27_XBOXUNKNOWN_RTG_HEAD_011; CF27_XBOXUNKNOWN_RTG_HEAD_012; CF27_XBOXUNKNOWN_RTG_HEAD_013; CF27_XBOXUNKNOWN_RTG_HEAD_014; CF27_XBOXUNKNOWN_RTG_HEAD_016; CF27_XBOXUNKNOWN_RTG_HEAD_017; CF27_XBOXUNKNOWN_RTG_HEAD_018; CF27_XBOXUNKNOWN_RTG_HEAD_021; CF27_XBOXUNKNOWN_RTG_HEAD_022; CF27_XBOXUNKNOWN_RTG_HEAD_023; CF27_XBOXUNKNOWN_RTG_HEAD_024; CF27_XBOXUNKNOWN_RTG_HEAD_027; CF27_XBOXUNKNOWN_RTG_HEAD_028; CF27_XBOXUNKNOWN_RTG_HEAD_029; CF27_XBOXUNKNOWN_RTG_HEAD_030; CF27_XBOXUNKNOWN_RTG_HEAD_031 | FRONT; LEFT_3Q; LEFT_PROFILE; RIGHT_3Q; RIGHT_PROFILE; REAR | GFM-CF27-MIN-HEAD-TEMPLATES-REQ-VIEWS-HEADS-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-015 | Jaw shape | CF27_XBOXUNKNOWN_RTG_JAWSHAPE_SQUARE | FRONT; LEFT_PROFILE; RIGHT_PROFILE | GFM-CF27-MIN-JAW-SHAPE-REQ-VIEWS-JAW-SHAPE-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-016 | Nose | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-NOSE-REQ-ORDER-NOSE-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-017 | Nose | CF27_XBOXUNKNOWN_RTG_NOSE_001; CF27_XBOXUNKNOWN_RTG_NOSE_002; CF27_XBOXUNKNOWN_RTG_NOSE_003; CF27_XBOXUNKNOWN_RTG_NOSE_004; CF27_XBOXUNKNOWN_RTG_NOSE_005; CF27_XBOXUNKNOWN_RTG_NOSE_006; CF27_XBOXUNKNOWN_RTG_NOSE_007 | FRONT; LEFT_PROFILE; RIGHT_PROFILE | GFM-CF27-MIN-NOSE-REQ-VIEWS-NOSE-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-018 | Skin details | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-SKIN-DETAILS-REQ-ORDER-SKIN-DETAILS-YYYYMMDD-partNN.mp4 |
| CF27-MIN-RECAP-019 | Skin tone | first value through final value plus wrap/no-wrap proof | MENU | GFM-CF27-MIN-SKIN-TONE-REQ-ORDER-SKIN-TONE-YYYYMMDD-partNN.mp4 |

## 12. Items That Do Not Need To Be Recorded Again

Current candidate observations should not be rerecorded only for second verification. They should be reviewed in the verifier workspace. Front-only gaps should use frame re-extraction first where the existing source video shows a character preview and menu state together.

## 13. Candidate-By-Candidate Matrix

| Candidate ID | Category | Native label/index/order | Existing source video | Timestamp | Classification | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_BLUE_CHIP | Body-related appearance controls | BLUE CHIP | phase0-video-001 | 18-23 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_CONTRIBUTOR | Body-related appearance controls | CONTRIBUTOR | phase0-video-001 | 18-23 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_ELITE | Body-related appearance controls | ELITE | phase0-video-001 | 18-23 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_JOURNEYTYPE_UNDERDOG | Body-related appearance controls | UNDERDOG | phase0-video-001 | 18-23 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_POSITION_QB | Body-related appearance controls | QB | phase0-video-001 | 24-29 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_CHIN_SQUARE | Chin | Square | CF27_XBOX_SOURCE_2026_08_02_001 | 230-240.24 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EARSHAPE_001 | Ear Shape | Attached Lobe | phase0-video-009 | 18-20 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EARSHAPE_002 | Ear Shape | None | phase0-video-009 | 16-17 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EARSHAPE_003 | Ear Shape | Round Free Lobe | phase0-video-009 | 23-25 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EARSHAPE_004 | Ear Shape | Pointed | phase0-video-009 | 26-30.21 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYECOLOR_001 | Eye Color | Light Blue | phase0-video-007 | 12-12 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYECOLOR_002 | Eye Color | Light Brown | phase0-video-007 | 13-15 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYECOLOR_003 | Eye Color | Brown | phase0-video-007 | 16-17 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYECOLOR_004 | Eye Color | Blue | phase0-video-007 | 18-20 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYECOLOR_005 | Eye Color | Light Green | phase0-video-007 | 25-29.33 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYECOLOR_006 | Eye Color | Grey | phase0-video-007 | 23-24 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYECOLOR_007 | Eye Color | Hazel | phase0-video-007 | 21-22 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYESHAPE_001 | Eye Shape | Almond | phase0-video-006 | 14-14 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYESHAPE_002 | Eye Shape | None | phase0-video-006 | 15-16 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYESHAPE_003 | Eye Shape | Prominent | phase0-video-006 | 17-18 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYESHAPE_004 | Eye Shape | Monolid | phase0-video-006 | 19-19 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_EYESHAPE_005 | Eye Shape | Hooded | phase0-video-006 | 20-24.93 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_FACIALHAIR_MUTTON_CHOPS | Facial hair | Mutton Chops | CF27_XBOX_SOURCE_2026_08_02_002 | 175-224 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_FACIALHAIRCOLOR_PURPLE | Facial-hair colors | Purple | CF27_XBOX_SOURCE_2026_08_02_002 | 225-235.35 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HAIRCOLOR_LIGHT_BROWN | Hair colors | Light Brown | CF27_XBOX_SOURCE_2026_08_02_002 | 100-174 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HAIRSTYLE_SHORT_CURLY | Hairstyles | Short Curly | CF27_XBOX_SOURCE_2026_08_02_002 | 5-99 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_001 | Heads | Face 1 | phase0-video-002 | 10-19 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_002 | Heads | Face 2 | phase0-video-002 | 20-28 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_003 | Heads | Face 3 | phase0-video-002 | 29-38 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_004 | Heads | Face 4 | phase0-video-002 | 39-48 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_005 | Heads | Face 5 | phase0-video-002 | 69-74 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_006 | Heads | Face 6 | phase0-video-002 | 60-68 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_007 | Heads | Face 7 | phase0-video-002 | 54-59 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_008 | Heads | Face 8 | phase0-video-002 | 49-53 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_009 | Heads | Face 9 | phase0-video-002 | 75-79 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_010 | Heads | Face 10 | phase0-video-002 | 80-88 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_011 | Heads | Face 11 | phase0-video-002 | 89-94 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_012 | Heads | Face 12 | phase0-video-003 | 0-4 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_013 | Heads | Face 13 | phase0-video-003 | 21-29 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_014 | Heads | Face 14 | phase0-video-003 | 14-20 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_016 | Heads | Face 16 | phase0-video-003 | 5-13 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_017 | Heads | Face 17 | phase0-video-003 | 30-39 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_018 | Heads | Face 18 | phase0-video-003 | 40-49 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_021 | Heads | Face 21 | phase0-video-003 | 80-89 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_022 | Heads | Face 22 | phase0-video-003 | 70-79 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_023 | Heads | Face 23 | phase0-video-003 | 50-59 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_024 | Heads | Face 24 | phase0-video-003 | 60-69 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_027 | Heads | Face 27 | phase0-video-003 | 90-99 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_028 | Heads | Face 28 | phase0-video-003 | 100-109 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_029 | Heads | Face 29 | phase0-video-003 | 127-133.02 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_030 | Heads | Face 30 | phase0-video-003 | 120-126 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_HEAD_031 | Heads | Face 31 | phase0-video-003 | 110-119 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_JAWSHAPE_SQUARE | Jaw Shape | Square | CF27_XBOX_SOURCE_2026_08_02_001 | 220-229 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_MOUTHSHAPE_HEAVY | Mouth Shape | Heavy | CF27_XBOX_SOURCE_2026_08_02_001 | 210-219 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_NOSE_001 | Nose | None | phase0-video-008 | 15-15 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_NOSE_002 | Nose | Hooked | phase0-video-008 | 16-18 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_NOSE_003 | Nose | Button | phase0-video-008 | 19-20 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_NOSE_004 | Nose | Nubian | phase0-video-008 | 21-22 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_NOSE_005 | Nose | Aquiline | phase0-video-008 | 14-14 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_NOSE_006 | Nose | Roman | phase0-video-008 | 25-27 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_NOSE_007 | Nose | Funnel | phase0-video-008 | 23-24 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_001 | Skin Details | None | phase0-video-005 | 8-8 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_002 | Skin Details | Freckles 2 | phase0-video-005 | 9-10 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_003 | Skin Details | Scar 3 | phase0-video-005 | 11-14 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_004 | Skin Details | Scar 2 | phase0-video-005 | 15-16 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_005 | Skin Details | Scar 1 | phase0-video-005 | 23-24 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_006 | Skin Details | Acne Scar 1 | phase0-video-005 | 21-22 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_007 | Skin Details | Redness 3 | phase0-video-005 | 19-20 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_008 | Skin Details | Redness 2 | phase0-video-005 | 17-18 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_009 | Skin Details | Redness 1 | phase0-video-005 | 25-26 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINDETAILS_010 | Skin Details | Freckles 1 | phase0-video-005 | 27-31.72 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_001 | Skin Tone | Skin Tone 01 | phase0-video-004 | 45-46 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_002 | Skin Tone | Skin Tone 02 | phase0-video-004 | 47-47 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_003 | Skin Tone | Skin Tone 03 | phase0-video-004 | 48-49 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_004 | Skin Tone | Skin Tone 04 | phase0-video-004 | 12-13 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_006 | Skin Tone | Skin Tone 06 | phase0-video-004 | 29-30 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_007 | Skin Tone | Skin Tone 07 | phase0-video-004 | 27-28 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_008 | Skin Tone | Skin Tone 08 | phase0-video-004 | 25-26 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_009 | Skin Tone | Skin Tone 09 | phase0-video-004 | 8-11 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_010 | Skin Tone | Skin Tone 10 | phase0-video-004 | 14-14 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_011 | Skin Tone | Skin Tone 11 | phase0-video-004 | 50-51 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_012 | Skin Tone | Skin Tone 12 | phase0-video-004 | 43-44 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_013 | Skin Tone | Skin Tone 13 | phase0-video-004 | 39-40 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_017 | Skin Tone | Skin Tone 17 | phase0-video-004 | 37-38 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_018 | Skin Tone | Skin Tone 18 | phase0-video-004 | 20-22 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_019 | Skin Tone | Skin Tone 19 | phase0-video-004 | 17-19 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_020 | Skin Tone | Skin Tone 20 | phase0-video-004 | 15-16 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_021 | Skin Tone | Skin Tone 21 | phase0-video-004 | 23-24 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_022 | Skin Tone | Skin Tone 22 | phase0-video-004 | 35-36 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_023 | Skin Tone | Skin Tone 23 | phase0-video-004 | 52-53.82 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_024 | Skin Tone | Skin Tone 24 | phase0-video-004 | 33-34 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |
| CF27_XBOXUNKNOWN_RTG_SKINTONE_029 | Skin Tone | Skin Tone 29 | phase0-video-004 | 31-32 | SECOND_VERIFIER_CONFIRMATION_REQUIRED | Send this candidate to the second-verifier workspace; preserve any duplicate/order flags for human review. |

## 14. Category Totals

| Category | Rows | Classification counts | Genuine recaptures | Frame re-extractions | Second-verifier confirmations |
| --- | ---: | --- | ---: | ---: | ---: |
| Additional visible face-matching controls | 1 | MISSING_FROM_EXISTING_MEDIA: 1 | 0 | 0 | 0 |
| Appearance menu map | 1 | CLEAR_EXISTING_EVIDENCE_WITH_NOTES: 1 | 0 | 0 | 0 |
| Body or physique controls | 1 | CLEAR_EXISTING_EVIDENCE_WITH_NOTES: 1 | 0 | 0 | 0 |
| Body-related appearance controls | 5 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 5 | 0 | 0 | 5 |
| Chin | 2 | GENUINE_RECAPTURE_REQUIRED: 1; SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 1 | 0 | 1 |
| Dependency tests | 1 | MISSING_FROM_EXISTING_MEDIA: 1 | 0 | 0 | 0 |
| Ear shape | 2 | GENUINE_RECAPTURE_REQUIRED: 2 | 2 | 0 | 0 |
| Ear Shape | 4 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 4 | 0 | 0 | 4 |
| Eye color | 2 | GENUINE_RECAPTURE_REQUIRED: 1; FRAME_REEXTRACTION_REQUIRED: 1 | 1 | 1 | 0 |
| Eye Color | 7 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 7 | 0 | 0 | 7 |
| Eye shape | 2 | GENUINE_RECAPTURE_REQUIRED: 1; FRAME_REEXTRACTION_REQUIRED: 1 | 1 | 1 | 0 |
| Eye Shape | 5 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 5 | 0 | 0 | 5 |
| Facial hair | 3 | GENUINE_RECAPTURE_REQUIRED: 2; SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 2 | 0 | 1 |
| Facial-hair colors | 3 | GENUINE_RECAPTURE_REQUIRED: 1; FRAME_REEXTRACTION_REQUIRED: 1; SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 1 | 1 | 1 |
| Game title/version/update evidence | 2 | CLEAR_EXISTING_EVIDENCE_WITH_NOTES: 1; GENUINE_RECAPTURE_REQUIRED: 1 | 1 | 0 | 0 |
| Hair colors | 3 | GENUINE_RECAPTURE_REQUIRED: 1; FRAME_REEXTRACTION_REQUIRED: 1; SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 1 | 1 | 1 |
| Hairstyles | 3 | GENUINE_RECAPTURE_REQUIRED: 2; SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 2 | 0 | 1 |
| Head templates | 2 | GENUINE_RECAPTURE_REQUIRED: 2 | 2 | 0 | 0 |
| Heads | 26 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 26 | 0 | 0 | 26 |
| Jaw shape | 1 | GENUINE_RECAPTURE_REQUIRED: 1 | 1 | 0 | 0 |
| Jaw Shape | 1 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 0 | 0 | 1 |
| Mouth shape | 1 | FRAME_REEXTRACTION_REQUIRED: 1 | 0 | 1 | 0 |
| Mouth Shape | 1 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 0 | 0 | 1 |
| Nose | 9 | GENUINE_RECAPTURE_REQUIRED: 2; SECOND_VERIFIER_CONFIRMATION_REQUIRED: 7 | 2 | 0 | 7 |
| Road to Glory creation path | 1 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 1 | 0 | 0 | 1 |
| Skin details | 2 | GENUINE_RECAPTURE_REQUIRED: 1; FRAME_REEXTRACTION_REQUIRED: 1 | 1 | 1 | 0 |
| Skin Details | 10 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 10 | 0 | 0 | 10 |
| Skin tone | 2 | GENUINE_RECAPTURE_REQUIRED: 1; FRAME_REEXTRACTION_REQUIRED: 1 | 1 | 1 | 0 |
| Skin Tone | 21 | SECOND_VERIFIER_CONFIRMATION_REQUIRED: 21 | 0 | 0 | 21 |
| Source-video inventory | 14 | CLEAR_EXISTING_EVIDENCE: 3; CLEAR_EXISTING_EVIDENCE_WITH_NOTES: 9; DUPLICATE_UPLOAD_NO_NEW_COVERAGE: 2 | 0 | 0 | 0 |

## 15. Production-Readiness Implications

- Production catalog records remain: 0
- Second-verified records remain: 0
- Production-approved records remain: 0
- Current candidates are not production eligible.
- Production promotion remains blocked by missing human verification, unresolved environment/version proof, incomplete native-order/boundary proof, and missing standardized production views.

## 16. Exact Owner Actions

1. Record only the tasks in `data/phase-zero/cf27_minimum_recapture_queue.json`.
2. Do not rerecord candidate observations classified as `SECOND_VERIFIER_CONFIRMATION_REQUIRED`.
3. Do not rerecord front-only gaps until frame re-extraction has been attempted.
4. If the older OWNER_DOWNLOADS masters are still available, re-add those masters through the intake flow rather than recording them again.

## 17. Exact Second-Verifier Actions

1. Review all candidate rows classified as `SECOND_VERIFIER_CONFIRMATION_REQUIRED`.
2. Perform 100% review of duplicate/disputed records.
3. Confirm evidence-file existence, source timestamp, menu label/index, and native order where visible.
4. Do not mark any row production approved.
5. Mark rows blocked pending recapture when their required production evidence is not present.
