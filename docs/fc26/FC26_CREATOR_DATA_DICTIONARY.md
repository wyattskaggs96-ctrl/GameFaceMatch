# FC26 Creator Data Dictionary

Status: Research-only schema documentation  
Machine-readable source: `data/research/fc26/player_creator_research.json`  
Validator: `npm run fc26:validate`

## Purpose

The FC 26 player-creator research file records observations from local source videos without mixing them into the College Football 27 catalog. It is designed to support later game-adapter work while preventing partial observations from becoming production recommendations.

## Top-Level Fields

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Version of the FC 26 research data contract. Current value: `fc26-player-creator-research-v1`. |
| `generatedAt` | Date/time the research artifact was prepared. |
| `sourceType` | Must remain `shippingGameVideoResearch`. |
| `productionEligible` | Must remain `false` until a separate production catalog workflow exists. |
| `verificationState` | Current non-production verification label. |
| `game` | FC 26 game identity and recommendation availability. |
| `analysisNotes` | Research limitations and processing notes. |
| `sourceVideos` | Preserved source-video metadata and hashes. |
| `menuHierarchy` | Visible menu and subtab records. |
| `controls` | Visible player-creator controls and observed values. |
| `unresolvedObservations` | Ambiguous observations that must not be treated as verified labels. |
| `notShownRequirements` | Required areas not shown by the current footage. |

## Confidence Levels

| Confidence | Meaning |
| --- | --- |
| `verified` | The label or value is readable directly in the video frame. |
| `probable` | The label or value is likely readable but should be rechecked before production use. |
| `unclear` | The footage suggests something, but the text or state is not reliable enough to record as a value. |
| `not_shown` | The requirement is not visible in the available footage. |

## Source Video Fields

| Field | Meaning |
| --- | --- |
| `videoID` | Stable local identifier used by observations. |
| `canonicalFilename` | Planned canonical name for reporting. |
| `originalFilename` | Actual filename as supplied; masters must not be renamed destructively. |
| `relativePath` | Portable repository-relative path to the local source video. |
| `sha256` | SHA-256 checksum of the supplied master. |
| `durationSeconds` | Runtime from local media inspection. |
| `resolution` | Width and height from local media inspection. |
| `frameRate` | Frame-rate text reported by the media tool. |
| `container`, `videoCodec`, `audioCodec` | Technical media identity. |
| `opensSuccessfully` | Whether the file could be opened by the local media tool. |

## Menu Fields

| Field | Meaning |
| --- | --- |
| `menuID` | Stable internal menu identifier. |
| `label` | Visible menu or tab label. |
| `parentMenuID` | Parent menu reference, or `null` for root. |
| `confidence` | Confidence level for the label. |
| `evidence` | Source video and timestamp. |

## Control Fields

| Field | Meaning |
| --- | --- |
| `controlID` | Stable FC 26 research control identifier. |
| `label` | Visible row or control label. |
| `menuID` | Parent menu/subtab. |
| `controlType` | One of `colorCarousel`, `presetCarousel`, `valueCarousel`, `groupSelector`, `slider`, or `unknown`. |
| `rangeComplete` | Whether current evidence proves a complete selector range. Currently false for all controls. |
| `firstValueProven` | Whether the first selector value is proven. |
| `lastValueProven` | Whether the last selector value is proven. |
| `wrapProven` | Whether selector wrap is proven. |
| `observedValues` | Directly observed values with source video, timestamp, and confidence. |

## Validation Rules

The validator fails when:

- The game ID is not `ea-sports-fc-26`.
- Research data claims production eligibility.
- Recommendations are enabled.
- Source videos lack hashes, durations, or readable status.
- Menu IDs or control IDs are duplicated.
- Observations lack video/timestamp evidence.
- Unknown confidence levels are used.
- A complete selector range is claimed without first, last, and wrap evidence.
- A slider is recorded without explicit minimum, maximum, step, and evidence.
- College Football 27 catalog text appears inside the FC 26 research file.

## Runtime Isolation

FC 26 runtime support lives behind the game-adapter boundary. The FC 26 adapter is research-only and fails closed for recommendations, build instructions, and screenshot refinement until a verified FC 26 production catalog exists.

The reusable `StandardFaceProfile` contract remains game-independent. Game-specific context is stored separately with a `gameID`, so existing College Football profiles remain compatible.
