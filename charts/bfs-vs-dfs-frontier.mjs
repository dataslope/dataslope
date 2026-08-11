/**
 * Why BFS and DFS have the same time complexity and completely different
 * memory profiles.
 *
 * Nodes held in the frontier as each traversal walks a branching tree. DFS
 * keeps one path plus its siblings, so its stack is proportional to the depth.
 * BFS keeps an entire level, and a level in a branching graph is exponential in
 * the depth. Both visit every node once; only one of them can run out of
 * memory doing it.
 *
 * The crossover is not the point; the shapes are. On a graph with any real
 * branching factor, BFS's peak frontier is the widest level, and that number
 * decides whether the traversal fits in memory at all.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Frontier size against depth for breadth-first and depth-first search on a tree with branching factor three. Depth-first grows linearly to about twenty nodes; breadth-first grows exponentially past ten thousand.";

const B = 3;
const MAX_DEPTH = 9;

const rows = Array.from({ length: MAX_DEPTH + 1 }, (_, d) => [
  { depth: d, kind: "Breadth-first (queue)", held: B ** d },
  // One path, and the unexplored siblings at each level along it.
  { depth: d, kind: "Depth-first (stack)", held: Math.max(1, d * (B - 1) + 1) },
]).flat();

const DEEP = MAX_DEPTH;
const bfs = rows.find((r) => r.depth === DEEP && r.kind.startsWith("Breadth")).held;
const dfs = rows.find((r) => r.depth === DEEP && r.kind.startsWith("Depth")).held;

export const caption =
  `Both visit every node exactly once, so both are O(V + E) in time. In memory they are not the same algorithm at all: at depth ${DEEP} on a branching factor of ${B}, depth-first is holding ${dfs} nodes and breadth-first is holding ${bfs.toLocaleString()}. BFS finds the shortest path; this is what it costs, and on a wide graph it is the thing that decides whether the traversal runs.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 64,
    marginRight: 120,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Depth reached", labelAnchor: "center", domain: [0, MAX_DEPTH], ticks: 5 },
    y: {
      type: "log",
      label: "Nodes held in the frontier",
      domain: [1, 3e4],
      ticks: [1, 10, 1e3, 1e4],
      tickFormat: (d) =>
        d >= 1e9 ? `${d / 1e9}B` : d >= 1e6 ? `${d / 1e6}M` : d >= 1e3 ? `${d / 1e3}k` : String(d),
    },
    color: { domain: ["Breadth-first (queue)", "Depth-first (stack)"], range: [ACCENT, PRIMARY] },
    marks: [
      Plot.line(rows, { x: "depth", y: "held", stroke: "kind", strokeWidth: 2 }),
      Plot.dot(rows, { x: "depth", y: "held", fill: "kind", r: 3 }),
      Plot.text(
        [
          { depth: DEEP, held: bfs, kind: "Breadth-first (queue)" },
          { depth: DEEP, held: dfs, kind: "Depth-first (stack)" },
        ],
        {
          x: "depth",
          y: "held",
          text: (d) => `${d.kind.split(" (")[0]}\n${d.held.toLocaleString()}`,
          fill: "kind",
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 0.2,
        y: 2e4,
        text: () => "same time complexity,\ndifferent memory class",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
