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
- Missing or low-confidence measurement weight is redistributed only through the weighted-distance denominator across included reliable features.
- Overall confidence is reduced when profile evidence or catalog annotation coverage is incomplete.
- Skin tone and skin presentation are not geometry features.

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
