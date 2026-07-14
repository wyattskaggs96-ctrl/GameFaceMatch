# Private Beta Operations Runbook

Status: Draft operations plan. Do not invite or contact testers automatically.

This runbook prepares GameFace Match private-beta operations for the active web MVP. It does not change the current readiness decision in `docs/PRIVATE_BETA_READINESS.md`: the product is not ready for a real recommendation-quality beta until the verified College Football 27 catalog, real-device QA, local model asset review, and privacy/legal gates are complete.

GameFace Match must continue to say:

> GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27.

When the production catalog is empty, the expected result remains:

> Verified College Football 27 catalog not loaded.

## 1. Beta Go/No-Go Rule

Private beta may not begin until Wyatt explicitly approves a go decision after these gates pass:

| Gate | Required state before inviting testers |
| --- | --- |
| Catalog | Nonzero College Football 27 production records are verified, versioned, catalog-manager approved, and production-gate clean. |
| Recommendations | Top-three results and build guides use only verified catalog records and retain catalog version, platform, patch, mode, and creation path. |
| Capture | Five-angle web RGB capture and upload fallback pass real-device testing on supported devices. |
| Landmark/profile | Local model asset is reviewed, checksummed, documented, and loaded without upload or identity recognition. |
| Privacy | Consent, local storage, raw-media deletion, saved-profile deletion, saved-build deletion, screenshot deletion, and delete-all pass manual device QA. |
| Legal/support | Tester consent, privacy wording, independent-app disclaimer, support path, incident path, and minor policy are approved by the owner and counsel where needed. |
| Metrics | Privacy-safe local analytics and performance dashboards are verified. No external analytics provider is connected without approval. |
| Rollback | Release rollback, catalog rollback, support communications, and incident escalation are rehearsed. |

Allowed before go:

- Internal dry-runs of onboarding, capture, upload fallback, catalog-unavailable state, privacy center, deletion, saved-build empty state, screenshot-refinement intake, and development-only dashboards.
- Console/catalog audit work and second-verifier preparation.
- Local QA with generated or synthetic test assets.

Not allowed before go:

- Inviting testers to evaluate real College Football 27 recommendation quality.
- Publishing a public beta URL.
- Connecting analytics, payments, accounts, cloud storage, email automation, or external AI services.
- Collecting raw face media through issue trackers, chat, email, or forms.

## 2. Beta Eligibility

Tester eligibility should be narrow for the first private beta.

Required:

- Age 18 or older, unless Wyatt has an owner-approved guardian-consent process.
- Uses GameFace Match only for themselves or for a person who has explicitly agreed to be tested.
- Has access to a supported mobile browser and can test from the approved HTTPS origin.
- Understands that the web MVP uses RGB images only, not TrueDepth, ARKit, depth geometry, or 3D reconstruction.
- Understands that the app is independent and not affiliated with EA, EA SPORTS, CLC, the NCAA, schools, conferences, Sony, Microsoft, or Nintendo.
- Agrees not to send face photos, screenshots with faces, or raw videos through unapproved channels.
- Can complete the feedback form without including sensitive traits, identity information, or raw biometric media.

Preferred for the first 10-20 testers:

- Mix of iPhone Safari and Android Chrome users.
- At least two desktop-browser smoke testers.
- At least one keyboard-only or assistive-technology reviewer, if available and consented.
- Testers comfortable giving structured ratings instead of casual "looks good" feedback.

Exclude:

- Minors without a completed guardian process.
- Anyone testing someone else without that person's consent.
- Anyone expecting the app to transfer a face into the game, operate as an EA-connected product, or promise a certain likeness outcome.
- Anyone unwilling to delete local data after testing when asked.

## 3. Tester Consent Packet

Use `docs/TESTER_CONSENT_DRAFT.md` as the base consent language. Before beta begins, owner/legal review must confirm final text for:

- Independent-app status.
- Browser camera or upload use.
- Local RGB processing.
- No identity recognition.
- No sensitive-trait inference.
- Temporary raw-media handling.
- Separate consent for saving derived profiles.
- Separate consent for saving completed builds.
- Screenshot-refinement consent.
- Product-improvement and model-training participation disabled unless separately implemented.
- Withdrawal and local deletion.
- Minor/guardian policy.

Consent must be separate from browser camera permission. Browser permission allows camera access; app consent explains intended use.

