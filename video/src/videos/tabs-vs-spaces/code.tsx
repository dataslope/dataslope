import React from "react";
import { colors, ds, syntax } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { CHAR_W, CODE_SIZE, CONTENT_W, LINE_H, SIDE } from "./layout";
import { DotsGlyph, SHADOW, SPACE, TAB, TabGlyph } from "./ui";

/** One unit of leading whitespace. */
export type Ws = "tab" | "space";
export const tabs = (n: number): Ws[] => Array.from({ length: n }, () => "tab");
export const spaces = (n: number): Ws[] => Array.from({ length: n }, () => "space");

export type Line = {
  ws?: Ws[];
  code: string;
  /** Row tint behind the line, e.g. to point at the line that fails. */
  tint?: string;
};

type Token = { text: string; color: string };

const KEYWORDS = new Set([
  "def",
  "if",
  "return",
  "for",
  "in",
  "func",
  "package",
  "import",
]);

/** Just enough highlighting for the snippets in this video. `ini` colours
 *  `key = value` pairs the way editors colour an .editorconfig. */
export function highlight(code: string, lang: "code" | "ini" = "code"): Token[] {
  if (lang === "ini") {
    if (code.startsWith("#")) return [{ text: code, color: syntax.comment }];
    const m = /^(\s*)([^=]+?)(\s*=\s*)(.*)$/.exec(code);
    if (!m) return [{ text: code, color: syntax.operator }];
    return [
      { text: m[1], color: syntax.plain },
      { text: m[2], color: syntax.fn },
      { text: m[3], color: syntax.operator },
      { text: m[4], color: /^\d+$/.test(m[4]) ? syntax.number : syntax.string },
    ];
  }
  const out: Token[] = [];
  const re = /(#.*$)|("[^"]*")|(\b\d+\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const text = m[0];
    let color: string = syntax.operator;
    if (m[1]) color = syntax.comment;
    else if (m[2]) color = syntax.string;
    else if (m[3]) color = syntax.number;
    else if (m[4]) {
      color = KEYWORDS.has(text)
        ? syntax.keyword
        : code.slice(re.lastIndex).startsWith("(")
          ? syntax.fn
          : syntax.plain;
    } else if (m[5]) color = syntax.plain;
    out.push({ text, color });
  }
  return out;
}

/**
 * One line of code with its leading whitespace drawn as elements: each tab a
 * blue arrow `tabWidth` columns wide, each space an orange dot one column
 * wide. `reveal` (0 to 1) is the "render whitespace" switch; at 0 the line
 * looks exactly as an editor shows it by default.
 */
export const CodeLine: React.FC<{
  line: Line;
  tabWidth?: number;
  reveal?: number;
  lang?: "code" | "ini";
  /** Lit-up overlay on one whitespace run, e.g. "the first tab". */
  mark?: { from: number; count: number; color: string; amount: number };
  children?: React.ReactNode;
}> = ({ line, tabWidth = 4, reveal = 1, lang = "code", mark, children }) => {
  const ws = line.ws ?? [];
  // Runs of the same kind, so a block of spaces renders as one dots strip.
  const runs: { kind: Ws; count: number; start: number }[] = [];
  ws.forEach((w, i) => {
    const last = runs[runs.length - 1];
    if (last && last.kind === w && w === "space") last.count++;
    else runs.push({ kind: w, count: 1, start: i });
  });
  const unitX = (i: number) =>
    ws.slice(0, i).reduce((x, w) => x + (w === "tab" ? tabWidth : 1) * CHAR_W, 0);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: LINE_H,
      }}
    >
      {line.tint ? (
        <div
          style={{
            position: "absolute",
            inset: "4px -36px",
            background: line.tint,
          }}
        />
      ) : null}
      {mark && mark.amount > 0 ? (
        <div
          style={{
            position: "absolute",
            left: unitX(mark.from) - 4,
            width: unitX(mark.from + mark.count) - unitX(mark.from) + 8,
            top: 6,
            bottom: 6,
            borderRadius: 14,
            border: `4px solid ${mark.color}`,
            opacity: mark.amount,
            transform: `scale(${0.85 + 0.15 * mark.amount})`,
          }}
        />
      ) : null}
      {runs.map((r) =>
        r.kind === "tab" ? (
          <TabGlyph
            key={r.start}
            width={tabWidth * CHAR_W}
            height={LINE_H}
            color={TAB.onDark}
            fill={`color-mix(in srgb, ${TAB.main} 26%, transparent)`}
            opacity={reveal}
          />
        ) : (
          <DotsGlyph
            key={r.start}
            count={r.count}
            cell={CHAR_W}
            height={LINE_H}
            color={SPACE.onDark}
            reveal={reveal}
          />
        ),
      )}
      <span style={{ position: "relative", whiteSpace: "pre" }}>
        {highlight(line.code, lang).map((t, i) => (
          <span key={i} style={{ color: t.color }}>
            {t.text}
          </span>
        ))}
      </span>
      {children}
    </div>
  );
};

/** A dark editor panel with a filename tab. Lines go in as children. */
export const CodePanel: React.FC<{
  top: number;
  left?: number;
  width?: number;
  filename: string;
  badge?: React.ReactNode;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ top, left = SIDE, width = CONTENT_W, filename, badge, style, bodyStyle, children }) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      width,
      borderRadius: 30,
      background: colors.codeBg,
      boxShadow: SHADOW,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        height: 66,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 34px",
        borderBottom: `2px solid ${ds("gray", 800)}`,
        fontFamily: MONO,
        fontSize: 30,
        fontWeight: 600,
        color: ds("gray", 400),
      }}
    >
      {filename}
      {badge}
    </div>
    <div
      style={{
        padding: "18px 36px",
        fontFamily: MONO,
        fontSize: CODE_SIZE,
        fontWeight: 400,
        color: syntax.plain,
        ...bodyStyle,
      }}
    >
      {children}
    </div>
  </div>
);
