import { validateScenario } from "./scenario.ts";
import type { Scenario } from "./scenario.ts";

export type Algorithm = "bfs" | "dijkstra" | "astar";
export const ALGORITHMS: Algorithm[] = ["bfs", "dijkstra", "astar"];
export const ALGORITHM_NAMES: Record<Algorithm, string> = {
  bfs: "Breadth-first",
  dijkstra: "Dijkstra",
  astar: "A* search",
};
export type SearchEvent =
  | { type: "expand"; cell: number; opened: number[] }
  | { type: "path"; cell: number }
  | { type: "done" };
export interface SearchTrace {
  algorithm: Algorithm;
  events: SearchEvent[];
  path: number[];
  visited: number;
  steps: number | null;
  cost: number | null;
  found: boolean;
}

export function neighbors(
  cell: number,
  width: number,
  height: number,
): number[] {
  const x = cell % width,
    y = Math.floor(cell / width);
  const out: number[] = [];
  if (y > 0) out.push(cell - width);
  if (x < width - 1) out.push(cell + 1);
  if (y < height - 1) out.push(cell + width);
  if (x > 0) out.push(cell - 1);
  return out;
}
export function manhattan(a: number, b: number, width: number): number {
  return (
    Math.abs((a % width) - (b % width)) +
    Math.abs(Math.floor(a / width) - Math.floor(b / width))
  );
}

interface Entry {
  cell: number;
  priority: number;
  order: number;
  distance: number;
}
class MinHeap {
  private items: Entry[] = [];
  get length() {
    return this.items.length;
  }
  private less(a: Entry, b: Entry) {
    return (
      a.priority < b.priority ||
      (a.priority === b.priority && a.order < b.order)
    );
  }
  push(item: Entry) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): Entry {
    const a = this.items,
      result = a[0],
      last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (true) {
        let best = i;
        const l = i * 2 + 1,
          r = l + 1;
        if (l < a.length && this.less(a[l], a[best])) best = l;
        if (r < a.length && this.less(a[r], a[best])) best = r;
        if (best === i) break;
        [a[i], a[best]] = [a[best], a[i]];
        i = best;
      }
    }
    return result;
  }
}

/** Destination-cell cost. The start is free. Fixed N/E/S/W neighbors and stable insertion ties. */
export function search(input: Scenario, algorithm: Algorithm): SearchTrace {
  const s = validateScenario(input);
  if (!ALGORITHMS.includes(algorithm)) throw new Error("Unknown algorithm.");
  const distance = Array<number>(s.cells.length).fill(Infinity);
  const parent = Array<number>(s.cells.length).fill(-1);
  const closed = new Uint8Array(s.cells.length);
  const events: SearchEvent[] = [];
  const heap = new MinHeap();
  const queue: number[] = [s.start];
  let head = 0,
    order = 0,
    visited = 0,
    found = false;
  distance[s.start] = 0;
  // 1 is the minimum allowed step cost. Manhattan * 1 is consistent and admissible.
  const heuristic = (cell: number) =>
    algorithm === "astar" ? manhattan(cell, s.goal, s.width) : 0;
  heap.push({
    cell: s.start,
    priority: heuristic(s.start),
    order: order++,
    distance: 0,
  });
  while (algorithm === "bfs" ? head < queue.length : heap.length > 0) {
    let cell: number;
    if (algorithm === "bfs") cell = queue[head++];
    else {
      const next = heap.pop();
      cell = next.cell;
      if (next.distance !== distance[cell]) continue;
    }
    if (closed[cell]) continue;
    closed[cell] = 1;
    visited++;
    const opened: number[] = [];
    if (cell === s.goal) {
      events.push({ type: "expand", cell, opened });
      found = true;
      break;
    }
    for (const neighbor of neighbors(cell, s.width, s.height)) {
      if (s.cells[neighbor] === 0 || closed[neighbor]) continue;
      const nextDistance =
        distance[cell] + (algorithm === "bfs" ? 1 : s.cells[neighbor]);
      if (nextDistance >= distance[neighbor]) continue;
      const firstDiscovery = !Number.isFinite(distance[neighbor]);
      distance[neighbor] = nextDistance;
      parent[neighbor] = cell;
      if (firstDiscovery) opened.push(neighbor);
      if (algorithm === "bfs") queue.push(neighbor);
      else
        heap.push({
          cell: neighbor,
          priority: nextDistance + heuristic(neighbor),
          order: order++,
          distance: nextDistance,
        });
    }
    events.push({ type: "expand", cell, opened });
  }
  const path: number[] = [];
  if (found) {
    for (let cell = s.goal; cell !== -1; cell = parent[cell]) path.push(cell);
    path.reverse();
    for (const cell of path) events.push({ type: "path", cell });
  }
  events.push({ type: "done" });
  return {
    algorithm,
    events,
    path,
    visited,
    steps: found ? path.length - 1 : null,
    cost: found
      ? path.slice(1).reduce((total, cell) => total + s.cells[cell], 0)
      : null,
    found,
  };
}
