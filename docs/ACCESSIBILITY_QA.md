# Accessibility QA

Last updated: 2026-07-14

GameFace Match is a responsive web MVP. Browser capture uses guided RGB images only and must not claim TrueDepth, ARKit, depth geometry, or 3D reconstruction. Accessibility work must keep the catalog-unavailable state honest and must not expose invented College Football 27 options.

## Automated Checks

Run from the repository root:

```bash
npm run verify
```

Focused web checks:

```bash
cd web
npm run typecheck
npm run lint
npm run test -- accessibility-hardening.test.ts ui-flow.test.ts capture.test.ts capture-guidance.test.ts
npm run test:e2e
```

Current automated coverage includes:

- Keyboard navigation through the main journey.
- Skip-link focus into the main landmark.
- Focus restoration and focus trapping for confirmation dialogs.
- Angle-specific accessible labels for repeated capture, upload, retake, remove, and current-angle controls.
- Mobile navigation route coverage.
- Reduced-motion Playwright scenario.
- Capture completion, selective retake, and upload fallback.
- Plain-language camera denial, unsupported file, undersized image, duplicate image, and catalog-unavailable paths.
- Unit coverage for the accessibility checklist, core color contrast pairs, user-relative left/right capture instructions, high-contrast CSS hooks, reduced-motion CSS hooks, and user-relative type sizing.

## Completed Web MVP Accessibility Requirements

The current web MVP includes:

- Keyboard-accessible onboarding, consent, capture, profile review, results-unavailable, privacy, saved-build, and screenshot-refinement entry flows.
- Semantic landmarks, headings, progress bars with text values, status regions, alert dialogs, fieldsets, legends, labels, and skip-link support.
- Route-change focus management that moves focus to the current screen's main landmark.
- Accessible modal behavior for destructive confirmations, including initial focus, Tab containment, Escape dismissal, and focus restoration.
- Persistent visible capture instructions, caption-like current-angle instructions, and screen-reader live status for route and capture progress.
- Text-and-icon status treatment for coverage, blocking, advisory, ready, complete, missing, unavailable, and catalog-unavailable states.
- Selective retake support for a single weak angle without restarting all capture work.
- Extended steady-hold timing for users who need more time to settle into a pose.
- Upload fallback for every required RGB angle.
- Mobile-first controls with 48px preferred touch targets for primary actions and practical one-handed bottom navigation.
- Reduced-motion CSS handling and browser E2E coverage.
- High-contrast and forced-colors CSS handling for core controls and status surfaces.
- Dynamic Type-equivalent responsive behavior through rem-based type, browser text-size adjustment, wrapping layouts, and 200 percent zoom manual checks.

## Manual Screen-Reader Checks

Use VoiceOver on iPhone Safari first, then TalkBack on Android Chrome when available.

1. Start on the Welcome screen and confirm the product explanation is announced.
2. Navigate through the independent-app disclaimer, privacy summary, and consent screen using swipe gestures.
3. Confirm each consent checkbox is announced separately and unavailable future consent controls are announced as disabled.
4. Confirm the main route change announces the current screen and capture progress.
5. In guided capture, confirm the current angle, captioned instruction, live guidance status, upload controls, and errors are announced.
6. Trigger camera denial and confirm permission-recovery instructions are understandable.
7. Upload one invalid file and one undersized image and confirm the plain-language error is announced.
8. Complete a five-angle upload fallback and confirm the quality review headings, manual confirmations, and continue button are understandable.
9. Open Privacy Center, delete active session, then delete all local data and confirm the dialog traps focus and announces completion.
10. Confirm repeated controls include context, such as “Retake Left 45 degrees” and “Remove Right profile capture.”

## Manual Keyboard Checks

1. Use Tab and Shift+Tab from Welcome through Results unavailable without a mouse.
2. Use Enter and Space on primary buttons, consent checkboxes, file inputs where supported, retake controls, and deletion dialogs.
3. Use ArrowLeft, ArrowRight, Home, and End in primary and mobile navigation.
4. Confirm visible focus is always present and not hidden behind the mobile navigation.
5. Confirm Escape dismisses confirmation dialogs.
6. Confirm focus returns to the invoking delete button after dismissing or confirming a modal.

## Dynamic Text And Zoom

1. Test browser zoom at 200 percent on desktop.
2. Test large text on iPhone Safari and Android Chrome.
3. Confirm buttons, status badges, upload labels, capture instructions, and Privacy Center inventory wrap instead of clipping.
4. Confirm the bottom mobile navigation does not cover the active control.
5. Confirm headline and instruction text use browser/user text sizing rather than viewport-width font scaling.

## Contrast And Non-Color Status

1. Confirm body text, muted text, navigation text, warning, danger, success, and link colors remain readable.
2. Enable grayscale or color filters and confirm status is still readable from words, headings, list labels, and coverage icons.
3. Confirm blocking, advisory, ready, complete, missing, and unavailable states do not rely on color alone.
4. Enable high-contrast or forced-colors mode where available and confirm borders, focus outlines, and status text remain visible.

## Capture Accessibility

Manual checks should confirm:

- Left and right instructions are user-relative: the user's left and right, not the viewer's.
- Every capture instruction is visible as text, including the captioned current instruction.
- The user can enable extended steady-hold timing.
- Manual upload fallback works for every required angle.
- One failed angle can be retaken without restarting the session.
- The user can continue with documented limitations after blocking file checks are resolved.
- Instructions do not over-block users because of hair, facial hair, makeup, facial differences, mobility limitations, or assistive needs.
- One-handed use is practical for core mobile flows: bottom navigation, full-width mobile buttons, file upload, retake, and privacy deletion.
- Error messages identify the issue and a recovery path without blaming the user.

## Haptic Alternatives

The web MVP does not depend on haptic feedback. Native iOS haptics, if added later, must duplicate existing visible text and spoken/status guidance. No workflow may require vibration or haptic feedback as the only cue.

## Known Manual-Only Areas

These cannot be proven by automated tests alone:

- Real VoiceOver and TalkBack announcement quality.
- Real device Dynamic Type behavior inside Safari and Chrome.
- Outdoor readability and glare.
- One-handed reach on specific devices.
- Physical camera interruption, lock-screen recovery, and permission-reset flows.
- Whether a tester understands left/right guidance without coaching.

## Remaining Limitations

- Automated checks use Chromium and simulated mobile viewports; they do not replace real iPhone Safari or Android Chrome assistive-technology testing.
- The web MVP does not provide audio narration, haptic feedback, or native OS Dynamic Type APIs. It provides visible text, live regions, rem-based scaling, and browser zoom support instead.
- Real-time face guidance depends on local browser support and local landmark-provider availability. Upload fallback and manual confirmations remain the accessible escape path.
- Some camera permission, lock-screen, backgrounding, and low-memory behaviors require HTTPS real-device testing.
- The current app has no verified production catalog, so results accessibility is limited to honest blocked-results and catalog-unavailable states.
