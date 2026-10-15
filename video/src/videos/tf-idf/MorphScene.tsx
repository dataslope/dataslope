import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { CAT, COUNTS, DF, IDF, LENGTHS, N, num, spell, TFIDF, THE, VOCAB } from "./data";
import { DocTable, Frac, IDF_ROW, IdfRow } from "./parts";

/** Rows under the table, in layout units. */
const EQ_Y = IDF_ROW.top + IDF_ROW.h + 44;
const FOOT_Y = EQ_Y + 166;

/** Every word that only one document uses, and the one score they share. */
const DF_ONE = VOCAB.map((_, j) => j).filter((j) => DF[j] === 1);
const DF_ONE_SCORES = [...new Set(DF_ONE.map((j) => num(TFIDF[COUNTS.findIndex((r) => r[j] > 0)][j])))];

/** A worked product for one cell of Doc 1: tf times idf. Captions share one
 *  row and values another, so a stacked fraction does not lift its caption
 *  above the rest. */
const Worked: React.FC<{
  j: number;
  x: number;
  top: number;
  at: number;
  resultAt: number;
  color: string;
}> = ({ j, x, top, at, resultAt, color }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const r = ease(frame, resultAt, 12);
  if (p <= 0) return null;
  const cap = (text: string, col: number, opacity = 1) => (
    <span style={{ gridRow: 1, gridColumn: col, justifySelf: "center", ...note(20, INK_SOFT), opacity, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
  const val = (col: number, children: React.ReactNode, c: string = INK, opacity = 1) => (
    <span style={{ gridRow: 2, gridColumn: col, justifySelf: "center", ...headline(44), color: c, opacity, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        display: "grid",
        gridTemplateColumns: "repeat(8, auto)",
        alignItems: "center",
        columnGap: 18,
        rowGap: 4,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {cap("Doc 1", 1)}
      {val(1, <i>{VOCAB[j]}</i>)}
      <span style={{ gridRow: "1 / span 2", gridColumn: 2, width: 1.5, alignSelf: "stretch", background: HAIRLINE, margin: "0 6px" }} />
      {cap("tf", 3)}
      {val(3, <Frac top={COUNTS[0][j]} bottom={LENGTHS[0]} />)}
      {val(4, "×", INK_SOFT)}
      {cap("idf", 5)}
      {val(5, num(IDF[j]))}
      {val(6, "=", INK_SOFT, r)}
      {cap("tf-idf", 7, r)}
      {val(7, num(TFIDF[0][j]), color, r)}
    </div>
  );
};

/**
 * tf, flip, distinct: Fig. 2's counts become TF-IDF scores in place. The
 * "the" column, which led every row, turns to zero; the words only one
 * document uses take the weight.
 */
export const MorphScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("tf").from;
  const multiplyAt = n.word("tf", "multiply");
  const shareAt = n.word("tf", "share");
  const catAt = n.word("tf", "Cat");
  const catScoreAt = n.word("tf", "zero point one eight");

  const theAt = n.word("flip", "The is");
  const timesZeroAt = n.word("flip", "times zero");
  const ledAt = n.word("flip", "column that led");
  const dropsAt = n.word("flip", "drops");

  const highAt = n.word("distinct", "stays high");
  const onlyAt = n.word("distinct", "only one document");
  const namedAt = [n.word("distinct", "Cat"), n.word("distinct", "Dog"), n.word("distinct", "Comet")];

  /** When each cell turns: Doc 1's cat and the as they are worked, then the
   *  rest in a wave from left to right. */
  const turnAt = (i: number, j: number) => {
    if (i === 0 && j === CAT) return catScoreAt - 4;
    if (i === 0 && j === THE) return timesZeroAt;
    return ledAt - 4 + j * 1.6 + i * 2;
  };
  const morph = (i: number, j: number) => ease(frame, turnAt(i, j), 16);
  const strike = (i: number, j: number) => (j === THE ? ease(frame, turnAt(i, j) + 12, 12) : 0);
  const block = (i: number) => ease(frame, namedAt[i] - 4, 12);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Term frequency times idf:
        </Ink>
        <Ink
          at={dropsAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          the leader drops to zero.
        </Ink>
      </div>
      <FigLabel n="4" title="The same table, as TF-IDF" at={start - 8} x={120} y={y(196)} />

      <DocTable
        at={start - 12}
        morph={morph}
        strike={strike}
        frame={ease(frame, theAt - 4, 14)}
        frameBottom={IDF_ROW.top + IDF_ROW.h}
        block={block}
        sub={{ at: shareAt, text: (i) => `${spell(LENGTHS[i])} words` }}
      />
      <IdfRow at={multiplyAt - 4} />

      <Worked j={CAT} x={120} top={y(EQ_Y)} at={catAt - 4} resultAt={catScoreAt - 2} color={INK} />
      <Worked j={THE} x={940} top={y(EQ_Y)} at={theAt - 4} resultAt={timesZeroAt} color={ACCENT_INK} />

      <Note at={highAt} x={120} y={y(FOOT_Y)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <span style={{ background: HIGHLIGHT, color: INK, padding: "0 6px", marginLeft: -6 }}>
            Every word in only one of the {spell(N)} documents
          </span>{" "}
          scores {DF_ONE_SCORES.join(" or ")}, <i>on</i> and <i>in</i> included.
          <span style={{ opacity: ease(frame, onlyAt + 6, 12) }}> Values rounded to two places.</span>
        </span>
      </Note>
    </AbsoluteFill>
  );
};
