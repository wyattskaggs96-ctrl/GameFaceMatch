# Owner Review Demo Mode

**Status:** IMPLEMENTED AS ISOLATED NON-PRODUCTION MODE  
**Prompt:** GFM | Q06 | PROMPT 123 | PHASE 01 | Create isolated owner review mode  
**Date:** 2026-08-07  

## Purpose

`OWNER_REVIEW_DEMO` lets Wyatt evaluate the Buddy Trial V1 customer experience end to end before a real production-approved College Football 27 catalog exists.

It is not production catalog data, not human verification, not matching-study evidence, and not a launch-ready recommendation source.

## Activation

Set:

```text
NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true
```

The mode is disabled automatically when:

```text
NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=production
```

## Customer-Facing Banner

When enabled, Buddy Trial shows:

```text
Owner Review Demo — appearance settings are test data.
```

The banner disappears when demo mode is off. Real production recommendations still depend on a nonempty verified production catalog.

## Demo Data

Fixture catalog:

```text
data/demo/owner-review-demo-catalog.json
```

The manifest uses:

- `sourceType: demoData`
- `isProduction: false`
- `declaredItemCount: 3`
- explicit `OWNER_REVIEW_DEMO_TEST_DATA` provenance on every record
- `catalogManagerDisposition: rejected`

Coverage exercised:

- head / face preset
- skin presentation
- hairstyle
- hair color
- facial hair
- facial-hair color
- nose bridge slider-style setting
- jaw width slider-style setting
- chin depth slider-style setting
- step-by-step menu navigation instructions
- synthetic scoring and refinement metadata

The records intentionally use demo labels and must never be represented as genuine College Football 27 verification.

## Isolation Controls

- Production catalog remains `data/catalog/production/catalog_manifest.json`.
- Production catalog record count remains `0` unless real verified records are published.
- Production recommendation APIs do not load `demoData`.
- The production matching path still rejects `demoData` unless the explicit `allowOwnerReviewDemo` test/demo switch is used.
- Demo analytics payloads use `owner_review_demo_excluded_from_beta_metrics`.
- Demo learning records set:
  - `eligibleForRealBetaMetrics: false`
  - `eligibleForGlobalLearning: false`
  - `productionWeightMutationAllowed: false`

## Current Gate State

Unchanged by this mode:

- second-verifier decisions: `0`
- production-approved records: `0`
- production catalog records: `0`
- recommendation-eligible production records: `0`
- real matching-study participants: `0`

## Validation

Focused tests:

```text
npm --prefix web run test -- owner-review-demo.test.ts buddy-trial-session.test.ts environment.test.ts integrity.test.ts
```

Full validation should continue to include:

```text
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run test
npm --prefix web run build
npm run status:check
npm run verify
```

## Next Step

Owner review can proceed in parallel with the real CF27 human-verifier gate. The production path still requires:

```text
GFM | Q04 | PROMPT 103 | PHASE 03 | Import and reconcile CF27 supported-subset verifier decisions
```

after a real verifier exports a completed package.
