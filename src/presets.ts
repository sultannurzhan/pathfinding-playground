import { blankScenario } from "./scenario.ts";
import type { Scenario } from "./scenario.ts";
export interface Preset {
  id: string;
  name: string;
  tag: string;
  description: string;
  make: () => Scenario;
}
function canyon(): Scenario {
  const s = blankScenario();
  for (let y = 0; y < s.height; y++)
    for (let x = 0; x < s.width; x++) {
      if ((x === 8 && y !== 3 && y !== 4) || (x === 16 && y !== 10 && y !== 11))
        s.cells[y * s.width + x] = 0;
      if (x > 9 && x < 15 && y > 5 && y < 10) s.cells[y * s.width + x] = 3;
    }
  return s;
}
function toll(): Scenario {
  const s = blankScenario();
  for (let x = 6; x <= 18; x++)
    for (let y = 5; y <= 9; y++) s.cells[y * s.width + x] = 5;
  for (let y = 2; y <= 3; y++)
    for (let x = 10; x <= 14; x++) s.cells[y * s.width + x] = 0;
  return s;
}
function switchbacks(): Scenario {
  const s = blankScenario();
  s.start = 1 * 25 + 1;
  s.goal = 13 * 25 + 23;
  for (let x = 4; x < 24; x += 4)
    for (let y = 0; y < 15; y++) {
      const bottomGap = (x / 4) % 2 === 1;
      if (bottomGap ? y < 12 : y > 2) s.cells[y * 25 + x] = 0;
    }
  return s;
}
function islands(): Scenario {
  const s = blankScenario();
  const blocks = [
    [5, 2, 3, 4],
    [11, 0, 2, 5],
    [17, 3, 4, 3],
    [7, 9, 4, 4],
    [15, 9, 3, 6],
  ];
  for (const [x, y, w, h] of blocks)
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) s.cells[j * 25 + i] = 0;
  for (let i = 0; i < s.cells.length; i++)
    if (s.cells[i] && Math.floor(i / 25) === 7 && i % 25 > 7 && i % 25 < 20)
      s.cells[i] = 3;
  return s;
}
function unreachable(): Scenario {
  const s = blankScenario();
  for (let y = 4; y <= 10; y++)
    for (let x = 18; x <= 24; x++)
      if (x === 18 || x === 24 || y === 4 || y === 10) s.cells[y * 25 + x] = 0;
  return s;
}
export const PRESETS: Preset[] = [
  {
    id: "canyon",
    name: "The long way around",
    tag: "01 / Start here",
    description:
      "Two narrow passes. A patch of slow ground. Can you see the route before the algorithm does?",
    make: canyon,
  },
  {
    id: "toll",
    name: "The price of a shortcut",
    tag: "02 / Weighted terrain",
    description:
      "The direct route crosses cost-5 terrain. Compare BFS with Dijkstra to discover when more steps cost less.",
    make: toll,
  },
  {
    id: "switchbacks",
    name: "Switchback valley",
    tag: "03 / A winding maze",
    description:
      "A sequence of alternating passes makes every algorithm take the scenic route.",
    make: switchbacks,
  },
  {
    id: "islands",
    name: "An archipelago",
    tag: "04 / Open exploration",
    description:
      "Scattered obstacles leave room to wander. Watch A* use the goal to guide its search.",
    make: islands,
  },
  {
    id: "unreachable",
    name: "An impossible island",
    tag: "05 / No route",
    description:
      "The goal is sealed away. What does it mean for a search to know it cannot get there?",
    make: unreachable,
  },
  {
    id: "blank",
    name: "A blank page",
    tag: "06 / Your experiment",
    description:
      "An open field for your next idea. Draw a wall, move the endpoints, or paint a slower route.",
    make: () => blankScenario(),
  },
];
