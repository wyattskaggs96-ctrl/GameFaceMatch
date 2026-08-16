# GameFace Morph Target Spec V1

Status: local implementation contract for `GAMEFACE_3D_AVATAR_V1`

The reusable neutral head is a synthetic GameFace runtime asset. Wyatt's fitted head is reference/calibration only and is not the permanent neutral identity for customers.

## Runtime Asset

- Model: `web/public/models/gameface/avatar/gameface_neutral_head_v1.glb`
- Generator: `web/scripts/generate-gameface-neutral-head.mjs`
- Renderer flag: `GAMEFACE_3D_AVATAR_V1` / `NEXT_PUBLIC_GAMEFACE_3D_AVATAR_V1`
- Production default: off
- Private source images: excluded
- Official game assets: excluded

## Morph Targets

Each target physically deforms the neutral head mesh through glTF morph target position deltas. Runtime values are clamped to `[-1, 1]`, with `0` as neutral.

| Target | Range | Purpose |
| --- | --- | --- |
| `head_width` | -1 to 1 | Overall cranial width |
| `head_height` | -1 to 1 | Overall head height |
| `head_depth` | -1 to 1 | Forward/back head depth |
| `forehead_width` | -1 to 1 | Upper-face width |
| `forehead_height` | -1 to 1 | Upper forehead height |
| `cheek_width` | -1 to 1 | Mid-face cheek width |
| `cheek_fullness` | -1 to 1 | Forward cheek volume |
| `jaw_width` | -1 to 1 | Lower-face jaw width |
| `jaw_angle` | -1 to 1 | Jawline angle and squareness |
| `jaw_depth` | -1 to 1 | Forward jaw volume |
| `chin_width` | -1 to 1 | Chin width |
| `chin_height` | -1 to 1 | Chin vertical size |
| `chin_projection` | -1 to 1 | Forward chin projection |
| `chin_roundness` | -1 to 1 | Chin softness versus point |
| `eye_spacing` | -1 to 1 | Distance between the eyes |
| `eye_size` | -1 to 1 | Eye opening size |
| `eye_depth` | -1 to 1 | Eye socket depth |
| `brow_height` | -1 to 1 | Vertical brow placement |
| `nose_width` | -1 to 1 | Nose bridge and base width |
| `nose_length` | -1 to 1 | Nose vertical length |
| `nose_projection` | -1 to 1 | Forward nose projection |
| `nose_bridge_height` | -1 to 1 | Bridge height |
| `mouth_width` | -1 to 1 | Mouth width |
| `upper_lip_fullness` | -1 to 1 | Upper lip fullness |
| `lower_lip_fullness` | -1 to 1 | Lower lip fullness |
| `ear_size` | -1 to 1 | Ear size |
| `ear_projection` | -1 to 1 | Ear projection |
| `neck_width` | -1 to 1 | Neck width |

## Safety Rules

- Unsupported scan traits stay neutral.
- Low-confidence scan traits are weighted down before morph application.
- All morphs clamp to the safe range before rendering.
- The renderer must fall back to the existing synthetic avatar on WebGL, GLB, material, or morph failure.
- No raw scan image is used as a visible texture.

## Current Limitations

- This is a local feature-flagged implementation, not production default.
- The neutral head is synthetic and reusable, but the visual style still needs owner likeness review.
- Real multi-person validation has not started.
