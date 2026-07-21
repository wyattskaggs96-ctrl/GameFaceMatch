# Second-Verifier Execution Guide

This guide is for the independent human verifier who will re-check the College Football 27 research candidate package.

## What This Package Is

- Package: `CF27_XBOX_RTG_SECOND_VERIFIER_EXECUTION_v1`
- Data status: NOT PRODUCTION DATA
- Verification status: NOT VERIFIED
- Production recommendations: disabled

The package helps you record independent observations. It does not prove verification has happened, and it does not publish game records.

## Plain-Language Rules

1. Use the shipping game on Xbox, not memory or older College Football games.
2. Do not look at primary catalog counts before you finish the blind count worksheets.
3. Write exactly what you see on screen.
4. If a label, count, order, or view is unclear, mark it unresolved.
5. Do not mark anything verified unless you personally checked it and the evidence supports it.
6. If you disagree with the primary research package, fill out the discrepancy form. Do not average or guess.

## Step 1: Record Your Environment

Open `data/phase-zero/second-verifier-execution-package/environment_worksheet.csv`.

Fill in your verifier ID, platform, console model, game version, patch, mode, creation path, capture method, and evidence reference. If you cannot see a value on screen, leave it blank and note what is missing.

## Step 2: Complete Blind Counts

Before opening record-level comparison sheets, complete:

- `independent_counts_worksheet.csv`
- `independent_menu_map_worksheet.csv`
- `native_order_worksheet.csv`

Record first and final values, selector boundaries, wrapping, repeated values, skipped values, and evidence references.

## Step 3: Record-Level Review

After blind counts are complete, open:

- `record_level_comparison_worksheet.csv`
- `front_view_checks.csv`
- `secondary_angle_sample.csv`
- `duplicate_exception_review.csv`

Check the listed evidence, source timestamps, native order, front-view availability, sampled secondary angles, duplicates, and exceptions.

## Secondary-Angle Sample

Method: `deterministic-sha256-environment-verifier-catalog-category-quartile-v1`

The tool combines environment ID, verifier ID, catalog version, category, and candidate ID, hashes the value with SHA-256, sorts records within each category, and selects the first 25% using ceiling rounding. This prevents cherry-picking.

## Allowed Statuses

- `VERIFIED`
- `VERIFIED_WITH_NOTES`
- `RECAPTURE_REQUIRED`
- `VERSION_MISMATCH`
- `MISSING_EVIDENCE`
- `COUNT_MISMATCH`
- `ORDER_MISMATCH`
- `DEPENDENCY_UNRESOLVED`
- `NOT_VERIFIED`

## Submit Results

Fill `verifier_import_template.csv` and create `submission_metadata.json` under `data/phase-zero/second-verifier-submissions/`.

Then Codex can run:

```bash
npm run cf27:second-verifier-results-intake
```

The import tool validates identity, environment metadata, count completion, allowed statuses, and discrepancies. It never silently overwrites primary observations.

## What Not To Do

- Do not mark research candidates as production records.
- Do not use test fixtures or placeholders.
- Do not infer missing College Football 27 options.
- Do not skip disagreements.
- Do not use the primary researcher as the second verifier.
