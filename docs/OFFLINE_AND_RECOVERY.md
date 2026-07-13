# Offline and Recovery Behavior

GameFace Match is local-first for the web MVP. Recovery features preserve useful metadata after interruptions, but they do not store raw face media, evidence masters, or source videos in browser storage.

## Supported Recovery

- Draft audit sessions: evidence-intake drafts save local metadata rows, associations, roles, views, warnings, and notes.
- Interrupted uploads: selected file metadata can be recovered after refresh, but original `File` objects must be reselected before relying on validation or checksums.
- Browser refresh: capture recovery snapshots preserve angle status and file metadata only. Raw image bytes and object URLs are not restored.
- Partial capture recovery: users receive a status banner explaining how many angles had recoverable metadata and which captures must be retaken or re-uploaded.
- Unsaved-change warnings: active capture, evidence intake, and catalog-manager review warn before leaving when local work is in progress.
- Failed checksum recovery: checksum failures produce retry guidance and block publication until validation is rerun successfully.
- Validation reruns: catalog-manager review can rerun local validation summaries after restoring a draft.
- Local catalog-manager work: pasted candidate packages, validation reports, reviewer notes, and actions can be saved as local draft metadata.
- No-network capture: browser capture and upload fallback can continue where browser APIs allow; no user image upload service exists in the MVP.
- External-resource status: the app surfaces offline and catalog-runtime unavailable states without claiming recommendations can run.

## Non-Production Guarantees

- Recovered drafts are always marked `productionReady: false`.
- Drafts do not verify College Football 27 records.
- Drafts do not bypass catalog-manager review, second-verifier review, checksums, publication gates, or recommendation gates.
- Raw face images, screenshot bytes, source-video bytes, and object URLs are not written to localStorage or sessionStorage.

## User-Facing Limitation

After a browser refresh or mobile memory eviction, the app may remember metadata about work in progress, but the user or operator must reselect local files or retake browser captures. This is intentional privacy behavior, not a production catalog state.
