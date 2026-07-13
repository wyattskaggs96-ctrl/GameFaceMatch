# Catalog-Manager Acceptance Runbook

NOT PRODUCTION DATA
NOT A VERIFIED GAME RECORD

This runbook is for the local catalog manager who decides whether a College Football 27 candidate package can advance toward a release candidate. It does not authorize publishing by itself. The package must still pass import validation, second-person verification, immutable release checks, and the definitive production publish gate before recommendations can become user-facing.

The catalog manager must never invent, complete, repair, rename, reorder, or infer a College Football 27 option from memory. If evidence is missing, ambiguous, fixture-backed, or mismatched, reject the record or request repair.

Keep these references open:

- `docs/GAME_CATALOG_WORKFLOW.md`
- `docs/CATALOG_REVIEW_GUIDE.md`
- `docs/CATALOG_PUBLISHING_RUNBOOK.md`
- `docs/SECOND_VERIFIER_RUNBOOK.md`
- `admin/catalog-manager/README.md`
- `web/lib/phase-zero/catalog-manager-review-console.ts`
- `web/lib/catalog/production-publish-gate.ts`
- `data/schemas/catalog-package.schema.json`
- `data/schemas/catalog-manifest.schema.json`
- `data/schemas/publication-record.schema.json`
- `data/schemas/review-record.schema.json`

## 0. Role Boundary

The catalog manager may:

- Intake a candidate package for local review.
- Inspect validation reports, records, evidence, native order, duplicate observations, verification states, and release notes.
- Accept or reject `VERIFIED_WITH_NOTES`.
- Request repairs.
- Reject records or packages.
- Produce a local signed review report.
- Recommend rollback to a previous immutable release.

The catalog manager must not:

- Create game facts.
- Mark records verified without evidence and review records.
- Override schema validation, import validation, second-person verification, checksum validation, or publish-gate failures.
- Publish directly from the development-only console.
- Treat local drafts, templates, CSV imports, fixtures, demo data, or placeholder records as production.
- Use a single checkbox, environment variable, or manual note to bypass gates.

## 1. Candidate Package Intake

Accept only a complete candidate package with:

- Package ID and package version.
- Manifest with `sourceType`, catalog version, generated date, production flag, declared item count, checksum, release status, and release notes when applicable.
- Item records.
- Asset references.
- First-review records.
- Second-person verification records or a handoff proving where they are stored.
- Publication record or publication draft.
- Machine-readable import-validation report when available.
- Human-readable validation report when available.
- Issue, discrepancy, recapture, duplicate, supersession, and rollback context when relevant.

Stop intake when:

- The package is not valid JSON.
- The package mixes production records with fixtures, demo data, local samples, or templates.
- The package contains placeholder tokens such as `REPLACE_WITH_`.
- The package lacks a clear source directory, audit environment, platform, game version, patch, mode, or creation path.
- The package claims production readiness while required review artifacts are missing.

## 2. Schema Validation

Run or review schema validation before inspecting records manually.

Required commands from the repository root:

```bash
node scripts/catalog-tools.mjs validate-package REPLACE_WITH_PACKAGE_JSON
node scripts/catalog-import-validator.mjs validate-import REPLACE_WITH_PACKAGE_JSON
node scripts/catalog-import-validator.mjs validate-import REPLACE_WITH_PACKAGE_JSON --json
```

Schema validation must cover:

- Catalog package shape.
- Manifest fields.
- Catalog item fields.
- Asset references.
- Review records.
- Publication record.
- Navigation instructions.
- Required date formats.
- Verification-state values.
- Supersession fields when present.

A schema-valid package is not automatically acceptable. It only means the package has the expected structure.

## 3. Evidence Resolution

For every asset reference:

- Confirm the path is relative and portable.
- Confirm the file exists under the approved evidence root.
- Confirm the file does not point into `data/fixtures/test-only/`, demo data, local developer samples, web production assets, or temporary screenshots.
- Confirm the referenced file role, master/derivative state, view, MIME type, size, checksum, platform, version, patch, mode, and creation path match the record.
- Confirm every item reference resolves to a real asset ID.
- Confirm navigation-instruction evidence resolves and shows the path reaching the correct option.
- Confirm source-video derivatives preserve provenance back to the source video and timestamp.

Reject or request repair when:

- A file is missing.
- A path escapes the catalog root.
- Filename casing differs.
- A master file is used as a derivative or a derivative is mislabeled as a master.
- A screenshot cannot be opened.
- Evidence appears to depict a different record.

