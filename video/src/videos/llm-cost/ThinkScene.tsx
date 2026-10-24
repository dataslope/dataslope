import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { int, NAME, PRICES, THINKING, usd } from "./data";
import {
  Drift,
  FIG_Y,
  Guide,
  HBar,
  Headline,
  INPUT,
  Marked,
  Svg,
  OUTPUT,
  OUTPUT_INK,
  POINT_INK,
  pulse,
  THINK_FILL,
  X0,
} from "./parts";

const ROW_Y0 = 396;
const ROW_DY = 88;
const LABEL_R = 380;
const BAR_X = 410;
const BAR_MAX = 1060;
const BAR_H = 36;
const AXIS_TICKS = [0, 0.05, 0.1, 0.15, 0.2];

/**
 * Thinking tokens are output tokens: the same Sonnet request, the same
 * 400-token answer, priced at five thinking budgets. Each bar is the bill in
 * dollars, input, answer and thinking end to end; the answer's slice never
 * moves.
 */
export const ThinkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const thinkFrom = n.beat("think").from;
  const thinkingAt = n.word("think", "Thinking");
  const surpriseAt = n.word("think", "surprise");
  const billedAt = n.word("think", "billed");
  const outputAt = n.word("think", "output");
  const sameAt = n.word("budget", "Keep");
  const answerAt = n.word("budget", "four-hundred-token answer");
  const addAt = n.word("budget", "Add");
  const eightAt = n.word("budget", "eight thousand");
  const elevenAt = n.word("budget", "eleven times");
  const twentyAt = n.word("budget", "Twenty thousand");
  const twentySixAt = n.word("budget", "twenty-six times");
  const seeAt = n.word("invisible", "see");
  const longerAt = n.word("invisible", "longer");
  const end = n.beat("month").from;

  const rows = THINKING.rows;
  const p = PRICES.sonnet;
  const inCost = (THINKING.in / 1e6) * p.in;
  const ansCost = (THINKING.visible / 1e6) * p.out;
  const thinkCost = (k: number) => (k / 1e6) * p.out;
  const maxCost = rows[rows.length - 1].cost;
  const px = (usdValue: number) => (usdValue / maxCost) * BAR_MAX;
  const rowY = (i: number) => y(ROW_Y0 + i * ROW_DY);
  const bh = h(BAR_H);
  // When each row is priced: the base on "surprise", the two small budgets as
  // thinking is added, 8,000 and 20,000 on their words.
  const rowAt = [surpriseAt - 4, addAt, addAt + 8, eightAt - 4, twentyAt - 4];
  const timesAt = [surpriseAt + 8, addAt + 10, addAt + 18, elevenAt - 4, twentySixAt - 4];
  const markAt = [-1, -1, -1, elevenAt - 2, twentySixAt - 2];
  const ansX0 = BAR_X + px(inCost);
  const ansX1 = ansX0 + px(ansCost);
  const axisY = rowY(rows.length - 1) + bh + 16;

  return (
    <AbsoluteFill>
      {/* ── Sound: each row priced, the two multiples, the guides ── */}
      {rowAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 2} level={i >= 3 ? -27 : -30} />
      ))}
      <Sfx name="el-pencil" at={seeAt - 4} level={-35} />

      <Headline at={thinkFrom - 6} second={billedAt - 4} italic="are billed as output.">
        Thinking tokens
      </Headline>

      <Drift from={thinkFrom} to={end} amount={0.012} origin="30% 60%">
        <FigLabel n="9" title={`Cost of one request on ${NAME.sonnet}`} at={thinkingAt - 4} x={X0} y={y(FIG_Y)} />
        {/* The legend, at the right end of the label line. */}
        {[
          { name: `${int(THINKING.in)} in: ${usd(inCost, 3)}`, fill: INPUT, at: surpriseAt - 2 },
          { name: `${int(THINKING.visible)}-token answer: ${usd(ansCost, 3)}`, fill: OUTPUT, at: surpriseAt + 2 },
          { name: "thinking, billed as output", fill: THINK_FILL, at: outputAt - 4 },
        ].map((k, i) => (
          <Ink key={k.name} at={k.at} dur={12} style={{ left: [860, 1086, 1446][i], top: y(FIG_Y) + 2, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 26,
                height: 20,
                borderRadius: 3,
                background: k.fill,
                display: "inline-block",
                transform: `scale(${1 + (i === 1 ? pulse(frame, answerAt, 20) * 0.3 : 0)})`,
              }}
            />
            <span style={label(21, i === 2 ? OUTPUT_INK : INK_SOFT)}>{k.name}</span>
          </Ink>
        ))}

        {rows.map((r, i) => {
          const ry = rowY(i);
          const at = rowAt[i];
          const g = ease(frame, at + 6, 18);
          return (
            <React.Fragment key={r.thinking}>
              <Note at={at} x={LABEL_R} y={ry + bh / 2 - 17} align="right">
                <span style={{ ...note(26, INK), ...TABULAR, whiteSpace: "nowrap" }}>
                  {int(r.thinking)}
                  {i === 0 ? <span style={{ color: INK_SOFT }}> thinking</span> : null}
                </span>
              </Note>
              <HBar x={BAR_X} y={ry} w={px(inCost)} h={bh} at={at} dur={8} fill={INPUT} radius={2} />
              <HBar x={ansX0} y={ry} w={px(ansCost)} h={bh} at={at + 4} dur={6} fill={OUTPUT} radius={2} />
              {r.thinking > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: ansX1,
                    top: ry,
                    width: px(thinkCost(r.thinking)) * g,
                    height: bh,
                    background: THINK_FILL,
                    borderRadius: 2,
                    opacity: g > 0 ? 1 : 0,
                  }}
                />
              ) : null}
              <Note at={timesAt[i]} x={ansX1 + px(thinkCost(r.thinking)) * g + 18} y={ry + bh / 2 - 18}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
                  <span style={{ ...note(24, INK_SOFT), ...TABULAR }}>{usd(r.cost, 5)}</span>
                  <span style={{ ...note(28, markAt[i] > 0 ? POINT_INK : INK), fontWeight: 700, ...TABULAR }}>
                    {markAt[i] > 0 ? <Marked at={markAt[i]}>{`${r.times.toFixed(1)}x`}</Marked> : `${r.times.toFixed(1)}x`}
                  </span>
                </span>
              </Note>
            </React.Fragment>
          );
        })}

        {/* The answer: the same 400 tokens in every row. */}
        <Guide x={ansX0} y0={rowY(0) - 8} y1={axisY} at={seeAt - 4} color={OUTPUT_INK} />
        <Guide x={ansX1} y0={rowY(0) - 8} y1={axisY} at={seeAt} color={OUTPUT_INK} />
        {/* Bar length is dollars: an axis under the rows says so. */}
        <Svg opacity={ease(frame, surpriseAt, 14)}>
          <line x1={BAR_X} x2={BAR_X + BAR_MAX} y1={axisY} y2={axisY} stroke={INK} strokeWidth={1.4} />
          {AXIS_TICKS.map((v) => (
            <g key={v}>
              <line x1={BAR_X + px(v)} x2={BAR_X + px(v)} y1={axisY} y2={axisY + 7} stroke={INK} strokeWidth={1.2} />
              <text x={BAR_X + px(v)} y={axisY + 30} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
                {usd(v)}
              </text>
            </g>
          ))}
          <text x={BAR_X + BAR_MAX + 18} y={axisY + 30} style={{ fontFamily: SANS, fontSize: 20, fontWeight: 650, fill: INK_SOFT }}>
            cost per request
          </text>
        </Svg>
        <Note at={longerAt - 6} x={ansX0 - 30} y={axisY + 50}>
          <span style={{ ...note(24, OUTPUT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the same answer in every row</span>
        </Note>
        {/* The answer's slice glows down the rows as it is named again. */}
        {rows.map((_, i) => {
          const glow = pulse(frame, sameAt + i * 3, 18) + pulse(frame, seeAt + i * 3, 18);
          return glow > 0 ? (
            <div
              key={i}
              style={{
                position: "absolute",
                left: ansX0 - 3,
                top: rowY(i) - 3,
                width: px(ansCost) + 6,
                height: bh + 6,
                borderRadius: 4,
                boxShadow: `0 0 0 3px ${OUTPUT}`,
                opacity: Math.min(1, glow),
              }}
            />
          ) : null;
        })}
      </Drift>
    </AbsoluteFill>
  );
};
