# CF27 Supported-Subset Human Verification Status

**Status:** READY_FOR_HUMAN_VERIFIER
**Generated:** 2026-08-03T05:30:00-04:00
**Package:** `CF27_SUPPORTED_SUBSET_SECOND_VERIFIER_SESSION_v0.1.0`

## Counts

| Metric | Count |
| --- | ---: |
| Supported-subset queue records | 76 |
| Deterministic secondary-angle sample | 24 |
| Human verifier decisions | 0 |
| Second-verified records | 0 |
| Production-approved records | 0 |
| Production catalog records | 0 |
| Recommendation-eligible records | 0 |

## Scope

The verifier package operationalizes the Prompt 101 supported subset. It does not add the 16 limited-evidence records to the verifier subset. Duplicate/order-limited rows are listed separately for limitation review and remain non-production.

## Human Next Action

Wyatt must start the friend-ready local verifier workflow and provide it to a real independent verifier:

```bash
npm run verifier:start
```

Open:

```text
http://localhost:3000/verifier
```

The verifier must complete the environment, attestation, all 76 record decisions, menu counts, all 24 secondary-angle sample checks, and excluded duplicate/order limitation review from independent shipping-game inspection.

Friend instructions: `docs/verification/HUMAN_VERIFIER_QUICK_START.md`

Owner checklist: `docs/verification/OWNER_VERIFIER_LAUNCH_CHECKLIST.md`

## Software Next Action After Human Completion

Run the next prompt to import and reconcile the returned supported-subset verifier package. Valid imports must remain non-production until catalog-manager approval and production release gates pass.

## Validation

- Session package validation: PASS
- Private-beta subset viability from Prompt 101: `VIABLE_FOR_SECOND_VERIFIER_REVIEW`
- Owner media baseline remains locked; additional Wyatt recordings are not required by default.
