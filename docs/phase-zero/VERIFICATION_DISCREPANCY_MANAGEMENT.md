# Verification Discrepancy Management

**Status:** discrepancy-resolution procedure  
**Production status:** NOT PRODUCTION DATA  
**Verification status:** unresolved discrepancies block verified status

Use this procedure after second-verifier results intake has produced discrepancy records.

## Command

Run:

```sh
npm run cf27:verification-discrepancy-manager
```

By default, the command reads:

- `data/phase-zero/second-verifier-results-intake/verification_intake_state.json`
- optional `data/phase-zero/verification-discrepancy-management/resolution_evidence.json`

It writes:

- `data/phase-zero/verification-discrepancy-management/verification_discrepancy_management.json`
- `data/phase-zero/verification-discrepancy-management/verification_resolution_tasks.json`
- `data/phase-zero/verification-discrepancy-management/verification_resolution_tasks.csv`
- `data/phase-zero/verification-discrepancy-management/verification_record_status_updates.csv`

## Resolution Rules

- Preserve primary and verifier observations separately.
- Identify the exact disputed option or environment field.
- Preserve evidence on both sides.
- Preserve superseded evidence; never overwrite it.
- Define a console recheck and recapture for every open discrepancy.
- Never average counts.
- Never guess missing labels, counts, order, dependencies, or resolution.
- Resolve only with direct resolution evidence.
- Require primary and verifier acknowledgment where a discrepancy is being closed.
- Do not assign `VERIFIED` or `VERIFIED_WITH_NOTES` while unresolved discrepancies remain.

Allowed statuses are:

- `VERIFIED`
- `VERIFIED_WITH_NOTES`
- `RECAPTURE_REQUIRED`
- `VERSION_MISMATCH`
- `MISSING_EVIDENCE`
- `COUNT_MISMATCH`
- `ORDER_MISMATCH`
- `DEPENDENCY_UNRESOLVED`
- `NOT_VERIFIED`

## Resolution Evidence Format

Use this optional file only after direct console recheck or recapture evidence exists:

```json
{
  "resolutions": [
    {
      "discrepancyID": "REPLACE_WITH_DISCREPANCY_ID",
      "status": "REPLACE_WITH_ALLOWED_STATUS",
      "resolutionEvidenceIDs": ["REPLACE_WITH_DIRECT_EVIDENCE_ID"],
      "primaryAcknowledgedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "verifierAcknowledgedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "resolutionNotes": "Summarize the direct evidence and final disposition."
    }
  ]
}
```

Do not use this file to bypass evidence review. A status without direct evidence and both acknowledgments stays unresolved.
