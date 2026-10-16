import { headBend, sampleCubic } from "../src/components/arrow.ts";
const [x0, x1, b, dip] = [1350, 1096, 638, 96];
const res = [];
for (const k of [40, 60, 80, 100, 120]) for (const s of [1.0, 1.1, 1.2, 1.3]) {
  const line = sampleCubic([[x0, b], [x0 - k, b + dip * s], [x1 + k, b + dip * s], [x1, b + 5]]);
  res.push({ k, s, bend: +headBend(line, 15).toFixed(1), bottom: Math.round(Math.max(...line.map((p) => p[1]))) });
}
console.log(res.filter((r) => r.bend < 6).map((r) => JSON.stringify(r)).join("\n"));
