import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, body, HAIRLINE, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { CAT, DF, IDF, N, num, spell, THE, VOCAB } from "./data";
import { DocPips, dfText, Frac, V } from "./parts";

/** Rows of Fig. 3, in layout units. */
const FORMULA_Y = 262;
const RULE_Y = 452;
const ROW_Y = { the: 492, cat: 646 } as const;
const ROW_H = 104;
/** The idf bars: zero at BAR_X0, this many px per unit of idf. */
const BAR_X0 = 1260;
const PER_UNIT = 400;
const BAR_H = 40;

/** Words in exactly one document, besides "cat": each gets cat's idf. */
const LIKE_CAT = VOCAB.filter((_, j) => j !== CAT && DF[j] === DF[CAT]).length;

/** ln, then N over df, as one line of type with a stacked fraction. */
const Ln: React.FC<{ top: React.ReactNode; bottom: React.ReactNode }> = ({ top, bottom }) => (
  <>
    <span style={{ marginRight: "0.12em" }}>ln</span>
    <Frac top={top} bottom={bottom} />
  </>
);

/** One fade-in piece of a worked line. */
const Piece: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, children, style }) => (
  <span style={{ opacity: p, transform: `translateY(${(1 - p) * 8}px)`, display: "inline-flex", alignItems: "center", ...style }}>
    {children}
  </span>
);

/**
 * idf, idf-the, idf-cat: the lesson's inverse document frequency, worked for
 * the word in every document and for a word in one.
 */
