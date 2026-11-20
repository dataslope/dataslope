import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, type Cubic, cubicPath, lineLength, sampleCubic } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, halo, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LAG, LAG_WRONG } from "./data";
import { Drift, OK_INK, QMono, SyntaxBreak, type SynPart, X0 } from "./parts";

const CX0 = 210;
const CX1 = 1700;
const VMIN = 80;
const VMAX = 400;
const NOTE_X = 1250;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** An arc from one point to another over the chart, drawn from its tail,
 *  its head on the straight drop into the later month. */
const Arc: React.FC<{ from: readonly [number, number]; to: readonly [number, number]; peak: number; at: number; color: string; width?: number; out?: number; opacity?: number }> = ({
  from,
  to,
  peak,
  at,
  color,
  width = 2.6,
  out,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const head = 13;
  const curve: Cubic = [from, [from[0], peak], [to[0], peak], to];
  const line = sampleCubic(curve);
  const len = lineLength(line);
  const reach = (len - head + 1) / len;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * opacity }}>
      <path d={cubicPath(curve)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      <path d={arrowHead(line, head, 7, { filled: true })} fill={color} opacity={ease(frame, at + 12, 5)} />
    </svg>
  );
};

/**
 * Question 8 on the page's 24 months of revenue. The page's breakdown of
 * revenue - LAG(revenue) OVER (...), then the months as a line: the first
 * month's change null; January 2024 against December's peak (-285) and,
 * with LAG(revenue, 12), against January a year earlier (-45). Then March
 * 2023 taken out: the twelve-back arrows slide a month, eight of them now
 * land on the wrong month, March 2024's on February 2023.
 */
