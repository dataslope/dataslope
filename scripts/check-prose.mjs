// Lints authored prose for the punctuation and phrasing tics that read as
// machine-written. Companion to check-mcq.mjs, which lints <MultipleChoice>
// structure; this one lints the words themselves.
//
//   1. em-dash, the house style has no em dashes (or horizontal bars) in
//                    authored prose. A parenthetical takes commas or
//                    parentheses, an elaboration takes a colon, and two
//                    independent clauses take a semicolon or a full stop.
//                    Picking the right one is the point: the em dash is
//                    banned because it lets you avoid choosing.
//   2. spaced-en-dash, ` - ` written with an en dash is the same tic wearing
//                    a different glyph. Unspaced en dashes are fine and stay:
//                    they are correct in numeric ranges (1815-1864) and in
//                    two-name compounds (Runge-Kutta, bias-variance).
//   3. ai-filler,    a short, high-precision list of phrases that only ever
//                    turn up in generated marketing prose. Deliberately does
//                    NOT include words that are ordinary technical vocabulary
//                    here (robust, leverage, underscore all have real
//                    meanings in statistics, regression and Python).
//   4. inline-display-math, a `$$…$$` formula written on one line. Both
//                    delimiters on the same line is TEXT math to
//                    micromark-extension-math, not flow math, so the formula
//                    is set inline at text size: a `\frac` collapses into the
//                    line and its delimiters crowd the fraction bar. Display
//                    math has to be `$$`, the body, `$$` on three lines.
//   5. blockquote-quotes, a blockquote whose whole body is wrapped in a typed
//                    pair of double quotes. The stylesheet already puts
//                    typographic quotes around one (Fumadocs' bundled
//                    typography sets `blockquote p:first-of-type::before {
//                    content: open-quote }`), so the typed pair renders as a
//                    second one and the reader sees ""like this"".
//   6. colour-spelling, "colour" and its family, spelled the British way.
//                    This one word is held to American spelling while the rest
//                    of the prose is left alone, and the reason is that it is
//                    not only a word here. It is a CSS property, a Plot channel
//                    and a prop name, so a paragraph about `color="country"`
//                    that calls it a colour reads as a typo rather than as a
//                    dialect. Other British spellings in this repo (behaviour,
//                    centre, favour) have no such collision and are not
//                    touched.
//   7. mermaid-dash, a dash inside a mermaid diagram label that is not a plain
//                    ASCII hyphen. Diagram labels are prose the reader sees,
//                    but they sit in a fenced block, so every rule above skips
//                    them and they drifted: a flowchart shipped with
//                    "ffill -- safe as a live feature" in a node, where mermaid
//                    renders label text verbatim and the reader saw a literal
//                    double hyphen. Two shapes are caught, `--` used the way an
//                    em dash would be, and any non-ASCII dash glyph. See the
//                    section below for why labels are held to a stricter
//                    standard than rule 2 holds prose to.
//
// Scope is what a reader actually sees:
//
//   - content/**/*.mdx           every em dash is a violation
//   - data/illustration-prompts.json  titles and subjects render in the gallery
//   - app/**/*.{ts,tsx}          only em dashes sitting in a phrase, outside
//                                comments. A bare "-" glyph marking an empty
//                                table cell is a typographic convention, not
//                                prose, so `{col.type || "<em dash>"}` passes.
//   - charts/**/*.mjs          same rule as app/: a chart's `title` and
//                                `caption` exports are read on the lesson page
//                                exactly like the prose around them, and the
//                                MDX linter above cannot see them because they
//                                live in a spec rather than in content/.
//
// Used both as a CLI (`node scripts/check-prose.mjs [files...]`, defaults to
// all three roots) and as a library by __tests__/proseStyle.test.ts.
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

/** Every unindented blockquote in an MDX body, as `{ line, body }`, where
 *  `body` is the `>` markers stripped and the lines joined into one string.
 *
 *  Unindented is the whole point: a blockquote indented by two spaces is a
 *  `<MultipleChoice>` per-choice explanation, which parseQuestion.ts strips
 *  the `>` from and renders through MarkdownInline. No <blockquote> element
 *  reaches the page, so no stylesheet quotes are added and a typed pair is
 *  the only pair there is. Fenced code is skipped, a `>` inside it is a
 *  sample, a prompt, or a mermaid edge rather than a quotation. */
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
 *  quotes, on top of the pair the stylesheet draws.
 *
 *  Requiring the body to hold exactly two quote characters is what keeps
 *  this from firing on correct prose: `"Dense" describes the rank sequence,
 *  not "sparse"` also opens and closes on a quote, but its four quotes mark
 *  two quoted terms rather than one wrapped quotation. Two quotes sitting at
 *  the two ends can only be a wrapper. */
