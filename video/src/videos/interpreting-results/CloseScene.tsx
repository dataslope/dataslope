import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HIGHLIGHT, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, Bracket, Headline, Marker, STAT, STAT_INK } from "./parts";

const TRAPS = ["Simpson's paradox", "Cherry-picking", "The sharpshooter's target"];
const TAG_X = [160, 640, 1100];
const TAG_Y = 360;
const STEPS = ["Decide", "Look", "Confirm"];
const STEP_X = [160, 560, 960];
const STEP_Y = 620;

/**
 * The close: the traps that share one flaw, the order that cures it, and the
 * bridge to Unit 9, exploring and then confirming.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const trapsAt = n.word("close", "traps");
  const flawAt = n.word("close", "one flaw");
  const shapedAt = n.word("close", "shaped");
  const dataAt = n.word("close", "data");
  const advanceAt = n.word("close", "in advance");
  const cureAt = n.word("next", "cure");
  const decideAt = n.word("next", "decide");
  const testAt = n.word("next", "test");
  const lookAt = n.word("next", "look");

  const tagAt = (i: number) => trapsAt - 4 + i * 5;
  const stepAt = [decideAt - 4, lookAt - 6, lookAt + 6];

  return (
    <AbsoluteFill>
      {/* ── Sound: each trap, the bracket, the steps ── */}
      {TRAPS.map((t, i) => (
        <Sfx key={t} name="el-tap" at={tagAt(i)} level={-30} />
      ))}
      <Sfx name="el-pencil" at={shapedAt - 4} level={-34} />
      <Sfx name="el-pop" at={decideAt - 4} level={-30} />
      <Sfx name="el-pencil" at={lookAt - 10} level={-35} />

      <Headline
        top={y(150)}
        parts={[
          { text: "Shaped by the data,", at: shapedAt - 6 },
          { text: "not decided in advance.", at: advanceAt - 8, italic: true },
        ]}
      />

      {TRAPS.map((t, i) => (
        <Ink key={t} at={tagAt(i)} dur={12} style={{ left: TAG_X[i], top: y(TAG_Y), whiteSpace: "nowrap" }}>
          <div
            style={{
              padding: "12px 22px",
              border: `2px solid ${INK}`,
              borderRadius: 8,
              background: PAPER,
              ...body(34, true),
              color: INK,
              opacity: 1 - ease(frame, cureAt - 4, 14) * 0.45,
            }}
          >
            {t}
          </div>
        </Ink>
      ))}
      <Bracket x0={TAG_X[0]} x1={TAG_X[2] + 420} y={y(TAG_Y) + 96} at={flawAt - 4} up tick={14} color={STAT} width={2.6} />
      <Ink at={dataAt - 6} dur={14} style={{ left: TAG_X[0], top: y(TAG_Y) + 118, whiteSpace: "nowrap" }}>
        <span style={label(26, STAT_INK)}>
          one flaw: the data chose the analysis, <Marker at={advanceAt - 4}>not the plan</Marker>
        </span>
      </Ink>

      {/* ── The order that cures it ── */}
      {STEPS.map((s, i) => (
        <Ink key={s} at={stepAt[i]} dur={14} style={{ left: STEP_X[i], top: y(STEP_Y), whiteSpace: "nowrap" }}>
          <div
            style={{
              padding: "12px 26px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(100 * (i === 0 ? 1 - ease(frame, lookAt + 24, 20) : i === 2 ? ease(frame, lookAt + 24, 20) : 0))}%, ${PAPER})`,
              border: `2px solid ${INK}`,
              ...label(30, INK),
            }}
          >
            {i + 1}. {s}
          </div>
        </Ink>
      ))}
      <Arrow from={[STEP_X[0] + 220, y(STEP_Y) + 32]} to={[STEP_X[1] - 26, y(STEP_Y) + 32]} at={testAt - 2} dur={10} />
      <Arrow from={[STEP_X[1] + 170, y(STEP_Y) + 32]} to={[STEP_X[2] - 26, y(STEP_Y) + 32]} at={lookAt + 2} dur={10} />
      <Ink at={testAt - 2} dur={12} style={{ left: STEP_X[0], top: y(STEP_Y) + 90, whiteSpace: "nowrap" }}>
        <span style={{ ...body(28, true), color: INK_SOFT }}>what you&apos;ll test, before you look</span>
      </Ink>

      <NextLine at={lookAt - 2} x={1240} y={y(STEP_Y) + 150} width={560}>
        exploring, then confirming.
      </NextLine>
    </AbsoluteFill>
  );
};
