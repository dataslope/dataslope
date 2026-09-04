/**
 * The Bash playground's layout: a binary tree whose leaves are terminals.
 *
 * Binary rather than n-ary because every operation the playground offers
 * (split, close, move, resize) is a local edit to one leaf and its parent,
 * and binary makes resizing a single number per gutter. Three panes in a row
 * are two nested splits, which render identically.
 *
 * Every function here is pure and returns a new tree. Rendering reads
 * `layout`: every leaf gets a rectangle as a fraction of the stage, and each
 * split's gutter sits at its `ratio` along its `dir`.
 */

export type Dir = "row" | "col";
export type Edge = "left" | "right" | "top" | "bottom";

export type Node =
  | { kind: "leaf"; id: string }
  | { kind: "split"; id: string; dir: Dir; children: [Node, Node]; ratio: number };

export const MIN_RATIO = 0.1;
export const MAX_RATIO = 0.9;

export const leaf = (id: string): Node => ({ kind: "leaf", id });

let splitSeq = 0;
/** Ids for split nodes; leaves are named by the caller, splits by nobody. */
const nextSplitId = () => `split-${(splitSeq += 1)}`;

/** Leaf ids in reading order: left to right, top to bottom. This is the tab
 *  order on a phone and the cycle order for keyboard focus everywhere. */
export function leaves(tree: Node): string[] {
  return tree.kind === "leaf" ? [tree.id] : [...leaves(tree.children[0]), ...leaves(tree.children[1])];
}

export const hasLeaf = (tree: Node, id: string): boolean => leaves(tree).includes(id);

/**
 * Replace `leafId` with a split of itself and a new leaf. `after` puts the
 * new leaf second (right or below), which is where a new terminal goes.
 */
export function split(tree: Node, leafId: string, dir: Dir, newId: string, after = true): Node {
  if (tree.kind === "leaf") {
    if (tree.id !== leafId) return tree;
    const fresh = leaf(newId);
    return {
      kind: "split",
      id: nextSplitId(),
      dir,
      children: after ? [tree, fresh] : [fresh, tree],
      ratio: 0.5,
    };
  }
  return {
    ...tree,
    children: [
      split(tree.children[0], leafId, dir, newId, after),
      split(tree.children[1], leafId, dir, newId, after),
    ],
  };
}

/** Remove a leaf; its sibling takes the parent's place. The last leaf stays:
 *  a playground with no terminal is not a state worth representing. */
export function remove(tree: Node, leafId: string): Node {
  if (tree.kind === "leaf") return tree;
  const [a, b] = tree.children;
  if (a.kind === "leaf" && a.id === leafId) return b;
  if (b.kind === "leaf" && b.id === leafId) return a;
  return { ...tree, children: [remove(a, leafId), remove(b, leafId)] };
}

/** Exchange two leaves in place. */
export function swap(tree: Node, a: string, b: string): Node {
  if (a === b) return tree;
  const rename = (n: Node): Node =>
    n.kind === "leaf"
      ? n.id === a
        ? leaf(b)
        : n.id === b
          ? leaf(a)
          : n
      : { ...n, children: [rename(n.children[0]), rename(n.children[1])] };
  return rename(tree);
}

/**
 * Move a leaf next to another: take it out of the tree, then split the
 * target on the given edge. Dropping a pane on itself is a no-op, and so is
 * a target that is not in the tree.
 */
export function move(tree: Node, leafId: string, targetId: string, edge: Edge): Node {
  if (leafId === targetId || !hasLeaf(tree, leafId) || !hasLeaf(tree, targetId)) return tree;
  const without = remove(tree, leafId);
  const dir: Dir = edge === "left" || edge === "right" ? "row" : "col";
  const after = edge === "right" || edge === "bottom";
  return split(without, targetId, dir, leafId, after);
}

