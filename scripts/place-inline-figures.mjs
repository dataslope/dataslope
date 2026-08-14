#!/usr/bin/env node
/**
 * Place the `course-inline` concept bands in their lessons.
 * `wire-course-figures.mjs` owns the one figure per page after the opening
 * paragraph and deliberately leaves these alone; this script owns the bands
 * that belong beside the paragraph they illustrate, somewhere down the page.
 *
 * Placement rules:
 *   1. After the lesson's own opening figure, never above it.
 *   2. Past the first `## ` heading — the first section introduces, the
 *      sections after it explain.
 *   3. Never straight after a paragraph ending in a colon (a lead-in owns
 *      the block under it).
 *   4. Only in a section that explains something (see `ASSESSMENT`).
 *   5. Never against another band, and never last on the page.
 * Rules 2, 4 and 5 are given up one at a time when a page offers nothing
 * better — see the pools in `anchorFor`. Fenced code and JSX blocks are never
 * treated as prose.
 *
 * Alt text is the prompt's `subject`, sentence-cased. Placement never touches
 * an existing alt; `--audit` finds stale ones and `--fix-alt` repairs them.
 * Idempotent: a band already on the page is left where it is.
 *
 * Usage:
 *   node scripts/place-inline-figures.mjs [--write] [--only a,b,c]
 *   node scripts/place-inline-figures.mjs --audit
 *
 * Options:
 *   --write        Apply the changes (default: report only)
 *   --only <ids>   Comma-separated prompt ids to consider
 *   --audit        Report placed bands whose alt text no longer matches its
 *                  prompt subject, and any that are unterminated; write nothing
 *   --reflow       Lift every already-placed band and re-anchor it; without
 *                  it, placement leaves placed bands where they are
 *   --fix-alt      Rewrite stale alt texts from their subjects
 *   -h, --help     Show this help
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { backticks } from "./lib/mdx-regions.mjs";

const ROOT = new URL("..", import.meta.url).pathname;

function parseArgs(argv) {
  const opts = { write: false, only: null, audit: false, fixAlt: false, reflow: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--write": opts.write = true; break;
      case "--only": opts.only = new Set(String(argv[++i]).split(",").filter(Boolean)); break;
      case "--audit": opts.audit = true; break;
      case "--fix-alt": opts.audit = true; opts.fixAlt = true; break;
      case "--reflow": opts.reflow = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        console.error(`Unknown argument: ${argv[i]}`);
        process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(
    src.slice(src.indexOf("/**"), src.indexOf("*/") + 2)
      .replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "")
      .trim(),
  );
}

/**
 * Per-line "fence" | "jsx" | null. Deliberately not `lib/mdx-regions.mjs`,
 * which exempts markdown containers like `<Callout>` — placement wants the
 * opposite: a Callout body is an aside, not a place to drop a band. Only the
 * template-literal rule is shared.
 */
export function regions(lines) {
  const out = new Array(lines.length).fill(null);
  let fence = null;
  let tag = null;
  let literal = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence !== null) {
      out[i] = "fence";
      if (line.trimStart().startsWith(fence)) fence = null;
      continue;
    }
    if (tag !== null) {
      out[i] = "jsx";
      const odd = backticks(line) % 2 === 1;
      if (literal) {
        if (!odd) continue;
        literal = false;
        const tail = line.slice(line.lastIndexOf("`") + 1);
        if (/\/>/.test(tail) || new RegExp(`</${tag}>`).test(tail)) tag = null;
        continue;
      }
      if (odd) { literal = true; continue; }
      if (/^\s*\/>/.test(line) || new RegExp(`^\\s*</${tag}>`).test(line)) tag = null;
      continue;
    }
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (f) { out[i] = "fence"; fence = f[1]; continue; }
    const t = /^<([A-Z]\w*)/.exec(line);
    if (t) {
      out[i] = "jsx";
      if (!/\/>\s*$/.test(line) && !new RegExp(`</${t[1]}>\\s*$`).test(line)) {
        tag = t[1];
        literal = backticks(line) % 2 === 1;
      }
    }
  }
  return out;
}

