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

From `web/`, `npm run catalog:validate` validates the production directory. The empty production catalog must pass with a warning that no recommendations can be produced.

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
