import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, kTokens, MONEY } from "./data";
import { Drift, Headline, Kicker, Spot, tint, X0 } from "./kit";

/** Fig. 14: one block per turn, the whole width of the page. */
const BLOCK_Y = 320;
const BLOCK_W = 150;
const BLOCK_PITCH = 166;
const BLOCK_H = 110;
const BILL_Y = 520;

/**
 * Costs: what a full window costs in money. The lesson's 500,000-token
 * document in a ten-turn conversation is resent, and billed, on every turn:
 * five million input tokens unless caching intervenes.
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("costs").from;
  const payAt = n.word("costs", "pay");
  const everyTurnAt = n.word("costs", "every turn");
  const tenAt = n.word("costs", "ten turns");
  const fiveMAt = n.word("costs", "five million");
  const cacheAt = n.word("costs", "cache");

  // The blocks land one turn at a time, from "every turn" to "ten turns".
  const blockAt = (j: number) => everyTurnAt + ((tenAt - everyTurnAt) * j) / (MONEY.turns - 1);
  const landed = Array.from({ length: MONEY.turns }, (_, j) => (frame >= blockAt(j) ? 1 : 0)).reduce<number>((a, b) => a + b, 0);
  const bh = h(BLOCK_H);

  return (
    <AbsoluteFill>
      {Array.from({ length: MONEY.turns }, (_, j) => (
        <Sfx key={j} name="el-tap" at={blockAt(j)} level={-32} />
      ))}
      <Sfx name="el-pop" at={start - 2} level={-32} />

      <Drift from={start} to={n.beat("middle").from} amount={0.012} origin="45% 60%">
        <Kicker at={start - 6}>Context windows</Kicker>
        <Headline lead="Filling it isn't free." turn="You pay every turn." at={start - 4} turnAt={payAt - 2} />

        {/* Fig. 14: the same document, billed again on every turn. */}
        <FigLabel n="14" title="One 500,000-token document, resent on every turn" at={start} x={X0} y={y(240)} />
        {Array.from({ length: MONEY.turns }, (_, j) => {
          const s = pop(frame, blockAt(j), fps, 14);
          if (s <= 0.001) return null;
          return (
            <div
              key={j}
              style={{
                position: "absolute",
                left: X0 + j * BLOCK_PITCH,
                top: y(BLOCK_Y),
                width: BLOCK_W,
                height: bh,
                boxSizing: "border-box",
                background: tint(BAR, 24),
                borderBottom: `5px solid ${BAR}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: Math.min(1, s),
                transform: `translateY(${(1 - Math.min(1, s)) * -20}px)`,
                ...note(26, BLUE_INK),
                fontWeight: 650,
              }}
            >
              {kTokens(MONEY.document)}
            </div>
          );
        })}
        {Array.from({ length: MONEY.turns }, (_, j) => (
          <Note key={j} at={blockAt(j)} x={X0 + j * BLOCK_PITCH + BLOCK_W / 2} y={y(BLOCK_Y) + bh + 12} from="up" style={{ transform: "translateX(-50%)" }}>
            <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>turn {j + 1}</span>
          </Note>
        ))}

        {/* The running bill: true at every moment, the blocks on screen times 500,000. */}
        {landed > 0 ? (
          <div style={{ position: "absolute", left: X0, top: y(BILL_Y), whiteSpace: "nowrap" }}>
            <div style={{ ...label(22, INK_SOFT), marginBottom: 8 }}>Input tokens billed</div>
            <span style={{ ...headline(120), color: frame >= fiveMAt - 2 ? ACCENT_INK : INK, ...TABULAR }}>
              {count(landed * MONEY.document)}
            </span>
          </div>
        ) : null}
        <Note at={cacheAt - 2} x={X0} y={y(BILL_Y) + 190}>
          <span style={{ ...note(26, INK) }}>unless a cache steps in</span>
        </Note>
      </Drift>
      {/* Still the same full suitcase, packed again for every trip. */}
      <Spot id="llm-generation-suitcase" at={payAt - 4} left={1180} top={y(560)} width={560} height={h(300)} />
    </AbsoluteFill>
  );
};
