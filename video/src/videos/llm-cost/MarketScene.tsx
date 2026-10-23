import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FIVES, int, OVERSIZED, RATES, SPREAD, THRESHOLDS, usd } from "./data";
import {
  Dim,
  FIG_Y,
  Guide,
  Hairline,
  HBar,
  Headline,
  INPUT,
  INPUT_INK,
  Marked,
  OUTPUT_INK,
  POINT,
  POINT_INK,
  pulse,
  rowGlow,
  RULE,
  Strike,
  X0,
} from "./parts";

// Fig. 5, the October 2026 table.
const HEAD_Y = 346;
const ROW_Y0 = 392;
const ROW_DY = 48;
const IN_R = 640;
const OUT_R = 790;
const RATIO_R = 890;
const BAR_X = 930;
const PX_PER_DOLLAR = 30;
const TABLE_R = 1236;
// The sidebar, then Fig. 6.
const SIDE_X = 1310;
const F6_X = 1300;
const F6_R = 1800;
const AXIS_Y = 672;

/**
 * The October 2026 market, the lesson's table verbatim: output at five times
 * input in eight rows and never less, a hundredfold spread in input price,
 * so model choice is the big lever. Then the length thresholds, and the
 * lesson's own 300,000-token prompt on GPT-6.1 Sol.
 */
