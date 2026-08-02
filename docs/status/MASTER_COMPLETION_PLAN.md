# Master Completion Plan

**Date:** 2026-08-02  
**Goal:** shortest safe path from current repository state to production launch.

## A. Minimum Production Launch

This path assumes a minimum launch can start with one verified production game only if Wyatt explicitly narrows the launch promise. If the approved launch promise remains the five-game Launch Pack, see section B.

1. **Align product/pricing governance**  
   Complexity: Small.  
   Dependencies: Creator Program source and current health check.  
   Acceptance: code/docs/tests agree on `$4.99` Launch Pack and `$9.99/year` All Access while checkout remains disabled.

2. **Complete one launch-game production catalog**  
   Complexity: Very Large.  
   Dependencies: source recordings, primary review, second verifier, catalog-manager approval.  
   Acceptance: nonempty immutable production catalog release with verified records and valid build instructions.

3. **Connect server-authoritative paid access in test mode**  
   Complexity: Large.  
   Dependencies: pricing alignment, Supabase schema, Stripe test credentials.  
   Acceptance: test-mode Checkout/Billing webhooks grant entitlements only after verified provider events.

4. **Deploy Supabase persistence and RLS**  
   Complexity: Large.  
   Dependencies: owner credentials, schema migration, RLS policy tests.  
   Acceptance: remote schema/storage/auth pass health/schema/RLS tests; browser receives no secrets.

5. **Run manual matching validation**  
   Complexity: Large.  
   Dependencies: verified catalog and working recommendations.  
   Acceptance: 10-20 consenting participant results, top-one/top-three metrics calculated from real data.

6. **Private-beta launch checkpoint**  
   Complexity: Medium.  
   Dependencies: security/privacy/mobile QA, support plan, legal review status.  
   Acceptance: readiness report returns private-beta approval or explicit limitations.

## B. Full Five-Game Production Launch

1. Complete minimum production launch foundations.
2. Build separate research/evidence pipelines for NBA 2K26, Madden NFL 26, EA SPORTS PGA TOUR, and PBA Pro Bowling 2026.
3. Produce verified production catalogs for all five launch games.
4. Extend game registry/adapters and recipe/build instructions per game.
5. Validate Launch Pack entitlement across all five games.
6. Run five-game product QA and support readiness.

Hard dependency: no launch-game may be represented as supported until its catalog records are verified production data.

## C. Creator-Program Launch

1. Register Creator Program source in governance and align pricing.
2. Add Supabase creator schema/contracts locally.
3. Add Stripe test-mode Checkout/Billing and webhook event ledger.
4. Add creator profiles, codes, links, attribution locking, and admin correction.
5. Add immutable commission ledger, hold release, milestone bonuses, and reversal handling.
6. Add Stripe Connect hosted onboarding in test mode.
7. Add payout batch preparation and test-mode transfer submission.
8. Complete legal/accounting review.
9. Certify duplicate webhook, refund, dispute, failed transfer, failed payout, scheduled-job replay, and kill-switch behavior.
10. Owner approves live creator payout launch.

Creator payouts must not block minimum customer launch unless Wyatt requires creator monetization at day one.

## D. Athlete-Comparison Expansion

1. Legal/licensing review for athlete names, likenesses, movement comparison, and marketing claims.
2. Dataset/source-evidence plan for each comparison domain.
3. Product scope for Athlete Look-Alike, Throwing Motion Match, Running Style Match, Golf Swing Match, Basketball Shot Match, and Bowling Motion Match.
4. Prototype analysis engines with non-sensitive outputs and explicit limitations.
5. Real validation study per feature.
6. Production gate and disclosure review.

These features should not block the core Create-a-Player recipe launch.

## Parallel Workstreams

Can run in parallel:

- Legal review preparation and product/pricing governance alignment.
- Wyatt source recording collection and Codex validator hardening.
- Supabase local schema design and non-live test coverage.

Must run sequentially:

- Catalog verification before production recommendations.
- Payment entitlement enforcement before paid launch.
- Matching study after verified recommendations.
- Live creator payouts after Stripe/Supabase/test/legal certification.

