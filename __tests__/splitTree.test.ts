import { describe, it, expect } from "vitest";
import {
  leaf,
  leaves,
  split,
  remove,
  move,
  swap,
  resize,
  equalize,
  neighbor,
  dropZone,
  layout,
  type Node,
} from "@/app/_components/bash/splitTree";

const ratios = (n: Node): number[] => (n.kind === "leaf" ? [] : [n.ratio, ...ratios(n.children[0]), ...ratios(n.children[1])]);

describe("split", () => {
  it("replaces the leaf with a split holding it and the new one", () => {
    const t = split(leaf("a"), "a", "row", "b");
    expect(t.kind).toBe("split");
    expect(leaves(t)).toEqual(["a", "b"]);
    expect(ratios(t)).toEqual([0.5]);
  });

  it("puts the new leaf first when asked", () => {
    expect(leaves(split(leaf("a"), "a", "col", "b", false))).toEqual(["b", "a"]);
  });

  it("nests, and leaves everything else alone", () => {
    const t = split(split(leaf("a"), "a", "row", "b"), "b", "col", "c");
    expect(leaves(t)).toEqual(["a", "b", "c"]);
    expect(split(t, "nope", "row", "d")).toEqual(t);
  });
});

describe("remove", () => {
  it("collapses the parent onto the sibling", () => {
    const t = split(split(leaf("a"), "a", "row", "b"), "b", "col", "c");
    expect(leaves(remove(t, "b"))).toEqual(["a", "c"]);
    expect(leaves(remove(t, "a"))).toEqual(["b", "c"]);
  });

  it("never removes the last leaf", () => {
    expect(remove(leaf("a"), "a")).toEqual(leaf("a"));
  });
});

describe("move", () => {
  const t = split(split(leaf("a"), "a", "row", "b"), "b", "col", "c");

  it("takes the leaf out and splits the target on the edge", () => {
    const moved = move(t, "a", "b", "bottom");
    expect(leaves(moved)).toEqual(["b", "a", "c"]);
    // A left the row, so the row collapsed: the root is now the column.
    expect(moved.kind).toBe("split");
    if (moved.kind === "split") expect(moved.dir).toBe("col");
  });

  it("uses the edge's axis and side", () => {
    expect(leaves(move(t, "c", "a", "left"))).toEqual(["c", "a", "b"]);
    expect(leaves(move(t, "c", "a", "right"))).toEqual(["a", "c", "b"]);
    expect(leaves(move(t, "a", "c", "top"))).toEqual(["b", "a", "c"]);
  });

  it("is a no-op onto itself or an unknown target", () => {
    expect(move(t, "a", "a", "left")).toEqual(t);
    expect(move(t, "a", "zzz", "left")).toEqual(t);
  });
});

describe("swap", () => {
  it("exchanges two leaves in place", () => {
    const t = split(split(leaf("a"), "a", "row", "b"), "b", "col", "c");
    expect(leaves(swap(t, "a", "c"))).toEqual(["c", "b", "a"]);
    expect(swap(t, "a", "a")).toEqual(t);
  });
});

describe("resize", () => {
  it("sets and clamps the ratio of one split only", () => {
    const inner = split(leaf("b"), "b", "col", "c");
    const t: Node = { kind: "split", id: "outer", dir: "row", children: [leaf("a"), inner], ratio: 0.5 };
    const r = resize(t, "outer", 0.95);
    expect(ratios(r)).toEqual([0.9, 0.5]);
    expect(ratios(resize(t, "outer", -1))).toEqual([0.1, 0.5]);
    expect(ratios(equalize(resize(t, "outer", 0.3), "outer"))).toEqual([0.5, 0.5]);
  });
});

describe("neighbor", () => {
  // a | b over c, as rendered: a fills the left half, b the top right, c the bottom right.
  const rects = {
    a: { x: 0, y: 0, width: 100, height: 100 },
    b: { x: 100, y: 0, width: 100, height: 50 },
    c: { x: 100, y: 50, width: 100, height: 50 },
  };
  it("picks by geometry, nearest along the axis and most aligned across it", () => {
    expect(neighbor("a", "right", rects)).toBe("b");
    expect(neighbor("b", "down", rects)).toBe("c");
    expect(neighbor("c", "up", rects)).toBe("b");
    expect(neighbor("c", "left", rects)).toBe("a");
    expect(neighbor("a", "left", rects)).toBeNull();
    expect(neighbor("b", "up", rects)).toBeNull();
  });
});

describe("dropZone", () => {
  it("names the outer quarter on each side and the middle", () => {
    expect(dropZone(0.1, 0.5)).toBe("left");
    expect(dropZone(0.9, 0.5)).toBe("right");
    expect(dropZone(0.5, 0.1)).toBe("top");
    expect(dropZone(0.5, 0.9)).toBe("bottom");
    expect(dropZone(0.5, 0.5)).toBe("center");
    expect(dropZone(0.4, 0.4)).toBe("center");
  });
});

describe("layout", () => {
  const sid = (n: Node) => (n.kind === "split" ? n.id : "");

  it("gives a lone leaf the whole stage and no gutter", () => {
    expect(layout(leaf("a"))).toEqual({ panes: { a: { x: 0, y: 0, width: 1, height: 1 } }, gutters: [] });
  });

  it("places a split's children along its axis at its ratio, with a gutter between", () => {
    let t = split(leaf("a"), "a", "row", "b");
    t = resize(t, sid(t), 0.3);
    const l = layout(t);
    expect(l.panes.a).toEqual({ x: 0, y: 0, width: 0.3, height: 1 });
    expect(l.panes.b).toEqual({ x: 0.3, y: 0, width: 0.7, height: 1 });
    expect(l.gutters).toEqual([{ id: sid(t), dir: "row", ratio: 0.3, rect: { x: 0, y: 0, width: 1, height: 1 } }]);
  });

  it("nests, each child laid out inside its parent's rectangle", () => {
    const t = split(split(leaf("a"), "a", "row", "b"), "b", "col", "c");
    const l = layout(t);
    expect(l.panes.a).toEqual({ x: 0, y: 0, width: 0.5, height: 1 });
    expect(l.panes.b).toEqual({ x: 0.5, y: 0, width: 0.5, height: 0.5 });
    expect(l.panes.c).toEqual({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 });
    expect(l.gutters.map((g) => g.dir)).toEqual(["row", "col"]);
    expect(l.gutters[1].rect).toEqual({ x: 0.5, y: 0, width: 0.5, height: 1 });
  });

  it("covers the stage exactly, whatever the tree", () => {
    let t: Node = leaf("a");
    t = split(t, "a", "row", "b");
    t = split(t, "b", "col", "c");
    t = split(t, "a", "col", "d");
    t = resize(t, sid(t), 0.35);
    const area = Object.values(layout(t).panes).reduce((s, r) => s + r.width * r.height, 0);
    expect(area).toBeCloseTo(1, 10);
  });
});
