# Monetization Decision

## Status

Current implementation decision: Prompt 080 supersedes the earlier `$4.99` draft with two customer-facing scan-entry plans: `single_scan` at `$0.99` and
`monthly` at `$1.99/month`.

No payment provider is selected. No checkout, subscription, live purchase restoration, or refund processing is implemented.

## Current product constraints

- The production College Football 27 catalog is empty.
- The app cannot yet produce verified top-three recommendations.
- Browser capture is RGB only and must not be positioned as TrueDepth-level capture.
- Trust, privacy, deletion controls, and honest limitations are more important than early revenue.
- Refund risk is high until users can see verified recommendations and detailed build instructions.

## Model comparison

| Model | Strengths | Risks | Fit now |
| --- | --- | --- | --- |
| One Scan | Simple low-friction purchase for one completed game-specific appearance match | Requires provider receipts, catalog proof, and retake policy enforcement | Current selected entry plan |
| Monthly | Supports repeat scans and screenshot refinements while active | Requires subscription management, cancellation, restoration, and support policy | Current selected alternate plan |
| Paid screenshot refinement | Strong differentiator when it works | High refund risk until comparison logic is real | Not ready |
| Multi-game sports pass | Handles annual sports releases and future adapters | Requires multiple verified catalogs and account/access management | Later |
| Creator package | Useful for content creators and friend challenges | Requires share templates, consent flows, and support process | Later |

## Recommendation

Use the Prompt 080 mobile entry screen to present the approved scan plans while checkout remains fail-closed until real payment and entitlement verification exist.

Current selected plans:

- Product: One Scan
- Internal plan identifier: `single_scan`
- Price: `$0.99 USD`
- Purchase type: one completed scan
- Entitlement rule: retakes required to successfully complete the same purchased scan must not consume an additional purchase

- Product: Monthly
- Internal plan identifier: `monthly`
- Price: `$1.99/month USD`
- Purchase type: subscription
- Entitlement rule: repeat scans and screenshot refinements while the subscription is active

Checkout remains disabled until a payment provider, secure checkout flow, receipt handling, purchase restoration, support policy, refund policy, tax approach, and legal review are complete.

## Rationale

- No verified catalog means the product cannot honestly sell recommendations yet.
- One Scan keeps the first purchase small and tied to one completed game-specific appearance match.
- Monthly access supports repeat scans and screenshot refinements only after subscription verification exists.
- The product should demonstrate value before charging because the experience involves face images.
- Refund risk is lower after users see verified catalog coverage and the app can explain exactly what is included.

## Privacy requirements for paid launch

- Face images are not sold.
- Face data is not used for biometric advertising.
- Payment providers must not receive raw face media, landmarks, precise facial measurements, or unencrypted profile content.
- Result previews before purchase may show capture readiness and catalog availability, but must not show fake College Football 27 settings.
- One Scan and Monthly must be clearly distinguished from a future multi-game suite.
- No misleading trial copy, fake urgency, fake customer quotes, or fake purchase state may be displayed.

## Superseded paths

The earlier `$4.99` one-game pack language is superseded by Prompt 080. Do not start with a separate paid screenshot-refinement SKU, multi-game pass, or creator
package. Those require more product proof, support policy, and legal review.
