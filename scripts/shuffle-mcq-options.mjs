// Rewrites the choice order of authored `<MultipleChoice>` blocks so the
// correct answer is spread evenly across the option slots.
//
// The corpus grew a strong positional tell: the correct option sat second in
// 61% of questions overall and in 99% of the interview banks, which makes the
// whole bank guessable without reading a word. This script permutes the choice
// blocks in place, moving each option's `[o]` marker, continuation lines and
// `>` explanation with it, so only the order on the page changes.
//
// The permutation is **content-addressed**: the target slot and the order of
// the distractors are both derived from a hash of the question (its body plus
// its choice texts, sorted, so the key does not depend on the current order).
// Re-running the script is therefore a no-op, and a question keeps its layout
// across runs unless the author edits it.
//
//   node scripts/shuffle-mcq-options.mjs --dry-run     # report, write nothing
//   node scripts/shuffle-mcq-options.mjs               # rewrite in place
//   node scripts/shuffle-mcq-options.mjs path/to.mdx   # limit to some files
//
// Questions whose options are order-dependent are left untouched, and the
// reason is reported under `--dry-run`: "all of the above" style options, text
// that points at another option by position ("the first choice"), and answer
// sets that read as a sorted numeric sequence.
//
// Every rewrite is verified before it is kept: the block is re-parsed and the
// set of (text, explanation, correct) triples must match the original exactly,
// with the correct option at the intended slot. A block that fails is skipped
// rather than written.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { findMcqFiles, parseChoices } from "./check-mcq.mjs";

// --- source spans ---------------------------------------------------------

/** Unescape a raw template-literal line for classification only (`\`` -> `` ` ``).
 *  The raw line is what gets written back, never this. */
const unescapeLine = (line) => line.replace(/\\(.)/g, "$1");

/** Spans of every ``markdown={` … `}`` literal: `start`/`end` bracket the raw
 *  source between the backticks. Mirrors `extractMcqBlocks`'s escape handling
 *  so both see the same block boundaries. */
function anchoredSpans(src, marker) {
  const spans = [];
  let i = 0;
  for (;;) {
    const at = src.indexOf(marker, i);
    if (at === -1) break;
    const start = at + marker.length;
    let j = start;
    while (j < src.length) {
      if (src[j] === "\\") {
        j += 2;
        continue;
      }
      if (src[j] === "`") break;
      j++;
    }
    spans.push({ start, end: j });
    i = j + 1;
  }
  return spans;
}

/** Bare template literals after `from`, used for the homepage hero's
 *  `CONCEPT_QUESTIONS` array, which stores the same markdown without the
 *  `markdown={` prop wrapper. */
function literalSpans(src, from) {
  const spans = [];
  let i = from;
  while (i < src.length) {
    if (src[i] === "`") {
      const start = i + 1;
      let j = start;
      while (j < src.length) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === "`") break;
        j++;
      }
      spans.push({ start, end: j });
      i = j + 1;
      continue;
    }
    i++;
  }
  return spans;
}

/** The MCQ blocks in one file, whichever container it uses. */
export function mcqSpans(src, file) {
  if (file.endsWith(".mdx")) return anchoredSpans(src, "markdown={`");
  const at = src.indexOf("CONCEPT_QUESTIONS");
  if (at === -1) return [];
  return literalSpans(src, at).filter((s) =>
    /^-\s+\[[oOxX]\]\s/m.test(src.slice(s.start, s.end)),
  );
}

// --- block structure ------------------------------------------------------

const FENCE_OPEN = /^(`{3,}|~{3,})/;
const FENCE_CLOSE = /^(`{3,}|~{3,})\s*$/;
const CHOICE_START = /^-\s+(?:\[([oOxX ])\]\s+)?/;

/**
 * Split one block's raw text into the question body, the choice blocks (each
 * carrying its own continuation lines and `>` explanation), the blank-line
 * separators between them, and the trailing overall explanation.
 *
 * Follows the same line rules as `parseQuestion.ts` so a rebuilt block parses
 * back to the same question. Returns null when the block has no choices.
 */
