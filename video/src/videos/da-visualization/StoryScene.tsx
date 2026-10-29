import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, HIGHLIGHT, INK, INK_SOFT, TABULAR, fmt, headline, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ANNOTATION, STORY } from "./data";
import { bandMid, BarSet, Drift, LineSet, Mark, Strike, Svg, Verdict, YTicks } from "./parts";

const CHART = { x0: 260, x1: 1260, base: 790, top: 500 };
const STEPS_X = 1380;

/**
 * Questions 13 and 14. The page's revenue chart titled two ways: "Revenue by
 * month", a dataset, struck for "Revenue fell 12% the month after the price
 * rise", a claim, with the July bar marked in the highlight (it is what the
 * title points at, not a wrong answer). Then the page's signups, which
 * look like steady growth until the June pricing change is marked and the
 * slopes either side of it, 1.1 and 4.3 a month, about four times apart.
 */
export const StoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("story").from;
  const qAt = n.word("story", "Question");
  const textAt = n.word("story", "How do you tell a story");
  const leadAt = n.word("story", "Lead with the takeaway");
  const contextAt = n.word("story", "the context");
  const insightAt = n.word("story", "the insight");
  const doAt = n.word("story", "what to do about it");
  const perPointAt = n.word("story-title", "One chart per point");
  const datasetAt = n.word("story-title", "hands the reader a dataset");
  const fellAt = n.word("story-title", "Revenue fell twelve percent");
  const claimAt = n.word("story-title", "a claim they can check");
  const q14At = n.word("annot", "Question fourteen");
  const q14TextAt = n.word("annot", "How do annotations");
  const onChartAt = n.word("annot", "the takeaway on the chart itself");
  const steadyAt = n.word("annot", "look like steady growth");
  const markAt = n.word("annot", "Mark the June pricing change");
  const fourAt = n.word("annot", "about four times steeper");
  const pastedAt = n.word("annot-travel", "survives being pasted");
  const end = n.beat("palette-in").to;

  const out13 = q14At - 4;
  const base = y(CHART.base);
  const top = y(CHART.top);
  const S = STORY;
  const A = ANNOTATION;
  // The price rise lands between June and July; July is the bar that fell.
  const riseX = CHART.x0 + (S.rise * (CHART.x1 - CHART.x0)) / S.revenue.length;
  const fellX = bandMid(S.rise, S.revenue.length, CHART.x0, CHART.x1);
  // The July bar's box, as BarSet draws it (bars fill 68% of their band).
  const julyW = ((CHART.x1 - CHART.x0) / S.revenue.length) * 0.68;
  const julyX = fellX - julyW / 2;
  const yRev = (v: number) => base - (v / 500) * (base - top);
  const aLo = 0;
  const aHi = 60;
  const ax = (i: number) => CHART.x0 + (i * (CHART.x1 - CHART.x0)) / (A.values.length - 1);
  const ay = (v: number) => base - ((v - aLo) / (aHi - aLo)) * (base - top);
  const shipX = ax(A.ship);
  const marked = ease(frame, markAt, 14);

  const steps = [
    { at: leadAt, text: "the takeaway, first", strong: true },
    { at: contextAt, text: "then the context" },
    { at: insightAt, text: "then the insight" },
    { at: doAt, text: "then what to do about it" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={leadAt} level={-34} />
      <Sfx name="el-scratch" at={fellAt - 4} level={-32} />
      <Sfx name="el-pop" at={claimAt} level={-32} />
      <Sfx name="el-pencil" at={markAt + 4} level={-34} />
      <Sfx name="el-pop" at={fourAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} out={out13} size={60}>
          How do you tell a story with data?
        </QuestionCard>
        <QuestionCard n={14} at={q14At} textAt={q14TextAt - 2} size={60}>
          How do annotations improve a chart?
        </QuestionCard>

        {/* ── Question 13: the order, and a title that says it ── */}
        {steps.map((s, i) => {
          const p = ease(frame, s.at - 2, 12) * (1 - ease(frame, out13, 10));
          if (p <= 0) return null;
          return (
            <div
              key={s.text}
              style={{
                position: "absolute",
                left: STEPS_X,
                top: y(470) + i * h(64),
                ...note(28, s.strong ? INK : INK_SOFT),
                fontWeight: s.strong ? 650 : 500,
                whiteSpace: "nowrap",
                opacity: p,
                transform: `translateX(${(1 - p) * 14}px)`,
              }}
            >
              {i + 1}. {s.text}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: CHART.x0, top: top - h(110), opacity: ease(frame, perPointAt - 4, 12) * (1 - ease(frame, out13, 10)) }}>
          <div style={{ ...headline(36), color: INK_SOFT, whiteSpace: "nowrap" }}>
            <Strike at={fellAt - 6}>Revenue by month</Strike>
          </div>
        </div>
        <div style={{ position: "absolute", left: CHART.x0, top: top - h(64), opacity: ease(frame, fellAt, 14) * (1 - ease(frame, out13, 10)) }}>
          <div style={{ ...headline(38), color: OK_INK, whiteSpace: "nowrap" }}>
            Revenue fell {S.dropPct}% the month after the price rise
          </div>
        </div>
        <YTicks ticks={[0, 250, 500]} x={CHART.x0} base={base} top={top} lo={0} hi={500} at={perPointAt} out={out13} />
        <BarSet
          values={S.revenue}
          labels={S.months}
          x0={CHART.x0}
          x1={CHART.x1}
          base={base}
          top={top}
          lo={0}
          hi={500}
          at={perPointAt}
          step={1}
          out={out13}
          color={BAR}
        />
        {/* The bar the title points at, ringed in the highlight. */}
        <Svg opacity={ease(frame, fellAt, 12) * (1 - ease(frame, out13, 10))}>
          <rect x={julyX - 5} y={yRev(S.revenue[S.rise]) - 5} width={julyW + 10} height={base - yRev(S.revenue[S.rise]) + 5} fill="none" stroke={HIGHLIGHT} strokeWidth={6} rx={3} />
        </Svg>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, fellAt + 4, 12) * (1 - ease(frame, out13, 10)) }}>
          <line x1={riseX} x2={riseX} y1={top - 10} y2={base} stroke={INK} strokeWidth={1.6} strokeDasharray="5 5" />
        </svg>
        <Note at={fellAt + 6} x={riseX + 10} y={top - h(14)} out={out13}>
          <span style={{ ...label(19, INK), whiteSpace: "nowrap" }}>price rise</span>
        </Note>
        <Note at={fellAt + 10} x={fellX - 24} y={yRev(S.revenue[S.rise]) - h(36)} out={out13}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <Mark at={fellAt + 12}>−{S.dropPct}%</Mark>
          </span>
        </Note>
        <Verdict ok={false} x={STEPS_X} y={y(780)} at={datasetAt} out={out13}>
          a topic: hands them a dataset
        </Verdict>
        <Verdict ok x={STEPS_X} y={y(830)} at={claimAt} out={out13}>
          a finding: a claim to check
        </Verdict>

        {/* ── Question 14: one marked change ── */}
        <YTicks ticks={[0, 20, 40, 60]} x={CHART.x0} base={base} top={top} lo={aLo} hi={aHi} at={onChartAt} />
        <LineSet values={A.values} x0={CHART.x0} x1={CHART.x1} base={base} top={top} lo={aLo} hi={aHi} at={steadyAt - 4} labels={A.months} edges />
        <Note at={steadyAt + 4} x={CHART.x0} y={top - h(70)}>
          <span style={{ ...headline(34), color: INK, whiteSpace: "nowrap" }}>Signups</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: marked }}>
          <line x1={shipX} x2={shipX} y1={top - 6} y2={base} stroke={INK} strokeWidth={1.8} strokeDasharray="6 5" />
          <line
            x1={ax(0)}
            y1={ay(A.values[0])}
            x2={shipX}
            y2={ay(A.values[A.ship])}
            stroke={INK_SOFT}
            strokeWidth={2}
            strokeDasharray="2 6"
            opacity={ease(frame, fourAt - 6, 12)}
          />
          <line
            x1={shipX}
            y1={ay(A.values[A.ship])}
            x2={ax(A.values.length - 1)}
            y2={ay(A.values.at(-1)!)}
            stroke={OK}
            strokeWidth={2.4}
            strokeDasharray="2 6"
            opacity={ease(frame, fourAt - 2, 12)}
          />
        </svg>
        <Note at={markAt + 6} x={shipX + 12} y={top - h(6)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>June pricing change</span>
        </Note>
        <Note at={fourAt - 4} x={ax(1)} y={ay(A.values[1]) - h(70)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>+{fmt(A.beforeSlope, 1)} a month</span>
        </Note>
        <Note at={fourAt} x={ax(9) - 40} y={ay(A.values[9]) - h(80)}>
          <span style={{ ...label(23, OK_INK), whiteSpace: "nowrap", ...TABULAR }}>
            +{fmt(A.afterSlope, 1)} a month: about {A.multiple}×
          </span>
        </Note>
        <Note at={pastedAt - 2} x={STEPS_X} y={y(520)}>
          <span style={{ ...note(26, INK) }}>
            a chart that says its own point
            <br />
            travels without you
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
