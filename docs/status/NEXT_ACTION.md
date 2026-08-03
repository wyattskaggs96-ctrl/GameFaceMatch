# Next Action

`GFM | Q04 | PROMPT 098 | PHASE 04 | Ingest CF27 minimum recaptures and import second-verifier results`

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | Q04 | PROMPT 097 | PHASE 04 | Verify queue and create production handoff`

## Objective

After Wyatt supplies only the minimum CF27 recapture recordings and a real second human completes the verifier package, ingest the new media and verifier files, reconcile them against the canonical queue, and regenerate the production-verification artifacts without promoting any disputed or incomplete record.

## Current Queue State

- Current repository checkpoint before this handoff: `1411a9dac4cc5e110147af69dd0a54cb8dbb05d1`
- Queue file: `data/phase-zero/production_verification_queue.json`
- Human summary: `docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md`
- Internal workspace: Phase 0 status panel, second-verifier workspace
- Verifier execution package: `data/phase-zero/second-verifier-execution-package/`
- Evidence package: `data/phase-zero/evidence-recapture-package/evidence_quality_report.json`
- Existing-media gap audit: `data/phase-zero/cf27_existing_media_verification_gap_audit.json`
- Completed frame re-extractions: `data/phase-zero/cf27_frame_reextractions.json`
- Minimum genuine recapture queue: `data/phase-zero/cf27_minimum_recapture_queue.json`
- Production promotion gate: `scripts/cf27-production-catalog-release-manager.mjs`
- Research candidates: 92
- Evidence-linked queue records: 92
- Review-ready records from current evidence: 92
- Completed frame re-extractions: 7
- Genuine recapture tasks still requiring new Xbox recording: 21
- Duplicate or near-duplicate records: 5
- Order-unresolved records: 3
- Records with missing required production views: 87
- Version/environment-gap records: 92
- Second-verified records: 0
- Production-approved records: 0
- Production-eligible records: 0
- Production catalog records: 0
- Matching-study participants: 0

## Required Owner Action

Wyatt must provide the minimum new console recordings from `data/phase-zero/cf27_minimum_recapture_queue.json`. The source masters must be placed unchanged in the approved Phase 0 intake location and must not be renamed, trimmed, recompressed, or edited.

Each recording should:

1. Use the recommended filename where practical.
2. Show the exact menu/category/range requested by the recapture queue.
3. Keep native labels, indices, selected values, and menu paths visible.
4. Show environment/version/patch evidence where requested.
5. Preserve canonical settings required by the recapture instruction.
6. Avoid exposing private account, payment, serial-number, or credential data.

## Required Second-Human Action

A real second verifier must complete the package in `data/phase-zero/second-verifier-execution-package/` and return the completed import files. Codex must not simulate this work.

The verifier must provide:

1. Verifier identity or verifier ID.
2. Verification date.
3. Environment/platform/version/mode/path metadata.
4. Independent counts and native-order observations.
5. Required front-view confirmations.
6. Deterministic secondary-angle sample decisions.
7. Notes for every non-clean decision.
8. Final sign-off.

## Codex Can Do Next

- Ingest supplied recapture masters through the evidence intake pipeline.
- Hash, inventory, segment, and extract necessary derivative evidence.
- Import verifier decisions after a real second human submits them.
- Preserve both primary and verifier observations.
- Create discrepancy records for count/order/environment/evidence disagreements.
- Regenerate the existing-media audit, evidence recapture package, verifier queue, and production-verification queue.
- Run the fail-closed production promotion gate and leave the catalog empty unless all required human gates are satisfied.

## Stop Point

Do not publish a production catalog, run real recommendations, connect Stripe, connect remote Supabase, start a participant study, or claim matching accuracy during the next action. Production promotion remains blocked until second verification, discrepancy resolution, catalog-manager disposition, and all evidence/version/environment gates pass.
