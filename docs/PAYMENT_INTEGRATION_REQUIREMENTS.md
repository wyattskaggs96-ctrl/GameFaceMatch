# Payment Integration Requirements

## Scope

This document defines what must exist before GameFace Match connects a payment provider.

No live payment credentials, checkout sessions, webhooks, or provider SDKs are part of the current MVP.

## Provider selection

Do not select Stripe, Squarespace Commerce, PayPal, Square, App Store IAP, or any other provider without owner input.

Provider evaluation must cover:

- Supported countries and currencies
- Digital goods terms
- Tax collection and reporting support
- Refund and chargeback workflows
- Hosted checkout availability
- Receipt and purchase-restoration model
- Webhook signing
- Test-mode separation from live mode
- Data-processing terms
- Support for minors or parental consent where relevant

## Required owner information

- Legal business name
- Business address and country
- Support email address
- Privacy contact email
- Refund policy decision
- Terms of purchase approval
- Tax collection decision
- Target launch countries
- Product names and exact prices
- Whether purchases are one-time, subscription, or beta-only
- Whether accounts are required for paid access
- Provider preference or constraints

## Technical requirements before integration

- Provider-independent `PaymentProvider` interface remains the app boundary.
- Client code must not contain live secret keys.
- Checkout creation must happen through a trusted server or provider-hosted flow, not directly with client secrets.
- Webhooks must verify provider signatures.
- Receipts must store provider references, not raw payment card data.
- Entitlements must be derived from verified receipts or provider events.
- Production and test-mode credentials must be separated.
- Purchase restoration must be defined before paid launch.
- Refund and chargeback status must revoke or adjust entitlements when required.

## Disabled current state

Current checkout behavior must return provider unavailable. UI controls must clearly state that payment is not connected.
