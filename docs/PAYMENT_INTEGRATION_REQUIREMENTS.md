# Payment Integration Requirements

## Scope

This document defines what must exist before GameFace Match connects a payment provider.

No live payment credentials, checkout sessions, webhooks, or provider SDKs are part of the current MVP.

## Selected offer to support

Prompt 080 sets the current scan-entry plans. The earlier `$4.99` College Football 27 pack draft is superseded.

Current scan-entry configuration:

- Product: One Scan
- Internal plan identifier: `single_scan`
- Price: `$0.99 USD`
- Purchase type: one completed scan
- Entitlements: one completed game-specific appearance match and build guide, with completion retakes not consuming a second purchase

- Product: Monthly
- Internal plan identifier: `monthly`
- Price: `$1.99/month USD`
- Purchase type: subscription
- Entitlements: repeat scans and screenshot refinements while active

- Checkout state: disabled until provider setup, receipt handling, purchase restoration, refund/support policy, tax approach, and legal review are complete

A future multi-game suite is separate and must not be implied by either scan-entry plan.

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
- Confirmation of final support and refund terms for `single_scan` and `monthly`
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
- Result previews before purchase must not show fake College Football 27 head, hair, facial-hair, menu, or slider values.
- Payment providers must not receive raw face media, landmarks, precise facial measurements, identity data, or sensitive-trait inferences.

## Disabled current state

Current checkout behavior must return provider unavailable. UI controls must clearly state that payment is not connected.
