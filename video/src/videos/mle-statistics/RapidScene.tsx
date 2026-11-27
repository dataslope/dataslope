import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { ColumnRule, NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { RAPID } from "./data";
import { Area, BAD, Curve, DATA, Drift, Headline, Kicker, Line, Mark, MUTED, mulberry32, normalPoints, POINT, Spot, Svg, X0 } from "./parts";

const R_X = 800;
const R_X1 = 1790;
const LIST_TOP = 340;
const ROW = 62;

type Ctx = { w: (beat: string, phrase: string, o?: { nth?: number }) => number; y: Layout["y"]; h: Layout["h"] };

const choose = (n: number, k: number) => {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
};
const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));

/** Bars on a baseline, page pixels, rising in turn from `at`. */
const MiniBars: React.FC<{ values: readonly number[]; x0: number; x1: number; base: number; height: number; at: number; color?: string; gap?: number }> = ({
  values,
  x0,
  x1,
  base,
  height,
  at,
  color = DATA,
  gap = 6,
}) => {
  const frame = useCurrentFrame();
  const max = Math.max(...values);
  const w = (x1 - x0) / values.length;
  return (
    <Svg>
      {values.map((v, i) => {
        const p = ease(frame, at + i * 1.5, 10);
        const hh = (v / max) * height * p;
        return p > 0 ? <rect key={i} x={x0 + i * w + gap / 2} y={base - hh} width={w - gap} height={hh} fill={color} /> : null;
      })}
      <line x1={x0} x2={x0 + (x1 - x0) * ease(frame, at - 4, 12)} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
    </Svg>
  );
};

// ── 13. Random variables, mass and density ──────────────────────────────────

const Pdf: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const mapsAt = c.w("r-pdf", "maps outcomes to numbers");
  const discreteAt = c.w("r-pdf", "A discrete one");
  const eachAt = c.w("r-pdf", "each value's probability");
  const continuousAt = c.w("r-pdf", "A continuous one");
  const areaAt = c.w("r-pdf", "probability is area");
  const pointAt = c.w("r-pdf", "a single point has probability zero");
  const passAt = c.w("r-pdf", "pass one");
  const base = c.y(720);
  const height = c.h(250);
  // The page's density: a normal with standard deviation 0.3, scaled so 1.0
  // on its axis is `unit` px.
  const sd = RAPID.densitySd;
  const unit = height / 1.5;
  const dx0 = 1310;
  const dx1 = R_X1 - 20;
  const dx = (v: number) => dx0 + ((v + 1.2) / 2.4) * (dx1 - dx0);
  const pts = normalPoints({ mu: 0, sd, lo: -1.2, hi: 1.2, x0: dx0, x1: dx1, base, height: RAPID.densityPeak * unit, steps: 200 });
  const binom = [0, 1, 2, 3, 4].map((k) => choose(4, k) / 16);
  return (
    <>
      <Line at={mapsAt - 6} x={R_X} y={c.y(330)} size={26}>
        A random variable maps outcomes to numbers
      </Line>
      <Line at={discreteAt} x={R_X} y={c.y(400)} size={24} weight={600}>
        Discrete: a mass function
      </Line>
      <MiniBars values={binom} x0={R_X} x1={1180} base={base} height={c.h(160)} at={discreteAt + 4} />
      <Line at={eachAt} x={R_X} y={base + c.h(20)} size={22} color={INK_SOFT}>
        Each bar: one value&apos;s probability
      </Line>
      <ColumnRule x={1245} top={c.y(400)} height={base + c.h(60) - c.y(400)} at={continuousAt} />
      <Line at={continuousAt} x={dx0} y={c.y(400)} size={24} weight={600}>
        Continuous: a density
      </Line>
      <Area points={pts} x0={dx(-sd)} x1={dx(sd)} base={base} at={areaAt} color={DATA} opacity={0.25} />
      <Curve points={pts} at={continuousAt + 4} dur={22} color={DATA} width={3} />
      <Svg opacity={ease(frame, continuousAt + 4, 12)}>
        <line x1={dx0} x2={dx1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
        <line x1={dx0} x2={dx1} y1={base - unit} y2={base - unit} stroke={INK} strokeWidth={1.6} strokeDasharray="6 6" opacity={ease(frame, passAt - 6, 10)} />
        <circle cx={dx(0)} cy={base - RAPID.densityPeak * unit} r={7 * ease(frame, passAt, 8)} fill={POINT} />
      </Svg>
      <Line at={areaAt + 6} x={dx(0)} y={base - c.h(70)} size={22} align="center" width={200}>
        Area <Num>{RAPID.densityArea.toFixed(2)}</Num>
      </Line>
      <Line at={passAt - 6} x={dx1} y={base - unit + 6} size={22} color={INK_SOFT} align="right" width={100}>
        <Num>1</Num>
      </Line>
      <Line at={passAt} x={dx(0) + 18} y={base - RAPID.densityPeak * unit - 14} size={22}>
        <Mark at={passAt + 4}>
          Height <Num>{RAPID.densityPeak.toFixed(2)}</Num>
        </Mark>
      </Line>
      <Line at={pointAt} x={dx0} y={base + c.h(20)} size={22} color={INK_SOFT}>
        Probability is area: a point has <Num>0</Num>
      </Line>
    </>
  );
};

