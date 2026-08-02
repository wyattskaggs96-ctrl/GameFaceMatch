# Face Image Handling

Last updated: 2026-08-01

GameFace Match handles face images as temporary local inputs by default.

## FC 26 MVP

The FC 26 face-recipe workflow:

- processes reference photos and FC 26 screenshots in the browser;
- uses temporary object URLs for previews;
- attempts local landmark detection with the existing MediaPipe Face Landmarker provider;
- stores normalized measurements, quality warnings, recipe settings, notes, and timestamps;
- does not serialize raw images, object URLs, base64 media, crops, or screenshots into the FC 26 profile;
- lets the user remove all active photo previews;
- saves only derived non-image profile JSON in browser session storage.

## Prohibited Data Use

The workflow must not:

- send photos or screenshots to analytics;
- log image bytes, base64 media, object URLs, landmark coordinate payloads, or biometric templates;
- perform identity recognition;
- infer race, ethnicity, attractiveness, personality, health, criminality, or other sensitive traits;
- use cloud face-recognition APIs without a separate approved architecture and consent layer.

## Deletion Behavior

Removing a photo revokes its browser object URL. Removing all photos clears the active FC 26 reference and screenshot slots, generated measurements, recipe, and comparison state. Saved FC 26 profiles remain non-image derived records unless the user deletes browser session storage.

## Current Limitations

Browser memory is managed by object URL revocation and state clearing, but the browser controls final garbage collection timing. The MVP does not provide cloud backup or account sync for FC 26 recipe profiles.
