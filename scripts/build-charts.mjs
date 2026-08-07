#!/usr/bin/env node
/**
 * Render the Observable Plot chart specs in `charts/` to SVG and emit the
 * generated module the app inlines them from.
 *
 * Why this exists:
 *
 * Course lessons need data-driven statistical figures (a normal density, a
 * sampling distribution, a power curve) that read correctly in both themes.
 * Two constraints decide the shape of this script:
 *
 *   1. Course MDX compiles *at request time inside the Worker* (`dynamic: true`
 *      in source.config.ts), against a gzipped 10 MiB bundle ceiling. A chart
 *      library imported by an MDX component would land in that bundle, so the
 *      rendering happens here, at build time, and Plot never ships.
 *   2. Dark mode is a `.dark` class toggled at runtime, so a generated file
 *      referenced as `<img src="…svg">` could never follow the theme. The SVG
 *      is therefore *inlined* into the page and painted with `currentColor` +
 *      `var(--ds-chart-*)` tokens (see charts/_theme.mjs).
 *
 * ── Caching: one coarse gate, not per-chart hashing ─────────────────────────
 *
 * Unlike `build-images.mjs` (seconds per artifact, so it caches per slug and
 * commits its outputs), rendering a chart costs ~5 ms; 60 of them is ~0.3 s.
 * The only expensive part is importing Plot (~1.3 s), so the gate's job is to
 * return *before* that import when nothing changed.
 *
 * The digest covers every file in `charts/` (specs and shared helpers alike),
 * Plot's version, and this script, and is stored in the generated module. Any
 * edit re-renders everything, which is both cheaper and safer than per-file
 * hashing: a spec that imports `_theme.mjs` would silently go stale under
 * per-file hashing when only the helper changed.
 *
 * Alongside the markup, each entry carries `usedBy`: the lessons whose MDX
 * contains its `<Chart>` tag, so the admin gallery can link a figure back to
 * the page it appears on without reading the corpus at request time.
 *
 * Output: `lib/generated/charts.js` (gitignored; its committed `.d.ts` sibling
 * types it so typecheck/lint pass on a fresh checkout). Runs from `dev`,
 * `build`, and `postinstall`, so the file always exists before typecheck.
 *
 * Idempotent, and deterministic: the same specs always produce byte-identical
 * SVG, so re-running never churns. Specs using random data must draw from the
 * seeded `rng()`/`normalSamples()` helpers in charts/_theme.mjs.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHARTS_DIR = join(ROOT, "charts");
const CONTENT_DIR = join(ROOT, "content");
const OUT_FILE = join(ROOT, "lib", "generated", "charts.js");

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
 * Where each chart is used: slug → [{ url, title, collection }].
 *
 * The gallery's whole job is reviewing a figure in context, so it needs a way
 * back to the lesson. Building the index here (rather than in the page) keeps
 * the app from reading ~800 MDX files at request time inside the Worker, which
 * is the same reason the charts themselves are rendered at build time.
 *
 * The scan is a regex over `<Chart slug="…"`, not an MDX parse: the tag is
 * written by hand in a lesson body and that is the entire surface. A chart
 * rendered through a variable slug would be missed, and would show as unused.
 */
function chartUsages() {
  const usages = {};
  for (const [collection, base] of Object.entries(ROUTE_BASES)) {
    const dir = join(CONTENT_DIR, collection);
    for (const file of mdxFiles(dir)) {
      const src = readFileSync(file, "utf8");
      const slugs = [...src.matchAll(/<Chart\s[^>]*slug="([^"]+)"/g)].map((m) => m[1]);
      if (slugs.length === 0) continue;

      // content/<collection>/<…>/<page>.mdx → <base>/<…>/<page>, with `index`
      // collapsing to its parent, exactly as Fumadocs's loader routes it.
      const rel = file.slice(dir.length + 1).replace(/\.mdx$/, "");
      const path = rel === "index" ? "" : rel.replace(/(^|\/)index$/, "");
      const url = path ? `${base}/${path}` : base;
      const title = src.match(/^title:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, "");

      for (const slug of new Set(slugs)) {
        (usages[slug] ??= []).push({ url, title: title ?? url, collection });
      }
    }
  }
  for (const list of Object.values(usages)) list.sort((a, b) => a.url.localeCompare(b.url));
  return usages;
}

