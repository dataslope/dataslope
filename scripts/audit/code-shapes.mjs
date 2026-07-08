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
// strong, unambiguous code signal. The first group of rules covers identifiers
// and calls (scope `::`, a call `f(…)`, a template `<T>`, a member call `a.b()`,
// snake_case); a second continuation group (below `escHtml`) covers the *other*
// shapes of code that read as prose to those rules, expressions (lambdas,
// comparisons, assignments, returns), SQL clauses and keyword stage-boxes, and
// literals (shell commands, LINQ queries, numeric arrays). Bare words, proper
// nouns (JavaScript), math notation (AR(p), y(t), a < X < b) and prose-with-a-
// parenthetical are left alone.
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

const SKIP_LINE = /^\s*(flowchart|graph|end\b|classDef|class\s|click|style|linkStyle|direction|%%)/i;

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
// double-quoted region, so a quoted label can contain the bracket char, e.g.
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
    // Skip quoted regions that aren't a node label, e.g. edge labels
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
  // Product/library names that look like a `name.js` file but are prose.
  "node.js", "next.js", "vue.js", "react.js", "three.js", "express.js", "deno.js",
]);

// A dotted span that's really prose, not code: a denylisted product name, or a
// web domain (example.com, python.org) rather than a source file (hello.c).
const WEB_TLD = /\.(?:com|org|net|edu|gov)$/i;
function isProseName(s) {
  return NOT_CODE.has(s.toLowerCase()) || WEB_TLD.test(s);
}

// A function name that reads as a code identifier rather than math notation.
// Excludes single letters and short all-caps tokens, so `fib(5)`, `resample()`
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
  const mark = (re) => {
    if (re.test(s)) {
      removedIdent = true;
      s = s.replace(re, " ");
    }
  };
  mark(/function\s*\([^()]*\)/g); // function (args)
  mark(/[A-Za-z_]\w*(?:::[A-Za-z_~]\w*)+(?:<[^<>]*>)?(?:\([^)]*\))?/g); // a::b<T>(…)
  mark(/[A-Za-z_]\w*<[A-Za-z_][^<>]*>(?:\([^)]*\))?/g); // vector<int>
  mark(/[A-Za-z_]\w*\[[^\]]*\]/g); // arr[i]
  // Assignment to a *literal* or call (p = 0x100, n = 42, greeting = 'Howdy',
  // x = f()). A bare-word RHS is excluded so prose equations ("Pipeline = recipe",
  // "Residual = actual", "A = L") aren't treated as code.
  mark(
    /[A-Za-z_][\w.]*\s*=\s*(?:'[^']*'|"[^"]*"|0x[0-9a-fA-F_]+|-?\d[\w.]*|[A-Za-z_][\w.]*\([^()]*\))/g,
  );
  // Member paths (df.head()), dotted file/module names (hello.c, users.js), and
  // camelCase names (DataFrame), but skip proper nouns (Plotly.js, JavaScript)
  // so a label that is *only* a product name isn't treated as code.
  const removeGuarded = (re) => {
    s = s.replace(re, (m) => {
      if (isProseName(m)) return m;
      removedIdent = true;
      return " ";
    });
  };
  removeGuarded(/[A-Za-z_]\w+(?:\.[A-Za-z_]\w+)+\([^()]*\)/g); // df.head()
  // Plain calls only when the callee reads as code (not math like AR(p), y(t)),
  // and not a "word(s)" English pluralization.
  s = s.replace(/([A-Za-z_]\w*)\(([^()]*)\)/g, (m, name, args) => {
    if (isCodeName(name) && args.trim() !== "s") {
      removedIdent = true;
      return " ";
    }
    return m;
  });
  removeGuarded(/[A-Za-z_][\w-]+(?:\.[A-Za-z][\w-]*)+/g); // hello.c / users.js
  removeGuarded(/\b\w*[a-z][A-Z]\w*\b/g); // camelCase / PascalCase-multiword
  mark(/\b[A-Za-z]\w*_\w+\b/g); // snake_case (any case)
  mark(/[*&]+[A-Za-z_]\w*|[A-Za-z_]\w*[*&]+/g); // *ptr / T&
  mark(/\{[^{}]*\}/g); // { ... } brace block
  mark(/0x[0-9a-fA-F][0-9a-fA-F_]*/g); // hex literal
  mark(/'[^']*'|"[^"]*"/g); // string literal
  s = s
    .replace(/->|=>|<-|<<|>>|&&|\|\||==|!=|<=|>=|\+\+|--|\+=|-=|%>%|\|>|:=/g, " ")
    .replace(/[-+]?\b\d[\w.]*\b/g, " ");
  return removedIdent && s.replace(/[^A-Za-z]+/g, " ").trim().length === 0;
}

