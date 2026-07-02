// Lints <MultipleChoice> blocks in content/courses + content/fumadocs-dev for the rules that keep
// every question answerable, non-contradictory, and neutrally worded:
//
//   1. no-correct          — every question must mark exactly one `- [o]`
//                            answer; a question with none is unwinnable.
//   2. multiple-correct    — the component is single-answer, so a question
//                            may not mark more than one `- [o]` choice.
//   3. too-few-choices     — a question needs at least 2 choices.
//   4. duplicate-choice    — no two choices may be verbatim identical.
//   5. affirmative-opener  — a choice explanation may not start with an
//                            affirmation ("Yes.", "Right!", "Exactly,",
//                            "This works"…). Explanations render for ALL
//                            choices after submit, so a learner who picked a
//                            wrong answer would still see false praise under
//                            the correct one (see AGENTS.md). True/False
//                            openers are allowed in "which is false/NOT
//                            true" questions, where they label each
//                            statement's truth value.
//
// Used both as a CLI (`node scripts/check-mcq.mjs [files...]`, defaults to
// all course + fumadocs-dev content) and as a library by __tests__/mcqContent.test.ts.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// --- extraction -----------------------------------------------------------

// Pull the contents of each `markdown={` ... `}` template literal, honoring
// escaped backticks (`\``) so code spans inside a choice don't end it early.
export function extractMcqBlocks(src) {
  const blocks = [];
  const marker = "markdown={`";
  let i = 0;
  for (;;) {
    const start = src.indexOf(marker, i);
    if (start === -1) break;
    let j = start + marker.length;
    let out = "";
    while (j < src.length) {
      const ch = src[j];
      if (ch === "\\") { out += src[j + 1]; j += 2; continue; } // unescape: `\`` -> `, `\\n` -> \n
      if (ch === "`") break;
      out += ch; j++;
    }
    blocks.push(out);
    i = j + 1;
  }
  return blocks;
}

// Parse one block into { body, choices:[{ correct, text, explanation }] }.
// Mirrors parseQuestion.ts closely enough for linting purposes.
export function parseChoices(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const choices = [];
  const bodyLines = [];
  let inFence = false;
  let seenChoice = false;
  for (const line of lines) {
    const choiceMatch = line.match(/^-\s+(?:\[(o|O| |x|X)\]\s+)?(.*)$/);
    const isFence = /^(`{3,}|~{3,})/.test(line.trim());
    if (choiceMatch && !inFence) {
      seenChoice = true;
      const marker = (choiceMatch[1] || "").toLowerCase();
      choices.push({ correct: marker === "o" || marker === "x", text: choiceMatch[2].trim(), explanation: "" });
      if (/^(`{3,}|~{3,})/.test(choiceMatch[2].trim())) inFence = true;
      continue;
    }
    if (isFence) { inFence = !inFence; if (!seenChoice) bodyLines.push(line); continue; }
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq && choices.length && !inFence) {
      const c = choices[choices.length - 1];
      c.explanation += (c.explanation ? "\n" : "") + bq[1];
    } else if (!seenChoice) {
      bodyLines.push(line);
    }
  }
  return { body: bodyLines.join("\n"), choices };
}

// --- affirmation rule -----------------------------------------------------

const AFFIRM_WORD =
  "(?:yes|yep|yeah|right|correct|exactly|perfect|great|nice|indeed|absolutely|bingo|spot on|well done|good job|nailed it|you got it|that'?s right|this works|true|false)";
// Praise = the word immediately followed by sentence punctuation, a spaced
// dash, or end-of-string. This deliberately does NOT match adjective uses
// like "Right child…", "Correct implementations…", "True is-a…", "Exactly 3…".
export const AFFIRM = new RegExp(`^(${AFFIRM_WORD})([.!,:;?]|\\s+[—–]|\\s*$)`, "i");

