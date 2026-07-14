# Verified Head Geometry Annotation Schema

**Status:** Phase 0 controlled schema  
**Schema version:** `phase0-verified-head-geometry-annotation-v1`  
**Production status:** no production records are created by this schema

This schema defines objective geometry annotations for College Football 27 head presets after the underlying head preset is already `VERIFIED` or `VERIFIED_WITH_NOTES`. It does not create game options, does not verify records by itself, and does not enable recommendations.

## Eligibility

An annotation may be production-eligible only when all of these are true:

- The target catalog record is a verified head preset.
- The exact native label, native order, platform, game version, patch, mode, creation path, evidence, and menu path are already verified elsewhere.
- Required evidence views are present and provenance-linked.
- A primary reviewer and a second-person verifier have recorded reviewer agreement.
- Annotation QA is `QA_ACCEPTED`.

## Controlled Fields

All numeric values are normalized ratios or approximate degrees, never raw pixels.

| Field | Value range | Evidence views | Notes |
| --- | --- | --- | --- |
| `faceWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Normalize to face length or canonical head box height. |
| `faceLength` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Normalize to face width or canonical head box width. |
| `foreheadWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Mark unavailable when hair hides the boundary. |
| `templeWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Requires visible temples. |
| `cheekboneWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Requires reviewable cheek boundaries. |
| `jawWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Lower-face width normalized to face width. |
| `jawAngle` | `45` to `170` degrees | Front, 3Q, profile | Approximate angle only when visible. |
| `chinWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Chin width normalized to face width. |
| `chinHeight` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Chin height normalized to lower-face height. |
| `chinProjection` | `0` to `2` normalized ratio | Profile or 3Q | Do not infer from front-only evidence. |
| `eyeSize` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Requires unobstructed eyes. |
| `eyeSpacing` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Normalize to face width. |
| `eyeTilt` | `-30` to `30` degrees | Front, left 3Q, right 3Q | Approximate tilt only. |
| `browPosition` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Brow-to-eye or brow-to-face ratio. |
| `noseLength` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Normalize to face length. |
| `noseWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Normalize to face width. |
| `noseProjection` | `0` to `2` normalized ratio | Profile or 3Q | Do not infer from front-only evidence. |
| `noseTipForm` | controlled values only | Front, 3Q, profile | Allowed values: `roundedApex`, `pointedApex`, `broadApex`, `flatApex`, `asymmetricApex`. |
| `mouthWidth` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Normalize to face width. |
| `lipProportions` | `0` to `2` normalized ratio | Front, left 3Q, right 3Q | Upper-to-lower lip height ratio. |
| `earHeight` | `0` to `2` normalized ratio | Profile or 3Q | Do not claim both ears from one visible side. |
| `earProjection` | `0` to `2` normalized ratio | Profile or 3Q | Mark unavailable when hair obstructs the ear. |
| `symmetryIndicators` | each ratio `0` to `0.5` | Front, left 3Q, right 3Q | Controlled object: face midline, eye height, jaw side, and mouth-corner deltas. |

## Measurement Source

Each field must use one of:

- `LANDMARK_MEASUREMENT`
- `MANUAL_FROM_STANDARDIZED_IMAGE`
- `HYBRID_LANDMARK_AND_REVIEW`
- `HUMAN_REVIEW`
- `UNAVAILABLE`

Purely unavailable fields must have `value: null`, `confidence: 0`, `measurementSource: UNAVAILABLE`, and a `missingReason`.

## Missing-Data Behavior

The required missing-data behavior is `MARK_UNAVAILABLE_DO_NOT_INFER`.

If an evidence view is missing, blurred, obstructed, not standardized, or not appropriate for a field, the field must be marked `UNAVAILABLE` or `NOT_APPLICABLE`. Reviewers must not fill a value to make the form look complete.

## Confidence

Confidence is a numeric value from `0` to `1`.

- `0` means unavailable or not reviewable.
- Low confidence is acceptable for research context but must be explained.
- A field with a measured or controlled-review value must have supporting evidence and confidence greater than `0`.
- Confidence is not identity probability.

## Reviewer Agreement

Reviewer agreement must record:

- `NOT_REVIEWED`, `SINGLE_REVIEWER`, `AGREED`, `DISPUTED`, or `ADJUDICATED`.
- Primary reviewer ID.
- Second reviewer ID when agreement, dispute, or adjudication is claimed.
- Agreement score when available.
- Field-level disagreement records when disputed.

Annotation QA cannot be accepted while reviewer disagreement is unresolved.

## Annotation QA

QA states are:

- `DRAFT`
- `QA_READY`
- `QA_ACCEPTED`
- `QA_REJECTED`
- `RECAPTURE_REQUIRED`

`QA_ACCEPTED` requires:

- Native label preserved.
- Verified head preset only.
- Evidence views allowed for each field.
- No sensitive traits.
- Missing data marked unavailable.
- Reviewer agreement recorded.
- No unresolved blockers.

## Prohibited Labels

Annotations must not include race, ethnicity, attractiveness, personality, health, criminality, identity, celebrity resemblance, or subjective lifestyle labels. Native game labels remain separate from researcher-applied geometry metadata.

## Artifacts

- TypeScript contract: `web/lib/phase-zero/phase-zero-verified-head-geometry-annotation.ts`
- JSON schema: `data/schemas/verified-head-geometry-annotation.schema.json`
- JSON form template: `data/phase-zero/annotation-forms/verified_head_geometry_annotation_form.template.json`
- CSV form template: `data/phase-zero/annotation-forms/verified_head_geometry_annotation_form.template.csv`
- Validation command: `npm run cf27:verified-head-geometry-annotations:check`
