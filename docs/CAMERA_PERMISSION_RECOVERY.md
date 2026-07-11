# Camera Permission Recovery

Browser camera access is optional for the web MVP. Every required angle has manual image upload fallback. Camera access requires HTTPS or localhost.

## iPhone Safari

If permission is denied or stuck:

1. Open iOS Settings.
2. Open Safari.
3. Open Camera.
4. Choose Ask or Allow.
5. Return to Safari and reload the GameFace Match page.
6. Tap Start camera again.

If the site-specific setting appears in Safari:

1. Tap the page controls icon in the address bar.
2. Open Website Settings.
3. Set Camera to Ask or Allow.
4. Reload the page.

If camera remains unavailable, continue with Upload fallback for each required angle.

## Android Chrome

If permission is denied or blocked:

1. Tap the lock or site information icon in the address bar.
2. Open Permissions or Site settings.
3. Open Camera.
4. Choose Allow or reset the permission.
5. Reload the page.
6. Tap Start camera again.

If no camera is available or no matching front camera is exposed, continue with Upload fallback.

## Desktop Browsers

Use HTTPS or localhost. If permission is denied, reset the camera permission from the browser site settings, reload, and start the camera again.

## Expected App Behavior

- Permission denial shows a clear recovery message.
- Upload fallback remains available.
- No face image is uploaded.
- Browser RGB capture is not described as TrueDepth or ARKit capture.
- If the page is hidden, locked, or restored, camera tracks are stopped and the user is asked to restart the camera.