// ── 14. The distributions to know ────────────────────────────────────────────

const Dists: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = [
    c.w("r-dist", "Bernoulli and binomial"),
    c.w("r-dist", "Normal for symmetric data"),
    c.w("r-dist", "Poisson for rare-event counts"),
    c.w("r-dist", "Uniform for equal chances"),
    c.w("r-dist", "exponential for waiting times"),
  ];
  const meanVarAt = c.w("r-dist", "the mean equals the variance");
  const supportsAt = c.w("r-dist", "Their supports and moments");
  const cellW = 300;
  const gapX = 40;
  const cx = (i: number) => R_X + (i % 3) * (cellW + gapX);
  const rowTop = (i: number) => c.y(i < 3 ? 340 : 610);
  const plotH = c.h(110);
  const cells = [
    { name: "Bernoulli, binomial", use: "Yes-or-no, and counts" },
    { name: "Normal", use: "Symmetric data, means" },
    { name: "Poisson", use: "Rare-event counts" },
    { name: "Uniform", use: "Equal chances" },
    { name: "Exponential", use: "Waiting times" },
  ];
  const binom = Array.from({ length: 11 }, (_, k) => choose(10, k) * 0.3 ** k * 0.7 ** (10 - k));
  const pois = Array.from({ length: 9 }, (_, k) => (Math.exp(-2) * 2 ** k) / fact(k));
  return (
    <>
      {cells.map((cell, i) => {
        const x0 = cx(i);
        const x1 = x0 + cellW;
        const base = rowTop(i) + plotH;
        const lit = Math.min(ease(frame, at[i], 8), 1 - ease(frame, at[i + 1] ?? supportsAt, 10) * 0.6);
        const color = lit > 0.5 ? DATA : ds("blue", 300);
        const plot =
          i === 0 ? (
            <MiniBars values={binom} x0={x0} x1={x1} base={base} height={plotH} at={at[i]} color={color} gap={4} />
          ) : i === 2 ? (
            <MiniBars values={pois} x0={x0} x1={x1} base={base} height={plotH} at={at[i]} color={color} gap={4} />
          ) : i === 1 ? (
            <>
              <Curve points={normalPoints({ mu: 0, sd: 1, lo: -3.2, hi: 3.2, x0, x1, base, height: plotH })} at={at[i]} color={color} width={3} />
              <Svg opacity={ease(frame, at[i], 10)}>
                <line x1={x0} x2={x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
              </Svg>
            </>
          ) : i === 3 ? (
            <Svg opacity={ease(frame, at[i], 10)}>
              <rect x={x0 + 40} y={base - plotH * 0.55} width={(cellW - 80) * ease(frame, at[i], 14)} height={plotH * 0.55} fill={color} />
              <line x1={x0} x2={x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
            </Svg>
          ) : (
            <>
              <Curve points={Array.from({ length: 81 }, (_, k) => [x0 + (k / 80) * cellW, base - Math.exp(-(k / 80) * 4.5) * plotH] as const)} at={at[i]} color={color} width={3} />
              <Svg opacity={ease(frame, at[i], 10)}>
                <line x1={x0} x2={x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
              </Svg>
            </>
          );
        return (
          <React.Fragment key={i}>
            {plot}
            <Line at={at[i]} x={x0} y={base + c.h(18)} size={24} weight={600}>
              {lit > 0.5 ? <Mark at={at[i] + 2}>{cell.name}</Mark> : cell.name}
            </Line>
            <Line at={at[i] + 6} x={x0} y={base + c.h(56)} size={21} color={INK_SOFT}>
              {cell.use}
            </Line>
          </React.Fragment>
        );
      })}
      <Line at={meanVarAt} x={cx(2)} y={rowTop(2) + plotH + c.h(92)} size={21} color={INK}>
        Mean = variance
      </Line>
      <Line at={supportsAt} x={cx(2)} y={rowTop(5) + c.h(30)} size={24} weight={600}>
        Their supports and moments
      </Line>
      <Line at={supportsAt + 6} x={cx(2)} y={rowTop(5) + c.h(70)} size={24}>
        say which likelihood fits
      </Line>
    </>
  );
};

// ── 15. Sampling methods ─────────────────────────────────────────────────────

const Sampling: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = [c.w("r-sample", "simple random gives"), c.w("r-sample", "Stratified samples within groups"), c.w("r-sample", "Cluster sampling takes whole groups"), c.w("r-sample", "Reservoir sampling handles a stream")];
  const rareAt = c.w("r-sample", "a rare class in every test set");
  const cellW = 450;
  const cellH = c.h(170);
  const gx = 70;
  const box = (i: number) => ({ x: R_X + (i % 2) * (cellW + gx), y: c.y(i < 2 ? 340 : 610) });
  const names = ["Simple random", "Stratified", "Cluster", "Reservoir"];
  const notes = ["Every unit the same chance", "Within each group, so each shows up", "Whole groups, to cut cost", "A fixed sample from a stream"];
  const rand = mulberry32(15);
  const field = Array.from({ length: 48 }, (_, i) => ({ c: i % 12, r: Math.floor(i / 12), pick: rand() < 0.22 }));
  const lit = (i: number) => ease(frame, at[i] + 8, 10);
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const b = box(i);
        const p = ease(frame, at[i], 12);
        if (p <= 0) return null;
        const dots: { x: number; y: number; pick: boolean }[] = [];
        if (i === 0) field.forEach((d) => dots.push({ x: b.x + 16 + d.c * 36, y: b.y + 20 + d.r * 34, pick: d.pick }));
        if (i === 1)
          [12, 12, 4].forEach((count, band) => {
            for (let k = 0; k < count; k++) dots.push({ x: b.x + 16 + k * 36, y: b.y + 20 + band * 46, pick: band === 2 ? k < 2 : k % 4 === 1 });
          });
        if (i === 2)
          [0, 1, 2, 3, 4, 5].forEach((g) => {
            const gx0 = b.x + 30 + (g % 3) * 140;
            const gy0 = b.y + 22 + Math.floor(g / 3) * 64;
            for (let k = 0; k < 6; k++) dots.push({ x: gx0 + (k % 3) * 30, y: gy0 + Math.floor(k / 3) * 26, pick: g === 1 || g === 5 });
          });
        if (i === 3) for (let k = 0; k < 10; k++) dots.push({ x: b.x + 16 + k * 40, y: b.y + 92, pick: true });
        return (
          <React.Fragment key={i}>
            <Svg opacity={p}>
              {i === 1
                ? [0, 1, 2].map((band) => <rect key={band} x={b.x} y={b.y + 4 + band * 46} width={440} height={32} rx={4} fill={band === 2 ? ds("purple", 100) : ds("blue", 50)} />)
                : null}
              {i === 2
                ? [0, 1, 2, 3, 4, 5].map((g) => (
                    <rect key={g} x={b.x + 14 + (g % 3) * 140} y={b.y + 6 + Math.floor(g / 3) * 64} width={92} height={58} rx={8} fill="none" stroke={g === 1 || g === 5 ? DATA : HAIRLINE} strokeWidth={g === 1 || g === 5 ? 2.5 * lit(i) + 1 : 1.2} />
                  ))
                : null}
              {i === 3
                ? (() => {
                    // A stream of dots sliding left, ten slots kept.
                    const t = (frame - at[i]) / 30;
                    return (
                      <>
                        {Array.from({ length: 12 }, (_, k) => {
                          const x = b.x + 440 - (((k * 37 + t * 40) % 444) + 444) % 444;
                          return <circle key={k} cx={x} cy={b.y + 28} r={8} fill={MUTED} />;
                        })}
                        {Array.from({ length: 10 }, (_, k) => (
                          <rect key={k} x={b.x + 4 + k * 40} y={b.y + 72} width={26} height={40} rx={4} fill="none" stroke={INK} strokeWidth={1.6} />
                        ))}
                      </>
                    );
                  })()
                : null}
              {dots.map((d, k) => (
                <circle key={k} cx={d.x} cy={d.y} r={9} fill={d.pick && lit(i) > 0.5 ? DATA : MUTED} />
              ))}
            </Svg>
            <Line at={at[i]} x={b.x} y={b.y + cellH} size={24} weight={600}>
              {names[i]}
            </Line>
            <Line at={at[i] + 6} x={b.x} y={b.y + cellH + c.h(38)} size={21} color={INK_SOFT}>
              {notes[i]}
            </Line>
          </React.Fragment>
        );
      })}
      <Line at={rareAt} x={box(1).x + 180} y={box(1).y + 2 * 46 + 6} size={20} color={ds("purple", 600)}>
        a rare class
      </Line>
    </>
  );
};

