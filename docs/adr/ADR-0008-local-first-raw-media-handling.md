# ADR-0008: Local-First Raw-Media Handling

Date: 2026-07-12

Status: Accepted

## Context

Face captures and created-player screenshots are privacy-sensitive. The web MVP does not have accounts, uploads, or cloud storage.

## Decision

Raw face images and screenshot-refinement images are local and temporary by default. They may exist only in active browser memory, Blob objects, object URLs, or camera streams during the active session unless a future explicit opt-in feature is designed and approved.

Raw image bytes must not be stored in `localStorage` or committed to the repository.

## Consequences

- Capture and refinement flows must revoke object URLs on retake, removal, cancellation, deletion, and session reset.
- Local storage may hold consent, preferences, non-image attributes, derived profiles, saved builds, and deletion records, but not raw media.
- Privacy center must explain storage locations and deletion behavior honestly.

## Current Gaps

- Browser memory cleanup is best-effort and depends partly on browser behavior after object URL revocation and track shutdown.
- Manual real-device interruption testing remains required.
