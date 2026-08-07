# Buddy Trial V1 Product Contract

**Status:** AUTHORITATIVE PRIVATE-BETA V1 CONTRACT
**Prompt:** `GFM | Q05 | PROMPT 106 | PHASE 00 | Define buddy trial V1 contract`
**Date:** 2026-08-07
**Repository baseline:** `main` at Prompt 105 human-verifier usability checkpoint
**Active client:** responsive web MVP under `web/`
**Initial game:** EA SPORTS College Football 27, Road to Glory player creation

This contract defines the private-beta V1 North Star for GameFace Match. It does not publish a production catalog, create second-verifier decisions, enable payment, deploy Supabase, or claim real buddy acceptance.

## 1. North Star

A person who knows nothing about GameFace Match can:

1. Receive a texted website link.
2. Open it on an iPhone.
3. Complete the existing Face ID-style guided scan.
4. Receive exact verified College Football 27 appearance settings.
5. Follow those settings in the game.
6. Upload or record a video of the resulting character.
7. Receive evidence-based refinement recommendations.
8. Apply them.
9. Upload a second result.
10. Receive a measurable before/after comparison.
11. Rate whether the result looks like them.
12. Finish without owner assistance.

## 2. Binding Product Rules

- The web scan may emulate the interaction pattern of iPhone Face ID, but it must not claim Apple Face ID, TrueDepth enrollment, biometric authentication, identity verification, or depth capture.
- Raw human face media remains deleted by default.
- The basic buddy trial must not require an account.
- No payment is required for this private beta.
- The app must never invent College Football 27 controls, labels, indices, menu paths, sliders, presets, hairstyles, facial-hair options, or version/platform facts.
- A preset, slider, color, menu path, or numeric value may be customer-visible only when it comes from a verified production catalog record.
- Fixture data may test the path, but it must be visibly and technically separated from production data.
- Buddy acceptance is a real-user outcome, not a code-test result.

## 3. Current Repository Audit

### 3.1 Already Implemented Or Reusable

| Requirement | Existing support | Evidence |
| --- | --- | --- |
| Mobile web app shell | Implemented locally. | `web/app/page.tsx`, `web/lib/navigation.ts` |
| Face ID-style setup and guided scan | Implemented as browser RGB capture with honest limitations. | `web/features/onboarding/ScanEntryScreen.tsx`, `web/features/capture/GuidedCaptureFlow.tsx`, `docs/status/GAMEFACE_SETUP_REFERENCE_IMPLEMENTATION.md` |
| Camera permission and unavailable-camera states | Implemented through existing camera service and capture flow. | `web/lib/capture/browser-camera-service.ts`, capture tests |
| Capture quality and guided pose coverage | Implemented for local RGB/landmark-driven coverage. | `web/lib/capture/capture-guidance-service.ts`, `web/lib/capture/guided-live-coverage.ts` |
| Derived standardized profile | Implemented locally after capture and attribute confirmation. | `web/lib/profile/standard-face-profile.ts`, `web/features/profile/ProfileReview.tsx` |
| Matching engine | Implemented, but fails closed without verified production catalog records. | `web/lib/matching/matching-engine.ts` |
| Build-instruction contract | Implemented for verified catalog records only. | `web/lib/results/results-experience.ts` |
| Screenshot intake/refinement scaffold | Implemented for image screenshots; blocks without verified catalog matches. | `web/features/refinement/ScreenshotRefinementEntry.tsx`, `web/lib/refinement/refinement-engine.ts` |
| Build-match score contract | Implemented with default pass threshold of 90. | `web/lib/feedback/self-improving-feedback-loop.ts` |
| Local deletion/privacy inventory | Implemented for local session data. | `web/lib/privacy/data-lifecycle.ts`, `web/features/privacy/PrivacyCenter.tsx` |
| Supported-subset verifier workflow | Implemented for a real human verifier; no decisions imported yet. | `http://localhost:3000/verifier`, `docs/verification/HUMAN_VERIFIER_QUICK_START.md` |

### 3.2 Missing Or Blocked

| Requirement | Current state | Blocking dependency |
| --- | --- | --- |
| Texted public/private-beta website link | Not deployed. Local dev only. | HTTPS deployment, domain/subdomain, support/legal copy approval. |
| Exact verified CF27 settings | Blocked. Production catalog contains 0 records. | Real verifier package, Prompt 103 import/reconciliation, catalog-manager approval, immutable production release. |
| Customer top-three recommendations | Blocked by empty production catalog. | Nonempty verified CF27 production catalog and recommendation gate. |
| Character video upload/recording | Not implemented as video; screenshot intake exists. | Video capture/upload contract, local frame extraction, quality checks, deletion behavior. |
| Before/after comparison | Domain pieces exist but no end-to-end buddy trial UI. | First and second result sessions, comparison state, score/report rendering. |
| User resemblance rating | Study/feedback contracts exist; customer flow needs UI. | Buddy trial feedback screen and local/session persistence. |
| Buddy session persistence across link-open to finish | Canonical private-beta persistence contract and browser-local test adapter exist; production Supabase schema is defined but not active. | Server-mediated Supabase runtime activation, concrete RLS policies, deployed credentials, and deletion endpoints. |
| Real buddy acceptance | 0 real participants. | Buddy trial execution after production catalog subset exists. |

