import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CALLBACK, jitter } from "./data";
import { Bracket, DOT, Headline, STAT, STAT_INK, Svg } from "./parts";

const X: XScale = { lo: 20, hi: 80, x0: 330, x1: 1290 };
const ROW_A = 430;
const ROW_B = 540;
const JIT = 26;
const JIT_A = jitter(140, CALLBACK.n);
const JIT_B = jitter(141, CALLBACK.n);
/** The course, in the order it built its tools. */
const TOOLS = ["distributions", "standard errors", "intervals", "tests", "effect sizes", "experiments"];

/**
 * The close, for the whole course: its first picture (two groups of forty
 * from one process, B ahead by 3.62) and its first question, could this
 * just be luck?, then what every unit since has been for.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const beganFrom = n.beat("began").from;
  const groupsAt = n.word("began", "two groups");
  const gapAt = n.word("began", "a gap");
  const questionAt = n.word("began", "one question");
  const couldAt = n.word("began", "Could");
  const everythingAt = n.word("since", "Everything");
  const honestlyAt = n.word("since", "honestly", { edge: "end" });
  const lookAt = n.word("last", "look all you like");
  const decideAt = n.word("last", "decide the question");
  const onceAt = n.word("last", "ask it once");
  const hasntAt = n.word("last", "hasn't answered");
  const endAt = n.word("last", "yet", { edge: "end" });

  const meansIn = ease(frame, gapAt - 6, 12);
  const toolAt = (i: number) => everythingAt - 2 + ((honestlyAt - everythingAt - 4) * i) / (TOOLS.length - 1);
  const settle = 1 - 0.6 * ease(frame, lookAt - 6, 16);
  const rest = 1 - 0.35 * ease(frame, endAt + 22, 30);

  const strip = (values: readonly number[], jit: readonly number[], row: number, at: number) =>
    values.map((v, j) => {
      const a = ease(frame, at + j * 0.4, 6);
      if (a <= 0) return null;
      return <circle key={j} cx={sx(X, v)} cy={y(row) + h((jit[j] - 0.5) * 2 * JIT)} r={6.5 * a} fill={DOT} stroke={PAPER} strokeWidth={1.2} />;
    });

  return (
    <AbsoluteFill>
      {/* ── Sound: the two groups, the gap, the tools, the last line ── */}
      <Sfx name="el-sprinkle" at={groupsAt - 4} level={-34} />
      <Sfx name="el-tap" at={gapAt - 6} level={-29} />
      <Sfx name="el-pencil" at={everythingAt - 2} level={-35} />
      <Sfx name="el-pencil" at={hasntAt - 4} level={-34} />
      <Sfx name="el-chime" at={endAt + 10} level={-32} />

      <Headline lead="Two groups," turn="one question." at={beganFrom - 6} turnAt={questionAt - 6} out={lookAt - 8} />
      <Headline lead="Look all you like." turn="Then ask once." at={lookAt - 4} turnAt={onceAt - 6} />
      <div style={{ position: "absolute", left: 96, top: y(262), display: "flex", gap: "0.28em", whiteSpace: "nowrap" }}>
        <Ink at={decideAt - 4} dur={18} style={{ position: "relative" }}>
          <span style={{ ...body(40, true), color: INK_SOFT }}>Decide the question,</span>
        </Ink>
        <Ink at={onceAt - 2} dur={18} style={{ position: "relative" }}>
          <span style={{ ...body(40, true), color: INK_SOFT }}>then ask it of</span>
        </Ink>
        <Ink at={hasntAt - 10} dur={18} style={{ position: "relative" }}>
          <span style={{ ...body(40, true), color: STAT_INK, position: "relative", display: "inline-block" }}>
            data that hasn&apos;t answered it yet.
            <span
              style={{
                position: "absolute",
                left: 0,
                bottom: "-0.08em",
                width: `calc(100% * ${ease(frame, endAt - 2, 26)})`,
                height: 3,
                background: STAT,
                borderRadius: 2,
              }}
            />
          </span>
        </Ink>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: settle * rest }}>
        {(["A", "B"] as const).map((g, i) => (
          <Ink key={g} at={groupsAt - 4 + i * 6} dur={12} style={{ left: 160, top: y(i ? ROW_B : ROW_A) - 14 }}>
            <span style={label(22, INK)}>Group {g}</span>
          </Ink>
        ))}
        <Svg>
          {strip(CALLBACK.a, JIT_A, ROW_A, groupsAt - 4)}
          {strip(CALLBACK.b, JIT_B, ROW_B, groupsAt + 2)}
        </Svg>
        {meansIn > 0 ? (
          <Svg opacity={meansIn}>
            {[
              [CALLBACK.meanA, ROW_A],
              [CALLBACK.meanB, ROW_B],
            ].map(([m, row]) => (
              <line
                key={row}
                x1={sx(X, m)}
                x2={sx(X, m)}
                y1={y(row) - h(40)}
                y2={y(row) + h(40)}
                stroke={STAT}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ))}
          </Svg>
        ) : null}
        <Bracket x0={sx(X, CALLBACK.meanA)} x1={sx(X, CALLBACK.meanB)} y={y(ROW_B + 64)} at={gapAt - 2} color={STAT} up />
        <Ink at={gapAt + 4} dur={14} style={{ left: sx(X, CALLBACK.meanB) + 18, top: y(ROW_B + 64) - 6, whiteSpace: "nowrap" }}>
          <span style={{ ...note(23, STAT_INK), fontWeight: 700 }}>B ahead by {fmt(Math.abs(CALLBACK.gap))}</span>
        </Ink>
        <Ink at={couldAt - 6} dur={20} style={{ left: 160, top: y(668), whiteSpace: "nowrap" }}>
          <span style={{ ...body(48, true), color: INK }}>Could this just be luck?</span>
        </Ink>

        {/* Every tool the course built to answer it. */}
        <Svg opacity={ease(frame, everythingAt - 4, 12)}>
          <line x1={160} x2={1760} y1={y(770)} y2={y(770)} stroke={HAIRLINE} strokeWidth={1} opacity={0.6} />
        </Svg>
        <div style={{ position: "absolute", left: 160, top: y(792), display: "flex", gap: 34, whiteSpace: "nowrap" }}>
          {TOOLS.map((t, i) => (
            <Ink key={t} at={toolAt(i)} dur={12} style={{ position: "relative" }}>
              <span style={{ ...note(26, i === TOOLS.length - 1 ? STAT_INK : INK), fontWeight: 600 }}>{t}</span>
            </Ink>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
