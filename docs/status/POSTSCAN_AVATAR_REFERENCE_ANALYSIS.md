# Post-Scan Avatar Reference Analysis

Status: Prompt 130 reference analysis  
Date: 2026-08-16  
Reference folder: `source-media/Picture pairs`  
Valid pairs reviewed: 19  
Contact sheet: `docs/status/visual-evidence/prompt130/reference-analysis-contact-sheet.png`

## Scope

This analysis compares owner-provided real-person and sports-game avatar pairs to define how the GameFace Match post-scan avatar should transform a real scan into a synthetic sports-game style portrait.

The output avatar must remain local, deterministic, privacy-safe, and synthetic. It must not paste the raw scan into the UI, use official game assets, use cloud generation, or imply that GameFace Match can create an exact game model.

## Pairs Reviewed

- Bruno Fernades
- Cj Baxter
- Declan Rice
- Erling Haaland
- Harry Kane
- Ja'Marr Chase
- Josh Allen
- Kenny Minchey
- Kylian Mbappe
- Lamar Jackson
- Lamine Yamal
- Lionel Messi
- Michael Olise
- Myles Garrett
- Parick Mahomes
- Sam Darnold
- Vinicius Jr
- Vitinha
- Willie Rodriguez

## Features Consistently Preserved

Face width and height are usually preserved as broad proportions rather than exact contours. Wider faces remain visibly wide, longer faces remain long, and compact faces remain compact, but the game portraits smooth the outline into a cleaner created-player mesh.

Jaw and chin shape remain strong identity cues. Square jaws, narrow chins, fuller lower faces, and longer chins are retained more consistently than small skin texture details.

Complexion family is preserved, but not photometrically. The game avatars keep the broad light, medium, tan, brown, or deep complexion read while remapping it through stadium lighting and smoother material response.

Hair silhouette is one of the strongest preserved features. Close-cropped hair, high-volume short hair, slicked hair, curls, locs, and longer top shapes remain recognizable even when strand detail is simplified.

Eye spacing and placement are preserved as structural cues. The avatar usually keeps wide-set versus close-set eyes and brow height, but the eye material becomes smaller, darker, and more shaded than the real photo.

Nose shape is preserved as a tendency: wider versus narrower bridge, longer versus shorter nose, and broader versus tighter nostril area. Fine asymmetry is simplified.

Mouth width is preserved more than expression. Real smiles, teeth, and lip detail are often reduced into a neutral or focused game expression.

Facial hair presence and coverage are preserved when obvious. Beards, moustaches, stubble, and jaw coverage remain useful identity cues, but they are simplified into tonal regions rather than detailed follicles.

## Features Consistently Stylized

Skin texture is simplified. Real pores, blemishes, wrinkles, and photographic sharpness are reduced into smooth planes with light surface noise and broad cheek, brow, nose, and jaw shading.

Lighting becomes cinematic. Game portraits use stronger directional key light, darker sockets, rim light, and stadium/arena color temperature rather than the flat ID-photo lighting in several real references.

Eyes are stylized heavily. Game eyes are smaller and more recessed, with eyelid shadows and subdued sclera. Bright, open, icon-like eyes read as cartoon and should be avoided.

Hair texture is simplified into silhouette plus a limited number of chunky strands or material bands. It should not become a pasted photograph, but it also cannot be a single flat cap.

Jersey and neck integration are important. The game avatars feel believable partly because the head sits on a neck and athletic shoulders with a jersey/collar crop. A floating head icon reads too much like a generic avatar.

Background treatment is synthetic. Dark stadium, arena, locker-room, or roster-card lighting is common. Real room backgrounds are never part of the desired final avatar.

## Cross-Pair Conclusions

The strongest broad identity cues are complexion family, hair silhouette, face width, jaw/chin shape, brow/eye spacing, nose scale, and facial hair coverage. These should drive the GameFace Match synthetic avatar.

The details that get simplified are skin surface texture, exact eye rendering, individual hair strands, photographic expression, teeth, background, and clothing logos. The avatar should therefore avoid photoreal claims and aim for a believable created-player portrait.

GameFace Match must preserve scan-derived geometry and visible appearance categories, but it should stylize the surface. The right target is not a face crop with filters and not a cartoon emoji. It is a local roster-portrait render that says, "this is a video-game version of the scanned person."

The previous renderer direction was still too weak as a final state because it relied on a simple procedural face shape with flat fills and a few strokes. Even after Prompt 129, the avatar could still read as vector art at close range. The reference pairs show that the avatar needs more layered planes, neutral expression, compact eyes in sockets, stronger hair silhouette, neck/jersey integration, and sports lighting.

## Renderer Recommendation

Use a deterministic hybrid 2.5D, part-based synthetic renderer:

- Keep deriving all identity cues from the scan feature model.
- Render modular parts for head shape, cheek planes, under-eye planes, nose bridge, jaw/chin, hair silhouette, hair strands, facial hair, neck, shoulders, jersey, and stadium lighting.
- Use multiple transparent layers and masks so the face reads like a modeled surface rather than a flat icon.
- Keep expression neutral and focused.
- Avoid raw scan pixels in the final avatar. The scan may feed analysis only.
- Avoid official game assets, logos, team uniforms, or copyrighted player models.

## Prompt 130 Implementation Notes

The renderer was rebuilt around richer 2.5D SVG composition rather than a single flat face icon. The output remains a deterministic SVG data URL and still excludes `<image>`, `href`, raw photo texture, and canvas `drawImage`.

The new renderer adds:

- clipped face-plane shading
- deterministic skin micro-detail
- smaller eyes with darker socket treatment
- neutral lip/mouth rendering
- modular hair-strand layers
- reduced facial-hair opacity and coverage shaping
- neck, collar, shoulders, jersey folds
- dark synthetic stadium/roster lighting
- a subtle glass/ring treatment in the post-scan crop

The implementation intentionally preserves the locked scan flow, game-tile layout, tile names, tile routes, and production catalog gates.

