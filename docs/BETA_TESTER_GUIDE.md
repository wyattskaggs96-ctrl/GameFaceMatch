# Beta Tester Guide

Status: Draft. Do not distribute as a real recommendation beta guide until the private-beta gates in `docs/PRIVATE_BETA_READINESS.md` are met.

## What GameFace Match Does

GameFace Match recommends the closest available in-game appearance settings. It does not directly import your face into College Football 27.

The current web MVP uses guided RGB images from a browser camera or image upload. It does not use TrueDepth, ARKit, depth geometry, 3D reconstruction, identity recognition, or cloud face processing.

## Current Test Scope

Use this guide only for local internal testing of:

- Welcome, product explanation, disclaimer, privacy summary, and consent.
- Five-angle capture or upload fallback.
- Image-quality review and retake behavior.
- Attribute confirmation and profile review.
- Catalog-unavailable results.
- Privacy center and deletion flows.
- Screenshot-refinement intake and unavailable state.

Do not expect real College Football 27 recommendations until a verified catalog package is loaded.

## Before Testing

Use a modern browser on a supported phone or desktop. For real camera testing, the app must be opened from a secure context such as `https://` or `localhost`.

Prepare:

- Even front lighting.
- A plain area without strong backlighting.
- Clean camera lens.
- No glasses where practical.
- No hats or headwear.
- Hair pulled away from cheeks and ears where practical.
- Neutral expression with lips gently closed.
- One person in frame.

## Capture Steps

Complete these five required RGB views:

1. Straight-on.
2. Left 45 degrees.
3. Right 45 degrees.
4. Left profile.
5. Right profile.

For each view:

- Start camera or use upload fallback.
- Follow the on-screen pose prompt.
- Retake only the weak image when needed.
- Confirm manually when the browser asks about items it cannot detect, such as one-person visibility or neutral expression.

## Upload Fallback

Upload fallback is available for every required angle. Use JPEG, PNG, or WebP. HEIC and HEIF may be unsupported in the current browser MVP and should be converted before upload.

Do not upload real face photos into issue trackers, email, or feedback forms unless a separate consent and secure collection process exists.

## Results Expectations

If the production catalog is empty, the expected result is:

Verified College Football 27 catalog not loaded.

That is correct fail-closed behavior.

## Deleting Data

Use Privacy Center to review stored local data and delete:

- Active capture session.
- Saved builds.
- Screenshot session.
- All local data.

Raw image bytes should not be stored in localStorage. Temporary browser object URLs should be revoked when images are removed, sessions are cancelled, or all local data is deleted.

## What To Report

Report:

- Device and browser.
- Whether capture completed.
- Which angle was hardest.
- Any camera permission issue.
- Any reload, backgrounding, lock-screen, or back-navigation issue.
- Whether deletion behaved clearly.
- Whether privacy wording was understandable.
- Processing time once real landmark processing is enabled.

Do not include real face images unless a separate approved secure evidence workflow exists.
