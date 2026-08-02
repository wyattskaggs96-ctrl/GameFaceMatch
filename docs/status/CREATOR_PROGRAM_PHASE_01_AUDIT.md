# Creator Program Phase 01 Audit

**Prompt label:** GFM | CREATOR PROGRAM | PHASE 01 | INGEST SOURCE OF TRUTH AND AUDIT PAYOUT ARCHITECTURE  
**Audit date:** 2026-08-02  
**Repository:** `/Users/skaggssystems/Developer/GameFaceMatch`  
**Branch audited:** `main`  
**HEAD audited:** `2ba2289461edaf87afc8bfb711f6699ef8b6f511`  
**Phase result:** `HOLD_OWNER` for implementation; Phase 01 planning artifacts complete.  

**Historical note:** This audit was written before Prompt 090 aligned active pricing. References to `single_scan` `$0.99` and `monthly` `$1.99/month` describe the pre-Prompt-090 repository state and are superseded for active product configuration.

This audit ingests the Creator Program source of truth and compares it against the current GameFace Match payment, Supabase, entitlement, audit, and status architecture. It does not implement checkout, creator attribution, commissions, payouts, Stripe Connect, Supabase migrations, or live account behavior.

## Source-Document Verification

| Source | Verification result |
| --- | --- |
| `docs/Product/Creator Program/CREATOR_PROGRAM_SOURCE_OF_TRUTH.md` | Present, readable, 698 lines. This is the owner-supplied governing source for the Creator Program audit. |
| `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` | Present and binding for product, privacy, no-invention, no identity-recognition, and independent-companion constraints. |
| `docs/governance/SOURCE_REGISTRY.md` | Present. It does not yet list the Creator Program source, so Phase 02 should add the new source to governance before implementation. |
| `docs/MONETIZATION_DECISION.md` | Present. At audit time it said Prompt 080 superseded an earlier `$4.99` pack; Prompt 090 has since aligned the active monetization decision to Launch Pack and All Access. |
| `docs/PAYMENT_INTEGRATION_REQUIREMENTS.md` | Present. It says no payment provider is selected and checkout must remain disabled. |
| `docs/status/SUPABASE_IMPLEMENTATION_STATUS.md` | Present. Supabase project exists, but remote schema, Storage, Auth, and app connection remain unapplied. |

Official implementation references checked during this audit:

- Stripe Connect overview: `https://docs.stripe.com/connect`
- Stripe marketplace funds-flow guide: `https://docs.stripe.com/connect/marketplace`
- Stripe hosted onboarding guide: `https://docs.stripe.com/connect/onboarding`
- Stripe webhook signature verification: `https://docs.stripe.com/webhooks/signature`
- Stripe webhook handling guidance: `https://docs.stripe.com/webhooks`
- Supabase RLS and scheduled-job guidance from current Supabase documentation search results.

## Creator Program Source Summary

The Creator Program source defines:

- `Launch Pack`: `$4.99` one-time purchase.
- `All Access`: `$9.99/year` automatically renewing annual subscription.
- Creator earnings:
  - `$1.00` for each verified new Launch Pack purchase.
  - `$2.00` for each verified new All Access subscription.
  - `$1.00` for each successful attributed annual All Access renewal.
  - `$50.00` milestone bonus for each 50 new paid attributed customers.
- Attribution:
  - 30-day attribution window.
  - First-eligible-creator attribution.
  - Manual valid creator code may override anonymous browser attribution only before the first eligible paid purchase.
  - First eligible purchase locks attribution unless an administrator corrects a documented error.
- Commission accounting:
  - Pending commission after verified payment event.
  - Default 30-day hold.
  - Refunds, disputes, fraud signals, or account problems can cancel or hold commissions.
  - Post-payout reversals require negative ledger adjustments; historical ledger rows must not be silently edited.
- Payouts:
  - Monthly target date: 15th.
  - Minimum payout: `$25.00`.
  - Creators must complete payout onboarding and remain eligible.
  - Failed payouts remain visible and retryable.
- Technical ownership:
  - Stripe: Checkout, subscriptions, customer payment method handling, refunds/disputes, connected-account onboarding, transfers, payout status events.
  - Supabase/Postgres: attribution, internal ledger, state transitions, release jobs, milestone awards, payout batches, audit history.

## Existing Architecture Discovered

| Area | Current architecture | Creator Program implication |
| --- | --- | --- |
| Active app | Next.js/React/TypeScript web app under `web/`. | Creator UI should be web-first and reuse current app shell, status, privacy, and entitlement boundaries. |
| Package manager | npm at root and under `web/`. | New scripts/tests should use existing npm conventions. |
| Stripe dependencies | No Stripe SDK or Stripe webhook route is present in `web/package.json` or current API routes. | Stripe must be added in a later implementation phase behind server-only routes or Edge Functions. |
| Payment adapter | `web/lib/payments/payment-provider.ts` defines a provider-independent interface and unavailable provider. | Reuse this boundary; add a Stripe implementation only after owner credential/environment decisions. |
| Pricing | At audit time, `web/lib/payments/pricing.ts` defined Prompt 080 scan plans. Prompt 090 supersedes those active SKUs with Launch Pack and All Access while keeping checkout disabled. | Do not enable checkout, creator attribution, commissions, or payouts without owner approval and server-side gates. |
| Entitlements | `web/lib/payments/entitlements.ts` defines local entitlement scaffolding. | Paid access must become server-authoritative before creator commissions depend on purchase state. |
| Supabase runtime | `web/lib/supabase/runtime-config.ts` and `repository-contracts.ts` provide fail-closed runtime and local-only repository adapters. | Creator data should extend the Supabase repository layer after schema and RLS are designed. |
| Supabase schema | `supabase/migrations/0001_gameface_core_schema.sql` has generic `products`, `prices`, `entitlements`, `receipt_references`, and `audit_events`. | It does not yet model creators, attribution, commission ledger, connected accounts, milestones, or payout batches. |
| API routes | Existing API routes are health/status/internal research only. | Need future server-only Stripe webhook and checkout routes. No current route may grant commissions. |
| Auth | Supabase Auth is not connected; app remains mostly accountless/local. | Creator attribution and payout onboarding require account identity for creators and likely customers before production. |
| Admin/reviewer | Internal Phase 0 tooling exists; no Creator admin dashboard exists. | Need owner/admin workflows for creator approval, locked attribution correction, payout holds, manual adjustments, and risk flags. |
| Scheduled jobs | No Supabase Cron or payout scheduler is implemented. | Daily release, milestone, and monthly payout jobs must be designed and tested before payout automation. |

