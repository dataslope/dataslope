import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLOSE_RATES, SIZES } from "./data";
import { A, A_INK, Arrow, B, B_INK, Count, Drift, FAINT, Headline, Kicker, Marked, pulse, Svg, Tag, X0 } from "./parts";

/** Fig. 10, the method, one step per chip. */
const STEPS = [
  { text: "real examples, known answers", w: 420 },
  { text: "run each candidate", w: 290 },
  { text: "score automatically", w: 300 },
  { text: "compare", w: 170 },
];
const STEP_GAP = 50;
/** Fig. 11: correct answers out of 20, from LO to 20, one slot each. */
const LO = 5;
const HX0 = 200;
const SLOT = 52;
const BASE_A = 512;
const BASE_B = 730;
const MAX_H = 130;
/** Fig. 12, the rate by number of examples. */
const RX0 = 1240;
const RSTEP = 100;
const RBASE = 760;
const RMAX = 170;

/**
 * How many examples (Figs. 10 to 12). The method in four steps, then the
 * lesson's own simulation: a model right 80% of the time against one right
 * 65%, each scored on 20 examples 2,000 times (seed 7), the two histograms
 * filling in run order. The better one comes out ahead in 1,626 of them,
 * about four in five; Fig. 12 is the same run's rate at every size, 94.2% at
 * fifty.
 */
