import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { pct, row, TOKENS, TOP_P } from "./data";
import { FILL, Struck, TEXT, TINT } from "./kit";

/** Both bars run 0 to 100% across this span; rock's label goes past its end. */
const X0 = 160;
const X1 = 1660;
const px = (share: number) => X0 + (X1 - X0) * share;
const BAR_H = 80;
const BAR_A = 340;
const BAR_B = 640;

const HOT = row(1.5);
const KEPT = HOT.topP.kept;
const ROCK = TOKENS.length - 1;
/** Tokens are already in probability order, so segments run left to right. */
const starts = (probs: readonly number[]) => probs.map((_, i) => probs.slice(0, i).reduce((a, b) => a + b, 0));

/**
 * Top p and the cut: the distribution at T = 1.5, summed likeliest first
 * until it passes 0.9; rock is left out, and the rest is rescaled.
 */
export const TopPScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("topp").from;
  const keepAt = n.word("topp", "likeliest tokens");
  const ninetyAt = n.word("topp", "ninety percent");
  const dropAt = n.word("topp", "drop the rest");
  const keepsAt = n.word("topp-cut", "keeps cat");
  const cutAt = n.word("topp-cut", "Rock is cut");

  const startsA = starts(HOT.probs);
  const startsB = starts(HOT.topP.renormalized);
  const barA = y(BAR_A);
  const barB = y(BAR_B);
  const bh = h(BAR_H);
  const rockGone = ease(frame, dropAt, 14);
  const runAt = (k: number) => keepAt + k * 10;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Top-p cuts the tail
        </Ink>
        <Ink at={dropAt - 2} dur={18} style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          before the draw.
        </Ink>
      </div>
      <FigLabel n="4" title={`Top-p of ${TOP_P}, applied after temperature ${HOT.t}`} at={start} x={120} y={y(196)} />

      {/* Bar A: the distribution at T = 1.5, one segment per token. */}
      <Ink at={start - 4} dur={14} style={{ left: X0, top: barA - 50 }}>
        <span style={label(20)}>At T = {HOT.t}</span>
      </Ink>
      {TOKENS.map((_, i) => {
        const x = px(startsA[i]);
        const w = px(startsA[i] + HOT.probs[i]) - x;
        const isRock = i === ROCK;
        const inside = !isRock;
        return (
          <React.Fragment key={i}>
            <Ink at={start - 2 + i * 4} dur={14} style={{ left: x, top: barA, width: w - 2, height: bh }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  boxSizing: "border-box",
                  background: isRock ? `color-mix(in srgb, ${TINT[i]} ${(1 - rockGone) * 100}%, transparent)` : TINT[i],
                  borderBottom: `5px solid ${FILL[i]}`,
                  outline: isRock ? `2px dashed color-mix(in srgb, ${FILL[i]} ${rockGone * 100}%, transparent)` : undefined,
                  outlineOffset: -2,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 14,
                  ...note(23, TEXT[i]),
                  fontWeight: 650,
                }}
              >
                {inside ? (
                  <span style={{ whiteSpace: "nowrap" }}>
                    {TOKENS[i]} {pct(HOT.probs[i])}
                  </span>
                ) : null}
              </div>
            </Ink>
            {isRock ? (
              <Note at={start + 10} x={X1 + 14} y={barA + bh / 2 - 15}>
                <span style={{ ...note(23, TEXT[i]), fontWeight: 650 }}>
                  <Struck at={dropAt + 2}>
                    {TOKENS[i]} {pct(HOT.probs[i])}
                  </Struck>
                </span>
              </Note>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* The running total, likeliest first, until it passes p. */}
      {KEPT.map((tok, k) => {
        const x = px(HOT.topP.running[k]);
        const at = runAt(k);
        return (
          <React.Fragment key={tok}>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, at, 10) }}>
              <line x1={x} x2={x} y1={barA + bh} y2={barA + bh + 16} stroke={INK} strokeWidth={1.6} />
            </svg>
            <Note at={at} x={x} y={barA + bh + 22} from="up" style={{ transform: "translateX(-50%)" }}>
              <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
                {k === 0 ? "" : "+ "}
                <span style={{ color: TEXT[tok] }}>{TOKENS[tok]}</span> = {pct(HOT.topP.running[k])}
              </span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* The threshold, p = 0.9. */}
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, opacity: ease(frame, ninetyAt - 2, 14) > 0 ? 1 : 0 }}
      >
        <line
          x1={px(TOP_P)}
          x2={px(TOP_P)}
          y1={barA - 22}
          y2={barA - 22 + (bh + 32) * ease(frame, ninetyAt - 2, 14)}
          stroke={ACCENT}
          strokeWidth={3}
          strokeDasharray="7 6"
        />
      </svg>
      <Note at={ninetyAt} x={px(TOP_P)} y={barA - 58} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>p = {TOP_P}</span>
      </Note>

      {/* Bar B: what is left, rescaled to sum to one, and drawn from. */}
      <Ink at={keepsAt - 4} dur={14} style={{ left: X0, top: barB - 50 }}>
        <span style={label(20)}>Kept, rescaled to 100%, then drawn from</span>
      </Ink>
      {KEPT.map((tok, k) => {
        const x = px(startsB[tok]);
        const w = px(startsB[tok] + HOT.topP.renormalized[tok]) - x;
        return (
          <Ink key={tok} at={keepsAt + k * 6} dur={14} style={{ left: x, top: barB, width: w - 2, height: bh }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                background: TINT[tok],
                borderBottom: `5px solid ${FILL[tok]}`,
                display: "flex",
                alignItems: "center",
                paddingLeft: 14,
                ...note(23, TEXT[tok]),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              {TOKENS[tok]} {pct(HOT.topP.renormalized[tok])}
            </div>
          </Ink>
        );
      })}
      <Note at={cutAt} x={X1 + 14} y={barB + bh / 2 - 15}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 650 }}>rock 0%</span>
      </Note>

      <Note at={cutAt + 10} x={120} y={y(830)}>
        <span style={note(20, INK_SOFT)}>
          The same rule keeps {row(0.7).topP.kept.length} tokens at T = 0.7 and {row(0.2).topP.kept.length} at T = 0.2:
          the cut moves with the shape.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