export function splitBlock(raw) {
  const lines = raw.split("\n");
  const head = [];
  const blocks = [];
  const seps = [];
  const tail = [];

  let state = "head";
  let inFence = false;
  let pending = [];
  let cur = null;

  const flushInto = (target) => {
    target.push(...pending);
    pending = [];
  };

  for (const line of lines) {
    const text = unescapeLine(line);
    const trimmed = text.trim();

    if (state !== "tail" && !inFence && CHOICE_START.test(line)) {
      if (cur) {
        blocks.push(cur);
        seps.push(pending);
        pending = [];
      } else {
        flushInto(head);
      }
      state = "choices";
      const marker = (line.match(CHOICE_START)[1] || "").toLowerCase();
      cur = { lines: [line], correct: marker === "o" || marker === "x" };
      if (FENCE_OPEN.test(trimmed.replace(CHOICE_START, ""))) inFence = true;
      continue;
    }

    if (state === "head") {
      flushInto(head);
      head.push(line);
      continue;
    }

    if (state === "choices") {
      if (inFence) {
        flushInto(cur.lines);
        cur.lines.push(line);
        if (FENCE_CLOSE.test(trimmed)) inFence = false;
        continue;
      }
      if (trimmed === "") {
        pending.push(line);
        continue;
      }
      // A blockquote attaches to the current choice even across a blank line,
      // an indented continuation only when it follows the choice directly.
      const isQuote = /^\s*>/.test(text);
      const isContinuation = /^ {2,}\S/.test(line) && pending.length === 0;
      if (isQuote || isContinuation) {
        flushInto(cur.lines);
        cur.lines.push(line);
        if (FENCE_OPEN.test(trimmed)) inFence = true;
        continue;
      }
      // Anything else at column 0 closes the choices block.
      state = "tail";
      flushInto(tail);
      tail.push(line);
      continue;
    }

    flushInto(tail);
    tail.push(line);
  }

  if (cur) blocks.push(cur);
  else return null;
  // Blank lines left over at the very end belong to the tail.
  tail.push(...pending);

  return { head, blocks, seps, tail };
}

/** Rebuild a block's raw text with the choice blocks in `order`. Separators
 *  and every other line keep their position, so an identity `order` reproduces
 *  the input byte for byte. */
export function joinBlock({ head, blocks, seps, tail }, order) {
  const out = [...head];
  order.forEach((idx, slot) => {
    out.push(...blocks[idx].lines);
    if (slot < order.length - 1) out.push(...(seps[slot] ?? []));
  });
  out.push(...tail);
  return out.join("\n");
}

// --- order-dependent questions --------------------------------------------

/** "All of the above" and friends: the option's meaning is its position. */
const ABOVE =
  /\b(all|none|both|any|either|neither)\s+of\s+(the\s+)?(above|these|those|the\s+other\s+options)\b/i;

/** Text that points at another option by where it sits. */
const POSITIONAL =
  /\b(first|second|third|fourth|fifth|last|final|previous|preceding|former|latter)\s+(option|choice|answer|one)s?\b|\b(option|choice)\s+(one|two|three|four|[A-D]|\d)\b/i;

/** A choice that is nothing but a number, so a set of them can read as a
 *  deliberately sorted sequence. */
