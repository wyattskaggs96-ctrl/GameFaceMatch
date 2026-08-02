# GameFace Match — Creator Program and Automated Payouts
## Product and Implementation Source of Truth

**Document status:** Owner-approved direction for planning  
**Owner:** Wyatt Skaggs  
**Project:** GameFace Match  
**Purpose:** Define the commercial offer, creator compensation, attribution, commission accounting, payout automation, creator experience, administrative controls, and implementation guardrails.

---

## 1. Product Pricing

### 1.1 Launch Pack — $4.99 one-time purchase

The Launch Pack includes permanent access to personalized Create-a-Player recipes for these five original game editions:

1. EA SPORTS College Football 27
2. NBA 2K26
3. Madden NFL 26
4. EA SPORTS PGA TOUR
5. PBA Pro Bowling 2026

The Launch Pack does not automatically include future games or future annual editions.

### 1.2 All Access — $9.99 per year

All Access is an automatically renewing annual subscription that includes, while the membership is active:

- Every currently supported game.
- New supported games released during the active subscription period.
- Newly supported annual game editions.
- Athlete Look-Alike comparisons.
- Throwing Motion Match.
- Running Style Match.
- Future supported sport-motion comparisons.
- Updated recipes and comparison results as supported features evolve.

The initial $9.99 annual price should be presented as a **Founding Member Price** so pricing can change for future new customers without changing the original launch promise.

### 1.3 Account-use boundary

A purchase or subscription is intended for:

- One customer account.
- One personal face and athlete profile.
- Personal, noncommercial use.
- No account sharing or generation of paid recipes for third parties.

---

## 2. Founding Creator Program

### 2.1 Creator earnings

Creators earn:

- **$1.00** for each verified new Launch Pack purchase.
- **$2.00** for each verified new All Access subscription.
- **$1.00** for each successful attributed annual All Access renewal.
- **$50.00** each time the creator reaches another 50 verified new paid customers.

Milestone examples:

- 50 verified new paid customers: $50 bonus.
- 100 verified new paid customers: another $50 bonus.
- 150 verified new paid customers: another $50 bonus.
- The pattern continues at every additional 50 verified new paid customers.

Renewals earn the renewal commission but do not count again as new paid customers toward milestone bonuses.

### 2.2 Verified paid customer definition

A customer counts only when all of the following are true:

- The payment succeeds in live mode.
- The customer is new and eligible for creator attribution.
- The purchase has not been refunded, disputed, reversed, or charged back.
- The customer is not the creator.
- The payment is not a duplicate, test transaction, or suspected fraudulent transaction.
- The customer has not already counted as a new paid customer for another creator.

### 2.3 Attribution policy

Initial policy:

- Use a creator-specific referral link and optional creator code.
- Use a 30-day attribution window.
- Use first-eligible-creator attribution.
- Persist attribution to the authenticated customer account when possible.
- A manually entered valid creator code may override anonymous browser attribution only before the first paid purchase.
- Once the first eligible purchase is attributed, attribution is locked for that customer unless an administrator corrects a documented error.
- The attributed creator receives the eligible annual renewal commission for that subscription.

All attribution decisions must be auditable.

### 2.4 Commission lifecycle

Commission states:

1. `pending`
2. `available`
3. `scheduled`
4. `paid`
5. `reversed`
6. `held`
7. `canceled`

Rules:

- Create a pending commission after a verified payment event.
- Default hold period: 30 days.
- After the hold period, eligible commissions become available.
- Refunds, disputes, fraud signals, or account problems may cancel or hold pending commissions.
- If a commission was already paid and the source payment is later reversed, create a separate negative adjustment. Never silently edit historical ledger records.
- Every commission and adjustment must have a source event, reason, timestamp, and idempotency key.

### 2.5 Payout policy

Initial payout rules:

- Payouts are processed monthly.
- Target payout date: the 15th of each month.
- Pay only commissions that cleared the 30-day hold before the payout cutoff.
- Minimum payout: $25.
- Balances below $25 roll forward.
- Creators must complete payout onboarding and remain eligible.
- Failed payouts remain visible and retryable.
- The creator receives a payout statement showing commissions, bonuses, reversals, and the final payout amount.

---

## 3. Recommended Payment Architecture

### 3.1 Platform responsibilities

GameFace Match remains the customer-facing seller and controls:

- Product pricing.
- Customer checkout.
- Refund and dispute handling.
- Creator commission calculation.
- Commission release timing.
- Creator payout timing.
- Fraud review.
- Payout adjustments.

### 3.2 Stripe responsibilities

Use Stripe for:

