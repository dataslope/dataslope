import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, body, headline, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SURVEY } from "./data";
import { Kicker, RAW, Spot, STAT_INK, Svg } from "./parts";

/** The field: one dot per 50 customers, 120 across (and 50 down). */
const COLS = 120;
const X0 = 164;
const PITCH = 9;
const TOP = 440;
const PITCH_Y = 8.6;
const R = 2.6;

const fmtInt = (v: number) => v.toLocaleString("en-US");

/**
 * Part 2 opens: 500 surveyed of 300,000 customers, as ten blue dots in a
 * field of six thousand, and the two names for the field and the dots.
 */
export const SurveyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const surveyFrom = n.beat("survey").from;
  const fiveAt = n.word("survey", "five hundred");
  const threeAt = n.word("survey", "three hundred thousand");
  const customersAt = n.word("survey", "customers");
  const questionAt = n.word("exact", "question");
  const populationAt = n.word("names", "population");
  const sampleAt = n.word("names", "sample");
  const sixAt = n.word("names", "six hundred");
  const listAt = n.word("list", "list");
  const checkoutAt = n.word("list", "checkout");

  const dots: React.ReactNode[] = [];
  const picked: React.ReactNode[] = [];
  for (let i = 0; i < SURVEY.dots; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = X0 + col * PITCH;
    const cy = y(TOP) + h(row * PITCH_Y);
    if (SURVEY.picked.has(i)) {
      const a = ease(frame, fiveAt - 4 + picked.length * 1.2, 10);
      if (a > 0) {
        picked.push(<circle key={i} cx={cx} cy={cy} r={7.5 * a} fill={BAR} stroke={PAPER} strokeWidth={2} />);
      } else picked.push(null);
      continue;
    }
    // The field sweeps in from the left, column by column.
    const a = ease(frame, threeAt - 4 + col * 0.22, 8);
    if (a > 0) dots.push(<circle key={i} cx={cx} cy={cy} r={R} fill={RAW} opacity={a} />);
  }
  const ring = ease(frame, sampleAt - 4, 12);

  return (
    <AbsoluteFill>
      <Kicker at={surveyFrom - 4}>Population and sample</Kicker>

      <Ink at={fiveAt - 6} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        You asked {fmtInt(SURVEY.surveyed)}.
      </Ink>
      <Ink
        at={questionAt - 4}
        dur={20}
        style={{ left: 92, top: y(244), ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}
      >
        Your question is about {fmtInt(SURVEY.customers)}.
      </Ink>

      <Spot id="thinking-statistically-barrel" at={customersAt - 4} left={1470} top={y(104)} width={310} height={313} />

      <FigLabel
        n="3"
        title={`${fmtInt(SURVEY.customers)} customers, one dot for every ${SURVEY.perDot}`}
        at={threeAt - 6}
        x={160}
        y={y(380)}
      />

      <Svg>
        {dots}
        {/* The sample, drawn over the field, ringed once it is named. */}
        {ring > 0
          ? [...SURVEY.picked].map((i) => (
              <circle
                key={i}
                cx={X0 + (i % COLS) * PITCH}
                cy={y(TOP) + h(Math.floor(i / COLS) * PITCH_Y)}
                r={13}
                fill="none"
                stroke={BAR}
                strokeWidth={2}
                opacity={ring}
              />
            ))
          : null}
        {picked}
      </Svg>

      {/* ── The two names ── */}
      <Ink at={populationAt - 4} dur={16} style={{ left: 1310, top: y(470), width: 470 }}>
        <div style={{ ...body(44, true), color: INK }}>The population</div>
        <div style={{ ...note(24, INK_SOFT), marginTop: 10 }}>
          Everyone you care about: all {fmtInt(SURVEY.customers)}
        </div>
      </Ink>
      <Ink at={sampleAt - 4} dur={16} style={{ left: 1310, top: y(610), width: 470 }}>
        <div style={{ ...body(44, true), color: BLUE_INK }}>The sample</div>
        <div style={{ ...note(24, INK_SOFT), marginTop: 10 }}>
          The part you saw: {fmtInt(SURVEY.surveyed)}
          <span style={{ opacity: ease(frame, sixAt - 2, 10) }}>, one in {SURVEY.oneIn}</span>
        </div>
      </Ink>
      <Note at={listAt - 2} x={1310} y={y(762)} width={470}>
        <div style={{ ...body(30, true), color: INK, lineHeight: 1.3 }}>
          Often not a list at all
          <span style={{ opacity: ease(frame, checkoutAt - 2, 10) }}>
            : every checkout a design will ever see.
          </span>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
