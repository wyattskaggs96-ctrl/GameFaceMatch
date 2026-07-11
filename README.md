# GameFace Match

GameFace Match is an independent iPhone companion application that guides a user through a face scan and recommends the closest verified College Football 27 Road to Glory appearance settings.

The app does not import a face into the game, identify people, control a console, or invent game options.

## Repository layout

- `docs/` — product requirements and engineering documentation
- `ios/` — SwiftUI application and tests
- `data/` — schemas, verified production catalogs, and isolated test fixtures
- `admin/` — future catalog review and annotation tools
- `scripts/` — validation and export utilities
- `legal/` — draft privacy, terms, and trademark-review materials
- `design/` — research and wireframes

Read `00_START_HERE.md` and `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` before building.

## iPhone application foundation

The initial native iPhone app lives at `ios/GameFaceMatch.xcodeproj`.

Open it with Xcode 26.6 or newer stable Xcode:

```sh
open ios/GameFaceMatch.xcodeproj
```

Select the `GameFaceMatch` scheme and an iPhone simulator such as iPhone 17 Pro. The first foundation build uses iOS 18.0 as the provisional deployment target. This is a conservative modern baseline for SwiftUI, ARKit capability checks, and current iPhone simulator support while the capture requirements are still being validated.

Build from the command line:

```sh
xcodebuild build -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData
```

Run unit tests:

```sh
xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchTests
```

Run UI tests:

```sh
xcodebuild test -project ios/GameFaceMatch.xcodeproj -scheme GameFaceMatch -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' -derivedDataPath build-artifacts/DerivedData -only-testing:GameFaceMatchUITests
```

The simulator can verify navigation, empty states, catalog-unavailable behavior, and deletion flows. It cannot verify real camera availability, TrueDepth depth data, AR face tracking quality, or scan output.

Current app behavior is intentionally foundational. The production College Football 27 catalog is empty and the app displays: “Verified College Football 27 catalog not loaded.” No production presets, labels, option numbers, sliders, hairstyles, facial-hair options, or menu paths are included.
