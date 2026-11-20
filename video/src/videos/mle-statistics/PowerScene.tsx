import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule, Ink, Num, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { POWER } from "./data";
import { Area, BAD, BAD_FILL, BAD_INK, Baseline, Curve, DATA, Drift, Line, Mark, normalPoints, OK_FILL, OK_INK, POINT, pulse, Svg, X0 } from "./parts";

const L_X1 = 1000;
const R_X0 = 1100;
/** The two worlds, in standard units: a picture, not a measurement. */
const ALT = 2.8;
const Z_LO = -3.4;
const Z_HI = 6.2;

/** The standard normal CDF (Abramowitz and Stegun 7.1.26, error under 2e-7). */
const phi = (z: number) => {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
};
/** Power of a two-sided two-proportion test at `n` users per arm. */
const powerOf = (n: number) => {
  const sd = Math.sqrt((POWER.base * (1 - POWER.base) + POWER.target * (1 - POWER.target)) / n);
  return phi((POWER.target - POWER.base) / sd - 1.959964);
};

const alphaM = (
  <MathRun>
    <I>α</I>
  </MathRun>
);
const betaM = (
  <MathRun>
    <I>β</I>
  </MathRun>
);

/**
 * Question 9. The two worlds: the null's curve and the alternative's, a
 * critical line, α (the null's tail past it, red), β (the alternative's
 * part short of it, red) and power (the rest, green). Lowering α slides the
 * line right: the α tail shrinks, β grows. Then the online test, sized: power
 * against users per arm for a 5% to 5.5% click rate, 80% reached at about
 * 31,000; half the lift takes about four times the users; at 5,000 per arm
 * the power is 20%, so a small test that finds nothing has not shown the
 * models are equal.
 */
