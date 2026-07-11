# Web Capture Quality Notes

GameFace Match web capture uses guided RGB images only. The current quality pipeline runs entirely in the browser with native image decoding and canvas pixel sampling.

## Implemented checks

- Image decode success or failure.
- Width, height, aspect ratio, file size, and coarse orientation.
- Supported MIME types: JPEG, PNG, and WebP.
- Maximum file size and minimum image dimensions.
- Required-angle presence for all five MVP views.
- Exact duplicate detection using the existing image signature path.
- Estimated brightness, highlight clipping, shadow clipping, and basic sharpness.
- User-confirmed requested angle, neutral expression, and one-person visibility.

## Not implemented

- Identity recognition.
- Face recognition.
- Face centering detection.
- Landmark accuracy.
- Head-pose accuracy.
- Expression detection.
- One-person detection.
- TrueDepth, ARKit, 3D reconstruction, or depth-backed geometry.

Those unimplemented items must remain advisory or user-confirmed until a documented, privacy-safe technical implementation exists.
