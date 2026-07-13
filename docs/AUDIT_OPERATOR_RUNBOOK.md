# Audit Operator Runbook

NOT PRODUCTION DATA  
NOT A VERIFIED GAME RECORD

This runbook is for the person sitting beside the console while manually auditing College Football 27 appearance options. It is an operating checklist, not production catalog data. Do not guess labels, counts, menu paths, option numbers, or platform differences. If the game does not show it clearly, log an issue and recapture.

Keep these references open:

- `docs/GAME_AUDIT_FIELD_GUIDE.md`
- `docs/GAME_SCREENSHOT_STANDARD.md`
- `docs/CATALOG_REVIEW_GUIDE.md`
- `docs/CATALOG_PUBLISHING_RUNBOOK.md`
- `data/audit/college-football-27/README.md`
- `data/audit/college-football-27/templates/`

## 0. Stop Rules

Stop and log an issue before continuing when:

- The game version, patch, platform, mode, or creation path is unknown.
- A visible label or index cannot be read exactly.
- A required view is missing, blurry, obstructed, cropped too tightly, or from the wrong option.
- A patch, online update, entitlement, account state, or path change may have changed the menu.
- The capture setup changes in a way that affects framing, lighting, display output, or file format.
- Evidence points outside the local audit workspace, into fixtures, or to an absolute local-only path.

Never mark a record verified at the console. Verification requires first review, second review, validation, catalog-manager approval, and the production publish gate.

## 1. Hardware Setup

Before opening the game:

- Console: verify exact platform and console model.
- Controller: charged, paired, and working.
- Display: fixed input, resolution, HDR state, brightness mode, and game mode.
- Network: record online/offline state and whether the game has checked for updates.
- Account: record EA account state, console account, edition, entitlements, and any unlock dependencies.
- Capture device: connect capture card, camera, or screenshot transfer path.
- Storage: confirm enough free space for source videos, screenshots, exports, and daily backups.

Write these details into the environment draft before capturing options.

## 2. Capture-Device Setup

Use one capture method for a session unless an issue forces a change.

- Set capture format before recording.
- Disable overlays, cursor visibility, notifications, captions, performance counters, and streaming widgets.
- Confirm output resolution and HDR state match the environment record.
- Capture a short test clip or screenshot from the title/version screen.
- Inspect the file locally for readability, expected dimensions, and obvious compression or color problems.
- Record capture hardware, software, file format, and operator notes.

If capture hardware or settings change mid-session, close the current capture session and start a new one.

## 3. Folder Preparation

Create a local audit folder before recording evidence.

Recommended working layout:

```text
REPLACE_WITH_AUDIT_ROOT/
  environment/
  source-videos/
  masters/
  derivatives/
  manifests/
  exports/
  issues/
  backups/
```

Rules:

- Keep production catalog files separate from research drafts.
- Keep fixture files only under `data/fixtures/test-only/`.
- Store evidence paths as portable relative paths in manifests.
- Do not place raw game videos, local evidence masters, or draft capture files in production web assets.
- Do not rename or modify master evidence destructively.

## 4. Environment Capture

Use `data/audit/college-football-27/templates/platform-audit-template.md`, `game-version-template.md`, and `audit-session-template.json`.

Capture evidence for:

- Title screen.
- Version/build or patch screen.
- Console update screen.
- Selected game mode.
- Creation-workflow start.
- Any account, online, edition, entitlement, or update state that may affect visible options.

The environment draft is incomplete until platform, game version, patch/build, game mode, creation path, and evidence references are present.

## 5. Path Investigation

Before cataloging options, investigate how the player-creation path is reached.

For each candidate path:

- Record exact steps and button/input sequence.
- Record account, online, edition, entitlement, position, archetype, height, weight, body type, or later-edit restrictions.
- Capture per-step evidence.
- Note appearance categories available in that path.
- Mark the path provisional until confirmed through direct evidence.

Choose a canonical path only after it is reproducible and justified. Do not assume Road to Glory details without direct game evidence.

## 6. Canonical Character Setup

Set the canonical character state before option capture. Lock it once approved.

