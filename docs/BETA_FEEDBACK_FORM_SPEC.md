# Beta Feedback Form Specification

Status: Draft. Do not connect this to an external service until the owner selects a secure collection process.

## Collection Rules

- Do not request passwords, payment credentials, recovery codes, or API keys.
- Do not collect real face photos by default.
- Do not collect raw screenshots unless a separate screenshot evidence consent exists.
- Do not ask for sensitive traits.
- Do not imply identity recognition.

## Sections

### Tester Context

- Tester ID or nickname.
- Date.
- Device model.
- Operating system version.
- Browser and version.
- Network context: local, HTTPS preview, or other.
- Assistive technology used, optional.

### Journey Completion

- Could you reach the welcome screen?
- Did the product explanation make sense?
- Did the independent-app disclaimer make sense?
- Did consent feel clear and separate?
- Did capture start successfully?
- Did upload fallback work?
- Did you complete all five angles?
- Which angle was hardest?
- Did quality review explain what to fix?
- Did selective retake work?
- Did attribute confirmation feel appropriate?
- Did profile review distinguish measured, approximate, and unavailable items?

### Mobile Behavior

- Camera permission result.
- Camera switching result.
- Front-camera preview orientation.
- Portrait layout usability.
- Browser back-button behavior.
- Refresh protection behavior.
- Backgrounding or lock-screen recovery.
- Offline transition behavior.
- Any low-memory or tab reload issue.

### Results

Use only after verified production catalog records exist:

- Top-one rating from `docs/RESEMBLANCE_RATING_RUBRIC.md`.
- Top-three usefulness rating.
- Confidence explanation rating.
- Build-guide correctness rating.
- Which result would you try first?
- What mismatch was most visible?

If catalog is empty, record whether the catalog-unavailable state was clear.

### Privacy and Trust

- Did the no-upload wording feel clear?
- Did the no-identity-recognition wording feel clear?
- Did the independent-app disclaimer feel clear?
- Did delete active session work?
- Did delete all local data work?
- Did anything feel creepy, medical, or overclaimed?

### Performance

- Time to first screen.
- Time to start camera.
- Time per image capture or upload.
- Time from final accepted image to profile review.
- Time from final accepted image to results state once matching is available.

### Open Feedback

- What was confusing?
- What felt trustworthy?
- What should be improved before a wider beta?
- Did any wording sound like a promise the product could not keep?

## Export Format

Use CSV or JSON with no raw image fields. If screenshot evidence is later collected, store it in a separate consented evidence workflow outside this default feedback form.
