import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { SLOW, thousands } from "./data";
import { Drift, Headline, Kicker, pulse, RowGrid, Spot, X0 } from "./parts";

const GRID_TOP = 330;
const CHIPS_Y = 800;
const CHIP = 50;
const CHIP_GAP = 10;
/** Questions answered on the real database; the last one is drawn. */
const REAL = 9;
const TOTAL = 10;
/** Which question is drawn: isolation levels, the ninth. */
const DRAWN = 8;

/**
 * The opening: the table every later scene runs against, a million orders
 * drawn as a thousand squares of a thousand rows each, filling in as the
 * narration names it. Then the promise, counted from what the video does:
 * ten questions as numbered chips, nine filled for the ones answered on the
 * real database and the ninth question outlined, since isolation is drawn.
 * The first chip lights on the bridge into question 1.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const millionAt = n.word("hook", "a million rows");
  const tableAt = n.word("hook-table", "Here is that table");
  const ordersAt = n.word("hook-table", "a million orders");
  const customersAt = n.word("hook-table", "fifty thousand customers");
  const runAt = n.word("hook-table", "can be run again");
  const tenAt = n.word("plan", "Ten questions");
  const nineAt = n.word("plan", "Nine are answered");
  const oneAt = n.word("plan", "One, isolation levels");
  const startAt = n.word("slow-in", "Start where");
  const end = n.beat("slow-in").to;

  const chipX = (i: number) => X0 + i * (CHIP + CHIP_GAP);
  const gridW = 50 * 18;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={ordersAt} level={-33} />
      <Sfx name="el-pop" at={nineAt} level={-33} />
      <Sfx name="el-tap" at={oneAt + 4} level={-33} />
      <Sfx name="el-pop" at={startAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data engineer interview prep</Kicker>
        <Headline lead="A correct query," turn="on a million rows." at={from + 4} turnAt={millionAt - 4} size={70} />

        <Spot id="de-sql-performance-cheetah" at={from + 10} left={1190} top={y(300)} width={620} height={457} />

        {/* ── The table: a thousand squares of a thousand orders ── */}
        <div style={{ position: "absolute", left: X0, top: y(GRID_TOP) - 44, ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, tableAt, 12) }}>
          orders: <Num>{thousands(SLOW.orders)}</Num> rows
          <span style={{ ...note(21, INK_SOFT), marginLeft: 16 }}>each square, a thousand</span>
        </div>
        <RowGrid x={X0} top={y(GRID_TOP)} at={ordersAt - 6} />
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(GRID_TOP) + 380,
            width: gridW,
            ...note(24, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, customersAt, 12),
          }}
        >
          <Num>{thousands(SLOW.customers)}</Num> customers, <Num>{SLOW.orders / SLOW.customers}</Num> orders each, every day of 2024
        </div>
        <div style={{ position: "absolute", left: X0, top: y(GRID_TOP) + 420, ...note(22, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, runAt, 12) }}>
          generated, not random: every plan here reruns identically
        </div>

        {/* ── Ten questions: nine on the database, one drawn ── */}
        {Array.from({ length: TOTAL }, (_, i) => {
          const p = ease(frame, tenAt - 2 + i * 1.5, 10);
          if (p <= 0) return null;
          const real = i !== DRAWN;
          const tone = real ? ease(frame, nineAt + i * 2, 10) : 0;
          const first = i === 0 ? ease(frame, startAt, 10) : 0;
          const fade = i === 0 ? 0 : ease(frame, startAt + 4, 14) * 0.5;
          const fill = first > 0 ? ds("yellow", 400) : real ? `color-mix(in srgb, ${BAR} ${25 + 75 * tone}%, ${PAPER})` : PAPER;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: chipX(i),
                top: y(CHIPS_Y),
                width: CHIP,
                height: CHIP,
                borderRadius: CHIP / 2,
                background: fill,
                border: real || first > 0 ? "2px solid transparent" : `2px dashed ${INK_SOFT}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(21, real && tone > 0.5 && first === 0 ? PAPER : INK),
                fontWeight: 700,
                ...TABULAR,
                opacity: p * (1 - fade),
                transform: `scale(${p * (1 + 0.15 * pulse(frame, startAt, 16) * (i === 0 ? 1 : 0) + 0.12 * pulse(frame, oneAt, 16) * (i === DRAWN ? 1 : 0))})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: chipX(TOTAL) + 30,
            top: y(CHIPS_Y) - 2,
            ...note(24, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, nineAt - 2, 12) * (1 - ease(frame, startAt + 4, 14) * 0.5),
          }}
        >
          <b>{REAL}</b> run on the real database
        </div>
        <div
          style={{
            position: "absolute",
            left: chipX(TOTAL) + 30,
            top: y(CHIPS_Y) + 30,
            ...note(24, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, oneAt - 2, 12) * (1 - ease(frame, startAt + 4, 14) * 0.5),
          }}
        >
          <b>1</b> drawn: isolation needs two sessions
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
