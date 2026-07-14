# Monetization Decision

## Status

Current implementation decision: free beta remains the validation phase, and the first paid offer is modeled as a low-cost one-time College Football 27 game pack after verified catalog and beta gates pass.

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
| Free basic match | Builds trust, lowers friction, supports validation, respects no-account rule | No direct revenue | Best current fit |
| One-time College Football 27 game pack | Simple future purchase tied to one annual game | Requires verified catalog and clear refund policy | Good after catalog proof |
| Paid screenshot refinement | Strong differentiator when it works | High refund risk until comparison logic is real | Not ready |
| Multi-game sports pass | Handles annual sports releases and future adapters | Requires multiple verified catalogs and account/access management | Later |
| Creator package | Useful for content creators and friend challenges | Requires share templates, consent flows, and support process | Later |
| Free beta before payment | Demonstrates value before charging, reduces privacy concern, supports product learning | Delays revenue | Recommended |

## Recommendation

Use the first public web MVP as a free beta until verified recommendations can be evaluated.

After the production College Football 27 catalog is verified and beta testers confirm useful recommendations, introduce a simple one-time College Football 27 game pack. The current draft offer is:

- Product: College Football 27 one-game pack
- Price: $4.99 USD
- Purchase type: one-time one-game purchase
- Included after production gates pass: verified top-three College Football 27 results, detailed build guides using verified menu paths, catalog/platform/mode/path traceability, and screenshot-refinement intake when verified refinement logic is available

Checkout remains disabled until a payment provider, secure checkout flow, receipt handling, purchase restoration, support policy, refund policy, tax approach, and legal review are complete.

## Rationale

- No verified catalog means the product cannot honestly sell recommendations yet.
- Free beta lets users evaluate capture, privacy, and catalog limitations before paying.
- A one-time game pack is easier to understand than a subscription for an annual sports game.
- A transparent low-cost one-game purchase is easier to support than a broad multi-game promise while only one game is being cataloged.
- The product should demonstrate value before charging because the experience involves face images.
- Refund risk is lower after users see verified catalog coverage and the app can explain exactly what is included.

## Privacy requirements for paid launch

- Face images are not sold.
- Face data is not used for biometric advertising.
- Payment providers must not receive raw face media, landmarks, precise facial measurements, or unencrypted profile content.
- Result previews before purchase may show capture readiness and catalog availability, but must not show fake College Football 27 settings.
- The College Football 27 one-game purchase must be clearly distinguished from a future multi-game suite.
- No trial period, recurring renewal, fake urgency, fake customer quotes, or fake purchase state may be displayed.

## Superseded paths

Do not start with a paid screenshot-refinement SKU, multi-game pass, subscription, or creator package. Those require more product proof, support policy, and legal review.
