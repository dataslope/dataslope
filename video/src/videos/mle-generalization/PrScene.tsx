import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { BAR, BLUE_INK, fmt, HIGHLIGHT, INK, INK_SOFT, TABULAR } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRAUD, PAGE } from "./data";
import { at, Axes, Curve, commas, Drift, Fade, Key, line, LIT_LINE, OK_INK, pct, Q_SIZE, Say, type Scale, SERIES2, SERIES2_INK, Svg, X0 } from "./parts";

const CELL_W = 210;
const CELL_X = 440;
const CHART = { left: 190, right: 960, top: 410, bottom: 800 };

/** The threshold at which the model flags about a thousand transactions:
 *  flagged = recall × frauds / precision, read off the sweep. */
const T1000 = (() => {
  let best = FRAUD.sweep[0];
  for (const s of FRAUD.sweep) {
    const flagged = (s[2] * FRAUD.fraud) / s[1];
    if (Math.abs(flagged - 1000) < Math.abs((best[2] * FRAUD.fraud) / best[1] - 1000)) best = s;
  }
  return best[0];
})();

/**
 * Question 8. The page's eight examples as a confusion matrix, precision
 * traced down the flagged column and recall along the actual-positive row,
 * all three at 0.75. Then a simulated fraud model's precision and recall
 * against the threshold, read at 0.5 and 0.1; which to favor, what each
 * error costs here, and the threshold capacity sets: the top thousand.
 */
