import "./style.css";
import { ALGORITHMS, ALGORITHM_NAMES, search } from "./algorithms.ts";
import type { Algorithm } from "./algorithms.ts";
import { Playback } from "./playback.ts";
import {
  blankScenario,
  cloneScenario,
  decodeShare,
  encodeShare,
  exportScenario,
  importScenario,
  readSaves,
  ScenarioHistory,
  writeSaves,
} from "./scenario.ts";
import type { Cell, SavedScenario, Scenario } from "./scenario.ts";
import { PRESETS } from "./presets.ts";

const icons = {
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z" fill="currentColor"/></svg>',
  pause:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12" stroke="currentColor" stroke-width="3"/></svg>',
  step: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 5 8 5-8 5Z" fill="currentColor"/><path d="M15 4v12" stroke="currentColor" stroke-width="2"/></svg>',
  reset:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 8a6 6 0 1 1 1 7M4 3v5h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow:
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <a class="skip-link" href="#workbench">Skip to playground</a>
  <header class="masthead"><a class="brand" href="./" aria-label="Pathfinding Playground home"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>Pathfinding Playground</a><a class="text-link" href="#field-guide">The field guide <span aria-hidden="true">↗</span></a></header>
  <main>
    <section class="hero" aria-labelledby="page-title"><div><p class="eyebrow">An interactive field guide <span> / No. 01</span></p><h1 id="page-title">Find another <em>way.</em></h1></div><div class="hero-note"><p>Draw a landscape. Choose a search.<br> Watch a route emerge.</p><span class="hero-prompt"><span aria-hidden="true">↳</span> A little curiosity goes a long way.</span></div></section>
    <section class="workbench" id="workbench" aria-label="Pathfinding workbench">
      <div class="scenario-bar"><div class="scenario-select"><label class="eyebrow" for="preset">Your landscape</label><select id="preset" aria-label="Preset landscape"></select></div><div class="mode-switch" role="group" aria-label="View mode"><button id="single" aria-pressed="true">One search</button><button id="compare" aria-pressed="false">Compare all <span aria-hidden="true">↔</span></button></div></div>
      <p id="scenario-description" class="scenario-description"></p>
      <div class="transport"><div class="algorithm-control"><label for="algorithm">Algorithm</label><select id="algorithm"><option value="astar">A* search</option><option value="dijkstra">Dijkstra</option><option value="bfs">Breadth-first (BFS)</option></select></div><button id="play" class="primary">${icons.play}<span>Run search</span></button><button id="step" title="Pause and advance one event">${icons.step}<span>Step</span></button><button id="reset">${icons.reset}<span>Reset search</span></button><button id="finish" class="quiet" title="Show the completed result immediately">Finish now</button><label class="speed" for="speed"><span>Speed <output id="speed-value">35</output><span class="speed-unit"> events/s</span></span><input id="speed" type="range" min="1" max="120" value="35" aria-label="Playback speed in events per second"></label></div>
      <div class="edit-bar"><div class="brushes" role="group" aria-label="Drawing tools"><button data-brush="wall" class="brush" aria-pressed="true" title="Draw walls (W)"><span class="tool-swatch wall-swatch" aria-hidden="true"></span>Wall</button><button data-brush="erase" class="brush" aria-pressed="false" title="Erase to cost 1 (E)"><span class="tool-swatch erase-swatch" aria-hidden="true"></span>Erase</button><button data-brush="3" class="brush" aria-pressed="false" title="Paint cost 3 terrain (3)"><span class="tool-swatch terrain-swatch" aria-hidden="true">3</span>Sand</button><button data-brush="5" class="brush" aria-pressed="false" title="Paint cost 5 terrain (5)"><span class="tool-swatch terrain-swatch heavy" aria-hidden="true">5</span>Marsh</button><button data-brush="start" class="brush" aria-pressed="false" title="Place start (S)"><span class="tool-swatch start-swatch" aria-hidden="true">S</span>Start</button><button data-brush="goal" class="brush" aria-pressed="false" title="Place goal (G)"><span class="tool-swatch goal-swatch" aria-hidden="true">G</span>Goal</button></div><div class="history-controls"><button id="undo" class="icon-button" aria-label="Undo map edit" title="Undo (Ctrl/⌘ Z)">↶</button><button id="redo" class="icon-button" aria-label="Redo map edit" title="Redo (Ctrl/⌘ Shift Z)">↷</button><button id="clear" class="quiet">Clear map</button></div></div>
      <div class="board-area"><div class="board-context"><span id="board-hint">Drag to draw walls. Drag S or G to move them.</span><label for="grid-size">Grid <select id="grid-size" aria-label="Grid dimensions"><option value="17x11">17 × 11</option><option value="25x15" selected>25 × 15</option><option value="33x19">33 × 19</option></select></label></div><p id="comparison-note" class="comparison-note" hidden>Same map. Same event pace. Different decisions. Animation speed is not a runtime benchmark.</p><div id="boards" class="boards"></div><div class="legend" aria-label="Grid legend"><span><i class="legend-start">S</i>Start</span><span><i class="legend-goal">G</i>Goal</span><span><i class="legend-wall"></i>Wall</span><span><i class="legend-frontier"></i>Frontier · waiting</span><span><i class="legend-expanded">·</i>Expanded · checked</span><span><i class="legend-route">●</i>Route</span><span class="legend-cost">Open = 1 · Sand = 3 · Marsh = 5</span></div></div>
      <div class="workbench-bottom"><p id="status" role="status" aria-live="polite">Ready to explore.</p><div class="map-actions"><button id="share" class="quiet">Share map <span aria-hidden="true">↗</span></button><button id="open-shelf" class="quiet" aria-expanded="false" aria-controls="shelf">My maps <span aria-hidden="true">＋</span></button></div></div>
      <div id="share-panel" class="share-panel" hidden><label for="share-url">Your map, in a link</label><input id="share-url" type="text" readonly aria-label="Shareable scenario URL"><button id="close-share" class="quiet">Close</button></div>
      <section id="shelf" class="shelf" hidden aria-label="Local scenario library"><div class="shelf-heading"><div><h2>A shelf for your ideas.</h2><p>Saved only in this browser. Export a file to keep a copy.</p></div><button id="close-shelf" class="quiet">Close</button></div><div class="shelf-columns"><form id="save-form"><label for="save-name">Name this landscape</label><div class="input-group"><input id="save-name" maxlength="50" required placeholder="My next great detour"><button class="primary" type="submit">Save map</button></div></form><div><label for="saved-maps">Your saved maps</label><div class="input-group"><select id="saved-maps" aria-label="Saved scenarios"></select><button id="load-save">Load</button><button id="delete-save" class="quiet">Delete</button></div></div></div><div class="file-actions"><button id="export">Export JSON ${icons.arrow}</button><button id="import">Import JSON ${icons.arrow}</button><input id="import-file" type="file" accept=".json,application/json" hidden><span>Up to 12 saved maps · no account needed</span></div></section>
    </section>
    <div class="underboard"><p><strong>A small experiment:</strong> try “The price of a shortcut” in Compare all. Is the shortest route always the cheapest?</p><button id="try-comparison" class="text-button">Try it ${icons.arrow}</button></div>
    <section class="field-guide" id="field-guide" aria-labelledby="guide-title"><div class="section-intro"><p class="eyebrow">Behind the journey</p><h2 id="guide-title">Three ways to find a path.</h2><p>The same landscape. Three different questions.</p></div><div class="guide-columns"><article><span class="guide-number">01 / BFS</span><h3>What is closest?</h3><p>Breadth-first search explores in rings, one step at a time. It guarantees the fewest steps. When every move costs the same, that is also the cheapest route.</p><p class="guide-note">On weighted maps, BFS ignores terrain cost. Fewer steps can cost more.</p></article><article><span class="guide-number">02 / Dijkstra</span><h3>What costs the least?</h3><p>Dijkstra always expands the frontier cell with the lowest cost so far. It finds a minimum-cost route, even when a longer path has cheaper ground.</p><p class="guide-note">A dependable explorer. Every move here has a positive cost.</p></article><article><span class="guide-number">03 / A*</span><h3>What looks promising?</h3><p>A* combines cost so far with a safe estimate of what remains: horizontal plus vertical distance, multiplied by the minimum allowed step cost, 1.</p><p class="guide-note">This estimate never overstates the remaining cost, so the route is minimum-cost.</p></article></div><details class="guide-details"><summary>Reading the numbers & keyboard controls <span aria-hidden="true">＋</span></summary><div class="detail-columns"><div><h3>Numbers with a meaning.</h3><p><strong>Expanded:</strong> distinct cells removed from the frontier and processed, including the start and the goal if reached. <strong>Path steps:</strong> moves in the final route, excluding the start. <strong>Total cost:</strong> sum of the terrain costs entered; the starting cell is free.</p><p>Movement is up, right, down, or left. Equal-priority choices follow a fixed insertion order. Step reveals one expansion or one route cell per unfinished board. Different optimal routes may have the same cost.</p></div><div><h3>Make room for your hands.</h3><p>Tab to a board, then use <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> <kbd>←</kbd> to move the cursor. <kbd>Space</kbd> or <kbd>Enter</kbd> paints. <kbd>W</kbd> wall, <kbd>E</kbd> erase, <kbd>3</kbd>/<kbd>5</kbd> terrain, <kbd>S</kbd> start, <kbd>G</kbd> goal. <kbd>Ctrl/⌘ Z</kbd> undoes a map edit.</p><p>On small screens, use the compact grid or scroll a board with its scrollbar. Two-finger page navigation stays outside the drawing surface. Finish now skips the animation; reduced-motion preferences remove decorative transitions.</p></div></div></details></section>
  </main><footer><span>Pathfinding Playground</span><span>Made for the joy of figuring things out.</span><a href="#page-title">Back to the beginning ↑</a></footer><div id="announcement" class="sr-only" aria-live="polite"></div>
`;

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
type Brush = "wall" | "erase" | "3" | "5" | "start" | "goal";
let scenario = PRESETS[0].make();
let selectedAlgorithm: Algorithm = "astar";
let compare = false;
let brush: Brush = "wall";
let activeCell = scenario.start;
let saves: SavedScenario[] = [];
let notice =
  "Ready to explore. Choose Run search, or make this landscape your own.";
let lastAnnouncement = "";
let stroke: {
  grid: HTMLElement;
  pointerId: number;
  brush: Brush;
  last: number;
  recorded: boolean;
} | null = null;
const history = new ScenarioHistory();
interface BoardView {
  algorithm: Algorithm;
  root: HTMLElement;
  grid: HTMLElement;
  cells: HTMLButtonElement[];
  visited: HTMLElement;
  steps: HTMLElement;
  cost: HTMLElement;
  status: HTMLElement;
  caveat: HTMLElement;
}
let boards: BoardView[] = [];
const boardResizeObserver = new ResizeObserver(() => updateBoardScrolling());
let rendering = false;
const playback = new Playback(() => {
  if (!rendering) render();
});

function setNotice(text: string) {
  notice = text;
  renderStatus();
}
function announce(text: string) {
  if (text !== lastAnnouncement) {
    el("announcement").textContent = text;
    lastAnnouncement = text;
  }
}
function refreshSavedOptions() {
  const select = el<HTMLSelectElement>("saved-maps");
  select.replaceChildren();
  if (!saves.length) select.add(new Option("Your shelf is empty", ""));
  for (const save of saves) select.add(new Option(save.name, save.id));
  el<HTMLButtonElement>("load-save").disabled = !saves.length;
  el<HTMLButtonElement>("delete-save").disabled = !saves.length;
}
function persist(next: SavedScenario[]): boolean {
  try {
    writeSaves(localStorage, next);
    saves = next;
    refreshSavedOptions();
    return true;
  } catch {
    setNotice(
      "Saving is unavailable or your browser storage is full. Export JSON to keep this map.",
    );
    return false;
  }
}
function selectedAlgorithms(): Algorithm[] {
  return compare ? ALGORITHMS : [selectedAlgorithm];
}
function invalidate(clearSharedMap = false) {
  rendering = true;
  playback.clear();
  rendering = false;
  el("share-panel").hidden = true;
  if (clearSharedMap && location.hash.startsWith("#map="))
    window.history.replaceState(null, "", location.pathname + location.search);
}
function applyScenario(
  next: Scenario,
  description: string,
  record = true,
  preserveSharedMap = false,
) {
  endStroke();
  if (record) history.record(scenario);
  scenario = cloneScenario(next);
  activeCell = Math.min(activeCell, scenario.cells.length - 1);
  invalidate(!preserveSharedMap);
  notice = description;
  const dimensions = `${scenario.width}x${scenario.height}`;
  const select = el<HTMLSelectElement>("grid-size");
  const custom = select.querySelector("option[data-custom]");
  custom?.remove();
  if (![...select.options].some((o) => o.value === dimensions)) {
    const o = new Option(`${scenario.width} × ${scenario.height}`, dimensions);
    o.dataset.custom = "true";
    select.add(o);
  }
  select.value = dimensions;
  buildBoards();
  render();
}
function customMap() {
  el<HTMLSelectElement>("preset").value = "custom";
  el("scenario-description").textContent =
    "Your own landscape. Every edit is a new question to ask the algorithms.";
}

function cellDescription(index: number, mark = 0): string {
  const row = Math.floor(index / scenario.width) + 1,
    col = (index % scenario.width) + 1;
  const role =
    index === scenario.start && index === scenario.goal
      ? ", start and goal"
      : index === scenario.start
        ? ", start"
        : index === scenario.goal
          ? ", goal"
          : "";
  return `Row ${row}, column ${col}, ${scenario.cells[index] === 0 ? "wall" : `cost ${scenario.cells[index]}`}${role}${mark === 1 ? ", frontier" : mark === 2 ? ", expanded" : mark === 3 ? ", final route" : ""}`;
}
function buildBoards() {
  boardResizeObserver.disconnect();
  const container = el("boards");
  container.classList.toggle("is-comparing", compare);
  container.replaceChildren();
  boards = [];
  for (const algorithm of selectedAlgorithms()) {
    const root = document.createElement("article");
    root.className = "board";
    root.dataset.algorithm = algorithm;
    root.innerHTML = `<div class="board-header"><div><span class="board-index">${String(ALGORITHMS.indexOf(algorithm) + 1).padStart(2, "0")}</span><h2>${ALGORITHM_NAMES[algorithm]}</h2></div><span class="board-state">Ready</span></div><p class="algorithm-caveat"></p><div class="grid-scroll"><div class="grid" role="grid" aria-label="${ALGORITHM_NAMES[algorithm]} editable map" aria-describedby="board-hint" aria-rowcount="${scenario.height}" aria-colcount="${scenario.width}"></div></div><dl class="metrics"><div><dt title="Distinct cells removed from the frontier and processed, including start and goal if reached">Expanded</dt><dd data-metric="visited">0</dd></div><div><dt title="Number of moves, excluding the start">Path steps</dt><dd data-metric="steps">—</dd></div><div><dt title="Sum of terrain costs entered; start is free">Total cost</dt><dd data-metric="cost">—</dd></div></dl>`;
    const grid = root.querySelector<HTMLElement>(".grid")!;
    grid.style.setProperty("--columns", String(scenario.width));
    const cells: HTMLButtonElement[] = [];
    for (let y = 0; y < scenario.height; y++) {
      const row = document.createElement("div");
      row.className = "grid-row";
      row.setAttribute("role", "row");
      for (let x = 0; x < scenario.width; x++) {
        const index = y * scenario.width + x,
          cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.cell = String(index);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-rowindex", String(y + 1));
        cell.setAttribute("aria-colindex", String(x + 1));
        cell.tabIndex = index === activeCell ? 0 : -1;
        row.append(cell);
        cells.push(cell);
      }
      grid.append(row);
    }
    grid.addEventListener("pointerdown", onPointerDown);
    grid.addEventListener("pointermove", onPointerMove);
    grid.addEventListener("pointerup", endStroke);
    grid.addEventListener("pointercancel", endStroke);
    grid.addEventListener("lostpointercapture", endStroke);
    grid.addEventListener("contextmenu", (event) => event.preventDefault());
    grid.addEventListener("keydown", onGridKey);
    grid.addEventListener("focusin", (event) => {
      const index = Number((event.target as HTMLElement).dataset.cell);
      if (Number.isInteger(index)) {
        activeCell = index;
        for (const view of boards)
          for (let i = 0; i < view.cells.length; i++)
            view.cells[i].tabIndex = i === activeCell ? 0 : -1;
      }
    });
    container.append(root);
    boards.push({
      algorithm,
      root,
      grid,
      cells,
      visited: root.querySelector('[data-metric="visited"]')!,
      steps: root.querySelector('[data-metric="steps"]')!,
      cost: root.querySelector('[data-metric="cost"]')!,
      status: root.querySelector(".board-state")!,
      caveat: root.querySelector(".algorithm-caveat")!,
    });
    const viewport = root.querySelector<HTMLElement>(".grid-scroll")!;
    const navigation = document.createElement("div");
    navigation.className = "pan-controls";
    navigation.hidden = true;
    navigation.innerHTML =
      '<button type="button" data-pan="-1" aria-label="Scroll map left">← Left</button><span class="pan-position"></span><button type="button" data-pan="1" aria-label="Scroll map right">Right →</button>';
    viewport.after(navigation);
    navigation
      .querySelectorAll<HTMLButtonElement>("[data-pan]")
      .forEach((button) =>
        button.addEventListener("click", () => {
          endStroke();
          viewport.scrollBy({
            left:
              Number(button.dataset.pan) *
              Math.max(100, viewport.clientWidth * 0.75),
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
        }),
      );
    viewport.addEventListener("scroll", updateBoardScrolling, {
      passive: true,
    });
    boardResizeObserver.observe(viewport);
  }
  updateBoardScrolling();
}
function updateBoardScrolling() {
  for (const board of boards) {
    const viewport = board.root.querySelector<HTMLElement>(".grid-scroll")!,
      controls = board.root.querySelector<HTMLElement>(".pan-controls");
    if (!controls) continue;
    const overflow = viewport.scrollWidth - viewport.clientWidth;
    controls.hidden = overflow < 2;
    if (overflow < 2) continue;
    const cellWidth = board.grid.scrollWidth / scenario.width;
    const first = Math.floor(viewport.scrollLeft / cellWidth) + 1,
      last = Math.min(
        scenario.width,
        Math.ceil((viewport.scrollLeft + viewport.clientWidth) / cellWidth),
      );
    controls.querySelector(".pan-position")!.textContent =
      `Columns ${first}–${last} of ${scenario.width}`;
    controls.querySelector<HTMLButtonElement>('[data-pan="-1"]')!.disabled =
      viewport.scrollLeft < 2;
    controls.querySelector<HTMLButtonElement>('[data-pan="1"]')!.disabled =
      viewport.scrollLeft >= overflow - 2;
  }
}
function renderStatus() {
  if (el("status").textContent !== notice) el("status").textContent = notice;
}
function render() {
  const weighted = scenario.cells.some((c) => c > 1);
  for (const board of boards) {
    const run = playback.getRun(board.algorithm);
    board.visited.textContent = String(run?.visited ?? 0);
    board.steps.textContent =
      run?.done && run.trace.found ? String(run.trace.steps) : "—";
    board.cost.textContent =
      run?.done && run.trace.found ? String(run.trace.cost) : "—";
    board.status.textContent = run?.done
      ? run.trace.found
        ? "Route found"
        : "No route"
      : run?.phase === "tracing"
        ? "Tracing route"
        : playback.playing
          ? "Exploring"
          : run && run.cursor > 0
            ? "Paused"
            : "Ready";
    board.status.dataset.state = run?.done
      ? run.trace.found
        ? "found"
        : "unreachable"
      : playback.playing
        ? "playing"
        : "ready";
    board.caveat.textContent =
      board.algorithm === "bfs"
        ? weighted
          ? "Fewest steps · ignores terrain costs on this map"
          : "Fewest steps · minimum cost when all moves cost the same"
        : board.algorithm === "dijkstra"
          ? "Minimum cost · explores the cheapest frontier first"
          : "Minimum cost · guided by Manhattan distance";
    board.caveat.classList.toggle(
      "weighted-warning",
      board.algorithm === "bfs" && weighted,
    );
    for (let i = 0; i < board.cells.length; i++) {
      const cell = board.cells[i],
        terrain = scenario.cells[i],
        mark = run?.marks[i] ?? 0;
      const start = i === scenario.start,
        goal = i === scenario.goal;
      const className = `cell${terrain === 0 ? " is-wall" : terrain > 1 ? " is-terrain" : ""}${mark === 1 ? " is-frontier" : mark === 2 ? " is-expanded" : mark === 3 ? " is-route" : ""}${start ? " is-start" : ""}${goal ? " is-goal" : ""}`;
      if (cell.className !== className) cell.className = className;
      const text =
        start && goal
          ? "S/G"
          : start
            ? "S"
            : goal
              ? "G"
              : terrain > 1
                ? String(terrain)
                : "";
      if (cell.textContent !== text) cell.textContent = text;
      cell.setAttribute("aria-label", cellDescription(i, mark));
      cell.dataset.cost = String(terrain);
    }
  }
  const play = el<HTMLButtonElement>("play");
  const playText = playback.playing
    ? "Pause"
    : playback.complete
      ? "Run again"
      : playback.hasStarted
        ? "Resume"
        : "Run search";
  play.innerHTML = `${playback.playing ? icons.pause : icons.play}<span>${playText}</span>`;
  el<HTMLButtonElement>("step").disabled = playback.complete;
  el<HTMLButtonElement>("finish").disabled = playback.complete;
  el<HTMLButtonElement>("undo").disabled = !history.canUndo;
  el<HTMLButtonElement>("redo").disabled = !history.canRedo;
  el<HTMLSelectElement>("algorithm").disabled = compare;
  el("single").setAttribute("aria-pressed", String(!compare));
  el("compare").setAttribute("aria-pressed", String(compare));
  el("comparison-note").hidden = !compare;
  if (playback.complete) {
    const result = playback.runs[0].trace;
    notice = compare
      ? result.found
        ? `Comparison complete. Route costs — ${playback.runs.map((r) => `${ALGORITHM_NAMES[r.trace.algorithm]}: ${r.trace.cost}`).join(" · ")}.`
        : "No route for any algorithm. Try opening a wall, or moving the goal."
      : result.found
        ? scenario.start === scenario.goal
          ? "Already there. Start and goal share a cell: 0 steps, 0 cost."
          : `Route found. ${result.steps} steps, total cost ${result.cost}. Try changing the landscape.`
        : "No route. Every reachable cell was checked. Try opening a wall.";
  }
  renderStatus();
}
function ensureRuns() {
  if (!playback.runs.length)
    playback.load(
      selectedAlgorithms().map((a) => search(scenario, a)),
      scenario.cells.length,
      scenario.start,
    );
}
function setMode(value: boolean) {
  endStroke();
  if (compare === value) return;
  compare = value;
  invalidate();
  notice = value
    ? "Compare three searches on exactly the same landscape."
    : "Ready to explore.";
  buildBoards();
  render();
}
function setBrush(value: Brush) {
  endStroke();
  brush = value;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-brush]",
  ))
    button.setAttribute("aria-pressed", String(button.dataset.brush === brush));
  const labels: Record<Brush, string> = {
    wall: "Drag to draw walls. Drag S or G to move them.",
    erase: "Drag to restore open terrain (cost 1).",
    "3": "Drag to paint sand. Each entered cell costs 3.",
    "5": "Drag to paint marsh. Each entered cell costs 5.",
    start: "Tap a cell to place the start. Start and goal may overlap.",
    goal: "Tap a cell to place the goal. Start and goal may overlap.",
  };
  el("board-hint").textContent = labels[value];
  announce(labels[value]);
}
function paint(index: number, tool: Brush, record: () => void): boolean {
  if (index < 0 || index >= scenario.cells.length) return false;
  if (tool === "start" || tool === "goal") {
    if (scenario[tool] === index) return false;
    record();
    scenario[tool] = index;
    if (scenario.cells[index] === 0) scenario.cells[index] = 1;
  } else {
    const value: Cell =
      tool === "wall" ? 0 : tool === "erase" ? 1 : (Number(tool) as Cell);
    if ((index === scenario.start || index === scenario.goal) && value === 0)
      return false;
    if (scenario.cells[index] === value) return false;
    record();
    scenario.cells[index] = value;
  }
  return true;
}
function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary) return;
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
    ".cell",
  );
  if (!target) return;
  event.preventDefault();
  const index = Number(target.dataset.cell),
    grid = event.currentTarget as HTMLElement;
  endStroke();
  const selected =
    brush === "wall" && index === scenario.start
      ? "start"
      : brush === "wall" && index === scenario.goal
        ? "goal"
        : brush;
  stroke = {
    grid,
    pointerId: event.pointerId,
    brush: selected,
    last: index,
    recorded: false,
  };
  target.focus({ preventScroll: true });
  grid.setPointerCapture(event.pointerId);
  paintStroke(index);
}
function paintStroke(index: number) {
  if (!stroke) return;
  const current = stroke;
  if (
    paint(index, current.brush, () => {
      if (!current.recorded) {
        history.record(scenario);
        current.recorded = true;
        customMap();
      }
      invalidate(true);
    })
  ) {
    notice = "Map updated. Ready for a fresh search.";
    render();
  }
}
function onPointerMove(event: PointerEvent) {
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  const target = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>(".cell");
  if (!target || !stroke.grid.contains(target)) return;
  const next = Number(target.dataset.cell),
    previous = stroke.last;
  if (next === previous) return;
  if (stroke.brush === "start" || stroke.brush === "goal") paintStroke(next);
  else {
    let x0 = previous % scenario.width,
      y0 = Math.floor(previous / scenario.width);
    const x1 = next % scenario.width,
      y1 = Math.floor(next / scenario.width),
      dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0),
      sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (x0 !== x1 || y0 !== y1) {
      const twice = error * 2;
      if (twice >= dy) {
        error += dy;
        x0 += sx;
      }
      if (twice <= dx) {
        error += dx;
        y0 += sy;
      }
      paintStroke(y0 * scenario.width + x0);
    }
  }
  if (stroke) stroke.last = next;
}
function endStroke() {
  if (!stroke) return;
  const ended = stroke;
  stroke = null;
  if (ended.grid.hasPointerCapture(ended.pointerId))
    ended.grid.releasePointerCapture(ended.pointerId);
}
function onGridKey(event: KeyboardEvent) {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
    ".cell",
  );
  if (!target) return;
  const index = Number(target.dataset.cell),
    x = index % scenario.width,
    y = Math.floor(index / scenario.width);
  const movement: Record<string, number> = {
    ArrowUp: y > 0 ? index - scenario.width : index,
    ArrowRight: x < scenario.width - 1 ? index + 1 : index,
    ArrowDown: y < scenario.height - 1 ? index + scenario.width : index,
    ArrowLeft: x > 0 ? index - 1 : index,
    Home: index - x,
    End: index - x + scenario.width - 1,
  };
  if (event.key in movement) {
    event.preventDefault();
    activeCell = movement[event.key];
    const view = boards.find((b) => b.grid === event.currentTarget)!;
    view.cells[activeCell].focus();
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (
      paint(index, brush, () => {
        history.record(scenario);
        invalidate(true);
        customMap();
      })
    ) {
      notice = `Map updated. ${cellDescription(index)}.`;
      render();
    }
  }
}

for (const preset of PRESETS)
  el<HTMLSelectElement>("preset").add(
    new Option(`${preset.tag.split(" / ")[0]} — ${preset.name}`, preset.id),
  );
el<HTMLSelectElement>("preset").add(new Option("Your own landscape", "custom"));
el("scenario-description").textContent = PRESETS[0].description;
el("preset").addEventListener("change", () => {
  const preset = PRESETS.find(
    (p) => p.id === el<HTMLSelectElement>("preset").value,
  );
  if (preset) {
    applyScenario(preset.make(), `${preset.name}. Ready to explore.`);
    el("scenario-description").textContent = preset.description;
  }
});
el("algorithm").addEventListener("change", () => {
  endStroke();
  selectedAlgorithm = el<HTMLSelectElement>("algorithm").value as Algorithm;
  invalidate();
  notice = "Algorithm changed. Ready to explore.";
  buildBoards();
  render();
});
el("single").addEventListener("click", () => setMode(false));
el("compare").addEventListener("click", () => setMode(true));
el("play").addEventListener("click", () => {
  endStroke();
  if (playback.playing) {
    playback.pause();
    setNotice("Paused. Step through one decision at a time, or resume.");
  } else {
    if (playback.complete) playback.clear();
    ensureRuns();
    notice = "Searching. Watch the frontier become explored ground.";
    playback.play();
  }
});
el("step").addEventListener("click", () => {
  endStroke();
  ensureRuns();
  notice = "Paused after one event. Step again to inspect the next decision.";
  playback.step();
});
el("finish").addEventListener("click", () => {
  endStroke();
  ensureRuns();
  playback.finish();
});
el("reset").addEventListener("click", () => {
  endStroke();
  invalidate();
  notice = "Search reset. Your landscape is unchanged.";
  render();
});
el("speed").addEventListener("input", () => {
  const value = Number(el<HTMLInputElement>("speed").value);
  playback.setSpeed(value);
  el<HTMLOutputElement>("speed-value").value = String(value);
});
document
  .querySelectorAll<HTMLButtonElement>("[data-brush]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      setBrush(button.dataset.brush as Brush),
    ),
  );
function undo() {
  endStroke();
  const previous = history.undo(scenario);
  if (previous) {
    applyScenario(previous, "Map edit undone.", false);
    customMap();
  }
}
function redo() {
  endStroke();
  const next = history.redo(scenario);
  if (next) {
    applyScenario(next, "Map edit restored.", false);
    customMap();
  }
}
el("undo").addEventListener("click", undo);
el("redo").addEventListener("click", redo);
el("clear").addEventListener("click", () => {
  applyScenario(
    { ...scenario, cells: scenario.cells.map(() => 1) },
    "A clean landscape. Start and goal stay in place.",
  );
  customMap();
});
el("grid-size").addEventListener("change", () => {
  const [width, height] = el<HTMLSelectElement>("grid-size")
    .value.split("x")
    .map(Number);
  applyScenario(
    blankScenario(width, height),
    `New ${width} × ${height} blank map. Undo restores your previous landscape.`,
  );
  customMap();
});
el("try-comparison").addEventListener("click", () => {
  const preset = PRESETS[1];
  applyScenario(
    preset.make(),
    "Compare the cost of a shortcut. Run the searches to see what changes.",
  );
  el<HTMLSelectElement>("preset").value = preset.id;
  el("scenario-description").textContent = preset.description;
  setMode(true);
  el("workbench").scrollIntoView({ block: "start", behavior: "instant" });
});
function showShelf(show: boolean) {
  el("shelf").hidden = !show;
  el("open-shelf").setAttribute("aria-expanded", String(show));
  if (show) el("save-name").focus();
}
el("open-shelf").addEventListener("click", () => showShelf(el("shelf").hidden));
el("close-shelf").addEventListener("click", () => {
  showShelf(false);
  el("open-shelf").focus();
});
el("save-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = el<HTMLInputElement>("save-name").value.trim();
  if (!name) {
    setNotice("Give your landscape a name before saving.");
    return;
  }
  if (saves.length >= 12) {
    setNotice(
      "Your shelf holds 12 maps. Delete one or export a file before saving another.",
    );
    return;
  }
  if (
    persist([
      ...saves,
      { id: crypto.randomUUID(), name, scenario: cloneScenario(scenario) },
    ])
  ) {
    el<HTMLInputElement>("save-name").value = "";
    el<HTMLSelectElement>("saved-maps").value = saves.at(-1)!.id;
    setNotice(`Saved “${name}” in this browser.`);
  }
});
el("load-save").addEventListener("click", () => {
  const save = saves.find(
    (s) => s.id === el<HTMLSelectElement>("saved-maps").value,
  );
  if (save) {
    applyScenario(save.scenario, `Loaded “${save.name}”.`);
    customMap();
  }
});
el("delete-save").addEventListener("click", () => {
  const id = el<HTMLSelectElement>("saved-maps").value;
  if (persist(saves.filter((s) => s.id !== id)))
    setNotice("Local save removed. The landscape on the board is unchanged.");
});
el("share").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = `map=${encodeShare(scenario)}`;
  window.history.replaceState(null, "", url.href);
  el<HTMLInputElement>("share-url").value = url.href;
  el("share-panel").hidden = false;
  try {
    await navigator.clipboard.writeText(url.href);
    setNotice("Link copied. The whole map travels with it; no account needed.");
  } catch {
    setNotice("Your map link is ready. Select the field and copy it manually.");
    el<HTMLInputElement>("share-url").focus();
    el<HTMLInputElement>("share-url").select();
  }
});
el("close-share").addEventListener("click", () => {
  el("share-panel").hidden = true;
  el("share").focus();
});
el("export").addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob([exportScenario(scenario)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "pathfinding-landscape.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setNotice("Scenario file prepared for download.");
});
el("import").addEventListener("click", () =>
  el<HTMLInputElement>("import-file").click(),
);
el("import-file").addEventListener("change", async () => {
  const input = el<HTMLInputElement>("import-file"),
    file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 6000)
      throw new Error("Scenario file is too large (maximum 6 KB).");
    const next = importScenario(await file.text());
    applyScenario(next, "Imported landscape. Ready to explore.");
    customMap();
  } catch (error) {
    setNotice(
      `Import failed. ${error instanceof Error ? error.message : "Invalid file."} Your map is unchanged.`,
    );
  }
  input.value = "";
});
document.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement;
  if (target.closest("input, select, textarea") || target.isContentEditable)
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const shortcuts: Record<string, Brush> = {
    w: "wall",
    e: "erase",
    "3": "3",
    "5": "5",
    s: "start",
    g: "goal",
  };
  if (shortcuts[event.key.toLowerCase()]) {
    event.preventDefault();
    setBrush(shortcuts[event.key.toLowerCase()]);
  }
  if (event.key === "Escape") {
    endStroke();
    playback.pause();
    setNotice("Paused. Your map is ready when you are.");
  }
});
window.addEventListener("blur", () => {
  endStroke();
  if (playback.playing) {
    playback.pause();
    setNotice("Paused while you were away. Resume whenever you are ready.");
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && playback.playing) {
    playback.pause();
    setNotice("Paused while this tab was hidden.");
  }
});
function loadShared() {
  if (!location.hash.startsWith("#map=")) return;
  try {
    const next = decodeShare(location.hash.slice(5));
    applyScenario(
      next,
      "Shared landscape loaded. Make it your own.",
      false,
      true,
    );
    customMap();
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : "This shared map could not be loaded.",
    );
  }
}
try {
  const result = readSaves(localStorage);
  saves = result.saves;
  if (result.warning) notice = result.warning;
} catch {
  notice =
    "Browser storage is unavailable. Sharing and file export still work.";
}
refreshSavedOptions();
buildBoards();
render();
loadShared();
window.addEventListener("hashchange", loadShared);
