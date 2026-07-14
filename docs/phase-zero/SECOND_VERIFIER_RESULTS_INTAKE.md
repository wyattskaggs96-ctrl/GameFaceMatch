# Second-Verifier Results Intake

**Status:** intake procedure  
**Production status:** NOT PRODUCTION DATA  
**Verification status:** no verification is assigned by this document

Use this procedure after a second human verifier submits completed worksheets or CSV results. The intake command validates the submission, compares it against current primary research, opens discrepancy records, and blocks `VERIFIED` assignment while unresolved discrepancies exist.

## Required Files

Place completed files here before running intake:

- `data/phase-zero/second-verifier-submissions/verification_results.csv`
- `data/phase-zero/second-verifier-submissions/submission_metadata.json`

The CSV must use the same columns as `data/phase-zero/verification_results.template.csv`.

The metadata JSON must use:

```json
{
  "schemaVersion": "phase0-second-verifier-results-submission-v1",
  "verifierID": "REPLACE_WITH_VERIFIER_ID",
  "verificationDate": "YYYY-MM-DD",
  "platform": "REPLACE_WITH_VERIFIER_PLATFORM",
  "consoleModel": "REPLACE_WITH_VISIBLE_CONSOLE_MODEL",
  "gameVersion": "REPLACE_WITH_VISIBLE_GAME_VERSION",
  "patch": "REPLACE_WITH_VISIBLE_PATCH",
  "mode": "REPLACE_WITH_VERIFIED_MODE",
  "creationPath": "REPLACE_WITH_VERIFIED_CREATION_PATH",
  "evidenceReferences": ["REPLACE_WITH_VERIFIER_EVIDENCE_REFERENCE"],
  "signOff": {
    "completedIndependentCounts": true,
    "evidenceReviewed": true,
    "discrepanciesLogged": true,
    "signedBy": "REPLACE_WITH_VERIFIER_ID",
    "signedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
  }
}
```

Do not include passwords, account credentials, private profile information, or raw master video files in the metadata JSON.

## Command

Run:

```sh
npm run cf27:second-verifier-results-intake
```

Or pass explicit files:

```sh
node scripts/cf27-second-verifier-results-intake.mjs --input path/to/verification_results.csv --metadata path/to/submission_metadata.json
```

## Outputs

When a complete submission is present, the command writes:

- `data/phase-zero/second-verifier-results-intake/verification_intake_state.json`
- `data/phase-zero/second-verifier-results-intake/verification_intake_report.json`
- `data/phase-zero/second-verifier-results-intake/verification_discrepancies.json`
- `data/phase-zero/second-verifier-results-intake/verification_discrepancies.csv`
- `data/phase-zero/second-verifier-results-intake/verification_imported_records.csv`

## Rules

- Do not automatically resolve disagreements.
- Do not assign `VERIFIED` while unresolved discrepancies exist.
- Preserve primary and verifier observations separately.
- Keep all imported records `NOT_PRODUCTION_DATA`.
- Production recommendations remain disabled.
