# Production Blocker Register

**Date:** 2026-08-02

## P0 - Cannot Launch Without It

| Blocker | Why it matters | Owner | Required input/action |
| --- | --- | --- | --- |
| No verified production catalog records | Product cannot return real game settings. | Wyatt, Codex, second verifier | Complete evidence, verification, catalog-manager approval. |
| Pricing/config conflict | Code/docs still include `$0.99` / `$1.99/month`; business direction says `$4.99` / `$9.99/year`. | Codex + Wyatt | Align source registry, pricing docs, config, and tests without enabling checkout. |
| No production payment/subscription stack | Approved paid launch cannot collect money or grant entitlements. | Wyatt + Codex + Stripe | Test-mode Stripe Checkout/Billing/webhooks after pricing alignment. |
| No server-authoritative entitlements | Customers cannot be safely granted paid access. | Codex | Supabase/Auth/payment integration with fail-closed checks. |
| No real matching validation | Product promise is not measured. | Wyatt + study reviewers | 10-20 participant study after verified catalog. |
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

## HOLD_OWNER

- Approve exact relationship between Launch Pack/All Access and existing scan-entry plans.
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

