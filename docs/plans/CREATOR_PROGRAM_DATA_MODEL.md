# Creator Program Data Model

**Status:** Draft for Phase 02 implementation  
**Created:** 2026-08-02  

This model extends the current Supabase draft. It does not replace the catalog, matching, or entitlement schema.

## Status Enums

Recommended enums:

- `creator_status`: `draft`, `pending_review`, `approved`, `suspended`, `rejected`, `retired`
- `creator_code_status`: `active`, `reserved`, `disabled`, `retired`
- `attribution_status`: `anonymous_pending`, `account_pending`, `locked`, `expired`, `corrected`, `voided`
- `purchase_event_kind`: `launch_pack_purchase`, `all_access_new_subscription`, `all_access_renewal`, `refund`, `dispute`, `fraud_hold`, `manual_adjustment`
- `commission_status`: `pending_hold`, `available`, `held`, `canceled`, `included_in_payout`, `paid`, `reversed`
- `commission_type`: `launch_pack_new_customer`, `all_access_new_subscription`, `all_access_renewal`, `milestone_bonus`, `manual_adjustment`, `reversal`
- `payout_batch_status`: `draft`, `ready_for_review`, `approved`, `submitted_to_stripe`, `partially_failed`, `failed`, `paid`, `canceled`
- `connected_account_status`: `not_started`, `onboarding_started`, `requirements_due`, `charges_enabled`, `payouts_enabled`, `disabled`, `restricted`

## Tables

### `creators`

Purpose: one internal creator identity.

Key fields:

- `creator_id uuid primary key`
- `profile_id uuid references profiles(id)`
- `display_name text`
- `status creator_status`
- `approved_by uuid`
- `approved_at timestamptz`
- `suspended_at timestamptz`
- `status_reason text`
- `created_at timestamptz`
- `updated_at timestamptz`

Constraints:

- Creator cannot earn unless `status = 'approved'`.
- Creator approval must create an audit event.

### `creator_codes`

Purpose: normalized referral code controlled by the platform.

Key fields:

- `creator_code_id uuid primary key`
- `creator_id uuid references creators(creator_id)`
- `code text unique`
- `status creator_code_status`
- `created_at timestamptz`
- `retired_at timestamptz`

Constraints:

- Store normalized uppercase or lowercase form consistently.
- Only one active primary code per creator unless owner explicitly allows aliases.

### `creator_links`

Purpose: creator referral URLs and campaign metadata.

Key fields:

- `creator_link_id uuid primary key`
- `creator_id uuid references creators(creator_id)`
- `creator_code_id uuid references creator_codes(creator_code_id)`
- `slug text unique`
- `campaign text`
- `status text`
- `created_at timestamptz`

### `creator_referral_events`

Purpose: raw, non-payment referral touch records.

Key fields:

- `referral_event_id uuid primary key`
- `creator_id uuid references creators(creator_id)`
- `creator_code_id uuid references creator_codes(creator_code_id)`
- `anonymous_session_id text`
- `customer_profile_id uuid references profiles(id)`
- `landing_path text`
- `utm_source text`
- `utm_campaign text`
- `occurred_at timestamptz`
- `expires_at timestamptz`
- `ip_hash text`
- `user_agent_hash text`

Constraints:

- No raw IP address or full user-agent storage unless legal/privacy review approves it.
- No raw face media or facial measurement payloads.

### `creator_attributions`

Purpose: first-eligible-creator attribution decision.

Key fields:

- `attribution_id uuid primary key`
- `customer_profile_id uuid references profiles(id)`
- `anonymous_session_id text`
- `creator_id uuid references creators(creator_id)`
- `creator_code_id uuid references creator_codes(creator_code_id)`
- `referral_event_id uuid references creator_referral_events(referral_event_id)`
- `status attribution_status`
- `attribution_basis text`
- `first_eligible_purchase_event_id uuid`
- `locked_at timestamptz`
- `expires_at timestamptz`
- `corrected_from_attribution_id uuid references creator_attributions(attribution_id)`
- `correction_reason text`
- `created_at timestamptz`

Constraints:

- One active locked attribution per customer.
- Admin correction creates a new row and voids/corrects the prior row; it does not erase history.

### `creator_source_purchase_events`

Purpose: normalized server-side purchase facts derived from Stripe webhooks or admin adjustments.

Key fields:

