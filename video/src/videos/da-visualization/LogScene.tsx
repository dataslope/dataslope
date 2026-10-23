import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOG } from "./data";
import { CATS, Drift, LineSet, PanelTitle, pulse, Verdict, YTicks } from "./parts";

const LEFT = { x0: 220, x1: 820 };
const RIGHT = { x0: 1080, x1: 1680 };
const BASE = 760;
const TOP = 430;
/** The linear panel's top: just above the larger series' last value. */
const LIN_HI = 9000;
/** The log panel spans 10 to 10,000, as powers of ten. */
const LOG_LO = 1;
const LOG_HI = 4;

/**
 * Question 8. The page's two series, twelve periods: 4,000 growing 6% a
 * period and 40 growing 35%. On a linear axis the small one lies along the
 * floor; on a log axis both are straight lines and the faster one is the
 * steeper, with the scale labeled.
 */
export const LogScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("log").from;
  const qAt = n.word("log", "Question", { nth: 1 });
  const textAt = n.word("log", "When does a log scale");
  const answerAt = n.word("log", "When the question is about");
  const magnitudeAt = n.word("log", "orders of magnitude");
  const oneAt = n.word("log-linear", "One series starts");
  const otherAt = n.word("log-linear", "The other starts at forty");
  const floorAt = n.word("log-linear", "a flat line along the floor");
  const logAxisAt = n.word("log-log", "On a log axis");
  const straightAt = n.word("log-log", "a straight line");
  const steeperAt = n.word("log-log", "the steeper line is the faster one");
  const labelAt = n.word("log-log", "Label the scale");
  const end = n.beat("dual-in").to;

  const base = y(BASE);
  const top = y(TOP);
  const [big, small] = LOG.series;
  const lift = pulse(frame, labelAt, 30);
  const periods = big.values.map((_, i) => (i % 3 === 0 ? String(i) : ""));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={oneAt} level={-34} />
      <Sfx name="el-scratch" at={floorAt} level={-32} />
      <Sfx name="el-pencil" at={logAxisAt + 4} level={-34} />
      <Sfx name="el-pop" at={steeperAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          When does a log scale earn its place?
        </QuestionCard>
        <Note at={answerAt} x={LEFT.x0} y={y(300)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            rates of change, or values that span <span style={{ opacity: ease(frame, magnitudeAt - 2, 10) }}>orders of magnitude</span>
          </span>
        </Note>

        {/* ── Linear ── */}
        <PanelTitle x={LEFT.x0} y={top - h(56)} at={answerAt + 6}>
          Linear axis
        </PanelTitle>
        <YTicks ticks={[0, 3000, 6000, 9000]} x={LEFT.x0} base={base} top={top} lo={0} hi={LIN_HI} at={answerAt + 8} format={(v) => v.toLocaleString("en-US")} />
        <LineSet values={big.values} x0={LEFT.x0} x1={LEFT.x1} base={base} top={top} lo={0} hi={LIN_HI} at={oneAt - 2} color={CATS[0]} dots={false} labels={periods} edges />
        <LineSet values={small.values} x0={LEFT.x0} x1={LEFT.x1} base={base} top={top} lo={0} hi={LIN_HI} at={otherAt - 2} color={CATS[3]} dots={false} axis={false} edges />
        <div style={{ position: "absolute", left: LEFT.x1 + 14, top: base - (big.values.at(-1)! / LIN_HI) * (base - top) - 14, ...label(20, INK), whiteSpace: "nowrap", opacity: ease(frame, oneAt + 20, 10), ...TABULAR }}>
          {big.start.toLocaleString("en-US")}, +{big.growthPct}%
        </div>
        <Verdict ok={false} x={LEFT.x0} y={base + h(50)} at={floorAt}>
          the small one: flat along the floor
        </Verdict>

        {/* ── Log ── */}
        <PanelTitle x={RIGHT.x0} y={top - h(56)} at={logAxisAt - 2}>
          Log axis
        </PanelTitle>
        <YTicks
          ticks={[1, 2, 3, 4]}
          x={RIGHT.x0}
          x1={RIGHT.x1}
          grid
          base={base}
          top={top}
          lo={LOG_LO}
          hi={LOG_HI}
          at={logAxisAt}
          format={(v) => (10 ** v).toLocaleString("en-US")}
          color={lift > 0.05 ? INK : INK_SOFT}
        />
        <LineSet values={big.values.map(Math.log10)} x0={RIGHT.x0} x1={RIGHT.x1} base={base} top={top} lo={LOG_LO} hi={LOG_HI} at={logAxisAt + 2} color={CATS[0]} dots={false} labels={periods} edges />
        <LineSet values={small.values.map(Math.log10)} x0={RIGHT.x0} x1={RIGHT.x1} base={base} top={top} lo={LOG_LO} hi={LOG_HI} at={straightAt - 2} color={CATS[3]} dots={false} axis={false} edges />
        <Note at={steeperAt - 2} x={RIGHT.x1 + 14} y={base - ((Math.log10(small.values.at(-1)!) - LOG_LO) / (LOG_HI - LOG_LO)) * (base - top) - 14}>
          <span style={{ ...label(20, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {small.start}, +{small.growthPct}%
          </span>
        </Note>
        <Verdict ok x={RIGHT.x0} y={base + h(50)} at={steeperAt}>
          steady growth is straight; steeper is faster
        </Verdict>
        <Note at={labelAt - 2} x={RIGHT.x0} y={base + h(96)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>label it, or it reads as linear</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
