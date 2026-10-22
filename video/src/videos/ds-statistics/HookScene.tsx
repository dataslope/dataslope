import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, body, label } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mark, noteText, pulse, Spot, Strike, X0 } from "./parts";

/** The three stages and how many questions each holds, then the short ones. */
const STAGES = [
  { name: "Sampling", count: 5, cue: "sampling" },
  { name: "Estimation", count: 3, cue: "then estimation" },
  { name: "Testing", count: 8, cue: "then testing" },
] as const;
const SHORT = 3;
const MISREAD_Y = 330;
const ROAD_Y = 470;
const DOT = 30;
const DOT_GAP = 14;
const STAGE_GAP = 54;

/**
 * The opening: the two sentences that give a candidate away, each written
 * out and struck through; then the nineteen questions as dots in three
 * stages (sampling, estimation, testing) with the short three after them,
 * and the first stage lit on the bridge into question 1.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const rustyAt = n.word("hook", "rustiest");
  const sentenceAt = n.word("hook", "a single sentence");
  const pAt = n.word("hook", "a p-value read as");
  const ciAt = n.word("hook", "a ninety-five percent interval");
  const hookEnd = n.beat("hook").to;
  const nineteenAt = n.word("plan", "Nineteen");
  const stageAt = STAGES.map((s) => n.word("plan", s.cue));
  const figureAt = n.word("plan", "Sixteen come with a figure");
  const shortAt = n.word("plan", "The last three are short");
  const bridgeAt = n.word("param-in", "one bridge");
  const endsAt = n.word("param-in", "the two ends");
  const end = n.beat("param-in").to;

  // Dots: x for each, stage by stage, then the short three.
  const dots: { x: number; stage: number }[] = [];
  let x = X0;
  STAGES.forEach((s, k) => {
    for (let i = 0; i < s.count; i++) {
      dots.push({ x, stage: k });
      x += DOT + DOT_GAP;
    }
    x += STAGE_GAP - DOT_GAP;
  });
  const shortX = x;
  for (let i = 0; i < SHORT; i++) {
    dots.push({ x, stage: 3 });
    x += DOT + DOT_GAP;
  }
  const stageX = (k: number) => {
    const xs = dots.filter((d) => d.stage === k).map((d) => d.x);
    return { x0: xs[0], x1: xs[xs.length - 1] + DOT };
  };
  const roadY = y(ROAD_Y);
  const misreadOut = nineteenAt - 6;
  const clearAt = endsAt + 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={hookEnd - 18} level={-32} />
      <Sfx name="el-scratch" at={hookEnd - 8} level={-32} />
      <Sfx name="el-pop" at={nineteenAt} level={-30} />
      <Sfx name="el-tap" at={figureAt + 2} level={-32} />
      <Sfx name="el-pencil" at={bridgeAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data scientist interview prep</Kicker>
        <Headline lead="Statistics:" turn="the round you're rustiest on" at={from + 4} turnAt={rustyAt - 4} size={72} />

        <Spot id="ds-statistics-hedgehog" at={from + 8} left={1210} top={y(300)} width={600} height={430} />

        {/* ── The two sentences that give a candidate away ── */}
        <Note at={sentenceAt} x={X0} y={y(MISREAD_Y - 6)} out={misreadOut}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 650 }}>One sentence gives it away</span>
        </Note>
        {[
          { at: pAt, term: "a p-value", read: "the chance the null is true", strike: hookEnd - 18 },
          { at: ciAt, term: "a 95% interval", read: "a 95% chance", strike: hookEnd - 8 },
        ].map((m, i) => (
          <Note key={m.term} at={m.at} x={X0} y={y(MISREAD_Y + 56 + i * 110)} out={misreadOut}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
              <span style={{ ...noteText(36, INK), fontWeight: 650 }}>{m.term}</span>
              <span style={{ ...label(22, INK_SOFT) }}>read as</span>
              <span style={{ ...body(42, true), color: ACCENT_INK }}>
                <Strike at={m.strike}>“{m.read}”</Strike>
              </span>
            </div>
          </Note>
        ))}

        {/* ── Nineteen questions in three stages, then the short three ── */}
        <Note at={nineteenAt} x={X0} y={roadY - h(92)} dim={bridgeAt}>
          <span style={{ ...noteText(30, INK), ...TABULAR }}>
            <span style={{ fontWeight: 650 }}>19</span> questions
          </span>
        </Note>
        {dots.map((d, i) => {
          const inAt = d.stage < 3 ? stageAt[d.stage] - 2 + (i % 8) * 1.5 : shortAt - 2 + (i - 16) * 2;
          const p = ease(frame, inAt, 10);
          if (p <= 0) return null;
          const solid = d.stage < 3 ? ease(frame, figureAt + i, 10) : 0;
          const lit = d.stage === 0 ? ease(frame, bridgeAt, 12) : 0;
          const dim = d.stage === 0 ? 0 : ease(frame, bridgeAt + 2, 14) * 0.6;
          const gone = ease(frame, clearAt + (d.stage === 0 ? 8 : 0), 12);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: d.x,
                top: roadY,
                width: DOT,
                height: DOT,
                boxSizing: "border-box",
                borderRadius: "50%",
                border: `2.5px solid ${d.stage < 3 ? BAR : INK_SOFT}`,
                background: lit > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, ${BAR})` : d.stage < 3 ? `color-mix(in srgb, ${BAR} ${solid * 100}%, ${PAPER})` : PAPER,
                opacity: p * (1 - dim) * (1 - gone),
                transform: `scale(${(0.6 + 0.4 * p) * (1 + 0.18 * pulse(frame, bridgeAt + (i % 5) * 2, 16))})`,
              }}
            />
          );
        })}
        {STAGES.map((s, k) => {
          const { x0, x1 } = stageX(k);
          return (
            <Note key={s.name} at={stageAt[k] + 2} x={x0} y={roadY + h(48)} dim={k === 0 ? undefined : bridgeAt + 2} out={clearAt}>
              <span style={{ ...noteText(26, INK), fontWeight: k === 0 ? 650 : 500, minWidth: x1 - x0, display: "inline-block" }}>
                {k === 0 ? <Mark at={bridgeAt + 2}>{s.name}</Mark> : s.name}
              </span>
            </Note>
          );
        })}
        <Note at={shortAt + 4} x={shortX} y={roadY + h(48)} dim={bridgeAt + 2} out={clearAt}>
          <span style={{ ...noteText(26, INK_SOFT) }}>short</span>
        </Note>
        <Note at={figureAt + 6} x={X0} y={roadY + h(110)} dim={bridgeAt + 2} out={clearAt}>
          <span style={{ ...noteText(24, INK_SOFT) }}>
            <span style={{ color: BAR, fontWeight: 650 }}>16</span> come with a figure
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
