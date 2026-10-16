import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, H0, Head, Label, Mark, pulse, Spot, STAT, STAT_INK, STAT_WASH } from "./parts";

/** Where the gavel sits, here and in the courtroom scene, so it carries over the cut. */
export const GAVEL = { left: 120, top: 660, width: 270, height: 270 };

const CARD_X = 160;
const CARD_W = 700;
const FLOW_X = 1020;
const FLOW_W = 760;

/**
 * The null and the alternative, and the one question a test asks of the
 * data, with its two verdicts.
 */
export const NullScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const nullFrom = n.beat("null").from;
  const nothingAt = n.word("null", "nothing");
  const nullAt = n.word("null", "null hypothesis");
  const altAt = n.word("null", "alternative");
  const realAt = n.word("null", "real effect");
  const surpriseFrom = n.beat("surprise").from;
  const ifAt = n.word("surprise", "If");
  const surprisingAt = n.word("surprise", "surprising");
  const nullAgainAt = n.word("surprise", "null");
  const soundsAt = n.word("court-in", "sounds");
  const veryAt = n.word("verdict", "Very");
  const rejectAt = n.word("verdict", "reject");
  const ordinaryAt = n.word("verdict", "Ordinary");
  const failAt = n.word("verdict", "fail");
  const trialAt = n.word("court-in", "trial");

  const card = (top: number, at: number, glowAt: number, title: React.ReactNode, text: string, textAt: number) => {
    const p = ease(frame, at - 4, 14);
    if (p <= 0) return null;
    const g = pulse(frame, glowAt, 24);
    return (
      <div
        style={{
          position: "absolute",
          left: CARD_X,
          top: y(top),
          width: CARD_W,
          padding: "22px 28px",
          boxSizing: "border-box",
          border: `2px solid ${HAIRLINE}`,
          borderRadius: 10,
          background: PAPER,
          opacity: p * (1 - 0.45 * ease(frame, soundsAt - 4, 14)),
          transform: `translateY(${(1 - p) * 16}px) scale(${1 + 0.015 * g})`,
          transformOrigin: "0 50%",
        }}
      >
        <div style={{ ...body(44, false), color: INK, lineHeight: 1.1 }}>{title}</div>
        <div style={{ marginTop: 10, opacity: ease(frame, textAt - 4, 12) }}>
          <Label size={26} color={INK_SOFT} weight={520} style={{ whiteSpace: "normal" }}>
            {text}
          </Label>
        </div>
      </div>
    );
  };

  const boxTop = y(330);
  const outTop = y(640);
  const leftX = FLOW_X + 30;
  const rightX = FLOW_X + FLOW_W / 2 + 30;

  return (
    <AbsoluteFill>
      {/* ── Sound: two cards, the question, the two verdicts, the gavel ── */}
      <Sfx name="el-tap" at={nullAt - 4} level={-29} />
      <Sfx name="el-tap" at={altAt - 4} level={-30} />
      <Sfx name="el-pencil" at={veryAt - 2} level={-34} />
      <Sfx name="el-pencil" at={ordinaryAt - 2} level={-35} />
      <Sfx name="el-pop" at={trialAt - 4} level={-30} />

      <Head a="Start from the boring answer." at={nullFrom - 4} out={surpriseFrom - 6} />
      <Head a="If the null were true," b="would this surprise you?" at={surpriseFrom} bAt={surprisingAt - 8} size={72} />

      {card(
        330,
        nothingAt,
        nullAgainAt,
        <>
          <H0 />, the null hypothesis
        </>,
        "Nothing is going on: both checkouts convert the same.",
        nullAt + 4,
      )}
      {card(
        530,
        altAt,
        realAt,
        <>
          <H0 one />, the alternative
        </>,
        "There is a real difference between them.",
        realAt,
      )}

      {/* ── The question, and its two verdicts ── */}
      <div
        style={{
          position: "absolute",
          left: FLOW_X,
          top: boxTop,
          width: FLOW_W,
          padding: "24px 30px",
          boxSizing: "border-box",
          border: `2px solid ${INK}`,
          borderRadius: 10,
          background: PAPER,
          opacity: ease(frame, surpriseFrom - 2, 14) * (1 - 0.45 * ease(frame, soundsAt - 4, 14)),
        }}
      >
        <div style={{ opacity: ease(frame, ifAt - 4, 12) }}>
          <span style={{ ...body(36, true), color: INK }}>
            If <H0 /> were true, would data like mine be <Mark at={surprisingAt}>surprising?</Mark>
          </span>
        </div>
      </div>
      <Arrow from={[leftX + 140, boxTop + 150]} to={[leftX + 60, outTop - 14]} at={veryAt - 4} color={STAT} width={2.8} />
      <Arrow from={[rightX + 140, boxTop + 150]} to={[rightX + 220, outTop - 14]} at={ordinaryAt - 4} color={INK} width={2.4} />
      <Ink at={veryAt} dur={14} style={{ left: leftX - 30, top: outTop, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT}>
          Very surprising
        </Label>
      </Ink>
      <Ink at={rejectAt - 4} dur={14} style={{ left: leftX - 30, top: outTop + 40 }}>
        <div style={{ background: STAT_WASH, borderRadius: 8, padding: "8px 18px", whiteSpace: "nowrap" }}>
          <span style={{ ...body(38, true), color: STAT_INK }}>
            Reject <H0 />
          </span>
        </div>
      </Ink>
      <Ink at={ordinaryAt} dur={14} style={{ left: rightX + 60, top: outTop, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT}>
          Ordinary
        </Label>
      </Ink>
      <Ink at={failAt - 4} dur={14} style={{ left: rightX + 60, top: outTop + 40 }}>
        <div style={{ border: `2px solid ${HAIRLINE}`, borderRadius: 8, padding: "6px 16px", whiteSpace: "nowrap" }}>
          <span style={{ ...body(38, true), color: INK }}>
            Fail to reject <H0 />
          </span>
        </div>
      </Ink>

      {/* The turn to the courtroom: the gavel arrives where the next scene keeps it. */}
      <Spot id="testing-hypotheses-gavel" at={trialAt - 4} left={GAVEL.left} top={y(GAVEL.top)} width={GAVEL.width} height={GAVEL.height} />
      <Ink at={trialAt + 6} dur={16} style={{ left: GAVEL.left + GAVEL.width + 30, top: y(GAVEL.top) + 110, whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK_SOFT }}>a trial, in other words</span>
      </Ink>
    </AbsoluteFill>
  );
};
