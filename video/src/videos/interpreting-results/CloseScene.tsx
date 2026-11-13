import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { badgeStyle, Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, Bracket, Drift, Headline, lerp, Marker, STAT, STAT_INK, Svg } from "./parts";

const TRAPS = ["Simpson's paradox", "Cherry-picking", "The sharpshooter's target"];
/** The three traps as gray house badges, the bracket under the row of them. */
const TAG_X = [160, 640, 1100];
const TAG_Y = 360;
const STEPS = ["Decide", "Look", "Confirm"];
const STEP_X = [160, 560, 960];
const STEP_Y = 620;
/** Each step's box, wide enough for its words, so an arrow can run from
 *  one box's edge to the next's; STEP_MID is the boxes' middle. */
const STEP_W = [220, 200, 250];
const STEP_MID = 30;

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
  const confirmAt = n.word("confirm", "confirm");
  const findAt = n.word("confirm", "what you find");
  const freshAt = n.word("confirm", "fresh data");

  const tagAt = (i: number) => trapsAt - 4 + i * 5;
  const stepAt = [decideAt - 4, lookAt - 6, confirmAt - 4];
  // The highlight moves from deciding to confirming as "confirm" is said.
  const toConfirm = ease(frame, confirmAt - 2, 20);

  return (
    <AbsoluteFill>
      {/* ── Sound: each trap, the bracket, the steps ── */}
      {TRAPS.map((t, i) => (
        <Sfx key={t} name="el-tap" at={tagAt(i)} level={-30} />
      ))}
      <Sfx name="el-pencil" at={shapedAt - 4} level={-34} />
      <Sfx name="el-pop" at={decideAt - 4} level={-30} />
      <Sfx name="el-pencil" at={lookAt - 10} level={-35} />
      <Sfx name="el-pop" at={confirmAt - 4} level={-30} />

      <Headline
        top={y(150)}
        parts={[
          { text: "Shaped by the data,", at: shapedAt - 6 },
          { text: "not decided in advance.", at: advanceAt - 8, italic: true },
        ]}
      />

      {/* The finished close eases in over the last words and the hold after them. */}
      <Drift from={freshAt} to={n.durationInFrames} amount={0.025} origin={[960, 560]}>
      {TRAPS.map((t, i) => (
        <Ink key={t} at={tagAt(i)} dur={12} style={{ left: TAG_X[i], top: y(TAG_Y), whiteSpace: "nowrap" }}>
          <div
            style={{
              ...body(34, true),
              ...badgeStyle("gray", 34),
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
          One flaw: the data chose the analysis, <Marker at={advanceAt - 4}>not the plan</Marker>
        </span>
      </Ink>

      {/* ── The order that cures it ── */}
      {STEPS.map((s, i) => {
        const lit = i === 0 ? 1 - toConfirm : i === 2 ? toConfirm : 0;
        return (
          <Ink key={s} at={stepAt[i]} dur={14} style={{ left: STEP_X[i], top: y(STEP_Y), whiteSpace: "nowrap" }}>
            <div
              style={{
                width: STEP_W[i],
                boxSizing: "border-box",
                textAlign: "center",
                // 2px less padding for the 2px border, so the box keeps its size.
                padding: "10px 0",
                borderRadius: 8,
                // Outlined in ink with no fill (the owner, 2026-11-13: "use
                // black border, transparent background, and black text"), and
                // only the step's word is lit while the narration is on it,
                // not the whole box ("highlight only the Confirm text").
                border: `2px solid ${INK}`,
                background: "transparent",
                ...label(30, INK),
              }}
            >
              {i + 1}.{" "}
              <span
                style={{
                  padding: "0 0.12em",
                  margin: "0 -0.12em",
                  borderRadius: "0.12em",
                  background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(85 * lit)}%, transparent)`,
                }}
              >
                {s}
              </span>
            </div>
          </Ink>
        );
      })}
      <Arrow from={[STEP_X[0] + STEP_W[0], y(STEP_Y) + STEP_MID]} to={[STEP_X[1], y(STEP_Y) + STEP_MID]} at={testAt - 2} dur={10} />
      <Arrow from={[STEP_X[1] + STEP_W[1], y(STEP_Y) + STEP_MID]} to={[STEP_X[2], y(STEP_Y) + STEP_MID]} at={confirmAt - 8} dur={10} />
      <Ink at={testAt - 2} dur={12} style={{ left: STEP_X[0], top: y(STEP_Y) + 90, whiteSpace: "nowrap" }}>
        <span style={{ ...body(28, true), color: INK_SOFT }}>what you&apos;ll test, before you look</span>
      </Ink>
      <Ink at={findAt - 2} dur={12} style={{ left: STEP_X[2], top: y(STEP_Y) + 90, whiteSpace: "nowrap" }}>
        <span style={{ ...body(28, true), color: INK_SOFT }}>
          what you find, on <Marker at={freshAt - 2}>fresh data</Marker>
        </span>
      </Ink>

      {(() => {
        const a = ease(frame, decideAt - 2, 10);
        if (a <= 0) return null;
        const m = ease(frame, confirmAt - 2, 26);
        return (
          <Svg>
            <rect x={lerp(STEP_X[0], STEP_X[2], m)} y={y(STEP_Y) + 72} width={lerp(STEP_W[0], STEP_W[2], m) * a} height={6} rx={3} fill={STAT} />
          </Svg>
        );
      })()}
      <NextLine at={freshAt + 8} x={1240} y={y(STEP_Y) + 170} width={560}>
        exploring, then confirming.
      </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
