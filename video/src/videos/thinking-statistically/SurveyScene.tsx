import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, body, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SURVEY } from "./data";
import { DOT, Kicker, lerp, Mark, pulse, RAW, Spot, STAT_INK, Svg } from "./parts";

/** The field: one dot per 50 customers, 120 across (and 50 down). */
const COLS = 120;
const X0 = 164;
const PITCH = 9;
const TOP = 440;
const PITCH_Y = 8.6;
const R = 2.6;
/** "Every checkout a design will ever see": a run of checkouts in time, the
 *  few that have happened, then the many that haven't. */
const RUN = 23;
const RUN_DONE = 5;
const RUN_X = 1318;
const RUN_PITCH = 20;

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
  const thoseAt = n.word("exact", "those");
  const questionAt = n.word("exact", "question");
  const allAt = n.word("exact", "all");
  const everyoneAt = n.word("names", "Everyone");
  const populationAt = n.word("names", "population");
  const sampleAt = n.word("names", "sample");
  const sixAt = n.word("names", "six hundred");
  const listPopAt = n.word("list", "the population");
  const listAt = n.word("list", "list");
  const checkoutAt = n.word("list", "checkout");
  const everSeeAt = n.word("list", "will ever see");
  const happenedAt = n.word("list", "haven't happened");
  const numbersAt = n.word("parameter-in", "numbers");
  const sideAt = n.word("parameter-in", "each side");

  const dots: React.ReactNode[] = [];
  const picked: React.ReactNode[] = [];
  for (let i = 0; i < SURVEY.dots; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = X0 + col * PITCH;
    const cy = y(TOP) + h(row * PITCH_Y);
    if (SURVEY.picked.has(i)) {
      const k = picked.length;
      const a = ease(frame, fiveAt - 4 + k * 1.2, 10);
      // "exactly what those five hundred said": each answer swells in turn.
      const said = pulse(frame, thoseAt - 2 + k * 1.6, 16);
      if (a > 0) {
        picked.push(<circle key={i} cx={cx} cy={cy} r={7.5 * a * (1 + said * 0.45)} fill={BAR} stroke={PAPER} strokeWidth={2} />);
      } else picked.push(null);
      continue;
    }
    // The field sweeps in from the left, column by column, and a wave runs
    // back across it on "all three hundred thousand".
    const a = ease(frame, threeAt - 4 + col * 0.22, 8);
    const wave = pulse(frame, allAt - 4 + col * 0.24, 14);
    if (a > 0)
      dots.push(
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={R * (1 + wave * 0.3)}
          fill={wave > 0 ? `color-mix(in srgb, ${INK} ${Math.round(wave * 45)}%, ${RAW})` : RAW}
          opacity={a}
        />,
      );
  }
  const ring = ease(frame, sampleAt - 4, 12);
  // "Everyone you care about": a line drawn round the whole field.
  const outline = ease(frame, everyoneAt - 2, 30);
  const fieldW = (COLS - 1) * PITCH;
  const fieldH = h((Math.ceil(SURVEY.dots / COLS) - 1) * PITCH_Y);

  return (
    <AbsoluteFill>
      {/* ── Sound: the ten picked dots, the barrel, the field sweeping in, the rings ── */}
      <Sfx name="el-sprinkle" at={fiveAt - 4} level={-33} />
      <Sfx name="el-pop" at={customersAt - 4} level={-29} />
      <Sfx name="el-whoosh" at={threeAt - 4} level={-32} />
      <Sfx name="el-pencil" at={sampleAt - 4} level={-34} />
      <Sfx name="el-pencil" at={everyoneAt - 2} level={-35} />
      <Sfx name="el-sprinkle" at={everSeeAt - 4} level={-35} />

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
        {outline > 0 ? (
          <rect
            x={X0 - 16}
            y={y(TOP) - 16}
            width={fieldW + 32}
            height={fieldH + 32}
            rx={10}
            fill="none"
            stroke={INK}
            strokeWidth={1.6 + pulse(frame, listPopAt - 2, 20) * 2.2}
            opacity={0.8}
            pathLength={1}
            strokeDasharray={`${outline} 1`}
          />
        ) : null}
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
        <div style={{ ...body(44, true), color: INK }}>
          <Mark at={numbersAt}>The population</Mark>
        </div>
        <div style={{ ...note(24, INK_SOFT), marginTop: 10 }}>
          Everyone you care about: all {fmtInt(SURVEY.customers)}
        </div>
      </Ink>
      <Ink at={sampleAt - 4} dur={16} style={{ left: 1310, top: y(610), width: 470 }}>
        <div style={{ ...body(44, true), color: BLUE_INK }}>
          <Mark at={sideAt}>The sample</Mark>
        </div>
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

      {/* The checkouts: a few that have happened, then the many that haven't. */}
      <Svg>
        {Array.from({ length: RUN }, (_, k) => {
          const done = k < RUN_DONE;
          const a = done
            ? ease(frame, checkoutAt - 2 + k * 2, 8)
            : ease(frame, everSeeAt - 4 + (k - RUN_DONE) * 1.4, 10);
          if (a <= 0) return null;
          const fade = done ? 1 : 1 - ((k - RUN_DONE) / (RUN - RUN_DONE)) * 0.82;
          return (
            <circle
              key={k}
              cx={RUN_X + k * RUN_PITCH}
              cy={y(890)}
              r={6 * a}
              fill={done ? DOT : "none"}
              stroke={DOT}
              strokeWidth={done ? 0 : 1.8}
              opacity={fade}
            />
          );
        })}
        <line
          x1={RUN_X + (RUN_DONE - 0.5) * RUN_PITCH}
          x2={RUN_X + (RUN_DONE - 0.5) * RUN_PITCH}
          y1={y(890) - 20}
          y2={lerp(y(890) - 20, y(890) + 18, ease(frame, happenedAt - 4, 12))}
          stroke={INK}
          strokeWidth={1.6}
          opacity={ease(frame, happenedAt - 4, 6)}
        />
      </Svg>
      <Note at={happenedAt + 2} x={RUN_X + (RUN_DONE - 0.5) * RUN_PITCH} y={y(890) + 24} from="up">
        <span style={{ ...label(20, INK), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>now</span>
      </Note>
      <Note at={happenedAt + 8} x={RUN_X + (RUN_DONE + 2) * RUN_PITCH} y={y(890) + 24}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>still to happen</span>
      </Note>
    </AbsoluteFill>
  );
};
