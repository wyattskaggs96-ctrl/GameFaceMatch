# Architecture

## Initial approach

- Native iPhone app in Swift and SwiftUI
- Apple frameworks first: AVFoundation, ARKit, Vision, Core Image, Core ML where justified
- On-device-first capture quality, measurement, profile generation, and initial matching
- No backend required for the first prototype
- Generic face-capture and profile modules separated from the College Football 27 adapter
- Production catalog records are versioned, verified, and immutable after publication

## Dependency direction

`Features -> Core protocols/domain -> concrete local services`

Game-specific code may depend on generic domain models. Generic capture and face-profile code must not depend on College Football 27.
