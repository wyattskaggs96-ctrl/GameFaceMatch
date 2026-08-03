# Production Blocker Register

**Date:** 2026-08-03

## P0 - Cannot Launch Without It

| Blocker | Why it matters | Owner | Required input/action |
| --- | --- | --- | --- |
| No verified production catalog records | Product cannot return real game settings. | Wyatt, Codex, second verifier | Complete evidence, verification, catalog-manager approval. Current production catalog count is 0. |
| CF27 production promotion contract not yet satisfiable by any current record | Prevents research or partially verified records from becoming customer-facing data. | Codex, second verifier, catalog manager | Use the locked owner media baseline, classify every option/category into explicit evidence-support states, exclude unsupported/limited/version-mismatched records from customer recommendations, obtain real second-human decisions for supported records, resolve duplicates/order/environment gaps for the supported subset, record explicit manager acceptance, and create a release-candidate package. |
| No production payment/subscription stack | Approved Launch Pack and All Access are configured but cannot collect money or grant entitlements. | Wyatt + Codex + Stripe | Implement test-mode Stripe Checkout/Billing/webhooks only after catalog and server-authoritative entitlement gates are ready. |
| No server-authoritative entitlements | Customers cannot be safely granted paid access. | Codex | Supabase/Auth/payment integration with fail-closed checks. |
| No real matching validation | Product promise is not measured. | Wyatt + study reviewers | Study workflow exists, but the 10-20 participant study must wait until verified catalog records and real top-three outputs exist. |
| Legal/privacy/payment approval missing | Paid biometric-adjacent product cannot safely launch. | Wyatt + counsel | Legal review of terms, privacy, refunds, trademarks, creator terms. |

## P1 - Required Immediately After Primary Launch Path Works

| Blocker | Owner | Next action |
| --- | --- | --- |
| Real-device mobile QA incomplete | Wyatt + Codex | Test capture on supported phones. |
| Supabase remote not deployed | Codex + Wyatt | Apply migrations/RLS/storage through approved credential workflow. |
| Support operations not staffed | Wyatt | Choose support email/process/escalation owner. |
| Monitoring/error reporting absent | Codex + Wyatt | Add privacy-safe provider after deployment target. |

## P2 - Important But Can Follow Initial Launch

| Item | Owner | Notes |
| --- | --- | --- |
| Additional launch-game catalogs beyond first production game | Wyatt + Codex | Full five-game launch requires all five; minimum launch can be narrower only if business definition changes. |
| Screenshot-refinement production validation | Codex + study reviewers | Needs verified catalog and screenshots. |
| Native iOS premium capture | Codex | Preserved foundation, not active launch path. |

## P3 - Optional Enhancement

| Item | Notes |
| --- | --- |
| Offline/PWA service worker | Current docs intentionally avoid offline claims. |
| Advanced creator analytics | Defer until creator payouts are trustworthy. |

## HOLD_OWNER_DECISION

- No additional owner source-media recording is required for the initial launch baseline. `OWNER_MEDIA_BASELINE_LOCKED` supersedes prior owner-recapture launch blockers.
- Approve account requirement for paid Launch Pack and All Access purchases.
- Approve account requirement for paid purchases.
- Approve supported countries/currencies.
- Approve support/refund process.
- Approve hosting target.

## HOLD_LEGAL

- Biometric privacy review.
- Terms of Service and Privacy Policy approval.
- Trademark/non-affiliation review.
- Creator Program agreement.
- Athlete-name/likeness and comparison-feature review.

## HOLD_ACCOUNTING

- Creator payout tax reporting.
- Refund/dispute/reversal accounting.
- Stripe fees/taxes and payout treatment.

## HOLD_EXTERNAL

- Stripe account and Connect configuration.
- Supabase remote credentials and project setup.
- Hosting/DNS/HTTPS.
- Real second verifier.
- Real participant study subjects.
