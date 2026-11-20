import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { BAR, BLUE_INK, fmt, HIGHLIGHT, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FIT } from "./data";
import {
  at,
  atLog,
  Axes,
  Drift,
  Fade,
  Key,
  line,
  LIT_INK,
  LIT_LINE,
  type LogScale,
  NOISE_C,
  OK,
  OK_INK,
  Q_SIZE,
  RuledList,
  Say,
  type Scale,
  StraightArrow,
  Svg,
  X0,
} from "./parts";

const TREE = { left: 190, right: 860, top: 424, bottom: 776 };
const LINE = { left: 1110, right: 1740, top: 424, bottom: 776 };
const Y_TOP = 28;
const SIZE_TICKS = [30, 100, 300, 1000, 2000];

type Curve = { sizes: number[]; train: number[]; validation: number[] };

/** One model's two learning curves, drawn as polylines with a dot per size. */
const LearningCurves: React.FC<{
  c: Curve;
  box: typeof TREE;
  at: number;
  valAt: number;
  y: (v: number) => number;
}> = ({ c, box, at: from, valAt, y }) => {
  const frame = useCurrentFrame();
  const xs: LogScale = { lo: 30, hi: 2000, a: box.left, b: box.right };
  const ys: Scale = { lo: 0, hi: Y_TOP, a: y(box.bottom), b: y(box.top) };
  const draw = (vals: number[], start: number, color: string) => {
    const p = ease(frame, start, 26);
    const pts = c.sizes.map((n, i) => [atLog(xs, n), at(ys, vals[i])] as const);
    const d = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
    return (
      <g>
        <path d={d} fill="none" stroke={color} strokeWidth={3.4} strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
        {pts.map(([a, b], i) => {
          const s = ease(frame, start + (i / pts.length) * 26, 8);
          return s > 0 ? <circle key={i} cx={a} cy={b} r={6 * s} fill={color} /> : null;
        })}
      </g>
    );
  };
  return (
    <Svg>
      {draw(c.train, from, BAR)}
      {draw(c.validation, valAt, INK)}
    </Svg>
  );
};

/**
 * Questions 2 and 3 on one benchmark, Friedman #1. An unpruned tree's
 * learning curves: training error at zero for every size, validation error
 * still falling at 2,000 rows; the gap between them shaded as variance, and
 * the fixes. Then a straight line on the same data beside it, its two curves
 * meeting near seven with nothing between them to close: bias, and the fix
 * that works, two engineered features.
 */
