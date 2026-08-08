# Owner Review Demo Mode

**Status:** IMPLEMENTED AS ISOLATED NON-PRODUCTION MODE  
**Latest prompt:** GFM | Q06 | PROMPT 127 | PHASE 04 | Complete before-after validation loop
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
- skin details
- hairstyle
- hair color
- facial hair
- facial-hair color
- nose bridge slider-style setting
- jaw width slider-style setting
- chin depth slider-style setting
- step-by-step menu navigation instructions
- synthetic scoring and refinement metadata
- one-step-at-a-time build-guide progress

The records intentionally use demo labels and must never be represented as genuine College Football 27 verification.

## Prompt 124 Scan-To-Build Journey

Prompt 124 extends the isolated demo lane into the complete owner-review scan-to-build journey:

1. private invite landing and consent;
2. existing Prompt 104 guided-scan handoff;
3. scan-complete processing copy: `Building your GameFace...`;
4. best-match result with match score, confidence, top-three alternatives, all demo settings, and selection rationale;
5. `Build This in College Football 27` walkthrough with 11 resumable steps;
6. `View All Settings` summary;
7. build-guide-complete handoff: `Your player is built. Now show us how it turned out.`;
8. mobile E2E coverage at 390 x 844 and 430 x 932.

Build-guide progress is stored in the local Buddy Trial session record as non-image state. It survives refresh and browser reopen in the same browser storage scope. It does not store raw human face media, production recommendations, real beta metrics, or production catalog state.

## Prompt 125 First Character Video Review

Prompt 125 extends the isolated demo lane after build-guide completion:

1. build-complete state transitions to `LET'S SEE HOW WE DID`;
2. tester sees the required College Football 27 character rotation instructions;
3. `Record Video` uses compatible browser recording when available;
4. `Upload Existing Video` accepts iPhone Photos/files, videos filmed from a TV/monitor, and clean console-recorded files;
5. validation checks format, duration, size, playable metadata, video dimensions, and decode failures;
6. local processing samples deterministic frame candidates for front, left three-quarter, right three-quarter, and optional profile views;
7. uncertain automation asks the tester to select the best frames;
8. bad media provides retake guidance and a retry path;
9. persisted trial state stores only non-image review summaries and standardized-view metadata.

Raw character videos, raw human face media, object URLs, generated thumbnails, data URLs, and base64 media are not retained by default. The processing remains local/demo and does not create real refinement evidence, real beta metrics, production catalog records, or production recommendations.

## Prompt 126 Measurable Refinement

Prompt 126 extends the isolated demo lane from standardized Video #1 views into a measurable first-result review:

1. `GAMEFACE REVIEW` displays an internal Build Match Score;
2. score language states that the value is based on available game controls and is not identity probability;
3. strengths and closer areas are shown in plain language;
4. demo fixture calibration may recommend exact changes only for controls available through the active owner-review adapter;
5. the default fixture recommends Jaw Width `67 -> 61`, Nose Height `46 -> 51`, and Chin Projection `58 -> 52`;
6. each change includes a reason and expected effect;
7. unsupported fixture sliders are suppressed from the customer plan;
8. no-change, uncertain, and alternate-head/preset cases are modeled in tests;
9. `Update My Player` opens a persisted step-by-step refinement guide.

Production refinement remains unavailable until a nonempty verified production catalog and verified control-effect calibration exist. The demo score and fixture calibration are not real matching-study evidence, human verification, production catalog data, or a guarantee of improvement.

## Prompt 127 Before/After Validation Loop

Prompt 127 completes the isolated owner-review loop after the refinement guide:

1. after the tester applies the recommended changes, Buddy Trial asks for Video #2 with `SHOW US THE UPDATED PLAYER`;
2. Video #2 uses the same local character-video validation, deterministic standardized-view extraction, manual frame fallback, retry behavior, and temporary-processing-only retention as Video #1;
3. `YOUR GAMEFACE RESULT` compares Initial Build, Refined Build, and the numeric delta;
4. the before/after result supports improvement, `0` no-change, and regression without forcing the refined score to improve;
5. the default fixture displays Initial Build `82 / 100`, Refined Build `91 / 100`, and Improvement `+9`;
6. the tester records whether Original, Refined, or About the same looks more like them;
7. the tester records a final resemblance rating from 1-10 and optional `What still looks off?` feedback;
8. the end screen says `GameFace complete.` and summarizes the initial recommendation, final settings, before score, after score, delta, and user feedback.

The final outcome is stored as non-image local Buddy Trial session data. Raw human face media, raw character videos, object URLs, thumbnails, and base64 media are not retained by default.

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

Prompt 125 focused validation includes:

```text
npm --prefix web run test -- buddy-trial-character-video-review.test.ts buddy-trial-session.test.ts owner-review-demo.test.ts
NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=development npm --prefix web run build
CI=1 PLAYWRIGHT_PORT=3199 NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=development npm --prefix web run test:e2e -- tests/e2e/buddy-trial.spec.ts --project=iphone-safari-size
```

Prompt 126 focused validation includes:

```text
npm --prefix web run test -- owner-review-demo.test.ts buddy-trial-session.test.ts buddy-trial-character-video-review.test.ts
CI=1 PLAYWRIGHT_PORT=3202 NEXT_PUBLIC_GAMEFACE_OWNER_REVIEW_DEMO=true NEXT_PUBLIC_GAMEFACE_DEPLOYMENT_ENV=development npm --prefix web run test:e2e -- tests/e2e/buddy-trial.spec.ts --project=iphone-safari-size
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
