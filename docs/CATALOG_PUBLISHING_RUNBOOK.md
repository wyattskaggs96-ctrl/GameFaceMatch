# Catalog Publishing Runbook

NOT PRODUCTION DATA
NOT A VERIFIED GAME RECORD

The production catalog remains empty until a valid evidence-backed package is imported.

## Publication Gate

Run these commands before any production import:

```bash
node scripts/catalog-tools.mjs validate-package REPLACE_WITH_PACKAGE_JSON
node scripts/catalog-tools.mjs verify-assets REPLACE_WITH_PACKAGE_JSON
node scripts/catalog-tools.mjs detect-placeholders data/catalog/production
node scripts/catalog-tools.mjs detect-fixtures data/catalog/production
node scripts/catalog-tools.mjs checksum REPLACE_WITH_PACKAGE_JSON
```

Publication requires no validation errors, two approved reviews per record, no fixture flags, no placeholders, valid checksums, and exact menu-instruction evidence.

## Rollback

Use the previous immutable catalog package as the rollback target:

```bash
node scripts/catalog-tools.mjs rollback-package REPLACE_WITH_CURRENT_MANIFEST REPLACE_WITH_TARGET_MANIFEST "REPLACE_WITH_ROLLBACK_REASON"
```

After rollback, rerun production validation and confirm the app still fails closed if the restored catalog is empty.

## Version Comparison

Before publishing after a patch:

```bash
node scripts/catalog-tools.mjs compare-versions REPLACE_WITH_PREVIOUS_MANIFEST REPLACE_WITH_NEXT_MANIFEST
node scripts/catalog-tools.mjs patch-reaudit REPLACE_WITH_PREVIOUS_MANIFEST REPLACE_WITH_NEXT_GAME_VERSION
```

Review added, removed, renamed, reordered, and retired options before moving any record to production.

The comparison report also includes menu-count changes, first/middle/final boundary changes, changed evidence hashes, changed visual assets, dependency changes, environment changes, affected records, required re-verification actions, a recommended recapture queue, and a suggested semantic catalog version. Treat those outputs as audit tasks, not as verification or publication approval.
