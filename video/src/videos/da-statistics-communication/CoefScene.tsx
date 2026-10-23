import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SHAPE } from "./data";
import { at, Axes, Dots, Drift, OK_INK, type Scale, Svg } from "./parts";

const SCALE_Y = 430;
const R: Scale = { lo: -1, hi: 1, a: 420, b: 1500 };
const PANEL = { top: 570, base: 820 };
const U_X = { a: 260, b: 820 };
const E_X = { a: 1120, b: 1680 };

/** A point on the r scale, with its value written above it. */
const Marker: React.FC<{
  r: number;
  y: number;
  at: number;
  color: string;
  row: number;
  /** Which side of the marker the label sits: centred over it, or ending (or
   *  starting) at it, so two close markers' labels stay apart. */
  align?: "center" | "end" | "start";
  children: React.ReactNode;
}> = ({ r, y, at: from, color, row, align = "center", children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  if (p <= 0) return null;
  const x = at(R, r);
  const lift = 34 + row * 40;
  return (
    <>
      <Svg>
        <line x1={x} x2={x} y1={y - 8} y2={y - lift + 12} stroke={color} strokeWidth={2} opacity={p} />
        <circle cx={x} cy={y} r={9 * p} fill={color} />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: align === "center" ? x - 300 : align === "end" ? x + 16 - 600 : x - 16,
          width: 600,
          top: y - lift - 22,
          textAlign: align === "center" ? "center" : align === "end" ? "right" : "left",
          opacity: ease(frame, from + 4, 10),
          ...note(23, color),
          fontWeight: 650,
          whiteSpace: "nowrap",
          ...TABULAR,
        }}
      >
        {children}
      </div>
    </>
  );
};

/**
 * Question 3. The r scale from -1 to 1, then 41 points on a U (r = 0.00) and
 * on a rising curve (r = 0.81), each marked on the scale, and Spearman's 1.00
 * for the curve beside its Pearson.
 */
export const CoefScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("coef").from;
  const qAt = n.word("coef", "Question");
  const textAt = n.word("coef", "What's the difference");
  const ideaAt = n.word("coef-r", "Correlation is the idea");
  const numberAt = n.word("coef-r", "a number for it");
  const pearsonAt = n.word("coef-r", "Pearson's r");
  const lineAt = n.word("coef-r", "a straight line");
  const rangeAt = n.word("coef-r", "from minus one to one");
  const missAt = n.word("coef-u", "miss a pattern");
  const uAt = n.word("coef-u", "A perfect U");
  const zeroAt = n.word("coef-u", "scores zero");
  const curveAt = n.word("coef-curve", "a curve that only ever rises");
  const eightAt = n.word("coef-curve", "point eight one");
  const spearmanAt = n.word("coef-curve", "Spearman ranks");
  const perfectAt = n.word("coef-curve", "a perfect one");
  const useAt = n.word("coef-curve", "Use it when");
  const end = n.beat("bias-in").to;

  const sy = y(SCALE_Y);
  const scaleP = ease(frame, pearsonAt, 18);
  const ticks = [-1, -0.5, 0, 0.5, 1];

  const ys = (hi: number): Scale => ({ lo: 0, hi, a: y(PANEL.base), b: y(PANEL.top) });
  const uxs: Scale = { lo: -3, hi: 3, ...U_X };
  const exs: Scale = { lo: -3, hi: 3, ...E_X };
  const uys = ys(9);
  const eys = ys(Math.max(...SHAPE.e.map(([, v]) => v)));
  const uDots = SHAPE.u.map(([x, v], i) => ({ x: at(uxs, x), y: at(uys, v), at: uAt + i * 0.6 }));
  const eDots = SHAPE.e.map(([x, v], i) => ({ x: at(exs, x), y: at(eys, v), at: curveAt + i * 0.6 }));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={pearsonAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={uAt} level={-34} />
      <Sfx name="el-scratch" at={zeroAt + 2} level={-32} />
      <Sfx name="el-sprinkle" at={curveAt} level={-34} />
      <Sfx name="el-pop" at={perfectAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={56}>
          What&apos;s the difference between correlation and the correlation coefficient?
        </QuestionCard>

        <Note at={ideaAt - 2} x={96} y={y(300)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>correlation</b>: the idea, two things moving together
          </span>
        </Note>
        <Note at={numberAt - 2} x={960} y={y(300)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>the coefficient</b>: a number for it
          </span>
        </Note>

        {/* ── The r scale ── */}
        <Svg>
          <line x1={R.a} x2={R.a + (R.b - R.a) * scaleP} y1={sy} y2={sy} stroke={INK} strokeWidth={2} />
          {ticks.map((t) => (
            <g key={t} opacity={ease(frame, rangeAt + (t + 1) * 4, 10)}>
              <line x1={at(R, t)} x2={at(R, t)} y1={sy - 6} y2={sy + 6} stroke={INK} strokeWidth={1.4} />
              <text
                x={at(R, t)}
                y={sy + 34}
                textAnchor="middle"
                style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}
              >
                {t === 0 ? "0" : t < 0 ? `−${Math.abs(t)}` : String(t)}
              </text>
            </g>
          ))}
        </Svg>
        <Note at={pearsonAt} x={96} y={sy - 16}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>Pearson&apos;s r</span>
        </Note>
        <Note at={lineAt + 2} x={R.b + 40} y={sy - 16}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>how close to a straight line</span>
        </Note>

        {/* ── A U ── */}
        <Axes x={uxs} y={uys} xTicks={[-3, 0, 3]} xFormat={(v) => (v < 0 ? `−${-v}` : String(v))} xTitle="y = x²" at={missAt} />
        <Dots dots={uDots} r={6} color={ACCENT} opacity={0.8} />
        <Marker r={SHAPE.uPearson} y={sy} at={zeroAt} color={ACCENT_INK} row={0}>
          the U: r = {fmt(SHAPE.uPearson)}
        </Marker>

        {/* ── A curve that only rises ── */}
        <Axes x={exs} y={eys} xTicks={[-3, 0, 3]} xFormat={(v) => (v < 0 ? `−${-v}` : String(v))} xTitle="y = eˣ" at={curveAt - 4} />
        <Dots dots={eDots} r={6} color={BAR} opacity={0.8} />
        <Marker r={SHAPE.ePearson} y={sy} at={eightAt} color={BLUE_INK} row={0} align="end">
          the curve: r = {fmt(SHAPE.ePearson)}
        </Marker>
        <Marker r={SHAPE.eSpearman} y={sy} at={perfectAt} color={OK_INK} row={1} align="start">
          Spearman: {fmt(SHAPE.eSpearman)}
        </Marker>
        <Note at={spearmanAt} x={E_X.a} y={y(PANEL.top) - 10}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Spearman ranks the values first</span>
        </Note>

        <Note at={useAt - 2} x={96} y={y(492)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Spearman for <span style={{ color: OK_INK, fontWeight: 650 }}>monotonic, not straight</span>, or ordinal data
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
