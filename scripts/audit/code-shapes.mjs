#!/usr/bin/env node
// Audit / fixer: wrap code in flowchart labels with <code> tags so the Mermaid
// component renders it in `var(--font-mono)` (see app/_components/mdx/mermaid.
// module.css and mermaid.tsx). Two cases:
//   • whole-label code  →  U[std::unique_ptr]      → U["<code>std::unique_ptr</code>"]
//   • code inside prose →  B[Click execute() now]  → B["Click <code>execute()</code> now"]
// Prose stays in the sans body font.
//
//   node scripts/audit/code-shapes.mjs            # dry-run report
//   node scripts/audit/code-shapes.mjs --apply    # rewrite the .mdx files
//
// Conservative by design: only flowchart/graph blocks, and only spans with a
// strong, unambiguous code signal (scope `::`, a call `f(…)`, a template `<T>`,
// a member call `a.b()`, or snake_case). Bare words, proper nouns (JavaScript),
// math notation (AR(p), y(t)) and prose-with-a-parenthetical are left alone.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "content/learn";
const APPLY = process.argv.includes("--apply");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

const SKIP_LINE = /^\s*(flowchart|graph|subgraph|end\b|classDef|class\s|click|style|linkStyle|direction|%%)/i;

// Shape openers (longest first) → their valid closing brackets.
const SHAPES = [
  ["[[", ["]]"]],
  ["[(", [")]"]],
  ["([", ["])"]],
  ["((", ["))"]],
  ["{{", ["}}"]],
  ["[/", ["/]", "\\]"]],
  ["[\\", ["\\]", "/]"]],
  ["[", ["]"]],
  ["(", [")"]],
  ["{", ["}"]],
  [">", ["]"]],
];

