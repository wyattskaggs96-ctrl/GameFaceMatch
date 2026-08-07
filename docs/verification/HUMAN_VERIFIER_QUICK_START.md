# Human Verifier Quick Start

You are helping GameFace Match check College Football 27 appearance options.

You are being asked to independently compare the verifier page against the shipping game. You are not being asked to judge whether a person looks like a player, approve a production catalog, publish data, or agree with the first researcher.

## What You Need Open

1. College Football 27 on the Xbox or console being checked.
2. Road to Glory player creation, on the appearance screens.
3. The local verifier page: `http://localhost:3000/verifier`.

## What To Do

1. Enter your name or verifier ID.
2. Record the console, platform, game version or patch if visible, mode, creation path, and date.
3. Check every attestation box only if it is true.
4. Work through one record at a time.
5. For each record, look at the category, expected label/index/order, evidence timestamps, and limitations.
6. Independently check the same option in the game.
7. Choose one allowed verification status.
8. Write a note whenever anything is uncertain, limited, different, missing, or not cleanly verified.
9. Use Previous and Next to move between entries.
10. Complete menu counts and the duplicate/order limitation review.
11. Export the package only after the final review says everything is complete.

## Verification Buttons

- `VERIFIED`: You independently confirmed the candidate, label/index/order, evidence, front view, environment, and required checks.
- `VERIFIED_WITH_NOTES`: The record is usable for later review, but there is a limitation that must remain attached.
- `RECAPTURE_REQUIRED`: The record cannot be confirmed from the available evidence and game check.
- `VERSION_MISMATCH`: The game/platform/version you see does not match the package well enough.
- `MISSING_EVIDENCE`: A required evidence file or view cannot be confirmed.
- `COUNT_MISMATCH`: Your menu count differs from the package.
- `ORDER_MISMATCH`: The native order differs from the package.
- `DEPENDENCY_UNRESOLVED`: A related setting or dependency cannot be resolved.
- `NOT_VERIFIED`: You cannot verify the record.

## When To Use Notes

Use notes for every non-clean status, every uncertain answer, every mismatch, every missing file/view, and every place where the game and evidence disagree. Do not guess.

## Saving And Exporting

Progress is saved automatically in this browser. If the page refreshes, reopen `http://localhost:3000/verifier`.

Success means the final review screen allows **Export verifier package** and downloads a JSON file named like:

```text
cf27-supported-subset-verifier-export-<your-id>-<date>.json
```

Give that file back to Wyatt. The export does not publish the catalog or enable recommendations.
