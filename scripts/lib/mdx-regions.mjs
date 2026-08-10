/**
 * Which lines of an MDX file are *code* rather than prose.
 *
 * The distinction matters because a `#` at the start of a line is a markdown
 * heading in prose and a comment in Python, a preprocessor directive in C, and
 * a shell comment in bash. Anything that scans an MDX file for headings and
 * does not first exclude code will eventually find one inside a `<CodeBlock>`
 * and act on it. That is not hypothetical: it is how a `<Chart>` tag ended up
 * spliced into the middle of a `files={[…]}` expression, which parses fine as
 * markdown and fails only at prerender, as `Could not parse expression with
 * acorn`.
 *
 * Two kinds of region are recognised, and the caller is told which is which
 * because they are not equally dangerous:
 *
 *   • `"fence"` — a fenced block, from ``` to the matching fence. Its contents
 *     are displayed verbatim, so a component tag inside one is a code sample,
 *     not a mistake. Several lessons legitimately show `<Welcome />` this way.
 *   • `"props"` — a component props block, from a component tag at column 0 to
 *     the `/>` or `</Tag>` that closes it. Its contents are a JavaScript
 *     expression, so anything spliced into one breaks the parse.
 *
 * Components whose *children* are markdown are deliberately not regions: a
 * heading inside a `<Callout>` is a real heading, and prose inside one is a
 * legitimate place for a figure.
 */

/** Components whose body is markdown, so their contents stay scannable. */
const MARKDOWN_CONTAINERS = new Set(["Callout", "Step", "Steps"]);

/**
 * Unescaped backticks on a line, which is how a props block's template literals
 * are tracked.
 *
 * They have to be, because a props block does not end at the first `/>` — it
 * ends at the first `/>` *outside* its template literals, and those literals
 * hold whole programs. A React sample containing
 *
 *     <SplitPanel
 *       left={…}
 *     />
 *
 * closes the enclosing `<CodeBlock>` three lines early if the literal is not
 * tracked, and every line of the rest of that sample then reads as prose. That
 * is not hypothetical either: it is how a `<Figure>` was placed into the middle
 * of a runnable React block, where it compiled to `Figure is not defined` and
 * cost a 1.2 hour browser suite to find.
 */
export const backticks = (line) => (line.match(/(?<!\\)`/g) ?? []).length;

/**
 * @param {string[]} lines
 * @returns {(null|"fence"|"props")[]} one entry per line, null for prose. The
 *   opening and closing lines of a region belong to it, so a caller can use
 *   `!code[i]` as "this line is safe to read as markdown".
 */
export function codeRegions(lines) {
  const code = new Array(lines.length).fill(null);
  let fence = null; // the opening fence string, e.g. "```"
  let component = null; // the tag name of the open props block
  let literal = false; // inside a template literal within that props block

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (fence !== null) {
      code[i] = "fence";
      if (line.trimStart().startsWith(fence)) fence = null;
      continue;
    }

    if (component !== null) {
      code[i] = "props";
      const odd = backticks(line) % 2 === 1;
      if (literal) {
        // Only the text after the closing backtick can end the tag; a `/>` before
        // it is part of the sample.
        if (!odd) continue;
        literal = false;
        const tail = line.slice(line.lastIndexOf("`") + 1);
        if (/\/>/.test(tail) || new RegExp(`</${component}>`).test(tail)) component = null;
        continue;
      }
      if (odd) {
        literal = true;
        continue;
      }
      if (/^\s*\/>/.test(line) || new RegExp(`^\\s*</${component}>`).test(line)) {
        component = null;
      }
      continue;
    }

    const fenceOpen = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceOpen) {
      code[i] = "fence";
      fence = fenceOpen[1];
      continue;
    }

    const tag = /^<([A-Z]\w*)/.exec(line);
    if (tag && !MARKDOWN_CONTAINERS.has(tag[1])) {
      // A component that opens and closes on its own line (`<Chart … />`) is
      // not a region; only a props block spanning lines is.
      if (!/\/>\s*$/.test(line)) {
        code[i] = "props";
        component = tag[1];
        literal = backticks(line) % 2 === 1;
      }
      continue;
    }
  }

  return code;
}

/** Heading level of a markdown line, or 0 if it is not a heading. */
export function headingLevel(line) {
  const m = /^(#{1,6})\s/.exec(line);
  return m ? m[1].length : 0;
}
