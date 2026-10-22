import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COVERAGE, EXPERIMENT, PRACTICAL } from "./data";
import { A_COLOR, at, B_COLOR, B_INK, Drift, OK, OK_INK, type Scale, Svg, X0 } from "./parts";

const TOP = 330;
/** Question 8's chart: the p-value against the group size, on a log axis. */
const P = { x0: 300, x1: 1500, base: 820, top: 440 };
/** Question 9: the lift and its interval, then a hundred intervals. */
const LIFT = { x0: X0 + 40, x1: X0 + 760, y: 560 };
const COV = { x0: 1060, x1: 1760, top: 380, rows: 100, pitch: 4.2 };

/** A p-value as a person would read it out. */
const pText = (p: number) => (p >= 0.01 ? fmt(p, p >= 0.1 ? 2 : 3) : p >= 1e-4 ? p.toFixed(4) : "≈ 0");

/**
 * Questions 8 and 9. One small effect (d = 0.2) at eight group sizes: p
 * falls from 0.65 at 10 to 0.046 at 200, under the line, and to
 * essentially zero at 2,000, the effect never changing. Then the course's
 * lift of 2.05 points with its interval, 0.95 to 3.15, as estimate plus or
 * minus 1.96 standard errors, and a hundred intervals around a known truth,
 * four of which miss.
 */
