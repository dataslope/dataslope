import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ART } from "./data";
import { CurvedArrow, FIG_Y, Headline, Kicker, lerp, Spot, X0 } from "./parts";

/** Two halves, each plain text under its heading: no pills. The steps are
 *  one row of words with a middle dot in each gap, the uses a short list.
 *  Layout units for positions (through y()), px across. */
const LEFT_X = X0;
const RIGHT_X = 1120;
const TITLE_Y = 334;
// Step 3 is named for what it does; the half is "preprocessing", the
// lesson's own name for it.
const STEPS = ["tokenize", "lowercase", "drop punctuation", "stopwords", "lemmatize"];
const STEP_SIZE = 26;
/** Each step's width in Inter semibold at 26px, measured. */
const STEP_W: Record<string, number> = {
  tokenize: 107,
  lowercase: 129,
  "drop punctuation": 216,
  stopwords: 133,
  lemmatize: 130,
};
const stepW = (s: string) => STEP_W[s];
/** The space between two steps, a middle dot at its centre. */
const STEP_GAP = 50;
const STEP_XS = (() => {
  const xs: number[] = [];
  let x = LEFT_X;
  for (const s of STEPS) {
    xs.push(x);
    x += stepW(s) + STEP_GAP;
  }
  return xs;
})();
const STEPS_RIGHT = STEP_XS[STEPS.length - 1] + stepW(STEPS[STEPS.length - 1]);
/** The bracket over the optional steps (all but tokenize), where the goal's
 *  arrow lands. */
const BR_LEFT = STEP_XS[1];
const BR_MID = (BR_LEFT + STEPS_RIGHT) / 2;
/** The text sits a little under the row's top, so its middle stays where the
 *  pills' was and the bracket keeps its air. */
const STEP_DROP = 5;
/** The analysis half's three uses, one line each, a short list under its
 *  heading: about 27px under the heading, 25px between lines of 30px type
 *  once the layout stretches them, and its closing line 44px under the
 *  last. Layout units. */
const USE_SIZE = 30;
const USE_Y = TITLE_Y + 72;
const USE_STEP = 54;
const GOAL_Y = USE_Y + 2 * USE_STEP + 70;

/** A named step, as a word in the row. From `dashAt` a dashed underline
 *  draws in under it, the mark of an optional step. */
