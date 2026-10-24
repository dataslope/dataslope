import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, headline, note } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CAT, COUNTS, DOC0_TOP, IDF, LENGTHS, N, num, spell, TFIDF, THE, TWICE, VOCAB } from "./data";
import { FIG_Y, Headline, INK, INK_SOFT, Kicker, Mark, pulse, X0 } from "./parts";
import { DocTable, Frac, idfRow, IdfRow, tableGeo } from "./tfidf";

const G = tableGeo(330);
/** Rows under the table, in layout units. */
const EQ_Y = idfRow(G).top + idfRow(G).h + 40;
const FOOT_Y = EQ_Y + 150;

const ON = VOCAB.indexOf("on");
/** Doc 1's tied top score, set to two places like the table's cells. */
const TOP_SCORE = TFIDF[0][VOCAB.indexOf(DOC0_TOP[0])];

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
  out?: number;
  /** A what-if: the count it would have, its score, and the caption. */
  ghost?: { count: number; score: number; caption: string };
}> = ({ j, x, top, at, resultAt, color, out, ghost }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const r = ease(frame, resultAt, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const cap = (text: string, col: number, opacity = 1) => (
    <span style={{ gridRow: 1, gridColumn: col, justifySelf: "center", ...note(20, INK_SOFT), opacity, whiteSpace: "nowrap" }}>{text}</span>
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
        opacity: p * (1 - o),
        transform: `translateY(${(1 - p) * 10}px)`,
        ...(ghost ? { border: `2px dashed ${BLUE_INK}`, padding: "6px 16px 8px", margin: "-8px -18px" } : {}),
      }}
    >
      {cap(ghost ? ghost.caption : "Doc 1", 1)}
      {val(1, <i>{VOCAB[j]}</i>)}
      <span style={{ gridRow: "1 / span 2", gridColumn: 2, width: 1.5, alignSelf: "stretch", background: HAIRLINE, margin: "0 6px" }} />
      {cap("tf", 3)}
      {val(3, <Frac top={ghost ? ghost.count : COUNTS[0][j]} bottom={LENGTHS[0]} />)}
      {val(4, "×", INK_SOFT)}
      {cap("idf", 5)}
      {val(5, num(IDF[j]))}
      {val(6, "=", INK_SOFT, r)}
      {cap("tf-idf", 7, r)}
      {val(7, num(ghost ? ghost.score : TFIDF[0][j]), color, r)}
    </div>
  );
};

