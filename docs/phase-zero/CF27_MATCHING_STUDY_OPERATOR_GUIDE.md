# CF27 Matching Study Operator Guide

**Status:** workflow only
**Study status:** NOT STARTED
**Production status:** NOT PRODUCTION DATA

This guide prepares the 10-20 person College Football 27 top-three matching feasibility study. Do not recruit or scan participants until a nonempty verified CF27 production catalog exists and can generate real recommendations.

## Start Gates

1. Verified production CF27 catalog is available.
2. Recommendation output uses only production-approved records.
3. Build instructions resolve to verified menu paths and native values.
4. Consent language has been reviewed for the actual study context.
5. The operator has completed a deletion dry-run for raw media, screenshot media, and derived profiles.

## Operator Workflow

1. Assign a pseudonymous `participant_id` such as `participant-cf27-study-v1-001`.
2. Record consent version, age/eligibility confirmation, permission confirmation, capture mode, device type, and lighting condition in `data/phase-zero/manual_matching_subjects.template.csv`.
3. Capture or upload the required views through the approved app flow. Do not commit raw images or screenshots.
4. Record the original app-generated top three before reviewer feedback.
5. Assign two independent reviewers and collect their top-three choices in `data/phase-zero/manual_matching_reviews.template.csv`.
6. Record participant selection, final in-game choice, resemblance rating, mismatch reasons, repeat scan data when available, screenshot-refinement outcome, and deletion confirmations in `data/phase-zero/manual_matching_results.template.csv`.
7. Run `npm run phase-zero:manual-matching -- analyze`.
8. Treat metrics as "not measured" until at least 10 complete real participant records exist.

## Privacy Rules

- Raw capture media and screenshot-refinement media are temporary by default.
- Do not store names, emails, gamer tags, school affiliations, or direct identifiers in committed files.
- Store only non-image, pseudonymous study rows in the repository.
- Study rows are not production catalog evidence.
- Model tuning must not use fixture rows, synthetic rows, deleted/withdrawn rows, or incomplete rows.

## Completion Criteria

The study package is complete only when the report includes at least 10 complete real participant records, deletion success is 100%, and the target comparison is generated from actual study rows.
