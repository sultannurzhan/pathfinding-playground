export type Cell = 0 | 1 | 3 | 5;
export interface Scenario {
  width: number;
  height: number;
  start: number;
  goal: number;
  cells: Cell[];
}
export interface SavedScenario {
  id: string;
  name: string;
  scenario: Scenario;
}
export const MAX_CELLS = 1271;
export const STORAGE_KEY = "pathfinding-playground.scenarios.v1";

export function blankScenario(width = 25, height = 15): Scenario {
  const row = Math.floor(height / 2);
  return {
    width,
    height,
    start: row * width + Math.min(3, width - 1),
    goal: row * width + Math.max(0, width - 4),
    cells: Array<Cell>(width * height).fill(1),
  };
}
export function cloneScenario(s: Scenario): Scenario {
  return { ...s, cells: [...s.cells] };
}

export function validateScenario(value: unknown): Scenario {
  if (!value || typeof value !== "object")
    throw new Error("The scenario is not an object.");
  const s = value as Record<string, unknown>;
  const { width, height, start, goal, cells } = s;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    (width as number) < 1 ||
    (width as number) > 41 ||
    (height as number) < 1 ||
    (height as number) > 31
  )
    throw new Error("Grid dimensions must be 1–41 columns and 1–31 rows.");
  const size = (width as number) * (height as number);
  if (
    size > MAX_CELLS ||
    !Array.isArray(cells) ||
    cells.length !== size ||
    cells.some((c) => ![0, 1, 3, 5].includes(c))
  )
    throw new Error(
      "The grid must contain only walls or terrain costs 1, 3, and 5.",
    );
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(goal) ||
    (start as number) < 0 ||
    (goal as number) < 0 ||
    (start as number) >= size ||
    (goal as number) >= size
  )
    throw new Error("Start or goal is outside the grid.");
  if (cells[start as number] === 0 || cells[goal as number] === 0)
    throw new Error("Start and goal must be on open terrain.");
  return {
    width: width as number,
    height: height as number,
    start: start as number,
    goal: goal as number,
    cells: [...cells] as Cell[],
  };
}

function pack(scenario: Scenario) {
  const s = validateScenario(scenario);
  return {
    v: 1,
    w: s.width,
    h: s.height,
    s: s.start,
    g: s.goal,
    c: s.cells.join(""),
  };
}
function unpack(value: unknown): Scenario {
  if (!value || typeof value !== "object")
    throw new Error("Invalid scenario document.");
  const p = value as Record<string, unknown>;
  if (
    p.v !== 1 ||
    typeof p.c !== "string" ||
    p.c.length > MAX_CELLS ||
    !/^[0135]+$/.test(p.c)
  )
    throw new Error("Unsupported or damaged scenario. Expected version 1.");
  return validateScenario({
    width: p.w,
    height: p.h,
    start: p.s,
    goal: p.g,
    cells: [...p.c].map(Number),
  });
}
export function exportScenario(s: Scenario): string {
  return JSON.stringify(pack(s), null, 2);
}
export function importScenario(text: string): Scenario {
  if (text.length > 6000)
    throw new Error("Scenario file is too large (maximum 6 KB).");
  try {
    return unpack(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("That file is not valid scenario JSON.");
    throw error;
  }
}
export function encodeShare(s: Scenario): string {
  return btoa(JSON.stringify(pack(s)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export function decodeShare(encoded: string): Scenario {
  if (encoded.length > 6000 || !/^[A-Za-z0-9_-]+$/.test(encoded))
    throw new Error("This shared map is malformed or too large.");
  try {
    return importScenario(
      atob(encoded.replaceAll("-", "+").replaceAll("_", "/")),
    );
  } catch {
    throw new Error(
      "This shared map is invalid. Load a preset to start fresh.",
    );
  }
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function readSaves(storage: StorageLike): {
  saves: SavedScenario[];
  warning: string | null;
} {
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return { saves: [], warning: null };
    if (text.length > 100_000) throw new Error();
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length > 12) throw new Error();
    const saves: SavedScenario[] = [];
    let skipped = false;
    for (const item of parsed) {
      try {
        if (
          !item ||
          typeof item.id !== "string" ||
          !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) ||
          saves.some((s) => s.id === item.id) ||
          typeof item.name !== "string" ||
          !item.name.trim() ||
          item.name.length > 50
        )
          throw new Error();
        saves.push({
          id: item.id,
          name: item.name,
          scenario: unpack(item.map),
        });
      } catch {
        skipped = true;
      }
    }
    return {
      saves,
      warning: skipped
        ? "Some damaged local saves were skipped. Valid saves are still available."
        : null,
    };
  } catch {
    return {
      saves: [],
      warning:
        "Local saves could not be read. You can still use and share the playground.",
    };
  }
}
export function writeSaves(storage: StorageLike, saves: SavedScenario[]): void {
  if (saves.length > 12)
    throw new Error(
      "Your shelf holds 12 maps. Remove one before saving another.",
    );
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      saves.map((s) => ({
        id: s.id,
        name: s.name.slice(0, 50),
        map: pack(s.scenario),
      })),
    ),
  );
}

export class ScenarioHistory {
  private past: Scenario[] = [];
  private future: Scenario[] = [];
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  record(s: Scenario) {
    this.past.push(cloneScenario(s));
    if (this.past.length > 50) this.past.shift();
    this.future = [];
  }
  undo(current: Scenario): Scenario | undefined {
    const s = this.past.pop();
    if (s) this.future.push(cloneScenario(current));
    return s;
  }
  redo(current: Scenario): Scenario | undefined {
    const s = this.future.pop();
    if (s) this.past.push(cloneScenario(current));
    return s;
  }
}
