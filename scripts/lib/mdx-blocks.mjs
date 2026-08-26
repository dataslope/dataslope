/**
 * Pulls the runnable components out of MDX source: `<CodeBlock>` and
 * `<ChallengeCard>`. Shared by check-code-blocks.mjs and
 * check-challenge-cards.mjs — a drifted second parser under-reports silently.
 *
 * Props like `files={[…]}` and `tests={[…]}` are JavaScript literals holding
 * template literals holding code in a third language, so they are located by
 * balancing delimiters and evaluated with `new Function` rather than regexed.
 * The input is this repo's own content, which is also the site build's input.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export const CONTENT_DIR = "content";

/**
 * Split a `--filter` value into the substrings it selects. Comma-separated so
 * CI can hand a sweep exactly the files a pull request touched.
 */
export function parseFilter(value) {
  if (value === null || value === undefined) return null;
  const parts = String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // An explicitly empty filter selects nothing: CI computes this from a diff,
  // and "no content changed" must not widen into a full sweep.
  return parts;
}

/**
 * Does a block or card match any substring in a parsed filter?
 *
 * @param {string[]} parts substrings from `parseFilter`
 * @param {string} file the block's or card's source path
 * @param {string|null} [extra] a card title, so the challenge sweep keeps its
 *   `--filter "Two Sum"` ergonomic alongside the path lists CI passes
 * @returns {boolean}
 */
export function matchesFilter(parts, file, extra = null) {
  return parts.some((p) => file.includes(p) || (extra !== null && extra.includes(p)));
}

/** Walk from `open` (index of the char after `<Tag`) to the matching `/>`,
 *  tracking brace/bracket depth and skipping over string literals so a `>` or
 *  `}` inside code never ends the tag early. */
export function tagEnd(src, open) {
  let i = open;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "`" || c === '"' || c === "'") {
      const quote = c;
      i += 1;
      while (i < src.length) {
        if (src[i] === "\\") i += 2;
        else if (src[i] === quote) break;
        else i += 1;
      }
    } else if (c === "{" || c === "[") depth += 1;
    else if (c === "}" || c === "]") depth -= 1;
    else if (c === "/" && src[i + 1] === ">" && depth === 0) return i + 2;
    i += 1;
  }
  return -1;
}

/** Read a backtick-delimited template literal starting at `start` (the
 *  backtick), returning [text, indexAfterClosingBacktick]. Handles the
 *  escapes MDX authors actually use: \` and \\ and \$. */
export function readTemplate(src, start) {
  let i = start + 1;
  let out = "";
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      const next = src[i + 1];
      // Resolve escapes the way JavaScript resolves them: \n/\t/\r are real
      // control characters, or an inline `def f():\n    return 1` extracts as
      // Python with a literal backslash. A printed `"\\n"` still arrives as
      // backslash-n via the `\\` case.
      const simple = { n: "\n", t: "\t", r: "\r" };
      if (next in simple) {
        out += simple[next];
        i += 2;
        continue;
      }
      if (next === "`" || next === "\\" || next === "$") {
        out += next;
        i += 2;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (c === "`") return [out, i + 1];
    out += c;
    i += 1;
  }
  return [out, i];
}

/** The source text of `name={…}`, braces excluded, or null if absent. */
export function propSource(raw, name) {
  const key = new RegExp(`\\b${name}\\s*=\\s*\\{`).exec(raw);
  if (!key) return null;
  const open = key.index + key[0].length;
  let i = open;
  let depth = 1;
  while (i < raw.length) {
    const c = raw[i];
    if (c === "`" || c === '"' || c === "'") {
      const quote = c;
      i += 1;
      while (i < raw.length) {
        if (raw[i] === "\\") i += 2;
        else if (raw[i] === quote) break;
        else i += 1;
      }
    } else if (c === "{" || c === "[") depth += 1;
    else if (c === "}" || c === "]") {
      depth -= 1;
      if (depth === 0) return raw.slice(open, i);
    }
    i += 1;
  }
  return null;
}

/** Evaluate `name={…}` as the JavaScript literal it is. Throws with the prop
 *  name attached — a silently dropped card looks like a passing one. */
