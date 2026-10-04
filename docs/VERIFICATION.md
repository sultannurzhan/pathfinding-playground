# Verification record

## Automated checks

- `npm run typecheck` — passed (strict TypeScript, including unused local/parameter checks).
- `npm test` — passed: 16 test cases. Includes 250 seeded generated maps checked against an independent shortest-path oracle, in addition to hand-checkable fixtures.
- `npm run build` — passed. Relative asset base supports repository-scoped static hosting.
- `npm install` audit — 0 vulnerabilities reported at installation.

Independent QA in the coordinating session separately checked 513 maps / 1,539 algorithm runs, including 500 generated maps, against its own cost/step oracle. It also verified deterministic replay, correct metrics, frontier/expanded semantics, bounded scenario validation, serialization round trips, storage resilience, and playback with a fake clock.

## Browser verification — 2026-10-05

Performed in the supported Codex in-app Chromium browser against the running app:

- Desktop layout at 1440px and responsive layouts at 390px and 320px; no page-wide horizontal overflow. Original screenshots are in `docs/screenshots/`.
- Play/pause holds the expanded count; Step advances one expansion; reset clears traces without changing terrain. Editing during playback cancels traces and no stale marks return.
- Continuous pointer drawing paints intervening cells and groups the stroke into one undo. Erase, terrain painting, endpoint movement, arrow-key navigation, Space painting, undo and redo work.
- Start = goal gives one expanded cell, zero steps and zero cost. Unreachable target gives a clear no-route message and no invented route metrics.
- The weighted shortcut comparison reports BFS 18 steps / cost 70, Dijkstra 24 / 24, A* 24 / 24. Weighted route cells remain amber and retain their cost numeral.
- Editing one comparison board updates all three copies and resets all traces. Step then advances each unfinished board independently.
- Named local save/load restores terrain, and the save persists through page reload. The disposable QA save was removed afterward.
- Shared URL preserves 65 weighted cells and both endpoints through opening, reload, and search reset. A malformed fragment displays an error safely. The visible share field provides a copyable URL; clipboard integration is browser-dependent.
- Actual file-picker import of a 3×3 weighted fixture gives BFS 2 steps / cost 6 and Dijkstra/A* 4 / 4. Malformed JSON import leaves that map and its metrics unchanged.
- Narrow-screen Left/Right controls bring offscreen cells and the goal into view. Pointer editing works after panning. Browser resize preserves the map.
- Emulated `prefers-reduced-motion: reduce` yields zero-duration control transitions.
- No browser console warnings or errors in the final interaction pass.

Independent design review inspected the final desktop and mobile screenshots and found no blocking visual issues.

### Limits of verification

Responsive widths and pointer/keyboard interactions were checked in Chromium. The available browser tool does not support dispatching touch events; physical touchscreen behavior and a full screen-reader audit were not independently verified. Touch handling uses the same pointer-event path, with explicit pan controls for wide maps. Safari and Firefox were not tested.

## Publication

The personal GitHub owner was verified as `sultannurzhan`. Only this application subfolder is tracked. The publication review found no credentials, private project files, personal machine paths, or private contact metadata in the tracked candidates. Commit identity uses the verified public username and GitHub noreply address.

GitHub Pages deployed successfully on 2026-10-05 (Asia/Seoul). [The initial build and deployment](https://github.com/sultannurzhan/pathfinding-playground/actions/runs/37235236730) passed installation, strict TypeScript, all 16 tests, production build, and static deployment for application commit `a1c0c29`.

The actual public URL, https://sultannurzhan.github.io/pathfinding-playground/, was opened in a fresh browser tab. The deployed app passed play/pause/step/reset, wall editing, preset loading, and three-way weighted comparison, with the same 70 / 24 / 24 route costs. The deployed script loaded from the correct repository subpath. A newly generated public share link loaded all 65 weighted cells and retained them after reload. No console warnings or errors were observed. HTTPS is enforced. No paid hosting, backend, or account creation was used.
