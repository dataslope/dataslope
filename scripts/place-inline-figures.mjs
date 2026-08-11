#!/usr/bin/env node
/**
 * Place the `course-inline` concept bands in their lessons.
 *
 * `wire-course-figures.mjs` deliberately will not do this. That script owns one
 * figure per page — the illustration standing for the whole lesson, placed
 * after the opening paragraph — and it leaves any `<Figure>` pointing at
 * another known prompt id alone precisely so these bands survive a re-wire.
 * This script owns the other kind: a risograph band that belongs beside the
 * paragraph it illustrates, somewhere down the page.
 *
 * Where a band goes, in the order the rules were learned:
 *
 *   1. **After the lesson's own opening figure.** Never above it. The lesson's
 *      illustration is the page's establishing shot.
 *
 *   2. **Past the first `## ` heading, when the page has one.** A band a
 *      paragraph below the opening illustration reads as a second opinion on
 *      the same picture. On `python-basics/lists` the two were literally the
 *      same idea twice — carts of blocks, then a rail of blocks, one paragraph
 *      apart. The first section introduces; the sections after it explain, and
 *      that is where a diagram earns its place. Moving 36 already-placed bands
 *      by this rule improved every one of them.
 *
 *   3. **Never straight after a paragraph ending in a colon.** That paragraph
 *      is a lead-in: the list, code block or table under it belongs to that
 *      sentence, and a figure dropped between them reads as the thing being
 *      introduced.
 *
 *   4. **Only in a section that explains something.** Not "Check your
 *      understanding", not "Challenge", not "Key takeaways" — see
 *      `ASSESSMENT`. Those sections score *well* on a band's own vocabulary,
 *      which is how 100 of the first 1,671 came to sit under a quiz.
 *
 *   5. **Never against another band, and never last on the page.** The old
 *      last-resort scan ignored both, which stacked 77 bands into 38 walls of
 *      art with no prose between them and left 84 more dangling under a
 *      multiple-choice block at the foot of a lesson.
 *
 * Rules 2, 4 and 5 are what a page *should* offer, and some pages offer none
 * of it. `anchorFor` gives them up one at a time, in order, rather than all at
 * once — see the pools there.
 *
 * Fenced code and JSX blocks are skipped when looking for prose, so a ```mermaid
 * diagram or a `<Callout>` body is never treated as a paragraph.
 *
 * Alt text is the prompt's `subject`, sentence-cased: the same description the
 * image was generated from, which is what keeps it true to the art. When a
 * subject is rewritten and the art redrawn, placement does *not* touch an
 * existing alt — the band is already on the page, and this leaves placed bands
 * alone. That is what `--audit` finds and `--fix-alt` repairs; a stale
 * description is worse than none, because a screen reader states it as fact.
 *
 * Idempotent: a band already on the page is left exactly where it is, so this
 * is safe to re-run after each wave of new art.
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
 *   --reflow       Lift every already-placed band and re-anchor it. Use after
 *                  changing where bands go; without it, placement leaves the
 *                  bands already on the page exactly where they are.
 *   --fix-alt      Rewrite those alt texts from their subjects. Rewording a
 *                  subject and redrawing its art leaves the old description on
 *                  the page, which is worse than none — this is the repair.
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
 * Per-line "fence" | "jsx" | null, mirroring how MDX reads them.
 *
 * Deliberately not `lib/mdx-regions.mjs`, which exempts the markdown containers
 * (`<Callout>` and friends) because a heading inside one is a real heading.
 * Placement wants the opposite: a Callout body is somebody's aside, not a place
 * to drop a band. Only the template-literal rule is shared, and it is shared
 * because getting it wrong put a band inside a runnable React sample.
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
 * Headings of sections that test or wrap up rather than explain.
 *
 * A band under "Check your understanding" is decoration. The reader is
 * answering questions there, and the multiple-choice block below it is what
 * the section is for; nothing in it is being explained, so a picture of the
 * mechanism has nothing to sit beside. 100 of the first 1,671 bands landed in
 * one of these, and 84 of those were the last thing on the page — a band
 * hanging under a quiz with no prose after it at all.
 *
 * They are excluded outright rather than scored down, because scoring is
 * exactly what sends bands here: a takeaways or challenge section restates the
 * lesson's vocabulary in concentrated form, so it beats the section that does
 * the actual teaching on the one signal the scorer has.
 *
 * Matched against the heading lowercased with its markdown stripped. The
 * anchors are deliberate: `^summary$` and not `^summary\b`, because
 * "Summary statistics by group" and "Summary functions and the `na.rm`
 * argument" are lessons teaching summary functions, not summaries of a lesson.
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
 * Content words from a figure's title, and only its title.
 *
 * The lesson slug was in here too and had to come out. On a page carrying
 * several figures — `real-world-disasters` has four — the slug is identical for
 * all of them, so every figure scored "real", "world" and "disasters" equally
 * across every section and the signal that separates them drowned. Heartbleed
 * landed in "How modern systems push back" rather than the section named after
 * it. The title alone is what distinguishes one band on a page from another.
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
 * The band goes in the section that actually discusses it, which is both more
 * useful to a reader and the thing that stops placement looking mechanical.
 *
 * The first version of this anchored every band to the first paragraph after
 * the first `## ` heading. That is a defensible rule and it produced a median
 * depth of 9%: 87% of 671 bands sat in the top fifth of their page and not one
 * sat below 70%. Every lesson opened with its illustration, a paragraph, and
 * then a band, over and over. Correct by the rule, and obviously formulaic on
 * the page.
 *
 * So sections are scored on how much of the figure's own vocabulary they carry
 * — its title and lesson slug, which speak the lesson's language, rather than
 * its subject, which speaks in rails and chutes and trays — and the band goes
 * to the best match. A heading hit counts triple: a section called "Outer
 * joins" is a stronger signal than one that mentions joins in passing.
 *
 * Two guards keep that honest. The opening section is excluded whenever a page
 * has three or more, because it belongs to the lesson's own illustration. And
 * when nothing scores at all — a page whose headings are "Exercises" and
 * "Recap" — the middle section is taken rather than defaulting to the top,
 * since an arbitrary choice may as well be an arbitrary choice that varies.
 */
