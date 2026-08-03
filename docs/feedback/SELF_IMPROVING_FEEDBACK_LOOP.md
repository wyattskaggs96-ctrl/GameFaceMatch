# Self-Improving Feedback Loop

Status: implemented as a local domain contract and repository boundary. It does not perform automatic retraining, production promotion, or remote Supabase writes.

## Purpose

The feedback loop lets GameFace Match preserve a user's final confirmed build settings, compare confirmation screenshots against the derived face profile, and produce privacy-safe review candidates that may inform future matcher changes after validation.

It supports the product flow:

1. A derived face profile is created from local capture.
2. A game adapter returns top-three recommendations from eligible catalog records.
3. The user follows verified build instructions in the game.
4. The user uploads confirmation screenshots for local screenshot refinement.
5. The app calculates a build-match score from 0-100.
6. Scores at or above the configurable passing threshold, currently 90, are treated as passing.
7. Scores below the threshold return verified refinement actions only.
8. The user confirms final winning settings.
9. Personal recommendation preferences are updated for the same derived profile.
10. Consented, privacy-safe global-learning candidates enter a human review queue.

## Important Boundaries

- The build-match score is an appearance-geometry comparison score, not an identity probability.
- Raw face photos, raw videos, raw screenshots, landmarks, and exact facial measurements are not stored in the feedback result.
- Global-learning candidates are not approved improvements.
- Automatic retraining is always disabled.
- Future matcher or catalog improvements require human approval, validation evidence, versioning, monitoring, and rollback.
- Skin presentation and other appearance attributes remain separate from geometric similarity.
- Game-specific controls still come from each game adapter and verified catalog data.

## Implementation

Primary module:

- `web/lib/feedback/self-improving-feedback-loop.ts`

The module provides:

- `completeSelfImprovingFeedbackLoop`
- `calculateBuildMatchScore`
- `getVerifiedRefinementActions`
- `validateGlobalLearningApproval`

Persistence contracts:

- `web/lib/supabase/repository-contracts.ts`

The repository boundary can record:

- privacy-safe build feedback outcomes
- personal recommendation preferences for the same derived profile
- consented global-learning review candidates

The local repository rejects feedback payloads that try to store raw media, exact facial measurements, or automatic-training state. The Supabase adapter remains fail-closed until a concrete server-side implementation is enabled.

## Consent

Global learning requires `futureProductImprovement` consent. In the current MVP consent definitions, that consent remains unavailable by default. The feedback loop therefore creates `notConsented` candidates unless an explicitly valid future consent state exists.

Unavailable or ungranted future-product-improvement consent must not be bypassed by UI state, query parameters, local storage, or repository writes.

## Approval Gate

A global-learning candidate can move toward a future version only when all of these are true:

- candidate status is `queuedForHumanReview`
- validation study passed
- human approval is recorded
- versioned matcher or catalog change ID exists
- rollback plan ID exists
- candidate includes no raw media, exact measurements, or identity data

The approval helper returns `validationRequired` until those conditions are satisfied.

## Tests

Focused coverage:

- `web/tests/self-improving-feedback-loop.test.ts`

The tests verify:

- build-match scores use the 90-point default pass threshold
- score language does not claim identity probability
- below-threshold builds return only verified refinement actions
- final confirmed settings and personal preferences are generated
- global learning is consent-gated and review-only
- local persistence rejects raw media and exact-measurement payloads
- Supabase writes remain fail-closed without a concrete adapter
