# Codex Engineering Rules

Codex and all contributors must read `docs/GAMEFACE_MATCH_SOURCE_OF_TRUTH.md` before changing the project.

## Permanent rules

1. Never invent a College Football 27 option, label, index, menu path, preset, slider, hairstyle, facial-hair option, or platform difference.
2. Only verified production-catalog records may become user-facing.
3. Test fixtures must remain under `data/fixtures/test-only/` and must never be loaded as production data.
4. Raw face media is deleted by default.
5. Basic matching must not require an account.
6. Face processing must not identify people or infer sensitive traits.
7. Geometry and visual appearance are separate profiles.
8. Skin tone must not affect geometric similarity.
9. New games must use the game-adapter interface.
10. External services must remain behind interfaces and are not added without a documented need.
11. Secrets must never be committed.
12. No remote push, publishing, App Store submission, paid cloud resource, or destructive command without explicit approval.
13. Report the exact commands run and do not claim a build or test passed unless it actually passed.
