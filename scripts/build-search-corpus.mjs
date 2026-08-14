#!/usr/bin/env node
/**
 * Build the full-text search corpus that backs `/api/search` (SQLite FTS5 on
 * D1; nothing is rebuilt at request time).
 *
 * Rows are sections, one per (page, heading), so hits carry `#anchor` links
 * and `snippet()` draws from the section that matched; content before the
 * first heading becomes a row with a null anchor (the page-level result).
 * Anchored components (lib/search/anchors.mjs) get a second, narrower row
 * whose anchor is the component's own DOM id — both sides derive identical
 * ids from the authored MDX (`remarkComponentAnchors`). The component's
 * content stays in the section row too; the near-duplicates are collapsed at
 * query time (lib/search/ranking.ts). An empty `heading` plus a non-empty
 * anchor identifies a component row.
 *
 * Prose and code are separate FTS5 columns so `bm25()` can weight them
 * independently — a match in prose must outrank a match in a code sample.
 * Component extraction lives in scripts/lib/search-extract.mjs.
 *
 * Output: lib/generated/search-corpus.json (gitignored), consumed by
 * scripts/build-search-sql.mjs to produce the D1 seed.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { structure } from "fumadocs-core/mdx-plugins";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import { freshness } from "./lib/build-cache.mjs";
import { extractComponents } from "./lib/search-extract.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Every indexed collection. `fumadocs-dev` stays out: it is noindex, and
 *  indexing it leaked component demos into the learner-facing dialog. */
const SECTIONS = [
  { dir: join(ROOT, "content", "courses"), base: "/courses", collection: "courses" },
  { dir: join(ROOT, "content", "interview"), base: "/interview-prep", collection: "interview" },
];

const OUT_FILE = join(ROOT, "lib", "generated", "search-corpus.json");

/**
 * Chart titles and captions live in the generated manifest, so this must run
 * *after* `build:charts`. Getting the order wrong is silently non-fatal — the
 * index just loses every chart caption — so an absent or empty manifest warns
 * loudly. Non-fatal because running this standalone before rendering charts
 * is legitimate.
 */
function loadChartManifest() {
  const path = join(ROOT, "lib", "generated", "charts.js");
  const warn = (why) =>
    console.warn(
      `[search-corpus] WARNING: ${why}. Chart titles and captions will be ` +
        "missing from this index. Run `npm run build:charts` first.",
    );

  if (!existsSync(path)) {
    warn("no chart manifest at lib/generated/charts.js");
    return {};
  }
  try {
    const src = readFileSync(path, "utf8");
    const start = src.indexOf("{");
    const end = src.lastIndexOf("}");
    if (start < 0 || end < 0) {
      warn("chart manifest is not parseable");
      return {};
    }
    const parsed = JSON.parse(src.slice(start, end + 1));
    if (Object.keys(parsed).length === 0) warn("chart manifest is empty");
    return parsed;
  } catch (err) {
    warn(`chart manifest failed to parse (${err.message})`);
    return {};
  }
}

/** Recursively collect lesson files, as /-separated paths relative to `dir`. */
function walk(dir, prefix = "") {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    else if (/\.mdx?$/i.test(entry.name)) out.push(rel);
  }
  return out.sort();
}

function splitFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  return m ? { body: raw.slice(m[0].length), fm: m[1] } : { body: raw, fm: "" };
}

