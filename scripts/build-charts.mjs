#!/usr/bin/env node
/**
 * Render the Observable Plot chart specs in `charts/` to SVG and emit the
 * generated module the app inlines them from. Two constraints shape it:
 * course MDX compiles at request time inside the Worker under a 10 MiB
 * gzipped bundle cap, so Plot must never ship; and dark mode is a runtime
 * class, so the SVG is inlined and painted with `currentColor` +
 * `var(--ds-chart-*)` tokens (see charts/_theme.mjs).
 *
 * Caching is one coarse digest (everything in charts/, Plot's version, this
 * script) rather than per-file: rendering is ~5 ms/chart, and per-file
 * hashing would go stale when only a shared helper changed. Each entry also
 * carries `usedBy` so the admin gallery can link back without reading MDX at
 * request time. Output: lib/generated/charts.js (gitignored; committed
 * `.d.ts` sibling). Runs from dev, build, postinstall. Deterministic: specs
 * using random data must draw from the seeded helpers in charts/_theme.mjs.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHARTS_DIR = join(ROOT, "charts");
const CONTENT_DIR = join(ROOT, "content");
const OUT_FILE = join(ROOT, "lib", "generated", "charts.js");
// Slugs-only sibling for existence checks: API routes compile as their own
// bundler graph, and importing the full manifest put a second copy of every
// chart's markup into the deployed Worker.
const SLUGS_FILE = join(ROOT, "lib", "generated", "chart-slugs.js");
// One static asset per chart's markup; the manifest keeps metadata only (the
// SVG corpus was ~99% of its weight and sat in the Worker bundle as an
// import). `<Chart>` reads these via lib/charts/loadChartSvg.ts — filesystem
// at build time, the ASSETS binding on a request-time render.
const SVG_DIR = join(ROOT, "public", "chart-svgs");

/** Content collection → route prefix, mirroring the `baseUrl`s in lib/source.ts.
 *  A collection that isn't listed here simply contributes no links. */
const ROUTE_BASES = {
  courses: "/courses",
  interview: "/interview-prep",
  "fumadocs-dev": "/fumadocs-dev",
};

/** Files starting with `_` are shared helpers, not charts, but they still
 *  belong in the digest: editing the theme must re-render every chart. */
const isSpec = (name) => name.endsWith(".mjs") && !name.startsWith("_");

function plotVersion() {
  try {
    return JSON.parse(
      readFileSync(join(ROOT, "node_modules", "@observablehq", "plot", "package.json"), "utf8"),
    ).version;
  } catch {
    // Not installed (e.g. a production-only install). The digest still works;
    // it just can't invalidate on a Plot upgrade until the package is present.
    return "absent";
  }
}

/** Every `.mdx` under a directory, recursively. */
function mdxFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return mdxFiles(full);
    return e.name.endsWith(".mdx") ? [full] : [];
  });
}

/**
 * Display name of the course/track a lesson belongs to: the `title` in the
 * top-level meta.json, falling back to the directory name.
 */
function sectionName(collection, relPath) {
  const top = relPath.split("/")[0];
  if (!top || top === relPath.replace(/\.mdx$/, "")) return null;
  const meta = join(CONTENT_DIR, collection, top, "meta.json");
  if (existsSync(meta)) {
    try {
      const title = JSON.parse(readFileSync(meta, "utf8")).title;
      if (typeof title === "string" && title.length > 0) return title;
    } catch {
      // Malformed meta.json: fall through to the directory name.
    }
  }
  return top;
}

/**
 * Where each chart is used: slug → [{ url, title, section, collection }].
 * Built here so the Worker never reads ~800 MDX files at request time. The
 * scan is a regex over `<Chart slug="…"`, not an MDX parse; a chart rendered
 * through a variable slug would be missed and show as unused.
 */
function chartUsages() {
  const usages = {};
  for (const [collection, base] of Object.entries(ROUTE_BASES)) {
    const dir = join(CONTENT_DIR, collection);
    for (const file of mdxFiles(dir)) {
      const src = readFileSync(file, "utf8");
      const slugs = [...src.matchAll(/<Chart\s[^>]*slug="([^"]+)"/g)].map((m) => m[1]);
      if (slugs.length === 0) continue;

      // content/<collection>/<…>/<page>.mdx → <base>/<…>/<page>, `index`
      // collapsing to its parent, exactly as Fumadocs routes it.
      const rel = file.slice(dir.length + 1).replace(/\.mdx$/, "");
      const path = rel === "index" ? "" : rel.replace(/(^|\/)index$/, "");
      const url = path ? `${base}/${path}` : base;
      const title = src.match(/^title:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, "");

      const section = sectionName(collection, file.slice(dir.length + 1));
      for (const slug of new Set(slugs)) {
        (usages[slug] ??= []).push({
          url,
          title: title ?? url,
          collection,
          ...(section ? { section } : {}),
        });
      }
    }
  }
  // Grouped by course, then by lesson, so uses do not interleave.
  for (const list of Object.values(usages)) {
    list.sort(
      (a, b) =>
        (a.section ?? "").localeCompare(b.section ?? "") || a.title.localeCompare(b.title),
    );
  }
  return usages;
}