export const IdfScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("idf").from;
  const divideAt = n.word("idf", "Divide");
  const howManyAt = n.word("idf", "how many contain");
  const lnAt = n.word("idf", "natural log");

  const theFrom = n.beat("idf-the").from;
  const allAt = n.word("idf-the", "all three");
  const overAt = n.word("idf-the", "Three over three");
  const isOneAt = n.word("idf-the", "is one");
  const zeroAt = n.word("idf-the", "zero");

  const catAt = n.word("idf-cat", "Cat");
  const justAt = n.word("idf-cat", "just one");
  const logAt = n.word("idf-cat", "log of three");
  const valueAt = n.word("idf-cat", "one point one");
  const restAt = n.word("idf-cat", "one point one", { edge: "end" });

  const zeroLine = ease(frame, theFrom - 4, 16);
  const catBar = ease(frame, valueAt - 4, 20);

  const rows = [
    {
      j: THE,
      top: ROW_Y.the,
      at: theFrom - 6,
      pips: ease(frame, allAt - 2, 16),
      // ln 3/3 = ln 1 = 0
      parts: [
        { p: ease(frame, overAt - 2, 12), el: <Ln top={N} bottom={DF[THE]} /> },
        { p: ease(frame, isOneAt, 12), el: <>= ln {N / DF[THE]}</> },
        { p: ease(frame, zeroAt - 2, 12), el: <span style={{ color: ACCENT_INK }}>= {num(IDF[THE])}</span> },
      ],
    },
    {
      j: CAT,
      top: ROW_Y.cat,
      at: catAt - 6,
      pips: ease(frame, justAt - 2, 12),
      // ln 3/1 = ln 3 = 1.10
      parts: [
        { p: ease(frame, logAt - 4, 12), el: <Ln top={N} bottom={DF[CAT]} /> },
        { p: ease(frame, logAt + 6, 12), el: <>= ln {N / DF[CAT]}</> },
        { p: ease(frame, valueAt - 2, 12), el: <span style={{ color: BLUE_INK }}>= {num(IDF[CAT])}</span> },
      ],
    },
  ];

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          A word in every document
        </Ink>
        <Ink
          at={zeroAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          weighs nothing.
        </Ink>
      </div>
      <FigLabel n="3" title="Inverse document frequency, as the lesson defines it" at={start - 8} x={120} y={y(196)} />

      {/* The formula, and what each symbol stands for. */}
      <Ink
        at={divideAt - 6}
        dur={20}
        style={{ left: 120, top: y(FORMULA_Y), display: "flex", alignItems: "center", ...headline(64), whiteSpace: "nowrap" }}
      >
        <span>
          <V>idf</V>(<V>w</V>)
        </span>
        <span style={{ margin: "0 0.3em" }}>=</span>
        <Ln
          top={<V>N</V>}
          bottom={
            <>
              <V>df</V>(<V>w</V>)
            </>
          }
        />
      </Ink>
      {[
        { at: divideAt + 2, sym: <V>N</V>, text: `the number of documents, here ${N}` },
        {
          at: howManyAt - 2,
          sym: (
            <>
              <V>df</V>(<V>w</V>)
            </>
          ),
          text: "how many of them contain the word",
        },
        { at: lnAt - 2, sym: <>ln</>, text: "the natural log, with no smoothing" },
      ].map((d, k) => (
        <Note key={k} at={d.at} x={760} y={y(FORMULA_Y + 6) + k * 50}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
            <span style={{ ...body(32), color: INK, width: 96 }}>{d.sym}</span>
            <span style={note(22, INK_SOFT)}>{d.text}</span>
          </span>
        </Note>
      ))}

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: zeroLine }}>
        <line x1={120} x2={120 + 1680 * zeroLine} y1={y(RULE_Y)} y2={y(RULE_Y)} stroke={HAIRLINE} strokeWidth={1.2} />
        {/* Zero for the idf bars. */}
        <line
          x1={BAR_X0}
          x2={BAR_X0}
          y1={y(ROW_Y.the) - 6}
          y2={y(ROW_Y.the) - 6 + (y(ROW_Y.cat + ROW_H) - y(ROW_Y.the) + 12) * zeroLine}
          stroke={INK}
          strokeWidth={1.6}
        />
      </svg>
      <Note at={theFrom} x={BAR_X0} y={y(RULE_Y) + 8} style={{ transform: "translateX(-50%)" }}>
        <span style={label(20, INK_SOFT)}>idf</span>
      </Note>

      {rows.map((r) => {
        const top = y(r.top);
        const mid = top + h(ROW_H) / 2;
        return (
          <React.Fragment key={r.j}>
            <Ink at={r.at} dur={14} style={{ left: 120, top: mid - 36, whiteSpace: "nowrap" }}>
              <span style={{ ...body(52, true), color: INK }}>{VOCAB[r.j]}</span>
            </Ink>
            <Note at={r.at + 2} x={290} y={mid - 42}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <DocPips word={r.j} p={r.pips} />
                <span style={{ ...note(20, INK_SOFT), opacity: Math.min(1, r.pips * 2), whiteSpace: "nowrap" }}>
                  {dfText(r.j)}
                </span>
              </div>
            </Note>
            <div
              style={{
                position: "absolute",
                left: 600,
                top: mid,
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: "0.3em",
                ...headline(46),
                whiteSpace: "nowrap",
              }}
            >
              {r.parts.map((part, k) => (
                <Piece key={k} p={part.p}>
                  {part.el}
                </Piece>
              ))}
            </div>
          </React.Fragment>
        );
      })}

      {/* The bars: none at all for "the", a long one for "cat". */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <rect
          x={BAR_X0}
          y={y(ROW_Y.cat) + h(ROW_H) / 2 - h(BAR_H) / 2}
          width={IDF[CAT] * PER_UNIT * catBar}
          height={h(BAR_H)}
          fill={BAR}
        />
        <circle
          cx={BAR_X0}
          cy={y(ROW_Y.the) + h(ROW_H) / 2}
          r={8 * ease(frame, zeroAt, 10)}
          fill={ACCENT}
        />
      </svg>
      <Note at={zeroAt + 4} x={BAR_X0 + 22} y={y(ROW_Y.the) + h(ROW_H) / 2 - 28}>
        <span style={{ ...headline(46), color: ACCENT_INK }}>{num(IDF[THE])}</span>
      </Note>
      <Note at={valueAt + 10} x={BAR_X0 + IDF[CAT] * PER_UNIT + 20} y={y(ROW_Y.cat) + h(ROW_H) / 2 - 28}>
        <span style={{ ...headline(46), color: BLUE_INK }}>{num(IDF[CAT])}</span>
      </Note>

      <Note at={restAt + 4} x={120} y={y(ROW_Y.cat + ROW_H + 50)}>
        <span style={note(22, INK_SOFT)}>
          The other {spell(LIKE_CAT)} words are each in one document too, so each gets {num(IDF[CAT])}. The log of{" "}
          {N} is {IDF[CAT].toFixed(4)}.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
