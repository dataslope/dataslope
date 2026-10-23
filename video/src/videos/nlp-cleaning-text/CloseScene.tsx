import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Headline, Kicker, Spot, X0 } from "./parts";

const FIG_Y = 300;
const CARD_Y = 346;
const CARD_W = 402;
const CARD_GAP = 24;
const ART_H = 150;
const NOTE_Y = 664;
const NEXT_Y = 760;

/** Each step of the unit, its spot, and what it threw away, with the art's
 *  own proportions so every spot is drawn at its true shape. */
const STEPS = [
  { name: "Tokenize", art: "nlp-cleaning-text-scissors", aspect: 1459 / 998, lost: "the spaces", cue: "spaces" },
  { name: "Normalize", art: "nlp-cleaning-text-clay", aspect: 1536 / 760, lost: "the capitals", cue: "capitals" },
  { name: "Remove stopwords", art: "nlp-cleaning-text-sieve", aspect: 998 / 1005, lost: "the common words", cue: "common" },
  { name: "Stem or lemmatize", art: "nlp-cleaning-text-dictionary", aspect: 1464 / 1009, lost: "the endings", cue: "endings" },
];

/** A card's frame: a rule across its top, drawn on `at`. */
const Rule: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  return <div style={{ position: "absolute", left: x, top: y, width: CARD_W * p, height: 2, background: INK }} />;
};

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
  const lostAt = STEPS.map((s) => n.word("close", s.cue));
  const cleaningAt = n.word("needed", "Cleaning");
  const neededAt = n.word("needed", "needed");
  const countAt = n.word("next", "count");
  const next = n.beat("next");

  const cardX = (i: number) => X0 + i * (CARD_W + CARD_GAP);
  const cardAt = STEPS.map((_, i) => fourAt + i * 5);

  return (
    <AbsoluteFill>
      {cardAt.map((a, i) => (
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
        const x = cardX(i);
        const top = y(CARD_Y);
        const h = ART_H;
        const w = Math.min(CARD_W - 40, h * s.aspect);
        const hh = w / s.aspect;
        return (
          <React.Fragment key={s.name}>
            <Rule at={cardAt[i]} x={x} y={top} />
            <Spot id={s.art} at={cardAt[i] + 2} left={x + (CARD_W - w) / 2} top={top + 22 + (h - hh) / 2} width={w} height={hh} />
            <Ink at={cardAt[i] + 4} dur={14} style={{ left: x, top: top + 22 + h + 18, whiteSpace: "nowrap" }}>
              <span style={{ ...label(28, INK), fontWeight: 700 }}>{s.name}</span>
            </Ink>
            <Ink at={lostAt[i] - 2} dur={16} style={{ left: x, top: top + 22 + h + 64, whiteSpace: "nowrap" }}>
              <div style={note(21, INK_SOFT)}>threw away</div>
              <div style={{ ...body(34), color: ACCENT_INK, marginTop: 4 }}>{s.lost}</div>
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

      <NextLine at={countAt - 6} x={X0} y={y(NEXT_Y)} width={4 * CARD_W + 3 * CARD_GAP}>
        what counting words reveals
      </NextLine>
    </AbsoluteFill>
  );
};