## Reusable Components

- `PaymentProvider` and `SafePaymentAdapter` as the provider-independent checkout boundary.
- `products`, `prices`, `entitlements`, `receipt_references`, and `audit_events` concepts in the draft Supabase schema.
- Supabase runtime redaction, readiness status, and fail-closed remote repository behavior.
- Environment validation patterns that keep provider secrets server-only.
- Existing legal-copy guard and privacy rules preventing raw face media, landmarks, and precise measurements from being sent to payment systems.
- Existing audit pattern: append-only event records and idempotency keys.

## Missing Components

- Stripe provider implementation.
- Stripe Checkout session creation route.
- Stripe webhook route with signature verification and raw-body handling.
- Stripe Connect connected-account creation and hosted onboarding.
- Creator profile, creator code, creator link, attribution, source purchase event, commission ledger, milestone, payout batch, payout item, payout adjustment, and connected-account tables.
- RLS policies for creators, customers, owner admins, trusted server processes, and read-only views.
- Idempotent purchase-to-commission processor.
- Scheduled commission release, milestone award, and payout batch preparation jobs.
- Admin review tools for creator approval, payout pauses, holds, reversals, failed payouts, disputes, and manual corrections.
- Creator dashboard with earnings, pending/available amounts, milestone progress, payout onboarding status, and statement history.
- Test-mode certification scenarios for duplicate webhooks, refunds, disputes, failed transfers, failed payouts, and scheduled-job replays.

## Conflicts With Current Sources

| Conflict | Evidence | Required owner decision |
| --- | --- | --- |
| Historical scan pricing vs Creator Program pricing | This audit captured a pre-Prompt-090 conflict between Prompt 080 scan pricing and the Creator source. Prompt 090 resolves active product configuration in favor of Launch Pack and All Access. | Future work must not reintroduce the old scan-entry SKUs as active customer offers without a new owner decision. |
| Creator source governance | `docs/governance/SOURCE_REGISTRY.md` does not list `docs/Product/Creator Program/CREATOR_PROGRAM_SOURCE_OF_TRUTH.md`. | Add the Creator Program source to the registry before implementation and define precedence versus monetization docs. |
| Accountless basic use vs creator attribution | Existing source-of-truth says basic matching must not require an account. Creator attribution wants persisted customer attribution when possible. | Define anonymous-to-account attribution behavior that does not force an account for basic matching unless paid creator-program features require one. |
| Payments disabled vs creator payout automation | Current payment docs require checkout disabled. Creator source requires Stripe payments and payouts eventually. | Approve a phased Stripe test-mode implementation only after schema, RLS, and provider setup instructions are accepted. |

## Recommended Stripe Architecture

Use Stripe as the external processor, but do not let Stripe become the source of truth for creator earnings.

- Use Stripe Checkout for customer purchases.
- Use Stripe Billing for the annual All Access subscription.
- Use Stripe Connect for creator connected accounts and hosted onboarding.
- Prefer a platform-controlled funds flow using separate charges and transfers or the current Stripe-recommended marketplace funds-flow choice at implementation time.
- Verify every webhook signature server-side using Stripe's signing secret and raw request body.
- Store Stripe event IDs with unique constraints for idempotency.
- Return webhook `2xx` quickly only after durable event recording or intentionally queue work.
- Never trust client-supplied purchase amounts, product IDs, commission rates, creator codes, or entitlement state.
- Never expose Stripe secret keys or connected-account setup credentials in browser code.
- Do not initiate live transfers or payouts until test-mode certification and owner approval.

## Recommended Supabase Architecture

Use Supabase/Postgres as the internal authority for attribution, status transitions, ledger accounting, and payout batches.

- Enable RLS on every table in exposed schemas.
- Put privileged mutations behind server routes or Edge Functions using service-role credentials only server-side.
- Use append-only `creator_commission_ledger` and `creator_status_transitions` style history rather than mutable balances.
- Use database transactions for attribution locking, commission ledger writes, milestone awards, payout batches, and payout item assignment.
- Use scheduled jobs for daily commission release, milestone calculation, and monthly payout preparation.
- Use private Supabase tables and views for creator dashboards; expose only creator-owned summary rows.
- Use a kill switch to pause commission release and payout submission without disabling customer purchases.

## Phase 01 Decision

The repository is ready for a Phase 02 schema and boundary design, but it is not ready for live payment, live payout, or production creator earnings behavior. Owner decisions are required for pricing precedence, account requirements, creator eligibility terms, tax/legal review, and Stripe Connect configuration.
