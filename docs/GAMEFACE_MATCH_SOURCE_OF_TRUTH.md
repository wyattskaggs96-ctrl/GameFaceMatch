# GameFace Match — College Football 27
## Product Requirements, Face-Capture Specification, Technical Architecture, and Build Source of Truth

**Document status:** Initial project source of truth  
**Version:** 1.0  
**Date:** July 10, 2026  
**Initial target game:** EA SPORTS™ College Football 27  
**Initial game mode:** Road to Glory player creation  
**Initial client platform:** iPhone  
**Working product name:** GameFace Match  
**Owner:** Wyatt Skaggs  

---

# 1. Purpose of This Document

This file contains the complete initial requirements for a mobile application that scans a user’s face and recommends the College Football 27 player-creation settings that most closely resemble that user.

This document should be treated as the main source of truth for product planning, UX design, data collection, technical implementation, testing, privacy, legal review, and future expansion.

The application must not claim that it can import a face directly into College Football 27. The initial product recommends the closest available in-game appearance options and teaches the user how to reproduce those settings manually.

The central product promise is:

> Take a guided face scan and receive the College Football 27 appearance settings that make your Road to Glory player look as much like you as the game allows.

---

# 2. Product Vision

Create the easiest and most accurate way for a sports gamer to build a created player that resembles them.

The product should eventually support multiple sports games, but the first version must be narrowly focused on College Football 27. The core reusable asset is a standardized facial profile that can be translated through a separate game-specific adapter for each supported title.

Long-term product model:

```text
User face capture
        ↓
Standardized facial profile
        ↓
Game-specific matching adapter
        ↓
Recommended presets, sliders, hair, facial hair, and physique
        ↓
User creates the player inside the game
        ↓
Screenshot feedback and refinement
```

The face scanner alone is not the main competitive advantage. The defensible product is the continuously improved mapping between real facial characteristics and each game’s available character-creation options.

---

# 3. Product Positioning

## 3.1 Recommended public promise

Use language such as:

- “Find the College Football 27 player build that looks most like you.”
- “Scan your face and get your closest Road to Glory appearance.”
- “Build yourself in College Football 27.”
- “Get your top three in-game face matches.”
- “Turn your face into a step-by-step player-creation guide.”

## 3.2 Claims the product must avoid

Do not claim:

- Perfect facial duplication
- Direct face import into College Football 27
- Official EA integration
- Official NCAA integration
- Guaranteed resemblance
- Biometric identification
- Identity verification
- Medical-grade facial measurement
- Access to hidden game assets
- Automated control of a user’s console or game
- That the application is endorsed by Electronic Arts, EA SPORTS, CLC, the NCAA, a school, a conference, or a console manufacturer

## 3.3 Required affiliation disclaimer

Use a clear disclaimer in the app, website, store listing, and marketing:

> GameFace Match is an independent companion application and is not affiliated with, endorsed by, or sponsored by Electronic Arts, EA SPORTS, CLC, the NCAA, any college or university, Sony, Microsoft, or Nintendo. All referenced trademarks belong to their respective owners.

Have final language reviewed before launch.

---

# 4. Verified College Football 27 Product Context

As of July 10, 2026, EA’s official College Football 27 materials state that Road to Glory allows the user to create a player from the ground up, customize facial appearance, gear, style, height, weight, and body type, or begin with a Legend Template.

EA’s public materials do not provide a complete structured inventory of every facial appearance option. Therefore, the project must perform an in-game audit of the shipping version and maintain its own versioned catalog.

Official EA references are listed in Section 32.

## 4.1 Important game-data rule

Never invent an appearance option, option number, menu path, category, slider, or preset.

Every game setting displayed to a user must originate from the verified College Football 27 Appearance Catalog created from the shipping game.

## 4.2 Versioning requirements

Every recommendation must be tied to:

- Game title
- Game release/version
- Platform
- Game update or patch version when known
- Game mode
- Player-creation path
- Player gender/body model if applicable
- Position if appearance or physique options vary by position
- Date the game catalog was last verified

Example:

```json
{
  "game": "EA SPORTS College Football 27",
  "gameVersion": "1.0.0",
  "platform": "PlayStation 5",
  "mode": "Road to Glory",
  "creationPath": "Custom Player",
  "catalogVerifiedAt": "2026-07-10"
}
```

---

# 5. Target Users

## 5.1 Primary user

A College Football 27 player who wants their Road to Glory athlete to resemble them but does not want to manually compare every in-game face, hairstyle, and appearance option.

## 5.2 Secondary users

- Sports-content creators
- Streamers
- TikTok creators
- Friend groups creating themselves
- Parents and children building family members
- High school and college athletes
- Users recreating friends with permission
- Users comparing multiple possible face presets
- Users who want an appearance guide without permanent account creation

## 5.3 Prohibited or restricted uses

The app must not be marketed or designed for:

- Identifying strangers
- Matching unknown people to names
- Law-enforcement identification
- Surveillance
- Access control
- Age verification
- Credit or employment decisions
- Health diagnosis
- Emotion or personality diagnosis
- Deceptive impersonation
- Creating someone else without their permission
- Scanning children without verified parent or guardian consent

---

# 6. MVP Goals

The MVP must:

1. Guide a user through a high-quality face capture.
2. Detect whether capture quality is sufficient.
3. Generate a standardized face profile.
4. Match that profile against a verified College Football 27 appearance catalog.
5. Return the best three head/face recommendations.
6. Recommend hair, hair color, facial hair, and other verified appearance categories.
7. Explain exactly how to reproduce the recommendation in Road to Glory.
8. Allow the user to correct uncertain appearance attributes.
9. Allow the user to upload a screenshot of the created player.
10. Compare the screenshot with the original face profile and suggest a better preset when appropriate.
11. Protect raw face data and explain all data handling.
12. Work without requiring the user to create an account for a basic scan.
13. Clearly communicate confidence and limitations.
14. Never display an invented game setting.

---

# 7. MVP Non-Goals

The MVP will not:

- Control the console
- Enter settings automatically
- Modify game files
- Read protected game memory
- Scrape hidden assets
- Bypass technical protections
- Use a user’s EA account credentials
- Upload a face directly to the game
- Create a photorealistic playable 3D head
- Support every sports game
- Support every Android device
- Perform identity recognition
- Store raw face media by default
- Guarantee submillimeter facial reconstruction
- Detect ethnicity
- Infer personality, intelligence, attractiveness, health, or criminality
- Create a digital clone for unrestricted use
- Generate a deepfake

---

# 8. Core User Journey

## 8.1 First-launch flow

1. Open app.
2. Read one-sentence product explanation.
3. Read independent-app disclaimer.
4. Select “Build Me in College Football 27.”
5. View privacy summary.
6. Choose:
   - Process scan without an account
   - Sign in to save builds
7. Grant camera permission.
8. Confirm age eligibility.
9. Confirm the user is scanning themselves or has permission from the person being scanned.
10. Begin preparation instructions.

