// Run with `npm test` (node --test; Node strips the types).
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { type Cubic, headDirection, headWings, lineLength, pointBack, type Pt, roundedPolyline, sampleCubic } from "./arrow.ts";

const deg = ([x, y]: Pt) => (Math.atan2(y, x) * 180) / Math.PI;

/** How far the last `len` of a line strays from the axis through its tip. */
function strayFromAxis(line: readonly Pt[], dir: Pt, len: number) {
  const [tx, ty] = line[line.length - 1];
  let worst = 0;
  let walked = 0;
  for (let i = line.length - 1; i > 0 && walked <= len; i--) {
    walked += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    const [px, py] = line[i - 1];
    // Distance from the axis: the cross product with the unit direction.
    worst = Math.max(worst, Math.abs((px - tx) * dir[1] - (py - ty) * dir[0]));
  }
  return worst;
}

test("a straight line's head points along it", () => {
  const dir = headDirection([[0, 0], [30, 40]], 15);
  assert.ok(Math.abs(dir[0] - 0.6) < 1e-9 && Math.abs(dir[1] - 0.8) < 1e-9);
});

test("a curve's head follows its last stretch, not its tangent at the tip", () => {
  // CPointers, Fig. 3: from a box below to a box above and to the left, with
  // the last control point straight under the tip. The tangent at the tip is
  // vertical; the line the head sits on comes in at a steep diagonal.
  const curve: Cubic = [[1180, 900], [1180, 820], [900, 780], [900, 705]];
  const line = sampleCubic(curve);
  const dir = headDirection(line, 15);
  const tangent: Pt = [0, -1];
  assert.ok(Math.abs(deg(dir) - deg(tangent)) > 10, `head at ${deg(dir).toFixed(1)}°, tangent ${deg(tangent)}°`);
  // The head sits on its line: the last 15 px stay within a pixel of its
  // axis. Turned to the tangent instead, they wander off it.
  assert.ok(strayFromAxis(line, dir, 15) < 1, `strays ${strayFromAxis(line, dir, 15).toFixed(2)} px`);
  assert.ok(strayFromAxis(line, tangent, 15) > 2);
});

test("the head length is measured along the line, round a corner", () => {
  // An L whose last leg is shorter than the head: the point 15 back is on
  // the first leg, so the head leans the way the line actually runs there.
  const back = pointBack([[0, 0], [0, 100], [10, 100]], 15);
  assert.deepEqual(back, [0, 95]);
});

test("a rounded polyline's samples trace its own path", () => {
  const { d, samples } = roundedPolyline([[0, 0], [100, 0], [100, 80]], 22);
  assert.equal(d, "M0,0 L78,0 Q100,0 100,22 L100,80");
  assert.deepEqual(samples.at(-1), [100, 80]);
  // Straight 78, the corner's quadratic, straight 58.
  const corner = lineLength(
    Array.from({ length: 1001 }, (_, i): Pt => {
      const t = i / 1000;
      const u = 1 - t;
      return [u * u * 78 + 2 * u * t * 100 + t * t * 100, t * t * 22];
    }),
  );
  assert.ok(Math.abs(lineLength(samples) - (78 + corner + 58)) < 0.05);
});

test("wings are symmetric about the axis and meet at the tip", () => {
  assert.equal(headWings([10, 10], [1, 0], 15, 9), "M-5,1 L10,10 L-5,19");
});

test("every arrowhead in the videos is built here", () => {
  // Hand-rolled heads are how the tangent mistake spread to four videos, so
  // the wing geometry and angle math live in this file only.
  const videos = join(dirname(fileURLToPath(import.meta.url)), "..", "videos");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
  for (const file of files(videos).filter((f) => /\.tsx?$/.test(f))) {
    const src = readFileSync(file, "utf8");
    // arrowHead() is the one entry point: it also reports how far the line
    // turns under the head, which `npm run check:frames` collects.
    assert.ok(
      !/side \* u[xy]|Math\.atan2|\bhead(Wings|Triangle|Direction)\(/.test(src),
      `${file}: build arrowheads with arrowHead() from src/components/arrow.ts`,
    );
  }
});
