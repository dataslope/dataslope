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
 * `remark-mdx` attaches an ESTree to every expression attribute, so the values
 * inside `files={[{ starterCode: `…` }]}` and `markdown={`…`}` are read from
 * the parsed tree by property name rather than scraped with a regex. Property
 * keys are classified (see PROSE_KEYS / CODE_KEYS) so an instruction lands in
 * prose and a starter file lands in code.
 *
 * `<Chart>` is the exception: its caption is not in the MDX at all, it lives in
 * the generated chart manifest, so the slug is resolved against that.
 *
 * Output: `lib/generated/search-corpus.json` (gitignored), consumed by
 * `scripts/build-search-sql.mjs` to produce the D1 seed.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { structure } from "fumadocs-core/mdx-plugins";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

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

/** Prose the reader reads. Weighted as body text. */
const PROSE_KEYS = new Set([
  "instructions", "markdown", "title", "name", "description", "alt", "label",
  "caption", "prompt", "question", "explanation", "hint", "note",
]);

/** Code and identifiers. Indexed, but weighted well below prose. */
const CODE_KEYS = new Set([
  "starterCode", "initCode", "solutionCode", "code", "source", "schema",
  "setup", "filename", "sql", "html", "css", "js", "tsx", "jsx", "expected",
]);

/** Components whose attributes carry content worth indexing. Anything else
 *  (layout wrappers, demo components) contributes only its child prose, which
 *  `structure()` already collects. */
const CONTENT_COMPONENTS = new Set([
  "CodeBlock", "SqlCodeBlock", "ChallengeCard", "SqlChallengeCard",
  "MultipleChoice", "Chart", "Figure", "Callout", "Mermaid", "SvgLabel",
  "LivePreview", "ReactPreview", "IllustrationPrompt",
]);

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

/**
 * Pull every string out of an ESTree, tagged prose or code by the property key
 * that encloses it.
 *
 * A bare value (an attribute that is just a template literal, like
 * `markdown={`…`}`) inherits `fallback`, which the caller sets from the
 * attribute's own name.
 */
function harvestEstree(node, fallback, out, key = fallback) {
  if (!node || typeof node !== "object") return;

  if (node.type === "TemplateLiteral") {
    const text = (node.quasis ?? []).map((q) => q.value?.cooked ?? "").join(" ");
    if (text.trim()) out[key === "code" ? "code" : "prose"].push(text);
    // Interpolations can hold strings too.
    for (const e of node.expressions ?? []) harvestEstree(e, fallback, out, key);
    return;
  }
  if (node.type === "Literal") {
    if (typeof node.value === "string" && node.value.trim()) {
      out[key === "code" ? "code" : "prose"].push(node.value);
    }
    return;
  }
  if (node.type === "Property") {
    const name = node.key?.name ?? node.key?.value;
    const next = CODE_KEYS.has(name) ? "code" : PROSE_KEYS.has(name) ? "prose" : key;
    harvestEstree(node.value, fallback, out, next);
    return;
  }

  for (const v of Object.values(node)) {
    if (Array.isArray(v)) for (const child of v) harvestEstree(child, fallback, out, key);
    else if (v && typeof v === "object" && typeof v.type === "string") {
      harvestEstree(v, fallback, out, key);
    }
  }
}

/** `remarkMath` is not decoration here. Without it, MDX reads the braces in
 *  `$$p_i = \frac{e^{z_i}}{…}$$` as a JSX expression and acorn rejects the
 *  file, which silently dropped 31 lessons from the previous index. The real
 *  render pipeline (source.config.ts) has always had it; the indexer did not. */
const processor = unified().use(remarkParse).use(remarkMath).use(remarkMdx);
const charts = loadChartManifest();

/**
 * Walk the MDX for everything `structure()` does not return: fenced code,
 * mermaid sources, and the content carried in component attributes. Each find
 * is attributed to the heading it sits under, matched to `structure()`'s
 * heading ids by document order.
 */
function extractComponents(body, headingIds) {
  const perHeading = new Map();
  let headingIndex = -1;

  const bucket = () => {
    const id = headingIndex >= 0 ? headingIds[headingIndex] : null;
    const k = id ?? "";
    if (!perHeading.has(k)) perHeading.set(k, { prose: [], code: [] });
    return perHeading.get(k);
  };

  let tree;
  try {
    tree = processor.parse(body);
  } catch {
    return perHeading;
  }

  visit(tree, (node) => {
    if (node.type === "heading") {
      headingIndex++;
      return;
    }
    // Fenced blocks, including ```mermaid diagram sources.
    if (node.type === "code") {
      if (node.value?.trim()) bucket().code.push(node.value);
      return;
    }
    if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;
    if (!CONTENT_COMPONENTS.has(node.name)) return;

    const out = bucket();

    for (const attr of node.attributes ?? []) {
      if (attr.type !== "mdxJsxAttribute") continue;
      const name = attr.name;

      // A plain string attribute: alt="…", title="…".
      if (typeof attr.value === "string") {
        if (CODE_KEYS.has(name)) out.code.push(attr.value);
        else if (PROSE_KEYS.has(name)) out.prose.push(attr.value);
        // `<Chart slug>` and `<Figure slug>` name an asset, not content, but a
        // chart's title and caption are real prose held in the manifest.
        else if (name === "slug" && node.name === "Chart") {
          const entry = charts[attr.value];
          if (entry?.title) out.prose.push(entry.title);
          if (entry?.caption) out.prose.push(entry.caption);
        }
        continue;
      }

      // An expression attribute: read its ESTree rather than its source text.
      const estree = attr.value?.data?.estree;
      const fallback = CODE_KEYS.has(name) ? "code" : "prose";
      if (estree) harvestEstree(estree, fallback, out, fallback);
      else if (typeof attr.value?.value === "string") {
        out[fallback].push(attr.value.value);
      }
    }
  });

  return perHeading;
}

const rows = [];
let files = 0;
let failed = 0;

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
    const components = extractComponents(body, headingIds);

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
  }
}

mkdirSync(dirname(OUT_FILE), { recursive: true });
const json = JSON.stringify(rows);
writeFileSync(OUT_FILE, json);

const proseChars = rows.reduce((n, r) => n + r.prose.length, 0);
const codeChars = rows.reduce((n, r) => n + r.code.length, 0);
console.log(
  `[search-corpus] ${files} lesson(s) → ${rows.length} section rows ` +
    `(${Math.round(proseChars / 1000)}k prose, ${Math.round(codeChars / 1000)}k code, ` +
    `${Math.round(json.length / 1024)} kB)${failed ? `, ${failed} unparsed` : ""}`,
);
