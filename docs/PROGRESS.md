# Build log

## Decisions
- Original static exhibit. Vanilla TypeScript, Vite, no runtime dependencies or remote assets.
- Minimal monochrome design, system Georgia and sans-serif typography; all maps and icons original. Distinct grayscale fills, dotted frontiers, and white route markers preserve the search-state meanings.
- Four-neighbor movement, destination-cell cost, terrain costs 1 / 3 / 5. The start costs zero.
- Fixed neighbor order (up, right, down, left), stable insertion-order priority ties.
- Pure algorithm event traces; independently applied comparison states and a single cancellable playback clock.
- Versioned and bounded scenario validation shared by URLs, imported files, and browser-local saves.
- Publication owned by the coordinating session and scoped to this app folder.

## Progress

- Delivery complete on 2026-10-05: original app committed and pushed to the verified personal GitHub account, GitHub Pages deployment succeeded, and core interactions plus sharing were verified at the actual public URL. See VERIFICATION.md for evidence and precise testing limits.
- Complete application implementation: pure algorithms, deterministic event traces, cancellable playback, same-map comparison, pointer/keyboard editing, undo/redo, curated presets, validation, local saves, share URLs, file import/export, responsive layout.
- Strict typecheck, 16 automated tests (including 250 independent-oracle generated maps), and production build pass.
- Independent QA reported its separate algorithm/oracle and fake-clock playback checks passing.
- Fixed findings during coordinated review: retained shared URL across reload and search-only changes; cancelled active strokes across controls; guarded unchanged live-region writes; added touch/keyboard horizontal board controls; gave route/exploration fill priority over terrain fill.
- Coordinating session is running actual desktop/mobile browser QA and owns final GitHub/Pages publication. Repository and intended Pages links are documented; deployment must be independently verified.
