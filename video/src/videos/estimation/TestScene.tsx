import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { Sfx } from "../../sound/Sfx";
import { DIFFERENCE } from "./data";
import { Bracket, EST, EST_INK, Headline, IntervalBar, Marked, pulse, Rule, Svg } from "./parts";

const X: XScale = { lo: -4, hi: 22, x0: 160, x1: 1760 };
const ROW1 = 440;
const ROW2 = 620;
const AXIS = 760;

/** "−0.5", "8.0": a difference the way the figure prints it. */
const signed = (v: number) => (v < 0 ? `−${fmt(-v, 1)}` : fmt(v, 1));

/**
 * Part 2's close: intervals and tests as two views of one thing. An interval
 * for a difference that leaves out zero, then the lesson's -0.5 to 8.0, which
 * includes zero and eight alike; then the formula every interval so far has
 * leaned on, which the bootstrap does without.
 */
export const TestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const testFrom = n.beat("test").from;
  const differenceAt = n.word("test", "difference");
  const leavesAt = n.word("test", "leaves out zero");
  const significantAt = n.word("test", "significant");
  const fiveAt = n.word("test", "five percent");
  const thisAt = n.word("straddle", "This one");
  const levelAt = n.word("test", "level");
  const noEffectAt = n.word("straddle", "no effect");
  const eitherAt = n.word("eight", "either");
  const butIncludesAt = n.word("eight", "includes");
  const viewsFrom = n.beat("views").from;
  const minusAt = n.word("straddle", "minus a half");
  const eightAt = n.word("straddle", "eight");
  const includesAt = n.word("straddle", "includes zero");
  const eightAgainAt = n.word("eight", "eight");
  const bigAt = n.word("eight", "big effect");
  const proofAt = n.word("eight", "proof");
  const moreDataAt = n.word("eight", "more data");
  const viewsAt = n.word("views", "two views");
  const oneThingAt = n.word("views", "one thing");
  const onlyAt = n.word("views", "only");
  const howBigAt = n.word("views", "how big");
  const formulaFrom = n.beat("formula-in").from;
  const formulaAt = n.word("formula-in", "formula");
  const seAt = n.word("formula-in", "standard error");

  const zeroX = sx(X, 0);
  const clear = DIFFERENCE.clear;
  const straddle = DIFFERENCE.straddle;

  return (
    <AbsoluteFill>
      {/* ── Sound: the first interval, the second, the zero it crosses, the formula ── */}
      <Sfx name="el-whoosh" at={differenceAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={thisAt - 2} level={-34} />
      <Sfx name="el-tap" at={includesAt - 2} level={-28} />
      <Sfx name="el-tap" at={eightAgainAt - 2} level={-29} />
      <Sfx name="el-pencil" at={howBigAt - 4} level={-34} />

      <Headline at={testFrom - 4} second={leavesAt - 4} out={viewsFrom - 4} size={64} italic="does it leave out zero?">
        A difference:
      </Headline>
      <Headline at={viewsAt - 2} second={oneThingAt - 4} size={64} italic="one thing.">
        A test and an interval: two views of
      </Headline>

      {/* Zero, and eight, lit where the second interval holds them. */}
      <Svg>
        <rect x={zeroX - 16} y={y(330)} width={32} height={y(AXIS) - y(330)} fill={ds("red", 100)} opacity={ease(frame, includesAt - 4, 12) * (1 - 0.6 * ease(frame, eightAgainAt, 12))} />
        <rect
          x={sx(X, straddle.hi) - 16}
          y={y(ROW2) - 60}
          width={32}
          height={120}
          fill={ds("red", 100)}
          opacity={ease(frame, butIncludesAt - 2, 12)}
        />
      </Svg>

      <FigLabel n="6" title="95% intervals for a difference between two groups" at={testFrom - 2} x={160} y={y(262)} />
      <Axis scale={X} base={y(AXIS)} ticks={[-4, 0, 4, 8, 12, 16, 20]} format={(v) => (v < 0 ? `−${-v}` : String(v))} at={testFrom} />
      <Rule
        x={zeroX}
        y0={y(AXIS)}
        y1={y(330)}
        at={leavesAt - 4}
        dur={18}
        color={INK}
        width={2.4 + 1.6 * (pulse(frame, includesAt - 2, 18) + pulse(frame, noEffectAt - 2, 18))}
        dash="7 6"
      />
      <Note at={leavesAt} x={zeroX + 12} y={y(318)}>
        <span style={{ ...note(22, INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>
          zero: no difference
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, viewsAt + 8, 12) }}>. The test asks: is it inside?</span>
        </span>
      </Note>

      {/* ── Row 1: one that leaves out zero ── */}
      <IntervalBar
        x0={sx(X, clear.lo)}
        x1={sx(X, clear.hi)}
        y={y(ROW1)}
        at={differenceAt - 2}
        dur={20}
        color={INK}
        width={4 + 3 * pulse(frame, levelAt - 2, 18)}
        tick={14}
      />
      <Svg>
        <circle cx={sx(X, clear.estimate)} cy={y(ROW1)} r={6.5 * ease(frame, differenceAt + 4, 10)} fill={EST} stroke={PAPER} strokeWidth={1.4} />
      </Svg>
      <Note at={differenceAt + 6} x={sx(X, clear.lo) - 14} y={y(ROW1) - 16} align="right" from="right">
        <span style={{ ...note(24, INK), fontWeight: 700, ...halo }}>{signed(clear.lo)}</span>
      </Note>
      <Note at={differenceAt + 8} x={sx(X, clear.hi) + 14} y={y(ROW1) - 16}>
        <span style={{ ...note(24, INK), fontWeight: 700, ...halo }}>{signed(clear.hi)}</span>
      </Note>
      <Note at={significantAt - 4} x={sx(X, clear.lo)} y={y(ROW1) + 26}>
        <span style={{ ...note(23, INK), ...halo, whiteSpace: "nowrap" }}>
          leaves out zero: significant at the{" "}
          <Marked at={fiveAt - 2} color={HIGHLIGHT}>
            5% level
          </Marked>
        </span>
      </Note>

      {/* ── Row 2: the lesson's −0.5 to 8.0 ── */}
      <IntervalBar
        x0={sx(X, straddle.lo)}
        x1={sx(X, straddle.hi)}
        y={y(ROW2)}
        at={thisAt - 2}
        dur={Math.max(20, eightAt - thisAt)}
        color={INK}
        width={4}
        tick={14}
      />
      <Svg>
        <circle
          cx={sx(X, (straddle.lo + straddle.hi) / 2)}
          cy={y(ROW2)}
          r={6.5 * ease(frame, thisAt + 4, 10)}
          fill={EST}
          stroke={PAPER}
          strokeWidth={1.4}
        />
        {/* Where it crosses zero, and the big effect it also holds. */}
        <circle cx={zeroX} cy={y(ROW2)} r={17} fill="none" stroke={EST} strokeWidth={3} opacity={ease(frame, includesAt - 2, 10)} />
        <circle
          cx={sx(X, straddle.hi)}
          cy={y(ROW2)}
          r={17 + 4 * pulse(frame, bigAt - 2, 16) + 5 * pulse(frame, eitherAt - 2, 18)}
          fill="none"
          stroke={EST}
          strokeWidth={3}
          opacity={ease(frame, eightAgainAt - 4, 10)}
        />
      </Svg>
      <Note at={minusAt - 2} x={sx(X, straddle.lo) - 22} y={y(ROW2) - 16} align="right" from="right">
        <span style={{ ...note(24, INK), fontWeight: 700, ...halo }}>{signed(straddle.lo)}</span>
      </Note>
      <Note at={eightAt - 4} x={sx(X, straddle.hi) + 26} y={y(ROW2) - 16}>
        <span style={{ ...note(24, INK), fontWeight: 700, ...halo }}>{signed(straddle.hi)}</span>
      </Note>
      <Note at={noEffectAt - 6} x={zeroX + 26} y={y(ROW2) + 30}>
        <span style={{ ...note(23, EST_INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>includes zero: can’t rule out no effect</span>
      </Note>
      <Note at={bigAt - 2} x={zeroX + 26} y={y(ROW2) + 64}>
        <span style={{ ...note(23, EST_INK), fontWeight: 650, ...halo, whiteSpace: "nowrap" }}>includes eight: can’t rule out a big one</span>
      </Note>
      <Note at={proofAt - 4} x={sx(X, 12)} y={y(ROW2) - 80}>
        <span style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>Not proof of nothing:</span>
      </Note>
      <Note at={moreDataAt - 4} x={sx(X, 12)} y={y(ROW2) - 42}>
        <span style={{ ...body(30, true), color: EST_INK, whiteSpace: "nowrap" }}>a call for more data.</span>
      </Note>

      {/* ── What only the interval shows: how big ── */}
      <Bracket x0={sx(X, clear.lo)} x1={sx(X, clear.hi)} y={y(ROW1) - 40} at={howBigAt - 4} color={EST} />
      <Note at={howBigAt} x={sx(X, clear.estimate)} y={y(ROW1) - 84} from="up">
        <span style={{ ...note(22, EST_INK), fontWeight: 650, ...halo, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          and how big it might be
        </span>
      </Note>
      <Svg opacity={pulse(frame, onlyAt - 2, 20)}>
        <line x1={sx(X, clear.lo)} x2={sx(X, clear.hi)} y1={y(ROW1)} y2={y(ROW1)} stroke={EST} strokeWidth={8} strokeLinecap="round" opacity={0.5} />
      </Svg>

      {/* ── The formula all of it leaned on ── */}
      <Ink at={formulaFrom - 4} dur={16} style={{ left: 160, top: y(830), whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT) }}>Every interval so far:</span>
        <span style={{ ...note(30, INK), fontWeight: 600, marginLeft: 18, opacity: ease(frame, formulaAt - 4, 12) }}>
          <Marked at={seAt - 2} color={HIGHLIGHT}>
            standard error
          </Marked>{" "}
          = a formula, like s ÷ √n
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
