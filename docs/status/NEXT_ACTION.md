# Next Action

`HUMAN ACTION | Complete CF27 supported-subset second verification`

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | Q04 | PROMPT 102 | PHASE 03 | Execute CF27 supported-subset second verification`

## Current State

Prompt 102 operationalized the supported-subset second-verifier package. It did not create human decisions, production approvals, production catalog records, or recommendation eligibility.

- Owner media baseline decision: `OWNER_MEDIA_BASELINE_LOCKED`
- Additional owner media required for initial launch: no
- Human execution status: `READY_FOR_HUMAN_VERIFIER`
- Supported-subset verifier session package: `data/phase-zero/supported-subset-verifier-session/`
- Verifier runbook: `docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_RUNBOOK.md`
- Human verification status: `docs/status/CF27_SUPPORTED_SUBSET_HUMAN_VERIFICATION_STATUS.md`
- Supported-subset verifier queue records: 76
- Deterministic secondary-angle sample: 24
- Excluded duplicate/order limitation rows: 8
- Second-verifier decisions: 0
- Second-verified records: 0
- Production-approved records: 0
- Production catalog records: 0
- Recommendation-eligible records: 0

## Wyatt Action

Give the verifier runbook and package to a real independent verifier:

- `docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_RUNBOOK.md`
- `data/phase-zero/supported-subset-verifier-session/verifier_decision_export_template.json`
- `data/phase-zero/supported-subset-verifier-session/candidate_detail_reference.csv`
- `data/phase-zero/supported-subset-verifier-session/secondary_angle_sample_review.csv`

Wyatt does not need to record more game footage by default.

## Verifier Action

The verifier must independently inspect the shipping game and complete:

1. Verifier environment.
2. Verifier attestation.
3. All 76 record-level decisions.
4. Independent menu counts where observable.
5. All 24 deterministic secondary-angle sample rows.
6. Duplicate/order excluded limitation review.
7. Disagreement notes and resolution recommendations.

Codex must not fill these fields.

## Next Codex Prompt After Human Package Returns

`GFM | Q04 | PROMPT 103 | PHASE 03 | Import and reconcile CF27 supported-subset verifier decisions`

Prompt 103 should run only after Wyatt provides the completed verifier package. It should validate the package, preserve primary and verifier observations, create discrepancy records, keep imports non-production, and leave catalog promotion blocked until catalog-manager approval.

## Stop Point

Do not publish a production catalog, enable recommendations, run paid checkout, claim matching accuracy, or mark records production-approved before a real completed verifier package is returned and validated.
