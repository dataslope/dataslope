import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { billAt, CONVERSATION, int, NAME, usd } from "./data";
import {
  Arrow,
  FIG_Y,
  Headline,
  INPUT,
  INPUT_INK,
  lerp,
  POINT_INK,
  pulse,
  Spot,
  Svg,
  VBracket,
  X0,
} from "./parts";

const CHART_X0 = 210;
const SLOT = 24;
const BAR_W = 17;
const BASE = 836;
const TOP = 392;
const Y_MAX = 24000;
const BILL_R = 1790;
const ARROW_X = 1478;
const BILL_Y = [400, 540, 680];
const BILL_TURNS = [10, 20, 40];

/**
 * The resend: the model keeps no memory, so every turn sends the whole chat
 * so far, and the input bars climb as a staircase with the new message a
 * thin slice on top. The bill for 10, 20 and 40 turns on Sonnet: doubling
 * the turns roughly triples it.
 */
export const ResendScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const resendFrom = n.beat("resend").from;
  const conversationsAt = n.word("resend", "Conversations");
  const wrongAt = n.word("resend", "wrong");
  const memoryAt = n.word("stateless", "memory");
  const resendsAt = n.word("stateless", "resends");
  const farAt = n.word("stateless", "far");
  const newAt = n.word("slice", "new message");
  const sliceAt = n.word("slice", "thin slice");
  const paidAt = n.word("slice", "already paid");
  const billCue = [n.word("turns", "ten turns"), n.word("turns", "Twenty"), n.word("turns", "Forty")];
  const sumBillAt = n.word("sum", "bill");
  const everyOneAt = n.word("sum", "every one");
  const replyAt = n.word("sum", "reply");
  const worseAt = n.word("triple", "worse");
  const doubleAt = n.word("triple", "Double");
  const triplesAt = n.word("triple", "triples");

  const turns = CONVERSATION.perTurn;
  const last = turns[turns.length - 1];
  const tokY = (t: number) => y(BASE) - (h(BASE - TOP) * t) / Y_MAX;
  const slotX = (turn: number) => CHART_X0 + (turn - 1) * SLOT;
  // Turn 1 as conversations are named; the rest climb while the resend is explained.
  const growAt = (turn: number) => (turn === 1 ? wrongAt - 4 : Math.round(lerp(memoryAt, farAt, (turn - 1) / (turns.length - 1))));
  // The bars a bill adds up: lit 1..10, then 1..20, then all forty.
  const litUpTo = BILL_TURNS.reduce((acc, t, k) => (frame >= billCue[k] - 4 ? t : acc), 0);

  return (
    <AbsoluteFill>
      {/* ── Sound: the staircase, the slice, the three bills, the arrows ── */}
      <Sfx name="el-sprinkle" at={memoryAt} level={-33} />
      <Sfx name="el-pencil" at={paidAt - 4} level={-35} />
      {billCue.map((at, k) => (
        <Sfx key={k} name="el-tap" at={at - 2} level={-27} />
      ))}
      <Sfx name="el-pencil" at={triplesAt - 6} level={-35} />

      <Headline at={resendFrom - 6} second={resendsAt - 4} italic="resends the whole chat.">
        Every turn
      </Headline>
      <Spot id="stairs" at={wrongAt - 6} left={1450} top={y(76)} width={350} height={202} />

      <FigLabel n="8" title={`Input sent each turn, ${NAME.sonnet}`} at={conversationsAt - 4} x={X0} y={y(FIG_Y)} />

      {/* Axes. */}
      <Svg opacity={ease(frame, conversationsAt, 14)}>
        <line x1={CHART_X0 - 12} x2={slotX(turns.length) + SLOT} y1={y(BASE) + 0.5} y2={y(BASE) + 0.5} stroke={INK} strokeWidth={1.6} />
        {[0, 10000, 20000].map((t) => (
          <g key={t}>
            <line x1={CHART_X0 - 12} x2={slotX(turns.length) + SLOT} y1={tokY(t)} y2={tokY(t)} stroke={INK} strokeOpacity={t ? 0.12 : 0} />
            <text x={CHART_X0 - 22} y={tokY(t) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT }}>
              {t ? `${t / 1000}k` : "0"}
            </text>
          </g>
        ))}
        {[1, 10, 20, 30, 40].map((t) => (
          <text
            key={t}
            x={slotX(t) + BAR_W / 2}
            y={y(BASE) + 30}
            textAnchor="middle"
            style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT }}
          >
            {t}
          </text>
        ))}
        <text x={slotX(turns.length) + SLOT} y={y(BASE) + 60} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 650, fill: INK_SOFT }}>
          turn
        </text>
        <text x={CHART_X0 - 12} y={tokY(Y_MAX) - 4} style={{ fontFamily: SANS, fontSize: 20, fontWeight: 650, fill: INK_SOFT }}>
          tokens sent
        </text>
      </Svg>

      {/* The staircase: everything resent, and the new message on top. */}
      <Svg>
        {turns.map((t) => {
          const g = ease(frame, growAt(t.turn), 8);
          if (g <= 0) return null;
          const x = slotX(t.turn);
          const yTop = tokY(t.input * g);
          const yResent = tokY(t.resent * g);
          const lit = t.turn <= litUpTo;
          const glow = pulse(frame, newAt + t.turn, 16);
          // "Every one of these bars": a sweep lights each bar in turn, the whole of it.
          const swept = pulse(frame, everyOneAt - 2 + t.turn * 0.8, 14);
          return (
            <g key={t.turn}>
              <rect
                x={x}
                y={yResent}
                width={BAR_W}
                height={y(BASE) - yResent}
                fill={lit ? `color-mix(in srgb, ${INPUT} 62%, ${PAPER})` : `color-mix(in srgb, ${INPUT} ${Math.round(32 + swept * 40)}%, ${PAPER})`}
              />
              <rect x={x - glow * 2} y={Math.min(yTop, yResent - 4)} width={BAR_W + glow * 4} height={Math.max(4, yResent - yTop)} fill={INPUT} />
            </g>
          );
        })}
      </Svg>

      {/* The slice and the resend, read off the last bar. */}
      <Leader
        points={[
          [slotX(last.turn) - 60, tokY(last.input) - 46],
          [slotX(last.turn) + 2, tokY(last.input) - 2],
        ]}
        at={sliceAt - 4}
        color={INPUT_INK}
      />
      <Note at={sliceAt - 2} x={slotX(last.turn) - 66} y={tokY(last.input) - 78} align="right">
        <span style={{ ...note(23, INPUT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
          new message, {int(CONVERSATION.user)} tokens
        </span>
      </Note>
      <VBracket x={slotX(last.turn) + BAR_W + 12} y0={tokY(last.resent)} y1={y(BASE) - 2} at={paidAt - 4} color={INK} right={false} />
      <Note at={paidAt} x={slotX(last.turn) + BAR_W + 26} y={(tokY(last.resent) + y(BASE)) / 2 - 30} width={180}>
        <span style={{ ...note(23, INK) }}>everything already paid for</span>
      </Note>

      {/* The bill so far. */}
      <Note at={sumBillAt - 4} x={BILL_R} y={y(BILL_Y[0] - 56)} align="right">
        <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          The bill: every bar
          <span style={{ opacity: ease(frame, replyAt - 6, 12) }}>, plus each reply</span>
        </span>
      </Note>
      {BILL_TURNS.map((t, k) => (
        <React.Fragment key={t}>
          <Note at={billCue[k] - 4} x={BILL_R} y={y(BILL_Y[k])} align="right">
            <span style={{ display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
              <span style={{ ...note(24, INK_SOFT), ...TABULAR }}>{t} turns</span>
              <span style={{ ...headline(48), ...TABULAR }}>{usd(billAt(t), 4)}</span>
            </span>
          </Note>
        </React.Fragment>
      ))}
      {[
        { k: 0, times: CONVERSATION.twentyOverTen },
        { k: 1, times: CONVERSATION.fortyOverTwenty },
      ].map(({ k, times }) => {
        const yA = y(BILL_Y[k]) + 50;
        const yB = y(BILL_Y[k + 1]) - 4;
        return (
          <React.Fragment key={k}>
            <Arrow from={[ARROW_X, yA]} to={[ARROW_X, yB]} at={doubleAt + k * 8} dur={12} color={POINT_INK} width={2.4} />
            <Note at={triplesAt - 6 + k * 6} x={ARROW_X + 16} y={(yA + yB) / 2 - 18}>
              <span
                style={{
                  ...note(28, POINT_INK),
                  fontWeight: 700,
                  ...TABULAR,
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  transformOrigin: "0 60%",
                  transform: `scale(${1 + (k === 1 ? pulse(frame, worseAt - 2, 22) * 0.18 : 0)})`,
                }}
              >
                x{times.toFixed(1)}
              </span>
            </Note>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
