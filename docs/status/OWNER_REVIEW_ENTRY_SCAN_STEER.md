# Owner Review Entry and Scan Intro Steering

Audit date: 2026-08-07

Prompt label: GFM | Q06 | STEER OWNER REVIEW | Simplify customer entry and scan intro

## Outcome

The owner-review Buddy Trial first impression now starts with a short customer-facing landing page, moves into a compact required-consent screen, and then hands off to the existing Prompt 104 guided scan intro. The change is intentionally limited to the customer entry and scan-intro presentation.

## Customer Entry

- Landing headline: "Build yourself in College Football 27."
- Primary action: "Start My GameFace"
- Short time cue: "About 2 minutes."
- Trust line: "Private beta - Raw face media is not saved by default"
- Owner Review Demo badge remains visible and compact.
- Delete and privacy details remain available after the first impression, but are not shown on the initial landing screen.

## Consent Handoff

The required acknowledgements are shown only after the user taps "Start My GameFace." No consent checkbox is preselected, and the "Continue" action remains disabled until all required acknowledgements and the independent companion acknowledgement are checked.

Privacy details are collapsed on the consent screen and include the local delete action without making deletion the first thing a tester sees.

## Scan Intro

The Prompt 104 black guided scan intro remains the scan entry point. The title and body were simplified to:

- "Set Up Your GameFace"
- "Position your face in the frame. Then slowly follow the on-screen guide."

The owner-review Buddy Trial handoff enables "Get Started" only when the local invite session is active, consented, and in a scan-ready state. Production scan gates remain unchanged.

## Visual Evidence

Screenshots were generated under:

`docs/status/visual-evidence/owner-review-entry-flow-steer/`

Key files:

- `390x844-01-invite.png`
- `390x844-02-consent.png`
- `390x844-04-guided-intro.png`
- `430x932-01-invite.png`
- `430x932-02-consent.png`
- `430x932-04-guided-intro.png`

The screenshot manifest is:

`docs/status/visual-evidence/owner-review-entry-flow-steer/manifest.json`

## Scope Preserved

This steering pass did not change matching, catalog promotion, owner dashboard behavior, video review, refinement, persistence contracts, payment, production catalog gates, or verifier workflows.
