# Scripts

Local catalog workflow utilities live here.

## Catalog Commands

- `node scripts/catalog-tools.mjs validate-record <record.json>`
- `node scripts/catalog-tools.mjs validate-package <package.json>`
- `node scripts/catalog-tools.mjs validate-production data/catalog/production`
- `node scripts/catalog-tools.mjs verify-assets <package.json>`
- `node scripts/catalog-tools.mjs detect-placeholders <path>`
- `node scripts/catalog-tools.mjs detect-fixtures <path>`
- `node scripts/catalog-tools.mjs detect-duplicates <manifest.json>`
- `node scripts/catalog-tools.mjs checksum <package.json>`
- `node scripts/catalog-tools.mjs report data/catalog/production`

The empty production catalog is valid and produces an explicit warning that no recommendations can be produced.