export const PowerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q9").from;
  const qAt = n.word("q9", "Question nine");
  const textAt = n.word("q9", "What are type one and type two errors");
  const oneAt = n.word("q9", "Type one is a false positive");
  const alphaAt = n.word("q9", "at rate alpha");
  const twoAt = n.word("q9", "Type two is a false negative");
  const betaAt = n.word("q9", "at rate beta");
  const powerAt = n.word("q9", "Power, one minus beta");
  const catchAt = n.word("q9", "the chance of catching a real effect");
  const risesAt = n.word("q9-trade", "It rises with more data");
  const biggerAt = n.word("q9-trade", "a bigger effect");
  const noiseAt = n.word("q9-trade", "less noise");
  const looserAt = n.word("q9-trade", "a looser alpha");
  const loweringAt = n.word("q9-trade", "Lowering alpha trades");
  const onlineAt = n.word("q9-online", "Whether users notice");
  const chooseAt = n.word("q9-online", "where you choose the sample size");
  const clickAt = n.word("q9-online", "a click rate moving");
  const eightyAt = n.word("q9-online", "at eighty percent power");
  const thirtyOneAt = n.word("q9-online", "about thirty-one thousand users");
  const halfAt = n.word("q9-online", "Half that lift");
  const fiveKAt = n.word("q9-null", "With five thousand per arm");
  const inFiveAt = n.word("q9-null", "one time in five");
  const smallAt = n.word("q9-null", "So a test that small");
  const equalAt = n.word("q9-null", "the models are equal");
  const trustedAt = n.word("q10-in", "Every test so far trusted the sample");
  const rightOneAt = n.word("q10-in", "whether it's the right one");
  const end = n.beat("q10-in").to;

  const worldsOut = onlineAt - 2;

  // ── The two worlds ──
  const base = y(580);
  const height = h(210);
  const zx = (z: number) => X0 + ((z - Z_LO) / (Z_HI - Z_LO)) * (L_X1 - X0);
  const nullPts = normalPoints({ mu: 0, sd: 1, lo: Z_LO, hi: Z_HI, x0: X0, x1: L_X1, base, height, steps: 240 });
  const altPts = normalPoints({ mu: ALT, sd: 1, lo: Z_LO, hi: Z_HI, x0: X0, x1: L_X1, base, height, steps: 240 });
  const crit = 1.96 + (2.5 - 1.96) * ease(frame, loweringAt + 4, 30);
  const cx = zx(crit);

  // ── Power against users per arm ──
  const pTop = y(340);
  const pBase = y(720);
  const ux = (u: number) => X0 + 70 + (u / 80000) * (L_X1 - X0 - 90);
  const py = (v: number) => pBase - v * (pBase - pTop);
  // The curve between the computed points, from the same two-proportion
  // formula check.mjs used (it reproduces every point of POWER.curve).
  const smooth = Array.from({ length: 161 }, (_, i) => {
    const u = 400 + (i / 160) * (80000 - 400);
    return [ux(u), py(powerOf(u))] as const;
  });
  const at31 = [ux(POWER.perArm), py(POWER.power)] as const;
  const at5 = [ux(POWER.smallArm), py(POWER.powerSmall)] as const;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={oneAt} level={-35} />
      <Sfx name="el-tap" at={alphaAt} level={-31} />
      <Sfx name="el-tap" at={betaAt} level={-31} />
      <Sfx name="el-tap" at={powerAt} level={-31} />
      {[risesAt, biggerAt, noiseAt, looserAt].map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-33} />
      ))}
      <Sfx name="el-whoosh" at={loweringAt + 4} level={-36} />
      <Sfx name="el-pencil" at={clickAt} level={-35} />
      <Sfx name="el-tap" at={thirtyOneAt} level={-29} />
      <Sfx name="el-tap" at={fiveKAt + 4} level={-30} />
      <Sfx name="el-tap" at={inFiveAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.5 * ease(frame, trustedAt, Math.max(60, rightOneAt + 20 - trustedAt)) }}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          What are Type I and Type II errors, and what is power?
        </QuestionCard>

        {/* ── The two worlds ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, worldsOut, 12) }}>
          <Area points={altPts} x0={cx} x1={zx(Z_HI)} base={base} at={powerAt} color={OK_FILL} opacity={0.75} />
          <Area points={altPts} x0={zx(Z_LO)} x1={cx} base={base} at={betaAt} color={BAD_FILL} opacity={0.6} />
          <Area points={nullPts} x0={cx} x1={zx(Z_HI)} base={base} at={alphaAt} color={BAD} opacity={0.75} />
          <Curve points={nullPts} at={oneAt - 8} dur={22} color={INK} width={2.6} />
          <Curve points={altPts} at={twoAt - 8} dur={22} color={DATA} width={2.6} />
          <Svg opacity={ease(frame, oneAt, 12)}>
            <line x1={X0} x2={L_X1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
            <line x1={cx} x2={cx} y1={base} y2={base - height - h(30)} stroke={INK} strokeWidth={2.4} strokeDasharray="6 5" />
          </Svg>
          <Line at={oneAt - 6} x={zx(0)} y={base - height - h(46)} size={22} align="center" width={360}>
            If the null is true
          </Line>
          <Line at={twoAt - 6} x={zx(ALT) + 150} y={base - height - h(46)} size={22} color={DATA} align="center" width={360}>
            If the effect is real
          </Line>
          <Line at={alphaAt + 4} x={zx(-1.2)} y={base + h(16)} size={24} color={BAD_INK} align="center" width={200}>
            {betaM}
          </Line>
          <Line at={powerAt + 4} x={zx(3.6)} y={base - h(70)} size={24} color={OK_INK} align="center" width={200}>
            Power
          </Line>
          <Line at={alphaAt + 4} x={cx + 16} y={base + h(16)} size={24} color={BAD_INK}>
            {alphaM}
          </Line>
          <Svg opacity={ease(frame, betaAt + 4, 10)}>
            <line x1={zx(-0.9)} x2={zx(1.3)} y1={base + h(30)} y2={base - h(26)} stroke={BAD_INK} strokeWidth={1.4} />
          </Svg>
          <Line at={loweringAt} x={X0} y={y(640)} size={24}>
            Lower{" "}
            <MathRun>
              <I>α</I>
            </MathRun>
            : fewer false positives, more false negatives
          </Line>
        </div>

        {/* ── The definitions ── */}
        <ColumnRule x={(L_X1 + R_X0) / 2} top={y(300)} height={y(880) - y(300)} at={oneAt} />
        <Line at={oneAt} x={R_X0} y={y(300)} size={28}>
          <b>Type I</b>: a false positive
        </Line>
        <Line at={oneAt + 10} x={R_X0} y={y(342)} size={24} color={INK_SOFT}>
          Rejecting a true null, at rate {alphaM}
        </Line>
        <Line at={twoAt} x={R_X0} y={y(404)} size={28}>
          <b>Type II</b>: a false negative
        </Line>
        <Line at={twoAt + 10} x={R_X0} y={y(446)} size={24} color={INK_SOFT}>
          Missing a real effect, at rate {betaM}
        </Line>
        <Line at={powerAt} x={R_X0} y={y(508)} size={28} color={OK_INK} weight={600}>
          Power = <M>1 - β</M>
        </Line>
        <Line at={catchAt} x={R_X0} y={y(550)} size={24} color={INK_SOFT}>
          The chance of catching a real effect
        </Line>
        <Ink at={risesAt} dur={14} style={{ left: R_X0, top: y(616), whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, ...note(22, INK) }}>
            <span style={{ marginRight: 4 }}>Rises with</span>
            {[
              { t: "more data", at: risesAt + 4 },
              { t: "a bigger effect", at: biggerAt },
              { t: "less noise", at: noiseAt },
              {
                t: (
                  <>
                    a looser{" "}
                    <MathRun>
                      <I>α</I>
                    </MathRun>
                  </>
                ),
                at: looserAt,
              },
            ].map((b) => (
              <span key={b.at} style={{ opacity: ease(frame, b.at - 2, 8) }}>
                <OutlineBadge tone="ink" size={22}>
                  {b.t}
                </OutlineBadge>
              </span>
            ))}
          </div>
        </Ink>

        {/* ── The online test, sized ── */}
        <Svg opacity={ease(frame, chooseAt, 12)}>
          {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <line key={v} x1={ux(0)} x2={L_X1} y1={py(v)} y2={py(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
          ))}
          <line x1={ux(0)} x2={L_X1} y1={py(POWER.power)} y2={py(POWER.power)} stroke={INK} strokeWidth={2} strokeDasharray="8 6" opacity={ease(frame, eightyAt, 10)} />
        </Svg>
        {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
          <Line key={v} at={chooseAt} x={ux(0) - 14} y={py(v) - 14} size={20} color={INK_SOFT} align="right" width={80}>
            <Num>{Math.round(v * 100)}%</Num>
          </Line>
        ))}
        <Line at={chooseAt} x={ux(0)} y={pTop - h(52)} size={20} color={INK_SOFT}>
          Power
        </Line>
        <Baseline
          x0={ux(0)}
          x1={L_X1}
          base={pBase}
          at={chooseAt}
          ticks={[0, 20000, 40000, 60000, 80000].map((v) => ({ v, x: ux(v), text: v.toLocaleString("en-US") }))}
          title="Users per arm"
        />
        <Curve points={smooth} at={clickAt} dur={30} color={DATA} width={3.2} />
        <Svg>
          {(() => {
            const p = ease(frame, thirtyOneAt, 10);
            const q = ease(frame, fiveKAt + 4, 10);
            return (
              <>
                {p > 0 ? <circle cx={at31[0]} cy={at31[1]} r={9 * p * (1 + 0.3 * pulse(frame, thirtyOneAt, 16))} fill={POINT} /> : null}
                {q > 0 ? <circle cx={at5[0]} cy={at5[1]} r={9 * q * (1 + 0.3 * pulse(frame, inFiveAt, 16))} fill={BAD} /> : null}
              </>
            );
          })()}
        </Svg>
        <Line at={thirtyOneAt + 2} x={at31[0] + 18} y={at31[1] + h(16)} size={24}>
          <Mark at={thirtyOneAt + 6}>
            <Num>{POWER.perArm.toLocaleString("en-US")}</Num> per arm
          </Mark>
        </Line>
        <Line at={inFiveAt} x={at5[0] + 18} y={at5[1] - h(4)} size={24} color={BAD_INK} weight={600}>
          <Num>5,000</Num> per arm: <Num>{Math.round(POWER.powerSmall * 100)}%</Num>
        </Line>
        <Line at={smallAt} x={X0} y={y(810)} size={28} weight={600}>
          Found nothing ≠ no difference
        </Line>

        <Line at={clickAt} x={R_X0} y={y(716)} size={24}>
          Click rate <Num>5%</Num> → <Num>5.5%</Num>, <Num>80%</Num> power, {alphaM} = <Num>5%</Num>
        </Line>
        <Line at={thirtyOneAt} x={R_X0} y={y(764)} size={28} weight={600}>
          About <Num>31,000</Num> users per arm
        </Line>
        <Line at={halfAt} x={R_X0} y={y(812)} size={28} weight={600}>
          <Mark at={halfAt + 4}>
            Half the lift: ×<Num>4</Num> users
          </Mark>
        </Line>
        <Line at={halfAt + 10} x={R_X0} y={y(856)} size={22} color={INK_SOFT}>
          <Num>5%</Num> → <Num>5.25%</Num> needs <Num>{POWER.perArmHalfLift.toLocaleString("en-US")}</Num> per arm
        </Line>
        <Line at={equalAt - 6} x={X0} y={y(856)} size={22} color={INK_SOFT}>
          A small test that finds nothing hasn&apos;t shown the models are equal
        </Line>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