export const SignifScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("signif").from;
  const qAt = n.word("signif", "Question eight");
  const textAt = n.word("signif", "What's the difference");
  const statAt = n.word("signif", "Statistical means");
  const pracAt = n.word("signif", "Practical means");
  const holdAt = n.word("signif-n", "Hold one small effect fixed");
  const tenAt = n.word("signif-n", "At ten users per group");
  const twoHundredAt = n.word("signif-n", "At two hundred");
  const twoThousandAt = n.word("signif-n", "At two thousand");
  const neverAt = n.word("signif-n", "The effect never changed");
  const reportAt = n.word("signif-n", "report the effect size");
  const q9At = n.word("ci", "Question nine");
  const q9TextAt = n.word("ci", "How would you explain");
  const rangeAt = n.word("ci", "Give a range");
  const twoAt = n.word("ci", "about two points");
  const betweenAt = n.word("ci", "between one and three");
  const plusAt = n.word("ci-margin", "plus or minus");
  const ninetyFiveAt = n.word("ci-margin", "Ninety-five percent means");
  const fourAt = n.word("ci-margin", "four miss");
  const wideAt = n.word("ci-margin", "a wide interval");
  const end = n.beat("power-in").to;
  const out8 = q9At - 4;

  // ── Question 8 ──
  const sizes = PRACTICAL.rows.map(([size]) => size);
  const lx: Scale = { lo: Math.log10(sizes[0]), hi: Math.log10(sizes[sizes.length - 1]), a: P.x0, b: P.x1 };
  const py: Scale = { lo: 0, hi: 0.7, a: y(P.base), b: y(P.top) };
  const px = (size: number) => at(lx, Math.log10(size));
  const ppy = (p: number) => at(py, p);
  const alphaY = ppy(0.05);
  const growFrom = tenAt;
  const growTo = twoThousandAt + 10;
  const shown = (i: number) => ease(frame, growFrom + ((growTo - growFrom) * i) / (sizes.length - 1), 10);
  const callouts = [
    { size: 10, at: tenAt, color: INK },
    { size: PRACTICAL.cross, at: twoHundredAt, color: OK_INK },
    { size: 2000, at: twoThousandAt, color: OK_INK },
  ];

  // ── Question 9 ──
  const ls: Scale = { lo: 0, hi: 4, a: LIFT.x0, b: LIFT.x1 };
  const liftY = y(LIFT.y);
  const ciP = ease(frame, betweenAt - 2, 16);
  const cx: Scale = { lo: 40, hi: 60, a: COV.x0, b: COV.x1 };
  const covRowY = (i: number) => y(COV.top) + h(30) + i * h(COV.pitch);
  const missed = COVERAGE.intervals.map(([lo, hi]) => lo > COVERAGE.truth || hi < COVERAGE.truth);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={tenAt} level={-34} />
      <Sfx name="el-tap" at={twoHundredAt} level={-34} />
      <Sfx name="el-pop" at={twoThousandAt + 4} level={-32} />
      <Sfx name="el-pencil" at={betweenAt} level={-34} />
      <Sfx name="el-sprinkle" at={ninetyFiveAt} level={-34} />
      <Sfx name="el-scratch" at={fourAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} out={out8} size={60}>
          What&apos;s the difference between statistical and practical significance?
        </QuestionCard>
        <QuestionCard n={9} at={q9At} textAt={q9TextAt - 2} size={60}>
          How would you explain a confidence interval to a stakeholder?
        </QuestionCard>

        {/* ── Question 8: the same effect, more and more users ── */}
        <Note at={statAt - 2} x={X0} y={y(TOP - 20)} out={out8}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>statistical</b>: unlikely to be noise
          </span>
        </Note>
        <Note at={pracAt - 2} x={X0 + 560} y={y(TOP - 20)} out={out8}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>practical</b>: big enough to matter
          </span>
        </Note>
        <Svg opacity={ease(frame, holdAt - 4, 12) * (1 - ease(frame, out8, 10))}>
          <line x1={P.x0} x2={P.x1} y1={y(P.base)} y2={y(P.base)} stroke={INK} strokeWidth={1.6} />
          <line x1={P.x0} x2={P.x1} y1={alphaY} y2={alphaY} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="6 6" />
          <text x={P.x1 + 14} y={alphaY + 7} style={{ fontFamily: SANS, fontSize: 19, fontWeight: 600, fill: ACCENT_INK }}>
            0.05
          </text>
          {[0, 0.2, 0.4, 0.6].map((t) => (
            <text key={t} x={P.x0 - 14} y={ppy(t) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, fill: INK_SOFT }}>
              {t === 0 ? "0" : t.toFixed(1)}
            </text>
          ))}
          {sizes.map((s) => (
            <text key={s} x={px(s)} y={y(P.base) + 30} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, fill: INK_SOFT }}>
              {s.toLocaleString("en-US")}
            </text>
          ))}
          <text x={P.x1} y={y(P.base) + 60} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
            users per group (log scale)
          </text>
          <text x={P.x0 - 14} y={y(P.top) - 20} textAnchor="start" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
            p-value
          </text>
          {PRACTICAL.rows.map(([s, p], i) => (
            <circle key={s} cx={px(s)} cy={ppy(p)} r={10 * shown(i)} fill={p < 0.05 ? OK : A_COLOR} />
          ))}
        </Svg>
        {callouts.map((c) => {
          const p = PRACTICAL.rows.find(([s]) => s === c.size)?.[1] ?? 0;
          return (
            <Note key={c.size} at={c.at + 4} x={px(c.size) - 100} width={200} y={ppy(p) - h(52)} out={out8} from="up" style={{ textAlign: "center" }}>
              <span style={{ ...note(24, c.color), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>p {pText(p)}</span>
            </Note>
          );
        })}
        <Note at={holdAt + 4} x={P.x0 + 520} y={y(P.top) - h(10)} out={out8}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>the same small effect at every size</span>
        </Note>
        <Note at={neverAt - 2} x={P.x0 + 520} y={y(P.top) + h(36)} out={out8}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>only the sample grew</span>
        </Note>
        <Note at={reportAt - 2} x={P.x0 + 520} y={y(P.top) + h(82)} out={out8}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>report the effect and its range, not just p</span>
        </Note>

        {/* ── Question 9: a range a stakeholder can use ── */}
        <Note at={rangeAt - 2} x={X0} y={y(TOP)} width={860}>
          <span style={{ ...note(28, INK) }}>
            &ldquo;The new version lifts conversion by <b style={{ color: B_INK }}>about {Math.round(EXPERIMENT.lift[0])} points</b>
            <span style={{ opacity: ease(frame, betweenAt - 2, 10) }}>
              . We&apos;re confident the true lift is between {Math.round(EXPERIMENT.ci[0])} and {Math.round(EXPERIMENT.ci[1])}.
            </span>
            &rdquo;
          </span>
        </Note>
        <Svg opacity={ease(frame, twoAt - 2, 12)}>
          <line x1={LIFT.x0} x2={LIFT.x1} y1={liftY + 40} y2={liftY + 40} stroke={INK} strokeWidth={1.4} />
          {[0, 1, 2, 3, 4].map((t) => (
            <g key={t}>
              <line x1={at(ls, t)} x2={at(ls, t)} y1={liftY + 40} y2={liftY + 47} stroke={INK} strokeWidth={1.2} />
              <text x={at(ls, t)} y={liftY + 72} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 500, fill: INK_SOFT }}>
                {t === 0 ? "0" : `+${t}`}
              </text>
            </g>
          ))}
          <text x={LIFT.x1} y={liftY + 100} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
            lift in conversion, percentage points
          </text>
          <line
            x1={at(ls, EXPERIMENT.ci[0])}
            x2={at(ls, EXPERIMENT.ci[0]) + (at(ls, EXPERIMENT.ci[1]) - at(ls, EXPERIMENT.ci[0])) * ciP}
            y1={liftY}
            y2={liftY}
            stroke={B_COLOR}
            strokeWidth={12}
            strokeLinecap="round"
            opacity={0.45}
          />
          <circle cx={at(ls, EXPERIMENT.lift[0])} cy={liftY} r={13} fill={B_COLOR} />
        </Svg>
        <Note at={betweenAt + 6} x={at(ls, EXPERIMENT.ci[0]) - 40} y={liftY - h(56)}>
          <span style={{ ...label(20, B_INK), whiteSpace: "nowrap", ...TABULAR }}>
            {fmt(EXPERIMENT.ci[0])} to {fmt(EXPERIMENT.ci[1])}, around {fmt(EXPERIMENT.lift[0])}
          </span>
        </Note>
        <Note at={plusAt - 4} x={X0} y={liftY + h(130)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>
            estimate ± 1.96 standard errors: {fmt(EXPERIMENT.lift[0])} ± {fmt(EXPERIMENT.zc)} × {fmt(EXPERIMENT.se)}
          </span>
        </Note>
        <Note at={wideAt - 2} x={X0} y={liftY + h(180)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>a wide interval: we need more data</span>
        </Note>

        {/* A hundred 95% intervals around a known truth. */}
        <Svg opacity={ease(frame, ninetyFiveAt - 4, 12)}>
          <line x1={at(cx, COVERAGE.truth)} x2={at(cx, COVERAGE.truth)} y1={covRowY(0) - 10} y2={covRowY(COV.rows - 1) + 10} stroke={INK} strokeWidth={1.6} strokeDasharray="5 5" />
          {COVERAGE.intervals.map(([lo, hi], i) => {
            const p = ease(frame, ninetyFiveAt + i * 0.5, 6);
            if (p <= 0) return null;
            const miss = missed[i];
            const red = miss ? ease(frame, fourAt - 2, 10) : 0;
            return (
              <line
                key={i}
                x1={at(cx, lo)}
                x2={at(cx, lo) + (at(cx, hi) - at(cx, lo)) * p}
                y1={covRowY(i)}
                y2={covRowY(i)}
                stroke={red > 0 ? ACCENT : A_COLOR}
                strokeWidth={miss ? 2.6 + red : 2}
                opacity={miss ? 0.6 + 0.4 * red : 0.55}
              />
            );
          })}
        </Svg>
        <Note at={ninetyFiveAt} x={COV.x0} y={y(COV.top) - h(16)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>100 runs, each with its 95% interval; dashed: the truth</span>
        </Note>
        <Note at={fourAt} x={COV.x0} y={covRowY(COV.rows - 1) + h(20)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            {COVERAGE.missed} miss
            <span style={{ ...note(24, BLUE_INK), fontWeight: 500 }}>, {COVERAGE.intervals.length - COVERAGE.missed} contain it</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
