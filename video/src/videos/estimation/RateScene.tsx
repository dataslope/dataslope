import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { SERIF } from "../../editorial/fonts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { mulberry32, RATE } from "./data";
import { Count, DATA, EST, EST_INK, FADED, Headline, IntervalBar, PHat, Rule, Svg } from "./parts";

const COLS = 75;
const ROWS = RATE.n / COLS;
const CELL = 9;
const PITCH = 11;
const GRID_X = 160;
const GRID_Y = 316;
const COL = 1110;
/** The rate's axis, in percent. */
const X: XScale = { lo: 15, hi: 21, x0: COL, x1: 1760 };
const AXIS = 760;
const BAR_Y = 700;

/** Which of the 3,000 squares are the 540 conversions: a seeded shuffle, for
 *  the layout only. Each square also gets a turn in the sweep that colors it. */
const CONVERTED = (() => {
  const r = mulberry32(540);
  const order = Array.from({ length: RATE.n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, RATE.successes));
})();

/**
 * Part 2, a CI for a proportion: the lesson's 3,000 visitors as a grid, the
 * 540 conversions, the rate's own standard error, and its interval.
 */
export const RateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const rateFrom = n.beat("rate").from;
  const fiveFortyAt = n.word("rate", "five hundred and forty");
  const visitorsAt = n.word("rate", "visitors");
  const convertAt = n.word("rate", "convert");
  const eighteenAt = n.word("rate", "eighteen");
  const seAt = n.word("rate-se", "standard error");
  const itselfAt = n.word("rate-se", "itself");
  const tenthsAt = n.word("rate-se", "seven tenths");
  const stepAt = n.word("rate-ci", "Step");
  const nineSixAt = n.word("rate-ci", "one point nine six");
  const sixteenAt = n.word("rate-ci", "sixteen");
  const nineteenAt = n.word("rate-ci", "nineteen");
  const answerAt = n.word("test-in", "answer");
  const testInFrom = n.beat("test-in").from;
  const percentAt = n.word("rate-ci", "percent");
  const testAt = n.word("test-in", "test");

  const pct = (v: number) => `${fmt(v * 100, 1)}%`;
  const px = (v: number) => sx(X, v * 100);
  const gridIn = (i: number) => ease(frame, visitorsAt - 14 + (i % COLS) * 0.28 + Math.floor(i / COLS) * 0.12, 8);
  const tinted = (i: number) => ease(frame, convertAt - 6 + (i % COLS) * 0.2, 8);

  return (
    <AbsoluteFill>
      {/* ── Sound: the visitors, the conversions, the rate, the interval ── */}
      <Sfx name="el-sprinkle" at={visitorsAt - 14} level={-34} />
      <Sfx name="el-sprinkle" at={convertAt - 6} level={-33} />
      <Sfx name="el-tap" at={eighteenAt - 4} level={-28} />
      <Sfx name="el-pencil" at={itselfAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={stepAt} level={-33} />

      <Headline at={rateFrom - 4} second={convertAt - 4} out={testInFrom - 4} size={64} italic="an interval too.">
        A rate gets
      </Headline>
      <Headline at={answerAt - 2} second={testAt - 6} size={64} italic="a test.">
        An interval can answer
      </Headline>

      {/* ── Fig. 5: the visitors ── */}
      <FigLabel n="5" title={`${RATE.n.toLocaleString("en-US")} visitors, one square each`} at={visitorsAt - 16} x={GRID_X} y={y(262)} />
      <Svg>
        {Array.from({ length: RATE.n }, (_, i) => {
          const a = gridIn(i);
          if (a <= 0) return null;
          const on = CONVERTED.has(i) ? tinted(i) : 0;
          const c = Math.floor(i / COLS);
          return (
            <rect
              key={i}
              x={GRID_X + (i % COLS) * PITCH}
              y={y(GRID_Y) + h(c * PITCH)}
              width={CELL * a}
              height={CELL * a}
              fill={on > 0.5 ? DATA : FADED}
              opacity={on > 0.5 ? 1 : 0.85}
            />
          );
        })}
      </Svg>
      <Note at={convertAt} x={GRID_X} y={y(GRID_Y) + h(ROWS * PITCH) + 14}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-block", width: 14, height: 14, background: DATA, marginRight: 10 }} />
          converted: {RATE.successes}
        </span>
      </Note>

      {/* ── Right column: the rate, its standard error, its interval ── */}
      <div style={{ position: "absolute", left: COL, top: y(282), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}>
        <Ink at={fiveFortyAt - 4} dur={16} style={{ position: "relative", ...headline(52) }}>
          <PHat /> = {RATE.successes} ÷ {RATE.n.toLocaleString("en-US")}
        </Ink>
        <Ink at={eighteenAt - 6} dur={12} style={{ position: "relative", ...headline(52), color: EST_INK }}>
          = <Count at={eighteenAt - 6} to={RATE.pHat * 100} dur={14} digits={0} suffix="%" />
        </Ink>
      </div>
      <Ink at={seAt - 4} dur={14} style={{ left: COL, top: y(392), whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>A rate’s standard error</span>
      </Ink>
      <div style={{ position: "absolute", left: COL, top: y(432), display: "flex", alignItems: "baseline", gap: 16, whiteSpace: "nowrap" }}>
        <Ink at={itselfAt - 6} dur={18} style={{ position: "relative", fontFamily: SERIF, fontSize: 42, color: INK }}>
          √(<PHat /> (1 − <PHat />) ÷ <i>n</i>)
        </Ink>
        <Ink at={tenthsAt - 4} dur={14} style={{ position: "relative", ...note(34, INK), fontWeight: 700 }}>
          = <Count at={tenthsAt - 4} to={RATE.se * 100} dur={14} digits={2} /> points
        </Ink>
      </div>

      <Axis scale={X} base={y(AXIS)} ticks={[15, 16, 17, 18, 19, 20, 21]} format={(v) => `${v}%`} at={stepAt - 10} />
      <Rule x={px(RATE.pHat)} y0={y(AXIS)} y1={y(BAR_Y) - 30} at={eighteenAt - 2} color={EST} width={3.4} />
      <Note at={eighteenAt} x={px(RATE.pHat) + 12} y={y(BAR_Y) - 70}>
        <span style={{ ...note(22, EST_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          <PHat /> = {pct(RATE.pHat)}
        </span>
      </Note>
      {/* One standard error at a time, out to 1.96 of them. */}
      <Svg opacity={ease(frame, nineSixAt - 4, 12)}>
        {[-1, 1].map((s) => (
          <line
            key={s}
            x1={px(RATE.pHat + s * RATE.se)}
            x2={px(RATE.pHat + s * RATE.se)}
            y1={y(AXIS)}
            y2={y(AXIS) - 14}
            stroke={INK_SOFT}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <Note at={nineSixAt} x={(COL + 1760) / 2} y={y(AXIS) + 46} from="up">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          {fmt(RATE.z)} standard errors either way
        </span>
      </Note>
      <IntervalBar x0={px(RATE.lo)} x1={px(RATE.hi)} y={y(BAR_Y)} at={stepAt} dur={22} color={INK} width={4} tick={14} />
      <Svg>
        <circle cx={px(RATE.pHat)} cy={y(BAR_Y)} r={6.5 * ease(frame, stepAt, 10)} fill={EST} stroke={PAPER} strokeWidth={1.4} />
      </Svg>
      <Note at={sixteenAt - 2} x={px(RATE.lo) - 14} y={y(BAR_Y) - 16} align="right" from="right">
        <span style={{ ...note(26, INK), fontWeight: 700, ...halo }}>{pct(RATE.lo)}</span>
      </Note>
      <Note at={percentAt - 2} x={(COL + 1760) / 2} y={y(AXIS) + 84} from="up">
        <span style={{ ...note(22, INK), fontWeight: 650, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          a 95% interval for the true rate
        </span>
      </Note>
      <Note at={nineteenAt - 2} x={px(RATE.hi) + 14} y={y(BAR_Y) - 16}>
        <span style={{ ...note(26, INK), fontWeight: 700, ...halo }}>{pct(RATE.hi)}</span>
      </Note>
    </AbsoluteFill>
  );
};
