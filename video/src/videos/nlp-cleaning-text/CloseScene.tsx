import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, label } from "../../editorial/style";
import { ColumnRule, FigLabel, Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Headline, Kicker, Spot, X0 } from "./parts";

const FIG_Y = 300;
/** Four columns across the page, each centred under its spot, with a
 *  hairline centred in each 40px gap: the widest line ("the capitals and
 *  punctuation", about 380px in 28px Inter) keeps about 25px from it. The
 *  rules that capped each column are gone. */
const COL_Y = 346;
const COL_W = 390;
const COL_GAP = 40;
const ART_H = 150;
/** Air between a spot's box and its step's name. At 18px the art sat on the
 *  name (the sieve's drips nearly touched "Remove stopwords"). */
const ART_GAP = 44;
/** A column's three lines (the step, "threw away", what it lost), all 28px
 *  Inter at one line height, set on one even pitch. */
const LINE_H = 28 * 1.2;
const LINE_PITCH = 46;
/** A column's text, from its name's top to the bottom of what it lost, in
 *  px under COL_Y: the hairlines span this. */
const TEXT_TOP = 22 + ART_H + ART_GAP;
const TEXT_H = 2 * LINE_PITCH + LINE_H;
/** "threw away" and what was lost, under the name. */
const LOST_TOP = TEXT_TOP + LINE_PITCH;
const NOTE_Y = 746;
const NEXT_Y = 842;

/** Each step of the unit, its spot, and what it threw away, with the art's
 *  own proportions so every spot is drawn at its true shape. */
const STEPS = [
  { name: "Tokenize", art: "nlp-cleaning-text-scissors", aspect: 1459 / 998, lost: "the spaces", cue: "spaces" },
  { name: "Normalize", art: "nlp-cleaning-text-clay", aspect: 1536 / 760, lost: "the capitals and punctuation", cue: "capitals" },
  { name: "Remove stopwords", art: "nlp-cleaning-text-sieve", aspect: 998 / 1005, lost: "the common words", cue: "common" },
  { name: "Stem or lemmatize", art: "nlp-cleaning-text-dictionary", aspect: 1464 / 1009, lost: "the endings", cue: "endings" },
];

/**
 * The unit in one figure: the four steps, each with its spot, and what each
 * threw away on purpose. Then the lesson's question for every step (did the
 * task need it?) and the bridge to Unit 3.
 */
export const CloseScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("close").from;
  const fourAt = n.word("close", "four steps");
  const threwAt = n.word("close", "threw");
  const lostAt = STEPS.map((s) => n.word("close-list", s.cue));
  const cleaningAt = n.word("needed", "Cleaning");
  const neededAt = n.word("needed", "needed");
  const countAt = n.word("next", "count");
  const next = n.beat("next");

  const colX = (i: number) => X0 + i * (COL_W + COL_GAP);
  const colAt = STEPS.map((_, i) => fourAt + i * 5);

  return (
    <AbsoluteFill>
      {colAt.map((a, i) => (
        <Sfx key={`c${i}`} name="el-pop" at={a} level={-31} />
      ))}
      {lostAt.map((a, i) => (
        <Sfx key={`l${i}`} name="el-pencil" at={a - 2} level={-36} />
      ))}
      <Sfx name="el-chime" at={next.to + 8} level={-33} />

      <Kicker at={from - 6}>Cleaning text</Kicker>
      <Headline lead="Every step" turn="threw something away." at={from - 4} turnAt={threwAt - 2} />

      <FigLabel n="17" title="What each step threw away" at={from} x={X0} y={y(FIG_Y)} />
      {STEPS.map((s, i) => {
        const x = colX(i);
        const top = y(COL_Y);
        const h = ART_H;
        const w = Math.min(COL_W - 40, h * s.aspect);
        const hh = w / s.aspect;
        // Each line centred in the column, under its centred spot.
        const line: React.CSSProperties = { width: COL_W, textAlign: "center", whiteSpace: "nowrap" };
        return (
          <React.Fragment key={s.name}>
            {i > 0 ? <ColumnRule x={x - COL_GAP / 2} top={top + TEXT_TOP} height={TEXT_H} at={colAt[i] + 4} /> : null}
            <Spot id={s.art} at={colAt[i] + 2} left={x + (COL_W - w) / 2} top={top + 22 + (h - hh) / 2} width={w} height={hh} />
            <Ink at={colAt[i] + 4} dur={14} style={{ left: x, top: top + TEXT_TOP, ...line }}>
              <div style={{ ...label(28, INK), fontWeight: 700, lineHeight: 1.2 }}>{s.name}</div>
            </Ink>
            <Ink at={lostAt[i] - 2} dur={16} style={{ left: x, top: top + LOST_TOP, ...line }}>
              {/* The name's own face and size, a step lighter. */}
              <div style={{ ...label(28, INK_SOFT), fontWeight: 500, lineHeight: 1.2 }}>threw away</div>
              <div style={{ ...label(28, ACCENT_INK), fontWeight: 500, lineHeight: 1.2, marginTop: LINE_PITCH - LINE_H }}>{s.lost}</div>
            </Ink>
          </React.Fragment>
        );
      })}

      <Ink at={cleaningAt - 4} dur={18} style={{ left: X0, top: y(NOTE_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...body(38), color: INK }}>
          Know what you threw away, and whether your task <span style={{ fontStyle: "italic" }}>needed</span> it.
        </span>
      </Ink>
      <Sfx name="el-pencil" at={neededAt - 6} level={-36} />

      <NextLine at={countAt - 6} x={X0} y={y(NEXT_Y)} width={4 * COL_W + 3 * COL_GAP}>
        what counting words reveals
      </NextLine>
    </AbsoluteFill>
  );
};
