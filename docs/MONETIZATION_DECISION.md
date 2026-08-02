# Monetization Decision

## Status

Current approved implementation decision: Prompt 090 replaces the older Prompt 080 scan-entry pricing with two disabled, fail-closed customer offers:

- `launch_pack` at `$4.99 USD`
- `all_access_annual` at `$9.99/year USD`

No payment provider is selected. No checkout, subscription, live purchase restoration, refund processing, creator attribution, creator commission, or payout behavior is implemented.

## Current Product Constraints

- The production catalog is empty for every launch game.
- The app cannot yet produce verified top-three recommendations.
- Browser capture is RGB only and must not be positioned as TrueDepth-level capture.
- Trust, privacy, deletion controls, and honest limitations are more important than early revenue.
- Refund risk is high until users can see verified recommendations and detailed build instructions.

## Active Offers

| Offer | Internal ID | Price | Billing model | Current state |
| --- | --- | ---: | --- | --- |
| Launch Pack | `launch_pack` | `$4.99` | One-time | Planned and checkout-disabled |
| All Access | `all_access_annual` | `$9.99/year` | Annual subscription | Planned and checkout-disabled |

Launch Pack is intended to cover the five original launch games only after each game has production-supported catalog records:

1. EA SPORTS College Football 27
2. NBA 2K26
3. Madden NFL 26
4. EA SPORTS PGA TOUR
5. PBA Pro Bowling 2026

All Access is intended to cover currently supported and subsequently supported games only while the subscription is active.

## Recommendation

The app may display Launch Pack and All Access as planned or unavailable offers while checkout remains fail-closed. A selected plan is not proof of payment, cannot grant an entitlement, and cannot bypass catalog verification.

Checkout remains disabled until a payment provider, secure checkout flow, receipt handling, purchase restoration, support policy, refund policy, tax approach, server-authoritative entitlement verification, and legal review are complete.

## Privacy Requirements For Paid Launch

- Face images are not sold.
- Face data is not used for biometric advertising.
- Payment providers must not receive raw face media, landmarks, precise facial measurements, or unencrypted profile content.
- Result previews before purchase may show capture readiness and catalog availability, but must not show fake game settings.
- No misleading trial copy, fake urgency, fake customer quotes, or fake purchase state may be displayed.

## Superseded Historical Paths

The older Prompt 080 `single_scan` `$0.99` and `monthly` `$1.99/month` scan-entry pricing is superseded for active customer-facing configuration. Keep references only as historical audit context.
