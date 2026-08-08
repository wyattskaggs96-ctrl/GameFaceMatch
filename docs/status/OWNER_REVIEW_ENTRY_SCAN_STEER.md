# Owner Review Entry and Scan Intro Steering

Audit date: 2026-08-07

Prompt labels:

- GFM | Q06 | STEER OWNER REVIEW | Simplify customer entry and scan intro
- GFM | Q06 | STEER OWNER REVIEW | Unify buddy scan into one immersive flow

## Outcome

The owner-review Buddy Trial first impression now starts with a short customer-facing landing page, moves into a compact required-consent screen, and then hands off directly to the existing Prompt 104 guided scan intro. The first-time customer path stays in the black GameFace Match scan experience through preparation, camera positioning, circular scan, and completion.

## Customer Entry

- Landing headline: "Build yourself in College Football 27."
- Primary action: "Start My GameFace"
- Short time cue: "About 2 minutes."
- Trust line: "Private beta - Raw face media is not saved by default"
- Owner Review Demo badge remains visible and compact.
- Delete and privacy details remain available after the first impression, but are not shown on the initial landing screen.

## Consent Handoff

The required acknowledgements are shown only after the user taps "Start My GameFace." No consent checkbox is preselected, and the "Continue" action remains disabled until all required acknowledgements are checked.

Visible first-run consent is grouped into four plain-language acknowledgements while preserving the underlying required consent record:

- Age requirement
- Self or permission confirmation
- Camera use and face analysis for this GameFace
- Temporary scan media and independent companion app acknowledgement

Privacy details are collapsed on the consent screen and include the local delete action without making deletion the first thing a tester sees.

## Scan Intro

The Prompt 104 black guided scan intro remains the scan entry point. The title and body were simplified to:

- "Set Up Your GameFace"
- "Position your face in the frame. Then slowly follow the on-screen guide."

The owner-review Buddy Trial handoff enables "Get Started" only when the local invite session is active, consented, and in a scan-ready state. Production scan gates remain unchanged.

## Unified Scan Flow

For first-time Buddy Trial sessions, completing consent now transitions directly to `/?buddyTrialInvite=...#start`. The redundant post-consent "Ready to scan" page remains available only as a returning-session resume surface.

After "Get Started," Buddy Trial users see an immersive black "Get Ready" state with the five preparation reminders and a "Start Camera" action. The legacy light preparation, lighting, and capability wizard remains available to the normal/internal step flow, but is bypassed by the Buddy Trial customer path.

The circular guided scan remains coverage and quality driven. The Buddy Trial scan surface avoids customer-facing engineering terms such as RGB, TrueDepth, ARKit, 3D reconstruction, production catalog state, and development catalog state.

## Visual Evidence

Screenshots were generated under:

`docs/status/visual-evidence/owner-review-entry-flow-steer/`

Key files:

- `390x844-01-invite.png`
- `390x844-02-consent.png`
- `390x844-04-guided-intro.png`
- `390x844-05-get-ready.png`
- `390x844-06-guided-active.png`
- `430x932-01-invite.png`
- `430x932-02-consent.png`
- `430x932-04-guided-intro.png`
- `430x932-05-get-ready.png`
- `430x932-06-guided-active.png`

The screenshot manifest is:

`docs/status/visual-evidence/owner-review-entry-flow-steer/manifest.json`

## Scope Preserved

This steering pass did not change matching, catalog promotion, owner dashboard behavior, video review, refinement, persistence contracts, payment, production catalog gates, deployment, or verifier workflows.
