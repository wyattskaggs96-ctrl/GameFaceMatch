# CF27 Matching Study Data Dictionary

**Status:** data dictionary only
**Study status:** NOT STARTED

## Source Types

- `actualStudy`: real participant study row eligible for metrics after validation.
- `testFixture`: synthetic or fixture row. Excluded from real metrics.

## Main Tables

`manual_matching_subjects.template.csv` records consent, pseudonymous participant ID, capture mode, device type, lighting condition, required views, and raw-media deletion status.

`manual_matching_reviews.template.csv` records independent reviewer annotations, top-three verified head choices, appearance choices, disagreement flags, and mismatch reasons.

`manual_matching_results.template.csv` records original app recommendations, quality outcome, participant selection, top-one/top-three usefulness, final in-game choice, repeat scan summary, screenshot-refinement result, and deletion confirmation.

`manual_matching_repeatability.template.csv` records repeat-scan comparison without storing raw media.

## Key Privacy Fields

- `participant_id`: pseudonymous ID only.
- `consent_version`: consent text version used.
- `raw_media_deleted_confirmed`: must be `yes` for complete rows.
- `profile_deleted_confirmed`: must be `yes` for complete rows.
- `screenshot_media_deleted_confirmed`: must be `yes` for complete rows, including cases where no screenshot media remains.

## Target Metrics

- Capture completion target: at least 80%.
- Quality pass without full restart target: at least 75%.
- Top-one acceptance target: at least 50%.
- Top-three usefulness target: at least 80%.
- Raw-data deletion confirmation target: 100%.

Targets are not achievements. The dashboard reports "not measured" until at least 10 complete real participant records exist.