Tester record fields:

- Tester ID or nickname.
- Consent version.
- Consent date/time.
- Device and browser.
- Whether screenshot-refinement consent was granted, if applicable.
- Whether optional saved-profile or saved-build consent was granted.
- Deletion confirmation after test completion.

Do not record:

- Full legal name unless owner/legal specifically requires it.
- Email in the same file as face-related feedback unless a secure process is approved.
- Raw face images.
- Facial measurements.
- Landmark coordinates.
- Sensitive traits.

## 4. Onboarding Instructions

Send testers only after go approval:

1. Open the approved beta URL from the supported browser.
2. Read the product explanation.
3. Read the independent-app disclaimer.
4. Read the privacy summary.
5. Complete separate consent acknowledgments.
6. Prepare capture:
   - Remove glasses where practical.
   - Remove hats and headwear.
   - Pull hair away from cheeks and ears where practical.
   - Use even front lighting.
   - Avoid backlighting.
   - Keep neutral expression with lips gently closed.
   - Keep one person centered.
   - Clean the camera lens.
7. Complete five required RGB views:
   - Straight-on.
   - Left 45 degrees.
   - Right 45 degrees.
   - Left profile.
   - Right profile.
8. Use upload fallback if camera permission is denied, camera is unavailable, or the browser is unsupported.
9. Complete attribute confirmation.
10. Review result state.
11. If verified recommendations are enabled, rate top-one and top-three usefulness using `docs/RESEMBLANCE_RATING_RUBRIC.md`.
12. Test Privacy Center deletion.
13. Submit feedback without attaching raw face media.

If the catalog is unavailable, testers should confirm whether the blocked state is clear and not rate resemblance.

## 5. Supported Device List

Beta support tiers:

| Tier | Device/browser | Required use |
| --- | --- | --- |
| Primary | Current iPhone Safari | Full capture, upload fallback, privacy deletion, permission reset, lock/background recovery, safe-area layout. |
| Primary | Older supported iPhone size | Small-screen layout, touch targets, keyboard behavior, upload fallback, deletion. |
| Primary | Current Android Chrome | Full capture, upload fallback, permission reset, offline transition, deletion. |
| Advisory | iPad Safari | Layout, camera prompt, orientation, file picker. Not required for launch pass. |
| Advisory | Desktop Safari | Keyboard navigation, upload fallback, desktop camera if available. |
| Baseline | Desktop Chrome | Smoke test, keyboard navigation, upload fallback, development diagnostics. |

Required origin:

- `localhost` for local development.
- Approved HTTPS origin for mobile camera testing.

Do not claim support for:

- In-app social browsers.
- Embedded Squarespace iframe camera use.
- Unsupported Android browsers.
- Browser environments where camera APIs are disabled.

## 6. Bug-Report Workflow

Default bug channel must be approved by Wyatt before tester invitations. Until then, use local/internal issue capture only.

Bug report fields:

- Tester ID.
- Date/time.
- Device model.
- OS version.
- Browser and version.
- URL origin.
- Flow area: onboarding, consent, capture, upload, quality, attributes, profile, results, save, share, screenshot refinement, privacy, deletion, settings.
- Expected behavior.
- Actual behavior.
- Recovery action tried.
- Whether raw media was involved.
- Whether any data left the device.
- Severity.
- Reproducibility.
- Non-face screenshot of UI issue, optional.

Severity:

- S0 Critical privacy/security: raw face media uploaded or exposed, deletion false claim, secret exposure, production fixture recommendation.
- S1 Beta blocker: app crash, capture impossible on primary device, verified recommendation references invalid catalog data, deletion fails.
- S2 Major: broken recovery, confusing consent, severe layout/accessibility failure, incorrect catalog-unavailable state.
- S3 Minor: copy issue, minor layout problem, non-blocking warning.

Triage SLA targets:

- S0: stop beta immediately; owner notified same day.
- S1: pause affected tester cohort until fixed or mitigated.
- S2: fix or document before next beta wave.
- S3: batch for normal iteration.

## 7. Catalog-Error Reporting

Catalog errors are separate from ordinary UI bugs.

Report as catalog error when:

- A recommendation displays an unverified option.
- A build guide points to a missing menu path.
- A native label, index, platform, mode, patch, or creation path appears wrong.
- Catalog version is missing from a recommendation or saved build.
- A stale or incompatible catalog does not fail closed.