// High-confidence code spans to wrap inside an otherwise-prose label.
const SPAN = new RegExp(
  "\\bfunction\\s*\\([^()]*\\)(?:\\s*\\{[^{}]*\\})?" + // function (name) { ... }
    "|\\b[A-Za-z_]\\w*(?:::[A-Za-z_~]\\w*)+(?:<[A-Za-z_][^<>]*>)?(?:\\([^()]*\\))?" + // std::a<T>(…)
    "|\\b[A-Za-z_][\\w.]*\\s*=\\s*(?:'[^']*'|\"[^\"]*\"|0x[0-9a-fA-F_]+|-?\\d[\\w.]*|[A-Za-z_][\\w.]*\\([^()]*\\))" + // x = val
    "|\\b[A-Za-z_]\\w+(?:\\.[A-Za-z_]\\w+)+\\([^()]*\\)" + // df.head()
    "|\\b[A-Za-z_]\\w*<[A-Za-z_][^<>]*>(?:\\([^()]*\\))?" + // vector<int>
    "|\\b[A-Za-z_]\\w*\\([^()]*\\)" + // value_counts()
    "|\\b[A-Za-z_][\\w-]+(?:\\.[A-Za-z][\\w-]*)+" + // hello.c / users.js
    "|\\b[A-Za-z]\\w*_\\w+\\b" + // snake_case
    "|0x[0-9a-fA-F][0-9a-fA-F_]*" + // hex literal
    "|\\{[^{}]*\\}", // { ... }
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

// ─── Continuation pass: expressions, SQL, and literals ─────────────────────
//
// The patterns above catch identifiers, calls and templates. This second group
// catches the *other* shapes of code that read as prose to those rules but are
// still things you'd type into an editor, a SQL console or a shell:
//   • expressions, lambdas (x => x.Age > 30), comparisons/conditions
//     (score >= 90?), assignments (i = i + 1), method chains (.Select(p => p.B)),
//     return statements, pointer arrows (a -> Widget);
//   • SQL, clauses and statements (SELECT name, salary; WHERE price < 20), down
//     to bare keyword stage-boxes (SELECT, FROM, WHERE), with any trailing prose
//     description left in the sans body font;
//   • literals, shell commands (git push), LINQ query syntax, numeric arrays.

// SQL keywords that open a clause (longest first so "GROUP BY" beats "GROUP").
// Matched only when UPPERCASE, the convention these courses write SQL in, so a
// prose "join the tables" or "select a row" is never mistaken for code.
const SQL_OPENERS = [
  "FULL OUTER JOIN", "CREATE TABLE AS", "DELETE FROM", "INSERT INTO", "GROUP BY",
  "ORDER BY", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN", "FULL JOIN",
  "CREATE TABLE", "UNION ALL", "SELECT", "INSERT", "UPDATE", "DELETE", "HAVING",
  "VALUES", "OFFSET", "UNION", "WHERE", "LIMIT", "JOIN", "FROM",
];
// SQL functions: the only names allowed to pull a "(" into a clause (so COUNT(*)
// continues, but WHERE (a prose aside) stops before the paren).
const SQL_FUNC = new Set([
  "COUNT", "SUM", "AVG", "MIN", "MAX", "COALESCE", "ABS", "ROUND", "UPPER",
  "LOWER", "LENGTH", "CAST", "EXTRACT", "NOW", "DATE", "RANK", "ROW_NUMBER",
]);
// Lowercase words that mark the start of a prose description trailing a clause
// (WHERE filter rows → keyword is code, "filter rows" is prose). Column/table
// names in these courses (amount, price, dept, orders, …) are never in this set,
// so a real clause runs through them.
const SQL_PROSE = new Set(
  ("filter filters rows row keep keeps drop drops choose chooses pick picks show " +
    "shows read reads change changes remove removes add adds sort sorts trim trims " +
    "form forms join joins return returns write writes group grouping groups result " +
    "results columns column tables only matches matched totals no can see here " +
    "computed individual full make makes department take takes skip skips two high " +
    "low surface extremes top look bins slice value condition true false the before " +
    "after early late combine related record fetch right and or of pairs query " +
    "final per into nothing")
    .split(/\s+/),
);
const sep = (ch) => ch === "" || ":/|,(".includes(ch);

// Tokenize a label segment for the SQL scanner: words, numbers, strings, the
// ellipsis placeholder, multi-char operators, and single punctuation.
function sqlTokenize(s) {
  const re = /\s+|[A-Za-z_]\w*|0x[0-9a-fA-F]+|\d[\d.]*|'[^']*'|"[^"]*"|\.\.\.|<=|>=|<>|!=|[(),.;*=<>%]|\S/g;
  const toks = [];
  let m;
  while ((m = re.exec(s))) toks.push({ t: m[0], i: m.index, end: m.index + m[0].length });
  return toks;
}

