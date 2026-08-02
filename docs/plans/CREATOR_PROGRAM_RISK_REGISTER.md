# Creator Program Risk Register

**Status:** Phase 01 risk register  
**Created:** 2026-08-02  

| Risk | Severity | Why it matters | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Reintroducing superseded scan-entry pricing | Medium | Prompt 090 supersedes `$0.99` and `$1.99/month`; stale docs or branches could accidentally revive old SKUs. | Keep active pricing tests on `launch_pack` and `all_access_annual`; treat old SKUs as historical only. | Engineering |
| Unauthorized commission creation | Critical | Client-side purchase or attribution events could create false earnings. | Server-only purchase verification, Stripe webhooks, idempotency, RLS, no client ledger writes. | Engineering |
| Duplicate webhook delivery duplicates earnings | Critical | Webhooks can be retried. | Unique Stripe event IDs and ledger idempotency keys. | Engineering |
| Historical ledger mutation | Critical | Editing paid history breaks auditability. | Append-only ledger; reversal rows for corrections. | Engineering |
| Refund/dispute after payout | High | Creator may already have been paid on reversed customer payment. | Negative adjustment rows and future payout offset policy. | Wyatt + Engineering |
| Tax and labor-classification uncertainty | High | Creator payouts can create tax, contractor, and reporting obligations. | Legal/accounting review before live payouts. | Wyatt + External counsel/accounting |
| Stripe Connect configuration mismatch | High | Current Stripe account setup affects fees, onboarding, tax reporting, and transfer capability. | Use current Stripe docs and test-mode certification; owner dashboard setup outside code. | Wyatt + Engineering |
| RLS misconfiguration leaks earnings or internal notes | High | Creator/customer privacy and financial data could be exposed. | RLS tests for every role; private server routes for sensitive reads. | Engineering |
| Accountless flow conflicts with persistent attribution | Medium | Core product says basic matching must not require account; payout attribution benefits from customer identity. | Anonymous pending attribution with account binding only when needed for purchase. | Product |
| Creator fraud or self-dealing | High | Fake purchases or refund abuse could create losses. | Holds, risk flags, dispute handling, milestone review, admin pause. | Wyatt + Engineering |
| Payout transfer failure | Medium | Creators need clear state and retry path. | Failed payout statuses, retry workflow, statement visibility. | Engineering |
| Live payout accidentally enabled | Critical | Real money could move before certification. | Environment gate, kill switch, test-mode default, owner approval record. | Engineering + Wyatt |
| Payment provider receives face data | High | Violates privacy commitments. | Keep payment events limited to product/customer/payment metadata; tests against sensitive payload fields. | Engineering |
| Creator dashboard overstates earnings | Medium | Pending/held/available/paid confusion creates support risk. | Clear statuses and statement reconciliation. | Product |
| Milestone double award | High | Scheduled job replay could duplicate `$50` bonuses. | Unique `creator_id, milestone_number`; idempotent job. | Engineering |
| External legal approval missing | High | Terms, tax, privacy, and creator agreement must be reviewed. | Block production launch until counsel/accounting review. | Wyatt |

## Current Risk Decision

Implementation should not proceed to live payments or payouts. Phase 02 may safely add schema, contracts, and tests if it keeps all payment and payout behavior disabled by default.
