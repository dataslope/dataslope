// Lints authored prose for the punctuation and phrasing tics that read as
// machine-written. Companion to check-mcq.mjs. Rules:
//   1. em-dash          no em dashes in authored prose (use commas,
//                       parentheses, a colon, a semicolon, or a full stop).
//   2. spaced-en-dash   ` - ` with an en dash is the same tic; unspaced en
//                       dashes stay (ranges, two-name compounds).
//   3. ai-filler        a short high-precision list of generated-marketing
//                       phrases; deliberately excludes ordinary technical
//                       vocabulary (robust, leverage, underscore).
//   4. inline-display-math  `$$…$$` on one line is TEXT math to
//                       micromark-extension-math and renders inline at text
//                       size; display math must be `$$`, body, `$$` on three
//                       lines.
//   5. blockquote-quotes  the stylesheet already draws typographic quotes
//                       around a blockquote, so a typed pair renders doubled.
//   6. colour-spelling  "colour" only — it is also a CSS property, Plot
//                       channel and prop name, so the spellings collide on
//                       the page. Other British spellings are left alone.
//   7. mermaid-dash     a non-hyphen dash (or `--` used as one) in a mermaid
//                       label; labels sit in fences the rules above skip, and
//                       mermaid renders label text verbatim.
//   8. escaped-backtick a `\`` in a <Callout> body: the body is markdown, not
//                       a template literal, so the backslash prints. Callout
//                       bodies only — that is where a line-based rule can be
//                       certain.
//
// Scope: content/**/*.mdx (every em dash counts);
// data/illustration-prompts.json (gallery text); app/**/*.{ts,tsx} and
// charts/**/*.mjs (only em dashes in a phrase, outside comments — chart
// title/caption exports render as lesson prose).
//
// Used as a CLI (`node scripts/check-prose.mjs [files...]`) and as a library
// by __tests__/proseStyle.test.ts.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const EM_DASH = /[—―]/;
// An em dash with whitespace on at least one side, which is how it is used as
// punctuation. Excludes the standalone glyph in `"<em dash>"` or `<em>-</em>`.
const EM_DASH_IN_PHRASE = /(\s[—―])|([—―]\s)/;
const SPACED_EN_DASH = /\s–\s/;
/** A whole line that both opens and closes a `$$` block. Renders inline. */
const ONE_LINE_DISPLAY_MATH = /^\s*\$\$.+\$\$\s*$/;
/** colour, colours, coloured, colouring, colourful, watercolour, discolour. */
const BRITISH_COLOUR = /\b[a-z]*colour[a-z]*\b/i;

