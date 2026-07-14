# Patch Change Workflow

Status: catalog-maintenance operating procedure.

Use this workflow after every College Football 27 game update or whenever a tester reports that a menu, option, visual asset, count, order, or build instruction changed.

This workflow is audit guidance only. It does not verify, publish, repair, rename, infer, or invent catalog records.

## Required Inputs

- Previous immutable catalog manifest.
- Candidate next manifest or research package built from direct post-patch evidence.
- New visible game version when available.
- New patch/build identifier when available.
- Evidence references for any changed category, menu, option, or visual asset.

Unknown version or patch values must remain `UNKNOWN` or unresolved until visible evidence exists.

## Command

From the repository root:

```bash
npm run catalog:patch-change -- <previous-manifest.json> <next-manifest.json> --out data/catalog/patch-change-reports/<update-id> --game-version <observed-version> --patch <observed-patch>
```

The command writes:

- `prior_catalog_snapshot.json`
- `patch_change_report.json`
- `patch_change_report.md`
- `affected_records.csv`
- `reverification_queue.csv`
- `compatibility_guard.json`

## What The Workflow Checks

- New game version and patch context.
- Recounted category totals.
- First, middle, and final values for each category.
- Native order changes.
- Visible label changes.
- Added and removed records.
- Evidence checksum changes.
- Visual asset changes.
- Count-preserving visual changes.
- Dependency metadata changes.
- Platform, game version, patch, mode, and creation-path context changes.

## Recommendation Gate

Changed records must be treated as incompatible for recommendations until:

1. Category totals are recounted.
2. First, middle, and final values are confirmed from direct evidence.
3. Native order is confirmed.
4. Visual assets and count-preserving visual changes are reviewed.
5. Changed records complete first review and second-person verification.
6. Catalog-manager approval is recorded.
7. A new immutable approved production release passes the production publish gate.

Runtime compatibility checks must reject unsupported patch versions. Environment variables or a single boolean must not bypass the catalog publish gate.

## Prior Snapshot Preservation

The workflow copies the previous manifest to `prior_catalog_snapshot.json`. Do not edit previous approved releases silently. Corrections or patch updates create a new release with release notes, checksums, and supersession context.

## Count-Preserving Visual Changes

A category can keep the same number of options while a visual asset changes. These changes are blocking because the old recommendation may point to an option that still exists but no longer depicts the same appearance.

Treat each count-preserving visual change as:

- affected record
- re-verification required
- likely recapture required
- incompatible with production recommendations until re-approved

## Prohibited Shortcuts

- Do not infer a changed option from memory.
- Do not use College Football 26 data.
- Do not mark records verified without independent second-person review.
- Do not merge visually similar options silently.
- Do not publish patch-compatible recommendations until the production gate passes.