// ── 16. Covariance and correlation ───────────────────────────────────────────

const Corr: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const covAt = c.w("r-corr", "Covariance says whether");
  const unitsAt = c.w("r-corr", "depends on their units");
  const divAt = c.w("r-corr", "Correlation divides by both");
  const rangeAt = c.w("r-corr", "between minus one and one");
  const straightAt = c.w("r-corr", "only sees straight lines");
  const zeroAt = c.w("r-corr", "a correlation of zero");
  const sx0 = 1360;
  const sx1 = R_X1 - 20;
  const sBase = c.y(800);
  const sTop = c.y(470);
  const pts = Array.from({ length: 101 }, (_, i) => {
    const x = -1 + (2 * i) / 100;
    return [sx0 + ((x + 1) / 2) * (sx1 - sx0), sBase - x * x * (sBase - sTop)] as const;
  });
  const rowY = [c.y(486), c.y(536)];
  const colX = [1060, 1200];
  return (
    <>
      <Line at={covAt} x={R_X} y={c.y(330)} size={26}>
        Covariance: do they move together?
      </Line>
      <Line at={unitsAt} x={R_X} y={c.y(372)} size={24} color={INK_SOFT}>
        Its size depends on the units
      </Line>
      <Line at={unitsAt} x={R_X} y={c.y(436)} size={22} color={INK_SOFT}>
        Heights, weights
      </Line>
      <Line at={unitsAt} x={colX[0]} y={c.y(436)} size={22} color={INK_SOFT} align="center" width={160}>
        Covariance
      </Line>
      <Line at={divAt} x={colX[1]} y={c.y(436)} size={22} color={INK_SOFT} align="center" width={160}>
        Correlation
      </Line>
      {[
        { unit: "cm · kg", cov: RAPID.covariance.cmKg.toFixed(1), r: RAPID.covariance.r },
        { unit: "m · kg", cov: RAPID.covariance.mKg.toFixed(3), r: RAPID.covariance.rM },
      ].map((row, i) => (
        <React.Fragment key={row.unit}>
          <Line at={unitsAt + 4 + i * 6} x={R_X} y={rowY[i]} size={26}>
            In {row.unit}
          </Line>
          <Line at={unitsAt + 4 + i * 6} x={colX[0]} y={rowY[i]} size={26} align="center" width={160} weight={600}>
            <Mark at={unitsAt + 10 + i * 6}>
              <Num>{row.cov}</Num>
            </Mark>
          </Line>
          <Line at={divAt + 4 + i * 6} x={colX[1]} y={rowY[i]} size={26} align="center" width={160} weight={600}>
            <Num>{row.r.toFixed(2)}</Num>
          </Line>
        </React.Fragment>
      ))}
      <Line at={divAt} x={R_X} y={c.y(620)} size={26}>
        <MathRun>
          <I>r</I> = cov(<I>x</I>, <I>y</I>) / (<I>σ</I>
          <sub style={{ fontSize: "0.7em" }}>
            <I>x</I>
          </sub>{" "}
          <I>σ</I>
          <sub style={{ fontSize: "0.7em" }}>
            <I>y</I>
          </sub>
          )
        </MathRun>
      </Line>
      <Line at={rangeAt} x={R_X} y={c.y(676)} size={24} color={INK_SOFT}>
        Always between <M>-1</M> and <Num>1</Num>
      </Line>
      <Line at={straightAt} x={R_X} y={c.y(732)} size={24}>
        It only sees straight lines
      </Line>
      <ColumnRule x={1310} top={c.y(436)} height={sBase - c.y(436) + 40} at={straightAt} />
      <Svg>
        {pts.map(([x, yy], i) => {
          const p = ease(frame, straightAt + 4 + i * 0.12, 8);
          return p > 0 ? <circle key={i} cx={x} cy={yy} r={4.5 * p} fill={DATA} /> : null;
        })}
        <line x1={sx0} x2={sx1} y1={sBase + 10} y2={sBase + 10} stroke={INK} strokeWidth={1.6} opacity={ease(frame, straightAt, 10)} />
      </Svg>
      <Line at={straightAt + 6} x={sx0} y={c.y(410)} size={22} color={INK_SOFT}>
        <M>y = x²</M> on <M>-1</M> to <Num>1</Num>
      </Line>
      <Line at={zeroAt} x={(sx0 + sx1) / 2} y={sTop + c.h(70)} size={30} weight={600} align="center" width={240}>
        <Mark at={zeroAt + 4}>
          <MathRun>
            <I>r</I> = <Num>{Math.abs(RAPID.rSquare).toFixed(0)}</Num>
          </MathRun>
        </Mark>
      </Line>
    </>
  );
};