export function anchorFor(lines, code, prompt) {
  // Past the lesson's own figure — the *first* one on the page. This used to
  // take the last, which was indistinguishable while a page held exactly one
  // figure and wrong the moment reflow ran against pages that already carried
  // bands: the floor jumped past every band on the page, leaving only the
  // sections below the last of them as candidates.
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
  // The opening section is held back for the lesson's own art, unless the band
  // is the thing that section is named after. `The debugging mindset` opens
  // `from-zero-to-cpp/debugging-and-reasoning`, and holding the band of that
  // name out of it left it under "Sanitizers", three sections past the
  // paragraph it belongs to. A heading hit is a strong enough signal to spend
  // the exception on; a body mention is not.
  const named = (s) => keywords.some((w) => s.heading.toLowerCase().includes(w));
  const past = all.length >= 3 && !named(all[0]) ? all.slice(1) : all;

  // Where a band may go, best first. The first pool is the rule; each one
  // after it gives up exactly one thing the rule asked for, and is reached
  // only when every pool above it is full or offers no paragraph. Ordering the
  // concessions is the whole point: the old single fallback swept the page
  // from `floor` down and so reached for the worst option first, putting 75
  // bands above the first heading, in among the lesson's own opening art.
  const pools = [
    // The rule: a section that teaches, below the one that opens the lesson.
    past.filter((s) => explains(s.heading)),
    // The section that opens the lesson, when nothing below it is free. It
    // reads as a second opinion on the establishing shot, which is a smaller
    // problem than a band stranded under the closing challenge.
    all.filter((s) => explains(s.heading)),
    // A lesson whose body runs on past the opening figure with no heading of
    // its own until "Challenge" (the whole of `intro-web-development`) has no
    // section to offer. Its lower half will do, and starting halfway is what
    // keeps the band clear of the art at the top.
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

  // Nothing but lead-ins: anchor past the block one of them introduces.
  //
  // The colon rule exists to keep the two together, and the far side of the
  // block does not come between them. Without this, a section written as
  // "sentence, then code, sentence, then code" — which is most of
  // `react-from-the-ground-up`, where every paragraph ends in a colon — offers
  // nowhere at all, and its band ends up under the closing challenge instead.
  // Second pass rather than a relaxed first one, so a section that does have a
  // free-standing paragraph still gets it.
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
 * Check that a placed band still describes the art it sits next to.
 *
 * Only the bands this script placed are checked, and they are the ones whose
 * id ends in `-inline`. The sixty historical figures carry alt text written by
 * hand — "A rocket veering off course seconds after launch, breaking apart
 * against a plain sky" rather than the generation prompt restated — because a
 * screen reader wants the scene, not the instruction that produced it. Holding
 * those to `alt === subject` reports sixty problems that are not problems.
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
    // An unterminated attribute is never rewritten automatically: the value has
    // already run on into whatever follows it, so the line below is not
    // necessarily the rest of the tag. That one gets looked at by hand.
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
