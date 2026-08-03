# Next Action

`GFM | Q04 | PROMPT 102 | PHASE 03 | Execute CF27 supported-subset second verification`

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | Q04 | PROMPT 101 | PHASE 03 | Classify locked media baseline into supported catalog subset`

## Objective

Guide a real independent second verifier through the Prompt 101 supported-subset package, then import and reconcile their attributable decisions without promoting any disputed, incomplete, or unapproved records.

## Current Queue State

- Owner media baseline decision: `OWNER_MEDIA_BASELINE_LOCKED`
- Additional owner media required for initial launch: no
- Supported-subset classification: `data/phase-zero/cf27_supported_subset_classification.json`
- Supported-subset verifier handoff: `docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_HANDOFF.md`
- Supported-subset verifier queue: `data/phase-zero/cf27_supported_subset_verifier_queue.json`
- Supported-subset verifier queue records: 76
- Deterministic secondary-angle sample: 24
- Total CF27 research candidates: 92
- `SUPPORTED_WITH_NOTES`: 39
- `USER_CONFIRMATION_REQUIRED`: 37
- `LIMITED_EVIDENCE`: 16
- Duplicate-review records preserved: 5
- Order-unresolved records preserved: 3
- Second-verifier decisions: 0
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0
- Recommendation-eligible records: 0

## Codex Can Do Next

1. Prepare the verifier execution/import packet from the 76-record supported subset.
2. Validate that the real verifier submission includes identity, date, environment, independent observations, native-order checks, evidence-file checks, front-view checks, and deterministic secondary-angle sample completion.
3. Import completed verifier results only after a real human returns them.
4. Preserve both primary and verifier observations.
5. Generate discrepancy records and keep conflicts blocked.
6. Keep all records non-production until the catalog-manager release gate is explicitly satisfied.

## Required Human Action

A real second verifier must inspect the supported subset independently. Codex must not simulate or create verifier decisions.

## Stop Point

Do not publish a production catalog, enable recommendations, run paid checkout, claim matching accuracy, or mark records production-approved during Prompt 102. The output should be attributable second-verifier decisions and discrepancy handling, not a production release.