Catalog-error fields:

- Catalog version.
- Game version/patch shown by the app.
- Platform.
- Mode.
- Creation path.
- Recommendation rank.
- Catalog item stable ID.
- Exact menu instruction step.
- What the tester saw in the game.
- Whether screenshot evidence is available through an approved evidence workflow.

Do not ask testers to guess the correct game option. Catalog corrections require direct evidence and catalog-manager review.

## 8. Privacy Support

Privacy support goals:

- Explain what was processed locally.
- Explain that raw face media is temporary by default.
- Explain that no identity recognition is performed.
- Explain that no face data is uploaded by the MVP.
- Help testers delete local data.
- Escalate any deletion or data-retention concern.

Support scripts:

- "Use Privacy Center, then choose Delete active capture session to clear current scan data."
- "Use Delete all local data to clear active session data, saved non-image builds, screenshot session data, saved profiles, local deletion records, and app preferences controlled by the MVP."
- "Deletion cannot remove files you separately saved outside the app, browser screenshots, or messages sent through unapproved channels."
- "Do not send face photos to support unless Wyatt has provided a separate secure collection process and consent."

Escalate immediately:

- Tester reports images uploaded unexpectedly.
- Tester cannot delete local data.
- Tester believes the app identified them.
- Tester believes sensitive traits were inferred.
- Tester submits face media through an unapproved channel.

## 9. Deletion Support

Required deletion support checks:

- Active capture session deletion.
- Temporary image/object URL cleanup through retake, remove, cancel, and delete-all.
- Derived profile deletion.
- Saved profile deletion.
- Saved build deletion.
- Screenshot-refinement session deletion.
- Delete-all local data.
- Deletion completion message.

Tester deletion confirmation:

- Ask tester to perform delete-all after the session.
- Ask whether the app confirmed deletion.
- Ask whether refreshing the page restored any unexpected local state.
- Record deletion result in the feedback form.

Do not promise deletion outside the app's control.

## 10. Incident Escalation

Incident categories:

| Level | Trigger | Immediate action |
| --- | --- | --- |
| S0 | Raw face media leaves device unexpectedly; unverified production recommendation appears; legal/privacy claim breach; data deletion materially fails | Stop beta, disable affected build/catalog if possible, preserve non-sensitive logs, notify Wyatt, document timeline. |
| S1 | Primary-device capture blocked; crash loop; catalog mismatch; widespread consent confusion | Pause affected cohort, create hotfix or rollback plan, update tester instructions. |
| S2 | Repeated quality failure, poor recovery, accessibility blocker, severe performance issue | Triage, assign owner, decide hotfix versus next build. |
| S3 | Minor copy or layout issue | Track for normal iteration. |

Escalation record:

- Incident ID.
- First reported time.
- Reporter/tester ID.
- Severity.
- Affected version or commit.
- Affected device/browser.
- Data categories involved.
- Whether raw media was involved.
- Containment action.
- Owner decision.
- Resolution.
- Follow-up prevention.

## 11. Feedback Forms

Use `docs/BETA_FEEDBACK_FORM_SPEC.md` as the default form spec.

Required sections:

- Tester context.
- Journey completion.
- Mobile behavior.
- Results, only when verified recommendations are enabled.
- Privacy and trust.
- Performance.
- Open feedback.

Forbidden fields:

- Raw face images by default.
- Raw screenshots by default.
- Passwords, payment credentials, recovery codes, API keys.
- Sensitive traits.
- Identity labels or "who does this look like" questions.
- Free-form fields that ask for facial measurements.

## 12. Resemblance Rating

Use `docs/RESEMBLANCE_RATING_RUBRIC.md` only after verified production catalog records are loaded.

Ratings:

- Top-one usefulness from 1 to 5.
- Top-three usefulness from 1 to 5.
- Build-guide correctness from 1 to 5.
- Confidence explanation clarity from 1 to 5.

Do not ask:

- "Did the app identify you?"
- "What ethnicity does this look like?"
- "How attractive is the result?"
- Any health, age, personality, criminality, or identity question.

## 13. Screenshot Refinement Feedback

Screenshot-refinement feedback is allowed only for intake, validation, deletion, and unavailable-state clarity until real comparison logic and verified catalog data are available.