## 8.2 Capture flow

1. Remove glasses and headwear.
2. Pull hair away from the face and ears.
3. Choose assisted scan or self-scan.
4. Complete lighting and distance check.
5. Hold a neutral expression.
6. Complete TrueDepth geometry pass on supported iPhones.
7. Capture standardized front, angle, and profile images.
8. Complete an optional rear-camera detail pass.
9. Review quality report.
10. Retake only failed sections.

## 8.3 Attribute confirmation flow

The app presents its estimates and asks the user to confirm or adjust:

- Hair color
- Hair type
- Hairstyle family
- Facial-hair presence
- Facial-hair style
- Eyebrow thickness
- Skin appearance range
- Freckles or visible marks when supported by the game
- Desired in-game height
- Desired in-game weight
- Preferred body type
- Whether the user prioritizes facial resemblance or desired athlete physique

## 8.4 Results flow

Display:

- Best match
- Second-best match
- Third-best match
- Confidence for each
- Why each option was selected
- Recommended hair
- Recommended hair color
- Recommended facial hair
- Any other verified game options
- Step-by-step menu instructions
- A save/share action
- A “Built it in the game” action

## 8.5 Refinement flow

1. User creates the athlete in College Football 27.
2. User captures a clean screenshot.
3. User uploads screenshot.
4. App checks screenshot quality.
5. App aligns the character’s face.
6. App calculates geometric and visual differences.
7. App suggests:
   - Keep current recommendation
   - Try second-ranked preset
   - Try third-ranked preset
   - Change hairstyle
   - Change facial hair
   - Change a verified slider or option
8. User can rate which result looks best.

---

# 9. Face-Capture Strategy

## 9.1 Recommended overall strategy

Use a hybrid capture system:

1. Front TrueDepth face tracking and depth on supported iPhones
2. High-resolution RGB reference images
3. Optional rear-camera multi-view detail capture
4. Real-time face landmarks and expression tracking
5. Automatic quality scoring
6. User confirmation for visually ambiguous attributes

No single image should be treated as the complete scan.

## 9.2 Capture modes

### Mode A — Premium assisted scan

Highest-quality mode.

Requirements:

- Supported iPhone with front TrueDepth camera
- A second person moves the phone around the stationary subject
- TrueDepth geometry pass
- Rear 1× camera detail pass
- Standard reference photographs
- Full quality validation

Use this mode for the best available matching accuracy.

### Mode B — Premium self-scan

Requirements:

- Supported iPhone with TrueDepth
- User holds the phone
- App guides the user through controlled head poses
- Standard reference photographs
- Optional mirror-assisted profile capture

This mode should be easier but may have lower ear, hair, and side-profile coverage.

### Mode C — Standard camera scan

Fallback for unsupported iPhones and eventual Android support.

Requirements:

- Multi-view RGB video
- Face landmarks
- Camera pose estimation
- Standard reference photographs
- No claim of TrueDepth-level geometry

The results screen must identify which capture mode produced the recommendation.

---

# 10. Subject Preparation Requirements

Before scanning, instruct the subject to:

- Sit or stand upright
- Keep shoulders relaxed
- Keep the head in a natural position
- Maintain a neutral facial expression
- Relax the jaw
- Keep lips gently closed
- Keep eyes naturally open
- Avoid smiling
- Avoid talking
- Avoid chewing
- Avoid raising eyebrows
- Remove glasses
- Remove sunglasses
- Remove hats, helmets, visors, and masks
- Remove large earrings that cover or distort ear shape
- Pull long hair away from cheeks
- Expose the forehead as much as reasonably possible
- Expose both ears for the geometry scan
- Avoid heavy makeup when the goal is natural facial resemblance
- Wipe the camera lenses
- Avoid scanning immediately after intense exercise if facial flushing is significant

The app must not fail a user solely because they have hair, facial hair, makeup, facial differences, mobility limitations, or assistive needs. It should explain what may reduce accuracy and allow the user to continue.

---

# 11. Environmental Requirements

Recommended environment:

- Plain or visually simple background
- Soft, diffuse front lighting
- Even lighting on both sides of the face
- No direct sunlight
- No moving shadows
- No strong light behind the subject
- No hard ceiling-only light
- No rapidly flickering light
- No colored party lighting
- No beauty filters
- No Portrait Mode background blur
- No digital zoom
- No dirty camera lens
- No multiple faces in frame

## 11.1 Lighting quality checks

The app should calculate:

- Face brightness
- Left/right illumination imbalance
- Highlight clipping
- Shadow clipping
- Color-cast severity
- Motion blur
- Focus sharpness
- Lens obstruction likelihood
- Background separation

Example blocking messages:

- “Move away from the window. One side of your face is too bright.”
- “Add light in front of you.”
- “Your face is too dark to scan accurately.”
- “Clean the camera lens.”
- “Only one person can be in the scan.”
- “Move hair away from your left cheek and ear.”

---

# 12. Exact Premium Capture Protocol

## 12.1 Pass 0 — Calibration

The app must:

1. Detect one face.
2. Confirm supported TrueDepth hardware.
3. Check camera permission.
4. Estimate subject distance.
5. Check face centering.
6. Check lighting.
7. Check head pose.
8. Check expression neutrality.
9. Lock or stabilize exposure and white balance when practical.
10. Display a live quality score.

The scan cannot begin until minimum thresholds are satisfied.

## 12.2 Pass 1 — Front TrueDepth geometry

Recommended duration: approximately 12–20 seconds.

The subject remains still while the phone moves, when assisted scanning is available.

Capture three arcs:

### Middle arc

- Start approximately 60 degrees left of center
- Move slowly through center
- Continue approximately 60 degrees right of center
- Maintain a consistent distance
- Keep the camera near eye level

### Upper arc

- Position phone slightly above eye level
- Angle gently downward
- Repeat left-to-right movement
- Capture forehead, brow, upper nose, and upper cheek coverage

### Lower arc

- Position phone slightly below eye level
- Angle gently upward
- Repeat left-to-right movement
- Capture chin, jaw, lower nose, and under-jaw coverage

## 12.3 Pass 2 — Standardized RGB reference images

Capture or automatically select:

1. Straight-on
2. Left 45-degree view
3. Right 45-degree view
4. Full left profile
5. Full right profile
6. Slightly elevated front view
7. Slightly lowered front view
8. Hairline close-up
9. Optional facial-hair close-up
10. Optional ear close-ups if ear shape is relevant to game options

Each image must pass:

- Focus threshold
- Blur threshold
- Face-size threshold
- Pose threshold
- Exposure threshold
- Occlusion threshold
- Neutral-expression threshold

## 12.4 Pass 3 — Rear-camera detail pass

This is recommended for assisted scanning.

Use:

- Main rear 1× camera
- No digital zoom
- No ultrawide unless specifically validated
- High-resolution frames
- Short total duration
- Consistent lighting
- Consistent distance

Capture three semicircular paths:

