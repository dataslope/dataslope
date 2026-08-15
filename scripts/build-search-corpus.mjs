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
 * Output: `lib/generated/search-corpus.json` (gitignored), consumed by
 * `scripts/build-search-sql.mjs` to produce the D1 seed.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
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
 * Chart titles/captions live in the generated manifest, so this step must run
 * AFTER `build:charts` (hence its position in the `build` chain). A missing or
 * empty manifest silently drops all of them from the index, so it warns
 * loudly — but stays non-fatal, since running this script standalone before
 * charts is legitimate.
 */
function loadChartManifest() {
  const path = join(ROOT, "lib", "generated", "charts.js");
  // Workers load the manifest too, and a missing one would print the same
  // warning once per thread. The main thread has already said it by then.
  const warn = (why) =>
    isMainThread &&
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

/**
 * One lesson → its rows, in the order the corpus stores them.
 *
 * Pure with respect to the lesson: same file, same chart manifest, same rows.
 * That is what makes the work safe to hand to a worker thread below — and it
 * is why the row-shaping logic lives here rather than inline in a loop.
 */
function rowsForLesson({ dir, base, collection, rel }, charts) {
  const rows = [];
  let failed = 0;
  let componentRows = 0;

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

  return { rows, failed, componentRows };
}

/**
 * Render a batch of lessons to the JSON *fragments* the corpus is assembled
 * from — one string per lesson, each the comma-joined bodies of its rows.
 *
 * Serialising here rather than in the main thread is deliberate. A worker that
 * returned row objects would pay a structured clone of ~24 MB of text, and the
 * main thread would then re-serialise all of it; returning finished JSON makes
 * the hand-back one string per lesson and the final write a `join`.
 */
function renderLessons(jobs, charts) {
  const parts = [];
  const stats = { failed: 0, componentRows: 0, rowCount: 0, proseChars: 0, codeChars: 0 };
  for (const job of jobs) {
    const { rows, failed, componentRows } = rowsForLesson(job, charts);
    stats.failed += failed;
    stats.componentRows += componentRows;
    const encoded = [];
    for (const row of rows) {
      encoded.push(JSON.stringify(row));
      stats.rowCount++;
      stats.proseChars += row.prose.length;
      stats.codeChars += row.code.length;
    }
    parts.push(encoded.join(","));
  }
  return { parts, stats };
}

// ── Worker entry ────────────────────────────────────────────────────────────
//
// This file is its own worker script (`new Worker(import.meta.url)`), so the
// set of files the freshness gate has to watch stays exactly what it was. A
// separate worker module would be a second input to remember, and forgetting
// it would mean a change to the extraction never invalidating the corpus.
if (!isMainThread) {
  parentPort.postMessage(renderLessons(workerData.jobs, loadChartManifest()));
} else {
  // Parsing ~900 lessons through remark is the single most expensive step in
  // `dev` and `build` — 24 seconds serial, every run, for an answer that only
  // changes when a lesson (or the chart manifest it reads captions from) does.
  // The gate costs about 10 ms; see scripts/lib/build-cache.mjs for why it is
  // stat-first.
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
  const jobs = SECTIONS.flatMap(({ dir, base, collection }) =>
    walk(dir).map((rel) => ({ dir, base, collection, rel })),
  );

  // A worker costs ~0.5 s to start and re-import remark/fumadocs-core, so the
  // pool only earns its keep on a corpus of real size. Below the threshold —
  // and on a single-core machine — the main thread does the work itself, which
  // also keeps `npm run build:search-corpus` honest on an empty checkout.
  const POOL = Math.min(Math.max(1, availableParallelism() - 1), 8);
  const workers = jobs.length >= 64 ? POOL : 1;

  // Round-robin, not contiguous slices. Lessons are walked in directory order
  // and a course's lessons resemble each other in size, so contiguous chunks
  // hand one worker a long course and another a short one; striping mixes the
  // sizes and the threads finish together. Order is restored below from each
  // chunk's original indices, so the output is byte-identical either way.
  const chunks = Array.from({ length: workers }, () => []);
  const indices = Array.from({ length: workers }, () => []);
  jobs.forEach((job, i) => {
    chunks[i % workers].push(job);
    indices[i % workers].push(i);
  });

  const runWorker = (chunk) =>
    new Promise((resolve, reject) => {
      const worker = new Worker(fileURLToPath(import.meta.url), {
        workerData: { jobs: chunk },
      });
      worker.once("message", resolve);
      worker.once("error", reject);
      worker.once("exit", (code) => {
        if (code !== 0) reject(new Error(`[search-corpus] worker exited with code ${code}`));
      });
    });

  const results =
    workers > 1
      ? await Promise.all(chunks.map(runWorker))
      : [renderLessons(chunks[0], charts)];

  // Reassemble in walk order: the corpus is compared byte-for-byte by the
  // build cache downstream, so a run that shuffled rows would look like a
  // content change and re-seed D1 for nothing.
  const parts = new Array(jobs.length);
  const totals = { failed: 0, componentRows: 0, rowCount: 0, proseChars: 0, codeChars: 0 };
  results.forEach((result, c) => {
    result.parts.forEach((part, k) => {
      parts[indices[c][k]] = part;
    });
    for (const key of Object.keys(totals)) totals[key] += result.stats[key];
  });

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  const json = `[${parts.filter(Boolean).join(",")}]`;
  writeFileSync(OUT_FILE, json);
  cache.commit();

  console.log(
    `[search-corpus] ${jobs.length} lesson(s) → ${totals.rowCount} rows ` +
      `(${totals.componentRows} component rows, ${Math.round(totals.proseChars / 1000)}k prose, ` +
      `${Math.round(totals.codeChars / 1000)}k code, ${Math.round(json.length / 1024)} kB` +
      `, ${workers} thread${workers === 1 ? "" : "s"})` +
      `${totals.failed ? `, ${totals.failed} unparsed` : ""}`,
  );
}
