# Manual Matching Result Worksheet

**Status:** worksheet instructions only
**Accuracy status:** not measured until real completed rows exist

Use `data/phase-zero/manual_matching_results.template.csv`.

## Required Fields

- `source_type`: `actualStudy` for real consenting participants, `testFixture` only under test-only fixtures.
- `participant_id`: pseudonymous ID only.
- `catalog_version_id`: exact verified catalog version used.
- `algorithm_version`: matcher version used for the original top three.
- `original_top_three_catalog_ids`: semicolon-separated top-three IDs from the app before human review.
- `capture_quality_state`: `passed`, `passedWithWarnings`, or `failed`.
- `participant_usefulness_rating_1_to_5`: participant usefulness rating.
- `participant_resemblance_rating_1_to_5`: participant resemblance rating.
- `final_in_game_catalog_id`: final option the participant would use, if any.
- `repeat_scan_*`: repeat-scan comparison where available.
- `raw_media_deleted_confirmed` and `profile_deleted_confirmed`: both must be `yes` before a result is complete.

Do not include participant names, raw image references, precise facial measurements, contact information, or unverified catalog IDs.
