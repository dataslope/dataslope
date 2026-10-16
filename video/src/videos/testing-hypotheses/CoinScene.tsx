import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, halo, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COIN } from "./data";
import { Bracket, Count, DATA, Drift, Head, Kicker, Label, lerp, Mark, pct, pulse, Spot, STAT, STAT_INK, Svg } from "./parts";

const LO = 30;
const HI = 70;
const X: XScale = { lo: LO - 0.5, hi: HI + 0.5, x0: 220, x1: 1700 };
const BASE = 790;
const TALL = 380;
const MAX = Math.max(...COIN.counts);

/**
 * The p-value built by hand: 100,000 runs of a fair coin pile up into the
 * null distribution, and the share of runs at least twelve from fifty, on
 * either side, is the 2.1% the lesson's simulation prints.
 */
export const CoinScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const coinFrom = n.beat("coin").from;
  const coinAt = n.word("coin", "coin");
  const sixtyAt = n.word("coin", "sixty-two");
  const flipsAt = n.word("coin", "flips");
  const fairAt = n.word("fair", "fair");
  const pValueAt = n.word("area", "p-value");
  const themAt = n.word("area", "them");
  const simulateAt = n.word("fair", "simulate");
  const thousandAt = n.word("fair", "thousand");
  const pileAt = n.word("fair", "pile");
  const nullAt = n.word("fair", "null distribution");
  const twelveAt = n.word("far", "twelve");
  const sixtyFarAt = n.word("far", "Sixty-two");
  const thirtyAt = n.word("far", "thirty-eight");
  const countAt = n.word("far", "count");
  const farOutAt = n.word("far", "far out");
  const twoAt = n.word("area", "Two point one");
  const shareAt = n.word("area", "share");
  const extremeAt = n.word("area", "extreme");
  const areaAt = n.word("verdict-not", "area");
  const cantAt = n.word("isnt-in", "can't");

  // The runs arrive: the pile grows as the count of simulated runs climbs.
  const grow = ease(frame, simulateAt - 2, 64);
  const tailOn = (k: number) => {
    const d = Math.abs(k - 50);
    if (d < COIN.distance) return 0;
    // Outside in: the farthest bars turn first.
    return ease(frame, countAt + (HI - 50 - d) * 1.2, 10);
  };
  const tailPulse = pulse(frame, extremeAt - 2, 26) + pulse(frame, areaAt - 2, 26) + pulse(frame, pValueAt - 2, 26);
  const obsX = sx(X, COIN.observed);
  const mirX = sx(X, COIN.mirror);
  const midX = sx(X, 50);
  const barTop = (k: number) => y(BASE) - h(TALL) * (COIN.counts[k] / MAX) * grow;
  const dim = 1 - 0.5 * ease(frame, cantAt - 10, 16);
  // The two marks rise above the tallest bar, so the brackets clear the pile.
  const LINE_TOP = y(BASE) - h(TALL) - 46;
  const runsGlow = pulse(frame, thousandAt, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the coin, the runs piling up, the two marks, the tails ── */}
      <Sfx name="el-pop" at={coinAt - 6} level={-30} />
      <Sfx name="el-sprinkle" at={simulateAt - 2} level={-32} />
      <Sfx name="el-sprinkle" at={simulateAt + 30} level={-34} />
      <Sfx name="el-pencil" at={thirtyAt - 4} level={-34} />
      <Sfx name="el-tap" at={twoAt - 4} level={-28} />
      {/* In the pause after "verdict", where the p-value has been built. */}
      <Sfx name="el-chime" at={n.word("verdict-not", "verdict", { edge: "end" }) + 4} level={-32} />

      <Kicker at={coinFrom - 10}>What a p-value is</Kicker>
      <Head a="Sixty-two heads in a hundred." at={coinFrom - 6} out={areaAt - 8} />
      <Head a="An area," b="not a verdict." at={areaAt - 4} bAt={areaAt + 8} />
      <Spot id="testing-hypotheses-coin" at={coinAt - 6} out={pileAt} left={1500} top={y(96)} width={250} height={250} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <Drift from={nullAt} to={cantAt + 30} scale={0.022} origin="50% 75%">
          <FigLabel n="6" title="Heads in a hundred flips of a fair coin" at={coinFrom} x={160} y={y(300)} />
          <Ink at={fairAt - 4} dur={14} style={{ left: 1100, top: y(300), whiteSpace: "nowrap" }}>
            <Label size={22} color={INK_SOFT} weight={520}>
              simulated runs:{" "}
              <Count
                at={simulateAt - 2}
                to={COIN.runs}
                dur={64}
                style={{ ...note(24, INK), fontWeight: 700, display: "inline-block", transform: `scale(${1 + 0.12 * runsGlow})` }}
              />
            </Label>
          </Ink>
          <Axis scale={X} base={y(BASE)} ticks={[30, 38, 50, 62, 70]} at={coinFrom + 2} />
          <Note at={flipsAt - 2} x={X.x1} y={y(BASE) + 40} align="right">
            <Label size={21} color={INK_SOFT} weight={520}>
              heads in 100 flips
            </Label>
          </Note>
          <Svg>
            {COIN.counts.map((c, k) => {
              if (k < LO || k > HI || c <= 0 || grow <= 0) return null;
              const x0 = sx(X, k - 0.5) + 1.5;
              const x1 = sx(X, k + 0.5) - 1.5;
              const t = tailOn(k);
              const top = barTop(k);
              return (
                <rect
                  key={k}
                  x={x0}
                  y={top}
                  width={x1 - x0}
                  height={y(BASE) - top}
                  fill={t > 0.5 ? STAT : DATA}
                  opacity={t > 0 ? 0.8 + 0.2 * Math.min(1, tailPulse) : 0.78}
                />
              );
            })}
            {/* The observed 62, and its mirror on the other side of fifty, rising above the pile. */}
            {ease(frame, sixtyAt - 2, 12) > 0 ? (
              <line x1={obsX} x2={obsX} y1={y(BASE)} y2={lerp(y(BASE), LINE_TOP, ease(frame, sixtyAt - 2, 14))} stroke={STAT} strokeWidth={3.5} />
            ) : null}
            {ease(frame, thirtyAt - 2, 12) > 0 ? (
              <line
                x1={mirX}
                x2={mirX}
                y1={y(BASE)}
                y2={lerp(y(BASE), LINE_TOP, ease(frame, thirtyAt - 2, 14))}
                stroke={STAT}
                strokeWidth={3}
                strokeDasharray="7 6"
              />
            ) : null}
          </Svg>
          {/* Labels over the thin tails, where no bar comes near them. */}
          <Note at={sixtyAt} x={obsX + 16} y={y(BASE) - h(TALL * 0.56)}>
            <div style={{ transform: `scale(${1 + 0.14 * pulse(frame, sixtyFarAt - 2, 24)})`, transformOrigin: "0 50%" }}>
              <Label size={24} color={STAT_INK} style={halo}>
                62, what the coin did
              </Label>
            </div>
          </Note>
          <Note at={thirtyAt} x={mirX - 16} y={y(BASE) - h(TALL * 0.56)} align="right">
            <Label size={24} color={STAT_INK} style={halo}>
              38, just as far
            </Label>
          </Note>
          <Bracket x0={midX} x1={obsX} y={LINE_TOP + 14} at={twelveAt - 4} color={INK} up />
          <Bracket x0={mirX} x1={midX} y={LINE_TOP + 14} at={thirtyAt + 4} color={INK} up />
          {[
            [(midX + obsX) / 2, twelveAt],
            [(mirX + midX) / 2, thirtyAt + 8],
          ].map(([x, at]) => (
            <Note key={at} at={at} x={x} y={LINE_TOP - 30} from="up">
              <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
                <Label size={24}>{COIN.distance}</Label>
              </span>
            </Note>
          ))}
          <Leader
            points={[
              [midX - 300, y(BASE) - h(TALL * 0.78) + 30],
              [midX - 80, y(BASE) - h(TALL * 0.6)],
            ]}
            at={nullAt}
            dur={12}
          />
          <Note at={nullAt - 2} x={midX - 300} y={y(BASE) - h(TALL * 0.78)} align="right">
            <Label size={24} style={halo}>
              the null distribution
            </Label>
          </Note>

          {/* The count of runs at least that far out, and the share they make. */}
          <Note at={farOutAt} x={X.x1} y={y(BASE) - h(TALL * 0.4)} align="right">
            <span style={{ ...note(24, STAT_INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>
              <Count at={farOutAt} to={COIN.upper + COIN.lower} dur={26} /> runs at least 12 out
            </span>
          </Note>
          <Note at={twoAt - 2} x={X.x1} y={y(BASE) - h(TALL * 0.4) + 40} align="right">
            <span
              style={{
                ...note(40, STAT_INK),
                fontWeight: 700,
                ...halo,
                whiteSpace: "nowrap",
                display: "inline-block",
                transform: `scale(${1 + 0.1 * pulse(frame, themAt, 24)})`,
                transformOrigin: "100% 50%",
              }}
            >
              p = {pct(COIN.p)}
            </span>
          </Note>
        </Drift>
        <Ink at={shareAt - 4} dur={18} style={{ left: 160, top: y(870), whiteSpace: "nowrap" }}>
          <span style={{ ...body(34, true), color: INK }}>
            The share of the null world <Mark at={extremeAt}>at least as extreme</Mark> as what you saw.
          </span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
