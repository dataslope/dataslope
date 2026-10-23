import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { COUNTS, DF, IDF, MAX_COUNT, MAX_TFIDF, N, num, OWNER, TFIDF, THE, VOCAB } from "./data";

/**
 * The TF-IDF table and its pieces, adapted from the TfIdf video's parts.tsx
 * (src/videos/tf-idf/), which teaches the same lesson on the same corpus.
 * The changes: the table's vertical position is a parameter, since this video
 * sets a kicker and a two-line head above it, and the rows are a little
 * tighter.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A table's geometry in layout units (y through `y()`, heights through
 *  `h()`). Columns run "the", then each document's own four words, with a
 *  little air between the groups so each document's block reads at a glance. */
export type TableGeo = {
  labelX: number;
  x0: number;
  colW: number;
  groupGap: number;
  headY: number;
  rowY0: number;
  rowStep: number;
  rowH: number;
};
export const tableGeo = (headY: number, rowStep = 76, rowH = 64): TableGeo => ({
  labelX: 120,
  x0: 268,
  colW: 113,
  groupGap: 14,
  headY,
  rowY0: headY + 50,
  rowStep,
  rowH,
});

const group = (j: number) => (OWNER[j] < 0 ? 0 : OWNER[j] + 1);
export const colX = (j: number) => 268 + j * 113 + group(j) * 14;
export const colMid = (j: number) => colX(j) + 113 / 2;
export const rowTop = (g: TableGeo, i: number) => g.rowY0 + i * g.rowStep;
export const TABLE_RIGHT = colX(VOCAB.length - 1) + 113;
export const tableBottom = (g: TableGeo) => rowTop(g, N - 1) + g.rowH;
/** The idf row under a table. */
export const idfRow = (g: TableGeo) => ({ top: tableBottom(g) + 22, h: 56 });

/** Inset of a cell's tint inside its column. */
const PAD = 4;

/** A cell's tint: the brand blue, as strong as the value is large. */
const tint = (heat: number) => `color-mix(in srgb, ${BAR} ${(heat * 34).toFixed(1)}%, transparent)`;

/** One number centred in its cell. */
const Value: React.FC<{ text: string; zero: boolean; accent?: boolean; style?: React.CSSProperties }> = ({
  text,
  zero,
  accent,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...note(30, accent ? ACCENT_INK : zero ? INK_SOFT : INK),
      fontWeight: accent ? 700 : zero ? 450 : 600,
      ...style,
    }}
  >
    <span style={{ opacity: zero && !accent ? 0.55 : 1 }}>{text}</span>
  </div>
);

export type TableProps = {
  g: TableGeo;
  /** When the header and rows ink in. */
  at: number;
  /** 0 shows the count, 1 the TF-IDF score, per cell. */
  morph?: (i: number, j: number) => number;
  /** 0..1: the frame around the "the" column. */
  frame?: number;
  /** Where that frame stops, in layout units. */
  frameBottom?: number;
  /** 0..1: a cell that has turned keeps its old count, struck through. */
  strike?: (i: number, j: number) => number;
  /** 0..1 per row: a frame around the row's own block of words. */
  block?: (i: number) => number;
  /** 0..1 per cell: a highlighter swell over it. */
  glow?: (i: number, j: number) => number;
  /** A second line under each "Doc n", and when it appears. */
  sub?: { at: number; text: (i: number) => string };
};

/**
 * One row per document, one column per word. With `morph` at 0 every cell
 * holds a count; at 1, its TF-IDF score. The tint follows the value, so the
 * weight visibly moves from the "the" column to the words that only one
 * document uses.
 */
export const DocTable: React.FC<TableProps> = ({ g, at, morph, frame: frameIn = 0, frameBottom, strike, block, glow, sub }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const head = ease(frame, at, 14);
  const bottom = frameBottom ?? tableBottom(g);

  return (
    <>
      {VOCAB.map((w, j) => (
        <div
          key={w}
          style={{
            position: "absolute",
            left: colX(j),
            width: g.colW,
            top: y(g.headY),
            textAlign: "center",
            opacity: ease(frame, at + j * 0.8, 12),
            transform: `translateY(${(1 - ease(frame, at + j * 0.8, 12)) * 8}px)`,
            ...label(22, INK),
            fontWeight: 600,
          }}
        >
          {w}
        </div>
      ))}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: head }}>
        <line
          x1={g.labelX}
          x2={g.labelX + (TABLE_RIGHT - g.labelX) * head}
          y1={y(g.rowY0) - 10}
          y2={y(g.rowY0) - 10}
          stroke={INK}
          strokeWidth={1.6}
        />
      </svg>

      {COUNTS.map((row, i) => {
        const r = ease(frame, at + 4 + i * 5, 14);
        const top = y(rowTop(g, i));
        const height = h(g.rowH);
        const s = sub ? ease(frame, sub.at + i * 3, 12) : 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: g.labelX,
                top: top + height / 2,
                transform: `translate(${(1 - r) * -12}px, -50%)`,
                opacity: r,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Doc {i + 1}</span>
              {sub ? <span style={{ ...note(20, INK_SOFT), opacity: s, whiteSpace: "nowrap" }}>{sub.text(i)}</span> : null}
            </div>
            {row.map((count, j) => {
              const t = clamp01(morph ? morph(i, j) : 0);
              const score = TFIDF[i][j];
              const heat = (1 - t) * (count / MAX_COUNT) + t * (score / MAX_TFIDF);
              const out = clamp01(t * 2);
              const inn = clamp01(t * 2 - 1);
              const struck = strike ? clamp01(strike(i, j)) : 0;
              const lit = glow ? clamp01(glow(i, j)) : 0;
              return (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: colX(j) + PAD,
                    width: g.colW - 2 * PAD,
                    top,
                    height,
                    background: tint(heat + lit * 0.5),
                    opacity: r,
                    overflow: "hidden",
                  }}
                >
                  <Value text={String(count)} zero={count === 0} style={{ opacity: 1 - out, transform: `translateY(${-out * 18}px)` }} />
                  <Value
                    text={num(score)}
                    zero={score === 0}
                    accent={j === THE}
                    style={{ opacity: inn, transform: `translateY(${(1 - inn) * 18}px)` }}
                  />
                  {struck > 0 ? (
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        opacity: struck,
                        ...note(22, INK_SOFT),
                      }}
                    >
                      <span style={{ position: "relative" }}>
                        {count}
                        <span
                          style={{
                            position: "absolute",
                            left: "-0.2em",
                            top: "52%",
                            height: 2.5,
                            width: `calc((100% + 0.4em) * ${struck})`,
                            background: ACCENT,
                            transform: "rotate(-18deg)",
                          }}
                        />
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {block ? <Block g={g} i={i} p={block(i)} /> : null}
          </React.Fragment>
        );
      })}

      {/* The "the" column, framed while the narration is about it. */}
      {frameIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: colX(THE) - 4,
            width: g.colW + 8,
            top: y(g.headY) - 12,
            height: (y(bottom) - y(g.headY) + 24) * frameIn,
            border: `3px solid ${ACCENT}`,
            opacity: Math.min(1, frameIn * 3),
          }}
        />
      ) : null}
    </>
  );
};

