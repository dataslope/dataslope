#!/usr/bin/env node
/**
 * Wire a course's MDX pages to their generated illustrations.
 *
 * Last step of authoring a course's art (see the "Illustrations" section of
 * AGENTS.md and agent-outputs/20260730-1200-illustration-pipeline-handoff.md):
 * once `data/illustration-prompts.json` has one `course-illustration` prompt per
 * lesson page, this places the matching `<Figure>` on every page so nothing is
 * missed by hand across a 30-page course.
 *
 * What it does per file, keyed on the prompt whose `lesson` matches the file
 * stem (`index.mdx` uses the course's `course-thumbnail` prompt instead):
 *
 *   - Drops any `<Figure>` pointing at a slug that is not a known prompt id.
 *     That is how retired art (the old risographs and one-off slugs) is cleared.
 *     A `<Figure>` already pointing at the right slug is left untouched.
 *   - Replaces the first inline `<svg>…</svg>` block with the `<Figure>` and
 *     deletes any further ones. Inline SVG is retired repo-wide; a course
 *     authored in the old style is converted in place. Pages that had two or
 *     three diagrams collapse to one figure, which is the ratio every course
 *     uses.
 *   - A page with no `<svg>` gets the `<Figure>` inserted after its opening
 *     prose paragraph.
 *
 * `index.mdx` heroes are placed right after the opening paragraph and carry
 * `priority`, since they are above the fold. Lesson figures are lazy.
 *
 * Alt text is the prompt's `subject`, sentence-cased — the same description the
 * image was generated from, which is what makes it accurate.
 *
 * Idempotent: re-running changes nothing. Always `--dry-run` first; it reports
 * exactly what would change and writes nothing.
 *
 * Fenced code blocks are never touched, so a ```mermaid diagram or an SVG shown
 * as example code is safe.
 *
 * Usage:
 *   node scripts/wire-course-figures.mjs <course...> [--dry-run]
 *   node scripts/wire-course-figures.mjs --all [--dry-run]
 *
 * Options:
 *   --all       Every directory under content/courses
 *   --dry-run   Report what would change; write nothing
 *   -h, --help  Show this help
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const COURSES_DIR = join(ROOT, "content", "courses");

// A whole inline <svg> element. No <svg> nests inside another here, so the
// non-greedy body is unambiguous.
const SVG_BLOCK = /[ \t]*<svg[\s>][\s\S]*?<\/svg>[ \t]*\n?/g;
// A self-closing <Figure …/>. JSX attribute blocks contain no ">", so this
// matches multi-line tags too.
const FIGURE_TAG = /[ \t]*<Figure\b[^>]*\/>[ \t]*\n?/g;
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
// Fenced code, masked before matching so nothing inside a fence is rewritten.
const FENCE = /```[\s\S]*?```/g;

/** Replace fenced-code spans with same-length blanks, preserving all offsets. */
function maskFences(src) {
  return src.replace(FENCE, (m) => " ".repeat(m.length));
}

/** Run `re` only over regions outside fenced code, returning the matches. */
function matchesOutsideFences(src, re) {
  const masked = maskFences(src);
  const out = [];
  for (const m of masked.matchAll(re)) out.push({ index: m.index, length: m[0].length });
  return out;
}

/** Apply cuts/replacements (descending by offset so earlier ones stay valid). */
function splice(src, edits) {
  let out = src;
  for (const e of [...edits].sort((a, b) => b.index - a.index)) {
    out = out.slice(0, e.index) + (e.text ?? "") + out.slice(e.index + e.length);
  }
  return out;
}

