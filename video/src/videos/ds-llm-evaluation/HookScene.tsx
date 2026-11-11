import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Clear, Drift, Headline, Kicker, madeUp, Mark, OK_INK, Reply, Spot, Tag, X0 } from "./parts";

const CARD_W = 540;
const CARD_GAP = 40;
const CARD_Y = 430;
const ROW_KNOW = 360;
const ROW_NEW = 520;

/**
 * The opening: one customer question put to the same model twice, and two
 * confident answers back, only one of them matching the refund policy.
 * Deciding which version of a feature ships is then a measurement problem.
 * The plan follows on a clean page: the statistics you know, the three things
 * that are new, and how the nine questions split.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const askAt = n.word("hook", "Ask a model");
  const twiceAt = n.word("hook", "the same question twice");
  const twoAt = n.word("hook", "two different answers");
  const sureAt = n.word("hook", "Both sound sure");
  const policyAt = n.word("hook", "matches the refund policy");
  const decideAt = n.word("hook", "Somebody has to decide");
  const shipsAt = n.word("hook", "which version of the feature ships");
  const measureAt = n.word("hook", "a measurement problem");

  const knowAt = n.word("plan", "The statistics are ones you already know");
  const known = [
    { text: "sampling error", at: n.word("plan", "sampling error") },
    { text: "agreement", at: n.word("plan", "agreement") },
    { text: "power", at: n.word("plan", "power") },
    { text: "bias", at: n.word("plan", "bias") },
  ];
  const newAt = n.word("plan", "What's new");
  const fresh = [
    { text: "the output is text", at: n.word("plan", "the output is text") },
    { text: "it changes from run to run", at: n.word("plan", "it changes from run to run") },
    { text: "another model often grades it", at: n.word("plan", "another model often grades it") },
  ];
  const nineAt = n.word("plan", "nine questions");
  const sevenAt = n.word("plan-seven", "Seven get worked through");
  const fourAt = n.word("plan-seven", "four of them with real arithmetic");
  const twoTakeAt = n.word("plan-seven", "two take a sentence each");
  const end = n.beat("plan-seven").to;

  const arrow = ease(frame, twiceAt + 4, 16);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={twoAt} level={-32} />
      <Sfx name="el-pop" at={twoAt + 8} level={-34} />
      <Sfx name="el-scratch" at={policyAt + 8} level={-32} />
      <Sfx name="el-chime" at={measureAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={knowAt - 4} level={-36} />
      {[...known, ...fresh].map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-36} />
      ))}

      <Drift from={0} to={end + 40}>
        <Kicker at={6}>Data scientist interview questions</Kicker>
        <Headline lead="One question," turn="two answers." at={askAt} turnAt={twoAt - 4} out={knowAt - 8} size={68} />
        <Headline lead="The statistics" turn="are ones you already know." at={knowAt - 2} turnAt={knowAt + 14} size={68} />

        {/* The hook: one question, asked twice. */}
        <Clear at={knowAt - 8}>
          <Note at={askAt + 2} x={X0} y={y(300) + 14}>
            <span style={{ ...note(30, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Can I return a jacket after 45 days?</span>
          </Note>
          <Note at={twiceAt + 2} x={X0 + 640} y={y(312)}>
            <span style={label(21, INK_SOFT)}>the same model, asked twice</span>
          </Note>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: arrow }}>
            {[0, 1].map((k) => {
              const x = X0 + 120 + k * (CARD_W + CARD_GAP) * arrow;
              return (
                <path
                  key={k}
                  d={`M ${X0 + 120} ${y(372)} C ${X0 + 120} ${y(400)}, ${x} ${y(392)}, ${x} ${y(CARD_Y - 10)}`}
                  fill="none"
                  stroke={INK_SOFT}
                  strokeWidth={2}
                  strokeDasharray="4 7"
                />
              );
            })}
          </svg>
          {/* The two replies as plain text under the fork's arrows, which
              part them, so no hairline between. */}
          <Reply x={X0} y={y(CARD_Y)} width={CARD_W} at={twoAt - 2} title="Run 1" verdict={{ at: policyAt + 8, ok: false }}>
            Yes. Returns are accepted within 60 days of purchase.
          </Reply>
          <Reply x={X0 + CARD_W + CARD_GAP} y={y(CARD_Y)} width={CARD_W} at={twoAt + 6} title="Run 2" verdict={{ at: policyAt + 12, ok: true }}>
            Sorry, returns close 30 days after purchase.
          </Reply>
          <Note at={sureAt} x={X0} y={y(CARD_Y + 150)}>
            <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>Both sound sure of themselves</span>
          </Note>
          <Note at={policyAt} x={X0 + CARD_W + CARD_GAP} y={y(CARD_Y + 150)}>
            <span style={{ ...note(26, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>The refund policy: 30 days</span>
          </Note>
          <Note at={decideAt} x={X0} y={y(700)}>
            <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>
              Which version ships? <span style={{ opacity: ease(frame, measureAt - 2, 10) }}>That&apos;s </span>
              <span style={{ opacity: ease(frame, measureAt - 2, 10) }}>
                <Mark at={measureAt + 4}>a measurement problem.</Mark>
              </span>
            </span>
          </Note>
          <Note at={shipsAt + 4} x={X0} y={y(764)}>
            <span style={madeUp()}>The question and both replies are made up for this video</span>
          </Note>
          <Spot id="ds-llm-evaluation-parrot" at={sureAt} left={1340} top={y(300)} width={460} height={420} />
        </Clear>

        {/* The plan: what you know, what's new, and how the page splits. */}
        <Note at={knowAt + 4} x={X0} y={y(ROW_KNOW - 44)}>
          <span style={label(22, INK_SOFT)}>You already know</span>
        </Note>
        {known.map((c, i) => (
          <Tag key={c.text} x={X0 + [0, 260, 470, 618][i]} y={y(ROW_KNOW)} at={c.at - 2} size={28} tone="blue">
            {c.text}
          </Tag>
        ))}
        <Note at={newAt} x={X0} y={y(ROW_NEW - 44)}>
          <span style={{ ...label(22, INK), fontWeight: 500 }}>What&apos;s new</span>
        </Note>
        {fresh.map((c, i) => (
          <Tag key={c.text} x={X0 + [0, 290, 708][i]} y={y(ROW_NEW)} at={c.at - 2} size={28}>
            {c.text}
          </Tag>
        ))}
        <Note at={nineAt} x={X0} y={y(680)}>
          <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>
            9 questions:{" "}
            <span style={{ opacity: ease(frame, sevenAt - 2, 10) }}>
              <Mark at={sevenAt + 4}>7 worked through</Mark>
            </span>
            <span style={{ opacity: ease(frame, fourAt - 2, 10), color: INK_SOFT }}> (4 of them with real arithmetic)</span>
            <span style={{ opacity: ease(frame, twoTakeAt - 2, 10) }}>, 2 in a sentence</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
