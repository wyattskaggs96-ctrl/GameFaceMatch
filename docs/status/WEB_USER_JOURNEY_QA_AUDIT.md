# Web User Journey QA Audit

**Date:** 2026-07-14
**Reviewer role:** Senior product QA lead
**Scope:** Active responsive web MVP only
**Commit baseline reviewed:** `84fb67f docs(phase-zero): record matching engine release review`
**Audit type:** Documentation-only product QA audit; no product behavior changed

## Summary Decision

The web MVP has a coherent onboarding, local RGB capture, quality review, attribute confirmation, profile review, catalog-unavailable results, screenshot-refinement intake, and privacy/deletion shell.

The complete release journey is not private-beta ready for real recommendation evaluation because the verified production College Football 27 catalog is empty, no production top-three recommendations can be shown, and no real participant outcome data exists.

Primary product blocker: **verified production catalog and real study data are absent**.

Primary UX blocker independent of catalog data: **age/self-or-permission confirmation is not implemented as a separate required checkpoint**.

## Classification Legend

- **complete:** Implemented, reachable in the active web MVP, and covered by tests or clear source evidence.
- **incomplete:** Partially represented, but missing a required screen, checkpoint, feedback loop, or release-critical behavior.
- **scaffold:** UI or service structure exists, but the production behavior is intentionally unavailable or not fully wired.
- **broken:** Known implementation prevents the user from completing the intended action.
- **inaccessible:** The flow cannot be reached or operated by normal user interaction.
- **blocked by data:** Code path exists, but verified production catalog data or real study results are required before the user-facing state can appear.

## Screen-by-Screen Audit

