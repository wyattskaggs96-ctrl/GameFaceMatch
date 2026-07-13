# Source-Video References

Use this directory for metadata that references original Xbox screen recordings without copying the large masters into Git.

Allowed examples:

- Source-root maps such as `OWNER_DOWNLOADS`.
- Checksums and file sizes.
- Working filename maps.
- Timestamp indexes.
- Local symlink instructions.

Do not commit source masters here. The `.gitignore` rules block common video extensions, and the repository-status script warns if media is force-added.

Every reference must include a portable path or evidence-root token. A local absolute path may be retained for internal processing only when a portable counterpart is present.
