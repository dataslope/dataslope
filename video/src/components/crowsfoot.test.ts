// Run with `npm test` (node --test; Node strips the types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { CARDINALITIES, endSegment, endSymbols, MARKER, markerLength, relationEnd } from "./crowsfoot.ts";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("every marker stays on its own stretch of line, within markerLength of the entity", () => {
  for (const kind of CARDINALITIES) {
    const m = relationEnd([500, 200], [100, 200], kind);
    const xs = [...m.lines.flat().map((p) => p[0]), ...m.rings.flatMap((r) => [r.c[0] - r.r, r.c[0] + r.r])];
    assert.ok(Math.max(...xs) <= 500 + 1e-9, `${kind} pokes into the entity`);
    assert.ok(Math.min(...xs) >= 500 - markerLength(kind) - 1e-9, `${kind} runs past markerLength`);
  }
});

test("a crow's foot fans out to the entity's edge and a bar crosses the line square", () => {
  const foot = relationEnd([500, 200], [100, 200], "many");
  assert.equal(foot.lines.length, 3);
  for (const [, tip] of foot.lines) assert.ok(close(tip[0], 500), "every prong ends on the edge");
  const ys = foot.lines.map(([, tip]) => tip[1]).sort((a, b) => a - b);
  assert.ok(close(ys[0], 200 - 0.55 * MARKER) && close(ys[1], 200) && close(ys[2], 200 + 0.55 * MARKER));
  const one = relationEnd([500, 200], [100, 200], "exactly-one");
  assert.equal(one.lines.length, 2);
  for (const [a, b] of one.lines) assert.ok(close(a[0], b[0]), "a bar on a horizontal line is vertical");
});

test("the notation reads maximum nearest the entity, minimum outside it", () => {
  // zero-or-many: the foot at the entity, the ring farther out.
  const m = relationEnd([500, 200], [100, 200], "zero-or-many");
  assert.equal(m.rings.length, 1);
  assert.ok(m.rings[0].c[0] < 500 - MARKER, "the ring sits beyond the foot");
  // zero-or-one: a bar, then a ring.
  const z = relationEnd([500, 200], [100, 200], "zero-or-one");
  assert.ok(z.rings[0].c[0] < z.lines[0][0][0]);
});

test("markers turn with their line", () => {
  // Arriving from above: the same marker, rotated a quarter turn.
  const down = relationEnd([300, 500], [300, 100], "one-or-many");
  for (const [, tip] of down.lines.slice(0, 3)) assert.ok(close(tip[1], 500));
  const bar = down.lines[3];
  assert.ok(close(bar[0][1], bar[1][1]), "a bar on a vertical line is horizontal");
});

test("endSegment measures the straight stretch each marker sits on", () => {
  const pts = [[0, 0], [40, 0], [40, 100], [300, 100]] as const;
  assert.equal(endSegment(pts, "start"), 40);
  assert.equal(endSegment(pts, "end"), 260);
});

test("endSymbols points at the symbols the marker drew", () => {
  const tip: [number, number] = [500, 200];
  const from: [number, number] = [100, 200];
  for (const kind of CARDINALITIES) {
    const m = relationEnd(tip, from, kind);
    const s = endSymbols(tip, from, kind);
    // Every symbol centre is on the line, inside the marker's reach.
    for (const p of [s.near, s.far].filter((p) => p !== undefined)) {
      assert.ok(close(p[1], 200), `${kind}: off the line`);
      assert.ok(p[0] <= 500 && p[0] >= 500 - markerLength(kind), `${kind}: outside the marker`);
    }
    if (s.far) assert.ok(s.far[0] < s.near[0], `${kind}: the minimum sits farther out than the maximum`);
    // A circle's centre is the far symbol whenever there is one.
    if (m.rings.length) assert.deepEqual(s.far, m.rings[0].c);
  }
  assert.equal(endSymbols(tip, from, "many").far, undefined);
  assert.ok(close(endSymbols(tip, from, "exactly-one").near[0], 500 - 0.55 * MARKER));
});
