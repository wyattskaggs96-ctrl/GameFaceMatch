# Creator Program Test Plan

**Status:** Draft for future implementation phases  
**Created:** 2026-08-02  

Prompt 090 supersedes the older `single_scan` / `monthly` scan-entry SKUs. Future Creator Program tests should use the approved Launch Pack and All Access product model unless a later owner decision changes it.

The Creator Program must be tested as financial infrastructure, not as ordinary UI state. This plan focuses on preventing duplicate earnings, unauthorized payouts, client-side entitlement spoofing, and payout history mutation.

## Unit Tests

- Creator code normalization and uniqueness.
- Attribution window expiry at 30 days.
- First-eligible-creator locking.
- Manual code override only before first eligible purchase.
- Commission amount mapping:
  - `$1` Launch Pack new purchase.
  - `$2` All Access new subscription.
  - `$1` All Access renewal.
  - `$50` milestone bonus per 50 qualified new paid customers.
- Renewal does not increment milestone customer count.
- 30-day hold calculation.
- Minimum payout threshold `$25`.
- Negative adjustment creation after post-payout reversal.
- Idempotency-key generation.
- No raw face media or precise measurement payloads in payment/creator events.

## Integration Tests

- Checkout creation rejects client-supplied amount changes.
- Webhook signature verification rejects unsigned or tampered payloads.
- Duplicate webhook delivery does not duplicate source purchase events or commissions.
- Refund before hold cancellation.
- Dispute hold.
- Failed payment produces no commission.
- Connected-account update changes onboarding status but does not create earnings.
- Daily release job is replay-safe.
- Milestone job is replay-safe.
- Monthly payout batch excludes already batched ledger rows.
- Payout kill switch prevents transfer submission.

## RLS And Authorization Tests

- Anonymous users cannot read creator payout records.
- Customers cannot read internal creator commission rows beyond their own attribution summary where allowed.
- Creators can read only their own dashboard views and statements.
- Creators cannot insert or update commission ledger rows.
- Creators cannot approve themselves, change payout eligibility, or grant entitlements.
- Primary app customers cannot access connected-account metadata.
- Owner/admin can pause payouts with an audit event.
- Trusted server process can insert Stripe event records.
- Audit events are append-only.

## Stripe Test-Mode Scenarios

- Launch Pack one-time purchase.
- All Access annual subscription purchase.
- All Access renewal invoice.
- Failed card payment.
- Checkout expiration or cancellation.
- Refund.
- Dispute.
- Duplicate webhook replay.
- Connected-account onboarding incomplete.
- Connected account payouts disabled.
- Transfer success.
- Transfer failure.
- Post-payout reversal.

## Regression Tests

- Existing College Football production recommendation fail-closed behavior remains unchanged.
- Existing FC 26 and College Football game adapters do not load creator-program records.
- Launch Pack and All Access pricing remains checkout-disabled unless owner explicitly approves live payment integration.
- Empty production catalog still prevents real recommendations.
- Fixture/test data cannot produce creator commissions.
- Test Stripe products cannot run in live mode.

## Manual QA

- Creator sees a clear onboarding-required state before connected-account setup.
- Creator sees pending, held, available, paid, reversed, and failed amounts with plain-language explanations.
- Admin sees payout review and risk holds before payout submission.
- Customer sees creator code attribution disclosure without fake earnings claims.
- Support staff can locate an attribution/payout event by event ID without seeing raw face media.

## Launch Gate Tests

Before any live creator payout:

- All tests above pass in test mode.
- Reconciliation report ties Stripe events to Supabase source events to ledger rows to payout items.
- Legal/tax/accounting review is documented.
- Owner approval is recorded.
- Kill switch is tested.
- Incident rollback path is tested.