1. Eye-level pass
2. Slightly elevated pass
3. Slightly lowered pass

The app may record video, but it should retain only selected high-quality frames unless the user explicitly opts to retain the full recording.

## 12.5 Pass 4 — Review and selective retake

Show a coverage map.

Required regions:

- Forehead
- Left temple
- Right temple
- Left eyebrow
- Right eyebrow
- Left eye
- Right eye
- Nose bridge
- Nose tip
- Left cheek
- Right cheek
- Upper lip
- Lower lip
- Chin
- Left jaw
- Right jaw
- Left ear when visible
- Right ear when visible
- Hairline

Coverage states:

- Gray: missing
- Yellow: weak
- Green: sufficient
- Red: conflicting or unusable

Do not force a complete rescan when only one region is inadequate.

---

# 13. Data Captured Per Frame

Where supported, capture:

- RGB image or pixel buffer
- Depth map
- Camera timestamp
- Camera pose
- Camera intrinsics
- Lens/camera identifier
- Exposure duration
- ISO
- Focus state
- White-balance state
- Estimated head pose
- Face bounding box
- Face landmarks
- AR face geometry
- Expression/blendshape values
- Face-capture quality estimate
- Blur score
- Occlusion score
- Lighting score
- Device model
- Operating-system version
- App version
- Capture mode
- User consent version

Do not retain all of this indefinitely. Section 24 defines retention.

---

# 14. Real-Time Capture Quality Requirements

The app must detect and respond to:

- Face not found
- Multiple faces
- Face too close
- Face too far away
- Face partially outside frame
- Excessive head motion
- Excessive camera motion
- Motion blur
- Focus failure
- Blink
- Smile
- Mouth open
- Talking
- Raised eyebrows
- Severe squinting
- Hair covering landmarks
- Hand covering face
- Glasses
- Hat or mask
- Strong glare
- Strong shadow
- Overexposure
- Underexposure
- Missing side profile
- Missing lower jaw
- Missing forehead
- Inconsistent expression across frames
- Inconsistent lighting across frames

## 14.1 Recommended quality-score dimensions

```text
captureQuality =
    0.20 * sharpness +
    0.15 * exposure +
    0.15 * lightingUniformity +
    0.15 * poseCoverage +
    0.15 * landmarkConfidence +
    0.10 * expressionNeutrality +
    0.10 * occlusionFreedom
```

Weights must be validated and adjusted using real scan outcomes.

## 14.2 Blocking versus advisory failures

Blocking:

- No face
- Multiple faces
- Face mostly outside frame
- Severe blur
- Severe underexposure
- Severe overexposure
- Missing required front view
- Consent not accepted

Advisory:

- Ear partially hidden
- Hairline partially hidden
- Mild lighting imbalance
- Facial hair obscures jaw
- Profile not perfectly perpendicular
- Makeup may affect color matching

---

# 15. Face-Processing Pipeline

## 15.1 Stage 1 — Input validation

- Verify consent
- Verify the scan belongs to one person
- Verify sufficient frames
- Verify required pose coverage
- Verify device metadata
- Verify no corrupted frames

## 15.2 Stage 2 — Frame selection

Reject or down-rank frames with:

- Blur
- Blink
- Expression change
- Occlusion
- Extreme lighting
- Duplicate camera angle
- Low landmark confidence
- Inconsistent face scale
- Excessive compression

## 15.3 Stage 3 — Alignment

- Normalize head orientation
- Establish consistent facial coordinate system
- Align frames using stable facial landmarks
- Correct camera rotation
- Estimate scale
- Separate camera motion from subject motion
- Flag inconsistent geometry

## 15.4 Stage 4 — Base geometry

On supported iPhones, fuse:

- TrueDepth depth data
- ARKit face geometry
- Face landmarks
- Camera pose
- High-confidence profile boundaries

The geometry model is used for proportions and relative structure, not identity recognition.

## 15.5 Stage 5 — Multi-view refinement

Use RGB frames to improve:

- Facial outline
- Jawline
- Chin
- Nose profile
- Ear position
- Hairline
- Temple width
- Skin and hair appearance
- Facial-hair coverage

## 15.6 Stage 6 — Standard topology

Convert every scan into a standard feature representation.

The MVP does not require a production-quality photorealistic mesh if normalized measurements provide equal or better game-preset matching.

## 15.7 Stage 7 — Appearance separation

Maintain separate profiles:

### Geometry profile

- Face width
- Face length
- Forehead width
- Temple width
- Cheekbone width
- Jaw width
- Jaw angle
- Chin width
- Chin height
- Chin projection
- Eye size
- Eye spacing
- Eye tilt
- Brow position
- Nose length
- Nose width
- Nose projection
- Nose-tip shape
- Mouth width
- Lip proportions
- Ear height
- Ear projection
- Facial symmetry indicators

### Appearance profile

- Hair color family
- Hair texture family
- Hair density estimate
- Hairline shape
- Facial-hair presence
- Facial-hair region coverage
- Facial-hair color
- Eyebrow color
- Eyebrow thickness
- Skin-tone representation required by the game
- Freckles or marks only where relevant and supported

Geometry matching must not depend on skin tone.

## 15.8 Stage 8 — User confirmation

The user must be able to correct appearance estimates before matching.

---

# 16. Normalized Facial Measurements

Use normalized ratios wherever possible so results are not tied to pixel count or camera distance.

Example measurements:

```text
faceWidthRatio       = cheekboneWidth / faceLength
foreheadWidthRatio   = foreheadWidth / cheekboneWidth
jawWidthRatio        = jawWidth / cheekboneWidth
chinWidthRatio       = chinWidth / jawWidth
eyeSpacingRatio      = interocularDistance / faceWidth
eyeWidthRatio        = meanEyeWidth / faceWidth
noseWidthRatio       = nostrilWidth / faceWidth
noseLengthRatio      = noseLength / faceLength
mouthWidthRatio      = mouthWidth / faceWidth
lowerFaceRatio       = noseBaseToChin / faceLength
```

## 16.1 Measurement-confidence requirements

Each measurement should include:

- Value
- Confidence
- Number of supporting frames
- Variance across frames
- Whether depth was available
- Whether profile coverage was available
- Whether occlusion affected it

Example:

```json
{
  "jawWidthRatio": {
    "value": 0.713,
    "confidence": 0.91,
    "supportingFrames": 18,
    "variance": 0.008,
    "depthSupported": true,
    "occlusion": "none"
  }
}
```

---

# 17. Standard Face Profile Schema

Illustrative schema:

