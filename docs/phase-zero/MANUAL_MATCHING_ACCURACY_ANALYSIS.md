# Manual Matching Accuracy Analysis

**Status:** NO REAL COMPLETED STUDY DATA  
**Date:** 2026-07-14  
**Production recommendation status:** FAIL-CLOSED  
**Data policy:** Real completed study data only; synthetic fixtures excluded  

This is the current transparent feasibility report for manual matching accuracy. It does not use test fixtures, research candidates, placeholder records, or invented College Football 27 data.

## Summary

No real completed manual matching study data exists in the repository yet.

The committed subject, reviewer, and result files are header-only templates. The participant intake checkpoint records 0 discovered participant packages and 0 participants recorded. The results ingestion checkpoint records 0 submissions discovered and 0 ratings committed. The production College Football 27 catalog is still empty, so verified production recommendations cannot be produced or evaluated.

Because the denominator is 0, accuracy and usefulness metrics are not calculable. This report makes no statistical claim.

## Inputs Reviewed

| Input | Finding |
| --- | --- |
| `data/phase-zero/manual_matching_subjects.template.csv` | Header-only template; 0 participant rows. |
| `data/phase-zero/manual_matching_reviews.template.csv` | Header-only template; 0 reviewer rows. |
| `data/phase-zero/manual_matching_results.template.csv` | Header-only template; 0 result rows. |
| `data/phase-zero/manual_matching_participant_intake_checkpoint.json` | Blocked intake checkpoint; 0 participant packages discovered and 0 participants recorded. |
| `data/phase-zero/manual_matching_results_ingestion_checkpoint.json` | Rejected ingestion checkpoint; 0 submissions discovered and 0 ratings committed. |
| `data/catalog/production/catalog_manifest.json` | Production catalog contains 0 verified records. |
| `data/fixtures/test-only/manual-matching-study/synthetic-study-result.json` | Synthetic fixture exists and was excluded. |

## Metrics

| Metric | Current value | Status |
| --- | ---: | --- |
| Valid participants | 0 | Measured from real accepted participant rows. |
| Completed result rows | 0 | Measured from real accepted result rows. |
| Top-one acceptance rate | Not calculable | Denominator is 0. |
| Top-three usefulness rate | Not calculable | Denominator is 0. |
| Average resemblance rating | Not calculable | No real ratings. |
| Median resemblance rating | Not calculable | No real ratings. |
| Inter-reviewer agreement | Not calculable | No paired reviewer rows. |
| Confidence calibration | Not calculable | No real predictions or outcomes. |
| Performance by capture mode | Not calculable | No real participant rows. |
| Performance by lighting quality | Not calculable | No real participant rows. |
| Performance by facial-hair condition | Not calculable | No real participant rows. |
| Performance by hairstyle condition | Not calculable | No real participant rows. |
| Preset confusion matrix | Empty | No real predictions or selected presets. |
| Most common mismatch reasons | Empty | No real mismatch reasons. |
| Repeatability | Not calculable | No repeat scans. |

## MVP Target Comparison

| Target | Required threshold | Current result |
| --- | --- | --- |
| Study participant count | 10-20 consenting subjects for feasibility; fewer than 10 is dry-run only. | Not met: 0 valid participants. |
| Top-one acceptance | At least 55% of testers rate the top result 4 or 5 on the resemblance rubric. | Not evaluable with denominator 0. |
| Top-three usefulness | At least 75% of testers rate at least one top-three result 4 or 5. | Not evaluable with denominator 0. |
| Repeatability | Repeated captures should preserve core geometry tolerances and at least two of the top-three recommendations once a catalog is available. | Not evaluable; no real repeat scans. |

## Feasibility Decision

**Current decision:** NOT READY TO EVALUATE MATCHING ACCURACY.

The project is not failing an accuracy target; it has not produced the required real study data. The correct next move is not to tune the matcher from synthetic results. It is to finish the verified production catalog and then run the approved 10-20 participant study with consent, paired reviewer rows, participant usefulness ratings, and deletion confirmations.

## Required Before Reanalysis

1. Approve a verified production College Football 27 catalog release.
2. Confirm the manual matching study readiness decision is `READY`.
3. Ingest non-fixture participant rows with consent and required capture-view status.
4. Ingest paired reviewer rows.
5. Ingest completed participant result rows with resemblance/usefulness ratings, selected rank, mismatch reasons, and deletion confirmation.
6. Ensure every recommendation references verified production catalog records and exact catalog versions.

## Privacy Finding

No raw participant media was discovered, analyzed, stored, or committed by this analysis. No face images, landmarks, precise measurements, participant names, or direct identifiers were added. The synthetic fixture under `data/fixtures/test-only/` remains excluded from real-data analysis.
