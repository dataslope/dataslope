// Lints lesson content for code inside a Mermaid label that is not wrapped in
// a `<code>` tag (the renderer sets that span in the mono face — see
// mermaid.module.css); unmarked code reaches the reader in Inter next to the
// same identifier in JetBrains Mono.
//
// What counts as code — three shapes prose cannot produce by accident:
//   1. call        an identifier with `(` directly after it (`println(`);
//                  the absence of a space is the whole rule — prose asides
//                  always have one.
//   2. qualified   identifiers joined by dots, no spaces (`System.out`);
//                  a sentence's full stop is always followed by a space.
//                  Prose-y product names (`Node.js`) are in PROSE_NAMES.
//   3. snake_case  English does not use underscores.
// Bare CamelCase/lowercase words are deliberately NOT flagged — no test
// separates `Main` from `Editor`, so those stay the author's call.
//
// Class and ER diagrams are skipped (mermaid.tsx renders them wholly in mono;
// see `isCodeDiagram`). Only *label* text is read, never Mermaid syntax or
// node ids, which are never painted — `nodeLabels` keeps those apart. A label
// that wants the prose face opts out with
// `{/* allow-unmarked-code: why */}` on the line above the fence.
//
// Used as a CLI (`node scripts/check-mermaid-code.mjs [files...]`, defaults
// to content/) and as a library by __tests__/mermaidCode.test.ts.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
// Shared with check-prose.mjs and check-ascii-diagrams.mjs so the three
// linters agree on mermaid bounds.
import { mermaidLines } from "./check-prose.mjs";

/** Diagram kinds Mermaid renders wholesale in the mono face (`isCodeDiagram`
 *  in app/_components/mdx/mermaid.tsx). Nothing in one needs marking. */
const MONO_DIAGRAMS = new Set(["classDiagram", "classDiagram-v2", "erDiagram"]);

/** Lines whose text is a style or layout declaration rather than a label
 *  (`style A fill:#f9f`, `classDef box ...`, `direction TB`). */
const DIRECTIVE =
  /^\s*(style|classDef|class|click|linkStyle|direction|dateFormat|axisFormat|accTitle|accDescr)\b/;

/** Diagram kinds where a colon introduces free text that runs to the end of
 *  the line: a sequence message, a note, a state description, a timeline
 *  event, a pie slice. In a flowchart it means nothing of the sort. Mirrors
 *  COLON_LABEL_DIAGRAMS in check-prose.mjs, minus the two mono kinds. */
const COLON_LABEL_DIAGRAMS = new Set([
  "sequenceDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "timeline",
  "journey",
  "pie",
]);

/** Kinds that draw boxes with bracketed labels. */
const SHAPE_DIAGRAMS = new Set([
  "flowchart",
  "flowchart-elk",
  "graph",
  "mindmap",
  "stateDiagram",
  "stateDiagram-v2",
  "block-beta",
]);

const OPENERS = "[({";
const CLOSERS = { "[": "]", "(": ")", "{": "}" };

/**
 * The label text of every bracketed node on one line.
 *
 * Mermaid spells a dozen shapes with the same three bracket pairs stacked in
 * different combinations (`[text]`, `([text])`, `[[text]]`, `[(text)]`,
 * `((text))`, `{{text}}`, `[/text/]`, `[\text\]`), so this walks the
 * delimiters rather than trying to name each shape in a pattern. An opening
 * run has to sit directly after an id character, which is what stops a
 * parenthesis inside prose from opening a phantom node.
 */
function nodeLabels(line) {
  const labels = [];
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    // The asymmetric shape `A>text]` does not nest. The preceding character
    // must be an id character, NOT a hyphen — the `>` ending every `-->` link
    // would otherwise swallow the rest of the line.
    if (ch === ">" && i > 0 && /\w/.test(line[i - 1])) {
      const end = line.indexOf("]", i);
      if (end === -1) continue;
      labels.push(line.slice(i + 1, end));
      i = end;
      continue;
    }

    if (!OPENERS.includes(ch)) continue;
    if (i === 0 || !/\w/.test(line[i - 1])) continue;

    let open = i;
    while (open + 1 < line.length && OPENERS.includes(line[open + 1])) open++;
    const depth = open - i + 1;

    const stack = [];
    for (let k = i; k <= open; k++) stack.push(CLOSERS[line[k]]);

    let k = open + 1;
    for (; k < line.length; k++) {
      const c = line[k];
      if (OPENERS.includes(c)) stack.push(CLOSERS[c]);
      else if (stack[stack.length - 1] === c && stack.pop() && stack.length === 0) break;
    }
    if (stack.length) break; // unbalanced: the rest of the line is not readable

    // The closing run unwinds one character at a time, so the outermost close
    // sits `depth - 1` characters past the first of them. Slashes and
    // backslashes belong to the shape (trapezoids), not to the label.
    labels.push(line.slice(open + 1, k - depth + 1).replace(/^[/\\]+|[/\\]+$/g, ""));
    i = k;
  }
  return labels;
}

