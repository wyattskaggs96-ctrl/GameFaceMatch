# Matching Engine Specification

The MVP uses an explainable weighted feature-distance model.

Required behavior:

- Rank at least three verified head options.
- Redistribute weight when a measurement is unavailable or low-confidence.
- Reduce overall confidence when reliable evidence is missing.
- Keep geometry independent from skin-tone presentation.
- Explain the strongest similarities and the largest differences.
- Treat the score as a relative game-option match score, not identity probability.
