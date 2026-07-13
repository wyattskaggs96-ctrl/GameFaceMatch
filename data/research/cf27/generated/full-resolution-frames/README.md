# Extracted Full-Resolution Frames

Full-resolution frames are timestamped derivatives extracted from source videos.

Each frame must retain provenance back to:

- Source video inventory ID
- Source filename
- Source SHA-256
- Timestamp
- Extraction command or tool
- Operator/date

Frame image files are ignored by Git. Commit derivative manifests rather than raw frame images.
