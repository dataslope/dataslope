import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Bars, NormalCurve, normalPdf } from "../../editorial/charts";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, TABULAR, fmt } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLT } from "./data";
import { at, Axes, Curve, Drift, Mark, noteText, OK, OK_INK, type Scale, Strike, Svg, X0 } from "./parts";

const PANEL_W = 470;
const PANEL_GAP = 100;
const PANEL_BASE = 610;
const PANEL_H = 230;
const LABELS = ["one draw", "the average of 5", "the average of 30"] as const;

/** The running average: log-scaled draws across, the value up. */
const RUN_X: Scale = { lo: 0, hi: Math.log10(2000), a: X0, b: 1200 };
const RUN_BASE = 830;
const RUN_TOP = 380;
const RUN_LO = 3;
const RUN_HI = 13;
const SIDE_X = 1330;

/**
 * Questions 4 and 5. Sample means from the page's skewed population at n = 1,
 * 5 and 30, standardized so only their shape changes, each under the normal
 * curve: the skew halves and halves again. Then the caveats. Then the Law of
 * Large Numbers as one running average settling toward the population mean,
 * set beside the bell: where the mean ends up, and what shape its
 * uncertainty takes on the way.
 */
export const CltScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("clt").from;
  const qAt = n.word("clt", "Question");
  const textAt = n.word("clt", "Why does the Central Limit Theorem");
  const cltAt = n.word("clt", "the CLT");
  const saysAt = n.word("clt", "It says the mean");
  const finiteAt = n.word("clt", "as long as its variance is finite");
  const panelAt = [n.word("clt", "One draw"), n.word("clt", "Average five"), n.word("clt", "Average thirty")];
  const halfAt = n.word("clt", "falls by half");
  const againAt = n.word("clt", "halves again");
  const formulaAt = n.word("clt-why", "one formula");
  const freeAt = n.word("clt-why", "It isn't free");
  const tailsAt = n.word("clt-why", "heavy tails");
  const thumbAt = n.word("clt-why", "a rule of thumb");
  const theoremAt = n.word("clt-why", "not a theorem");
  const q5At = n.word("lln", "Question five");
  const q5TextAt = n.word("lln", "What is the Law of Large Numbers");
  const settleAt = n.word("lln", "its mean settles");
  const runAt = n.word("lln", "One running average");
  const tenAt = n.word("lln", "five point nine");
  const hundredAt = n.word("lln", "five point three six");
  const twoKAt = n.word("lln", "five point one one");
  const whereAt = n.word("lln", "The LLN says where");
  const shapeAt = n.word("lln", "The CLT says what shape");
  const clearAt = n.word("estimate-in", "estimating from it") + 4;
  const end = n.beat("estimate-in").to;

  const panelOut = q5At - 4;
  const panels = CLT.panels;
  const unit = h(PANEL_H) / Math.max(...panels[0].counts);
  const base = y(PANEL_BASE);

  // ── The running average ──
  const ry = (v: number) => y(RUN_BASE) - ((v - RUN_LO) / (RUN_HI - RUN_LO)) * (y(RUN_BASE) - y(RUN_TOP));
  const rx = (k: number) => at(RUN_X, Math.log10(k));
  // The pen reaches 10 draws as "five point nine" is said, 100 on "five
  // point three six" and 2,000 on "five point one one".
  const legs: [number, number][] = [
    [runAt + 4, 1],
    [tenAt, 10],
    [hundredAt, 100],
    [twoKAt, 2000],
  ];
  const penAt = (() => {
    if (frame <= legs[0][0]) return 0;
    for (let i = 1; i < legs.length; i++) {
      const [t0, k0] = legs[i - 1];
      const [t1, k1] = legs[i];
      if (frame <= t1) {
        const p = (frame - t0) / Math.max(1, t1 - t0);
        return Math.log10(k0) + p * (Math.log10(k1) - Math.log10(k0));
      }
    }
    return Math.log10(2000);
  })();
  const drawn = CLT.running.filter(([k]) => Math.log10(k) <= penAt + 1e-9);
  const runPts = drawn.map(([k, v]) => [rx(k), ry(Math.min(v, RUN_HI + 0.4))] as const);
  const marks = [
    { k: 10, v: CLT.at10, at: tenAt },
    { k: 100, v: CLT.at100, at: hundredAt },
    { k: 2000, v: CLT.at2000, at: twoKAt },
  ];

  // The bell beside it: the n = 30 panel's normal, small.
  const bell = { x0: SIDE_X + 20, x1: SIDE_X + 440, base: y(800), height: h(150) };
  const bellPts = Array.from({ length: 81 }, (_, i) => {
    const z = -3.2 + (6.4 * i) / 80;
    return [bell.x0 + ((z + 3.2) / 6.4) * (bell.x1 - bell.x0), bell.base - (normalPdf(z, 0, 1) / normalPdf(0, 0, 1)) * bell.height] as const;
  });

  return (
    <AbsoluteFill>
      {panelAt.map((t, i) => (
        <Sfx key={i} name="el-sprinkle" at={t} level={-34} />
      ))}
      <Sfx name="el-tap" at={halfAt} level={-32} />
      <Sfx name="el-tap" at={againAt} level={-32} />
      <Sfx name="el-scratch" at={theoremAt + 4} level={-32} />
      <Sfx name="el-pencil" at={runAt + 4} level={-34} />
      {marks.map((m) => (
        <Sfx key={m.k} name="el-tap" at={m.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={shapeAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={q5At - 4} size={60}>
          Why does the Central Limit Theorem <Mark at={cltAt}>(CLT)</Mark> matter?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={56}>
          What is the Law of Large Numbers (LLN), and how does it differ from the CLT?
        </QuestionCard>

        {/* ── Question 4: the mean of more draws, closer to a bell ── */}
        <Note at={saysAt} x={X0} y={y(300)} out={panelOut}>
          <span style={{ ...noteText(26, INK) }}>
            the mean of many independent draws is close to normal,{" "}
            <span style={{ opacity: ease(frame, finiteAt - 2, 10) }}>if the variance is finite</span>
          </span>
        </Note>
        {panels.map((p, i) => {
          const x0 = X0 + i * (PANEL_W + PANEL_GAP);
          const s = { lo: -3, hi: 5, x0, x1: x0 + PANEL_W };
          const t = panelAt[i];
          return (
            <React.Fragment key={p.n}>
              <Axes x={{ lo: -3, hi: 5, a: x0, b: x0 + PANEL_W }} y={{ lo: 0, hi: 1, a: base, b: base - h(PANEL_H) }} xTicks={[]} at={t - 4} out={panelOut} />
              <div style={{ opacity: 1 - ease(frame, panelOut, 10) }}>
                <Bars counts={p.counts} lo={-3} bin={0.25} scale={s} base={base} unit={unit} gap={1.5} color={BAR} grow={(k) => ease(frame, t + k * 0.5, 12)} />
                <NormalCurve scale={s} base={base} unit={unit} mu={0} sd={1} count={10000} bin={0.25} at={t + 10} color={INK} width={2.2} />
              </div>
              <Note at={t} x={x0} y={base + h(18)} out={panelOut}>
                <span style={{ ...noteText(26, INK), fontWeight: 650 }}>{LABELS[i]}</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={halfAt} x={X0 + PANEL_W + PANEL_GAP} y={base + h(58)} out={panelOut}>
          <span style={{ ...noteText(24, BLUE_INK) }}>the skew falls by half</span>
        </Note>
        <Note at={againAt} x={X0 + 2 * (PANEL_W + PANEL_GAP)} y={base + h(58)} out={panelOut}>
          <span style={{ ...noteText(24, OK_INK) }}>and halves again</span>
        </Note>

        <Note at={formulaAt} x={X0} y={y(740)} out={panelOut}>
          <span style={{ ...noteText(26, INK) }}>
            So <Mark at={formulaAt + 4}>one formula</Mark> builds intervals and tests for almost any metric.
          </span>
        </Note>
        <Note at={freeAt} x={X0} y={y(800)} out={panelOut}>
          <span style={{ ...noteText(26, ACCENT_INK) }}>
            Not free:{" "}
            <span style={{ opacity: ease(frame, tailsAt - 2, 10) }}>heavy tails, dependence, rare extreme events</span>
          </span>
        </Note>
        <Note at={thumbAt - 4} x={X0} y={y(856)} out={panelOut}>
          <span style={{ ...noteText(26, INK), ...TABULAR }}>
            n ≥ 30 is a rule of thumb, not a{" "}
            <span style={{ color: ACCENT_INK }}>
              <Strike at={theoremAt + 4}>theorem</Strike>
            </span>
          </span>
        </Note>

        {/* ── Question 5: one running average, settling ── */}
        <Note at={settleAt} x={X0} y={y(300)} out={clearAt}>
          <span style={{ ...noteText(26, INK) }}>as a sample grows, its mean settles on the population&apos;s</span>
        </Note>
        <Axes
          x={RUN_X}
          y={{ lo: RUN_LO, hi: RUN_HI, a: y(RUN_BASE), b: y(RUN_TOP) }}
          xTicks={[0, 1, 2, 3]}
          xFormat={(v) => (10 ** v).toLocaleString("en-US")}
          yTicks={[5, 10]}
          xTitle="draws"
          at={runAt - 6}
          out={clearAt}
          size={19}
        />
        <Curve points={[[RUN_X.a, ry(CLT.mu)], [RUN_X.b, ry(CLT.mu)]]} at={runAt - 2} dur={16} out={clearAt} color={INK} width={2.2} dash="7 6" />
        <Note at={runAt + 4} x={RUN_X.b + 14} y={ry(CLT.mu) - 16} out={clearAt}>
          <span style={{ ...noteText(22, INK), ...TABULAR }}>μ = {fmt(CLT.mu, 2)}</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - ease(frame, clearAt, 10) }}>
          <defs>
            <clipPath id="ds-stats-run">
              <rect x={RUN_X.a - 10} y={y(RUN_TOP) - 20} width={RUN_X.b - RUN_X.a + 20} height={y(RUN_BASE) - y(RUN_TOP) + 20} />
            </clipPath>
          </defs>
          <g clipPath="url(#ds-stats-run)">
            {runPts.length > 1 ? (
              <path
                d={runPts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={BAR}
                strokeWidth={3.2}
                strokeLinejoin="round"
              />
            ) : null}
          </g>
          {marks.map((m) => {
            const p = ease(frame, m.at - 2, 8);
            return p > 0 ? <circle key={m.k} cx={rx(m.k)} cy={ry(m.v)} r={7 * p} fill={BLUE_INK} /> : null;
          })}
        </svg>
        {marks.map((m, i) => (
          <Note key={m.k} at={m.at} x={rx(m.k) - (i === 2 ? 0 : 20)} y={ry(m.v) - h(i === 2 ? 70 : 62)} align={i === 2 ? "right" : "left"} out={clearAt}>
            <span style={{ ...noteText(24, BLUE_INK), ...TABULAR }}>{fmt(m.v, 2)}</span>
          </Note>
        ))}

        <Note at={whereAt} x={SIDE_X} y={y(400)} out={clearAt}>
          <div style={{ ...noteText(26, INK) }}>
            <b>LLN</b>: <Mark at={whereAt + 6}>where</Mark> the mean ends up
          </div>
        </Note>
        <Note at={shapeAt} x={SIDE_X} y={y(500)} out={clearAt}>
          <div style={{ ...noteText(26, INK) }}>
            <b>CLT</b>: what <Mark at={shapeAt + 6}>shape</Mark> its uncertainty takes
          </div>
        </Note>
        <Curve points={bellPts} at={shapeAt + 4} out={clearAt} color={OK} width={3} />
        <Svg opacity={ease(frame, shapeAt + 4, 12) * (1 - ease(frame, clearAt, 10))}>
          <line x1={bell.x0} x2={bell.x1} y1={bell.base} y2={bell.base} stroke={INK} strokeWidth={1.4} />
        </Svg>
      </Drift>
    </AbsoluteFill>
  );
};
