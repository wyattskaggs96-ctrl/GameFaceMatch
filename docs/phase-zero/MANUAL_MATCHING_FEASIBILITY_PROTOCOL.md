# Manual Matching Feasibility Protocol

**Status:** protocol and workflow template only
**Production status:** NOT PRODUCTION DATA  
**Study status:** NOT STARTED  

This package prepares the future 10-20-subject manual feasibility study for GameFace Match. Do not run the study until a sufficiently complete, independently verified College Football 27 catalog release exists. Do not use research candidates, fixture records, public-source-only records, or placeholder records as real study options.

## Purpose

The study asks whether GameFace Match can produce useful top-three recommendations from a verified College Football 27 appearance catalog, and whether human reviewers and participants agree that those recommendations are usable. It measures usefulness and perceived resemblance, not identity probability.

The study must not claim:

- direct face import into College Football 27
- official EA, EA SPORTS, NCAA, school, conference, or console affiliation
- identity recognition
- perfect resemblance
- medical, biometric, or sensitive-trait inference

## Start Gates

Do not begin until all gates are satisfied:

1. A sufficiently complete College Football 27 catalog release is approved by the catalog manager.
2. The release has second-person verification for the categories being studied.
3. Head-template records include verified menu paths, source evidence, catalog version, platform, game version, patch/update state where known, and creation path.
4. Hair and facial-hair categories are included only if they are verified in the same release.
5. The study operator has a deletion plan for all subject raw media.
6. The consent language below has been reviewed for the actual beta context.

## Participant Count

Target 10-20 consenting subjects. Fewer than 10 participants is useful only for dry-run workflow testing and must not be treated as a feasibility conclusion. More than 20 participants should require a protocol update before collection continues.

## Consent Language

Use plain language before any photo collection:

> GameFace Match is an independent companion product for College Football 27. This study asks reviewers to compare your submitted face-reference photos with verified in-game appearance options and record the most useful top-three matches. GameFace Match does not directly import your face into College Football 27, does not identify you, and does not infer sensitive traits such as ethnicity, health, personality, intelligence, attractiveness, or age.
>
> Your photos are used only for this manual recommendation study unless you separately agree to another use. Raw photos are temporary by default and will be deleted after review and confirmation. The study stores a pseudonymous participant ID, reviewer selections, usefulness ratings, mismatch reasons, catalog version, and deletion confirmation. You may withdraw before your result is finalized, and the operator must delete your raw media on request.

Required consent acknowledgments:

- I am the person shown in the photos, or I have permission from the person shown.
- I consent to temporary local processing of the submitted photos for this study.
- I consent to human reviewers evaluating the submitted photos against verified game options.
- I consent to storing non-image study records under a pseudonymous participant ID.
- I understand raw photos are deleted by default after review.
- I understand GameFace Match is independent and does not import my face into the game.

Optional consent, disabled unless separately implemented:

- Future product-improvement contact.
- Raw image retention.
- Public sharing.
- Model training.

## Privacy And Deletion Rules

- No account is required.
- Use pseudonymous participant IDs only, for example `participant-study-v1-001`.
- Do not record names, email addresses, gamer tags, school affiliation, or other direct identifiers in the CSV templates.
- Raw subject photos must not be committed to the repository.
- Raw photos stay local to the study operator’s approved storage and are deleted after review unless separately retained by explicit written consent.
- Store only non-image rows in the templates.
- Confirm raw-media deletion and derived-profile deletion in `manual_matching_results.template.csv`.
- If a participant withdraws before finalization, mark the subject withdrawn in the study operator’s private working records and delete raw media.

## Subject Photo Requirements

Capture or collect five RGB reference views:

1. Straight-on.
2. Left 45 degrees.
3. Right 45 degrees.
4. Left profile.
5. Right profile.

Photo instructions:

- Use even front lighting.
- Avoid strong backlighting and strong shadows.
- Use a neutral expression.
- Keep lips gently closed.
- Remove hats and headwear.
- Remove glasses where practical.
- Pull hair away from cheeks and ears where practical.
- Include one person only.
- Keep the face centered and in focus.
- Avoid blur and motion.
- Do not use filters, beauty effects, generative edits, or face-altering edits.

If a subject cannot complete a pose exactly, record the limitation rather than excluding them automatically.

## Human Feature-Annotation Form

Use the controlled taxonomy. Reviewer annotations must be objective and reviewable. Do not use race, ethnicity, attractiveness, personality, identity, criminality, health, or real-person resemblance labels.

Record notes for:

- face width
- face length
- forehead
- temples
- cheekbones
- jaw
- chin
- eyes
- brows
- nose
- mouth
- ears
- hairline
- occlusion

## Reviewer Workflow

Each subject needs at least two independent reviewers.