/**
 * Every span of one mermaid line that reaches the reader as label text.
 *
 * Quoted runs come first and are then blanked out, so a colon or a bracket
 * *inside* a label cannot be read as syntax: `A["ratio: x:y"] --> B` has to
 * contribute `ratio: x:y` and nothing else.
 */
export function mermaidLabels(line, diagram) {
  if (DIRECTIVE.test(line)) return [];

  const labels = [];
  for (const m of line.matchAll(/"([^"]*)"/g)) labels.push(m[1]);
  const bare = line.replace(/"[^"]*"/g, (m) => " ".repeat(m.length));

  if (SHAPE_DIAGRAMS.has(diagram)) {
    labels.push(...nodeLabels(bare));
    // Edge labels: `-->|text|`, `-- text -->`, `-. text .->`, `== text ==>`.
    // The `-- text --` form is ambiguous with chained plain links, and a real
    // edge label holding a bracket must be quoted (already collected above) —
    // so a bracket here means a node mistaken for a label, and it is skipped.
    for (const m of bare.matchAll(/\|([^|]*)\|/g)) labels.push(m[1]);
    for (const m of bare.matchAll(/(?:--|==)\s+(.+?)\s+(?:--|==)[->]/g)) {
      if (!/[[({]/.test(m[1])) labels.push(m[1]);
    }
    for (const m of bare.matchAll(/-\.\s+(.+?)\s+\.-[->]/g)) {
      if (!/[[({]/.test(m[1])) labels.push(m[1]);
    }
    // `subgraph Name`, whose label is unbracketed and unquoted.
    const sub = bare.match(/^\s*subgraph\s+([^[\n]+)$/);
    if (sub) labels.push(sub[1]);
  }

  if (COLON_LABEL_DIAGRAMS.has(diagram)) {
    const colon = bare.indexOf(":");
    if (colon !== -1) labels.push(line.slice(colon + 1));
    // `participant SO as System.out` / `actor U as You`.
    const alias = line.match(/^\s*(?:participant|actor)\s+\S+\s+as\s+(.+)$/);
    if (alias) labels.push(alias[1]);
  }

  if (diagram === "gantt") {
    // A task is `name :meta, start, end`; the name is what gets painted.
    const colon = bare.indexOf(":");
    if (colon !== -1) labels.push(line.slice(0, colon));
    const heading = line.match(/^\s*(?:title|section)\s+(.+)$/);
    if (heading) labels.push(heading[1]);
  }

  return labels.map((l) => l.trim()).filter(Boolean);
}

/** An identifier with `(` right after it. Two characters minimum: a
 *  one-letter name before a paren is mathematical notation (`f(x)`,
 *  `P(A given B)`), not a call; a genuine one-letter function like R's `c()`
 *  is rare enough to mark by hand. */
const CALL = /(?<![\w$.])[A-Za-z_][\w$]+\(/g;

/** Two or more identifiers joined by dots, no spaces. The `@` in the lookbehind
 *  keeps the rule off the domain half of an email address, which lessons on
 *  unique constraints and foreign keys use as sample *data*. */
const QUALIFIED = /(?<![\w$.@])[A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)+/g;

/** snake_case. */
const SNAKE = /(?<![\w$])[a-z][a-z0-9]*(?:_[a-z0-9]+)+/g;

const RULES = [
  ["call", CALL],
  ["qualified", QUALIFIED],
  ["snake_case", SNAKE],
];

/**
 * Names that match the patterns above but are not code: product names,
 * abbreviations, and mathematical notation spelled like a call
 * (`Poisson(lambda)` is `f(x)` with a longer name). Notation this list does
 * not know opts out with `{/* allow-unmarked-code: … *\/}`.
 */
const PROSE_NAMES = new Set([
  "Node.js",
  "Next.js",
  "Nuxt.js",
  "Vue.js",
  "React.js",
  "Angular.js",
  "Backbone.js",
  "Ember.js",
  "Three.js",
  "D3.js",
  "Chart.js",
  "Express.js",
  "e.g",
  "i.e",
  "etc",
  "vs",
  "U.S",
  "Ph.D",
  "alt.sources",
  // Notation, not calls.
  "AR",
  "MA",
  "ARMA",
  "ARIMA",
  "Bernoulli",
  "Binomial",
  "Geometric",
  "Poisson",
  // English, with a parenthesised plural: "area in the tail(s)".
  "tail",
]);

/** Authors opt one diagram out with this on a line above the fence. */
const ALLOW = /allow-unmarked-code/;

/** Blank out what is already marked up, plus Mermaid's own `<br/>`, so only
 *  the unmarked remainder of a label is scanned. Lengths are preserved so a
 *  reported token still reads against the original label. */
function unmarked(label) {
  return label
    .replace(/<code>[\s\S]*?<\/code>/gi, (m) => " ".repeat(m.length))
    .replace(/<br\s*\/?>/gi, (m) => " ".repeat(m.length));
}

/** The code-shaped tokens in one label that are not inside a `<code>` span. */
export function unmarkedCode(label) {
  const rest = unmarked(label);
  const found = [];
  for (const [rule, pattern] of RULES) {
    pattern.lastIndex = 0;
    for (const m of rest.matchAll(pattern)) {
      const token = m[0];
      if (PROSE_NAMES.has(token) || PROSE_NAMES.has(token.replace(/\($/, ""))) continue;
      found.push({ rule, token });
    }
  }
  return found;
}

/** Lint one MDX source. Returns `{ file, rule, line, detail }` violations. */
export function lintSource(src, file) {
  const violations = [];
  const lines = src.split("\n");
  const allowed = new Set();
  lines.forEach((line, i) => {
    // An opt-out covers the fence that follows; a generous window is fine
    // since the comment is an explicit author decision.
    if (ALLOW.test(line)) for (let j = i; j < Math.min(lines.length, i + 60); j++) allowed.add(j);
  });

  for (const { line, text, diagram } of mermaidLines(lines)) {
    if (MONO_DIAGRAMS.has(diagram) || allowed.has(line - 1)) continue;
    for (const label of mermaidLabels(text, diagram)) {
      for (const { rule, token } of unmarkedCode(label)) {
        violations.push({
          file,
          rule,
          line,
          detail: `${token}  in  ${label.slice(0, 70)}`,
        });
      }
    }
  }
  return violations;
}

// --- file discovery -------------------------------------------------------

function walk(dir, test, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, out);
    else if (test(entry.name)) out.push(full);
  }
  return out;
}

/** Every lesson file this linter is responsible for. */
export function diagramFiles(root = process.cwd()) {
  return walk(path.join(root, "content"), (n) => n.endsWith(".mdx"));
}

export function lintFiles(files) {
  return files.flatMap((f) => lintSource(readFileSync(f, "utf8"), f));
}

// --- CLI ------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const files = args.length ? args : diagramFiles();
  const violations = lintFiles(files);
  if (violations.length) {
    const byFile = {};
    for (const v of violations) (byFile[v.file] ??= []).push(v);
    for (const [file, list] of Object.entries(byFile)) {
      console.error(`\n✗ ${path.relative(process.cwd(), file)}`);
      for (const v of list) console.error(`   ${v.line}: [${v.rule}] ${v.detail}`);
    }
    console.error(
      `\n${violations.length} unmarked code token(s) across ` +
        `${Object.keys(byFile).length} file(s).\n\n` +
        "Code in a diagram label is set in JetBrains Mono, the same face it has\n" +
        "in the code block above it, by wrapping the span in a <code> tag:\n\n" +
        '  A["<code>System.out</code>"]        flowchart, class, state, ER, mindmap\n' +
        "  participant SO as <code>System.out</code>   sequence, pie, gantt, timeline\n\n" +
        "A label whose brackets hold no quotes needs them once it holds a tag:\n" +
        "mermaid reads an unquoted `<` as syntax.\n\n" +
        "A label that really wants the prose face can opt out with\n" +
        "`{/* allow-unmarked-code: why */}` on a line above the fence.",
    );
    process.exit(1);
  }
  console.log(
    `✓ code in the mermaid labels of ${files.length} lesson file(s) is marked with <code>`,
  );
}