| # | Screen or flow | Classification | Evidence reviewed | QA finding |
| --- | --- | --- | --- | --- |
| 1 | Welcome | complete | `web/app/page.tsx`, `web/tests/e2e/core-journey.spec.ts`, `web/tests/ui-flow.test.ts` | Reachable first screen with required product explanation, catalog-unavailable status, RGB-only capture language, and primary walkthrough/catalog actions. |
| 2 | Product explanation | complete | `web/app/page.tsx`, `web/lib/product-copy.ts`, `web/tests/ui-flow.test.ts` | Clearly states closest available in-game settings and no direct face import. |
| 3 | Independent-app disclaimer | complete | `web/app/page.tsx`, `web/lib/product-copy.ts`, `web/tests/ui-flow.test.ts` | Uses independent companion disclaimer and explicitly avoids console control, hidden assets, or official affiliation claims. |
| 4 | Privacy summary | complete | `web/app/page.tsx`, `web/tests/e2e/core-journey.spec.ts`, `web/tests/privacy.test.ts` | Explains local session handling, no upload, no identity recognition, no localStorage raw images, and deletion path. |
| 5 | Consent | complete | `web/features/privacy/ConsentPanel.tsx`, `web/lib/privacy/consent.ts`, `web/tests/privacy.test.ts`, `web/tests/e2e/edge-flows.spec.ts` | Separate consent records exist for camera, current face analysis, temporary processing, save profile, save build, raw images, screenshots, future improvement, future training, and sharing. Required capture consent blocks progression when missing. |
| 6 | Age and permission confirmation | incomplete | `web/lib/privacy/consent.ts`, source-of-truth first-launch flow | No separate required confirmation exists for age eligibility or scanning self/with permission. Existing consent covers camera/current analysis/temporary processing, but not age or subject permission. |
| 7 | Capture preparation | complete | `web/features/capture/CapturePreparation.tsx`, `web/tests/capture.test.ts` | Provides practical checklist for glasses, hats, hair, lighting, expression, one person, distance, orientation, blur, and camera lens. |
| 8 | Lighting check | incomplete | `web/features/capture/CapturePreparation.tsx`, `web/features/capture/GuidedCaptureFlow.tsx`, `web/lib/capture/image-quality-service.ts` | Lighting guidance and estimates exist during capture/review, but there is no distinct pre-capture lighting-check step with pass/fail readiness. |
| 9 | Five-view capture or upload | complete | `web/features/capture/GuidedCaptureFlow.tsx`, `web/lib/capture/capture-session.ts`, `web/tests/capture.test.ts`, `web/tests/e2e/core-journey.spec.ts` | Supports straight-on, left 45, right 45, left profile, and right profile through camera or upload fallback. HEIC/HEIF is honestly unsupported. |
| 10 | Selective retake | complete | `web/features/capture/GuidedCaptureFlow.tsx`, `web/lib/capture/capture-coverage.ts`, `web/tests/capture.test.ts`, `web/tests/e2e/edge-flows.spec.ts` | Retake/remove per angle and coverage-region retake targets exist without restarting the whole capture. |
| 11 | Attribute confirmation | complete | `web/features/attributes/AttributeConfirmation.tsx`, `web/lib/profile/attribute-confirmation.ts`, `web/tests/e2e/core-journey.spec.ts` | User-confirmed attributes are distinct from game options and model estimates; validation gates profile creation. |
| 12 | Processing | scaffold | `web/app/page.tsx`, `web/lib/results/results-experience.ts` | Processing screen is a short transition that states local profile creation and catalog-unavailable status. It does not run production matching because the catalog is empty. |
| 13 | Top-three recommendations | blocked by data | `web/features/results/ResultsExperience.tsx`, `web/lib/results/results-experience.ts`, `web/tests/results.test.ts`, `data/catalog/production/catalog_manifest.json` | Top-three renderer exists and is fixture-tested, but production catalog has 0 items and production results fail closed. |
| 14 | Detailed explanation | blocked by data | `web/features/results/ResultsExperience.tsx`, `web/lib/results/results-experience.ts`, `web/tests/results.test.ts` | Explanation report supports reasons, differences, confidence notes, catalog version, and non-identity language, but no production recommendation can instantiate it yet. |
| 15 | Build guide | blocked by data | `web/lib/results/results-experience.ts`, `web/tests/results.test.ts` | Generic verified instruction format exists, but build steps require verified native values and verified menu paths that do not exist in production. |
| 16 | Save build | blocked by data | `web/features/results/ResultsExperience.tsx`, `web/features/saved-builds/SavedBuildsEmpty.tsx`, `web/lib/privacy/local-privacy-store.ts`, `web/tests/results.test.ts` | Save-build control exists only in top-three result state and requires separate consent. With empty production catalog, users can only see the saved-build empty state. |
| 17 | Share build | scaffold | `web/lib/share/share-card.ts`, `web/features/results/ResultsExperience.tsx`, `web/tests/results.test.ts` | Text-only share-card generation exists and excludes face images by default. Production UI currently presents a preview rather than a complete copy/share/download workflow. |
| 18 | Screenshot refinement | scaffold | `web/features/refinement/ScreenshotRefinementEntry.tsx`, `web/lib/refinement/*`, `web/tests/refinement.test.ts`, `web/tests/e2e/core-journey.spec.ts` | Intake, metadata validation, manual confirmations, local quality/alignment checks, deletion, and unavailable result exist. Real refinement suggestions remain blocked by catalog and validated comparison logic. |
| 19 | Privacy center | complete | `web/features/privacy/PrivacyCenter.tsx`, `web/lib/privacy/data-lifecycle.ts`, `web/tests/privacy.test.ts`, `web/tests/e2e/core-journey.spec.ts` | Shows local inventory, upload status, raw-media retention, no identity recognition, no sale of face data, saved profiles/builds, deletion records, and confirmation dialogs. |
| 20 | Delete scan | complete | `web/app/page.tsx`, `web/features/capture/GuidedCaptureFlow.tsx`, `web/features/privacy/PrivacyCenter.tsx`, `web/tests/capture.test.ts`, `web/tests/privacy.test.ts` | Active capture deletion cancels session, revokes object URLs, clears recovery metadata, resets capture/profile state, and records deletion completion. |
| 21 | Delete profile | complete | `web/app/page.tsx`, `web/features/profile/ProfileReview.tsx`, `web/features/privacy/PrivacyCenter.tsx`, `web/tests/privacy.test.ts` | Derived profile deletion and saved profile deletion exist. Saved profile storage excludes raw images and uses WebCrypto when available. |
| 22 | Error recovery | incomplete | `web/app/page.tsx`, `web/features/capture/GuidedCaptureFlow.tsx`, `web/features/privacy/PrivacyCenter.tsx`, `web/tests/e2e/edge-flows.spec.ts`, `web/tests/offline-recovery.test.ts` | Handles consent blocking, camera denial, upload errors, duplicate/undersized images, offline notices, capture recovery metadata, and catalog-unavailable states. Still lacks a full cross-flow recovery UX for all production errors, especially post-match/refinement failures once real catalog data exists. |

