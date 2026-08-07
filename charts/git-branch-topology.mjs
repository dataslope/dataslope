/**
 * Merge and rebase produce different histories from the same work, and the
 * difference is what the graph looks like afterwards.
 *
 * The same three commits, integrated two ways. A merge keeps the branch's
 * commits where they happened and adds a commit joining the two lines, so the
 * history records that the work was parallel. A rebase replays those commits
 * on top of main, producing a straight line that reads as though the work
 * happened after everything else, which is easier to read and is not what
 * occurred.
 *
 * Neither is correct in general. What matters is that the choice is between
 * two properties, honesty about parallelism and legibility of the log, and
 * that a rebase rewrites commit identities, which is why it is safe on a
 * private branch and destructive on a shared one.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same feature branch integrated two ways: a merge, drawn as a branch that diverges and rejoins with a merge commit, and a rebase, drawn as a single straight line of commits replayed on top of main.";

export const caption =
  "Same work, two histories. The merge records that the branch happened alongside main and joins them with a commit that has two parents. The rebase replays the branch's commits on top, giving one readable line and new commit hashes for work that already existed. That rewriting is why rebase is fine on a branch nobody else has and a problem on one they do.";

// Pixel space: this is a graph drawing, not a plot of quantities.
const W = 680;
const H = 300;

const PANELS = [
  { key: "Merge", x0: 60 },
  { key: "Rebase", x0: 380 },
];
const STEP = 46;
const MAIN_Y = 190;
const BRANCH_Y = 118;

/** Merge: main continues, the branch diverges at c2 and rejoins at a merge
 *  commit with two parents. */
const merge = (() => {
  const x0 = PANELS[0].x0;
  const main = [0, 1, 2, 5, 6].map((i) => ({ x: x0 + i * STEP, y: MAIN_Y, kind: "main" }));
  const branch = [3, 4].map((i) => ({ x: x0 + i * STEP, y: BRANCH_Y, kind: "branch" }));
  const mergeCommit = { x: x0 + 5 * STEP, y: MAIN_Y, kind: "merge" };
  const edges = [
    ...main.slice(0, 3).map((c, i) => [c, main[i + 1] ?? c]),
    [main[2], branch[0]],
    [branch[0], branch[1]],
    [branch[1], mergeCommit],
    [main[2], mergeCommit],
    [mergeCommit, main[4]],
  ];
  return { nodes: [...main, ...branch], mergeCommit, edges };
})();

/** Rebase: one line, with the branch's commits replayed at the end. */
const rebase = (() => {
  const x0 = PANELS[1].x0;
  const nodes = [0, 1, 2, 3, 4, 5].map((i) => ({
    x: x0 + i * STEP,
    y: MAIN_Y,
    kind: i >= 3 ? "replayed" : "main",
  }));
  const edges = nodes.slice(0, -1).map((c, i) => [c, nodes[i + 1]]);
  return { nodes, edges };
})();

const edgeRows = [...merge.edges, ...rebase.edges].map(([a, b]) => ({
  x1: a.x,
  y1: a.y,
  x2: b.x,
  y2: b.y,
}));

const nodeRows = [...merge.nodes, merge.mergeCommit, ...rebase.nodes];

const colorFor = (kind) =>
  kind === "branch" || kind === "replayed" ? ACCENT : kind === "merge" ? MUTED : PRIMARY;

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 26,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 16,
    ariaLabel: title,
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      Plot.text(PANELS, {
        x: (d) => d.x0 + 2.5 * STEP,
        y: 18,
        text: "key",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
      }),
      Plot.link(edgeRows, {
        x1: "x1",
        y1: "y1",
        x2: "x2",
        y2: "y2",
        stroke: MUTED,
        strokeOpacity: 0.55,
        strokeWidth: 2,
      }),
      Plot.dot(nodeRows, {
        x: "x",
        y: "y",
        fill: (d) => colorFor(d.kind),
        r: 7,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 2,
      }),
      Plot.text([merge.mergeCommit], {
        x: "x",
        y: "y",
        text: () => "merge commit:\ntwo parents",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
      Plot.text([merge.nodes.find((n) => n.kind === "branch")], {
        x: "x",
        y: "y",
        text: () => "the branch, where it happened",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dy: -18,
        ...HALO,
      }),
      Plot.text([rebase.nodes[3]], {
        x: "x",
        y: "y",
        text: () => "replayed on top:\nnew hashes, same changes",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dy: -30,
        ...HALO,
      }),
      Plot.text(PANELS, {
        x: (d) => d.x0 + 2.5 * STEP,
        y: 268,
        text: (d) =>
          d.key === "Merge" ? "honest about parallel work" : "a log you can read",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
      }),
    ],
  });
}
