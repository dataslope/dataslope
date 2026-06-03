// Format the starter/solution code of every <CodeBlock>, <ChallengeCard>,
// <SqlCodeBlock> and <SqlChallengeCard> in the learn content, using the
// EXACT same formatters the website's "Format code" button uses:
//
//   python      ruff_fmt        (4-space)
//   javascript  web_fmt         (2-space — see WEB_FMT_2SPACE)
//   typescript  web_fmt         (2-space)
//   php         mago_fmt        (4-space)
//   c / cpp     clang-format    LLVM    (2-space)
//   java        clang-format    LLVM    (2-space)
//   csharp      clang-format    Microsoft (4-space)
//   r           styler          tidyverse (2-space, run inside WebR)
//   sql         sql-formatter   (dialect-aware, 2-space)
//
// Props formatted: `starterCode` (all), `solutionCode` (language challenge
// cards) and `solutionSql` (SQL challenge cards). `initCode`/`initSql`,
// `tests` and `instructions` are left untouched.
//
// Usage:
//   node scripts/format-content.mjs            # format everything
//   node scripts/format-content.mjs <glob...>  # restrict to matching files
//   DRY=1 node scripts/format-content.mjs ...   # report only, write nothing
//
// The script associates each code prop with the nearest preceding component
// opener so it picks the right language/dialect, and formats *every* textual
// occurrence — including the mirrored ```jsx fences on the SQL demo pages —
// so the live JSX and its echoed source stay in sync.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content", "learn");
const DRY = !!process.env.DRY;

// ── formatter loaders (lazy, memoised) ──────────────────────────────────
let _ruff, _web, _clang, _mago, _sql, _webr, _stylerReady;

async function ruff() {
  _ruff ??= (await import("@wasm-fmt/ruff_fmt/node")).format;
  return _ruff;
}
async function web() {
  _web ??= (await import("@wasm-fmt/web_fmt/node")).format;
  return _web;
}
async function clang() {
  _clang ??= (await import("@wasm-fmt/clang-format/node")).format;
  return _clang;
}
async function mago() {
  _mago ??= (await import("@wasm-fmt/mago_fmt/node")).format;
  return _mago;
}
async function sqlFmt() {
  _sql ??= (await import("sql-formatter")).format;
  return _sql;
}
async function webr() {
  if (!_webr) {
    const { WebR } = await import("webr");
    const w = new WebR();
    await w.init();
    _stylerReady = (async () => {
      await w.installPackages(["styler"]);
    })();
    _webr = w;
  }
  await _stylerReady;
  return _webr;
}

const WEB_2SPACE = { indentStyle: "space", indentWidth: 2 };

// language id → async (code) => formatted code
const FORMATTERS = {
  python: async (c) => (await ruff())(c, "main.py"),
  javascript: async (c) => (await web())(c, "script.js", WEB_2SPACE),
  typescript: async (c) => (await web())(c, "script.ts", WEB_2SPACE),
  php: async (c) => (await mago())(c, "main.php"),
  c: async (c) => (await clang())(c, "main.c", "LLVM"),
  cpp: async (c) => (await clang())(c, "main.cpp", "LLVM"),
  java: async (c) => (await clang())(c, "Main.java", "LLVM"),
  csharp: async (c) => (await clang())(c, "Main.cs", "Microsoft"),
  r: async (c) => formatR(c),
  "sql:sqlite": async (c) => (await sqlFmt())(c, { language: "sqlite" }),
  "sql:duckdb": async (c) => (await sqlFmt())(c, { language: "duckdb" }),
  "sql:postgres": async (c) => (await sqlFmt())(c, { language: "postgresql" }),
};

async function formatR(code) {
  const w = await webr();
  await w.FS.writeFile("/tmp/_fmt_in.R", new TextEncoder().encode(code));
  await w.evalRVoid(`local({
  unlink(c("/tmp/_fmt_out.R", "/tmp/_fmt_err"))
  tryCatch({
    styled <- as.character(styler::style_text(readLines("/tmp/_fmt_in.R", warn = FALSE)))
    writeLines(styled, "/tmp/_fmt_out.R")
  }, error = function(e) writeLines(conditionMessage(e), "/tmp/_fmt_err"))
})`);
  let err = "";
  try {
    err = new TextDecoder().decode(await w.FS.readFile("/tmp/_fmt_err")).trim();
  } catch {}
  if (err) throw new Error(err);
  const out = await w.FS.readFile("/tmp/_fmt_out.R");
  return new TextDecoder().decode(out);
}

// ── prop association: which language formats this component's code? ──────
// adapter id → formatter key
function langForAdapter(adapter) {
  return FORMATTERS[adapter] ? adapter : null;
}
function sqlKeyForDialect(d) {
  if (d === "sqlite") return "sql:sqlite";
  if (d === "duckdb") return "sql:duckdb";
  return "sql:postgres"; // postgres / pglite
}

// Component openers, in priority order (longest tag first so SqlCodeBlock
// isn't shadowed by CodeBlock).
const OPENER_RE =
  /<(SqlChallengeCard|SqlCodeBlock|ChallengeCard|CodeBlock)\b/g;

