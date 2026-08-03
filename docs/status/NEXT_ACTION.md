# Next Action

`GFM | Q04 | PROMPT 101 | PHASE 03 | Classify locked media baseline into supported catalog subset`

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | OWNER DECISION | LOCK FINAL MEDIA BASELINE AND BUILD SELF-IMPROVING DAY-1 PRODUCT`

## Objective

Use the locked owner media baseline to classify every visible game option/category into explicit evidence-support states, then create a supported-subset verification package that can move toward day-1 recommendations without requiring additional owner recordings.

## Current Queue State

- Owner media baseline decision: `OWNER_MEDIA_BASELINE_LOCKED`
- Decision record: `data/status/owner_media_baseline_lock.json`
- Human-readable lock: `docs/status/OWNER_MEDIA_BASELINE_LOCKED.md`
- Direct all-video inventory: `data/media-audit/all_video_inventory.json`
- Direct all-video timeline: `data/media-audit/all_video_timeline_map.json`
- Direct all-video coverage map: `data/media-audit/game_video_coverage_map.json`
- Historical missing-recording list: `data/media-audit/exact_missing_recordings.json`
- Historical CF27 minimum recapture queue: `data/phase-zero/cf27_minimum_recapture_queue.json`
- Production promotion gate: `scripts/cf27-production-catalog-release-manager.mjs`
- Research candidates: 92
- Evidence-linked queue records: 92
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0
- Matching-study participants: 0

## Evidence Support States

Use only:

- `SUPPORTED`
- `SUPPORTED_WITH_NOTES`
- `USER_CONFIRMATION_REQUIRED`
- `LIMITED_EVIDENCE`
- `UNSUPPORTED`
- `DEPRECATED`
- `VERSION_MISMATCH`

Only `SUPPORTED`, `SUPPORTED_WITH_NOTES`, and `USER_CONFIRMATION_REQUIRED` can participate in customer recommendation candidates after all production verification gates pass.

## Codex Can Do Next

1. Build the locked-baseline support-state classifier and reports.
2. Map every existing CF27 candidate to one evidence-support state.
3. Map visible NBA 2K26 media into research-only coverage without enabling recommendations.
4. Convert historical recapture queues into limitation/verifier/post-launch categories.
5. Generate a verifier package focused on supported and supported-with-notes subsets.
6. Keep second verification, catalog-manager approval, and production release gates fail-closed.

## Required Human Action

A real second verifier is still required before production catalog publication. Wyatt is not required to provide additional source-media recordings for the initial launch baseline.

## Stop Point

Do not publish a production catalog, run paid checkout, claim matching accuracy, or mark records second-verified during Prompt 101. The output should be a supported-subset classification and verifier-ready package, not a production release.