```json
{
  "profileVersion": "1.0",
  "capture": {
    "mode": "iphone_truedepth_assisted",
    "deviceModel": "example",
    "capturedAt": "2026-07-10T20:00:00Z",
    "overallQuality": 0.92
  },
  "geometry": {
    "faceShape": {
      "class": "oval",
      "confidence": 0.81
    },
    "faceWidthRatio": {
      "value": 0.742,
      "confidence": 0.95
    },
    "jawWidthRatio": {
      "value": 0.682,
      "confidence": 0.92
    },
    "eyeSpacingRatio": {
      "value": 0.291,
      "confidence": 0.94
    },
    "noseWidthRatio": {
      "value": 0.206,
      "confidence": 0.88
    }
  },
  "appearance": {
    "hairColor": {
      "value": "dark_brown",
      "confidence": 0.86,
      "userConfirmed": true
    },
    "hairTexture": {
      "value": "wavy",
      "confidence": 0.73,
      "userConfirmed": true
    },
    "facialHair": {
      "value": "short_full_beard",
      "confidence": 0.79,
      "userConfirmed": true
    }
  }
}
```

---

# 18. College Football 27 Appearance Catalog

The project must create a verified catalog of every relevant appearance choice available in the shipping game.

## 18.1 Catalog categories

Audit and record all categories actually present, including but not limited to:

- Base/head preset
- Face/head and skin combination
- Skin option
- Hairstyle
- Hair color
- Facial hair
- Facial-hair color
- Eyebrows
- Eye-related options
- Nose-related options
- Mouth-related options
- Chin/jaw options
- Scars, marks, paint, or cosmetic details
- Height
- Weight
- Body type
- Physique
- Any position-specific restrictions
- Any platform-specific difference

Do not assume these categories exist. The game audit must verify each one.

## 18.2 Catalog capture protocol

For every face/head option:

- Record exact menu category
- Record exact visible option name or index
- Record navigation path
- Capture front view
- Capture left 45-degree view
- Capture right 45-degree view
- Capture left profile
- Capture right profile
- Capture elevated view when useful
- Capture lowered view when useful
- Record default hair used during facial cataloging
- Record default facial hair
- Record lighting/stadium/menu environment
- Record platform
- Record game version
- Record date captured
- Record whether the option changes with skin selection

Use the same:

- Camera/view orientation
- Zoom
- Game lighting
- Hair
- Facial hair
- Body type
- Platform display settings
- Screenshot resolution

Consistency is critical.

## 18.3 Catalog annotation

Each head option should be annotated with:

- Face shape
- Face width
- Face length
- Forehead width
- Temple width
- Cheekbone prominence
- Jaw width
- Jaw angle
- Chin width
- Chin height
- Chin projection
- Eye size
- Eye spacing
- Eye tilt
- Brow height
- Brow thickness
- Nose length
- Nose width
- Nose projection
- Nose-tip shape
- Mouth width
- Lip proportions
- Ear size and position when visible
- Overall geometric embedding
- Notes from human reviewers

## 18.4 Catalog record example

```json
{
  "catalogItemId": "cfb27-ps5-head-034",
  "game": "EA SPORTS College Football 27",
  "platform": "PlayStation 5",
  "gameVersion": "1.0.0",
  "mode": "Road to Glory",
  "category": "Head",
  "gameLabel": "34",
  "verified": true,
  "capturedAt": "2026-07-10",
  "images": {
    "front": "asset-reference",
    "left45": "asset-reference",
    "right45": "asset-reference",
    "leftProfile": "asset-reference",
    "rightProfile": "asset-reference"
  },
  "geometry": {
    "faceWidthRatio": 0.75,
    "jawWidthRatio": 0.69,
    "eyeSpacingRatio": 0.30,
    "noseWidthRatio": 0.20
  },
  "humanAnnotations": {
    "faceShape": "oval_square",
    "jaw": "moderately_wide",
    "chin": "rounded"
  }
}
```

## 18.5 Catalog verification workflow

No catalog item can be user-facing until:

1. Captured by one contributor
2. Reviewed by a second person
3. Compared to the game menu
4. Assigned the correct platform and game version
5. Marked verified
6. Tested in a recommendation output
7. Confirmed that the instructions reach the correct option

---

# 19. Matching Engine

## 19.1 MVP matching approach

Use a weighted feature-distance model before training a custom neural model.

Benefits:

- Explainable
- Fast to implement
- Easy to tune
- Works with a small game catalog
- Does not require thousands of labeled users
- Allows manual validation

## 19.2 Example weighted score

```text
totalScore =
    0.18 * faceShapeSimilarity +
    0.13 * jawSimilarity +
    0.10 * chinSimilarity +
    0.14 * eyeAndBrowSimilarity +
    0.15 * noseSimilarity +
    0.08 * mouthSimilarity +
    0.07 * foreheadAndTempleSimilarity +
    0.05 * earSimilarity +
    0.10 * humanPreferenceAdjustment
```

The exact weights must be validated with users.

Skin tone must not distort geometric similarity. Appearance categories should be handled separately or as explicit filters.

## 19.3 Missing-feature behavior

If a feature is unavailable or low-confidence:

- Redistribute its weight only among reliable features
- Reduce overall confidence
- Explain which part was uncertain
- Never guess with full confidence

## 19.4 Result requirements

Return at least:

- Rank 1
- Rank 2
- Rank 3
- Match score
- Confidence
- Key reasons
- Key differences
- Capture quality
- Catalog version

Avoid presenting a match score as a scientific probability of resemblance.

Recommended label:

> Match score: 87/100 based on the game’s available appearance options.

Do not say:

> You are 87% identical.

## 19.5 Tie behavior

When two presets are close:

- Show both
- Explain the tradeoff
- Let the user choose what matters most

Example:

> Head 34 is closer in jaw and face width. Head 19 is closer in eyes and nose.

## 19.6 User preference controls

Allow the user to prioritize:

- Overall resemblance
- Jaw and face shape
- Eyes and eyebrows
- Nose
- Hair
- Facial hair
- Preferred in-game skin presentation
- Desired athlete physique over real physique

---

# 20. Screenshot Refinement Engine

## 20.1 Screenshot instructions

Require:

- Character facing the camera
- Neutral expression
- No helmet
- No face mask
- No sunglasses
- Face clearly visible
- Sufficient resolution
- No menu overlay covering the face
- No extreme cinematic lighting
- No motion blur

Capture preferred views:

1. Front
2. Left 45 degrees
3. Right 45 degrees

## 20.2 Refinement processing

- Detect game character face
- Align screenshot
- Estimate landmarks
- Compare normalized geometry
- Compare visual appearance separately
- Account for different rendering style
- Compare only among verified catalog options
- Suggest actionable changes

## 20.3 Refinement output examples

- “Your current face is already the strongest match.”
- “Try Head 19. It has a narrower jaw and closer eye spacing.”
- “Keep Head 34 but change Hair 12 to Hair 18.”
- “The screenshot is too dark to compare. Retake it from the appearance menu.”
- “Your helmet is covering the facial features needed for comparison.”

## 20.4 Learning loop

With explicit permission, retain:

- Initial recommendation
- User-selected option
- Final selected option
- User rating
- Screenshot-derived measurements
- Which alternative won
- Reason the user chose it

Do not retain original face images for learning unless the user separately opts in.