Ask:

- Did the screenshot requirements make sense?
- Was the invalid-image recovery clear?
- Did the app explain why refinement is unavailable?
- Did screenshot session deletion work?
- If verified refinement is later enabled, did the suggested change reference only verified options?

Do not ask testers to upload created-player screenshots outside an approved secure evidence workflow.

## 14. Beta Metrics Dashboard

The MVP currently has local-only development dashboards:

- Analytics: `web/features/analytics/AnalyticsDashboard.tsx`
- Performance: `web/features/performance/PerformanceDashboard.tsx`

These dashboards are for internal local sessions only. No external analytics provider is connected.

Primary beta metrics:

| Metric | Source | Target before wider beta |
| --- | --- | --- |
| Scan completion | Privacy-safe analytics event aggregation | 90% or higher on supported devices. |
| Retake rate | Privacy-safe analytics event aggregation | Median no more than one retake per required angle. |
| Quality pass rate | Privacy-safe analytics event aggregation | 85% or higher after allowed retakes. |
| Recommendation success | Analytics plus catalog gate | 99% or higher after verified catalog is loaded. Empty catalog should be counted as blocked, not failed. |
| Top-one selection | Resemblance rubric | 55% or higher rating 4 or 5 after verified catalog. |
| Top-three selection | Resemblance rubric | 75% or higher rating at least one top-three result 4 or 5 after verified catalog. |
| Screenshot refinement completion | Analytics and feedback form | Intake works; real refinement target deferred until feature is implemented. |
| Deletion success | Analytics plus tester confirmation | 100% for app-controlled local data. |
| Crash-free sessions | Analytics event aggregation | 95% or higher. |
| Processing latency | Performance dashboard | p75 under 10 seconds and p95 under 20 seconds from final accepted image to results after local model/catolog are active. |

Manual dashboard export, before an external provider exists:

1. Run a local session.
2. Open the development Analytics dashboard.
3. Record aggregate counts manually without raw media or identity data.
4. Open the development Performance dashboard.
5. Record budget status manually.
6. Store only aggregate results in a beta status note.

Do not export raw local browser storage, images, object URLs, profiles, measurements, or landmarks.

## 15. Release Rollback Process

Rollback applies to both app build and catalog release.

App rollback:

1. Identify last known good commit.
2. Confirm rollback does not discard user-created work.
3. Build locally.
4. Run typecheck, lint, unit tests, catalog validation, integrity checks, legal copy guard, and production build.
5. If deployed in the future, redeploy the last known good build through the approved hosting process.
6. Notify testers with a concise non-sensitive status note.

Catalog rollback:

1. Stop serving the problematic catalog version.
2. Restore the previous immutable approved catalog release.
3. Preserve the bad release for investigation; do not edit it silently.
4. Record affected version, affected records, checksums, and reason.
5. Re-run production publish gate.
6. Ensure saved builds retain the original catalog version used.

Beta rollback communication:

- Say what testers should do.
- Say whether they need to delete local data.
- Do not include raw media, tester identities, secrets, or sensitive findings.
- Do not blame testers for catalog-unavailable or fail-closed states.

## 16. Beta Closeout

At the end of each beta wave:

- Confirm all testers were asked to delete local data.
- Confirm deletion results were recorded.
- Summarize bugs by severity.
- Summarize privacy/support requests.
- Summarize device/browser pass/fail.
- Summarize catalog errors separately from app bugs.
- Summarize metrics without raw media or identifying data.
- Decide continue, pause, rollback, or expand.
- Update `docs/PRIVATE_BETA_READINESS.md` only when evidence changes the readiness decision.

## 17. Owner Checklist Before Inviting Testers

- [ ] Private-beta go/no-go approved by Wyatt.
- [ ] Verified production catalog available for the intended platform, game version, mode, and creation path.
- [ ] Local face-landmark model asset reviewed and checksummed.
- [ ] HTTPS beta origin approved.
- [ ] Supported device list confirmed.
- [ ] Tester consent finalized.
- [ ] Feedback form approved.
- [ ] Support channel approved.
- [ ] Incident escalation contact approved.
- [ ] Rollback process rehearsed.
- [ ] No external analytics, payments, accounts, cloud storage, email automation, or upload services connected without explicit approval.
