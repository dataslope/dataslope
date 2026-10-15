import React from "react";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { CODE } from "./data";
import { DraftBox, Layer, Letter } from "./draw";
import { BP, mix } from "./theme";

const METHODS = new Set(["log", "setTimeout", "resolve", "then"]);
const OBJECTS = new Set(["console", "Promise"]);

/** Colors a line of the snippet. Enough for these eleven lines, not a JS lexer. */
function tokens(line: string) {
  return [...line.matchAll(/"[^"]*"|[A-Za-z_]\w*|\d+|=>|\s+|./g)].map(([t]) => {
    if (t.startsWith('"')) return { t, c: BP.cyan };
    if (METHODS.has(t)) return { t, c: BP.white };
    if (OBJECTS.has(t)) return { t, c: ds("blue", 200) };
    if (/^\d+$/.test(t)) return { t, c: ds("yellow", 200) };
    if (t === "=>") return { t, c: ds("teal", 300) };
    if (/^\s+$/.test(t)) return { t, c: BP.line };
    return { t, c: ds("blue", 300) };
  });
}

export type CodeBox = { x: number; y: number; w: number; font: number; lh: number };

const HEADER = 46;
const PAD = 16;

/** Where things sit inside a listing, for annotations drawn over it. */
export const codeGeom = (b: CodeBox) => {
  const gutter = b.font * 2.4;
  const top = b.y + HEADER + PAD;
  return {
    /** Top of line `i` (0-based). */
    lineTop: (i: number) => top + i * b.lh,
    /** Vertical middle of line `i`. */
    lineMid: (i: number) => top + i * b.lh + b.lh / 2,
    /** Left edge of column `c`. JetBrains Mono advances 0.6em per glyph. */
    colX: (c: number) => b.x + PAD + gutter + c * b.font * 0.6,
    textLeft: b.x + PAD + gutter,
    height: HEADER + PAD * 2 + CODE.length * b.lh,
  };
};

/**
 * The snippet as a drafted listing: a boxed panel with a lettered header,
 * line numbers in the margin, and the code typed in line by line. `glow` is a
 * per-line highlight (0..1); `pointer` is a fractional line the execution
 * arrow points at, so it can slide between lines.
 */
export const CodeListing: React.FC<{
  box: CodeBox;
  title: string;
  p: number;
  reveal: number;
  glow?: number[];
  glowColor?: string;
  pointer?: { line: number; opacity: number };
}> = ({ box, title, p, reveal, glow = [], glowColor = BP.cyan, pointer }) => {
  const g = codeGeom(box);
  const shown = reveal * CODE.length;
  const arrowX = box.x + PAD - 2;
  return (
    <>
      <Layer>
        <DraftBox x={box.x} y={box.y} w={box.w} h={g.height} p={p} color={BP.line2} fill={BP.wash} />
        {p > 0.5 ? (
          <line
            x1={box.x}
            y1={box.y + HEADER}
            x2={box.x + box.w * Math.min(1, (p - 0.5) * 2)}
            y2={box.y + HEADER}
            stroke={BP.line2}
            strokeWidth={1.5}
          />
        ) : null}
        {glow.map((v, i) =>
          v > 0 ? (
            <rect
              key={i}
              x={box.x + 6}
              y={g.lineTop(i) + 2}
              width={box.w - 12}
              height={box.lh - 4}
              fill={mix(glowColor, 20 * v)}
              stroke={mix(glowColor, 70 * v)}
              strokeWidth={1.5}
            />
          ) : null,
        )}
        {pointer && pointer.opacity > 0 ? (
          <path
            d={`M ${arrowX} ${g.lineMid(pointer.line) - 9} L ${arrowX + 16} ${g.lineMid(pointer.line)} L ${arrowX} ${g.lineMid(pointer.line) + 9} Z`}
            fill={BP.mark}
            opacity={pointer.opacity}
          />
        ) : null}
      </Layer>
      <Letter x={box.x + PAD} y={box.y + 11} p={p * 1.4 - 0.4} size={24} color={BP.line}>
        {title}
      </Letter>
      {CODE.map((line, i) => {
        const vis = Math.max(0, Math.min(1, shown - i));
        if (vis <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: box.x + PAD + 18,
              top: g.lineTop(i),
              height: box.lh,
              display: "flex",
              alignItems: "center",
              fontFamily: MONO,
              fontSize: box.font,
              fontVariantLigatures: "none",
              whiteSpace: "pre",
              clipPath: `inset(0 ${(1 - vis) * 100}% 0 0)`,
            }}
          >
            <span style={{ width: g.textLeft - (box.x + PAD + 18), color: mix(ds("blue", 200), 55), fontSize: box.font * 0.8 }}>
              {i + 1}
            </span>
            {tokens(line).map((tk, j) => (
              <span key={j} style={{ color: tk.c, fontWeight: tk.c === BP.white ? 700 : 400 }}>
                {tk.t}
              </span>
            ))}
          </div>
        );
      })}
    </>
  );
};
