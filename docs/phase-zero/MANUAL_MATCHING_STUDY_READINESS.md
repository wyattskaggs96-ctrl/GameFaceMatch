# Manual Matching Study Readiness Decision

**Decision:** NOT_READY  
**Decision date:** 2026-07-14  
**Scope:** 10-20-person manual feasibility study for College Football 27 top-three appearance matching  
**Study status:** NOT STARTED  
**Production recommendation status:** FAIL-CLOSED  

Do not begin the manual feasibility study automatically. The study is blocked until a verified production College Football 27 catalog release exists and can drive real top-three outputs and verified build instructions.

## Gate Review

| Gate | Status | Evidence | Blocker |
| --- | --- | --- | --- |
| Verified production catalog | BLOCKED | `data/catalog/production/catalog_manifest.json` has 0 items and version `empty-production`; `data/catalog/production-releases/cf27-production-empty-2026-07-14/production_readiness_decision.json` reports `BLOCKED_NO_PRODUCTION_ELIGIBLE_RECORDS`; `data/phase-zero/production-candidate-import/production_candidate_import_report.json` reports `NO_VERIFICATION_CANDIDATE_PACKAGE`. | No verified production College Football 27 records are available. |
| Working top-three matcher | IMPLEMENTED_BUT_BLOCKED | `web/lib/matching/matching-engine.ts` implements explainable top-three matching and tests cover fixture/empty-catalog behavior. | Cannot be used for a real study until a verified production catalog is approved. |
| Working build instructions | IMPLEMENTED_BUT_BLOCKED | `web/lib/results/results-experience.ts` generates instructions only from verified navigation data. | No verified production menu paths or native values are loaded. |
| Consent flow | READY_WITH_REVIEW_REQUIRED | `docs/phase-zero/MANUAL_MATCHING_FEASIBILITY_PROTOCOL.md` defines study consent language and acknowledgments; `data/phase-zero/manual_matching_subjects.template.csv` has consent fields. | Final legal/context review is required before collecting real participant media. |
| Deletion flow | READY_WITH_MANUAL_QA_REQUIRED | `web/lib/privacy/data-lifecycle.ts` defines local deletion scopes; study templates include raw-media and profile deletion fields. | Study operator deletion dry-run must be performed against real local study storage. |
| Study forms | READY_AS_TEMPLATES | Subject, review, and results CSV templates exist under `data/phase-zero/`. | None for template readiness. |
| Participant IDs | READY_AS_TEMPLATE_FIELDS | `manual_matching_subjects.template.csv` contains `participant_id` and `participant_sequence`. | None for template readiness. |
| Reviewer forms | READY_AS_TEMPLATES | `manual_matching_reviews.template.csv` and `manual_matching_results.template.csv` include reviewer IDs, independent top-three choices, reviewer comparison, mismatch reasons, and deletion confirmations. | None for template readiness. |
| Privacy rules | READY_WITH_REVIEW_REQUIRED | The protocol requires pseudonymous IDs, no direct identifiers in templates, no committed raw media, raw-photo deletion by default, and non-image records only. | Final privacy/legal review is required before real participant collection. |
| Metric calculations | READY_AS_SCRIPTED_TEMPLATE_ANALYSIS | `scripts/manual-matching-feasibility.mjs` calculates top-one acceptance, top-three usefulness, reviewer agreement, mismatch counts, and deletion confirmation. | None for template analysis readiness. |
| No placeholder results | PASS | Manual matching CSVs are header-only templates; `node scripts/manual-matching-feasibility.mjs validate` reports `studyHasRun: false`. | None. |
| No fixture leakage | PASS | Production catalog fixture and placeholder scans pass; production bundle guards remain in place. | None. |

## Exact Blockers

1. No verified production College Football 27 catalog release exists.
2. No verification-candidate package is present at `data/phase-zero/verification-candidate-package/catalog_manifest.json`.
3. The active production catalog has zero verified records.
4. The production publish gate is blocked by `candidateImportPassed` and `directShippingGameEvidence` failures.
5. Top-three production matching and build instructions cannot be exercised with verified real records.
6. Hair, hair color, facial hair, and facial-hair color research records are still requested/not captured in the current research release.
7. Second-person verification and catalog-manager approval have not produced a production-eligible package.
8. Final consent/privacy review and a real local study-storage deletion dry-run are still required before collecting participant media.

## What Is Ready

- Manual study protocol language and study boundaries.
- Header-only subject, reviewer, and result templates.
- Pseudonymous participant ID fields.
- Reviewer top-three and appearance-selection fields.
- Deletion confirmation fields.
- Metric calculation script for future populated study results.
- Production guards that prevent fixture, placeholder, and research records from becoming production recommendations.

## Required Decision

**NOT_READY**

The project is safe to keep preparing, but the 10-20-person manual feasibility study must not begin until the production catalog gate changes from empty/fail-closed to a nonzero approved release with verified records and verified build instructions.

## Recheck Trigger

Re-run this readiness decision after:

1. A verification-candidate package passes isolated import validation.
2. An immutable production catalog release contains nonzero verified records.
3. Top-three matching returns verified production candidates.
4. Build instructions resolve only to verified menu paths and native values.
5. Consent/privacy language is reviewed for the actual study context.
6. The study operator completes a deletion dry-run for real local study storage.