/** A frame around row i's own four words: what that document alone says. */
const Block: React.FC<{ g: TableGeo; i: number; p: number }> = ({ g, i, p }) => {
  const { y, h } = useLayout();
  if (p <= 0) return null;
  const cols = VOCAB.map((_, j) => j).filter((j) => OWNER[j] === i);
  const left = colX(cols[0]) - 2;
  const right = colX(cols[cols.length - 1]) + g.colW + 2;
  return (
    <div
      style={{
        position: "absolute",
        left,
        width: right - left,
        top: y(rowTop(g, i)) - 4,
        height: h(g.rowH) + 8,
        border: `3px solid ${BLUE_INK}`,
        opacity: p,
        transform: `scale(${1.04 - 0.04 * p})`,
      }}
    />
  );
};

/** The multiplier row: each column's idf, under the documents. */
export const IdfRow: React.FC<{ g: TableGeo; at: number }> = ({ g, at }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const row = idfRow(g);
  const top = y(row.top);
  const height = h(row.h);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: p }}>
        <line
          x1={g.labelX}
          x2={g.labelX + (TABLE_RIGHT - g.labelX) * p}
          y1={top - 11}
          y2={top - 11}
          stroke={HAIRLINE}
          strokeWidth={1.2}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: g.labelX,
          top: top + height / 2,
          transform: "translateY(-50%)",
          opacity: p,
          ...label(22, INK_SOFT),
          whiteSpace: "nowrap",
        }}
      >
        times idf
      </div>
      {VOCAB.map((w, j) => (
        <div
          key={w}
          style={{
            position: "absolute",
            left: colX(j),
            width: g.colW,
            top,
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: ease(frame, at + 2 + j * 0.8, 10),
            ...note(26, j === THE ? ACCENT_INK : INK_SOFT),
            fontWeight: j === THE ? 700 : 500,
          }}
        >
          {num(IDF[j])}
        </div>
      ))}
    </>
  );
};

/** A fraction set in the surrounding face: numerator, rule, denominator. */
export const Frac: React.FC<{ top: React.ReactNode; bottom: React.ReactNode }> = ({ top, bottom }) => (
  <span
    style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      verticalAlign: "middle",
      margin: "0 0.12em",
      lineHeight: 1.12,
    }}
  >
    <span style={{ padding: "0 0.18em" }}>{top}</span>
    <span style={{ alignSelf: "stretch", height: "0.055em", minHeight: 2, background: "currentColor", margin: "0.06em 0" }} />
    <span style={{ padding: "0 0.18em" }}>{bottom}</span>
  </span>
);

/** An italic variable in a formula. */
export const V: React.FC<{ children: React.ReactNode }> = ({ children }) => <i style={{ fontStyle: "italic" }}>{children}</i>;

/** Which of the three documents hold a word: one square per document, filled
 *  once `p` reaches it. */
export const DocPips: React.FC<{ word: number; p: number; size?: number }> = ({ word, p, size = 46 }) => (
  <span style={{ display: "inline-flex", gap: 10 }}>
    {COUNTS.map((row, i) => {
      const has = row[word] > 0;
      const fill = has ? clamp01(p * N - i) : 0;
      return (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            boxSizing: "border-box",
            border: `2px solid ${has ? INK : HAIRLINE}`,
            background: tint(fill),
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            ...note(20, has ? INK : INK_SOFT),
            fontWeight: 600,
          }}
        >
          {i + 1}
        </span>
      );
    })}
  </span>
);

/** "in 3 of 3 documents": how many documents hold the word. */
export const dfText = (j: number) => `in ${DF[j]} of ${N} documents`;