// Keyword enumerations, UPPERCASE SQL keywords joined by "/" or "," (SELECT /
// WHERE, INSERT / UPDATE / DELETE). Wrap each keyword, leaving the separators.
const SQL_KW_ALT = SQL_OPENERS.join("|"); // longest-first, so "GROUP BY" wins
function wrapSqlKeywordLists(seg, tags) {
  const list = new RegExp(`(?:${SQL_KW_ALT})(?:\\s*[/,]\\s*(?:${SQL_KW_ALT}))+`, "g");
  const one = new RegExp(`(?:${SQL_KW_ALT})`, "g");
  return seg.replace(list, (run) =>
    run.replace(one, (kw) => {
      tags.push(kw);
      return `<code>${kw}</code>`;
    }),
  );
}

// Wrap maximal SQL clauses in a segment. A clause starts at an UPPERCASE SQL
// keyword that leads the segment or follows a separator (: / | , (), then runs
// through SQL tokens, identifiers, numbers, strings, operators, commas,
// function calls, until a prose word, a separator, a colon, or an arrow. The
// clause is wrapped only if it extends past the keyword (e.g. WHERE price < 20)
// or *is* the whole label (a bare SELECT / FROM stage-box), so a lone keyword
// trailed by prose ("UPDATE: move each center…", "WHERE filter rows") is left be.
function wrapSqlClause(seg, tags) {
  if (!/[A-Z]/.test(seg)) return seg;
  const toks = sqlTokenize(seg);
  let out = "";
  let lastFlushed = 0; // index into `seg` up to which we've emitted
  let prevSig = ""; // previous significant (non-space) token text
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    if (/^\s+$/.test(tok.t)) continue;
    // Try to match a SQL opener (possibly two words) at this position.
    let opener = null;
    let span = 1;
    for (const kw of SQL_OPENERS) {
      const parts = kw.split(" ");
      const slice = toks
        .slice(k, k + parts.length * 2)
        .filter((x) => !/^\s+$/.test(x.t))
        .slice(0, parts.length)
        .map((x) => x.t)
        .join(" ");
      if (slice === kw) {
        opener = kw;
        let need = parts.length;
        let j = k;
        while (need > 0 && j < toks.length) {
          if (!/^\s+$/.test(toks[j].t)) need--;
          j++;
        }
        span = j - k; // raw tokens (incl. interleaved spaces) the opener spans
        break;
      }
    }
    if (!opener || !sep(prevSig === "" ? "" : prevSig.slice(-1))) {
      prevSig = tok.t;
      continue;
    }
    // Walk forward consuming SQL-continuation tokens. Track paren depth so a
    // function call's parens are kept (COUNT(*)) but a closing paren that merely
    // wraps the clause in the prose ("(VALUES)", "(CREATE TABLE AS)") stops it.
    let end = k + span; // first index after the opener
    let lastSig = k + span - 1; // last non-space token index kept
    let depth = 0;
    while (end < toks.length) {
      const x = toks[end];
      if (/^\s+$/.test(x.t)) { end++; continue; }
      const w = x.t;
      const prevKept = toks[lastSig].t;
      if (w === ")") {
        if (depth === 0) break;
        depth--;
        lastSig = end;
        end++;
        continue;
      }
      const stop =
        w === "/" || w === "|" || w === "→" || w === "-" || w === ":" ||
        (w === "(" && !SQL_FUNC.has(prevKept.toUpperCase())) ||
        (/^[a-z]/.test(w) && SQL_PROSE.has(w.toLowerCase()));
      if (stop) break;
      if (w === "(") depth++;
      lastSig = end;
      end++;
    }
    // Build the clause text, trimming trailing operators/punctuation (but never
    // a closing ), * or ; that legitimately ends a statement).
    let clause = seg.slice(toks[k].i, toks[lastSig].end);
    const trimmed = clause.replace(/[\s,.<>=!%(+-]+$/, "");
    const drop = clause.length - trimmed.length;
    clause = trimmed;
    // Only commit if the clause runs past the opener, or is the whole label.
    const extends_ = lastSig >= k + span;
    if (!extends_ && clause !== seg.trim()) {
      prevSig = tok.t;
      continue;
    }
    out += seg.slice(lastFlushed, toks[k].i) + `<code>${escHtml(clause)}</code>`;
    tags.push(clause);
    lastFlushed = toks[lastSig].end - drop;
    k = lastSig; // resume scanning after the kept clause
    prevSig = toks[lastSig].t;
  }
  return out + seg.slice(lastFlushed);
}

