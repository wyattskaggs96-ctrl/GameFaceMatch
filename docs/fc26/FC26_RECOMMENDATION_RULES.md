# FC 26 Recommendation Rules

Last updated: 2026-08-01

The FC 26 MVP uses deterministic, rule-based recipe guidance. The rules consume normalized measurements and the observed controls from `data/research/fc26/player_creator_research.json`.

## Rule Principles

- Do not invent FC 26 controls.
- Do not select exact preset numbers when preset visual meaning is not cataloged.
- Do not use skin tone, complexion, hair color, facial hair, or other presentation controls for geometric similarity.
- Keep appearance controls manual unless the user confirms a value.
- Label all automatic outputs as directional guidance or manual selection.
- Preserve source traceability from measurement to rule to FC 26 control.

## Directional Rules

| Control ID | FC 26 label | Measurement basis | Output |
| --- | --- | --- | --- |
| `FC26_HEAD_JAW` | Jaw | `jaw_to_cheek_ratio` | Wider or narrower/softer jaw direction. |
| `FC26_HEAD_CHIN` | Chin | `chin_length`, `chin_projection_estimate` | Longer, shorter, more projected, or less projected chin direction. |
| `FC26_FACE_NOSE` | Nose | `nose_to_face_width_ratio`, `nose_projection_estimate` | Wider, narrower, more projected, or less projected nose direction. |
| `FC26_FACE_EYES` | Eyes | `eye_spacing` | Wider or narrower eye-spacing direction. |
| `FC26_FACE_EYEBROWS` | Eyebrows | `eyebrow_height` | Higher or lower brow direction. |
| `FC26_FACE_MOUTH` | Mouth | `mouth_to_face_width_ratio` | Wider or narrower mouth direction. |
| `FC26_HEAD_FOREHEAD` | Forehead | `forehead_height` | Taller or shorter upper-face direction. |
| `FC26_HEAD_CHEEKS` | Cheeks | `cheekbone_width` | Broader or narrower cheek direction. |

## Manual Selection

The following remain manual in the MVP:

- Skin Tone
- Complexion
- Skin Surface
- Freckles
- Scarring
- Moles
- Rosacea
- Face Makeup
- Lip Makeup
- Neck
- Eye Colour
- Teeth
- Hair Colour
- Hair Style group
- Hair Style
- Eyebrow & Facial Hair Colour
- Eyebrow shape rows
- Facial Hair

These controls are observed in FC 26 research data, but the available footage does not support a defensible mapping from human reference measurements to exact game values.

## Screenshot Iteration

Screenshot comparison uses the same normalized measurement IDs where both the reference and screenshot have usable values. The output ranks the largest proportional differences and maps them to the affected FC 26 controls.

The score shown by the MVP is an internal geometric similarity score across available measurements. It must not be described as identity confidence, identity probability, biometric verification, or resemblance guarantee.
