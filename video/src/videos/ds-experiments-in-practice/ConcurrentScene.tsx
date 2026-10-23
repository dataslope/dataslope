import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONTROL, Drift, OK, OK_INK, pulse, TREAT, X0 } from "./parts";

const GRID = { x: 560, top: 420, cw: 300, ch: 170 };

/**
 * Question 9. Two experiments on the same users make a 2×2: pricing old or
 * new, recommendations old or new. The pricing test's lift is read down each
 * column, with and without the new recommendations; if the two lifts differ,
 * the experiments interact. No numbers: the page gives none, and the method is
 * the answer. The grid itself is the factorial design the fixes end on.
 */
export const ConcurrentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("concurrent").from;
  const qAt = n.word("concurrent", "Question nine");
  const textAt = n.word("concurrent", "How do you detect interference");
  const compareAt = n.word("concurrent", "Compare the users who are in both");
  const onlyAt = n.word("concurrent", "those in only one");
  const pricingAt = n.word("concurrent", "a pricing test's lift changes");
  const recsAt = n.word("concurrent", "also see new recommendations");
  const interactAt = n.word("concurrent", "the two interact");
  const separateAt = n.word("concurrent", "separate their users");
  const afterAt = n.word("concurrent", "run them one after the other");
  const factorialAt = n.word("concurrent", "a factorial design");
  const end = n.beat("concurrent").to;

  const gridIn = ease(frame, compareAt - 8, 14);
  const both = ease(frame, compareAt + 4, 12);
  const only = ease(frame, onlyAt, 12);
  const lifts = ease(frame, pricingAt + 4, 14);
  const differ = ease(frame, interactAt, 12);
  const fact = ease(frame, factorialAt, 14);
  const bump = pulse(frame, factorialAt + 4, 20);

  const cell = (r: number, c: number) => ({ left: GRID.x + c * GRID.cw, top: y(GRID.top) + r * h(GRID.ch) });
  // Rows: pricing old (0) or new (1); columns: recommendations old (0) or new (1).
  const cells = [
    { r: 0, c: 0, text: "neither", lit: 0, ink: INK_SOFT },
    { r: 0, c: 1, text: "recommendations only", lit: only, ink: BLUE_INK },
    { r: 1, c: 0, text: "pricing only", lit: only, ink: BLUE_INK },
    { r: 1, c: 1, text: "in both", lit: both, ink: INK },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={compareAt + 4} level={-36} />
      <Sfx name="el-pencil" at={pricingAt + 4} level={-36} />
      <Sfx name="el-scratch" at={interactAt} level={-35} />
      <Sfx name="el-tap" at={separateAt} level={-37} />
      <Sfx name="el-tap" at={afterAt} level={-37} />
      <Sfx name="el-pop" at={factorialAt + 2} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you detect interference between experiments running at once?
        </QuestionCard>

        {/* The grid: two experiments on one set of users. */}
        <div style={{ opacity: gridIn }}>
          {["old", "new"].map((t, c) => (
            <div key={`c${t}`} style={{ position: "absolute", left: GRID.x + c * GRID.cw, width: GRID.cw, top: y(GRID.top) - h(44), textAlign: "center", ...label(21, INK_SOFT), fontWeight: 700 }}>
              {t}
            </div>
          ))}
          <div style={{ position: "absolute", left: GRID.x, width: 2 * GRID.cw, top: y(GRID.top) - h(84), textAlign: "center", ...note(24, INK), fontWeight: 700 }}>
            recommendations
          </div>
          {["old", "new"].map((t, r) => (
            <div key={`r${t}`} style={{ position: "absolute", left: GRID.x - 110, width: 90, top: y(GRID.top) + r * h(GRID.ch) + h(GRID.ch) / 2 - 14, textAlign: "right", ...label(21, INK_SOFT), fontWeight: 700 }}>
              {t}
            </div>
          ))}
          <div style={{ position: "absolute", left: GRID.x - 270, top: y(GRID.top) + h(GRID.ch) - 16, ...note(24, INK), fontWeight: 700 }}>pricing</div>
          {cells.map((cl) => {
            const { left, top } = cell(cl.r, cl.c);
            const bg = cl.r === 1 && cl.c === 1 ? HIGHLIGHT : `color-mix(in srgb, ${CONTROL} 35%, ${PAPER})`;
            return (
              <div
                key={cl.text}
                style={{
                  position: "absolute",
                  left: left + 4,
                  top: top + 4,
                  width: GRID.cw - 8,
                  height: h(GRID.ch) - 8,
                  boxSizing: "border-box",
                  border: `2px solid ${fact > 0 ? `color-mix(in srgb, ${OK} ${fact * 100}%, ${INK})` : INK}`,
                  borderRadius: 8,
                  background: cl.lit > 0 ? `color-mix(in srgb, ${bg} ${cl.lit * 100}%, ${PAPER})` : PAPER,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...note(24, cl.ink),
                  fontWeight: cl.r === 1 && cl.c === 1 ? 750 : 600,
                  opacity: cl.lit > 0 || cl.text === "neither" ? 1 : 0.6,
                  transform: `scale(${1 + 0.03 * bump})`,
                }}
              >
                <span style={{ opacity: Math.max(cl.lit, cl.text === "neither" ? 1 : 0.35) }}>{cl.text}</span>
              </div>
            );
          })}
        </div>

        {/* The pricing lift, down each column. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: lifts }}>
          {[0, 1].map((c) => {
            const x = GRID.x + c * GRID.cw + GRID.cw / 2;
            const y0 = y(GRID.top) + h(GRID.ch) * 0.78;
            const y1 = y(GRID.top) + h(GRID.ch) * 1.22;
            const ink = c === 1 ? (differ > 0.5 ? ACCENT : TREAT) : TREAT;
            return (
              <g key={c}>
                <line x1={x} x2={x} y1={y0} y2={y0 + (y1 - y0) * lifts} stroke={ink} strokeWidth={4} />
                <path d={`M${x - 9},${y1 - 12} L${x},${y1} L${x + 9},${y1 - 12}`} fill="none" stroke={ink} strokeWidth={4} strokeLinejoin="round" opacity={lifts > 0.95 ? 1 : 0} />
              </g>
            );
          })}
        </svg>
        <Note at={pricingAt + 6} x={GRID.x + 2 * GRID.cw + 40} y={y(GRID.top) + h(GRID.ch) - h(64)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>pricing's lift, without and with</span>
        </Note>
        <Note at={recsAt} x={GRID.x + 2 * GRID.cw + 40} y={y(GRID.top) + h(GRID.ch) - h(28)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>the new recommendations</span>
        </Note>
        <Note at={interactAt} x={GRID.x + 2 * GRID.cw + 40} y={y(GRID.top) + h(GRID.ch) + h(24)}>
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>if they differ, the two interact</span>
        </Note>

        {/* The fixes. */}
        <div style={{ position: "absolute", left: X0, top: y(830), display: "flex", gap: 18 }}>
          {[
            { text: "separate their users", at: separateAt },
            { text: "run them one after the other", at: afterAt },
            { text: "analyze them together: a factorial design", at: factorialAt },
          ].map((f) => {
            const p = ease(frame, f.at - 2, 12);
            return (
              <span
                key={f.text}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: `2px solid ${OK}`,
                  ...note(24, OK_INK),
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px)`,
                }}
              >
                {f.text}
              </span>
            );
          })}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
