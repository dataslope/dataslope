import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LINE_BAR, PIE } from "./data";
import { BarSet, CATS, Drift, LineSet, Mark, PanelTitle, Pie, Verdict } from "./parts";

const COLS = [
  { x0: 230, x1: 760 },
  { x0: 930, x1: 1460 },
];
const ROWS = [
  { base: 560, top: 400 },
  { base: 830, top: 670 },
];
const PIE_C = { x: 470, y: 600, r: 190 };
const SHARE_X = 1120;
const SHARE_UNIT = 18;
/** Question 2's note on choosing, right of the top row, past its ticks. */
const CHOOSE_X = 1530;

/**
 * Questions 2 and 3. The page's six values drawn four ways, a line and bars
 * over weeks and over issue types; only the line over issue types is wrong.
 * Over weeks both are honest, so a note beside them says how to choose.
 * Then the page's five shares as a pie, where S U V and truck look alike, and
 * as sorted bars, where their 1.5-point gap is plain.
 */
export const LineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("line").from;
  const qAt = n.word("line", "Question");
  const textAt = n.word("line", "Line chart or bar chart");
  const asked = n.beat("line").to;
  const passedAt = n.word("line-x", "passed through everything");
  const weeksAt = n.word("line-x", "true of weeks");
  const barsAt = n.word("line-x", "Bars work over weeks too");
  const honestAt = n.word("line-choose", "When both are honest");
  const neighbourAt = n.word("line-choose", "bars compare each week");
  const shapeAt = n.word("line-choose", "a line carries the shape");
  const longerAt = n.word("line-choose", "the longer the series");
  const typesAt = n.word("line-wrong", "six issue types");
  const trendAt = n.word("line-wrong", "draws a trend");
  const wrongAt = n.word("line-wrong", "the one wrong chart");
  const q3At = n.word("pie", "Question three");
  const q3TextAt = n.word("pie", "When is a pie chart");
  const fewAt = n.word("pie", "For a few slices");
  const fiveAt = n.word("pie", "Here are five shares");
  const sameAt = n.word("pie", "look the same");
  const sortedAt = n.word("pie-bar", "Sorted as bars");
  const gapAt = n.word("pie-bar", "the one and a half point gap");
  const neverAt = n.word("pie-bar", "never use pies");
  const end = n.beat("hist-in").to;

  const V = LINE_BAR.values;
  const out2 = q3At - 4;
  const panel = (r: number, c: number) => ({ ...COLS[c], base: y(ROWS[r].base), top: y(ROWS[r].top), lo: 0, hi: 300 });
  const P = [panel(0, 0), panel(0, 1), panel(1, 0), panel(1, 1)];

  // The shares, largest first, and the pair the narration names.
  const shares = [...PIE.shares].sort((a, b) => b.value - a.value);
  const pair = PIE.closest.pair;
  const total = PIE.total;
  let angle = -Math.PI / 2;
  const pieLabels = PIE.shares.map((s) => {
    const span = (s.value / total) * 2 * Math.PI;
    const mid = angle + span / 2;
    angle += span;
    return { s, x: PIE_C.x + h(PIE_C.r) * 1.28 * Math.cos(mid), y: y(PIE_C.y) + h(PIE_C.r) * 1.28 * Math.sin(mid) };
  });

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={passedAt} level={-34} />
      <Sfx name="el-tap" at={barsAt} level={-34} />
      <Sfx name="el-scratch" at={wrongAt} level={-32} />
      <Sfx name="el-pencil" at={fewAt} level={-34} />
      <Sfx name="el-pop" at={gapAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} out={out2} size={60}>
          Line chart or bar chart?
        </QuestionCard>
        <QuestionCard n={3} at={q3At} textAt={q3TextAt - 2} size={60}>
          When is a pie chart appropriate?
        </QuestionCard>

        {/* ── Question 2: the same six numbers, four ways ── */}
        <PanelTitle x={COLS[0].x0} y={y(ROWS[0].top) - h(62)} at={asked - 6} out={out2}>
          As a line, over six weeks
        </PanelTitle>
        <LineSet values={V} {...P[0]} at={asked - 4} labels={LINE_BAR.weeks} out={out2} />
        <Verdict ok x={COLS[0].x1 + 20} y={y(ROWS[0].top)} at={weeksAt} out={out2} />
        <PanelTitle x={COLS[1].x0} y={y(ROWS[0].top) - h(62)} at={barsAt - 4} out={out2}>
          As bars, over six weeks
        </PanelTitle>
        <BarSet values={V} {...P[1]} at={barsAt - 2} labels={LINE_BAR.weeks} out={out2} />
        <Verdict ok x={COLS[1].x1 + 20} y={y(ROWS[0].top)} at={barsAt + 10} out={out2} />
        <Note at={honestAt - 2} out={out2} x={CHOOSE_X} y={y(ROWS[0].top) - h(4)}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>both honest, so choose:</span>
        </Note>
        <Note at={neighbourAt} out={out2} x={CHOOSE_X} y={y(ROWS[0].top) + h(36)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>bars compare neighbours,</span>
        </Note>
        <Note at={shapeAt} out={out2} x={CHOOSE_X} y={y(ROWS[0].top) + h(72)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>a line carries the shape;</span>
        </Note>
        <Note at={longerAt} out={out2} x={CHOOSE_X} y={y(ROWS[0].top) + h(108)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>longer series: the line</span>
        </Note>
        <PanelTitle x={COLS[0].x0} y={y(ROWS[1].top) - h(62)} at={typesAt - 4} out={out2}>
          As a line, over six issue types
        </PanelTitle>
        <LineSet values={V} {...P[2]} at={trendAt - 4} labels={LINE_BAR.types} out={out2} />
        {/* The cross sits beside its chart like the ticks; its words go under it, clear of the bars. */}
        <Verdict ok={false} x={COLS[0].x1 + 20} y={y(ROWS[1].top)} at={wrongAt} out={out2} />
        <Note at={wrongAt + 4} out={out2} x={COLS[0].x0} y={y(ROWS[1].base) + h(46)}>
          <span style={{ ...label(22, ACCENT_INK), whiteSpace: "nowrap" }}>a trend through no order</span>
        </Note>
        <PanelTitle x={COLS[1].x0} y={y(ROWS[1].top) - h(62)} at={typesAt} out={out2}>
          As bars, over six issue types
        </PanelTitle>
        <BarSet values={V} {...P[3]} at={typesAt + 2} labels={LINE_BAR.types} out={out2} />
        <Verdict ok x={COLS[1].x1 + 20} y={y(ROWS[1].top)} at={wrongAt + 8} out={out2} />

        {/* ── Question 3: five shares, as a pie and as bars ── */}
        <Pie values={PIE.shares.map((s) => s.value)} cx={PIE_C.x} cy={y(PIE_C.y)} r={h(PIE_C.r)} at={fewAt} colors={CATS} />
        {pieLabels.map(({ s, x, y: ly }) => (
          <div
            key={s.key}
            style={{
              position: "absolute",
              left: x - 120,
              width: 240,
              top: ly - 16,
              textAlign: "center",
              ...label(21, INK),
              whiteSpace: "nowrap",
              opacity: ease(frame, fiveAt + 18, 10),
              ...TABULAR,
            }}
          >
            {pair.includes(s.key) ? <Mark at={sameAt}>{s.key}</Mark> : s.key}
          </div>
        ))}
        <Note at={fewAt} x={PIE_C.x - 200} y={y(PIE_C.y) + h(PIE_C.r) + h(50)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>pies: two to four slices of one whole</span>
        </Note>
        {shares.map((s, i) => {
          const p = ease(frame, sortedAt + i * 3, 14);
          const top = y(410) + i * h(78);
          const hot = pair.includes(s.key) ? ease(frame, gapAt, 12) : 0;
          return (
            <React.Fragment key={s.key}>
              <div style={{ position: "absolute", left: SHARE_X - 160, top: top + 4, width: 140, textAlign: "right", ...note(26, INK), opacity: p }}>
                {s.key}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: SHARE_X,
                  top,
                  width: s.value * SHARE_UNIT * p,
                  height: h(42),
                  background: BAR,
                  boxShadow: hot > 0 ? `0 0 0 ${4 * hot}px ${HIGHLIGHT}` : undefined,
                }}
              />
              <div style={{ position: "absolute", left: SHARE_X + s.value * SHARE_UNIT * p + 14, top: top + 4, ...label(23, INK), opacity: ease(frame, sortedAt + 8 + i * 3, 10), ...TABULAR }}>
                {fmt(s.value, s.value % 1 ? 1 : 0)}%
              </div>
            </React.Fragment>
          );
        })}
        <Note at={gapAt + 6} x={SHARE_X} y={y(410) + 5 * h(78) + h(4)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {pair[0]} and {pair[1]}: {fmt(PIE.closest.gap, 1)} points apart
          </span>
        </Note>
        <Note at={neverAt} x={SHARE_X} y={y(410) + 5 * h(78) + h(48)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>not for groups, not over time</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
