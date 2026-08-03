# CF27 Second-Verifier Execution Guide

**Status:** handoff guide for a real independent verifier
**Package:** `CF27_XBOX_RTG_SECOND_VERIFIER_EXECUTION_v1`
**Generated at:** 2026-07-21T05:00:00-04:00
**Production data:** no
**Verification completed:** no

This guide summarizes the executable verifier packet in `data/phase-zero/second-verifier-execution-package`. It must not be used to claim production approval.

## Required Order

1. Record verifier identity and environment metadata in `environment_worksheet.csv`.
2. Complete blind independent counts in `independent_counts_worksheet.csv`.
3. Complete menu-map and native-order worksheets before opening record-level comparisons.
4. Review all candidate records in `final_verifier_work_queue.csv`.
5. Confirm front-view evidence in `front_view_checks.csv`, including recovered frames listed in `frame_reextraction_reference.csv`.
6. Complete the deterministic 25% secondary-angle sample in `secondary_angle_sample.csv`.
7. Complete duplicate/exception review for flagged records.
8. Log every disagreement in `discrepancy_form.csv`.
9. Complete `sign_off_form.csv` and submit through the verifier intake workflow.

## Deterministic Secondary-Angle Sampling

Method: `deterministic-sha256-environment-verifier-catalog-category-quartile-v1`

Seed input: `env-cf27-phase0-video-001-rtg-custom-qb|VERIFIER_ID_TO_BE_ASSIGNED|CF27_XBOX_RTG_RESEARCH_CANDIDATE_v1.0.0`

The generator hashes environment ID, verifier ID, catalog version, category, and candidate ID with SHA-256, sorts candidates inside each category, and selects the first 25% using ceiling rounding. Selected records: 27.

## Workstream Split

- Can review from existing media: rows in `final_verifier_work_queue.csv` marked `CAN_REVIEW_IMMEDIATELY_FROM_EXISTING_MEDIA`.
- Requires independent console recount: rows marked `REQUIRES_INDEPENDENT_CONSOLE_RECOUNT`.
- Requires Wyatt clip: rows marked `REQUIRES_WYATT_CLIP`; use `docs/status/CF27_OWNER_MINIMUM_RECORDING_GUIDE.md`.
- Requires discrepancy/duplicate resolution: rows marked `REQUIRES_DISCREPANCY_RESOLUTION`.
- Cannot become production eligible yet: every row until real second verification, discrepancy resolution, catalog-manager disposition, and immutable release pass.

## Allowed Final Statuses

- `VERIFIED`
- `VERIFIED_WITH_NOTES`
- `RECAPTURE_REQUIRED`
- `VERSION_MISMATCH`
- `MISSING_EVIDENCE`
- `COUNT_MISMATCH`
- `ORDER_MISMATCH`
- `DEPENDENCY_UNRESOLVED`
- `NOT_VERIFIED`

## Frame Re-Extractions

Recovered frame count: 7

These frames are supplemental evidence for the verifier. They do not change primary observations, second-verification status, or production eligibility.

## Non-Negotiable Limits

- Do not use the primary researcher as the second verifier.
- Do not mark a row verified from memory.
- Do not average disagreements.
- Do not promote records to production.
- Do not use fixtures, placeholders, or synthetic rows.
