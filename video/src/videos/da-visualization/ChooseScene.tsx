import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ENCODINGS } from "./data";
import { Drift, Svg, X0 } from "./parts";

const ROW0 = 350;
const PITCH = 92;
const GLYPH_X = 470;
const BAR_X = 1300;
const UNIT = 130;

/** A chart in miniature, 70 by 46, at (x, y). */
const Glyph: React.FC<{ kind: string; x: number; y: number; p: number }> = ({ kind, x, y, p }) => {
  const s = { stroke: BAR, strokeWidth: 3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const base = y + 46;
  return (
    <g opacity={p}>
      <line x1={x} x2={x + 70} y1={base} y2={base} stroke={INK} strokeWidth={1.4} />
      {kind === "line" ? <path d={`M${x + 4},${base - 8} L${x + 24},${base - 20} L${x + 44},${base - 16} L${x + 66},${base - 40}`} {...s} /> : null}
      {kind === "bar"
        ? [30, 42, 20].map((v, i) => <rect key={i} x={x + 6 + i * 22} y={base - v} width={14} height={v} fill={BAR} />)
        : null}
      {kind === "stack"
        ? [
            [18, 14, 10],
            [12, 20, 8],
          ].map((parts, i) => {
            let acc = 0;
            return parts.map((v, k) => {
              acc += v;
              return <rect key={`${i}${k}`} x={x + 12 + i * 30} y={base - acc} width={20} height={v} fill={BAR} opacity={1 - k * 0.3} />;
            });
          })
        : null}
      {kind === "hist" ? [10, 24, 38, 30, 16, 6].map((v, i) => <rect key={i} x={x + 4 + i * 10.5} y={base - v} width={10.5} height={v} fill={BAR} stroke="none" />) : null}
      {kind === "scatter"
        ? [
            [8, 10],
            [18, 14],
            [26, 22],
            [36, 20],
            [44, 30],
            [54, 34],
            [62, 40],
            [30, 30],
          ].map(([dx, dy], i) => <circle key={i} cx={x + dx} cy={base - dy} r={3.4} fill={BAR} />)
        : null}
    </g>
  );
};

/**
 * Question 1. Five kinds of question down the left, each meeting its chart
 * as it is named; then the encoding ranking the choice rests on, from
 * position (1.0) to colour (3.0), the error each carries relative to position.
 */
export const ChooseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("choose").from;
  const qAt = n.word("choose", "Question", { nth: 1 });
  const textAt = n.word("choose", "How do you choose");
  const startAt = n.word("choose-map", "Start from the question");
  const rows = [
    { at: n.word("choose-map", "Change over time"), q: "Change over time", chart: "line", glyph: "line" },
    { at: n.word("choose-map", "Comparing categories"), q: "Comparing categories", chart: "bar", glyph: "bar" },
    { at: n.word("choose-map", "A part of a whole"), q: "A part of a whole", chart: "stacked bar", glyph: "stack" },
    { at: n.word("choose-map", "A distribution"), q: "A distribution", chart: "histogram or box plot", glyph: "hist" },
    { at: n.word("choose-map", "a relationship"), q: "A relationship", chart: "scatter", glyph: "scatter" },
  ];
  const underAt = n.word("choose-rank", "how accurately people read");
  const rankAts = [
    n.word("choose-rank", "Position comes first"),
    n.word("choose-rank", "then length"),
    n.word("choose-rank", "angle"),
    n.word("choose-rank", "and area"),
    n.word("choose-rank", "color last"),
  ];
  const threeAt = n.word("choose-rank", "about three times");
  const end = n.beat("line-in").to;

  return (
    <AbsoluteFill>
      {rows.map((r) => (
        <Sfx key={r.q} name="el-tap" at={r.at} level={-34} />
      ))}
      <Sfx name="el-pop" at={threeAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you choose the right chart for a question?
        </QuestionCard>

        <Note at={startAt - 2} x={X0} y={y(ROW0 - 52)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>the question → the chart</span>
        </Note>
        {rows.map((r, i) => {
          const p = ease(frame, r.at - 2, 12);
          const top = y(ROW0) + i * h(PITCH);
          return (
            <React.Fragment key={r.q}>
              <div style={{ position: "absolute", left: X0, top: top + 8, ...note(28, INK), whiteSpace: "nowrap", opacity: p, transform: `translateX(${(1 - p) * -14}px)` }}>
                {r.q}
              </div>
              <Svg>
                <Glyph kind={r.glyph} x={GLYPH_X} y={top} p={ease(frame, r.at + 4, 12)} />
              </Svg>
              <div style={{ position: "absolute", left: GLYPH_X + 96, top: top + 10, ...label(25, INK), whiteSpace: "nowrap", opacity: ease(frame, r.at + 6, 12) }}>
                {r.chart}
              </div>
            </React.Fragment>
          );
        })}

        {/* ── How accurately each encoding is read ── */}
        <Note at={underAt - 2} x={1020} y={y(ROW0 - 52)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>judgement error, relative to position</span>
        </Note>
        {ENCODINGS.rows.map((e, i) => {
          const at0 = rankAts[i];
          const p = ease(frame, at0 - 2, 14);
          const top = y(ROW0) + i * h(PITCH);
          const last = i === ENCODINGS.rows.length - 1;
          return (
            <React.Fragment key={e.key}>
              <div style={{ position: "absolute", left: 1020, top: top + 8, width: 250, ...note(27, INK), opacity: ease(frame, at0 - 4, 10), whiteSpace: "nowrap" }}>
                {e.key}
              </div>
              <div style={{ position: "absolute", left: BAR_X, top: top + h(8), width: e.error * UNIT * p, height: h(34), background: last ? ds("blue", 300) : BAR, borderRadius: 2 }} />
              <div style={{ position: "absolute", left: BAR_X + e.error * UNIT * p + 12, top: top + 8, ...label(22, last ? ACCENT_INK : INK), opacity: ease(frame, at0 + 6, 10), ...TABULAR }}>
                {fmt(e.error, 1)}
              </div>
            </React.Fragment>
          );
        })}
        <Note at={threeAt - 2} x={1020} y={y(ROW0) + 5 * h(PITCH) + h(6)}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>
            color: about {fmt(ENCODINGS.colorVsPosition, 0)}× the error of position
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
