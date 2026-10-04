import test from "node:test";
import assert from "node:assert/strict";
import { search, ALGORITHMS, neighbors, manhattan } from "../src/algorithms.ts";
import { blankScenario } from "../src/scenario.ts";
import type { Scenario } from "../src/scenario.ts";
import { PRESETS } from "../src/presets.ts";

function grid(rows: number[][], start: number, goal: number): Scenario {
  return {
    width: rows[0].length,
    height: rows.length,
    start,
    goal,
    cells: rows.flat() as Scenario["cells"],
  };
}
function assertPath(s: Scenario, path: number[], cost: number | null) {
  assert.equal(path[0], s.start);
  assert.equal(path.at(-1), s.goal);
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    assert.equal(manhattan(path[i - 1], path[i], s.width), 1);
    assert.notEqual(s.cells[path[i]], 0);
    total += s.cells[path[i]];
  }
  assert.equal(cost, total);
}
test("equal-cost corridor: all find exactly 4 steps and cost 4; start cost is excluded", () => {
  const s = grid([[5, 1, 1, 1, 1]], 0, 4);
  for (const a of ALGORITHMS) {
    const r = search(s, a);
    assert.equal(r.steps, 4);
    assert.equal(r.cost, 4);
    assert.equal(r.visited, 5);
    assertPath(s, r.path, r.cost);
  }
});
test("weighted shortcut: BFS takes 4 steps / cost16; weighted algorithms take 6 / cost6", () => {
  const s = grid(
    [
      [1, 1, 1, 1, 1],
      [1, 5, 5, 5, 1],
      [1, 1, 1, 1, 1],
    ],
    5,
    9,
  );
  const bfs = search(s, "bfs");
  assert.equal(bfs.steps, 4);
  assert.equal(bfs.cost, 16);
  for (const a of ["dijkstra", "astar"] as const) {
    const r = search(s, a);
    assert.equal(r.steps, 6);
    assert.equal(r.cost, 6);
    assertPath(s, r.path, r.cost);
  }
});
test("unreachable goal yields null route metrics and counts reachable cells", () => {
  const s = grid(
    [
      [1, 0, 1],
      [1, 0, 1],
    ],
    0,
    2,
  );
  for (const a of ALGORITHMS) {
    const r = search(s, a);
    assert.equal(r.found, false);
    assert.deepEqual(r.path, []);
    assert.equal(r.steps, null);
    assert.equal(r.cost, null);
    assert.equal(r.visited, 2);
  }
});
test("start equals goal completes at zero cost even on weighted terrain", () => {
  const s = grid([[5]], 0, 0);
  for (const a of ALGORITHMS) {
    const r = search(s, a);
    assert.deepEqual(r.path, [0]);
    assert.equal(r.cost, 0);
    assert.equal(r.steps, 0);
    assert.equal(r.visited, 1);
  }
});
test("ties are stable in N/E/S/W discovery order", () => {
  const s = grid(
    [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    4,
    2,
  );
  for (const a of ALGORITHMS) {
    assert.deepEqual(search(s, a).path, [4, 1, 2]);
    assert.deepEqual(search(s, a), search(s, a));
  }
});
test("neighbors never wrap rows, and invalid zero-area grids are rejected", () => {
  assert.deepEqual(neighbors(2, 3, 2), [5, 1]);
  assert.deepEqual(neighbors(0, 1, 3), [1]);
  assert.throws(() =>
    search({ width: 0, height: 0, cells: [], start: 0, goal: 0 }, "bfs"),
  );
});
test("open landscape shortest route equals Manhattan distance", () => {
  const s = blankScenario(17, 11);
  for (const a of ALGORITHMS) {
    const r = search(s, a);
    assert.equal(r.steps, manhattan(s.start, s.goal, s.width));
    assert.equal(r.cost, r.steps);
  }
});

// Independent Bellman-Ford-style oracle: scans all directed orthogonal edges; no heap or search imports.
function oracle(s: Scenario, weighted: boolean): number {
  const d = Array(s.cells.length).fill(Infinity);
  d[s.start] = 0;
  for (let pass = 0; pass < s.cells.length; pass++) {
    let changed = false;
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        const i = y * s.width + x;
        if (!s.cells[i] || !Number.isFinite(d[i])) continue;
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) continue;
          const j = ny * s.width + nx;
          if (!s.cells[j]) continue;
          const candidate = d[i] + (weighted ? s.cells[j] : 1);
          if (candidate < d[j]) {
            d[j] = candidate;
            changed = true;
          }
        }
      }
    if (!changed) break;
  }
  return d[s.goal];
}
test("250 deterministic generated maps agree with an independent minimum-cost/step oracle", () => {
  let seed = 4217;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let n = 0; n < 250; n++) {
    const s = blankScenario(
      1 + Math.floor(random() * 8),
      1 + Math.floor(random() * 8),
    );
    s.cells = s.cells.map(
      () =>
        [0, 1, 1, 1, 3, 5][
          Math.floor(random() * 6)
        ] as Scenario["cells"][number],
    );
    s.start = Math.floor(random() * s.cells.length);
    s.goal = Math.floor(random() * s.cells.length);
    s.cells[s.start] = 1;
    s.cells[s.goal] = 1;
    for (const a of ALGORITHMS) {
      const r = search(s, a),
        expected = oracle(s, a !== "bfs");
      assert.equal(r.found, Number.isFinite(expected));
      assert.equal(
        a === "bfs" ? r.steps : r.cost,
        Number.isFinite(expected) ? expected : null,
      );
      assert.equal(
        r.visited,
        r.events.filter((e) => e.type === "expand").length,
      );
      assert.equal(
        new Set(r.events.filter((e) => e.type === "expand").map((e) => e.cell))
          .size,
        r.visited,
      );
      if (r.found) {
        assertPath(s, r.path, r.cost);
        assert.equal(r.steps, r.path.length - 1);
      }
    }
  }
});
test("all original presets are deterministic, immutable inputs, and weighted costs agree", () => {
  for (const preset of PRESETS) {
    const s = preset.make(),
      copy = structuredClone(s);
    const d = search(s, "dijkstra"),
      a = search(s, "astar");
    assert.equal(d.cost, a.cost);
    assert.deepEqual(s, copy);
    assert.deepEqual(search(s, "astar"), a);
  }
});
