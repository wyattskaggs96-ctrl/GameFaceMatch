# CF27 Production Verification Queue

**Status:** primary-research queue only; not second verified; not production data
**Generated at:** 2026-08-02T20:15:00-04:00
**Production recommendations enabled:** false

This queue converts current College Football 27 research candidates into a human-operable production-verification worklist. It does not independently verify records, approve records, or publish a production catalog.

## Summary

| Metric | Count |
| --- | ---: |
| Candidate records | 92 |
| Candidate identities reconciled | 92 |
| Identity conflicts | 0 |
| Evidence-linked records | 92 |
| Missing-evidence records | 0 |
| Duplicate or near-duplicate records | 5 |
| Dependency-flagged records | 0 |
| Version/environment-gap records | 92 |
| Records with missing required views | 87 |
| Recapture-recommended records | 92 |
| Second-verified records | 0 |
| Production-approved records | 0 |
| Production catalog records | 0 |
| Production-eligible records from this queue | 0 |

## Primary Review Status

- PRIMARY_APPROVED_WITH_NOTES: 84
- DUPLICATE_REVIEW_REQUIRED: 5
- ORDER_UNRESOLVED: 3

## Second-Verifier Status

- NOT_VERIFIED: 92

## Category Counts

| Category | Candidates | Evidence linked | Duplicate/near duplicate | Dependency flagged | Missing views | Production eligible |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Body-related appearance controls | 5 | 5 | 0 | 0 | 0 | 0 |
| Chin | 1 | 1 | 0 | 0 | 1 | 0 |
| Ear Shape | 4 | 4 | 1 | 0 | 4 | 0 |
| Eye Color | 7 | 7 | 0 | 0 | 7 | 0 |
| Eye Shape | 5 | 5 | 0 | 0 | 5 | 0 |
| Facial hair | 1 | 1 | 0 | 0 | 1 | 0 |
| Facial-hair colors | 1 | 1 | 0 | 0 | 1 | 0 |
| Hair colors | 1 | 1 | 0 | 0 | 1 | 0 |
| Hairstyles | 1 | 1 | 0 | 0 | 1 | 0 |
| Heads | 26 | 26 | 2 | 0 | 26 | 0 |
| Jaw Shape | 1 | 1 | 0 | 0 | 1 | 0 |
| Mouth Shape | 1 | 1 | 0 | 0 | 1 | 0 |
| Nose | 7 | 7 | 1 | 0 | 7 | 0 |
| Skin Details | 10 | 10 | 0 | 0 | 10 | 0 |
| Skin Tone | 21 | 21 | 1 | 0 | 21 | 0 |

## Verifier Operating Instructions

1. Complete blind independent counts and menu/order worksheets before opening record-level primary comparison.
2. For each queue record, review the source video and timestamp, then inspect every listed evidence reference.
3. Use only these second-verifier statuses: `VERIFIED`, `VERIFIED_WITH_NOTES`, `RECAPTURE_REQUIRED`, `VERSION_MISMATCH`, `MISSING_EVIDENCE`, `COUNT_MISMATCH`, `ORDER_MISMATCH`, `DEPENDENCY_UNRESOLVED`, `NOT_VERIFIED`.
4. Leave records as `NOT_VERIFIED` unless a real second human verifies them from direct evidence.
5. File discrepancies for count, order, label, evidence, dependency, environment, or version mismatches. Do not average or guess.
6. Do not mark any row production approved. Production approval requires later catalog-manager disposition and immutable release gates.

## Validation

- Status: passed
- Errors: 0
- Warnings: 0

## Source Artifacts

- primaryReview: `data/phase-zero/primary_review_status.json`
- primaryTraceability: `data/phase-zero/primary_review_traceability.json`
- evidenceManifest: `data/phase-zero/evidence_manifest.json`
- verifierCandidateQueue: `data/phase-zero/verifier_candidate_queue.json`
- coverageControlCenter: `data/phase-zero/evidence_coverage_control_center.json`
- issuesRegister: `data/phase-zero/issues_register.research.json`
- captureRequests: `data/phase-zero/capture_requests.json`
- countOrderAudit: `data/phase-zero/catalog_count_order_audit.research.json`
- productionManifest: `data/catalog/production/catalog_manifest.json`