## 4. Customer-Visible States

Every Buddy Trial V1 implementation must expose these states in order. States may be skipped only when the gate is already satisfied and the skip is invisible to the user.

| State ID | Customer state | Acceptance criteria | Existing support |
| --- | --- | --- | --- |
| `INVITE_OPENED` | User opens the texted link. | HTTPS link loads on iPhone Safari without requiring an account or payment. Product promise and disclaimer are visible before face data. | Missing deployment; local shell exists. |
| `TRIAL_INTRO` | User sees GameFace Match purpose. | Copy says the app recommends in-game appearance settings and does not import a face or identify the user. | Partially present in scan entry/product copy. |
| `CONSENT_READY` | User completes required consent. | Age, permission to scan, camera use, current-session face analysis, and temporary processing are separate and unselected by default. | Present. |
| `PREP_READY` | User receives preparation guidance. | Remove glasses/headwear, hair away from face, soft light, phone at eye level, neutral expression. | Present. |
| `CAMERA_PERMISSION` | Browser requests camera permission. | Permission is requested only after user action. Denial shows fallback/recovery. | Present. |
| `POSITIONING` | User positions face in frame. | Progress cannot begin until one centered face and basic quality gates pass. | Present. |
| `GUIDED_SCAN_ACTIVE` | User completes circular guided scan. | Coverage advances only from accepted pose/quality sectors, not elapsed time. | Present. |
| `ASSISTED_CAPTURE` | User chooses alternate pose-by-pose capture. | Accessible alternative feeds same capture/review contract where practical. | Present. |
| `CAPTURE_REVIEW` | User reviews or retakes capture sections. | Failed sections can be retaken; raw media remains temporary. | Present. |
| `PROFILE_CONFIRMATION` | User confirms standardized appearance attributes. | User can correct hair, facial hair, skin presentation, body preference, and related non-game profile fields. | Present. |
| `CATALOG_GATE` | App checks verified CF27 catalog availability. | If production catalog is empty, the app blocks settings and explains it is a catalog issue. | Present. |
| `TOP_THREE_SETTINGS` | User receives top-three exact CF27 settings. | Exactly three or fewer verified production recommendations are shown, each tied to game/version/platform/mode/path/catalog version/confidence/limitations. | Blocked until production catalog exists. |
| `BUILD_GUIDE` | User follows step-by-step game instructions. | Every visible setting has verified native label/value and verified menu path evidence. No unsupported category appears as a recommendation. | Contract present, blocked by empty catalog. |
| `RESULT_CAPTURE_1` | User uploads or records created-character result. | The first result accepts supported media, checks resolution, obstruction, lighting, blur, and required view coverage. Raw media is not persisted by default. | Screenshot intake present; video not implemented. |
| `REFINEMENT_1` | User receives score and evidence-based changes. | Score is 0-100, labeled as build match, not identity probability. Actions reference only verified controls or verified alternate recommendations. | Domain present, blocked by catalog and missing video flow. |
| `RESULT_CAPTURE_2` | User uploads or records revised result. | Same validation as first result; links to the same buddy session and iteration number. | Missing end-to-end UI/session. |
| `BEFORE_AFTER` | User sees measurable improvement comparison. | Shows first score, second score, delta, key differences, limitations, and whether score reached the configured 90 threshold. | Missing end-to-end UI/session. |
| `USER_RATING` | User rates whether the result looks like them. | Collects rating, optional notes, final selected settings, and consent choice for product-improvement use. | Domain/study contracts exist; customer UI missing. |
| `PRIVACY_CLOSEOUT` | User can delete local data or finish. | User can delete raw/session media and exported local data; no account is required. | Local privacy center present; buddy closeout not unified. |

## 5. Required Buddy Session Data Model

The implementation must use a typed session model equivalent to:

