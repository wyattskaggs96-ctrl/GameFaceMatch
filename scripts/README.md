# Scripts

Local catalog workflow utilities live here.

## Repository Hygiene

- `node scripts/repository-status.mjs`
- `node scripts/repository-status.mjs --strict`
- `node scripts/generate-traceability-report.mjs`
- `node scripts/generate-traceability-report.mjs --check`
- `npm run verify` from the repository root

The repository status script reports staged, modified, untracked, ignored, and oversized files. It also warns about potential secrets, fixture-like content in production catalog directories, possible raw facial media, raw game videos, and local evidence masters.

For CF27 research evidence, it also warns when source-video masters, generated contact sheets, extracted frames, cropped derivatives, or sole local absolute-path references appear in commit-visible files. Use `data/research/cf27/` for metadata and manifests only; keep media masters and generated derivatives local unless a future owner-approved storage decision says otherwise.

The traceability generator reads `data/traceability/requirements.json` and writes `docs/status/REQUIREMENT_TRACEABILITY.md`. Use `--check` in verification to fail when the report is stale.

`npm run verify` orchestrates the full repository quality suite and stops at the first failed stage.

## Catalog Commands

- `node scripts/catalog-tools.mjs validate-record <record.json>`
- `node scripts/catalog-tools.mjs validate-package <package.json>`
- `node scripts/catalog-import-validator.mjs validate-import <package.json>`
- `node scripts/catalog-import-validator.mjs validate-import <package.json> --json`
- `node scripts/catalog-import-validator.mjs --check`
- `node scripts/catalog-tools.mjs validate-production data/catalog/production`
- `node scripts/catalog-tools.mjs verify-assets <package.json>`
- `node scripts/catalog-tools.mjs detect-placeholders <path>`
- `node scripts/catalog-tools.mjs detect-fixtures <path>`
- `node scripts/catalog-tools.mjs detect-duplicates <manifest.json>`
- `node scripts/catalog-tools.mjs checksum <package.json>`
- `node scripts/catalog-tools.mjs report data/catalog/production`

The empty production catalog is valid and produces an explicit warning that no recommendations can be produced.

The import validator produces readable and JSON reports for schema references, IDs, evidence paths, native order, required evidence and environment fields, verification states, placeholder and College Football 26 contamination, duplicate-observation retention, production/test separation, supported targets, checksums, supersession chains, and production recommender fixture access. It does not create production records.

## Phase 0 Export Commands

- `npm run phase-zero:export -- path/to/phase-zero-snapshot.json path/to/output-directory`
- `npm run phase-zero:export -- path/to/phase-zero-snapshot.json path/to/output-directory audit`
- `node scripts/phase-zero-export.mjs --check`

The export pipeline writes UTF-8 CSV and JSON files for environment manifests, creation paths, menu maps, catalog categories, dependency tests, evidence manifests, capture logs, issues, verification results, production readiness, and catalog manifests. Production-mode exports exclude fixture catalog records and fixture evidence paths; they do not create verified College Football 27 records.

## Evidence Manifest Commands

- `npm run evidence:manifest -- data/audit/college-football-27/evidence --metadata path/to/metadata.json --output path/to/manifest.json`
- `node scripts/evidence-manifest.mjs data/audit/college-football-27/evidence --previous path/to/previous-manifest.json`

The evidence manifest generator scans only approved local evidence directories, calculates SHA-256 checksums with streaming reads in the CLI path, records file size and MIME type, merges supplied metadata, and reports changed, missing, and unexpected files between scans. It does not upload, rename, transform, or modify evidence files.

Production package validation also performs strict evidence-path portability checks. It rejects absolute paths, traversal, root escapes, missing files, filename-case mismatches, fixture-directory references, and master/derivative path-state mismatches. Reports include repair suggestions, but scripts do not silently rewrite records.

## Source Video Commands

- `npm run source-video:intake -- inspect data/audit/college-football-27/evidence/masters/REPLACE_WITH_LOCAL_SOURCE_VIDEO.mov`
- `npm run source-video:intake -- extract-frame data/audit/college-football-27/evidence/masters/REPLACE_WITH_LOCAL_SOURCE_VIDEO.mov 12.345 data/audit/college-football-27/evidence/derivatives/REPLACE_WITH_FRAME_NAME.png`
- `npm run media:inspect -- inspect /path/to/local/source-video.mov --evidence-root-token OWNER_DOWNLOADS`

The source-video helper records local metadata with streaming checksum reads and can extract derivative still frames only when `ffprobe` and `ffmpeg` are installed on the local machine. If those tools are unavailable, inspection still returns a manual-metadata-required result and frame extraction is disabled cleanly. Original source videos are never uploaded, renamed, recompressed, or modified.

The CF27 media-inspection command performs a fuller local technical pass for evidence videos. It writes ffprobe metadata JSON, SHA-256, duration/resolution/frame-rate reports, scene-change indices, candidate menu-transition timestamps, candidate stable-frame timestamps, and processing error reports under `data/research/cf27/manifests/media-inspection/`. Low-resolution contact sheets are generated under ignored local storage at `data/research/cf27/generated/media-inspections/`. The command is resumable: unchanged checksum-addressed outputs are skipped, while changed inputs produce a new checksum-addressed inspection package.

Use `CF27_FFPROBE_PATH` and `CF27_FFMPEG_PATH`, or the `--ffprobe` and `--ffmpeg` flags, when the tools are installed outside `PATH`. The command supports MP4, MOV, and extensionless valid video files as determined by ffprobe metadata; corrupt or unsupported media fails with a clear processing error report.
