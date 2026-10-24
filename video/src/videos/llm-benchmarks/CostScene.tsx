import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { cents, COST, step, TIERS, usd } from "./data";
import { A, A_INK, B, Drift, Headline, lerp, Marked, pulse, Svg, TRAP, TRAP_INK, X0 } from "./parts";

const ROW_Y = [420, 506, 592, 678];
const ACC = { x0: 330, x1: 830 };
const BILL = { x0: 1040, x1: 1480 };
const BAR_H = 30;

const tierName = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * Cost beside accuracy (Fig. 15): the lesson's four tiers on one task, a
 * million requests a month at 700 tokens in and 25 out. Accuracy barely
 * moves, 91 to 95; the bill runs from $83 to $8,250. Each step up is marked
 * with what it buys, then priced per error it avoids (data.ts STEPS): Sonnet's
 * three points remove 30,000 errors for $1,567.50, about 5 cents each, so if a
 * mistake costs even a minute of someone's time the cheap model is the
 * expensive one. (The lesson draws the opposite conclusion from the same
 * table; see script.ts.)
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("cost").from;
  const besideAt = n.word("cost", "beside accuracy");
  const ninetyOneAt = n.word("cost", "ninety-one");
  const ninetyFiveAt = n.word("cost", "ninety-five percent");
  const millionAt = n.word("cost", "million requests");
  const monthAt = n.word("cost", "month");
  const opusAt = n.word("cost-gaps", "Opus", { nth: 1 });
  const onePointAt = n.word("cost-gaps", "one point");
  const twiceAt = n.word("cost-gaps", "twice the money");
  const fableAt = n.word("cost-gaps", "Fable");
  const nothingAt = n.word("cost-gaps", "nothing");
  const halfAt = n.word("cost-gaps", "two and a half times");
  const priceAt = n.word("cost-error", "price");
  const sonnetAt = n.word("cost-error", "Sonnet's");
  const threeAt = n.word("cost-error", "three points");
  const thirtyAt = n.word("cost-error", "thirty thousand");
  const fiveAt = n.word("cost-error", "five cents");
  const minuteAt = n.word("cost-verdict", "minute");
  const expensiveAt = n.word("cost-verdict", "expensive");
  const end = n.beat("end").from;

  const maxBill = Math.max(...TIERS.map((t) => t.monthly));
  const accX = (v: number) => ACC.x0 + ((ACC.x1 - ACC.x0) * v) / 100;
  const billX = (v: number) => BILL.x0 + ((BILL.x1 - BILL.x0) * v) / maxBill;
  const accAt = (i: number) => Math.round(lerp(ninetyOneAt - 4, ninetyFiveAt - 2, i / 3));
  const billAt = (i: number) => Math.round(lerp(millionAt - 4, monthAt + 6, i / 3));
  const sonnet = TIERS.findIndex((t) => t.name === "sonnet");
  const opus = TIERS.findIndex((t) => t.name === "opus");
  const fable = TIERS.findIndex((t) => t.name === "fable");
  const toSonnet = step("sonnet");
  const toOpus = step("opus");
  const toFable = step("fable");
  const sonnetLit = ease(frame, sonnetAt - 2, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the two comparisons, the two outcomes ── */}
      <Sfx name="el-whoosh" at={accAt(0)} level={-33} />
      {TIERS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={billAt(i) + 8} level={-28 - (i % 2)} />
      ))}
      <Sfx name="el-pencil" at={onePointAt - 2} level={-34} />
      <Sfx name="el-pencil" at={nothingAt - 2} level={-34} />
      <Sfx name="el-pencil" at={threeAt - 2} level={-34} />
      <Sfx name="el-tap" at={thirtyAt} level={-27} />
      <Sfx name="el-tap" at={minuteAt} level={-28} />

      <Headline at={from - 6} second={besideAt - 4} italic="beside accuracy.">
        Put cost
      </Headline>
      <FigLabel
        n="15"
        title={`Four tiers on one task: a million requests a month, ${COST.inTokens} tokens in, ${COST.outTokens} out`}
        at={from}
        x={X0}
        y={y(282)}
      />

      <Drift from={from} to={end} amount={0.01} origin="50% 55%">
        <Ink at={ninetyOneAt - 8} dur={12} style={{ left: ACC.x0, top: y(352), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>accuracy on the task</span>
        </Ink>
        <Ink at={millionAt - 8} dur={12} style={{ left: BILL.x0, top: y(352), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>monthly bill</span>
        </Ink>
        {TIERS.map((t, i) => {
          const ry = y(ROW_Y[i]);
          const a = ease(frame, accAt(i), 16);
          const b = ease(frame, billAt(i), 18);
          const isCheap = i === 0;
          const lit = i === sonnet ? sonnetLit : 0;
          const fill = `color-mix(in srgb, ${A} ${Math.round(lit * 100)}%, ${B})`;
          const ink = lit > 0.5 ? A_INK : INK;
          return (
            <React.Fragment key={t.name}>
              <Ink at={accAt(i) - 4} dur={12} style={{ left: X0, top: ry - 17, whiteSpace: "nowrap" }}>
                <span style={{ ...label(26, INK), fontWeight: 650 }}>
                  {isCheap ? <Marked at={expensiveAt - 2} color={`color-mix(in srgb, ${TRAP} 30%, transparent)`}>{tierName(t.name)}</Marked> : tierName(t.name)}
                </span>
              </Ink>
              <Svg>
                <rect x={ACC.x0} y={ry - BAR_H / 2} width={(accX(t.accuracy) - ACC.x0) * a} height={BAR_H} rx={3} fill={fill} opacity={0.9} />
                <rect
                  x={BILL.x0}
                  y={ry - BAR_H / 2}
                  width={Math.max(4, billX(t.monthly) - BILL.x0) * b}
                  height={BAR_H}
                  rx={3}
                  fill={fill}
                  opacity={0.9}
                />
                <line x1={X0} x2={BILL.x1 + 120} y1={ry + 38} y2={ry + 38} stroke={HAIRLINE} strokeWidth={0.8} opacity={0.5 * a} />
              </Svg>
              <Ink at={accAt(i) + 8} dur={10} style={{ left: accX(t.accuracy) + 12, top: ry - 16, whiteSpace: "nowrap" }}>
                <span style={{ ...note(24, ink), fontWeight: 650, ...TABULAR }}>{t.accuracy}%</span>
              </Ink>
              <Ink at={billAt(i) + 10} dur={10} style={{ left: Math.max(BILL.x0 + 4, billX(t.monthly)) + 12, top: ry - 16, whiteSpace: "nowrap" }}>
                <span style={{ ...note(24, ink), fontWeight: 650, ...TABULAR }}>{usd(t.monthly)}</span>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* What each step up buys, on the row that pays for it. */}
        <Gain at={onePointAt - 2} x={accX(TIERS[opus].accuracy) + 86} y={y(ROW_Y[opus])} pulseAt={opusAt}>
          +{toOpus.points} point
        </Gain>
        <Gain at={twiceAt - 2} x={billX(TIERS[opus].monthly) + 112} y={y(ROW_Y[opus])} pulseAt={twiceAt}>
          {fmtTimes(toOpus.times)} the cost
        </Gain>
        <Gain at={nothingAt - 2} x={accX(TIERS[fable].accuracy) + 86} y={y(ROW_Y[fable])} pulseAt={fableAt}>
          +{toFable.points} points
        </Gain>
        <Gain at={halfAt - 2} x={billX(TIERS[fable].monthly) + 112} y={y(ROW_Y[fable])} pulseAt={halfAt}>
          {fmtTimes(toFable.times)} the cost
        </Gain>
        <Gain at={threeAt - 2} x={accX(TIERS[sonnet].accuracy) + 86} y={y(ROW_Y[sonnet])} pulseAt={threeAt}>
          +{toSonnet.points} points
        </Gain>
        <Gain at={threeAt + 8} x={billX(TIERS[sonnet].monthly) + 112} y={y(ROW_Y[sonnet])} pulseAt={threeAt + 8}>
          {fmtTimes(toSonnet.times)} the cost
        </Gain>

        {/* Each step priced per error it avoids, from the same table. */}
        <Ink at={priceAt - 4} dur={14} style={{ left: X0, top: y(748), whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK), fontWeight: 600 }}>
            Sonnet over Haiku:{" "}
            <span style={{ opacity: ease(frame, thirtyAt - 2, 10) }}>
              <span style={TABULAR}>{toSonnet.avoided.toLocaleString("en-US")}</span> fewer errors a month for{" "}
              <span style={TABULAR}>{usd(toSonnet.extra, 2)}</span>,
            </span>{" "}
            <span style={{ color: A_INK, fontWeight: 700, opacity: ease(frame, fiveAt - 2, 10) }}>
              <Marked at={fiveAt}>about {cents(toSonnet.perError ?? 0)} each</Marked>
            </span>
          </span>
        </Ink>
        <Ink at={fiveAt + 14} dur={14} style={{ left: X0, top: y(748) + 44, whiteSpace: "nowrap" }}>
          <span style={note(22, INK_SOFT)}>
            Opus over Sonnet: <span style={TABULAR}>{toOpus.avoided.toLocaleString("en-US")}</span> fewer for{" "}
            <span style={TABULAR}>{usd(toOpus.extra)}</span>, {cents(toOpus.perError ?? 0)} each. Fable over Opus: none fewer.
          </span>
        </Ink>
        <Ink at={minuteAt - 4} dur={16} style={{ left: X0, top: y(840), whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: INK }}>
            A minute of someone&apos;s time costs more than that:{" "}
            <span style={{ color: TRAP_INK, opacity: ease(frame, expensiveAt - 6, 12) }}>the cheap model is the expensive one.</span>
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};

/** "2x", "2.5x": a cost multiple as the lesson prints it. */
const fmtTimes = (x: number) => `${Number.isInteger(Math.round(x * 10) / 10) ? Math.round(x) : (Math.round(x * 10) / 10).toFixed(1)}x`;

/** A small annotation of what a step up buys, inked on its cue. */
const Gain: React.FC<{ at: number; x: number; y: number; pulseAt: number; align?: "left" | "right"; children: React.ReactNode }> = ({
  at,
  x,
  y,
  pulseAt,
  align = "left",
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <Ink at={at} dur={12} style={{ left: x, top: y - 15, whiteSpace: "nowrap" }}>
      <span
        style={{
          ...note(22, INK),
          fontWeight: 700,
          display: "inline-block",
          transform: `${align === "right" ? "translateX(-100%) " : ""}scale(${1 + pulse(frame, pulseAt + 4, 16) * 0.05})`,
          transformOrigin: align === "right" ? "100% 50%" : "0 50%",
        }}
      >
        {children}
      </span>
    </Ink>
  );
};
