# CF27 Evidence And Recapture Package

**Status:** deterministic evidence-quality and recapture package; not production data
**Generated at:** 2026-08-02T20:45:00-04:00
**Production recommendations enabled:** false

This package tells the owner and second verifier which College Football 27 records can be inspected now and which records remain blocked by missing or defective evidence. It does not create evidence, verify records, approve records, or publish a production catalog.

## Summary

| Metric | Count |
| --- | ---: |
| Queue records inspected | 92 |
| Review-ready from current evidence | 92 |
| Blocked for evidence repair | 0 |
| Recapture-required records | 92 |
| Missing-evidence records | 0 |
| Missing required view records | 87 |
| Duplicate dispute records | 5 |
| Ordering dispute records | 58 |
| Environment/version issue records | 92 |
| Dependency issue records | 0 |
| Recapture tasks | 104 |
| Verifier discrepancy rows | 166 |
| Second-verified records | 0 |
| Production-approved records | 0 |
| Production catalog records | 0 |

## Recapture Groups

| Group | Tasks | P0 tasks |
| --- | ---: | ---: |
| Environment evidence | 1 | 1 |
| Creation-path evidence | 1 | 1 |
| Menu-map evidence | 1 | 1 |
| Head records | 24 | 24 |
| Hairstyles | 3 | 3 |
| Facial hair | 1 | 1 |
| Additional attributes | 8 | 8 |
| Duplicate disputes | 5 | 5 |
| Ordering disputes | 58 | 58 |
| Version mismatches | 1 | 1 |
| Dependency tests | 1 | 0 |

## Review Rules

1. A derivative frame is review evidence, not proof that the original observation is correct.
2. A record can be review-ready for the second verifier while still requiring recapture before production.
3. Environment/version gaps, missing production views, ordering disputes, duplicate disputes, dependency questions, and canonical-setting inconsistencies all block production.
4. The second verifier must preserve disagreements and use the approved status values only.

## Generated Files

- Quality report: `data/phase-zero/evidence-recapture-package/evidence_quality_report.json`
- Record readiness CSV: `data/phase-zero/evidence-recapture-package/record_readiness.csv`
- Recapture queue JSON: `data/phase-zero/evidence-recapture-package/recapture_queue.json`
- Recapture queue CSV: `data/phase-zero/evidence-recapture-package/recapture_queue.csv`
- Verifier discrepancy report JSON: `data/phase-zero/evidence-recapture-package/verifier_discrepancy_report.json`
- Verifier discrepancy report CSV: `data/phase-zero/evidence-recapture-package/verifier_discrepancy_report.csv`
- Owner checklist: `docs/phase-zero/CF27_OWNER_RECAPTURE_CHECKLIST.md`

## Verifier Discrepancy Summary

| Metric | Count |
| --- | ---: |
| Total discrepancy rows | 166 |
| Duplicate disputes | 5 |
| Ordering disputes | 69 |
| Version/environment gaps | 92 |
| Dependency unresolved | 0 |
| Missing evidence rows | 0 |
