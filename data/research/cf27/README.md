# CF27 Research Evidence Staging

This directory is the repository-side staging area for College Football 27 research evidence. It holds metadata, manifests, reports, and non-production candidate records only.

It must not contain committed source-video masters, raw user face media, or production catalog records.

## Data Class

- Source type: `researchDraft` or `researchCandidate`
- Verification state: primary research only unless moved through the formal verification workflow
- Production status: not production data
- Recommendation status: blocked until an approved production catalog release exists

## Directory Map

| Path | Purpose | Commit policy |
| --- | --- | --- |
| `source-video-references/` | Metadata records, relative references, source-root tokens, checksums, and optional local symlink instructions for original Xbox recordings. | Commit metadata only. Do not commit `.mp4`, `.mov`, `.m4v`, or `.webm` masters. |
| `generated/contact-sheets/` | Locally generated contact sheets used for frame review. | Git-ignored except this README and `.gitkeep`. Contact sheets are derivatives, never masters. |
| `generated/full-resolution-frames/` | Locally extracted full-resolution frame derivatives with timestamp provenance. | Git-ignored except this README and `.gitkeep`. Commit manifests, not frame images. |
| `generated/cropped-measurement-derivatives/` | Non-destructive crops or alignment derivatives for measurement review. | Git-ignored except this README and `.gitkeep`. Never overwrite masters. |
| `catalog-candidates/research/` | Research-candidate records derived from direct frame inspection. | Commit only non-production records that declare their research status and provenance. |
| `catalog-candidates/verification/` | Candidate packages prepared for second-person review. | Commit only verification-candidate metadata; do not mark records `VERIFIED` without genuine second review. |
| `imports/tomorrow-additional-videos/` | Documented landing zone for the next batch of owner-supplied videos. | Commit import manifests and notes only. Raw videos are ignored. |
| `manifests/` | Evidence manifests, source-root maps, derivative manifests, and processing plans. | Commit portable metadata. Absolute paths may appear only with a portable counterpart. |
| `reports/` | Human-readable audit reports and inventory summaries. | Commit reports that clearly state research/non-production status. |

Production catalog data remains under `data/catalog/production/`.

Test fixtures remain under `data/fixtures/test-only/`.

## Lifecycle

1. Register a source video by checksum, owner-supplied filename, working filename, and a portable evidence-root token.
2. Keep the master in owner-controlled local storage or an approved private evidence store.
3. Generate contact sheets or frames into `generated/` for local review.
4. Record derivative provenance: source video ID, source filename, SHA-256, timestamp, transformation, and operator.
5. Convert direct observations into research-candidate records only after frame inspection.
6. Move candidate metadata into verification only when ready for independent second review.
7. Publish to production only through the existing catalog validation and production publish gates.

## Git-Ignore Behavior

The repository ignores local source-video media and generated derivatives in this staging area. If someone force-adds those files, `node scripts/repository-status.mjs --strict` warns before commit.

Allowed committed artifacts include JSON, CSV, Markdown, and other lightweight metadata needed to reproduce the audit trail.