```ts
type BuddyTrialStage =
  | "INVITE_OPENED"
  | "TRIAL_INTRO"
  | "CONSENT_READY"
  | "PREP_READY"
  | "CAMERA_PERMISSION"
  | "POSITIONING"
  | "GUIDED_SCAN_ACTIVE"
  | "ASSISTED_CAPTURE"
  | "CAPTURE_REVIEW"
  | "PROFILE_CONFIRMATION"
  | "CATALOG_GATE"
  | "TOP_THREE_SETTINGS"
  | "BUILD_GUIDE"
  | "RESULT_CAPTURE_1"
  | "REFINEMENT_1"
  | "RESULT_CAPTURE_2"
  | "BEFORE_AFTER"
  | "USER_RATING"
  | "PRIVACY_CLOSEOUT";

interface BuddyTrialSessionV1 {
  schemaVersion: "buddy-trial-session-v1";
  sessionID: string;
  inviteID: string | null;
  createdAt: string;
  updatedAt: string;
  stage: BuddyTrialStage;
  stageHistory: Array<{ stage: BuddyTrialStage; enteredAt: string; completedAt: string | null }>;
  gameID: "college-football-27";
  mode: "Road to Glory";
  accountRequired: false;
  paymentRequired: false;
  consent: {
    consentVersion: string;
    ageEligibility: boolean;
    subjectPermission: boolean;
    cameraUse: boolean;
    currentFaceAnalysis: boolean;
    temporaryProcessing: boolean;
    productImprovementOptIn: boolean;
  };
  device: {
    userAgent: string;
    viewportWidth: number;
    viewportHeight: number;
    cameraPermissionState: "unknown" | "granted" | "denied" | "unavailable";
    browserCaptureMode: "web_rgb_guided" | "assisted_pose_by_pose" | "upload_fallback";
  };
  capture: {
    captureSessionID: string | null;
    requiredViewsComplete: boolean;
    qualityWarnings: string[];
    rawMediaStored: false;
  };
  profile: {
    profileID: string | null;
    profileVersion: string | null;
    derivedProfileAvailable: boolean;
    rawLandmarksStored: false;
    exactMeasurementsStoredForGlobalLearning: false;
  };
  catalogGate: {
    catalogVersionID: string | null;
    productionCatalogRecordCount: number;
    verifiedSettingsAvailable: boolean;
    blockedReason: string | null;
  };
  recommendations: {
    matcherModelVersion: string | null;
    recommendationCount: number;
    topThree: string[];
    confidenceWarnings: string[];
  };
  buildGuide: {
    instructionCount: number;
    allInstructionsVerified: boolean;
    gameVersion: string | null;
    platform: string | null;
    creationPath: string | null;
  };
  resultIterations: BuddyResultIterationV1[];
  feedback: {
    userResemblanceRating: 1 | 2 | 3 | 4 | 5 | null;
    userWouldUseAgain: boolean | null;
    notes: string | null;
    finalSettingsConfirmed: boolean;
  };
  privacy: {
    deleteRawMediaRequested: boolean;
    deleteRawMediaCompleted: boolean;
    deleteSessionRequested: boolean;
    productImprovementConsentVersion: string | null;
    globalLearningQueued: boolean;
  };
}

interface BuddyResultIterationV1 {
  iteration: 1 | 2;
  uploadedAt: string | null;
  mediaKind: "screenshot" | "video";
  viewCoverage: Array<"front" | "left45" | "right45" | "leftProfile" | "rightProfile">;
  qualityStatus: "not_started" | "blocked" | "usable" | "usable_with_notes";
  qualityWarnings: string[];
  buildMatchScore: number | null;
  scoreLabel: "Build-match score based on local appearance-geometry comparison, not identity probability.";
  recommendedRefinementIDs: string[];
  limitations: string[];
}
```

Prompt 110 implements this as a typed private-beta persistence contract in `web/lib/buddy-trial/buddy-trial-persistence.ts`, with a browser-local test adapter for automated and local trial flows. The local Supabase schema contains private-beta trial session and audit-event tables with RLS enabled and raw-media constraints, but the live Supabase adapter remains fail-closed until production credentials, concrete policies, and server-mediated invite/deletion endpoints are activated.

Persisted private-beta trial records may include pseudonymous trial IDs, consent versions, state history, derived-profile summaries, capture-quality metadata, recommendation/catalog versions, selected verified settings, refinement summaries, user ratings, and privacy-safe audit events. They must not include raw face photos, raw face video, raw landmark payloads, object URLs, base64 media, or game-character videos beyond temporary processing unless the tester separately opts into retention.

## 6. Stage Dependencies