export function propValue(raw, name) {
  const src = propSource(raw, name);
  if (src === null) return undefined;
  try {
    return new Function(`return (${src})`)();
  } catch (err) {
    throw new Error(`could not evaluate ${name}={…}: ${err.message}`);
  }
}

/** A plain `name="value"` attribute. */
export function propString(raw, name) {
  return raw.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

/**
 * A prop that carries text, in either syntax MDX allows: `name="value"` or
 * ``name={`value`}``. The template-literal form matters: the SQL props are
 * all authored that way, and `propString` alone made the sweep run empty
 * strings that reported as passes.
 */
export function propText(raw, name) {
  const plain = propString(raw, name);
  if (plain !== undefined) return plain;
  const src = propSource(raw, name);
  if (src === null) return undefined;
  const trimmed = src.trim();
  if (trimmed.startsWith("`")) {
    const at = src.indexOf("`");
    return readTemplate(src, at)[0];
  }
  // A quoted string inside braces, e.g. name={"value"}.
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * A boolean JSX prop, in either form MDX allows: bare `expectError` or
 * `expectError={true}`. `expectError` marks a block whose lesson is the
 * failure; the sweeps assert it in both directions, since a block that stops
 * raising is a regression nothing else would catch.
 */
export function propFlag(raw, name) {
  const explicit = new RegExp(`\\b${name}\\s*=\\s*\\{\\s*(true|false)\\s*\\}`).exec(raw);
  if (explicit) return explicit[1] === "true";
  // Bare `expectError`, not followed by `=`.
  return new RegExp(`\\b${name}\\s*(?![=\\w])`).test(raw);
}

export function mdxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...mdxFiles(p));
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out.sort();
}

/** Offset just past the closing `---` of YAML frontmatter, or 0 when a file
 *  has none. Frontmatter is prose *about* the page and routinely names the
 *  components the page demonstrates. */
function bodyStart(src) {
  if (!src.startsWith("---")) return 0;
  const close = src.indexOf("\n---", 3);
  return close === -1 ? 0 : close + 4;
}

/**
 * Is `idx` inside an inline code span? Lessons discuss the components they
 * use, and prose mentioning a tag must not be reported as an unterminated
 * tag.
 */
