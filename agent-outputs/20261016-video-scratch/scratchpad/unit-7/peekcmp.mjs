import { readFileSync } from "node:fs";
const { normalSamples } = await import("/home/user/dataslope/charts/_theme.mjs");
const a = normalSamples(8000, 0, 1, 10), b = normalSamples(8000, 0, 1, 10009);
const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
function Phi(x) { const t = 1 / (1 + 0.2316419 * Math.abs(x)); const d = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))); const p = 1 - phi(x) * d; return x >= 0 ? p : 1 - p; }
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const rows = [];
for (let n = 100; n <= 8000; n += 100) { const z = (mean(a.slice(0, n)) - mean(b.slice(0, n))) / Math.sqrt(2 / n); rows.push(Math.round(2 * (1 - Phi(Math.abs(z))) * 1e4) / 1e4); }
const py = JSON.parse(readFileSync(process.argv[2], "utf8")).peek.rows.map((r) => r.p);
let maxd = 0; rows.forEach((v, i) => (maxd = Math.max(maxd, Math.abs(v - py[i]))));
console.log("rows", rows.length, py.length, "max diff", maxd);