export const PrScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pr").from;
  const qAt = n.word("pr", "Question eight");
  const textAt = n.word("pr", "What are precision");
  const precAt = n.word("pr", "Precision: of everything flagged");
  const rightAt = n.word("pr", "the share that was right");
  const recAt = n.word("pr", "Recall: of everything");
  const caughtAt = n.word("pr", "the share you caught");
  const f1At = n.word("pr-page", "F one is their harmonic mean");
  const bothAt = n.word("pr-page", "high only when both are");
  const eightAt = n.word("pr-page", "the page's eight examples");
  const allAt = n.word("pr-page", "all three come to");
  const tradeAt = n.word("pr-thresh", "they trade off");
  const simAt = n.word("pr-thresh", "Simulate a fraud model");
  const fiveAt = n.word("pr-thresh", "At a threshold of point five");
  const p84At = n.word("pr-thresh", "eighty-four percent");
  const r24At = n.word("pr-thresh", "recall twenty-four");
  const oneAt = n.word("pr-thresh", "At point one");
  const p35At = n.word("pr-thresh", "thirty-five and fifty-four");
  const favorAt = n.word("pr-cost", "Favor precision");
  const missesAt = n.word("pr-cost", "recall when misses are");
  const blocksAt = n.word("pr-cost", "a false alarm blocks");
  const lossAt = n.word("pr-cost", "a miss loses the money");
  const equallyAt = n.word("pr-cost", "F one weighs them equally");
  const capAt = n.word("pr-capacity", "Often capacity decides");
  const thousandAt = n.word("pr-capacity", "flag the top thousand");
  const catchesAt = n.word("pr-capacity", "That catches");
  const end = n.beat("pr-capacity").to;

  // ── The confusion matrix ──
  const mTop = y(400);
  const cellH = h(104);
  const cells = [
    { r: 0, c: 0, name: "TP", v: PAGE.tp, note: "caught" },
    { r: 0, c: 1, name: "FN", v: PAGE.fn, note: "missed" },
    { r: 1, c: 0, name: "FP", v: PAGE.fp, note: "false alarm" },
    { r: 1, c: 1, name: "TN", v: PAGE.tn, note: "" },
  ];
  const colP = ease(frame, precAt, 14);
  const rowP = ease(frame, recAt, 14);
  const matrixOut = tradeAt - 6;

  // ── The threshold sweep ──
  const cx: Scale = { lo: 0, hi: 1, a: CHART.left, b: CHART.right };
  const cy: Scale = { lo: 0, hi: 1, a: y(CHART.bottom), b: y(CHART.top) };
  const prec = FRAUD.sweep.map(([t, p]) => [t, p] as const);
  const rec = FRAUD.sweep.map(([t, , r]) => [t, r] as const);
  const at5 = FRAUD.thresholds.find((t) => t.t === 0.5) ?? FRAUD.thresholds[0];
  const at1 = FRAUD.thresholds.find((t) => t.t === 0.1) ?? FRAUD.thresholds[3];
  const marks = [
    { t: at5, at: fiveAt, pAt: p84At, rAt: r24At },
    { t: at1, at: oneAt, pAt: p35At, rAt: p35At + 6 },
  ];
  const t1000X = at(cx, T1000);
  const capP = ease(frame, thousandAt, 16);
  const RX = 1110;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={eightAt} level={-32} />
      <Sfx name="el-pencil" at={precAt} level={-35} />
      <Sfx name="el-pencil" at={recAt} level={-35} />
      <Sfx name="el-tap" at={allAt + 4} level={-30} />
      <Sfx name="el-whoosh" at={tradeAt - 2} level={-37} />
      <Sfx name="el-pencil" at={simAt + 6} level={-36} />
      <Sfx name="el-tap" at={fiveAt} level={-32} />
      <Sfx name="el-tap" at={oneAt} level={-32} />
      <Sfx name="el-tap" at={blocksAt} level={-34} />
      <Sfx name="el-tap" at={lossAt} level={-34} />
      <Sfx name="el-pop" at={catchesAt} level={-30} />
      <Sfx name="el-chime" at={end + 6} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What are precision, recall, and F1-score?
        </QuestionCard>

        {/* ── The page's eight examples ── */}
        <Fade from={precAt - 8} out={matrixOut}>
          <Say at={precAt - 6} x={CELL_X} y={mTop - h(84)} width={CELL_W} align="center">
            <span style={line(22, INK_SOFT)}>flagged</span>
          </Say>
          <Say at={precAt - 6} x={CELL_X + CELL_W + 14} y={mTop - h(84)} width={CELL_W} align="center">
            <span style={line(22, INK_SOFT)}>not flagged</span>
          </Say>
          {["actually positive", "actually negative"].map((t, r) => (
            <Say key={t} at={precAt - 4} x={CELL_X - 44} y={mTop + r * (cellH + 14) + cellH / 2 - 15} width={300} align="right">
              <span style={line(22, INK_SOFT)}>{t}</span>
            </Say>
          ))}
          {cells.map((c) => {
            const lit = (c.r === 0 && c.c === 0 ? Math.max(ease(frame, rightAt, 10), ease(frame, caughtAt, 10)) : 0) > 0.5;
            return (
              <div
                key={c.name}
                style={{
                  position: "absolute",
                  left: CELL_X + c.c * (CELL_W + 14),
                  top: mTop + c.r * (cellH + 14),
                  width: CELL_W,
                  height: cellH,
                  boxSizing: "border-box",
                  border: `2px solid ${INK}`,
                  borderRadius: 8,
                  background: lit ? HIGHLIGHT : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  opacity: ease(frame, precAt - 6 + (c.r * 2 + c.c) * 2, 10),
                }}
              >
                <span style={{ ...line(32, INK), ...TABULAR }}>
                  {c.name} {c.v}
                </span>
                {c.note ? <span style={line(20, INK_SOFT)}>{c.note}</span> : null}
              </div>
            );
          })}
          {/* Precision: down the flagged column. Recall: along the positive row. */}
          <Svg>
            <rect
              x={CELL_X - 10}
              y={mTop - 10}
              width={CELL_W + 20}
              height={(2 * cellH + 14 + 20) * colP}
              rx={12}
              fill="none"
              stroke={BAR}
              strokeWidth={3.4}
              opacity={colP}
            />
            <rect
              x={CELL_X - 18}
              y={mTop - 18}
              width={(2 * CELL_W + 14 + 36) * rowP}
              height={cellH + 36}
              rx={14}
              fill="none"
              stroke={SERIES2}
              strokeWidth={3.4}
              opacity={rowP}
            />
          </Svg>
          <Say at={precAt - 2} x={1050} y={y(390)}>
            <span style={{ ...line(34, BLUE_INK) }}>
              <M>Precision = TP / (TP + FP)</M>
            </span>
          </Say>
          <Say at={rightAt - 2} x={1050} y={y(390) + h(52)}>
            <span style={line(24, INK_SOFT)}>of everything flagged, the share that was right</span>
          </Say>
          <Say at={recAt - 2} x={1050} y={y(530)}>
            <span style={{ ...line(34, SERIES2_INK) }}>
              <M>Recall = TP / (TP + FN)</M>
            </span>
          </Say>
          <Say at={caughtAt - 2} x={1050} y={y(530) + h(52)}>
            <span style={line(24, INK_SOFT)}>of everything that was there, the share caught</span>
          </Say>
          <Say at={f1At - 2} x={1050} y={y(670)}>
            <span style={line(34, INK)}>
              <MathRun>
                F1 = 2<I>P</I>
                <I>R</I> / (<I>P</I> + <I>R</I>)
              </MathRun>
            </span>
          </Say>
          <Say at={bothAt - 2} x={1050} y={y(670) + h(52)}>
            <span style={line(24, INK_SOFT)}>the harmonic mean: high only when both are</span>
          </Say>
          <Say at={allAt - 2} x={X0} y={y(690)}>
            <span style={{ ...line(32, INK), ...TABULAR }}>
              Precision {fmt(PAGE.precision)} · Recall {fmt(PAGE.recall)} · F1 {fmt(PAGE.f1)}
            </span>
          </Say>
        </Fade>

        {/* ── A fraud model's two numbers along the threshold ── */}
        <Fade from={tradeAt - 4}>
          <Say at={simAt - 2} x={CHART.left} y={y(CHART.top) - h(100)}>
            <span style={line(24, INK_SOFT)}>
              Simulated fraud model: <span style={TABULAR}>{commas(FRAUD.test)}</span> transactions, <span style={TABULAR}>{pct(FRAUD.rate)}</span> fraud
            </span>
          </Say>
          <Say at={simAt + 4} x={CHART.left} y={y(CHART.top) - h(56)}>
            <div style={{ display: "flex", gap: 28, fontSize: 22 }}>
              <Key color={BAR}>precision</Key>
              <Key color={SERIES2}>recall</Key>
            </div>
          </Say>
          <Axes x={cx} y={cy} xTicks={[0, 0.25, 0.5, 0.75, 1]} yTicks={[0, 0.5, 1]} yFormat={(v) => pct(v)} xTitle="threshold" at={tradeAt} />
          <Svg opacity={capP}>
            <rect x={t1000X} y={y(CHART.top)} width={(CHART.right - t1000X) * capP} height={y(CHART.bottom) - y(CHART.top)} fill={HIGHLIGHT} opacity={0.55} />
            <line x1={t1000X} x2={t1000X} y1={y(CHART.top) - 6} y2={y(CHART.bottom)} stroke={LIT_LINE} strokeWidth={3} />
          </Svg>
          <Curve points={prec} x={cx} y={cy} at={simAt + 4} dur={30} color={BAR} width={3.6} />
          <Curve points={rec} x={cx} y={cy} at={simAt + 10} dur={30} color={SERIES2} width={3.6} />
          {marks.map((m) => {
            const mx = at(cx, m.t.t);
            const p = ease(frame, m.at, 12);
            return (
              <React.Fragment key={m.t.t}>
                <Svg opacity={p}>
                  <line x1={mx} x2={mx} y1={y(CHART.top)} y2={y(CHART.bottom)} stroke={INK} strokeWidth={1.6} strokeDasharray="5 6" />
                  <circle cx={mx} cy={at(cy, m.t.precision)} r={8 * ease(frame, m.pAt, 8)} fill={BAR} />
                  <circle cx={mx} cy={at(cy, m.t.recall)} r={8 * ease(frame, m.rAt, 8)} fill={SERIES2} />
                </Svg>
                {/* Each label on the side its line leaves clear: precision
                    rises to the right, recall falls. */}
                <Say
                  at={m.pAt}
                  x={m.t.t > 0.3 ? mx - 12 : mx + 12}
                  y={at(cy, m.t.precision) + (m.t.t > 0.3 ? -42 : 8)}
                  width={80}
                  align={m.t.t > 0.3 ? "right" : "left"}
                >
                  <span style={{ ...line(24, BLUE_INK), ...TABULAR }}>{pct(m.t.precision)}</span>
                </Say>
                <Say
                  at={m.rAt}
                  x={m.t.t > 0.3 ? mx - 12 : mx + 12}
                  y={at(cy, m.t.recall) + (m.t.t > 0.3 ? 8 : -40)}
                  width={80}
                  align={m.t.t > 0.3 ? "right" : "left"}
                >
                  <span style={{ ...line(24, SERIES2_INK), ...TABULAR }}>{pct(m.t.recall)}</span>
                </Say>
              </React.Fragment>
            );
          })}
          <Say at={thousandAt + 4} x={t1000X + 12} y={y(CHART.top) + 6}>
            <span style={line(22, INK)}>top 1,000</span>
          </Say>

          {/* ── Which to favor, and what each error costs here ── */}
          <ColumnRule x={1040} top={y(CHART.top) - h(100)} height={h(470)} at={favorAt - 2} />
          {[
            { at: favorAt, text: <><b style={{ color: BLUE_INK, fontWeight: 500 }}>Precision</b>: when false alarms are costly</> },
            { at: missesAt, text: <><b style={{ color: SERIES2_INK, fontWeight: 500 }}>Recall</b>: when misses are</> },
            { at: blocksAt, text: <>False alarm: a good customer’s card blocked</> },
            { at: lossAt, text: <>Miss: the money lost</> },
          ].map((r, i) => (
            <Say key={i} at={r.at - 2} x={RX} y={y(CHART.top) - h(100) + i * h(60) + (i >= 2 ? h(36) : 0)}>
              <span style={line(27, INK, i >= 2 ? 400 : 500)}>{r.text}</span>
            </Say>
          ))}
          <Say at={equallyAt - 2} x={RX} y={y(CHART.top) - h(100) + 4 * h(60) + h(60)}>
            <span style={line(24, INK_SOFT)}>F1 weighs them equally; a business rarely does</span>
          </Say>
          <Say at={capAt - 2} x={RX} y={y(CHART.top) - h(100) + 4 * h(60) + h(140)}>
            <span style={line(27, INK, 400)}>Reviewers check 1,000 alerts a day:</span>
          </Say>
          <Say at={catchesAt - 2} x={RX} y={y(CHART.top) - h(100) + 4 * h(60) + h(190)}>
            <span style={{ ...line(30, OK_INK) }}>
              The top <span style={TABULAR}>{commas(FRAUD.top1000.flagged)}</span> catch <span style={TABULAR}>{FRAUD.top1000.caught}</span> of <span style={TABULAR}>{FRAUD.fraud}</span>
            </span>
          </Say>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
