import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { DIVISOR, sumSquaresAround } from "./data";
import { DATA, Drift, lerp, Mark, Pulse, STAT, STAT_INK, Svg, Tag, counted } from "./parts";

/** The five values, on a line where a unit is 20 px, so a square's side is its distance. */
const X: XScale = { lo: -26, hi: 16, x0: 360, x1: 1200 };
const K = (X.x1 - X.x0) / (X.hi - X.lo);
const AXIS = 860;
const R = 10;
/** The averages over 4,000 samples. */
const V: XScale = { lo: 0, hi: 120, x0: 420, x1: 1560 };
const BAR_N = 560;
const BAR_N1 = 680;

/**
 * Part 2, second scene: why the divisor is n minus one. Five values from a
 * population whose mean is zero; the squares around their own mean, which no
 * other center can beat; the squares around the truth, bigger; and the
 * lesson's chart, measured: dividing by n runs about a fifth low.
 */
export const DivisorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const divisorFrom = n.beat("divisor").from;
  const distancesAt = n.word("divisor", "distances");
  const ownAt = n.word("divisor", "own mean");
  const closerAt = n.word("closest", "closer");
  const otherAt = n.word("closest", "any other number");
  const fiveAt = n.word("truth", "five values");
  const zeroAt = n.word("truth", "zero");
  const insteadAt = n.word("truth", "truth instead");
  const growAt = n.word("truth", "grow");
  const aroundAt = n.word("small", "around");
  const smallAt = n.word("small", "small");
  const underAt = n.word("small", "underestimate");
  const measuredFrom = n.beat("measured").from;
  const fourAt = n.word("measured", "four thousand");
  const byNAt = n.word("measured", "dividing by n");
  const lowAt = n.word("measured", "low");
  const byN1At = n.word("measured", "Dividing by n minus one");
  const landsAt = n.word("measured", "lands");
  const numpyAt = n.word("libs", "numpy", { nth: 2 });
  const pandasAt = n.word("libs", "pandas", { nth: 2 });
  const disagreeAt = n.word("libs", "disagree");
  const weaknessAt = n.word("robust-in", "weakness");
  const swampAt = n.word("robust-in", "swamp");

  // Where the squares are measured from: the sample's mean, a wiggle either
  // side of it, out to the truth and back.
  const wig = ease(frame, otherAt - 4, 10) * (1 - ease(frame, otherAt + 34, 12));
  const wiggle = 4.2 * Math.sin(((frame - otherAt) / 22) * Math.PI * 2) * wig;
  const toTruth = ease(frame, insteadAt - 2, 30) * (1 - ease(frame, aroundAt - 2, 26));
  const c = lerp(DIVISOR.fiveMean, 0, toTruth) + wiggle;
  const cx = sx(X, c);
  const base = y(AXIS);

  const dotsIn = (i: number) => ease(frame, distancesAt - 6 + i * 3, 10);
  const sticks = ease(frame, ownAt - 2, 14);
  const squares = ease(frame, closerAt - 4, 18);
  const truthIn = ease(frame, zeroAt - 4, 16);
  const phaseB = ease(frame, measuredFrom - 6, 18);
  const ss = sumSquaresAround(c);

  // Phase B: the averages over four thousand samples.
  const nGrow = ease(frame, byNAt - 2, 22);
  const n1Grow = ease(frame, byN1At, 22);

  return (
    <AbsoluteFill>
      {/* ── Sound: the five values, the squares, the two bars, the code ── */}
      <Sfx name="el-sprinkle" at={distancesAt - 6} level={-34} />
      <Sfx name="el-pencil" at={closerAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={insteadAt - 2} level={-34} />
      <Sfx name="el-tap" at={byNAt - 2} level={-29} />
      <Sfx name="el-tap" at={byN1At} level={-29} />
      <Sfx name="el-pop" at={pandasAt - 2} level={-30} />

      {/* ── Headlines ── */}
      <Ink at={divisorFrom - 4} dur={20} out={measuredFrom - 6} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Why nine, and not ten?
      </Ink>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={measuredFrom - 2} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Divide by n,
        </Ink>
        <Ink at={lowAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          and you come up short.
        </Ink>
      </div>

      {/* ── Phase A: five values and their squares ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - phaseB, transform: `translateY(${-phaseB * 30}px)` }}>
        <FigLabel n="4" title="Five values from a population whose true mean is 0" at={distancesAt - 8} x={160} y={y(330)} />
        <Drift from={divisorFrom} to={measuredFrom} scale={0.02} origin={[780, base]}>
          {/* The squares: each distance, squared, drawn as a square on it. */}
          {squares > 0 ? (
            <Svg>
              {DIVISOR.five.map((v, i) => {
                const d = Math.abs(v - c) * K * squares;
                const left = v < c ? sx(X, v) : sx(X, v) - d;
                return (
                  <rect
                    key={i}
                    x={left}
                    y={base - d}
                    width={d}
                    height={d}
                    fill={toTruth > 0.5 ? INK : STAT}
                    opacity={0.1}
                    stroke={toTruth > 0.5 ? INK : STAT}
                    strokeWidth={1.6}
                    strokeOpacity={0.7}
                  />
                );
              })}
            </Svg>
          ) : null}

          {/* The truth, dashed. */}
          {truthIn > 0 ? (
            <Svg>
              <line x1={sx(X, 0)} x2={sx(X, 0)} y1={base} y2={base - (base - y(420)) * truthIn} stroke={INK} strokeWidth={2.2} strokeDasharray="8 6" />
            </Svg>
          ) : null}
          <Tag x={sx(X, 0) + 10} y={y(420) - 8} opacity={truthIn} size={21} align="left">
            true mean 0
          </Tag>

          {/* Where the distances are measured from. */}
          {sticks > 0 ? (
            <Svg>
              <line x1={cx} x2={cx} y1={base + 18} y2={base - (base - y(470)) * sticks} stroke={toTruth > 0.5 ? INK : STAT} strokeWidth={3.4} strokeLinecap="round" />
              {DIVISOR.five.map((v, i) => (
                <line key={i} x1={cx} x2={lerp(cx, sx(X, v), sticks)} y1={base - R - 1} y2={base - R - 1} stroke={STAT} strokeWidth={2} opacity={0.6} />
              ))}
            </Svg>
          ) : null}
          <Tag x={cx - 10} y={y(470) - 8} opacity={sticks * (1 - ease(frame, insteadAt - 4, 8) + ease(frame, aroundAt + 22, 10))} color={STAT_INK} size={21} bold align="right">
            sample mean {fmt(DIVISOR.fiveMean, 1)}
          </Tag>

          <Svg>
            <line x1={X.x0 - 20} x2={X.x1 + 20} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} opacity={ease(frame, distancesAt - 8, 14)} />
            {DIVISOR.five.map((v, i) => {
              const a = dotsIn(i);
              if (a <= 0) return null;
              return <circle key={i} cx={sx(X, v)} cy={base - R - 1} r={R * a} fill={DATA} stroke={PAPER} strokeWidth={1.6} />;
            })}
          </Svg>
          {[-20, -10, 0, 10].map((v) => (
            <Tag key={v} x={sx(X, v)} y={base + 12} opacity={ease(frame, distancesAt, 14)} color={INK_SOFT} size={20}>
              {v < 0 ? `−${-v}` : v}
            </Tag>
          ))}
          {DIVISOR.five.map((v, i) => (
            <Pulse key={i} x={sx(X, v)} y={base - R - 1} at={fiveAt + i * 3} color={DATA} r={R} />
          ))}
        </Drift>

        {/* The total of the squares, live. */}
        <Ink at={closerAt - 2} dur={16} style={{ left: 1330, top: y(500), whiteSpace: "nowrap" }}>
          <div style={{ ...label(23, INK), fontWeight: 560 }}>Sum of the squares</div>
          <div style={{ ...note(64, toTruth > 0.5 ? INK : STAT_INK), fontWeight: 700, marginTop: 6 }}>{fmt(ss, 1)}</div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 2 }}>
            measured from {toTruth > 0.5 ? "the true mean" : "the sample mean"}
          </div>
        </Ink>
        <Ink at={smallAt - 2} dur={16} style={{ left: 1330, top: y(700), whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, INK), ...halo }}>
            Around its own mean, the <Mark at={smallAt + 2}>smallest</Mark> it can be.
          </span>
        </Ink>
        <Ink at={underAt - 4} dur={16} style={{ left: 1330, top: y(750), whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, STAT_INK), fontWeight: 600, ...halo }}>Divided by n, too small.</span>
        </Ink>
        <Sfx name="el-pop" at={growAt - 2} level={-31} />
      </div>

      {/* ── Phase B: the lesson's chart, measured ── */}
      {phaseB > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: phaseB }}>
          <FigLabel n="5" title={`Average variance over ${DIVISOR.trials.toLocaleString("en-US")} samples of five`} at={fourAt - 6} x={160} y={y(330)} />
          <Drift from={measuredFrom} to={swampAt + 30} scale={0.018} origin={[V.x0, y(BAR_N1)]}>
            <Svg>
              {[
                [BAR_N, DIVISOR.byN, nGrow, STAT],
                [BAR_N1, DIVISOR.byN1, n1Grow, DATA],
              ].map(([top, v, g, color]) =>
                (g as number) > 0 ? (
                  <rect
                    key={top as number}
                    x={V.x0}
                    y={y(top as number) - h(34)}
                    width={(sx(V, v as number) - V.x0) * (g as number)}
                    height={h(68)}
                    fill={color as string}
                    opacity={0.88}
                  />
                ) : null,
              )}
              <line x1={V.x0} x2={V.x0} y1={y(BAR_N) - h(70)} y2={y(BAR_N1) + h(70)} stroke={INK} strokeWidth={1.6} opacity={ease(frame, fourAt - 4, 12)} />
              <line
                x1={sx(V, DIVISOR.sigma2)}
                x2={sx(V, DIVISOR.sigma2)}
                y1={y(BAR_N1) + h(70)}
                y2={y(BAR_N1) + h(70) - (y(BAR_N1) - y(BAR_N) + h(150)) * ease(frame, fourAt, 18)}
                stroke={INK}
                strokeWidth={2.2}
                strokeDasharray="8 6"
              />
            </Svg>
            <Tag x={sx(V, DIVISOR.sigma2)} y={y(BAR_N) - h(80) - 36} opacity={ease(frame, fourAt + 8, 12)} size={21}>
              true variance {DIVISOR.sigma2}
            </Tag>
            <Tag x={V.x0 - 18} y={y(BAR_N) - 15} opacity={ease(frame, byNAt - 4, 12)} size={23} bold align="right">
              Divide by n
            </Tag>
            <Tag x={V.x0 - 18} y={y(BAR_N1) - 15} opacity={ease(frame, byN1At - 4, 12)} size={23} bold align="right">
              by n − 1
            </Tag>
            <Tag x={sx(V, DIVISOR.byN * nGrow) + 16} y={y(BAR_N) - 15} opacity={ease(frame, byNAt, 10)} color={STAT_INK} size={24} bold align="left" knockout>
              {counted(frame, byNAt - 2, 0, DIVISOR.byN, 1, 22)}
              <span style={{ fontWeight: 500, color: INK_SOFT, opacity: ease(frame, lowAt - 4, 10) }}>, about {Math.round(DIVISOR.lowPct)}% low</span>
            </Tag>
            <Tag x={sx(V, DIVISOR.byN1 * n1Grow) + 16} y={y(BAR_N1) - 15} opacity={ease(frame, byN1At + 2, 10)} color={"var(--ds-blue-ink)"} size={24} bold align="left">
              {counted(frame, byN1At, 0, DIVISOR.byN1, 1, 22)}
            </Tag>
            <Pulse x={sx(V, DIVISOR.sigma2)} y={y(BAR_N1)} at={landsAt + 4} color={INK} r={8} />
          </Drift>

          {/* Two libraries, two divisors, one column. */}
          {[
            { code: "np.std(x)", note: "divides by n", value: DIVISOR.numpyStd, at: numpyAt },
            { code: "pd.Series(x).std()", note: "divides by n − 1", value: DIVISOR.pandasStd, at: pandasAt },
          ].map((c, i) => {
            const p = ease(frame, c.at - 6, 14);
            if (p <= 0) return null;
            return (
              <div
                key={c.code}
                style={{
                  position: "absolute",
                  left: 260 + i * 720,
                  top: y(850),
                  opacity: p,
                  transform: `translateY(${(1 - p) * 14}px)`,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: INK }}>{c.code}</span>
                <span style={{ ...note(30, STAT_INK), fontWeight: 700 }}>{fmt(c.value, 2)}</span>
                <span style={{ ...note(22, INK_SOFT) }}>{c.note}</span>
              </div>
            );
          })}
          <Ink at={disagreeAt - 4} dur={16} style={{ left: 260, top: y(800), whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, INK_SOFT) }}>The same ten values, two answers</span>
          </Ink>
          <Ink at={weaknessAt - 4} dur={16} style={{ left: 260, top: y(915), whiteSpace: "nowrap" }}>
            <span style={{ ...note(24, INK), ...halo }}>
              Squaring makes the <Mark at={swampAt - 4}>farthest values</Mark> count the most.
            </span>
          </Ink>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
