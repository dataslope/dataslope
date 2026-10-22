import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ERRORS, pct, POWER } from "./data";
import { Drift, Mark, OK, OK_INK, Svg, WARM, WARM_INK } from "./parts";

const LEFT = 150;
const RIGHT = 1200;
const BASE = 760;
const PEAK = 330;
const Z_LO = -3.6;
const Z_HI = 6.8;
const COL_X = 1290;

const density = (z: number, mu: number) => Math.exp(-0.5 * (z - mu) ** 2) / Math.sqrt(2 * Math.PI);

/**
 * Questions 4 and 5, on Data Analyst Part 7's design: a two-sided 5% test,
 * the null curve and an alternative placed for 80% power. The two errors are
 * areas either side of the threshold; power is the rest of the alternative.
 * Then the page's code (393 per arm for an effect of 0.2 SD) and one lever at
 * a time; doubling the users slides the alternative to the right.
 */
export const ErrorsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("errors").from;
  const qAt = n.word("errors", "Question");
  const textAt = n.word("errors", "What's the difference");
  const t1At = n.word("errors", "A Type one error is");
  const fpAt = n.word("errors", "declaring a winner");
  const alphaAt = n.word("errors", "Alpha caps its rate");
  const t2At = n.word("errors", "A Type two error is");
  const missAt = n.word("errors", "missing an effect");
  const betaAt = n.word("errors", "Its rate is beta");
  const firstAt = n.word("errors", "The first ships features");
  const secondAt = n.word("errors", "The second abandons");
  const q5At = n.word("power", "Question five");
  const q5TextAt = n.word("power", "What is statistical power");
  const oneMinusAt = n.word("power", "Power is one minus beta");
  const codeAt = n.word("power", "The page's code sizes a test");
  const eightyAt = n.word("power", "gives eighty percent");
  const doubleAt = n.word("power", "Double the users");
  const ninetyEightAt = n.word("power", "it's ninety-eight");
  const leverAts = [ninetyEightAt, n.word("power", "A bigger effect"), n.word("power", "less variance"), n.word("power", "a looser alpha")];
  const howManyAt = n.word("size-in", "how many users");
  const clearAt = n.beat("size-in").to - 6;

  const clear = 1 - ease(frame, clearAt, 10);
  const shift = ERRORS.shift + (ERRORS.shift * Math.SQRT2 - ERRORS.shift) * ease(frame, doubleAt + 2, 24);
  const xs = (z: number) => LEFT + ((z - Z_LO) / (Z_HI - Z_LO)) * (RIGHT - LEFT);
  const ys = (d: number) => y(BASE) - (d / density(0, 0)) * h(PEAK);
  const zs = Array.from({ length: 209 }, (_, i) => Z_LO + (i * (Z_HI - Z_LO)) / 208);
  const line = (mu: number) => zs.map((z, i) => `${i ? "L" : "M"}${xs(z).toFixed(1)},${ys(density(z, mu)).toFixed(1)}`).join(" ");
  const area = (mu: number, lo: number, hi: number) => {
    const pts = zs.filter((z) => z >= lo && z <= hi);
    if (pts.length < 2) return "";
    return `M${xs(pts[0])},${y(BASE)} ${pts.map((z) => `L${xs(z).toFixed(1)},${ys(density(z, mu)).toFixed(1)}`).join(" ")} L${xs(pts[pts.length - 1])},${y(BASE)} Z`;
  };

  const nullP = ease(frame, t1At - 4, 20);
  const critP = ease(frame, fpAt, 12);
  const alphaP = ease(frame, alphaAt - 2, 12);
  const altP = ease(frame, t2At - 2, 20);
  const betaP = ease(frame, betaAt - 4, 12);
  const powerP = ease(frame, oneMinusAt, 14);
  const crit = ERRORS.crit;

  const levers = [
    { text: `double the users, ${POWER.n} → ${POWER.levers[0].to}`, v: POWER.levers[0].power },
    { text: "a bigger effect, 0.2 → 0.3 SD", v: POWER.levers[1].power },
    { text: "less variance, SD × 0.8", v: POWER.levers[2].power },
    { text: "a looser alpha, 0.05 → 0.10", v: POWER.levers[3].power },
  ];

  return (
    <AbsoluteFill style={{ opacity: clear }}>
      <Sfx name="el-pencil" at={t1At} level={-36} />
      <Sfx name="el-scratch" at={alphaAt + 2} level={-36} />
      <Sfx name="el-scratch" at={betaAt + 2} level={-36} />
      <Sfx name="el-pop" at={oneMinusAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={doubleAt + 2} level={-36} />
      {leverAts.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-38} />
      ))}

      <Drift from={from} to={n.beat("size-in").to + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={q5At - 4} size={58}>
          What&apos;s the difference between a Type I and a Type II error?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={58}>
          What is statistical power, and what drives it?
        </QuestionCard>

        <Svg>
          <line x1={LEFT} x2={LEFT + (RIGHT - LEFT) * nullP} y1={y(BASE) + 0.5} y2={y(BASE) + 0.5} stroke={INK} strokeWidth={1.6} />
          {/* Type I: the null's two tails beyond the threshold. */}
          <g opacity={alphaP * 0.55}>
            <path d={area(0, crit, Z_HI)} fill={ACCENT} />
            <path d={area(0, Z_LO, -crit)} fill={ACCENT} />
          </g>
          {/* Type II, then power: the alternative either side of the threshold. */}
          <path d={area(shift, Z_LO, crit)} fill={WARM} opacity={betaP * 0.45} />
          <path d={area(shift, crit, Z_HI)} fill={OK} opacity={powerP * 0.4} />
          <path d={line(0)} fill="none" stroke={INK_SOFT} strokeWidth={3} pathLength={1} strokeDasharray={`${nullP} 1`} />
          <path d={line(shift)} fill="none" stroke={BAR} strokeWidth={3.4} pathLength={1} strokeDasharray={`${altP} 1`} />
          {[crit, -crit].map((c) => (
            <line
              key={c}
              x1={xs(c)}
              x2={xs(c)}
              y1={y(BASE)}
              y2={y(BASE) - (h(PEAK) + h(30)) * critP}
              stroke={INK}
              strokeWidth={2}
              strokeDasharray="5 6"
            />
          ))}
        </Svg>
        <Note at={t1At} x={xs(0) - 110} y={y(BASE) - h(PEAK) - h(44)} width={220} style={{ textAlign: "center" }}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>no effect</span>
        </Note>
        <Note at={t2At} x={xs(ERRORS.shift) - 110} y={y(BASE) - h(PEAK) - h(44)} width={220} style={{ textAlign: "center" }} out={doubleAt}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a real effect</span>
        </Note>
        <Note at={fpAt + 4} x={xs(crit) + 10} y={y(BASE) + h(14)}>
          <span style={{ ...label(20, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>threshold, z = {crit}</span>
        </Note>

        {/* The two errors, named. */}
        <Note at={fpAt - 2} x={COL_X} y={y(390)}>
          <span style={{ ...note(27, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Type I · a false positive</span>
        </Note>
        <Note at={alphaAt} x={COL_X} y={y(430)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", ...TABULAR }}>
            α = {pct(ERRORS.alpha)}<span style={{ opacity: ease(frame, firstAt, 10) }}>: ships features that do nothing</span>
          </span>
        </Note>
        <Note at={missAt - 2} x={COL_X} y={y(490)}>
          <span style={{ ...note(27, WARM_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Type II · a false negative</span>
        </Note>
        <Note at={betaAt} x={COL_X} y={y(530)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", ...TABULAR }}>
            β = {pct(ERRORS.beta)}<span style={{ opacity: ease(frame, secondAt, 10) }}>: abandons features that work</span>
          </span>
        </Note>

        {/* Power, and what moves it. */}
        <Note at={oneMinusAt} x={COL_X} y={y(596)}>
          <span style={{ ...note(28, OK_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>power = 1 − β = {pct(POWER.base)}</span>
        </Note>
        <Note at={codeAt} x={COL_X} y={y(644)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
            the page&apos;s code: effect 0.2 SD, <Mark at={howManyAt - 4}>{POWER.n} per arm</Mark>
            <span style={{ opacity: ease(frame, eightyAt, 10) }}> → {pct(POWER.base)}</span>
          </span>
        </Note>
        {levers.map((l, i) => (
          <Note key={l.text} at={leverAts[i] - 2} x={COL_X} y={y(696) + i * h(44)}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap", ...TABULAR }}>
              {l.text} <b style={{ color: OK_INK }}>→ {pct(l.v)}</b>
            </span>
          </Note>
        ))}
        <Note at={ninetyEightAt} x={xs(ERRORS.shift * Math.SQRT2) - 110} y={y(BASE) - h(PEAK) - h(44)} width={220} style={{ textAlign: "center" }}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>twice the users</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
