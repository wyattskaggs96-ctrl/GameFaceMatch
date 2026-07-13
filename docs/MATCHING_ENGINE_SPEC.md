# Matching Engine Specification

The MVP uses an explainable weighted feature-distance model.

Required behavior:

- Rank at least three verified head options.
- Redistribute weight when a measurement is unavailable or low-confidence.
- Reduce overall confidence when reliable evidence is missing.
- Keep geometry independent from skin-tone presentation.
- Explain the strongest similarities and the largest differences.
- Treat the score as a relative game-option match score, not identity probability.

## Current Web Algorithm

- Model version: `rule-based-web-mvp-v2-rgb-geometry`
- Score label: “Match score based on the game’s available appearance options.”
- Geometry and appearance are scored separately.
- Geometry and appearance feature weights are configurable through the rule-based engine configuration; default weights are documented below and must remain visible.
- Missing or low-confidence measurement weight is redistributed only through the weighted-distance denominator across included reliable features.
- Overall confidence is reduced when profile evidence or catalog annotation coverage is incomplete.
- Every feature contribution records profile and catalog evidence metadata: value, confidence, supporting frame count, variance, depth availability, profile availability, and occlusion state.
- Missing side-view evidence, significant occlusion, unavailable profile measurements, unavailable catalog measurements, and low-confidence measurements are excluded from weighting and explained as uncertainty.
- Recommendation explanations are generated as a structured top-three report with best/second/third labels, match score, confidence, key reasons, key differences, capture quality, catalog version, verification date, and verified step-by-step game instructions.
- Recommendation explanations must use “match score based on available game options” style language and must not use percent-identical or identity-probability language.
- When no approved catalog exists, the results experience must explain that capture/profile creation completed successfully, identify the verified catalog as the blocker, show what is ready versus blocked, offer local profile deletion, and never render fixture recommendations.
- Skin tone and skin presentation are not geometry features.
- The generic production matcher returns no matches unless the manifest is production-class, contains verified records, has an `approvedRelease` lifecycle state, has a catalog verification date, and includes a package checksum. The College Football 27 adapter also requires the full runtime catalog approval gate and definitive production publish-gate report.

## Explicit Geometry Weights

These weights are intentionally visible and must not be changed without updating this document and tests.

| Feature | Group | Weight |
| --- | --- | ---: |
| faceWidthRatio | Face and jaw shape | 0.12 |
| faceLengthRatio | Face and jaw shape | 0.05 |
| foreheadWidthRatio | Face and jaw shape | 0.07 |
| jawWidthRatio | Face and jaw shape | 0.11 |
| chinWidthRatio | Face and jaw shape | 0.07 |
| lowerFaceRatio | Face and jaw shape | 0.05 |
| jawAngle | Face and jaw shape | 0.04 |
| eyeSpacingRatio | Eyes and eyebrows | 0.09 |
| meanEyeWidthRatio | Eyes and eyebrows | 0.05 |
| eyeTilt | Eyes and eyebrows | 0.03 |
| browPosition | Eyes and eyebrows | 0.04 |
| noseWidthRatio | Nose | 0.09 |
| noseLengthRatio | Nose | 0.07 |
| noseProjection | Profile projection | 0.05 |
| chinProjection | Profile projection | 0.04 |
| mouthWidthRatio | Mouth | 0.07 |
