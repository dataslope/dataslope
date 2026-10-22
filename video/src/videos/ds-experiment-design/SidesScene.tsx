import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NONINF, pct, SIDES } from "./data";
import { Axes, Drift, Fade, Mark, MARK_OK, OK, OK_INK, type Scale, at, Svg } from "./parts";

const PANELS = [
  { left: 150, two: true },
  { left: 1010, two: false },
];
const PANEL_W = 700;
const BASE = 620;
const PEAK = 230;
const Z = 4;

const density = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
/** A difference in points, signed and to two places. */
const signed = (v: number) => (v < 0 ? `−${(-v).toFixed(2)}` : `+${v.toFixed(2)}`);

/** One null curve with its rejection region shaded: both tails, or one. */
const NullPanel: React.FC<{ left: number; two: boolean; at: number; tailAt: number }> = ({ left, two, at: from, tailAt }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, from, 18);
  const t = ease(frame, tailAt, 12);
  if (p <= 0) return null;
  const xs = (z: number) => left + ((z + Z) / (2 * Z)) * PANEL_W;
  const ys = (d: number) => y(BASE) - (d / density(0)) * h(PEAK);
  const zs = Array.from({ length: 161 }, (_, i) => -Z + (i * 2 * Z) / 160);
  const line = zs.map((z, i) => `${i ? "L" : "M"}${xs(z).toFixed(1)},${ys(density(z)).toFixed(1)}`).join(" ");
  const tail = (lo: number, hi: number) => {
    const pts = zs.filter((z) => z >= lo && z <= hi);
    return `M${xs(pts[0])},${y(BASE)} ${pts.map((z) => `L${xs(z).toFixed(1)},${ys(density(z)).toFixed(1)}`).join(" ")} L${xs(pts[pts.length - 1])},${y(BASE)} Z`;
  };
  const crit = two ? SIDES.z2 : SIDES.z1;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <line x1={left} x2={left + PANEL_W * p} y1={y(BASE) + 0.5} y2={y(BASE) + 0.5} stroke={INK} strokeWidth={1.6} />
      <g opacity={t * 0.6}>
        <path d={tail(crit, Z)} fill={ACCENT} />
        {two ? <path d={tail(-Z, -crit)} fill={ACCENT} /> : null}
      </g>
      <path d={line} fill="none" stroke={INK_SOFT} strokeWidth={3} pathLength={1} strokeDasharray={`${p} 1`} />
      {(two ? [crit, -crit] : [crit]).map((c) => (
        <g key={c} opacity={t}>
          <line x1={xs(c)} x2={xs(c)} y1={y(BASE)} y2={y(BASE) - h(PEAK) * 0.7} stroke={INK} strokeWidth={2} strokeDasharray="5 6" />
          <text x={xs(c)} y={y(BASE) + 30} textAnchor="middle" style={{ ...label(20, INK), fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
            {c > 0 ? c : `−${-c}`}
          </text>
        </g>
      ))}
    </svg>
  );
};

/**
 * Questions 7 and 8. The same null curve twice: 2.5% in each tail at ±1.96,
 * and all 5% on one side at 1.645, with the power and the regressions each
 * catches on Part 7's design. Then non-inferiority: a cheaper checkout as
 * good as the old one, its interval at 60,000 and at 6,000 per arm against a
 * margin of half a point.
 */
