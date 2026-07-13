# Privacy Implementation Notes

- Collect only what is needed for the current recommendation.
- Delete raw video after selecting usable frames.
- Delete rejected frames immediately.
- Delete selected raw frames and depth data after profile generation unless the user separately opts in.
- Save derived measurements only when the user explicitly chooses to save a profile.
- Cloud sync is opt-in and is not part of the initial prototype.
- Analytics must not contain raw face media, identifying frames, facial geometry, precise facial measurements, landmark coordinates, identity embeddings, or unencrypted profile content.
- The user must be able to delete session data, saved profiles, screenshots, and all local data.

## Web MVP notes

- Browser capture uses RGB images only.
- Selected images may exist as in-memory `File` objects or temporary object URLs during the active session.
- Raw face images must not be written to localStorage.
- Local face-landmark extraction may run in the browser through `FaceLandmarkProvider`; it does not upload images, identify people, generate identity embeddings, or infer sensitive traits.
- Derived `StandardFaceProfile` geometry stores normalized ratios and provenance only. It must not serialize raw frames, object URLs, file names, or landmark coordinate arrays.
- Saved derived profiles require an explicit in-app save action after separate save-profile consent. The web MVP stores saved profile payloads in browser `sessionStorage` only and encrypts them with WebCrypto AES-GCM when the browser supports it. If WebCrypto is unavailable, the app uses a clearly labeled session-only fallback and keeps deletion controls available.
- Saved builds should contain derived settings and catalog metadata only, not raw face images.
- No facial images are uploaded in the initial web prototype.
- Manual upload fallback must follow the same deletion and non-retention expectations as camera capture.
- The analytics contract is provider-independent and defaults to local/no-op behavior. No analytics SDK or external analytics provider is connected.

## Web MVP local data inventory

The web MVP currently uses local browser/session state only. No backend, account, cloud sync, analytics SDK, advertising SDK, or upload service is connected.

| Data category | Storage location | Why it is stored | Leaves device | Default retention | Deletion control |
| --- | --- | --- | --- | --- | --- |
| Consent version | React session memory for the MVP | Records which separate acknowledgments are active in the tab | No | Until reload or delete-all | Delete all local data |
| Capture-session metadata | React session memory | Tracks angle completion, retakes, quality state, and non-image progress | No | Active session only | Delete active capture session |
| Temporary Blob URLs | Browser memory/object URL registry | Displays selected/captured images during the active session without localStorage writes | No | Retake, removal, cancellation, or delete-all | Delete temporary images |
| Captured image bytes | `File`/`Blob` objects in memory only | Supports local quality review, landmark processing, profile creation, and user review | No | Active session only | Delete temporary images |
| User-confirmed attributes | React session memory | Keeps user-confirmed appearance preferences separate from model estimates | No | Active session unless included in a saved non-image build | Delete active capture session |
| Current derived profile | React session memory | Holds the current non-image standardized profile for review, blocked results, or explicit save | No | Current recommendation unless the user explicitly saves it | Delete derived profile |
| Saved derived profiles | Browser `sessionStorage` profile vault; WebCrypto-encrypted when available | Stores explicit non-image derived profile saves for this browser session | No | Only after explicit save and separate save-profile consent; session-only for this MVP | Delete one saved profile, all saved profiles, or all local data |
| Saved builds | Local non-image privacy store | Stores non-image build records and catalog traceability only when saved by the user | No | Until user deletes one build, all builds, or all local data | Delete one build, all builds, or all local data |
| Screenshot-refinement session | Browser memory/object URL registry | Temporarily supports local screenshot-refinement intake and validation | No | Temporary session only | Delete screenshot session |
| Deletion records | Local deletion log without face images | Shows the user that a local deletion action completed | No | Local audit trail | Delete all local data |
| Application preferences | Local preference memory; future localStorage only for non-sensitive preferences | Remembers non-sensitive display and interaction preferences | No | Until preferences or all local data are deleted | Delete application preferences |

Raw image bytes must not be placed in `localStorage`. Saved builds are non-image records by default. Any future image-saving feature must be a separate opt-in consent and storage path.

## Consent layers

The web MVP uses separate consent controls for camera use, face analysis for the current recommendation, temporary local processing, saving a derived profile, cloud backup if ever supported, saving raw images, saving a completed build, saving screenshots, future product-improvement participation, future model-training participation, and marketing or sharing.

Cloud backup, raw image saving, screenshot saving, future product-improvement participation, future model-training participation, and marketing/sharing remain unavailable until separately designed, approved, and implemented. Screenshot files stay temporary and deletable. Raw face media retention defaults to no.

## Privacy-safe analytics

The MVP defines a privacy-safe analytics abstraction in `web/lib/analytics/privacy-safe-analytics.ts` and documents it in `docs/ANALYTICS_CONTRACT.md`.

Allowed events are limited to coarse product events such as capture started, capture completed, capture abandoned, broad quality failure category, retake, result blocked, catalog unavailable, profile deleted, refinement started, and refinement completed.

Payloads are intentionally narrow. Runtime validation rejects unknown keys, raw image or Blob URL values, media-like strings, frame references, facial geometry, exact measurements, landmarks, embeddings, profile content, object/array payload values, and long free-form strings. The default implementation is no-op or local memory only until the owner explicitly approves an analytics provider.

## Mobile testing privacy notes

- Local device testing must verify that camera streams stop when leaving capture, cancelling a session, or deleting all local data.
- Retaking, removing, cancelling, deleting temporary images, deleting screenshot sessions, and deleting all local data must revoke object URLs.
- Browser camera permission is separate from app consent. The app consent flow explains intended use; the browser still controls camera access.
- No service worker is registered, so there is no intentional offline cache of capture media.
- The hardened MVP does not include a network upload surface for face images. Any future upload or sync feature requires a separate architecture and consent decision.
- MediaPipe Face Landmarker is lazy-loaded only for local capture analysis. If the reviewed local model asset is unavailable, the app reports landmarks as unavailable instead of fabricating results.