function insideCode(src, idx) {
  // Odd backtick count earlier on the same line = inside an inline code span.
  // Only the same line is considered: a document-level fence parity count
  // flips inside `markdown={…}` / `starterCode={…}` props and discards real
  // tags after it. A real tag opens its own line, so this cannot swallow one.
  const before = src.slice(0, idx);
  const lineStart = before.lastIndexOf("\n") + 1;
  const ticks = (before.slice(lineStart).match(/`/g) ?? []).length;
  return ticks % 2 === 1;
}

/**
 * Advance a top-level fence state across `text`, returning the new state.
 * Safe only because the caller feeds in the text *between* tags, never a
 * tag's own body — so fences inside props are invisible by construction (a
 * document-wide count flips mid-prop and loses real tags).
 */
function advanceFence(text, open) {
  for (const line of text.split("\n")) {
    // CommonMark: 3+ backticks up to three spaces deep, and the info string
    // may not contain a backtick — that clause is what separates a fence from
    // an inline span written with triple backticks mid-sentence. Tildes take
    // the looser rule.
    if (/^ {0,3}`{3,}[^`]*$/.test(line) || /^ {0,3}~{3,}/.test(line)) open = !open;
  }
  return open;
}

/**
 * Every `<Tag …/>` in `content/`, as `{file, line, raw}`.
 *
 * Load-bearing details: frontmatter is skipped (its prose mentions tags); an
 * unterminated match skips that occurrence rather than abandoning the file
 * (a `break` here once hid ~100 tags from the sweeps); and a tag inside a
 * top-level fence is documentation of a component, not a component (the
 * fumadocs-dev demo pages print their own MDX source). An unterminated tag is
 * still yielded with `unterminated: true` and no `raw`, so callers count it —
 * a component this module cannot read must be loud.
 */
export function* eachTag(tag, root = CONTENT_DIR) {
  const opener = `<${tag}`;
  for (const file of mdxFiles(root)) {
    const src = readFileSync(file, "utf8");
    const rel = relative(process.cwd(), file);
    let idx = bodyStart(src);
    // `scanned` tracks how far fence parity has been carried; tag bodies are
    // jumped over, keeping prop-level fences out of it.
    let scanned = idx;
    let fenced = false;
    for (;;) {
      const tagAt = src.indexOf(opener, idx);
      if (tagAt === -1) break;

      idx = tagAt;
      fenced = advanceFence(src.slice(scanned, tagAt), fenced);
      scanned = tagAt;
      // `<CodeBlock` must not match `<CodeBlockSomething`.
      const after = src[idx + opener.length];
      if (/[A-Za-z0-9]/.test(after) || insideCode(src, idx) || fenced) {
        idx += opener.length;
        continue;
      }
      const end = tagEnd(src, idx + opener.length);
      const line = src.slice(0, idx).split("\n").length;
      if (end === -1) {
        yield { file: rel, line, raw: null, unterminated: true };
        idx += opener.length;
        continue;
      }
      const raw = src.slice(idx, end);
      idx = end;
      scanned = end;
      yield { file: rel, line, raw };
    }
  }
}

/** Pull `filename` / `initCode` / `starterCode` / `solutionCode` out of one
 *  `files={[...]}` literal, in source order. */
export function parseFiles(block) {
  const files = [];
  const keyRe = /(filename|initCode|starterCode|solutionCode)\s*:\s*/g;
  let current = null;
  let m;
  while ((m = keyRe.exec(block)) !== null) {
    const valueStart = m.index + m[0].length;
    const ch = block[valueStart];
    let value;
    let after;
    if (ch === "`") {
      [value, after] = readTemplate(block, valueStart);
    } else if (ch === '"' || ch === "'") {
      const end = block.indexOf(ch, valueStart + 1);
      value = block.slice(valueStart + 1, end);
      after = end + 1;
    } else {
      continue;
    }
    keyRe.lastIndex = after;
    if (m[1] === "filename") {
      current = { filename: value, initCode: "", starterCode: "", solutionCode: "" };
      files.push(current);
    } else if (current) {
      current[m[1]] = value;
    }
  }
  return files;
}

export function parseDatasets(block) {
  const out = [];
  const re = /path:\s*"([^"]+)"(?:\s*,\s*stageAs:\s*"([^"]+)")?/g;
  let m;
  while ((m = re.exec(block)) !== null) out.push({ path: m[1], stageAs: m[2] ?? m[1] });
  return out;
}

/** Every `<CodeBlock>` for the given adapter, with the source Run executes. */
export function extractBlocks(root = CONTENT_DIR, adapter = "python") {
  const blocks = [];
  for (const { file, line, raw, unterminated } of eachTag("CodeBlock", root)) {
    if (unterminated) {
      blocks.push({ file, line, unparsable: "tag never closed" });
      continue;
    }
    if (propString(raw, "adapter") !== adapter) continue;
    const files = parseFiles(raw);
    if (files.length === 0) continue;
    const entryName = propString(raw, "entryFilename");
    const entry = files.find((f) => f.filename === entryName) ?? files[0];
    blocks.push({
      file,
      line,
      datasets: parseDatasets(raw),
      files,
      entry: entry.filename,
      expectError: propFlag(raw, "expectError"),
      // The block's STDIN panel, or undefined where it has none. `undefined`
      // and `""` are different blocks to `blockOutputKey`, so the absent case
      // must not collapse into the empty one.
      stdin: propText(raw, "stdin"),
      // What Run executes: the hidden setup, then the visible buffer.
      code: `${entry.initCode ? `${entry.initCode}\n` : ""}${entry.starterCode}`,
    });
  }
  return blocks;
}

/** Every `<ChallengeCard>` for the given adapter, with the source that Check
 *  Answer executes when the reference solution is in the editor. */
