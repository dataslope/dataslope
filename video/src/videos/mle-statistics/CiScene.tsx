import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M, MathRun } from "../../editorial/math";
import { headline, INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CI, SLICE } from "./data";
import { BAD, BAD_INK, Baseline, DATA, Drift, Heading, HIGHLIGHT, Line, Mark, mulberry32, OK, OK_INK, POINT, pulse, Svg, X0 } from "./parts";

const STACK_X1 = 980;
const LO = 0.874;
const HI = 0.946;
const R_X0 = 1100;
const Z = 1.96;

/** Ten slices of 40 at 97%, drawn by a seeded generator; the first seed
 *  whose ten has exactly three perfect slices, the share SLICE.perfect
 *  measures (30%), so the picture shows the rate the narration says. */
const SLICES = (() => {
  for (let seed = 1; seed < 500; seed++) {
    const rand = mulberry32(seed);
    const scores = Array.from({ length: 10 }, () => Array.from({ length: SLICE.n }, () => (rand() < SLICE.p ? 1 : 0) as number).reduce((a, b) => a + b, 0));
    if (scores.filter((k) => k === SLICE.n).length === 3 && Math.min(...scores) >= 36) return scores;
  }
  return [39, 40, 38, 40, 39, 37, 39, 40, 38, 39];
})();

/** The textbook (Wald) interval for k of n, and Wilson's score interval. */
const wald = (k: number, n: number) => {
  const p = k / n;
  const m = Z * Math.sqrt((p * (1 - p)) / n);
  return [p - m, Math.min(1, p + m)] as const;
};
const wilson = (k: number, n: number) => {
  const p = k / n;
  const d = 1 + (Z * Z) / n;
  const c = (p + (Z * Z) / (2 * n)) / d;
  const m = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / d;
  return [c - m, Math.min(1, c + m)] as const;
};

/**
 * Question 4. The interval as a procedure: one line of formula, then a
 * hundred simulated test sets' intervals stacked against the true 91%; the
 * four that miss are picked out in yellow (a 95% procedure misses one time
 * in twenty; not an error, so not red). Then the follow-up: slices of 40 at
 * 97%, where three in ten score 40 of 40 and the textbook interval collapses
 * to a point on 100%, red; Wilson's interval for the same slice, green.
 */
