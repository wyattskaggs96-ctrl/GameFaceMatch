# GameFace Setup Reference Implementation

Audit date: 2026-08-06

Prompt: `GFM | Q04 | PROMPT 104 | PHASE 01 | Rebuild setup as Face ID flow`

## Reference Recording

Requested reference path:

`/mnt/data/ScreenRecording_08-05-2026 21-12-30_1.MP4`

Repository-accessible inspected copy:

`/Users/skaggssystems/Downloads/ScreenRecording_08-05-2026 21-12-30_1.MP4`

The requested `/mnt/data` path was not mounted in this local Codex environment. An exact filename match was available in the owner Downloads folder and was used for inspection.

Inspected metadata:

- Container: MP4
- Duration: 20.943333 seconds
- Video tracks: 1
- Display dimensions: 1320 x 2868
- Frame rate: 59.78036 fps
- Inspection tooling: local Swift/AVFoundation because `ffprobe` and `ffmpeg` were not installed locally

## Observed Screen Sequence

1. Introduction screen: full black background, top-left back control, large centered segmented circular indicator, centered face glyph, short centered title/body copy, bottom blue `Get Started` action.
2. Positioning screen: black background, live camera inside a large rounded-square crop, corner brackets, centered instruction, bottom `Start Over` action.
3. Active circular scan: rounded-square frame transitions to a circular camera crop with segmented radial progress, neutral segments turning green as movement coverage is accepted, centered instruction, `Accessibility Options`, and `Start Over`.
4. Completion transition: green completion outline and check treatment.
5. Completion screen: compact success visual, centered completion copy, bottom blue done action.

## Implemented Behavior

The customer setup and capture route now uses a black, iPhone-first, immersive shell for `#start` and `#capture`. The normal web app chrome, mobile nav, topbar, and step rail are hidden during those states.

Implemented customer states:

- Setup introduction
- Face positioning
- Scan at 0% accepted coverage
- Scan with partial accepted coverage
- Scan near completion
- Scan completed
- Camera denied
- Multiple-face or invalid framing
- Reduced Motion
- Accessibility stepwise mode

The flow remains an honest browser RGB capture flow. It does not claim Face ID, TrueDepth, authentication, identity verification, official game integration, or biometric identification.

## Deliberate GameFace Match Wording Changes

Reference-style behavior was preserved while public copy was changed to product-accurate GameFace Match language:

- `Set Up Your GameFace Scan`
- `First, position your face in the camera frame. Then slowly move your head in a circle so we can capture the angles needed for your closest in-game match.`
- `Position your face within the frame.`
- `Move your head slowly to complete the circle.`
- `First GameFace scan complete.`

The implementation uses `GameFace Match`, the approved brand line `From reality to game face.`, and an independent companion app disclaimer. It does not use Apple feature names or Apple-owned artwork.

## Trademark And Copyright-Safe Differences

- The face glyph is an original in-repository SVG.
- The segmented rings and scan treatment are CSS/React implementations, not copied assets.
- Copy avoids Apple authentication terminology.
- Copy avoids EA, NCAA, publisher, school, console, or official-integration claims.
- The camera screen uses GameFace Match privacy and capture language.

## Coverage And Progress

The circular ring is visualized as small radial ticks, grouped over the existing eight supported pose sectors:

- Center
- Upper-left
- Left
- Lower-left
- Lower-center
- Lower-right
- Right
- Upper-right

Progress is driven by the existing guided live coverage contract:

- A frame must pass local face, pose, blur, exposure, and duplicate-angle checks.
- Duplicate angles do not advance coverage.
- Rejected frames do not advance coverage.
- Elapsed time alone cannot complete the scan.
- Development screenshot states use a guarded visual-test query parameter. The production path disables that parameter unless a build is intentionally created with `NEXT_PUBLIC_GFM_SETUP_VISUAL_TESTS=1`.

## Accessibility Behavior

- The intro and capture screens use semantic headings.
- Progress state has screen-reader labels per coverage sector.
- Camera, close, restart, details, and accessibility actions are reachable controls.
- Reduced Motion removes decorative animations while keeping the same visual hierarchy.
- `Accessibility Options` routes to the assisted five-angle fallback, which feeds the existing capture/review contract.
- Instructions are text-based and do not depend only on color.

## Privacy Behavior

- The entry screen does not open the camera.
- Camera starts only from the capture screen via the existing camera service.
- Existing stream cleanup is preserved for cancellation, restart, page hide, route changes, and component unmount.
- Raw face media remains temporary session data by default.
- Local visual screenshot states use placeholder graphics and do not contain user face media.
- Diagnostics and analytics must not include raw face media or precise biometric measurements.

## Unsupported Hardware Limitations