const isProse = (line) =>
  line.trim() !== "" && !/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\||:)/.test(line);

/**
 * Headings of sections that test or wrap up rather than explain. Excluded
 * outright rather than scored down: a takeaways or challenge section restates
 * the lesson's vocabulary in concentrated form, so it would out-score the
 * section that does the teaching. Matched against the heading lowercased with
 * markdown stripped; the anchors are deliberate — `^summary$`, not
 * `^summary\b`, because "Summary statistics by group" teaches summary
 * functions.
 */
const ASSESSMENT = [
  /^(check|test) your (understanding|knowledge)\b/,
  /^(a )?quick check\b/,
  /^concept check\b/,
  /^your turn\b/,
  /^practice\b/,
  /\bexercises?\b/,
  /\bchallenges?\b/,
  /^multiple[- ]choice/,
  /^try it\b/,
  /^key takeaways?\b/,
  /^summary$/,
  /^recap\b/,
  /^where to go next\b/,
  /^course outline\b/,
  /^what you('ll|'ve| will| can| have| should| just| now)\b/,
  /^a closing thought\b/,
];

/** Does this section teach something, or does it only test and summarise? */
export function explains(heading) {
  const text = heading.replace(/^#+\s*/, "").replace(/[`*_]/g, "").trim().toLowerCase();
  return !ASSESSMENT.some((re) => re.test(text));
}

/** Is a band already sitting in this section? */
const occupied = (lines, section) =>
  lines.slice(section.start, section.end).some((l) => /slug="[a-z0-9-]+-cutout"/.test(l));

const altFor = (prompt) => prompt.subject.charAt(0).toUpperCase() + prompt.subject.slice(1);

/** Words too common to say anything about which section a figure belongs to. */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "your", "that", "this", "what",
  "when", "how", "why", "are", "its", "over", "under", "them", "they", "you",
  "first", "more", "than", "then", "each", "one", "two", "three", "data",
]);

/**
 * Content words from a figure's title, and only its title: on a page with
 * several figures the lesson slug is identical for all of them, so including
 * it drowned the signal that separates one band from another.
 */
function keywordsFor(prompt) {
  return [...new Set(
    prompt.title
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  )];
}