function frontmatterField(fm, name) {
  const m = new RegExp(`^${name}:[ \\t]*(.+?)[ \\t]*$`, "m").exec(fm);
  if (!m) return undefined;
  return m[1].replace(/^(["'])(.*)\1$/, "$2").trim() || undefined;
}

function lessonUrl(base, rel) {
  const stem = rel.replace(/\.mdx?$/i, "").replace(/(^|\/)index$/i, "");
  return stem ? `${base}/${stem}` : base;
}

const metaTitleCache = new Map();
function sectionTitle(sectionDir, slug) {
  const key = join(sectionDir, slug);
  if (metaTitleCache.has(key)) return metaTitleCache.get(key);
  let title;
  try {
    const meta = JSON.parse(readFileSync(join(sectionDir, slug, "meta.json"), "utf8"));
    if (typeof meta.title === "string" && meta.title) title = meta.title;
  } catch {
    // no meta.json; breadcrumbs stay empty
  }
  metaTitleCache.set(key, title);
  return title;
}

// Parsing ~900 lessons through remark is ~26 s, the most expensive step in
// `dev`/`build`; the gate costs ~10 ms (see scripts/lib/build-cache.mjs).
const cache = freshness(ROOT, "search-corpus", {
  inputs: [
    fileURLToPath(import.meta.url),
    // The extractor and anchor-id scheme are inputs too, or rows drift from
    // the DOM ids the render pipeline emits.
    join(ROOT, "scripts", "lib", "search-extract.mjs"),
    join(ROOT, "lib", "search", "anchors.mjs"),
    join(ROOT, "lib", "generated", "charts.js"),
    ...SECTIONS.flatMap(({ dir }) => walk(dir).map((rel) => join(dir, rel))),
  ],
  outputs: [OUT_FILE],
});
if (cache.fresh) {
  console.log("[search-corpus] up to date (no lesson changed), skipping");
  process.exit(0);
}

const charts = loadChartManifest();
const rows = [];
let files = 0;
let failed = 0;
let componentRows = 0;

for (const { dir, base, collection } of SECTIONS) {
  for (const rel of walk(dir)) {
    files++;
    const raw = readFileSync(join(dir, rel), "utf8");
    const { body, fm } = splitFrontmatter(raw);

    const url = lessonUrl(base, rel);
    const nested = rel.includes("/");
    const slug = nested ? rel.split("/")[0] : rel.replace(/\.mdx?$/i, "");
    const pageTitle = frontmatterField(fm, "title") ?? slug;
    const description = frontmatterField(fm, "description") ?? "";
    const crumb = nested ? sectionTitle(dir, slug) : undefined;

    let sd;
    try {
      sd = structure(body, [remarkMath, remarkMdx], {
        types: ["heading", "paragraph", "blockquote", "tableCell"],
      });
    } catch {
      failed++;
      sd = { headings: [], contents: [] };
    }

    const headingIds = sd.headings.map((h) => h.id);
    const headingText = new Map(sd.headings.map((h) => [h.id, h.content]));
    const { perHeading: components, perComponent } = extractComponents(body, headingIds, charts);

    // Prose from structure(), grouped by the heading it sits under.
    const proseByHeading = new Map();
    for (const c of sd.contents) {
      const k = c.heading ?? "";
      if (!proseByHeading.has(k)) proseByHeading.set(k, []);
      proseByHeading.get(k).push(c.content);
    }

    const keys = new Set([...proseByHeading.keys(), ...components.keys(), ""]);
    for (const key of keys) {
      const comp = components.get(key) ?? { prose: [], code: [] };
      const prose = [...(proseByHeading.get(key) ?? []), ...comp.prose].join("\n");
      const code = comp.code.join("\n");
      if (!prose.trim() && !code.trim() && key !== "") continue;

      rows.push({
        url: key ? `${url}#${key}` : url,
        page: url,
        anchor: key || null,
        title: pageTitle,
        heading: key ? (headingText.get(key) ?? "") : "",
        description: key ? "" : description,
        section: crumb ?? "",
        collection,
        prose,
        code,
      });
    }

    // One narrow row per anchored component: the component's own id as the
    // anchor and an empty `heading` (how the API recognises these rows, and
    // it keeps heading words from matching once per component under it).
    for (const [anchor, comp] of perComponent) {
      const prose = comp.prose.join("\n");
      const code = comp.code.join("\n");
      if (!prose.trim() && !code.trim()) continue;
      componentRows++;
      rows.push({
        url: `${url}#${anchor}`,
        page: url,
        anchor,
        title: pageTitle,
        heading: "",
        description: "",
        section: crumb ?? "",
        collection,
        prose,
        code,
      });
    }
  }
}

mkdirSync(dirname(OUT_FILE), { recursive: true });
const json = JSON.stringify(rows);
writeFileSync(OUT_FILE, json);
cache.commit();

const proseChars = rows.reduce((n, r) => n + r.prose.length, 0);
const codeChars = rows.reduce((n, r) => n + r.code.length, 0);
console.log(
  `[search-corpus] ${files} lesson(s) → ${rows.length} rows ` +
    `(${componentRows} component rows, ${Math.round(proseChars / 1000)}k prose, ` +
    `${Math.round(codeChars / 1000)}k code, ${Math.round(json.length / 1024)} kB)` +
    `${failed ? `, ${failed} unparsed` : ""}`,
);