- The web implementation uses RGB browser camera guidance.
- It is not TrueDepth.
- It does not create a depth model.
- It does not authenticate or identify a person.
- Head-pose guidance depends on available MediaPipe/local landmark signals and browser camera quality.
- When reliable signals are unavailable, the capture remains blocked or routes to assisted capture rather than faking completion.

## Visual Comparison Checklist

| Reference element | Result | Notes |
| --- | --- | --- |
| Top control position | MATCHED | Compact top-left close/back control is positioned in the safe area. |
| Ring size | MATCHED | Intro ring and scan circle are large in the upper half of the portrait screen. |
| Ring centering | MATCHED | Mobile and desktop screenshots keep the scan visual centered in an iPhone-like surface. |
| Ring segment spacing | MATCHED | Intro uses 64 ticks; scan uses repeated visual ticks grouped over real coverage sectors. |
| Center glyph scale | MATCHED | Original GameFace glyph sits centered within the intro ring. |
| Title position | MATCHED | Intro and capture titles are centered below the visual. |
| Body-copy width | MATCHED | Copy is short and constrained to the mobile column. |
| Bottom-button width | MATCHED | Primary actions are full-width rounded buttons near the bottom. |
| Bottom-button location | MATCHED | Actions remain below the instruction block with safe-area padding. |
| Rounded-square camera frame | MATCHED | Positioning state uses a large rounded-square frame with corner brackets. |
| Circular crop | MATCHED | Scan and completion states use circular visualization. |
| Progress color behavior | MATCHED | Incomplete sectors are neutral; accepted sectors turn green. |
| Instruction placement | MATCHED | One main instruction appears below the scan visual. |
| Secondary actions | MATCHED | Active scan has `Accessibility Options` and `Start Over`; intro keeps details collapsed. |
| Completion-state composition | MATCHED | Completion uses a green success visual, short title, short supporting copy, and bottom action. |
| Transition sequence | INTENTIONALLY_ADAPTED | CSS state transitions are implemented; screenshot capture records stable deterministic states rather than video. |
| Camera imagery | INTENTIONALLY_ADAPTED | Screenshots use local placeholders so no real user face media is committed. Runtime uses the live camera when granted. |
| Permission request timing | INTENTIONALLY_ADAPTED | Camera request remains on the capture screen through the existing permission flow rather than the pricing/consent entry screen. |
| Billing/catalog gates | INTENTIONALLY_ADAPTED | Entry remains fail-closed and can show a subdued gate message when consent, billing, or catalog prerequisites are not satisfied. |
| Mobile safe areas | MATCHED | Layout uses dynamic viewport height and safe-area padding. |

## Routes And Components Changed

- `web/app/page.tsx`: routes `#start` and `#capture` through an immersive shell and preserves the existing preparation route.
- `web/components/AppShell.tsx`: adds immersive mode to hide app chrome during setup/capture.
- `web/features/onboarding/ScanEntryScreen.tsx`: replaces the prior card-like entry with a quiet black setup introduction.
- `web/features/capture/GuidedCaptureFlow.tsx`: replaces the active customer capture surface with rounded-square positioning, circular scan, segmented progress, completion state, and development-only visual-state hooks.
- `web/lib/capture/gameface-setup-state-machine.ts`: records the explicit setup state-machine contract.
- `scripts/capture-gameface-setup-reference-screenshots.mjs`: captures deterministic visual evidence.

## Screenshots Produced

Visual evidence root:

`docs/status/visual-evidence/prompt104/`

Screenshot manifest:

`docs/status/visual-evidence/prompt104/manifest.json`

States captured at `390x844`, `430x932`, and `1440x900`:

- Setup introduction
- Face positioning
- Scan at 0% coverage
- Scan at partial coverage
- Scan near completion
- Scan completed
- Camera denied
- Multiple faces or invalid framing
- Reduced Motion
- Accessibility stepwise mode

## Validation Results

Latest focused results before full verification:

- `npm --prefix web run typecheck`: passed
- `npm --prefix web run test -- scan-entry.test.ts guided-live-coverage.test.ts gameface-setup-state-machine.test.ts`: 20 tests passed
- `npm run gameface:setup-reference:screenshots`: captured 30 screenshots

Full validation results are recorded in the Prompt 104 completion report.

## Remaining Visual Differences

- The public flow uses GameFace Match naming and an original glyph rather than any Apple feature name or icon.
- The web camera implementation cannot reproduce TrueDepth depth capture; it uses local RGB guidance and MediaPipe/landmark-derived pose checks.
- The introduction preserves fail-closed consent and catalog/payment boundaries, so the primary button may be disabled until the existing gates are satisfied.
- The active scan uses grouped visual ticks over the existing eight supported pose sectors instead of a proprietary depth-coverage algorithm.