const AI_FILLER = [
  [/\bdelve[sd]? into\b/i, "delve into"],
  [/\bin today's (fast-paced|digital|data-driven|modern)\b/i, "in today's ..."],
  [/\ba testament to\b/i, "a testament to"],
  [/\b(rich |intricate )?tapestry\b/i, "tapestry"],
  [/\bgame-chang(er|ing)\b/i, "game-changer"],
  [/\bseamlessly integrat/i, "seamlessly integrates"],
  [/\bunlock (the |its )?(full )?potential\b/i, "unlock the potential"],
  [/\bnavigat(e|ing) the (complex |ever-changing )?landscape\b/i, "navigate the landscape"],
  [/\blet'?s dive (in|into)\b/i, "let's dive in"],
  [/\bit'?s not just \w+,? it'?s\b/i, "it's not just X, it's Y"],
  [/\bwhen it comes to\b/i, "when it comes to"],
];

// --- blockquotes ----------------------------------------------------------

const QUOTE_CHAR = /["“”]/g;
/** A leading emphasis run, `*` or `_`, one or two of them. */
const LEADING_EMPHASIS = /^[*_]{1,2}/;
const TRAILING_EMPHASIS = /[*_]{1,2}$/;

/** Every unindented blockquote in an MDX body, as `{ line, body }`.
 *  Unindented matters: an indented `>` is a <MultipleChoice> explanation that
 *  never becomes a <blockquote>, so it gets no stylesheet quotes and a typed
 *  pair is fine there. Fenced code is skipped (a `>` inside is a sample or a
 *  mermaid edge). */
function blockquotes(lines) {
  const found = [];
  let fence = null;
  let block = null;
  const flush = () => {
    if (block) found.push({ line: block.line, body: block.parts.join(" ").trim() });
    block = null;
  };

  lines.forEach((line, i) => {
    const fenceMark = line.match(/^\s*(```+|~~~+)/);
    if (fenceMark) {
      flush();
      if (fence && fenceMark[1].startsWith(fence)) fence = null;
      else if (!fence) fence = fenceMark[1];
      return;
    }
    if (fence) return;

    const quoted = line.match(/^>\s?(.*)$/);
    if (!quoted) {
      flush();
      return;
    }
    if (!block) block = { line: i + 1, parts: [] };
    block.parts.push(quoted[1].trim());
  });
  flush();
  return found;
}

/** True when a blockquote body carries its own wrapping pair of double
 *  quotes. Exactly two quote characters at the two ends can only be a
 *  wrapper; a body with more (two quoted terms, say) is correct prose. */
export function hasWrappingQuotes(body) {
  const inner = body.replace(LEADING_EMPHASIS, "").replace(TRAILING_EMPHASIS, "").trim();
  if ((inner.match(QUOTE_CHAR) || []).length !== 2) return false;
  return /^["“]/.test(inner) && /["”]$/.test(inner);
}

// --- mermaid labels -------------------------------------------------------

/** Any dash that is not a plain ASCII hyphen. Stricter than rule 2: a label
 *  is a few words in a box, so one flat "hyphens only" rule beats a
 *  spaced/unspaced distinction nobody can see at label size. */
const NON_ASCII_DASH = /[—―–−]/;

/** A run of two or more hyphens used the way an em dash would be, with
 *  whitespace on at least one side — the whitespace keeps the rule off
 *  `--verbose`, `i--` and SQL's `-- comment`, all of which lessons
 *  legitimately draw. */
const HYPHEN_RUN_AS_DASH = /(^|\s)-{2,}(\s|$)/;

/** Mermaid's own line kinds whose colon introduces a style declaration or a
 *  layout keyword rather than label text (`style A fill:#f9f`). */
const MERMAID_DIRECTIVE = /^\s*(style|classDef|class|click|linkStyle|direction)\b/;

/** Diagram kinds where a colon introduces free text running to end of line
 *  (a sequence message, a note, a timeline event). In a flowchart a colon is
 *  just label content, and reading it as free text picks up the link after
 *  it. */
const COLON_LABEL_DIAGRAMS = new Set([
  "sequenceDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "timeline",
  "journey",
  "erDiagram",
  "classDiagram",
  "pie",
]);

/** Every line inside a ```mermaid fence, as `{ line, text, diagram }`, where
 *  `diagram` is the block's opening keyword. `%%` comments are dropped —
 *  they never render, and dropping them first also keeps a leading
 *  `%%{init: ...}%%` from being read as the diagram keyword. */
export function mermaidLines(lines) {
  const found = [];
  let fence = null;
  let isMermaid = false;
  let diagram = null;

  lines.forEach((line, i) => {
    const fenceMark = line.match(/^\s*(```+|~~~+)\s*(\w*)/);
    if (fenceMark) {
      if (fence && fenceMark[1].startsWith(fence)) {
        fence = null;
        isMermaid = false;
      } else if (!fence) {
        fence = fenceMark[1];
        isMermaid = fenceMark[2] === "mermaid";
        diagram = null;
      }
      return;
    }
    if (!isMermaid || /^\s*%%/.test(line) || !line.trim()) return;
    diagram ??= line.trim().match(/^[\w-]+/)?.[0] ?? "";
    found.push({ line: i + 1, text: line, diagram });
  });
  return found;
}

/** The label text on one mermaid line, for the hyphen-run rule: only spans
 *  where a hyphen run can be *label* rather than *syntax* — quoted labels
 *  (a label holding `--` must be quoted anyway) and the free text after a
 *  colon in COLON_LABEL_DIAGRAMS. Unquoted node/edge labels are deliberately
 *  excluded: a hyphen run there is a link, and scanning them flags ER
 *  cardinality syntax. The non-ASCII dash rule runs on the whole line
 *  instead, since mermaid syntax is pure ASCII. */
export function mermaidLabelText(line, diagram) {
  const spans = [];
  for (const m of line.matchAll(/"([^"]*)"/g)) spans.push(m[1]);

  if (COLON_LABEL_DIAGRAMS.has(diagram) && !MERMAID_DIRECTIVE.test(line)) {
    // Quoted runs are blanked first so a colon *inside* a label cannot split
    // it: `A["ratio: x:y"] --> B` must not contribute ` x:y"] --> B`.
    const blanked = line.replace(/"[^"]*"/g, (m) => " ".repeat(m.length));
    const colon = blanked.indexOf(":");
    if (colon !== -1) spans.push(line.slice(colon + 1));
  }
  return spans.filter((s) => s.trim());
}

// --- comment stripping (TS/TSX only) --------------------------------------

/** Blank out //, /* *\/ and {/* *\/} comments, preserving line structure so
 *  reported line numbers stay correct. */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
}

// --- linting --------------------------------------------------------------

/** Lint one file's source. `kind` is "mdx", "json" or "code". */
export function lintSource(src, file, kind) {
  const violations = [];
  const add = (rule, line, detail) => violations.push({ file, rule, line, detail });
  const scanned = kind === "code" ? stripComments(src) : src;
  const lines = scanned.split("\n");
  // Fenced code is prose-exempt for the math rule: a shell snippet can legally
  // contain `$$` (the shell's own PID variable) and is not a formula.
  let inFence = false;

  lines.forEach((line, i) => {
    const n = i + 1;
    const snippet = line.trim().slice(0, 90);

    if (kind === "mdx") {
      if (/^\s*```/.test(line)) inFence = !inFence;
      else if (!inFence && ONE_LINE_DISPLAY_MATH.test(line)) {
        add("inline-display-math", n, snippet);
      }
    }

    if (kind === "code") {
      // Only an em dash used as punctuation counts; a lone glyph does not.
      if (EM_DASH_IN_PHRASE.test(line)) add("em-dash", n, snippet);
    } else if (EM_DASH.test(line)) {
      add("em-dash", n, snippet);
    }

    // A markdown table row uses a padded dash as an empty-cell marker.
    const isTableRow = kind === "mdx" && line.trim().startsWith("|");
    if (!isTableRow && SPACED_EN_DASH.test(line)) add("spaced-en-dash", n, snippet);

    if (BRITISH_COLOUR.test(line)) add("colour-spelling", n, snippet);

    for (const [re, label] of AI_FILLER) {
      if (re.test(line)) add("ai-filler", n, `"${label}", ${snippet}`);
    }
  });

  if (kind === "mdx") {
    // A backslash-escaped backtick in a callout body. The tags are matched at
    // column 0, which is where MDX requires a block element's own tags to sit
    // and where a template literal's contents never begin.
    let inCallout = false;
    let calloutFence = false;
    lines.forEach((line, i) => {
      if (/^<Callout\b/.test(line)) inCallout = true;
      else if (/^<\/Callout>/.test(line)) inCallout = false;
      else if (inCallout && /^\s*(```+|~~~+)/.test(line)) calloutFence = !calloutFence;
      else if (inCallout && !calloutFence && line.includes("\\`")) {
        add("escaped-backtick", i + 1, line.trim().slice(0, 90));
      }
      if (!inCallout) calloutFence = false;
    });

    for (const { line, body } of blockquotes(lines)) {
      if (hasWrappingQuotes(body)) add("blockquote-quotes", line, body.slice(0, 90));
    }
    // One violation per line: a label can trip both halves of the rule, and
    // the fix ("write a plain hyphen") is the same either way.
    for (const { line, text, diagram } of mermaidLines(lines)) {
      const offender = NON_ASCII_DASH.test(text)
        ? text
        : mermaidLabelText(text, diagram).find((label) => HYPHEN_RUN_AS_DASH.test(label));
      if (offender) add("mermaid-dash", line, text.trim().slice(0, 90));
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

/** Every file this linter is responsible for, tagged with how to read it. */
export function proseFiles(root = process.cwd()) {
  const files = [
    ...walk(path.join(root, "content"), (n) => n.endsWith(".mdx")).map((f) => [f, "mdx"]),
    ...walk(path.join(root, "app"), (n) => /\.tsx?$/.test(n)).map((f) => [f, "code"]),
    // Chart specs: their `title`/`caption` exports render as lesson prose.
    ...walk(path.join(root, "charts"), (n) => n.endsWith(".mjs")).map((f) => [f, "code"]),
  ];
  const prompts = path.join(root, "data", "illustration-prompts.json");
  if (existsSync(prompts)) files.push([prompts, "json"]);
  return files;
}

export function lintFiles(files) {
  return files.flatMap(([f, kind]) => lintSource(readFileSync(f, "utf8"), f, kind));
}

// --- CLI ------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const files = args.length
    ? args.map((f) => [f, f.endsWith(".mdx") ? "mdx" : f.endsWith(".json") ? "json" : "code"])
    : proseFiles();
  const violations = lintFiles(files);
  if (violations.length) {
    const byRule = {};
    for (const v of violations) (byRule[v.rule] ??= []).push(v);
    for (const [rule, list] of Object.entries(byRule)) {
      console.error(`\n✗ ${rule} (${list.length}):`);
      for (const v of list.slice(0, 50)) {
        console.error(`   ${path.relative(process.cwd(), v.file)}:${v.line}: ${v.detail}`);
      }
      if (list.length > 50) console.error(`   …and ${list.length - 50} more`);
    }
    console.error(`\n${violations.length} prose violation(s) across ${files.length} file(s).`);
    console.error(
      "\nem dashes: use a comma or parentheses for an aside, a colon before an\n" +
        "elaboration, and a semicolon or full stop between two clauses.",
    );
    if (byRule["blockquote-quotes"]) {
      console.error(
        "\nblockquote quotes: drop the typed pair. The stylesheet draws the\n" +
          "quotation marks, so a blockquote that types its own renders doubled.",
      );
    }
    if (byRule["mermaid-dash"]) {
      console.error(
        "\nmermaid labels: write a plain ASCII hyphen. Mermaid renders label\n" +
          "text verbatim, so a typed `--` reaches the reader as two hyphens.",
      );
    }
    if (byRule["escaped-backtick"]) {
      console.error(
        "\ncallout backticks: write a plain backtick. A callout body is\n" +
          "markdown, not a template literal, so `\\`` reaches the reader as the\n" +
          "character rather than as a code span.",
      );
    }
    if (byRule["colour-spelling"]) {
      console.error(
        "\ncolour: write it \"color\". It is a CSS property, a Plot channel and a\n" +
          "prop name as well as a word, so the two spellings collide on the page.",
      );
    }
    process.exit(1);
  }
  console.log(
    `✓ prose in ${files.length} file(s) is clean (no em dashes, no spaced en dashes, no filler phrases, no one-line display math, no British "colour", no doubled blockquote quotes, no stray dashes in mermaid labels, no escaped backticks in callouts)`,
  );
}