## 4. Ordering

Review native order by category.

Check:

- Stable IDs follow the required category convention.
- Native order is contiguous unless a gap is explicitly represented by retired or unavailable context.
- Duplicate native-order values are intentional and documented, or else rejected.
- First, middle reference, final, and wrap behavior evidence agree with the item order.
- Added, removed, retired, superseded, and patch-specific items do not silently reorder previous releases.
- Duplicate visible labels remain separate only when direct game evidence shows separate native entries.

Ordering failures must be treated as mandatory blockers.

## 5. Required Views

Confirm required views using the category rules and the package validation report.

At minimum, production head/face records must include:

- Straight-on.
- Left 45.
- Right 45.
- Left profile.
- Right profile.

For category-specific workspaces, also check any required rear, elevated, lowered, menu, boundary, representative, or environment evidence.

Reject or request repair when:

- A mandatory view is missing.
- The front view is missing or unusable.
- The view is associated with the wrong record.
- The image is obstructed, cropped incorrectly, severely blurry, or shows a different game state.
- Required menu evidence is absent.

## 6. Checksum Validation

Run or review deterministic checksum validation:

```bash
node scripts/catalog-tools.mjs verify-assets REPLACE_WITH_PACKAGE_JSON
node scripts/catalog-tools.mjs checksum REPLACE_WITH_PACKAGE_JSON
```

Confirm:

- Asset SHA-256 values match the files.
- Manifest package checksum is present.
- Publication source package checksum is present.
- Import validation includes a passing `validChecksums` check.
- Checksums are recalculated after any repair.
- The signed catalog-manager report digest is SHA-256 and scoped to `local-catalog-manager-review-report`.

Any checksum mismatch is a mandatory blocker. Do not repair checksums without also recording why the underlying file or package changed.

## 7. Fixture Rejection

Reject the package when any production path contains:

- `sourceType` other than `production` for a production release.
- `isTestFixture: true`.
- Fixture, demo, local sample, or template source types.
- Evidence paths pointing into `data/fixtures/test-only/`.
- Placeholder tokens.
- Synthetic catalog IDs or test-only records.
- College Football 26 records.
- Values copied from documentation examples rather than direct evidence.

Run:

```bash
node scripts/catalog-tools.mjs detect-fixtures data/catalog/production
node scripts/catalog-tools.mjs detect-placeholders data/catalog/production
```

If the candidate package is not yet in `data/catalog/production/`, use the import-validation report and direct package inspection to confirm the same separation rules before it moves any further.

## 8. Verification-State Review

Review every record's verification state and review chain.

Production-publishable records require:

- Item-level production verification state accepted by the production gate.
- First review approval.
- Independent second-person verification.
- Both-party acknowledgment where required.
- Evidence existence.
- Front-view existence.
- Deterministic secondary-angle sampling inclusion where required.
- No unresolved blocking discrepancies.
- Catalog-manager acceptance of every `VERIFIED_WITH_NOTES` record.

`VERIFIED_WITH_NOTES` can be accepted only when the notes describe non-blocking context. It must be rejected or repaired when the note hides missing evidence, unresolved mismatch, order uncertainty, dependency uncertainty, fixture contamination, placeholder data, or version ambiguity.

## 9. Duplicate Handling

Duplicates require human review; they are never silently merged.

Classify each duplicate observation as:

- Exact duplicate file, evidence issue only.
- Visually similar option, retain separate records.
- Duplicate visible label, retain separate records only with direct native-order evidence.
- Potential native duplicate, needs menu evidence.
- Blocking ambiguity, repair or recapture required.

Confirm:

- Native order is preserved.
- Stable IDs remain distinct.
- Duplicate files do not mask missing required views.
- Researcher observations and verifier observations remain in the audit history.
- Any "not a duplicate" decision includes reviewer notes.

## 10. Supersession

Review supersession before accepting release candidates.

Confirm:

- Superseded records identify why they were superseded.
- New records identify the prior version when replacing or correcting data.
- Deprecated records include required context.
- Previous approved releases remain immutable.
- Corrections create a new catalog version.
- Release notes describe added, corrected, removed, superseded, or metadata-only changes.
- Saved builds and historical recommendations can retain the original catalog version.

Reject supersession chains that loop, skip required context, overwrite approved releases, or erase previous evidence.

## 11. Production/Test Separation

Before approval, confirm:

