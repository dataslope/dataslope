import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Mark, OK, OK_INK, Step, X0 } from "./parts";

const CARD = { x: X0, top: 380, w: 640, row: 66 };
const STEPS_X = 900;
const STEPS_TOP = 400;
const STEP_ROW = 96;

/** A pass or fail pill beside a rubric line. */
const Pill: React.FC<{ at: number; ok: boolean }> = ({ at: from, ok }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 10);
  const color = ok ? OK : ACCENT;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 12px",
        borderRadius: 999,
        border: `2px solid ${color}`,
        ...label(18, ok ? OK_INK : ACCENT_INK),
        fontWeight: 700,
        opacity: p,
        transform: `scale(${0.8 + 0.2 * p})`,
      }}
    >
      {ok ? "pass" : "fail"}
    </span>
  );
};

/**
 * Question 2. Start from the decision: what a good reply is (correct,
 * complete, on policy, the right tone), written up as a rubric with pass or
 * fail on each line. Then the four steps down the right, each lit as it is
 * read: sample real traffic, expert labels, every version on the same items,
 * and the uncertainty, which the bridge into question 3 marks.
 */
export const MeasureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("measure").from;
  const qAt = n.word("measure", "Question");
  const textAt = n.word("measure", "How would you measure");
  const decisionAt = n.word("measure", "Start from the decision");
  const goodAt = n.word("measure", "what a good reply is");
  const lines = [
    { text: "correct", at: n.word("measure", "correct") },
    { text: "complete", at: n.word("measure", "complete") },
    { text: "on policy", at: n.word("measure", "on policy") },
    { text: "the right tone", at: n.word("measure", "the right tone") },
  ];
  const rubricAt = n.word("measure", "turn that into a rubric");
  const passAt = n.word("measure", "pass or fail on each");
  const steps = [
    { text: "sample real traffic, by intent and difficulty", at: n.word("measure-steps", "Sample real traffic") },
    { text: "expert labels, two raters on some items", at: n.word("measure-steps", "Have experts label a subset") },
    { text: "every version on the same items", at: n.word("measure-steps", "Score every version") },
    { text: "report the uncertainty", at: n.word("measure-steps", "report the uncertainty") },
  ];
  const rareAt = n.word("measure-steps", "so the rare cases are in it");
  const humansAt = n.word("measure-steps", "how much humans agree");
  const noiseAt = n.word("measure-steps", "ship noise");
  const shortAt = n.word("size-in", "come up short");
  const end = n.beat("size-in").to;

  const card = ease(frame, goodAt - 4, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={goodAt} level={-36} />
      {lines.map((l) => (
        <Sfx key={l.text} name="el-tap" at={l.at} level={-36} />
      ))}
      <Sfx name="el-pop" at={passAt + 2} level={-34} />
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={shortAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={58}>
          How would you measure the quality of an LLM feature, like drafted support replies?
        </QuestionCard>

        <Note at={decisionAt} x={CARD.x} y={y(CARD.top - 62)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <Mark at={decisionAt + 6}>start from the decision</Mark>, not the metric
          </span>
        </Note>

        {/* The rubric: a good reply, line by line, pass or fail. */}
        {card > 0 ? (
          <div
            style={{
              position: "absolute",
              left: CARD.x,
              top: y(CARD.top),
              width: CARD.w,
              height: h(110 + lines.length * CARD.row),
              boxSizing: "border-box",
              borderRadius: 14,
              border: `2px solid ${INK_SOFT}`,
              background: PAPER,
              opacity: card,
            }}
          />
        ) : null}
        <Note at={goodAt - 2} x={CARD.x + 30} y={y(CARD.top + 26)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700 }}>
            <span style={{ opacity: 1 - ease(frame, rubricAt, 12) }}>a good reply is</span>
          </span>
        </Note>
        <Note at={rubricAt} x={CARD.x + 30} y={y(CARD.top + 26)}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700 }}>the rubric</span>
        </Note>
        {lines.map((l, i) => (
          <Note key={l.text} at={l.at - 2} x={CARD.x + 30} y={y(CARD.top + 80) + i * h(CARD.row)}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, width: CARD.w - 60 }}>
              <span style={{ ...note(30, INK), fontWeight: 600, flex: 1 }}>{l.text}</span>
              <Pill at={passAt + i * 3} ok />
              <Pill at={passAt + 2 + i * 3} ok={false} />
            </div>
          </Note>
        ))}

        {/* The four steps. */}
        {steps.map((s, i) => (
          <Step
            key={s.text}
            n={i + 1}
            x={STEPS_X}
            y={y(STEPS_TOP) + i * h(STEP_ROW)}
            at={s.at - 2}
            lit={i === 3 ? shortAt : s.at}
            done={i === 3 ? undefined : steps[i + 1].at}
            width={880}
          >
            {s.text}
          </Step>
        ))}
        <Note at={rareAt} x={STEPS_X + 58} y={y(STEPS_TOP) + h(44)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>so the rare cases are in it</span>
        </Note>
        <Note at={humansAt} x={STEPS_X + 58} y={y(STEPS_TOP) + h(STEP_ROW + 44)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>to see how much humans agree</span>
        </Note>
        <Note at={noiseAt - 4} x={STEPS_X + 58} y={y(STEPS_TOP) + h(3 * STEP_ROW + 44)}>
          <span style={{ ...label(20, ACCENT_INK), whiteSpace: "nowrap" }}>a pass rate with no interval invites people to ship noise</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
