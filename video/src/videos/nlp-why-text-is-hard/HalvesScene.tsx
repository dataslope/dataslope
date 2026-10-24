import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ART } from "./data";
import { CurvedArrow, FIG_Y, Headline, Kicker, lerp, Spot, X0 } from "./parts";

const LEFT_X = X0;
const RIGHT_X = 1120;
const TITLE_Y = 334;
// Step 3 is named for what it does; the half is "preprocessing", the
// lesson's own name for it.
const STEPS = ["tokenize", "lowercase", "drop punctuation", "stopwords", "lemmatize"];
const STEP_GAP = 12;
const STEP_SIZE = 22;
/** A step pill's width: Inter at 22px runs about 0.55 em a character. */
const pillW = (s: string) => Math.round(s.length * STEP_SIZE * 0.56 + 36);
const PILL_XS = (() => {
  const xs: number[] = [];
  let x = LEFT_X;
  for (const s of STEPS) {
    xs.push(x);
    x += pillW(s) + STEP_GAP;
  }
  return xs;
})();
const PILLS_RIGHT = PILL_XS[STEPS.length - 1] + pillW(STEPS[STEPS.length - 1]);
/** The bracket over the optional steps (all but tokenize), where the goal's
 *  arrow lands. */
const BR_LEFT = PILL_XS[1];
const BR_MID = (BR_LEFT + PILLS_RIGHT) / 2;

/** A named step or use, as a rounded pill; `dashed` from `dashAt` marks it
 *  optional. */
const Pill: React.FC<{ text: string; x: number; y: number; at: number; dashAt?: number; size?: number; width?: number }> = ({
  text,
  x,
  y,
  at,
  dashAt,
  size = STEP_SIZE,
  width,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const dashed = dashAt !== undefined && frame >= dashAt;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: width ?? pillW(text),
        height: Math.round(size * 1.9),
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${INK}`,
        borderRadius: 999,
        background: PAPER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(size, INK),
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

  const pillY = y(760);
  const swap = ease(frame, orderAt - 2, 24);
  // While two pills trade places, what sits under them steps back.
  const clear = 1 - 0.7 * Math.sin(swap * Math.PI);
  const bracket = ease(frame, soAt + 14, 12) * (1 - ease(frame, orderAt - 8, 8));
  // "lowercase" and "stopwords" trade places.
  const iA = STEPS.indexOf("lowercase");
  const iB = STEPS.indexOf("stopwords");
  const xOf = (i: number) => {
    if (i === iA) return lerp(PILL_XS[iA], PILL_XS[iB] + pillW(STEPS[iB]) - pillW(STEPS[iA]), swap);
    if (i === iB) return lerp(PILL_XS[iB], PILL_XS[iA], swap);
    // The pill between them shifts by the difference in their widths.
    if (i > iA && i < iB) return PILL_XS[i] + (pillW(STEPS[iB]) - pillW(STEPS[iA])) * swap;
    return PILL_XS[i];
  };
  const lift = (i: number) => (i === iA ? -1 : i === iB ? 1 : 0) * Math.sin(swap * Math.PI) * 60;

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
          <Pill text={s} x={xOf(i)} y={pillY} at={cleaningAt + 4 + i * 3} dashAt={i === 0 ? undefined : optionalAt + i * 2} />
        </div>
      ))}
      <Ink at={sameAt - 2} dur={16} style={{ left: LEFT_X, top: pillY + 64, whiteSpace: "nowrap", opacity: clear }}>
        <span style={{ ...body(28, true), color: INK_SOFT }}>the same toolbox in every project</span>
      </Ink>
      <Ink at={optionalAt} dur={14} style={{ right: 1920 - PILLS_RIGHT, top: pillY + 66, whiteSpace: "nowrap", opacity: clear }}>
        <span style={{ ...label(22, INK_SOFT) }}>dashed: optional</span>
      </Ink>
      {/* The optional steps, bracketed: what the goal decides. */}
      {bracket > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: bracket }}>
          <path
            d={`M${BR_LEFT + 4},${pillY - 6} L${BR_LEFT + 4},${pillY - 16} L${PILLS_RIGHT - 4},${pillY - 16} L${PILLS_RIGHT - 4},${pillY - 6}`}
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
        <Pill key={u} text={u} x={RIGHT_X} y={y(TITLE_Y + 96 + i * 82)} at={uses[i] - 4} size={26} width={360} />
      ))}
      <Ink at={goalAt - 4} dur={16} style={{ left: RIGHT_X, top: y(TITLE_Y + 96 + 3 * 82) + 6, whiteSpace: "nowrap" }}>
        <span style={{ ...body(32, true), color: INK }}>depends on your goal</span>
      </Ink>
      {/* The goal chooses the preprocessing too. */}
      <CurvedArrow
        curve={[
          [RIGHT_X - 16, y(TITLE_Y + 96 + 3 * 82) + 26],
          [RIGHT_X - 200, y(TITLE_Y + 96 + 3 * 82) + 26],
          [BR_MID + 150, pillY - 84],
          [BR_MID, pillY - 24],
        ]}
        at={soAt - 2}
        dur={20}
      />
    </AbsoluteFill>
  );
};