// A "select the statement that is false/incorrect/NOT true" question, where a
// "True." / "False." opener legitimately labels each statement's truth value.
export function isSelectFalse(body) {
  // Strip markdown emphasis/code markers so "**not** true" reads as "not true".
  const t = body.replace(/[*_`]/g, " ").replace(/\s+/g, " ");
  return (
    /\bfalse\b|\bincorrect\b|\buntrue\b|\bnot\s+true\b|\bnot\s+correct\b/i.test(t) ||
    /\bNOT\b|\bEXCEPT\b|\bFALSE\b/.test(t)
  );
}

// Rewrite an affirmative opener to a neutral statement, or return null if the
// explanation needs no change (or can't be mechanically fixed — e.g. it is
// ONLY the affirmation, or a True/False label in a select-the-false question).
export function rewriteOpener(content, { selectFalse = false } = {}) {
  const m = content.match(AFFIRM);
  if (!m) return null;
  const word = m[1].toLowerCase();
  if (word === "true" || word === "false") return null; // leave truth-value labels alone
  let rest = content.slice(m[0].length).replace(/^\s+/, "");
  if (!rest) return null; // explanation was only the affirmation — needs a human
  rest = rest.replace(/^([a-z])/, (c) => c.toUpperCase());
  return rest;
}

// --- linting --------------------------------------------------------------

export function lintSource(src, file) {
  const violations = [];
  for (const md of extractMcqBlocks(src)) {
    const { body, choices } = parseChoices(md);
    const stem = (body.split("\n").find((l) => l.trim()) || "").trim().slice(0, 70);
    const add = (rule, detail) => violations.push({ file, rule, detail });

    if (choices.length < 2) add("too-few-choices", `${choices.length} choice(s) — ${stem}`);
    const correctCount = choices.filter((c) => c.correct).length;
    if (correctCount === 0) add("no-correct", stem);
    else if (correctCount > 1) add("multiple-correct", `${correctCount} correct — ${stem}`);

    const seen = new Set();
    for (const c of choices) {
      const key = c.text.replace(/\s+/g, " ").trim();
      if (!key || /^(`{3,}|~{3,})/.test(key)) continue;
      if (seen.has(key)) add("duplicate-choice", `"${c.text.slice(0, 48)}" — ${stem}`);
      seen.add(key);
    }

    const selectFalse = isSelectFalse(body);
    for (const c of choices) {
      const ex = c.explanation.trim();
      const m = ex.match(AFFIRM);
      if (!m) continue;
      const word = m[1].toLowerCase();
      if ((word === "true" || word === "false") && selectFalse) continue; // allowlisted
      add("affirmative-opener", `"${ex.slice(0, 56)}" — ${stem}`);
    }
  }
  return violations;
}

// Recursively collect .mdx files under `dir` that contain a <MultipleChoice>.
export function findMcqFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findMcqFiles(full));
    else if (entry.name.endsWith(".mdx") && readFileSync(full, "utf8").includes("<MultipleChoice")) out.push(full);
  }
  return out;
}

export function lintFiles(files) {
  return files.flatMap((f) => lintSource(readFileSync(f, "utf8"), f));
}

// --- CLI ------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const roots = [
    path.join(process.cwd(), "content", "courses"),
    path.join(process.cwd(), "content", "fumadocs-dev"),
  ];
  const files = args.length ? args : roots.flatMap((root) => findMcqFiles(root));
  const violations = lintFiles(files);
  if (violations.length) {
    const byRule = {};
    for (const v of violations) (byRule[v.rule] ??= []).push(v);
    for (const [rule, list] of Object.entries(byRule)) {
      console.error(`\n✗ ${rule} (${list.length}):`);
      for (const v of list.slice(0, 50)) console.error(`   ${fileURLToPath(pathToFileURL(v.file))}: ${v.detail}`);
      if (list.length > 50) console.error(`   …and ${list.length - 50} more`);
    }
    console.error(`\n${violations.length} MCQ violation(s) across ${files.length} file(s).`);
    process.exit(1);
  }
  console.log(`✓ all MCQ blocks in ${files.length} file(s) pass (exactly one correct answer, ≥2 distinct choices, neutral explanations)`);
}