function numericValue(text) {
  const bare = text.replace(/[`*_\s]/g, "").replace(/,/g, "");
  return /^-?\d+(\.\d+)?%?$/.test(bare) ? parseFloat(bare) : null;
}

function isSortedNumeric(texts) {
  const values = texts.map(numericValue);
  if (values.some((v) => v === null) || values.length < 3) return false;
  const up = values.every((v, i) => i === 0 || v > values[i - 1]);
  const down = values.every((v, i) => i === 0 || v < values[i - 1]);
  return up || down;
}

/** Why this question must keep its authored order, or null if it may move. */
export function skipReason(body, choices) {
  if (choices.length < 2) return "too-few-choices";
  if (choices.filter((c) => c.correct).length !== 1) return "not-one-correct";
  const texts = choices.map((c) => c.text);
  if (texts.some((t) => ABOVE.test(t))) return "refers-to-options-above";
  const everything = [body, ...texts, ...choices.map((c) => c.explanation)].join("\n");
  if (POSITIONAL.test(everything)) return "refers-to-an-option-by-position";
  if (isSortedNumeric(texts)) return "sorted-numeric-answers";
  return null;
}

// --- permutation ----------------------------------------------------------

const norm = (text) => unescapeLine(text).replace(/\s+/g, " ").trim();
const hashInt = (key) =>
  parseInt(createHash("sha1").update(key).digest("hex").slice(0, 12), 16);

/**
 * The slot order for one question's choice blocks, derived from the question's
 * content rather than its current layout: the same question always lands the
 * same way, so the script is idempotent and a rerun produces no diff.
 */
export function plannedOrder(blocks) {
  const text = (b) => norm(b.lines.join("\n"));
  // Sorting the choice texts into the key is what makes it order-independent.
  const key = blocks.map(text).sort().join("");
  const correct = blocks.findIndex((b) => b.correct);
  const target = hashInt(key) % blocks.length;

  const distractors = blocks
    .map((b, i) => i)
    .filter((i) => i !== correct)
    .sort((a, b) => {
      const ka = hashInt(`${key}${text(blocks[a])}`);
      const kb = hashInt(`${key}${text(blocks[b])}`);
      return ka - kb || text(blocks[a]).localeCompare(text(blocks[b]));
    });

  const order = new Array(blocks.length);
  order[target] = correct;
  let next = 0;
  for (let slot = 0; slot < order.length; slot++) {
    if (slot !== target) order[slot] = distractors[next++];
  }
  return order;
}

// --- rewriting ------------------------------------------------------------

/** Compare two parses as unordered sets, so only the layout may differ. */
function sameQuestion(a, b) {
  const key = (choices) =>
    choices
      .map((c) => `${c.correct ? "*" : "-"}${norm(c.text)}${norm(c.explanation)}`)
      .sort()
      .join("");
  return a.body === b.body && key(a.choices) === key(b.choices);
}

/** Rewrite every block in one file. Returns the new source plus per-question
 *  outcomes, and never returns a source whose questions changed content. */
export function rewriteSource(src, file) {
  const spans = mcqSpans(src, file);
  const stats = { moved: 0, unchanged: 0, skipped: [], failed: [] };
  let out = "";
  let cursor = 0;

  for (const span of spans) {
    const raw = src.slice(span.start, span.end);
    const before = parseChoices(unescapeLine(raw));
    const stem = (before.body.split("\n").find((l) => l.trim()) || "").trim().slice(0, 60);
    const split = splitBlock(raw);
    const reason = split ? skipReason(before.body, before.choices) : "unparsed";

    let next = raw;
    if (!reason) {
      const order = plannedOrder(split.blocks);
      const candidate = joinBlock(split, order);
      const after = parseChoices(unescapeLine(candidate));
      const correctAt = after.choices.findIndex((c) => c.correct);
      const expected = order.indexOf(split.blocks.findIndex((b) => b.correct));
      if (sameQuestion(before, after) && correctAt === expected) {
        next = candidate;
        if (candidate === raw) stats.unchanged++;
        else stats.moved++;
      } else {
        stats.failed.push(stem);
      }
    } else {
      stats.skipped.push({ reason, stem });
    }

    out += src.slice(cursor, span.start) + next;
    cursor = span.end;
  }

  out += src.slice(cursor);
  return { source: out, stats };
}

/** Every file the script covers by default: the two learner-facing corpora
 *  plus the homepage hero, which stores the same markdown without the
 *  `markdown={` wrapper.
 *
 *  `content/fumadocs-dev` is deliberately out of scope. It documents the
 *  authoring syntax by pairing each rendered `<MultipleChoice>` with a
 *  ````markdown fence showing its source, and only the rendered half sits in a
 *  template literal, so a rewrite would leave the two halves disagreeing. */
export function defaultFiles(root = process.cwd()) {
  const roots = ["courses", "interview"].map((d) => path.join(root, "content", d));
  return [
    ...roots.flatMap((dir) => findMcqFiles(dir)),
    path.join(root, "app", "_components", "home", "challenges.ts"),
  ];
}

// --- CLI ------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose");
  const files = args.filter((a) => !a.startsWith("--"));
  const targets = files.length ? files.map((f) => path.resolve(f)) : defaultFiles();

  let moved = 0;
  let unchanged = 0;
  let written = 0;
  const skipped = [];
  const failed = [];

  for (const file of targets) {
    const src = readFileSync(file, "utf8");
    const { source, stats } = rewriteSource(src, file);
    moved += stats.moved;
    unchanged += stats.unchanged;
    for (const s of stats.skipped) skipped.push({ file, ...s });
    for (const s of stats.failed) failed.push({ file, stem: s });
    if (source !== src) {
      written++;
      if (!dryRun) writeFileSync(file, source);
    }
  }

  const byReason = {};
  for (const s of skipped) (byReason[s.reason] ??= []).push(s);
  for (const [reason, list] of Object.entries(byReason)) {
    console.log(`- skipped ${list.length} question(s): ${reason}`);
    if (verbose) {
      for (const s of list) {
        console.log(`    ${path.relative(process.cwd(), s.file)}: ${s.stem}`);
      }
    }
  }
  if (failed.length) {
    console.error(`\n✗ ${failed.length} block(s) failed verification and were left alone:`);
    for (const f of failed.slice(0, 20)) {
      console.error(`   ${path.relative(process.cwd(), f.file)}: ${f.stem}`);
    }
  }
  console.log(
    `\n${dryRun ? "[dry run] would rewrite" : "rewrote"} ${moved} question(s) ` +
      `across ${written} file(s); ${unchanged} already in place, ` +
      `${skipped.length} order-dependent, ${targets.length} file(s) scanned.`,
  );
  if (failed.length) process.exit(1);
}