export const SidesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("sides").from;
  const qAt = n.word("sides", "Question");
  const textAt = n.word("sides", "What's the difference");
  const twoAt = n.word("sides", "A two-sided test looks");
  const eachAt = n.word("sides", "two and a half percent in each tail");
  const oneAt = n.word("sides", "A one-sided test puts");
  const allAt = n.word("sides", "all five percent");
  const powerAt = n.word("sides", "power rises from eighty percent");
  const eightyEightAt = n.word("sides", "to eighty-eight");
  const regressionAt = n.word("sides", "a regression the same size");
  const neverAt = n.word("sides", "is never flagged");
  const usuallyAt = n.word("sides", "usually two-sided");
  const q8At = n.word("noninf", "Question eight");
  const q8TextAt = n.word("noninf", "What is a non-inferiority test");
  const marginAt = n.word("noninf", "a margin set in advance");
  const checkoutAt = n.word("noninf", "Say a cheaper checkout");
  const halfAt = n.word("noninf", "at most half a point");
  const bigRunsAt = n.word("noninf", "runs from minus point two nine");
  const clearOfAt = n.word("noninf", "clear of the margin");
  const smallAt = n.word("noninf", "At six thousand");
  const pastAt = n.word("noninf", "reaches past minus one");
  const notWorseAt = n.word("noninf", "Not significant isn't the same");
  const liveAt = n.word("peek-in", "the test goes live");
  const clearAt = n.beat("peek-in").to - 6;

  const clear = 1 - ease(frame, clearAt, 10);
  const q7Out = q8At - 2;

  // ── Question 8's interval plot ──
  const xs: Scale = { lo: -1.5, hi: 1.5, a: 330, b: 1530 };
  const ys: Scale = { lo: 0, hi: 1, a: y(760), b: y(380) };
  const intervals = [
    { iv: NONINF.big, drawAt: bigRunsAt, top: 490, color: OK, ink: OK_INK, verdict: "clear of the margin", verdictAt: clearOfAt },
    { iv: NONINF.small, drawAt: smallAt + 2, top: 620, color: INK_SOFT, ink: ACCENT_INK, verdict: "contains 0, but reaches past −1", verdictAt: pastAt },
  ];

  return (
    <AbsoluteFill style={{ opacity: clear }}>
      <Sfx name="el-pencil" at={twoAt} level={-36} />
      <Sfx name="el-pencil" at={oneAt} level={-36} />
      <Sfx name="el-pop" at={eightyEightAt} level={-34} />
      <Sfx name="el-scratch" at={neverAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={q8At} level={-38} />
      <Sfx name="el-pop" at={clearOfAt} level={-32} />
      <Sfx name="el-scratch" at={pastAt + 2} level={-34} />

      <Drift from={from} to={n.beat("peek-in").to + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={q7Out} size={56}>
          What&apos;s the difference between a one-sided and a two-sided test?
        </QuestionCard>
        <QuestionCard n={8} at={q8At} textAt={q8TextAt - 2} size={56}>
          What is a non-inferiority test?
        </QuestionCard>

        {/* ── Question 7: one null, two ways to spend 5% ── */}
        <Fade from={twoAt - 6} out={q7Out}>
          {PANELS.map((pl) => (
            <NullPanel key={pl.left} left={pl.left} two={pl.two} at={pl.two ? twoAt : oneAt} tailAt={pl.two ? eachAt : allAt} />
          ))}
          <Note at={twoAt} x={PANELS[0].left} y={y(320)}>
            <span style={{ ...note(28, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              <Mark at={usuallyAt} color={MARK_OK}>
                two-sided
              </Mark>
              <span style={{ ...note(24, INK_SOFT), fontWeight: 500, opacity: ease(frame, eachAt, 10) }}>: 2.5% in each tail</span>
            </span>
          </Note>
          <Note at={oneAt} x={PANELS[1].left} y={y(320)}>
            <span style={{ ...note(28, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              one-sided<span style={{ ...note(24, INK_SOFT), fontWeight: 500, opacity: ease(frame, allAt, 10) }}>: all 5% on the predicted side</span>
            </span>
          </Note>
          {[
            { left: PANELS[0].left, power: SIDES.twoPower, powerAt, caught: SIDES.twoCatches, ok: true },
            { left: PANELS[1].left, power: SIDES.onePower, powerAt: eightyEightAt, caught: SIDES.oneCatches, ok: false },
          ].map((r) => (
            <React.Fragment key={r.left}>
              <Note at={r.powerAt} x={r.left} y={y(686)}>
                <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>power {pct(r.power)}</span>
              </Note>
              <Note at={r.ok ? regressionAt : neverAt - 2} x={r.left} y={y(734)}>
                <span style={{ ...note(26, r.ok ? INK : ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
                  a regression the same size: caught {pct(r.caught)}
                </span>
              </Note>
            </React.Fragment>
          ))}
          <Note at={usuallyAt - 2} x={PANELS[0].left} y={y(800)}>
            <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>features can hurt: product tests are usually two-sided</span>
          </Note>
        </Fade>

        {/* ── Question 8: an interval against a margin ── */}
        <Note at={checkoutAt} x={330} y={y(300)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            a cheaper checkout may cost <b style={{ opacity: ease(frame, halfAt - 2, 10) }}>at most half a point</b> of conversion
          </span>
        </Note>
        <Axes
          x={xs}
          y={ys}
          xTicks={[-1.5, -1, -0.5, 0, 0.5, 1, 1.5]}
          xFormat={(v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0")}
          xTitle="difference, new − old, in points"
          at={marginAt - 4}
        />
        <Svg opacity={ease(frame, marginAt, 12)}>
          <line x1={at(xs, 0)} x2={at(xs, 0)} y1={y(400)} y2={y(760)} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="3 6" />
        </Svg>
        <Svg opacity={ease(frame, halfAt, 12)}>
          <rect x={xs.a} y={y(400)} width={at(xs, -NONINF.margin) - xs.a} height={y(760) - y(400)} fill={ACCENT} opacity={0.08} />
          <line x1={at(xs, -NONINF.margin)} x2={at(xs, -NONINF.margin)} y1={y(400)} y2={y(760)} stroke={ACCENT} strokeWidth={2.6} strokeDasharray="7 6" />
        </Svg>
        <Note at={halfAt + 4} x={at(xs, -NONINF.margin) - 300} y={y(404)} width={290} align="right">
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>margin −{NONINF.margin}: worse than this</span>
        </Note>
        {intervals.map((r) => {
          const s = ease(frame, r.drawAt - 2, 18);
          if (s <= 0) return null;
          const mid = at(xs, r.iv.diff);
          const lo = mid + (at(xs, r.iv.lo) - mid) * s;
          const hi = mid + (at(xs, r.iv.hi) - mid) * s;
          return (
            <React.Fragment key={r.iv.n}>
              <Svg>
                <line x1={lo} x2={hi} y1={y(r.top)} y2={y(r.top)} stroke={r.color} strokeWidth={5} strokeLinecap="round" />
                <line x1={lo} x2={lo} y1={y(r.top) - h(14)} y2={y(r.top) + h(14)} stroke={r.color} strokeWidth={3} />
                <line x1={hi} x2={hi} y1={y(r.top) - h(14)} y2={y(r.top) + h(14)} stroke={r.color} strokeWidth={3} />
                <circle cx={mid} cy={y(r.top)} r={9} fill={r.color} />
              </Svg>
              <Note at={r.drawAt + 4} x={at(xs, r.iv.lo)} y={y(r.top) + h(24)}>
                <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
                  {r.iv.n.toLocaleString("en-US")} per arm: {signed(r.iv.lo)} to {signed(r.iv.hi)}
                  <b style={{ color: r.ink, opacity: ease(frame, r.verdictAt - 2, 10) }}>, {r.verdict}</b>
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={notWorseAt - 2} x={330} y={y(820)}>
          <span style={{ ...note(32, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Mark at={liveAt - 6}>not significant ≠ not worse</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
