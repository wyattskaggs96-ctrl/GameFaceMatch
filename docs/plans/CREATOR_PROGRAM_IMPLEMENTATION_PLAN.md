# Creator Program Implementation Plan

**Status:** Phase 01 planning artifact  
**Created:** 2026-08-02  
**Source:** `docs/Product/Creator Program/CREATOR_PROGRAM_SOURCE_OF_TRUTH.md`  
**Pricing note:** Prompt 090 supersedes the older `single_scan` / `monthly` scan-entry SKUs. Creator Program work must use the approved Launch Pack and All Access model while checkout remains disabled until later phases.

This plan breaks the Creator Program into safe implementation phases. It intentionally stops short of live checkout, live commission grants, connected-account onboarding, transfers, or payouts.

## Guardrails

- Do not change existing College Football 27 catalog, FC 26, matching, capture, or privacy behavior.
- Do not convert any payment UI selection into verified payment.
- Do not generate creator commissions from client events.
- Do not create live Stripe connected accounts or transfers without owner approval.
- Do not expose Stripe or Supabase secrets to the browser.
- Do not edit historical commission rows; use reversal or adjustment rows.
- Do not use creator attribution to bypass production-catalog gates.

## Phase 02 - Governance And Data Model

Objective: make the Creator Program source governable and prepare a relational schema.

Scope:

- Register `docs/Product/Creator Program/CREATOR_PROGRAM_SOURCE_OF_TRUTH.md` in `docs/governance/SOURCE_REGISTRY.md`.
- Preserve Prompt 090 Launch Pack / All Access pricing while keeping checkout disabled.
- Add draft SQL migrations for creator entities, statuses, and constraints.
- Add TypeScript domain contracts for creator links, attribution, commission rows, payout batches, and Stripe event records.
- Add tests for status enums, duplicate IDs, idempotency keys, and no production behavior.

Acceptance criteria:

- Schema validates locally.
- Existing payment checkout remains disabled.
- Launch Pack and All Access remain typed but checkout-disabled.
- No live Stripe or Supabase operation runs.

## Phase 03 - Stripe Test-Mode Boundary

Objective: connect Stripe only in test mode behind server-only boundaries.

Scope:

- Add Stripe dependency only to server/runtime code.
- Add server route or Edge Function for Checkout session creation.
- Add server route or Edge Function for webhook receipt.
- Verify webhook signatures.
- Store every Stripe event with unique `stripe_event_id`.
- Map only test-mode product and price references supplied through environment variables.
- Keep creator commission processing disabled by default behind a server-side flag.

Acceptance criteria:

- Duplicate webhooks are ignored safely.
- Browser bundle contains no Stripe secret or webhook secret.
- Client cannot set amount, commission, entitlement, or creator payout status.
- Payment-provider unavailable behavior remains the default when env is absent.

## Phase 04 - Creator Accounts And Attribution

Objective: allow approved creators to have codes/links and lock attribution deterministically.

Scope:

- Creator application/profile tables.
- Creator code uniqueness and normalization.
- Creator link click/event records.
- Anonymous attribution cookie/session handling.
- Manual creator code application before first eligible purchase.
- Locked first-eligible-creator attribution on first eligible verified purchase.
- Admin correction workflow with reason and audit trail.

Acceptance criteria:

- One customer has at most one locked first-purchase attribution.
- Attribution window is enforced at 30 days.
- Manual code cannot override after first eligible paid purchase except through admin correction.
- Creator attribution does not require raw face media.

## Phase 05 - Commission Ledger

Objective: calculate creator earnings from verified server-side purchase events.

Scope:

- Source purchase event table.
- Commission ledger table.
- Pending commission creation for Launch Pack purchases, new All Access subscriptions, and renewals.
- Refund/dispute/fraud hold logic.
- Negative adjustments for post-payout reversals.
- Milestone counter and `$50` bonus per 50 new paid attributed customers.

Acceptance criteria:

- Duplicate payment event cannot duplicate commission.
- Refund before hold clearance cancels or holds pending commission.
- Refund after payout creates a reversal row.
- Renewals pay renewal commission but do not increment new-customer milestones.

## Phase 06 - Creator Dashboard

Objective: show creators accurate, non-sensitive earning state.

Scope:

- Creator onboarding status.
- Creator link/code display.
- Attribution and conversion summaries.
- Pending, available, held, paid, reversed, and failed payout totals.
- Milestone progress.
- Payout statements.

Acceptance criteria:

- Creator can only see their own rows.
- Dashboard uses Supabase RLS-backed views or server-side filtered queries.
- No customer raw face media, facial measurements, card data, or private internal review notes are visible.

## Phase 07 - Payout Batches

Objective: prepare payout batches without enabling live transfers by default.

Scope:

- Monthly payout batch preparation.
- Minimum payout threshold `$25`.
- Connected-account status check.
- Owner/admin review before transfer submission.
- Stripe transfer submission in test mode.
- Failed transfer/payout retry status.

Acceptance criteria:

- Ledger row cannot be included in two payout batches.
- Batch totals reconcile to included ledger rows.
- Payout kill switch prevents transfer submission.
- Live payout mode requires explicit owner approval and environment gate.

## Phase 08 - Certification And Launch Gate

Objective: prove the Creator Program is safe before real money movement.

Required certification scenarios:

- Launch Pack purchase.
- New All Access subscription.
- All Access renewal.
- Duplicate webhook replay.
- Refund before hold clearance.
- Refund after payout.
- Dispute.
- Failed payment.
- Failed transfer.
- Failed connected-account onboarding.
- Admin hold.
- Manual attribution correction.
- Scheduled-job replay.

Launch gate:

- Legal/tax/accounting review complete.
- Stripe Connect configuration approved.
- Supabase RLS tested.
- Payment and payout monitoring active.
- Owner signs off on live mode.
