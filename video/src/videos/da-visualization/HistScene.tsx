import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BINS, TICKETS } from "./data";
import { BarSet, Drift, PanelTitle, pulse, Verdict, XTicks, YTicks } from "./parts";

const LEFT = { x0: 150, x1: 760, lo: 0, hi: 160 };
const RIGHT = { x0: 960, x1: 1760, lo: 0, hi: 120 };
const BASE = 760;
const TOP = 420;
/** Question 5's three panels, wide to narrow; the right width sits between. */
const PANELS = [
  { x0: 140, x1: 620 },
  { x0: 720, x1: 1200 },
  { x0: 1300, x1: 1780 },
];
const P_BASE = 740;
const P_TOP = 440;

/**
 * Questions 4 and 5. The page's 420 tickets twice: as a bar chart by channel,
 * whose bars stand apart and can be put in any order (they arrive
 * alphabetical and are sorted on "sort them"), and as a histogram of hours
 * to resolve, whose bars touch along a number line. Then one bimodal sample
 * in the page's three bin widths, on a shared density axis.
 */
export const HistScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hist").from;
  const qAt = n.word("hist", "Question");
  const textAt = n.word("hist", "What's the difference");
  const comparesAt = n.word("hist-bar", "A bar chart compares categories");
  const ticketsAt = n.word("hist-bar", "four hundred twenty");
  const gapsAt = n.word("hist-bar", "The bars have gaps");
  const sortAt = n.word("hist-bar", "sort them");
  const binsAt = n.word("hist-hist", "A histogram bins");
  const hoursAt = n.word("hist-hist", "by hours to resolve");
  const touchAt = n.word("hist-hist", "The bars touch");
  const fixedAt = n.word("hist-hist", "their order is fixed");
  const numberAt = n.word("hist-hist", "the axis is a number");
  const q5At = n.word("bins", "Question five");
  const q5TextAt = n.word("bins", "How do you choose");
  const tryAt = n.word("bins", "Try several");
  const fiveAt = n.word("bins", "Bins five wide");
  const fuseAt = n.word("bins", "fuse two peaks");
  const quarterAt = n.word("bins", "a quarter wide");
  const spikesAt = n.word("bins", "into spikes");
  const oneAt = n.word("bins", "At one");
  const clearAt = n.word("bins", "both peaks are clear");
  const rulesAt = n.word("bins-rule", "Rules of thumb");
  const startAt = n.word("bins-rule", "a place to start");
  const reportAt = n.word("bins-rule", "Report the shape");
  const end = n.beat("axis-in").to;

  const out4 = q5At - 4;
  const base = y(BASE);
  const top = y(TOP);

  // The channels arrive in alphabetical order and are sorted, largest first,
  // on "sort them": a bar chart's order is the author's to choose.
  const sorted = TICKETS.byChannel;
  const alpha = [...sorted].sort((a, b) => a.key.localeCompare(b.key));
  const band = (LEFT.x1 - LEFT.x0) / sorted.length;
  const bw = band * 0.62;
  const s = ease(frame, sortAt, 22);
  const yOf = (v: number) => base - (v / LEFT.hi) * (base - top);
  const leftP = ease(frame, comparesAt, 12) * (1 - ease(frame, out4, 10));

  // Histogram tick numbers lift when the narration says the order is fixed.
  const lift = pulse(frame, fixedAt, 30);
  const p = (i: number) => ({ ...PANELS[i], base: y(P_BASE), top: y(P_TOP), lo: 0, hi: 0.2 });
  const [wide, mid, narrow] = BINS.panels;
  const reportLift = pulse(frame, reportAt, 30);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={comparesAt} level={-34} />
      <Sfx name="el-tap" at={gapsAt} level={-34} />
      <Sfx name="el-whoosh" at={sortAt} level={-34} />
      <Sfx name="el-pencil" at={binsAt} level={-34} />
      <Sfx name="el-pop" at={touchAt} level={-33} />
      <Sfx name="el-pencil" at={fiveAt} level={-34} />
      <Sfx name="el-scratch" at={fuseAt + 6} level={-33} />
      <Sfx name="el-scratch" at={spikesAt + 4} level={-33} />
      <Sfx name="el-chime" at={clearAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={out4} size={60}>
          What&apos;s the difference between a histogram and a bar chart?
        </QuestionCard>
        <QuestionCard n={5} at={q5At} textAt={q5TextAt - 2} size={60}>
          How do you choose a histogram&apos;s bin width?
        </QuestionCard>

        {/* ── Question 4, left: a bar chart of categories ── */}
        <PanelTitle x={LEFT.x0} y={top - h(70)} at={comparesAt} out={out4}>
          A bar chart: {TICKETS.n} tickets by channel
        </PanelTitle>
        <YTicks ticks={[0, 50, 100, 150]} x={LEFT.x0} base={base} top={top} lo={LEFT.lo} hi={LEFT.hi} at={ticketsAt} out={out4} />
        {leftP > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: leftP }}>
            <line x1={LEFT.x0} x2={LEFT.x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
            {alpha.map((c, i) => {
              const j = sorted.findIndex((d) => d.key === c.key);
              const x = LEFT.x0 + (i + (j - i) * s) * band + (band - bw) / 2;
              const g = ease(frame, ticketsAt - 4 + i * 2, 12);
              const yy = base - (base - yOf(c.count)) * g;
              const gap = i < alpha.length - 1 ? ease(frame, gapsAt, 10) * (1 - ease(frame, sortAt - 4, 8)) : 0;
              return (
                <g key={c.key}>
                  <rect x={x} y={yy} width={bw} height={base - yy} fill={BAR} />
                  {gap > 0 ? <rect x={x + bw} y={base - h(70)} width={band - bw} height={h(70)} fill={HIGHLIGHT} opacity={gap} /> : null}
                  <text x={x + bw / 2} y={base + 26} textAnchor="middle" style={{ ...label(19, INK), fill: INK }}>
                    {c.key}
                  </text>
                  <text x={x + bw / 2} y={yy - 10} textAnchor="middle" style={{ ...label(18, INK_SOFT), fill: INK_SOFT, ...TABULAR }} opacity={g}>
                    {c.count}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : null}
        <Note at={gapsAt + 2} out={out4} x={LEFT.x0} y={base + h(56)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>gaps: the bars are separate things</span>
        </Note>
        <Note at={sortAt + 10} out={out4} x={LEFT.x0} y={base + h(92)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>any order you like, here largest first</span>
        </Note>

        {/* ── Question 4, right: a histogram of a number ── */}
        <PanelTitle x={RIGHT.x0} y={top - h(70)} at={binsAt} out={out4}>
          A histogram: the same tickets, by hours to resolve
        </PanelTitle>
        <YTicks ticks={[0, 50, 100]} x={RIGHT.x0} base={base} top={top} lo={RIGHT.lo} hi={RIGHT.hi} at={hoursAt} out={out4} />
        <BarSet values={TICKETS.bins.map((b) => b.count)} x0={RIGHT.x0} x1={RIGHT.x1} base={base} top={top} lo={RIGHT.lo} hi={RIGHT.hi} at={hoursAt - 4} step={1} fill={1} edge out={out4} />
        <XTicks ticks={[0, 6, 12, 18, 24]} x0={RIGHT.x0} x1={RIGHT.x1} lo={0} hi={TICKETS.hoursMax} y={base + 26} at={hoursAt + 6} out={out4} format={(v) => `${v} h`} lift={lift} />
        <Note at={touchAt} out={out4} x={RIGHT.x0} y={base + h(56)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>no gaps: one continuous axis, cut into 2-hour bins</span>
        </Note>
        <Note at={numberAt} out={out4} x={RIGHT.x0} y={base + h(92)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>the order is the number line&apos;s, not yours</span>
        </Note>

        {/* ── Question 5: one sample, three bin widths, one density axis ── */}
        <Note at={tryAt} x={PANELS[0].x0} y={y(P_TOP) - h(118)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            the same {BINS.n.toLocaleString("en-US")} values, three bin widths, one density axis
          </span>
        </Note>
        <PanelTitle x={PANELS[0].x0} y={y(P_TOP) - h(66)} at={fiveAt - 2}>
          Bins {wide.width} wide
        </PanelTitle>
        <BarSet values={wide.density} {...p(0)} at={fiveAt} step={2} fill={1} edge />
        <XTicks ticks={[2, 12, 22]} x0={PANELS[0].x0} x1={PANELS[0].x1} lo={BINS.domain[0]} hi={BINS.domain[1]} y={y(P_BASE) + 26} at={fiveAt + 4} />
        <Verdict ok={false} x={PANELS[0].x0} y={y(P_BASE) + h(52)} at={fuseAt + 4}>
          one peak where there are two
        </Verdict>

        <PanelTitle x={PANELS[2].x0} y={y(P_TOP) - h(66)} at={quarterAt - 2}>
          Bins {narrow.width} wide
        </PanelTitle>
        <BarSet values={narrow.density} {...p(2)} at={quarterAt} step={0.25} fill={1} />
        <XTicks ticks={[2, 12, 22]} x0={PANELS[2].x0} x1={PANELS[2].x1} lo={BINS.domain[0]} hi={BINS.domain[1]} y={y(P_BASE) + 26} at={quarterAt + 4} />
        <Verdict ok={false} x={PANELS[2].x0} y={y(P_BASE) + h(52)} at={spikesAt + 2}>
          spikes, not a shape
        </Verdict>

        <PanelTitle x={PANELS[1].x0} y={y(P_TOP) - h(66)} at={oneAt - 2}>
          Bins {mid.width} wide
        </PanelTitle>
        <BarSet values={mid.density} {...p(1)} at={oneAt} step={1} fill={1} edge />
        <XTicks ticks={[2, 12, 22]} x0={PANELS[1].x0} x1={PANELS[1].x1} lo={BINS.domain[0]} hi={BINS.domain[1]} y={y(P_BASE) + 26} at={oneAt + 4} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${PANELS[1].x0}px ${y(P_BASE) + h(66)}px`, transform: `scale(${1 + 0.08 * reportLift})` }}>
          <Verdict ok x={PANELS[1].x0} y={y(P_BASE) + h(52)} at={clearAt}>
            both peaks clear
          </Verdict>
        </div>

        <Note at={rulesAt} x={PANELS[0].x0} y={y(P_BASE) + h(110)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>Sturges, Freedman–Diaconis: </span>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, startAt, 10) }}>a place to start, not a verdict</span>
        </Note>
        <Note at={reportAt + 4} x={PANELS[2].x0} y={y(P_BASE) + h(110)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>report the shape that survives</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
