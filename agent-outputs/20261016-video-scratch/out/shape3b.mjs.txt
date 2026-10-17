import { headBend, sampleCubic } from "../src/components/arrow.ts";
const [sx, sy, ex, ey] = [1290, 699, 1060, 576]; const gap = 128;
// how much the line turns in its first 30 px, too (the curl at the dot)
const turnNearStart = (line) => headBend([...line].reverse(), 30);
for (const dep of [55, 60, 65, 70]) for (const f1 of [0.25, 0.35, 0.45]) {
  const r1 = (dep * Math.PI) / 180, r2 = (55 * Math.PI) / 180;
  const c = [[sx, sy], [sx - Math.cos(r1) * gap * f1, sy - Math.sin(r1) * gap * f1], [ex + Math.cos(r2) * gap * 0.86, ey + Math.sin(r2) * gap * 0.86], [ex, ey]];
  const line = sampleCubic(c);
  console.log(`dep ${dep} f1 ${f1}: head bend ${headBend(line, 15).toFixed(1)}°, first 30 px turn ${turnNearStart(line).toFixed(1)}°`);
}
