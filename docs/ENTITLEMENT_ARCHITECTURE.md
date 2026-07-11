# Entitlement Architecture

## Goal

Prepare access control for future monetization without blocking the current local MVP flow.

The basic match flow must continue to work without an account.

## Entitlement types

- Basic free match
- Top-three results
- Detailed build guide
- Screenshot refinement
- Saved profiles
- Multi-game access

## Current defaults

`basicFreeMatch` is included by default.

All paid or premium capabilities remain unavailable until:

1. Verified production catalog records exist.
2. The owner selects a payment provider.
3. Legal and support policies are approved.
4. Checkout, receipts, webhooks, and refund handling are implemented.

## Boundary rules

- Capture, profile generation, storage, catalog validation, and matching must not depend directly on a payment provider.
- Game adapters must not contain checkout logic.
- Payment providers must not receive raw face images.
- Entitlements must reference capabilities, not invented game options.
- No paid claim may imply verified recommendations while the production catalog is empty.

## Future flow

1. User completes local capture and profile review.
2. App determines catalog and feature availability.
3. Entitlement service checks access for the requested capability.
4. If access is missing and payment is connected, app may offer provider-hosted checkout.
5. Receipt or webhook updates entitlement state.
6. Refund, chargeback, expiration, or cancellation may revoke access.

## Current implementation

The web MVP includes provider-independent TypeScript types, a `PaymentProvider` interface, an unavailable provider scaffold, pricing validation, and local entitlement defaults. It does not enforce a paywall.
