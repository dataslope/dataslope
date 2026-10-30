import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BESSEL, MLE } from "./data";
import { at, Axes, Curve, Drift, Mark, noteText, OK, OK_INK, partLabel, type Scale, Svg, X0 } from "./parts";

const LX: Scale = { lo: 0, hi: 1, a: X0 + 20, b: 1160 };
const L_BASE = 800;
const L_TOP = 400;
const SIDE_X = 1270;

/** The divisors' chart: one column per sample size. */
const SIZES_X0 = 240;
const SIZES_X1 = 1060;
const V_BASE = 820;
const V_TOP = 400;
const V_LO = 0.4;
const V_HI = 1.1;

/**
 * Questions 6 and 7. The likelihood of 12 clicks in 40 views over every
 * possible click rate, peaking at 0.30, and of 120 in 400, peaking in the
 * same place and far narrower. Then the two variance divisors averaged over
 * many samples at five sample sizes: dividing by n runs low, by half at
 * n = 2 and about a fifth at n = 5, and n − 1 sits on the true variance.
 */
export const MleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("mle").from;
  const qAt = n.word("mle", "Question");
  const textAt = n.word("mle", "What is maximum likelihood");
  const mleAt = n.word("mle", "or MLE");
  const chooseAt = n.word("mle", "Choose the parameter");
  const clicksAt = n.word("mle", "Twelve clicks in forty views");
  const everyAt = n.word("mle", "across every possible click rate");
  const peakAt = n.word("mle", "peaks at point three");
  const shareAt = n.word("mle", "the share you saw");
  const tenAt = n.word("mle", "Ten times the data");
  const narrowAt = n.word("mle", "narrows the curve");
  const widthAt = n.word("mle", "Its width is the precision");
  const normalAt = n.word("mle-more", "For a normal mean");
  const logisticAt = n.word("mle-more", "logistic regression");
  const q7At = n.word("unbiased", "Question seven");
  const q7TextAt = n.word("unbiased", "What makes an estimator unbiased");
  const avgAt = n.word("unbiased", "Its average over many samples");
  const meanAt = n.word("unbiased", "The sample mean is unbiased");
  const byNAt = n.word("unbiased", "Variance divided by n is not");
  const ownAt = n.word("unbiased", "measured from its own mean");
  const smallAt = n.word("unbiased", "the squares come out small");
  const lowAt = n.word("unbiased", "twenty percent low");
  const fixAt = n.word("unbiased", "Dividing by n minus one");
  const mseFrom = n.beat("unbiased-mse").from;
  const mlAt = n.word("unbiased-mse", "the maximum-likelihood answer");
  const lessAt = n.word("unbiased-mse", "biased, but less variable");
  const mseAt = n.word("unbiased-mse", "its mean squared error is lower");
  const notBetterAt = n.word("unbiased-mse", "Unbiased isn't automatically better");
  const end = n.beat("unbiased-mse").to;

  const mleOut = q7At - 4;

  // ── Question 6: the likelihood ──
  const lb = y(L_BASE);
  const ly = (v: number) => lb - v * (lb - y(L_TOP));
  const curvePts = (values: readonly number[]) =>
    MLE.grid.flatMap((g, i) => (values[i] > 0.001 || (values[i - 1] ?? 0) > 0.001 || (values[i + 1] ?? 0) > 0.001 ? [[at(LX, g), ly(values[i])] as const] : []));
  const [wide, narrow] = MLE.curves;
  const level = (k: number) => ly(0.15) - k * h(26);

  // ── Question 7: the two divisors ──
  const rows = BESSEL.rows;
  const vx = (i: number) => SIZES_X0 + (i * (SIZES_X1 - SIZES_X0)) / (rows.length - 1);
  const vy = (v: number) => y(V_BASE) - ((v - V_LO) / (V_HI - V_LO)) * (y(V_BASE) - y(V_TOP));
  const byN = rows.map((r, i) => [vx(i), vy(r.byN)] as const);
  const byN1 = rows.map((r, i) => [vx(i), vy(r.byN1)] as const);
  const five = rows.findIndex((r) => r.n === 5);
  // The mechanism lines make way for the trade-off once they have been said.
  const whyOut = mseFrom - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={everyAt + 2} level={-34} />
      <Sfx name="el-tap" at={peakAt} level={-32} />
      <Sfx name="el-pencil" at={tenAt + 2} level={-34} />
      <Sfx name="el-tap" at={widthAt + 4} level={-34} />
      <Sfx name="el-pencil" at={byNAt + 4} level={-34} />
      <Sfx name="el-tap" at={lowAt} level={-32} />
      <Sfx name="el-pop" at={fixAt + 6} level={-32} />
      <Sfx name="el-tap" at={mseAt + 10} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={mleOut} size={60}>
          What is maximum likelihood estimation <Mark at={mleAt + 4}>(MLE)</Mark>?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} size={60}>
          What makes an estimator unbiased?
        </QuestionCard>

        {/* ── Question 6: the likelihood over every click rate ── */}
        <Note at={chooseAt} x={X0} y={y(300)} out={mleOut}>
          <span style={{ ...noteText(26, INK) }}>the parameter that makes the data you saw most probable</span>
        </Note>
        <Axes
          x={LX}
          y={{ lo: 0, hi: 1, a: lb, b: y(L_TOP) }}
          xTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          xFormat={(v) => fmt(v, 1)}
          xTitle="click rate"
          yTitle="likelihood"
          at={everyAt - 6}
          out={mleOut}
          size={19}
        />
        {/* Each curve keeps one ink, keyed by a line beside its name: the
            first data in grey, ten times the data in the data blue, as the
            series sets a baseline against what is compared with it. */}
        <Note at={clicksAt} x={SIDE_X} y={y(400)} out={mleOut}>
          <span style={{ ...noteText(28, INK_SOFT), fontWeight: 650, ...TABULAR, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 34, height: 0, borderTop: `3.4px solid ${INK_SOFT}` }} />
            12 clicks in 40 views
          </span>
        </Note>
        <Curve
          points={curvePts(wide.values)}
          at={everyAt}
          dur={30}
          out={mleOut}
          color={INK_SOFT}
          width={3.4}
          fill={`color-mix(in srgb, ${INK_SOFT} 10%, transparent)`}
          base={lb}
        />
        <Svg opacity={1 - ease(frame, mleOut, 10)}>
          <line x1={at(LX, wide.peak)} x2={at(LX, wide.peak)} y1={ly(1) - h(10)} y2={lb} stroke={INK} strokeWidth={2} strokeDasharray="6 6" opacity={ease(frame, peakAt - 2, 12)} />
          <circle cx={at(LX, wide.peak)} cy={ly(1)} r={8 * ease(frame, peakAt - 2, 10)} fill={INK} />
        </Svg>
        <Note at={peakAt} x={at(LX, wide.peak) + 16} y={ly(1) - h(40)} out={mleOut}>
          <span style={{ ...noteText(26, INK), ...TABULAR }}>
            peak at <b>{fmt(wide.peak, 2)}</b>
            <span style={{ opacity: ease(frame, shareAt - 2, 10) }}> = 12 / 40, the share you saw</span>
          </span>
        </Note>
        <Note at={tenAt} x={SIDE_X} y={y(450)} out={mleOut}>
          <span style={{ ...noteText(28, BLUE_INK), fontWeight: 650, ...TABULAR, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 34, height: 0, borderTop: `3.4px solid ${BAR}` }} />
            120 in 400
          </span>
        </Note>
        <Curve points={curvePts(narrow.values)} at={tenAt + 2} dur={26} out={mleOut} color={BAR} width={3.4} />
        <Note at={narrowAt} x={SIDE_X} y={y(500)} out={mleOut}>
          <span style={{ ...noteText(24, INK_SOFT) }}>same peak, narrower curve</span>
        </Note>
        <Svg opacity={1 - ease(frame, mleOut, 10)}>
          {[wide, narrow].map((c, k) => {
            const p = ease(frame, widthAt + 2 + k * 6, 14);
            if (p <= 0) return null;
            const x0 = at(LX, c.low);
            const x1 = at(LX, c.high);
            const mid = (x0 + x1) / 2;
            const yy = level(k);
            return (
              <g key={k} stroke={k ? BAR : INK_SOFT} strokeWidth={2.6}>
                <line x1={mid - ((x1 - x0) / 2) * p} x2={mid + ((x1 - x0) / 2) * p} y1={yy} y2={yy} />
                <line x1={mid - ((x1 - x0) / 2) * p} x2={mid - ((x1 - x0) / 2) * p} y1={yy - 8} y2={yy + 8} />
                <line x1={mid + ((x1 - x0) / 2) * p} x2={mid + ((x1 - x0) / 2) * p} y1={yy - 8} y2={yy + 8} />
              </g>
            );
          })}
        </Svg>
        <Note at={widthAt + 4} x={at(LX, wide.high) + 18} y={level(0) - h(16)} out={mleOut}>
          <span style={{ ...noteText(24, INK) }}>
            the <Mark at={widthAt + 8}>width</Mark> is the precision
          </span>
        </Note>
        <Note at={normalAt} x={SIDE_X} y={y(600)} out={mleOut}>
          <span style={{ ...noteText(24, INK) }}>
            normal mean → <b>the sample mean</b>
          </span>
        </Note>
        <Note at={logisticAt} x={SIDE_X} y={y(650)} out={mleOut}>
          <div style={{ ...noteText(24, INK), lineHeight: 1.35 }}>
            logistic regression → the same way,
            <br />
            maximizing the likelihood of the labels
          </div>
        </Note>

        {/* ── Question 7: dividing by n, and by n − 1 ── */}
        <Note at={avgAt} x={X0} y={y(300)}>
          <span style={{ ...noteText(26, INK) }}>
            unbiased: its <Mark at={avgAt + 6}>average over many samples</Mark> equals the true value
          </span>
        </Note>
        <Axes
          x={{ lo: 0, hi: 1, a: SIZES_X0 - 80, b: SIZES_X1 + 80 }}
          y={{ lo: V_LO, hi: V_HI, a: y(V_BASE), b: y(V_TOP) }}
          xTicks={[]}
          yTicks={[0.5, 0.75, 1]}
          yFormat={(v) => fmt(v, 2)}
          yTitle="average variance estimate"
          at={byNAt - 4}
          size={19}
        />
        <Svg opacity={ease(frame, byNAt - 2, 10)}>
          {rows.map((r, i) => (
            <text key={r.n} x={vx(i)} y={y(V_BASE) + 32} textAnchor="middle" fill={INK_SOFT} style={{ ...label(20, INK_SOFT), ...TABULAR }}>
              n = {r.n}
            </text>
          ))}
        </Svg>
        <Curve points={[[SIZES_X0 - 80, vy(1)], [SIZES_X1 + 80, vy(1)]]} at={byNAt} dur={14} color={INK} width={2} dash="7 6" />
        <Note at={byNAt + 4} x={SIZES_X1 + 80} y={vy(1) - h(44)} align="right">
          <span style={{ ...partLabel(20, INK) }}>true variance, 1</span>
        </Note>
        <Curve points={byN} at={byNAt + 4} dur={20} color={ACCENT} width={3} />
        <Svg>
          {byN.map(([px, py], i) => {
            const p = ease(frame, byNAt + 4 + i * 4, 8);
            return p > 0 ? <circle key={i} cx={px} cy={py} r={8 * p} fill={ACCENT} /> : null;
          })}
          {byN1.map(([px, py], i) => {
            const p = ease(frame, fixAt + 4 + i * 4, 8);
            return p > 0 ? <circle key={i} cx={px} cy={py} r={8 * p} fill={OK} /> : null;
          })}
        </Svg>
        <Curve points={byN1} at={fixAt + 4} dur={20} color={OK} width={3} />
        <Note at={byNAt + 8} x={vx(0) + 20} y={vy(rows[0].byN) + h(10)}>
          <span style={{ ...noteText(24, ACCENT_INK) }}>÷ n</span>
        </Note>
        <Note at={lowAt} x={vx(five) + 16} y={vy(rows[five].byN) + h(10)}>
          <span style={{ ...noteText(24, ACCENT_INK), ...TABULAR }}>
            <Mark at={lowAt + 4}>{fmt(rows[five].byN, 2)}</Mark>: about 20% low
          </span>
        </Note>
        <Note at={fixAt + 8} x={vx(0) + 20} y={vy(rows[0].byN1) - h(50)}>
          <span style={{ ...noteText(24, OK_INK) }}>÷ (n − 1)</span>
        </Note>

        <Note at={meanAt} x={SIDE_X} y={y(420)}>
          <span style={{ ...noteText(26, INK) }}>
            the sample mean: <span style={{ color: OK_INK, fontWeight: 650 }}>unbiased</span>
          </span>
        </Note>
        <Note at={byNAt} x={SIDE_X} y={y(470)}>
          <span style={{ ...noteText(26, INK) }}>
            variance ÷ n: <span style={{ color: ACCENT_INK, fontWeight: 650 }}>not</span>
          </span>
        </Note>
        <Note at={ownAt} x={SIDE_X} y={y(550)} out={whyOut}>
          <div style={{ ...noteText(24, INK_SOFT), lineHeight: 1.4 }}>
            each spread is measured from its own
            <br />
            mean, which sits closer to the data
            <br />
            than the true mean does
          </div>
        </Note>
        <Note at={smallAt} x={SIDE_X} y={y(680)} out={whyOut}>
          <span style={{ ...noteText(24, ACCENT_INK) }}>so the squares come out small</span>
        </Note>
        <Note at={fixAt + 6} x={SIDE_X} y={y(760)}>
          <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: OK_INK, whiteSpace: "nowrap" }}>
            s² = Σ(x − <span style={{ textDecoration: "overline" }}>x</span>)² / (n − 1)
          </div>
        </Note>

        {/* ── The follow-up: is unbiased always better? ── */}
        <Note at={mlAt} x={SIDE_X} y={y(550)}>
          <span style={{ ...noteText(24, INK) }}>
            <span style={{ color: ACCENT_INK, fontWeight: 650 }}>÷ n</span> is the MLE:
            <span style={{ opacity: ease(frame, lessAt - 2, 10) }}> biased, but less variable</span>
          </span>
        </Note>
        <Note at={mseAt - 4} x={SIDE_X} y={y(600)}>
          <span style={{ ...noteText(24, INK) }}>mean squared error = bias² + variance</span>
        </Note>
        <Note at={mseAt + 4} x={SIDE_X} y={y(648)}>
          <span style={{ ...noteText(24, INK), ...TABULAR }}>
            at n = {rows[five].n}: <Mark at={mseAt + 10}>{fmt(rows[five].mseN, 2)}</Mark> for <span style={{ color: ACCENT_INK }}>÷ n</span>, {fmt(rows[five].mseN1, 2)} for{" "}
            <span style={{ color: OK_INK }}>÷ (n − 1)</span>
          </span>
        </Note>
        <Note at={notBetterAt} x={SIDE_X} y={y(696)}>
          <span style={{ ...noteText(24, INK_SOFT) }}>unbiased isn&apos;t automatically better</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
