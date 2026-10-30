import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Bars } from "../../editorial/charts";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, TABULAR, fmt, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MEDIAN } from "./data";
import { at, Axes, Bracket, Drift, ElbowArrow, Mark, OK, OK_INK, type Scale, VLine } from "./parts";

const LEFT = 200;
const RIGHT_EDGE = 1700;
const BASE = 840;
const TOP = 360;
const HI = 116;

/**
 * Question 1. The video's own 500 orders, right-skewed: the bars rise left to
 * right, the median goes in at 23.11, then the mean at 26.58, pulled right by
 * the tail; 181 orders lie above it.
 */
export const MedianScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("median").from;
  const qAt = n.word("median", "Question");
  const textAt = n.word("median", "When would");
  const asked = n.beat("median").to;
  const ordersAt = n.word("median-skew", "five hundred orders");
  const smallAt = n.word("median-skew", "Most are small");
  const tailAt = n.word("median-skew", "a long tail");
  const medianAt = n.word("median-pull", "The median order");
  const meanAt = n.word("median-pull", "The mean");
  const draggedAt = n.word("median-pull", "dragged to the right");
  const aboveAt = n.word("median-pull", "Only a hundred and eighty-one");
  const incomeAt = n.word("median-both", "Income");
  const typicalAt = n.word("median-report", "the typical value");
  const totalAt = n.word("median-report", "the mean when you need a total");
  const gapAt = n.word("median-report", "the gap");
  const end = n.beat("corr-in").to;

  const xs: Scale = { lo: 0, hi: HI, a: LEFT, b: RIGHT_EDGE };
  const tallest = Math.max(...MEDIAN.counts);
  const unit = (h(BASE) - h(TOP) - h(30)) / tallest;
  const ys: Scale = { lo: 0, hi: tallest, a: y(BASE), b: y(BASE) - tallest * unit };
  const bins = MEDIAN.counts.length;
  // Bars rise left to right from "five hundred orders" to "a long tail".
  const growAt = (i: number) => ordersAt + ((tailAt - ordersAt) * i) / bins;
  const mx = at(xs, MEDIAN.median);
  const ax = at(xs, MEDIAN.mean);
  const tailFrom = at(xs, 60);
  const tailTo = at(xs, MEDIAN.max);
  const lineTop = y(TOP) - h(10);
  const labelY = y(TOP) - h(52);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={ordersAt} level={-34} />
      <Sfx name="el-pop" at={medianAt + 4} level={-32} />
      <Sfx name="el-scratch" at={draggedAt} level={-32} />
      <Sfx name="el-pop" at={gapAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          When would you report the median instead of the mean?
        </QuestionCard>

        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 20, 40, 60, 80, 100]}
          xFormat={(v) => `$${v}`}
          xTitle={`${MEDIAN.count} orders, by value`}
          at={asked - 6}
        />
        <Bars
          counts={MEDIAN.counts}
          lo={0}
          bin={MEDIAN.bin}
          scale={{ lo: 0, hi: HI, x0: LEFT, x1: RIGHT_EDGE }}
          base={y(BASE)}
          unit={unit}
          grow={(i) => Math.min(1, Math.max(0, (frame - growAt(i)) / 10))}
          color={BAR}
        />

        {/* ── The tail ── */}
        <ElbowArrow
          points={[
            [tailFrom, y(BASE) - h(150)],
            [tailTo + 10, y(BASE) - h(150)],
          ]}
          at={tailAt + 2}
          dur={20}
          color={INK_SOFT}
          width={2.4}
          out={medianAt}
        />
        <Note at={tailAt + 4} x={tailFrom} y={y(BASE) - h(200)} out={medianAt}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>a long tail, past $100</span>
        </Note>
        <Note at={smallAt} x={at(xs, 34)} y={y(TOP) + h(40)} out={medianAt}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>most are small</span>
        </Note>

        {/* ── Median, then mean ── */}
        <VLine
          x={mx}
          top={lineTop}
          bottom={y(BASE)}
          at={medianAt}
          color={OK}
          side="left"
          labelY={labelY}
          label={
            <span style={{ ...note(28, OK_INK), fontWeight: 650 }}>
              <Mark at={typicalAt} out={gapAt + 30}>
                median ${fmt(MEDIAN.median)}
              </Mark>
            </span>
          }
        />
        <VLine
          x={ax}
          top={lineTop}
          bottom={y(BASE)}
          at={meanAt}
          color={ACCENT}
          side="right"
          labelY={labelY}
          label={<span style={{ ...note(28, ACCENT_INK), fontWeight: 650 }}>mean ${fmt(MEDIAN.mean)}</span>}
        />
        <ElbowArrow
          points={[
            [ax + 14, y(TOP) + h(60)],
            [ax + 170, y(TOP) + h(60)],
          ]}
          at={draggedAt}
          color={ACCENT}
          width={2.6}
        />
        <Note at={draggedAt + 6} x={ax + 190} y={y(TOP) + h(40)}>
          <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap" }}>dragged right by the tail</span>
        </Note>
        <Note at={aboveAt - 2} x={ax + 30} y={y(TOP) + h(110)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap", ...TABULAR }}>
            only <b>{MEDIAN.above}</b> of {MEDIAN.count} orders are above it
          </span>
        </Note>

        {/* When the mean is still the number: anything that has to add up. */}
        <Note at={totalAt - 2} x={ax + 30} y={y(TOP) + h(160)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
            the mean for a total: revenue = mean order × orders
          </span>
        </Note>
        <Note at={incomeAt - 2} x={1180} y={y(TOP) + h(220)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>also skewed: income, house prices,</span>
          <br />
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>session lengths</span>
        </Note>
        <Bracket x0={mx} x1={ax} y={labelY - h(16)} up at={gapAt} color={INK}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>the gap</span>
        </Bracket>
      </Drift>
    </AbsoluteFill>
  );
};
