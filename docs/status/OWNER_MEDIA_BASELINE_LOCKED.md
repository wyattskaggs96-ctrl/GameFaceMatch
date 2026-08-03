# Owner Media Baseline Locked

**Decision ID:** `OWNER_MEDIA_BASELINE_LOCKED`
**Decision owner:** Wyatt Skaggs
**Decision date:** 2026-08-03
**Machine-readable record:** `data/status/owner_media_baseline_lock.json`

## Decision

The current videos already available under the GameFace Match repository and referenced source-media history are the final owner-provided media baseline for the initial product launch.

Wyatt is not required to continue recording additional game footage to satisfy increasingly strict evidence, ideal framing, or cinematography requirements before the initial product can proceed.

This decision does not allow invented game data. It changes remaining owner-recording requests from launch blockers into documented limitations, verifier-confirmation tasks, user-feedback learning opportunities, post-launch improvements, or unsupported categories/options.

## Locked Source-Media Inventory

Canonical inventory:

- `data/media-audit/all_video_inventory.json`
- `data/media-audit/all_video_inventory.csv`
- `docs/status/DIRECT_ALL_VIDEO_CONTENT_AUDIT.md`

Current locked inventory summary:

| Metric | Count |
| --- | ---: |
| Total source-media videos | 15 |
| Unique source masters | 12 |
| Exact duplicate uploads | 3 |
| Videos opened successfully | 15 |
| Full-duration readable videos | 15 |

Inspected folders:

- `source-media/Fc26/player-creator`
- `source-media/NBA2k 2026`
- `source-media/NCAA 26`

Games represented:

- EA Sports FC player creator footage
- NBA 2K26 Create A Player footage
- College Football 27 create-player footage

## Current Evidence Coverage

Coverage artifact:

- `data/media-audit/game_video_coverage_map.json`

Coverage state totals from the locked media audit:

| State | Count |
| --- | ---: |
| `CAPTURED_WITH_LIMITATIONS` | 21 |
| `PARTIALLY_CAPTURED` | 27 |
| `VISIBLE_BUT_NOT_OPENED` | 1 |
| `NOT_SEEN_IN_ANY_VIDEO` | 4 |
| `UNDETERMINED` | 1 |

## Known Evidence Limitations

- Some title, platform, version, patch, and exact creation-path proof is not visible.
- Some selector first/final/wrap boundaries and complete native counts are not proven.
- Some categories have limited profile or secondary-angle coverage.
- Some settings are visible briefly or with non-ideal framing.
- Some dependency tests are not present as controlled one-variable tests.
- Exact duplicate uploads do not add coverage.

These limitations must be preserved in confidence, recommendation, verifier, and support output. They must not be solved by guessing.

## Reclassification

Historical recapture artifacts are preserved:

- `docs/status/EXACT_MISSING_RECORDINGS_BY_GAME.md`
- `data/media-audit/exact_missing_recordings.json`
- `docs/status/CF27_EXISTING_MEDIA_VERIFICATION_GAP_AUDIT.md`
- `data/phase-zero/cf27_minimum_recapture_queue.json`

They are no longer mandatory owner launch blockers. Remaining tasks are reclassified as one of:

- Known evidence limitation
- Verifier-confirmation task
- User-feedback learning opportunity
- Post-launch improvement opportunity
- Unsupported option/category where evidence is insufficient

## Fail-Closed Interpretation

Fail-closed means:

- Never invent unsupported options.
- Never silently convert uncertain evidence into a verified fact.
- Never recommend a research fixture.
- Never cross game or catalog-version boundaries.
- Never claim unsupported categories are complete.
- Never bypass account, entitlement, consent, privacy, or legal gates.

Fail-closed does not mean:

- The entire product is unusable because one category is incomplete.
- Every visible option requires a new owner recording.
- A usable option is rejected only because the video was not recorded under ideal conditions.
- The owner must indefinitely supply more evidence before development can continue.

## Day-1 Product Rule

The product should use a supported subset:

- Recommend only sufficiently supported, version-compatible, non-fixture options.
- Use lower confidence and visible limitations for supported-with-notes options.
- Require user confirmation and confirmation screenshots where evidence is usable but uncertain.
- Disable or omit unsupported categories rather than inventing them.

The configured day-1 build-match threshold is:

- `buildPassThreshold = 90`
- Score range: `0-100`
- Customer-facing language: `Build match: 92/100 based on the appearance options available in this game.`

The score is not identity probability, scientific certainty, or a guaranteed first-attempt result.

## Remaining Production Gates

The media baseline lock does not publish a production catalog.

Current production facts remain:

- Production catalog records: 0
- Second-verifier decisions: 0
- Production recommendations enabled: false

Production recommendation work may continue from the locked baseline only after supported evidence classification, second-person verification, catalog-manager approval, and release validation pass for the supported subset.
