import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CURSE } from "./data";
import { Bracket, Count, DATA, Drift, Head, Label, lerp, pct, pulse, STAT, STAT_INK, Svg } from "./parts";

const BINS = CURSE.all.length;
const HI = CURSE.lo + BINS * CURSE.bin;
const X: XScale = { lo: CURSE.lo, hi: HI, x0: 220, x1: 1700 };
const BASE = 820;
const TALL = 400;
const MAX = Math.max(...CURSE.all);

/**
 * The winner's curse: 6,000 runs of a real 0.3 effect at 15 per group. The
 * 12% that reach significance average 0.85, nearly three times the truth,
 * because only the runs that noise pushed up get through.
 */
export const CurseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const curseFrom = n.beat("curse").from;
  const worseAt = n.word("curse", "worse");
  const effectAt = n.word("curse", "real effect");
  const pointAt = n.word("curse", "point three");
  const fifteenAt = n.word("curse", "fifteen");
  const twelveAt = n.word("curse", "twelve percent");
  const sigAt = n.word("curse", "significance");
  const winnersAt = n.word("inflate", "winners");
  const eightyAt = n.word("inflate", "point eight five");
  const threeAt = n.word("inflate", "three times");
  const exaggeratedAt = n.word("inflate", "exaggerated");
  const throughAt = n.word("inflate", "through");
  const everyAt = n.word("t-in", "t-test");

  const bh = (c: number) => h(TALL) * (c / MAX);
  const grow = ease(frame, effectAt - 4, 36);
  const red = ease(frame, twelveAt - 4, 16);
  const dimRest = ease(frame, exaggeratedAt - 4, 16);
  const truthX = sx(X, CURSE.effect);
  const sigX = sx(X, CURSE.meanSig);
  const sigGlow = pulse(frame, eightyAt + 4, 26);
  const winGlow = pulse(frame, winnersAt - 2, 24);
  const outDim = 1 - 0.5 * ease(frame, everyAt - 14, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the estimates pile up, the winners turn, their mean ── */}
      <Sfx name="el-sprinkle" at={effectAt - 4} level={-33} />
      <Sfx name="el-pencil" at={pointAt - 2} level={-35} />
      <Sfx name="el-pop" at={twelveAt - 4} level={-30} />
      <Sfx name="el-tap" at={eightyAt - 2} level={-28} />
      <Sfx name="el-pencil" at={threeAt - 4} level={-34} />

      <Head a="Low power" b="exaggerates." at={curseFrom - 6} bAt={worseAt - 2} />

      <div style={{ position: "absolute", inset: 0, opacity: outDim }}>
        <Drift from={twelveAt} to={n.beat("t-in").to + 30} scale={0.02} origin="40% 80%">
          <FigLabel n="14" title={`${fmt(CURSE.runs, 0)} estimates of one real effect`} at={curseFrom} x={160} y={y(290)} />
          <Ink at={fifteenAt - 4} dur={14} style={{ left: 160, top: y(290) + 40, whiteSpace: "nowrap" }}>
            <Label size={21} color={INK_SOFT} weight={520}>
              true effect {CURSE.effect}, {CURSE.n} per group, the estimate from each run
            </Label>
          </Ink>
          <Axis scale={X} base={y(BASE)} ticks={[-1, -0.5, 0, 0.5, 1, 1.5, 2]} format={(v) => (v < 0 ? `−${-v}` : String(v))} at={curseFrom + 2} />
          <Svg>
            {CURSE.all.map((c, i) => {
              if (c <= 0 || grow <= 0) return null;
              const x0 = sx(X, CURSE.lo + i * CURSE.bin) + 1.5;
              const x1 = sx(X, CURSE.lo + (i + 1) * CURSE.bin) - 1.5;
              const all = bh(c) * grow;
              const sig = bh(CURSE.sig[i]) * grow * red;
              return (
                <g key={i}>
                  <rect x={x0} y={y(BASE) - all} width={x1 - x0} height={all} fill={DATA} opacity={lerp(0.7, 0.18, dimRest)} />
                  {sig > 0 ? <rect x={x0} y={y(BASE) - sig} width={x1 - x0} height={sig} fill={STAT} opacity={0.85 + 0.15 * winGlow} /> : null}
                </g>
              );
            })}
            {/* The truth, and where the winners average. */}
            {ease(frame, pointAt - 2, 14) > 0 ? (
              <line
                x1={truthX}
                x2={truthX}
                y1={y(BASE)}
                y2={y(BASE) - h(TALL + 40) * ease(frame, pointAt - 2, 16)}
                stroke={INK}
                strokeWidth={2.6}
                strokeDasharray="7 6"
              />
            ) : null}
            {ease(frame, eightyAt - 4, 14) > 0 ? (
              <line
                x1={sigX}
                x2={sigX}
                y1={y(BASE)}
                y2={y(BASE) - h(TALL + 40) * ease(frame, eightyAt - 4, 16)}
                stroke={STAT}
                strokeWidth={3 + 2 * sigGlow}
                strokeDasharray="7 6"
              />
            ) : null}
          </Svg>
          <Note at={pointAt} x={truthX - 14} y={y(BASE) - h(TALL + 40) - 6} align="right">
            <Label size={22} style={halo}>
              the truth, {CURSE.effect}
            </Label>
          </Note>
          <Note at={eightyAt} x={sigX + 14} y={y(BASE) - h(TALL + 40) - 6}>
            <span style={{ ...note(24, STAT_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>the winners average {fmt(CURSE.meanSig, 2)}</span>
          </Note>
          <Bracket x0={truthX} x1={sigX} y={y(BASE) - h(TALL + 40) - 30} at={threeAt - 4} color={STAT} up />
          <Note at={threeAt} x={(truthX + sigX) / 2} y={y(BASE) - h(TALL + 40) - 76} from="up">
            <span style={{ display: "inline-block", transform: "translateX(-50%)", ...note(24, STAT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              {fmt(CURSE.meanSig / CURSE.effect, 1)} times the truth
            </span>
          </Note>
          <Note at={twelveAt - 2} x={X.x1} y={y(BASE) - h(240)} align="right">
            <span style={{ ...note(30, STAT_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
              significant: <Count at={twelveAt - 2} to={CURSE.power} dur={20} format={(v) => pct(v, 0)} />
            </span>
          </Note>
          <Note at={sigAt} x={X.x1} y={y(BASE) - h(240) + 44} align="right">
            <Label size={21} color={INK_SOFT} weight={520} style={halo}>
              in red, the runs that reached it
            </Label>
          </Note>
          <Note at={throughAt - 6} x={X.x0} y={y(BASE) - h(240)}>
            <Label size={22} color={INK_SOFT} style={halo}>
              the rest never got through
            </Label>
          </Note>
        </Drift>
      </div>
    </AbsoluteFill>
  );
};
