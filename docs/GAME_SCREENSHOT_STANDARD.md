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

## Derivative Crop and Alignment

Derivative images may be created only to make reviewed evidence easier to inspect. Approved derivative transforms are crop, rotation correction, aspect-ratio preservation, standard framing guides, and face-region alignment guides.

Derivative rules:

- Never overwrite the original master evidence file.
- Link every derivative back to the master evidence ID, master relative path, checksum, view, source dimensions, and operator notes.
- Store transformation metadata with crop coordinates, rotation degrees, aspect-ratio mode, framing guides, and alignment-guide confirmation.
- Export derivatives as separate files under an approved derivative evidence path.
- Do not apply beauty filters, generative edits, geometry warping, color restyling, or any modification that changes the depicted game option.
- Do not promote derivative metadata to production unless the corresponding master evidence remains available and portable.