/**
 * tf, flip, tie, rule, after the TfIdf video's MorphScene: Fig. 10's counts
 * become TF-IDF scores in place. The "the" column, which led every row, turns
 * to zero; Doc 1's four own words tie at the top, "on" among them; and the
 * headline turns into the rule.
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

  const theAt = n.word("flip", "The word the");
  const timesZeroAt = n.word("flip", "times zero");
  const ledAt = n.word("flip", "column that led");
  const dropsAt = n.word("flip", "drops");

  const topAt = n.word("tie", "At the top");
  const tieAt = n.word("tie", "sat tie");
  const onSaysAt = n.word("tie", "On says");
  const rareAt = n.word("tie", "just as rare");
  const firstDocAt = n.word("tie", "first document");
  const namedAt: Record<string, number> = {
    cat: n.word("tie", "cat"),
    mat: n.word("tie", "mat"),
    on: n.word("tie", "on and sat"),
    sat: n.word("tie", "sat tie"),
  };
  const rarityAt = n.word("tie", "rarity");
  const frequentAt = n.word("rule", "frequent here");

  const ruleAt = n.beat("rule").from;
  const elsewhereAt = n.word("rule", "rare elsewhere");
  const noListAt = n.word("rule", "no stopword list");
  const twiceFrom = n.beat("rule-twice").from;
  const twiceAt = n.word("rule-twice", "twice as much");

  /** When each cell turns: Doc 1's cat and the as they are worked, then the
   *  rest in a wave from left to right. */
  const turnAt = (i: number, j: number) => {
    if (i === 0 && j === CAT) return catScoreAt - 4;
    if (i === 0 && j === THE) return timesZeroAt;
    return ledAt - 4 + j * 1.6 + i * 2;
  };
  const morph = (i: number, j: number) => ease(frame, turnAt(i, j), 16);
  const strike = (i: number, j: number) => (j === THE ? ease(frame, turnAt(i, j) + 12, 12) : 0);
  const block = (i: number) => (i === 0 ? ease(frame, tieAt - 6, 12) : 0);
  const own = (i: number, j: number) => COUNTS[i][j] > 0 && j !== THE;
  const glow = (i: number, j: number) =>
    (i === 0 && j === ON ? pulse(frame, onSaysAt - 2, 30) + pulse(frame, rareAt - 2, 30) : 0) +
    (j === THE ? pulse(frame, dropsAt + i * 3, 24) : 0) +
    (i === 0 && own(i, j) ? pulse(frame, firstDocAt + j * 2, 22) * 0.6 + pulse(frame, (namedAt[VOCAB[j]] ?? -99) - 2, 18) : 0) +
    (own(i, j) ? pulse(frame, frequentAt - 2 + i * 4, 24) * 0.7 : 0);

  return (
    <AbsoluteFill>
      {/* ── Sound: the idf row, the cat product, the zero, the wave, the tie ── */}
      <Sfx name="el-whoosh" at={multiplyAt - 4} level={-35} />
      <Sfx name="el-tap" at={catScoreAt - 2} level={-28} />
      <Sfx name="el-tap" at={timesZeroAt} level={-28} />
      <Sfx name="el-sprinkle" at={ledAt} level={-34} />
      <Sfx name="el-pencil" at={tieAt - 6} level={-35} />

      <Kicker at={start - 10}>Weighting words</Kicker>
      <Headline at={start - 4} second={start + 10} out={ruleAt - 8} italic="the leader drops to zero.">
        Term frequency times idf:
      </Headline>
      <Headline at={ruleAt - 2} second={elsewhereAt - 4} italic="rare elsewhere.">
        Frequent here,
      </Headline>
      <FigLabel n="12" title="The same table, as TF-IDF" at={start - 2} x={X0} y={y(FIG_Y)} />

      <DocTable
        g={G}
        at={start - 12}
        morph={morph}
        strike={strike}
        frame={ease(frame, theAt - 4, 14) * (1 - ease(frame, topAt - 4, 14))}
        frameBottom={idfRow(G).top + idfRow(G).h}
        block={block}
        glow={glow}
        wait={(i, j) => (i === 0 && j === CAT ? 0 : ease(frame, catScoreAt - 4, 10) * (1 - morph(i, j)))}
        sub={{ at: shareAt, text: (i) => `${spell(LENGTHS[i])} words` }}
      />
      <IdfRow g={G} at={multiplyAt - 4} lit={[rarityAt - 2, elsewhereAt - 2]} />

      <Worked j={CAT} x={X0} top={y(EQ_Y)} at={catAt - 4} resultAt={catScoreAt - 2} color={INK} />
      <Worked j={THE} x={940} top={y(EQ_Y)} at={theAt - 4} resultAt={timesZeroAt} color={ACCENT_INK} out={twiceFrom - 10} />
      {/* "Frequent here": what cat would score if Doc 1 used it twice. */}
      <Worked
        j={CAT}
        x={960}
        top={y(EQ_Y)}
        at={twiceFrom - 2}
        resultAt={twiceAt - 4}
        color={BLUE_INK}
        ghost={{ count: TWICE.count, score: TWICE.tfidf, caption: "if twice" }}
      />

      <Note at={tieAt - 2} out={ruleAt - 6} x={X0} y={y(FOOT_Y)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
          Doc 1’s top four tie at {num(TOP_SCORE)}, <Mark at={onSaysAt - 2}><i>on</i> included</Mark>: each is in one document of{" "}
          {spell(N)}.
        </span>
      </Note>
      <Note at={noListAt - 2} x={X0} y={y(FOOT_Y)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          No stopword list: rarity alone silenced <i>the</i>.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
