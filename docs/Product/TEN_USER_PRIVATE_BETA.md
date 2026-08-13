# Ten-User Private Beta Contract

**Status:** AUTHORITATIVE Q07 PRIVATE-BETA SCOPE
**Prompt:** `GFM | Q07 | PROMPT 136 | PHASE 01 | Lock ten-user beta scope and restore baseline`
**Date:** 2026-08-13
**Owner:** Wyatt Skaggs
**Immediate target:** unpaid invite-only research beta, maximum 10 testers
**Client:** iPhone Safari
**Hosting target:** Vercel HTTPS
**Game:** EA SPORTS College Football 27

This contract supersedes paid-public-production sequencing for the immediate Q07 queue. It does not supersede production catalog safety rules, privacy rules, no-invented-data rules, or future paid/public launch requirements.

## Product Contract

A real person can receive a private invite link, open GameFace Match on an iPhone, complete the guided browser scan, receive an experimental College Football 27 build recommendation, create that player in College Football 27, upload 1-3 photos or screenshots of the result, rate resemblance, and submit feedback for matcher review.

The beta is research-only:

- Maximum initial cohort: 10 invited testers.
- No payment is required.
- No account is required for the basic beta flow.
- College Football 27 is the only beta game.
- iPhone Safari is the primary beta client.
- Vercel is the selected web hosting platform for the beta.
- Human catalog verification is deferred for this private beta only.
- The production catalog gate remains unchanged and fail-closed.
- Paid/public launch still requires stronger human verification, catalog-manager approval, legal/payment/deployment gates, and production catalog publication.

## Beta Recommendation Tier

The explicit non-production tier is:

```text
sourceType: betaResearch
evidenceTier: BETA_RESEARCH
```

`betaResearch` may be used only for the controlled 10-user research beta. It may draw from locked owner media, existing evidence, supported-subset classifications, primary-review notes, and explicitly documented limitations. It may not invent a College Football 27 option, label, index, menu path, slider, preset, hairstyle, facial-hair value, game version, platform, or setting.

Beta recommendations must:

- be labeled as experimental private-beta results;
- identify the evidence/support state used;
- omit unsupported categories rather than filling gaps;
- cap confidence where evidence is incomplete;
- collect tester confirmation and feedback;
- remain excluded from production metrics unless separately approved as beta research outcomes.

Beta records must never:

- become `VERIFIED`;
- become production-approved;
- enter `data/catalog/production/`;
- satisfy production promotion;
- enable paid/public production recommendations;
- count as second-human verification;
- count as matching-study proof without separate study consent and review.

## Accepted Data Collection

The beta may collect and persist only the minimum data needed for the research beta:

- pseudonymous beta session ID;
- invite ID;
- derived face profile needed for matching;
- capture quality metrics;
- recommendation IDs and ranks;
- catalog/evidence support status used;
- tester-selected result;
- College Football 27 output screenshots/photos;
- resemblance rating;
- free-text feedback;
- deletion status.

## Prohibited Data Collection

The beta must not upload or persist raw face scan video or raw face scan images for analytics by default. Raw face media may be retained only after a future separate consent decision and implementation.

The beta must not store biometric identification data, identity templates, sensitive-trait inferences, unredacted secrets, production payment data, or fixture/demo records as real beta outcomes.

## Acceptance Criteria

For this ten-user beta to be ready:

1. A durable Vercel HTTPS invite URL opens on a physical iPhone in Safari.
2. The invite is opaque and limited to the 10-user cohort.
3. The tester can consent without creating an account or paying.
4. The guided scan can complete reliably on real iPhone Safari without raw face media upload by default.
5. The recommendation engine returns only `betaResearch` or future production-approved CF27 settings; unsupported settings are omitted.
6. Every recommendation screen says the result is experimental/private-beta output.
7. The tester can upload 1-3 CF27 result screenshots/photos without owner file handling.
8. The tester can rate resemblance and submit free-text feedback.
9. The tester can delete beta trial data.
10. Production catalog counts remain truthful and production recommendations remain disabled until real production catalog gates pass.

## Current Known Gaps

- The production catalog remains empty and fail-closed.
- The 76-record supported-subset human verifier package remains a paid/public production gate, not a Q07 ten-user beta prerequisite.
- Vercel deployment is not performed by this prompt.
- The full ten-user beta UI and server persistence are not implemented by this prompt.
- Real iPhone Safari scan completion still requires physical-device validation before testers are invited.