- Checkout and payment processing.
- Annual subscription billing.
- Creator connected-account onboarding.
- Identity and payout-account collection.
- Transfers to creator connected accounts.
- Bank payouts from connected accounts.
- Relevant account-status and payout-status events.

Use Stripe-hosted onboarding or the current Stripe-supported connected-account onboarding configuration. Do not build custom collection of sensitive identity or bank information.

Use a platform-controlled funds flow that allows customer payments and creator transfers to be decoupled. The implementation must be based on Stripe's current Connect configuration and API version at implementation time, not on an outdated hard-coded legacy account type.

### 3.3 Supabase responsibilities

Use Supabase/Postgres as the authoritative internal ledger for:

- Creators.
- Referral codes and links.
- Customer attribution.
- Orders and subscriptions.
- Commission entries.
- Milestone progress and awards.
- Payout batches.
- Payout line items.
- Reversals and adjustments.
- Webhook idempotency and processing history.
- Administrative review status.

Use scheduled jobs for:

- Releasing eligible commissions after the hold period.
- Calculating milestone bonuses.
- Preparing monthly payout batches.
- Retrying eligible failed internal jobs.

External Stripe actions should be performed through a secure server or Edge Function, not directly from client code or untrusted SQL.

---

## 4. Minimum Data Model

The implementation should preserve current project conventions. The following logical entities are required even if exact table names differ.

### 4.1 `creators`

Suggested fields:

- `id`
- `user_id`
- `display_name`
- `slug`
- `status`
- `stripe_connected_account_id`
- `onboarding_status`
- `payouts_enabled`
- `default_currency`
- `program_terms_version`
- `program_terms_accepted_at`
- `created_at`
- `updated_at`

### 4.2 `creator_codes`

Suggested fields:

- `id`
- `creator_id`
- `code`
- `is_active`
- `starts_at`
- `ends_at`
- `created_at`

### 4.3 `creator_attributions`

Suggested fields:

- `id`
- `creator_id`
- `customer_user_id`
- `anonymous_session_id`
- `source`
- `creator_code_id`
- `first_touch_at`
- `expires_at`
- `locked_at`
- `locked_order_id`
- `created_at`

Enforce that one customer can have only one locked creator attribution for the first eligible paid purchase.

### 4.4 `orders`

Use or extend the existing order/payment structure. Required information includes:

- Internal order ID.
- Customer user ID.
- Product type.
- Product version.
- Amount and currency.
- Stripe Checkout Session ID.
- Stripe Payment Intent or Invoice ID.
- Payment status.
- Refund and dispute status.
- Live/test mode.
- Attributed creator ID.
- Created and paid timestamps.

### 4.5 `subscriptions`

Use or extend the existing subscription structure. Required information includes:

- Customer user ID.
- Stripe Customer ID.
- Stripe Subscription ID.
- Subscription status.
- Current period dates.
- Original attributed creator ID.
- Founding-price status.
- Cancellation and renewal timestamps.

### 4.6 `creator_commission_ledger`

This must be an immutable ledger rather than a single editable balance.

Suggested fields:

- `id`
- `creator_id`
- `customer_user_id`
- `order_id`
- `subscription_id`
- `source_event_id`
- `commission_type`
- `amount_cents`
- `currency`
- `status`
- `earned_at`
- `available_at`
- `scheduled_at`
- `paid_at`
- `reversal_of_ledger_id`
- `payout_batch_id`
- `idempotency_key`
- `reason`
- `metadata`
- `created_at`

Commission types should include:

- `launch_pack_new_sale`
- `all_access_new_subscription`
- `all_access_renewal`
- `fifty_customer_bonus`
- `manual_positive_adjustment`
- `manual_negative_adjustment`
- `refund_reversal`
- `dispute_reversal`

### 4.7 `creator_milestones`

Suggested fields:

- `id`
- `creator_id`
- `milestone_number`
- `customer_threshold`
- `achieved_at`
- `ledger_entry_id`
- `created_at`

Add a uniqueness constraint preventing the same milestone from being awarded twice.

### 4.8 `creator_payout_batches`

Suggested fields:

- `id`
- `creator_id`
- `status`
- `amount_cents`
- `currency`
- `period_start`
- `period_end`
- `stripe_transfer_id`
- `failure_code`
- `failure_message`
- `scheduled_for`
- `submitted_at`
- `completed_at`
- `created_at`

### 4.9 `creator_payout_items`

Links each payout batch to the exact ledger entries included in that payout.

### 4.10 `stripe_webhook_events`

Suggested fields:

- `stripe_event_id`
- `event_type`
- `livemode`
- `api_version`
- `payload_hash`
- `processing_status`
- `attempt_count`
- `processed_at`
- `last_error`
- `created_at`

