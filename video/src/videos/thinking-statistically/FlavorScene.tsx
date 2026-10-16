import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FLAVORS } from "./data";
import { Kicker, lerp, RAW, Spot, STAT_INK, Strike } from "./parts";

const CHIP = 96;
const CHIP_PITCH = 132;
const CHIP_X = 160;
const CHIP_Y = 440;
/** The tally: one block per answer, stacked by flavor. */
const STACK_X = [860, 1110, 1360];
const STACK_W = 170;
const BLOCK = 34;
const STACK_BASE = 860;

const NAMES = ["1", "2", "3"].map((c) => FLAVORS.codes[c]);
const chipX = (i: number) => CHIP_X + i * CHIP_PITCH;

/** Where each answer's block lands in the tally. */
const SLOTS = (() => {
  const filled = [0, 0, 0];
  return FLAVORS.answers.map((code) => {
    const col = code - 1;
    return { col, k: filled[col]++ };
  });
})();

/**
 * Part 3 opens: favorite flavors stored as the codes 1, 2 and 3, a mean of
 * 1.8 that names no flavor, and the tally whose most common answer is the
 * honest summary.
 */
export const FlavorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const flavorsFrom = n.beat("flavors").from;
  const creamAt = n.word("flavors", "ice cream");
  const codeAt = [n.word("flavors", "One"), n.word("flavors", "two"), n.word("flavors", "three")];
  const tenAt = n.word("average", "Ten");
  const avgAt = n.word("average", "Average");
  const eightAt = n.word("average", "one point eight");
  const noAt = n.word("none", "no flavor");
  const labelsAt = n.word("none", "labels");
  const commonAt = n.word("mode", "most common");
  const vanillaAt = n.word("mode", "Vanilla");

  const asLabels = ease(frame, labelsAt - 2, 14);
  const tallyIn = ease(frame, commonAt - 14, 12);
  const mean = fmt(FLAVORS.mean, 1);

  return (
    <AbsoluteFill>
      <Kicker at={flavorsFrom - 4}>What kind of data</Kicker>

      <Ink at={flavorsFrom - 2} dur={20} out={noAt - 8} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Flavors, stored as numbers.
      </Ink>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={noAt - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          There is no flavor
        </Ink>
        <Ink at={noAt + 8} dur={16} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          {mean}.
        </Ink>
      </div>

      {/* The codebook. */}
      <div style={{ position: "absolute", left: 96, top: y(264), display: "flex", gap: 48 }}>
        {NAMES.map((name, i) => (
          <Ink key={name} at={codeAt[i] - 4} dur={14} style={{ position: "relative", whiteSpace: "nowrap" }}>
            <span style={{ ...note(30, INK), fontWeight: 700 }}>{i + 1}</span>
            <span style={note(30, INK_SOFT)}> = {name}</span>
          </Ink>
        ))}
      </div>

      <Spot id="thinking-statistically-cones" at={creamAt - 6} left={1380} top={y(104)} width={400} height={260} />

      <FigLabel n="6" title="Ten answers, as the survey stores them" at={tenAt - 6} x={160} y={y(380)} />

      {/* ── The ten answers ── */}
      {FLAVORS.answers.map((code, i) => {
        const a = ease(frame, tenAt - 2 + i * 2.5, 10);
        if (a <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: chipX(i),
              top: y(CHIP_Y),
              width: CHIP,
              opacity: a,
              transform: `translateY(${(1 - a) * 16}px)`,
            }}
          >
            <div
              style={{
                height: CHIP,
                boxSizing: "border-box",
                border: `2px solid ${INK}`,
                borderRadius: 10,
                background: PAPER,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...headline(58),
                color: `color-mix(in srgb, ${INK} ${Math.round(100 - asLabels * 55)}%, transparent)`,
              }}
            >
              {code}
            </div>
            <div
              style={{
                marginTop: 10,
                textAlign: "center",
                whiteSpace: "nowrap",
                ...note(21, asLabels > 0.5 ? INK : INK_SOFT),
                fontWeight: lerp(500, 600, asLabels),
              }}
            >
              {FLAVORS.codes[String(code)]}
            </div>
          </div>
        );
      })}

      {/* ── The mean of the codes ── */}
      <Ink at={avgAt - 4} dur={14} style={{ left: 160, top: y(624), whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>Mean of the column</span>
      </Ink>
      <Ink at={eightAt - 6} dur={16} style={{ left: 156, top: y(660), ...headline(140), color: STAT_INK, whiteSpace: "nowrap" }}>
        <Strike at={noAt}>{mean}</Strike>
      </Ink>
      <Note at={noAt + 6} x={160} y={y(826)}>
        <span style={{ ...body(32, true), color: INK, whiteSpace: "nowrap" }}>names no flavor at all</span>
      </Note>

      {/* ── The tally ── */}
      {STACK_X.map((x, col) => (
        <div
          key={col}
          style={{
            position: "absolute",
            left: x,
            top: y(STACK_BASE) + 12,
            width: STACK_W,
            textAlign: "center",
            opacity: tallyIn,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ ...note(22, INK), fontWeight: 600 }}>{NAMES[col]}</span>
          <span style={note(22, INK_SOFT)}> {FLAVORS.counts[NAMES[col]]}</span>
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: STACK_X[0] - 20,
          width: STACK_X[2] + STACK_W + 20 - (STACK_X[0] - 20),
          top: y(STACK_BASE),
          height: 1.6,
          background: INK,
          opacity: tallyIn,
        }}
      />
      {FLAVORS.answers.map((code, i) => {
        const s = SLOTS[i];
        const t = ease(frame, commonAt - 10 + i * 1.5, 18);
        if (t <= 0) return null;
        const fromX = chipX(i);
        const fromY = y(CHIP_Y);
        const toX = STACK_X[s.col];
        const toY = y(STACK_BASE) - h((s.k + 1) * BLOCK);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: lerp(fromX, toX, t),
              top: lerp(fromY, toY, t),
              width: lerp(CHIP, STACK_W, t),
              height: lerp(CHIP, h(BLOCK) - 4, t),
              borderRadius: lerp(10, 3, t),
              background: RAW,
              border: `2px solid color-mix(in srgb, ${INK} ${Math.round(t * 40)}%, transparent)`,
              boxSizing: "border-box",
              opacity: Math.min(1, t * 3),
            }}
          />
        );
      })}
      <Note at={vanillaAt - 4} x={STACK_X[0]} y={y(STACK_BASE) - h(FLAVORS.counts[NAMES[0]] * BLOCK) - 44}>
        <span style={{ ...label(24, STAT_INK), whiteSpace: "nowrap" }}>Most common: {FLAVORS.mode}</span>
      </Note>
    </AbsoluteFill>
  );
};