## Gap List and Acceptance Criteria

### QA-GAP-001: Add age and subject-permission checkpoint

**Classification:** incomplete
**Impacted flow:** Age and permission confirmation
**Risk:** The source-of-truth first-launch flow requires age eligibility and confirmation that the user is scanning themselves or has permission. This is not currently implemented as a required web checkpoint.

**Acceptance criteria:**

- Add separate required acknowledgments for age eligibility and scanning self/with permission.
- Do not combine these with camera or face-analysis consent.
- Block capture until both acknowledgments are complete.
- Store only consent state/version/timestamp, not identity documents or age values unless a later legal decision requires them.
- Add unit and E2E tests proving capture is blocked when either acknowledgment is missing.

### QA-GAP-002: Promote lighting guidance into a clear readiness check

**Classification:** incomplete
**Impacted flow:** Lighting check
**Risk:** Users receive lighting guidance and estimates, but there is no distinct, understandable lighting readiness checkpoint before five-view capture.

**Acceptance criteria:**

- Add a lighting-readiness step or panel before image capture that explains front lighting, backlighting, shadows, and blur.
- Provide browser-safe pass/advisory/blocking states using the existing image-quality or live-preview measurements where available.
- Preserve manual continuation with documented limitations for accessibility and browser-support reasons.
- Add tests for dark, overexposed, blurry, and acceptable synthetic image samples.

### QA-GAP-003: Convert processing from transition copy to explicit status model

**Classification:** scaffold
**Impacted flow:** Processing
**Risk:** The processing screen is honest but mostly static. Once real matching is enabled, users need clear stages and recoverable errors.

**Acceptance criteria:**

- Show deterministic processing stages: profile validation, catalog validation, matching eligibility, recommendation generation, and result assembly.
- Surface retryable versus non-retryable failures.
- Keep catalog-unavailable failure language clear and non-blaming.
- Add tests for each processing state.

### QA-GAP-004: Enable production top-three only after verified catalog release

**Classification:** blocked by data
**Impacted flow:** Top-three recommendations
**Risk:** The UI supports top-three display, but production cannot show recommendations until verified records exist.

**Acceptance criteria:**

- Import a nonempty approved production catalog release through the production gate.
- Confirm no fixture or research-candidate record reaches production output.
- Return up to three verified candidates with catalog version, platform, mode, creation path, and model version.
- Add production-catalog integration tests plus empty-catalog regression tests.

### QA-GAP-005: Validate explanation accuracy against real outcomes

**Classification:** blocked by data
**Impacted flow:** Detailed explanation
**Risk:** Explanations are structurally implemented but only validated with synthetic fixtures.

**Acceptance criteria:**

- Compare explanations against verified catalog annotations and real study feedback.
- Verify language never implies identity probability or guaranteed resemblance.
- Validate similarities, differences, uncertainty notes, tie handling, and confidence labels against accepted catalog data.

### QA-GAP-006: Populate build guide from verified menu evidence only

**Classification:** blocked by data
**Impacted flow:** Build guide
**Risk:** Build-guide UI must not show invented labels or paths.

