#!/usr/bin/env node
/**
 * Fail on a chart that draws outside its own box.
 *
 * Observable Plot does not clip a mark unless the mark asks it to, so data
 * that runs past an explicit domain keeps being drawn: not into the margin,
 * but out of the SVG entirely, over whatever the page has beside the figure.
 * `bonferroni-vs-fdr` built its Benjamini-Hochberg threshold for all 100 ranks
 * against an x domain of 30, and the other 70 left the frame as a diagonal
 * running across the lesson's table of contents. Two more were found the same
 * way: a faceted density whose grid ran to 0.999 under a domain of 0.7, and a
 * rule at a percentile the domain is sized never to reach.
 *
 * The check reads the rendered SVG rather than the specs, because whether a
 * mark overflows depends on the data, and the data is only known once it is
 * drawn. Run `build-charts.mjs` first; `npm run check:charts` does.
 *
 * ── What counts as outside ─────────────────────────────────────────────────
 *
 *   - `<text>` never counts. Axis labels legitimately sit in the margin, and
 *     a label's box is not in its coordinates anyway.
 *   - Anything under a `clip-path` never counts: that is the fix working.
 *   - A `<clipPath>`'s own `<rect>` never counts: it describes the clip.
 *   - Everything else counts, with ancestor `translate()`s accumulated, which
 *     is what catches a mark that only leaves the box once its facet's offset
 *     is applied.
 *
 * A tolerance of 2px absorbs stroke width on a mark sitting exactly on the
 * edge, which is every axis rule.
 *
 * Usage:
 *   node scripts/check-chart-overflow.mjs [--verbose]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHARTS = join(ROOT, "lib", "generated", "charts.js");
const TOLERANCE = 2;

const NUM = /-?\d+(?:\.\d+)?(?:e-?\d+)?/g;
const GEOMETRY = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect"]);

/**
 * Endpoints of every segment in a path's `d`.
 *
 * Parameters are consumed per command rather than read as a flat list of
 * pairs, because an elliptic arc carries seven of them and only the last two
 * are a point. Reading `A 62 62 0 0 1 624 116` as pairs invents a point at
 * y = 624 and reports every pie chart in the set as overflowing.
 */
const ARITY = { m: 2, l: 2, t: 2, h: 1, v: 1, c: 6, s: 4, q: 4, a: 7, z: 0 };
export function pathPoints(d) {
  const points = [];
  let x = 0;
  let y = 0;
  for (const segment of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const command = segment[1].toLowerCase();
    const relative = segment[1] === command && command !== "z";
    const arity = ARITY[command];
    if (!arity) continue;
    const args = (segment[2].match(NUM) ?? []).map(Number);
    for (let i = 0; i + arity <= args.length; i += arity) {
      const a = args.slice(i, i + arity);
      if (command === "h") x = relative ? x + a[0] : a[0];
      else if (command === "v") y = relative ? y + a[0] : a[0];
      else {
        x = relative ? x + a[arity - 2] : a[arity - 2];
        y = relative ? y + a[arity - 1] : a[arity - 1];
      }
      points.push([x, y]);
    }
  }
  return points;
}

/** How far past the box, in px, the worst unclipped mark reaches. */
export function overflow(svg, width, height) {
  const stack = [{ clipped: false, describing: false, tx: 0, ty: 0 }];
  let over = 0;
  let culprit = null;

  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [tag, closing, name, attrs, selfClosing] = match;
    const parent = stack[stack.length - 1];
    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const translate = /transform="translate\(([-\d.e]+)[,\s]+([-\d.e]+)\)"/.exec(attrs);
    const state = {
      clipped: parent.clipped || attrs.includes("clip-path="),
      describing: parent.describing || name === "clipPath" || name === "defs",
      tx: parent.tx + (translate ? Number(translate[1]) : 0),
      ty: parent.ty + (translate ? Number(translate[2]) : 0),
    };

    if (GEOMETRY.has(name) && !state.clipped && !state.describing) {
      const points = [];
      const d = /\bd="([^"]*)"/.exec(attrs);
      if (d) points.push(...pathPoints(d[1]));
      const list = /\bpoints="([^"]*)"/.exec(attrs);
      if (list) {
        const nums = (list[1].match(NUM) ?? []).map(Number);
        for (let i = 0; i + 1 < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
      }
      const attr = (key) => Number(new RegExp(`\\b${key}="([-\\d.e]+)"`).exec(attrs)?.[1] ?? NaN);
      if (name === "circle" || name === "ellipse") points.push([attr("cx"), attr("cy")]);
      if (name === "line") points.push([attr("x1"), attr("y1")], [attr("x2"), attr("y2")]);
      if (name === "rect") {
        points.push([attr("x"), attr("y")]);
        points.push([attr("x") + attr("width"), attr("y") + attr("height")]);
      }
      for (const [px, py] of points) {
        const worst = Math.max(
          Number.isFinite(px) ? Math.max(state.tx + px - width, -(state.tx + px)) : 0,
          Number.isFinite(py) ? Math.max(state.ty + py - height, -(state.ty + py)) : 0,
        );
        if (worst > over) {
          over = worst;
          culprit = tag.slice(0, 96);
        }
      }
    }
    if (!selfClosing) stack.push(state);
  }
  return { over, culprit };
}

async function main() {
  const verbose = process.argv.includes("--verbose");
  if (!existsSync(CHARTS)) {
    console.error(`✗ ${CHARTS} is missing. Run: node scripts/build-charts.mjs`);
    process.exit(1);
  }
  const charts = (await import(pathToFileURL(CHARTS).href)).default;

  const bad = [];
  for (const [slug, entry] of Object.entries(charts)) {
    // The markup lives beside the manifest as one asset per chart (see
    // SVG_DIR in build-charts.mjs); the manifest carries metadata only.
    const svg = readFileSync(join(ROOT, "public", "chart-svgs", `${slug}.svg`), "utf8");
    const box = /viewBox="([^"]+)"/.exec(svg)?.[1].split(/\s+/).map(Number);
    const width = box ? box[2] : entry.width;
    const height = box ? box[3] : entry.height;
    if (!width || !height) continue;
    const { over, culprit } = overflow(svg, width, height);
    if (over > TOLERANCE) bad.push({ slug, over, culprit, entry });
  }

  if (!bad.length) {
    console.log(`✓ ${Object.keys(charts).length} chart(s): every mark stays inside its box`);
    return;
  }
  bad.sort((a, b) => b.over - a.over);
  console.error(`✗ ${bad.length} chart(s) draw outside their box. Add \`clip: true\` to the mark, or size the domain to the data:\n`);
  for (const { slug, over, culprit, entry } of bad) {
    const pages = (entry.usedBy ?? []).map((u) => u.href ?? u).join(", ");
    console.error(`   ${slug} overflows by ${over.toFixed(0)}px${pages ? `  (${pages})` : ""}`);
    if (verbose) console.error(`      ${culprit}`);
  }
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
