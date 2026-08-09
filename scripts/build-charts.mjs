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
 * Display name of the course or track a lesson belongs to, which is the
 * `title` in the top-level directory's meta.json (the same string the site's
 * own navigation shows). Falls back to the directory name so a collection
 * without one still labels its links.
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
      // A malformed meta.json is the site's problem to report, not this
      // script's; fall through to the directory name.
    }
  }
  return top;
}

/**
 * Where each chart is used: slug → [{ url, title, section, collection }].
 *
 * The gallery's whole job is reviewing a figure in context, so it needs a way
 * back to the lesson, and `section` names the course it belongs to so a link
 * reading "Histograms" is not ambiguous across thirty-odd courses. Building the
 * index here (rather than in the page) keeps the app from reading ~800 MDX
 * files at request time inside the Worker, which is the same reason the charts
 * themselves are rendered at build time.
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
  // Grouped by course, then by lesson: a chart used four times in one course
  // and once in another should not interleave them.
  for (const list of Object.values(usages)) {
    list.sort(
      (a, b) =>
        (a.section ?? "").localeCompare(b.section ?? "") || a.title.localeCompare(b.title),
    );
  }
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
    // Round long decimals to 2dp, which halves the file with no visible effect
    // on a path or a transform. Scoped to attribute values: applied to the
    // whole document it also rewrites *text content*, so a label reading
    // "t* = 1.645" would silently ship as "1.65".
    .replace(/="([^"]*)"/g, (m, value) =>
      value.includes(".")
        ? `="${value.replace(/-?\d+\.\d{3,}/g, (n) => String(Number(Number(n).toFixed(2))))}"`
        : m,
    );
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

/**
 * Reject a function that leaked into an SVG attribute.
 *
 * Several Plot options that read like channels are constants: `textAnchor`,
 * `dx`, `dy`, `strokeDasharray`. Handing one a function neither throws nor
 * falls back — Plot stringifies it into the attribute, so the output carries
 * `text-anchor="(d) => …"`, the renderer discards the invalid value, and every
 * label quietly reverts to its default. That is invisible in a spec review and
 * subtle enough in a rendered chart (labels that look a little off rather than
 * obviously broken) to ship. Fail the build instead; `sidedText()` in
 * charts/_theme.mjs is the supported way to vary anchoring per row.
 */
function stringifiedFunctions(svg) {
  return [...svg.matchAll(/([a-zA-Z-]+)="[^"]*=>[^"]*"/g)].map((m) => m[1]);
}

/**
 * Count `<text>` elements that rendered with nothing in them.
 *
 * Almost always a tick whose label was thrown away. On a `type: "log"` scale
 * d3 formats only the values it considers nice for the base, and returns an
 * empty string for the rest — *including* values handed to it explicitly
 * through `ticks`, and regardless of any `tickFormat` the spec supplies. So
 * `ticks: [1, 16, 256, 4096, 65536]` on a base-10 log axis draws five ticks
 * and labels two, with no warning from Plot and nothing wrong-looking in the
 * spec. The fix is `base: 2` when the ticks are powers of two, or ticks that
 * are powers of ten when they are not.
 *
 * A spec never has a reason to draw an empty string, so the check needs no
 * exceptions: any empty text element is a label that went missing.
 */
function emptyLabels(svg) {
  return [...svg.matchAll(/<text\b[^>]*>(?:<tspan\b[^>]*>\s*<\/tspan>)*<\/text>/g)].length;
}

/**
 * The narrowest width this chart can be drawn at before its smallest label
 * stops being readable.
 *
 * An inlined chart is responsive the cheap way: `width: 100%` on an SVG with a
 * viewBox scales the whole drawing, type included. That is fine down to a
 * point and then it is not. A 680px chart in a 358px phone column renders at
 * 0.53x, which turns a 13px axis tick into 6.9px and a 9px annotation into
 * 4.8px — present, and unreadable. The page never overflows and the chart
 * looks fine in a screenshot, so nothing about it announces itself as broken.
 *
 * A single global floor would be wrong, because how far a chart can shrink
 * depends on what it drew: a spec whose smallest type is a 13px tick has far
 * more room than one carrying 9px annotations inside a facet grid. The build
 * already has the answer in the markup, so it computes the floor per chart
 * and the stylesheet enforces it, and specs stay unaware of any of it.
 *
 * Below `MIN_LEGIBLE_PX` the chart stops scaling and its container scrolls
 * instead, which is the same bargain a wide table makes.
 */