/**
 * Digest of everything that can change the output: every file in `charts/`,
 * Plot's version, and this script's own bytes — hashing the script removes
 * the "remember to bump RENDERER_VERSION" step.
 */
function computeDigest(files, usages) {
  const h = createHash("sha256")
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .update("\0")
    .update(plotVersion())
    // The usage index is part of the output, so a new `<Chart>` placement
    // invalidates too.
    .update("\0")
    .update(JSON.stringify(usages));
  for (const name of files) {
    h.update("\0").update(name).update("\0").update(readFileSync(join(CHARTS_DIR, name)));
  }
  return h.digest("hex");
}

/** The digest recorded in a previously generated module, or null. Read by
 *  regex rather than `import()` so the fast path never loads the SVG corpus. */
function priorDigest() {
  if (!existsSync(OUT_FILE)) return null;
  const m = readFileSync(OUT_FILE, "utf8").match(/export const digest = "([0-9a-f]{64})";/);
  return m ? m[1] : null;
}

/**
 * Shrink and normalize the markup Plot produced. `--plot-background` (label
 * halos, tip backdrops) defaults to literal `white`, which would glow on the
 * dark page; it becomes a theme token.
 */
function postProcess(svg, slug) {
  const out = svg
    .replace(/--plot-background:\s*white;/g, "--plot-background: var(--ds-chart-surface);")
    // Round long decimals to 2dp (well under a device pixel). Scoped to
    // attribute values: applied to the whole document it would also rewrite
    // text content, so a label "t* = 1.645" would ship as "1.65".
    .replace(/="([^"]*)"/g, (m, value) =>
      value.includes(".")
        ? `="${value.replace(/-?\d+\.\d{3,}/g, (n) => String(Number(Number(n).toFixed(2))))}"`
        : m,
    );
  // Plot's scoped stylesheet class is `plot-<hash of its CSS>`: identical
  // styling shares a class, and a Plot upgrade renames every chart at once.
  // Rename after the slug: unique per chart, stable across upgrades.
  const generated = out.match(/class="(plot-[a-z0-9]+)"/);
  return generated ? out.split(generated[1]).join(`ds-chart-${slug}`) : out;
}

/**
 * Reject any literal color that survived into the output: a hex or rgb()
 * fill looks right in the author's theme and wrong in the other, so fail the
 * build instead of relying on review.
 */
function literalColors(svg) {
  return [...svg.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8}|rgba?\([^"]*\))"/g)].map(
    (m) => m[1],
  );
}

/**
 * Reject a function that leaked into an SVG attribute. Plot options that read
 * like channels but are constants (`textAnchor`, `dx`, `dy`,
 * `strokeDasharray`) stringify a function into the attribute; the renderer
 * discards it and labels quietly revert to defaults. Fail the build;
 * `sidedText()` in charts/_theme.mjs is the supported per-row anchoring.
 */
function stringifiedFunctions(svg) {
  return [...svg.matchAll(/([a-zA-Z-]+)="[^"]*=>[^"]*"/g)].map((m) => m[1]);
}

/**
 * Count `<text>` elements that rendered empty — almost always a tick label:
 * on a log scale d3 labels only values nice for the base, even ones passed
 * explicitly via `ticks` and regardless of `tickFormat`. Fix with `base: 2`
 * for powers of two, or powers-of-ten ticks. A spec never draws an empty
 * string on purpose, so the check needs no exceptions.
 */
function emptyLabels(svg) {
  return [...svg.matchAll(/<text\b[^>]*>(?:<tspan\b[^>]*>\s*<\/tspan>)*<\/text>/g)].length;
}

/**
 * The smallest type a spec may author — the input to the per-chart min-width
 * floor below. An inlined SVG scales its type with its width, so one 9px
 * annotation drags a chart's floor up and forces horizontal scrolling on a
 * phone. A spec whose *subject* is unreadably small type exports
 * `smallTypeAllowed` with a reason (same escape hatch as
 * `literalColorsAllowed`).
 */
const MIN_AUTHORED_PX = 10;

