import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, headline, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { commas, fmtTime, MACHINE, RATIOS, ROWS } from "./data";
import { Fig, Mono, NAIVE, NAIVE_INK } from "./kit";

/** Right edges of the columns, and the bracket between rows. */
const N_R = 250;
const CALLS_R = 980;
const BRACKET_X = 1022;
const TIME_R = 1640;
const LEFT = 120;
const RIGHT = 1800;
const HEAD = 182;
const ROW0 = 236;
const ROW_H = 104;

/**
 * The naive call count for n = 10 to 50: each row about 123 times the one
 * above, so the numbers themselves grow like bars. Then what fib(50) cost.
 */
export const GrowthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("count").from;
  const rowAt = [
    n.word("count", "ten"),
    n.word("count", "Twenty"),
    n.word("count", "Thirty"),
    n.beat("factor").from,
    n.word("fifty", "fifty"),
  ];
  const multipliesAt = n.word("factor", "multiplies");
  const ranAt = n.word("fifty", "takes");
  const billionAt = n.word("fifty", "billion");

  const rowTop = (i: number) => y(ROW0 + i * ROW_H);
  const rowH = h(ROW_H);
  const cell = (i: number): React.CSSProperties => ({
    position: "absolute",
    top: rowTop(i),
    height: rowH,
    display: "flex",
    alignItems: "center",
  });
  const last = ROWS.length - 1;

  return (
    <AbsoluteFill>
      <Fig n="3" at={start - 14} x={LEFT} y={y(104)}>
        Calls made by the naive <Mono>fib(n)</Mono>, counted
      </Fig>

      {/* Column heads and the rule under them. */}
      <Ink at={start - 10} dur={14} style={{ left: LEFT, top: y(HEAD), width: N_R - LEFT, textAlign: "right" }}>
        <span style={label(22, INK_SOFT)}>n</span>
      </Ink>
      <Ink at={start - 8} dur={14} style={{ left: CALLS_R - 300, top: y(HEAD), width: 300, textAlign: "right" }}>
        <span style={label(22, INK_SOFT)}>Calls</span>
      </Ink>
      <Ink at={ranAt - 8} dur={14} style={{ left: TIME_R - 400, top: y(HEAD), width: 400, textAlign: "right" }}>
        <span style={label(22, INK_SOFT)}>Time for one call</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(HEAD) + 40,
          width: (RIGHT - LEFT) * ease(frame, start - 8, 16),
          height: 1,
          background: HAIRLINE,
        }}
      />

      {ROWS.map((r, i) => {
        const at = rowAt[i];
        const isLast = i === last;
        return (
          <React.Fragment key={r.n}>
            {i > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: LEFT,
                  top: rowTop(i),
                  width: (RIGHT - LEFT) * ease(frame, at - 6, 12),
                  height: 1,
                  background: HAIRLINE,
                  opacity: 0.5,
                }}
              />
            ) : null}
            <Ink at={at - 6} dur={12} style={{ ...cell(i), left: LEFT, width: N_R - LEFT, justifyContent: "flex-end" }}>
              <span style={{ ...headline(56), color: INK_SOFT, fontVariantNumeric: "tabular-nums lining-nums" }}>{r.n}</span>
            </Ink>
            <Ink at={at - 2} dur={16} style={{ ...cell(i), left: N_R, width: CALLS_R - N_R, justifyContent: "flex-end" }}>
              <span
                style={{
                  ...headline(isLast ? 64 : 56),
                  color: NAIVE_INK,
                  fontVariantNumeric: "tabular-nums lining-nums",
                }}
              >
                {commas(r.naiveCalls)}
              </span>
            </Ink>
            <Ink
              at={(isLast ? ranAt : ranAt + 4) - 4 + (isLast ? 0 : i * 3)}
              dur={14}
              style={{ ...cell(i), left: TIME_R - 400, width: 400, justifyContent: "flex-end" }}
            >
              <span
                style={{
                  ...(isLast ? headline(56) : note(30, INK_SOFT)),
                  color: isLast ? NAIVE_INK : INK_SOFT,
                  fontVariantNumeric: "tabular-nums lining-nums",
                }}
              >
                {fmtTime(r.naiveSeconds)}
              </span>
            </Ink>
          </React.Fragment>
        );
      })}

      {/* Each row over the one above it: a bracket from row to row. */}
      {RATIOS.map((ratio, i) => {
        const p = ease(frame, multipliesAt - 4 + i * 4, 12);
        if (p <= 0) return null;
        const y0 = rowTop(i) + rowH / 2;
        const y1 = rowTop(i + 1) + rowH / 2;
        return (
          <React.Fragment key={i}>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <path
                d={`M${BRACKET_X},${y0 + 10} L${BRACKET_X + 12},${y0 + 10} L${BRACKET_X + 12},${y1 - 10} L${BRACKET_X},${y1 - 10}`}
                fill="none"
                stroke={NAIVE}
                strokeWidth={1.8}
                pathLength={1}
                strokeDasharray={`${p} 1`}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                left: BRACKET_X + 26,
                top: (y0 + y1) / 2 - 16,
                opacity: p,
                ...note(26, NAIVE_INK),
                fontWeight: 700,
              }}
            >
              ×{Math.round(ratio)}
            </div>
          </React.Fragment>
        );
      })}

      <Note at={billionAt} x={LEFT} y={rowTop(ROWS.length) + h(26)} from="up">
        <span style={note(21, INK_SOFT)}>
          Calls counted by a copy of <Mono>fib</Mono> with a counter. Times: {MACHINE.compiler} with -O2, one core of a
          shared cloud machine ({MACHINE.cpu}), the best of {MACHINE.rounds} runs ({MACHINE.roundsSlow} for n = 50).
        </span>
      </Note>
    </AbsoluteFill>
  );
};
