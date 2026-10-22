import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, PREV } from "./data";
import { BAD, DATA, DATA_LIGHT, Drift, Frac, Mark, MARK_BAD, MARK_OK, math, OK, OK_INK, QUIET, X0 } from "./parts";

const BAR = { x0: X0, x1: 1800, h: 54 };
const ROW_TRUTH = 470;
const ROW_LABEL = 650;

/**
 * Question 6. A million tickets as one bar: the classifier's check on a
 * hand-labelled sample first (it catches 90% of real complaints and flags 5%
 * of everything else), then what it reports, 200,000 labelled complaints,
 * which breaks into 158,824 it caught and 41,176 false alarms from the large
 * majority that aren't complaints. Correcting for both errors puts the share
 * at 17.6% (the truth bar), with the Rogan-Gladen formula in the page's own
 * numbers.
 */
export const PrevScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("prev").from;
  const qAt = n.word("prev", "Question");
  const textAt = n.word("prev", "You use an LLM");
  const notAt = n.word("prev", "Not as the share it labels");
  const biasAt = n.word("prev", "its errors bias that number");
  const checkAt = n.word("prev", "Check it on a hand-labeled sample");
  const catchesAt = n.word("prev", "it catches ninety percent");
  const flagsAt = n.word("prev", "wrongly flags five percent");
  const twentyAt = n.word("prev-fix", "Twenty percent come back labeled");
  const majorityAt = n.word("prev-fix", "the large majority that aren't complaints");
  const alarmsAt = n.word("prev-fix", "a lot of false alarms");
  const correctAt = n.word("prev-fix", "Correct for both errors");
  const shareAt = n.word("prev-fix", "seventeen point six percent");
  const rgAt = n.word("prev-fix", "the Rogan-Gladen estimator");
  const intervalAt = n.word("prev-fix", "Report its interval too");
  const lastAt = n.word("check-in", "the last of the seven");
  const end = n.beat("check-in").to;

  const W = BAR.x1 - BAR.x0;
  const px = (count: number) => (count / PREV.tickets) * W;
  const truth = ease(frame, correctAt, 20);
  const labelBar = ease(frame, twentyAt - 2, 16);
  const alarms = ease(frame, alarmsAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={catchesAt} level={-34} />
      <Sfx name="el-tap" at={flagsAt} level={-34} />
      <Sfx name="el-pop" at={twentyAt} level={-32} />
      <Sfx name="el-scratch" at={alarmsAt + 4} level={-34} />
      <Sfx name="slide" at={correctAt} level={-34} />
      <Sfx name="el-pop" at={shareAt + 2} level={-32} />
      <Sfx name="el-pencil" at={rgAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={54}>
          You use an LLM to sort a million support tickets. How do you report the share that are complaints?
        </QuestionCard>

        <Note at={notAt} x={X0} y={y(330)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            not as the share it labels complaints:{" "}
            <span style={{ opacity: ease(frame, biasAt - 2, 10) }}>
              <Mark at={biasAt + 4} color={MARK_BAD}>
                its errors bias that number
              </Mark>
            </span>
          </span>
        </Note>
        <Note at={checkAt} x={X0} y={y(384)}>
          <span style={{ ...note(24, INK_SOFT), ...TABULAR, whiteSpace: "nowrap" }}>
            on a hand-labeled sample, it{" "}
            <span style={{ opacity: ease(frame, catchesAt - 2, 10), color: BLUE_INK, fontWeight: 650 }}>catches 90% of real complaints</span>
            <span style={{ opacity: ease(frame, flagsAt - 2, 10) }}>
              , and <span style={{ color: ACCENT_INK, fontWeight: 650 }}>wrongly flags 5% of everything else</span>
            </span>
          </span>
        </Note>

        {/* The truth, revealed by the correction. */}
        <Note at={correctAt} x={X0} y={y(ROW_TRUTH) - h(36)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700 }}>corrected: what the tickets really are</span>
        </Note>
        {truth > 0 ? (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: truth }}>
            <rect x={BAR.x0} y={y(ROW_TRUTH)} width={px(PREV.trueComplaints) * truth} height={BAR.h} fill={OK} opacity={0.85} />
            <rect
              x={BAR.x0 + px(PREV.trueComplaints)}
              y={y(ROW_TRUTH)}
              width={px(PREV.notComplaints) * truth}
              height={BAR.h}
              fill={QUIET}
            />
          </svg>
        ) : null}
        <Note at={shareAt} x={BAR.x0} y={y(ROW_TRUTH) + h(BAR.h + 10)}>
          <span style={{ ...note(30, OK_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            <Mark at={shareAt + 6} color={MARK_OK}>
              complaints: about {pct(PREV.prev, 1)}
            </Mark>
            <span style={{ ...label(20, INK_SOFT), fontWeight: 500 }}> {num(PREV.trueComplaints)}</span>
          </span>
        </Note>
        <Note at={correctAt + 10} x={BAR.x0 + px(PREV.trueComplaints) + 20} y={y(ROW_TRUTH) + h(12)}>
          <span style={{ ...label(20, INK), ...TABULAR, whiteSpace: "nowrap" }}>not complaints: {num(PREV.notComplaints)}</span>
        </Note>

        {/* What the classifier reports. */}
        <Note at={twentyAt - 2} x={X0} y={y(ROW_LABEL) - h(36)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700 }}>what the LLM labels complaints, out of {num(PREV.tickets)}</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: labelBar }}>
          <rect x={BAR.x0} y={y(ROW_LABEL)} width={W} height={BAR.h} fill="none" stroke={INK_SOFT} strokeWidth={1.4} strokeDasharray="3 6" />
          <rect x={BAR.x0} y={y(ROW_LABEL)} width={px(PREV.caught) * labelBar} height={BAR.h} fill={DATA} />
          <rect
            x={BAR.x0 + px(PREV.caught)}
            y={y(ROW_LABEL)}
            width={px(PREV.falseAlarms) * labelBar}
            height={BAR.h}
            fill={`color-mix(in srgb, ${BAD} ${100 * alarms}%, ${DATA_LIGHT})`}
          />
        </svg>
        <Note at={twentyAt + 4} x={BAR.x0} y={y(ROW_LABEL) + h(BAR.h + 10)}>
          <span style={{ ...note(30, BLUE_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            labeled complaints: {pct(PREV.obs)}
            <span style={{ ...label(20, INK_SOFT), fontWeight: 500 }}> {num(PREV.flagged)}</span>
          </span>
        </Note>
        <Note at={majorityAt} x={BAR.x0 + px(PREV.flagged) + 20} y={y(ROW_LABEL) + h(10)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
            5% of the {num(PREV.notComplaints)} that aren&apos;t complaints
            <span style={{ opacity: alarms }}> = {num(PREV.falseAlarms)} false alarms</span>
          </span>
        </Note>

        {/* Rogan-Gladen, in the page's numbers. */}
        <Note at={rgAt - 4} x={X0} y={y(800)}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, ...math(32, INK) }}>
            <span>share</span>
            <span>=</span>
            <Frac top={<span>{PREV.obs.toFixed(2)} + {PREV.spec.toFixed(2)} − 1</span>} bottom={<span>{PREV.sens.toFixed(2)} + {PREV.spec.toFixed(2)} − 1</span>} />
            <span>=</span>
            <span style={{ color: OK_INK, fontWeight: 650 }}>{pct(PREV.prev, 1)}</span>
            <span style={{ ...label(20, INK_SOFT), marginLeft: 24 }}>Rogan-Gladen</span>
          </div>
        </Note>
        <Note at={intervalAt} x={1180} y={y(806)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={intervalAt + 6} out={lastAt}>
              + its interval: both rates came from a sample
            </Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
