# Private Beta Readiness

Status: Not ready for a real private beta that evaluates College Football 27 recommendations.

This review covers the active web MVP. The native iOS project remains preserved under `ios/` for a future premium TrueDepth capture path.

## Summary Verdict

GameFace Match is ready for local internal dry-runs of the web journey, privacy controls, upload fallback, and catalog-unavailable behavior. It is not ready for a tester beta that promises real recommendations, top-three matching, build-guide correctness, or repeatability against College Football 27 because:

- The production College Football 27 catalog contains zero verified records.
- Real recommendation output and build instructions are intentionally fail-closed while the catalog is empty.
- The MediaPipe runtime and reviewed local `face_landmarker.task` model asset are present, but real-device scan completion still requires physical iPhone Safari and Android Chrome verification.
- Real-device mobile camera behavior has not been completed across the required iPhone Safari and Android Chrome matrix.
- Repeatability gates have synthetic coverage only; real tester repeatability has not been measured.

## Readiness Review

| Area | Current status | Readiness |
| --- | --- | --- |
| Guided capture completion | Five required RGB angles, upload fallback, retake, cancellation, and review flow exist. | Ready with limitations |
| Real landmark processing | Provider interface, MediaPipe integration, WASM runtime assets, and reviewed local model asset are present. Physical-device scan completion and timing still require verification. | Ready for controlled real-device QA |
| Measurement repeatability | RGB landmark geometry pipeline and synthetic regression tests exist. Real-device repeated-capture data does not. | Not ready |
| Verified catalog completeness | Production catalog is valid but empty. | Not ready |
| Top-three matching | Rule-based engine exists and adapter fails closed with empty production catalog. | Not ready for production results |
| Build-guide correctness | Build-instruction format exists and only uses verified navigation instructions. No verified instructions are loaded. | Not ready |
| Data deletion | Active-session, object URL, saved build, screenshot, and delete-all flows exist with tests. | Ready with manual device verification |
| Privacy wording | Local-only, no-upload, no-identity-recognition, RGB-only, and independent-app messaging exists. | Ready with legal review pending |
| Accessibility | Semantic UI, focus states, screen-reader announcements, reduced-motion support, and E2E checks exist. | Ready with manual assistive-tech review |
| Mobile browser behavior | Secure-context guidance, lifecycle handling, camera cleanup, HEIC unsupported state, and mobile QA docs exist. | Ready for controlled local QA only |
| Security | No backend, no external upload, CSP and fixture guards exist. Dependency audit has a known moderate advisory inherited through Next.js/PostCSS. | Ready with dependency monitoring |
| Performance | Image downscaling and lazy model loading structure exist. Real-device processing budgets are not measured. | Not ready |
| Browser compatibility | Playwright mobile viewport checks exist; real Safari/Chrome device matrix is pending. | Not ready |
| Error recovery | Camera denial, upload fallback, unsupported image, duplicate image, retake, delete, and catalog-unavailable states exist. | Ready with limitations |
| Saved builds | Non-image saved build architecture exists. Real verified result saving cannot be exercised while catalog is empty. | Partially ready |
| Catalog versioning | Manifest version, validation, checksum, fixture exclusion, and match traceability exist. Empty production catalog is valid. | Ready for empty-catalog state |
| No-fixture production guarantees | Production guards, tests, and bundle checks exist to exclude synthetic fixtures. | Ready, continue enforcing |

## Measurable Beta Gates

These gates must be met before inviting testers to judge real GameFace Match recommendations.

| Gate | Required beta threshold | Current status |
| --- | --- | --- |
| Capture completion | At least 90% of testers complete all five required angles without staff intervention. | Not measured on real devices |
| Quality pass | At least 85% of completed sessions pass blocking quality checks with no more than one retake per angle. | Not measured on real devices |
| Repeatability | Three captures by the same tester should keep core normalized geometry within documented tolerances and preserve at least two of the top-three recommendations when the catalog is available. | Synthetic only |
| Top-one acceptance | At least 55% of testers rate the top result 4 or 5 on the resemblance rubric. | Blocked by empty catalog |
| Top-three usefulness | At least 75% of testers rate at least one top-three result 4 or 5. | Blocked by empty catalog |
| Crash-free sessions | At least 95% of tester sessions complete without uncaught app errors or browser tab recovery. | Not measured in field |
| Deletion success | 100% of delete-all attempts remove active session data, saved builds, screenshot session data, and profile data from local storage. | Automated checks exist; manual device check pending |
| Processing time | p75 under 10 seconds and p95 under 20 seconds from final accepted image to results state on supported phones. | Not measured with real model |
| Catalog-error rate | Under 1% runtime catalog validation or compatibility failures for a published verified catalog. | No verified catalog loaded |

## Beta Scope Allowed Today

Allowed:

- Internal local walkthroughs of welcome, consent, capture, upload fallback, quality review, attribute confirmation, profile review, privacy center, deletion, saved-build empty state, and catalog-unavailable result.
- Synthetic automated tests and local QA using generated geometric images.
- Manual mobile QA that does not promise recommendations.

Not allowed yet:

- Inviting testers to evaluate College Football 27 recommendation quality.
- Showing real top-three production results.
- Publishing build instructions.
- Claiming TrueDepth, depth geometry, ARKit, 3D reconstruction, identity recognition, or advanced facial analysis.
- Saving or uploading raw face images by default.

## Operations Runbook

Private-beta operations are prepared in `docs/PRIVATE_BETA_RUNBOOK.md`. That runbook covers eligibility, consent, onboarding, supported devices, bug reports, catalog-error reporting, privacy and deletion support, incident escalation, feedback forms, resemblance ratings, screenshot-refinement feedback, beta metrics, rollback, and closeout.

The runbook is not permission to invite testers. It is a pre-launch operating plan that becomes usable only after the readiness gates in this document pass and Wyatt explicitly approves a go decision.

## Required Fixes Before Private Beta

1. Complete real-device mobile QA for current iPhone Safari and Android Chrome using HTTPS, including local landmark initialization and scan completion.
2. Import only evidence-backed, two-reviewer verified College Football 27 catalog records.
3. Re-run catalog validation and confirm nonzero verified records are available for the intended platform, game version, mode, and creation path.
4. Run repeatability tests with real beta capture sessions while deleting raw image media by default.
5. Confirm top-three output, build instructions, and saved builds retain exact catalog version, patch, platform, mode, and creation path.
6. Complete privacy/legal review of tester consent, privacy wording, support path, and deletion claims.

## Final Readiness Label

Not ready.

The repository is safe to continue from, but the next phase should close the real-device QA and verified-catalog blockers before calling this a private beta.
