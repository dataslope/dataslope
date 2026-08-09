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
 *   --fix-alt      Rewrite those alt texts from their subjects. Rewording a
 *                  subject and redrawing its art leaves the old description on
 *                  the page, which is worse than none — this is the repair.
 *   -h, --help     Show this help
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;

function parseArgs(argv) {
  const opts = { write: false, only: null, audit: false, fixAlt: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--write": opts.write = true; break;
      case "--only": opts.only = new Set(String(argv[++i]).split(",").filter(Boolean)); break;
      case "--audit": opts.audit = true; break;
      case "--fix-alt": opts.audit = true; opts.fixAlt = true; break;
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

/** Per-line "fence" | "jsx" | null, mirroring how MDX reads them. */
export function regions(lines) {
  const out = new Array(lines.length).fill(null);
  let fence = null;
  let tag = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence !== null) {
      out[i] = "fence";
      if (line.trimStart().startsWith(fence)) fence = null;
      continue;
    }
    if (tag !== null) {
      out[i] = "jsx";
      if (/^\s*\/>/.test(line) || new RegExp(`^\\s*</${tag}>`).test(line)) tag = null;
      continue;
    }
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (f) { out[i] = "fence"; fence = f[1]; continue; }
    const t = /^<([A-Z]\w*)/.exec(line);
    if (t) {
      out[i] = "jsx";
      if (!/\/>\s*$/.test(line) && !new RegExp(`</${t[1]}>\\s*$`).test(line)) tag = t[1];
    }
  }
  return out;
}

const isProse = (line) =>
  line.trim() !== "" && !/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\||:)/.test(line);

const altFor = (prompt) => prompt.subject.charAt(0).toUpperCase() + prompt.subject.slice(1);

/**
 * The line index to insert at, or -1 when the page offers no anchor.
 *
 * `floor` is where scanning starts: past the lesson's own figure, and past the
 * first `## ` heading when there is one.
 */
export function anchorFor(lines, code) {
  let floor = 0;
  for (let i = 0; i < lines.length; i++) {
    if (code[i] === "jsx" && lines[i].includes("<Figure")) {
      while (i < lines.length && !/^\s*\/>/.test(lines[i])) i++;
      floor = i + 1;
    }
  }
  const heading = lines.findIndex((l, i) => !code[i] && /^##\s/.test(l));
  if (heading > floor) floor = heading + 1;

  let paragraphs = 0;
  for (let i = floor; i < lines.length; i++) {
    if (code[i] || !isProse(lines[i])) continue;
    let j = i;
    while (j + 1 < lines.length && lines[j + 1].trim() !== "" && !code[j + 1]) j++;
    if (lines[j].trimEnd().endsWith(":")) { i = j; continue; }
    paragraphs++;
    if (paragraphs >= (floor > 0 ? 1 : 2)) return j + 1;
    i = j;
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
  for (const p of prompts) {
    if (!drawn.has(p.id)) continue;
    const file = `content/courses/${p.course}/${p.lesson}.mdx`;
    const src = readFileSync(file, "utf8");
    if (src.includes(`${p.id}-cutout`)) { already++; continue; }

    const lines = src.split("\n");
    const at = anchorFor(lines, regions(lines));
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
      `, ${already} already on the page` +
      (stuck.length ? `, ${stuck.length} without an anchor:\n   ${stuck.join("\n   ")}` : ""),
  );
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
export { ROOT };
