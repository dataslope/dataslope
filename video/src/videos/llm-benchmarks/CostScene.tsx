import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COST, TIERS, usd } from "./data";
import { A, A_INK, B, Drift, Headline, lerp, Marked, OK, OK_INK, pulse, Svg, Tag, TRAP, TRAP_INK, X0 } from "./parts";

const ROW_Y = [420, 506, 592, 678];
const ACC = { x0: 330, x1: 830 };
const BILL = { x0: 1040, x1: 1480 };
const BAR_H = 30;

const tierName = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * Cost beside accuracy (Fig. 15): the lesson's four tiers on one task, a
 * million requests a month at 700 tokens in and 25 out. Accuracy barely
 * moves, 91 to 95; the bill runs from $83 to $8,250. Opus buys one point
 * over Sonnet for twice the money, Fable nothing over Opus for two and a half
 * times. What decides it is what an error costs.
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
  const errorAt = n.word("cost-error", "error costs");
  const triageAt = n.word("cost-error", "minute of triage");
  const winsAt = n.word("cost-error", "wins");
  const customerAt = n.word("cost-error", "lost customer");
  const doesntAt = n.word("cost-error", "doesn't");
  const end = n.beat("end").from;

  const maxBill = Math.max(...TIERS.map((t) => t.monthly));
  const accX = (v: number) => ACC.x0 + ((ACC.x1 - ACC.x0) * v) / 100;
  const billX = (v: number) => BILL.x0 + ((BILL.x1 - BILL.x0) * v) / maxBill;
  const accAt = (i: number) => Math.round(lerp(ninetyOneAt - 4, ninetyFiveAt - 2, i / 3));
  const billAt = (i: number) => Math.round(lerp(millionAt - 4, monthAt + 6, i / 3));
  const cheapWin = ease(frame, winsAt - 2, 12) * (1 - ease(frame, doesntAt - 2, 12));
  const sonnet = TIERS.findIndex((t) => t.name === "sonnet");
  const opus = TIERS.findIndex((t) => t.name === "opus");
  const fable = TIERS.findIndex((t) => t.name === "fable");
  const extra = (a: number, b: number) => TIERS[b].accuracy - TIERS[a].accuracy;
  const times = (a: number, b: number) => TIERS[b].monthly / TIERS[a].monthly;

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the two comparisons, the two outcomes ── */}
      <Sfx name="el-whoosh" at={accAt(0)} level={-33} />
      {TIERS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={billAt(i) + 8} level={-28 - (i % 2)} />
      ))}
      <Sfx name="el-pencil" at={onePointAt - 2} level={-34} />
      <Sfx name="el-pencil" at={nothingAt - 2} level={-34} />
      <Sfx name="el-tap" at={triageAt} level={-28} />
      <Sfx name="el-tap" at={customerAt} level={-28} />

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
          const glow = isCheap ? cheapWin : 0;
          return (
            <React.Fragment key={t.name}>
              <Ink at={accAt(i) - 4} dur={12} style={{ left: X0, top: ry - 17, whiteSpace: "nowrap" }}>
                <span style={{ ...label(26, INK), fontWeight: 650 }}>{isCheap ? <Marked at={winsAt - 2} out={doesntAt}>{tierName(t.name)}</Marked> : tierName(t.name)}</span>
              </Ink>
              <Svg>
                <rect x={ACC.x0} y={ry - BAR_H / 2} width={(accX(t.accuracy) - ACC.x0) * a} height={BAR_H} rx={3} fill={isCheap ? A : B} opacity={0.9} />
                <rect
                  x={BILL.x0}
                  y={ry - BAR_H / 2}
                  width={Math.max(4, billX(t.monthly) - BILL.x0) * b}
                  height={BAR_H}
                  rx={3}
                  fill={isCheap ? A : B}
                  opacity={0.9}
                  stroke={glow > 0 ? OK : "none"}
                  strokeWidth={3 * glow}
                />
                <line x1={X0} x2={BILL.x1 + 120} y1={ry + 38} y2={ry + 38} stroke={HAIRLINE} strokeWidth={0.8} opacity={0.5 * a} />
              </Svg>
              <Ink at={accAt(i) + 8} dur={10} style={{ left: accX(t.accuracy) + 12, top: ry - 16, whiteSpace: "nowrap" }}>
                <span style={{ ...note(24, isCheap ? A_INK : INK), fontWeight: 650, ...TABULAR }}>{t.accuracy}%</span>
              </Ink>
              <Ink at={billAt(i) + 10} dur={10} style={{ left: Math.max(BILL.x0 + 4, billX(t.monthly)) + 12, top: ry - 16, whiteSpace: "nowrap" }}>
                <span style={{ ...note(24, isCheap ? A_INK : INK), fontWeight: 650, ...TABULAR }}>{usd(t.monthly)}</span>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* What each step up buys, on the row that pays for it. */}
        <Gain at={onePointAt - 2} x={accX(TIERS[opus].accuracy) + 86} y={y(ROW_Y[opus])} pulseAt={opusAt}>
          +{extra(sonnet, opus)} point
        </Gain>
        <Gain at={twiceAt - 2} x={billX(TIERS[opus].monthly) + 112} y={y(ROW_Y[opus])} pulseAt={twiceAt}>
          {fmtTimes(times(sonnet, opus))} the cost
        </Gain>
        <Gain at={nothingAt - 2} x={accX(TIERS[fable].accuracy) + 86} y={y(ROW_Y[fable])} pulseAt={fableAt}>
          +{extra(opus, fable)} points
        </Gain>
        <Gain at={halfAt - 2} x={billX(TIERS[fable].monthly) + 112} y={y(ROW_Y[fable])} pulseAt={halfAt}>
          {fmtTimes(times(opus, fable))} the cost
        </Gain>

        {/* What decides it. */}
        <Ink at={errorAt - 4} dur={14} style={{ left: X0, top: y(790), whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK), fontWeight: 600 }}>If an error costs</span>
        </Ink>
        <Tag at={triageAt - 2} x={X0 + 260} y={y(790) - 8} color={OK}>
          <span style={{ color: OK_INK }}>a minute of triage: the cheap model wins</span>
        </Tag>
        <Tag at={customerAt - 2} x={X0 + 860} y={y(790) - 8} color={TRAP}>
          <span style={{ color: TRAP_INK }}>a lost customer: it doesn&apos;t</span>
        </Tag>
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
          ...note(22, TRAP_INK),
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
