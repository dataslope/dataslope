import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT } from "../../editorial/style";
import { Ink, outlineBadgeStyle } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, H0, Head, Label, Mark, pulse, Spot, STAT } from "./parts";

/** Where the gavel sits, here and in the courtroom scene, so it carries over the cut. */
export const GAVEL = { left: 120, top: 660, width: 270, height: 270 };

/** The two hypotheses, plain text on the left: no cards, no boxes. Each is
 *  a title and its line 10px under it; they keep the rows their cards had,
 *  200 layout units apart, which leaves the column level with the question
 *  and its verdicts on the right, so a hairline is centred in the gap
 *  between them. A hypothesis runs about 90px, title to line, and its
 *  longest line about 500px, which the hairline matches. */
const HYP_X = 160;
const HYP_W = 700;
const HYP_ROWS = [330, 530];
const HYP_H = 90;
const HYP_RULE_W = 500;
/** The question and its two verdicts, on the right. The question's first
 *  line, the "Very surprising" label and its verdict share one left edge. */
const FLOW_X = 1020;
const FLOW_W = 760;
/** Where the first line of each block sits, under the top it is given: where
 *  the words sat inside the boxes, so the page keeps its balance. */
const TEXT_DY = 24;

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
  const boringAt = n.word("null", "boring");
  const nothingAt = n.word("null", "nothing");
  const nullAt = n.word("null", "null hypothesis");
  const altAt = n.word("null", "alternative");
  const realAt = n.word("null", "real effect");
  const ifAt = n.word("surprise", "If");
  const surprisingAt = n.word("surprise", "surprising");
  const soundsAt = n.word("court-in", "sounds");
  const veryAt = n.word("verdict", "Very");
  const rejectAt = n.word("verdict", "reject", { nth: 1 });
  const ordinaryAt = n.word("verdict", "Ordinary");
  const failAt = n.word("verdict", "fail");
  const trialAt = n.word("court-in", "trial");

  const hypothesis = (top: number, at: number, glowAt: number, title: React.ReactNode, text: string, textAt: number) => {
    const p = ease(frame, at - 4, 14);
    if (p <= 0) return null;
    const g = pulse(frame, glowAt, 24);
    return (
      <div
        style={{
          position: "absolute",
          left: HYP_X,
          top: y(top) + TEXT_DY,
          width: HYP_W,
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
      {/* ── Sound: the two hypotheses, the question, the two verdicts, the gavel ── */}
      <Sfx name="el-tap" at={nullAt - 4} level={-29} />
      <Sfx name="el-tap" at={altAt - 4} level={-30} />
      <Sfx name="el-pencil" at={veryAt - 2} level={-34} />
      <Sfx name="el-pencil" at={ordinaryAt - 2} level={-35} />
      <Sfx name="el-pop" at={trialAt - 4} level={-30} />

      {/* The headline stays put: the question itself is the text on the right. */}
      <Head a="Start from the boring answer." at={nullFrom - 4} />

      {/* The boring answer arrives as it is named; its line on "nothing". */}
      {hypothesis(
        HYP_ROWS[0],
        boringAt,
        nullAt,
        <>
          <H0 />, the null hypothesis
        </>,
        "Nothing is going on: no difference at all.",
        nothingAt,
      )}
      {/* The hairline between the two arrives with the second. */}
      <div
        style={{
          position: "absolute",
          left: HYP_X,
          top: Math.round((y(HYP_ROWS[0]) + TEXT_DY + HYP_H + y(HYP_ROWS[1]) + TEXT_DY) / 2),
          width: HYP_RULE_W,
          height: 1,
          background: HAIRLINE,
          opacity: ease(frame, altAt - 4, 14) * (1 - 0.45 * ease(frame, soundsAt - 4, 14)),
        }}
      />
      {hypothesis(
        HYP_ROWS[1],
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
          top: boxTop + TEXT_DY,
          width: FLOW_W,
          opacity: ease(frame, ifAt - 4, 14) * (1 - 0.45 * ease(frame, soundsAt - 4, 14)),
        }}
      >
        <span style={{ ...body(36, true), color: INK }}>
          If <H0 /> were true,
          <br />
          would data like mine be <Mark at={surprisingAt}>surprising?</Mark>
        </span>
      </div>
      <Arrow from={[leftX + 140, boxTop + 150]} to={[leftX + 60, outTop - 14]} at={veryAt - 4} color={STAT} width={2.8} />
      <Arrow from={[rightX + 140, boxTop + 150]} to={[rightX + 220, outTop - 14]} at={ordinaryAt - 4} color={INK} width={2.4} />
      <Ink at={veryAt} dur={14} style={{ left: leftX - 30, top: outTop, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT}>
          Very surprising
        </Label>
      </Ink>
      {/* The two outcomes as outlined badges, each in its arrow's ink (the
          owner, 2026-11-13: outlined, no fill). */}
      <Ink at={rejectAt - 4} dur={14} style={{ left: leftX - 30, top: outTop + 40 }}>
        <span style={{ ...body(38, true), ...outlineBadgeStyle("red", 38) }}>
          Reject <H0 />
        </span>
      </Ink>
      <Ink at={ordinaryAt} dur={14} style={{ left: rightX + 60, top: outTop, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT}>
          Ordinary
        </Label>
      </Ink>
      <Ink at={failAt - 4} dur={14} style={{ left: rightX + 60, top: outTop + 40 }}>
        <span style={{ ...body(38, true), ...outlineBadgeStyle("ink", 38) }}>
          Fail to reject <H0 />
        </span>
      </Ink>

      {/* The turn to the courtroom: the gavel arrives where the next scene keeps it. */}
      <Spot id="testing-hypotheses-gavel" at={trialAt - 4} left={GAVEL.left} top={y(GAVEL.top)} width={GAVEL.width} height={GAVEL.height} />
      <Ink at={trialAt + 6} dur={16} style={{ left: GAVEL.left + GAVEL.width + 30, top: y(GAVEL.top) + 110, whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK_SOFT }}>A trial, in other words</span>
      </Ink>
    </AbsoluteFill>
  );
};