// Keyword enumerations first, then maximal clauses in whatever's left outside.
function wrapSqlClauses(seg, tags) {
  const listed = wrapSqlKeywordLists(seg, tags);
  return wrapOutsideCode(listed, (chunk) => wrapSqlClause(chunk, tags));
}

// Run `fn` only on the parts of `s` that lie OUTSIDE existing <code> spans, so a
// second pass can't wrap text already wrapped by an earlier one.
function wrapOutsideCode(s, fn) {
  return s
    .split(/(<code>[\s\S]*?<\/code>)/i)
    .map((part) => (/^<code>/i.test(part) ? part : fn(part)))
    .join("");
}

// An operand in an expression: a (possibly member) identifier or call, a number,
// a string, or a code keyword like nullptr/NULL/true/false.
const OPERAND =
  "(?:[&*]?[A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)*(?:\\([^()]*\\))?" +
  "|-?\\d[\\w.]*|'[^']*'|\"[^\"]*\"|nullptr|NULL|null|None|true|false|TRUE|FALSE)";
const CMP = "(?:===?|!==?|>=|<=|<|>)";
const LAMBDA = "(?:=>|⇒)";
// A term is an operand or an arithmetic chain of them (a + b, slope * x), so a
// comparison like "x % 2 == 0" is captured whole, not split at the %.
const TERM = `${OPERAND}(?:\\s*[-+*/%]\\s*${OPERAND})*`;
const EXPR_SPAN = new RegExp(
  // a method/extension call whose args hold a lambda: Select(d => d.Employees)
  `[A-Za-z_]\\w*\\([^()]*${LAMBDA}[^()]*\\)` +
    // lambda: x => x.Age > 30 , (a, b) => a + b
    `|(?:\\([^()]*\\)|[A-Za-z_]\\w*)\\s*${LAMBDA}\\s*${OPERAND}(?:\\s*(?:${CMP}|[-+*/%]|&&|\\|\\|)\\s*${OPERAND})*` +
    // a leading method chain: .Select(p => p.B).Where(...)
    `|\\.[A-Za-z_]\\w*\\([^()]*\\)(?:\\.[A-Za-z_]\\w*\\([^()]*\\))*` +
    // return statement: return 'A'
    `|\\breturn\\s+${OPERAND}` +
    // comparison / condition: x.Age > 30 , Product == 'Widget' , x % 2 == 0
    `|${TERM}\\s*${CMP}\\s*${TERM}(?:\\s*(?:${CMP}|&&|\\|\\|)\\s*${TERM})*` +
    // assignment to a literal / expression (spaces around = so a linked-list box
    // field "prev=null" isn't caught): i = i + 1 , xs = [1, 2, 3] , b = nullptr
    `|[A-Za-z_][\\w.]*\\s+=\\s+(?:\\[[^\\]]*\\]|${OPERAND})(?:\\s*[-+*/%]\\s*${OPERAND})*` +
    // arithmetic against an explicit number, spaces required so a hyphenated
    // name or date (Therac-25, Jan-01) isn't mistaken for subtraction: p + 1
    `|[A-Za-z_]\\w*\\s+[-+*/%]\\s+-?\\d[\\w.]*`,
  "g",
);

