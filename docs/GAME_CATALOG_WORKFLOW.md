# College Football 27 Catalog Workflow

1. Record platform, game version, mode, creation path, and capture date.
2. Record every visible appearance category exactly as shown.
3. Capture standardized front, angle, and profile views for each option.
4. Assign a stable internal ID.
5. Add normalized measurements and human annotations.
6. Have a second reviewer compare the record with the live game.
7. Mark the item verified only after navigation instructions reach the correct option.
8. Publish a new immutable catalog version.
9. Keep production data under `data/catalog/production/`.
10. Keep mock records under `data/fixtures/test-only/`.

An empty production catalog is valid. An invented production catalog is not.

## Shared-client usage

The verified catalog is platform-independent product data shared by the active web MVP and future native iPhone client.

- Production data lives under `data/catalog/production/`.
- Web runtime bundles only validated production catalog data.
- Test fixtures stay under `data/fixtures/test-only/` and must not be copied into `web/public/` or any production bundle.
- Empty production manifests are allowed and must surface a clear catalog-unavailable state.

## Local audit workspace

Manual audit work starts under `data/audit/college-football-27/`.

- Use `templates/audit-session-template.json` before entering records.
- Use `templates/menu-audit-checklist.md` to inventory visible categories exactly as shown.
- Use `templates/platform-audit-template.md` and `templates/game-version-template.md` before recording options.
- Use `templates/capture-session-template.md` and `templates/asset-naming-guide.md` for required angle evidence.
- Use `templates/category-discovery-template.md`, `templates/annotation-workflow-template.md`, and `templates/patch-reaudit-template.md` while sitting beside the console.
- Use `templates/catalog-item-template.json` and `templates/catalog-manifest-template.json` only as drafts.
- Use `templates/rollback-template.md` when backing out a bad package.
- Every draft template is marked `NOT PRODUCTION DATA` and `NOT A VERIFIED GAME RECORD`.
- Placeholder tokens such as `REPLACE_WITH_VERIFIED_GAME_LABEL` must be replaced from actual game evidence before review.
- CSV imports create unverified draft records only. They never auto-verify production data.
- Screenshots are retained as local audit evidence and are not automatically public web assets.

## Local validation commands

Run from the repository root unless noted:

- `node scripts/catalog-tools.mjs validate-record <record.json>`
- `node scripts/catalog-tools.mjs validate-audit-record <record.json>`
- `node scripts/catalog-tools.mjs validate-package <package.json>`
- `node scripts/catalog-import-validator.mjs validate-import <package.json>`
- `node scripts/catalog-import-validator.mjs validate-import <package.json> --json`
- `node scripts/catalog-import-validator.mjs --check`
- `node scripts/catalog-tools.mjs validate-production data/catalog/production`
- `node scripts/catalog-tools.mjs verify-assets <package.json>`
- `node scripts/catalog-tools.mjs detect-placeholders data/catalog/production`
- `node scripts/catalog-tools.mjs detect-fixtures data/catalog/production`
- `node scripts/catalog-tools.mjs detect-duplicates data/catalog/production/catalog_manifest.json`
- `node scripts/catalog-tools.mjs create-audit-session`
- `node scripts/catalog-tools.mjs import-csv <audit.csv>`
- `node scripts/catalog-tools.mjs export-csv <package-or-items.json>`
- `node scripts/catalog-tools.mjs compare-versions <previous-manifest.json> <next-manifest.json>`
- `node scripts/catalog-tools.mjs patch-reaudit <previous-manifest.json> <next-game-version>`
- `node scripts/catalog-tools.mjs publish-package <package.json>`
- `node scripts/catalog-tools.mjs rollback-package <current-manifest.json> <target-manifest.json> "reason"`
- `node scripts/catalog-tools.mjs checksum <package.json>`
- `node scripts/catalog-tools.mjs report data/catalog/production`
- `npm run source-video:intake -- inspect <source-video-path>`
- `npm run source-video:intake -- extract-frame <source-video-path> <timestamp-seconds> <output-frame-path>`
- `npm run phase-zero:export -- <phase-zero-snapshot.json> <output-directory>`
- `node scripts/phase-zero-export.mjs --check`

