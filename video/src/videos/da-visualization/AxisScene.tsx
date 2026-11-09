import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, fmt, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BASELINE, TRUNCATION } from "./data";
import { BarSet, Drift, LineSet, Mark, PanelTitle, pulse, Verdict, YTicks } from "./parts";

const LEFT = { x0: 210, x1: 820 };
const RIGHT = { x0: 1080, x1: 1690 };
const BASE = 760;
const TOP = 430;

/**
 * Questions 6 and 7. The page's five team scores (94.1 to 99.0) as bars from
 * zero, nearly equal and honest, then from 94, where the top bar stands 50
 * times as tall as the bottom one. Then a year of scores on an axis from 92,
 * each panel drawn as the narration states its rule: as bars a 3.6% rise
 * draws the last bar 2.55 times as tall as the first; as a line it is a
 * slope, which is fine, with the axis labeled.
 */
export const AxisScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("axis").from;
  const qAt = n.word("axis", "Question");
  const textAt = n.word("axis", "How can a truncated");
  const asked = n.beat("axis").to;
  const fiveAt = n.word("axis-zero", "Five team scores");
  const equalAt = n.word("axis-zero", "look nearly equal");
  const honestAt = n.word("axis-zero", "which is honest");
  const cropAt = n.word("axis-crop", "Start the axis at ninety-four");
  const fiftyAt = n.word("axis-crop", "fifty times as tall");
  const lengthAt = n.word("axis-crop", "A bar's length is its value");
  const q7At = n.word("baseline", "Question seven");
  const q7TextAt = n.word("baseline", "So is a non-zero baseline");
  const barsRuleAt = n.word("baseline", "That rule is for bars");
  const positionAt = n.word("baseline", "by position, not length");
  const tallAt = n.word("baseline-show", "two and a half times as tall");
  const asLineAt = n.word("baseline-show", "As a line");
  const labelAt = n.word("baseline-show", "label the axis");
  // The bridge: the rule marked, the misleading bars dimmed.
  const bridgeAt = n.beat("log-in").from;
  const axisAt = n.word("log-in", "choice of axis");
  const end = n.beat("log-in").to;

  const base = y(BASE);
  const top = y(TOP);
  const out6 = q7At - 4;
  const T = TRUNCATION;
  const scores = T.bars.map((b) => b.value);
  const teams = T.bars.map((b) => b.key.replace("Team ", ""));
  const B = BASELINE;
  const lift = pulse(frame, labelAt, 30);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={fiveAt} level={-34} />
      <Sfx name="el-scratch" at={fiftyAt} level={-32} />
      <Sfx name="el-pencil" at={barsRuleAt + 2} level={-34} />
      <Sfx name="el-pencil" at={positionAt + 2} level={-34} />
      <Sfx name="el-scratch" at={tallAt} level={-32} />
      <Sfx name="el-pop" at={asLineAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={out6} size={60}>
          How can a truncated y axis mislead?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} size={60}>
          So is a non-zero baseline always wrong?
        </QuestionCard>

        {/* ── Question 6: the same five scores, from zero and from 94 ── */}
        <PanelTitle x={LEFT.x0} y={top - h(70)} at={asked - 6} out={out6}>
          From zero
        </PanelTitle>
        <YTicks ticks={[0, 25, 50, 75, 100]} x={LEFT.x0} base={base} top={top} lo={0} hi={T.top} at={asked - 4} out={out6} />
        <BarSet values={scores} labels={teams} x0={LEFT.x0} x1={LEFT.x1} base={base} top={top} lo={0} hi={T.top} at={fiveAt - 2} out={out6} />
        <Verdict ok x={LEFT.x0} y={base + h(50)} at={honestAt} out={out6}>
          about {fmt(T.realPct, 1)}% apart, and it looks it
        </Verdict>
        <Note at={equalAt} x={LEFT.x1 - 140} y={top - h(70)} out={out6}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>nearly equal</span>
        </Note>

        <PanelTitle x={RIGHT.x0} y={top - h(70)} at={cropAt - 4} out={out6}>
          From {T.crop}
        </PanelTitle>
        <YTicks ticks={[94, 96, 98, 100]} x={RIGHT.x0} base={base} top={top} lo={T.crop} hi={T.top} at={cropAt} out={out6} color={ACCENT_INK} />
        <BarSet values={scores} labels={teams} x0={RIGHT.x0} x1={RIGHT.x1} base={base} top={top} lo={T.crop} hi={T.top} at={cropAt + 2} out={out6} />
        <Verdict ok={false} x={RIGHT.x0} y={base + h(50)} at={fiftyAt} out={out6}>
          the top bar {T.croppedRatio} times as tall
        </Verdict>
        <Note at={lengthAt} x={RIGHT.x0} y={base + h(96)} out={out6}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>a bar&apos;s length is its value: bars start at zero</span>
        </Note>

        {/* ── Question 7: a year of scores on an axis from 92, each drawn as its rule is said ── */}
        <PanelTitle x={LEFT.x0} y={top - h(70)} at={barsRuleAt - 2}>
          As bars, from {B.floor}
        </PanelTitle>
        <PanelTitle x={RIGHT.x0} y={top - h(70)} at={positionAt - 2}>
          As a line, from {B.floor}
        </PanelTitle>
        <YTicks
          ticks={[92, 94, 96, 98]}
          x={LEFT.x0}
          base={base}
          top={top}
          lo={B.floor}
          hi={98}
          at={barsRuleAt}
          color={lift > 0.05 ? INK : INK_SOFT}
        />
        <BarSet values={B.score} labels={B.months.map((m) => m[0])} x0={LEFT.x0} x1={LEFT.x1} base={base} top={top} lo={B.floor} hi={98} at={barsRuleAt + 2} step={1} dim={axisAt - 4} />
        <Verdict ok={false} x={LEFT.x0} y={base + h(50)} at={tallAt}>
          bars are length: a {fmt(B.risePct, 1)}% rise, the last bar {fmt(B.barRatio, 2)} times as tall
        </Verdict>
        <YTicks
          ticks={[92, 94, 96, 98]}
          x={RIGHT.x0}
          base={base}
          top={top}
          lo={B.floor}
          hi={98}
          at={positionAt}
          color={lift > 0.05 ? INK : INK_SOFT}
        />
        <LineSet values={B.score} x0={RIGHT.x0} x1={RIGHT.x1} base={base} top={top} lo={B.floor} hi={98} at={positionAt + 2} labels={B.months.map((m) => m[0])} />
        <Verdict ok x={RIGHT.x0} y={base + h(50)} at={asLineAt + 10}>
          lines are position: a slope you can read
        </Verdict>
        {/* The rule is for both panels, so it sits under both. */}
        <Note at={labelAt - 2} x={LEFT.x0} y={base + h(104)} width={RIGHT.x1 - LEFT.x0} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <Mark at={bridgeAt + 2}>either way, label the axis</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
