# Legal Review Brief

**Status:** Draft for licensed counsel. Not legal advice. Not approved for launch until reviewed by counsel and the owner.

## Product Positioning

GameFace Match is positioned as an independent companion product that helps users manually reproduce the closest available verified in-game appearance settings for EA SPORTS College Football 27. It does not import a face into the game, control a console, modify game files, use hidden assets, or claim affiliation with Electronic Arts or EA SPORTS.

Recommended positioning for review:

> GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27.

Required affiliation concept for review:

> GameFace Match is an independent companion application and is not affiliated with, endorsed by, or sponsored by Electronic Arts, EA SPORTS, CLC, the NCAA, any college or university, Sony, Microsoft, or Nintendo. All referenced trademarks belong to their respective owners.

## Trademark and Brand Review

Counsel should review:

- Product naming next to College Football 27 references.
- Whether `College Football 27`, `EA SPORTS`, `Electronic Arts`, console names, school names, NCAA, and CLC references are nominative fair use or require revision.
- Whether disclaimers are sufficiently prominent in the web app, marketing site, pricing, support pages, App Store listing if any, and social posts.
- Whether visual design avoids official-looking branding, trade dress, school marks, league marks, or console platform endorsement.

## Game Screenshot and Evidence Use

The repository contains research workflows for game screen recordings and derivative evidence used to audit option labels, menu paths, ordering, and visual catalog candidates. These are not public production assets by default.

Counsel should review:

- Whether game screenshots may be displayed publicly in the product, marketing site, support docs, or social content.
- Whether research-only screenshots can remain in private internal tooling.
- Whether derivative frames, crops, thumbnails, or contact sheets require additional restrictions.
- Whether evidence masters must stay outside the public repository or public bundle.
- Whether screenshot-refinement uploads by users require extra terms and consent.

## Biometric and Face-Data Privacy

Current technical behavior:

- Browser MVP uses guided RGB images only.
- Face processing is local in the browser where supported.
- The app does not identify people or create identity embeddings.
- Raw face images are temporary by default.
- Derived profiles are local-only by default.
- Model-training use is disabled unless a separate future consent and implementation are approved.

Counsel should determine:

- Whether the derived `StandardFaceProfile`, landmarks, measurements, or normalized ratios are regulated biometric data in target jurisdictions.
- Whether written consent, retention schedules, data-subject rights, or special notices are required.
- Whether Illinois BIPA, Texas CUBI, Washington biometric law, state consumer privacy laws, COPPA, and other applicable rules create launch constraints.
- Whether minors may use the product and what parent or guardian process is required.

## Child and Teen Privacy

The product may appeal to high school and college athletes and younger sports-game players. Counsel should review age gates, parent or guardian consent, school-affiliation risks, and whether the product should prohibit use by children under a specified age.

Open decisions for counsel and owner:

- Minimum age for independent use.
- Parent or guardian consent mechanism.
- Whether scanning another person requires affirmative permission language.
- Whether beta testing can include minors.
- Support handling for deletion requests from parents or guardians.

## Consumer Privacy and Terms

Counsel should review or draft:

- Privacy policy.
- Terms of use.
- Consent language.
- Data retention and deletion disclosures.
- Support contact and response process.
- User-generated image/screenshot handling.
- Account deletion terms if accounts are later added.
- Jurisdiction, dispute, limitation of liability, refund, and paid-feature language.

## Advertising Claims

Current copy must stay in closest-available, manually reproducible, catalog-dependent language. Do not claim perfect match, direct face import, official EA integration, guaranteed resemblance, biometric identification, medical-grade measurement, or production results while the verified catalog is empty.

Counsel should review:

- Landing-page headlines.
- App onboarding.
- Social media copy.
- Video scripts.
- Creator package language.
- Pricing pages.
- Support and refund pages.

## App Store and Web Disclosures

Counsel should review:

- Browser camera permission wording.
- Face-data and biometric privacy disclosures.
- PWA installability language.
- Future iOS App Store privacy nutrition labels.
- Future App Tracking Transparency implications if analytics or advertising ever exists.
- Platform trademark and endorsement disclaimers.
- Paid digital-feature disclosures.

## Paid Feature Disclosures

Payments are not connected. If paid features are later launched, counsel should review:

- Product description and delivery timing.
- Refund policy.
- Subscription disclosures if subscriptions are selected.
- Cancellation process.
- Sales tax responsibilities.
- Minor purchases.
- Failed payment handling.
- Chargebacks.
- Restoration of purchases.
- Catalog-unavailable limitations before charging.

## Counsel Questions

1. What exact affiliation and trademark disclaimer should appear in-app, on the marketing site, in social posts, and in any app listing?
2. Can public marketing use the College Football 27 name, screenshots, or menu screenshots, and under what limits?
3. Which face-profile fields are biometric identifiers under target jurisdictions?
4. What consent language is required before local face processing?
5. What age gate or parent/guardian consent process is required?
6. What retention and deletion commitments should be made in the privacy policy?
7. Can the product save derived profiles locally without an account, and what disclosures are required?
8. What language is required before any future cloud backup, analytics provider, or model-training participation?
9. What terms are required before paid screenshot refinement or game packs?
10. What accessibility statement or support process should be published?