- `purchase_event_id uuid primary key`
- `provider text`
- `provider_event_id text unique`
- `provider_mode text`
- `event_kind purchase_event_kind`
- `customer_profile_id uuid references profiles(id)`
- `product_id text references products(product_id)`
- `price_id text references prices(price_id)`
- `stripe_checkout_session_id text`
- `stripe_payment_intent_id text`
- `stripe_invoice_id text`
- `stripe_subscription_id text`
- `amount_minor integer`
- `currency text`
- `occurred_at timestamptz`
- `processed_at timestamptz`
- `raw_event_object_path text`
- `idempotency_key text unique`

Constraints:

- Amount and product mapping come from server-side config and Stripe data, not browser input.
- Stripe test mode and live mode must not share product references.

### `creator_commission_ledger`

Purpose: immutable commission accounting.

Key fields:

- `ledger_entry_id uuid primary key`
- `creator_id uuid references creators(creator_id)`
- `attribution_id uuid references creator_attributions(attribution_id)`
- `purchase_event_id uuid references creator_source_purchase_events(purchase_event_id)`
- `commission_type commission_type`
- `status commission_status`
- `amount_minor integer`
- `currency text default 'USD'`
- `hold_until timestamptz`
- `available_at timestamptz`
- `payout_batch_id uuid`
- `reverses_ledger_entry_id uuid references creator_commission_ledger(ledger_entry_id)`
- `reason text`
- `idempotency_key text unique`
- `created_at timestamptz`

Constraints:

- No updates to amount after insert.
- Reversals are separate negative rows.
- One eligible source event can create at most one base commission per creator/type.

### `creator_milestones`

Purpose: milestone tracking and bonus awards.

Key fields:

- `creator_milestone_id uuid primary key`
- `creator_id uuid references creators(creator_id)`
- `milestone_number integer`
- `threshold_count integer`
- `qualified_customer_count integer`
- `bonus_ledger_entry_id uuid references creator_commission_ledger(ledger_entry_id)`
- `awarded_at timestamptz`

Constraints:

- Unique `creator_id, milestone_number`.
- Renewals do not increment qualified new-customer count.

### `creator_stripe_connected_accounts`

Purpose: Stripe Connect account metadata.

Key fields:

- `creator_id uuid references creators(creator_id)`
- `stripe_account_id text unique`
- `connected_account_status connected_account_status`
- `charges_enabled boolean`
- `payouts_enabled boolean`
- `requirements_due_json jsonb`
- `last_event_id text`
- `updated_at timestamptz`

Constraints:

- Browser never writes this table.
- Do not store bank account or identity documents.

### `creator_payout_batches`

Purpose: monthly payout grouping.

Key fields:

- `payout_batch_id uuid primary key`
- `period_start date`
- `period_end date`
- `status payout_batch_status`
- `currency text`
- `gross_amount_minor integer`
- `entry_count integer`
- `prepared_by uuid`
- `approved_by uuid`
- `stripe_transfer_group text`
- `created_at timestamptz`
- `submitted_at timestamptz`

### `creator_payout_items`

Purpose: links a payout batch to exact ledger rows.

Key fields:

- `payout_item_id uuid primary key`
- `payout_batch_id uuid references creator_payout_batches(payout_batch_id)`
- `creator_id uuid references creators(creator_id)`
- `ledger_entry_id uuid references creator_commission_ledger(ledger_entry_id)`
- `amount_minor integer`
- `stripe_transfer_id text`
- `status text`
- `failure_reason text`

Constraints:

- Unique `ledger_entry_id` where active, preventing duplicate payout.

### `creator_program_audit_events`

Purpose: creator-specific append-only audit events when generic `audit_events` is not detailed enough.

Key fields:

- `audit_event_id uuid primary key`
- `actor_profile_id uuid`
- `actor_type text`
- `action text`
- `target_table text`
- `target_id text`
- `reason text`
- `metadata_json jsonb`
- `created_at timestamptz`

## RLS Sketch

- Customers can read only their own attribution summary and purchases.
- Creators can read their own dashboard views, payout statements, codes, onboarding status, and aggregate attribution counts.
- Creators cannot write commission ledger rows, payout batches, payout items, or connected-account status.
- Owner admins can review creators, pause payouts, and submit approved payout batches.
- Trusted server processes can insert webhook events and ledger rows.
- Anonymous users can create referral-touch records only through controlled server endpoints.

## Migration Notes

The existing generic `products`, `prices`, `entitlements`, `receipt_references`, and `audit_events` tables can be reused. Creator-specific tables should reference them rather than duplicating paid-access state.