export const FitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fit").from;
  const qAt = n.word("fit", "Question two");
  const textAt = n.word("fit", "What is overfitting");
  const memAt = n.word("fit", "memorized");
  const lowAt = n.word("fit", "low training error");
  const highAt = n.word("fit", "high validation error");
  const curvesAt = n.word("fit-curves", "Learning curves");
  const benchAt = n.word("fit-curves", "a standard benchmark");
  const zeroAt = n.word("fit-curves", "zero training error");
  const valAt = n.word("fit-curves", "its validation error");
  const stillAt = n.word("fit-curves", "still falling");
  const gapAt = n.word("fit-gap", "The gap is variance");
  const closingAt = n.word("fit-gap", "still closing");
  const helpAt = n.word("fit-gap", "more data will help");
  const fixes = [
    { text: "More data", at: n.word("fit-fix", "get more data") },
    { text: "Cut capacity", at: n.word("fit-fix", "cut capacity") },
    { text: "Regularize: L1, L2, dropout", at: n.word("fit-fix", "regularize") },
    { text: "Augment the data", at: n.word("fit-fix", "augment the data") },
    { text: "Stop early", at: n.word("fit-fix", "stop early") },
  ];
  const q3At = n.word("under", "Question three");
  const q3TextAt = n.word("under", "What is underfitting");
  const bothAt = n.word("under", "Both errors high");
  const closeAt = n.word("under", "close together");
  const lineAt = n.word("under-line", "A straight line");
  const meetAt = n.word("under-line", "meet within");
  const sevenAt = n.word("under-line", "both near seven");
  const moveAt = n.word("under-line", "won't move them");
  const needs = [
    { text: "More capacity", at: n.word("under-fix", "more capacity") },
    { text: "Longer training", at: n.word("under-fix", "longer training") },
    { text: "Less regularization", at: n.word("under-fix", "less regularization") },
    { text: "Better features", at: n.word("under-fix", "better features") },
  ];
  const addAt = n.word("under-fix", "Add a product");
  const plainAt = n.word("under-fix", "six point nine");
  const engAt = n.word("under-fix", "four point six");
  const end = n.beat("under-fix").to;
  const treeOut = needs[0].at - 10;

  const tx: LogScale = { lo: 30, hi: 2000, a: TREE.left, b: TREE.right };
  const ty: Scale = { lo: 0, hi: Y_TOP, a: y(TREE.bottom), b: y(TREE.top) };
  const lx: LogScale = { lo: 30, hi: 2000, a: LINE.left, b: LINE.right };
  const ly: Scale = { lo: 0, hi: Y_TOP, a: y(LINE.bottom), b: y(LINE.top) };
  const sizes = FIT.tree.sizes;
  const last = sizes.length - 1;
  const lastX = atLog(tx, sizes[last]);

  // The gap between the tree's two curves, shaded as variance.
  const gapP = ease(frame, gapAt - 2, 20);
  const gapTop = sizes.map((s, i) => `${atLog(tx, s).toFixed(1)},${at(ty, FIT.tree.validation[i]).toFixed(1)}`);
  const gapBottom = [...sizes].reverse().map((s, i) => `${atLog(tx, s).toFixed(1)},${at(ty, FIT.tree.train[last - i]).toFixed(1)}`);
  const gapPoly = [...gapTop, ...gapBottom].join(" ");

  // The line's level, bracketed from the noise floor: what more rows can't remove.
  const lineEnd = FIT.linear.validation[last];
  const lineLastX = atLog(lx, sizes[last]);
  const bx = lineLastX + 26;
  const bTop = at(ly, lineEnd);
  const bBottom = at(ly, FIT.noise);
  const bP = ease(frame, sevenAt + 4, 16);

  const bars = [
    { name: "straight line", v: FIT.plain, at: plainAt, color: BAR, ink: BLUE_INK },
    {
      name: (
        <>
          + <MathRun><I>x</I><sub>1</sub><I>x</I><sub>2</sub></MathRun> and <MathRun><I>x</I><sub>3</sub>²</MathRun>
        </>
      ),
      v: FIT.engineered,
      at: engAt,
      color: OK,
      ink: OK_INK,
    },
  ];
  const BAR_L = 1110;
  const BAR_MAX = 560;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={memAt} level={-32} />
      <Sfx name="el-pencil" at={zeroAt} level={-36} />
      <Sfx name="el-pencil" at={valAt} level={-36} />
      <Sfx name="el-whoosh" at={gapAt} level={-37} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-34} />
      ))}
      <Sfx name="el-pencil" at={lineAt + 4} level={-36} />
      <Sfx name="el-pencil" at={sevenAt + 4} level={-36} />
      {needs.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={engAt + 2} level={-30} />
      <Sfx name="el-chime" at={end + 6} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} out={q3At - 6} size={Q_SIZE}>
          What is overfitting and how do you combat it?
        </QuestionCard>
        <QuestionCard n={3} at={q3At} textAt={q3TextAt - 2} size={Q_SIZE}>
          What is underfitting?
        </QuestionCard>
        <Say at={memAt - 4} x={X0} y={y(262)} out={q3At - 6}>
          <span style={line(30, INK, 400)}>
            Memorized its training data:{" "}
            <span style={{ opacity: ease(frame, lowAt - 2, 10) }}>
              <b style={{ color: BLUE_INK, fontWeight: 500 }}>low training error</b>,
            </span>{" "}
            <span style={{ opacity: ease(frame, highAt - 2, 10) }}>
              <b style={{ fontWeight: 500 }}>high validation error</b>
            </span>
          </span>
        </Say>
        <Say at={bothAt - 2} x={X0} y={y(262)}>
          <span style={line(30, INK, 400)}>
            Both errors high<span style={{ opacity: ease(frame, closeAt - 2, 10) }}>, and close together</span>
          </span>
        </Say>

        {/* ── The unpruned tree's learning curves ── */}
        <Fade from={curvesAt - 4} out={treeOut}>
          <Say at={benchAt - 2} x={TREE.left} y={y(TREE.top) - h(92)}>
            <span style={line(24, INK_SOFT)}>Squared error on Friedman #1: 10 inputs, 5 of them noise</span>
          </Say>
          <Say at={benchAt + 4} x={TREE.left} y={y(TREE.top) - h(50)}>
            <div style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 22 }}>
              <span style={line(24, INK)}>Unpruned tree</span>
              <Key color={BAR}>training</Key>
              <Key color={INK}>validation</Key>
              <Key color={NOISE_C} dash>
                noise floor
              </Key>
            </div>
          </Say>
          <Axes
            x={{ lo: 0, hi: 1, a: TREE.left, b: TREE.right }}
            y={ty}
            xTicks={[]}
            yTicks={[0, 10, 20]}
            xTitle="training rows"
            at={curvesAt}
          />
          <Svg opacity={ease(frame, curvesAt + 8, 12)}>
            {SIZE_TICKS.map((v) => (
              <line key={v} x1={atLog(tx, v)} x2={atLog(tx, v)} y1={y(TREE.bottom) + 1} y2={y(TREE.bottom) + 7} stroke={INK} strokeWidth={1.2} />
            ))}
          </Svg>
          {SIZE_TICKS.map((v) => (
            <Say key={v} at={curvesAt + 8} x={atLog(tx, v)} y={y(TREE.bottom) + 10} width={90} align="center">
              <span style={{ ...label(20, INK_SOFT), ...TABULAR }}>{v.toLocaleString("en-US")}</span>
            </Say>
          ))}
          {/* The noise floor: what no model gets under. */}
          <Svg opacity={ease(frame, curvesAt + 10, 12)}>
            <line x1={TREE.left} x2={TREE.right} y1={at(ty, FIT.noise)} y2={at(ty, FIT.noise)} stroke={NOISE_C} strokeWidth={2.4} strokeDasharray="7 6" />
          </Svg>
          <Svg opacity={gapP * 0.9 * (1 - ease(frame, q3At - 6, 12))}>
            <polygon points={gapPoly} fill={HIGHLIGHT} style={{ clipPath: `inset(0 ${(1 - gapP) * 100}% 0 0)` }} />
          </Svg>
          <LearningCurves c={FIT.tree} box={TREE} at={zeroAt} valAt={valAt} y={y} />
          <Say at={stillAt - 2} x={lastX + 16} y={at(ty, FIT.tree.validation[last]) - 16}>
            <span style={{ ...line(23, INK), ...TABULAR }}>{fmt(FIT.tree.validation[last], 1)}</span>
          </Say>
          <Say at={valAt + 6} x={atLog(tx, sizes[0]) + 22} y={at(ty, FIT.tree.validation[0]) - 30}>
            <span style={{ ...line(23, INK), ...TABULAR }}>{fmt(FIT.tree.validation[0], 1)}</span>
          </Say>
          <Say at={gapAt + 2} x={atLog(tx, 300) - 10} y={at(ty, 6.6)} out={q3At - 6}>
            <span style={line(26, LIT_INK)}>variance</span>
          </Say>
          {/* Still closing: the gap's right end, an arrow down toward training. */}
          <StraightArrow from={[lastX + 34, at(ty, FIT.tree.validation[last]) + 30]} to={[lastX + 34, at(ty, 1.6)]} at={closingAt} out={q3At - 6} color={LIT_LINE} width={3} />
          <Say at={closingAt + 4} x={lastX + 52} y={at(ty, 4.6)} out={q3At - 6}>
            <span style={line(23, LIT_INK)}>still closing</span>
          </Say>
        </Fade>

        {/* ── What the curves say, right of them, until the fixes ── */}
        {[
          { at: zeroAt, text: <><b style={{ color: BLUE_INK, fontWeight: 500 }}>Training error:</b> 0 at every size</> },
          { at: stillAt, text: <><b style={{ fontWeight: 500 }}>Validation error:</b> still falling at 2,000 rows</> },
          { at: gapAt, text: <><b style={{ color: LIT_INK, fontWeight: 500 }}>The gap:</b> variance</> },
          { at: helpAt, text: <>Still closing: more data will help</> },
        ].map((r, i) => (
          <Say key={i} at={r.at - 2} x={1110} y={y(TREE.top) - h(20) + i * h(82) + 28} out={fixes[0].at - 10}>
            <span style={line(28, INK, 400)}>{r.text}</span>
          </Say>
        ))}

        {/* ── The fixes, right of the curves ── */}
        <Say at={fixes[0].at - 8} x={1110} y={y(TREE.top) - h(92)} out={q3At - 6}>
          <span style={line(24, INK_SOFT)}>How to combat it</span>
        </Say>
        <RuledList items={fixes} x={1110} top={y(TREE.top) - h(20)} width={620} pitch={h(82)} size={30} out={q3At - 6} />

        {/* ── The straight line beside it: two curves that meet ── */}
        <Fade from={lineAt - 6} out={addAt - 6}>
          <ColumnRule x={(TREE.right + LINE.left) / 2} top={y(TREE.top) - h(50)} height={y(TREE.bottom) - y(TREE.top) + h(50)} at={lineAt} />
          <Say at={lineAt - 2} x={LINE.left} y={y(LINE.top) - h(50)}>
            <div style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 22 }}>
              <span style={line(24, INK)}>Straight line, same data</span>
              <Key color={BAR}>training</Key>
              <Key color={INK}>validation</Key>
            </div>
          </Say>
          <Axes x={{ lo: 0, hi: 1, a: LINE.left, b: LINE.right }} y={ly} xTicks={[]} yTicks={[0, 10, 20]} xTitle="training rows" at={lineAt} />
          <Svg opacity={ease(frame, lineAt + 8, 12)}>
            {SIZE_TICKS.map((v) => (
              <line key={v} x1={atLog(lx, v)} x2={atLog(lx, v)} y1={y(LINE.bottom) + 1} y2={y(LINE.bottom) + 7} stroke={INK} strokeWidth={1.2} />
            ))}
            <line x1={LINE.left} x2={LINE.right} y1={at(ly, FIT.noise)} y2={at(ly, FIT.noise)} stroke={NOISE_C} strokeWidth={2.4} strokeDasharray="7 6" />
          </Svg>
          {SIZE_TICKS.map((v) => (
            <Say key={v} at={lineAt + 8} x={atLog(lx, v)} y={y(LINE.bottom) + 10} width={90} align="center">
              <span style={{ ...label(20, INK_SOFT), ...TABULAR }}>{v.toLocaleString("en-US")}</span>
            </Say>
          ))}
          <LearningCurves c={FIT.linear} box={LINE} at={lineAt + 6} valAt={meetAt - 10} y={y} />
          <Svg opacity={bP}>
            <path
              d={`M${bx - 10},${bTop} L${bx},${bTop} L${bx},${bTop + (bBottom - bTop) * bP} L${bx - 10},${bTop + (bBottom - bTop) * bP}`}
              fill="none"
              stroke={LIT_LINE}
              strokeWidth={3.4}
            />
          </Svg>
          <Say at={sevenAt + 10} x={bx + 14} y={(bTop + bBottom) / 2 - 18}>
            <span style={line(26, LIT_INK)}>bias</span>
          </Say>
          <Say at={sevenAt} x={LINE.left + 190} y={at(ly, 16)}>
            <span style={line(23, INK)}>
              both near <span style={TABULAR}>7</span>
              <span style={{ opacity: ease(frame, moveAt - 2, 10) }}>, and more rows won’t move them</span>
            </span>
          </Say>
        </Fade>

        {/* ── Underfitting's fixes, where the tree was; then features ── */}
        <Say at={needs[0].at - 8} x={X0} y={y(TREE.top) - h(92)}>
          <span style={line(24, INK_SOFT)}>What it needs</span>
        </Say>
        <RuledList
          items={needs.map((f, i) => ({ ...f, lit: i === 3 ? addAt : undefined }))}
          x={X0}
          top={y(TREE.top) - h(20)}
          width={720}
          pitch={h(82)}
          size={30}
        />
        <Fade from={addAt - 4}>
          <Say at={addAt - 2} x={BAR_L} y={y(TREE.top) - h(92)}>
            <span style={line(24, INK_SOFT)}>The line’s squared error on 1,000 new rows</span>
          </Say>
          {bars.map((b, i) => {
            const top = y(TREE.top) + h(20) + i * h(150);
            const g = ease(frame, b.at - 4, 18);
            return (
              <React.Fragment key={i}>
                <Say at={b.at - 6} x={BAR_L} y={top}>
                  <span style={line(26, INK)}>{b.name}</span>
                </Say>
                <div
                  style={{
                    position: "absolute",
                    left: BAR_L,
                    top: top + h(48),
                    width: (b.v / 7.5) * BAR_MAX * g,
                    height: h(46),
                    background: b.color,
                    borderRadius: "0 4px 4px 0",
                  }}
                />
                <Say at={b.at + 4} x={BAR_L + (b.v / 7.5) * BAR_MAX + 18} y={top + h(48) + h(6)}>
                  <span style={{ ...line(30, b.ink), ...TABULAR }}>{fmt(b.v, 1)}</span>
                </Say>
              </React.Fragment>
            );
          })}
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