Record:

- Mode and creation path.
- Position, archetype, handedness, height, weight, and body type.
- Skin presentation, complexion, eye color, hair color, facial-hair color, clothing, and equipment used for catalog capture.
- Lighting, background, camera distance, angle, zoom, resolution, HDR, brightness, and capture hardware.

Generate or record the stable settings hash in the audit tooling when available. If any setting deviates, log it and decide whether the evidence must be recaptured.

## 7. Reference-Framing Approval

Before capturing many options, create one reference capture set and review it.

Required views:

- Straight-on.
- Left 45 degrees.
- Right 45 degrees.
- Left profile.
- Right profile.

Check:

- Face/head is centered consistently.
- Hairline, skull, ears where relevant, jaw, chin, and lower face are visible.
- No overlay, cursor, notification, menu highlight, loading animation, helmet, mask, or obstruction covers the option.
- Zoom, crop, lighting, and display state match the canonical setup.
- File names match `docs/GAME_SCREENSHOT_STANDARD.md`.

Do not start bulk capture until reference framing is approved or the unresolved issue is documented.

## 8. Head Capture

For each head option discovered from the live game:

1. Record exact visible label or index.
2. Preserve native menu order.
3. Assign the stable internal ID only according to the approved ID convention.
4. Confirm canonical settings are active.
5. Capture full-screen menu/navigation evidence.
6. Capture straight-on, left 45, right 45, left profile, and right profile.
7. Record elevated/lowered or source-video timestamps only when the current workflow requires them.
8. Record locked, entitlement-dependent, forced-attribute, duplicate, or near-duplicate observations.
9. Run missing-view and naming checks.
10. Leave verification state unverified until review is complete.

Do not skip options because they look similar. Preserve every native entry and mark possible duplicates for human review.

## 9. Hairstyle Capture

For each hairstyle option:

1. Confirm the canonical head and canonical hair color.
2. Record exact visible label or index and native order.
3. Capture full-screen menu evidence.
4. Capture required views for the hairstyle workflow, including rear view when required by the category.
5. Record head, mode, body, position, archetype, account, platform, skin-tone, color, and unlock dependencies.
6. Store researcher-applied visual metadata separately from native labels.
7. Log missing rear/profile/three-quarter views as recapture items.

Do not turn researcher descriptions into game labels.

## 10. Facial-Hair Capture

For facial hair:

1. Include and record the `None` option when it exists in the game evidence.
2. Confirm canonical head, hairstyle, and facial-hair color.
3. Record exact visible label or index and native order.
4. Capture full-screen menu evidence.
5. Capture straight-on, left 45, right 45, left profile, and right profile.
6. Record coverage metadata separately from native labels.
7. Record mustache, beard, sideburn, stubble, density, length, and color-control observations only as researcher metadata unless the game displays those labels.
8. Run dependency and missing-evidence checks before review.

## 11. Additional Attributes

For every other resemblance-related control:

- Do not pre-populate categories as confirmed.
- Record the control type: preset, carousel, numbered option, named option, slider, color, toggle, or unknown.
- Record count, range, default, minimum, maximum, step, wrap behavior, and reset behavior only from direct evidence.
- Capture boundary evidence and representative evidence.
- Record whether the control affects geometry, texture, color, presentation only, or cannot yet be determined.
- Record dependencies and later editability.
- Mark recommendation suitability as provisional until reviewed.

## 12. Dependency Testing

Run dependency tests one variable at a time.

For each run:

1. Record baseline state.
2. Change exactly one variable.
3. Record expected behavior before observing the result.
4. Record observed count, order, geometry, label, visibility, lock, or dependency changes.
5. Capture evidence.
6. Mark result and remaining uncertainty.

Test variables include platform, mode, custom versus Legends base, position, archetype, height, weight, body type, skin presentation, head, hairstyle, online/offline state, EA account state, edition, entitlements, and patch.

## 13. Evidence Naming

Use the naming standard before moving on to the next option.

Pattern:

