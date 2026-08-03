GFM | Q04 | PROMPT 093 | PHASE 02 | Hand off CF27 production verification queue to second verifier

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | Q04 | PROMPT 092 | PHASE 02 | Build CF27 production verification queue`

## Objective

Use the canonical CF27 production-verification queue to prepare the next real human action: a second verifier must independently inspect the queue, source videos, timestamps, evidence frames, menu counts, native ordering, duplicate/ambiguous records, missing views, and environment/version gaps.

## Current Queue State

- Queue file: `data/phase-zero/production_verification_queue.json`
- Human summary: `docs/phase-zero/CF27_PRODUCTION_VERIFICATION_QUEUE.md`
- Queue records: 92
- Evidence-linked records: 92
- Missing-evidence records: 0
- Duplicate or near-duplicate records: 5
- Order-unresolved records: 3
- Records with missing required production views: 87
- Version/environment-gap records: 92
- Second-verified records: 0
- Production-approved records: 0
- Production-eligible records: 0

## Required Human Action

Assign a real second verifier who has independent access to the shipping game and can complete the verifier worksheets without copying primary-research conclusions.

The verifier must:

1. Complete environment and version worksheet.
2. Complete blind independent counts before opening record-level comparison rows.
3. Check source videos and timestamps for every assigned candidate.
4. Review duplicate and ambiguous records explicitly.
5. Record missing evidence, count mismatch, order mismatch, version mismatch, dependency unresolved, or recapture required statuses where appropriate.
6. Sign off only on records directly supported by independent evidence.

## Codex Can Still Do

- Refine verifier import tooling if the real submission format changes.
- Generate a concise handoff packet from the queue.
- Validate completed verifier files after Wyatt supplies them.

## Stop Point

Do not promote records, publish a production catalog, run real recommendations, connect Stripe, or connect remote Supabase during this next action.
