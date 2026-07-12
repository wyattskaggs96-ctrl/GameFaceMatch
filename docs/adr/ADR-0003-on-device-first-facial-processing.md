# ADR-0003: On-Device-First Facial Processing

Date: 2026-07-12

Status: Accepted

## Context

GameFace Match handles face images and derived facial measurements. The project has explicit privacy rules: no identity recognition, no sensitive-trait inference, no external uploads, and no raw media persistence by default.

## Decision

Facial processing is local/on-device first. The web MVP performs browser-local capture, image validation, quality checks, landmark processing behind `FaceLandmarkProvider`, and profile generation without uploading face media.

External AI, analytics, cloud media storage, identity recognition, and biometric identification services are not part of the MVP.

## Consequences

- Browser models must lazy-load and must not block initial page load.
- Providers must return unavailable/error states rather than fabricate landmarks or measurements.
- Raw frames and landmark coordinate sets are not serialized into saved profiles.

## Current Gaps

- The reviewed MediaPipe model asset is absent from `web/public/models/mediapipe/face_landmarker.task`.
- Real-device performance, memory pressure, and interruption recovery require manual QA.