function undersizedType(svg) {
  return [...svg.matchAll(/font-size[=:]\s*"?([0-9.]+)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n < MIN_AUTHORED_PX);
}

/**
 * Check a spec's optional `sources` export ([{ text, href? }]), the credit
 * line under the chart. Returns the problem to report, or null (including
 * absent). Checked here because a typo'd shape would surface as a blank
 * credit nobody notices; `href` is optional but must be http(s) — it renders
 * as a link out.
 */
function badSources(sources) {
  if (sources === undefined) return null;
  if (!Array.isArray(sources)) {
    return "sources must be an array of { text, href? } entries";
  }
  for (const [i, source] of sources.entries()) {
    const at = `sources[${i}]`;
    if (!source || typeof source !== "object") return `${at} must be an object`;
    if (typeof source.text !== "string" || source.text.trim() === "") {
      return `${at}.text must be a non-empty string (the reference as it reads on the page)`;
    }
    if (source.href !== undefined && !/^https?:\/\//.test(source.href)) {
      return `${at}.href must be an http(s) URL, or be left off`;
    }
  }
  return null;
}

const MIN_LEGIBLE_PX = 8.5;

/** Below this the floor is not worth publishing: the chart already fits the
 *  narrowest phone column with room to spare. */
const IGNORE_BELOW_PX = 340;

/** Narrowest width this chart can be drawn at before its smallest label
 *  drops under MIN_LEGIBLE_PX; below it the container scrolls instead of
 *  scaling. Computed per chart from its own markup. */
function legibleMinWidth(svg, width, smallTypeAllowed = false) {
  const sizes = [...svg.matchAll(/font-size[=:]\s*"?([0-9.]+)/g)].map((m) =>
    Number(m[1]),
  );
  if (sizes.length === 0) return 0;
  // An exempted spec drew type it *wants* illegible; sizing from it would pin
  // the chart at full width to protect unreadable labels. Size from the
  // authoring floor instead, so readable type is safe and the chart shrinks.
  const smallest = smallTypeAllowed
    ? Math.max(MIN_AUTHORED_PX, Math.min(...sizes))
    : Math.min(...sizes);
  // A label of `smallest` px renders at `smallest * (w / width)`; solve for
  // the w where it hits the floor, capped at the chart's own width.
  const floor = Math.min(width, Math.ceil((width * MIN_LEGIBLE_PX) / smallest));
  return floor <= IGNORE_BELOW_PX ? 0 : floor;
}

const files = existsSync(CHARTS_DIR)
  ? readdirSync(CHARTS_DIR).filter((f) => f.endsWith(".mjs")).sort()
  : [];
const specs = files.filter(isSpec);
const usages = chartUsages();
const digest = computeDigest(files, usages);

// The sibling outputs must exist too, or a checkout with a current charts.js
// that predates the slugs/SVG splits would skip the writes.
const svgDirCurrent = () => {
  try {
    const expected = specs.map((file) => file.replace(/\.mjs$/, ".svg")).sort();
    const actual = readdirSync(SVG_DIR).filter((file) => file.endsWith(".svg")).sort();
    return expected.length === actual.length && expected.every((file, i) => file === actual[i]);
  } catch {
    return false;
  }
};
if (priorDigest() === digest && existsSync(SLUGS_FILE) && svgDirCurrent()) {
  console.log(`build-charts: ${specs.length} chart(s) up to date`);
  process.exit(0);
}

const charts = {};
const svgBySlug = new Map();
const problems = [];

for (const file of specs) {
  const slug = file.replace(/\.mjs$/, "");
  const mod = await import(pathToFileURL(join(CHARTS_DIR, file)).href);
  if (typeof mod.render !== "function") {
    problems.push(`${file}: no exported render() function`);
    continue;
  }
  if (!mod.title) {
    problems.push(`${file}: no exported title (it becomes the chart's aria-label)`);
    continue;
  }

  // Credit line (<FigureSources>). Lives on the spec, not the `<Chart>` tag,
  // so it travels with the chart to every lesson that places it.
  const sourceProblem = badSources(mod.sources);
  if (sourceProblem) {
    problems.push(`${file}: ${sourceProblem}`);
    continue;
  }

  const el = mod.render();
  const svg = postProcess(el.outerHTML, slug);

  // Opting out of the literal-color guard requires an exported reason; the
  // one legitimate case is a chart whose subject *is* specific colors, where
  // the swatches are data and correctly ignore the theme.
  const literal = mod.literalColorsAllowed ? [] : literalColors(svg);
  if (mod.literalColorsAllowed && typeof mod.literalColorsAllowed !== "string") {
    problems.push(
      `${file}: literalColorsAllowed must be a string explaining why this ` +
        "chart's colors cannot come from the theme tokens",
    );
    continue;
  }
  if (literal.length > 0) {
    problems.push(
      `${file}: literal color(s) ${[...new Set(literal)].join(", ")} — ` +
        "use the SERIES/PRIMARY/MUTED/ACCENT tokens from charts/_theme.mjs so " +
        "the chart reads in both themes (or export literalColorsAllowed with " +
        "a reason, which is only right when the colors are the subject)",
    );
    continue;
  }

  if (mod.smallTypeAllowed && typeof mod.smallTypeAllowed !== "string") {
    problems.push(
      `${file}: smallTypeAllowed must be a string explaining why this chart's ` +
        "type has to be smaller than the floor",
    );
    continue;
  }
  const tiny = mod.smallTypeAllowed ? [] : undersizedType(svg);
  if (tiny.length > 0) {
    problems.push(
      `${file}: type below ${MIN_AUTHORED_PX}px (${[...new Set(tiny)].sort((a, b) => a - b).join(", ")}) — ` +
        "a chart is one drawing scaled to its column, so its smallest label " +
        "sets how far it can shrink before the whole thing has to scroll on a " +
        "phone (or export smallTypeAllowed with a reason, which is only right " +
        "when the unreadable type is the subject)",
    );
    continue;
  }

  const leaked = stringifiedFunctions(svg);
  if (leaked.length > 0) {
    problems.push(
      `${file}: function(s) stringified into ${[...new Set(leaked)].join(", ")} — ` +
        "these Plot options are constants, not channels, so the renderer drops " +
        "the value; use sidedText() from charts/_theme.mjs or split the mark",
    );
    continue;
  }

  const blank = emptyLabels(svg);
  if (blank > 0) {
    problems.push(
      `${file}: ${blank} empty text element(s) — almost always a tick label ` +
        "d3 declined to format. A log scale only labels the values that are " +
        "nice for its base, whatever `ticks` and `tickFormat` say, so give the " +
        "scale `base: 2` for powers of two or use powers of ten",
    );
    continue;
  }

  const width = Number(el.getAttribute("width"));
  const minWidth = legibleMinWidth(svg, width, Boolean(mod.smallTypeAllowed));

  charts[slug] = {
    title: mod.title,
    ...(mod.caption ? { caption: mod.caption } : {}),
    ...(mod.sources?.length ? { sources: mod.sources } : {}),
    width,
    height: Number(el.getAttribute("height")),
    // Omitted when the chart can shrink to any width legibly.
    ...(minWidth ? { minWidth } : {}),
    usedBy: usages[slug] ?? [],
    // The markup goes to public/chart-svgs/<slug>.svg; the manifest keeps
    // only its size, for the admin gallery's stats.
    svgBytes: svg.length,
  };
  svgBySlug.set(slug, svg);
}

if (problems.length > 0) {
  console.error("build-charts: failed\n  " + problems.join("\n  "));
  process.exit(1);
}

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(
  OUT_FILE,
  "// Generated by scripts/build-charts.mjs from charts/*.mjs, do not edit.\n" +
    `export default ${JSON.stringify(charts, null, 2)};\n\n` +
    "// Covers every file in charts/ plus the Plot version; the script exits\n" +
    "// before importing Plot when it still matches.\n" +
    `export const digest = "${digest}";\n`,
);

writeFileSync(
  SLUGS_FILE,
  "// Generated by scripts/build-charts.mjs from charts/*.mjs, do not edit.\n" +
    "// Slug index only — import this, not charts.js, from any API route.\n" +
    `export default ${JSON.stringify(Object.keys(charts).sort())};\n`,
);

// Rebuilt from scratch each run so a renamed or deleted spec's file drops
// out instead of being served forever from the assets store.
rmSync(SVG_DIR, { recursive: true, force: true });
mkdirSync(SVG_DIR, { recursive: true });
for (const [slug, svg] of svgBySlug) {
  writeFileSync(join(SVG_DIR, `${slug}.svg`), svg);
}

const bytes = Object.values(charts).reduce((n, c) => n + c.svgBytes, 0);
const orphans = Object.keys(charts).filter((slug) => charts[slug].usedBy.length === 0);
console.log(
  `build-charts: ${specs.length} chart(s) rendered ` +
    `(${(bytes / 1024).toFixed(0)} KB SVG) → lib/generated/charts.js`,
);
// Not an error — specs are often written before their lesson — but worth
// saying: a typo'd slug looks exactly like this.
if (orphans.length > 0) {
  console.log(`build-charts: not placed in any lesson yet: ${orphans.join(", ")}`);
}
