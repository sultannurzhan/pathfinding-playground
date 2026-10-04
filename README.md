# Pathfinding Playground

**Draw a landscape. Choose a search. Watch a route emerge.**

An original interactive field guide to breadth-first search, Dijkstra, and A*. Warm paper, green ink, a mint frontier, and an amber route make the computation visible. A static TypeScript app with no runtime dependencies, accounts, backend, analytics, remote fonts, or paid services.

[Open the playground](https://sultannurzhan.github.io/pathfinding-playground/) · [Source repository](https://github.com/sultannurzhan/pathfinding-playground)

![Three algorithms on the same weighted landscape](docs/screenshots/desktop-comparison.jpg)

[View the mobile layout](docs/screenshots/mobile-playground.jpg)

## Try it in 30 seconds

1. Press **Run search** on the opening landscape.
2. Draw a wall, paint sand or marsh, or drag the **S** and **G** markers.
3. Choose **The price of a shortcut**, then **Compare all**. BFS takes fewer steps through expensive terrain; Dijkstra and A* find a cheaper detour.

## Features

- Six original landscapes, from a weighted shortcut to an unreachable island.
- Walls, erase, sand (cost 3), marsh (cost 5), and movable start/goal points. Open ground costs 1; endpoints may overlap.
- Deterministic exploration, frontier and expanded states, route reveal, pause, single-event step, speed control, and instant finish.
- Three independent search states on exactly the same map. Editing, resetting, or loading a map cancels pending playback safely.
- Undo/redo for map edits, three grid sizes, browser-local saves, validated JSON import/export, and share links containing the complete map in a URL fragment.
- Mouse, touch, and keyboard editing, one tab stop per board, visible focus, non-color state markers, and reduced-motion support. On narrow screens, the boards stack and explicit left/right controls navigate wide maps.

## Run locally

Use **Node.js 24** and npm. Development requires an internet connection for the initial dependency installation; the app itself makes no network requests beyond its static files.

```sh
npm ci
npm run dev
```

Open the loopback URL printed by Vite, normally `http://127.0.0.1:5173`. The preview server binds only to `127.0.0.1`.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` checks strict TypeScript and writes the static site to `dist/`. `preview` serves that production build on loopback. Vite uses the relative base `./`, so assets work under a GitHub Pages repository subpath.

## The algorithms

All movement is **four-directional**: up, right, down, left. The cost of a move is the positive cost of the cell entered. Walls cannot be entered. The start is free, including when start and goal coincide.

| Algorithm | Frontier order | Guarantee |
| --- | --- | --- |
| BFS | First discovered, first processed | Fewest steps. Minimum cost only when every move has equal cost. |
| Dijkstra | Lowest accumulated cost | Minimum-cost route on these positive-cost maps. |
| A* | Accumulated cost + Manhattan distance × 1 | Minimum-cost route. The minimum allowed step cost is 1, making this heuristic admissible and consistent. |

BFS deliberately ignores weights when choosing its route, but its reported **total cost** still sums the real terrain costs. Equal-priority choices use stable insertion order; neighbors are inserted in up/right/down/left order. Several different paths can be equally optimal.

The implementation uses a queue for BFS and a binary min-heap with stale-entry rejection for Dijkstra/A*. A closed cell is expanded once. The consistent A* heuristic allows closed cells to remain closed.

### Reading the metrics

- **Expanded:** distinct cells removed from the frontier and processed. Includes the start, and includes the goal when reached. This is the actual count at the current animation frame.
- **Path steps:** number of moves in the completed route, excluding the starting cell.
- **Total cost:** sum of entered terrain costs, excluding the start. This is not the number of steps on a weighted map.

Steps and cost appear once route playback completes; an unreachable route shows dashes. Start = goal yields 0 steps and cost 0, with one expanded cell. Frontier cells are discovered but not yet expanded. Each Step advances one expansion or one route-reveal event per unfinished board. Comparison animation uses the same event pace, **not a CPU performance benchmark**.

## Controls and persistence

Tab to the grid, use the arrow keys to move, and Space or Enter to apply the selected brush. Home/End move to the row edges. W/E select wall/erase, 3/5 select terrain, and S/G select an endpoint. Ctrl/⌘ Z undoes; Ctrl/⌘ Shift Z redoes. Escape pauses playback. Pointer strokes are grouped into one undo entry.

Moving an endpoint onto a wall opens that destination cell. Wall painting never hides an endpoint. Clear map restores open terrain while preserving endpoints. Choosing a grid size creates a new blank map and can be undone. Resizing the browser preserves the landscape. Playback pauses when the window loses focus or the tab is hidden.

The local shelf stores at most 12 named maps in browser storage. Corrupted records are skipped with a message. Disabled/full storage does not prevent editing, JSON export, or sharing. Delete affects the saved copy, not the current board.

Share links encode versioned map data in the URL fragment, which is not sent to the hosting server. Dimensions, terrain values, array lengths, version, and endpoint positions are validated before loading. JSON input is limited to 6 KB; shared data to 6,000 encoded characters; maps to 41 × 31 cells. Invalid input never overwrites the current landscape. Share links preserve the map after a reload; editing clears the stale map fragment. Links include landscape data, not playback state or personal information.

## Structure and verification

```text
src/algorithms.ts   Pure deterministic searches and event traces
src/playback.ts     Independent run states and cancellable injected clock
src/scenario.ts     Validation, serialization, local saves, bounded history
src/presets.ts      Six original landscape definitions
src/main.ts        DOM rendering, keyboard/pointer editing, application controls
src/style.css      Responsive exhibit design and reduced-motion rules
tests/             Native Node test runner; no test framework dependency
```

The automated suite tests hand-checkable weighted detours, equal-cost fixtures, unreachable goals, start=goal, row boundaries, stable ties, metric semantics, and 250 seeded maps against an independently implemented Bellman-Ford-style oracle. It checks share/export round trips, malformed inputs, storage failures, history isolation, and fake-clock playback cancellation—including callbacks that fire after cancellation. Strict TypeScript checks application types and rejects unused locals and parameters.

See [verification notes](docs/VERIFICATION.md) for actual browser/deployment checks and [build notes](docs/PROGRESS.md) for implementation decisions. The UI is deliberately DOM-based for keyboard access. Grid dimensions are bounded to keep all three comparison boards responsive. Search traces are precomputed, then played back; animation time should not be interpreted as algorithm execution time.

## Deployment and license

The repository's GitHub Actions workflow tests and builds the app, uploads **only `dist/`**, and deploys it with GitHub Pages. Pages uses GitHub Actions as the deployment source. Pushes to `main` and manual workflow dispatches trigger deployment. Hosting is free for this public repository.

All UI, icons, maps, and application code are original. System fonts require no bundled font asset. Application code is [MIT licensed](LICENSE); development dependencies retain their own licenses. Screenshots, when included, capture only this original app.