// For a component, the props we format and how to resolve the language.
function buildOpeners(src) {
  const openers = [];
  let m;
  OPENER_RE.lastIndex = 0;
  while ((m = OPENER_RE.exec(src))) {
    const type = m[1];
    const start = m.index;
    openers.push({ type, start });
  }
  // Resolve adapter/dialect for each opener by scanning forward to the next
  // opener (bounded) for the relevant attribute.
  for (let i = 0; i < openers.length; i++) {
    const end = i + 1 < openers.length ? openers[i + 1].start : src.length;
    const region = src.slice(openers[i].start, end);
    const o = openers[i];
    if (o.type === "CodeBlock" || o.type === "ChallengeCard") {
      const a = region.match(/\badapter\s*=\s*"([^"]+)"/);
      o.lang = a ? langForAdapter(a[1]) : null;
      o.rawAttr = a?.[1] ?? null;
    } else {
      const d = region.match(/\bdialect\s*=\s*"([^"]+)"/);
      o.lang = d ? sqlKeyForDialect(d[1]) : "sql:postgres";
      o.rawAttr = d?.[1] ?? null;
    }
  }
  return openers;
}

function langAt(openers, index) {
  let chosen = null;
  for (const o of openers) {
    if (o.start <= index) chosen = o;
    else break;
  }
  return chosen?.lang ?? null;
}

// ── template-literal extraction ─────────────────────────────────────────
// Given src and the index of the opening backtick, return the index of the
// matching closing backtick (honouring \` escapes), or -1.
function findCloseBacktick(src, openBacktick) {
  let i = openBacktick + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "`") return i;
    i++;
  }
  return -1;
}

// raw template body → runtime string
function evalTemplate(body) {
  // Safe: our scanner guarantees no unescaped backtick; interpolations are
  // authored as \${ so none execute.
  return new Function("return `" + body + "`")();
}

// runtime string → escaped template body
function escapeTemplate(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

const PROP_RE = /\b(starterCode|solutionCode|solutionSql)\s*=\s*\{\s*`/g;

const stats = {
  files: 0,
  changed: 0,
  formatted: 0,
  unchanged: 0,
  skippedNoLang: 0,
  failed: [],
};

async function processFile(file) {
  let src = fs.readFileSync(file, "utf8");
  if (!/<(SqlChallengeCard|SqlCodeBlock|ChallengeCard|CodeBlock)\b/.test(src)) {
    return;
  }
  stats.files++;
  const openers = buildOpeners(src);

  // Collect prop matches with their template spans.
  const edits = [];
  let m;
  PROP_RE.lastIndex = 0;
  while ((m = PROP_RE.exec(src))) {
    const prop = m[1];
    const openBacktick = m.index + m[0].length - 1; // index of the `
    const close = findCloseBacktick(src, openBacktick);
    if (close === -1) {
      stats.failed.push(`${file}: ${prop}: unterminated template literal`);
      continue;
    }
    const lang = langAt(openers, m.index);
    edits.push({ prop, bodyStart: openBacktick + 1, bodyEnd: close, lang });
    PROP_RE.lastIndex = close + 1;
  }

  // Format each (sequential — formatters are stateful singletons).
  const replacements = [];
  for (const e of edits) {
    if (!e.lang) {
      stats.skippedNoLang++;
      continue;
    }
    const rawBody = src.slice(e.bodyStart, e.bodyEnd);
    let original;
    try {
      original = evalTemplate(rawBody);
    } catch (err) {
      stats.failed.push(`${file}: ${e.prop}: eval failed: ${err.message}`);
      continue;
    }
    let formatted;
    try {
      formatted = await FORMATTERS[e.lang](original);
    } catch (err) {
      stats.failed.push(
        `${file}: ${e.prop} [${e.lang}]: ${String(err.message || err).split("\n")[0]}`,
      );
      continue;
    }
    if (formatted === original) {
      stats.unchanged++;
      continue;
    }
    replacements.push({
      start: e.bodyStart,
      end: e.bodyEnd,
      text: escapeTemplate(formatted),
    });
    stats.formatted++;
  }

  if (replacements.length === 0) return;
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    src = src.slice(0, r.start) + r.text + src.slice(r.end);
  }
  stats.changed++;
  if (!DRY) fs.writeFileSync(file, src);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

const argFilters = process.argv.slice(2);
let files = walk(CONTENT);
if (argFilters.length) {
  files = files.filter((f) => argFilters.some((g) => f.includes(g)));
}
files.sort();

console.log(`Formatting ${files.length} file(s)${DRY ? " (DRY RUN)" : ""}…`);
for (const f of files) {
  await processFile(f);
}

console.log("\n──── summary ────");
console.log(`files scanned:     ${stats.files}`);
console.log(`files changed:     ${stats.changed}`);
console.log(`snippets formatted:${stats.formatted}`);
console.log(`already formatted: ${stats.unchanged}`);
console.log(`skipped (no lang): ${stats.skippedNoLang}`);
console.log(`failures:          ${stats.failed.length}`);
for (const f of stats.failed.slice(0, 80)) console.log("  ✗ " + f);
if (stats.failed.length > 80)
  console.log(`  … and ${stats.failed.length - 80} more`);

process.exit(0);
