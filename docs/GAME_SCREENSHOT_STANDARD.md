# Game Screenshot Standard

NOT PRODUCTION DATA
NOT A VERIFIED GAME RECORD

Screenshots are local audit evidence. They must not automatically become public web assets.

## Required Views

- Straight-on
- Left 45 degrees
- Right 45 degrees
- Left profile
- Right profile

## Naming Pattern

`cfb27__REPLACE_WITH_PLATFORM_SLUG__REPLACE_WITH_GAME_VERSION_SLUG__REPLACE_WITH_STABLE_INTERNAL_ID__REPLACE_WITH_ANGLE_ID__REPLACE_WITH_CAPTURE_DATE_YYYYMMDD.png`

Allowed angle IDs:

- `straightOn`
- `left45`
- `right45`
- `leftProfile`
- `rightProfile`
- `navigationEvidence`

## Capture Conditions

Record display, camera, lighting, crop, zoom, menu state, and any abnormal condition. Use the same framing for all five required angles.

## Missing-Angle Handling

A record with any missing required angle remains unverified. The validator reports the missing angle and the next action is to recapture only that missing evidence.

## Capture Consistency QA

Capture-consistency QA compares audited evidence against environment-specific tolerances. Automated checks may measure or estimate dimensions, aspect ratio, crop consistency, head bounding-box size, head-center position, brightness, contrast, sharpness, and color balance.

Manual QA flags are required for observations the current tooling cannot prove as game facts:

- Overlay obstruction
- Cursor obstruction
- Missing skull, hairline, chin, or lower-face framing
- Unexpected hairstyle
- Unexpected facial hair
- Suspected loading animation or transient menu state

Automated and manual QA findings are warnings for human review only. They do not verify a College Football 27 option, create production catalog data, or replace second-person review.

## Derivative Crop and Alignment

Derivative images may be created only to make reviewed evidence easier to inspect. Approved derivative transforms are crop, rotation correction, aspect-ratio preservation, standard framing guides, and face-region alignment guides.

Derivative rules:

- Never overwrite the original master evidence file.
- Link every derivative back to the master evidence ID, master relative path, checksum, view, source dimensions, and operator notes.
- Store transformation metadata with crop coordinates, rotation degrees, aspect-ratio mode, framing guides, and alignment-guide confirmation.
- Export derivatives as separate files under an approved derivative evidence path.
- Do not apply beauty filters, generative edits, geometry warping, color restyling, or any modification that changes the depicted game option.
- Do not promote derivative metadata to production unless the corresponding master evidence remains available and portable.
