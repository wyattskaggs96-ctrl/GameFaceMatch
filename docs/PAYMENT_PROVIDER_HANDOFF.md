# Payment Provider Handoff

## Status

No payment provider is selected or connected.

The owner intends to use the payment-processing service already used by Skaggs Systems, but the exact provider and integration details have not been supplied.

## Current architecture can support

- Provider-hosted checkout
- Server-created checkout sessions
- Receipt-reference storage
- Webhook event verification
- Entitlement activation after confirmed payment
- Refund and chargeback status updates
- Test mode versus live mode separation

The current app cannot support live payment entirely in browser code because secret credentials and webhook verification must be server-side.

## One-time versus recurring

Current monetization recommendation:

1. Free beta now
2. Future one-time College Football 27 game pack after verified catalog value exists

Recurring subscriptions or sports passes should wait until multiple games, saved profiles, account/access management, cancellation disclosures, and renewal support are ready.

## Hosted checkout versus embedded checkout

Hosted checkout is preferred for first paid integration because:

- Card/payment details stay with the provider.
- Fewer PCI and security responsibilities land in the app.
- It avoids embedding payment UI inside the camera app.
- It can work cleanly from a dedicated app subdomain.

Embedded checkout should be considered only after reviewing provider requirements, CSP impact, mobile behavior, and privacy/support implications.

## Required server-side responsibilities

- Create checkout sessions with server-only credentials.
- Verify webhook signatures.
- Translate paid/refunded/failed events into entitlements.
- Store receipt references without card data.
- Separate test and live modes.
- Protect secrets outside browser bundles.
- Provide purchase restoration if paid access requires account or receipt lookup.

## Entitlement activation

Payment should activate capabilities, not game data:

- Top-three results
- Detailed build guide
- Screenshot refinement
- Saved profiles
- Multi-game access

No entitlement may expose unverified College Football 27 records.

## Refund handling

Refund events should update receipt and entitlement status. Policy must define whether access is revoked immediately, retained for delivered digital goods, or reviewed by support.

## Failed payment handling

Failed or cancelled payment must leave the user in free access with no fake paid state and no hidden checkout side effects.

## Test versus live mode

Provider test mode must use test products, test prices, test webhooks, and test credentials. Live secrets must never be placed in source control, `.env.example`, client code, issue trackers, chat, or docs.

## Secrets

Use secure provider dashboards, hosting environment-variable dashboards, or local `.env.local` files excluded from git. Never share live secret values in chat.

## Owner information required

- Payment provider name
- Whether Skaggs Systems account can support this product
- Provider dashboard access process
- Test-mode availability
- Product and price IDs or approval to create them later
- Webhook setup requirements
- Refund workflow
- Tax tooling or external tax process
- Support contact to display to customers
