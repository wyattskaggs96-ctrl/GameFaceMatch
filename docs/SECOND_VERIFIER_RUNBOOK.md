# Second-Verifier Runbook

NOT PRODUCTION DATA
NOT A VERIFIED GAME RECORD

This runbook is for the independent second verifier in the College Football 27 catalog workflow. The verifier is not a proofreader for the primary researcher. The verifier must independently confirm environment, counts, menu mapping, native order, evidence existence, front views, sampled secondary angles, dependencies, exceptions, and final disposition.

Do not invent or repair College Football 27 data from memory. If evidence is missing or ambiguous, classify the mismatch and require recapture.

Keep these references open:

- `docs/GAME_CATALOG_WORKFLOW.md`
- `docs/CATALOG_REVIEW_GUIDE.md`
- `docs/AUDIT_OPERATOR_RUNBOOK.md`
- `docs/GAME_SCREENSHOT_STANDARD.md`
- `data/schemas/second-person-verification.schema.json`
- `data/schemas/discrepancy-resolution.schema.json`

## 0. Independence Rules

The second verifier must:

- Use their own verifier ID.
- Record their own verifier environment.
- Re-walk the menu path or inspect retained source-video evidence independently.
- Record independent counts before looking at the primary count when practical.
- Preserve primary observations exactly as received.
- Preserve verifier observations exactly as recorded.
- Open discrepancies instead of editing primary data in place.
- Require new direct evidence for unresolved disagreements.

The second verifier must not:

- Mark a record verified because the primary researcher says it is correct.
- Copy the primary count, order, label, or notes without checking.
- Average two conflicting observations.
- Fix labels, indexes, or order silently.
- Treat screenshots, templates, fixtures, or CSV imports as proof of verification.
- Use College Football 26 data or memory of another game as a substitute.
- Approve records with placeholders, missing evidence, fixture paths, or unresolved blocking issues.

## 1. Verifier Environment

Record the verifier environment before reviewing records.

Required fields:

- Verifier ID.
- Review date and time.
- Platform and console model.
- Console OS/update state.
- Game version and patch/build identifier.
- Online or offline state.
- EA account state.
- Edition and entitlements when relevant.
- Game mode.
- Creation path.
- Display, resolution, HDR, capture hardware, and capture format when reviewing live output.
- Evidence IDs for version, patch, mode, path, and environment confirmation.

If the verifier environment does not match the primary audit environment, stop normal verification and classify the record or package as `VERSION_MISMATCH` until the mismatch is resolved.

## 2. Intake Checklist

Before reviewing content, confirm the handoff package includes:

- Candidate package or draft records.
- Primary audit environment.
- Primary menu map.
- Primary category counts.
- Required evidence manifest.
- Source-video references when applicable.
- Issue register and recapture queue.
- Primary reviewer notes.
- Validation report, if available.

Reject the handoff for review if it contains production claims but still uses fixture, demo, local sample, or template data.

## 3. Independent Counts

Count independently from the live game or retained source-video evidence.

Record:

- Menu count by category.
- Catalog item count by category.
- First visible option.
- Middle reference option where useful.
- Final visible option.
- Any locked, hidden, entitlement-dependent, or conditional entries.
- Count evidence IDs.

Do not correct the primary count directly. If counts differ, create a `countMismatch` discrepancy and use final disposition `COUNT_MISMATCH` until new evidence resolves it.

## 4. Menu Remapping

Recreate the relevant menu map without relying on the primary map as the only source.

Check:

- Parent menu and child menu relationships.
- Display label and native label.
- Native order.
- Control type.
- Range, minimum, maximum, step, total values, default, and wrap behavior when applicable.
- Visible label state.
- Reset behavior.
- Later editability.
- Dependencies and locks.
- Warnings and defects.
- Full-screen and scroll-continuation evidence.

If the verifier cannot reproduce the path, classify as `menuNavigationMismatch` and use final disposition `NOT_VERIFIED` or `RECAPTURE_REQUIRED` depending on whether better evidence can resolve it.

## 5. Native-Order Verification

Verify native order exactly as the game presents it.

For each category:

