GFM | Q04 | PROMPT 095 | PHASE 02 | Ingest CF27 recapture recordings and refresh verification queue

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | Q04 | PROMPT 094 | PHASE 02 | Generate CF27 evidence and recapture package`

## Objective

After Wyatt supplies new console recordings requested by the evidence recapture package, ingest those files, validate media metadata and hashes, extract direct observations, update evidence and candidate records, refresh the recapture package, and regenerate the production-verification queue without promoting records.

## Current Queue State

- Queue file: `data/phase-zero/production_verification_queue.json`
- Human summary: `docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md`
- Internal workspace: Phase 0 status panel, second-verifier workspace
- Evidence package: `data/phase-zero/evidence-recapture-package/evidence_quality_report.json`
- Owner checklist: `docs/phase-zero/CF27_OWNER_RECAPTURE_CHECKLIST.md`
- Queue records: 92
- Evidence-linked records: 92
- Missing-evidence records: 0
- Review-ready records from current evidence: 92
- Recapture-required records: 92
- Recapture tasks: 104
- Verifier discrepancy rows: 166
- Duplicate or near-duplicate records: 5
- Order-unresolved records: 3
- Records with missing required production views: 87
- Version/environment-gap records: 92
- Second-verified records: 0
- Production-approved records: 0
- Production-eligible records: 0

## Required Owner Action

Wyatt must record the highest-priority recapture videos from `docs/phase-zero/CF27_OWNER_RECAPTURE_CHECKLIST.md` and place the untouched files in the approved intake folder.

Recordings must:

1. Preserve original filenames and master files.
2. Show environment/version/patch baseline screens where requested.
3. Keep menu labels, native indices/order, and selected values visible.
4. Capture missing required views and selector boundaries directly.
5. Avoid exposing private account, payment, serial-number, or credential data.
6. Use the recommended filenames where practical.

## Codex Can Still Do

- Ingest supplied recapture files through the intake pipeline.
- Hash, inventory, segment, and extract only necessary derivative evidence.
- Update evidence manifests, timelines, candidate status, recapture tasks, and verifier queue.
- Keep all records non-production until second verification and catalog-manager approval occur.

## Stop Point

Do not promote records, publish a production catalog, run real recommendations, connect Stripe, or connect remote Supabase during this next action. Prompt 095 is blocked until Wyatt supplies new recapture recordings.
