#!/usr/bin/env node
/**
 * Build the full-text search corpus that backs `/api/search`.
 *
 * ── What changed and why ────────────────────────────────────────────────────
 *
 * The previous indexer fed an Orama "simple" index that the Worker rebuilt on
 * every cold isolate. That had two problems. The first was cost: parsing a
 * multi-megabyte JSON blob and tokenising every document is CPU paid again in
 * every data centre, after every deploy, forever, and it grows with the
 * content. The second was coverage: it restricted `remark-structure` to
 * `heading`/`paragraph`/`blockquote`/`tableCell`, which excludes
 * `mdxJsxFlowElement` wholesale. That was aimed at keeping code out of the
 * index, but it also threw out the *prose* those components carry, which
 * measured at 37% of everything a learner reads: every `<MultipleChoice>`
 * question and explanation, every `<ChallengeCard>` instruction. It also only
 * ever walked `content/courses`, so the whole interview-prep track was absent.
 *
 * This script indexes everything, into SQLite FTS5 on D1. Nothing is rebuilt
 * at request time.
 *
 * ── Rows are sections, not pages ────────────────────────────────────────────
 *
 * One row per (page, heading) rather than one per page. On lessons this long a
 * page-level hit tells a reader which of forty screens to start reading, which
 * is barely an answer. Section rows give `#anchor` links straight to the part
 * that matched, and they make `snippet()` useful, because the snippet is drawn
 * from the section that matched instead of from wherever in the page the
 * tokeniser happened to land. FTS5 does not care about the row count: ~11k
 * sections is nothing.
 *
 * Content before the first heading becomes a row with a null anchor, which is
 * the page-level result.
 *
 * ── …and one extra row per anchored component ───────────────────────────────
 *
 * A section row's anchor is its heading, but a `<MultipleChoice>` often sits
 * several screens below its heading, so a hit on quiz text used to land the
 * reader far above the text that matched. Anchored components (the set in
 * lib/search/anchors.mjs) therefore get a second, narrower row whose anchor is
 * the component's own DOM id (injected at render time by
 * `remarkComponentAnchors`; both sides derive identical ids from the authored
 * MDX). The component's content stays in the section row too, so queries whose
 * terms span a paragraph and a component keep matching; the resulting
 * near-duplicate entries are collapsed at query time in favour of the
 * component's anchor (lib/search/ranking.ts). Rows with an empty `heading`
 * column and a non-empty anchor are exactly these component rows.
 *
 * ── Prose and code are separate columns ─────────────────────────────────────
 *
 * Both are indexed, but a match in prose should outrank a match in a code
 * sample, or a search for a common identifier would bury the lesson that
 * explains it under every lesson that merely uses it. Splitting them into two
 * FTS5 columns lets `bm25()` weight them independently at query time, which is
 * the thing a single blob cannot do. It is also why indexing code is safe here
 * where it was not before.
 *
 * ── How component content is reached ────────────────────────────────────────
 *
 * See scripts/lib/search-extract.mjs (split out so the anchor-id contract is
 * testable against the render-side plugin).
 *
 * Output: `lib/generated/search-corpus.json` (gitignored), consumed by
 * `scripts/build-search-sql.mjs` to produce the D1 seed.
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

/** Every indexed collection. The previous indexer had only `courses`, which
 *  left 55 interview-prep lessons unsearchable. `fumadocs-dev` stays out: it
 *  is noindex + robots-disallowed, and indexing it leaked component demos into
 *  the learner-facing dialog. */
const SECTIONS = [
  { dir: join(ROOT, "content", "courses"), base: "/courses", collection: "courses" },
  { dir: join(ROOT, "content", "interview"), base: "/interview-prep", collection: "interview" },
];

const OUT_FILE = join(ROOT, "lib", "generated", "search-corpus.json");

/**
 * Chart titles and captions live in the generated manifest, not in the MDX, so
 * this step has to run *after* `build:charts` — which is why it sits where it
 * does in the `build` chain rather than up with the other content steps.
 *
 * Getting that order wrong is not fatal and that is exactly the problem: the
 * index simply comes out missing every chart title and caption, which was worth
 * 264 kB of prose across ~250 charts the first time it happened, with nothing
 * in the build log to say so. So an absent or empty manifest warns loudly now.
 * It stays non-fatal because running `build:search-corpus` on its own, before
 * ever rendering charts, is a legitimate thing to do.
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

// Parsing ~900 lessons through remark is the single most expensive step in
// `dev` and `build` — 26 seconds, every run, for an answer that only changes
// when a lesson (or the chart manifest it reads captions from) does. The gate
// costs about 10 ms; see scripts/lib/build-cache.mjs for why it is stat-first.
const cache = freshness(ROOT, "search-corpus", {
  inputs: [
    fileURLToPath(import.meta.url),
    // The extractor and the anchor-id scheme are inputs too: a change to
    // either must rebuild the corpus, or its rows drift from the DOM ids the
    // render pipeline emits.
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

    // One narrow row per anchored component: same page metadata, the
    // component's own id as the anchor, and an empty `heading` column (that
    // emptiness is how the API recognises these rows, and it keeps the
    // heading's words from matching once per component under it).
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
