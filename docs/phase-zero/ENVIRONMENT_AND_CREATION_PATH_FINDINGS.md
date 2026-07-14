# Environment And Creation Path Findings

Generated: 2026-07-13T22:20:00-04:00

These findings are Phase 0 research records. They are not production verification and do not enable recommendations.

## Supported Findings

| Field | Value | Evidence | Timestamp |
| --- | --- | --- | --- |
| gameTitle | EA SPORTS College Football 27 | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| platform | Xbox | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| consoleFamily | Xbox | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| gameMode | Road to Glory | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| roadToGloryPath | Main interface > Road to Glory > Road to Glory Setup > Journey type cards > Choose Your Position > QB > Create Player > Player > Appearance > Head & Skin visible | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| creationStartingPoint | Create Player flow reached from Road to Glory setup | phase0-video-001-tl-007 / Create Player appearance path/menu | 33s-37s |
| appearanceEntryPoint | Create Player > Player > Appearance > Head & Skin | phase0-video-001-tl-008 / Create Player menu navigation | 38s-45s |
| playerBaseScreenVisible | true | phase0-video-001-tl-005 / Player setup / position path | 24s-29s |
| position | QB | phase0-video-001-tl-005 / Player setup / position path | 24s-29s |
| journeyTypeCardsVisible | ELITE, BLUE CHIP, CONTRIBUTOR, UNDERDOG | phase0-video-001-tl-004 / Archetype / prospect selection cards | 18s-23s |
| observedJourneyTypeHighlight | CONTRIBUTOR | phase0-video-001-tl-004 / Archetype / prospect selection cards | 18s-23s |
| playerInfoFieldsVisible | First Name, Last Name, Position, Jersey #, Handedness, Home State, Hometown, Pipeline, High School Name, Mascot | phase0-video-001-tl-008 / Create Player menu navigation | 38s-45s |
| visibleAppearanceMenus | Head & Skin, Hair | phase0-video-001-tl-008 / Create Player menu navigation | 38s-45s |
| captureDate | 2026-07-12T19:03:45.000Z | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| captureMethod | Xbox screen recording | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| captureFormat | MP4, 1920x1080, h264 Main, AAC audio, approximately 58.96 fps | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |
| visibleDisplayConditions | In-game screen capture at 1920x1080 source-video resolution; display model, HDR, and console output settings are not visible. | phase0-video-001-tl-001 / College Football hub / Road to Glory navigation | 0s-7s |

## Reproducible Creation Path

Path: Main interface > Road to Glory > Road to Glory Setup > Journey type cards > Choose Your Position > QB > Create Player > Player > Appearance > Head & Skin visible

| Step | Instruction | Expected Result | Evidence |
| ---: | --- | --- | --- |
| 1 | Open College Football 27 main interface and navigate to Road to Glory. | Road to Glory transition/loading begins. | phase0-video-001-tl-001 0s-7s |
| 2 | On Road to Glory Setup, choose Advance. | Journey type cards appear. | phase0-video-001-tl-003 12s-17s |
| 3 | Select the observed journey type card highlighted before the position screen. | Position selection appears. | phase0-video-001-tl-004 18s-23s |
| 4 | Choose QB on the position screen. | QB is selected and the flow can continue toward Create Player. | phase0-video-001-tl-005 24s-29s |
| 5 | Advance into Create Player. | Create Player opens on the Player top tab. | phase0-video-001-tl-007 33s-37s |
| 6 | Open or observe Player Info from the Player tab. | Player Info fields are visible, including Handedness as a field. | phase0-video-001-tl-008 38s-45s |
| 7 | Open Appearance from the Player tab. | Appearance submenu appears. | phase0-video-001-tl-008 38s-45s |
| 8 | Observe Head & Skin in the Appearance submenu. | Head & Skin is visible and selected. | phase0-video-001-tl-008 38s-45s |
| 9 | Observe Hair under Appearance. | Hair is visible as a sibling row; Hair is not opened in this footage. | phase0-video-001-tl-008 38s-45s |

## Missing Environment Evidence

| Field | Reason | Required before production |
| --- | --- | --- |
| gameVersion | Visible game version or executable version is not shown in the footage. | yes |
| patchVersion | Patch number or update version is not shown in the footage. | yes |
| consoleModel | The recording supports Xbox family context, but not Series X versus Series S. | yes |
| consoleOSVersion | Console OS/version screen is not shown. | yes |
| edition | Game edition is not shown. | yes |
| storefrontRegion | Storefront or region is not shown. | yes |
| copyType | Disc/digital/subscription copy type is not shown. | yes |
| entitlementStatus | Entitlement, preorder, deluxe, or subscription status is not shown. | yes |
| displayModel | Display device model is not shown. | yes |
| hdrState | HDR state is not shown. | yes |
| outputResolution | Console output resolution is not shown; only source-video resolution is known. | yes |
| onlineState | Online/offline state is not visible. | yes |
| eaAccountRequirement | EA account requirement/sign-in state is not visible. | yes |
| playerBaseSelection | Player Base screen is visible as a top-tab step, but a selected player-base value is not shown. | yes |
| archetype | Journey cards are visible, including Contributor, but archetype as a player-build value is not confirmed. | yes |
| handedness | Player Info includes Handedness as a visible field, but its value is not readable/confirmed. | yes |
| height | Height value is not shown. | yes |
| weight | Weight value is not shown. | yes |
| bodyType | Body type value is not shown. | yes |
| appearanceEditableLater | The footage reaches creation-time Appearance but does not prove later editability after creation. | yes |

## Canonical Path Assessment

- Research path: SUPPORTED_AS_RESEARCH_CANONICAL_PATH_WITH_LIMITATIONS
- Reason: The footage directly supports Road to Glory > QB > Create Player > Player > Appearance > Head & Skin as a reproducible research path for the current audit, with timestamped evidence for each observed step.
- Production catalog path: NOT_SUFFICIENT_FOR_PRODUCTION_CATALOG_PATH
- Reason: Production path support still requires exact game version/patch, platform environment, later editability/dependency checks, second-person verification, and catalog-manager approval.

## Issue Register

- Open issues: 21
- Blocking issues: 20
- Warning issues: 1

## Outputs

- `data/phase-zero/environment_manifest.research.json`
- `data/phase-zero/creation_paths.research.json`
- `data/phase-zero/creation_paths.research.csv`
- `data/phase-zero/issues_register.research.json`