---

# 21. Recommendation Explanation Requirements

Every result should include:

- What the app detected
- Which verified game option is recommended
- Why it ranked first
- Where it differs
- How confident the app is
- What the user can adjust
- How to find the option in the game
- The catalog verification date

Example:

```text
Best match: Head 34

Why:
- Closest overall face width
- Closest jaw angle
- Similar eye spacing
- Similar nose width

Main difference:
- Head 34 has a slightly longer chin than your scan

Confidence: High
Catalog verified: July 10, 2026
```

---

# 22. Technical Architecture

## 22.1 Initial recommended stack

### iOS client

- Swift
- SwiftUI
- AVFoundation
- ARKit
- Vision
- Core Image
- Metal when performance requires it
- Core ML for on-device models
- StoreKit if paid features are introduced

### Backend

Use only where necessary.

Possible choices:

- Supabase
- Firebase
- Cloudflare
- Custom API

Backend responsibilities may include:

- Auth
- Catalog distribution
- Versioning
- Build storage
- User feedback
- Analytics
- Remote model configuration
- Admin review
- Signed asset delivery

### Admin application

A web-based catalog and annotation tool should support:

- Adding game versions
- Adding platforms
- Uploading screenshots
- Cropping and aligning faces
- Annotating features
- Reviewing measurements
- Setting verification state
- Comparing duplicates
- Publishing catalog updates
- Rolling back incorrect data
- Viewing user feedback

## 22.2 On-device-first requirement

Where practical, process:

- Face detection
- Landmark extraction
- Capture quality
- Expression rejection
- Basic measurements
- Initial matching

on the device.

Server processing must be optional or transparently disclosed.

## 22.3 Modular architecture

Required modules:

```text
AppShell
ConsentAndPrivacy
CameraPermissions
CapturePreparation
TrueDepthCapture
RGBCapture
CaptureQuality
FrameSelection
FaceAlignment
GeometryExtraction
AppearanceClassification
UserAttributeConfirmation
FaceProfileStore
GameCatalog
MatchingEngine
RecommendationExplanation
BuildGuide
ScreenshotRefinement
Analytics
AccountAndSync
AdminCatalogAPI
```

## 22.4 Game-adapter interface

```swift
protocol GameAppearanceAdapter {
    var gameId: String { get }
    var supportedVersions: [String] { get }
    var supportedPlatforms: [String] { get }

    func validateCatalog() throws
    func match(profile: StandardFaceProfile) async throws -> [GameAppearanceMatch]
    func buildInstructions(for match: GameAppearanceMatch) -> [BuildInstruction]
    func refine(
        originalProfile: StandardFaceProfile,
        createdPlayerImages: [CapturedImage]
    ) async throws -> RefinementResult
}
```

No College Football-specific assumptions should be hard-coded into the generic face-capture module.

---

# 23. Device Support

## 23.1 Launch support

Recommended launch target:

- iPhone only
- Modern supported iOS version
- Premium mode restricted to devices with TrueDepth face tracking
- Standard RGB mode available only after quality validation

The exact minimum iPhone and iOS versions must be determined through development testing and App Store strategy.

## 23.2 Device capability detection

The app must detect:

- Front TrueDepth support
- AR face-tracking support
- Available camera formats
- Front-camera depth availability
- Rear-camera capabilities
- Thermal state
- Available storage
- Device orientation
- Permission status

## 23.3 Graceful fallback

If TrueDepth is unavailable:

> This phone supports a standard camera scan. Results may be less precise around the jaw, nose profile, and side of the face.

Never imply that RGB-only capture is equivalent to depth-assisted capture unless validated.

---

# 24. Privacy, Security, and Biometric Data

Face images and face geometry are highly sensitive.

## 24.1 Core privacy principles

- Collect the minimum data necessary
- Explain collection before capture
- Process locally where practical
- Do not use scans for identity recognition
- Do not sell face data
- Do not share face data with advertisers
- Do not use face data to train models without separate consent
- Do not store raw media by default
- Let the user delete everything
- Separate face profiles from direct identifiers
- Encrypt sensitive data
- Restrict internal access
- Keep auditable deletion records
- Do not scan a person without permission

## 24.2 Consent layers

Separate consent for:

1. Camera access
2. Face analysis for current recommendation
3. Temporary processing
4. Saving a reusable face profile
5. Cloud backup
6. Saving raw images
7. Product-improvement use
8. Model-training use
9. Marketing or public sharing

Consent must not be bundled into one vague checkbox.

## 24.3 Default retention

Recommended defaults:

- Raw video: deleted immediately after frame selection
- Rejected frames: deleted immediately
- Selected raw frames: deleted after profile generation and result delivery
- Depth frames: deleted after geometry extraction
- Derived face profile: stored locally for the session unless user chooses to save
- User result: can be saved without raw face images
- Screenshot refinement media: deleted after refinement unless user chooses to save
- Diagnostic logs: must not contain raw face images or unencrypted facial geometry

## 24.4 Saved profile behavior

When a user chooses to save a profile:

- Explain exactly what is saved
- Prefer saving derived measurements rather than raw images
- Allow local-only storage
- Make cloud sync opt-in
- Encrypt at rest and in transit
- Allow export
- Allow deletion
- Allow account deletion
- Confirm deletion completion

## 24.5 Children and minors

College football games have many younger users. Before launch:

- Obtain legal review for child-privacy requirements
- Set an appropriate minimum age
- Add parent/guardian consent where required
- Do not collect a child’s face data under an ambiguous consent flow
- Do not use a child’s scan for model training by default
- Do not allow public sharing without age-appropriate controls

## 24.6 Security requirements

- TLS for network traffic
- Platform keychain for tokens
- Encryption for saved profiles
- Signed catalog manifests
- Server-side access control
- Least-privilege permissions
- No public storage buckets for face media
- Automated expiration
- Audit logs for administrative access
- Secure deletion workflow
- Incident-response plan
- Dependency scanning
- Secrets never stored in source control

---

# 25. Legal and Platform Review Requirements

Before public release, obtain review for:

- Biometric privacy
- State privacy laws
- Child privacy
- Consumer privacy
- App Store privacy disclosures
- Google Play disclosures if Android launches
- EA and game trademark usage
- Fair use of game screenshots
- User-generated game screenshots
- Advertising claims
- Subscription disclosures
- Data-deletion obligations
- Model-training consent
- Accessibility requirements

The app should use only the game data and screenshots necessary to provide the companion service.

Do not distribute extracted game assets or imply ownership of EA content.

---

# 26. Accessibility Requirements

The capture flow must support:

- VoiceOver
- Dynamic Type
- High-contrast text
- Spoken capture instructions
- Haptic guidance
- Left/right instructions that do not depend solely on color
- Captions for instructional video
- Reduced Motion
- One-handed fallback where practical
- Assisted scanning
- Retake without restarting
- Additional capture time
- Clear, plain-language error messages

Do not assume all faces are symmetrical or conform to a single standard template.