export const LagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("lag").from;
  const qAt = n.word("lag", "Question eight");
  const textAt = n.word("lag", "How do you compute");
  const pullsAt = n.word("lag-how", "Lag pulls the previous row's value");
  const ontoAt = n.word("lag-how", "onto the current one");
  const minusAt = n.word("lag-how", "revenue minus lag");
  const selfAt = n.word("lag-how", "no self join");
  const firstAt = n.word("lag-how", "The first month");
  const nullAt = n.word("lag-how", "its change is null");
  const momAt = n.word("lag-season", "Month over month");
  const fallsAt = n.word("lag-season", "falls two hundred eighty-five");
  const twelveAt = n.word("lag-season", "Lag twelve compares it");
  const downAt = n.word("lag-season", "down forty-five");
  const rowsAt = n.word("lag-gap", "lag counts rows, not months");
  const takeAt = n.word("lag-gap", "Take out March 2023");
  const eightAt = n.word("lag-gap", "eight comparisons land on the wrong month");
  const marchAt = n.word("lag-gap", "March 2024 against February 2023");
  const spineAt = n.word("lag-gap", "Put the months on a spine first");
  const end = n.beat("lag-gap").to;

  const M = LAG.yoy;
  const months = M.rows.map((r) => r[0]);
  const rev = M.rows.map((r) => Number(r[1]));
  const pitch = (CX1 - CX0) / (months.length - 1);
  const px = (i: number) => CX0 + i * pitch;
  const py0 = y(530);
  const py1 = y(805);
  const py = (v: number) => py1 - ((v - VMIN) / (VMAX - VMIN)) * (py1 - py0);
  const at = (iso: string) => months.indexOf(iso);
  const pt = (i: number): [number, number] => [px(i), py(rev[i])];
  const jan24 = at("2024-01-01");
  const dec23 = at("2023-12-01");
  const jan23 = at("2023-01-01");
  const mar23 = at("2023-03-01");
  const mar24 = at("2024-03-01");
  const peak = py0 - 86;
  const wrongMarch = LAG_WRONG.find((w) => w.month === "2024-03-01");
  if (!wrongMarch) throw new Error("no wrong comparison for March 2024");
  const rightMarch = M.rows[mar24][M.cols.indexOf("yoy_change")];
  const top = (i: number): [number, number] => [px(i), py(rev[i]) - 12];

  // The line with every month, and the line once March 2023 is gone.
  const all = rev.map((_, i) => pt(i));
  const gapped = all.filter((_, i) => i !== mar23);
  const pathOf = (pts: readonly (readonly [number, number])[]) => pts.map(([x, v], i) => `${i ? "L" : "M"}${x},${v}`).join(" ");
  const draw = ease(frame, qAt + 20, 40);
  const gone = ease(frame, takeAt + 10, 14);

  const parts: SynPart[] = [
    { text: "revenue -", at: minusAt, hot: { at: minusAt, out: selfAt } },
    { text: "LAG(revenue)", label: "the value one period back", at: pullsAt, row: 1, hot: { at: pullsAt, out: minusAt } },
    { text: "OVER (PARTITION BY region ORDER BY month)", label: "back within this region, by month", at: ontoAt + 6 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={qAt + 20} level={-35} />
      <Sfx name="el-pencil" at={pullsAt} level={-35} />
      <Sfx name="el-tap" at={nullAt} level={-33} />
      <Sfx name="el-whoosh" at={fallsAt} level={-35} />
      <Sfx name="el-whoosh" at={twelveAt + 4} level={-35} />
      <Sfx name="el-scratch" at={takeAt + 6} level={-33} />
      <Sfx name="el-sprinkle" at={eightAt + 4} level={-34} />
      <Sfx name="el-chime" at={spineAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you compute a period-over-period change?
        </QuestionCard>
        <SyntaxBreak parts={parts} x={X0} top={y(296)} at={pullsAt - 8} size={26} dim={momAt} />

        {/* ── The page's 24 months ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path d={pathOf(all)} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 1`} opacity={1 - gone} />
          <path d={pathOf(gapped)} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" opacity={gone} />
          {all.map(([x, v], i) => {
            const p = ease(frame, qAt + 20 + (i / all.length) * 40, 8);
            const red = i === mar23 ? ease(frame, takeAt, 8) : 0;
            const o = i === mar23 ? 1 - ease(frame, takeAt + 14, 12) : 1;
            return <circle key={i} cx={x} cy={v} r={6} fill={red > 0.5 ? ACCENT : BAR} stroke={PAPER} strokeWidth={2} opacity={p * o} />;
          })}
          {months.map((m, i) => (
            <line key={m} x1={px(i)} x2={px(i)} y1={py1 + 18} y2={py1 + 26} stroke={INK_SOFT} strokeWidth={1.5} opacity={ease(frame, qAt + 30, 12)} />
          ))}
          {[0, jan23, jan24, months.length - 1].map((i) => (
            <text key={i} x={px(i)} y={py1 + 54} textAnchor="middle" style={svgText({ ...label(20, INK_SOFT), ...TABULAR })} opacity={ease(frame, qAt + 34, 12)}>
              {monthName(months[i])}
            </text>
          ))}
          <text x={px(mar23)} y={py1 + 54} textAnchor="middle" style={svgText({ ...label(20, ACCENT_INK), ...TABULAR })} opacity={ease(frame, takeAt, 10)}>
            {monthName(months[mar23])}
          </text>
        </svg>

        {/* The first month: nothing before it. */}
        <Note at={nullAt - 2} x={px(0) - 20} y={py(rev[0]) - 64} out={momAt}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            change: <i style={{ color: INK_SOFT }}>null</i>
          </span>
        </Note>
        {/* One month back, the change written onto the later month. */}
        <Arc from={top(0)} to={top(1)} peak={py(rev[0]) - 56} at={ontoAt} color={INK} width={2.2} out={firstAt} />

        {/* ── January 2024: a month back, and twelve back ── */}
        <Arc from={top(dec23)} to={top(jan24)} peak={py(rev[dec23]) - 50} at={fallsAt - 4} color={ACCENT} out={takeAt} />
        <Note at={fallsAt + 4} x={px(jan24) + 18} y={py(rev[dec23]) - 40} out={takeAt}>
          <span style={{ ...note(24, ACCENT_INK), ...halo, whiteSpace: "nowrap", ...TABULAR }}>{LAG.january.mom}</span>
        </Note>
        <Arc from={top(jan23)} to={top(jan24)} peak={peak} at={twelveAt + 2} color={INK} out={takeAt} />
        <Note at={downAt - 2} x={(px(jan23) + px(jan24)) / 2 - 24} y={peak - 44} out={takeAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>{LAG.january.yoy}</span>
        </Note>
        <Note at={twelveAt + 6} x={NOTE_X} y={y(330)} out={takeAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <QMono>LAG(revenue, 12)</QMono>: a year back
          </span>
        </Note>

        {/* ── March 2023 gone: eight comparisons a month off ── */}
        {LAG_WRONG.map((w, k) => {
          const a = at(w.with);
          const b = at(w.month);
          const isMarch = w.month === "2024-03-01";
          return (
            <Arc
              key={w.month}
              from={top(a)}
              to={top(b)}
              peak={peak + (LAG_WRONG.length - 1 - k) * 6}
              at={isMarch ? marchAt : eightAt + k * 3}
              color={ACCENT}
              width={isMarch ? 3.2 : 1.8}
              opacity={isMarch ? 1 : 0.55}
            />
          );
        })}
        <Note at={rowsAt} x={NOTE_X} y={y(330)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Lag counts rows, not months</span>
        </Note>
        <Note at={eightAt + 2} x={NOTE_X} y={y(370)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>{LAG_WRONG.length} comparisons land on the wrong month</span>
        </Note>
        <Note at={marchAt + 6} x={px(mar24) - 120} y={peak - 50}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>
            {wrongMarch.change}, should be {rightMarch}
          </span>
        </Note>
        <Note at={spineAt} x={NOTE_X} y={y(410)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>Put the months on a spine first</span>
        </Note>
        <Note at={selfAt} x={NOTE_X} y={y(330)} out={momAt}>
          <span style={{ ...note(24, BLUE_INK), whiteSpace: "nowrap" }}>No self join</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
