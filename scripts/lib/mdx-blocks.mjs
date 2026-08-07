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
      // MDX passes the string through JS, so \` \\ \$ are unescaped, and
      // \n inside a template literal is a literal backslash-n in Python
      // (used for "\\n" in print strings) — leave those alone.
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

/** Every `<Tag …/>` in `content/`, as `{file, line, raw}`. */
export function* eachTag(tag, root = CONTENT_DIR) {
  const opener = `<${tag}`;
  for (const file of mdxFiles(root)) {
    const src = readFileSync(file, "utf8");
    let idx = 0;
    while ((idx = src.indexOf(opener, idx)) !== -1) {
      // `<CodeBlock` must not match `<CodeBlockSomething`.
      const after = src[idx + opener.length];
      const end = tagEnd(src, idx + opener.length);
      if (end === -1) break;
      const raw = src.slice(idx, end);
      idx = end;
      if (/[A-Za-z0-9]/.test(after)) continue;
      yield { file: relative(process.cwd(), file), line: src.slice(0, idx).split("\n").length, raw };
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
  for (const { file, line, raw } of eachTag("CodeBlock", root)) {
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
  for (const { file, line, raw } of eachTag("ChallengeCard", root)) {
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

    cards.push({
      file,
      line,
      title,
      datasets: parseDatasets(raw),
      files,
      entry: entry.filename,
      tests,
      // What Check Answer runs: the hidden setup, then the solution buffer.
      // A card with no solutionCode has nothing to verify.
      solution: entry.solutionCode
        ? `${entry.initCode ? `${entry.initCode}\n` : ""}${entry.solutionCode}`
        : null,
    });
  }
  return cards;
}