/**
 * The smallest type a spec may author.
 *
 * Not a style preference: it is the input to the floor below. A chart is one
 * fixed drawing scaled to whatever column it lands in, so its smallest label
 * decides how far it can shrink, and a single 9px annotation drags the whole
 * chart's floor up by 65px of forced horizontal scrolling on a phone. 10px is
 * where the library already sits (224 of 250 specs bottom out there), so
 * holding the line costs nothing and keeps one chart's stray small label from
 * making that chart worse than its neighbours for no benefit anyone chose.
 *
 * A spec whose *subject* is unreadably small type exports `smallTypeAllowed`
 * with a reason, the same escape hatch `literalColorsAllowed` offers when the
 * colours are the data.
 */
const MIN_AUTHORED_PX = 10;

function undersizedType(svg) {
  return [...svg.matchAll(/font-size[=:]\s*"?([0-9.]+)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n < MIN_AUTHORED_PX);
}

const MIN_LEGIBLE_PX = 8.5;

/** Below this the floor is not worth publishing: the chart already fits the
 *  narrowest phone column with room to spare. */
const IGNORE_BELOW_PX = 340;

function legibleMinWidth(svg, width, smallTypeAllowed = false) {
  const sizes = [...svg.matchAll(/font-size[=:]\s*"?([0-9.]+)/g)].map((m) =>
    Number(m[1]),
  );
  if (sizes.length === 0) return 0;
  // A spec that exempted itself from the authoring floor drew type it *wants*
  // illegible. Sizing the chart from that type is the wrong bargain twice
  // over: the drawing is pinned at full width, forcing the most horizontal
  // scrolling of anything in the library, in order to protect labels whose
  // whole point is that they cannot be read. Size it from the floor every
  // other spec is held to, so the type a reader is meant to read is safe and
  // the chart shrinks like its neighbours.
  const smallest = smallTypeAllowed
    ? Math.max(MIN_AUTHORED_PX, Math.min(...sizes))
    : Math.min(...sizes);
  // Scaling the SVG scales its type by the same factor, so a label of
  // `smallest` px renders at `smallest * (w / width)`. Solve that for the w
  // where it reaches the floor. Never ask for more than the chart's own
  // width: at 1x every label is already the size the spec chose.
  const floor = Math.min(width, Math.ceil((width * MIN_LEGIBLE_PX) / smallest));
  return floor <= IGNORE_BELOW_PX ? 0 : floor;
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

  // A spec may opt out of the literal-colour guard, but only by exporting a
  // reason, which lands in the failure message of any future spec that copies
  // the pattern without one. The single legitimate case is a chart whose
  // subject *is* a set of specific colours (a colour-map comparison), where
  // the role tokens would change the very thing being shown. Such a chart
  // does not follow the page theme, which is correct: the swatches are data.
  const literal = mod.literalColorsAllowed ? [] : literalColors(svg);
  if (mod.literalColorsAllowed && typeof mod.literalColorsAllowed !== "string") {
    problems.push(
      `${file}: literalColorsAllowed must be a string explaining why this ` +
        "chart's colours cannot come from the theme tokens",
    );
    continue;
  }
  if (literal.length > 0) {
    problems.push(
      `${file}: literal colour(s) ${[...new Set(literal)].join(", ")} — ` +
        "use the SERIES/PRIMARY/MUTED/ACCENT tokens from charts/_theme.mjs so " +
        "the chart reads in both themes (or export literalColorsAllowed with " +
        "a reason, which is only right when the colours are the subject)",
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
    width,
    height: Number(el.getAttribute("height")),
    // Omitted when the chart can shrink to any width without a label falling
    // under the legibility floor, so the common case costs nothing.
    ...(minWidth ? { minWidth } : {}),
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
