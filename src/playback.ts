import type { Algorithm, SearchTrace } from "./algorithms.ts";

export interface RunState {
  trace: SearchTrace;
  cursor: number;
  marks: Uint8Array;
  visited: number;
  done: boolean;
  phase: "ready" | "exploring" | "tracing" | "complete";
}
export interface Clock {
  schedule(callback: () => void, delay: number): unknown;
  cancel(handle: unknown): void;
}
const nativeClock: Clock = {
  schedule: (cb, delay) => setTimeout(cb, delay),
  cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
export class Playback {
  runs: RunState[] = [];
  playing = false;
  speed = 35;
  private handle: unknown;
  private generation = 0;
  private readonly onChange: () => void;
  private readonly clock: Clock;
  constructor(onChange: () => void, clock: Clock = nativeClock) {
    this.onChange = onChange;
    this.clock = clock;
  }
  get complete() {
    return this.runs.length > 0 && this.runs.every((r) => r.done);
  }
  get hasStarted() {
    return this.runs.some((r) => r.cursor > 0);
  }
  load(traces: SearchTrace[], size: number, start: number) {
    this.pause();
    this.runs = traces.map((trace) => {
      const marks = new Uint8Array(size);
      marks[start] = 1;
      return {
        trace,
        cursor: 0,
        marks,
        visited: 0,
        done: false,
        phase: "ready",
      };
    });
    this.onChange();
  }
  clear() {
    this.pause();
    this.runs = [];
    this.onChange();
  }
  getRun(algorithm: Algorithm) {
    return this.runs.find((r) => r.trace.algorithm === algorithm);
  }
  play() {
    if (this.playing || this.complete || !this.runs.length) return;
    this.playing = true;
    this.onChange();
    this.tick(this.generation);
  }
  pause() {
    this.generation++;
    if (this.handle !== undefined) this.clock.cancel(this.handle);
    this.handle = undefined;
    this.playing = false;
    this.onChange();
  }
  step() {
    this.pause();
    this.advance();
  }
  finish() {
    this.pause();
    while (!this.complete && this.runs.length) this.advance(false);
    this.onChange();
  }
  setSpeed(value: number) {
    this.speed = Math.max(1, Math.min(120, value));
  }
  private advance(notify = true) {
    for (const run of this.runs) {
      if (run.done) continue;
      const event = run.trace.events[run.cursor++];
      if (event.type === "expand") {
        run.phase = "exploring";
        run.marks[event.cell] = 2;
        run.visited++;
        for (const cell of event.opened)
          if (run.marks[cell] === 0) run.marks[cell] = 1;
      } else if (event.type === "path") {
        run.phase = "tracing";
        run.marks[event.cell] = 3;
      } else {
        run.done = true;
        run.phase = "complete";
      }
    }
    if (this.complete) this.playing = false;
    if (notify) this.onChange();
  }
  private tick(generation: number) {
    if (generation !== this.generation || !this.playing) return;
    this.advance();
    if (this.playing)
      this.handle = this.clock.schedule(
        () => this.tick(generation),
        1000 / this.speed,
      );
  }
}