The Stripe event ID must be unique to enforce idempotency.

---

## 5. Required Event Handling

The implementation must inspect the current Stripe integration and map the exact events used by the existing checkout and subscription flow.

At minimum, design for:

- Successful one-time checkout payment.
- Successful first subscription payment.
- Successful annual renewal.
- Failed subscription payment.
- Full and partial refunds.
- Disputes and chargebacks.
- Subscription cancellation and expiration.
- Connected-account status changes.
- Transfer creation, failure, reversal, or completion as applicable.
- Connected-account payout status as applicable.

Webhook handlers must:

- Verify Stripe signatures.
- Be idempotent.
- Store processing history.
- Return quickly and move longer work into safe background processing where appropriate.
- Never trust client-provided purchase or attribution amounts.
- Use server-side product and commission configuration.

---

## 6. Scheduled Jobs

### 6.1 Daily commission release

Run daily:

- Find pending commissions whose hold period has ended.
- Confirm the underlying payment remains eligible.
- Confirm no refund, dispute, fraud hold, or administrative hold exists.
- Move eligible entries to available.
- Record an audit event.

### 6.2 Milestone calculation

Run after each newly verified paid customer and as a reconciliation job:

- Count unique verified new paid customers for the creator.
- Determine every unawarded multiple-of-50 milestone.
- Create one $50 ledger entry per newly achieved milestone.
- Use a uniqueness constraint and transaction to prevent duplicates.

### 6.3 Monthly payout preparation

Run monthly before the payout date:

- Select available ledger entries not already assigned to a payout.
- Require at least $25 total available balance.
- Confirm connected-account onboarding and payout eligibility.
- Create a payout batch.
- Lock selected ledger entries to that batch.
- Submit one creator transfer.
- Record success or failure without losing the ledger relationship.

### 6.4 Reconciliation

Provide an administrator-triggered reconciliation process that compares:

- Stripe payments.
- Internal orders and subscriptions.
- Commission ledger entries.
- Transfers.
- Payout batches.
- Refunds and disputes.

It must report discrepancies without silently rewriting history.

---

## 7. Creator Experience

### 7.1 Creator application and approval

Initial states:

- Applied.
- Under review.
- Approved.
- Rejected.
- Suspended.
- Closed.

Do not enable referral earning or payout onboarding until the creator is approved.

### 7.2 Creator onboarding

The creator flow should include:

1. Program explanation.
2. Acceptance of the current creator terms.
3. Stripe-hosted payout onboarding.
4. Creator link and code generation.
5. Disclosure guidance.
6. Access to the creator dashboard.

### 7.3 Creator dashboard

Show:

- Referral link.
- Creator code.
- Link clicks.
- Verified paid customers.
- Launch Pack purchases.
- New All Access subscriptions.
- Annual renewals.
- Refunds and reversals.
- Pending earnings.
- Available earnings.
- Scheduled earnings.
- Paid earnings.
- Next payout date.
- Payout onboarding status.
- Payout history.
- Current milestone progress, such as `38 / 50`.
- Distance to next $50 bonus.

Clearly label estimated, pending, available, and paid amounts.

### 7.4 Creator payout statement

Each monthly statement should include:

- Period.
- Base commissions.
- Renewal commissions.
- Milestone bonuses.
- Reversals.
- Adjustments.
- Gross payout amount.
- Payout status.
- Transfer or payout reference.
- Program terms version.

---

## 8. Administrative Experience

Administrators need:

- Creator search and status controls.
- Approval, suspension, and closure workflows.
- Attribution lookup by customer, creator, order, and code.
- Commission-ledger inspection.
- Milestone audit.
- Payout-batch preview before submission.
- Manual hold and release.
- Documented positive or negative adjustment.
- Failed-payout retry.
- Refund and dispute visibility.
- Fraud flags.
- Program-wide totals and creator rankings.
- CSV export for accounting.
- Full audit history.

Manual actions must require a reason and preserve the original record.

---

## 9. Security and Reliability Requirements

- Never expose Stripe secret keys or Supabase service-role keys to the browser.
- Verify webhook signatures using the raw request body.
- Enforce database row-level security where appropriate.
- Restrict commission and payout writes to trusted server-side functions.
- Use transactions for attribution locking, milestone awards, and payout-batch creation.
- Use idempotency keys for Stripe transfers.
- Prevent duplicate payout of a ledger entry.
- Prevent a creator from viewing another creator's data.
- Preserve live-mode and test-mode separation.
- Log financial state changes.
- Use integer minor units such as cents for money.
- Do not use floating-point arithmetic for money.
- Store configuration for prices, commissions, hold periods, minimum payouts, and milestone thresholds server-side.
- Include a controlled kill switch to pause commission release or payout submission without disabling customer purchases.