/** `## ` sections as {heading, start, end}, ignoring headings inside code. */
function sectionsOf(lines, code, floor) {
  const heads = [];
  for (let i = floor; i < lines.length; i++) {
    if (!code[i] && /^##\s/.test(lines[i])) heads.push(i);
  }
  if (!heads.length) return [{ heading: "", start: floor, end: lines.length }];
  return heads.map((start, k) => ({
    heading: lines[start],
    start,
    end: heads[k + 1] ?? lines.length,
  }));
}

/**
 * The line index to insert at, or -1 when the page offers no anchor.
 *
 * Sections are scored on how much of the figure's own vocabulary they carry
 * (a heading hit counts triple), so the band lands where it is discussed
 * instead of formulaically after the first heading. Two guards: the opening
 * section is excluded when a page has three or more (it belongs to the
 * lesson's own illustration), and when nothing scores the middle section is
 * taken rather than the top.
 */
export function anchorFor(lines, code, prompt) {
  // Past the *first* figure on the page — taking the last breaks reflow on
  // pages that already carry bands (the floor would jump past all of them).
  let floor = 0;
  for (let i = 0; i < lines.length; i++) {
    if (code[i] === "jsx" && lines[i].includes("<Figure")) {
      while (i < lines.length && !/^\s*\/>/.test(lines[i])) i++;
      floor = i + 1;
      break;
    }
  }

  const all = sectionsOf(lines, code, floor);
  const keywords = prompt ? keywordsFor(prompt) : [];
  // The opening section is held back for the lesson's own art, unless the
  // band is the thing that section is *named* after — a heading hit is a
  // strong enough signal to spend the exception on; a body mention is not.
  const named = (s) => keywords.some((w) => s.heading.toLowerCase().includes(w));
  const past = all.length >= 3 && !named(all[0]) ? all.slice(1) : all;

  // Where a band may go, best first. Each pool after the first gives up
  // exactly one thing the rule asks for, and is reached only when every pool
  // above it is full or offers no paragraph.
  const pools = [
    // The rule: a section that teaches, below the one that opens the lesson.
    past.filter((s) => explains(s.heading)),
    // The opening section, when nothing below it is free — a smaller problem
    // than a band stranded under the closing challenge.
    all.filter((s) => explains(s.heading)),
    // A page with no heading until "Challenge": its lower half, starting
    // halfway to stay clear of the art at the top.
    all[0] && all[0].start > floor
      ? [{ heading: "", start: Math.floor((floor + all[0].start) / 2), end: all[0].start }]
      : [],
  ];

  for (const pool of pools) {
    const free = pool.filter((s) => !occupied(lines, s));
    if (!free.length) continue;

    let best = null;
    let bestScore = 0;
    for (const section of free) {
      const heading = section.heading.toLowerCase();
      const body = lines.slice(section.start, section.end).join(" ").toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (heading.includes(word)) score += 3;
        const hits = body.split(word).length - 1;
        if (hits) score += Math.min(hits, 3);
      }
      if (score > bestScore) { bestScore = score; best = section; }
    }
    // Nothing scored: take the middle one rather than the top, so a page whose
    // headings say nothing about the art still varies where its band lands.
    if (!best) best = free[Math.floor(free.length / 2)];

    for (const section of [best, ...free]) {
      const at = anchorIn(lines, code, section, floor);
      if (at !== -1) return at;
    }
  }
  return -1;
}

/**
 * The line to insert at within one section, or -1 if it offers no paragraph.
 *
 * Two paragraphs are refused. One ending in a colon is a lead-in: the list,
 * code block or table under it belongs to that sentence. And the last
 * paragraph of the page is refused whatever it says, because a band inserted
 * after it is the final thing a learner scrolls past, with nothing left for it
 * to illustrate.
 */
function anchorIn(lines, code, section, floor) {
  const tail = lines.slice(section.end).some((l) => l.trim() !== "");
  const room = (at) =>
    lines.slice(at, section.end).some((l) => l.trim() !== "") || tail;

  for (let i = Math.max(section.start, floor); i < section.end; i++) {
    if (code[i] || !isProse(lines[i])) continue;
    let j = i;
    while (j + 1 < lines.length && lines[j + 1].trim() !== "" && !code[j + 1]) j++;
    if (lines[j].trimEnd().endsWith(":")) { i = j; continue; }
    if (!room(j + 1)) { i = j; continue; }
    return j + 1;
  }

  // Nothing but lead-ins: anchor past the block one of them introduces — the
  // far side of the block does not come between a lead-in and its block. A
  // second pass rather than a relaxed first one, so a section that does have
  // a free-standing paragraph still gets it.
  for (let i = Math.max(section.start, floor); i < section.end; i++) {
    if (code[i] || !isProse(lines[i])) continue;
    let j = i;
    while (j + 1 < lines.length && lines[j + 1].trim() !== "" && !code[j + 1]) j++;
    i = j;
    if (!lines[j].trimEnd().endsWith(":")) continue;
    let k = j + 1;
    while (k < section.end && lines[k].trim() === "") k++;
    if (k >= section.end || !code[k]) continue;
    while (k < section.end && code[k]) k++;
    if (room(k)) return k;
  }
  return -1;
}

/**
 * Check that a placed band still describes the art it sits next to. Only ids
 * ending in `-inline` are checked: the historical figures carry hand-written
 * alt text (the scene, not the generation prompt), and holding those to
 * `alt === subject` reports problems that are not problems.
 */
