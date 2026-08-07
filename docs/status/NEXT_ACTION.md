# Next Action

`HUMAN ACTION | Complete CF27 supported-subset second verification`

Repository:
`/Users/skaggssystems/Developer/GameFaceMatch`

Run after:
`GFM | Q04 | PROMPT 105 | PHASE 03 | Make human verifier workflow usable`

## Current State

Prompt 105 turns the supported-subset verifier package into an owner-usable local workflow. It did not create human decisions, production approvals, production catalog records, or recommendation eligibility.

- Owner media baseline decision: `OWNER_MEDIA_BASELINE_LOCKED`
- Additional owner media required for initial launch: no
- Human execution status: `READY_FOR_HUMAN_VERIFIER`
- Supported-subset verifier session package: `data/phase-zero/supported-subset-verifier-session/`
- Verifier runbook: `docs/status/CF27_SUPPORTED_SUBSET_VERIFIER_RUNBOOK.md`
- Friend quick start: `docs/verification/HUMAN_VERIFIER_QUICK_START.md`
- Owner launch checklist: `docs/verification/OWNER_VERIFIER_LAUNCH_CHECKLIST.md`
- Local start command: `npm run verifier:start`
- Local verifier URL: `http://localhost:3000/verifier`
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

Start the local verifier workflow and hand it to a real independent verifier:

```bash
npm run verifier:start
```

Open:

```text
http://localhost:3000/verifier
```

Give the verifier:

- `docs/verification/HUMAN_VERIFIER_QUICK_START.md`
- The open local verifier page
- The Xbox/controller and College Football 27 Road to Glory appearance screens

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

## Expected Export

The browser downloads the completed package to:

```text
~/Downloads/cf27-supported-subset-verifier-export-<verifier-id>-<verification-date>.json
```

Optional validation before Prompt 103:

```bash
npm run cf27:supported-subset-verifier-session:validate-export -- ~/Downloads/cf27-supported-subset-verifier-export-<verifier-id>-<verification-date>.json
```

## Next Codex Prompt After Human Package Returns

`GFM | Q04 | PROMPT 103 | PHASE 03 | Import and reconcile CF27 supported-subset verifier decisions`

Prompt 103 should run only after Wyatt provides the completed verifier package. It should validate the package, preserve primary and verifier observations, create discrepancy records, keep imports non-production, and leave catalog promotion blocked until catalog-manager approval.

## Stop Point

Do not publish a production catalog, enable recommendations, run paid checkout, claim matching accuracy, or mark records production-approved before a real completed verifier package is returned and validated.

## Codex-Ready Parallel Contract

Prompt 106 records the private-beta Buddy Trial V1 North Star in:

`docs/Product/BUDDY_TRIAL_V1.md`

That contract defines the future customer journey from a texted iPhone link through guided scan, exact verified CF27 settings, first result upload, refinement recommendations, second result upload, before/after comparison, and resemblance rating. Prompt 108 implements the first invite-only fixture session shell at `/trial/[inviteId]` with local consent, resume, invalid/expired/used/deleted states, and empty-catalog fail-closed behavior. Prompt 109 hardens the existing guided scan for remote iPhone use and records a local Buddy Trial `SCAN_COMPLETE` checkpoint when the existing capture continue action succeeds.

The next implementation prompt may add the first-result upload shell while keeping production recommendations blocked until a verified nonempty catalog exists:

`GFM | Q05 | PROMPT 110 | PHASE 03 | Add Buddy Trial result upload and refinement placeholder`

This does not replace the human-verifier action above. Real CF27 settings still require a verified nonempty production catalog.