| Stage group | Verified CF27 catalog | Server persistence | Camera access | Character-video processing | Refinement calibration | Human feedback |
| --- | --- | --- | --- | --- | --- | --- |
| Invite and intro | No | Required for real texted hosted links; local dev can omit. | No | No | No | No |
| Consent and preparation | No | No for basic trial. | No until permission step. | No | No | No |
| Guided scan/profile | No | No for basic trial. | Yes unless upload fallback. | No | No | User confirmation of attributes. |
| Top-three settings | Yes | No for local-only private beta; recommended for multi-device resume. | No | No | No | Optional user correction. |
| Build guide | Yes | No | No | No | No | User follows in game. |
| Result upload/video | Yes for comparison actions. | No by default; temporary local media only. | Optional if recording in browser. | Yes for video V1; screenshots already scaffolded. | Yes | User confirms media quality facts. |
| Refinement recommendations | Yes | No | No | Yes if video input. | Yes | User may select/apply change. |
| Before/after | Yes | No | No | Yes | Yes | User rating required. |
| Product improvement | Yes | Optional and consent-gated. | No | No raw media by default. | Yes, human-approved only. | Explicit opt-in. |

## 7. Acceptance Criteria

### 7.1 Build Implementation Readiness

Buddy Trial V1 implementation is build-ready when:

- A single iPhone-friendly private-beta URL can enter the trial without owner explanation.
- The current Face ID-style scan is reachable from that URL.
- The user can complete capture/profile confirmation.
- The app can either produce verified CF27 settings or show an honest catalog-blocked state.
- The result media intake supports the required V1 media type.
- The before/after score UI can render deterministic fixture results without production claims.
- The session model records each stage and can resume safely in the selected persistence layer.
- Raw media is deleted by default and deletion is visible to the user.

### 7.2 Real Catalog Readiness

Buddy Trial V1 is real-catalog ready when:

- CF27 has a nonempty immutable production catalog release.
- Every customer-visible setting resolves to a verified production record.
- Every recommendation has game/version/platform/mode/path traceability.
- The top-three matcher returns only production records and never fixtures or research rows.
- Build instructions validate with verified native labels and menu paths.
- Screenshot/video refinement actions reference only verified controls or verified alternate recommendations.

### 7.3 Real Buddy Acceptance

Buddy Trial V1 is buddy-accepted when at least one nontechnical tester can:

- Open the texted link on an iPhone.
- Complete the scan without owner help.
- Receive verified settings.
- Build the character in CF27.
- Submit first and second result media.
- See a before/after comparison.
- Submit a resemblance rating.
- Finish or delete local/session data.

This is not satisfied by automated tests alone.

## 8. Deterministic E2E Fixtures

Fixtures may test the full journey only under explicit test/staging mode. They must live under `data/fixtures/test-only/` or equivalent test-only paths and must never be loaded as production catalog data.

Required fixture set:

| Fixture | Purpose | Required guard |
| --- | --- | --- |
| `buddy-trial-profile-v1` | Deterministic derived profile after guided scan. | Marked synthetic; no raw face media. |
| `buddy-trial-cf27-catalog-v1` | Three verified-looking test records for top-three UI. | `sourceType: test-fixture`; blocked in production. |
| `buddy-trial-build-guide-v1` | Step-by-step instructions tied to fixture catalog IDs. | Test-only catalog version. |
| `buddy-trial-result-iteration-1-v1` | Synthetic first created-character media analysis. | No personal images. |
| `buddy-trial-result-iteration-2-v1` | Synthetic second result for before/after delta. | No personal images. |
| `buddy-trial-feedback-v1` | Synthetic rating/notes. | Cannot count as real buddy acceptance. |

E2E tests may assert navigation, gating, scoring labels, deletion, and fixture isolation. They must also assert that production mode with an empty catalog cannot display the fixture settings.

## 9. Gap Map For Next Implementation

| Gap | Smallest next implementation step |
| --- | --- |
| No canonical buddy session state | Add `BuddyTrialSessionV1` domain module and local persistence adapter. |
| No single buddy-trial route | Add a private-beta route or hash path that enters the existing scan flow and records session stages. |
| Result upload is screenshot-only | Decide whether V1 accepts video, screenshots, or both; if video is required, add local video validation/extraction without raw retention. |
| No before/after UI | Add result iteration comparison view using `calculateBuildMatchScore` semantics. |
| No user rating UI | Add final rating/notes/consent closeout state. |
| No fixture journey | Add test-only Buddy Trial E2E fixtures with production-block assertions. |
| Empty production catalog | Complete human verification, import/reconcile decisions, catalog-manager approval, and production release before real settings are shown. |
| No hosted link | Deploy private-beta HTTPS environment after legal/privacy/support and catalog gates are ready. |

## 10. Recommended Next Prompt

`GFM | Q05 | PROMPT 107 | PHASE 01 | Build buddy trial session shell and test-only E2E fixtures`

Prompt 107 should build the session model, route/state shell, and deterministic fixture path while preserving the production catalog gate. It must not show fixture settings as production and must not wait on live catalog verification to make the software path testable.
