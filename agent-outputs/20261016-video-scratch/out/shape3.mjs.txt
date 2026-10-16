import { headBend, sampleCubic } from "../src/components/arrow.ts";
const [sx, sy, ex, ey] = [1290, 699, 1060, 576];
const deg = (x, y) => (Math.atan2(y, x) * 180) / Math.PI;
const out = [];
for (let dep = 60; dep <= 100; dep += 5) // departure angle from horizontal, leaning left
  for (let l1 = 30; l1 <= 110; l1 += 10)
    for (let arr = 40; arr <= 80; arr += 5) // arrival angle from horizontal, coming from lower right
      for (let l2 = 30; l2 <= 110; l2 += 10) {
        const r1 = (dep * Math.PI) / 180, r2 = (arr * Math.PI) / 180;
        const c = [[sx, sy], [sx - Math.cos(r1) * l1, sy - Math.sin(r1) * l1], [ex + Math.cos(r2) * l2, ey + Math.sin(r2) * l2], [ex, ey]];
        const line = sampleCubic(c);
        const ys = line.map((p) => p[1]);
        if (Math.min(...ys) < ey - 1 || Math.max(...ys) > sy + 1) continue; // stays between the boxes
        out.push({ dep, l1, arr, l2, bend: headBend(line, 15) });
      }
out.sort((a, b) => a.bend - b.bend);
for (const o of out.filter((o) => o.arr >= 55).slice(0, 8)) console.log(JSON.stringify(o));
console.log("best with vertical departure:", JSON.stringify(out.filter((o) => o.dep === 90 && o.arr >= 55)[0]));