function audit(prompts, fix) {
  const problems = [];
  for (const p of prompts) {
    if (!p.id.endsWith("-inline")) continue;
    const file = `content/courses/${p.course}/${p.lesson}.mdx`;
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    const at = lines.findIndex((l) => l.includes(`slug="${p.id}-cutout"`));
    if (at === -1) continue;
    const alt = lines[at + 1] ?? "";
    // An unterminated attribute is never rewritten automatically: the value
    // has run on into whatever follows, so the next line may not be the tag.
    if (!/^\s+alt=".*"\s*$/.test(alt)) {
      problems.push(`${p.id}: alt attribute is not a single closed line`);
    } else if (alt !== `  alt="${altFor(p)}"`) {
      problems.push(`${p.id}: alt no longer matches its subject`);
      if (fix) {
        lines[at + 1] = `  alt="${altFor(p)}"`;
        writeFileSync(file, lines.join("\n"));
      }
    }
  }
  if (fix && problems.length) {
    console.log(`✓ realigned ${problems.length} alt text(s) with their subjects`);
    return 0;
  }
  console.log(problems.length ? `✗ ${problems.length} problem(s):\n   ${problems.join("\n   ")}`
    : `✓ every placed band's alt text matches the art it describes`);
  return problems.length ? 1 : 0;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();

  const data = JSON.parse(readFileSync("data/illustration-prompts.json", "utf8"));
  let prompts = data.prompts.filter((p) => p.category === "course-inline");
  if (opts.only) prompts = prompts.filter((p) => opts.only.has(p.id));
  if (opts.audit) process.exit(audit(prompts, opts.fixAlt));

  // Only place art that exists: a prompt whose image has not been promoted yet
  // would put a broken slug on the page.
  const drawn = new Set(
    readdirSync("public/images").filter((f) => f.endsWith("-cutout.webp"))
      .map((f) => f.replace("-cutout.webp", "")),
  );

  let placed = 0;
  let already = 0;
  const stuck = [];
  let moved = 0;
  for (const p of prompts) {
    if (!drawn.has(p.id)) continue;
    const file = `content/courses/${p.course}/${p.lesson}.mdx`;
    const src = readFileSync(file, "utf8");
    let lines = src.split("\n");

    if (src.includes(`${p.id}-cutout`)) {
      if (!opts.reflow) { already++; continue; }
      // Lift the band out — the `<Figure>` block and the blank line above it
      // that was inserted with it — so the anchor is chosen against the page as
      // it reads without it.
      const slug = lines.findIndex((l) => l.includes(`slug="${p.id}-cutout"`));
      let open = slug;
      while (open > 0 && !lines[open].startsWith("<Figure")) open--;
      let close = slug;
      while (close < lines.length && !/^\s*\/>/.test(lines[close])) close++;
      const from = open > 0 && lines[open - 1].trim() === "" ? open - 1 : open;
      const before = lines.slice(from, close + 1);
      lines.splice(from, close + 1 - from);

      const to = anchorFor(lines, regions(lines), p);
      if (to === -1) { stuck.push(`${p.id} (${file})`); continue; }
      lines.splice(to, 0, ...before);
      if (to === from) { already++; continue; }
      moved++;
      if (opts.write) writeFileSync(file, lines.join("\n"));
      continue;
    }

    const at = anchorFor(lines, regions(lines), p);
    if (at === -1) { stuck.push(`${p.id} (${file})`); continue; }

    placed++;
    if (opts.write) {
      lines.splice(at, 0, `\n<Figure\n  slug="${p.id}-cutout"\n  alt="${altFor(p)}"\n/>`);
      writeFileSync(file, lines.join("\n"));
    } else {
      console.log(`${p.id.padEnd(46)} after …${lines[at - 1].trim().slice(-56)}`);
    }
  }
  console.log(
    `\n${placed} band(s) ${opts.write ? "placed" : "would be placed"}` +
      (opts.reflow ? `, ${moved} ${opts.write ? "moved" : "would move"}` : "") +
      `, ${already} already in place` +
      (stuck.length ? `, ${stuck.length} without an anchor:\n   ${stuck.join("\n   ")}` : ""),
  );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
export { ROOT };
