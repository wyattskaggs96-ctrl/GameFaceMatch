# Rollback Template

NOT PRODUCTION DATA
NOT A VERIFIED GAME RECORD

- Current catalog version: `REPLACE_WITH_CURRENT_CATALOG_VERSION`
- Rollback target catalog version: `REPLACE_WITH_TARGET_CATALOG_VERSION`
- Rollback reason: `REPLACE_WITH_ROLLBACK_REASON`
- Publisher/reviewer: `REPLACE_WITH_PUBLISHER_NAME`
- Rollback date: `REPLACE_WITH_ROLLBACK_DATE_YYYY_MM_DD`

## Rollback Checks

- [ ] Target package is immutable and retained locally.
- [ ] Production validation passes after rollback.
- [ ] Placeholder scan passes.
- [ ] Fixture leakage scan passes.
- [ ] Duplicate-ID scan passes.
- [ ] App behavior confirmed after rollback.