```text
cfb27__REPLACE_WITH_PLATFORM_SLUG__REPLACE_WITH_GAME_VERSION_SLUG__REPLACE_WITH_STABLE_INTERNAL_ID__REPLACE_WITH_ANGLE_ID__REPLACE_WITH_CAPTURE_DATE_YYYYMMDD.png
```

Allowed angle IDs:

- `straightOn`
- `left45`
- `right45`
- `leftProfile`
- `rightProfile`
- `navigationEvidence`

Validate:

- Stable catalog ID.
- Platform and game version slug.
- Patch or version context in the manifest.
- Capture date.
- View label.
- File extension.
- Duplicate path.
- Unsafe characters.
- Relative path portability.

Preview rename plans only. Do not destructively rename master files without explicit confirmation and backup.

## 14. Source-Video Handling

When recording video:

- Register the original source video as master evidence metadata.
- Preserve the original file exactly.
- Record duration, dimensions, frame rate, codec/container, capture device, and capture date/time when available.
- Record timestamps for catalog items before extracting still frames.
- Extract still frames as derivatives only when local tooling supports it.
- Link every extracted frame back to the source-video ID and timestamp.
- Mark frame extraction unavailable if FFmpeg or equivalent local tooling is unavailable.

Never upload, recompress, overwrite, or publish source videos automatically.

## 15. Daily Backup

At the end of each audit day:

- Stop capture software cleanly.
- Confirm all source videos and screenshots open locally.
- Generate or refresh the evidence manifest and checksums when tooling is available.
- Copy the audit folder to the approved local backup destination.
- Record backup time, operator, source folder, destination, and any missing files.
- Do not copy audit evidence into `web/public/`, production catalog directories, or fixture directories.

If backup verification fails, log a blocking issue before continuing the next audit day.

## 16. Issue Logging

Open an issue for:

- Missing evidence.
- Wrong option association.
- Count mismatch.
- Order mismatch.
- Inconsistent framing.
- Inconsistent lighting.
- Wrong canonical hair or facial hair.
- Version mismatch.
- Platform mismatch.
- Dependency uncertainty.
- Duplicate ambiguity.
- Corrupt file.
- Unresolved path.
- Recapture required.

Each issue should include owner, severity, status, affected records, evidence, resolution notes, and next action.

## 17. Recapture Workflow

Recapture only the failed evidence when possible.

1. Identify the affected record and view.
2. Reconfirm environment and canonical settings.
3. Capture replacement evidence.
4. Preserve superseded evidence references.
5. Record why the new evidence replaces or supplements the old evidence.
6. Re-run naming, path, required-view, checksum, and consistency checks.
7. Return the record to review.

Do not hide or delete superseded evidence from audit history.

## 18. Handoff Steps

Before handing work to a reviewer or catalog manager:

- Confirm every draft still says `NOT PRODUCTION DATA` or remains in the research namespace.
- Confirm no placeholders remain in records intended for review.
- Confirm every record has exact visible label/index, native order, category, platform, game version, patch, mode, creation path, and evidence references.
- Confirm required views are present or issues are logged.
- Confirm source videos, masters, derivatives, manifests, and exports use relative paths.
- Confirm no fixture, demo, local sample, or template file is mixed into the candidate package.
- Run local validation commands listed in `docs/GAME_CATALOG_WORKFLOW.md`.
- Provide the reviewer with the audit folder, validation report, unresolved issue list, recapture queue, and operator notes.

The handoff is complete only when the next reviewer can reproduce the path and inspect the evidence without asking the operator to remember undocumented details.

## Quick Console-Side Checklist

- [ ] Hardware and capture setup recorded.
- [ ] Environment evidence captured.
- [ ] Creation path investigated and marked provisional or confirmed.
- [ ] Canonical character setup locked or issue logged.
- [ ] Reference framing approved.
- [ ] Category count and native order recorded.
- [ ] Required views captured.
- [ ] File names validated.
- [ ] Source-video timestamps recorded when applicable.
- [ ] Dependency tests logged one variable at a time.
- [ ] Issues and recapture requests logged.
- [ ] Daily backup completed.
- [ ] Reviewer handoff package prepared.