// Scan from `start` to the first closer (one of `closers`) lying OUTSIDE a
// double-quoted region — so a quoted label can contain the bracket char, e.g.
// `["unit_prices: [9.99, …]"]`. Returns { start, end } of the closer, or null.
function scanClose(line, start, closers) {
  const N = line.length;
  let i = start;
  while (i < N) {
    if (line[i] === '"') {
      i++;
      while (i < N && line[i] !== '"') {
        if (line[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    for (const cl of closers) if (line.startsWith(cl, i)) return { start: i, end: i + cl.length };
    i++;
  }
  return null;
}

// Find node declarations: an id immediately followed by a shape bracket. Returns
// [{ contentStart, contentEnd, declEnd }] with the label spanning
// [contentStart, contentEnd) (quotes included if present).
function findNodes(line) {
  const out = [];
  const N = line.length;
  const word = (ch) => /[A-Za-z0-9_]/.test(ch);
  let i = 0;
  while (i < N) {
    // Skip quoted regions that aren't a node label — e.g. edge labels
    // (`-->|"fit(x)"|`), where `fit(x)` must NOT be mistaken for a node.
    if (line[i] === '"') {
      i++;
      while (i < N && line[i] !== '"') {
        if (line[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    // An id begins a node only at a boundary and not as a member access
    // (`.fit` / `::x`), which would be a call inside a label, not a node.
    const prev = line[i - 1];
    if (word(line[i]) && (i === 0 || (!word(prev) && prev !== "." && prev !== ":"))) {
      let j = i;
      while (j < N && word(line[j])) j++;
      let matched = null;
      for (const [open, closers] of SHAPES) {
        if (line.startsWith(open, j)) {
          const cs = j + open.length;
          const close = scanClose(line, cs, closers);
          if (close) {
            matched = { contentStart: cs, contentEnd: close.start, declEnd: close.end };
            break;
          }
        }
      }
      if (matched) {
        out.push(matched);
        i = matched.declEnd;
        continue;
      }
      i = j;
    } else {
      i++;
    }
  }
  return out;
}

function normalize(label) {
  return label
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, " ")
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Single-token code keywords lacking `_`/camelCase but unambiguously code.
const CODE_WORDS = new Set([
  "nullptr", "malloc", "calloc", "realloc", "printf", "scanf", "sizeof",
  "typedef", "stdout", "stderr", "stdin", "argc", "argv",
]);

// Proper nouns / product names that happen to match the camelCase or
// member-path patterns (PostgreSQL → "eS", Plotly.js → member) but are NOT code.
// Only these block a whole-label wrap; embedded spans never match bare names.
const NOT_CODE = new Set([
  "javascript", "typescript", "mysql", "postgresql", "duckdb", "numpy", "scipy",
  "webgl", "macos", "ironpython", "ironruby", "plotly.js", "d3.js", "vb.net",
]);

// A function name that reads as a code identifier rather than math notation.
// Excludes single letters and short all-caps tokens — so `fib(5)`, `resample()`
// and `value_counts()` pass, but `y(t)`, `AR(p)`, `I(d)`, `O(n)` and
// `Poisson(lambda)` (a capitalized distribution) do not.
function isCodeName(n) {
  return n.length >= 2 && (/_/.test(n) || /^[a-z]/.test(n) || /[a-z][A-Z]/.test(n));
}

// Is the WHOLE label pure code? Subtract every identifier-bearing construct;
// if one was removed and no alphabetic prose residue remains, it was all code.
// Numbers/operators are stripped but don't, alone, make a label "code".
function isWholeCode(rawLabel) {
  let s = normalize(rawLabel);
  if (!s || /[?]/.test(s)) return false;
  if (CODE_WORDS.has(s.toLowerCase())) return true;

  let removedIdent = false;
  const ident = [
    /[A-Za-z_]\w*(?:::[A-Za-z_~]\w*)+(?:<[^<>]*>)?(?:\([^)]*\))?/g, // a::b<T>(…)
    /[A-Za-z_]\w*<[A-Za-z_][^<>]*>(?:\([^)]*\))?/g, // vector<int>
    /[A-Za-z_]\w*\[[^\]]*\]/g, // arr[i]
    /\b[A-Za-z]\w*_\w+\b/g, // snake_case (any case)
    /[*&]+[A-Za-z_]\w*|[A-Za-z_]\w*[*&]+/g, // *ptr / T&
  ];
  for (const re of ident) {
    if (re.test(s)) {
      removedIdent = true;
      s = s.replace(re, " ");
    }
  }
  // Member paths (df.head()) and camelCase names (DataFrame) — but skip proper
  // nouns (Plotly.js, JavaScript) so a label that is *only* a product name
  // isn't treated as code.
  const removeGuarded = (re) => {
    s = s.replace(re, (m) => {
      if (NOT_CODE.has(m.toLowerCase())) return m;
      removedIdent = true;
      return " ";
    });
  };
  removeGuarded(/[A-Za-z_]\w+(?:\.[A-Za-z_]\w+)+(?:\([^)]*\))?/g); // df.head()
  removeGuarded(/\b\w*[a-z][A-Z]\w*\b/g); // camelCase / PascalCase-multiword
  // Plain calls only when the callee reads as code (not math like AR(p), y(t)),
  // and not a "word(s)" English pluralization.
  s = s.replace(/([A-Za-z_]\w*)\(([^()]*)\)/g, (m, name, args) => {
    if (isCodeName(name) && args.trim() !== "s") {
      removedIdent = true;
      return " ";
    }
    return m;
  });
  s = s
    .replace(/->|=>|<-|<<|>>|&&|\|\||==|!=|<=|>=|\+\+|--|\+=|-=|%>%|\|>|:=/g, " ")
    .replace(/[-+]?\b\d[\w.]*\b/g, " ");
  return removedIdent && s.replace(/[^A-Za-z]+/g, " ").trim().length === 0;
}

// High-confidence code spans to wrap inside an otherwise-prose label.
const SPAN = new RegExp(
  "\\b[A-Za-z_]\\w*(?:::[A-Za-z_~]\\w*)+(?:<[A-Za-z_][^<>]*>)?(?:\\([^()]*\\))?" + // std::a<T>(…)
    "|\\b[A-Za-z_]\\w+(?:\\.[A-Za-z_]\\w+)+\\([^()]*\\)" + // df.head()
    "|\\b[A-Za-z_]\\w*<[A-Za-z_][^<>]*>(?:\\([^()]*\\))?" + // vector<int>
    "|\\b[A-Za-z_]\\w*\\([^()]*\\)" + // value_counts()
    "|\\b[A-Za-z]\\w*_\\w+\\b", // snake_case
  "g",
);

// Escape a code string for an HTML mermaid label: <br/> is preserved (line
// break), but other </>/& are entity-encoded so Mermaid's sanitizer doesn't
// strip template brackets (std::vector<int>, IEnumerable<T>) as unknown tags.
function escHtml(t) {
  return t
    .split(/(<br\s*\/?>)/i)
    .map((p) =>
      /^<br/i.test(p)
        ? "<br/>"
        : p
            .replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;"),
    )
    .join("");
}

// Rewrite one label, returning { label, tags }. Wraps the whole label if it is
// pure code, else wraps embedded code spans (segment by segment so a span can't
// cross or swallow a <br/>). Returns the label unchanged if nothing matched or
// it is already coded.
function rewriteLabel(rawLabel) {
  if (rawLabel == null || rawLabel === "") return { label: rawLabel, tags: [] };
  const qm = rawLabel.match(/^(["'])([\s\S]*)\1$/);
  const inner = qm ? qm[2] : rawLabel;
  if (/<code/i.test(inner)) return { label: rawLabel, tags: [] };

  const tags = [];
  let out;
  if (isWholeCode(inner)) {
    out = `<code>${escHtml(inner)}</code>`;
    tags.push(normalize(inner));
  } else {
    let any = false;
    out = inner
      .split(/(<br\s*\/?>)/i)
      .map((seg) =>
        /^<br/i.test(seg)
          ? seg
          : seg.replace(SPAN, (s) => {
              const plain = s.match(/^([A-Za-z_]\w*)\(([^()]*)\)$/);
              if (plain && (!isCodeName(plain[1]) || plain[2].trim() === "s"))
                return s; // math notation / "word(s)" pluralization
              any = true;
              tags.push(s);
              return `<code>${escHtml(s)}</code>`;
            }),
      )
      .join("");
    if (!any) return { label: rawLabel, tags: [] };
  }
  return { label: `"${out.replace(/"/g, "&quot;")}"`, tags };
}

function processLine(line, isFlow) {
  if (!isFlow || SKIP_LINE.test(line)) return { line, tags: [] };
  const nodes = findNodes(line);
  if (!nodes.length) return { line, tags: [] };
  const tags = [];
  let out = "";
  let pos = 0;
  for (const n of nodes) {
    const raw = line.slice(n.contentStart, n.contentEnd);
    const res = rewriteLabel(raw);
    out += line.slice(pos, n.contentStart);
    if (res.tags.length && res.label !== raw) {
      out += res.label;
      tags.push(...res.tags);
    } else {
      out += raw;
    }
    pos = n.contentEnd;
  }
  out += line.slice(pos);
  return { line: out, tags };
}

const files = walk(ROOT).sort();
let totalTags = 0;
let filesTouched = 0;
const report = [];

for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  let inMermaid = false;
  let isFlow = false;
  let changed = false;
  const fileTags = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```mermaid\s*$/.test(lines[i])) {
      inMermaid = true;
      isFlow = false;
      continue;
    }
    if (inMermaid && /^\s*```\s*$/.test(lines[i])) {
      inMermaid = false;
      continue;
    }
    if (!inMermaid) continue;
    if (/^\s*(flowchart|graph)\b/i.test(lines[i])) isFlow = true;
    const { line, tags } = processLine(lines[i], isFlow);
    if (tags.length) {
      fileTags.push({ line: i + 1, tags });
      if (line !== lines[i]) {
        lines[i] = line;
        changed = true;
      }
    }
  }
  if (fileTags.length) {
    filesTouched++;
    for (const t of fileTags) totalTags += t.tags.length;
    report.push({ f, fileTags });
    if (APPLY && changed) writeFileSync(f, lines.join("\n"));
  }
}

for (const { f, fileTags } of report) {
  const all = fileTags.flatMap((t) => t.tags);
  console.log(`\n${f}  (${all.length})`);
  for (const t of fileTags) console.log(`  :${t.line}  ${t.tags.join("  ·  ")}`);
}
console.log(
  `\n${APPLY ? "WRAPPED" : "WOULD WRAP"} ${totalTags} code spans across ${filesTouched} files.`,
);
