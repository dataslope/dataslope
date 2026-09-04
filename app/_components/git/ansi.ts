/**
 * Minimal ANSI SGR parser, so command output renders as color rather than as
 * escape-code garbage.
 *
 * just-bash does not colorize its own output — `ls --color` is an
 * unrecognised option — but it passes escapes straight through, so anything a
 * learner writes with `printf` or `echo -e` arrives with real escape sequences
 * in it. A terminal is the one place those must not show up as text.
 *
 * Colors are the classic 16, named rather than hex so the stylesheet can pick
 * values that work on both themes. Anything unrecognised is dropped rather
 * than printed.
 */

export interface AnsiSpan {
  text: string;
  /** Class suffixes: a color name, `bg-<name>`, and attribute flags. */
  classes: string[];
}

const FG: Record<number, string> = {
  30: "black",
  31: "red",
  32: "green",
  33: "yellow",
  34: "blue",
  35: "magenta",
  36: "cyan",
  37: "white",
  90: "bright-black",
  91: "bright-red",
  92: "bright-green",
  93: "bright-yellow",
  94: "bright-blue",
  95: "bright-magenta",
  96: "bright-cyan",
  97: "bright-white",
};

const BG: Record<number, string> = Object.fromEntries(
  Object.entries(FG).map(([code, name]) => [Number(code) + 10, name]),
);

const ATTR: Record<number, string> = {
  1: "bold",
  2: "dim",
  3: "italic",
  4: "underline",
  7: "inverse",
};

/** CSI sequences. The `m` (SGR) ones are honoured and every other final byte
 *  is discarded, so a stray cursor-movement code cannot leak into the
 *  transcript as text. */
const CSI = /\x1b\[([0-9;]*)([A-Za-z])/g;

/** Escapes worth parsing. Cheap enough to run on every line of output. */
export const hasAnsi = (text: string): boolean => text.includes("\x1b[");

export function parseAnsi(input: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  let fg: string | null = null;
  let bg: string | null = null;
  let attrs = new Set<string>();
  let last = 0;

  const push = (text: string) => {
    if (!text) return;
    const classes = [...(fg ? [fg] : []), ...(bg ? [`bg-${bg}`] : []), ...attrs];
    // Merge with the previous span when nothing changed, so a long plain line
    // stays one text node rather than dozens.
    const prev = spans[spans.length - 1];
    if (prev && prev.classes.join() === classes.join()) prev.text += text;
    else spans.push({ text, classes });
  };

  CSI.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CSI.exec(input)) !== null) {
    push(input.slice(last, match.index));
    last = match.index + match[0].length;
    if (match[2] !== "m") continue;

    const codes = match[1] === "" ? [0] : match[1].split(";").map(Number);
    for (let i = 0; i < codes.length; i += 1) {
      const code = codes[i];
      if (code === 0) {
        fg = null;
        bg = null;
        attrs = new Set();
      } else if (ATTR[code]) {
        attrs.add(ATTR[code]);
      } else if (code === 22) {
        attrs.delete("bold");
        attrs.delete("dim");
      } else if (code === 39) {
        fg = null;
      } else if (code === 49) {
        bg = null;
      } else if (FG[code]) {
        fg = FG[code];
      } else if (BG[code]) {
        bg = BG[code];
      } else if (code === 38 || code === 48) {
        // 256-color and truecolor: consume the arguments so their numbers are
        // not read as further codes, then fall back to the default color.
        if (codes[i + 1] === 5) i += 2;
        else if (codes[i + 1] === 2) i += 4;
      }
    }
  }
  push(input.slice(last));
  return spans;
}