The matching engine must be tested across:

- Skin tones
- Ages
- Face shapes
- Facial hair
- Hair textures
- Eyewear removal limitations
- Facial differences
- Scars
- Birthmarks
- Mobility differences
- Different camera devices

---

# 27. User Interface Requirements

## 27.1 Design principles

- Sports-focused
- Fast
- Trustworthy
- Clear
- Not clinical
- Not creepy
- Not overly technical
- Transparent about privacy
- Transparent about uncertainty
- Easy to share
- Easy to follow while sitting near a console

## 27.2 Key screens

1. Welcome
2. Product explanation
3. Privacy and permission
4. Select scan mode
5. Preparation checklist
6. Lighting check
7. Live scan
8. Coverage review
9. Attribute confirmation
10. Processing
11. Top-three results
12. Detailed match explanation
13. Step-by-step build guide
14. Saved builds
15. Screenshot upload
16. Refinement results
17. Share result
18. Delete scan/profile
19. Privacy center
20. Settings

## 27.3 Result card

Must show:

- User-safe preview
- Game title
- Mode
- Head/preset recommendation
- Hair recommendation
- Facial-hair recommendation
- Confidence
- Match score
- Catalog version
- Build button
- Share button
- Delete data button

## 27.4 Share card

Default share card should not expose the user’s raw scan without explicit permission.

Possible safe format:

```text
GameFace Match
My College Football 27 build

Head: 34
Hair: 18
Facial Hair: 7
Match Score: 87

Independent companion app. Not affiliated with EA.
```

A side-by-side face share must be opt-in.

---

# 28. Analytics Requirements

Track product performance without collecting unnecessary biometric data.

## 28.1 Funnel events

- App opened
- Permission screen viewed
- Camera permission granted
- Capture started
- Capture completed
- Capture abandoned
- Retake requested
- Quality failure category
- Results generated
- Top match viewed
- Build guide opened
- Result saved
- Result shared
- Screenshot refinement started
- Refinement completed
- User selected rank 1, 2, or 3
- User rated resemblance
- Raw-data deletion completed

## 28.2 Product KPIs

- Scan completion rate
- Median capture duration
- Retake rate
- Quality-pass rate
- Recommendation-generation success rate
- Percentage choosing rank 1
- Percentage choosing rank 2 or 3
- Average resemblance rating
- Screenshot-refinement adoption
- Improvement after refinement
- Share rate
- Seven-day return rate
- Delete-data success rate
- Crash-free sessions
- Processing latency
- Catalog-error rate

## 28.3 Accuracy KPIs

- Human-rated resemblance
- Top-1 acceptance rate
- Top-3 acceptance rate
- Preset confusion matrix
- Performance by capture mode
- Performance by device
- Performance by lighting condition
- Performance by face-shape group
- Performance by hair/facial-hair condition
- Confidence calibration

Analytics events must not include raw images or precise facial measurements unless explicitly required and separately governed.

---

# 29. Testing Plan

## 29.1 Capture testing

Test:

- Bright room
- Dim room
- Window backlight
- Uneven lighting
- Different backgrounds
- Glasses
- Facial hair
- Long hair
- Hats before removal prompt
- Different distances
- User movement
- Camera movement
- Blinks
- Smiles
- Talking
- Multiple faces
- Low storage
- Thermal throttling
- Interrupted capture
- Incoming call
- Permission denial

## 29.2 Matching testing

Create a validation set with:

- Diverse users
- Multiple devices
- Multiple scan modes
- Independent human reviewers
- Top-three preset rankings
- User-selected final choice
- Repeated scans of the same person
- Controlled lighting
- Uncontrolled lighting

## 29.3 Repeatability test

The same user scanned three times under similar conditions should receive:

- The same top-three set in most cases
- Similar measurement values
- Similar confidence
- No unexplained extreme change

## 29.4 Catalog testing

For every published item:

- Recommendation opens correct instructions
- Instructions reach correct game menu
- Option number/name is correct
- Images match the option
- Platform is correct
- Game version is correct
- No duplicate IDs
- No unverified item appears

## 29.5 Privacy testing

Verify:

- Raw video deletion
- Rejected-frame deletion
- Saved-profile behavior
- Account deletion
- Cloud deletion
- Local cache clearing
- No images in logs
- No face data in analytics payloads
- Consent version recording
- Revocation behavior

---

# 30. MVP Acceptance Criteria

The MVP is ready for private beta only when:

1. A supported iPhone can complete the full guided scan.
2. The app blocks clearly unusable captures.
3. The app permits selective retakes.
4. A standardized face profile is produced.
5. The College Football 27 catalog is verified.
6. The app returns three real, verified recommendations.
7. Each recommendation includes accurate menu instructions.
8. Hair and facial-hair estimates can be corrected.
9. No invented options can appear.
10. A user can delete all scan data.
11. Raw face media is deleted by default.
12. Screenshot refinement can evaluate a valid game screenshot.
13. The app handles invalid screenshots gracefully.
14. Results include confidence and limitations.
15. The independent-app disclaimer is visible.
16. Accessibility basics are implemented.
17. Analytics contain no raw biometric media.
18. Crash-free rate is acceptable during controlled testing.
19. Repeat scans provide reasonably stable results.
20. Human testers consider at least one top-three recommendation useful at an agreed target rate.

## 30.1 Suggested beta quality targets

Initial targets to validate, not guaranteed final thresholds:

- Capture completion rate: at least 80%
- Quality pass without full restart: at least 75%
- Top-three useful-match rate: at least 80%
- Top-one accepted match: at least 50%
- Screenshot refinement completion: at least 70%
- Crash-free sessions: at least 99%
- Raw-data deletion confirmation: 100%
- Median scan plus processing time: under 90 seconds
- Standard guided scan time: approximately 30–45 seconds

---

# 31. Development Roadmap

## Phase 0 — Game audit and feasibility

- Capture every College Football 27 appearance menu
- Verify platforms
- Determine whether appearance differs by platform
- Determine whether appearance differs by position
- Determine exact face/head controls
- Determine exact hair controls
- Determine exact facial-hair controls
- Determine exact skin controls
- Determine screenshot consistency
- Build catalog schema
- Build initial manual annotations
- Test whether face presets can be reliably differentiated

Exit condition:

> A verified, versioned game catalog exists and the team can manually match a test user to plausible top-three options.

## Phase 1 — Capture prototype

- SwiftUI camera flow
- ARKit face tracking
- TrueDepth capability detection
- Vision landmarks
- Expression neutrality checks
- Lighting and blur checks
- Standardized images
- Local-only storage
- Face-profile generation

Exit condition:

> A user can complete a scan and receive a structured local face profile.

## Phase 2 — Rule-based matching

- Feature normalization
- Catalog geometry
- Weighted distance
- Top-three ranking
- Confidence scoring
- Explanation generator
- Build instructions

Exit condition:

> Test users receive verified, explainable recommendations.