export const ExamplesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("own").from;
  const collectAt = n.word("own", "Collect");
  const runAt = n.word("own", "run");
  const scoreAt = n.word("own", "score");
  const compareAt = n.word("own", "compare");
  const howAt = n.word("howmany", "How many");
  const fewerAt = n.word("howmany", "Fewer");
  const takeAt = n.word("sim", "Take");
  const eightyAt = n.word("sim", "eighty percent");
  const sixtyFiveAt = n.word("sim", "sixty-five");
  const twentyAt = n.word("sim", "twenty examples");
  const againEnd = n.word("sim", "again and again", { edge: "end" });
  const aheadAt = n.word("twenty", "ahead");
  const fourAt = n.word("twenty", "four times in five");
  const fiftyAt = n.word("fifty", "fifty examples");
  /** Fig. 12 waits for the size it is about: "With fifty examples". */
  const fig12At = fiftyAt - 8;
  const ninetyFourAt = n.word("fifty", "ninety-four");
  const closeAt = n.word("close", "look close");
  const costAt = n.word("close", "Pick on cost");
  const end = n.beat("harness").from;

  const stepAt = [collectAt - 2, runAt - 2, scoreAt - 2, compareAt - 2];
  const stepX = STEPS.reduce<number[]>((xs, s, i) => [...xs, i === 0 ? X0 : xs[i - 1] + STEPS[i - 1].w + STEP_GAP], []);
  const methodOut = ease(frame, takeAt - 10, 14);

  // The runs arrive in the order the simulation drew them.
  const fill = ease(frame, twentyAt - 4, Math.max(20, againEnd - twentyAt + 16));
  const shown = Math.round(fill * SIZES.trials);
  const hist = (runs: readonly number[]) => {
    const counts = new Array<number>(21).fill(0);
    for (let i = 0; i < shown; i++) counts[runs[i]]++;
    return counts;
  };
  const histA = hist(SIZES.runsA);
  const histB = hist(SIZES.runsB);
  const peak = Math.max(...SIZES.histA, ...SIZES.histB);
  const unit = h(MAX_H) / peak;
  const sx = (k: number) => HX0 + (k - LO) * SLOT;

  const histogram = (counts: number[], base: number, color: string, at: number) => (
    <Svg opacity={ease(frame, at, 12)}>
      {counts.map((c, k) =>
        k < LO || c === 0 ? null : (
          <rect key={k} x={sx(k) + 3} y={y(base) - c * unit} width={SLOT - 6} height={c * unit} rx={2} fill={color} />
        ),
      )}
      <line x1={HX0 - 10} x2={sx(20) + SLOT + 10} y1={y(base) + 0.5} y2={y(base) + 0.5} stroke={INK} strokeWidth={1.4} />
    </Svg>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the steps, the runs pouring in, the verdicts ── */}
      {stepAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 4} level={-28 - (i % 2)} />
      ))}
      <Sfx name="el-sprinkle" at={twentyAt - 2} level={-33} />
      <Sfx name="el-sprinkle" at={twentyAt + 30} level={-35} />
      <Sfx name="el-tap" at={fourAt - 2} level={-26} />
      <Sfx name="el-tap" at={ninetyFourAt - 2} level={-26} />

      <Kicker at={from - 10}>Your own evaluation</Kicker>
      <Headline at={from - 6} second={fewerAt - 4} italic="Fewer examples than you think.">
        Measure it yourself.
      </Headline>

      {/* ── Fig. 10: the method ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - methodOut }}>
        <FigLabel n="10" title="The whole method" at={from + 2} x={X0} y={y(282)} />
        {STEPS.map((s, i) => (
          <React.Fragment key={s.text}>
            <Tag at={stepAt[i]} x={stepX[i]} y={y(340)} width={s.w}>
              <span style={{ ...label(22, A_INK), fontWeight: 700, marginRight: 10 }}>{i + 1}</span>
              {i === 0 ? <Marked at={howAt - 2}>{s.text}</Marked> : s.text}
            </Tag>
            {i > 0 ? (
              <Arrow from={[stepX[i] - STEP_GAP + 10, y(340) + 24]} to={[stepX[i] - 10, y(340) + 24]} at={stepAt[i] - 6} dur={8} width={2} />
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <Drift from={takeAt} to={end} amount={0.012} origin="40% 70%">
        {/* ── Fig. 11: two models scored on 20 examples, 2,000 times ── */}
        <FigLabel n="11" title={`Each scored on ${SIZES.n} examples, ${SIZES.trials.toLocaleString("en-US")} times`} at={takeAt + 6} x={X0} y={y(296)} />
        {histogram(histA, BASE_A, A, eightyAt - 2)}
        {histogram(histB, BASE_B, B, sixtyFiveAt - 2)}
        {/* Each model's true rate: where its scores ought to pile up. */}
        <Svg>
          {[
            { k: (SIZES.trueA / 100) * SIZES.n, base: BASE_A, at: eightyAt, color: INK },
            { k: (SIZES.trueB / 100) * SIZES.n, base: BASE_B, at: sixtyFiveAt, color: INK },
          ].map((t) => (
            <line
              key={t.base}
              x1={sx(t.k) + SLOT / 2}
              x2={sx(t.k) + SLOT / 2}
              y1={y(t.base) - h(MAX_H) - 10}
              y2={y(t.base) + 6}
              stroke={t.color}
              strokeWidth={2}
              strokeDasharray="4 5"
              opacity={ease(frame, t.at, 12) * 0.7}
            />
          ))}
        </Svg>
        <Ink at={eightyAt - 2} dur={12} style={{ left: HX0 - 80, top: y(BASE_A) - h(MAX_H) - 6, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, A_INK), fontWeight: 700 }}>right {SIZES.trueA}% of the time</span>
        </Ink>
        <Ink at={sixtyFiveAt - 2} dur={12} style={{ left: HX0 - 80, top: y(BASE_B) - h(MAX_H) - 6, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, B_INK), fontWeight: 700 }}>right {SIZES.trueB}%</span>
        </Ink>
        {/* The axis: correct answers out of 20. */}
        <Svg opacity={ease(frame, sixtyFiveAt, 12)}>
          {[5, 10, 15, 20].map((k) => (
            <text key={k} x={sx(k) + SLOT / 2} y={y(BASE_B) + 30} textAnchor="middle" style={{ ...label(20, INK_SOFT), fontWeight: 500, ...TABULAR }}>
              {k}
            </text>
          ))}
        </Svg>
        <Ink at={sixtyFiveAt + 4} dur={12} style={{ left: sx(20) + SLOT + 20, top: y(BASE_B) + 10, whiteSpace: "nowrap" }}>
          <span style={note(21, INK_SOFT)}>right, of {SIZES.n}</span>
        </Ink>
        {/* The runs counter: on screen only while it is counting, and after. */}
        <Ink at={twentyAt - 4} dur={10} style={{ left: sx(20) + SLOT + 20, top: y(BASE_A) - 40, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK), fontWeight: 600 }}>
            <span style={TABULAR}>{shown.toLocaleString("en-US")}</span> runs
          </span>
        </Ink>

        {/* The verdict at 20: how often the better one is ahead. */}
        <Ink at={aheadAt - 4} dur={14} style={{ left: RX0 - 30, top: y(318), whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK), fontWeight: 600 }}>
            better one ahead in{" "}
            <span style={{ color: A_INK, ...TABULAR }}>
              <Count at={aheadAt - 4} to={SIZES.aWins} dur={16} />
            </span>{" "}
            of <span style={TABULAR}>{SIZES.trials.toLocaleString("en-US")}</span>
          </span>
        </Ink>
        <Ink at={fourAt - 2} dur={16} style={{ left: RX0 - 30, top: y(358), whiteSpace: "nowrap" }}>
          <span style={{ ...body(44, true), color: A_INK }}>about four in five</span>
        </Ink>
        <Ink at={fourAt + 10} dur={14} style={{ left: RX0 - 30, top: y(358) + 64, whiteSpace: "nowrap" }}>
          <span style={note(21, INK_SOFT)}>
            tied in <span style={TABULAR}>{SIZES.ties}</span>, behind in <span style={TABULAR}>{SIZES.bWins}</span>
          </span>
        </Ink>

        {/* ── Fig. 12: the same run at every size, from "With fifty examples";
            then the lesson's 2-point gap beside it, from "look close". ── */}
        <FigLabel n="12" title="Better one ahead, by examples" at={fig12At} x={RX0 - 30} y={y(486)} />
        <Ink at={fig12At + 4} dur={12} style={{ left: RX0 - 30, top: y(486) + 36, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width={16} height={16}>
            <rect width={16} height={16} rx={2} fill={A} />
          </svg>
          <span style={note(20, A_INK)}>
            {SIZES.trueA}% against {SIZES.trueB}%
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, marginLeft: 14, opacity: ease(frame, closeAt - 4, 12) }}>
            <svg width={16} height={16}>
              <rect width={16} height={16} rx={2} fill={B} />
            </svg>
            <span style={note(20, INK_SOFT)}>
              {SIZES.trueA}% against {CLOSE_RATES.trueB}%
            </span>
          </span>
        </Ink>
        {SIZES.rates.map((r, i) => {
          const x = RX0 + i * RSTEP;
          const lit = r.n === SIZES.n ? ease(frame, fiftyAt + 2, 10) : r.n === 50 ? ease(frame, ninetyFourAt - 2, 10) : 0;
          const at = fig12At + 4 + i * 3;
          const grow = ease(frame, at, 16);
          const bh = h(RMAX) * (r.pct / 100) * grow;
          const swell = r.n === 50 ? pulse(frame, ninetyFourAt, 18) : 0;
          const close = CLOSE_RATES.rates[i];
          const ch = h(RMAX) * (close.pct / 100) * ease(frame, closeAt - 4 + i * 3, 16);
          return (
            <React.Fragment key={r.n}>
              <Svg opacity={ease(frame, at, 10)}>
                <rect x={x} y={y(RBASE) - bh} width={44} height={bh} rx={2} fill={lit > 0 ? A : FAINT} opacity={0.6 + 0.4 * lit} />
                <rect x={x + 48} y={y(RBASE) - ch} width={22} height={ch} rx={2} fill={B} />
                <text x={x + 35} y={y(RBASE) + 28} textAnchor="middle" style={{ ...label(20, INK_SOFT), fontWeight: 600, ...TABULAR }}>
                  {r.n}
                </text>
              </Svg>
              <Ink at={at + 10} dur={10} style={{ left: x + 22, top: y(RBASE) - h(RMAX) * (r.pct / 100) - 34, whiteSpace: "nowrap" }}>
                <span
                  style={{
                    ...note(lit > 0 ? 22 : 20, lit > 0 ? A_INK : INK_SOFT),
                    fontWeight: lit > 0 ? 700 : 500,
                    ...TABULAR,
                    display: "inline-block",
                    transform: `translateX(-50%) scale(${1 + swell * 0.08})`,
                  }}
                >
                  {fmt(r.pct, 1)}%
                </span>
              </Ink>
            </React.Fragment>
          );
        })}
        {/* The 2-point gap's best showing: a hundred examples, barely better than a coin. */}
        <Ink
          at={closeAt + 12}
          dur={12}
          style={{ left: RX0 + 4 * RSTEP + 59, top: y(RBASE) - h(RMAX) * (CLOSE_RATES.rates[4].pct / 100) - 30, whiteSpace: "nowrap" }}
        >
          <span style={{ ...note(20, INK_SOFT), fontWeight: 600, ...TABULAR, display: "inline-block", transform: "translateX(-50%)" }}>
            {fmt(CLOSE_RATES.rates[4].pct, 1)}%
          </span>
        </Ink>
        <Ink at={fig12At + 12} dur={12} style={{ left: RX0 + 4 * RSTEP + 84, top: y(RBASE) + 8, whiteSpace: "nowrap" }}>
          <span style={note(21, INK_SOFT)}>examples</span>
        </Ink>

        {/* Close after thirty: they probably are. */}
        <Ink at={closeAt - 4} dur={16} style={{ left: X0, top: y(826), whiteSpace: "nowrap" }}>
          <span style={{ ...body(34, true), color: INK }}>
            Still close after 30? They probably are.{" "}
            <span style={{ color: A_INK, fontWeight: 600, opacity: ease(frame, costAt - 2, 12) }}>Pick on cost.</span>
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
