# Tomorrow Additional Videos Import Directory

Use this directory to document the next owner-supplied video batch.

Preferred workflow:

1. Place original videos in owner-controlled local storage, not Git.
2. Add or update an import manifest here with filename, size, checksum, source-root token, and notes.
3. Run the source-video intake tooling against the local master path.
4. Move generated reports into `data/research/cf27/reports/`.
5. Keep all candidate observations in research status until reviewed.

Raw video files in this tree are ignored by Git. Do not force-add them.