From `web/`, `npm run catalog:validate` validates the production directory. The empty production catalog must pass with a warning that no recommendations can be produced.

The Phase 0 export pipeline writes deterministic UTF-8 CSV and JSON files for the audit environment, creation paths, menu maps, catalog category workbooks, dependency tests, evidence manifests, capture logs, issues and exceptions, catalog manifest, verification results, and production readiness. Production-mode exports exclude fixture catalog records and fixture evidence paths.

The catalog import-validation engine produces both readable text and machine-readable JSON reports before a package can be published. It checks schema references, unique identifiers, evidence-path portability and checksums, native-order continuity, required environment fields, verification state, placeholder and College Football 26 contamination, duplicate-observation retention, production/test separation, production recommender fixture access, supported platform/version/mode/path targets, package checksums, and supersession chains.

The development-only catalog-manager review console lives in the web Phase 0 tools. It imports candidate package JSON and optional machine-readable validation reports, shows unresolved failures, records, evidence, native-order groups, duplicate observations, and verification-state summaries, lets the manager accept or reject `VERIFIED_WITH_NOTES`, request repairs, reject placeholder or missing-evidence rows, and produce a local signed review report. It cannot publish a package and cannot approve a release candidate while mandatory validation gates are unresolved.

Catalog release states are `draft`, `reviewCandidate`, `verificationCandidate`, `approvedRelease`, `supersededRelease`, and `rejectedRelease`. Once a release is approved, records must not be edited silently. Corrections, patch updates, or repaired evidence create a new catalog version with release notes and deterministic checksums; older approved or superseded releases remain available so saved builds and historical recommendations can retain the exact catalog version that produced them.

The development-only second-verifier workspace is separate from catalog-manager review. It records the verifier environment, independent menu counts, independent catalog counts, native-order confirmation, record-by-record checks, evidence-file checks, front-view verification, secondary-angle sampling, dependency and exception review, mismatch reports, discrepancy-resolution workflows, and sign-off. Primary researcher observations and verifier observations must remain distinct; exported second-person verification records still require package validation before publication.

When the primary researcher and second verifier disagree, the discrepancy workflow must preserve both observations exactly as recorded, open a linked discrepancy from the mismatch report, identify the affected catalog records, require new direct evidence, link recapture files, preserve superseded evidence references, record a final resolution and verification-state update, require acknowledgment from both parties, and maintain chronological audit-history events. Conflicting counts or observations must not be averaged into a compromise value.

Secondary-angle sampling is deterministic to prevent cherry-picking. For each category, the workspace builds the seed from `environment_id + verifier_id + catalog_version`, hashes that seed with each eligible catalog ID using SHA-256, sorts eligible records by hash, and selects the first required quartile for secondary-angle review. The workspace stores the method ID, seed input, selected records, per-category coverage, and a human-readable sample report.

Source-video intake is local-only. `inspect` preserves original video files and reports metadata from `ffprobe` when available. `extract-frame` produces derivative still frames only when `ffmpeg` is installed; otherwise it returns a disabled result so operators can continue recording timestamp references and extract frames later.

## Publication gate

A production publication requires:

- No missing stable IDs.
- No duplicate stable IDs.
- No unverified records.
- No fixture flags.
- No placeholder tokens.
- Platform, game version, game mode, and creation path.
- Valid dates.
- Valid measurement confidence and nonnegative variance.
- Required source images for straight-on, left 45 degrees, right 45 degrees, left profile, and right profile.
- Correct manifest item count.
- Deterministic checksum match.
- Valid verification-state transition from review to verified or archived.
- Deprecated records to include explicit context.
- First and second approved reviews from different reviewers.
- Standard screenshot naming for every asset.
- Menu navigation instructions with evidence assets.
- No patch/platform mismatch between package manifest and item records.