- Production catalog data is under `data/catalog/production/`.
- Test fixtures remain under `data/fixtures/test-only/`.
- Research drafts remain in audit or draft locations.
- Demo data and local developer samples are explicitly labeled and excluded.
- The production web runtime cannot import test-only fixtures.
- Development-only catalog-manager tools are not exposed in production navigation.
- Production recommendations require an approved catalog release and a passing production publish-gate report.

The catalog manager may approve only a production-class package that passes these separation checks. Fixture-derived progress must not be presented as production readiness.

## 12. Approval With Notes

Use approval with notes only for non-blocking context.

A package may receive catalog-manager release-candidate approval only when:

- Mandatory validation gates pass.
- Unresolved failure count is zero.
- Repair request count is zero.
- Rejected record count is zero.
- Required schema and import-validation checks pass.
- Required evidence and checksums pass.
- `VERIFIED_WITH_NOTES` records have been individually accepted or rejected.
- Duplicate observations have documented non-blocking dispositions.
- The signed review report decision is `approvedReleaseCandidate`.

The local catalog-manager report must include:

- Reviewer ID.
- Package ID.
- Package version.
- Decision.
- Accepted `VERIFIED_WITH_NOTES` records.
- Rejected records, if any.
- Repair requests, if any.
- Notes.
- Generated timestamp.
- SHA-256 signature digest.

Approval with notes does not publish the catalog and does not enable recommendations by itself.

## 13. Rejection

Reject the record or package when:

- Any mandatory gate fails.
- Fixture, demo, local sample, placeholder, or template data appears in a production path.
- Evidence is missing, unreachable, mismatched, or not portable.
- Required views are missing.
- Native order is unresolved.
- Verification state is not publishable.
- Second-person verification is missing or incomplete.
- Blocking discrepancies remain unresolved.
- Checksums do not match.
- Supersession is invalid.
- Platform, game version, patch, mode, or creation path is unsupported or ambiguous.

Every rejection must include:

- Record or package ID.
- Reason.
- Blocking validation codes when available.
- Required repair or recapture action.
- Reviewer ID.
- Timestamp.

Rejected packages can return to draft or repair. They must not be silently edited into an approved release.

## 14. Release Signing

Release signing records local review integrity; it is not a cloud signature or legal attestation.

Before signing:

- Rerun validation after final repairs.
- Confirm the package text being signed is the final candidate.
- Confirm no local draft recovery state is being mistaken for production readiness.
- Confirm release status is ready to move toward `approvedRelease` only through the immutable release workflow.
- Confirm the production publish gate receives the catalog-manager signed report plus all other required gate inputs.

The signed review report must use SHA-256 and scope `local-catalog-manager-review-report`.

Do not sign when:

- Mandatory failures remain.
- Repairs were requested.
- Any record was rejected.
- The package has changed since validation.
- The verifier and catalog-manager artifacts disagree.

## 15. Rollback

Rollback is used to restore a previous immutable catalog version after a bad or superseded release. It is not a way to edit an approved release in place.

Use:

```bash
node scripts/catalog-tools.mjs rollback-package REPLACE_WITH_CURRENT_MANIFEST REPLACE_WITH_TARGET_MANIFEST "REPLACE_WITH_ROLLBACK_REASON"
```

Before rollback:

- Identify the current manifest and target manifest.
- Confirm the target is an immutable approved or superseded release retained in the repository.
- Record the rollback reason.
- Identify affected records, saved builds, and recommendations.
- Confirm rollback does not introduce fixtures, placeholders, unsupported targets, or checksum failures.

After rollback:

- Rerun production validation.
- Rerun fixture and placeholder checks.
- Recalculate checksums where required.
- Record a rollback material action in the audit log.
- Confirm the runtime still fails closed if the restored catalog is empty.
- Preserve the bad release and rollback report for audit history.

## Quick Acceptance Checklist

- [ ] Candidate package intake complete.
- [ ] Schema validation passed.
- [ ] Import validation passed.
- [ ] Evidence paths resolve and stay portable.
- [ ] Required views are present and usable.
- [ ] Native ordering is complete.
- [ ] Checksums match.
- [ ] Fixtures, placeholders, demo data, and local samples rejected.
- [ ] Verification states are publishable.
- [ ] `VERIFIED_WITH_NOTES` records accepted or rejected.
- [ ] Duplicates reviewed without merging.
- [ ] Supersession chains are valid.
- [ ] Production/test separation confirmed.
- [ ] Signed review report generated only after mandatory gates pass.
- [ ] Rejections include repair or recapture instructions.
- [ ] Rollback plan exists for approved releases.