export function hasWrappingQuotes(body) {
  const inner = body.replace(LEADING_EMPHASIS, "").replace(TRAILING_EMPHASIS, "").trim();
  if ((inner.match(QUOTE_CHAR) || []).length !== 2) return false;
  return /^["“]/.test(inner) && /["”]$/.test(inner);
}

// --- mermaid labels -------------------------------------------------------

/** Any dash that is not a plain ASCII hyphen: em dash, horizontal bar, en
 *  dash, and the Unicode minus sign.
 *
 *  Stricter than rule 2, which keeps unspaced en dashes because they are
 *  correct in a numeric range. A diagram label is a few words in a box, so
 *  there is no typographic case to weigh, and one flat "hyphens only" rule
 *  beats a spaced/unspaced distinction nobody can see at label size. */
const NON_ASCII_DASH = /[—―–−]/;

/** A run of two or more hyphens used the way an em dash would be, with
 *  whitespace on at least one side. Mermaid renders label text verbatim, so
 *  this reaches the reader as the literal characters that were typed.
 *
 *  The whitespace is what keeps the rule off real content: `--verbose` names a
 *  CLI flag, `i--` is a decrement, and `-- comment` opens a SQL line comment.
 *  All three are things the lessons here legitimately draw in a diagram, and
 *  none of them is a dash standing in for punctuation. */
const HYPHEN_RUN_AS_DASH = /(^|\s)-{2,}(\s|$)/;

/** Mermaid's own line kinds whose colon introduces a style declaration or a
 *  layout keyword rather than label text (`style A fill:#f9f`). */
const MERMAID_DIRECTIVE = /^\s*(style|classDef|class|click|linkStyle|direction)\b/;

/** The diagram kinds where a colon introduces free text that runs to the end
 *  of the line: a sequence message, a note, a state description, a timeline
 *  event. In a flowchart it means nothing of the sort, and reading it that way
 *  is wrong in a way that bites, `A((a: 1,2,3,4,5)) --- I((4,5))` is a node
 *  label holding a colon, and taking the rest of the line as its text picks up
 *  the `---` link that follows. */
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
 *  `diagram` is the block's opening keyword (`flowchart`, `sequenceDiagram`).
 *
 *  Mermaid's `%%` comments are dropped: they never reach the rendered diagram,
 *  so a dash in one is as invisible as a dash in a TS comment (which
 *  stripComments already exempts). Dropping them first also means the diagram
 *  keyword is read off the first line that actually declares one, rather than
 *  off a leading `%%{init: ...}%%` directive. */
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

/** The label text on one mermaid line, for the hyphen-run rule.
 *
 *  Only the spans where a hyphen run can be *label* rather than *syntax*:
 *
 *    - quoted labels, `A["text"]` and `-->|"text"|`. A label holding two
 *      hyphens has to be quoted, since mermaid would otherwise read them as
 *      the link they look like, so this is where the rule earns its keep.
 *    - the free text after the first colon on a sequence message, a note, or a
 *      timeline event (`Alice->>Bob: text`), which runs to end of line and is
 *      the one unquoted label that can hold a hyphen run. Only in the diagram
 *      kinds where a colon means that (COLON_LABEL_DIAGRAMS).
 *
 *  Deliberately NOT the unquoted node labels (`A[text]`) or the bare edge
 *  labels (`A -->|text| B`): a hyphen run inside one is a link, not a label,
 *  and reading those spans is how you end up flagging `}|--|{` in an ER
 *  diagram or the `[ A | * ]` pointer boxes in the linked-list lesson.
 *
 *  The non-ASCII dash rule needs none of this and runs on the whole line, so
 *  it catches unquoted labels too: mermaid's syntax is pure ASCII, so any en
 *  dash on the line is already inside label text wherever it sits. */
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
    if (byRule["colour-spelling"]) {
      console.error(
        "\ncolour: write it \"color\". It is a CSS property, a Plot channel and a\n" +
          "prop name as well as a word, so the two spellings collide on the page.",
      );
    }
    process.exit(1);
  }
  console.log(
    `✓ prose in ${files.length} file(s) is clean (no em dashes, no spaced en dashes, no filler phrases, no one-line display math, no British "colour", no doubled blockquote quotes, no stray dashes in mermaid labels)`,
  );
}
