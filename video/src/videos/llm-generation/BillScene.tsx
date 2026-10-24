import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ANSWER_TOKENS, THINKING_TOKENS } from "./data";
import { Drift, Headline, Kicker, lerp, Marked, pulse, Svg, Tag, THINK, THINK_INK, tint, X0 } from "./kit";

/** Fig. 20: tokens to pixels, so the bill's bar is the whole width. */
const B0 = 460;
const B1 = 1700;
const TOTAL = THINKING_TOKENS + ANSWER_TOKENS;
const bw = (tokens: number) => ((B1 - B0) * tokens) / TOTAL;
const READ_Y = 320;
const PAY_Y = 430;
const BAR_H = 64;
/** Fig. 21: the effort setting, low to high. */
const LEVELS = ["low", "medium", "high"] as const;
const DIAL = [560, 1360] as const;
const DIAL_Y = 660;
/** The closing row: every token the model touches, on the bill. */
const CHIPS_Y = 772;

/**
 * Bill, effort, next: thinking tokens are output tokens. In the lesson's
 * transcript you read 13 tokens and pay output prices for 119 (o200k_base,
 * measure.py), so the setting to choose is the lowest effort that passes;
 * and every token read, written or thought is on the bill, which is Unit 4.
 */
export const BillScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("bill").from;
  const outputAt = n.word("bill", "output tokens");
  const seeAt = n.word("bill", "see them");
  const readAt = n.word("bill", "read thirteen");
  const payAt = n.word("bill", "pay output prices");
  const total119At = n.word("bill", "hundred and nineteen");
  const settingAt = n.word("effort", "reasoning effort");
  const lowestAt = n.word("effort", "lowest effort");
  const passesAt = n.word("effort", "passes your own tests");
  const purposeAt = n.word("effort", "on purpose");
  const readsAt = n.word("next", "reads");
  const writesAt = n.word("next", "writes");
  const thinksAt = n.word("next", "thinks");
  const billAt = n.word("next", "bill");
  const costAt = n.word("next", "token actually cost");

  const readY = y(READ_Y);
  const payY = y(PAY_Y);
  const bh = h(BAR_H);
  // The bill's bar draws on "output tokens", so the claim never plays over an empty figure.
  const thinkW = bw(THINKING_TOKENS) * ease(frame, outputAt - 2, 22);
  const answerW = bw(ANSWER_TOKENS);
  // The dial: from the middle to the bottom of the range, on "lowest effort".
  const knob = lerp(0.5, 0, ease(frame, lowestAt - 2, 24));
  const kx = DIAL[0] + (DIAL[1] - DIAL[0]) * knob;
  const glowAnswer = pulse(frame, writesAt - 2, 20);
  const glowThink = pulse(frame, thinksAt - 2, 20);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={readAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={outputAt - 2} level={-34} />
      <Sfx name="el-pop" at={total119At - 2} level={-34} />
      <Sfx name="el-whoosh" at={lowestAt - 2} level={-36} />
      <Sfx name="el-chime" at={n.beat("effort").to + 6} level={-33} />

      <Drift from={start} to={durationInFrames} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Reasoning models</Kicker>
      <Headline lead="Thinking tokens are output tokens," turn="seen or not." at={start - 4} turnAt={seeAt - 2} size={56} />
      <FigLabel n="20" title="That answer, counted in the course tokenizer's tokens (o200k_base)" at={start} x={X0} y={y(240)} />

      {/* What you read: the answer. */}
      <Ink at={readAt - 4} dur={12} style={{ left: X0, top: readY + bh / 2 - 16, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK), fontWeight: 600 }}>You read</span>
      </Ink>
      <Ink at={readAt - 2} dur={12} style={{ left: B0, top: readY, width: answerW, height: bh }}>
        <div style={{ width: "100%", height: "100%", boxSizing: "border-box", background: tint(BAR, 30), borderBottom: `5px solid ${BAR}` }} />
      </Ink>
      <Note at={readAt} x={B0 + answerW + 16} y={readY + bh / 2 - 17}>
        <span style={{ ...note(24, BLUE_INK), fontWeight: 650, ...TABULAR }}>{ANSWER_TOKENS} tokens, the answer</span>
      </Note>

      {/* What you pay output prices for: the working too. */}
      <Ink at={outputAt - 4} dur={12} style={{ left: X0, top: payY + bh / 2 - 30, width: 320 }}>
        <div style={{ ...label(22, INK), fontWeight: 600, lineHeight: 1.25 }}>
          You <Marked at={payAt - 2}>pay output prices</Marked> for
        </div>
      </Ink>
      <Svg opacity={ease(frame, outputAt - 4, 8)}>
        <rect x={B0} y={payY} width={thinkW} height={bh} fill={tint(THINK, 28 + glowThink * 22)} />
        <rect x={B0} y={payY + bh - 5} width={thinkW} height={5} fill={THINK} />
        <rect x={B0 + thinkW} y={payY} width={answerW} height={bh} fill={tint(BAR, 30 + glowAnswer * 22)} />
        <rect x={B0 + thinkW} y={payY + bh - 5} width={answerW} height={5} fill={BAR} />
        <line x1={B0 + thinkW} x2={B0 + thinkW} y1={payY} y2={payY + bh} stroke={PAPER} strokeWidth={2} />
      </Svg>
      <Note at={seeAt - 2} x={B0 + 18} y={payY + bh / 2 - 15}>
        <span style={{ ...note(23, THINK_INK), fontWeight: 650, ...TABULAR }}>{THINKING_TOKENS} thinking tokens, hidden</span>
      </Note>
      <Ink at={total119At - 2} dur={14} style={{ left: B0, top: payY + bh + 18, width: B1 - B0 + 2, textAlign: "right" }}>
        <span style={{ ...headline(56), color: ACCENT_INK, ...TABULAR }}>{TOTAL}</span>
        <span style={{ ...note(24, INK), marginLeft: 12 }}>tokens at the output rate</span>
      </Ink>

      {/* Fig. 21: the control that is left, set low on purpose. */}
      <FigLabel n="21" title="Reasoning effort, the setting reasoning models expose" at={settingAt - 4} x={X0} y={y(DIAL_Y - 70)} />
      <Svg opacity={ease(frame, settingAt, 12)}>
        <line x1={DIAL[0]} x2={DIAL[1]} y1={y(DIAL_Y)} y2={y(DIAL_Y)} stroke={INK} strokeWidth={1.6} />
        {LEVELS.map((_, k) => {
          const x = DIAL[0] + ((DIAL[1] - DIAL[0]) * k) / (LEVELS.length - 1);
          return <line key={k} x1={x} x2={x} y1={y(DIAL_Y) - 9} y2={y(DIAL_Y) + 9} stroke={INK} strokeWidth={1.4} />;
        })}
        <circle cx={kx} cy={y(DIAL_Y)} r={15} fill={ACCENT} stroke={PAPER} strokeWidth={3} />
      </Svg>
      {LEVELS.map((l, k) => (
        <div
          key={l}
          style={{
            position: "absolute",
            left: DIAL[0] + ((DIAL[1] - DIAL[0]) * k) / (LEVELS.length - 1) - 60,
            width: 120,
            top: y(DIAL_Y) + 22,
            textAlign: "center",
            opacity: ease(frame, settingAt + 2, 12),
            ...note(22, INK_SOFT),
          }}
        >
          {l}
        </div>
      ))}
      <Note at={passesAt - 2} x={DIAL[0] - 30} y={y(DIAL_Y) - 22} align="right">
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the lowest that passes your tests</span>
      </Note>
      <Note at={purposeAt - 2} x={DIAL[0]} y={y(DIAL_Y) + 54} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>set on purpose</span>
      </Note>

      {/* Every token read, written or thought ends up here. */}
      {[
        { at: readsAt, text: "reads", color: ds("gray", 500), ink: INK_SOFT },
        { at: writesAt, text: "writes", color: BAR, ink: BLUE_INK },
        { at: thinksAt, text: "thinks", color: THINK, ink: THINK_INK },
      ].map((c, k) => (
        <Note key={c.text} at={c.at - 2} x={X0 + 260 + k * 150} y={y(CHIPS_Y)} from="up">
          <Tag color={c.color} ink={c.ink} size={22}>
            {c.text}
          </Tag>
        </Note>
      ))}
      <Ink at={readsAt - 6} dur={12} style={{ left: X0, top: y(CHIPS_Y) + 6, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK), fontWeight: 600 }}>Every token it</span>
      </Ink>
      <Note at={billAt - 2} x={X0 + 260 + 450} y={y(CHIPS_Y) + 4}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>all on the bill</span>
      </Note>
      <NextLine at={costAt - 4} x={X0} y={y(848)} width={1680}>
        what a token costs
      </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