export const MarketScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const marketFrom = n.beat("market").from;
  const marketAt = n.word("market", "market");
  const octoberAt = n.word("market", "October");
  const fiveAt = n.word("ratio", "five times");
  const tenRowsAt = n.word("ratio", "ten rows");
  const neverAt = n.word("ratio", "never less");
  const cheapestAt = n.word("spread", "cheapest");
  const tenCentsAt = n.word("spread", "ten cents");
  const hundredthAt = n.word("spread", "hundredth");
  const tenDollarsAt = n.word("spread", "ten dollars");
  const pickAt = n.word("choice", "pick");
  const trickAt = n.word("choice", "prompt trick");
  const halfAt = n.word("threshold", "half");
  const thresholdAt = n.word("threshold", "threshold");
  const gptAt = n.word("threshold", "GPT");
  const doubleAt = n.word("threshold", "double");
  const solAt = n.word("oversized", "Sol");
  const promptAt = n.word("oversized", "prompt");
  const dollarAt = n.word("oversized", "dollar twenty");
  const sixtyAt = n.word("oversized", "sixty cents");
  const workloadAt = n.word("estimate-in", "workload");
  const sheetAt = n.word("estimate-in", "price sheet");
  const nowAt = n.word("estimate-in", "Now");

  const rowY = (i: number) => y(ROW_Y0 + i * ROW_DY);
  const rowAt = (i: number) => marketAt - 2 + i * 3;
  const fivesIdx = RATES.map((r, i) => (Math.abs(r.ratio - 5) < 1e-9 ? i : -1)).filter((i) => i >= 0);
  const moreIdx = RATES.map((r, i) => (r.ratio > 5 + 1e-9 ? i : -1)).filter((i) => i >= 0);
  const minIn = Math.min(...RATES.map((r) => r.in));
  const maxIn = Math.max(...RATES.map((r) => r.in));
  const cheapIdx = RATES.map((r, i) => (r.in === minIn ? i : -1)).filter((i) => i >= 0);
  const dearIdx = RATES.map((r, i) => (r.in === maxIn ? i : -1)).filter((i) => i >= 0);
  // The rows a threshold applies to: the threshold table names each model, or its family.
  const hasThreshold = (model: string) =>
    THRESHOLDS.some((t) => t.model === model || (t.model.includes("GPT-6 family") && model.startsWith("GPT-6")));
  const gptIdx = RATES.map((r, i) => (r.model.startsWith("GPT-6") ? i : -1)).filter((i) => i >= 0);
  const solIdx = RATES.findIndex((r) => r.model === OVERSIZED.model);
  const sideOut = halfAt - 6;

  // Fig. 6's prompt-length axis: 0 to the oversized prompt.
  const axX = (tokens: number) => F6_X + (tokens / OVERSIZED.tokens) * (F6_R - F6_X - 10);
  const gpt6 = THRESHOLDS.find((t) => t.model.includes("GPT-6 family"))!;

  return (
    <AbsoluteFill>
      {/* ── Sound: the rows, the marks, the bracket, Fig. 6, the bill ── */}
      <Sfx name="el-pencil" at={marketAt - 2} level={-36} />
      <Sfx name="el-tap" at={fiveAt - 2} level={-29} />
      <Sfx name="el-tap" at={tenCentsAt - 2} level={-28} />
      <Sfx name="el-tap" at={tenDollarsAt - 2} level={-27} />
      <Sfx name="el-whoosh" at={sideOut} level={-35} />
      <Sfx name="el-tap" at={gptAt - 2} level={-29} />
      <Sfx name="el-tap" at={dollarAt - 2} level={-27} />
      <Sfx name="el-scratch" at={sixtyAt} level={-35} />

      <Headline at={marketFrom - 6} second={octoberAt - 4} italic="October 2026.">
        The market,
      </Headline>

      {/* The turn: the sheet sets back slowly while the next question is asked. */}
      <Dim at={nowAt - 4} to={0.4} dur={Math.max(16, workloadAt - nowAt + 46)}>
        {/* ── Fig. 5: the table ── */}
        <FigLabel n="5" title="Published rates, USD per million tokens" at={marketFrom + 2} x={X0} y={y(FIG_Y)} />
        {[
          ["Model", X0, "left"],
          ["Input", IN_R, "right"],
          ["Output", OUT_R, "right"],
          ["Ratio", RATIO_R, "right"],
          ["Input price", BAR_X, "left"],
        ].map(([t, x, a], k) => (
          <Note key={t as string} at={marketAt - 6 + k * 2} x={x as number} y={y(HEAD_Y)} align={a as "left" | "right"} from="up">
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>{t}</span>
          </Note>
        ))}
        <Hairline x={X0} y={y(HEAD_Y) + 36} w={TABLE_R - X0} at={marketAt - 4} color={INK_SOFT} />

        {RATES.map((r, i) => {
          const ry = rowY(i);
          const at = rowAt(i);
          const isFive = fivesIdx.indexOf(i);
          const isMore = moreIdx.includes(i);
          const cheap = cheapIdx.includes(i);
          const dear = dearIdx.includes(i);
          const glow =
            (gptIdx.includes(i) ? ease(frame, gptAt - 4, 10) * (1 - ease(frame, solAt - 4, 10)) : 0) +
            (i === solIdx ? ease(frame, solAt - 4, 10) : 0);
          const barPulse = (cheap ? pulse(frame, tenCentsAt, 24) : 0) + (dear ? pulse(frame, tenDollarsAt, 24) : 0);
          return (
            <React.Fragment key={r.model}>
              <div
                style={{
                  position: "absolute",
                  left: X0 - 12,
                  top: ry - 8,
                  width: TABLE_R - X0 + 24,
                  height: h(ROW_DY) - 6,
                  borderRadius: 6,
                  background: rowGlow(Math.min(1, glow)),
                }}
              />
              {/* The rows a length threshold applies to. */}
              <div
                style={{
                  position: "absolute",
                  left: X0 - 26,
                  top: ry + 2,
                  width: 6,
                  height: 26,
                  borderRadius: 3,
                  background: INK,
                  opacity: hasThreshold(r.model) ? ease(frame, halfAt + i * 2, 10) : 0,
                }}
              />
              <Note at={at} x={X0} y={ry}>
                <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{r.model}</span>
              </Note>
              <Note at={at + 2} x={IN_R} y={ry} align="right">
                <span style={{ ...note(24, INK), ...TABULAR, whiteSpace: "nowrap" }}>
                  {cheap ? <Marked at={tenCentsAt - 4}>{usd(r.in)}</Marked> : dear ? <Marked at={tenDollarsAt - 4}>{usd(r.in)}</Marked> : usd(r.in)}
                </span>
              </Note>
              <Note at={at + 3} x={OUT_R} y={ry} align="right">
                <span style={{ ...note(24, INK), ...TABULAR, whiteSpace: "nowrap" }}>{usd(r.out)}</span>
              </Note>
              <Note at={at + 4} x={RATIO_R} y={ry} align="right">
                <span style={{ ...note(24, isMore ? OUTPUT_INK : INK), fontWeight: isMore ? 700 : 500, whiteSpace: "nowrap" }}>
                  {isFive >= 0 ? (
                    <Marked at={Math.round(fiveAt + ((tenRowsAt - fiveAt) * isFive) / Math.max(1, fivesIdx.length - 1))}>{r.ratioPrinted}</Marked>
                  ) : (
                    r.ratioPrinted
                  )}
                </span>
              </Note>
              <HBar
                x={BAR_X}
                y={ry + 6}
                w={Math.max(2, r.in * PX_PER_DOLLAR)}
                h={h(20)}
                at={at + 6}
                fill={INPUT}
                style={{ transform: `scaleY(${1 + barPulse * 0.5})` }}
              />
              <Hairline x={X0} y={ry + h(ROW_DY) - 14} w={TABLE_R - X0} at={at + 4} color={RULE} />
            </React.Fragment>
          );
        })}
        {/* More than five: the two rows outlined on "never less". */}
        {moreIdx.map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: RATIO_R - 50,
              top: rowY(i) - 4,
              width: 60,
              height: 36,
              borderRadius: 18,
              border: `2px solid ${OUTPUT_INK}`,
              opacity: ease(frame, neverAt, 10),
            }}
          />
        ))}

        {/* ── The sidebar: what the table says, as it is said ── */}
        <div style={{ opacity: 1 - ease(frame, sideOut, 12) }}>
          <Ink at={fiveAt - 4} dur={14} style={{ left: SIDE_X, top: y(352), whiteSpace: "nowrap" }}>
            <span style={label(23, INK_SOFT)}>Output against input</span>
          </Ink>
          <Ink at={fiveAt} dur={16} style={{ left: SIDE_X, top: y(386), whiteSpace: "nowrap" }}>
            <span style={{ ...headline(92), color: OUTPUT_INK }}>5x</span>
          </Ink>
          <Note at={tenRowsAt - 2} x={SIDE_X + 150} y={y(406)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              in {FIVES} of {RATES.length} rows
            </span>
          </Note>
          <Note at={neverAt - 2} x={SIDE_X + 150} y={y(444)}>
            <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>and never less</span>
          </Note>

          <Ink at={cheapestAt - 4} dur={14} style={{ left: SIDE_X, top: y(540), whiteSpace: "nowrap" }}>
            <span style={label(23, INK_SOFT)}>Cheapest input to dearest</span>
          </Ink>
          <Ink at={hundredthAt - 2} dur={16} style={{ left: SIDE_X, top: y(574), whiteSpace: "nowrap" }}>
            <span style={{ ...headline(92), color: POINT_INK }}>{SPREAD}x</span>
          </Ink>
          <Note at={tenDollarsAt - 2} x={SIDE_X + 230} y={y(604)}>
            <span style={{ ...note(25, INK), ...TABULAR, whiteSpace: "nowrap" }}>
              {usd(minIn)} to {usd(maxIn)}
            </span>
          </Note>

          <Ink at={pickAt - 4} dur={18} style={{ left: SIDE_X, top: y(742), width: 480 }}>
            <span style={{ ...body(33, true), color: INK }}>
              The model you pick moves the bill more than any <Marked at={trickAt}>prompt trick.</Marked>
            </span>
          </Ink>
        </div>

        {/* ── Fig. 6: length thresholds ── */}
        <FigLabel n="6" title="Length thresholds" at={thresholdAt - 4} x={F6_X} y={y(FIG_Y)} />
        {[
          ["Model", F6_X, "left"],
          ["Threshold", 1652, "right"],
          ["Input", 1726, "right"],
          ["Output", F6_R, "right"],
        ].map(([t, x, a], k) => (
          <Note key={t as string} at={thresholdAt + k * 2} x={x as number} y={y(HEAD_Y)} align={a as "left" | "right"} from="up">
            <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>{t}</span>
          </Note>
        ))}
        <Hairline x={F6_X} y={y(HEAD_Y) + 36} w={F6_R - F6_X} at={thresholdAt} color={INK_SOFT} />
        {THRESHOLDS.map((t, i) => {
          const ry = rowY(i);
          const at = thresholdAt + 4 + i * 4;
          const lit = t === gpt6 ? ease(frame, gptAt - 4, 10) : 0;
          return (
            <React.Fragment key={t.model}>
              <div
                style={{
                  position: "absolute",
                  left: F6_X - 10,
                  top: ry - 8,
                  width: F6_R - F6_X + 20,
                  height: h(ROW_DY) - 6,
                  borderRadius: 6,
                  background: rowGlow(lit),
                }}
              />
              <Note at={at} x={F6_X} y={ry}>
                <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>{t.model}</span>
              </Note>
              <Note at={at + 2} x={1652} y={ry} align="right">
                <span style={{ ...note(22, INK), ...TABULAR, whiteSpace: "nowrap" }}>{int(t.threshold)}</span>
              </Note>
              <Note at={at + 3} x={1726} y={ry} align="right">
                <span style={{ ...note(22, INK), fontWeight: t === gpt6 ? 700 : 500, whiteSpace: "nowrap" }}>
                  {t === gpt6 ? <Marked at={doubleAt - 2}>{`${t.inMult}x`}</Marked> : `${t.inMult}x`}
                </span>
              </Note>
              <Note at={at + 4} x={F6_R} y={ry} align="right">
                <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>{t.outMult}x</span>
              </Note>
              <Hairline x={F6_X} y={ry + h(ROW_DY) - 14} w={F6_R - F6_X} at={at + 2} color={RULE} />
            </React.Fragment>
          );
        })}

        {/* The lesson's oversized prompt on GPT-6.1 Sol. */}
        <Ink at={solAt - 4} dur={14} style={{ left: F6_X, top: y(AXIS_Y - 92), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>
            {OVERSIZED.model}, a {int(OVERSIZED.tokens)}-token prompt
          </span>
        </Ink>
        <HBar x={F6_X} y={y(AXIS_Y - 44)} w={axX(OVERSIZED.tokens) - F6_X} h={h(30)} at={promptAt - 4} dur={22} fill={INPUT} />
        <HBar
          x={axX(OVERSIZED.threshold)}
          y={y(AXIS_Y - 44)}
          w={axX(OVERSIZED.tokens) - axX(OVERSIZED.threshold)}
          h={h(30)}
          at={promptAt + 14}
          dur={8}
          fill={`repeating-linear-gradient(135deg, ${POINT} 0 4px, transparent 4px 8px)`}
          radius={0}
        />
        <Guide x={axX(OVERSIZED.threshold)} y0={y(AXIS_Y - 62)} y1={y(AXIS_Y) + 4} at={promptAt + 4} color={INK} />
        <Note at={promptAt + 8} x={axX(OVERSIZED.threshold) - 10} y={y(AXIS_Y) + 10} align="right">
          <span style={{ ...note(21, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>line at {int(OVERSIZED.threshold)}</span>
        </Note>
        <Note at={promptAt + 20} x={F6_X} y={y(AXIS_Y + 50)}>
          <span style={{ ...note(25, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
            <Strike at={sixtyAt}>{usd(OVERSIZED.headline)}</Strike> at the headline rate
          </span>
        </Note>
        <Note at={dollarAt - 4} x={F6_X} y={y(AXIS_Y + 96)}>
          <span style={{ ...note(27, INPUT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            <Marked at={sheetAt - 2}>{usd(OVERSIZED.above)}</Marked>
            <span style={{ ...note(25, INK), fontWeight: 500 }}>, the whole request at {gpt6.inMult}x</span>
          </span>
        </Note>
      </Dim>
    </AbsoluteFill>
  );
};
