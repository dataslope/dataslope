import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PORTER_YEAR, stemOf } from "./data";
import { Arrow, Bracket, Chip, chipHeight, chipWidth, Headline, Kicker, LabelEnd, type MarkSpan, Spot, Tag, type ToneStep, X0 } from "./parts";

const SIZE = 36;
const FIG_Y = 300;
const ROW_Y = 364;
const STEP = 86;
const GROUP_X = [X0, 680, 1240];
const ARROW = 56;

type Row = { word: string; at: number; arrowAt: number; tones?: ToneStep[]; marks?: MarkSpan[] };

/**
 * Part 4 opens: Porter's stemmer on the lesson's words, in three groups as
 * the narration takes them: the regular forms of run (and the irregular ran
 * it misses), the stems that are not words, and three words over-stemmed
 * into one.
 */
export const StemScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("forms").from;
  const fourAt = n.word("forms", "Four");
  const twoAt = n.word("forms", "two");
  const chopAt = n.word("porter", "chop");
  const portersAt = n.word("porter", "Porter's");
  const nineteenAt = n.word("porter", "nineteen");
  const bothAt = n.word("regular", "both");
  const runAt = n.word("regular", "run");
  const staysAt = n.word("irregular", "stays");
  const ran2At = n.word("irregular", "ran", { nth: 2 });
  const pastAt = n.word("irregular", "past");
  const becomeAt = n.word("nonword", "become");
  const becomesAt = n.word("nonword", "becomes");
  const arentAt = n.word("nonword", "aren't");
  const wordsAt = n.word("nonword", "words");
  const collapseAt = n.word("over", "collapse");
  const overAt = n.word("over", "over-stemming");
  const keyFrom = n.beat("key").from;
  const keyAt = n.word("key", "key");
  const notWordAt = n.word("key", "word");
  const compareAt = n.word("key", "compare");
  const lookAt = n.word("lemma-in", "look");
  const upAt = n.word("lemma-in", "up");

  const groups: Row[][] = [
    [
      { word: "run", at: n.word("forms", "Run"), arrowAt: chopAt, marks: [{ at: compareAt, out: lookAt }] },
      { word: "runs", at: n.word("forms", "runs"), arrowAt: chopAt + 3, marks: [{ at: runAt, out: staysAt }, { at: compareAt + 3, out: lookAt }] },
      { word: "running", at: n.word("forms", "running"), arrowAt: chopAt + 6, marks: [{ at: runAt + 3, out: staysAt }, { at: compareAt + 6, out: lookAt }] },
      { word: "ran", at: n.word("forms", "ran"), arrowAt: staysAt, tones: [{ at: ran2At, tone: "bad" }] },
    ],
    [
      { word: "studies", at: n.word("nonword", "Studies"), arrowAt: becomeAt, tones: [{ at: arentAt, tone: "bad" }] },
      { word: "studying", at: n.word("nonword", "studying"), arrowAt: becomeAt + 3, tones: [{ at: arentAt + 3, tone: "bad" }] },
      { word: "happiness", at: n.word("nonword", "happiness"), arrowAt: becomesAt, tones: [{ at: arentAt + 6, tone: "bad" }] },
    ],
    [
      { word: "organization", at: n.word("over", "organization"), arrowAt: collapseAt },
      { word: "organize", at: n.word("over", "organize"), arrowAt: collapseAt + 4 },
      { word: "organ", at: n.word("over", "organ", { nth: 1 }), arrowAt: collapseAt + 8 },
    ],
  ];
  // The stems of the regular forms land on "both", ahead of the arrows' own
  // cue for the irregular one.
  const stemAt = (g: number, i: number, r: Row) => (g === 0 && i < 3 ? Math.max(bothAt + i * 3, r.arrowAt + 8) : r.arrowAt + 8);

  // ── Geometry ──
  const chipH = chipHeight(SIZE);
  const rowTop = (i: number) => y(ROW_Y + i * STEP);
  const geo = groups.map((rows, g) => {
    const wordW = Math.max(...rows.map((r) => chipWidth(r.word, SIZE)));
    const a0 = GROUP_X[g] + wordW + 14;
    return { a0, stemX: a0 + ARROW + 14 };
  });
  const dim = 1 - ease(frame, upAt, 14) * 0.35;
  const g3 = geo[2];
  const organW = chipWidth(stemOf("organ"), SIZE);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={twoAt} level={-30} />
      {groups.flat().map((r, i) => (
        <Sfx key={i} name="el-tap" at={r.at} level={-28} />
      ))}
      <Sfx name="el-pencil" at={chopAt} level={-35} />
      <Sfx name="el-pencil" at={collapseAt + 10} level={-34} />

      <Kicker at={from - 6}>Stems and lemmas</Kicker>
      <Headline lead="Four forms," turn="one word." at={from - 4} turnAt={fourAt} out={keyFrom} />
      <Headline lead="A stem is a key," turn="not a word." at={keyAt - 6} turnAt={notWordAt - 2} />
      <Spot id="nlp-cleaning-text-dictionary" at={twoAt} left={1468} top={46} width={320} height={220} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <FigLabel n="14" title="Porter's stems" at={from} x={X0} y={y(FIG_Y)} />
        <LabelEnd at={portersAt} x={1800} y={y(FIG_Y)} call="PorterStemmer().stem(w)" count={`Porter, ${PORTER_YEAR}`} countAt={nineteenAt} />
        {groups.map((rows, g) =>
          rows.map((r, i) => {
            const top = rowTop(i);
            const mid = top + chipH / 2;
            return (
              <React.Fragment key={`${g}-${i}`}>
                <Chip text={r.word} x={GROUP_X[g]} y={top} at={r.at} size={SIZE} />
                <Arrow from={[geo[g].a0, mid]} to={[geo[g].a0 + ARROW, mid]} at={r.arrowAt} />
                <Chip text={stemOf(r.word)} x={geo[g].stemX} y={top} at={stemAt(g, i, r)} size={SIZE} tones={r.tones} marks={r.marks} />
              </React.Fragment>
            );
          }),
        )}
        <Tag at={pastAt} x={geo[0].stemX + chipWidth(stemOf("ran"), SIZE) + 18} y={rowTop(3) + 14}>
          missed
        </Tag>
        <Tag at={wordsAt} x={GROUP_X[1]} y={rowTop(3) + 6}>
          not words
        </Tag>
        <Bracket x={g3.stemX + organW + 16} y0={rowTop(0) + 6} y1={rowTop(2) + chipH - 6} at={collapseAt + 10} />
        <Tag at={overAt} x={GROUP_X[2]} y={rowTop(3) + 6}>
          over-stemming: three words, one stem
        </Tag>
      </div>
    </AbsoluteFill>
  );
};
