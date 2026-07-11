# College Football 27 Local Audit Workspace

NOT PRODUCTION DATA  
NOT A VERIFIED GAME RECORD

This folder is for manually collecting evidence before a catalog item can ever be published. Nothing in this workspace is user-facing production catalog data.

## Start Here

1. Create an audit session from `templates/audit-session-template.json`.
2. Replace every `REPLACE_WITH_...` token with evidence from the live game audit.
3. Record platform, game version, patch/build, Road to Glory creation path, and discovered categories.
4. Capture the required image angles and name assets with the asset naming guide.
5. Complete first review and second review with different reviewers.
6. Run local catalog validation before moving any record toward `data/catalog/production/`.

## Hard Rules

- Do not invent College Football 27 labels, indexes, menu paths, categories, sliders, presets, hairstyles, facial-hair options, or platform differences.
- Do not publish unverified records.
- Do not move test fixtures or audit templates into production.
- Production can remain empty until real, reviewed game evidence exists.
- Use explicit placeholder tokens in draft files so validators can reject unfinished records.
- CSV import creates unverified draft records only; it never verifies records.
- Screenshots remain local audit evidence and are not automatically public web assets.
