import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LINE_BAR } from "./data";
import { Drift, Headline, Kicker, LineSet, Pie, pulse, Spot, Verdict, X0, YTicks } from "./parts";

const CX = 440;
const CY = 590;
const R = 190;
const PLOT = { x0: 170, x1: 900, base: 790, top: 420, lo: 150, hi: 300 };

/**
 * The opening, in this part's own figure rather than an earlier part's
 * tiles: one set of numbers, six weeks of tickets, drawn as a pie (true, and
 * no use) and then redrawn as a line (the same numbers, and the story). Then
 * how the video splits, as two counts under it.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const argumentAt = n.word("hook", "an argument");
  const pieAt = n.word("hook", "as a pie");
  const nothingAt = n.word("hook", "it tells you nothing");
  const lineAt = n.word("hook", "as a line");
  const storyAt = n.word("hook", "the story is there");
  const testAt = n.word("plan", "That's what these interviews test");
  const twentyAt = n.word("plan", "twenty-two questions");
  const twiceAt = n.word("plan", "seventeen of them twice");
  const shortAt = n.word("plan", "five short ones");
  const firstAt = n.word("choose-in", "First");
  const end = n.beat("choose-in").to;

  const V = LINE_BAR.values;
  const top = y(PLOT.top);
  const base = y(PLOT.base);
  const counts = [
    { at: twentyAt, big: "22", text: "questions", soft: false },
    { at: twiceAt, big: "17", text: "drawn twice: wrong, then right", soft: false },
    { at: shortAt, big: "5", text: "short ones", soft: true },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={pieAt} level={-34} />
      <Sfx name="el-scratch" at={nothingAt + 4} level={-32} />
      <Sfx name="el-pencil" at={lineAt + 2} level={-34} />
      <Sfx name="el-pop" at={storyAt} level={-32} />
      <Sfx name="el-tap" at={twentyAt} level={-34} />
      <Sfx name="el-pop" at={firstAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data analyst interview prep</Kicker>
        <Headline lead="Same numbers," turn="a different argument." at={from + 2} turnAt={argumentAt - 2} size={70} />
        <Spot id="da-visualization-duck" at={from + 4} left={1150} top={y(290)} width={640} height={460} />

        {/* ── Six weeks as a pie, then as a line ── */}
        <Pie values={V} cx={CX} cy={y(CY)} r={h(R)} at={pieAt - 4} out={lineAt - 2} labels={LINE_BAR.weeks} />
        <Verdict ok={false} x={CX + h(R) + 70} y={y(CY) - 16} at={nothingAt} out={lineAt - 2}>
          weeks as slices
        </Verdict>
        <YTicks ticks={[150, 200, 250, 300]} x={PLOT.x0} base={base} top={top} lo={PLOT.lo} hi={PLOT.hi} at={lineAt} />
        <LineSet values={V} x0={PLOT.x0} x1={PLOT.x1} base={base} top={top} lo={PLOT.lo} hi={PLOT.hi} at={lineAt - 2} dur={24} labels={LINE_BAR.weeks} />
        <Verdict ok x={PLOT.x1 - 220} y={top - h(50)} at={storyAt}>
          the same six, as a line
        </Verdict>

        {/* ── How the video splits ── */}
        <div style={{ position: "absolute", left: X0, top: y(850), display: "flex", gap: 48, alignItems: "baseline", opacity: ease(frame, testAt, 12) }}>
          {counts.map((c) => {
            const p = ease(frame, c.at - 2, 12);
            const lit = c.big === "17" ? pulse(frame, firstAt, 18) : 0;
            return (
              <span key={c.big} style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px) scale(${1 + 0.08 * lit})`, display: "inline-block", whiteSpace: "nowrap" }}>
                <span style={{ ...label(34, c.soft ? INK_SOFT : INK), fontWeight: 750, ...TABULAR }}>{c.big}</span>{" "}
                <span style={{ ...note(26, c.soft ? INK_SOFT : INK) }}>{c.text}</span>
              </span>
            );
          })}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