1. Confirm the first record.
2. Confirm every index in order, or verify source-video evidence showing every step.
3. Confirm no gaps exist unless the gap is explicitly represented by a retired or unavailable record with context.
4. Confirm duplicate labels remain separate records when the game shows separate entries.
5. Confirm wrap behavior at start/end when relevant.

Classify order problems as:

- `orderMismatch` when entries are out of sequence.
- `countMismatch` when missing or extra entries change count.
- `dependencyUnresolved` when order changes under a condition that has not been tested.

Use final disposition `ORDER_MISMATCH`, `COUNT_MISMATCH`, or `DEPENDENCY_UNRESOLVED` until resolved.

## 6. File-Existence Checks

For every evidence reference:

- Confirm the file exists at the recorded relative path.
- Confirm the path does not escape the catalog root.
- Confirm the path does not point into `data/fixtures/test-only/`, demo data, local samples, or production web assets.
- Confirm filename casing matches the filesystem.
- Confirm master versus derivative state is correct.
- Confirm checksum, file size, MIME type, and view metadata match the manifest.
- Confirm source-video derivatives link back to source-video ID and timestamp.

Missing or non-portable evidence requires final disposition `MISSING_EVIDENCE` or `RECAPTURE_REQUIRED`.

## 7. Front-View Checks

Every catalog item needs a usable front view before it can publish.

Confirm:

- Straight-on view exists and opens.
- The visible option matches the target record.
- Face/head is not blocked by overlays, cursor, notifications, menu highlight, loading animation, helmet, mask, or other obstruction.
- Hairline, skull, eyes, nose, mouth, jaw, chin, and relevant facial hair are visible enough for the category.
- Canonical character setup is consistent with the primary record.
- File name and view metadata identify the front view correctly.

If the front view is missing or unusable, use final disposition `MISSING_EVIDENCE` or `RECAPTURE_REQUIRED`. Do not compensate with side views.

## 8. Deterministic Secondary-Angle Sampling

Secondary-angle sampling prevents cherry-picking.

Use the documented deterministic method:

1. Build the seed input as `environment_id + verifier_id + catalog_version`.
2. For each eligible catalog ID, hash `seed + catalog_id` with SHA-256.
3. Sort eligible records by hash within each category.
4. Select the first required quartile, at least one record when the category has eligible records.
5. Store the method ID, seed input, category coverage, selected records, and sample report.

For selected records, verify available secondary-angle evidence such as left 45, right 45, left profile, right profile, rear, elevated, or lowered views according to the category rules.

If the selected secondary angle is missing or unusable, classify as `missingEvidence` or `captureQuality` and use final disposition `MISSING_EVIDENCE` or `RECAPTURE_REQUIRED`.

## 9. Duplicate and Exception Review

Review duplicate and exception notes without deleting or merging records.

Check:

- Exact duplicate files by checksum.
- Near-duplicate visual observations.
- Duplicate visible labels that may still be legitimate separate native entries.
- Locked, entitlement-dependent, hidden, conditional, or retired options.
- Patch-specific changes.
- Dependency-test uncertainty.
- Known defects, capture issues, and unresolved recapture requests.

Record whether each item is:

- Not a duplicate.
- Duplicate file, evidence issue only.
- Visually similar option, retain both records.
- Potential native duplicate, needs direct menu evidence.
- Blocking ambiguity, recapture or live re-check required.

Never silently delete, merge, reorder, or verify duplicates.

## 10. Mismatch Classification

Use the schema discrepancy types exactly:

- `none`: verifier agrees and no discrepancy exists.
- `labelMismatch`: visible label or index differs.
- `versionMismatch`: platform, game version, patch, mode, or creation path differs.
- `missingEvidence`: required evidence is absent or unreachable.
- `countMismatch`: verifier count differs from primary count.
- `orderMismatch`: native order differs.
- `dependencyUnresolved`: dependency behavior is not resolved.
- `captureQuality`: evidence exists but is not usable enough for verification.
- `menuNavigationMismatch`: menu instructions do not reach the target option.
- `other`: only when no specific type fits; explain clearly in notes.

Preserve both observations. Do not replace one observation with the other until discrepancy resolution records the final action and both parties acknowledge it.

