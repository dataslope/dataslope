import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { DIVISOR, sumSquaresAround } from "./data";
import { Bracket, DATA, Drift, lerp, Mark, Pulse, STAT, STAT_INK, Svg, Tag, counted } from "./parts";

/** The five values, on a line where a unit is 20 px, so a square's side is its distance. */
const X: XScale = { lo: -26, hi: 16, x0: 360, x1: 1200 };
const K = (X.x1 - X.x0) / (X.hi - X.lo);
const AXIS = 860;
const R = 10;
/** "−5.3": a signed value with a real minus. */
const signed = (v: number, digits = 1) => (v < 0 ? `−${fmt(-v, digits)}` : fmt(v, digits));

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
  const nineAt = n.word("divisor", "nine");
  const wildAt = n.word("robust-in", "single wild value");
  const tenAt = n.word("divisor", "ten");
  const ownAt = n.word("divisor", "own mean");
  const closerAt = n.word("closest", "closer");
  const otherAt = n.word("closest", "any other number");
  const fiveAt = n.word("truth", "five values");
  const zeroAt = n.word("truth", "zero");
  const populationAt = n.word("truth", "population");
  const insteadAt = n.word("truth", "truth instead");
  const growAt = n.word("truth", "grow");
  const aroundAt = n.word("small", "around");
  const smallAt = n.word("small", "small");
  const underAt = n.word("small", "underestimate");
  const measuredFrom = n.beat("measured").from;
  const fourAt = n.word("measured", "four thousand");
  const byNAt = n.word("measured", "dividing by n", { nth: 1 });
  const lowAt = n.word("measured", "low");
  const byN1At = n.word("measured", "Dividing by n minus one");
  const landsAt = n.word("measured", "lands");
  const numpyAt = n.word("libs", "numpy", { nth: 1 });
  const pandasAt = n.word("libs", "pandas", { nth: 1 });
  const numpyNoteAt = n.word("libs", "numpy", { nth: 2 });
  const pandasNoteAt = n.word("libs", "pandas", { nth: 2 });
  const minusOneAt = n.word("libs", "minus one");
  const disagreeAt = n.word("libs", "disagree");
  const weaknessAt = n.word("robust-in", "weakness");
  const swampAt = n.word("robust-in", "swamp");

  // Where the squares are measured from: the sample's mean, then another
  // center swung either side of it (the sample's mean stays marked, so the
  // moving line is never mistaken for it), out to the truth and back.
  const wig = ease(frame, otherAt - 4, 12) * (1 - ease(frame, otherAt + 62, 14));
  const wiggle = 4.2 * Math.sin(((frame - otherAt + 4) / 44) * Math.PI * 2) * wig;
  const toTruth = ease(frame, insteadAt - 2, 30) * (1 - ease(frame, aroundAt - 2, 26));
  const c = lerp(DIVISOR.fiveMean, 0, toTruth) + wiggle;
  const cx = sx(X, c);
  const meanX = sx(X, DIVISOR.fiveMean);
  const base = y(AXIS);
  /** How far the center has left the sample's mean: red there, ink anywhere else. */
  const away = Math.max(wig, toTruth);
  const centerColor = `color-mix(in srgb, ${INK} ${(away * 100).toFixed(1)}%, ${STAT})`;
  const centerName = toTruth > 0.5 ? "the true mean" : wig > 0.05 ? "another center" : "the sample mean";

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
      <Sfx name="el-whoosh" at={insteadAt - 2} level={-36} />
      <Sfx name="el-tap" at={byNAt - 2} level={-29} />
      <Sfx name="el-tap" at={byN1At} level={-29} />
      <Sfx name="el-pop" at={pandasAt - 2} level={-30} />

      {/* ── Headlines ── */}
      <Ink at={divisorFrom - 4} dur={20} out={measuredFrom - 6} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Why <Mark at={nineAt - 2}>nine</Mark>, and not ten?
      </Ink>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={measuredFrom - 2} dur={20} out={swampAt + 4} outDur={14} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Divide by n,
        </Ink>
        <Ink at={lowAt - 6} dur={18} out={swampAt + 4} outDur={14} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          and you come up short.
        </Ink>
      </div>

      {/* The two divisors the headline asks about. */}
      <div style={{ position: "absolute", left: 1330, top: y(330), opacity: (1 - phaseB) * (1 - ease(frame, fiveAt - 4, 12)), whiteSpace: "nowrap", display: "flex", gap: 22, alignItems: "baseline" }}>
        <span style={{ ...note(30, STAT_INK), fontWeight: 700, opacity: ease(frame, nineAt - 4, 12) }}>12 ÷ 9</span>
        <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, tenAt - 4, 12) }}>not 12 ÷ 10</span>
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
                    fill={centerColor}
                    opacity={0.1}
                    stroke={centerColor}
                    strokeWidth={1.6}
                    strokeOpacity={0.7}
                  />
                );
              })}
            </Svg>
          ) : null}

          {/* The population the five were drawn from: Normal(0, 10). */}
          {ease(frame, populationAt - 4, 24) > 0 ? (
            <Svg opacity={0.55}>
              <path
                d={Array.from({ length: 121 }, (_, i) => {
                  const v = X.lo + ((X.hi - X.lo) * i) / 120;
                  const d = Math.exp(-0.5 * (v / Math.sqrt(DIVISOR.sigma2)) ** 2);
                  return `${i ? "L" : "M"}${sx(X, v).toFixed(1)},${(base - d * h(150)).toFixed(1)}`;
                }).join(" ")}
                fill="none"
                stroke={INK_SOFT}
                strokeWidth={2}
                pathLength={1}
                style={{ strokeDasharray: `${ease(frame, populationAt - 4, 24)} 1` }}
              />
            </Svg>
          ) : null}

          <Tag x={sx(X, 8)} y={base - h(120)} opacity={ease(frame, populationAt + 6, 12)} color={INK_SOFT} size={20} align="left">
            the population
          </Tag>

          {/* The truth, dashed. */}
          {truthIn > 0 ? (
            <Svg>
              <line x1={sx(X, 0)} x2={sx(X, 0)} y1={base} y2={base - (base - y(420)) * truthIn} stroke={INK} strokeWidth={2.2} strokeDasharray="8 6" />
            </Svg>
          ) : null}
          <Tag x={sx(X, 0) + 10} y={y(420) - 8} opacity={truthIn} size={21} align="left">
            true mean 0
          </Tag>

          {/* Where the distances are measured from: the sample's mean stays
              marked in red; the center they are measured from moves in ink. */}
          {sticks > 0 ? (
            <Svg>
              <line x1={meanX} x2={meanX} y1={base + 18} y2={base - (base - y(470)) * sticks} stroke={STAT} strokeWidth={3.4} strokeLinecap="round" />
              {away > 0.01 ? (
                <line x1={cx} x2={cx} y1={base + 18} y2={y(430)} stroke={INK} strokeWidth={3.4} strokeLinecap="round" opacity={away} />
              ) : null}
              {DIVISOR.five.map((v, i) => (
                <line key={i} x1={cx} x2={lerp(cx, sx(X, v), sticks)} y1={base - R - 1} y2={base - R - 1} stroke={centerColor} strokeWidth={2} opacity={0.6} />
              ))}
            </Svg>
          ) : null}
          <Tag x={meanX - 10} y={y(470) - 8} opacity={sticks} color={STAT_INK} size={21} bold align="right" knockout>
            sample mean <span style={TABULAR}>{signed(DIVISOR.fiveMean)}</span>
          </Tag>
          <Tag x={cx} y={y(430) - 34} opacity={wig} size={21} bold>
            another center
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

        {/* The total of the squares, live, against what the sample's mean gives. */}
        <Ink at={closerAt - 2} dur={16} style={{ left: 1330, top: y(500), whiteSpace: "nowrap" }}>
          <div style={{ ...label(23, INK), fontWeight: 560 }}>Sum of the squares</div>
          <div
            style={{
              ...note(64, `color-mix(in srgb, ${INK} ${(away * 100).toFixed(1)}%, ${STAT_INK})`),
              ...TABULAR,
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {fmt(ss, 1)}
          </div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 2 }}>measured from {centerName}</div>
          <div
            style={{
              ...note(22, STAT_INK),
              fontWeight: 600,
              marginTop: 8,
              opacity: ease(frame, otherAt - 4, 12) * (1 - ease(frame, aroundAt + 22, 12)),
            }}
          >
            from the sample mean: <span style={TABULAR}>{fmt(DIVISOR.ssAroundMean, 1)}</span>, the least
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
            <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.55 * ease(frame, wildAt - 2, 14) }}>
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
              <span style={TABULAR}>{counted(frame, byNAt - 2, 0, DIVISOR.byN, 1, 22)}</span>
            </Tag>
            <Bracket x0={sx(V, DIVISOR.byN)} x1={sx(V, DIVISOR.sigma2)} y={y(BAR_N) - h(34) - 12} at={lowAt - 6} color={STAT} />
            <Tag x={sx(V, DIVISOR.sigma2) + 14} y={y(BAR_N) - h(34) - 26} opacity={ease(frame, lowAt - 2, 10)} color={STAT_INK} size={23} bold align="left">
              about {Math.round(DIVISOR.lowPct)}% low
            </Tag>
            <Tag x={sx(V, DIVISOR.byN1 * n1Grow) + 16} y={y(BAR_N1) - 15} opacity={ease(frame, byN1At + 2, 10)} color={"var(--ds-blue-ink)"} size={24} bold align="left">
              <span style={TABULAR}>{counted(frame, byN1At, 0, DIVISOR.byN1, 1, 22)}</span>
            </Tag>
            <Pulse x={sx(V, DIVISOR.sigma2)} y={y(BAR_N1)} at={landsAt + 4} color={INK} r={8} />
            </div>
          </Drift>

          {/* Two libraries, two divisors, one column. */}
          {[
            { code: "np.std(x)", note: "divides by n", value: DIVISOR.numpyStd, at: numpyAt, noteAt: numpyNoteAt },
            { code: "pd.Series(x).std()", note: "divides by n − 1", value: DIVISOR.pandasStd, at: pandasAt, noteAt: pandasNoteAt },
          ].map((c, i) => {
            const p = ease(frame, c.at - 6, 14) * (1 - 0.6 * ease(frame, wildAt - 4, 12));
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
                <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, c.noteAt - 4, 12) }}>
                  {i === 1 ? <Mark at={minusOneAt - 2}>{c.note}</Mark> : c.note}
                </span>
              </div>
            );
          })}
          <Ink at={disagreeAt - 4} dur={16} style={{ left: 260, top: y(800), whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, INK_SOFT) }}>x: the ten salaries of Fig. 1, two answers</span>
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
