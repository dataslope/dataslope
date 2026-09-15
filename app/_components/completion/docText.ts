/** Shaping what a runtime says about a symbol into what a tooltip shows.
 *
 *  Every language runtime answers `hover()` in its own way, and some answers
 *  are hostile to a panel: jedi hands back a property's entire source with
 *  the newlines collapsed when it has no signature to give, and a numpydoc
 *  docstring runs to thousands of characters. The panel is bounded and
 *  scrolls, so length is survivable, but a signature line has to stay a
 *  signature line — which is a property of the text, not of the CSS.
 */

/** Characters kept in the signature line above a hover's documentation.
 *  Long enough for a real Python signature with type hints, short enough
 *  that a runtime handing back a whole file cannot take over the panel. */
export const MAX_SIGNATURE_CHARS = 200;

/** Characters kept in a documentation body. The panel scrolls, so this is
 *  only a stop against a pathological docstring (some numpy entries run past
 *  20,000) rather than a reading limit. */
export const MAX_DOC_CHARS = 4000;

const ELLIPSIS = "…";

/** Docstring openers, for cutting a definition's source back to its first
 *  line when a runtime hands over more than it should. */
const DOCSTRING_MARKERS = ['"""', "'''"];

/** Clamp to `limit`, breaking at the last space so a word is not cut in
 *  half, and mark the cut. */
function clampWords(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${kept.trimEnd()}${ELLIPSIS}`;
}

/**
 * The one-line signature a hover shows above its documentation.
 *
 * Takes the text up to any docstring that follows it, keeps the first line,
 * and collapses the whitespace so a signature that was wrapped across lines
 * reads as one. Returns "" when there is nothing worth a header.
 */
export function signatureLine(
  title: string | undefined,
  limit = MAX_SIGNATURE_CHARS,
): string {
  if (!title) return "";
  let text = title;
  for (const marker of DOCSTRING_MARKERS) {
    const at = text.indexOf(marker);
    if (at !== -1) text = text.slice(0, at);
  }
  // A runtime that answers with a definition ends the line at `:` or `{`;
  // neither belongs in a header.
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const collapsed = firstLine
    .replace(/\s+/g, " ")
    .trim()
    // Trim the space the stripped punctuation leaves behind, too.
    .replace(/\s*[:{]$/, "");
  return clampWords(collapsed, limit);
}

/**
 * The documentation body, with its line structure intact — the sections of a
 * numpydoc docstring are unreadable once they run together — and trimmed of
 * the noise that makes a pre-wrapped block look ragged: trailing spaces, and
 * runs of blank lines.
 */
export function docBody(
  doc: string | undefined,
  limit = MAX_DOC_CHARS,
): string {
  if (!doc) return "";
  const normalised = doc
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (normalised.length <= limit) return normalised;
  // Cut at a line boundary: half a line of a doctest example is worse than
  // one line fewer.
  const cut = normalised.slice(0, limit);
  const lastBreak = cut.lastIndexOf("\n");
  const kept = lastBreak > limit * 0.6 ? cut.slice(0, lastBreak) : cut;
  return `${kept.trimEnd()}\n${ELLIPSIS}`;
}
