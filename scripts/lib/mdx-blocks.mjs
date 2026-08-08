/**
 * Pulls the runnable components out of MDX source: `<CodeBlock>` and
 * `<ChallengeCard>`.
 *
 * Shared by check-code-blocks.mjs and check-challenge-cards.mjs. Two sweeps
 * with two parsers would drift, and the failure mode of a drifted parser is
 * silent under-reporting: a block it cannot parse is a block that looks like it
 * passed.
 *
 * ── On evaluating props as JavaScript ──────────────────────────────────────
 *
 * `files={[…]}` and `tests={[…]}` are JavaScript array literals containing
 * template literals containing source code in a third language. Regexes get
 * `files` roughly right because its shape is predictable, but `tests` carries
 * arbitrary assertion code with braces, brackets and nested quotes in it, and
 * regexing that is a losing game.
 *
 * So the props are read by balancing delimiters to find the expression, and
 * then evaluated as what they are. `new Function` is the whole point rather
 * than a shortcut: JavaScript already knows how template literals nest and
 * escape, and the alternative is reimplementing that badly. The input is this
 * repo's own content, which is also the input to the site's build.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export const CONTENT_DIR = "content";

/**
 * Split a `--filter` value into the substrings it selects.
 *
 * Comma-separated so CI can hand a sweep exactly the files a pull request
 * touched. Checking one edited lesson takes seconds; checking all 1,694 blocks
 * to prove that one lesson still works takes 25 minutes, and a check nobody
 * wants to wait for is a check that gets bypassed.
 *
 * A single substring still behaves as it always did, so `--filter polars` is
 * unchanged.
 */
export function parseFilter(value) {
  if (value === null || value === undefined) return null;
  const parts = String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // An explicitly empty filter selects nothing rather than everything. CI
  // computes this list from a diff, and "no content files changed" must not
  // silently widen into a full sweep.
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
      // MDX hands the prop to JavaScript, so these are template-literal
      // escapes and have to be resolved the way JavaScript resolves them.
      //
      // \n, \t and \r are real control characters, not two characters. Leaving
      // them as backslash-n was wrong in the direction that hides work: a card
      // authored on one line as `def f():\n    return 1` extracted as Python
      // containing a literal backslash, which raises "unexpected character
      // after line continuation character" — a parser bug reported as broken
      // content. The `"\\n"` a lesson prints is written `\\n` in the source
      // and still arrives here as one backslash plus n, via the `\\` case.
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
 *  name attached, because a prop this parser cannot read must be loud: a
 *  silently dropped card is a card that appears to have passed. */
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
 * Is `idx` inside a fenced block or an inline code span?
 *
 * Lessons discuss the components they use — "A variable defined in one
 * `<CodeBlock>` is not visible to the next" appears in ten course overviews —
 * and prose about a tag is not a tag. Without this those matches are reported
 * as unterminated tags, which is noise in exactly the channel that has to stay
 * quiet enough to notice a real one.
 */
function insideCode(src, idx) {
  // An odd number of backticks earlier on the same line means this match is
  // inside an inline code span, which is how every one of these prose mentions
  // is written.
  //
  // Only the same line is considered. Counting ``` fences across the file
  // looks more thorough and is wrong: `markdown={…}` and `starterCode={…}`
  // props carry fenced blocks of their own, so a document-level parity count
  // flips inside a prop and starts discarding real tags after it (it lost 20
  // `<SqlCodeBlock>`s that way). A real tag opens its own line, so it has no
  // backticks before it and this cannot swallow one.
  const before = src.slice(0, idx);
  const lineStart = before.lastIndexOf("\n") + 1;
  const ticks = (before.slice(lineStart).match(/`/g) ?? []).length;
  return ticks % 2 === 1;
}

/**
 * Every `<Tag …/>` in `content/`, as `{file, line, raw}`.
 *
 * Two things here are load-bearing, and both were learned from this generator
 * quietly dropping work:
 *
 *   • Frontmatter is skipped. `description: Sandbox for
 *     \`<SqlChallengeCard dialect="postgres">\` variations.` is not a tag, has
 *     no `/>` to find, and used to be matched anyway.
 *   • A match whose tag never terminates skips that occurrence instead of
 *     abandoning the file. It used to `break`, so one unterminated match cost
 *     every remaining tag in that file: ~84 `<ChallengeCard>`s across nine
 *     files and ~20 `<CodeBlock>`s across thirteen were invisible to the
 *     sweeps, which then reported everything they *had* found as passing.
 *
 * An unterminated tag after the frontmatter is still yielded, with
 * `unterminated: true` and no `raw`, so callers count it rather than lose it.
 * The whole point of this module is that a component it cannot read is loud;
 * silently skipping one is the same defect in a politer form.
 */
export function* eachTag(tag, root = CONTENT_DIR) {
  const opener = `<${tag}`;
  for (const file of mdxFiles(root)) {
    const src = readFileSync(file, "utf8");
    const rel = relative(process.cwd(), file);
    let idx = bodyStart(src);
    for (;;) {
      const tagAt = src.indexOf(opener, idx);
      if (tagAt === -1) break;

      idx = tagAt;
      // `<CodeBlock` must not match `<CodeBlockSomething`.
      const after = src[idx + opener.length];
      if (/[A-Za-z0-9]/.test(after) || insideCode(src, idx)) {
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
    // ChallengeCard.tsx: every file is shown, one that supplies `solutionCode`
    // shows that and one that does not keeps its starter.
    //
    // Reading `solutionCode` off the *entry* alone was wrong in both
    // directions. On the multi-file cards in python-basics the entry is a
    // fixed driver the instructions say not to edit ("Do not edit main.py")
    // and the whole exercise lives in the sibling modules, so ten fully
    // solved cards looked unsolved and went unchecked. In the other
    // direction, `stage()` wrote siblings from `starterCode`, so a card whose
    // solution spanned files would have been graded against its own blanks —
    // it passes only if the tests never touch the sibling, which is a test
    // gap reported as a pass.
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
      initSql: propString(raw, "initSql") ?? "",
      remoteInitSql: propString(raw, "remoteInitSql") ?? null,
      sql: propString(raw, "starterCode") ?? "",
    });
  }
  return blocks;
}

/**
 * Every `<SqlChallengeCard>`, with the SQL Check Answer runs once the Solution
 * button has filled the editor, plus the card's declarative tests.
 *
 * `solutionSql` is the whole point of the card, so unlike the Python cards
 * there is no multi-file subtlety here: a card without one cannot be verified
 * and is counted rather than dropped.
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
      initSql: propString(raw, "initSql") ?? "",
      remoteInitSql: propString(raw, "remoteInitSql") ?? null,
      starterSql: propString(raw, "starterCode") ?? "",
      solutionSql: propString(raw, "solutionSql") ?? null,
      tests,
    });
  }
  return cards;
}