export function extractChallengeCards(root = CONTENT_DIR, adapter = "python") {
  const cards = [];
  for (const { file, line, raw, unterminated } of eachTag("ChallengeCard", root)) {
    if (unterminated) {
      cards.push({ file, line, title: "(unterminated tag)", unparsable: "tag never closed" });
      continue;
    }
    if (propString(raw, "adapter") !== adapter) continue;
    const title = propString(raw, "title") ?? "(untitled)";
    const files = parseFiles(raw);
    if (files.length === 0) continue;
    const entryName = propString(raw, "entryFilename");
    const entry = files.find((f) => f.filename === entryName) ?? files[0];

    let tests;
    try {
      tests = propValue(raw, "tests") ?? [];
    } catch (err) {
      cards.push({ file, line, title, unparsable: err.message });
      continue;
    }

    // Which buffers the Solution button fills, mirroring `solutionFiles` in
    // ChallengeCard.tsx: a file with `solutionCode` shows that, otherwise its
    // starter. Must consider every file, not just the entry — multi-file
    // cards keep the exercise in sibling modules, and grading siblings from
    // their starters would grade a card against its own blanks.
    const solved = files.filter((f) => f.solutionCode);
    for (const f of files) f.solutionSource = f.solutionCode || f.starterCode;

    cards.push({
      file,
      line,
      title,
      datasets: parseDatasets(raw),
      files,
      entry: entry.filename,
      tests,
      // The card's STDIN panel, or undefined where it has none. On a card
      // this is part of the question: the tests grade output produced from
      // it, so a sweep that runs the solution on an empty stream grades a
      // different program than the learner sees.
      stdin: propText(raw, "stdin"),
      // What Check Answer runs: the hidden setup, then the solution buffer.
      // A card where no file supplies a solution has nothing to verify.
      solution:
        solved.length > 0
          ? `${entry.initCode ? `${entry.initCode}\n` : ""}${entry.solutionSource}`
          : null,
    });
  }
  return cards;
}

/**
 * Every `<SqlCodeBlock>` in `content/`, with the SQL that Run executes.
 *
 * `tables` is deliberately ignored: it drives the table-viewer sidebar and has
 * no bearing on whether the SQL runs.
 */
export function extractSqlBlocks(root = CONTENT_DIR, dialect = null) {
  const blocks = [];
  for (const { file, line, raw, unterminated } of eachTag("SqlCodeBlock", root)) {
    if (unterminated) {
      blocks.push({ file, line, unparsable: "tag never closed" });
      continue;
    }
    const d = propString(raw, "dialect");
    if (dialect && d !== dialect) continue;
    blocks.push({
      file,
      line,
      dialect: d,
      title: propString(raw, "title") ?? "(untitled)",
      initSql: propText(raw, "initSql") ?? "",
      remoteInitSql: propString(raw, "remoteInitSql") ?? null,
      expectError: propFlag(raw, "expectError"),
      sql: propText(raw, "starterCode") ?? "",
    });
  }
  return blocks;
}

/**
 * Every `<SqlChallengeCard>`, with the SQL Check Answer runs once Solution
 * has filled the editor, plus the card's declarative tests. A card without
 * `solutionSql` cannot be verified and is counted rather than dropped.
 */
export function extractSqlCards(root = CONTENT_DIR, dialect = null) {
  const cards = [];
  for (const { file, line, raw, unterminated } of eachTag("SqlChallengeCard", root)) {
    if (unterminated) {
      cards.push({ file, line, title: "(unterminated tag)", unparsable: "tag never closed" });
      continue;
    }
    const d = propString(raw, "dialect");
    if (dialect && d !== dialect) continue;
    const title = propString(raw, "title") ?? "(untitled)";
    let tests;
    try {
      tests = propValue(raw, "tests") ?? [];
    } catch (err) {
      cards.push({ file, line, title, dialect: d, unparsable: err.message });
      continue;
    }
    cards.push({
      file,
      line,
      title,
      dialect: d,
      initSql: propText(raw, "initSql") ?? "",
      remoteInitSql: propString(raw, "remoteInitSql") ?? null,
      starterSql: propText(raw, "starterCode") ?? "",
      solutionSql: propText(raw, "solutionSql") ?? null,
      tests,
    });
  }
  return cards;
}
