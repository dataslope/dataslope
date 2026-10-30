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
/** What the classifier reports, on top; what the tickets really are, below
 *  it once corrected, so the figure reads in the order of the argument. */
const ROW_LABEL = 470;
const ROW_TRUTH = 650;
const ROW_FORMULA = 776;

/**
 * A term of a formula with its name set small above or below it. The name
 * sits out of the flow, so naming a number never moves the formula around it.
 */
const Named: React.FC<{ name: string; below?: boolean; children: React.ReactNode }> = ({ name, below = false, children }) => (
  <span style={{ position: "relative", display: "inline-block" }}>
    {children}
    <span
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        ...(below ? { top: "100%", paddingTop: 4 } : { bottom: "100%", paddingBottom: 4 }),
        ...label(19, INK_SOFT),
        fontStyle: "normal",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  </span>
);

/** An operator with room around it; `wide` leaves enough that the names over
 *  its two neighbours clear each other. */
const Op: React.FC<{ wide?: boolean; children: React.ReactNode }> = ({ wide = false, children }) => (
  <span style={{ margin: wide ? "0 0.8em" : "0 0.38em" }}>{children}</span>
);

/**
 * Question 6. A million tickets as two bars. The classifier's check on a
 * hand-labelled sample comes first, with its two rates named: sensitivity
 * 0.90 (it catches 90% of real complaints) and specificity 0.95 (it flags 5%
 * of everything else). On top, what it reports: 200,000 labelled complaints,
 * the last part of them false alarms from the large majority that aren't
 * complaints. The forward equation says what that 20% is made of (90% of the
 * true share plus 5% of the rest); solving it is the correction, which draws
 * the truth bar below, 17.6%, and only then fills in the counts it implies
 * (158,824 caught, 41,176 false alarms out of 823,529). Beside it, the
 * Rogan-Gladen formula in the page's own numbers, each number named.
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
  const sensAt = n.word("prev-terms", "its sensitivity");
  const specAt = n.word("prev-terms", "its specificity");
  const twentyAt = n.word("prev-fix", "Twenty percent come back labeled");
  const majorityAt = n.word("prev-fix", "the large majority that aren't complaints");
  const alarmsAt = n.word("prev-fix", "a lot of false alarms");
  const sumAt = n.word("prev-sum", "The twenty percent is");
  const trueShareAt = n.word("prev-sum", "ninety percent of the true share");
  const restAt = n.word("prev-sum", "five percent of everything else");
  const correctAt = n.word("prev-correct", "Correct for both errors");
  const shareAt = n.word("prev-correct", "seventeen point six percent");
  const rgAt = n.word("prev-rg", "the Rogan-Gladen estimator");
  const intervalAt = n.word("prev-rg", "Report its interval too");
  const lastAt = n.word("check-in", "the last of the seven");
  const end = n.beat("check-in").to;

  const W = BAR.x1 - BAR.x0;
  const px = (count: number) => (count / PREV.tickets) * W;
  const truth = ease(frame, correctAt, 20);
  const labelBar = ease(frame, twentyAt - 2, 16);
  const alarms = ease(frame, alarmsAt, 12);
  /** The counts the correction implies, once the truth bar is in. */
  const counted = ease(frame, correctAt + 10, 12);
  const solved = ease(frame, correctAt + 8, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={catchesAt} level={-34} />
      <Sfx name="el-tap" at={flagsAt} level={-34} />
      <Sfx name="el-pop" at={twentyAt} level={-32} />
      <Sfx name="el-scratch" at={alarmsAt + 4} level={-34} />
      <Sfx name="el-pencil" at={sumAt} level={-36} />
      <Sfx name="slide" at={correctAt} level={-34} />
      <Sfx name="el-pop" at={shareAt + 2} level={-32} />

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
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            on a hand-labeled sample, it{" "}
            <span style={{ opacity: ease(frame, catchesAt - 2, 10), color: BLUE_INK, fontWeight: 650 }}>catches 90% of real complaints</span>
            <span style={{ opacity: ease(frame, sensAt - 2, 10), fontSize: 22 }}> (sensitivity {PREV.sens.toFixed(2)})</span>
            <span style={{ opacity: ease(frame, flagsAt - 2, 10) }}>
              , and <span style={{ color: ACCENT_INK, fontWeight: 650 }}>wrongly flags 5% of everything else</span>
            </span>
            <span style={{ opacity: ease(frame, specAt - 2, 10), fontSize: 22 }}> (specificity {PREV.spec.toFixed(2)})</span>
          </span>
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
            <span style={{ ...note(22, BLUE_INK), fontWeight: 600, opacity: counted, marginLeft: 22 }}>
              caught: {pct(PREV.sens)} of {num(PREV.trueComplaints)} = {num(PREV.caught)}
            </span>
          </span>
        </Note>
        <Note at={majorityAt} x={BAR.x0 + px(PREV.flagged) + 20} y={y(ROW_LABEL) + h(10)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            {pct(1 - PREV.spec)} of every ticket that isn&apos;t a complaint
            <span style={{ opacity: counted, ...TABULAR }}>
              {" "}
              ({num(PREV.notComplaints)}) = {num(PREV.falseAlarms)} false alarms
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

        {/* What the 20% is made of, then the same equation solved: Rogan-Gladen, in the page's numbers. */}
        <Note at={sumAt - 2} x={X0} y={y(ROW_FORMULA)}>
          <div style={{ display: "flex", alignItems: "center", padding: "28px 0", ...math(30, INK) }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Named name="observed" below>
                {PREV.obs.toFixed(2)}
              </Named>
              <Op>=</Op>
              <span style={{ opacity: ease(frame, trueShareAt - 2, 10) }}>
                <Named name="caught" below>
                  {PREV.sens.toFixed(2)} × share
                </Named>
              </span>
              <span style={{ opacity: ease(frame, restAt - 2, 10), display: "flex", alignItems: "center" }}>
                <Op>+</Op>
                <Named name="false alarms" below>
                  {(1 - PREV.spec).toFixed(2)} × (1 − share)
                </Named>
              </span>
            </span>
            <span style={{ opacity: solved, display: "flex", alignItems: "center", marginLeft: 56 }}>
              <span style={{ ...label(21, INK_SOFT), marginRight: 22 }}>so</span>
              <span>share</span>
              <Op>=</Op>
              <Frac
                gap={8}
                top={
                  <span>
                    <Named name="observed">{PREV.obs.toFixed(2)}</Named>
                    <Op wide>+</Op>
                    <Named name="specificity">{PREV.spec.toFixed(2)}</Named>
                    <Op>−</Op>1
                  </span>
                }
                bottom={
                  <span>
                    <Named name="sensitivity" below>
                      {PREV.sens.toFixed(2)}
                    </Named>
                    <Op wide>+</Op>
                    <Named name="specificity" below>
                      {PREV.spec.toFixed(2)}
                    </Named>
                    <Op>−</Op>1
                  </span>
                }
              />
              <span style={{ opacity: ease(frame, shareAt - 2, 10), display: "flex", alignItems: "center" }}>
                <Op>=</Op>
                <span style={{ color: OK_INK, fontWeight: 650 }}>{pct(PREV.prev, 1)}</span>
              </span>
            </span>
          </div>
        </Note>
        <Note at={rgAt - 4} x={1370} y={y(ROW_FORMULA) + h(30)}>
          <div style={{ ...label(21, INK_SOFT), fontWeight: 700 }}>the Rogan-Gladen estimator</div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: 12, opacity: ease(frame, intervalAt, 12) }}>
            <Mark at={intervalAt + 6} out={lastAt}>
              + its interval: both rates
            </Mark>
            <br />
            <Mark at={intervalAt + 14} out={lastAt}>
              came from a sample
            </Mark>
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