---

## 10. Legal and Program Controls

Before public launch, obtain professional review of:

- Creator Program terms.
- Affiliate disclosure requirements.
- Refund and chargeback treatment.
- Tax reporting responsibilities.
- International creator eligibility.
- Privacy and data handling.
- Right to suspend fraud or abuse.
- Right to change future commission rates with notice.
- Treatment of commissions already earned before a program change.

Creators must clearly disclose material relationships in promotional content.

Do not promise that Stripe alone eliminates GameFace Match's tax, labor-classification, consumer-protection, or reporting obligations.

---

## 11. Initial Configuration

Use these as configuration values, not scattered constants:

| Setting | Initial value |
|---|---:|
| Launch Pack price | $4.99 |
| All Access annual price | $9.99 |
| Launch Pack creator commission | $1.00 |
| New All Access creator commission | $2.00 |
| All Access renewal commission | $1.00 |
| Milestone threshold | 50 verified new paid customers |
| Milestone bonus | $50.00 |
| Attribution window | 30 days |
| Commission hold period | 30 days |
| Minimum payout | $25.00 |
| Payout frequency | Monthly |
| Target payout date | 15th |

---

## 12. Phase Plan

### Phase 1 — Repository audit and architecture

- Inspect the current checkout, Stripe, subscription, Supabase, authentication, and admin implementations.
- Reconcile this source of truth with the current repository.
- Identify reusable components and missing foundations.
- Produce an implementation plan, schema plan, event map, risk register, and test plan.
- Do not change live infrastructure.

### Phase 2 — Financial data foundation

- Add controlled migrations.
- Add immutable ledger and idempotency.
- Add attribution locking.
- Add test fixtures and unit tests.

### Phase 3 — Stripe connected-account onboarding

- Add creator application and approval.
- Add current supported Stripe connected-account creation and hosted onboarding.
- Add account-status synchronization.

### Phase 4 — Commission engine

- Implement one-time sale, new subscription, renewal, refund, dispute, adjustment, and milestone logic.
- Add reconciliation tests.

### Phase 5 — Creator dashboard

- Add creator links, metrics, earnings states, milestone tracker, and payout history.

### Phase 6 — Payout automation

- Add hold release.
- Add payout batches.
- Add Stripe transfers.
- Add retry, failure, and reconciliation controls.
- Keep actual live payouts disabled until owner approval.

### Phase 7 — Admin and compliance

- Add admin controls, exports, disclosures, program terms acceptance, and audit history.

### Phase 8 — Sandbox validation and controlled launch

- Run Stripe test-mode end-to-end scenarios.
- Test duplicate webhooks.
- Test refunds, disputes, failed payments, failed transfers, and payout retries.
- Obtain owner, legal, accounting, and security approval.
- Enable live mode through a controlled production checklist.

---

## 13. Launch Acceptance Criteria

The creator payout system is not production-ready until all of the following are true:

- Creator attribution is deterministic and auditable.
- Duplicate webhook delivery does not duplicate commissions.
- Duplicate scheduled-job execution does not duplicate bonuses or payouts.
- Refunds and disputes create correct reversals.
- Renewals pay $1 and do not increment new-customer milestones.
- Every multiple of 50 produces exactly one $50 bonus.
- No ledger entry can be paid twice.
- Creator balances can be reconstructed entirely from ledger entries.
- Creators can complete hosted payout onboarding.
- Creators can only view their own data.
- Administrators can pause payouts.
- Test-mode and live-mode data cannot be mixed.
- Payout batches reconcile to exact ledger entries.
- Failed transfers and payouts are visible and retryable.
- The system has automated tests and a documented manual test checklist.
- Live transfers remain disabled until explicit owner approval.

---

## 14. Non-Goals for the First Release

Do not include unless separately approved:

- Instant payouts.
- Cryptocurrency payouts.
- Multiple currencies.
- Multi-level referral trees.
- Creator-to-creator sub-affiliates.
- Negotiated creator-specific commission contracts in the first implementation.
- Unlimited manual changes to historical attribution.
- Custom storage of bank-account or government-ID information.
- Live payouts before test-mode certification.

---

## 15. Official Technical References

Use the latest official documentation during implementation:

- Stripe Connect design and connected-account configuration.
- Stripe-hosted onboarding.
- Stripe Connect webhooks.
- Stripe separate charges and transfers.
- Stripe connected-account payout management.
- Supabase Cron.
- Supabase scheduled Edge Functions.
- Supabase Edge Function security.

The implementation team must confirm current APIs, account configurations, fees, country support, and compliance obligations at implementation time.