## Phase 3 — Screenshot refinement

- Screenshot upload
- Character-face detection
- Alignment
- Cross-domain comparison
- Alternative selection
- User feedback

Exit condition:

> The app can recommend whether the user should keep or change the selected option.

## Phase 4 — Private beta

- TestFlight
- Consent review
- Privacy center
- Error analytics
- Diverse tester group
- Catalog corrections
- Weight tuning
- Usability testing

## Phase 5 — Public launch

- App Store assets
- Privacy nutrition labels
- Legal review
- Support content
- Delete-account flow
- Share cards
- Creator launch campaign
- Reliability monitoring

## Phase 6 — Expansion

Potential order:

1. Madden NFL 27
2. NBA 2K
3. MLB The Show
4. EA Sports FC
5. NHL
6. WWE 2K
7. Additional annual releases

---

# 32. Official Technical and Product References

These references support the initial product assumptions. Recheck them during implementation because APIs and game details may change.

## College Football 27

EA SPORTS College Football 27 — Road to Glory Deep Dive  
https://www.ea.com/games/ea-sports-college-football/college-football-27/news/college-football-27-road-to-glory

EA SPORTS College Football 27 — Features  
https://www.ea.com/games/ea-sports-college-football/college-football-27/features

EA SPORTS College Football 27 — Road to Glory  
https://www.ea.com/games/ea-sports-college-football/college-football-27/features/cfb27-road-to-glory-mode

## Apple face capture

Apple ARKit  
https://developer.apple.com/documentation/arkit

Apple ARFaceTrackingConfiguration  
https://developer.apple.com/documentation/arkit/arfacetrackingconfiguration

Apple ARFrame capturedDepthData  
https://developer.apple.com/documentation/arkit/arframe/captureddepthdata

Apple Vision face-landmark detection  
https://developer.apple.com/documentation/vision/detectfacelandmarksrequest

Apple Vision selfie-analysis sample  
https://developer.apple.com/documentation/vision/analyzing-a-selfie-and-visualizing-its-content

Apple face-tracking overview  
https://developer.apple.com/videos/play/tech-talks/601/

## Google / cross-platform landmarks

Google AI Edge MediaPipe Face Landmarker  
https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker

The official MediaPipe documentation states that Face Landmarker can process still images, decoded video, and live streams, and can output a complete face mesh, three-dimensional landmarks, facial blendshape scores, and transformation matrices.

---

# 33. Project Folder Structure

Recommended repository:

```text
GameFaceMatch/
├── README.md
├── docs/
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── FACE_CAPTURE_SPEC.md
│   ├── PRIVACY_AND_RETENTION.md
│   ├── GAME_CATALOG_SPEC.md
│   ├── MATCHING_ENGINE_SPEC.md
│   ├── TEST_PLAN.md
│   └── LEGAL_REVIEW_CHECKLIST.md
├── ios/
│   ├── App/
│   ├── Capture/
│   ├── FaceProcessing/
│   ├── Matching/
│   ├── GameAdapters/
│   │   └── CollegeFootball27/
│   ├── Privacy/
│   ├── Analytics/
│   └── Tests/
├── backend/
│   ├── api/
│   ├── catalog/
│   ├── auth/
│   ├── analytics/
│   └── migrations/
├── admin/
│   ├── catalog-manager/
│   └── annotation-tool/
├── data/
│   ├── schemas/
│   ├── sample-catalog/
│   └── fixtures/
├── scripts/
│   ├── validate_catalog
│   ├── measure_catalog_images
│   └── export_catalog
└── legal/
    ├── privacy-draft/
    ├── terms-draft/
    └── trademark-review/
```

---

# 34. Initial Engineering Tasks

## Epic A — College Football 27 audit

- [ ] Record supported platforms
- [ ] Record game version
- [ ] Record Road to Glory creation paths
- [ ] Record every appearance category
- [ ] Record every option
- [ ] Capture consistent screenshots
- [ ] Create catalog IDs
- [ ] Build versioned catalog JSON
- [ ] Add verification status
- [ ] Review for mistakes

## Epic B — iPhone capture

- [ ] Create SwiftUI project
- [ ] Add camera permission flow
- [ ] Detect TrueDepth support
- [ ] Implement AR face tracking
- [ ] Read face geometry
- [ ] Read available depth data
- [ ] Add Vision landmarks
- [ ] Add pose guidance
- [ ] Add lighting checks
- [ ] Add blur checks
- [ ] Add expression checks
- [ ] Add capture coverage map
- [ ] Add selective retake
- [ ] Delete raw media by default

## Epic C — Face profile

- [ ] Define coordinate system
- [ ] Normalize landmarks
- [ ] Calculate measurements
- [ ] Attach confidence
- [ ] Separate geometry and appearance
- [ ] Add user-confirmation screen
- [ ] Serialize local profile
- [ ] Add profile deletion

## Epic D — Matching

- [ ] Measure catalog heads
- [ ] Define feature weights
- [ ] Implement weighted distance
- [ ] Add missing-data behavior
- [ ] Return top three
- [ ] Add confidence calibration
- [ ] Add explanations
- [ ] Add game instructions
- [ ] Add unit tests

## Epic E — Refinement

- [ ] Add screenshot picker
- [ ] Detect game-character face
- [ ] Validate screenshot
- [ ] Normalize screenshot pose
- [ ] Compare to user profile
- [ ] Recommend alternative
- [ ] Collect user rating
- [ ] Delete screenshot by default

## Epic F — Privacy and release

- [ ] Write plain-language consent
- [ ] Write privacy policy
- [ ] Add retention controls
- [ ] Add delete-everything flow
- [ ] Add legal disclaimer
- [ ] Add analytics review
- [ ] Complete App Store privacy form
- [ ] Complete accessibility review
- [ ] Complete security review

---

# 35. Data Integrity Rules

1. Every game option must have a stable internal ID.
2. Visible labels may change without changing historical records.
3. Catalog records are immutable after publication; corrections create a new version.
4. Recommendations store the catalog version used.
5. Unverified catalog items cannot be published.
6. Deleted game options remain archived for historical builds.
7. Platform differences must never be silently merged.
8. User feedback must reference the exact recommended item.
9. Test fixtures must never be mistaken for production catalog data.
10. Production results must never contain placeholder settings.

---

# 36. AI and Model Rules

The application may use machine learning for:

- Face landmarks
- Capture quality
- Hair classification
- Facial-hair classification
- Face-shape classification
- Catalog embeddings
- Screenshot comparison
- Recommendation ranking

The application must not use AI to:

- Identify the person
- Search for matching identities
- Guess protected or sensitive traits
- Infer personality
- Infer criminality
- Infer health
- Generate unsupported game options
- Override user consent
- Retain raw scans silently

Every model must be versioned.

Example:

```json
{
  "captureQualityModel": "cq-ios-1.2",
  "appearanceModel": "appearance-0.8",
  "matchingModel": "cfb27-rule-1.4",
  "catalogVersion": "cfb27-ps5-2026-07-10"
}
```

