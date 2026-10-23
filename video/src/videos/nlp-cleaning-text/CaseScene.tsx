import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { CASE, LOSSY } from "./data";
import { Arrow, Chip, chipHeight, chipWidth, Headline, Kicker, lerp, Spot, Tag, X0 } from "./parts";

const SIZE = 32;
const FIG_Y = 300;
const ROW0 = 352;
const STEP = 60;
/** Where the folded chips land. */
const TX = 440;
const FIG7_X = 780;
const ROW7 = [360, 482, 604];
const NOTE_Y = 768;

/**
 * Part 2 opens: case folding the lesson's six words into two, then what
 * lower() throws away (US, WHO, Apple), and the lesson's verdict: noise for
 * counting, signal for names.
 */
export const CaseScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("case").from;
  const appear = [n.word("case", "capital"), n.word("case", "lowercase"), n.word("case", "caps")];
  const sixAt = n.word("six", "six", { nth: 1 });
  const distinctAt = n.word("six", "distinct");
  const lowerAt = n.word("fold", "Lowercase");
  const foldingAt = n.word("fold", "folding");
  const twoAt = n.word("fold", "two");
  const theAt = n.word("fold", "the");
  const dogAt = n.word("fold", "dog");
  const doorFrom = n.beat("door").from;
  const countingAt = n.word("door", "counting");
  const caseAt = n.word("door", "case");
  const oneWayAt = n.word("door", "one-way");
  const names = [n.word("lossy", "U.S.", { nth: 1 }), n.word("lossy", "W.H.O.", { nth: 1 }), n.word("lossy", "Apple")];
  const becomes = [1, 2, 3].map((k) => n.word("lossy", "becomes", { nth: k }));
  const results = [n.word("lossy", "pronoun"), n.word("lossy", "who", { nth: 2 }), n.word("lossy", "fruit")];
  const noiseAt = n.word("signal", "noise");
  const signalAt = n.word("signal", "signal");
  const punctAt = n.word("punct-in", "it");

  // ── Geometry ──
  const rowY = (i: number) => y(ROW0 + i * STEP);
  const chipH = chipHeight(SIZE);
  const appearAt = CASE.words.map((_, i) => (i < 3 ? appear[i] : sixAt + 4 + (i - 3) * 4));
  const group = CASE.folded.map((w) => CASE.foldedDistinct.indexOf(w));
  const groupY = CASE.foldedDistinct.map((_, g) => {
    const rows = group.flatMap((gg, i) => (gg === g ? [rowY(i)] : []));
    return rows.reduce((a, b) => a + b, 0) / rows.length;
  });
  const colBottom = rowY(CASE.words.length - 1) + chipH;
  const midY = (rowY(2) + chipH + rowY(3)) / 2;
  const leftW = Math.max(...CASE.words.map((w) => chipWidth(w, SIZE)));
  const foldDone = foldingAt + 30;
  const dim = 1 - ease(frame, punctAt, 14) * 0.35;
  const move = ease(frame, oneWayAt - 4, 26);

  // Fig. 7's columns: the word, an arrow, its lowercase, the two glosses.
  const wMax = Math.max(...LOSSY.map((r) => chipWidth(r.word, SIZE)));
  const arrowX0 = FIG7_X + wMax + 18;
  const lowX = arrowX0 + 64 + 16;
  const glossX = lowX + Math.max(...LOSSY.map((r) => chipWidth(r.lower, SIZE))) + 30;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 8} level={-30} />
      {appearAt.map((a, i) => (
        <Sfx key={i} name="el-tap" at={a} level={-28} />
      ))}
      <Sfx name="el-whoosh" at={foldingAt} level={-34} />
      <Sfx name="el-tap" at={foldingAt + 20} level={-26} />
      {names.map((a, i) => (
        <Sfx key={`n${i}`} name="el-tap" at={a} level={-28} />
      ))}
      {becomes.map((a, i) => (
        <Sfx key={`b${i}`} name="el-pencil" at={a} level={-36} />
      ))}

      <Kicker at={from - 6}>Normalization</Kicker>
      <Headline lead="The, the, THE:" turn="three strings." at={from - 4} turnAt={from + 10} out={caseAt - 14} />
      <Headline lead="Case folding" turn="is a one-way door." at={caseAt - 4} turnAt={oneWayAt - 2} />
      {/* The clay fills the empty right half while Fig. 6 is built, then makes
          room for Fig. 7 on "one-way door". */}
      <Spot
        id="nlp-cleaning-text-clay"
        at={from + 6}
        left={lerp(1060, 1440, move)}
        top={lerp(y(400), 58, move)}
        width={lerp(640, 360, move)}
        height={lerp(316, 178, move)}
      />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        {/* Fig. 6: six cased words fold into two. */}
        <FigLabel n="6" title="Six strings, lowercased" at={from} x={X0} y={y(FIG_Y)} />
        {CASE.words.map((w, i) => (
          <Chip key={`s${i}`} text={w} x={X0} y={rowY(i)} at={appearAt[i]} size={SIZE} gone={foldingAt + i * 2} />
        ))}
        {CASE.words.map((w, i) => {
          const m = ease(frame, foldingAt + i * 2, 20);
          if (m <= 0) return null;
          const g = group[i];
          return (
            <Chip
              key={`m${i}`}
              text={w}
              display={m > 0.5 ? CASE.folded[i] : w}
              x={lerp(X0, TX, m)}
              y={lerp(rowY(i), groupY[g], m)}
              at={appearAt[i]}
              size={SIZE}
              tones={[{ at: countingAt, tone: "good" }]}
              marks={g === 0 ? [{ at: theAt, out: doorFrom }] : [{ at: dogAt, out: doorFrom }]}
            />
          );
        })}
        {/* The arrow and its label step back while the chips fly over them. */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.75 * (ease(frame, foldingAt, 8) - ease(frame, foldDone, 12)) }}>
          <Arrow from={[X0 + leftW + 22, midY]} to={[TX - 26, midY]} at={lowerAt} />
          <Ink at={lowerAt + 4} dur={12} style={{ left: X0 + leftW + 30, top: midY - 34, whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600, color: INK_SOFT }}>lower()</span>
          </Ink>
        </div>
        <Tag at={distinctAt} x={X0} y={colBottom + 16} color={INK}>
          {CASE.distinct} distinct
        </Tag>
        <Tag at={twoAt} x={TX} y={colBottom + 16} color={INK}>
          {CASE.foldedDistinct.length} distinct
        </Tag>
        <Sfx name="el-tap" at={foldDone} level={-40} />

        {/* Fig. 7: what lower() throws away. */}
        <FigLabel n="7" title="What lowercasing throws away" at={names[0] - 6} x={FIG7_X} y={y(FIG_Y)} />
        {LOSSY.map((r, i) => {
          const top = y(ROW7[i]);
          const mid = top + chipH / 2;
          return (
            <React.Fragment key={r.word}>
              <Chip text={r.word} x={FIG7_X} y={top} at={names[i]} size={SIZE} />
              <Arrow from={[arrowX0, mid]} to={[arrowX0 + 64, mid]} at={becomes[i]} />
              <Chip text={r.lower} x={lowX} y={top} at={becomes[i] + 4} size={SIZE} tones={[{ at: results[i], tone: "bad" }]} />
              <Ink at={names[i] + 6} dur={14} style={{ left: glossX, top: top - 2, whiteSpace: "nowrap" }}>
                <span style={note(22, INK_SOFT)}>{r.before}</span>
              </Ink>
              <Ink at={results[i] - 2} dur={14} style={{ left: glossX, top: top + 28, whiteSpace: "nowrap" }}>
                <span style={{ ...note(22, ACCENT_INK), fontWeight: 600 }}>becomes {r.after}</span>
              </Ink>
            </React.Fragment>
          );
        })}
      </div>

      {/* The lesson's verdict, one under each figure. */}
      <Ink at={noiseAt - 6} dur={16} style={{ left: X0, top: y(NOTE_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34), color: INK }}>
          For counting, case is <span style={{ fontStyle: "italic" }}>noise.</span>
        </span>
      </Ink>
      <Ink at={signalAt - 6} dur={16} style={{ left: FIG7_X, top: y(NOTE_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34), color: INK }}>
          For a name, it&apos;s the <span style={{ fontStyle: "italic", color: ACCENT_INK }}>signal.</span>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
