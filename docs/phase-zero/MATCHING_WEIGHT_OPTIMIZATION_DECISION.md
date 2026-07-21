# Matching Weight Optimization Decision

**Status:** NOT ADOPTED - NO REAL COMPLETED STUDY DATA  
**Date:** 2026-07-20
**Baseline model:** `rule-based-web-mvp-v2-rgb-geometry`  
**Production recommendation status:** FAIL-CLOSED  
**Data policy:** Real feasibility-study results only; synthetic fixtures excluded  

## Decision

No matching weights were changed, no new matcher version was adopted, and no rollback is required.

The optimization request depends on real completed feasibility-study results. A fresh validation pass on 2026-07-20 found 0 valid participants and 0 completed result rows in the repository. The production College Football 27 catalog is also empty, so verified production recommendations cannot be rerun or compared.

Changing weights from a zero-row dataset, synthetic fixtures, research candidates, or placeholder records would overfit by definition and would violate the project rule that real user-facing recommendations require verified production catalog data.

## Baseline Preserved

The active baseline remains `rule-based-web-mvp-v2-rgb-geometry`.

| Feature | Group | Baseline weight | New weight |
| --- | --- | ---: | ---: |
| faceWidthRatio | Face and jaw shape | 0.12 | 0.12 |
| faceLengthRatio | Face and jaw shape | 0.05 | 0.05 |
| foreheadWidthRatio | Face and jaw shape | 0.07 | 0.07 |
| jawWidthRatio | Face and jaw shape | 0.11 | 0.11 |
| chinWidthRatio | Face and jaw shape | 0.07 | 0.07 |
| lowerFaceRatio | Face and jaw shape | 0.05 | 0.05 |
| jawAngle | Face and jaw shape | 0.04 | 0.04 |
| eyeSpacingRatio | Eyes and eyebrows | 0.09 | 0.09 |
| meanEyeWidthRatio | Eyes and eyebrows | 0.05 | 0.05 |
| eyeTilt | Eyes and eyebrows | 0.03 | 0.03 |
| browPosition | Eyes and eyebrows | 0.04 | 0.04 |
| noseWidthRatio | Nose | 0.09 | 0.09 |
| noseLengthRatio | Nose | 0.07 | 0.07 |
| noseProjection | Profile projection | 0.05 | 0.05 |
| chinProjection | Profile projection | 0.04 | 0.04 |
| mouthWidthRatio | Mouth | 0.07 | 0.07 |

Appearance weights are also unchanged.

## Required Checks

| Requirement | Outcome |
| --- | --- |
| Preserve original baseline | Passed. Baseline model and weights are unchanged. |
| Separate tuning from evaluation records where sample size allows | Not available. There are 0 real completed study records. |
| Avoid overfitting | Passed by no-op. No synthetic or zero-row tuning was performed. |
| Document every weight change | No changes. |
| Document rationale | No real completed study data exists; tuning is blocked. |
| Rerun all participants | Not applicable; 0 participants are available. |
| Compare old and new performance | Not calculable; no candidate model exists and no real outcomes exist. |
| Confirm no demographic or sensitive-trait inference | Confirmed. No demographic, identity, or sensitive-trait data was used. |
| Confirm skin presentation does not distort geometry | Confirmed. Skin presentation remains outside geometric similarity. |
| Version the new matcher | Not applicable. No new matcher was adopted. |
| Allow rollback | Baseline remains active; rollback is a no-op. |

## Performance Comparison

| Metric | Baseline | Candidate |
| --- | ---: | ---: |
| Valid participants | 0 | Not adopted |
| Top-one acceptance | Not calculable | Not adopted |
| Top-three usefulness | Not calculable | Not adopted |
| Average resemblance rating | Not calculable | Not adopted |
| Median resemblance rating | Not calculable | Not adopted |
| Inter-reviewer agreement | Not calculable | Not adopted |
| Confidence calibration | Not calculable | Not adopted |

## Adoption Rule

A future tuned model may be adopted only when measured real-data results improve without unacceptable regressions. At minimum, that future decision must include:

1. The baseline model version and weights.
2. The candidate model version and weights.
3. A tuning/evaluation split, or an explicit small-sample limitation. If the study has fewer than 20 completed participants, do not treat automatic weight tuning as validated.
4. Participant rerun results for both baseline and candidate.
5. Top-one, top-three, resemblance, agreement, confidence-calibration, mismatch, and repeatability comparisons.
6. Confirmation that geometry remains independent from skin presentation.
7. Confirmation that no sensitive traits, identity signals, raw media, or demographics were used.
8. Rollback instructions to the prior model.

## Next Prerequisite

Do not attempt matching-weight optimization again until the project has a nonempty verified production catalog and accepted real feasibility-study results.