const Step: React.FC<{ text: string; x: number; y: number; at: number; dashAt?: number }> = ({ text, x, y, at, dashAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const dash = dashAt === undefined ? 0 : ease(frame, dashAt, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + STEP_DROP,
        width: stepW(text),
        textAlign: "center",
        ...label(STEP_SIZE, INK),
        fontWeight: 600,
        whiteSpace: "nowrap",
        textDecorationLine: dash > 0 ? "underline" : "none",
        textDecorationStyle: "dashed",
        textDecorationThickness: 2,
        textUnderlineOffset: 8,
        textDecorationColor: `color-mix(in srgb, ${INK} ${(dash * 100).toFixed(0)}%, transparent)`,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {text}
    </div>
  );
};

/** A use of analysis, as a line of text under its heading. */
const Use: React.FC<{ text: string; x: number; y: number; at: number }> = ({ text, x, y, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        ...label(USE_SIZE, INK),
        fontWeight: 600,
        whiteSpace: "nowrap",
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {text}
    </div>
  );
};

/**
 * Part 3, the two halves: the steps just shown are the preprocessing half (the
 * conveyor), one toolbox every project picks from; analysis is what comes after
 * and depends on the goal, which should also choose the preprocessing, most of
 * whose steps are optional. On "order", two steps trade places.
 */
export const HalvesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("cleaning").from;
  const cleaningAt = n.word("cleaning", "preprocessing");
  const sameAt = n.word("cleaning", "same toolbox");
  const analysisAt = n.word("analysis", "Analysis");
  const uses = [n.word("analysis", "counting"), n.word("analysis", "tagging"), n.word("analysis", "building features")];
  const goalAt = n.word("analysis", "goal");
  const soAt = n.word("analysis", "so should");
  const optionalAt = n.word("analysis", "optional");
  const orderAt = n.word("order-in", "order");

  const rowY = y(760);
  const swap = ease(frame, orderAt - 2, 24);
  // While two steps trade places, what sits under them steps back, and the
  // dots between the steps lift out and come back once they have landed.
  const clear = 1 - 0.7 * Math.sin(swap * Math.PI);
  const dots = 1 - Math.sin(swap * Math.PI);
  const bracket = ease(frame, soAt + 14, 12) * (1 - ease(frame, orderAt - 8, 8));
  // "lowercase" and "stopwords" trade places.
  const iA = STEPS.indexOf("lowercase");
  const iB = STEPS.indexOf("stopwords");
  const xOf = (i: number) => {
    if (i === iA) return lerp(STEP_XS[iA], STEP_XS[iB] + stepW(STEPS[iB]) - stepW(STEPS[iA]), swap);
    if (i === iB) return lerp(STEP_XS[iB], STEP_XS[iA], swap);
    // The step between them shifts by the difference in their widths.
    if (i > iA && i < iB) return STEP_XS[i] + (stepW(STEPS[iB]) - stepW(STEPS[iA])) * swap;
    return STEP_XS[i];
  };
  const lift = (i: number) => (i === iA ? -1 : i === iB ? 1 : 0) * Math.sin(swap * Math.PI) * 60;
  const stepAt = (i: number) => cleaningAt + 4 + i * 3;
  const goalTop = y(GOAL_Y);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pop" at={cleaningAt - 2} level={-31} />
      <Sfx name="el-tap" at={analysisAt - 2} level={-30} />
      {uses.map((t) => (
        <Sfx key={t} name="el-tap" at={t} level={-33} />
      ))}
      <Sfx name="el-pencil" at={soAt - 4} level={-35} />
      <Sfx name="el-whoosh" at={orderAt - 2} level={-34} />

      <Kicker at={from - 10}>Preprocessing, then analysis</Kicker>
      <Headline lead="Preprocess first," turn="then analyze." at={from - 6} turnAt={analysisAt - 6} />
      <FigLabel n="10" title="The two halves of a pipeline: preprocessing, then analysis" at={from + 2} x={X0} y={y(FIG_Y)} />

      {/* ── Preprocessing ── */}
      <Ink at={cleaningAt - 4} dur={14} style={{ left: LEFT_X, top: y(TITLE_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...body(44), color: INK, fontWeight: 600 }}>Preprocessing</span>
      </Ink>
      <Spot id={ART.conveyor} at={cleaningAt} left={LEFT_X + 20} top={y(TITLE_Y) + 66} width={700} height={300} />
      {STEPS.map((s, i) => (
        <div key={s} style={{ position: "absolute", inset: 0, transform: `translateY(${lift(i)}px)` }}>
          <Step text={s} x={xOf(i)} y={rowY} at={stepAt(i)} dashAt={i === 0 ? undefined : optionalAt + i * 2} />
        </div>
      ))}
      {/* A middle dot after every step but the last (lemmatize, which never
          moves), inking in with the step to its right. */}
      {STEPS.slice(0, -1).map((s, i) => {
        const p = ease(frame, stepAt(i + 1), 12) * dots;
        if (p <= 0) return null;
        return (
          <div
            key={`dot-${s}`}
            style={{
              position: "absolute",
              left: xOf(i) + stepW(s) + STEP_GAP / 2,
              top: rowY + STEP_DROP,
              transform: "translateX(-50%)",
              ...label(STEP_SIZE, INK_SOFT),
              opacity: p,
            }}
          >
            ·
          </div>
        );
      })}
      <Ink at={sameAt - 2} dur={16} style={{ left: LEFT_X, top: rowY + 62, whiteSpace: "nowrap", opacity: clear }}>
        <span style={{ ...body(28, true), color: INK_SOFT }}>the same toolbox in every project</span>
      </Ink>
      <Ink at={optionalAt} dur={14} style={{ right: 1920 - STEPS_RIGHT, top: rowY + 64, whiteSpace: "nowrap", opacity: clear }}>
        <span style={{ ...label(22, INK_SOFT) }}>dashed: optional</span>
      </Ink>
      {/* The optional steps, bracketed: what the goal decides. */}
      {bracket > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: bracket }}>
          <path
            d={`M${BR_LEFT + 4},${rowY - 6} L${BR_LEFT + 4},${rowY - 16} L${STEPS_RIGHT - 4},${rowY - 16} L${STEPS_RIGHT - 4},${rowY - 6}`}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      {/* ── Analysis ── */}
      <Ink at={analysisAt - 4} dur={14} style={{ left: RIGHT_X, top: y(TITLE_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...body(44), color: INK, fontWeight: 600 }}>Analysis</span>
      </Ink>
      {["counting", "tagging", "building features"].map((u, i) => (
        <Use key={u} text={u} x={RIGHT_X} y={y(USE_Y + i * USE_STEP)} at={uses[i] - 4} />
      ))}
      <Ink at={goalAt - 4} dur={16} style={{ left: RIGHT_X, top: goalTop, whiteSpace: "nowrap" }}>
        <span style={{ ...body(32, true), color: INK }}>depends on your goal</span>
      </Ink>
      {/* The goal chooses the preprocessing too. */}
      <CurvedArrow
        curve={[
          [RIGHT_X - 16, goalTop + 20],
          [RIGHT_X - 200, goalTop + 20],
          [BR_MID + 150, rowY - 84],
          [BR_MID, rowY - 24],
        ]}
        at={soAt - 2}
        dur={20}
      />
    </AbsoluteFill>
  );
};