// ── 17. Correlation and causation ────────────────────────────────────────────

const BOX_H = 64;
const Box: React.FC<{ x: number; y: number; w: number; at: number; children: React.ReactNode }> = ({ x, y, w, at, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: BOX_H,
        boxSizing: "border-box",
        border: `2px solid ${INK}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(26, INK),
        fontWeight: 600,
        opacity: p,
        transform: `scale(${0.94 + 0.06 * p})`,
      }}
    >
      {children}
    </div>
  );
};

const Arrow: React.FC<{ from: Pt; to: Pt; at: number; dash?: boolean; color?: string }> = ({ from, to, at, dash, color = INK }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const line: Pt[] = Array.from({ length: 41 }, (_, i) => [from[0] + ((to[0] - from[0]) * i) / 40, from[1] + ((to[1] - from[1]) * i) / 40] as Pt);
  const head = 15;
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const reach = (len - head + 1) / len;
  const end: Pt = [from[0] + (to[0] - from[0]) * reach * p, from[1] + (to[1] - from[1]) * reach * p];
  return (
    <Svg>
      <line x1={from[0]} y1={from[1]} x2={end[0]} y2={end[1]} stroke={color} strokeWidth={2.6} strokeDasharray={dash ? "8 6" : undefined} />
      {p > 0.9 ? <path d={arrowHead(line, head, head * 0.53, { filled: true })} fill={color} /> : null}
    </Svg>
  );
};

const Cause: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const isntAt = c.w("r-cause", "correlation isn't causation");
  const confAt = c.w("r-cause", "a confounder can drive both");
  const hotAt = c.w("r-cause", "hot weather drives");
  const iceAt = c.w("r-cause", "ice cream sales");
  const drownAt = c.w("r-cause", "and drownings");
  const otherAt = c.w("r-cause-other", "the cause runs the other way");
  const predictAt = c.w("r-cause-act", "A model can predict from a correlation");
  const decideAt = c.w("r-cause-act", "Deciding what to change");
  const rctAt = c.w("r-cause-act", "a randomized experiment");
  const hot = { x: 1240, y: c.y(330), w: 280 };
  const ice = { x: R_X, y: c.y(560), w: 300 };
  const drown = { x: 1400, y: c.y(560), w: 300 };
  const iceW = 120;
  return (
    <>
      <Box x={hot.x} y={hot.y} w={hot.w} at={hotAt}>
        Hot weather
      </Box>
      <Box x={ice.x} y={ice.y} w={ice.w} at={iceAt}>
        Ice cream sales
      </Box>
      <Box x={drown.x} y={drown.y} w={drown.w} at={drownAt}>
        Drownings
      </Box>
      <Arrow from={[hot.x + 40, hot.y + BOX_H + 1]} to={[ice.x + ice.w / 2 + 40, ice.y - 1]} at={iceAt + 2} />
      <Arrow from={[hot.x + hot.w - 40, hot.y + BOX_H + 1]} to={[drown.x + drown.w / 2 - 40, drown.y - 1]} at={drownAt + 2} />
      {/* "Ice cream causes drownings": the arrow the correlation tempts you
          to draw, dashed and struck. The correlation itself is real. */}
      <Arrow from={[ice.x + ice.w + 1, ice.y + BOX_H / 2]} to={[drown.x - 1, drown.y + BOX_H / 2]} at={drownAt + 10} dash color={INK_SOFT} />
      <Svg opacity={ease(frame, drownAt + 10, 12)}>
        <line x1={(ice.x + ice.w + drown.x) / 2 - 18} x2={(ice.x + ice.w + drown.x) / 2 + 18} y1={ice.y + BOX_H / 2 + 22} y2={ice.y + BOX_H / 2 - 22} stroke={BAD} strokeWidth={4} strokeLinecap="round" opacity={ease(frame, drownAt + 18, 8)} />
      </Svg>
      <Line at={confAt} x={hot.x + hot.w + 30} y={hot.y + 18} size={22} color={INK_SOFT}>
        The confounder
      </Line>
      <Line at={isntAt} x={R_X} y={hot.y + 18} size={24} weight={600}>
        Correlation isn&apos;t causation
      </Line>
      {/* The page's other two reasons, beside the one the diagram draws. */}
      <Line at={otherAt} x={R_X} y={hot.y + 18 + c.h(44)} size={22} color={INK_SOFT}>
        Or reverse causation, or chance
      </Line>
      <Spot id="ice-cream" at={iceAt} x={ice.x + 70} y={ice.y + BOX_H + 84} w={iceW} />
      <Line at={predictAt} x={1100} y={c.y(720)} size={24}>
        A model can predict from a correlation
      </Line>
      <Line at={decideAt} x={1100} y={c.y(770)} size={24}>
        Deciding what to change needs
      </Line>
      <Line at={rctAt} x={1100} y={c.y(814)} size={24} color={ds("green", 700)} weight={600}>
        A randomized experiment, or a causal method
      </Line>
    </>
  );
};

/**
 * The quick round: five definitions as a numbered list down the left (13 to
 * 17, on screen only), each answer drawn on the right while it is current.
 * The mass function beside a density whose height passes 1; the five
 * distributions, each lit as named; four sampling methods; covariance in two
 * units beside one correlation, and the parabola whose correlation is 0;
 * hot weather driving both ice cream and drownings. Then "Next: deep
 * learning".
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { durationInFrames } = n;
  const { y, h } = useLayout();
  const from = n.beat("rapid-in").from;
  const fiveAt = n.word("rapid-in", "Five quick ones");
  const vocabAt = n.word("rapid-in", "on the vocabulary");
  const nextAt = n.word("next", "Next: deep learning");
  const end = n.beat("next").to;
  const c: Ctx = { w: n.word, y, h };

  const items: RapidItem[] = [
    { n: 13, label: "Random variables, PMF and PDF", at: n.word("r-pdf", "A random variable maps") - 4, body: <Pdf c={c} /> },
    { n: 14, label: "Distributions to know", at: n.word("r-dist", "The distributions to know") - 4, body: <Dists c={c} /> },
    { n: 15, label: "Sampling methods", at: n.word("r-sample", "Sampling: simple random") - 4, body: <Sampling c={c} /> },
    { n: 16, label: "Covariance and correlation", at: n.word("r-corr", "Covariance says whether") - 4, body: <Corr c={c} /> },
    { n: 17, label: "Correlation and causation", at: n.word("r-cause", "And correlation isn't causation") - 4, body: <Cause c={c} /> },
  ];

  return (
    <AbsoluteFill>
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at + 4} level={-32} />
      ))}
      <Sfx name="el-pop" at={n.word("r-cause", "ice cream sales")} level={-30} />
      <Sfx name="el-pencil" at={nextAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <Kicker at={fiveAt}>Quick round</Kicker>
        <Headline lead="Five quick ones," turn="on the vocabulary" at={fiveAt} turnAt={vocabAt} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={600} at={fiveAt + 6} end={durationInFrames + 60} />
        <NextLine at={nextAt} x={X0} y={y(LIST_TOP) + 5 * h(ROW) + h(80)} width={560}>
          deep learning
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