1. Confirm all five reference views are present and usable.
2. Review the verified catalog release only.
3. Select top-three head choices in rank order.
4. Select hair and facial-hair options only from verified catalog records.
5. Record reasons for every selection.
6. Record mismatch reasons if a candidate is weak.
7. Complete reviewer comparison after both independent reviews are submitted.
8. Ask the participant to rate usefulness and select the best available top-three option.
9. Confirm raw-media deletion and profile deletion.

## App Recommendation Snapshot

For each participant, record the original app-generated top three before any human review changes:

- catalog item IDs
- stable internal IDs
- match scores as presented by the app
- confidence score or label
- matching algorithm version
- catalog version
- generation timestamp

Do not edit the original top-three snapshot after reviewers or participants respond.

## Top-Three Head-Ranking Form

Required fields are in `data/phase-zero/manual_matching_reviews.template.csv`:

- participant ID
- reviewer ID
- review completion timestamp
- top head rank 1 catalog ID and reason
- top head rank 2 catalog ID and reason
- top head rank 3 catalog ID and reason
- feature annotations
- mismatch reasons
- notes

## Hair And Facial-Hair Selection Form

Record:

- verified hair catalog ID
- hair reason
- verified facial-hair catalog ID, or blank when none is appropriate and verified
- facial-hair reason

Do not invent hairstyle, hair color, facial-hair, or menu labels.

## Reviewer Comparison Form

After independent reviews:

- record reviewer A and reviewer B
- whether reviewers agreed on top choice
- whether reviewers agreed on the top-three set
- disagreement details
- mismatch reason codes

Never average conflicting observations. Log the disagreement.

## Participant Usefulness Rating

After showing the participant the top-three candidate summary, ask:

- Which rank, if any, would you use?
- How useful is the recommendation from 1 to 5?
- What was the main mismatch?
- Would any verified hair or facial-hair change make the result more useful?
- How close was the final in-game result from 1 to 5?
- Which in-game option did the participant actually keep, if any?

## Repeatability

When practical, repeat the same capture flow for the participant after a short break. Record whether the top choice stayed the same and how many of the top-three recommendations overlapped. Repeatability records are not required for every participant, but they must be labeled as not measured until enough real repeat scans exist.

## Metrics

Top-one acceptance:

```text
count(participant_selected_rank == 1 or top_one_accepted == yes) / completed_results
```

Top-three usefulness:

```text
count(participant_selected_rank in [1,2,3] or top_three_useful == yes) / completed_results
```

Additional analysis:

- rank selected distribution
- average participant usefulness rating
- average resemblance rating
- reviewer top-choice agreement
- reviewer top-three-set agreement
- disagreement count
- mismatch-reason taxonomy counts
- deletion confirmation count
- repeat-scan top-choice stability
- repeat-scan top-three overlap
- capture failure rate
- confidence perception

## Mismatch-Reason Taxonomy

Allowed codes:

- `headShapeMismatch`
- `jawMismatch`
- `eyeMismatch`
- `noseMismatch`
- `mouthMismatch`
- `hairMismatch`
- `facialHairMismatch`
- `bodyPreferenceMismatch`
- `catalogCoverageGap`
- `captureQuality`
- `lightingOrPose`
- `participantPreference`
- `reviewerDisagreement`
- `uncertain`

## Templates

- Subjects: `data/phase-zero/manual_matching_subjects.template.csv`
- Reviews: `data/phase-zero/manual_matching_reviews.template.csv`
- Results: `data/phase-zero/manual_matching_results.template.csv`
- Repeatability: `data/phase-zero/manual_matching_repeatability.template.csv`

The committed templates are header-only. Fill copies outside the repository or in an approved private study workspace. Do not commit raw photos or real participant-identifying information.

## Validation And Analysis

Use:

```bash
node scripts/manual-matching-feasibility.mjs validate
node scripts/manual-matching-feasibility.mjs analyze
node scripts/manual-matching-feasibility.mjs export-anonymized --out data/phase-zero/exports/manual_matching_anonymized_results.json
```

The script validates headers, consent flags, five required views, reviewer coverage, result rows, deletion confirmation, placeholder values, and participant-count gates. Header-only templates are valid as templates but produce no study metrics.

## Completion Criteria

The study can support a Phase 0 feasibility conclusion only when:

- 10-20 consenting subjects are complete.
- All required views are present or documented.
- At least two reviewers completed independent review per subject.
- All reviewed catalog IDs come from the verified release being tested.
- Raw-media deletion is confirmed for every completed participant unless explicit retention consent exists.
- Top-one and top-three metrics are computed from real completed rows.
- Disagreements and mismatch reasons are logged.

This protocol does not mark Phase 0 complete and does not enable production recommendations.
