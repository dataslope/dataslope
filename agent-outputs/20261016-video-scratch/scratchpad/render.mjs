import charts from "/home/user/dataslope/lib/generated/charts.js";
import { readFileSync, writeFileSync } from "node:fs";
const brand = readFileSync("/home/user/dataslope/app/brand.css", "utf8");
const slugs = process.argv.slice(2);
for (const slug of slugs) {
  const c = charts[slug];
  for (const theme of ["light", "dark"]) {
    const vars = theme === "light"
      ? `--ds-chart-1: var(--ds-blue-600); --ds-chart-2: var(--ds-orange-600); --ds-chart-3: var(--ds-green-700); --ds-chart-4: var(--ds-purple-600); --ds-chart-5: var(--ds-teal-700); --ds-chart-6: var(--ds-red-600); --ds-chart-7: var(--ds-yellow-800); --ds-chart-accent: var(--ds-red-700); --ds-chart-muted: var(--ds-gray-400); --ds-chart-guide: var(--ds-blue-400); --ds-chart-surface: #ffffff; color: var(--ds-gray-900); background: #ffffff;`
      : `--ds-chart-1: var(--ds-blue-400); --ds-chart-2: var(--ds-orange-400); --ds-chart-3: var(--ds-green-400); --ds-chart-4: var(--ds-purple-400); --ds-chart-5: var(--ds-teal-400); --ds-chart-6: var(--ds-red-400); --ds-chart-7: var(--ds-yellow-400); --ds-chart-accent: var(--ds-red-400); --ds-chart-muted: var(--ds-gray-500); --ds-chart-guide: var(--ds-blue-600); --ds-chart-surface: #121212; color: var(--ds-gray-100); background: #121212;`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${brand}
body{margin:0;font-family:Inter,system-ui,sans-serif}
.chart{${vars} padding:12px;width:680px}
.chart svg{width:100%;height:auto;display:block}
.cap{font-size:13px;margin-top:6px}</style></head><body><div class="chart">${readFileSync(`/home/user/dataslope/public/chart-svgs/${slug}.svg`, "utf8")}<div class="cap">${c.caption ?? ""}</div></div></body></html>`;
    writeFileSync(`${process.env.SP}/${slug}-${theme}.html`, html);
  }
  console.log(slug, "min", c.minWidth, "usedBy", c.usedBy.length);
}
