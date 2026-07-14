# Objective Facial-Feature Taxonomy

This document defines the controlled vocabulary for College Football 27 catalog annotation. It describes observable game-rendered features only. It does not authorize invented game options, real-person labels, identity recognition, or sensitive-trait inference.

## Separation From Native Game Labels

Catalog records must keep native game data separate from researcher-applied metadata.

- Native game label data: exact visible label or index, native category label, native order, and menu item ID from direct game evidence.
- Researcher-applied metadata: objective feature measurements or reviewable visual observations recorded with evidence references and confidence.

Researcher metadata must never replace, rename, complete, or infer a native College Football 27 label.

## Required Feature Groups

The controlled taxonomy is implemented in `web/lib/phase-zero/phase-zero-facial-feature-taxonomy.ts` and `data/schemas/facial-feature-taxonomy.schema.json`.

- Face: width ratio, length ratio, width class, length class.
- Forehead: width ratio, height ratio, width class, height class.
- Temples: width ratio and taper class.
- Cheekbones: width ratio and prominence class.
- Jaw: width ratio, angle class, and taper class.
- Chin: width ratio, length ratio, and projection class.
- Eyes: spacing ratio, mean eye-width ratio, tilt class, and openness class.
- Brows: thickness class, position ratio, and arch class.
- Nose: width ratio, length ratio, bridge class, and projection class.
- Mouth: width ratio, fullness class, and corner-tilt class.
- Ears: visibility class, size class, and protrusion class.
- Symmetry: left/right difference ratio and review class.
- Hairline: position class, contour class, and visible coverage class.
- Facial-hair coverage: upper lip, chin, cheeks, jaw, sideburns, and density.

## Metric Rules

Every metric must record:

- Value.
- Source: `measured`, `researcherReviewed`, `userConfirmed`, or `unavailable`.
- Confidence from 0 to 1.
- Evidence file IDs when the source is measured, reviewed, or user-confirmed.

Unavailable fields must remain unavailable instead of being guessed.

## Verified Head Geometry Annotation

The stricter verified-head preset geometry contract is documented in `docs/phase-zero/VERIFIED_HEAD_GEOMETRY_ANNOTATION_SCHEMA.md` and implemented in `web/lib/phase-zero/phase-zero-verified-head-geometry-annotation.ts`.

It covers objective measurable fields only: face width, face length, forehead width, temple width, cheekbone width, jaw width, jaw angle, chin width, chin height, chin projection, eye size, eye spacing, eye tilt, brow position, nose length, nose width, nose projection, nose-tip form, mouth width, lip proportions, ear height, ear projection, and symmetry indicators.

That schema applies only after the underlying head preset has already been verified. It does not create verified College Football 27 records and it does not enable recommendations.

## Prohibited Fields

Catalog annotation must not include:

- Race labels.
- Ethnicity labels.
- Attractiveness.
- Personality.
- Identity.
- Criminality.
- Health.
- Real-person resemblance labels.
- Celebrity resemblance or lookalike labels.

These prohibitions apply to direct fields, nested metadata, notes intended as structured labels, exports, and production packages.