/**
 * Digest of everything that can change the rendered output: every file in
 * `charts/`, Plot's version, and this script's own bytes (the post-processing
 * below is part of the output, so editing it must re-render — hashing the file
 * removes the "remember to bump RENDERER_VERSION" step that would otherwise
 * silently ship stale charts).
 */
function computeDigest(files, usages) {
  const h = createHash("sha256")
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .update("\0")
    .update(plotVersion())
    // The usage index is part of the output, so placing a `<Chart>` in a new
    // lesson has to invalidate too, even though no spec changed.
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
 * Shrink and normalize the markup Plot produced.
 *
 * `--plot-background` is Plot's own token for label halos and tip backdrops
 * and defaults to a literal `white`, which would glow on the dark page; it
 * becomes a theme token. Coordinates get rounded to 2dp, which is well under
 * a device pixel at any width we render and cuts a dense path by ~5%.
 */
function postProcess(svg, slug) {
  const out = svg
    .replace(/--plot-background:\s*white;/g, "--plot-background: var(--ds-chart-surface);")
    .replace(/-?\d+\.\d{3,}/g, (n) => String(Number(Number(n).toFixed(2))));
  // Plot names each chart's scoped stylesheet `plot-<hash of its own CSS>`, so
  // two charts with identical styling would share a class — and any change to
  // Plot's stylesheet would rename every chart at once. Rename it after the
  // slug: unique per chart, stable across upgrades, and legible in devtools.
  const generated = out.match(/class="(plot-[a-z0-9]+)"/);
  return generated ? out.split(generated[1]).join(`ds-chart-${slug}`) : out;
}

/**
 * Reject any literal colour that survived into the output.
 *
 * A hex or rgb() fill is the one failure mode this pipeline can't catch
 * visually in review, because it looks right in whichever theme the author had
 * open and wrong in the other one. Fail the build instead.
 */
function literalColors(svg) {
  return [...svg.matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{3,8}|rgba?\([^"]*\))"/g)].map(
    (m) => m[1],
  );
}

const files = existsSync(CHARTS_DIR)
  ? readdirSync(CHARTS_DIR).filter((f) => f.endsWith(".mjs")).sort()
  : [];
const specs = files.filter(isSpec);
const usages = chartUsages();
const digest = computeDigest(files, usages);

if (priorDigest() === digest) {
  console.log(`build-charts: ${specs.length} chart(s) up to date`);
  process.exit(0);
}

const charts = {};
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

  const el = mod.render();
  const svg = postProcess(el.outerHTML, slug);

  const literal = literalColors(svg);
  if (literal.length > 0) {
    problems.push(
      `${file}: literal colour(s) ${[...new Set(literal)].join(", ")} — ` +
        "use the SERIES/PRIMARY/MUTED/ACCENT tokens from charts/_theme.mjs so " +
        "the chart reads in both themes",
    );
    continue;
  }

  charts[slug] = {
    title: mod.title,
    ...(mod.caption ? { caption: mod.caption } : {}),
    width: Number(el.getAttribute("width")),
    height: Number(el.getAttribute("height")),
    usedBy: usages[slug] ?? [],
    svg,
  };
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

const bytes = Object.values(charts).reduce((n, c) => n + c.svg.length, 0);
const orphans = Object.keys(charts).filter((slug) => charts[slug].usedBy.length === 0);
console.log(
  `build-charts: ${specs.length} chart(s) rendered ` +
    `(${(bytes / 1024).toFixed(0)} KB SVG) → lib/generated/charts.js`,
);
// Not an error: a spec is often written before the lesson that will carry it.
// Worth saying out loud, though, since an unplaced chart costs bundle bytes
// for nothing and a typo'd slug looks exactly like this.
if (orphans.length > 0) {
  console.log(`build-charts: not placed in any lesson yet: ${orphans.join(", ")}`);
}