// Does a matched span carry a *strong* code signal, or is it just English words
// joined by an operator (a prose formula like "Residual = actual - predicted" or
// "y = intercept + slope * x")? Comparisons, lambdas, calls, member access,
// literals, numbers-in-arithmetic, address-of and code keywords qualify; a bare
// word * word / word + word does not.
function isStrongExpr(m) {
  if (/===?|!==?|>=|<=|<|>|=>|⇒|&&|\|\|/.test(m)) return true; // comparison / lambda / logical
  if (/['"]/.test(m)) return true; // string literal
  if (/\d/.test(m) && /[-+*/%=]/.test(m)) return true; // arithmetic with a number
  if (/[A-Za-z_]\w*\([^()]*\)/.test(m)) return true; // call
  if (/[A-Za-z_]\w*\.[A-Za-z_]/.test(m)) return true; // member access
  if (/\b(?:nullptr|NULL|null|None|true|false|TRUE|FALSE)\b/.test(m)) return true;
  if (/&\s*[A-Za-z_]/.test(m)) return true; // address-of: &a
  if (/\[[^\]]*\]/.test(m)) return true; // array literal
  return false;
}

// Wrap expression spans inside one chunk of prose. Skips generic-type lookalikes
// (Func<T,bool>) and weak prose equations via isStrongExpr.
function wrapExprSpans(chunk, tags) {
  return chunk.replace(EXPR_SPAN, (m, ...args) => {
    const offset = args[args.length - 2];
    const before = chunk.slice(0, offset);
    if (/[A-Za-z_]\w*<[A-Za-z_]/.test(m) && !/\s<\s/.test(m)) return m; // generic, not a comparison
    if (!isStrongExpr(m)) return m;
    // For an assignment, the strength must be on the RIGHT of "=", so "b =
    // nullptr" and "i = i + 1" wrap, but a prose gloss like "null = no effect"
    // (strong only because of the keyword on the left) does not.
    const asg = m.match(/^[A-Za-z_][\w.]*\s*=(?!=)\s*([\s\S]+)$/);
    if (asg) {
      if (!isStrongExpr(asg[1])) return m;
    } else if (/[<>]=?|[=!]==?/.test(m) && !/=>|⇒/.test(m)) {
      // Math / probability notation over single-letter operands, a chained
      // inequality (a < X < b) or one inside a function call P(X <= x), reads as
      // math, not code; same call the first pass made for y(t) and AR(p). A real
      // condition (i < N, score >= 90, ADF p >= 0.05, width <= 0.8) still wraps.
      const ops = (m.match(/[<>]=?|[=!]==?/g) || []).length;
      const singleLetters = !/[A-Za-z_]{2,}|\d/.test(m);
      if (singleLetters && (ops >= 2 || /\($/.test(before))) return m;
    }
    tags.push(m);
    return `<code>${escHtml(m)}</code>`;
  });
}

// SQL clauses first (they own their inner comparisons), then expression spans in
// whatever prose is left outside the wrapped clauses.
function wrapNewSpans(seg, tags) {
  let s = wrapSqlClauses(seg, tags);
  s = wrapOutsideCode(s, (chunk) => wrapExprSpans(chunk, tags));
  return s;
}

// Is the whole label a single SQL statement (possibly wrapped over <br/> lines)?
// Starts with a clause keyword and every token is SQL, a keyword, a column/table
// name (lowercase, not a prose word), a number, string, function call, operator
// or comma. Lets a multi-line statement wrap as ONE span instead of per line.
const SQL_OPEN_RE = new RegExp(`^(?:${SQL_OPENERS.join("|")})\\b`);
function isWholeSql(s) {
  if (!SQL_OPEN_RE.test(s)) return false;
  for (const tok of sqlTokenize(s)) {
    const t = tok.t;
    if (/^\s+$/.test(t)) continue;
    if (/^[A-Za-z_]\w*$/.test(t)) {
      if (/[a-z]/.test(t) && SQL_PROSE.has(t.toLowerCase())) return false; // prose word
      continue; // keyword, function, or column/table name
    }
    if (/^-?\d/.test(t) || /^0x/i.test(t) || /^['"]/.test(t) || t === "...") continue;
    if (/^[(),.;*%]$/.test(t) || /^(?:===?|!==?|>=|<=|<>|[<>=])$/.test(t)) continue;
    return false; // :, ?, →, /, |, -, or any other non-SQL token
  }
  return true;
}

// Whole-label code the conservative isWholeCode misses: shell commands, numeric
// array literals, LINQ query syntax (reads as English but is code), and complete
// SQL statements.
function isWholeCodeExtra(raw) {
  const s = normalize(raw);
  if (!s) return false;
  if (/^(git|npm|npx|yarn|pnpm|pip3?|cd|cargo|dotnet|node|docker)\s+\S/.test(s)) return true;
  if (/^\[\s*-?\d[\d\s,.]*\]$/.test(s)) return true; // [1, 2, 3]
  if (/^from\s+\w+\s+in\s+\S.*\bselect\b/i.test(s)) return true; // LINQ query
  if (isWholeSql(s)) return true;
  return false;
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
  if (isWholeCode(inner) || isWholeCodeExtra(inner)) {
    out = `<code>${escHtml(inner)}</code>`;
    tags.push(normalize(inner));
  } else {
    let any = false;
    out = inner
      .split(/(<br\s*\/?>)/i)
      .map((seg) => {
        if (/^<br/i.test(seg)) return seg;
        const coded = seg.replace(SPAN, (s) => {
          const plain = s.match(/^([A-Za-z_]\w*)\(([^()]*)\)$/);
          if (plain && (!isCodeName(plain[1]) || plain[2].trim() === "s"))
            return s; // math notation / "word(s)" pluralization
          if (isProseName(s)) return s; // product name / domain
          any = true;
          tags.push(s);
          return `<code>${escHtml(s)}</code>`;
        });
        // Then the continuation pass (SQL clauses + expression spans) on the
        // prose still left outside any <code> the conservative rules wrapped.
        const next = wrapOutsideCode(coded, (chunk) => wrapNewSpans(chunk, tags));
        if (next !== seg) any = true;
        return next;
      })
      .join("");
    if (!any) return { label: rawLabel, tags: [] };
  }
  return { label: `"${out.replace(/"/g, "&quot;")}"`, tags };
}

// Find edge labels, the text inside the `|…|` of `A -->|"INSERT, UPDATE"| B`.
// Tracks shape-bracket depth and quotes so a pipe *inside* a node label (e.g.
// the linked-list cell `["a | next"]`) is never mistaken for an edge label.
function findEdgeLabels(line) {
  const out = [];
  const N = line.length;
  let depth = 0;
  let i = 0;
  while (i < N) {
    const ch = line[i];
    if (ch === '"') {
      i++;
      while (i < N && line[i] !== '"') { if (line[i] === "\\") i++; i++; }
      i++;
      continue;
    }
    if (ch === "[" || ch === "{" || ch === "(") { depth++; i++; continue; }
    if (ch === "]" || ch === "}" || ch === ")") { if (depth > 0) depth--; i++; continue; }
    if (ch === "|" && depth === 0) {
      let j = i + 1;
      while (j < N && line[j] !== "|") {
        if (line[j] === '"') { j++; while (j < N && line[j] !== '"') { if (line[j] === "\\") j++; j++; } }
        j++;
      }
      if (j < N) { out.push({ contentStart: i + 1, contentEnd: j }); i = j + 1; continue; }
    }
    i++;
  }
  return out;
}

function processLine(line, isFlow) {
  if (!isFlow) return { line, tags: [] };
  // Bare subgraph title (`subgraph users.js`): wrap a code-like title, rewriting
  // to the `subgraph <id>["…"]` form (the id keeps the original token). Bracketed
  // titles (`subgraph id["…"]`) fall through to findNodes below.
  const sg = line.match(/^(\s*subgraph\s+)([^\s"\[][^"\[\n]*?)(\s*)$/);
  if (sg) {
    const res = rewriteLabel(sg[2]);
    if (res.tags.length && res.label !== sg[2])
      return { line: `${sg[1]}${sg[2]}[${res.label}]${sg[3]}`, tags: res.tags };
    return { line, tags: [] };
  }
  if (SKIP_LINE.test(line)) return { line, tags: [] };
  // Node labels and edge labels are disjoint (nodes live inside shape brackets,
  // edge labels between pipes at bracket depth 0); rewrite each span in place.
  const spans = [
    ...findNodes(line).map((n) => ({ start: n.contentStart, end: n.contentEnd })),
    ...findEdgeLabels(line).map((e) => ({ start: e.contentStart, end: e.contentEnd })),
  ].sort((a, b) => a.start - b.start);
  if (!spans.length) return { line, tags: [] };
  const tags = [];
  let out = "";
  let pos = 0;
  for (const s of spans) {
    const raw = line.slice(s.start, s.end);
    const res = rewriteLabel(raw);
    out += line.slice(pos, s.start);
    if (res.tags.length && res.label !== raw) {
      out += res.label;
      tags.push(...res.tags);
    } else {
      out += raw;
    }
    pos = s.end;
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
