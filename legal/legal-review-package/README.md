# GameFace Match Legal-Review Package

**Status:** Draft package for licensed counsel review. This package does not provide legal advice and does not claim legal approval.

**Product:** GameFace Match, an independent companion product for EA SPORTS College Football 27.

**Current implementation direction:** Responsive web MVP under `web/`; native iOS foundation preserved for future premium TrueDepth capture.

**Current catalog status:** Production College Football 27 catalog is empty. User-facing production recommendations remain blocked until verified catalog records exist.

## Review Scope

Counsel should review:

- Independent companion positioning and affiliation disclaimers.
- Electronic Arts, EA SPORTS, College Football 27, console, school, NCAA, CLC, and related trademark references.
- Game screenshot and captured game-video evidence use.
- Biometric privacy and face-processing disclosures.
- Child and teen privacy, including parental or guardian involvement.
- Consumer privacy disclosures and deletion rights.
- Website terms and privacy policy drafts.
- Advertising and marketing claims.
- Web, PWA, App Store, and future iOS disclosure requirements.
- Model-training consent and product-improvement consent.
- Account deletion language if accounts or cloud sync are later added.
- Accessibility and paid-feature disclosures.

## Package Contents

- `LEGAL_REVIEW_BRIEF.md` - product summary, risk areas, and counsel questions.
- `DISCLOSURE_MATRIX.md` - required user-facing disclosures by surface.
- `COPY_CLAIMS_AUDIT.md` - current copy audit and prohibited-claim guard results.
- `COUNSEL_REVIEW_CHECKLIST.md` - checklist for licensed counsel.
- Existing draft folders:
  - `../privacy-draft/`
  - `../terms-draft/`
  - `../trademark-review/`

## Non-Negotiable Claim Boundaries

Do not claim perfect match, direct face import, official EA integration, guaranteed resemblance, biometric identification, medical-grade measurement, official endorsement, hidden game-asset access, console automation, or production recommendations from unverified catalog data.

## Current Technical Facts for Review

- Browser capture uses RGB images only, not TrueDepth or ARKit.
- Face processing is local by default and does not identify people.
- Raw face media is temporary by default and is not uploaded by the MVP.
- Saved profiles are derived non-image data only and require explicit consent.
- Model-training participation is unavailable and disabled without separate future consent.
- Cloud backup, accounts, analytics vendors, payments, and external services are not connected.

