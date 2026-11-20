import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COST, thousands } from "./data";
import { CHART } from "./HookScene";
import { costScale, CostChart, Drift, Gap, Mark, pulse, X0 } from "./parts";

const COL_X = 1420;

/**
 * Question 1, on the hook's chart, which stands where the hook left it. When:
 * large tables that mostly append (on the right). The incremental line draws
 * itself flat along a day's 8,000 rows, and the gap at day 730 is 755 times.
 * The catch, three lines under the answer. Recovery is a full rebuild: the
 * twelve scheduled refreshes rise as spikes to the rebuild line and light up.
 * Then the warehousing page's version of the question as a follow-up line,
 * and its answer: big and append-mostly, or a plain table (green).
 */
export const WhenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("when").from;
  const qAt = n.word("when", "Question one");
  const textAt = n.word("when", "When do you use");
  const largeAt = n.word("when", "When a table is large");
  const eventsAt = n.word("when", "like events");
  const slowAt = n.word("when", "too slow");
  const incAt = n.word("when-flat", "An incremental run");
  const flatAt = n.word("when-flat", "stays flat");
  const climbsAt = n.word("when-flat", "the rebuild's climbs");
  const ratioAt = n.word("when-flat", "seven hundred fifty-five times");
  const catchAt = n.word("when-catch", "The catch");
  const catches = [
    { text: "Find the new rows", at: n.word("when-catch", "a reliable way") },
    { text: "Late and changed rows", at: n.word("when-catch", "correct handling") },
    { text: "A tested recovery", at: n.word("when-catch", "a tested way to recover") },
  ];
  const recoveryAt = n.word("when-spikes", "Recovery means a full rebuild");
  const growsAt = n.word("when-spikes", "its cost grows too");
  const spikeAt = n.word("when-spikes", "Each spike here");
  const sixtyAt = n.word("when-spikes", "every sixty days");
  const followAt = n.word("when-not", "So when do you choose");
  const onlyAt = n.word("when-not", "Only when the table is big");
  const smallAt = n.word("when-not", "If it's small");
  const plainAt = n.word("when-not", "a plain table");
  const end = n.beat("when-not").to;

  const top = y(CHART.top);
  const bottom = y(CHART.bottom);
  const s = costScale(CHART.x0, CHART.x1, top, bottom);
  const redY = s.ly(COST.fullAtEnd);
  const blueY = s.ly(COST.daily);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={incAt} level={-36} />
      <Sfx name="el-pop" at={ratioAt} level={-33} />
      {catches.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-36} />
      ))}
      <Sfx name="el-whoosh" at={recoveryAt} level={-37} />
      <Sfx name="el-pencil" at={spikeAt} level={-36} />
      <Sfx name="el-tap" at={plainAt} level={-34} />

      {/* The hook's chart, standing where it was: outside the slow push, so
          the cut between the two scenes leaves it exactly in place. */}
        <div style={{ position: "absolute", left: X0, top: y(CHART.labelY), ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
          Rows one run processes
          <span style={{ ...label(22, INK_SOFT), fontWeight: 500 }}>
            {" "}
            · a model: <Num>{thousands(COST.daily)}</Num> new rows a day, log scale
          </span>
        </div>
        <CostChart
          x0={CHART.x0}
          x1={CHART.x1}
          top={top}
          bottom={bottom}
          at={-100}
          fullAt={-100}
          dotAt={-100}
          incAt={incAt}
          growAt={recoveryAt + 4}
          spikesAt={spikeAt}
        />
        <div style={{ position: "absolute", left: CHART.x1 + 40, top: redY - 15, ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-block", transform: `scale(${1 + 0.06 * (pulse(frame, slowAt, 20) + pulse(frame, climbsAt, 20))})`, transformOrigin: "0 50%" }}>
            Full rebuild: <Num>{thousands(COST.fullAtEnd)}</Num>
          </span>
        </div>
        <div style={{ position: "absolute", left: CHART.x1 + 40, top: blueY - 15, ...note(24, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-block", transform: `scale(${1 + 0.06 * pulse(frame, flatAt, 20)})`, transformOrigin: "0 50%" }}>
            One day&apos;s rows: <Num>{thousands(COST.daily)}</Num>
          </span>
        </div>
        <Gap x={CHART.x1 + 14} y0={redY} y1={blueY} at={ratioAt - 4} />
        <Note at={ratioAt} x={CHART.x1 + 40} y={(redY + blueY) / 2 - 22}>
          <span style={{ ...note(34, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            <Num>{COST.ratio}</Num>×
          </span>
        </Note>


      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={56}>
          When do you use an incremental model, and what&apos;s the catch?
        </QuestionCard>

        {/* ── When, and the catch ── */}
        <Note at={largeAt - 2} x={COL_X} y={top - 6}>
          <span style={{ ...note(26, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Large, and mostly appends
          </span>
        </Note>
        <Note at={eventsAt - 2} x={COL_X} y={top + 34}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Events, logs, page views</span>
        </Note>
        <Note at={catchAt - 2} x={COL_X} y={top + 110}>
          <span style={{ ...label(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>The catch</span>
        </Note>
        {catches.map((c, i) => (
          <Note key={c.text} at={c.at - 2} x={COL_X} y={top + 152 + i * 38}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              <span style={{ ...label(23, ACCENT_INK), marginRight: "0.5em" }}>{i + 1}</span>
              {c.text}
            </span>
          </Note>
        ))}

        {/* ── Recovery: the refreshes ── */}
        <Note at={spikeAt} x={X0} y={y(690)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={spikeAt + 4}>Each spike: a scheduled full refresh</Mark>
            <span style={{ opacity: ease(frame, sixtyAt - 2, 10) }}>, every <Num>{COST.every}</Num> days</span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, growsAt, 10) * ease(frame, spikeAt, 10) }}>, its cost growing with the table</span>
          </span>
        </Note>

        {/* ── The warehousing page's follow-up ── */}
        <Note at={followAt - 2} x={X0} y={y(760)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
            Follow-up: <span style={{ color: INK }}>When do you choose incremental over a full table rebuild?</span>
          </span>
        </Note>
        <Note at={onlyAt - 2} x={X0} y={y(806)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Only big, append-mostly tables
            <span style={{ opacity: ease(frame, smallAt - 2, 10) }}>
              <span style={{ color: INK_SOFT, margin: "0 0.5em" }}>·</span>
              Small, or changes broadly every run:{" "}
            </span>
            <span style={{ color: OK_INK, fontWeight: 600, opacity: ease(frame, plainAt - 2, 10) }}>a plain table</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