/** Alt text: the generation subject, sentence-cased and attribute-safe. */
function altFor(subject) {
  return (subject.charAt(0).toUpperCase() + subject.slice(1)).replace(/"/g, "&quot;");
}

function figureJsx(promptId, subject, { priority = false } = {}) {
  return (
    `<Figure\n  slug="${promptId}-cutout"\n  alt="${altFor(subject)}"\n` +
    (priority ? "  priority\n" : "") +
    `/>\n`
  );
}

/** Offset just past the first prose paragraph following any frontmatter. */
function afterIntro(src) {
  const fm = FRONTMATTER.exec(src);
  const start = fm ? fm[0].length : 0;
  const body = src.slice(start);
  const trimmed = body.replace(/^\s*\n+/, "");
  const lead = body.length - trimmed.length;
  const para = /\n[ \t]*\n/.exec(trimmed);
  return para ? start + lead + para.index + para[0].length : src.length;
}

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mdxFiles(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}

export function wireCourse(course, prompts, { dryRun = false } = {}) {
  const known = new Set(prompts.prompts.map((p) => p.id));
  const byLesson = new Map();
  let thumbnail = null;
  for (const p of prompts.prompts) {
    if (p.course !== course) continue;
    if (p.category === "course-thumbnail") thumbnail = p;
    else if (p.category === "course-illustration") byLesson.set(p.lesson, p);
  }

  const stats = { wired: 0, alreadyOk: 0, svgRemoved: 0, staleDropped: 0, noPrompt: [] };

  for (const file of mdxFiles(join(COURSES_DIR, course))) {
    const stem = basename(file).replace(/\.mdx?$/, "");
    const isIndex = stem === "index";
    const prompt = isIndex ? thumbnail : byLesson.get(stem);
    if (!prompt) {
      stats.noPrompt.push(stem);
      continue;
    }

    const before = readFileSync(file, "utf8");
    let src = before;
    const wantSlug = `${prompt.id}-cutout`;

    // 1. Drop <Figure> tags aimed at retired slugs; note an already-correct one.
    let alreadyRight = false;
    const drops = [];
    for (const hit of matchesOutsideFences(src, FIGURE_TAG)) {
      const tag = src.slice(hit.index, hit.index + hit.length);
      const slug = /\bslug="([^"]*)"/.exec(tag)?.[1] ?? "";
      if (slug === wantSlug) {
        alreadyRight = true;
      } else if (!known.has(slug.replace(/-cutout$/, ""))) {
        drops.push(hit);
        stats.staleDropped++;
      }
    }
    src = splice(src, drops);

    // 2. First inline <svg> becomes the figure; the rest are deleted.
    const svgs = matchesOutsideFences(src, SVG_BLOCK);
    stats.svgRemoved += svgs.length;
    const block = figureJsx(prompt.id, prompt.subject, { priority: isIndex });

    if (svgs.length) {
      src = splice(
        src,
        svgs.map((hit, i) => ({ ...hit, text: i === 0 && !alreadyRight ? block : "" })),
      );
      if (!alreadyRight) stats.wired++;
    } else if (!alreadyRight) {
      const at = afterIntro(src);
      src = `${src.slice(0, at)}${block}\n${src.slice(at)}`;
      stats.wired++;
    }

    if (alreadyRight) stats.alreadyOk++;

    // Collapse blank-line runs left by removals; keep exactly one trailing \n.
    src = src.replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
    if (src !== before && !dryRun) writeFileSync(file, src);
  }

  return stats;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(
    src
      .slice(src.indexOf("/**"), src.indexOf("*/") + 2)
      .replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "")
      .trim(),
  );
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) return printHelp();
  const dryRun = argv.includes("--dry-run");
  const courses = argv.includes("--all")
    ? readdirSync(COURSES_DIR).filter((d) => statSync(join(COURSES_DIR, d)).isDirectory())
    : argv.filter((a) => !a.startsWith("-"));
  if (!courses.length) return printHelp();

  const prompts = JSON.parse(
    readFileSync(join(ROOT, "data", "illustration-prompts.json"), "utf8"),
  );
  const total = { wired: 0, alreadyOk: 0, svgRemoved: 0, staleDropped: 0, noPrompt: 0 };

  for (const course of courses.sort()) {
    const s = wireCourse(course, prompts, { dryRun });
    total.wired += s.wired;
    total.alreadyOk += s.alreadyOk;
    total.svgRemoved += s.svgRemoved;
    total.staleDropped += s.staleDropped;
    total.noPrompt += s.noPrompt.length;
    console.log(
      `${course.padEnd(40)} ${String(s.wired).padStart(3)} wired · ${String(s.alreadyOk).padStart(3)} ok · ` +
        `${s.svgRemoved} svg · ${s.staleDropped} stale` +
        (s.noPrompt.length ? ` · NO PROMPT: ${s.noPrompt.join(",")}` : ""),
    );
  }

  console.log(
    `\nTOTAL: ${total.wired} wired, ${total.alreadyOk} already correct, ` +
      `${total.svgRemoved} svg removed, ${total.staleDropped} stale dropped, ` +
      `${total.noPrompt} page(s) with no prompt` +
      (dryRun ? "  [dry-run, nothing written]" : ""),
  );
  if (total.noPrompt) {
    console.log(
      "\nA page with no prompt got no figure. Author one course-illustration\n" +
        "prompt per lesson page (lesson = the file stem) and re-run.",
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