export const CiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "What is a confidence interval");
  const procAt = n.word("q4", "It's a procedure");
  const plusAt = n.word("q4", "plus or minus");
  const builtAt = n.word("q4", "built on every repeat");
  const containsAt = n.word("q4", "contains the true value");
  const ninetyFiveAt = n.word("q4", "ninety-five percent of the time");
  const simAt = n.word("q4-sim", "Simulate a hundred test sets");
  const trulyAt = n.word("q4-sim", "truly ninety-one percent accurate");
  const coverAt = n.word("q4-sim", "ninety-six of the hundred");
  const eachAt = n.word("q4-sim", "Each one either does");
  const belongsAt = n.word("q4-sim", "belongs to the procedure");
  const breaksAt = n.word("q4-slice", "where it breaks");
  const sliceAt = n.word("q4-slice", "On a slice of forty examples");
  const sevenAt = n.word("q4-slice", "ninety-seven percent right");
  const threeAt = n.word("q4-slice", "three slices in ten");
  const pointAt = n.word("q4-slice", "shrinks to a point");
  const acrossAt = n.word("q4-slice", "Across all slices");
  const seventyAt = n.word("q4-slice", "only seventy percent");
  const wilsonAt = n.word("q4-slice", "Wilson's score interval");
  const ninetySevenAt = n.word("q4-slice", "covers ninety-seven");
  const end = n.beat("q4-slice").to;

  const out = breaksAt + 4;

  // ── The hundred intervals ──
  const ix = (v: number) => X0 + ((v - LO) / (HI - LO)) * (STACK_X1 - X0);
  const top = y(420);
  const pitch = h(4.15);
  const rows = CI.intervals.map(([lo, hi, covers], i) => ({ lo, hi, covers, y: top + i * pitch, at: builtAt + i * 0.3 }));
  const miss = ease(frame, coverAt, 12);
  const stackBottom = top + 100 * pitch;

  // ── The slices ──
  const sx0 = 330;
  const sx1 = 960;
  const sx = (v: number) => sx0 + ((v - 0.8) / 0.2) * (sx1 - sx0);
  const rowY = (i: number) => y(372) + i * h(46);
  const perfect = SLICES.map((k) => k === SLICE.n);
  const rx0 = R_X0 + 220;
  const rx1 = 1760;
  const rx = (v: number) => rx0 + ((v - 0.8) / 0.2) * (rx1 - rx0);
  const wil = wilson(SLICE.n, SLICE.n);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={builtAt} level={-32} />
      <Sfx name="el-pencil" at={containsAt} level={-35} />
      <Sfx name="el-tap" at={coverAt} level={-29} />
      <Sfx name="el-chime" at={belongsAt + 14} level={-33} />
      <Sfx name="el-sprinkle" at={sliceAt + 6} level={-33} />
      <Sfx name="el-tap" at={threeAt} level={-30} />
      <Sfx name="el-tap" at={pointAt + 4} level={-30} />
      <Sfx name="el-tap" at={seventyAt} level={-30} />
      <Sfx name="el-pencil" at={wilsonAt + 4} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a confidence interval, really?
        </QuestionCard>

        {/* ── A procedure ── */}
        <Line at={procAt} x={X0} y={y(272)} size={28} out={out}>
          A procedure, not a probability about one interval
        </Line>
        <Ink at={plusAt} dur={16} out={out} style={{ left: X0, top: y(326), whiteSpace: "nowrap" }}>
          <span style={{ ...note(32, INK) }}>
            <MathRun>
              estimate ± <Num>1.96</Num> × SE
            </MathRun>
          </span>
        </Ink>

        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, out, 12) }}>
          <Svg>
            {rows.map((r, i) => {
              const p = ease(frame, r.at, 8);
              if (p <= 0) return null;
              const missing = !r.covers;
              return (
                <g key={i} opacity={p}>
                  {missing ? <rect x={ix(r.lo) - 8} y={r.y - 5} width={ix(r.hi) - ix(r.lo) + 16} height={10} rx={3} fill={HIGHLIGHT} opacity={miss} /> : null}
                  <line
                    x1={ix(r.lo)}
                    x2={ix(r.lo) + (ix(r.hi) - ix(r.lo)) * p}
                    y1={r.y}
                    y2={r.y}
                    stroke={missing && miss > 0.5 ? POINT : DATA}
                    strokeWidth={missing && miss > 0.5 ? 3.4 : 2.4}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
            <line x1={ix(CI.truth)} x2={ix(CI.truth)} y1={top - 14} y2={top - 14 + (stackBottom - top + 28) * ease(frame, containsAt, 16)} stroke={INK} strokeWidth={2.4} />
          </Svg>
          <Baseline
            x0={X0}
            x1={STACK_X1}
            base={stackBottom + 14}
            at={builtAt}
            ticks={[0.88, 0.9, 0.92, 0.94].map((v) => ({ v, x: ix(v), text: `${Math.round(v * 100)}%` }))}
          />
          <Line at={containsAt + 6} x={ix(CI.truth) + 10} y={top - h(44)} size={22}>
            The true value, <Num>91%</Num>
          </Line>
        </div>

        {/* ── The simulation's count ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, out, 12) }}>
          <ColumnRule x={(STACK_X1 + R_X0) / 2} top={y(420)} height={stackBottom - y(420)} at={simAt} />
          <Line at={ninetyFiveAt} x={R_X0} y={y(420)} size={26} color={INK_SOFT}>
            Contains it about <Num>95%</Num> of the time
          </Line>
          <Line at={simAt} x={R_X0} y={y(476)} size={26}>
            <Num>100</Num> simulated test sets of <Num>{CI.n.toLocaleString("en-US")}</Num>
          </Line>
          <Line at={trulyAt} x={R_X0} y={y(520)} size={26} color={INK_SOFT}>
            For a model truly <Num>91%</Num> accurate
          </Line>
          <Ink at={coverAt} dur={16} style={{ left: R_X0, top: y(600), whiteSpace: "nowrap" }}>
            <span style={{ ...headline(64) }}>
              <Num>{CI.covered}</Num> of <Num>{CI.sets}</Num> cover it
            </span>
          </Ink>
          <Ink at={coverAt + 10} dur={14} style={{ left: R_X0, top: y(690), whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, ...note(24, INK_SOFT) }}>
              <span style={{ width: 40, height: 6, borderRadius: 3, background: POINT, boxShadow: `0 0 0 3px ${HIGHLIGHT}`, transform: `scale(${1 + 0.2 * pulse(frame, eachAt, 18)})` }} />
              <span>The four that miss</span>
            </div>
          </Ink>
          <Line at={eachAt} x={R_X0} y={y(750)} size={26}>
            Each one either does or doesn&apos;t
          </Line>
          <Line at={belongsAt - 2} x={R_X0} y={y(800)} size={30} color={OK_INK} weight={600}>
            The <Num>95%</Num> belongs to the procedure
          </Line>
        </div>

        {/* ── The follow-up: slices of 40 ── */}
        <Heading at={sliceAt} x={X0} y={y(290)}>
          Slices of <Num>{SLICE.n}</Num> examples, a model <Num>97%</Num> right
        </Heading>
        {SLICES.map((k, i) => {
          const at = sliceAt + 6 + i * 2;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const [lo, hi] = wald(k, SLICE.n);
          const draw = ease(frame, pointAt - 6 + i, 12);
          const top2 = rowY(i);
          const isPerfect = perfect[i];
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: X0, top: top2 - 16, width: 150, opacity: p, ...note(24, INK), whiteSpace: "nowrap" }}>
                {isPerfect ? (
                  <Mark at={threeAt + 2 + i}>
                    <Num>{k}</Num> / <Num>{SLICE.n}</Num>
                  </Mark>
                ) : (
                  <>
                    <Num>{k}</Num> / <Num>{SLICE.n}</Num>
                  </>
                )}
              </div>
              <Svg opacity={p}>
                {isPerfect ? (
                  <circle cx={sx(1)} cy={top2} r={7 * draw} fill={BAD} />
                ) : (
                  <line x1={sx(lo)} x2={sx(lo) + (sx(hi) - sx(lo)) * draw} y1={top2} y2={top2} stroke={DATA} strokeWidth={4} strokeLinecap="round" />
                )}
              </Svg>
            </React.Fragment>
          );
        })}
        <Svg opacity={ease(frame, sevenAt, 12)}>
          <line x1={sx(SLICE.p)} x2={sx(SLICE.p)} y1={rowY(0) - h(30)} y2={rowY(9) + h(26)} stroke={INK} strokeWidth={2} strokeDasharray="7 6" />
        </Svg>
        <Baseline
          x0={sx0}
          x1={sx1}
          base={rowY(9) + h(30)}
          at={sliceAt + 4}
          ticks={[0.8, 0.85, 0.9, 0.95, 1].map((v) => ({ v, x: sx(v), text: `${Math.round(v * 100)}%` }))}
        />
        <Line at={sevenAt + 4} x={sx(SLICE.p) - 10} y={rowY(0) - h(64)} size={22} align="right" width={300}>
          True <Num>97%</Num>
        </Line>
        <Line at={pointAt + 6} x={sx(1) + 18} y={rowY(perfect.indexOf(true)) - 16} size={22} color={BAD_INK}>
          A point
        </Line>

        <ColumnRule x={(sx1 + 60 + R_X0) / 2} top={y(372) - h(30)} height={rowY(9) + h(30) - y(372) + h(30)} at={acrossAt} />

        <Line at={threeAt} x={R_X0} y={y(372) - 16} size={26}>
          <Num>3</Num> in <Num>10</Num> score <Mark at={threeAt + 6}>40 / 40</Mark>
        </Line>
        <Line at={pointAt} x={R_X0} y={y(420) - 16} size={26} color={INK_SOFT}>
          <M>{"0.97^{40}"}</M> = <Num>{(SLICE.perfectExact * 100).toFixed(1)}%</Num> of slices
        </Line>

        {/* One perfect slice, both intervals. */}
        <Line at={acrossAt} x={R_X0} y={y(520)} size={24}>
          Textbook
        </Line>
        <Line at={wilsonAt} x={R_X0} y={y(600)} size={24}>
          Wilson
        </Line>
        <Svg>
          <circle cx={rx(1)} cy={y(520) + 15} r={8 * ease(frame, acrossAt + 2, 10)} fill={BAD} />
          <line
            x1={rx(wil[0])}
            x2={rx(wil[0]) + (rx(wil[1]) - rx(wil[0])) * ease(frame, wilsonAt + 4, 16)}
            y1={y(600) + 15}
            y2={y(600) + 15}
            stroke={OK}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={ease(frame, wilsonAt + 4, 4)}
          />
          <line x1={rx(SLICE.p)} x2={rx(SLICE.p)} y1={y(490)} y2={y(660) * ease(frame, acrossAt, 12) + y(490) * (1 - ease(frame, acrossAt, 12))} stroke={INK} strokeWidth={2} strokeDasharray="7 6" />
        </Svg>
        <Baseline x0={rx0} x1={rx1} base={y(670)} at={acrossAt} ticks={[0.8, 0.9, 1].map((v) => ({ v, x: rx(v), text: `${Math.round(v * 100)}%` }))} />
        <Line at={acrossAt} x={R_X0} y={y(470)} size={22} color={INK_SOFT}>
          For a slice that scores <Num>40 / 40</Num>
        </Line>
        <Line at={seventyAt} x={R_X0} y={y(760)} size={28} color={BAD_INK} weight={600}>
          Textbook interval: covers <Num>{Math.round(SLICE.wald * 100)}%</Num>
        </Line>
        <Line at={ninetySevenAt} x={R_X0} y={y(812)} size={28} color={OK_INK} weight={600}>
          Wilson: covers <Num>{Math.round(SLICE.wilson * 100)}%</Num>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
