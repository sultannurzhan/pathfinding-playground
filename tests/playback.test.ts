import test from "node:test";
import assert from "node:assert/strict";
import { Playback } from "../src/playback.ts";
import type { Clock } from "../src/playback.ts";
import { ALGORITHMS, search } from "../src/algorithms.ts";
import { blankScenario } from "../src/scenario.ts";
class FakeClock implements Clock {
  callbacks: (() => void)[] = [];
  cancelled = new Set<unknown>();
  schedule(callback: () => void, _delay: number) {
    this.callbacks.push(callback);
    return this.callbacks.length - 1;
  }
  cancel(handle: unknown) {
    this.cancelled.add(handle);
  }
  fireEvenIfCancelled(index: number) {
    this.callbacks[index]();
  }
}
function setup() {
  const clock = new FakeClock(),
    p = new Playback(() => {}, clock),
    s = blankScenario(5, 3);
  p.load(
    ALGORITHMS.map((a) => search(s, a)),
    s.cells.length,
    s.start,
  );
  return { p, clock, s };
}
test("pause and reset invalidate even callbacks already queued by the event loop", () => {
  const { p, clock } = setup();
  p.play();
  assert.equal(p.runs[0].visited, 1);
  p.pause();
  const before = p.runs[0].cursor;
  clock.fireEvenIfCancelled(0);
  assert.equal(p.runs[0].cursor, before);
  p.play();
  p.clear();
  clock.fireEvenIfCancelled(1);
  assert.equal(p.runs.length, 0);
  assert.equal(p.playing, false);
});
test("step pauses and advances exactly one event per unfinished independent run", () => {
  const { p } = setup();
  p.play();
  p.step();
  assert.equal(p.playing, false);
  for (const r of p.runs) assert.equal(r.cursor, 2);
  assert.notEqual(p.runs[0].marks, p.runs[1].marks);
  p.finish();
  assert.equal(p.complete, true);
  for (const r of p.runs) {
    assert.equal(r.visited, r.trace.visited);
    assert.equal(r.phase, "complete");
    for (const cell of r.trace.path) assert.equal(r.marks[cell], 3);
  }
});
test("replacement traces cannot be advanced by old callbacks, repeated play creates one timer", () => {
  const { p, clock, s } = setup();
  p.play();
  p.play();
  assert.equal(clock.callbacks.length, 1);
  p.load([search(s, "bfs")], s.cells.length, s.start);
  clock.fireEvenIfCancelled(0);
  assert.equal(p.runs[0].cursor, 0);
  p.setSpeed(999);
  assert.equal(p.speed, 120);
  p.setSpeed(-1);
  assert.equal(p.speed, 1);
});
