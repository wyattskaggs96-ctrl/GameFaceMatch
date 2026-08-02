# Face Image Handling

Last updated: 2026-08-01

GameFace Match handles face images as temporary local inputs by default.

## FC 26 MVP

The FC 26 face-recipe workflow:

- can process one guided face-sweep video or separate reference photos;
- processes reference photos and FC 26 screenshots in the browser;
- samples guided-sweep video frames locally and keeps only temporary review thumbnails during the active session;
- uses temporary object URLs for previews;
- attempts local landmark detection with the existing MediaPipe Face Landmarker provider;
- stores normalized measurements, selected-frame metadata, quality warnings, recipe settings, notes, and timestamps;
- does not serialize raw images, raw video, object URLs, base64 media, crops, extracted frames, or screenshots into the FC 26 profile;
- lets the user remove all active photo, video, and extracted-frame previews;
- saves only derived non-image profile JSON in browser session storage.

## Prohibited Data Use

The workflow must not:

- send photos or screenshots to analytics;
- log image bytes, base64 media, object URLs, landmark coordinate payloads, or biometric templates;
- perform identity recognition;
- infer race, ethnicity, attractiveness, personality, health, criminality, or other sensitive traits;
- use cloud face-recognition APIs without a separate approved architecture and consent layer.

## Deletion Behavior

Removing a photo or sweep video revokes its browser object URL. Removing all media clears the active FC 26 reference slots, sweep video, extracted-frame thumbnails, screenshot slots, generated measurements, recipe, and comparison state. Saved FC 26 profiles remain non-image derived records unless the user deletes browser session storage.

## Current Limitations

Browser memory is managed by object URL revocation and state clearing, but the browser controls final garbage collection timing. The guided sweep does not create a 3D face model or identity template. The MVP does not provide cloud backup or account sync for FC 26 recipe profiles.