/** Set a split's ratio, clamped so neither child can vanish. */
export function resize(tree: Node, splitId: string, ratio: number): Node {
  if (tree.kind === "leaf") return tree;
  if (tree.id === splitId) {
    return { ...tree, ratio: Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio)) };
  }
  return { ...tree, children: [resize(tree.children[0], splitId, ratio), resize(tree.children[1], splitId, ratio)] };
}

export const equalize = (tree: Node, splitId: string): Node => resize(tree, splitId, 0.5);

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A gutter: the rectangle of the split it belongs to and where along that
 *  rectangle the boundary sits, which is the split's ratio. */
export interface Gutter {
  id: string;
  dir: Dir;
  rect: Rect;
  ratio: number;
}

export interface Layout {
  /** Every leaf's rectangle, as fractions of the stage. */
  panes: Record<string, Rect>;
  /** Every split's gutter, parents before children. */
  gutters: Gutter[];
}

/**
 * Where everything goes, as fractions of the stage. Rendering places panes
 * from this rather than nesting them in the tree's shape, so a terminal keeps
 * its React state (its scrollback, its directory) when the tree around it
 * changes.
 */
export function layout(
  tree: Node,
  rect: Rect = { x: 0, y: 0, width: 1, height: 1 },
  out: Layout = { panes: {}, gutters: [] },
): Layout {
  if (tree.kind === "leaf") {
    out.panes[tree.id] = rect;
    return out;
  }
  const { x, y, width, height } = rect;
  const r = tree.ratio;
  const [first, second]: [Rect, Rect] =
    tree.dir === "row"
      ? [
          { x, y, width: width * r, height },
          { x: x + width * r, y, width: width * (1 - r), height },
        ]
      : [
          { x, y, width, height: height * r },
          { x, y: y + height * r, width, height: height * (1 - r) },
        ];
  out.gutters.push({ id: tree.id, dir: tree.dir, rect, ratio: r });
  layout(tree.children[0], first, out);
  layout(tree.children[1], second, out);
  return out;
}

/**
 * The leaf nearest to `leafId` in a direction, judged by rendered rectangles
 * rather than by tree shape, because "the pane to the right" is a geometric
 * question and the tree does not know how wide anything is.
 *
 * Candidates must start past the source's far edge in that direction. Among
 * them, the nearest along the axis wins, with perpendicular overlap breaking
 * ties so a pane beside you beats one diagonally away.
 */
export function neighbor(
  leafId: string,
  dir: "left" | "right" | "up" | "down",
  rects: Record<string, Rect>,
): string | null {
  const from = rects[leafId];
  if (!from) return null;
  const cx = from.x + from.width / 2;
  const cy = from.y + from.height / 2;
  let best: { id: string; score: number } | null = null;
  for (const [id, r] of Object.entries(rects)) {
    if (id === leafId) continue;
    let along: number;
    let across: number;
    switch (dir) {
      case "right":
        along = r.x - (from.x + from.width);
        across = Math.abs(r.y + r.height / 2 - cy);
        break;
      case "left":
        along = from.x - (r.x + r.width);
        across = Math.abs(r.y + r.height / 2 - cy);
        break;
      case "down":
        along = r.y - (from.y + from.height);
        across = Math.abs(r.x + r.width / 2 - cx);
        break;
      case "up":
        along = from.y - (r.y + r.height);
        across = Math.abs(r.x + r.width / 2 - cx);
        break;
    }
    if (along < -1) continue;
    const score = along * 10 + across;
    if (!best || score < best.score) best = { id, score };
  }
  return best?.id ?? null;
}

/** Which of the five drop zones a point falls in, as a fraction of the pane:
 *  the outer quarter on each side is an edge, the rest is the center. */
export function dropZone(fx: number, fy: number): Edge | "center" {
  const q = 0.25;
  const dl = fx;
  const dr = 1 - fx;
  const dt = fy;
  const db = 1 - fy;
  const nearest = Math.min(dl, dr, dt, db);
  if (nearest > q) return "center";
  if (nearest === dl) return "left";
  if (nearest === dr) return "right";
  if (nearest === dt) return "top";
  return "bottom";
}