## 11. Recapture Requirements

Require recapture when:

- Required evidence is missing.
- Front view is absent, obstructed, blurry, cropped incorrectly, or associated with the wrong record.
- Secondary-angle sample evidence fails.
- Menu navigation evidence is missing or does not reach the target.
- Version, patch, platform, mode, path, account, entitlement, or dependency state is uncertain.
- Native order cannot be reproduced from evidence.
- Source video timestamp points to the wrong option or cannot be opened.
- Checksum, file path, master/derivative state, or filename does not match the manifest.

Recapture instructions must identify:

- Target stable ID.
- Category.
- Required view or evidence type.
- Canonical setup to reproduce.
- Reason for recapture.
- Superseded evidence IDs to preserve.

Do not remove superseded evidence from the audit history.

## 12. Resolution Actions

Use the schema resolution actions exactly:

- `acceptPrimaryObservation`: new evidence supports the primary observation.
- `acceptVerifierObservation`: new evidence supports the verifier observation.
- `recaptureEvidence`: new direct evidence is required or has been captured.
- `splitByVersion`: both observations are valid for different versions, patches, platforms, modes, or paths.
- `correctDraftRecord`: draft metadata must be corrected before review can continue.
- `markNotVerified`: record cannot be verified.
- `holdForResearch`: more investigation is needed.
- `retireRecord`: record is superseded or no longer valid, with context.

Verified dispositions with discrepancies require resolution evidence.

## 13. Final Acknowledgment

Final acknowledgment requires:

- Primary observation recorded.
- Verifier observation recorded.
- Different primary and verifier observer IDs.
- Evidence references for both observations.
- Final disposition selected from the allowed status list.
- Resolution action selected.
- Resolution evidence IDs when required.
- Primary acknowledgment timestamp.
- Verifier acknowledgment timestamp.
- Notes explaining uncertainty, limitations, or reason for rejection.

Do not sign off until both-party acknowledgment is present. The catalog-manager review and import-validation gates still apply after verifier sign-off.

## 14. Allowed Statuses

Only these final dispositions are allowed:

- `VERIFIED`
- `VERIFIED_WITH_NOTES`
- `RECAPTURE_REQUIRED`
- `VERSION_MISMATCH`
- `MISSING_EVIDENCE`
- `COUNT_MISMATCH`
- `ORDER_MISMATCH`
- `DEPENDENCY_UNRESOLVED`
- `NOT_VERIFIED`

Production-publishable second-person verification requires `VERIFIED` or `VERIFIED_WITH_NOTES`, plus no validation errors and full publish-gate approval.

Use `VERIFIED_WITH_NOTES` only when the record is still publishable and the notes do not hide an unresolved blocker. The catalog manager must explicitly accept or reject `VERIFIED_WITH_NOTES`.

## 15. Prohibited Shortcuts

Never:

- Verify from memory.
- Verify from a screenshot alone when the required package context is missing.
- Treat a matching checksum as proof that the depicted option is correct.
- Treat a passed schema validation as proof of real game verification.
- Ignore a patch or platform mismatch.
- Use fixture data, demo data, local samples, templates, or placeholders.
- Skip front-view verification.
- Skip deterministic secondary-angle sampling.
- Skip independent counts because the primary researcher already counted.
- Promote a record because it is needed for product progress.
- Change a final disposition to make a release pass.
- Use an environment variable, manual checkbox, or single boolean to bypass the production gate.

## Quick Verification Checklist

- [ ] Verifier environment recorded.
- [ ] Handoff package contains required evidence and reports.
- [ ] Independent menu and catalog counts recorded.
- [ ] Relevant menu path remapped.
- [ ] Native order verified.
- [ ] Evidence files exist at portable relative paths.
- [ ] Front views checked.
- [ ] Deterministic secondary-angle sample generated and reviewed.
- [ ] Duplicate and exception notes reviewed.
- [ ] Mismatches classified.
- [ ] Recapture requests opened where required.
- [ ] Final disposition uses an allowed status.
- [ ] Primary and verifier observations remain separate.
- [ ] Both-party acknowledgment recorded.
