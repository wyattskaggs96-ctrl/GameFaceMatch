# Face Scan Owner Test Package

Status: READY_FOR_OWNER_DEVICE_VALIDATION once local validation is green.

## A. Real iPhone Test

Use the normal GameFace Match URL for the environment being tested.

Recommended local URL:

`http://127.0.0.1:3000/#welcome`

Enable 3D avatar testing locally with:

`NEXT_PUBLIC_GAMEFACE_3D_AVATAR_V1=true npm --prefix web run dev`

Steps:

1. Open the URL on iPhone Safari through the active local or HTTPS test environment.
2. Tap `Get Started` once.
3. Allow camera access.
4. Hold the phone upright in a normal selfie posture.
5. Center your face.
6. Wait for the circular scan to start.
7. Move your head slowly through one comfortable circle.
8. Confirm progress rises in 20% increments.
9. Confirm the scan completes and advances to the game-selection screen.
10. Confirm the avatar preview appears and never shows a raw selfie.

Diagnostics, if needed:

Add `?scanDiagnostics=1#new-scan` to the URL when investigating a scan issue.

Observe:

- Camera starts without a second setup screen.
- No fake phone status chrome appears.
- The camera preview does not flash during active scan.
- Missing-angle guidance tells you what is still needed.
- Scan completes without moving the phone into an unnatural angle.

## B. Avatar Review

Safe screenshot paths for this prompt:

- `docs/status/visual-evidence/prompt140b/01-neutral-head.png`
- `docs/status/visual-evidence/prompt140b/02-wyatt-from-morphs-front.png`
- `docs/status/visual-evidence/prompt140b/03-wyatt-from-morphs-threequarter.png`
- `docs/status/visual-evidence/prompt140b/06-local-postscan-430x932.png`
- `docs/status/visual-evidence/prompt140b/07-local-postscan-390x844.png`

Questions:

1. Does the avatar look like a sports-game player?
2. Does the Wyatt preset preserve broad head, jaw, chin, nose, and eye-spacing proportions?
3. Does anything look obviously broken?
4. Is the fallback acceptable if WebGL fails?

## C. Multi-Person Test

Do not begin until the local 3D path passes and Wyatt approves the direction.

For each consenting tester:

1. Complete the normal scan.
2. Generate the 3D avatar.
3. Capture only the safe rendered avatar, not raw scan images.
4. Ask for a resemblance rating from 1 to 10.
5. Record obvious errors using anonymous tester IDs only.

Minimum: 3 consenting testers.

Preferred: 5 consenting testers with visibly different face widths, face lengths, jaw structures, complexions, hair types, and facial-hair states.
