import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { FLAVORS } from "./data";
import { Kicker, lerp, Mark, pulse, RAW, Spot, STAT, STAT_INK, Strike } from "./parts";

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
  const mathAt = n.word("none", "math");
  const numbersAt = n.word("none", "numbers");
  const labelsAt = n.word("none", "labels");
  const quantitiesAt = n.word("none", "not quantities");
  const honestAt = n.word("mode", "honest summary");
  const commonAt = n.word("mode", "most common");
  const vanillaAt = n.word("mode", "Vanilla");
  const computerAt = n.word("kinds-in", "computer");
  const labelAt = n.word("kinds-in", "label");
  const upToYouAt = n.word("kinds-in", "up to you");

  const asLabels = ease(frame, labelsAt - 2, 14);
  const tallyIn = ease(frame, commonAt - 14, 12);
  const mean = fmt(FLAVORS.mean, 1);
  // "The honest summary": the mean of the codes steps back for the tally.
  const meanOp = 1 - ease(frame, honestAt - 2, 18) * 0.6;
  const vanilla = ease(frame, vanillaAt - 2, 12);
  const stored = ease(frame, labelAt - 2, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the cones, ten answers, the average, struck out, the tally ── */}
      <Sfx name="el-pop" at={creamAt - 6} level={-29} />
      <Sfx name="el-sprinkle" at={tenAt - 2} level={-33} />
      <Sfx name="el-tap" at={eightAt - 6} level={-27} />
      <Sfx name="el-scratch" at={noAt} level={-30} />
      <Sfx name="el-whoosh" at={commonAt - 10} level={-32} />
      <Sfx name="el-pop" at={computerAt - 4} level={-30} />

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
            <Mark at={quantitiesAt - 2 + i * 5} out={honestAt + i * 3}>
              <span style={{ ...note(30, INK), fontWeight: 700 }}>{i + 1}</span>
              <span style={note(30, INK_SOFT)}> = {name}</span>
            </Mark>
          </Ink>
        ))}
      </div>

      <Spot id="thinking-statistically-cones" at={creamAt - 6} left={1380} top={y(104)} width={400} height={260} />

      <FigLabel n="6" title="Ten answers, as the survey stores them" at={tenAt - 6} x={160} y={y(380)} />

      {/* ── The ten answers ── */}
      {FLAVORS.answers.map((code, i) => {
        const a = ease(frame, tenAt - 2 + i * 2.5, 10);
        if (a <= 0) return null;
        // "those numbers": each code swells in turn.
        const read = pulse(frame, numbersAt - 2 + i * 1.4, 14);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: chipX(i),
              top: y(CHIP_Y),
              width: CHIP,
              opacity: a,
              transform: `translateY(${(1 - a) * 16}px) scale(${1 + read * 0.12})`,
              transformOrigin: "50% 40%",
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
              {/* "That part is up to you": the reading only a person brings. */}
              <Mark at={upToYouAt - 2 + i * 2}>{FLAVORS.codes[String(code)]}</Mark>
            </div>
          </div>
        );
      })}

      {/* The computer's view of the column: integers, as pandas stores them. */}
      <Ink at={computerAt - 4} dur={14} style={{ left: 1478, top: y(CHIP_Y) + 4, whiteSpace: "nowrap" }}>
        <div style={label(20, INK_SOFT)}>stored as</div>
        <div
          style={{
            marginTop: 8,
            display: "inline-block",
            padding: "2px 12px",
            border: `1.5px solid ${HAIRLINE}`,
            borderRadius: 14,
            fontFamily: MONO,
            fontSize: 22,
            color: INK_SOFT,
            background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(stored * 100)}%, transparent)`,
          }}
        >
          {FLAVORS.dtype}
        </div>
      </Ink>

      {/* ── The mean of the codes ── */}
      <div style={{ position: "absolute", inset: 0, opacity: meanOp }}>
      <Ink at={avgAt - 4} dur={14} style={{ left: 160, top: y(624), whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>Mean of the column</span>
      </Ink>
      <Ink at={eightAt - 6} dur={16} style={{ left: 156, top: y(660), ...headline(140), color: STAT_INK, whiteSpace: "nowrap" }}>
        <Strike at={noAt}>{mean}</Strike>
      </Ink>
      <Note at={noAt + 6} x={160} y={y(826)}>
        <span style={{ ...body(32, true), color: INK, whiteSpace: "nowrap" }}>names no flavor at all</span>
      </Note>
      {/* "The math ran fine": the sum it did, in full. */}
      <Ink at={mathAt - 2} dur={26} out={honestAt - 2} style={{ left: 384, top: y(706), whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: MONO, fontSize: 22, color: INK_SOFT }}>
          ({FLAVORS.answers.join(" + ")}) ÷ {FLAVORS.answers.length}
        </span>
      </Ink>
      </div>

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
              background: s.col === 0 ? `color-mix(in srgb, ${STAT} ${Math.round(vanilla * 70)}%, ${RAW})` : RAW,
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
