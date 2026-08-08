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

That contract defines the future customer journey from a texted iPhone link through guided scan, exact verified CF27 settings, first result upload, refinement recommendations, second result upload, before/after comparison, and resemblance rating. Prompt 108 implements the first invite-only fixture session shell at `/trial/[inviteId]` with local consent, resume, invalid/expired/used/deleted states, and empty-catalog fail-closed behavior. Prompt 109 hardens the existing guided scan for remote iPhone use and records a local Buddy Trial `SCAN_COMPLETE` checkpoint when the existing capture continue action succeeds. Prompt 110 adds the private-beta persistence/deletion contract, browser-local test adapter, and fail-closed Supabase schema/RLS design without activating production Supabase.

The next implementation prompt may add the first-result upload shell while keeping production recommendations blocked until a verified nonempty catalog exists:

Prompt 123 adds an isolated `OWNER_REVIEW_DEMO` lane for Wyatt-only product evaluation before the production CF27 catalog exists. Prompt 124 extends that lane into the complete scan-to-build journey: private invite, consent, existing guided-scan handoff, scan-complete processing, demo recommendation result, exact settings, one-step-at-a-time College Football 27 build guide, persisted walkthrough progress, "View All Settings", and build-guide-complete handoff. Prompt 125 adds the first character-video review step: upload or record Video #1, validate it locally, extract standardized character-view candidates, support tester frame selection when automation is uncertain, retry bad media, and persist only non-image review summaries.

It can be enabled with:

```text
NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true
```

The demo lane uses `data/demo/owner-review-demo-catalog.json`, shows the banner `Owner Review Demo — appearance settings are test data.`, and is excluded from real beta metrics, human verification, production catalog state, and production matching-weight changes.

The next Codex-ready demo prompt may extend this owner-review lane beyond build completion:

`GFM | Q06 | PROMPT 126 | PHASE 03 | Build owner-review demo refinement recommendations`

This does not replace the human-verifier action above. Real CF27 settings still require a verified nonempty production catalog.
