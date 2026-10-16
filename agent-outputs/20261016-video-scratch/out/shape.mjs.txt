import { headBend, sampleCubic, cubicAt } from "../src/components/arrow.ts";
const report = (name, c, len = 15) => {
  const line = sampleCubic(c);
  const ys = line.map((p) => p[1]);
  console.log(name.padEnd(34), "bend", headBend(line, len).toFixed(1).padStart(5) + "°", " y range", Math.min(...ys).toFixed(0), "-", Math.max(...ys).toFixed(0));
};
// Fig. 1: from p's box bottom (1350,638) down and back up into n's box bottom (1096,643).
const [x0, x1, b, dip] = [1350, 1096, 638, 96];
report("fig1 now", [[x0, b], [x0, b + dip], [x1, b + dip], [x1, b + 5]]);
for (const k of [40, 60, 80]) report(`fig1 diag c2 +${k}`, [[x0, b], [x0, b + dip], [x1 + k, b + dip], [x1, b + 5]]);
for (const s of [1.3, 1.6]) report(`fig1 deeper x${s}`, [[x0, b], [x0, b + dip * s], [x1, b + dip * s], [x1, b + 5]]);
for (const k of [60, 90]) report(`fig1 both in ${k}`, [[x0, b], [x0 - k, b + dip * 1.25], [x1 + k, b + dip * 1.25], [x1, b + 5]]);
// Fig. 3: from the swap box top (1290,699) up into main's box bottom (1060,576).
const [sx, sy, ex, ey] = [1290, 699, 1060, 576];
const mid = 128 * 0.55;
report("fig3 now", [[sx, sy], [sx, sy - mid], [ex, ey + mid - 5], [ex, ey]]);
for (const [a, l] of [[60, 50], [60, 70], [55, 80], [65, 70], [70, 60]]) {
  const r = (a * Math.PI) / 180;
  report(`fig3 arrive ${a}° ctrl ${l}`, [[sx, sy], [sx, sy - mid], [ex + Math.cos(r) * l, ey + Math.sin(r) * l], [ex, ey]]);
}
