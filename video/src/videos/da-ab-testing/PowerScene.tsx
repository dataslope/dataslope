import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ERRORS, SAMPLE } from "./data";
import { A_COLOR, at, B_COLOR, B_INK, curvePath, Drift, Mark, OK, OK_INK, Phi, type Scale, Svg, WARM, WARM_INK, X0 } from "./parts";

const TOP = 330;
/** Question 10's bars: users per arm for each lift. */
const BARS = { x0: X0 + 260, max: 1000, y: 620, pitch: 92 };
/** Questions 11 and 12: the null and the alternative, and power against n. */
const CURVES = { x0: 140, x1: 1000, base: 790, height: 330 };
const POWER = { x0: 1170, x1: 1760, base: 790, top: 430 };

const count = (v: number) => Math.round(v).toLocaleString("en-US");

/**
 * Questions 10, 11 and 12. The course's sample sizes, 3,841 users per arm to
 * catch 10% rising to 12% and 14,751 to catch 11%, drawn to scale; then the
 * two curves every power calculation is about: what a test sees with no
 * effect and with one placed for 80% power, alpha the null's tail past 1.96,
 * beta the alternative's share short of it, power the rest; the line moved
 * one way and the other; and power against users for three lifts.
 */
export const PowerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("power").from;
  const qAt = n.word("power", "Question ten");
  const textAt = n.word("power", "Why does sample size matter");
  // The question is long, so each half is lit as it is asked.
  const sizeAt = n.word("power", "sample size matter");
  const askedMdeAt = n.word("power", "minimum detectable effect");
  const answerAt = n.beat("power-mde").from;
  const shrinkAt = n.word("power-mde", "Bigger samples shrink");
  const mdeAt = n.word("power-mde", "the minimum detectable effect");
  const pickAt = n.word("power-mde", "Pick it before launch");
  const followsAt = n.word("power-mde", "the sample size follows");
  const twelveAt = n.word("power-n", "rising to twelve");
  const nAt = n.word("power-n", "three thousand eight hundred forty-one");
  const halveAt = n.word("power-n", "Halve the lift");
  const fourteenAt = n.word("power-n", "fourteen thousand seven hundred fifty-one");
  const fourAt = n.word("power-n", "nearly four times");
  const q11At = n.word("errors", "Question eleven");
  const q11TextAt = n.word("errors", "What are Type one");
  const falsePosAt = n.word("errors", "a false positive");
  const alphaAt = n.word("errors", "Its rate is alpha");
  const falseNegAt = n.word("errors", "a false negative");
  const betaAt = n.word("errors", "Its rate is beta");
  const q12At = n.word("power-def", "Question twelve");
  const q12TextAt = n.word("power-def", "What is statistical power");
  const minusAt = n.word("power-def", "one minus beta");
  const eightyAt = n.word("power-def", "Eighty percent");
  const risesAt = n.word("power-def", "Power rises");
  const moveAt = n.word("power-def", "Moving the line");
  const onlyAt = n.word("power-def", "Only more data");
  const end = n.beat("peek-in").to;
  const out10 = q11At - 4;

  // ── Question 10 ──
  const sizes = [
    { label: "10% → 12%", users: SAMPLE.twelve, at: twelveAt, numAt: nAt, color: A_COLOR },
    { label: "10% → 11%", users: SAMPLE.eleven, at: halveAt, numAt: fourteenAt, color: B_COLOR },
  ];
  const unit = BARS.max / SAMPLE.eleven;

  // ── Questions 11 and 12: the line moves, then comes back ──
  const zs: Scale = { lo: -3.5, hi: ERRORS.shift + 3.5, a: CURVES.x0, b: CURVES.x1 };
  const base = y(CURVES.base);
  const height = h(CURVES.height);
  const wobble = ease(frame, moveAt, 22) - ease(frame, moveAt + 30, 22) - 0.8 * (ease(frame, moveAt + 60, 22) - ease(frame, moveAt + 90, 22));
  const crit = ERRORS.crit + 0.6 * wobble;
  // Two-sided: alpha is both of the null's tails past the line.
  const alphaNow = 2 * (1 - Phi(crit));
  const betaNow = Phi(crit - ERRORS.shift);
  const curvesP = ease(frame, q11At + 6, 16);
  const alphaP = ease(frame, alphaAt - 4, 12);
  const betaP = ease(frame, betaAt - 4, 12);
  const powerP = ease(frame, minusAt - 2, 12);

  // Power against users per arm, three lifts from 10%.
  const lx: Scale = { lo: 2, hi: Math.log10(60000), a: POWER.x0, b: POWER.x1 };
  const pys: Scale = { lo: 0, hi: 1, a: y(POWER.base), b: y(POWER.top) };
  const inks = [ds("blue", 300), A_COLOR, ds("blue", 800)];
  const powerPanelP = ease(frame, risesAt - 4, 14);
  const pathOf = (rows: readonly (readonly [number, number])[]) =>
    rows.map(([nn, p], i) => `${i ? "L" : "M"}${at(lx, Math.log10(nn)).toFixed(1)},${at(pys, p).toFixed(1)}`).join(" ");

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={mdeAt} level={-34} />
      <Sfx name="el-tap" at={nAt} level={-34} />
      <Sfx name="el-pop" at={fourAt} level={-32} />
      <Sfx name="el-scratch" at={alphaAt} level={-34} />
      <Sfx name="el-scratch" at={betaAt} level={-34} />
      <Sfx name="el-pop" at={eightyAt} level={-32} />
      <Sfx name="el-whoosh" at={moveAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} out={out10} size={60}>
          Why does{" "}
          <Mark at={sizeAt} out={answerAt}>
            sample size
          </Mark>{" "}
          matter, and what is a{" "}
          <Mark at={askedMdeAt} out={answerAt}>
            minimum detectable effect
          </Mark>
          ?
        </QuestionCard>
        <QuestionCard n={11} at={q11At} textAt={q11TextAt - 2} out={q12At - 4} size={60}>
          What are Type I and Type II errors?
        </QuestionCard>
        <QuestionCard n={12} at={q12At} textAt={q12TextAt - 2} size={60}>
          What is statistical power?
        </QuestionCard>

        {/* ── Question 10 ── */}
        <Note at={shrinkAt - 2} x={X0} y={y(TOP)} out={out10}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>more users, a smaller standard error, smaller effects detectable</span>
        </Note>
        <Note at={mdeAt - 4} x={X0} y={y(TOP + 56)} out={out10}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b>MDE</b>, minimum detectable effect: the smallest lift you want to catch
          </span>
        </Note>
        <Note at={pickAt - 2} x={X0} y={y(TOP + 112)} out={out10}>
          <span style={{ ...note(27, INK_SOFT), whiteSpace: "nowrap" }}>
            set it before launch, with power and significance
            <span style={{ opacity: ease(frame, followsAt - 2, 10), color: INK }}>, and the sample size follows</span>
          </span>
        </Note>
        <Note at={twelveAt - 6} x={X0} y={y(BARS.y) - h(64)} out={out10}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>users in each arm, 80% power, 5% significance</span>
        </Note>
        {sizes.map((s, i) => {
          const p = ease(frame, s.at, 20);
          const top = y(BARS.y) + i * h(BARS.pitch);
          return (
            <React.Fragment key={s.label}>
              <div style={{ position: "absolute", left: X0, top: top + 4, ...label(24, INK), whiteSpace: "nowrap", opacity: ease(frame, s.at - 4, 10) * (1 - ease(frame, out10, 10)), ...TABULAR }}>
                {s.label}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: BARS.x0,
                  top,
                  width: s.users * unit * p,
                  height: h(44),
                  background: s.color,
                  borderRadius: 3,
                  opacity: 1 - ease(frame, out10, 10),
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: BARS.x0 + s.users * unit * p + 16,
                  top: top + 6,
                  ...note(28, i ? B_INK : BLUE_INK),
                  fontWeight: 650,
                  whiteSpace: "nowrap",
                  opacity: ease(frame, s.numAt - 2, 10) * (1 - ease(frame, out10, 10)),
                  ...TABULAR,
                }}
              >
                {count(s.users)}
              </div>
            </React.Fragment>
          );
        })}
        <Note at={fourAt - 2} x={BARS.x0} y={y(BARS.y) + 2 * h(BARS.pitch) + h(4)} out={out10}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>half the lift, {fmt(SAMPLE.ratio)} times the users</span>
        </Note>

        {/* ── Questions 11 and 12: no effect, and an effect placed for 80% power ── */}
        <Svg opacity={curvesP}>
          {/* Fills first, alpha's tails over the power they sit inside, then the outlines. */}
          <path d={curvePath(zs, base, height, ERRORS.shift, zs.lo, crit, true)} fill={WARM} opacity={0.6 * betaP} />
          <path d={curvePath(zs, base, height, ERRORS.shift, crit, zs.hi, true)} fill={OK} opacity={0.45 * powerP} />
          <path d={curvePath(zs, base, height, 0, crit, zs.hi, true)} fill={ACCENT} opacity={0.85 * alphaP} />
          <path d={curvePath(zs, base, height, 0, zs.lo, -crit, true)} fill={ACCENT} opacity={0.85 * alphaP} />
          <path d={curvePath(zs, base, height, 0, zs.lo, zs.hi)} fill="none" stroke={INK_SOFT} strokeWidth={2.4} />
          <path d={curvePath(zs, base, height, ERRORS.shift, zs.lo, zs.hi)} fill="none" stroke={B_COLOR} strokeWidth={2.8} />
          <line x1={CURVES.x0} x2={CURVES.x1} y1={base} y2={base} stroke={INK} strokeWidth={1.4} />
          <line x1={at(zs, crit)} x2={at(zs, crit)} y1={base - height - 14} y2={base} stroke={INK} strokeWidth={2} strokeDasharray="6 5" />
          <text x={at(zs, 0)} y={base + 28} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 600, fill: INK_SOFT }}>
            no effect
          </text>
          <text x={at(zs, ERRORS.shift)} y={base + 28} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 600, fill: B_INK }}>
            a real effect
          </text>
          <text x={at(zs, crit)} y={base - height - 24} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, fill: INK_SOFT }}>
            declare a winner past here
          </text>
        </Svg>
        <Note at={falsePosAt - 2} x={X0} y={y(TOP)} out={q12At - 4}>
          <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap" }}>
            <b>Type I</b>: a false positive, a winner with no effect
            <span style={{ opacity: ease(frame, alphaAt - 2, 10), ...TABULAR }}> (α = {Math.round(ERRORS.alpha * 100)}%)</span>
          </span>
        </Note>
        <Note at={falseNegAt - 2} x={X0} y={y(TOP + 48)} out={q12At - 4}>
          <span style={{ ...note(26, WARM_INK), whiteSpace: "nowrap" }}>
            <b>Type II</b>: a false negative, a real effect missed
            <span style={{ opacity: ease(frame, betaAt - 2, 10), ...TABULAR }}> (β = {Math.round(ERRORS.beta * 100)}%)</span>
          </span>
        </Note>
        <Note at={alphaAt + 4} x={at(zs, ERRORS.crit) + 30} y={base - h(70)}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>α {fmt(alphaNow * 100, 1)}%</span>
        </Note>
        <Note at={betaAt + 4} x={at(zs, ERRORS.crit) - 14} y={base - h(34)} align="right">
          <span style={{ ...label(20, WARM_INK), whiteSpace: "nowrap", ...TABULAR }}>β {fmt(betaNow * 100, 1)}%</span>
        </Note>
        <Note at={minusAt - 2} x={X0} y={y(TOP)}>
          <span style={{ ...note(27, OK_INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b>power</b> = 1 − β: the chance of catching a real effect
            <span style={{ opacity: ease(frame, eightyAt - 2, 10) }}>, usually {Math.round(ERRORS.power * 100)}%</span>
          </span>
        </Note>
        <Note at={moveAt + 4} x={X0} y={y(TOP + 48)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>moving the line trades one error for the other</span>
        </Note>
        <Note at={onlyAt - 2} x={X0} y={y(TOP + 92)}>
          <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>only more data shrinks both</span>
        </Note>

        {/* Power against users per arm, for three lifts. */}
        <Svg opacity={powerPanelP}>
          <line x1={POWER.x0} x2={POWER.x1} y1={y(POWER.base)} y2={y(POWER.base)} stroke={INK} strokeWidth={1.4} />
          <line x1={POWER.x0} x2={POWER.x1} y1={at(pys, ERRORS.power)} y2={at(pys, ERRORS.power)} stroke={OK} strokeWidth={1.6} strokeDasharray="6 6" />
          <text x={POWER.x0 - 12} y={at(pys, ERRORS.power) + 6} textAnchor="end" style={{ fontFamily: SANS, fontSize: 18, fontWeight: 600, fill: OK_INK }}>
            80%
          </text>
          {[100, 1000, 10000].map((t) => (
            <text key={t} x={at(lx, Math.log10(t))} y={y(POWER.base) + 26} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 18, fontWeight: 500, fill: INK_SOFT }}>
              {t.toLocaleString("en-US")}
            </text>
          ))}
          <text x={POWER.x1} y={y(POWER.base) + 54} textAnchor="end" style={{ fontFamily: SANS, fontSize: 18, fontWeight: 650, fill: INK_SOFT }}>
            users per arm (log scale)
          </text>
          <text x={POWER.x0} y={y(POWER.top) - 16} style={{ fontFamily: SANS, fontSize: 18, fontWeight: 650, fill: INK_SOFT }}>
            power
          </text>
          {SAMPLE.curves.map((c, i) => (
            <path key={c.to} d={pathOf(c.rows)} fill="none" stroke={inks[i]} strokeWidth={3} pathLength={1} strokeDasharray={`${ease(frame, risesAt + i * 6, 24)} 1`} />
          ))}
        </Svg>
        {SAMPLE.curves.map((c, i) => {
          const mid = c.rows.find(([, p]) => p >= 0.5) ?? c.rows[0];
          return (
            <Note key={c.to} at={risesAt + 10 + i * 6} x={at(lx, Math.log10(mid[0])) - 12} width={140} y={at(pys, 0.5) - h(14)} align="right">
              <span style={{ ...label(18, inks[i] === A_COLOR ? BLUE_INK : INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>→ {Math.round(c.to * 100)}%</span>
            </Note>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
