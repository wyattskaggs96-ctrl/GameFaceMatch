# Repeatability Test Protocol

Status: Required before private beta recommendation testing.

## Purpose

Measure whether the same tester can repeat the guided RGB capture flow and receive stable standardized geometry and stable top-three recommendations once a verified production catalog is available.

This protocol does not test identity recognition. It must not store raw face images by default.

## Test Design

Each tester completes three separate capture sessions:

1. Session A: normal recommended setup.
2. Session B: same setup after a short reset.
3. Session C: slightly different practical setup, such as normal room variation, without strong backlighting.

Each session must include:

- Straight-on.
- Left 45 degrees.
- Right 45 degrees.
- Left profile.
- Right profile.
- Manual confirmations.
- Attribute confirmation.
- Profile review.
- Delete or save decision.

## Measurement Stability

For each available normalized RGB geometry measurement, calculate:

- Mean.
- Standard deviation.
- Maximum absolute delta between sessions.
- Availability rate across the three sessions.
- Confidence range.

Suggested initial stability target:

- Core front-view ratios should usually stay within 0.03 absolute difference.
- Approximate profile projection ratios should usually stay within 0.05 absolute difference.
- Measurements marked unavailable must stay unavailable rather than being guessed.

These targets must be revised after real device data is collected.

## Recommendation Stability

Only run this section after verified production catalog records exist.

Track:

- Top-one repeated exactly across sessions.
- Top-three overlap across sessions.
- Catalog version retained with every result.
- Platform, patch, mode, and creation path retained with every result.
- Explanation uncertainty for incomplete or low-confidence evidence.

Suggested initial recommendation target:

- At least two of the top-three recommendations should overlap across repeated captures for the same tester when capture quality is acceptable.

## Processing Time

Measure from final accepted image to results state:

- Median.
- p75.
- p95.
- Maximum.

Suggested beta gate:

- p75 under 10 seconds.
- p95 under 20 seconds on supported phones.

## Privacy Handling

For each test session:

- Confirm raw image bytes are not stored in localStorage.
- Confirm object URLs are revoked after remove, retake, cancel, or delete-all.
- Confirm saved builds do not include raw face images by default.
- Confirm deletion records are created without logging images, landmarks, or precise measurements in analytics.

## Output

The repeatability report should contain aggregate measurements and qualitative notes only. Do not attach raw face images unless a separate approved evidence workflow and consent exist.
