# Privacy Implementation Notes

- Collect only what is needed for the current recommendation.
- Delete raw video after selecting usable frames.
- Delete rejected frames immediately.
- Delete selected raw frames and depth data after profile generation unless the user separately opts in.
- Save derived measurements only when the user explicitly chooses to save a profile.
- Cloud sync is opt-in and is not part of the initial prototype.
- Analytics must not contain raw face media or precise facial measurements.
- The user must be able to delete session data, saved profiles, screenshots, and all local data.

## Web MVP notes

- Browser capture uses RGB images only.
- Selected images may exist as in-memory `File` objects or temporary object URLs during the active session.
- Raw face images must not be written to localStorage.
- Saved builds should contain derived settings and catalog metadata only, not raw face images.
- No facial images are uploaded in the initial web prototype.
- Manual upload fallback must follow the same deletion and non-retention expectations as camera capture.

## Web MVP local data inventory

The web MVP currently uses local browser/session state only. No backend, account, cloud sync, analytics SDK, advertising SDK, or upload service is connected.

| Data category | Storage location | Default retention | Deletion control |
| --- | --- | --- | --- |
| Consent version | React session memory for the MVP | Until reload or delete-all | Delete all local data |
| Capture-session metadata | React session memory | Active session only | Delete active capture session |
| Temporary Blob URLs | Browser memory/object URL registry | Retake, removal, cancellation, or delete-all | Delete temporary images |
| Captured image bytes | `File`/`Blob` objects in memory only | Active session only | Delete temporary images |
| User-confirmed attributes | React session memory | Active session unless included in a saved non-image build | Delete active capture session |
| Derived profile | React session memory; optional memory privacy store with separate consent | Current recommendation unless the user consents to save | Delete derived profile |
| Saved builds | Local non-image privacy store | Until user deletes one build, all builds, or all local data | Delete one build, all builds, or all local data |
| Screenshot-refinement session | Browser memory/object URL registry | Temporary session only | Delete screenshot session |
| Deletion records | Local deletion log without face images | Local audit trail | Delete all local data |
| Application preferences | Local preference memory; future localStorage only for non-sensitive preferences | Until preferences or all local data are deleted | Delete application preferences |

Raw image bytes must not be placed in `localStorage`. Saved builds are non-image records by default. Any future image-saving feature must be a separate opt-in consent and storage path.

## Consent layers

The web MVP uses separate consent controls for camera use, face analysis for the current recommendation, temporary local processing, saving a derived profile, saving a completed build, saving screenshots, future product-improvement participation, and future model-training participation.

Future product-improvement and model-training participation remain unavailable until separately implemented. Screenshot saving is also unavailable in this MVP; screenshot files stay temporary and deletable.

## Mobile testing privacy notes

- Local device testing must verify that camera streams stop when leaving capture, cancelling a session, or deleting all local data.
- Retaking, removing, cancelling, deleting temporary images, deleting screenshot sessions, and deleting all local data must revoke object URLs.
- Browser camera permission is separate from app consent. The app consent flow explains intended use; the browser still controls camera access.
- No service worker is registered, so there is no intentional offline cache of capture media.
- The hardened MVP does not include a network upload surface for face images. Any future upload or sync feature requires a separate architecture and consent decision.
