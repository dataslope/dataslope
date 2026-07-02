#!/usr/bin/env node
/**
 * Generate the server-side search index behind `/api/search`.
 *
 * Why this exists:
 *
 * Fumadocs's default `createFromSource(source)` builds an Orama "advanced"
 * index at request time by reading each lesson's MDX from disk (the docs
 * collections run in `dynamic` mode — see `source.config.ts`). On Cloudflare
 * Workers there is no filesystem at request time, so that route 500s. Even
 * setting that aside, the advanced index is ~54 MB (≈35k heading/section
 * documents) — far past the 25 MB Workers-asset limit and too large to hold
 * in a Worker's 128 MB memory.
 *
 * Instead we precompute, at build time, a compact per-page input array and
 * bundle it into the Worker. The route builds a lightweight Orama "simple"
 * index (one document per page) from it on cold start and answers queries
 * server-side — the index is never shipped to the browser. The bundled input
 * is ~3.7 MB (~1.35 MB gzipped); the built simple index lives only in Worker
 * memory.
 *
 * What gets indexed: prose only. We extract structured data with Fumadocs's
 * `remark-structure`, restricted to `heading`/`paragraph`/`blockquote`/
 * `tableCell` nodes. That deliberately EXCLUDES the heavy, non-prose pieces —
 * fenced code blocks, inline `<svg>` graphics, ```mermaid``` charts, and the
 * self-closing MDX components (`<ChallengeCard>`, `<CodeBlock>`,
 * `<SqlChallengeCard>`, `<SqlCodeBlock>`, `<MultipleChoice>`, `<Mermaid>`,
 * `<SvgLabel>`), whose code/option attributes would otherwise dominate (and
 * pollute) the index. Prose nested inside container components such as
 * `<Steps>` is still captured via its paragraph nodes.
 *
 * Output: `lib/generated/search-index.js` (an `export default [...]` module,
 * gitignored; its committed `.d.ts` sibling gives it a type without forcing
 * tsc to deep-infer the multi-MB literal). Runs from `dev`, `build`, and
 * `postinstall`, so the file always exists before typecheck/lint/build.
 *
 * Idempotent. The index reflects content at the time it ran, so restart
 * `next dev` (or run `npm run build:search-index`) to pick up edits.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { structure } from "fumadocs-core/mdx-plugins";
import remarkMdx from "remark-mdx";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// Indexed sections: content directory → URL base. Courses and the dev-only
// component gallery both render the Fumadocs search dialog, so both are
// indexed (the dev pages were part of the old content/learn tree too).
const SECTIONS = [
  { dir: join(ROOT, "content", "courses"), base: "/courses" },
  { dir: join(ROOT, "content", "fumadocs-dev"), base: "/fumadocs-dev" },
];
const OUT_FILE = join(ROOT, "lib", "generated", "search-index.js");

// Index prose nodes only; omit `mdxJsxFlowElement` (the self-closing
// components) and code/svg/mermaid (never in this list to begin with).
const STRUCTURE_OPTIONS = {
  types: ["heading", "paragraph", "blockquote", "tableCell"],
};

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

/** `course/lesson.mdx` → `<base>/course/lesson`; `index` collapses away. */
function lessonUrl(base, rel) {
  const stem = rel.replace(/\.mdx?$/i, "").replace(/(^|\/)index$/i, "");
  return stem ? `${base}/${stem}` : base;
}

/** Course title from `<sectionDir>/<slug>/meta.json`, if present. */
const metaTitleCache = new Map();
function courseTitle(sectionDir, slug) {
  const key = join(sectionDir, slug);
  if (metaTitleCache.has(key)) return metaTitleCache.get(key);
  let title;
  try {
    const meta = JSON.parse(readFileSync(join(sectionDir, slug, "meta.json"), "utf8"));
    if (typeof meta.title === "string" && meta.title) title = meta.title;
  } catch {
    // No meta.json — leave breadcrumbs empty.
  }
  metaTitleCache.set(key, title);
  return title;
}

/**
 * Last-resort plain-text extraction for the rare lesson whose MDX the
 * structure pipeline can't parse: strip code fences, components, and inline
 * code, leaving prose-ish text so the page is still searchable by title/body.
 */
function plainTextFallback(body) {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[A-Za-z][\s\S]*?\/>/g, " ")
    .replace(/<([A-Za-z][\w]*)[\s\S]*?>[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const docs = [];
let fellBack = 0;

for (const { dir, base } of SECTIONS) {
  for (const rel of walk(dir)) {
    const raw = readFileSync(join(dir, rel), "utf8");
    const { body, fm } = splitFrontmatter(raw);

    let content;
    try {
      const sd = structure(body, [remarkMdx], STRUCTURE_OPTIONS);
      content = [
        ...sd.headings.map((h) => h.content),
        ...sd.contents.map((c) => c.content),
      ].join("\n");
    } catch {
      content = plainTextFallback(body);
      fellBack++;
    }

    const url = lessonUrl(base, rel);
    const nested = rel.includes("/");
    const slug = nested ? rel.split("/")[0] : rel.replace(/\.mdx?$/i, "");
    const title = frontmatterField(fm, "title") ?? slug;
    const crumb = nested ? courseTitle(dir, slug) : undefined;

    docs.push({
      url,
      title,
      description: frontmatterField(fm, "description") ?? "",
      breadcrumbs: crumb ? [crumb] : [],
      content,
      keywords: "",
    });
  }
}

mkdirSync(dirname(OUT_FILE), { recursive: true });
const json = JSON.stringify(docs);
writeFileSync(OUT_FILE, `export default ${json};\n`);

console.log(
  `[search-index] wrote lib/generated/search-index.js — ${docs.length} pages ` +
    `(${Math.round(json.length / 1024)} kB${fellBack ? `, ${fellBack} via text fallback` : ""})`,
);
