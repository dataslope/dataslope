import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HIGHLIGHT, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, Bracket, Drift, Headline, lerp, Marker, STAT, STAT_INK, Svg } from "./parts";

const TRAPS = ["Simpson's paradox", "Cherry-picking", "The sharpshooter's target"];
/** The three traps as one line of plain names with a middle dot between
 *  them, no boxes, and the bracket under exactly that line: the names run
 *  about 255, 204 and 343px, each dot about 49px with its space, so the
 *  line is about 900px. Its top keeps the line where the words sat inside
 *  their boxes; the bracket sits 12px under the descenders, its label 22px
 *  under it, all in px from y(TAG_Y). */
const TRAPS_X = 160;
const TRAPS_W = 900;
const TAG_Y = 360;
const TRAPS_DY = 14;
const BRACKET_DY = 84;
const FLAW_DY = 106;
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
      <div
        style={{
          position: "absolute",
          left: TRAPS_X,
          top: y(TAG_Y) + TRAPS_DY,
          display: "flex",
          alignItems: "baseline",
          whiteSpace: "nowrap",
          ...body(34, true),
          color: INK,
          opacity: 1 - ease(frame, cureAt - 4, 14) * 0.45,
        }}
      >
        {TRAPS.map((t, i) => (
          <React.Fragment key={t}>
            {/* Each dot arrives with the name after it. */}
            {i ? (
              <Ink at={tagAt(i)} dur={12} style={{ position: "relative", padding: "40px 0.6em", margin: "-40px 0", color: INK_SOFT }}>
                ·
              </Ink>
            ) : null}
            <Ink at={tagAt(i)} dur={12} style={{ position: "relative" }}>
              {t}
            </Ink>
          </React.Fragment>
        ))}
      </div>
      <Bracket x0={TRAPS_X} x1={TRAPS_X + TRAPS_W} y={y(TAG_Y) + BRACKET_DY} at={flawAt - 4} up tick={14} color={STAT} width={2.6} />
      <Ink at={dataAt - 6} dur={14} style={{ left: TRAPS_X, top: y(TAG_Y) + FLAW_DY, whiteSpace: "nowrap" }}>
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
              background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(100 * (i === 0 ? 1 - toConfirm : i === 2 ? toConfirm : 0))}%, ${PAPER})`,
              border: `2px solid ${INK}`,
              ...label(30, INK),
            }}
          >
            {i + 1}. {s}
          </div>
        </Ink>
      ))}
      <Arrow from={[STEP_X[0] + 220, y(STEP_Y) + 32]} to={[STEP_X[1] - 26, y(STEP_Y) + 32]} at={testAt - 2} dur={10} />
      <Arrow from={[STEP_X[1] + 170, y(STEP_Y) + 32]} to={[STEP_X[2] - 26, y(STEP_Y) + 32]} at={confirmAt - 8} dur={10} />
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
            <rect x={lerp(STEP_X[0], STEP_X[2], m)} y={y(STEP_Y) + 72} width={lerp(170, 210, m) * a} height={6} rx={3} fill={STAT} />
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
