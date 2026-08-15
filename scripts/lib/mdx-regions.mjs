/**
 * Which lines of an MDX file are *code* rather than prose — a `#` is a
 * heading in prose but a comment in Python, and a scanner that does not
 * exclude code will eventually splice a tag into a `files={[…]}` expression.
 *
 * Two region kinds, reported separately: `"fence"` (contents displayed
 * verbatim — a tag inside one is a code sample) and `"props"` (a component
 * props block spanning lines — a JavaScript expression, where a splice breaks
 * the parse). Components whose children are markdown are deliberately not
 * regions: a heading inside a `<Callout>` is a real heading.
 */

/** Components whose body is markdown, so their contents stay scannable. */
const MARKDOWN_CONTAINERS = new Set(["Callout", "Step", "Steps"]);

/**
 * Unescaped backticks on a line, used to track a props block's template
 * literals: a props block ends at the first `/>` *outside* its literals, and
 * those literals hold whole programs whose own `/>` must not close the tag
 * early.
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
