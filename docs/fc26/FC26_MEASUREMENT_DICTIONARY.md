# FC 26 Measurement Dictionary

Last updated: 2026-08-01

All measurements are normalized ratios or view-relative estimates produced from local RGB landmarks. They are used for manual recipe guidance only and are not identity recognition.

| Measurement ID | Label | Source view | Use | Limitation |
| --- | --- | --- | --- | --- |
| `face_width` | Face width | Front | General proportional context | Depends on detected face box. |
| `face_height` | Face height | Front | General proportional context | Depends on forehead/chin landmarks. |
| `face_width_to_height_ratio` | Face width-to-height ratio | Front | Broad versus long face guidance | Not a production catalog match score. |
| `forehead_height` | Forehead height | Front | Forehead direction | Hairline and bangs can reduce confidence. |
| `temple_width` | Temple width | Front | General head-width context | Uses face-edge approximation. |
| `cheekbone_width` | Cheekbone width | Front | Cheeks direction | Reduced landmark set uses face-edge approximation. |
| `jaw_width` | Jaw width | Front | Jaw direction | Facial hair and pose can affect landmarks. |
| `jaw_to_cheek_ratio` | Jaw-to-cheek ratio | Front | Jaw broadness direction | Only directional. |
| `chin_width` | Chin width | Front | Chin width context | Low confidence when chin is obscured. |
| `chin_length` | Chin length | Front | Chin length direction | Mouth expression can affect lower-face landmarks. |
| `chin_projection_estimate` | Chin projection estimate | Side profile | Chin projection direction | RGB approximation only, not depth. |
| `eye_width` | Mean eye width | Front | Eye-region context | Eye closure lowers quality. |
| `eye_height` | Eye height | Front | Unavailable in MVP | Required landmarks are not included in the reduced set. |
| `eye_spacing` | Eye spacing | Front | Eyes direction | Rotation can distort spacing. |
| `eye_tilt` | Eye tilt | Front | Eye angle context | Roll and expression can affect angle. |
| `eyebrow_height` | Eyebrow height | Front | Eyebrow direction | Hair or brow obstruction reduces confidence. |
| `eyebrow_angle` | Eyebrow angle | Front | Eyebrow direction | Uses two coarse brow landmarks. |
| `nose_length` | Nose length | Front | Nose context | Front-view only. |
| `nose_width` | Nose width | Front | Nose direction | Lighting and pose can affect nose-wing landmarks. |
| `nose_to_face_width_ratio` | Nose-to-face-width ratio | Front | Nose width direction | Only directional. |
| `nose_projection_estimate` | Nose projection estimate | Side or three-quarter | Nose projection direction | RGB approximation only, not depth. |
| `mouth_width` | Mouth width | Front | Mouth context | Smile or open mouth reduces quality. |
| `upper_lip_height` | Upper-lip height | Front | Lip context | Coarse approximation. |
| `lower_lip_height` | Lower-lip height | Front | Lip context | Coarse approximation. |
| `mouth_to_face_width_ratio` | Mouth-to-face-width ratio | Front | Mouth width direction | Neutral expression recommended. |
| `ear_height` | Ear height | Side profile | Unavailable in MVP | Reliable ear landmarks are not available. |
| `ear_projection` | Ear projection | Side profile | Unavailable in MVP | Reliable ear landmarks are not available. |

Every measurement output includes:

- internal ID;
- display label;
- normalized value or `unavailable`;
- source view;
- confidence;
- quality warnings;
- plain-language explanation.