---

# 37. Error Handling

The app must provide actionable recovery.

Bad:

> Scan failed.

Good:

> Your left profile was blurry. Keep your head still and retake only the left-side photo.

Required error classes:

- Permission error
- Unsupported device
- Camera unavailable
- Depth unavailable
- Face not found
- Multiple faces
- Lighting failure
- Motion failure
- Storage failure
- Processing failure
- Catalog unavailable
- Catalog version mismatch
- Network failure
- Screenshot invalid
- Delete-data failure
- Account sync failure

Deletion failures must be surfaced clearly and retried.

---

# 38. Performance Requirements

Initial targets:

- Camera preview remains responsive
- Quality guidance updates in near real time
- Capture does not block the main UI thread
- Thermal load is monitored
- App can pause and resume safely
- On-device profile generation completes within a reasonable period
- User sees honest progress states
- App does not upload large raw videos by default
- Background interruption does not corrupt stored consent or partial capture
- Large catalog downloads are versioned and cached

---

# 39. Monetization Options

Do not let monetization interfere with privacy or basic trust.

Possible models:

### Free basic match

- One game
- Top match
- Limited saved builds

### One-time game pack

- College Football 27 pack
- Top three
- Detailed instructions
- Screenshot refinement

### Premium annual sports pass

- Multiple games
- Saved face profile
- Multiple build variations
- Advanced refinement
- Future game adapters

### Creator tools

- Share templates
- Batch friend challenges
- Branded comparison graphics
- Video-export templates

Do not sell face data or target advertising using facial measurements.

---

# 40. Marketing and Growth Loop

Strong content concepts:

- “I built an app that tells you which College Football 27 face looks most like you.”
- Real person versus Road to Glory player
- Top-one versus top-three challenge
- Friends rate the closest match
- Athlete recreations with permission
- Before and after screenshot refinement
- “The app picked Head 34—was it right?”
- Creator referral links
- Weekly best-match showcase with explicit consent

Default sharing must protect the user’s face unless they deliberately include it.

---

# 41. Major Risks and Mitigations

## Risk: The game has limited face controls

Mitigation:

- Promise the closest available option
- Return top three
- Explain differences
- Use hair and facial hair to improve resemblance
- Focus on convenience and confidence rather than perfection

## Risk: Game updates change options

Mitigation:

- Version catalog
- Run patch audits
- Remote-disable invalid items
- Store catalog verification date
- Add user report button

## Risk: Face scans feel invasive

Mitigation:

- On-device-first
- No account required
- Delete raw data by default
- Plain-language privacy
- Visible delete controls
- No identity recognition
- No advertising use

## Risk: Inconsistent phone capture

Mitigation:

- Guided lighting
- Coverage map
- Automatic quality checks
- Selective retakes
- Premium assisted mode
- Device-specific testing

## Risk: Recommendations appear biased

Mitigation:

- Diverse testing
- Separate geometry from skin tone
- Measure performance across user groups
- Allow user corrections
- Display top three
- Audit model outputs
- Avoid sensitive-trait inference

## Risk: Trademark or publisher objection

Mitigation:

- Independent companion positioning
- Clear disclaimer
- Minimal necessary use of game imagery
- Legal review
- No game-file extraction
- No automated game control
- No official-looking branding

## Risk: User expects automatic import

Mitigation:

- State clearly that the app provides instructions
- Show example result before purchase
- Use “match” and “guide,” not “import”

---

# 42. Open Questions to Resolve During Phase 0

1. What exact facial appearance categories exist in College Football 27?
2. Are appearance options numbered, named, or both?
3. Do options differ between PlayStation 5 and Xbox Series X|S?
4. Does the PC version exist and, if so, is it identical?
5. Do appearance options differ by Road to Glory position?
6. Does height, weight, or body type change the rendered head?
7. Can the player rotate freely in the creation menu?
8. Can consistent screenshots be captured without overlays?
9. Are hairstyle and facial-hair options shared across every head?
10. Does skin presentation alter geometry?
11. How many face presets are available?
12. Can game updates reorder options?
13. Is Madden NFL 27 transfer relevant to appearance continuity?
14. What is the best minimum iPhone model?
15. Can the complete recommended scan run fully on-device?
16. What legal age gate is appropriate?
17. What parts of the face profile qualify as biometric identifiers in target jurisdictions?
18. What user-resemblance rating defines MVP success?
19. How should the app handle twins or highly similar users?
20. Should users be able to scan another person only after that person gives on-screen consent?

---

# 43. Permanent Product Rules

These rules should remain active unless deliberately changed in a documented product decision.

1. College Football 27 is the first supported game.
2. Road to Glory is the first supported mode.
3. iPhone is the first supported platform.
4. TrueDepth is the preferred geometry source.
5. High-resolution RGB is required for appearance detail.
6. A hybrid scan is preferred over a single selfie.
7. The subject should remain neutral and still.
8. The application returns top-three matches.
9. The app explains why each match was selected.
10. The app never invents a game option.
11. The game catalog is versioned and verified.
12. Raw face media is deleted by default.
13. Saving a profile is optional.
14. Training use requires separate consent.
15. The app does not identify people.
16. Geometry and appearance are processed separately.
17. Skin tone does not determine geometric similarity.
18. The app is an independent companion, not an EA product.
19. No game hacking, asset extraction, or console automation.
20. Users can delete their data.
21. Results communicate uncertainty.
22. Accessibility is part of the core product.
23. The app must work without an account for basic use.
24. The screenshot refinement loop is a core differentiator.
25. New games use adapters rather than rewriting the capture engine.

---

# 44. Definition of the First Successful Prototype

The first successful prototype does not need a polished App Store interface.

It is successful when:

1. A user completes a guided iPhone face scan.
2. The app calculates a stable set of facial proportions.
3. A verified subset of College Football 27 face presets exists.
4. The app ranks that subset.
5. The top three appear with clear explanations.
6. A human can follow the instructions in the game.
7. The user can say whether the result resembles them.
8. The prototype records the selection without retaining raw face media.
9. Repeating the scan does not produce wildly different results.
10. The team learns which facial measurements matter most.

---

# 45. Immediate Next Action

Before building a sophisticated 3D reconstruction system, complete the College Football 27 appearance audit.

The recommended order is:

1. Open Road to Glory player creation.
2. Record the complete menu structure.
3. Determine whether the game uses presets, sliders, or both.
4. Capture every head option under identical conditions.
5. Capture every hairstyle and facial-hair option.
6. Build the versioned catalog.
7. Manually compare 10–20 people to the catalog.
8. Determine whether a simple landmark-based matcher produces useful top-three recommendations.
9. Build the guided TrueDepth prototype.
10. Add screenshot refinement after the initial matching experience works.

This approach prevents the project from overbuilding the scanner before proving that the game’s available options can support a valuable recommendation.

---

# End of Source of Truth
