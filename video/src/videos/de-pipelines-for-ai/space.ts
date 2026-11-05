// Points for the figures of a vector space (Questions 6 and 8). These are
// drawn positions, a picture of the mechanism, and carry no measured number:
// every number those scenes state comes from check.mjs. Seeded, so every
// frame and every render draws the same picture. Pure (no Remotion, no DOM).

const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type P = { x: number; y: number; c: number };

/**
 * `k` clusters of `per` points each in a unit square (0 to 1 both ways),
 * around centres kept apart from each other (by `sep`) and from the edges.
 * A square drawn `aspect` times wider than tall squashes a round cluster
 * flat; passing that aspect spreads each cluster and keeps the centres apart
 * by that much more in y, so they are round where they are drawn.
 */
export const clusters = (seed: number, k: number, per: number, spread: number, aspect = 1, sep = 0.24) => {
  const rand = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(1e-9, rand());
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const centres: { x: number; y: number }[] = [];
  while (centres.length < k) {
    const c = { x: 0.12 + 0.76 * rand(), y: 0.12 + 0.76 * rand() };
    if (centres.every((o) => Math.hypot(o.x - c.x, (o.y - c.y) / aspect) > sep)) centres.push(c);
  }
  const points: P[] = [];
  centres.forEach((c, ci) => {
    for (let i = 0; i < per; i++) {
      const x = Math.min(0.98, Math.max(0.02, c.x + spread * gauss()));
      const y = Math.min(0.98, Math.max(0.02, c.y + spread * aspect * gauss()));
      points.push({ x, y, c: ci });
    }
  });
  return { centres, points };
};

/** The `k` points nearest (x, y), by index. */
export const nearestOf = (points: readonly P[], x: number, y: number, k: number) =>
  points
    .map((p, i) => ({ i, d: Math.hypot(p.x - x, p.y - y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((o) => o.i);

/** Each point joined to its `k` nearest others: a proximity graph's edges. */
export const graphEdges = (points: readonly P[], k: number) => {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  points.forEach((p, i) => {
    for (const j of nearestOf(points, p.x, p.y, k + 1)) {
      if (j === i) continue;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }
  });
  return edges;
};

/** A seeded draw of which points belong to the viewer's tenant. */
export const tenantOf = (seed: number, count: number, share: number) => {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => rand() < share);
};

/**
 * A greedy search through a navigable graph, as HNSW's is: from `start`,
 * hop to whichever point within `reach[i]` of the current one is nearest
 * (x, y), long hops first and shorter ones after (the upper layers' long
 * links, then the bottom layer's short ones), until no hop gets nearer.
 * Returns the path, by index.
 */
export const greedyWalk = (points: readonly { x: number; y: number }[], start: number, x: number, y: number, reach: readonly number[]) => {
  const dq = (i: number) => Math.hypot(points[i].x - x, points[i].y - y);
  const path = [start];
  let cur = start;
  for (const r of reach) {
    let best = cur;
    points.forEach((p, i) => {
      if (Math.hypot(p.x - points[cur].x, p.y - points[cur].y) <= r && dq(i) < dq(best)) best = i;
    });
    if (best !== cur) path.push((cur = best));
  }
  return path;
};
