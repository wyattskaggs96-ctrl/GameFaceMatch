# Second Verifier Handoff

**Status:** VERIFIER-READY PACKAGE PREPARATION - VERIFICATION HAS NOT OCCURRED  
**Generated:** 2026-07-14T18:45:00-04:00  
**Production recommendations enabled:** false

## What The Verifier Must Independently Inspect

- Recreate or inspect the Xbox Road to Glory creation environment.
- Record game version, patch, platform, console model, and mode before reviewing catalog records.
- Independently count Head Template, Skin Tone, Skin Details, Eye Shape, Eye Color, Nose, Ear Shape, Hair, hairstyles, facial hair, and any other visible appearance controls.
- Preserve native order exactly.
- Review every current primary-review candidate only after independent counts are complete.
- Review duplicate/continuity records separately; do not merge them silently.

## Environment Requirements

- Platform family: Xbox.
- Mode: Road to Glory.
- Game version: UNRESOLVED.
- Patch: UNRESOLVED.
- Environment blocker: yes.
- Unresolved fields: gameVersion, patchVersion, consoleModel, consoleOSVersion, edition, storefrontRegion, copyType, entitlementStatus.

## Candidate Queue

- Total candidate records: 85.
- Ready for evidence review after independent count: 80.
- Duplicate or continuity review required: 5.
- Blocked until repair or recapture: 0.
- Full production verification blocked: true.

The machine-readable queue is `data/phase-zero/verifier_candidate_queue.json`.

## Required Full Recounts

- Head Template.
- Skin Tone.
- Skin Details.
- Eye Shape.
- Eye Color.
- Nose.
- Ear Shape.
- Hair menu and any visible child controls.
- Hairstyles, hair colors, facial hair, and facial-hair colors if visible.
- Mouth Shape, Jaw Shape, Chin, and any additional Head & Skin controls if visible.

## Secondary-Angle Sampling Procedure

Use the documented deterministic 25% method: hash `environment_id + verifier_id + catalog_version` with each eligible catalog ID, sort by SHA-256, and select the first quartile per category. Store the seed and selected IDs. Do not cherry-pick.

## Allowed Verification Statuses

- VERIFIED
- VERIFIED_WITH_NOTES
- RECAPTURE_REQUIRED
- VERSION_MISMATCH
- MISSING_EVIDENCE
- COUNT_MISMATCH
- ORDER_MISMATCH
- DEPENDENCY_UNRESOLVED
- NOT_VERIFIED

## What The Verifier Must Not Assume

- Do not assume current research counts are complete.
- Do not assume Face 29 is final.
- Do not assume Face 30 or Face 31 proves a final range.
- Do not infer missing hairstyle, hair color, facial-hair, body, or dependency options.
- Do not treat primary-review status as verification.
- Do not use College Football 26 or any other game as a substitute.

## How To Submit Disagreements

For each disagreement, submit target ID, category, native label/index observed, native order observed, source evidence, timestamp, discrepancy type, and whether recapture is required. Do not average conflicting counts or resolve them without direct evidence.

## Final Sign-Off Requirements

The verifier package can only support production import after independent counts, evidence review, discrepancy resolution, required secondary-angle sampling, allowed final statuses, and catalog-manager approval are complete.