**Acceptance criteria:**

- Every instruction resolves to a verified catalog item and verified menu path.
- Each instruction includes platform, game version, patch where known, mode, creation path, native label/index, and verification date.
- Missing categories are omitted or marked unavailable rather than guessed.
- Add navigation-path validation for production records.

### QA-GAP-007: Complete save-build user feedback once real matches exist

**Classification:** blocked by data
**Impacted flow:** Save build
**Risk:** Save-build mechanics are present behind top-three state, but production users cannot exercise the full success path yet.

**Acceptance criteria:**

- After saving a verified build, show a clear success message and saved-build ID/date.
- Saved builds list should show catalog version, rank, platform, and no-image privacy summary.
- Delete-one and delete-all behavior must remain confirmed and local.
- Add E2E coverage using approved production-like test data that cannot leak into production.

### QA-GAP-008: Turn share preview into a complete safe share action

**Classification:** scaffold
**Impacted flow:** Share build
**Risk:** The current share card is a safe preview, but not a completed user action.

**Acceptance criteria:**

- Add a copy-to-clipboard or browser share action for text-only settings.
- Keep face-image inclusion absent by default and separately opt-in if ever implemented.
- Disable sharing for staging/test-data recommendations.
- Add E2E tests for text-only share output and no raw image/object URL inclusion.

### QA-GAP-009: Keep screenshot refinement scaffold blocked until validated

**Classification:** scaffold
**Impacted flow:** Screenshot refinement
**Risk:** Intake and checks exist, but recommendation-changing refinement is not ready.

**Acceptance criteria:**

- Keep production refinement unavailable until verified catalog records and validated cross-domain comparison behavior exist.
- When enabled, only suggest verified options and explain confidence limitations.
- Add real-device and study-backed validation before claiming refinement usefulness.
- Preserve screenshot deletion by default.

### QA-GAP-010: Expand full-flow error recovery for post-catalog production states

**Classification:** incomplete
**Impacted flow:** Error recovery
**Risk:** Current recovery is strong for pre-catalog MVP errors but incomplete for future real matching/refinement failures.

**Acceptance criteria:**

- Define recoverable states for catalog load failure, incompatible platform/version, insufficient profile evidence, matching engine error, save failure, share failure, and refinement failure.
- Each error must have plain-language cause, next action, and privacy impact.
- Add E2E tests for at least one error in onboarding, capture, profile, results, save, refinement, and deletion.

## Production-Readiness Notes

- Production recommendations remain fail-closed with the empty catalog.
- Research, fixture, staging, and production data separation is outside this screen audit but remains a release gate.
- No screen reviewed in this audit was classified as broken or inaccessible.
- The current journey is suitable for internal capture/privacy/catalog-unavailable dry runs, not for private-beta recommendation-quality evaluation.

## Verification Performed For This Audit

This audit was based on source and test inspection of:

- `web/app/page.tsx`
- `web/lib/navigation.ts`
- `web/features/privacy/ConsentPanel.tsx`
- `web/features/capture/CapturePreparation.tsx`
- `web/features/capture/GuidedCaptureFlow.tsx`
- `web/features/attributes/AttributeConfirmation.tsx`
- `web/features/profile/ProfileReview.tsx`
- `web/features/results/ResultsExperience.tsx`
- `web/features/refinement/ScreenshotRefinementEntry.tsx`
- `web/features/privacy/PrivacyCenter.tsx`
- `web/features/saved-builds/SavedBuildsEmpty.tsx`
- `web/lib/results/results-experience.ts`
- `web/lib/share/share-card.ts`
- `web/tests/e2e/core-journey.spec.ts`
- `web/tests/e2e/edge-flows.spec.ts`
- `web/tests/ui-flow.test.ts`
- `web/tests/privacy.test.ts`
- `web/tests/capture.test.ts`
- `web/tests/refinement.test.ts`

No application source files were changed.
