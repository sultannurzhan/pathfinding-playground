import test from "node:test";
import assert from "node:assert/strict";
import {
  blankScenario,
  cloneScenario,
  decodeShare,
  encodeShare,
  exportScenario,
  importScenario,
  readSaves,
  writeSaves,
  validateScenario,
  ScenarioHistory,
  STORAGE_KEY,
} from "../src/scenario.ts";
import { PRESETS } from "../src/presets.ts";

test("share and JSON preserve every preset and maximum-size scenario exactly", () => {
  for (const s of [...PRESETS.map((p) => p.make()), blankScenario(41, 31)]) {
    assert.deepEqual(decodeShare(encodeShare(s)), s);
    assert.deepEqual(importScenario(exportScenario(s)), s);
  }
});
test("reject invalid dimensions, endpoints, lengths, costs, walls at endpoints, and versions", () => {
  const s = blankScenario(2, 2);
  for (const change of [
    { width: 0 },
    { height: 32 },
    { start: -1 },
    { goal: 4 },
    { cells: [1, 1, 1] },
    { cells: [1, 2, 1, 1] },
    { cells: [1, 1, 0, 0] },
  ])
    assert.throws(() => validateScenario({ ...s, ...change }));
  for (const text of [
    "",
    "{",
    "null",
    "[]",
    '{"v":2,"c":"1111"}',
    "x".repeat(6001),
  ])
    assert.throws(() => importScenario(text));
  for (const text of [
    "",
    "%%%",
    "a".repeat(6001),
    btoa("null"),
    btoa('{"v":1}'),
  ])
    assert.throws(() => decodeShare(text));
});
test("browser-local saves validate each record, preserve valid siblings, and tolerate disabled storage", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
  };
  const saves = [
    { id: "test-1", name: "A small experiment", scenario: blankScenario(3, 3) },
  ];
  writeSaves(storage, saves);
  assert.deepEqual(readSaves(storage), { saves, warning: null });
  const parsed = JSON.parse(memory.get(STORAGE_KEY)!);
  parsed.push({ name: "Broken", map: null });
  memory.set(STORAGE_KEY, JSON.stringify(parsed));
  assert.deepEqual(readSaves(storage).saves, saves);
  assert.ok(readSaves(storage).warning);
  memory.set(STORAGE_KEY, "{");
  assert.ok(readSaves(storage).warning);
  assert.deepEqual(readSaves(storage).saves, []);
  assert.ok(
    readSaves({
      getItem() {
        throw new Error();
      },
      setItem() {},
    }).warning,
  );
});
test("history clones maps, groups records, and invalidates redo after a new edit", () => {
  const h = new ScenarioHistory(),
    original = blankScenario(3, 3),
    edited = cloneScenario(original);
  h.record(original);
  edited.cells[0] = 5;
  original.cells[1] = 3;
  const prior = h.undo(edited)!;
  assert.equal(prior.cells[1], 1);
  assert.equal(h.canRedo, true);
  const restored = h.redo(prior)!;
  assert.equal(restored.cells[0], 5);
  h.undo(restored);
  h.record(prior);
  assert.equal(h.canRedo, false);
});
