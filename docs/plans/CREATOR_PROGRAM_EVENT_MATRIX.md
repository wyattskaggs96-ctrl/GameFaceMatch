# Creator Program Event Matrix

**Status:** Draft for Phase 02/03 implementation  
**Created:** 2026-08-02  

This matrix defines the event flow that must be implemented before creator earnings can be trusted. Automated processes may create pending or available ledger rows, but they must not grant production catalog approval or bypass product-quality gates.

| Event | Source | Required identifiers | Internal action | Idempotency key | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| Creator link viewed | Server route | Creator code/link, anonymous session, timestamp | Create `creator_referral_events` row with 30-day expiry. | `referral:{session}:{creator}:{dateBucket}` | If code invalid, record no attribution and show normal app. |
| Manual creator code entered | Server route | Code, anonymous session or customer ID | Validate active approved creator; create/update pending attribution only before first eligible purchase. | `manual-code:{sessionOrCustomer}:{code}` | Do not override locked attribution except through admin correction. |
| Checkout session created | Server route | Customer/session, product, price, creator attribution candidate | Create Stripe Checkout session from server-side product config. | `checkout:{customerOrSession}:{product}:{nonce}` | Do not create commission; checkout creation alone is not a sale. |
| Launch Pack purchase completed | Stripe webhook | Stripe event ID, checkout session/payment intent, customer, product/price | Record source purchase event; lock attribution if eligible; create `$1` pending commission. | Stripe event ID plus purchase event type | Duplicate webhook returns success after confirming prior processing. |
| New All Access subscription completed | Stripe webhook | Stripe event ID, subscription/invoice, customer, product/price | Record source event; lock attribution if eligible; create `$2` pending commission. | Stripe event ID plus subscription period | If subscription is unpaid/incomplete, do not create commission. |
| All Access renewal paid | Stripe webhook | Stripe invoice ID, subscription ID, period dates | Create `$1` renewal commission for locked creator. | `renewal:{invoiceId}` | Renewal does not increment new-customer milestone count. |
| Refund before hold clears | Stripe webhook | Refund/charge/payment intent/invoice | Cancel or hold pending related ledger row. | `refund:{refundId}` | If no matching ledger row exists, create exception for admin review. |
| Dispute opened | Stripe webhook | Dispute/charge/payment intent | Hold related pending or available ledger rows; create issue. | `dispute:{disputeId}` | Do not pay held rows. |
| Fraud signal or account problem | Stripe webhook/admin | Customer/payment/subscription/creator ID | Hold related creator/customer ledger rows. | `risk:{source}:{id}` | Requires admin disposition before payout. |
| Connected account updated | Stripe webhook | Stripe account ID, requirements, payouts enabled | Update connected-account status. | `account-updated:{eventId}` | Creator dashboard shows onboarding/action required. |
| Daily commission release | Scheduled job | Ledger entries with expired hold | Move eligible `pending_hold` rows to `available`. | `release:{yyyy-mm-dd}` plus row ID | Job replay must not duplicate rows. |
| Milestone calculation | Scheduled job | Creator qualified new-customer count | Create `$50` bonus row for each newly reached multiple of 50. | `milestone:{creator}:{milestoneNumber}` | Unique constraint prevents duplicate award. |
| Monthly payout batch prepared | Scheduled job/admin | Available ledger rows before cutoff, creator eligibility | Create draft payout batch and items. | `payout-batch:{period}:{currency}` | Rows already in a batch are excluded. |
| Payout batch approved | Owner/admin | Batch ID, approver, reason | Mark ready for Stripe transfer submission. | `batch-approval:{batchId}:{approver}` | Approval blocked if kill switch enabled or reconciliation fails. |
| Stripe transfer submitted | Trusted server process | Batch/item IDs, connected account, amount | Create Stripe transfer in test/live mode as gated; store transfer ID. | `transfer:{payoutItemId}` | Failed transfer remains retryable and visible. |
| Payout or transfer failed | Stripe webhook | Transfer/payout ID | Mark item/batch failed or partially failed. | Stripe event ID | Do not mark as paid. |
| Post-payout reversal | Stripe webhook/admin | Original ledger entry and source event | Create negative adjustment row. | `reversal:{sourceEvent}:{originalLedger}` | Never edit original historical row. |
| Admin attribution correction | Owner/admin | Old attribution, new creator, reason | Void/correct old attribution and create new audit-linked attribution. | `attribution-correction:{old}:{new}:{timestamp}` | Does not silently rewrite ledger; adjustment review required. |

## Webhook Rules

- Verify signatures before parsing business logic.
- Use raw request body for Stripe signature verification.
- Store and uniquely constrain Stripe event IDs.
- Acknowledge webhooks only after durable recording or an intentional queue handoff.
- All money amounts must come from Stripe and server-side product config.
- Browser-supplied creator codes may start attribution but cannot create commission entries.

## Scheduled Job Rules

- Daily release, milestone, and payout-preparation jobs must be idempotent.
- Jobs must tolerate retry, overlap, and partial failure.
- Jobs must record summary audit events.
- A server-side kill switch must pause commission release or payout submission.

