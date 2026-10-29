import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BALANCE, ERRORS, EXPERIMENT } from "./data";
import {
  A_COLOR,
  A_INK,
  at,
  B_COLOR,
  B_INK,
  curvePath,
  Drift,
  ElbowArrow,
  MARK,
  type Scale,
  Strike,
  Svg,
  X0,
} from "./parts";

const TOP = 330;
/** The balance chart: one row per trait, the gap between arms along x. */
const BAL = { x0: 1180, x1: 1760, top: 360, pitch: 40 };
/** The null distribution for question 7. */
const NULL = { x0: 920, x1: 1760, base: 760, height: 300 };

/**
 * Questions 6 and 7. A test is random assignment to A or B, one change, one
 * metric; the page's chart of ten traits shows why: under self-selection all
 * ten arms differ by more than the usual 0.1, under a coin only age, at
 * 0.102. Then the course's experiment, 579 of 6,000 against 702 of 6,000,
 * and where its 3.64 standard errors fall on the curve a do-nothing change
 * would give: the 5% tails past 1.96 in yellow as the cutoff is named, p =
 * 0.0003 the area past 3.64 (too thin to draw), and what that number is not.
 */
export const AbtestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("abtest").from;
  const qAt = n.word("abtest", "Question six");
  const textAt = n.word("abtest", "What is the purpose");
  const asked = n.beat("abtest").to;
  const controlledAt = n.word("abtest-why", "a controlled experiment");
  const assignAt = n.word("abtest-why", "Assign users at random");
  const controlAt = n.word("abtest-why", "to control, A");
  const treatAt = n.word("abtest-why", "treatment, B");
  const oneThingAt = n.word("abtest-why", "change one thing");
  const compareAt = n.word("abtest-why", "compare a metric");
  const alikeAt = n.word("abtest-why", "makes the groups alike");
  const neverAt = n.word("abtest-why", "things you never measured");
  const causationAt = n.word("abtest-why", "That's causation");
  const pickAt = n.word("abtest-balance", "Let users pick");
  const tenAt = n.word("abtest-balance", "all ten of these traits");
  const flagAt = n.word("abtest-balance", "the usual flag");
  const coinAt = n.word("abtest-coin", "Flip a coin");
  const barelyAt = n.word("abtest-coin", "barely");
  const q7At = n.word("pvalue", "Question seven");
  const q7TextAt = n.word("pvalue", "What is a p-value");
  const extremeAt = n.word("pvalue", "at least this extreme");
  const noDiffAt = n.word("pvalue", "really no difference");
  const countsAt = n.word("pvalue-test", "five hundred seventy-nine");
  const bAt = n.word("pvalue-test", "seven hundred two in B");
  const nothingAt = n.word("pvalue-gap", "If the change did nothing");
  const seAt = n.word("pvalue-gap", "three point six four standard errors");
  const threeAt = n.word("pvalue-gap", "three times in ten thousand");
  const cutoffAt = n.word("pvalue-gap", "the usual cutoff");
  const realAt = n.word("pvalue-gap", "treat the lift as real");
  const notAt = n.word("pvalue-not", "It isn't the chance");
  const sizeAt = n.word("pvalue-size", "how big the effect is");
  const end = n.beat("signif-in").to;
  const out6 = q7At - 4;

  // ── Question 6: who goes where ──
  const userX = X0 + 40;
  const forkY = y(TOP + 170);
  const armX = X0 + 330;
  const arms = [
    { name: "A", what: "control: the old version", color: A_COLOR, ink: A_INK, yy: y(TOP + 70), at: controlAt },
    { name: "B", what: "treatment: the new version", color: B_COLOR, ink: B_INK, yy: y(TOP + 270), at: treatAt },
  ];

  // ── The balance chart ──
  const xs: Scale = { lo: 0, hi: 1, a: BAL.x0, b: BAL.x1 };
  const rowY = (i: number) => y(BAL.top) + h(36) + i * h(BAL.pitch);
  const lineX = at(xs, BALANCE.threshold);
  const [overKey] = BALANCE.overRandomised[0] ?? [""];

  // ── Question 7 ──
  const zs: Scale = { lo: -4, hi: 4.4, a: NULL.x0, b: NULL.x1 };
  const base = y(NULL.base);
  const height = h(NULL.height);
  const zx = at(zs, EXPERIMENT.z);
  const crit = EXPERIMENT.zc;
  const curveP = ease(frame, nothingAt - 4, 20);
  const oursP = ease(frame, seAt - 2, 14);
  const tailP = ease(frame, cutoffAt - 2, 14);
  const tableX = X0;
  const tableTop = y(TOP + 30);
  const pctOf = (x: number, total: number) => `${fmt((100 * x) / total, 2)}%`;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={assignAt} level={-34} />
      <Sfx name="el-scratch" at={tenAt + 4} level={-32} />
      <Sfx name="el-pop" at={barelyAt} level={-32} />
      <Sfx name="el-pencil" at={countsAt} level={-34} />
      <Sfx name="el-pop" at={threeAt} level={-32} />
      <Sfx name="el-scratch" at={notAt + 6} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={out6} size={60}>
          What is the purpose of an A/B test?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} size={60}>
          What is a p-value, at an analyst&apos;s level?
        </QuestionCard>

        {/* ── Question 6: random assignment, one change, one metric ── */}
        <Note at={controlledAt - 2} x={X0} y={y(TOP) - h(24)} out={out6}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>a controlled experiment</span>
        </Note>
        <Svg opacity={ease(frame, asked - 4, 12) * (1 - ease(frame, out6, 10))}>
          <circle cx={userX} cy={forkY} r={26} fill={INK_SOFT} opacity={0.25} />
          <text x={userX} y={forkY + 58} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 21, fontWeight: 600, fill: INK_SOFT }}>
            users
          </text>
        </Svg>
        <Svg opacity={ease(frame, assignAt - 2, 12) * (1 - ease(frame, out6, 10))}>
          <text x={userX + 136} y={forkY + 7} textAnchor="start" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 600, fill: INK_SOFT }}>
            at random
          </text>
        </Svg>
        {arms.map((a) => (
          <React.Fragment key={a.name}>
            <ElbowArrow
              points={[
                [userX + 34, forkY],
                [userX + 120, forkY],
                [userX + 120, a.yy],
                [armX - 14, a.yy],
              ]}
              at={a.at - 4}
              color={a.color}
              width={2.6}
              out={out6}
            />
            <Note at={a.at} x={armX} y={a.yy - h(26)} out={out6}>
              <div
                style={{
                  padding: "8px 18px",
                  border: `2px solid ${a.color}`,
                  borderRadius: 10,
                  background: PAPER,
                  ...note(26, a.ink),
                  whiteSpace: "nowrap",
                }}
              >
                <b>{a.name}</b>, {a.what}
              </div>
            </Note>
          </React.Fragment>
        ))}
        <Note at={oneThingAt - 2} x={X0} y={y(TOP + 380)} out={out6}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>change one thing, compare one metric</span>
        </Note>
        <Note at={alikeAt - 2} x={X0} y={y(TOP + 430)} out={out6}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            random groups are alike
            <span style={{ opacity: ease(frame, neverAt - 2, 10) }}>, even on what you never measured</span>
          </span>
        </Note>
        <Note at={causationAt - 2} x={X0} y={y(TOP + 480)} out={out6}>
          <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>so a difference is the change: causation</span>
        </Note>
        <Note at={compareAt} x={armX} y={y(TOP + 330)} out={out6}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>same metric, both arms</span>
        </Note>

        {/* The page's chart: ten traits, users choosing against a coin. */}
        <Svg opacity={ease(frame, pickAt - 4, 12) * (1 - ease(frame, out6, 10))}>
          <line x1={lineX} x2={lineX} y1={rowY(0) - h(24)} y2={rowY(BALANCE.rows.length - 1) + h(22)} stroke={INK} strokeWidth={1.6} strokeDasharray="5 5" />
          <text x={lineX - 14} y={rowY(0) - h(30)} textAnchor="start" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 600, fill: INK_SOFT }}>
            {BALANCE.threshold}
            <tspan opacity={ease(frame, flagAt - 2, 10)}>: the usual flag</tspan>
          </text>
          <line x1={BAL.x0} x2={BAL.x1} y1={rowY(BALANCE.rows.length - 1) + h(26)} y2={rowY(BALANCE.rows.length - 1) + h(26)} stroke={INK} strokeWidth={1.4} />
          {[0, 0.5, 1].map((t) => (
            <text
              key={t}
              x={at(xs, t)}
              y={rowY(BALANCE.rows.length - 1) + h(52)}
              textAnchor="middle"
              style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}
            >
              {t}
            </text>
          ))}
          {BALANCE.rows.map((r, i) => {
            const pSel = ease(frame, tenAt - 4 + i * 2, 10);
            const pRand = ease(frame, coinAt + 2 + i * 2, 10);
            const fade = ease(frame, coinAt, 12) * 0.6;
            const over = r.key === overKey;
            return (
              <g key={r.key}>
                <circle cx={at(xs, r.selected)} cy={rowY(i)} r={9 * pSel} fill={ACCENT} opacity={1 - fade} />
                <circle cx={at(xs, r.randomised)} cy={rowY(i)} r={9 * pRand * (over ? 1 + 0.3 * ease(frame, barelyAt - 2, 10) : 1)} fill={A_COLOR} />
              </g>
            );
          })}
        </Svg>
        {BALANCE.rows.map((r, i) => (
          <Note key={r.key} at={pickAt + i} x={BAL.x0 - 16} y={rowY(i) - 15} align="right" out={out6}>
            <span style={{ ...label(19, r.unmeasured ? INK_SOFT : INK), fontStyle: r.unmeasured ? "italic" : "normal", whiteSpace: "nowrap" }}>
              {r.key}
              {r.unmeasured ? " (unmeasured)" : ""}
            </span>
          </Note>
        ))}
        <Note at={pickAt} x={BAL.x0} y={y(BAL.top) - h(40)} out={out6}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>gap between the arms, standardized</span>
        </Note>
        <Note at={tenAt + 10} x={BAL.x0} y={rowY(BALANCE.rows.length - 1) + h(70)} out={out6}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>
            ● users choose: {BALANCE.overSelected} of {BALANCE.rows.length} over 0.1
          </span>
        </Note>
        <Note at={coinAt + 6} x={BAL.x0} y={rowY(BALANCE.rows.length - 1) + h(104)} out={out6}>
          <span style={{ ...note(22, A_INK), whiteSpace: "nowrap" }}>
            ● a coin: only {overKey} over, at <Num>{fmt(BALANCE.overRandomised[0]?.[1] ?? 0, 3)}</Num>
          </span>
        </Note>

        {/* ── Question 7: the course's experiment, and a do-nothing world ── */}
        <Note at={countsAt - 4} x={tableX} y={tableTop}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>one test</span>
        </Note>
        {[
          { name: "A", x: EXPERIMENT.xA, n: EXPERIMENT.nA, ink: A_INK, at: countsAt },
          { name: "B", x: EXPERIMENT.xB, n: EXPERIMENT.nB, ink: B_INK, at: bAt },
        ].map((r, i) => (
          <Note key={r.name} at={r.at - 2} x={tableX} y={tableTop + h(50) + i * h(66)}>
            <span style={{ ...note(34, r.ink), whiteSpace: "nowrap", ...TABULAR }}>
              <b>{r.name}</b> {r.x.toLocaleString("en-US")} of {r.n.toLocaleString("en-US")}
              <span style={{ ...note(26, INK_SOFT) }}> = {pctOf(r.x, r.n)}</span>
            </span>
          </Note>
        ))}
        <Note at={extremeAt - 2} x={tableX} y={tableTop + h(200)} width={680}>
          <span style={{ ...note(25, INK) }}>
            <b>p-value</b>: how likely a result at least this extreme would be
            <span style={{ opacity: ease(frame, noDiffAt - 2, 10) }}> if there were really no difference</span>
          </span>
        </Note>
        <Note at={cutoffAt - 2} x={tableX} y={tableTop + h(278)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>
              <Num>{EXPERIMENT.p}</Num> &lt; <Num>{ERRORS.alpha}</Num>
            </b>
            , the usual cutoff
            <span style={{ opacity: ease(frame, realAt - 2, 10) }}>: treat the lift as real</span>
          </span>
        </Note>
        {/* The 5% a do-nothing change lands past ±1.96, drawn as the cutoff is named. */}
        <Svg opacity={tailP}>
          <path d={curvePath(zs, base, height, 0, crit, 4.4, true)} fill={MARK} />
          <path d={curvePath(zs, base, height, 0, -4, -crit, true)} fill={MARK} />
        </Svg>
        <Svg opacity={curveP}>
          <path d={curvePath(zs, base, height, 0, -4, 4.4)} fill="none" stroke={INK} strokeWidth={2.4} />
          <line x1={NULL.x0} x2={NULL.x1} y1={base} y2={base} stroke={INK} strokeWidth={1.4} />
          {[-3, 0, 3].map((t) => (
            <text key={t} x={at(zs, t)} y={base + 28} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, fill: INK_SOFT }}>
              {t === 0 ? "no difference" : t > 0 ? `+${t}` : `−${-t}`}
            </text>
          ))}
        </Svg>
        <Svg opacity={oursP}>
          <line x1={zx} x2={zx} y1={base - height * 0.55} y2={base} stroke={B_COLOR} strokeWidth={3.4} />
        </Svg>
        <Note at={nothingAt + 2} x={NULL.x0} y={base - height - h(46)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>gaps a do-nothing change would give, in standard errors</span>
        </Note>
        <Note at={seAt} x={zx - 16} width={320} y={base - height * 0.55 - h(70)} align="right">
          <span style={{ ...note(25, B_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            ours: <Num>{fmt(EXPERIMENT.z)}</Num>
          </span>
          <br />
          <span style={{ ...note(25, B_INK), whiteSpace: "nowrap" }}>standard errors out</span>
        </Note>
        {/* Under the axis: what the yellow is, and where p is. */}
        <Note at={cutoffAt + 4} x={NULL.x0} y={base + h(48)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            yellow: past ±<Num>{fmt(crit)}</Num>, where <Num>{Math.round(ERRORS.alpha * 100)}%</Num> of do-nothing gaps land
          </span>
        </Note>
        <Note at={threeAt - 2} x={NULL.x0} y={base + h(84)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b>
              p = <Num>{EXPERIMENT.p}</Num>
            </b>
            : the area past ±<Num>{fmt(EXPERIMENT.z)}</Num>, too thin to see
          </span>
        </Note>
        <Note at={notAt - 2} x={tableX} y={tableTop + h(336)}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Strike at={notAt + 6}>the chance there&apos;s no effect</Strike>
          </span>
        </Note>
        <Note at={sizeAt - 2} x={tableX} y={tableTop + h(382)}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Strike at={sizeAt + 8}>how big the effect is</Strike>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
